import {
  SignInButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import {
  lazy,
  Suspense,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import type { ActiveDiscussionScopeId } from "../data/discussionScopes";
import type {
  DiscussionAnswerView,
  DiscussionAuthorView,
  DiscussionBlockList,
  DiscussionBlockView,
  DiscussionPostType,
  DiscussionProfileView,
  DiscussionQuestionView,
  DiscussionView,
} from "../features/discussion/discussion";
import { useClerkEnabled } from "./ClerkBoundary";
import { useLocale } from "../features/localization/localization";
import { usePublicationPreview } from "./PublicationPreview";

const LazyDiscussionMarkdown = lazy(() =>
  import("./DiscussionMarkdown").then((module) => ({
    default: module.DiscussionMarkdown,
  })),
);

let discussionFunctionsPromise:
  | Promise<typeof import("../features/discussion/discussion.functions")>
  | null = null;

function loadDiscussionFunctions() {
  discussionFunctionsPromise ??= import(
    "../features/discussion/discussion.functions"
  );
  return discussionFunctionsPromise;
}

type AvailableDiscussionView = Extract<DiscussionView, { available: true }>;

export type DiscussionPanelProps = {
  scopeId: ActiveDiscussionScopeId;
  subjectLabel: string;
  variant?: "section" | "code-cell";
};

type AuthState = {
  clerkEnabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
  identityKey: string;
};

type BlockTarget = {
  sourceType: DiscussionPostType;
  sourceId: string;
  displayName: string;
};

type ModerationTarget = {
  targetType: DiscussionPostType;
  targetId: string;
  action: "hide" | "restore";
};

type OwnerPostTarget = {
  targetType: DiscussionPostType;
  targetId: string;
  body: string;
  label: "질문" | "답변";
};

function formatDateTime(value: number, locale: "ko" | "en") {
  return new Intl.DateTimeFormat(locale === "ko" ? "ko-KR" : "en-US", {
    month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
  }).format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

function discussionCounts(view: DiscussionView | null) {
  if (!view?.available) return null;
  return {
    questions: view.questions.length,
    answers: view.questions.reduce(
      (count, question) => count + question.answers.length,
      0,
    ),
    likes: view.questions.reduce(
      (count, question) =>
        count + question.answers.reduce(
          (answerCount, answer) => answerCount + answer.likeCount,
          0,
        ),
      0,
    ),
  };
}

function loadedParticipants(view: AvailableDiscussionView) {
  const participants = new Map<string, DiscussionAuthorView>();
  for (const question of view.questions) {
    const questionKey = `${question.author.displayName}:${question.author.imageUrl ?? ""}`;
    participants.set(questionKey, question.author);
    for (const answer of question.answers) {
      const answerKey = `${answer.author.displayName}:${answer.author.imageUrl ?? ""}`;
      participants.set(answerKey, answer.author);
    }
  }
  return [...participants.values()];
}

function avatarInitials(displayName: string) {
  const words = displayName.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "?";
  return words.slice(0, 2).map((word) => word[0]).join("").toUpperCase();
}

function avatarTone(displayName: string) {
  let hash = 0;
  for (const character of displayName) {
    hash = (hash * 31 + character.codePointAt(0)!) >>> 0;
  }
  return hash % 6;
}

function UserAvatar({
  author,
  compact = false,
}: {
  author: DiscussionAuthorView;
  compact?: boolean;
}) {
  const { locale } = useLocale();
  const label = locale === "ko" ? `${author.displayName} 아바타` : `${author.displayName} avatar`;
  if (author.imageUrl) {
    return (
      <img
        className={`discussion-avatar${compact ? " discussion-avatar-compact" : ""}`}
        src={author.imageUrl}
        alt={label}
        width={compact ? 24 : 28}
        height={compact ? 24 : 28}
      />
    );
  }

  return (
    <span
      className={`discussion-avatar discussion-avatar-fallback discussion-avatar-tone-${avatarTone(author.displayName)}${compact ? " discussion-avatar-compact" : ""}`}
      role="img"
      aria-label={label}
      title={author.displayName}
    >
      {avatarInitials(author.displayName)}
    </span>
  );
}

export function Discussable({
  children,
  scopeId,
  subjectLabel,
  variant = "section",
}: DiscussionPanelProps & { children: ReactNode }) {
  const preview = usePublicationPreview();
  if (preview) {
    return (
      <div className={`discussable discussable-${variant} is-preview-readonly`}>
        {children}
      </div>
    );
  }
  return (
    <div className={`discussable discussable-${variant}`}>
      <DiscussionPanel
        scopeId={scopeId}
        subjectLabel={subjectLabel}
        variant={variant}
      />
      {children}
    </div>
  );
}

export function DiscussionPanel(props: DiscussionPanelProps) {
  const clerkEnabled = useClerkEnabled();

  return clerkEnabled ? (
    <ClerkDiscussionPanel {...props} />
  ) : (
    <DiscussionPanelCore
      {...props}
      authState={{
        clerkEnabled: false,
        isLoaded: true,
        isSignedIn: false,
        identityKey: "clerk-disabled",
      }}
    />
  );
}

function ClerkDiscussionPanel(props: DiscussionPanelProps) {
  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  const identityKey = userId ?? sessionId ?? "signed-out";

  return (
    <DiscussionPanelCore
      key={identityKey}
      {...props}
      authState={{
        clerkEnabled: true,
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
        identityKey,
      }}
    />
  );
}

function DiscussionPanelCore({
  scopeId,
  subjectLabel,
  variant = "section",
  authState,
}: DiscussionPanelProps & { authState: AuthState }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<DiscussionView | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [questionBody, setQuestionBody] = useState("");
  const [profileEditorOpen, setProfileEditorOpen] = useState(false);
  const [profileDisplayName, setProfileDisplayName] = useState("");
  const [profileImageVisible, setProfileImageVisible] = useState(false);
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyBody, setReplyBody] = useState("");
  const [blockTarget, setBlockTarget] = useState<BlockTarget | null>(null);
  const [lastBlock, setLastBlock] = useState<BlockTarget | null>(null);
  const [blockManagerOpen, setBlockManagerOpen] = useState(false);
  const [blockList, setBlockList] = useState<DiscussionBlockList | null>(null);
  const [blockListLoading, setBlockListLoading] = useState(false);
  const [moderationTarget, setModerationTarget] =
    useState<ModerationTarget | null>(null);
  const [moderationReason, setModerationReason] = useState("");
  const [editTarget, setEditTarget] = useState<OwnerPostTarget | null>(null);
  const [editBody, setEditBody] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<OwnerPostTarget | null>(null);
  const loadVersionRef = useRef(0);
  const questionFieldId = useId();
  const toggleId = useId();
  const bodyId = useId();
  const blockConfirmButtonRef = useRef<HTMLButtonElement>(null);
  const drawerCloseButtonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLElement>(null);

  const loadDiscussion = useCallback(
    async ({ append = false }: { append?: boolean } = {}) => {
      const loadVersion = loadVersionRef.current + 1;
      loadVersionRef.current = loadVersion;
      setLoading(true);
      setNotice("");

      try {
        const currentCursor =
          append && view?.available ? view.nextCursor ?? undefined : undefined;
        const { getDiscussion } = await loadDiscussionFunctions();
        const nextView = await getDiscussion({
          data: { scopeId, cursor: currentCursor },
        });
        if (loadVersionRef.current !== loadVersion) return;

        setView((current) => {
          if (
            append &&
            current?.available &&
            nextView.available
          ) {
            const knownIds = new Set(
              current.questions.map((question) => question.id),
            );
            return {
              ...nextView,
              questions: [
                ...current.questions,
                ...nextView.questions.filter(
                  (question) => !knownIds.has(question.id),
                ),
              ],
            };
          }
          return nextView;
        });
      } catch (error) {
        if (loadVersionRef.current === loadVersion) {
          setView({
            available: false,
            reason: "temporary",
            message: errorMessage(error),
          });
        }
      } finally {
        if (loadVersionRef.current === loadVersion) setLoading(false);
      }
    },
    [scopeId, view],
  );

  useEffect(() => {
    if (view !== null || loading) return;

    const panel = panelRef.current;
    if (!panel || typeof IntersectionObserver === "undefined") {
      void loadDiscussion();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        void loadDiscussion();
      },
      { rootMargin: "320px 0px" },
    );
    observer.observe(panel);
    return () => observer.disconnect();
  }, [loadDiscussion, loading, view]);

  useEffect(() => () => {
    loadVersionRef.current += 1;
  }, []);

  const viewerProfile = view?.available ? view.viewer.profile : null;
  useEffect(() => {
    if (!viewerProfile || profileEditorOpen) return;
    setProfileDisplayName(viewerProfile.displayName);
    setProfileImageVisible(viewerProfile.imageVisible);
  }, [profileEditorOpen, viewerProfile]);

  useEffect(() => {
    if (blockTarget) blockConfirmButtonRef.current?.focus();
  }, [blockTarget]);

  useEffect(() => {
    if (!expanded) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    requestAnimationFrame(() => drawerCloseButtonRef.current?.focus());

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setExpanded(false);
      requestAnimationFrame(() => document.getElementById(toggleId)?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", closeOnEscape);
    };
  }, [expanded, toggleId]);

  const counts = discussionCounts(view);
  const availableView = view?.available ? view : null;
  const canWrite = Boolean(
    authState.isLoaded &&
      authState.isSignedIn &&
      availableView?.viewer.signedIn,
  );
  const canPost = canWrite && Boolean(viewerProfile?.configured);

  const headerSummary = useMemo(() => {
    if (loading && view === null) return t("불러오는 중", "Loading");
    if (counts === null) return t("질문과 답변", "Questions and answers");
    if (counts.questions === 0) return t("첫 질문을 남겨보세요", "Ask the first question");
    return isKo ? `질문 ${counts.questions} · 답변 ${counts.answers}` : `${counts.questions} questions · ${counts.answers} answers`;
  }, [counts, isKo, loading, view]);
  function toggleDiscussion() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);
    if (nextExpanded && view === null && !loading) void loadDiscussion();
  }

  function closeDiscussion() {
    setExpanded(false);
    requestAnimationFrame(() => document.getElementById(toggleId)?.focus());
  }

  async function refreshAfterMutation(message: string) {
    await loadDiscussion();
    setNotice(message);
  }

  async function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!questionBody.trim() || pendingAction) return;

    setPendingAction("question");
    setNotice("");
    setLastBlock(null);
    try {
      const { createQuestion } = await loadDiscussionFunctions();
      const result = await createQuestion({
        data: { scopeId, body: questionBody },
      });
      if (!result.ok) {
        if (result.code === "profile_required") setProfileEditorOpen(true);
        setNotice(result.message);
        return;
      }
      setQuestionBody("");
      await refreshAfterMutation(t("질문을 등록했습니다.", "Question posted."));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function submitAnswer(
    event: FormEvent<HTMLFormElement>,
    questionId: string,
  ) {
    event.preventDefault();
    if (!replyBody.trim() || pendingAction) return;

    setPendingAction(`answer:${questionId}`);
    setNotice("");
    setLastBlock(null);
    try {
      const { createAnswer } = await loadDiscussionFunctions();
      const result = await createAnswer({
        data: { questionId, body: replyBody },
      });
      if (!result.ok) {
        if (result.code === "profile_required") setProfileEditorOpen(true);
        setNotice(result.message);
        return;
      }
      setReplyBody("");
      setReplyingTo(null);
      await refreshAfterMutation(
        result.kind === "official"
          ? t("관리자 답변을 등록했습니다.", "Official answer posted.")
          : t("답변을 등록했습니다.", "Answer posted."),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  function openProfileEditor() {
    if (!viewerProfile) return;
    setProfileDisplayName(viewerProfile.displayName);
    setProfileImageVisible(viewerProfile.imageVisible);
    setProfileEditorOpen(true);
  }

  async function submitProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!profileDisplayName.trim() || pendingAction) return;

    setPendingAction("profile");
    setNotice("");
    try {
      const { updateDiscussionProfile } = await loadDiscussionFunctions();
      const result = await updateDiscussionProfile({
        data: {
          displayName: profileDisplayName,
          imageVisible: profileImageVisible,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setProfileEditorOpen(false);
      await refreshAfterMutation(
        t("공개 프로필을 저장했습니다.", "Public profile saved."),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function submitPostEdit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!editTarget || !editBody.trim() || pendingAction) return;

    setPendingAction(`edit:${editTarget.targetId}`);
    setNotice("");
    try {
      const { updatePost } = await loadDiscussionFunctions();
      const result = await updatePost({
        data: {
          targetType: editTarget.targetType,
          targetId: editTarget.targetId,
          body: editBody,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      const label = editTarget.label;
      setEditTarget(null);
      setEditBody("");
      await refreshAfterMutation(isKo ? `${label}을 수정했습니다.` : `${editTarget.targetType === "question" ? "Question" : "Answer"} updated.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function confirmPostDelete() {
    if (!deleteTarget || pendingAction) return;

    setPendingAction(`delete:${deleteTarget.targetId}`);
    setNotice("");
    try {
      const { deletePost } = await loadDiscussionFunctions();
      const result = await deletePost({
        data: {
          targetType: deleteTarget.targetType,
          targetId: deleteTarget.targetId,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      const label = deleteTarget.label;
      setDeleteTarget(null);
      await refreshAfterMutation(isKo ? `${label}을 삭제했습니다.` : `${deleteTarget.targetType === "question" ? "Question" : "Answer"} deleted.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function toggleLike(answer: DiscussionAnswerView) {
    if (pendingAction) return;
    setPendingAction(`like:${answer.id}`);
    setNotice("");

    try {
      const { setAnswerLike } = await loadDiscussionFunctions();
      const result = await setAnswerLike({
        data: { answerId: answer.id, liked: !answer.likedByMe },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setView((current) => updateAnswerInView(current, answer.id, (item) => ({
        ...item,
        likedByMe: result.liked,
        likeCount: result.likeCount,
      })));
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function applyBlock(target: BlockTarget, blocked: boolean) {
    if (pendingAction) return;
    setPendingAction(`block:${target.sourceId}`);
    setNotice("");

    try {
      const { setAuthorBlock } = await loadDiscussionFunctions();
      const result = await setAuthorBlock({
        data: {
          sourceType: target.sourceType,
          sourceId: target.sourceId,
          blocked,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setBlockTarget(null);
      setLastBlock(blocked ? target : null);
      await refreshAfterMutation(
        blocked
          ? (isKo ? `${target.displayName} 님의 글을 숨겼습니다.` : `Posts by ${target.displayName} are now hidden.`)
          : (isKo ? `${target.displayName} 님의 차단을 해제했습니다.` : `${target.displayName} has been unblocked.`),
      );
      if (blockManagerOpen) await loadMyBlocks();
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function loadMyBlocks() {
    setBlockListLoading(true);
    try {
      const { getMyDiscussionBlocks } = await loadDiscussionFunctions();
      setBlockList(await getMyDiscussionBlocks());
    } catch (error) {
      setBlockList({
        available: false,
        reason: "temporary",
        message: errorMessage(error),
      });
    } finally {
      setBlockListLoading(false);
    }
  }

  async function unblockSavedAuthor(block: DiscussionBlockView) {
    if (pendingAction) return;
    setPendingAction(`unblock:${block.blockToken}`);
    setNotice("");
    setLastBlock(null);

    try {
      const { setAuthorBlock } = await loadDiscussionFunctions();
      const result = await setAuthorBlock({
        data: { blockToken: block.blockToken, blocked: false },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      await Promise.all([loadDiscussion(), loadMyBlocks()]);
      setNotice(isKo ? `${block.author.displayName} 님의 차단을 해제했습니다.` : `${block.author.displayName} has been unblocked.`);
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  async function applyModeration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!moderationTarget || !moderationReason.trim() || pendingAction) return;

    setPendingAction(`moderate:${moderationTarget.targetId}`);
    setNotice("");
    setLastBlock(null);
    try {
      const { moderatePost } = await loadDiscussionFunctions();
      const result = await moderatePost({
        data: {
          ...moderationTarget,
          reason: moderationReason,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setModerationTarget(null);
      setModerationReason("");
      await refreshAfterMutation(
        result.state === "hidden"
          ? t("글을 숨기고 관리 기록을 남겼습니다.", "Post hidden and moderation record saved.")
          : t("글을 복구하고 관리 기록을 남겼습니다.", "Post restored and moderation record saved."),
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section
      ref={panelRef}
      className={`discussion-panel discussion-panel-${variant}`}
      data-discussion-scope={scopeId}
      aria-label={`${subjectLabel} ${t("질문과 답변", "questions and answers")}`}
    >
      <button
        id={toggleId}
        type="button"
        className={`discussion-toggle ${
          counts === null
            ? "discussion-toggle-loading"
            : counts.questions > 0
              ? "discussion-toggle-has-questions"
              : "discussion-toggle-empty"
        }`}
        aria-expanded={expanded}
        aria-controls={bodyId}
        aria-label={`DISCUSSION ${subjectLabel} ${headerSummary} ${expanded ? t("접기", "collapse") : t("열기", "open")}`}
        onClick={toggleDiscussion}
      >
        <span className="discussion-toggle-icon" aria-hidden="true">Q</span>
        <span className="discussion-toggle-count" aria-hidden="true">
          {counts === null ? "…" : counts.questions > 0 ? counts.questions : "+"}
        </span>
      </button>

      {expanded ? (
        <>
          <button
            type="button"
            className="discussion-backdrop"
            aria-label={`${subjectLabel} ${t("질문과 답변 닫기", "close questions and answers")}`}
            onClick={closeDiscussion}
          />
          <div
            id={bodyId}
            role="dialog"
            aria-modal="true"
            aria-labelledby={toggleId}
            className={`discussion-body${
              view && !view.available ? " discussion-body-unavailable" : ""
            }`}
          >
            <header className="discussion-drawer-header">
              <div>
                <span>{t("이 요소의 질문과 답변", "QUESTIONS AND ANSWERS FOR THIS ITEM")}</span>
                <strong>{subjectLabel}</strong>
              </div>
              <button
                ref={drawerCloseButtonRef}
                type="button"
                onClick={closeDiscussion}
              >
                {t("닫기", "Close")}
              </button>
            </header>
          {loading && view === null ? (
            <p className="discussion-loading" role="status">{t("대화를 불러오고 있습니다…", "Loading discussion…")}</p>
          ) : null}

          {view && !view.available ? (
            <div className="discussion-unavailable" role="status">
              <strong>{t("질문 기능을 준비 중입니다", "Discussion is not available yet")}</strong>
              <p>{t("학습 콘텐츠와 코드 실행은 그대로 이용할 수 있습니다.", "Learning content and code execution remain available.")}</p>
              {import.meta.env.DEV ? <small>{view.message}</small> : null}
              {view.reason === "temporary" ? (
                <button type="button" onClick={() => void loadDiscussion()}>
                  {t("다시 확인", "Try again")}
                </button>
              ) : null}
            </div>
          ) : null}

          {availableView ? (
            <>
              <DiscussionCommunitySummary view={availableView} />
              {canWrite && viewerProfile ? (
                <DiscussionProfileSettings
                  profile={viewerProfile}
                  open={profileEditorOpen || !viewerProfile.configured}
                  displayName={profileDisplayName}
                  imageVisible={profileImageVisible}
                  pending={pendingAction === "profile"}
                  onDisplayNameChange={setProfileDisplayName}
                  onImageVisibleChange={setProfileImageVisible}
                  onSubmit={submitProfile}
                  onCancel={
                    viewerProfile.configured
                      ? () => setProfileEditorOpen(false)
                      : null
                  }
                />
              ) : null}
              <DiscussionComposer
                authState={authState}
                canWrite={canWrite}
                profile={viewerProfile}
                isAdmin={availableView.viewer.isAdmin}
                body={questionBody}
                fieldId={questionFieldId}
                pending={pendingAction === "question"}
                onBodyChange={setQuestionBody}
                onSubmit={submitQuestion}
                onEditProfile={openProfileEditor}
              />

              {canWrite ? (
                <DiscussionBlockManager
                  open={blockManagerOpen}
                  list={blockList}
                  loading={blockListLoading}
                  pendingAction={pendingAction}
                  onToggle={() => {
                    const nextOpen = !blockManagerOpen;
                    setBlockManagerOpen(nextOpen);
                    if (nextOpen && blockList === null) void loadMyBlocks();
                  }}
                  onRetry={() => void loadMyBlocks()}
                  onUnblock={(block) => void unblockSavedAuthor(block)}
                />
              ) : null}

              {notice ? (
                <div className="discussion-notice" role="status">
                  <span>{notice}</span>
                  {lastBlock ? (
                    <button
                      type="button"
                      onClick={() => void applyBlock(lastBlock, false)}
                      disabled={Boolean(pendingAction)}
                    >
                      {t("차단 해제", "Unblock")}
                    </button>
                  ) : null}
                </div>
              ) : null}

              {blockTarget ? (
                <div
                  className="discussion-confirm"
                  role="alertdialog"
                  aria-label={isKo ? `${blockTarget.displayName} 작성자 차단 확인` : `Confirm blocking author ${blockTarget.displayName}`}
                >
                  <p>
                    {isKo ? <><strong>{blockTarget.displayName}</strong> 님의 질문과 답변을 내 화면에서 숨길까요?</> : <>Hide questions and answers by <strong>{blockTarget.displayName}</strong> from your view?</>}
                  </p>
                  <div>
                    <button
                      ref={blockConfirmButtonRef}
                      type="button"
                      onClick={() => void applyBlock(blockTarget, true)}
                      disabled={Boolean(pendingAction)}
                    >
                      {t("차단하기", "Block")}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setBlockTarget(null);
                        requestAnimationFrame(() => {
                          document.getElementById(toggleId)?.focus();
                        });
                      }}
                      disabled={Boolean(pendingAction)}
                    >
                      {t("취소", "Cancel")}
                    </button>
                  </div>
                </div>
              ) : null}

              <div className="discussion-thread">
                {availableView.questions.length ? (
                  availableView.questions.map((question) => (
                    <QuestionThread
                      key={question.id}
                      question={question}
                      isAdmin={availableView.viewer.isAdmin}
                      canWrite={canPost}
                      viewerProfile={viewerProfile}
                      pendingAction={pendingAction}
                      replying={replyingTo === question.id}
                      replyBody={replyingTo === question.id ? replyBody : ""}
                      moderationTarget={moderationTarget}
                      moderationReason={moderationReason}
                      editTarget={editTarget}
                      editBody={editBody}
                      deleteTarget={deleteTarget}
                      onReplyStart={() => {
                        setReplyingTo(question.id);
                        setReplyBody("");
                      }}
                      onReplyCancel={() => {
                        setReplyingTo(null);
                        setReplyBody("");
                      }}
                      onReplyBodyChange={setReplyBody}
                      onReplySubmit={(event) =>
                        void submitAnswer(event, question.id)
                      }
                      onLike={(answer) => void toggleLike(answer)}
                      onBlock={setBlockTarget}
                      onModerationStart={(target) => {
                        setModerationTarget(target);
                        setModerationReason("");
                      }}
                      onModerationCancel={() => {
                        setModerationTarget(null);
                        setModerationReason("");
                      }}
                      onModerationReasonChange={setModerationReason}
                      onModerationSubmit={(event) => void applyModeration(event)}
                      onEditStart={(target) => {
                        setDeleteTarget(null);
                        setEditTarget(target);
                        setEditBody(target.body);
                      }}
                      onEditBodyChange={setEditBody}
                      onEditSubmit={(event) => void submitPostEdit(event)}
                      onEditCancel={() => {
                        setEditTarget(null);
                        setEditBody("");
                      }}
                      onDeleteStart={(target) => {
                        setEditTarget(null);
                        setEditBody("");
                        setDeleteTarget(target);
                      }}
                      onDeleteConfirm={() => void confirmPostDelete()}
                      onDeleteCancel={() => setDeleteTarget(null)}
                    />
                  ))
                ) : (
                  <div className="discussion-empty">
                    <strong>{t("아직 질문이 없습니다.", "No questions yet.")}</strong>
                    <p>{t("막힌 지점이나 실행 결과를 적으면 다음 학습자에게도 도움이 됩니다.", "Share where you got stuck or what your code produced to help the next learner too.")}</p>
                  </div>
                )}
              </div>

              {availableView.answersTruncated ? (
                <p className="discussion-truncated-notice" role="status">
                  {t("답변이 많은 대화입니다. 최신 페이지의 일부 답변만 표시하고 있습니다.", "This discussion has many answers. Only the newest page is currently shown.")}
                </p>
              ) : null}

              {availableView.nextCursor ? (
                <button
                  type="button"
                  className="discussion-load-more"
                  onClick={() => void loadDiscussion({ append: true })}
                  disabled={loading}
                >
                  {loading ? t("불러오는 중", "Loading") : t("이전 대화 더 보기", "Load earlier discussion")}
                </button>
              ) : null}
            </>
          ) : null}

          {notice && !availableView ? (
            <p className="discussion-notice" role="status">{notice}</p>
          ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}

function DiscussionComposer({
  authState,
  canWrite,
  profile,
  isAdmin,
  body,
  fieldId,
  pending,
  onBodyChange,
  onSubmit,
  onEditProfile,
}: {
  authState: AuthState;
  canWrite: boolean;
  profile: DiscussionProfileView | null;
  isAdmin: boolean;
  body: string;
  fieldId: string;
  pending: boolean;
  onBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditProfile: () => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  if (!authState.isLoaded) {
    return <p className="discussion-auth-message">{isKo ? "로그인 상태를 확인하고 있습니다…" : "Checking sign-in status…"}</p>;
  }

  if (!canWrite) {
    return (
      <div className="discussion-auth-message">
        <p>
          {authState.clerkEnabled
            ? (isKo ? "질문과 답변을 남기려면 로그인해 주세요. 읽기는 누구나 가능합니다." : "Sign in to ask questions or leave answers. Anyone can read the discussion.")
            : (isKo ? "Clerk 개발 키를 연결하면 로그인 후 질문과 답변을 남길 수 있습니다." : "Connect a Clerk development key to enable signed-in questions and answers.")}
        </p>
        {authState.clerkEnabled ? (
          <SignInButton mode="modal">
            <button type="button">{isKo ? "로그인하고 질문하기" : "Sign in to ask"}</button>
          </SignInButton>
        ) : null}
      </div>
    );
  }

  if (!profile?.configured) return null;

  return (
    <form className="discussion-composer" onSubmit={onSubmit}>
      <label htmlFor={fieldId}>{isKo ? "이 학습 항목에 질문하기" : "Ask about this learning item"}</label>
      <PublicIdentityPreview profile={profile} onEdit={onEditProfile} />
      <MarkdownEditor
        id={fieldId}
        value={body}
        onChange={onBodyChange}
        maxLength={2_000}
        rows={3}
        placeholder={isKo ? "어디에서 막혔는지, 어떤 실행 결과가 예상과 달랐는지 적어주세요." : "Describe where you got stuck or which result differed from what you expected."}
      />
      <div className="discussion-form-actions">
        <span>{body.length.toLocaleString(isKo ? "ko-KR" : "en-US")} / 2,000</span>
        <button type="submit" disabled={pending || !body.trim()}>
          {pending ? (isKo ? "등록 중" : "Posting") : (isKo ? "질문 등록" : "Post question")}
        </button>
      </div>
      {isAdmin ? <small>{isKo ? "답변을 남기면 관리자 답변으로 표시됩니다." : "Your answers will be marked as official."}</small> : null}
    </form>
  );
}

function DiscussionProfileSettings({
  profile,
  open,
  displayName,
  imageVisible,
  pending,
  onDisplayNameChange,
  onImageVisibleChange,
  onSubmit,
  onCancel,
}: {
  profile: DiscussionProfileView;
  open: boolean;
  displayName: string;
  imageVisible: boolean;
  pending: boolean;
  onDisplayNameChange: (value: string) => void;
  onImageVisibleChange: (value: boolean) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: (() => void) | null;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const displayNameId = useId();
  if (!open) return null;

  const previewName = displayName.trim() || (isKo ? "닉네임" : "Nickname");
  const previewProfile = {
    displayName: previewName,
    imageUrl: imageVisible ? profile.imageUrl : null,
  };

  return (
    <form className="discussion-profile-settings" onSubmit={onSubmit}>
      <div className="discussion-profile-heading">
        <div>
          <span>{isKo ? "공개 프로필" : "PUBLIC PROFILE"}</span>
          <strong>
            {profile.configured
              ? (isKo ? "프로필 변경" : "Edit your profile")
              : (isKo ? "질문하기 전에 프로필을 설정해 주세요" : "Set up your profile before posting")}
          </strong>
        </div>
        <UserAvatar author={previewProfile} />
      </div>
      <label htmlFor={displayNameId}>
        {isKo ? "공개 닉네임" : "Public nickname"}
      </label>
      <input
        id={displayNameId}
        value={displayName}
        onChange={(event) => onDisplayNameChange(event.target.value)}
        minLength={2}
        maxLength={24}
        autoComplete="nickname"
        required
      />
      <small>
        {isKo
          ? `${displayName.trim().length} / 24 · 실명 대신 질문과 답변에 표시됩니다.`
          : `${displayName.trim().length} / 24 · Shown on questions and answers instead of your real name.`}
      </small>
      <label className="discussion-profile-image-option">
        <input
          type="checkbox"
          checked={imageVisible}
          disabled={!profile.imageUrl}
          onChange={(event) => onImageVisibleChange(event.target.checked)}
        />
        <span>
          {profile.imageUrl
            ? (isKo ? "Clerk 프로필 이미지도 공개" : "Also show my Clerk profile image")
            : (isKo ? "공개할 프로필 이미지가 없습니다" : "No profile image is available")}
        </span>
      </label>
      <p>
        {isKo
          ? "현재 미리보기와 같은 모습으로 공개됩니다. 이 설정은 모든 질문과 답변에 적용됩니다."
          : "This preview is public and applies to all your questions and answers."}
      </p>
      <div className="discussion-form-actions">
        <button type="submit" disabled={pending || displayName.trim().length < 2}>
          {pending
            ? (isKo ? "저장 중" : "Saving")
            : (isKo ? "이 프로필로 계속" : "Continue with this profile")}
        </button>
        {onCancel ? (
          <button type="button" className="discussion-secondary-button" onClick={onCancel} disabled={pending}>
            {isKo ? "취소" : "Cancel"}
          </button>
        ) : null}
      </div>
    </form>
  );
}

function PublicIdentityPreview({
  profile,
  onEdit,
}: {
  profile: DiscussionProfileView;
  onEdit?: () => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  return (
    <div className="discussion-public-identity">
      <UserAvatar
        author={{
          displayName: profile.displayName,
          imageUrl: profile.imageVisible ? profile.imageUrl : null,
        }}
        compact
      />
      <span>
        {isKo
          ? <><strong>{profile.displayName}</strong> 이름으로 공개됩니다.</>
          : <>This will be public as <strong>{profile.displayName}</strong>.</>}
      </span>
      {onEdit ? (
        <button type="button" onClick={onEdit}>
          {isKo ? "프로필 변경" : "Edit profile"}
        </button>
      ) : null}
    </div>
  );
}

function MarkdownContent({ source }: { source: string }) {
  const { locale } = useLocale();
  return (
    <div className="discussion-markdown">
      <Suspense fallback={<p className="discussion-markdown-loading">{locale === "ko" ? "Markdown을 불러오는 중…" : "Loading Markdown…"}</p>}>
        <LazyDiscussionMarkdown source={source} />
      </Suspense>
    </div>
  );
}

function MarkdownEditor({
  id,
  value,
  onChange,
  maxLength,
  rows,
  placeholder,
  autoFocus = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  maxLength: number;
  rows: number;
  placeholder?: string;
  autoFocus?: boolean;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [mode, setMode] = useState<"write" | "preview">("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  function insertMarkdown(prefix: string, suffix: string, fallback: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || fallback;
    const insertion = `${prefix}${selected}${suffix}`;
    onChange(`${value.slice(0, start)}${insertion}${value.slice(end)}`);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selected.length,
      );
    });
  }

  return (
    <div className="discussion-markdown-editor">
      <div className="discussion-markdown-tabs" role="tablist" aria-label={isKo ? "Markdown 입력 모드" : "Markdown input mode"}>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "write"}
          onClick={() => setMode("write")}
        >
          {isKo ? "작성" : "Write"}
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={mode === "preview"}
          onClick={() => setMode("preview")}
        >
          {isKo ? "미리보기" : "Preview"}
        </button>
        <span>Markdown</span>
      </div>

      {mode === "write" ? (
        <>
          <div className="discussion-markdown-toolbar" aria-label={isKo ? "Markdown 서식" : "Markdown formatting"}>
            <button type="button" aria-label={isKo ? "굵게" : "Bold"} onClick={() => insertMarkdown("**", "**", isKo ? "강조할 내용" : "emphasized text")}>
              B
            </button>
            <button type="button" aria-label={isKo ? "인라인 코드" : "Inline code"} onClick={() => insertMarkdown("`", "`", "code")}>
              {"</>"}
            </button>
            <button
              type="button"
              aria-label={isKo ? "코드 블록" : "Code block"}
              onClick={() => insertMarkdown("```python\n", "\n```", 'print("hello")')}
            >
              ```
            </button>
            <button type="button" aria-label={isKo ? "링크" : "Link"} onClick={() => insertMarkdown("[", "](https://)", isKo ? "링크 제목" : "link title")}>
              ↗
            </button>
          </div>
          <textarea
            ref={textareaRef}
            id={id}
            value={value}
            onChange={(event) => onChange(event.target.value)}
            maxLength={maxLength}
            rows={rows}
            autoFocus={autoFocus}
            placeholder={placeholder}
          />
        </>
      ) : (
        <div className="discussion-markdown-preview" role="tabpanel">
          {value.trim() ? (
            <MarkdownContent source={value} />
          ) : (
            <p>{isKo ? "미리볼 내용이 없습니다." : "Nothing to preview."}</p>
          )}
        </div>
      )}

      <small className="discussion-markdown-help">
        {isKo ? "**굵게**, `인라인 코드`, ```python 코드 블록```을 지원합니다." : "Supports **bold**, `inline code`, and ```python code blocks```."}
      </small>
    </div>
  );
}

function DiscussionCommunitySummary({
  view,
}: {
  view: AvailableDiscussionView;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const counts = discussionCounts(view)!;
  const participants = loadedParticipants(view);

  return (
    <section className="discussion-community-summary" aria-label={isKo ? "커뮤니티 현황" : "Community activity"}>
      <div className="discussion-community-stats">
        <span aria-label={isKo ? `질문 ${counts.questions}개` : `${counts.questions} questions`}>
          <small>{view.nextCursor ? (isKo ? "불러온 질문" : "Loaded questions") : (isKo ? "질문" : "Questions")}</small>
          <strong>{counts.questions}</strong>
        </span>
        <span aria-label={isKo ? `답변 ${counts.answers}개` : `${counts.answers} answers`}>
          <small>{view.nextCursor ? (isKo ? "불러온 답변" : "Loaded answers") : (isKo ? "답변" : "Answers")}</small>
          <strong>{counts.answers}</strong>
        </span>
        <span aria-label={isKo ? `좋아요 ${counts.likes}개` : `${counts.likes} likes`}>
          <small>{isKo ? "좋아요" : "Likes"}</small>
          <strong>{counts.likes}</strong>
        </span>
      </div>
      <div className="discussion-participants">
        <span className="discussion-participant-label">{isKo ? "참여자" : "Participants"}</span>
        {participants.length ? (
          <div className="discussion-avatar-stack" aria-label={isKo ? `참여자 ${participants.length}명` : `${participants.length} participants`}>
            {participants.slice(0, 6).map((author) => (
              <UserAvatar
                key={`${author.displayName}:${author.imageUrl ?? ""}`}
                author={author}
                compact
              />
            ))}
            {participants.length > 6 ? (
              <span className="discussion-avatar-more">+{participants.length - 6}</span>
            ) : null}
          </div>
        ) : (
          <span className="discussion-participant-empty">{isKo ? "아직 없음" : "None yet"}</span>
        )}
      </div>
      {view.viewer.signedIn ? (
        <p>{isKo ? "답변에 좋아요를 누르거나 다른 사용자의 글을 차단할 수 있습니다." : "You can like answers or block posts by another user."}</p>
      ) : (
        <p>{isKo ? "로그인하면 답변·좋아요·사용자 차단 기능을 이용할 수 있습니다." : "Sign in to answer, like, and block users."}</p>
      )}
    </section>
  );
}

function DiscussionBlockManager({
  open,
  list,
  loading,
  pendingAction,
  onToggle,
  onRetry,
  onUnblock,
}: {
  open: boolean;
  list: DiscussionBlockList | null;
  loading: boolean;
  pendingAction: string | null;
  onToggle: () => void;
  onRetry: () => void;
  onUnblock: (block: DiscussionBlockView) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const bodyId = useId();

  return (
    <section className="discussion-block-manager" aria-label={isKo ? "차단한 사용자 관리" : "Manage blocked users"}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        {isKo ? "차단한 사용자 관리" : "Manage blocked users"}
      </button>
      {open ? (
        <div className="discussion-block-manager-body" id={bodyId}>
          {loading ? <p role="status">{isKo ? "차단 목록을 불러오는 중입니다…" : "Loading blocked users…"}</p> : null}
          {!loading && list?.available && list.blocks.length === 0 ? (
            <p>{isKo ? "차단한 사용자가 없습니다." : "You have not blocked anyone."}</p>
          ) : null}
          {!loading && list?.available && list.blocks.length ? (
            <ul>
              {list.blocks.map((block) => (
                <li key={block.blockToken}>
                  <UserAvatar author={block.author} compact />
                  <span>
                    <strong>{block.author.displayName}</strong>
                    <small>{isKo ? `${formatDateTime(block.createdAt, locale)}부터 숨김` : `Hidden since ${formatDateTime(block.createdAt, locale)}`}</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => onUnblock(block)}
                    disabled={Boolean(pendingAction)}
                  >
                    {isKo ? "차단 해제" : "Unblock"}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && list && !list.available ? (
            <div className="discussion-block-manager-error" role="status">
              <span>{list.message}</span>
              {list.reason === "temporary" ? (
                <button type="button" onClick={onRetry}>{isKo ? "다시 시도" : "Try again"}</button>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function QuestionThread({
  question,
  isAdmin,
  canWrite,
  viewerProfile,
  pendingAction,
  replying,
  replyBody,
  moderationTarget,
  moderationReason,
  editTarget,
  editBody,
  deleteTarget,
  onReplyStart,
  onReplyCancel,
  onReplyBodyChange,
  onReplySubmit,
  onLike,
  onBlock,
  onModerationStart,
  onModerationCancel,
  onModerationReasonChange,
  onModerationSubmit,
  onEditStart,
  onEditBodyChange,
  onEditSubmit,
  onEditCancel,
  onDeleteStart,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  question: DiscussionQuestionView;
  isAdmin: boolean;
  canWrite: boolean;
  viewerProfile: DiscussionProfileView | null;
  pendingAction: string | null;
  replying: boolean;
  replyBody: string;
  moderationTarget: ModerationTarget | null;
  moderationReason: string;
  editTarget: OwnerPostTarget | null;
  editBody: string;
  deleteTarget: OwnerPostTarget | null;
  onReplyStart: () => void;
  onReplyCancel: () => void;
  onReplyBodyChange: (value: string) => void;
  onReplySubmit: (event: FormEvent<HTMLFormElement>) => void;
  onLike: (answer: DiscussionAnswerView) => void;
  onBlock: (target: BlockTarget) => void;
  onModerationStart: (target: ModerationTarget) => void;
  onModerationCancel: () => void;
  onModerationReasonChange: (value: string) => void;
  onModerationSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditStart: (target: OwnerPostTarget) => void;
  onEditBodyChange: (value: string) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditCancel: () => void;
  onDeleteStart: (target: OwnerPostTarget) => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const questionModerationOpen =
    moderationTarget?.targetType === "question" &&
    moderationTarget.targetId === question.id;
  const questionOwnerTarget: OwnerPostTarget = {
    targetType: "question",
    targetId: question.id,
    body: question.body,
    label: "질문",
  };

  return (
    <article className={`discussion-question discussion-post-${question.state}`}>
      <PostHeader
        author={question.author}
        createdAt={question.createdAt}
        updatedAt={question.updatedAt}
        state={question.state}
      />
      <PostBody
        body={question.body}
        state={question.state}
        moderationReason={question.moderationReason}
        deletedLabel={isKo ? "작성자가 삭제한 질문입니다." : "The author deleted this question."}
      />
      <div className="discussion-post-actions">
        {question.capabilities.canEdit ? (
          <button type="button" onClick={() => onEditStart(questionOwnerTarget)}>
            {isKo ? "질문 수정" : "Edit question"}
          </button>
        ) : null}
        {question.capabilities.canDelete ? (
          <button type="button" onClick={() => onDeleteStart(questionOwnerTarget)}>
            {isKo ? "질문 삭제" : "Delete question"}
          </button>
        ) : null}
        {canWrite && question.state === "visible" ? (
          <button type="button" onClick={onReplyStart}>{isKo ? "답변 남기기" : "Leave an answer"}</button>
        ) : null}
        <span className="discussion-reply-count">
          {isKo ? "답변" : "Answers"} {question.answers.length}
        </span>
        {question.canBlockAuthor ? (
          <button
            type="button"
            onClick={() => onBlock({
              sourceType: "question",
              sourceId: question.id,
              displayName: question.author.displayName,
            })}
          >
            {isKo ? "작성자 차단" : "Block author"}
          </button>
        ) : null}
        {question.capabilities.canModerate ? (
          <button
            type="button"
            onClick={() => onModerationStart({
              targetType: "question",
              targetId: question.id,
              action: question.state === "hidden" ? "restore" : "hide",
            })}
          >
            {question.state === "hidden" ? (isKo ? "질문 복구" : "Restore question") : (isKo ? "질문 숨기기" : "Hide question")}
          </button>
        ) : null}
      </div>

      <OwnerPostMutationForms
        target={questionOwnerTarget}
        editTarget={editTarget}
        editBody={editBody}
        deleteTarget={deleteTarget}
        pendingAction={pendingAction}
        onEditBodyChange={onEditBodyChange}
        onEditSubmit={onEditSubmit}
        onEditCancel={onEditCancel}
        onDeleteConfirm={onDeleteConfirm}
        onDeleteCancel={onDeleteCancel}
      />

      {questionModerationOpen ? (
        <ModerationForm
          target={moderationTarget}
          reason={moderationReason}
          pending={pendingAction === `moderate:${question.id}`}
          onReasonChange={onModerationReasonChange}
          onSubmit={onModerationSubmit}
          onCancel={onModerationCancel}
        />
      ) : null}

      {question.answers.length ? (
        <div className="discussion-answers">
          {question.answers.map((answer) => {
            const answerModerationOpen =
              moderationTarget?.targetType === "answer" &&
              moderationTarget.targetId === answer.id;
            const answerOwnerTarget: OwnerPostTarget = {
              targetType: "answer",
              targetId: answer.id,
              body: answer.body,
              label: "답변",
            };
            return (
              <article
                className={`discussion-answer discussion-answer-${answer.kind} discussion-post-${answer.state}`}
                key={answer.id}
              >
                <PostHeader
                  author={answer.author}
                  createdAt={answer.createdAt}
                  updatedAt={answer.updatedAt}
                  state={answer.state}
                  official={answer.kind === "official"}
                />
                <PostBody
                  body={answer.body}
                  state={answer.state}
                  moderationReason={answer.moderationReason}
                  deletedLabel={isKo ? "작성자가 삭제한 답변입니다." : "The author deleted this answer."}
                />
                <div className="discussion-post-actions">
                  {answer.capabilities.canEdit ? (
                    <button type="button" onClick={() => onEditStart(answerOwnerTarget)}>
                      {isKo ? "답변 수정" : "Edit answer"}
                    </button>
                  ) : null}
                  {answer.capabilities.canDelete ? (
                    <button type="button" onClick={() => onDeleteStart(answerOwnerTarget)}>
                      {isKo ? "답변 삭제" : "Delete answer"}
                    </button>
                  ) : null}
                  {answer.canLike ? (
                    <button
                      type="button"
                      className={answer.likedByMe ? "is-active" : undefined}
                      aria-pressed={answer.likedByMe}
                      onClick={() => onLike(answer)}
                      disabled={Boolean(pendingAction)}
                    >
                      {isKo ? "좋아요" : "Like"} {answer.likeCount}
                    </button>
                  ) : (
                    <span>{isKo ? "좋아요" : "Likes"} {answer.likeCount}</span>
                  )}
                  {answer.canBlockAuthor ? (
                    <button
                      type="button"
                      onClick={() => onBlock({
                        sourceType: "answer",
                        sourceId: answer.id,
                        displayName: answer.author.displayName,
                      })}
                    >
                      {isKo ? "작성자 차단" : "Block author"}
                    </button>
                  ) : null}
                  {answer.capabilities.canModerate ? (
                    <button
                      type="button"
                      onClick={() => onModerationStart({
                        targetType: "answer",
                        targetId: answer.id,
                        action: answer.state === "hidden" ? "restore" : "hide",
                      })}
                    >
                      {answer.state === "hidden" ? (isKo ? "답변 복구" : "Restore answer") : (isKo ? "답변 숨기기" : "Hide answer")}
                    </button>
                  ) : null}
                </div>
                <OwnerPostMutationForms
                  target={answerOwnerTarget}
                  editTarget={editTarget}
                  editBody={editBody}
                  deleteTarget={deleteTarget}
                  pendingAction={pendingAction}
                  onEditBodyChange={onEditBodyChange}
                  onEditSubmit={onEditSubmit}
                  onEditCancel={onEditCancel}
                  onDeleteConfirm={onDeleteConfirm}
                  onDeleteCancel={onDeleteCancel}
                />
                {answerModerationOpen ? (
                  <ModerationForm
                    target={moderationTarget}
                    reason={moderationReason}
                    pending={pendingAction === `moderate:${answer.id}`}
                    onReasonChange={onModerationReasonChange}
                    onSubmit={onModerationSubmit}
                    onCancel={onModerationCancel}
                  />
                ) : null}
              </article>
            );
          })}
        </div>
      ) : null}

      {replying ? (
        <form className="discussion-reply-form" onSubmit={onReplySubmit}>
          <label htmlFor={`reply-${question.id}`}>
            {isAdmin ? (isKo ? "관리자 답변" : "Official answer") : (isKo ? "답변" : "Answer")}
          </label>
          {viewerProfile?.configured ? (
            <PublicIdentityPreview profile={viewerProfile} />
          ) : null}
          <MarkdownEditor
            id={`reply-${question.id}`}
            value={replyBody}
            onChange={onReplyBodyChange}
            maxLength={4_000}
            rows={3}
            autoFocus
            placeholder={isKo ? "계산 과정이나 실행 가능한 예시를 함께 남겨주세요." : "Include your calculation steps or a runnable example."}
          />
          <div className="discussion-form-actions">
            <button type="submit" disabled={!replyBody.trim() || Boolean(pendingAction)}>
              {pendingAction === `answer:${question.id}` ? (isKo ? "등록 중" : "Posting") : (isKo ? "답변 등록" : "Post answer")}
            </button>
            <button type="button" onClick={onReplyCancel} disabled={Boolean(pendingAction)}>
              {isKo ? "취소" : "Cancel"}
            </button>
          </div>
        </form>
      ) : null}
    </article>
  );
}

function PostHeader({
  author,
  createdAt,
  updatedAt,
  state,
  official = false,
}: {
  author: { displayName: string; imageUrl: string | null };
  createdAt: number;
  updatedAt: number;
  state: "visible" | "hidden" | "deleted";
  official?: boolean;
}) {
  const { locale } = useLocale();
  return (
    <header className="discussion-post-header">
      <UserAvatar author={author} />
      <strong>{author.displayName}</strong>
      {official ? <span className="discussion-official-badge">{locale === "ko" ? "관리자 답변" : "Official answer"}</span> : null}
      {state === "hidden" ? <span className="discussion-hidden-badge">{locale === "ko" ? "숨김" : "Hidden"}</span> : null}
      {state === "visible" && updatedAt > createdAt ? (
        <span className="discussion-edited-badge">{locale === "ko" ? "수정됨" : "Edited"}</span>
      ) : null}
      <time dateTime={new Date(createdAt).toISOString()}>{formatDateTime(createdAt, locale)}</time>
    </header>
  );
}

function PostBody({
  body,
  state,
  moderationReason,
  deletedLabel,
}: {
  body: string;
  state: "visible" | "hidden" | "deleted";
  moderationReason: string | null;
  deletedLabel: string;
}) {
  const { locale } = useLocale();
  if (state === "deleted") {
    return <p className="discussion-post-tombstone">{deletedLabel}</p>;
  }

  return (
    <>
      <div className="discussion-post-body">
        <MarkdownContent source={body} />
      </div>
      {state === "hidden" && moderationReason ? (
        <p className="discussion-moderation-reason">{locale === "ko" ? "관리 사유:" : "Moderation reason:"} {moderationReason}</p>
      ) : null}
    </>
  );
}

function OwnerPostMutationForms({
  target,
  editTarget,
  editBody,
  deleteTarget,
  pendingAction,
  onEditBodyChange,
  onEditSubmit,
  onEditCancel,
  onDeleteConfirm,
  onDeleteCancel,
}: {
  target: OwnerPostTarget;
  editTarget: OwnerPostTarget | null;
  editBody: string;
  deleteTarget: OwnerPostTarget | null;
  pendingAction: string | null;
  onEditBodyChange: (value: string) => void;
  onEditSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onEditCancel: () => void;
  onDeleteConfirm: () => void;
  onDeleteCancel: () => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const label = target.targetType === "question" ? (isKo ? "질문" : "Question") : (isKo ? "답변" : "Answer");
  const editing = editTarget?.targetId === target.targetId;
  const deleting = deleteTarget?.targetId === target.targetId;
  const pendingEdit = pendingAction === `edit:${target.targetId}`;
  const pendingDelete = pendingAction === `delete:${target.targetId}`;

  return (
    <>
      {editing ? (
        <form className="discussion-owner-form" onSubmit={onEditSubmit}>
          <label htmlFor={`edit-${target.targetId}`}>{isKo ? `${label} 수정` : `Edit ${label.toLowerCase()}`}</label>
          <MarkdownEditor
            id={`edit-${target.targetId}`}
            value={editBody}
            onChange={onEditBodyChange}
            maxLength={target.targetType === "question" ? 2_000 : 4_000}
            rows={3}
            autoFocus
          />
          <div className="discussion-form-actions">
            <span>{editBody.length.toLocaleString(isKo ? "ko-KR" : "en-US")}</span>
            <button type="submit" disabled={pendingEdit || !editBody.trim()}>
              {pendingEdit ? (isKo ? "저장 중" : "Saving") : (isKo ? "수정 저장" : "Save changes")}
            </button>
            <button type="button" onClick={onEditCancel} disabled={pendingEdit}>
              {isKo ? "취소" : "Cancel"}
            </button>
          </div>
        </form>
      ) : null}

      {deleting ? (
        <div
          className="discussion-confirm discussion-owner-delete"
          role="alertdialog"
          aria-label={isKo ? `${label} 삭제 확인` : `Confirm deleting ${label.toLowerCase()}`}
        >
          <p>
            {isKo ? `이 ${label}을 삭제할까요? 내용은 복구할 수 없으며, 대화 맥락에 필요한 경우 삭제 표시만 남습니다.` : `Delete this ${label.toLowerCase()}? Its content cannot be recovered; a deletion marker may remain to preserve the discussion context.`}
          </p>
          <div>
            <button type="button" onClick={onDeleteConfirm} disabled={pendingDelete}>
              {pendingDelete ? (isKo ? "삭제 중" : "Deleting") : (isKo ? "삭제하기" : "Delete")}
            </button>
            <button type="button" onClick={onDeleteCancel} disabled={pendingDelete}>
              {isKo ? "취소" : "Cancel"}
            </button>
          </div>
        </div>
      ) : null}
    </>
  );
}

function ModerationForm({
  target,
  reason,
  pending,
  onReasonChange,
  onSubmit,
  onCancel,
}: {
  target: ModerationTarget;
  reason: string;
  pending: boolean;
  onReasonChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onCancel: () => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  return (
    <form className="discussion-moderation-form" onSubmit={onSubmit}>
      <label htmlFor={`moderation-${target.targetId}`}>
        {target.action === "hide" ? (isKo ? "숨김 사유" : "Reason for hiding") : (isKo ? "복구 사유" : "Reason for restoring")}
      </label>
      <textarea
        id={`moderation-${target.targetId}`}
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder={isKo ? "감사 기록에 남길 사유를 입력하세요." : "Enter a reason for the audit log."}
      />
      <div className="discussion-form-actions">
        <button type="submit" disabled={pending || !reason.trim()}>
          {pending
            ? (isKo ? "적용 중" : "Applying")
            : target.action === "hide"
              ? (isKo ? "숨김 적용" : "Hide post")
              : (isKo ? "복구 적용" : "Restore post")}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}>{isKo ? "취소" : "Cancel"}</button>
      </div>
    </form>
  );
}

function updateAnswerInView(
  view: DiscussionView | null,
  answerId: string,
  update: (answer: DiscussionAnswerView) => DiscussionAnswerView,
): DiscussionView | null {
  if (!view?.available) return view;

  return {
    ...view,
    questions: view.questions.map((question) => ({
      ...question,
      answers: question.answers.map((answer) =>
        answer.id === answerId ? update(answer) : answer,
      ),
    })),
  } satisfies AvailableDiscussionView;
}

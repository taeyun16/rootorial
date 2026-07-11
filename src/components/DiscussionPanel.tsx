import {
  SignInButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import {
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from "react";
import type { FormEvent, ReactNode } from "react";
import type { DiscussionScopeId } from "../data/discussionScopes";
import type {
  DiscussionAnswerView,
  DiscussionBlockList,
  DiscussionBlockView,
  DiscussionPostType,
  DiscussionQuestionView,
  DiscussionView,
} from "../features/discussion/discussion";
import { useClerkEnabled } from "./ClerkBoundary";

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
  scopeId: DiscussionScopeId;
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

const dateTimeFormatter = new Intl.DateTimeFormat("ko-KR", {
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function formatDateTime(value: number) {
  return dateTimeFormatter.format(new Date(value));
}

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : "요청을 처리하지 못했습니다. 잠시 뒤 다시 시도해 주세요.";
}

function questionAndAnswerCount(view: DiscussionView | null) {
  if (!view?.available) return null;
  return view.questions.reduce(
    (count, question) => count + 1 + question.answers.length,
    0,
  );
}

export function Discussable({
  children,
  scopeId,
  subjectLabel,
  variant = "section",
}: DiscussionPanelProps & { children: ReactNode }) {
  return (
    <div className={`discussable discussable-${variant}`}>
      {children}
      <DiscussionPanel
        scopeId={scopeId}
        subjectLabel={subjectLabel}
        variant={variant}
      />
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
  const [expanded, setExpanded] = useState(false);
  const [view, setView] = useState<DiscussionView | null>(null);
  const [loading, setLoading] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [notice, setNotice] = useState("");
  const [questionBody, setQuestionBody] = useState("");
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
  const loadVersionRef = useRef(0);
  const questionFieldId = useId();
  const toggleId = useId();
  const bodyId = useId();
  const blockConfirmButtonRef = useRef<HTMLButtonElement>(null);

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
    if (expanded && view === null && !loading) {
      void loadDiscussion();
    }
  }, [expanded, loadDiscussion, loading, view]);

  useEffect(() => () => {
    loadVersionRef.current += 1;
  }, []);

  useEffect(() => {
    if (blockTarget) blockConfirmButtonRef.current?.focus();
  }, [blockTarget]);

  const itemCount = questionAndAnswerCount(view);
  const availableView = view?.available ? view : null;
  const canWrite = Boolean(
    authState.isLoaded &&
      authState.isSignedIn &&
      availableView?.viewer.signedIn,
  );

  const headerSummary = useMemo(() => {
    if (loading && view === null) return "불러오는 중";
    if (itemCount === null) return "질문과 답변";
    if (itemCount === 0) return "첫 질문을 남겨보세요";
    return `불러온 대화 ${itemCount}개`;
  }, [itemCount, loading, view]);

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
        setNotice(result.message);
        return;
      }
      setQuestionBody("");
      await refreshAfterMutation("질문을 등록했습니다.");
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
        setNotice(result.message);
        return;
      }
      setReplyBody("");
      setReplyingTo(null);
      await refreshAfterMutation(
        result.kind === "official"
          ? "관리자 답변을 등록했습니다."
          : "답변을 등록했습니다.",
      );
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
          ? `${target.displayName} 님의 글을 숨겼습니다.`
          : `${target.displayName} 님의 차단을 해제했습니다.`,
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
      setNotice(`${block.author.displayName} 님의 차단을 해제했습니다.`);
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
          ? "글을 숨기고 관리 기록을 남겼습니다."
          : "글을 복구하고 관리 기록을 남겼습니다.",
      );
    } catch (error) {
      setNotice(errorMessage(error));
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <section
      className={`discussion-panel discussion-panel-${variant}`}
      aria-label={`${subjectLabel} 질문과 답변`}
    >
      <button
        id={toggleId}
        type="button"
        className="discussion-toggle"
        aria-expanded={expanded}
        aria-controls={bodyId}
        onClick={() => setExpanded((current) => !current)}
      >
        <span className="discussion-toggle-copy">
          <span>DISCUSSION</span>
          <strong>{subjectLabel}</strong>
        </span>
        <span className="discussion-toggle-state">
          <span>{headerSummary}</span>
          <strong>{expanded ? "접기" : "열기"}</strong>
        </span>
      </button>

      {expanded ? (
        <div
          id={bodyId}
          role="region"
          aria-labelledby={toggleId}
          className={`discussion-body${
            view && !view.available ? " discussion-body-unavailable" : ""
          }`}
        >
          {loading && view === null ? (
            <p className="discussion-loading" role="status">대화를 불러오고 있습니다…</p>
          ) : null}

          {view && !view.available ? (
            <div className="discussion-unavailable" role="status">
              <strong>질문 기능을 준비 중입니다</strong>
              <p>학습 콘텐츠와 코드 실행은 그대로 이용할 수 있습니다.</p>
              {import.meta.env.DEV ? <small>{view.message}</small> : null}
              {view.reason === "temporary" ? (
                <button type="button" onClick={() => void loadDiscussion()}>
                  다시 확인
                </button>
              ) : null}
            </div>
          ) : null}

          {availableView ? (
            <>
              <DiscussionComposer
                authState={authState}
                canWrite={canWrite}
                isAdmin={availableView.viewer.isAdmin}
                body={questionBody}
                fieldId={questionFieldId}
                pending={pendingAction === "question"}
                onBodyChange={setQuestionBody}
                onSubmit={submitQuestion}
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
                      차단 해제
                    </button>
                  ) : null}
                </div>
              ) : null}

              {blockTarget ? (
                <div
                  className="discussion-confirm"
                  role="alertdialog"
                  aria-label={`${blockTarget.displayName} 작성자 차단 확인`}
                >
                  <p>
                    <strong>{blockTarget.displayName}</strong> 님의 질문과 답변을
                    내 화면에서 숨길까요?
                  </p>
                  <div>
                    <button
                      ref={blockConfirmButtonRef}
                      type="button"
                      onClick={() => void applyBlock(blockTarget, true)}
                      disabled={Boolean(pendingAction)}
                    >
                      차단하기
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
                      취소
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
                      canWrite={canWrite}
                      pendingAction={pendingAction}
                      replying={replyingTo === question.id}
                      replyBody={replyingTo === question.id ? replyBody : ""}
                      moderationTarget={moderationTarget}
                      moderationReason={moderationReason}
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
                    />
                  ))
                ) : (
                  <div className="discussion-empty">
                    <strong>아직 질문이 없습니다.</strong>
                    <p>막힌 지점이나 실행 결과를 적으면 다음 학습자에게도 도움이 됩니다.</p>
                  </div>
                )}
              </div>

              {availableView.answersTruncated ? (
                <p className="discussion-truncated-notice" role="status">
                  답변이 많은 대화입니다. 최신 페이지의 일부 답변만 표시하고 있습니다.
                </p>
              ) : null}

              {availableView.nextCursor ? (
                <button
                  type="button"
                  className="discussion-load-more"
                  onClick={() => void loadDiscussion({ append: true })}
                  disabled={loading}
                >
                  {loading ? "불러오는 중" : "이전 대화 더 보기"}
                </button>
              ) : null}
            </>
          ) : null}

          {notice && !availableView ? (
            <p className="discussion-notice" role="status">{notice}</p>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function DiscussionComposer({
  authState,
  canWrite,
  isAdmin,
  body,
  fieldId,
  pending,
  onBodyChange,
  onSubmit,
}: {
  authState: AuthState;
  canWrite: boolean;
  isAdmin: boolean;
  body: string;
  fieldId: string;
  pending: boolean;
  onBodyChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  if (!authState.isLoaded) {
    return <p className="discussion-auth-message">로그인 상태를 확인하고 있습니다…</p>;
  }

  if (!canWrite) {
    return (
      <div className="discussion-auth-message">
        <p>
          {authState.clerkEnabled
            ? "질문과 답변을 남기려면 로그인해 주세요. 읽기는 누구나 가능합니다."
            : "Clerk 개발 키를 연결하면 로그인 후 질문과 답변을 남길 수 있습니다."}
        </p>
        {authState.clerkEnabled ? (
          <SignInButton mode="modal">
            <button type="button">로그인하고 질문하기</button>
          </SignInButton>
        ) : null}
      </div>
    );
  }

  return (
    <form className="discussion-composer" onSubmit={onSubmit}>
      <label htmlFor={fieldId}>이 학습 항목에 질문하기</label>
      <textarea
        id={fieldId}
        value={body}
        onChange={(event) => onBodyChange(event.target.value)}
        maxLength={2_000}
        rows={3}
        placeholder="어디에서 막혔는지, 어떤 실행 결과가 예상과 달랐는지 적어주세요."
      />
      <div>
        <span>{body.length.toLocaleString("ko-KR")} / 2,000</span>
        <button type="submit" disabled={pending || !body.trim()}>
          {pending ? "등록 중" : "질문 등록"}
        </button>
      </div>
      {isAdmin ? <small>답변을 남기면 관리자 답변으로 표시됩니다.</small> : null}
    </form>
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
  const bodyId = useId();

  return (
    <section className="discussion-block-manager" aria-label="차단한 사용자 관리">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={onToggle}
      >
        차단한 사용자 관리
      </button>
      {open ? (
        <div className="discussion-block-manager-body" id={bodyId}>
          {loading ? <p role="status">차단 목록을 불러오는 중입니다…</p> : null}
          {!loading && list?.available && list.blocks.length === 0 ? (
            <p>차단한 사용자가 없습니다.</p>
          ) : null}
          {!loading && list?.available && list.blocks.length ? (
            <ul>
              {list.blocks.map((block) => (
                <li key={block.blockToken}>
                  {block.author.imageUrl ? (
                    <img src={block.author.imageUrl} alt="" width="28" height="28" />
                  ) : null}
                  <span>
                    <strong>{block.author.displayName}</strong>
                    <small>{formatDateTime(block.createdAt)}부터 숨김</small>
                  </span>
                  <button
                    type="button"
                    onClick={() => onUnblock(block)}
                    disabled={Boolean(pendingAction)}
                  >
                    차단 해제
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
          {!loading && list && !list.available ? (
            <div className="discussion-block-manager-error" role="status">
              <span>{list.message}</span>
              {list.reason === "temporary" ? (
                <button type="button" onClick={onRetry}>다시 시도</button>
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
  pendingAction,
  replying,
  replyBody,
  moderationTarget,
  moderationReason,
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
}: {
  question: DiscussionQuestionView;
  isAdmin: boolean;
  canWrite: boolean;
  pendingAction: string | null;
  replying: boolean;
  replyBody: string;
  moderationTarget: ModerationTarget | null;
  moderationReason: string;
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
}) {
  const questionModerationOpen =
    moderationTarget?.targetType === "question" &&
    moderationTarget.targetId === question.id;

  return (
    <article className={`discussion-question discussion-post-${question.state}`}>
      <PostHeader
        author={question.author}
        createdAt={question.createdAt}
        state={question.state}
      />
      <PostBody
        body={question.body}
        state={question.state}
        moderationReason={question.moderationReason}
        deletedLabel="작성자가 삭제한 질문입니다."
      />
      <div className="discussion-post-actions">
        {canWrite && question.state === "visible" ? (
          <button type="button" onClick={onReplyStart}>답변 남기기</button>
        ) : null}
        {question.canBlockAuthor ? (
          <button
            type="button"
            onClick={() => onBlock({
              sourceType: "question",
              sourceId: question.id,
              displayName: question.author.displayName,
            })}
          >
            작성자 차단
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
            {question.state === "hidden" ? "질문 복구" : "질문 숨기기"}
          </button>
        ) : null}
      </div>

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
            return (
              <article
                className={`discussion-answer discussion-answer-${answer.kind} discussion-post-${answer.state}`}
                key={answer.id}
              >
                <PostHeader
                  author={answer.author}
                  createdAt={answer.createdAt}
                  state={answer.state}
                  official={answer.kind === "official"}
                />
                <PostBody
                  body={answer.body}
                  state={answer.state}
                  moderationReason={answer.moderationReason}
                  deletedLabel="작성자가 삭제한 답변입니다."
                />
                <div className="discussion-post-actions">
                  {answer.canLike ? (
                    <button
                      type="button"
                      className={answer.likedByMe ? "is-active" : undefined}
                      aria-pressed={answer.likedByMe}
                      onClick={() => onLike(answer)}
                      disabled={Boolean(pendingAction)}
                    >
                      좋아요 {answer.likeCount}
                    </button>
                  ) : (
                    <span>좋아요 {answer.likeCount}</span>
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
                      작성자 차단
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
                      {answer.state === "hidden" ? "답변 복구" : "답변 숨기기"}
                    </button>
                  ) : null}
                </div>
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
            {isAdmin ? "관리자 답변" : "답변"}
          </label>
          <textarea
            id={`reply-${question.id}`}
            value={replyBody}
            onChange={(event) => onReplyBodyChange(event.target.value)}
            maxLength={4_000}
            rows={3}
            autoFocus
            placeholder="계산 과정이나 실행 가능한 예시를 함께 남겨주세요."
          />
          <div>
            <button type="submit" disabled={!replyBody.trim() || Boolean(pendingAction)}>
              {pendingAction === `answer:${question.id}` ? "등록 중" : "답변 등록"}
            </button>
            <button type="button" onClick={onReplyCancel} disabled={Boolean(pendingAction)}>
              취소
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
  state,
  official = false,
}: {
  author: { displayName: string; imageUrl: string | null };
  createdAt: number;
  state: "visible" | "hidden" | "deleted";
  official?: boolean;
}) {
  return (
    <header className="discussion-post-header">
      {author.imageUrl ? (
        <img src={author.imageUrl} alt="" width="28" height="28" />
      ) : null}
      <strong>{author.displayName}</strong>
      {official ? <span className="discussion-official-badge">관리자 답변</span> : null}
      {state === "hidden" ? <span className="discussion-hidden-badge">숨김</span> : null}
      <time dateTime={new Date(createdAt).toISOString()}>{formatDateTime(createdAt)}</time>
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
  if (state === "deleted") {
    return <p className="discussion-post-tombstone">{deletedLabel}</p>;
  }

  return (
    <>
      <p className="discussion-post-body">{body}</p>
      {state === "hidden" && moderationReason ? (
        <p className="discussion-moderation-reason">관리 사유: {moderationReason}</p>
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
  return (
    <form className="discussion-moderation-form" onSubmit={onSubmit}>
      <label htmlFor={`moderation-${target.targetId}`}>
        {target.action === "hide" ? "숨김 사유" : "복구 사유"}
      </label>
      <textarea
        id={`moderation-${target.targetId}`}
        value={reason}
        onChange={(event) => onReasonChange(event.target.value)}
        maxLength={500}
        rows={2}
        placeholder="감사 기록에 남길 사유를 입력하세요."
      />
      <div>
        <button type="submit" disabled={pending || !reason.trim()}>
          {pending
            ? "적용 중"
            : target.action === "hide"
              ? "숨김 적용"
              : "복구 적용"}
        </button>
        <button type="button" onClick={onCancel} disabled={pending}>취소</button>
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

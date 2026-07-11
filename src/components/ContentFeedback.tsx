import {
  SignInButton,
  SignUpButton,
  useAuth,
} from "@clerk/tanstack-react-start";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { useClerkEnabled } from "./ClerkBoundary";
import { RootorialMark } from "./RootorialMark";
import { useLocale } from "../features/localization/localization";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  type FeedbackKind,
} from "../features/feedback/feedback";

type FeedbackAuthState = {
  clerkEnabled: boolean;
  isLoaded: boolean;
  isSignedIn: boolean;
};

const kindOptions: Array<{
  value: FeedbackKind;
  ko: string;
  en: string;
}> = [
  { value: "incorrect", ko: "내용 오류", en: "Incorrect" },
  { value: "confusing", ko: "이해가 어려움", en: "Confusing" },
  { value: "suggestion", ko: "개선 제안", en: "Suggestion" },
];

export function ContentFeedback() {
  const clerkEnabled = useClerkEnabled();

  return clerkEnabled ? (
    <ClerkContentFeedback />
  ) : (
    <ContentFeedbackCore
      authState={{ clerkEnabled: false, isLoaded: true, isSignedIn: false }}
    />
  );
}

function ClerkContentFeedback() {
  const { isLoaded, isSignedIn, userId, sessionId } = useAuth();
  return (
    <ContentFeedbackCore
      key={userId ?? sessionId ?? "signed-out"}
      authState={{
        clerkEnabled: true,
        isLoaded,
        isSignedIn: Boolean(isSignedIn),
      }}
    />
  );
}

function ContentFeedbackCore({
  authState,
}: {
  authState: FeedbackAuthState;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => (isKo ? ko : en);
  const [open, setOpen] = useState(false);
  const [kind, setKind] = useState<FeedbackKind>("incorrect");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const panelId = useId();
  const noticeId = useId();
  const toggleRef = useRef<HTMLButtonElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    requestAnimationFrame(() => closeRef.current?.focus());
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOpen(false);
      requestAnimationFrame(() => toggleRef.current?.focus());
    };
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [open]);

  function closePanel() {
    setOpen(false);
    requestAnimationFrame(() => toggleRef.current?.focus());
  }

  async function submitFeedback(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!message.trim() || pending) return;
    setPending(true);
    setNotice("");

    try {
      const { submitContentFeedback } = await import(
        "../features/feedback/feedback.functions"
      );
      const result = await submitContentFeedback({
        data: {
          kind,
          message,
          pagePath: `${window.location.pathname}${window.location.search}`,
          pageTitle: document.title,
        },
      });
      if (!result.ok) {
        setNotice(result.message);
        return;
      }
      setMessage("");
      setSubmitted(true);
    } catch {
      setNotice(
        t(
          "피드백을 보내지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
          "We couldn't send your feedback. Please try again shortly.",
        ),
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <aside className={`content-feedback${open ? " is-open" : ""}`}>
      {open ? (
        <section
          className="content-feedback-panel"
          id={panelId}
          role="dialog"
          aria-modal="false"
          aria-labelledby={`${panelId}-title`}
        >
          <div className="content-feedback-header">
            <div>
              <span>{t("CONTENT FEEDBACK", "CONTENT FEEDBACK")}</span>
              <h2 id={`${panelId}-title`}>
                {t("이 페이지는 어땠나요?", "How was this page?")}
              </h2>
            </div>
            <button
              ref={closeRef}
              className="content-feedback-close"
              type="button"
              onClick={closePanel}
              aria-label={t("피드백 창 닫기", "Close feedback panel")}
            >
              ×
            </button>
          </div>

          {!authState.isLoaded ? (
            <div className="content-feedback-state" aria-live="polite">
              <span className="content-feedback-state-mark">···</span>
              <p>{t("계정 정보를 확인하고 있습니다.", "Checking your account.")}</p>
            </div>
          ) : !authState.isSignedIn ? (
            <div className="content-feedback-auth">
              <RootorialMark className="content-feedback-auth-mark" />
              <h3>{t("가입 후 의견을 남길 수 있어요", "Join to share feedback")}</h3>
              <p>
                {t(
                  "보내주신 의견은 현재 페이지와 함께 저장되어 다음 콘텐츠 개선에 반영됩니다.",
                  "Your feedback is saved with the current page and helps shape the next content update.",
                )}
              </p>
              {authState.clerkEnabled ? (
                <div className="content-feedback-auth-actions">
                  <SignUpButton mode="modal">
                    <button type="button" className="button button-primary">
                      {t("무료로 가입하고 피드백 남기기", "Sign up free to leave feedback")}
                    </button>
                  </SignUpButton>
                  <SignInButton mode="modal">
                    <button type="button" className="content-feedback-signin">
                      {t("이미 계정이 있나요? 로그인", "Already have an account? Sign in")}
                    </button>
                  </SignInButton>
                </div>
              ) : (
                <p className="content-feedback-unavailable">
                  {t(
                    "현재 로그인 기능을 준비하고 있습니다.",
                    "Sign-in is being configured.",
                  )}
                </p>
              )}
            </div>
          ) : submitted ? (
            <div className="content-feedback-success" role="status">
              <span aria-hidden="true">✓</span>
              <h3>{t("의견을 보냈습니다", "Feedback sent")}</h3>
              <p>
                {t(
                  "읽고 더 명확한 학습 콘텐츠로 다듬겠습니다.",
                  "We'll use it to make the learning content clearer.",
                )}
              </p>
              <button type="button" className="button button-secondary" onClick={closePanel}>
                {t("닫기", "Close")}
              </button>
              <button
                type="button"
                className="content-feedback-again"
                onClick={() => {
                  setSubmitted(false);
                  setNotice("");
                }}
              >
                {t("다른 의견 남기기", "Leave another note")}
              </button>
            </div>
          ) : (
            <form className="content-feedback-form" onSubmit={submitFeedback}>
              <fieldset>
                <legend>{t("어떤 의견인가요?", "What kind of feedback is this?")}</legend>
                <div className="content-feedback-kinds">
                  {kindOptions.map((option) => (
                    <label key={option.value}>
                      <input
                        type="radio"
                        name="feedback-kind"
                        value={option.value}
                        checked={kind === option.value}
                        onChange={() => setKind(option.value)}
                      />
                      <span>{isKo ? option.ko : option.en}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <label className="content-feedback-message">
                <span>{t("자세한 내용을 알려주세요", "Tell us more")}</span>
                <textarea
                  value={message}
                  onChange={(event) => setMessage(event.target.value)}
                  maxLength={FEEDBACK_MESSAGE_MAX_LENGTH}
                  rows={5}
                  required
                  placeholder={t(
                    "어느 부분이 잘못되었거나 이해하기 어려웠나요?",
                    "What felt incorrect or difficult to understand?",
                  )}
                  aria-describedby={notice ? noticeId : undefined}
                />
                <small>{message.length.toLocaleString()} / {FEEDBACK_MESSAGE_MAX_LENGTH.toLocaleString()}</small>
              </label>
              {notice ? (
                <p className="content-feedback-notice" id={noticeId} role="alert">
                  {notice}
                </p>
              ) : null}
              <div className="content-feedback-submit-row">
                <p>{t("현재 페이지 정보가 함께 전송됩니다.", "The current page is included.")}</p>
                <button
                  type="submit"
                  className="button button-primary"
                  disabled={!message.trim() || pending}
                >
                  {pending ? t("보내는 중…", "Sending…") : t("피드백 보내기", "Send feedback")}
                </button>
              </div>
            </form>
          )}
        </section>
      ) : null}

      <button
        ref={toggleRef}
        className="content-feedback-toggle"
        type="button"
        onClick={() => setOpen((current) => !current)}
        aria-label={t("의견 보내기", "Send feedback")}
        aria-expanded={open}
        aria-controls={panelId}
      >
        <span className="content-feedback-toggle-icon" aria-hidden="true">?</span>
        <span>{t("의견", "Feedback")}</span>
      </button>
    </aside>
  );
}

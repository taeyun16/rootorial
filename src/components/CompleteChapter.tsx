import { Link } from "@tanstack/react-router";
import { useProgress } from "./ProgressProvider";
import { useLocale } from "../features/localization/localization";
import { chapterId, TRANSFORMER_CURRICULUM_SLUG } from "../data/curriculum";
import { usePublicationPreview } from "./PublicationPreview";

type CompleteChapterProps = {
  slug: string;
  curriculumSlug?: string;
  canComplete?: boolean;
  lockedMessage?: string;
};

export function CompleteChapter({
  slug,
  curriculumSlug = TRANSFORMER_CURRICULUM_SLUG,
  canComplete = true,
  lockedMessage = "이해 확인을 마치면 챕터를 완료할 수 있습니다.",
}: CompleteChapterProps) {
  const { completed, markComplete, retry, status } = useProgress();
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const progressId = chapterId(curriculumSlug, slug);
  const isCompleted = completed.includes(progressId);

  if (preview) {
    return (
      <div>
        <button
          type="button"
          className="button button-primary complete-button"
          disabled
        >
          {isKo ? "미리보기에서는 완료할 수 없습니다" : "Completion is disabled in preview"}
        </button>
        <p role="status">
          {isKo
            ? "공개 전 진도 데이터가 저장되지 않도록 비활성화했습니다."
            : "Disabled so preview activity cannot change learner progress."}
        </p>
      </div>
    );
  }

  if (isCompleted) {
    const message =
      status === "syncing"
        ? (isKo ? "진도를 계정에 저장하고 있습니다." : "Saving progress to your account.")
        : status === "synced"
          ? (isKo ? "진도가 계정에 저장되었습니다." : "Progress saved to your account.")
          : status === "error"
            ? (isKo ? "이 기기에는 저장했지만 계정 동기화에 실패했습니다." : "Saved on this device, but account sync failed.")
            : (isKo ? "진도가 이 브라우저에 저장되었습니다." : "Progress saved in this browser.");

    return (
      <div className="completed-panel">
        <span className="completed-check">✓</span>
        <div>
          <strong>{isKo ? "챕터 완료" : "Chapter complete"}</strong>
          <p role="status">{message}</p>
        </div>
        {status === "error" ? (
          <button className="text-link" type="button" onClick={retry}>
            {isKo ? "다시 동기화" : "Sync again"}
          </button>
        ) : (
          <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug }}>
            {isKo ? "커리큘럼으로" : "To curriculum"}
          </Link>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        className="button button-primary complete-button"
        disabled={!canComplete || status === "loading" || status === "syncing"}
        onClick={() => void markComplete(progressId)}
      >
        {status === "loading"
          ? (isKo ? "진도 불러오는 중" : "Loading progress")
          : (isKo ? "이 챕터 완료하기" : "Complete this chapter")}{" "}
        <span aria-hidden="true">✓</span>
      </button>
      {!canComplete ? <p role="status">{lockedMessage}</p> : null}
      {status === "error" ? (
        <p role="status">
          {isKo ? "계정 진도를 불러오지 못했습니다." : "Could not load account progress."}{" "}
          <button className="text-link" type="button" onClick={retry}>
            {isKo ? "다시 시도" : "Try again"}
          </button>
        </p>
      ) : null}
    </div>
  );
}

import { Link } from "@tanstack/react-router";
import { useProgress } from "./ProgressProvider";

type CompleteChapterProps = {
  slug: string;
  canComplete?: boolean;
  lockedMessage?: string;
};

export function CompleteChapter({
  slug,
  canComplete = true,
  lockedMessage = "이해 확인을 마치면 챕터를 완료할 수 있습니다.",
}: CompleteChapterProps) {
  const { completed, markComplete, retry, status } = useProgress();
  const isCompleted = completed.includes(slug);

  if (isCompleted) {
    const message =
      status === "syncing"
        ? "진도를 계정에 저장하고 있습니다."
        : status === "synced"
          ? "진도가 계정에 저장되었습니다."
          : status === "error"
            ? "이 기기에는 저장했지만 계정 동기화에 실패했습니다."
            : "진도가 이 브라우저에 저장되었습니다.";

    return (
      <div className="completed-panel">
        <span className="completed-check">✓</span>
        <div>
          <strong>챕터 완료</strong>
          <p role="status">{message}</p>
        </div>
        {status === "error" ? (
          <button className="text-link" type="button" onClick={retry}>
            다시 동기화
          </button>
        ) : (
          <Link to="/">커리큘럼으로</Link>
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
        onClick={() => void markComplete(slug)}
      >
        {status === "loading" ? "진도 불러오는 중" : "이 챕터 완료하기"}{" "}
        <span aria-hidden="true">✓</span>
      </button>
      {!canComplete ? <p role="status">{lockedMessage}</p> : null}
      {status === "error" ? (
        <p role="status">
          계정 진도를 불러오지 못했습니다.{" "}
          <button className="text-link" type="button" onClick={retry}>
            다시 시도
          </button>
        </p>
      ) : null}
    </div>
  );
}

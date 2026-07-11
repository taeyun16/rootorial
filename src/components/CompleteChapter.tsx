import { Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";

const progressKey = "rezero-progress";

export function CompleteChapter({ slug }: { slug: string }) {
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    try {
      const progress = JSON.parse(localStorage.getItem(progressKey) ?? "[]") as string[];
      setCompleted(progress.includes(slug));
    } catch {
      setCompleted(false);
    }
  }, [slug]);

  function markComplete() {
    let progress: string[] = [];
    try {
      progress = JSON.parse(localStorage.getItem(progressKey) ?? "[]") as string[];
    } catch {
      progress = [];
    }
    if (!progress.includes(slug)) progress.push(slug);
    localStorage.setItem(progressKey, JSON.stringify(progress));
    setCompleted(true);
  }

  if (completed) {
    return (
      <div className="completed-panel">
        <span className="completed-check">✓</span>
        <div><strong>챕터 완료</strong><p>진도가 이 브라우저에 저장되었습니다.</p></div>
        <Link to="/">커리큘럼으로</Link>
      </div>
    );
  }

  return (
    <button type="button" className="button button-primary complete-button" onClick={markComplete}>
      이 챕터 완료하기 <span aria-hidden="true">✓</span>
    </button>
  );
}

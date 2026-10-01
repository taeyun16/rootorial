import { createContext, useContext } from "react";
import { useLocale } from "../features/localization/localization";
import { useProgress } from "./ProgressProvider";

export const LocalLearningContext = createContext(false);
export const useLocalLearning = () => useContext(LocalLearningContext);

export function LocalLearningTools() {
  const local = useLocalLearning();
  const { resetLocal } = useProgress();
  const { locale } = useLocale();
  if (!local) return null;
  return (
    <aside className="publication-preview-banner" aria-label={locale === "ko" ? "로컬 학습 도구" : "Local learning tools"}>
      <a href={`/admin/preview/curricula/${locale === "en" ? "?lang=en" : ""}`}>
        {locale === "ko" ? "로컬 학습 · 전체 커리큘럼" : "Local learning · all curricula"}
      </a>
      <span>{locale === "ko" ? "이 연습은 계정 진도에 반영되지 않습니다." : "This practice does not change your account progress."}</span>
      <button type="button" className="text-link" onClick={() => { if (resetLocal?.()) window.location.reload(); }}>
        {locale === "ko" ? "연습 진도 초기화" : "Reset practice progress"}
      </button>
    </aside>
  );
}

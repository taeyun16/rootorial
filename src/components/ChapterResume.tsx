import { useEffect } from "react";
import { useLocale } from "../features/localization/localization";
import { useProgress } from "./ProgressProvider";
import { usePublicationPreview } from "./PublicationPreview";
import { useLocalLearning } from "./LocalLearning";

export function ChapterResume({ chapterId }: { chapterId: string }) {
  const { resume, saveResume, status } = useProgress();
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const local = useLocalLearning();
  const enabled = (!preview || local) && status !== "loading";
  useEffect(() => {
    if (!enabled) return;
    const rememberSection = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("#")) return;
      const sectionId = href.slice(1);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(sectionId) || !document.getElementById(sectionId)) return;
      void saveResume({ chapterId, sectionId, updatedAt: Date.now() });
    };
    document.addEventListener("click", rememberSection);
    return () => document.removeEventListener("click", rememberSection);
  }, [chapterId, enabled, saveResume]);
  if (!enabled || resume?.chapterId !== chapterId) return null;
  return (
    <aside className="chapter-resume" aria-label={locale === "ko" ? "학습 이어보기" : "Resume learning"}>
      <a href={`#${resume.sectionId}`}>{locale === "ko" ? "지난 위치에서 이어보기" : "Continue from your saved section"}</a>
      <span>{locale === "ko" ? "실습 답안은 새로 확인합니다." : "Practice answers are checked again."}</span>
    </aside>
  );
}

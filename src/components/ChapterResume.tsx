import { useEffect, useRef } from "react";
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
  const remembered = useRef<string | null>(null);
  remembered.current = resume?.chapterId === chapterId ? resume.sectionId : null;
  useEffect(() => {
    if (!enabled) return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let userScrollUntil = 0;
    const save = (sectionId: string) => {
      if (sectionId === remembered.current) return;
      remembered.current = sectionId;
      void saveResume({ chapterId, sectionId, updatedAt: Date.now() });
    };
    const rememberSection = (event: MouseEvent) => {
      const link = (event.target as Element | null)?.closest?.("a[href]");
      const href = link?.getAttribute("href");
      if (!href?.startsWith("#")) return;
      const sectionId = href.slice(1);
      if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(sectionId) || !document.getElementById(sectionId)) return;
      clearTimeout(timer);
      userScrollUntil = 0;
      save(sectionId);
    };
    // Layout changes, browser scroll restoration and scrollIntoView must not
    // replace a saved section before the learner actually starts reading.
    const intent = () => { userScrollUntil = Date.now() + 2_000; };
    const keyboardIntent = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable=true], [role=slider]")) return;
      if (["ArrowDown", "ArrowUp", "PageDown", "PageUp", "Home", "End", " "].includes(event.key)) intent();
    };
    const scrollbarIntent = (event: PointerEvent) => {
      if (event.clientX >= document.documentElement.clientWidth) intent();
    };
    const rememberVisibleSection = () => {
      if (Date.now() > userScrollUntil) return;
      clearTimeout(timer);
      timer = setTimeout(() => {
        const sections = [...document.querySelectorAll<HTMLElement>(".lesson-article section[id]")]
          .filter((section) => !section.closest("details:not([open])") && section.getClientRects().length > 0 && section.getBoundingClientRect().height > 0);
        const readingLine = Math.min(220, window.innerHeight * 0.3);
        const visible = sections.filter((section) => section.getBoundingClientRect().top <= readingLine).at(-1)
          ?? sections.find((section) => section.getBoundingClientRect().top < window.innerHeight * 0.7);
        if (visible && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(visible.id)) save(visible.id);
      }, 700);
    };
    document.addEventListener("click", rememberSection);
    window.addEventListener("wheel", intent, { passive: true });
    window.addEventListener("touchmove", intent, { passive: true });
    window.addEventListener("keydown", keyboardIntent);
    window.addEventListener("pointerdown", scrollbarIntent);
    window.addEventListener("scroll", rememberVisibleSection, { passive: true });
    return () => {
      clearTimeout(timer);
      document.removeEventListener("click", rememberSection);
      window.removeEventListener("wheel", intent);
      window.removeEventListener("touchmove", intent);
      window.removeEventListener("keydown", keyboardIntent);
      window.removeEventListener("pointerdown", scrollbarIntent);
      window.removeEventListener("scroll", rememberVisibleSection);
    };
  }, [chapterId, enabled, saveResume]);
  if (!enabled || resume?.chapterId !== chapterId) return null;
  return (
    <aside className="chapter-resume" aria-label={locale === "ko" ? "학습 이어보기" : "Resume learning"}>
      <a href={`#${resume.sectionId}`}>{locale === "ko" ? "지난 위치에서 이어보기" : "Continue from your saved section"}</a>
      <span>{locale === "ko" ? "실습 답안은 새로 확인합니다." : "Practice answers are checked again."}</span>
    </aside>
  );
}

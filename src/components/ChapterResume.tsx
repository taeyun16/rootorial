import { useEffect, useRef } from "react";
import { useLocale } from "../features/localization/localization";
import { useProgress } from "./ProgressProvider";
import { usePublicationPreview } from "./PublicationPreview";
import { useExperimentDraft } from "../features/progress/useExperimentDraft";
import { initialInputs, validInputs } from "../features/learning/vector-input-draft";
import { useLocalLearning } from "./LocalLearning";

export function ChapterResume({ chapterId }: { chapterId: string }) {
  const { resume, saveResume, status, completed, storageAvailable } = useProgress();
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const local = useLocalLearning();
  const vectorDraft = useExperimentDraft("vector-basic-inputs:v1", initialInputs, validInputs);
  const hasRestoredInputs = chapterId === "transformer-from-zero/vectors" && vectorDraft.restored;
  const isCompleted = completed.includes(chapterId);
  const hasSavedSection = resume?.chapterId === chapterId;
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
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
  if (!enabled || (!hasSavedSection && !hasRestoredInputs && !isCompleted)) return null;
  return (
    <aside className="chapter-resume" aria-label={t("학습 이어보기", "Resume learning")}>
      {hasSavedSection && <a href={`#${resume!.sectionId}`}>{t("지난 위치에서 이어보기", "Continue from your saved section")}</a>}
      <dl>
        <div><dt>{storageAvailable ? t("저장된 완료", "Saved completion") : t("이 페이지의 완료", "Completion on this page")}</dt><dd>{isCompleted ? t("완료 기록 있음", "Completion recorded") : t("완료 기록 없음", "No completion recorded")}</dd></div>
        <div><dt>{t("복원된 입력", "Restored inputs")}</dt><dd>{hasRestoredInputs ? t("벡터 연산·좌표·스칼라", "Vector operation, coordinates, and scalar") : t("없음", "None")}</dd></div>
        <div><dt>{t("재확인할 답안", "Answers to recheck")}</dt><dd>{t("예측·실습 결과·이해 확인은 새로 제출하세요. 입력 복원은 완료 증거가 아닙니다.", "Submit predictions, exercise results, and concept checks again. Restored inputs are not completion evidence.")}</dd></div>
      </dl>
      {!storageAvailable && <p role="status">{t("브라우저 저장 공간을 사용할 수 없어 현재 페이지에서만 유지됩니다.", "Browser storage is unavailable; state lasts only on this page.")}</p>}
      {status === "error" && <p role="status">{t("계정 동기화 상태를 확인하지 못했습니다. 완료 영역에서 다시 동기화하세요.", "Account sync could not be confirmed. Retry in the completion area.")}</p>}
    </aside>
  );
}

import { useId } from "react";
import { LearningLabGlossary } from "./LearningLabGlossary";
import { getCurriculum } from "../data/curriculum";
import { getChapterExperienceContract } from "../features/chapters/experience-contracts";
import { requestContentFeedback } from "../features/feedback/content-feedback-events";
import { useLocale } from "../features/localization/localization";

const interactionCopy = {
  "build-and-observe": {
    ko: ["구성 요소를 연결하세요", "설정을 적용해 실행하세요", "출력으로 결과를 확인하세요"],
    en: ["Build the boundary", "Execute the state", "Verify the resulting evidence"],
  },
  "compare-and-tune": {
    ko: ["두 상태를 예측하세요", "같은 기준으로 비교하세요", "한 변수만 조정하세요"],
    en: ["Predict two states", "Compare them on one basis", "Tune one variable"],
  },
  "predict-and-repair": {
    ko: ["결과를 먼저 예측하세요", "처음 실패한 단계를 찾으세요", "필요한 설정만 고쳐 다시 확인하세요"],
    en: ["Predict the outcome", "Find the first failed boundary", "Repair only the minimal state"],
  },
  "trace-and-diagnose": {
    ko: ["어디에서 측정할지 정하세요", "출력을 순서대로 추적하세요", "처음 실패한 단계를 찾으세요"],
    en: ["Fix the observation point", "Trace evidence in order", "Diagnose the first failed boundary"],
  },
  "trade-off-and-review": {
    ko: ["평가 기준을 정하세요", "대안을 같은 지표로 비교하세요", "선택의 비용을 검토하세요"],
    en: ["Set evaluation criteria", "Compare options with the same metrics", "Review the cost of the choice"],
  },
} as const;

export function CurriculumChapterCompass({
  curriculumSlug,
  chapterSlug,
}: {
  curriculumSlug: string;
  chapterSlug: string;
}) {
  const { locale } = useLocale();
  const titleId = useId();
  const curriculum = getCurriculum(curriculumSlug);
  const chapter = curriculum?.chapters[locale].find((candidate) => candidate.slug === chapterSlug);
  const contract = getChapterExperienceContract(`${curriculumSlug}/${chapterSlug}`);
  if (!curriculum || !chapter || !contract) return null;

  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const evidenceTerms = contract.linkedEvidence.split(" · ");
  const focusTerms = [...new Set([...chapter.concepts, ...evidenceTerms])].slice(0, 5);
  const actions = interactionCopy[contract.interaction][locale];

  function openClarificationFeedback() {
    requestContentFeedback({
      kind: "confusing",
      message: isKo
        ? `어려운 용어 또는 증거 경계: \n막힌 설명: \n챕터: ${curriculumSlug}/${chapterSlug}`
        : `Difficult term or evidence boundary: \nWhere the explanation became unclear: \nChapter: ${curriculumSlug}/${chapterSlug}`,
    });
  }

  return (
    <section className="curriculum-chapter-compass" aria-labelledby={titleId} data-chapter-id={`${curriculumSlug}/${chapterSlug}`}>
      <header>
        <div>
          <p>{t("이번 장의 학습 순서", "CHAPTER COMPASS")}</p>
          <h2 id={titleId}>{t("예측하고, 실행하고, 확인하기", "Evidence path for this chapter")}</h2>
        </div>
        <span>{t("핵심 경로만 완료 · 도움 요청은 진도에 포함되지 않습니다", "Complete the core path · asking for help never affects progress")}</span>
      </header>

      <div className="curriculum-chapter-compass-body">
        <ol aria-label={t("완료에 필요한 핵심 행동", "Core actions for completion")}>
          {actions.map((action, index) => (
            <li key={action}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{action}</strong>
            </li>
          ))}
        </ol>
        <div className="curriculum-chapter-compass-evidence">
          <span>{t("출력에서 함께 확인할 항목", "EVIDENCE TO CONNECT")}</span>
          <p>{contract.linkedEvidence}</p>
        </div>
      </div>

      <div className="curriculum-chapter-compass-terms">
        <div>
          <span>{t("먼저 확인할 용어", "TERMS TO CHECK FIRST")}</span>
          <ul>{focusTerms.map((term) => <li key={term}>{term}</li>)}</ul>
        </div>
        <button type="button" className="button button-secondary" onClick={openClarificationFeedback}>
          {t("용어나 결과 해석이 어려워요", "A term or evidence boundary is unclear")}
        </button>
      </div>
      <LearningLabGlossary />
    </section>
  );
}

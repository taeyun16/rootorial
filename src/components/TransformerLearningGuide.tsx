import { useId } from "react";
import {
  transformerLearningGuides,
  transformerLearningPhases,
  type TransformerLearningGuideSlug,
} from "../data/transformerLearningGuide";
import { requestContentFeedback } from "../features/feedback/content-feedback-events";
import { useLocale } from "../features/localization/localization";

export function TransformerLearningGuide({
  chapterSlug,
}: {
  chapterSlug: TransformerLearningGuideSlug;
}) {
  const { locale } = useLocale();
  const titleId = useId();
  const guide = transformerLearningGuides[chapterSlug];
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => (isKo ? ko : en);

  function openClarificationFeedback() {
    requestContentFeedback({
      kind: "confusing",
      message: isKo
        ? `어려운 용어 또는 개념: \n막힌 설명: \n챕터: ${chapterSlug}`
        : `Difficult term or concept: \nWhere the explanation became unclear: \nChapter: ${chapterSlug}`,
    });
  }

  return (
    <section className="transformer-learning-guide" id="chapter-compass" aria-labelledby={titleId}>
      <header className="transformer-learning-guide-header">
        <div>
          <p>{t("CHAPTER COMPASS", "CHAPTER COMPASS")}</p>
          <h2 id={titleId}>{t("지금 어디를 배우고 있나요?", "Where are you in the build?")}</h2>
        </div>
        <span className="transformer-learning-guide-budget">
          {t("핵심 경로만 완료 · 선택 실습은 건너뛰어도 됩니다", "Complete the core path · optional practice may be skipped")}
        </span>
      </header>

      <ol className="transformer-learning-phases" aria-label={t("Transformer 학습 단계", "Transformer learning phases")}>
        {transformerLearningPhases.map((phase, index) => (
          <li
            className={index === guide.phaseIndex ? "is-current" : undefined}
            aria-current={index === guide.phaseIndex ? "step" : undefined}
            key={phase.en}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{phase[locale]}</strong>
          </li>
        ))}
      </ol>

      <div className="transformer-learning-guide-role">
        <span>{t("TRANSFORMER에서 다시 만나는 곳", "WHERE THIS RETURNS IN THE TRANSFORMER")}</span>
        <p>{guide.transformerRole[locale]}</p>
      </div>

      <div className="transformer-learning-guide-path">
        <div>
          <span className="transformer-learning-guide-label">{t("완료에 필요한 핵심 행동", "CORE ACTIONS FOR COMPLETION")}</span>
          <ol>
            {guide.coreActions.map((action, index) => (
              <li key={action.href}>
                <a href={action.href}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <strong>{action.label[locale]}</strong>
                  <small>{t("이동", "Go")}</small>
                </a>
              </li>
            ))}
          </ol>
        </div>
        <aside>
          <span>{t("선택 심화", "OPTIONAL DEPTH")}</span>
          <p>{guide.optionalPath[locale]}</p>
          <strong>{t("선택 활동은 완료 조건이 아닙니다.", "Optional activities never block completion.")}</strong>
        </aside>
      </div>

      <div className="transformer-key-terms">
        <div className="transformer-key-terms-heading">
          <div>
            <span>{t("먼저 읽는 핵심 용어", "KEY TERMS TO READ FIRST")}</span>
            <h3>{t("클릭 없이 뜻부터 확인하세요", "Read the meaning without another click")}</h3>
          </div>
          <p>{t("아래 용어 읽기와 의견 보내기는 진도에 포함되지 않습니다.", "Reading terms or sending feedback does not affect progress.")}</p>
        </div>
        <dl>
          {guide.terms.map((item) => (
            <div key={item.english}>
              <dt>
                <strong>{item.label[locale]}</strong>
                {item.label[locale].toLocaleLowerCase() !== item.english.toLocaleLowerCase() ? <span>{item.english}</span> : null}
              </dt>
              <dd>{item.definition[locale]}</dd>
            </div>
          ))}
        </dl>
        <div className="transformer-key-terms-feedback">
          <p>{t("설명이 막히면 현재 챕터와 위치를 포함해 알려주세요.", "If an explanation blocks you, send it with the current chapter and location.")}</p>
          <button type="button" className="button button-secondary" onClick={openClarificationFeedback}>
            {t("용어·설명이 막혔어요", "A term or explanation is unclear")}
          </button>
        </div>
      </div>
    </section>
  );
}

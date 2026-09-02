import { LanguageSwitcher } from "./LanguageSwitcher";
import { PageMetadataSync } from "./PageMetadataSync";
import { PublicationPreviewBanner } from "./PublicationPreview";
import { useLocale } from "../features/localization/localization";
import { previewHref } from "../utils/preview-href";
import type { buildLocalContentPreviewCatalog } from "../features/publication/local-content-preview";

type Catalog = ReturnType<typeof buildLocalContentPreviewCatalog>;

export function LocalContentPreviewCatalog({ catalog }: { catalog: Catalog }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;

  return (
    <>
      <PageMetadataSync
        metadata={{
          ko: {
            title: "로컬 커리큘럼 감사 · Rootorial",
            description: "Rootorial의 구현 및 계획 커리큘럼을 로컬에서 검수합니다.",
          },
          en: {
            title: "Local curriculum audit · Rootorial",
            description: "Review implemented and planned Rootorial curricula locally.",
          },
        }}
      />
      <PublicationPreviewBanner
        title={t("전체 커리큘럼 감사", "All-curriculum audit")}
        localDevelopment
      />
      <main className="local-preview-index">
        <header className="local-preview-index-header">
          <div>
            <p className="eyebrow">LOCAL CONTENT AUDIT · READ ONLY</p>
            <h1>{t("모든 학습 경로를 한곳에서 검수하세요", "Audit every learning path from one place")}</h1>
            <p>
              {t(
                "구현된 장만 실제 미리보기로 연결합니다. 계획 장은 범위를 보여 주되 작동하는 콘텐츠처럼 표시하지 않습니다.",
                "Only implemented chapters link to a live preview. Planned chapters show scope without pretending to be interactive content.",
              )}
            </p>
          </div>
          <LanguageSwitcher />
        </header>

        <section className="local-preview-summary" aria-label={t("감사 요약", "Audit summary")}>
          <article><strong>{catalog.curricula.length}</strong><span>{t("커리큘럼", "curricula")}</span></article>
          <article><strong>{catalog.implementedChapters}</strong><span>{t("구현된 장", "implemented chapters")}</span></article>
          <article><strong>{catalog.plannedChapters}</strong><span>{t("계획 중인 장", "planned chapters")}</span></article>
        </section>

        <section className="local-preview-curricula" aria-label={t("전체 커리큘럼", "All curricula")}>
          {catalog.curricula.map((curriculum) => {
            const implementedCount = curriculum.chapters.filter((chapter) => chapter.previewReady).length;
            return (
              <article className="local-preview-curriculum" key={curriculum.slug}>
                <header>
                  <div>
                    <span className={`local-preview-state is-${curriculum.status}`}>
                      {curriculum.status === "planned"
                        ? t("계획", "Planned")
                        : curriculum.status === "available"
                          ? t("제공 중", "Available")
                          : t("구현 중", "In progress")}
                    </span>
                    <h2>{curriculum.title[locale]}</h2>
                    <p>{curriculum.summary[locale]}</p>
                  </div>
                  <div className="local-preview-curriculum-actions">
                    <span>{implementedCount}/{curriculum.chapters.length} {t("장 구현", "implemented")}</span>
                    {curriculum.previewReady ? (
                      <a href={previewHref(curriculum.slug, undefined, !isKo)}>
                        {t("커리큘럼 개요 열기", "Open curriculum overview")} <span aria-hidden="true">→</span>
                      </a>
                    ) : null}
                  </div>
                </header>
                <ol className="local-preview-chapters">
                  {curriculum.chapters.map((chapter) => (
                    <li className={chapter.previewReady ? "is-ready" : "is-planned"} key={chapter.slug}>
                      <span className="local-preview-chapter-number">{String(chapter.number).padStart(2, "0")}</span>
                      <div><strong>{chapter.title[locale]}</strong><code>{chapter.slug}</code></div>
                      {chapter.previewReady ? (
                        <a href={previewHref(curriculum.slug, chapter.slug, !isKo)}>
                          {t("미리보기", "Preview")} <span aria-hidden="true">↗</span>
                        </a>
                      ) : (
                        <span className="local-preview-planned-label" aria-disabled="true">
                          {t("렌더러 계획 중", "Renderer planned")}
                        </span>
                      )}
                    </li>
                  ))}
                </ol>
              </article>
            );
          })}
        </section>
      </main>
    </>
  );
}

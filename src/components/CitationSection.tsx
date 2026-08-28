import { useLocale } from "../features/localization/localization";

export type Citation = {
  title: string;
  url: string;
  description?: string;
};

type CitationSectionProps = {
  citations: Citation[];
};

/**
 * Learner-facing citation component that displays sources at the end of chapters.
 * Provides visible attribution with title and link for each source.
 */
export function CitationSection({ citations }: CitationSectionProps) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  
  if (citations.length === 0) {
    return null;
  }

  return (
    <section className="article-section citation-section" id="sources">
      <div className="margin-label">
        {isKo ? "출처" : "SOURCES"}
      </div>
      <h2>{isKo ? "더 알아보기" : "Learn More"}</h2>
      <p>
        {isKo
          ? "이 장의 내용은 다음 자료를 바탕으로 구성했습니다. 더 깊이 배우고 싶다면 아래 링크를 따라가세요."
          : "This chapter builds on these sources. Follow the links below to learn more."}
      </p>
      <ul className="citation-list">
        {citations.map((citation, index) => (
          <li key={index} className="citation-item">
            <a
              href={citation.url}
              target="_blank"
              rel="noopener noreferrer"
              className="citation-link"
            >
              <span className="citation-title">{citation.title}</span>
              <svg
                className="external-link-icon"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 8.667V12.667C12 13.0203 11.8595 13.3594 11.6095 13.6095C11.3594 13.8595 11.0203 14 10.667 14H3.333C2.98 14 2.641 13.8595 2.391 13.6095C2.141 13.3594 2 13.0203 2 12.667V5.333C2 4.98 2.141 4.641 2.391 4.391C2.641 4.141 2.98 4 3.333 4H7.333"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M10 2H14V6"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6.667 9.333L14 2"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </a>
            {citation.description && (
              <p className="citation-description">{citation.description}</p>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

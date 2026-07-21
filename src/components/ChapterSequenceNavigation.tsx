import { Link } from "@tanstack/react-router";
import { createContext, useContext, type ReactNode } from "react";
import { getCurriculum } from "../data/curriculum";
import {
  navigationHasChapter,
  navigationHasCurriculum,
  type ChapterNavigationAccess,
} from "../features/chapters/chapter-navigation";
import { useLocale } from "../features/localization/localization";

const ChapterNavigationContext = createContext<ChapterNavigationAccess>({
  preview: false,
  curriculumSlugs: [],
  chapterIds: [],
});

export function ChapterNavigationProvider({
  access,
  children,
}: {
  access: ChapterNavigationAccess;
  children: ReactNode;
}) {
  return (
    <ChapterNavigationContext.Provider value={access}>
      {children}
    </ChapterNavigationContext.Provider>
  );
}

export function useChapterNavigationAccess() {
  return useContext(ChapterNavigationContext);
}

function previewHref(
  curriculumSlug: string,
  chapterSlug: string | null,
  english: boolean,
) {
  const chapterPath = chapterSlug ? `/chapters/${chapterSlug}` : "";
  return `/admin/preview/curricula/${curriculumSlug}${chapterPath}${english ? "?lang=en" : ""}`;
}

function Destination({
  curriculumSlug,
  chapterSlug,
  direction,
  label,
}: {
  curriculumSlug: string;
  chapterSlug: string | null;
  direction: "previous" | "next";
  label: string;
}) {
  const { locale } = useLocale();
  const access = useChapterNavigationAccess();
  const available = chapterSlug
    ? navigationHasChapter(access, curriculumSlug, chapterSlug)
    : navigationHasCurriculum(access, curriculumSlug);
  const content = direction === "previous" ? `← ${label}` : `${label} →`;

  if (!available) {
    return (
      <span className="continuous-chapter-nav-disabled" aria-disabled="true">
        {content}
        <small>{locale === "ko" ? "공개 준비 중" : "Still in draft"}</small>
      </span>
    );
  }

  if (access.preview) {
    return (
      <a href={previewHref(curriculumSlug, chapterSlug, locale === "en")}>
        {content}
      </a>
    );
  }

  return chapterSlug ? (
    <Link
      to="/curricula/$curriculumSlug/chapters/$chapterSlug"
      params={{ curriculumSlug, chapterSlug }}
      search={locale === "en" ? { lang: "en" } : {}}
    >
      {content}
    </Link>
  ) : (
    <Link
      to="/curricula/$curriculumSlug"
      params={{ curriculumSlug }}
      search={locale === "en" ? { lang: "en" } : {}}
    >
      {content}
    </Link>
  );
}

export function ChapterSequenceNavigation({
  curriculumSlug,
  chapterSlug,
}: {
  curriculumSlug: string;
  chapterSlug: string;
}) {
  const { locale } = useLocale();
  const curriculum = getCurriculum(curriculumSlug);
  if (!curriculum) return null;
  const chapters = curriculum.chapters[locale];
  const index = chapters.findIndex((chapter) => chapter.slug === chapterSlug);
  if (index < 0) return null;

  const previous = chapters[index - 1];
  const next = chapters[index + 1];
  const prerequisite = curriculum.recommendedPrerequisite
    ? getCurriculum(curriculum.recommendedPrerequisite.curriculumSlug)
    : undefined;
  const continuation = curriculum.recommendedContinuation
    ? getCurriculum(curriculum.recommendedContinuation.curriculumSlug)
    : undefined;

  return (
    <div className="continuous-chapter-nav-shell">
      <nav
        className="chapter-bottom-nav continuous-chapter-nav"
        aria-label={locale === "ko" ? "연속 커리큘럼 이동" : "Continuous curriculum navigation"}
      >
        {previous ? (
          <Destination
            curriculumSlug={curriculumSlug}
            chapterSlug={previous.slug}
            direction="previous"
            label={`${locale === "ko" ? "이전" : "Previous"}: ${previous.title}`}
          />
        ) : prerequisite ? (
          <Destination
            curriculumSlug={prerequisite.slug}
            chapterSlug={null}
            direction="previous"
            label={`${locale === "ko" ? "선수 과정" : "Prerequisite"}: ${prerequisite.title[locale]}`}
          />
        ) : (
          <Destination
            curriculumSlug={curriculumSlug}
            chapterSlug={null}
            direction="previous"
            label={locale === "ko" ? "커리큘럼" : "Curriculum"}
          />
        )}

        {next ? (
          <Destination
            curriculumSlug={curriculumSlug}
            chapterSlug={next.slug}
            direction="next"
            label={`${locale === "ko" ? "다음" : "Next"}: ${next.title}`}
          />
        ) : continuation ? (
          <Destination
            curriculumSlug={continuation.slug}
            chapterSlug={null}
            direction="next"
            label={`${locale === "ko" ? "다음 과정" : "Next curriculum"}: ${continuation.title[locale]}`}
          />
        ) : (
          <Destination
            curriculumSlug={curriculumSlug}
            chapterSlug={null}
            direction="next"
            label={locale === "ko" ? "커리큘럼으로" : "Back to curriculum"}
          />
        )}
      </nav>
    </div>
  );
}

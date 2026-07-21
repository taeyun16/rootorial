import { createFileRoute, notFound } from "@tanstack/react-router";
import { LearningAnalyticsProvider } from "../components/LearningAnalyticsProvider";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { PageMetadataSync } from "../components/PageMetadataSync";
import { getChapterPage } from "../features/chapters/chapter-pages";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";
import { localeFromLanguage } from "../features/localization/page-metadata";
import { getPublicChapterPublication } from "../features/publication/publication.functions";

export const Route = createFileRoute("/curricula/$curriculumSlug_/chapters/$chapterSlug")({
  loader: async ({ params }) => {
    if (!getChapterPage(params.curriculumSlug, params.chapterSlug)) {
      throw notFound();
    }
    const publication = await getPublicChapterPublication({
      data: {
        curriculumSlug: params.curriculumSlug,
        chapterSlug: params.chapterSlug,
      },
    });
    if (!publication) throw notFound();
    const reach = await getCurriculumReach({
      data: { curriculumSlug: params.curriculumSlug },
    });
    return { publication, reach };
  },
  head: ({ loaderData, match }) => {
    const locale = localeFromLanguage(
      (match.search as { lang?: unknown }).lang,
    );
    const chapter = loaderData?.publication.curriculum.chapters[locale].find(
      (candidate) => candidate.slug === match.params.chapterSlug,
    );
    const noindex =
      loaderData?.publication.publication.listing === "unlisted" ||
      loaderData?.publication.curriculumPublication.listing === "unlisted";
    return {
      meta: [
        {
          title: chapter
            ? `${String(chapter.number).padStart(2, "0")}. ${chapter.title} · Rootorial`
            : "Rootorial",
        },
        {
          name: "description",
          content: chapter?.description ?? "Rootorial interactive chapter",
        },
        ...(noindex
          ? [{ name: "robots", content: "noindex, follow" }]
          : []),
      ],
    };
  },
  component: ChapterRoute,
});

function ChapterRoute() {
  const { curriculumSlug, chapterSlug } = Route.useParams();
  const { publication, reach } = Route.useLoaderData();
  const ChapterPage = getChapterPage(curriculumSlug, chapterSlug);
  if (!ChapterPage) throw notFound();
  const chapterKo = publication.curriculum.chapters.ko.find(
    (chapter) => chapter.slug === chapterSlug,
  )!;
  const chapterEn = publication.curriculum.chapters.en.find(
    (chapter) => chapter.slug === chapterSlug,
  )!;
  const metadata = {
    ko: {
      title: `${String(chapterKo.number).padStart(2, "0")}. ${chapterKo.title} · Rootorial`,
      description: chapterKo.description,
    },
    en: {
      title: `${String(chapterEn.number).padStart(2, "0")}. ${chapterEn.title} · Rootorial`,
      description: chapterEn.description,
    },
  };

  return (
    <>
      <PageMetadataSync metadata={metadata} />
      <CourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
        <LearningAnalyticsProvider curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
          <ChapterPage
            curriculumSlug={curriculumSlug}
            chapterSlug={chapterSlug}
            learnerCount={reach.chapters[chapterSlug]?.learners ?? 0}
            navigation={publication.navigation}
          />
        </LearningAnalyticsProvider>
      </CourseAccessTracker>
    </>
  );
}

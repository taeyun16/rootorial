import { createFileRoute, notFound } from "@tanstack/react-router";
import { LearningAnalyticsProvider } from "../components/LearningAnalyticsProvider";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { getChapterPage } from "../features/chapters/chapter-pages";
import { getPublishedChapter } from "../features/chapters/chapter-registry";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";
import {
  chapterPageMetadata,
  localeFromLanguage,
} from "../features/localization/page-metadata";

export const Route = createFileRoute("/curricula/$curriculumSlug_/chapters/$chapterSlug")({
  beforeLoad: ({ params }) => {
    const published = getPublishedChapter(params.curriculumSlug, params.chapterSlug);
    if (!published || !getChapterPage(params.curriculumSlug, params.chapterSlug)) {
      throw notFound();
    }
    return published;
  },
  loader: ({ params }) => getCurriculumReach({ data: { curriculumSlug: params.curriculumSlug } }),
  head: ({ match }) => {
    const metadata = chapterPageMetadata(
      match.params.curriculumSlug,
      match.params.chapterSlug,
      localeFromLanguage((match.search as { lang?: unknown }).lang),
    );
    return {
      meta: [
        { title: metadata?.title ?? "Rootorial" },
        { name: "description", content: metadata?.description ?? "Rootorial interactive chapter" },
      ],
    };
  },
  component: ChapterRoute,
});

function ChapterRoute() {
  const { curriculumSlug, chapterSlug } = Route.useParams();
  const reach = Route.useLoaderData();
  const ChapterPage = getChapterPage(curriculumSlug, chapterSlug);
  if (!ChapterPage) throw notFound();

  return (
    <CourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
      <LearningAnalyticsProvider curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
        <ChapterPage
          curriculumSlug={curriculumSlug}
          chapterSlug={chapterSlug}
          learnerCount={reach.chapters[chapterSlug]?.learners ?? 0}
        />
      </LearningAnalyticsProvider>
    </CourseAccessTracker>
  );
}

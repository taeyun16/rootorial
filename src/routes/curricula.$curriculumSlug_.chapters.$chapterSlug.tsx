import { createFileRoute, notFound } from "@tanstack/react-router";
import { lazy, Suspense } from "react";
import { getCurriculum } from "../data/curriculum";
import { LearningAnalyticsProvider } from "../components/LearningAnalyticsProvider";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";
import { useLocale } from "../features/localization/localization";

const VectorsChapter = lazy(() => import("../components/VectorsChapter").then((module) => ({
  default: module.VectorsChapter,
})));
const LinuxShellChapter = lazy(() => import("../components/linux/LinuxShellChapter").then((module) => ({
  default: module.LinuxShellChapter,
})));

function ChapterLoading() {
  const { locale } = useLocale();
  return (
    <main className="chapter-shell chapter-loading" aria-busy="true">
      <p role="status">{locale === "ko" ? "챕터를 불러오는 중입니다…" : "Loading the chapter…"}</p>
    </main>
  );
}

export const Route = createFileRoute("/curricula/$curriculumSlug_/chapters/$chapterSlug")({
  beforeLoad: ({ params }) => {
    const curriculum = getCurriculum(params.curriculumSlug);
    const chapter = curriculum?.chapters.ko.find(({ slug }) => slug === params.chapterSlug);
    if (!curriculum || !chapter || chapter.status !== "available") throw notFound();
    return { curriculum, chapter };
  },
  loader: ({ params }) => getCurriculumReach({ data: { curriculumSlug: params.curriculumSlug } }),
  head: ({ match }) => {
    const locale = (match.search as { lang?: unknown }).lang === "en" ? "en" : "ko";
    const curriculum = getCurriculum(match.params.curriculumSlug);
    const chapter = curriculum?.chapters[locale].find(({ slug }) => slug === match.params.chapterSlug);
    return {
      meta: [
        { title: chapter ? `${String(chapter.number).padStart(2, "0")}. ${chapter.title} · Rootorial` : "Rootorial" },
        { name: "description", content: chapter?.description ?? curriculum?.summary[locale] ?? "Rootorial interactive chapter" },
      ],
    };
  },
  component: ChapterRoute,
});

function ChapterRoute() {
  const { curriculumSlug, chapterSlug } = Route.useParams();
  const reach = Route.useLoaderData();
  if (curriculumSlug === "transformer-from-zero" && chapterSlug === "vectors") {
    return (
      <CourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
        <LearningAnalyticsProvider curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
          <Suspense fallback={<ChapterLoading />}>
            <VectorsChapter learnerCount={reach.chapters[chapterSlug]?.learners ?? 0} />
          </Suspense>
        </LearningAnalyticsProvider>
      </CourseAccessTracker>
    );
  }
  if (curriculumSlug === "linux-systems" && chapterSlug === "shell-and-filesystem") {
    return (
      <CourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
        <LearningAnalyticsProvider curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>
          <Suspense fallback={<ChapterLoading />}>
            <LinuxShellChapter learnerCount={reach.chapters[chapterSlug]?.learners ?? 0} />
          </Suspense>
        </LearningAnalyticsProvider>
      </CourseAccessTracker>
    );
  }
  throw notFound();
}

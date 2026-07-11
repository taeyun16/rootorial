import { createFileRoute, notFound } from "@tanstack/react-router";
import { getCurriculum } from "../data/curriculum";
import { VectorsChapter } from "../components/VectorsChapter";

export const Route = createFileRoute("/curricula/$curriculumSlug_/chapters/$chapterSlug")({
  beforeLoad: ({ params }) => {
    const curriculum = getCurriculum(params.curriculumSlug);
    const chapter = curriculum?.chapters.ko.find(({ slug }) => slug === params.chapterSlug);
    if (!curriculum || !chapter || chapter.status !== "available") throw notFound();
    return { curriculum, chapter };
  },
  head: ({ match }) => {
    const curriculum = getCurriculum(match.params.curriculumSlug);
    const chapter = curriculum?.chapters.ko.find(({ slug }) => slug === match.params.chapterSlug);
    return {
      meta: [
        { title: chapter ? `${String(chapter.number).padStart(2, "0")}. ${chapter.title} · Rootorial` : "Rootorial" },
        { name: "description", content: chapter?.description ?? curriculum?.summary.ko ?? "Rootorial 인터랙티브 챕터" },
      ],
    };
  },
  component: ChapterRoute,
});

function ChapterRoute() {
  const { curriculumSlug, chapterSlug } = Route.useParams();
  if (curriculumSlug === "transformer-from-zero" && chapterSlug === "vectors") {
    return <VectorsChapter />;
  }
  throw notFound();
}

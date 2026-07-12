import { createFileRoute, notFound } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { getCurriculum } from "../data/curriculum";

export const Route = createFileRoute("/curricula/$curriculumSlug")({
  beforeLoad: ({ params }) => {
    const curriculum = getCurriculum(params.curriculumSlug);
    if (!curriculum || curriculum.status === "planned") throw notFound();
    return { curriculum };
  },
  head: ({ match }) => {
    const curriculum = getCurriculum(match.params.curriculumSlug);
    return {
      meta: [
        { title: `${curriculum?.title.ko ?? "커리큘럼"} · Rootorial` },
        { name: "description", content: curriculum?.summary.ko ?? "Rootorial 인터랙티브 커리큘럼" },
      ],
    };
  },
  component: CurriculumRoute,
});

function CurriculumRoute() {
  const { curriculumSlug } = Route.useParams();
  return <CourseAccessTracker curriculumSlug={curriculumSlug}><CurriculumHome curriculumSlug={curriculumSlug} /></CourseAccessTracker>;
}

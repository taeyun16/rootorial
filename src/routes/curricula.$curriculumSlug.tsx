import { createFileRoute, notFound } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { getCurriculum } from "../data/curriculum";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";

export const Route = createFileRoute("/curricula/$curriculumSlug")({
  beforeLoad: ({ params }) => {
    const curriculum = getCurriculum(params.curriculumSlug);
    if (!curriculum || curriculum.status === "planned") throw notFound();
    return { curriculum };
  },
  loader: ({ params }) => getCurriculumReach({ data: { curriculumSlug: params.curriculumSlug } }),
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
  return <CourseAccessTracker curriculumSlug={curriculumSlug}><CurriculumHome curriculumSlug={curriculumSlug} reach={Route.useLoaderData()} /></CourseAccessTracker>;
}

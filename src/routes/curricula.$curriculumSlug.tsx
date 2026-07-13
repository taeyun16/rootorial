import { createFileRoute, notFound } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { getCurriculum } from "../data/curriculum";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";
import {
  curriculumPageMetadata,
  localeFromLanguage,
} from "../features/localization/page-metadata";

export const Route = createFileRoute("/curricula/$curriculumSlug")({
  beforeLoad: ({ params }) => {
    const curriculum = getCurriculum(params.curriculumSlug);
    if (!curriculum || curriculum.status === "planned") throw notFound();
    return { curriculum };
  },
  loader: ({ params }) => getCurriculumReach({ data: { curriculumSlug: params.curriculumSlug } }),
  head: ({ match }) => {
    const metadata = curriculumPageMetadata(
      match.params.curriculumSlug,
      localeFromLanguage((match.search as { lang?: unknown }).lang),
    );
    return {
      meta: [
        { title: metadata?.title ?? "Rootorial" },
        { name: "description", content: metadata?.description ?? "Rootorial interactive curriculum" },
      ],
    };
  },
  component: CurriculumRoute,
});

function CurriculumRoute() {
  const { curriculumSlug } = Route.useParams();
  return <CourseAccessTracker curriculumSlug={curriculumSlug}><CurriculumHome curriculumSlug={curriculumSlug} reach={Route.useLoaderData()} /></CourseAccessTracker>;
}

import { createFileRoute, notFound } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";
import { CourseAccessTracker } from "../components/CourseAccessTracker";
import { PageMetadataSync } from "../components/PageMetadataSync";
import { getCurriculumReach } from "../features/learning-analytics/learning-analytics.functions";
import { localeFromLanguage } from "../features/localization/page-metadata";
import { getPublicCurriculumPublication } from "../features/publication/publication.functions";

export const Route = createFileRoute("/curricula/$curriculumSlug")({
  loader: async ({ params }) => {
    const item = await getPublicCurriculumPublication({
      data: { curriculumSlug: params.curriculumSlug },
    });
    if (!item) throw notFound();
    const reach = await getCurriculumReach({
      data: { curriculumSlug: params.curriculumSlug },
    });
    return { item, reach };
  },
  head: ({ loaderData, match }) => {
    const locale = localeFromLanguage(
      (match.search as { lang?: unknown }).lang,
    );
    const curriculum = loaderData?.item.curriculum;
    const noindex = loaderData?.item.publication.listing === "unlisted";
    return {
      meta: [
        {
          title: curriculum
            ? `${curriculum.title[locale]} · Rootorial`
            : "Rootorial",
        },
        {
          name: "description",
          content:
            curriculum?.summary[locale] ?? "Rootorial interactive curriculum",
        },
        ...(noindex
          ? [{ name: "robots", content: "noindex, follow" }]
          : []),
      ],
    };
  },
  component: CurriculumRoute,
});

function CurriculumRoute() {
  const { curriculumSlug } = Route.useParams();
  const { item, reach } = Route.useLoaderData();
  const metadata = {
    ko: {
      title: `${item.curriculum.title.ko} · Rootorial`,
      description: item.curriculum.summary.ko,
    },
    en: {
      title: `${item.curriculum.title.en} · Rootorial`,
      description: item.curriculum.summary.en,
    },
  };
  return (
    <>
      <PageMetadataSync metadata={metadata} />
      <CourseAccessTracker curriculumSlug={curriculumSlug}>
        <CurriculumHome item={item} reach={reach} />
      </CourseAccessTracker>
    </>
  );
}

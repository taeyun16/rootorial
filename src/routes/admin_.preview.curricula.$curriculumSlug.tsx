import { createFileRoute, notFound } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";
import { PageMetadataSync } from "../components/PageMetadataSync";
import {
  PublicationPreviewBanner,
  PublicationPreviewProvider,
} from "../components/PublicationPreview";
import { chapterPublicationKey } from "../features/publication/publication";
import { getAdminPublicationPreview } from "../features/publication/publication.functions";
import { useLocale } from "../features/localization/localization";

export const Route = createFileRoute(
  "/admin_/preview/curricula/$curriculumSlug",
)({
  loader: async ({ params }) => {
    const preview = await getAdminPublicationPreview({
      data: { curriculumSlug: params.curriculumSlug, chapterSlug: null },
    });
    if (!preview) throw notFound();
    const chapters = preview.curriculum.chapters.ko.flatMap((chapter) => {
      const publication =
        preview.catalog.resources[
          chapterPublicationKey(preview.curriculum.slug, chapter.slug)
        ];
      return publication ? [{ chapter, publication }] : [];
    });
    return {
      item: {
        curriculum: preview.curriculum,
        publication: preview.resource,
        chapters,
      },
      accessMode: preview.accessMode,
    };
  },
  head: ({ loaderData }) => ({
    meta: [
      {
        title: loaderData
          ? `[미리보기] ${loaderData.item.curriculum.title.ko} · Rootorial`
          : "Rootorial",
      },
      {
        name: "description",
        content: loaderData?.item.curriculum.summary.ko ?? "Rootorial preview",
      },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: CurriculumPreviewRoute,
});

function CurriculumPreviewRoute() {
  const { item, accessMode } = Route.useLoaderData();
  const { locale } = useLocale();
  const metadata = {
    ko: {
      title: `[미리보기] ${item.curriculum.title.ko} · Rootorial`,
      description: item.curriculum.summary.ko,
    },
    en: {
      title: `[Preview] ${item.curriculum.title.en} · Rootorial`,
      description: item.curriculum.summary.en,
    },
  };
  const reach = {
    curriculumSlug: item.curriculum.slug,
    learners: 0,
    views: 0,
    chapters: {},
  };
  return (
    <PublicationPreviewProvider>
      <PageMetadataSync metadata={metadata} />
      <PublicationPreviewBanner
        title={item.curriculum.title[locale]}
        publicHref={`/curricula/${item.curriculum.slug}`}
        localDevelopment={accessMode === "local-development"}
      />
      <CurriculumHome item={item} reach={reach} preview />
    </PublicationPreviewProvider>
  );
}

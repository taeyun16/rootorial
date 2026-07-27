import { createFileRoute, notFound } from "@tanstack/react-router";
import { PageMetadataSync } from "../components/PageMetadataSync";
import {
  PublicationPreviewBanner,
  PublicationPreviewProvider,
} from "../components/PublicationPreview";
import { getChapterPage } from "../features/chapters/chapter-pages";
import { buildChapterNavigationAccess } from "../features/chapters/chapter-navigation";
import { getAdminPublicationPreview } from "../features/publication/publication.functions";
import { useLocale } from "../features/localization/localization";

export const Route = createFileRoute(
  "/admin_/preview/curricula/$curriculumSlug_/chapters/$chapterSlug",
)({
  loader: async ({ params }) => {
    if (!getChapterPage(params.curriculumSlug, params.chapterSlug)) {
      throw notFound();
    }
    const preview = await getAdminPublicationPreview({
      data: {
        curriculumSlug: params.curriculumSlug,
        chapterSlug: params.chapterSlug,
      },
    });
    if (!preview) throw notFound();
    return preview;
  },
  head: ({ loaderData, match }) => {
    const chapter = loaderData?.curriculum.chapters.ko.find(
      (candidate) => candidate.slug === match.params.chapterSlug,
    );
    return {
      meta: [
        {
          title: chapter
            ? `[미리보기] ${String(chapter.number).padStart(2, "0")}. ${chapter.title} · Rootorial`
            : "Rootorial",
        },
        {
          name: "description",
          content: chapter?.description ?? "Rootorial preview",
        },
        { name: "robots", content: "noindex, nofollow" },
      ],
    };
  },
  component: ChapterPreviewRoute,
});

function ChapterPreviewRoute() {
  const { curriculumSlug, chapterSlug } = Route.useParams();
  const { accessMode, catalog, curriculum } = Route.useLoaderData();
  const { locale } = useLocale();
  const ChapterPage = getChapterPage(curriculumSlug, chapterSlug);
  if (!ChapterPage) throw notFound();
  const chapterKo = curriculum.chapters.ko.find(
    (chapter) => chapter.slug === chapterSlug,
  )!;
  const chapterEn = curriculum.chapters.en.find(
    (chapter) => chapter.slug === chapterSlug,
  )!;
  const metadata = {
    ko: {
      title: `[미리보기] ${String(chapterKo.number).padStart(2, "0")}. ${chapterKo.title} · Rootorial`,
      description: chapterKo.description,
    },
    en: {
      title: `[Preview] ${String(chapterEn.number).padStart(2, "0")}. ${chapterEn.title} · Rootorial`,
      description: chapterEn.description,
    },
  };

  return (
    <PublicationPreviewProvider>
      <PageMetadataSync metadata={metadata} />
      <PublicationPreviewBanner
        title={`${String(chapterKo.number).padStart(2, "0")}. ${locale === "ko" ? chapterKo.title : chapterEn.title}`}
        publicHref={`/curricula/${curriculumSlug}/chapters/${chapterSlug}`}
        localDevelopment={accessMode === "local-development"}
      />
      <ChapterPage
        curriculumSlug={curriculumSlug}
        chapterSlug={chapterSlug}
        learnerCount={0}
        navigation={buildChapterNavigationAccess(catalog, true)}
      />
    </PublicationPreviewProvider>
  );
}

import { createFileRoute, notFound } from "@tanstack/react-router";
import { LocalContentPreviewCatalog } from "../components/LocalContentPreviewCatalog";
import { getLocalContentPreviewCatalog } from "../features/publication/publication.functions";

export const Route = createFileRoute("/admin_/preview/curricula/")({
  loader: async () => {
    const catalog = await getLocalContentPreviewCatalog();
    if (!catalog) throw notFound();
    return catalog;
  },
  head: () => ({
    meta: [
      { title: "로컬 커리큘럼 감사 · Rootorial" },
      { name: "description", content: "Rootorial 전체 커리큘럼 로컬 감사 인덱스" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: LocalContentPreviewRoute,
});

function LocalContentPreviewRoute() {
  return <LocalContentPreviewCatalog catalog={Route.useLoaderData()} />;
}

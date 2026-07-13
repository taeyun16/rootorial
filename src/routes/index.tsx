import { createFileRoute } from "@tanstack/react-router";
import { PlatformHome } from "../components/PlatformHome";
import { getPlatformReach } from "../features/learning-analytics/learning-analytics.functions";
import { getPublicPublicationCatalog } from "../features/publication/publication.functions";
import {
  localeFromLanguage,
  platformPageMetadata,
} from "../features/localization/page-metadata";

export const Route = createFileRoute("/")({
  loader: async () => {
    const [reach, catalog] = await Promise.all([
      getPlatformReach(),
      getPublicPublicationCatalog(),
    ]);
    return { reach, catalog };
  },
  head: ({ match }) => {
    const metadata = platformPageMetadata(
      localeFromLanguage((match.search as { lang?: unknown }).lang),
    );

    return {
      meta: [
        { title: metadata.title },
        { name: "description", content: metadata.description },
      ],
    };
  },
  component: Home,
});

function Home() {
  const { reach, catalog } = Route.useLoaderData();
  return <PlatformHome reach={reach} catalog={catalog} />;
}

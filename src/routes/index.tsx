import { createFileRoute } from "@tanstack/react-router";
import { PlatformHome } from "../components/PlatformHome";
import { getPlatformReach } from "../features/learning-analytics/learning-analytics.functions";
import {
  localeFromLanguage,
  platformPageMetadata,
} from "../features/localization/page-metadata";

export const Route = createFileRoute("/")({
  loader: () => getPlatformReach(),
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
  return <PlatformHome reach={Route.useLoaderData()} />;
}

import { createFileRoute } from "@tanstack/react-router";
import { PlatformHome } from "../components/PlatformHome";
import { getPlatformReach } from "../features/learning-analytics/learning-analytics.functions";

export const Route = createFileRoute("/")({
  loader: () => getPlatformReach(),
  head: ({ match }) => {
    const isEnglish = (match.search as { lang?: unknown }).lang === "en";

    return {
      meta: [
        {
          title: isEnglish
            ? "Rootorial — Technology, understood from the root."
            : "Rootorial — 복잡한 기술을 바닥부터.",
        },
        {
          name: "description",
          content: isEnglish
            ? "Interactive curricula for understanding AI, systems, infrastructure, and software design from the ground up."
            : "AI, Linux 시스템, 인프라 설계와 소프트웨어 패턴을 직접 움직이고 실행하며 바닥부터 이해합니다.",
        },
      ],
    };
  },
  component: Home,
});

function Home() {
  return <PlatformHome reach={Route.useLoaderData()} />;
}

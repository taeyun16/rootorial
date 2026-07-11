import { createFileRoute } from "@tanstack/react-router";
import { CurriculumHome } from "../components/CurriculumHome";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      {
        title: "Re:Zero — Transformer를 바닥부터 이해하는 인터랙티브 교과서",
      },
      {
        name: "description",
        content:
          "벡터와 경사하강법부터 Attention과 Mini Transformer까지, 브라우저에서 직접 움직이고 실행하며 배우는 딥러닝 커리큘럼입니다.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  return <CurriculumHome />;
}

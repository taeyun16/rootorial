import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
} from "@tanstack/react-router";
import appCss from "../styles/globals.css?url";
import { ClerkBoundary } from "../components/ClerkBoundary";
import { ProgressProvider } from "../components/ProgressProvider";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "Re:Zero — Transformer를 바닥부터",
      },
      {
        name: "description",
        content:
          "수학적 직관, 실행 가능한 코드, 인터랙티브 시각화로 Transformer를 바닥부터 이해하는 교과서.",
      },
    ],
    links: [{ rel: "stylesheet", href: appCss }],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <HeadContent />
      </head>
      <body>
        <ClerkBoundary>
          <ProgressProvider>{children}</ProgressProvider>
        </ClerkBoundary>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  return (
    <main className="not-found">
      <p className="eyebrow">404 · PAGE NOT FOUND</p>
      <h1>아직 준비되지 않은 페이지입니다.</h1>
      <Link className="button button-primary" to="/">
        커리큘럼으로 돌아가기
      </Link>
    </main>
  );
}

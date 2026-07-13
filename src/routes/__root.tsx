import {
  HeadContent,
  Link,
  Scripts,
  createRootRoute,
  useRouterState,
} from "@tanstack/react-router";
import appCss from "../styles/globals.css?url";
import { ClerkBoundary } from "../components/ClerkBoundary";
import { ContentFeedback } from "../components/ContentFeedback";
import { ProgressProvider } from "../components/ProgressProvider";
import { PageMetadataSync } from "../components/PageMetadataSync";
import {
  LocalizationProvider,
  localeFromSearch,
  useLocale,
} from "../features/localization/localization";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      {
        name: "viewport",
        content: "width=device-width, initial-scale=1, viewport-fit=cover",
      },
      {
        title: "Rootorial — 복잡한 기술을 바닥부터.",
      },
      {
        name: "description",
        content:
          "AI, 시스템, 인프라와 소프트웨어 설계를 직접 움직이고 실행하며 바닥부터 이해하는 인터랙티브 커리큘럼.",
      },
    ],
    links: [
      { rel: "stylesheet", href: appCss },
      { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" },
    ],
  }),
  notFoundComponent: NotFound,
  shellComponent: RootDocument,
});

function RootDocument({ children }: { children: React.ReactNode }) {
  const search = useRouterState({ select: (state) => state.location.searchStr });
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const documentLocale = localeFromSearch(search) ?? "ko";

  return (
    <html lang={documentLocale} suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body>
        <LocalizationProvider>
          <ClerkBoundary>
            <ProgressProvider>
              {children}
              {!pathname.startsWith("/admin") && <ContentFeedback />}
            </ProgressProvider>
          </ClerkBoundary>
        </LocalizationProvider>
        <Scripts />
      </body>
    </html>
  );
}

function NotFound() {
  const { locale } = useLocale();
  return (
    <>
      <PageMetadataSync
        metadata={{
          ko: {
            title: "페이지를 찾을 수 없음 · Rootorial",
            description: "요청한 Rootorial 페이지를 찾을 수 없습니다.",
          },
          en: {
            title: "Page not found · Rootorial",
            description: "The requested Rootorial page could not be found.",
          },
        }}
      />
      <main className="not-found">
        <p className="eyebrow">404 · PAGE NOT FOUND</p>
        <h1>{locale === "ko" ? "아직 준비되지 않은 페이지입니다." : "This page is not ready yet."}</h1>
        <Link className="button button-primary" to="/">
          {locale === "ko" ? "커리큘럼 홈으로" : "Back to curricula"}
        </Link>
      </main>
    </>
  );
}

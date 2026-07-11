import { Link } from "@tanstack/react-router";
import { curricula } from "../data/curriculum";
import { useLocale } from "../features/localization/localization";
import { AuthControls } from "./AuthControls";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useProgress } from "./ProgressProvider";
import { RootorialMark } from "./RootorialMark";

const brand = {
  name: "Rootorial",
  taglineEn: "Technology, understood from the root.",
  taglineKo: "복잡한 기술을 바닥부터.",
} as const;

const socialLinks = [
  {
    label: "X",
    handle: "@taeyun16_",
    href: "https://x.com/taeyun16_",
    icon: "x",
  },
  {
    label: "GitHub",
    handle: "@taeyun16",
    href: "https://github.com/taeyun16",
    icon: "github",
  },
  {
    label: "LinkedIn",
    handle: "taeyun16",
    href: "https://www.linkedin.com/in/taeyun16/",
    icon: "linkedin",
  },
] as const;

const copy = {
  ko: {
    home: "Rootorial 홈",
    nav: "커리큘럼 탐색",
    method: "학습 방식",
    eyebrow: "INTERACTIVE TECHNOLOGY CURRICULA",
    summary: "직접 움직이고 실행하며, 어려운 기술을 이해 가능한 순서로 다시 조립합니다.",
    start: "첫 챕터 바로 시작",
    explore: "커리큘럼 살펴보기",
    continue: "Transformer 이어서 학습",
    social: "Taeyun Jang의 소셜 계정",
    madeBy: "만든 사람",
    opensNewTab: "새 탭에서 열기",
    mapCaption: "FIRST PRINCIPLES · FOUR LEARNING PATHS",
    catalog: "CURRICULUM CATALOG",
    catalogTitle: "무엇을 바닥부터 이해하고 싶나요?",
    catalogSummary: "각 커리큘럼은 하나의 완결된 학습 여정입니다. 필요한 배경부터 실제로 작동하는 구조까지 한 단계씩 연결합니다.",
    available: "학습 가능",
    building: "제작 중",
    planned: "준비 중",
    chapters: "개 챕터",
    open: "커리큘럼 보기",
    roadmap: "NEXT ON THE ROADMAP",
    roadmapTitle: "다음으로 준비하고 있어요",
    roadmapSummary: "Rootorial의 다음 학습 여정입니다. 공개 전까지 현재 Transformer 커리큘럼을 계속 확장합니다.",
    philosophy: "ROOTORIAL METHOD",
    philosophyTitle: "읽고 끝나는 설명이 아니라, 이해가 남는 경험",
    principles: [
      ["직관부터", "그림과 조작으로 변화의 방향을 먼저 봅니다."],
      ["직접 실행", "코드와 실험을 바로 바꾸며 예측과 결과를 비교합니다."],
      ["구조로 연결", "개별 개념이 전체 시스템에서 맡는 역할까지 추적합니다."],
    ],
    follow: "FOLLOW THE WORK",
    followTitle: "배운 것을 만들고,\n만든 것을 다시 나눕니다.",
    followSummary: "새로운 커리큘럼과 실험 기록은 X, GitHub와 LinkedIn에 가장 먼저 공개합니다.",
  },
  en: {
    home: "Rootorial home",
    nav: "Explore curricula",
    method: "Learning method",
    eyebrow: "INTERACTIVE TECHNOLOGY CURRICULA",
    summary: "Move, run, and rebuild difficult technology into an order you can understand.",
    start: "Start the first chapter",
    explore: "Explore curricula",
    continue: "Continue Transformers",
    social: "Taeyun Jang's social accounts",
    madeBy: "Created by",
    opensNewTab: "opens in a new tab",
    mapCaption: "FIRST PRINCIPLES · FOUR LEARNING PATHS",
    catalog: "CURRICULUM CATALOG",
    catalogTitle: "What do you want to understand from zero?",
    catalogSummary: "Each curriculum is a complete learning journey, connecting the background you need to a structure that actually works.",
    available: "Available",
    building: "In progress",
    planned: "Planned",
    chapters: "chapters",
    open: "View curriculum",
    roadmap: "NEXT ON THE ROADMAP",
    roadmapTitle: "What we're preparing next",
    roadmapSummary: "These are the next Rootorial learning journeys. Until they launch, we'll keep expanding the current Transformer curriculum.",
    philosophy: "ROOTORIAL METHOD",
    philosophyTitle: "An experience that leaves understanding behind",
    principles: [
      ["Intuition first", "See the direction of change through diagrams and direct manipulation."],
      ["Run it yourself", "Change code and experiments, then compare predictions with results."],
      ["Connect the system", "Trace the role each concept plays in the complete structure."],
    ],
    follow: "FOLLOW THE WORK",
    followTitle: "Learn it, build it,\nthen share it forward.",
    followSummary: "New curricula and experiments are shared first on X, GitHub, and LinkedIn.",
  },
} as const;

function SocialMark({ icon }: { icon: (typeof socialLinks)[number]["icon"] }) {
  if (icon === "linkedin") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.34V8.98h3.41v1.57h.05c.47-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.29ZM5.32 7.41a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13Zm1.78 13.04H3.54V8.98H7.1v11.47Z" />
      </svg>
    );
  }

  if (icon === "github") {
    return (
      <svg aria-hidden="true" viewBox="0 0 24 24">
        <path d="M12 .7a11.5 11.5 0 0 0-3.64 22.4c.58.1.79-.25.79-.56v-2.02c-3.22.7-3.9-1.37-3.9-1.37-.53-1.34-1.29-1.7-1.29-1.7-1.05-.72.08-.71.08-.71 1.17.08 1.78 1.2 1.78 1.2 1.04 1.78 2.72 1.27 3.38.97.1-.75.4-1.27.74-1.56-2.57-.3-5.27-1.29-5.27-5.69 0-1.26.45-2.29 1.2-3.1-.12-.3-.52-1.47.11-3.06 0 0 .98-.31 3.16 1.18a10.96 10.96 0 0 1 5.76 0c2.18-1.49 3.16-1.18 3.16-1.18.63 1.59.23 2.77.11 3.06.74.81 1.2 1.84 1.2 3.1 0 4.42-2.71 5.39-5.29 5.68.42.36.79 1.06.79 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 12 .7Z" />
      </svg>
    );
  }

  return (
    <svg aria-hidden="true" viewBox="0 0 24 24">
      <path d="M18.9 2h3.68l-8.04 9.19L24 22h-7.4l-5.8-7.58L4.18 22H.5l8.58-9.81L0 2h7.59l5.24 6.93L18.9 2Zm-1.29 18.1h2.04L6.48 3.8H4.29l13.32 16.3Z" />
    </svg>
  );
}

function SocialLink({
  link,
  opensNewTab,
  compact = false,
}: {
  link: (typeof socialLinks)[number];
  opensNewTab: string;
  compact?: boolean;
}) {
  return (
    <a
      className={compact ? "social-link social-link-compact" : "social-link"}
      href={link.href}
      target="_blank"
      rel="me noreferrer"
      aria-label={`${link.label} ${link.handle} · ${opensNewTab}`}
    >
      <SocialMark icon={link.icon} />
      {compact ? <span className="sr-only">{link.label} {link.handle}</span> : (
        <span><strong>{link.label}</strong><small>{link.handle}</small></span>
      )}
      <span className={compact ? "sr-only" : "social-link-arrow"} aria-hidden="true">↗</span>
    </a>
  );
}

export function PlatformHome() {
  const { locale } = useLocale();
  const { completed } = useProgress();
  const c = copy[locale];

  return (
    <div className="site-shell platform-home">
      <header className="topbar">
        <Link className="wordmark" to="/" aria-label={c.home}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">{brand.name}</span>
        </Link>
        <nav className="topnav" aria-label={locale === "ko" ? "주요 메뉴" : "Main navigation"}>
          <a href="#curricula">{c.nav}</a>
          <a href="#method">{c.method}</a>
          <span className="topnav-socials" role="group" aria-label={c.social}>
            {socialLinks.map((link) => <SocialLink key={link.href} link={link} opensNewTab={c.opensNewTab} compact />)}
          </span>
          <LanguageSwitcher />
          <AuthControls />
        </nav>
      </header>

      <main>
      <section className="platform-hero" aria-labelledby="platform-hero-title">
        <div className="platform-hero-copy">
          <p className="eyebrow">{c.eyebrow}</p>
          <h1 id="platform-hero-title">{brand.name}</h1>
          <div className="brand-promise">
            <p className="brand-tagline-en" lang="en">{brand.taglineEn}</p>
            {locale === "ko" ? (
              <p className="brand-tagline-ko" lang="ko">{brand.taglineKo}</p>
            ) : null}
          </div>
          <p className="hero-summary">{c.summary}</p>
          <div className="hero-actions">
            {completed.length > 0 ? (
              <Link
                className="button button-primary"
                to="/curricula/$curriculumSlug"
                params={{ curriculumSlug: "transformer-from-zero" }}
              >
                {c.continue} <span aria-hidden="true">↗</span>
              </Link>
            ) : (
              <Link
                className="button button-primary"
                to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                params={{ curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" }}
              >
                {c.start} <span aria-hidden="true">↗</span>
              </Link>
            )}
            <a className="text-link" href="#curricula">{c.explore} <span aria-hidden="true">↓</span></a>
          </div>
          <div className="creator-presence">
            <p className="creator-credit"><span>{c.madeBy}</span><strong>Taeyun Jang</strong></p>
            <div className="hero-social-links" role="group" aria-label={c.social}>
              {socialLinks.map((link) => <SocialLink key={link.href} link={link} opensNewTab={c.opensNewTab} />)}
            </div>
          </div>
        </div>
        <div className="platform-hero-visual" aria-hidden="true">
          <div className="platform-hero-map">
            <span className="map-sweep" />
            <RootorialMark className="map-origin" />
            <span className="map-node map-node-ai">AI</span>
            <span className="map-node map-node-linux">Linux</span>
            <span className="map-node map-node-infra">Infra</span>
            <span className="map-node map-node-design">Patterns</span>
          </div>
          <p className="map-caption">{c.mapCaption}</p>
        </div>
      </section>

      <section className="catalog-section" id="curricula" aria-labelledby="catalog-title">
        <div className="section-heading">
          <div>
            <p className="section-index">{c.catalog}</p>
            <h2 id="catalog-title">{c.catalogTitle}</h2>
          </div>
          <p>{c.catalogSummary}</p>
        </div>
        <div className="curriculum-grid">
          {curricula.filter((curriculum) => curriculum.status !== "planned").map((curriculum) => {
            const index = curricula.indexOf(curriculum);
            const chapters = curriculum.chapters[locale];
            const status = curriculum.status === "in-progress" ? c.building : c.available;
            const summaryId = `curriculum-${curriculum.id}-summary`;
            return (
              <Link
                className={`curriculum-card curriculum-card-${curriculum.accent}`}
                to="/curricula/$curriculumSlug"
                params={{ curriculumSlug: curriculum.slug }}
                aria-label={curriculum.title[locale]}
                aria-describedby={summaryId}
                key={curriculum.id}
              >
                <div className="curriculum-card-topline">
                  <span>{String(index + 1).padStart(2, "0")} · {curriculum.category[locale]}</span>
                  <span className={`curriculum-status status-${curriculum.status}`}>{status}</span>
                </div>
                <div>
                  <p className="curriculum-eyebrow">{curriculum.eyebrow[locale]}</p>
                  <h3>{curriculum.title[locale]}</h3>
                  <p id={summaryId}>{curriculum.summary[locale]}</p>
                </div>
                <div className="curriculum-card-footer">
                  <span>{chapters.length} {c.chapters}</span>
                  <strong>{c.open} ↗</strong>
                </div>
              </Link>
            );
          })}
        </div>

        <section className="curriculum-roadmap" aria-labelledby="curriculum-roadmap-title">
          <div className="curriculum-roadmap-heading">
            <div>
              <p className="section-index">{c.roadmap}</p>
              <h3 id="curriculum-roadmap-title">{c.roadmapTitle}</h3>
            </div>
            <p>{c.roadmapSummary}</p>
          </div>
          <div className="roadmap-grid">
            {curricula.filter((curriculum) => curriculum.status === "planned").map((curriculum) => {
              const index = curricula.indexOf(curriculum);
              return (
                <article className={`roadmap-card curriculum-card-${curriculum.accent}`} key={curriculum.id}>
                  <div className="curriculum-card-topline">
                    <span>{String(index + 1).padStart(2, "0")} · {curriculum.category[locale]}</span>
                    <span className="curriculum-status status-planned">{c.planned}</span>
                  </div>
                  <div>
                    <h4>{curriculum.title[locale]}</h4>
                    <p>{curriculum.summary[locale]}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      </section>

      <section className="platform-method" id="method" aria-labelledby="method-title">
        <p className="section-index">{c.philosophy}</p>
        <h2 id="method-title">{c.philosophyTitle}</h2>
        <div className="principle-grid">
          {c.principles.map(([title, body], index) => (
            <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><h3>{title}</h3><p>{body}</p></article>
          ))}
        </div>
      </section>
      </main>

      <footer className="platform-footer">
        <div>
          <p className="section-index">{c.follow}</p>
          <h2>{c.followTitle.split("\n").map((line) => <span key={line}>{line}</span>)}</h2>
        </div>
        <div className="platform-footer-action">
          <p>{c.followSummary}</p>
          <div className="footer-social-links" role="group" aria-label={c.social}>
            {socialLinks.map((link) => <SocialLink key={link.href} link={link} opensNewTab={c.opensNewTab} />)}
          </div>
        </div>
      </footer>
    </div>
  );
}

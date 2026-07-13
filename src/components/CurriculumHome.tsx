import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  getCurriculum,
  LINUX_CURRICULUM_SLUG,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../data/curriculum";
import { useLocale } from "../features/localization/localization";
import { AuthControls } from "./AuthControls";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useProgress } from "./ProgressProvider";
import { RootorialMark } from "./RootorialMark";
import { PublicLearningProof } from "./PublicLearningProof";
import type { PublicCurriculumReach } from "../features/learning-analytics/learning-analytics";

const copy = {
  ko: {
    home: "Rootorial 홈", menu: "주요 메뉴", curriculum: "커리큘럼", method: "학습 방식",
    runtime: "브라우저 실습", titleLead: "Transformer를", titleEm: "바닥부터", titleTail: "이해하기",
    summary: "공식을 외우기 전에 직접 움직여 보고, 코드를 복사하기 전에 브라우저에서 실행합니다. 벡터에서 시작해 Attention과 작은 Transformer까지 하나의 길로 연결합니다.",
    start: "첫 챕터 시작하기", journey: "전체 여정 보기", overview: "커리큘럼 개요",
    chapters: "CHAPTERS", progress: "나의 진도", totalProgress: "전체 진도",
    loading: "계정 진도를 불러오는 중입니다.", syncing: "계정에 진도를 저장하는 중입니다.",
    synced: "Clerk 계정에 안전하게 동기화됩니다.", error: "계정 동기화가 잠시 중단되었습니다.",
    local: "이 브라우저에 자동 저장됩니다.", retry: "다시 시도", principle: "학습 원칙",
    principleTitle: "읽는 지식을 움직이는 지식으로", intuition: "먼저 직관",
    intuitionBody: "슬라이더와 그림으로 변화의 방향을 본 뒤 수식을 만납니다.", run: "바로 실행",
    runBody: "설치 없이 Python과 NumPy 코드를 브라우저에서 바꿔 봅니다.", connection: "하나의 연결",
    connectionBody: "각 개념이 Transformer의 어느 부분으로 이어지는지 놓치지 않습니다.",
    main: "메인 커리큘럼", road: "0에서 Transformer까지",
    structure: "각 챕터는 직관, 시각화, 최소 수식, 코드 실습, 이해 확인으로 구성됩니다.",
    complete: "완료", planned: "준비 중", footer: "복잡한 개념을 한 단계씩, 실행 가능한 형태로.", top: "맨 위로 ↑",
  },
  en: {
    home: "Rootorial home", menu: "Main navigation", curriculum: "Curriculum", method: "How it works",
    runtime: "Browser labs", titleLead: "Understand", titleEm: "Transformers", titleTail: "from the ground up",
    summary: "Move ideas before memorizing formulas, and run code in the browser before copying it. Follow one continuous path from vectors to attention and a small Transformer.",
    start: "Start chapter one", journey: "See the full journey", overview: "Curriculum overview",
    chapters: "CHAPTERS", progress: "My progress", totalProgress: "Overall progress",
    loading: "Loading your account progress.", syncing: "Saving progress to your account.",
    synced: "Safely synced with your Clerk account.", error: "Account sync is temporarily unavailable.",
    local: "Automatically saved in this browser.", retry: "Try again", principle: "LEARNING PRINCIPLES",
    principleTitle: "Turn knowledge you read into knowledge you can use", intuition: "Intuition first",
    intuitionBody: "See the direction of change with sliders and diagrams before meeting the formula.", run: "Run it now",
    runBody: "Edit Python and NumPy code in the browser with nothing to install.", connection: "One connected path",
    connectionBody: "Always see where each concept fits into a Transformer.",
    main: "MAIN CURRICULUM", road: "From zero to Transformers",
    structure: "Every chapter combines intuition, visualization, minimal math, coding labs, and concept checks.",
    complete: "Complete", planned: "Coming soon", footer: "Complex ideas, one executable step at a time.", top: "Back to top ↑",
  },
} as const;

const linuxPresentation = {
  ko: {
    eyebrow: "INTERACTIVE LINUX SYSTEMS · SAMPLE",
    runtime: "교육용 셸 + 실제 VM",
    titleLead: "Linux 시스템을",
    titleEm: "바닥부터",
    titleTail: "이해하기",
    summary: "명령을 외우는 데서 멈추지 않고, 경로와 파일에서 시작해 부팅, 프로세스, 메모리와 네트워크까지 시스템의 층을 직접 관찰합니다.",
    start: "첫 샘플 챕터 시작하기",
    journey: "전체 여정 보기",
    overview: "Linux 시스템 커리큘럼 개요",
    principle: "학습 방식",
    principleTitle: "명령보다 먼저 시스템의 상태를 읽기",
    principles: [
      ["한 층씩 관찰", "프롬프트와 파일에서 시작해 커널과 네트워크까지 경계를 하나씩 확인합니다."],
      ["직접 실행", "설치 없이 교육용 셸을 반복하고, 필요한 순간 실제 Linux VM과 비교합니다."],
      ["오류를 단서로", "실패 메시지를 피하지 않고 권한, 경로와 프로세스 상태를 설명하는 증거로 읽습니다."],
    ],
    main: "LINUX SYSTEMS CURRICULUM",
    road: "첫 명령에서 작은 Linux 조립까지",
    structure: "첫 챕터는 완성된 샘플입니다. 후속 챕터는 셸에서 확인한 상태를 실제 커널의 각 층으로 확장합니다.",
    orbitLabels: ["Path", "Process", "Memory", "Network"],
  },
  en: {
    eyebrow: "INTERACTIVE LINUX SYSTEMS · SAMPLE",
    runtime: "Teaching shell + real VM",
    titleLead: "Understand Linux",
    titleEm: "from the ground up",
    titleTail: "",
    summary: "Go beyond memorizing commands. Start with paths and files, then observe each system layer through boot, processes, memory, and networking.",
    start: "Start the sample chapter",
    journey: "See the full journey",
    overview: "Linux systems curriculum overview",
    principle: "HOW IT WORKS",
    principleTitle: "Read system state before reaching for a command",
    principles: [
      ["Observe one layer", "Begin with prompts and files, then inspect each boundary through the kernel and network."],
      ["Run it yourself", "Repeat quickly in the teaching shell and compare against a real Linux VM when the whole machine matters."],
      ["Use errors as clues", "Treat failures as evidence about permissions, paths, and process state instead of avoiding them."],
    ],
    main: "LINUX SYSTEMS CURRICULUM",
    road: "From your first command to a tiny Linux system",
    structure: "The first chapter is a complete sample. Later chapters expand the same observable state into each layer of a real kernel.",
    orbitLabels: ["Path", "Process", "Memory", "Network"],
  },
} as const;

export function CurriculumHome({ curriculumSlug = TRANSFORMER_CURRICULUM_SLUG, reach }: { curriculumSlug?: string; reach: PublicCurriculumReach }) {
  const { completed, retry, status } = useProgress();
  const { locale } = useLocale();
  const c = copy[locale];
  const curriculum = getCurriculum(curriculumSlug);
  if (!curriculum) return null;
  const chapters = curriculum.chapters[locale];
  const firstAvailableChapter = chapters.find((chapter) => chapter.status === "available");
  const presentation = curriculum.slug === LINUX_CURRICULUM_SLUG
    ? linuxPresentation[locale]
    : {
        eyebrow: "INTERACTIVE DEEP LEARNING TEXTBOOK",
        runtime: c.runtime,
        titleLead: c.titleLead,
        titleEm: c.titleEm,
        titleTail: c.titleTail,
        summary: c.summary,
        start: c.start,
        journey: c.journey,
        overview: c.overview,
        principle: c.principle,
        principleTitle: c.principleTitle,
        principles: [
          [c.intuition, c.intuitionBody],
          [c.run, c.runBody],
          [c.connection, c.connectionBody],
        ] as const,
        main: c.main,
        road: c.road,
        structure: c.structure,
        orbitLabels: ["Vector", "Gradient", "Embedding", "Attention"] as const,
      };
  const completedInCurriculum = completed.filter((id) => id.startsWith(`${curriculum.slug}/`));

  const progress = useMemo(
    () => chapters.length ? Math.round((completedInCurriculum.length / chapters.length) * 100) : 0,
    [chapters.length, completedInCurriculum.length],
  );

  return (
    <main className="site-shell">
      <header className="topbar">
        <Link className="wordmark" to="/" search={locale === "en" ? { lang: "en" } : {}} aria-label={c.home}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <nav className="topnav" aria-label={c.menu}>
          <a href="#curriculum">{c.curriculum}</a>
          <a href="#how">{c.method}</a>
          <span className="runtime-status">
            <span className="status-dot" aria-hidden="true" /> {presentation.runtime}
          </span>
          <LanguageSwitcher />
          <AuthControls />
        </nav>
      </header>

      <section className="hero-section">
        <div className="hero-copy">
          <p className="eyebrow">{presentation.eyebrow}</p>
          <h1>
            {presentation.titleLead}
            <br />
            <em>{presentation.titleEm}</em>{presentation.titleTail ? ` ${presentation.titleTail}` : ""}
          </h1>
          <p className="hero-summary">
            {presentation.summary}
          </p>
          <PublicLearningProof count={reach.learners} locale={locale} scope="curriculum" />
          <div className="hero-actions">
            {firstAvailableChapter ? (
              <Link
                className="button button-primary"
                to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                params={{ curriculumSlug: curriculum.slug, chapterSlug: firstAvailableChapter.slug }}
                search={locale === "en" ? { lang: "en" } : {}}
              >
                {presentation.start} <span aria-hidden="true">→</span>
              </Link>
            ) : null}
            <a className="text-link" href="#curriculum">
              {presentation.journey}
            </a>
            {curriculum.experiment ? (
              <Link
                className="text-link"
                to={curriculum.experiment.href}
                search={locale === "en" ? { lang: "en" } : {}}
              >
                {curriculum.experiment.label[locale]} ↗
              </Link>
            ) : null}
          </div>
        </div>

        <div className="hero-visual" aria-label={presentation.overview}>
          <div className="concept-orbit">
            <div className="orbit-core">
              <span>{chapters.length}</span>
              <small>{c.chapters}</small>
            </div>
            <span className="orbit-label orbit-label-a">{presentation.orbitLabels[0]}</span>
            <span className="orbit-label orbit-label-b">{presentation.orbitLabels[1]}</span>
            <span className="orbit-label orbit-label-c">{presentation.orbitLabels[2]}</span>
            <span className="orbit-label orbit-label-d">{presentation.orbitLabels[3]}</span>
          </div>
          <div className="progress-card">
            <div>
              <span>{c.progress}</span>
              <strong>{progress}%</strong>
            </div>
            <div className="progress-track" aria-label={`${c.totalProgress} ${progress}%`}>
              <span style={{ width: `${progress}%` }} />
            </div>
            <small role="status">
              {status === "loading"
                ? c.loading
                : status === "syncing"
                  ? c.syncing
                  : status === "synced"
                    ? c.synced
                    : status === "error"
                      ? c.error
                      : c.local}
              {status === "error" ? (
                <>
                  {" "}
                  <button className="text-link" type="button" onClick={retry}>
                    {c.retry}
                  </button>
                </>
              ) : null}
            </small>
          </div>
        </div>
      </section>

      <section className="principles" id="how" aria-labelledby="how-title">
        <div>
          <p className="section-index">{presentation.principle}</p>
          <h2 id="how-title">{presentation.principleTitle}</h2>
        </div>
        <div className="principle-grid">
          {presentation.principles.map(([title, body], index) => (
            <article key={title}>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <h3>{title}</h3>
              <p>{body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="curriculum-section" id="curriculum" aria-labelledby="curriculum-title">
        <div className="section-heading">
          <div>
            <p className="section-index">{presentation.main}</p>
            <h2 id="curriculum-title">{presentation.road}</h2>
          </div>
          <p>
            {presentation.structure}
          </p>
        </div>

        <div className="chapter-list">
          {chapters.map((chapter) => {
            const isCompleted = completed.includes(chapter.id);
            const content = (
              <>
                <div className="chapter-number">
                  {String(chapter.number).padStart(2, "0")}
                </div>
                <div className="chapter-main">
                  <div className="chapter-kicker">
                    <span>{chapter.runtime}</span>
                    {chapter.estimatedMinutes ? (
                      <span>{locale === "ko" ? `약 ${chapter.estimatedMinutes}분` : `About ${chapter.estimatedMinutes} min`}</span>
                    ) : null}
                  </div>
                  <h3>{chapter.title}</h3>
                  <p className="chapter-subtitle">{chapter.subtitle}</p>
                  <p className="chapter-description">{chapter.description}</p>
                  <div className="concept-tags">
                    {chapter.concepts.map((concept) => (
                      <span key={concept}>{concept}</span>
                    ))}
                  </div>
                </div>
                <div className="chapter-action">
                  {isCompleted ? (
                    <span className="completion-badge">{c.complete}</span>
                  ) : chapter.status === "available" ? (
                    <span className="enter-mark" aria-hidden="true">↗</span>
                  ) : (
                    <span className="planned-badge">{c.planned}</span>
                  )}
                </div>
              </>
            );

            return chapter.status === "available" ? (
              <Link
                className="chapter-row chapter-row-active"
                to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                params={{ curriculumSlug: curriculum.slug, chapterSlug: chapter.slug }}
                search={locale === "en" ? { lang: "en" } : {}}
                key={chapter.slug}
              >
                {content}
              </Link>
            ) : (
              <article className="chapter-row" key={chapter.slug} aria-label={`${chapter.title}, ${c.planned}`}>
                {content}
              </article>
            );
          })}
        </div>
      </section>

      <footer className="site-footer">
        <div>
          <RootorialMark className="wordmark-mark" />
          <p>{c.footer}</p>
        </div>
        <a href="#top" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          {c.top}
        </a>
      </footer>
    </main>
  );
}

import { Link } from "@tanstack/react-router";
import { useMemo } from "react";
import {
  getCurriculum,
  INFRASTRUCTURE_CURRICULUM_SLUG,
  LINUX_CURRICULUM_SLUG,
  LINUX_NETWORKING_CURRICULUM_SLUG,
  SYSTEM_ARCHITECTURE_CURRICULUM_SLUG,
  TRANSFORMER_CURRICULUM_SLUG,
  type Curriculum,
  type Locale,
} from "../data/curriculum";
import { useLocale } from "../features/localization/localization";
import { AuthControls } from "./AuthControls";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { useProgress } from "./ProgressProvider";
import { RootorialMark } from "./RootorialMark";
import { PublicLearningProof } from "./PublicLearningProof";
import type { PublicCurriculumReach } from "../features/learning-analytics/learning-analytics";
import type { PublicCurriculumCatalogItem } from "../features/publication/publication";

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

type CurriculumPresentation = {
  eyebrow: string;
  runtime: string;
  titleLead: string;
  titleEm: string;
  titleTail: string;
  summary: string;
  start: string;
  journey: string;
  overview: string;
  principle: string;
  principleTitle: string;
  principles: readonly (readonly [string, string])[];
  main: string;
  road: string;
  structure: string;
  orbitLabels: readonly [string, string, string, string];
};

type LocalizedPresentation = Record<Locale, CurriculumPresentation>;

const transformerPresentation = {
  ko: {
    eyebrow: "INTERACTIVE DEEP LEARNING TEXTBOOK",
    runtime: copy.ko.runtime,
    titleLead: copy.ko.titleLead,
    titleEm: copy.ko.titleEm,
    titleTail: copy.ko.titleTail,
    summary: copy.ko.summary,
    start: copy.ko.start,
    journey: copy.ko.journey,
    overview: copy.ko.overview,
    principle: copy.ko.principle,
    principleTitle: copy.ko.principleTitle,
    principles: [
      [copy.ko.intuition, copy.ko.intuitionBody],
      [copy.ko.run, copy.ko.runBody],
      [copy.ko.connection, copy.ko.connectionBody],
    ],
    main: copy.ko.main,
    road: copy.ko.road,
    structure: copy.ko.structure,
    orbitLabels: ["Vector", "Gradient", "Embedding", "Attention"],
  },
  en: {
    eyebrow: "INTERACTIVE DEEP LEARNING TEXTBOOK",
    runtime: copy.en.runtime,
    titleLead: copy.en.titleLead,
    titleEm: copy.en.titleEm,
    titleTail: copy.en.titleTail,
    summary: copy.en.summary,
    start: copy.en.start,
    journey: copy.en.journey,
    overview: copy.en.overview,
    principle: copy.en.principle,
    principleTitle: copy.en.principleTitle,
    principles: [
      [copy.en.intuition, copy.en.intuitionBody],
      [copy.en.run, copy.en.runBody],
      [copy.en.connection, copy.en.connectionBody],
    ],
    main: copy.en.main,
    road: copy.en.road,
    structure: copy.en.structure,
    orbitLabels: ["Vector", "Gradient", "Embedding", "Attention"],
  },
} as const satisfies LocalizedPresentation;

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
} as const satisfies LocalizedPresentation;

const infrastructurePresentation = {
  ko: {
    eyebrow: "INTERACTIVE INFRASTRUCTURE DESIGN",
    runtime: "브라우저 인프라 모델 + 선택 Linux 관찰",
    titleLead: "Linux 네트워크 인프라를",
    titleEm: "바닥부터",
    titleTail: "설계하고 검증하기",
    summary: "namespace 경계에서 시작해 routing, 정책, 가용성과 용량을 조립하고, 각 설계 결정을 실행 가능한 증거로 확인합니다.",
    start: "첫 설계 챕터 시작하기",
    journey: "전체 설계 경로 보기",
    overview: "인프라 설계 커리큘럼 개요",
    principle: "설계 방식",
    principleTitle: "구성도보다 먼저 경계와 상태를 검증하기",
    principles: [
      ["경계부터 모델링", "프로세스, 인터페이스, route와 socket이 어느 경계에 속하는지 먼저 분리합니다."],
      ["경로를 직접 실행", "연결, 정책과 실패 상태를 결정론적 모델에서 바꾸고 실제 결과를 비교합니다."],
      ["증거로 결정", "ip, ss, packet path와 invariant를 설계 선택의 근거로 남깁니다."],
    ],
    main: "INFRASTRUCTURE DESIGN CURRICULUM",
    road: "namespace 경계에서 검증 가능한 플랫폼까지",
    structure: "각 장은 요구사항, 상태 모델, 실행 실습, 장애 진단과 설계 근거를 하나의 흐름으로 연결합니다.",
    orbitLabels: ["Boundary", "Route", "Policy", "Evidence"],
  },
  en: {
    eyebrow: "INTERACTIVE INFRASTRUCTURE DESIGN",
    runtime: "Browser infrastructure models + optional Linux observation",
    titleLead: "Design Linux network infrastructure",
    titleEm: "from the ground up",
    titleTail: "",
    summary: "Start with namespace boundaries, assemble routing, policy, availability, and capacity, then verify every design decision with executable evidence.",
    start: "Start the first design chapter",
    journey: "See the full design path",
    overview: "Infrastructure design curriculum overview",
    principle: "HOW TO DESIGN",
    principleTitle: "Verify boundaries and state before drawing the diagram",
    principles: [
      ["Model the boundary", "Separate which boundary owns each process, interface, route, and socket before connecting them."],
      ["Execute the path", "Change connectivity, policy, and failure state in deterministic models, then compare the actual result."],
      ["Decide from evidence", "Use ip, ss, packet paths, and invariants as the evidence behind each design choice."],
    ],
    main: "INFRASTRUCTURE DESIGN CURRICULUM",
    road: "From namespace boundaries to a verifiable platform",
    structure: "Each chapter joins requirements, a state model, executable practice, incident diagnosis, and design evidence into one path.",
    orbitLabels: ["Boundary", "Route", "Policy", "Evidence"],
  },
} as const satisfies LocalizedPresentation;

const linuxNetworkingPresentation = {
  ko: {
    eyebrow: "INTERACTIVE LINUX NETWORKING FOUNDATIONS",
    runtime: "브라우저 네트워크 모델 + 선택 Linux 관찰",
    titleLead: "Linux 네트워크를",
    titleEm: "바닥부터",
    titleTail: "이해하기",
    summary: "interface와 주소에서 시작해 subnet, route, socket, TCP와 DNS 경계를 한 hop씩 추적하고 실제 Linux 관측으로 연결합니다.",
    start: "첫 네트워크 챕터 시작하기",
    journey: "전체 네트워크 경로 보기",
    overview: "Linux 네트워크 기초 커리큘럼 개요",
    principle: "학습 방식",
    principleTitle: "명령어보다 먼저 한 packet의 경로를 읽기",
    principles: [
      ["한 경계씩 추적", "호스트의 interface에서 link와 router를 지나 peer application까지 상태를 나눠 봅니다."],
      ["주소 역할 분리", "이름, IP, MAC, port와 next hop이 각각 어떤 범위의 결정을 내리는지 구분합니다."],
      ["관측으로 확인", "ip, ss, ping과 packet capture가 어디까지 사실을 증명하는지 비교합니다."],
    ],
    main: "LINUX NETWORKING FOUNDATIONS",
    road: "interface와 주소에서 서비스 경로 진단까지",
    structure: "각 장은 작은 네트워크 상태를 예측하고 실행한 뒤, 같은 경계를 Linux 관측 도구로 다시 확인합니다.",
    orbitLabels: ["Socket", "Address", "Route", "TCP"],
  },
  en: {
    eyebrow: "INTERACTIVE LINUX NETWORKING FOUNDATIONS",
    runtime: "Browser network models + optional Linux observation",
    titleLead: "Understand Linux networking",
    titleEm: "from the ground up",
    titleTail: "",
    summary: "Start with interfaces and addresses, trace subnets, routes, sockets, TCP, and DNS one hop at a time, then connect the model to real Linux observations.",
    start: "Start the first networking chapter",
    journey: "See the full network path",
    overview: "Linux networking foundations overview",
    principle: "HOW IT WORKS",
    principleTitle: "Read one packet path before reaching for a command",
    principles: [
      ["Trace one boundary", "Separate the state from a host interface through links and routers to the peer application."],
      ["Separate address roles", "Distinguish the decisions made by names, IPs, MACs, ports, and next hops."],
      ["Verify by observation", "Compare how far ip, ss, ping, and packet captures can support a claim."],
    ],
    main: "LINUX NETWORKING FOUNDATIONS",
    road: "From interfaces and addresses to service-path diagnosis",
    structure: "Each chapter predicts and executes a small network state, then checks the same boundary with Linux observation tools.",
    orbitLabels: ["Socket", "Address", "Route", "TCP"],
  },
} as const satisfies LocalizedPresentation;

const systemArchitecturePresentation = {
  ko: {
    eyebrow: "INTERACTIVE SYSTEM ARCHITECTURE",
    runtime: "브라우저 아키텍처 모델",
    titleLead: "시스템 아키텍처를",
    titleEm: "바닥부터",
    titleTail: "설계하기",
    summary: "요구사항과 SLO에서 출발해 서비스·데이터 경계, 통신 방식, 일관성, 확장성과 실패 복구를 하나의 검증 가능한 시스템으로 조립합니다.",
    start: "첫 아키텍처 챕터 시작하기",
    journey: "전체 설계 여정 보기",
    overview: "시스템 아키텍처 커리큘럼 개요",
    principle: "설계 방식",
    principleTitle: "패턴 이름보다 먼저 요구사항과 trade-off 읽기",
    principles: [
      ["요구사항에서 시작", "기능, 부하, 지연, 가용성과 비용을 먼저 분리해 설계의 판단 기준을 만듭니다."],
      ["경계와 데이터 연결", "서비스 책임, 데이터 소유권과 동기·비동기 경로를 한 상태 모델로 조립합니다."],
      ["실패로 검증", "병목, 부분 실패와 복구 시나리오를 실행해 선택한 trade-off가 실제로 유지되는지 확인합니다."],
    ],
    main: "SYSTEM ARCHITECTURE CURRICULUM",
    road: "요구사항에서 운영 가능한 시스템까지",
    structure: "각 장은 요구사항, 후보 설계, 수치·상태 실험, failure review와 decision record를 반복합니다.",
    orbitLabels: ["SLO", "Boundary", "Data", "Failure"],
  },
  en: {
    eyebrow: "INTERACTIVE SYSTEM ARCHITECTURE",
    runtime: "Browser architecture models",
    titleLead: "Design system architecture",
    titleEm: "from the ground up",
    titleTail: "",
    summary: "Begin with requirements and SLOs, then assemble service and data boundaries, communication, consistency, scaling, and recovery into one verifiable system.",
    start: "Start the first architecture chapter",
    journey: "See the full design journey",
    overview: "System architecture curriculum overview",
    principle: "HOW TO DESIGN",
    principleTitle: "Read requirements and trade-offs before naming a pattern",
    principles: [
      ["Start from requirements", "Separate function, load, latency, availability, and cost into explicit decision criteria."],
      ["Connect boundaries and data", "Assemble service ownership, data ownership, and synchronous or asynchronous paths in one state model."],
      ["Verify through failure", "Run bottleneck, partial-failure, and recovery scenarios to test whether the chosen trade-off holds."],
    ],
    main: "SYSTEM ARCHITECTURE CURRICULUM",
    road: "From requirements to an operable system",
    structure: "Each chapter repeats requirements, candidate designs, numeric or state experiments, failure review, and a decision record.",
    orbitLabels: ["SLO", "Boundary", "Data", "Failure"],
  },
} as const satisfies LocalizedPresentation;

const presentationsByCurriculumSlug: Record<string, LocalizedPresentation> = {
  [TRANSFORMER_CURRICULUM_SLUG]: transformerPresentation,
  [LINUX_CURRICULUM_SLUG]: linuxPresentation,
  [INFRASTRUCTURE_CURRICULUM_SLUG]: infrastructurePresentation,
  [LINUX_NETWORKING_CURRICULUM_SLUG]: linuxNetworkingPresentation,
  [SYSTEM_ARCHITECTURE_CURRICULUM_SLUG]: systemArchitecturePresentation,
};

const genericOrbitLabels = {
  ko: ["관찰", "모델", "실행", "검증"],
  en: ["Observe", "Model", "Run", "Verify"],
} as const;

function genericPresentation(
  curriculum: Curriculum,
  locale: Locale,
): CurriculumPresentation {
  const isKo = locale === "ko";
  return {
    eyebrow: curriculum.eyebrow[locale],
    runtime: isKo ? "인터랙티브 브라우저 모델" : "Interactive browser models",
    titleLead: curriculum.title[locale],
    titleEm: isKo ? "직접 탐구하기" : "Explore it directly",
    titleTail: "",
    summary: curriculum.summary[locale],
    start: isKo ? "첫 챕터 시작하기" : "Start the first chapter",
    journey: isKo ? "전체 여정 보기" : "See the full journey",
    overview: isKo ? `${curriculum.title.ko} 개요` : `${curriculum.title.en} overview`,
    principle: isKo ? "학습 방식" : "HOW IT WORKS",
    principleTitle: isKo ? "관찰하고 실행하며 근거를 남기기" : "Observe, execute, and keep the evidence",
    principles: isKo
      ? [
          ["먼저 관찰", "현재 상태와 경계를 작은 단위로 나누어 읽습니다."],
          ["직접 실행", "브라우저 모델에서 한 번에 한 조건을 바꾸고 결과를 비교합니다."],
          ["근거로 연결", "관찰한 결과를 다음 개념과 실제 판단으로 연결합니다."],
        ]
      : [
          ["Observe first", "Read the current state and boundaries in small, explicit units."],
          ["Run it directly", "Change one condition at a time in the browser model and compare the result."],
          ["Connect by evidence", "Carry each observation into the next concept and a real decision."],
        ],
    main: isKo ? "CURRICULUM" : "CURRICULUM",
    road: curriculum.title[locale],
    structure: isKo
      ? "각 장은 설명, 실행 가능한 모델과 이해 확인을 하나의 흐름으로 연결합니다."
      : "Each chapter connects explanation, an executable model, and a concept check in one path.",
    orbitLabels: genericOrbitLabels[locale],
  };
}

const readinessCopy = {
  ko: {
    eyebrow: "권장 선수 경로",
    advisory: "선택 사항 · 현재 커리큘럼을 바로 시작할 수도 있습니다",
    title: "시작 전 준비도를 높여 보세요",
    summary: "선수 커리큘럼 범위",
    open: "권장 선수 커리큘럼 보기",
    draft: "선수 커리큘럼 공개 준비 중",
  },
  en: {
    eyebrow: "RECOMMENDED PREREQUISITE",
    advisory: "Optional · you can still start this curriculum now",
    title: "Build readiness before you begin",
    summary: "Prerequisite curriculum scope",
    open: "View the recommended curriculum",
    draft: "Prerequisite curriculum is still in draft",
  },
} as const;

const continuationCopy = {
  ko: {
    eyebrow: "다음 학습 경로",
    advisory: "현재 과정의 증거를 그대로 이어서 사용합니다",
    title: "완료 뒤 다음 경계로 확장하세요",
    summary: "다음 커리큘럼 범위",
    open: "다음 커리큘럼 보기",
    draft: "다음 커리큘럼 공개 준비 중",
  },
  en: {
    eyebrow: "NEXT LEARNING PATH",
    advisory: "Carry the same evidence into the next boundary",
    title: "Extend the model after completion",
    summary: "Next curriculum scope",
    open: "View the next curriculum",
    draft: "The next curriculum is still in draft",
  },
} as const;

export function CurriculumHome({
  item,
  prerequisiteAvailable = false,
  continuationAvailable = false,
  reach,
  preview = false,
}: {
  item: PublicCurriculumCatalogItem;
  prerequisiteAvailable?: boolean;
  continuationAvailable?: boolean;
  reach: PublicCurriculumReach;
  preview?: boolean;
}) {
  const { completed, retry, status } = useProgress();
  const { locale } = useLocale();
  const c = copy[locale];
  const curriculum = item.curriculum;
  const publicationByChapter = new Map(
    item.chapters.map(({ chapter, publication }) => [chapter.slug, publication]),
  );
  const chapters = curriculum.chapters[locale].filter((chapter) =>
    publicationByChapter.has(chapter.slug),
  );
  const publishedChapters = chapters.filter((chapter) => {
    const publication = publicationByChapter.get(chapter.slug)!;
    return (
      publication.contentReady &&
      publication.effectivePublicationStatus === "published"
    );
  });
  const upcomingChapters = chapters.filter((chapter) => {
    const publication = publicationByChapter.get(chapter.slug)!;
    return (
      !publication.contentReady ||
      publication.effectivePublicationStatus !== "published"
    );
  });
  const firstOpenChapter = chapters.find((chapter) => {
    const publication = publicationByChapter.get(chapter.slug)!;
    return preview
      ? publication.contentReady
      : publication.contentReady &&
          publication.effectivePublicationStatus === "published" &&
          publication.listing !== "hidden";
  });
  const presentation = presentationsByCurriculumSlug[curriculum.slug]?.[locale]
    ?? genericPresentation(curriculum, locale);
  const recommendedPrerequisite = curriculum.recommendedPrerequisite;
  const prerequisiteCurriculum = recommendedPrerequisite
    ? getCurriculum(recommendedPrerequisite.curriculumSlug)
    : undefined;
  const recommendedContinuation = curriculum.recommendedContinuation;
  const continuationCurriculum = recommendedContinuation
    ? getCurriculum(recommendedContinuation.curriculumSlug)
    : undefined;
  const visibleChapterIds = new Set(chapters.map((chapter) => chapter.id));
  const completedInCurriculum = completed.filter((id) =>
    visibleChapterIds.has(id),
  );

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
            {firstOpenChapter ? preview ? (
              <a
                className="button button-primary"
                href={`/admin/preview/curricula/${curriculum.slug}/chapters/${firstOpenChapter.slug}`}
              >
                {presentation.start} <span aria-hidden="true">→</span>
              </a>
            ) : (
              <Link
                className="button button-primary"
                to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                params={{
                  curriculumSlug: curriculum.slug,
                  chapterSlug: firstOpenChapter.slug,
                }}
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
              <span>{publishedChapters.length} {locale === "ko" ? "공개" : "published"}</span>
              <small>{upcomingChapters.length} {locale === "ko" ? "준비 중" : "coming soon"}</small>
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

      {recommendedPrerequisite && prerequisiteCurriculum ? (
        <section
          className="curriculum-readiness"
          aria-labelledby="curriculum-readiness-title"
          data-prerequisite="recommended"
          data-required="false"
        >
          <div className="curriculum-readiness-heading">
            <div>
              <p className="section-index">{readinessCopy[locale].eyebrow}</p>
              <h2 id="curriculum-readiness-title">{readinessCopy[locale].title}</h2>
            </div>
            <span className="curriculum-readiness-advisory">
              {readinessCopy[locale].advisory}
            </span>
          </div>
          <div className="curriculum-readiness-card">
            <div className="curriculum-readiness-copy">
              <h3>{prerequisiteCurriculum.title[locale]}</h3>
              <p>{recommendedPrerequisite.reason[locale]}</p>
              <div className="curriculum-readiness-scope">
                <strong>{readinessCopy[locale].summary}</strong>
                <span>{prerequisiteCurriculum.summary[locale]}</span>
              </div>
            </div>
            {preview ? (
              <a
                className="curriculum-readiness-link"
                href={`/admin/preview/curricula/${prerequisiteCurriculum.slug}${locale === "en" ? "?lang=en" : ""}`}
              >
                {readinessCopy[locale].open} <span aria-hidden="true">→</span>
              </a>
            ) : prerequisiteAvailable ? (
              <Link
                className="curriculum-readiness-link"
                to="/curricula/$curriculumSlug"
                params={{ curriculumSlug: prerequisiteCurriculum.slug }}
                search={locale === "en" ? { lang: "en" } : {}}
              >
                {readinessCopy[locale].open} <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span
                className="curriculum-readiness-link is-disabled"
                aria-disabled="true"
              >
                {readinessCopy[locale].draft}
              </span>
            )}
          </div>
        </section>
      ) : null}

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
            const publication = publicationByChapter.get(chapter.slug)!;
            const canOpen = preview
              ? publication.contentReady
              : publication.contentReady &&
                publication.effectivePublicationStatus === "published" &&
                publication.listing !== "hidden";
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
                  ) : canOpen ? (
                    <span className="enter-mark" aria-hidden="true">↗</span>
                  ) : (
                    <span className="planned-badge">{c.planned}</span>
                  )}
                </div>
              </>
            );

            return canOpen ? (
              preview ? (
                <a
                  className="chapter-row chapter-row-active"
                  href={`/admin/preview/curricula/${curriculum.slug}/chapters/${chapter.slug}`}
                  key={chapter.slug}
                >
                  {content}
                </a>
              ) : (
              <Link
                className="chapter-row chapter-row-active"
                to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                params={{ curriculumSlug: curriculum.slug, chapterSlug: chapter.slug }}
                search={locale === "en" ? { lang: "en" } : {}}
                key={chapter.slug}
              >
                {content}
              </Link>
              )
            ) : (
              <article className="chapter-row" key={chapter.slug} aria-label={`${chapter.title}, ${c.planned}`}>
                {content}
              </article>
            );
          })}
        </div>
      </section>

      {recommendedContinuation && continuationCurriculum ? (
        <section
          className="curriculum-readiness curriculum-continuation"
          aria-labelledby="curriculum-continuation-title"
          data-continuation="recommended"
        >
          <div className="curriculum-readiness-heading">
            <div>
              <p className="section-index">{continuationCopy[locale].eyebrow}</p>
              <h2 id="curriculum-continuation-title">{continuationCopy[locale].title}</h2>
            </div>
            <span className="curriculum-readiness-advisory">
              {continuationCopy[locale].advisory}
            </span>
          </div>
          <div className="curriculum-readiness-card">
            <div className="curriculum-readiness-copy">
              <h3>{continuationCurriculum.title[locale]}</h3>
              <p>{recommendedContinuation.reason[locale]}</p>
              <div className="curriculum-readiness-scope">
                <strong>{continuationCopy[locale].summary}</strong>
                <span>{continuationCurriculum.summary[locale]}</span>
              </div>
            </div>
            {preview ? (
              <a
                className="curriculum-readiness-link"
                href={`/admin/preview/curricula/${continuationCurriculum.slug}${locale === "en" ? "?lang=en" : ""}`}
              >
                {continuationCopy[locale].open} <span aria-hidden="true">→</span>
              </a>
            ) : continuationAvailable ? (
              <Link
                className="curriculum-readiness-link"
                to="/curricula/$curriculumSlug"
                params={{ curriculumSlug: continuationCurriculum.slug }}
                search={locale === "en" ? { lang: "en" } : {}}
              >
                {continuationCopy[locale].open} <span aria-hidden="true">→</span>
              </Link>
            ) : (
              <span
                className="curriculum-readiness-link is-disabled"
                aria-disabled="true"
              >
                {continuationCopy[locale].draft}
              </span>
            )}
          </div>
        </section>
      ) : null}

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

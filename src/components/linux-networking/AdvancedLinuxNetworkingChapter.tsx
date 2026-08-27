import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LINUX_NETWORKING_CURRICULUM_SLUG, linuxNetworkingChaptersEn, linuxNetworkingChaptersKo } from "../../data/curriculum";
import { canCompleteAdvancedChapter, getAdvancedLinuxNetworkingConfig, type AdvancedLinuxNetworkingSlug } from "../../features/linux-networking/advanced-networking";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { AdvancedNetworkConceptCheck } from "./AdvancedNetworkConceptCheck";
import { AdvancedNetworkIncidentLab } from "./AdvancedNetworkIncidentLab";
import { AdvancedNetworkJourneyFigure } from "./AdvancedNetworkJourneyFigure";
import { LinuxNetworkingHandoff } from "./LinuxNetworkingHandoff";
import "./advanced-networking-chapter.css";

export function AdvancedLinuxNetworkingChapter({ slug, learnerCount = 0, continuationAvailable = false }: { slug: AdvancedLinuxNetworkingSlug; learnerCount?: number; continuationAvailable?: boolean }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const text = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxNetworkingChaptersKo : linuxNetworkingChaptersEn;
  const config = getAdvancedLinuxNetworkingConfig(slug);
  const chapter = chapters[config.number - 1];
  const previous = chapters[config.number - 2];
  const next = chapters[config.number];
  const [figureComplete, setFigureComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteAdvancedChapter({ figureComplete, incidentsComplete, conceptsMastered });
  const activityCopy = {
    "routes-and-packet-paths": {
      figure: text("경로 선택부터 두 링크의 전달 증거를 순서대로 추적하세요", "Trace route selection and forwarding evidence across two links"),
      incident: text("첫 forwarding 실패 경계만 복구하세요", "Repair only the first failed forwarding boundary"),
    },
    "sockets-ports-and-tcp": {
      figure: text("listener에서 recv까지 연결 하나를 조립하세요", "Build one connection from listener to recv"),
      incident: text("조립된 socket 경계에서 어긋난 상태만 교체하세요", "Replace only the mismatched state in the assembled socket path"),
    },
    "dns-and-service-reachability": {
      figure: text("cold cache와 warm cache의 증거 범위를 비교하세요", "Compare the evidence boundaries of cold and warm caches"),
      incident: text("이름 해석과 서비스 도달 실패를 같은 기준으로 비교하세요", "Compare name-resolution and service-reachability failures on one basis"),
    },
    "diagnose-a-linux-network": {
      figure: text("첫 실패 경계까지 진단 증거 사다리를 쌓으세요", "Build the diagnostic evidence ladder to the first failed boundary"),
      incident: text("증거가 가리키는 최소 복구만 실행하세요", "Execute only the minimal repair supported by evidence"),
    },
  }[slug];
  const toc = [
    { id: "foundation", label: text("핵심 원리", "Core principle") },
    { id: "boundary", label: text("증거 경계", "Evidence boundary") },
    { id: "required-figure", label: text("필수 실행 그림", "Required executable figure") },
    { id: "incidents", label: text("장애 복구", "Incident repair") },
    { id: "real-linux", label: text("실제 Linux 관찰", "Observe real Linux") },
    { id: "transfer", label: text("다음 경계로 전이", "Transfer forward") },
    { id: "check", label: text("이해 확인", "Concept check") },
  ];

  const chapterHref = (chapterSlug: string) => `/admin/preview/curricula/${LINUX_NETWORKING_CURRICULUM_SLUG}/chapters/${chapterSlug}${isKo ? "" : "?lang=en"}`;
  return <main className={`chapter-shell linux-chapter-shell linux-network-foundations-chapter-shell advanced-networking-chapter-shell advanced-${slug}-chapter`}>
    <header className="chapter-topbar">
      <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={text("Rootorial 홈", "Rootorial home")}><RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span></Link>
      <div className="chapter-header-actions"><span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span><div className="chapter-progress-label"><span>CHAPTER {String(config.number).padStart(2, "0")}</span><div className="mini-progress"><span style={{ width: `${config.number * 100 / chapters.length}%` }} /></div><span>{config.number} / {chapters.length}</span></div><LanguageSwitcher compact /><AuthControls compact /></div>
    </header>
    <div className="article-layout"><ChapterToc items={toc} /><article className="lesson-article">
      <header className="lesson-hero linux-lesson-hero linux-network-foundations-hero advanced-networking-hero"><p className="eyebrow">{config.eyebrow} · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p><div className="lesson-number">{String(config.number).padStart(2, "0")}</div><h1>{chapter.title}</h1><p className="lesson-deck">{config.deck[locale]}</p><PublicLearningProof count={learnerCount} locale={locale} scope="chapter" /><div className="lesson-objectives"><span>{text("학습 목표", "LEARNING OBJECTIVES")}</span><ul>{config.objectives.map((objective) => <li key={objective.en}>{objective[locale]}</li>)}</ul></div></header>

      <section className="article-section" id="foundation"><div className="margin-label">01 — CORE MECHANISM</div><h2>{config.foundation.title[locale]}</h2><p>{config.foundation.body[locale]}</p></section>
      <section className="article-section" id="boundary"><div className="margin-label">02 — EVIDENCE BOUNDARY</div><h2>{config.boundary.title[locale]}</h2><p>{config.boundary.body[locale]}</p><div className="concept-callout misconception-callout"><span className="callout-mark">!</span><div><strong>{text("증거 범위를 넘지 마세요", "Stay inside the evidence boundary")}</strong><p>{config.boundary.warning[locale]}</p></div></div></section>
      <section className="article-section" id="required-figure"><div className="margin-label">03 — REQUIRED EXECUTABLE FIGURE</div><h2>{activityCopy.figure}</h2><p>{config.figure.description[locale]}</p><AdvancedNetworkJourneyFigure config={config} onMasteryChange={setFigureComplete} /></section>
      <section className="article-section" id="incidents"><div className="margin-label">04 — EVIDENCE-BOUND REPAIR</div><h2>{activityCopy.incident}</h2><p>{text("사건마다 출력이 직접 증명하는 첫 실패 경계를 찾고, 전체 초기화 없이 해당 상태만 복구합니다.", "For each incident, locate the first failed boundary directly supported by output and repair only that state without a full reset.")}</p><AdvancedNetworkIncidentLab config={config} onCompletionChange={setIncidentsComplete} /></section>
      <section className="article-section" id="real-linux"><div className="margin-label">05 — OPTIONAL REAL LINUX OBSERVATION</div><h2>{text("실제 Linux에서 같은 증거 순서를 읽어 보세요", "Read the same evidence order on real Linux")}</h2><p>{text("아래 명령은 관찰 중심입니다. 각 출력이 직접 증명하는 사실과 아직 증명하지 못한 사실을 구분하세요.", "These commands focus on observation. Separate what each output directly proves from what remains unproven.")}</p><pre className="network-view-observation-command"><code>{config.linuxCommands}</code></pre></section>
      <section className="article-section" id="transfer"><div className="margin-label">06 — TRANSFER THE EVIDENCE</div><h2>{config.transfer.title[locale]}</h2><p>{config.transfer.body[locale]}</p><LinuxNetworkingHandoff targetChapter={config.transfer.infrastructureChapter} preview={preview} continuationAvailable={continuationAvailable} /></section>
      <section className="article-section concept-check" id="check"><div className="margin-label">07 — CONCEPT CHECK</div><AdvancedNetworkConceptCheck config={config} onMasteryChange={setConceptsMastered} /><div className="network-view-completion-checklist" role="status" aria-live="polite"><span className={figureComplete ? "is-complete" : undefined}>{figureComplete ? "✓" : "○"} {text("모든 실행 상태", "All executable states")}</span><span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {text("모든 장애 복구", "All incident repairs")}</span><span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {text("다섯 개념 확인", "Five concept checks")}</span></div><CompleteChapter curriculumSlug={LINUX_NETWORKING_CURRICULUM_SLUG} slug={slug} canComplete={canComplete} lockedMessage={text("실행 그림의 모든 상태, 장애 복구와 다섯 개념 확인을 완료하세요.", "Complete every figure state, incident repair, and five concept checks.")} />      </section>
      <CitationSection citations={[{title:"TCP/IP Illustrated (Stevens, Fall & Stevens)",url:"https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/"}]} />
      <nav className="chapter-bottom-nav" aria-label={text("챕터 이동", "Chapter navigation")}>
        {preview ? <a href={chapterHref(previous.slug)}>← {text("이전", "Previous")}: {previous.title}</a> : <Link to="/curricula/$curriculumSlug/chapters/$chapterSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG, chapterSlug: previous.slug }} search={isKo ? {} : { lang: "en" }}>← {text("이전", "Previous")}: {previous.title}</Link>}
        {next ? preview ? <a href={chapterHref(next.slug)}>{text("다음", "Next")}: {next.title} →</a> : <Link to="/curricula/$curriculumSlug/chapters/$chapterSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG, chapterSlug: next.slug }} search={isKo ? {} : { lang: "en" }}>{text("다음", "Next")}: {next.title} →</Link> : <span>{text("기초 과정 완료 · 인프라 설계로 계속", "Foundation complete · continue to infrastructure design")}</span>}
      </nav>
    </article></div>
  </main>;
}

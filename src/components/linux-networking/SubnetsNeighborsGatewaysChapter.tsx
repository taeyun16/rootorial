import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LINUX_NETWORKING_CURRICULUM_SLUG, linuxNetworkingChaptersEn, linuxNetworkingChaptersKo } from "../../data/curriculum";
import { canCompleteSubnetsChapter } from "../../features/linux-networking/subnets-neighbors-and-gateways";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxNetworkingHandoff } from "./LinuxNetworkingHandoff";
import { SubnetConceptCheck } from "./SubnetConceptCheck";
import { SubnetIncidentLab } from "./SubnetIncidentLab";
import { SubnetPathFigure } from "./SubnetPathFigure";
import "./subnets-neighbors-gateways-chapter.css";

const tocItems = {
  ko: [
    { id: "boundary", label: "/24 경계 계산" }, { id: "next-hop", label: "다음 홉과 ARP" },
    { id: "required-figure", label: "필수 경로 실습" }, { id: "incidents", label: "경계별 장애 복구" },
    { id: "real-linux", label: "실제 Linux 관찰" }, { id: "transfer", label: "라우팅으로 전이" }, { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "boundary", label: "Compute the /24 boundary" }, { id: "next-hop", label: "Next hop and ARP" },
    { id: "required-figure", label: "Required path lab" }, { id: "incidents", label: "Repair boundary failures" },
    { id: "real-linux", label: "Observe real Linux" }, { id: "transfer", label: "Transfer to routing" }, { id: "check", label: "Concept check" },
  ],
} as const;

export function SubnetsNeighborsGatewaysChapter({ learnerCount = 0, continuationAvailable = false }: { learnerCount?: number; continuationAvailable?: boolean }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxNetworkingChaptersKo : linuxNetworkingChaptersEn;
  const chapter = chapters[1];
  const [labComplete, setLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteSubnetsChapter({ labComplete, incidentsComplete, conceptsMastered });
  return (
    <main className="chapter-shell linux-chapter-shell linux-network-foundations-chapter-shell subnet-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}><RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span></Link>
        <div className="chapter-header-actions"><span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span><div className="chapter-progress-label"><span>CHAPTER 02</span><div className="mini-progress"><span style={{ width: `${200 / chapters.length}%` }} /></div><span>2 / {chapters.length}</span></div><LanguageSwitcher compact /><AuthControls compact /></div>
      </header>
      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero linux-lesson-hero linux-network-foundations-hero subnet-lesson-hero">
            <p className="eyebrow">PREFIX → ROUTE DECISION → NEXT HOP → ARP → FRAME · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">02</div><h1>{chapter.title}</h1>
            <p className="lesson-deck">{isKo ? <>주소가 있다고 곧바로 목적지 MAC을 아는 것은 아닙니다. 먼저 <em>같은 링크인지</em> 판정하고, 그 결과로 <em>ARP할 다음 홉</em>을 선택해야 합니다.</> : <>An address does not immediately reveal the destination MAC. First decide <em>whether the destination is on-link</em>, then select <em>the next hop to resolve with ARP</em>.</>}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives"><span>{t("학습 목표", "LEARNING OBJECTIVES")}</span><ul>
              <li>{t("IPv4 주소와 /24에서 네트워크 경계를 계산할 수 있다.", "Derive a network boundary from an IPv4 address and /24 prefix.")}</li>
              <li>{t("같은 링크 목적지와 원격 목적지의 다음 홉을 구분할 수 있다.", "Distinguish the next hop for on-link and remote destinations.")}</li>
              <li>{t("Ethernet 목적지와 IP 목적지가 서로 다를 수 있음을 설명할 수 있다.", "Explain why Ethernet and IP destinations can differ.")}</li>
              <li>{t("프리픽스·이웃·기본 경로·게이트웨이 장애를 최소 변경으로 복구할 수 있다.", "Repair prefix, neighbor, default-route, and gateway faults with minimal changes.")}</li>
            </ul></div>
          </header>

          <section className="article-section" id="boundary"><div className="margin-label">01 — PREFIX DEFINES THE LOCAL LINK</div><h2>{t("10.20.0.2/24에서 /24는 로컬 링크의 주소 경계를 만듭니다", "In 10.20.0.2/24, /24 defines the local-link address boundary")}</h2><p>{isKo ? <><code>/24</code>는 앞 24비트를 네트워크 영역으로 사용합니다. 따라서 네트워크는 <code>10.20.0.0/24</code>이고 <code>10.20.0.44</code>는 같은 링크, <code>203.0.113.20</code>은 링크 밖입니다. 이 판정은 아직 ARP나 TCP를 실행하지 않습니다.</> : <><code>/24</code> uses the first 24 bits as the network portion. The derived network is <code>10.20.0.0/24</code>, so <code>10.20.0.44</code> is on-link and <code>203.0.113.20</code> is not. This decision runs before ARP or TCP.</>}</p></section>

          <section className="article-section" id="next-hop"><div className="margin-label">02 — ROUTE DECISION BEFORE NEIGHBOR RESOLUTION</div><h2>{t("ARP는 최종 IP 목적지가 아니라 같은 링크의 다음 홉을 해석합니다", "ARP resolves the on-link next hop, not necessarily the final IP destination")}</h2><p>{t("같은 링크라면 목적지 자체가 다음 홉입니다. 원격 목적지라면 기본 경로가 10.20.0.1을 다음 홉으로 선택합니다. 그래서 원격 프레임의 Ethernet 목적지는 게이트웨이 MAC이지만 IP 목적지는 203.0.113.20으로 유지됩니다.", "For an on-link destination, the destination itself is the next hop. For a remote destination, the default route selects 10.20.0.1. The remote frame therefore targets the gateway MAC while the IP destination remains 203.0.113.20.")}</p><div className="concept-callout misconception-callout"><span className="callout-mark">!</span><div><strong>{t("원격 IP의 MAC을 ARP하지 않습니다", "Do not ARP for a remote IP's MAC")}</strong><p>{t("Ethernet 프레임은 링크마다 새로 만들어집니다. 현재 호스트는 현재 링크에서 도달 가능한 다음 홉의 MAC만 필요합니다.", "Ethernet frames are rebuilt on each link. This host only needs the MAC of the next hop reachable on its current link.")}</p></div></div></section>

          <section className="article-section" id="required-figure"><div className="margin-label">03 — REQUIRED PATH LAB</div><h2>{t("같은 링크와 원격 목적지를 한 그림에서 실행하세요", "Execute on-link and remote destinations in one figure")}</h2><p>{t("여섯 상태를 모두 실행해 경로 선택, ARP와 프레임 생성의 순서를 비교하세요.", "Run all six states and compare route selection, ARP, and frame construction in order.")}</p><SubnetPathFigure onMasteryChange={setLabComplete} /></section>

          <section className="article-section" id="incidents"><div className="margin-label">04 — REPAIR THE BROKEN BOUNDARY</div><h2>{t("비슷한 도달 실패를 서로 다른 증거로 분리하세요", "Separate similar reachability failures with different evidence")}</h2><p>{t("사건마다 한 경계만 고장 납니다. 전체 초기화 대신 증거와 일치하는 최소 복구를 실행하세요.", "Each incident breaks one boundary. Execute the smallest evidence-backed repair instead of resetting everything.")}</p><SubnetIncidentLab onCompletionChange={setIncidentsComplete} /></section>

          <section className="article-section" id="real-linux"><div className="margin-label">05 — OPTIONAL REAL LINUX OBSERVATION</div><h2>{t("실제 Linux에서도 같은 결정 순서를 읽어 보세요", "Read the same decision order on real Linux")}</h2><p>{t("아래 명령은 현재 상태를 바꾸지 않습니다. 인터페이스 주소, 연결 경로와 이웃 표를 각각 읽고 어떤 사실을 직접 증명하는지 비교하세요.", "These commands do not change state. Read interface addresses, selected routes, and the neighbor table separately and compare what each directly proves.")}</p><pre className="network-view-observation-command"><code>{`ip -4 addr show dev eth0\nip route get 10.20.0.44\nip route get 203.0.113.20\nip neigh show dev eth0`}</code></pre></section>

          <section className="article-section" id="transfer"><div className="margin-label">06 — TRANSFER TO ROUTING AND INFRASTRUCTURE</div><h2>{t("다음에는 여러 경로 중 가장 구체적인 경로를 고릅니다", "Next, choose the most specific route among several candidates")}</h2><p>{t("이번 장은 연결된 /24와 기본 경로 하나만 사용했습니다. 다음 장에서는 여러 프리픽스와 metric을 비교하고 router를 지나는 packet path를 추적합니다.", "This chapter used one connected /24 and one default route. The next chapter compares multiple prefixes and metrics, then traces the packet path across a router.")}</p><LinuxNetworkingHandoff targetChapter="veth-bridges-and-routing" preview={preview} continuationAvailable={continuationAvailable} /></section>

          <section className="article-section concept-check" id="check"><div className="margin-label">07 — CONCEPT CHECK</div><SubnetConceptCheck onMasteryChange={setConceptsMastered} /><div className="network-view-completion-checklist" role="status" aria-live="polite"><span className={labComplete ? "is-complete" : undefined}>{labComplete ? "✓" : "○"} {t("여섯 경로 상태", "Six path states")}</span><span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 가지 장애 복구", "Four incident repairs")}</span><span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("다섯 개념 확인", "Five concept checks")}</span></div><CompleteChapter curriculumSlug={LINUX_NETWORKING_CURRICULUM_SLUG} slug="subnets-neighbors-and-gateways" canComplete={canComplete} lockedMessage={t("여섯 경로 상태, 네 가지 장애 복구와 다섯 개념 확인을 완료하세요.", "Complete all six path states, four incident repairs, and five concept checks.")} />          </section>

          <CitationSection
            citations={[
              {
                title: "TCP/IP Illustrated (Stevens, Fall & Stevens)",
                url: "https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={`/admin/preview/curricula/${LINUX_NETWORKING_CURRICULUM_SLUG}/chapters/interfaces-addresses-and-loopback${isKo ? "" : "?lang=en"}`}>← {t("이전: 인터페이스·주소·루프백", "Previous: Interfaces, Addresses, and Loopback")}</a> : <Link to="/curricula/$curriculumSlug/chapters/$chapterSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG, chapterSlug: "interfaces-addresses-and-loopback" }} search={isKo ? {} : { lang: "en" }}>← {t("이전: 인터페이스·주소·루프백", "Previous: Interfaces, Addresses, and Loopback")}</Link>}
            {preview ? <a href={`/admin/preview/curricula/${LINUX_NETWORKING_CURRICULUM_SLUG}/chapters/routes-and-packet-paths${isKo ? "" : "?lang=en"}`}>{t("다음: 경로와 패킷 흐름", "Next: Routes and Packet Paths")} →</a> : <Link to="/curricula/$curriculumSlug/chapters/$chapterSlug" params={{ curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG, chapterSlug: "routes-and-packet-paths" }} search={isKo ? {} : { lang: "en" }}>{t("다음: 경로와 패킷 흐름", "Next: Routes and Packet Paths")} →</Link>}
          </nav>
        </article>
      </div>
    </main>
  );
}

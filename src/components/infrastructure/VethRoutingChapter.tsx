import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteVethRoutingChapter } from "../../features/infrastructure/veth-routing";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { VethRoutingConceptCheck } from "./VethRoutingConceptCheck";
import { VethRoutingIncidentLab } from "./VethRoutingIncidentLab";
import { VethTopologyLab } from "./VethTopologyLab";

const tocItems = {
  ko: [
    { id: "veth-pair", label: "veth pair와 소유권" },
    { id: "bridge", label: "bridge의 L2 경계" },
    { id: "router", label: "router namespace와 L3" },
    { id: "round-trip", label: "forward·return path" },
    { id: "topology-lab", label: "필수 topology builder" },
    { id: "incidents", label: "네 topology 사건" },
    { id: "real-linux", label: "선택 iproute2 관찰" },
    { id: "transfer", label: "NAT·conntrack으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "veth-pair", label: "veth pairs and ownership" },
    { id: "bridge", label: "The bridge Layer 2 boundary" },
    { id: "router", label: "Router namespace and Layer 3" },
    { id: "round-trip", label: "Forward and return paths" },
    { id: "topology-lab", label: "Required topology builder" },
    { id: "incidents", label: "Four topology incidents" },
    { id: "real-linux", label: "Optional iproute2 observation" },
    { id: "transfer", label: "Transfer to NAT and conntrack" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function VethRoutingChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "veth-bridges-and-routing");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [topologyCompletion, setTopologyCompletion] = useState({ bridge: false, router: false });
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteVethRoutingChapter({
    bridgeTopologyComplete: topologyCompletion.bridge,
    routedTopologyComplete: topologyCompletion.router,
    incidentsComplete,
    conceptsMastered,
  });
  const namespacePreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/network-namespaces-and-boundaries${isKo ? "" : "?lang=en"}`;
  const egressNatPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/egress-nat-and-conntrack${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell veth-routing-chapter-shell">
      <header className="chapter-topbar">
        <Link
          className="wordmark"
          to="/"
          search={isKo ? {} : { lang: "en" }}
          aria-label={t("Rootorial 홈", "Rootorial home")}
        >
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status">
            <span className="status-dot" aria-hidden="true" /> {chapter.runtime}
          </span>
          <div className="chapter-progress-label">
            <span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span>
            <div className="mini-progress">
              <span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} />
            </div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero veth-routing-lesson-hero">
            <p className="eyebrow">
              VETH PAIR → L2 BRIDGE / L3 ROUTER → FORWARD PATH → RETURN PATH · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">02</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "앞 장에서 host·client·app network view가 서로 닫혀 있음을 확인했습니다. 이제 두 endpoint로 이루어진 veth를 배치하고, bridge의 L2 path와 router namespace의 L3 path를 각각 조립해 request뿐 아니라 reply까지 돌아오는지 실행합니다.",
              "The prior chapter proved that host, client, and app network views are closed by default. Now place the two endpoints of each veth pair and assemble both a bridge Layer 2 path and a router-namespace Layer 3 path, verifying that replies—not only requests—can return.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("veth pair의 두 endpoint를 서로 다른 namespace에 단일 소유권으로 배치하고 양쪽 link state를 판정할 수 있다.", "Place the two endpoints of a veth pair under single namespace ownership and judge both link states.")}</li>
                <li>{t("bridge port 연결과 같은-subnet address plan을 통해 L2 path를 조립할 수 있다.", "Assemble a Layer 2 path through explicit bridge ports and a same-subnet address plan.")}</li>
                <li>{t("서로 겹치지 않는 두 CIDR, on-link gateway와 IP forwarding으로 router namespace를 구성할 수 있다.", "Configure a router namespace with two non-overlapping CIDRs, on-link gateways, and IP forwarding.")}</li>
                <li>{t("forward route와 return route를 분리해 one-way packet 도착을 왕복 연결로 오해하지 않을 수 있다.", "Separate forward and return routes so one-way packet arrival is not mistaken for a round-trip connection.")}</li>
                <li>{t("ip link·bridge link·ip route·ss 증거를 올바른 namespace에서 수집할 수 있다.", "Collect ip link, bridge link, ip route, and ss evidence from the correct namespace.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="veth-pair">
            <div className="margin-label">01 — TWO ENDPOINTS, TWO OWNERS</div>
            <h2>{t("veth는 한 interface를 복제하지 않고 두 interface object를 연결합니다", "veth connects two interface objects; it does not copy one interface")}</h2>
            <p>{t(
              "`ip link add ... type veth peer ...`는 항상 endpoint 두 개를 만듭니다. 각 endpoint는 한 번에 정확히 하나의 network namespace에 속하고, 한쪽으로 들어간 Ethernet frame은 peer에서 나옵니다. 따라서 이름, owner namespace와 admin UP 상태를 endpoint마다 따로 추적해야 합니다.",
              "`ip link add ... type veth peer ...` always creates two endpoints. Each endpoint belongs to exactly one network namespace at a time, and an Ethernet frame entering one endpoint emerges from its peer. Track the name, owner namespace, and administrative UP state of each endpoint separately.",
            )}</p>
            <div className="veth-contract-grid">
              <article><span>client netns</span><strong>eth0</strong><p>10.20.0.2/24 · endpoint A</p></article>
              <div aria-hidden="true">⇄</div>
              <article><span>host / router netns</span><strong>veth-client</strong><p>endpoint B · distinct owner</p></article>
            </div>
          </section>

          <section className="article-section" id="bridge">
            <div className="margin-label">02 — BRIDGE MODE · ONE L2 DOMAIN</div>
            <h2>{t("br0는 명시적으로 연결한 port 사이에서 frame을 전달합니다", "br0 forwards frames only among explicitly attached ports")}</h2>
            <p>{t(
              "bridge mode에서는 client와 app의 host-side veth peer를 둘 다 br0에 enslave합니다. 양쪽 endpoint와 br0가 UP이고 client·app 주소가 같은 subnet에서 서로 달라야 connected route와 ARP가 하나의 L2 domain에서 동작합니다. bridge는 다른 CIDR 사이의 route나 gateway를 자동으로 만들지 않습니다.",
              "In bridge mode, enslave both host-side veth peers to br0. Both endpoints and br0 must be UP, while client and app addresses must be distinct members of the same subnet so connected routes and ARP operate in one Layer 2 domain. A bridge does not automatically route between different CIDRs or create a gateway.",
            )}</p>
            <div className="network-invariant-table" role="table" aria-label={t("bridge topology invariant", "Bridge topology invariants")}>
              <div role="row"><strong role="cell">PORTS</strong><span role="cell">veth-client-host · veth-app-host → master br0</span></div>
              <div role="row"><strong role="cell">ADDRESS</strong><span role="cell">10.20.0.2/24 ↔ 10.20.0.3/24</span></div>
              <div role="row"><strong role="cell">ROUTE</strong><span role="cell">10.20.0.0/24 dev eth0 · connected</span></div>
            </div>
          </section>

          <section className="article-section" id="router">
            <div className="margin-label">03 — ROUTER MODE · TWO L3 LINKS</div>
            <h2>{t("router namespace는 서로 다른 두 subnet을 가진 두 interface 사이를 전달합니다", "A router namespace forwards between two interfaces on different subnets")}</h2>
            <p>{t(
              "router mode에서는 client-side와 app-side veth peer가 모두 router namespace에 있지만 서로 다른 interface와 subnet으로 남습니다. client gateway 10.20.0.1은 client link에서 on-link이고, app gateway 10.30.0.1은 app link에서 on-link여야 합니다. 두 leg의 CIDR이 겹치면 어느 egress가 맞는지 설계가 모호해집니다.",
              "In router mode, the client-side and app-side peers both live in the router namespace but remain separate interfaces and subnets. Client gateway 10.20.0.1 must be on-link on the client leg, and app gateway 10.30.0.1 must be on-link on the app leg. Overlapping leg CIDRs make the intended egress ambiguous.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("router namespace 핵심 state", "Core router-namespace state")}>{`client: 10.20.0.2/24  route 10.30.0.0/24 via 10.20.0.1
router: 10.20.0.1/24 ↔ 10.30.0.1/24  net.ipv4.ip_forward=1
app:    10.30.0.2/24  route 10.20.0.0/24 via 10.30.0.1`}</pre>
          </section>

          <section className="article-section" id="round-trip">
            <div className="margin-label">04 — REQUEST IS NOT A ROUND TRIP</div>
            <h2>{t("forward path가 열려도 reply route가 없으면 TCP 연결은 완성되지 않습니다", "An open forward path cannot complete TCP without a reply route")}</h2>
            <p>{t(
              "client SYN이 app listener까지 도착하는 것은 절반의 증거입니다. app의 SYN-ACK도 client subnet으로 돌아갈 route와 on-link gateway를 가져야 합니다. 이 장의 판정기는 forward와 return trace를 별도로 실행하고, 가장 먼저 막힌 hop을 표시합니다.",
              "A client SYN reaching the app listener is only half the evidence. The app's SYN-ACK also needs a route and on-link gateway back to the client subnet. This chapter's evaluator executes forward and return traces separately and exposes the first blocked hop.",
            )}</p>
          </section>

          <section className="article-section" id="topology-lab">
            <div className="margin-label">05 — REQUIRED TOPOLOGY BUILDER</div>
            <h2>{t("같은 두 service를 bridge와 router 두 방식으로 연결하세요", "Connect the same two services through both a bridge and a router")}</h2>
            <p>{t(
              "control을 바꿀 때마다 topology와 command evidence가 브라우저 안에서 다시 계산됩니다. 실행 전에는 reachability verdict를 숨기고, 제출 뒤에만 forward·return path의 실제 첫 실패 경계를 공개합니다. bridge와 router mode를 각각 한 번 통과해야 활동이 완료됩니다.",
              "Every control change recomputes the topology and command evidence inside the browser. Reachability remains hidden before execution; only submission reveals the actual first failed boundary on the forward or return path. Complete both bridge and router modes to finish the activity.",
            )}</p>
            <VethTopologyLab onCompletionChange={setTopologyCompletion} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">06 — DEBUG FOUR TOPOLOGY INCIDENTS</div>
            <h2>{t("증상을 넓은 우회책이 아니라 최초 실패 invariant로 수리합니다", "Repair the first failed invariant instead of applying a broad workaround")}</h2>
            <p>{t(
              "dangling bridge port, duplicate address, disabled forwarding과 missing return route를 같은 모델로 다시 실행합니다. NAT를 추가하거나 subnet을 하나로 합쳐 요구사항을 지우는 선택은 통과하지 않습니다.",
              "Re-execute a dangling bridge port, duplicate address, disabled forwarding, and a missing return route through the same model. Choices that add NAT or collapse the subnets to erase the requirement do not pass.",
            )}</p>
            <VethRoutingIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">07 — OPTIONAL REAL IPROUTE2 OBSERVATION</div>
            <h2>{t("실제 Linux에서는 owner namespace와 transit device를 함께 기록합니다", "On real Linux, record both owner namespace and transit device")}</h2>
            <p>{t(
              "권한이 있는 disposable Linux 환경에서만 아래 read-only 관찰을 시도하세요. 이름과 output은 환경마다 다를 수 있으며 root shell이나 외부 network는 완료 조건이 아닙니다. 브라우저 topology model이 모든 필수 학습의 결정적 가상 환경입니다.",
              "Try the read-only observations below only in a disposable Linux environment with suitable permission. Names and output vary by environment; a root shell and external network are not completion requirements. The browser topology model is the deterministic virtual environment for every required objective.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("선택 veth bridge routing 관찰 명령", "Optional veth bridge routing observation commands")}>{`ip -d link show type veth
bridge link show
ip -n client -br address
ip -n client route show
ip -n router -br address
ip -n router route show
ip netns exec router sysctl net.ipv4.ip_forward
ip netns exec app ss -lnt '( sport = :8080 )'`}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER TO EGRESS · NAT · CONNTRACK</div>
            <h2>{t("routing이 먼저 맞아야 주소 번역과 stateful reply를 논의할 수 있습니다", "Routing must work before address translation and stateful replies make sense")}</h2>
            <div className="network-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "router의 app-side path는 유지한 채 client를 private subnet으로 보고 외부 egress를 하나 더 추가한다고 가정하세요. 어떤 boundary에서 source address를 번역할지, reply를 어느 original flow와 연결할지, route failure와 conntrack failure를 어떤 증거로 구분할지 적으세요. NAT를 missing route의 대체물로 사용해서는 안 됩니다.",
                "Keep the router's app-side path and add one external egress while treating the client as a private subnet. Identify where to translate the source address, how a reply maps back to the original flow, and which evidence separates route failure from conntrack failure. Do not use NAT as a substitute for a missing route.",
              )}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">09 — CONCEPT CHECK</div>
            <VethRoutingConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-completion-checklist" role="status" aria-live="polite">
              <span className={topologyCompletion.bridge ? "is-complete" : undefined}>{topologyCompletion.bridge ? "✓" : "○"} {t("bridge topology 통과", "Bridge topology passed")}</span>
              <span className={topologyCompletion.router ? "is-complete" : undefined}>{topologyCompletion.router ? "✓" : "○"} {t("router topology 통과", "Router topology passed")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 topology 사건 수리", "Four topology incidents repaired")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG}
              slug="veth-bridges-and-routing"
              canComplete={canComplete}
              lockedMessage={t(
                "bridge·router topology, 네 사건과 다섯 개념 확인을 모두 완료하세요.",
                "Complete both bridge and router topologies, all four incidents, and all five concept checks.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={namespacePreviewHref}>← {t("이전: network namespace와 격리 경계", "Previous: Network namespaces and isolation boundaries")}</a>
            ) : (
              <span>← {t("이전: network namespace", "Previous: Network namespaces")}</span>
            )}
            {preview ? (
              <a href={egressNatPreviewHref}>{t("다음: egress·NAT·conntrack", "Next: Egress, NAT, and conntrack")} →</a>
            ) : (
              <span>{t("다음: egress·NAT·conntrack", "Next: Egress, NAT, and conntrack")} →</span>
            )}
          </nav>
          <noscript>{t(
            "topology 활동에는 JavaScript가 필요합니다. 위의 veth·bridge·route 설명과 iproute2 관찰 명령은 계속 읽을 수 있습니다.",
            "The topology activities require JavaScript. The veth, bridge, and route explanations plus iproute2 observation commands remain readable.",
          )}</noscript>
        </article>
      </div>
    </main>
  );
}

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import "./network-policy.css";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteNetworkPolicyChapter } from "../../features/infrastructure/network-policy";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { NetworkPolicyConceptCheck } from "./NetworkPolicyConceptCheck";
import { NetworkPolicyIncidentLab } from "./NetworkPolicyIncidentLab";
import { NetworkPolicyLab } from "./NetworkPolicyLab";

const tocItems = {
  ko: [
    { id: "reachability-first", label: "정책 전 reachability" },
    { id: "hooks", label: "INPUT·FORWARD·OUTPUT" },
    { id: "default-deny", label: "default-deny 계약" },
    { id: "rule-order", label: "terminal verdict 순서" },
    { id: "stateful-return", label: "stateful reply" },
    { id: "policy-lab", label: "필수 policy builder" },
    { id: "incidents", label: "네 firewall 사건" },
    { id: "real-linux", label: "선택 nftables 관찰" },
    { id: "transfer", label: "discovery·LB로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "reachability-first", label: "Reachability before policy" },
    { id: "hooks", label: "INPUT, FORWARD, OUTPUT" },
    { id: "default-deny", label: "The default-deny contract" },
    { id: "rule-order", label: "Terminal-verdict order" },
    { id: "stateful-return", label: "Stateful replies" },
    { id: "policy-lab", label: "Required policy builder" },
    { id: "incidents", label: "Four firewall incidents" },
    { id: "real-linux", label: "Optional nftables observation" },
    { id: "transfer", label: "Transfer to discovery and LB" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function NetworkPolicyChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "network-policy-and-firewalls");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [policyCompletion, setPolicyCompletion] = useState({ forward: false, input: false });
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNetworkPolicyChapter({
    forwardPolicyComplete: policyCompletion.forward,
    inputPolicyComplete: policyCompletion.input,
    incidentsComplete,
    conceptsMastered,
  });
  const egressPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/egress-nat-and-conntrack${isKo ? "" : "?lang=en"}`;
  const serviceDiscoveryPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/service-discovery-and-load-balancing${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell network-policy-chapter-shell">
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
            <div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero network-policy-lesson-hero">
            <p className="eyebrow">
              REACHABLE PATH → HOOK → ORDERED RULES → CONNTRACK STATE → DEFAULT DENY · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">04</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "앞 장까지 route·forwarding·NAT·conntrack으로 왕복 가능한 flow를 만들었습니다. 이제 그 path를 그대로 둔 채 packet의 최종 목적지에 맞는 INPUT 또는 FORWARD hook을 고르고, 필요한 NEW flow와 ESTABLISHED reply만 허용하는 fail-closed policy를 조립합니다.",
              "The previous chapters built a round-trip flow through routes, forwarding, NAT, and conntrack. Keep that path intact, select INPUT or FORWARD from the packet's final destination, and assemble a fail-closed policy that allows only the required NEW flow and its ESTABLISHED reply.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("router-local packet과 transit packet을 각각 INPUT과 FORWARD hook에 배치할 수 있다.", "Place router-local and transit packets on the INPUT and FORWARD hooks respectively.")}</li>
                <li>{t("필요한 source·destination·protocol·port만 허용하고 base chain을 default-deny로 닫을 수 있다.", "Allow only the required source, destination, protocol, and port while closing the base chain with default deny.")}</li>
                <li>{t("ordered rule에서 첫 matching terminal verdict가 뒤의 rule 평가를 끝내는 시점을 추적할 수 있다.", "Trace when the first matching terminal verdict ends evaluation of later ordered rules.")}</li>
                <li>{t("NEW request와 conntrack ESTABLISHED reply를 분리해 넓은 reverse-port allow를 피할 수 있다.", "Separate a NEW request from its conntrack ESTABLISHED reply and avoid broad reverse-port allows.")}</li>
                <li>{t("nftables counter evidence로 wrong hook·wrong order·stateful gap·fail-open default를 구분할 수 있다.", "Use nftables counter evidence to distinguish a wrong hook, wrong order, stateful gap, and fail-open default.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="reachability-first">
            <div className="margin-label">01 — REACHABILITY BEFORE AUTHORIZATION</div>
            <h2>{t("firewall은 연결 가능한 path를 제한하지만 route를 만들지는 않습니다", "A firewall constrains a reachable path; it does not create one")}</h2>
            <p>{t(
              "route lookup, on-link gateway, IP forwarding, NAT binding과 return path 중 하나라도 실패하면 `accept` rule을 추가해도 packet은 도착하지 않습니다. 이 장의 가상 환경은 Chapter 3까지 검증된 topology를 고정하고 filter policy만 바꿉니다. 따라서 drop counter가 0일 때는 먼저 packet이 해당 hook까지 도달했는지 확인해야 합니다.",
              "If route lookup, an on-link gateway, IP forwarding, the NAT binding, or the return path fails, adding an `accept` rule cannot deliver the packet. This chapter's virtual environment fixes the topology proven through Chapter 3 and changes only filter policy. A zero drop counter therefore first asks whether the packet reached that hook at all.",
            )}</p>
            <div className="network-policy-preflight" role="list" aria-label={t("policy 이전 reachability preflight", "Reachability preflight before policy")}>
              <span role="listitem">✓ route · gateway</span>
              <span role="listitem">✓ ip_forward</span>
              <span role="listitem">✓ NAT · conntrack</span>
              <span role="listitem">✓ return path</span>
            </div>
          </section>

          <section className="article-section" id="hooks">
            <div className="margin-label">02 — FINAL DESTINATION SELECTS THE HOOK</div>
            <h2>{t("interface에 들어왔다는 사실만으로 INPUT packet이 되지는 않습니다", "Arrival on an interface does not by itself make a packet INPUT traffic")}</h2>
            <p>{t(
              "routing decision 뒤 destination이 router 자신의 local address이면 INPUT, 다른 namespace나 host로 전달되면 FORWARD입니다. router process가 만든 packet은 OUTPUT을 통과합니다. chain 이름은 임의 문자열일 수 있으므로 실제 의미는 이름이 아니라 base chain의 `hook` 선언에서 읽어야 합니다.",
              "After routing, traffic destined for the router's own local address uses INPUT; traffic forwarded to another namespace or host uses FORWARD. Packets created by a router process use OUTPUT. Chain names are arbitrary strings, so read behavior from the base chain's `hook` declaration rather than its name.",
            )}</p>
            <div className="network-policy-hook-grid">
              <article><span>INPUT</span><strong>admin → router:22</strong><p>{t("router-local listener가 소비", "consumed by a router-local listener")}</p></article>
              <article><span>FORWARD</span><strong>client → app:8080</strong><p>{t("router를 지나 다른 endpoint로", "transits the router to another endpoint")}</p></article>
              <article><span>OUTPUT</span><strong>router process → DNS</strong><p>{t("local process가 생성", "originated by a local process")}</p></article>
            </div>
          </section>

          <section className="article-section" id="default-deny">
            <div className="margin-label">03 — EXPLICIT ALLOW · FAIL-CLOSED DEFAULT</div>
            <h2>{t("default-deny는 known bad 목록이 아니라 unmatched traffic의 계약입니다", "Default deny is a contract for unmatched traffic, not a known-bad list")}</h2>
            <p>{t(
              "필요한 flow를 source, destination, protocol, port와 connection state로 좁혀 allow한 뒤 base chain policy를 drop으로 둡니다. `tcp dport 22 drop`처럼 현재 아는 port만 막고 policy accept를 남기면 새로운 UDP service와 untracked packet이 계속 통과합니다. 표본 probe 통과와 fail-closed invariant를 둘 다 검사해야 합니다.",
              "Narrow required flows by source, destination, protocol, port, and connection state, then set the base-chain policy to drop. Denying only a known port such as `tcp dport 22 drop` while leaving policy accept still permits new UDP services and untracked packets. Validate both sampled probes and the fail-closed invariant.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("최소 허용 FORWARD chain 예시", "Least-allow FORWARD chain example")}>{`chain forward {
  type filter hook forward priority filter; policy drop;
  ct state established,related accept
  ip saddr 10.20.0.2 ip daddr 10.30.0.2 tcp dport 8080 ct state new accept
  counter drop
}`}</pre>
          </section>

          <section className="article-section" id="rule-order">
            <div className="margin-label">04 — ORDERED TERMINAL VERDICTS</div>
            <h2>{t("먼저 match한 drop은 뒤의 더 구체적인 allow에 기회를 주지 않습니다", "An earlier matching drop gives no opportunity to a later, more specific allow")}</h2>
            <p>{t(
              "counter나 log처럼 verdict가 없는 statement는 평가를 계속할 수 있지만 accept와 drop은 현재 chain의 terminal verdict입니다. 이 장은 hook마다 하나의 filter base chain만 사용해 chain priority와 jump graph를 제외하고, stateful allow → specific NEW allow → terminal drop 순서에 집중합니다.",
              "Statements without a verdict, such as counters or logs, may continue evaluation, while accept and drop are terminal verdicts for the current chain. This chapter uses one filter base chain per hook—leaving chain priority and jump graphs out of scope—to focus on stateful allow, specific NEW allow, then terminal drop.",
            )}</p>
            <div className="network-invariant-table" role="table" aria-label={t("ordered policy invariant", "Ordered policy invariants")}>
              <div role="row"><strong role="cell">01 · STATE</strong><span role="cell">ct state established,related accept</span></div>
              <div role="row"><strong role="cell">02 · NEW</strong><span role="cell">exact source → exact service accept</span></div>
              <div role="row"><strong role="cell">03 · FALLBACK</strong><span role="cell">counter drop · base policy drop</span></div>
            </div>
          </section>

          <section className="article-section" id="stateful-return">
            <div className="margin-label">05 — NEW REQUEST · ESTABLISHED REPLY</div>
            <h2>{t("reply port 범위를 여는 대신 기존 connection state를 허용합니다", "Allow existing connection state instead of opening a reply-port range")}</h2>
            <p>{t(
              "client의 NEW SYN이 exact service allow를 통과하면 app의 reply tuple은 conntrack에서 같은 flow의 reply direction으로 분류됩니다. reply destination port가 client의 ephemeral port라는 이유로 넓은 port range를 열지 않습니다. ESTABLISHED rule이 terminal drop보다 앞에 있어야 request와 reply가 함께 완성됩니다.",
              "Once the client's NEW SYN passes the exact service allow, conntrack classifies the app's reply tuple as the reply direction of that flow. Do not open a broad port range merely because the reply destination is a client ephemeral port. The ESTABLISHED rule must precede the terminal drop so request and reply both complete.",
            )}</p>
          </section>

          <section className="article-section" id="policy-lab">
            <div className="margin-label">06 — REQUIRED LEAST-ALLOW POLICY LAB</div>
            <h2>{t("FORWARD와 INPUT policy를 각각 최소 허용으로 완성하세요", "Complete FORWARD and INPUT as separate least-allow policies")}</h2>
            <p>{t(
              "각 mode에서 hook, base policy, stateful rule, allow 범위와 terminal order를 조립합니다. 실행 전에는 다섯 probe의 verdict를 숨기고 제출 뒤에만 matched rule과 ACCEPT·DROP 결과를 공개합니다. 두 mode를 모두 통과해야 활동이 완료됩니다.",
              "For each mode, assemble the hook, base policy, stateful rule, allow scope, and terminal order. The five probe verdicts stay hidden before execution; only submission reveals matched rules and ACCEPT or DROP outcomes. Both modes must pass to complete the activity.",
            )}</p>
            <NetworkPolicyLab onCompletionChange={setPolicyCompletion} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — DEBUG FOUR FIREWALL INCIDENTS</div>
            <h2>{t("rule을 더 넓히기 전에 packet이 본 hook과 첫 terminal verdict를 찾습니다", "Find the observed hook and first terminal verdict before widening a rule")}</h2>
            <p>{t(
              "wrong hook, deny-before-allow, missing ESTABLISHED rule과 policy accept leak을 같은 evaluator로 다시 실행합니다. router INPUT을 불필요하게 열거나 모든 ephemeral port를 허용하는 우회책은 통과하지 않습니다.",
              "Re-execute a wrong hook, deny-before-allow, missing ESTABLISHED rule, and policy-accept leak through the same evaluator. Workarounds that unnecessarily open router INPUT or every ephemeral port do not pass.",
            )}</p>
            <NetworkPolicyIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">08 — OPTIONAL REAL NFTABLES OBSERVATION</div>
            <h2>{t("실제 Linux에서는 hook 선언·handle·counter를 함께 기록합니다", "On real Linux, record hook declarations, handles, and counters together")}</h2>
            <p>{t(
              "권한이 있는 disposable Linux 환경에서만 아래 read-only 관찰을 시도하세요. ruleset 이름과 counter는 환경마다 다르며 root shell은 완료 조건이 아닙니다. 브라우저 policy model이 모든 필수 학습의 결정적 가상 환경입니다.",
              "Try the read-only observations below only in a disposable Linux environment with suitable permission. Ruleset names and counters vary, and a root shell is not a completion requirement. The browser policy model is the deterministic virtual environment for every required objective.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("선택 nftables 관찰 명령", "Optional nftables observation commands")}>{`nft -nn -a list ruleset
nft -nn -a list chain inet filter input
nft -nn -a list chain inet filter forward
conntrack -L -o extended`}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER TO DISCOVERY · LOAD BALANCING</div>
            <h2>{t("endpoint가 바뀌면 policy identity와 stable entry point도 다시 설계해야 합니다", "Changing endpoints force a redesign of policy identity and stable entry points")}</h2>
            <div className="network-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "app replica가 늘고 주소가 바뀐다고 가정하세요. 모든 backend IP를 firewall에 수동 추가하는 대신 어떤 stable service entry point를 허용할지, health check traffic과 client traffic을 어떻게 구분할지, stale endpoint allow를 어떤 evidence로 찾을지 적으세요.",
                "Assume app replicas multiply and addresses change. Instead of manually adding every backend IP to the firewall, identify which stable service entry point to allow, how to separate health-check traffic from client traffic, and which evidence reveals a stale endpoint allow.",
              )}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">10 — CONCEPT CHECK</div>
            <NetworkPolicyConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-completion-checklist" role="status" aria-live="polite">
              <span className={policyCompletion.forward ? "is-complete" : undefined}>{policyCompletion.forward ? "✓" : "○"} {t("FORWARD policy 통과", "FORWARD policy passed")}</span>
              <span className={policyCompletion.input ? "is-complete" : undefined}>{policyCompletion.input ? "✓" : "○"} {t("INPUT policy 통과", "INPUT policy passed")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 firewall 사건 수리", "Four firewall incidents repaired")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG}
              slug="network-policy-and-firewalls"
              canComplete={canComplete}
              lockedMessage={t(
                "FORWARD·INPUT policy, 네 사건과 다섯 개념 확인을 모두 완료하세요.",
                "Complete both FORWARD and INPUT policies, all four incidents, and all five concept checks.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={egressPreviewHref}>← {t("이전: egress·NAT·conntrack", "Previous: Egress, NAT, and conntrack")}</a>
            ) : (
              <span>← {t("이전: egress·NAT·conntrack", "Previous: Egress, NAT, and conntrack")}</span>
            )}
            {preview ? (
              <a href={serviceDiscoveryPreviewHref}>{t("다음: 서비스 탐색과 load balancing", "Next: Service discovery and load balancing")} →</a>
            ) : (
              <span>{t("다음: 서비스 탐색과 load balancing", "Next: Service discovery and load balancing")} →</span>
            )}
          </nav>
          <noscript>{t(
            "policy 활동에는 JavaScript가 필요합니다. 위의 hook·default-deny·stateful reply 설명과 nftables 관찰 명령은 계속 읽을 수 있습니다.",
            "The policy activities require JavaScript. The hook, default-deny, and stateful-reply explanations plus nftables observation commands remain readable.",
          )}</noscript>
        </article>
      </div>
    </main>
  );
}

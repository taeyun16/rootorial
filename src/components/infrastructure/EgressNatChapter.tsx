import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { INFRASTRUCTURE_CURRICULUM_SLUG, infrastructureChaptersEn, infrastructureChaptersKo } from "../../data/curriculum";
import { canCompleteEgressNatChapter } from "../../features/infrastructure/egress-nat";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { EgressNatConceptCheck } from "./EgressNatConceptCheck";
import { NatConntrackIncidentLab } from "./NatConntrackIncidentLab";
import { NatConntrackLab } from "./NatConntrackLab";
import "./egress-nat.css";

const tocItems = {
  ko: [
    { id: "route-before-nat", label: "NAT보다 먼저 route" },
    { id: "snat-masquerade", label: "SNAT와 MASQUERADE" },
    { id: "conntrack-binding", label: "conntrack tuple binding" },
    { id: "reply-path", label: "stateful reply path" },
    { id: "nat-lab", label: "필수 egress flow lab" },
    { id: "incidents", label: "네 NAT 사건" },
    { id: "real-linux", label: "선택 Linux 관찰" },
    { id: "transfer", label: "firewall policy로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "route-before-nat", label: "Routing before NAT" },
    { id: "snat-masquerade", label: "SNAT and masquerade" },
    { id: "conntrack-binding", label: "Conntrack tuple binding" },
    { id: "reply-path", label: "Stateful reply path" },
    { id: "nat-lab", label: "Required egress flow lab" },
    { id: "incidents", label: "Four NAT incidents" },
    { id: "real-linux", label: "Optional Linux observation" },
    { id: "transfer", label: "Transfer to firewall policy" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function EgressNatChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "egress-nat-and-conntrack");
  const chapter = chapters[chapterIndex];
  const [modeCompletion, setModeCompletion] = useState({ snat: false, masquerade: false });
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteEgressNatChapter({ snatComplete: modeCompletion.snat, masqueradeComplete: modeCompletion.masquerade, incidentsComplete, conceptsMastered });
  const previousHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/veth-bridges-and-routing${isKo ? "" : "?lang=en"}`;
  const nextHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/network-policy-and-firewalls${isKo ? "" : "?lang=en"}`;
  const tuples = [
    "ORIGINAL    10.20.0.2:41000 → 198.51.100.20:443",
    "TRANSLATED  203.0.113.10:61000 → 198.51.100.20:443",
    "REPLY       198.51.100.20:443 → 203.0.113.10:61000",
    "RESTORED    198.51.100.20:443 → 10.20.0.2:41000",
  ].join("\n");
  const observations = ["nft -nn -a list ruleset", "conntrack -L -o extended", "ip route get 198.51.100.20", "ip -br address show wan0"].join("\n");

  return (
    <main className="chapter-shell infrastructure-chapter-shell egress-nat-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}><RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span></Link>
        <div className="chapter-header-actions"><span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span><div className="chapter-progress-label"><span>CHAPTER 03</span><div className="mini-progress"><span style={{ width: `${(3 / chapters.length) * 100}%` }} /></div><span>3 / {chapters.length}</span></div><LanguageSwitcher compact /><AuthControls compact /></div>
      </header>
      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero egress-nat-lesson-hero">
            <p className="eyebrow">ROUTE → POSTROUTING → SOURCE TRANSLATION → CONNTRACK REPLY · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">03</div><h1>{chapter.title}</h1>
            <p className="lesson-deck">{t("앞 장에서 완성한 왕복 route 위에 source translation을 한 겹 추가합니다. packet의 original·translated·reply·restored tuple을 직접 실행해 NAT가 route를 대신하지 않으며 reply도 같은 stateful 경계를 지나야 함을 증명합니다.", "Add one source-translation layer to the round-trip route from the prior chapter. Execute the original, translated, reply, and restored tuples to prove that NAT does not replace routing and that replies must cross the same stateful boundary.")}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives"><span>{t("학습 목표", "LEARNING OBJECTIVES")}</span><ul><li>{t("route lookup, forwarding과 source NAT의 실행 순서를 구분한다.", "Separate route lookup, forwarding, and source-NAT execution order.")}</li><li>{t("고정 egress에는 SNAT, 동적 address에는 MASQUERADE를 선택한다.", "Choose SNAT for fixed egress and masquerade for dynamic addresses.")}</li><li>{t("conntrack original·reply tuple로 reverse translation을 설명한다.", "Explain reverse translation through conntrack original and reply tuples.")}</li><li>{t("asymmetric return과 stale address 사건을 최초 실패 경계에서 진단한다.", "Diagnose asymmetric return and stale-address incidents at the first failed boundary.")}</li></ul></div>
          </header>

          <section className="article-section" id="route-before-nat"><div className="margin-label">01 — ROUTE BEFORE TRANSLATION</div><h2>{t("NAT는 missing route나 disabled forwarding을 수리하지 않습니다", "NAT does not repair a missing route or disabled forwarding")}</h2><p>{t("kernel은 destination route로 output interface를 먼저 선택합니다. transit packet이라면 router namespace의 IP forwarding도 켜져 있어야 합니다. 그 뒤 postrouting source-NAT rule이 선택된 egress에서 source identity만 바꿉니다. route·forwarding·translation은 서로 대체할 수 없는 세 contract입니다.", "The kernel first selects an output interface from the destination route. A transit packet also requires IP forwarding in the router namespace. Only then does a postrouting source-NAT rule change the source identity on the selected egress. Routing, forwarding, and translation are three separate contracts.")}</p><div className="nat-contract-strip"><span>1 · ROUTE LOOKUP</span><span>2 · IP FORWARD</span><span>3 · POSTROUTING NAT</span></div></section>

          <section className="article-section" id="snat-masquerade"><div className="margin-label">02 — ADDRESS LIFETIME CHOOSES THE TARGET</div><h2>{t("고정 주소는 SNAT, 변하는 egress 주소는 MASQUERADE로 표현합니다", "Use SNAT for fixed addresses and masquerade for a changing egress address")}</h2><p>{t("SNAT target은 gateway가 실제 소유하고 upstream이 reply할 수 있는 고정 address여야 합니다. DHCP나 임시 lease처럼 wan0 address가 바뀐다면 MASQUERADE가 flow 생성 시점의 현재 interface address를 선택합니다. 이 장은 단일 public-address gateway만 다룹니다.", "An SNAT target must be a fixed address owned by the gateway and reachable by upstream replies. If the wan0 address changes with DHCP or a temporary lease, masquerade selects the current interface address when the flow is created. This chapter scopes itself to a single-public-address gateway.")}</p><div className="network-invariant-table" role="table" aria-label={t("SNAT와 MASQUERADE 비교", "SNAT and masquerade comparison")}><div role="row"><strong role="cell">SNAT</strong><span role="cell">static 203.0.113.10 · explicit target</span></div><div role="row"><strong role="cell">MASQUERADE</strong><span role="cell">dynamic wan0 lease · derived target</span></div></div></section>

          <section className="article-section" id="conntrack-binding"><div className="margin-label">03 — ONE FLOW, TWO DIRECTIONS</div><h2>{t("첫 packet이 NAT binding을 만들고 후속 packet은 그 state를 재사용합니다", "The first packet creates a NAT binding that later packets reuse")}</h2><p>{t("conntrack은 private original tuple과 public reply tuple을 한 flow entry에 연결합니다. external service는 translated source만 봅니다. reply가 그 public tuple로 돌아오면 같은 entry를 조회해 destination을 original private client로 복원합니다. 매 packet마다 새로운 unrelated translation을 만드는 모델이 아닙니다.", "Conntrack joins the private original tuple and public reply tuple in one flow entry. The external service sees only the translated source. When the reply returns to that public tuple, the same entry restores the destination to the original private client. It does not create an unrelated translation for every packet.")}</p><pre className="network-observation-command">{tuples}</pre></section>

          <section className="article-section" id="reply-path"><div className="margin-label">04 — STATEFUL RETURN IS A PATH CONTRACT</div><h2>{t("reply는 original conntrack state를 가진 gateway를 지나야 합니다", "The reply must traverse the gateway that owns the original conntrack state")}</h2><p>{t("forward packet이 nat-gw-a에서 translation됐는데 reply가 nat-gw-b로 돌아오면 두 번째 gateway에는 original mapping이 없습니다. upstream return route, 같은 stateful router, private subnet return route를 각각 확인해야 합니다. one-way external 도착은 왕복 egress 연결이 아닙니다.", "If the forward packet is translated at nat-gw-a but the reply returns through nat-gw-b, the second gateway lacks the original mapping. Verify the upstream return route, the same stateful router, and the private-subnet return route separately. One-way external arrival is not round-trip egress connectivity.")}</p></section>

          <section className="article-section" id="nat-lab"><div className="margin-label">05 — REQUIRED EGRESS FLOW LAB</div><h2>{t("static SNAT와 dynamic MASQUERADE flow를 모두 조립하세요", "Assemble both static-SNAT and dynamic-masquerade flows")}</h2><p>{t("control을 바꿀 때마다 이전 실행 결과는 무효화됩니다. 실행 전에는 topology와 tuple 후보만 보이고 hop verdict와 conntrack state는 숨깁니다. 결과를 먼저 예측한 뒤 request와 reply를 실행해 두 mode를 각각 통과하세요.", "Changing any control invalidates the prior run. Before execution, only topology and tuple candidates are visible; hop verdicts and conntrack state stay hidden. Predict the result, run request and reply, and pass both modes.")}</p><NatConntrackLab onCompletionChange={setModeCompletion} /></section>

          <section className="article-section" id="incidents"><div className="margin-label">06 — DEBUG FOUR NAT AND CONNTRACK INCIDENTS</div><h2>{t("넓은 우회책 대신 최초 실패 translation invariant를 수리합니다", "Repair the first failed translation invariant instead of adding a broad workaround")}</h2><p>{t("wrong hook, unowned address, asymmetric reply와 dynamic-address mismatch를 같은 evaluator로 다시 실행합니다. private address 광고, conntrack 비활성화 또는 expired address 재고정은 요구사항을 지우므로 통과하지 않습니다.", "Re-execute a wrong hook, unowned address, asymmetric reply, and dynamic-address mismatch through the same evaluator. Advertising the private address, disabling conntrack, or repinning an expired address erases the requirement and does not pass.")}</p><NatConntrackIncidentLab onCompletionChange={setIncidentsComplete} /></section>

          <section className="article-section" id="real-linux"><div className="margin-label">07 — OPTIONAL REAL NFTABLES OBSERVATION</div><h2>{t("실제 Linux에서는 rule handle과 conntrack tuple을 읽기 전용으로 맞춥니다", "On real Linux, align read-only rule handles with conntrack tuples")}</h2><p>{t("권한이 있는 disposable Linux 환경에서만 아래 관찰을 사용하세요. root shell과 외부 network는 완료 조건이 아니며 브라우저 packet-state model이 필수 학습을 재현합니다.", "Use these observations only in a disposable Linux environment with suitable permission. A root shell and external network are not completion requirements; the browser packet-state model reproduces all required learning.")}</p><pre className="network-observation-command">{observations}</pre></section>

          <section className="article-section" id="transfer"><div className="margin-label">08 — TRANSFER TO LEAST-ALLOW POLICY</div><h2>{t("연결 가능한 route와 stateful NAT 위에 firewall policy를 추가합니다", "Add firewall policy on top of reachable routes and stateful NAT")}</h2><div className="network-transfer-task"><strong>{t("전이 과제", "TRANSFER TASK")}</strong><p>{t("현재 왕복 flow를 유지하면서 client의 443 egress만 허용하고 router 자체 listener는 열지 않는다고 가정하세요. transit packet을 보는 hook, established reply rule과 default verdict를 분리해 적으세요.", "Keep this round-trip flow while allowing only client egress to port 443 without opening a router-local listener. Identify the transit hook, established-reply rule, and default verdict separately.")}</p></div></section>

          <section className="article-section concept-check" id="check"><div className="margin-label">09 — CONCEPT CHECK</div><EgressNatConceptCheck onMasteryChange={setConceptsMastered} /><div className="network-completion-checklist" role="status" aria-live="polite"><span className={modeCompletion.snat ? "is-complete" : undefined}>{modeCompletion.snat ? "✓" : "○"} {t("static SNAT mode", "Static SNAT mode")}</span><span className={modeCompletion.masquerade ? "is-complete" : undefined}>{modeCompletion.masquerade ? "✓" : "○"} {t("dynamic MASQUERADE mode", "Dynamic masquerade mode")}</span><span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 egress 사건", "Four egress incidents")}</span><span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("다섯 개념", "Five concepts")}</span></div><CompleteChapter curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG} slug="egress-nat-and-conntrack" canComplete={canComplete} lockedMessage={t("두 NAT mode, 네 사건과 다섯 개념 확인을 모두 완료하세요.", "Complete both NAT modes, four incidents, and all five concept checks.")} /></section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>{preview ? <a href={previousHref}>← {t("이전: veth·bridge·routing", "Previous: veth, bridges, and routing")}</a> : <span>← {t("이전: veth·routing", "Previous: veth and routing")}</span>}{preview ? <a href={nextHref}>{t("다음: 네트워크 정책과 firewall", "Next: Network policy and firewalls")} →</a> : <span>{t("다음: 네트워크 정책과 firewall", "Next: Network policy and firewalls")} →</span>}</nav>
          <noscript>{t("NAT 활동에는 JavaScript가 필요합니다. 위의 tuple lifecycle과 선택 관찰 명령은 계속 읽을 수 있습니다.", "The NAT activities require JavaScript. The tuple lifecycle and optional observation commands remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}

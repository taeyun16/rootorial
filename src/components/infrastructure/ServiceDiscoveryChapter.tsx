import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteServiceDiscoveryChapter } from "../../features/infrastructure/service-discovery";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { ServiceDiscoveryConceptCheck } from "./ServiceDiscoveryConceptCheck";
import { ServiceDiscoveryIncidentLab } from "./ServiceDiscoveryIncidentLab";
import { ServicePathLab } from "./ServicePathLab";
import "./ServiceDiscoveryChapter.css";

const tocItems = {
  ko: [
    { id: "stable-name", label: "stable name과 endpoint" },
    { id: "ttl", label: "DNS TTL lifecycle" },
    { id: "vip", label: "VIP와 L4 entry" },
    { id: "health", label: "health와 eligibility" },
    { id: "affinity", label: "selection과 affinity" },
    { id: "service-lab", label: "필수 service-path lab" },
    { id: "incidents", label: "네 service 사건" },
    { id: "real-linux", label: "선택 Linux 관찰" },
    { id: "transfer", label: "failure domain으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "stable-name", label: "Stable name and endpoint" },
    { id: "ttl", label: "DNS TTL lifecycle" },
    { id: "vip", label: "VIP and Layer 4 entry" },
    { id: "health", label: "Health and eligibility" },
    { id: "affinity", label: "Selection and affinity" },
    { id: "service-lab", label: "Required service-path lab" },
    { id: "incidents", label: "Four service incidents" },
    { id: "real-linux", label: "Optional Linux observation" },
    { id: "transfer", label: "Transfer to failure domains" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function ServiceDiscoveryChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "service-discovery-and-load-balancing");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labCompletion, setLabCompletion] = useState({ dns: false, affinity: false });
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteServiceDiscoveryChapter({
    dnsLifecycleComplete: labCompletion.dns,
    healthAffinityComplete: labCompletion.affinity,
    incidentsComplete,
    conceptsMastered,
  });
  const policyPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/network-policy-and-firewalls${isKo ? "" : "?lang=en"}`;
  const availabilityPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/availability-and-failure-domains${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell service-discovery-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}><RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span></Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
          <div className="chapter-progress-label"><span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span><div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div><span>{chapterNumber} / {chapters.length}</span></div>
          <LanguageSwitcher compact /><AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero service-discovery-lesson-hero">
            <p className="eyebrow">NAME → TTL CACHE → L4 VIP → HEALTHY SET → CONNECTION · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">05</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "앞 장까지 namespace 사이의 path와 policy를 만들었습니다. 이제 움직이는 app endpoint를 직접 외우지 않고 stable name과 VIP 뒤에 두되, DNS cache lifetime·health eligibility·L4 affinity를 서로 다른 상태로 실행해 stale endpoint가 선택되는 최초 경계를 찾습니다.",
              "The prior chapters built paths and policy between namespaces. Now place changing app endpoints behind a stable name and VIP, then execute DNS cache lifetime, health eligibility, and Layer 4 affinity as separate states to locate the first boundary that selects a stale endpoint.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives"><span>{t("학습 목표", "LEARNING OBJECTIVES")}</span><ul>
              <li>{t("authority record 변경과 resolver cache 만료를 분리하고 TTL 경계값을 판정할 수 있다.", "Separate authority-record change from resolver-cache expiry and judge the exact TTL boundary.")}</li>
              <li>{t("stable name, VIP listener와 backend endpoint를 서로 다른 service-path object로 추적할 수 있다.", "Track the stable name, VIP listener, and backend endpoints as distinct service-path objects.")}</li>
              <li>{t("registered·healthy·draining state를 분리해 신규 connection candidate set을 만들 수 있다.", "Separate registered, healthy, and draining state to build the new-connection candidate set.")}</li>
              <li>{t("L4 selection이 HTTP request가 아니라 connection flow에 적용됨을 설명할 수 있다.", "Explain that Layer 4 selection applies to connection flows rather than individual HTTP requests.")}</li>
              <li>{t("sticky target 실패 뒤 affinity를 현재 healthy set에서 재매핑할 수 있다.", "Remap affinity against the current healthy set after a sticky target fails.")}</li>
            </ul></div>
          </header>

          <section className="article-section" id="stable-name">
            <div className="margin-label">01 — THREE DIFFERENT IDENTITIES</div>
            <h2>{t("service name, entry point와 backend 주소는 같은 값이 아닙니다", "A service name, entry point, and backend address are not the same value")}</h2>
            <p>{t(
              "client는 `api.internal`이라는 name을 알고, resolver는 그 name을 stable VIP 10.40.0.20으로 해석합니다. L4 load balancer는 VIP로 들어온 새 connection을 app-a·app-b·app-c 중 eligible endpoint 하나로 보냅니다. 이 세 identity를 합치면 DNS answer가 있다는 이유만으로 backend health까지 통과했다고 오판하게 됩니다.",
              "The client knows the name `api.internal`; the resolver maps that name to the stable VIP 10.40.0.20. A Layer 4 load balancer sends each new VIP connection to one eligible endpoint among app-a, app-b, and app-c. Collapsing these three identities incorrectly turns a DNS answer into proof of backend health.",
            )}</p>
            <div className="service-contract-grid"><article><span>DISCOVERY</span><strong>api.internal</strong><p>{t("resolver가 cache할 name→address record", "A name-to-address record cached by the resolver")}</p></article><article><span>ENTRY</span><strong>10.40.0.20:8080</strong><p>{t("client connection이 향하는 stable VIP listener", "The stable VIP listener reached by client connections")}</p></article><article><span>DELIVERY</span><strong>app-a / b / c</strong><p>{t("health state로 후보가 바뀌는 backend pool", "A backend pool whose candidates change with health state")}</p></article></div>
          </section>

          <section className="article-section" id="ttl">
            <div className="margin-label">02 — DNS TTL IS A CACHE CONTRACT</div>
            <h2>{t("authority 변경은 fresh resolver cache를 원격으로 지우지 않습니다", "An authority change does not remotely erase a fresh resolver cache")}</h2>
            <p>{t(
              "cached_at=100, TTL=60이면 record는 `now < 160` 동안 fresh입니다. 따라서 t=159에는 기존 10.40.0.10을 쓰고 t=160부터 authority의 10.40.0.20을 다시 얻습니다. 이 결정적 실습은 authority가 응답하고 resolver의 serve-stale 정책이 꺼진 정상 refresh 경계를 모델링합니다. refresh 실패 때 만료 데이터를 제한적으로 다시 쓰는 RFC 8767 정책은 별도 운영 예외입니다. migration은 이 최대 cache lifetime을 고려해 기존 VIP를 적어도 t=160까지 유지해야 합니다. TTL을 짧게 하는 것과 health check는 서로 대체할 수 없습니다.",
              "With cached_at=100 and TTL=60, the record is fresh while `now < 160`. The resolver therefore uses the old 10.40.0.10 at t=159 and refreshes to the authority's 10.40.0.20 at t=160. This deterministic lab models a normal refresh with a reachable authority and serve-stale disabled; RFC 8767 permits limited reuse of expired data as a separate refresh-failure policy. A migration must keep the old VIP through that maximum cache lifetime. A short TTL and a health check do not replace each other.",
            )}</p>
            <div className="service-invariant-table" role="table" aria-label={t("DNS TTL invariant", "DNS TTL invariants")}><div role="row"><strong role="cell">FRESH</strong><span role="cell">now &lt; cached_at + TTL</span></div><div role="row"><strong role="cell">EXPIRED</strong><span role="cell">now ≥ cached_at + TTL → authority refresh</span></div><div role="row"><strong role="cell">MODEL</strong><span role="cell">{t("authority 응답 · serve-stale 끔", "authority reachable · serve-stale off")}</span></div><div role="row"><strong role="cell">ROLLOUT</strong><span role="cell">old VIP lifetime ≥ maximum valid cache lifetime</span></div></div>
          </section>

          <section className="article-section" id="vip">
            <div className="margin-label">03 — L4 VIP IS A CONNECTION ENTRY POINT</div>
            <h2>{t("DNS는 entry address를 찾고 L4 balancer는 새 flow의 endpoint를 선택합니다", "DNS finds the entry address; the Layer 4 balancer selects an endpoint for a new flow")}</h2>
            <p>{t(
              "VIP listener가 열려 있어야 이름 해석 뒤 transport connection이 시작됩니다. L4 selector는 source/destination address와 port 같은 flow 정보에서 backend를 고르고 그 connection의 packet을 같은 target으로 보냅니다. HTTP keep-alive 안의 request마다 별도 L7 routing이 일어난다고 가정해서는 안 됩니다.",
              "The VIP listener must be open before a resolved name can begin a transport connection. A Layer 4 selector chooses a backend from flow information such as source and destination addresses and ports, then keeps packets for that connection on the target. Do not assume separate Layer 7 routing for every request inside HTTP keep-alive.",
            )}</p>
          </section>

          <section className="article-section" id="health">
            <div className="margin-label">04 — REGISTRATION IS NOT READINESS</div>
            <h2>{t("pool에 존재하는 backend와 신규 flow를 받을 backend를 분리합니다", "Separate backends present in the pool from backends eligible for new flows")}</h2>
            <p>{t(
              "registered는 control plane이 endpoint를 알고 있다는 뜻입니다. health probe는 실제 backend namespace의 service port에서 readiness를 관찰해야 하며, draining은 기존 connection을 마치되 새 connection을 받지 않는 상태입니다. 이 챕터의 candidate invariant는 `registered && healthy && !draining`입니다.",
              "Registered means the control plane knows the endpoint. A health probe must observe readiness at the real service port in the backend namespace. Draining allows existing connections to finish while rejecting new ones. This chapter's candidate invariant is `registered && healthy && !draining`.",
            )}</p>
            <div className="service-health-grid"><article><span>REGISTERED</span><strong>discovered</strong><p>{t("pool membership 사실", "Pool-membership fact")}</p></article><article><span>HEALTHY</span><strong>probe passed</strong><p>{t("현재 service readiness 증거", "Current service-readiness evidence")}</p></article><article><span>DRAINING</span><strong>no new flow</strong><p>{t("기존 flow만 종료", "Only existing flows finish")}</p></article></div>
          </section>

          <section className="article-section" id="affinity">
            <div className="margin-label">05 — AFFINITY STAYS INSIDE THE HEALTHY SET</div>
            <h2>{t("sticky mapping은 continuity를 주지만 health를 무효화할 권한은 없습니다", "A sticky mapping provides continuity but cannot override health")}</h2>
            <p>{t(
              "round-robin은 eligible set에 새 flow를 순환 배치합니다. source affinity는 같은 key를 같은 endpoint에 안정적으로 매핑해 session-local state가 있는 workload의 연속성을 도울 수 있지만 분산이 고르지 않을 수 있습니다. 어느 algorithm이든 target이 unhealthy가 되면 현재 eligible set에서 다시 선택해야 합니다.",
              "Round robin rotates new flows across the eligible set. Source affinity maps the same key to the same endpoint, which can preserve continuity for workloads with session-local state but may skew distribution. Under either algorithm, an unhealthy target must be reselected from the current eligible set.",
            )}</p>
          </section>

          <section className="article-section" id="service-lab">
            <div className="margin-label">06 — REQUIRED SERVICE-PATH LAB</div>
            <h2>{t("TTL handoff와 health-aware affinity를 둘 다 실행하세요", "Execute both TTL handoff and health-aware affinity")}</h2>
            <p>{t("첫 mode는 정확한 TTL 경계 전후의 answer와 VIP drain window를 판정합니다. 두 번째 mode는 unhealthy backend를 제외하고 같은 client flow를 유지한 뒤 sticky target 실패를 재매핑합니다.", "The first mode judges answers and the VIP drain window around the exact TTL boundary. The second excludes unhealthy backends, preserves same-client affinity, then remaps after the sticky target fails.")}</p>
            <ServicePathLab onCompletionChange={setLabCompletion} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — DEBUG FOUR SERVICE-PATH INCIDENTS</div>
            <h2>{t("stale endpoint 증상을 최초 실패 control-plane invariant로 수리합니다", "Repair stale-endpoint symptoms at the first failed control-plane invariant")}</h2>
            <p>{t("DNS cache, probe scope, health candidate set과 affinity mapping은 독립적으로 실패할 수 있습니다. 넓은 restart나 retry 대신 해당 state만 바꾸세요.", "DNS cache, probe scope, the health candidate set, and affinity mapping can fail independently. Change the failing state instead of reaching for a broad restart or retry.")}</p>
            <ServiceDiscoveryIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">08 — OPTIONAL LINUX OBSERVATION</div>
            <h2>{t("resolver·VIP·backend 증거를 각각의 namespace에서 읽습니다", "Read resolver, VIP, and backend evidence in their own namespaces")}</h2>
            <p>{t("named namespace와 필요한 권한이 있을 때만 아래 read-only 관찰을 시도하세요. 실제 DNS cache 구현과 health checker는 환경마다 다르며 외부 network나 root access는 완료 조건이 아닙니다. 브라우저 model이 모든 필수 학습의 결정적 fallback입니다.", "Try these read-only observations only with named namespaces and suitable permission. Real DNS caches and health checkers vary by environment; external networking and root access are not completion requirements. The browser model is the deterministic fallback for all required learning.")}</p>
            <pre className="network-observation-command" aria-label={t("선택 service discovery 관찰 명령", "Optional service-discovery observation commands")}>{`dig +noall +answer api.internal
getent ahostsv4 api.internal
ip netns exec edge ss -lnt '( sport = :8080 )'
ip netns exec app-a ss -lnt '( sport = :8080 )'
ip netns exec app-b ss -lnt '( sport = :8080 )'
ip netns exec app-c ss -lnt '( sport = :8080 )'`}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER TO AVAILABILITY</div>
            <h2>{t("healthy endpoint 수가 많아도 하나의 failure domain에 몰리면 함께 사라집니다", "Many healthy endpoints still disappear together when placed in one failure domain")}</h2>
            <div className="service-transfer-task"><strong>{t("전이 과제", "TRANSFER TASK")}</strong><p>{t("현재 app-a·app-b·app-c와 두 gateway가 모두 같은 host에 있다고 가정하세요. 이 챕터의 DNS와 health model은 process failure를 우회할 수 있지만 host failure 뒤에는 healthy candidate가 없습니다. 다음 장에서 gateway와 replica를 독립 domain에 배치하고 database failover와 optional dependency degraded mode까지 포함한 실제 request availability를 계산합니다.", "Assume app-a, app-b, app-c, and both gateways all share one host. This chapter's DNS and health model can route around a process failure, but a host failure leaves no healthy candidate. The next chapter places gateways and replicas in independent domains, then computes actual request availability including database failover and an optional-dependency degraded mode.")}</p></div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">10 — CONCEPT CHECK</div>
            <ServiceDiscoveryConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-completion-checklist" role="status" aria-live="polite">
              <span className={labCompletion.dns ? "is-complete" : undefined}>{labCompletion.dns ? "✓" : "○"} {t("DNS TTL lifecycle mode", "DNS TTL lifecycle mode")}</span>
              <span className={labCompletion.affinity ? "is-complete" : undefined}>{labCompletion.affinity ? "✓" : "○"} {t("health-aware affinity mode", "Health-aware affinity mode")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("service-path 사건 진단", "Service-path incident diagnosis")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span>
            </div>
            <CompleteChapter curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG} slug="service-discovery-and-load-balancing" canComplete={canComplete} lockedMessage={t("두 service-path mode, 네 사건과 다섯 개념 확인을 모두 완료하세요.", "Complete both service-path modes, all four incidents, and all five concept checks.")} />
          </section>

          <CitationSection
            citations={[
              {
                title: "Designing Data-Intensive Applications (Kleppmann, 2017)",
                url: "https://dataintensive.net/",
              },
              {
                title: "Site Reliability Engineering (Google SRE Book)",
                url: "https://sre.google/sre-book/table-of-contents/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={policyPreviewHref}>← {t("이전: 네트워크 정책과 firewall", "Previous: Network policy and firewalls")}</a> : <span>← {t("이전: 네트워크 정책과 firewall", "Previous: Network policy and firewalls")}</span>}
            {preview ? <a href={availabilityPreviewHref}>{t("다음: 가용성과 failure domain", "Next: Availability and failure domains")} →</a> : <span>{t("다음: 가용성과 failure domain", "Next: Availability and failure domains")} →</span>}
          </nav>
          <noscript>{t("service-path 활동에는 JavaScript가 필요합니다. 위 설명, invariant 표와 Linux 관찰 명령은 계속 읽을 수 있습니다.", "The service-path activities require JavaScript. The explanation, invariant table, and Linux observation commands remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}

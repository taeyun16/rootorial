import { Link } from "@tanstack/react-router";
import { useState } from "react";
import "./NamespacePlatformChapter.css";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteNamespacePlatformChapter } from "../../features/infrastructure/namespace-platform";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { NamespacePlatformConceptCheck } from "./NamespacePlatformConceptCheck";
import { NamespacePlatformIncidentLab } from "./NamespacePlatformIncidentLab";
import { NamespacePlatformLab, type NamespacePlatformLabCompletion } from "./NamespacePlatformLab";

const tocItems = {
  ko: [
    { id: "requirements", label: "요구사항을 executable contract로" },
    { id: "evidence", label: "versioned evidence receipt" },
    { id: "boundaries", label: "client·edge·app·data 경계" },
    { id: "paths", label: "ingress·service·egress path" },
    { id: "failure-capacity", label: "zone 장애·900 rps" },
    { id: "namespace-platform-lab", label: "필수 platform studio" },
    { id: "incidents", label: "네 architecture 사건" },
    { id: "linux-transfer", label: "선택 Linux 실험" },
    { id: "decision-record", label: "architecture decision record" },
    { id: "check", label: "최종 이해 확인" },
  ],
  en: [
    { id: "requirements", label: "Requirements as executable contracts" },
    { id: "evidence", label: "Versioned evidence receipts" },
    { id: "boundaries", label: "Client, edge, app, and data boundaries" },
    { id: "paths", label: "Ingress, service, and egress paths" },
    { id: "failure-capacity", label: "Zone failure and 900 rps" },
    { id: "namespace-platform-lab", label: "Required platform studio" },
    { id: "incidents", label: "Four architecture incidents" },
    { id: "linux-transfer", label: "Optional Linux experiment" },
    { id: "decision-record", label: "Architecture decision record" },
    { id: "check", label: "Final concept check" },
  ],
} as const;

const initialLabCompletion: NamespacePlatformLabCompletion = {
  evidence: false,
  normal: false,
  egress: false,
  failure: false,
  peak: false,
};

export function NamespacePlatformChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "assemble-a-namespace-platform");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labCompletion, setLabCompletion] = useState(initialLabCompletion);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNamespacePlatformChapter({
    evidenceComplete: labCompletion.evidence,
    normalRequestComplete: labCompletion.normal,
    privateEgressComplete: labCompletion.egress,
    zoneFailureComplete: labCompletion.failure,
    peakLoadComplete: labCompletion.peak,
    incidentsComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/network-observability-and-capacity${isKo ? "" : "?lang=en"}`;
  const curriculumPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell namespace-platform-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
          <div className="chapter-progress-label"><span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span><div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div><span>{chapterNumber} / {chapters.length}</span></div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero infrastructure-lesson-hero namespace-platform-lesson-hero">
            <p className="eyebrow">REQUIREMENTS → BOUNDARIES → PATHS → FAILURE → EVIDENCE · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">08</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "마지막 장은 앞의 lab을 복사해 붙이지 않습니다. client·edge·app·data namespace를 하나의 플랫폼으로 조립하고, 각 요구사항을 어느 evaluator와 evidence receipt가 입증하는지 연결합니다. 정상 요청만 성공하는 그림이 아니라 private egress, zone A 상실과 900 rps peak까지 실행 가능한 architecture contract를 만듭니다.",
              "The final chapter does not copy the earlier labs. It assembles client, edge, app, and data namespaces into one platform, then connects each requirement to the evaluator and evidence receipt that proves it. The result is an executable architecture contract covering private egress, loss of Zone A, and a 900-rps peak—not merely a diagram where the happy path works.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives"><span>{t("학습 목표", "LEARNING OBJECTIVES")}</span><ul>
              <li>{t("모호한 architecture 문장을 packet path와 observable invariant로 바꿀 수 있다.", "Translate ambiguous architecture statements into packet paths and observable invariants.")}</li>
              <li>{t("public edge와 private app·data의 exposure boundary를 최소 허용으로 설계할 수 있다.", "Design least-allow exposure boundaries for a public edge and private app/data services.")}</li>
              <li>{t("ingress, 내부 service path와 stateful private egress를 서로 다른 contract로 검증할 수 있다.", "Verify ingress, internal service paths, and stateful private egress as separate contracts.")}</li>
              <li>{t("zone 장애와 peak capacity를 정상 요청 성공과 독립적으로 실행할 수 있다.", "Execute zone-failure and peak-capacity scenarios independently of happy-path success.")}</li>
              <li>{t("stale·tampered evidence를 거부하고 현재 canonical evaluator를 재실행할 수 있다.", "Reject stale or tampered evidence and re-run current canonical evaluators.")}</li>
            </ul></div>
          </header>

          <section className="article-section" id="requirements">
            <div className="margin-label">01 — REQUIREMENTS AS EXECUTABLE CONTRACTS</div>
            <h2>{t("‘안전하고 가용한 플랫폼’을 아홉 개의 yes/no invariant로 분해합니다", "Decompose a 'safe and available platform' into nine yes/no invariants")}</h2>
            <p>{t(
              "public ingress는 edge의 TCP 443 하나뿐이고 app과 data 주소는 private입니다. edge는 app:8080으로, app은 data:5432로만 연결합니다. app의 외부 update는 edge의 NAT와 conntrack을 거쳐야 하며, zone A가 사라져도 zone B의 edge·app·data path가 남아야 합니다. 마지막으로 정확히 900 rps에서 bandwidth, burst queue와 app connections 각각이 70% 이하여야 합니다.",
              "Public ingress consists of exactly one edge TCP 443 listener, while app and data addresses remain private. Edge reaches app on 8080 and app reaches data on 5432. External app updates traverse edge NAT and conntrack; losing Zone A leaves a complete edge, app, and data path in Zone B. Finally, bandwidth, burst queue, and app connections must each remain at or below 70% at exactly 900 rps.",
            )}</p>
            <div className="namespace-platform-requirement-grid">
              <article><span>EXPOSURE</span><strong>edge:443 public</strong><p>app:8080 · data:5432 private</p></article>
              <article><span>EGRESS</span><strong>edge NAT + conntrack</strong><p>{t("private app의 reply state 보존", "preserve reply state for the private app")}</p></article>
              <article><span>FAILURE</span><strong>zone A → removed</strong><p>zone B request path survives</p></article>
              <article><span>CAPACITY</span><strong>900 rps</strong><p>each utilization ≤ 70%</p></article>
            </div>
          </section>

          <section className="article-section" id="evidence">
            <div className="margin-label">02 — VERSIONED EVIDENCE RECEIPTS</div>
            <h2>{t("receipt의 `passed`를 신뢰하지 않고 현재 evaluator를 다시 실행합니다", "Do not trust a stored `passed`; re-run the current evaluator")}</h2>
            <p>{t(
              "각 receipt는 chapter id, schema version, adapter revision, canonical fixture 목록, assertion 수와 deterministic fingerprint를 담습니다. capstone은 일곱 chapter가 정확히 한 번씩 있는지 확인하고, 현재 adapter revision의 canonical evaluator를 재실행해 fingerprint를 비교합니다. 누락, 중복, stale, tampered와 evaluator regression은 서로 다른 실패입니다. 여기서 FNV-1a fingerprint는 결정적 실습의 drift와 우발 변경을 찾기 위한 비암호학적 checksum이며, 적대적 변경에 대한 서명·출처 인증·보안 경계가 아닙니다.",
              "Each receipt carries a chapter id, schema version, adapter revision, canonical fixture list, assertion count, and deterministic fingerprint. The capstone requires exactly one receipt from each of seven chapters, re-runs every canonical evaluator at the current adapter revision, and compares fingerprints. Missing, duplicate, stale, tampered, and evaluator-regression states are distinct failures. Here the FNV-1a fingerprint is a non-cryptographic checksum for deterministic drift and accidental-change detection, not a signature, origin authentication, or security boundary against an active adversary.",
            )}</p>
            <pre className="namespace-platform-contract-code" aria-label={t("evidence receipt contract 예시", "Evidence receipt contract example")}>{[
              "schemaVersion: 1",
              "chapterId: egress-nat-and-conntrack",
              "adapterRevision: egress-nat-and-conntrack/v1",
              "fixtures: snat-working, masquerade-working",
              "verdict: passed",
              "fingerprint: fnv1a32:…",
            ].join("\n")}</pre>
          </section>

          <section className="article-section" id="boundaries">
            <div className="margin-label">03 — FOUR NETWORK VIEWS</div>
            <h2>{t("namespace를 box가 아니라 ownership과 exposure의 경계로 읽습니다", "Read namespaces as ownership and exposure boundaries, not merely boxes")}</h2>
            <p>{t(
              "client는 platform 밖의 요청자입니다. edge만 public address와 TCP 443 listener를 소유합니다. app의 8080과 data의 5432는 private route와 exact allow rule 안에 남습니다. `0.0.0.0` listener도 자신의 namespace 주소 전체에 bind할 뿐 다른 namespace의 public exposure를 만들지 않습니다.",
              "Client is the requester outside the platform. Only edge owns a public address and TCP 443 listener. App 8080 and data 5432 remain inside private routes and exact allow rules. Even a `0.0.0.0` listener binds all addresses in its own namespace; it does not create public exposure in another namespace.",
            )}</p>
            <div className="network-invariant-table" role="table" aria-label={t("namespace별 ownership과 listener", "Ownership and listeners by namespace") }>
              <div role="row"><strong role="cell">edge</strong><span role="cell">public tcp/443 · routing · firewall · NAT/conntrack</span></div>
              <div role="row"><strong role="cell">app</strong><span role="cell">private tcp/8080 · external update client</span></div>
              <div role="row"><strong role="cell">data</strong><span role="cell">private tcp/5432 · cross-zone standby</span></div>
            </div>
          </section>

          <section className="article-section" id="paths">
            <div className="margin-label">04 — THREE PATH CONTRACTS</div>
            <h2>{t("한 방향의 reachability를 전체 service contract로 착각하지 않습니다", "Do not mistake one-way reachability for a complete service contract")}</h2>
            <p>{t(
              "정상 ingress는 client→edge:443→app:8080→data:5432와 stateful reply를 포함합니다. private egress는 app의 private source가 edge에서 번역되고 같은 conntrack state로 돌아오는 별도 흐름입니다. policy가 accept여도 route, listener 또는 return state를 만들지는 않으므로 각 stage를 독립적으로 판정합니다.",
              "Normal ingress includes client to edge 443, app 8080, data 5432, and the stateful reply. Private egress is a separate flow where edge translates the app's private source and returns through the same conntrack state. An accepting policy creates neither routes, listeners, nor return state, so every stage is judged independently.",
            )}</p>
            <div className="namespace-platform-path-table">
              <div><span>INGRESS</span><code>client → edge:443 → app:8080 → data:5432</code></div>
              <div><span>EGRESS</span><code>app → edge POSTROUTING → external → conntrack reply</code></div>
              <div><span>POLICY</span><code>exact NEW allow + ESTABLISHED reply + default drop</code></div>
            </div>
          </section>

          <section className="article-section" id="failure-capacity">
            <div className="margin-label">05 — FAILURE AND CAPACITY ARE FIRST-CLASS SCENARIOS</div>
            <h2>{t("정상 요청 성공 뒤에 zone 상관관계와 포화를 숨기지 않습니다", "Do not hide zone correlation and saturation behind happy-path success")}</h2>
            <p>{t(
              "zone A failure scenario는 zone A의 모든 node를 동시에 제거하고 zone B에 edge, app과 data standby가 모두 있는지 확인합니다. peak-load scenario는 Chapter 7의 `calculateCapacity`를 직접 호출합니다. 900 rps, 12 KB/transaction, 200 ms connection에서 결과는 bandwidth 54%, burst queue 62.5%, app connections 60%이며 세 값 모두 70% 이하입니다.",
              "The Zone A failure scenario removes every Zone A node at once and checks for edge, app, and data standby capacity in Zone B. The peak-load scenario directly calls Chapter 7's `calculateCapacity`. At 900 rps, 12 KB per transaction, and 200-ms connections, utilization is 54% bandwidth, 62.5% burst queue, and 60% app connections—all at or below 70%.",
            )}</p>
          </section>

          <section className="article-section" id="namespace-platform-lab">
            <div className="margin-label">06 — REQUIRED NAMESPACE PLATFORM STUDIO</div>
            <h2>{t("일곱 receipt와 네 scenario를 한 workspace에서 실행하세요", "Execute seven receipts and four scenarios in one workspace")}</h2>
            <p>{t(
              "evidence bundle은 선행 개념이 현재 코드에서도 통과하는지 확인합니다. platform scenario는 현재 설계가 capstone 요구사항을 충족하는지 별도로 확인합니다. 둘 중 하나라도 실패하면 완료 contract는 닫힌 상태를 유지합니다. 실행 전에는 verdict와 capacity ratio를 숨깁니다.",
              "The evidence bundle establishes that prerequisite concepts still pass in current code. Platform scenarios separately establish whether the current design meets capstone requirements. If either side fails, completion remains closed. Verdicts and capacity ratios stay hidden before execution.",
            )}</p>
            <NamespacePlatformLab onCompletionChange={setLabCompletion} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — REPAIR FOUR ARCHITECTURE INCIDENTS</div>
            <h2>{t("우회가 아니라 최초로 깨진 boundary를 최소 변경으로 복구합니다", "Repair the first broken boundary with a minimal change rather than a workaround")}</h2>
            <p>{t(
              "app public exposure, missing data route, stateless private egress와 zone-correlated platform을 다룹니다. public IP를 더 주거나 같은 zone의 replica를 늘리는 넓은 workaround는 실패합니다. 각 사건은 전체 platform evaluator를 다시 실행했을 때 정확히 하나의 repair만 통과합니다.",
              "The incidents cover public app exposure, a missing data route, stateless private egress, and a zone-correlated platform. Broad workarounds such as adding public IPs or replicas in the same zone fail. Re-running the full platform evaluator leaves exactly one passing repair for each incident.",
            )}</p>
            <NamespacePlatformIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="linux-transfer">
            <div className="margin-label">08 — OPTIONAL REAL LINUX EXPERIMENT</div>
            <h2>{t("실제 Linux는 설계 contract의 선택적 관찰 대상이지 필수 runtime이 아닙니다", "Real Linux is an optional observation target, not a required runtime")}</h2>
            <p>{t(
              "권한 있는 disposable 환경에서만 namespace와 nftables를 만드세요. 브라우저 studio가 모든 필수 판정을 제공하므로 root shell, container runtime 또는 외부 network는 완료 조건이 아닙니다. 실제 환경에서는 각 명령과 함께 namespace, interface, flow key와 timestamp를 보존하세요.",
              "Create namespaces and nftables rules only in an authorized disposable environment. The browser studio provides every required judgment, so a root shell, container runtime, and external network are not completion requirements. In a real environment, preserve namespace, interface, flow key, and timestamp with every command.",
            )}</p>
            <pre className="namespace-platform-contract-code" aria-label={t("선택 Linux platform 관찰 명령", "Optional Linux platform observation commands")}>{[
              "ip netns exec edge ss -lnt '( sport = :443 )'",
              "ip netns exec app ss -lnt '( sport = :8080 )'",
              "ip netns exec data ss -lnt '( sport = :5432 )'",
              "ip netns exec edge nft list ruleset",
              "ip netns exec edge conntrack -L",
              "ip netns exec app ip route get 198.51.100.20",
            ].join("\n")}</pre>
          </section>

          <section className="article-section" id="decision-record">
            <div className="margin-label">09 — ARCHITECTURE DECISION RECORD</div>
            <h2>{t("최종 산출물은 topology 그림이 아니라 요구사항·결정·evidence의 연결입니다", "The final artifact is a link between requirements, decisions, and evidence—not a topology picture")}</h2>
            <div className="namespace-platform-decision-record">
              <div><strong>CONTEXT</strong><p>{t("public client, private services, zone 장애, 900 rps peak", "Public clients, private services, zone failure, and a 900-rps peak")}</p></div>
              <div><strong>DECISION</strong><p>{t("edge-only ingress, exact internal ports, stateful edge egress, cross-zone path", "Edge-only ingress, exact internal ports, stateful edge egress, and a cross-zone path")}</p></div>
              <div><strong>EVIDENCE</strong><p>{t("Ch1–7 current evaluator receipts + 네 capstone scenario", "Current Chapter 1–7 evaluator receipts plus four capstone scenarios")}</p></div>
              <div><strong>TRADE-OFF</strong><p>{t("더 많은 구성 요소와 failover 비용을 감수해 exposure와 correlated failure를 줄임", "Accept more components and failover cost to reduce exposure and correlated failure")}</p></div>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">10 — FINAL CONCEPT CHECK</div>
            <NamespacePlatformConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="namespace-platform-completion-checklist" role="status" aria-live="polite" data-completion-ready={canComplete ? "true" : "false"}>
              <span className={labCompletion.evidence ? "is-complete" : undefined}>{labCompletion.evidence ? "✓" : "○"} {t("Ch1–7 evidence", "Chapter 1–7 evidence")}</span>
              <span className={labCompletion.normal ? "is-complete" : undefined}>{labCompletion.normal ? "✓" : "○"} {t("정상 요청", "Normal request")}</span>
              <span className={labCompletion.egress ? "is-complete" : undefined}>{labCompletion.egress ? "✓" : "○"} {t("private egress", "Private egress")}</span>
              <span className={labCompletion.failure ? "is-complete" : undefined}>{labCompletion.failure ? "✓" : "○"} {t("zone A 장애", "Zone A failure")}</span>
              <span className={labCompletion.peak ? "is-complete" : undefined}>{labCompletion.peak ? "✓" : "○"} 900 rps</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 incident", "Four incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("다섯 개념", "Five concepts")}</span>
            </div>
            <CompleteChapter curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG} slug="assemble-a-namespace-platform" canComplete={canComplete} lockedMessage={t("evidence bundle, 네 scenario, 네 incident와 다섯 개념 확인을 모두 완료하세요.", "Complete the evidence bundle, four scenarios, four incidents, and five concept checks.")} />
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
              {
                title: "TCP/IP Illustrated (Stevens, Fall & Stevens)",
                url: "https://www.oreilly.com/library/view/tcpip-illustrated-volume/9780132808200/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousPreviewHref}>← {t("이전: 네트워크 관측과 용량", "Previous: Network observability and capacity")}</a> : <span>← {t("이전: 네트워크 관측과 용량", "Previous: Network observability and capacity")}</span>}
            {preview ? <a href={curriculumPreviewHref}>{t("인프라 설계 커리큘럼 미리보기", "Preview the Infrastructure Design curriculum")} →</a> : <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug: INFRASTRUCTURE_CURRICULUM_SLUG }} search={isKo ? {} : { lang: "en" }}>{t("인프라 설계 커리큘럼으로", "Back to the Infrastructure Design curriculum")} →</Link>}
          </nav>
          <noscript>{t("Platform studio에는 JavaScript가 필요합니다. 위의 requirement, boundary, path와 선택 Linux 명령은 계속 읽을 수 있습니다.", "The platform studio requires JavaScript. The requirements, boundaries, paths, and optional Linux commands remain readable.")}</noscript>
        </article>
      </div>
    </main>
  );
}

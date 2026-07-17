import { Link } from "@tanstack/react-router";
import { useState } from "react";
import "./NetworkObservabilityCapacityChapter.css";
import {
  INFRASTRUCTURE_CURRICULUM_SLUG,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
} from "../../data/curriculum";
import { canCompleteNetworkObservabilityChapter } from "../../features/infrastructure/network-observability-capacity";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { NetworkObservabilityCapacityConceptCheck } from "./NetworkObservabilityCapacityConceptCheck";
import { NetworkObservabilityCapacityIncidentLab } from "./NetworkObservabilityCapacityIncidentLab";
import { NetworkObservabilityCapacityLab } from "./NetworkObservabilityCapacityLab";

const tocItems = {
  ko: [
    { id: "coordinate", label: "packet path를 증거 좌표계로" },
    { id: "scope", label: "namespace 범위의 ip·ss" },
    { id: "capture", label: "capture point·flow·window" },
    { id: "counter", label: "counter 크기보다 delta" },
    { id: "capacity", label: "bandwidth·queue·connections" },
    { id: "observability-capacity-lab", label: "필수 증거·용량 lab" },
    { id: "incidents", label: "네 관측·용량 사건" },
    { id: "real-linux", label: "선택 Linux 관찰" },
    { id: "transfer", label: "platform capstone으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "coordinate", label: "Packet path as evidence coordinates" },
    { id: "scope", label: "Namespace-scoped ip and ss" },
    { id: "capture", label: "Capture point, flow, and window" },
    { id: "counter", label: "Counter delta over magnitude" },
    { id: "capacity", label: "Bandwidth, queue, and connections" },
    { id: "observability-capacity-lab", label: "Required evidence and capacity lab" },
    { id: "incidents", label: "Four observability incidents" },
    { id: "real-linux", label: "Optional Linux observation" },
    { id: "transfer", label: "Transfer to the platform capstone" },
    { id: "check", label: "Concept check" },
  ],
} as const;

type LabCompletion = {
  evidence: boolean;
  bandwidth: boolean;
  queue: boolean;
  connections: boolean;
};

export function NetworkObservabilityCapacityChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? infrastructureChaptersKo : infrastructureChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "network-observability-and-capacity");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labCompletion, setLabCompletion] = useState<LabCompletion>({ evidence: false, bandwidth: false, queue: false, connections: false });
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNetworkObservabilityChapter({
    evidenceAlignmentComplete: labCompletion.evidence,
    bandwidthScenarioComplete: labCompletion.bandwidth,
    queueScenarioComplete: labCompletion.queue,
    connectionScenarioComplete: labCompletion.connections,
    incidentsComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/availability-and-failure-domains${isKo ? "" : "?lang=en"}`;
  const nextPreviewHref = `/admin/preview/curricula/${INFRASTRUCTURE_CURRICULUM_SLUG}/chapters/assemble-a-namespace-platform${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell infrastructure-chapter-shell network-observability-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
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
          <header className="lesson-hero infrastructure-lesson-hero network-observability-lesson-hero">
            <p className="eyebrow">PACKET PATH → SCOPED EVIDENCE → RESOURCE RATIO → CAPACITY HEADROOM · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">07</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">{t(
              "앞의 장들에서 namespace 서비스 경계, 연결, egress, policy, discovery와 failure domain을 설계했습니다. 이제 장애 증상을 한 packet path의 동일한 flow·시간 window에 정렬하고, bandwidth·queue·connection limit 중 어느 resource가 먼저 capacity headroom을 소진하는지 수치로 판정합니다.",
              "The earlier chapters designed namespace service boundaries, connectivity, egress, policy, discovery, and failure domains. Now align symptoms to one packet path, flow, and time window, then calculate which of bandwidth, queue, or connection limits exhausts capacity headroom first.",
            )}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("ip·ss·tcpdump·counter evidence에 실행 namespace, interface, flow key와 시간 window를 포함할 수 있다.", "Include execution namespace, interface, flow key, and time window in ip, ss, tcpdump, and counter evidence.")}</li>
                <li>{t("빈 capture와 누적 counter가 직접 증명하는 범위를 넘겨 해석하지 않을 수 있다.", "Avoid interpreting an empty capture or accumulated counter beyond what it directly establishes.")}</li>
                <li>{t("rps·byte·duration·burst에서 bandwidth, concurrent connections와 queue growth를 계산할 수 있다.", "Calculate bandwidth, concurrent connections, and queue growth from request rate, bytes, duration, and bursts.")}</li>
                <li>{t("단위가 다른 resource를 demand/capacity ratio로 비교해 limiting resource를 찾을 수 있다.", "Compare resources with different units through demand-to-capacity ratios to find the limiting resource.")}</li>
                <li>{t("모든 resource에 30% headroom을 남기는 최소 capacity plan을 선택할 수 있다.", "Choose the smallest capacity plan that leaves 30% headroom on every resource.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="coordinate">
            <div className="margin-label">01 — PACKET PATH AS COORDINATES</div>
            <h2>{t("증거는 명령 이름이 아니라 packet이 지나간 경계에 놓습니다", "Place evidence at packet boundaries, not under tool names")}</h2>
            <p>{t(
              "client의 route lookup, edge egress의 queue와 capture, app의 socket table은 서로 다른 질문에 답합니다. 네 출력이 같은 request를 말하려면 flow key, observation window와 실행 network view가 함께 기록돼야 합니다. `curl failed` 같은 증상 하나를 곧바로 app failure로 바꾸지 않습니다.",
              "A client route lookup, an edge-egress queue and capture, and an app socket table answer different questions. To describe the same request, all outputs need a flow key, observation window, and execution network view. A symptom such as `curl failed` is not automatically an application failure.",
            )}</p>
            <div className="network-observability-coordinate-strip"><span>client · route</span><span>edge · counter / capture</span><span>app · sockets</span><span>data · dependency</span></div>
          </section>

          <section className="article-section" id="scope">
            <div className="margin-label">02 — NAMESPACE-SCOPED IP · SS</div>
            <h2>{t("host output은 다른 namespace의 object 부재를 증명하지 않습니다", "Host output does not establish absence of objects in another namespace")}</h2>
            <p>{t(
              "`ip route`, `ip -s link`와 `ss`는 실행한 process의 current network namespace view를 읽습니다. host의 `ss -lnt`가 비어 있어도 app namespace의 listener는 정상일 수 있습니다. 모든 receipt에 `observer=app`처럼 observation scope를 명시해야 재현 가능한 증거가 됩니다.",
              "`ip route`, `ip -s link`, and `ss` read the current network-namespace view of the executing process. An empty host `ss -lnt` can coexist with a healthy app listener. Every receipt needs an observation scope such as `observer=app` to become reproducible evidence.",
            )}</p>
            <div className="network-invariant-table" role="table" aria-label={t("관측 명령과 직접 claim", "Observation commands and direct claims")}>
              <div role="row"><strong role="cell">ip route get</strong><span role="cell">egress · next hop · source address</span></div>
              <div role="row"><strong role="cell">ss -lnt</strong><span role="cell">{t("현재 namespace의 listener·queue", "listeners and queues in the current namespace")}</span></div>
              <div role="row"><strong role="cell">ip/tc counters</strong><span role="cell">{t("현재 interface의 time-window delta", "time-window deltas on the current interface")}</span></div>
            </div>
          </section>

          <section className="article-section" id="capture">
            <div className="margin-label">03 — CAPTURE POINT · FLOW · WINDOW</div>
            <h2>{t("빈 tcpdump도 capture point보다 넓은 부재를 증명하지 않습니다", "An empty tcpdump does not establish absence beyond its capture point")}</h2>
            <p>{t(
              "edge egress에서 request-17 packet이 보이지 않았다는 사실은 그 interface와 filter, 12:00–12:01 window에서 관측되지 않았다는 뜻입니다. client·edge ingress·edge egress·app ingress처럼 인접 capture를 같은 flow key로 비교할 때만 최초로 사라지는 경계를 좁힐 수 있습니다.",
              "Not seeing request-17 at edge egress means it was not observed on that interface, under that filter, during 12:00–12:01. Only adjacent captures at client, edge ingress, edge egress, and app ingress using the same flow key can narrow the first disappearance boundary.",
            )}</p>
          </section>

          <section className="article-section" id="counter">
            <div className="margin-label">04 — DELTA, NOT MAGNITUDE</div>
            <h2>{t("누적 counter 20,000보다 사건 window의 100→132가 더 강한 증거입니다", "A 100-to-132 incident-window delta is stronger evidence than an accumulated counter of 20,000")}</h2>
            <p>{t(
              "counter는 boot 이후 또는 reset 이후의 과거를 합칩니다. 시작과 끝 값을 같은 namespace·interface에서 읽고 delta 32를 계산해야 현재 사건과 연결할 수 있습니다. reset은 과거 맥락을 지우므로 진단 shortcut이 아니라 별도 운영 결정입니다.",
              "A counter aggregates history since boot or reset. Read start and end values from the same namespace and interface, then compute the delta of 32 to tie it to the current incident. Resetting removes prior context and is an operational decision, not a diagnostic shortcut.",
            )}</p>
          </section>

          <section className="article-section" id="capacity">
            <div className="margin-label">05 — NORMALIZE THREE CAPACITY UNITS</div>
            <h2>{t("Mbps·packet·connection을 각각 자신의 capacity로 나눕니다", "Normalize Mbps, packets, and connections by their own capacities")}</h2>
            <div className="network-observability-formula-grid">
              <article><span>BANDWIDTH</span><code>rps × bytes/txn × 8 ÷ 1,000,000</code><p>{t("link Mbps와 비교", "compare with link Mbps")}</p></article>
              <article><span>CONNECTIONS</span><code>ceil(rps × duration ms ÷ 1000)</code><p>{t("socket limit와 비교", "compare with the socket limit")}</p></article>
              <article><span>QUEUE GROWTH</span><code>max(0, burst pps − drain pps) × seconds</code><p>{t("queue packet budget과 비교", "compare with the queue packet budget")}</p></article>
            </div>
            <p>{t(
              "각 demand/capacity ratio가 1.0이면 이미 포화 경계이며, 이 장의 capacity plan은 정상 상태에서 0.70 이하를 목표로 합니다. queue는 짧은 burst를 흡수하지만 지속 offered load가 drain보다 크면 throughput을 만들지 못하고 latency만 키울 수 있습니다.",
              "A demand-to-capacity ratio of 1.0 is already the saturation boundary, while this chapter's capacity plans target 0.70 or below in steady state. A queue absorbs a short burst, but when sustained offered load exceeds drain rate it cannot create throughput and may only add latency.",
            )}</p>
          </section>

          <section className="article-section" id="observability-capacity-lab">
            <div className="margin-label">06 — REQUIRED EVIDENCE · CAPACITY LAB</div>
            <h2>{t("네 receipt를 정렬하고 세 limiting resource를 직접 계산하세요", "Align four receipts and calculate three limiting resources")}</h2>
            <p>{t(
              "먼저 각 probe를 올바른 namespace와 bounded claim에 연결합니다. 그런 다음 bandwidth, burst queue와 connection-limit fixture에서 실행 전 병목을 예측하고, plan 뒤 모든 utilization이 70% 이하인지 판정합니다. 실행 전 시각화는 계산 결과와 limiting resource를 숨깁니다.",
              "First connect each probe to the correct namespace and bounded claim. Then predict the bottleneck in bandwidth, burst-queue, and connection-limit fixtures, and judge whether every utilization falls to 70% or below after the plan. Before execution, the visualization hides calculated ratios and the limiting resource.",
            )}</p>
            <NetworkObservabilityCapacityLab onCompletionChange={setLabCompletion} />
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — REPAIR FOUR OBSERVABILITY INCIDENTS</div>
            <h2>{t("더 많은 data가 아니라 더 좁고 같은 범위의 evidence를 수집합니다", "Collect narrower evidence from matching scopes, not merely more data")}</h2>
            <p>{t(
              "wrong-namespace ss, absolute counter, single-point capture와 oversized queue 사건을 같은 원칙으로 수리합니다. 각 사건은 broad workaround가 아니라 최초로 범위를 벗어난 claim 또는 포화된 resource 하나를 고치도록 판정합니다.",
              "Repair wrong-namespace ss, an absolute counter, a single-point capture, and an oversized queue through the same principle. Each incident grades one out-of-scope claim or saturated resource rather than accepting a broad workaround.",
            )}</p>
            <NetworkObservabilityCapacityIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">08 — OPTIONAL REAL LINUX OBSERVATION</div>
            <h2>{t("실제 Linux에서는 timestamp·namespace·interface를 output과 함께 보존합니다", "On real Linux, preserve timestamp, namespace, and interface with every output")}</h2>
            <p>{t(
              "권한이 있는 disposable Linux 환경에서만 아래 read-only 관찰을 시도하세요. 실제 traffic이나 root shell은 완료 조건이 아니며, 브라우저 fixture가 필수 계산의 결정론적 가상 환경입니다.",
              "Try the read-only observations below only in a disposable Linux environment with suitable permission. Real traffic and a root shell are not completion requirements; the browser fixtures are the deterministic virtual environment for every required calculation.",
            )}</p>
            <pre className="network-observation-command" aria-label={t("선택 Linux network observability 명령", "Optional Linux network-observability commands")}>{[
              "date -Ins",
              "ip netns exec client ip route get 10.40.0.20",
              "ip netns exec edge ip -s link show egress0",
              "ip netns exec edge tc -s qdisc show dev egress0",
              "ip netns exec edge tcpdump -ni egress0 'tcp port 8080'",
              "ip netns exec app ss -lnt '( sport = :8080 )'",
              "ip netns exec app ss -s",
            ].join("\n")}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER TO THE PLATFORM CAPSTONE</div>
            <h2>{t("다음 장은 이전 lab을 반복하지 않고 versioned evidence receipt를 소비합니다", "The next chapter consumes versioned evidence receipts instead of repeating prior labs")}</h2>
            <div className="network-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t(
                "이번 장의 receipt에 `chapter=7`, `flow=request-17`, `window=12:00–12:01`, 세 utilization과 `verdict=passed`를 기록한다고 가정하세요. 이 receipt는 capacity와 observation coverage를 입증하지만 namespace isolation, NAT 또는 policy를 대신 입증하지는 않습니다. capstone에서 각 claim이 어느 장의 evidence를 필요로 하는지 구분하세요.",
                "Assume this chapter's receipt records `chapter=7`, `flow=request-17`, `window=12:00–12:01`, all three utilizations, and `verdict=passed`. It establishes capacity and observation coverage, but it does not independently establish namespace isolation, NAT, or policy. In the capstone, keep each claim attached to evidence from the chapter that proves it.",
              )}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">10 — CONCEPT CHECK</div>
            <NetworkObservabilityCapacityConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="network-observability-completion-checklist" role="status" aria-live="polite">
              <span className={labCompletion.evidence ? "is-complete" : undefined}>{labCompletion.evidence ? "✓" : "○"} {t("evidence receipt 4개 정렬", "Four evidence receipts aligned")}</span>
              <span className={labCompletion.bandwidth ? "is-complete" : undefined}>{labCompletion.bandwidth ? "✓" : "○"} bandwidth</span>
              <span className={labCompletion.queue ? "is-complete" : undefined}>{labCompletion.queue ? "✓" : "○"} burst queue</span>
              <span className={labCompletion.connections ? "is-complete" : undefined}>{labCompletion.connections ? "✓" : "○"} connections</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네 사건 수리", "Four incidents repaired")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={INFRASTRUCTURE_CURRICULUM_SLUG}
              slug="network-observability-and-capacity"
              canComplete={canComplete}
              lockedMessage={t(
                "evidence 정렬, 세 capacity scenario, 네 사건과 다섯 개념 확인을 모두 완료하세요.",
                "Complete evidence alignment, all three capacity scenarios, four incidents, and five concept checks.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousPreviewHref}>← {t("이전: 가용성과 failure domain", "Previous: Availability and failure domains")}</a> : <span>← {t("이전: 가용성", "Previous: Availability")}</span>}
            {preview ? <a href={nextPreviewHref}>{t("다음: namespace 플랫폼 조립", "Next: Assemble a namespace platform")} →</a> : <span>{t("다음: namespace 플랫폼 조립", "Next: Assemble a namespace platform")} →</span>}
          </nav>
          <noscript>{t(
            "증거·용량 활동에는 JavaScript가 필요합니다. 위의 scope, delta와 capacity 공식 및 선택 Linux 관찰 명령은 계속 읽을 수 있습니다.",
            "The evidence and capacity activities require JavaScript. The scope, delta, capacity formulas, and optional Linux observation commands remain readable.",
          )}</noscript>
        </article>
      </div>
    </main>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  calculateCapacity,
  capacityScenarioFixtures,
  capacityScenarioIds,
  evaluateCapacityScenario,
  evaluateObservationEvidence,
  observationEvidencePresets,
  observationProbeIds,
  type CapacityPlanId,
  type CapacityResource,
  type CapacityScenarioEvaluation,
  type CapacityScenarioId,
  type ObservationClaim,
  type ObservationEvidenceDraft,
  type ObservationFailureReason,
  type ObservationNamespace,
  type ObservationProbeId,
} from "../../features/infrastructure/network-observability-capacity";
import { useLocale } from "../../features/localization/localization";
import {
  InfrastructureChoiceRail,
  InfrastructureWorkspace,
} from "./InfrastructureInteractionPrimitives";
import { NetworkObservabilityCapacityView } from "./NetworkObservabilityCapacityView";

type Completion = {
  evidence: boolean;
  bandwidth: boolean;
  queue: boolean;
  connections: boolean;
};

type FeedbackTone = "neutral" | "success" | "error";
type Feedback = { ko: string; en: string; tone: FeedbackTone };

function message(ko: string, en: string, tone: FeedbackTone = "neutral"): Feedback {
  return { ko, en, tone };
}

const initialFeedback = message(
  "네 probe를 object를 소유한 namespace에 놓고 claim 범위를 좁히세요.",
  "Place all four probes in the namespace that owns the object and narrow each claim.",
);

const scenarioCompletionKey: Record<CapacityScenarioId, keyof Omit<Completion, "evidence">> = {
  "bandwidth-saturation": "bandwidth",
  "burst-queue": "queue",
  "connection-limit": "connections",
};

export function NetworkObservabilityCapacityLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: Completion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [evidenceDraft, setEvidenceDraft] = useState<ObservationEvidenceDraft>(() => cloneEvidenceDraft(observationEvidencePresets.scaffold));
  const [evidenceResult, setEvidenceResult] = useState<ReturnType<typeof evaluateObservationEvidence> | null>(null);
  const [activeScenario, setActiveScenario] = useState<CapacityScenarioId>("bandwidth-saturation");
  const [predictions, setPredictions] = useState<Partial<Record<CapacityScenarioId, CapacityResource>>>({});
  const [plans, setPlans] = useState<Partial<Record<CapacityScenarioId, CapacityPlanId>>>({});
  const [capacityResults, setCapacityResults] = useState<Partial<Record<CapacityScenarioId, CapacityScenarioEvaluation>>>({});
  const [completed, setCompleted] = useState<Completion>({ evidence: false, bandwidth: false, queue: false, connections: false });
  const [feedback, setFeedback] = useState<Feedback>(initialFeedback);
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(completed), [completed, onCompletionChange]);

  const evidencePreview = useMemo(() => evaluateObservationEvidence(evidenceDraft), [evidenceDraft]);
  const activeFixture = capacityScenarioFixtures[activeScenario];
  const capacityPreview = useMemo(
    () => calculateCapacity({ ...activeFixture.draft }),
    [activeFixture],
  );
  const activeResult = capacityResults[activeScenario] ?? null;

  function publishCompletion(update: Partial<Completion>) {
    setCompleted((current) => ({ ...current, ...update }));
  }

  function updateReceipt(
    probeId: ObservationProbeId,
    update: Partial<{ namespaceId: ObservationNamespace; claim: ObservationClaim }>,
  ) {
    setRuntimeFailed(false);
    setEvidenceDraft((current) => ({
      receipts: current.receipts.map((receipt) => receipt.probeId === probeId
        ? { ...receipt, ...update }
        : { ...receipt }),
    }));
    setEvidenceResult(null);
    publishCompletion({ evidence: false });
    setFeedback(message(
      "evidence state가 바뀌었습니다. 같은 flow·window의 네 claim을 다시 판정하세요.",
      "Evidence state changed. Re-grade all four claims from the same flow and window.",
    ));
  }

  function runEvidence() {
    try {
      setRuntimeFailed(false);
      const result = evaluateObservationEvidence(evidenceDraft);
      setEvidenceResult(result);
      publishCompletion({ evidence: result.passed });
      if (result.passed) {
        setFeedback(message(
          `증거 정렬 통과 — 같은 request-17·12:00–12:01에서 edge drop delta ${result.counterDelta}를 판정했습니다.`,
          `Evidence alignment passed — the edge drop delta is ${result.counterDelta} within request-17 and 12:00–12:01.`,
          "success",
        ));
      } else {
        const reason = evidenceReason(result.reason);
        setFeedback(message(
          `증거 판정 실패: ${reason.ko}. 최초 불일치부터 수리하세요.`,
          `Evidence grade failed: ${reason.en}. Repair the first mismatch.`,
          "error",
        ));
      }
    } catch {
      setRuntimeFailed(true);
      setEvidenceResult(null);
      publishCompletion({ evidence: false });
      setFeedback(message(
        "브라우저 증거 모델을 실행하지 못했습니다. 증거 scaffold를 초기화하세요.",
        "The browser evidence model could not run. Reset the evidence scaffold.",
        "error",
      ));
    }
  }

  function resetEvidence() {
    setEvidenceDraft(cloneEvidenceDraft(observationEvidencePresets.scaffold));
    setEvidenceResult(null);
    setRuntimeFailed(false);
    publishCompletion({ evidence: false });
    setFeedback(initialFeedback);
  }

  function invalidateScenario(scenarioId: CapacityScenarioId) {
    setRuntimeFailed(false);
    setCapacityResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    publishCompletion({ [scenarioCompletionKey[scenarioId]]: false });
  }

  function selectScenario(scenarioId: CapacityScenarioId) {
    setActiveScenario(scenarioId);
    setRuntimeFailed(false);
    const title = scenarioTitle(scenarioId, true);
    setFeedback(message(
      `${title} scenario로 전환했습니다. 이 scenario의 예측과 plan을 확인한 뒤 실행하세요.`,
      `${title} scenario selected. Review its prediction and plan, then run it.`,
    ));
  }

  function choosePrediction(value: CapacityResource) {
    setPredictions((current) => ({ ...current, [activeScenario]: value }));
    invalidateScenario(activeScenario);
    setFeedback(message(
      "병목 예측을 바꿨습니다. capacity plan을 선택하고 실행하세요.",
      "The bottleneck prediction changed. Choose a capacity plan and run it.",
    ));
  }

  function choosePlan(value: CapacityPlanId) {
    setPlans((current) => ({ ...current, [activeScenario]: value }));
    invalidateScenario(activeScenario);
    setFeedback(message(
      "capacity plan을 바꿨습니다. baseline 병목 예측과 30% headroom을 다시 판정하세요.",
      "The capacity plan changed. Re-grade the baseline bottleneck and 30% headroom.",
    ));
  }

  function runCapacityScenario() {
    const prediction = predictions[activeScenario];
    const plan = plans[activeScenario];
    if (!prediction || !plan) {
      setFeedback(message(
        "먼저 limiting resource를 예측하고 capacity plan을 선택하세요.",
        "Predict the limiting resource and choose a capacity plan first.",
        "error",
      ));
      return;
    }
    try {
      setRuntimeFailed(false);
      const result = evaluateCapacityScenario(activeScenario, prediction, plan);
      setCapacityResults((current) => ({ ...current, [activeScenario]: result }));
      publishCompletion({ [scenarioCompletionKey[activeScenario]]: result.passed });
      if (result.passed) {
        const limiting = resourceCopy(result.baseline.limitingResource);
        const maxPlanned = Math.max(...result.planned.metrics.map(({ utilization }) => utilization));
        setFeedback(message(
          `${limiting.ko} 예측 통과 — plan 뒤 최대 utilization은 ${Math.round(maxPlanned * 100)}%입니다.`,
          `${limiting.en} prediction passed — maximum utilization after the plan is ${Math.round(maxPlanned * 100)}%.`,
          "success",
        ));
      } else if (!result.predictionCorrect) {
        const actual = resourceCopy(result.baseline.limitingResource);
        setFeedback(message(
          `예측 불일치 — 가장 높은 baseline ratio는 ${actual.ko}입니다.`,
          `Prediction mismatch — the highest baseline ratio belongs to ${actual.en}.`,
          "error",
        ));
      } else {
        setFeedback(message(
          "병목 예측은 맞지만 plan 뒤에도 한 resource가 70% headroom contract를 넘습니다.",
          "The bottleneck prediction is correct, but one resource still exceeds the 70% headroom contract after the plan.",
          "error",
        ));
      }
    } catch {
      setRuntimeFailed(true);
      setCapacityResults((current) => {
        const next = { ...current };
        delete next[activeScenario];
        return next;
      });
      publishCompletion({ [scenarioCompletionKey[activeScenario]]: false });
      setFeedback(message(
        "capacity fixture를 실행하지 못했습니다. 현재 scenario를 초기화하세요.",
        "The capacity fixture could not run. Reset the current scenario.",
        "error",
      ));
    }
  }

  function resetCapacityScenario() {
    setPredictions((current) => {
      const next = { ...current };
      delete next[activeScenario];
      return next;
    });
    setPlans((current) => {
      const next = { ...current };
      delete next[activeScenario];
      return next;
    });
    invalidateScenario(activeScenario);
    setFeedback(message(
      "현재 capacity fixture를 초기화했습니다. demand와 limit를 비교해 다시 예측하세요.",
      "The current capacity fixture was reset. Compare demand with limits and predict again.",
    ));
  }

  const activePrediction = predictions[activeScenario] ?? "";
  const activePlan = plans[activeScenario] ?? "";

  return (
    <section
      className="interactive-lab network-observability-capacity-lab"
      aria-labelledby="network-observability-capacity-lab-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
      data-active-scenario={activeScenario}
    >
      <header className="network-observability-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED LAB · ALIGN → CALCULATE → PLAN</p>
          <h3 id="network-observability-capacity-lab-title">{t("packet path 증거와 세 capacity 한도를 함께 판정", "Judge packet-path evidence and three capacity limits together")}</h3>
          <p>{t("필수 증거 정렬과 bandwidth·queue·connection scenario 세 개를 모두 통과하세요.", "Complete the required evidence alignment and all three bandwidth, queue, and connection scenarios.")}</p>
        </div>
        <strong>{Number(completed.evidence) + Number(completed.bandwidth) + Number(completed.queue) + Number(completed.connections)} / 4</strong>
      </header>

      {runtimeFailed ? (
        <div className="network-observability-runtime-alert" role="alert">
          {t("브라우저 증거·용량 모델을 실행하지 못했습니다. fixture를 초기화하면 외부 runtime 없이 다시 시작합니다.", "The browser evidence and capacity model could not run. Reset a fixture to restart without an external runtime.")}
        </div>
      ) : null}

      <section className="network-observability-evidence-workspace" aria-labelledby="network-observability-evidence-title">
        <header>
          <div>
            <span>01 · EVIDENCE ALIGNMENT</span>
            <h4 id="network-observability-evidence-title">{t("네 probe의 scope와 claim을 같은 request window에 정렬", "Align four probe scopes and claims to one request window")}</h4>
          </div>
          <span>{completed.evidence ? "✓" : "○"}</span>
        </header>
        <p className="network-observability-window-key"><code>flow=request-17</code><code>window=12:00–12:01</code></p>
        <InfrastructureWorkspace
          label={t("패킷 경로와 probe receipt 작업 공간", "Packet path and probe receipt workspace")}
          stage={(
            <>
              <NetworkObservabilityCapacityView
                evidence={evidencePreview}
                capacity={activeResult?.planned ?? capacityPreview}
                scenarioId={activeScenario}
                baselineLimitingResource={activeResult?.baseline.limitingResource}
                evidenceGradeState={evidenceResult ? evidenceResult.passed ? "passed" : "failed" : "not-run"}
                capacityGradeState={activeResult ? activeResult.passed ? "passed" : "failed" : "not-run"}
              />
              <div className="network-observability-evidence-grid">
                {evidenceDraft.receipts.map((receipt, index) => (
                  <article data-probe-editor={receipt.probeId} key={receipt.probeId}>
                    <span>{String(index + 1).padStart(2, "0")} · {probeTitle(receipt.probeId)}</span>
                    <code>{receipt.command}</code>
                    <InfrastructureChoiceRail
                      compact
                      controlId={`evidence-${receipt.probeId}-scope`}
                      label={t("어느 network view에서 실행할까?", "Which network view runs the probe?")}
                      value={receipt.namespaceId}
                      options={(["host", "client", "edge", "app", "data"] as const).map((namespaceId) => ({
                        value: namespaceId,
                        label: `${namespaceId} netns`,
                      }))}
                      onChange={(namespaceId: ObservationNamespace) => updateReceipt(receipt.probeId, { namespaceId })}
                    />
                    <InfrastructureChoiceRail
                      compact
                      controlId={`evidence-${receipt.probeId}-claim`}
                      label={t("이 receipt가 지지하는 claim은?", "What claim does this receipt support?")}
                      value={receipt.claim}
                      options={claimOptions(receipt.probeId).map((claim) => ({
                        value: claim,
                        label: claimLabel(claim, isKo),
                      }))}
                      onChange={(claim: ObservationClaim) => updateReceipt(receipt.probeId, { claim })}
                    />
                    {receipt.probeId === "edge-counter" ? <small>drops {receipt.counterStart} → {receipt.counterEnd}</small> : null}
                    {receipt.probeId === "edge-capture" ? <small>captured packets = {receipt.capturedPackets}</small> : null}
                    <small>{receipt.pathStage} · point={receipt.interfaceId}</small>
                  </article>
                ))}
              </div>
            </>
          )}
          inspector={(
            <div className="network-observability-evidence-contract">
              <span>{t("관측 계약", "OBSERVATION CONTRACT")}</span>
              <strong>flow=request-17</strong>
              <strong>window=12:00–12:01</strong>
              <p>{t("probe는 object를 소유한 namespace에서 실행하고 claim은 관측 범위 안에 둥니다.", "Run each probe in the namespace that owns the object and keep its claim inside the observed scope.")}</p>
            </div>
          )}
        />
        <div className="network-observability-action-row">
          <button type="button" className="button button-primary" onClick={runEvidence}>{t("네 evidence receipt 판정", "Grade four evidence receipts")}</button>
          <button type="button" className="button button-ghost" onClick={resetEvidence}>{t("증거 scaffold 초기화", "Reset evidence scaffold")}</button>
        </div>
      </section>

      <section className="network-observability-capacity-workspace" aria-labelledby="network-observability-capacity-title">
        <header>
          <div>
            <span>02 · CAPACITY SCENARIOS</span>
            <h4 id="network-observability-capacity-title">{t("resource별 demand/capacity ratio와 30% headroom", "Per-resource demand/capacity ratios and 30% headroom")}</h4>
          </div>
          <span>{Number(completed.bandwidth) + Number(completed.queue) + Number(completed.connections)} / 3</span>
        </header>
        <div className="network-observability-scenario-toolbar" role="group" aria-label={t("capacity scenario", "Capacity scenarios") }>
          {capacityScenarioIds.map((scenarioId) => (
            <button
              type="button"
              className="button button-ghost"
              aria-pressed={activeScenario === scenarioId}
              onClick={() => selectScenario(scenarioId)}
              key={scenarioId}
            >
              {scenarioTitle(scenarioId, isKo)} {completed[scenarioCompletionKey[scenarioId]] ? "✓" : ""}
            </button>
          ))}
          <button type="button" className="button button-ghost" onClick={resetCapacityScenario}>{t("현재 scenario 초기화", "Reset current scenario")}</button>
        </div>

        <div className="network-observability-capacity-controls">
          <div className="network-observability-fixture-ledger">
            <div><span>LOAD</span><strong>{activeFixture.draft.requestsPerSecond} rps · {activeFixture.draft.bytesPerTransaction / 1_000} KB/txn</strong></div>
            <div><span>LINK</span><strong>{activeFixture.draft.linkMegabitsPerSecond} Mbps</strong></div>
            <div><span>BURST</span><strong>{activeFixture.draft.burstPacketsPerSecond} → {activeFixture.draft.drainPacketsPerSecond} pps · {activeFixture.draft.burstSeconds}s</strong></div>
            <div><span>SOCKETS</span><strong>{activeFixture.draft.averageConnectionMs} ms · limit {activeFixture.draft.connectionLimit}</strong></div>
          </div>
          <InfrastructureChoiceRail
            controlId="capacity-bottleneck-prediction"
            label={t("실행 전 limiting resource를 예측하세요", "Predict the limiting resource before execution")}
            value={activePrediction}
            options={(["edge-bandwidth", "edge-queue", "app-connections"] as const).map((resource) => ({
              value: resource,
              eyebrow: resource === "edge-bandwidth" ? "LINK" : resource === "edge-queue" ? "BURST" : "SOCKETS",
              label: resourceCopy(resource)[locale],
              detail: t("demand ÷ capacity ratio를 비교", "Compare demand ÷ capacity ratio"),
            }))}
            onChange={choosePrediction}
          />
          <InfrastructureChoiceRail
            controlId="capacity-plan"
            label={t("30% headroom을 만들 capacity plan을 선택하세요", "Choose the capacity plan that creates 30% headroom")}
            value={activePlan}
            options={activeFixture.planOptions.map((plan) => ({
              value: plan,
              label: planLabel(plan, isKo),
            }))}
            onChange={choosePlan}
          />
          <button type="button" className="button button-primary" onClick={runCapacityScenario}>{t("baseline 계산·plan 판정", "Calculate baseline and grade plan")}</button>
        </div>
      </section>

      <div className={`network-observability-lab-feedback${feedback.tone === "neutral" ? "" : ` is-${feedback.tone}`}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

function cloneEvidenceDraft(draft: ObservationEvidenceDraft): ObservationEvidenceDraft {
  return { receipts: draft.receipts.map((receipt) => ({ ...receipt })) };
}

function probeTitle(probeId: ObservationProbeId): string {
  return ({
    "client-route": "ip route get",
    "edge-counter": "ip/tc counter",
    "edge-capture": "tcpdump",
    "app-sockets": "ss -lnt",
  } as const)[probeId];
}

function claimOptions(probeId: ObservationProbeId): readonly ObservationClaim[] {
  return ({
    "client-route": ["route-proves-listener", "route-identifies-egress-only"],
    "edge-counter": ["absolute-counter-proves-current-incident", "counter-delta-localizes-drops"],
    "edge-capture": ["capture-absence-proves-global-silence", "capture-absence-is-local"],
    "app-sockets": ["host-sockets-include-every-namespace", "socket-table-is-namespace-local"],
  } as const)[probeId];
}

function claimLabel(claim: ObservationClaim, isKo: boolean): string {
  const copy: Record<ObservationClaim, { ko: string; en: string }> = {
    "route-identifies-egress-only": { ko: "선택 route·egress·next hop만 입증", en: "establishes only the selected route, egress, and next hop" },
    "route-proves-listener": { ko: "destination listener 존재까지 입증", en: "also establishes that the destination listener exists" },
    "counter-delta-localizes-drops": { ko: "같은 window delta가 이 interface의 drop을 입증", en: "the same-window delta establishes drops on this interface" },
    "absolute-counter-proves-current-incident": { ko: "누적 절대값이 현재 사건의 drop을 입증", en: "the accumulated absolute value proves drops in this incident" },
    "capture-absence-is-local": { ko: "이 point·flow·window에서 packet을 관측하지 못함", en: "no packet was observed at this point for this flow and window" },
    "capture-absence-proves-global-silence": { ko: "전체 topology에 packet이 없음을 입증", en: "establishes that no packet exists anywhere in the topology" },
    "socket-table-is-namespace-local": { ko: "이 namespace의 listener·queue만 입증", en: "establishes only this namespace's listeners and queues" },
    "host-sockets-include-every-namespace": { ko: "host table이 모든 namespace socket을 포함", en: "the host table includes sockets from every namespace" },
  };
  return isKo ? copy[claim].ko : copy[claim].en;
}

function evidenceReason(reason: ObservationFailureReason): Feedback {
  return ({
    aligned: message("정렬됨", "aligned"),
    "missing-probe": message("필수 probe가 빠짐", "a required probe is missing"),
    "wrong-observation-scope": message("probe 실행 namespace가 object owner와 다름", "a probe runs outside the object's owning namespace"),
    "wrong-observation-point": message("probe의 path stage 또는 interface가 예상 지점과 다름", "a probe's path stage or interface differs from the expected observation point"),
    "flow-window-mismatch": message("flow 또는 window가 서로 다름", "the flow or window differs"),
    "absolute-counter-only": message("동일 window의 counter delta가 없음", "there is no same-window counter delta"),
    "measurement-claim-mismatch": message("실측값이 선택한 evidence claim과 모순됨", "a measured value contradicts the selected evidence claim"),
    "capture-claim-too-broad": message("evidence claim이 관측 범위를 넘어감", "an evidence claim exceeds its observation scope"),
  } as const)[reason];
}

function resourceCopy(resource: CapacityResource): Feedback {
  return ({
    "edge-bandwidth": message("edge bandwidth", "edge bandwidth"),
    "edge-queue": message("edge burst queue", "edge burst queue"),
    "app-connections": message("app connection limit", "app connection limit"),
  } as const)[resource];
}

function scenarioTitle(scenarioId: CapacityScenarioId, isKo: boolean): string {
  const copy = {
    "bandwidth-saturation": { ko: "BANDWIDTH", en: "BANDWIDTH" },
    "burst-queue": { ko: "BURST QUEUE", en: "BURST QUEUE" },
    "connection-limit": { ko: "CONNECTIONS", en: "CONNECTIONS" },
  } as const;
  return isKo ? copy[scenarioId].ko : copy[scenarioId].en;
}

function planLabel(plan: CapacityPlanId, isKo: boolean): string {
  const copy: Record<CapacityPlanId, { ko: string; en: string }> = {
    "upgrade-edge-link": { ko: "edge link를 200 Mbps로 확장", en: "upgrade the edge link to 200 Mbps" },
    "increase-edge-queue": { ko: "edge queue만 256 packet으로 확대", en: "only enlarge the edge queue to 256 packets" },
    "increase-drain-capacity": { ko: "drain capacity를 800 pps로 확장", en: "increase drain capacity to 800 pps" },
    "increase-connection-limit-only": { ko: "app connection limit만 600으로 확장", en: "only increase the app connection limit to 600" },
    "add-app-replica": { ko: "app replica로 aggregate limit 512 확보", en: "add an app replica for an aggregate limit of 512" },
  };
  return isKo ? copy[plan].ko : copy[plan].en;
}

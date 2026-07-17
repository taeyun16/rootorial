import { useEffect, useMemo, useState } from "react";
import {
  cloneNamespacePlatformDraft,
  evaluateNamespacePlatformDraftChecks,
  evaluateNamespacePlatformScenario,
  namespacePlatformPresets,
  namespacePlatformScenarioIds,
  type NamespacePlatformDraft,
  type NamespacePlatformScenarioEvaluation,
  type NamespacePlatformScenarioId,
} from "../../features/infrastructure/namespace-platform";
import {
  createNamespacePlatformEvidenceBundle,
  evaluateNamespacePlatformEvidenceBundle,
  type NamespacePlatformEvidenceBundleEvaluation,
  type NamespacePlatformEvidenceReceipt,
} from "../../features/infrastructure/namespace-platform-evidence";
import { useLocale } from "../../features/localization/localization";
import { NamespacePlatformView } from "./NamespacePlatformView";

export type NamespacePlatformLabCompletion = {
  evidence: boolean;
  normal: boolean;
  egress: boolean;
  failure: boolean;
  peak: boolean;
};

const emptyCompletion: NamespacePlatformLabCompletion = {
  evidence: false,
  normal: false,
  egress: false,
  failure: false,
  peak: false,
};

const scenarioCompletionKey: Record<
  NamespacePlatformScenarioId,
  Exclude<keyof NamespacePlatformLabCompletion, "evidence">
> = {
  "normal-request": "normal",
  "private-egress": "egress",
  "zone-a-failure": "failure",
  "peak-load": "peak",
};

export function NamespacePlatformLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: NamespacePlatformLabCompletion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<NamespacePlatformDraft>(() =>
    cloneNamespacePlatformDraft(namespacePlatformPresets.scaffold));
  const [receipts, setReceipts] = useState<NamespacePlatformEvidenceReceipt[]>([]);
  const [evidence, setEvidence] = useState<NamespacePlatformEvidenceBundleEvaluation | null>(null);
  const [activeScenario, setActiveScenario] = useState<NamespacePlatformScenarioId>("normal-request");
  const [scenarioResults, setScenarioResults] = useState<Partial<Record<NamespacePlatformScenarioId, NamespacePlatformScenarioEvaluation>>>({});
  const [completion, setCompletion] = useState<NamespacePlatformLabCompletion>(emptyCompletion);
  const [feedback, setFeedback] = useState({
    tone: "idle" as "idle" | "success" | "error",
    ko: "먼저 Ch1–7 evaluator를 재실행해 evidence bundle을 조립하세요.",
    en: "Start by re-running the Chapter 1–7 evaluators to assemble the evidence bundle.",
  });
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(completion), [completion, onCompletionChange]);

  const activeResult = scenarioResults[activeScenario] ?? null;
  const receiptSummary = useMemo(
    () => receipts.map(({ chapterId, adapterRevision }) => `${chapterId}@${adapterRevision}`).join("\n"),
    [receipts],
  );

  function updateCompletion(change: Partial<NamespacePlatformLabCompletion>) {
    setCompletion((current) => ({ ...current, ...change }));
  }

  function clearScenarioResults() {
    setScenarioResults({});
    setCompletion((current) => ({ ...current, normal: false, egress: false, failure: false, peak: false }));
  }

  function loadPreset(preset: "scaffold" | "working") {
    setDraft(cloneNamespacePlatformDraft(namespacePlatformPresets[preset]));
    clearScenarioResults();
    setRuntimeFailed(false);
    setFeedback({
      tone: "idle",
      ko: preset === "working" ? "검증 가능한 설계 초안을 불러왔습니다. 네 scenario를 각각 실행하세요." : "불완전한 scaffold를 불러왔습니다. boundary contract를 수리하세요.",
      en: preset === "working" ? "Loaded the verifiable design draft. Run each of the four scenarios." : "Loaded the incomplete scaffold. Repair its boundary contracts.",
    });
  }

  function applyConcreteChange(change: (draft: NamespacePlatformDraft) => NamespacePlatformDraft) {
    setDraft((current) => change(cloneNamespacePlatformDraft(current)));
    clearScenarioResults();
    setRuntimeFailed(false);
    setFeedback({
      tone: "idle",
      ko: "설계 결정이 바뀌었습니다. 영향받는 네 scenario를 다시 실행하세요.",
      en: "The design changed. Re-run the four affected scenarios.",
    });
  }

  function applyDesignChoice(kind: string, value: string) {
    applyConcreteChange((current) => {
      const working = cloneNamespacePlatformDraft(namespacePlatformPresets.working);
      if (kind === "public-ingress") {
        const edgeListener = { ...working.listeners.find(({ id }) => id === "edge-https")! };
        const internalListeners = working.listeners
          .filter(({ id }) => id === "app-http" || id === "data-postgres")
          .map((item) => ({ ...item }));
        const appPublic = { id: "app-public-https", namespaceId: "app" as const, address: current.namespaces.find(({ id }) => id === "app")?.address ?? "10.30.0.10", port: 443, exposure: "public" as const, up: true };
        return {
          ...current,
          listeners: value === "edge-443-only"
            ? [...internalListeners, edgeListener]
            : value === "edge-and-app-443"
              ? [...internalListeners, edgeListener, appPublic]
              : [...internalListeners, appPublic],
        };
      }
      if (kind === "app-exposure" || kind === "data-exposure") {
        const namespaceId = kind === "app-exposure" ? "app" : "data";
        return {
          ...current,
          namespaces: current.namespaces.map((item) => item.id === namespaceId ? { ...item, addressScope: value as "public" | "private" } : item),
          listeners: current.listeners.map((item) => item.namespaceId === namespaceId ? { ...item, exposure: value as "public" | "private" } : item),
        };
      }
      if (kind === "edge-app" || kind === "app-data") {
        const routeId = kind === "edge-app" ? "edge-app" : "app-data";
        const workingRoute = working.routes.find(({ id }) => id === routeId)!;
        const workingListener = working.listeners.find(({ namespaceId }) => namespaceId === workingRoute.destinationNamespaceId)!;
        const workingEndpoint = working.serviceEndpoints.find(({ namespaceId }) => namespaceId === workingRoute.destinationNamespaceId)!;
        const workingPolicy = working.policyRules.find(({ id }) => id === `allow-${routeId}`)!;
        const wrongPort = kind === "edge-app" ? 8443 : 3306;
        const withoutRoute = current.routes.filter(({ id }) => id !== routeId);
        return {
          ...current,
          routes: value === "missing" ? withoutRoute : [...withoutRoute, { ...workingRoute, destinationPort: value === "correct" ? workingRoute.destinationPort : wrongPort }],
          listeners: value === "correct"
            ? [...current.listeners.filter(({ id }) => id !== workingListener.id), { ...workingListener }]
            : current.listeners,
          serviceEndpoints: value === "correct"
            ? [...current.serviceEndpoints.filter(({ name }) => name !== workingEndpoint.name), { ...workingEndpoint }]
            : current.serviceEndpoints,
          policyRules: value === "correct"
            ? [...current.policyRules.filter(({ id }) => id !== workingPolicy.id), { ...workingPolicy }]
            : current.policyRules,
        };
      }
      if (kind === "private-egress") {
        const workingRoute = working.routes.find(({ id }) => id === "app-external")!;
        return {
          ...current,
          routes: [
            ...current.routes.filter(({ id }) => id !== "app-external"),
            { ...workingRoute, viaNamespaceId: value === "direct-public" ? null : "edge" },
          ],
          nat: value === "edge-nat-conntrack"
            ? { ...working.nat }
            : value === "edge-without-conntrack"
              ? { ...working.nat, conntrackEnabled: false }
              : { ...working.nat, hook: "none", conntrackEnabled: false },
        };
      }
      if (kind === "placement") {
        return {
          ...current,
          placements: value === "split-zones"
            ? working.placements.map((item) => ({ ...item }))
            : working.placements.map((item) => ({ ...item, zone: "zone-a" })),
        };
      }
      if (kind === "capacity") {
        return {
          ...current,
          peakCapacity: value === "headroom"
            ? { ...working.peakCapacity }
            : { ...namespacePlatformPresets.scaffold.peakCapacity },
        };
      }
      return current;
    });
  }

  const publicListeners = draft.listeners.filter(({ exposure, up }) => exposure === "public" && up);
  const publicIngressChoice = publicListeners.length === 1 && publicListeners[0]?.namespaceId === "edge" && publicListeners[0].port === 443
    ? "edge-443-only"
    : publicListeners.some(({ namespaceId }) => namespaceId === "edge") && publicListeners.some(({ namespaceId }) => namespaceId === "app")
      ? "edge-and-app-443"
      : "app-443-only";
  const namespaceScope = (namespaceId: "app" | "data") => draft.namespaces.find(({ id }) => id === namespaceId)?.addressScope ?? "private";
  const readiness = evaluateNamespacePlatformDraftChecks(draft);
  const pathChoice = (
    routeId: "edge-app" | "app-data",
    expectedPort: number,
    ready: boolean,
  ) => {
    const item = draft.routes.find(({ id }) => id === routeId);
    if (!item) return "missing";
    if (item.destinationPort !== expectedPort) return "wrong-port";
    return ready ? "correct" : "incomplete";
  };
  const egressRoute = draft.routes.find(({ id }) => id === "app-external");
  const egressChoice = egressRoute?.viaNamespaceId !== "edge"
    ? "direct-public"
    : draft.nat.conntrackEnabled && draft.nat.hook === "postrouting" && draft.nat.returnRouter === "edge"
      ? "edge-nat-conntrack"
      : "edge-without-conntrack";
  const placementsSplit = ["edge", "app", "data"].every((namespaceId) =>
    draft.placements.some((item) => item.namespaceId === namespaceId && item.zone === "zone-b" && item.healthy));

  function assembleEvidence() {
    try {
      setRuntimeFailed(false);
      const nextReceipts = createNamespacePlatformEvidenceBundle();
      const result = evaluateNamespacePlatformEvidenceBundle(nextReceipts);
      setReceipts(nextReceipts);
      setEvidence(result);
      updateCompletion({ evidence: result.passed });
      setFeedback(result.passed
        ? { tone: "success", ko: "Ch1–7 canonical evaluator가 모두 통과해 versioned receipt 7개를 만들었습니다.", en: "All Chapter 1–7 canonical evaluators passed and produced seven versioned receipts." }
        : { tone: "error", ko: `Evidence bundle 거부: ${result.reason}`, en: `Evidence bundle rejected: ${result.reason}` });
    } catch {
      setRuntimeFailed(true);
      setReceipts([]);
      setEvidence(null);
      updateCompletion({ evidence: false });
      setFeedback({ tone: "error", ko: "선행 evaluator bundle을 실행하지 못했습니다. evidence를 초기화하세요.", en: "The prerequisite evaluator bundle could not run. Reset the evidence." });
    }
  }

  function resetEvidence() {
    setReceipts([]);
    setEvidence(null);
    updateCompletion({ evidence: false });
    setRuntimeFailed(false);
    setFeedback({ tone: "idle", ko: "Evidence receipt를 비웠습니다. canonical evaluator를 다시 실행하세요.", en: "Evidence receipts were cleared. Run the canonical evaluators again." });
  }

  function runActiveScenario() {
    try {
      setRuntimeFailed(false);
      const result = evaluateNamespacePlatformScenario(draft, activeScenario);
      setScenarioResults((current) => ({ ...current, [activeScenario]: result }));
      updateCompletion({ [scenarioCompletionKey[activeScenario]]: result.passed });
      setFeedback(result.passed
        ? { tone: "success", ko: `${scenarioTitle(activeScenario, true)} scenario가 모든 boundary를 통과했습니다.`, en: `${scenarioTitle(activeScenario, false)} passed every boundary.` }
        : { tone: "error", ko: `Scenario 차단: ${result.reason}. 최초 blocked stage를 수리하세요.`, en: `Scenario blocked: ${result.reason}. Repair the first blocked stage.` });
    } catch {
      setRuntimeFailed(true);
      setScenarioResults((current) => ({ ...current, [activeScenario]: undefined }));
      updateCompletion({ [scenarioCompletionKey[activeScenario]]: false });
      setFeedback({ tone: "error", ko: "결정론적 platform scenario를 실행하지 못했습니다. working blueprint를 다시 불러오세요.", en: "The deterministic platform scenario could not run. Reload the working blueprint." });
    }
  }

  return (
    <section
      className="interactive-lab namespace-platform-lab"
      aria-labelledby="namespace-platform-lab-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
      data-active-scenario={activeScenario}
    >
      <header className="namespace-platform-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED STUDIO · VERIFY → ASSEMBLE → RUN</p>
          <h3 id="namespace-platform-lab-title">{t("evidence를 재실행하고 네 namespace platform을 검증", "Re-run evidence and verify a four-namespace platform")}</h3>
          <p>{t("고정 screenshot이 아니라 실제 Ch1–7 evaluator와 Ch7 capacity 계산을 실행합니다.", "This runs the actual Chapter 1–7 evaluators and Chapter 7 capacity calculation rather than trusting a screenshot.")}</p>
        </div>
        <strong>{Object.values(completion).filter(Boolean).length} / 5</strong>
      </header>

      {runtimeFailed ? <div className="namespace-platform-runtime-alert" role="alert">{t("브라우저 platform 모델 실행이 중단됐습니다. 현재 workspace를 초기화하세요.", "The browser platform model stopped. Reset the current workspace.")}</div> : null}

      <section className="namespace-platform-evidence-workspace" aria-labelledby="namespace-platform-evidence-title">
        <header><div><span>01 · VERSIONED EVIDENCE</span><h4 id="namespace-platform-evidence-title">{t("Ch1–7 canonical evaluator 직접 재실행", "Directly re-run the Chapter 1–7 canonical evaluators")}</h4></div><strong>{receipts.length} / 7</strong></header>
        <div className="namespace-platform-action-row">
          <button type="button" className="button button-primary" onClick={assembleEvidence}>{t("7개 evaluator 실행", "Run seven evaluators")}</button>
          <button type="button" className="button button-ghost" onClick={resetEvidence}>{t("evidence 초기화", "Reset evidence")}</button>
        </div>
        <pre aria-label={t("생성된 evidence receipt revision", "Generated evidence receipt revisions")}>{receiptSummary || t("아직 receipt가 없습니다.", "No receipts yet.")}</pre>
      </section>

      <section className="namespace-platform-design-workspace" aria-labelledby="namespace-platform-design-title">
        <header><div><span>02 · PLATFORM CONTRACT</span><h4 id="namespace-platform-design-title">{t("public edge와 private app·data 경계를 조립", "Assemble a public edge and private app/data boundaries")}</h4></div><span>client → edge → app → data</span></header>
        <div className="namespace-platform-preset-row" role="group" aria-label={t("platform 설계 preset", "Platform design presets") }>
          <button type="button" className="button button-ghost" onClick={() => loadPreset("scaffold")}>{t("불완전한 scaffold", "Incomplete scaffold")}</button>
          <button type="button" className="button button-secondary" onClick={() => loadPreset("working")}>{t("검증 가능한 blueprint", "Verifiable blueprint")}</button>
        </div>
        <div className="namespace-platform-control-grid">
          <label><span>{t("public ingress", "Public ingress")}</span><select aria-label={t("public ingress 경계", "Public ingress boundary")} value={publicIngressChoice} onChange={(event) => applyDesignChoice("public-ingress", event.target.value)}><option value="edge-443-only">edge tcp/443 only</option><option value="edge-and-app-443">edge + app tcp/443</option><option value="app-443-only">app tcp/443 only</option></select></label>
          <label><span>{t("app exposure", "App exposure")}</span><select aria-label={t("app address 노출", "App address exposure")} value={namespaceScope("app")} onChange={(event) => applyDesignChoice("app-exposure", event.target.value)}><option value="private">private</option><option value="public">public</option></select></label>
          <label><span>{t("data exposure", "Data exposure")}</span><select aria-label={t("data address 노출", "Data address exposure")} value={namespaceScope("data")} onChange={(event) => applyDesignChoice("data-exposure", event.target.value)}><option value="private">private</option><option value="public">public</option></select></label>
          <label><span>edge → app</span><select aria-label={t("edge에서 app 경로", "Edge to app path")} value={pathChoice("edge-app", 8080, readiness["edge-to-app-8080"])} onChange={(event) => applyDesignChoice("edge-app", event.target.value)}><option value="correct">tcp/8080</option><option value="incomplete" disabled>{t("tcp/8080 · boundary 불일치", "tcp/8080 · boundary mismatch")}</option><option value="wrong-port">tcp/8443</option><option value="missing">missing</option></select></label>
          <label><span>app → data</span><select aria-label={t("app에서 data 경로", "App to data path")} value={pathChoice("app-data", 5432, readiness["app-to-data-5432"])} onChange={(event) => applyDesignChoice("app-data", event.target.value)}><option value="correct">tcp/5432</option><option value="incomplete" disabled>{t("tcp/5432 · boundary 불일치", "tcp/5432 · boundary mismatch")}</option><option value="wrong-port">tcp/3306</option><option value="missing">missing</option></select></label>
          <label><span>{t("private egress", "Private egress")}</span><select aria-label={t("app 외부 update 경로", "App external update path")} value={egressChoice} onChange={(event) => applyDesignChoice("private-egress", event.target.value)}><option value="edge-nat-conntrack">edge NAT + conntrack</option><option value="edge-without-conntrack">edge NAT, no conntrack</option><option value="direct-public">direct public</option></select></label>
          <label><span>{t("failure placement", "Failure placement")}</span><select aria-label={t("edge app data zone 배치", "Edge app data zone placement")} value={placementsSplit ? "split-zones" : "zone-a-only"} onChange={(event) => applyDesignChoice("placement", event.target.value)}><option value="split-zones">zone A + B</option><option value="zone-a-only">zone A only</option></select></label>
          <label><span>{t("peak capacity", "Peak capacity")}</span><select aria-label={t("900 rps capacity plan", "900 rps capacity plan")} value={draft.peakCapacity.linkMegabitsPerSecond >= 160 && draft.peakCapacity.connectionLimit >= 300 && draft.peakCapacity.queueLimitPackets >= 160 ? "headroom" : "undersized"} onChange={(event) => applyDesignChoice("capacity", event.target.value)}><option value="headroom">900 rps · 30% headroom</option><option value="undersized">900 rps · undersized</option></select></label>
        </div>
      </section>

      <section className="namespace-platform-scenario-workspace" aria-labelledby="namespace-platform-scenario-title">
        <header><div><span>03 · FOUR EXECUTABLE SCENARIOS</span><h4 id="namespace-platform-scenario-title">{t("정상·egress·zone 장애·peak 부하를 분리 실행", "Run normal, egress, zone-failure, and peak-load paths separately")}</h4></div><strong>{Number(completion.normal) + Number(completion.egress) + Number(completion.failure) + Number(completion.peak)} / 4</strong></header>
        <div className="namespace-platform-scenario-toolbar" role="group" aria-label={t("platform scenario", "Platform scenarios") }>
          {namespacePlatformScenarioIds.map((scenarioId) => (
            <button type="button" className="button button-ghost" aria-pressed={activeScenario === scenarioId} onClick={() => setActiveScenario(scenarioId)} key={scenarioId}>
              {scenarioTitle(scenarioId, isKo)} {completion[scenarioCompletionKey[scenarioId]] ? "✓" : ""}
            </button>
          ))}
          <button type="button" className="button button-primary" onClick={runActiveScenario}>{t("현재 scenario 실행", "Run current scenario")}</button>
        </div>
        <NamespacePlatformView draft={draft} scenarioId={activeScenario} scenario={activeResult} evidence={evidence} />
      </section>

      <div className={`namespace-platform-feedback${feedback.tone === "success" ? " is-success" : feedback.tone === "error" ? " is-error" : ""}`} role="status" aria-live="polite">
        {isKo ? feedback.ko : feedback.en}
      </div>
    </section>
  );
}

function scenarioTitle(scenarioId: NamespacePlatformScenarioId, isKo: boolean): string {
  return ({
    "normal-request": isKo ? "정상 요청" : "Normal request",
    "private-egress": isKo ? "사설 egress" : "Private egress",
    "zone-a-failure": isKo ? "zone A 장애" : "Zone A failure",
    "peak-load": isKo ? "900 rps peak" : "900 rps peak",
  } as const)[scenarioId];
}

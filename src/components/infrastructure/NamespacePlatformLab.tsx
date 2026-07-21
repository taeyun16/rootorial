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
import {
  InfrastructureChoiceRail,
  InfrastructureWorkspace,
} from "./InfrastructureInteractionPrimitives";
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
        const retainedListeners = current.listeners
          .filter(({ id, namespaceId, exposure }) => id !== "edge-https"
            && id !== "app-public-https"
            && (exposure !== "public" || namespaceId === "data"))
          .map((item) => ({ ...item }));
        const appPublic = { id: "app-public-https", namespaceId: "app" as const, address: current.namespaces.find(({ id }) => id === "app")?.address ?? "10.30.0.10", port: 443, exposure: "public" as const, up: true };
        return {
          ...current,
          listeners: value === "edge-443-only"
            ? [...retainedListeners, edgeListener]
            : value === "edge-and-app-443"
              ? [...retainedListeners, edgeListener, appPublic]
              : [...retainedListeners, appPublic],
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
      if (kind.startsWith("edge-app-") || kind.startsWith("app-data-")) {
        const routeId = kind.startsWith("edge-app-") ? "edge-app" : "app-data";
        const workingRoute = working.routes.find(({ id }) => id === routeId)!;
        const workingListener = working.listeners.find(({ namespaceId }) => namespaceId === workingRoute.destinationNamespaceId)!;
        const workingEndpoint = working.serviceEndpoints.find(({ namespaceId }) => namespaceId === workingRoute.destinationNamespaceId)!;
        const workingPolicy = working.policyRules.find(({ id }) => id === `allow-${routeId}`)!;
        const wrongPort = routeId === "edge-app" ? 8443 : 3306;
        if (kind.endsWith("-route")) {
          const retainedRoutes = current.routes.filter(({ id }) => id !== routeId);
          return {
            ...current,
            routes: value === "missing"
              ? retainedRoutes
              : [...retainedRoutes, { ...workingRoute, destinationPort: value === "correct" ? workingRoute.destinationPort : wrongPort }],
          };
        }
        if (kind.endsWith("-listener")) {
          const retainedListeners = current.listeners.filter(({ id }) => id !== workingListener.id);
          return {
            ...current,
            listeners: value === "missing"
              ? retainedListeners
              : [...retainedListeners, value === "correct" ? { ...workingListener } : { ...workingListener, port: wrongPort }],
          };
        }
        if (kind.endsWith("-discovery")) {
          const retainedEndpoints = current.serviceEndpoints.filter(({ name }) => name !== workingEndpoint.name);
          return {
            ...current,
            serviceEndpoints: value === "missing"
              ? retainedEndpoints
              : [...retainedEndpoints, value === "correct" ? { ...workingEndpoint } : { ...workingEndpoint, port: wrongPort, healthy: false }],
          };
        }
        if (kind.endsWith("-policy")) {
          const retainedRules = current.policyRules.filter(({ id }) => id !== workingPolicy.id);
          return {
            ...current,
            policyRules: value === "missing"
              ? retainedRules
              : [...retainedRules, value === "correct" ? { ...workingPolicy } : { ...workingPolicy, destinationPort: wrongPort }],
          };
        }
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
  const edgePublicListeners = publicListeners.filter(({ namespaceId, port }) => namespaceId === "edge" && port === 443);
  const appPublicListeners = publicListeners.filter(({ namespaceId, port }) => namespaceId === "app" && port === 443);
  const publicIngressChoice: "" | "edge-443-only" | "edge-and-app-443" | "app-443-only" = publicListeners.length === 1 && edgePublicListeners.length === 1
    ? "edge-443-only"
    : publicListeners.length === 2 && edgePublicListeners.length === 1 && appPublicListeners.length === 1
      ? "edge-and-app-443"
      : publicListeners.length === 1 && appPublicListeners.length === 1
        ? "app-443-only"
        : "";
  const namespaceScope = (namespaceId: "app" | "data") => draft.namespaces.find(({ id }) => id === namespaceId)?.addressScope ?? "private";
  const readiness = evaluateNamespacePlatformDraftChecks(draft);
  const sameFields = <Item extends object>(item: Item | undefined, expected: Item) => Boolean(item)
    && Object.entries(expected).every(([key, value]) => item?.[key as keyof Item] === value);
  const pathArtifactChoices = (routeId: "edge-app" | "app-data") => {
    const expectedRoute = namespacePlatformPresets.working.routes.find(({ id }) => id === routeId)!;
    const expectedListener = namespacePlatformPresets.working.listeners.find(({ namespaceId }) => namespaceId === expectedRoute.destinationNamespaceId)!;
    const expectedEndpoint = namespacePlatformPresets.working.serviceEndpoints.find(({ namespaceId }) => namespaceId === expectedRoute.destinationNamespaceId)!;
    const expectedPolicy = namespacePlatformPresets.working.policyRules.find(({ id }) => id === `allow-${routeId}`)!;
    const route = draft.routes.find(({ id }) => id === routeId);
    const listener = draft.listeners.find(({ id }) => id === expectedListener.id);
    const endpoint = draft.serviceEndpoints.find(({ name }) => name === expectedEndpoint.name);
    const policy = draft.policyRules.find(({ id }) => id === expectedPolicy.id);
    return {
      route: !route ? "missing" : sameFields(route, expectedRoute) ? "correct" : "mismatch",
      listener: !listener ? "missing" : sameFields(listener, expectedListener) ? "correct" : "mismatch",
      discovery: !endpoint ? "missing" : sameFields(endpoint, expectedEndpoint) ? "correct" : "mismatch",
      policy: !policy ? "missing" : sameFields(policy, expectedPolicy) ? "correct" : "mismatch",
    } as const;
  };
  const edgeAppChoices = pathArtifactChoices("edge-app");
  const appDataChoices = pathArtifactChoices("app-data");
  const egressRoute = draft.routes.find(({ id }) => id === "app-external");
  const egressChoice = egressRoute?.viaNamespaceId !== "edge"
    ? "direct-public"
    : draft.nat.conntrackEnabled && draft.nat.hook === "postrouting" && draft.nat.returnRouter === "edge"
      ? "edge-nat-conntrack"
      : "edge-without-conntrack";
  const placementsSplit = ["edge", "app", "data"].every((namespaceId) =>
    draft.placements.some((item) => item.namespaceId === namespaceId && item.zone === "zone-b" && item.healthy));
  const capacityChoice = draft.peakCapacity.linkMegabitsPerSecond >= 160
    && draft.peakCapacity.connectionLimit >= 300
    && draft.peakCapacity.queueLimitPackets >= 160
    ? "headroom"
    : "undersized";
  const contractReadiness = [
    {
      id: "public-ingress",
      label: t("공개 ingress", "Public ingress"),
      ready: readiness["edge-only-public-443"] && readiness["ingress-policy"],
    },
    {
      id: "private-service-path",
      label: t("사설 service path", "Private service path"),
      ready: readiness["app-private"] && readiness["data-private"] && readiness["edge-to-app-8080"] && readiness["app-to-data-5432"],
    },
    {
      id: "stateful-egress",
      label: t("상태 기반 egress", "Stateful egress"),
      ready: readiness["egress-through-edge-nat-conntrack"],
    },
    {
      id: "failure-capacity-budget",
      label: t("장애·용량 예산", "Failure and capacity budget"),
      ready: readiness["zone-a-survival"] && readiness["capacity-headroom"],
    },
  ] as const;

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

  function selectScenario(scenarioId: NamespacePlatformScenarioId) {
    if (scenarioId === activeScenario) return;
    const hasStoredResult = Boolean(scenarioResults[scenarioId]);
    setActiveScenario(scenarioId);
    setFeedback({
      tone: "idle",
      ko: hasStoredResult
        ? `${scenarioTitle(scenarioId, true)} scenario를 선택했습니다. 저장된 결과를 확인하거나 다시 실행하세요.`
        : `${scenarioTitle(scenarioId, true)} scenario를 선택했습니다. 아직 실행되지 않았습니다. 현재 scenario를 실행하세요.`,
      en: hasStoredResult
        ? `${scenarioTitle(scenarioId, false)} scenario selected. Review the stored result or run it again.`
        : `${scenarioTitle(scenarioId, false)} scenario selected. It has not run yet. Run the current scenario.`,
    });
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
        <InfrastructureWorkspace
          label={t("namespace platform 아키텍처 작업 공간", "Namespace platform architecture workspace")}
          stage={(
            <>
              <NamespacePlatformView draft={draft} scenarioId={activeScenario} scenario={activeResult} evidence={evidence} />
              <div className="namespace-platform-control-grid">
                <InfrastructureChoiceRail
                  controlId="platform-public-ingress"
                  label={t("공개 요청을 어디서 끝낼까?", "Where should public requests terminate?")}
                  value={publicIngressChoice}
                  options={[
                    { value: "edge-443-only", eyebrow: "EDGE", label: "edge tcp/443 only", detail: t("public listener를 edge에만 유지", "Keep the only public listener at edge") },
                    { value: "edge-and-app-443", eyebrow: "EDGE + APP", label: "edge + app tcp/443", detail: t("app도 공개 경계에 노출", "Expose app at the public boundary too") },
                    { value: "app-443-only", eyebrow: "APP", label: "app tcp/443 only", detail: t("edge를 건너뛰", "Bypass the edge boundary") },
                  ]}
                  onChange={(value) => applyDesignChoice("public-ingress", value)}
                />
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-app-exposure"
                    label={t("app address 노출", "App address exposure")}
                    value={namespaceScope("app")}
                    options={[
                      { value: "private", label: "private", detail: "10.30.0.10" },
                      { value: "public", label: "public", detail: t("외부에 직접 노출", "Directly exposed") },
                    ]}
                    onChange={(value) => applyDesignChoice("app-exposure", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-data-exposure"
                    label={t("data address 노출", "Data address exposure")}
                    value={namespaceScope("data")}
                    options={[
                      { value: "private", label: "private", detail: "10.40.0.20" },
                      { value: "public", label: "public", detail: t("외부에 직접 노출", "Directly exposed") },
                    ]}
                    onChange={(value) => applyDesignChoice("data-exposure", value)}
                  />
                </div>
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-edge-app-route"
                    label={t("edge → app route", "Edge → app route")}
                    value={edgeAppChoices.route}
                    options={[
                      { value: "correct", label: "route tcp/8080", detail: "edge → 10.30.0.10" },
                      { value: "mismatch", label: "route tcp/8443", detail: t("route만 잘못된 port로 변경", "Change only the route to a wrong port") },
                      { value: "missing", label: "missing", detail: t("route 없음", "No route") },
                    ]}
                    onChange={(value) => applyDesignChoice("edge-app-route", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-edge-app-listener"
                    label={t("app listener", "App listener")}
                    value={edgeAppChoices.listener}
                    options={[
                      { value: "correct", label: "listen tcp/8080", detail: "app · private · UP" },
                      { value: "mismatch", label: "listen tcp/8443", detail: t("listener만 잘못된 port로 변경", "Change only the listener to a wrong port") },
                      { value: "missing", label: "missing", detail: t("listener 없음", "No listener") },
                    ]}
                    onChange={(value) => applyDesignChoice("edge-app-listener", value)}
                  />
                </div>
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-edge-app-discovery"
                    label={t("app service discovery", "App service discovery")}
                    value={edgeAppChoices.discovery}
                    options={[
                      { value: "correct", label: "app.internal:8080", detail: "healthy" },
                      { value: "mismatch", label: "app.internal:8443", detail: t("endpoint만 unhealthy로 변경", "Change only the endpoint to unhealthy") },
                      { value: "missing", label: "missing", detail: t("service endpoint 없음", "No service endpoint") },
                    ]}
                    onChange={(value) => applyDesignChoice("edge-app-discovery", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-edge-app-policy"
                    label={t("edge → app policy", "Edge → app policy")}
                    value={edgeAppChoices.policy}
                    options={[
                      { value: "correct", label: "allow tcp/8080", detail: "edge → app · NEW" },
                      { value: "mismatch", label: "allow tcp/8443", detail: t("policy만 잘못된 port로 변경", "Change only the policy to a wrong port") },
                      { value: "missing", label: "missing", detail: t("allow rule 없음", "No allow rule") },
                    ]}
                    onChange={(value) => applyDesignChoice("edge-app-policy", value)}
                  />
                </div>
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-app-data-route"
                    label={t("app → data route", "App → data route")}
                    value={appDataChoices.route}
                    options={[
                      { value: "correct", label: "route tcp/5432", detail: "app → 10.40.0.10" },
                      { value: "mismatch", label: "route tcp/3306", detail: t("route만 잘못된 port로 변경", "Change only the route to a wrong port") },
                      { value: "missing", label: "missing", detail: t("route 없음", "No route") },
                    ]}
                    onChange={(value) => applyDesignChoice("app-data-route", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-app-data-listener"
                    label={t("data listener", "Data listener")}
                    value={appDataChoices.listener}
                    options={[
                      { value: "correct", label: "listen tcp/5432", detail: "data · private · UP" },
                      { value: "mismatch", label: "listen tcp/3306", detail: t("listener만 잘못된 port로 변경", "Change only the listener to a wrong port") },
                      { value: "missing", label: "missing", detail: t("listener 없음", "No listener") },
                    ]}
                    onChange={(value) => applyDesignChoice("app-data-listener", value)}
                  />
                </div>
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-app-data-discovery"
                    label={t("data service discovery", "Data service discovery")}
                    value={appDataChoices.discovery}
                    options={[
                      { value: "correct", label: "data.internal:5432", detail: "healthy" },
                      { value: "mismatch", label: "data.internal:3306", detail: t("endpoint만 unhealthy로 변경", "Change only the endpoint to unhealthy") },
                      { value: "missing", label: "missing", detail: t("service endpoint 없음", "No service endpoint") },
                    ]}
                    onChange={(value) => applyDesignChoice("app-data-discovery", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-app-data-policy"
                    label={t("app → data policy", "App → data policy")}
                    value={appDataChoices.policy}
                    options={[
                      { value: "correct", label: "allow tcp/5432", detail: "app → data · NEW" },
                      { value: "mismatch", label: "allow tcp/3306", detail: t("policy만 잘못된 port로 변경", "Change only the policy to a wrong port") },
                      { value: "missing", label: "missing", detail: t("allow rule 없음", "No allow rule") },
                    ]}
                    onChange={(value) => applyDesignChoice("app-data-policy", value)}
                  />
                </div>
                <InfrastructureChoiceRail
                  controlId="platform-private-egress"
                  label={t("사설 app의 외부 update 경로", "External update path for the private app")}
                  value={egressChoice}
                  options={[
                    { value: "edge-nat-conntrack", eyebrow: "STATEFUL", label: "edge NAT + conntrack", detail: t("반환 경로를 edge에서 역변환", "Reverse the return path at edge") },
                    { value: "edge-without-conntrack", eyebrow: "STATE LOST", label: "edge NAT, no conntrack", detail: t("반환 packet의 역변환 상태 없음", "No reverse-translation state") },
                    { value: "direct-public", eyebrow: "BYPASS", label: "direct public", detail: t("private boundary를 건너뛰", "Bypass the private boundary") },
                  ]}
                  onChange={(value) => applyDesignChoice("private-egress", value)}
                />
                <div className="namespace-platform-paired-controls">
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-placement"
                    label={t("zone A 실패를 버틸 배치", "Placement that survives Zone A")}
                    value={placementsSplit ? "split-zones" : "zone-a-only"}
                    options={[
                      { value: "split-zones", label: "zone A + B", detail: t("독립 경로 유지", "Keep an independent path") },
                      { value: "zone-a-only", label: "zone A only", detail: t("상관 실패", "Correlated failure") },
                    ]}
                    onChange={(value) => applyDesignChoice("placement", value)}
                  />
                  <InfrastructureChoiceRail
                    compact
                    controlId="platform-capacity"
                    label={t("900 rps peak capacity", "900 rps peak capacity")}
                    value={capacityChoice}
                    options={[
                      { value: "headroom", label: "30% headroom", detail: t("모든 utilization ≤ 70%", "Every utilization ≤ 70%") },
                      { value: "undersized", label: "undersized", detail: t("한 resource 이상 초과", "At least one resource exceeds budget") },
                    ]}
                    onChange={(value) => applyDesignChoice("capacity", value)}
                  />
                </div>
              </div>
            </>
          )}
          inspector={(
            <div className="namespace-platform-contract-inspector">
              <span>LIVE CONTRACT</span>
              <strong>{Object.values(readiness).filter(Boolean).length} / {Object.keys(readiness).length}</strong>
              <ul aria-live="polite">
                {contractReadiness.map(({ id, label, ready }) => {
                  const status = ready ? t("준비됨", "ready") : t("준비되지 않음", "not ready");
                  return (
                    <li key={id} data-ready={ready} aria-label={`${label}: ${status}`}>
                      <span>{label}</span>
                      <small>{status}</small>
                    </li>
                  );
                })}
              </ul>
              <p>{t("카드를 누르면 아키텍처 계약과 시각 상태가 즉시 다시 계산됩니다.", "Each card immediately recalculates the architecture contract and visual state.")}</p>
            </div>
          )}
        />
      </section>

      <section className="namespace-platform-scenario-workspace" aria-labelledby="namespace-platform-scenario-title">
        <header><div><span>03 · FOUR EXECUTABLE SCENARIOS</span><h4 id="namespace-platform-scenario-title">{t("정상·egress·zone 장애·peak 부하를 분리 실행", "Run normal, egress, zone-failure, and peak-load paths separately")}</h4></div><strong>{Number(completion.normal) + Number(completion.egress) + Number(completion.failure) + Number(completion.peak)} / 4</strong></header>
        <div className="namespace-platform-scenario-toolbar" role="group" aria-label={t("platform scenario", "Platform scenarios") }>
          {namespacePlatformScenarioIds.map((scenarioId) => (
            <button type="button" className="button button-ghost" aria-pressed={activeScenario === scenarioId} onClick={() => selectScenario(scenarioId)} key={scenarioId}>
              {scenarioTitle(scenarioId, isKo)} {completion[scenarioCompletionKey[scenarioId]] ? "✓" : ""}
            </button>
          ))}
          <button type="button" className="button button-primary" onClick={runActiveScenario}>{t("현재 scenario 실행", "Run current scenario")}</button>
        </div>
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

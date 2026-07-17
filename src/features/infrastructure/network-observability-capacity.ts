export const observationProbeIds = [
  "client-route",
  "edge-counter",
  "edge-capture",
  "app-sockets",
] as const;

export type ObservationProbeId = (typeof observationProbeIds)[number];
export type ObservationNamespace = "host" | "client" | "edge" | "app" | "data";
export type ObservationClaim =
  | "route-identifies-egress-only"
  | "route-proves-listener"
  | "counter-delta-localizes-drops"
  | "absolute-counter-proves-current-incident"
  | "capture-absence-is-local"
  | "capture-absence-proves-global-silence"
  | "socket-table-is-namespace-local"
  | "host-sockets-include-every-namespace";

export type ObservationReceipt = {
  probeId: ObservationProbeId;
  namespaceId: ObservationNamespace;
  pathStage: "client-egress" | "edge-egress" | "app-ingress";
  interfaceId: "route-table" | "egress0" | "socket-table";
  flowKey: "request-17" | "request-18";
  windowId: "12:00-12:01" | "12:05-12:06";
  command: string;
  claim: ObservationClaim;
  counterStart: number | null;
  counterEnd: number | null;
  capturedPackets: number | null;
};

export type ObservationEvidenceDraft = {
  receipts: readonly ObservationReceipt[];
};

export type ObservationCheckId =
  | "required-probes"
  | "correct-observation-scopes"
  | "correct-observation-points"
  | "same-flow"
  | "same-window"
  | "counter-delta"
  | "measurements-match-claims"
  | "bounded-claims";

export type ObservationFailureReason =
  | "aligned"
  | "missing-probe"
  | "wrong-observation-scope"
  | "wrong-observation-point"
  | "flow-window-mismatch"
  | "absolute-counter-only"
  | "measurement-claim-mismatch"
  | "capture-claim-too-broad";

export type ObservationEvidenceEvaluation = {
  passed: boolean;
  reason: ObservationFailureReason;
  checks: Readonly<Record<ObservationCheckId, boolean>>;
  receipts: readonly ObservationReceipt[];
  counterDelta: number | null;
};

const expectedScope: Readonly<Record<ObservationProbeId, ObservationNamespace>> = {
  "client-route": "client",
  "edge-counter": "edge",
  "edge-capture": "edge",
  "app-sockets": "app",
};

const expectedClaim: Readonly<Record<ObservationProbeId, ObservationClaim>> = {
  "client-route": "route-identifies-egress-only",
  "edge-counter": "counter-delta-localizes-drops",
  "edge-capture": "capture-absence-is-local",
  "app-sockets": "socket-table-is-namespace-local",
};

const expectedObservationPoint: Readonly<Record<ObservationProbeId, Pick<ObservationReceipt, "pathStage" | "interfaceId">>> = {
  "client-route": { pathStage: "client-egress", interfaceId: "route-table" },
  "edge-counter": { pathStage: "edge-egress", interfaceId: "egress0" },
  "edge-capture": { pathStage: "edge-egress", interfaceId: "egress0" },
  "app-sockets": { pathStage: "app-ingress", interfaceId: "socket-table" },
};

const baseReceipts: readonly ObservationReceipt[] = [
  {
    probeId: "client-route",
    namespaceId: "client",
    pathStage: "client-egress",
    interfaceId: "route-table",
    flowKey: "request-17",
    windowId: "12:00-12:01",
    command: "ip route get 10.40.0.20",
    claim: "route-identifies-egress-only",
    counterStart: null,
    counterEnd: null,
    capturedPackets: null,
  },
  {
    probeId: "edge-counter",
    namespaceId: "edge",
    pathStage: "edge-egress",
    interfaceId: "egress0",
    flowKey: "request-17",
    windowId: "12:00-12:01",
    command: "ip -s link show egress0 && tc -s qdisc show dev egress0",
    claim: "counter-delta-localizes-drops",
    counterStart: 100,
    counterEnd: 132,
    capturedPackets: null,
  },
  {
    probeId: "edge-capture",
    namespaceId: "edge",
    pathStage: "edge-egress",
    interfaceId: "egress0",
    flowKey: "request-17",
    windowId: "12:00-12:01",
    command: "tcpdump -ni egress0 'tcp port 8080'",
    claim: "capture-absence-is-local",
    counterStart: null,
    counterEnd: null,
    capturedPackets: 0,
  },
  {
    probeId: "app-sockets",
    namespaceId: "app",
    pathStage: "app-ingress",
    interfaceId: "socket-table",
    flowKey: "request-17",
    windowId: "12:00-12:01",
    command: "ss -lnt '( sport = :8080 )'",
    claim: "socket-table-is-namespace-local",
    counterStart: null,
    counterEnd: null,
    capturedPackets: null,
  },
] as const;

function cloneReceipt(receipt: ObservationReceipt): ObservationReceipt {
  return { ...receipt };
}

function draftWithReceiptChanges(
  changes: Partial<Record<ObservationProbeId, Partial<ObservationReceipt>>>,
): ObservationEvidenceDraft {
  return {
    receipts: baseReceipts.map((receipt) => ({
      ...receipt,
      ...changes[receipt.probeId],
    })),
  };
}

export const observationEvidencePresets = {
  scaffold: draftWithReceiptChanges({
    "client-route": {
      namespaceId: "host",
      claim: "route-proves-listener",
    },
    "edge-counter": {
      namespaceId: "host",
      claim: "absolute-counter-proves-current-incident",
    },
    "edge-capture": {
      namespaceId: "client",
      claim: "capture-absence-proves-global-silence",
    },
    "app-sockets": {
      namespaceId: "host",
      claim: "host-sockets-include-every-namespace",
    },
  }),
  aligned: draftWithReceiptChanges({}),
} as const satisfies Record<string, ObservationEvidenceDraft>;

export function evaluateObservationEvidence(
  draft: ObservationEvidenceDraft,
): ObservationEvidenceEvaluation {
  const receipts = draft.receipts.map(cloneReceipt);
  const byProbe = new Map(receipts.map((receipt) => [receipt.probeId, receipt]));
  const requiredProbes = observationProbeIds.every((probeId) => byProbe.has(probeId))
    && receipts.length === observationProbeIds.length;
  const correctScopes = requiredProbes && observationProbeIds.every(
    (probeId) => byProbe.get(probeId)?.namespaceId === expectedScope[probeId],
  );
  const correctObservationPoints = requiredProbes && observationProbeIds.every((probeId) => {
    const receipt = byProbe.get(probeId);
    const expected = expectedObservationPoint[probeId];
    return receipt?.pathStage === expected.pathStage && receipt.interfaceId === expected.interfaceId;
  });
  const sameFlow = receipts.length > 0
    && new Set(receipts.map(({ flowKey }) => flowKey)).size === 1;
  const sameWindow = receipts.length > 0
    && new Set(receipts.map(({ windowId }) => windowId)).size === 1;
  const counter = byProbe.get("edge-counter");
  const counterDelta = counter?.counterStart !== null
    && counter?.counterStart !== undefined
    && counter?.counterEnd !== null
    && counter?.counterEnd !== undefined
    && Number.isFinite(counter.counterStart)
    && Number.isFinite(counter.counterEnd)
    && counter.counterStart >= 0
    && counter.counterEnd >= counter.counterStart
    ? counter.counterEnd - counter.counterStart
    : null;
  const counterDeltaReady = Boolean(
    counter
    && counter.claim === expectedClaim["edge-counter"]
    && counterDelta !== null,
  );
  const capture = byProbe.get("edge-capture");
  const measurementsMatchClaims = Boolean(
    counterDeltaReady
    && capture
    && capture.capturedPackets === 0,
  );
  const boundedClaims = requiredProbes && observationProbeIds.every(
    (probeId) => byProbe.get(probeId)?.claim === expectedClaim[probeId],
  );
  const checks: Record<ObservationCheckId, boolean> = {
    "required-probes": requiredProbes,
    "correct-observation-scopes": correctScopes,
    "correct-observation-points": correctObservationPoints,
    "same-flow": sameFlow,
    "same-window": sameWindow,
    "counter-delta": counterDeltaReady,
    "measurements-match-claims": measurementsMatchClaims,
    "bounded-claims": boundedClaims,
  };
  let reason: ObservationFailureReason = "aligned";
  if (!requiredProbes) reason = "missing-probe";
  else if (!correctScopes) reason = "wrong-observation-scope";
  else if (!correctObservationPoints) reason = "wrong-observation-point";
  else if (!sameFlow || !sameWindow) reason = "flow-window-mismatch";
  else if (!counterDeltaReady) reason = "absolute-counter-only";
  else if (!measurementsMatchClaims) reason = "measurement-claim-mismatch";
  else if (!boundedClaims) reason = "capture-claim-too-broad";
  return {
    passed: Object.values(checks).every(Boolean),
    reason,
    checks,
    receipts,
    counterDelta,
  };
}

export const capacityScenarioIds = [
  "bandwidth-saturation",
  "burst-queue",
  "connection-limit",
] as const;

export type CapacityScenarioId = (typeof capacityScenarioIds)[number];
export type CapacityResource = "edge-bandwidth" | "edge-queue" | "app-connections";
export type CapacityPlanId =
  | "upgrade-edge-link"
  | "increase-edge-queue"
  | "increase-drain-capacity"
  | "increase-connection-limit-only"
  | "add-app-replica";

export type CapacityDraft = {
  requestsPerSecond: number;
  bytesPerTransaction: number;
  linkMegabitsPerSecond: number;
  averageConnectionMs: number;
  connectionLimit: number;
  burstPacketsPerSecond: number;
  drainPacketsPerSecond: number;
  burstSeconds: number;
  queueLimitPackets: number;
};

export type CapacityMetric = {
  resource: CapacityResource;
  demand: number;
  capacity: number;
  utilization: number;
  saturated: boolean;
  unit: "Mbps" | "packets" | "connections";
};

export type CapacityEvaluation = {
  metrics: readonly CapacityMetric[];
  limitingResource: CapacityResource;
  saturatedResources: readonly CapacityResource[];
  headroomReady: boolean;
};

export type CapacityScenarioFixture = {
  id: CapacityScenarioId;
  draft: CapacityDraft;
  planOptions: readonly CapacityPlanId[];
};

export type CapacityScenarioEvaluation = {
  scenarioId: CapacityScenarioId;
  prediction: CapacityResource;
  plan: CapacityPlanId;
  predictionCorrect: boolean;
  passed: boolean;
  baseline: CapacityEvaluation;
  planned: CapacityEvaluation;
};

export const capacityScenarioFixtures: Readonly<Record<CapacityScenarioId, CapacityScenarioFixture>> = {
  "bandwidth-saturation": {
    id: "bandwidth-saturation",
    draft: {
      requestsPerSecond: 1_000,
      bytesPerTransaction: 16_000,
      linkMegabitsPerSecond: 100,
      averageConnectionMs: 150,
      connectionLimit: 400,
      burstPacketsPerSecond: 600,
      drainPacketsPerSecond: 600,
      burstSeconds: 0.5,
      queueLimitPackets: 64,
    },
    planOptions: ["upgrade-edge-link", "increase-edge-queue"],
  },
  "burst-queue": {
    id: "burst-queue",
    draft: {
      requestsPerSecond: 500,
      bytesPerTransaction: 10_000,
      linkMegabitsPerSecond: 100,
      averageConnectionMs: 200,
      connectionLimit: 300,
      burstPacketsPerSecond: 800,
      drainPacketsPerSecond: 600,
      burstSeconds: 0.5,
      queueLimitPackets: 64,
    },
    planOptions: ["increase-drain-capacity", "increase-connection-limit-only"],
  },
  "connection-limit": {
    id: "connection-limit",
    draft: {
      requestsPerSecond: 400,
      bytesPerTransaction: 12_000,
      linkMegabitsPerSecond: 100,
      averageConnectionMs: 800,
      connectionLimit: 256,
      burstPacketsPerSecond: 400,
      drainPacketsPerSecond: 500,
      burstSeconds: 0.5,
      queueLimitPackets: 64,
    },
    planOptions: ["add-app-replica", "upgrade-edge-link"],
  },
};

function validNonNegative(value: number): boolean {
  return Number.isFinite(value) && value >= 0;
}

function validPositive(value: number): boolean {
  return Number.isFinite(value) && value > 0;
}

export function calculateCapacity(draft: CapacityDraft): CapacityEvaluation {
  if (
    !validNonNegative(draft.requestsPerSecond)
    || !validNonNegative(draft.bytesPerTransaction)
    || !validPositive(draft.linkMegabitsPerSecond)
    || !validNonNegative(draft.averageConnectionMs)
    || !validPositive(draft.connectionLimit)
    || !validNonNegative(draft.burstPacketsPerSecond)
    || !validNonNegative(draft.drainPacketsPerSecond)
    || !validNonNegative(draft.burstSeconds)
    || !validPositive(draft.queueLimitPackets)
  ) {
    throw new RangeError("capacity values must be finite and capacities must be positive");
  }
  const bandwidth = draft.requestsPerSecond * draft.bytesPerTransaction * 8 / 1_000_000;
  const queueGrowth = Math.max(
    0,
    draft.burstPacketsPerSecond - draft.drainPacketsPerSecond,
  ) * draft.burstSeconds;
  const concurrentConnections = Math.ceil(
    draft.requestsPerSecond * draft.averageConnectionMs / 1_000,
  );
  const metrics: CapacityMetric[] = [
    {
      resource: "edge-bandwidth",
      demand: bandwidth,
      capacity: draft.linkMegabitsPerSecond,
      utilization: bandwidth / draft.linkMegabitsPerSecond,
      saturated: bandwidth / draft.linkMegabitsPerSecond >= 1,
      unit: "Mbps",
    },
    {
      resource: "edge-queue",
      demand: queueGrowth,
      capacity: draft.queueLimitPackets,
      utilization: queueGrowth / draft.queueLimitPackets,
      saturated: queueGrowth / draft.queueLimitPackets >= 1,
      unit: "packets",
    },
    {
      resource: "app-connections",
      demand: concurrentConnections,
      capacity: draft.connectionLimit,
      utilization: concurrentConnections / draft.connectionLimit,
      saturated: concurrentConnections / draft.connectionLimit >= 1,
      unit: "connections",
    },
  ];
  const limitingResource = [...metrics].sort(
    (left, right) => right.utilization - left.utilization,
  )[0]!.resource;
  return {
    metrics: metrics.map((metric) => ({ ...metric })),
    limitingResource,
    saturatedResources: metrics.filter(({ saturated }) => saturated).map(({ resource }) => resource),
    headroomReady: metrics.every(({ utilization }) => utilization <= 0.7),
  };
}

function applyCapacityPlan(draft: CapacityDraft, plan: CapacityPlanId): CapacityDraft {
  if (plan === "upgrade-edge-link") {
    return { ...draft, linkMegabitsPerSecond: 200 };
  }
  if (plan === "increase-edge-queue") {
    return { ...draft, queueLimitPackets: 256 };
  }
  if (plan === "increase-drain-capacity") {
    return { ...draft, drainPacketsPerSecond: 800 };
  }
  if (plan === "increase-connection-limit-only") {
    return { ...draft, connectionLimit: 600 };
  }
  return { ...draft, connectionLimit: 512 };
}

export function evaluateCapacityScenario(
  scenarioId: CapacityScenarioId,
  prediction: CapacityResource,
  plan: CapacityPlanId,
): CapacityScenarioEvaluation {
  const fixture = capacityScenarioFixtures[scenarioId];
  if (!fixture) throw new RangeError("unknown capacity scenario");
  if (!fixture.planOptions.includes(plan)) throw new RangeError("plan does not belong to scenario");
  const baseline = calculateCapacity({ ...fixture.draft });
  const planned = calculateCapacity(applyCapacityPlan(fixture.draft, plan));
  const predictionCorrect = prediction === baseline.limitingResource;
  return {
    scenarioId,
    prediction,
    plan,
    predictionCorrect,
    passed: predictionCorrect && planned.headroomReady,
    baseline,
    planned,
  };
}

export const observabilityIncidentIds = [
  "wrong-namespace-ss",
  "absolute-drop-counter",
  "single-point-capture",
  "queue-hides-overload",
] as const;

export type ObservabilityIncidentId = (typeof observabilityIncidentIds)[number];
export type ObservabilityIncidentRepair =
  | "inspect-app-sockets"
  | "repeat-host-sockets"
  | "compare-window-delta"
  | "reset-counter-before-window"
  | "dual-capture-same-window"
  | "extend-client-capture"
  | "increase-drain-service"
  | "only-enlarge-queue";

export const observabilityIncidentFixtures: Readonly<Record<ObservabilityIncidentId, {
  id: ObservabilityIncidentId;
  repairOptions: readonly ObservabilityIncidentRepair[];
}>> = {
  "wrong-namespace-ss": {
    id: "wrong-namespace-ss",
    repairOptions: ["inspect-app-sockets", "repeat-host-sockets"],
  },
  "absolute-drop-counter": {
    id: "absolute-drop-counter",
    repairOptions: ["compare-window-delta", "reset-counter-before-window"],
  },
  "single-point-capture": {
    id: "single-point-capture",
    repairOptions: ["dual-capture-same-window", "extend-client-capture"],
  },
  "queue-hides-overload": {
    id: "queue-hides-overload",
    repairOptions: ["increase-drain-service", "only-enlarge-queue"],
  },
};

export type ObservabilityIncidentReason =
  | "scoped-socket-evidence"
  | "counter-delta-established"
  | "capture-boundary-compared"
  | "sustained-capacity-repaired"
  | "wrong-observation-scope"
  | "absolute-counter-only"
  | "capture-claim-too-broad"
  | "queue-does-not-add-throughput";

export type ObservabilityIncidentEvaluation = {
  incidentId: ObservabilityIncidentId;
  repair: ObservabilityIncidentRepair;
  passed: boolean;
  reason: ObservabilityIncidentReason;
};

export function evaluateObservabilityIncident(
  incidentId: ObservabilityIncidentId,
  repair: ObservabilityIncidentRepair,
): ObservabilityIncidentEvaluation {
  const fixture = observabilityIncidentFixtures[incidentId];
  if (!fixture?.repairOptions.includes(repair)) throw new RangeError("repair does not belong to incident");
  const correct: Record<ObservabilityIncidentId, ObservabilityIncidentRepair> = {
    "wrong-namespace-ss": "inspect-app-sockets",
    "absolute-drop-counter": "compare-window-delta",
    "single-point-capture": "dual-capture-same-window",
    "queue-hides-overload": "increase-drain-service",
  };
  const passed = correct[incidentId] === repair;
  const success: Record<ObservabilityIncidentId, ObservabilityIncidentReason> = {
    "wrong-namespace-ss": "scoped-socket-evidence",
    "absolute-drop-counter": "counter-delta-established",
    "single-point-capture": "capture-boundary-compared",
    "queue-hides-overload": "sustained-capacity-repaired",
  };
  const failure: Record<ObservabilityIncidentId, ObservabilityIncidentReason> = {
    "wrong-namespace-ss": "wrong-observation-scope",
    "absolute-drop-counter": "absolute-counter-only",
    "single-point-capture": "capture-claim-too-broad",
    "queue-hides-overload": "queue-does-not-add-throughput",
  };
  return {
    incidentId,
    repair,
    passed,
    reason: passed ? success[incidentId] : failure[incidentId],
  };
}

export function canCompleteNetworkObservabilityChapter(progress: {
  evidenceAlignmentComplete: boolean;
  bandwidthScenarioComplete: boolean;
  queueScenarioComplete: boolean;
  connectionScenarioComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return progress.evidenceAlignmentComplete
    && progress.bandwidthScenarioComplete
    && progress.queueScenarioComplete
    && progress.connectionScenarioComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

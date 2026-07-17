import {
  calculateCapacity,
  type CapacityDraft,
  type CapacityEvaluation,
} from "./network-observability-capacity.ts";
import {
  createNamespacePlatformEvidenceBundle,
  evaluateNamespacePlatformEvidenceBundle,
  type NamespacePlatformEvidenceBundleEvaluation,
  type NamespacePlatformEvidenceReceipt,
} from "./namespace-platform-evidence.ts";

export type NamespacePlatformNamespaceId = "edge" | "app" | "data";
export type NamespacePlatformZone = "zone-a" | "zone-b";

export type NamespacePlatformNamespace = {
  id: NamespacePlatformNamespaceId;
  address: string;
  addressScope: "public" | "private";
};

export type NamespacePlatformListener = {
  id: string;
  namespaceId: NamespacePlatformNamespaceId;
  address: string;
  port: number;
  exposure: "public" | "private";
  up: boolean;
};

export type NamespacePlatformRoute = {
  id: string;
  sourceNamespaceId: NamespacePlatformNamespaceId;
  destinationNamespaceId: NamespacePlatformNamespaceId | "external";
  destinationAddress: string;
  destinationPort: number;
  viaNamespaceId: NamespacePlatformNamespaceId | null;
};

export type NamespacePlatformPolicyRule = {
  id: string;
  source: "client" | NamespacePlatformNamespaceId;
  destination: NamespacePlatformNamespaceId | "external";
  destinationPort: number;
  connectionState: "new" | "established";
  verdict: "accept" | "drop";
};

export type NamespacePlatformServiceEndpoint = {
  name: "app.internal" | "data.internal";
  namespaceId: "app" | "data";
  address: string;
  port: number;
  healthy: boolean;
};

export type NamespacePlatformNat = {
  routerNamespaceId: "edge";
  sourceNamespaceId: "app";
  hook: "postrouting" | "prerouting" | "none";
  targetAddress: string;
  targetOwnedByRouter: boolean;
  conntrackEnabled: boolean;
  returnRouter: "edge" | "different-router";
};

export type NamespacePlatformPlacement = {
  id: string;
  component: "gateway" | "app-replica" | "data-replica";
  namespaceId: NamespacePlatformNamespaceId;
  zone: NamespacePlatformZone;
  role: "active" | "standby";
  healthy: boolean;
};

export type NamespacePlatformDraft = {
  namespaces: readonly NamespacePlatformNamespace[];
  listeners: readonly NamespacePlatformListener[];
  routes: readonly NamespacePlatformRoute[];
  policyRules: readonly NamespacePlatformPolicyRule[];
  serviceEndpoints: readonly NamespacePlatformServiceEndpoint[];
  nat: NamespacePlatformNat;
  placements: readonly NamespacePlatformPlacement[];
  peakCapacity: CapacityDraft;
};

export const namespacePlatformScenarioIds = [
  "normal-request",
  "private-egress",
  "zone-a-failure",
  "peak-load",
] as const;

export type NamespacePlatformScenarioId = (typeof namespacePlatformScenarioIds)[number];

export type NamespacePlatformCheckId =
  | "evidence-bundle"
  | "edge-only-public-443"
  | "ingress-policy"
  | "app-private"
  | "data-private"
  | "edge-to-app-8080"
  | "app-to-data-5432"
  | "stateful-policy-replies"
  | "discovery-targets-private-services"
  | "egress-through-edge-nat-conntrack"
  | "zone-a-survival"
  | "peak-900-rps"
  | "capacity-headroom";

export type NamespacePlatformFailureReason =
  | "ready"
  | "evidence-invalid"
  | "public-ingress-exposed"
  | "ingress-policy-missing"
  | "app-exposed"
  | "data-exposed"
  | "edge-app-path-broken"
  | "app-data-path-broken"
  | "stateful-policy-missing"
  | "service-discovery-broken"
  | "egress-state-missing"
  | "zone-a-correlated"
  | "peak-rate-mismatch"
  | "capacity-headroom-exceeded";

export type NamespacePlatformPathStage = {
  id: string;
  label: string;
  namespaceId: "client" | "edge" | "app" | "data" | "external" | "zone-b";
  status: "passed" | "blocked" | "not-run";
};

export type NamespacePlatformScenarioEvaluation = {
  scenarioId: NamespacePlatformScenarioId;
  passed: boolean;
  reason: NamespacePlatformFailureReason;
  path: readonly NamespacePlatformPathStage[];
  capacity: CapacityEvaluation | null;
};

export type NamespacePlatformEvaluation = {
  passed: boolean;
  reason: NamespacePlatformFailureReason;
  checks: Readonly<Record<NamespacePlatformCheckId, boolean>>;
  scenarios: Readonly<Record<NamespacePlatformScenarioId, NamespacePlatformScenarioEvaluation>>;
  evidence: NamespacePlatformEvidenceBundleEvaluation;
  capacity: CapacityEvaluation;
};

export type NamespacePlatformDraftCheckId = Exclude<NamespacePlatformCheckId, "evidence-bundle">;
export type NamespacePlatformDraftChecks = Readonly<Record<NamespacePlatformDraftCheckId, boolean>>;

const capstoneCapacityWorking: CapacityDraft = {
  requestsPerSecond: 900,
  bytesPerTransaction: 12_000,
  linkMegabitsPerSecond: 160,
  averageConnectionMs: 200,
  connectionLimit: 300,
  burstPacketsPerSecond: 1_200,
  drainPacketsPerSecond: 1_000,
  burstSeconds: 0.5,
  queueLimitPackets: 160,
};

const workingNamespaces: readonly NamespacePlatformNamespace[] = [
  { id: "edge", address: "203.0.113.10", addressScope: "public" },
  { id: "app", address: "10.30.0.10", addressScope: "private" },
  { id: "data", address: "10.40.0.10", addressScope: "private" },
];

const workingListeners: readonly NamespacePlatformListener[] = [
  { id: "edge-https", namespaceId: "edge", address: "203.0.113.10", port: 443, exposure: "public", up: true },
  { id: "app-http", namespaceId: "app", address: "10.30.0.10", port: 8080, exposure: "private", up: true },
  { id: "data-postgres", namespaceId: "data", address: "10.40.0.10", port: 5432, exposure: "private", up: true },
];

const workingRoutes: readonly NamespacePlatformRoute[] = [
  { id: "edge-app", sourceNamespaceId: "edge", destinationNamespaceId: "app", destinationAddress: "10.30.0.10", destinationPort: 8080, viaNamespaceId: null },
  { id: "app-data", sourceNamespaceId: "app", destinationNamespaceId: "data", destinationAddress: "10.40.0.10", destinationPort: 5432, viaNamespaceId: null },
  { id: "app-external", sourceNamespaceId: "app", destinationNamespaceId: "external", destinationAddress: "198.51.100.20", destinationPort: 443, viaNamespaceId: "edge" },
];

const workingPolicyRules: readonly NamespacePlatformPolicyRule[] = [
  { id: "allow-client-edge", source: "client", destination: "edge", destinationPort: 443, connectionState: "new", verdict: "accept" },
  { id: "allow-edge-app", source: "edge", destination: "app", destinationPort: 8080, connectionState: "new", verdict: "accept" },
  { id: "allow-app-data", source: "app", destination: "data", destinationPort: 5432, connectionState: "new", verdict: "accept" },
  { id: "allow-app-egress", source: "app", destination: "external", destinationPort: 443, connectionState: "new", verdict: "accept" },
  { id: "allow-app-reply", source: "app", destination: "edge", destinationPort: 443, connectionState: "established", verdict: "accept" },
  { id: "allow-data-reply", source: "data", destination: "app", destinationPort: 8080, connectionState: "established", verdict: "accept" },
  { id: "allow-external-reply", source: "edge", destination: "app", destinationPort: 443, connectionState: "established", verdict: "accept" },
];

const workingEndpoints: readonly NamespacePlatformServiceEndpoint[] = [
  { name: "app.internal", namespaceId: "app", address: "10.30.0.10", port: 8080, healthy: true },
  { name: "data.internal", namespaceId: "data", address: "10.40.0.10", port: 5432, healthy: true },
];

const workingPlacements: readonly NamespacePlatformPlacement[] = [
  { id: "edge-a", component: "gateway", namespaceId: "edge", zone: "zone-a", role: "active", healthy: true },
  { id: "edge-b", component: "gateway", namespaceId: "edge", zone: "zone-b", role: "active", healthy: true },
  { id: "app-a", component: "app-replica", namespaceId: "app", zone: "zone-a", role: "active", healthy: true },
  { id: "app-b", component: "app-replica", namespaceId: "app", zone: "zone-b", role: "active", healthy: true },
  { id: "data-a", component: "data-replica", namespaceId: "data", zone: "zone-a", role: "active", healthy: true },
  { id: "data-b", component: "data-replica", namespaceId: "data", zone: "zone-b", role: "standby", healthy: true },
];

export const namespacePlatformPresets = {
  scaffold: {
    namespaces: workingNamespaces.map((namespace) => namespace.id === "edge" ? { ...namespace } : { ...namespace, addressScope: "public" as const }),
    listeners: [
      ...workingListeners.map((listener) => listener.id === "app-http"
        ? { ...listener, port: 443, exposure: "public" as const }
        : { ...listener }),
    ],
    routes: [
      { ...workingRoutes[0]!, destinationPort: 8443 },
      { ...workingRoutes[2]!, viaNamespaceId: null },
    ],
    policyRules: workingPolicyRules.map((rule) => rule.id === "allow-edge-app"
      ? { ...rule, destinationPort: 8443 }
      : { ...rule }),
    serviceEndpoints: workingEndpoints.map((endpoint) => endpoint.name === "app.internal"
      ? { ...endpoint, port: 8443, healthy: false }
      : { ...endpoint }),
    nat: {
      routerNamespaceId: "edge",
      sourceNamespaceId: "app",
      hook: "prerouting",
      targetAddress: "203.0.113.10",
      targetOwnedByRouter: true,
      conntrackEnabled: false,
      returnRouter: "different-router",
    },
    placements: workingPlacements.map((placement) => ({ ...placement, zone: "zone-a" as const })),
    peakCapacity: {
      ...capstoneCapacityWorking,
      linkMegabitsPerSecond: 100,
      connectionLimit: 200,
      queueLimitPackets: 64,
    },
  },
  working: {
    namespaces: workingNamespaces,
    listeners: workingListeners,
    routes: workingRoutes,
    policyRules: workingPolicyRules,
    serviceEndpoints: workingEndpoints,
    nat: {
      routerNamespaceId: "edge",
      sourceNamespaceId: "app",
      hook: "postrouting",
      targetAddress: "203.0.113.10",
      targetOwnedByRouter: true,
      conntrackEnabled: true,
      returnRouter: "edge",
    },
    placements: workingPlacements,
    peakCapacity: capstoneCapacityWorking,
  },
} as const satisfies Record<string, NamespacePlatformDraft>;

export function cloneNamespacePlatformDraft(draft: NamespacePlatformDraft): NamespacePlatformDraft {
  return {
    namespaces: draft.namespaces.map((item) => ({ ...item })),
    listeners: draft.listeners.map((item) => ({ ...item })),
    routes: draft.routes.map((item) => ({ ...item })),
    policyRules: draft.policyRules.map((item) => ({ ...item })),
    serviceEndpoints: draft.serviceEndpoints.map((item) => ({ ...item })),
    nat: { ...draft.nat },
    placements: draft.placements.map((item) => ({ ...item })),
    peakCapacity: { ...draft.peakCapacity },
  };
}

function namespace(draft: NamespacePlatformDraft, id: NamespacePlatformNamespaceId) {
  return draft.namespaces.find((item) => item.id === id);
}

function listener(draft: NamespacePlatformDraft, namespaceId: NamespacePlatformNamespaceId, port: number) {
  const owner = namespace(draft, namespaceId);
  return draft.listeners.find((item) => item.namespaceId === namespaceId
    && item.address === owner?.address
    && item.port === port
    && item.up);
}

function route(
  draft: NamespacePlatformDraft,
  sourceNamespaceId: NamespacePlatformNamespaceId,
  destinationNamespaceId: NamespacePlatformNamespaceId | "external",
  destinationPort: number,
  viaNamespaceId: NamespacePlatformNamespaceId | null,
) {
  const expectedAddress = destinationNamespaceId === "external"
    ? "198.51.100.20"
    : namespace(draft, destinationNamespaceId)?.address;
  return draft.routes.find((item) => item.sourceNamespaceId === sourceNamespaceId
    && item.destinationNamespaceId === destinationNamespaceId
    && item.destinationAddress === expectedAddress
    && item.destinationPort === destinationPort
    && item.viaNamespaceId === viaNamespaceId);
}

function allows(
  draft: NamespacePlatformDraft,
  source: NamespacePlatformPolicyRule["source"],
  destination: NamespacePlatformPolicyRule["destination"],
  destinationPort: number,
  connectionState: NamespacePlatformPolicyRule["connectionState"],
) {
  return draft.policyRules.some((rule) => rule.source === source
    && rule.destination === destination
    && rule.destinationPort === destinationPort
    && rule.connectionState === connectionState
    && rule.verdict === "accept");
}

function endpoint(
  draft: NamespacePlatformDraft,
  name: NamespacePlatformServiceEndpoint["name"],
  namespaceId: NamespacePlatformServiceEndpoint["namespaceId"],
  port: number,
) {
  const item = draft.serviceEndpoints.find((candidate) => candidate.name === name);
  const owner = namespace(draft, namespaceId);
  return Boolean(item && owner
    && item.namespaceId === namespaceId
    && item.address === owner.address
    && item.port === port
    && item.healthy);
}

function edgeOnlyPublic443(draft: NamespacePlatformDraft) {
  const publicListeners = draft.listeners.filter((item) => item.exposure === "public" && item.up);
  return publicListeners.length === 1
    && publicListeners[0]?.namespaceId === "edge"
    && publicListeners[0].port === 443
    && publicListeners[0].address === namespace(draft, "edge")?.address;
}

function privateNamespace(draft: NamespacePlatformDraft, namespaceId: "app" | "data") {
  const owner = namespace(draft, namespaceId);
  return Boolean(owner
    && owner.addressScope === "private"
    && !draft.listeners.some((item) => item.namespaceId === namespaceId && item.exposure === "public"));
}

function edgeToAppReady(draft: NamespacePlatformDraft) {
  return Boolean(
    privateNamespace(draft, "app")
    && listener(draft, "app", 8080)
    && route(draft, "edge", "app", 8080, null)
    && allows(draft, "edge", "app", 8080, "new")
    && endpoint(draft, "app.internal", "app", 8080),
  );
}

function appToDataReady(draft: NamespacePlatformDraft) {
  return Boolean(
    privateNamespace(draft, "data")
    && listener(draft, "data", 5432)
    && route(draft, "app", "data", 5432, null)
    && allows(draft, "app", "data", 5432, "new")
    && endpoint(draft, "data.internal", "data", 5432),
  );
}

function statefulRepliesReady(draft: NamespacePlatformDraft) {
  return allows(draft, "app", "edge", 443, "established")
    && allows(draft, "data", "app", 8080, "established")
    && allows(draft, "edge", "app", 443, "established");
}

function egressReady(draft: NamespacePlatformDraft) {
  const egressRoute = route(draft, "app", "external", 443, "edge");
  return Boolean(
    privateNamespace(draft, "app")
    && egressRoute?.viaNamespaceId === "edge"
    && allows(draft, "app", "external", 443, "new")
    && draft.nat.routerNamespaceId === "edge"
    && draft.nat.sourceNamespaceId === "app"
    && draft.nat.hook === "postrouting"
    && draft.nat.targetAddress === namespace(draft, "edge")?.address
    && draft.nat.targetOwnedByRouter
    && draft.nat.conntrackEnabled
    && draft.nat.returnRouter === "edge",
  );
}

function zoneBPathReady(draft: NamespacePlatformDraft) {
  const zoneB = draft.placements.filter((placement) => placement.zone === "zone-b" && placement.healthy);
  return zoneB.some(({ component, namespaceId }) => component === "gateway" && namespaceId === "edge")
    && zoneB.some(({ component, namespaceId }) => component === "app-replica" && namespaceId === "app")
    && zoneB.some(({ component, namespaceId, role }) => component === "data-replica" && namespaceId === "data" && (role === "active" || role === "standby"));
}

/**
 * Canonical readiness projection for the learner's current platform draft.
 * Scenario grading, the aggregate evaluator, and visual edge badges all use
 * these predicates so the diagram cannot disagree with the verdict.
 */
export function evaluateNamespacePlatformDraftChecks(
  draft: NamespacePlatformDraft,
): NamespacePlatformDraftChecks {
  const capacity = calculateCapacity({ ...draft.peakCapacity });
  return {
    "edge-only-public-443": edgeOnlyPublic443(draft),
    "ingress-policy": allows(draft, "client", "edge", 443, "new"),
    "app-private": privateNamespace(draft, "app"),
    "data-private": privateNamespace(draft, "data"),
    "edge-to-app-8080": edgeToAppReady(draft),
    "app-to-data-5432": appToDataReady(draft),
    "stateful-policy-replies": statefulRepliesReady(draft),
    "discovery-targets-private-services": endpoint(draft, "app.internal", "app", 8080)
      && endpoint(draft, "data.internal", "data", 5432),
    "egress-through-edge-nat-conntrack": egressReady(draft),
    "zone-a-survival": zoneBPathReady(draft),
    "peak-900-rps": draft.peakCapacity.requestsPerSecond === 900,
    "capacity-headroom": capacity.metrics.every(({ utilization }) => utilization <= 0.7),
  };
}

function stagedPath(
  rows: ReadonlyArray<Omit<NamespacePlatformPathStage, "status"> & { ready: boolean }>,
): NamespacePlatformPathStage[] {
  let blocked = false;
  return rows.map(({ ready, ...row }) => {
    if (blocked) return { ...row, status: "not-run" };
    if (!ready) {
      blocked = true;
      return { ...row, status: "blocked" };
    }
    return { ...row, status: "passed" };
  });
}

function firstScenarioFailure(
  draft: NamespacePlatformDraft,
  scenarioId: NamespacePlatformScenarioId,
  capacity: CapacityEvaluation,
): NamespacePlatformFailureReason {
  if (scenarioId === "normal-request") {
    if (!edgeOnlyPublic443(draft)) return "public-ingress-exposed";
    if (!allows(draft, "client", "edge", 443, "new")) return "ingress-policy-missing";
    if (!privateNamespace(draft, "app")) return "app-exposed";
    if (!privateNamespace(draft, "data")) return "data-exposed";
    if (!edgeToAppReady(draft)) return endpoint(draft, "app.internal", "app", 8080) ? "edge-app-path-broken" : "service-discovery-broken";
    if (!appToDataReady(draft)) return endpoint(draft, "data.internal", "data", 5432) ? "app-data-path-broken" : "service-discovery-broken";
    if (!statefulRepliesReady(draft)) return "stateful-policy-missing";
  }
  if (scenarioId === "private-egress") {
    if (!privateNamespace(draft, "app")) return "app-exposed";
    if (!egressReady(draft)) return "egress-state-missing";
  }
  if (scenarioId === "zone-a-failure" && !zoneBPathReady(draft)) return "zone-a-correlated";
  if (scenarioId === "peak-load") {
    if (draft.peakCapacity.requestsPerSecond !== 900) return "peak-rate-mismatch";
    if (!capacity.headroomReady) return "capacity-headroom-exceeded";
  }
  return "ready";
}

export function evaluateNamespacePlatformScenario(
  draft: NamespacePlatformDraft,
  scenarioId: NamespacePlatformScenarioId,
): NamespacePlatformScenarioEvaluation {
  const capacity = calculateCapacity({ ...draft.peakCapacity });
  const reason = firstScenarioFailure(draft, scenarioId, capacity);
  let path: NamespacePlatformPathStage[];
  if (scenarioId === "normal-request") {
    path = stagedPath([
      { id: "public-client", label: "public client → edge tcp/443", namespaceId: "client", ready: edgeOnlyPublic443(draft) && allows(draft, "client", "edge", 443, "new") },
      { id: "edge-ingress", label: "edge listener tcp/443", namespaceId: "edge", ready: Boolean(listener(draft, "edge", 443)) },
      { id: "edge-app", label: "app.internal → app tcp/8080", namespaceId: "app", ready: edgeToAppReady(draft) },
      { id: "app-data", label: "data.internal → data tcp/5432", namespaceId: "data", ready: appToDataReady(draft) },
      { id: "normal-reply", label: "stateful reply to client", namespaceId: "client", ready: statefulRepliesReady(draft) },
    ]);
  } else if (scenarioId === "private-egress") {
    const egressRoute = route(draft, "app", "external", 443, "edge");
    path = stagedPath([
      { id: "app-update", label: "app private update request", namespaceId: "app", ready: privateNamespace(draft, "app") },
      { id: "edge-route", label: "private route via edge", namespaceId: "edge", ready: egressRoute?.viaNamespaceId === "edge" },
      { id: "source-translation", label: "edge POSTROUTING translation", namespaceId: "edge", ready: draft.nat.hook === "postrouting" && draft.nat.targetOwnedByRouter },
      { id: "external-update", label: "external update tcp/443", namespaceId: "external", ready: allows(draft, "app", "external", 443, "new") },
      { id: "conntrack-return", label: "conntrack reverse translation", namespaceId: "app", ready: egressReady(draft) },
    ]);
  } else if (scenarioId === "zone-a-failure") {
    const has = (component: NamespacePlatformPlacement["component"], namespaceId: NamespacePlatformNamespaceId) =>
      draft.placements.some((placement) => placement.zone === "zone-b" && placement.healthy && placement.component === component && placement.namespaceId === namespaceId);
    path = stagedPath([
      { id: "zone-a-removed", label: "zone A removed", namespaceId: "client", ready: true },
      { id: "edge-zone-b", label: "edge gateway in zone B", namespaceId: "zone-b", ready: has("gateway", "edge") },
      { id: "app-zone-b", label: "app replica in zone B", namespaceId: "zone-b", ready: has("app-replica", "app") },
      { id: "data-zone-b", label: "data replica in zone B", namespaceId: "zone-b", ready: has("data-replica", "data") },
      { id: "service-survives", label: "request path remains available", namespaceId: "client", ready: zoneBPathReady(draft) },
    ]);
  } else {
    path = stagedPath([
      { id: "peak-rate", label: "900 requests/second", namespaceId: "client", ready: draft.peakCapacity.requestsPerSecond === 900 },
      { id: "bandwidth-headroom", label: "edge bandwidth ≤ 70%", namespaceId: "edge", ready: capacity.metrics.find(({ resource }) => resource === "edge-bandwidth")!.utilization <= 0.7 },
      { id: "queue-headroom", label: "edge queue ≤ 70%", namespaceId: "edge", ready: capacity.metrics.find(({ resource }) => resource === "edge-queue")!.utilization <= 0.7 },
      { id: "connection-headroom", label: "app connections ≤ 70%", namespaceId: "app", ready: capacity.metrics.find(({ resource }) => resource === "app-connections")!.utilization <= 0.7 },
    ]);
  }
  return {
    scenarioId,
    passed: reason === "ready" && path.every(({ status }) => status === "passed"),
    reason,
    path,
    capacity: scenarioId === "peak-load" ? capacity : null,
  };
}

export function evaluateNamespacePlatform(
  draft: NamespacePlatformDraft,
  receipts: readonly NamespacePlatformEvidenceReceipt[],
): NamespacePlatformEvaluation {
  // Receipts establish prerequisite mastery by re-running Chapters 1–7. The
  // concrete draft below is independently evaluated; receipts never attest
  // that the learner's current topology is correct.
  const evidence = evaluateNamespacePlatformEvidenceBundle(receipts);
  const capacity = calculateCapacity({ ...draft.peakCapacity });
  const scenarios = Object.fromEntries(namespacePlatformScenarioIds.map((scenarioId) => [
    scenarioId,
    evaluateNamespacePlatformScenario(draft, scenarioId),
  ])) as Record<NamespacePlatformScenarioId, NamespacePlatformScenarioEvaluation>;
  const checks: Record<NamespacePlatformCheckId, boolean> = {
    "evidence-bundle": evidence.passed,
    ...evaluateNamespacePlatformDraftChecks(draft),
  };
  let reason: NamespacePlatformFailureReason = "ready";
  if (!checks["evidence-bundle"]) reason = "evidence-invalid";
  else if (!checks["edge-only-public-443"]) reason = "public-ingress-exposed";
  else if (!checks["ingress-policy"]) reason = "ingress-policy-missing";
  else if (!checks["app-private"]) reason = "app-exposed";
  else if (!checks["data-private"]) reason = "data-exposed";
  else if (!checks["discovery-targets-private-services"]) reason = "service-discovery-broken";
  else if (!checks["edge-to-app-8080"]) reason = "edge-app-path-broken";
  else if (!checks["app-to-data-5432"]) reason = "app-data-path-broken";
  else if (!checks["stateful-policy-replies"]) reason = "stateful-policy-missing";
  else if (!checks["egress-through-edge-nat-conntrack"]) reason = "egress-state-missing";
  else if (!checks["zone-a-survival"]) reason = "zone-a-correlated";
  else if (!checks["peak-900-rps"]) reason = "peak-rate-mismatch";
  else if (!checks["capacity-headroom"]) reason = "capacity-headroom-exceeded";
  return {
    passed: reason === "ready" && Object.values(checks).every(Boolean)
      && namespacePlatformScenarioIds.every((scenarioId) => scenarios[scenarioId].passed),
    reason,
    checks,
    scenarios,
    evidence,
    capacity,
  };
}

export const namespacePlatformIncidentIds = [
  "app-publicly-exposed",
  "missing-data-route",
  "stateless-private-egress",
  "zone-a-correlated-platform",
] as const;
export type NamespacePlatformIncidentId = (typeof namespacePlatformIncidentIds)[number];
export type NamespacePlatformIncidentRepair =
  | "make-app-private"
  | "add-edge-access-log"
  | "restore-app-data-5432"
  | "publish-data-5432"
  | "restore-edge-nat-conntrack"
  | "assign-app-public-ip"
  | "spread-platform-across-zones"
  | "add-zone-a-replica";

function draftWithAppPublic(): NamespacePlatformDraft {
  const draft = cloneNamespacePlatformDraft(namespacePlatformPresets.working);
  return {
    ...draft,
    namespaces: draft.namespaces.map((item) => item.id === "app" ? { ...item, addressScope: "public" } : item),
    listeners: draft.listeners.map((item) => item.namespaceId === "app" ? { ...item, exposure: "public" } : item),
  };
}

export const namespacePlatformIncidentFixtures: Readonly<Record<NamespacePlatformIncidentId, { draft: NamespacePlatformDraft; repairOptions: readonly NamespacePlatformIncidentRepair[] }>> = {
  "app-publicly-exposed": { draft: draftWithAppPublic(), repairOptions: ["make-app-private", "add-edge-access-log"] },
  "missing-data-route": {
    draft: { ...cloneNamespacePlatformDraft(namespacePlatformPresets.working), routes: workingRoutes.filter(({ id }) => id !== "app-data").map((item) => ({ ...item })) },
    repairOptions: ["restore-app-data-5432", "publish-data-5432"],
  },
  "stateless-private-egress": {
    draft: { ...cloneNamespacePlatformDraft(namespacePlatformPresets.working), nat: { ...namespacePlatformPresets.working.nat, conntrackEnabled: false } },
    repairOptions: ["restore-edge-nat-conntrack", "assign-app-public-ip"],
  },
  "zone-a-correlated-platform": {
    draft: { ...cloneNamespacePlatformDraft(namespacePlatformPresets.working), placements: workingPlacements.map((item) => ({ ...item, zone: "zone-a" })) },
    repairOptions: ["spread-platform-across-zones", "add-zone-a-replica"],
  },
};

export type NamespacePlatformIncidentEvaluation = { incidentId: NamespacePlatformIncidentId; repair: NamespacePlatformIncidentRepair; passed: boolean; reason: NamespacePlatformFailureReason };

export function evaluateNamespacePlatformIncident(incidentId: NamespacePlatformIncidentId, repair: NamespacePlatformIncidentRepair): NamespacePlatformIncidentEvaluation {
  const fixture = namespacePlatformIncidentFixtures[incidentId];
  if (!fixture.repairOptions.includes(repair)) throw new RangeError("repair does not belong to incident");
  let draft = cloneNamespacePlatformDraft(fixture.draft);
  if (repair === "make-app-private") {
    draft = {
      ...draft,
      namespaces: draft.namespaces.map((item) => item.id === "app" ? { ...item, addressScope: "private" } : item),
      listeners: draft.listeners.map((item) => item.namespaceId === "app" ? { ...item, exposure: "private" } : item),
    };
  }
  if (repair === "restore-app-data-5432") draft = { ...draft, routes: [...draft.routes, { ...workingRoutes.find(({ id }) => id === "app-data")! }] };
  if (repair === "publish-data-5432") {
    draft = {
      ...draft,
      namespaces: draft.namespaces.map((item) => item.id === "data" ? { ...item, addressScope: "public" } : item),
      listeners: draft.listeners.map((item) => item.namespaceId === "data" ? { ...item, exposure: "public" } : item),
    };
  }
  if (repair === "restore-edge-nat-conntrack") draft = { ...draft, nat: { ...namespacePlatformPresets.working.nat } };
  if (repair === "assign-app-public-ip") draft = draftWithAppPublic();
  if (repair === "spread-platform-across-zones") draft = { ...draft, placements: workingPlacements.map((item) => ({ ...item })) };
  if (repair === "add-zone-a-replica") draft = { ...draft, placements: [...draft.placements, { id: "app-a-extra", component: "app-replica", namespaceId: "app", zone: "zone-a", role: "active", healthy: true }] };
  const result = evaluateNamespacePlatform(draft, createNamespacePlatformEvidenceBundle());
  return { incidentId, repair, passed: result.passed, reason: result.reason };
}

export function canCompleteNamespacePlatformChapter(progress: {
  evidenceComplete: boolean;
  normalRequestComplete: boolean;
  privateEgressComplete: boolean;
  zoneFailureComplete: boolean;
  peakLoadComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return progress.evidenceComplete
    && progress.normalRequestComplete
    && progress.privateEgressComplete
    && progress.zoneFailureComplete
    && progress.peakLoadComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

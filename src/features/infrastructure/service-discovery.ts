export const servicePathModes = ["dns-lifecycle", "health-affinity"] as const;

export type ServicePathMode = typeof servicePathModes[number];
export type ResolverPolicy = "honor-ttl" | "refresh-early" | "cache-forever";
export type MembershipPolicy = "healthy-only" | "all-registered";
export type BalancingAlgorithm = "round-robin" | "source-affinity";
export type AffinityFailurePolicy = "remap-ineligible" | "keep-ineligible";
export type ServiceBackendId = "app-a" | "app-b" | "app-c";
export type ServiceBackendHealth = "healthy" | "unhealthy" | "draining";

export type ServiceBackend = {
  id: ServiceBackendId;
  namespaceId: ServiceBackendId;
  address: string;
  registered: boolean;
  health: ServiceBackendHealth;
  listenerUp: boolean;
};

export type ServicePathDraft = {
  mode: ServicePathMode;
  resolverPolicy: ResolverPolicy;
  cachedAddress: string;
  authorityAddress: string;
  cacheStoredAtSeconds: number;
  ttlSeconds: number;
  beforeExpirySeconds: number;
  atExpirySeconds: number;
  oldVipRetirementSeconds: number;
  vipListenerUp: boolean;
  membershipPolicy: MembershipPolicy;
  algorithm: BalancingAlgorithm;
  affinityFailurePolicy: AffinityFailurePolicy;
  backends: readonly ServiceBackend[];
};

export type DnsResolutionObservation = {
  atSeconds: number;
  cacheExpiresAtSeconds: number;
  cacheFresh: boolean;
  source: "cache" | "authority";
  address: string;
  vipAvailable: boolean;
};

export type ServiceConnectionSelection = {
  clientKey: string;
  ordinal: number;
  backendId: ServiceBackendId | null;
  eligibleBackendIds: readonly ServiceBackendId[];
};

export type ServicePathCheckId =
  | "cache-used-before-expiry"
  | "authority-used-at-expiry"
  | "old-vip-retained-through-ttl"
  | "resolved-vip-listening"
  | "healthy-membership-only"
  | "affinity-stable"
  | "failed-target-removed"
  | "affinity-remapped"
  | "backend-listener";

export type ServicePathFailureReason =
  | "connected"
  | "refreshed-before-expiry"
  | "expired-cache-reused"
  | "old-vip-retired-before-ttl"
  | "vip-unavailable"
  | "no-healthy-backend"
  | "unhealthy-backend-selected"
  | "affinity-broken"
  | "ineligible-affinity-retained"
  | "listener-missing";

export type ServicePathStage = {
  id: string;
  label: string;
  status: "passed" | "blocked";
  reason: ServicePathFailureReason | null;
};

export type ServicePathEvaluation = {
  mode: ServicePathMode;
  passed: boolean;
  reason: ServicePathFailureReason;
  checks: Readonly<Record<ServicePathCheckId, boolean>>;
  dns: {
    beforeExpiry: DnsResolutionObservation;
    atExpiry: DnsResolutionObservation;
  };
  balancing: {
    initialEligibleBackendIds: readonly ServiceBackendId[];
    first: ServiceConnectionSelection;
    repeated: ServiceConnectionSelection;
    afterFailure: ServiceConnectionSelection;
    failedBackendId: ServiceBackendId | null;
    afterFailureBackends: readonly ServiceBackend[];
  };
  backends: readonly ServiceBackend[];
  path: readonly ServicePathStage[];
};

const baseBackends: readonly ServiceBackend[] = [
  { id: "app-a", namespaceId: "app-a", address: "10.30.0.2:8080", registered: true, health: "healthy", listenerUp: true },
  { id: "app-b", namespaceId: "app-b", address: "10.30.0.3:8080", registered: true, health: "unhealthy", listenerUp: true },
  { id: "app-c", namespaceId: "app-c", address: "10.30.0.4:8080", registered: true, health: "healthy", listenerUp: true },
];

function cloneBackends(backends: readonly ServiceBackend[]): ServiceBackend[] {
  return backends.map((backend) => ({ ...backend }));
}

const commonDraft = {
  cachedAddress: "10.40.0.10",
  authorityAddress: "10.40.0.20",
  cacheStoredAtSeconds: 100,
  ttlSeconds: 60,
  beforeExpirySeconds: 159,
  atExpirySeconds: 160,
  vipListenerUp: true,
  backends: baseBackends,
} as const;

export const servicePathPresets = {
  "dns-scaffold": {
    ...commonDraft,
    mode: "dns-lifecycle",
    resolverPolicy: "cache-forever",
    oldVipRetirementSeconds: 150,
    membershipPolicy: "healthy-only",
    algorithm: "source-affinity",
    affinityFailurePolicy: "remap-ineligible",
  },
  "dns-working": {
    ...commonDraft,
    mode: "dns-lifecycle",
    resolverPolicy: "honor-ttl",
    oldVipRetirementSeconds: 160,
    membershipPolicy: "healthy-only",
    algorithm: "source-affinity",
    affinityFailurePolicy: "remap-ineligible",
  },
  "affinity-scaffold": {
    ...commonDraft,
    mode: "health-affinity",
    resolverPolicy: "honor-ttl",
    oldVipRetirementSeconds: 160,
    membershipPolicy: "all-registered",
    algorithm: "round-robin",
    affinityFailurePolicy: "keep-ineligible",
  },
  "affinity-working": {
    ...commonDraft,
    mode: "health-affinity",
    resolverPolicy: "honor-ttl",
    oldVipRetirementSeconds: 160,
    membershipPolicy: "healthy-only",
    algorithm: "source-affinity",
    affinityFailurePolicy: "remap-ineligible",
  },
} as const satisfies Record<string, ServicePathDraft>;

export function cloneServicePathDraft(draft: ServicePathDraft): ServicePathDraft {
  return { ...draft, backends: cloneBackends(draft.backends) };
}

export function resolveServiceName(
  draft: ServicePathDraft,
  atSeconds: number,
): DnsResolutionObservation {
  const cacheExpiresAtSeconds = draft.cacheStoredAtSeconds + draft.ttlSeconds;
  const cacheFresh = atSeconds < cacheExpiresAtSeconds;
  const source = draft.resolverPolicy === "refresh-early"
    ? "authority"
    : draft.resolverPolicy === "cache-forever"
      ? "cache"
      : cacheFresh ? "cache" : "authority";
  const address = source === "cache" ? draft.cachedAddress : draft.authorityAddress;
  const vipAvailable = address === draft.cachedAddress
    ? atSeconds < draft.oldVipRetirementSeconds
    : address === draft.authorityAddress && draft.vipListenerUp;
  return { atSeconds, cacheExpiresAtSeconds, cacheFresh, source, address, vipAvailable };
}

export function stableAffinityHash(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

function membershipBackends(
  draft: ServicePathDraft,
  backends: readonly ServiceBackend[],
): ServiceBackend[] {
  return backends
    .filter((backend) => backend.registered)
    .filter((backend) => draft.membershipPolicy === "all-registered" || backend.health === "healthy")
    .sort((left, right) => left.id.localeCompare(right.id));
}

export function selectServiceBackend(values: {
  draft: ServicePathDraft;
  backends?: readonly ServiceBackend[];
  clientKey: string;
  ordinal: number;
  retainedBackendId?: ServiceBackendId | null;
}): ServiceConnectionSelection {
  const backends = values.backends ?? values.draft.backends;
  const eligible = membershipBackends(values.draft, backends);
  let selected: ServiceBackend | undefined;
  if (
    values.retainedBackendId
    && values.draft.algorithm === "source-affinity"
    && values.draft.affinityFailurePolicy === "keep-ineligible"
  ) {
    selected = backends.find(({ id }) => id === values.retainedBackendId);
  } else if (eligible.length > 0) {
    const index = values.draft.algorithm === "source-affinity"
      ? stableAffinityHash(values.clientKey) % eligible.length
      : values.ordinal % eligible.length;
    selected = eligible[index];
  }
  return {
    clientKey: values.clientKey,
    ordinal: values.ordinal,
    backendId: selected?.id ?? null,
    eligibleBackendIds: eligible.map(({ id }) => id),
  };
}

function emptyChecks(): Record<ServicePathCheckId, boolean> {
  return {
    "cache-used-before-expiry": true,
    "authority-used-at-expiry": true,
    "old-vip-retained-through-ttl": true,
    "resolved-vip-listening": true,
    "healthy-membership-only": true,
    "affinity-stable": true,
    "failed-target-removed": true,
    "affinity-remapped": true,
    "backend-listener": true,
  };
}

export function evaluateServicePath(draft: ServicePathDraft): ServicePathEvaluation {
  const backends = cloneBackends(draft.backends);
  const beforeExpiry = resolveServiceName(draft, draft.beforeExpirySeconds);
  const atExpiry = resolveServiceName(draft, draft.atExpirySeconds);
  const first = selectServiceBackend({ draft, backends, clientKey: "client-a", ordinal: 0 });
  const repeated = selectServiceBackend({
    draft,
    backends,
    clientKey: "client-a",
    ordinal: 1,
    retainedBackendId: first.backendId,
  });
  const afterFailureBackends = backends.map((backend) => backend.id === first.backendId
    ? { ...backend, health: "unhealthy" as const }
    : { ...backend });
  const afterFailure = selectServiceBackend({
    draft,
    backends: afterFailureBackends,
    clientKey: "client-a",
    ordinal: 2,
    retainedBackendId: first.backendId,
  });
  const initialEligibleBackendIds = membershipBackends(draft, backends).map(({ id }) => id);
  const checks = emptyChecks();

  if (draft.mode === "dns-lifecycle") {
    checks["cache-used-before-expiry"] = beforeExpiry.source === "cache"
      && beforeExpiry.address === draft.cachedAddress;
    checks["authority-used-at-expiry"] = atExpiry.source === "authority"
      && atExpiry.address === draft.authorityAddress;
    checks["old-vip-retained-through-ttl"] = beforeExpiry.vipAvailable
      && draft.oldVipRetirementSeconds >= beforeExpiry.cacheExpiresAtSeconds;
    checks["resolved-vip-listening"] = atExpiry.vipAvailable;
  } else {
    checks["resolved-vip-listening"] = draft.vipListenerUp;
    const expectedHealthy = backends
      .filter((backend) => backend.registered && backend.health === "healthy")
      .map(({ id }) => id)
      .sort();
    checks["healthy-membership-only"] = initialEligibleBackendIds.length === expectedHealthy.length
      && initialEligibleBackendIds.every((id, index) => id === expectedHealthy[index]);
    checks["affinity-stable"] = first.backendId !== null && first.backendId === repeated.backendId;
    checks["failed-target-removed"] = first.backendId !== null
      && !afterFailure.eligibleBackendIds.includes(first.backendId);
    checks["affinity-remapped"] = first.backendId !== null
      && afterFailure.backendId !== null
      && afterFailure.backendId !== first.backendId;
    const selectedBackends = [first.backendId, repeated.backendId, afterFailure.backendId]
      .filter((id): id is ServiceBackendId => id !== null);
    checks["backend-listener"] = selectedBackends.length === 3
      && selectedBackends.every((id) => backends.find((backend) => backend.id === id)?.listenerUp);
  }

  const relevantChecks = draft.mode === "dns-lifecycle"
    ? [
        checks["cache-used-before-expiry"],
        checks["authority-used-at-expiry"],
        checks["old-vip-retained-through-ttl"],
        checks["resolved-vip-listening"],
      ]
    : [
        checks["resolved-vip-listening"],
        checks["healthy-membership-only"],
        checks["affinity-stable"],
        checks["failed-target-removed"],
        checks["affinity-remapped"],
        checks["backend-listener"],
      ];
  const passed = relevantChecks.every(Boolean);
  let reason: ServicePathFailureReason = "connected";
  if (draft.mode === "dns-lifecycle") {
    if (!checks["cache-used-before-expiry"]) reason = "refreshed-before-expiry";
    else if (!checks["authority-used-at-expiry"]) reason = "expired-cache-reused";
    else if (!checks["old-vip-retained-through-ttl"]) reason = "old-vip-retired-before-ttl";
    else if (!checks["resolved-vip-listening"]) reason = "vip-unavailable";
  } else if (!checks["resolved-vip-listening"]) reason = "vip-unavailable";
  else if (initialEligibleBackendIds.length === 0) reason = "no-healthy-backend";
  else if (!checks["healthy-membership-only"]) reason = "unhealthy-backend-selected";
  else if (!checks["affinity-stable"]) reason = "affinity-broken";
  else if (!checks["failed-target-removed"] || !checks["affinity-remapped"]) reason = "ineligible-affinity-retained";
  else if (!checks["backend-listener"]) reason = "listener-missing";

  const path: ServicePathStage[] = draft.mode === "dns-lifecycle"
    ? [
        { id: "client-query", label: "client query api.internal", status: "passed", reason: null },
        { id: "resolver-cache", label: atExpiry.source === "authority" ? "TTL expiry → authority" : "resolver cache", status: checks["authority-used-at-expiry"] ? "passed" : "blocked", reason: checks["authority-used-at-expiry"] ? null : reason },
        { id: "vip-listener", label: `${atExpiry.address}:8080`, status: checks["resolved-vip-listening"] ? "passed" : "blocked", reason: checks["resolved-vip-listening"] ? null : reason },
      ]
    : [
        { id: "client-flow", label: "client-a connection", status: "passed", reason: null },
        { id: "l4-vip", label: "10.40.0.20:8080", status: draft.vipListenerUp ? "passed" : "blocked", reason: draft.vipListenerUp ? null : "vip-unavailable" },
        { id: "healthy-set", label: `healthy set: ${initialEligibleBackendIds.join(", ") || "none"}`, status: checks["healthy-membership-only"] ? "passed" : "blocked", reason: checks["healthy-membership-only"] ? null : reason },
        { id: "selected-backend", label: afterFailure.backendId ?? "no backend", status: checks["affinity-remapped"] && checks["backend-listener"] ? "passed" : "blocked", reason: checks["affinity-remapped"] && checks["backend-listener"] ? null : reason },
      ];

  return {
    mode: draft.mode,
    passed,
    reason,
    checks,
    dns: { beforeExpiry, atExpiry },
    balancing: {
      initialEligibleBackendIds,
      first,
      repeated,
      afterFailure,
      failedBackendId: first.backendId,
      afterFailureBackends: cloneBackends(afterFailureBackends),
    },
    backends,
    path,
  };
}

export type ServiceDiscoveryIncidentId =
  | "expired-dns-cache"
  | "health-check-wrong-scope"
  | "unhealthy-backend-still-eligible"
  | "affinity-to-retired-backend";

export type ServiceDiscoveryIncidentRepair =
  | "refresh-after-ttl"
  | "increase-ttl"
  | "restart-app"
  | "probe-backend-service-port"
  | "probe-host-localhost"
  | "treat-dns-as-health"
  | "exclude-from-new-connections"
  | "keep-with-affinity"
  | "add-retries"
  | "remap-against-healthy-set"
  | "extend-affinity"
  | "keep-retired-target";

export const serviceDiscoveryIncidentFixtures: Readonly<Record<ServiceDiscoveryIncidentId, {
  id: ServiceDiscoveryIncidentId;
  repairs: readonly ServiceDiscoveryIncidentRepair[];
  correctRepair: ServiceDiscoveryIncidentRepair;
}>> = {
  "expired-dns-cache": {
    id: "expired-dns-cache",
    repairs: ["refresh-after-ttl", "increase-ttl", "restart-app"],
    correctRepair: "refresh-after-ttl",
  },
  "health-check-wrong-scope": {
    id: "health-check-wrong-scope",
    repairs: ["probe-backend-service-port", "probe-host-localhost", "treat-dns-as-health"],
    correctRepair: "probe-backend-service-port",
  },
  "unhealthy-backend-still-eligible": {
    id: "unhealthy-backend-still-eligible",
    repairs: ["exclude-from-new-connections", "keep-with-affinity", "add-retries"],
    correctRepair: "exclude-from-new-connections",
  },
  "affinity-to-retired-backend": {
    id: "affinity-to-retired-backend",
    repairs: ["remap-against-healthy-set", "extend-affinity", "keep-retired-target"],
    correctRepair: "remap-against-healthy-set",
  },
};

export function evaluateServiceDiscoveryIncident(
  incidentId: ServiceDiscoveryIncidentId,
  repair: ServiceDiscoveryIncidentRepair,
): { passed: boolean; incidentId: ServiceDiscoveryIncidentId; repair: ServiceDiscoveryIncidentRepair } {
  return {
    passed: serviceDiscoveryIncidentFixtures[incidentId].correctRepair === repair,
    incidentId,
    repair,
  };
}

export function canCompleteServiceDiscoveryChapter(progress: {
  dnsLifecycleComplete: boolean;
  healthAffinityComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return progress.dnsLifecycleComplete
    && progress.healthAffinityComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

export type AvailabilityMode = "domain-placement" | "dependency-recovery";
export type DomainPlacement = "split-zones" | "same-zone-a";
export type DatabasePlacement = "cross-zone-standby" | "same-zone-standby";
export type OptionalDependencyPolicy = "degraded-mode" | "required";
export type RecoveryTime = 20 | 90;

export type AvailabilityDraft = {
  mode: AvailabilityMode;
  gatewayPlacement: DomainPlacement;
  replicaPlacement: DomainPlacement;
  databasePlacement: DatabasePlacement;
  optionalDependencyPolicy: OptionalDependencyPolicy;
  recoverySeconds: RecoveryTime;
};

export type AvailabilityFailureReason =
  | "ready"
  | "gateway-correlated"
  | "replica-correlated"
  | "standby-correlated"
  | "optional-dependency-cascade"
  | "recovery-budget-exceeded";

export type AvailabilityCheckId =
  | "gateway-diversity"
  | "replica-diversity"
  | "database-failover"
  | "optional-degraded-mode"
  | "recovery-budget";

export type AvailabilityCheck = {
  id: AvailabilityCheckId;
  status: "passed" | "blocked" | "not-run";
};

export type AvailabilityEvaluation = {
  passed: boolean;
  reason: AvailabilityFailureReason;
  checks: AvailabilityCheck[];
  totalRequests: 10_000;
  servedRequests: number;
  lostRequests: number;
  availabilityPercent: number;
  targetPercent: 99.5;
  zoneFailure: "zone-a";
};

const checkOrder: AvailabilityCheckId[] = [
  "gateway-diversity",
  "replica-diversity",
  "database-failover",
  "optional-degraded-mode",
  "recovery-budget",
];

const blockedCheck: Record<Exclude<AvailabilityFailureReason, "ready">, AvailabilityCheckId> = {
  "gateway-correlated": "gateway-diversity",
  "replica-correlated": "replica-diversity",
  "standby-correlated": "database-failover",
  "optional-dependency-cascade": "optional-degraded-mode",
  "recovery-budget-exceeded": "recovery-budget",
};

function firstFailure(draft: AvailabilityDraft): AvailabilityFailureReason {
  if (draft.gatewayPlacement !== "split-zones") return "gateway-correlated";
  if (draft.replicaPlacement !== "split-zones") return "replica-correlated";
  if (draft.databasePlacement !== "cross-zone-standby") return "standby-correlated";
  if (draft.optionalDependencyPolicy !== "degraded-mode") return "optional-dependency-cascade";
  if (draft.recoverySeconds > 20) return "recovery-budget-exceeded";
  return "ready";
}

function checksFor(reason: AvailabilityFailureReason): AvailabilityCheck[] {
  if (reason === "ready") return checkOrder.map((id) => ({ id, status: "passed" }));
  const index = checkOrder.indexOf(blockedCheck[reason]);
  return checkOrder.map((id, checkIndex) => ({
    id,
    status: checkIndex < index ? "passed" : checkIndex === index ? "blocked" : "not-run",
  }));
}

export function evaluateAvailability(draft: AvailabilityDraft): AvailabilityEvaluation {
  const reason = firstFailure(draft);
  const lostRequests = reason === "ready" ? 40
    : reason === "recovery-budget-exceeded" ? 180
      : reason === "optional-dependency-cascade" ? 750
        : 5_000;
  const servedRequests = 10_000 - lostRequests;
  return {
    passed: reason === "ready",
    reason,
    checks: checksFor(reason),
    totalRequests: 10_000,
    servedRequests,
    lostRequests,
    availabilityPercent: servedRequests / 100,
    targetPercent: 99.5,
    zoneFailure: "zone-a",
  };
}

export const availabilityPresets = {
  "domain-placement-scaffold": {
    mode: "domain-placement",
    gatewayPlacement: "same-zone-a",
    replicaPlacement: "same-zone-a",
    databasePlacement: "same-zone-standby",
    optionalDependencyPolicy: "degraded-mode",
    recoverySeconds: 20,
  },
  "domain-placement-working": {
    mode: "domain-placement",
    gatewayPlacement: "split-zones",
    replicaPlacement: "split-zones",
    databasePlacement: "cross-zone-standby",
    optionalDependencyPolicy: "degraded-mode",
    recoverySeconds: 20,
  },
  "dependency-recovery-scaffold": {
    mode: "dependency-recovery",
    gatewayPlacement: "split-zones",
    replicaPlacement: "split-zones",
    databasePlacement: "same-zone-standby",
    optionalDependencyPolicy: "required",
    recoverySeconds: 90,
  },
  "dependency-recovery-working": {
    mode: "dependency-recovery",
    gatewayPlacement: "split-zones",
    replicaPlacement: "split-zones",
    databasePlacement: "cross-zone-standby",
    optionalDependencyPolicy: "degraded-mode",
    recoverySeconds: 20,
  },
} as const satisfies Record<string, AvailabilityDraft>;

export type AvailabilityIncidentId =
  | "replicas-share-zone"
  | "gateways-share-domain"
  | "standby-shares-zone"
  | "optional-dependency-cascade";

export type AvailabilityRepair =
  | "spread-replicas-across-zones"
  | "add-replica-same-zone"
  | "split-gateways-across-zones"
  | "increase-gateway-size"
  | "move-standby-to-zone-b"
  | "add-backup-same-rack"
  | "degrade-optional-dependency"
  | "increase-retry-count";

export const availabilityIncidentFixtures: Record<AvailabilityIncidentId, { draft: AvailabilityDraft; repairs: AvailabilityRepair[] }> = {
  "replicas-share-zone": {
    draft: { ...availabilityPresets["domain-placement-working"], replicaPlacement: "same-zone-a" },
    repairs: ["add-replica-same-zone", "spread-replicas-across-zones"],
  },
  "gateways-share-domain": {
    draft: { ...availabilityPresets["domain-placement-working"], gatewayPlacement: "same-zone-a" },
    repairs: ["split-gateways-across-zones", "increase-gateway-size"],
  },
  "standby-shares-zone": {
    draft: { ...availabilityPresets["dependency-recovery-working"], databasePlacement: "same-zone-standby" },
    repairs: ["add-backup-same-rack", "move-standby-to-zone-b"],
  },
  "optional-dependency-cascade": {
    draft: { ...availabilityPresets["dependency-recovery-working"], optionalDependencyPolicy: "required" },
    repairs: ["increase-retry-count", "degrade-optional-dependency"],
  },
};

export function evaluateAvailabilityIncident(incidentId: AvailabilityIncidentId, repair: AvailabilityRepair) {
  const fixture = availabilityIncidentFixtures[incidentId];
  if (!fixture.repairs.includes(repair)) throw new Error(`Repair ${repair} is not valid for ${incidentId}`);
  let draft = { ...fixture.draft };
  if (repair === "spread-replicas-across-zones") draft = { ...draft, replicaPlacement: "split-zones" };
  if (repair === "split-gateways-across-zones") draft = { ...draft, gatewayPlacement: "split-zones" };
  if (repair === "move-standby-to-zone-b") draft = { ...draft, databasePlacement: "cross-zone-standby" };
  if (repair === "degrade-optional-dependency") draft = { ...draft, optionalDependencyPolicy: "degraded-mode" };
  const evaluation = evaluateAvailability(draft);
  return { incidentId, repair, passed: evaluation.passed, reason: evaluation.reason };
}

export function canCompleteAvailabilityChapter(progress: {
  placementComplete: boolean;
  recoveryComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return progress.placementComplete && progress.recoveryComplete && progress.incidentsComplete && progress.conceptsMastered;
}

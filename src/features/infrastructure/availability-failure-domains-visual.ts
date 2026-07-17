import type { AvailabilityDraft, AvailabilityEvaluation } from "./availability-failure-domains.ts";

export function buildAvailabilityVisualState(draft: AvailabilityDraft, evaluation: AvailabilityEvaluation | null) {
  return {
    mode: draft.mode,
    gradeState: evaluation ? evaluation.passed ? "passed" as const : "failed" as const : "not-run" as const,
    platformState: draft.gatewayPlacement === "split-zones" && draft.replicaPlacement === "split-zones" && draft.databasePlacement === "cross-zone-standby" ? "diverse" as const : "correlated" as const,
    failureDomain: evaluation ? "zone-a" as const : "not-run" as const,
    availability: evaluation ? evaluation.availabilityPercent : null,
    servedRequests: evaluation ? evaluation.servedRequests : null,
    lostRequests: evaluation ? evaluation.lostRequests : null,
    checks: evaluation ? evaluation.checks : evaluation === null ? [
      "gateway-diversity", "replica-diversity", "database-failover", "optional-degraded-mode", "recovery-budget",
    ].map((id) => ({ id, status: "not-run" as const })) : [],
    nodes: [
      { id: "gateway-a", role: "gateway", zone: "a", active: evaluation === null },
      { id: "gateway-b", role: "gateway", zone: draft.gatewayPlacement === "split-zones" ? "b" : "a", active: true },
      { id: "app-a", role: "app", zone: "a", active: evaluation === null },
      { id: "app-b", role: "app", zone: draft.replicaPlacement === "split-zones" ? "b" : "a", active: true },
      { id: "app-c", role: "app", zone: draft.replicaPlacement === "split-zones" ? "c" : "a", active: true },
      { id: "db-primary", role: "database", zone: "a", active: evaluation === null },
      { id: "db-standby", role: "database", zone: draft.databasePlacement === "cross-zone-standby" ? "b" : "a", active: true },
      { id: "recommendations", role: "optional", zone: "c", active: draft.optionalDependencyPolicy !== "required" },
    ],
  };
}

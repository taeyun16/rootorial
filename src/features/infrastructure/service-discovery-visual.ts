import type {
  ServiceBackend,
  ServicePathEvaluation,
  ServicePathFailureReason,
  ServicePathStage,
} from "./service-discovery";

export type ServicePathGradeState = "not-run" | "passed" | "failed";
export type ServicePathTopologyState =
  | "reachable"
  | "stale-cache"
  | "early-vip-retirement"
  | "unhealthy-member"
  | "affinity-stuck"
  | "incomplete";

export type ServicePathVisualStage = Omit<ServicePathStage, "status"> & {
  status: "not-run" | "passed" | "blocked";
};

export type ServicePathVisualState = {
  mode: ServicePathEvaluation["mode"];
  gradeState: ServicePathGradeState;
  topologyState: ServicePathTopologyState;
  pathState: "not-run" | "reachable" | "blocked";
  computedReason: ServicePathFailureReason;
  displayedReason: ServicePathFailureReason | "not-run";
  cacheState: "fresh-then-expired" | "refreshed-early" | "stale-after-expiry";
  resolutionState: "cache-to-authority" | "cache-only" | "authority-only";
  selectionState: "healthy-remap" | "unhealthy-member" | "affinity-stuck" | "none";
  backends: readonly ServiceBackend[];
  path: readonly ServicePathVisualStage[];
};

function topologyState(evaluation: ServicePathEvaluation): ServicePathTopologyState {
  if (evaluation.passed) return "reachable";
  if (evaluation.reason === "expired-cache-reused") return "stale-cache";
  if (evaluation.reason === "old-vip-retired-before-ttl") return "early-vip-retirement";
  if (evaluation.reason === "unhealthy-backend-selected") return "unhealthy-member";
  if (evaluation.reason === "ineligible-affinity-retained") return "affinity-stuck";
  return "incomplete";
}

export function buildServicePathVisualState(
  evaluation: ServicePathEvaluation,
  gradeState: ServicePathGradeState = "not-run",
): ServicePathVisualState {
  const before = evaluation.dns.beforeExpiry;
  const after = evaluation.dns.atExpiry;
  const cacheState = before.source === "authority"
    ? "refreshed-early"
    : after.source === "cache" ? "stale-after-expiry" : "fresh-then-expired";
  const resolutionState = before.source === "cache" && after.source === "authority"
    ? "cache-to-authority"
    : before.source === "cache" ? "cache-only" : "authority-only";
  const selectionState = evaluation.mode === "dns-lifecycle"
    ? "none"
    : !evaluation.checks["healthy-membership-only"]
      ? "unhealthy-member"
      : !evaluation.checks["affinity-remapped"]
        ? "affinity-stuck"
        : "healthy-remap";
  return {
    mode: evaluation.mode,
    gradeState,
    topologyState: topologyState(evaluation),
    pathState: gradeState === "not-run" ? "not-run" : evaluation.passed ? "reachable" : "blocked",
    computedReason: evaluation.reason,
    displayedReason: gradeState === "not-run" ? "not-run" : evaluation.reason,
    cacheState,
    resolutionState,
    selectionState,
    backends: (evaluation.mode === "health-affinity"
      ? evaluation.balancing.afterFailureBackends
      : evaluation.backends).map((backend) => ({ ...backend })),
    path: evaluation.path.map((stage) => ({
      ...stage,
      status: gradeState === "not-run" ? "not-run" : stage.status,
      reason: gradeState === "not-run" ? null : stage.reason,
    })),
  };
}

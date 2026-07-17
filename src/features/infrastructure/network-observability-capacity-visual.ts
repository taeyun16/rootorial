import type {
  CapacityEvaluation,
  CapacityMetric,
  CapacityResource,
  CapacityScenarioId,
  ObservationEvidenceEvaluation,
  ObservationNamespace,
  ObservationProbeId,
  ObservationReceipt,
} from "./network-observability-capacity.ts";

export type ObservabilityGradeState = "not-run" | "passed" | "failed";

export type ObservabilityVisualBoundary = {
  id: "client" | "edge" | "app" | "data";
  namespaceId: Exclude<ObservationNamespace, "host">;
  label: string;
  probeIds: readonly ObservationProbeId[];
};

export type ObservabilityVisualProbe = Pick<
  ObservationReceipt,
  "probeId" | "namespaceId" | "pathStage" | "command"
> & {
  placement: "scoped" | "mis-scoped";
};

export type ObservabilityVisualMetric = CapacityMetric & {
  displayedUtilization: number | null;
  state: "not-run" | "headroom" | "warning" | "saturated";
};

export type NetworkObservabilityVisualState = {
  evidenceState: "aligned" | "unaligned";
  evidenceGradeState: ObservabilityGradeState;
  capacityGradeState: ObservabilityGradeState;
  scenarioId: CapacityScenarioId;
  displayedBottleneck: CapacityResource | "not-run";
  boundaries: readonly ObservabilityVisualBoundary[];
  probes: readonly ObservabilityVisualProbe[];
  metrics: readonly ObservabilityVisualMetric[];
};

const expectedScope: Readonly<Record<ObservationProbeId, ObservationNamespace>> = {
  "client-route": "client",
  "edge-counter": "edge",
  "edge-capture": "edge",
  "app-sockets": "app",
};

function metricState(
  metric: CapacityMetric,
  gradeState: ObservabilityGradeState,
): ObservabilityVisualMetric["state"] {
  if (gradeState === "not-run") return "not-run";
  if (metric.saturated) return "saturated";
  if (metric.utilization > 0.7) return "warning";
  return "headroom";
}

export function buildNetworkObservabilityVisualState(values: {
  evidence: ObservationEvidenceEvaluation;
  capacity: CapacityEvaluation;
  scenarioId: CapacityScenarioId;
  baselineLimitingResource?: CapacityResource;
  evidenceGradeState?: ObservabilityGradeState;
  capacityGradeState?: ObservabilityGradeState;
}): NetworkObservabilityVisualState {
  const evidenceGradeState = values.evidenceGradeState ?? "not-run";
  const capacityGradeState = values.capacityGradeState ?? "not-run";
  const probes = values.evidence.receipts.map((receipt) => ({
    probeId: receipt.probeId,
    namespaceId: receipt.namespaceId,
    pathStage: receipt.pathStage,
    command: receipt.command,
    placement: receipt.namespaceId === expectedScope[receipt.probeId]
      ? "scoped" as const
      : "mis-scoped" as const,
  }));
  const boundaries: ObservabilityVisualBoundary[] = [
    {
      id: "client",
      namespaceId: "client",
      label: "client netns",
      probeIds: probes.filter(({ namespaceId }) => namespaceId === "client").map(({ probeId }) => probeId),
    },
    {
      id: "edge",
      namespaceId: "edge",
      label: "edge netns",
      probeIds: probes.filter(({ namespaceId }) => namespaceId === "edge").map(({ probeId }) => probeId),
    },
    {
      id: "app",
      namespaceId: "app",
      label: "app netns",
      probeIds: probes.filter(({ namespaceId }) => namespaceId === "app").map(({ probeId }) => probeId),
    },
    {
      id: "data",
      namespaceId: "data",
      label: "data netns",
      probeIds: probes.filter(({ namespaceId }) => namespaceId === "data").map(({ probeId }) => probeId),
    },
  ];
  return {
    evidenceState: values.evidence.passed ? "aligned" : "unaligned",
    evidenceGradeState,
    capacityGradeState,
    scenarioId: values.scenarioId,
    displayedBottleneck: capacityGradeState === "not-run"
      ? "not-run"
      : values.baselineLimitingResource ?? values.capacity.limitingResource,
    boundaries,
    probes,
    metrics: values.capacity.metrics.map((metric) => ({
      ...metric,
      displayedUtilization: capacityGradeState === "not-run" ? null : metric.utilization,
      state: metricState(metric, capacityGradeState),
    })),
  };
}

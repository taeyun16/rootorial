import {
  evaluateNamespacePlatformDraftChecks,
  type NamespacePlatformDraft,
  type NamespacePlatformPathStage,
  type NamespacePlatformScenarioEvaluation,
  type NamespacePlatformScenarioId,
} from "./namespace-platform.ts";
import type {
  NamespacePlatformEvidenceBundleEvaluation,
  NamespacePlatformEvidenceChapterId,
} from "./namespace-platform-evidence.ts";

export type NamespacePlatformVisualGradeState = "not-run" | "passed" | "failed";

export type NamespacePlatformVisualState = {
  gradeState: NamespacePlatformVisualGradeState;
  scenarioId: NamespacePlatformScenarioId;
  evidenceState: "not-run" | "verified" | "invalid";
  receipts: readonly {
    chapterId: NamespacePlatformEvidenceChapterId;
    status: "not-run" | "verified" | "invalid";
  }[];
  nodes: readonly {
    id: "client" | "edge" | "app" | "data";
    exposure: "external" | "public" | "private";
    placement: string;
  }[];
  edges: readonly {
    id: "client-edge" | "edge-app" | "app-data" | "app-egress";
    label: string;
    configured: boolean | null;
    state: "not-run" | "configured" | "broken";
  }[];
  path: readonly NamespacePlatformPathStage[];
  capacity: readonly {
    resource: "edge-bandwidth" | "edge-queue" | "app-connections";
    displayedUtilization: number | null;
    state: "not-run" | "headroom" | "over-budget";
  }[];
};

export function buildNamespacePlatformVisualState(values: {
  draft: NamespacePlatformDraft;
  scenarioId: NamespacePlatformScenarioId;
  scenario: NamespacePlatformScenarioEvaluation | null;
  evidence: NamespacePlatformEvidenceBundleEvaluation | null;
}): NamespacePlatformVisualState {
  const gradeState: NamespacePlatformVisualGradeState = values.scenario === null
    ? "not-run"
    : values.scenario.passed ? "passed" : "failed";
  const evidenceState = values.evidence === null
    ? "not-run"
    : values.evidence.passed ? "verified" : "invalid";
  const receiptStatusByChapter = new Map(
    values.evidence?.receiptStatuses.map(({ chapterId, status }) => [chapterId, status]) ?? [],
  );
  const receipts = [
    "network-namespaces-and-boundaries",
    "veth-bridges-and-routing",
    "egress-nat-and-conntrack",
    "network-policy-and-firewalls",
    "service-discovery-and-load-balancing",
    "availability-and-failure-domains",
    "network-observability-and-capacity",
  ].map((chapterId) => ({
    chapterId: chapterId as NamespacePlatformEvidenceChapterId,
    status: values.evidence === null
      ? "not-run" as const
      : receiptStatusByChapter.get(chapterId as NamespacePlatformEvidenceChapterId) === "verified"
        ? "verified" as const
        : "invalid" as const,
  }));
  const hiddenPath: NamespacePlatformPathStage[] = values.scenario?.path.map((stage) => ({ ...stage })) ?? [];
  const findNamespace = (id: "edge" | "app" | "data") => values.draft.namespaces.find((item) => item.id === id);
  const placement = (id: "edge" | "app" | "data") => {
    const zones = [...new Set(values.draft.placements
      .filter((item) => item.namespaceId === id && item.healthy)
      .map(({ zone }) => zone))];
    return zones.join(" + ") || "unplaced";
  };
  const readiness = evaluateNamespacePlatformDraftChecks(values.draft);
  const edge = (id: "client-edge" | "edge-app" | "app-data" | "app-egress", label: string, configured: boolean) => ({
    id,
    label,
    configured: values.scenario === null ? null : configured,
    state: values.scenario === null ? "not-run" as const : configured ? "configured" as const : "broken" as const,
  });
  const revealCapacity = values.scenarioId === "peak-load"
    ? values.scenario?.capacity ?? null
    : null;
  const capacity = (revealCapacity?.metrics ?? [
    { resource: "edge-bandwidth" as const },
    { resource: "edge-queue" as const },
    { resource: "app-connections" as const },
  ]).map((metric) => {
    const displayedUtilization = "utilization" in metric ? metric.utilization : null;
    return {
      resource: metric.resource,
      displayedUtilization,
      state: displayedUtilization === null
        ? "not-run" as const
        : displayedUtilization <= 0.7 ? "headroom" as const : "over-budget" as const,
    };
  });
  return {
    gradeState,
    scenarioId: values.scenarioId,
    evidenceState,
    receipts,
    nodes: [
      { id: "client", exposure: "external", placement: "public network" },
      { id: "edge", exposure: findNamespace("edge")?.addressScope ?? "public", placement: placement("edge") },
      { id: "app", exposure: findNamespace("app")?.addressScope ?? "private", placement: placement("app") },
      { id: "data", exposure: findNamespace("data")?.addressScope ?? "private", placement: placement("data") },
    ],
    edges: [
      edge("client-edge", "tcp/443", readiness["edge-only-public-443"] && readiness["ingress-policy"]),
      edge("edge-app", "tcp/8080", readiness["edge-to-app-8080"]),
      edge("app-data", "tcp/5432", readiness["app-to-data-5432"]),
      edge("app-egress", "NAT + conntrack", readiness["egress-through-edge-nat-conntrack"]),
    ],
    path: hiddenPath,
    capacity,
  };
}

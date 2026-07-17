import type {
  VethTopologyEvaluation,
  VethTopologyFailureReason,
  VethTopologyInterface,
  VethTopologyMode,
  VethTopologyNamespaceId,
  VethTopologyPathStage,
  VethTopologyRoute,
} from "./veth-routing.ts";

export type VethRoutingGradeState = "not-run" | "passed" | "failed";
export type VethRoutingTopologyState =
  | "incomplete"
  | "address-conflict"
  | "missing-forward-route"
  | "missing-return-route"
  | "forwarding-off"
  | "reachable";
export type VethRoutingPathState = "not-run" | "blocked" | "reachable";

export type VethRoutingVisualBoundary = {
  id: "client" | "transit" | "app";
  namespaceId: VethTopologyNamespaceId;
  label: string;
  interfaces: readonly VethTopologyInterface[];
  routes: readonly VethTopologyRoute[];
  bridgeId: "br0" | null;
  forwarding: boolean | null;
};

export type VethRoutingVisualLink = {
  id: "client-veth" | "app-veth";
  endpointA: VethTopologyInterface;
  endpointB: VethTopologyInterface;
  state: "up" | "down";
  placement: "attached" | "dangling";
};

export type VethRoutingVisualPathStage = Omit<VethTopologyPathStage, "status"> & {
  status: VethTopologyPathStage["status"] | "not-run";
};

export type VethRoutingVisualState = {
  mode: VethTopologyMode;
  topologyState: VethRoutingTopologyState;
  gradeState: VethRoutingGradeState;
  pathState: VethRoutingPathState;
  computedReason: VethTopologyFailureReason;
  displayedReason: VethTopologyFailureReason | "not-run";
  boundaries: readonly VethRoutingVisualBoundary[];
  links: readonly VethRoutingVisualLink[];
  forwardPath: readonly VethRoutingVisualPathStage[];
  returnPath: readonly VethRoutingVisualPathStage[];
};

function topologyState(evaluation: VethTopologyEvaluation): VethRoutingTopologyState {
  if (evaluation.passed) return "reachable";
  if (
    evaluation.reason === "duplicate-address"
    || evaluation.reason === "overlapping-router-subnets"
  ) return "address-conflict";
  if (
    evaluation.reason === "no-forward-route"
    || evaluation.reason === "gateway-off-link"
  ) return "missing-forward-route";
  if (evaluation.reason === "no-return-route") return "missing-return-route";
  if (evaluation.reason === "forwarding-disabled") return "forwarding-off";
  return "incomplete";
}

function maskedPath(
  stages: readonly VethTopologyPathStage[],
  gradeState: VethRoutingGradeState,
): VethRoutingVisualPathStage[] {
  return stages.map((stage) => ({
    ...stage,
    status: gradeState === "not-run" ? "not-run" : stage.status,
    reason: gradeState === "not-run" ? null : stage.reason,
  }));
}

export function buildVethRoutingVisualState(
  evaluation: VethTopologyEvaluation,
  gradeState: VethRoutingGradeState = "not-run",
): VethRoutingVisualState {
  const { machine } = evaluation;
  const clientInterfaces = machine.interfaces.filter(({ ownerNamespace }) => ownerNamespace === "client");
  const appInterfaces = machine.interfaces.filter(({ ownerNamespace }) => ownerNamespace === "app");
  const transitNamespaceId = evaluation.mode === "bridge" ? "host" : "router";
  const transitInterfaces = machine.interfaces.filter(({ id }) => id === "client-peer" || id === "app-peer");
  const expectedTarget = evaluation.mode === "bridge" ? "br0" : "router";
  const link = (pairId: "client-veth" | "app-veth"): VethRoutingVisualLink => {
    const endpoints = machine.interfaces.filter((candidate) => candidate.pairId === pairId);
    const endpointA = endpoints.find(({ ownerNamespace }) => ownerNamespace === (pairId === "client-veth" ? "client" : "app")) ?? endpoints[0]!;
    const endpointB = endpoints.find(({ id }) => id !== endpointA.id) ?? endpoints[1]!;
    const attached = evaluation.mode === "bridge"
      ? endpointB.bridgeId === expectedTarget
      : endpointB.ownerNamespace === expectedTarget;
    return {
      id: pairId,
      endpointA,
      endpointB,
      state: endpointA.up && endpointB.up ? "up" : "down",
      placement: attached ? "attached" : "dangling",
    };
  };
  const boundaries: VethRoutingVisualBoundary[] = [
    {
      id: "client",
      namespaceId: "client",
      label: "client netns",
      interfaces: clientInterfaces,
      routes: machine.routes.filter(({ ownerNamespace }) => ownerNamespace === "client"),
      bridgeId: null,
      forwarding: null,
    },
    {
      id: "transit",
      namespaceId: transitNamespaceId,
      label: evaluation.mode === "bridge" ? "host netns · br0" : "router netns",
      interfaces: transitInterfaces,
      routes: [],
      bridgeId: machine.bridge?.id ?? null,
      forwarding: evaluation.mode === "router" ? machine.forwarding : null,
    },
    {
      id: "app",
      namespaceId: "app",
      label: "app netns",
      interfaces: appInterfaces,
      routes: machine.routes.filter(({ ownerNamespace }) => ownerNamespace === "app"),
      bridgeId: null,
      forwarding: null,
    },
  ];
  const pathState: VethRoutingPathState = gradeState === "not-run"
    ? "not-run"
    : evaluation.passed ? "reachable" : "blocked";
  return {
    mode: evaluation.mode,
    topologyState: topologyState(evaluation),
    gradeState,
    pathState,
    computedReason: evaluation.reason,
    displayedReason: gradeState === "not-run" ? "not-run" : evaluation.reason,
    boundaries,
    links: [link("client-veth"), link("app-veth")],
    forwardPath: maskedPath(evaluation.forwardPath, gradeState),
    returnPath: maskedPath(evaluation.returnPath, gradeState),
  };
}

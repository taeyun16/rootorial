import {
  evaluateNatFlow,
  type NatFlowDraft,
  type NatFlowEvaluation,
  type NatFlowStage,
} from "./egress-nat.ts";

export type NatVisualNode = {
  id: "private-client" | "nat-router" | "external-service";
  role: "endpoint" | "translator" | "service";
  address: string;
  state: "ready" | "attention";
};

export type NatVisualState = {
  mode: NatFlowDraft["mode"];
  gradeState: "not-run" | "passed" | "failed";
  topologyState: NatFlowEvaluation["topologyState"] | "not-run";
  nodes: NatVisualNode[];
  stages: NatFlowStage[];
  tupleLedger: NatFlowEvaluation["tuples"];
  conntrack: NatFlowEvaluation["conntrack"];
  translationState: "unconfigured" | "misplaced" | "configured";
  returnState: "unknown" | "same-router" | "asymmetric";
};

export function buildNatVisualState(
  draft: NatFlowDraft,
  evaluation: NatFlowEvaluation | null,
): NatVisualState {
  const preview = evaluateNatFlow(draft);
  const gradeState = evaluation ? (evaluation.passed ? "passed" : "failed") : "not-run";
  const stages = evaluation
    ? evaluation.stages
    : preview.stages.map((stage) => ({ ...stage, status: "not-run" as const }));
  const translationState = draft.natHook === "none"
    ? "unconfigured"
    : draft.natHook === "postrouting"
      ? "configured"
      : "misplaced";
  return {
    mode: draft.mode,
    gradeState,
    topologyState: evaluation?.topologyState ?? "not-run",
    nodes: [
      {
        id: "private-client",
        role: "endpoint",
        address: "10.20.0.2/24",
        state: draft.clientLinkUp && draft.privateRoute ? "ready" : "attention",
      },
      {
        id: "nat-router",
        role: "translator",
        address: draft.egressAddressMode === "dynamic" ? "203.0.113.77/24" : "203.0.113.10/24",
        state: draft.routerLinksUp && draft.forwarding && translationState === "configured"
          ? "ready"
          : "attention",
      },
      {
        id: "external-service",
        role: "service",
        address: "198.51.100.20:443",
        state: draft.externalListener ? "ready" : "attention",
      },
    ],
    stages,
    tupleLedger: preview.tuples,
    conntrack: evaluation?.conntrack ?? null,
    translationState,
    returnState: evaluation
      ? (draft.returnRouter === "same-router" ? "same-router" : "asymmetric")
      : "unknown",
  };
}

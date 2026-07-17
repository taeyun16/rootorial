import type {
  NetworkPolicyEvaluation,
  NetworkPolicyFailureReason,
  NetworkPolicyPacketResult,
  NetworkPolicyRule,
} from "./network-policy.ts";

export type NetworkPolicyGradeState = "not-run" | "passed" | "failed";
export type NetworkPolicyVisualStateName =
  | "incomplete"
  | "wrong-hook"
  | "overbroad"
  | "misordered"
  | "stateful-gap"
  | "least-allow";

export type NetworkPolicyVisualProbe = {
  id: NetworkPolicyPacketResult["packet"]["id"];
  source: string;
  destination: string;
  connectionState: NetworkPolicyPacketResult["packet"]["connectionState"];
  expectedVerdict: NetworkPolicyPacketResult["packet"]["expectedVerdict"];
  verdict: NetworkPolicyPacketResult["verdict"] | "not-run";
  matchedRuleId: NetworkPolicyPacketResult["matchedRuleId"] | "not-run";
};

export type NetworkPolicyVisualState = {
  mode: NetworkPolicyEvaluation["mode"];
  policyState: NetworkPolicyVisualStateName;
  gradeState: NetworkPolicyGradeState;
  computedReason: NetworkPolicyFailureReason;
  displayedReason: NetworkPolicyFailureReason | "not-run";
  hook: NetworkPolicyEvaluation["machine"]["chain"]["hook"];
  defaultPolicy: NetworkPolicyEvaluation["machine"]["chain"]["defaultPolicy"];
  rules: readonly NetworkPolicyRule[];
  probes: readonly NetworkPolicyVisualProbe[];
};

function policyState(evaluation: NetworkPolicyEvaluation): NetworkPolicyVisualStateName {
  if (evaluation.passed) return "least-allow";
  if (evaluation.reason === "wrong-hook") return "wrong-hook";
  if (evaluation.reason === "overbroad-allow" || evaluation.reason === "unexpected-flow-allowed") return "overbroad";
  if (evaluation.reason === "deny-before-allow") return "misordered";
  if (evaluation.reason === "missing-established-rule" || evaluation.reason === "established-reply-dropped") return "stateful-gap";
  return "incomplete";
}

export function buildNetworkPolicyVisualState(
  evaluation: NetworkPolicyEvaluation,
  gradeState: NetworkPolicyGradeState = "not-run",
): NetworkPolicyVisualState {
  return {
    mode: evaluation.mode,
    policyState: policyState(evaluation),
    gradeState,
    computedReason: evaluation.reason,
    displayedReason: gradeState === "not-run" ? "not-run" : evaluation.reason,
    hook: evaluation.machine.chain.hook,
    defaultPolicy: evaluation.machine.chain.defaultPolicy,
    rules: evaluation.machine.chain.rules.map((rule) => ({ ...rule })),
    probes: evaluation.packetResults.map((result) => ({
      id: result.packet.id,
      source: `${result.packet.sourceAddress}:${result.packet.sourcePort}`,
      destination: `${result.packet.destinationAddress}:${result.packet.destinationPort}`,
      connectionState: result.packet.connectionState,
      expectedVerdict: result.packet.expectedVerdict,
      verdict: gradeState === "not-run" ? "not-run" : result.verdict,
      matchedRuleId: gradeState === "not-run" ? "not-run" : result.matchedRuleId,
    })),
  };
}

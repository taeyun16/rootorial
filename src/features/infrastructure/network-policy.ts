export type NetworkPolicyMode = "forward" | "input";
export type NetworkPolicyHook = "forward" | "input";
export type NetworkPolicyDefault = "accept" | "drop";
export type NetworkPolicyRuleOrder = "stateful-specific-deny" | "deny-specific-stateful";
export type NetworkPolicyAllowScope = "exact" | "any-source" | "any-port";

export type NetworkPolicyDraft = {
  mode: NetworkPolicyMode;
  hook: NetworkPolicyHook;
  defaultPolicy: NetworkPolicyDefault;
  ruleOrder: NetworkPolicyRuleOrder;
  allowScope: NetworkPolicyAllowScope;
  statefulRule: boolean;
  terminalDeny: boolean;
};

export type NetworkPolicyPacketId =
  | "client-new-app-8080"
  | "app-established-reply"
  | "client-new-app-22"
  | "untrusted-new-app-8080"
  | "untracked-transit"
  | "admin-new-router-22"
  | "router-established-reply"
  | "client-new-router-22"
  | "admin-new-router-8080"
  | "untracked-router-input";

export type NetworkPolicyPacket = {
  id: NetworkPolicyPacketId;
  path: NetworkPolicyMode;
  sourceAddress: string;
  destinationAddress: string;
  protocol: "tcp" | "udp";
  sourcePort: number;
  destinationPort: number;
  connectionState: "new" | "established" | "untracked";
  expectedVerdict: "accept" | "drop";
};

export type NetworkPolicyRuleId =
  | "allow-established-related"
  | "allow-required-new"
  | "deny-unmatched";

export type NetworkPolicyRule = {
  id: NetworkPolicyRuleId;
  position: number;
  verdict: "accept" | "drop";
  description: string;
};

export type NetworkPolicyMachine = {
  mode: NetworkPolicyMode;
  chain: {
    family: "inet";
    table: "filter";
    name: "forward" | "input";
    hook: NetworkPolicyHook;
    defaultPolicy: NetworkPolicyDefault;
    rules: readonly NetworkPolicyRule[];
  };
  packets: readonly NetworkPolicyPacket[];
};

export type NetworkPolicyRuleTrace = {
  ruleId: NetworkPolicyRuleId;
  position: number;
  status: "matched" | "skipped" | "pending";
  verdict: "accept" | "drop" | null;
};

export type NetworkPolicyPacketResult = {
  packet: NetworkPolicyPacket;
  observedHook: NetworkPolicyHook | "unseen";
  verdict: "accept" | "drop" | "unseen";
  matchedRuleId: NetworkPolicyRuleId | "default-policy" | null;
  trace: readonly NetworkPolicyRuleTrace[];
  passed: boolean;
};

export type NetworkPolicyCheckId =
  | "correct-hook"
  | "default-deny"
  | "terminal-order"
  | "exact-allow"
  | "stateful-reply"
  | "required-new-flow"
  | "unexpected-flows-denied";

export type NetworkPolicyFailureReason =
  | "least-allow"
  | "wrong-hook"
  | "default-accept"
  | "deny-before-allow"
  | "missing-established-rule"
  | "overbroad-allow"
  | "required-flow-dropped"
  | "established-reply-dropped"
  | "unexpected-flow-allowed";

export type NetworkPolicyEvaluation = {
  passed: boolean;
  mode: NetworkPolicyMode;
  reason: NetworkPolicyFailureReason;
  checks: Readonly<Record<NetworkPolicyCheckId, boolean>>;
  machine: NetworkPolicyMachine;
  packetResults: readonly NetworkPolicyPacketResult[];
};

export const networkPolicyPresets = {
  "forward-scaffold": {
    mode: "forward",
    hook: "input",
    defaultPolicy: "accept",
    ruleOrder: "deny-specific-stateful",
    allowScope: "any-port",
    statefulRule: false,
    terminalDeny: true,
  },
  "forward-working": {
    mode: "forward",
    hook: "forward",
    defaultPolicy: "drop",
    ruleOrder: "stateful-specific-deny",
    allowScope: "exact",
    statefulRule: true,
    terminalDeny: true,
  },
  "input-scaffold": {
    mode: "input",
    hook: "forward",
    defaultPolicy: "accept",
    ruleOrder: "deny-specific-stateful",
    allowScope: "any-source",
    statefulRule: false,
    terminalDeny: true,
  },
  "input-working": {
    mode: "input",
    hook: "input",
    defaultPolicy: "drop",
    ruleOrder: "stateful-specific-deny",
    allowScope: "exact",
    statefulRule: true,
    terminalDeny: true,
  },
} as const satisfies Record<string, NetworkPolicyDraft>;

const forwardPackets: readonly NetworkPolicyPacket[] = [
  {
    id: "client-new-app-8080",
    path: "forward",
    sourceAddress: "10.20.0.2",
    destinationAddress: "10.30.0.2",
    protocol: "tcp",
    sourcePort: 41000,
    destinationPort: 8080,
    connectionState: "new",
    expectedVerdict: "accept",
  },
  {
    id: "app-established-reply",
    path: "forward",
    sourceAddress: "10.30.0.2",
    destinationAddress: "10.20.0.2",
    protocol: "tcp",
    sourcePort: 8080,
    destinationPort: 41000,
    connectionState: "established",
    expectedVerdict: "accept",
  },
  {
    id: "client-new-app-22",
    path: "forward",
    sourceAddress: "10.20.0.2",
    destinationAddress: "10.30.0.2",
    protocol: "tcp",
    sourcePort: 41001,
    destinationPort: 22,
    connectionState: "new",
    expectedVerdict: "drop",
  },
  {
    id: "untrusted-new-app-8080",
    path: "forward",
    sourceAddress: "198.51.100.25",
    destinationAddress: "10.30.0.2",
    protocol: "tcp",
    sourcePort: 42000,
    destinationPort: 8080,
    connectionState: "new",
    expectedVerdict: "drop",
  },
  {
    id: "untracked-transit",
    path: "forward",
    sourceAddress: "198.51.100.25",
    destinationAddress: "10.30.0.2",
    protocol: "udp",
    sourcePort: 53000,
    destinationPort: 9999,
    connectionState: "untracked",
    expectedVerdict: "drop",
  },
];

const inputPackets: readonly NetworkPolicyPacket[] = [
  {
    id: "admin-new-router-22",
    path: "input",
    sourceAddress: "198.51.100.25",
    destinationAddress: "198.51.100.10",
    protocol: "tcp",
    sourcePort: 42000,
    destinationPort: 22,
    connectionState: "new",
    expectedVerdict: "accept",
  },
  {
    id: "router-established-reply",
    path: "input",
    sourceAddress: "203.0.113.53",
    destinationAddress: "198.51.100.10",
    protocol: "udp",
    sourcePort: 53,
    destinationPort: 53000,
    connectionState: "established",
    expectedVerdict: "accept",
  },
  {
    id: "client-new-router-22",
    path: "input",
    sourceAddress: "10.20.0.2",
    destinationAddress: "198.51.100.10",
    protocol: "tcp",
    sourcePort: 41000,
    destinationPort: 22,
    connectionState: "new",
    expectedVerdict: "drop",
  },
  {
    id: "admin-new-router-8080",
    path: "input",
    sourceAddress: "198.51.100.25",
    destinationAddress: "198.51.100.10",
    protocol: "tcp",
    sourcePort: 42001,
    destinationPort: 8080,
    connectionState: "new",
    expectedVerdict: "drop",
  },
  {
    id: "untracked-router-input",
    path: "input",
    sourceAddress: "198.51.100.25",
    destinationAddress: "198.51.100.10",
    protocol: "udp",
    sourcePort: 53001,
    destinationPort: 9999,
    connectionState: "untracked",
    expectedVerdict: "drop",
  },
];

function createRules(draft: NetworkPolicyDraft): NetworkPolicyRule[] {
  const descriptions: Record<NetworkPolicyRuleId, string> = {
    "allow-established-related": "ct state established accept",
    "allow-required-new": draft.mode === "forward"
      ? "ip saddr 10.20.0.2 ip daddr 10.30.0.2 tcp dport 8080 ct state new accept"
      : "ip saddr 198.51.100.25 ip daddr 198.51.100.10 tcp dport 22 ct state new accept",
    "deny-unmatched": "counter drop",
  };
  const orderedIds: NetworkPolicyRuleId[] = draft.ruleOrder === "stateful-specific-deny"
    ? ["allow-established-related", "allow-required-new", "deny-unmatched"]
    : ["deny-unmatched", "allow-required-new", "allow-established-related"];
  return orderedIds
    .filter((id) => id !== "allow-established-related" || draft.statefulRule)
    .filter((id) => id !== "deny-unmatched" || draft.terminalDeny)
    .map((id, index) => ({
      id,
      position: index + 1,
      verdict: id === "deny-unmatched" ? "drop" : "accept",
      description: id === "allow-required-new" && draft.allowScope !== "exact"
        ? draft.allowScope === "any-source"
          ? descriptions[id].replace(/^ip saddr \S+ /, "")
          : descriptions[id].replace(/ tcp dport \d+/, "")
        : descriptions[id],
    }));
}

function requiredRuleMatches(draft: NetworkPolicyDraft, packet: NetworkPolicyPacket) {
  if (packet.connectionState !== "new" || packet.protocol !== "tcp") return false;
  if (draft.mode === "forward") {
    const sourceMatches = draft.allowScope === "any-source" || packet.sourceAddress === "10.20.0.2";
    const portMatches = draft.allowScope === "any-port" || packet.destinationPort === 8080;
    return sourceMatches && packet.destinationAddress === "10.30.0.2" && portMatches;
  }
  const sourceMatches = draft.allowScope === "any-source" || packet.sourceAddress === "198.51.100.25";
  const portMatches = draft.allowScope === "any-port" || packet.destinationPort === 22;
  return sourceMatches && packet.destinationAddress === "198.51.100.10" && portMatches;
}

function ruleMatches(
  draft: NetworkPolicyDraft,
  ruleId: NetworkPolicyRuleId,
  packet: NetworkPolicyPacket,
) {
  if (ruleId === "allow-established-related") return packet.connectionState === "established";
  if (ruleId === "allow-required-new") return requiredRuleMatches(draft, packet);
  return true;
}

function evaluatePacket(
  draft: NetworkPolicyDraft,
  rules: readonly NetworkPolicyRule[],
  packet: NetworkPolicyPacket,
): NetworkPolicyPacketResult {
  if (draft.hook !== draft.mode) {
    return {
      packet,
      observedHook: "unseen",
      verdict: "unseen",
      matchedRuleId: null,
      trace: rules.map(({ id, position }) => ({ ruleId: id, position, status: "pending", verdict: null })),
      passed: false,
    };
  }
  let decided = false;
  let verdict: "accept" | "drop" = draft.defaultPolicy;
  let matchedRuleId: NetworkPolicyPacketResult["matchedRuleId"] = "default-policy";
  const trace: NetworkPolicyRuleTrace[] = rules.map((rule) => {
    if (decided) return { ruleId: rule.id, position: rule.position, status: "pending", verdict: null };
    if (!ruleMatches(draft, rule.id, packet)) {
      return { ruleId: rule.id, position: rule.position, status: "skipped", verdict: null };
    }
    decided = true;
    verdict = rule.verdict;
    matchedRuleId = rule.id;
    return { ruleId: rule.id, position: rule.position, status: "matched", verdict: rule.verdict };
  });
  return {
    packet,
    observedHook: draft.hook,
    verdict,
    matchedRuleId,
    trace,
    passed: verdict === packet.expectedVerdict,
  };
}

export function evaluateNetworkPolicy(draft: NetworkPolicyDraft): NetworkPolicyEvaluation {
  const rules = createRules(draft);
  const packets = draft.mode === "forward" ? forwardPackets : inputPackets;
  const machine: NetworkPolicyMachine = {
    mode: draft.mode,
    chain: {
      family: "inet",
      table: "filter",
      name: draft.mode,
      hook: draft.hook,
      defaultPolicy: draft.defaultPolicy,
      rules,
    },
    packets,
  };
  const packetResults = packets.map((packet) => evaluatePacket(draft, rules, packet));
  const requiredNew = packetResults.find(({ packet }) => packet.connectionState === "new" && packet.expectedVerdict === "accept");
  const establishedReply = packetResults.find(({ packet }) => packet.connectionState === "established");
  const unexpected = packetResults.filter(({ packet }) => packet.expectedVerdict === "drop");
  const denyPosition = rules.find(({ id }) => id === "deny-unmatched")?.position ?? Number.POSITIVE_INFINITY;
  const allowPosition = rules.find(({ id }) => id === "allow-required-new")?.position ?? Number.POSITIVE_INFINITY;
  const statePosition = rules.find(({ id }) => id === "allow-established-related")?.position ?? Number.POSITIVE_INFINITY;
  const checks: Record<NetworkPolicyCheckId, boolean> = {
    "correct-hook": draft.hook === draft.mode,
    "default-deny": draft.defaultPolicy === "drop",
    "terminal-order": allowPosition < denyPosition
      && (!draft.statefulRule || statePosition < denyPosition),
    "exact-allow": draft.allowScope === "exact",
    "stateful-reply": draft.statefulRule && establishedReply?.verdict === "accept",
    "required-new-flow": requiredNew?.verdict === "accept",
    "unexpected-flows-denied": unexpected.every(({ verdict }) => verdict === "drop"),
  };
  let reason: NetworkPolicyFailureReason = "least-allow";
  if (!checks["correct-hook"]) reason = "wrong-hook";
  else if (!checks["default-deny"]) reason = "default-accept";
  else if (!checks["terminal-order"]) reason = "deny-before-allow";
  else if (!draft.statefulRule) reason = "missing-established-rule";
  else if (!checks["exact-allow"]) reason = "overbroad-allow";
  else if (!checks["required-new-flow"]) reason = "required-flow-dropped";
  else if (!checks["stateful-reply"]) reason = "established-reply-dropped";
  else if (!checks["unexpected-flows-denied"]) reason = "unexpected-flow-allowed";
  return {
    passed: Object.values(checks).every(Boolean),
    mode: draft.mode,
    reason,
    checks,
    machine,
    packetResults,
  };
}

export type NetworkPolicyIncidentId =
  | "service-rule-on-input"
  | "deny-before-allow"
  | "missing-established-reply"
  | "default-accept-leak";

export type NetworkPolicyIncidentRepair =
  | "move-service-rule-to-forward"
  | "open-router-input-service"
  | "move-specific-allow-before-deny"
  | "change-base-policy-accept"
  | "add-established-related-rule"
  | "allow-all-ephemeral-ports"
  | "set-base-policy-drop"
  | "deny-only-ssh";

export const networkPolicyIncidentFixtures: Readonly<Record<NetworkPolicyIncidentId, {
  id: NetworkPolicyIncidentId;
  repairOptions: readonly NetworkPolicyIncidentRepair[];
}>> = {
  "service-rule-on-input": {
    id: "service-rule-on-input",
    repairOptions: ["move-service-rule-to-forward", "open-router-input-service"],
  },
  "deny-before-allow": {
    id: "deny-before-allow",
    repairOptions: ["move-specific-allow-before-deny", "change-base-policy-accept"],
  },
  "missing-established-reply": {
    id: "missing-established-reply",
    repairOptions: ["add-established-related-rule", "allow-all-ephemeral-ports"],
  },
  "default-accept-leak": {
    id: "default-accept-leak",
    repairOptions: ["set-base-policy-drop", "deny-only-ssh"],
  },
};

export type NetworkPolicyIncidentEvaluation = {
  incidentId: NetworkPolicyIncidentId;
  repair: NetworkPolicyIncidentRepair;
  passed: boolean;
  evaluation: NetworkPolicyEvaluation;
};

export function evaluateNetworkPolicyIncident(
  incidentId: NetworkPolicyIncidentId,
  repair: NetworkPolicyIncidentRepair,
): NetworkPolicyIncidentEvaluation {
  let draft: NetworkPolicyDraft;
  if (incidentId === "service-rule-on-input") {
    draft = {
      ...networkPolicyPresets["forward-working"],
      hook: repair === "move-service-rule-to-forward" ? "forward" : "input",
    };
  } else if (incidentId === "deny-before-allow") {
    draft = {
      ...networkPolicyPresets["forward-working"],
      ruleOrder: repair === "move-specific-allow-before-deny"
        ? "stateful-specific-deny"
        : "deny-specific-stateful",
      defaultPolicy: repair === "change-base-policy-accept" ? "accept" : "drop",
    };
  } else if (incidentId === "missing-established-reply") {
    draft = {
      ...networkPolicyPresets["forward-working"],
      statefulRule: repair === "add-established-related-rule",
      allowScope: repair === "allow-all-ephemeral-ports" ? "any-port" : "exact",
    };
  } else {
    draft = {
      ...networkPolicyPresets["input-working"],
      defaultPolicy: repair === "set-base-policy-drop" ? "drop" : "accept",
      terminalDeny: false,
    };
  }
  const evaluation = evaluateNetworkPolicy(draft);
  return { incidentId, repair, passed: evaluation.passed, evaluation };
}

export function canCompleteNetworkPolicyChapter(progress: {
  forwardPolicyComplete: boolean;
  inputPolicyComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return progress.forwardPolicyComplete
    && progress.inputPolicyComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

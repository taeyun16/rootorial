export type NatMode = "snat" | "masquerade";
export type NatRuleHook = "none" | "prerouting" | "postrouting";
export type NatTarget = "egress-address" | "unowned-address";
export type NatReturnRouter = "same-router" | "different-router";

export type NatFlowFailureReason =
  | "connected"
  | "client-link-down"
  | "private-route-missing"
  | "forwarding-disabled"
  | "nat-rule-missing"
  | "wrong-nat-hook"
  | "snat-address-unowned"
  | "stale-snat-address"
  | "egress-address-missing"
  | "listener-missing"
  | "external-return-route-missing"
  | "conntrack-disabled"
  | "asymmetric-return";

export type NatFlowStageId =
  | "client-route"
  | "client-veth"
  | "router-forwarding"
  | "source-translation"
  | "external-listener"
  | "reply-to-translated-source"
  | "conntrack-lookup"
  | "reverse-translation"
  | "private-return-route"
  | "client-receives-reply";

export type NatFlowStage = {
  id: NatFlowStageId;
  direction: "forward" | "return";
  status: "passed" | "blocked" | "not-run";
};

export type NatTupleLedger = {
  original: string;
  translated: string;
  reply: string;
  restored: string;
};

export type NatConntrackEntry = {
  state: "ESTABLISHED";
  original: string;
  reply: string;
};

export type NatFlowDraft = {
  mode: NatMode;
  egressAddressMode: "static" | "dynamic";
  clientLinkUp: boolean;
  routerLinksUp: boolean;
  privateRoute: boolean;
  forwarding: boolean;
  natHook: NatRuleHook;
  natTarget: NatTarget;
  egressAddressPresent: boolean;
  externalListener: boolean;
  externalReturnRoute: boolean;
  conntrackEnabled: boolean;
  returnRouter: NatReturnRouter;
};

export type NatFlowEvaluation = {
  passed: boolean;
  reason: NatFlowFailureReason;
  mode: NatMode;
  topologyState:
    | "connected"
    | "forward-blocked"
    | "translation-blocked"
    | "return-blocked";
  stages: NatFlowStage[];
  tuples: NatTupleLedger;
  conntrack: NatConntrackEntry | null;
};

const stageOrder: Array<Pick<NatFlowStage, "id" | "direction">> = [
  { id: "client-route", direction: "forward" },
  { id: "client-veth", direction: "forward" },
  { id: "router-forwarding", direction: "forward" },
  { id: "source-translation", direction: "forward" },
  { id: "external-listener", direction: "forward" },
  { id: "reply-to-translated-source", direction: "return" },
  { id: "conntrack-lookup", direction: "return" },
  { id: "reverse-translation", direction: "return" },
  { id: "private-return-route", direction: "return" },
  { id: "client-receives-reply", direction: "return" },
];

const firstBlockedStage: Record<Exclude<NatFlowFailureReason, "connected">, NatFlowStageId> = {
  "client-link-down": "client-veth",
  "private-route-missing": "client-route",
  "forwarding-disabled": "router-forwarding",
  "nat-rule-missing": "source-translation",
  "wrong-nat-hook": "source-translation",
  "snat-address-unowned": "source-translation",
  "stale-snat-address": "source-translation",
  "egress-address-missing": "source-translation",
  "listener-missing": "external-listener",
  "external-return-route-missing": "reply-to-translated-source",
  "conntrack-disabled": "conntrack-lookup",
  "asymmetric-return": "conntrack-lookup",
};

function tuplesFor(draft: NatFlowDraft): NatTupleLedger {
  const publicAddress = draft.egressAddressMode === "dynamic"
    ? "203.0.113.77"
    : "203.0.113.10";
  return {
    original: "10.20.0.2:41000 → 198.51.100.20:443",
    translated: `${publicAddress}:61000 → 198.51.100.20:443`,
    reply: `198.51.100.20:443 → ${publicAddress}:61000`,
    restored: "198.51.100.20:443 → 10.20.0.2:41000",
  };
}

function stagesFor(reason: NatFlowFailureReason): NatFlowStage[] {
  if (reason === "connected") {
    return stageOrder.map((stage) => ({ ...stage, status: "passed" }));
  }
  const blockedId = firstBlockedStage[reason];
  const blockedIndex = stageOrder.findIndex(({ id }) => id === blockedId);
  return stageOrder.map((stage, index) => ({
    ...stage,
    status: index < blockedIndex ? "passed" : index === blockedIndex ? "blocked" : "not-run",
  }));
}

function topologyStateFor(reason: NatFlowFailureReason): NatFlowEvaluation["topologyState"] {
  if (reason === "connected") return "connected";
  const blocked = firstBlockedStage[reason];
  if (blocked === "source-translation") return "translation-blocked";
  return stageOrder.find(({ id }) => id === blocked)?.direction === "return"
    ? "return-blocked"
    : "forward-blocked";
}

function failureReason(draft: NatFlowDraft): NatFlowFailureReason {
  if (!draft.privateRoute) return "private-route-missing";
  if (!draft.clientLinkUp || !draft.routerLinksUp) return "client-link-down";
  if (!draft.forwarding) return "forwarding-disabled";
  if (draft.natHook === "none") return "nat-rule-missing";
  if (draft.natHook !== "postrouting") return "wrong-nat-hook";
  if (!draft.egressAddressPresent) return "egress-address-missing";
  if (draft.mode === "snat" && draft.egressAddressMode === "dynamic") return "stale-snat-address";
  if (draft.mode === "snat" && draft.natTarget !== "egress-address") return "snat-address-unowned";
  if (!draft.externalListener) return "listener-missing";
  if (!draft.externalReturnRoute) return "external-return-route-missing";
  if (!draft.conntrackEnabled) return "conntrack-disabled";
  if (draft.returnRouter !== "same-router") return "asymmetric-return";
  return "connected";
}

export function evaluateNatFlow(draft: NatFlowDraft): NatFlowEvaluation {
  const reason = failureReason(draft);
  const tuples = tuplesFor(draft);
  const forwardReachedExternal = ![
    "private-route-missing",
    "client-link-down",
    "forwarding-disabled",
    "nat-rule-missing",
    "wrong-nat-hook",
    "snat-address-unowned",
    "stale-snat-address",
    "egress-address-missing",
    "listener-missing",
  ].includes(reason);
  const conntrack = draft.conntrackEnabled && forwardReachedExternal
    ? { state: "ESTABLISHED" as const, original: tuples.original, reply: tuples.reply }
    : null;
  return {
    passed: reason === "connected",
    reason,
    mode: draft.mode,
    topologyState: topologyStateFor(reason),
    stages: stagesFor(reason),
    tuples,
    conntrack,
  };
}

export const natFlowPresets = {
  "snat-scaffold": {
    mode: "snat",
    egressAddressMode: "static",
    clientLinkUp: true,
    routerLinksUp: true,
    privateRoute: true,
    forwarding: false,
    natHook: "none",
    natTarget: "unowned-address",
    egressAddressPresent: true,
    externalListener: true,
    externalReturnRoute: true,
    conntrackEnabled: true,
    returnRouter: "same-router",
  },
  "snat-working": {
    mode: "snat",
    egressAddressMode: "static",
    clientLinkUp: true,
    routerLinksUp: true,
    privateRoute: true,
    forwarding: true,
    natHook: "postrouting",
    natTarget: "egress-address",
    egressAddressPresent: true,
    externalListener: true,
    externalReturnRoute: true,
    conntrackEnabled: true,
    returnRouter: "same-router",
  },
  "masquerade-scaffold": {
    mode: "masquerade",
    egressAddressMode: "dynamic",
    clientLinkUp: true,
    routerLinksUp: true,
    privateRoute: true,
    forwarding: true,
    natHook: "prerouting",
    natTarget: "egress-address",
    egressAddressPresent: false,
    externalListener: true,
    externalReturnRoute: true,
    conntrackEnabled: true,
    returnRouter: "different-router",
  },
  "masquerade-working": {
    mode: "masquerade",
    egressAddressMode: "dynamic",
    clientLinkUp: true,
    routerLinksUp: true,
    privateRoute: true,
    forwarding: true,
    natHook: "postrouting",
    natTarget: "egress-address",
    egressAddressPresent: true,
    externalListener: true,
    externalReturnRoute: true,
    conntrackEnabled: true,
    returnRouter: "same-router",
  },
} as const satisfies Record<string, NatFlowDraft>;

export type NatIncidentId =
  | "wrong-nat-hook"
  | "unowned-snat-address"
  | "asymmetric-return"
  | "dynamic-egress-stale-snat";

export type NatIncidentRepair =
  | "move-rule-to-postrouting"
  | "add-dnat-in-prerouting"
  | "use-egress-owned-address"
  | "advertise-private-address-upstream"
  | "return-through-original-router"
  | "disable-conntrack"
  | "use-masquerade-for-dynamic-egress"
  | "pin-old-egress-address";

export type NatIncidentEvaluation = {
  incidentId: NatIncidentId;
  repair: NatIncidentRepair;
  passed: boolean;
  reason: NatFlowFailureReason;
};

export const natIncidentFixtures: Record<NatIncidentId, {
  draft: NatFlowDraft;
  repairOptions: NatIncidentRepair[];
}> = {
  "wrong-nat-hook": {
    draft: { ...natFlowPresets["snat-working"], natHook: "prerouting" },
    repairOptions: ["add-dnat-in-prerouting", "move-rule-to-postrouting"],
  },
  "unowned-snat-address": {
    draft: { ...natFlowPresets["snat-working"], natTarget: "unowned-address" },
    repairOptions: ["use-egress-owned-address", "advertise-private-address-upstream"],
  },
  "asymmetric-return": {
    draft: { ...natFlowPresets["snat-working"], returnRouter: "different-router" },
    repairOptions: ["disable-conntrack", "return-through-original-router"],
  },
  "dynamic-egress-stale-snat": {
    draft: {
      ...natFlowPresets["snat-working"],
      egressAddressMode: "dynamic",
    },
    repairOptions: ["pin-old-egress-address", "use-masquerade-for-dynamic-egress"],
  },
};

export function evaluateNatIncident(
  incidentId: NatIncidentId,
  repair: NatIncidentRepair,
): NatIncidentEvaluation {
  const fixture = natIncidentFixtures[incidentId];
  if (!fixture.repairOptions.includes(repair)) {
    throw new Error(`Repair ${repair} is not valid for ${incidentId}`);
  }
  let draft: NatFlowDraft = { ...fixture.draft };
  if (repair === "move-rule-to-postrouting") draft = { ...draft, natHook: "postrouting" };
  if (repair === "use-egress-owned-address") draft = { ...draft, natTarget: "egress-address" };
  if (repair === "return-through-original-router") draft = { ...draft, returnRouter: "same-router" };
  if (repair === "use-masquerade-for-dynamic-egress") draft = { ...draft, mode: "masquerade" };
  if (repair === "disable-conntrack") draft = { ...draft, conntrackEnabled: false };
  const result = evaluateNatFlow(draft);
  return { incidentId, repair, passed: result.passed, reason: result.reason };
}

export function canCompleteEgressNatChapter(progress: {
  snatComplete: boolean;
  masqueradeComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return progress.snatComplete
    && progress.masqueradeComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

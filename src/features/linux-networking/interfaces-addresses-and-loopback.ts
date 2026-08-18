export const NETWORK_VIEW_ETH0_ADDRESS = "10.0.0.2";
export const NETWORK_VIEW_ETH0_PREFIX = 24;
export const NETWORK_VIEW_ETH0_MAC = "02:00:00:00:00:02";
export const NETWORK_VIEW_LOOPBACK_ADDRESS = "127.0.0.1";
export const NETWORK_VIEW_LOOPBACK_PREFIX = 8;

export type NetworkInterfaceKind = "ethernet" | "loopback";
export type NetworkAdminState = "up" | "down";
export type NetworkCarrierState = "up" | "down" | "not-applicable";
export type NetworkOperationalState = "UP" | "DOWN" | "UNKNOWN";

export type NetworkLinkIdentity =
  | Readonly<{ kind: "ethernet"; mac: string }>
  | Readonly<{ kind: "loopback" }>;

export type NetworkIpv4Assignment = Readonly<{
  address: string;
  prefixLength: number;
  scope: "global" | "host";
}>;

export type HostNetworkInterface = Readonly<{
  id: string;
  kind: NetworkInterfaceKind;
  adminState: NetworkAdminState;
  carrierState: NetworkCarrierState;
  linkIdentity: NetworkLinkIdentity;
  ipv4: readonly NetworkIpv4Assignment[];
}>;

export type NetworkHostRecord = Readonly<{
  hostname: "localhost";
  address: typeof NETWORK_VIEW_LOOPBACK_ADDRESS;
}>;

export const networkViewEvidenceCommandIds = [
  "ip-brief-link",
  "ip-brief-address",
  "eth0-operstate",
  "getent-localhost-v4",
  "route-get-loopback",
] as const;

export type NetworkViewEvidenceCommandId =
  (typeof networkViewEvidenceCommandIds)[number];

export type NetworkViewEventKind =
  | "observed"
  | "admin-state-set"
  | "carrier-restored"
  | "address-assigned"
  | "address-removed"
  | "interface-restored"
  | "localhost-resolved"
  | "localhost-traced";

export type NetworkViewEvent = Readonly<{
  order: number;
  kind: NetworkViewEventKind;
  interfaceId?: string;
  commandId?: NetworkViewEvidenceCommandId;
  adminState?: NetworkAdminState;
  address?: string;
  prefixLength?: number;
  usable?: boolean;
}>;

export type NetworkViewMachine = Readonly<{
  interfaces: readonly HostNetworkInterface[];
  hosts: readonly NetworkHostRecord[];
  events: readonly NetworkViewEvent[];
}>;

export type NetworkViewAction =
  | Readonly<{ type: "observe"; commandId: NetworkViewEvidenceCommandId }>
  | Readonly<{
      type: "set-admin";
      interfaceId: string;
      state: NetworkAdminState;
    }>
  | Readonly<{ type: "restore-carrier"; interfaceId: string }>
  | Readonly<{
      type: "assign-ipv4";
      interfaceId: string;
      address: string;
      prefixLength: number;
    }>
  | Readonly<{
      type: "remove-ipv4";
      interfaceId: string;
      address: string;
    }>
  | Readonly<{ type: "restore-interface"; interfaceId: "eth0" }>
  | Readonly<{ type: "resolve-localhost" }>
  | Readonly<{ type: "trace-localhost" }>;

export type NetworkViewTransitionReason =
  | "applied"
  | "observed"
  | "resolved"
  | "traced"
  | "interface-not-found"
  | "interface-already-exists"
  | "carrier-not-applicable"
  | "invalid-ipv4"
  | "invalid-prefix"
  | "address-not-found";

export type NetworkViewFact = Readonly<{
  key: string;
  value: string | number | boolean;
}>;

export type NetworkViewCommandOutput = Readonly<{
  id: NetworkViewEvidenceCommandId;
  command: string;
  lines: readonly string[];
  facts: readonly NetworkViewFact[];
}>;

export type LocalhostTrace = Readonly<{
  hostname: "localhost";
  resolved: boolean;
  address: string | null;
  interfaceId: "lo" | null;
  scope: "host" | null;
  leavesHost: false;
  usable: boolean;
  failure:
    | "unresolved"
    | "loopback-interface-missing"
    | "loopback-address-missing"
    | "loopback-admin-down"
    | null;
}>;

export type NetworkViewTransition = Readonly<{
  machine: NetworkViewMachine;
  ok: boolean;
  reason: NetworkViewTransitionReason;
  output: NetworkViewCommandOutput | null;
  localhostTrace: LocalhostTrace | null;
}>;

function freezeAssignment(
  assignment: NetworkIpv4Assignment,
): NetworkIpv4Assignment {
  return Object.freeze({ ...assignment });
}

function freezeInterface(
  networkInterface: HostNetworkInterface,
): HostNetworkInterface {
  return Object.freeze({
    ...networkInterface,
    linkIdentity: Object.freeze({ ...networkInterface.linkIdentity }),
    ipv4: Object.freeze(networkInterface.ipv4.map(freezeAssignment)),
  });
}

function freezeMachine(machine: NetworkViewMachine): NetworkViewMachine {
  return Object.freeze({
    interfaces: Object.freeze(machine.interfaces.map(freezeInterface)),
    hosts: Object.freeze(machine.hosts.map((record) => Object.freeze({ ...record }))),
    events: Object.freeze(machine.events.map((event) => Object.freeze({ ...event }))),
  });
}

const initialLoopback = Object.freeze({
  id: "lo",
  kind: "loopback" as const,
  adminState: "down" as const,
  carrierState: "not-applicable" as const,
  linkIdentity: Object.freeze({ kind: "loopback" as const }),
  ipv4: Object.freeze([Object.freeze({
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
    prefixLength: NETWORK_VIEW_LOOPBACK_PREFIX,
    scope: "host" as const,
  })]),
});

const initialEthernet = Object.freeze({
  id: "eth0",
  kind: "ethernet" as const,
  adminState: "down" as const,
  carrierState: "down" as const,
  linkIdentity: Object.freeze({
    kind: "ethernet" as const,
    mac: NETWORK_VIEW_ETH0_MAC,
  }),
  ipv4: Object.freeze([]),
});

const healthyLoopback = freezeInterface({
  ...initialLoopback,
  adminState: "up",
  ipv4: [{
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
    prefixLength: NETWORK_VIEW_LOOPBACK_PREFIX,
    scope: "host",
  }],
});

const healthyEthernet = freezeInterface({
  ...initialEthernet,
  adminState: "up",
  carrierState: "up",
  ipv4: [{
    address: NETWORK_VIEW_ETH0_ADDRESS,
    prefixLength: NETWORK_VIEW_ETH0_PREFIX,
    scope: "global",
  }],
});

const localhostRecord = Object.freeze({
  hostname: "localhost" as const,
  address: NETWORK_VIEW_LOOPBACK_ADDRESS,
});

export function createNetworkViewMachine(): NetworkViewMachine {
  return freezeMachine({
    interfaces: [initialLoopback, initialEthernet],
    hosts: [localhostRecord],
    events: [],
  });
}

export function createHealthyNetworkViewMachine(): NetworkViewMachine {
  return freezeMachine({
    interfaces: [healthyLoopback, healthyEthernet],
    hosts: [localhostRecord],
    events: [],
  });
}

function isIpv4Address(address: string): boolean {
  const parts = address.split(".");
  if (parts.length !== 4) return false;
  return parts.every((part) => {
    if (!/^(?:0|[1-9][0-9]{0,2})$/.test(part)) return false;
    const value = Number(part);
    return Number.isInteger(value) && value >= 0 && value <= 255;
  });
}

function findInterface(
  machine: NetworkViewMachine,
  interfaceId: string,
): HostNetworkInterface | undefined {
  return machine.interfaces.find((candidate) => candidate.id === interfaceId);
}

export function networkOperationalState(
  networkInterface: HostNetworkInterface,
): NetworkOperationalState {
  if (networkInterface.adminState === "down") return "DOWN";
  if (networkInterface.kind === "loopback") return "UNKNOWN";
  return networkInterface.carrierState === "up" ? "UP" : "DOWN";
}

function linkFlags(networkInterface: HostNetworkInterface): string {
  const flags = networkInterface.kind === "loopback"
    ? ["LOOPBACK"]
    : ["BROADCAST", "MULTICAST"];
  if (networkInterface.adminState === "up") flags.push("UP");
  if (
    networkInterface.kind === "loopback"
      ? networkInterface.adminState === "up"
      : networkInterface.carrierState === "up"
  ) flags.push("LOWER_UP");
  return `<${flags.join(",")}>`;
}

function linkAddress(networkInterface: HostNetworkInterface): string {
  return networkInterface.linkIdentity.kind === "ethernet"
    ? networkInterface.linkIdentity.mac
    : "00:00:00:00:00:00";
}

function fact(key: string, value: NetworkViewFact["value"]): NetworkViewFact {
  return Object.freeze({ key, value });
}

function commandOutput(
  id: NetworkViewEvidenceCommandId,
  command: string,
  lines: readonly string[],
  facts: readonly NetworkViewFact[],
): NetworkViewCommandOutput {
  return Object.freeze({
    id,
    command,
    lines: Object.freeze([...lines]),
    facts: Object.freeze([...facts]),
  });
}

export function traceLocalhost(machine: NetworkViewMachine): LocalhostTrace {
  const record = machine.hosts.find(({ hostname }) => hostname === "localhost");
  if (!record) {
    return Object.freeze({
      hostname: "localhost",
      resolved: false,
      address: null,
      interfaceId: null,
      scope: null,
      leavesHost: false,
      usable: false,
      failure: "unresolved",
    });
  }

  const loopback = findInterface(machine, "lo");
  if (!loopback) {
    return Object.freeze({
      hostname: "localhost",
      resolved: true,
      address: record.address,
      interfaceId: null,
      scope: "host",
      leavesHost: false,
      usable: false,
      failure: "loopback-interface-missing",
    });
  }
  const addressConfigured = loopback.ipv4.some(({ address, prefixLength, scope }) =>
    address === record.address
      && prefixLength === NETWORK_VIEW_LOOPBACK_PREFIX
      && scope === "host",
  );
  if (!addressConfigured) {
    return Object.freeze({
      hostname: "localhost",
      resolved: true,
      address: record.address,
      interfaceId: "lo",
      scope: "host",
      leavesHost: false,
      usable: false,
      failure: "loopback-address-missing",
    });
  }
  const usable = loopback.adminState === "up";
  return Object.freeze({
    hostname: "localhost",
    resolved: true,
    address: record.address,
    interfaceId: "lo",
    scope: "host",
    leavesHost: false,
    usable,
    failure: usable ? null : "loopback-admin-down",
  });
}

export function projectNetworkViewCommand(
  machine: NetworkViewMachine,
  id: NetworkViewEvidenceCommandId,
): NetworkViewCommandOutput {
  const loopback = findInterface(machine, "lo");
  const ethernet = findInterface(machine, "eth0");
  const localhost = traceLocalhost(machine);

  if (id === "ip-brief-link") {
    const lines = machine.interfaces.map((candidate) =>
      `${candidate.id.padEnd(16)} ${networkOperationalState(candidate).padEnd(15)} ${linkAddress(candidate)} ${linkFlags(candidate)}`,
    );
    return commandOutput(id, "ip -br link show", lines, [
      fact("lo.exists", Boolean(loopback)),
      fact("eth0.exists", Boolean(ethernet)),
      fact("eth0.admin", ethernet?.adminState ?? "missing"),
      fact("eth0.carrier", ethernet?.carrierState ?? "missing"),
    ]);
  }

  if (id === "ip-brief-address") {
    const lines = machine.interfaces.map((candidate) => {
      const addresses = candidate.ipv4.length > 0
        ? candidate.ipv4.map(({ address, prefixLength }) => `${address}/${prefixLength}`).join(" ")
        : "-";
      return `${candidate.id.padEnd(16)} ${networkOperationalState(candidate).padEnd(15)} ${addresses}`;
    });
    return commandOutput(id, "ip -br -4 address show", lines, [
      fact("eth0.ipv4", ethernet?.ipv4[0]
        ? `${ethernet.ipv4[0].address}/${ethernet.ipv4[0].prefixLength}`
        : "missing"),
      fact("lo.ipv4", loopback?.ipv4[0]
        ? `${loopback.ipv4[0].address}/${loopback.ipv4[0].prefixLength}`
        : "missing"),
    ]);
  }

  if (id === "eth0-operstate") {
    const state = ethernet
      ? ethernet.adminState === "up" && ethernet.carrierState === "up"
        ? "up"
        : "down"
      : "missing";
    return commandOutput(
      id,
      "cat /sys/class/net/eth0/operstate",
      [state],
      [
        fact("eth0.exists", Boolean(ethernet)),
        fact("eth0.admin", ethernet?.adminState ?? "missing"),
        fact("eth0.carrier", ethernet?.carrierState ?? "missing"),
        fact("eth0.operstate", state),
      ],
    );
  }

  if (id === "getent-localhost-v4") {
    return commandOutput(
      id,
      "getent ahostsv4 localhost",
      localhost.resolved
        ? [`${localhost.address}  STREAM localhost`]
        : [],
      [
        fact("localhost.resolved", localhost.resolved),
        fact("localhost.address", localhost.address ?? "missing"),
        fact("localhost.usable", localhost.usable),
      ],
    );
  }

  const routeLine = !localhost.resolved
    ? "Error: localhost is unresolved"
    : localhost.interfaceId !== "lo" || localhost.failure === "loopback-address-missing"
      ? `unreachable ${NETWORK_VIEW_LOOPBACK_ADDRESS}`
      : `local ${NETWORK_VIEW_LOOPBACK_ADDRESS} dev lo src ${NETWORK_VIEW_LOOPBACK_ADDRESS}${localhost.usable ? "" : " linkdown"}`;
  return commandOutput(
    id,
    `ip route get ${NETWORK_VIEW_LOOPBACK_ADDRESS}`,
    [routeLine],
    [
      fact("localhost.interface", localhost.interfaceId ?? "missing"),
      fact("localhost.scope", localhost.scope ?? "missing"),
      fact("localhost.leavesHost", localhost.leavesHost),
      fact("localhost.usable", localhost.usable),
    ],
  );
}

function failure(
  machine: NetworkViewMachine,
  reason: NetworkViewTransitionReason,
): NetworkViewTransition {
  return Object.freeze({
    machine,
    ok: false,
    reason,
    output: null,
    localhostTrace: null,
  });
}

function success(
  machine: NetworkViewMachine,
  reason: NetworkViewTransitionReason,
  event: Omit<NetworkViewEvent, "order">,
  output: NetworkViewCommandOutput | null = null,
  localhost: LocalhostTrace | null = null,
): NetworkViewTransition {
  const next = freezeMachine({
    ...machine,
    events: [...machine.events, { order: machine.events.length + 1, ...event }],
  });
  return Object.freeze({
    machine: next,
    ok: true,
    reason,
    output,
    localhostTrace: localhost,
  });
}

function replaceInterface(
  machine: NetworkViewMachine,
  updated: HostNetworkInterface,
): NetworkViewMachine {
  return freezeMachine({
    ...machine,
    interfaces: machine.interfaces.map((candidate) =>
      candidate.id === updated.id ? updated : candidate,
    ),
  });
}

export function applyNetworkViewAction(
  machine: NetworkViewMachine,
  action: NetworkViewAction,
): NetworkViewTransition {
  if (action.type === "observe") {
    const output = projectNetworkViewCommand(machine, action.commandId);
    return success(
      machine,
      "observed",
      { kind: "observed", commandId: action.commandId },
      output,
    );
  }
  if (action.type === "resolve-localhost") {
    const localhost = traceLocalhost(machine);
    return success(
      machine,
      "resolved",
      {
        kind: "localhost-resolved",
        address: localhost.address ?? undefined,
        usable: localhost.usable,
      },
      null,
      localhost,
    );
  }
  if (action.type === "trace-localhost") {
    const localhost = traceLocalhost(machine);
    return success(
      machine,
      "traced",
      {
        kind: "localhost-traced",
        interfaceId: localhost.interfaceId ?? undefined,
        address: localhost.address ?? undefined,
        usable: localhost.usable,
      },
      null,
      localhost,
    );
  }
  if (action.type === "restore-interface") {
    if (findInterface(machine, action.interfaceId)) {
      return failure(machine, "interface-already-exists");
    }
    const configured = freezeMachine({
      ...machine,
      interfaces: [...machine.interfaces, healthyEthernet],
    });
    return success(configured, "applied", {
      kind: "interface-restored",
      interfaceId: action.interfaceId,
    });
  }

  const current = findInterface(machine, action.interfaceId);
  if (!current) return failure(machine, "interface-not-found");

  if (action.type === "set-admin") {
    const configured = replaceInterface(machine, freezeInterface({
      ...current,
      adminState: action.state,
    }));
    return success(configured, "applied", {
      kind: "admin-state-set",
      interfaceId: action.interfaceId,
      adminState: action.state,
    });
  }
  if (action.type === "restore-carrier") {
    if (current.kind !== "ethernet") {
      return failure(machine, "carrier-not-applicable");
    }
    const configured = replaceInterface(machine, freezeInterface({
      ...current,
      carrierState: "up",
    }));
    return success(configured, "applied", {
      kind: "carrier-restored",
      interfaceId: action.interfaceId,
    });
  }
  if (action.type === "assign-ipv4") {
    if (!isIpv4Address(action.address)) return failure(machine, "invalid-ipv4");
    if (!Number.isInteger(action.prefixLength)
      || action.prefixLength < 0
      || action.prefixLength > 32) {
      return failure(machine, "invalid-prefix");
    }
    const assignment = freezeAssignment({
      address: action.address,
      prefixLength: action.prefixLength,
      scope: current.kind === "loopback" ? "host" : "global",
    });
    const configured = replaceInterface(machine, freezeInterface({
      ...current,
      ipv4: [
        ...current.ipv4.filter(({ address }) => address !== action.address),
        assignment,
      ],
    }));
    return success(configured, "applied", {
      kind: "address-assigned",
      interfaceId: action.interfaceId,
      address: action.address,
      prefixLength: action.prefixLength,
    });
  }

  const addressExists = current.ipv4.some(({ address }) => address === action.address);
  if (!addressExists) return failure(machine, "address-not-found");
  const configured = replaceInterface(machine, freezeInterface({
    ...current,
    ipv4: current.ipv4.filter(({ address }) => address !== action.address),
  }));
  return success(configured, "applied", {
    kind: "address-removed",
    interfaceId: action.interfaceId,
    address: action.address,
  });
}

export type NetworkViewInvariants = Readonly<{
  eth0Exists: boolean;
  eth0AdminUp: boolean;
  eth0CarrierUp: boolean;
  eth0AddressConfigured: boolean;
  loopbackExists: boolean;
  loopbackAdminUp: boolean;
  loopbackAddressConfigured: boolean;
  localhostResolves: boolean;
  localhostUsable: boolean;
  localhostLeavesHost: false;
}>;

export function inspectNetworkViewInvariants(
  machine: NetworkViewMachine,
): NetworkViewInvariants {
  const eth0 = findInterface(machine, "eth0");
  const lo = findInterface(machine, "lo");
  const localhost = traceLocalhost(machine);
  return Object.freeze({
    eth0Exists: Boolean(eth0),
    eth0AdminUp: eth0?.adminState === "up",
    eth0CarrierUp: eth0?.carrierState === "up",
    eth0AddressConfigured: Boolean(eth0?.ipv4.some(({ address, prefixLength, scope }) =>
      address === NETWORK_VIEW_ETH0_ADDRESS
        && prefixLength === NETWORK_VIEW_ETH0_PREFIX
        && scope === "global",
    )),
    loopbackExists: Boolean(lo),
    loopbackAdminUp: lo?.adminState === "up",
    loopbackAddressConfigured: Boolean(lo?.ipv4.some(({ address, prefixLength, scope }) =>
      address === NETWORK_VIEW_LOOPBACK_ADDRESS
        && prefixLength === NETWORK_VIEW_LOOPBACK_PREFIX
        && scope === "host",
    )),
    localhostResolves: localhost.resolved,
    localhostUsable: localhost.usable,
    localhostLeavesHost: false,
  });
}

export const networkViewPhaseIds = [
  "observe",
  "eth0-up",
  "address-added",
  "lo-up",
  "localhost-pass",
  "lo-down-counterfactual",
] as const;

export type NetworkViewPhaseId = (typeof networkViewPhaseIds)[number];

export type NetworkViewPhaseSnapshot = Readonly<{
  id: NetworkViewPhaseId;
  index: number;
  machine: NetworkViewMachine;
  commands: Readonly<Record<NetworkViewEvidenceCommandId, NetworkViewCommandOutput>>;
  localhostTrace: LocalhostTrace;
  invariants: NetworkViewInvariants;
}>;

function allCommandOutputs(
  machine: NetworkViewMachine,
): Readonly<Record<NetworkViewEvidenceCommandId, NetworkViewCommandOutput>> {
  return Object.freeze(Object.fromEntries(
    networkViewEvidenceCommandIds.map((id) => [id, projectNetworkViewCommand(machine, id)]),
  ) as Record<NetworkViewEvidenceCommandId, NetworkViewCommandOutput>);
}

function phaseSnapshot(
  id: NetworkViewPhaseId,
  machine: NetworkViewMachine,
): NetworkViewPhaseSnapshot {
  return Object.freeze({
    id,
    index: networkViewPhaseIds.indexOf(id),
    machine,
    commands: allCommandOutputs(machine),
    localhostTrace: traceLocalhost(machine),
    invariants: inspectNetworkViewInvariants(machine),
  });
}

function mustApply(
  machine: NetworkViewMachine,
  action: NetworkViewAction,
): NetworkViewMachine {
  const transition = applyNetworkViewAction(machine, action);
  if (!transition.ok) throw new Error(`Unable to build network-view phase: ${transition.reason}`);
  return transition.machine;
}

function buildNetworkViewPhaseSnapshots(): readonly NetworkViewPhaseSnapshot[] {
  let machine = createNetworkViewMachine();
  machine = mustApply(machine, { type: "observe", commandId: "ip-brief-link" });
  const observe = phaseSnapshot("observe", machine);

  machine = mustApply(machine, { type: "set-admin", interfaceId: "eth0", state: "up" });
  machine = mustApply(machine, { type: "observe", commandId: "eth0-operstate" });
  const eth0Up = phaseSnapshot("eth0-up", machine);

  machine = mustApply(machine, {
    type: "assign-ipv4",
    interfaceId: "eth0",
    address: NETWORK_VIEW_ETH0_ADDRESS,
    prefixLength: NETWORK_VIEW_ETH0_PREFIX,
  });
  machine = mustApply(machine, { type: "observe", commandId: "ip-brief-address" });
  const addressAdded = phaseSnapshot("address-added", machine);

  machine = mustApply(machine, { type: "set-admin", interfaceId: "lo", state: "up" });
  machine = mustApply(machine, { type: "observe", commandId: "ip-brief-address" });
  const loUp = phaseSnapshot("lo-up", machine);

  machine = mustApply(machine, { type: "observe", commandId: "getent-localhost-v4" });
  machine = mustApply(machine, { type: "resolve-localhost" });
  machine = mustApply(machine, { type: "observe", commandId: "route-get-loopback" });
  machine = mustApply(machine, { type: "trace-localhost" });
  const localhostPass = phaseSnapshot("localhost-pass", machine);

  machine = mustApply(machine, { type: "set-admin", interfaceId: "lo", state: "down" });
  machine = mustApply(machine, { type: "observe", commandId: "getent-localhost-v4" });
  machine = mustApply(machine, { type: "resolve-localhost" });
  machine = mustApply(machine, { type: "observe", commandId: "route-get-loopback" });
  machine = mustApply(machine, { type: "trace-localhost" });
  const counterfactual = phaseSnapshot("lo-down-counterfactual", machine);

  return Object.freeze([
    observe,
    eth0Up,
    addressAdded,
    loUp,
    localhostPass,
    counterfactual,
  ]);
}

export const networkViewPhaseSnapshots = buildNetworkViewPhaseSnapshots();

export function networkViewPhaseSnapshot(
  id: NetworkViewPhaseId,
): NetworkViewPhaseSnapshot {
  const snapshot = networkViewPhaseSnapshots.find((candidate) => candidate.id === id);
  if (!snapshot) throw new Error(`Unknown network-view phase: ${id}`);
  return snapshot;
}

export type NetworkViewLabPrediction = Readonly<{
  initialEth0?: "exists-admin-down" | "missing" | "address-missing-only";
  afterAdminUp?: "admin-up-carrier-down" | "carrier-up" | "address-added";
  addressMeaning?: "ipv4-with-prefix" | "mac-with-port" | "hostname";
  localhostPath?: "host-loopback" | "ethernet-frame" | "external-dns-only";
  loDownResult?: "resolves-but-not-usable" | "unresolved" | "uses-eth0";
}>;

export type NetworkViewLabEvidence = Readonly<{
  existenceVsAdminPredicted: boolean;
  adminVsCarrierPredicted: boolean;
  addressPrefixPredicted: boolean;
  localhostScopePredicted: boolean;
  loopbackCounterfactualPredicted: boolean;
}>;

export const emptyNetworkViewLabEvidence: NetworkViewLabEvidence = Object.freeze({
  existenceVsAdminPredicted: false,
  adminVsCarrierPredicted: false,
  addressPrefixPredicted: false,
  localhostScopePredicted: false,
  loopbackCounterfactualPredicted: false,
});

export type NetworkViewLabPredictionEvaluation = Readonly<{
  correct: boolean;
  errors: readonly string[];
  evidence: NetworkViewLabEvidence;
}>;

export function evaluateNetworkViewLabPrediction(
  prediction: NetworkViewLabPrediction,
): NetworkViewLabPredictionEvaluation {
  const evidence = Object.freeze({
    existenceVsAdminPredicted: prediction.initialEth0 === "exists-admin-down",
    adminVsCarrierPredicted: prediction.afterAdminUp === "admin-up-carrier-down",
    addressPrefixPredicted: prediction.addressMeaning === "ipv4-with-prefix",
    localhostScopePredicted: prediction.localhostPath === "host-loopback",
    loopbackCounterfactualPredicted: prediction.loDownResult === "resolves-but-not-usable",
  });
  const errors = Object.freeze(Object.entries(evidence)
    .filter(([, correct]) => !correct)
    .map(([key]) => key));
  return Object.freeze({ correct: errors.length === 0, errors, evidence });
}

export function mergeNetworkViewLabEvidence(
  current: NetworkViewLabEvidence,
  evaluation: NetworkViewLabPredictionEvaluation,
): NetworkViewLabEvidence {
  return Object.freeze({
    existenceVsAdminPredicted:
      current.existenceVsAdminPredicted || evaluation.evidence.existenceVsAdminPredicted,
    adminVsCarrierPredicted:
      current.adminVsCarrierPredicted || evaluation.evidence.adminVsCarrierPredicted,
    addressPrefixPredicted:
      current.addressPrefixPredicted || evaluation.evidence.addressPrefixPredicted,
    localhostScopePredicted:
      current.localhostScopePredicted || evaluation.evidence.localhostScopePredicted,
    loopbackCounterfactualPredicted:
      current.loopbackCounterfactualPredicted
        || evaluation.evidence.loopbackCounterfactualPredicted,
  });
}

function eventIndex(
  machine: NetworkViewMachine,
  cursor: number,
  predicate: (event: NetworkViewEvent) => boolean,
): number {
  const relative = machine.events.slice(cursor).findIndex(predicate);
  return relative < 0 ? -1 : cursor + relative;
}

function hasRequiredLabHistory(machine: NetworkViewMachine): boolean {
  let cursor = 0;
  const advance = (predicate: (event: NetworkViewEvent) => boolean) => {
    const index = eventIndex(machine, cursor, predicate);
    if (index < 0) return false;
    cursor = index + 1;
    return true;
  };
  return advance((event) => event.kind === "observed" && event.commandId === "ip-brief-link")
    && advance((event) => event.kind === "admin-state-set"
      && event.interfaceId === "eth0" && event.adminState === "up")
    && advance((event) => event.kind === "observed" && event.commandId === "eth0-operstate")
    && advance((event) => event.kind === "address-assigned"
      && event.interfaceId === "eth0"
      && event.address === NETWORK_VIEW_ETH0_ADDRESS
      && event.prefixLength === NETWORK_VIEW_ETH0_PREFIX)
    && advance((event) => event.kind === "observed" && event.commandId === "ip-brief-address")
    && advance((event) => event.kind === "admin-state-set"
      && event.interfaceId === "lo" && event.adminState === "up")
    && advance((event) => event.kind === "observed" && event.commandId === "getent-localhost-v4")
    && advance((event) => event.kind === "localhost-resolved"
      && event.address === NETWORK_VIEW_LOOPBACK_ADDRESS)
    && advance((event) => event.kind === "observed" && event.commandId === "route-get-loopback")
    && advance((event) => event.kind === "localhost-traced"
      && event.interfaceId === "lo" && event.usable === true);
}

export function canMasterNetworkViewLab(
  machine: NetworkViewMachine,
  evidence: NetworkViewLabEvidence,
): boolean {
  const invariants = inspectNetworkViewInvariants(machine);
  return Object.values(evidence).every(Boolean)
    && invariants.eth0Exists
    && invariants.eth0AdminUp
    && !invariants.eth0CarrierUp
    && invariants.eth0AddressConfigured
    && invariants.loopbackExists
    && invariants.loopbackAdminUp
    && invariants.loopbackAddressConfigured
    && invariants.localhostResolves
    && invariants.localhostUsable
    && !invariants.localhostLeavesHost
    && hasRequiredLabHistory(machine);
}

export const networkViewIncidentIds = [
  "interface-absent",
  "admin-down",
  "carrier-down",
  "loopback-address-missing",
] as const;

export type NetworkViewIncidentId = (typeof networkViewIncidentIds)[number];

export const networkViewRepairIds = [
  "restore-interface",
  "bring-admin-up",
  "restore-carrier",
  "restore-loopback-address",
] as const;

export type NetworkViewRepairId = (typeof networkViewRepairIds)[number];

function machineWithInterfaces(
  interfaces: readonly HostNetworkInterface[],
): NetworkViewMachine {
  return freezeMachine({
    ...createHealthyNetworkViewMachine(),
    interfaces,
  });
}

export const networkViewIncidentFixtures = Object.freeze({
  "interface-absent": machineWithInterfaces([healthyLoopback]),
  "admin-down": machineWithInterfaces([
    healthyLoopback,
    freezeInterface({ ...healthyEthernet, adminState: "down" }),
  ]),
  "carrier-down": machineWithInterfaces([
    healthyLoopback,
    freezeInterface({ ...healthyEthernet, carrierState: "down" }),
  ]),
  "loopback-address-missing": machineWithInterfaces([
    freezeInterface({ ...healthyLoopback, ipv4: [] }),
    healthyEthernet,
  ]),
} satisfies Record<NetworkViewIncidentId, NetworkViewMachine>);

function repairAction(id: NetworkViewRepairId): NetworkViewAction {
  if (id === "restore-interface") {
    return { type: "restore-interface", interfaceId: "eth0" };
  }
  if (id === "bring-admin-up") {
    return { type: "set-admin", interfaceId: "eth0", state: "up" };
  }
  if (id === "restore-carrier") {
    return { type: "restore-carrier", interfaceId: "eth0" };
  }
  return {
    type: "assign-ipv4",
    interfaceId: "lo",
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
    prefixLength: NETWORK_VIEW_LOOPBACK_PREFIX,
  };
}

function configurationKey(machine: NetworkViewMachine): string {
  return JSON.stringify({ interfaces: machine.interfaces, hosts: machine.hosts });
}

export type NetworkViewIncidentEvaluation = Readonly<{
  correct: boolean;
  errors: readonly string[];
  machine: NetworkViewMachine;
  transitionReason: NetworkViewTransitionReason;
}>;

export function evaluateNetworkViewIncidentRepair(
  incidentId: NetworkViewIncidentId,
  repairId: NetworkViewRepairId,
): NetworkViewIncidentEvaluation {
  const fixture = networkViewIncidentFixtures[incidentId];
  const transition = applyNetworkViewAction(fixture, repairAction(repairId));
  const errors: string[] = [];
  if (!transition.ok) errors.push(transition.reason);
  if (configurationKey(transition.machine) !== configurationKey(createHealthyNetworkViewMachine())) {
    errors.push("healthy-configuration-not-restored");
  }
  return Object.freeze({
    correct: errors.length === 0,
    errors: Object.freeze(errors),
    machine: transition.machine,
    transitionReason: transition.reason,
  });
}

export function canCompleteNetworkViewIncidents(
  repairs: Partial<Record<NetworkViewIncidentId, NetworkViewRepairId>>,
): boolean {
  return networkViewIncidentIds.every((id) => {
    const repair = repairs[id];
    return repair !== undefined && evaluateNetworkViewIncidentRepair(id, repair).correct;
  });
}

export function canCompleteInterfacesAddressesLoopbackChapter({
  labComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  labComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return labComplete && incidentsComplete && conceptsMastered;
}

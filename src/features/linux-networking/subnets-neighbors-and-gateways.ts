export const SUBNET_HOST_ADDRESS = "10.20.0.2";
export const SUBNET_PREFIX_LENGTH = 24;
export const SUBNET_HOST_MAC = "02:00:00:00:00:02";
export const SUBNET_PEER_ADDRESS = "10.20.0.44";
export const SUBNET_PEER_MAC = "02:00:00:00:00:44";
export const SUBNET_GATEWAY_ADDRESS = "10.20.0.1";
export const SUBNET_GATEWAY_MAC = "02:00:00:00:00:01";
export const SUBNET_REMOTE_ADDRESS = "203.0.113.20";

export type NeighborEntry = Readonly<{
  address: string;
  mac: string;
  state: "reachable" | "stale";
}>;

export type SubnetState = Readonly<{
  hostAddress: string;
  prefixLength: number;
  hostMac: string;
  gateway: string | null;
  neighbors: readonly NeighborEntry[];
}>;

export type DeliveryDecision = Readonly<{
  destination: string;
  network: string;
  onLink: boolean;
  nextHop: string | null;
  arpTarget: string | null;
  ethernetDestination: string | null;
  ipDestination: string;
  status: "neighbor-resolution" | "ready" | "blocked";
  reason: "neighbor-missing" | "neighbor-known" | "default-route-missing" | "gateway-off-link";
}>;

function parseIpv4(address: string): number | null {
  const octets = address.split(".");
  if (octets.length !== 4) return null;
  let value = 0;
  for (const octet of octets) {
    if (!/^\d{1,3}$/.test(octet)) return null;
    const parsed = Number(octet);
    if (parsed < 0 || parsed > 255) return null;
    value = (value * 256 + parsed) >>> 0;
  }
  return value >>> 0;
}

function formatIpv4(value: number): string {
  return [24, 16, 8, 0]
    .map((shift) => (value >>> shift) & 255)
    .join(".");
}

function maskFor(prefixLength: number): number {
  if (prefixLength === 0) return 0;
  return (0xffffffff << (32 - prefixLength)) >>> 0;
}

export function deriveIpv4Network(address: string, prefixLength: number): string {
  const parsed = parseIpv4(address);
  if (parsed === null || !Number.isInteger(prefixLength) || prefixLength < 0 || prefixLength > 32) {
    throw new Error("invalid-ipv4-prefix");
  }
  return `${formatIpv4(parsed & maskFor(prefixLength))}/${prefixLength}`;
}

export function isSameIpv4Link(
  source: string,
  destination: string,
  prefixLength: number,
): boolean {
  const sourceValue = parseIpv4(source);
  const destinationValue = parseIpv4(destination);
  if (sourceValue === null || destinationValue === null || prefixLength < 0 || prefixLength > 32) {
    return false;
  }
  const mask = maskFor(prefixLength);
  return (sourceValue & mask) === (destinationValue & mask);
}

export function createHealthySubnetState(): SubnetState {
  return Object.freeze({
    hostAddress: SUBNET_HOST_ADDRESS,
    prefixLength: SUBNET_PREFIX_LENGTH,
    hostMac: SUBNET_HOST_MAC,
    gateway: SUBNET_GATEWAY_ADDRESS,
    neighbors: Object.freeze([
      Object.freeze({ address: SUBNET_PEER_ADDRESS, mac: SUBNET_PEER_MAC, state: "reachable" as const }),
      Object.freeze({ address: SUBNET_GATEWAY_ADDRESS, mac: SUBNET_GATEWAY_MAC, state: "reachable" as const }),
    ]),
  });
}

export function decideDelivery(
  state: SubnetState,
  destination: string,
): DeliveryDecision {
  const network = deriveIpv4Network(state.hostAddress, state.prefixLength);
  const onLink = isSameIpv4Link(state.hostAddress, destination, state.prefixLength);
  if (!onLink && state.gateway === null) {
    return Object.freeze({
      destination, network, onLink, nextHop: null, arpTarget: null,
      ethernetDestination: null, ipDestination: destination,
      status: "blocked", reason: "default-route-missing",
    });
  }
  const nextHop = onLink ? destination : state.gateway!;
  if (!onLink && !isSameIpv4Link(state.hostAddress, nextHop, state.prefixLength)) {
    return Object.freeze({
      destination, network, onLink, nextHop, arpTarget: null,
      ethernetDestination: null, ipDestination: destination,
      status: "blocked", reason: "gateway-off-link",
    });
  }
  const neighbor = state.neighbors.find((entry) => entry.address === nextHop);
  if (!neighbor) {
    return Object.freeze({
      destination, network, onLink, nextHop, arpTarget: nextHop,
      ethernetDestination: null, ipDestination: destination,
      status: "neighbor-resolution", reason: "neighbor-missing",
    });
  }
  return Object.freeze({
    destination, network, onLink, nextHop, arpTarget: nextHop,
    ethernetDestination: neighbor.mac, ipDestination: destination,
    status: "ready", reason: "neighbor-known",
  });
}

export const subnetPhaseIds = [
  "inspect-prefix",
  "resolve-peer",
  "send-peer",
  "choose-gateway",
  "send-remote",
  "remove-default",
] as const;

export type SubnetPhaseId = (typeof subnetPhaseIds)[number];

export type SubnetPhaseSnapshot = Readonly<{
  id: SubnetPhaseId;
  command: string;
  state: SubnetState;
  decision: DeliveryDecision;
  output: readonly string[];
}>;

function stateWith(
  gateway: string | null,
  neighbors: readonly NeighborEntry[],
): SubnetState {
  return Object.freeze({
    hostAddress: SUBNET_HOST_ADDRESS,
    prefixLength: SUBNET_PREFIX_LENGTH,
    hostMac: SUBNET_HOST_MAC,
    gateway,
    neighbors: Object.freeze(neighbors.map((entry) => Object.freeze({ ...entry }))),
  });
}

export function subnetPhaseSnapshot(id: SubnetPhaseId): SubnetPhaseSnapshot {
  const peer = { address: SUBNET_PEER_ADDRESS, mac: SUBNET_PEER_MAC, state: "reachable" as const };
  const gateway = { address: SUBNET_GATEWAY_ADDRESS, mac: SUBNET_GATEWAY_MAC, state: "reachable" as const };
  if (id === "inspect-prefix") {
    const state = stateWith(SUBNET_GATEWAY_ADDRESS, []);
    return Object.freeze({ id, command: "ip -4 addr show dev eth0", state, decision: decideDelivery(state, SUBNET_PEER_ADDRESS), output: Object.freeze(["inet 10.20.0.2/24 scope global eth0", "derived network 10.20.0.0/24"]) });
  }
  if (id === "resolve-peer") {
    const state = stateWith(SUBNET_GATEWAY_ADDRESS, []);
    return Object.freeze({ id, command: "ip route get 10.20.0.44", state, decision: decideDelivery(state, SUBNET_PEER_ADDRESS), output: Object.freeze(["10.20.0.44 dev eth0 src 10.20.0.2", "ARP: who has 10.20.0.44?"]) });
  }
  if (id === "send-peer") {
    const state = stateWith(SUBNET_GATEWAY_ADDRESS, [peer]);
    return Object.freeze({ id, command: "ip neigh show 10.20.0.44", state, decision: decideDelivery(state, SUBNET_PEER_ADDRESS), output: Object.freeze(["10.20.0.44 dev eth0 lladdr 02:00:00:00:00:44 REACHABLE", "frame dst 02:00:00:00:00:44"]) });
  }
  if (id === "choose-gateway") {
    const state = stateWith(SUBNET_GATEWAY_ADDRESS, [peer]);
    return Object.freeze({ id, command: "ip route get 203.0.113.20", state, decision: decideDelivery(state, SUBNET_REMOTE_ADDRESS), output: Object.freeze(["203.0.113.20 via 10.20.0.1 dev eth0 src 10.20.0.2", "ARP target 10.20.0.1 — not 203.0.113.20"]) });
  }
  if (id === "send-remote") {
    const state = stateWith(SUBNET_GATEWAY_ADDRESS, [peer, gateway]);
    return Object.freeze({ id, command: "ip neigh show 10.20.0.1", state, decision: decideDelivery(state, SUBNET_REMOTE_ADDRESS), output: Object.freeze(["10.20.0.1 dev eth0 lladdr 02:00:00:00:00:01 REACHABLE", "frame dst 02:00:00:00:00:01 · IP dst 203.0.113.20"]) });
  }
  const state = stateWith(null, [peer, gateway]);
  return Object.freeze({ id, command: "ip route del default", state, decision: decideDelivery(state, SUBNET_REMOTE_ADDRESS), output: Object.freeze(["default route removed", "203.0.113.20: network is unreachable"]) });
}

export const subnetIncidentIds = [
  "prefix-too-wide",
  "wrong-peer-mac",
  "default-route-missing",
  "gateway-off-link",
] as const;
export type SubnetIncidentId = (typeof subnetIncidentIds)[number];
export const subnetRepairIds = [
  "restore-prefix-24",
  "refresh-peer-neighbor",
  "restore-default-route",
  "restore-on-link-gateway",
] as const;
export type SubnetRepairId = (typeof subnetRepairIds)[number];

const expectedRepairs: Record<SubnetIncidentId, SubnetRepairId> = {
  "prefix-too-wide": "restore-prefix-24",
  "wrong-peer-mac": "refresh-peer-neighbor",
  "default-route-missing": "restore-default-route",
  "gateway-off-link": "restore-on-link-gateway",
};

export function evaluateSubnetIncidentRepair(
  incidentId: SubnetIncidentId,
  repairId: SubnetRepairId,
): Readonly<{ correct: boolean; expected: SubnetRepairId }> {
  const expected = expectedRepairs[incidentId];
  return Object.freeze({ correct: expected === repairId, expected });
}

export function canCompleteSubnetIncidents(
  repairs: Partial<Record<SubnetIncidentId, SubnetRepairId>>,
): boolean {
  return subnetIncidentIds.every((id) => {
    const repair = repairs[id];
    return repair !== undefined && evaluateSubnetIncidentRepair(id, repair).correct;
  });
}

export function canCompleteSubnetsChapter(input: {
  labComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return input.labComplete && input.incidentsComplete && input.conceptsMastered;
}

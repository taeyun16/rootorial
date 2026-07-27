export type VethTopologyMode = "bridge" | "router";
export type VethPeerTarget = "host" | "bridge" | "router";
export type VethRouteChoice = "missing" | "correct" | "wrong-gateway";
export type VethTopologyNamespaceId = "host" | "client" | "router" | "app";

export type VethTopologyDraft = {
  mode: VethTopologyMode;
  clientAddress: string;
  appAddress: string;
  clientPeerTarget: VethPeerTarget;
  appPeerTarget: VethPeerTarget;
  clientLinkUp: boolean;
  appLinkUp: boolean;
  routerClientAddress: string;
  routerAppAddress: string;
  clientForwardRoute: VethRouteChoice;
  appReturnRoute: VethRouteChoice;
  forwarding: boolean;
  appListenerUp: boolean;
};

export type VethTopologyInterface = {
  id: "client-eth0" | "client-peer" | "app-eth0" | "app-peer";
  name: string;
  ownerNamespace: VethTopologyNamespaceId;
  peerId: VethTopologyInterface["id"];
  pairId: "client-veth" | "app-veth";
  up: boolean;
  address: string | null;
  bridgeId: "br0" | null;
};

export type VethTopologyRoute = {
  id: "client-connected" | "app-connected" | "client-forward" | "app-return";
  ownerNamespace: "client" | "app";
  destination: string;
  gateway: string | null;
  device: "eth0";
  role: "connected" | "forward" | "return";
  state: "ready" | "missing" | "wrong-gateway";
};

export type VethTopologyMachine = {
  mode: VethTopologyMode;
  interfaces: readonly VethTopologyInterface[];
  bridge: {
    id: "br0";
    ownerNamespace: "host";
    up: boolean;
    portIds: readonly VethTopologyInterface["id"][];
  } | null;
  routes: readonly VethTopologyRoute[];
  forwarding: boolean;
  listener: {
    id: "app-listener";
    ownerNamespace: "app";
    address: "0.0.0.0";
    port: 8080;
    up: boolean;
  };
};

export type VethTopologyCheckId =
  | "peer-placement"
  | "links-up"
  | "distinct-addresses"
  | "address-plan"
  | "client-forward-route"
  | "transit-forwarding"
  | "return-route"
  | "app-listener";

export type VethTopologyFailureReason =
  | "connected"
  | "veth-peer-missing"
  | "interface-down"
  | "bridge-port-missing"
  | "invalid-address"
  | "duplicate-address"
  | "overlapping-router-subnets"
  | "gateway-off-link"
  | "no-forward-route"
  | "forwarding-disabled"
  | "no-return-route"
  | "listener-missing";

export type VethTopologyPathStage = {
  id: string;
  direction: "forward" | "return";
  label: string;
  status: "passed" | "blocked" | "pending";
  reason: VethTopologyFailureReason | null;
};

export type VethTopologyEvaluation = {
  passed: boolean;
  mode: VethTopologyMode;
  checks: Readonly<Record<VethTopologyCheckId, boolean>>;
  reason: VethTopologyFailureReason;
  forwardPath: readonly VethTopologyPathStage[];
  returnPath: readonly VethTopologyPathStage[];
  machine: VethTopologyMachine;
};

export const vethTopologyPresets = {
  "bridge-scaffold": {
    mode: "bridge",
    clientAddress: "10.20.0.2/24",
    appAddress: "10.30.0.2/24",
    clientPeerTarget: "host",
    appPeerTarget: "host",
    clientLinkUp: false,
    appLinkUp: false,
    routerClientAddress: "10.20.0.1/24",
    routerAppAddress: "10.30.0.1/24",
    clientForwardRoute: "missing",
    appReturnRoute: "missing",
    forwarding: false,
    appListenerUp: true,
  },
  "bridge-working": {
    mode: "bridge",
    clientAddress: "10.20.0.2/24",
    appAddress: "10.20.0.3/24",
    clientPeerTarget: "bridge",
    appPeerTarget: "bridge",
    clientLinkUp: true,
    appLinkUp: true,
    routerClientAddress: "10.20.0.1/24",
    routerAppAddress: "10.30.0.1/24",
    clientForwardRoute: "missing",
    appReturnRoute: "missing",
    forwarding: false,
    appListenerUp: true,
  },
  "router-scaffold": {
    mode: "router",
    clientAddress: "10.20.0.2/24",
    appAddress: "10.30.0.2/24",
    clientPeerTarget: "host",
    appPeerTarget: "host",
    clientLinkUp: false,
    appLinkUp: false,
    routerClientAddress: "10.20.0.1/24",
    routerAppAddress: "10.30.0.1/24",
    clientForwardRoute: "missing",
    appReturnRoute: "missing",
    forwarding: false,
    appListenerUp: true,
  },
  "router-working": {
    mode: "router",
    clientAddress: "10.20.0.2/24",
    appAddress: "10.30.0.2/24",
    clientPeerTarget: "router",
    appPeerTarget: "router",
    clientLinkUp: true,
    appLinkUp: true,
    routerClientAddress: "10.20.0.1/24",
    routerAppAddress: "10.30.0.1/24",
    clientForwardRoute: "correct",
    appReturnRoute: "correct",
    forwarding: true,
    appListenerUp: true,
  },
} as const satisfies Record<string, VethTopologyDraft>;

type ParsedCidr = {
  address: number;
  prefix: number;
  network: number;
  broadcast: number;
};

function parseIpv4(value: string): number | null {
  const parts = value.split(".");
  if (parts.length !== 4) return null;
  let address = 0;
  for (const part of parts) {
    if (!/^\d{1,3}$/.test(part)) return null;
    const octet = Number(part);
    if (octet > 255 || String(octet) !== part) return null;
    address = ((address << 8) | octet) >>> 0;
  }
  return address;
}

function parseCidr(value: string): ParsedCidr | null {
  const [addressText, prefixText, extra] = value.split("/");
  if (extra !== undefined || !/^\d{1,2}$/.test(prefixText ?? "")) return null;
  const address = parseIpv4(addressText);
  const prefix = Number(prefixText);
  if (address === null || prefix > 32 || String(prefix) !== prefixText) return null;
  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  const network = (address & mask) >>> 0;
  return {
    address,
    prefix,
    network,
    broadcast: (network | (~mask >>> 0)) >>> 0,
  };
}

function sameSubnet(left: ParsedCidr | null, right: ParsedCidr | null) {
  return Boolean(left && right && left.prefix === right.prefix && left.network === right.network);
}

function overlaps(left: ParsedCidr | null, right: ParsedCidr | null) {
  return Boolean(left && right && left.network <= right.broadcast && right.network <= left.broadcast);
}

function formatIpv4(address: number) {
  return [
    address >>> 24,
    (address >>> 16) & 0xff,
    (address >>> 8) & 0xff,
    address & 0xff,
  ].join(".");
}

function connectedPrefix(address: string) {
  const parsed = parseCidr(address);
  return parsed
    ? `${formatIpv4(parsed.network)}/${parsed.prefix}`
    : "invalid";
}

function peerOwner(target: VethPeerTarget): VethTopologyNamespaceId {
  return target === "router" ? "router" : "host";
}

function route(
  id: "client-forward" | "app-return",
  choice: VethRouteChoice,
): VethTopologyRoute | null {
  if (choice === "missing") return null;
  const forward = id === "client-forward";
  return {
    id,
    ownerNamespace: forward ? "client" : "app",
    destination: forward ? "10.30.0.0/24" : "10.20.0.0/24",
    gateway: choice === "correct"
      ? forward ? "10.20.0.1" : "10.30.0.1"
      : "10.99.0.1",
    device: "eth0",
    role: forward ? "forward" : "return",
    state: choice === "correct" ? "ready" : "wrong-gateway",
  };
}

function createMachine(draft: VethTopologyDraft): VethTopologyMachine {
  const bridgeMode = draft.mode === "bridge";
  const interfaces: VethTopologyInterface[] = [
    { id: "client-eth0", name: "eth0", ownerNamespace: "client", peerId: "client-peer", pairId: "client-veth", up: draft.clientLinkUp, address: draft.clientAddress, bridgeId: null },
    { id: "client-peer", name: bridgeMode ? "veth-client-host" : "veth-client-rtr", ownerNamespace: peerOwner(draft.clientPeerTarget), peerId: "client-eth0", pairId: "client-veth", up: draft.clientLinkUp, address: draft.clientPeerTarget === "router" ? draft.routerClientAddress : null, bridgeId: draft.clientPeerTarget === "bridge" ? "br0" : null },
    { id: "app-eth0", name: "eth0", ownerNamespace: "app", peerId: "app-peer", pairId: "app-veth", up: draft.appLinkUp, address: draft.appAddress, bridgeId: null },
    { id: "app-peer", name: bridgeMode ? "veth-app-host" : "veth-app-rtr", ownerNamespace: peerOwner(draft.appPeerTarget), peerId: "app-eth0", pairId: "app-veth", up: draft.appLinkUp, address: draft.appPeerTarget === "router" ? draft.routerAppAddress : null, bridgeId: draft.appPeerTarget === "bridge" ? "br0" : null },
  ];
  const routes: VethTopologyRoute[] = [
    { id: "client-connected", ownerNamespace: "client", destination: connectedPrefix(draft.clientAddress), gateway: null, device: "eth0", role: "connected", state: "ready" },
    { id: "app-connected", ownerNamespace: "app", destination: connectedPrefix(draft.appAddress), gateway: null, device: "eth0", role: "connected", state: "ready" },
  ];
  const forwardRoute = route("client-forward", draft.clientForwardRoute);
  const returnRoute = route("app-return", draft.appReturnRoute);
  if (forwardRoute) routes.push(forwardRoute);
  if (returnRoute) routes.push(returnRoute);
  const portIds = interfaces.filter(({ bridgeId }) => bridgeId === "br0").map(({ id }) => id);
  return {
    mode: draft.mode,
    interfaces: interfaces.map((networkInterface) => ({ ...networkInterface })),
    bridge: bridgeMode ? { id: "br0", ownerNamespace: "host", up: true, portIds } : null,
    routes: routes.map((candidate) => ({ ...candidate })),
    forwarding: draft.mode === "router" && draft.forwarding,
    listener: { id: "app-listener", ownerNamespace: "app", address: "0.0.0.0", port: 8080, up: draft.appListenerUp },
  };
}

function pathStages(
  direction: "forward" | "return",
  rows: ReadonlyArray<{ id: string; label: string; ready: boolean; reason: VethTopologyFailureReason }>,
): VethTopologyPathStage[] {
  let blocked = false;
  return rows.map((row) => {
    if (blocked) return { id: row.id, direction, label: row.label, status: "pending", reason: null };
    if (!row.ready) {
      blocked = true;
      return { id: row.id, direction, label: row.label, status: "blocked", reason: row.reason };
    }
    return { id: row.id, direction, label: row.label, status: "passed", reason: null };
  });
}

export function evaluateVethTopology(draft: VethTopologyDraft): VethTopologyEvaluation {
  const machine = createMachine(draft);
  const client = parseCidr(draft.clientAddress);
  const app = parseCidr(draft.appAddress);
  const routerClient = parseCidr(draft.routerClientAddress);
  const routerApp = parseCidr(draft.routerAppAddress);
  const requiredAddresses = draft.mode === "bridge" ? [client, app] : [client, app, routerClient, routerApp];
  const validAddresses = requiredAddresses.every(Boolean);
  const addressValues = requiredAddresses.flatMap((candidate) => candidate ? [candidate.address] : []);
  const distinctAddresses = validAddresses && new Set(addressValues).size === addressValues.length;
  const expectedTarget: VethPeerTarget = draft.mode === "bridge" ? "bridge" : "router";
  const peerPlacement = draft.clientPeerTarget === expectedTarget && draft.appPeerTarget === expectedTarget;
  const linksUp = draft.clientLinkUp && draft.appLinkUp;
  const routerSubnetsOverlap = draft.mode === "router" && overlaps(routerClient, routerApp);
  const addressPlan = draft.mode === "bridge"
    ? sameSubnet(client, app)
    : sameSubnet(client, routerClient) && sameSubnet(app, routerApp) && !routerSubnetsOverlap;
  const forwardGatewayOnLink = sameSubnet(client, routerClient);
  const returnGatewayOnLink = sameSubnet(app, routerApp);
  const clientForwardRoute = draft.mode === "bridge"
    ? addressPlan
    : draft.clientForwardRoute === "correct" && forwardGatewayOnLink;
  const transitForwarding = draft.mode === "bridge" ? peerPlacement : draft.forwarding;
  const returnRoute = draft.mode === "bridge"
    ? addressPlan
    : draft.appReturnRoute === "correct" && returnGatewayOnLink;
  const checks: Record<VethTopologyCheckId, boolean> = {
    "peer-placement": peerPlacement,
    "links-up": linksUp,
    "distinct-addresses": distinctAddresses,
    "address-plan": validAddresses && addressPlan,
    "client-forward-route": clientForwardRoute,
    "transit-forwarding": transitForwarding,
    "return-route": returnRoute,
    "app-listener": draft.appListenerUp,
  };
  let reason: VethTopologyFailureReason = "connected";
  if (!validAddresses) reason = "invalid-address";
  else if (!distinctAddresses) reason = "duplicate-address";
  else if (!peerPlacement) reason = draft.mode === "bridge" ? "bridge-port-missing" : "veth-peer-missing";
  else if (!linksUp) reason = "interface-down";
  else if (!addressPlan) reason = routerSubnetsOverlap ? "overlapping-router-subnets" : "invalid-address";
  else if (draft.mode === "router" && draft.clientForwardRoute === "wrong-gateway") reason = "gateway-off-link";
  else if (!clientForwardRoute) reason = "no-forward-route";
  else if (!transitForwarding) reason = "forwarding-disabled";
  else if (draft.mode === "router" && draft.appReturnRoute === "wrong-gateway") reason = "gateway-off-link";
  else if (!returnRoute) reason = "no-return-route";
  else if (!draft.appListenerUp) reason = "listener-missing";
  const sharedReady = validAddresses && distinctAddresses && peerPlacement && linksUp && addressPlan;
  const forwardPath = pathStages("forward", [
    { id: "client-route", label: "client route lookup", ready: sharedReady && clientForwardRoute, reason: reason === "connected" ? "no-forward-route" : reason },
    { id: "client-veth", label: "client veth pair", ready: linksUp && peerPlacement, reason: !linksUp ? "interface-down" : "veth-peer-missing" },
    { id: "transit", label: draft.mode === "bridge" ? "br0 L2 forwarding" : "router IP forwarding", ready: transitForwarding, reason: draft.mode === "bridge" ? "bridge-port-missing" : "forwarding-disabled" },
    { id: "app-veth", label: "app veth pair", ready: linksUp && peerPlacement, reason: !linksUp ? "interface-down" : "veth-peer-missing" },
    { id: "app-listener", label: "app 0.0.0.0:8080", ready: draft.appListenerUp, reason: "listener-missing" },
  ]);
  const returnPath = pathStages("return", [
    { id: "app-return-route", label: "app return route", ready: sharedReady && returnRoute, reason: reason === "connected" ? "no-return-route" : reason },
    { id: "app-veth-return", label: "app veth pair", ready: linksUp && peerPlacement, reason: !linksUp ? "interface-down" : "veth-peer-missing" },
    { id: "transit-return", label: draft.mode === "bridge" ? "br0 L2 forwarding" : "router IP forwarding", ready: transitForwarding, reason: draft.mode === "bridge" ? "bridge-port-missing" : "forwarding-disabled" },
    { id: "client-veth-return", label: "client veth pair", ready: linksUp && peerPlacement, reason: !linksUp ? "interface-down" : "veth-peer-missing" },
    { id: "client-reply", label: "client receives reply", ready: true, reason: "connected" },
  ]);
  return {
    passed: Object.values(checks).every(Boolean),
    mode: draft.mode,
    checks,
    reason,
    forwardPath,
    returnPath,
    machine,
  };
}

export type VethTopologyIncidentId =
  | "dangling-bridge-peer"
  | "duplicate-bridge-address"
  | "forwarding-disabled"
  | "missing-return-route";

export type VethTopologyIncidentRepair =
  | "attach-peer-to-bridge"
  | "move-peer-to-client"
  | "assign-distinct-app-address"
  | "widen-prefix"
  | "enable-router-forwarding"
  | "enable-nat"
  | "add-app-return-route"
  | "add-another-client-route";

export const vethTopologyIncidentFixtures: Readonly<Record<VethTopologyIncidentId, {
  id: VethTopologyIncidentId;
  repairOptions: readonly VethTopologyIncidentRepair[];
}>> = {
  "dangling-bridge-peer": { id: "dangling-bridge-peer", repairOptions: ["attach-peer-to-bridge", "move-peer-to-client"] },
  "duplicate-bridge-address": { id: "duplicate-bridge-address", repairOptions: ["assign-distinct-app-address", "widen-prefix"] },
  "forwarding-disabled": { id: "forwarding-disabled", repairOptions: ["enable-router-forwarding", "enable-nat"] },
  "missing-return-route": { id: "missing-return-route", repairOptions: ["add-app-return-route", "add-another-client-route"] },
};

export type VethTopologyIncidentEvaluation = {
  incidentId: VethTopologyIncidentId;
  repair: VethTopologyIncidentRepair;
  passed: boolean;
  reason: VethTopologyFailureReason;
  evaluation: VethTopologyEvaluation;
};

export function evaluateVethTopologyIncident(
  incidentId: VethTopologyIncidentId,
  repair: VethTopologyIncidentRepair,
): VethTopologyIncidentEvaluation {
  const correctRepair: Record<VethTopologyIncidentId, VethTopologyIncidentRepair> = {
    "dangling-bridge-peer": "attach-peer-to-bridge",
    "duplicate-bridge-address": "assign-distinct-app-address",
    "forwarding-disabled": "enable-router-forwarding",
    "missing-return-route": "add-app-return-route",
  };
  let draft: VethTopologyDraft;
  if (incidentId === "dangling-bridge-peer") {
    draft = { ...vethTopologyPresets["bridge-working"], appPeerTarget: repair === correctRepair[incidentId] ? "bridge" : "host" };
  } else if (incidentId === "duplicate-bridge-address") {
    draft = { ...vethTopologyPresets["bridge-working"], appAddress: repair === correctRepair[incidentId] ? "10.20.0.3/24" : "10.20.0.2/16" };
  } else if (incidentId === "forwarding-disabled") {
    draft = { ...vethTopologyPresets["router-working"], forwarding: repair === correctRepair[incidentId] };
  } else {
    draft = { ...vethTopologyPresets["router-working"], appReturnRoute: repair === correctRepair[incidentId] ? "correct" : "missing" };
  }
  const evaluation = evaluateVethTopology(draft);
  return { incidentId, repair, passed: evaluation.passed, reason: evaluation.reason, evaluation };
}

export function canCompleteVethRoutingChapter(progress: {
  bridgeTopologyComplete: boolean;
  routedTopologyComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return progress.bridgeTopologyComplete
    && progress.routedTopologyComplete
    && progress.incidentsComplete
    && progress.conceptsMastered;
}

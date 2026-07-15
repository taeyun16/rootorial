export const ETHERNET_HEADER_BYTES = 14;
export const IPV4_HEADER_BYTES = 20;
export const TCP_HEADER_BYTES = 20;
export const NETWORK_CLIENT_ISN = 1000;
export const NETWORK_SERVER_ISN = 7000;
export const NETWORK_CLIENT_ADDRESS = "10.0.0.10";
export const NETWORK_CLIENT_MAC = "02:00:00:00:00:10";
export const NETWORK_GATEWAY_ADDRESS = "10.0.0.1";
export const NETWORK_GATEWAY_MAC = "02:00:00:00:00:01";
export const NETWORK_REMOTE_HOSTNAME = "api.example.test";
export const NETWORK_REMOTE_ADDRESS = "203.0.113.20";
export const NETWORK_REMOTE_PORT = 443;
export const NETWORK_EPHEMERAL_PORT = 49152;
export const NETWORK_CLIENT_SOCKET_FD = 4;
export const NETWORK_SERVER_LISTENER_FD = 3;
export const NETWORK_SERVER_ACCEPTED_FD = 5;
export const NETWORK_MTU = 1500;
export const NETWORK_LAB_PAYLOAD_BYTES = 3000;

const MAX_TCP_PAYLOAD_BYTES = 1_000_000;
const MAX_TCP_SEQUENCE = 0xffff_ffff;

export type TcpState = "closed" | "established" | "reset";

export type NetworkInterface = {
  id: string;
  address: string;
  prefixLength: number;
  mac: string;
  mtu: number;
};

export type NetworkRoute = {
  network: string;
  prefixLength: number;
  gateway: string | null;
  interfaceId: string;
  metric: number;
};

export type NetworkNeighbor = {
  interfaceId: string;
  address: string;
  mac: string;
};

export type ResolverRecord = {
  hostname: string;
  address: string;
};

export type TcpListener = {
  address: string;
  port: number;
};

export type TcpListenerRecord = TcpListener & {
  fd: number;
  state: "listen";
};

export type PendingTcpConnectionRecord = {
  listenerFd: number;
  clientFd: number;
  state: "established";
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  kernelBufferedBytes: number;
};

export type AcceptedTcpSocketRecord = {
  fd: number;
  listenerFd: number;
  clientFd: number;
  state: "established";
  localAddress: string;
  localPort: number;
  remoteAddress: string;
  remotePort: number;
  receiveQueueBytes: number;
  applicationReceivedBytes: number;
};

export type TcpByteRange = {
  start: number;
  end: number;
};

export type TcpSocketRecord = {
  fd: number;
  state: TcpState;
  localAddress: string | null;
  localPort: number | null;
  remoteAddress: string | null;
  remotePort: number | null;
  interfaceId: string | null;
  nextHop: string | null;
  nextHopMac: string | null;
  sendUnacknowledged: number;
  sendNext: number;
  receiveNext: number;
  receiverNextExpected: number;
  receiverBufferedRanges: TcpByteRange[];
};

export type TcpSegmentPlan = {
  index: number;
  sequenceStart: number;
  sequenceEnd: number;
  payloadBytes: number;
  ipv4TotalBytes: number;
  ethernetBytesBeforeFcs: number;
};

export type TcpSegmentRecord = TcpSegmentPlan & {
  id: string;
  fd: number;
  acknowledgement: number;
  transmissions: number;
  firstDisposition: "queued" | "delivered" | "dropped";
  delivered: boolean;
  acknowledged: boolean;
};

export type EthernetIpv4TcpFrame = {
  id: string;
  interfaceId: string;
  sourceMac: string;
  destinationMac: string;
  etherType: "ipv4";
  sourceIp: string;
  destinationIp: string;
  ttl: number;
  protocol: "tcp";
  sourcePort: number;
  destinationPort: number;
  sequenceStart: number;
  acknowledgement: number;
  payloadBytes: number;
  ipv4TotalBytes: number;
  ethernetBytesBeforeFcs: number;
  retransmission: boolean;
};

export type NetworkEventKind =
  | "resolved"
  | "socket-created"
  | "route-selected"
  | "arp-request"
  | "arp-reply"
  | "neighbor-cache-hit"
  | "syn-sent"
  | "syn-ack-received"
  | "handshake-ack-sent"
  | "socket-established"
  | "connection-queued-for-accept"
  | "accepted-socket-created"
  | "rst-received"
  | "send-enqueued"
  | "segment-sent"
  | "segment-dropped"
  | "ack-received"
  | "retransmission-timeout"
  | "segment-retransmitted"
  | "application-received";

export type NetworkEvent = {
  order: number;
  kind: NetworkEventKind;
  fd?: number;
  listenerFd?: number;
  clientFd?: number;
  hostname?: string;
  address?: string;
  interfaceId?: string;
  prefixLength?: number;
  nextHop?: string;
  mac?: string;
  segmentIndex?: number;
  sequenceStart?: number;
  acknowledgement?: number;
  payloadBytes?: number;
  duplicateAck?: boolean;
};

export type NetworkMachine = {
  interfaces: NetworkInterface[];
  routes: NetworkRoute[];
  neighbors: NetworkNeighbor[];
  linkDirectory: NetworkNeighbor[];
  resolver: ResolverRecord[];
  listeners: TcpListenerRecord[];
  pendingTcpConnections: PendingTcpConnectionRecord[];
  acceptedSockets: AcceptedTcpSocketRecord[];
  sockets: TcpSocketRecord[];
  segments: TcpSegmentRecord[];
  frames: EthernetIpv4TcpFrame[];
  events: NetworkEvent[];
  nextFd: number;
  nextServerFd: number;
};

export type NetworkingFixtureOptions = {
  neighborCache?: "cold" | "warm";
  listenerPort?: number;
  mtu?: number;
};

export type NetworkTransitionReason =
  | "resolved"
  | "host-not-found"
  | "socket-created"
  | "connected"
  | "connection-accepted"
  | "listener-not-found"
  | "accept-queue-empty"
  | "socket-not-found"
  | "socket-not-closed"
  | "socket-not-established"
  | "no-route"
  | "interface-not-found"
  | "neighbor-unreachable"
  | "connection-refused"
  | "invalid-payload"
  | "send-enqueued"
  | "segment-transmitted"
  | "segment-dropped"
  | "segment-not-found"
  | "segment-already-transmitted"
  | "no-retransmission-pending"
  | "retransmitted"
  | "application-not-ready"
  | "application-received";

export type NetworkTransition = {
  machine: NetworkMachine;
  ok: boolean;
  reason: NetworkTransitionReason;
  fd: number | null;
  address: string | null;
  route: NetworkRoute | null;
  nextHop: string | null;
  segment: TcpSegmentRecord | null;
  acknowledgement: number | null;
};

function assertIntegerInRange(value: number, minimum: number, maximum: number, label: string) {
  if (!Number.isInteger(value) || value < minimum || value > maximum) {
    throw new Error(`${label} must be an integer between ${minimum} and ${maximum}`);
  }
}

export function parseIpv4Address(address: string): number | null {
  const parts = address.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (const part of parts) {
    if (!/^(?:0|[1-9][0-9]{0,2})$/.test(part)) return null;
    const octet = Number(part);
    if (!Number.isInteger(octet) || octet < 0 || octet > 255) return null;
    value = value * 256 + octet;
  }
  return value;
}

function routeMatches(route: NetworkRoute, destination: number): boolean {
  const network = parseIpv4Address(route.network);
  if (network === null || !Number.isInteger(route.prefixLength)
    || route.prefixLength < 0 || route.prefixLength > 32) return false;
  const blockSize = 2 ** (32 - route.prefixLength);
  return Math.floor(network / blockSize) === Math.floor(destination / blockSize);
}

export function selectNetworkRoute(
  routes: readonly NetworkRoute[],
  destinationAddress: string,
): NetworkRoute | null {
  const destination = parseIpv4Address(destinationAddress);
  if (destination === null) return null;
  let selectedRoute: NetworkRoute | null = null;
  let selectedIndex = Number.POSITIVE_INFINITY;
  for (let index = 0; index < routes.length; index += 1) {
    const route = routes[index];
    if (!route) continue;
    if (!routeMatches(route, destination)) continue;
    if (
      selectedRoute === null
      || route.prefixLength > selectedRoute.prefixLength
      || (route.prefixLength === selectedRoute.prefixLength && route.metric < selectedRoute.metric)
      || (
        route.prefixLength === selectedRoute.prefixLength
        && route.metric === selectedRoute.metric
        && index < selectedIndex
      )
    ) {
      selectedRoute = route;
      selectedIndex = index;
    }
  }
  return selectedRoute ? { ...selectedRoute } : null;
}

export function nextHopForRoute(route: NetworkRoute, destinationAddress: string): string {
  return route.gateway ?? destinationAddress;
}

export function calculateTcpMss(
  mtu: number,
  ipv4HeaderBytes = IPV4_HEADER_BYTES,
  tcpHeaderBytes = TCP_HEADER_BYTES,
): number {
  assertIntegerInRange(mtu, 1, 65_535, "MTU");
  assertIntegerInRange(ipv4HeaderBytes, 20, 60, "IPv4 header length");
  assertIntegerInRange(tcpHeaderBytes, 20, 60, "TCP header length");
  const mss = mtu - ipv4HeaderBytes - tcpHeaderBytes;
  if (mss <= 0) throw new Error("MTU must leave room for IPv4 and TCP headers");
  return mss;
}

export function segmentTcpPayload(
  payloadBytes: number,
  mtu: number,
  initialSequence: number,
): TcpSegmentPlan[] {
  assertIntegerInRange(payloadBytes, 0, MAX_TCP_PAYLOAD_BYTES, "TCP payload length");
  assertIntegerInRange(initialSequence, 0, MAX_TCP_SEQUENCE, "Initial TCP sequence");
  if (initialSequence + payloadBytes > MAX_TCP_SEQUENCE) {
    throw new Error("The teaching fixture does not cross the TCP sequence wrap boundary");
  }
  if (payloadBytes === 0) return [];
  const mss = calculateTcpMss(mtu);
  const plans: TcpSegmentPlan[] = [];
  let consumed = 0;
  while (consumed < payloadBytes) {
    const bytes = Math.min(mss, payloadBytes - consumed);
    const ipv4TotalBytes = IPV4_HEADER_BYTES + TCP_HEADER_BYTES + bytes;
    plans.push({
      index: plans.length,
      sequenceStart: initialSequence + consumed,
      sequenceEnd: initialSequence + consumed + bytes,
      payloadBytes: bytes,
      ipv4TotalBytes,
      ethernetBytesBeforeFcs: ETHERNET_HEADER_BYTES + ipv4TotalBytes,
    });
    consumed += bytes;
  }
  return plans;
}

function cloneMachine(machine: NetworkMachine): NetworkMachine {
  return {
    interfaces: machine.interfaces.map((candidate) => ({ ...candidate })),
    routes: machine.routes.map((candidate) => ({ ...candidate })),
    neighbors: machine.neighbors.map((candidate) => ({ ...candidate })),
    linkDirectory: machine.linkDirectory.map((candidate) => ({ ...candidate })),
    resolver: machine.resolver.map((candidate) => ({ ...candidate })),
    listeners: machine.listeners.map((candidate) => ({ ...candidate })),
    pendingTcpConnections: machine.pendingTcpConnections.map((candidate) => ({ ...candidate })),
    acceptedSockets: machine.acceptedSockets.map((candidate) => ({ ...candidate })),
    sockets: machine.sockets.map((candidate) => ({
      ...candidate,
      receiverBufferedRanges: candidate.receiverBufferedRanges.map((range) => ({ ...range })),
    })),
    segments: machine.segments.map((candidate) => ({ ...candidate })),
    frames: machine.frames.map((candidate) => ({ ...candidate })),
    events: machine.events.map((candidate) => ({ ...candidate })),
    nextFd: machine.nextFd,
    nextServerFd: machine.nextServerFd,
  };
}

function appendEvent(machine: NetworkMachine, event: Omit<NetworkEvent, "order">) {
  machine.events.push({ order: machine.events.length + 1, ...event });
}

function transition(
  machine: NetworkMachine,
  ok: boolean,
  reason: NetworkTransitionReason,
  details: Partial<Omit<NetworkTransition, "machine" | "ok" | "reason">> = {},
): NetworkTransition {
  return {
    machine,
    ok,
    reason,
    fd: details.fd ?? null,
    address: details.address ?? null,
    route: details.route ?? null,
    nextHop: details.nextHop ?? null,
    segment: details.segment ?? null,
    acknowledgement: details.acknowledgement ?? null,
  };
}

export function createNetworkingMachine(options: NetworkingFixtureOptions = {}): NetworkMachine {
  const mtu = options.mtu ?? NETWORK_MTU;
  calculateTcpMss(mtu);
  const linkDirectory = [
    { interfaceId: "eth0", address: NETWORK_GATEWAY_ADDRESS, mac: NETWORK_GATEWAY_MAC },
    { interfaceId: "eth0", address: "10.0.0.42", mac: "02:00:00:00:00:42" },
  ];
  return {
    interfaces: [{
      id: "eth0",
      address: NETWORK_CLIENT_ADDRESS,
      prefixLength: 24,
      mac: NETWORK_CLIENT_MAC,
      mtu,
    }],
    routes: [
      { network: "10.0.0.0", prefixLength: 24, gateway: null, interfaceId: "eth0", metric: 100 },
      { network: "0.0.0.0", prefixLength: 0, gateway: NETWORK_GATEWAY_ADDRESS, interfaceId: "eth0", metric: 100 },
    ],
    neighbors: options.neighborCache === "warm" ? linkDirectory.map((entry) => ({ ...entry })) : [],
    linkDirectory,
    resolver: [
      { hostname: NETWORK_REMOTE_HOSTNAME, address: NETWORK_REMOTE_ADDRESS },
      { hostname: "peer.lan.test", address: "10.0.0.42" },
    ],
    listeners: [{
      fd: NETWORK_SERVER_LISTENER_FD,
      state: "listen",
      address: "0.0.0.0",
      port: options.listenerPort ?? NETWORK_REMOTE_PORT,
    }],
    pendingTcpConnections: [],
    acceptedSockets: [],
    sockets: [],
    segments: [],
    frames: [],
    events: [],
    nextFd: NETWORK_CLIENT_SOCKET_FD,
    nextServerFd: NETWORK_SERVER_ACCEPTED_FD,
  };
}

export function resolveNetworkHost(current: NetworkMachine, hostname: string): NetworkTransition {
  const machine = cloneMachine(current);
  const record = machine.resolver.find((candidate) => candidate.hostname === hostname);
  if (!record) return transition(machine, false, "host-not-found");
  appendEvent(machine, { kind: "resolved", hostname, address: record.address });
  return transition(machine, true, "resolved", { address: record.address });
}

export function createTcpSocket(current: NetworkMachine): NetworkTransition {
  const machine = cloneMachine(current);
  const fd = machine.nextFd;
  machine.nextFd += 1;
  machine.sockets.push({
    fd,
    state: "closed",
    localAddress: null,
    localPort: null,
    remoteAddress: null,
    remotePort: null,
    interfaceId: null,
    nextHop: null,
    nextHopMac: null,
    sendUnacknowledged: NETWORK_CLIENT_ISN,
    sendNext: NETWORK_CLIENT_ISN,
    receiveNext: 0,
    receiverNextExpected: NETWORK_CLIENT_ISN + 1,
    receiverBufferedRanges: [],
  });
  appendEvent(machine, { kind: "socket-created", fd });
  return transition(machine, true, "socket-created", { fd });
}

function neighborFor(machine: NetworkMachine, interfaceId: string, address: string) {
  return machine.neighbors.find((candidate) =>
    candidate.interfaceId === interfaceId && candidate.address === address,
  );
}

function resolveNeighborForConnection(
  machine: NetworkMachine,
  interfaceId: string,
  nextHop: string,
  fd: number,
): NetworkNeighbor | null {
  const cached = neighborFor(machine, interfaceId, nextHop);
  if (cached) {
    appendEvent(machine, {
      kind: "neighbor-cache-hit",
      fd,
      interfaceId,
      address: nextHop,
      mac: cached.mac,
    });
    return cached;
  }
  appendEvent(machine, { kind: "arp-request", fd, interfaceId, address: nextHop });
  const peer = machine.linkDirectory.find((candidate) =>
    candidate.interfaceId === interfaceId && candidate.address === nextHop,
  );
  if (!peer) return null;
  const learned = { ...peer };
  machine.neighbors.push(learned);
  appendEvent(machine, {
    kind: "arp-reply",
    fd,
    interfaceId,
    address: nextHop,
    mac: learned.mac,
  });
  return learned;
}

function matchingListener(machine: NetworkMachine, address: string, port: number) {
  return machine.listeners.find((listener) =>
    listener.port === port && (listener.address === address || listener.address === "0.0.0.0"),
  );
}

export function connectTcpSocket(
  current: NetworkMachine,
  fd: number,
  remoteAddress: string,
  remotePort: number,
): NetworkTransition {
  const machine = cloneMachine(current);
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  if (!socket) return transition(machine, false, "socket-not-found", { fd });
  if (socket.state !== "closed") return transition(machine, false, "socket-not-closed", { fd });
  if (parseIpv4Address(remoteAddress) === null) return transition(machine, false, "no-route", { fd });
  if (!Number.isInteger(remotePort) || remotePort < 1 || remotePort > 65_535) {
    return transition(machine, false, "connection-refused", { fd });
  }
  const route = selectNetworkRoute(machine.routes, remoteAddress);
  if (!route) return transition(machine, false, "no-route", { fd });
  const networkInterface = machine.interfaces.find((candidate) => candidate.id === route.interfaceId);
  if (!networkInterface) return transition(machine, false, "interface-not-found", { fd, route });
  const nextHop = nextHopForRoute(route, remoteAddress);
  appendEvent(machine, {
    kind: "route-selected",
    fd,
    interfaceId: route.interfaceId,
    prefixLength: route.prefixLength,
    nextHop,
    address: remoteAddress,
  });
  const neighbor = resolveNeighborForConnection(machine, route.interfaceId, nextHop, fd);
  if (!neighbor) return transition(machine, false, "neighbor-unreachable", { fd, route, nextHop });

  socket.localAddress = networkInterface.address;
  socket.localPort = NETWORK_EPHEMERAL_PORT;
  socket.remoteAddress = remoteAddress;
  socket.remotePort = remotePort;
  socket.interfaceId = route.interfaceId;
  socket.nextHop = nextHop;
  socket.nextHopMac = neighbor.mac;
  socket.sendUnacknowledged = NETWORK_CLIENT_ISN;
  socket.sendNext = NETWORK_CLIENT_ISN + 1;
  socket.receiveNext = 0;
  socket.receiverNextExpected = NETWORK_CLIENT_ISN + 1;
  appendEvent(machine, { kind: "syn-sent", fd, sequenceStart: NETWORK_CLIENT_ISN });

  const listener = matchingListener(machine, remoteAddress, remotePort);
  if (!listener) {
    socket.state = "reset";
    appendEvent(machine, {
      kind: "rst-received",
      fd,
      acknowledgement: NETWORK_CLIENT_ISN + 1,
    });
    return transition(machine, false, "connection-refused", { fd, route, nextHop });
  }

  appendEvent(machine, {
    kind: "syn-ack-received",
    fd,
    sequenceStart: NETWORK_SERVER_ISN,
    acknowledgement: NETWORK_CLIENT_ISN + 1,
  });
  socket.sendUnacknowledged = NETWORK_CLIENT_ISN + 1;
  socket.receiveNext = NETWORK_SERVER_ISN + 1;
  appendEvent(machine, {
    kind: "handshake-ack-sent",
    fd,
    sequenceStart: NETWORK_CLIENT_ISN + 1,
    acknowledgement: NETWORK_SERVER_ISN + 1,
  });
  socket.state = "established";
  appendEvent(machine, { kind: "socket-established", fd });
  machine.pendingTcpConnections.push({
    listenerFd: listener.fd,
    clientFd: fd,
    state: "established",
    localAddress: remoteAddress,
    localPort: remotePort,
    remoteAddress: networkInterface.address,
    remotePort: NETWORK_EPHEMERAL_PORT,
    kernelBufferedBytes: 0,
  });
  appendEvent(machine, {
    kind: "connection-queued-for-accept",
    fd,
    listenerFd: listener.fd,
    address: remoteAddress,
  });
  return transition(machine, true, "connected", { fd, route, nextHop });
}

export function acceptTcpConnection(
  current: NetworkMachine,
  listenerFd: number,
): NetworkTransition {
  const machine = cloneMachine(current);
  const listener = machine.listeners.find((candidate) => candidate.fd === listenerFd);
  if (!listener) return transition(machine, false, "listener-not-found", { fd: listenerFd });
  const pendingIndex = machine.pendingTcpConnections.findIndex((candidate) =>
    candidate.listenerFd === listenerFd,
  );
  if (pendingIndex < 0) return transition(machine, false, "accept-queue-empty", { fd: listenerFd });
  const pending = machine.pendingTcpConnections[pendingIndex];
  if (!pending) return transition(machine, false, "accept-queue-empty", { fd: listenerFd });
  machine.pendingTcpConnections.splice(pendingIndex, 1);
  const acceptedFd = machine.nextServerFd;
  machine.nextServerFd += 1;
  machine.acceptedSockets.push({
    fd: acceptedFd,
    listenerFd,
    clientFd: pending.clientFd,
    state: pending.state,
    localAddress: pending.localAddress,
    localPort: pending.localPort,
    remoteAddress: pending.remoteAddress,
    remotePort: pending.remotePort,
    receiveQueueBytes: pending.kernelBufferedBytes,
    applicationReceivedBytes: 0,
  });
  appendEvent(machine, {
    kind: "accepted-socket-created",
    fd: acceptedFd,
    listenerFd,
    clientFd: pending.clientFd,
    address: pending.localAddress,
  });
  return transition(machine, true, "connection-accepted", { fd: acceptedFd });
}

export function sendTcpPayload(
  current: NetworkMachine,
  fd: number,
  payloadBytes: number,
): NetworkTransition {
  const machine = cloneMachine(current);
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  if (!socket) return transition(machine, false, "socket-not-found", { fd });
  if (socket.state !== "established" || socket.interfaceId === null) {
    return transition(machine, false, "socket-not-established", { fd });
  }
  const networkInterface = machine.interfaces.find((candidate) => candidate.id === socket.interfaceId);
  if (!networkInterface) return transition(machine, false, "interface-not-found", { fd });
  let plans: TcpSegmentPlan[];
  try {
    plans = segmentTcpPayload(payloadBytes, networkInterface.mtu, socket.sendNext);
  } catch {
    return transition(machine, false, "invalid-payload", { fd });
  }
  if (plans.length === 0) return transition(machine, false, "invalid-payload", { fd });
  if (machine.segments.some((segment) => segment.fd === fd && !segment.acknowledged)) {
    return transition(machine, false, "invalid-payload", { fd });
  }
  const created = plans.map((plan): TcpSegmentRecord => ({
    ...plan,
    id: `fd-${fd}-segment-${plan.index}`,
    fd,
    acknowledgement: socket.receiveNext,
    transmissions: 0,
    firstDisposition: "queued",
    delivered: false,
    acknowledged: false,
  }));
  machine.segments.push(...created);
  socket.sendNext += payloadBytes;
  appendEvent(machine, { kind: "send-enqueued", fd, payloadBytes });
  return transition(machine, true, "send-enqueued", { fd, segment: created[0] ?? null });
}

export type TcpReceiveResult = {
  nextExpected: number;
  bufferedRanges: TcpByteRange[];
  duplicateAck: boolean;
};

export function receiveTcpRange(
  nextExpected: number,
  bufferedRanges: readonly TcpByteRange[],
  incoming: TcpByteRange,
): TcpReceiveResult {
  assertIntegerInRange(nextExpected, 0, MAX_TCP_SEQUENCE, "Next expected sequence");
  assertIntegerInRange(incoming.start, 0, MAX_TCP_SEQUENCE, "Range start");
  assertIntegerInRange(incoming.end, 0, MAX_TCP_SEQUENCE, "Range end");
  if (incoming.end <= incoming.start) throw new Error("TCP byte range must be non-empty");
  const before = nextExpected;
  const ranges = bufferedRanges
    .map((range) => ({ ...range }))
    .concat(incoming.end <= nextExpected ? [] : [{ ...incoming }])
    .sort((left, right) => left.start - right.start || left.end - right.end);
  const merged: TcpByteRange[] = [];
  for (const range of ranges) {
    const previous = merged.at(-1);
    if (previous && range.start <= previous.end) previous.end = Math.max(previous.end, range.end);
    else merged.push({ ...range });
  }
  let advanced = nextExpected;
  const remaining: TcpByteRange[] = [];
  for (const range of merged) {
    if (range.end <= advanced) continue;
    if (range.start <= advanced) advanced = Math.max(advanced, range.end);
    else remaining.push({ ...range });
  }
  return {
    nextExpected: advanced,
    bufferedRanges: remaining,
    duplicateAck: advanced === before,
  };
}

function frameForSegment(
  machine: NetworkMachine,
  socket: TcpSocketRecord,
  segment: TcpSegmentRecord,
  retransmission: boolean,
): EthernetIpv4TcpFrame | null {
  if (
    socket.interfaceId === null
    || socket.localAddress === null
    || socket.localPort === null
    || socket.remoteAddress === null
    || socket.remotePort === null
    || socket.nextHopMac === null
  ) return null;
  const networkInterface = machine.interfaces.find((candidate) => candidate.id === socket.interfaceId);
  if (!networkInterface) return null;
  const frame: EthernetIpv4TcpFrame = {
    id: `frame-${machine.frames.length + 1}`,
    interfaceId: socket.interfaceId,
    sourceMac: networkInterface.mac,
    destinationMac: socket.nextHopMac,
    etherType: "ipv4",
    sourceIp: socket.localAddress,
    destinationIp: socket.remoteAddress,
    ttl: 64,
    protocol: "tcp",
    sourcePort: socket.localPort,
    destinationPort: socket.remotePort,
    sequenceStart: segment.sequenceStart,
    acknowledgement: segment.acknowledgement,
    payloadBytes: segment.payloadBytes,
    ipv4TotalBytes: segment.ipv4TotalBytes,
    ethernetBytesBeforeFcs: segment.ethernetBytesBeforeFcs,
    retransmission,
  };
  machine.frames.push(frame);
  return frame;
}

function applyReceiverAck(
  machine: NetworkMachine,
  socket: TcpSocketRecord,
  segment: TcpSegmentRecord,
): number {
  const received = receiveTcpRange(
    socket.receiverNextExpected,
    socket.receiverBufferedRanges,
    { start: segment.sequenceStart, end: segment.sequenceEnd },
  );
  socket.receiverNextExpected = received.nextExpected;
  socket.receiverBufferedRanges = received.bufferedRanges;
  const previousAck = socket.sendUnacknowledged;
  if (received.nextExpected > socket.sendNext) throw new Error("Receiver ACK cannot exceed sent data");
  if (received.nextExpected > socket.sendUnacknowledged) {
    socket.sendUnacknowledged = received.nextExpected;
  }
  for (const candidate of machine.segments) {
    if (candidate.fd === socket.fd && candidate.sequenceEnd <= socket.sendUnacknowledged) {
      candidate.acknowledged = true;
    }
  }
  const accepted = machine.acceptedSockets.find((candidate) => candidate.clientFd === socket.fd);
  const pending = machine.pendingTcpConnections.find((candidate) => candidate.clientFd === socket.fd);
  const serverConnection = accepted ?? pending;
  if (serverConnection) {
    const contiguousReceived = Math.max(
      0,
      socket.receiverNextExpected - (NETWORK_CLIENT_ISN + 1),
    );
    const receiveQueueBytes = Math.max(
      0,
      contiguousReceived - (accepted?.applicationReceivedBytes ?? 0),
    );
    if (accepted) accepted.receiveQueueBytes = receiveQueueBytes;
    else if (pending) pending.kernelBufferedBytes = receiveQueueBytes;
  }
  appendEvent(machine, {
    kind: "ack-received",
    fd: socket.fd,
    acknowledgement: socket.sendUnacknowledged,
    duplicateAck: socket.sendUnacknowledged === previousAck,
  });
  return socket.sendUnacknowledged;
}

export function transmitTcpSegment(
  current: NetworkMachine,
  fd: number,
  segmentIndex: number,
  disposition: "deliver" | "drop",
): NetworkTransition {
  const machine = cloneMachine(current);
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  if (!socket) return transition(machine, false, "socket-not-found", { fd });
  if (socket.state !== "established") {
    return transition(machine, false, "socket-not-established", { fd });
  }
  const segment = machine.segments.find((candidate) =>
    candidate.fd === fd && candidate.index === segmentIndex,
  );
  if (!segment) return transition(machine, false, "segment-not-found", { fd });
  if (segment.transmissions > 0) {
    return transition(machine, false, "segment-already-transmitted", { fd, segment });
  }
  if (!frameForSegment(machine, socket, segment, false)) {
    return transition(machine, false, "interface-not-found", { fd, segment });
  }
  segment.transmissions = 1;
  appendEvent(machine, {
    kind: "segment-sent",
    fd,
    segmentIndex,
    sequenceStart: segment.sequenceStart,
    payloadBytes: segment.payloadBytes,
  });
  if (disposition === "drop") {
    segment.firstDisposition = "dropped";
    appendEvent(machine, {
      kind: "segment-dropped",
      fd,
      segmentIndex,
      sequenceStart: segment.sequenceStart,
      payloadBytes: segment.payloadBytes,
    });
    return transition(machine, true, "segment-dropped", { fd, segment });
  }
  segment.firstDisposition = "delivered";
  segment.delivered = true;
  const acknowledgement = applyReceiverAck(machine, socket, segment);
  return transition(machine, true, "segment-transmitted", {
    fd,
    segment,
    acknowledgement,
  });
}

export function fireTcpRetransmissionTimeout(
  current: NetworkMachine,
  fd: number,
): NetworkTransition {
  const machine = cloneMachine(current);
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  if (!socket) return transition(machine, false, "socket-not-found", { fd });
  if (socket.state !== "established") {
    return transition(machine, false, "socket-not-established", { fd });
  }
  const segment = machine.segments
    .filter((candidate) => candidate.fd === fd
      && !candidate.acknowledged
      && candidate.transmissions > 0
      && candidate.sequenceStart === socket.sendUnacknowledged)
    .sort((left, right) => left.sequenceStart - right.sequenceStart)[0];
  if (!segment) return transition(machine, false, "no-retransmission-pending", { fd });
  appendEvent(machine, {
    kind: "retransmission-timeout",
    fd,
    segmentIndex: segment.index,
    sequenceStart: segment.sequenceStart,
  });
  if (!frameForSegment(machine, socket, segment, true)) {
    return transition(machine, false, "interface-not-found", { fd, segment });
  }
  segment.transmissions += 1;
  segment.delivered = true;
  appendEvent(machine, {
    kind: "segment-retransmitted",
    fd,
    segmentIndex: segment.index,
    sequenceStart: segment.sequenceStart,
    payloadBytes: segment.payloadBytes,
  });
  const acknowledgement = applyReceiverAck(machine, socket, segment);
  return transition(machine, true, "retransmitted", {
    fd,
    segment,
    acknowledgement,
  });
}

export function receiveTcpApplication(
  current: NetworkMachine,
  acceptedFd: number,
  requestedBytes: number,
): NetworkTransition {
  const machine = cloneMachine(current);
  const accepted = machine.acceptedSockets.find((candidate) => candidate.fd === acceptedFd);
  const client = machine.sockets.find((candidate) => candidate.fd === accepted?.clientFd);
  const transportComplete = client?.state === "established"
    && client.sendUnacknowledged === client.sendNext
    && client.receiverBufferedRanges.length === 0;
  if (
    !accepted
    || accepted.state !== "established"
    || !Number.isInteger(requestedBytes)
    || requestedBytes <= 0
    || requestedBytes > accepted.receiveQueueBytes
    || !transportComplete
  ) return transition(machine, false, "application-not-ready", { fd: acceptedFd });
  accepted.receiveQueueBytes -= requestedBytes;
  accepted.applicationReceivedBytes += requestedBytes;
  appendEvent(machine, {
    kind: "application-received",
    fd: acceptedFd,
    payloadBytes: requestedBytes,
  });
  return transition(machine, true, "application-received", { fd: acceptedFd });
}

export type NetworkLabPrediction = {
  socketBoundary?: "process-fd" | "packet-id" | "remote-port";
  connectBoundary?: "handshake-before-success" | "dns-means-connected" | "send-means-delivered";
  sendBoundary?: "queued-not-delivered" | "peer-has-bytes" | "arp-complete";
  resolvedAddress?: string;
  routePrefixLength?: number;
  nextHop?: string;
  arpTarget?: string;
  ethernetDestination?: string;
  ipDestination?: string;
  mss?: number;
  segmentPayloads?: readonly number[];
  segmentSequences?: readonly number[];
  ackAfterFirst?: number;
  ackAfterGap?: number;
  retransmissionTrigger?: "timeout" | "new-sequence" | "dns-retry";
  retransmitSequence?: number;
  finalAck?: number;
};

export type NetworkLabEvidence = {
  socketBoundaryPredicted: boolean;
  routeNeighborPredicted: boolean;
  segmentationPredicted: boolean;
  lossRecoveryPredicted: boolean;
};

export const emptyNetworkLabEvidence: NetworkLabEvidence = Object.freeze({
  socketBoundaryPredicted: false,
  routeNeighborPredicted: false,
  segmentationPredicted: false,
  lossRecoveryPredicted: false,
});

export type NetworkLabPredictionEvaluation = {
  correct: boolean;
  errors: readonly string[];
  evidence: NetworkLabEvidence;
};

function equalNumbers(left: readonly number[] | undefined, right: readonly number[]) {
  return left !== undefined && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

export function evaluateNetworkLabPrediction(
  machine: NetworkMachine,
  prediction: NetworkLabPrediction,
): NetworkLabPredictionEvaluation {
  const errors: string[] = [];
  const route = selectNetworkRoute(machine.routes, NETWORK_REMOTE_ADDRESS);
  const networkInterface = route
    ? machine.interfaces.find((candidate) => candidate.id === route.interfaceId)
    : undefined;
  const nextHop = route ? nextHopForRoute(route, NETWORK_REMOTE_ADDRESS) : null;
  const nextHopMac = route && nextHop
    ? machine.linkDirectory.find((candidate) =>
        candidate.interfaceId === route.interfaceId && candidate.address === nextHop,
      )?.mac ?? null
    : null;
  const plans = networkInterface
    ? segmentTcpPayload(NETWORK_LAB_PAYLOAD_BYTES, networkInterface.mtu, NETWORK_CLIENT_ISN + 1)
    : [];

  if (prediction.socketBoundary !== "process-fd") errors.push("socket-boundary");
  if (prediction.connectBoundary !== "handshake-before-success") errors.push("connect-boundary");
  if (prediction.sendBoundary !== "queued-not-delivered") errors.push("send-boundary");
  if (prediction.resolvedAddress !== NETWORK_REMOTE_ADDRESS) errors.push("resolved-address");
  if (prediction.routePrefixLength !== route?.prefixLength) errors.push("route-prefix");
  if (prediction.nextHop !== nextHop) errors.push("next-hop");
  if (prediction.arpTarget !== nextHop) errors.push("arp-target");
  if (prediction.ethernetDestination !== nextHopMac) errors.push("ethernet-destination");
  if (prediction.ipDestination !== NETWORK_REMOTE_ADDRESS) errors.push("ip-destination");
  if (prediction.mss !== (networkInterface ? calculateTcpMss(networkInterface.mtu) : null)) {
    errors.push("mss");
  }
  if (!equalNumbers(prediction.segmentPayloads, plans.map((plan) => plan.payloadBytes))) {
    errors.push("segment-payloads");
  }
  if (!equalNumbers(prediction.segmentSequences, plans.map((plan) => plan.sequenceStart))) {
    errors.push("segment-sequences");
  }
  if (prediction.ackAfterFirst !== 2461) errors.push("ack-after-first");
  if (prediction.ackAfterGap !== 2461) errors.push("ack-after-gap");
  if (prediction.retransmissionTrigger !== "timeout") errors.push("retransmission-trigger");
  if (prediction.retransmitSequence !== 2461) errors.push("retransmit-sequence");
  if (prediction.finalAck !== 4001) errors.push("final-ack");

  const evidence = {
    socketBoundaryPredicted: !errors.some((error) =>
      ["socket-boundary", "connect-boundary", "send-boundary"].includes(error),
    ),
    routeNeighborPredicted: !errors.some((error) =>
      ["resolved-address", "route-prefix", "next-hop", "arp-target", "ethernet-destination", "ip-destination"].includes(error),
    ),
    segmentationPredicted: !errors.some((error) =>
      ["mss", "segment-payloads", "segment-sequences"].includes(error),
    ),
    lossRecoveryPredicted: !errors.some((error) =>
      ["ack-after-first", "ack-after-gap", "retransmission-trigger", "retransmit-sequence", "final-ack"].includes(error),
    ),
  };
  return { correct: errors.length === 0, errors: Object.freeze(errors), evidence };
}

export function mergeNetworkLabEvidence(
  current: NetworkLabEvidence,
  evaluation: NetworkLabPredictionEvaluation,
): NetworkLabEvidence {
  return {
    socketBoundaryPredicted: current.socketBoundaryPredicted || evaluation.evidence.socketBoundaryPredicted,
    routeNeighborPredicted: current.routeNeighborPredicted || evaluation.evidence.routeNeighborPredicted,
    segmentationPredicted: current.segmentationPredicted || evaluation.evidence.segmentationPredicted,
    lossRecoveryPredicted: current.lossRecoveryPredicted || evaluation.evidence.lossRecoveryPredicted,
  };
}

function hasOrderedLabHistory(
  machine: NetworkMachine,
  fd: number,
  includeApplicationReceive: boolean,
) {
  const events = machine.events;
  let cursor = 0;
  let lastMatchedIndex = -1;
  const advance = (predicate: (event: NetworkEvent) => boolean) => {
    const relativeIndex = events.slice(cursor).findIndex(predicate);
    if (relativeIndex < 0) return false;
    cursor += relativeIndex + 1;
    lastMatchedIndex = cursor - 1;
    return true;
  };
  const handshakeComplete = advance((event) => event.kind === "resolved"
      && event.hostname === NETWORK_REMOTE_HOSTNAME
      && event.address === NETWORK_REMOTE_ADDRESS)
    && advance((event) => event.kind === "socket-created" && event.fd === fd)
    && advance((event) => event.kind === "route-selected"
      && event.fd === fd
      && event.prefixLength === 0
      && event.nextHop === NETWORK_GATEWAY_ADDRESS)
    && advance((event) => event.kind === "arp-request"
      && event.fd === fd
      && event.address === NETWORK_GATEWAY_ADDRESS)
    && advance((event) => event.kind === "arp-reply"
      && event.fd === fd
      && event.address === NETWORK_GATEWAY_ADDRESS
      && event.mac === NETWORK_GATEWAY_MAC)
    && advance((event) => event.kind === "syn-sent"
      && event.fd === fd
      && event.sequenceStart === NETWORK_CLIENT_ISN)
    && advance((event) => event.kind === "syn-ack-received"
      && event.fd === fd
      && event.sequenceStart === NETWORK_SERVER_ISN
      && event.acknowledgement === NETWORK_CLIENT_ISN + 1)
    && advance((event) => event.kind === "socket-established" && event.fd === fd);
  if (!handshakeComplete) return false;
  if (!advance((event) => event.kind === "connection-queued-for-accept"
    && event.fd === fd
    && event.listenerFd === NETWORK_SERVER_LISTENER_FD
    && event.address === NETWORK_REMOTE_ADDRESS)) return false;
  const queuedForAcceptIndex = lastMatchedIndex;
  const transportComplete = advance((event) => event.kind === "send-enqueued"
      && event.fd === fd
      && event.payloadBytes === NETWORK_LAB_PAYLOAD_BYTES)
    && advance((event) => event.kind === "segment-sent"
      && event.fd === fd && event.segmentIndex === 0 && event.sequenceStart === 1001)
    && advance((event) => event.kind === "ack-received"
      && event.fd === fd && event.acknowledgement === 2461 && event.duplicateAck === false)
    && advance((event) => event.kind === "segment-dropped"
      && event.fd === fd && event.segmentIndex === 1 && event.sequenceStart === 2461)
    && advance((event) => event.kind === "segment-sent"
      && event.fd === fd && event.segmentIndex === 2 && event.sequenceStart === 3921)
    && advance((event) => event.kind === "ack-received"
      && event.fd === fd && event.acknowledgement === 2461 && event.duplicateAck === true)
    && advance((event) => event.kind === "retransmission-timeout"
      && event.fd === fd && event.sequenceStart === 2461)
    && advance((event) => event.kind === "segment-retransmitted"
      && event.fd === fd && event.sequenceStart === 2461 && event.payloadBytes === 1460)
    && advance((event) => event.kind === "ack-received"
      && event.fd === fd && event.acknowledgement === 4001 && event.duplicateAck === false);
  if (!transportComplete) return false;
  const finalAckIndex = lastMatchedIndex;
  const acceptedIndex = events.findIndex((event, index) =>
    index > queuedForAcceptIndex
      && event.kind === "accepted-socket-created"
      && event.fd === NETWORK_SERVER_ACCEPTED_FD
      && event.listenerFd === NETWORK_SERVER_LISTENER_FD
      && event.clientFd === fd
      && event.address === NETWORK_REMOTE_ADDRESS,
  );
  if (acceptedIndex < 0) return false;
  if (!includeApplicationReceive) return true;
  return events.findIndex((event, index) =>
    index > Math.max(finalAckIndex, acceptedIndex)
      && event.kind === "application-received"
      && event.fd === NETWORK_SERVER_ACCEPTED_FD
      && event.payloadBytes === NETWORK_LAB_PAYLOAD_BYTES,
  ) >= 0;
}

function hasRecoveredNetworkTransport(
  machine: NetworkMachine,
  evidence: NetworkLabEvidence,
): boolean {
  if (!Object.values(evidence).every(Boolean)) return false;
  const socket = machine.sockets.find((candidate) => candidate.fd === NETWORK_CLIENT_SOCKET_FD);
  if (!socket || socket.state !== "established") return false;
  const listener = machine.listeners.find((candidate) => candidate.fd === NETWORK_SERVER_LISTENER_FD);
  const accepted = machine.acceptedSockets.find((candidate) => candidate.fd === NETWORK_SERVER_ACCEPTED_FD);
  if (
    listener?.state !== "listen"
    || listener.address !== "0.0.0.0"
    || listener.port !== NETWORK_REMOTE_PORT
    || machine.pendingTcpConnections.length !== 0
    || machine.acceptedSockets.length !== 1
    || accepted?.state !== "established"
    || accepted.listenerFd !== listener.fd
    || accepted.clientFd !== socket.fd
    || accepted.localAddress !== NETWORK_REMOTE_ADDRESS
    || accepted.localPort !== NETWORK_REMOTE_PORT
    || accepted.remoteAddress !== NETWORK_CLIENT_ADDRESS
    || accepted.remotePort !== NETWORK_EPHEMERAL_PORT
  ) return false;
  const segments = machine.segments
    .filter((candidate) => candidate.fd === socket.fd)
    .sort((left, right) => left.index - right.index);
  const payloadConserved = segments.reduce((sum, segment) => sum + segment.payloadBytes, 0)
    === NETWORK_LAB_PAYLOAD_BYTES;
  const segmentContract = segments.length === 3
    && segments.every((segment, index) =>
      segment.index === index
      && segment.sequenceStart === [1001, 2461, 3921][index]
      && segment.payloadBytes === [1460, 1460, 80][index]
      && segment.ipv4TotalBytes <= NETWORK_MTU
      && segment.acknowledged,
    )
    && segments[1]?.firstDisposition === "dropped"
    && segments[1]?.transmissions === 2;
  const frameContract = machine.frames.length === 4
    && machine.frames.every((frame) =>
      frame.sourceMac === NETWORK_CLIENT_MAC
      && frame.destinationMac === NETWORK_GATEWAY_MAC
      && frame.sourceIp === NETWORK_CLIENT_ADDRESS
      && frame.destinationIp === NETWORK_REMOTE_ADDRESS
      && frame.destinationPort === NETWORK_REMOTE_PORT
      && frame.ttl === 64
      && frame.ipv4TotalBytes <= NETWORK_MTU,
    );
  return payloadConserved
    && segmentContract
    && frameContract
    && socket.localPort === NETWORK_EPHEMERAL_PORT
    && socket.remoteAddress === NETWORK_REMOTE_ADDRESS
    && socket.remotePort === NETWORK_REMOTE_PORT
    && socket.nextHop === NETWORK_GATEWAY_ADDRESS
    && socket.nextHopMac === NETWORK_GATEWAY_MAC
    && socket.sendUnacknowledged === 4001
    && socket.sendNext === 4001
    && socket.receiverNextExpected === 4001
    && socket.receiverBufferedRanges.length === 0
    && hasOrderedLabHistory(machine, socket.fd, false);
}

export function canReceiveNetworkApplication(
  machine: NetworkMachine,
  evidence: NetworkLabEvidence,
): boolean {
  const accepted = machine.acceptedSockets.find((candidate) => candidate.fd === NETWORK_SERVER_ACCEPTED_FD);
  return hasRecoveredNetworkTransport(machine, evidence)
    && accepted?.receiveQueueBytes === NETWORK_LAB_PAYLOAD_BYTES
    && accepted?.applicationReceivedBytes === 0
    && !machine.events.some((event) => event.kind === "application-received");
}

export function canMasterNetworkLab(
  machine: NetworkMachine,
  evidence: NetworkLabEvidence,
): boolean {
  const accepted = machine.acceptedSockets.find((candidate) => candidate.fd === NETWORK_SERVER_ACCEPTED_FD);
  return hasRecoveredNetworkTransport(machine, evidence)
    && accepted?.receiveQueueBytes === 0
    && accepted?.applicationReceivedBytes === NETWORK_LAB_PAYLOAD_BYTES
    && hasOrderedLabHistory(machine, NETWORK_CLIENT_SOCKET_FD, true);
}

export type Ipv4ForwardingPacket = {
  sourceIp: string;
  destinationIp: string;
  ttl: number;
};

export type Ipv4ForwardingResult = {
  ok: boolean;
  error: "invalid-address" | "no-route" | "interface-not-found" | "neighbor-unreachable" | "ttl-expired" | null;
  route: NetworkRoute | null;
  nextHop: string | null;
  ethernetDestination: string | null;
  ipDestination: string;
  outgoingTtl: number | null;
};

export function forwardIpv4Packet(
  packet: Ipv4ForwardingPacket,
  routes: readonly NetworkRoute[],
  interfaces: readonly NetworkInterface[],
  neighbors: readonly NetworkNeighbor[],
): Ipv4ForwardingResult {
  if (parseIpv4Address(packet.sourceIp) === null || parseIpv4Address(packet.destinationIp) === null) {
    return { ok: false, error: "invalid-address", route: null, nextHop: null, ethernetDestination: null, ipDestination: packet.destinationIp, outgoingTtl: null };
  }
  if (!Number.isInteger(packet.ttl) || packet.ttl <= 1 || packet.ttl > 255) {
    return { ok: false, error: "ttl-expired", route: null, nextHop: null, ethernetDestination: null, ipDestination: packet.destinationIp, outgoingTtl: null };
  }
  const route = selectNetworkRoute(routes, packet.destinationIp);
  if (!route) return { ok: false, error: "no-route", route: null, nextHop: null, ethernetDestination: null, ipDestination: packet.destinationIp, outgoingTtl: null };
  if (!interfaces.some((candidate) => candidate.id === route.interfaceId)) {
    return { ok: false, error: "interface-not-found", route, nextHop: null, ethernetDestination: null, ipDestination: packet.destinationIp, outgoingTtl: null };
  }
  const nextHop = nextHopForRoute(route, packet.destinationIp);
  const neighbor = neighbors.find((candidate) =>
    candidate.interfaceId === route.interfaceId && candidate.address === nextHop,
  );
  if (!neighbor) return { ok: false, error: "neighbor-unreachable", route, nextHop, ethernetDestination: null, ipDestination: packet.destinationIp, outgoingTtl: null };
  return {
    ok: true,
    error: null,
    route,
    nextHop,
    ethernetDestination: neighbor.mac,
    ipDestination: packet.destinationIp,
    outgoingTtl: packet.ttl - 1,
  };
}

export type TcpDemultiplexResult = {
  networkDelivered: boolean;
  listenerMatched: boolean;
  response: "syn-ack" | "rst" | "none";
  applicationDelivered: boolean;
};

export function demultiplexTcpSyn(
  networkDelivered: boolean,
  destinationAddress: string,
  destinationPort: number,
  listeners: readonly TcpListener[],
): TcpDemultiplexResult {
  if (!networkDelivered) {
    return { networkDelivered: false, listenerMatched: false, response: "none", applicationDelivered: false };
  }
  const listenerMatched = listeners.some((listener) =>
    listener.port === destinationPort
      && (listener.address === destinationAddress || listener.address === "0.0.0.0"),
  );
  return {
    networkDelivered: true,
    listenerMatched,
    response: listenerMatched ? "syn-ack" : "rst",
    applicationDelivered: false,
  };
}

const longestPrefixRoutes: NetworkRoute[] = [
  { network: "0.0.0.0", prefixLength: 0, gateway: "10.0.0.1", interfaceId: "eth0", metric: 100 },
  { network: "203.0.113.0", prefixLength: 24, gateway: "10.0.0.254", interfaceId: "eth0", metric: 50 },
  { network: "203.0.113.0", prefixLength: 25, gateway: "10.0.0.253", interfaceId: "eth0", metric: 200 },
  { network: "203.0.113.0", prefixLength: 25, gateway: "10.0.0.252", interfaceId: "eth0", metric: 100 },
];

const forwardingInterfaces: NetworkInterface[] = [
  { id: "wan0", address: "192.0.2.2", prefixLength: 24, mac: "02:00:00:00:00:22", mtu: 1500 },
];

const forwardingRoutes: NetworkRoute[] = [
  { network: "203.0.113.0", prefixLength: 24, gateway: "192.0.2.1", interfaceId: "wan0", metric: 10 },
];

const forwardingNeighbors: NetworkNeighbor[] = [
  { interfaceId: "wan0", address: "192.0.2.1", mac: "02:00:00:00:00:21" },
];

export const networkIncidentIds = Object.freeze([
  "longest-prefix",
  "next-hop-frame",
  "ack-gap",
  "listener-delivery",
] as const);

export type NetworkIncidentId = typeof networkIncidentIds[number];

export const networkIncidentFixtures = Object.freeze({
  "longest-prefix": Object.freeze({
    destination: "203.0.113.20",
    routes: Object.freeze(longestPrefixRoutes.map((route) => Object.freeze({ ...route }))),
  }),
  "next-hop-frame": Object.freeze({
    packet: Object.freeze({ sourceIp: "10.0.0.10", destinationIp: "203.0.113.20", ttl: 3 }),
    routes: Object.freeze(forwardingRoutes.map((route) => Object.freeze({ ...route }))),
    interfaces: Object.freeze(forwardingInterfaces.map((candidate) => Object.freeze({ ...candidate }))),
    neighbors: Object.freeze(forwardingNeighbors.map((candidate) => Object.freeze({ ...candidate }))),
  }),
  "ack-gap": Object.freeze({
    initialNextExpected: 5001,
    first: Object.freeze({ start: 5001, end: 5601 }),
    outOfOrder: Object.freeze({ start: 6201, end: 6501 }),
    missing: Object.freeze({ start: 5601, end: 6201 }),
  }),
  "listener-delivery": Object.freeze({
    networkDelivered: true,
    destinationAddress: "203.0.113.20",
    destinationPort: 8443,
    listeners: Object.freeze([Object.freeze({ address: "0.0.0.0", port: 443 })]),
  }),
});

export type NetworkIncidentSubmission = {
  routePrefixLength?: number;
  routeGateway?: string;
  routeInterfaceId?: string;
  nextHop?: string;
  ethernetDestination?: string;
  ipDestination?: string;
  outgoingTtl?: number;
  ackAfterGap?: number;
  retransmitSequence?: number;
  retransmitBytes?: number;
  finalAck?: number;
  networkDelivered?: boolean;
  listenerMatched?: boolean;
  listenerResponse?: "syn-ack" | "rst" | "none";
  applicationDelivered?: boolean;
};

export type NetworkIncidentEvaluation = {
  correct: boolean;
  errors: readonly string[];
};

export function evaluateNetworkIncident(
  id: NetworkIncidentId,
  submission: NetworkIncidentSubmission,
): NetworkIncidentEvaluation {
  const errors: string[] = [];
  if (id === "longest-prefix") {
    const fixture = networkIncidentFixtures[id];
    const route = selectNetworkRoute(fixture.routes, fixture.destination);
    if (submission.routePrefixLength !== route?.prefixLength) errors.push("route-prefix");
    if (submission.routeGateway !== route?.gateway) errors.push("route-gateway");
    if (submission.routeInterfaceId !== route?.interfaceId) errors.push("route-interface");
  } else if (id === "next-hop-frame") {
    const fixture = networkIncidentFixtures[id];
    const result = forwardIpv4Packet(
      fixture.packet,
      fixture.routes,
      fixture.interfaces,
      fixture.neighbors,
    );
    if (submission.nextHop !== result.nextHop) errors.push("next-hop");
    if (submission.ethernetDestination !== result.ethernetDestination) errors.push("ethernet-destination");
    if (submission.ipDestination !== result.ipDestination) errors.push("ip-destination");
    if (submission.outgoingTtl !== result.outgoingTtl) errors.push("outgoing-ttl");
  } else if (id === "ack-gap") {
    const fixture = networkIncidentFixtures[id];
    const afterFirst = receiveTcpRange(fixture.initialNextExpected, [], fixture.first);
    const afterOutOfOrder = receiveTcpRange(
      afterFirst.nextExpected,
      afterFirst.bufferedRanges,
      fixture.outOfOrder,
    );
    const afterRepair = receiveTcpRange(
      afterOutOfOrder.nextExpected,
      afterOutOfOrder.bufferedRanges,
      fixture.missing,
    );
    if (submission.ackAfterGap !== afterOutOfOrder.nextExpected) errors.push("ack-after-gap");
    if (submission.retransmitSequence !== fixture.missing.start) errors.push("retransmit-sequence");
    if (submission.retransmitBytes !== fixture.missing.end - fixture.missing.start) errors.push("retransmit-bytes");
    if (submission.finalAck !== afterRepair.nextExpected) errors.push("final-ack");
  } else {
    const fixture = networkIncidentFixtures[id];
    const result = demultiplexTcpSyn(
      fixture.networkDelivered,
      fixture.destinationAddress,
      fixture.destinationPort,
      fixture.listeners,
    );
    if (submission.networkDelivered !== result.networkDelivered) errors.push("network-delivered");
    if (submission.listenerMatched !== result.listenerMatched) errors.push("listener-matched");
    if (submission.listenerResponse !== result.response) errors.push("listener-response");
    if (submission.applicationDelivered !== result.applicationDelivered) errors.push("application-delivery");
  }
  return { correct: errors.length === 0, errors: Object.freeze(errors) };
}

export function canCompleteNetworkingChapter({
  packetLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  packetLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return packetLabComplete && incidentsComplete && conceptsMastered;
}

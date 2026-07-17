import {
  NETWORK_CLIENT_ISN,
  NETWORK_CLIENT_SOCKET_FD,
  NETWORK_SERVER_LISTENER_FD,
  type NetworkEvent,
  type NetworkMachine,
  type TcpSegmentRecord,
} from "./networking-from-a-packet.ts";

export type NetworkPacketVisualPhase =
  | "idle"
  | "resolved"
  | "socket-created"
  | "connected"
  | "accept-queued"
  | "accepted"
  | "queued"
  | "transmitting"
  | "gap"
  | "recovered"
  | "received"
  | "reset";

export type NetworkPacketVisualSegmentStatus =
  | "queued"
  | "sent"
  | "buffered"
  | "dropped"
  | "acknowledged"
  | "recovered";

export type NetworkPacketVisualSegment = {
  index: number;
  sequenceStart: number;
  sequenceEnd: number;
  payloadBytes: number;
  transmissions: number;
  firstDisposition: TcpSegmentRecord["firstDisposition"];
  acknowledged: boolean;
  status: NetworkPacketVisualSegmentStatus;
};

export type NetworkPacketVisualState = {
  phase: NetworkPacketVisualPhase;
  client: {
    fd: number | null;
    state: "missing" | "closed" | "established" | "reset";
    localAddress: string | null;
    localPort: number | null;
    remoteAddress: string | null;
    remotePort: number | null;
  };
  route: {
    selected: boolean;
    interfaceId: string | null;
    prefixLength: number | null;
    nextHop: string | null;
    nextHopMac: string | null;
    resolution: "none" | "arp" | "cache-hit";
  };
  server: {
    listenerFd: number | null;
    listenerState: "missing" | "listen";
    acceptQueueDepth: number;
    acceptedFd: number | null;
    receiveQueueBytes: number;
    applicationReceivedBytes: number;
  };
  transport: {
    sendUnacknowledged: number;
    sendNext: number;
    receiverNextExpected: number;
    receiverBufferedRanges: Array<{ start: number; end: number }>;
    acknowledgements: Array<{ order: number; value: number; duplicate: boolean }>;
    latestAcknowledgement: number | null;
    timeoutSequence: number | null;
  };
  segments: NetworkPacketVisualSegment[];
  frame: null | {
    destinationMac: string;
    sourceIp: string;
    destinationIp: string;
    sourcePort: number;
    destinationPort: number;
    sequenceStart: number;
    payloadBytes: number;
    ttl: number;
    retransmission: boolean;
  };
};

function latestEvent(machine: NetworkMachine, predicate: (event: NetworkEvent) => boolean) {
  return [...machine.events].sort((left, right) => right.order - left.order).find(predicate);
}

function segmentStatus(segment: TcpSegmentRecord): NetworkPacketVisualSegmentStatus {
  if (segment.transmissions === 0) return "queued";
  if (
    segment.firstDisposition === "dropped"
    && segment.transmissions === 1
    && !segment.acknowledged
  ) return "dropped";
  if (
    segment.firstDisposition === "dropped"
    && segment.transmissions > 1
    && segment.acknowledged
  ) return "recovered";
  if (segment.acknowledged) return "acknowledged";
  if (segment.delivered) return "buffered";
  return "sent";
}

export function buildNetworkPacketVisualState(machine: NetworkMachine): NetworkPacketVisualState {
  const client = machine.sockets.find((candidate) => candidate.fd === NETWORK_CLIENT_SOCKET_FD)
    ?? machine.sockets[0]
    ?? null;
  const listener = machine.listeners.find((candidate) => candidate.fd === NETWORK_SERVER_LISTENER_FD)
    ?? machine.listeners[0]
    ?? null;
  const pending = machine.pendingTcpConnections.find((candidate) =>
    candidate.listenerFd === listener?.fd,
  ) ?? machine.pendingTcpConnections[0] ?? null;
  const accepted = machine.acceptedSockets.find((candidate) =>
    candidate.listenerFd === listener?.fd,
  ) ?? machine.acceptedSockets[0] ?? null;
  const routeEvent = latestEvent(machine, (event) => event.kind === "route-selected");
  const neighborEvent = latestEvent(
    machine,
    (event) => event.kind === "arp-reply" || event.kind === "neighbor-cache-hit",
  );
  const acknowledgements = machine.events
    .filter((event) => event.kind === "ack-received" && event.acknowledgement !== undefined)
    .sort((left, right) => left.order - right.order)
    .map((event) => ({
      order: event.order,
      value: event.acknowledgement as number,
      duplicate: event.duplicateAck === true,
    }));
  const timeout = latestEvent(machine, (event) => event.kind === "retransmission-timeout");
  const segments = machine.segments
    .slice()
    .sort((left, right) => left.index - right.index)
    .map((segment): NetworkPacketVisualSegment => ({
      index: segment.index,
      sequenceStart: segment.sequenceStart,
      sequenceEnd: segment.sequenceEnd,
      payloadBytes: segment.payloadBytes,
      transmissions: segment.transmissions,
      firstDisposition: segment.firstDisposition,
      acknowledged: segment.acknowledged,
      status: segmentStatus(segment),
    }));
  const receiveQueueBytes = accepted?.receiveQueueBytes ?? pending?.kernelBufferedBytes ?? 0;
  const applicationReceivedBytes = accepted?.applicationReceivedBytes ?? 0;

  let phase: NetworkPacketVisualPhase = "idle";
  if (machine.events.some((event) => event.kind === "resolved")) phase = "resolved";
  if (client) phase = client.state === "reset" ? "reset" : "socket-created";
  if (client?.state === "established") phase = "connected";
  if (pending) phase = "accept-queued";
  if (accepted) phase = "accepted";
  if (segments.length > 0) phase = "queued";
  if (segments.some((segment) => segment.transmissions > 0)) phase = "transmitting";
  if (
    segments.some((segment) => segment.status === "dropped")
    || (client?.receiverBufferedRanges.length ?? 0) > 0
  ) phase = "gap";
  if (segments.length > 0 && segments.every((segment) => segment.acknowledged)) {
    phase = "recovered";
  }
  if (applicationReceivedBytes > 0) phase = "received";

  const frame = machine.frames.at(-1);

  return {
    phase,
    client: {
      fd: client?.fd ?? null,
      state: client?.state ?? "missing",
      localAddress: client?.localAddress ?? null,
      localPort: client?.localPort ?? null,
      remoteAddress: client?.remoteAddress ?? null,
      remotePort: client?.remotePort ?? null,
    },
    route: {
      selected: routeEvent !== undefined,
      interfaceId: routeEvent?.interfaceId ?? client?.interfaceId ?? null,
      prefixLength: routeEvent?.prefixLength ?? null,
      nextHop: routeEvent?.nextHop ?? client?.nextHop ?? null,
      nextHopMac: client?.nextHopMac ?? neighborEvent?.mac ?? null,
      resolution: neighborEvent?.kind === "neighbor-cache-hit"
        ? "cache-hit"
        : neighborEvent?.kind === "arp-reply"
          ? "arp"
          : "none",
    },
    server: {
      listenerFd: listener?.fd ?? null,
      listenerState: listener?.state ?? "missing",
      acceptQueueDepth: machine.pendingTcpConnections.length,
      acceptedFd: accepted?.fd ?? null,
      receiveQueueBytes,
      applicationReceivedBytes,
    },
    transport: {
      sendUnacknowledged: client?.sendUnacknowledged ?? NETWORK_CLIENT_ISN,
      sendNext: client?.sendNext ?? NETWORK_CLIENT_ISN,
      receiverNextExpected: client?.receiverNextExpected ?? NETWORK_CLIENT_ISN + 1,
      receiverBufferedRanges: client?.receiverBufferedRanges.map((range) => ({ ...range })) ?? [],
      acknowledgements,
      latestAcknowledgement: acknowledgements.at(-1)?.value ?? null,
      timeoutSequence: timeout?.sequenceStart ?? null,
    },
    segments,
    frame: frame ? {
      destinationMac: frame.destinationMac,
      sourceIp: frame.sourceIp,
      destinationIp: frame.destinationIp,
      sourcePort: frame.sourcePort,
      destinationPort: frame.destinationPort,
      sequenceStart: frame.sequenceStart,
      payloadBytes: frame.payloadBytes,
      ttl: frame.ttl,
      retransmission: frame.retransmission,
    } : null,
  };
}

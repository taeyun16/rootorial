import assert from "node:assert/strict";
import test from "node:test";
import {
  ETHERNET_HEADER_BYTES,
  IPV4_HEADER_BYTES,
  NETWORK_CLIENT_ADDRESS,
  NETWORK_CLIENT_ISN,
  NETWORK_CLIENT_MAC,
  NETWORK_EPHEMERAL_PORT,
  NETWORK_GATEWAY_ADDRESS,
  NETWORK_GATEWAY_MAC,
  NETWORK_LAB_PAYLOAD_BYTES,
  NETWORK_MTU,
  NETWORK_REMOTE_ADDRESS,
  NETWORK_REMOTE_HOSTNAME,
  NETWORK_REMOTE_PORT,
  NETWORK_SERVER_ACCEPTED_FD,
  NETWORK_SERVER_ISN,
  NETWORK_SERVER_LISTENER_FD,
  TCP_HEADER_BYTES,
  acceptTcpConnection,
  calculateTcpMss,
  canCompleteNetworkingChapter,
  canMasterNetworkLab,
  canReceiveNetworkApplication,
  connectTcpSocket,
  createNetworkingMachine,
  createTcpSocket,
  demultiplexTcpSyn,
  emptyNetworkLabEvidence,
  evaluateNetworkIncident,
  evaluateNetworkLabPrediction,
  fireTcpRetransmissionTimeout,
  forwardIpv4Packet,
  mergeNetworkLabEvidence,
  networkIncidentFixtures,
  networkIncidentIds,
  nextHopForRoute,
  parseIpv4Address,
  receiveTcpApplication,
  receiveTcpRange,
  resolveNetworkHost,
  segmentTcpPayload,
  selectNetworkRoute,
  sendTcpPayload,
  transmitTcpSegment,
} from "../src/features/linux-runtime/networking-from-a-packet.ts";
import { buildNetworkPacketVisualState } from "../src/features/linux-runtime/network-packet-visual.ts";

const correctPrediction = {
  socketBoundary: "process-fd",
  connectBoundary: "handshake-before-success",
  sendBoundary: "queued-not-delivered",
  resolvedAddress: NETWORK_REMOTE_ADDRESS,
  routePrefixLength: 0,
  nextHop: NETWORK_GATEWAY_ADDRESS,
  arpTarget: NETWORK_GATEWAY_ADDRESS,
  ethernetDestination: NETWORK_GATEWAY_MAC,
  ipDestination: NETWORK_REMOTE_ADDRESS,
  mss: 1460,
  segmentPayloads: [1460, 1460, 80],
  segmentSequences: [1001, 2461, 3921],
  ackAfterFirst: 2461,
  ackAfterGap: 2461,
  retransmissionTrigger: "timeout",
  retransmitSequence: 2461,
  finalAck: 4001,
};

function prepareHandshakeMachine() {
  let machine = createNetworkingMachine();
  const resolved = resolveNetworkHost(machine, NETWORK_REMOTE_HOSTNAME);
  assert.equal(resolved.ok, true);
  assert.equal(resolved.address, NETWORK_REMOTE_ADDRESS);
  machine = resolved.machine;

  const created = createTcpSocket(machine);
  assert.equal(created.ok, true);
  assert.equal(created.fd, 4);
  machine = created.machine;

  const connected = connectTcpSocket(machine, created.fd, NETWORK_REMOTE_ADDRESS, NETWORK_REMOTE_PORT);
  assert.equal(connected.ok, true);
  assert.equal(connected.reason, "connected");
  return { machine: connected.machine, fd: created.fd };
}

function prepareAcceptedMachine() {
  const connected = prepareHandshakeMachine();
  const accepted = acceptTcpConnection(connected.machine, NETWORK_SERVER_LISTENER_FD);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.reason, "connection-accepted");
  assert.equal(accepted.fd, NETWORK_SERVER_ACCEPTED_FD);
  return { machine: accepted.machine, fd: connected.fd };
}

function recoverNetworkTransport() {
  let { machine, fd } = prepareAcceptedMachine();
  const sent = sendTcpPayload(machine, fd, NETWORK_LAB_PAYLOAD_BYTES);
  assert.equal(sent.ok, true);
  machine = sent.machine;

  const first = transmitTcpSegment(machine, fd, 0, "deliver");
  assert.equal(first.acknowledgement, 2461);
  machine = first.machine;
  assert.equal(machine.acceptedSockets[0].receiveQueueBytes, 1460);

  const dropped = transmitTcpSegment(machine, fd, 1, "drop");
  assert.equal(dropped.reason, "segment-dropped");
  machine = dropped.machine;
  assert.equal(machine.acceptedSockets[0].receiveQueueBytes, 1460);

  const third = transmitTcpSegment(machine, fd, 2, "deliver");
  assert.equal(third.acknowledgement, 2461);
  machine = third.machine;
  assert.equal(machine.acceptedSockets[0].receiveQueueBytes, 1460);

  const recovered = fireTcpRetransmissionTimeout(machine, fd);
  assert.equal(recovered.reason, "retransmitted");
  assert.equal(recovered.acknowledgement, 4001);
  assert.equal(recovered.machine.acceptedSockets[0].receiveQueueBytes, NETWORK_LAB_PAYLOAD_BYTES);
  return { machine: recovered.machine, fd };
}

function completeNetworkLab() {
  const recovered = recoverNetworkTransport();
  const received = receiveTcpApplication(
    recovered.machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES,
  );
  assert.equal(received.ok, true);
  assert.equal(received.reason, "application-received");
  return { machine: received.machine, fd: recovered.fd };
}

test("projects the packet path, ACK gap, retransmission, and recv without separate UI state", () => {
  const initialMachine = createNetworkingMachine();
  const initial = buildNetworkPacketVisualState(initialMachine);
  assert.equal(initial.phase, "idle");
  assert.deepEqual(initial.client, {
    fd: null,
    state: "missing",
    localAddress: null,
    localPort: null,
    remoteAddress: null,
    remotePort: null,
  });
  assert.equal(initial.server.listenerFd, NETWORK_SERVER_LISTENER_FD);
  assert.equal(initial.server.listenerState, "listen");
  assert.deepEqual(initial.segments, []);

  let { machine, fd } = prepareHandshakeMachine();
  let visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "accept-queued");
  assert.deepEqual(visual.route, {
    selected: true,
    interfaceId: "eth0",
    prefixLength: 0,
    nextHop: NETWORK_GATEWAY_ADDRESS,
    nextHopMac: NETWORK_GATEWAY_MAC,
    resolution: "arp",
  });
  assert.equal(visual.client.remoteAddress, NETWORK_REMOTE_ADDRESS);
  assert.equal(visual.server.acceptQueueDepth, 1);

  machine = acceptTcpConnection(machine, NETWORK_SERVER_LISTENER_FD).machine;
  assert.equal(buildNetworkPacketVisualState(machine).phase, "accepted");
  machine = sendTcpPayload(machine, fd, NETWORK_LAB_PAYLOAD_BYTES).machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "queued");
  assert.deepEqual(visual.segments.map(({ sequenceStart, sequenceEnd, payloadBytes, status }) => ({
    sequenceStart,
    sequenceEnd,
    payloadBytes,
    status,
  })), [
    { sequenceStart: 1001, sequenceEnd: 2461, payloadBytes: 1460, status: "queued" },
    { sequenceStart: 2461, sequenceEnd: 3921, payloadBytes: 1460, status: "queued" },
    { sequenceStart: 3921, sequenceEnd: 4001, payloadBytes: 80, status: "queued" },
  ]);

  machine = transmitTcpSegment(machine, fd, 0, "deliver").machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "transmitting");
  assert.equal(visual.transport.latestAcknowledgement, 2461);
  assert.equal(visual.server.receiveQueueBytes, 1460);
  assert.deepEqual(visual.segments.map((segment) => segment.status), [
    "acknowledged",
    "queued",
    "queued",
  ]);

  machine = transmitTcpSegment(machine, fd, 1, "drop").machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "gap");
  assert.equal(visual.segments[1].status, "dropped");
  assert.equal(visual.transport.latestAcknowledgement, 2461);

  machine = transmitTcpSegment(machine, fd, 2, "deliver").machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "gap");
  assert.equal(visual.segments[2].status, "buffered");
  assert.deepEqual(visual.transport.receiverBufferedRanges, [{ start: 3921, end: 4001 }]);
  assert.deepEqual(visual.transport.acknowledgements.map(({ value, duplicate }) => ({
    value,
    duplicate,
  })), [
    { value: 2461, duplicate: false },
    { value: 2461, duplicate: true },
  ]);

  machine = fireTcpRetransmissionTimeout(machine, fd).machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "recovered");
  assert.equal(visual.transport.timeoutSequence, 2461);
  assert.equal(visual.transport.latestAcknowledgement, 4001);
  assert.deepEqual(visual.transport.receiverBufferedRanges, []);
  assert.equal(visual.server.receiveQueueBytes, NETWORK_LAB_PAYLOAD_BYTES);
  assert.deepEqual(visual.segments.map(({ status, transmissions }) => ({ status, transmissions })), [
    { status: "acknowledged", transmissions: 1 },
    { status: "recovered", transmissions: 2 },
    { status: "acknowledged", transmissions: 1 },
  ]);

  machine = receiveTcpApplication(
    machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES,
  ).machine;
  visual = buildNetworkPacketVisualState(machine);
  assert.equal(visual.phase, "received");
  assert.equal(visual.server.receiveQueueBytes, 0);
  assert.equal(visual.server.applicationReceivedBytes, NETWORK_LAB_PAYLOAD_BYTES);
  assert.deepEqual(buildNetworkPacketVisualState(createNetworkingMachine()), initial);
});

test("parses IPv4 addresses strictly and selects longest prefix, then metric, then route order", () => {
  assert.equal(parseIpv4Address("0.0.0.0"), 0);
  assert.equal(parseIpv4Address("255.255.255.255"), 0xffff_ffff);
  assert.equal(parseIpv4Address("203.0.113.20"), 0xcb007114);
  for (const invalid of ["203.0.113", "203.0.113.256", "203.0.113.-1", "203.0.113.020", "host"] ) {
    assert.equal(parseIpv4Address(invalid), null);
  }

  const fixture = networkIncidentFixtures["longest-prefix"];
  const selected = selectNetworkRoute(fixture.routes, fixture.destination);
  assert.deepEqual(selected, {
    network: "203.0.113.0",
    prefixLength: 25,
    gateway: "10.0.0.252",
    interfaceId: "eth0",
    metric: 100,
  });
  assert.equal(nextHopForRoute(selected, fixture.destination), "10.0.0.252");

  const tie = [
    { network: "0.0.0.0", prefixLength: 0, gateway: "10.0.0.1", interfaceId: "eth0", metric: 10 },
    { network: "0.0.0.0", prefixLength: 0, gateway: "10.0.0.2", interfaceId: "eth0", metric: 10 },
  ];
  assert.equal(selectNetworkRoute(tie, "198.51.100.1").gateway, "10.0.0.1");
  assert.equal(selectNetworkRoute([], "198.51.100.1"), null);
  assert.equal(selectNetworkRoute(tie, "invalid"), null);
});

test("segments application bytes by the IP MTU while conserving payload and TCP sequence space", () => {
  assert.equal(ETHERNET_HEADER_BYTES, 14);
  assert.equal(IPV4_HEADER_BYTES, 20);
  assert.equal(TCP_HEADER_BYTES, 20);
  assert.equal(calculateTcpMss(NETWORK_MTU), 1460);
  const segments = segmentTcpPayload(NETWORK_LAB_PAYLOAD_BYTES, NETWORK_MTU, NETWORK_CLIENT_ISN + 1);
  assert.deepEqual(segments.map(({ sequenceStart, sequenceEnd, payloadBytes, ipv4TotalBytes, ethernetBytesBeforeFcs }) => ({
    sequenceStart,
    sequenceEnd,
    payloadBytes,
    ipv4TotalBytes,
    ethernetBytesBeforeFcs,
  })), [
    { sequenceStart: 1001, sequenceEnd: 2461, payloadBytes: 1460, ipv4TotalBytes: 1500, ethernetBytesBeforeFcs: 1514 },
    { sequenceStart: 2461, sequenceEnd: 3921, payloadBytes: 1460, ipv4TotalBytes: 1500, ethernetBytesBeforeFcs: 1514 },
    { sequenceStart: 3921, sequenceEnd: 4001, payloadBytes: 80, ipv4TotalBytes: 120, ethernetBytesBeforeFcs: 134 },
  ]);
  assert.equal(segments.reduce((sum, segment) => sum + segment.payloadBytes, 0), NETWORK_LAB_PAYLOAD_BYTES);
  assert.deepEqual(segmentTcpPayload(0, NETWORK_MTU, 1001), []);
  assert.throws(() => calculateTcpMss(40), /leave room/);
  assert.throws(() => segmentTcpPayload(-1, NETWORK_MTU, 1001), /payload length/);
  assert.throws(() => segmentTcpPayload(10, NETWORK_MTU, 0xffff_fffa), /wrap boundary/);
});

test("keeps handshake completion, the listener accept queue, and accept(2) fd creation distinct", () => {
  const initial = createNetworkingMachine();
  const snapshot = structuredClone(initial);
  const missing = resolveNetworkHost(initial, "missing.example.test");
  assert.equal(missing.ok, false);
  assert.equal(missing.reason, "host-not-found");
  assert.deepEqual(initial, snapshot);

  const { machine, fd } = prepareHandshakeMachine();
  assert.equal(fd, 4);
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  assert.deepEqual(socket, {
    fd: 4,
    state: "established",
    localAddress: NETWORK_CLIENT_ADDRESS,
    localPort: NETWORK_EPHEMERAL_PORT,
    remoteAddress: NETWORK_REMOTE_ADDRESS,
    remotePort: NETWORK_REMOTE_PORT,
    interfaceId: "eth0",
    nextHop: NETWORK_GATEWAY_ADDRESS,
    nextHopMac: NETWORK_GATEWAY_MAC,
    sendUnacknowledged: NETWORK_CLIENT_ISN + 1,
    sendNext: NETWORK_CLIENT_ISN + 1,
    receiveNext: NETWORK_SERVER_ISN + 1,
    receiverNextExpected: NETWORK_CLIENT_ISN + 1,
    receiverBufferedRanges: [],
  });
  assert.deepEqual(machine.listeners, [{
    fd: NETWORK_SERVER_LISTENER_FD,
    state: "listen",
    address: "0.0.0.0",
    port: NETWORK_REMOTE_PORT,
  }]);
  assert.deepEqual(machine.pendingTcpConnections, [{
    listenerFd: NETWORK_SERVER_LISTENER_FD,
    clientFd: fd,
    state: "established",
    localAddress: NETWORK_REMOTE_ADDRESS,
    localPort: NETWORK_REMOTE_PORT,
    remoteAddress: NETWORK_CLIENT_ADDRESS,
    remotePort: NETWORK_EPHEMERAL_PORT,
    kernelBufferedBytes: 0,
  }]);
  assert.deepEqual(machine.acceptedSockets, []);
  assert.deepEqual(machine.events.map((event) => event.kind), [
    "resolved",
    "socket-created",
    "route-selected",
    "arp-request",
    "arp-reply",
    "syn-sent",
    "syn-ack-received",
    "handshake-ack-sent",
    "socket-established",
    "connection-queued-for-accept",
  ]);

  const accepted = acceptTcpConnection(machine, NETWORK_SERVER_LISTENER_FD);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.reason, "connection-accepted");
  assert.equal(accepted.fd, NETWORK_SERVER_ACCEPTED_FD);
  assert.equal(machine.pendingTcpConnections.length, 1);
  assert.equal(machine.acceptedSockets.length, 0);
  assert.equal(accepted.machine.listeners[0].state, "listen");
  assert.deepEqual(accepted.machine.pendingTcpConnections, []);
  assert.deepEqual(accepted.machine.acceptedSockets, [{
    fd: NETWORK_SERVER_ACCEPTED_FD,
    listenerFd: NETWORK_SERVER_LISTENER_FD,
    clientFd: fd,
    state: "established",
    localAddress: NETWORK_REMOTE_ADDRESS,
    localPort: NETWORK_REMOTE_PORT,
    remoteAddress: NETWORK_CLIENT_ADDRESS,
    remotePort: NETWORK_EPHEMERAL_PORT,
    receiveQueueBytes: 0,
    applicationReceivedBytes: 0,
  }]);
  assert.deepEqual(accepted.machine.events.at(-1), {
    order: accepted.machine.events.length,
    kind: "accepted-socket-created",
    fd: NETWORK_SERVER_ACCEPTED_FD,
    listenerFd: NETWORK_SERVER_LISTENER_FD,
    clientFd: fd,
    address: NETWORK_REMOTE_ADDRESS,
  });
  const route = machine.events.find((event) => event.kind === "route-selected");
  assert.equal(route.prefixLength, 0);
  assert.equal(route.nextHop, NETWORK_GATEWAY_ADDRESS);
  assert.equal(machine.events.find((event) => event.kind === "arp-request").address, NETWORK_GATEWAY_ADDRESS);
  assert.equal(machine.events.some((event) => event.kind === "arp-request" && event.address === NETWORK_REMOTE_ADDRESS), false);
});

test("uses a warm neighbor entry without emitting a false ARP exchange", () => {
  let machine = createNetworkingMachine({ neighborCache: "warm" });
  const created = createTcpSocket(machine);
  machine = created.machine;
  const connected = connectTcpSocket(machine, created.fd, NETWORK_REMOTE_ADDRESS, NETWORK_REMOTE_PORT);
  assert.equal(connected.ok, true);
  assert.equal(connected.machine.events.some((event) => event.kind === "neighbor-cache-hit"), true);
  assert.equal(connected.machine.events.some((event) => event.kind === "arp-request"), false);
  assert.equal(connected.machine.events.some((event) => event.kind === "arp-reply"), false);
});

test("rejects send before connect and a closed listener without claiming application delivery", () => {
  let machine = createNetworkingMachine({ listenerPort: 8443 });
  const created = createTcpSocket(machine);
  machine = created.machine;
  const earlySend = sendTcpPayload(machine, created.fd, 10);
  assert.equal(earlySend.ok, false);
  assert.equal(earlySend.reason, "socket-not-established");
  assert.equal(earlySend.machine.segments.length, 0);
  assert.equal(earlySend.machine.frames.length, 0);

  const refused = connectTcpSocket(machine, created.fd, NETWORK_REMOTE_ADDRESS, NETWORK_REMOTE_PORT);
  assert.equal(refused.ok, false);
  assert.equal(refused.reason, "connection-refused");
  assert.equal(refused.machine.sockets[0].state, "reset");
  assert.equal(refused.machine.listeners[0].state, "listen");
  assert.equal(refused.machine.pendingTcpConnections.length, 0);
  assert.equal(refused.machine.acceptedSockets.length, 0);
  assert.equal(refused.machine.events.at(-1).kind, "rst-received");

  assert.deepEqual(demultiplexTcpSyn(true, NETWORK_REMOTE_ADDRESS, 8443, [{ address: "0.0.0.0", port: 443 }]), {
    networkDelivered: true,
    listenerMatched: false,
    response: "rst",
    applicationDelivered: false,
  });
  assert.deepEqual(demultiplexTcpSyn(false, NETWORK_REMOTE_ADDRESS, 443, [{ address: "0.0.0.0", port: 443 }]), {
    networkDelivered: false,
    listenerMatched: false,
    response: "none",
    applicationDelivered: false,
  });
});

test("allows client send before accept while keeping application recv behind the accepted fd", () => {
  const empty = createNetworkingMachine();
  const emptySnapshot = structuredClone(empty);
  const noPending = acceptTcpConnection(empty, NETWORK_SERVER_LISTENER_FD);
  assert.equal(noPending.ok, false);
  assert.equal(noPending.reason, "accept-queue-empty");
  assert.deepEqual(empty, emptySnapshot);
  const missingListener = acceptTcpConnection(empty, 99);
  assert.equal(missingListener.ok, false);
  assert.equal(missingListener.reason, "listener-not-found");

  let { machine, fd } = prepareHandshakeMachine();
  const sent = sendTcpPayload(machine, fd, NETWORK_LAB_PAYLOAD_BYTES);
  assert.equal(sent.ok, true);
  machine = sent.machine;
  assert.equal(machine.acceptedSockets.length, 0);
  assert.equal(machine.pendingTcpConnections[0].kernelBufferedBytes, 0);

  const first = transmitTcpSegment(machine, fd, 0, "deliver");
  assert.equal(first.ok, true);
  assert.equal(first.acknowledgement, 2461);
  machine = first.machine;
  assert.equal(machine.acceptedSockets.length, 0);
  assert.equal(machine.pendingTcpConnections[0].kernelBufferedBytes, 1460);
  const prematureRecv = receiveTcpApplication(machine, NETWORK_SERVER_ACCEPTED_FD, 1460);
  assert.equal(prematureRecv.ok, false);
  assert.equal(prematureRecv.reason, "application-not-ready");

  const accepted = acceptTcpConnection(machine, NETWORK_SERVER_LISTENER_FD);
  assert.equal(accepted.ok, true);
  assert.equal(accepted.fd, NETWORK_SERVER_ACCEPTED_FD);
  assert.equal(accepted.machine.listeners[0].state, "listen");
  assert.equal(accepted.machine.pendingTcpConnections.length, 0);
  assert.equal(accepted.machine.acceptedSockets[0].receiveQueueBytes, 1460);

  machine = transmitTcpSegment(accepted.machine, fd, 1, "drop").machine;
  machine = transmitTcpSegment(machine, fd, 2, "deliver").machine;
  machine = fireTcpRetransmissionTimeout(machine, fd).machine;
  const evidence = evaluateNetworkLabPrediction(createNetworkingMachine(), correctPrediction).evidence;
  assert.equal(canReceiveNetworkApplication(machine, evidence), true);
  machine = receiveTcpApplication(
    machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES,
  ).machine;
  assert.equal(canMasterNetworkLab(machine, evidence), true);
});

test("keeps cumulative ACK at the first gap and jumps across buffered data after retransmission", () => {
  const first = receiveTcpRange(1001, [], { start: 1001, end: 2461 });
  assert.deepEqual(first, { nextExpected: 2461, bufferedRanges: [], duplicateAck: false });
  const third = receiveTcpRange(first.nextExpected, first.bufferedRanges, { start: 3921, end: 4001 });
  assert.deepEqual(third, {
    nextExpected: 2461,
    bufferedRanges: [{ start: 3921, end: 4001 }],
    duplicateAck: true,
  });
  const repaired = receiveTcpRange(third.nextExpected, third.bufferedRanges, { start: 2461, end: 3921 });
  assert.deepEqual(repaired, { nextExpected: 4001, bufferedRanges: [], duplicateAck: false });
  const duplicate = receiveTcpRange(repaired.nextExpected, repaired.bufferedRanges, { start: 2461, end: 3921 });
  assert.deepEqual(duplicate, { nextExpected: 4001, bufferedRanges: [], duplicateAck: true });
  assert.throws(() => receiveTcpRange(1001, [], { start: 1001, end: 1001 }), /non-empty/);
});

test("runs drop, duplicate ACK, timeout retransmission, and final cumulative ACK as state transitions", () => {
  const { machine, fd } = recoverNetworkTransport();
  const socket = machine.sockets.find((candidate) => candidate.fd === fd);
  assert.equal(socket.sendUnacknowledged, 4001);
  assert.equal(socket.sendNext, 4001);
  assert.equal(socket.receiverNextExpected, 4001);
  assert.deepEqual(socket.receiverBufferedRanges, []);
  assert.equal(machine.listeners[0].state, "listen");
  assert.equal(machine.acceptedSockets[0].state, "established");
  assert.equal(machine.acceptedSockets[0].receiveQueueBytes, NETWORK_LAB_PAYLOAD_BYTES);
  assert.equal(machine.acceptedSockets[0].applicationReceivedBytes, 0);
  assert.deepEqual(machine.segments.map((segment) => ({
    index: segment.index,
    sequenceStart: segment.sequenceStart,
    payloadBytes: segment.payloadBytes,
    transmissions: segment.transmissions,
    firstDisposition: segment.firstDisposition,
    delivered: segment.delivered,
    acknowledged: segment.acknowledged,
  })), [
    { index: 0, sequenceStart: 1001, payloadBytes: 1460, transmissions: 1, firstDisposition: "delivered", delivered: true, acknowledged: true },
    { index: 1, sequenceStart: 2461, payloadBytes: 1460, transmissions: 2, firstDisposition: "dropped", delivered: true, acknowledged: true },
    { index: 2, sequenceStart: 3921, payloadBytes: 80, transmissions: 1, firstDisposition: "delivered", delivered: true, acknowledged: true },
  ]);
  assert.equal(machine.frames.length, 4);
  assert.equal(machine.frames.at(-1).retransmission, true);
  for (const frame of machine.frames) {
    assert.equal(frame.sourceMac, NETWORK_CLIENT_MAC);
    assert.equal(frame.destinationMac, NETWORK_GATEWAY_MAC);
    assert.equal(frame.destinationIp, NETWORK_REMOTE_ADDRESS);
    assert.equal(frame.destinationPort, NETWORK_REMOTE_PORT);
    assert.equal(frame.ttl, 64);
    assert.equal(frame.ipv4TotalBytes <= NETWORK_MTU, true);
  }
});

test("keeps the listener in LISTEN while accepted fd 5 consumes the contiguous receive queue", () => {
  const recovered = recoverNetworkTransport();
  const evidence = evaluateNetworkLabPrediction(createNetworkingMachine(), correctPrediction).evidence;
  assert.equal(canReceiveNetworkApplication(recovered.machine, evidence), true);
  assert.equal(canMasterNetworkLab(recovered.machine, evidence), false);

  const tooLarge = receiveTcpApplication(
    recovered.machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES + 1,
  );
  assert.equal(tooLarge.ok, false);
  assert.equal(tooLarge.reason, "application-not-ready");
  assert.equal(tooLarge.machine.acceptedSockets[0].receiveQueueBytes, NETWORK_LAB_PAYLOAD_BYTES);

  const received = receiveTcpApplication(
    recovered.machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES,
  );
  assert.equal(received.ok, true);
  assert.equal(received.machine.listeners[0].state, "listen");
  assert.deepEqual(received.machine.acceptedSockets[0], {
    fd: NETWORK_SERVER_ACCEPTED_FD,
    listenerFd: NETWORK_SERVER_LISTENER_FD,
    clientFd: recovered.fd,
    state: "established",
    localAddress: NETWORK_REMOTE_ADDRESS,
    localPort: NETWORK_REMOTE_PORT,
    remoteAddress: NETWORK_CLIENT_ADDRESS,
    remotePort: NETWORK_EPHEMERAL_PORT,
    receiveQueueBytes: 0,
    applicationReceivedBytes: NETWORK_LAB_PAYLOAD_BYTES,
  });
  assert.deepEqual(received.machine.events.at(-1), {
    order: received.machine.events.length,
    kind: "application-received",
    fd: NETWORK_SERVER_ACCEPTED_FD,
    payloadBytes: NETWORK_LAB_PAYLOAD_BYTES,
  });
  assert.equal(canReceiveNetworkApplication(received.machine, evidence), false);
  assert.equal(canMasterNetworkLab(received.machine, evidence), true);
});

test("grades predictions by semantic groups and requires both evidence and ordered final state", () => {
  const initial = createNetworkingMachine();
  const correct = evaluateNetworkLabPrediction(initial, correctPrediction);
  assert.equal(correct.correct, true);
  assert.deepEqual(correct.errors, []);
  assert.deepEqual(correct.evidence, {
    socketBoundaryPredicted: true,
    routeNeighborPredicted: true,
    segmentationPredicted: true,
    lossRecoveryPredicted: true,
  });
  const evidence = mergeNetworkLabEvidence(emptyNetworkLabEvidence, correct);
  const completed = completeNetworkLab();
  assert.equal(canMasterNetworkLab(completed.machine, evidence), true);
  assert.equal(canMasterNetworkLab(createNetworkingMachine(), evidence), false);
  for (const missing of Object.keys(evidence)) {
    assert.equal(canMasterNetworkLab(completed.machine, { ...evidence, [missing]: false }), false);
  }

  const wrong = evaluateNetworkLabPrediction(initial, {
    ...correctPrediction,
    socketBoundary: "packet-id",
    arpTarget: NETWORK_REMOTE_ADDRESS,
    segmentPayloads: [1500, 1500],
    ackAfterGap: 4001,
  });
  assert.equal(wrong.correct, false);
  assert.deepEqual(wrong.evidence, {
    socketBoundaryPredicted: false,
    routeNeighborPredicted: false,
    segmentationPredicted: false,
    lossRecoveryPredicted: false,
  });
  assert.equal(wrong.errors.includes("socket-boundary"), true);
  assert.equal(wrong.errors.includes("arp-target"), true);
  assert.equal(wrong.errors.includes("segment-payloads"), true);
  assert.equal(wrong.errors.includes("ack-after-gap"), true);
});

test("rejects a reordered replay even if it reaches the same ACK and final socket state", () => {
  let { machine, fd } = prepareAcceptedMachine();
  machine = sendTcpPayload(machine, fd, NETWORK_LAB_PAYLOAD_BYTES).machine;
  machine = transmitTcpSegment(machine, fd, 1, "drop").machine;
  machine = transmitTcpSegment(machine, fd, 0, "deliver").machine;
  machine = transmitTcpSegment(machine, fd, 2, "deliver").machine;
  machine = fireTcpRetransmissionTimeout(machine, fd).machine;
  machine = receiveTcpApplication(
    machine,
    NETWORK_SERVER_ACCEPTED_FD,
    NETWORK_LAB_PAYLOAD_BYTES,
  ).machine;
  const evidence = evaluateNetworkLabPrediction(createNetworkingMachine(), correctPrediction).evidence;
  assert.equal(machine.sockets[0].sendUnacknowledged, 4001);
  assert.equal(machine.acceptedSockets[0].applicationReceivedBytes, NETWORK_LAB_PAYLOAD_BYTES);
  assert.equal(canMasterNetworkLab(machine, evidence), false);
});

test("rejects forged final history when any required causal event is missing", () => {
  const completed = completeNetworkLab();
  const evidence = evaluateNetworkLabPrediction(createNetworkingMachine(), correctPrediction).evidence;
  const withoutArpRequest = structuredClone(completed.machine);
  withoutArpRequest.events = withoutArpRequest.events.filter((event) => event.kind !== "arp-request");
  assert.equal(withoutArpRequest.sockets[0].sendUnacknowledged, 4001);
  assert.equal(canMasterNetworkLab(withoutArpRequest, evidence), false);

  const withoutGapAck = structuredClone(completed.machine);
  const gapAckIndex = withoutGapAck.events.findIndex((event) =>
    event.kind === "ack-received"
      && event.acknowledgement === 2461
      && event.duplicateAck === true,
  );
  assert.notEqual(gapAckIndex, -1);
  withoutGapAck.events.splice(gapAckIndex, 1);
  assert.equal(canMasterNetworkLab(withoutGapAck, evidence), false);

  const withoutAcceptQueueEvent = structuredClone(completed.machine);
  withoutAcceptQueueEvent.events = withoutAcceptQueueEvent.events.filter((event) =>
    event.kind !== "connection-queued-for-accept",
  );
  assert.equal(canMasterNetworkLab(withoutAcceptQueueEvent, evidence), false);

  const withoutAcceptEvent = structuredClone(completed.machine);
  withoutAcceptEvent.events = withoutAcceptEvent.events.filter((event) =>
    event.kind !== "accepted-socket-created",
  );
  assert.equal(withoutAcceptEvent.acceptedSockets[0].fd, NETWORK_SERVER_ACCEPTED_FD);
  assert.equal(canMasterNetworkLab(withoutAcceptEvent, evidence), false);

  const acceptBeforeHandshakeQueue = structuredClone(completed.machine);
  const acceptedEventIndex = acceptBeforeHandshakeQueue.events.findIndex((event) =>
    event.kind === "accepted-socket-created",
  );
  const [acceptedEvent] = acceptBeforeHandshakeQueue.events.splice(acceptedEventIndex, 1);
  acceptBeforeHandshakeQueue.events.unshift(acceptedEvent);
  assert.equal(canMasterNetworkLab(acceptBeforeHandshakeQueue, evidence), false);

  const withoutApplicationEvent = structuredClone(completed.machine);
  withoutApplicationEvent.events = withoutApplicationEvent.events.filter((event) =>
    event.kind !== "application-received",
  );
  assert.equal(withoutApplicationEvent.acceptedSockets[0].applicationReceivedBytes, NETWORK_LAB_PAYLOAD_BYTES);
  assert.equal(canMasterNetworkLab(withoutApplicationEvent, evidence), false);

  const forgedCounters = recoverNetworkTransport().machine;
  forgedCounters.acceptedSockets[0].receiveQueueBytes = 0;
  forgedCounters.acceptedSockets[0].applicationReceivedBytes = NETWORK_LAB_PAYLOAD_BYTES;
  forgedCounters.applicationReceived = true;
  assert.equal(canMasterNetworkLab(forgedCounters, evidence), false);
});

test("forwards one hop by changing the Ethernet next hop and TTL, not the end-to-end IP destination", () => {
  const fixture = networkIncidentFixtures["next-hop-frame"];
  const result = forwardIpv4Packet(fixture.packet, fixture.routes, fixture.interfaces, fixture.neighbors);
  assert.deepEqual(result, {
    ok: true,
    error: null,
    route: {
      network: "203.0.113.0",
      prefixLength: 24,
      gateway: "192.0.2.1",
      interfaceId: "wan0",
      metric: 10,
    },
    nextHop: "192.0.2.1",
    ethernetDestination: "02:00:00:00:00:21",
    ipDestination: "203.0.113.20",
    outgoingTtl: 2,
  });
  assert.equal(forwardIpv4Packet({ ...fixture.packet, ttl: 1 }, fixture.routes, fixture.interfaces, fixture.neighbors).error, "ttl-expired");
  assert.equal(forwardIpv4Packet(fixture.packet, fixture.routes, fixture.interfaces, []).error, "neighbor-unreachable");
});

test("grades four independent networking incidents from route, forwarding, ACK, and listener models", () => {
  assert.deepEqual(networkIncidentIds, ["longest-prefix", "next-hop-frame", "ack-gap", "listener-delivery"]);
  const submissions = {
    "longest-prefix": {
      routePrefixLength: 25,
      routeGateway: "10.0.0.252",
      routeInterfaceId: "eth0",
    },
    "next-hop-frame": {
      nextHop: "192.0.2.1",
      ethernetDestination: "02:00:00:00:00:21",
      ipDestination: "203.0.113.20",
      outgoingTtl: 2,
    },
    "ack-gap": {
      ackAfterGap: 5601,
      retransmitSequence: 5601,
      retransmitBytes: 600,
      finalAck: 6501,
    },
    "listener-delivery": {
      networkDelivered: true,
      listenerMatched: false,
      listenerResponse: "rst",
      applicationDelivered: false,
    },
  };
  for (const id of networkIncidentIds) {
    const evaluation = evaluateNetworkIncident(id, submissions[id]);
    assert.equal(evaluation.correct, true, `${id}: ${evaluation.errors.join(", ")}`);
    assert.deepEqual(evaluation.errors, []);
    assert.equal(evaluateNetworkIncident(id, {}).correct, false);
  }

  const wrongNextHop = evaluateNetworkIncident("next-hop-frame", {
    ...submissions["next-hop-frame"],
    ethernetDestination: "02:00:00:00:00:99",
    ipDestination: "192.0.2.1",
    outgoingTtl: 3,
  });
  assert.deepEqual(wrongNextHop.errors, ["ethernet-destination", "ip-destination", "outgoing-ttl"]);
  const wrongListener = evaluateNetworkIncident("listener-delivery", {
    networkDelivered: false,
    listenerMatched: true,
    listenerResponse: "syn-ack",
    applicationDelivered: true,
  });
  assert.deepEqual(wrongListener.errors, [
    "network-delivered",
    "listener-matched",
    "listener-response",
    "application-delivery",
  ]);
});

test("requires the packet lab, incident repair, and concept checks together", () => {
  assert.equal(canCompleteNetworkingChapter({
    packetLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  }), true);
  for (const missing of ["packetLabComplete", "incidentsComplete", "conceptsMastered"]) {
    assert.equal(canCompleteNetworkingChapter({
      packetLabComplete: true,
      incidentsComplete: true,
      conceptsMastered: true,
      [missing]: false,
    }), false);
  }
});

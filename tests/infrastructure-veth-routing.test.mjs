import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteVethRoutingChapter,
  evaluateVethTopology,
  evaluateVethTopologyIncident,
  vethTopologyIncidentFixtures,
  vethTopologyPresets,
} from "../src/features/infrastructure/veth-routing.ts";
import { buildVethRoutingVisualState } from "../src/features/infrastructure/veth-routing-visual.ts";

test("projects live bridge and router objects while masking path results before execution", () => {
  const bridgeEvaluation = evaluateVethTopology(vethTopologyPresets["bridge-working"]);
  const bridge = buildVethRoutingVisualState(bridgeEvaluation);
  assert.equal(bridge.mode, "bridge");
  assert.equal(bridge.topologyState, "reachable");
  assert.equal(bridge.gradeState, "not-run");
  assert.equal(bridge.pathState, "not-run");
  assert.equal(bridge.displayedReason, "not-run");
  assert.ok([...bridge.forwardPath, ...bridge.returnPath].every(({ status, reason }) => status === "not-run" && reason === null));
  assert.deepEqual(bridge.links.map(({ id, state, placement }) => [id, state, placement]), [
    ["client-veth", "up", "attached"],
    ["app-veth", "up", "attached"],
  ]);
  assert.equal(bridge.boundaries[1].bridgeId, "br0");

  const routerEvaluation = evaluateVethTopology(vethTopologyPresets["router-working"]);
  const router = buildVethRoutingVisualState(routerEvaluation, "passed");
  assert.equal(router.mode, "router");
  assert.equal(router.pathState, "reachable");
  assert.equal(router.displayedReason, "connected");
  assert.ok([...router.forwardPath, ...router.returnPath].every(({ status }) => status === "passed"));
  assert.equal(router.boundaries[1].namespaceId, "router");
  assert.equal(router.boundaries[1].forwarding, true);
});

test("keeps misplaced peer ownership and blocked route state visible in the visual projection", () => {
  const danglingEvaluation = evaluateVethTopology(vethTopologyPresets["router-scaffold"]);
  const dangling = buildVethRoutingVisualState(danglingEvaluation, "failed");
  assert.equal(dangling.topologyState, "incomplete");
  assert.equal(dangling.pathState, "blocked");
  assert.equal(dangling.links[0].placement, "dangling");
  assert.equal(dangling.links[0].endpointB.ownerNamespace, "host");

  const noReturnEvaluation = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    appReturnRoute: "missing",
  });
  const noReturn = buildVethRoutingVisualState(noReturnEvaluation, "failed");
  assert.equal(noReturn.topologyState, "missing-return-route");
  assert.equal(noReturn.displayedReason, "no-return-route");
  assert.equal(noReturn.returnPath[0].status, "blocked");
});

test("builds two symmetric veth pairs with one owner per endpoint", () => {
  const bridge = evaluateVethTopology(vethTopologyPresets["bridge-working"]);
  assert.equal(bridge.passed, true);
  assert.deepEqual(
    bridge.machine.interfaces.map(({ id, ownerNamespace, peerId, bridgeId, up }) => ({ id, ownerNamespace, peerId, bridgeId, up })),
    [
      { id: "client-eth0", ownerNamespace: "client", peerId: "client-peer", bridgeId: null, up: true },
      { id: "client-peer", ownerNamespace: "host", peerId: "client-eth0", bridgeId: "br0", up: true },
      { id: "app-eth0", ownerNamespace: "app", peerId: "app-peer", bridgeId: null, up: true },
      { id: "app-peer", ownerNamespace: "host", peerId: "app-eth0", bridgeId: "br0", up: true },
    ],
  );
  assert.deepEqual(bridge.machine.bridge?.portIds, ["client-peer", "app-peer"]);
  for (const networkInterface of bridge.machine.interfaces) {
    const peer = bridge.machine.interfaces.find(({ id }) => id === networkInterface.peerId);
    assert.equal(peer?.peerId, networkInterface.id);
    assert.notEqual(peer?.id, networkInterface.id);
  }
});

test("requires usable links, explicit bridge ports, and a distinct same-subnet address plan", () => {
  const scaffold = evaluateVethTopology(vethTopologyPresets["bridge-scaffold"]);
  assert.equal(scaffold.passed, false);
  assert.equal(scaffold.reason, "bridge-port-missing");
  assert.equal(scaffold.checks["peer-placement"], false);
  assert.equal(scaffold.checks["links-up"], false);
  assert.equal(scaffold.checks["address-plan"], false);

  const down = evaluateVethTopology({ ...vethTopologyPresets["bridge-working"], appLinkUp: false });
  assert.equal(down.reason, "interface-down");
  assert.equal(down.checks["links-up"], false);

  const duplicate = evaluateVethTopology({
    ...vethTopologyPresets["bridge-working"],
    appAddress: "10.20.0.2/24",
  });
  assert.equal(duplicate.reason, "duplicate-address");
  assert.equal(duplicate.checks["distinct-addresses"], false);

  const differentSubnet = evaluateVethTopology({
    ...vethTopologyPresets["bridge-working"],
    appAddress: "10.30.0.2/24",
  });
  assert.equal(differentSubnet.reason, "invalid-address");
  assert.equal(differentSubnet.checks["address-plan"], false);
});

test("routes across non-overlapping router legs with on-link gateways and a return path", () => {
  const routed = evaluateVethTopology(vethTopologyPresets["router-working"]);
  assert.equal(routed.passed, true);
  assert.equal(routed.reason, "connected");
  assert.equal(routed.machine.bridge, null);
  assert.equal(routed.machine.forwarding, true);
  assert.deepEqual(
    routed.machine.interfaces.filter(({ ownerNamespace }) => ownerNamespace === "router").map(({ id, address }) => [id, address]),
    [["client-peer", "10.20.0.1/24"], ["app-peer", "10.30.0.1/24"]],
  );
  assert.deepEqual(
    routed.machine.routes.filter(({ role }) => role !== "connected").map(({ id, destination, gateway, role }) => ({ id, destination, gateway, role })),
    [
      { id: "client-forward", destination: "10.30.0.0/24", gateway: "10.20.0.1", role: "forward" },
      { id: "app-return", destination: "10.20.0.0/24", gateway: "10.30.0.1", role: "return" },
    ],
  );
  assert.ok(routed.forwardPath.every(({ status }) => status === "passed"));
  assert.ok(routed.returnPath.every(({ status }) => status === "passed"));
});

test("reports forward route, forwarding, return route, and listener failures independently", () => {
  const missingForward = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    clientForwardRoute: "missing",
  });
  assert.equal(missingForward.reason, "no-forward-route");
  assert.equal(missingForward.checks["client-forward-route"], false);

  const offLinkGateway = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    clientForwardRoute: "wrong-gateway",
  });
  assert.equal(offLinkGateway.reason, "gateway-off-link");

  const forwardingOff = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    forwarding: false,
  });
  assert.equal(forwardingOff.reason, "forwarding-disabled");
  assert.equal(forwardingOff.checks["transit-forwarding"], false);

  const missingReturn = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    appReturnRoute: "missing",
  });
  assert.equal(missingReturn.reason, "no-return-route");
  assert.equal(missingReturn.checks["return-route"], false);

  const listenerMissing = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    appListenerUp: false,
  });
  assert.equal(listenerMissing.reason, "listener-missing");
  assert.equal(listenerMissing.checks["app-listener"], false);
});

test("rejects malformed, duplicate, and overlapping router address plans", () => {
  assert.equal(evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    clientAddress: "10.20.0.999/24",
  }).reason, "invalid-address");
  assert.equal(evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    routerClientAddress: "10.20.0.2/24",
  }).reason, "duplicate-address");
  const overlap = evaluateVethTopology({
    ...vethTopologyPresets["router-working"],
    appAddress: "10.20.1.2/16",
    routerAppAddress: "10.20.1.1/16",
  });
  assert.equal(overlap.reason, "overlapping-router-subnets");
  assert.equal(overlap.checks["address-plan"], false);
});

test("keeps cross-namespace connectivity on veth addresses instead of localhost", () => {
  for (const preset of [vethTopologyPresets["bridge-working"], vethTopologyPresets["router-working"]]) {
    const evaluation = evaluateVethTopology(preset);
    assert.equal(evaluation.passed, true);
    assert.equal(evaluation.machine.listener.address, "0.0.0.0");
    assert.ok(evaluation.machine.interfaces.every(({ address }) => !address?.startsWith("127.")));
    assert.ok(evaluation.machine.routes.every(({ destination, gateway }) => !destination.startsWith("127.") && !gateway?.startsWith("127.")));
  }
});

test("publishes four incidents with one semantics-preserving repair each", () => {
  assert.deepEqual(Object.keys(vethTopologyIncidentFixtures), [
    "dangling-bridge-peer",
    "duplicate-bridge-address",
    "forwarding-disabled",
    "missing-return-route",
  ]);
  const passing = {
    "dangling-bridge-peer": "attach-peer-to-bridge",
    "duplicate-bridge-address": "assign-distinct-app-address",
    "forwarding-disabled": "enable-router-forwarding",
    "missing-return-route": "add-app-return-route",
  };
  const failing = {
    "dangling-bridge-peer": "move-peer-to-client",
    "duplicate-bridge-address": "widen-prefix",
    "forwarding-disabled": "enable-nat",
    "missing-return-route": "add-another-client-route",
  };
  for (const incidentId of Object.keys(passing)) {
    assert.equal(evaluateVethTopologyIncident(incidentId, passing[incidentId]).passed, true, incidentId);
    assert.equal(evaluateVethTopologyIncident(incidentId, failing[incidentId]).passed, false, incidentId);
  }
});

test("requires both topology modes, incidents, and concepts before chapter completion", () => {
  assert.equal(canCompleteVethRoutingChapter({
    bridgeTopologyComplete: true,
    routedTopologyComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  }), true);
  for (const field of ["bridgeTopologyComplete", "routedTopologyComplete", "incidentsComplete", "conceptsMastered"]) {
    const progress = {
      bridgeTopologyComplete: true,
      routedTopologyComplete: true,
      incidentsComplete: true,
      conceptsMastered: true,
      [field]: false,
    };
    assert.equal(canCompleteVethRoutingChapter(progress), false, field);
  }
});

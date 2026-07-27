import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  SUBNET_GATEWAY_ADDRESS,
  SUBNET_GATEWAY_MAC,
  SUBNET_PEER_ADDRESS,
  SUBNET_PEER_MAC,
  SUBNET_REMOTE_ADDRESS,
  canCompleteSubnetIncidents,
  canCompleteSubnetsChapter,
  createHealthySubnetState,
  decideDelivery,
  deriveIpv4Network,
  evaluateSubnetIncidentRepair,
  isSameIpv4Link,
  subnetIncidentIds,
  subnetPhaseIds,
  subnetPhaseSnapshot,
} from "../src/features/linux-networking/subnets-neighbors-and-gateways.ts";

test("derives the local network and separates on-link from remote destinations", () => {
  assert.equal(deriveIpv4Network("10.20.0.2", 24), "10.20.0.0/24");
  assert.equal(isSameIpv4Link("10.20.0.2", SUBNET_PEER_ADDRESS, 24), true);
  assert.equal(isSameIpv4Link("10.20.0.2", SUBNET_REMOTE_ADDRESS, 24), false);
});

test("uses the peer as next hop for on-link delivery", () => {
  const decision = decideDelivery(createHealthySubnetState(), SUBNET_PEER_ADDRESS);
  assert.equal(decision.onLink, true);
  assert.equal(decision.nextHop, SUBNET_PEER_ADDRESS);
  assert.equal(decision.ethernetDestination, SUBNET_PEER_MAC);
  assert.equal(decision.ipDestination, SUBNET_PEER_ADDRESS);
});

test("uses the gateway MAC while preserving the remote IP destination", () => {
  const decision = decideDelivery(createHealthySubnetState(), SUBNET_REMOTE_ADDRESS);
  assert.equal(decision.onLink, false);
  assert.equal(decision.nextHop, SUBNET_GATEWAY_ADDRESS);
  assert.equal(decision.ethernetDestination, SUBNET_GATEWAY_MAC);
  assert.equal(decision.ipDestination, SUBNET_REMOTE_ADDRESS);
});

test("resolves a missing neighbor before building the frame", () => {
  const state = { ...createHealthySubnetState(), neighbors: [] };
  const peer = decideDelivery(state, SUBNET_PEER_ADDRESS);
  const remote = decideDelivery(state, SUBNET_REMOTE_ADDRESS);
  assert.equal(peer.status, "neighbor-resolution");
  assert.equal(peer.arpTarget, SUBNET_PEER_ADDRESS);
  assert.equal(remote.arpTarget, SUBNET_GATEWAY_ADDRESS);
});

test("blocks remote delivery without a valid on-link gateway", () => {
  const healthy = createHealthySubnetState();
  assert.equal(decideDelivery({ ...healthy, gateway: null }, SUBNET_REMOTE_ADDRESS).reason, "default-route-missing");
  assert.equal(decideDelivery({ ...healthy, gateway: "10.21.0.1" }, SUBNET_REMOTE_ADDRESS).reason, "gateway-off-link");
});

test("exposes six deterministic path phases including the counterfactual", () => {
  assert.equal(subnetPhaseIds.length, 6);
  for (const id of subnetPhaseIds) assert.equal(subnetPhaseSnapshot(id).id, id);
  assert.equal(subnetPhaseSnapshot("remove-default").decision.status, "blocked");
});

test("requires the exact repair for every incident", () => {
  const repairs = {
    "prefix-too-wide": "restore-prefix-24",
    "wrong-peer-mac": "refresh-peer-neighbor",
    "default-route-missing": "restore-default-route",
    "gateway-off-link": "restore-on-link-gateway",
  };
  assert.equal(subnetIncidentIds.length, 4);
  assert.equal(canCompleteSubnetIncidents(repairs), true);
  assert.equal(evaluateSubnetIncidentRepair("prefix-too-wide", "restore-default-route").correct, false);
});

test("gates chapter completion on path, incident, and concept mastery", () => {
  assert.equal(canCompleteSubnetsChapter({ labComplete: true, incidentsComplete: true, conceptsMastered: true }), true);
  assert.equal(canCompleteSubnetsChapter({ labComplete: true, incidentsComplete: false, conceptsMastered: true }), false);
});

test("keeps the reset control at least 44 pixels in both layouts", async () => {
  const css = await readFile(new URL("../src/components/linux-networking/subnets-neighbors-gateways.css", import.meta.url), "utf8");
  assert.match(css, /\.subnet-command-rail \.subnet-reset \{[^}]*min-width: 44px;/);
  assert.match(css, /\.subnet-command-rail \.subnet-reset \{[^}]*min-height: 44px;/);
  assert.doesNotMatch(css, /\.subnet-command-rail \.subnet-reset \{[^}]*min-height: 40px;/);
});

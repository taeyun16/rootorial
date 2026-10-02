import assert from "node:assert/strict";
import test from "node:test";
import { lookupIPv4Route, routeLookupForPhase } from "../src/features/linux-networking/route-lookup.ts";
import { getAdvancedLinuxNetworkingConfig } from "../src/features/linux-networking/advanced-networking.ts";

test("route lookup matches both /24 edges and falls back outside them", () => {
  for (const address of ["203.0.113.0", "203.0.113.20", "203.0.113.255"]) {
    const result = lookupIPv4Route(address);
    assert.equal(result.selected.prefix, "203.0.113.0/24");
    assert.deepEqual(result.candidates.map(r => r.prefix), ["203.0.113.0/24", "0.0.0.0/0"]);
  }
  for (const address of ["203.0.112.255", "203.0.114.0", "198.51.101.1"]) assert.equal(lookupIPv4Route(address).selected.prefix, "0.0.0.0/0");
});
test("equal-prefix candidates compare metric while longer prefixes beat lower metrics", () => {
  const metric = routeLookupForPhase("metric-tie");
  assert.equal(metric.destination, "198.51.100.8");
  assert.deepEqual(metric.candidates.map(r => [r.prefix, r.metric]), [["198.51.100.0/24", 20], ["198.51.100.0/24", 80], ["0.0.0.0/0", 100]]);
  assert.equal(metric.selected.nextHop, "10.20.0.1");
  const table = [
    { id: "default", prefix: "0.0.0.0/0", nextHop: "10.20.0.254", device: "eth0", metric: 0 },
    { id: "specific", prefix: "198.51.100.0/24", nextHop: "10.20.0.1", device: "eth0", metric: 500 },
  ];
  assert.equal(lookupIPv4Route("198.51.100.255", table).selected.id, "specific");
  assert.equal(lookupIPv4Route("198.51.101.0", table).selected.id, "default");
});
test("route model rejects malformed addresses and represents a missing route", () => {
  assert.throws(() => lookupIPv4Route("198.51.100.256"), /invalid-ipv4-prefix/);
  assert.equal(lookupIPv4Route("198.51.100.8", []).selected, null);
});
test("every route phase shares destination, selected facts and command with its lookup", () => {
  const phases = getAdvancedLinuxNetworkingConfig("routes-and-packet-paths").figure.phases;
  for (const phase of phases) {
    assert.ok(phase.routeLookup);
    const lookup = phase.routeLookup;
    assert.ok(lookup.candidates.every(route => lookupIPv4Route(lookup.destination, [route]).selected));
    if (phase.id !== "inspect-table") assert.ok(phase.command.includes(lookup.destination));
    if (["longest-prefix", "metric-tie"].includes(phase.id)) {
      assert.ok(phase.output[0].startsWith(lookup.destination));
      assert.ok(phase.output[0].includes(`via ${lookup.selected.nextHop}`));
      assert.ok(phase.facts.some(fact => fact.value === lookup.selected.prefix));
    }
  }
  assert.equal(phases[0].output.length, 4);
  assert.equal(phases[0].routeLookup.candidates.length, 2);
});

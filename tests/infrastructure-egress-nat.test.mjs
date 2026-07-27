import assert from "node:assert/strict";
import test from "node:test";
import { buildNatVisualState } from "../src/features/infrastructure/egress-nat-visual.ts";
import {
  canCompleteEgressNatChapter,
  evaluateNatFlow,
  evaluateNatIncident,
  natFlowPresets,
  natIncidentFixtures,
} from "../src/features/infrastructure/egress-nat.ts";

test("connects fixed SNAT and dynamic masquerade through one stateful round trip", () => {
  for (const preset of ["snat-working", "masquerade-working"]) {
    const result = evaluateNatFlow({ ...natFlowPresets[preset] });
    assert.equal(result.passed, true, preset);
    assert.equal(result.reason, "connected", preset);
    assert.equal(result.stages.length, 10);
    assert.ok(result.stages.every(({ status }) => status === "passed"));
    assert.equal(result.conntrack?.state, "ESTABLISHED");
  }
});

test("keeps the original and translated tuple directions explicit", () => {
  const result = evaluateNatFlow({ ...natFlowPresets["snat-working"] });
  assert.equal(result.tuples.original, "10.20.0.2:41000 → 198.51.100.20:443");
  assert.equal(result.tuples.translated, "203.0.113.10:61000 → 198.51.100.20:443");
  assert.equal(result.tuples.reply, "198.51.100.20:443 → 203.0.113.10:61000");
  assert.equal(result.tuples.restored, "198.51.100.20:443 → 10.20.0.2:41000");
});

test("separates routing, forwarding, translation, and listener failures", () => {
  const cases = [
    ["privateRoute", false, "private-route-missing"],
    ["forwarding", false, "forwarding-disabled"],
    ["natHook", "none", "nat-rule-missing"],
    ["natHook", "prerouting", "wrong-nat-hook"],
    ["natTarget", "unowned-address", "snat-address-unowned"],
    ["externalListener", false, "listener-missing"],
  ];
  for (const [field, value, reason] of cases) {
    const result = evaluateNatFlow({ ...natFlowPresets["snat-working"], [field]: value });
    assert.equal(result.reason, reason, field);
    assert.equal(result.passed, false, field);
  }
});

test("does not treat one-way delivery as a stateful return path", () => {
  const cases = [
    ["externalReturnRoute", false, "external-return-route-missing"],
    ["conntrackEnabled", false, "conntrack-disabled"],
    ["returnRouter", "different-router", "asymmetric-return"],
  ];
  for (const [field, value, reason] of cases) {
    const result = evaluateNatFlow({ ...natFlowPresets["snat-working"], [field]: value });
    assert.equal(result.reason, reason, field);
    assert.equal(result.stages.filter(({ status }) => status === "passed").length >= 5, true);
  }
});

test("keeps conntrack NEW until traffic is observed in the reply direction", () => {
  for (const draft of [
    { ...natFlowPresets["snat-working"], externalReturnRoute: false },
    { ...natFlowPresets["snat-working"], returnRouter: "different-router" },
  ]) {
    const result = evaluateNatFlow(draft);
    assert.equal(result.passed, false);
    assert.equal(result.conntrack?.state, "NEW");
  }

  assert.equal(
    evaluateNatFlow({ ...natFlowPresets["snat-working"] }).conntrack?.state,
    "ESTABLISHED",
  );
});

test("uses masquerade instead of a stale hard-coded SNAT address for dynamic egress", () => {
  const stale = evaluateNatFlow({
    ...natFlowPresets["snat-working"],
    egressAddressMode: "dynamic",
  });
  assert.equal(stale.reason, "stale-snat-address");
  const repaired = evaluateNatFlow({ ...natFlowPresets["masquerade-working"] });
  assert.equal(repaired.passed, true);
  assert.match(repaired.tuples.translated, /^203\.0\.113\.77:61000/);
});

test("masks executed stages and conntrack state before the learner runs the flow", () => {
  const draft = { ...natFlowPresets["snat-working"] };
  const before = buildNatVisualState(draft, null);
  assert.equal(before.gradeState, "not-run");
  assert.equal(before.topologyState, "not-run");
  assert.equal(before.conntrack, null);
  assert.ok(before.stages.every(({ status }) => status === "not-run"));

  const evaluation = evaluateNatFlow(draft);
  const after = buildNatVisualState(draft, evaluation);
  assert.equal(after.gradeState, "passed");
  assert.equal(after.topologyState, "connected");
  assert.equal(after.conntrack?.state, "ESTABLISHED");
});

test("publishes four incidents with exactly one semantics-preserving repair", () => {
  for (const [incidentId, fixture] of Object.entries(natIncidentFixtures)) {
    const results = fixture.repairOptions.map((repair) => evaluateNatIncident(incidentId, repair));
    assert.equal(results.filter(({ passed }) => passed).length, 1, incidentId);
  }
});

test("requires both NAT modes, incidents, and concepts before chapter completion", () => {
  const complete = {
    snatComplete: true,
    masqueradeComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteEgressNatChapter(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(canCompleteEgressNatChapter({ ...complete, [field]: false }), false, field);
  }
});

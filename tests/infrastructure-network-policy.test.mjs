import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteNetworkPolicyChapter,
  evaluateNetworkPolicy,
  evaluateNetworkPolicyIncident,
  networkPolicyIncidentFixtures,
  networkPolicyPresets,
} from "../src/features/infrastructure/network-policy.ts";
import { buildNetworkPolicyVisualState } from "../src/features/infrastructure/network-policy-visual.ts";

test("masks probe verdicts and matched rules before the learner runs the policy", () => {
  const evaluation = evaluateNetworkPolicy(networkPolicyPresets["forward-working"]);
  const hidden = buildNetworkPolicyVisualState(evaluation);
  assert.equal(hidden.policyState, "least-allow");
  assert.equal(hidden.gradeState, "not-run");
  assert.equal(hidden.displayedReason, "not-run");
  assert.ok(hidden.probes.every(({ verdict, matchedRuleId }) => verdict === "not-run" && matchedRuleId === "not-run"));

  const revealed = buildNetworkPolicyVisualState(evaluation, "passed");
  assert.equal(revealed.displayedReason, "least-allow");
  assert.deepEqual(revealed.probes.map(({ verdict }) => verdict), ["accept", "accept", "drop", "drop", "drop"]);
});

test("classifies transit and router-local packets into distinct hooks", () => {
  const forward = evaluateNetworkPolicy(networkPolicyPresets["forward-working"]);
  const input = evaluateNetworkPolicy(networkPolicyPresets["input-working"]);
  assert.equal(forward.machine.chain.hook, "forward");
  assert.ok(forward.packetResults.every(({ observedHook }) => observedHook === "forward"));
  assert.equal(input.machine.chain.hook, "input");
  assert.ok(input.packetResults.every(({ observedHook }) => observedHook === "input"));

  const wrong = evaluateNetworkPolicy({ ...networkPolicyPresets["forward-working"], hook: "input" });
  assert.equal(wrong.reason, "wrong-hook");
  assert.ok(wrong.packetResults.every(({ verdict, observedHook }) => verdict === "unseen" && observedHook === "unseen"));
});

test("accepts only the required new transit flow and its established reply", () => {
  const evaluation = evaluateNetworkPolicy(networkPolicyPresets["forward-working"]);
  assert.equal(evaluation.passed, true);
  assert.equal(
    evaluation.machine.chain.rules.find(({ id }) => id === "allow-established-related")?.description,
    "ct state established accept",
  );
  assert.deepEqual(
    evaluation.packetResults.map(({ packet, verdict, matchedRuleId }) => [packet.id, verdict, matchedRuleId]),
    [
      ["client-new-app-8080", "accept", "allow-required-new"],
      ["app-established-reply", "accept", "allow-established-related"],
      ["client-new-app-22", "drop", "deny-unmatched"],
      ["untrusted-new-app-8080", "drop", "deny-unmatched"],
      ["untracked-transit", "drop", "deny-unmatched"],
    ],
  );
});

test("accepts only admin SSH and established router-local replies in input mode", () => {
  const evaluation = evaluateNetworkPolicy(networkPolicyPresets["input-working"]);
  assert.equal(evaluation.passed, true);
  assert.deepEqual(
    evaluation.packetResults.map(({ packet, verdict }) => [packet.id, verdict]),
    [
      ["admin-new-router-22", "accept"],
      ["router-established-reply", "accept"],
      ["client-new-router-22", "drop"],
      ["admin-new-router-8080", "drop"],
      ["untracked-router-input", "drop"],
    ],
  );
});

test("requires specific and stateful allows before the terminal deny", () => {
  const misordered = evaluateNetworkPolicy({
    ...networkPolicyPresets["forward-working"],
    ruleOrder: "deny-specific-stateful",
  });
  assert.equal(misordered.reason, "deny-before-allow");
  assert.equal(misordered.checks["terminal-order"], false);
  assert.equal(misordered.packetResults[0].verdict, "drop");

  const stateless = evaluateNetworkPolicy({
    ...networkPolicyPresets["forward-working"],
    statefulRule: false,
  });
  assert.equal(stateless.reason, "missing-established-rule");
  assert.equal(stateless.checks["stateful-reply"], false);
  assert.equal(stateless.packetResults[1].verdict, "drop");
});

test("rejects overbroad source and port allows even when the required packet connects", () => {
  const anyPort = evaluateNetworkPolicy({
    ...networkPolicyPresets["forward-working"],
    allowScope: "any-port",
  });
  assert.equal(anyPort.reason, "overbroad-allow");
  assert.equal(anyPort.packetResults.find(({ packet }) => packet.id === "client-new-app-22")?.verdict, "accept");

  const anySource = evaluateNetworkPolicy({
    ...networkPolicyPresets["input-working"],
    allowScope: "any-source",
  });
  assert.equal(anySource.reason, "overbroad-allow");
  assert.equal(anySource.packetResults.find(({ packet }) => packet.id === "client-new-router-22")?.verdict, "accept");
});

test("keeps the fail-closed base-chain policy as a separate design invariant", () => {
  const explicitTerminalDeny = evaluateNetworkPolicy({
    ...networkPolicyPresets["input-working"],
    defaultPolicy: "accept",
  });
  assert.equal(explicitTerminalDeny.reason, "default-accept");
  assert.equal(explicitTerminalDeny.checks["unexpected-flows-denied"], true);
  assert.equal(explicitTerminalDeny.checks["default-deny"], false);

  const leak = evaluateNetworkPolicy({
    ...networkPolicyPresets["input-working"],
    defaultPolicy: "accept",
    terminalDeny: false,
  });
  assert.equal(leak.packetResults.find(({ packet }) => packet.id === "untracked-router-input")?.verdict, "accept");
  assert.equal(leak.checks["unexpected-flows-denied"], false);
});

test("projects wrong-hook, misordered, stateful-gap, and overbroad states", () => {
  assert.equal(buildNetworkPolicyVisualState(evaluateNetworkPolicy({ ...networkPolicyPresets["forward-working"], hook: "input" }), "failed").policyState, "wrong-hook");
  assert.equal(buildNetworkPolicyVisualState(evaluateNetworkPolicy({ ...networkPolicyPresets["forward-working"], ruleOrder: "deny-specific-stateful" }), "failed").policyState, "misordered");
  assert.equal(buildNetworkPolicyVisualState(evaluateNetworkPolicy({ ...networkPolicyPresets["forward-working"], statefulRule: false }), "failed").policyState, "stateful-gap");
  assert.equal(buildNetworkPolicyVisualState(evaluateNetworkPolicy({ ...networkPolicyPresets["forward-working"], allowScope: "any-port" }), "failed").policyState, "overbroad");
});

test("repairs four firewall incidents through the same evaluator", () => {
  assert.deepEqual(Object.keys(networkPolicyIncidentFixtures), [
    "service-rule-on-input",
    "deny-before-allow",
    "missing-established-reply",
    "default-accept-leak",
  ]);
  const passing = {
    "service-rule-on-input": "move-service-rule-to-forward",
    "deny-before-allow": "move-specific-allow-before-deny",
    "missing-established-reply": "add-established-related-rule",
    "default-accept-leak": "set-base-policy-drop",
  };
  const failing = {
    "service-rule-on-input": "open-router-input-service",
    "deny-before-allow": "change-base-policy-accept",
    "missing-established-reply": "allow-all-ephemeral-ports",
    "default-accept-leak": "deny-only-ssh",
  };
  for (const incidentId of Object.keys(passing)) {
    assert.equal(evaluateNetworkPolicyIncident(incidentId, passing[incidentId]).passed, true, incidentId);
    assert.equal(evaluateNetworkPolicyIncident(incidentId, failing[incidentId]).passed, false, incidentId);
  }
});

test("requires both policy modes, incidents, and concepts before completion", () => {
  const complete = {
    forwardPolicyComplete: true,
    inputPolicyComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteNetworkPolicyChapter(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(canCompleteNetworkPolicyChapter({ ...complete, [field]: false }), false, field);
  }
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  availabilityIncidentFixtures,
  availabilityPresets,
  canCompleteAvailabilityChapter,
  evaluateAvailability,
  evaluateAvailabilityIncident,
} from "../src/features/infrastructure/availability-failure-domains.ts";
import { buildAvailabilityVisualState } from "../src/features/infrastructure/availability-failure-domains-visual.ts";

test("serves 9,960 of 10,000 requests after a correlated zone failure in the working design", () => {
  for (const preset of ["domain-placement-working", "dependency-recovery-working"]) {
    const result = evaluateAvailability(availabilityPresets[preset]);
    assert.equal(result.passed, true);
    assert.equal(result.servedRequests, 9_960);
    assert.equal(result.lostRequests, 40);
    assert.equal(result.availabilityPercent, 99.6);
    assert.equal(result.targetPercent, 99.5);
  }
});

test("separates gateway, replica, standby, dependency, and recovery failures", () => {
  const working = availabilityPresets["dependency-recovery-working"];
  assert.equal(evaluateAvailability({ ...working, gatewayPlacement: "same-zone-a" }).reason, "gateway-correlated");
  assert.equal(evaluateAvailability({ ...working, replicaPlacement: "same-zone-a" }).reason, "replica-correlated");
  assert.equal(evaluateAvailability({ ...working, databasePlacement: "same-zone-standby" }).reason, "standby-correlated");
  assert.equal(evaluateAvailability({ ...working, optionalDependencyPolicy: "required" }).reason, "optional-dependency-cascade");
  assert.equal(evaluateAvailability({ ...working, recoverySeconds: 90 }).reason, "recovery-budget-exceeded");
});

test("masks failure verdict and availability arithmetic before execution", () => {
  const visual = buildAvailabilityVisualState(availabilityPresets["domain-placement-working"], null);
  assert.equal(visual.gradeState, "not-run");
  assert.equal(visual.availability, null);
  assert.equal(visual.failureDomain, "not-run");
  assert.ok(visual.checks.every(({ status }) => status === "not-run"));
  assert.ok(visual.nodes.filter(({ zone }) => zone === "a").every(({ active }) => active));
});

test("removes zone A nodes only after executing the failure trace", () => {
  const draft = availabilityPresets["domain-placement-working"];
  const visual = buildAvailabilityVisualState(draft, evaluateAvailability(draft));
  assert.ok(visual.nodes.filter(({ zone }) => zone === "a").every(({ active }) => !active));
  assert.ok(visual.nodes.filter(({ zone }) => zone !== "a").every(({ active }) => active));
});

test("publishes four incidents with one semantics-preserving repair each", () => {
  for (const [incidentId, fixture] of Object.entries(availabilityIncidentFixtures)) {
    const results = fixture.repairs.map((repair) => evaluateAvailabilityIncident(incidentId, repair));
    assert.equal(results.filter(({ passed }) => passed).length, 1);
  }
});

test("requires both modes, incidents, and concepts", () => {
  const complete = { placementComplete: true, recoveryComplete: true, incidentsComplete: true, conceptsMastered: true };
  assert.equal(canCompleteAvailabilityChapter(complete), true);
  for (const key of Object.keys(complete)) assert.equal(canCompleteAvailabilityChapter({ ...complete, [key]: false }), false);
});

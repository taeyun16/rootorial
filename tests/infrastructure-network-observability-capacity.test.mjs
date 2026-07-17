import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateCapacity,
  canCompleteNetworkObservabilityChapter,
  capacityScenarioFixtures,
  capacityScenarioIds,
  evaluateCapacityScenario,
  evaluateObservationEvidence,
  evaluateObservabilityIncident,
  observationEvidencePresets,
  observabilityIncidentFixtures,
  observabilityIncidentIds,
} from "../src/features/infrastructure/network-observability-capacity.ts";
import { buildNetworkObservabilityVisualState } from "../src/features/infrastructure/network-observability-capacity-visual.ts";

test("aligns four namespace-scoped receipts to one flow and window", () => {
  const result = evaluateObservationEvidence(observationEvidencePresets.aligned);
  assert.equal(result.passed, true);
  assert.equal(result.reason, "aligned");
  assert.equal(result.counterDelta, 32);
  assert.deepEqual(result.checks, {
    "required-probes": true,
    "correct-observation-scopes": true,
    "correct-observation-points": true,
    "same-flow": true,
    "same-window": true,
    "counter-delta": true,
    "measurements-match-claims": true,
    "bounded-claims": true,
  });
  assert.deepEqual(
    result.receipts.map(({ probeId, namespaceId }) => [probeId, namespaceId]),
    [
      ["client-route", "client"],
      ["edge-counter", "edge"],
      ["edge-capture", "edge"],
      ["app-sockets", "app"],
    ],
  );
});

test("rejects the scaffold at the first wrong observation scope", () => {
  const result = evaluateObservationEvidence(observationEvidencePresets.scaffold);
  assert.equal(result.passed, false);
  assert.equal(result.reason, "wrong-observation-scope");
  assert.equal(result.checks["correct-observation-scopes"], false);
  assert.equal(result.checks["bounded-claims"], false);
});

test("keeps missing probes, observation points, windows, measurements, and claims distinct", () => {
  const missing = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.slice(1),
  });
  assert.equal(missing.reason, "missing-probe");

  const mismatch = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.map((receipt) => receipt.probeId === "edge-capture"
      ? { ...receipt, flowKey: "request-18", windowId: "12:05-12:06" }
      : { ...receipt }),
  });
  assert.equal(mismatch.reason, "flow-window-mismatch");
  assert.equal(mismatch.checks["same-flow"], false);
  assert.equal(mismatch.checks["same-window"], false);

  const noDelta = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.map((receipt) => receipt.probeId === "edge-counter"
      ? { ...receipt, counterEnd: null }
      : { ...receipt }),
  });
  assert.equal(noDelta.reason, "absolute-counter-only");

  const wrongPoint = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.map((receipt) => receipt.probeId === "client-route"
      ? { ...receipt, pathStage: "app-ingress", interfaceId: "socket-table" }
      : { ...receipt }),
  });
  assert.equal(wrongPoint.reason, "wrong-observation-point");
  assert.equal(wrongPoint.checks["correct-observation-points"], false);

  const contradictoryCapture = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.map((receipt) => receipt.probeId === "edge-capture"
      ? { ...receipt, capturedPackets: 5 }
      : { ...receipt }),
  });
  assert.equal(contradictoryCapture.reason, "measurement-claim-mismatch");
  assert.equal(contradictoryCapture.checks["measurements-match-claims"], false);

  const broadCapture = evaluateObservationEvidence({
    receipts: observationEvidencePresets.aligned.receipts.map((receipt) => receipt.probeId === "edge-capture"
      ? { ...receipt, claim: "capture-absence-proves-global-silence" }
      : { ...receipt }),
  });
  assert.equal(broadCapture.reason, "capture-claim-too-broad");
});

test("calculates bandwidth, queue growth, and concurrent connections in their own units", () => {
  const bandwidth = calculateCapacity(capacityScenarioFixtures["bandwidth-saturation"].draft);
  assert.deepEqual(
    bandwidth.metrics.map(({ resource, demand, capacity, utilization, saturated }) => ({ resource, demand, capacity, utilization, saturated })),
    [
      { resource: "edge-bandwidth", demand: 128, capacity: 100, utilization: 1.28, saturated: true },
      { resource: "edge-queue", demand: 0, capacity: 64, utilization: 0, saturated: false },
      { resource: "app-connections", demand: 150, capacity: 400, utilization: 0.375, saturated: false },
    ],
  );

  const queue = calculateCapacity(capacityScenarioFixtures["burst-queue"].draft);
  assert.equal(queue.metrics.find(({ resource }) => resource === "edge-queue")?.demand, 100);
  assert.equal(queue.metrics.find(({ resource }) => resource === "edge-queue")?.utilization, 1.5625);

  const connections = calculateCapacity(capacityScenarioFixtures["connection-limit"].draft);
  assert.equal(connections.metrics.find(({ resource }) => resource === "app-connections")?.demand, 320);
  assert.equal(connections.metrics.find(({ resource }) => resource === "app-connections")?.utilization, 1.25);
});

test("treats exactly one hundred percent utilization as saturated", () => {
  const result = calculateCapacity({
    requestsPerSecond: 1_000,
    bytesPerTransaction: 12_500,
    linkMegabitsPerSecond: 100,
    averageConnectionMs: 100,
    connectionLimit: 500,
    burstPacketsPerSecond: 64,
    drainPacketsPerSecond: 0,
    burstSeconds: 1,
    queueLimitPackets: 64,
  });
  assert.equal(result.metrics[0].utilization, 1);
  assert.equal(result.metrics[0].saturated, true);
  assert.equal(result.metrics[1].utilization, 1);
  assert.equal(result.metrics[1].saturated, true);
  assert.equal(result.headroomReady, false);
});

test("rejects invalid or zero capacity values", () => {
  assert.throws(
    () => calculateCapacity({
      ...capacityScenarioFixtures["bandwidth-saturation"].draft,
      linkMegabitsPerSecond: 0,
    }),
    RangeError,
  );
  assert.throws(
    () => calculateCapacity({
      ...capacityScenarioFixtures["bandwidth-saturation"].draft,
      requestsPerSecond: -1,
    }),
    RangeError,
  );
});

test("assigns one unique limiting resource to each required scenario", () => {
  assert.deepEqual(
    capacityScenarioIds.map((scenarioId) => [
      scenarioId,
      calculateCapacity(capacityScenarioFixtures[scenarioId].draft).limitingResource,
    ]),
    [
      ["bandwidth-saturation", "edge-bandwidth"],
      ["burst-queue", "edge-queue"],
      ["connection-limit", "app-connections"],
    ],
  );
});

test("requires the correct prediction and a plan with thirty percent headroom", () => {
  const passing = [
    ["bandwidth-saturation", "edge-bandwidth", "upgrade-edge-link"],
    ["burst-queue", "edge-queue", "increase-drain-capacity"],
    ["connection-limit", "app-connections", "add-app-replica"],
  ];
  for (const [scenarioId, prediction, plan] of passing) {
    const result = evaluateCapacityScenario(scenarioId, prediction, plan);
    assert.equal(result.passed, true, scenarioId);
    assert.equal(result.predictionCorrect, true, scenarioId);
    assert.ok(result.planned.metrics.every(({ utilization }) => utilization <= 0.7), scenarioId);
  }

  assert.equal(evaluateCapacityScenario(
    "bandwidth-saturation",
    "edge-queue",
    "upgrade-edge-link",
  ).passed, false);
  assert.equal(evaluateCapacityScenario(
    "bandwidth-saturation",
    "edge-bandwidth",
    "increase-edge-queue",
  ).passed, false);
  assert.throws(
    () => evaluateCapacityScenario("burst-queue", "edge-queue", "upgrade-edge-link"),
    RangeError,
  );
});

test("masks ratios and the limiting resource before execution in the visual projector", () => {
  const evidence = evaluateObservationEvidence(observationEvidencePresets.scaffold);
  const capacity = calculateCapacity(capacityScenarioFixtures["bandwidth-saturation"].draft);
  const hidden = buildNetworkObservabilityVisualState({
    evidence,
    capacity,
    scenarioId: "bandwidth-saturation",
  });
  assert.equal(hidden.evidenceState, "unaligned");
  assert.equal(hidden.displayedBottleneck, "not-run");
  assert.ok(hidden.metrics.every(({ displayedUtilization, state }) => displayedUtilization === null && state === "not-run"));
  assert.deepEqual(
    hidden.probes.filter(({ namespaceId }) => namespaceId === "host").map(({ probeId }) => probeId),
    ["client-route", "edge-counter", "app-sockets"],
  );

  const scenario = evaluateCapacityScenario(
    "bandwidth-saturation",
    "edge-bandwidth",
    "upgrade-edge-link",
  );
  const revealed = buildNetworkObservabilityVisualState({
    evidence: evaluateObservationEvidence(observationEvidencePresets.aligned),
    capacity: scenario.planned,
    scenarioId: "bandwidth-saturation",
    baselineLimitingResource: scenario.baseline.limitingResource,
    evidenceGradeState: "passed",
    capacityGradeState: "passed",
  });
  assert.equal(revealed.evidenceState, "aligned");
  assert.equal(revealed.displayedBottleneck, "edge-bandwidth");
  assert.equal(revealed.metrics[0].displayedUtilization, 0.64);
  assert.equal(revealed.metrics[0].state, "headroom");
});

test("grades exactly one minimal repair for each observability incident", () => {
  const correct = {
    "wrong-namespace-ss": "inspect-app-sockets",
    "absolute-drop-counter": "compare-window-delta",
    "single-point-capture": "dual-capture-same-window",
    "queue-hides-overload": "increase-drain-service",
  };
  for (const incidentId of observabilityIncidentIds) {
    const fixture = observabilityIncidentFixtures[incidentId];
    const correctResult = evaluateObservabilityIncident(incidentId, correct[incidentId]);
    const decoy = fixture.repairOptions.find((repair) => repair !== correct[incidentId]);
    assert.equal(correctResult.passed, true, incidentId);
    assert.equal(evaluateObservabilityIncident(incidentId, decoy).passed, false, incidentId);
  }
});

test("requires every lab, incident, and concept completion signal", () => {
  const complete = {
    evidenceAlignmentComplete: true,
    bandwidthScenarioComplete: true,
    queueScenarioComplete: true,
    connectionScenarioComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteNetworkObservabilityChapter(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(canCompleteNetworkObservabilityChapter({ ...complete, [field]: false }), false, field);
  }
});

test("does not mutate shared evidence or capacity fixtures", () => {
  const evidenceBefore = structuredClone(observationEvidencePresets.aligned);
  const capacityBefore = structuredClone(capacityScenarioFixtures);
  evaluateObservationEvidence(observationEvidencePresets.aligned);
  evaluateCapacityScenario("connection-limit", "app-connections", "add-app-replica");
  assert.deepEqual(observationEvidencePresets.aligned, evidenceBefore);
  assert.deepEqual(capacityScenarioFixtures, capacityBefore);
});

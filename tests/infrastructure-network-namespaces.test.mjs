import assert from "node:assert/strict";
import test from "node:test";
import {
  canCompleteNetworkNamespacesChapter,
  createNamespaceMachine,
  evaluateLoopbackConnection,
  evaluateNamespaceIncident,
  evaluateNamespaceTopology,
  inspectNetworkNamespace,
  namespaceIncidentFixtures,
  namespaceTopologyPresets,
} from "../src/features/infrastructure/network-namespaces.ts";

test("keeps loopback and socket lookup local to the source process namespace", () => {
  const machine = createNamespaceMachine(namespaceTopologyPresets["working-boundaries"]);
  assert.deepEqual(machine.interfaces.map(({ id }) => id), ["host-lo", "app-lo", "data-lo"]);
  assert.equal(evaluateLoopbackConnection(machine, "app-probe", 8080).listener?.id, "app-listener");
  assert.equal(evaluateLoopbackConnection(machine, "data-probe", 5432).listener?.id, "data-listener");
  assert.deepEqual(
    evaluateLoopbackConnection(machine, "host-probe", 8080),
    {
      ok: false,
      reason: "connection-refused",
      sourceNamespaceId: "host",
      listener: null,
    },
  );
});

test("requires loopback to be up even when probe and listener share a namespace", () => {
  const machine = createNamespaceMachine(namespaceTopologyPresets["isolated-but-down"]);
  assert.equal(evaluateLoopbackConnection(machine, "app-probe", 8080).reason, "loopback-down");
  assert.equal(evaluateLoopbackConnection(machine, "data-probe", 5432).reason, "loopback-down");
});

test("grades a working namespace design from reachability and isolation invariants", () => {
  const evaluation = evaluateNamespaceTopology(namespaceTopologyPresets["working-boundaries"]);
  assert.equal(evaluation.passed, true);
  assert.deepEqual(evaluation.checks, {
    "separate-service-boundaries": true,
    "app-local-health": true,
    "data-local-health": true,
    "host-localhost-empty": true,
    "app-localhost-cannot-see-data": true,
  });
});

test("rejects a collapsed design even though local listeners can respond", () => {
  const evaluation = evaluateNamespaceTopology(namespaceTopologyPresets.collapsed);
  assert.equal(evaluation.passed, false);
  assert.equal(evaluation.checks["separate-service-boundaries"], false);
  assert.equal(evaluation.checks["host-localhost-empty"], false);
});

test("rejects listener ownership that differs from its service process boundary", () => {
  const evaluation = evaluateNamespaceTopology({
    ...namespaceTopologyPresets["working-boundaries"],
    appListenerNamespace: "host",
  });
  assert.equal(evaluation.passed, false);
  assert.equal(evaluation.checks["separate-service-boundaries"], false);
  assert.equal(evaluation.appHealth.reason, "connection-refused");
  assert.equal(evaluation.hostLocal8080.ok, true);
});

test("rejects crossed service labels instead of treating app and data namespaces as interchangeable", () => {
  const evaluation = evaluateNamespaceTopology({
    ...namespaceTopologyPresets["working-boundaries"],
    appProcessNamespace: "data",
    appProbeNamespace: "data",
    appListenerNamespace: "data",
    dataProcessNamespace: "app",
    dataProbeNamespace: "app",
    dataListenerNamespace: "app",
  });
  assert.equal(evaluation.passed, false);
  assert.equal(evaluation.checks["separate-service-boundaries"], false);
});

test("scopes inspection output to exactly one target namespace", () => {
  const machine = createNamespaceMachine(namespaceTopologyPresets["working-boundaries"]);
  const host = inspectNetworkNamespace(machine, "host");
  const app = inspectNetworkNamespace(machine, "app");
  assert.equal(host.listeners.length, 0);
  assert.deepEqual(app.listeners.map(({ id }) => id), ["app-listener"]);
  assert.ok(app.interfaces.every(({ namespaceId }) => namespaceId === "app"));
});

test("publishes four incidents with one semantics-preserving repair each", () => {
  assert.deepEqual(Object.keys(namespaceIncidentFixtures), [
    "wrong-inspection-context",
    "loopback-down",
    "socket-created-before-setns",
    "wildcard-stays-local",
  ]);
  const passingRepairs = {
    "wrong-inspection-context": "inspect-app",
    "loopback-down": "bring-app-loopback-up",
    "socket-created-before-setns": "recreate-listener-in-app",
    "wildcard-stays-local": "run-probe-in-app",
  };
  for (const [incidentId, repair] of Object.entries(passingRepairs)) {
    assert.equal(evaluateNamespaceIncident(incidentId, repair).passed, true, incidentId);
  }
});

test("rejects plausible repairs that erase or inspect the wrong boundary", () => {
  assert.equal(evaluateNamespaceIncident("wrong-inspection-context", "inspect-host").passed, false);
  assert.equal(evaluateNamespaceIncident("loopback-down", "move-probe-host").passed, false);
  assert.equal(evaluateNamespaceIncident("socket-created-before-setns", "enable-host-loopback").passed, false);
  assert.equal(evaluateNamespaceIncident("wildcard-stays-local", "bind-wildcard-on-host").passed, false);
});

test("does not let a wildcard listener cross a network namespace boundary", () => {
  const fixture = namespaceIncidentFixtures["wildcard-stays-local"];
  assert.equal(evaluateLoopbackConnection(fixture.machine, "app-probe", 8080).ok, true);
  assert.equal(evaluateLoopbackConnection(fixture.machine, "host-probe", 8080).ok, false);
});

test("requires topology, incident, and concept mastery together", () => {
  assert.equal(canCompleteNetworkNamespacesChapter({
    topologyLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteNetworkNamespacesChapter({
    topologyLabComplete: true,
    incidentsComplete: false,
    conceptsMastered: true,
  }), false);
});

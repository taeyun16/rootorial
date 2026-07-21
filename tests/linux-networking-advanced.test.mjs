import assert from "node:assert/strict";
import test from "node:test";
import {
  advancedLinuxNetworkingConfigs,
  advancedLinuxNetworkingSlugs,
  canCompleteAdvancedChapter,
  canCompleteAdvancedIncidents,
  evaluateAdvancedIncident,
  getAdvancedLinuxNetworkingConfig,
} from "../src/features/linux-networking/advanced-networking.ts";

test("defines four ordered advanced chapters with executable evidence contracts", () => {
  assert.deepEqual(advancedLinuxNetworkingSlugs, [
    "routes-and-packet-paths",
    "sockets-ports-and-tcp",
    "dns-and-service-reachability",
    "diagnose-a-linux-network",
  ]);
  assert.deepEqual(advancedLinuxNetworkingSlugs.map((slug) => getAdvancedLinuxNetworkingConfig(slug).number), [3, 4, 5, 6]);
  for (const slug of advancedLinuxNetworkingSlugs) {
    const config = advancedLinuxNetworkingConfigs[slug];
    assert.equal(config.figure.phases.length, 6);
    assert.equal(config.questions.length, 5);
    assert.ok(config.incidents.length >= 3);
    assert.equal(new Set(config.figure.phases.map(({ id }) => id)).size, 6);
    assert.equal(new Set(config.questions.map(({ id }) => id)).size, 5);
    assert.ok(config.figure.nodes.length >= 3);
    assert.ok(config.figure.edges.length >= 2);
    assert.match(config.linuxCommands, /ip |ss |getent|tcpdump|curl/);
  }
});

test("keeps every phase topology reference valid", () => {
  for (const slug of advancedLinuxNetworkingSlugs) {
    const config = getAdvancedLinuxNetworkingConfig(slug);
    const nodeIds = new Set(config.figure.nodes.map(({ id }) => id));
    const edgeIds = new Set(config.figure.edges.map(({ id }) => id));
    for (const edge of config.figure.edges) {
      assert.ok(nodeIds.has(edge.from), `${slug}: missing edge source ${edge.from}`);
      assert.ok(nodeIds.has(edge.to), `${slug}: missing edge target ${edge.to}`);
    }
    for (const phase of config.figure.phases) {
      for (const id of phase.activeNodes) assert.ok(nodeIds.has(id), `${slug}/${phase.id}: missing node ${id}`);
      for (const id of phase.activeEdges) assert.ok(edgeIds.has(id), `${slug}/${phase.id}: missing edge ${id}`);
    }
  }
});

test("requires the exact minimal repair for every advanced incident", () => {
  for (const slug of advancedLinuxNetworkingSlugs) {
    const config = getAdvancedLinuxNetworkingConfig(slug);
    const repairs = Object.fromEntries(config.incidents.map((incident) => [incident.id, incident.correctRepair]));
    assert.equal(canCompleteAdvancedIncidents(slug, repairs), true);
    for (const incident of config.incidents) {
      assert.equal(evaluateAdvancedIncident(slug, incident.id, incident.correctRepair), true);
      const wrong = incident.repairs.find((repair) => repair.id !== incident.correctRepair);
      assert.equal(evaluateAdvancedIncident(slug, incident.id, wrong.id), false);
    }
  }
});

test("gates completion on figure, incident, and concept mastery", () => {
  assert.equal(canCompleteAdvancedChapter({ figureComplete: true, incidentsComplete: true, conceptsMastered: true }), true);
  assert.equal(canCompleteAdvancedChapter({ figureComplete: false, incidentsComplete: true, conceptsMastered: true }), false);
  assert.equal(canCompleteAdvancedChapter({ figureComplete: true, incidentsComplete: false, conceptsMastered: true }), false);
  assert.equal(canCompleteAdvancedChapter({ figureComplete: true, incidentsComplete: true, conceptsMastered: false }), false);
});

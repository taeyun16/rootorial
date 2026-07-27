import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
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

test("advanced incident labs expose a deterministic 44-pixel reset", async () => {
  const source = await readFile(new URL("../src/components/linux-networking/AdvancedNetworkIncidentLab.tsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/components/linux-networking/advanced-networking.css", import.meta.url), "utf8");
  assert.match(source, /className="advanced-incident-reset"/);
  assert.match(source, /onClick=\{\(\) => setRepairs\(\{\}\)\}/);
  assert.doesNotMatch(source, /advanced-incident-reset[\s\S]{0,120}disabled=/);
  assert.match(css, /\.advanced-incident-reset \{[^}]*min-height: 44px;/);
});

test("advanced journey figures report zero executed states until the prediction unlocks evidence", async () => {
  const source = await readFile(
    new URL("../src/components/linux-networking/AdvancedNetworkJourneyFigure.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /const executedCount = predictionCorrect \? visited\.size : 0;/);
  assert.match(source, /`\$\{executedCount\} \/ \$\{phases\.length\}/);
});

test("DNS response evidence exposes the response body and status code together", () => {
  const config = getAdvancedLinuxNetworkingConfig("dns-and-service-reachability");
  const response = config.figure.phases.find(({ id }) => id === "response");

  assert.ok(response);
  assert.match(response.command, /curl -sS -w/);
  assert.deepEqual(response.output, ['{"status":"ok"}', "HTTP 200"]);
  assert.equal(response.facts.find(({ label }) => label.en === "HEALTH")?.value, "status=ok");
});

test("diagnostic response proof exposes the response body and status code together", () => {
  const config = getAdvancedLinuxNetworkingConfig("diagnose-a-linux-network");
  const response = config.figure.phases.find(({ id }) => id === "scope-response");

  assert.ok(response);
  assert.match(response.command, /curl -fsS -w/);
  assert.deepEqual(response.output, ['{"status":"ok"}', "HTTP 200"]);
  assert.equal(response.facts.find(({ label }) => label.en === "HTTP")?.value, "200");
});

test("DNS TTL copy distinguishes ordinary refresh from serve-stale exceptions", () => {
  const config = getAdvancedLinuxNetworkingConfig("dns-and-service-reachability");
  const ttlQuestion = config.questions.find(({ id }) => id === "ttl-role");
  const correct = ttlQuestion?.options.find(({ value }) => value === ttlQuestion.correctAnswer);

  assert.match(config.foundation.body.en, /serve-stale/);
  assert.match(correct?.label.en ?? "", /reconsult the source/);
  assert.doesNotMatch(correct?.label.en ?? "", /Maximum time/);
});

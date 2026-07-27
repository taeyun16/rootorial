import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  createNamespacePlatformEvidenceBundle,
  evaluateNamespacePlatformEvidenceBundle,
  namespacePlatformEvidenceAdapters,
  namespacePlatformEvidenceChapterIds,
} from "../src/features/infrastructure/namespace-platform-evidence.ts";
import {
  canCompleteNamespacePlatformChapter,
  cloneNamespacePlatformDraft,
  evaluateNamespacePlatform,
  evaluateNamespacePlatformIncident,
  evaluateNamespacePlatformScenario,
  namespacePlatformIncidentFixtures,
  namespacePlatformIncidentIds,
  namespacePlatformPresets,
  namespacePlatformScenarioIds,
} from "../src/features/infrastructure/namespace-platform.ts";
import { buildNamespacePlatformVisualState } from "../src/features/infrastructure/namespace-platform-visual.ts";

test("scopes FNV evidence fingerprints as non-cryptographic checksums", () => {
  const source = readFileSync(
    new URL("../src/components/infrastructure/NamespacePlatformChapter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /FNV-1a fingerprint is a non-cryptographic checksum/);
  assert.match(source, /not a signature, origin authentication, or security boundary/);
});

test("re-executes canonical evaluators from all seven prerequisite chapters", () => {
  const receipts = createNamespacePlatformEvidenceBundle();
  const result = evaluateNamespacePlatformEvidenceBundle(receipts);
  assert.equal(result.passed, true);
  assert.equal(result.reason, "verified");
  assert.deepEqual(receipts.map(({ chapterId }) => chapterId), namespacePlatformEvidenceChapterIds);
  assert.ok(receipts.every(({ schemaVersion, verdict, assertionCount, fingerprint }) =>
    schemaVersion === 1
    && verdict === "passed"
    && assertionCount > 0
    && /^fnv1a32:[0-9a-f]{8}$/.test(fingerprint)));
  assert.deepEqual(result.checks, {
    "complete-set": true,
    "unique-set": true,
    "current-schema": true,
    "current-revisions": true,
    "evaluators-passing": true,
    "receipts-authentic": true,
  });
});

test("keeps missing, duplicate, stale, tampered, and evaluator failures distinct", () => {
  const receipts = createNamespacePlatformEvidenceBundle();
  assert.equal(evaluateNamespacePlatformEvidenceBundle(receipts.slice(1)).reason, "missing-receipt");
  assert.equal(evaluateNamespacePlatformEvidenceBundle([...receipts, { ...receipts[0] }]).reason, "duplicate-receipt");
  assert.equal(evaluateNamespacePlatformEvidenceBundle([
    { ...receipts[0], adapterRevision: "network-namespaces-and-boundaries/v0" },
    ...receipts.slice(1),
  ]).reason, "stale-receipt");
  assert.equal(evaluateNamespacePlatformEvidenceBundle([
    { ...receipts[0], fingerprint: "fnv1a32:00000000" },
    ...receipts.slice(1),
  ]).reason, "tampered-receipt");

  const failedAdapters = {
    ...namespacePlatformEvidenceAdapters,
    "network-namespaces-and-boundaries": {
      ...namespacePlatformEvidenceAdapters["network-namespaces-and-boundaries"],
      run: () => [{
        fixtureId: "working-boundaries",
        passed: false,
        assertions: [{ id: "working-boundaries/evaluator-regression", passed: false }],
      }],
    },
  };
  const failedReceipts = createNamespacePlatformEvidenceBundle(failedAdapters);
  assert.equal(evaluateNamespacePlatformEvidenceBundle(failedReceipts, failedAdapters).reason, "evaluator-failed");
});

test("rejects duplicated or omitted canonical fixtures and malformed assertion identities", () => {
  const bridgeOnlyAdapters = {
    ...namespacePlatformEvidenceAdapters,
    "veth-bridges-and-routing": {
      ...namespacePlatformEvidenceAdapters["veth-bridges-and-routing"],
      run: () => {
        const [bridge] = namespacePlatformEvidenceAdapters["veth-bridges-and-routing"].run();
        return [bridge, structuredClone(bridge)];
      },
    },
  };
  const bridgeOnlyReceipts = createNamespacePlatformEvidenceBundle(bridgeOnlyAdapters);
  assert.equal(bridgeOnlyReceipts.find(({ chapterId }) => chapterId === "veth-bridges-and-routing")?.verdict, "failed");
  assert.equal(evaluateNamespacePlatformEvidenceBundle(bridgeOnlyReceipts, bridgeOnlyAdapters).reason, "evaluator-failed");

  const duplicateAssertionAdapters = {
    ...namespacePlatformEvidenceAdapters,
    "network-namespaces-and-boundaries": {
      ...namespacePlatformEvidenceAdapters["network-namespaces-and-boundaries"],
      run: () => [{
        fixtureId: "working-boundaries",
        passed: true,
        assertions: [
          { id: "working-boundaries/duplicate", passed: true },
          { id: "working-boundaries/duplicate", passed: true },
        ],
      }],
    },
  };
  const duplicateAssertionReceipts = createNamespacePlatformEvidenceBundle(duplicateAssertionAdapters);
  assert.equal(duplicateAssertionReceipts[0].verdict, "failed");
  assert.equal(evaluateNamespacePlatformEvidenceBundle(duplicateAssertionReceipts, duplicateAssertionAdapters).reason, "evaluator-failed");

  const emptyBridgeAssertionsAdapters = {
    ...namespacePlatformEvidenceAdapters,
    "veth-bridges-and-routing": {
      ...namespacePlatformEvidenceAdapters["veth-bridges-and-routing"],
      run: () => namespacePlatformEvidenceAdapters["veth-bridges-and-routing"].run()
        .map((run) => run.fixtureId === "bridge-working" ? { ...run, assertions: [] } : run),
    },
  };
  const emptyBridgeReceipts = createNamespacePlatformEvidenceBundle(emptyBridgeAssertionsAdapters);
  assert.equal(emptyBridgeReceipts.find(({ chapterId }) => chapterId === "veth-bridges-and-routing")?.verdict, "failed");
  assert.equal(evaluateNamespacePlatformEvidenceBundle(emptyBridgeReceipts, emptyBridgeAssertionsAdapters).reason, "evaluator-failed");
});

test("assembles a private four-namespace platform from verified evidence", () => {
  const result = evaluateNamespacePlatform(
    namespacePlatformPresets.working,
    createNamespacePlatformEvidenceBundle(),
  );
  assert.equal(result.passed, true);
  assert.equal(result.reason, "ready");
  assert.ok(Object.values(result.checks).every(Boolean));
  assert.ok(namespacePlatformScenarioIds.every((scenarioId) => result.scenarios[scenarioId].passed));
  assert.deepEqual(
    result.capacity.metrics.map(({ resource, demand, capacity, utilization }) => ({ resource, demand, capacity, utilization })),
    [
      { resource: "edge-bandwidth", demand: 86.4, capacity: 160, utilization: 0.54 },
      { resource: "edge-queue", demand: 100, capacity: 160, utilization: 0.625 },
      { resource: "app-connections", demand: 180, capacity: 300, utilization: 0.6 },
    ],
  );
});

test("traces normal ingress, private egress, zone failure, and peak load separately", () => {
  for (const scenarioId of namespacePlatformScenarioIds) {
    const result = evaluateNamespacePlatformScenario(namespacePlatformPresets.working, scenarioId);
    assert.equal(result.passed, true, scenarioId);
    assert.equal(result.reason, "ready", scenarioId);
    assert.ok(result.path.every(({ status }) => status === "passed"), scenarioId);
    assert.equal(result.capacity === null, scenarioId !== "peak-load");
  }
});

test("rejects every architecture boundary at its own failure reason", () => {
  const receipts = createNamespacePlatformEvidenceBundle();
  const cases = [
    [(draft) => ({ ...draft, listeners: [...draft.listeners, { id: "app-public", namespaceId: "app", address: "10.30.0.10", port: 443, exposure: "public", up: true }] }), "public-ingress-exposed"],
    [(draft) => ({ ...draft, namespaces: draft.namespaces.map((item) => item.id === "app" ? { ...item, addressScope: "public" } : item) }), "app-exposed"],
    [(draft) => ({ ...draft, namespaces: draft.namespaces.map((item) => item.id === "data" ? { ...item, addressScope: "public" } : item) }), "data-exposed"],
    [(draft) => ({ ...draft, routes: draft.routes.map((item) => item.id === "edge-app" ? { ...item, destinationPort: 8443 } : item) }), "edge-app-path-broken"],
    [(draft) => ({ ...draft, routes: draft.routes.filter((item) => item.id !== "app-data") }), "app-data-path-broken"],
    [(draft) => ({ ...draft, nat: { ...draft.nat, conntrackEnabled: false } }), "egress-state-missing"],
    [(draft) => ({ ...draft, placements: draft.placements.map((item) => ({ ...item, zone: "zone-a" })) }), "zone-a-correlated"],
    [(draft) => ({ ...draft, peakCapacity: { ...draft.peakCapacity, requestsPerSecond: 850 } }), "peak-rate-mismatch"],
    [(draft) => ({ ...draft, peakCapacity: { ...draft.peakCapacity, linkMegabitsPerSecond: 100 } }), "capacity-headroom-exceeded"],
  ];
  for (const [mutate, expectedReason] of cases) {
    const draft = mutate(cloneNamespacePlatformDraft(namespacePlatformPresets.working));
    assert.equal(evaluateNamespacePlatform(draft, receipts).reason, expectedReason);
  }
  assert.equal(evaluateNamespacePlatform(namespacePlatformPresets.working, receipts.slice(1)).reason, "evidence-invalid");
});

test("derives service paths from concrete listeners, routes, policy rules, discovery, NAT, and zones", () => {
  const receipts = createNamespacePlatformEvidenceBundle();
  const mutations = [
    ["ingress policy", (draft) => ({ ...draft, policyRules: draft.policyRules.filter((item) => item.id !== "allow-client-edge") }), "ingress-policy-missing"],
    ["listener port", (draft) => ({ ...draft, listeners: draft.listeners.map((item) => item.id === "app-http" ? { ...item, port: 8081 } : item) }), "edge-app-path-broken"],
    ["listener address ownership", (draft) => ({ ...draft, listeners: draft.listeners.map((item) => item.id === "app-http" ? { ...item, address: "10.40.0.10" } : item) }), "edge-app-path-broken"],
    ["route destination address", (draft) => ({ ...draft, routes: draft.routes.map((item) => item.id === "edge-app" ? { ...item, destinationAddress: "10.40.0.10" } : item) }), "edge-app-path-broken"],
    ["route via wrong namespace", (draft) => ({ ...draft, routes: draft.routes.map((item) => item.id === "edge-app" ? { ...item, viaNamespaceId: "data" } : item) }), "edge-app-path-broken"],
    ["policy destination port", (draft) => ({ ...draft, policyRules: draft.policyRules.map((item) => item.id === "allow-app-data" ? { ...item, destinationPort: 5433 } : item) }), "app-data-path-broken"],
    ["stateful reply rule", (draft) => ({ ...draft, policyRules: draft.policyRules.filter((item) => item.id !== "allow-data-reply") }), "stateful-policy-missing"],
    ["discovery endpoint", (draft) => ({ ...draft, serviceEndpoints: draft.serviceEndpoints.map((item) => item.name === "app.internal" ? { ...item, port: 8081 } : item) }), "service-discovery-broken"],
    ["NAT hook", (draft) => ({ ...draft, nat: { ...draft.nat, hook: "prerouting" } }), "egress-state-missing"],
    ["zone B data placement", (draft) => ({ ...draft, placements: draft.placements.filter((item) => !(item.namespaceId === "data" && item.zone === "zone-b")) }), "zone-a-correlated"],
  ];
  for (const [label, mutate, expectedReason] of mutations) {
    const draft = mutate(cloneNamespacePlatformDraft(namespacePlatformPresets.working));
    assert.equal(evaluateNamespacePlatform(draft, receipts).reason, expectedReason, label);
    if (label === "ingress policy") {
      const scenario = evaluateNamespacePlatformScenario(draft, "normal-request");
      assert.equal(scenario.passed, false);
      assert.equal(scenario.path[0].status, "blocked");
    }
  }
});

test("grades exactly one minimal repair for every platform incident", () => {
  for (const incidentId of namespacePlatformIncidentIds) {
    const fixture = namespacePlatformIncidentFixtures[incidentId];
    const results = fixture.repairOptions.map((repair) =>
      evaluateNamespacePlatformIncident(incidentId, repair));
    assert.equal(results.filter(({ passed }) => passed).length, 1, incidentId);
  }
});

test("masks scenario verdicts and capacity ratios until the learner runs them", () => {
  const hidden = buildNamespacePlatformVisualState({
    draft: namespacePlatformPresets.scaffold,
    scenarioId: "peak-load",
    scenario: null,
    evidence: null,
  });
  assert.equal(hidden.gradeState, "not-run");
  assert.equal(hidden.evidenceState, "not-run");
  assert.ok(hidden.receipts.every(({ status }) => status === "not-run"));
  assert.ok(hidden.edges.every(({ configured, state }) => configured === null && state === "not-run"));
  assert.ok(hidden.capacity.every(({ displayedUtilization, state }) =>
    displayedUtilization === null && state === "not-run"));

  const evidence = evaluateNamespacePlatformEvidenceBundle(createNamespacePlatformEvidenceBundle());
  const scenario = evaluateNamespacePlatformScenario(namespacePlatformPresets.working, "peak-load");
  const revealed = buildNamespacePlatformVisualState({
    draft: namespacePlatformPresets.working,
    scenarioId: "peak-load",
    scenario,
    evidence,
  });
  assert.equal(revealed.gradeState, "passed");
  assert.equal(revealed.evidenceState, "verified");
  assert.deepEqual(revealed.capacity.map(({ displayedUtilization }) => displayedUtilization), [0.54, 0.625, 0.6]);
});

test("projects post-run edge badges from the canonical platform checks", () => {
  const evidence = evaluateNamespacePlatformEvidenceBundle(createNamespacePlatformEvidenceBundle());
  const edgeStateAfter = (mutate, edgeId) => {
    const draft = mutate(cloneNamespacePlatformDraft(namespacePlatformPresets.working));
    return buildNamespacePlatformVisualState({
      draft,
      scenario: evaluateNamespacePlatformScenario(draft, "normal-request"),
      scenarioId: "normal-request",
      evidence,
    }).edges.find(({ id }) => id === edgeId);
  };

  const ready = buildNamespacePlatformVisualState({
    draft: namespacePlatformPresets.working,
    scenario: evaluateNamespacePlatformScenario(namespacePlatformPresets.working, "normal-request"),
    scenarioId: "normal-request",
    evidence,
  });
  assert.ok(ready.edges.every(({ configured, state }) => configured === true && state === "configured"));

  assert.deepEqual(
    edgeStateAfter(
      (draft) => ({ ...draft, policyRules: draft.policyRules.filter(({ id }) => id !== "allow-client-edge") }),
      "client-edge",
    ),
    { id: "client-edge", label: "tcp/443", configured: false, state: "broken" },
  );
  assert.deepEqual(
    edgeStateAfter(
      (draft) => ({
        ...draft,
        listeners: draft.listeners.map((item) => item.id === "app-http"
          ? { ...item, address: "10.40.0.10" }
          : item),
      }),
      "edge-app",
    ),
    { id: "edge-app", label: "tcp/8080", configured: false, state: "broken" },
  );
  assert.deepEqual(
    edgeStateAfter(
      (draft) => ({ ...draft, nat: { ...draft.nat, targetOwnedByRouter: false } }),
      "app-egress",
    ),
    { id: "app-egress", label: "NAT + conntrack", configured: false, state: "broken" },
  );
});

test("requires evidence, all four scenarios, incidents, and concepts for completion", () => {
  const complete = {
    evidenceComplete: true,
    normalRequestComplete: true,
    privateEgressComplete: true,
    zoneFailureComplete: true,
    peakLoadComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteNamespacePlatformChapter(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(canCompleteNamespacePlatformChapter({ ...complete, [field]: false }), false, field);
  }
});

test("does not mutate shared platform or evidence fixtures", () => {
  const platformBefore = structuredClone(namespacePlatformPresets);
  const receiptBefore = createNamespacePlatformEvidenceBundle();
  const receipts = structuredClone(receiptBefore);
  evaluateNamespacePlatform(namespacePlatformPresets.working, receipts);
  evaluateNamespacePlatformIncident("stateless-private-egress", "restore-edge-nat-conntrack");
  assert.deepEqual(namespacePlatformPresets, platformBefore);
  assert.deepEqual(receipts, receiptBefore);
});

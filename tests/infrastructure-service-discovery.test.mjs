import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  canCompleteServiceDiscoveryChapter,
  cloneServicePathDraft,
  evaluateServiceDiscoveryIncident,
  evaluateServicePath,
  selectServiceBackend,
  serviceDiscoveryIncidentFixtures,
  servicePathPresets,
  stableAffinityHash,
} from "../src/features/infrastructure/service-discovery.ts";
import { buildServicePathVisualState } from "../src/features/infrastructure/service-discovery-visual.ts";

test("honors the DNS TTL boundary and keeps both VIP generations available during the handoff", () => {
  const result = evaluateServicePath(servicePathPresets["dns-working"]);
  assert.equal(result.passed, true);
  assert.equal(result.reason, "connected");
  assert.deepEqual(
    [result.dns.beforeExpiry.atSeconds, result.dns.beforeExpiry.source, result.dns.beforeExpiry.address],
    [159, "cache", "10.40.0.10"],
  );
  assert.deepEqual(
    [result.dns.atExpiry.atSeconds, result.dns.atExpiry.source, result.dns.atExpiry.address],
    [160, "authority", "10.40.0.20"],
  );
  assert.equal(result.dns.beforeExpiry.vipAvailable, true);
  assert.equal(result.dns.atExpiry.vipAvailable, true);
});

test("does not invalidate a fresh cache merely because authority changed", () => {
  const result = evaluateServicePath({
    ...servicePathPresets["dns-working"],
    resolverPolicy: "refresh-early",
  });
  assert.equal(result.passed, false);
  assert.equal(result.reason, "refreshed-before-expiry");
  assert.equal(result.checks["cache-used-before-expiry"], false);
});

test("expires cached data exactly at cachedAt plus TTL", () => {
  const result = evaluateServicePath({
    ...servicePathPresets["dns-working"],
    resolverPolicy: "cache-forever",
  });
  assert.equal(result.reason, "expired-cache-reused");
  assert.equal(result.dns.atExpiry.cacheFresh, false);
  assert.equal(result.dns.atExpiry.source, "cache");
});

test("scopes the deterministic TTL exercise separately from RFC 8767 serve-stale", () => {
  const chapter = readFileSync(
    new URL("../src/components/infrastructure/ServiceDiscoveryChapter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chapter, /authority reachable · serve-stale off/);
  assert.match(chapter, /RFC 8767 permits limited reuse of expired data/);
});

test("requires the old VIP to remain available through the cache lifetime", () => {
  const result = evaluateServicePath({
    ...servicePathPresets["dns-working"],
    oldVipRetirementSeconds: 150,
  });
  assert.equal(result.reason, "old-vip-retired-before-ttl");
  assert.equal(result.checks["old-vip-retained-through-ttl"], false);
});

test("uses a stable unsigned affinity hash and immutable drafts", () => {
  assert.equal(stableAffinityHash("client-a"), stableAffinityHash("client-a"));
  assert.notEqual(stableAffinityHash("client-a"), stableAffinityHash("client-b"));
  const clone = cloneServicePathDraft(servicePathPresets["affinity-working"]);
  assert.notEqual(clone.backends, servicePathPresets["affinity-working"].backends);
  assert.deepEqual(clone.backends, servicePathPresets["affinity-working"].backends);
});

test("selects only healthy backends, keeps affinity, then remaps after failure", () => {
  const result = evaluateServicePath(servicePathPresets["affinity-working"]);
  assert.equal(result.passed, true);
  assert.deepEqual(result.balancing.initialEligibleBackendIds, ["app-a", "app-c"]);
  assert.equal(result.balancing.first.backendId, result.balancing.repeated.backendId);
  assert.notEqual(result.balancing.afterFailure.backendId, result.balancing.first.backendId);
  assert.equal(
    result.balancing.afterFailure.eligibleBackendIds.includes(result.balancing.failedBackendId),
    false,
  );
});

test("rejects all-registered membership, round robin affinity, and retained failed targets independently", () => {
  assert.equal(evaluateServicePath({
    ...servicePathPresets["affinity-working"],
    membershipPolicy: "all-registered",
  }).reason, "unhealthy-backend-selected");
  assert.equal(evaluateServicePath({
    ...servicePathPresets["affinity-working"],
    algorithm: "round-robin",
  }).reason, "affinity-broken");
  assert.equal(evaluateServicePath({
    ...servicePathPresets["affinity-working"],
    affinityFailurePolicy: "keep-ineligible",
  }).reason, "ineligible-affinity-retained");
});

test("fails closed when no healthy backend or listener remains", () => {
  const noHealthy = cloneServicePathDraft(servicePathPresets["affinity-working"]);
  noHealthy.backends = noHealthy.backends.map((backend) => ({ ...backend, health: "unhealthy" }));
  assert.equal(evaluateServicePath(noHealthy).reason, "no-healthy-backend");

  const noListener = cloneServicePathDraft(servicePathPresets["affinity-working"]);
  noListener.backends = noListener.backends.map((backend) => ({ ...backend, listenerUp: false }));
  assert.equal(evaluateServicePath(noListener).reason, "listener-missing");

  const selected = selectServiceBackend({
    draft: noHealthy,
    clientKey: "client-a",
    ordinal: 0,
  });
  assert.equal(selected.backendId, null);
});

test("masks executed path evidence until the learner runs the model", () => {
  const evaluation = evaluateServicePath(servicePathPresets["affinity-working"]);
  const masked = buildServicePathVisualState(evaluation);
  assert.equal(masked.gradeState, "not-run");
  assert.equal(masked.pathState, "not-run");
  assert.equal(masked.displayedReason, "not-run");
  assert.ok(masked.path.every(({ status, reason }) => status === "not-run" && reason === null));

  const revealed = buildServicePathVisualState(evaluation, "passed");
  assert.equal(revealed.pathState, "reachable");
  assert.ok(revealed.path.every(({ status }) => status === "passed"));
  assert.equal(
    revealed.backends.find(({ id }) => id === evaluation.balancing.failedBackendId)?.health,
    "unhealthy",
  );
  assert.equal(
    revealed.backends.find(({ id }) => id === evaluation.balancing.afterFailure.backendId)?.health,
    "healthy",
  );
});

test("publishes four service-path incidents with one semantics-preserving repair", () => {
  assert.deepEqual(Object.keys(serviceDiscoveryIncidentFixtures), [
    "expired-dns-cache",
    "health-check-wrong-scope",
    "unhealthy-backend-still-eligible",
    "affinity-to-retired-backend",
  ]);
  for (const fixture of Object.values(serviceDiscoveryIncidentFixtures)) {
    for (const repair of fixture.repairs) {
      assert.equal(
        evaluateServiceDiscoveryIncident(fixture.id, repair).passed,
        repair === fixture.correctRepair,
        `${fixture.id}:${repair}`,
      );
    }
  }
});

test("requires both service-path modes, incidents, and concepts before completion", () => {
  const complete = {
    dnsLifecycleComplete: true,
    healthAffinityComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteServiceDiscoveryChapter(complete), true);
  for (const field of Object.keys(complete)) {
    assert.equal(canCompleteServiceDiscoveryChapter({ ...complete, [field]: false }), false, field);
  }
});

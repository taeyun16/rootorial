import {
  availabilityPresets,
  evaluateAvailability,
} from "./availability-failure-domains.ts";
import { evaluateNatFlow, natFlowPresets } from "./egress-nat.ts";
import {
  evaluateNamespaceTopology,
  namespaceTopologyPresets,
} from "./network-namespaces.ts";
import {
  calculateCapacity,
  capacityScenarioFixtures,
  evaluateCapacityScenario,
  evaluateObservationEvidence,
  observationEvidencePresets,
} from "./network-observability-capacity.ts";
import {
  evaluateNetworkPolicy,
  networkPolicyPresets,
} from "./network-policy.ts";
import {
  evaluateServicePath,
  servicePathPresets,
} from "./service-discovery.ts";
import { evaluateVethTopology, vethTopologyPresets } from "./veth-routing.ts";

export const namespacePlatformEvidenceChapterIds = [
  "network-namespaces-and-boundaries",
  "veth-bridges-and-routing",
  "egress-nat-and-conntrack",
  "network-policy-and-firewalls",
  "service-discovery-and-load-balancing",
  "availability-and-failure-domains",
  "network-observability-and-capacity",
] as const;

export type NamespacePlatformEvidenceChapterId =
  (typeof namespacePlatformEvidenceChapterIds)[number];

export const NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION = 1 as const;

export type NamespacePlatformEvidenceAssertion = {
  id: string;
  passed: boolean;
};

export type NamespacePlatformEvidenceRun = {
  fixtureId: string;
  passed: boolean;
  assertions: readonly NamespacePlatformEvidenceAssertion[];
};

export type NamespacePlatformEvidenceAdapter = {
  revision: string;
  fixtureIds: readonly string[];
  run: () => readonly NamespacePlatformEvidenceRun[];
};

export type NamespacePlatformEvidenceAdapters = Readonly<
  Record<NamespacePlatformEvidenceChapterId, NamespacePlatformEvidenceAdapter>
>;

export type NamespacePlatformEvidenceReceipt = {
  schemaVersion: typeof NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION;
  chapterId: NamespacePlatformEvidenceChapterId;
  adapterRevision: string;
  fixtureIds: readonly string[];
  verdict: "passed" | "failed";
  assertionCount: number;
  fingerprint: string;
};

export type NamespacePlatformEvidenceBundleReason =
  | "verified"
  | "missing-receipt"
  | "duplicate-receipt"
  | "stale-receipt"
  | "tampered-receipt"
  | "evaluator-failed";

export type NamespacePlatformEvidenceBundleCheckId =
  | "complete-set"
  | "unique-set"
  | "current-schema"
  | "current-revisions"
  | "evaluators-passing"
  | "receipts-authentic";

export type NamespacePlatformEvidenceReceiptStatus = {
  chapterId: NamespacePlatformEvidenceChapterId;
  status: "verified" | "missing" | "duplicate" | "stale" | "tampered" | "evaluator-failed";
};

export type NamespacePlatformEvidenceBundleEvaluation = {
  passed: boolean;
  reason: NamespacePlatformEvidenceBundleReason;
  checks: Readonly<Record<NamespacePlatformEvidenceBundleCheckId, boolean>>;
  receiptStatuses: readonly NamespacePlatformEvidenceReceiptStatus[];
  receipts: readonly NamespacePlatformEvidenceReceipt[];
};

function assertionsFromChecks(
  fixtureId: string,
  checks: Readonly<Record<string, boolean>>,
): NamespacePlatformEvidenceAssertion[] {
  return Object.entries(checks)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([id, passed]) => ({ id: `${fixtureId}/${id}`, passed }));
}

function runFromChecks(
  fixtureId: string,
  passed: boolean,
  checks: Readonly<Record<string, boolean>>,
): NamespacePlatformEvidenceRun {
  return { fixtureId, passed, assertions: assertionsFromChecks(fixtureId, checks) };
}

function stageAssertions(
  fixtureId: string,
  stages: ReadonlyArray<{ id: string; status: string }>,
): NamespacePlatformEvidenceAssertion[] {
  return stages.map(({ id, status }) => ({
    id: `${fixtureId}/stage/${id}`,
    passed: status === "passed",
  }));
}

export const namespacePlatformEvidenceAdapters: NamespacePlatformEvidenceAdapters = {
  "network-namespaces-and-boundaries": {
    revision: "network-namespaces-and-boundaries/v1",
    fixtureIds: ["working-boundaries"],
    run: () => {
      const result = evaluateNamespaceTopology(namespaceTopologyPresets["working-boundaries"]);
      return [runFromChecks("working-boundaries", result.passed, result.checks)];
    },
  },
  "veth-bridges-and-routing": {
    revision: "veth-bridges-and-routing/v1",
    fixtureIds: ["bridge-working", "router-working"],
    run: () => (["bridge-working", "router-working"] as const).map((fixtureId) => {
      const result = evaluateVethTopology(vethTopologyPresets[fixtureId]);
      return runFromChecks(fixtureId, result.passed, result.checks);
    }),
  },
  "egress-nat-and-conntrack": {
    revision: "egress-nat-and-conntrack/v1",
    fixtureIds: ["snat-working", "masquerade-working"],
    run: () => (["snat-working", "masquerade-working"] as const).map((fixtureId) => {
      const result = evaluateNatFlow(natFlowPresets[fixtureId]);
      return {
        fixtureId,
        passed: result.passed,
        assertions: [
          { id: `${fixtureId}/connected`, passed: result.reason === "connected" },
          { id: `${fixtureId}/conntrack`, passed: result.conntrack?.state === "ESTABLISHED" },
          ...stageAssertions(fixtureId, result.stages),
        ],
      };
    }),
  },
  "network-policy-and-firewalls": {
    revision: "network-policy-and-firewalls/v1",
    fixtureIds: ["forward-working", "input-working"],
    run: () => (["forward-working", "input-working"] as const).map((fixtureId) => {
      const result = evaluateNetworkPolicy(networkPolicyPresets[fixtureId]);
      return runFromChecks(fixtureId, result.passed, result.checks);
    }),
  },
  "service-discovery-and-load-balancing": {
    revision: "service-discovery-and-load-balancing/v1",
    fixtureIds: ["dns-working", "affinity-working"],
    run: () => (["dns-working", "affinity-working"] as const).map((fixtureId) => {
      const result = evaluateServicePath(servicePathPresets[fixtureId]);
      return runFromChecks(fixtureId, result.passed, result.checks);
    }),
  },
  "availability-and-failure-domains": {
    revision: "availability-and-failure-domains/v1",
    fixtureIds: ["domain-placement-working", "dependency-recovery-working"],
    run: () => (["domain-placement-working", "dependency-recovery-working"] as const).map((fixtureId) => {
      const result = evaluateAvailability(availabilityPresets[fixtureId]);
      return {
        fixtureId,
        passed: result.passed,
        assertions: [
          ...result.checks.map(({ id, status }) => ({
            id: `${fixtureId}/${id}`,
            passed: status === "passed",
          })),
          { id: `${fixtureId}/target`, passed: result.availabilityPercent >= result.targetPercent },
        ],
      };
    }),
  },
  "network-observability-and-capacity": {
    revision: "network-observability-and-capacity/v1",
    fixtureIds: [
      "aligned-evidence",
      "bandwidth-saturation",
      "burst-queue",
      "connection-limit",
    ],
    run: () => {
      const evidence = evaluateObservationEvidence(observationEvidencePresets.aligned);
      const capacityRuns = ([
        ["bandwidth-saturation", "edge-bandwidth", "upgrade-edge-link"],
        ["burst-queue", "edge-queue", "increase-drain-capacity"],
        ["connection-limit", "app-connections", "add-app-replica"],
      ] as const).map(([fixtureId, prediction, plan]) => {
        // Invoke both exports: calculateCapacity establishes the fixture's current
        // limiting resource, while evaluateCapacityScenario grades the plan.
        const baseline = calculateCapacity(capacityScenarioFixtures[fixtureId].draft);
        const result = evaluateCapacityScenario(fixtureId, prediction, plan);
        return {
          fixtureId,
          passed: result.passed,
          assertions: [
            { id: `${fixtureId}/prediction`, passed: prediction === baseline.limitingResource },
            { id: `${fixtureId}/headroom`, passed: result.planned.headroomReady },
            ...result.planned.metrics.map(({ resource, utilization }) => ({
              id: `${fixtureId}/${resource}-headroom`,
              passed: utilization <= 0.7,
            })),
          ],
        };
      });
      return [
        runFromChecks("aligned-evidence", evidence.passed, evidence.checks),
        ...capacityRuns,
      ];
    },
  },
};

function canonicalRuns(adapter: NamespacePlatformEvidenceAdapter): readonly NamespacePlatformEvidenceRun[] {
  return adapter.run().map((run) => ({
    fixtureId: run.fixtureId,
    passed: run.passed,
    assertions: [...run.assertions]
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((assertion) => ({ ...assertion })),
  }));
}

function fingerprintEvidence(value: unknown): string {
  const serialized = JSON.stringify(value);
  let hash = 2166136261;
  for (let index = 0; index < serialized.length; index += 1) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return `fnv1a32:${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function createReceiptFromRuns(
  chapterId: NamespacePlatformEvidenceChapterId,
  adapter: NamespacePlatformEvidenceAdapter,
  runs: readonly NamespacePlatformEvidenceRun[],
): NamespacePlatformEvidenceReceipt {
  const fixtureIds = runs.map(({ fixtureId }) => fixtureId);
  const assertions = runs.flatMap(({ assertions: runAssertions }) => runAssertions);
  const fixtureIdsExact = fixtureIds.length === adapter.fixtureIds.length
    && new Set(fixtureIds).size === fixtureIds.length
    && fixtureIds.every((fixtureId, index) => fixtureId === adapter.fixtureIds[index]);
  const assertionIds = assertions.map(({ id }) => id);
  const assertionsWellFormed = runs.every(({ assertions: runAssertions }) => runAssertions.length > 0)
    && assertionIds.length > 0
    && assertionIds.every((id) => id.trim().length > 0)
    && new Set(assertionIds).size === assertionIds.length;
  const verdict = fixtureIdsExact
    && assertionsWellFormed
    && runs.every(({ passed, assertions: runAssertions }) => passed && runAssertions.every(({ passed: assertionPassed }) => assertionPassed))
    ? "passed"
    : "failed";
  return {
    schemaVersion: NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION,
    chapterId,
    adapterRevision: adapter.revision,
    fixtureIds,
    verdict,
    assertionCount: assertions.length,
    fingerprint: fingerprintEvidence({
      schemaVersion: NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION,
      chapterId,
      adapterRevision: adapter.revision,
      runs,
    }),
  };
}

export function createNamespacePlatformEvidenceReceipt(
  chapterId: NamespacePlatformEvidenceChapterId,
  adapters: NamespacePlatformEvidenceAdapters = namespacePlatformEvidenceAdapters,
): NamespacePlatformEvidenceReceipt {
  const adapter = adapters[chapterId];
  return createReceiptFromRuns(chapterId, adapter, canonicalRuns(adapter));
}

export function createNamespacePlatformEvidenceBundle(
  adapters: NamespacePlatformEvidenceAdapters = namespacePlatformEvidenceAdapters,
): NamespacePlatformEvidenceReceipt[] {
  return namespacePlatformEvidenceChapterIds.map((chapterId) =>
    createNamespacePlatformEvidenceReceipt(chapterId, adapters));
}

function cloneReceipt(receipt: NamespacePlatformEvidenceReceipt): NamespacePlatformEvidenceReceipt {
  return { ...receipt, fixtureIds: [...receipt.fixtureIds] };
}

export function evaluateNamespacePlatformEvidenceBundle(
  receiptsInput: readonly NamespacePlatformEvidenceReceipt[],
  adapters: NamespacePlatformEvidenceAdapters = namespacePlatformEvidenceAdapters,
): NamespacePlatformEvidenceBundleEvaluation {
  const receipts = receiptsInput.map(cloneReceipt);
  const byChapter = new Map<NamespacePlatformEvidenceChapterId, NamespacePlatformEvidenceReceipt[]>();
  for (const receipt of receipts) {
    const current = byChapter.get(receipt.chapterId) ?? [];
    current.push(receipt);
    byChapter.set(receipt.chapterId, current);
  }
  const completeSet = namespacePlatformEvidenceChapterIds.every((chapterId) => byChapter.has(chapterId));
  const uniqueSet = namespacePlatformEvidenceChapterIds.every((chapterId) => byChapter.get(chapterId)?.length === 1)
    && receipts.length === namespacePlatformEvidenceChapterIds.length;
  const currentSchema = receipts.every(({ schemaVersion }) => schemaVersion === NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION);
  const currentRevisions = receipts.every(({ chapterId, adapterRevision }) =>
    adapters[chapterId]?.revision === adapterRevision);

  const currentReceipts = new Map<NamespacePlatformEvidenceChapterId, NamespacePlatformEvidenceReceipt>();
  let evaluatorsPassing = true;
  for (const chapterId of namespacePlatformEvidenceChapterIds) {
    const adapter = adapters[chapterId];
    const runs = canonicalRuns(adapter);
    const receipt = createReceiptFromRuns(chapterId, adapter, runs);
    currentReceipts.set(chapterId, receipt);
    if (receipt.verdict !== "passed") evaluatorsPassing = false;
  }

  const receiptsAuthentic = completeSet && uniqueSet && currentSchema && currentRevisions
    && namespacePlatformEvidenceChapterIds.every((chapterId) => {
      const receipt = byChapter.get(chapterId)?.[0];
      const current = currentReceipts.get(chapterId);
      return Boolean(receipt && current
        && receipt.verdict === current.verdict
        && receipt.assertionCount === current.assertionCount
        && receipt.fingerprint === current.fingerprint
        && receipt.fixtureIds.length === current.fixtureIds.length
        && receipt.fixtureIds.every((fixtureId, index) => fixtureId === current.fixtureIds[index]));
    });

  let reason: NamespacePlatformEvidenceBundleReason = "verified";
  if (!completeSet) reason = "missing-receipt";
  else if (!uniqueSet) reason = "duplicate-receipt";
  else if (!currentSchema || !currentRevisions) reason = "stale-receipt";
  else if (!evaluatorsPassing) reason = "evaluator-failed";
  else if (!receiptsAuthentic) reason = "tampered-receipt";

  const receiptStatuses = namespacePlatformEvidenceChapterIds.map((chapterId): NamespacePlatformEvidenceReceiptStatus => {
    const chapterReceipts = byChapter.get(chapterId) ?? [];
    if (chapterReceipts.length === 0) return { chapterId, status: "missing" };
    if (chapterReceipts.length > 1) return { chapterId, status: "duplicate" };
    const receipt = chapterReceipts[0]!;
    if (receipt.schemaVersion !== NAMESPACE_PLATFORM_EVIDENCE_SCHEMA_VERSION
      || receipt.adapterRevision !== adapters[chapterId].revision) {
      return { chapterId, status: "stale" };
    }
    const current = currentReceipts.get(chapterId)!;
    if (current.verdict !== "passed") return { chapterId, status: "evaluator-failed" };
    const authentic = receipt.verdict === current.verdict
      && receipt.assertionCount === current.assertionCount
      && receipt.fingerprint === current.fingerprint
      && receipt.fixtureIds.length === current.fixtureIds.length
      && receipt.fixtureIds.every((fixtureId, index) => fixtureId === current.fixtureIds[index]);
    return { chapterId, status: authentic ? "verified" : "tampered" };
  });

  const checks: Record<NamespacePlatformEvidenceBundleCheckId, boolean> = {
    "complete-set": completeSet,
    "unique-set": uniqueSet,
    "current-schema": currentSchema,
    "current-revisions": currentRevisions,
    "evaluators-passing": evaluatorsPassing,
    "receipts-authentic": receiptsAuthentic,
  };
  return {
    passed: reason === "verified" && Object.values(checks).every(Boolean),
    reason,
    checks,
    receiptStatuses,
    receipts,
  };
}

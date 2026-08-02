export const touchTargetAuditScopeValues = [
  "specific-control",
  "component-scan",
  "page-visible-scan",
] as const;

export type TouchTargetAuditScope = typeof touchTargetAuditScopeValues[number];

/**
 * Declares the strongest 44px assertion scope present in each curriculum E2E file.
 *
 * - specific-control: a finite list of named controls is measured.
 * - component-scan: every matching control in one or more named components is measured.
 * - page-visible-scan: every currently visible enabled interactive target in the lesson is measured.
 */
export const touchTargetAuditScopeByE2EFile: Readonly<Record<string, TouchTargetAuditScope>> = {
  "e2e/attention.spec.ts": "component-scan",
  "e2e/embeddings.spec.ts": "component-scan",
  "e2e/infrastructure-availability-failure-domains.spec.ts": "page-visible-scan",
  "e2e/infrastructure-egress-nat.spec.ts": "page-visible-scan",
  "e2e/infrastructure-namespace-platform.spec.ts": "page-visible-scan",
  "e2e/infrastructure-network-namespaces.spec.ts": "page-visible-scan",
  "e2e/infrastructure-network-observability-capacity.spec.ts": "page-visible-scan",
  "e2e/infrastructure-network-policy.spec.ts": "page-visible-scan",
  "e2e/infrastructure-service-discovery.spec.ts": "page-visible-scan",
  "e2e/infrastructure-veth-routing.spec.ts": "page-visible-scan",
  "e2e/learning-flow.spec.ts": "page-visible-scan",
  "e2e/linux-assembly.spec.ts": "page-visible-scan",
  "e2e/linux-boot.spec.ts": "page-visible-scan",
  "e2e/linux-curriculum.spec.ts": "page-visible-scan",
  "e2e/linux-memory.spec.ts": "page-visible-scan",
  "e2e/linux-networking-chapter-routes.spec.ts": "page-visible-scan",
  "e2e/linux-networking-interfaces.spec.ts": "specific-control",
  "e2e/linux-networking.spec.ts": "specific-control",
  "e2e/linux-permissions.spec.ts": "page-visible-scan",
  "e2e/linux-processes.spec.ts": "page-visible-scan",
  "e2e/linux-storage.spec.ts": "specific-control",
  "e2e/mini-transformer.spec.ts": "specific-control",
  "e2e/neural-networks.spec.ts": "component-scan",
  "e2e/optimization.spec.ts": "component-scan",
  "e2e/self-attention.spec.ts": "specific-control",
  "e2e/sequences.spec.ts": "component-scan",
  "e2e/training.spec.ts": "component-scan",
  "e2e/transformer-block.spec.ts": "specific-control",
};


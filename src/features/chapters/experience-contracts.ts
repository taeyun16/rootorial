import { curricula, type Curriculum } from "../../data/curriculum.ts";

export type InteractionFamily =
  | "build-and-observe"
  | "compare-and-tune"
  | "predict-and-repair"
  | "trace-and-diagnose"
  | "trade-off-and-review";

export type VisualFamily =
  | "architecture-canvas"
  | "boundary-map"
  | "capacity-chart"
  | "causal-timeline"
  | "decision-surface"
  | "dependency-graph"
  | "evidence-ladder"
  | "matrix-heatmap"
  | "packet-path"
  | "state-machine"
  | "tensor-shape"
  | "trade-off-radar";

export type VisualizationKey =
  | "diagnostic-evidence-ladder"
  | "dns-ttl-timeline"
  | "route-prefix-bars"
  | "tcp-boundary-sequence";

export type ChapterExperienceContract = Readonly<{
  interaction: InteractionFamily;
  primaryVisual: VisualFamily;
  linkedEvidence: string;
  status: "implemented" | "planned";
  visualizationKey?: VisualizationKey;
}>;

export const curriculumExperienceTheses = Object.freeze({
  "transformer-from-zero": "Numeric tensor lab: manipulate values and keep shapes, matrices, loss, and code output linked.",
  "linux-systems": "Causal system trace: change one operating-system state and observe the resulting boundary transition.",
  "linux-networking": "Packet-path atlas: follow one unit of traffic while separating link, route, socket, name, and application evidence.",
  "infrastructure-design": "Topology and policy canvas: construct boundaries, inject failures, and verify the resulting reachability contract.",
  "system-architecture": "Trade-off and failure simulator: compare measurable quality attributes instead of selecting a universal best design.",
} satisfies Record<Curriculum["slug"], string>);

export const chapterExperienceContracts = Object.freeze({
  "transformer-from-zero/vectors": { interaction: "build-and-observe", primaryVisual: "tensor-shape", linkedEvidence: "geometry · array axes · code result", status: "implemented" },
  "transformer-from-zero/optimization": { interaction: "compare-and-tune", primaryVisual: "decision-surface", linkedEvidence: "loss curve · gradient · parameter update", status: "implemented" },
  "transformer-from-zero/neural-networks": { interaction: "build-and-observe", primaryVisual: "decision-surface", linkedEvidence: "hidden activation · boundary · BCE", status: "implemented" },
  "transformer-from-zero/training": { interaction: "predict-and-repair", primaryVisual: "causal-timeline", linkedEvidence: "batch · optimizer state · validation metric", status: "implemented" },
  "transformer-from-zero/embeddings": { interaction: "compare-and-tune", primaryVisual: "matrix-heatmap", linkedEvidence: "token row · vector space · cosine", status: "implemented" },
  "transformer-from-zero/sequences": { interaction: "trace-and-diagnose", primaryVisual: "state-machine", linkedEvidence: "time step · hidden state · temporal gradient", status: "implemented" },
  "transformer-from-zero/attention": { interaction: "build-and-observe", primaryVisual: "matrix-heatmap", linkedEvidence: "query score · softmax weight · context", status: "implemented" },
  "transformer-from-zero/self-attention": { interaction: "predict-and-repair", primaryVisual: "matrix-heatmap", linkedEvidence: "Q/K/V · causal mask · head output", status: "implemented" },
  "transformer-from-zero/transformer-block": { interaction: "trace-and-diagnose", primaryVisual: "dependency-graph", linkedEvidence: "residual path · normalization · shape ledger", status: "implemented" },
  "transformer-from-zero/mini-transformer": { interaction: "build-and-observe", primaryVisual: "dependency-graph", linkedEvidence: "tokenizer · block · logits · decode loop", status: "implemented" },

  "linux-systems/shell-and-filesystem": { interaction: "build-and-observe", primaryVisual: "boundary-map", linkedEvidence: "command · path · filesystem state", status: "implemented" },
  "linux-systems/boot-to-shell": { interaction: "predict-and-repair", primaryVisual: "causal-timeline", linkedEvidence: "firmware · kernel · rootfs · PID 1", status: "implemented" },
  "linux-systems/processes-and-signals": { interaction: "trace-and-diagnose", primaryVisual: "state-machine", linkedEvidence: "PID tree · scheduler event · stdio", status: "implemented" },
  "linux-systems/users-and-permissions": { interaction: "predict-and-repair", primaryVisual: "boundary-map", linkedEvidence: "credentials · path traversal · permission decision", status: "implemented" },
  "linux-systems/memory-and-virtual-addresses": { interaction: "trace-and-diagnose", primaryVisual: "boundary-map", linkedEvidence: "VA · PTE/TLB · frame · fault", status: "implemented" },
  "linux-systems/storage-and-filesystems": { interaction: "trace-and-diagnose", primaryVisual: "dependency-graph", linkedEvidence: "path · mount · inode · block · durability", status: "implemented" },
  "linux-systems/networking-from-a-packet": { interaction: "trace-and-diagnose", primaryVisual: "packet-path", linkedEvidence: "fd · route · frame · ACK · recv", status: "implemented" },
  "linux-systems/assemble-a-tiny-linux": { interaction: "build-and-observe", primaryVisual: "dependency-graph", linkedEvidence: "artifact · PID 1 · policy · readiness", status: "implemented" },

  "linux-networking/interfaces-addresses-and-loopback": { interaction: "build-and-observe", primaryVisual: "boundary-map", linkedEvidence: "interface · address · network view", status: "implemented" },
  "linux-networking/subnets-neighbors-and-gateways": { interaction: "predict-and-repair", primaryVisual: "packet-path", linkedEvidence: "prefix · next hop · neighbor · frame", status: "implemented" },
  "linux-networking/routes-and-packet-paths": { interaction: "trace-and-diagnose", primaryVisual: "packet-path", linkedEvidence: "prefix bars · selected route · TTL", status: "implemented", visualizationKey: "route-prefix-bars" },
  "linux-networking/sockets-ports-and-tcp": { interaction: "build-and-observe", primaryVisual: "causal-timeline", linkedEvidence: "process/kernel sequence · queue · recv", status: "implemented", visualizationKey: "tcp-boundary-sequence" },
  "linux-networking/dns-and-service-reachability": { interaction: "predict-and-repair", primaryVisual: "causal-timeline", linkedEvidence: "TTL timeline · route · TCP · response", status: "implemented", visualizationKey: "dns-ttl-timeline" },
  "linux-networking/diagnose-a-linux-network": { interaction: "trace-and-diagnose", primaryVisual: "evidence-ladder", linkedEvidence: "observation point · first failed boundary · repair proof", status: "implemented", visualizationKey: "diagnostic-evidence-ladder" },

  "infrastructure-design/network-namespaces-and-boundaries": { interaction: "build-and-observe", primaryVisual: "boundary-map", linkedEvidence: "namespace ownership · localhost · socket", status: "implemented" },
  "infrastructure-design/veth-bridges-and-routing": { interaction: "build-and-observe", primaryVisual: "architecture-canvas", linkedEvidence: "topology · forwarding · return path", status: "implemented" },
  "infrastructure-design/egress-nat-and-conntrack": { interaction: "trace-and-diagnose", primaryVisual: "state-machine", linkedEvidence: "original tuple · translated tuple · reply state", status: "implemented" },
  "infrastructure-design/network-policy-and-firewalls": { interaction: "predict-and-repair", primaryVisual: "dependency-graph", linkedEvidence: "hook order · verdict · stateful reply", status: "implemented" },
  "infrastructure-design/service-discovery-and-load-balancing": { interaction: "trace-and-diagnose", primaryVisual: "causal-timeline", linkedEvidence: "DNS TTL · health · backend selection", status: "implemented" },
  "infrastructure-design/availability-and-failure-domains": { interaction: "compare-and-tune", primaryVisual: "dependency-graph", linkedEvidence: "replica placement · correlated failure · failover budget", status: "implemented" },
  "infrastructure-design/network-observability-and-capacity": { interaction: "trace-and-diagnose", primaryVisual: "capacity-chart", linkedEvidence: "scope · counters · queue · limiting resource", status: "implemented" },
  "infrastructure-design/assemble-a-namespace-platform": { interaction: "build-and-observe", primaryVisual: "architecture-canvas", linkedEvidence: "isolation · ingress/egress · policy · capacity", status: "implemented" },

  "system-architecture/requirements-and-quality-attributes": { interaction: "trade-off-and-review", primaryVisual: "trade-off-radar", linkedEvidence: "quality target · constraint · acceptance metric", status: "planned" },
  "system-architecture/components-and-request-flows": { interaction: "build-and-observe", primaryVisual: "architecture-canvas", linkedEvidence: "responsibility · trust · failure boundary", status: "planned" },
  "system-architecture/data-ownership-and-source-of-truth": { interaction: "trade-off-and-review", primaryVisual: "dependency-graph", linkedEvidence: "writer ownership · replication · conflict", status: "planned" },
  "system-architecture/sync-async-and-idempotency": { interaction: "predict-and-repair", primaryVisual: "causal-timeline", linkedEvidence: "request path · queue · retry · duplicate", status: "planned" },
  "system-architecture/caching-and-consistency": { interaction: "compare-and-tune", primaryVisual: "causal-timeline", linkedEvidence: "latency · staleness · invalidation", status: "planned" },
  "system-architecture/capacity-scaling-and-partitioning": { interaction: "compare-and-tune", primaryVisual: "capacity-chart", linkedEvidence: "load · bottleneck · headroom · partition skew", status: "planned" },
  "system-architecture/reliability-observability-and-slos": { interaction: "predict-and-repair", primaryVisual: "dependency-graph", linkedEvidence: "fault injection · user impact · error budget", status: "planned" },
  "system-architecture/design-and-review-a-system": { interaction: "trade-off-and-review", primaryVisual: "architecture-canvas", linkedEvidence: "decision · metric · risk · review evidence", status: "planned" },
} satisfies Record<string, ChapterExperienceContract>);

export function catalogChapterIds() {
  return curricula.flatMap((curriculum) =>
    curriculum.chapters.en.map((chapter) => `${curriculum.slug}/${chapter.slug}`),
  );
}

export function auditExperienceContractCoverage() {
  const catalogIds = catalogChapterIds();
  const contractIds = Object.keys(chapterExperienceContracts);
  const contracts = Object.values(chapterExperienceContracts);
  return {
    missing: catalogIds.filter((id) => !(id in chapterExperienceContracts)),
    orphaned: contractIds.filter((id) => !catalogIds.includes(id)),
    implemented: contracts.filter((contract) => contract.status === "implemented").length,
    planned: contracts.filter((contract) => contract.status === "planned").length,
    total: contractIds.length,
  };
}

export function getChapterExperienceContract(chapterId: string): ChapterExperienceContract | undefined {
  return chapterId in chapterExperienceContracts
    ? chapterExperienceContracts[chapterId as keyof typeof chapterExperienceContracts]
    : undefined;
}

export const transformerChapterSlugs = [
  "vectors",
  "optimization",
  "neural-networks",
  "training",
  "embeddings",
  "sequences",
  "attention",
  "self-attention",
  "transformer-block",
  "mini-transformer",
] as const;

export type TransformerChapterSlug = typeof transformerChapterSlugs[number];

export type ChapterActivityKind =
  | "predict"
  | "build"
  | "experiment"
  | "debug"
  | "transfer"
  | "code";

export type ChapterActivity = {
  id: string;
  kind: ChapterActivityKind;
  runtime: "browser-model" | "python";
  component: string;
  gradedTasks: number;
  required: boolean;
};

export type EditorialReview = {
  conceptDepth: number;
  narrativeDensity: number;
  workedExamples: number;
  labAgency: number;
  conceptCheck: number;
  completionEvidence: number;
  crossChapterConnection: number;
};

export type LearningExperienceContract = {
  /** Number of concise, visible key-term explanations available at chapter entry. */
  terminologySupportCount: number;
  /** Whether learners can ask for clarification without hunting through navigation. */
  visibleClarificationAccess: boolean;
  /** Independently required completion groups, including the concept check. */
  requiredCheckpointGroups: number;
  /** Best-case successful actions needed to produce chapter completion evidence. */
  estimatedMinimumSuccessfulActions: number;
  /** Upper bound the chapter promises not to exceed on its core path. */
  maxAllowedInteractionBudget: number;
};

export type ChapterQualityContract = {
  number: number;
  title: string;
  sourceFile: string;
  e2eFile: string;
  expectedConceptQuestions: number;
  targetPythonCells: number;
  expectedDefaultPublication: "published" | "draft";
  activities: readonly ChapterActivity[];
  editorialReview: EditorialReview;
  learningExperience: LearningExperienceContract;
};

const activity = (
  id: string,
  kind: ChapterActivityKind,
  component: string,
  gradedTasks: number,
  required: boolean,
  runtime: ChapterActivity["runtime"] = "browser-model",
): ChapterActivity => ({ id, kind, component, gradedTasks, required, runtime });

export const transformerContentQualityContracts = {
  vectors: {
    number: 1,
    title: "벡터와 텐서",
    sourceFile: "src/components/VectorsChapter.tsx",
    e2eFile: "e2e/learning-flow.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "published",
    activities: [
      activity("vector-basics", "predict", "VectorBasicsLab", 3, false),
      activity("reshape-blocks", "build", "ReshapeBlocksLab", 3, true),
      activity("shape-debugging", "debug", "ShapeDebuggingLab", 3, false),
      activity("tensor-shape", "experiment", "TensorShapeExplorer", 0, false),
      activity("axis-builder", "build", "AxisBuilderLab", 3, true),
      activity("vector-explorer", "experiment", "VectorExplorer", 0, false),
      activity("independent-practice", "transfer", "VectorsPracticeDeck", 3, false),
      activity("vector-magnitude-python", "code", "NotebookCell", 0, false, "python"),
      activity("dot-product-python", "code", "NotebookCell", 0, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 3,
      estimatedMinimumSuccessfulActions: 17,
      maxAllowedInteractionBudget: 18,
    },
  },
  optimization: {
    number: 2,
    title: "학습과 최적화",
    sourceFile: "src/components/optimization/OptimizationChapter.tsx",
    e2eFile: "e2e/optimization.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("descent-repair", "experiment", "OptimizationDescentLab", 3, true),
      activity("update-debugger", "debug", "OptimizationDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "OptimizationPracticeDeck", 3, false),
      activity("numpy-trace", "code", "NotebookCell", 0, false, "python"),
      activity("gradient-repair", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
    },
  },
  "neural-networks": {
    number: 3,
    title: "분류와 신경망",
    sourceFile: "src/components/neural-networks/NeuralNetworksChapter.tsx",
    e2eFile: "e2e/neural-networks.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("xor-prediction", "predict", "NeuralNetworkXorLab", 1, true),
      activity("xor-builder", "build", "NeuralNetworkXorLab", 4, true),
      activity("hidden-backprop", "experiment", "NeuralNetworkBackpropLab", 3, true),
      activity("forward-debugger", "debug", "NeuralNetworkDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "NeuralNetworksPracticeDeck", 3, false),
      activity("linear-xor-python", "code", "NotebookCell", 0, false, "python"),
      activity("hidden-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 6,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 3,
      estimatedMinimumSuccessfulActions: 16,
      maxAllowedInteractionBudget: 18,
    },
  },
  training: {
    number: 4,
    title: "딥러닝 학습 구조",
    sourceFile: "src/components/training/TrainingChapter.tsx",
    e2eFile: "e2e/training.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("batch-prediction", "predict", "TrainingBatchLab", 2, true),
      activity("batch-experiment", "experiment", "TrainingBatchLab", 3, true),
      activity("loop-debugger", "debug", "TrainingLoopDebugger", 4, false),
      activity("independent-practice", "transfer", "TrainingPracticeDeck", 3, false),
      activity("softmax-axis-python", "code", "NotebookCell", 1, false, "python"),
      activity("adam-epoch-python", "code", "NotebookCell", 0, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
    },
  },
  embeddings: {
    number: 5,
    title: "토큰과 임베딩",
    sourceFile: "src/components/embeddings/EmbeddingsChapter.tsx",
    e2eFile: "e2e/embeddings.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("lookup-prediction", "predict", "EmbeddingLookupLab", 2, true),
      activity("lookup-experiment", "experiment", "EmbeddingLookupLab", 3, true),
      activity("embedding-debugger", "debug", "EmbeddingDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "EmbeddingsPracticeDeck", 3, false),
      activity("lookup-masked-mean-python", "code", "NotebookCell", 0, false, "python"),
      activity("scatter-add-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
    },
  },
  sequences: {
    number: 6,
    title: "순서가 있는 데이터",
    sourceFile: "src/components/sequences/SequencesChapter.tsx",
    e2eFile: "e2e/sequences.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("memory-prediction", "predict", "SequenceMemoryLab", 2, true),
      activity("memory-experiment", "experiment", "SequenceMemoryLab", 3, true),
      activity("sequence-debugger", "debug", "SequenceDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "SequencesPracticeDeck", 3, false),
      activity("batched-unroll-python", "code", "NotebookCell", 0, false, "python"),
      activity("temporal-gradient-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
    },
  },
  attention: {
    number: 7,
    title: "Attention",
    sourceFile: "src/components/attention/AttentionChapter.tsx",
    e2eFile: "e2e/attention.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("attention-prediction", "predict", "AttentionPipelineExplorer", 2, true),
      activity("attention-experiment", "experiment", "AttentionPipelineExplorer", 3, true),
      activity("attention-debugger", "debug", "AttentionDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "AttentionPracticeDeck", 3, false),
      activity("three-query-routing-python", "code", "NotebookCell", 0, false, "python"),
      activity("value-read-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
    },
  },
  "self-attention": {
    number: 8,
    title: "Self-Attention",
    sourceFile: "src/components/self-attention/SelfAttentionChapter.tsx",
    e2eFile: "e2e/self-attention.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("self-attention-core-challenges", "experiment", "SelfAttentionLab", 3, true),
      activity("self-attention-extension-challenges", "transfer", "SelfAttentionLab", 2, false),
      activity("self-attention-debugger", "debug", "SelfAttentionDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "SelfAttentionPracticeDeck", 3, false),
      activity("self-attention-forward-python", "code", "NotebookCell", 0, false, "python"),
      activity("self-attention-mask-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 15,
      maxAllowedInteractionBudget: 16,
    },
  },
  "transformer-block": {
    number: 9,
    title: "Transformer 블록",
    sourceFile: "src/components/transformer-block/TransformerBlockChapter.tsx",
    e2eFile: "e2e/transformer-block.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("block-core-challenges", "build", "TransformerBlockLab", 3, true),
      activity("block-extension-challenges", "transfer", "TransformerBlockLab", 2, false),
      activity("block-debugger", "debug", "TransformerBlockDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "TransformerBlockPracticeDeck", 3, false),
      activity("block-ledger-python", "code", "NotebookCell", 0, false, "python"),
      activity("second-residual-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 15,
      maxAllowedInteractionBudget: 16,
    },
  },
  "mini-transformer": {
    number: 10,
    title: "Mini Transformer",
    sourceFile: "src/components/mini-transformer/MiniTransformerChapter.tsx",
    e2eFile: "e2e/mini-transformer.spec.ts",
    expectedConceptQuestions: 5,
    targetPythonCells: 2,
    expectedDefaultPublication: "draft",
    activities: [
      activity("mini-transformer-core-challenges", "build", "MiniTransformerLab", 3, true),
      activity("mini-transformer-extension-challenges", "transfer", "MiniTransformerLab", 2, false),
      activity("mini-transformer-debugger", "debug", "MiniTransformerDebuggerLab", 4, false),
      activity("independent-practice", "transfer", "MiniTransformerPracticeDeck", 3, false),
      activity("lm-head-update-python", "code", "NotebookCell", 0, false, "python"),
      activity("generation-controller-repair-python", "code", "NotebookCell", 1, false, "python"),
    ],
    editorialReview: {
      conceptDepth: 5,
      narrativeDensity: 5,
      workedExamples: 5,
      labAgency: 5,
      conceptCheck: 5,
      completionEvidence: 5,
      crossChapterConnection: 5,
    },
    learningExperience: {
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 15,
      maxAllowedInteractionBudget: 16,
    },
  },
} as const satisfies Record<TransformerChapterSlug, ChapterQualityContract>;

export const transformerContentQualityReview = {
  reviewedAt: "2026-07-16",
  scale: "0-5 per editorial dimension; Python score is derived from executable cells",
  contracts: transformerContentQualityContracts,
} as const;

export type PlatformChapterQualityContract = {
  chapterId: string;
  number: number;
  title: string;
  sourceFile: string;
  e2eFile: string;
  expectedConceptQuestions: number;
  expectedDefaultPublication: "published" | "draft";
  activityKinds: readonly ChapterActivityKind[];
  learningExperience: LearningExperienceContract;
};

const platformContract = (
  chapterId: string,
  number: number,
  title: string,
  sourceFile: string,
  e2eFile: string,
  activityKinds: readonly ChapterActivityKind[],
  estimatedMinimumSuccessfulActions: number,
  maxAllowedInteractionBudget = 18,
  expectedDefaultPublication: "published" | "draft" = "draft",
): PlatformChapterQualityContract => ({
  chapterId,
  number,
  title,
  sourceFile,
  e2eFile,
  expectedConceptQuestions: 5,
  expectedDefaultPublication,
  activityKinds,
  learningExperience: {
    terminologySupportCount: 5,
    visibleClarificationAccess: true,
    requiredCheckpointGroups: 3,
    estimatedMinimumSuccessfulActions,
    maxAllowedInteractionBudget,
  },
});

/**
 * Shared platform contracts for every implemented non-Transformer chapter.
 *
 * These contracts deliberately describe the learner's core path rather than
 * every optional control. The quality report cross-checks them against the
 * renderer, question registry, publication boundary, shared chapter compass,
 * and native-control policy.
 */
export const platformContentQualityContracts = {
  "linux-systems/shell-and-filesystem": platformContract(
    "linux-systems/shell-and-filesystem", 1, "셸에서 첫 파일까지",
    "src/components/linux/LinuxShellChapter.tsx", "e2e/linux-curriculum.spec.ts",
    ["build", "debug", "transfer"], 12, 16, "published",
  ),
  "linux-systems/boot-to-shell": platformContract(
    "linux-systems/boot-to-shell", 2, "전원이 켜지고 셸이 뜨기까지",
    "src/components/linux/LinuxBootChapter.tsx", "e2e/linux-boot.spec.ts",
    ["predict", "debug", "transfer"], 16,
  ),
  "linux-systems/processes-and-signals": platformContract(
    "linux-systems/processes-and-signals", 3, "프로세스와 시그널",
    "src/components/linux/LinuxProcessesChapter.tsx", "e2e/linux-processes.spec.ts",
    ["experiment", "debug", "transfer"], 17,
  ),
  "linux-systems/users-and-permissions": platformContract(
    "linux-systems/users-and-permissions", 4, "사용자와 권한",
    "src/components/linux/LinuxPermissionsChapter.tsx", "e2e/linux-permissions.spec.ts",
    ["predict", "debug", "transfer"], 17,
  ),
  "linux-systems/memory-and-virtual-addresses": platformContract(
    "linux-systems/memory-and-virtual-addresses", 5, "메모리와 가상 주소",
    "src/components/linux/LinuxMemoryChapter.tsx", "e2e/linux-memory.spec.ts",
    ["experiment", "debug", "transfer"], 17,
  ),
  "linux-systems/storage-and-filesystems": platformContract(
    "linux-systems/storage-and-filesystems", 6, "저장장치와 파일시스템",
    "src/components/linux/LinuxStorageChapter.tsx", "e2e/linux-storage.spec.ts",
    ["experiment", "debug", "transfer"], 17,
  ),
  "linux-systems/networking-from-a-packet": platformContract(
    "linux-systems/networking-from-a-packet", 7, "패킷 하나로 보는 Linux 네트워킹",
    "src/components/linux/LinuxNetworkingChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "experiment", "debug"], 17,
  ),
  "linux-systems/assemble-a-tiny-linux": platformContract(
    "linux-systems/assemble-a-tiny-linux", 8, "작은 Linux 시스템 조립하기",
    "src/components/linux/LinuxTinySystemChapter.tsx", "e2e/linux-assembly.spec.ts",
    ["build", "debug", "transfer"], 18,
  ),

  "linux-networking/interfaces-addresses-and-loopback": platformContract(
    "linux-networking/interfaces-addresses-and-loopback", 1, "인터페이스, 주소와 loopback",
    "src/components/linux-networking/InterfacesAddressesLoopbackChapter.tsx", "e2e/linux-networking-interfaces.spec.ts",
    ["build", "experiment", "debug"], 17,
  ),
  "linux-networking/subnets-neighbors-and-gateways": platformContract(
    "linux-networking/subnets-neighbors-and-gateways", 2, "서브넷, 이웃과 게이트웨이",
    "src/components/linux-networking/SubnetsNeighborsGatewaysChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "experiment", "debug"], 17,
  ),
  "linux-networking/routes-and-packet-paths": platformContract(
    "linux-networking/routes-and-packet-paths", 3, "경로와 패킷 전달",
    "src/components/linux-networking/AdvancedLinuxNetworkingChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "experiment", "debug"], 17,
  ),
  "linux-networking/sockets-ports-and-tcp": platformContract(
    "linux-networking/sockets-ports-and-tcp", 4, "소켓, 포트와 TCP",
    "src/components/linux-networking/AdvancedLinuxNetworkingChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "build", "debug"], 17,
  ),
  "linux-networking/dns-and-service-reachability": platformContract(
    "linux-networking/dns-and-service-reachability", 5, "DNS와 서비스 도달성",
    "src/components/linux-networking/AdvancedLinuxNetworkingChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "experiment", "transfer"], 17,
  ),
  "linux-networking/diagnose-a-linux-network": platformContract(
    "linux-networking/diagnose-a-linux-network", 6, "Linux 네트워크 진단",
    "src/components/linux-networking/AdvancedLinuxNetworkingChapter.tsx", "e2e/linux-networking.spec.ts",
    ["predict", "debug", "transfer"], 17,
  ),

  "infrastructure-design/network-namespaces-and-boundaries": platformContract(
    "infrastructure-design/network-namespaces-and-boundaries", 1, "네트워크 namespace와 경계",
    "src/components/infrastructure/NetworkNamespacesChapter.tsx", "e2e/infrastructure-network-namespaces.spec.ts",
    ["build", "experiment", "debug"], 17,
  ),
  "infrastructure-design/veth-bridges-and-routing": platformContract(
    "infrastructure-design/veth-bridges-and-routing", 2, "veth, bridge와 routing",
    "src/components/infrastructure/VethRoutingChapter.tsx", "e2e/infrastructure-veth-routing.spec.ts",
    ["build", "experiment", "debug"], 18,
  ),
  "infrastructure-design/egress-nat-and-conntrack": platformContract(
    "infrastructure-design/egress-nat-and-conntrack", 3, "Egress NAT와 conntrack",
    "src/components/infrastructure/EgressNatChapter.tsx", "e2e/infrastructure-egress-nat.spec.ts",
    ["predict", "experiment", "debug"], 18,
  ),
  "infrastructure-design/network-policy-and-firewalls": platformContract(
    "infrastructure-design/network-policy-and-firewalls", 4, "네트워크 정책과 방화벽",
    "src/components/infrastructure/NetworkPolicyChapter.tsx", "e2e/infrastructure-network-policy.spec.ts",
    ["predict", "build", "debug"], 18,
  ),
  "infrastructure-design/service-discovery-and-load-balancing": platformContract(
    "infrastructure-design/service-discovery-and-load-balancing", 5, "서비스 디스커버리와 로드밸런싱",
    "src/components/infrastructure/ServiceDiscoveryChapter.tsx", "e2e/infrastructure-service-discovery.spec.ts",
    ["predict", "experiment", "debug"], 18,
  ),
  "infrastructure-design/availability-and-failure-domains": platformContract(
    "infrastructure-design/availability-and-failure-domains", 6, "가용성과 장애 도메인",
    "src/components/infrastructure/AvailabilityFailureDomainsChapter.tsx", "e2e/infrastructure-availability-failure-domains.spec.ts",
    ["predict", "experiment", "transfer"], 18,
  ),
  "infrastructure-design/network-observability-and-capacity": platformContract(
    "infrastructure-design/network-observability-and-capacity", 7, "네트워크 관측성과 용량",
    "src/components/infrastructure/NetworkObservabilityCapacityChapter.tsx", "e2e/infrastructure-network-observability-capacity.spec.ts",
    ["predict", "experiment", "debug"], 18,
  ),
  "infrastructure-design/assemble-a-namespace-platform": platformContract(
    "infrastructure-design/assemble-a-namespace-platform", 8, "Namespace 플랫폼 조립하기",
    "src/components/infrastructure/NamespacePlatformChapter.tsx", "e2e/infrastructure-namespace-platform.spec.ts",
    ["build", "debug", "transfer"], 18,
  ),
} as const satisfies Record<string, PlatformChapterQualityContract>;

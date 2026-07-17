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
      activity("forward-debugger", "debug", "NeuralNetworkDebuggerLab", 4, false),
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
      terminologySupportCount: 5,
      visibleClarificationAccess: true,
      requiredCheckpointGroups: 2,
      estimatedMinimumSuccessfulActions: 13,
      maxAllowedInteractionBudget: 16,
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

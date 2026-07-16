export type BinaryInput = readonly [number, number];

export type ActivationId = "identity" | "sigmoid" | "relu";
export type HiddenFeatureId = "or" | "and" | "nand" | "x1" | "x2" | "off";
export type OutputHeadId = "xor" | "or" | "same-sign" | "inverted";
export type ProbabilityHeadId = "sigmoid" | "identity" | "tanh";

export type XorNetworkConfig = {
  activation: ActivationId;
  hiddenFeatures: readonly [HiddenFeatureId, HiddenFeatureId];
  outputHead: OutputHeadId;
};

export type XorForwardRow = {
  input: BinaryInput;
  label: 0 | 1;
  hiddenPreActivation: readonly [number, number];
  hiddenActivation: readonly [number, number];
  logit: number;
  probability: number;
  predictedClass: 0 | 1;
  loss: number;
};

export type XorNetworkRun = {
  config: XorNetworkConfig;
  rows: XorForwardRow[];
  accuracy: number;
  correctCount: number;
  meanLoss: number;
  finite: boolean;
};

export type XorMastery = {
  mastered: boolean;
  reason:
    | "mastered"
    | "truth-table"
    | "confidence"
    | "hidden-one-unused"
    | "hidden-two-unused"
    | "non-finite";
  ablatedCorrectCounts: readonly [number, number];
};

export const xorDataset = [
  { input: [0, 0] as const, label: 0 as const },
  { input: [0, 1] as const, label: 1 as const },
  { input: [1, 0] as const, label: 1 as const },
  { input: [1, 1] as const, label: 0 as const },
] as const;

export const brokenXorConfig: XorNetworkConfig = {
  activation: "identity",
  hiddenFeatures: ["or", "and"],
  outputHead: "xor",
};

export const collapsedXorConfig: XorNetworkConfig = {
  activation: "identity",
  hiddenFeatures: ["or", "nand"],
  outputHead: "xor",
};

export const saturatedXorConfig: XorNetworkConfig = {
  activation: "sigmoid",
  hiddenFeatures: ["or", "nand"],
  outputHead: "inverted",
};

export const referenceXorConfig: XorNetworkConfig = {
  activation: "sigmoid",
  hiddenFeatures: ["or", "nand"],
  outputHead: "xor",
};

type AffineUnit = {
  weights: BinaryInput;
  bias: number;
};

const hiddenFeatureParameters: Record<HiddenFeatureId, AffineUnit> = {
  or: { weights: [8, 8], bias: -4 },
  and: { weights: [8, 8], bias: -12 },
  nand: { weights: [-8, -8], bias: 12 },
  x1: { weights: [8, 0], bias: -4 },
  x2: { weights: [0, 8], bias: -4 },
  off: { weights: [0, 0], bias: -20 },
};

const outputHeadParameters: Record<OutputHeadId, AffineUnit> = {
  xor: { weights: [8, 8], bias: -12 },
  or: { weights: [8, 8], bias: -4 },
  "same-sign": { weights: [8, -8], bias: 0 },
  inverted: { weights: [-8, -8], bias: 12 },
};

export function stableSigmoid(value: number) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponential = Math.exp(value);
  return exponential / (1 + exponential);
}

export function applyActivation(value: number, activation: ActivationId) {
  if (activation === "sigmoid") return stableSigmoid(value);
  if (activation === "relu") return Math.max(0, value);
  return value;
}

export function binaryCrossEntropy(
  probability: number,
  label: 0 | 1,
) {
  const epsilon = 1e-7;
  const safeProbability = Math.min(1 - epsilon, Math.max(epsilon, probability));
  return -(
    label * Math.log(safeProbability)
    + (1 - label) * Math.log(1 - safeProbability)
  );
}

function affine(input: BinaryInput, unit: AffineUnit) {
  return input[0] * unit.weights[0] + input[1] * unit.weights[1] + unit.bias;
}

function resolveNetwork(config: XorNetworkConfig) {
  const hiddenOne = hiddenFeatureParameters[config.hiddenFeatures[0]];
  const hiddenTwo = hiddenFeatureParameters[config.hiddenFeatures[1]];
  const output = outputHeadParameters[config.outputHead];
  return { hiddenOne, hiddenTwo, output };
}

function forwardRows(
  config: XorNetworkConfig,
  outputWeightMask: readonly [number, number] = [1, 1],
  probabilityHead: ProbabilityHeadId = "sigmoid",
) {
  const { hiddenOne, hiddenTwo, output } = resolveNetwork(config);
  return xorDataset.map(({ input, label }) => {
    const hiddenPreActivation = [
      affine(input, hiddenOne),
      affine(input, hiddenTwo),
    ] as const;
    const hiddenActivation = [
      applyActivation(hiddenPreActivation[0], config.activation),
      applyActivation(hiddenPreActivation[1], config.activation),
    ] as const;
    const logit = hiddenActivation[0] * output.weights[0] * outputWeightMask[0]
      + hiddenActivation[1] * output.weights[1] * outputWeightMask[1]
      + output.bias;
    const probability = probabilityHead === "sigmoid"
      ? stableSigmoid(logit)
      : probabilityHead === "tanh"
        ? Math.tanh(logit)
        : logit;
    const predictedClass = probability >= 0.5 ? 1 as const : 0 as const;
    const validProbability = probability >= 0 && probability <= 1;
    return {
      input,
      label,
      hiddenPreActivation,
      hiddenActivation,
      logit,
      probability,
      predictedClass,
      loss: validProbability ? binaryCrossEntropy(probability, label) : Number.NaN,
    };
  });
}

function summarizeRun(config: XorNetworkConfig, rows: XorForwardRow[]): XorNetworkRun {
  const correctCount = rows.filter((row) => row.predictedClass === row.label).length;
  const finite = rows.every((row) => (
    Number.isFinite(row.logit)
    && Number.isFinite(row.probability)
    && Number.isFinite(row.loss)
  ));
  return {
    config,
    rows,
    accuracy: correctCount / rows.length,
    correctCount,
    meanLoss: finite
      ? rows.reduce((sum, row) => sum + row.loss, 0) / rows.length
      : Number.NaN,
    finite,
  };
}

export function runXorNetwork(config: XorNetworkConfig) {
  return summarizeRun(config, forwardRows(config));
}

export function runLinearXorBoundary() {
  const rows = xorDataset.map(({ input, label }) => {
    const logit = input[0] * 6 + input[1] * 6 - 3;
    const probability = stableSigmoid(logit);
    return {
      input,
      label,
      logit,
      probability,
      predictedClass: probability >= 0.5 ? 1 as const : 0 as const,
      loss: binaryCrossEntropy(probability, label),
    };
  });
  const correctCount = rows.filter((row) => row.predictedClass === row.label).length;
  return {
    rows,
    correctCount,
    accuracy: correctCount / rows.length,
    meanLoss: rows.reduce((sum, row) => sum + row.loss, 0) / rows.length,
  };
}

export function evaluateXorMastery(run: XorNetworkRun): XorMastery {
  if (!run.finite) {
    return { mastered: false, reason: "non-finite", ablatedCorrectCounts: [0, 0] };
  }
  if (run.correctCount !== xorDataset.length) {
    return { mastered: false, reason: "truth-table", ablatedCorrectCounts: [0, 0] };
  }
  const confident = run.rows.every((row) => (
    row.label === 1 ? row.probability >= 0.9 : row.probability <= 0.1
  ));
  if (!confident || run.meanLoss > 0.1) {
    return { mastered: false, reason: "confidence", ablatedCorrectCounts: [0, 0] };
  }

  const withoutHiddenOne = summarizeRun(
    run.config,
    forwardRows(run.config, [0, 1]),
  );
  const withoutHiddenTwo = summarizeRun(
    run.config,
    forwardRows(run.config, [1, 0]),
  );
  const counts = [
    withoutHiddenOne.correctCount,
    withoutHiddenTwo.correctCount,
  ] as const;
  if (withoutHiddenOne.correctCount === xorDataset.length) {
    return { mastered: false, reason: "hidden-one-unused", ablatedCorrectCounts: counts };
  }
  if (withoutHiddenTwo.correctCount === xorDataset.length) {
    return { mastered: false, reason: "hidden-two-unused", ablatedCorrectCounts: counts };
  }
  return { mastered: true, reason: "mastered", ablatedCorrectCounts: counts };
}

export function networkMatrices(config: XorNetworkConfig) {
  const { hiddenOne, hiddenTwo, output } = resolveNetwork(config);
  return {
    firstWeights: [
      [hiddenOne.weights[0], hiddenTwo.weights[0]],
      [hiddenOne.weights[1], hiddenTwo.weights[1]],
    ],
    firstBias: [[hiddenOne.bias, hiddenTwo.bias]],
    secondWeights: [[output.weights[0]], [output.weights[1]]],
    secondBias: output.bias,
  };
}

export type NetworkDebuggerScenarioId =
  | "shape-contract"
  | "missing-activation"
  | "output-combination"
  | "probability-head";

export const networkDebuggerScenarioIds = [
  "shape-contract",
  "missing-activation",
  "output-combination",
  "probability-head",
] as const satisfies readonly NetworkDebuggerScenarioId[];

export type ShapeRepairId = "2x2" | "3x2" | "2x3";
export type NetworkDebuggerRepair =
  | ShapeRepairId
  | ActivationId
  | OutputHeadId
  | ProbabilityHeadId;

export type NetworkDebuggerResult = {
  correct: boolean;
  reason:
    | "correct"
    | "shape-mismatch"
    | "truth-table"
    | "invalid-probability";
  outputShape?: readonly [number, number];
  expectedInner?: number;
  actualInner?: number;
  correctCount?: number;
  meanLoss?: number;
  failingRows?: number[];
};

export function evaluateLayerShape(
  firstWeightShape: readonly [number, number],
) : NetworkDebuggerResult {
  const inputShape = [4, 2] as const;
  const secondWeightShape = [2, 1] as const;
  if (inputShape[1] !== firstWeightShape[0]) {
    return {
      correct: false,
      reason: "shape-mismatch",
      expectedInner: inputShape[1],
      actualInner: firstWeightShape[0],
    };
  }
  const hiddenShape = [inputShape[0], firstWeightShape[1]] as const;
  if (hiddenShape[1] !== secondWeightShape[0]) {
    return {
      correct: false,
      reason: "shape-mismatch",
      expectedInner: hiddenShape[1],
      actualInner: secondWeightShape[0],
    };
  }
  return { correct: true, reason: "correct", outputShape: [inputShape[0], 1] };
}

function gradeRun(run: XorNetworkRun): NetworkDebuggerResult {
  const failingRows = run.rows
    .map((row, index) => row.predictedClass === row.label ? -1 : index)
    .filter((index) => index >= 0);
  return {
    correct: run.finite && run.correctCount === xorDataset.length && run.meanLoss < 0.1,
    reason: run.finite && run.correctCount === xorDataset.length && run.meanLoss < 0.1
      ? "correct"
      : "truth-table",
    correctCount: run.correctCount,
    meanLoss: run.meanLoss,
    failingRows,
  };
}

export function evaluateNetworkRepair(
  scenarioId: NetworkDebuggerScenarioId,
  repair: NetworkDebuggerRepair,
): NetworkDebuggerResult {
  if (scenarioId === "shape-contract") {
    const shapes: Record<ShapeRepairId, readonly [number, number]> = {
      "2x2": [2, 2],
      "3x2": [3, 2],
      "2x3": [2, 3],
    };
    return evaluateLayerShape(shapes[repair as ShapeRepairId]);
  }
  if (scenarioId === "missing-activation") {
    return gradeRun(runXorNetwork({
      ...referenceXorConfig,
      activation: repair as ActivationId,
    }));
  }
  if (scenarioId === "output-combination") {
    return gradeRun(runXorNetwork({
      ...referenceXorConfig,
      outputHead: repair as OutputHeadId,
    }));
  }

  const probabilityHead = repair as ProbabilityHeadId;
  const rows = forwardRows(referenceXorConfig, [1, 1], probabilityHead);
  const invalidRows = rows
    .map((row, index) => (
      row.probability >= 0
      && row.probability <= 1
      && Number.isFinite(row.loss)
        ? -1
        : index
    ))
    .filter((index) => index >= 0);
  if (invalidRows.length > 0) {
    return {
      correct: false,
      reason: "invalid-probability",
      failingRows: invalidRows,
    };
  }
  return gradeRun(summarizeRun(referenceXorConfig, rows));
}

export function canCompleteNeuralNetworksChapter({
  xorLabComplete,
  debuggerComplete,
  conceptsMastered,
}: {
  xorLabComplete: boolean;
  debuggerComplete: boolean;
  conceptsMastered: boolean;
}) {
  return xorLabComplete && debuggerComplete && conceptsMastered;
}

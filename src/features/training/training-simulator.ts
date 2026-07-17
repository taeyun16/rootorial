export type NumericMatrix = number[][];

export type TrainingPrediction =
  | "batch-down-full-up"
  | "both-down"
  | "batch-up-full-down"
  | "both-up";

export type BatchPlanId = "grouped" | "interleaved";

export const trainingFeatures = [
  [2, 0],
  [1.5, 0.5],
  [0, 2],
  [0.5, 1.5],
  [-1.5, -1.5],
  [-2, -1],
  [1, 1],
] as const;

export const trainingLabels = [0, 0, 1, 1, 2, 2, 1] as const;

export const trainingBatchPlans = {
  grouped: [[0, 1], [2, 3], [4, 5], [6]],
  interleaved: [[0, 2], [4, 1], [3, 5], [6]],
} as const satisfies Record<BatchPlanId, readonly (readonly number[])[]>;

export const trainingClassNames = ["sprout", "wave", "ember"] as const;

type AdamState = {
  mWeights: NumericMatrix;
  vWeights: NumericMatrix;
  mBias: number[];
  vBias: number[];
  step: number;
};

export type TrainingState = {
  weights: NumericMatrix;
  bias: number[];
  adam: AdamState;
  batchPlan: BatchPlanId;
  cursor: number;
};

export type TrainingStepSnapshot = {
  update: number;
  batchIndices: number[];
  labels: number[];
  predictionAtRun: TrainingPrediction;
  actualOutcome: TrainingPrediction;
  logitsBefore: NumericMatrix;
  probabilitiesBefore: NumericMatrix;
  rowLossesBefore: number[];
  batchLossBefore: number;
  batchLossAfter: number;
  fullLossBefore: number;
  fullLossAfter: number;
  gradientWeights: NumericMatrix;
  gradientBias: number[];
  stateBefore: TrainingState;
  stateAfter: TrainingState;
};

export type ParameterInspection = {
  update: number;
  row: number;
  column: number;
} | null;

export type TrainingMastery = {
  mastered: boolean;
  reason:
    | "mastered"
    | "required-plan"
    | "prediction"
    | "epoch-incomplete"
    | "tail-batch"
    | "class-coverage"
    | "adam-memory"
    | "parameter-inspection"
    | "loss-recovery";
};

const ADAM_BETA_ONE = 0.9;
const ADAM_BETA_TWO = 0.999;
const ADAM_EPSILON = 1e-8;
const LEARNING_RATE = 0.15;

function zeros(rows: number, columns: number) {
  return Array.from({ length: rows }, () => Array(columns).fill(0) as number[]);
}

function cloneMatrix(matrix: readonly (readonly number[])[]) {
  return matrix.map((row) => [...row]);
}

function cloneState(state: TrainingState): TrainingState {
  return {
    weights: cloneMatrix(state.weights),
    bias: [...state.bias],
    adam: {
      mWeights: cloneMatrix(state.adam.mWeights),
      vWeights: cloneMatrix(state.adam.vWeights),
      mBias: [...state.adam.mBias],
      vBias: [...state.adam.vBias],
      step: state.adam.step,
    },
    batchPlan: state.batchPlan,
    cursor: state.cursor,
  };
}

function assertFiniteMatrix(matrix: readonly (readonly number[])[], label: string) {
  const columns = matrix[0]?.length ?? 0;
  if (
    !matrix.length
    || !columns
    || matrix.some((row) => (
      row.length !== columns || row.some((value) => !Number.isFinite(value))
    ))
  ) {
    throw new Error(`${label} must be a non-empty finite rectangular matrix`);
  }
}

export function stableSoftmax(logits: readonly number[]) {
  if (!logits.length || logits.some((value) => !Number.isFinite(value))) {
    throw new Error("Softmax logits must be finite and non-empty");
  }
  const maximum = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

export function softmaxRows(logits: readonly (readonly number[])[]) {
  assertFiniteMatrix(logits, "Logits");
  return logits.map((row) => stableSoftmax(row));
}

export function crossEntropyFromLogits(logits: readonly number[], label: number) {
  if (!logits.length || logits.some((value) => !Number.isFinite(value))) {
    throw new Error("Cross entropy logits must be finite and non-empty");
  }
  if (!Number.isInteger(label) || label < 0 || label >= logits.length) {
    throw new Error("Cross entropy label is outside the class axis");
  }
  const maximum = Math.max(...logits);
  const logDenominator = maximum + Math.log(
    logits.reduce((sum, value) => sum + Math.exp(value - maximum), 0),
  );
  return logDenominator - logits[label];
}

export function meanCrossEntropy(
  logits: readonly (readonly number[])[],
  labels: readonly number[],
) {
  assertFiniteMatrix(logits, "Logits");
  if (logits.length !== labels.length || !logits.length) {
    throw new Error("Cross entropy needs one label per logit row");
  }
  return logits.reduce(
    (sum, row, index) => sum + crossEntropyFromLogits(row, labels[index]),
    0,
  ) / logits.length;
}

export function updatesPerEpoch(sampleCount: number, batchSize: number) {
  if (!Number.isInteger(sampleCount) || sampleCount < 1 || !Number.isInteger(batchSize) || batchSize < 1) {
    throw new Error("Sample count and batch size must be positive integers");
  }
  return Math.ceil(sampleCount / batchSize);
}

export function createTrainingState(batchPlan: BatchPlanId = "grouped"): TrainingState {
  return {
    weights: [[0.8, 0, -0.8], [0, 0.8, -0.8]],
    bias: [0, 0, 0],
    adam: {
      mWeights: zeros(2, 3),
      vWeights: zeros(2, 3),
      mBias: [0, 0, 0],
      vBias: [0, 0, 0],
      step: 0,
    },
    batchPlan,
    cursor: 0,
  };
}

function logitsForIndices(state: TrainingState, indices: readonly number[]) {
  return indices.map((sampleIndex) => {
    const features = trainingFeatures[sampleIndex];
    if (!features) throw new Error("Training sample index is outside the dataset");
    return state.bias.map((bias, classIndex) => (
      features[0] * state.weights[0][classIndex]
      + features[1] * state.weights[1][classIndex]
      + bias
    ));
  });
}

function lossForIndices(state: TrainingState, indices: readonly number[]) {
  return meanCrossEntropy(
    logitsForIndices(state, indices),
    indices.map((index) => trainingLabels[index]),
  );
}

export function fullDatasetLoss(state: TrainingState) {
  return lossForIndices(state, trainingFeatures.map((_, index) => index));
}

function gradientsForBatch(
  state: TrainingState,
  batchIndices: readonly number[],
  probabilities: readonly (readonly number[])[],
) {
  const gradientWeights = zeros(2, 3);
  const gradientBias = [0, 0, 0];
  for (let batchRow = 0; batchRow < batchIndices.length; batchRow += 1) {
    const sampleIndex = batchIndices[batchRow];
    const features = trainingFeatures[sampleIndex];
    const label = trainingLabels[sampleIndex];
    for (let classIndex = 0; classIndex < 3; classIndex += 1) {
      const logitGradient = (
        probabilities[batchRow][classIndex] - (label === classIndex ? 1 : 0)
      ) / batchIndices.length;
      gradientBias[classIndex] += logitGradient;
      gradientWeights[0][classIndex] += features[0] * logitGradient;
      gradientWeights[1][classIndex] += features[1] * logitGradient;
    }
  }
  return { gradientWeights, gradientBias };
}

function adamScalar(
  parameter: number,
  gradient: number,
  previousMoment: number,
  previousVelocity: number,
  step: number,
) {
  const moment = ADAM_BETA_ONE * previousMoment + (1 - ADAM_BETA_ONE) * gradient;
  const velocity = ADAM_BETA_TWO * previousVelocity + (1 - ADAM_BETA_TWO) * gradient ** 2;
  const correctedMoment = moment / (1 - ADAM_BETA_ONE ** step);
  const correctedVelocity = velocity / (1 - ADAM_BETA_TWO ** step);
  const nextParameter = parameter - LEARNING_RATE * correctedMoment
    / (Math.sqrt(correctedVelocity) + ADAM_EPSILON);
  return { parameter: nextParameter, moment, velocity };
}

function applyAdam(
  state: TrainingState,
  gradientWeights: NumericMatrix,
  gradientBias: number[],
) {
  const next = cloneState(state);
  const step = state.adam.step + 1;
  for (let row = 0; row < 2; row += 1) {
    for (let column = 0; column < 3; column += 1) {
      const update = adamScalar(
        state.weights[row][column],
        gradientWeights[row][column],
        state.adam.mWeights[row][column],
        state.adam.vWeights[row][column],
        step,
      );
      next.weights[row][column] = update.parameter;
      next.adam.mWeights[row][column] = update.moment;
      next.adam.vWeights[row][column] = update.velocity;
    }
  }
  for (let column = 0; column < 3; column += 1) {
    const update = adamScalar(
      state.bias[column],
      gradientBias[column],
      state.adam.mBias[column],
      state.adam.vBias[column],
      step,
    );
    next.bias[column] = update.parameter;
    next.adam.mBias[column] = update.moment;
    next.adam.vBias[column] = update.velocity;
  }
  next.adam.step = step;
  next.cursor = state.cursor + 1;
  return next;
}

function outcome(before: number, after: number) {
  return after < before - 1e-10 ? "down" : "up";
}

function trainingOutcome(
  batchBefore: number,
  batchAfter: number,
  fullBefore: number,
  fullAfter: number,
): TrainingPrediction {
  const batch = outcome(batchBefore, batchAfter);
  const full = outcome(fullBefore, fullAfter);
  if (batch === "down" && full === "up") return "batch-down-full-up";
  if (batch === "down" && full === "down") return "both-down";
  if (batch === "up" && full === "down") return "batch-up-full-down";
  return "both-up";
}

export function advanceTrainingStep(
  currentState: TrainingState,
  predictionAtRun: TrainingPrediction,
) {
  const plan = trainingBatchPlans[currentState.batchPlan];
  const batch = plan[currentState.cursor];
  if (!batch) throw new Error("This epoch has no remaining mini-batches");
  const stateBefore = cloneState(currentState);
  const batchIndices = [...batch];
  const labels = batchIndices.map((index) => trainingLabels[index]);
  const logitsBefore = logitsForIndices(stateBefore, batchIndices);
  const probabilitiesBefore = softmaxRows(logitsBefore);
  const rowLossesBefore = logitsBefore.map((row, index) => (
    crossEntropyFromLogits(row, labels[index])
  ));
  const batchLossBefore = rowLossesBefore.reduce((sum, value) => sum + value, 0)
    / rowLossesBefore.length;
  const fullLossBefore = fullDatasetLoss(stateBefore);
  const { gradientWeights, gradientBias } = gradientsForBatch(
    stateBefore,
    batchIndices,
    probabilitiesBefore,
  );
  const stateAfter = applyAdam(stateBefore, gradientWeights, gradientBias);
  const batchLossAfter = lossForIndices(stateAfter, batchIndices);
  const fullLossAfter = fullDatasetLoss(stateAfter);
  const snapshot: TrainingStepSnapshot = {
    update: stateAfter.adam.step,
    batchIndices,
    labels,
    predictionAtRun,
    actualOutcome: trainingOutcome(
      batchLossBefore,
      batchLossAfter,
      fullLossBefore,
      fullLossAfter,
    ),
    logitsBefore,
    probabilitiesBefore,
    rowLossesBefore,
    batchLossBefore,
    batchLossAfter,
    fullLossBefore,
    fullLossAfter,
    gradientWeights: cloneMatrix(gradientWeights),
    gradientBias: [...gradientBias],
    stateBefore,
    stateAfter: cloneState(stateAfter),
  };
  return { state: stateAfter, snapshot };
}

function sameBatch(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

export function evaluateTrainingMastery(
  history: readonly TrainingStepSnapshot[],
  inspection: ParameterInspection,
): TrainingMastery {
  const requiredBatches = trainingBatchPlans.grouped;
  if (history.some((snapshot, index) => !sameBatch(snapshot.batchIndices, requiredBatches[index] ?? []))) {
    return { mastered: false, reason: "required-plan" };
  }
  const first = history[0];
  if (
    !first
    || first.predictionAtRun !== "batch-down-full-up"
    || first.actualOutcome !== "batch-down-full-up"
  ) {
    return { mastered: false, reason: "prediction" };
  }
  if (history.length < requiredBatches.length) {
    return { mastered: false, reason: "epoch-incomplete" };
  }
  if (history.at(-1)?.batchIndices.length !== 1) {
    return { mastered: false, reason: "tail-batch" };
  }
  const coveredLabels = new Set(history.flatMap((snapshot) => snapshot.labels));
  if (coveredLabels.size !== trainingClassNames.length) {
    return { mastered: false, reason: "class-coverage" };
  }
  const second = history[1];
  const hasPriorMoment = second?.stateBefore.adam.mWeights.some((row) => (
    row.some((value) => Math.abs(value) > 1e-8)
  ));
  if (!second || second.stateBefore.adam.step !== 1 || second.stateAfter.adam.step !== 2 || !hasPriorMoment) {
    return { mastered: false, reason: "adam-memory" };
  }
  const inspectedSnapshot = inspection
    ? history.find((snapshot) => snapshot.update === inspection.update)
    : undefined;
  if (
    !inspection
    || inspection.update < 2
    || !inspectedSnapshot
    || Math.abs(inspectedSnapshot.gradientWeights[inspection.row]?.[inspection.column] ?? 0) <= 1e-8
    || Math.abs(inspectedSnapshot.stateBefore.adam.mWeights[inspection.row]?.[inspection.column] ?? 0) <= 1e-8
  ) {
    return { mastered: false, reason: "parameter-inspection" };
  }
  if ((history.at(-1)?.fullLossAfter ?? Number.POSITIVE_INFINITY) >= first.fullLossBefore - 0.02) {
    return { mastered: false, reason: "loss-recovery" };
  }
  return { mastered: true, reason: "mastered" };
}

export type TrainingDebuggerScenarioId =
  | "softmax-contract"
  | "loss-contract"
  | "state-lifetime"
  | "dropout-mode";

export const trainingDebuggerScenarioIds = [
  "softmax-contract",
  "loss-contract",
  "state-lifetime",
  "dropout-mode",
] as const satisfies readonly TrainingDebuggerScenarioId[];

export type TrainingRepair =
  | "row-stable"
  | "column-softmax"
  | "global-softmax"
  | "true-class-mean-logits"
  | "argmax-mean"
  | "true-class-sum"
  | "double-softmax"
  | "clear-gradient-keep-moments"
  | "accumulate-gradient"
  | "reset-all-state"
  | "inverted-train-eval-off"
  | "no-inverted-scale"
  | "dropout-during-eval";

export type TrainingRepairResult = {
  correct: boolean;
  reason:
    | "contract-restored"
    | "sample-coupling"
    | "non-fused-input"
    | "wrong-target"
    | "sum-reduction"
    | "gradient-accumulated"
    | "optimizer-memory-reset"
    | "expectation-shrunk"
    | "stochastic-validation"
    | "wrong-repair";
  metrics: Record<string, number | number[]>;
};

function softmaxColumns(matrix: readonly (readonly number[])[]) {
  return matrix.map((row, rowIndex) => row.map((_, columnIndex) => {
    const column = matrix.map((sourceRow) => sourceRow[columnIndex]);
    return stableSoftmax(column)[rowIndex];
  }));
}

function globalSoftmax(matrix: readonly (readonly number[])[]) {
  const flat = stableSoftmax(matrix.flat());
  let cursor = 0;
  return matrix.map((row) => row.map(() => flat[cursor++]));
}

function rowSums(matrix: readonly (readonly number[])[]) {
  return matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
}

export type SoftmaxContractRun = {
  probabilities: NumericMatrix;
  probabilitiesAfterOtherSampleChange: NumericMatrix;
};

export function gradeSoftmaxContract(run: SoftmaxContractRun): TrainingRepairResult {
  const sums = rowSums(run.probabilities);
  const changedSums = rowSums(run.probabilitiesAfterOtherSampleChange);
  const columns = run.probabilities[0]?.length ?? 0;
  const sameRectangularShape = run.probabilities.length > 0
    && columns > 0
    && run.probabilities.length === run.probabilitiesAfterOtherSampleChange.length
    && [...run.probabilities, ...run.probabilitiesAfterOtherSampleChange]
      .every((row) => row.length === columns);
  const finite = [...run.probabilities, ...run.probabilitiesAfterOtherSampleChange]
    .flat()
    .every(Number.isFinite);
  const firstRow = run.probabilities[0] ?? [];
  const changedFirstRow = run.probabilitiesAfterOtherSampleChange[0] ?? [];
  const independent = firstRow.length > 0
    && firstRow.length === changedFirstRow.length
    && firstRow.every((value, index) => Math.abs(value - changedFirstRow[index]) < 1e-10);
  const correct = sameRectangularShape
    && finite
    && sums.every((sum) => Math.abs(sum - 1) < 1e-10)
    && changedSums.every((sum) => Math.abs(sum - 1) < 1e-10)
    && independent;
  return {
    correct,
    reason: correct ? "contract-restored" : "sample-coupling",
    metrics: { rowSums: sums, changedRowSums: changedSums, finite: finite ? 1 : 0 },
  };
}

function applySoftmaxRepair(
  repair: TrainingRepair,
  logits: readonly (readonly number[])[],
) {
  if (repair === "row-stable") return softmaxRows(logits);
  if (repair === "column-softmax") return softmaxColumns(logits);
  if (repair === "global-softmax") return globalSoftmax(logits);
  return null;
}

function evaluateSoftmaxRepair(repair: TrainingRepair): TrainingRepairResult {
  const logits = [[1000, 998, 997], [1, 3, 2]];
  const changedLogits = [logits[0], [-100, 40, 5]];
  const probabilities = applySoftmaxRepair(repair, logits);
  const probabilitiesAfterOtherSampleChange = applySoftmaxRepair(repair, changedLogits);
  if (!probabilities || !probabilitiesAfterOtherSampleChange) {
    return { correct: false, reason: "wrong-repair", metrics: {} };
  }
  return gradeSoftmaxContract({ probabilities, probabilitiesAfterOtherSampleChange });
}

export type LossContractRun = {
  loss: number;
  duplicatedLoss: number;
  expectedLoss: number;
  confidentCorrectLoss: number;
  confidentWrongLoss: number;
};

export function gradeLossContract(run: LossContractRun): TrainingRepairResult {
  const duplicateInvariant = Math.abs(run.loss - run.duplicatedLoss) < 1e-12;
  const readsTrueLabel = run.confidentWrongLoss > run.confidentCorrectLoss + 1e-6;
  const readsRawLogits = Math.abs(run.loss - run.expectedLoss) < 1e-12;
  const correct = duplicateInvariant && readsTrueLabel && readsRawLogits;
  const reason = correct
    ? "contract-restored"
    : !duplicateInvariant
      ? "sum-reduction"
      : !readsTrueLabel
        ? "wrong-target"
        : "non-fused-input";
  return {
    correct,
    reason,
    metrics: {
      loss: run.loss,
      duplicatedLoss: run.duplicatedLoss,
      correctMean: run.expectedLoss,
    },
  };
}

function lossFunctionForRepair(repair: TrainingRepair) {
  if (repair === "true-class-mean-logits") return meanCrossEntropy;
  if (repair === "argmax-mean") {
    return (logits: readonly (readonly number[])[]) => {
      const probabilities = softmaxRows(logits);
      return -probabilities.reduce(
        (sum, row) => sum + Math.log(Math.max(...row)),
        0,
      ) / probabilities.length;
    };
  }
  if (repair === "true-class-sum") {
    return (logits: readonly (readonly number[])[], labels: readonly number[]) => (
      meanCrossEntropy(logits, labels) * logits.length
    );
  }
  if (repair === "double-softmax") {
    return (logits: readonly (readonly number[])[], labels: readonly number[]) => (
      meanCrossEntropy(softmaxRows(logits), labels)
    );
  }
  return null;
}

function evaluateLossRepair(repair: TrainingRepair): TrainingRepairResult {
  const logits = [[5, 1, -1], [4, 3, 2]];
  const labels = [0, 2];
  const loss = lossFunctionForRepair(repair);
  if (!loss) return { correct: false, reason: "wrong-repair", metrics: {} };
  return gradeLossContract({
    loss: loss(logits, labels),
    duplicatedLoss: loss([...logits, ...logits], [...labels, ...labels]),
    expectedLoss: meanCrossEntropy(logits, labels),
    confidentCorrectLoss: loss([[8, 0, -2]], [0]),
    confidentWrongLoss: loss([[8, 0, -2]], [2]),
  });
}

export type StateLifetimeRun = {
  gradientBuffer: number;
  moment: number;
  velocity: number;
  step: number;
};

const stateLifetimeProbe = {
  firstGradient: 0.8,
  secondGradient: -0.3,
};

export function gradeStateLifetime(run: StateLifetimeRun): TrainingRepairResult {
  const firstMoment = (1 - ADAM_BETA_ONE) * stateLifetimeProbe.firstGradient;
  const firstVelocity = (1 - ADAM_BETA_TWO) * stateLifetimeProbe.firstGradient ** 2;
  const expectedMoment = ADAM_BETA_ONE * firstMoment
    + (1 - ADAM_BETA_ONE) * stateLifetimeProbe.secondGradient;
  const expectedVelocity = ADAM_BETA_TWO * firstVelocity
    + (1 - ADAM_BETA_TWO) * stateLifetimeProbe.secondGradient ** 2;
  const freshGradient = Math.abs(run.gradientBuffer - stateLifetimeProbe.secondGradient) < 1e-12;
  const statePreserved = run.step === 2
    && Math.abs(run.moment - expectedMoment) < 1e-12
    && Math.abs(run.velocity - expectedVelocity) < 1e-12;
  const correct = freshGradient && statePreserved;
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : freshGradient
        ? "optimizer-memory-reset"
        : "gradient-accumulated",
    metrics: {
      gradientBuffer: run.gradientBuffer,
      moment: run.moment,
      velocity: run.velocity,
      step: run.step,
    },
  };
}

function evaluateStateRepair(repair: TrainingRepair): TrainingRepairResult {
  const firstGradient = 0.8;
  const secondGradient = -0.3;
  const firstMoment = (1 - ADAM_BETA_ONE) * firstGradient;
  const firstVelocity = (1 - ADAM_BETA_TWO) * firstGradient ** 2;
  let run: StateLifetimeRun;
  if (repair === "clear-gradient-keep-moments") {
    run = {
      gradientBuffer: secondGradient,
      moment: ADAM_BETA_ONE * firstMoment + (1 - ADAM_BETA_ONE) * secondGradient,
      velocity: ADAM_BETA_TWO * firstVelocity + (1 - ADAM_BETA_TWO) * secondGradient ** 2,
      step: 2,
    };
  } else if (repair === "accumulate-gradient") {
    const accumulated = firstGradient + secondGradient;
    run = {
      gradientBuffer: accumulated,
      moment: ADAM_BETA_ONE * firstMoment + (1 - ADAM_BETA_ONE) * accumulated,
      velocity: ADAM_BETA_TWO * firstVelocity + (1 - ADAM_BETA_TWO) * accumulated ** 2,
      step: 2,
    };
  } else if (repair === "reset-all-state") {
    run = {
      gradientBuffer: secondGradient,
      moment: (1 - ADAM_BETA_ONE) * secondGradient,
      velocity: (1 - ADAM_BETA_TWO) * secondGradient ** 2,
      step: 1,
    };
  } else {
    return { correct: false, reason: "wrong-repair", metrics: {} };
  }
  return gradeStateLifetime(run);
}

export type DropoutContractRun = {
  activations: number[];
  trainMean: number[];
  evalSeedOne: number[];
  evalSeedTwo: number[];
};

function arraysClose(left: readonly number[], right: readonly number[]) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) < 1e-12);
}

export function gradeDropoutContract(run: DropoutContractRun): TrainingRepairResult {
  const expectationPreserved = arraysClose(run.trainMean, run.activations);
  const evalDeterministic = arraysClose(run.evalSeedOne, run.activations)
    && arraysClose(run.evalSeedTwo, run.activations);
  const correct = expectationPreserved && evalDeterministic;
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : expectationPreserved
        ? "stochastic-validation"
        : "expectation-shrunk",
    metrics: {
      trainMean: run.trainMean,
      evalOutput: run.evalSeedOne,
      evalSeedOne: run.evalSeedOne,
      evalSeedTwo: run.evalSeedTwo,
    },
  };
}

function evaluateDropoutRepair(repair: TrainingRepair): TrainingRepairResult {
  const activations = [1, 2, 3, 4];
  const masks = [[1, 0, 1, 0], [1, 0, 1, 0], [0, 1, 0, 1], [0, 1, 0, 1]];
  const invertedMean = activations.map((value, index) => (
    masks.reduce((sum, mask) => sum + value * mask[index] * 2, 0) / masks.length
  ));
  let run: DropoutContractRun;
  if (repair === "inverted-train-eval-off") {
    run = {
      activations,
      trainMean: invertedMean,
      evalSeedOne: activations,
      evalSeedTwo: activations,
    };
  } else if (repair === "no-inverted-scale") {
    run = {
      activations,
      trainMean: activations.map((value) => value / 2),
      evalSeedOne: activations,
      evalSeedTwo: activations,
    };
  } else if (repair === "dropout-during-eval") {
    run = {
      activations,
      trainMean: invertedMean,
      evalSeedOne: [2, 0, 6, 0],
      evalSeedTwo: [0, 4, 0, 8],
    };
  } else {
    return { correct: false, reason: "wrong-repair", metrics: {} };
  }
  return gradeDropoutContract(run);
}

export function evaluateTrainingRepair(
  scenario: TrainingDebuggerScenarioId,
  repair: TrainingRepair,
) {
  if (scenario === "softmax-contract") return evaluateSoftmaxRepair(repair);
  if (scenario === "loss-contract") return evaluateLossRepair(repair);
  if (scenario === "state-lifetime") return evaluateStateRepair(repair);
  return evaluateDropoutRepair(repair);
}

export function canCompleteTrainingChapter(input: {
  batchLabComplete: boolean;
  debuggerComplete?: boolean;
  conceptsMastered: boolean;
}) {
  return input.batchLabComplete && input.conceptsMastered;
}

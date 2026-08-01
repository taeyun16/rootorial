import type { PracticeChallengeDefinition } from "../practice/practice.ts";
import { stableSoftmax } from "./training-simulator.ts";

export type TrainingPracticeChallengeId =
  | "reproduce-softmax-gradient"
  | "diagnose-mean-reduction"
  | "transfer-adam-state";

export type SoftmaxGradientFormula =
  | "probability-minus-onehot"
  | "onehot-minus-probability"
  | "probabilities-only";

export type GradientInvariantPrediction =
  | "zero-sum-both"
  | "positive-sum-both"
  | "negative-sum-both";

export type BatchReduction =
  | "mean"
  | "sum"
  | "double-mean";

export type BatchInvariancePrediction =
  | "same-gradient"
  | "double-gradient"
  | "half-gradient";

export type AdamStatePolicy =
  | "preserve-state"
  | "reset-state"
  | "reuse-moment-as-gradient";

export type AdamStatePrediction =
  | "continue-moments"
  | "restart-step-one"
  | "keep-step-reset-moments";

export type SoftmaxGradientFixture = Readonly<{
  logits: readonly number[];
  label: number;
  learningRate: number;
}>;

export type BatchGradientFixture = Readonly<{
  hidden: readonly (readonly number[])[];
  logits: readonly (readonly number[])[];
  labels: readonly number[];
}>;

export type AdamState = Readonly<{
  moment: number;
  velocity: number;
  step: number;
}>;

export type AdamFixture = Readonly<{
  parameter: number;
  gradient: number;
  learningRate: number;
  state: AdamState;
}>;

export const trainingPracticeChallenges:
readonly PracticeChallengeDefinition<TrainingPracticeChallengeId>[] = [
  {
    id: "reproduce-softmax-gradient",
    level: "single-boundary",
    skillId: "reproduce",
    label: "∂CE/∂logits",
    title: "Reproduce one Softmax-plus-CE output gradient",
    summary:
      "Choose the learner-owned gradient that lowers loss on two unseen class rows.",
  },
  {
    id: "diagnose-mean-reduction",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "Mean reduction",
    title: "Keep a parameter gradient invariant when a batch is duplicated",
    summary:
      "Diagnose the reduction boundary after Hᵀ @ grad_logits on two fresh batches.",
  },
  {
    id: "transfer-adam-state",
    level: "transfer",
    skillId: "transfer",
    label: "Adam memory",
    title: "Carry optimizer memory across a new batch gradient",
    summary:
      "Refresh the ordinary gradient while preserving m, v, and t on two optimizer states.",
  },
] as const;

export const softmaxGradientVisibleFixture: SoftmaxGradientFixture =
  Object.freeze({
    logits: Object.freeze([1.2, -0.4, 0.6]),
    label: 2,
    learningRate: 0.4,
  });

export const softmaxGradientSecondFixture: SoftmaxGradientFixture =
  Object.freeze({
    logits: Object.freeze([-0.3, 1.4, 0.2]),
    label: 0,
    learningRate: 0.25,
  });

export const batchGradientVisibleFixture: BatchGradientFixture = Object.freeze({
  hidden: Object.freeze([
    Object.freeze([1, 0.5]),
    Object.freeze([-0.5, 1.2]),
  ]),
  logits: Object.freeze([
    Object.freeze([1.1, 0.2, -0.4]),
    Object.freeze([-0.3, 0.9, 0.4]),
  ]),
  labels: Object.freeze([0, 2]),
});

export const batchGradientSecondFixture: BatchGradientFixture = Object.freeze({
  hidden: Object.freeze([
    Object.freeze([0.2, -1]),
    Object.freeze([1.3, 0.4]),
    Object.freeze([-0.7, 0.8]),
  ]),
  logits: Object.freeze([
    Object.freeze([0.5, -0.4, 1.2]),
    Object.freeze([-0.6, 1.5, 0.1]),
    Object.freeze([0.7, 0.3, -0.2]),
  ]),
  labels: Object.freeze([2, 1, 0]),
});

export const adamVisibleFixture: AdamFixture = Object.freeze({
  parameter: 0.8,
  gradient: -0.35,
  learningRate: 0.05,
  state: Object.freeze({
    moment: 0.12,
    velocity: 0.015,
    step: 3,
  }),
});

export const adamSecondFixture: AdamFixture = Object.freeze({
  parameter: -0.4,
  gradient: 0.28,
  learningRate: 0.03,
  state: Object.freeze({
    moment: -0.08,
    velocity: 0.01,
    step: 5,
  }),
});

function crossEntropy(probabilities: readonly number[], label: number) {
  return -Math.log(Math.max(probabilities[label] ?? 0, 1e-12));
}

function softmaxGradient(
  probabilities: readonly number[],
  label: number,
  formula: SoftmaxGradientFormula,
) {
  return probabilities.map((probability, classIndex) => {
    const oneHot = classIndex === label ? 1 : 0;
    if (formula === "probability-minus-onehot") {
      return probability - oneHot;
    }
    if (formula === "onehot-minus-probability") {
      return oneHot - probability;
    }
    return probability;
  });
}

export function runSoftmaxGradientStep(
  fixture: SoftmaxGradientFixture,
  formula: SoftmaxGradientFormula,
) {
  const beforeProbabilities = stableSoftmax(fixture.logits);
  const gradient = softmaxGradient(
    beforeProbabilities,
    fixture.label,
    formula,
  );
  const afterLogits = fixture.logits.map(
    (logit, index) => logit - fixture.learningRate * gradient[index],
  );
  const afterProbabilities = stableSoftmax(afterLogits);
  return {
    beforeLoss: crossEntropy(beforeProbabilities, fixture.label),
    afterLoss: crossEntropy(afterProbabilities, fixture.label),
    gradient,
    gradientSum: gradient.reduce((sum, value) => sum + value, 0),
    trueClassGradient: gradient[fixture.label],
  };
}

function classifierWeightGradient(
  fixture: BatchGradientFixture,
  reduction: BatchReduction,
) {
  const batchSize = fixture.hidden.length;
  const featureCount = fixture.hidden[0].length;
  const classCount = fixture.logits[0].length;
  const gradientLogits = fixture.logits.map((row, rowIndex) =>
    softmaxGradient(
      stableSoftmax(row),
      fixture.labels[rowIndex],
      "probability-minus-onehot",
    )
  );
  const raw = Array.from({ length: featureCount }, (_, featureIndex) =>
    Array.from({ length: classCount }, (_, classIndex) =>
      fixture.hidden.reduce(
        (sum, row, rowIndex) =>
          sum + row[featureIndex] * gradientLogits[rowIndex][classIndex],
        0,
      )
    )
  );
  const divisor =
    reduction === "mean"
      ? batchSize
      : reduction === "double-mean"
        ? batchSize * batchSize
        : 1;
  return raw.map((row) => row.map((value) => value / divisor));
}

function duplicateBatchFixture(
  fixture: BatchGradientFixture,
): BatchGradientFixture {
  return {
    hidden: [...fixture.hidden, ...fixture.hidden],
    logits: [...fixture.logits, ...fixture.logits],
    labels: [...fixture.labels, ...fixture.labels],
  };
}

export function compareDuplicatedBatchGradient(
  fixture: BatchGradientFixture,
  reduction: BatchReduction,
) {
  const base = classifierWeightGradient(fixture, reduction);
  const duplicated = classifierWeightGradient(
    duplicateBatchFixture(fixture),
    reduction,
  );
  return {
    base,
    duplicated,
    baseCell: base[0][0],
    duplicatedCell: duplicated[0][0],
  };
}

export function runAdamStateTransition(
  fixture: AdamFixture,
  policy: AdamStatePolicy,
) {
  const state = policy === "reset-state"
    ? { moment: 0, velocity: 0, step: 0 }
    : fixture.state;
  const gradient = policy === "reuse-moment-as-gradient"
    ? state.moment
    : fixture.gradient;
  const betaOne = 0.9;
  const betaTwo = 0.999;
  const step = state.step + 1;
  const moment =
    betaOne * state.moment + (1 - betaOne) * gradient;
  const velocity =
    betaTwo * state.velocity + (1 - betaTwo) * gradient * gradient;
  const correctedMoment = moment / (1 - betaOne ** step);
  const correctedVelocity = velocity / (1 - betaTwo ** step);
  const nextParameter =
    fixture.parameter
    - fixture.learningRate
      * correctedMoment
      / (Math.sqrt(correctedVelocity) + 1e-8);
  return {
    gradient,
    stateBefore: state,
    stateAfter: {
      moment,
      velocity,
      step,
    },
    nextParameter,
  };
}

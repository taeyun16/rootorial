import type { PracticeChallengeDefinition } from "../practice/practice";

export const optimizationPracticeChallengeIds = [
  "reproduce-step",
  "diagnose-overshoot",
  "transfer-curvature",
] as const;

export type OptimizationPracticeChallengeId =
  (typeof optimizationPracticeChallengeIds)[number];

export type UpdateOperator = "subtract" | "add";
export type UpdateDirectionPrediction = "opposes" | "follows";
export type LossDirectionPrediction = "loss-decreases" | "loss-increases";
export type OvershootDiagnosis = "wrong-sign" | "overshoot" | "stop";
export type TransferPrediction =
  | "lands-on-target"
  | "moves-closer"
  | "overshoots";

export const optimizationPracticeChallenges = [
  {
    id: "reproduce-step",
    level: "single-boundary",
    skillId: "reproduce",
    label: "step(w, lr)",
    title: "Complete both learner-owned update lines",
    summary:
      "The fixture, gradient, and support code stay fixed. You own only the operator on each parameter update.",
  },
  {
    id: "diagnose-overshoot",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "Overshoot",
    title: "Separate a correct direction from an unstable step size",
    summary:
      "The update subtracts the gradient, yet the next loss rises. Diagnose the first failed contract and choose the smallest useful repair.",
  },
  {
    id: "transfer-curvature",
    level: "transfer",
    skillId: "transfer",
    label: "New curvature",
    title: "Transfer the update rule to a steeper quadratic",
    summary:
      "Choose one learning rate that succeeds on both a visible case and a second fixture with different starting and target values.",
  },
] as const satisfies readonly PracticeChallengeDefinition<OptimizationPracticeChallengeId>[];

type ScalarQuadratic = Readonly<{
  initialWeight: number;
  target: number;
  curvature: number;
  learningRate: number;
}>;

export type ScalarQuadraticStep = Readonly<{
  gradient: number;
  nextWeight: number;
  initialLoss: number;
  nextLoss: number;
}>;

export function runScalarQuadraticStep({
  initialWeight,
  target,
  curvature,
  learningRate,
}: ScalarQuadratic): ScalarQuadraticStep {
  const gradient = 2 * curvature * (initialWeight - target);
  const nextWeight = initialWeight - learningRate * gradient;
  return {
    gradient,
    nextWeight,
    initialLoss: curvature * (initialWeight - target) ** 2,
    nextLoss: curvature * (nextWeight - target) ** 2,
  };
}

type VectorStepFixture = Readonly<{
  weights: readonly [number, number];
  gradient: readonly [number, number];
  learningRate: number;
}>;

export const reproduceVisibleFixture: VectorStepFixture = {
  weights: [-1.5, 0.5],
  gradient: [2, -4],
  learningRate: 0.25,
};

export const reproduceTransferFixture: VectorStepFixture = {
  weights: [2, -1],
  gradient: [-3, 2],
  learningRate: 0.4,
};

export function applyLearnerVectorStep(
  fixture: VectorStepFixture,
  biasOperator: UpdateOperator,
  slopeOperator: UpdateOperator,
): readonly [number, number] {
  const operate = (weight: number, gradient: number, operator: UpdateOperator) =>
    operator === "subtract"
      ? weight - fixture.learningRate * gradient
      : weight + fixture.learningRate * gradient;
  return [
    operate(fixture.weights[0], fixture.gradient[0], biasOperator),
    operate(fixture.weights[1], fixture.gradient[1], slopeOperator),
  ];
}

export const diagnoseFixture = {
  initialWeight: 3,
  target: 1,
  curvature: 2,
  learningRate: 0.6,
} as const;

export const diagnoseRepairRates = [0.05, 0.2, 0.6] as const;
export type DiagnoseRepairRate = (typeof diagnoseRepairRates)[number];

export const transferVisibleFixture = {
  initialWeight: 2,
  target: 0,
  curvature: 5,
} as const;

export const transferSecondFixture = {
  initialWeight: -3,
  target: 1.5,
  curvature: 5,
} as const;

export const transferLearningRates = [0.02, 0.1, 0.25] as const;
export type TransferLearningRate = (typeof transferLearningRates)[number];

export function closeEnough(actual: number, expected: number, tolerance = 1e-9) {
  return Math.abs(actual - expected) <= tolerance;
}

import {
  binaryCrossEntropy,
  stableSigmoid,
} from "./forward-pass.ts";
import type { PracticeChallengeDefinition } from "../practice/practice";

export type NeuralNetworksPracticeChallengeId =
  | "reproduce-output-signal"
  | "diagnose-hidden-gradient"
  | "transfer-xnor-head";

export type OutputSignalFormula =
  | "p-minus-y"
  | "y-minus-p"
  | "sigmoid-derivative-only";

export type LossDirectionPrediction =
  | "both-decrease"
  | "visible-only"
  | "both-increase";

export type HiddenGradientPath =
  | "complete-chain"
  | "missing-output-weight"
  | "missing-sigmoid-derivative";

export type GradientCheckPrediction =
  | "both-match"
  | "visible-only"
  | "neither-match";

export type XnorTransferPrediction =
  | "invert-labels"
  | "keep-labels";

export type OutputLogitTransform =
  | "negate-logit"
  | "reuse-logit"
  | "absolute-logit";

export type ScalarNeuronParameters = Readonly<{
  firstWeight: number;
  firstBias: number;
  secondWeight: number;
  secondBias: number;
}>;

export type ScalarNeuronFixture = Readonly<{
  input: number;
  label: 0 | 1;
  learningRate: number;
  parameters: ScalarNeuronParameters;
}>;

export type ScalarNeuronForward = Readonly<{
  hiddenLogit: number;
  hiddenActivation: number;
  outputLogit: number;
  probability: number;
  loss: number;
}>;

export type ScalarNeuronStep = Readonly<{
  before: ScalarNeuronForward;
  after: ScalarNeuronForward;
  outputSignal: number;
  firstWeightGradient: number;
  secondWeightGradient: number;
}>;

export type HiddenGradientCheck = Readonly<{
  analytic: number;
  numerical: number;
  matches: boolean;
}>;

export const neuralNetworksPracticeChallenges:
readonly PracticeChallengeDefinition<NeuralNetworksPracticeChallengeId>[] = [
  {
    id: "reproduce-output-signal",
    level: "single-boundary",
    skillId: "reproduce",
    label: "δ² = ?",
    title: "Reproduce the output signal on two fresh neurons",
    summary: "Choose the BCE-plus-sigmoid signal that makes both one-step updates descend.",
  },
  {
    id: "diagnose-hidden-gradient",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "Gradient check",
    title: "Find the missing factor with a numerical gradient",
    summary: "Compare one analytic hidden gradient with a central finite-difference probe.",
  },
  {
    id: "transfer-xnor-head",
    level: "transfer",
    skillId: "transfer",
    label: "XOR → XNOR",
    title: "Transfer one learned boundary to the complementary rule",
    summary: "Keep the hidden representation and change only the output-logit contract.",
  },
] as const;

export const scalarVisibleFixture: ScalarNeuronFixture = Object.freeze({
  input: 0.75,
  label: 1,
  learningRate: 0.2,
  parameters: Object.freeze({
    firstWeight: 0.6,
    firstBias: -0.2,
    secondWeight: 1.1,
    secondBias: -0.1,
  }),
});

export const scalarSecondFixture: ScalarNeuronFixture = Object.freeze({
  input: -1.25,
  label: 0,
  learningRate: 0.15,
  parameters: Object.freeze({
    firstWeight: -0.4,
    firstBias: 0.15,
    secondWeight: 0.9,
    secondBias: -0.2,
  }),
});

export const xnorVisibleLogits = Object.freeze([-4, 4, 5, -5]);
export const xnorSecondLogits = Object.freeze([-1.5, 2.2, 1.8, -2.5]);
export const xnorLabels = Object.freeze([1, 0, 0, 1] as const);

function forwardScalarNeuron(
  input: number,
  label: 0 | 1,
  parameters: ScalarNeuronParameters,
): ScalarNeuronForward {
  const hiddenLogit = input * parameters.firstWeight + parameters.firstBias;
  const hiddenActivation = stableSigmoid(hiddenLogit);
  const outputLogit =
    hiddenActivation * parameters.secondWeight + parameters.secondBias;
  const probability = stableSigmoid(outputLogit);
  return {
    hiddenLogit,
    hiddenActivation,
    outputLogit,
    probability,
    loss: binaryCrossEntropy(probability, label),
  };
}

function outputSignal(
  forward: ScalarNeuronForward,
  label: 0 | 1,
  formula: OutputSignalFormula,
) {
  if (formula === "p-minus-y") return forward.probability - label;
  if (formula === "y-minus-p") return label - forward.probability;
  return forward.probability * (1 - forward.probability);
}

export function runScalarNeuronStep(
  fixture: ScalarNeuronFixture,
  formula: OutputSignalFormula,
): ScalarNeuronStep {
  const before = forwardScalarNeuron(
    fixture.input,
    fixture.label,
    fixture.parameters,
  );
  const signal = outputSignal(before, fixture.label, formula);
  const hiddenDerivative =
    before.hiddenActivation * (1 - before.hiddenActivation);
  const hiddenLogitGradient =
    signal * fixture.parameters.secondWeight * hiddenDerivative;
  const firstWeightGradient = fixture.input * hiddenLogitGradient;
  const secondWeightGradient = before.hiddenActivation * signal;
  const afterParameters = {
    firstWeight:
      fixture.parameters.firstWeight
      - fixture.learningRate * firstWeightGradient,
    firstBias:
      fixture.parameters.firstBias
      - fixture.learningRate * hiddenLogitGradient,
    secondWeight:
      fixture.parameters.secondWeight
      - fixture.learningRate * secondWeightGradient,
    secondBias:
      fixture.parameters.secondBias
      - fixture.learningRate * signal,
  };
  return {
    before,
    after: forwardScalarNeuron(
      fixture.input,
      fixture.label,
      afterParameters,
    ),
    outputSignal: signal,
    firstWeightGradient,
    secondWeightGradient,
  };
}

function lossAtFirstWeight(
  fixture: ScalarNeuronFixture,
  firstWeight: number,
) {
  return forwardScalarNeuron(
    fixture.input,
    fixture.label,
    { ...fixture.parameters, firstWeight },
  ).loss;
}

export function finiteDifferenceFirstWeight(
  fixture: ScalarNeuronFixture,
  epsilon = 1e-5,
) {
  const weight = fixture.parameters.firstWeight;
  return (
    lossAtFirstWeight(fixture, weight + epsilon)
    - lossAtFirstWeight(fixture, weight - epsilon)
  ) / (2 * epsilon);
}

export function checkHiddenGradient(
  fixture: ScalarNeuronFixture,
  path: HiddenGradientPath,
): HiddenGradientCheck {
  const forward = forwardScalarNeuron(
    fixture.input,
    fixture.label,
    fixture.parameters,
  );
  const signal = forward.probability - fixture.label;
  const upstream =
    path === "missing-output-weight" ? 1 : fixture.parameters.secondWeight;
  const localDerivative =
    path === "missing-sigmoid-derivative"
      ? 1
      : forward.hiddenActivation * (1 - forward.hiddenActivation);
  const analytic = fixture.input * signal * upstream * localDerivative;
  const numerical = finiteDifferenceFirstWeight(fixture);
  return {
    analytic,
    numerical,
    matches: Math.abs(analytic - numerical) <= 1e-7,
  };
}

export function transferOutputLogits(
  logits: readonly number[],
  transform: OutputLogitTransform,
) {
  return logits.map((logit) => {
    const transferred =
      transform === "negate-logit"
        ? -logit
        : transform === "absolute-logit"
          ? Math.abs(logit)
          : logit;
    return stableSigmoid(transferred) >= 0.5 ? 1 : 0;
  });
}

import {
  binaryCrossEntropy,
  stableSigmoid,
  type BinaryInput,
  xorDataset,
} from "./forward-pass.ts";

export type Vector2 = readonly [number, number];
export type Matrix2x2 = readonly [Vector2, Vector2];

export type XorBackpropParameters = {
  firstWeights: Matrix2x2;
  firstBias: Vector2;
  secondWeights: Vector2;
  secondBias: number;
};

export type XorBackpropForwardRow = {
  input: BinaryInput;
  label: 0 | 1;
  hiddenLogits: Vector2;
  hiddenActivations: Vector2;
  outputLogit: number;
  probability: number;
  predictedClass: 0 | 1;
  loss: number;
};

export type XorBackpropForward = {
  rows: XorBackpropForwardRow[];
  meanLoss: number;
  correctCount: number;
};

export type XorBackpropRowTrace = {
  outputDelta: number;
  hiddenActivationGradient: Vector2;
  hiddenDerivative: Vector2;
  hiddenLogitDelta: Vector2;
  firstWeightContribution: Matrix2x2;
  firstBiasContribution: Vector2;
  secondWeightContribution: Vector2;
  secondBiasContribution: number;
};

export type XorBackpropGradients = {
  firstWeights: Matrix2x2;
  firstBias: Vector2;
  secondWeights: Vector2;
  secondBias: number;
};

export type XorBackpropTrace = {
  before: XorBackpropForward;
  rowTraces: XorBackpropRowTrace[];
  gradients: XorBackpropGradients;
};

export type XorBackpropStep = XorBackpropTrace & {
  learningRate: number;
  afterParameters: XorBackpropParameters;
  after: XorBackpropForward;
};

// The directions match the handcrafted OR/NAND XOR network from the forward lab.
// Smaller hidden weights keep sigmoid away from saturation so its local derivative
// remains visible during the required backpropagation exercise.
export const xorBackpropFixture: XorBackpropParameters = {
  firstWeights: [
    [2, -2],
    [2, -2],
  ],
  firstBias: [-1, 3],
  secondWeights: [8, 8],
  secondBias: -10.5,
};

export const XOR_BACKPROP_LEARNING_RATE = 1;

function forwardRow(
  parameters: XorBackpropParameters,
  input: BinaryInput,
  label: 0 | 1,
): XorBackpropForwardRow {
  const hiddenLogits = [
    input[0] * parameters.firstWeights[0][0]
      + input[1] * parameters.firstWeights[1][0]
      + parameters.firstBias[0],
    input[0] * parameters.firstWeights[0][1]
      + input[1] * parameters.firstWeights[1][1]
      + parameters.firstBias[1],
  ] as const;
  const hiddenActivations = [
    stableSigmoid(hiddenLogits[0]),
    stableSigmoid(hiddenLogits[1]),
  ] as const;
  const outputLogit = hiddenActivations[0] * parameters.secondWeights[0]
    + hiddenActivations[1] * parameters.secondWeights[1]
    + parameters.secondBias;
  const probability = stableSigmoid(outputLogit);
  return {
    input,
    label,
    hiddenLogits,
    hiddenActivations,
    outputLogit,
    probability,
    predictedClass: probability >= 0.5 ? 1 : 0,
    loss: binaryCrossEntropy(probability, label),
  };
}

export function forwardXorBackprop(
  parameters: XorBackpropParameters = xorBackpropFixture,
): XorBackpropForward {
  const rows = xorDataset.map(({ input, label }) => forwardRow(parameters, input, label));
  return {
    rows,
    meanLoss: rows.reduce((sum, row) => sum + row.loss, 0) / rows.length,
    correctCount: rows.filter((row) => row.predictedClass === row.label).length,
  };
}

function mean(values: readonly number[]) {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function product(left: number, right: number) {
  const value = left * right;
  return value === 0 ? 0 : value;
}

export function backpropagateXorMeanBce(
  parameters: XorBackpropParameters = xorBackpropFixture,
): XorBackpropTrace {
  const before = forwardXorBackprop(parameters);
  const rowTraces = before.rows.map((row): XorBackpropRowTrace => {
    // BCE(sigmoid(z), y) simplifies to this local output signal.
    const outputDelta = row.probability - row.label;
    const hiddenActivationGradient = [
      outputDelta * parameters.secondWeights[0],
      outputDelta * parameters.secondWeights[1],
    ] as const;
    const hiddenDerivative = [
      row.hiddenActivations[0] * (1 - row.hiddenActivations[0]),
      row.hiddenActivations[1] * (1 - row.hiddenActivations[1]),
    ] as const;
    const hiddenLogitDelta = [
      hiddenActivationGradient[0] * hiddenDerivative[0],
      hiddenActivationGradient[1] * hiddenDerivative[1],
    ] as const;
    const firstWeightContribution = [
      [
        product(row.input[0], hiddenLogitDelta[0]),
        product(row.input[0], hiddenLogitDelta[1]),
      ],
      [
        product(row.input[1], hiddenLogitDelta[0]),
        product(row.input[1], hiddenLogitDelta[1]),
      ],
    ] as const;
    return {
      outputDelta,
      hiddenActivationGradient,
      hiddenDerivative,
      hiddenLogitDelta,
      firstWeightContribution,
      firstBiasContribution: hiddenLogitDelta,
      secondWeightContribution: [
        row.hiddenActivations[0] * outputDelta,
        row.hiddenActivations[1] * outputDelta,
      ],
      secondBiasContribution: outputDelta,
    };
  });

  const gradients: XorBackpropGradients = {
    firstWeights: [
      [
        mean(rowTraces.map((trace) => trace.firstWeightContribution[0][0])),
        mean(rowTraces.map((trace) => trace.firstWeightContribution[0][1])),
      ],
      [
        mean(rowTraces.map((trace) => trace.firstWeightContribution[1][0])),
        mean(rowTraces.map((trace) => trace.firstWeightContribution[1][1])),
      ],
    ],
    firstBias: [
      mean(rowTraces.map((trace) => trace.firstBiasContribution[0])),
      mean(rowTraces.map((trace) => trace.firstBiasContribution[1])),
    ],
    secondWeights: [
      mean(rowTraces.map((trace) => trace.secondWeightContribution[0])),
      mean(rowTraces.map((trace) => trace.secondWeightContribution[1])),
    ],
    secondBias: mean(rowTraces.map((trace) => trace.secondBiasContribution)),
  };

  return { before, rowTraces, gradients };
}

export function applyXorGradientStep(
  parameters: XorBackpropParameters,
  gradients: XorBackpropGradients,
  learningRate = XOR_BACKPROP_LEARNING_RATE,
): XorBackpropParameters {
  if (!Number.isFinite(learningRate) || learningRate <= 0) {
    throw new Error("learningRate must be a finite positive number");
  }
  return {
    firstWeights: [
      [
        parameters.firstWeights[0][0] - learningRate * gradients.firstWeights[0][0],
        parameters.firstWeights[0][1] - learningRate * gradients.firstWeights[0][1],
      ],
      [
        parameters.firstWeights[1][0] - learningRate * gradients.firstWeights[1][0],
        parameters.firstWeights[1][1] - learningRate * gradients.firstWeights[1][1],
      ],
    ],
    firstBias: [
      parameters.firstBias[0] - learningRate * gradients.firstBias[0],
      parameters.firstBias[1] - learningRate * gradients.firstBias[1],
    ],
    secondWeights: [
      parameters.secondWeights[0] - learningRate * gradients.secondWeights[0],
      parameters.secondWeights[1] - learningRate * gradients.secondWeights[1],
    ],
    secondBias: parameters.secondBias - learningRate * gradients.secondBias,
  };
}

export function runXorBackpropStep(
  parameters: XorBackpropParameters = xorBackpropFixture,
  learningRate = XOR_BACKPROP_LEARNING_RATE,
): XorBackpropStep {
  const trace = backpropagateXorMeanBce(parameters);
  const afterParameters = applyXorGradientStep(
    parameters,
    trace.gradients,
    learningRate,
  );
  return {
    ...trace,
    learningRate,
    afterParameters,
    after: forwardXorBackprop(afterParameters),
  };
}

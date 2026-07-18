import assert from "node:assert/strict";
import test from "node:test";
import {
  binaryCrossEntropy,
  canCompleteNeuralNetworksChapter,
  collapsedXorConfig,
  evaluateLayerShape,
  evaluateNetworkRepair,
  evaluateXorMastery,
  referenceXorConfig,
  runLinearXorBoundary,
  runXorNetwork,
  stableSigmoid,
} from "../src/features/neural-networks/forward-pass.ts";
import {
  neuralNetworksHiddenRepairCode,
  neuralNetworksLinearBoundaryCode,
} from "../src/data/neuralNetworksNotebook.ts";
import {
  applyXorGradientStep,
  backpropagateXorMeanBce,
  forwardXorBackprop,
  runXorBackpropStep,
  xorBackpropFixture,
} from "../src/features/neural-networks/backpropagation.ts";

function close(actual, expected, tolerance = 1e-12) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function flattenParameters(parameters) {
  return [
    ...parameters.firstWeights[0],
    ...parameters.firstWeights[1],
    ...parameters.firstBias,
    ...parameters.secondWeights,
    parameters.secondBias,
  ];
}

function parametersFromFlat(values) {
  return {
    firstWeights: [[values[0], values[1]], [values[2], values[3]]],
    firstBias: [values[4], values[5]],
    secondWeights: [values[6], values[7]],
    secondBias: values[8],
  };
}

test("ships self-contained Python bridges for bounded linear search and hidden repair", () => {
  assert.match(neuralNetworksLinearBoundaryCode, /grid_search_best/);
  assert.match(neuralNetworksLinearBoundaryCode, /assert best_correct == 3/);
  assert.match(neuralNetworksLinearBoundaryCode, /bounded search matches the geometric XOR limit/);
  assert.match(neuralNetworksHiddenRepairCode, /hidden = hidden_logits/);
  assert.match(neuralNetworksHiddenRepairCode, /identity_effective_weights = W1 @ W2/);
  assert.match(neuralNetworksHiddenRepairCode, /identity_effective_bias/);
  assert.match(neuralNetworksHiddenRepairCode, /identity_correct=\{identity_correct\}\/4/);
  assert.match(neuralNetworksHiddenRepairCode, /assert identity_correct == 2/);
  assert.match(neuralNetworksHiddenRepairCode, /assert correct == 4/);
  assert.match(neuralNetworksHiddenRepairCode, /assert mean_bce < 0\.1/);
  assert.doesNotMatch(neuralNetworksLinearBoundaryCode, /[가-힣]/);
  assert.doesNotMatch(neuralNetworksHiddenRepairCode, /[가-힣]/);
});

test("maps extreme logits to stable probabilities and keeps BCE finite", () => {
  assert.equal(stableSigmoid(1000), 1);
  assert.equal(stableSigmoid(-1000), 0);
  assert.equal(stableSigmoid(0), 0.5);
  assert.ok(Number.isFinite(binaryCrossEntropy(0, 1)));
  assert.ok(Number.isFinite(binaryCrossEntropy(1, 0)));
});

test("penalizes a confident wrong probability more than an uncertain one", () => {
  const uncertainWrong = binaryCrossEntropy(0.49, 1);
  const confidentWrong = binaryCrossEntropy(0.01, 1);
  const confidentCorrect = binaryCrossEntropy(0.9, 1);
  assert.ok(confidentWrong > uncertainWrong);
  assert.ok(uncertainWrong > confidentCorrect);
});

test("shows a representative linear XOR boundary stopping at three rows", () => {
  const run = runLinearXorBoundary();
  assert.equal(run.correctCount, 3);
  assert.equal(run.accuracy, 0.75);
  assert.deepEqual(
    run.rows.map(({ predictedClass }) => predictedClass),
    [0, 1, 1, 1],
  );
});

test("solves XOR with two causally necessary hidden sigmoid features", () => {
  const run = runXorNetwork(referenceXorConfig);
  const mastery = evaluateXorMastery(run);
  assert.equal(run.correctCount, 4);
  assert.ok(run.meanLoss < 0.03);
  assert.ok(run.rows.filter(({ label }) => label === 1).every(({ probability }) => probability > 0.9));
  assert.ok(run.rows.filter(({ label }) => label === 0).every(({ probability }) => probability < 0.1));
  assert.deepEqual(mastery, {
    mastered: true,
    reason: "mastered",
    ablatedCorrectCounts: [2, 2],
  });
});

test("does not mistake stacked affine maps without activation for an XOR network", () => {
  const run = runXorNetwork(collapsedXorConfig);
  const mastery = evaluateXorMastery(run);
  assert.ok(run.correctCount < 4);
  assert.equal(mastery.mastered, false);
  assert.equal(mastery.reason, "truth-table");
});

test("backpropagates the four-row XOR mean BCE through both weight layers", () => {
  const before = forwardXorBackprop();
  const trace = backpropagateXorMeanBce();
  const representative = trace.rowTraces[2];

  assert.equal(before.correctCount, 4);
  close(before.meanLoss, 0.32900735003521897);
  assert.deepEqual(before.rows.map(({ hiddenLogits }) => hiddenLogits), [
    [-1, 3],
    [1, 1],
    [1, 1],
    [3, -1],
  ]);
  close(before.rows[2].probability, 0.7679794907037306);
  close(representative.outputDelta, -0.23202050929626938);
  close(representative.hiddenDerivative[0], 0.19661193324148185);
  close(representative.hiddenLogitDelta[0], -0.3649440070753019);
  assert.deepEqual(representative.firstWeightContribution[1], [0, 0]);

  close(trace.gradients.firstWeights[0][0], -0.06181144197173813);
  close(trace.gradients.firstWeights[0][1], 0.036821708140311674);
  close(trace.gradients.firstWeights[1][0], -0.06181144197173813);
  close(trace.gradients.firstWeights[1][1], 0.036821708140311674);
  close(trace.gradients.firstBias[0], -0.02498973383142646);
  close(trace.gradients.firstBias[1], -0.02498973383142647);
  close(trace.gradients.secondWeights[0], 0.014639726970209183);
  close(trace.gradients.secondWeights[1], 0.014639726970209183);
  close(trace.gradients.secondBias, 0.046820286456222715);
});

test("matches analytic XOR gradients to finite differences", () => {
  const analytic = flattenParameters(backpropagateXorMeanBce().gradients);
  const initial = flattenParameters(xorBackpropFixture);
  const epsilon = 1e-5;

  for (let index = 0; index < initial.length; index += 1) {
    const plus = [...initial];
    const minus = [...initial];
    plus[index] += epsilon;
    minus[index] -= epsilon;
    const numeric = (
      forwardXorBackprop(parametersFromFlat(plus)).meanLoss
      - forwardXorBackprop(parametersFromFlat(minus)).meanLoss
    ) / (2 * epsilon);
    close(analytic[index], numeric, 1e-6);
  }
});

test("lowers XOR mean BCE with one immutable batch-gradient step", () => {
  const fixtureSnapshot = JSON.stringify(xorBackpropFixture);
  const step = runXorBackpropStep();

  close(step.after.meanLoss, 0.31525433427481114);
  assert.ok(step.after.meanLoss < step.before.meanLoss);
  assert.equal(step.after.correctCount, 4);
  assert.equal(JSON.stringify(xorBackpropFixture), fixtureSnapshot);
  assert.notEqual(step.afterParameters, xorBackpropFixture);
  assert.throws(
    () => applyXorGradientStep(xorBackpropFixture, step.gradients, 0),
    /learningRate must be a finite positive number/,
  );
});

test("grades network surgery from shape and forward semantics", () => {
  assert.deepEqual(evaluateLayerShape([2, 2]), {
    correct: true,
    reason: "correct",
    outputShape: [4, 1],
  });
  assert.deepEqual(evaluateLayerShape([3, 2]), {
    correct: false,
    reason: "shape-mismatch",
    expectedInner: 2,
    actualInner: 3,
  });
  assert.equal(evaluateLayerShape([2, 3]).correct, false);

  assert.equal(evaluateNetworkRepair("shape-contract", "2x2").correct, true);
  assert.equal(evaluateNetworkRepair("shape-contract", "2x3").correct, false);
  assert.equal(evaluateNetworkRepair("missing-activation", "sigmoid").correct, true);
  assert.equal(evaluateNetworkRepair("missing-activation", "identity").correct, false);
  assert.equal(evaluateNetworkRepair("missing-activation", "relu").correct, false);
  assert.equal(evaluateNetworkRepair("output-combination", "xor").correct, true);
  assert.equal(evaluateNetworkRepair("output-combination", "or").correct, false);
  assert.equal(evaluateNetworkRepair("probability-head", "sigmoid").correct, true);
  assert.equal(
    evaluateNetworkRepair("probability-head", "identity").reason,
    "invalid-probability",
  );
});

test("requires XOR, hidden backprop, and concepts while keeping debugger optional", () => {
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    backpropLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    backpropLabComplete: true,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: false,
    backpropLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    backpropLabComplete: false,
    debuggerComplete: true,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    backpropLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: false,
  }), false);
});

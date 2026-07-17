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

test("requires both semantic activities and concept mastery for completion", () => {
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    debuggerComplete: true,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: false,
    debuggerComplete: true,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteNeuralNetworksChapter({
    xorLabComplete: true,
    debuggerComplete: true,
    conceptsMastered: false,
  }), false);
});

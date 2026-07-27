import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  optimizationGradientRepairCode,
  optimizationGradientRepairCodeEn,
  optimizationNumpyCode,
} from "../src/data/optimizationNotebook.ts";
import {
  applyGradientStep,
  canMasterDescentRepair,
  canCompleteOptimizationChapter,
  descentPresets,
  evaluateOptimizerAction,
  linearMseGradient,
  meanSquaredError,
  simulateGradientDescent,
} from "../src/features/optimization/gradient-descent.ts";

const closeTo = (actual, expected, tolerance = 1e-10) => {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
};

test("publishes two independent English-only NumPy cells with an explicit gradient repair", () => {
  assert.match(optimizationNumpyCode, /gradient = \(2 \/ len\(y\)\) \* X\.T @ residual/);
  assert.match(optimizationGradientRepairCode, /def mse\(weights\):/);
  assert.match(optimizationGradientRepairCode, /epsilon = 1e-6/);
  assert.match(optimizationGradientRepairCode, /gradient = X\.T @ residual/);
  assert.match(optimizationGradientRepairCode, /np\.allclose\(gradient, numerical_gradient/);
  assert.match(optimizationGradientRepairCode, /PASS: analytic MSE gradient matches the finite-difference probe/);
  assert.equal(optimizationGradientRepairCodeEn, optimizationGradientRepairCode);
  assert.doesNotMatch(optimizationGradientRepairCode, /[가-힣]/);
});

test("computes the linear MSE and its weight-shaped gradient", () => {
  const weights = { bias: -2, slope: -1 };
  assert.equal(meanSquaredError(weights), 15);
  assert.deepEqual(linearMseGradient(weights), { bias: -6, slope: -4 });

  const epsilon = 1e-6;
  const analytic = linearMseGradient(weights);
  const numericBias = (
    meanSquaredError({ ...weights, bias: weights.bias + epsilon })
    - meanSquaredError({ ...weights, bias: weights.bias - epsilon })
  ) / (2 * epsilon);
  const numericSlope = (
    meanSquaredError({ ...weights, slope: weights.slope + epsilon })
    - meanSquaredError({ ...weights, slope: weights.slope - epsilon })
  ) / (2 * epsilon);
  closeTo(analytic.bias, numericBias, 1e-8);
  closeTo(analytic.slope, numericSlope, 1e-8);
});

test("takes the useful preset's first descent step exactly", () => {
  const gradient = linearMseGradient(descentPresets.useful.initialWeights);
  const next = applyGradientStep(
    descentPresets.useful.initialWeights,
    gradient,
    descentPresets.useful.learningRate,
  );
  closeTo(next.bias, -0.2);
  closeTo(next.slope, 0.2);
  closeTo(meanSquaredError(next), 3.6);
});

test("distinguishes slow, stable, and divergent learning rates", () => {
  const slow = simulateGradientDescent(descentPresets["too-small"]);
  const useful = simulateGradientDescent(descentPresets.useful);
  const large = simulateGradientDescent(descentPresets["too-large"]);

  assert.equal(slow.outcome, "slow");
  assert.ok(slow.finalLoss < slow.initialLoss);
  assert.equal(useful.outcome, "converging");
  assert.ok(useful.finalLoss < 0.001);
  assert.equal(large.outcome, "diverging");
  assert.ok(large.finalLoss > large.initialLoss);

  const capped = simulateGradientDescent({
    initialWeights: { bias: -2, slope: -1 },
    learningRate: 100,
    steps: 24,
  });
  assert.equal(capped.outcome, "diverging");
  assert.equal(capped.stoppedEarly, true);
  assert.ok(capped.snapshots.length < 25);
});

test("requires a learning-rate-only repair from the observed failed run", () => {
  const badRunConfig = descentPresets["too-large"];
  const usefulConfig = descentPresets.useful;
  const useful = simulateGradientDescent(usefulConfig);
  assert.equal(canMasterDescentRepair({
    badRunConfig,
    currentConfig: usefulConfig,
    predictedOutcome: "converging",
    simulation: useful,
  }), true);

  const changedStartingConditions = {
    initialWeights: { bias: 1, slope: -1 },
    learningRate: 1.1,
    steps: 8,
  };
  const shortcut = simulateGradientDescent(changedStartingConditions);
  assert.equal(shortcut.outcome, "converging");
  assert.equal(canMasterDescentRepair({
    badRunConfig,
    currentConfig: changedStartingConditions,
    predictedOutcome: "converging",
    simulation: shortcut,
  }), false);

  const alreadySolved = {
    initialWeights: { bias: 1, slope: 2 },
    learningRate: 0.3,
    steps: 12,
  };
  assert.equal(canMasterDescentRepair({
    badRunConfig,
    currentConfig: alreadySolved,
    predictedOutcome: "converging",
    simulation: simulateGradientDescent(alreadySolved),
  }), false);
  assert.equal(canMasterDescentRepair({
    badRunConfig: null,
    currentConfig: usefulConfig,
    predictedOutcome: "converging",
    simulation: useful,
  }), false);
});

test("grades optimizer repairs from the resulting loss, not an answer key", () => {
  const wrongSign = evaluateOptimizerAction(
    "positive-gradient",
    "add-gradient",
    0.25,
  );
  assert.equal(wrongSign.correct, false);
  assert.equal(wrongSign.reason, "wrong-sign");

  const noUpdate = evaluateOptimizerAction(
    "negative-gradient",
    "stop",
    0,
  );
  assert.equal(noUpdate.correct, false);
  assert.equal(noUpdate.reason, "no-update");

  const overshot = evaluateOptimizerAction(
    "steep-gradient",
    "subtract-gradient",
    0.5,
  );
  assert.equal(overshot.correct, false);
  assert.equal(overshot.reason, "overshot");

  const negativeGradient = evaluateOptimizerAction(
    "negative-gradient",
    "subtract-gradient",
    0.25,
  );
  assert.equal(negativeGradient.correct, true);
  assert.ok(negativeGradient.nextLoss < negativeGradient.previousLoss);

  const prematureStop = evaluateOptimizerAction(
    "small-gradient",
    "stop",
    0,
  );
  assert.equal(prematureStop.correct, false);
  assert.equal(prematureStop.reason, "no-update");
  assert.ok(prematureStop.gradient > 0);
  const smallStep = evaluateOptimizerAction(
    "small-gradient",
    "subtract-gradient",
    0.25,
  );
  assert.equal(smallStep.correct, true);
  assert.ok(smallStep.nextLoss < smallStep.previousLoss);
});

test("requires the core lab and concept check while keeping debugger remediation optional", () => {
  assert.equal(canCompleteOptimizationChapter({
    descentLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteOptimizationChapter({
    descentLabComplete: true,
    conceptsMastered: true,
  }), true);
  for (const missing of ["descentLabComplete", "conceptsMastered"]) {
    const state = {
      descentLabComplete: true,
      debuggerComplete: false,
      conceptsMastered: true,
      [missing]: false,
    };
    assert.equal(canCompleteOptimizationChapter(state), false);
  }
});

test("states the optimization completion gate without presenting the debugger as required", () => {
  const conceptCheckSource = readFileSync(
    new URL("../src/components/optimization/OptimizationConceptCheck.tsx", import.meta.url),
    "utf8",
  );
  const chapterSource = readFileSync(
    new URL("../src/components/optimization/OptimizationChapter.tsx", import.meta.url),
    "utf8",
  );
  const vectorsSource = readFileSync(
    new URL("../src/components/VectorsChapter.tsx", import.meta.url),
    "utf8",
  );

  assert.match(
    conceptCheckSource,
    /Finish all five questions and the required learning-rate repair lab/,
  );
  assert.doesNotMatch(conceptCheckSource, /both required activities/);
  assert.match(chapterSource, /t\("선택", "Optional"\)/);
  assert.match(chapterSource, /chapters\/vectors\$\{isKo/);
  assert.match(chapterSource, /chapters\/neural-networks\$\{isKo/);
  assert.match(vectorsSource, /chapters\/optimization\$\{isKo/);
});

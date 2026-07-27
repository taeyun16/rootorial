import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  advanceTrainingStep,
  canCompleteTrainingChapter,
  createTrainingState,
  crossEntropyFromLogits,
  evaluateTrainingMastery,
  evaluateTrainingRepair,
  fullDatasetLoss,
  gradeDropoutContract,
  gradeLossContract,
  gradeSoftmaxContract,
  gradeStateLifetime,
  meanCrossEntropy,
  softmaxRows,
  stableSoftmax,
  updatesPerEpoch,
} from "../src/features/training/training-simulator.ts";
import {
  trainingAdamEpochCode,
  trainingAdamEpochCodeEn,
  trainingAdamEpochSupportCode,
  trainingAdamEpochSupportCodeEn,
  trainingSoftmaxAxisRepairCode,
  trainingSoftmaxAxisRepairCodeEn,
} from "../src/data/trainingNotebook.ts";

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("ships independent Python bridges for Softmax-axis repair and a full Adam epoch", () => {
  assert.equal(trainingSoftmaxAxisRepairCodeEn, trainingSoftmaxAxisRepairCode);
  assert.equal(trainingAdamEpochCodeEn, trainingAdamEpochCode);
  assert.equal(trainingAdamEpochSupportCodeEn, trainingAdamEpochSupportCode);
  const adamEpochProgram = `${trainingAdamEpochSupportCode}\n\n${trainingAdamEpochCode}`;
  assert.match(trainingSoftmaxAxisRepairCode, /class_axis = 0/);
  assert.match(trainingSoftmaxAxisRepairCode, /np\.allclose\(row_sums, np\.ones\(2\)\)/);
  assert.match(trainingSoftmaxAxisRepairCode, /first_row_shift < 1e-12/);
  assert.match(trainingSoftmaxAxisRepairCode, /0\.288725992/);
  assert.match(adamEpochProgram, /np\.array\(\[6\]\)/);
  assert.match(adamEpochProgram, /grad_logits = probabilities\.copy\(\)/);
  assert.match(adamEpochProgram, /m_W = beta_1 \* m_W/);
  assert.match(adamEpochProgram, /assert step == 4/);
  assert.match(adamEpochProgram, /0\.225353/);
  assert.ok(trainingAdamEpochCode.split("\n").length <= 80);
  assert.ok(trainingAdamEpochSupportCode.split("\n").length <= 80);
  assert.doesNotMatch(trainingSoftmaxAxisRepairCode, /[가-힣]/);
  assert.doesNotMatch(trainingAdamEpochCode, /[가-힣]/);
  assert.doesNotMatch(trainingAdamEpochSupportCode, /[가-힣]/);
});

test("computes stable row softmax without coupling samples", () => {
  const first = stableSoftmax([1000, 998, 997]);
  const shifted = stableSoftmax([10, 8, 7]);
  close(first.reduce((sum, value) => sum + value, 0), 1);
  assert.ok(first.every(Number.isFinite));
  for (let index = 0; index < first.length; index += 1) {
    close(first[index], shifted[index]);
  }

  const rows = softmaxRows([[1000, 998, 997], [-1000, -999, -998]]);
  assert.equal(rows.length, 2);
  rows.forEach((row) => close(row.reduce((sum, value) => sum + value, 0), 1));
  assert.deepEqual(rows[0], first);
});

test("reads true-label cross entropy from raw logits with a mean reduction", () => {
  const confidentCorrect = crossEntropyFromLogits([8, 0, -2], 0);
  const confidentWrong = crossEntropyFromLogits([8, 0, -2], 2);
  assert.ok(Number.isFinite(confidentCorrect));
  assert.ok(Number.isFinite(confidentWrong));
  assert.ok(confidentWrong > confidentCorrect + 9);

  const logits = [[5, 1, -1], [4, 3, 2]];
  const labels = [0, 2];
  const mean = meanCrossEntropy(logits, labels);
  close(meanCrossEntropy([...logits, ...logits], [...labels, ...labels]), mean);
  assert.throws(() => crossEntropyFromLogits([1, 2], 2));
  assert.throws(() => meanCrossEntropy([[1, 2], [1]], [0, 0]), /rectangular/);
  assert.throws(
    () => crossEntropyFromLogits([0, Number.POSITIVE_INFINITY], 0),
    /finite and non-empty/,
  );
});

test("counts incomplete tail batches instead of dropping them", () => {
  assert.equal(updatesPerEpoch(7, 2), 4);
  assert.equal(updatesPerEpoch(6, 2), 3);
  assert.equal(updatesPerEpoch(1, 8), 1);
  assert.throws(() => updatesPerEpoch(0, 2));
  assert.throws(() => updatesPerEpoch(7, 0));
});

test("captures a causal mini-batch and Adam trace across one full epoch", () => {
  let state = createTrainingState("grouped");
  const initialLoss = fullDatasetLoss(state);
  const history = [];
  const predictions = [
    "batch-down-full-up",
    "both-down",
    "both-down",
    "both-down",
  ];

  for (const prediction of predictions) {
    const result = advanceTrainingStep(state, prediction);
    state = result.state;
    history.push(result.snapshot);
  }

  assert.deepEqual(history.map(({ batchIndices }) => batchIndices), [[0, 1], [2, 3], [4, 5], [6]]);
  assert.deepEqual(history.map(({ labels }) => labels), [[0, 0], [1, 1], [2, 2], [1]]);
  assert.equal(history[0].actualOutcome, "batch-down-full-up");
  assert.ok(history[0].batchLossAfter < history[0].batchLossBefore);
  assert.ok(history[0].fullLossAfter > history[0].fullLossBefore);
  assert.equal(history[1].stateBefore.adam.step, 1);
  assert.equal(history[1].stateAfter.adam.step, 2);
  assert.ok(history[1].stateBefore.adam.mWeights.flat().some((value) => Math.abs(value) > 1e-8));
  assert.equal(history.at(-1).batchIndices.length, 1);
  assert.ok(history.at(-1).fullLossAfter < initialLoss - 0.02);
  assert.equal(state.adam.step, 4);
});

test("keeps old training snapshots immutable when later updates run", () => {
  const first = advanceTrainingStep(createTrainingState("grouped"), "batch-down-full-up");
  const savedWeights = structuredClone(first.snapshot.stateAfter.weights);
  const second = advanceTrainingStep(first.state, "both-down");
  assert.deepEqual(first.snapshot.stateAfter.weights, savedWeights);
  assert.notDeepEqual(second.state.weights, savedWeights);
});

test("requires observed dynamics, Adam memory, a parameter inspection, and loss recovery", () => {
  let state = createTrainingState("grouped");
  const history = [];
  for (const prediction of ["batch-down-full-up", "both-down", "both-down", "both-down"]) {
    const result = advanceTrainingStep(state, prediction);
    state = result.state;
    history.push(result.snapshot);
  }

  assert.deepEqual(evaluateTrainingMastery(history, { update: 2, row: 0, column: 0 }), {
    mastered: true,
    reason: "mastered",
  });
  assert.equal(evaluateTrainingMastery(history, null).reason, "parameter-inspection");

  const wrongPrediction = structuredClone(history);
  wrongPrediction[0].predictionAtRun = "both-down";
  assert.equal(evaluateTrainingMastery(wrongPrediction, { update: 2, row: 0, column: 0 }).reason, "prediction");

  let alternate = createTrainingState("interleaved");
  const alternateHistory = [];
  for (const prediction of ["both-down", "both-down", "both-down", "both-down"]) {
    const result = advanceTrainingStep(alternate, prediction);
    alternate = result.state;
    alternateHistory.push(result.snapshot);
  }
  assert.equal(evaluateTrainingMastery(alternateHistory, { update: 2, row: 0, column: 0 }).reason, "required-plan");
});

test("grades training-loop repairs from their computed invariants", () => {
  assert.equal(evaluateTrainingRepair("softmax-contract", "row-stable").correct, true);
  assert.equal(evaluateTrainingRepair("softmax-contract", "column-softmax").reason, "sample-coupling");
  assert.equal(evaluateTrainingRepair("softmax-contract", "global-softmax").correct, false);

  assert.equal(evaluateTrainingRepair("loss-contract", "true-class-mean-logits").correct, true);
  assert.equal(evaluateTrainingRepair("loss-contract", "argmax-mean").reason, "wrong-target");
  assert.equal(evaluateTrainingRepair("loss-contract", "true-class-sum").reason, "sum-reduction");
  assert.equal(evaluateTrainingRepair("loss-contract", "double-softmax").reason, "non-fused-input");

  const stateRepair = evaluateTrainingRepair("state-lifetime", "clear-gradient-keep-moments");
  assert.equal(stateRepair.correct, true);
  assert.equal(stateRepair.metrics.step, 2);
  assert.equal(evaluateTrainingRepair("state-lifetime", "accumulate-gradient").reason, "gradient-accumulated");
  assert.equal(evaluateTrainingRepair("state-lifetime", "reset-all-state").reason, "optimizer-memory-reset");

  assert.equal(evaluateTrainingRepair("dropout-mode", "inverted-train-eval-off").correct, true);
  assert.equal(evaluateTrainingRepair("dropout-mode", "no-inverted-scale").reason, "expectation-shrunk");
  assert.equal(evaluateTrainingRepair("dropout-mode", "dropout-during-eval").reason, "stochastic-validation");
});

test("applies shared semantic graders to computed outputs, independent of option identity", () => {
  const probabilities = softmaxRows([[1000, 998, 997], [1, 3, 2]]);
  const changed = softmaxRows([[1000, 998, 997], [-100, 40, 5]]);
  assert.equal(gradeSoftmaxContract({
    probabilities,
    probabilitiesAfterOtherSampleChange: changed,
  }).correct, true);
  assert.equal(gradeSoftmaxContract({
    probabilities: [[0.4, 0.1], [0.1, 0.4]],
    probabilitiesAfterOtherSampleChange: [[0.2, 0.05], [0.2, 0.55]],
  }).reason, "sample-coupling");
  assert.equal(gradeSoftmaxContract({
    probabilities: [[0.5, 0.5], [0.5, 0.5]],
    probabilitiesAfterOtherSampleChange: [[0.5, 0.5], [0.9, 0.9]],
  }).correct, false);

  const logits = [[5, 1, -1], [4, 3, 2]];
  const labels = [0, 2];
  const loss = meanCrossEntropy(logits, labels);
  assert.equal(gradeLossContract({
    loss,
    duplicatedLoss: loss,
    expectedLoss: loss,
    confidentCorrectLoss: crossEntropyFromLogits([8, 0, -2], 0),
    confidentWrongLoss: crossEntropyFromLogits([8, 0, -2], 2),
  }).correct, true);
  assert.equal(gradeLossContract({
    loss,
    duplicatedLoss: loss * 2,
    expectedLoss: loss,
    confidentCorrectLoss: 0.1,
    confidentWrongLoss: 10,
  }).reason, "sum-reduction");

  assert.equal(gradeStateLifetime({
    gradientBuffer: -0.3,
    moment: 0.042,
    velocity: 0.00072936,
    step: 2,
  }).correct, true);
  assert.equal(gradeStateLifetime({
    gradientBuffer: -0.3,
    moment: -0.03,
    velocity: 0.00009,
    step: 1,
  }).reason, "optimizer-memory-reset");

  assert.equal(gradeDropoutContract({
    activations: [1, 2],
    trainMean: [1, 2],
    evalSeedOne: [1, 2],
    evalSeedTwo: [1, 2],
  }).correct, true);
  assert.equal(gradeDropoutContract({
    activations: [1, 2],
    trainMean: [1, 2],
    evalSeedOne: [2, 0],
    evalSeedTwo: [0, 4],
  }).reason, "stochastic-validation");
});

test("requires the batch lab and concepts while keeping debugger remediation optional", () => {
  assert.equal(canCompleteTrainingChapter({
    batchLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteTrainingChapter({
    batchLabComplete: true,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteTrainingChapter({
    batchLabComplete: false,
    debuggerComplete: false,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteTrainingChapter({
    batchLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: false,
  }), false);
});

test("presents one required training activity with localized preview navigation", async () => {
  const chapterSource = await readFile(
    new URL("../src/components/training/TrainingChapter.tsx", import.meta.url),
    "utf8",
  );
  const conceptSource = await readFile(
    new URL("../src/components/training/TrainingConceptCheck.tsx", import.meta.url),
    "utf8",
  );
  const styles = await readFile(
    new URL("../src/styles/globals.css", import.meta.url),
    "utf8",
  );

  assert.match(conceptSource, /the required mini-batch lab to unlock/);
  assert.doesNotMatch(conceptSource, /both required activities|both activity states/);
  assert.match(chapterSource, /t\("선택", "Optional"\)/);
  assert.match(chapterSource, /chapters\/neural-networks\$\{isKo/);
  assert.match(chapterSource, /chapters\/embeddings\$\{isKo/);
  assert.match(styles, /\.training-prerequisite a,[\s\S]*?min-height: 44px;/);
});

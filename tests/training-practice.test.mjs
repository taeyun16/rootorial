import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  adamSecondFixture,
  adamVisibleFixture,
  batchGradientSecondFixture,
  batchGradientVisibleFixture,
  compareDuplicatedBatchGradient,
  runAdamStateTransition,
  runSoftmaxGradientStep,
  softmaxGradientSecondFixture,
  softmaxGradientVisibleFixture,
  trainingPracticeChallenges,
} from "../src/features/training/training-practice.ts";

function closeEnough(left, right, tolerance = 1e-10) {
  return Math.abs(left - right) <= tolerance;
}

test("reproduces the fused Softmax and cross-entropy gradient on two class rows", () => {
  for (const fixture of [
    softmaxGradientVisibleFixture,
    softmaxGradientSecondFixture,
  ]) {
    const correct = runSoftmaxGradientStep(
      fixture,
      "probability-minus-onehot",
    );
    const reversed = runSoftmaxGradientStep(
      fixture,
      "onehot-minus-probability",
    );
    assert.ok(closeEnough(correct.gradientSum, 0));
    assert.ok(correct.trueClassGradient < 0);
    assert.ok(correct.afterLoss < correct.beforeLoss);
    assert.ok(reversed.afterLoss > reversed.beforeLoss);
  }
});

test("keeps mean parameter gradients invariant when every batch row is duplicated", () => {
  for (const fixture of [
    batchGradientVisibleFixture,
    batchGradientSecondFixture,
  ]) {
    const mean = compareDuplicatedBatchGradient(fixture, "mean");
    const sum = compareDuplicatedBatchGradient(fixture, "sum");
    const doubleMean = compareDuplicatedBatchGradient(
      fixture,
      "double-mean",
    );
    assert.ok(closeEnough(mean.baseCell, mean.duplicatedCell));
    assert.ok(closeEnough(sum.duplicatedCell, sum.baseCell * 2));
    assert.ok(closeEnough(
      doubleMean.duplicatedCell,
      doubleMean.baseCell / 2,
    ));
  }
});

test("refreshes ordinary gradients while preserving Adam moments and step", () => {
  for (const fixture of [adamVisibleFixture, adamSecondFixture]) {
    const preserved = runAdamStateTransition(fixture, "preserve-state");
    const reset = runAdamStateTransition(fixture, "reset-state");
    const reused = runAdamStateTransition(
      fixture,
      "reuse-moment-as-gradient",
    );
    assert.equal(preserved.gradient, fixture.gradient);
    assert.equal(preserved.stateAfter.step, fixture.state.step + 1);
    assert.notEqual(preserved.nextParameter, reset.nextParameter);
    assert.notEqual(preserved.nextParameter, reused.nextParameter);
  }
});

test("registers three optional levels without changing Training completion", () => {
  assert.deepEqual(
    trainingPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL(
      "../src/components/training/TrainingChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapterSource, /<TrainingPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
  assert.doesNotMatch(
    chapterSource,
    /canCompleteTrainingChapter\(\{[^}]*practice/s,
  );
});

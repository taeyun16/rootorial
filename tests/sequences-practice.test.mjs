import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  evaluateEarlyInputGradient,
  gatedCarrySecondFixture,
  gatedCarryVisibleFixture,
  recurrenceSecondFixture,
  recurrenceVisibleFixture,
  runGatedCarryPolicy,
  runSharedRecurrence,
  sequencesPracticeChallenges,
  temporalGradientSecondFixture,
  temporalGradientVisibleFixture,
} from "../src/features/sequences/sequences-practice.ts";

function close(left, right, tolerance = 1e-7) {
  return Math.abs(left - right) <= tolerance;
}

test("reproduces shared recurrence across changed sequence lengths", () => {
  for (const fixture of [recurrenceVisibleFixture, recurrenceSecondFixture]) {
    const correct = runSharedRecurrence(fixture, "shared-recurrence");
    const inputOnly = runSharedRecurrence(fixture, "input-only");
    const pooled = runSharedRecurrence(fixture, "sum-then-tanh");
    assert.deepEqual(correct.outputShape, [fixture.inputs.length, 1]);
    assert.equal(correct.states.length, fixture.inputs.length);
    assert.notDeepEqual(inputOnly.states, correct.states);
    assert.deepEqual(pooled.outputShape, [1, 1]);
  }
});

test("matches early-input gradients only when every recurrent edge contributes", () => {
  for (const fixture of [
    temporalGradientVisibleFixture,
    temporalGradientSecondFixture,
  ]) {
    const correct = evaluateEarlyInputGradient(
      fixture,
      "include-recurrent-gains",
    );
    const missing = evaluateEarlyInputGradient(
      fixture,
      "omit-recurrent-gains",
    );
    assert.equal(close(correct.analytic, correct.numerical), true);
    assert.equal(close(missing.analytic, missing.numerical), false);
    assert.equal(correct.recurrentEdges, fixture.inputs.length - 1);
  }
});

test("keeps cell carry separate from hidden reveal on fresh gates", () => {
  const visible = runGatedCarryPolicy(
    gatedCarryVisibleFixture,
    "carry-write-reveal",
  );
  const second = runGatedCarryPolicy(
    gatedCarrySecondFixture,
    "carry-write-reveal",
  );
  assert.equal(visible.cell, 0.75);
  assert.equal(visible.hidden, 0);
  assert.equal(close(second.cell, -0.2), true);
  assert.equal(close(second.hidden, 0.7 * Math.tanh(-0.2)), true);
  assert.notDeepEqual(
    runGatedCarryPolicy(gatedCarryVisibleFixture, "output-erases-cell"),
    visible,
  );
  assert.notDeepEqual(
    runGatedCarryPolicy(gatedCarrySecondFixture, "swap-input-forget"),
    second,
  );
});

test("registers three optional levels without changing Sequences completion", () => {
  assert.deepEqual(
    sequencesPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL(
      "../src/components/sequences/SequencesChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapterSource, /<SequencesPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
  assert.doesNotMatch(
    chapterSource,
    /canCompleteSequencesChapter\(\{[^}]*practice/s,
  );
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  attentionPracticeChallenges,
  pairingSecondFixture,
  pairingVisibleFixture,
  routingSecondFixture,
  routingVisibleFixture,
  runPairingPolicy,
  runRoutingPolicy,
  runScoreShiftPolicy,
  scoreShiftSecondFixture,
  scoreShiftVisibleFixture,
} from "../src/features/attention/attention-practice.ts";

function close(left, right, tolerance = 1e-9) {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= tolerance;
}

function sameVector(left, right) {
  return left.length === right.length
    && left.every((value, index) => close(value, right[index]));
}

test("reproduces soft routing in value space on two fresh memories", () => {
  for (const fixture of [routingVisibleFixture, routingSecondFixture]) {
    const correct = runRoutingPolicy(fixture, "stable-softmax-values");
    const scoreSum = runRoutingPolicy(
      fixture,
      "normalize-score-sum-values",
    );
    const keyRead = runRoutingPolicy(fixture, "stable-softmax-keys");
    assert.equal(correct.weights.length, fixture.keys.length);
    assert.equal(close(
      correct.weights.reduce((sum, weight) => sum + weight, 0),
      1,
    ), true);
    assert.equal(correct.weights.every((weight) => weight >= 0), true);
    assert.equal(correct.context.length, fixture.values[0].length);
    assert.equal(correct.contextSpace, "value");
    assert.equal(scoreSum.weights.some((weight) => weight < 0), true);
    assert.equal(keyRead.context.length, fixture.keys[0].length);
    assert.equal(keyRead.contextSpace, "key");
  }
});

test("preserves routing only when key, value, and label rows move together", () => {
  for (const fixture of [pairingVisibleFixture, pairingSecondFixture]) {
    const paired = runPairingPolicy(fixture, "reorder-paired-rows");
    const addresses = runPairingPolicy(
      fixture,
      "reorder-addresses-only",
    );
    const contents = runPairingPolicy(fixture, "reorder-content-only");
    assert.equal(
      sameVector(paired.baseline.context, paired.reordered.context),
      true,
    );
    assert.equal(
      paired.baseline.topSlotId,
      paired.reordered.topSlotId,
    );
    assert.equal(
      sameVector(addresses.baseline.context, addresses.reordered.context),
      false,
    );
    assert.equal(
      sameVector(contents.baseline.context, contents.reordered.context),
      false,
    );
  }
});

test("uses max shifting to preserve softmax under extreme shared offsets", () => {
  for (const fixture of [
    scoreShiftVisibleFixture,
    scoreShiftSecondFixture,
  ]) {
    const stable = runScoreShiftPolicy(fixture, "subtract-row-max");
    const raw = runScoreShiftPolicy(fixture, "raw-exponentials");
    const scoreSum = runScoreShiftPolicy(fixture, "divide-score-sum");
    assert.equal(
      sameVector(stable.baselineWeights, stable.shiftedWeights),
      true,
    );
    assert.equal(
      sameVector(stable.baselineContext, stable.shiftedContext),
      true,
    );
    assert.equal(raw.shiftedWeights.every(Number.isFinite), false);
    assert.equal(
      sameVector(scoreSum.baselineWeights, scoreSum.shiftedWeights),
      false,
    );
  }
});

test("registers three optional levels without changing Attention completion", () => {
  assert.deepEqual(
    attentionPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL(
      "../src/components/attention/AttentionChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapterSource, /<AttentionPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
  assert.doesNotMatch(
    chapterSource,
    /canCompleteAttentionChapter\(\{[^}]*practice/s,
  );
});

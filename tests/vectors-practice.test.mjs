import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  attentionSecondFixture,
  attentionVisibleFixture,
  broadcastBrokenRightShape,
  broadcastLeftShape,
  broadcastRepairShapes,
  evaluateAttentionScoreShape,
  evaluateBroadcastShapes,
  reshapeSecondFixture,
  reshapeVisibleFixture,
  reshapeWithColumnChoice,
  vectorPracticeChallenges,
} from "../src/features/vectors/vectors-practice.ts";

test("infers a reusable reshape axis for visible and second fixtures", () => {
  assert.deepEqual(reshapeWithColumnChoice(reshapeVisibleFixture, -1), [3, 4]);
  assert.deepEqual(reshapeWithColumnChoice(reshapeSecondFixture, -1), [3, 6]);
  assert.deepEqual(reshapeWithColumnChoice(reshapeVisibleFixture, 4), [3, 4]);
  assert.equal(reshapeWithColumnChoice(reshapeSecondFixture, 4), null);
  assert.equal(reshapeWithColumnChoice(reshapeVisibleFixture, 6), null);
});

test("reports the first broadcasting mismatch and accepts only the minimal repair", () => {
  assert.deepEqual(
    evaluateBroadcastShapes(broadcastLeftShape, broadcastBrokenRightShape),
    { outputShape: null, failedAxisFromRight: 0 },
  );
  assert.deepEqual(
    evaluateBroadcastShapes(
      broadcastLeftShape,
      broadcastRepairShapes["singleton-feature"],
    ),
    { outputShape: [2, 4, 3], failedAxisFromRight: null },
  );
  assert.equal(
    evaluateBroadcastShapes(
      broadcastLeftShape,
      broadcastRepairShapes["singleton-middle"],
    ).outputShape,
    null,
  );
  assert.equal(
    evaluateBroadcastShapes(
      broadcastLeftShape,
      broadcastRepairShapes["match-left"],
    ).outputShape,
    null,
  );
});

test("transfers Q @ K.T shape across query and key counts", () => {
  assert.deepEqual(
    evaluateAttentionScoreShape(attentionVisibleFixture, "q-k-transpose"),
    [2, 4],
  );
  assert.deepEqual(
    evaluateAttentionScoreShape(attentionSecondFixture, "q-k-transpose"),
    [5, 7],
  );
  assert.equal(
    evaluateAttentionScoreShape(attentionVisibleFixture, "q-transpose-k"),
    null,
  );
  assert.equal(
    evaluateAttentionScoreShape(attentionVisibleFixture, "q-k"),
    null,
  );
});

test("registers all three levels and renders the optional deck in Vectors", () => {
  assert.deepEqual(
    vectorPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL("../src/components/VectorsChapter.tsx", import.meta.url),
    "utf8",
  );
  assert.match(chapterSource, /<VectorsPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
});

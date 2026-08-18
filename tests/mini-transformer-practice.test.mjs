import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  causalPrefixSecondFixture,
  causalPrefixVisibleFixture,
  kvCacheSecondFixture,
  kvCacheVisibleFixture,
  maximumMatrixError,
  miniTransformerPracticeChallenges,
  rowBoundarySecondFixture,
  rowBoundaryVisibleFixture,
  runCausalPrefixPolicy,
  runKvCachePolicy,
  runRowBoundaryPolicy,
} from "../src/features/mini-transformer/mini-transformer-practice.ts";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("preserves every prior logit row when a causal suffix is appended", () => {
  for (const fixture of [
    causalPrefixVisibleFixture,
    causalPrefixSecondFixture,
  ]) {
    const correct = runCausalPrefixPolicy(
      fixture,
      "compare-matching-prefix-rows",
    );
    assert.ok(maximumMatrixError(correct.actual, correct.expected) < 1e-12);

    for (const wrongPolicy of [
      "reuse-full-last-row",
      "offset-prefix-rows",
    ]) {
      const wrong = runCausalPrefixPolicy(fixture, wrongPolicy);
      assert.ok(maximumMatrixError(wrong.actual, wrong.expected) > 0.01);
    }
  }
});

test("separates all-row training loss from last-row generation", () => {
  for (const fixture of [
    rowBoundaryVisibleFixture,
    rowBoundarySecondFixture,
  ]) {
    const correct = runRowBoundaryPolicy(
      fixture,
      "separate-training-and-generation",
    );
    assert.ok(Math.abs(correct.actualLoss - correct.expectedLoss) < 1e-12);
    assert.equal(correct.actualTokenId, correct.expectedTokenId);

    const lastRowForBoth = runRowBoundaryPolicy(
      fixture,
      "last-row-for-both",
    );
    assert.ok(
      Math.abs(lastRowForBoth.actualLoss - lastRowForBoth.expectedLoss)
        > 0.01,
    );

    const averagedGeneration = runRowBoundaryPolicy(
      fixture,
      "average-row-for-generation",
    );
    assert.notEqual(
      averagedGeneration.actualTokenId,
      averagedGeneration.expectedTokenId,
    );
  }
});

test("matches full causal attention only when both keys and values accumulate", () => {
  for (const fixture of [kvCacheVisibleFixture, kvCacheSecondFixture]) {
    const correct = runKvCachePolicy(fixture, "append-keys-and-values");
    assert.ok(maximumMatrixError(correct.actual, correct.expected) < 1e-12);

    for (const wrongPolicy of [
      "append-values-current-key",
      "drop-past-cache",
    ]) {
      const wrong = runKvCachePolicy(fixture, wrongPolicy);
      assert.ok(maximumMatrixError(wrong.actual, wrong.expected) > 0.01);
    }
  }
});

test("registers three optional challenges without changing completion", () => {
  assert.deepEqual(
    miniTransformerPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );

  const component = read(
    "src/components/mini-transformer/MiniTransformerPracticeDeck.tsx",
  );
  const chapter = read(
    "src/components/mini-transformer/MiniTransformerChapter.tsx",
  );
  const completion = read(
    "src/features/mini-transformer/mini-transformer-model.ts",
  );
  const quality = read("src/features/chapters/content-quality.ts");

  assert.match(component, /className="mini-transformer-practice-deck"/);
  assert.match(component, /learnerPrefixRead/);
  assert.match(component, /learnerRowBoundary/);
  assert.match(component, /learnerKvCache/);
  assert.doesNotMatch(component, /<select/);
  assert.match(chapter, /<MiniTransformerPracticeDeck \/>/);
  assert.match(
    quality,
    /activity\("independent-practice", "transfer", "MiniTransformerPracticeDeck", 3, false\)/,
  );
  assert.match(completion, /return labComplete && conceptsMastered;/);
  assert.doesNotMatch(completion, /practiceComplete/);
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  causalTransferSecondFixture,
  causalTransferVisibleFixture,
  duplicateSecondFixture,
  duplicateVisibleFixture,
  rowEquivarianceSecondFixture,
  rowEquivarianceVisibleFixture,
  runCausalTransferPolicy,
  runDuplicatePolicy,
  runRowEquivariancePolicy,
  selfAttentionPracticeChallenges,
} from "../src/features/self-attention/self-attention-practice.ts";

function close(left, right, tolerance = 1e-9) {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= tolerance;
}

function sameMatrix(left, right) {
  return left.length === right.length
    && left.every((row, rowIndex) =>
      row.length === right[rowIndex].length
      && row.every((value, column) =>
        close(value, right[rowIndex][column])
      )
    );
}

test("reproduces non-causal self-attention row equivariance on two fixtures", () => {
  for (const fixture of [
    rowEquivarianceVisibleFixture,
    rowEquivarianceSecondFixture,
  ]) {
    const correct = runRowEquivariancePolicy(
      fixture,
      "permute-input-before-qkv",
    );
    assert.ok(sameMatrix(
      correct.permuted.contexts,
      correct.expectedContexts,
    ));

    for (const wrongPolicy of [
      "permute-keys-only",
      "permute-values-only",
    ]) {
      const wrong = runRowEquivariancePolicy(fixture, wrongPolicy);
      assert.equal(
        sameMatrix(wrong.permuted.contexts, wrong.expectedContexts),
        false,
      );
    }
  }
});

test("keeps duplicate token rows identical only without a position boundary", () => {
  for (const fixture of [duplicateVisibleFixture, duplicateSecondFixture]) {
    const correct = runDuplicatePolicy(fixture, "no-position-signal");
    assert.ok(sameMatrix(
      [correct.firstContext],
      [correct.secondContext],
    ));

    for (const wrongPolicy of [
      "inject-query-row-index",
      "use-causal-prefix",
    ]) {
      const wrong = runDuplicatePolicy(fixture, wrongPolicy);
      assert.equal(
        sameMatrix([wrong.firstContext], [wrong.secondContext]),
        false,
      );
    }
  }
});

test("restores a causal trace only when tokens and visibility move together", () => {
  for (const fixture of [
    causalTransferVisibleFixture,
    causalTransferSecondFixture,
  ]) {
    const correct = runCausalTransferPolicy(
      fixture,
      "permute-input-and-visibility",
    );
    assert.ok(sameMatrix(
      correct.transferred.contexts,
      correct.expectedContexts,
    ));

    for (const wrongPolicy of [
      "permute-input-keep-causal",
      "permute-visibility-only",
    ]) {
      const wrong = runCausalTransferPolicy(fixture, wrongPolicy);
      assert.equal(
        sameMatrix(wrong.transferred.contexts, wrong.expectedContexts),
        false,
      );
    }
  }
});

test("registers three optional challenges without changing completion state", () => {
  assert.deepEqual(
    selfAttentionPracticeChallenges.map(({ id, level }) => ({ id, level })),
    [
      {
        id: "reproduce-row-equivariance",
        level: "single-boundary",
      },
      {
        id: "diagnose-position-free-duplicates",
        level: "multi-boundary",
      },
      {
        id: "transfer-causal-visibility",
        level: "transfer",
      },
    ],
  );

  const chapter = readFileSync(
    new URL(
      "../src/components/self-attention/SelfAttentionChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapter, /<SelfAttentionPracticeDeck \/>/);
  assert.doesNotMatch(
    chapter,
    /practiceComplete[\s\S]*canCompleteSelfAttentionChapter/,
  );
});

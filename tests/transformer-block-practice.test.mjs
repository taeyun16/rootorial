import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  maximumMatrixError,
  maximumVectorError,
  prenormShiftSecondFixture,
  prenormShiftVisibleFixture,
  residualLedgerSecondFixture,
  residualLedgerVisibleFixture,
  runPrenormShiftPolicy,
  runResidualLedgerPolicy,
  runTwoBlockPolicy,
  transformerBlockPracticeChallenges,
  twoBlockSecondFixture,
  twoBlockVisibleFixture,
} from "../src/features/transformer-block/transformer-block-practice.ts";

const read = (relativePath) =>
  readFileSync(new URL(`../${relativePath}`, import.meta.url), "utf8");

test("reproduces both residual updates on two fresh state ledgers", () => {
  for (const fixture of [
    residualLedgerVisibleFixture,
    residualLedgerSecondFixture,
  ]) {
    const correct = runResidualLedgerPolicy(
      fixture,
      "two-residual-updates",
    );
    assert.equal(
      maximumVectorError(correct.actualX1, correct.expectedX1),
      0,
    );
    assert.equal(
      maximumVectorError(correct.actualOutput, correct.expectedOutput),
      0,
    );

    const firstSkipDropped = runResidualLedgerPolicy(
      fixture,
      "drop-first-skip",
    );
    assert.ok(
      maximumVectorError(
        firstSkipDropped.actualX1,
        firstSkipDropped.expectedX1,
      ) > 0.1,
    );

    const staleSecondSkip = runResidualLedgerPolicy(
      fixture,
      "reuse-x0-second-skip",
    );
    assert.ok(
      maximumVectorError(
        staleSecondSkip.actualOutput,
        staleSecondSkip.expectedOutput,
      ) > 0.1,
    );
  }
});

test("separates LayerNorm shift invariance from residual identity transport", () => {
  for (const fixture of [
    prenormShiftVisibleFixture,
    prenormShiftSecondFixture,
  ]) {
    const correct = runPrenormShiftPolicy(fixture, "prenorm-plus-skip");
    assert.ok(
      maximumVectorError(correct.base.branch, correct.shifted.branch)
        < 1e-12,
    );
    assert.ok(
      maximumVectorError(
        correct.shifted.output,
        correct.expectedShiftedOutput,
      ) < 1e-12,
    );

    for (const wrongPolicy of ["branch-only", "postnorm-after-add"]) {
      const wrong = runPrenormShiftPolicy(fixture, wrongPolicy);
      assert.ok(
        maximumVectorError(
          wrong.shifted.output,
          wrong.expectedShiftedOutput,
        ) > 0.1,
      );
    }
  }
});

test("hands the accumulated state to block two without reinjecting position", () => {
  for (const fixture of [twoBlockVisibleFixture, twoBlockSecondFixture]) {
    const correct = runTwoBlockPolicy(
      fixture,
      "position-once-handoff-y",
    );
    assert.equal(
      maximumMatrixError(
        correct.actualSecond.output,
        correct.expectedSecond.output,
      ),
      0,
    );

    for (const wrongPolicy of [
      "readd-position-before-block2",
      "restart-block2-from-input",
    ]) {
      const wrong = runTwoBlockPolicy(fixture, wrongPolicy);
      assert.ok(
        maximumMatrixError(
          wrong.actualSecond.output,
          wrong.expectedSecond.output,
        ) > 0.01,
      );
    }
  }
});

test("registers three optional challenges without changing completion", () => {
  assert.deepEqual(
    transformerBlockPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );

  const component = read(
    "src/components/transformer-block/TransformerBlockPracticeDeck.tsx",
  );
  const chapter = read(
    "src/components/transformer-block/TransformerBlockChapter.tsx",
  );
  const completion = read(
    "src/features/transformer-block/transformer-block-model.ts",
  );
  const quality = read("src/features/chapters/content-quality.ts");

  assert.match(component, /className="transformer-block-practice-deck"/);
  assert.match(component, /learnerResiduals/);
  assert.match(component, /learnerNormBoundary/);
  assert.match(component, /learnerHandoff/);
  assert.doesNotMatch(component, /<select/);
  assert.match(chapter, /<TransformerBlockPracticeDeck \/>/);
  assert.match(
    quality,
    /activity\("independent-practice", "transfer", "TransformerBlockPracticeDeck", 3, false\)/,
  );
  assert.match(
    completion,
    /return labComplete && conceptsMastered;/,
  );
  assert.doesNotMatch(completion, /practiceComplete/);
});

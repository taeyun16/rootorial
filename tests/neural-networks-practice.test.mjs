import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  checkHiddenGradient,
  neuralNetworksPracticeChallenges,
  runScalarNeuronStep,
  scalarSecondFixture,
  scalarVisibleFixture,
  transferOutputLogits,
  xnorLabels,
  xnorSecondLogits,
  xnorVisibleLogits,
} from "../src/features/neural-networks/neural-networks-practice.ts";

test("reproduces the BCE output signal across two scalar neurons", () => {
  for (const fixture of [scalarVisibleFixture, scalarSecondFixture]) {
    const correct = runScalarNeuronStep(fixture, "p-minus-y");
    const reversed = runScalarNeuronStep(fixture, "y-minus-p");
    assert.ok(correct.after.loss < correct.before.loss);
    assert.ok(reversed.after.loss > reversed.before.loss);
  }
});

test("uses a finite difference to reject either missing hidden-chain factor", () => {
  for (const fixture of [scalarVisibleFixture, scalarSecondFixture]) {
    const complete = checkHiddenGradient(fixture, "complete-chain");
    assert.equal(complete.matches, true);
    assert.ok(Math.abs(complete.analytic - complete.numerical) <= 1e-7);
    assert.equal(
      checkHiddenGradient(fixture, "missing-output-weight").matches,
      false,
    );
    assert.equal(
      checkHiddenGradient(fixture, "missing-sigmoid-derivative").matches,
      false,
    );
  }
});

test("transfers XOR logits to XNOR across two confidence margins", () => {
  assert.deepEqual(
    transferOutputLogits(xnorVisibleLogits, "negate-logit"),
    [...xnorLabels],
  );
  assert.deepEqual(
    transferOutputLogits(xnorSecondLogits, "negate-logit"),
    [...xnorLabels],
  );
  assert.deepEqual(
    transferOutputLogits(xnorVisibleLogits, "reuse-logit"),
    [0, 1, 1, 0],
  );
  assert.deepEqual(
    transferOutputLogits(xnorVisibleLogits, "absolute-logit"),
    [1, 1, 1, 1],
  );
});

test("registers all levels and renders the optional deck without changing completion", () => {
  assert.deepEqual(
    neuralNetworksPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL(
      "../src/components/neural-networks/NeuralNetworksChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapterSource, /<NeuralNetworksPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
  assert.doesNotMatch(
    chapterSource,
    /canCompleteNeuralNetworksChapter\(\{[^}]*practice/s,
  );
});

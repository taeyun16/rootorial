import assert from "node:assert/strict";
import test from "node:test";

import {
  embeddingsLookupMaskedMeanCode,
  embeddingsScatterAddRepairCode,
} from "../src/data/embeddingsNotebook.ts";
import {
  applyEmbeddingGradient,
  baseEmbeddingTable,
  canCompleteEmbeddingsChapter,
  cosineSimilarity,
  embeddingDebuggerScenarioIds,
  evaluateEmbeddingLabMastery,
  evaluateEmbeddingRepair,
  lookupEmbeddings,
  lookupMatchesOneHot,
  meanPool,
  multiplyOneHotByTable,
  oneHotVector,
  tokenizeText,
  vectorDelta,
  vectorsApproximatelyEqual,
} from "../src/features/embeddings/embedding-model.ts";

test("ships self-contained Python bridges for lookup, masked mean, and scatter-add repair", () => {
  assert.match(embeddingsLookupMaskedMeanCode, /E = np\.array/);
  assert.match(embeddingsLookupMaskedMeanCode, /ids = np\.array/);
  assert.match(embeddingsLookupMaskedMeanCode, /one_hot = np\.eye\(E\.shape\[0\]\)\[ids\]/);
  assert.match(embeddingsLookupMaskedMeanCode, /masked_mean =/);
  assert.match(embeddingsLookupMaskedMeanCode, /PASS: direct lookup equals one-hot multiplication/);
  assert.match(embeddingsScatterAddRepairCode, /gradient\[ids\] \+= upstream/);
  assert.match(embeddingsScatterAddRepairCode, /gradient\[2\],\n    \[0\.4, -0\.2\]/);
  assert.match(embeddingsScatterAddRepairCode, /PASS: scatter-add accumulates every repeated-token contribution/);
  assert.doesNotMatch(embeddingsLookupMaskedMeanCode, /[가-힣]/);
  assert.doesNotMatch(embeddingsScatterAddRepairCode, /[가-힣]/);
});

test("tokenizes known words deterministically and exposes unknown whole words", () => {
  assert.deepEqual(
    tokenizeText("Cat runs", "whole-word").map(({ token, id }) => ({ token, id })),
    [{ token: "cat", id: 2 }, { token: "runs", id: 5 }],
  );
  assert.deepEqual(
    tokenizeText("kitten", "whole-word").map(({ token, id }) => ({ token, id })),
    [{ token: "[UNK]", id: 1 }],
  );
});

test("uses the didactic subword vocabulary without claiming one word is one token", () => {
  assert.deepEqual(
    tokenizeText("Kitten sleeps", "subword").map(({ token, id }) => ({ token, id })),
    [
      { token: "kit", id: 7 },
      { token: "##ten", id: 8 },
      { token: "sleeps", id: 6 },
    ],
  );
});

test("maps Korean and mixed-script words to explicit unknown pieces instead of dropping them", () => {
  assert.deepEqual(
    tokenizeText("고양이 cat", "whole-word").map(({ source, token, id }) => ({ source, token, id })),
    [
      { source: "고양이", token: "[UNK]", id: 1 },
      { source: "cat", token: "cat", id: 2 },
    ],
  );
  assert.deepEqual(
    tokenizeText("달", "subword").map(({ source, token, id }) => ({ source, token, id })),
    [{ source: "달", token: "[UNK]", id: 1 }],
  );
});

test("rejects empty or overlong didactic tokenization inputs", () => {
  assert.throws(() => tokenizeText("123", "subword"), /at least one/);
  assert.throws(
    () => tokenizeText("cat cat cat cat cat cat cat cat cat", "subword"),
    /at most eight/,
  );
});

test("makes one-hot multiplication exactly equivalent to direct row lookup", () => {
  for (const id of [0, 2, 4, 8, 10]) {
    assert.equal(lookupMatchesOneHot(id), true);
    assert.deepEqual(
      multiplyOneHotByTable(oneHotVector(id)),
      lookupEmbeddings([id])[0],
    );
  }
});

test("preserves sequence order and emits one D-vector per token ID", () => {
  assert.deepEqual(lookupEmbeddings([3, 2, 3]), [
    baseEmbeddingTable[3],
    baseEmbeddingTable[2],
    baseEmbeddingTable[3],
  ]);
});

test("accumulates repeated-token gradients into one row and leaves unused rows stable", () => {
  const update = applyEmbeddingGradient(baseEmbeddingTable, [2, 2, 5], [0.2, -0.1], 0.5);
  assert.deepEqual(update.changedRows, [2, 5]);
  assert.deepEqual(update.occurrenceCountByRow, { 2: 2, 5: 1 });
  assert.equal(vectorsApproximatelyEqual(
    vectorDelta(baseEmbeddingTable[2], update.table[2]),
    [-0.2, 0.1],
  ), true);
  assert.equal(vectorsApproximatelyEqual(
    vectorDelta(baseEmbeddingTable[5], update.table[5]),
    [-0.1, 0.05],
  ), true);
  assert.deepEqual(update.table[4], baseEmbeddingTable[4]);
});

test("keeps prior embedding snapshots immutable", () => {
  const snapshot = baseEmbeddingTable.map((row) => [...row]);
  applyEmbeddingGradient(baseEmbeddingTable, [2, 2], [0.1, 0.1], 0.2);
  assert.deepEqual(baseEmbeddingTable, snapshot);
});

test("treats cosine as scale invariant and leaves zero-vector cosine undefined", () => {
  const query = baseEmbeddingTable[2];
  const candidate = baseEmbeddingTable[3];
  const scaled = [candidate[0] * 8, candidate[1] * 8];
  assert.ok(Math.abs(cosineSimilarity(query, candidate) - cosineSimilarity(query, scaled)) < 1e-12);
  assert.equal(cosineSimilarity(query, [0, 0]), null);
});

test("masked mean pooling is invariant to appended PAD while plain mean is not", () => {
  const base = meanPool([2, 3]);
  const masked = meanPool([2, 3, 0, 0], baseEmbeddingTable, true);
  const unmasked = meanPool([2, 3, 0, 0], baseEmbeddingTable, false);
  assert.equal(vectorsApproximatelyEqual(base, masked), true);
  assert.equal(vectorsApproximatelyEqual(base, unmasked), false);
});

test("plain masked mean loses order even though lookup rows preserve it", () => {
  assert.notDeepEqual(lookupEmbeddings([2, 5, 3]), lookupEmbeddings([3, 5, 2]));
  assert.deepEqual(meanPool([2, 5, 3]), meanPool([3, 5, 2]));
});

test("grades four debugger incidents from computed embedding invariants", () => {
  const repairs = {
    "lookup-contract": "direct-lookup",
    "gradient-aggregation": "sum-occurrences",
    "cosine-scale": "cosine-normalized",
    "masked-pooling": "mask-pad",
  };
  for (const scenario of embeddingDebuggerScenarioIds) {
    assert.equal(evaluateEmbeddingRepair(scenario, repairs[scenario]).correct, true);
  }
  assert.equal(evaluateEmbeddingRepair("lookup-contract", "softmax-row").correct, false);
  assert.equal(evaluateEmbeddingRepair("gradient-aggregation", "dedupe-occurrences").correct, false);
  assert.equal(evaluateEmbeddingRepair("cosine-scale", "raw-dot").correct, false);
  assert.equal(evaluateEmbeddingRepair("masked-pooling", "include-pad").correct, false);
});

test("requires lookup evidence and concepts while keeping debugger remediation optional", () => {
  assert.deepEqual(evaluateEmbeddingLabMastery({
    correctShapePrediction: true,
    lookupEquivalenceInspected: true,
    repeatedRowUpdateObserved: true,
    unusedRowVerifiedStable: true,
  }), { mastered: true, reason: "mastered" });
  assert.equal(canCompleteEmbeddingsChapter({
    lookupLabComplete: true,
    debuggerComplete: false,
    conceptsMastered: true,
  }), true);
  assert.equal(canCompleteEmbeddingsChapter({
    lookupLabComplete: false,
    debuggerComplete: false,
    conceptsMastered: true,
  }), false);
  assert.equal(canCompleteEmbeddingsChapter({
    lookupLabComplete: true,
    conceptsMastered: false,
  }), false);
});

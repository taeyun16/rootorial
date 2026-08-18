import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  aggregateOccurrenceGradients,
  embeddingsPracticeChallenges,
  lookupSecondFixture,
  lookupVisibleFixture,
  runAddressedLookup,
  runUnknownTokenPath,
  scatterSecondFixture,
  scatterVisibleFixture,
  unknownSecondFixture,
  unknownVisibleFixture,
} from "../src/features/embeddings/embeddings-practice.ts";
import {
  UNKNOWN_TOKEN_ID,
  lookupEmbeddings,
} from "../src/features/embeddings/embedding-model.ts";

function closeVector(left, right, tolerance = 1e-10) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) <= tolerance);
}

test("reproduces direct lookup for changed IDs and sequence lengths", () => {
  for (const fixture of [lookupVisibleFixture, lookupSecondFixture]) {
    const direct = runAddressedLookup(fixture, "direct-row");
    const repeatedFirst = runAddressedLookup(fixture, "first-row-for-all");
    assert.deepEqual(direct.rows, lookupEmbeddings(fixture.ids));
    assert.deepEqual(direct.shape, [fixture.ids.length, 2]);
    assert.notDeepEqual(repeatedFirst.rows, direct.rows);
  }
});

test("scatter-adds every occurrence before evaluating partial or full cancellation", () => {
  const visible = aggregateOccurrenceGradients(
    scatterVisibleFixture,
    "sum-occurrences",
  );
  const second = aggregateOccurrenceGradients(
    scatterSecondFixture,
    "sum-occurrences",
  );
  assert.equal(closeVector(visible.repeatedGradient, [0.2, 0.1]), true);
  assert.equal(closeVector(second.repeatedGradient, [0, 0]), true);
  assert.equal(visible.repeatedContributionCount, 2);
  assert.equal(second.repeatedContributionCount, 2);
  assert.notDeepEqual(
    aggregateOccurrenceGradients(
      scatterVisibleFixture,
      "first-occurrence-only",
    ).repeatedGradient,
    visible.repeatedGradient,
  );
  assert.notDeepEqual(
    aggregateOccurrenceGradients(
      scatterSecondFixture,
      "overwrite-with-last",
    ).repeatedGradient,
    second.repeatedGradient,
  );
});

test("keeps unseen token positions while mapping spellings to the shared unknown row", () => {
  const visible = runUnknownTokenPath(
    unknownVisibleFixture,
    "keep-unknown-id",
  );
  const second = runUnknownTokenPath(
    unknownSecondFixture,
    "keep-unknown-id",
  );
  assert.deepEqual(visible.ids, [UNKNOWN_TOKEN_ID, UNKNOWN_TOKEN_ID]);
  assert.deepEqual(second.ids, [2, UNKNOWN_TOKEN_ID]);
  assert.equal(visible.rows.length, 2);
  assert.equal(second.rows.length, 2);
  assert.deepEqual(
    runUnknownTokenPath(unknownVisibleFixture, "drop-unknown-id").ids,
    [],
  );
  assert.notDeepEqual(
    runUnknownTokenPath(unknownVisibleFixture, "invent-spelling-row").ids,
    visible.ids,
  );
});

test("registers three optional levels without changing Embeddings completion", () => {
  assert.deepEqual(
    embeddingsPracticeChallenges.map(({ level }) => level),
    ["single-boundary", "multi-boundary", "transfer"],
  );
  const chapterSource = readFileSync(
    new URL(
      "../src/components/embeddings/EmbeddingsChapter.tsx",
      import.meta.url,
    ),
    "utf8",
  );
  assert.match(chapterSource, /<EmbeddingsPracticeDeck \/>/);
  assert.match(chapterSource, /id="practice"/);
  assert.doesNotMatch(
    chapterSource,
    /canCompleteEmbeddingsChapter\(\{[^}]*practice/s,
  );
});

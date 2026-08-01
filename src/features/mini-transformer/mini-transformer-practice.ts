import type { PracticeChallengeDefinition } from "../practice/practice.ts";
import {
  canonicalMiniTransformerConfig,
  runMiniTransformerTokenIds,
} from "./mini-transformer-model.ts";

export type MiniTransformerPracticeChallengeId =
  | "reproduce-causal-prefix"
  | "diagnose-train-generate-rows"
  | "transfer-kv-cache";

export type CausalPrefixPrediction =
  | "suffix-cannot-change-prefix-rows"
  | "suffix-rewrites-every-row"
  | "only-first-row-stays-fixed";

export type CausalPrefixPolicy =
  | "compare-matching-prefix-rows"
  | "reuse-full-last-row"
  | "offset-prefix-rows";

export type RowBoundaryPrediction =
  | "train-all-rows-generate-last-row"
  | "train-last-row-generate-last-row"
  | "train-all-rows-generate-average-row";

export type RowBoundaryPolicy =
  | "separate-training-and-generation"
  | "last-row-for-both"
  | "average-row-for-generation";

export type KvCachePrediction =
  | "cache-kv-preserves-context"
  | "cache-values-with-current-key-is-enough"
  | "newest-kv-replaces-history";

export type KvCachePolicy =
  | "append-keys-and-values"
  | "append-values-current-key"
  | "drop-past-cache";

export type Matrix = readonly (readonly number[])[];

export type CausalPrefixFixture = Readonly<{
  prefixTokenIds: readonly number[];
  suffixTokenIds: readonly number[];
}>;

export type RowBoundaryFixture = Readonly<{
  logits: Matrix;
  targetTokenIds: readonly number[];
}>;

export type KvCacheFixture = Readonly<{
  queries: Matrix;
  keys: Matrix;
  values: Matrix;
}>;

function freezeVector(values: readonly number[]) {
  return Object.freeze([...values]);
}

function freezeMatrix(rows: Matrix): Matrix {
  return Object.freeze(rows.map(freezeVector));
}

function freezePrefixFixture(
  fixture: CausalPrefixFixture,
): CausalPrefixFixture {
  return Object.freeze({
    prefixTokenIds: freezeVector(fixture.prefixTokenIds),
    suffixTokenIds: freezeVector(fixture.suffixTokenIds),
  });
}

function freezeRowFixture(
  fixture: RowBoundaryFixture,
): RowBoundaryFixture {
  return Object.freeze({
    logits: freezeMatrix(fixture.logits),
    targetTokenIds: freezeVector(fixture.targetTokenIds),
  });
}

function freezeCacheFixture(
  fixture: KvCacheFixture,
): KvCacheFixture {
  return Object.freeze({
    queries: freezeMatrix(fixture.queries),
    keys: freezeMatrix(fixture.keys),
    values: freezeMatrix(fixture.values),
  });
}

export const causalPrefixVisibleFixture = freezePrefixFixture({
  prefixTokenIds: [0, 1, 2],
  suffixTokenIds: [3, 4],
});

export const causalPrefixSecondFixture = freezePrefixFixture({
  prefixTokenIds: [0, 7, 1],
  suffixTokenIds: [2, 4],
});

export const rowBoundaryVisibleFixture = freezeRowFixture({
  logits: [
    [2, 1, 0, -1],
    [0.1, 1.6, 0.2, -0.4],
    [-0.2, 0.3, 1.4, 0.2],
  ],
  targetTokenIds: [1, 2, 3],
});

export const rowBoundarySecondFixture = freezeRowFixture({
  logits: [
    [3, 0, -0.4],
    [2.5, 0.1, -0.5],
    [2, 0.2, 1.3],
    [-0.1, 1.8, 0.3],
  ],
  targetTokenIds: [2, 0, 1, 2],
});

export const kvCacheVisibleFixture = freezeCacheFixture({
  queries: [[0.8, 0.2], [0.1, 1], [0.7, -0.4]],
  keys: [[0.9, 0.1], [0.2, 0.8], [-0.3, 0.7]],
  values: [[1, 0], [0.2, 0.9], [-0.4, 0.6]],
});

export const kvCacheSecondFixture = freezeCacheFixture({
  queries: [[-0.2, 0.9], [0.6, 0.4], [1, -0.1], [0.3, 0.8]],
  keys: [[0.1, 1], [0.8, -0.2], [0.4, 0.7], [-0.5, 0.6]],
  values: [[0.3, 1.1], [1.2, -0.2], [-0.6, 0.5], [0.8, 0.4]],
});

export const miniTransformerPracticeChallenges:
readonly PracticeChallengeDefinition<MiniTransformerPracticeChallengeId>[] = [
  {
    id: "reproduce-causal-prefix",
    level: "single-boundary",
    skillId: "reproduce",
    label: "prefix rows · suffix",
    title: "Reproduce causal prefix consistency on fresh token IDs",
    summary:
      "Append a suffix and verify that every already-computed prefix logit row remains unchanged.",
  },
  {
    id: "diagnose-train-generate-rows",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "all rows · last row",
    title: "Diagnose training and generation row reads",
    summary:
      "Use every shifted row for training loss while generation reads only the current prefix's last row.",
  },
  {
    id: "transfer-kv-cache",
    level: "transfer",
    skillId: "transfer",
    label: "full prefix · KV cache",
    title: "Transfer full-prefix attention into an incremental KV cache",
    summary:
      "Append past keys and values so incremental last-token contexts match full causal recomputation.",
  },
] as const;

export function maximumMatrixError(left: Matrix, right: Matrix) {
  if (
    left.length !== right.length
    || left.some((row, index) => row.length !== right[index]?.length)
  ) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(
    0,
    ...left.flatMap((row, rowIndex) =>
      row.map((value, columnIndex) =>
        Math.abs(value - right[rowIndex][columnIndex])
      )
    ),
  );
}

export function runCausalPrefixPolicy(
  fixture: CausalPrefixFixture,
  policy: CausalPrefixPolicy,
) {
  const prefix = runMiniTransformerTokenIds(
    fixture.prefixTokenIds,
    canonicalMiniTransformerConfig,
  );
  const full = runMiniTransformerTokenIds(
    [...fixture.prefixTokenIds, ...fixture.suffixTokenIds],
    canonicalMiniTransformerConfig,
  );
  const prefixLength = fixture.prefixTokenIds.length;
  const expected = freezeMatrix(prefix.logits);
  const actual = policy === "reuse-full-last-row"
    ? freezeMatrix(Array.from(
      { length: prefixLength },
      () => full.logits[full.logits.length - 1],
    ))
    : policy === "offset-prefix-rows"
      ? freezeMatrix(full.logits.slice(1, prefixLength + 1))
      : freezeMatrix(full.logits.slice(0, prefixLength));
  return Object.freeze({ expected, actual });
}

function stableSoftmax(logits: readonly number[]) {
  const maximum = Math.max(...logits);
  const exponentials = logits.map((value) => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator);
}

function meanCrossEntropy(
  logits: Matrix,
  targets: readonly number[],
) {
  return logits.reduce((sum, row, rowIndex) => {
    const probability = stableSoftmax(row)[targets[rowIndex]];
    return sum - Math.log(probability);
  }, 0) / logits.length;
}

function argmax(values: readonly number[]) {
  return values.reduce(
    (best, value, index) => value > values[best] ? index : best,
    0,
  );
}

export function runRowBoundaryPolicy(
  fixture: RowBoundaryFixture,
  policy: RowBoundaryPolicy,
) {
  const lastRow = fixture.logits[fixture.logits.length - 1];
  const expectedLoss = meanCrossEntropy(
    fixture.logits,
    fixture.targetTokenIds,
  );
  const expectedTokenId = argmax(lastRow);
  const actualTrainingLogits = policy === "last-row-for-both"
    ? freezeMatrix(Array.from(
      { length: fixture.logits.length },
      () => lastRow,
    ))
    : fixture.logits;
  const generationLogits = policy === "average-row-for-generation"
    ? fixture.logits[0].map((_, columnIndex) =>
      fixture.logits.reduce(
        (sum, row) => sum + row[columnIndex],
        0,
      ) / fixture.logits.length
    )
    : lastRow;
  return Object.freeze({
    expectedLoss,
    actualLoss: meanCrossEntropy(
      actualTrainingLogits,
      fixture.targetTokenIds,
    ),
    expectedTokenId,
    actualTokenId: argmax(generationLogits),
  });
}

function dot(left: readonly number[], right: readonly number[]) {
  if (left.length !== right.length) {
    throw new Error("Attention dimensions must match");
  }
  return left.reduce(
    (sum, value, index) => sum + value * right[index],
    0,
  );
}

function attend(
  query: readonly number[],
  keys: Matrix,
  values: Matrix,
) {
  if (keys.length !== values.length || keys.length === 0) {
    throw new Error("Attention keys and values must stay paired");
  }
  const scores = keys.map((key) => dot(query, key) / Math.sqrt(query.length));
  const weights = stableSoftmax(scores);
  return values[0].map((_, columnIndex) =>
    weights.reduce(
      (sum, weight, rowIndex) =>
        sum + weight * values[rowIndex][columnIndex],
      0,
    )
  );
}

function fullCausalContexts(fixture: KvCacheFixture) {
  return freezeMatrix(fixture.queries.map((query, rowIndex) =>
    attend(
      query,
      fixture.keys.slice(0, rowIndex + 1),
      fixture.values.slice(0, rowIndex + 1),
    )
  ));
}

export function runKvCachePolicy(
  fixture: KvCacheFixture,
  policy: KvCachePolicy,
) {
  const expected = fullCausalContexts(fixture);
  const cachedKeys: number[][] = [];
  const cachedValues: number[][] = [];
  const actual: number[][] = [];
  fixture.queries.forEach((query, rowIndex) => {
    const currentKey = [...fixture.keys[rowIndex]];
    const currentValue = [...fixture.values[rowIndex]];
    if (policy === "drop-past-cache") {
      cachedKeys.splice(0, cachedKeys.length, currentKey);
      cachedValues.splice(0, cachedValues.length, currentValue);
    } else {
      cachedValues.push(currentValue);
      if (policy === "append-keys-and-values") {
        cachedKeys.push(currentKey);
      } else {
        cachedKeys.splice(
          0,
          cachedKeys.length,
          ...cachedValues.map(() => [...currentKey]),
        );
      }
    }
    actual.push(attend(query, cachedKeys, cachedValues));
  });
  return Object.freeze({
    expected,
    actual: freezeMatrix(actual),
  });
}

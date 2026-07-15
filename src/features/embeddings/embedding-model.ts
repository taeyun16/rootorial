export type EmbeddingVector = readonly [number, number];
export type EmbeddingTable = readonly EmbeddingVector[];

export const EMBEDDING_DIMENSION = 2;
export const PAD_TOKEN_ID = 0;
export const UNKNOWN_TOKEN_ID = 1;

export const embeddingVocabulary = [
  { id: 0, token: "[PAD]", vector: [0, 0] },
  { id: 1, token: "[UNK]", vector: [-0.45, -0.45] },
  { id: 2, token: "cat", vector: [0.9, 0.35] },
  { id: 3, token: "dog", vector: [0.82, 0.42] },
  { id: 4, token: "apple", vector: [-0.78, 0.22] },
  { id: 5, token: "runs", vector: [0.18, 0.88] },
  { id: 6, token: "sleeps", vector: [0.1, 0.75] },
  { id: 7, token: "kit", vector: [0.84, 0.32] },
  { id: 8, token: "##ten", vector: [0.76, 0.38] },
  { id: 9, token: "bright", vector: [-0.12, 0.7] },
  { id: 10, token: "moon", vector: [-0.25, 0.58] },
] as const satisfies readonly {
  id: number;
  token: string;
  vector: EmbeddingVector;
}[];

export const baseEmbeddingTable: EmbeddingTable = embeddingVocabulary.map(
  ({ vector }) => [...vector] as EmbeddingVector,
);

export type TokenizerMode = "whole-word" | "subword";

export type TokenPiece = {
  source: string;
  token: string;
  id: number;
};

export type EmbeddingTokenizerErrorCode = "no-letter-word" | "too-many-pieces";

export class EmbeddingTokenizerError extends Error {
  readonly code: EmbeddingTokenizerErrorCode;

  constructor(code: EmbeddingTokenizerErrorCode) {
    super(code === "no-letter-word"
      ? "Tokenization needs at least one word containing letters"
      : "The didactic tokenizer accepts at most eight pieces");
    this.code = code;
    this.name = "EmbeddingTokenizerError";
  }
}

const tokenToId = new Map<string, number>(
  embeddingVocabulary.map(({ id, token }) => [token, id] as const),
);

function piecesForWord(word: string, mode: TokenizerMode): TokenPiece[] {
  const directId = tokenToId.get(word);
  if (directId !== undefined) return [{ source: word, token: word, id: directId }];

  if (mode === "subword") {
    for (let split = word.length - 1; split > 0; split -= 1) {
      const prefix = word.slice(0, split);
      const suffix = `##${word.slice(split)}`;
      const prefixId = tokenToId.get(prefix);
      const suffixId = tokenToId.get(suffix);
      if (prefixId !== undefined && suffixId !== undefined) {
        return [
          { source: word, token: prefix, id: prefixId },
          { source: word, token: suffix, id: suffixId },
        ];
      }
    }
  }

  return [{ source: word, token: "[UNK]", id: UNKNOWN_TOKEN_ID }];
}

export function tokenizeText(text: string, mode: TokenizerMode): TokenPiece[] {
  const words = text.toLocaleLowerCase("en-US").match(/\p{L}+/gu) ?? [];
  if (!words.length) throw new EmbeddingTokenizerError("no-letter-word");
  const pieces = words.flatMap((word) => piecesForWord(word, mode));
  if (pieces.length > 8) throw new EmbeddingTokenizerError("too-many-pieces");
  return pieces;
}

function assertVector(vector: readonly number[], label: string): asserts vector is EmbeddingVector {
  if (vector.length !== EMBEDDING_DIMENSION || vector.some((value) => !Number.isFinite(value))) {
    throw new Error(`${label} must contain exactly ${EMBEDDING_DIMENSION} finite values`);
  }
}

function assertTable(table: readonly (readonly number[])[]): asserts table is EmbeddingTable {
  if (table.length !== embeddingVocabulary.length) {
    throw new Error("Embedding table must have one row per vocabulary item");
  }
  table.forEach((row, index) => assertVector(row, `Embedding row ${index}`));
}

function assertTokenId(id: number) {
  if (!Number.isInteger(id) || id < 0 || id >= embeddingVocabulary.length) {
    throw new Error(`Token ID ${id} is outside the vocabulary`);
  }
}

export function lookupEmbeddings(
  tokenIds: readonly number[],
  table: readonly (readonly number[])[] = baseEmbeddingTable,
): EmbeddingVector[] {
  assertTable(table);
  return tokenIds.map((id) => {
    assertTokenId(id);
    return [...table[id]] as EmbeddingVector;
  });
}

export function oneHotVector(tokenId: number): number[] {
  assertTokenId(tokenId);
  return embeddingVocabulary.map(({ id }) => id === tokenId ? 1 : 0);
}

export function multiplyOneHotByTable(
  oneHot: readonly number[],
  table: readonly (readonly number[])[] = baseEmbeddingTable,
): EmbeddingVector {
  assertTable(table);
  if (
    oneHot.length !== table.length
    || oneHot.some((value) => !Number.isFinite(value))
  ) {
    throw new Error("One-hot vector must align with the vocabulary axis");
  }
  return [0, 1].map((dimension) => (
    oneHot.reduce((sum, coefficient, row) => sum + coefficient * table[row][dimension], 0)
  )) as unknown as EmbeddingVector;
}

export function vectorsApproximatelyEqual(
  left: readonly number[],
  right: readonly number[],
  tolerance = 1e-9,
) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) <= tolerance);
}

export function lookupMatchesOneHot(
  tokenId: number,
  table: readonly (readonly number[])[] = baseEmbeddingTable,
) {
  return vectorsApproximatelyEqual(
    lookupEmbeddings([tokenId], table)[0],
    multiplyOneHotByTable(oneHotVector(tokenId), table),
  );
}

export function uniqueTokenIds(tokenIds: readonly number[]) {
  tokenIds.forEach(assertTokenId);
  return [...new Set(tokenIds)].sort((left, right) => left - right);
}

export type EmbeddingUpdate = {
  table: EmbeddingVector[];
  occurrenceCountByRow: Record<number, number>;
  changedRows: number[];
};

export function applyEmbeddingGradient(
  table: readonly (readonly number[])[],
  tokenIds: readonly number[],
  upstreamGradient: readonly number[],
  learningRate: number,
): EmbeddingUpdate {
  assertTable(table);
  assertVector(upstreamGradient, "Upstream gradient");
  tokenIds.forEach(assertTokenId);
  if (!Number.isFinite(learningRate) || learningRate <= 0 || learningRate > 1) {
    throw new Error("Learning rate must be greater than zero and at most one");
  }

  const occurrenceCountByRow: Record<number, number> = {};
  tokenIds.forEach((id) => {
    occurrenceCountByRow[id] = (occurrenceCountByRow[id] ?? 0) + 1;
  });
  const nextTable = table.map((row, id) => {
    const count = occurrenceCountByRow[id] ?? 0;
    return row.map((value, dimension) => (
      value - learningRate * count * upstreamGradient[dimension]
    )) as unknown as EmbeddingVector;
  });

  return {
    table: nextTable,
    occurrenceCountByRow,
    changedRows: uniqueTokenIds(tokenIds),
  };
}

export function vectorDelta(
  before: readonly number[],
  after: readonly number[],
): EmbeddingVector {
  assertVector(before, "Before vector");
  assertVector(after, "After vector");
  return [after[0] - before[0], after[1] - before[1]];
}

export function vectorMagnitude(vector: readonly number[]) {
  assertVector(vector, "Vector");
  return Math.hypot(...vector);
}

export function dotProduct(left: readonly number[], right: readonly number[]) {
  assertVector(left, "Left vector");
  assertVector(right, "Right vector");
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function cosineSimilarity(
  left: readonly number[],
  right: readonly number[],
): number | null {
  const leftNorm = vectorMagnitude(left);
  const rightNorm = vectorMagnitude(right);
  if (leftNorm === 0 || rightNorm === 0) return null;
  return dotProduct(left, right) / (leftNorm * rightNorm);
}

export function meanPool(
  tokenIds: readonly number[],
  table: readonly (readonly number[])[] = baseEmbeddingTable,
  maskPadding = true,
): EmbeddingVector {
  assertTable(table);
  tokenIds.forEach(assertTokenId);
  const included = maskPadding
    ? tokenIds.filter((id) => id !== PAD_TOKEN_ID)
    : [...tokenIds];
  if (!included.length) throw new Error("Mean pooling needs at least one unmasked token");
  const rows = lookupEmbeddings(included, table);
  return [0, 1].map((dimension) => (
    rows.reduce((sum, row) => sum + row[dimension], 0) / included.length
  )) as unknown as EmbeddingVector;
}

export type EmbeddingLabEvidence = {
  correctShapePrediction: boolean;
  lookupEquivalenceInspected: boolean;
  repeatedRowUpdateObserved: boolean;
  unusedRowVerifiedStable: boolean;
};

export type EmbeddingLabMastery = {
  mastered: boolean;
  reason:
    | "mastered"
    | "shape-prediction"
    | "lookup-equivalence"
    | "repeated-update"
    | "unused-row";
};

export function evaluateEmbeddingLabMastery(
  evidence: EmbeddingLabEvidence,
): EmbeddingLabMastery {
  if (!evidence.correctShapePrediction) return { mastered: false, reason: "shape-prediction" };
  if (!evidence.lookupEquivalenceInspected) return { mastered: false, reason: "lookup-equivalence" };
  if (!evidence.repeatedRowUpdateObserved) return { mastered: false, reason: "repeated-update" };
  if (!evidence.unusedRowVerifiedStable) return { mastered: false, reason: "unused-row" };
  return { mastered: true, reason: "mastered" };
}

export const embeddingDebuggerScenarioIds = [
  "lookup-contract",
  "gradient-aggregation",
  "cosine-scale",
  "masked-pooling",
] as const;

export type EmbeddingDebuggerScenarioId = typeof embeddingDebuggerScenarioIds[number];

export type EmbeddingRepair =
  | "direct-lookup"
  | "softmax-row"
  | "average-table"
  | "sum-occurrences"
  | "dedupe-occurrences"
  | "update-all-rows"
  | "cosine-normalized"
  | "raw-dot"
  | "query-only-normalized"
  | "mask-pad"
  | "include-pad"
  | "sum-only";

export type EmbeddingRepairResult = {
  correct: boolean;
  reason:
    | "contract-restored"
    | "row-transformed"
    | "row-averaged"
    | "repeat-deduplicated"
    | "unreferenced-rows-updated"
    | "magnitude-leak"
    | "padding-shrunk-mean"
    | "pooling-not-mean";
  metrics: {
    output?: EmbeddingVector;
    expected?: EmbeddingVector;
    changedRows?: number[];
    repeatedDelta?: number;
    singleDelta?: number;
    score?: number;
    scaledScore?: number;
    basePool?: EmbeddingVector;
    paddedPool?: EmbeddingVector;
  };
};

function stableSoftmax(vector: EmbeddingVector): EmbeddingVector {
  const maximum = Math.max(...vector);
  const exponentials = vector.map((value) => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  return exponentials.map((value) => value / denominator) as unknown as EmbeddingVector;
}

function tableMean(table: EmbeddingTable): EmbeddingVector {
  return [0, 1].map((dimension) => (
    table.reduce((sum, row) => sum + row[dimension], 0) / table.length
  )) as unknown as EmbeddingVector;
}

function evaluateLookupRepair(repair: EmbeddingRepair): EmbeddingRepairResult {
  const expected = baseEmbeddingTable[4];
  const output = repair === "direct-lookup"
    ? lookupEmbeddings([4])[0]
    : repair === "softmax-row"
      ? stableSoftmax(expected)
      : tableMean(baseEmbeddingTable);
  const correct = vectorsApproximatelyEqual(output, expected);
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "softmax-row" ? "row-transformed" : "row-averaged",
    metrics: { output, expected },
  };
}

function evaluateGradientRepair(repair: EmbeddingRepair): EmbeddingRepairResult {
  const ids = [2, 2, 5];
  const gradient: EmbeddingVector = [0.2, -0.1];
  let next = baseEmbeddingTable.map((row) => [...row] as EmbeddingVector);
  let changedRows: number[];

  if (repair === "sum-occurrences") {
    const update = applyEmbeddingGradient(baseEmbeddingTable, ids, gradient, 0.5);
    next = update.table;
    changedRows = update.changedRows;
  } else if (repair === "dedupe-occurrences") {
    const update = applyEmbeddingGradient(baseEmbeddingTable, uniqueTokenIds(ids), gradient, 0.5);
    next = update.table;
    changedRows = update.changedRows;
  } else {
    next = baseEmbeddingTable.map((row) => [
      row[0] - 0.5 * gradient[0],
      row[1] - 0.5 * gradient[1],
    ]);
    changedRows = embeddingVocabulary.map(({ id }) => id);
  }

  const repeatedDelta = vectorMagnitude(vectorDelta(baseEmbeddingTable[2], next[2]));
  const singleDelta = vectorMagnitude(vectorDelta(baseEmbeddingTable[5], next[5]));
  const correct = (
    changedRows.length === 2
    && changedRows[0] === 2
    && changedRows[1] === 5
    && Math.abs(repeatedDelta - 2 * singleDelta) < 1e-9
    && vectorsApproximatelyEqual(next[4], baseEmbeddingTable[4])
  );
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "dedupe-occurrences"
        ? "repeat-deduplicated"
        : "unreferenced-rows-updated",
    metrics: { changedRows, repeatedDelta, singleDelta },
  };
}

function evaluateCosineRepair(repair: EmbeddingRepair): EmbeddingRepairResult {
  const query = baseEmbeddingTable[2];
  const candidate = baseEmbeddingTable[3];
  const scaledCandidate: EmbeddingVector = [candidate[0] * 7, candidate[1] * 7];
  let score: number;
  let scaledScore: number;
  if (repair === "cosine-normalized") {
    score = cosineSimilarity(query, candidate) ?? Number.NaN;
    scaledScore = cosineSimilarity(query, scaledCandidate) ?? Number.NaN;
  } else if (repair === "raw-dot") {
    score = dotProduct(query, candidate);
    scaledScore = dotProduct(query, scaledCandidate);
  } else {
    const queryNorm = vectorMagnitude(query);
    const normalizedQuery: EmbeddingVector = [query[0] / queryNorm, query[1] / queryNorm];
    score = dotProduct(normalizedQuery, candidate);
    scaledScore = dotProduct(normalizedQuery, scaledCandidate);
  }
  const correct = (
    Number.isFinite(score)
    && Math.abs(score) <= 1
    && Math.abs(score - scaledScore) < 1e-9
  );
  return {
    correct,
    reason: correct ? "contract-restored" : "magnitude-leak",
    metrics: { score, scaledScore },
  };
}

function sumPool(ids: readonly number[]): EmbeddingVector {
  const rows = lookupEmbeddings(ids);
  return [0, 1].map((dimension) => (
    rows.reduce((sum, row) => sum + row[dimension], 0)
  )) as unknown as EmbeddingVector;
}

function evaluatePoolingRepair(repair: EmbeddingRepair): EmbeddingRepairResult {
  const baseIds = [2, 3];
  const paddedIds = [2, 3, PAD_TOKEN_ID, PAD_TOKEN_ID];
  const expected = meanPool(baseIds);
  const basePool = repair === "sum-only"
    ? sumPool(baseIds)
    : meanPool(baseIds, baseEmbeddingTable, repair === "mask-pad");
  const paddedPool = repair === "sum-only"
    ? sumPool(paddedIds)
    : meanPool(paddedIds, baseEmbeddingTable, repair === "mask-pad");
  const correct = (
    vectorsApproximatelyEqual(basePool, expected)
    && vectorsApproximatelyEqual(paddedPool, expected)
  );
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "sum-only" ? "pooling-not-mean" : "padding-shrunk-mean",
    metrics: { basePool, paddedPool, expected },
  };
}

export function evaluateEmbeddingRepair(
  scenario: EmbeddingDebuggerScenarioId,
  repair: EmbeddingRepair,
): EmbeddingRepairResult {
  if (scenario === "lookup-contract") return evaluateLookupRepair(repair);
  if (scenario === "gradient-aggregation") return evaluateGradientRepair(repair);
  if (scenario === "cosine-scale") return evaluateCosineRepair(repair);
  return evaluatePoolingRepair(repair);
}

export function canCompleteEmbeddingsChapter({
  lookupLabComplete,
  debuggerComplete,
  conceptsMastered,
}: {
  lookupLabComplete: boolean;
  debuggerComplete: boolean;
  conceptsMastered: boolean;
}) {
  return lookupLabComplete && debuggerComplete && conceptsMastered;
}

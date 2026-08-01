import type { PracticeChallengeDefinition } from "../practice/practice.ts";

export type SelfAttentionPracticeChallengeId =
  | "reproduce-row-equivariance"
  | "diagnose-position-free-duplicates"
  | "transfer-causal-visibility";

export type RowEquivariancePrediction =
  | "outputs-follow-token-permutation"
  | "outputs-stay-in-original-order"
  | "token-axis-becomes-feature-axis";

export type RowEquivariancePolicy =
  | "permute-input-before-qkv"
  | "permute-keys-only"
  | "permute-values-only";

export type DuplicatePrediction =
  | "duplicate-rows-produce-duplicate-contexts"
  | "duplicate-rows-produce-different-contexts"
  | "only-duplicate-keys-match";

export type DuplicatePolicy =
  | "no-position-signal"
  | "inject-query-row-index"
  | "use-causal-prefix";

export type CausalTransferPrediction =
  | "token-only-changes-joint-relabel-restores"
  | "token-only-preserves-equivariance"
  | "visibility-never-moves";

export type CausalTransferPolicy =
  | "permute-input-and-visibility"
  | "permute-input-keep-causal"
  | "permute-visibility-only";

export type Matrix = readonly (readonly number[])[];

export type SelfAttentionPracticeFixture = Readonly<{
  tokens: Matrix;
  queryWeights: Matrix;
  keyWeights: Matrix;
  valueWeights: Matrix;
  permutation: readonly number[];
}>;

export type DuplicateFixture = Readonly<{
  attention: SelfAttentionPracticeFixture;
  duplicateRows: readonly [number, number];
}>;

function frozenMatrix(rows: Matrix): Matrix {
  return Object.freeze(rows.map((row) => Object.freeze([...row])));
}

function fixture(
  tokens: Matrix,
  permutation: readonly number[],
): SelfAttentionPracticeFixture {
  return Object.freeze({
    tokens: frozenMatrix(tokens),
    queryWeights: frozenMatrix([[1, 0.2], [-0.3, 0.8]]),
    keyWeights: frozenMatrix([[0.7, -0.1], [0.4, 1.1]]),
    valueWeights: frozenMatrix([[0.9, 0.5], [-0.2, 0.7]]),
    permutation: Object.freeze([...permutation]),
  });
}

export const rowEquivarianceVisibleFixture = fixture(
  [[1, 0], [0.2, 1], [-0.5, 0.7]],
  [2, 0, 1],
);

export const rowEquivarianceSecondFixture = fixture(
  [[0.1, 1], [0.8, -0.4], [-0.3, 0.2], [0.5, 0.9]],
  [1, 3, 0, 2],
);

export const duplicateVisibleFixture: DuplicateFixture = Object.freeze({
  attention: fixture(
    [[1, 0.2], [-0.4, 0.8], [1, 0.2]],
    [2, 0, 1],
  ),
  duplicateRows: Object.freeze([0, 2] as const),
});

export const duplicateSecondFixture: DuplicateFixture = Object.freeze({
  attention: fixture(
    [[0.1, 1], [0.7, -0.3], [-0.2, 0.4], [0.7, -0.3]],
    [1, 3, 0, 2],
  ),
  duplicateRows: Object.freeze([1, 3] as const),
});

export const causalTransferVisibleFixture = fixture(
  [[0.9, 0.1], [-0.2, 0.8], [0.4, -0.5]],
  [2, 0, 1],
);

export const causalTransferSecondFixture = fixture(
  [[-0.1, 0.7], [0.8, 0.2], [0.3, -0.6], [0.5, 0.9]],
  [1, 3, 0, 2],
);

export const selfAttentionPracticeChallenges:
readonly PracticeChallengeDefinition<SelfAttentionPracticeChallengeId>[] = [
  {
    id: "reproduce-row-equivariance",
    level: "single-boundary",
    skillId: "reproduce",
    label: "P·X → P·Y",
    title: "Reproduce token-row permutation equivariance",
    summary:
      "Permute X once before every row-wise projection and verify that output rows follow the same permutation.",
  },
  {
    id: "diagnose-position-free-duplicates",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "same row · same context",
    title: "Diagnose an accidental position leak",
    summary:
      "Show that identical token rows receive identical contexts when neither position nor visibility distinguishes them.",
  },
  {
    id: "transfer-causal-visibility",
    level: "transfer",
    skillId: "transfer",
    label: "P·X + P·M·Pᵀ",
    title: "Transfer equivariance across a causal visibility boundary",
    summary:
      "Separate token-only reordering from jointly relabeling both tokens and their query-key visibility relation.",
  },
] as const;

function project(rows: Matrix, weights: Matrix): number[][] {
  return rows.map((row) =>
    Array.from({ length: weights[0].length }, (_, column) =>
      row.reduce(
        (sum, value, index) => sum + value * weights[index][column],
        0,
      )
    )
  );
}

function dot(left: readonly number[], right: readonly number[]) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function stableVisibleSoftmax(
  scores: readonly number[],
  visible: readonly boolean[],
) {
  const allowed = scores.filter((_, index) => visible[index]);
  const maximum = Math.max(...allowed);
  const exponents = scores.map((score, index) =>
    visible[index] ? Math.exp(score - maximum) : 0
  );
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

function weightedSum(weights: readonly number[], rows: Matrix) {
  return Array.from({ length: rows[0].length }, (_, column) =>
    rows.reduce(
      (sum, row, rowIndex) => sum + weights[rowIndex] * row[column],
      0,
    )
  );
}

function fullVisibility(length: number): readonly (readonly boolean[])[] {
  return Array.from(
    { length },
    () => Object.freeze(Array.from({ length }, () => true)),
  );
}

export function causalVisibility(
  length: number,
): readonly (readonly boolean[])[] {
  return Array.from(
    { length },
    (_, query) => Object.freeze(
      Array.from({ length }, (_, key) => key <= query),
    ),
  );
}

function attend(
  queries: Matrix,
  keys: Matrix,
  values: Matrix,
  visibility: readonly (readonly boolean[])[],
) {
  const scale = Math.sqrt(queries[0].length);
  const scores = queries.map((query) =>
    keys.map((key) => dot(query, key) / scale)
  );
  const weights = scores.map((row, query) =>
    stableVisibleSoftmax(row, visibility[query])
  );
  const contexts = weights.map((row) => weightedSum(row, values));
  return Object.freeze({
    scores: frozenMatrix(scores),
    weights: frozenMatrix(weights),
    contexts: frozenMatrix(contexts),
  });
}

function projections(input: SelfAttentionPracticeFixture) {
  return {
    queries: project(input.tokens, input.queryWeights),
    keys: project(input.tokens, input.keyWeights),
    values: project(input.tokens, input.valueWeights),
  };
}

export function runSelfAttentionFixture(
  input: SelfAttentionPracticeFixture,
  visibility = fullVisibility(input.tokens.length),
) {
  const { queries, keys, values } = projections(input);
  return attend(queries, keys, values, visibility);
}

export function reorder<T>(
  values: readonly T[],
  permutation: readonly number[],
): T[] {
  return permutation.map((index) => values[index]);
}

export function permuteVisibility(
  visibility: readonly (readonly boolean[])[],
  permutation: readonly number[],
) {
  return permutation.map((query) =>
    permutation.map((key) => visibility[query][key])
  );
}

export function runRowEquivariancePolicy(
  input: SelfAttentionPracticeFixture,
  policy: RowEquivariancePolicy,
) {
  const baseline = runSelfAttentionFixture(input);
  const expectedContexts = reorder(
    baseline.contexts,
    input.permutation,
  );
  let permuted;
  if (policy === "permute-input-before-qkv") {
    permuted = runSelfAttentionFixture({
      ...input,
      tokens: reorder(input.tokens, input.permutation),
    });
  } else {
    const { queries, keys, values } = projections(input);
    permuted = attend(
      queries,
      policy === "permute-keys-only"
        ? reorder(keys, input.permutation)
        : keys,
      policy === "permute-values-only"
        ? reorder(values, input.permutation)
        : values,
      fullVisibility(input.tokens.length),
    );
  }
  return Object.freeze({
    baseline,
    expectedContexts: frozenMatrix(expectedContexts),
    permuted,
    permutation: input.permutation,
  });
}

export function runDuplicatePolicy(
  fixture: DuplicateFixture,
  policy: DuplicatePolicy,
) {
  const { queries, keys, values } = projections(fixture.attention);
  const learnerQueries = policy === "inject-query-row-index"
    ? queries.map((row, index) =>
        row.map((value, column) => value + (index + 1) * (column + 1) * 0.25)
      )
    : queries;
  const visibility = policy === "use-causal-prefix"
    ? causalVisibility(fixture.attention.tokens.length)
    : fullVisibility(fixture.attention.tokens.length);
  const trace = attend(learnerQueries, keys, values, visibility);
  const [first, second] = fixture.duplicateRows;
  return Object.freeze({
    ...trace,
    duplicateRows: fixture.duplicateRows,
    firstContext: trace.contexts[first],
    secondContext: trace.contexts[second],
  });
}

export function runCausalTransferPolicy(
  input: SelfAttentionPracticeFixture,
  policy: CausalTransferPolicy,
) {
  const baseVisibility = causalVisibility(input.tokens.length);
  const baseline = runSelfAttentionFixture(input, baseVisibility);
  const expectedContexts = reorder(
    baseline.contexts,
    input.permutation,
  );
  const permutedMask = permuteVisibility(
    baseVisibility,
    input.permutation,
  );
  const learnerInput = policy === "permute-visibility-only"
    ? input
    : {
        ...input,
        tokens: reorder(input.tokens, input.permutation),
      };
  const learnerVisibility = policy === "permute-input-and-visibility"
    || policy === "permute-visibility-only"
    ? permutedMask
    : causalVisibility(input.tokens.length);
  const transferred = runSelfAttentionFixture(
    learnerInput,
    learnerVisibility,
  );
  return Object.freeze({
    baseline,
    expectedContexts: frozenMatrix(expectedContexts),
    transferred,
    baseVisibility,
    learnerVisibility,
    permutation: input.permutation,
  });
}

import type { PracticeChallengeDefinition } from "../practice/practice.ts";

export type AttentionPracticeChallengeId =
  | "reproduce-fresh-routing"
  | "diagnose-row-pairing"
  | "transfer-score-shift";

export type RoutingPrediction =
  | "weights-per-key-context-in-value-space"
  | "single-hard-row"
  | "context-in-key-space";

export type RoutingPolicy =
  | "stable-softmax-values"
  | "normalize-score-sum-values"
  | "stable-softmax-keys";

export type PairingPrediction =
  | "context-and-top-label-stable"
  | "context-changes"
  | "top-label-changes";

export type PairingPolicy =
  | "reorder-paired-rows"
  | "reorder-addresses-only"
  | "reorder-content-only";

export type ScoreShiftPrediction =
  | "weights-context-invariant"
  | "weights-become-uniform"
  | "top-weight-becomes-one";

export type ScoreShiftPolicy =
  | "subtract-row-max"
  | "raw-exponentials"
  | "divide-score-sum";

export type AttentionPracticeFixture = Readonly<{
  query: readonly number[];
  keys: readonly (readonly number[])[];
  values: readonly (readonly number[])[];
  slotIds: readonly string[];
}>;

export type PairingFixture = Readonly<{
  attention: AttentionPracticeFixture;
  permutation: readonly number[];
}>;

export type ScoreShiftFixture = Readonly<{
  scores: readonly number[];
  values: readonly (readonly number[])[];
  offset: number;
}>;

function frozenMatrix(rows: readonly (readonly number[])[]) {
  return Object.freeze(rows.map((row) => Object.freeze([...row])));
}

function fixture(
  query: readonly number[],
  keys: readonly (readonly number[])[],
  values: readonly (readonly number[])[],
  slotIds: readonly string[],
): AttentionPracticeFixture {
  return Object.freeze({
    query: Object.freeze([...query]),
    keys: frozenMatrix(keys),
    values: frozenMatrix(values),
    slotIds: Object.freeze([...slotIds]),
  });
}

export const routingVisibleFixture = fixture(
  [1.2, -0.4],
  [[0.8, 0.1], [-0.2, 1], [0.4, -0.7]],
  [[0.9, 0.1, 0.2], [0.1, 0.8, 0.3], [0.5, 0.4, 0.9]],
  ["red", "car", "moves"],
);

export const routingSecondFixture = fixture(
  [-0.5, 1.1],
  [[1, 0.2], [-0.4, 0.9], [0.3, -0.8]],
  [[0.2, 0.7, 0.1], [0.8, 0.1, 0.4], [0.4, 0.5, 0.9]],
  ["north", "harbor", "signal"],
);

export const pairingVisibleFixture: PairingFixture = Object.freeze({
  attention: routingVisibleFixture,
  permutation: Object.freeze([2, 0, 1]),
});

export const pairingSecondFixture: PairingFixture = Object.freeze({
  attention: routingSecondFixture,
  permutation: Object.freeze([1, 2, 0]),
});

export const scoreShiftVisibleFixture: ScoreShiftFixture = Object.freeze({
  scores: Object.freeze([2, 0.5, -1]),
  values: frozenMatrix([[0.8, 0.1], [0.2, 0.7], [0.4, 0.3]]),
  offset: 1000,
});

export const scoreShiftSecondFixture: ScoreShiftFixture = Object.freeze({
  scores: Object.freeze([-2, 0, 1.4]),
  values: frozenMatrix([[0.1, 0.9], [0.6, 0.2], [0.9, 0.4]]),
  offset: -800,
});

export const attentionPracticeChallenges:
readonly PracticeChallengeDefinition<AttentionPracticeChallengeId>[] = [
  {
    id: "reproduce-fresh-routing",
    level: "single-boundary",
    skillId: "reproduce",
    label: "qKᵀ → αV",
    title: "Reproduce routing on fresh memory rows",
    summary:
      "Build one weight per key, then combine paired values into a context in value space.",
  },
  {
    id: "diagnose-row-pairing",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "K ↔ V rows",
    title: "Diagnose a broken key-value row permutation",
    summary:
      "Reorder addresses, content, and labels as one source-row unit across two memories.",
  },
  {
    id: "transfer-score-shift",
    level: "transfer",
    skillId: "transfer",
    label: "softmax(s+c)",
    title: "Transfer stable routing across extreme score offsets",
    summary:
      "Preserve weights and context when every score receives the same large offset.",
  },
] as const;

function dot(left: readonly number[], right: readonly number[]) {
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function stableSoftmax(scores: readonly number[]) {
  const maximum = Math.max(...scores);
  const exponents = scores.map((score) => Math.exp(score - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

function weightedSum(
  weights: readonly number[],
  rows: readonly (readonly number[])[],
) {
  return Array.from({ length: rows[0].length }, (_, column) =>
    rows.reduce(
      (sum, row, rowIndex) => sum + weights[rowIndex] * row[column],
      0,
    )
  );
}

function argmax(values: readonly number[]) {
  return values.reduce(
    (best, value, index) => value > values[best] ? index : best,
    0,
  );
}

export function runRoutingPolicy(
  input: AttentionPracticeFixture,
  policy: RoutingPolicy,
) {
  const scores = input.keys.map((key) => dot(input.query, key));
  const scoreTotal = scores.reduce((sum, score) => sum + score, 0);
  const weights = policy === "normalize-score-sum-values"
    ? scores.map((score) => score / scoreTotal)
    : stableSoftmax(scores);
  const rows = policy === "stable-softmax-keys" ? input.keys : input.values;
  const context = weightedSum(weights, rows);
  return Object.freeze({
    scores: Object.freeze(scores),
    weights: Object.freeze(weights),
    context: Object.freeze(context),
    topSlotId: input.slotIds[argmax(weights)],
    contextSpace: policy === "stable-softmax-keys" ? "key" : "value",
  });
}

function reorder<T>(values: readonly T[], permutation: readonly number[]) {
  return permutation.map((index) => values[index]);
}

export function runPairingPolicy(
  fixture: PairingFixture,
  policy: PairingPolicy,
) {
  const { attention, permutation } = fixture;
  const baseline = runRoutingPolicy(attention, "stable-softmax-values");
  const reorderedInput: AttentionPracticeFixture = policy === "reorder-paired-rows"
    ? {
        ...attention,
        keys: reorder(attention.keys, permutation),
        values: reorder(attention.values, permutation),
        slotIds: reorder(attention.slotIds, permutation),
      }
    : policy === "reorder-addresses-only"
      ? {
          ...attention,
          keys: reorder(attention.keys, permutation),
          slotIds: reorder(attention.slotIds, permutation),
        }
      : {
          ...attention,
          values: reorder(attention.values, permutation),
        };
  const reordered = runRoutingPolicy(
    reorderedInput,
    "stable-softmax-values",
  );
  return Object.freeze({
    baseline,
    reordered,
    permutation,
  });
}

function rawSoftmax(scores: readonly number[]) {
  const exponents = scores.map((score) => Math.exp(score));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

function scoreSumWeights(scores: readonly number[]) {
  const total = scores.reduce((sum, score) => sum + score, 0);
  return scores.map((score) => score / total);
}

function weightsForPolicy(
  scores: readonly number[],
  policy: ScoreShiftPolicy,
) {
  if (policy === "subtract-row-max") return stableSoftmax(scores);
  if (policy === "raw-exponentials") return rawSoftmax(scores);
  return scoreSumWeights(scores);
}

export function runScoreShiftPolicy(
  fixture: ScoreShiftFixture,
  policy: ScoreShiftPolicy,
) {
  const shiftedScores = fixture.scores.map((score) => score + fixture.offset);
  const baselineWeights = weightsForPolicy(fixture.scores, policy);
  const shiftedWeights = weightsForPolicy(shiftedScores, policy);
  return Object.freeze({
    baselineWeights: Object.freeze(baselineWeights),
    shiftedWeights: Object.freeze(shiftedWeights),
    baselineContext: Object.freeze(weightedSum(
      baselineWeights,
      fixture.values,
    )),
    shiftedContext: Object.freeze(weightedSum(
      shiftedWeights,
      fixture.values,
    )),
    shiftedScores: Object.freeze(shiftedScores),
  });
}

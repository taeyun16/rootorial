import type { PracticeChallengeDefinition } from "../practice/practice.ts";
import {
  EMBEDDING_DIMENSION,
  UNKNOWN_TOKEN_ID,
  baseEmbeddingTable,
  lookupEmbeddings,
  tokenizeText,
  type EmbeddingVector,
} from "./embedding-model.ts";

export type EmbeddingsPracticeChallengeId =
  | "reproduce-addressed-lookup"
  | "diagnose-scatter-cancellation"
  | "transfer-unknown-collision";

export type LookupPrediction =
  | "positions-by-dimension"
  | "vocabulary-by-dimension"
  | "single-vector";

export type LookupPolicy =
  | "direct-row"
  | "first-row-for-all"
  | "mean-then-repeat";

export type ScatterPrediction =
  | "partial-then-zero"
  | "both-double"
  | "last-only";

export type ScatterPolicy =
  | "sum-occurrences"
  | "first-occurrence-only"
  | "overwrite-with-last";

export type UnknownPrediction =
  | "shared-unknown-row"
  | "separate-unknown-rows"
  | "drop-unknown-words";

export type UnknownPolicy =
  | "keep-unknown-id"
  | "invent-spelling-row"
  | "drop-unknown-id";

export type LookupFixture = Readonly<{
  ids: readonly number[];
}>;

export type ScatterFixture = Readonly<{
  ids: readonly number[];
  upstream: readonly EmbeddingVector[];
  repeatedId: number;
}>;

export type UnknownFixture = Readonly<{
  text: string;
}>;

export const embeddingsPracticeChallenges:
readonly PracticeChallengeDefinition<EmbeddingsPracticeChallengeId>[] = [
  {
    id: "reproduce-addressed-lookup",
    level: "single-boundary",
    skillId: "reproduce",
    label: "E[ids]",
    title: "Reproduce direct lookup on fresh token IDs",
    summary:
      "Keep one output row per token position while changing both IDs and sequence length.",
  },
  {
    id: "diagnose-scatter-cancellation",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "scatter-add",
    title: "Diagnose repeated-token gradients that partially or fully cancel",
    summary:
      "Accumulate every occurrence before deciding whether a referenced row changes.",
  },
  {
    id: "transfer-unknown-collision",
    level: "transfer",
    skillId: "transfer",
    label: "[UNK] collision",
    title: "Transfer lookup rules to unseen words",
    summary:
      "Preserve token positions while observing that distinct unseen words may share one unknown row.",
  },
] as const;

export const lookupVisibleFixture: LookupFixture = Object.freeze({
  ids: Object.freeze([9, 10]),
});

export const lookupSecondFixture: LookupFixture = Object.freeze({
  ids: Object.freeze([4, 7, 8]),
});

export const scatterVisibleFixture: ScatterFixture = Object.freeze({
  ids: Object.freeze([7, 7, 10]),
  upstream: Object.freeze([
    Object.freeze([0.3, -0.1]) as EmbeddingVector,
    Object.freeze([-0.1, 0.2]) as EmbeddingVector,
    Object.freeze([0.05, -0.4]) as EmbeddingVector,
  ]),
  repeatedId: 7,
});

export const scatterSecondFixture: ScatterFixture = Object.freeze({
  ids: Object.freeze([4, 9, 4]),
  upstream: Object.freeze([
    Object.freeze([0.25, -0.3]) as EmbeddingVector,
    Object.freeze([0.2, 0.1]) as EmbeddingVector,
    Object.freeze([-0.25, 0.3]) as EmbeddingVector,
  ]),
  repeatedId: 4,
});

export const unknownVisibleFixture: UnknownFixture = Object.freeze({
  text: "river glows",
});

export const unknownSecondFixture: UnknownFixture = Object.freeze({
  text: "cat comet",
});

function meanVector(rows: readonly EmbeddingVector[]): EmbeddingVector {
  return [
    rows.reduce((sum, row) => sum + row[0], 0) / rows.length,
    rows.reduce((sum, row) => sum + row[1], 0) / rows.length,
  ];
}

export function runAddressedLookup(
  fixture: LookupFixture,
  policy: LookupPolicy,
) {
  const directRows = lookupEmbeddings(fixture.ids);
  const rows = policy === "direct-row"
    ? directRows
    : policy === "first-row-for-all"
      ? fixture.ids.map(() => [...directRows[0]] as EmbeddingVector)
      : fixture.ids.map(() => meanVector(directRows));
  return {
    rows,
    shape: [rows.length, EMBEDDING_DIMENSION] as const,
  };
}

export function aggregateOccurrenceGradients(
  fixture: ScatterFixture,
  policy: ScatterPolicy,
) {
  const gradientByRow: Record<number, [number, number]> = {};
  fixture.ids.forEach((id, index) => {
    const contribution = fixture.upstream[index];
    const previous = gradientByRow[id];
    if (policy === "first-occurrence-only" && previous) return;
    if (policy === "overwrite-with-last" || !previous) {
      gradientByRow[id] = [contribution[0], contribution[1]];
      return;
    }
    gradientByRow[id] = [
      previous[0] + contribution[0],
      previous[1] + contribution[1],
    ];
  });
  return {
    gradientByRow,
    repeatedGradient: gradientByRow[fixture.repeatedId] as EmbeddingVector,
    repeatedContributionCount:
      fixture.ids.filter((id) => id === fixture.repeatedId).length,
  };
}

export function runUnknownTokenPath(
  fixture: UnknownFixture,
  policy: UnknownPolicy,
) {
  const pieces = tokenizeText(fixture.text, "whole-word");
  let inventedIndex = 0;
  const ids = pieces
    .map(({ id }) => {
      if (id !== UNKNOWN_TOKEN_ID || policy === "keep-unknown-id") return id;
      if (policy === "drop-unknown-id") return null;
      const inventedId = 9 + inventedIndex % 2;
      inventedIndex += 1;
      return inventedId;
    })
    .filter((id): id is number => id !== null);
  return {
    pieces,
    ids,
    rows: lookupEmbeddings(ids, baseEmbeddingTable),
  };
}

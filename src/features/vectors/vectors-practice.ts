import type { PracticeChallengeDefinition } from "../practice/practice";

export type VectorPracticeChallengeId =
  | "reshape-inference"
  | "broadcast-repair"
  | "attention-score-shape";

export type ReshapeColumnChoice = -1 | 4 | 6;
export type ReshapePrediction = "adapts-both" | "four-columns-both" | "second-errors";
export type BroadcastPrediction = "broadcasts" | "shape-error";
export type BroadcastFailureAxis = "leading" | "middle" | "feature";
export type BroadcastRepair = "singleton-feature" | "singleton-middle" | "match-left";
export type AttentionShapePrediction = "queries-by-keys" | "features-by-features";
export type AttentionScoreOperation = "q-k-transpose" | "q-transpose-k" | "q-k";

export type Shape = readonly number[];
export type MatrixShape = readonly [number, number];

export const vectorPracticeChallenges: readonly PracticeChallengeDefinition<VectorPracticeChallengeId>[] = [
  {
    id: "reshape-inference",
    level: "single-boundary",
    skillId: "reproduce",
    label: "reshape(3, ?)",
    title: "Keep the row contract across two fixtures",
    summary: "Choose one column expression that works for both element counts.",
  },
  {
    id: "broadcast-repair",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "Broadcast boundary",
    title: "Find the first incompatible axis",
    summary: "Predict the failure, identify its axis, and repair only the right operand.",
  },
  {
    id: "attention-score-shape",
    level: "transfer",
    skillId: "transfer",
    label: "QKᵀ shape",
    title: "Transfer dot-product shape to Attention scores",
    summary: "Choose one matrix expression that maps queries to every key.",
  },
] as const;

export const reshapeVisibleFixture = Object.freeze({
  elementCount: 12,
  rows: 3,
});

export const reshapeSecondFixture = Object.freeze({
  elementCount: 18,
  rows: 3,
});

export function reshapeWithColumnChoice(
  fixture: Readonly<{ elementCount: number; rows: number }>,
  columns: ReshapeColumnChoice,
): Shape | null {
  const resolvedColumns = columns === -1
    ? fixture.elementCount / fixture.rows
    : columns;
  if (
    !Number.isInteger(resolvedColumns)
    || resolvedColumns <= 0
    || fixture.rows * resolvedColumns !== fixture.elementCount
  ) {
    return null;
  }
  return [fixture.rows, resolvedColumns];
}

export type BroadcastResult = Readonly<{
  outputShape: Shape | null;
  failedAxisFromRight: number | null;
}>;

export function evaluateBroadcastShapes(
  left: Shape,
  right: Shape,
): BroadcastResult {
  const rank = Math.max(left.length, right.length);
  const outputFromRight: number[] = [];
  for (let axisFromRight = 0; axisFromRight < rank; axisFromRight += 1) {
    const leftSize = left[left.length - 1 - axisFromRight] ?? 1;
    const rightSize = right[right.length - 1 - axisFromRight] ?? 1;
    if (leftSize !== rightSize && leftSize !== 1 && rightSize !== 1) {
      return { outputShape: null, failedAxisFromRight: axisFromRight };
    }
    outputFromRight.push(Math.max(leftSize, rightSize));
  }
  return {
    outputShape: outputFromRight.reverse(),
    failedAxisFromRight: null,
  };
}

export const broadcastLeftShape: Shape = Object.freeze([2, 1, 3]);
export const broadcastBrokenRightShape: Shape = Object.freeze([1, 4, 2]);

export const broadcastRepairShapes: Readonly<Record<BroadcastRepair, Shape>> = Object.freeze({
  "singleton-feature": Object.freeze([1, 4, 1]),
  "singleton-middle": Object.freeze([1, 1, 2]),
  "match-left": Object.freeze([2, 4, 2]),
});

export const attentionVisibleFixture = Object.freeze({
  queryShape: [2, 3] as MatrixShape,
  keyShape: [4, 3] as MatrixShape,
});

export const attentionSecondFixture = Object.freeze({
  queryShape: [5, 6] as MatrixShape,
  keyShape: [7, 6] as MatrixShape,
});

function transpose([rows, columns]: MatrixShape): MatrixShape {
  return [columns, rows];
}

function matrixProductShape(
  left: MatrixShape,
  right: MatrixShape,
): MatrixShape | null {
  return left[1] === right[0] ? [left[0], right[1]] : null;
}

export function evaluateAttentionScoreShape(
  fixture: Readonly<{ queryShape: MatrixShape; keyShape: MatrixShape }>,
  operation: AttentionScoreOperation,
): MatrixShape | null {
  if (operation === "q-k-transpose") {
    return matrixProductShape(fixture.queryShape, transpose(fixture.keyShape));
  }
  if (operation === "q-transpose-k") {
    return matrixProductShape(transpose(fixture.queryShape), fixture.keyShape);
  }
  return matrixProductShape(fixture.queryShape, fixture.keyShape);
}

import type { PracticeChallengeDefinition } from "../practice/practice.ts";

export type TransformerBlockPracticeChallengeId =
  | "reproduce-residual-ledger"
  | "diagnose-prenorm-shift"
  | "transfer-two-block-handoff";

export type ResidualLedgerPrediction =
  | "both-branches-update-shared-stream"
  | "branches-replace-the-stream"
  | "second-branch-reuses-x0";

export type ResidualLedgerPolicy =
  | "two-residual-updates"
  | "drop-first-skip"
  | "reuse-x0-second-skip";

export type PrenormShiftPrediction =
  | "branch-stays-output-shifts"
  | "branch-and-output-stay-fixed"
  | "branch-shifts-output-stays";

export type PrenormShiftPolicy =
  | "prenorm-plus-skip"
  | "branch-only"
  | "postnorm-after-add";

export type TwoBlockPrediction =
  | "position-once-then-handoff-y"
  | "position-before-every-block"
  | "restart-each-block-from-embedding";

export type TwoBlockPolicy =
  | "position-once-handoff-y"
  | "readd-position-before-block2"
  | "restart-block2-from-input";

export type Matrix = readonly (readonly number[])[];

export type ResidualLedgerFixture = Readonly<{
  x0: readonly number[];
  attentionBranch: readonly number[];
  ffnBranch: readonly number[];
}>;

export type PrenormShiftFixture = Readonly<{
  x: readonly number[];
  commonShift: number;
  branchScale: readonly number[];
  branchBias: readonly number[];
}>;

type MicroBlockParameters = Readonly<{
  attentionSelfScale: number;
  attentionCrossScale: number;
  attentionBias: readonly number[];
  ffnInputScale: readonly number[];
  ffnBias: readonly number[];
  ffnOutputScale: readonly number[];
}>;

export type TwoBlockFixture = Readonly<{
  embeddings: Matrix;
  positions: Matrix;
  block1: MicroBlockParameters;
  block2: MicroBlockParameters;
}>;

function freezeVector(values: readonly number[]) {
  return Object.freeze([...values]);
}

function freezeMatrix(rows: Matrix): Matrix {
  return Object.freeze(rows.map(freezeVector));
}

function freezeResidualFixture(
  fixture: ResidualLedgerFixture,
): ResidualLedgerFixture {
  return Object.freeze({
    x0: freezeVector(fixture.x0),
    attentionBranch: freezeVector(fixture.attentionBranch),
    ffnBranch: freezeVector(fixture.ffnBranch),
  });
}

function freezeShiftFixture(
  fixture: PrenormShiftFixture,
): PrenormShiftFixture {
  return Object.freeze({
    ...fixture,
    x: freezeVector(fixture.x),
    branchScale: freezeVector(fixture.branchScale),
    branchBias: freezeVector(fixture.branchBias),
  });
}

function freezeParameters(
  parameters: MicroBlockParameters,
): MicroBlockParameters {
  return Object.freeze({
    ...parameters,
    attentionBias: freezeVector(parameters.attentionBias),
    ffnInputScale: freezeVector(parameters.ffnInputScale),
    ffnBias: freezeVector(parameters.ffnBias),
    ffnOutputScale: freezeVector(parameters.ffnOutputScale),
  });
}

function freezeStackFixture(fixture: TwoBlockFixture): TwoBlockFixture {
  return Object.freeze({
    embeddings: freezeMatrix(fixture.embeddings),
    positions: freezeMatrix(fixture.positions),
    block1: freezeParameters(fixture.block1),
    block2: freezeParameters(fixture.block2),
  });
}

export const residualLedgerVisibleFixture = freezeResidualFixture({
  x0: [0.8, -0.4, 1.2],
  attentionBranch: [0.15, 0.35, -0.25],
  ffnBranch: [-0.1, 0.2, 0.4],
});

export const residualLedgerSecondFixture = freezeResidualFixture({
  x0: [-0.6, 0.9, 0.3],
  attentionBranch: [0.45, -0.15, 0.2],
  ffnBranch: [0.25, -0.3, 0.1],
});

export const prenormShiftVisibleFixture = freezeShiftFixture({
  x: [0.2, -0.8, 1.1],
  commonShift: 2,
  branchScale: [0.35, -0.2, 0.5],
  branchBias: [0.1, -0.05, 0.02],
});

export const prenormShiftSecondFixture = freezeShiftFixture({
  x: [-1.2, 0.4, 0.7],
  commonShift: -1.5,
  branchScale: [-0.25, 0.45, 0.3],
  branchBias: [0.03, 0.08, -0.04],
});

export const twoBlockVisibleFixture = freezeStackFixture({
  embeddings: [[0.7, -0.2, 0.4], [-0.3, 0.8, 0.1]],
  positions: [[0, 0.3, -0.1], [0.2, -0.1, 0.4]],
  block1: {
    attentionSelfScale: 0.22,
    attentionCrossScale: 0.12,
    attentionBias: [0.03, -0.02, 0.01],
    ffnInputScale: [0.4, -0.3, 0.25],
    ffnBias: [0.05, 0.08, -0.02],
    ffnOutputScale: [0.3, -0.2, 0.35],
  },
  block2: {
    attentionSelfScale: 0.18,
    attentionCrossScale: -0.08,
    attentionBias: [-0.01, 0.04, 0.02],
    ffnInputScale: [-0.35, 0.28, 0.42],
    ffnBias: [0.06, -0.03, 0.04],
    ffnOutputScale: [0.25, 0.32, -0.18],
  },
});

export const twoBlockSecondFixture = freezeStackFixture({
  embeddings: [
    [0.1, 0.6, -0.5],
    [0.9, -0.4, 0.2],
    [-0.2, 0.3, 0.8],
  ],
  positions: [
    [0, 0.2, 0.1],
    [0.3, -0.2, 0],
    [-0.1, 0.1, 0.4],
  ],
  block1: {
    attentionSelfScale: 0.2,
    attentionCrossScale: 0.1,
    attentionBias: [0.02, 0.01, -0.03],
    ffnInputScale: [0.3, 0.45, -0.25],
    ffnBias: [0.04, -0.02, 0.09],
    ffnOutputScale: [-0.2, 0.27, 0.31],
  },
  block2: {
    attentionSelfScale: 0.16,
    attentionCrossScale: -0.06,
    attentionBias: [0.01, -0.03, 0.05],
    ffnInputScale: [0.38, -0.22, 0.34],
    ffnBias: [-0.01, 0.07, 0.03],
    ffnOutputScale: [0.29, 0.21, -0.24],
  },
});

export const transformerBlockPracticeChallenges:
readonly PracticeChallengeDefinition<TransformerBlockPracticeChallengeId>[] = [
  {
    id: "reproduce-residual-ledger",
    level: "single-boundary",
    skillId: "reproduce",
    label: "x₀ → x₁ → y",
    title: "Reproduce both residual updates on fresh states",
    summary:
      "Keep one shared state stream and add the attention and FFN branch outputs at their matching residual boundaries.",
  },
  {
    id: "diagnose-prenorm-shift",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "LN shift · skip identity",
    title: "Diagnose a pre-norm residual under a common feature shift",
    summary:
      "Show that LayerNorm removes a common feature shift from the branch while the residual path carries it to the output.",
  },
  {
    id: "transfer-two-block-handoff",
    level: "transfer",
    skillId: "transfer",
    label: "E+P once · y₁→block₂",
    title: "Transfer one block state into a second block",
    summary:
      "Add position once, hand off the first block output, and distinguish stacking from re-adding position or restarting the stream.",
  },
] as const;

function addVectors(
  left: readonly number[],
  right: readonly number[],
): number[] {
  if (left.length !== right.length) throw new Error("Vector shapes must match");
  return left.map((value, index) => value + right[index]);
}

function addMatrices(left: Matrix, right: Matrix): Matrix {
  if (
    left.length !== right.length
    || left.some((row, index) => row.length !== right[index]?.length)
  ) {
    throw new Error("Matrix shapes must match");
  }
  return freezeMatrix(left.map((row, index) => addVectors(row, right[index])));
}

function layerNormRow(row: readonly number[]) {
  const mean = row.reduce((sum, value) => sum + value, 0) / row.length;
  const variance = row.reduce(
    (sum, value) => sum + (value - mean) ** 2,
    0,
  ) / row.length;
  const denominator = Math.sqrt(variance + 1e-5);
  return row.map((value) => (value - mean) / denominator);
}

function layerNormRows(matrix: Matrix): Matrix {
  return freezeMatrix(matrix.map(layerNormRow));
}

export function runResidualLedgerPolicy(
  fixture: ResidualLedgerFixture,
  policy: ResidualLedgerPolicy,
) {
  const expectedX1 = addVectors(fixture.x0, fixture.attentionBranch);
  const expectedOutput = addVectors(expectedX1, fixture.ffnBranch);
  const actualX1 = policy === "drop-first-skip"
    ? [...fixture.attentionBranch]
    : expectedX1;
  const actualOutput = policy === "reuse-x0-second-skip"
    ? addVectors(fixture.x0, fixture.ffnBranch)
    : addVectors(actualX1, fixture.ffnBranch);
  return Object.freeze({
    expectedX1: freezeVector(expectedX1),
    expectedOutput: freezeVector(expectedOutput),
    actualX1: freezeVector(actualX1),
    actualOutput: freezeVector(actualOutput),
  });
}

function shiftBranch(
  row: readonly number[],
  fixture: PrenormShiftFixture,
) {
  const normalized = layerNormRow(row);
  return normalized.map(
    (value, index) =>
      value * fixture.branchScale[index] + fixture.branchBias[index],
  );
}

function runShiftCandidate(
  row: readonly number[],
  fixture: PrenormShiftFixture,
  policy: PrenormShiftPolicy,
) {
  const branch = shiftBranch(row, fixture);
  const added = addVectors(row, branch);
  const output = policy === "branch-only"
    ? branch
    : policy === "postnorm-after-add"
      ? layerNormRow(added)
      : added;
  return {
    branch: freezeVector(branch),
    output: freezeVector(output),
  };
}

export function runPrenormShiftPolicy(
  fixture: PrenormShiftFixture,
  policy: PrenormShiftPolicy,
) {
  const shiftedInput = fixture.x.map(
    (value) => value + fixture.commonShift,
  );
  const canonicalBase = runShiftCandidate(
    fixture.x,
    fixture,
    "prenorm-plus-skip",
  );
  const base = runShiftCandidate(fixture.x, fixture, policy);
  const shifted = runShiftCandidate(shiftedInput, fixture, policy);
  const expectedShiftedOutput = canonicalBase.output.map(
    (value) => value + fixture.commonShift,
  );
  return Object.freeze({
    base,
    shifted,
    expectedShiftedOutput: freezeVector(expectedShiftedOutput),
    shiftedInput: freezeVector(shiftedInput),
  });
}

function meanRows(matrix: Matrix) {
  return Array.from({ length: matrix[0].length }, (_, column) =>
    matrix.reduce((sum, row) => sum + row[column], 0) / matrix.length
  );
}

function runMicroBlock(input: Matrix, parameters: MicroBlockParameters) {
  const norm1 = layerNormRows(input);
  const pooled = meanRows(norm1);
  const attention = freezeMatrix(norm1.map((row) =>
    row.map(
      (value, feature) =>
        value * parameters.attentionSelfScale
        + pooled[feature] * parameters.attentionCrossScale
        + parameters.attentionBias[feature],
    )
  ));
  const x1 = addMatrices(input, attention);
  const norm2 = layerNormRows(x1);
  const hidden = freezeMatrix(norm2.map((row) =>
    row.map(
      (value, feature) =>
        Math.max(
          0,
          value * parameters.ffnInputScale[feature]
            + parameters.ffnBias[feature],
        ),
    )
  ));
  const ffn = freezeMatrix(hidden.map((row) =>
    row.map(
      (value, feature) => value * parameters.ffnOutputScale[feature],
    )
  ));
  const output = addMatrices(x1, ffn);
  return Object.freeze({ norm1, attention, x1, norm2, hidden, ffn, output });
}

export function runTwoBlockPolicy(
  fixture: TwoBlockFixture,
  policy: TwoBlockPolicy,
) {
  const x0 = addMatrices(fixture.embeddings, fixture.positions);
  const first = runMicroBlock(x0, fixture.block1);
  const expectedSecond = runMicroBlock(first.output, fixture.block2);
  const secondInput = policy === "readd-position-before-block2"
    ? addMatrices(first.output, fixture.positions)
    : policy === "restart-block2-from-input"
      ? x0
      : first.output;
  const actualSecond = runMicroBlock(secondInput, fixture.block2);
  return Object.freeze({
    x0,
    first,
    secondInput,
    expectedSecond,
    actualSecond,
  });
}

export function maximumVectorError(
  left: readonly number[],
  right: readonly number[],
) {
  return Math.max(...left.map((value, index) => Math.abs(value - right[index])));
}

export function maximumMatrixError(left: Matrix, right: Matrix) {
  return Math.max(
    ...left.flatMap((row, rowIndex) =>
      row.map(
        (value, column) => Math.abs(value - right[rowIndex][column]),
      )
    ),
  );
}

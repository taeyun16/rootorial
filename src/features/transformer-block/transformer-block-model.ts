import {
  SELF_ATTENTION_HEAD_COUNT,
  SELF_ATTENTION_HEAD_DIMENSION,
  SELF_ATTENTION_MODEL_DIMENSION,
  SELF_ATTENTION_TOKEN_COUNT,
  selfAttentionFixture,
  selfAttentionTokens,
} from "../self-attention/self-attention-model.ts";

export const TRANSFORMER_BLOCK_TOKEN_COUNT = SELF_ATTENTION_TOKEN_COUNT;
export const TRANSFORMER_BLOCK_MODEL_DIMENSION = SELF_ATTENTION_MODEL_DIMENSION;
export const TRANSFORMER_BLOCK_HEAD_COUNT = SELF_ATTENTION_HEAD_COUNT;
export const TRANSFORMER_BLOCK_HEAD_DIMENSION = SELF_ATTENTION_HEAD_DIMENSION;
export const TRANSFORMER_BLOCK_FFN_DIMENSION = 6;
export const TRANSFORMER_BLOCK_LAYER_NORM_EPSILON = 1e-5;

export type NumericVector = readonly number[];
export type NumericMatrix = readonly NumericVector[];
export type BooleanMatrix = readonly (readonly boolean[])[];
export type MaskedMatrix = readonly (readonly (number | null)[])[];

function freezeVector(values: readonly number[]): NumericVector {
  return Object.freeze([...values]);
}

function freezeMatrix(values: readonly (readonly number[])[]): NumericMatrix {
  return Object.freeze(values.map(freezeVector));
}

function freezeBooleanMatrix(values: readonly (readonly boolean[])[]): BooleanMatrix {
  return Object.freeze(values.map((row) => Object.freeze([...row])));
}

function freezeMaskedMatrix(values: readonly (readonly (number | null)[])[]): MaskedMatrix {
  return Object.freeze(values.map((row) => Object.freeze([...row])));
}

function deepFreeze<T>(value: T): T {
  if (value && typeof value === "object" && !Object.isFrozen(value)) {
    for (const nested of Object.values(value as Record<string, unknown>)) deepFreeze(nested);
    Object.freeze(value);
  }
  return value;
}

function assertFiniteVector(vector: readonly number[], label: string, length?: number) {
  if (!Array.isArray(vector) || vector.length === 0 || (length !== undefined && vector.length !== length)) {
    throw new Error(`${label} must contain ${length ?? "one or more"} values`);
  }
  vector.forEach((value, index) => {
    if (!Number.isFinite(value)) throw new Error(`${label} value ${index} must be finite`);
  });
}

function assertFiniteMatrix(
  matrix: readonly (readonly number[])[],
  label: string,
  rows?: number,
  columns?: number,
) {
  if (!Array.isArray(matrix) || matrix.length === 0 || (rows !== undefined && matrix.length !== rows)) {
    throw new Error(`${label} must contain ${rows ?? "one or more"} rows`);
  }
  const width = matrix[0]?.length ?? 0;
  if (width === 0 || (columns !== undefined && width !== columns)) {
    throw new Error(`${label} must contain ${columns ?? "one or more"} columns`);
  }
  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== width) {
      throw new Error(`${label} row ${rowIndex} must preserve rectangular shape`);
    }
    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value)) {
        throw new Error(`${label} row ${rowIndex} column ${columnIndex} must be finite`);
      }
    });
  });
}

function dot(left: NumericVector, right: NumericVector) {
  if (left.length !== right.length) throw new Error("Dot-product dimensions must match");
  const result = left.reduce((sum, value, index) => sum + value * right[index], 0);
  if (!Number.isFinite(result)) throw new Error("Dot product overflowed");
  return result;
}

function transpose(matrix: NumericMatrix): NumericMatrix {
  assertFiniteMatrix(matrix, "Transpose input");
  return freezeMatrix(matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex])));
}

function multiplyMatrices(left: NumericMatrix, right: NumericMatrix): NumericMatrix {
  assertFiniteMatrix(left, "Left matrix");
  assertFiniteMatrix(right, "Right matrix");
  if (left[0].length !== right.length) throw new Error("Matrix inner dimensions must align");
  const rightColumns = transpose(right);
  return freezeMatrix(left.map((row) => rightColumns.map((column) => dot(row, column))));
}

function addMatrices(left: NumericMatrix, right: NumericMatrix, label: string): NumericMatrix {
  assertFiniteMatrix(left, `${label} left`);
  assertFiniteMatrix(right, `${label} right`);
  if (left.length !== right.length || left.some((row, rowIndex) => row.length !== right[rowIndex]?.length)) {
    throw new Error(`${label} matrices must have identical shapes`);
  }
  return freezeMatrix(left.map((row, rowIndex) => (
    row.map((value, columnIndex) => value + right[rowIndex][columnIndex])
  )));
}

function scaleMatrix(matrix: NumericMatrix, scale: number): NumericMatrix {
  if (!Number.isFinite(scale)) throw new Error("Matrix scale must be finite");
  return freezeMatrix(matrix.map((row) => row.map((value) => value * scale)));
}

function matrixApproximatelyEqual(left: NumericMatrix, right: NumericMatrix, tolerance = 1e-10) {
  return left.length === right.length && left.every((row, rowIndex) => (
    row.length === right[rowIndex]?.length
    && row.every((value, columnIndex) => Math.abs(value - right[rowIndex][columnIndex]) <= tolerance)
  ));
}

function maxMatrixError(left: NumericMatrix, right: NumericMatrix) {
  if (left.length !== right.length || left.some((row, rowIndex) => row.length !== right[rowIndex]?.length)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, ...left.flatMap((row, rowIndex) => (
    row.map((value, columnIndex) => Math.abs(value - right[rowIndex][columnIndex]))
  )));
}

function stableMaskedSoftmax(row: readonly (number | null)[]): NumericVector {
  const allowed = row.flatMap((value) => value === null ? [] : [value]);
  if (allowed.length === 0) return freezeVector(row.map(() => 0));
  const maximum = Math.max(...allowed);
  const exponentials = row.map((value) => value === null ? 0 : Math.exp(value - maximum));
  const total = exponentials.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Masked softmax normalization failed");
  return freezeVector(exponentials.map((value) => value / total));
}

export function createSinusoidalPositionSignal(
  tokenCount: number,
  modelDimension: number,
): NumericMatrix {
  if (!Number.isInteger(tokenCount) || tokenCount < 1 || tokenCount > 128) {
    throw new Error("Position signal token count must be an integer between 1 and 128");
  }
  if (!Number.isInteger(modelDimension) || modelDimension < 2 || modelDimension % 2 !== 0) {
    throw new Error("Position signal model dimension must be a positive even integer");
  }
  return freezeMatrix(Array.from({ length: tokenCount }, (_, position) => (
    Array.from({ length: modelDimension }, (_, featureIndex) => {
      const pairIndex = Math.floor(featureIndex / 2);
      const denominator = 10_000 ** ((2 * pairIndex) / modelDimension);
      const angle = position / denominator;
      return featureIndex % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    })
  )));
}

const ffnW1 = [
  [0.5, -0.3, 0.2, 0, 0.4, -0.2],
  [-0.4, 0.6, 0, 0.3, -0.1, 0.2],
  [0.3, 0.1, -0.5, 0.4, 0.2, 0],
  [0, -0.2, 0.6, -0.3, 0.1, 0.5],
] as const;

const ffnB1 = [0.1, -0.1, 0.05, 0, 0.2, -0.05] as const;

const ffnW2 = [
  [0.4, -0.2, 0.1, 0],
  [-0.1, 0.5, 0, 0.2],
  [0.3, 0.1, -0.4, 0.2],
  [0, -0.3, 0.4, 0.1],
  [0.2, 0, 0.1, -0.5],
  [-0.2, 0.3, 0.2, 0.4],
] as const;

const ffnB2 = [0.02, -0.03, 0.01, 0.04] as const;

const fixturePositionSignal = createSinusoidalPositionSignal(
  TRANSFORMER_BLOCK_TOKEN_COUNT,
  TRANSFORMER_BLOCK_MODEL_DIMENSION,
);

export const transformerBlockTokens = Object.freeze([...selfAttentionTokens]);

export const transformerBlockFixture = deepFreeze({
  tokenEmbeddings: freezeMatrix(selfAttentionFixture.input),
  positionSignal: fixturePositionSignal,
  norm1Gamma: freezeVector([1, 1, 1, 1]),
  norm1Beta: freezeVector([0, 0, 0, 0]),
  norm2Gamma: freezeVector([1, 1, 1, 1]),
  norm2Beta: freezeVector([0, 0, 0, 0]),
  attentionWeights: {
    wq: freezeMatrix(selfAttentionFixture.wq),
    wk: freezeMatrix(selfAttentionFixture.wk),
    wv: freezeMatrix(selfAttentionFixture.wv),
    wo: freezeMatrix(selfAttentionFixture.wo),
  },
  queryActive: Object.freeze([...selfAttentionFixture.queryActive]),
  keyVisible: Object.freeze([...selfAttentionFixture.keyVisible]),
  ffn: {
    w1: freezeMatrix(ffnW1),
    b1: freezeVector(ffnB1),
    w2: freezeMatrix(ffnW2),
    b2: freezeVector(ffnB2),
  },
});

export type LayerNormRowTrace = Readonly<{
  tokenIndex: number;
  mean: number;
  variance: number;
  denominator: number;
  outputMean: number;
  outputVariance: number;
}>;

export type LayerNormTrace = Readonly<{
  axis: "feature";
  epsilon: number;
  input: NumericMatrix;
  gamma: NumericVector;
  beta: NumericVector;
  output: NumericMatrix;
  rows: readonly LayerNormRowTrace[];
}>;

function validateLayerNormEpsilon(epsilon: number) {
  if (!Number.isFinite(epsilon) || epsilon < 1e-8 || epsilon > 1e-2) {
    throw new Error("LayerNorm epsilon must be finite and between 1e-8 and 1e-2");
  }
}

export function layerNormRows(
  input: NumericMatrix,
  epsilon = TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
  gamma?: NumericVector,
  beta?: NumericVector,
): LayerNormTrace {
  assertFiniteMatrix(input, "LayerNorm input");
  validateLayerNormEpsilon(epsilon);
  const width = input[0].length;
  const resolvedGamma = gamma ?? Array.from({ length: width }, () => 1);
  const resolvedBeta = beta ?? Array.from({ length: width }, () => 0);
  assertFiniteVector(resolvedGamma, "LayerNorm gamma", width);
  assertFiniteVector(resolvedBeta, "LayerNorm beta", width);
  const rowStats = input.map((row, tokenIndex) => {
    const mean = row.reduce((sum, value) => sum + value, 0) / width;
    const variance = row.reduce((sum, value) => sum + (value - mean) ** 2, 0) / width;
    const denominator = Math.sqrt(variance + epsilon);
    if (!Number.isFinite(denominator) || denominator <= 0) {
      throw new Error(`LayerNorm row ${tokenIndex} denominator must be finite and positive`);
    }
    const output = row.map((value, featureIndex) => (
      ((value - mean) / denominator) * resolvedGamma[featureIndex] + resolvedBeta[featureIndex]
    ));
    const outputMean = output.reduce((sum, value) => sum + value, 0) / width;
    const outputVariance = output.reduce((sum, value) => sum + (value - outputMean) ** 2, 0) / width;
    return { tokenIndex, mean, variance, denominator, output, outputMean, outputVariance };
  });
  return deepFreeze({
    axis: "feature" as const,
    epsilon,
    input: freezeMatrix(input),
    gamma: freezeVector(resolvedGamma),
    beta: freezeVector(resolvedBeta),
    output: freezeMatrix(rowStats.map(({ output }) => output)),
    rows: rowStats.map(({ output: _output, ...stats }) => stats),
  });
}

type AttentionHeadTrace = Readonly<{
  headIndex: number;
  q: NumericMatrix;
  k: NumericMatrix;
  v: NumericMatrix;
  scores: NumericMatrix;
  allowed: BooleanMatrix;
  maskedScores: MaskedMatrix;
  weights: NumericMatrix;
  context: NumericMatrix;
  rowSums: NumericVector;
}>;

export type TransformerBlockAttentionTrace = Readonly<{
  provenance: Readonly<{
    source: "recomputed-self-attention";
    inputStage: "norm1" | "x0-bypassed-pre-norm";
    qkvWeights: "self-attention-fixture";
    scoreScale: "sqrt-head-dimension";
    causalMask: true;
    paddingKeyMask: true;
    inactiveQueryMask: true;
  }>;
  input: NumericMatrix;
  q: NumericMatrix;
  k: NumericMatrix;
  v: NumericMatrix;
  heads: readonly AttentionHeadTrace[];
  concatenated: NumericMatrix;
  output: NumericMatrix;
}>;

function splitHeads(matrix: NumericMatrix): readonly NumericMatrix[] {
  assertFiniteMatrix(matrix, "Head split input", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  return Object.freeze(Array.from({ length: TRANSFORMER_BLOCK_HEAD_COUNT }, (_, headIndex) => (
    freezeMatrix(matrix.map((row) => row.slice(
      headIndex * TRANSFORMER_BLOCK_HEAD_DIMENSION,
      (headIndex + 1) * TRANSFORMER_BLOCK_HEAD_DIMENSION,
    )))
  )));
}

function concatHeads(heads: readonly NumericMatrix[]): NumericMatrix {
  if (heads.length !== TRANSFORMER_BLOCK_HEAD_COUNT) throw new Error("Attention must preserve every head");
  heads.forEach((head, headIndex) => (
    assertFiniteMatrix(head, `Head ${headIndex}`, TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_HEAD_DIMENSION)
  ));
  return freezeMatrix(Array.from({ length: TRANSFORMER_BLOCK_TOKEN_COUNT }, (_, tokenIndex) => (
    heads.flatMap((head) => [...head[tokenIndex]])
  )));
}

function runBlockSelfAttention(input: NumericMatrix, preNormApplied: boolean): TransformerBlockAttentionTrace {
  assertFiniteMatrix(input, "Self-Attention input", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  const q = multiplyMatrices(input, transformerBlockFixture.attentionWeights.wq);
  const k = multiplyMatrices(input, transformerBlockFixture.attentionWeights.wk);
  const v = multiplyMatrices(input, transformerBlockFixture.attentionWeights.wv);
  const qHeads = splitHeads(q);
  const kHeads = splitHeads(k);
  const vHeads = splitHeads(v);
  const divisor = Math.sqrt(TRANSFORMER_BLOCK_HEAD_DIMENSION);
  const heads = qHeads.map((qHead, headIndex): AttentionHeadTrace => {
    const kHead = kHeads[headIndex];
    const vHead = vHeads[headIndex];
    const scores = multiplyMatrices(qHead, transpose(kHead));
    const allowed = freezeBooleanMatrix(Array.from({ length: TRANSFORMER_BLOCK_TOKEN_COUNT }, (_, queryIndex) => (
      Array.from({ length: TRANSFORMER_BLOCK_TOKEN_COUNT }, (_, keyIndex) => (
        transformerBlockFixture.queryActive[queryIndex]
        && transformerBlockFixture.keyVisible[keyIndex]
        && keyIndex <= queryIndex
      ))
    )));
    const maskedScores = freezeMaskedMatrix(scores.map((row, queryIndex) => (
      row.map((score, keyIndex) => allowed[queryIndex][keyIndex] ? score / divisor : null)
    )));
    const weights = freezeMatrix(maskedScores.map(stableMaskedSoftmax));
    const context = multiplyMatrices(weights, vHead);
    return deepFreeze({
      headIndex,
      q: qHead,
      k: kHead,
      v: vHead,
      scores,
      allowed,
      maskedScores,
      weights,
      context,
      rowSums: freezeVector(weights.map((row) => row.reduce((sum, value) => sum + value, 0))),
    });
  });
  const concatenated = concatHeads(heads.map(({ context }) => context));
  const output = multiplyMatrices(concatenated, transformerBlockFixture.attentionWeights.wo);
  return deepFreeze({
    provenance: {
      source: "recomputed-self-attention" as const,
      inputStage: preNormApplied ? "norm1" as const : "x0-bypassed-pre-norm" as const,
      qkvWeights: "self-attention-fixture" as const,
      scoreScale: "sqrt-head-dimension" as const,
      causalMask: true as const,
      paddingKeyMask: true as const,
      inactiveQueryMask: true as const,
    },
    input: freezeMatrix(input),
    q,
    k,
    v,
    heads,
    concatenated,
    output,
  });
}

export type PositionWiseFfnTrace = Readonly<{
  input: NumericMatrix;
  sharedAcrossTokens: boolean;
  activation: "relu" | "identity";
  hiddenPreActivation: NumericMatrix;
  hidden: NumericMatrix;
  output: NumericMatrix;
  rows: readonly Readonly<{
    tokenIndex: number;
    parameterSetIndex: number;
    activeUnitCount: number;
  }>[];
}>;

function runPositionWiseFfnInternal(
  input: NumericMatrix,
  sharedAcrossTokens: boolean,
  activation: "relu" | "identity" = "relu",
): PositionWiseFfnTrace {
  assertFiniteMatrix(input, "FFN input", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  const preActivation = input.map((row, tokenIndex) => {
    const parameterScale = sharedAcrossTokens ? 1 : 1 + tokenIndex * 0.15;
    return Array.from({ length: TRANSFORMER_BLOCK_FFN_DIMENSION }, (_, hiddenIndex) => (
      transformerBlockFixture.ffn.b1[hiddenIndex]
      + row.reduce((sum, value, featureIndex) => (
        sum + value * transformerBlockFixture.ffn.w1[featureIndex][hiddenIndex] * parameterScale
      ), 0)
    ));
  });
  const hidden = preActivation.map((row) => row.map((value) => (
    activation === "relu" ? Math.max(0, value) : value
  )));
  const output = hidden.map((row) => (
    Array.from({ length: TRANSFORMER_BLOCK_MODEL_DIMENSION }, (_, featureIndex) => (
      transformerBlockFixture.ffn.b2[featureIndex]
      + row.reduce((sum, value, hiddenIndex) => (
        sum + value * transformerBlockFixture.ffn.w2[hiddenIndex][featureIndex]
      ), 0)
    ))
  ));
  assertFiniteMatrix(output, "FFN output", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  return deepFreeze({
    input: freezeMatrix(input),
    sharedAcrossTokens,
    activation,
    hiddenPreActivation: freezeMatrix(preActivation),
    hidden: freezeMatrix(hidden),
    output: freezeMatrix(output),
    rows: hidden.map((row, tokenIndex) => ({
      tokenIndex,
      parameterSetIndex: sharedAcrossTokens ? 0 : tokenIndex,
      activeUnitCount: row.filter((value) => value > 0).length,
    })),
  });
}

export function runPositionWiseFfn(input: NumericMatrix): PositionWiseFfnTrace {
  return runPositionWiseFfnInternal(input, true, "relu");
}

export type TransformerBlockConfig = Readonly<{
  positionScale: number;
  preNorm: boolean;
  firstResidual: boolean;
  sharedFfn: boolean;
  secondResidual: boolean;
  layerNormEpsilon: number;
}>;

export const canonicalTransformerBlockConfig: TransformerBlockConfig = Object.freeze({
  positionScale: 1,
  preNorm: true,
  firstResidual: true,
  sharedFfn: true,
  secondResidual: true,
  layerNormEpsilon: TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
});

function validateTransformerBlockConfig(config: TransformerBlockConfig) {
  if (!config || typeof config !== "object") throw new Error("Transformer Block config is required");
  if (!Number.isFinite(config.positionScale) || config.positionScale < 0 || config.positionScale > 2) {
    throw new Error("Position scale must be finite and between 0 and 2");
  }
  if (
    typeof config.preNorm !== "boolean"
    || typeof config.firstResidual !== "boolean"
    || typeof config.sharedFfn !== "boolean"
    || typeof config.secondResidual !== "boolean"
  ) {
    throw new Error("Transformer Block switches must be boolean");
  }
  validateLayerNormEpsilon(config.layerNormEpsilon);
}

export type TransformerBlockTrace = Readonly<{
  config: TransformerBlockConfig;
  tokenEmbeddings: NumericMatrix;
  positionSignal: NumericMatrix;
  scaledPositionSignal: NumericMatrix;
  x0: NumericMatrix;
  norm1: LayerNormTrace;
  attention: TransformerBlockAttentionTrace;
  residual1: NumericMatrix;
  norm2: LayerNormTrace;
  ffn: PositionWiseFfnTrace;
  output: NumericMatrix;
  handoff: Readonly<{
    inputShape: readonly [number, number];
    outputShape: readonly [number, number];
    tokenAxisPreserved: boolean;
    featureAxisPreserved: boolean;
    preNormOrder: boolean;
    firstResidualApplied: boolean;
    secondResidualApplied: boolean;
    attentionSource: "norm1" | "x0-bypassed-pre-norm";
    nextStage: "mini-transformer";
  }>;
}>;

type BlockInputs = Readonly<{
  tokenEmbeddings: NumericMatrix;
  positionSignal: NumericMatrix;
}>;

function runTransformerBlockWithInputs(
  config: TransformerBlockConfig,
  inputs: BlockInputs,
): TransformerBlockTrace {
  validateTransformerBlockConfig(config);
  assertFiniteMatrix(inputs.tokenEmbeddings, "Token embeddings", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  assertFiniteMatrix(inputs.positionSignal, "Position signal", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  const scaledPositionSignal = scaleMatrix(inputs.positionSignal, config.positionScale);
  const x0 = addMatrices(inputs.tokenEmbeddings, scaledPositionSignal, "Position input");
  const norm1 = layerNormRows(
    x0,
    config.layerNormEpsilon,
    transformerBlockFixture.norm1Gamma,
    transformerBlockFixture.norm1Beta,
  );
  const attentionInput = config.preNorm ? norm1.output : x0;
  const attention = runBlockSelfAttention(attentionInput, config.preNorm);
  const residual1 = config.firstResidual
    ? addMatrices(x0, attention.output, "Attention residual")
    : freezeMatrix(attention.output);
  const norm2 = layerNormRows(
    residual1,
    config.layerNormEpsilon,
    transformerBlockFixture.norm2Gamma,
    transformerBlockFixture.norm2Beta,
  );
  const ffnInput = config.preNorm ? norm2.output : residual1;
  const ffn = runPositionWiseFfnInternal(ffnInput, config.sharedFfn, "relu");
  const output = config.secondResidual
    ? addMatrices(residual1, ffn.output, "FFN residual")
    : freezeMatrix(ffn.output);
  assertFiniteMatrix(output, "Transformer Block output", TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION);
  return deepFreeze({
    config: { ...config },
    tokenEmbeddings: freezeMatrix(inputs.tokenEmbeddings),
    positionSignal: freezeMatrix(inputs.positionSignal),
    scaledPositionSignal,
    x0,
    norm1,
    attention,
    residual1,
    norm2,
    ffn,
    output,
    handoff: {
      inputShape: [TRANSFORMER_BLOCK_TOKEN_COUNT, TRANSFORMER_BLOCK_MODEL_DIMENSION] as const,
      outputShape: [output.length, output[0]?.length ?? 0] as const,
      tokenAxisPreserved: output.length === TRANSFORMER_BLOCK_TOKEN_COUNT,
      featureAxisPreserved: output.every((row) => row.length === TRANSFORMER_BLOCK_MODEL_DIMENSION),
      preNormOrder: config.preNorm,
      firstResidualApplied: config.firstResidual,
      secondResidualApplied: config.secondResidual,
      attentionSource: attention.provenance.inputStage,
      nextStage: "mini-transformer" as const,
    },
  });
}

export function runTransformerBlock(
  config: TransformerBlockConfig = canonicalTransformerBlockConfig,
): TransformerBlockTrace {
  return runTransformerBlockWithInputs(config, transformerBlockFixture);
}

export type PositionWiseContractProbe = Readonly<{
  scope: "ffn-stage-only";
  permutation: readonly number[];
  permutationError: number;
  permutationEquivariant: boolean;
  changedTokenIndex: number;
  isolationLeak: number;
  tokenIndependent: boolean;
}>;

function permuteRows(matrix: NumericMatrix, permutation: readonly number[]): NumericMatrix {
  if (
    permutation.length !== matrix.length
    || new Set(permutation).size !== matrix.length
    || permutation.some((index) => !Number.isInteger(index) || index < 0 || index >= matrix.length)
  ) {
    throw new Error("Permutation must contain every row index exactly once");
  }
  return freezeMatrix(permutation.map((index) => matrix[index]));
}

export function probePositionWiseFfnContract(
  config: TransformerBlockConfig = canonicalTransformerBlockConfig,
): PositionWiseContractProbe {
  const trace = runTransformerBlock(config);
  const ffnInput = trace.ffn.input;
  const permutation = Object.freeze([2, 0, 3, 1]);
  const permutedInput = permuteRows(ffnInput, permutation);
  const permutedRun = runPositionWiseFfnInternal(permutedInput, config.sharedFfn, "relu");
  const expectedPermutedOutput = permuteRows(trace.ffn.output, permutation);
  const permutationError = maxMatrixError(permutedRun.output, expectedPermutedOutput);
  const changedTokenIndex = 1;
  const changedInput = ffnInput.map((row, tokenIndex) => (
    row.map((value, featureIndex) => tokenIndex === changedTokenIndex && featureIndex === 0 ? value + 0.75 : value)
  ));
  const changedRun = runPositionWiseFfnInternal(freezeMatrix(changedInput), config.sharedFfn, "relu");
  const isolationLeak = Math.max(0, ...trace.ffn.output.flatMap((row, tokenIndex) => (
    tokenIndex === changedTokenIndex
      ? []
      : row.map((value, featureIndex) => Math.abs(value - changedRun.output[tokenIndex][featureIndex]))
  )));
  return deepFreeze({
    scope: "ffn-stage-only" as const,
    permutation,
    permutationError,
    permutationEquivariant: permutationError <= 1e-10,
    changedTokenIndex,
    isolationLeak,
    tokenIndependent: isolationLeak <= 1e-10,
  });
}

export type TransformerBlockChallengeId =
  | "position-input"
  | "layernorm"
  | "attention-residual"
  | "positionwise-ffn"
  | "block-handoff";

export type TransformerBlockPrediction =
  | "position-added-before-attention"
  | "position-added-after-output"
  | "position-omitted"
  | "feature-axis-centered-with-epsilon"
  | "token-axis-normalized"
  | "epsilon-unnecessary"
  | "attention-update-adds-to-x0"
  | "attention-replaces-x0"
  | "norm1-is-residual-base"
  | "shared-rowwise-relu-permutation-equivariant"
  | "one-ffn-per-position"
  | "ffn-mixes-token-rows"
  | "second-skip-preserves-tokens-and-width"
  | "ffn-output-replaces-stream"
  | "token-axis-concatenates";

export type TransformerBlockInspectStage =
  | "position-input"
  | "norm1"
  | "residual1"
  | "ffn"
  | "output";

export type TransformerBlockInspection = Readonly<{
  stage: TransformerBlockInspectStage;
  tokenIndex: number;
  featureIndex: number;
}>;

export const transformerBlockChallengeIds = Object.freeze([
  "position-input",
  "layernorm",
  "attention-residual",
  "positionwise-ffn",
  "block-handoff",
] as const) satisfies readonly TransformerBlockChallengeId[];

export const transformerBlockCoreChallengeIds = deepFreeze([
  "layernorm",
  "positionwise-ffn",
  "block-handoff",
] as const) satisfies readonly TransformerBlockChallengeId[];

export const transformerBlockPredictions = Object.freeze([
  "position-added-before-attention",
  "position-added-after-output",
  "position-omitted",
  "feature-axis-centered-with-epsilon",
  "token-axis-normalized",
  "epsilon-unnecessary",
  "attention-update-adds-to-x0",
  "attention-replaces-x0",
  "norm1-is-residual-base",
  "shared-rowwise-relu-permutation-equivariant",
  "one-ffn-per-position",
  "ffn-mixes-token-rows",
  "second-skip-preserves-tokens-and-width",
  "ffn-output-replaces-stream",
  "token-axis-concatenates",
] as const) satisfies readonly TransformerBlockPrediction[];

const expectedPredictions: Readonly<Record<TransformerBlockChallengeId, TransformerBlockPrediction>> = Object.freeze({
  "position-input": "position-added-before-attention",
  layernorm: "feature-axis-centered-with-epsilon",
  "attention-residual": "attention-update-adds-to-x0",
  "positionwise-ffn": "shared-rowwise-relu-permutation-equivariant",
  "block-handoff": "second-skip-preserves-tokens-and-width",
});

const requiredInspections: Readonly<Record<TransformerBlockChallengeId, TransformerBlockInspection>> = deepFreeze({
  "position-input": { stage: "position-input", tokenIndex: 1, featureIndex: 0 },
  layernorm: { stage: "norm1", tokenIndex: 1, featureIndex: 2 },
  "attention-residual": { stage: "residual1", tokenIndex: 1, featureIndex: 0 },
  "positionwise-ffn": { stage: "ffn", tokenIndex: 2, featureIndex: 1 },
  "block-handoff": { stage: "output", tokenIndex: 2, featureIndex: 0 },
});

export const transformerBlockChallengeRequirements = deepFreeze(Object.fromEntries(
  transformerBlockChallengeIds.map((challengeId) => [challengeId, {
    expectedPrediction: expectedPredictions[challengeId],
    canonicalConfig: { ...canonicalTransformerBlockConfig },
    requiredInspection: requiredInspections[challengeId],
  }]),
) as Record<TransformerBlockChallengeId, {
  expectedPrediction: TransformerBlockPrediction;
  canonicalConfig: TransformerBlockConfig;
  requiredInspection: TransformerBlockInspection;
}>);

export const transformerBlockChallengeDefaults: Readonly<Record<TransformerBlockChallengeId, TransformerBlockConfig>> = deepFreeze({
  "position-input": { ...canonicalTransformerBlockConfig, positionScale: 0 },
  layernorm: { ...canonicalTransformerBlockConfig, preNorm: false },
  "attention-residual": { ...canonicalTransformerBlockConfig, firstResidual: false },
  "positionwise-ffn": { ...canonicalTransformerBlockConfig, sharedFfn: false },
  "block-handoff": { ...canonicalTransformerBlockConfig, secondResidual: false },
});

function configsEqual(left: TransformerBlockConfig, right: TransformerBlockConfig) {
  return left.positionScale === right.positionScale
    && left.preNorm === right.preNorm
    && left.firstResidual === right.firstResidual
    && left.sharedFfn === right.sharedFfn
    && left.secondResidual === right.secondResidual
    && left.layerNormEpsilon === right.layerNormEpsilon;
}

export type TransformerBlockChallengeGrade = Readonly<{
  correct: boolean;
  predictionCorrect: boolean;
  configCorrect: boolean;
  semanticCorrect: boolean;
  observed: Readonly<{
    positionError: number;
    maxNormRowMean: number;
    maxNormVarianceContractError: number;
    attentionResidualError: number;
    ffnPermutationError: number;
    ffnIsolationLeak: number;
    secondResidualError: number;
    outputShape: readonly [number, number];
  }>;
}>;

function normVarianceContractError(trace: LayerNormTrace) {
  return Math.max(...trace.rows.map((row) => Math.abs(
    row.outputVariance - row.variance / (row.variance + trace.epsilon)
  )));
}

export function gradeTransformerBlockChallenge(
  challengeId: TransformerBlockChallengeId,
  prediction: TransformerBlockPrediction,
  config: TransformerBlockConfig,
): TransformerBlockChallengeGrade {
  if (!transformerBlockChallengeIds.includes(challengeId)) {
    throw new Error(`Unknown Transformer Block challenge: ${challengeId as string}`);
  }
  if (!transformerBlockPredictions.includes(prediction)) {
    throw new Error(`Unknown Transformer Block prediction: ${prediction as string}`);
  }
  const trace = runTransformerBlock(config);
  const expectedX0 = addMatrices(
    transformerBlockFixture.tokenEmbeddings,
    transformerBlockFixture.positionSignal,
    "Expected position input",
  );
  const expectedResidual1 = addMatrices(trace.x0, trace.attention.output, "Expected attention residual");
  const expectedOutput = addMatrices(trace.residual1, trace.ffn.output, "Expected FFN residual");
  const ffnContract = probePositionWiseFfnContract(config);
  const observed = deepFreeze({
    positionError: maxMatrixError(trace.x0, expectedX0),
    maxNormRowMean: Math.max(...trace.norm1.rows.map(({ outputMean }) => Math.abs(outputMean))),
    maxNormVarianceContractError: normVarianceContractError(trace.norm1),
    attentionResidualError: maxMatrixError(trace.residual1, expectedResidual1),
    ffnPermutationError: ffnContract.permutationError,
    ffnIsolationLeak: ffnContract.isolationLeak,
    secondResidualError: maxMatrixError(trace.output, expectedOutput),
    outputShape: [trace.output.length, trace.output[0]?.length ?? 0] as const,
  });
  const semanticCorrect = challengeId === "position-input"
    ? observed.positionError <= 1e-10 && trace.attention.provenance.inputStage === "norm1"
    : challengeId === "layernorm"
      ? trace.config.preNorm
        && trace.attention.provenance.inputStage === "norm1"
        && observed.maxNormRowMean <= 1e-10
        && observed.maxNormVarianceContractError <= 1e-10
      : challengeId === "attention-residual"
        ? observed.attentionResidualError <= 1e-10 && trace.handoff.firstResidualApplied
        : challengeId === "positionwise-ffn"
          ? trace.ffn.activation === "relu"
            && trace.ffn.sharedAcrossTokens
            && observed.ffnPermutationError <= 1e-10
            && observed.ffnIsolationLeak <= 1e-10
          : observed.secondResidualError <= 1e-10
            && trace.handoff.secondResidualApplied
            && trace.handoff.tokenAxisPreserved
            && trace.handoff.featureAxisPreserved;
  const predictionCorrect = prediction === expectedPredictions[challengeId];
  const configCorrect = configsEqual(config, canonicalTransformerBlockConfig);
  return deepFreeze({
    correct: predictionCorrect && configCorrect && semanticCorrect,
    predictionCorrect,
    configCorrect,
    semanticCorrect,
    observed,
  });
}

function validIndex(value: unknown, size: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < size;
}

export function isValidTransformerBlockInspection(
  challengeId: TransformerBlockChallengeId,
  config: TransformerBlockConfig,
  inspection: TransformerBlockInspection,
) {
  if (!transformerBlockChallengeIds.includes(challengeId)) return false;
  if (
    !inspection
    || inspection.stage !== requiredInspections[challengeId].stage
    || !validIndex(inspection.tokenIndex, TRANSFORMER_BLOCK_TOKEN_COUNT)
    || !validIndex(inspection.featureIndex, TRANSFORMER_BLOCK_MODEL_DIMENSION)
  ) return false;
  const required = requiredInspections[challengeId];
  if (inspection.tokenIndex !== required.tokenIndex || inspection.featureIndex !== required.featureIndex) return false;
  const trace = runTransformerBlock(config);
  const { tokenIndex, featureIndex } = inspection;
  if (challengeId === "position-input") {
    const signal = trace.scaledPositionSignal[tokenIndex][featureIndex];
    return Math.abs(signal) > 1e-8
      && Math.abs(trace.x0[tokenIndex][featureIndex] - trace.tokenEmbeddings[tokenIndex][featureIndex] - signal) <= 1e-10
      && trace.attention.provenance.inputStage === "norm1";
  }
  if (challengeId === "layernorm") {
    const row = trace.norm1.rows[tokenIndex];
    return trace.config.preNorm
      && trace.attention.provenance.inputStage === "norm1"
      && trace.norm1.axis === "feature"
      && trace.norm1.epsilon === TRANSFORMER_BLOCK_LAYER_NORM_EPSILON
      && Math.abs(row.outputMean) <= 1e-10
      && Math.abs(row.outputVariance - row.variance / (row.variance + trace.norm1.epsilon)) <= 1e-10
      && Number.isFinite(trace.norm1.output[tokenIndex][featureIndex]);
  }
  if (challengeId === "attention-residual") {
    const expected = trace.x0[tokenIndex][featureIndex] + trace.attention.output[tokenIndex][featureIndex];
    return trace.handoff.firstResidualApplied
      && Math.abs(trace.residual1[tokenIndex][featureIndex] - expected) <= 1e-10
      && Math.abs(trace.attention.output[tokenIndex][featureIndex]) > 1e-8;
  }
  if (challengeId === "positionwise-ffn") {
    const contract = probePositionWiseFfnContract(config);
    return trace.ffn.sharedAcrossTokens
      && trace.ffn.activation === "relu"
      && trace.ffn.rows[tokenIndex].activeUnitCount > 0
      && Number.isFinite(trace.ffn.output[tokenIndex][featureIndex])
      && contract.permutationEquivariant
      && contract.tokenIndependent;
  }
  const expected = trace.residual1[tokenIndex][featureIndex] + trace.ffn.output[tokenIndex][featureIndex];
  return trace.handoff.secondResidualApplied
    && trace.handoff.outputShape[0] === TRANSFORMER_BLOCK_TOKEN_COUNT
    && trace.handoff.outputShape[1] === TRANSFORMER_BLOCK_MODEL_DIMENSION
    && Math.abs(trace.output[tokenIndex][featureIndex] - expected) <= 1e-10
    && Math.abs(trace.ffn.output[tokenIndex][featureIndex]) > 1e-8;
}

type EvidenceBase = Readonly<{
  eventId: string;
  attemptId: string;
  challengeId: TransformerBlockChallengeId;
  config: TransformerBlockConfig;
}>;

export type TransformerBlockLabEvidenceEvent =
  | (EvidenceBase & Readonly<{ kind: "prediction"; prediction: TransformerBlockPrediction }>)
  | (EvidenceBase & Readonly<{ kind: "run" }>)
  | (EvidenceBase & Readonly<{
      kind: "inspect";
      stage: TransformerBlockInspectStage;
      tokenIndex: number;
      featureIndex: number;
    }>);

export type TransformerBlockLabEvidence = Readonly<{
  events: readonly TransformerBlockLabEvidenceEvent[];
}>;

export const emptyTransformerBlockLabEvidence: TransformerBlockLabEvidence = Object.freeze({
  events: Object.freeze([]),
});

export type TransformerBlockLabMastery = Readonly<{
  mastered: boolean;
  reason: "mastered" | "invalid-evidence" | "complete-core-challenges";
  completedChallengeIds: readonly TransformerBlockChallengeId[];
}>;

type AttemptState = {
  challengeId: TransformerBlockChallengeId;
  config: TransformerBlockConfig;
  prediction: TransformerBlockPrediction;
  phase: "predicted" | "ran" | "inspected";
  correct: boolean;
};

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function masteryResult(
  reason: TransformerBlockLabMastery["reason"],
  completed: ReadonlySet<TransformerBlockChallengeId>,
): TransformerBlockLabMastery {
  return deepFreeze({
    mastered: reason === "mastered",
    reason,
    completedChallengeIds: transformerBlockChallengeIds.filter((id) => completed.has(id)),
  });
}

export function evaluateTransformerBlockLabMastery(
  evidence: TransformerBlockLabEvidence,
): TransformerBlockLabMastery {
  const completed = new Set<TransformerBlockChallengeId>();
  if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.events)) {
    return masteryResult("invalid-evidence", completed);
  }
  const eventIds = new Set<string>();
  const attempts = new Map<string, AttemptState>();
  for (const rawEvent of evidence.events as readonly unknown[]) {
    if (!rawEvent || typeof rawEvent !== "object") return masteryResult("invalid-evidence", completed);
    const event = rawEvent as Partial<TransformerBlockLabEvidenceEvent>;
    if (
      !validId(event.eventId)
      || eventIds.has(event.eventId)
      || !validId(event.attemptId)
      || !event.challengeId
      || !transformerBlockChallengeIds.includes(event.challengeId)
      || !event.config
    ) return masteryResult("invalid-evidence", completed);
    eventIds.add(event.eventId);
    try { runTransformerBlock(event.config); } catch { return masteryResult("invalid-evidence", completed); }
    if (event.kind === "prediction") {
      if (
        !event.prediction
        || !transformerBlockPredictions.includes(event.prediction)
        || attempts.has(event.attemptId)
      ) return masteryResult("invalid-evidence", completed);
      attempts.set(event.attemptId, {
        challengeId: event.challengeId,
        config: { ...event.config },
        prediction: event.prediction,
        phase: "predicted",
        correct: false,
      });
      continue;
    }
    const attempt = attempts.get(event.attemptId);
    if (
      !attempt
      || attempt.challengeId !== event.challengeId
      || !configsEqual(attempt.config, event.config)
    ) return masteryResult("invalid-evidence", completed);
    if (event.kind === "run") {
      if (attempt.phase !== "predicted") return masteryResult("invalid-evidence", completed);
      attempt.phase = "ran";
      attempt.correct = gradeTransformerBlockChallenge(
        attempt.challengeId,
        attempt.prediction,
        attempt.config,
      ).correct;
      continue;
    }
    if (event.kind === "inspect") {
      if (
        attempt.phase !== "ran"
        || !attempt.correct
        || !event.stage
        || !validIndex(event.tokenIndex, TRANSFORMER_BLOCK_TOKEN_COUNT)
        || !validIndex(event.featureIndex, TRANSFORMER_BLOCK_MODEL_DIMENSION)
        || !isValidTransformerBlockInspection(event.challengeId, attempt.config, {
          stage: event.stage,
          tokenIndex: event.tokenIndex,
          featureIndex: event.featureIndex,
        })
      ) return masteryResult("invalid-evidence", completed);
      attempt.phase = "inspected";
      completed.add(event.challengeId);
      continue;
    }
    return masteryResult("invalid-evidence", completed);
  }
  return transformerBlockCoreChallengeIds.every((challengeId) => completed.has(challengeId))
    ? masteryResult("mastered", completed)
    : masteryResult("complete-core-challenges", completed);
}

export type TransformerBlockDebuggerScenarioId =
  | "position-placement"
  | "layernorm-contract"
  | "attention-residual"
  | "ffn-second-skip";

export type TransformerBlockRepair =
  | "add-position-before-norm1"
  | "omit-position-signal"
  | "add-position-after-block"
  | "feature-axis-with-epsilon"
  | "token-axis-with-epsilon"
  | "feature-axis-no-epsilon"
  | "add-x0-to-attention"
  | "replace-x0-with-attention"
  | "add-norm1-to-attention"
  | "shared-rowwise-relu-plus-second-skip"
  | "per-position-parameters-plus-skip"
  | "shared-rowwise-relu-replace"
  | "shared-rowwise-linear-plus-second-skip";

export type TransformerBlockDebuggerOption = Readonly<{
  id: TransformerBlockRepair;
  labelKo: string;
  labelEn: string;
}>;

export type TransformerBlockDebuggerScenario = Readonly<{
  id: TransformerBlockDebuggerScenarioId;
  labelKo: string;
  labelEn: string;
  options: readonly TransformerBlockDebuggerOption[];
}>;

function repair(id: TransformerBlockRepair, labelKo: string, labelEn: string): TransformerBlockDebuggerOption {
  return Object.freeze({ id, labelKo, labelEn });
}

export const transformerBlockDebuggerScenarioIds = Object.freeze([
  "position-placement",
  "layernorm-contract",
  "attention-residual",
  "ffn-second-skip",
] as const) satisfies readonly TransformerBlockDebuggerScenarioId[];

export const transformerBlockDebuggerScenarios = deepFreeze({
  "position-placement": {
    id: "position-placement",
    labelKo: "position 신호 배치",
    labelEn: "Position signal placement",
    options: [
      repair("add-position-before-norm1", "embedding에 position을 더한 뒤 norm1", "Add position to embeddings before norm1"),
      repair("omit-position-signal", "position 신호 생략", "Omit the position signal"),
      repair("add-position-after-block", "block 출력 뒤 position 추가", "Add position after the block"),
    ],
  },
  "layernorm-contract": {
    id: "layernorm-contract",
    labelKo: "LayerNorm 축과 epsilon",
    labelEn: "LayerNorm axis and epsilon",
    options: [
      repair("token-axis-with-epsilon", "feature별 token축 정규화", "Normalize the token axis per feature"),
      repair("feature-axis-no-epsilon", "token별 feature축, epsilon 제거", "Feature axis per token without epsilon"),
      repair("feature-axis-with-epsilon", "token별 feature축, epsilon 포함", "Feature axis per token with epsilon"),
    ],
  },
  "attention-residual": {
    id: "attention-residual",
    labelKo: "Attention residual 기준",
    labelEn: "Attention residual base",
    options: [
      repair("replace-x0-with-attention", "x0를 Attention 출력으로 교체", "Replace x0 with the Attention output"),
      repair("add-norm1-to-attention", "norm1에 Attention 출력 더하기", "Add the Attention output to norm1"),
      repair("add-x0-to-attention", "x0에 Attention 출력 더하기", "Add the Attention output to x0"),
    ],
  },
  "ffn-second-skip": {
    id: "ffn-second-skip",
    labelKo: "position-wise FFN과 두 번째 skip",
    labelEn: "Position-wise FFN and second skip",
    options: [
      repair("per-position-parameters-plus-skip", "position마다 다른 FFN 뒤 skip", "Use per-position FFN parameters, then add the skip"),
      repair("shared-rowwise-relu-replace", "공유 row-wise ReLU FFN으로 stream 교체", "Replace the stream with the shared row-wise ReLU FFN"),
      repair("shared-rowwise-linear-plus-second-skip", "ReLU 없이 공유 2층 FFN 뒤 skip", "Use a shared two-layer FFN without ReLU, then add the skip"),
      repair("shared-rowwise-relu-plus-second-skip", "공유 row-wise ReLU FFN 뒤 두 번째 skip", "Use a shared row-wise ReLU FFN, then add the second skip"),
    ],
  },
}) satisfies Readonly<Record<TransformerBlockDebuggerScenarioId, TransformerBlockDebuggerScenario>>;

export type TransformerBlockRepairReason =
  | "contract-restored"
  | "position-missing"
  | "position-added-too-late"
  | "wrong-normalization-axis"
  | "epsilon-removed"
  | "input-skip-dropped"
  | "normalized-skip-used"
  | "position-specific-parameters"
  | "second-skip-dropped"
  | "relu-bypassed";

export type TransformerBlockDebuggerMetrics = Readonly<{
  positionInputError: number;
  positionOutputError: number;
  maxRowMean: number;
  maxVarianceContractError: number;
  epsilon: number;
  minimumStabilityDenominator: number;
  nonFiniteStabilityValues: number;
  firstResidualError: number;
  ffnPermutationError: number;
  ffnIsolationLeak: number;
  secondResidualError: number;
  negativeHiddenCount: number;
  outputRows: number;
  outputColumns: number;
}>;

export type TransformerBlockRepairResult = Readonly<{
  scenarioId: TransformerBlockDebuggerScenarioId;
  repair: TransformerBlockRepair;
  correct: boolean;
  reason: TransformerBlockRepairReason;
  metrics: TransformerBlockDebuggerMetrics;
}>;

function repairInScenario(
  scenarioId: TransformerBlockDebuggerScenarioId,
  candidate: TransformerBlockRepair,
) {
  return transformerBlockDebuggerScenarios[scenarioId].options.some(({ id }) => id === candidate);
}

function tokenAxisLayerNorm(input: NumericMatrix, epsilon: number): NumericMatrix {
  assertFiniteMatrix(input, "Token-axis LayerNorm input");
  return freezeMatrix(input.map((row) => row.map((value, featureIndex) => {
    const column = input.map((candidate) => candidate[featureIndex]);
    const mean = column.reduce((sum, candidate) => sum + candidate, 0) / column.length;
    const variance = column.reduce((sum, candidate) => sum + (candidate - mean) ** 2, 0) / column.length;
    const denominator = Math.sqrt(variance + epsilon);
    return (value - mean) / denominator;
  })));
}

function debuggerMetrics(overrides: Partial<TransformerBlockDebuggerMetrics>): TransformerBlockDebuggerMetrics {
  return deepFreeze({
    positionInputError: 0,
    positionOutputError: 0,
    maxRowMean: 0,
    maxVarianceContractError: 0,
    epsilon: TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
    minimumStabilityDenominator: Math.sqrt(TRANSFORMER_BLOCK_LAYER_NORM_EPSILON),
    nonFiniteStabilityValues: 0,
    firstResidualError: 0,
    ffnPermutationError: 0,
    ffnIsolationLeak: 0,
    secondResidualError: 0,
    negativeHiddenCount: 0,
    outputRows: TRANSFORMER_BLOCK_TOKEN_COUNT,
    outputColumns: TRANSFORMER_BLOCK_MODEL_DIMENSION,
    ...overrides,
  });
}

export function evaluateTransformerBlockRepair(
  scenarioId: TransformerBlockDebuggerScenarioId,
  candidate: TransformerBlockRepair,
): TransformerBlockRepairResult {
  if (!transformerBlockDebuggerScenarioIds.includes(scenarioId)) {
    throw new Error(`Unknown Transformer Block debugger scenario: ${scenarioId as string}`);
  }
  if (!repairInScenario(scenarioId, candidate)) {
    throw new Error(`Repair ${candidate} does not belong to ${scenarioId}`);
  }
  const canonical = runTransformerBlock();
  let correct = false;
  let reason: TransformerBlockRepairReason;
  let metrics: TransformerBlockDebuggerMetrics;

  if (scenarioId === "position-placement") {
    const withoutPosition = runTransformerBlock({
      ...canonicalTransformerBlockConfig,
      positionScale: 0,
    });
    const candidateTrace = candidate === "add-position-before-norm1"
      ? canonical
      : withoutPosition;
    const candidateOutput = candidate === "add-position-after-block"
      ? addMatrices(
          withoutPosition.output,
          transformerBlockFixture.positionSignal,
          "Position added after block output",
        )
      : candidateTrace.output;
    const positionInputError = maxMatrixError(candidateTrace.x0, canonical.x0);
    const positionOutputError = maxMatrixError(candidateOutput, canonical.output);
    correct = candidate === "add-position-before-norm1"
      && positionInputError <= 1e-10
      && positionOutputError <= 1e-10;
    reason = correct
      ? "contract-restored"
      : candidate === "omit-position-signal"
        ? "position-missing"
        : "position-added-too-late";
    metrics = debuggerMetrics({ positionInputError, positionOutputError });
  } else if (scenarioId === "layernorm-contract") {
    const epsilon = candidate === "feature-axis-no-epsilon" ? 0 : TRANSFORMER_BLOCK_LAYER_NORM_EPSILON;
    const stabilityProbe = Object.freeze([
      Object.freeze([2, 2, 2, 2]),
      Object.freeze([1, 1 + 1e-7, 1, 1 - 1e-7]),
    ]);
    const stability = stabilityProbe.map((row) => {
      const mean = row.reduce((sum, value) => sum + value, 0) / row.length;
      const variance = row.reduce((sum, value) => sum + (value - mean) ** 2, 0) / row.length;
      const denominator = Math.sqrt(variance + epsilon);
      const output = row.map((value) => (value - mean) / denominator);
      return { denominator, output };
    });
    const minimumStabilityDenominator = Math.min(...stability.map(({ denominator }) => denominator));
    const nonFiniteStabilityValues = stability.flatMap(({ output }) => output)
      .filter((value) => !Number.isFinite(value)).length;
    const normalized = candidate === "token-axis-with-epsilon"
      ? tokenAxisLayerNorm(canonical.x0, epsilon)
      : epsilon === 0
        ? freezeMatrix(canonical.x0.map((row) => {
            const mean = row.reduce((sum, value) => sum + value, 0) / row.length;
            const variance = row.reduce((sum, value) => sum + (value - mean) ** 2, 0) / row.length;
            return row.map((value) => (value - mean) / Math.sqrt(variance));
          }))
        : canonical.norm1.output;
    const maxRowMean = Math.max(...normalized.map((row) => Math.abs(
      row.reduce((sum, value) => sum + value, 0) / row.length
    )));
    const maxVarianceContractError = Math.max(...normalized.map((row, tokenIndex) => {
      const inputRow = canonical.x0[tokenIndex];
      const inputMean = inputRow.reduce((sum, value) => sum + value, 0) / inputRow.length;
      const inputVariance = inputRow.reduce(
        (sum, value) => sum + (value - inputMean) ** 2,
        0,
      ) / inputRow.length;
      const outputMean = row.reduce((sum, value) => sum + value, 0) / row.length;
      const outputVariance = row.reduce(
        (sum, value) => sum + (value - outputMean) ** 2,
        0,
      ) / row.length;
      const expectedVariance = inputVariance
        / (inputVariance + TRANSFORMER_BLOCK_LAYER_NORM_EPSILON);
      return Math.abs(outputVariance - expectedVariance);
    }));
    correct = epsilon > 0
      && minimumStabilityDenominator > 0
      && nonFiniteStabilityValues === 0
      && maxRowMean <= 1e-10
      && maxVarianceContractError <= 1e-10;
    reason = correct
      ? "contract-restored"
      : candidate === "token-axis-with-epsilon"
        ? "wrong-normalization-axis"
        : "epsilon-removed";
    metrics = debuggerMetrics({
      epsilon,
      minimumStabilityDenominator,
      nonFiniteStabilityValues,
      maxRowMean,
      maxVarianceContractError,
    });
  } else if (scenarioId === "attention-residual") {
    const candidateResidual = candidate === "add-x0-to-attention"
      ? addMatrices(canonical.x0, canonical.attention.output, "Candidate attention residual")
      : candidate === "add-norm1-to-attention"
        ? addMatrices(canonical.norm1.output, canonical.attention.output, "Normalized attention residual")
        : canonical.attention.output;
    const firstResidualError = maxMatrixError(candidateResidual, canonical.residual1);
    correct = firstResidualError <= 1e-10;
    reason = correct
      ? "contract-restored"
      : candidate === "replace-x0-with-attention"
        ? "input-skip-dropped"
        : "normalized-skip-used";
    metrics = debuggerMetrics({ firstResidualError });
  } else {
    const shared = candidate !== "per-position-parameters-plus-skip";
    const activation = candidate === "shared-rowwise-linear-plus-second-skip" ? "identity" : "relu";
    const candidateFfn = runPositionWiseFfnInternal(canonical.norm2.output, shared, activation);
    const output = candidate === "shared-rowwise-relu-replace"
      ? candidateFfn.output
      : addMatrices(canonical.residual1, candidateFfn.output, "Candidate FFN residual");
    const permutation = Object.freeze([2, 0, 3, 1]);
    const permutedInput = permuteRows(canonical.norm2.output, permutation);
    const permutedFfn = runPositionWiseFfnInternal(permutedInput, shared, activation);
    const ffnPermutationError = maxMatrixError(
      permutedFfn.output,
      permuteRows(candidateFfn.output, permutation),
    );
    const changed = freezeMatrix(canonical.norm2.output.map((row, tokenIndex) => (
      row.map((value, featureIndex) => tokenIndex === 1 && featureIndex === 0 ? value + 0.5 : value)
    )));
    const changedFfn = runPositionWiseFfnInternal(changed, shared, activation);
    const ffnIsolationLeak = Math.max(0, ...candidateFfn.output.flatMap((row, tokenIndex) => (
      tokenIndex === 1 ? [] : row.map((value, featureIndex) => (
        Math.abs(value - changedFfn.output[tokenIndex][featureIndex])
      ))
    )));
    const expectedOutput = addMatrices(canonical.residual1, candidateFfn.output, "Expected candidate second residual");
    const secondResidualError = maxMatrixError(output, expectedOutput);
    const negativeHiddenCount = candidateFfn.hidden.reduce(
      (count, row) => count + row.filter((value) => value < 0).length,
      0,
    );
    const sharedParameterSet = candidateFfn.rows.every(({ parameterSetIndex }) => parameterSetIndex === 0);
    correct = sharedParameterSet
      && negativeHiddenCount === 0
      && ffnPermutationError <= 1e-10
      && ffnIsolationLeak <= 1e-10
      && secondResidualError <= 1e-10;
    reason = correct
      ? "contract-restored"
      : !shared
        ? "position-specific-parameters"
        : secondResidualError > 1e-10
          ? "second-skip-dropped"
          : "relu-bypassed";
    metrics = debuggerMetrics({
      ffnPermutationError,
      ffnIsolationLeak,
      secondResidualError,
      negativeHiddenCount,
      outputRows: output.length,
      outputColumns: output[0]?.length ?? 0,
    });
  }
  return deepFreeze({ scenarioId, repair: candidate, correct, reason, metrics });
}

export function canCompleteTransformerBlockChapter({
  labComplete,
  conceptsMastered,
}: {
  labComplete: boolean;
  debuggerComplete?: boolean;
  conceptsMastered: boolean;
}) {
  return labComplete && conceptsMastered;
}

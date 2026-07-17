import {
  TRANSFORMER_BLOCK_FFN_DIMENSION,
  TRANSFORMER_BLOCK_HEAD_COUNT,
  TRANSFORMER_BLOCK_HEAD_DIMENSION,
  TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
  TRANSFORMER_BLOCK_MODEL_DIMENSION,
  createSinusoidalPositionSignal,
  layerNormRows,
  transformerBlockFixture,
  type LayerNormTrace,
} from "../transformer-block/transformer-block-model.ts";

export const MINI_TRANSFORMER_MODEL_DIMENSION = TRANSFORMER_BLOCK_MODEL_DIMENSION;
export const MINI_TRANSFORMER_HEAD_COUNT = TRANSFORMER_BLOCK_HEAD_COUNT;
export const MINI_TRANSFORMER_HEAD_DIMENSION = TRANSFORMER_BLOCK_HEAD_DIMENSION;
export const MINI_TRANSFORMER_FFN_DIMENSION = TRANSFORMER_BLOCK_FFN_DIMENSION;
export const MINI_TRANSFORMER_MAX_CONTEXT = 8;
export const MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS = 5;

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
      if (!Number.isFinite(value)) throw new Error(`${label} row ${rowIndex} column ${columnIndex} must be finite`);
    });
  });
}

function transpose(matrix: NumericMatrix): NumericMatrix {
  assertFiniteMatrix(matrix, "Transpose input");
  return freezeMatrix(matrix[0].map((_, columnIndex) => matrix.map((row) => row[columnIndex])));
}

function dot(left: NumericVector, right: NumericVector) {
  if (left.length !== right.length) throw new Error("Dot-product dimensions must match");
  const result = left.reduce((sum, value, index) => sum + value * right[index], 0);
  if (!Number.isFinite(result)) throw new Error("Dot product overflowed");
  return result;
}

function multiplyMatrices(left: NumericMatrix, right: NumericMatrix): NumericMatrix {
  assertFiniteMatrix(left, "Left matrix");
  assertFiniteMatrix(right, "Right matrix");
  if (left[0].length !== right.length) throw new Error("Matrix inner dimensions must align");
  const columns = transpose(right);
  return freezeMatrix(left.map((row) => columns.map((column) => dot(row, column))));
}

function addMatrices(left: NumericMatrix, right: NumericMatrix, label: string): NumericMatrix {
  assertFiniteMatrix(left, `${label} left`);
  assertFiniteMatrix(right, `${label} right`);
  if (left.length !== right.length || left.some((row, rowIndex) => row.length !== right[rowIndex]?.length)) {
    throw new Error(`${label} matrices must have identical shapes`);
  }
  return freezeMatrix(left.map((row, rowIndex) => row.map((value, columnIndex) => (
    value + right[rowIndex][columnIndex]
  ))));
}

function maxMatrixError(left: NumericMatrix, right: NumericMatrix) {
  if (left.length !== right.length || left.some((row, rowIndex) => row.length !== right[rowIndex]?.length)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.max(0, ...left.flatMap((row, rowIndex) => row.map((value, columnIndex) => (
    Math.abs(value - right[rowIndex][columnIndex])
  ))));
}

export function stableSoftmax(values: readonly number[]): NumericVector {
  assertFiniteVector(values, "Softmax logits");
  const maximum = Math.max(...values);
  const exponentials = values.map((value) => Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(denominator) || denominator <= 0) throw new Error("Softmax denominator must be finite and positive");
  return freezeVector(exponentials.map((value) => value / denominator));
}

function stableMaskedSoftmax(values: readonly (number | null)[]): NumericVector {
  const visible = values.flatMap((value) => value === null ? [] : [value]);
  if (visible.length === 0) return freezeVector(values.map(() => 0));
  const maximum = Math.max(...visible);
  const exponentials = values.map((value) => value === null ? 0 : Math.exp(value - maximum));
  const denominator = exponentials.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(denominator) || denominator <= 0) throw new Error("Masked softmax denominator must be finite and positive");
  return freezeVector(exponentials.map((value) => value / denominator));
}

export type MiniTransformerTokenId = 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type MiniTransformerToken = Readonly<{
  id: MiniTransformerTokenId;
  text: string;
  kind: "bos" | "word" | "punctuation" | "eos" | "unknown";
}>;

export const MINI_TRANSFORMER_BOS_ID: MiniTransformerTokenId = 0;
export const MINI_TRANSFORMER_EOS_ID: MiniTransformerTokenId = 5;
export const MINI_TRANSFORMER_UNK_ID: MiniTransformerTokenId = 6;

export const miniTransformerVocabulary = deepFreeze([
  { id: 0, text: "<bos>", kind: "bos" },
  { id: 1, text: "the", kind: "word" },
  { id: 2, text: "cat", kind: "word" },
  { id: 3, text: "sat", kind: "word" },
  { id: 4, text: ".", kind: "punctuation" },
  { id: 5, text: "<eos>", kind: "eos" },
  { id: 6, text: "<unk>", kind: "unknown" },
  { id: 7, text: "mat", kind: "word" },
] as const) satisfies readonly MiniTransformerToken[];

export const MINI_TRANSFORMER_VOCAB_SIZE = miniTransformerVocabulary.length;

const vocabularyIdByText = new Map<string, MiniTransformerTokenId>(
  miniTransformerVocabulary.map(({ id, text }) => [text, id]),
);

const tokenEmbeddings = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [1, 1, 0, 0],
  [0, 1, 1, 0],
  [0, 0, 1, 1],
  [1, 0, 0, 1],
] as const;

const vocabularyProjection = [
  [0.2, 0.8, -0.3, 0.1, 0.4, -0.2, 0.05, 0.3],
  [-0.1, 0.2, 0.9, -0.4, 0.1, 0.3, 0.1, -0.2],
  [0.1, -0.3, 0.2, 0.9, -0.2, 0.5, 0.2, 0.1],
  [0.3, 0.1, -0.4, 0.2, 0.8, 0.4, 0.1, 0.6],
] as const;

const vocabularyBias = [-1, -0.1, -0.05, 0, 0.05, 0.1, -0.5, -0.2] as const;

export const miniTransformerFixture = deepFreeze({
  tokenEmbeddings: freezeMatrix(tokenEmbeddings),
  attentionWeights: {
    wq: freezeMatrix(transformerBlockFixture.attentionWeights.wq),
    wk: freezeMatrix(transformerBlockFixture.attentionWeights.wk),
    wv: freezeMatrix(transformerBlockFixture.attentionWeights.wv),
    wo: freezeMatrix(transformerBlockFixture.attentionWeights.wo),
  },
  norm1Gamma: freezeVector(transformerBlockFixture.norm1Gamma),
  norm1Beta: freezeVector(transformerBlockFixture.norm1Beta),
  norm2Gamma: freezeVector(transformerBlockFixture.norm2Gamma),
  norm2Beta: freezeVector(transformerBlockFixture.norm2Beta),
  finalNormGamma: freezeVector([1, 1, 1, 1]),
  finalNormBeta: freezeVector([0, 0, 0, 0]),
  ffn: {
    w1: freezeMatrix(transformerBlockFixture.ffn.w1),
    b1: freezeVector(transformerBlockFixture.ffn.b1),
    w2: freezeMatrix(transformerBlockFixture.ffn.w2),
    b2: freezeVector(transformerBlockFixture.ffn.b2),
  },
  vocabularyProjection: freezeMatrix(vocabularyProjection),
  vocabularyBias: freezeVector(vocabularyBias),
});

export type MiniTransformerTokenizationTrace = Readonly<{
  input: string;
  normalized: string;
  pieces: readonly string[];
  tokenIds: readonly MiniTransformerTokenId[];
  tokens: readonly string[];
  bosAdded: boolean;
  unknownCount: number;
}>;

function assertTokenId(value: unknown, label: string): asserts value is MiniTransformerTokenId {
  if (!Number.isInteger(value) || (value as number) < 0 || (value as number) >= MINI_TRANSFORMER_VOCAB_SIZE) {
    throw new Error(`${label} must be a vocabulary token id`);
  }
}

export function tokenizeMiniTransformer(
  input: string,
  addBos = true,
): MiniTransformerTokenizationTrace {
  if (typeof input !== "string") throw new Error("Tokenizer input must be text");
  if (typeof addBos !== "boolean") throw new Error("Tokenizer addBos must be boolean");
  const normalized = input.trim().toLowerCase();
  const pieces = normalized.match(/[a-z]+|\./g) ?? [];
  const contentIds = pieces.map((piece) => vocabularyIdByText.get(piece) ?? MINI_TRANSFORMER_UNK_ID);
  const tokenIds = (addBos ? [MINI_TRANSFORMER_BOS_ID, ...contentIds] : contentIds) as MiniTransformerTokenId[];
  if (tokenIds.length === 0) throw new Error("Tokenizer must produce at least one token");
  if (tokenIds.length > MINI_TRANSFORMER_MAX_CONTEXT) {
    throw new Error(`Tokenizer output exceeds the ${MINI_TRANSFORMER_MAX_CONTEXT}-token context`);
  }
  return deepFreeze({
    input,
    normalized,
    pieces,
    tokenIds,
    tokens: tokenIds.map((id) => miniTransformerVocabulary[id].text),
    bosAdded: addBos,
    unknownCount: tokenIds.filter((id) => id === MINI_TRANSFORMER_UNK_ID).length,
  });
}

export function decodeMiniTransformerTokens(tokenIds: readonly number[]): string {
  if (!Array.isArray(tokenIds)) throw new Error("Decoded token ids must be an array");
  tokenIds.forEach((id, index) => assertTokenId(id, `Decoded token ${index}`));
  const visible = tokenIds
    .filter((id) => id !== MINI_TRANSFORMER_BOS_ID && id !== MINI_TRANSFORMER_EOS_ID)
    .map((id) => miniTransformerVocabulary[id].text);
  return visible.reduce((text, token) => token === "." ? `${text}.` : `${text}${text ? " " : ""}${token}`, "");
}

export type MiniTransformerProbabilityAxis = "vocabulary" | "sequence";
export type MiniTransformerDecodeStrategy = "greedy" | "learner-selected";

export type MiniTransformerConfig = Readonly<{
  addBos: boolean;
  positionScale: number;
  causal: boolean;
  probabilityAxis: MiniTransformerProbabilityAxis;
  recomputePrefix: boolean;
  stopAtEos: boolean;
  maxNewTokens: number;
  decodeStrategy: MiniTransformerDecodeStrategy;
}>;

export const canonicalMiniTransformerConfig: MiniTransformerConfig = Object.freeze({
  addBos: true,
  positionScale: 1,
  causal: true,
  probabilityAxis: "vocabulary",
  recomputePrefix: true,
  stopAtEos: true,
  maxNewTokens: MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS,
  decodeStrategy: "greedy",
});

function validateMiniTransformerConfig(config: MiniTransformerConfig) {
  if (!config || typeof config !== "object") throw new Error("Mini Transformer config is required");
  if (typeof config.addBos !== "boolean" || typeof config.causal !== "boolean" || typeof config.recomputePrefix !== "boolean" || typeof config.stopAtEos !== "boolean") {
    throw new Error("Mini Transformer switches must be boolean");
  }
  if (!Number.isFinite(config.positionScale) || config.positionScale < 0 || config.positionScale > 2) {
    throw new Error("Position scale must be finite and between 0 and 2");
  }
  if (config.probabilityAxis !== "vocabulary" && config.probabilityAxis !== "sequence") {
    throw new Error("Probability axis must be vocabulary or sequence");
  }
  if (config.decodeStrategy !== "greedy" && config.decodeStrategy !== "learner-selected") {
    throw new Error("Decode strategy must be greedy or learner-selected");
  }
  if (!Number.isInteger(config.maxNewTokens) || config.maxNewTokens < 1 || config.maxNewTokens > MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS) {
    throw new Error(`maxNewTokens must be an integer between 1 and ${MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS}`);
  }
}

type MiniTransformerAttentionHeadTrace = Readonly<{
  headIndex: number;
  q: NumericMatrix;
  k: NumericMatrix;
  v: NumericMatrix;
  rawScores: NumericMatrix;
  maskedScores: MaskedMatrix;
  allowed: BooleanMatrix;
  weights: NumericMatrix;
  context: NumericMatrix;
  rowSums: NumericVector;
}>;

export type MiniTransformerAttentionTrace = Readonly<{
  provenance: Readonly<{
    inputStage: "norm1";
    causal: boolean;
    scoreScale: "sqrt-head-dimension";
    weightSource: "transformer-block-fixture";
  }>;
  input: NumericMatrix;
  q: NumericMatrix;
  k: NumericMatrix;
  v: NumericMatrix;
  heads: readonly MiniTransformerAttentionHeadTrace[];
  concatenated: NumericMatrix;
  output: NumericMatrix;
}>;

function splitHeads(matrix: NumericMatrix): readonly NumericMatrix[] {
  return Object.freeze(Array.from({ length: MINI_TRANSFORMER_HEAD_COUNT }, (_, headIndex) => freezeMatrix(
    matrix.map((row) => row.slice(
      headIndex * MINI_TRANSFORMER_HEAD_DIMENSION,
      (headIndex + 1) * MINI_TRANSFORMER_HEAD_DIMENSION,
    )),
  )));
}

function concatHeads(heads: readonly NumericMatrix[]): NumericMatrix {
  if (heads.length !== MINI_TRANSFORMER_HEAD_COUNT) throw new Error("Attention must preserve every head");
  const tokenCount = heads[0]?.length ?? 0;
  heads.forEach((head, index) => assertFiniteMatrix(head, `Head ${index}`, tokenCount, MINI_TRANSFORMER_HEAD_DIMENSION));
  return freezeMatrix(Array.from({ length: tokenCount }, (_, tokenIndex) => heads.flatMap((head) => [...head[tokenIndex]])));
}

function runCausalSelfAttention(input: NumericMatrix, causal: boolean): MiniTransformerAttentionTrace {
  assertFiniteMatrix(input, "Self-Attention input", undefined, MINI_TRANSFORMER_MODEL_DIMENSION);
  const tokenCount = input.length;
  const q = multiplyMatrices(input, miniTransformerFixture.attentionWeights.wq);
  const k = multiplyMatrices(input, miniTransformerFixture.attentionWeights.wk);
  const v = multiplyMatrices(input, miniTransformerFixture.attentionWeights.wv);
  const qHeads = splitHeads(q);
  const kHeads = splitHeads(k);
  const vHeads = splitHeads(v);
  const divisor = Math.sqrt(MINI_TRANSFORMER_HEAD_DIMENSION);
  const heads = qHeads.map((qHead, headIndex): MiniTransformerAttentionHeadTrace => {
    const rawScores = multiplyMatrices(qHead, transpose(kHeads[headIndex]));
    const allowed = freezeBooleanMatrix(Array.from({ length: tokenCount }, (_, queryIndex) => (
      Array.from({ length: tokenCount }, (_, keyIndex) => !causal || keyIndex <= queryIndex)
    )));
    const maskedScores = freezeMaskedMatrix(rawScores.map((row, queryIndex) => row.map((score, keyIndex) => (
      allowed[queryIndex][keyIndex] ? score / divisor : null
    ))));
    const weights = freezeMatrix(maskedScores.map(stableMaskedSoftmax));
    const context = multiplyMatrices(weights, vHeads[headIndex]);
    return deepFreeze({
      headIndex,
      q: qHead,
      k: kHeads[headIndex],
      v: vHeads[headIndex],
      rawScores,
      maskedScores,
      allowed,
      weights,
      context,
      rowSums: freezeVector(weights.map((row) => row.reduce((sum, value) => sum + value, 0))),
    });
  });
  const concatenated = concatHeads(heads.map(({ context }) => context));
  const output = multiplyMatrices(concatenated, miniTransformerFixture.attentionWeights.wo);
  return deepFreeze({
    provenance: {
      inputStage: "norm1" as const,
      causal,
      scoreScale: "sqrt-head-dimension" as const,
      weightSource: "transformer-block-fixture" as const,
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

export type MiniTransformerFfnTrace = Readonly<{
  input: NumericMatrix;
  hiddenPreActivation: NumericMatrix;
  hidden: NumericMatrix;
  output: NumericMatrix;
  activation: "relu";
  sharedAcrossTokens: true;
}>;

function runFfn(input: NumericMatrix): MiniTransformerFfnTrace {
  assertFiniteMatrix(input, "FFN input", undefined, MINI_TRANSFORMER_MODEL_DIMENSION);
  const hiddenPreActivation = freezeMatrix(input.map((row) => Array.from({ length: MINI_TRANSFORMER_FFN_DIMENSION }, (_, hiddenIndex) => (
    miniTransformerFixture.ffn.b1[hiddenIndex]
    + row.reduce((sum, value, featureIndex) => sum + value * miniTransformerFixture.ffn.w1[featureIndex][hiddenIndex], 0)
  ))));
  const hidden = freezeMatrix(hiddenPreActivation.map((row) => row.map((value) => Math.max(0, value))));
  const output = freezeMatrix(hidden.map((row) => Array.from({ length: MINI_TRANSFORMER_MODEL_DIMENSION }, (_, featureIndex) => (
    miniTransformerFixture.ffn.b2[featureIndex]
    + row.reduce((sum, value, hiddenIndex) => sum + value * miniTransformerFixture.ffn.w2[hiddenIndex][featureIndex], 0)
  ))));
  return deepFreeze({ input: freezeMatrix(input), hiddenPreActivation, hidden, output, activation: "relu" as const, sharedAcrossTokens: true as const });
}

function probabilitiesForLogits(logits: NumericMatrix, axis: MiniTransformerProbabilityAxis): NumericMatrix {
  if (axis === "vocabulary") return freezeMatrix(logits.map(stableSoftmax));
  const columns = transpose(logits).map(stableSoftmax);
  return transpose(freezeMatrix(columns));
}

function argmax(values: NumericVector) {
  assertFiniteVector(values, "Argmax values");
  return values.reduce((best, value, index) => value > values[best] ? index : best, 0);
}

export type MiniTransformerBlockTrace = Readonly<{
  embeddings: NumericMatrix;
  positionSignal: NumericMatrix;
  scaledPositionSignal: NumericMatrix;
  x0: NumericMatrix;
  norm1: LayerNormTrace;
  attention: MiniTransformerAttentionTrace;
  residual1: NumericMatrix;
  norm2: LayerNormTrace;
  ffn: MiniTransformerFfnTrace;
  output: NumericMatrix;
}>;

export type MiniTransformerForwardTrace = Readonly<{
  config: MiniTransformerConfig;
  tokenization: MiniTransformerTokenizationTrace;
  tokenIds: readonly MiniTransformerTokenId[];
  tokens: readonly string[];
  block: MiniTransformerBlockTrace;
  finalNorm: LayerNormTrace;
  logits: NumericMatrix;
  probabilities: NumericMatrix;
  probabilityRowSums: NumericVector;
  probabilityColumnSums: NumericVector;
  lastRowIndex: number;
  nextTokenId: MiniTransformerTokenId;
  nextToken: string;
  nextProbability: number;
  handoff: Readonly<{
    hiddenShape: readonly [number, number];
    logitsShape: readonly [number, number];
    probabilityAxis: MiniTransformerProbabilityAxis;
    selectedRow: "last-prefix-token";
  }>;
}>;

function tokenizationFromIds(tokenIds: readonly MiniTransformerTokenId[]): MiniTransformerTokenizationTrace {
  return deepFreeze({
    input: decodeMiniTransformerTokens(tokenIds),
    normalized: decodeMiniTransformerTokens(tokenIds),
    pieces: tokenIds.filter((id) => id !== MINI_TRANSFORMER_BOS_ID).map((id) => miniTransformerVocabulary[id].text),
    tokenIds: [...tokenIds],
    tokens: tokenIds.map((id) => miniTransformerVocabulary[id].text),
    bosAdded: tokenIds[0] === MINI_TRANSFORMER_BOS_ID,
    unknownCount: tokenIds.filter((id) => id === MINI_TRANSFORMER_UNK_ID).length,
  });
}

function runForwardFromTokenIds(
  tokenIds: readonly MiniTransformerTokenId[],
  config: MiniTransformerConfig,
  tokenization: MiniTransformerTokenizationTrace,
): MiniTransformerForwardTrace {
  validateMiniTransformerConfig(config);
  if (!Array.isArray(tokenIds) || tokenIds.length === 0 || tokenIds.length > MINI_TRANSFORMER_MAX_CONTEXT) {
    throw new Error(`Forward token ids must contain between 1 and ${MINI_TRANSFORMER_MAX_CONTEXT} tokens`);
  }
  tokenIds.forEach((id, index) => assertTokenId(id, `Forward token ${index}`));
  const embeddings = freezeMatrix(tokenIds.map((id) => miniTransformerFixture.tokenEmbeddings[id]));
  const positionSignal = createSinusoidalPositionSignal(tokenIds.length, MINI_TRANSFORMER_MODEL_DIMENSION);
  const scaledPositionSignal = freezeMatrix(positionSignal.map((row) => row.map((value) => value * config.positionScale)));
  const x0 = addMatrices(embeddings, scaledPositionSignal, "Embedding and position");
  const norm1 = layerNormRows(x0, TRANSFORMER_BLOCK_LAYER_NORM_EPSILON, miniTransformerFixture.norm1Gamma, miniTransformerFixture.norm1Beta);
  const attention = runCausalSelfAttention(norm1.output, config.causal);
  const residual1 = addMatrices(x0, attention.output, "Attention residual");
  const norm2 = layerNormRows(residual1, TRANSFORMER_BLOCK_LAYER_NORM_EPSILON, miniTransformerFixture.norm2Gamma, miniTransformerFixture.norm2Beta);
  const ffn = runFfn(norm2.output);
  const output = addMatrices(residual1, ffn.output, "FFN residual");
  const finalNorm = layerNormRows(output, TRANSFORMER_BLOCK_LAYER_NORM_EPSILON, miniTransformerFixture.finalNormGamma, miniTransformerFixture.finalNormBeta);
  const projected = multiplyMatrices(finalNorm.output, miniTransformerFixture.vocabularyProjection);
  const logits = freezeMatrix(projected.map((row) => row.map((value, vocabIndex) => value + miniTransformerFixture.vocabularyBias[vocabIndex])));
  const probabilities = probabilitiesForLogits(logits, config.probabilityAxis);
  const probabilityRowSums = freezeVector(probabilities.map((row) => row.reduce((sum, value) => sum + value, 0)));
  const probabilityColumnSums = freezeVector(transpose(probabilities).map((column) => column.reduce((sum, value) => sum + value, 0)));
  const lastRowIndex = tokenIds.length - 1;
  const nextTokenId = argmax(probabilities[lastRowIndex]) as MiniTransformerTokenId;
  return deepFreeze({
    config: { ...config },
    tokenization,
    tokenIds: [...tokenIds],
    tokens: tokenIds.map((id) => miniTransformerVocabulary[id].text),
    block: { embeddings, positionSignal, scaledPositionSignal, x0, norm1, attention, residual1, norm2, ffn, output },
    finalNorm,
    logits,
    probabilities,
    probabilityRowSums,
    probabilityColumnSums,
    lastRowIndex,
    nextTokenId,
    nextToken: miniTransformerVocabulary[nextTokenId].text,
    nextProbability: probabilities[lastRowIndex][nextTokenId],
    handoff: {
      hiddenShape: [output.length, output[0].length] as const,
      logitsShape: [logits.length, logits[0].length] as const,
      probabilityAxis: config.probabilityAxis,
      selectedRow: "last-prefix-token" as const,
    },
  });
}

export function runMiniTransformer(
  prompt: string,
  config: MiniTransformerConfig = canonicalMiniTransformerConfig,
): MiniTransformerForwardTrace {
  validateMiniTransformerConfig(config);
  const tokenization = tokenizeMiniTransformer(prompt, config.addBos);
  return runForwardFromTokenIds(tokenization.tokenIds, config, tokenization);
}

export function runMiniTransformerTokenIds(
  tokenIds: readonly number[],
  config: MiniTransformerConfig = canonicalMiniTransformerConfig,
): MiniTransformerForwardTrace {
  validateMiniTransformerConfig(config);
  if (!Array.isArray(tokenIds)) throw new Error("Forward token ids must be an array");
  tokenIds.forEach((id, index) => assertTokenId(id, `Forward token ${index}`));
  const typedIds = [...tokenIds] as MiniTransformerTokenId[];
  return runForwardFromTokenIds(typedIds, config, tokenizationFromIds(typedIds));
}

export type MiniTransformerGenerationStep = Readonly<{
  stepIndex: number;
  prefixTokenIds: readonly MiniTransformerTokenId[];
  prefixTokens: readonly string[];
  forward: MiniTransformerForwardTrace;
  greedyTokenId: MiniTransformerTokenId;
  emittedTokenId: MiniTransformerTokenId;
  emittedToken: string;
  emittedProbability: number;
  source: MiniTransformerDecodeStrategy;
  recomputedFromFullPrefix: boolean;
}>;

export type MiniTransformerGenerationTrace = Readonly<{
  prompt: string;
  config: MiniTransformerConfig;
  initialTokenIds: readonly MiniTransformerTokenId[];
  steps: readonly MiniTransformerGenerationStep[];
  generatedTokenIds: readonly MiniTransformerTokenId[];
  finalTokenIds: readonly MiniTransformerTokenId[];
  finalTokens: readonly string[];
  decodedText: string;
  stopReason: "eos" | "max-length";
  eosEmitted: boolean;
}>;

export function generateMiniTransformer(
  prompt: string,
  config: MiniTransformerConfig = canonicalMiniTransformerConfig,
  learnerSelectedTokenIds: readonly number[] = [],
): MiniTransformerGenerationTrace {
  validateMiniTransformerConfig(config);
  if (!Array.isArray(learnerSelectedTokenIds)) throw new Error("Learner-selected tokens must be an array");
  learnerSelectedTokenIds.forEach((id, index) => assertTokenId(id, `Learner selection ${index}`));
  const initial = tokenizeMiniTransformer(prompt, config.addBos);
  if (initial.tokenIds.length + config.maxNewTokens > MINI_TRANSFORMER_MAX_CONTEXT) {
    throw new Error("Prompt plus maxNewTokens exceeds the context limit");
  }
  let prefix = [...initial.tokenIds] as MiniTransformerTokenId[];
  const initialForward = runForwardFromTokenIds(prefix, config, initial);
  const steps: MiniTransformerGenerationStep[] = [];
  let stopReason: MiniTransformerGenerationTrace["stopReason"] = "max-length";
  for (let stepIndex = 0; stepIndex < config.maxNewTokens; stepIndex += 1) {
    const forward = config.recomputePrefix
      ? runForwardFromTokenIds(prefix, config, tokenizationFromIds(prefix))
      : initialForward;
    let emittedTokenId: MiniTransformerTokenId;
    if (config.decodeStrategy === "learner-selected") {
      const selected = learnerSelectedTokenIds[stepIndex];
      if (selected === undefined) throw new Error(`Learner-selected decoding needs token ${stepIndex + 1}`);
      assertTokenId(selected, `Learner selection ${stepIndex}`);
      emittedTokenId = selected;
    } else {
      emittedTokenId = forward.nextTokenId;
    }
    const prefixBeforeEmission = [...prefix];
    steps.push(deepFreeze({
      stepIndex,
      prefixTokenIds: prefixBeforeEmission,
      prefixTokens: prefixBeforeEmission.map((id) => miniTransformerVocabulary[id].text),
      forward,
      greedyTokenId: forward.nextTokenId,
      emittedTokenId,
      emittedToken: miniTransformerVocabulary[emittedTokenId].text,
      emittedProbability: forward.probabilities[forward.lastRowIndex][emittedTokenId],
      source: config.decodeStrategy,
      recomputedFromFullPrefix: config.recomputePrefix && forward.tokenIds.length === prefixBeforeEmission.length,
    }));
    prefix = [...prefix, emittedTokenId];
    if (emittedTokenId === MINI_TRANSFORMER_EOS_ID && config.stopAtEos) {
      stopReason = "eos";
      break;
    }
  }
  const generatedTokenIds = steps.map(({ emittedTokenId }) => emittedTokenId);
  return deepFreeze({
    prompt,
    config: { ...config },
    initialTokenIds: [...initial.tokenIds],
    steps,
    generatedTokenIds,
    finalTokenIds: prefix,
    finalTokens: prefix.map((id) => miniTransformerVocabulary[id].text),
    decodedText: decodeMiniTransformerTokens(prefix),
    stopReason,
    eosEmitted: generatedTokenIds.includes(MINI_TRANSFORMER_EOS_ID),
  });
}

export const MINI_TRANSFORMER_TRAINING_TEXT = "the cat sat .";

export function createShiftedNextTokenTargets(
  inputTokenIds: readonly number[],
  terminalTokenId: number = MINI_TRANSFORMER_EOS_ID,
): readonly MiniTransformerTokenId[] {
  if (!Array.isArray(inputTokenIds) || inputTokenIds.length === 0) {
    throw new Error("Next-token shifting needs at least one input token");
  }
  inputTokenIds.forEach((id, index) => assertTokenId(id, `Shift input ${index}`));
  assertTokenId(terminalTokenId, "Terminal token");
  return Object.freeze([
    ...inputTokenIds.slice(1),
    terminalTokenId,
  ] as MiniTransformerTokenId[]);
}

function crossEntropyRow(logits: NumericVector, targetTokenId: MiniTransformerTokenId) {
  assertFiniteVector(logits, "Cross-entropy logits", MINI_TRANSFORMER_VOCAB_SIZE);
  const maximum = Math.max(...logits);
  const logDenominator = maximum + Math.log(
    logits.reduce((sum, value) => sum + Math.exp(value - maximum), 0),
  );
  const loss = logDenominator - logits[targetTokenId];
  if (!Number.isFinite(loss)) throw new Error("Cross entropy must be finite");
  return loss;
}

export function meanNextTokenCrossEntropy(
  logits: NumericMatrix,
  targetTokenIds: readonly number[],
) {
  assertFiniteMatrix(logits, "Next-token logits", undefined, MINI_TRANSFORMER_VOCAB_SIZE);
  if (!Array.isArray(targetTokenIds) || targetTokenIds.length !== logits.length) {
    throw new Error("Next-token loss needs one target per logit row");
  }
  targetTokenIds.forEach((id, index) => assertTokenId(id, `Next-token target ${index}`));
  return logits.reduce((sum, row, rowIndex) => (
    sum + crossEntropyRow(row, targetTokenIds[rowIndex] as MiniTransformerTokenId)
  ), 0) / logits.length;
}

export type MiniTransformerLmHeadUpdateTrace = Readonly<{
  trainingText: string;
  inputTokenIds: readonly MiniTransformerTokenId[];
  inputTokens: readonly string[];
  targetTokenIds: readonly MiniTransformerTokenId[];
  targetTokens: readonly string[];
  shiftPairs: readonly Readonly<{
    rowIndex: number;
    inputTokenId: MiniTransformerTokenId;
    targetTokenId: MiniTransformerTokenId;
  }>[];
  hidden: NumericMatrix;
  logitsBefore: NumericMatrix;
  probabilitiesBefore: NumericMatrix;
  rowLossesBefore: NumericVector;
  meanLossBefore: number;
  gradients: Readonly<{
    logits: NumericMatrix;
    projection: NumericMatrix;
    bias: NumericVector;
    l2Norm: number;
  }>;
  learningRate: number;
  updatedProjection: NumericMatrix;
  updatedBias: NumericVector;
  logitsAfter: NumericMatrix;
  probabilitiesAfter: NumericMatrix;
  rowLossesAfter: NumericVector;
  meanLossAfter: number;
  lossDecreased: boolean;
  updatedOnly: "vocabulary-projection-and-bias";
}>;

export function runMiniTransformerLmHeadUpdate(
  trainingText = MINI_TRANSFORMER_TRAINING_TEXT,
  config: MiniTransformerConfig = canonicalMiniTransformerConfig,
  learningRate = 0.2,
): MiniTransformerLmHeadUpdateTrace {
  validateMiniTransformerConfig(config);
  if (config.probabilityAxis !== "vocabulary") {
    throw new Error("LM-head training requires vocabulary-axis probabilities");
  }
  if (!Number.isFinite(learningRate) || learningRate < 1e-4 || learningRate > 1) {
    throw new Error("LM-head learning rate must be finite and between 1e-4 and 1");
  }
  const forward = runMiniTransformer(trainingText, config);
  const inputTokenIds = forward.tokenIds;
  const targetTokenIds = createShiftedNextTokenTargets(inputTokenIds);
  const probabilitiesBefore = freezeMatrix(forward.logits.map(stableSoftmax));
  const rowLossesBefore = freezeVector(forward.logits.map((row, rowIndex) => (
    crossEntropyRow(row, targetTokenIds[rowIndex])
  )));
  const meanLossBefore = rowLossesBefore.reduce((sum, value) => sum + value, 0) / rowLossesBefore.length;
  const gradientLogits = freezeMatrix(probabilitiesBefore.map((row, rowIndex) => row.map((probability, vocabIndex) => (
    (probability - (targetTokenIds[rowIndex] === vocabIndex ? 1 : 0)) / rowLossesBefore.length
  ))));
  const gradientProjection = multiplyMatrices(transpose(forward.finalNorm.output), gradientLogits);
  const gradientBias = freezeVector(Array.from({ length: MINI_TRANSFORMER_VOCAB_SIZE }, (_, vocabIndex) => (
    gradientLogits.reduce((sum, row) => sum + row[vocabIndex], 0)
  )));
  const updatedProjection = freezeMatrix(miniTransformerFixture.vocabularyProjection.map((row, featureIndex) => (
    row.map((value, vocabIndex) => value - learningRate * gradientProjection[featureIndex][vocabIndex])
  )));
  const updatedBias = freezeVector(miniTransformerFixture.vocabularyBias.map((value, vocabIndex) => (
    value - learningRate * gradientBias[vocabIndex]
  )));
  const projectedAfter = multiplyMatrices(forward.finalNorm.output, updatedProjection);
  const logitsAfter = freezeMatrix(projectedAfter.map((row) => row.map((value, vocabIndex) => (
    value + updatedBias[vocabIndex]
  ))));
  const probabilitiesAfter = freezeMatrix(logitsAfter.map(stableSoftmax));
  const rowLossesAfter = freezeVector(logitsAfter.map((row, rowIndex) => (
    crossEntropyRow(row, targetTokenIds[rowIndex])
  )));
  const meanLossAfter = rowLossesAfter.reduce((sum, value) => sum + value, 0) / rowLossesAfter.length;
  const l2Norm = Math.sqrt(
    gradientProjection.flat().reduce((sum, value) => sum + value ** 2, 0)
    + gradientBias.reduce((sum, value) => sum + value ** 2, 0),
  );
  return deepFreeze({
    trainingText,
    inputTokenIds: [...inputTokenIds],
    inputTokens: inputTokenIds.map((id) => miniTransformerVocabulary[id].text),
    targetTokenIds: [...targetTokenIds],
    targetTokens: targetTokenIds.map((id) => miniTransformerVocabulary[id].text),
    shiftPairs: inputTokenIds.map((inputTokenId, rowIndex) => ({
      rowIndex,
      inputTokenId,
      targetTokenId: targetTokenIds[rowIndex],
    })),
    hidden: forward.finalNorm.output,
    logitsBefore: forward.logits,
    probabilitiesBefore,
    rowLossesBefore,
    meanLossBefore,
    gradients: {
      logits: gradientLogits,
      projection: gradientProjection,
      bias: gradientBias,
      l2Norm,
    },
    learningRate,
    updatedProjection,
    updatedBias,
    logitsAfter,
    probabilitiesAfter,
    rowLossesAfter,
    meanLossAfter,
    lossDecreased: meanLossAfter < meanLossBefore,
    updatedOnly: "vocabulary-projection-and-bias" as const,
  });
}

export const MINI_TRANSFORMER_LAB_PROMPT = "the cat";

export type MiniTransformerChallengeId =
  | "tokenize"
  | "embed-position"
  | "causal-block"
  | "vocab-projection"
  | "autoregressive-decode";

export type MiniTransformerPrediction =
  | "bos-and-vocabulary-ids"
  | "characters-without-vocabulary"
  | "prompt-only-no-bos"
  | "embedding-plus-position-once"
  | "position-after-logits"
  | "position-every-generation-step"
  | "causal-prefix-preserves-shape"
  | "future-token-mixing"
  | "block-outputs-vocab-directly"
  | "last-hidden-to-vocab-row-softmax"
  | "softmax-over-sequence"
  | "argmax-before-projection"
  | "append-recompute-stop-eos-or-limit"
  | "reuse-first-prefix-state"
  | "replace-last-prefix-token";

export type MiniTransformerInspectStage =
  | "tokenize"
  | "embed-position"
  | "causal-block"
  | "vocab-projection"
  | "autoregressive-decode";

export type MiniTransformerInspection = Readonly<{
  stage: MiniTransformerInspectStage;
  rowIndex: number;
  columnIndex: number;
}>;

export const miniTransformerChallengeIds = Object.freeze([
  "tokenize",
  "embed-position",
  "causal-block",
  "vocab-projection",
  "autoregressive-decode",
] as const) satisfies readonly MiniTransformerChallengeId[];

export const miniTransformerCoreChallengeIds = deepFreeze([
  "causal-block",
  "vocab-projection",
  "autoregressive-decode",
] as const) satisfies readonly MiniTransformerChallengeId[];

export const miniTransformerPredictions = Object.freeze([
  "bos-and-vocabulary-ids",
  "characters-without-vocabulary",
  "prompt-only-no-bos",
  "embedding-plus-position-once",
  "position-after-logits",
  "position-every-generation-step",
  "causal-prefix-preserves-shape",
  "future-token-mixing",
  "block-outputs-vocab-directly",
  "last-hidden-to-vocab-row-softmax",
  "softmax-over-sequence",
  "argmax-before-projection",
  "append-recompute-stop-eos-or-limit",
  "reuse-first-prefix-state",
  "replace-last-prefix-token",
] as const) satisfies readonly MiniTransformerPrediction[];

const expectedPredictions: Readonly<Record<MiniTransformerChallengeId, MiniTransformerPrediction>> = Object.freeze({
  tokenize: "bos-and-vocabulary-ids",
  "embed-position": "embedding-plus-position-once",
  "causal-block": "causal-prefix-preserves-shape",
  "vocab-projection": "last-hidden-to-vocab-row-softmax",
  "autoregressive-decode": "append-recompute-stop-eos-or-limit",
});

const requiredInspections: Readonly<Record<MiniTransformerChallengeId, MiniTransformerInspection>> = deepFreeze({
  tokenize: { stage: "tokenize", rowIndex: 0, columnIndex: MINI_TRANSFORMER_BOS_ID },
  "embed-position": { stage: "embed-position", rowIndex: 1, columnIndex: 0 },
  "causal-block": { stage: "causal-block", rowIndex: 0, columnIndex: 1 },
  "vocab-projection": { stage: "vocab-projection", rowIndex: 2, columnIndex: 3 },
  "autoregressive-decode": { stage: "autoregressive-decode", rowIndex: 1, columnIndex: 4 },
});

export const miniTransformerChallengeRequirements = deepFreeze(Object.fromEntries(
  miniTransformerChallengeIds.map((challengeId) => [challengeId, {
    expectedPrediction: expectedPredictions[challengeId],
    canonicalConfig: { ...canonicalMiniTransformerConfig },
    prompt: MINI_TRANSFORMER_LAB_PROMPT,
    requiredInspection: requiredInspections[challengeId],
  }]),
) as Record<MiniTransformerChallengeId, {
  expectedPrediction: MiniTransformerPrediction;
  canonicalConfig: MiniTransformerConfig;
  prompt: string;
  requiredInspection: MiniTransformerInspection;
}>);

export const miniTransformerChallengeDefaults: Readonly<Record<MiniTransformerChallengeId, MiniTransformerConfig>> = deepFreeze({
  tokenize: { ...canonicalMiniTransformerConfig, addBos: false },
  "embed-position": { ...canonicalMiniTransformerConfig, positionScale: 0 },
  "causal-block": { ...canonicalMiniTransformerConfig, causal: false },
  "vocab-projection": { ...canonicalMiniTransformerConfig, probabilityAxis: "sequence" },
  "autoregressive-decode": { ...canonicalMiniTransformerConfig, recomputePrefix: false },
});

function configsEqual(left: MiniTransformerConfig, right: MiniTransformerConfig) {
  return left.addBos === right.addBos
    && left.positionScale === right.positionScale
    && left.causal === right.causal
    && left.probabilityAxis === right.probabilityAxis
    && left.recomputePrefix === right.recomputePrefix
    && left.stopAtEos === right.stopAtEos
    && left.maxNewTokens === right.maxNewTokens
    && left.decodeStrategy === right.decodeStrategy;
}

export type MiniTransformerChallengeGrade = Readonly<{
  correct: boolean;
  predictionCorrect: boolean;
  configCorrect: boolean;
  promptCorrect: boolean;
  semanticCorrect: boolean;
  observed: Readonly<{
    bosFirst: boolean;
    unknownCount: number;
    positionError: number;
    futureAttentionMass: number;
    hiddenShape: readonly [number, number];
    logitsShape: readonly [number, number];
    maxProbabilityRowSumError: number;
    shiftedTargetsCorrect: boolean;
    meanLossBefore: number | null;
    meanLossAfter: number | null;
    lmHeadLossDecreased: boolean;
    prefixRecomputeFailures: number;
    appendFailures: number;
    stopReason: "eos" | "max-length";
  }>;
}>;

function expectedPositionInput(trace: MiniTransformerForwardTrace) {
  return freezeMatrix(trace.block.embeddings.map((row, rowIndex) => row.map((value, columnIndex) => (
    value + trace.block.positionSignal[rowIndex][columnIndex]
  ))));
}

function futureAttentionMass(trace: MiniTransformerForwardTrace) {
  return trace.block.attention.heads.reduce((total, head) => total + head.weights.reduce((headTotal, row, queryIndex) => (
    headTotal + row.reduce((rowTotal, value, keyIndex) => rowTotal + (keyIndex > queryIndex ? value : 0), 0)
  ), 0), 0);
}

function generationContractFailures(trace: MiniTransformerGenerationTrace) {
  let appendFailures = 0;
  let prefixRecomputeFailures = 0;
  trace.steps.forEach((step, stepIndex) => {
    if (!step.recomputedFromFullPrefix) prefixRecomputeFailures += 1;
    if (stepIndex > 0) {
      const previous = trace.steps[stepIndex - 1];
      const expected = [...previous.prefixTokenIds, previous.emittedTokenId];
      if (expected.join(",") !== step.prefixTokenIds.join(",")) appendFailures += 1;
    }
  });
  return { appendFailures, prefixRecomputeFailures };
}

export function gradeMiniTransformerChallenge(
  challengeId: MiniTransformerChallengeId,
  prediction: MiniTransformerPrediction,
  config: MiniTransformerConfig,
  prompt = MINI_TRANSFORMER_LAB_PROMPT,
): MiniTransformerChallengeGrade {
  if (!miniTransformerChallengeIds.includes(challengeId)) throw new Error(`Unknown Mini Transformer challenge: ${challengeId as string}`);
  if (!miniTransformerPredictions.includes(prediction)) throw new Error(`Unknown Mini Transformer prediction: ${prediction as string}`);
  const trace = runMiniTransformer(prompt, config);
  const generation = generateMiniTransformer(prompt, config);
  const generationFailures = generationContractFailures(generation);
  const training = config.probabilityAxis === "vocabulary"
    ? runMiniTransformerLmHeadUpdate(MINI_TRANSFORMER_TRAINING_TEXT, config)
    : null;
  const expectedTargets = Object.freeze([1, 2, 3, 4, 5]);
  const observed = deepFreeze({
    bosFirst: trace.tokenIds[0] === MINI_TRANSFORMER_BOS_ID,
    unknownCount: trace.tokenization.unknownCount,
    positionError: maxMatrixError(trace.block.x0, expectedPositionInput(trace)),
    futureAttentionMass: futureAttentionMass(trace),
    hiddenShape: trace.handoff.hiddenShape,
    logitsShape: trace.handoff.logitsShape,
    maxProbabilityRowSumError: Math.max(...trace.probabilityRowSums.map((sum) => Math.abs(sum - 1))),
    shiftedTargetsCorrect: training?.targetTokenIds.join(",") === expectedTargets.join(",") || false,
    meanLossBefore: training?.meanLossBefore ?? null,
    meanLossAfter: training?.meanLossAfter ?? null,
    lmHeadLossDecreased: training?.lossDecreased ?? false,
    prefixRecomputeFailures: generationFailures.prefixRecomputeFailures,
    appendFailures: generationFailures.appendFailures,
    stopReason: generation.stopReason,
  });
  const semanticCorrect = challengeId === "tokenize"
    ? observed.bosFirst && observed.unknownCount === 0
    : challengeId === "embed-position"
      ? observed.positionError <= 1e-10 && trace.config.positionScale === 1
      : challengeId === "causal-block"
        ? observed.futureAttentionMass <= 1e-12
          && observed.hiddenShape[0] === trace.tokenIds.length
          && observed.hiddenShape[1] === MINI_TRANSFORMER_MODEL_DIMENSION
        : challengeId === "vocab-projection"
          ? observed.logitsShape[0] === trace.tokenIds.length
            && observed.logitsShape[1] === MINI_TRANSFORMER_VOCAB_SIZE
            && observed.maxProbabilityRowSumError <= 1e-10
            && observed.shiftedTargetsCorrect
            && observed.meanLossBefore !== null
            && observed.meanLossAfter !== null
            && observed.lmHeadLossDecreased
          : observed.prefixRecomputeFailures === 0
            && observed.appendFailures === 0
            && (observed.stopReason === "eos" || generation.steps.length === config.maxNewTokens);
  const predictionCorrect = prediction === expectedPredictions[challengeId];
  const configCorrect = configsEqual(config, canonicalMiniTransformerConfig);
  const promptCorrect = prompt === MINI_TRANSFORMER_LAB_PROMPT;
  return deepFreeze({
    correct: predictionCorrect && configCorrect && promptCorrect && semanticCorrect,
    predictionCorrect,
    configCorrect,
    promptCorrect,
    semanticCorrect,
    observed,
  });
}

function validIndex(value: unknown, size: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < size;
}

export function isValidMiniTransformerInspection(
  challengeId: MiniTransformerChallengeId,
  config: MiniTransformerConfig,
  inspection: MiniTransformerInspection,
  prompt = MINI_TRANSFORMER_LAB_PROMPT,
) {
  if (!miniTransformerChallengeIds.includes(challengeId)) return false;
  const required = requiredInspections[challengeId];
  if (
    !inspection
    || inspection.stage !== required.stage
    || inspection.rowIndex !== required.rowIndex
    || inspection.columnIndex !== required.columnIndex
    || !validIndex(inspection.rowIndex, challengeId === "autoregressive-decode" ? config.maxNewTokens : 5)
    || inspection.columnIndex < 0
  ) return false;
  let grade: MiniTransformerChallengeGrade;
  try {
    grade = gradeMiniTransformerChallenge(challengeId, expectedPredictions[challengeId], config, prompt);
  } catch {
    return false;
  }
  if (!grade.configCorrect || !grade.promptCorrect || !grade.semanticCorrect) return false;
  const trace = runMiniTransformer(prompt, config);
  if (challengeId === "tokenize") return trace.tokenIds[inspection.rowIndex] === inspection.columnIndex;
  if (challengeId === "embed-position") {
    return Math.abs(trace.block.positionSignal[inspection.rowIndex][inspection.columnIndex]) > 1e-8
      && Math.abs(
        trace.block.x0[inspection.rowIndex][inspection.columnIndex]
        - trace.block.embeddings[inspection.rowIndex][inspection.columnIndex]
        - trace.block.positionSignal[inspection.rowIndex][inspection.columnIndex]
      ) <= 1e-10;
  }
  if (challengeId === "causal-block") {
    return trace.block.attention.heads.every((head) => (
      head.maskedScores[inspection.rowIndex][inspection.columnIndex] === null
      && head.weights[inspection.rowIndex][inspection.columnIndex] === 0
    ));
  }
  if (challengeId === "vocab-projection") {
    const training = runMiniTransformerLmHeadUpdate(MINI_TRANSFORMER_TRAINING_TEXT, config);
    return training.targetTokenIds[inspection.rowIndex] === inspection.columnIndex
      && training.probabilitiesBefore[inspection.rowIndex][inspection.columnIndex] > 0
      && training.lossDecreased;
  }
  const generation = generateMiniTransformer(prompt, config);
  const step = generation.steps[inspection.rowIndex];
  return step?.emittedTokenId === inspection.columnIndex
    && step.recomputedFromFullPrefix
    && generationContractFailures(generation).appendFailures === 0;
}

type EvidenceBase = Readonly<{
  eventId: string;
  attemptId: string;
  challengeId: MiniTransformerChallengeId;
  config: MiniTransformerConfig;
  prompt: string;
}>;

export type MiniTransformerLabEvidenceEvent =
  | (EvidenceBase & Readonly<{ kind: "prediction"; prediction: MiniTransformerPrediction }>)
  | (EvidenceBase & Readonly<{ kind: "run" }>)
  | (EvidenceBase & Readonly<{ kind: "inspect"; stage: MiniTransformerInspectStage; rowIndex: number; columnIndex: number }>);

export type MiniTransformerLabEvidence = Readonly<{ events: readonly MiniTransformerLabEvidenceEvent[] }>;
export const emptyMiniTransformerLabEvidence: MiniTransformerLabEvidence = Object.freeze({ events: Object.freeze([]) });

export type MiniTransformerLabMastery = Readonly<{
  mastered: boolean;
  reason: "mastered" | "invalid-evidence" | "complete-core-challenges";
  completedChallengeIds: readonly MiniTransformerChallengeId[];
}>;

type AttemptState = {
  challengeId: MiniTransformerChallengeId;
  config: MiniTransformerConfig;
  prompt: string;
  prediction: MiniTransformerPrediction;
  phase: "predicted" | "ran" | "inspected";
  correct: boolean;
};

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function masteryResult(reason: MiniTransformerLabMastery["reason"], completed: ReadonlySet<MiniTransformerChallengeId>): MiniTransformerLabMastery {
  return deepFreeze({
    mastered: reason === "mastered",
    reason,
    completedChallengeIds: miniTransformerChallengeIds.filter((id) => completed.has(id)),
  });
}

export function evaluateMiniTransformerLabMastery(evidence: MiniTransformerLabEvidence): MiniTransformerLabMastery {
  const completed = new Set<MiniTransformerChallengeId>();
  if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.events)) return masteryResult("invalid-evidence", completed);
  const eventIds = new Set<string>();
  const attempts = new Map<string, AttemptState>();
  for (const rawEvent of evidence.events as readonly unknown[]) {
    if (!rawEvent || typeof rawEvent !== "object") return masteryResult("invalid-evidence", completed);
    const event = rawEvent as Partial<MiniTransformerLabEvidenceEvent>;
    if (
      !validId(event.eventId)
      || eventIds.has(event.eventId)
      || !validId(event.attemptId)
      || !event.challengeId
      || !miniTransformerChallengeIds.includes(event.challengeId)
      || !event.config
      || typeof event.prompt !== "string"
    ) return masteryResult("invalid-evidence", completed);
    eventIds.add(event.eventId);
    try { runMiniTransformer(event.prompt, event.config); } catch { return masteryResult("invalid-evidence", completed); }
    if (event.kind === "prediction") {
      if (!event.prediction || !miniTransformerPredictions.includes(event.prediction) || attempts.has(event.attemptId)) {
        return masteryResult("invalid-evidence", completed);
      }
      attempts.set(event.attemptId, {
        challengeId: event.challengeId,
        config: { ...event.config },
        prompt: event.prompt,
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
      || attempt.prompt !== event.prompt
      || !configsEqual(attempt.config, event.config)
    ) return masteryResult("invalid-evidence", completed);
    if (event.kind === "run") {
      if (attempt.phase !== "predicted") return masteryResult("invalid-evidence", completed);
      attempt.phase = "ran";
      try {
        attempt.correct = gradeMiniTransformerChallenge(
          attempt.challengeId,
          attempt.prediction,
          attempt.config,
          attempt.prompt,
        ).correct;
      } catch {
        return masteryResult("invalid-evidence", completed);
      }
      continue;
    }
    if (event.kind === "inspect") {
      if (
        attempt.phase !== "ran"
        || !attempt.correct
        || !event.stage
        || !Number.isInteger(event.rowIndex)
        || !Number.isInteger(event.columnIndex)
        || !isValidMiniTransformerInspection(event.challengeId, attempt.config, {
          stage: event.stage,
          rowIndex: event.rowIndex as number,
          columnIndex: event.columnIndex as number,
        }, attempt.prompt)
      ) return masteryResult("invalid-evidence", completed);
      attempt.phase = "inspected";
      completed.add(event.challengeId);
      continue;
    }
    return masteryResult("invalid-evidence", completed);
  }
  return miniTransformerCoreChallengeIds.every((challengeId) => completed.has(challengeId))
    ? masteryResult("mastered", completed)
    : masteryResult("complete-core-challenges", completed);
}

export type MiniTransformerDebuggerScenarioId =
  | "tokenizer-boundary"
  | "causal-attention"
  | "vocab-probabilities"
  | "autoregressive-loop";

export type MiniTransformerRepair =
  | "bos-vocabulary-tokenization"
  | "character-codepoints"
  | "omit-bos-token"
  | "mask-before-row-softmax"
  | "unmasked-row-softmax"
  | "softmax-then-zero-future"
  | "final-norm-vocab-softmax-ce-descent"
  | "sequence-axis-softmax"
  | "skip-final-norm"
  | "gradient-ascent-lm-head"
  | "append-recompute-stop"
  | "reuse-first-prefix"
  | "replace-last-token"
  | "ignore-eos";

export type MiniTransformerDebuggerOption = Readonly<{
  id: MiniTransformerRepair;
  labelKo: string;
  labelEn: string;
}>;

export type MiniTransformerDebuggerScenario = Readonly<{
  id: MiniTransformerDebuggerScenarioId;
  labelKo: string;
  labelEn: string;
  options: readonly MiniTransformerDebuggerOption[];
}>;

function repair(id: MiniTransformerRepair, labelKo: string, labelEn: string): MiniTransformerDebuggerOption {
  return Object.freeze({ id, labelKo, labelEn });
}

export const miniTransformerDebuggerScenarioIds = Object.freeze([
  "tokenizer-boundary",
  "causal-attention",
  "vocab-probabilities",
  "autoregressive-loop",
] as const) satisfies readonly MiniTransformerDebuggerScenarioId[];

export const miniTransformerDebuggerScenarios = deepFreeze({
  "tokenizer-boundary": {
    id: "tokenizer-boundary",
    labelKo: "Tokenizer와 BOS 경계",
    labelEn: "Tokenizer and BOS boundary",
    options: [
      repair("character-codepoints", "문자를 codepoint로 바로 사용", "Use character codepoints directly"),
      repair("bos-vocabulary-tokenization", "고정 vocabulary로 tokenize하고 BOS 추가", "Tokenize with the fixed vocabulary and add BOS"),
      repair("omit-bos-token", "prompt token만 사용하고 BOS 생략", "Use prompt tokens without BOS"),
    ],
  },
  "causal-attention": {
    id: "causal-attention",
    labelKo: "Causal mask와 Softmax 순서",
    labelEn: "Causal mask and softmax order",
    options: [
      repair("unmasked-row-softmax", "미래를 포함해 row Softmax", "Apply row softmax with future keys visible"),
      repair("softmax-then-zero-future", "Softmax 뒤 미래 weight를 0", "Zero future weights after softmax"),
      repair("mask-before-row-softmax", "미래 logit 차단 뒤 row Softmax", "Block future logits before row softmax"),
    ],
  },
  "vocab-probabilities": {
    id: "vocab-probabilities",
    labelKo: "Final norm · vocabulary head · CE update",
    labelEn: "Final norm, vocabulary head, and CE update",
    options: [
      repair("sequence-axis-softmax", "token sequence축 Softmax", "Apply softmax over the token sequence axis"),
      repair("skip-final-norm", "final norm 없이 vocabulary projection", "Project to vocabulary without final norm"),
      repair("gradient-ascent-lm-head", "CE gradient를 더해 LM head 갱신", "Add the CE gradient to the LM head"),
      repair("final-norm-vocab-softmax-ce-descent", "final norm→vocab projection→row Softmax/CE→gradient descent", "Use final norm, vocabulary projection, row softmax/CE, then gradient descent"),
    ],
  },
  "autoregressive-loop": {
    id: "autoregressive-loop",
    labelKo: "Autoregressive prefix loop",
    labelEn: "Autoregressive prefix loop",
    options: [
      repair("reuse-first-prefix", "첫 prefix hidden을 모든 step에 재사용", "Reuse the first prefix hidden state at every step"),
      repair("replace-last-token", "새 token을 append하지 않고 마지막 token 교체", "Replace the last token instead of appending"),
      repair("ignore-eos", "EOS 뒤에도 max length까지 계속", "Continue to max length after EOS"),
      repair("append-recompute-stop", "token append→전체 prefix 재계산→EOS/max stop", "Append the token, recompute the full prefix, then stop at EOS or max length"),
    ],
  },
}) satisfies Readonly<Record<MiniTransformerDebuggerScenarioId, MiniTransformerDebuggerScenario>>;

export type MiniTransformerRepairReason =
  | "contract-restored"
  | "outside-vocabulary"
  | "bos-missing"
  | "future-leak"
  | "row-mass-lost"
  | "wrong-softmax-axis"
  | "final-norm-skipped"
  | "loss-increased"
  | "prefix-not-recomputed"
  | "token-not-appended"
  | "eos-ignored";

export type MiniTransformerDebuggerMetrics = Readonly<{
  bosPresent: boolean;
  vocabularyIdsValid: boolean;
  futureMass: number;
  minimumRowSum: number;
  logitsColumns: number;
  maxProbabilityRowSumError: number;
  shiftedTargetsCorrect: boolean;
  finalNormApplied: boolean;
  lossBefore: number;
  lossAfter: number;
  prefixRecomputeFailures: number;
  appendFailures: number;
  eosStopped: boolean;
  maxLengthRespected: boolean;
}>;

export type MiniTransformerRepairResult = Readonly<{
  scenarioId: MiniTransformerDebuggerScenarioId;
  repair: MiniTransformerRepair;
  correct: boolean;
  reason: MiniTransformerRepairReason;
  metrics: MiniTransformerDebuggerMetrics;
}>;

function repairInScenario(scenarioId: MiniTransformerDebuggerScenarioId, candidate: MiniTransformerRepair) {
  return miniTransformerDebuggerScenarios[scenarioId].options.some(({ id }) => id === candidate);
}

function blankDebuggerMetrics(overrides: Partial<MiniTransformerDebuggerMetrics>): MiniTransformerDebuggerMetrics {
  return deepFreeze({
    bosPresent: true,
    vocabularyIdsValid: true,
    futureMass: 0,
    minimumRowSum: 1,
    logitsColumns: MINI_TRANSFORMER_VOCAB_SIZE,
    maxProbabilityRowSumError: 0,
    shiftedTargetsCorrect: true,
    finalNormApplied: true,
    lossBefore: 0,
    lossAfter: 0,
    prefixRecomputeFailures: 0,
    appendFailures: 0,
    eosStopped: true,
    maxLengthRespected: true,
    ...overrides,
  });
}

function softmaxThenZeroFutureMetrics(trace: MiniTransformerForwardTrace) {
  const head = trace.block.attention.heads[0];
  const unmaskedWeights = head.rawScores.map((row) => stableSoftmax(row.map((value) => value / Math.sqrt(MINI_TRANSFORMER_HEAD_DIMENSION))));
  const zeroed = unmaskedWeights.map((row, queryIndex) => row.map((value, keyIndex) => keyIndex <= queryIndex ? value : 0));
  return {
    futureMass: 0,
    minimumRowSum: Math.min(...zeroed.map((row) => row.reduce((sum, value) => sum + value, 0))),
  };
}

function ascentLoss(update: MiniTransformerLmHeadUpdateTrace) {
  const ascentProjection = freezeMatrix(miniTransformerFixture.vocabularyProjection.map((row, featureIndex) => row.map((value, vocabIndex) => (
    value + update.learningRate * update.gradients.projection[featureIndex][vocabIndex]
  ))));
  const ascentBias = freezeVector(miniTransformerFixture.vocabularyBias.map((value, vocabIndex) => (
    value + update.learningRate * update.gradients.bias[vocabIndex]
  )));
  const projected = multiplyMatrices(update.hidden, ascentProjection);
  const logits = freezeMatrix(projected.map((row) => row.map((value, vocabIndex) => value + ascentBias[vocabIndex])));
  return meanNextTokenCrossEntropy(logits, update.targetTokenIds);
}

export function evaluateMiniTransformerRepair(
  scenarioId: MiniTransformerDebuggerScenarioId,
  candidate: MiniTransformerRepair,
): MiniTransformerRepairResult {
  if (!miniTransformerDebuggerScenarioIds.includes(scenarioId)) throw new Error(`Unknown Mini Transformer debugger scenario: ${scenarioId as string}`);
  if (!repairInScenario(scenarioId, candidate)) throw new Error(`Repair ${candidate} does not belong to ${scenarioId}`);
  let correct = false;
  let reason: MiniTransformerRepairReason;
  let metrics: MiniTransformerDebuggerMetrics;

  if (scenarioId === "tokenizer-boundary") {
    const candidateIds: readonly number[] = candidate === "character-codepoints"
      ? Array.from(MINI_TRANSFORMER_LAB_PROMPT).map((character) => character.codePointAt(0) ?? -1)
      : tokenizeMiniTransformer(
          MINI_TRANSFORMER_LAB_PROMPT,
          candidate === "bos-vocabulary-tokenization",
        ).tokenIds;
    const vocabularyIdsValid = candidateIds.every((id) => (
      Number.isInteger(id) && id >= 0 && id < MINI_TRANSFORMER_VOCAB_SIZE
    ));
    const bosPresent = candidateIds[0] === MINI_TRANSFORMER_BOS_ID;
    correct = bosPresent && vocabularyIdsValid;
    reason = correct ? "contract-restored" : !vocabularyIdsValid ? "outside-vocabulary" : "bos-missing";
    metrics = blankDebuggerMetrics({ bosPresent, vocabularyIdsValid });
  } else if (scenarioId === "causal-attention") {
    const canonical = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
    let futureMass: number;
    let minimumRowSum: number;
    if (candidate === "mask-before-row-softmax") {
      futureMass = futureAttentionMass(canonical);
      minimumRowSum = Math.min(...canonical.block.attention.heads.flatMap(({ rowSums }) => [...rowSums]));
    } else if (candidate === "unmasked-row-softmax") {
      const unmasked = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, { ...canonicalMiniTransformerConfig, causal: false });
      futureMass = futureAttentionMass(unmasked);
      minimumRowSum = Math.min(...unmasked.block.attention.heads.flatMap(({ rowSums }) => [...rowSums]));
    } else {
      ({ futureMass, minimumRowSum } = softmaxThenZeroFutureMetrics(canonical));
    }
    correct = futureMass <= 1e-12 && Math.abs(minimumRowSum - 1) <= 1e-10;
    reason = correct ? "contract-restored" : futureMass > 1e-12 ? "future-leak" : "row-mass-lost";
    metrics = blankDebuggerMetrics({ futureMass, minimumRowSum });
  } else if (scenarioId === "vocab-probabilities") {
    const update = runMiniTransformerLmHeadUpdate();
    const forward = runMiniTransformer(MINI_TRANSFORMER_TRAINING_TEXT);
    let logitsColumns: number = MINI_TRANSFORMER_VOCAB_SIZE;
    let maxProbabilityRowSumError = 0;
    let finalNormApplied = true;
    let lossAfter = update.meanLossAfter;
    if (candidate === "sequence-axis-softmax") {
      const sequenceProbabilities = probabilitiesForLogits(forward.logits, "sequence");
      maxProbabilityRowSumError = Math.max(...sequenceProbabilities.map((row) => Math.abs(row.reduce((sum, value) => sum + value, 0) - 1)));
    } else if (candidate === "skip-final-norm") {
      finalNormApplied = false;
      const projected = multiplyMatrices(forward.block.output, miniTransformerFixture.vocabularyProjection);
      const logits = freezeMatrix(projected.map((row) => row.map((value, vocabIndex) => value + miniTransformerFixture.vocabularyBias[vocabIndex])));
      logitsColumns = logits[0].length;
      lossAfter = meanNextTokenCrossEntropy(logits, update.targetTokenIds);
    } else if (candidate === "gradient-ascent-lm-head") {
      lossAfter = ascentLoss(update);
    }
    const shiftedTargetsCorrect = update.targetTokenIds.join(",") === "1,2,3,4,5";
    correct = logitsColumns === MINI_TRANSFORMER_VOCAB_SIZE
      && maxProbabilityRowSumError <= 1e-10
      && shiftedTargetsCorrect
      && finalNormApplied
      && lossAfter < update.meanLossBefore;
    reason = correct
      ? "contract-restored"
      : maxProbabilityRowSumError > 1e-10
        ? "wrong-softmax-axis"
        : !finalNormApplied
          ? "final-norm-skipped"
          : "loss-increased";
    metrics = blankDebuggerMetrics({
      logitsColumns,
      maxProbabilityRowSumError,
      shiftedTargetsCorrect,
      finalNormApplied,
      lossBefore: update.meanLossBefore,
      lossAfter,
    });
  } else {
    const canonicalGeneration = generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
    let prefixRecomputeFailures = 0;
    let appendFailures = 0;
    let eosStopped = true;
    let maxLengthRespected = canonicalGeneration.steps.length <= canonicalGeneration.config.maxNewTokens;
    if (candidate === "append-recompute-stop") {
      ({ prefixRecomputeFailures, appendFailures } = generationContractFailures(canonicalGeneration));
      eosStopped = generateMiniTransformer("the").stopReason === "eos";
    } else if (candidate === "reuse-first-prefix") {
      const reused = generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, { ...canonicalMiniTransformerConfig, recomputePrefix: false });
      ({ prefixRecomputeFailures, appendFailures } = generationContractFailures(reused));
    } else if (candidate === "replace-last-token") {
      ({ prefixRecomputeFailures } = generationContractFailures(canonicalGeneration));
      let replacementPrefix = [...canonicalGeneration.initialTokenIds];
      canonicalGeneration.steps.forEach(({ emittedTokenId }) => {
        const appended = [...replacementPrefix, emittedTokenId];
        const replaced = [...replacementPrefix.slice(0, -1), emittedTokenId];
        if (appended.join(",") !== replaced.join(",")) appendFailures += 1;
        replacementPrefix = replaced;
      });
    } else {
      const ignored = generateMiniTransformer("the", { ...canonicalMiniTransformerConfig, stopAtEos: false, maxNewTokens: 2 });
      ({ prefixRecomputeFailures, appendFailures } = generationContractFailures(ignored));
      eosStopped = ignored.stopReason === "eos";
      maxLengthRespected = ignored.steps.length <= ignored.config.maxNewTokens;
    }
    correct = prefixRecomputeFailures === 0 && appendFailures === 0 && eosStopped && maxLengthRespected;
    reason = correct
      ? "contract-restored"
      : prefixRecomputeFailures > 0
        ? "prefix-not-recomputed"
        : appendFailures > 0
          ? "token-not-appended"
          : "eos-ignored";
    metrics = blankDebuggerMetrics({ prefixRecomputeFailures, appendFailures, eosStopped, maxLengthRespected });
  }
  return deepFreeze({ scenarioId, repair: candidate, correct, reason, metrics });
}

export function canCompleteMiniTransformerChapter({
  labComplete,
  conceptsMastered,
}: {
  labComplete: boolean;
  debuggerComplete?: boolean;
  conceptsMastered: boolean;
}) {
  return labComplete && conceptsMastered;
}

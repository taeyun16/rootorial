export const SELF_ATTENTION_TOKEN_COUNT = 4;
export const SELF_ATTENTION_MODEL_DIMENSION = 4;
export const SELF_ATTENTION_HEAD_COUNT = 2;
export const SELF_ATTENTION_HEAD_DIMENSION = 2;

export type NumericVector = readonly number[];
export type NumericMatrix = readonly NumericVector[];
export type BooleanMatrix = readonly (readonly boolean[])[];
export type MaskedMatrix = readonly (readonly (number | null)[])[];

export const selfAttentionTokens = Object.freeze(["the", "cat", "sat", "<pad>"] as const);

const fixtureInput = [
  [1, 0, 2, 0],
  [0, 1, 1, 0],
  [1, 1, 0, 1],
  [0, 0, 1, 1],
] as const;

const fixtureWq = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 1, 0],
  [0, 0, 0, 1],
] as const;

const fixtureWk = [
  [1, 0, 0, 0],
  [0, 1, 0, 0],
  [0, 0, 0, 1],
  [0, 0, 1, 0],
] as const;

const fixtureWv = [
  [0, 0, 1, 0],
  [0, 0, 0, 1],
  [1, 0, 0, 0],
  [0, 1, 0, 0],
] as const;

const fixtureWo = fixtureWq;

export const selfAttentionFixture = Object.freeze({
  input: freezeMatrix(fixtureInput),
  wq: freezeMatrix(fixtureWq),
  wk: freezeMatrix(fixtureWk),
  wv: freezeMatrix(fixtureWv),
  wo: freezeMatrix(fixtureWo),
  queryActive: Object.freeze([true, true, true, false]),
  keyVisible: Object.freeze([true, true, true, false]),
});

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

function assertMatrix(
  matrix: readonly (readonly number[])[],
  label: string,
  rows: number,
  columns: number,
) {
  if (!Array.isArray(matrix) || matrix.length !== rows) {
    throw new Error(`${label} must have shape [${rows},${columns}]`);
  }
  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== columns) {
      throw new Error(`${label} row ${rowIndex} must contain ${columns} values`);
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
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function transpose(matrix: NumericMatrix): number[][] {
  if (!matrix.length) return [];
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiplyMatrices(left: NumericMatrix, right: NumericMatrix): number[][] {
  if (!left.length || !right.length || left[0].length !== right.length) {
    throw new Error("Matrix inner dimensions must align");
  }
  const rightColumns = transpose(right);
  const result = left.map((row) => rightColumns.map((column) => dot(row, column)));
  if (result.flat().some((value) => !Number.isFinite(value))) {
    throw new Error("Self-attention matrix multiplication overflowed");
  }
  return result;
}

function stableMaskedSoftmax(row: readonly (number | null)[]): number[] {
  const allowed = row.flatMap((value) => value === null ? [] : [value]);
  if (!allowed.length) return row.map(() => 0);
  const maximum = Math.max(...allowed);
  const exponents = row.map((value) => value === null ? 0 : Math.exp(value - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Masked softmax normalization failed");
  return exponents.map((value) => value / total);
}

function entropy(row: NumericVector) {
  return row.reduce((sum, value) => value > 0 ? sum - value * Math.log(value) : sum, 0);
}

function topIndices(row: NumericVector): readonly number[] {
  if (!row.some((value) => value > 0)) return Object.freeze([]);
  const maximum = Math.max(...row);
  return Object.freeze(row.flatMap((value, index) => Math.abs(value - maximum) <= 1e-12 ? [index] : []));
}

function matrixApproximatelyEqual(left: NumericMatrix, right: NumericMatrix, tolerance = 1e-12) {
  return left.length === right.length && left.every((row, rowIndex) => (
    row.length === right[rowIndex]?.length
    && row.every((value, columnIndex) => Math.abs(value - right[rowIndex][columnIndex]) <= tolerance)
  ));
}

export function splitHeads(
  matrix: NumericMatrix,
  headCount = SELF_ATTENTION_HEAD_COUNT,
): readonly NumericMatrix[] {
  if (!Number.isInteger(headCount) || headCount < 1) throw new Error("headCount must be a positive integer");
  const columns = matrix[0]?.length ?? 0;
  if (!matrix.length || matrix.some((row) => row.length !== columns)) {
    throw new Error("splitHeads needs a non-empty rectangular matrix");
  }
  if (columns % headCount !== 0) throw new Error("Model dimension must be divisible by head count");
  const headDimension = columns / headCount;
  return Object.freeze(Array.from({ length: headCount }, (_, headIndex) => freezeMatrix(
    matrix.map((row) => row.slice(headIndex * headDimension, (headIndex + 1) * headDimension)),
  )));
}

export function concatHeads(heads: readonly NumericMatrix[]): NumericMatrix {
  if (!heads.length) throw new Error("concatHeads needs at least one head");
  const rows = heads[0].length;
  const columns = heads[0][0]?.length ?? 0;
  if (!rows || !columns || heads.some((head) => (
    head.length !== rows || head.some((row) => row.length !== columns)
  ))) {
    throw new Error("All heads must share [token, head-dimension] shape");
  }
  return freezeMatrix(Array.from({ length: rows }, (_, rowIndex) => (
    heads.flatMap((head) => [...head[rowIndex]])
  )));
}

export type SelfAttentionRunConfig = {
  causal: boolean;
  scaleScores: boolean;
  exposePaddingKey: boolean;
  inputGain: number;
};

export const canonicalSelfAttentionConfig: Readonly<SelfAttentionRunConfig> = Object.freeze({
  causal: true,
  scaleScores: true,
  exposePaddingKey: false,
  inputGain: 1,
});

export type SelfAttentionHeadTrace = {
  headIndex: number;
  q: NumericMatrix;
  k: NumericMatrix;
  v: NumericMatrix;
  rawScores: NumericMatrix;
  scaledScores: NumericMatrix;
  allowed: BooleanMatrix;
  maskedScores: MaskedMatrix;
  weights: NumericMatrix;
  contexts: NumericMatrix;
  topKeyIndices: readonly (readonly number[])[];
  rowSums: NumericVector;
  entropies: NumericVector;
};

export type SelfAttentionTrace = {
  config: Readonly<SelfAttentionRunConfig>;
  input: NumericMatrix;
  projected: Readonly<{ q: NumericMatrix; k: NumericMatrix; v: NumericMatrix }>;
  heads: readonly SelfAttentionHeadTrace[];
  concatenated: NumericMatrix;
  attentionOutput: NumericMatrix;
  handoff: Readonly<{
    inputShape: readonly [number, number];
    outputShape: readonly [number, number];
    residualCompatible: boolean;
    appliedResidual: false;
    includesPosition: false;
    includesLayerNorm: false;
    includesFfn: false;
  }>;
};

function validateRunConfig(config: SelfAttentionRunConfig) {
  if (!config || typeof config !== "object") throw new Error("Self-attention config is required");
  if (typeof config.causal !== "boolean" || typeof config.scaleScores !== "boolean" || typeof config.exposePaddingKey !== "boolean") {
    throw new Error("Mask and scaling controls must be boolean");
  }
  if (!Number.isFinite(config.inputGain) || config.inputGain < 0.25 || config.inputGain > 4) {
    throw new Error("Input gain must be finite and between 0.25 and 4");
  }
}

export function runSelfAttention(config: SelfAttentionRunConfig = canonicalSelfAttentionConfig): SelfAttentionTrace {
  validateRunConfig(config);
  assertMatrix(selfAttentionFixture.input, "X", SELF_ATTENTION_TOKEN_COUNT, SELF_ATTENTION_MODEL_DIMENSION);
  const input = freezeMatrix(selfAttentionFixture.input.map((row) => row.map((value) => value * config.inputGain)));
  const projected = Object.freeze({
    q: freezeMatrix(multiplyMatrices(input, selfAttentionFixture.wq)),
    k: freezeMatrix(multiplyMatrices(input, selfAttentionFixture.wk)),
    v: freezeMatrix(multiplyMatrices(input, selfAttentionFixture.wv)),
  });
  const qHeads = splitHeads(projected.q);
  const kHeads = splitHeads(projected.k);
  const vHeads = splitHeads(projected.v);
  const queryActive = selfAttentionFixture.queryActive;
  const keyVisible = config.exposePaddingKey
    ? Object.freeze([true, true, true, true])
    : selfAttentionFixture.keyVisible;
  const divisor = config.scaleScores ? Math.sqrt(SELF_ATTENTION_HEAD_DIMENSION) : 1;

  const heads = Object.freeze(qHeads.map((q, headIndex): SelfAttentionHeadTrace => {
    const k = kHeads[headIndex];
    const v = vHeads[headIndex];
    const rawScores = freezeMatrix(multiplyMatrices(q, transpose(k)));
    const scaledScores = freezeMatrix(rawScores.map((row) => row.map((value) => value / divisor)));
    const allowed = freezeBooleanMatrix(Array.from({ length: SELF_ATTENTION_TOKEN_COUNT }, (_, queryIndex) => (
      Array.from({ length: SELF_ATTENTION_TOKEN_COUNT }, (_, keyIndex) => (
        queryActive[queryIndex]
        && keyVisible[keyIndex]
        && (!config.causal || keyIndex <= queryIndex)
      ))
    )));
    const maskedScores = freezeMaskedMatrix(scaledScores.map((row, queryIndex) => (
      row.map((value, keyIndex) => allowed[queryIndex][keyIndex] ? value : null)
    )));
    const weights = freezeMatrix(maskedScores.map(stableMaskedSoftmax));
    const contexts = freezeMatrix(multiplyMatrices(weights, v));
    return Object.freeze({
      headIndex,
      q,
      k,
      v,
      rawScores,
      scaledScores,
      allowed,
      maskedScores,
      weights,
      contexts,
      topKeyIndices: Object.freeze(weights.map(topIndices)),
      rowSums: freezeVector(weights.map((row) => row.reduce((sum, value) => sum + value, 0))),
      entropies: freezeVector(weights.map(entropy)),
    });
  }));
  const concatenated = concatHeads(heads.map(({ contexts }) => contexts));
  const attentionOutput = freezeMatrix(multiplyMatrices(concatenated, selfAttentionFixture.wo));
  return Object.freeze({
    config: Object.freeze({ ...config }),
    input,
    projected,
    heads,
    concatenated,
    attentionOutput,
    handoff: Object.freeze({
      inputShape: Object.freeze([SELF_ATTENTION_TOKEN_COUNT, SELF_ATTENTION_MODEL_DIMENSION]) as readonly [number, number],
      outputShape: Object.freeze([attentionOutput.length, attentionOutput[0]?.length ?? 0]) as readonly [number, number],
      residualCompatible: attentionOutput.length === input.length && attentionOutput[0]?.length === input[0]?.length,
      appliedResidual: false,
      includesPosition: false,
      includesLayerNorm: false,
      includesFfn: false,
    }),
  });
}

export type SelfAttentionChallengeId = "projection" | "scaling" | "causal-mask" | "padding-key" | "multi-head";
export type SelfAttentionPrediction =
  | "same-x-separate-qkv"
  | "qkv-identical"
  | "only-v-differs"
  | "same-top-higher-entropy"
  | "top-changes"
  | "scaled-is-sharper"
  | "future-zero-row-renormalized"
  | "future-small-positive"
  | "current-also-blocked"
  | "padding-gains-mass-active-renormalizes-pad-query-zero"
  | "padding-query-activates"
  | "nothing-changes"
  | "concat-preserves-token-shape"
  | "average-heads-to-two"
  | "concat-weight-tables";
export type SelfAttentionInspectStage = "projections" | "scores" | "mask" | "weights" | "output";

export const selfAttentionChallengeIds = Object.freeze([
  "projection", "scaling", "causal-mask", "padding-key", "multi-head",
] as const) satisfies readonly SelfAttentionChallengeId[];

export const selfAttentionCoreChallengeIds = Object.freeze([
  "projection", "causal-mask", "multi-head",
] as const) satisfies readonly SelfAttentionChallengeId[];

export const selfAttentionChallengeDefaults: Readonly<Record<SelfAttentionChallengeId, Readonly<SelfAttentionRunConfig>>> = Object.freeze({
  projection: canonicalSelfAttentionConfig,
  scaling: Object.freeze({ ...canonicalSelfAttentionConfig, scaleScores: false }),
  "causal-mask": Object.freeze({ ...canonicalSelfAttentionConfig, causal: false }),
  "padding-key": Object.freeze({ ...canonicalSelfAttentionConfig, causal: false, exposePaddingKey: false }),
  "multi-head": canonicalSelfAttentionConfig,
});

const expectedChallengePredictions: Readonly<Record<SelfAttentionChallengeId, SelfAttentionPrediction>> = Object.freeze({
  projection: "same-x-separate-qkv",
  scaling: "same-top-higher-entropy",
  "causal-mask": "future-zero-row-renormalized",
  "padding-key": "padding-gains-mass-active-renormalizes-pad-query-zero",
  "multi-head": "concat-preserves-token-shape",
});

const expectedChallengeStages: Readonly<Record<SelfAttentionChallengeId, SelfAttentionInspectStage>> = Object.freeze({
  projection: "projections",
  scaling: "scores",
  "causal-mask": "mask",
  "padding-key": "weights",
  "multi-head": "output",
});

function challengeConfigCorrect(challengeId: SelfAttentionChallengeId, config: SelfAttentionRunConfig) {
  const base = config.inputGain === 1;
  if (!base) return false;
  if (challengeId === "projection" || challengeId === "multi-head") {
    return config.causal && config.scaleScores && !config.exposePaddingKey;
  }
  if (challengeId === "scaling") return config.causal && config.scaleScores && !config.exposePaddingKey;
  if (challengeId === "causal-mask") return config.causal && config.scaleScores && !config.exposePaddingKey;
  return !config.causal && config.scaleScores && config.exposePaddingKey;
}

export type SelfAttentionChallengeGrade = {
  correct: boolean;
  predictionCorrect: boolean;
  configCorrect: boolean;
  observed: Readonly<{
    qkvDifferent: boolean;
    sameTopAfterScaling: boolean;
    scaledEntropyHigher: boolean;
    futureMass: number;
    activeRowSum: number;
    paddingMass: number;
    paddingQueryMass: number;
    outputShape: readonly [number, number];
  }>;
};

export function gradeSelfAttentionChallenge(
  challengeId: SelfAttentionChallengeId,
  prediction: SelfAttentionPrediction,
  config: SelfAttentionRunConfig,
): SelfAttentionChallengeGrade {
  if (!selfAttentionChallengeIds.includes(challengeId)) throw new Error(`Unknown Self-Attention challenge: ${challengeId as string}`);
  const trace = runSelfAttention(config);
  const scaled = runSelfAttention({ ...canonicalSelfAttentionConfig, causal: false, scaleScores: true });
  const unscaled = runSelfAttention({ ...canonicalSelfAttentionConfig, causal: false, scaleScores: false });
  const scaledRow = scaled.heads[1].weights[2];
  const unscaledRow = unscaled.heads[1].weights[2];
  const causalRow = trace.heads[1].weights[1];
  const paddingRow = trace.heads[1].weights[0];
  const qkvDifferent = !matrixApproximatelyEqual(trace.projected.q, trace.projected.k)
    && !matrixApproximatelyEqual(trace.projected.q, trace.projected.v)
    && !matrixApproximatelyEqual(trace.projected.k, trace.projected.v);
  const observed = Object.freeze({
    qkvDifferent,
    sameTopAfterScaling: topIndices(scaledRow).join(",") === topIndices(unscaledRow).join(","),
    scaledEntropyHigher: entropy(scaledRow) > entropy(unscaledRow),
    futureMass: causalRow.slice(2).reduce((sum, value) => sum + value, 0),
    activeRowSum: causalRow.reduce((sum, value) => sum + value, 0),
    paddingMass: paddingRow[3],
    paddingQueryMass: trace.heads[1].weights[3].reduce((sum, value) => sum + value, 0),
    outputShape: Object.freeze([trace.attentionOutput.length, trace.attentionOutput[0]?.length ?? 0]) as readonly [number, number],
  });
  const semanticCorrect = challengeId === "projection"
    ? observed.qkvDifferent
    : challengeId === "scaling"
      ? observed.sameTopAfterScaling && observed.scaledEntropyHigher
      : challengeId === "causal-mask"
        ? observed.futureMass <= 1e-12 && Math.abs(observed.activeRowSum - 1) <= 1e-12
        : challengeId === "padding-key"
          ? observed.paddingMass > 0 && Math.abs(observed.activeRowSum - 1) <= 1e-12 && observed.paddingQueryMass === 0
          : observed.outputShape[0] === SELF_ATTENTION_TOKEN_COUNT && observed.outputShape[1] === SELF_ATTENTION_MODEL_DIMENSION;
  const predictionCorrect = prediction === expectedChallengePredictions[challengeId];
  const configCorrect = challengeConfigCorrect(challengeId, config);
  return Object.freeze({ correct: predictionCorrect && configCorrect && semanticCorrect, predictionCorrect, configCorrect, observed });
}

type EvidenceBase = {
  eventId: string;
  attemptId: string;
  challengeId: SelfAttentionChallengeId;
  config: Readonly<SelfAttentionRunConfig>;
};

export type SelfAttentionLabEvidenceEvent =
  | (EvidenceBase & { kind: "prediction"; prediction: SelfAttentionPrediction })
  | (EvidenceBase & { kind: "run" })
  | (EvidenceBase & {
      kind: "inspect";
      stage: SelfAttentionInspectStage;
      headIndex: number;
      queryIndex: number;
      keyIndex: number | null;
    });

export type SelfAttentionLabEvidence = { events: readonly SelfAttentionLabEvidenceEvent[] };
export const emptySelfAttentionLabEvidence: SelfAttentionLabEvidence = Object.freeze({ events: Object.freeze([]) });

export type SelfAttentionLabMastery = {
  mastered: boolean;
  reason: "mastered" | "invalid-evidence" | "complete-core-challenges";
  completedChallengeIds: readonly SelfAttentionChallengeId[];
};

type AttemptState = {
  challengeId: SelfAttentionChallengeId;
  prediction: SelfAttentionPrediction;
  config: SelfAttentionRunConfig;
  ran: boolean;
  correct: boolean;
};

function configsEqual(left: SelfAttentionRunConfig, right: SelfAttentionRunConfig) {
  return left.causal === right.causal
    && left.scaleScores === right.scaleScores
    && left.exposePaddingKey === right.exposePaddingKey
    && left.inputGain === right.inputGain;
}

function masteryResult(
  reason: SelfAttentionLabMastery["reason"],
  completed: ReadonlySet<SelfAttentionChallengeId>,
): SelfAttentionLabMastery {
  return Object.freeze({
    mastered: reason === "mastered",
    reason,
    completedChallengeIds: Object.freeze(selfAttentionChallengeIds.filter((id) => completed.has(id))),
  });
}

function validId(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

function validIndex(value: unknown, size: number): value is number {
  return Number.isInteger(value) && (value as number) >= 0 && (value as number) < size;
}

function rowsApproximatelyEqual(left: NumericVector, right: NumericVector) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) <= 1e-12);
}

export type SelfAttentionInspection = {
  stage: SelfAttentionInspectStage;
  headIndex: number;
  queryIndex: number;
  keyIndex: number | null;
};

export function isValidSelfAttentionInspection(
  challengeId: SelfAttentionChallengeId,
  config: SelfAttentionRunConfig,
  inspection: SelfAttentionInspection,
) {
  if (
    inspection.stage !== expectedChallengeStages[challengeId]
    || !validIndex(inspection.headIndex, SELF_ATTENTION_HEAD_COUNT)
    || !validIndex(inspection.queryIndex, SELF_ATTENTION_TOKEN_COUNT)
    || inspection.keyIndex !== null && !validIndex(inspection.keyIndex, SELF_ATTENTION_TOKEN_COUNT)
  ) return false;
  const trace = runSelfAttention(config);
  const head = trace.heads[inspection.headIndex];
  const queryIndex = inspection.queryIndex;

  if (challengeId === "projection") {
    if (inspection.keyIndex !== null || !selfAttentionFixture.queryActive[queryIndex]) return false;
    const rows = [head.q[queryIndex], head.k[queryIndex], head.v[queryIndex]];
    return !rowsApproximatelyEqual(rows[0], rows[1])
      && !rowsApproximatelyEqual(rows[0], rows[2])
      && !rowsApproximatelyEqual(rows[1], rows[2]);
  }
  if (challengeId === "scaling") {
    if (inspection.keyIndex !== null || !selfAttentionFixture.queryActive[queryIndex]) return false;
    const unscaled = runSelfAttention({ ...config, scaleScores: false });
    const scaledWeights = head.weights[queryIndex];
    const unscaledWeights = unscaled.heads[inspection.headIndex].weights[queryIndex];
    return head.rawScores[queryIndex].some((value, index) => (
      Math.abs(value - head.scaledScores[queryIndex][index]) > 1e-12
    ))
      && topIndices(scaledWeights).join(",") === topIndices(unscaledWeights).join(",")
      && entropy(scaledWeights) > entropy(unscaledWeights);
  }
  if (challengeId === "causal-mask") {
    const keyIndex = inspection.keyIndex;
    return queryIndex === 1
      && keyIndex !== null
      && keyIndex > queryIndex
      && head.maskedScores[queryIndex][keyIndex] === null
      && head.weights[queryIndex][keyIndex] === 0;
  }
  if (challengeId === "padding-key") {
    return queryIndex === 0
      && inspection.keyIndex === 3
      && selfAttentionFixture.queryActive[queryIndex]
      && head.allowed[queryIndex][3]
      && head.weights[queryIndex][3] > 0;
  }
  return inspection.keyIndex === null
    && selfAttentionFixture.queryActive[queryIndex]
    && trace.handoff.residualCompatible
    && trace.handoff.outputShape[0] === SELF_ATTENTION_TOKEN_COUNT
    && trace.handoff.outputShape[1] === SELF_ATTENTION_MODEL_DIMENSION;
}

export function evaluateSelfAttentionLabMastery(evidence: SelfAttentionLabEvidence): SelfAttentionLabMastery {
  const completed = new Set<SelfAttentionChallengeId>();
  if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.events)) {
    return masteryResult("invalid-evidence", completed);
  }
  const eventIds = new Set<string>();
  const attempts = new Map<string, AttemptState>();
  for (const rawEvent of evidence.events as readonly unknown[]) {
    if (!rawEvent || typeof rawEvent !== "object") return masteryResult("invalid-evidence", completed);
    const event = rawEvent as Partial<SelfAttentionLabEvidenceEvent>;
    if (!validId(event.eventId) || eventIds.has(event.eventId) || !validId(event.attemptId) || !event.challengeId || !selfAttentionChallengeIds.includes(event.challengeId) || !event.config) {
      return masteryResult("invalid-evidence", completed);
    }
    eventIds.add(event.eventId);
    try { runSelfAttention(event.config); } catch { return masteryResult("invalid-evidence", completed); }
    if (event.kind === "prediction") {
      if (!event.prediction || attempts.has(event.attemptId)) return masteryResult("invalid-evidence", completed);
      attempts.set(event.attemptId, { challengeId: event.challengeId, prediction: event.prediction, config: { ...event.config }, ran: false, correct: false });
      continue;
    }
    const attempt = attempts.get(event.attemptId);
    if (!attempt || attempt.challengeId !== event.challengeId || !configsEqual(attempt.config, event.config)) {
      return masteryResult("invalid-evidence", completed);
    }
    if (event.kind === "run") {
      if (attempt.ran) return masteryResult("invalid-evidence", completed);
      attempt.ran = true;
      attempt.correct = gradeSelfAttentionChallenge(attempt.challengeId, attempt.prediction, attempt.config).correct;
      continue;
    }
    if (event.kind === "inspect") {
      const inspection = event as Partial<Extract<SelfAttentionLabEvidenceEvent, { kind: "inspect" }>>;
      if (
        !attempt.ran
        || !attempt.correct
        || !inspection.stage
        || !validIndex(inspection.headIndex, SELF_ATTENTION_HEAD_COUNT)
        || !validIndex(inspection.queryIndex, SELF_ATTENTION_TOKEN_COUNT)
        || inspection.keyIndex !== null && !validIndex(inspection.keyIndex, SELF_ATTENTION_TOKEN_COUNT)
        || !isValidSelfAttentionInspection(event.challengeId, attempt.config, {
          stage: inspection.stage,
          headIndex: inspection.headIndex,
          queryIndex: inspection.queryIndex,
          keyIndex: inspection.keyIndex,
        })
      ) {
        return masteryResult("invalid-evidence", completed);
      }
      completed.add(event.challengeId);
      continue;
    }
    return masteryResult("invalid-evidence", completed);
  }
  return selfAttentionCoreChallengeIds.every((challengeId) => completed.has(challengeId))
    ? masteryResult("mastered", completed)
    : masteryResult("complete-core-challenges", completed);
}

export type SelfAttentionDebuggerScenarioId = "qkv-projections" | "score-scaling" | "mask-softmax" | "head-merge-handoff";
export type SelfAttentionRepair =
  | "reuse-query-for-kv" | "project-qkv-independently" | "use-raw-x-for-qkv"
  | "divide-by-head-dimension" | "leave-unscaled" | "divide-by-sqrt-head-dimension"
  | "mask-before-softmax" | "softmax-then-zero" | "causal-only" | "padding-only"
  | "average-heads" | "concat-features-then-output" | "concat-token-axis";

export type SelfAttentionDebuggerOption = { id: SelfAttentionRepair; labelKo: string; labelEn: string };
export type SelfAttentionDebuggerScenario = { id: SelfAttentionDebuggerScenarioId; labelKo: string; labelEn: string; options: readonly SelfAttentionDebuggerOption[] };

function repair(id: SelfAttentionRepair, labelKo: string, labelEn: string): SelfAttentionDebuggerOption {
  return Object.freeze({ id, labelKo, labelEn });
}

export const selfAttentionDebuggerScenarioIds = Object.freeze([
  "qkv-projections", "score-scaling", "mask-softmax", "head-merge-handoff",
] as const) satisfies readonly SelfAttentionDebuggerScenarioId[];

export const selfAttentionDebuggerScenarios = Object.freeze({
  "qkv-projections": Object.freeze({ id: "qkv-projections", labelKo: "Q/K/V projection", labelEn: "Q/K/V projections", options: Object.freeze([
    repair("reuse-query-for-kv", "Q를 K/V로 복사", "Reuse Q as K and V"),
    repair("project-qkv-independently", "XWQ · XWK · XWV를 각각 계산", "Compute XWQ, XWK, and XWV independently"),
    repair("use-raw-x-for-qkv", "raw X를 Q/K/V로 재사용", "Reuse raw X as Q, K, and V"),
  ]) }),
  "score-scaling": Object.freeze({ id: "score-scaling", labelKo: "score scaling", labelEn: "Score scaling", options: Object.freeze([
    repair("divide-by-head-dimension", "d_h로 나누기", "Divide by d_h"),
    repair("leave-unscaled", "나누지 않기", "Leave scores unscaled"),
    repair("divide-by-sqrt-head-dimension", "√d_h로 나누기", "Divide by sqrt(d_h)"),
  ]) }),
  "mask-softmax": Object.freeze({ id: "mask-softmax", labelKo: "mask와 Softmax 순서", labelEn: "Mask and softmax order", options: Object.freeze([
    repair("mask-before-softmax", "causal·padding logit 차단 후 row Softmax", "Block causal and padding logits before row softmax"),
    repair("softmax-then-zero", "Softmax 뒤 미래·padding weight만 0", "Zero future and padding weights after softmax"),
    repair("causal-only", "causal mask만 적용", "Apply only the causal mask"),
    repair("padding-only", "padding mask만 적용", "Apply only the padding mask"),
  ]) }),
  "head-merge-handoff": Object.freeze({ id: "head-merge-handoff", labelKo: "head merge와 handoff", labelEn: "Head merge and handoff", options: Object.freeze([
    repair("average-heads", "head context를 평균", "Average head contexts"),
    repair("concat-features-then-output", "token별 head feature concat 후 W_O", "Concatenate head features per token, then apply W_O"),
    repair("concat-token-axis", "head를 token 축으로 이어 붙임", "Concatenate heads on the token axis"),
  ]) }),
}) satisfies Readonly<Record<SelfAttentionDebuggerScenarioId, SelfAttentionDebuggerScenario>>;

export type SelfAttentionRepairReason = "contract-restored" | "qkv-roles-collapsed" | "raw-input-bypassed-projections" | "wrong-scale-divisor" | "scores-unscaled" | "row-mass-lost" | "padding-leak" | "future-leak" | "head-features-averaged" | "token-axis-expanded";
export type SelfAttentionDebuggerMetrics = {
  qColumns: number; kColumns: number; vColumns: number;
  divisor: number | null; entropy: number | null;
  futureMass: number; paddingMass: number; minimumActiveRowSum: number; inactiveQueryMass: number;
  outputRows: number; outputColumns: number;
};
export type SelfAttentionRepairResult = { scenarioId: SelfAttentionDebuggerScenarioId; repair: SelfAttentionRepair; correct: boolean; reason: SelfAttentionRepairReason; metrics: SelfAttentionDebuggerMetrics };

function repairInScenario(scenarioId: SelfAttentionDebuggerScenarioId, candidate: SelfAttentionRepair) {
  return selfAttentionDebuggerScenarios[scenarioId].options.some(({ id }) => id === candidate);
}

function blankMetrics(): SelfAttentionDebuggerMetrics {
  return { qColumns: 0, kColumns: 0, vColumns: 0, divisor: null, entropy: null, futureMass: 0, paddingMass: 0, minimumActiveRowSum: 0, inactiveQueryMass: 0, outputRows: 0, outputColumns: 0 };
}

function weightsForAllowed(scores: NumericMatrix, allowed: BooleanMatrix, divisor: number) {
  return freezeMatrix(scores.map((row, queryIndex) => stableMaskedSoftmax(row.map((value, keyIndex) => allowed[queryIndex][keyIndex] ? value / divisor : null))));
}

export function evaluateSelfAttentionRepair(
  scenarioId: SelfAttentionDebuggerScenarioId,
  candidate: SelfAttentionRepair,
): SelfAttentionRepairResult {
  if (!selfAttentionDebuggerScenarioIds.includes(scenarioId)) throw new Error(`Unknown Self-Attention debugger scenario: ${scenarioId as string}`);
  if (!repairInScenario(scenarioId, candidate)) throw new Error(`Repair ${candidate} does not belong to ${scenarioId}`);
  const canonical = runSelfAttention(canonicalSelfAttentionConfig);
  const metrics = blankMetrics();
  let correct = false;
  let reason: SelfAttentionRepairReason;

  if (scenarioId === "qkv-projections") {
    const projected = candidate === "project-qkv-independently"
      ? canonical.projected
      : candidate === "reuse-query-for-kv"
        ? { q: canonical.projected.q, k: canonical.projected.q, v: canonical.projected.q }
        : { q: canonical.input, k: canonical.input, v: canonical.input };
    metrics.qColumns = projected.q[0]?.length ?? 0;
    metrics.kColumns = projected.k[0]?.length ?? 0;
    metrics.vColumns = projected.v[0]?.length ?? 0;
    correct = matrixApproximatelyEqual(projected.q, canonical.projected.q)
      && matrixApproximatelyEqual(projected.k, canonical.projected.k)
      && matrixApproximatelyEqual(projected.v, canonical.projected.v)
      && matrixApproximatelyEqual(concatHeads(splitHeads(projected.v)), projected.v);
    reason = correct ? "contract-restored" : candidate === "reuse-query-for-kv" ? "qkv-roles-collapsed" : "raw-input-bypassed-projections";
  } else if (scenarioId === "score-scaling") {
    const divisor = candidate === "divide-by-sqrt-head-dimension" ? Math.sqrt(SELF_ATTENTION_HEAD_DIMENSION) : candidate === "divide-by-head-dimension" ? SELF_ATTENTION_HEAD_DIMENSION : 1;
    const weights = weightsForAllowed(canonical.heads[1].rawScores, canonical.heads[1].allowed, divisor);
    metrics.divisor = divisor;
    metrics.entropy = entropy(weights[2]);
    correct = matrixApproximatelyEqual(weights, canonical.heads[1].weights);
    reason = correct ? "contract-restored" : candidate === "leave-unscaled" ? "scores-unscaled" : "wrong-scale-divisor";
  } else if (scenarioId === "mask-softmax") {
    const causalTarget = runSelfAttention(canonicalSelfAttentionConfig);
    const paddingTarget = runSelfAttention({ ...canonicalSelfAttentionConfig, causal: false });
    const fullAllowed = freezeBooleanMatrix(Array.from({ length: 4 }, (_, queryIndex) => Array.from({ length: 4 }, (_, keyIndex) => selfAttentionFixture.queryActive[queryIndex] && (
      candidate === "causal-only" ? keyIndex <= queryIndex
        : candidate === "padding-only" ? selfAttentionFixture.keyVisible[keyIndex]
          : selfAttentionFixture.keyVisible[keyIndex] && keyIndex <= queryIndex
    ))));
    const causalWeights = candidate === "softmax-then-zero"
      ? freezeMatrix(runSelfAttention({ ...canonicalSelfAttentionConfig, causal: false, exposePaddingKey: true }).heads[1].weights.map((row, queryIndex) => row.map((value, keyIndex) => selfAttentionFixture.queryActive[queryIndex] && selfAttentionFixture.keyVisible[keyIndex] && keyIndex <= queryIndex ? value : 0)))
      : weightsForAllowed(causalTarget.heads[1].rawScores, fullAllowed, Math.sqrt(SELF_ATTENTION_HEAD_DIMENSION));
    const paddingAllowed = freezeBooleanMatrix(Array.from({ length: 4 }, (_, queryIndex) => Array.from({ length: 4 }, (_, keyIndex) => selfAttentionFixture.queryActive[queryIndex] && (
      candidate === "causal-only" ? true : selfAttentionFixture.keyVisible[keyIndex]
    ))));
    const paddingWeights = candidate === "softmax-then-zero"
      ? freezeMatrix(runSelfAttention({ ...canonicalSelfAttentionConfig, causal: false, exposePaddingKey: true }).heads[1].weights.map((row, queryIndex) => row.map((value, keyIndex) => selfAttentionFixture.queryActive[queryIndex] && selfAttentionFixture.keyVisible[keyIndex] ? value : 0)))
      : weightsForAllowed(paddingTarget.heads[1].rawScores, paddingAllowed, Math.sqrt(SELF_ATTENTION_HEAD_DIMENSION));
    metrics.futureMass = causalWeights.reduce((sum, row, queryIndex) => sum + row.reduce((rowSum, value, keyIndex) => rowSum + (keyIndex > queryIndex ? value : 0), 0), 0);
    metrics.paddingMass = paddingWeights.reduce((sum, row) => sum + row[3], 0);
    metrics.minimumActiveRowSum = Math.min(...causalWeights.slice(0, 3).map((row) => row.reduce((sum, value) => sum + value, 0)), ...paddingWeights.slice(0, 3).map((row) => row.reduce((sum, value) => sum + value, 0)));
    metrics.inactiveQueryMass = causalWeights[3].reduce((sum, value) => sum + value, 0) + paddingWeights[3].reduce((sum, value) => sum + value, 0);
    correct = metrics.futureMass <= 1e-12 && metrics.paddingMass <= 1e-12 && Math.abs(metrics.minimumActiveRowSum - 1) <= 1e-12 && metrics.inactiveQueryMass === 0;
    reason = correct ? "contract-restored" : metrics.futureMass > 1e-12 ? "future-leak" : metrics.paddingMass > 1e-12 ? "padding-leak" : "row-mass-lost";
  } else {
    const headContexts = canonical.heads.map(({ contexts }) => contexts);
    const output = candidate === "concat-features-then-output"
      ? canonical.attentionOutput
      : candidate === "average-heads"
        ? freezeMatrix(headContexts[0].map((row, rowIndex) => row.map((value, columnIndex) => (value + headContexts[1][rowIndex][columnIndex]) / 2)))
        : freezeMatrix(headContexts.flatMap((head) => head.map((row) => [...row])));
    metrics.outputRows = output.length;
    metrics.outputColumns = output[0]?.length ?? 0;
    correct = matrixApproximatelyEqual(output, canonical.attentionOutput) && metrics.outputRows === 4 && metrics.outputColumns === 4;
    reason = correct ? "contract-restored" : candidate === "average-heads" ? "head-features-averaged" : "token-axis-expanded";
  }
  return Object.freeze({ scenarioId, repair: candidate, correct, reason, metrics: Object.freeze(metrics) });
}

export function canCompleteSelfAttentionChapter({ labComplete, conceptsMastered }: { labComplete: boolean; debuggerComplete?: boolean; conceptsMastered: boolean }) {
  return labComplete && conceptsMastered;
}

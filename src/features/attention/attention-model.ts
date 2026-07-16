export const ATTENTION_KEY_DIMENSION = 2;
export const ATTENTION_VALUE_DIMENSION = 3;
export const ATTENTION_MEMORY_SLOT_COUNT = 3;
export const MAX_ATTENTION_QUERIES = 8;

export type AttentionMemorySlotId = "subject" | "place" | "action";
export type AttentionPresetId = "find-subject" | "find-place" | "find-action";
export type AttentionPrediction = AttentionMemorySlotId;
export type AttentionKey = readonly [number, number];
export type AttentionValue = readonly [number, number, number];
export type AttentionQuery = readonly [number, number];

export type AttentionMemorySlot = {
  id: AttentionMemorySlotId;
  labelKo: string;
  labelEn: string;
  key: AttentionKey;
  value: AttentionValue;
};

export type AttentionPreset = {
  id: AttentionPresetId;
  labelKo: string;
  labelEn: string;
  query: AttentionQuery;
};

function frozenKey(first: number, second: number): AttentionKey {
  return Object.freeze([first, second]) as AttentionKey;
}

function frozenValue(first: number, second: number, third: number): AttentionValue {
  return Object.freeze([first, second, third]) as AttentionValue;
}

export const attentionMemorySlots = Object.freeze([
  Object.freeze({
    id: "subject",
    labelKo: "주체 단서",
    labelEn: "Subject clue",
    key: frozenKey(1, 0),
    value: frozenValue(0.9, 0.2, 0.1),
  }),
  Object.freeze({
    id: "place",
    labelKo: "장소 단서",
    labelEn: "Place clue",
    key: frozenKey(0, 1),
    value: frozenValue(0.1, 0.9, 0.3),
  }),
  Object.freeze({
    id: "action",
    labelKo: "행동 단서",
    labelEn: "Action clue",
    key: frozenKey(-0.8, -0.8),
    value: frozenValue(0.2, 0.1, 1),
  }),
]) satisfies readonly AttentionMemorySlot[];

export const attentionPresetIds = Object.freeze([
  "find-subject",
  "find-place",
  "find-action",
] as const) satisfies readonly AttentionPresetId[];

export const attentionPresets = Object.freeze({
  "find-subject": Object.freeze({
    id: "find-subject",
    labelKo: "누가?",
    labelEn: "Who?",
    query: frozenKey(1.4, 0.1),
  }),
  "find-place": Object.freeze({
    id: "find-place",
    labelKo: "어디서?",
    labelEn: "Where?",
    query: frozenKey(0.1, 1.4),
  }),
  "find-action": Object.freeze({
    id: "find-action",
    labelKo: "무엇을 했나?",
    labelEn: "What happened?",
    query: frozenKey(-1, -1),
  }),
}) satisfies Readonly<Record<AttentionPresetId, AttentionPreset>>;

export type CrossAttentionInput = {
  queries: readonly (readonly number[])[];
  keys: readonly (readonly number[])[];
  values: readonly (readonly number[])[];
  slotIds: readonly AttentionMemorySlotId[];
};

export type CrossAttentionTrace = {
  queries: readonly (readonly number[])[];
  keys: readonly (readonly number[])[];
  values: readonly (readonly number[])[];
  slotIds: readonly AttentionMemorySlotId[];
  scores: readonly (readonly number[])[];
  weights: readonly (readonly number[])[];
  valueContributions: readonly (readonly (readonly number[])[])[];
  contexts: readonly (readonly number[])[];
  topSlotIds: readonly AttentionMemorySlotId[];
};

function freezeVector(values: readonly number[]): readonly number[] {
  return Object.freeze([...values]);
}

function freezeMatrix(values: readonly (readonly number[])[]): readonly (readonly number[])[] {
  return Object.freeze(values.map(freezeVector));
}

function freezeTensor(
  values: readonly (readonly (readonly number[])[])[],
): readonly (readonly (readonly number[])[])[] {
  return Object.freeze(values.map((matrix) => freezeMatrix(matrix)));
}

function isMemorySlotId(value: unknown): value is AttentionMemorySlotId {
  return value === "subject" || value === "place" || value === "action";
}

function isPresetId(value: unknown): value is AttentionPresetId {
  return value === "find-subject" || value === "find-place" || value === "find-action";
}

function assertMatrix(
  matrix: readonly (readonly number[])[],
  label: string,
  expectedRows: number | { min: number; max: number },
  expectedColumns: number,
) {
  if (!Array.isArray(matrix)) throw new Error(`${label} must be a matrix`);
  const rowCountValid = typeof expectedRows === "number"
    ? matrix.length === expectedRows
    : matrix.length >= expectedRows.min && matrix.length <= expectedRows.max;
  if (!rowCountValid) {
    const expected = typeof expectedRows === "number"
      ? `exactly ${expectedRows}`
      : `between ${expectedRows.min} and ${expectedRows.max}`;
    throw new Error(`${label} must contain ${expected} rows`);
  }
  matrix.forEach((row, rowIndex) => {
    if (!Array.isArray(row) || row.length !== expectedColumns) {
      throw new Error(`${label} row ${rowIndex} must contain exactly ${expectedColumns} values`);
    }
    row.forEach((value, columnIndex) => {
      if (!Number.isFinite(value)) {
        throw new Error(`${label} row ${rowIndex} column ${columnIndex} must be finite`);
      }
    });
  });
}

function assertSlotIds(slotIds: readonly AttentionMemorySlotId[]) {
  if (!Array.isArray(slotIds) || slotIds.length !== ATTENTION_MEMORY_SLOT_COUNT) {
    throw new Error(`slotIds must contain exactly ${ATTENTION_MEMORY_SLOT_COUNT} names`);
  }
  if (slotIds.some((slotId) => !isMemorySlotId(slotId))) {
    throw new Error("slotIds must use the named subject, place, and action memory slots");
  }
  if (new Set(slotIds).size !== ATTENTION_MEMORY_SLOT_COUNT) {
    throw new Error("slotIds must be unique");
  }
}

function assertCrossAttentionInput(input: CrossAttentionInput) {
  if (!input || typeof input !== "object") throw new Error("Cross-attention input is required");
  assertMatrix(
    input.queries,
    "queries",
    { min: 1, max: MAX_ATTENTION_QUERIES },
    ATTENTION_KEY_DIMENSION,
  );
  assertMatrix(input.keys, "keys", ATTENTION_MEMORY_SLOT_COUNT, ATTENTION_KEY_DIMENSION);
  assertMatrix(input.values, "values", ATTENTION_MEMORY_SLOT_COUNT, ATTENTION_VALUE_DIMENSION);
  assertSlotIds(input.slotIds);
}

function dot(left: readonly number[], right: readonly number[]) {
  if (left.length !== right.length) throw new Error("Dot-product dimensions must match");
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

function stableSoftmax(row: readonly number[]): number[] {
  if (!row.length || row.some((value) => !Number.isFinite(value))) {
    throw new Error("Softmax needs at least one finite score");
  }
  const maximum = Math.max(...row);
  const exponents = row.map((value) => Math.exp(value - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  if (!Number.isFinite(total) || total <= 0) throw new Error("Softmax normalization failed");
  return exponents.map((value) => value / total);
}

function argmax(values: readonly number[]) {
  if (!values.length) throw new Error("argmax needs at least one value");
  return values.reduce(
    (bestIndex, value, index) => value > values[bestIndex] ? index : bestIndex,
    0,
  );
}

export function inputForAttentionPresets(
  presetIds: readonly AttentionPresetId[],
): CrossAttentionInput {
  if (!Array.isArray(presetIds as unknown) || presetIds.length < 1 || presetIds.length > MAX_ATTENTION_QUERIES) {
    throw new Error(`Choose between 1 and ${MAX_ATTENTION_QUERIES} query presets`);
  }
  presetIds.forEach((presetId) => {
    if (!isPresetId(presetId)) throw new Error(`Unknown attention preset: ${presetId as string}`);
  });
  return Object.freeze({
    queries: freezeMatrix(presetIds.map((presetId) => attentionPresets[presetId].query)),
    keys: freezeMatrix(attentionMemorySlots.map(({ key }) => key)),
    values: freezeMatrix(attentionMemorySlots.map(({ value }) => value)),
    slotIds: Object.freeze(attentionMemorySlots.map(({ id }) => id)),
  });
}

export function runCrossAttention(input: CrossAttentionInput): CrossAttentionTrace {
  assertCrossAttentionInput(input);
  const queries = freezeMatrix(input.queries);
  const keys = freezeMatrix(input.keys);
  const values = freezeMatrix(input.values);
  const slotIds = Object.freeze([...input.slotIds]);
  const scores = freezeMatrix(queries.map((query) => keys.map((key) => dot(query, key))));
  const weights = freezeMatrix(scores.map(stableSoftmax));
  const valueContributions = freezeTensor(weights.map((queryWeights) => (
    queryWeights.map((weight, slotIndex) => values[slotIndex].map((value) => weight * value))
  )));
  const contexts = freezeMatrix(valueContributions.map((queryContributions) => (
    Array.from({ length: ATTENTION_VALUE_DIMENSION }, (_, dimension) => (
      queryContributions.reduce((sum, contribution) => sum + contribution[dimension], 0)
    ))
  )));
  const topSlotIds = Object.freeze(weights.map((row) => slotIds[argmax(row)]));

  return Object.freeze({
    queries,
    keys,
    values,
    slotIds,
    scores,
    weights,
    valueContributions,
    contexts,
    topSlotIds,
  });
}

export type AttentionPredictionGrade = {
  correct: boolean;
  expected: AttentionMemorySlotId;
  predicted: AttentionPrediction;
  queryIndex: number;
};

export function gradeAttentionPrediction(
  input: CrossAttentionInput,
  prediction: AttentionPrediction,
  queryIndex = 0,
): AttentionPredictionGrade {
  if (!isMemorySlotId(prediction)) throw new Error(`Unknown attention prediction: ${prediction as string}`);
  const trace = runCrossAttention(input);
  if (!Number.isInteger(queryIndex) || queryIndex < 0 || queryIndex >= trace.queries.length) {
    throw new Error("queryIndex must identify one query row");
  }
  const expected = trace.topSlotIds[queryIndex];
  return Object.freeze({
    correct: prediction === expected,
    expected,
    predicted: prediction,
    queryIndex,
  });
}

function matricesApproximatelyEqual(
  left: readonly (readonly number[])[],
  right: readonly (readonly number[])[],
  tolerance = 1e-12,
) {
  return left.length === right.length && left.every((row, rowIndex) => (
    row.length === right[rowIndex]?.length
    && row.every((value, columnIndex) => Math.abs(value - right[rowIndex][columnIndex]) <= tolerance)
  ));
}

export type AttentionValueCounterfactual = {
  slotId: AttentionMemorySlotId;
  replacementValue: readonly number[];
  baseline: CrossAttentionTrace;
  counterfactual: CrossAttentionTrace;
  scoresStable: boolean;
  weightsStable: boolean;
  contextChanged: boolean;
  contextChangedByQuery: readonly boolean[];
  contextDeltas: readonly (readonly number[])[];
};

export function compareAttentionValueCounterfactual(
  input: CrossAttentionInput,
  slotId: AttentionMemorySlotId,
  replacementValue: readonly number[],
): AttentionValueCounterfactual {
  assertCrossAttentionInput(input);
  if (!isMemorySlotId(slotId)) throw new Error(`Unknown memory slot: ${slotId as string}`);
  assertMatrix([replacementValue], "replacementValue", 1, ATTENTION_VALUE_DIMENSION);
  const slotIndex = input.slotIds.indexOf(slotId);
  if (slotIndex < 0) throw new Error(`Memory slot ${slotId} is missing from slotIds`);

  const nextValues = input.values.map((value, index) => (
    index === slotIndex ? [...replacementValue] : [...value]
  ));
  const baseline = runCrossAttention(input);
  const counterfactual = runCrossAttention({ ...input, values: nextValues });
  const contextDeltas = freezeMatrix(baseline.contexts.map((context, queryIndex) => (
    context.map((value, dimension) => counterfactual.contexts[queryIndex][dimension] - value)
  )));
  const contextChangedByQuery = Object.freeze(contextDeltas.map((row) => (
    row.some((delta) => Math.abs(delta) > 1e-12)
  )));

  return Object.freeze({
    slotId,
    replacementValue: freezeVector(replacementValue),
    baseline,
    counterfactual,
    scoresStable: matricesApproximatelyEqual(baseline.scores, counterfactual.scores),
    weightsStable: matricesApproximatelyEqual(baseline.weights, counterfactual.weights),
    contextChanged: contextChangedByQuery.some(Boolean),
    contextChangedByQuery,
    contextDeltas,
  });
}

export type AttentionDebuggerScenarioId =
  | "softmax-axis"
  | "context-source"
  | "qk-shape"
  | "independent-query-rows";

export type AttentionRepair =
  | "normalize-values-by-feature"
  | "normalize-over-keys-per-query"
  | "normalize-over-queries-per-key"
  | "combine-values-with-weights"
  | "combine-keys-with-weights"
  | "return-largest-key"
  | "keys-times-queries-transposed"
  | "queries-times-keys"
  | "queries-times-keys-transposed"
  | "reuse-first-query-row"
  | "run-each-query-row-independently"
  | "normalize-entire-score-table";

export type AttentionDebuggerOption = {
  id: AttentionRepair;
  labelKo: string;
  labelEn: string;
};

export type AttentionDebuggerScenario = {
  id: AttentionDebuggerScenarioId;
  labelKo: string;
  labelEn: string;
  options: readonly AttentionDebuggerOption[];
};

function option(id: AttentionRepair, labelKo: string, labelEn: string): AttentionDebuggerOption {
  return Object.freeze({ id, labelKo, labelEn });
}

export const attentionDebuggerScenarioIds = Object.freeze([
  "softmax-axis",
  "context-source",
  "qk-shape",
  "independent-query-rows",
] as const) satisfies readonly AttentionDebuggerScenarioId[];

export const attentionDebuggerScenarios = Object.freeze({
  "softmax-axis": Object.freeze({
    id: "softmax-axis",
    labelKo: "Softmax 축",
    labelEn: "Softmax axis",
    options: Object.freeze([
      option("normalize-values-by-feature", "Value feature를 정규화", "Normalize value features"),
      option("normalize-over-keys-per-query", "각 Query의 Key 축을 정규화", "Normalize the key axis for each query"),
      option("normalize-over-queries-per-key", "각 Key의 Query 축을 정규화", "Normalize the query axis for each key"),
    ]),
  }),
  "context-source": Object.freeze({
    id: "context-source",
    labelKo: "Context의 출처",
    labelEn: "Context source",
    options: Object.freeze([
      option("combine-values-with-weights", "가중치로 Value를 합성", "Combine values with the weights"),
      option("combine-keys-with-weights", "가중치로 Key를 합성", "Combine keys with the weights"),
      option("return-largest-key", "가장 큰 Key를 그대로 반환", "Return the largest key directly"),
    ]),
  }),
  "qk-shape": Object.freeze({
    id: "qk-shape",
    labelKo: "QK 행렬 방향",
    labelEn: "QK matrix orientation",
    options: Object.freeze([
      option("keys-times-queries-transposed", "KQᵀ", "KQ transpose"),
      option("queries-times-keys", "QK", "QK without transpose"),
      option("queries-times-keys-transposed", "QKᵀ", "QK transpose"),
    ]),
  }),
  "independent-query-rows": Object.freeze({
    id: "independent-query-rows",
    labelKo: "여러 Query의 독립성",
    labelEn: "Independent query rows",
    options: Object.freeze([
      option("reuse-first-query-row", "첫 Query 가중치를 모든 행에 복사", "Reuse the first query's weights"),
      option("run-each-query-row-independently", "Query 행마다 독립 실행", "Run each query row independently"),
      option("normalize-entire-score-table", "전체 score 표를 한 번에 정규화", "Normalize the whole score table at once"),
    ]),
  }),
}) satisfies Readonly<Record<AttentionDebuggerScenarioId, AttentionDebuggerScenario>>;

export type AttentionRepairReason =
  | "contract-restored"
  | "softmax-over-value-features"
  | "softmax-across-queries"
  | "keys-used-as-context"
  | "argmax-key-drops-values"
  | "query-key-axes-swapped"
  | "inner-dimensions-do-not-align"
  | "first-query-weights-reused"
  | "all-query-rows-coupled";

export type AttentionDebuggerMetrics = {
  candidateRows: number;
  candidateColumns: number;
  rowSums: readonly number[];
  topSlotIds: readonly (AttentionMemorySlotId | null)[];
  contextDimension: number;
};

export type AttentionRepairResult = {
  scenarioId: AttentionDebuggerScenarioId;
  repair: AttentionRepair;
  correct: boolean;
  reason: AttentionRepairReason;
  expectedRepair: AttentionRepair;
  metrics: AttentionDebuggerMetrics;
};

const expectedRepairs: Readonly<Record<AttentionDebuggerScenarioId, AttentionRepair>> = Object.freeze({
  "softmax-axis": "normalize-over-keys-per-query",
  "context-source": "combine-values-with-weights",
  "qk-shape": "queries-times-keys-transposed",
  "independent-query-rows": "run-each-query-row-independently",
});

function transpose(matrix: readonly (readonly number[])[]): number[][] {
  if (!matrix.length) return [];
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

function multiplyMatrices(
  left: readonly (readonly number[])[],
  right: readonly (readonly number[])[],
): number[][] {
  if (!left.length || !right.length || left[0].length !== right.length) {
    throw new Error("Matrix inner dimensions must align");
  }
  const rightColumns = transpose(right);
  return left.map((row) => rightColumns.map((column) => dot(row, column)));
}

function stableSoftmaxColumns(matrix: readonly (readonly number[])[]): number[][] {
  return transpose(transpose(matrix).map(stableSoftmax));
}

function stableSoftmaxWholeMatrix(matrix: readonly (readonly number[])[]): number[][] {
  const flattened = stableSoftmax(matrix.flat());
  let offset = 0;
  return matrix.map((row) => {
    const result = flattened.slice(offset, offset + row.length);
    offset += row.length;
    return result;
  });
}

function topSlotsForRows(
  rows: readonly (readonly number[])[],
): readonly (AttentionMemorySlotId | null)[] {
  return Object.freeze(rows.map((row) => (
    row.length === ATTENTION_MEMORY_SLOT_COUNT
      ? attentionMemorySlots[argmax(row)].id
      : null
  )));
}

function metricsForCandidate(
  candidate: readonly (readonly number[])[],
  contextDimension = 0,
): AttentionDebuggerMetrics {
  return Object.freeze({
    candidateRows: candidate.length,
    candidateColumns: candidate[0]?.length ?? 0,
    rowSums: Object.freeze(candidate.map((row) => row.reduce((sum, value) => sum + value, 0))),
    topSlotIds: topSlotsForRows(candidate),
    contextDimension,
  });
}

function repairBelongsToScenario(
  scenarioId: AttentionDebuggerScenarioId,
  repair: AttentionRepair,
) {
  return attentionDebuggerScenarios[scenarioId].options.some((candidate) => candidate.id === repair);
}

function evaluateSoftmaxRepair(repair: AttentionRepair, trace: CrossAttentionTrace) {
  const candidate = repair === "normalize-over-keys-per-query"
    ? trace.scores.map(stableSoftmax)
    : repair === "normalize-over-queries-per-key"
      ? stableSoftmaxColumns(trace.scores)
      : trace.values.map(stableSoftmax);
  const correct = matricesApproximatelyEqual(candidate, trace.weights);
  const reason: AttentionRepairReason = correct
    ? "contract-restored"
    : repair === "normalize-over-queries-per-key"
      ? "softmax-across-queries"
      : "softmax-over-value-features";
  return { candidate, correct, reason, contextDimension: 0 };
}

function evaluateContextRepair(repair: AttentionRepair, trace: CrossAttentionTrace) {
  const candidate = repair === "combine-values-with-weights"
    ? multiplyMatrices(trace.weights, trace.values)
    : repair === "combine-keys-with-weights"
      ? multiplyMatrices(trace.weights, trace.keys)
      : trace.topSlotIds.map((slotId) => (
        trace.keys[trace.slotIds.indexOf(slotId)]
      ));
  const correct = matricesApproximatelyEqual(candidate, trace.contexts);
  const reason: AttentionRepairReason = correct
    ? "contract-restored"
    : repair === "combine-keys-with-weights"
      ? "keys-used-as-context"
      : "argmax-key-drops-values";
  return { candidate, correct, reason, contextDimension: candidate[0]?.length ?? 0 };
}

function evaluateQkRepair(repair: AttentionRepair, trace: CrossAttentionTrace) {
  let candidate: number[][];
  if (repair === "queries-times-keys-transposed") {
    candidate = multiplyMatrices(trace.queries, transpose(trace.keys));
  } else if (repair === "keys-times-queries-transposed") {
    candidate = multiplyMatrices(trace.keys, transpose(trace.queries));
  } else {
    try {
      candidate = multiplyMatrices(trace.queries, trace.keys);
    } catch {
      candidate = [];
    }
  }
  const correct = matricesApproximatelyEqual(candidate, trace.scores);
  const reason: AttentionRepairReason = correct
    ? "contract-restored"
    : repair === "queries-times-keys"
      ? "inner-dimensions-do-not-align"
      : "query-key-axes-swapped";
  return { candidate, correct, reason, contextDimension: 0 };
}

function evaluateIndependentQueryRepair(repair: AttentionRepair, trace: CrossAttentionTrace) {
  const candidate = repair === "run-each-query-row-independently"
    ? trace.scores.map(stableSoftmax)
    : repair === "reuse-first-query-row"
      ? trace.scores.map(() => [...trace.weights[0]])
      : stableSoftmaxWholeMatrix(trace.scores);
  const correct = matricesApproximatelyEqual(candidate, trace.weights);
  const reason: AttentionRepairReason = correct
    ? "contract-restored"
    : repair === "reuse-first-query-row"
      ? "first-query-weights-reused"
      : "all-query-rows-coupled";
  return { candidate, correct, reason, contextDimension: 0 };
}

export function evaluateAttentionRepair(
  scenarioId: AttentionDebuggerScenarioId,
  repair: AttentionRepair,
): AttentionRepairResult {
  if (!attentionDebuggerScenarioIds.includes(scenarioId)) {
    throw new Error(`Unknown attention debugger scenario: ${scenarioId as string}`);
  }
  if (!repairBelongsToScenario(scenarioId, repair)) {
    throw new Error(`Repair ${repair} does not belong to ${scenarioId}`);
  }
  const trace = runCrossAttention(inputForAttentionPresets(attentionPresetIds));
  const evaluation = scenarioId === "softmax-axis"
    ? evaluateSoftmaxRepair(repair, trace)
    : scenarioId === "context-source"
      ? evaluateContextRepair(repair, trace)
      : scenarioId === "qk-shape"
        ? evaluateQkRepair(repair, trace)
        : evaluateIndependentQueryRepair(repair, trace);

  return Object.freeze({
    scenarioId,
    repair,
    correct: evaluation.correct,
    reason: evaluation.reason,
    expectedRepair: expectedRepairs[scenarioId],
    metrics: metricsForCandidate(evaluation.candidate, evaluation.contextDimension),
  });
}

export type AttentionCounterfactualPrediction =
  | "scores-and-weights-stay-context-changes"
  | "scores-change"
  | "nothing-changes";

type AttentionEvidenceBase = {
  eventId: string;
  attemptId: string;
  presetId: AttentionPresetId;
};

export type AttentionLabEvidenceEvent =
  | (AttentionEvidenceBase & {
      kind: "prediction";
      prediction: AttentionPrediction;
    })
  | (AttentionEvidenceBase & {
      kind: "run";
    })
  | (AttentionEvidenceBase & {
      kind: "inspect";
      slotId: AttentionMemorySlotId;
    })
  | (AttentionEvidenceBase & {
      kind: "value-counterfactual";
      slotId: AttentionMemorySlotId;
      replacementValue: readonly number[];
      prediction: AttentionCounterfactualPrediction;
    });

export type AttentionLabEvidence = {
  events: readonly AttentionLabEvidenceEvent[];
};

export const emptyAttentionLabEvidence: AttentionLabEvidence = Object.freeze({
  events: Object.freeze([]),
});

export type AttentionLabMasteryReason =
  | "mastered"
  | "invalid-evidence"
  | "two-correct-predictions"
  | "two-slot-inspection"
  | "value-counterfactual";

export type AttentionLabMastery = {
  mastered: boolean;
  reason: AttentionLabMasteryReason;
  correctPresetIds: readonly AttentionPresetId[];
  inspectedSlotIds: readonly AttentionMemorySlotId[];
};

type AttemptState = {
  presetId: AttentionPresetId;
  prediction: AttentionPrediction;
  ran: boolean;
  correct: boolean;
};

function masteryResult(
  reason: AttentionLabMasteryReason,
  correctPresets: ReadonlySet<AttentionPresetId>,
  inspectedSlots: ReadonlySet<AttentionMemorySlotId>,
): AttentionLabMastery {
  return Object.freeze({
    mastered: reason === "mastered",
    reason,
    correctPresetIds: Object.freeze(attentionPresetIds.filter((presetId) => correctPresets.has(presetId))),
    inspectedSlotIds: Object.freeze(attentionMemorySlots
      .map(({ id }) => id)
      .filter((slotId) => inspectedSlots.has(slotId))),
  });
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export function evaluateAttentionLabMastery(evidence: AttentionLabEvidence): AttentionLabMastery {
  const correctPresets = new Set<AttentionPresetId>();
  const inspectedSlots = new Set<AttentionMemorySlotId>();
  if (!evidence || typeof evidence !== "object" || !Array.isArray(evidence.events)) {
    return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
  }

  const eventIds = new Set<string>();
  const attempts = new Map<string, AttemptState>();
  let counterfactualComplete = false;

  for (const rawEvent of evidence.events as readonly unknown[]) {
    if (!rawEvent || typeof rawEvent !== "object") {
      return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
    }
    const event = rawEvent as Partial<AttentionLabEvidenceEvent>;
    if (
      !isNonEmptyString(event.eventId)
      || eventIds.has(event.eventId)
      || !isNonEmptyString(event.attemptId)
      || !isPresetId(event.presetId)
    ) {
      return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
    }
    eventIds.add(event.eventId);

    if (event.kind === "prediction") {
      if (!isMemorySlotId(event.prediction) || attempts.has(event.attemptId)) {
        return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
      }
      attempts.set(event.attemptId, {
        presetId: event.presetId,
        prediction: event.prediction,
        ran: false,
        correct: false,
      });
      continue;
    }

    const attempt = attempts.get(event.attemptId);
    if (!attempt || attempt.presetId !== event.presetId) {
      return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
    }

    if (event.kind === "run") {
      if (attempt.ran) return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
      const grade = gradeAttentionPrediction(
        inputForAttentionPresets([attempt.presetId]),
        attempt.prediction,
      );
      attempt.ran = true;
      attempt.correct = grade.correct;
      if (grade.correct) correctPresets.add(attempt.presetId);
      continue;
    }

    if (!attempt.ran || !attempt.correct) {
      return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
    }

    if (event.kind === "inspect") {
      if (!isMemorySlotId(event.slotId)) {
        return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
      }
      inspectedSlots.add(event.slotId);
      continue;
    }

    if (event.kind === "value-counterfactual") {
      if (
        !isMemorySlotId(event.slotId)
        || !Array.isArray(event.replacementValue)
        || (
          event.prediction !== "scores-and-weights-stay-context-changes"
          && event.prediction !== "scores-change"
          && event.prediction !== "nothing-changes"
        )
      ) {
        return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
      }
      try {
        const comparison = compareAttentionValueCounterfactual(
          inputForAttentionPresets([attempt.presetId]),
          event.slotId,
          event.replacementValue,
        );
        if (
          event.prediction === "scores-and-weights-stay-context-changes"
          && comparison.scoresStable
          && comparison.weightsStable
          && comparison.contextChanged
        ) {
          counterfactualComplete = true;
        }
      } catch {
        return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
      }
      continue;
    }

    return masteryResult("invalid-evidence", correctPresets, inspectedSlots);
  }

  if (correctPresets.size < 2) {
    return masteryResult("two-correct-predictions", correctPresets, inspectedSlots);
  }
  if (inspectedSlots.size < 2) {
    return masteryResult("two-slot-inspection", correctPresets, inspectedSlots);
  }
  if (!counterfactualComplete) {
    return masteryResult("value-counterfactual", correctPresets, inspectedSlots);
  }
  return masteryResult("mastered", correctPresets, inspectedSlots);
}

export function canCompleteAttentionChapter({
  labComplete,
  debuggerComplete,
  conceptsMastered,
}: {
  labComplete: boolean;
  debuggerComplete: boolean;
  conceptsMastered: boolean;
}) {
  return labComplete && debuggerComplete && conceptsMastered;
}

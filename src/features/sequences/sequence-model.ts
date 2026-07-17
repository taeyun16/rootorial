export type SequencePresetId = "short-gap" | "long-gap" | "reversed";
export type SequenceCellKind = "rnn" | "lstm";
export type SequencePrediction = "retained" | "faded" | "reversed";

export type SequenceToken = {
  id: string;
  input: number;
};

export const sequencePresetIds = ["short-gap", "long-gap", "reversed"] as const satisfies readonly SequencePresetId[];

export const sequencePresets: Record<SequencePresetId, { tokens: SequenceToken[] }> = {
  "short-gap": {
    tokens: [
      { id: "signal", input: 1 },
      { id: "gap-1", input: 0 },
      { id: "distractor", input: -1 },
    ],
  },
  "long-gap": {
    tokens: [
      { id: "signal", input: 1 },
      { id: "gap-1", input: 0 },
      { id: "gap-2", input: 0 },
      { id: "gap-3", input: 0 },
      { id: "gap-4", input: 0 },
      { id: "gap-5", input: 0 },
      { id: "query", input: 0 },
    ],
  },
  reversed: {
    tokens: [
      { id: "distractor", input: -1 },
      { id: "gap-1", input: 0 },
      { id: "signal", input: 1 },
    ],
  },
};

export type ScalarRnnConfig = {
  recurrentGain: number;
  inputGain?: number;
  bias?: number;
  initialHidden?: number;
};

export type ScalarRnnStep = {
  index: number;
  input: number;
  previousHidden: number;
  preactivation: number;
  hidden: number;
  localInputDerivative: number;
  localRecurrentDerivative: number;
  gradientToFinal: number;
};

export type ScalarRnnGradients = {
  inputGradients: number[];
  gradientToInitial: number;
};

export type ScalarRnnTrace = {
  inputs: number[];
  config: Required<ScalarRnnConfig>;
  steps: ScalarRnnStep[];
  finalHidden: number;
  inputGradients: number[];
  gradientToInitial: number;
};

export type ScalarRnnCounterfactual = {
  changedIndex: number;
  replacement: number;
  baseline: ScalarRnnTrace;
  counterfactual: ScalarRnnTrace;
  hiddenDeltas: number[];
  finalDelta: number;
  absoluteFinalDelta: number;
  firstAffectedStep: number | null;
};

const DEFAULT_INPUT_GAIN = 1;
const DEFAULT_BIAS = 0;
const DEFAULT_INITIAL_HIDDEN = 0;
const MAX_SEQUENCE_LENGTH = 64;
const RNN_RECURRENT_GAIN = 0.5;
const RETAINED_GRADIENT_THRESHOLD = 0.04;
const NUMERIC_TOLERANCE = 1e-12;

function assertFinite(value: number, label: string) {
  if (!Number.isFinite(value)) throw new Error(`${label} must be finite`);
}

function assertUnitInterval(value: number, label: string) {
  assertFinite(value, label);
  if (value < 0 || value > 1) throw new Error(`${label} must be between zero and one`);
}

function assertSequence(inputs: readonly number[]) {
  if (!inputs.length || inputs.length > MAX_SEQUENCE_LENGTH) {
    throw new Error(`A scalar sequence must contain between 1 and ${MAX_SEQUENCE_LENGTH} steps`);
  }
  inputs.forEach((value, index) => assertFinite(value, `Input ${index}`));
}

function normalizedConfig(config: ScalarRnnConfig): Required<ScalarRnnConfig> {
  const normalized = {
    recurrentGain: config.recurrentGain,
    inputGain: config.inputGain ?? DEFAULT_INPUT_GAIN,
    bias: config.bias ?? DEFAULT_BIAS,
    initialHidden: config.initialHidden ?? DEFAULT_INITIAL_HIDDEN,
  };
  assertFinite(normalized.recurrentGain, "Recurrent gain");
  assertFinite(normalized.inputGain, "Input gain");
  assertFinite(normalized.bias, "Bias");
  assertFinite(normalized.initialHidden, "Initial hidden state");
  if (Math.abs(normalized.initialHidden) > 1) {
    throw new Error("Initial hidden state must be between negative one and one");
  }
  return normalized;
}

export function computeScalarRnnGradients(
  steps: readonly Pick<ScalarRnnStep, "localInputDerivative" | "localRecurrentDerivative">[],
): ScalarRnnGradients {
  if (!steps.length) throw new Error("Gradient computation needs at least one RNN step");
  const inputGradients = Array.from({ length: steps.length }, () => 0);
  let gradientToCurrentHidden = 1;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    assertFinite(step.localInputDerivative, `Input derivative ${index}`);
    assertFinite(step.localRecurrentDerivative, `Recurrent derivative ${index}`);
    inputGradients[index] = gradientToCurrentHidden * step.localInputDerivative;
    gradientToCurrentHidden *= step.localRecurrentDerivative;
  }

  return {
    inputGradients,
    gradientToInitial: gradientToCurrentHidden,
  };
}

export function traceScalarRnn(
  inputs: readonly number[],
  config: ScalarRnnConfig,
): ScalarRnnTrace {
  assertSequence(inputs);
  const resolvedConfig = normalizedConfig(config);
  let previousHidden = resolvedConfig.initialHidden;
  const forwardSteps = inputs.map((input, index) => {
    const preactivation = resolvedConfig.inputGain * input
      + resolvedConfig.recurrentGain * previousHidden
      + resolvedConfig.bias;
    assertFinite(preactivation, `Preactivation ${index}`);
    const hidden = Math.tanh(preactivation);
    const activationDerivative = 1 - hidden ** 2;
    const step = {
      index,
      input,
      previousHidden,
      preactivation,
      hidden,
      localInputDerivative: resolvedConfig.inputGain * activationDerivative,
      localRecurrentDerivative: resolvedConfig.recurrentGain * activationDerivative,
      gradientToFinal: 0,
    };
    previousHidden = hidden;
    return step;
  });
  const gradients = computeScalarRnnGradients(forwardSteps);
  const steps = forwardSteps.map((step, index) => ({
    ...step,
    gradientToFinal: gradients.inputGradients[index],
  }));

  return {
    inputs: [...inputs],
    config: { ...resolvedConfig },
    steps,
    finalHidden: steps.at(-1)?.hidden ?? resolvedConfig.initialHidden,
    inputGradients: [...gradients.inputGradients],
    gradientToInitial: gradients.gradientToInitial,
  };
}

export function runScalarRnnCounterfactual(
  inputs: readonly number[],
  config: ScalarRnnConfig,
  changedIndex: number,
  replacement: number,
): ScalarRnnCounterfactual {
  assertSequence(inputs);
  if (!Number.isInteger(changedIndex) || changedIndex < 0 || changedIndex >= inputs.length) {
    throw new Error("Counterfactual index must identify a sequence step");
  }
  assertFinite(replacement, "Counterfactual replacement");
  const baseline = traceScalarRnn(inputs, config);
  const changedInputs = [...inputs];
  changedInputs[changedIndex] = replacement;
  const counterfactual = traceScalarRnn(changedInputs, config);
  const hiddenDeltas = baseline.steps.map((step, index) => (
    counterfactual.steps[index].hidden - step.hidden
  ));
  const firstAffectedStep = hiddenDeltas.findIndex((delta) => Math.abs(delta) > NUMERIC_TOLERANCE);
  const finalDelta = counterfactual.finalHidden - baseline.finalHidden;

  return {
    changedIndex,
    replacement,
    baseline,
    counterfactual,
    hiddenDeltas,
    finalDelta,
    absoluteFinalDelta: Math.abs(finalDelta),
    firstAffectedStep: firstAffectedStep === -1 ? null : firstAffectedStep,
  };
}

export type GatedCarryProbeInput = {
  previousCell: number;
  candidate: number;
  inputGate: number;
  forgetGate: number;
  outputGate: number;
};

export type GatedCarryProbeResult = GatedCarryProbeInput & {
  previousContribution: number;
  candidateContribution: number;
  cell: number;
  hidden: number;
};

export function runGatedCarryProbe(input: GatedCarryProbeInput): GatedCarryProbeResult {
  assertFinite(input.previousCell, "Previous cell state");
  assertFinite(input.candidate, "Candidate state");
  if (Math.abs(input.candidate) > 1) {
    throw new Error("Candidate state must be between negative one and one");
  }
  assertUnitInterval(input.inputGate, "Input gate");
  assertUnitInterval(input.forgetGate, "Forget gate");
  assertUnitInterval(input.outputGate, "Output gate");
  const previousContribution = input.forgetGate * input.previousCell;
  const candidateContribution = input.inputGate * input.candidate;
  const cell = previousContribution + candidateContribution;
  const hidden = input.outputGate * Math.tanh(cell);
  assertFinite(cell, "Cell state");
  assertFinite(hidden, "Hidden state");
  return {
    ...input,
    previousContribution,
    candidateContribution,
    cell,
    hidden,
  };
}

export type SequenceTraceStep = {
  index: number;
  tokenId: string;
  input: number;
  hidden: number;
  cell: number;
  candidate: number;
  inputGate: number | null;
  forgetGate: number | null;
  outputGate: number | null;
  cellGradientToSignal: number | null;
  gradientToSignal: number;
};

export type SequenceTraceResult = {
  steps: SequenceTraceStep[];
  finalHidden: number;
  signalGradient: number;
  signalCellGradient: number | null;
  outcome: SequencePrediction;
};

function runPresetRnn(
  tokens: readonly SequenceToken[],
  recurrentGain: number,
): Omit<SequenceTraceResult, "outcome"> {
  const trace = traceScalarRnn(tokens.map(({ input }) => input), {
    recurrentGain,
  });
  const signalIndex = tokens.findIndex(({ id }) => id === "signal");
  if (signalIndex === -1) throw new Error("Sequence preset must contain a signal token");
  let gradientToSignal = 0;
  const steps = trace.steps.map((step, index): SequenceTraceStep => {
    if (index === signalIndex) gradientToSignal = step.localInputDerivative;
    else if (index > signalIndex) gradientToSignal *= step.localRecurrentDerivative;
    return {
      index,
      tokenId: tokens[index].id,
      input: step.input,
      hidden: step.hidden,
      cell: step.hidden,
      candidate: step.hidden,
      inputGate: null,
      forgetGate: null,
      outputGate: null,
      cellGradientToSignal: null,
      gradientToSignal: index < signalIndex ? 0 : gradientToSignal,
    };
  });
  return {
    steps,
    finalHidden: trace.finalHidden,
    signalGradient: trace.inputGradients[signalIndex],
    signalCellGradient: null,
  };
}

function gatesForToken(tokenId: string) {
  const writesContent = tokenId === "signal" || tokenId === "distractor";
  return {
    inputGate: writesContent ? 0.9 : 0.05,
    forgetGate: writesContent ? 0.25 : 0.95,
    outputGate: tokenId === "gap-1" || tokenId.startsWith("gap-") ? 0.1 : 0.9,
  };
}

function runPresetLstm(tokens: readonly SequenceToken[]): Omit<SequenceTraceResult, "outcome"> {
  const signalIndex = tokens.findIndex(({ id }) => id === "signal");
  if (signalIndex === -1) throw new Error("Sequence preset must contain a signal token");
  let cell = 0;
  let gradientToSignalCell = 0;
  const steps = tokens.map((token, index): SequenceTraceStep => {
    const candidate = Math.tanh(token.input);
    const gates = gatesForToken(token.id);
    const result = runGatedCarryProbe({
      previousCell: cell,
      candidate,
      ...gates,
    });
    cell = result.cell;
    if (index === signalIndex) {
      gradientToSignalCell = gates.inputGate * (1 - candidate ** 2);
    } else if (index > signalIndex) {
      gradientToSignalCell *= gates.forgetGate;
    }
    const gradientToSignal = index < signalIndex
      ? 0
      : gates.outputGate * (1 - Math.tanh(cell) ** 2) * gradientToSignalCell;
    return {
      index,
      tokenId: token.id,
      input: token.input,
      hidden: result.hidden,
      cell: result.cell,
      candidate,
      ...gates,
      cellGradientToSignal: index < signalIndex ? 0 : gradientToSignalCell,
      gradientToSignal,
    };
  });
  return {
    steps,
    finalHidden: steps.at(-1)?.hidden ?? 0,
    signalGradient: steps.at(-1)?.gradientToSignal ?? 0,
    signalCellGradient: steps.at(-1)?.cellGradientToSignal ?? 0,
  };
}

export function runSequenceTrace(
  preset: SequencePresetId,
  cellKind: SequenceCellKind,
  recurrentGain = RNN_RECURRENT_GAIN,
): SequenceTraceResult {
  if (cellKind === "rnn") {
    assertFinite(recurrentGain, "RNN recurrent gain");
    if (recurrentGain <= 0 || recurrentGain > 1) {
      throw new Error("RNN recurrent gain must be greater than zero and at most one");
    }
  } else if (cellKind !== "lstm") {
    throw new Error(`Unknown sequence cell: ${cellKind as string}`);
  }
  const definition = sequencePresets[preset];
  if (!definition) throw new Error(`Unknown sequence preset: ${preset as string}`);
  const trace = cellKind === "rnn"
    ? runPresetRnn(definition.tokens, recurrentGain)
    : runPresetLstm(definition.tokens);
  const outcome: SequencePrediction = preset === "reversed"
    ? "reversed"
    : trace.signalGradient >= RETAINED_GRADIENT_THRESHOLD ? "retained" : "faded";
  return { ...trace, outcome };
}

export type SequencePredictionGrade = {
  correct: boolean;
  expected: SequencePrediction;
};

export function gradeSequencePrediction(
  trace: Pick<SequenceTraceResult, "outcome">,
  prediction: SequencePrediction,
): SequencePredictionGrade;
export function gradeSequencePrediction(
  prediction: SequencePrediction,
  actual: SequencePrediction | Pick<SequenceTraceResult, "outcome">,
): SequencePredictionGrade;
export function gradeSequencePrediction(
  first: SequencePrediction | Pick<SequenceTraceResult, "outcome">,
  second: SequencePrediction | Pick<SequenceTraceResult, "outcome">,
): SequencePredictionGrade {
  const prediction = typeof first === "string" ? first : second as SequencePrediction;
  const actual = typeof first === "string" ? second : first;
  const expected = typeof actual === "string" ? actual : actual.outcome;
  return { correct: prediction === expected, expected };
}

export type SequenceLabEvidence = {
  correctOrderPrediction: boolean;
  rnnDecayObserved: boolean;
  lstmRetentionObserved: boolean;
  stepInspected: boolean;
};

export type SequenceLabMastery = {
  mastered: boolean;
  reason: "mastered" | "order-prediction" | "rnn-decay" | "lstm-retention" | "step-inspection";
};

export function evaluateSequenceLabMastery(evidence: SequenceLabEvidence): SequenceLabMastery {
  if (!evidence.correctOrderPrediction) return { mastered: false, reason: "order-prediction" };
  if (!evidence.rnnDecayObserved) return { mastered: false, reason: "rnn-decay" };
  if (!evidence.lstmRetentionObserved) return { mastered: false, reason: "lstm-retention" };
  if (!evidence.stepInspected) return { mastered: false, reason: "step-inspection" };
  return { mastered: true, reason: "mastered" };
}

export const sequenceDebuggerScenarioIds = [
  "order-state",
  "causal-prefix",
  "cell-update",
  "output-boundary",
] as const;

export type SequenceDebuggerScenarioId = typeof sequenceDebuggerScenarioIds[number];

export type SequenceRepair =
  | "ordered-recurrence"
  | "mean-pooling"
  | "sorted-recurrence"
  | "prefix-only"
  | "broadcast-final"
  | "bidirectional-lookahead"
  | "forget-old-plus-input-candidate"
  | "input-old-plus-forget-candidate"
  | "multiply-cell-branches"
  | "output-gates-hidden"
  | "output-overwrites-cell"
  | "forget-gates-hidden";

export const sequenceRepairOptions: Record<SequenceDebuggerScenarioId, readonly SequenceRepair[]> = {
  "order-state": ["mean-pooling", "ordered-recurrence", "sorted-recurrence"],
  "causal-prefix": ["broadcast-final", "bidirectional-lookahead", "prefix-only"],
  "cell-update": [
    "forget-old-plus-input-candidate",
    "input-old-plus-forget-candidate",
    "multiply-cell-branches",
  ],
  "output-boundary": ["output-overwrites-cell", "forget-gates-hidden", "output-gates-hidden"],
};

export type SequenceRepairReason =
  | "contract-restored"
  | "repair-not-applicable"
  | "order-erased"
  | "order-canonicalized"
  | "future-leakage"
  | "cell-branch-swapped"
  | "cell-branches-multiplied"
  | "cell-overwritten-by-output"
  | "wrong-hidden-gate";

export type SequenceRepairMetrics = {
  forwardFinal?: number;
  reversedFinal?: number;
  prefixBefore?: number[];
  prefixAfter?: number[];
  carryCell?: number;
  writeCell?: number;
  expectedCarryCell?: number;
  expectedWriteCell?: number;
  closedCell?: number;
  openCell?: number;
  closedHidden?: number;
  openHidden?: number;
};

export type SequenceRepairResult = {
  correct: boolean;
  reason: SequenceRepairReason;
  metrics: SequenceRepairMetrics;
};

function approximatelyEqual(left: number, right: number, tolerance = 1e-9) {
  return Math.abs(left - right) <= tolerance;
}

function arraysApproximatelyEqual(left: readonly number[], right: readonly number[]) {
  return left.length === right.length
    && left.every((value, index) => approximatelyEqual(value, right[index]));
}

function notApplicable(): SequenceRepairResult {
  return { correct: false, reason: "repair-not-applicable", metrics: {} };
}

function evaluateOrderRepair(repair: SequenceRepair): SequenceRepairResult {
  if (!sequenceRepairOptions["order-state"].includes(repair)) return notApplicable();
  const forwardInputs = [1, 0, -1];
  const reversedInputs = [...forwardInputs].reverse();
  let forwardFinal: number;
  let reversedFinal: number;
  if (repair === "mean-pooling") {
    forwardFinal = forwardInputs.reduce((sum, value) => sum + value, 0) / forwardInputs.length;
    reversedFinal = reversedInputs.reduce((sum, value) => sum + value, 0) / reversedInputs.length;
  } else {
    const orderedForward = repair === "sorted-recurrence"
      ? [...forwardInputs].sort((left, right) => left - right)
      : forwardInputs;
    const orderedReverse = repair === "sorted-recurrence"
      ? [...reversedInputs].sort((left, right) => left - right)
      : reversedInputs;
    forwardFinal = traceScalarRnn(orderedForward, { recurrentGain: RNN_RECURRENT_GAIN }).finalHidden;
    reversedFinal = traceScalarRnn(orderedReverse, { recurrentGain: RNN_RECURRENT_GAIN }).finalHidden;
  }
  const correct = !approximatelyEqual(forwardFinal, reversedFinal) && forwardFinal * reversedFinal < 0;
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "sorted-recurrence" ? "order-canonicalized" : "order-erased",
    metrics: { forwardFinal, reversedFinal },
  };
}

function bidirectionalPrefix(inputs: readonly number[]) {
  return inputs.map((_, index) => Math.tanh(
    inputs.slice(0, index + 1).reduce((sum, value) => sum + value, 0)
    + inputs.slice(index + 1).reduce((sum, value) => sum + value, 0),
  ));
}

function evaluateCausalRepair(repair: SequenceRepair): SequenceRepairResult {
  if (!sequenceRepairOptions["causal-prefix"].includes(repair)) return notApplicable();
  const prefix = [1, 0];
  const withFuture = [1, 0, -1];
  let prefixBefore: number[];
  let prefixAfter: number[];
  if (repair === "prefix-only") {
    prefixBefore = traceScalarRnn(prefix, { recurrentGain: RNN_RECURRENT_GAIN }).steps.map(({ hidden }) => hidden);
    prefixAfter = traceScalarRnn(withFuture, { recurrentGain: RNN_RECURRENT_GAIN }).steps
      .slice(0, prefix.length)
      .map(({ hidden }) => hidden);
  } else if (repair === "broadcast-final") {
    const beforeFinal = traceScalarRnn(prefix, { recurrentGain: RNN_RECURRENT_GAIN }).finalHidden;
    const afterFinal = traceScalarRnn(withFuture, { recurrentGain: RNN_RECURRENT_GAIN }).finalHidden;
    prefixBefore = prefix.map(() => beforeFinal);
    prefixAfter = prefix.map(() => afterFinal);
  } else {
    prefixBefore = bidirectionalPrefix(prefix);
    prefixAfter = bidirectionalPrefix(withFuture).slice(0, prefix.length);
  }
  const correct = arraysApproximatelyEqual(prefixBefore, prefixAfter);
  return {
    correct,
    reason: correct ? "contract-restored" : "future-leakage",
    metrics: { prefixBefore, prefixAfter },
  };
}

function cellForRepair(
  repair: SequenceRepair,
  input: Pick<GatedCarryProbeInput, "previousCell" | "candidate" | "inputGate" | "forgetGate">,
) {
  if (repair === "forget-old-plus-input-candidate") {
    return input.forgetGate * input.previousCell + input.inputGate * input.candidate;
  }
  if (repair === "input-old-plus-forget-candidate") {
    return input.inputGate * input.previousCell + input.forgetGate * input.candidate;
  }
  return (input.forgetGate * input.previousCell) * (input.inputGate * input.candidate);
}

function evaluateCellRepair(repair: SequenceRepair): SequenceRepairResult {
  if (!sequenceRepairOptions["cell-update"].includes(repair)) return notApplicable();
  const expectedCarryCell = 0.8;
  const expectedWriteCell = -0.3;
  const carryCell = cellForRepair(repair, {
    previousCell: 0.8,
    candidate: -0.3,
    inputGate: 0,
    forgetGate: 1,
  });
  const writeCell = cellForRepair(repair, {
    previousCell: 0.8,
    candidate: -0.3,
    inputGate: 1,
    forgetGate: 0,
  });
  const correct = approximatelyEqual(carryCell, expectedCarryCell)
    && approximatelyEqual(writeCell, expectedWriteCell);
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "input-old-plus-forget-candidate"
        ? "cell-branch-swapped"
        : "cell-branches-multiplied",
    metrics: { carryCell, writeCell, expectedCarryCell, expectedWriteCell },
  };
}

function outputProbe(repair: SequenceRepair, outputGate: number) {
  const previousCell = 0.8;
  const forgetGate = 1;
  if (repair === "output-overwrites-cell") {
    const cell = outputGate * Math.tanh(previousCell);
    return { cell, hidden: cell };
  }
  const cell = previousCell;
  const gate = repair === "forget-gates-hidden" ? forgetGate : outputGate;
  return { cell, hidden: gate * Math.tanh(cell) };
}

function evaluateOutputRepair(repair: SequenceRepair): SequenceRepairResult {
  if (!sequenceRepairOptions["output-boundary"].includes(repair)) return notApplicable();
  const closed = outputProbe(repair, 0);
  const open = outputProbe(repair, 0.9);
  const correct = approximatelyEqual(closed.cell, open.cell)
    && approximatelyEqual(closed.cell, 0.8)
    && approximatelyEqual(closed.hidden, 0)
    && open.hidden > 0;
  return {
    correct,
    reason: correct
      ? "contract-restored"
      : repair === "output-overwrites-cell" ? "cell-overwritten-by-output" : "wrong-hidden-gate",
    metrics: {
      closedCell: closed.cell,
      openCell: open.cell,
      closedHidden: closed.hidden,
      openHidden: open.hidden,
    },
  };
}

export function evaluateSequenceRepair(
  scenario: SequenceDebuggerScenarioId,
  repair: SequenceRepair,
): SequenceRepairResult {
  if (scenario === "order-state") return evaluateOrderRepair(repair);
  if (scenario === "causal-prefix") return evaluateCausalRepair(repair);
  if (scenario === "cell-update") return evaluateCellRepair(repair);
  if (scenario === "output-boundary") return evaluateOutputRepair(repair);
  throw new Error(`Unknown sequence debugger scenario: ${scenario as string}`);
}

export function canCompleteSequencesChapter({
  memoryLabComplete,
  conceptsMastered,
}: {
  memoryLabComplete: boolean;
  debuggerComplete?: boolean;
  conceptsMastered: boolean;
}) {
  return memoryLabComplete && conceptsMastered;
}

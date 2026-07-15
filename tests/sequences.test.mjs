import assert from "node:assert/strict";
import test from "node:test";

import {
  canCompleteSequencesChapter,
  computeScalarRnnGradients,
  evaluateSequenceLabMastery,
  evaluateSequenceRepair,
  gradeSequencePrediction,
  runGatedCarryProbe,
  runScalarRnnCounterfactual,
  runSequenceTrace,
  sequenceDebuggerScenarioIds,
  sequencePresetIds,
  sequencePresets,
  sequenceRepairOptions,
  traceScalarRnn,
} from "../src/features/sequences/sequence-model.ts";

function close(actual, expected, tolerance = 1e-9) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

test("exposes deterministic order, distance, and exact-reversal presets", () => {
  assert.deepEqual(sequencePresetIds, ["short-gap", "long-gap", "reversed"]);
  assert.deepEqual(sequencePresets["short-gap"].tokens, [
    { id: "signal", input: 1 },
    { id: "gap-1", input: 0 },
    { id: "distractor", input: -1 },
  ]);
  assert.deepEqual(
    sequencePresets.reversed.tokens,
    [...sequencePresets["short-gap"].tokens].reverse(),
  );
  assert.equal(sequencePresets["long-gap"].tokens[0].id, "signal");
  assert.equal(sequencePresets["long-gap"].tokens.at(-1).id, "query");
  assert.equal(sequencePresets["long-gap"].tokens.filter(({ id }) => id.startsWith("gap-")).length, 5);
});

test("unrolls a finite bounded scalar RNN without mutating input", () => {
  const inputs = [1, 0, -1];
  const snapshot = [...inputs];
  const trace = traceScalarRnn(inputs, { recurrentGain: 0.5 });

  assert.deepEqual(inputs, snapshot);
  assert.equal(trace.steps.length, inputs.length);
  close(trace.steps[0].hidden, 0.7615941559557649);
  close(trace.steps[1].hidden, 0.3633994843890525);
  close(trace.steps[2].hidden, -0.6741436761583508);
  assert.equal(trace.finalHidden, trace.steps.at(-1).hidden);
  assert.ok(trace.steps.every(({ hidden }) => Number.isFinite(hidden) && Math.abs(hidden) <= 1));
  assert.ok(trace.steps.every(({ preactivation }) => Number.isFinite(preactivation)));
});

test("computes temporal gradients as the product of local Jacobians", () => {
  const trace = traceScalarRnn([0.5, 0, 0, 0, 0, 0], { recurrentGain: 0.5 });
  const product = trace.steps.slice(1).reduce(
    (gradient, step) => gradient * step.localRecurrentDerivative,
    trace.steps[0].localInputDerivative,
  );
  close(trace.inputGradients[0], product, 1e-15);
  close(trace.inputGradients[0], 0.02291574460073485, 1e-15);
  assert.ok(Math.abs(trace.inputGradients[0]) < Math.abs(trace.inputGradients.at(-1)));

  const recomputed = computeScalarRnnGradients(trace.steps);
  assert.deepEqual(recomputed.inputGradients, trace.inputGradients);
  close(recomputed.gradientToInitial, trace.gradientToInitial, 1e-15);
});

test("matches the analytic early-token gradient with a finite difference", () => {
  const inputs = [0.5, 0, 0, 0];
  const config = { recurrentGain: 0.65 };
  const analytic = traceScalarRnn(inputs, config).inputGradients[0];
  const epsilon = 1e-6;
  const plus = traceScalarRnn([inputs[0] + epsilon, ...inputs.slice(1)], config).finalHidden;
  const minus = traceScalarRnn([inputs[0] - epsilon, ...inputs.slice(1)], config).finalHidden;
  close(analytic, (plus - minus) / (2 * epsilon), 1e-8);
});

test("keeps earlier states unchanged under a later counterfactual", () => {
  const result = runScalarRnnCounterfactual([1, 0, 0, 0], { recurrentGain: 0.5 }, 2, -1);
  assert.deepEqual(result.hiddenDeltas.slice(0, 2), [0, 0]);
  assert.equal(result.firstAffectedStep, 2);
  assert.notEqual(result.finalDelta, 0);
  assert.equal(result.absoluteFinalDelta, Math.abs(result.finalDelta));

  const originalSnapshot = structuredClone(result.baseline);
  runScalarRnnCounterfactual([1, 0, 0, 0], { recurrentGain: 0.8 }, 0, -1);
  assert.deepEqual(result.baseline, originalSnapshot);
});

test("rejects invalid scalar traces and counterfactual inputs", () => {
  assert.throws(() => traceScalarRnn([], { recurrentGain: 0.5 }), /between 1 and 64/);
  assert.throws(() => traceScalarRnn([1, Number.NaN], { recurrentGain: 0.5 }), /finite/);
  assert.throws(() => traceScalarRnn([1], { recurrentGain: Number.POSITIVE_INFINITY }), /finite/);
  assert.throws(() => traceScalarRnn([1], { recurrentGain: 0.5, initialHidden: 2 }), /negative one and one/);
  assert.throws(() => runScalarRnnCounterfactual([1], { recurrentGain: 0.5 }, 2, 0), /identify a sequence step/);
});

test("makes short order effects and long RNN decay observable while gated carry retains the signal", () => {
  const shortRnn = runSequenceTrace("short-gap", "rnn");
  const reversedRnn = runSequenceTrace("reversed", "rnn");
  const longRnn = runSequenceTrace("long-gap", "rnn");
  const longLstm = runSequenceTrace("long-gap", "lstm");
  const shortLstm = runSequenceTrace("short-gap", "lstm");
  const reversedLstm = runSequenceTrace("reversed", "lstm");

  assert.ok(shortRnn.finalHidden < 0);
  assert.ok(reversedRnn.finalHidden > 0);
  close(shortRnn.finalHidden, -reversedRnn.finalHidden, 1e-12);
  assert.ok(shortLstm.finalHidden < 0);
  assert.ok(reversedLstm.finalHidden > 0);
  close(shortLstm.finalHidden, -reversedLstm.finalHidden, 1e-12);
  assert.equal(shortRnn.outcome, "retained");
  assert.equal(reversedRnn.outcome, "reversed");
  assert.equal(longRnn.outcome, "faded");
  assert.equal(longLstm.outcome, "retained");
  assert.ok(longLstm.signalGradient > longRnn.signalGradient * 20);
  assert.ok(longRnn.steps.every(({ inputGate, forgetGate, outputGate, cellGradientToSignal }) => (
    inputGate === null && forgetGate === null && outputGate === null && cellGradientToSignal === null
  )));
  assert.ok(longLstm.steps.every(({ inputGate, forgetGate, outputGate }) => (
    inputGate !== null && forgetGate !== null && outputGate !== null
  )));
  const signalStep = longLstm.steps[0];
  const expectedSignalCellGradient = signalStep.inputGate * (1 - signalStep.candidate ** 2);
  close(signalStep.cellGradientToSignal, expectedSignalCellGradient, 1e-15);
  for (let index = 1; index < longLstm.steps.length; index += 1) {
    const previous = longLstm.steps[index - 1];
    const current = longLstm.steps[index];
    close(
      current.cellGradientToSignal,
      previous.cellGradientToSignal * current.forgetGate,
      1e-15,
    );
  }
  for (const step of longLstm.steps) {
    const expectedHiddenGradient = step.outputGate
      * (1 - Math.tanh(step.cell) ** 2)
      * step.cellGradientToSignal;
    close(step.gradientToSignal, expectedHiddenGradient, 1e-15);
  }
  close(longLstm.signalCellGradient, longLstm.steps.at(-1).cellGradientToSignal, 1e-15);
  assert.ok(longLstm.steps[1].gradientToSignal < longLstm.steps[1].cellGradientToSignal);
});

test("applies RNN gain only to RNN traces and exposes invalid RNN gain fallback", () => {
  const defaultTrace = runSequenceTrace("long-gap", "rnn");
  const strongerTrace = runSequenceTrace("long-gap", "rnn", 0.8);
  assert.ok(strongerTrace.finalHidden > defaultTrace.finalHidden);
  assert.ok(strongerTrace.signalGradient > defaultTrace.signalGradient);
  assert.equal(strongerTrace.outcome, "retained");
  assert.throws(() => runSequenceTrace("long-gap", "rnn", 0), /greater than zero and at most one/);
  assert.throws(() => runSequenceTrace("long-gap", "rnn", 1.01), /greater than zero and at most one/);
  assert.throws(() => runSequenceTrace("long-gap", "rnn", Number.NaN), /finite/);
  assert.deepEqual(
    runSequenceTrace("long-gap", "lstm", -0.1),
    runSequenceTrace("long-gap", "lstm", 0.9),
  );
});

test("grades predictions through the approved trace-first public contract", () => {
  const rnnTrace = runSequenceTrace("long-gap", "rnn");
  const lstmTrace = runSequenceTrace("long-gap", "lstm");
  assert.deepEqual(gradeSequencePrediction(rnnTrace, "faded"), {
    correct: true,
    expected: "faded",
  });
  assert.deepEqual(gradeSequencePrediction(lstmTrace, "faded"), {
    correct: false,
    expected: "retained",
  });
  assert.equal(gradeSequencePrediction("retained", lstmTrace).correct, true);
});

test("enforces gated write, carry, and reveal invariants", () => {
  const carry = runGatedCarryProbe({
    previousCell: 0.8,
    candidate: -0.3,
    inputGate: 0,
    forgetGate: 1,
    outputGate: 0,
  });
  close(carry.previousContribution, 0.8);
  close(carry.candidateContribution, 0);
  close(carry.cell, 0.8);
  close(carry.hidden, 0);

  const write = runGatedCarryProbe({
    previousCell: 0.8,
    candidate: -0.3,
    inputGate: 1,
    forgetGate: 0,
    outputGate: 0.9,
  });
  close(write.cell, -0.3);
  close(write.hidden, 0.9 * Math.tanh(-0.3));
  assert.ok(Number.isFinite(write.hidden) && Math.abs(write.hidden) <= 1);

  const closed = runGatedCarryProbe({ ...carry, outputGate: 0 });
  const revealed = runGatedCarryProbe({ ...carry, outputGate: 0.9 });
  close(closed.cell, revealed.cell);
  assert.equal(closed.hidden, 0);
  assert.ok(revealed.hidden > 0);
});

test("rejects invalid gate and candidate contracts", () => {
  const base = {
    previousCell: 0.8,
    candidate: -0.3,
    inputGate: 0,
    forgetGate: 1,
    outputGate: 0,
  };
  assert.throws(() => runGatedCarryProbe({ ...base, inputGate: -0.1 }), /between zero and one/);
  assert.throws(() => runGatedCarryProbe({ ...base, forgetGate: 1.1 }), /between zero and one/);
  assert.throws(() => runGatedCarryProbe({ ...base, outputGate: Number.NaN }), /finite/);
  assert.throws(() => runGatedCarryProbe({ ...base, candidate: 1.01 }), /negative one and one/);
});

test("grades debugger repairs from numeric sequence invariants", () => {
  const correctRepairs = {
    "order-state": "ordered-recurrence",
    "causal-prefix": "prefix-only",
    "cell-update": "forget-old-plus-input-candidate",
    "output-boundary": "output-gates-hidden",
  };
  for (const scenario of sequenceDebuggerScenarioIds) {
    const result = evaluateSequenceRepair(scenario, correctRepairs[scenario]);
    assert.equal(result.correct, true);
    assert.equal(result.reason, "contract-restored");
  }

  assert.equal(evaluateSequenceRepair("order-state", "mean-pooling").reason, "order-erased");
  assert.equal(evaluateSequenceRepair("order-state", "sorted-recurrence").reason, "order-canonicalized");
  assert.equal(evaluateSequenceRepair("causal-prefix", "broadcast-final").reason, "future-leakage");
  assert.equal(evaluateSequenceRepair("causal-prefix", "bidirectional-lookahead").reason, "future-leakage");
  assert.equal(evaluateSequenceRepair("cell-update", "input-old-plus-forget-candidate").reason, "cell-branch-swapped");
  assert.equal(evaluateSequenceRepair("cell-update", "multiply-cell-branches").reason, "cell-branches-multiplied");
  assert.equal(evaluateSequenceRepair("output-boundary", "output-overwrites-cell").reason, "cell-overwritten-by-output");
  assert.equal(evaluateSequenceRepair("output-boundary", "forget-gates-hidden").reason, "wrong-hidden-gate");
  assert.equal(evaluateSequenceRepair("order-state", "prefix-only").reason, "repair-not-applicable");
});

test("publishes only scenario-applicable repair options", () => {
  assert.deepEqual(sequenceRepairOptions["order-state"], [
    "mean-pooling",
    "ordered-recurrence",
    "sorted-recurrence",
  ]);
  const expectedRepairs = {
    "order-state": "ordered-recurrence",
    "causal-prefix": "prefix-only",
    "cell-update": "forget-old-plus-input-candidate",
    "output-boundary": "output-gates-hidden",
  };
  const correctPositions = sequenceDebuggerScenarioIds.map((scenario) => (
    sequenceRepairOptions[scenario].indexOf(expectedRepairs[scenario])
  ));
  assert.deepEqual(correctPositions, [1, 2, 0, 2]);
  for (const scenario of sequenceDebuggerScenarioIds) {
    assert.equal(sequenceRepairOptions[scenario].length, 3);
    assert.equal(new Set(sequenceRepairOptions[scenario]).size, 3);
  }
});

test("requires every causal lab invariant before mastery", () => {
  const complete = {
    correctOrderPrediction: true,
    rnnDecayObserved: true,
    lstmRetentionObserved: true,
    stepInspected: true,
  };
  assert.deepEqual(evaluateSequenceLabMastery(complete), { mastered: true, reason: "mastered" });
  assert.equal(evaluateSequenceLabMastery({ ...complete, correctOrderPrediction: false }).reason, "order-prediction");
  assert.equal(evaluateSequenceLabMastery({ ...complete, rnnDecayObserved: false }).reason, "rnn-decay");
  assert.equal(evaluateSequenceLabMastery({ ...complete, lstmRetentionObserved: false }).reason, "lstm-retention");
  assert.equal(evaluateSequenceLabMastery({ ...complete, stepInspected: false }).reason, "step-inspection");
});

test("conjoins memory lab, debugger, and concept mastery for chapter completion", () => {
  const complete = {
    memoryLabComplete: true,
    debuggerComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteSequencesChapter(complete), true);
  for (const missing of Object.keys(complete)) {
    assert.equal(canCompleteSequencesChapter({ ...complete, [missing]: false }), false);
  }
});

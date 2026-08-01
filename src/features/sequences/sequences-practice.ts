import type { PracticeChallengeDefinition } from "../practice/practice.ts";
import {
  runGatedCarryProbe,
  traceScalarRnn,
  type GatedCarryProbeInput,
} from "./sequence-model.ts";

export type SequencesPracticeChallengeId =
  | "reproduce-shared-recurrence"
  | "diagnose-temporal-gradient"
  | "transfer-gated-carry";

export type RecurrencePrediction =
  | "state-per-timestep"
  | "final-state-only"
  | "independent-token-states";

export type RecurrencePolicy =
  | "shared-recurrence"
  | "input-only"
  | "sum-then-tanh";

export type TemporalGradientPrediction =
  | "all-local-edges"
  | "first-step-only"
  | "final-step-only";

export type TemporalGradientPolicy =
  | "include-recurrent-gains"
  | "omit-recurrent-gains"
  | "last-local-derivative";

export type GatedCarryPrediction =
  | "cell-survives-closed-output"
  | "closed-output-erases-both"
  | "hidden-always-equals-cell";

export type GatedCarryPolicy =
  | "carry-write-reveal"
  | "output-erases-cell"
  | "swap-input-forget";

export type RecurrenceFixture = Readonly<{
  inputs: readonly number[];
  recurrentGain: number;
}>;

export type TemporalGradientFixture = RecurrenceFixture;
export type GatedCarryFixture = Readonly<GatedCarryProbeInput>;

export const sequencesPracticeChallenges:
readonly PracticeChallengeDefinition<SequencesPracticeChallengeId>[] = [
  {
    id: "reproduce-shared-recurrence",
    level: "single-boundary",
    skillId: "reproduce",
    label: "h[t]",
    title: "Reproduce shared recurrence on fresh sequences",
    summary:
      "Emit one state per timestep while carrying the previous state through a shared cell.",
  },
  {
    id: "diagnose-temporal-gradient",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "∂hT/∂x0",
    title: "Diagnose a missing edge in the temporal gradient",
    summary:
      "Match an analytic early-input gradient to a numerical probe on two path lengths.",
  },
  {
    id: "transfer-gated-carry",
    level: "transfer",
    skillId: "transfer",
    label: "c / h",
    title: "Transfer carry, write, and reveal to fresh gates",
    summary:
      "Preserve cell memory independently from what the output gate reveals as hidden state.",
  },
] as const;

export const recurrenceVisibleFixture: RecurrenceFixture = Object.freeze({
  inputs: Object.freeze([0.6, -0.2, 0.4]),
  recurrentGain: 0.55,
});

export const recurrenceSecondFixture: RecurrenceFixture = Object.freeze({
  inputs: Object.freeze([-0.3, 0.7, 0, -0.1]),
  recurrentGain: 0.4,
});

export const temporalGradientVisibleFixture: TemporalGradientFixture =
  Object.freeze({
    inputs: Object.freeze([0.4, 0, 0, 0]),
    recurrentGain: 0.6,
  });

export const temporalGradientSecondFixture: TemporalGradientFixture =
  Object.freeze({
    inputs: Object.freeze([-0.5, 0.2, 0, 0, 0]),
    recurrentGain: 0.7,
  });

export const gatedCarryVisibleFixture: GatedCarryFixture = Object.freeze({
  previousCell: 0.75,
  candidate: -0.6,
  inputGate: 0,
  forgetGate: 1,
  outputGate: 0,
});

export const gatedCarrySecondFixture: GatedCarryFixture = Object.freeze({
  previousCell: -0.5,
  candidate: 0.8,
  inputGate: 0.25,
  forgetGate: 0.8,
  outputGate: 0.7,
});

export function runSharedRecurrence(
  fixture: RecurrenceFixture,
  policy: RecurrencePolicy,
) {
  if (policy === "shared-recurrence") {
    const trace = traceScalarRnn(fixture.inputs, {
      recurrentGain: fixture.recurrentGain,
    });
    return {
      states: trace.steps.map(({ hidden }) => hidden),
      outputShape: [fixture.inputs.length, 1] as const,
    };
  }
  if (policy === "input-only") {
    return {
      states: fixture.inputs.map((input) => Math.tanh(input)),
      outputShape: [fixture.inputs.length, 1] as const,
    };
  }
  return {
    states: [Math.tanh(
      fixture.inputs.reduce((sum, input) => sum + input, 0),
    )],
    outputShape: [1, 1] as const,
  };
}

export function evaluateEarlyInputGradient(
  fixture: TemporalGradientFixture,
  policy: TemporalGradientPolicy,
) {
  const trace = traceScalarRnn(fixture.inputs, {
    recurrentGain: fixture.recurrentGain,
  });
  let analytic: number;
  if (policy === "include-recurrent-gains") {
    analytic = trace.inputGradients[0];
  } else if (policy === "omit-recurrent-gains") {
    analytic = trace.steps.slice(1).reduce(
      (gradient, step) => gradient * (1 - step.hidden ** 2),
      trace.steps[0].localInputDerivative,
    );
  } else {
    analytic = trace.steps.at(-1)!.localInputDerivative;
  }
  const epsilon = 1e-6;
  const plusInputs = [...fixture.inputs];
  const minusInputs = [...fixture.inputs];
  plusInputs[0] += epsilon;
  minusInputs[0] -= epsilon;
  const plus = traceScalarRnn(plusInputs, {
    recurrentGain: fixture.recurrentGain,
  }).finalHidden;
  const minus = traceScalarRnn(minusInputs, {
    recurrentGain: fixture.recurrentGain,
  }).finalHidden;
  return {
    analytic,
    numerical: (plus - minus) / (2 * epsilon),
    recurrentEdges: fixture.inputs.length - 1,
  };
}

export function runGatedCarryPolicy(
  fixture: GatedCarryFixture,
  policy: GatedCarryPolicy,
) {
  if (policy === "carry-write-reveal") {
    return runGatedCarryProbe(fixture);
  }
  if (policy === "output-erases-cell") {
    const correct = runGatedCarryProbe(fixture);
    return fixture.outputGate === 0
      ? { ...correct, cell: 0, hidden: 0 }
      : correct;
  }
  const previousContribution = fixture.inputGate * fixture.previousCell;
  const candidateContribution = fixture.forgetGate * fixture.candidate;
  const cell = previousContribution + candidateContribution;
  return {
    ...fixture,
    previousContribution,
    candidateContribution,
    cell,
    hidden: fixture.outputGate * Math.tanh(cell),
  };
}

export type LinearPoint = {
  x: number;
  y: number;
};

export type LinearWeights = {
  bias: number;
  slope: number;
};

export type GradientVector = {
  bias: number;
  slope: number;
};

export const optimizationDataset: readonly LinearPoint[] = [
  { x: -1, y: -1 },
  { x: 0, y: 1 },
  { x: 1, y: 3 },
] as const;

export type DescentConfig = {
  initialWeights: LinearWeights;
  learningRate: number;
  steps: number;
};

export type DescentOutcome = "slow" | "converging" | "diverging";

export type DescentSnapshot = {
  step: number;
  weights: LinearWeights;
  gradient: GradientVector;
  loss: number;
};

export type DescentSimulation = {
  snapshots: DescentSnapshot[];
  initialLoss: number;
  finalLoss: number;
  outcome: DescentOutcome;
  stoppedEarly: boolean;
};

const MAX_RENDERABLE_LOSS = 1_000_000;

export const descentPresets = {
  "too-small": {
    initialWeights: { bias: -2, slope: -1 },
    learningRate: 0.02,
    steps: 12,
  },
  useful: {
    initialWeights: { bias: -2, slope: -1 },
    learningRate: 0.3,
    steps: 12,
  },
  "too-large": {
    initialWeights: { bias: -2, slope: -1 },
    learningRate: 1.1,
    steps: 12,
  },
  "near-solution": {
    initialWeights: { bias: 0, slope: 1 },
    learningRate: 0.3,
    steps: 6,
  },
} as const satisfies Record<string, DescentConfig>;

export function predictLinear(weights: LinearWeights, x: number) {
  return weights.bias + weights.slope * x;
}

export function meanSquaredError(
  weights: LinearWeights,
  points: readonly LinearPoint[] = optimizationDataset,
) {
  if (points.length === 0) return 0;
  const squaredError = points.reduce((sum, point) => {
    const residual = predictLinear(weights, point.x) - point.y;
    return sum + residual * residual;
  }, 0);
  return squaredError / points.length;
}

export function linearMseGradient(
  weights: LinearWeights,
  points: readonly LinearPoint[] = optimizationDataset,
): GradientVector {
  if (points.length === 0) return { bias: 0, slope: 0 };
  const totals = points.reduce(
    (sum, point) => {
      const residual = predictLinear(weights, point.x) - point.y;
      return {
        bias: sum.bias + residual,
        slope: sum.slope + residual * point.x,
      };
    },
    { bias: 0, slope: 0 },
  );
  const scale = 2 / points.length;
  return {
    bias: totals.bias * scale,
    slope: totals.slope * scale,
  };
}

export function applyGradientStep(
  weights: LinearWeights,
  gradient: GradientVector,
  learningRate: number,
): LinearWeights {
  return {
    bias: weights.bias - learningRate * gradient.bias,
    slope: weights.slope - learningRate * gradient.slope,
  };
}

function safeSnapshot(step: number, weights: LinearWeights): DescentSnapshot {
  const loss = meanSquaredError(weights);
  return {
    step,
    weights,
    gradient: linearMseGradient(weights),
    loss,
  };
}

export function classifyDescentRun(
  initialLoss: number,
  finalLoss: number,
  stoppedEarly = false,
): DescentOutcome {
  if (
    stoppedEarly
    || !Number.isFinite(finalLoss)
    || finalLoss > initialLoss * 1.05
  ) return "diverging";
  if (finalLoss <= Math.max(0.01, initialLoss * 0.01)) return "converging";
  return "slow";
}

export function simulateGradientDescent(config: DescentConfig): DescentSimulation {
  const safeSteps = Math.max(1, Math.min(24, Math.trunc(config.steps)));
  let weights = { ...config.initialWeights };
  const snapshots = [safeSnapshot(0, weights)];
  let stoppedEarly = false;

  for (let step = 1; step <= safeSteps; step += 1) {
    const previous = snapshots.at(-1)!;
    weights = applyGradientStep(weights, previous.gradient, config.learningRate);
    const snapshot = safeSnapshot(step, weights);
    snapshots.push(snapshot);
    if (
      !Number.isFinite(snapshot.loss)
      || snapshot.loss > MAX_RENDERABLE_LOSS
    ) {
      stoppedEarly = true;
      break;
    }
  }

  const initialLoss = snapshots[0].loss;
  const finalLoss = snapshots.at(-1)!.loss;
  return {
    snapshots,
    initialLoss,
    finalLoss,
    outcome: classifyDescentRun(initialLoss, finalLoss, stoppedEarly),
    stoppedEarly,
  };
}

export function canMasterDescentRepair({
  badRunConfig,
  currentConfig,
  predictedOutcome,
  simulation,
}: {
  badRunConfig: DescentConfig | null;
  currentConfig: DescentConfig;
  predictedOutcome: DescentOutcome | "";
  simulation: DescentSimulation;
}) {
  if (!badRunConfig) return false;
  const sameStartingConditions =
    currentConfig.initialWeights.bias === badRunConfig.initialWeights.bias
    && currentConfig.initialWeights.slope === badRunConfig.initialWeights.slope
    && currentConfig.steps === badRunConfig.steps;
  const changedLearningRate =
    currentConfig.learningRate !== badRunConfig.learningRate;
  const meaningfulLossReduction =
    simulation.initialLoss > 0.01
    && simulation.finalLoss < simulation.initialLoss;
  return predictedOutcome === simulation.outcome
    && simulation.outcome === "converging"
    && sameStartingConditions
    && changedLearningRate
    && meaningfulLossReduction;
}

export const optimizerActionIds = [
  "subtract-gradient",
  "add-gradient",
  "stop",
] as const;

export type OptimizerActionId = (typeof optimizerActionIds)[number];

export const optimizerDebuggerScenarioIds = [
  "positive-gradient",
  "negative-gradient",
  "steep-gradient",
  "small-gradient",
] as const;

export type OptimizerDebuggerScenarioId =
  (typeof optimizerDebuggerScenarioIds)[number];

export type OptimizerDebuggerScenario = {
  id: OptimizerDebuggerScenarioId;
  weight: number;
  target: number;
  lossScale: number;
  learningRates: readonly number[];
};

export const optimizerDebuggerScenarios: Record<
  OptimizerDebuggerScenarioId,
  OptimizerDebuggerScenario
> = {
  "positive-gradient": {
    id: "positive-gradient",
    weight: 3,
    target: 1,
    lossScale: 1,
    learningRates: [0.25, 1],
  },
  "negative-gradient": {
    id: "negative-gradient",
    weight: -1,
    target: 1,
    lossScale: 1,
    learningRates: [0.25, 1],
  },
  "steep-gradient": {
    id: "steep-gradient",
    weight: 2,
    target: 1,
    lossScale: 4,
    learningRates: [0.05, 0.25, 0.5],
  },
  "small-gradient": {
    id: "small-gradient",
    weight: 1.1,
    target: 1,
    lossScale: 1,
    learningRates: [0.25, 1],
  },
};

export type OptimizerDebugResult = {
  correct: boolean;
  reason: "correct" | "wrong-sign" | "no-update" | "overshot";
  gradient: number;
  delta: number;
  nextWeight: number;
  previousLoss: number;
  nextLoss: number;
};

function scalarLoss(weight: number, target: number, scale: number) {
  return scale * (weight - target) ** 2;
}

export function evaluateOptimizerAction(
  scenarioId: OptimizerDebuggerScenarioId,
  action: OptimizerActionId,
  learningRate: number,
): OptimizerDebugResult {
  const scenario = optimizerDebuggerScenarios[scenarioId];
  const gradient = 2 * scenario.lossScale * (scenario.weight - scenario.target);
  const delta = action === "subtract-gradient"
    ? -learningRate * gradient
    : action === "add-gradient"
      ? learningRate * gradient
      : 0;
  const nextWeight = scenario.weight + delta;
  const previousLoss = scalarLoss(
    scenario.weight,
    scenario.target,
    scenario.lossScale,
  );
  const nextLoss = scalarLoss(nextWeight, scenario.target, scenario.lossScale);

  if (action === "stop") {
    return {
      correct: false,
      reason: "no-update",
      gradient,
      delta,
      nextWeight,
      previousLoss,
      nextLoss,
    };
  }
  if (gradient * delta >= 0) {
    return {
      correct: false,
      reason: "wrong-sign",
      gradient,
      delta,
      nextWeight,
      previousLoss,
      nextLoss,
    };
  }
  if (nextLoss >= previousLoss - 1e-10) {
    return {
      correct: false,
      reason: "overshot",
      gradient,
      delta,
      nextWeight,
      previousLoss,
      nextLoss,
    };
  }
  return {
    correct: true,
    reason: "correct",
    gradient,
    delta,
    nextWeight,
    previousLoss,
    nextLoss,
  };
}

export function canCompleteOptimizationChapter({
  descentLabComplete,
  debuggerComplete,
  conceptsMastered,
}: {
  descentLabComplete: boolean;
  debuggerComplete: boolean;
  conceptsMastered: boolean;
}) {
  return descentLabComplete && debuggerComplete && conceptsMastered;
}

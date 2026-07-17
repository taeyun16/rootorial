import assert from "node:assert/strict";
import test from "node:test";
import {
  selfAttentionForwardTraceCode,
  selfAttentionMaskRepairCode,
} from "../src/data/selfAttentionNotebook.ts";
import {
  SELF_ATTENTION_HEAD_COUNT,
  SELF_ATTENTION_HEAD_DIMENSION,
  SELF_ATTENTION_MODEL_DIMENSION,
  SELF_ATTENTION_TOKEN_COUNT,
  canCompleteSelfAttentionChapter,
  canonicalSelfAttentionConfig,
  concatHeads,
  emptySelfAttentionLabEvidence,
  evaluateSelfAttentionLabMastery,
  evaluateSelfAttentionRepair,
  gradeSelfAttentionChallenge,
  isValidSelfAttentionInspection,
  runSelfAttention,
  selfAttentionChallengeDefaults,
  selfAttentionChallengeIds,
  selfAttentionDebuggerScenarioIds,
  selfAttentionDebuggerScenarios,
  selfAttentionFixture,
  selfAttentionTokens,
  splitHeads,
} from "../src/features/self-attention/self-attention-model.ts";

const EPSILON = 1e-12;

test("ships independent NumPy bridges for the full forward trace and mask-order repair", () => {
  assert.match(selfAttentionForwardTraceCode, /Q = X @ W_Q/);
  assert.match(selfAttentionForwardTraceCode, /K = X @ W_K/);
  assert.match(selfAttentionForwardTraceCode, /V = X @ W_V/);
  assert.match(selfAttentionForwardTraceCode, /return matrix\.reshape\(T, HEADS, D_HEAD\)\.transpose\(1, 0, 2\)/);
  assert.match(selfAttentionForwardTraceCode, /raw_scores = Q_heads @ K_heads\.transpose\(0, 2, 1\)/);
  assert.match(selfAttentionForwardTraceCode, /scaled_scores = raw_scores \/ np\.sqrt\(D_HEAD\)/);
  assert.match(selfAttentionForwardTraceCode, /\[0\.575975, 0\.283995, 0\.140029, 0\.0\]/);
  assert.match(selfAttentionForwardTraceCode, /\[0\.744765, 0\.503490, 0\.716005, 0\.424025\]/);
  assert.match(selfAttentionForwardTraceCode, /inactive_padding_query/);
  assert.match(selfAttentionMaskRepairCode, /mask_before_softmax = False/);
  assert.match(selfAttentionMaskRepairCode, /\[0\.097785, 0\.330238, 0\.778819\]/);
  assert.match(selfAttentionMaskRepairCode, /active_row_sums,\n    np\.ones\(3\)/);
  assert.match(selfAttentionMaskRepairCode, /padding_key_mass/);
  assert.match(selfAttentionMaskRepairCode, /inactive_query_mass/);
  assert.doesNotMatch(selfAttentionForwardTraceCode, /[가-힣]/);
  assert.doesNotMatch(selfAttentionMaskRepairCode, /[가-힣]/);
});

function approximatelyEqual(actual, expected, tolerance = EPSILON) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `${actual} should be within ${tolerance} of ${expected}`,
  );
}

function assertShape(matrix, rows, columns) {
  assert.equal(matrix.length, rows);
  matrix.forEach((row) => assert.equal(row.length, columns));
}

function assertMatrixApproximatelyEqual(actual, expected, tolerance = EPSILON) {
  assertShape(actual, expected.length, expected[0]?.length ?? 0);
  actual.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    approximatelyEqual(value, expected[rowIndex][columnIndex], tolerance);
  }));
}

const solvedChallenges = {
  projection: {
    prediction: "same-x-separate-qkv",
    config: { ...canonicalSelfAttentionConfig },
    stage: "projections",
    observation: { headIndex: 1, queryIndex: 0, keyIndex: null },
  },
  scaling: {
    prediction: "same-top-higher-entropy",
    config: { ...canonicalSelfAttentionConfig },
    stage: "scores",
    observation: { headIndex: 1, queryIndex: 2, keyIndex: null },
  },
  "causal-mask": {
    prediction: "future-zero-row-renormalized",
    config: { ...canonicalSelfAttentionConfig },
    stage: "mask",
    observation: { headIndex: 1, queryIndex: 1, keyIndex: 2 },
  },
  "padding-key": {
    prediction: "padding-gains-mass-active-renormalizes-pad-query-zero",
    config: { ...canonicalSelfAttentionConfig, causal: false, exposePaddingKey: true },
    stage: "weights",
    observation: { headIndex: 1, queryIndex: 0, keyIndex: 3 },
  },
  "multi-head": {
    prediction: "concat-preserves-token-shape",
    config: { ...canonicalSelfAttentionConfig },
    stage: "output",
    observation: { headIndex: 0, queryIndex: 2, keyIndex: null },
  },
};

function validEvidence() {
  let sequence = 0;
  return {
    events: selfAttentionChallengeIds.flatMap((challengeId, challengeIndex) => {
      const attemptId = `attempt-${challengeIndex + 1}`;
      const solved = solvedChallenges[challengeId];
      return [
        {
          kind: "prediction",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...solved.config },
          prediction: solved.prediction,
        },
        {
          kind: "run",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...solved.config },
        },
        {
          kind: "inspect",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...solved.config },
          stage: solved.stage,
          ...solved.observation,
        },
      ];
    }),
  };
}

test("publishes a frozen four-token, four-feature, two-head teaching fixture", () => {
  assert.equal(SELF_ATTENTION_TOKEN_COUNT, 4);
  assert.equal(SELF_ATTENTION_MODEL_DIMENSION, 4);
  assert.equal(SELF_ATTENTION_HEAD_COUNT, 2);
  assert.equal(SELF_ATTENTION_HEAD_DIMENSION, 2);
  assert.deepEqual(selfAttentionTokens, ["the", "cat", "sat", "<pad>"]);
  assertShape(selfAttentionFixture.input, 4, 4);
  assertShape(selfAttentionFixture.wq, 4, 4);
  assertShape(selfAttentionFixture.wk, 4, 4);
  assertShape(selfAttentionFixture.wv, 4, 4);
  assertShape(selfAttentionFixture.wo, 4, 4);
  assert.deepEqual(selfAttentionFixture.queryActive, [true, true, true, false]);
  assert.deepEqual(selfAttentionFixture.keyVisible, [true, true, true, false]);
  assert.ok(Object.isFrozen(selfAttentionTokens));
  assert.ok(Object.isFrozen(selfAttentionFixture));
  assert.ok(Object.isFrozen(selfAttentionFixture.input));
  assert.ok(Object.isFrozen(selfAttentionFixture.input[0]));
  assert.ok(Object.isFrozen(selfAttentionFixture.wq));
  assert.ok(Object.isFrozen(selfAttentionFixture.wq[0]));
  assert.ok(Object.isFrozen(selfAttentionFixture.queryActive));
  assert.ok(Object.isFrozen(canonicalSelfAttentionConfig));
  assert.throws(() => {
    selfAttentionFixture.input[0][0] = 99;
  }, TypeError);
  assert.equal(runSelfAttention().input[0][0], 1);
});

test("projects the same X into distinct exact Q, K, and V matrices", () => {
  const trace = runSelfAttention();
  assert.deepEqual(trace.input, [
    [1, 0, 2, 0],
    [0, 1, 1, 0],
    [1, 1, 0, 1],
    [0, 0, 1, 1],
  ]);
  assert.deepEqual(trace.projected.q, trace.input);
  assert.deepEqual(trace.projected.k, [
    [1, 0, 0, 2],
    [0, 1, 0, 1],
    [1, 1, 1, 0],
    [0, 0, 1, 1],
  ]);
  assert.deepEqual(trace.projected.v, [
    [2, 0, 1, 0],
    [1, 0, 0, 1],
    [0, 1, 1, 1],
    [1, 1, 0, 0],
  ]);
  assert.notDeepEqual(trace.projected.q, trace.projected.k);
  assert.notDeepEqual(trace.projected.q, trace.projected.v);
  assert.notDeepEqual(trace.projected.k, trace.projected.v);

  assert.equal(trace.heads.length, 2);
  trace.heads.forEach((head, headIndex) => {
    assert.equal(head.headIndex, headIndex);
    for (const matrix of [head.q, head.k, head.v, head.contexts]) assertShape(matrix, 4, 2);
    for (const matrix of [head.rawScores, head.scaledScores, head.allowed, head.maskedScores, head.weights]) {
      assertShape(matrix, 4, 4);
    }
  });
  assertShape(trace.concatenated, 4, 4);
  assertShape(trace.attentionOutput, 4, 4);
  assert.deepEqual(trace.handoff, {
    inputShape: [4, 4],
    outputShape: [4, 4],
    residualCompatible: true,
    appliedResidual: false,
    includesPosition: false,
    includesLayerNorm: false,
    includesFfn: false,
  });
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.projected.q));
  assert.ok(Object.isFrozen(trace.heads[0].weights[0]));
});

test("splits the feature axis into heads and concatenates it back without loss", () => {
  const matrix = [
    [1, 2, 3, 4, 5, 6],
    [7, 8, 9, 10, 11, 12],
  ];
  const heads = splitHeads(matrix, 3);
  assert.deepEqual(heads, [
    [[1, 2], [7, 8]],
    [[3, 4], [9, 10]],
    [[5, 6], [11, 12]],
  ]);
  assert.deepEqual(concatHeads(heads), matrix);
  assert.ok(Object.isFrozen(heads));
  assert.ok(Object.isFrozen(heads[0]));
  assert.ok(Object.isFrozen(concatHeads(heads)));

  const canonical = runSelfAttention();
  assert.deepEqual(concatHeads(splitHeads(canonical.projected.v)), canonical.projected.v);
  assert.deepEqual(
    canonical.concatenated,
    concatHeads(canonical.heads.map(({ contexts }) => contexts)),
  );
});

test("rejects malformed split and concatenation contracts", () => {
  assert.throws(() => splitHeads([], 2), /non-empty rectangular matrix/);
  assert.throws(() => splitHeads([[1, 2], [3]], 2), /non-empty rectangular matrix/);
  assert.throws(() => splitHeads([[1, 2, 3]], 2), /divisible by head count/);
  assert.throws(() => splitHeads([[1, 2]], 0), /positive integer/);
  assert.throws(() => splitHeads([[1, 2]], 1.5), /positive integer/);
  assert.throws(() => concatHeads([]), /at least one head/);
  assert.throws(() => concatHeads([[]]), /share \[token, head-dimension\] shape/);
  assert.throws(
    () => concatHeads([[[1, 2]], [[3, 4], [5, 6]]]),
    /share \[token, head-dimension\] shape/,
  );
  assert.throws(
    () => concatHeads([[[1, 2]], [[3]]]),
    /share \[token, head-dimension\] shape/,
  );
});

test("scales QK scores by sqrt(d_h), preserves argmax, and softens distributions", () => {
  const scaled = runSelfAttention({
    ...canonicalSelfAttentionConfig,
    causal: false,
    scaleScores: true,
  });
  const unscaled = runSelfAttention({
    ...canonicalSelfAttentionConfig,
    causal: false,
    scaleScores: false,
  });
  const divisor = Math.sqrt(SELF_ATTENTION_HEAD_DIMENSION);

  scaled.heads.forEach((head, headIndex) => {
    assert.deepEqual(head.rawScores, unscaled.heads[headIndex].rawScores);
    head.scaledScores.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
      approximatelyEqual(value, head.rawScores[rowIndex][columnIndex] / divisor);
    }));
    assert.deepEqual(
      head.topKeyIndices.slice(0, 3),
      unscaled.heads[headIndex].topKeyIndices.slice(0, 3),
    );
    head.entropies.slice(0, 3).forEach((value, rowIndex) => {
      assert.ok(value + EPSILON >= unscaled.heads[headIndex].entropies[rowIndex]);
    });
  });
  assert.ok(scaled.heads[1].entropies[2] > unscaled.heads[1].entropies[2]);
  assert.notDeepEqual(scaled.heads[1].weights[2], unscaled.heads[1].weights[2]);
  assert.deepEqual(unscaled.heads[0].scaledScores, unscaled.heads[0].rawScores);
});

test("applies causal and padding masks before row softmax", () => {
  const trace = runSelfAttention(canonicalSelfAttentionConfig);
  trace.heads.forEach((head) => {
    for (let queryIndex = 0; queryIndex < 4; queryIndex += 1) {
      for (let keyIndex = 0; keyIndex < 4; keyIndex += 1) {
        const expectedAllowed = queryIndex < 3 && keyIndex < 3 && keyIndex <= queryIndex;
        assert.equal(head.allowed[queryIndex][keyIndex], expectedAllowed);
        assert.equal(head.maskedScores[queryIndex][keyIndex] === null, !expectedAllowed);
        if (!expectedAllowed) assert.equal(head.weights[queryIndex][keyIndex], 0);
      }
    }
    head.rowSums.slice(0, 3).forEach((sum) => approximatelyEqual(sum, 1));
    assert.equal(head.rowSums[3], 0);
    assert.ok(head.weights[0][0] > 0, "the current token remains visible to itself");
    assert.ok(head.weights[1][1] > 0, "the current token is not removed by the causal mask");
    assert.ok(head.weights[2][2] > 0, "the final active token remains visible to itself");
    assert.deepEqual(head.contexts[3], [0, 0]);
  });
  assert.deepEqual(trace.attentionOutput[3], [0, 0, 0, 0]);
});

test("exposing the padding key gives active queries mass but never activates the padding query", () => {
  const hidden = runSelfAttention({
    ...canonicalSelfAttentionConfig,
    causal: false,
    exposePaddingKey: false,
  });
  const exposed = runSelfAttention({
    ...canonicalSelfAttentionConfig,
    causal: false,
    exposePaddingKey: true,
  });

  exposed.heads.forEach((head, headIndex) => {
    head.weights.slice(0, 3).forEach((row, queryIndex) => {
      assert.ok(row[3] > 0);
      approximatelyEqual(row.reduce((sum, value) => sum + value, 0), 1);
      assert.ok(row.slice(0, 3).some((value, keyIndex) => (
        value < hidden.heads[headIndex].weights[queryIndex][keyIndex]
      )));
    });
    assert.deepEqual(head.allowed[3], [false, false, false, false]);
    assert.deepEqual(head.weights[3], [0, 0, 0, 0]);
    assert.equal(head.rowSums[3], 0);
  });
  assert.notDeepEqual(exposed.attentionOutput.slice(0, 3), hidden.attentionOutput.slice(0, 3));
  assert.deepEqual(exposed.attentionOutput[3], [0, 0, 0, 0]);
});

test("validates run controls and accepts both documented gain boundaries", () => {
  for (const inputGain of [0.25, 4]) {
    const trace = runSelfAttention({ ...canonicalSelfAttentionConfig, inputGain });
    approximatelyEqual(trace.input[0][0], inputGain);
    approximatelyEqual(trace.projected.q[0][2], 2 * inputGain);
  }
  const invalidConfigs = [
    [{ ...canonicalSelfAttentionConfig, inputGain: 0.249 }, /between 0.25 and 4/],
    [{ ...canonicalSelfAttentionConfig, inputGain: 4.001 }, /between 0.25 and 4/],
    [{ ...canonicalSelfAttentionConfig, inputGain: Number.NaN }, /finite and between/],
    [{ ...canonicalSelfAttentionConfig, inputGain: Infinity }, /finite and between/],
    [{ ...canonicalSelfAttentionConfig, causal: "yes" }, /controls must be boolean/],
    [{ ...canonicalSelfAttentionConfig, scaleScores: 1 }, /controls must be boolean/],
    [{ ...canonicalSelfAttentionConfig, exposePaddingKey: null }, /controls must be boolean/],
  ];
  invalidConfigs.forEach(([config, pattern]) => assert.throws(() => runSelfAttention(config), pattern));
  assert.throws(() => runSelfAttention(null), /config is required/);
});

test("grades every challenge from prediction, controls, and computed semantics", () => {
  assert.deepEqual(selfAttentionChallengeIds, [
    "projection",
    "scaling",
    "causal-mask",
    "padding-key",
    "multi-head",
  ]);
  assert.equal(selfAttentionChallengeDefaults.scaling.scaleScores, false);
  assert.equal(selfAttentionChallengeDefaults["causal-mask"].causal, false);
  assert.equal(selfAttentionChallengeDefaults["padding-key"].exposePaddingKey, false);

  for (const challengeId of selfAttentionChallengeIds) {
    const solved = solvedChallenges[challengeId];
    const grade = gradeSelfAttentionChallenge(challengeId, solved.prediction, solved.config);
    assert.equal(grade.correct, true, challengeId);
    assert.equal(grade.predictionCorrect, true, challengeId);
    assert.equal(grade.configCorrect, true, challengeId);

    const wrongPrediction = challengeId === "projection" ? "qkv-identical" : "same-x-separate-qkv";
    const wrongPredictionGrade = gradeSelfAttentionChallenge(challengeId, wrongPrediction, solved.config);
    assert.equal(wrongPredictionGrade.correct, false, challengeId);
    assert.equal(wrongPredictionGrade.predictionCorrect, false, challengeId);

    const wrongConfig = { ...solved.config, inputGain: 2 };
    const wrongConfigGrade = gradeSelfAttentionChallenge(challengeId, solved.prediction, wrongConfig);
    assert.equal(wrongConfigGrade.correct, false, challengeId);
    assert.equal(wrongConfigGrade.configCorrect, false, challengeId);
  }
  assert.throws(
    () => gradeSelfAttentionChallenge("unknown", "same-x-separate-qkv", canonicalSelfAttentionConfig),
    /Unknown Self-Attention challenge/,
  );
});

test("exposes four debugger incidents with exactly one semantic repair each", () => {
  assert.deepEqual(selfAttentionDebuggerScenarioIds, [
    "qkv-projections",
    "score-scaling",
    "mask-softmax",
    "head-merge-handoff",
  ]);
  const correctRepairs = {
    "qkv-projections": "project-qkv-independently",
    "score-scaling": "divide-by-sqrt-head-dimension",
    "mask-softmax": "mask-before-softmax",
    "head-merge-handoff": "concat-features-then-output",
  };
  for (const scenarioId of selfAttentionDebuggerScenarioIds) {
    const correct = selfAttentionDebuggerScenarios[scenarioId].options.filter(({ id }) => (
      evaluateSelfAttentionRepair(scenarioId, id).correct
    ));
    assert.deepEqual(correct.map(({ id }) => id), [correctRepairs[scenarioId]]);
  }
});

test("reports a specific computed failure reason for every debugger repair", () => {
  const reasons = {
    "qkv-projections": {
      "reuse-query-for-kv": "qkv-roles-collapsed",
      "project-qkv-independently": "contract-restored",
      "use-raw-x-for-qkv": "raw-input-bypassed-projections",
    },
    "score-scaling": {
      "divide-by-head-dimension": "wrong-scale-divisor",
      "leave-unscaled": "scores-unscaled",
      "divide-by-sqrt-head-dimension": "contract-restored",
    },
    "mask-softmax": {
      "mask-before-softmax": "contract-restored",
      "softmax-then-zero": "row-mass-lost",
      "causal-only": "padding-leak",
      "padding-only": "future-leak",
    },
    "head-merge-handoff": {
      "average-heads": "head-features-averaged",
      "concat-features-then-output": "contract-restored",
      "concat-token-axis": "token-axis-expanded",
    },
  };

  for (const scenarioId of selfAttentionDebuggerScenarioIds) {
    for (const option of selfAttentionDebuggerScenarios[scenarioId].options) {
      const result = evaluateSelfAttentionRepair(scenarioId, option.id);
      assert.equal(result.scenarioId, scenarioId);
      assert.equal(result.repair, option.id);
      assert.equal(result.reason, reasons[scenarioId][option.id]);
      assert.equal(result.correct, result.reason === "contract-restored");
      assert.ok(Object.isFrozen(result));
      assert.ok(Object.isFrozen(result.metrics));
    }
  }

  approximatelyEqual(
    evaluateSelfAttentionRepair("score-scaling", "divide-by-sqrt-head-dimension").metrics.divisor,
    Math.sqrt(2),
  );
  assert.equal(evaluateSelfAttentionRepair("mask-softmax", "mask-before-softmax").metrics.futureMass, 0);
  assert.equal(evaluateSelfAttentionRepair("mask-softmax", "mask-before-softmax").metrics.paddingMass, 0);
  approximatelyEqual(
    evaluateSelfAttentionRepair("mask-softmax", "mask-before-softmax").metrics.minimumActiveRowSum,
    1,
  );
  assert.deepEqual(
    [
      evaluateSelfAttentionRepair("head-merge-handoff", "average-heads").metrics.outputRows,
      evaluateSelfAttentionRepair("head-merge-handoff", "average-heads").metrics.outputColumns,
    ],
    [4, 2],
  );
  assert.deepEqual(
    [
      evaluateSelfAttentionRepair("head-merge-handoff", "concat-token-axis").metrics.outputRows,
      evaluateSelfAttentionRepair("head-merge-handoff", "concat-token-axis").metrics.outputColumns,
    ],
    [8, 2],
  );
  assert.throws(
    () => evaluateSelfAttentionRepair("score-scaling", "mask-before-softmax"),
    /does not belong/,
  );
  assert.throws(
    () => evaluateSelfAttentionRepair("unknown", "divide-by-sqrt-head-dimension"),
    /Unknown Self-Attention debugger scenario/,
  );
});

test("replays prediction, run, and required inspection evidence for all five challenges", () => {
  assert.deepEqual(evaluateSelfAttentionLabMastery(emptySelfAttentionLabEvidence), {
    mastered: false,
    reason: "complete-five-challenges",
    completedChallengeIds: [],
  });
  assert.deepEqual(evaluateSelfAttentionLabMastery(validEvidence()), {
    mastered: true,
    reason: "mastered",
    completedChallengeIds: [
      "projection",
      "scaling",
      "causal-mask",
      "padding-key",
      "multi-head",
    ],
  });

  const incomplete = validEvidence();
  incomplete.events.splice(-1, 1);
  assert.deepEqual(evaluateSelfAttentionLabMastery(incomplete), {
    mastered: false,
    reason: "complete-five-challenges",
    completedChallengeIds: ["projection", "scaling", "causal-mask", "padding-key"],
  });
});

test("prevalidates numeric inspections before the UI appends mastery evidence", () => {
  for (const challengeId of selfAttentionChallengeIds) {
    const solved = solvedChallenges[challengeId];
    assert.equal(
      isValidSelfAttentionInspection(challengeId, solved.config, {
        stage: solved.stage,
        ...solved.observation,
      }),
      true,
      `${challengeId} should accept its teaching observation`,
    );
  }

  assert.equal(isValidSelfAttentionInspection("projection", canonicalSelfAttentionConfig, {
    stage: "projections",
    headIndex: 0,
    queryIndex: 1,
    keyIndex: null,
  }), false);
  assert.equal(isValidSelfAttentionInspection("causal-mask", canonicalSelfAttentionConfig, {
    stage: "mask",
    headIndex: 1,
    queryIndex: 2,
    keyIndex: 3,
  }), false);
  assert.equal(isValidSelfAttentionInspection("causal-mask", canonicalSelfAttentionConfig, {
    stage: "mask",
    headIndex: 1,
    queryIndex: 1,
    keyIndex: 1,
  }), false);
  assert.equal(isValidSelfAttentionInspection("padding-key", solvedChallenges["padding-key"].config, {
    stage: "weights",
    headIndex: 1,
    queryIndex: 1,
    keyIndex: 3,
  }), false);
});

test("rejects replayed, forged, mismatched, malformed, and reordered lab evidence", () => {
  const cases = [];

  const runBeforePrediction = validEvidence();
  [runBeforePrediction.events[0], runBeforePrediction.events[1]] = [
    runBeforePrediction.events[1],
    runBeforePrediction.events[0],
  ];
  cases.push(["run before prediction", runBeforePrediction]);

  const duplicateEventId = validEvidence();
  duplicateEventId.events[1] = { ...duplicateEventId.events[1], eventId: duplicateEventId.events[0].eventId };
  cases.push(["duplicate event id", duplicateEventId]);

  const duplicateRun = validEvidence();
  duplicateRun.events.splice(2, 0, { ...duplicateRun.events[1], eventId: "duplicate-run" });
  cases.push(["duplicate run", duplicateRun]);

  const mismatchedChallenge = validEvidence();
  mismatchedChallenge.events[1] = { ...mismatchedChallenge.events[1], challengeId: "scaling" };
  cases.push(["mismatched challenge", mismatchedChallenge]);

  const changedConfig = validEvidence();
  changedConfig.events[1] = {
    ...changedConfig.events[1],
    config: { ...changedConfig.events[1].config, inputGain: 2 },
  };
  cases.push(["config changed after prediction", changedConfig]);

  const wrongPredictionWithClaim = validEvidence();
  wrongPredictionWithClaim.events[0] = {
    ...wrongPredictionWithClaim.events[0],
    prediction: "qkv-identical",
    claimedCorrect: true,
  };
  cases.push(["forged correctness claim", wrongPredictionWithClaim]);

  const wrongStage = validEvidence();
  wrongStage.events[2] = { ...wrongStage.events[2], stage: "output" };
  cases.push(["wrong inspection stage", wrongStage]);

  const missingObservation = validEvidence();
  delete missingObservation.events[2].headIndex;
  cases.push(["missing inspection coordinates", missingObservation]);

  const misleadingProjectionSlice = validEvidence();
  misleadingProjectionSlice.events[2] = {
    ...misleadingProjectionSlice.events[2],
    headIndex: 0,
    queryIndex: 1,
  };
  cases.push(["projection slice where Q equals K", misleadingProjectionSlice]);

  const allowedCausalCell = validEvidence();
  allowedCausalCell.events[8] = {
    ...allowedCausalCell.events[8],
    keyIndex: 1,
  };
  cases.push(["causal inspection that is not a future key", allowedCausalCell]);

  const nonPaddingCell = validEvidence();
  nonPaddingCell.events[11] = {
    ...nonPaddingCell.events[11],
    keyIndex: 2,
  };
  cases.push(["padding inspection that is not the padding key", nonPaddingCell]);

  const inspectBeforeRun = validEvidence();
  [inspectBeforeRun.events[1], inspectBeforeRun.events[2]] = [
    inspectBeforeRun.events[2],
    inspectBeforeRun.events[1],
  ];
  cases.push(["inspection before run", inspectBeforeRun]);

  const invalidConfig = validEvidence();
  invalidConfig.events[0] = {
    ...invalidConfig.events[0],
    config: { ...invalidConfig.events[0].config, inputGain: Number.NaN },
  };
  cases.push(["invalid config", invalidConfig]);

  const duplicateAttempt = validEvidence();
  duplicateAttempt.events.splice(1, 0, {
    ...duplicateAttempt.events[0],
    eventId: "duplicate-attempt-prediction",
  });
  cases.push(["duplicate prediction for attempt", duplicateAttempt]);

  const unknownKind = validEvidence();
  unknownKind.events[1] = { ...unknownKind.events[1], kind: "claim-complete" };
  cases.push(["unknown event kind", unknownKind]);

  const missingEventId = validEvidence();
  delete missingEventId.events[0].eventId;
  cases.push(["missing event id", missingEventId]);

  for (const [label, evidence] of cases) {
    assert.equal(evaluateSelfAttentionLabMastery(evidence).reason, "invalid-evidence", label);
  }
  assert.equal(evaluateSelfAttentionLabMastery({ events: [{ kind: "forged" }] }).reason, "invalid-evidence");
  assert.equal(evaluateSelfAttentionLabMastery({ events: "not-an-array" }).reason, "invalid-evidence");
  assert.equal(evaluateSelfAttentionLabMastery(null).reason, "invalid-evidence");
});

test("requires the lab, debugger, and all concepts together for completion", () => {
  for (const labComplete of [false, true]) {
    for (const debuggerComplete of [false, true]) {
      for (const conceptsMastered of [false, true]) {
        assert.equal(
          canCompleteSelfAttentionChapter({ labComplete, debuggerComplete, conceptsMastered }),
          labComplete && debuggerComplete && conceptsMastered,
        );
      }
    }
  }
});

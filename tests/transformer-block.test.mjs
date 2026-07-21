import assert from "node:assert/strict";
import test from "node:test";

import {
  transformerBlockResidualRepairCode,
  transformerBlockStageLedgerCode,
  transformerBlockStageLedgerSupportCode,
} from "../src/data/transformerBlockNotebook.ts";

import {
  TRANSFORMER_BLOCK_FFN_DIMENSION,
  TRANSFORMER_BLOCK_HEAD_COUNT,
  TRANSFORMER_BLOCK_HEAD_DIMENSION,
  TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
  TRANSFORMER_BLOCK_MODEL_DIMENSION,
  TRANSFORMER_BLOCK_TOKEN_COUNT,
  canCompleteTransformerBlockChapter,
  canonicalTransformerBlockConfig,
  createSinusoidalPositionSignal,
  emptyTransformerBlockLabEvidence,
  evaluateTransformerBlockLabMastery,
  evaluateTransformerBlockRepair,
  gradeTransformerBlockChallenge,
  isValidTransformerBlockInspection,
  layerNormRows,
  probePositionWiseFfnContract,
  runPositionWiseFfn,
  runTransformerBlock,
  transformerBlockChallengeDefaults,
  transformerBlockChallengeIds,
  transformerBlockChallengeRequirements,
  transformerBlockCoreChallengeIds,
  transformerBlockDebuggerScenarioIds,
  transformerBlockDebuggerScenarios,
  transformerBlockFixture,
  transformerBlockPredictions,
  transformerBlockTokens,
} from "../src/features/transformer-block/transformer-block-model.ts";

const TOLERANCE = 1e-10;

function close(actual, expected, tolerance = TOLERANCE) {
  assert.ok(
    Math.abs(actual - expected) <= tolerance,
    `expected ${actual} to be within ${tolerance} of ${expected}`,
  );
}

function assertShape(matrix, rows, columns) {
  assert.equal(matrix.length, rows);
  matrix.forEach((row) => assert.equal(row.length, columns));
}

function assertMatrixClose(actual, expected, tolerance = TOLERANCE) {
  assertShape(actual, expected.length, expected[0]?.length ?? 0);
  actual.forEach((row, rowIndex) => row.forEach((value, columnIndex) => {
    close(value, expected[rowIndex][columnIndex], tolerance);
  }));
}

test("ships self-contained NumPy bridges for the block ledger and second residual repair", () => {
  const stageLedgerExecutionCode = `${transformerBlockStageLedgerSupportCode}\n${transformerBlockStageLedgerCode}`;
  assert.match(transformerBlockStageLedgerSupportCode, /def layer_norm_rows\(matrix\):/);
  assert.match(transformerBlockStageLedgerSupportCode, /mean = matrix\.mean\(axis=1, keepdims=True\)/);
  assert.match(transformerBlockStageLedgerCode, /x1 = x0 \+ attention_output/);
  assert.match(transformerBlockStageLedgerCode, /y = x1 \+ ffn_output/);
  assert.match(transformerBlockStageLedgerCode, /token0\.variance=/);
  assert.match(transformerBlockStageLedgerCode, /3\.438475, 0\.113746, 1\.676509, 0\.039093/);
  assert.match(transformerBlockStageLedgerCode, /DOES NOT PROVE:/);
  assert.match(stageLedgerExecutionCode, /E = x0_fixture - P[\s\S]*x0 = E \+ P/);
  assert.match(transformerBlockResidualRepairCode, /y = x0 \+ F/);
  assert.match(transformerBlockResidualRepairCode, /max_skip_error/);
  assert.match(transformerBlockResidualRepairCode, /Second residual must use x1, not x0/);
  assert.match(transformerBlockResidualRepairCode, /PASS: y = x1 \+ F/);
  assert.doesNotMatch(transformerBlockStageLedgerCode, /[가-힣]/);
  assert.doesNotMatch(transformerBlockStageLedgerSupportCode, /[가-힣]/);
  assert.doesNotMatch(transformerBlockResidualRepairCode, /[가-힣]/);
});

function validEvidence(challengeIds = transformerBlockChallengeIds) {
  let sequence = 0;
  return {
    events: challengeIds.flatMap((challengeId, challengeIndex) => {
      const requirement = transformerBlockChallengeRequirements[challengeId];
      const attemptId = `attempt-${challengeIndex + 1}`;
      return [
        {
          kind: "prediction",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...requirement.canonicalConfig },
          prediction: requirement.expectedPrediction,
        },
        {
          kind: "run",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...requirement.canonicalConfig },
        },
        {
          kind: "inspect",
          eventId: `event-${++sequence}`,
          attemptId,
          challengeId,
          config: { ...requirement.canonicalConfig },
          ...requirement.requiredInspection,
        },
      ];
    }),
  };
}

test("publishes a deeply frozen four-token teaching fixture and exact dimensions", () => {
  assert.equal(TRANSFORMER_BLOCK_TOKEN_COUNT, 4);
  assert.equal(TRANSFORMER_BLOCK_MODEL_DIMENSION, 4);
  assert.equal(TRANSFORMER_BLOCK_HEAD_COUNT, 2);
  assert.equal(TRANSFORMER_BLOCK_HEAD_DIMENSION, 2);
  assert.equal(TRANSFORMER_BLOCK_FFN_DIMENSION, 6);
  assert.equal(TRANSFORMER_BLOCK_LAYER_NORM_EPSILON, 1e-5);
  assert.deepEqual(transformerBlockTokens, ["the", "cat", "sat", "<pad>"]);
  assertShape(transformerBlockFixture.tokenEmbeddings, 4, 4);
  assertShape(transformerBlockFixture.positionSignal, 4, 4);
  assertShape(transformerBlockFixture.attentionWeights.wq, 4, 4);
  assertShape(transformerBlockFixture.attentionWeights.wk, 4, 4);
  assertShape(transformerBlockFixture.attentionWeights.wv, 4, 4);
  assertShape(transformerBlockFixture.attentionWeights.wo, 4, 4);
  assertShape(transformerBlockFixture.ffn.w1, 4, 6);
  assert.equal(transformerBlockFixture.ffn.b1.length, 6);
  assertShape(transformerBlockFixture.ffn.w2, 6, 4);
  assert.equal(transformerBlockFixture.ffn.b2.length, 4);
  assert.deepEqual(transformerBlockFixture.norm1Gamma, [1, 1, 1, 1]);
  assert.deepEqual(transformerBlockFixture.norm2Gamma, [1, 1, 1, 1]);
  assert.deepEqual(transformerBlockFixture.norm1Beta, [0, 0, 0, 0]);
  assert.deepEqual(transformerBlockFixture.norm2Beta, [0, 0, 0, 0]);
  assert.notEqual(transformerBlockFixture.norm1Gamma, transformerBlockFixture.norm2Gamma);
  assert.notEqual(transformerBlockFixture.norm1Beta, transformerBlockFixture.norm2Beta);
  for (const value of [
    transformerBlockFixture,
    transformerBlockFixture.tokenEmbeddings,
    transformerBlockFixture.tokenEmbeddings[0],
    transformerBlockFixture.positionSignal,
    transformerBlockFixture.positionSignal[0],
    transformerBlockFixture.attentionWeights,
    transformerBlockFixture.attentionWeights.wq,
    transformerBlockFixture.attentionWeights.wq[0],
    transformerBlockFixture.ffn,
    transformerBlockFixture.ffn.w1,
    transformerBlockFixture.ffn.w1[0],
    canonicalTransformerBlockConfig,
  ]) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => {
    transformerBlockFixture.positionSignal[1][0] = 99;
  }, TypeError);
  close(transformerBlockFixture.positionSignal[1][0], Math.sin(1));
});

test("creates the standard finite sinusoidal position signal without shared mutable rows", () => {
  const signal = createSinusoidalPositionSignal(3, 4);
  assert.deepEqual(signal[0], [0, 1, 0, 1]);
  close(signal[1][0], Math.sin(1));
  close(signal[1][1], Math.cos(1));
  close(signal[1][2], Math.sin(0.01));
  close(signal[1][3], Math.cos(0.01));
  assert.notEqual(signal[0], signal[1]);
  assert.ok(signal.flat().every(Number.isFinite));
  assert.ok(Object.isFrozen(signal));
  assert.ok(Object.isFrozen(signal[0]));
  assert.throws(() => createSinusoidalPositionSignal(0, 4), /between 1 and 128/);
  assert.throws(() => createSinusoidalPositionSignal(3, 3), /positive even integer/);
  assert.throws(() => createSinusoidalPositionSignal(3.5, 4), /integer/);
});

test("normalizes each token across its feature axis with explicit mean variance and epsilon", () => {
  const input = [
    [1, 2, 3, 4],
    [4, 4, 4, 4],
  ];
  const trace = layerNormRows(input);
  assert.equal(trace.axis, "feature");
  assert.equal(trace.epsilon, TRANSFORMER_BLOCK_LAYER_NORM_EPSILON);
  assert.equal(trace.rows[0].mean, 2.5);
  assert.equal(trace.rows[0].variance, 1.25);
  close(trace.rows[0].denominator, Math.sqrt(1.25 + TRANSFORMER_BLOCK_LAYER_NORM_EPSILON));
  close(trace.rows[0].outputMean, 0);
  close(
    trace.rows[0].outputVariance,
    1.25 / (1.25 + TRANSFORMER_BLOCK_LAYER_NORM_EPSILON),
  );
  assert.deepEqual(trace.output[1], [0, 0, 0, 0]);
  assert.equal(trace.rows[1].variance, 0);
  assert.ok(trace.output.flat().every(Number.isFinite));
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.output));
  assert.ok(Object.isFrozen(trace.rows[0]));
});

test("validates finite LayerNorm shapes affine vectors and epsilon bounds", () => {
  assert.throws(() => layerNormRows([]), /one or more rows/);
  assert.throws(() => layerNormRows([[1, 2], [3]]), /rectangular shape/);
  assert.throws(() => layerNormRows([[1, Number.NaN]]), /must be finite/);
  assert.throws(() => layerNormRows([[1, 2]], 0), /between 1e-8 and 1e-2/);
  assert.throws(() => layerNormRows([[1, 2]], 0.02), /between 1e-8 and 1e-2/);
  assert.throws(() => layerNormRows([[1, 2]], 1e-5, [1], [0, 0]), /contain 2 values/);
  assert.throws(() => layerNormRows([[1, 2]], 1e-5, [1, 1], [0, Infinity]), /must be finite/);
  assert.equal(layerNormRows([[1, 2]], 1e-8).epsilon, 1e-8);
  assert.equal(layerNormRows([[1, 2]], 1e-2).epsilon, 1e-2);
});

test("runs a coherent pre-norm Transformer Block from position input to second residual", () => {
  const trace = runTransformerBlock();
  const expectedX0 = transformerBlockFixture.tokenEmbeddings.map((row, tokenIndex) => (
    row.map((value, featureIndex) => value + transformerBlockFixture.positionSignal[tokenIndex][featureIndex])
  ));
  assertMatrixClose(trace.x0, expectedX0);
  assert.equal(trace.attention.provenance.source, "recomputed-self-attention");
  assert.equal(trace.attention.provenance.inputStage, "norm1");
  assert.equal(trace.attention.provenance.qkvWeights, "self-attention-fixture");
  assert.equal(trace.attention.provenance.scoreScale, "sqrt-head-dimension");
  assert.deepEqual(trace.attention.input, trace.norm1.output);
  assertMatrixClose(
    trace.residual1,
    trace.x0.map((row, tokenIndex) => row.map((value, featureIndex) => (
      value + trace.attention.output[tokenIndex][featureIndex]
    ))),
  );
  assert.deepEqual(trace.ffn.input, trace.norm2.output);
  assertMatrixClose(
    trace.output,
    trace.residual1.map((row, tokenIndex) => row.map((value, featureIndex) => (
      value + trace.ffn.output[tokenIndex][featureIndex]
    ))),
  );
  assert.deepEqual(trace.handoff, {
    inputShape: [4, 4],
    outputShape: [4, 4],
    tokenAxisPreserved: true,
    featureAxisPreserved: true,
    preNormOrder: true,
    firstResidualApplied: true,
    secondResidualApplied: true,
    attentionSource: "norm1",
    nextStage: "mini-transformer",
  });
});

test("recomputes causal padding-aware Self-Attention from norm1", () => {
  const trace = runTransformerBlock();
  assertShape(trace.attention.q, 4, 4);
  assertShape(trace.attention.k, 4, 4);
  assertShape(trace.attention.v, 4, 4);
  assert.equal(trace.attention.heads.length, 2);
  trace.attention.heads.forEach((head, headIndex) => {
    assert.equal(head.headIndex, headIndex);
    assertShape(head.q, 4, 2);
    assertShape(head.k, 4, 2);
    assertShape(head.v, 4, 2);
    assertShape(head.scores, 4, 4);
    assertShape(head.maskedScores, 4, 4);
    assertShape(head.weights, 4, 4);
    assertShape(head.context, 4, 2);
    for (let queryIndex = 0; queryIndex < 4; queryIndex += 1) {
      for (let keyIndex = 0; keyIndex < 4; keyIndex += 1) {
        const allowed = queryIndex < 3 && keyIndex < 3 && keyIndex <= queryIndex;
        assert.equal(head.allowed[queryIndex][keyIndex], allowed);
        assert.equal(head.maskedScores[queryIndex][keyIndex] === null, !allowed);
        if (!allowed) assert.equal(head.weights[queryIndex][keyIndex], 0);
      }
    }
    head.rowSums.slice(0, 3).forEach((sum) => close(sum, 1));
    assert.equal(head.rowSums[3], 0);
    assert.deepEqual(head.context[3], [0, 0]);
  });
  assertShape(trace.attention.concatenated, 4, 4);
  assertShape(trace.attention.output, 4, 4);
  assert.deepEqual(trace.attention.output[3], [0, 0, 0, 0]);
});

test("uses one shared two-layer ReLU FFN independently on every token row", () => {
  const block = runTransformerBlock();
  const ffn = runPositionWiseFfn(block.norm2.output);
  assert.equal(ffn.sharedAcrossTokens, true);
  assert.equal(ffn.activation, "relu");
  assertShape(ffn.hiddenPreActivation, 4, 6);
  assertShape(ffn.hidden, 4, 6);
  assertShape(ffn.output, 4, 4);
  assert.ok(ffn.hidden.flat().every((value) => value >= 0));
  assert.ok(ffn.hiddenPreActivation.flat().some((value) => value < 0));
  assert.ok(ffn.hidden.flat().some((value) => value === 0));
  assert.deepEqual(ffn.rows.map(({ parameterSetIndex }) => parameterSetIndex), [0, 0, 0, 0]);
  const probe = probePositionWiseFfnContract();
  assert.deepEqual(probe, {
    scope: "ffn-stage-only",
    permutation: [2, 0, 3, 1],
    permutationError: 0,
    permutationEquivariant: true,
    changedTokenIndex: 1,
    isolationLeak: 0,
    tokenIndependent: true,
  });
  assert.ok(Object.isFrozen(probe));
  assert.ok(Object.isFrozen(probe.permutation));
  assert.throws(() => runPositionWiseFfn([]), /contain 4 rows/);
  assert.throws(() => runPositionWiseFfn([[1, 2, 3, 4]]), /contain 4 rows/);
  assert.throws(() => runPositionWiseFfn(Array.from({ length: 4 }, () => [1, 2, 3])), /contain 4 columns/);
  assert.throws(() => runPositionWiseFfn([
    [1, 2, 3, 4],
    [1, 2, 3, 4],
    [1, 2, Number.NaN, 4],
    [1, 2, 3, 4],
  ]), /must be finite/);
});

test("makes each broken assembly switch produce a computed contract failure", () => {
  const noPosition = runTransformerBlock({ ...canonicalTransformerBlockConfig, positionScale: 0 });
  assert.deepEqual(noPosition.x0, transformerBlockFixture.tokenEmbeddings);

  const noPreNorm = runTransformerBlock({ ...canonicalTransformerBlockConfig, preNorm: false });
  assert.equal(noPreNorm.attention.provenance.inputStage, "x0-bypassed-pre-norm");
  assert.deepEqual(noPreNorm.attention.input, noPreNorm.x0);
  assert.deepEqual(noPreNorm.ffn.input, noPreNorm.residual1);

  const noFirstSkip = runTransformerBlock({ ...canonicalTransformerBlockConfig, firstResidual: false });
  assert.deepEqual(noFirstSkip.residual1, noFirstSkip.attention.output);

  const unshared = runTransformerBlock({ ...canonicalTransformerBlockConfig, sharedFfn: false });
  assert.deepEqual(unshared.ffn.rows.map(({ parameterSetIndex }) => parameterSetIndex), [0, 1, 2, 3]);
  assert.ok(probePositionWiseFfnContract({ ...canonicalTransformerBlockConfig, sharedFfn: false }).permutationError > 1e-3);

  const noSecondSkip = runTransformerBlock({ ...canonicalTransformerBlockConfig, secondResidual: false });
  assert.deepEqual(noSecondSkip.output, noSecondSkip.ffn.output);
});

test("deep-freezes every public trace layer and does not mutate fixture state", () => {
  const fixtureSnapshot = structuredClone(transformerBlockFixture);
  const trace = runTransformerBlock();
  for (const value of [
    trace,
    trace.config,
    trace.x0,
    trace.x0[0],
    trace.norm1,
    trace.norm1.rows,
    trace.norm1.rows[0],
    trace.attention,
    trace.attention.provenance,
    trace.attention.heads,
    trace.attention.heads[0],
    trace.attention.heads[0].weights,
    trace.attention.heads[0].weights[0],
    trace.residual1,
    trace.norm2,
    trace.ffn,
    trace.ffn.rows[0],
    trace.output,
    trace.output[0],
    trace.handoff,
  ]) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => {
    trace.output[0][0] = 99;
  }, TypeError);
  assert.deepEqual(transformerBlockFixture, fixtureSnapshot);
  assert.notEqual(runTransformerBlock(), trace);
  assert.deepEqual(runTransformerBlock(), trace);
});

test("rejects invalid config controls rather than emitting non-finite states", () => {
  const invalid = [
    [{ ...canonicalTransformerBlockConfig, positionScale: -0.01 }, /between 0 and 2/],
    [{ ...canonicalTransformerBlockConfig, positionScale: 2.01 }, /between 0 and 2/],
    [{ ...canonicalTransformerBlockConfig, positionScale: Number.NaN }, /finite and between/],
    [{ ...canonicalTransformerBlockConfig, preNorm: "yes" }, /switches must be boolean/],
    [{ ...canonicalTransformerBlockConfig, firstResidual: 1 }, /switches must be boolean/],
    [{ ...canonicalTransformerBlockConfig, sharedFfn: null }, /switches must be boolean/],
    [{ ...canonicalTransformerBlockConfig, secondResidual: undefined }, /switches must be boolean/],
    [{ ...canonicalTransformerBlockConfig, layerNormEpsilon: 0 }, /between 1e-8 and 1e-2/],
    [{ ...canonicalTransformerBlockConfig, layerNormEpsilon: Infinity }, /finite and between/],
  ];
  invalid.forEach(([config, pattern]) => assert.throws(() => runTransformerBlock(config), pattern));
  assert.throws(() => runTransformerBlock(null), /config is required/);
  assert.ok(runTransformerBlock({ ...canonicalTransformerBlockConfig, positionScale: 2 }).output.flat().every(Number.isFinite));
});

test("exports five stable challenge presets predictions and semantic requirements", () => {
  assert.deepEqual(transformerBlockChallengeIds, [
    "position-input",
    "layernorm",
    "attention-residual",
    "positionwise-ffn",
    "block-handoff",
  ]);
  assert.deepEqual(transformerBlockCoreChallengeIds, [
    "layernorm",
    "positionwise-ffn",
    "block-handoff",
  ]);
  assert.equal(Object.isFrozen(transformerBlockCoreChallengeIds), true);
  assert.equal(new Set(transformerBlockPredictions).size, transformerBlockPredictions.length);
  assert.equal(transformerBlockChallengeDefaults["position-input"].positionScale, 0);
  assert.equal(transformerBlockChallengeDefaults.layernorm.preNorm, false);
  assert.equal(transformerBlockChallengeDefaults["attention-residual"].firstResidual, false);
  assert.equal(transformerBlockChallengeDefaults["positionwise-ffn"].sharedFfn, false);
  assert.equal(transformerBlockChallengeDefaults["block-handoff"].secondResidual, false);
  assert.ok(Object.isFrozen(transformerBlockChallengeRequirements));
  for (const challengeId of transformerBlockChallengeIds) {
    const requirement = transformerBlockChallengeRequirements[challengeId];
    assert.ok(transformerBlockPredictions.includes(requirement.expectedPrediction));
    assert.deepEqual(requirement.canonicalConfig, canonicalTransformerBlockConfig);
    assert.ok(Object.isFrozen(requirement));
    assert.ok(Object.isFrozen(requirement.canonicalConfig));
    assert.ok(Object.isFrozen(requirement.requiredInspection));
  }
});

test("grades every lab challenge from prediction config and recomputed numeric semantics", () => {
  for (const challengeId of transformerBlockChallengeIds) {
    const requirement = transformerBlockChallengeRequirements[challengeId];
    const grade = gradeTransformerBlockChallenge(
      challengeId,
      requirement.expectedPrediction,
      requirement.canonicalConfig,
    );
    assert.equal(grade.correct, true, challengeId);
    assert.equal(grade.predictionCorrect, true, challengeId);
    assert.equal(grade.configCorrect, true, challengeId);
    assert.equal(grade.semanticCorrect, true, challengeId);
    assert.deepEqual(grade.observed.outputShape, [4, 4]);
    assert.ok(Object.isFrozen(grade));
    assert.ok(Object.isFrozen(grade.observed));

    const wrongPrediction = challengeId === "position-input"
      ? "position-omitted"
      : "position-added-before-attention";
    const predictionGrade = gradeTransformerBlockChallenge(
      challengeId,
      wrongPrediction,
      requirement.canonicalConfig,
    );
    assert.equal(predictionGrade.correct, false, challengeId);
    assert.equal(predictionGrade.predictionCorrect, false, challengeId);

    const configGrade = gradeTransformerBlockChallenge(
      challengeId,
      requirement.expectedPrediction,
      transformerBlockChallengeDefaults[challengeId],
    );
    assert.equal(configGrade.correct, false, challengeId);
    assert.equal(configGrade.configCorrect, false, challengeId);
  }
  assert.throws(
    () => gradeTransformerBlockChallenge("unknown", "position-omitted", canonicalTransformerBlockConfig),
    /Unknown Transformer Block challenge/,
  );
  assert.throws(
    () => gradeTransformerBlockChallenge("position-input", "invented", canonicalTransformerBlockConfig),
    /Unknown Transformer Block prediction/,
  );
});

test("requires the intended numeric slice before appending inspection evidence", () => {
  for (const challengeId of transformerBlockChallengeIds) {
    const requirement = transformerBlockChallengeRequirements[challengeId];
    assert.equal(
      isValidTransformerBlockInspection(
        challengeId,
        requirement.canonicalConfig,
        requirement.requiredInspection,
      ),
      true,
      challengeId,
    );
    assert.equal(
      isValidTransformerBlockInspection(challengeId, requirement.canonicalConfig, {
        ...requirement.requiredInspection,
        featureIndex: (requirement.requiredInspection.featureIndex + 1) % 4,
      }),
      false,
      `${challengeId} must reject an unrelated cell`,
    );
    assert.equal(
      isValidTransformerBlockInspection(
        challengeId,
        transformerBlockChallengeDefaults[challengeId],
        requirement.requiredInspection,
      ),
      false,
      `${challengeId} must reject broken semantics`,
    );
  }
  assert.equal(isValidTransformerBlockInspection("unknown", canonicalTransformerBlockConfig, {
    stage: "output",
    tokenIndex: 2,
    featureIndex: 0,
  }), false);
});

test("requires three representative core challenges while preserving all exploration evidence", () => {
  assert.deepEqual(evaluateTransformerBlockLabMastery(emptyTransformerBlockLabEvidence), {
    mastered: false,
    reason: "complete-core-challenges",
    completedChallengeIds: [],
  });
  assert.deepEqual(evaluateTransformerBlockLabMastery(validEvidence(transformerBlockCoreChallengeIds)), {
    mastered: true,
    reason: "mastered",
    completedChallengeIds: transformerBlockCoreChallengeIds,
  });
  assert.deepEqual(evaluateTransformerBlockLabMastery(validEvidence()), {
    mastered: true,
    reason: "mastered",
    completedChallengeIds: transformerBlockChallengeIds,
  });
  const incomplete = validEvidence();
  incomplete.events.splice(-1, 1);
  assert.deepEqual(evaluateTransformerBlockLabMastery(incomplete), {
    mastered: false,
    reason: "complete-core-challenges",
    completedChallengeIds: transformerBlockChallengeIds.slice(0, 4),
  });
});

test("rejects forged replayed mismatched malformed and reordered evidence", () => {
  const cases = [];

  const runBeforePrediction = validEvidence();
  [runBeforePrediction.events[0], runBeforePrediction.events[1]] = [
    runBeforePrediction.events[1],
    runBeforePrediction.events[0],
  ];
  cases.push(["run before prediction", runBeforePrediction]);

  const inspectBeforeRun = validEvidence();
  [inspectBeforeRun.events[1], inspectBeforeRun.events[2]] = [
    inspectBeforeRun.events[2],
    inspectBeforeRun.events[1],
  ];
  cases.push(["inspect before run", inspectBeforeRun]);

  const duplicateEvent = validEvidence();
  duplicateEvent.events[1].eventId = duplicateEvent.events[0].eventId;
  cases.push(["duplicate event id", duplicateEvent]);

  const duplicateRun = validEvidence();
  duplicateRun.events.splice(2, 0, { ...duplicateRun.events[1], eventId: "duplicate-run" });
  cases.push(["duplicate run", duplicateRun]);

  const replayAfterInspect = validEvidence();
  replayAfterInspect.events.splice(3, 0, { ...replayAfterInspect.events[2], eventId: "replayed-inspect" });
  cases.push(["inspect replay", replayAfterInspect]);

  const duplicateAttempt = validEvidence();
  duplicateAttempt.events.splice(1, 0, { ...duplicateAttempt.events[0], eventId: "duplicate-attempt" });
  cases.push(["duplicate attempt", duplicateAttempt]);

  const changedConfig = validEvidence();
  changedConfig.events[1].config = { ...changedConfig.events[1].config, positionScale: 0 };
  cases.push(["config changed after prediction", changedConfig]);

  const changedChallenge = validEvidence();
  changedChallenge.events[1].challengeId = "layernorm";
  cases.push(["challenge changed after prediction", changedChallenge]);

  const wrongPrediction = validEvidence();
  wrongPrediction.events[0].prediction = "position-omitted";
  wrongPrediction.events[0].claimedCorrect = true;
  cases.push(["forged correctness claim", wrongPrediction]);

  const wrongStage = validEvidence();
  wrongStage.events[2].stage = "output";
  cases.push(["wrong inspection stage", wrongStage]);

  const wrongCell = validEvidence();
  wrongCell.events[2].featureIndex = 1;
  cases.push(["wrong inspection coordinate", wrongCell]);

  const missingCoordinate = validEvidence();
  delete missingCoordinate.events[2].tokenIndex;
  cases.push(["missing coordinate", missingCoordinate]);

  const invalidConfig = validEvidence();
  invalidConfig.events[0].config = { ...invalidConfig.events[0].config, layerNormEpsilon: Number.NaN };
  cases.push(["invalid config", invalidConfig]);

  const missingEventId = validEvidence();
  delete missingEventId.events[0].eventId;
  cases.push(["missing event id", missingEventId]);

  const unknownPrediction = validEvidence();
  unknownPrediction.events[0].prediction = "claim-mastery";
  cases.push(["unknown prediction", unknownPrediction]);

  const unknownKind = validEvidence();
  unknownKind.events[1].kind = "claim-complete";
  cases.push(["unknown event kind", unknownKind]);

  for (const [label, evidence] of cases) {
    assert.equal(evaluateTransformerBlockLabMastery(evidence).reason, "invalid-evidence", label);
  }
  assert.equal(evaluateTransformerBlockLabMastery({ events: [{ kind: "run" }] }).reason, "invalid-evidence");
  assert.equal(evaluateTransformerBlockLabMastery({ events: "forged" }).reason, "invalid-evidence");
  assert.equal(evaluateTransformerBlockLabMastery(null).reason, "invalid-evidence");
});

test("exposes four debugger scenarios with exactly one computed repair each", () => {
  assert.deepEqual(transformerBlockDebuggerScenarioIds, [
    "position-placement",
    "layernorm-contract",
    "attention-residual",
    "ffn-second-skip",
  ]);
  const expected = {
    "position-placement": "add-position-before-norm1",
    "layernorm-contract": "feature-axis-with-epsilon",
    "attention-residual": "add-x0-to-attention",
    "ffn-second-skip": "shared-rowwise-relu-plus-second-skip",
  };
  for (const scenarioId of transformerBlockDebuggerScenarioIds) {
    const scenario = transformerBlockDebuggerScenarios[scenarioId];
    const correct = scenario.options.filter(({ id }) => (
      evaluateTransformerBlockRepair(scenarioId, id).correct
    ));
    assert.deepEqual(correct.map(({ id }) => id), [expected[scenarioId]], scenarioId);
    assert.ok(Object.isFrozen(scenario));
    assert.ok(Object.isFrozen(scenario.options));
  }
});

test("derives specific debugger feedback from position norm residual and FFN invariants", () => {
  const expectedReasons = {
    "position-placement": {
      "add-position-before-norm1": "contract-restored",
      "omit-position-signal": "position-missing",
      "add-position-after-block": "position-added-too-late",
    },
    "layernorm-contract": {
      "token-axis-with-epsilon": "wrong-normalization-axis",
      "feature-axis-no-epsilon": "epsilon-removed",
      "feature-axis-with-epsilon": "contract-restored",
    },
    "attention-residual": {
      "replace-x0-with-attention": "input-skip-dropped",
      "add-norm1-to-attention": "normalized-skip-used",
      "add-x0-to-attention": "contract-restored",
    },
    "ffn-second-skip": {
      "per-position-parameters-plus-skip": "position-specific-parameters",
      "shared-rowwise-relu-replace": "second-skip-dropped",
      "shared-rowwise-linear-plus-second-skip": "relu-bypassed",
      "shared-rowwise-relu-plus-second-skip": "contract-restored",
    },
  };
  for (const scenarioId of transformerBlockDebuggerScenarioIds) {
    for (const option of transformerBlockDebuggerScenarios[scenarioId].options) {
      const result = evaluateTransformerBlockRepair(scenarioId, option.id);
      assert.equal(result.reason, expectedReasons[scenarioId][option.id]);
      assert.equal(result.correct, result.reason === "contract-restored");
      assert.equal(result.scenarioId, scenarioId);
      assert.equal(result.repair, option.id);
      assert.ok(Object.isFrozen(result));
      assert.ok(Object.isFrozen(result.metrics));
      assert.ok(Object.values(result.metrics).every(Number.isFinite));
    }
  }

  assert.ok(evaluateTransformerBlockRepair(
    "position-placement",
    "omit-position-signal",
  ).metrics.positionInputError > 0.9);
  const omittedPosition = evaluateTransformerBlockRepair("position-placement", "omit-position-signal");
  const latePosition = evaluateTransformerBlockRepair("position-placement", "add-position-after-block");
  assert.ok(omittedPosition.metrics.positionOutputError > 0);
  assert.ok(latePosition.metrics.positionInputError > 0.9);
  assert.ok(latePosition.metrics.positionOutputError > 0);
  assert.notEqual(
    latePosition.metrics.positionOutputError,
    omittedPosition.metrics.positionOutputError,
    "adding P after the block must execute a different candidate output from omitting P",
  );
  assert.ok(evaluateTransformerBlockRepair(
    "layernorm-contract",
    "token-axis-with-epsilon",
  ).metrics.maxRowMean > 0.1);
  assert.equal(evaluateTransformerBlockRepair(
    "layernorm-contract",
    "feature-axis-no-epsilon",
  ).metrics.epsilon, 0);
  assert.equal(evaluateTransformerBlockRepair(
    "layernorm-contract",
    "feature-axis-no-epsilon",
  ).metrics.minimumStabilityDenominator, 0);
  assert.ok(evaluateTransformerBlockRepair(
    "layernorm-contract",
    "feature-axis-no-epsilon",
  ).metrics.nonFiniteStabilityValues > 0);
  assert.equal(evaluateTransformerBlockRepair(
    "layernorm-contract",
    "feature-axis-with-epsilon",
  ).metrics.nonFiniteStabilityValues, 0);
  assert.ok(evaluateTransformerBlockRepair(
    "attention-residual",
    "replace-x0-with-attention",
  ).metrics.firstResidualError > 1);
  assert.ok(evaluateTransformerBlockRepair(
    "ffn-second-skip",
    "per-position-parameters-plus-skip",
  ).metrics.ffnPermutationError > 0.1);
  assert.ok(evaluateTransformerBlockRepair(
    "ffn-second-skip",
    "shared-rowwise-relu-replace",
  ).metrics.secondResidualError > 1);
  assert.ok(evaluateTransformerBlockRepair(
    "ffn-second-skip",
    "shared-rowwise-linear-plus-second-skip",
  ).metrics.negativeHiddenCount > 0);

  assert.throws(
    () => evaluateTransformerBlockRepair("position-placement", "feature-axis-with-epsilon"),
    /does not belong/,
  );
  assert.throws(
    () => evaluateTransformerBlockRepair("unknown", "add-position-before-norm1"),
    /Unknown Transformer Block debugger scenario/,
  );
});

test("requires the core lab and concepts while keeping debugger remediation optional", () => {
  for (const labComplete of [false, true]) {
    for (const debuggerComplete of [false, true]) {
      for (const conceptsMastered of [false, true]) {
        assert.equal(canCompleteTransformerBlockChapter({
          labComplete,
          debuggerComplete,
          conceptsMastered,
        }), labComplete && conceptsMastered);
      }
    }
  }
  assert.equal(canCompleteTransformerBlockChapter({ labComplete: true, conceptsMastered: true }), true);
});

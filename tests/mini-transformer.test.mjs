import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  miniTransformerGenerationRepairCode,
  miniTransformerLmHeadUpdateCode,
  miniTransformerLmHeadUpdateSupportCode,
} from "../src/data/miniTransformerNotebook.ts";
import {
  MINI_TRANSFORMER_BOS_ID,
  MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS,
  MINI_TRANSFORMER_EOS_ID,
  MINI_TRANSFORMER_FFN_DIMENSION,
  MINI_TRANSFORMER_HEAD_COUNT,
  MINI_TRANSFORMER_HEAD_DIMENSION,
  MINI_TRANSFORMER_LAB_PROMPT,
  MINI_TRANSFORMER_MAX_CONTEXT,
  MINI_TRANSFORMER_MODEL_DIMENSION,
  MINI_TRANSFORMER_TRAINING_TEXT,
  MINI_TRANSFORMER_UNK_ID,
  MINI_TRANSFORMER_VOCAB_SIZE,
  canCompleteMiniTransformerChapter,
  canonicalMiniTransformerConfig,
  createShiftedNextTokenTargets,
  decodeMiniTransformerTokens,
  emptyMiniTransformerLabEvidence,
  evaluateMiniTransformerLabMastery,
  evaluateMiniTransformerRepair,
  generateMiniTransformer,
  gradeMiniTransformerChallenge,
  isValidMiniTransformerInspection,
  meanNextTokenCrossEntropy,
  miniTransformerChallengeDefaults,
  miniTransformerChallengeIds,
  miniTransformerChallengeRequirements,
  miniTransformerCoreChallengeIds,
  miniTransformerDebuggerScenarioIds,
  miniTransformerDebuggerScenarios,
  miniTransformerFixture,
  miniTransformerPredictions,
  miniTransformerVocabulary,
  runMiniTransformer,
  runMiniTransformerLmHeadUpdate,
  runMiniTransformerTokenIds,
  stableSoftmax,
  tokenizeMiniTransformer,
} from "../src/features/mini-transformer/mini-transformer-model.ts";

const TOLERANCE = 1e-10;

test("presents three required Mini Transformer challenges with localized optional remediation", async () => {
  const [conceptSource, chapterSource, notebookSource, styles] = await Promise.all([
    readFile(new URL("../src/components/mini-transformer/MiniTransformerConceptCheck.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/mini-transformer/MiniTransformerChapter.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/NotebookCell.tsx", import.meta.url), "utf8"),
    readFile(new URL("../src/styles/globals.css", import.meta.url), "utf8"),
  ]);

  assert.match(conceptSource, /three core workbench challenges/);
  assert.match(conceptSource, /all three core challenge states/);
  assert.doesNotMatch(conceptSource, /both required activities|both activity states/);
  assert.match(chapterSource, /t\("선택", "Optional"\)/);
  assert.match(notebookSource, /repairLineIndentation/);
  assert.match(notebookSource, /nextLine\.trimStart\(\)/);
  assert.match(styles, /\.mini-transformer-prerequisite a \{[\s\S]*?min-height: 44px;/);
});

test("ships independent English-only NumPy bridges for shifted loss and generation repair", () => {
  const lmHeadExecutionCode = `${miniTransformerLmHeadUpdateSupportCode}\n${miniTransformerLmHeadUpdateCode}`;
  assert.match(miniTransformerLmHeadUpdateSupportCode, /token_ids = np\.array\(\[0, 1, 2, 3, 4\]\)/);
  assert.match(miniTransformerLmHeadUpdateSupportCode, /target_ids = np\.array\(\[1, 2, 3, 4, 5\]\)/);
  assert.match(miniTransformerLmHeadUpdateCode, /logits_before = hidden @ vocab_projection \+ vocab_bias/);
  assert.match(miniTransformerLmHeadUpdateCode, /gradient_logits\[np\.arange\(len\(target_ids\)\), target_ids\] -= 1/);
  assert.match(miniTransformerLmHeadUpdateCode, /updated_projection = vocab_projection - learning_rate \* gradient_projection/);
  assert.match(miniTransformerLmHeadUpdateCode, /1\.6559665206/);
  assert.match(miniTransformerLmHeadUpdateCode, /0\.7281635913/);
  assert.match(miniTransformerLmHeadUpdateCode, /1\.5525973714/);
  assert.match(miniTransformerLmHeadUpdateCode, /1\.7646455697/);
  assert.match(miniTransformerLmHeadUpdateCode, /PASS: one gradient-descent LM-head update lowers same-batch loss/);
  assert.match(lmHeadExecutionCode, /def mean_cross_entropy[\s\S]*logits_before = hidden/);

  assert.match(miniTransformerGenerationRepairCode, /prefix = tokenize_fixed\("the cat"\)/);
  assert.match(miniTransformerGenerationRepairCode, /logits = recompute_full_prefix\(prefix\)/);
  assert.match(miniTransformerGenerationRepairCode, /prefix\[-1\] = next_token_id/);
  assert.match(miniTransformerGenerationRepairCode, /prefix\.append\(next_token_id\)/);
  assert.match(miniTransformerGenerationRepairCode, /\["sat", "\.", "cat", "cat", "cat"\]/);
  assert.match(miniTransformerGenerationRepairCode, /prefix_lengths == \[3, 4, 5, 6, 7\]/);
  assert.match(miniTransformerGenerationRepairCode, /stop_reason == "max-length"/);
  assert.match(miniTransformerGenerationRepairCode, /there is no KV cache/);
  assert.match(miniTransformerGenerationRepairCode, /PASS: greedy decoding appends, recomputes, and obeys the stop boundary/);

  assert.doesNotMatch(miniTransformerLmHeadUpdateCode, /[가-힣]/);
  assert.doesNotMatch(miniTransformerLmHeadUpdateSupportCode, /[가-힣]/);
  assert.doesNotMatch(miniTransformerGenerationRepairCode, /[가-힣]/);
});

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

function validEvidence(challengeIds = miniTransformerChallengeIds) {
  let eventSequence = 0;
  return {
    events: challengeIds.flatMap((challengeId, challengeIndex) => {
      const requirement = miniTransformerChallengeRequirements[challengeId];
      const attemptId = `mini-attempt-${challengeIndex + 1}`;
      const base = {
        attemptId,
        challengeId,
        config: { ...requirement.canonicalConfig },
        prompt: requirement.prompt,
      };
      return [
        {
          ...base,
          kind: "prediction",
          eventId: `mini-event-${++eventSequence}`,
          prediction: requirement.expectedPrediction,
        },
        {
          ...base,
          kind: "run",
          eventId: `mini-event-${++eventSequence}`,
        },
        {
          ...base,
          kind: "inspect",
          eventId: `mini-event-${++eventSequence}`,
          ...requirement.requiredInspection,
        },
      ];
    }),
  };
}

test("publishes a deeply frozen tiny vocabulary and deterministic parameter fixture", () => {
  assert.equal(MINI_TRANSFORMER_MODEL_DIMENSION, 4);
  assert.equal(MINI_TRANSFORMER_HEAD_COUNT, 2);
  assert.equal(MINI_TRANSFORMER_HEAD_DIMENSION, 2);
  assert.equal(MINI_TRANSFORMER_FFN_DIMENSION, 6);
  assert.equal(MINI_TRANSFORMER_MAX_CONTEXT, 8);
  assert.equal(MINI_TRANSFORMER_DEFAULT_MAX_NEW_TOKENS, 5);
  assert.equal(MINI_TRANSFORMER_VOCAB_SIZE, 8);
  assert.equal(MINI_TRANSFORMER_BOS_ID, 0);
  assert.equal(MINI_TRANSFORMER_EOS_ID, 5);
  assert.equal(MINI_TRANSFORMER_UNK_ID, 6);
  assert.deepEqual(miniTransformerVocabulary.map(({ id, text }) => [id, text]), [
    [0, "<bos>"], [1, "the"], [2, "cat"], [3, "sat"],
    [4, "."], [5, "<eos>"], [6, "<unk>"], [7, "mat"],
  ]);
  assertShape(miniTransformerFixture.tokenEmbeddings, 8, 4);
  assertShape(miniTransformerFixture.attentionWeights.wq, 4, 4);
  assertShape(miniTransformerFixture.attentionWeights.wk, 4, 4);
  assertShape(miniTransformerFixture.attentionWeights.wv, 4, 4);
  assertShape(miniTransformerFixture.attentionWeights.wo, 4, 4);
  assertShape(miniTransformerFixture.ffn.w1, 4, 6);
  assertShape(miniTransformerFixture.ffn.w2, 6, 4);
  assertShape(miniTransformerFixture.vocabularyProjection, 4, 8);
  assert.equal(miniTransformerFixture.vocabularyBias.length, 8);
  for (const value of [
    miniTransformerVocabulary,
    miniTransformerVocabulary[0],
    miniTransformerFixture,
    miniTransformerFixture.tokenEmbeddings,
    miniTransformerFixture.tokenEmbeddings[0],
    miniTransformerFixture.attentionWeights,
    miniTransformerFixture.ffn,
    miniTransformerFixture.vocabularyProjection,
    miniTransformerFixture.vocabularyProjection[0],
    canonicalMiniTransformerConfig,
  ]) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => {
    miniTransformerFixture.vocabularyProjection[0][0] = 99;
  }, TypeError);
});

test("tokenizes known words punctuation unknowns and BOS through one fixed vocabulary", () => {
  const trace = tokenizeMiniTransformer("  The CAT sat.  ");
  assert.deepEqual(trace, {
    input: "  The CAT sat.  ",
    normalized: "the cat sat.",
    pieces: ["the", "cat", "sat", "."],
    tokenIds: [0, 1, 2, 3, 4],
    tokens: ["<bos>", "the", "cat", "sat", "."],
    bosAdded: true,
    unknownCount: 0,
  });
  assert.deepEqual(tokenizeMiniTransformer("dog", false).tokenIds, [MINI_TRANSFORMER_UNK_ID]);
  assert.equal(tokenizeMiniTransformer("dog").unknownCount, 1);
  assert.deepEqual(tokenizeMiniTransformer("").tokenIds, [MINI_TRANSFORMER_BOS_ID]);
  assert.equal(decodeMiniTransformerTokens([0, 1, 2, 3, 4, 5]), "the cat sat.");
  assert.equal(decodeMiniTransformerTokens([0, 6, 4]), "<unk>.");
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.tokenIds));
  assert.throws(() => tokenizeMiniTransformer("", false), /at least one token/);
  assert.throws(() => tokenizeMiniTransformer("the cat sat on mat the cat sat ."), /exceeds the 8-token context/);
  assert.throws(() => tokenizeMiniTransformer(42), /must be text/);
  assert.throws(() => decodeMiniTransformerTokens([99]), /vocabulary token id/);
});

test("computes stable vocabulary softmax under large shifts", () => {
  const first = stableSoftmax([1000, 999, 997]);
  const shifted = stableSoftmax([10, 9, 7]);
  close(first.reduce((sum, value) => sum + value, 0), 1);
  assert.ok(first.every(Number.isFinite));
  first.forEach((value, index) => close(value, shifted[index]));
  assert.ok(Object.isFrozen(first));
  assert.throws(() => stableSoftmax([]), /one or more values/);
  assert.throws(() => stableSoftmax([0, Infinity]), /must be finite/);
});

test("executes tokenizer embeddings positions one pre-LN block final norm and vocabulary head", () => {
  const trace = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
  assert.deepEqual(trace.tokenIds, [0, 1, 2]);
  assert.deepEqual(trace.tokens, ["<bos>", "the", "cat"]);
  assertShape(trace.block.embeddings, 3, 4);
  assertShape(trace.block.positionSignal, 3, 4);
  assertShape(trace.block.x0, 3, 4);
  assertMatrixClose(trace.block.x0, trace.block.embeddings.map((row, rowIndex) => (
    row.map((value, featureIndex) => value + trace.block.positionSignal[rowIndex][featureIndex])
  )));
  assert.equal(trace.block.norm1.axis, "feature");
  assert.equal(trace.block.attention.provenance.inputStage, "norm1");
  assert.deepEqual(trace.block.attention.input, trace.block.norm1.output);
  assertMatrixClose(trace.block.residual1, trace.block.x0.map((row, rowIndex) => (
    row.map((value, featureIndex) => value + trace.block.attention.output[rowIndex][featureIndex])
  )));
  assert.deepEqual(trace.block.ffn.input, trace.block.norm2.output);
  assert.equal(trace.block.ffn.activation, "relu");
  assert.equal(trace.block.ffn.sharedAcrossTokens, true);
  assertShape(trace.block.ffn.hidden, 3, 6);
  assertMatrixClose(trace.block.output, trace.block.residual1.map((row, rowIndex) => (
    row.map((value, featureIndex) => value + trace.block.ffn.output[rowIndex][featureIndex])
  )));
  assert.deepEqual(trace.finalNorm.input, trace.block.output);
  assertShape(trace.finalNorm.output, 3, 4);
  assertShape(trace.logits, 3, 8);
  assertShape(trace.probabilities, 3, 8);
  assert.deepEqual(trace.handoff, {
    hiddenShape: [3, 4],
    logitsShape: [3, 8],
    probabilityAxis: "vocabulary",
    selectedRow: "last-prefix-token",
  });
  assert.equal(trace.lastRowIndex, 2);
  assert.equal(trace.nextTokenId, 3);
  assert.equal(trace.nextToken, "sat");
  close(trace.nextProbability, 0.38185516618054327);
});

test("masks future keys before row softmax and preserves every active row mass", () => {
  const trace = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
  assert.equal(trace.block.attention.heads.length, 2);
  trace.block.attention.heads.forEach((head, headIndex) => {
    assert.equal(head.headIndex, headIndex);
    assertShape(head.q, 3, 2);
    assertShape(head.k, 3, 2);
    assertShape(head.v, 3, 2);
    assertShape(head.rawScores, 3, 3);
    assertShape(head.maskedScores, 3, 3);
    assertShape(head.weights, 3, 3);
    assertShape(head.context, 3, 2);
    for (let queryIndex = 0; queryIndex < 3; queryIndex += 1) {
      for (let keyIndex = 0; keyIndex < 3; keyIndex += 1) {
        const allowed = keyIndex <= queryIndex;
        assert.equal(head.allowed[queryIndex][keyIndex], allowed);
        assert.equal(head.maskedScores[queryIndex][keyIndex] === null, !allowed);
        if (!allowed) assert.equal(head.weights[queryIndex][keyIndex], 0);
      }
      close(head.rowSums[queryIndex], 1);
    }
  });
  assertShape(trace.block.attention.concatenated, 3, 4);
  assertShape(trace.block.attention.output, 3, 4);
});

test("keeps an earlier causal prefix invariant when a later token is appended", () => {
  const short = runMiniTransformerTokenIds([0, 1]);
  const longer = runMiniTransformerTokenIds([0, 1, 2]);
  assertMatrixClose(longer.block.output.slice(0, 2), short.block.output);
  assertMatrixClose(longer.finalNorm.output.slice(0, 2), short.finalNorm.output);
  assertMatrixClose(longer.logits.slice(0, 2), short.logits);
  assertMatrixClose(longer.probabilities.slice(0, 2), short.probabilities);

  const unmaskedShort = runMiniTransformerTokenIds([0, 1], { ...canonicalMiniTransformerConfig, causal: false });
  const unmaskedLong = runMiniTransformerTokenIds([0, 1, 2], { ...canonicalMiniTransformerConfig, causal: false });
  assert.notDeepEqual(unmaskedLong.block.output.slice(0, 2), unmaskedShort.block.output);
});

test("normalizes probabilities across vocabulary rows and exposes the broken sequence-axis counterexample", () => {
  const canonical = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
  canonical.probabilityRowSums.forEach((sum) => close(sum, 1));
  assert.ok(canonical.probabilityColumnSums.some((sum) => Math.abs(sum - 1) > 0.1));
  canonical.probabilities.flat().forEach((value) => assert.ok(value >= 0 && value <= 1));

  const wrongAxis = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, {
    ...canonicalMiniTransformerConfig,
    probabilityAxis: "sequence",
  });
  wrongAxis.probabilityColumnSums.forEach((sum) => close(sum, 1));
  assert.ok(wrongAxis.probabilityRowSums.some((sum) => Math.abs(sum - 1) > 0.1));
});

test("creates shifted next-token targets and computes mean cross entropy from raw logits", () => {
  assert.deepEqual(createShiftedNextTokenTargets([0, 1, 2, 3, 4]), [1, 2, 3, 4, 5]);
  assert.deepEqual(createShiftedNextTokenTargets([0, 1], 4), [1, 4]);
  assert.throws(() => createShiftedNextTokenTargets([]), /at least one input token/);
  assert.throws(() => createShiftedNextTokenTargets([0, 99]), /vocabulary token id/);
  const logits = [[8, 0, -2, -3, -4, -5, -6, -7]];
  const correct = meanNextTokenCrossEntropy(logits, [0]);
  const wrong = meanNextTokenCrossEntropy(logits, [7]);
  assert.ok(Number.isFinite(correct));
  assert.ok(wrong > correct + 14);
  close(
    meanNextTokenCrossEntropy([...logits, ...logits], [0, 0]),
    correct,
  );
  assert.throws(() => meanNextTokenCrossEntropy(logits, []), /one target per logit row/);
  assert.throws(() => meanNextTokenCrossEntropy([[1, 2]], [0]), /contain 8 columns/);
});

test("performs one deterministic LM-head gradient-descent update that lowers teacher-forced CE", () => {
  const update = runMiniTransformerLmHeadUpdate();
  assert.equal(update.trainingText, MINI_TRANSFORMER_TRAINING_TEXT);
  assert.deepEqual(update.inputTokenIds, [0, 1, 2, 3, 4]);
  assert.deepEqual(update.targetTokenIds, [1, 2, 3, 4, 5]);
  assert.deepEqual(update.targetTokens, ["the", "cat", "sat", ".", "<eos>"]);
  assert.deepEqual(update.shiftPairs.map(({ inputTokenId, targetTokenId }) => [inputTokenId, targetTokenId]), [
    [0, 1], [1, 2], [2, 3], [3, 4], [4, 5],
  ]);
  assertShape(update.hidden, 5, 4);
  assertShape(update.logitsBefore, 5, 8);
  assertShape(update.probabilitiesBefore, 5, 8);
  assertShape(update.gradients.logits, 5, 8);
  assertShape(update.gradients.projection, 4, 8);
  assert.equal(update.gradients.bias.length, 8);
  assert.ok(update.gradients.l2Norm > 0);
  close(update.gradients.logits.flat().reduce((sum, value) => sum + value, 0), 0);
  assert.equal(update.learningRate, 0.2);
  assertShape(update.updatedProjection, 4, 8);
  assert.equal(update.updatedBias.length, 8);
  assert.notDeepEqual(update.updatedProjection, miniTransformerFixture.vocabularyProjection);
  assert.notDeepEqual(update.updatedBias, miniTransformerFixture.vocabularyBias);
  assertShape(update.logitsAfter, 5, 8);
  assertShape(update.probabilitiesAfter, 5, 8);
  update.probabilitiesBefore.forEach((row) => close(row.reduce((sum, value) => sum + value, 0), 1));
  update.probabilitiesAfter.forEach((row) => close(row.reduce((sum, value) => sum + value, 0), 1));
  close(update.meanLossBefore, 1.6559665206356786);
  close(update.meanLossAfter, 1.552597371429616);
  assert.ok(update.meanLossAfter < update.meanLossBefore);
  assert.equal(update.lossDecreased, true);
  assert.equal(update.updatedOnly, "vocabulary-projection-and-bias");
  assert.deepEqual(miniTransformerFixture.vocabularyProjection, vocabularyProjectionSnapshot);
  assert.ok(Object.isFrozen(update));
  assert.ok(Object.isFrozen(update.gradients));
  assert.ok(Object.isFrozen(update.updatedProjection[0]));
});

const vocabularyProjectionSnapshot = structuredClone(miniTransformerFixture.vocabularyProjection);

test("supports greedy EOS and max-length stops plus learner-selected autoregressive decoding", () => {
  const eos = generateMiniTransformer("the");
  assert.deepEqual(eos.initialTokenIds, [0, 1]);
  assert.deepEqual(eos.generatedTokenIds, [MINI_TRANSFORMER_EOS_ID]);
  assert.equal(eos.steps.length, 1);
  assert.equal(eos.steps[0].greedyTokenId, MINI_TRANSFORMER_EOS_ID);
  assert.equal(eos.steps[0].emittedTokenId, MINI_TRANSFORMER_EOS_ID);
  assert.equal(eos.steps[0].source, "greedy");
  assert.equal(eos.steps[0].recomputedFromFullPrefix, true);
  assert.equal(eos.stopReason, "eos");
  assert.equal(eos.eosEmitted, true);
  assert.equal(eos.decodedText, "the");

  const max = generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
  assert.deepEqual(max.generatedTokenIds, [3, 4, 2, 2, 2]);
  assert.equal(max.steps.length, 5);
  assert.equal(max.stopReason, "max-length");
  assert.equal(max.eosEmitted, false);
  max.steps.forEach((step, index) => {
    assert.equal(step.stepIndex, index);
    assert.equal(step.recomputedFromFullPrefix, true);
    if (index > 0) {
      assert.deepEqual(step.prefixTokenIds, [
        ...max.steps[index - 1].prefixTokenIds,
        max.steps[index - 1].emittedTokenId,
      ]);
    }
  });

  const learner = generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, {
    ...canonicalMiniTransformerConfig,
    decodeStrategy: "learner-selected",
    maxNewTokens: 3,
  }, [3, MINI_TRANSFORMER_EOS_ID]);
  assert.deepEqual(learner.generatedTokenIds, [3, MINI_TRANSFORMER_EOS_ID]);
  assert.equal(learner.steps[0].source, "learner-selected");
  assert.equal(learner.stopReason, "eos");
  assert.equal(learner.eosEmitted, true);
  assert.throws(() => generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, {
    ...canonicalMiniTransformerConfig,
    decodeStrategy: "learner-selected",
    maxNewTokens: 2,
  }, [3]), /needs token 2/);
  assert.throws(() => generateMiniTransformer(MINI_TRANSFORMER_TRAINING_TEXT), /exceeds the context limit/);
});

test("validates token ids config ranges and generation inputs", () => {
  const invalidConfigs = [
    [{ ...canonicalMiniTransformerConfig, addBos: "yes" }, /switches must be boolean/],
    [{ ...canonicalMiniTransformerConfig, causal: 1 }, /switches must be boolean/],
    [{ ...canonicalMiniTransformerConfig, recomputePrefix: null }, /switches must be boolean/],
    [{ ...canonicalMiniTransformerConfig, stopAtEos: undefined }, /switches must be boolean/],
    [{ ...canonicalMiniTransformerConfig, positionScale: -0.1 }, /between 0 and 2/],
    [{ ...canonicalMiniTransformerConfig, positionScale: Infinity }, /finite and between/],
    [{ ...canonicalMiniTransformerConfig, probabilityAxis: "feature" }, /vocabulary or sequence/],
    [{ ...canonicalMiniTransformerConfig, decodeStrategy: "sample" }, /greedy or learner-selected/],
    [{ ...canonicalMiniTransformerConfig, maxNewTokens: 0 }, /between 1 and 5/],
    [{ ...canonicalMiniTransformerConfig, maxNewTokens: 6 }, /between 1 and 5/],
  ];
  invalidConfigs.forEach(([config, pattern]) => assert.throws(() => runMiniTransformer("the", config), pattern));
  assert.throws(() => runMiniTransformer("the", null), /config is required/);
  assert.throws(() => runMiniTransformerTokenIds([]), /between 1 and 8/);
  assert.throws(() => runMiniTransformerTokenIds(null), /must be an array/);
  assert.throws(() => runMiniTransformerTokenIds([0, 99]), /vocabulary token id/);
  assert.throws(() => runMiniTransformerLmHeadUpdate(MINI_TRANSFORMER_TRAINING_TEXT, {
    ...canonicalMiniTransformerConfig,
    probabilityAxis: "sequence",
  }), /requires vocabulary-axis/);
  assert.throws(() => runMiniTransformerLmHeadUpdate(MINI_TRANSFORMER_TRAINING_TEXT, canonicalMiniTransformerConfig, 0), /between 1e-4 and 1/);
});

test("deep-freezes complete forward generation and training traces without mutating fixtures", () => {
  const fixtureSnapshot = structuredClone(miniTransformerFixture);
  const forward = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT);
  const generation = generateMiniTransformer("the");
  const update = runMiniTransformerLmHeadUpdate();
  for (const value of [
    forward,
    forward.config,
    forward.tokenization,
    forward.tokenIds,
    forward.block,
    forward.block.x0,
    forward.block.x0[0],
    forward.block.attention,
    forward.block.attention.heads,
    forward.block.attention.heads[0],
    forward.block.attention.heads[0].weights[0],
    forward.block.ffn,
    forward.finalNorm,
    forward.logits,
    forward.probabilities[0],
    forward.handoff,
    generation,
    generation.steps,
    generation.steps[0],
    generation.steps[0].forward,
    update,
    update.shiftPairs[0],
    update.gradients.projection[0],
  ]) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => {
    forward.logits[0][0] = 100;
  }, TypeError);
  assert.throws(() => {
    generation.steps[0].emittedTokenId = 2;
  }, TypeError);
  assert.deepEqual(miniTransformerFixture, fixtureSnapshot);
  assert.deepEqual(runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT), forward);
});

test("exports five stable lab challenge controls predictions and numeric inspections", () => {
  assert.deepEqual(miniTransformerChallengeIds, [
    "tokenize",
    "embed-position",
    "causal-block",
    "vocab-projection",
    "autoregressive-decode",
  ]);
  assert.deepEqual(miniTransformerCoreChallengeIds, [
    "causal-block",
    "vocab-projection",
    "autoregressive-decode",
  ]);
  assert.equal(Object.isFrozen(miniTransformerCoreChallengeIds), true);
  assert.equal(new Set(miniTransformerPredictions).size, miniTransformerPredictions.length);
  assert.equal(miniTransformerChallengeDefaults.tokenize.addBos, false);
  assert.equal(miniTransformerChallengeDefaults["embed-position"].positionScale, 0);
  assert.equal(miniTransformerChallengeDefaults["causal-block"].causal, false);
  assert.equal(miniTransformerChallengeDefaults["vocab-projection"].probabilityAxis, "sequence");
  assert.equal(miniTransformerChallengeDefaults["autoregressive-decode"].recomputePrefix, false);
  assert.deepEqual(miniTransformerChallengeRequirements.tokenize.requiredInspection, { stage: "tokenize", rowIndex: 0, columnIndex: 0 });
  assert.deepEqual(miniTransformerChallengeRequirements["embed-position"].requiredInspection, { stage: "embed-position", rowIndex: 1, columnIndex: 0 });
  assert.deepEqual(miniTransformerChallengeRequirements["causal-block"].requiredInspection, { stage: "causal-block", rowIndex: 0, columnIndex: 1 });
  assert.deepEqual(miniTransformerChallengeRequirements["vocab-projection"].requiredInspection, { stage: "vocab-projection", rowIndex: 2, columnIndex: 3 });
  assert.deepEqual(miniTransformerChallengeRequirements["autoregressive-decode"].requiredInspection, { stage: "autoregressive-decode", rowIndex: 1, columnIndex: 4 });
  for (const challengeId of miniTransformerChallengeIds) {
    const requirement = miniTransformerChallengeRequirements[challengeId];
    assert.equal(requirement.prompt, MINI_TRANSFORMER_LAB_PROMPT);
    assert.deepEqual(requirement.canonicalConfig, canonicalMiniTransformerConfig);
    assert.ok(Object.isFrozen(requirement));
    assert.ok(Object.isFrozen(requirement.requiredInspection));
  }
});

test("grades each lab challenge from the configured executed semantics", () => {
  for (const challengeId of miniTransformerChallengeIds) {
    const requirement = miniTransformerChallengeRequirements[challengeId];
    const correct = gradeMiniTransformerChallenge(
      challengeId,
      requirement.expectedPrediction,
      requirement.canonicalConfig,
      requirement.prompt,
    );
    assert.equal(correct.correct, true, challengeId);
    assert.equal(correct.predictionCorrect, true, challengeId);
    assert.equal(correct.configCorrect, true, challengeId);
    assert.equal(correct.promptCorrect, true, challengeId);
    assert.equal(correct.semanticCorrect, true, challengeId);
    assert.equal(correct.observed.shiftedTargetsCorrect, true);
    assert.equal(correct.observed.lmHeadLossDecreased, true);
    assert.ok(Object.isFrozen(correct));
    assert.ok(Object.isFrozen(correct.observed));

    const wrongPrediction = challengeId === "tokenize"
      ? "prompt-only-no-bos"
      : "bos-and-vocabulary-ids";
    const predictionGrade = gradeMiniTransformerChallenge(
      challengeId,
      wrongPrediction,
      requirement.canonicalConfig,
    );
    assert.equal(predictionGrade.correct, false, challengeId);
    assert.equal(predictionGrade.predictionCorrect, false, challengeId);

    const configGrade = gradeMiniTransformerChallenge(
      challengeId,
      requirement.expectedPrediction,
      miniTransformerChallengeDefaults[challengeId],
    );
    assert.equal(configGrade.correct, false, challengeId);
    assert.equal(configGrade.configCorrect, false, challengeId);
  }
  assert.equal(gradeMiniTransformerChallenge(
    "tokenize",
    miniTransformerChallengeRequirements.tokenize.expectedPrediction,
    canonicalMiniTransformerConfig,
    "the",
  ).promptCorrect, false);
  assert.throws(() => gradeMiniTransformerChallenge("unknown", "bos-and-vocabulary-ids", canonicalMiniTransformerConfig), /Unknown Mini Transformer challenge/);
  assert.throws(() => gradeMiniTransformerChallenge("tokenize", "invented", canonicalMiniTransformerConfig), /Unknown Mini Transformer prediction/);
});

test("accepts only the required semantic inspection cell for each mastered run", () => {
  for (const challengeId of miniTransformerChallengeIds) {
    const requirement = miniTransformerChallengeRequirements[challengeId];
    assert.equal(isValidMiniTransformerInspection(
      challengeId,
      requirement.canonicalConfig,
      requirement.requiredInspection,
      requirement.prompt,
    ), true, challengeId);
    assert.equal(isValidMiniTransformerInspection(
      challengeId,
      requirement.canonicalConfig,
      { ...requirement.requiredInspection, columnIndex: requirement.requiredInspection.columnIndex + 1 },
      requirement.prompt,
    ), false, `${challengeId} unrelated cell`);
    assert.equal(isValidMiniTransformerInspection(
      challengeId,
      miniTransformerChallengeDefaults[challengeId],
      requirement.requiredInspection,
      requirement.prompt,
    ), false, `${challengeId} broken config`);
  }
});

test("requires three representative core stages while preserving all exploration evidence", () => {
  assert.deepEqual(evaluateMiniTransformerLabMastery(emptyMiniTransformerLabEvidence), {
    mastered: false,
    reason: "complete-core-challenges",
    completedChallengeIds: [],
  });
  assert.deepEqual(evaluateMiniTransformerLabMastery(validEvidence(miniTransformerCoreChallengeIds)), {
    mastered: true,
    reason: "mastered",
    completedChallengeIds: miniTransformerCoreChallengeIds,
  });
  assert.deepEqual(evaluateMiniTransformerLabMastery(validEvidence()), {
    mastered: true,
    reason: "mastered",
    completedChallengeIds: miniTransformerChallengeIds,
  });
  const incomplete = validEvidence();
  incomplete.events.splice(-1, 1);
  assert.deepEqual(evaluateMiniTransformerLabMastery(incomplete), {
    mastered: false,
    reason: "complete-core-challenges",
    completedChallengeIds: miniTransformerChallengeIds.slice(0, 4),
  });
});

test("rejects replayed forged mismatched malformed and out-of-order evidence", () => {
  const cases = [];
  const runFirst = validEvidence();
  [runFirst.events[0], runFirst.events[1]] = [runFirst.events[1], runFirst.events[0]];
  cases.push(["run before prediction", runFirst]);
  const inspectFirst = validEvidence();
  [inspectFirst.events[1], inspectFirst.events[2]] = [inspectFirst.events[2], inspectFirst.events[1]];
  cases.push(["inspect before run", inspectFirst]);
  const duplicateEvent = validEvidence();
  duplicateEvent.events[1].eventId = duplicateEvent.events[0].eventId;
  cases.push(["duplicate event", duplicateEvent]);
  const duplicateRun = validEvidence();
  duplicateRun.events.splice(2, 0, { ...duplicateRun.events[1], eventId: "duplicate-run" });
  cases.push(["duplicate run", duplicateRun]);
  const replayInspect = validEvidence();
  replayInspect.events.splice(3, 0, { ...replayInspect.events[2], eventId: "replay-inspect" });
  cases.push(["replayed inspect", replayInspect]);
  const duplicateAttempt = validEvidence();
  duplicateAttempt.events.splice(1, 0, { ...duplicateAttempt.events[0], eventId: "duplicate-attempt" });
  cases.push(["duplicate attempt", duplicateAttempt]);
  const changedConfig = validEvidence();
  changedConfig.events[1].config = { ...changedConfig.events[1].config, addBos: false };
  cases.push(["changed config", changedConfig]);
  const changedPrompt = validEvidence();
  changedPrompt.events[1].prompt = "the";
  cases.push(["changed prompt", changedPrompt]);
  const changedChallenge = validEvidence();
  changedChallenge.events[1].challengeId = "embed-position";
  cases.push(["changed challenge", changedChallenge]);
  const wrongPrediction = validEvidence();
  wrongPrediction.events[0].prediction = "prompt-only-no-bos";
  wrongPrediction.events[0].claimedCorrect = true;
  cases.push(["forged correctness", wrongPrediction]);
  const wrongStage = validEvidence();
  wrongStage.events[2].stage = "causal-block";
  cases.push(["wrong stage", wrongStage]);
  const wrongCoordinate = validEvidence();
  wrongCoordinate.events[2].columnIndex = 1;
  cases.push(["wrong coordinate", wrongCoordinate]);
  const missingCoordinate = validEvidence();
  delete missingCoordinate.events[2].rowIndex;
  cases.push(["missing coordinate", missingCoordinate]);
  const invalidConfig = validEvidence();
  invalidConfig.events[0].config = { ...invalidConfig.events[0].config, positionScale: Number.NaN };
  cases.push(["invalid config", invalidConfig]);
  const unknownKind = validEvidence();
  unknownKind.events[1].kind = "claim-complete";
  cases.push(["unknown kind", unknownKind]);
  const unknownPrediction = validEvidence();
  unknownPrediction.events[0].prediction = "claim-mastery";
  cases.push(["unknown prediction", unknownPrediction]);
  const missingId = validEvidence();
  delete missingId.events[0].eventId;
  cases.push(["missing event id", missingId]);
  const generationOverflow = validEvidence();
  generationOverflow.events[0].prompt = "the cat sat mat";
  generationOverflow.events[1].prompt = "the cat sat mat";
  generationOverflow.events[2].prompt = "the cat sat mat";
  cases.push(["prompt valid for forward but too long for generation", generationOverflow]);

  for (const [label, evidence] of cases) {
    assert.equal(evaluateMiniTransformerLabMastery(evidence).reason, "invalid-evidence", label);
  }
  assert.equal(evaluateMiniTransformerLabMastery({ events: "forged" }).reason, "invalid-evidence");
  assert.equal(evaluateMiniTransformerLabMastery(null).reason, "invalid-evidence");
});

test("exposes four debugger incidents with exactly one semantic repair", () => {
  assert.deepEqual(miniTransformerDebuggerScenarioIds, [
    "tokenizer-boundary",
    "causal-attention",
    "vocab-probabilities",
    "autoregressive-loop",
  ]);
  const correctIds = {
    "tokenizer-boundary": "bos-vocabulary-tokenization",
    "causal-attention": "mask-before-row-softmax",
    "vocab-probabilities": "final-norm-vocab-softmax-ce-descent",
    "autoregressive-loop": "append-recompute-stop",
  };
  for (const scenarioId of miniTransformerDebuggerScenarioIds) {
    const scenario = miniTransformerDebuggerScenarios[scenarioId];
    const correct = scenario.options.filter(({ id }) => evaluateMiniTransformerRepair(scenarioId, id).correct);
    assert.deepEqual(correct.map(({ id }) => id), [correctIds[scenarioId]], scenarioId);
    assert.ok(Object.isFrozen(scenario));
    assert.ok(Object.isFrozen(scenario.options));
  }
});

test("reports computed debugger reasons for tokenizer mask LM-head and decode failures", () => {
  const expectedReasons = {
    "tokenizer-boundary": {
      "character-codepoints": "outside-vocabulary",
      "bos-vocabulary-tokenization": "contract-restored",
      "omit-bos-token": "bos-missing",
    },
    "causal-attention": {
      "unmasked-row-softmax": "future-leak",
      "softmax-then-zero-future": "row-mass-lost",
      "mask-before-row-softmax": "contract-restored",
    },
    "vocab-probabilities": {
      "sequence-axis-softmax": "wrong-softmax-axis",
      "skip-final-norm": "final-norm-skipped",
      "gradient-ascent-lm-head": "loss-increased",
      "final-norm-vocab-softmax-ce-descent": "contract-restored",
    },
    "autoregressive-loop": {
      "reuse-first-prefix": "prefix-not-recomputed",
      "replace-last-token": "token-not-appended",
      "ignore-eos": "eos-ignored",
      "append-recompute-stop": "contract-restored",
    },
  };
  for (const scenarioId of miniTransformerDebuggerScenarioIds) {
    for (const option of miniTransformerDebuggerScenarios[scenarioId].options) {
      const result = evaluateMiniTransformerRepair(scenarioId, option.id);
      assert.equal(result.reason, expectedReasons[scenarioId][option.id]);
      assert.equal(result.correct, result.reason === "contract-restored");
      assert.equal(result.scenarioId, scenarioId);
      assert.equal(result.repair, option.id);
      assert.ok(Object.isFrozen(result));
      assert.ok(Object.isFrozen(result.metrics));
    }
  }
  assert.equal(evaluateMiniTransformerRepair("tokenizer-boundary", "character-codepoints").metrics.vocabularyIdsValid, false);
  assert.ok(evaluateMiniTransformerRepair("causal-attention", "unmasked-row-softmax").metrics.futureMass > 1);
  assert.ok(evaluateMiniTransformerRepair("causal-attention", "softmax-then-zero-future").metrics.minimumRowSum < 0.5);
  assert.ok(evaluateMiniTransformerRepair("vocab-probabilities", "sequence-axis-softmax").metrics.maxProbabilityRowSumError > 1);
  const descent = evaluateMiniTransformerRepair("vocab-probabilities", "final-norm-vocab-softmax-ce-descent").metrics;
  const ascent = evaluateMiniTransformerRepair("vocab-probabilities", "gradient-ascent-lm-head").metrics;
  assert.ok(descent.lossAfter < descent.lossBefore);
  assert.ok(ascent.lossAfter > ascent.lossBefore);
  assert.ok(evaluateMiniTransformerRepair("autoregressive-loop", "reuse-first-prefix").metrics.prefixRecomputeFailures > 0);
  assert.ok(evaluateMiniTransformerRepair("autoregressive-loop", "replace-last-token").metrics.appendFailures > 0);
  assert.equal(evaluateMiniTransformerRepair("autoregressive-loop", "ignore-eos").metrics.eosStopped, false);
  assert.throws(() => evaluateMiniTransformerRepair("tokenizer-boundary", "mask-before-row-softmax"), /does not belong/);
  assert.throws(() => evaluateMiniTransformerRepair("unknown", "bos-vocabulary-tokenization"), /Unknown Mini Transformer debugger scenario/);
});

test("requires the core lab and concepts while keeping debugger remediation optional", () => {
  for (const labComplete of [false, true]) {
    for (const debuggerComplete of [false, true]) {
      for (const conceptsMastered of [false, true]) {
        assert.equal(canCompleteMiniTransformerChapter({ labComplete, debuggerComplete, conceptsMastered }), (
          labComplete && conceptsMastered
        ));
      }
    }
  }
  assert.equal(canCompleteMiniTransformerChapter({ labComplete: true, conceptsMastered: true }), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  attentionThreeQueryCode,
  attentionValueReadRepairCode,
} from "../src/data/attentionNotebook.ts";
import {
  ATTENTION_KEY_DIMENSION,
  ATTENTION_MEMORY_SLOT_COUNT,
  ATTENTION_VALUE_DIMENSION,
  MAX_ATTENTION_QUERIES,
  attentionDebuggerScenarioIds,
  attentionDebuggerScenarios,
  attentionMemorySlots,
  attentionPresetIds,
  attentionPresets,
  canCompleteAttentionChapter,
  compareAttentionValueCounterfactual,
  emptyAttentionLabEvidence,
  evaluateAttentionLabMastery,
  evaluateAttentionRepair,
  gradeAttentionPrediction,
  inputForAttentionPresets,
  runCrossAttention,
} from "../src/features/attention/attention-model.ts";

const EPSILON = 1e-12;

function approximatelyEqual(actual, expected, tolerance = EPSILON) {
  assert.equal(actual.length, expected.length);
  actual.forEach((value, index) => {
    assert.ok(
      Math.abs(value - expected[index]) <= tolerance,
      `${value} should be within ${tolerance} of ${expected[index]} at index ${index}`,
    );
  });
}

function stableSoftmax(row) {
  const maximum = Math.max(...row);
  const exponents = row.map((value) => Math.exp(value - maximum));
  const total = exponents.reduce((sum, value) => sum + value, 0);
  return exponents.map((value) => value / total);
}

function validEvidence() {
  return {
    events: [
      { kind: "prediction", eventId: "e1", attemptId: "a1", presetId: "find-subject", prediction: "subject" },
      { kind: "run", eventId: "e2", attemptId: "a1", presetId: "find-subject" },
      { kind: "inspect", eventId: "e3", attemptId: "a1", presetId: "find-subject", slotId: "subject" },
      { kind: "inspect", eventId: "e4", attemptId: "a1", presetId: "find-subject", slotId: "place" },
      {
        kind: "value-counterfactual",
        eventId: "e5",
        attemptId: "a1",
        presetId: "find-subject",
        slotId: "action",
        replacementValue: [0.8, 0.6, 0.4],
        prediction: "scores-and-weights-stay-context-changes",
      },
      { kind: "prediction", eventId: "e6", attemptId: "a2", presetId: "find-place", prediction: "place" },
      { kind: "run", eventId: "e7", attemptId: "a2", presetId: "find-place" },
    ],
  };
}

test("ships independent Python bridges for three-query routing and value-read repair", () => {
  assert.match(attentionThreeQueryCode, /scores = Q @ K\.T/);
  assert.match(attentionThreeQueryCode, /stable_softmax\(scores\)/);
  assert.match(attentionThreeQueryCode, /contexts = weights @ V/);
  assert.match(attentionThreeQueryCode, /row_sums = np\.sum\(weights, axis=1\)/);
  assert.match(attentionThreeQueryCode, /\["subject", "place", "action"\]/);
  assert.match(attentionValueReadRepairCode, /return weights @ K/);
  assert.match(attentionValueReadRepairCode, /changed_V\[2\]/);
  assert.match(attentionValueReadRepairCode, /scores_stable = np\.allclose/);
  assert.match(attentionValueReadRepairCode, /context\.shape == \(3, 3\)/);
  assert.match(attentionValueReadRepairCode, /Changing only V must change/);
  assert.doesNotMatch(attentionThreeQueryCode, /[가-힣]/);
  assert.doesNotMatch(attentionValueReadRepairCode, /[가-힣]/);
});

test("publishes three immutable named memory slots and three query presets", () => {
  assert.equal(ATTENTION_MEMORY_SLOT_COUNT, 3);
  assert.equal(ATTENTION_KEY_DIMENSION, 2);
  assert.equal(ATTENTION_VALUE_DIMENSION, 3);
  assert.deepEqual(attentionMemorySlots.map(({ id }) => id), ["subject", "place", "action"]);
  assert.deepEqual(attentionPresetIds, ["find-subject", "find-place", "find-action"]);
  assert.deepEqual(attentionPresets["find-subject"].query, [1.4, 0.1]);
  assert.deepEqual(attentionPresets["find-place"].query, [0.1, 1.4]);
  assert.deepEqual(attentionPresets["find-action"].query, [-1, -1]);
  assert.ok(Object.isFrozen(attentionMemorySlots));
  assert.ok(Object.isFrozen(attentionMemorySlots[0]));
  assert.ok(Object.isFrozen(attentionMemorySlots[0].key));
  assert.ok(Object.isFrozen(attentionMemorySlots[0].value));
  assert.ok(Object.isFrozen(attentionPresets));
  assert.ok(Object.isFrozen(attentionPresets["find-subject"].query));
});

test("runs unscaled cross-attention for one query with exact weighted value contributions", () => {
  const input = inputForAttentionPresets(["find-subject"]);
  const trace = runCrossAttention(input);
  const expectedScores = [1.4, 0.1, -1.2];
  const expectedWeights = stableSoftmax(expectedScores);
  const expectedContext = Array.from({ length: 3 }, (_, dimension) => (
    attentionMemorySlots.reduce(
      (sum, slot, slotIndex) => sum + expectedWeights[slotIndex] * slot.value[dimension],
      0,
    )
  ));

  approximatelyEqual(trace.scores[0], expectedScores);
  approximatelyEqual(trace.weights[0], expectedWeights);
  approximatelyEqual(trace.contexts[0], expectedContext);
  assert.equal(trace.topSlotIds[0], "subject");
  assert.deepEqual(trace.valueContributions.map((rows) => rows.length), [3]);
  trace.valueContributions[0].forEach((contribution, slotIndex) => {
    approximatelyEqual(
      contribution,
      attentionMemorySlots[slotIndex].value.map((value) => value * expectedWeights[slotIndex]),
    );
  });
  assert.ok(Object.isFrozen(trace));
  assert.ok(Object.isFrozen(trace.weights));
  assert.ok(Object.isFrozen(trace.weights[0]));
  assert.ok(Object.isFrozen(trace.valueContributions[0][0]));
});

test("normalizes each query independently over the key axis", () => {
  const combined = runCrossAttention(inputForAttentionPresets(attentionPresetIds));
  assert.deepEqual(combined.scores, [
    [1.4, 0.1, -1.2],
    [0.1, 1.4, -1.2],
    [-1, -1, 1.6],
  ]);
  assert.deepEqual(combined.topSlotIds, ["subject", "place", "action"]);
  combined.weights.forEach((row) => {
    assert.ok(row.every((weight) => weight > 0 && weight < 1));
    assert.ok(Math.abs(row.reduce((sum, weight) => sum + weight, 0) - 1) <= EPSILON);
  });
  const single = runCrossAttention(inputForAttentionPresets(["find-subject"]));
  approximatelyEqual(combined.weights[0], single.weights[0]);

  const large = runCrossAttention({
    ...inputForAttentionPresets(["find-subject"]),
    queries: [[1000, 0]],
  });
  assert.ok(large.weights[0].every(Number.isFinite));
  assert.ok(Math.abs(large.weights[0].reduce((sum, weight) => sum + weight, 0) - 1) <= EPSILON);
  assert.equal(large.topSlotIds[0], "subject");
});

test("does not mutate caller-owned query, key, value, or slot arrays", () => {
  const input = {
    queries: [[1.4, 0.1], [0.1, 1.4]],
    keys: [[1, 0], [0, 1], [-0.8, -0.8]],
    values: [[0.9, 0.2, 0.1], [0.1, 0.9, 0.3], [0.2, 0.1, 1]],
    slotIds: ["subject", "place", "action"],
  };
  const before = structuredClone(input);
  for (const matrix of [input.queries, input.keys, input.values]) {
    matrix.forEach(Object.freeze);
    Object.freeze(matrix);
  }
  Object.freeze(input.slotIds);
  Object.freeze(input);
  const trace = runCrossAttention(input);
  assert.deepEqual(input, before);
  assert.notEqual(trace.queries, input.queries);
  assert.notEqual(trace.keys, input.keys);
  assert.notEqual(trace.values, input.values);
});

test("rejects non-finite, ragged, and misaligned attention inputs", () => {
  const valid = inputForAttentionPresets(["find-subject"]);
  const tooManyQueries = Array.from({ length: MAX_ATTENTION_QUERIES + 1 }, () => [1, 0]);
  const cases = [
    [{ ...valid, queries: [] }, /queries must contain between 1 and 8 rows/],
    [{ ...valid, queries: tooManyQueries }, /queries must contain between 1 and 8 rows/],
    [{ ...valid, queries: [[1]] }, /queries row 0 must contain exactly 2 values/],
    [{ ...valid, queries: [[1, Number.NaN]] }, /queries row 0 column 1 must be finite/],
    [{ ...valid, keys: [[1, 0], [0, 1]] }, /keys must contain exactly 3 rows/],
    [{ ...valid, keys: [[1, 0, 2], [0, 1, 2], [-1, -1, 2]] }, /keys row 0 must contain exactly 2 values/],
    [{ ...valid, values: [[1, 0, 0], [0, 1, 0]] }, /values must contain exactly 3 rows/],
    [{ ...valid, values: [[1, 0], [0, 1], [1, 1]] }, /values row 0 must contain exactly 3 values/],
    [{ ...valid, values: [[1, 0, 0], [0, Infinity, 0], [0, 0, 1]] }, /values row 1 column 1 must be finite/],
    [{ ...valid, slotIds: ["subject", "subject", "action"] }, /slotIds must be unique/],
    [{ ...valid, slotIds: ["subject", "place", "unknown"] }, /named subject, place, and action/],
  ];
  for (const [input, pattern] of cases) assert.throws(() => runCrossAttention(input), pattern);
  assert.throws(() => inputForAttentionPresets([]), /Choose between 1 and 8/);
  assert.throws(() => inputForAttentionPresets(["unknown"]), /Unknown attention preset/);
});

test("grades the top memory slot by recomputing the selected query row", () => {
  const expected = {
    "find-subject": "subject",
    "find-place": "place",
    "find-action": "action",
  };
  for (const presetId of attentionPresetIds) {
    const input = inputForAttentionPresets([presetId]);
    assert.deepEqual(gradeAttentionPrediction(input, expected[presetId]), {
      correct: true,
      expected: expected[presetId],
      predicted: expected[presetId],
      queryIndex: 0,
    });
    assert.equal(gradeAttentionPrediction(input, "subject").correct, presetId === "find-subject");
  }
  assert.throws(
    () => gradeAttentionPrediction(inputForAttentionPresets(["find-subject"]), "subject", 1),
    /queryIndex must identify one query row/,
  );
  assert.throws(
    () => gradeAttentionPrediction(inputForAttentionPresets(["find-subject"]), "unknown"),
    /Unknown attention prediction/,
  );
});

test("changes only V so QK scores and weights stay fixed while context changes", () => {
  const input = inputForAttentionPresets(attentionPresetIds);
  const comparison = compareAttentionValueCounterfactual(input, "action", [0.8, 0.6, 0.4]);
  assert.equal(comparison.scoresStable, true);
  assert.equal(comparison.weightsStable, true);
  assert.equal(comparison.contextChanged, true);
  assert.deepEqual(comparison.contextChangedByQuery, [true, true, true]);
  assert.deepEqual(comparison.baseline.scores, comparison.counterfactual.scores);
  assert.deepEqual(comparison.baseline.weights, comparison.counterfactual.weights);
  assert.notDeepEqual(comparison.baseline.contexts, comparison.counterfactual.contexts);
  assert.deepEqual(input.values[2], [0.2, 0.1, 1]);
  comparison.contextDeltas.forEach((delta, queryIndex) => {
    approximatelyEqual(delta, [0.6, 0.5, -0.6].map(
      (change) => change * comparison.baseline.weights[queryIndex][2],
    ));
  });

  const unchanged = compareAttentionValueCounterfactual(input, "action", [0.2, 0.1, 1]);
  assert.equal(unchanged.contextChanged, false);
  assert.throws(() => compareAttentionValueCounterfactual(input, "action", [1, 2]), /exactly 3 values/);
  assert.throws(() => compareAttentionValueCounterfactual(input, "action", [1, 2, NaN]), /must be finite/);
  assert.throws(() => compareAttentionValueCounterfactual(input, "unknown", [1, 2, 3]), /Unknown memory slot/);
});

test("exposes four debugger incidents with varied correct option positions", () => {
  assert.deepEqual(attentionDebuggerScenarioIds, [
    "softmax-axis",
    "context-source",
    "qk-shape",
    "independent-query-rows",
  ]);
  const correctPositions = attentionDebuggerScenarioIds.map((scenarioId) => {
    const scenario = attentionDebuggerScenarios[scenarioId];
    return scenario.options.findIndex((candidate) => (
      evaluateAttentionRepair(scenarioId, candidate.id).correct
    ));
  });
  assert.deepEqual(correctPositions, [1, 0, 2, 1]);
});

test("semantically evaluates every debugger repair and reports specific wrong reasons", () => {
  const expectations = {
    "softmax-axis": {
      "normalize-values-by-feature": "softmax-over-value-features",
      "normalize-over-keys-per-query": "contract-restored",
      "normalize-over-queries-per-key": "softmax-across-queries",
    },
    "context-source": {
      "combine-values-with-weights": "contract-restored",
      "combine-keys-with-weights": "keys-used-as-context",
      "return-largest-key": "argmax-key-drops-values",
    },
    "qk-shape": {
      "keys-times-queries-transposed": "query-key-axes-swapped",
      "queries-times-keys": "inner-dimensions-do-not-align",
      "queries-times-keys-transposed": "contract-restored",
    },
    "independent-query-rows": {
      "reuse-first-query-row": "first-query-weights-reused",
      "run-each-query-row-independently": "contract-restored",
      "normalize-entire-score-table": "all-query-rows-coupled",
    },
  };
  for (const scenarioId of attentionDebuggerScenarioIds) {
    for (const candidate of attentionDebuggerScenarios[scenarioId].options) {
      const result = evaluateAttentionRepair(scenarioId, candidate.id);
      assert.equal(result.reason, expectations[scenarioId][candidate.id]);
      assert.equal(result.correct, result.reason === "contract-restored");
      assert.equal(result.scenarioId, scenarioId);
      assert.equal(result.repair, candidate.id);
    }
  }

  assert.deepEqual(
    evaluateAttentionRepair("independent-query-rows", "run-each-query-row-independently").metrics.topSlotIds,
    ["subject", "place", "action"],
  );
  assert.deepEqual(
    evaluateAttentionRepair("independent-query-rows", "reuse-first-query-row").metrics.topSlotIds,
    ["subject", "subject", "subject"],
  );
  assert.equal(evaluateAttentionRepair("context-source", "combine-values-with-weights").metrics.contextDimension, 3);
  assert.equal(evaluateAttentionRepair("context-source", "combine-keys-with-weights").metrics.contextDimension, 2);
  assert.equal(evaluateAttentionRepair("qk-shape", "queries-times-keys").metrics.candidateRows, 0);
  assert.ok(evaluateAttentionRepair("softmax-axis", "normalize-over-keys-per-query").metrics.rowSums
    .every((sum) => Math.abs(sum - 1) <= EPSILON));
  assert.throws(
    () => evaluateAttentionRepair("softmax-axis", "combine-values-with-weights"),
    /does not belong/,
  );
  assert.throws(() => evaluateAttentionRepair("unknown", "normalize-over-keys-per-query"), /Unknown/);
});

test("replays ordered lab evidence and recomputes mastery instead of trusting claimed outcomes", () => {
  assert.deepEqual(evaluateAttentionLabMastery(emptyAttentionLabEvidence), {
    mastered: false,
    reason: "two-correct-predictions",
    correctPresetIds: [],
    inspectedSlotIds: [],
  });
  assert.deepEqual(evaluateAttentionLabMastery(validEvidence()), {
    mastered: true,
    reason: "mastered",
    correctPresetIds: ["find-subject", "find-place"],
    inspectedSlotIds: ["subject", "place"],
  });

  const onePrediction = validEvidence();
  onePrediction.events = onePrediction.events.slice(0, 5);
  assert.equal(evaluateAttentionLabMastery(onePrediction).reason, "two-correct-predictions");

  const oneInspection = validEvidence();
  oneInspection.events = oneInspection.events.filter(({ eventId }) => eventId !== "e4");
  assert.equal(evaluateAttentionLabMastery(oneInspection).reason, "two-slot-inspection");

  const noChange = validEvidence();
  noChange.events[4] = { ...noChange.events[4], replacementValue: [0.2, 0.1, 1] };
  assert.equal(evaluateAttentionLabMastery(noChange).reason, "value-counterfactual");

  const wrongClaim = validEvidence();
  wrongClaim.events[4] = { ...wrongClaim.events[4], prediction: "scores-change" };
  assert.equal(evaluateAttentionLabMastery(wrongClaim).reason, "value-counterfactual");
});

test("rejects replayed, forged, mismatched, and reordered mastery evidence", () => {
  const reordered = validEvidence();
  [reordered.events[0], reordered.events[1]] = [reordered.events[1], reordered.events[0]];
  assert.equal(evaluateAttentionLabMastery(reordered).reason, "invalid-evidence");

  const duplicateEvent = validEvidence();
  duplicateEvent.events[1] = { ...duplicateEvent.events[1], eventId: "e1" };
  assert.equal(evaluateAttentionLabMastery(duplicateEvent).reason, "invalid-evidence");

  const replayRun = validEvidence();
  replayRun.events.splice(2, 0, { ...replayRun.events[1], eventId: "replayed-run" });
  assert.equal(evaluateAttentionLabMastery(replayRun).reason, "invalid-evidence");

  const mismatchedPreset = validEvidence();
  mismatchedPreset.events[1] = { ...mismatchedPreset.events[1], presetId: "find-place" };
  assert.equal(evaluateAttentionLabMastery(mismatchedPreset).reason, "invalid-evidence");

  const forgedPrediction = validEvidence();
  forgedPrediction.events[0] = { ...forgedPrediction.events[0], prediction: "action" };
  assert.equal(evaluateAttentionLabMastery(forgedPrediction).reason, "invalid-evidence");

  const counterfactualBeforeRun = validEvidence();
  const counterfactual = counterfactualBeforeRun.events.splice(4, 1)[0];
  counterfactualBeforeRun.events.splice(1, 0, counterfactual);
  assert.equal(evaluateAttentionLabMastery(counterfactualBeforeRun).reason, "invalid-evidence");

  const malformed = validEvidence();
  malformed.events[4] = { ...malformed.events[4], replacementValue: [1, NaN, 3] };
  assert.equal(evaluateAttentionLabMastery(malformed).reason, "invalid-evidence");
  assert.equal(evaluateAttentionLabMastery({ events: [{ kind: "forged" }] }).reason, "invalid-evidence");
  assert.equal(evaluateAttentionLabMastery(null).reason, "invalid-evidence");
});

test("requires lab and concept mastery while keeping debugger remediation optional", () => {
  for (const labComplete of [false, true]) {
    for (const debuggerComplete of [false, true]) {
      for (const conceptsMastered of [false, true]) {
        assert.equal(
          canCompleteAttentionChapter({ labComplete, debuggerComplete, conceptsMastered }),
          labComplete && conceptsMastered,
        );
      }
    }
  }
  assert.equal(canCompleteAttentionChapter({ labComplete: true, conceptsMastered: true }), true);
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  canExecuteSequentialPhase,
  hasMasteredSequentialEvidence,
} from "../src/features/chapters/sequential-execution.ts";

test("keeps evidence locked until prediction and unlocks one phase at a time", () => {
  assert.equal(canExecuteSequentialPhase({ phaseIndex: 0, visitedCount: 1, predictionCorrect: false }), false);
  assert.equal(canExecuteSequentialPhase({ phaseIndex: 0, visitedCount: 1, predictionCorrect: true }), true);
  assert.equal(canExecuteSequentialPhase({ phaseIndex: 1, visitedCount: 1, predictionCorrect: true }), true);
  assert.equal(canExecuteSequentialPhase({ phaseIndex: 2, visitedCount: 1, predictionCorrect: true }), false);
});

test("requires a correct prediction and every phase for mastery", () => {
  assert.equal(hasMasteredSequentialEvidence({ predictionCorrect: false, visitedCount: 6, phaseCount: 6 }), false);
  assert.equal(hasMasteredSequentialEvidence({ predictionCorrect: true, visitedCount: 5, phaseCount: 6 }), false);
  assert.equal(hasMasteredSequentialEvidence({ predictionCorrect: true, visitedCount: 6, phaseCount: 6 }), true);
});

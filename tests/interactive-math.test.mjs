import assert from "node:assert/strict";
import test from "node:test";
import {
  multiplyMatrices,
  scaleMatrix,
  softmaxRows,
  transpose,
} from "../src/features/interactive/math.ts";

test("builds a shape-safe self-attention pipeline", () => {
  const tokens = [
    [1, 0.8, 0.1, 0],
    [0.9, 0.7, 0.2, 0.1],
    [0, 0.1, 0.9, 1],
  ];
  const scores = multiplyMatrices(tokens, transpose(tokens));
  const scaled = scaleMatrix(scores, Math.sqrt(tokens[0].length));
  const weights = softmaxRows(scaled);
  const context = multiplyMatrices(weights, tokens);

  assert.deepEqual(scores.map((row) => row.length), [3, 3, 3]);
  assert.deepEqual(context.map((row) => row.length), [4, 4, 4]);
  for (const row of weights) {
    assert.ok(Math.abs(row.reduce((sum, value) => sum + value, 0) - 1) < 1e-12);
    assert.ok(row.every((value) => value > 0 && value < 1));
  }
});

test("rejects incompatible matrix multiplication", () => {
  assert.throws(
    () => multiplyMatrices([[1, 2]], [[1, 2]]),
    /same length/,
  );
});

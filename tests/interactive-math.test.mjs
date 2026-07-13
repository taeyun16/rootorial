import assert from "node:assert/strict";
import test from "node:test";
import {
  concatenateVectors,
  multiplyMatrices,
  reshapeVector,
  scaleMatrix,
  shapeOfNumericArray,
  softmaxRows,
  stackVectors,
  sumMatrixAxis,
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

test("reshapes one vector without changing value order", () => {
  const values = [11, 22, 33, 44, 55, 66];

  assert.deepEqual(reshapeVector(values, [2, 3]), [[11, 22, 33], [44, 55, 66]]);
  assert.deepEqual(reshapeVector(values, [-1, 3]), [[11, 22, 33], [44, 55, 66]]);
  assert.deepEqual(shapeOfNumericArray(reshapeVector(values, [6, 1])), [6, 1]);
  assert.throws(() => reshapeVector(values, [4, 2]), /Cannot reshape 6 values/);
  assert.throws(() => reshapeVector(values, [-1, -1]), /Only one reshape dimension/);
});

test("creates, extends, and removes NumPy-style axes", () => {
  const a = [1, 2, 3];
  const b = [-1, -2, -3];

  assert.deepEqual(stackVectors([a, b], 0), [[1, 2, 3], [-1, -2, -3]]);
  assert.deepEqual(stackVectors([a, b], 1), [[1, -1], [2, -2], [3, -3]]);
  assert.deepEqual(concatenateVectors([a, b], 0), [1, 2, 3, -1, -2, -3]);
  assert.throws(() => concatenateVectors([a, b], 1), /axis 1 is out of bounds/);
  assert.deepEqual(sumMatrixAxis([a, b], 0), [0, 0, 0]);
  assert.deepEqual(sumMatrixAxis([a, b], 1), [6, -6]);
});

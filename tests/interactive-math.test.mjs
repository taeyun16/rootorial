import assert from "node:assert/strict";
import test from "node:test";
import {
  concatenateVectors,
  reshapeVector,
  shapeOfNumericArray,
  stackVectors,
  sumMatrixAxis,
} from "../src/features/interactive/math.ts";

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

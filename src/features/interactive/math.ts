export type NumericVector = number[];
export type NumericMatrix = number[][];
export type NumericArray = NumericVector | NumericMatrix;
export type MatrixAxis = 0 | 1;

export function shapeOfNumericArray(values: NumericArray): number[] {
  return Array.isArray(values[0])
    ? [values.length, (values as NumericMatrix)[0]?.length ?? 0]
    : [values.length];
}

export function dot(left: NumericVector, right: NumericVector) {
  if (left.length !== right.length) {
    throw new Error("Dot product requires vectors with the same length.");
  }
  return left.reduce((sum, value, index) => sum + value * right[index], 0);
}

export function transpose(matrix: NumericMatrix): NumericMatrix {
  if (matrix.length === 0) return [];
  return matrix[0].map((_, column) => matrix.map((row) => row[column]));
}

export function multiplyMatrices(left: NumericMatrix, right: NumericMatrix): NumericMatrix {
  const rightTransposed = transpose(right);
  return left.map((row) => rightTransposed.map((column) => dot(row, column)));
}

export function scaleMatrix(matrix: NumericMatrix, divisor: number): NumericMatrix {
  return matrix.map((row) => row.map((value) => value / divisor));
}

export function softmaxRows(matrix: NumericMatrix): NumericMatrix {
  return matrix.map((row) => {
    const maximum = Math.max(...row);
    const exponents = row.map((value) => Math.exp(value - maximum));
    const total = exponents.reduce((sum, value) => sum + value, 0);
    return exponents.map((value) => value / total);
  });
}

export function matrixExtent(matrix: NumericMatrix) {
  const values = matrix.flat();
  return values.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0) || 1;
}

export function reshapeVector(values: NumericVector, shape: number[]): NumericArray {
  if (shape.length < 1 || shape.length > 2 || shape.some((size) => !Number.isInteger(size) || size === 0 || size < -1)) {
    throw new Error("This visualizer supports rank-1 and rank-2 shapes with at most one inferred dimension.");
  }

  const inferredDimensions = shape.filter((dimension) => dimension === -1).length;
  if (inferredDimensions > 1) {
    throw new Error("Only one reshape dimension can be inferred.");
  }

  const knownSize = shape.filter((dimension) => dimension !== -1).reduce((size, dimension) => size * dimension, 1);
  if (values.length % knownSize !== 0) {
    throw new Error(`Cannot reshape ${values.length} values into shape (${shape.join(", ")}).`);
  }
  const resolvedShape = shape.map((dimension) => dimension === -1 ? values.length / knownSize : dimension);
  const targetSize = resolvedShape.reduce((size, dimension) => size * dimension, 1);
  if (targetSize !== values.length) {
    throw new Error(`Cannot reshape ${values.length} values into shape (${shape.join(", ")}).`);
  }

  if (resolvedShape.length === 1) return [...values];

  const [rows, columns] = resolvedShape;
  return Array.from({ length: rows }, (_, row) => (
    values.slice(row * columns, (row + 1) * columns)
  ));
}

export function stackVectors(vectors: NumericVector[], axis: MatrixAxis): NumericMatrix {
  if (vectors.length === 0) return [];
  const width = vectors[0].length;
  if (vectors.some((vector) => vector.length !== width)) {
    throw new Error("Stack requires vectors with the same length.");
  }

  return axis === 0
    ? vectors.map((vector) => [...vector])
    : Array.from({ length: width }, (_, index) => vectors.map((vector) => vector[index]));
}

export function concatenateVectors(vectors: NumericVector[], axis: MatrixAxis): NumericVector {
  if (axis !== 0) {
    throw new Error("Rank-1 arrays only have axis 0, so axis 1 is out of bounds.");
  }
  return vectors.flatMap((vector) => vector);
}

export function sumMatrixAxis(matrix: NumericMatrix, axis: MatrixAxis): NumericVector {
  if (matrix.length === 0) return [];
  const width = matrix[0].length;
  if (matrix.some((row) => row.length !== width)) {
    throw new Error("Axis reduction requires a rectangular matrix.");
  }

  return axis === 0
    ? Array.from({ length: width }, (_, column) => matrix.reduce((sum, row) => sum + row[column], 0))
    : matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
}

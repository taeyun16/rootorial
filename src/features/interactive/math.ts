export type NumericVector = number[];
export type NumericMatrix = number[][];

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

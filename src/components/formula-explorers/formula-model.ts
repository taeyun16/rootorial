/** Small explanatory examples, deliberately independent of graded lab fixtures. */
export function finiteDifference(x: number, epsilon: number) {
  const loss = (w: number) => w ** 4 / 4;
  const left = loss(x - epsilon);
  const right = loss(x + epsilon);
  return { left, right, loss: loss(x), numeric: (right - left) / (2 * epsilon), analytic: x ** 3 };
}

export function binarySample(z: number, label: number) {
  const probability = 1 / (1 + Math.exp(-z));
  return { probability, loss: Math.max(z, 0) - label * z + Math.log1p(Math.exp(-Math.abs(z))), gradient: probability - label };
}

export function cosineExample(degrees: number, magnitude: number) {
  const radians = degrees * Math.PI / 180;
  const b = [magnitude * Math.cos(radians), magnitude * Math.sin(radians)];
  return { b, dot: b[0], cosine: magnitude === 0 ? null : Math.cos(radians) };
}

export function positionExample(position: number, pair: number) {
  const denominator = 10000 ** (2 * pair / 8);
  return { sin: Math.sin(position / denominator), cos: Math.cos(position / denominator), denominator, wavelength: 2 * Math.PI * denominator };
}

export function layerNormExample(values: number[], gamma: number, beta: number, epsilon = 0.00001) {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  const centered = values.map((value) => value - mean);
  const variance = centered.reduce((sum, value) => sum + value ** 2, 0) / values.length;
  const normalized = centered.map((value) => value / Math.sqrt(variance + epsilon));
  return { mean, variance, centered, normalized, output: normalized.map((value) => gamma * value + beta) };
}

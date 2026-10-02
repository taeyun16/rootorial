export type Vector2 = readonly [number, number];
export type VectorOperation = "add" | "subtract" | "scale" | "normalize";

// One small contract shared by the numeric answer and its geometric representation.
export const vectorOperationContract = {
  formulaId: "vector.basic-operation.v1",
  variables: { v: "2D coordinates", w: "2D coordinates", scalar: "dimensionless multiplier" },
  observed: ["result coordinates", "result magnitude", "direction"],
  undefinedWhen: "normalizing the zero vector",
  alternative: "labeled coordinates and numeric prediction; no dragging required",
} as const;

export function vectorOperationTrace(operation: VectorOperation, v: Vector2, w: Vector2, scalar: number) {
  if (![...v, ...w, scalar].every(Number.isFinite)) throw new Error("Vector inputs must be finite");
  const norm = Math.hypot(...v);
  const defined = operation !== "normalize" || norm !== 0;
  const result: Vector2 = operation === "add" ? [v[0] + w[0], v[1] + w[1]]
    : operation === "subtract" ? [v[0] - w[0], v[1] - w[1]]
      : operation === "scale" ? [scalar * v[0], scalar * v[1]]
        : defined ? [v[0] / norm, v[1] / norm] : [0, 0];
  return { operation, v, w, scalar, norm, defined, result, resultNorm: defined ? Math.hypot(...result) : null };
}

export function matchesVectorPrediction(trace: ReturnType<typeof vectorOperationTrace>, prediction: Vector2 | "undefined") {
  return trace.defined ? prediction !== "undefined" && trace.result.every((value, index) => Math.abs(value - prediction[index]) <= 0.005)
    : prediction === "undefined";
}

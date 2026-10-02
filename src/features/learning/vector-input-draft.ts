type Vector = [number, number];
export type Operation = "add" | "subtract" | "scale" | "normalize";
export type VectorInputDraft = { operation: Operation; v: Vector; w: Vector; scalar: number };
export const initialInputs: VectorInputDraft = { operation: "add", v: [1, 2], w: [5, -4], scalar: 2 };
export function validInputs(value: unknown): value is VectorInputDraft {
  if (!value || typeof value !== "object") return false;
  const draft = value as Partial<VectorInputDraft>;
  const vector = (v: unknown) => Array.isArray(v) && v.length === 2 && v.every(n => typeof n === "number" && Number.isFinite(n) && Math.abs(n) <= 9);
  return ["add", "subtract", "scale", "normalize"].includes(draft.operation ?? "") && vector(draft.v) && vector(draft.w)
    && typeof draft.scalar === "number" && Number.isFinite(draft.scalar) && Math.abs(draft.scalar) <= 3;
}


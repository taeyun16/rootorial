import type { NumericMatrix } from "../../features/interactive/math";
import { ArrayDiagram } from "./ArrayDiagram";

type MatrixGridProps = {
  values: NumericMatrix;
  label: string;
  rowLabels?: string[];
  columnLabels?: string[];
  selectedRow?: number | null;
  selectedColumn?: number | null;
  selectedCell?: { row: number; column: number } | null;
  formatValue?: (value: number) => string;
  tone?: "forest" | "indigo" | "terra";
  onSelectCell?: (row: number, column: number) => void;
};

export function MatrixGrid({
  values,
  label,
  rowLabels,
  columnLabels,
  selectedRow = null,
  selectedColumn = null,
  selectedCell,
  formatValue = (value) => value.toFixed(2),
  tone = "forest",
  onSelectCell,
}: MatrixGridProps) {
  return (
    <ArrayDiagram
      values={values}
      shape={[values.length, values[0]?.length ?? 0]}
      label={label}
      rowLabels={rowLabels}
      columnLabels={columnLabels}
      selectedRow={selectedRow}
      selectedColumn={selectedColumn}
      selectedCell={selectedCell}
      formatValue={(value) => typeof value === "number" ? formatValue(value) : ""}
      tone={tone}
      variant="heatmap"
      showShape={false}
      onSelectCell={onSelectCell}
    />
  );
}

import type { CSSProperties } from "react";
import { matrixExtent, type NumericMatrix } from "../../features/interactive/math";

type MatrixGridProps = {
  values: NumericMatrix;
  label: string;
  rowLabels?: string[];
  columnLabels?: string[];
  selectedRow?: number | null;
  selectedColumn?: number | null;
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
  formatValue = (value) => value.toFixed(2),
  tone = "forest",
  onSelectCell,
}: MatrixGridProps) {
  const extent = matrixExtent(values);

  return (
    <figure className={`matrix-grid matrix-grid-${tone}`}>
      <figcaption>{label}</figcaption>
      <div className="matrix-grid-scroll">
        <table>
          {columnLabels ? (
            <thead>
              <tr>
                <th aria-hidden="true" />
                {columnLabels.map((column, index) => <th scope="col" key={`${column}-${index}`}>{column}</th>)}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {values.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {rowLabels ? <th scope="row">{rowLabels[rowIndex]}</th> : null}
                {row.map((value, columnIndex) => {
                  const intensity = Math.min(1, Math.abs(value) / extent);
                  const active = rowIndex === selectedRow || columnIndex === selectedColumn;
                  const cellClassName = [
                    active ? "matrix-cell-active" : "",
                    value < 0 ? "matrix-cell-negative" : "",
                  ].filter(Boolean).join(" ") || undefined;
                  return (
                    <td key={columnIndex}>
                      <button
                        type="button"
                        className={cellClassName}
                        style={{ "--matrix-intensity": intensity } as CSSProperties}
                        aria-label={`${label}, ${rowLabels?.[rowIndex] ?? `row ${rowIndex + 1}`}, ${columnLabels?.[columnIndex] ?? `column ${columnIndex + 1}`}: ${formatValue(value)}`}
                        onClick={() => onSelectCell?.(rowIndex, columnIndex)}
                        disabled={!onSelectCell}
                      >
                        {formatValue(value)}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </figure>
  );
}

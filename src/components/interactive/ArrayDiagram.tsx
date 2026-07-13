import type { CSSProperties } from "react";

export type ArrayCell = number | string | null;
export type ArrayMatrix = ArrayCell[][];
export type ArrayTone = "forest" | "indigo" | "terra";

type ArrayDiagramProps = {
  values: ArrayMatrix;
  shape: number[];
  label: string;
  rowLabels?: string[];
  columnLabels?: string[];
  axisLabels?: string[];
  activeAxis?: number | null;
  selectedRow?: number | null;
  selectedColumn?: number | null;
  formatValue?: (value: ArrayCell) => string;
  tone?: ArrayTone;
  variant?: "plain" | "heatmap";
  showShape?: boolean;
  compact?: boolean;
  emptyCellLabel?: string;
  onSelectCell?: (row: number, column: number) => void;
};

export function formatShape(shape: number[]) {
  return `(${shape.join(", ")}${shape.length === 1 ? "," : ""})`;
}

function defaultFormatValue(value: ArrayCell) {
  if (value === null) return "·";
  if (typeof value === "number") return Number(value.toFixed(2)).toString();
  return value;
}

export function ArrayDiagram({
  values,
  shape,
  label,
  rowLabels,
  columnLabels,
  axisLabels,
  activeAxis = null,
  selectedRow = null,
  selectedColumn = null,
  formatValue = defaultFormatValue,
  tone = "forest",
  variant = "plain",
  showShape = true,
  compact = false,
  emptyCellLabel = "empty cell",
  onSelectCell,
}: ArrayDiagramProps) {
  const numericValues = values.flat().filter((value): value is number => typeof value === "number");
  const extent = numericValues.reduce((maximum, value) => Math.max(maximum, Math.abs(value)), 0) || 1;
  const className = [
    "array-diagram",
    `array-diagram-${tone}`,
    `array-diagram-${variant}`,
    variant === "heatmap" ? `matrix-grid matrix-grid-${tone}` : "",
    compact ? "array-diagram-compact" : "",
    activeAxis === 0 ? "array-diagram-axis-0" : "",
    activeAxis === 1 ? "array-diagram-axis-1" : "",
  ].filter(Boolean).join(" ");

  return (
    <figure className={className}>
      <figcaption className="array-diagram-caption">
        <span>{label}</span>
        {showShape ? <code>shape {formatShape(shape)}</code> : null}
      </figcaption>
      {axisLabels?.length ? (
        <ol className="array-diagram-axes" aria-label={`${label} axes`}>
          {axisLabels.map((axis, index) => (
            <li className={activeAxis === index ? "is-active" : undefined} key={`${axis}-${index}`}>
              <span>axis {index}</span>{axis}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="array-diagram-scroll">
        <table aria-label={`${label}, shape ${formatShape(shape)}`}>
          {columnLabels ? (
            <thead>
              <tr>
                {rowLabels ? <th aria-hidden="true" /> : null}
                {columnLabels.map((column, index) => (
                  <th className={activeAxis === 1 ? "is-active" : undefined} scope="col" key={`${column}-${index}`}>
                    {column}
                  </th>
                ))}
              </tr>
            </thead>
          ) : null}
          <tbody>
            {values.map((row, rowIndex) => (
              <tr key={rowIndex}>
                {rowLabels ? (
                  <th className={activeAxis === 0 ? "is-active" : undefined} scope="row">
                    {rowLabels[rowIndex]}
                  </th>
                ) : null}
                {row.map((value, columnIndex) => {
                  const selected = rowIndex === selectedRow || columnIndex === selectedColumn;
                  const intensity = typeof value === "number" ? Math.min(1, Math.abs(value) / extent) : 0;
                  const cellClassName = [
                    selected ? "array-cell-active matrix-cell-active" : "",
                    typeof value === "number" && value < 0 ? "array-cell-negative matrix-cell-negative" : "",
                    value === null ? "array-cell-empty" : "",
                  ].filter(Boolean).join(" ") || undefined;
                  const text = formatValue(value);
                  const ariaLabel = value === null
                    ? `${label}, ${emptyCellLabel}`
                    : `${label}, ${rowLabels?.[rowIndex] ?? `row ${rowIndex + 1}`}, ${columnLabels?.[columnIndex] ?? `column ${columnIndex + 1}`}: ${text}`;
                  const style = { "--matrix-intensity": intensity } as CSSProperties;

                  return (
                    <td key={columnIndex}>
                      {onSelectCell ? (
                        <button
                          type="button"
                          className={cellClassName}
                          style={style}
                          aria-label={ariaLabel}
                          onClick={() => onSelectCell(rowIndex, columnIndex)}
                        >
                          {text}
                        </button>
                      ) : (
                        <span className={cellClassName} style={style} aria-label={ariaLabel}>
                          {text}
                        </span>
                      )}
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

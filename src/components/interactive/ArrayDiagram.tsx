import { useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent } from "react";

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
  selectedCell?: { row: number; column: number } | null;
  targetCell?: { row: number; column: number } | null;
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

function firstAvailableCell(values: ArrayMatrix) {
  const row = values.findIndex((candidate) => candidate.length > 0);
  return { row: Math.max(0, row), column: 0 };
}

function hasCell(values: ArrayMatrix, cell: { row: number; column: number }) {
  return values[cell.row]?.[cell.column] !== undefined;
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
  selectedCell,
  targetCell = null,
  formatValue = defaultFormatValue,
  tone = "forest",
  variant = "plain",
  showShape = true,
  compact = false,
  emptyCellLabel = "empty cell",
  onSelectCell,
}: ArrayDiagramProps) {
  const figureRef = useRef<HTMLElement>(null);
  const [rovingCell, setRovingCell] = useState(() => (
    selectedCell && hasCell(values, selectedCell)
      ? selectedCell
      : firstAvailableCell(values)
  ));
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

  useEffect(() => {
    if (selectedCell && hasCell(values, selectedCell)) {
      setRovingCell(selectedCell);
    }
  }, [selectedCell?.column, selectedCell?.row, values]);

  const resolvedRovingCell = hasCell(values, rovingCell)
    ? rovingCell
    : firstAvailableCell(values);

  function focusCell(row: number, column: number) {
    setRovingCell({ row, column });
    figureRef.current
      ?.querySelector<HTMLButtonElement>(
        `[data-array-row="${row}"][data-array-column="${column}"]`,
      )
      ?.focus();
  }

  function handleCellKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    row: number,
    column: number,
  ) {
    let nextRow = row;
    let nextColumn = column;

    if (event.key === "ArrowLeft") {
      nextColumn = Math.max(0, column - 1);
    } else if (event.key === "ArrowRight") {
      nextColumn = Math.min((values[row]?.length ?? 1) - 1, column + 1);
    } else if (event.key === "ArrowUp" || event.key === "ArrowDown") {
      const direction = event.key === "ArrowUp" ? -1 : 1;
      let candidateRow = row + direction;
      while (candidateRow >= 0 && candidateRow < values.length && values[candidateRow].length === 0) {
        candidateRow += direction;
      }
      if (candidateRow >= 0 && candidateRow < values.length) {
        nextRow = candidateRow;
        nextColumn = Math.min(column, values[candidateRow].length - 1);
      }
    } else {
      return;
    }

    event.preventDefault();
    if (nextRow !== row || nextColumn !== column) {
      focusCell(nextRow, nextColumn);
    }
  }

  return (
    <figure className={className} ref={figureRef}>
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
                  const selected = selectedCell !== undefined
                    ? selectedCell?.row === rowIndex && selectedCell.column === columnIndex
                    : rowIndex === selectedRow || columnIndex === selectedColumn;
                  const intensity = typeof value === "number" ? Math.min(1, Math.abs(value) / extent) : 0;
                  const cellClassName = [
                    selected ? "array-cell-active matrix-cell-active" : "",
                    targetCell?.row === rowIndex && targetCell.column === columnIndex
                      ? "array-cell-target matrix-cell-target"
                      : "",
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
                          aria-pressed={selectedCell !== undefined ? selected : undefined}
                          data-array-row={rowIndex}
                          data-array-column={columnIndex}
                          tabIndex={
                            resolvedRovingCell.row === rowIndex && resolvedRovingCell.column === columnIndex
                              ? 0
                              : -1
                          }
                          onFocus={() => setRovingCell({ row: rowIndex, column: columnIndex })}
                          onKeyDown={(event) => handleCellKeyDown(event, rowIndex, columnIndex)}
                          onClick={() => {
                            setRovingCell({ row: rowIndex, column: columnIndex });
                            onSelectCell(rowIndex, columnIndex);
                          }}
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

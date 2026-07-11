import { useMemo, useState, type CSSProperties } from "react";
import { multiplyMatrices, type NumericMatrix } from "../features/interactive/math";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";

type SelectedCell = { row: number; column: number };

const initialLeft: NumericMatrix = [
  [1, 2, 3],
  [4, 5, 6],
];

const initialRight: NumericMatrix = [
  [7, 8],
  [9, 10],
  [11, 12],
];

function formatNumber(value: number) {
  return Number(value.toFixed(2)).toString();
}

function formatLatexNumber(value: number) {
  const formatted = formatNumber(value);
  return value < 0 ? String.raw`\left(${formatted}\right)` : formatted;
}

export function MatrixMultiplicationExplorer() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [left, setLeft] = useState<NumericMatrix>(initialLeft);
  const [right, setRight] = useState<NumericMatrix>(initialRight);
  const [selected, setSelected] = useState<SelectedCell>({ row: 0, column: 0 });
  const result = useMemo(() => multiplyMatrices(left, right), [left, right]);

  const selectedRow = left[selected.row];
  const selectedColumn = right.map((row) => row[selected.column]);
  const selectedResult = result[selected.row][selected.column];
  const symbolicLatex = String.raw`c_{${selected.row + 1}${selected.column + 1}} = A_{${selected.row + 1},:} \cdot B_{:,${selected.column + 1}}`;
  const numericLatex = String.raw`c_{${selected.row + 1}${selected.column + 1}} = ${selectedRow
    .map((value, index) => String.raw`${formatLatexNumber(value)} \cdot ${formatLatexNumber(selectedColumn[index])}`)
    .join(" + ")} = ${formatLatexNumber(selectedResult)}`;

  function updateCell(
    matrix: NumericMatrix,
    setMatrix: (next: NumericMatrix) => void,
    row: number,
    column: number,
    value: number,
  ) {
    setMatrix(matrix.map((values, rowIndex) => (
      rowIndex === row
        ? values.map((current, columnIndex) => columnIndex === column ? value : current)
        : values
    )));
  }

  function renderEditableMatrix(
    name: "A" | "B",
    matrix: NumericMatrix,
    setMatrix: (next: NumericMatrix) => void,
  ) {
    return (
      <fieldset className={`matrix-workbench-matrix matrix-workbench-${name.toLowerCase()}`}>
        <legend>
          <MathFormula
            latex={String.raw`${name} \in \mathbb{R}^{${matrix.length} \times ${matrix[0].length}}`}
            ariaLabel={isKo
              ? `${name}는 ${matrix.length}행 ${matrix[0].length}열 실수 행렬`
              : `${name} is a ${matrix.length} by ${matrix[0].length} real matrix`}
          />
        </legend>
        <div
          className="matrix-workbench-grid"
          style={{ "--matrix-columns": matrix[0].length } as CSSProperties}
        >
          {matrix.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
            const active = name === "A"
              ? rowIndex === selected.row
              : columnIndex === selected.column;
            return (
              <label
                className={active ? "matrix-workbench-source-active" : undefined}
                key={`${name}-${rowIndex}-${columnIndex}`}
              >
                <span className="sr-only">
                  {isKo
                    ? `${name} 행렬 ${rowIndex + 1}행 ${columnIndex + 1}열`
                    : `Matrix ${name}, row ${rowIndex + 1}, column ${columnIndex + 1}`}
                </span>
                <input
                  type="number"
                  min="-9"
                  max="9"
                  step="1"
                  value={value}
                  onChange={(event) => updateCell(
                    matrix,
                    setMatrix,
                    rowIndex,
                    columnIndex,
                    Number(event.target.value),
                  )}
                />
              </label>
            );
          }))}
        </div>
      </fieldset>
    );
  }

  return (
    <section className="matrix-workbench" aria-labelledby="matrix-workbench-title">
      <header className="matrix-workbench-header">
        <div>
          <p className="tensor-shape-kicker">MATRIX PRODUCT WORKBENCH</p>
          <h3 id="matrix-workbench-title">
            {isKo ? "결과의 한 칸을 선택해 계산을 추적하세요" : "Select one result cell and trace its calculation"}
          </h3>
        </div>
        <MathFormula
          latex={String.raw`A_{m \times n} B_{n \times p} = C_{m \times p}`}
          ariaLabel={isKo ? "m 곱하기 n 행렬과 n 곱하기 p 행렬의 곱은 m 곱하기 p 행렬" : "An m by n matrix times an n by p matrix produces an m by p matrix"}
        />
      </header>

      <div className="matrix-workbench-canvas">
        {renderEditableMatrix("A", left, setLeft)}
        <span className="matrix-workbench-operator" aria-hidden="true">×</span>
        {renderEditableMatrix("B", right, setRight)}
        <span className="matrix-workbench-operator matrix-workbench-equals" aria-hidden="true">=</span>

        <fieldset className="matrix-workbench-matrix matrix-workbench-result">
          <legend>
            <MathFormula
              latex={String.raw`C = AB \in \mathbb{R}^{2 \times 2}`}
              ariaLabel={isKo ? "C는 A와 B의 곱인 2행 2열 실수 행렬" : "C equals A times B and is a 2 by 2 real matrix"}
            />
          </legend>
          <div className="matrix-workbench-grid" style={{ "--matrix-columns": 2 } as CSSProperties}>
            {result.flatMap((row, rowIndex) => row.map((value, columnIndex) => {
              const active = rowIndex === selected.row && columnIndex === selected.column;
              return (
                <button
                  type="button"
                  className={active ? "matrix-workbench-result-active" : undefined}
                  aria-pressed={active}
                  aria-label={isKo
                    ? `결과 C의 ${rowIndex + 1}행 ${columnIndex + 1}열, 값 ${formatNumber(value)}`
                    : `Result C, row ${rowIndex + 1}, column ${columnIndex + 1}, value ${formatNumber(value)}`}
                  key={`result-${rowIndex}-${columnIndex}`}
                  onClick={() => setSelected({ row: rowIndex, column: columnIndex })}
                >
                  {formatNumber(value)}
                </button>
              );
            }))}
          </div>
        </fieldset>
      </div>

      <div className="matrix-workbench-trace" role="status" aria-live="polite">
        <div className="matrix-workbench-trace-heading">
          <span>{isKo ? "선택한 원소" : "SELECTED ENTRY"}</span>
          <small>{isKo ? "A의 행 · B의 열" : "A row · B column"}</small>
        </div>
        <div className="matrix-workbench-formulas">
          <MathFormula
            latex={symbolicLatex}
            ariaLabel={isKo
              ? `c ${selected.row + 1}${selected.column + 1}은 A의 ${selected.row + 1}행과 B의 ${selected.column + 1}열의 내적`
              : `c ${selected.row + 1}${selected.column + 1} is the dot product of row ${selected.row + 1} of A and column ${selected.column + 1} of B`}
            className="matrix-workbench-symbolic-formula"
          />
          <MathFormula
            latex={numericLatex}
            ariaLabel={isKo ? `선택한 원소의 계산 결과는 ${formatNumber(selectedResult)}` : `The selected entry evaluates to ${formatNumber(selectedResult)}`}
            className="matrix-workbench-numeric-formula"
          />
        </div>
      </div>

      <div className="matrix-workbench-rule">
        <MathFormula
          latex={String.raw`c_{ij} = \sum_{k=1}^{n} a_{ik}b_{kj}`}
          ariaLabel={isKo ? "c i j는 k가 1부터 n까지 a i k와 b k j의 곱을 더한 값" : "c i j is the sum from k equals 1 to n of a i k times b k j"}
        />
        <p>
          {isKo
            ? "안쪽 크기 n은 내적할 원소의 개수이고, 바깥 크기 m × p는 결과 행렬의 shape가 됩니다."
            : "The inner size n is the number of values in each dot product; the outer size m × p becomes the result shape."}
        </p>
      </div>
    </section>
  );
}

import { useMemo, useState } from "react";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";
import { UnitVectorPlot } from "./UnitVectorPlot";

type Vector = [number, number];
type Operation = "add" | "subtract" | "scale" | "normalize";

const operations: Array<{ id: Operation; label: string; latex: string }> = [
  { id: "add", label: "v plus w", latex: String.raw`\mathbf{v} + \mathbf{w}` },
  { id: "subtract", label: "v minus w", latex: String.raw`\mathbf{v} - \mathbf{w}` },
  { id: "scale", label: "lambda times v", latex: String.raw`\lambda\mathbf{v}` },
  { id: "normalize", label: "normalize v to a unit vector", latex: String.raw`\widehat{\mathbf{v}}` },
];

function formatNumber(value: number) {
  return Math.abs(value) < 0.0005 ? "0" : Number(value.toFixed(3)).toString();
}

function formatVectorLatex(vector: Vector) {
  return String.raw`\left[${vector.map(formatNumber).join(",")}\right]`;
}

export function VectorBasicsLab() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [operation, setOperation] = useState<Operation>("add");
  const [v, setV] = useState<Vector>([1, 2]);
  const [w, setW] = useState<Vector>([5, -4]);
  const [scalar, setScalar] = useState(2);
  const [revealed, setRevealed] = useState(false);

  const calculation = useMemo(() => {
    const norm = Math.hypot(...v);
    const result: Vector =
      operation === "add"
        ? [v[0] + w[0], v[1] + w[1]]
        : operation === "subtract"
          ? [v[0] - w[0], v[1] - w[1]]
          : operation === "scale"
            ? [scalar * v[0], scalar * v[1]]
            : norm === 0
              ? [0, 0]
              : [v[0] / norm, v[1] / norm];

    const resultNorm = Math.hypot(...result);
    const expressionLatex =
      operation === "add"
        ? `${formatVectorLatex(v)} + ${formatVectorLatex(w)}`
        : operation === "subtract"
          ? `${formatVectorLatex(v)} - ${formatVectorLatex(w)}`
          : operation === "scale"
            ? `${formatNumber(scalar)} \\cdot ${formatVectorLatex(v)}`
            : norm === 0
              ? String.raw`\frac{${formatVectorLatex(v)}}{0}`
              : String.raw`\frac{${formatVectorLatex(v)}}{${formatNumber(norm)}}`;

    let insight = isKo ? "각 좌표끼리 더하면 두 이동을 연달아 한 결과가 됩니다." : "Adding matching coordinates combines the two movements.";
    if (operation === "subtract") {
      insight = isKo ? "v − w는 w의 머리에서 v의 머리로 향하는 차이 벡터입니다." : "v − w is the difference vector pointing from the tip of w to the tip of v.";
    } else if (operation === "scale") {
      insight =
        scalar < 0
          ? (isKo ? "음수 스칼라는 크기를 조절하고 방향을 뒤집습니다." : "A negative scalar changes the magnitude and reverses the direction.")
          : scalar === 0
            ? (isKo ? "0을 곱하면 방향을 잃고 영벡터가 됩니다." : "Multiplying by zero removes the direction and produces the zero vector.")
            : (isKo ? "양수 스칼라는 방향을 유지한 채 크기만 바꿉니다." : "A positive scalar changes only the magnitude and preserves the direction.");
    } else if (operation === "normalize") {
      insight =
        norm === 0
          ? (isKo ? "영벡터는 길이가 0이라 나눌 수 없고, 단위벡터를 만들 수 없습니다." : "The zero vector has length zero, so it cannot be divided to make a unit vector.")
          : (isKo ? "정규화 뒤에는 방향은 같고 길이만 정확히 1이 됩니다." : "After normalization, the direction stays the same and the length becomes exactly 1.");
    }

    return { result, resultNorm, expressionLatex, insight, norm };
  }, [isKo, operation, scalar, v, w]);

  function coordinateInput(
    name: "v" | "w",
    index: 0 | 1,
    value: number,
    setVector: (vector: Vector) => void,
    vector: Vector,
  ) {
    return (
      <label className="vector-basics-coordinate">
        <MathFormula latex={`${name}_${index + 1}`} />
        <input
          type="number"
          min="-9"
          max="9"
          step="1"
          value={value}
          onChange={(event) => {
            const next = Number(event.target.value);
            setRevealed(false);
            setVector(index === 0 ? [next, vector[1]] : [vector[0], next]);
          }}
        />
      </label>
    );
  }

  return (
    <section className="vector-basics-lab" aria-labelledby="vector-basics-title">
      <div className="vector-basics-header">
        <div>
          <p className="tensor-shape-kicker">VECTOR WORKBENCH</p>
          <h3 id="vector-basics-title">{isKo ? "연산을 바꾸고 결과를 예측하세요" : "Change the operation and predict the result"}</h3>
        </div>
        <span className="vector-basics-norm">
          {revealed ? <>
            {isKo ? "결과 크기" : "Result magnitude"}{" "}
            <MathFormula latex={String.raw`\lVert \mathbf{r} \rVert_2 = ${formatNumber(calculation.resultNorm)}`} />
          </> : (isKo ? "결과를 먼저 예측하세요" : "Predict before revealing")}
        </span>
      </div>

      <div className="vector-basics-tabs" role="group" aria-label={isKo ? "벡터 연산 선택" : "Choose a vector operation"}>
        {operations.map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            aria-pressed={operation === candidate.id}
            aria-label={candidate.label}
            className={operation === candidate.id ? "vector-basics-tab-active" : ""}
            onClick={() => {
              setOperation(candidate.id);
              setRevealed(false);
            }}
          >
            <MathFormula latex={candidate.latex} />
          </button>
        ))}
      </div>

      <div className="vector-basics-body">
        <div className="vector-basics-inputs">
          <fieldset>
            <legend>{isKo ? "벡터 v" : "Vector v"}</legend>
            <div>
              {coordinateInput("v", 0, v[0], setV, v)}
              {coordinateInput("v", 1, v[1], setV, v)}
            </div>
          </fieldset>
          {operation === "add" || operation === "subtract" ? (
            <fieldset>
              <legend>{isKo ? "벡터 w" : "Vector w"}</legend>
              <div>
                {coordinateInput("w", 0, w[0], setW, w)}
                {coordinateInput("w", 1, w[1], setW, w)}
              </div>
            </fieldset>
          ) : null}
          {operation === "scale" ? (
            <label className="vector-basics-scalar">
              <span>{isKo ? "스칼라" : "Scalar"} <MathFormula latex={String.raw`\lambda`} /></span>
              <input
                type="range"
                min="-3"
                max="3"
                step="0.5"
                value={scalar}
                onChange={(event) => {
                  setScalar(Number(event.target.value));
                  setRevealed(false);
                }}
              />
              <output>{formatNumber(scalar)}</output>
            </label>
          ) : null}
        </div>

        <div className="vector-basics-result" aria-live="polite">
          <span className="vector-basics-result-label">{isKo ? "계산" : "CALCULATION"}</span>
          <MathFormula latex={calculation.expressionLatex} display className="vector-basics-expression" />
          {revealed ? <>
            {operation === "normalize" && calculation.norm === 0
              ? <strong>{isKo ? "정의되지 않음" : "Undefined"}</strong>
              : <MathFormula latex={`= ${formatVectorLatex(calculation.result)}`} className="vector-basics-answer" />}
            <p>{calculation.insight}</p>
            {operation === "normalize" && calculation.norm !== 0 ? (
              <UnitVectorPlot vector={calculation.result} sourceVector={v} locale={locale} />
            ) : null}
          </> : (
            <div className="vector-basics-reveal">
              <p>{isKo ? "각 좌표의 결과와 방향 변화를 머릿속이나 종이에 먼저 적어 보세요." : "Write down the resulting coordinates and direction change before revealing the answer."}</p>
              <button type="button" onClick={() => setRevealed(true)}>
                {isKo ? "예측 완료 · 결과 보기" : "Prediction ready · reveal result"}
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="vector-missions" aria-label={isKo ? "추천 실험" : "Suggested experiments"}>
        <strong>{isKo ? "추천 실험" : "Suggested experiments"}</strong>
        <ol>
          <li><button type="button" onClick={() => { setOperation("add"); setV([1, 2]); setW([5, -4]); setRevealed(false); }}><MathFormula latex={String.raw`\mathbf{v} + \mathbf{w}`} />{isKo ? "를 먼저 눈으로 예측한 뒤 확인" : " — predict visually, then check"}</button></li>
          <li><button type="button" onClick={() => { setOperation("scale"); setV([3, 2]); setScalar(-1); setRevealed(false); }}><MathFormula latex={String.raw`\lambda = -1`} />{isKo ? "로 방향이 뒤집히는지 확인" : " — watch the direction reverse"}</button></li>
          <li><button type="button" onClick={() => { setOperation("normalize"); setV([3, 4]); setRevealed(false); }}>{isKo ? "[3, 4]를 길이 1로 정규화" : "Normalize [3, 4] to length 1"}</button></li>
          <li><button type="button" onClick={() => { setOperation("normalize"); setV([0, 0]); setRevealed(false); }}>{isKo ? "영벡터를 정규화할 수 없는 이유 확인" : "See why the zero vector cannot be normalized"}</button></li>
        </ol>
      </div>
    </section>
  );
}

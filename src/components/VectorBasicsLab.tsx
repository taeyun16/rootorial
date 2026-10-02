import { useEffect, useMemo, useRef, useState } from "react";
import { AttemptComparison } from "./AttemptComparison";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";
import { isRoundedDisplay } from "../features/learning/rounded-display";
import { UnitVectorPlot } from "./UnitVectorPlot";
import { VectorOperationPlot } from "./VectorOperationPlot";
import { vectorOperationTrace, vectorOperationContract, matchesVectorPrediction, type Vector2 } from "../features/learning/vector-operation";
import { useExperimentDraft } from "../features/progress/useExperimentDraft";

function CoordinateField({ name, index, value, onValue, onValidity }: {
  name: "v" | "w"; index: 0 | 1; value: number;
  onValue: (value: number) => void; onValidity: (valid: boolean) => void;
}) {
  // Keep an empty/negative-prefix edit separate from the last usable number.
  const [text, setText] = useState(String(value));
  useEffect(() => { setText(String(value)); onValidity(true); }, [value]);
  const valid = text.trim() !== "" && Number.isFinite(Number(text)) && Math.abs(Number(text)) <= 9;
  return <label className="vector-basics-coordinate">
    <MathFormula latex={name + "_" + (index + 1)} />
    <input type="number" min="-9" max="9" step="1" value={text} aria-invalid={!valid}
      onChange={event => {
        const raw = event.target.value;
        setText(raw);
        const valid = raw.trim() !== "" && Number.isFinite(Number(raw)) && Math.abs(Number(raw)) <= 9;
        onValidity(valid);
        if (valid) onValue(Number(raw));
      }} />
  </label>;
}

import { initialInputs, validInputs, type VectorInputDraft, type Operation } from "../features/learning/vector-input-draft";
type Vector = [number, number];

const operations: Array<{ id: Operation; label: string; latex: string }> = [
  { id: "add", label: "v plus w", latex: String.raw`\mathbf{v} + \mathbf{w}` },
  { id: "subtract", label: "v minus w", latex: String.raw`\mathbf{v} - \mathbf{w}` },
  { id: "scale", label: "lambda times v", latex: String.raw`\lambda\mathbf{v}` },
  { id: "normalize", label: "normalize v to a unit vector", latex: String.raw`\widehat{\mathbf{v}}` },
];

function formatNumber(value: number) {
  return Math.abs(value) < 0.0005 ? "0" : Number(value.toFixed(3)).toString();
}

function formatVectorLatex(vector: Vector2) {
  return String.raw`\left[${vector.map(formatNumber).join(",")}\right]`;
}

export function VectorBasicsLab() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const draft = useExperimentDraft("vector-basic-inputs:v1", initialInputs, validInputs);
  const { operation, v, w, scalar } = draft.value;
  const setOperation = (operation: Operation) => draft.setValue(previous => ({ ...previous, operation }));
  const setV = (v: Vector) => draft.setValue(previous => ({ ...previous, v }));
  const setW = (w: Vector) => draft.setValue(previous => ({ ...previous, w }));
  const setScalar = (scalar: number) => draft.setValue(previous => ({ ...previous, scalar }));
  const [revealed, setRevealed] = useState(false);
  const predictionInput = useRef<HTMLInputElement>(null);
  const [coordinateValidity, setCoordinateValidity] = useState<Record<string, boolean>>({});
  const [coordinateReset, setCoordinateReset] = useState(0);
  const coordinatesValid = ["v0", "v1", ...(["add", "subtract"].includes(operation) ? ["w0", "w1"] : [])].every(key => coordinateValidity[key] !== false);
  const [prediction, setPrediction] = useState<[string, string]>(["", ""]);
  const [predictUndefined, setPredictUndefined] = useState(false);
  const [lastComparison, setLastComparison] = useState<{ predicted: string; actual: string; matches: boolean; inputs: VectorInputDraft } | null>(null);
  const [previousComparison, setPreviousComparison] = useState<typeof lastComparison>(null);
  const predictionReady = coordinatesValid && (predictUndefined || prediction.every(value => value.trim() !== "" && Number.isFinite(Number(value))));
  function invalidate() {
    setRevealed(false);
    setPrediction(["", ""]);
    setPredictUndefined(false);
  }

  const calculation = useMemo(() => {
    const trace = vectorOperationTrace(operation, v, w, scalar);
    const { norm, result, resultNorm } = trace;
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

    return { ...trace, result, resultNorm, expressionLatex, insight, norm };
  }, [isKo, operation, scalar, v, w]);

  function coordinateInput(
    name: "v" | "w",
    index: 0 | 1,
    value: number,
    setVector: (vector: Vector) => void,
    vector: Vector,
  ) {
    return <CoordinateField key={name + index + ":" + coordinateReset} name={name} index={index} value={value}
      onValidity={valid => {
        setCoordinateValidity(previous => previous[name + index] === valid ? previous : { ...previous, [name + index]: valid });
        if (!valid) invalidate();
      }}
      onValue={next => {
        invalidate();
        setVector(index === 0 ? [next, vector[1]] : [vector[0], next]);
      }} />;
  }

  return (
    <section className="vector-basics-lab" aria-labelledby="vector-basics-title" data-formula-id={vectorOperationContract.formulaId} data-evidence={revealed ? "current" : lastComparison ? "stale" : "unexecuted"}>
      <div className="vector-basics-header">
        <div>
          <p className="tensor-shape-kicker">VECTOR WORKBENCH</p>
          <h3 id="vector-basics-title">{isKo ? "연산을 바꾸고 결과를 예측하세요" : "Change the operation and predict the result"}</h3>
        </div>
        <span className="vector-basics-norm">
          {revealed ? <>
            {isKo ? "결과 크기" : "Result magnitude"}{" "}
            <MathFormula latex={String.raw`\lVert \mathbf{r} \rVert_2 = ${calculation.resultNorm === null ? String.raw`\text{undefined}` : formatNumber(calculation.resultNorm)}`} />
          </> : (isKo ? "결과를 먼저 예측하세요" : "Predict before revealing")}
        </span>
      </div>

      <div className="vector-draft-status" role="status">
        <span>{!draft.storageAvailable
          ? (isKo ? "브라우저에 입력을 저장할 수 없습니다. 현재 페이지에서만 유지됩니다." : "Inputs cannot be saved in this browser. They last only on this page.")
          : draft.restored
            ? (isKo ? "지난 실험 입력을 복원했습니다. 예측과 결과는 다시 확인하세요." : "Previous experiment inputs restored. Make a fresh prediction and run again.")
            : (isKo ? "실험 입력만 이 브라우저에 저장합니다. 입력을 복원해도 실습 완료로 인정되지는 않습니다." : "Only experiment inputs are saved here. Restoring inputs does not count as completing the exercise.")}</span>
        <button type="button" onClick={() => { draft.clear(); invalidate(); setLastComparison(null); setPreviousComparison(null); setCoordinateValidity({}); setCoordinateReset(value => value + 1); }}>{isKo ? "실험 입력 초기화" : "Reset experiment inputs"}</button>
      </div>

      <div className="vector-basics-tabs" role="group" aria-label={isKo ? "벡터 연산 선택" : "Choose a vector operation"}>
        {operations.map((candidate) => (
          <button
            type="button"
            key={candidate.id}
            aria-pressed={operation === candidate.id}
            aria-label={isKo ? ({ add: "벡터 v와 w 더하기", subtract: "벡터 v에서 w 빼기", scale: "벡터 v에 스칼라 곱하기", normalize: "벡터 v를 단위벡터로 정규화" }[candidate.id]) : candidate.label}
            className={operation === candidate.id ? "vector-basics-tab-active" : ""}
            onClick={() => {
              setOperation(candidate.id);
              invalidate();
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
                  invalidate();
                }}
              />
              <output>{formatNumber(scalar)}</output>
            </label>
          ) : null}
        </div>

        <div className="vector-basics-result" aria-live="polite">
          <span className="vector-basics-result-label">{isKo ? "계산" : "CALCULATION"}</span>
          {!coordinatesValid && <p role="status">{isKo ? "좌표 입력을 완성하세요. −9부터 9까지의 숫자가 필요합니다. 식은 마지막 유효 입력을 표시하며 새 결과는 실행할 수 없습니다." : "Finish the coordinate input with a number from −9 to 9. The expression shows the last valid input; a new result cannot run yet."}</p>}
          <MathFormula latex={calculation.expressionLatex} display className="vector-basics-expression" />
          {revealed ? <>
            {operation === "normalize" && calculation.norm === 0
              ? <strong>{isKo ? "정의되지 않음" : "Undefined"}</strong>
              : <MathFormula latex={`${operation === "normalize" && calculation.result.some(value => isRoundedDisplay(value)) ? String.raw`\approx` : "="} ${formatVectorLatex(calculation.result)}`} className="vector-basics-answer" />}
            <p>{calculation.insight}</p>
            {lastComparison && <p className="vector-prediction-feedback">{isKo ? "실행 전 예측" : "Prediction before this run"}: {lastComparison.predicted} → {isKo ? "실제" : "Actual"}: {lastComparison.actual}. {lastComparison.matches ? (isKo ? "예측과 일치합니다." : "Your prediction matches.") : (isKo ? "다른 성분을 표와 그림에서 비교해 보세요." : "Compare the differing coordinates in the table and diagram.")}</p>}
            <button type="button" className="button button-secondary" onClick={() => {
              invalidate();
              requestAnimationFrame(() => predictionInput.current?.focus());
            }}>{isKo ? "같은 입력으로 다시 예측" : "Predict again with the same inputs"}</button>
            {calculation.defined && operation !== "normalize" && <VectorOperationPlot trace={calculation} isKo={isKo} />}
            {operation === "normalize" && calculation.norm !== 0 ? (
              <UnitVectorPlot vector={calculation.result} sourceVector={v} locale={locale} />
            ) : null}
          </> : (
            <div className="vector-basics-reveal">
              <p>{isKo ? "각 좌표의 결과와 방향 변화를 머릿속이나 종이에 먼저 적어 보세요." : "Write down the resulting coordinates and direction change before revealing the answer."}</p>
              {lastComparison && <p className="vector-prediction-feedback">{isKo ? "현재 예측은 미실행입니다. 지난 결과" : "Current prediction has not run. Previous result"}: {lastComparison.actual}. {isKo ? "현재 입력을 다시 예측하세요." : "Predict the current inputs again."}</p>}
              <div className="vector-prediction-fields">
                {([0, 1] as const).map(index => <label key={index}>{isKo ? "예측" : "Predicted"} {index === 0 ? "x" : "y"}<input ref={index === 0 ? predictionInput : undefined} type="number" step="any" disabled={predictUndefined} value={prediction[index]} onChange={event => setPrediction(index === 0 ? [event.target.value, prediction[1]] : [prediction[0], event.target.value])} /></label>)}
              </div>
              {operation === "normalize" && <label><input type="checkbox" checked={predictUndefined} onChange={event => setPredictUndefined(event.target.checked)} />{isKo ? "정의되지 않음으로 예측" : "Predict undefined"}</label>}
              <button type="button" disabled={!predictionReady} onClick={() => {
                const guessed: Vector2 | "undefined" = predictUndefined ? "undefined" : [Number(prediction[0]), Number(prediction[1])];
                setPreviousComparison(lastComparison);
                setLastComparison({ inputs: { operation, v: [...v], w: [...w], scalar }, predicted: guessed === "undefined" ? (isKo ? "정의되지 않음" : "undefined") : '[' + guessed.join(', ') + ']', actual: calculation.defined ? '[' + calculation.result.map(formatNumber).join(', ') + ']' : (isKo ? "정의되지 않음" : "undefined"), matches: matchesVectorPrediction(calculation, guessed) });
                setRevealed(true);
              }}>
                {isKo ? "예측 완료 · 결과 보기" : "Prediction ready · reveal result"}
              </button>
            </div>
          )}
        </div>
      </div>

      <AttemptComparison executed={revealed} previous={(revealed ? previousComparison : lastComparison) && (() => {
        const old = (revealed ? previousComparison : lastComparison)!;
        return { operation: old.inputs.operation, v: '[' + old.inputs.v.join(', ') + ']', w: '[' + old.inputs.w.join(', ') + ']', 'λ': String(old.inputs.scalar), [isKo ? "예측" : "Prediction"]: old.predicted, [isKo ? "실제" : "Actual"]: old.actual };
      })()} current={{ operation, v: '[' + v.join(', ') + ']', w: '[' + w.join(', ') + ']', 'λ': String(scalar), [isKo ? "예측" : "Prediction"]: revealed ? lastComparison!.predicted : predictUndefined ? (isKo ? "정의되지 않음" : "Undefined") : '[' + prediction.map(value => value || '—').join(', ') + ']', [isKo ? "실제" : "Actual"]: revealed ? lastComparison!.actual : (isKo ? "미실행" : "Not run") }} />

      <div className="vector-missions" aria-label={isKo ? "추천 실험" : "Suggested experiments"}>
        <strong>{isKo ? "추천 실험" : "Suggested experiments"}</strong>
        <ol>
          <li><button type="button" onClick={() => { setOperation("add"); setV([1, 2]); setW([5, -4]); invalidate(); }}><MathFormula latex={String.raw`\mathbf{v} + \mathbf{w}`} />{isKo ? "를 먼저 눈으로 예측한 뒤 확인" : " — predict visually, then check"}</button></li>
          <li><button type="button" onClick={() => { setOperation("scale"); setV([3, 2]); setScalar(-1); invalidate(); }}><MathFormula latex={String.raw`\lambda = -1`} />{isKo ? "로 방향이 뒤집히는지 확인" : " — watch the direction reverse"}</button></li>
          <li><button type="button" onClick={() => { setOperation("normalize"); setV([3, 4]); invalidate(); }}>{isKo ? "[3, 4]를 길이 1로 정규화" : "Normalize [3, 4] to length 1"}</button></li>
          <li><button type="button" onClick={() => { setOperation("normalize"); setV([0, 0]); invalidate(); }}>{isKo ? "영벡터를 정규화할 수 없는 이유 확인" : "See why the zero vector cannot be normalized"}</button></li>
        </ol>
      </div>
    </section>
  );
}

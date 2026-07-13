import { useId, useMemo, useState } from "react";
import {
  concatenateVectors,
  shapeOfNumericArray,
  stackVectors,
  sumMatrixAxis,
  type MatrixAxis,
  type NumericArray,
} from "../features/interactive/math";
import { useLocale } from "../features/localization/localization";
import { formatShape } from "./interactive/ArrayDiagram";
import { InteractiveLab } from "./interactive/InteractiveLab";
import { StepExplorer, type ExplorerStage } from "./interactive/StepExplorer";
import { TensorDiagram } from "./interactive/TensorDiagram";

type Operation = "stack" | "concatenate" | "sum";

const vectorA = [1, 2, 3];
const vectorB = [-1, -2, -3];
const matrix = [vectorA, vectorB];

const stagesKo: Array<ExplorerStage<Operation>> = [
  { id: "stack", index: "01", label: "새 축 만들기" },
  { id: "concatenate", index: "02", label: "기존 축 늘리기" },
  { id: "sum", index: "03", label: "축 없애기" },
];

const stagesEn: Array<ExplorerStage<Operation>> = [
  { id: "stack", index: "01", label: "Create an axis" },
  { id: "concatenate", index: "02", label: "Extend an axis" },
  { id: "sum", index: "03", label: "Remove an axis" },
];

const optionSets: Record<`${Operation}-${MatrixAxis}`, string[]> = {
  "stack-0": ["(2, 3)", "(3, 2)", "(6,)"],
  "stack-1": ["(3, 2)", "(2, 3)", "(6,)"],
  "concatenate-0": ["(6,)", "(2, 3)", "error"],
  "concatenate-1": ["error", "(6,)", "(3, 2)"],
  "sum-0": ["(3,)", "(2,)", "(2, 3)"],
  "sum-1": ["(2,)", "(3,)", "(2, 3)"],
};

export function AxisBuilderLab() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [operation, setOperation] = useState<Operation>("stack");
  const [axis, setAxis] = useState<MatrixAxis>(0);
  const [answer, setAnswer] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const panelId = useId();
  const predictionName = useId();

  const result = useMemo(() => {
    try {
      const values: NumericArray = operation === "stack"
        ? stackVectors([vectorA, vectorB], axis)
        : operation === "concatenate"
          ? concatenateVectors([vectorA, vectorB], axis)
          : sumMatrixAxis(matrix, axis);
      const shape = shapeOfNumericArray(values);
      return { values, shape, answer: formatShape(shape), error: null };
    } catch (error) {
      return { values: null, shape: null, answer: "error", error: error instanceof Error ? error.message : "Axis error" };
    }
  }, [axis, operation]);
  const correct = checked && answer === result.answer;
  const stages = isKo ? stagesKo : stagesEn;
  const operationCopy = operation === "stack"
    ? (isKo ? "stack은 같은 shape의 배열을 놓을 새 축을 하나 만듭니다." : "Stack creates one new axis for arrays with the same shape.")
    : operation === "concatenate"
      ? (isKo ? "concatenate는 새 축을 만들지 않고 이미 존재하는 축을 길게 잇습니다." : "Concatenate extends an existing axis without creating a new one.")
      : (isKo ? "sum은 선택한 축을 따라 값을 모으고 그 축을 결과에서 없앱니다." : "Sum combines values along the selected axis and removes that axis from the result.");
  const code = operation === "sum"
    ? `matrix.sum(axis=${axis})`
    : `np.${operation}([a, b], axis=${axis})`;

  function resetPrediction() {
    setAnswer(null);
    setChecked(false);
  }

  function changeOperation(next: Operation) {
    setOperation(next);
    resetPrediction();
  }

  function changeAxis(next: MatrixAxis) {
    setAxis(next);
    resetPrediction();
  }

  return (
    <InteractiveLab
      kicker="AXIS BUILDER"
      title={isKo ? "축을 만들고, 늘리고, 없애 보세요" : "Create, extend, and remove axes"}
      description={isKo ? "연산과 axis를 바꾼 뒤 결과 shape를 먼저 예측합니다." : "Change the operation and axis, then predict the result shape first."}
      actions={(
        <div className="axis-selector" role="group" aria-label={isKo ? "axis 선택" : "Choose an axis"}>
          {[0, 1].map((candidate) => (
            <button type="button" aria-pressed={axis === candidate} onClick={() => changeAxis(candidate as MatrixAxis)} key={candidate}>
              axis={candidate}
            </button>
          ))}
        </div>
      )}
      className="axis-builder-lab"
    >
      <StepExplorer
        stages={stages}
        activeStage={operation}
        onStageChange={changeOperation}
        ariaLabel={isKo ? "NumPy 축 연산" : "NumPy axis operations"}
        panelId={panelId}
      />

      <div className="axis-builder-workspace" id={panelId}>
        <div className="axis-builder-input">
          {operation === "sum" ? (
            <TensorDiagram
              values={matrix}
              shape={[2, 3]}
              label="matrix"
              axisLabels={isKo ? ["벡터", "원소"] : ["vectors", "values"]}
              rowLabels={["a", "b"]}
              columnLabels={["d0", "d1", "d2"]}
              activeAxis={axis}
            />
          ) : (
            <div className="axis-builder-vectors">
              <TensorDiagram values={vectorA} shape={[3]} label="a" axisLabels={[isKo ? "원소" : "values"]} columnLabels={["d0", "d1", "d2"]} compact />
              <TensorDiagram values={vectorB} shape={[3]} label="b" axisLabels={[isKo ? "원소" : "values"]} columnLabels={["d0", "d1", "d2"]} tone="terra" compact />
            </div>
          )}
          <div className="axis-builder-code">
            <span>{isKo ? "선택한 연산" : "SELECTED OPERATION"}</span>
            <code>{code}</code>
            <p>{operationCopy}</p>
          </div>
        </div>

        <div className="axis-builder-result" aria-live="polite">
          <span>{isKo ? "결과" : "RESULT"}</span>
          {checked && result.values && result.shape ? (
            <TensorDiagram
              values={result.values}
              shape={result.shape}
              label={isKo ? "연산 결과" : "Operation result"}
              axisLabels={result.shape.length === 2 ? (isKo ? ["행", "열"] : ["rows", "columns"]) : [isKo ? "남은 축" : "remaining axis"]}
              tone="indigo"
              compact
            />
          ) : checked && result.error ? (
            <div className="axis-builder-error">
              <strong>AxisError</strong>
              <p>{isKo ? "rank-1 배열에는 axis 1이 없습니다." : "A rank-1 array does not have axis 1."}</p>
            </div>
          ) : (
            <div className="axis-builder-hidden-result">
              <strong>?</strong>
              <p>{isKo ? "shape를 먼저 선택하세요." : "Choose the shape first."}</p>
            </div>
          )}
        </div>
      </div>

      <fieldset className="axis-builder-prediction">
        <legend>{isKo ? `${code}의 결과 shape는?` : `What is the result shape of ${code}?`}</legend>
        <div>
          {optionSets[`${operation}-${axis}`].map((option) => (
            <label key={option}>
              <input type="radio" name={predictionName} checked={answer === option} onChange={() => { setAnswer(option); setChecked(false); }} />
              <code>{option === "error" ? (isKo ? "오류" : "Error") : option}</code>
            </label>
          ))}
        </div>
        <button type="button" disabled={!answer} onClick={() => setChecked(true)}>{isKo ? "예측 확인" : "Check prediction"}</button>
        <p className={checked ? correct ? "is-correct" : "is-incorrect" : undefined} role="status">
          {checked
            ? correct
              ? (isKo ? `정확해요. 결과는 ${result.answer === "error" ? "오류" : result.answer}입니다.` : `Correct. The result is ${result.answer}.`)
              : (isKo ? "선택한 axis가 새로 생기는지, 늘어나는지, 사라지는지 다시 추적해 보세요." : "Trace whether the selected axis is created, extended, or removed.")
            : (isKo ? "숫자를 계산하기 전에 shape의 어느 위치가 바뀌는지 확인하세요." : "Before calculating values, identify which position in the shape changes.")}
        </p>
      </fieldset>
    </InteractiveLab>
  );
}

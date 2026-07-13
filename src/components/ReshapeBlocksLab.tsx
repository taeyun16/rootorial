import { useId, useMemo, useState } from "react";
import { reshapeVector, shapeOfNumericArray } from "../features/interactive/math";
import { useLocale } from "../features/localization/localization";
import { ArrayDiagram, formatShape, type ArrayCell } from "./interactive/ArrayDiagram";
import { InteractiveLab } from "./interactive/InteractiveLab";
import { StepExplorer, type ExplorerStage } from "./interactive/StepExplorer";
import { TensorDiagram } from "./interactive/TensorDiagram";

type TargetId = "flat" | "row" | "column" | "infer" | "invalid";
type Prediction = "possible" | "impossible";

type ReshapeTarget = {
  id: TargetId;
  index: string;
  label: string;
  requestedShape: number[];
  previewShape: number[];
  codeArgument: string;
  explanationKo: string;
  explanationEn: string;
};

const values = [11, 22, 33, 44, 55, 66];

const targets: ReshapeTarget[] = [
  { id: "flat", index: "01", label: "(6,)", requestedShape: [6], previewShape: [6], codeArgument: "6", explanationKo: "축이 하나인 rank-1 배열입니다. 원소 여섯 개의 순서는 그대로입니다.", explanationEn: "This is a rank-1 array with one axis. The six values keep their order." },
  { id: "row", index: "02", label: "(1, 6)", requestedShape: [1, 6], previewShape: [1, 6], codeArgument: "1, 6", explanationKo: "행 축의 크기가 1이고 열 축의 크기가 6인 행벡터가 됩니다.", explanationEn: "The row axis has size 1 and the column axis has size 6, creating a row vector." },
  { id: "column", index: "03", label: "(6, 1)", requestedShape: [6, 1], previewShape: [6, 1], codeArgument: "6, 1", explanationKo: "행 축의 크기가 6이고 열 축의 크기가 1인 열벡터가 됩니다.", explanationEn: "The row axis has size 6 and the column axis has size 1, creating a column vector." },
  { id: "infer", index: "04", label: "(-1, 3)", requestedShape: [-1, 3], previewShape: [2, 3], codeArgument: "-1, 3", explanationKo: "열을 3칸으로 정했으므로 NumPy가 남은 행 수를 2로 계산합니다.", explanationEn: "With 3 columns fixed, NumPy infers that the remaining row count must be 2." },
  { id: "invalid", index: "05", label: "(4, 2)", requestedShape: [4, 2], previewShape: [4, 2], codeArgument: "4, 2", explanationKo: "4 × 2에는 여덟 칸이 필요합니다. 원소가 여섯 개뿐이라 두 칸이 비고 reshape가 실패합니다.", explanationEn: "A 4 × 2 shape needs eight cells. With only six values, two cells are missing and reshape fails." },
];

function placeholderValues(shape: number[], sourceValues: number[] = []) {
  const [rows, columns] = shape.length === 1 ? [1, shape[0]] : shape;
  return Array.from({ length: rows }, (_, row) => (
    Array.from({ length: columns }, (_, column) => sourceValues[row * columns + column] ?? null)
  ));
}

export function ReshapeBlocksLab() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [targetId, setTargetId] = useState<TargetId>("flat");
  const [prediction, setPrediction] = useState<Prediction | null>(null);
  const [checked, setChecked] = useState(false);
  const panelId = useId();
  const predictionName = useId();
  const target = targets.find((candidate) => candidate.id === targetId) ?? targets[0];

  const result = useMemo(() => {
    try {
      const reshaped = reshapeVector(values, target.requestedShape);
      return { possible: true as const, values: reshaped, shape: shapeOfNumericArray(reshaped) };
    } catch {
      return { possible: false as const, values: null, shape: target.previewShape };
    }
  }, [target]);
  const correct = checked && prediction === (result.possible ? "possible" : "impossible");
  const stages: Array<ExplorerStage<TargetId>> = targets.map(({ id, index, label }) => ({ id, index, label }));
  const axisLabels = result.shape.length === 2
    ? (isKo ? ["행", "열"] : ["rows", "columns"])
    : (isKo ? ["원소"] : ["values"]);
  const resultLabel = checked && !result.possible
    ? (isKo ? "필요한 8칸 · reshape 실패" : "Eight required cells · reshape failed")
    : (isKo ? "재배치 결과" : "Reshaped result");

  function chooseTarget(nextTarget: TargetId) {
    setTargetId(nextTarget);
    setPrediction(null);
    setChecked(false);
  }

  return (
    <InteractiveLab
      kicker="RESHAPE BLOCKS"
      title={isKo ? "값은 그대로 두고 shape만 다시 배치해 보세요" : "Keep the values and rearrange only the shape"}
      description={isKo ? "원소 여섯 개가 목표 shape를 채울 수 있는지 먼저 예측한 뒤 NumPy의 결과를 확인합니다." : "Predict whether six values can fill the target shape before revealing NumPy's result."}
      actions={<code className="array-lab-source-count">6 {isKo ? "개 원소" : "values"}</code>}
      className="reshape-blocks-lab"
    >
      <StepExplorer
        stages={stages}
        activeStage={targetId}
        onStageChange={chooseTarget}
        ariaLabel={isKo ? "reshape 목표 shape" : "Reshape target shape"}
        panelId={panelId}
      />

      <div className="array-transform-workspace" id={panelId}>
        <ArrayDiagram
          values={[values]}
          shape={[6]}
          label={isKo ? "원본 배열 a" : "Source array a"}
          axisLabels={[isKo ? "원소" : "values"]}
          columnLabels={values.map((_, index) => `i${index}`)}
          compact
        />
        <div className="array-transform-operator" aria-label={isKo ? `reshape ${target.label}` : `reshape to ${target.label}`}>
          <span>reshape</span>
          <code>{target.label}</code>
          <strong aria-hidden="true">→</strong>
        </div>
        {checked && result.possible && result.values ? (
          <TensorDiagram
            values={result.values}
            shape={result.shape}
            label={resultLabel}
            axisLabels={axisLabels}
            rowLabels={result.shape.length === 2 ? Array.from({ length: result.shape[0] }, (_, index) => `r${index}`) : undefined}
            columnLabels={Array.from({ length: result.shape.at(-1) ?? 0 }, (_, index) => `c${index}`)}
            tone="indigo"
            compact
          />
        ) : (
          <ArrayDiagram
            values={placeholderValues(target.previewShape) as ArrayCell[][]}
            shape={target.previewShape}
            label={resultLabel}
            axisLabels={target.previewShape.length === 2 ? (isKo ? ["행", "열"] : ["rows", "columns"]) : axisLabels}
            tone={checked ? "terra" : "indigo"}
            compact
            emptyCellLabel={isKo ? "채울 값 없음" : "no value available"}
          />
        )}
      </div>

      <div className="array-prediction-panel">
        <div>
          <span>{isKo ? "실행할 코드" : "CODE TO RUN"}</span>
          <code>{`a.reshape(${target.codeArgument})`}</code>
        </div>
        <fieldset>
          <legend>{isKo ? "원소 여섯 개로 이 shape를 만들 수 있을까요?" : "Can six values fill this shape?"}</legend>
          <label><input type="radio" name={predictionName} checked={prediction === "possible"} onChange={() => { setPrediction("possible"); setChecked(false); }} />{isKo ? "가능" : "Possible"}</label>
          <label><input type="radio" name={predictionName} checked={prediction === "impossible"} onChange={() => { setPrediction("impossible"); setChecked(false); }} />{isKo ? "불가능" : "Impossible"}</label>
          <button type="button" disabled={!prediction} onClick={() => setChecked(true)}>{isKo ? "예측 확인" : "Check prediction"}</button>
        </fieldset>
        <div className={`array-prediction-feedback${checked ? correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite">
          {checked ? (
            <>
              <strong>{correct ? (isKo ? "정확해요" : "Correct") : (isKo ? "칸 수를 다시 곱해 보세요" : "Multiply the dimensions once more")}</strong>
              <p>{isKo ? target.explanationKo : target.explanationEn}</p>
              <code>{result.possible ? `shape ${formatShape(result.shape)}` : "ValueError: cannot reshape array of size 6"}</code>
            </>
          ) : <p>{isKo ? "목표 shape의 모든 크기를 곱해 원소 수 6과 비교하세요." : "Multiply every target dimension and compare it with the 6 source values."}</p>}
        </div>
      </div>
    </InteractiveLab>
  );
}

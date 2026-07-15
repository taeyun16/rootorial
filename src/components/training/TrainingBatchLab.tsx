import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  advanceTrainingStep,
  createTrainingState,
  evaluateTrainingMastery,
  fullDatasetLoss,
  trainingBatchPlans,
  trainingClassNames,
  trainingLabels,
  type BatchPlanId,
  type ParameterInspection,
  type TrainingPrediction,
  type TrainingStepSnapshot,
} from "../../features/training/training-simulator";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { MatrixGrid } from "../interactive/MatrixGrid";

const predictionOptions: TrainingPrediction[] = [
  "batch-down-full-up",
  "both-down",
  "batch-up-full-down",
  "both-up",
];

const predictionCopy: Record<TrainingPrediction, { ko: string; en: string }> = {
  "batch-down-full-up": {
    ko: "현재 batch CE ↓ · 전체 CE ↑",
    en: "Current batch CE ↓ · full CE ↑",
  },
  "both-down": {
    ko: "현재 batch CE ↓ · 전체 CE ↓",
    en: "Current batch CE ↓ · full CE ↓",
  },
  "batch-up-full-down": {
    ko: "현재 batch CE ↑ · 전체 CE ↓",
    en: "Current batch CE ↑ · full CE ↓",
  },
  "both-up": {
    ko: "현재 batch CE ↑ · 전체 CE ↑",
    en: "Current batch CE ↑ · full CE ↑",
  },
};

function format(value: number) {
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function TrainingLossTrace({ history, locale }: {
  history: TrainingStepSnapshot[];
  locale: "ko" | "en";
}) {
  if (!history.length) return null;
  const width = 520;
  const height = 220;
  const padding = 36;
  const values = [history[0].fullLossBefore, ...history.map((snapshot) => snapshot.fullLossAfter)];
  const maximum = Math.max(...values, 0.4);
  const points = values.map((value, index) => {
    const x = padding + index / Math.max(1, values.length - 1) * (width - padding * 2);
    const y = height - padding - value / maximum * (height - padding * 2);
    return { x, y, value, update: index };
  });
  return (
    <svg
      className="training-loss-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="training-loss-title training-loss-description"
    >
      <title id="training-loss-title">
        {locale === "ko" ? "업데이트별 전체 데이터 cross entropy" : "Full-dataset cross entropy by update"}
      </title>
      <desc id="training-loss-description">
        {locale === "ko"
          ? `초기 ${format(values[0])}에서 현재 ${format(values.at(-1) ?? values[0])}까지의 전체 손실입니다.`
          : `Full loss from the initial ${format(values[0])} to the current ${format(values.at(-1) ?? values[0])}.`}
      </desc>
      <line className="training-chart-axis" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <line className="training-chart-axis" x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <polyline className="training-chart-line" points={points.map(({ x, y }) => `${x},${y}`).join(" ")} />
      {points.map((point) => (
        <g key={point.update}>
          <circle className="training-chart-point" cx={point.x} cy={point.y} r="5" />
          <text x={point.x} y={height - 12} textAnchor="middle">{point.update}</text>
        </g>
      ))}
      <text x={padding + 4} y={padding + 12}>CE</text>
      <text x={width - padding - 58} y={height - 12}>{locale === "ko" ? "update" : "update"}</text>
    </svg>
  );
}

export function TrainingBatchLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [batchPlan, setBatchPlan] = useState<BatchPlanId>("grouped");
  const [state, setState] = useState(() => createTrainingState("grouped"));
  const [history, setHistory] = useState<TrainingStepSnapshot[]>([]);
  const [prediction, setPrediction] = useState<TrainingPrediction | "">("");
  const [inspection, setInspection] = useState<ParameterInspection>(null);
  const [runtimeError, setRuntimeError] = useState("");
  const [idleFeedback, setIdleFeedback] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const mastery = useMemo(
    () => evaluateTrainingMastery(history, inspection),
    [history, inspection],
  );
  const latest = history.at(-1) ?? null;
  const epochComplete = state.cursor >= trainingBatchPlans[batchPlan].length;
  const inspectedSnapshot = inspection
    ? history.find((snapshot) => snapshot.update === inspection.update) ?? null
    : null;
  const selectedDetail = inspection && inspectedSnapshot
    ? {
        weightBefore: inspectedSnapshot.stateBefore.weights[inspection.row][inspection.column],
        weightAfter: inspectedSnapshot.stateAfter.weights[inspection.row][inspection.column],
        gradient: inspectedSnapshot.gradientWeights[inspection.row][inspection.column],
        momentBefore: inspectedSnapshot.stateBefore.adam.mWeights[inspection.row][inspection.column],
        momentAfter: inspectedSnapshot.stateAfter.adam.mWeights[inspection.row][inspection.column],
      }
    : null;

  useEffect(() => {
    onCompletionChange?.(mastery.mastered);
  }, [mastery.mastered, onCompletionChange]);

  useEffect(() => setInteractiveReady(true), []);

  function reset(nextPlan: BatchPlanId = batchPlan) {
    setBatchPlan(nextPlan);
    setState(createTrainingState(nextPlan));
    setHistory([]);
    setPrediction("");
    setInspection(null);
    setRuntimeError("");
    setIdleFeedback("");
  }

  function choosePlan(nextPlan: BatchPlanId) {
    reset(nextPlan);
  }

  function runNextBatch() {
    if (state.cursor >= trainingBatchPlans[batchPlan].length) {
      setIdleFeedback(t(
        "한 epoch의 모든 mini-batch를 처리했습니다. 다른 순서를 탐색하려면 preset을 고르거나 초기화하세요.",
        "Every mini-batch in this epoch has run. Choose another preset or reset to explore again.",
      ));
      return;
    }
    if (!prediction) {
      setIdleFeedback(t(
        "실행 순간의 예측을 먼저 고르세요. 결과를 본 뒤 바꿔도 이전 증거는 갱신되지 않습니다.",
        "Choose a prediction before running. Changing the control later cannot rewrite earlier evidence.",
      ));
      return;
    }
    try {
      const result = advanceTrainingStep(state, prediction);
      setState(result.state);
      setHistory((current) => [...current, result.snapshot]);
      setPrediction("");
      setIdleFeedback("");
      setRuntimeError("");
    } catch {
      setRuntimeError(t(
        "훈련 시뮬레이터가 이 상태를 계산하지 못했습니다. 네트워크 없이 실행되는 기본 상태로 초기화해 다시 시도하세요.",
        "The training simulator could not evaluate this state. Reset to the network-free baseline and try again.",
      ));
    }
  }

  function selectParameter(row: number, column: number) {
    if (!latest) return;
    setInspection({ update: latest.update, row, column });
  }

  const latestPredictionCorrect = latest
    ? latest.predictionAtRun === latest.actualOutcome
    : false;
  const evidence = {
    firstPrediction: history[0]?.predictionAtRun === "batch-down-full-up"
      && history[0]?.actualOutcome === "batch-down-full-up",
    fullEpoch: history.length === trainingBatchPlans.grouped.length
      && history.every((snapshot, index) => snapshot.batchIndices.join(",") === trainingBatchPlans.grouped[index]?.join(",")),
    tail: history.at(-1)?.batchIndices.length === 1,
    adam: history[1]?.stateBefore.adam.step === 1 && history[1]?.stateAfter.adam.step === 2,
    inspected: Boolean(
      inspection
      && inspection.update >= 2
      && inspectedSnapshot
      && Math.abs(inspectedSnapshot.gradientWeights[inspection.row]?.[inspection.column] ?? 0) > 1e-8
      && Math.abs(inspectedSnapshot.stateBefore.adam.mWeights[inspection.row]?.[inspection.column] ?? 0) > 1e-8,
    ),
    recovered: Boolean(
      history[0]
      && (history.at(-1)?.fullLossAfter ?? Number.POSITIVE_INFINITY) < history[0].fullLossBefore - 0.02,
    ),
  };

  return (
    <InteractiveLab
      className="training-batch-lab"
      kicker={t("필수 LAB · MINI-BATCH → ADAM", "REQUIRED LAB · MINI-BATCH → ADAM")}
      title={t("한 batch의 승리와 전체 epoch의 방향을 분리하세요", "Separate one batch's win from the epoch's direction")}
      description={t(
        "7개 hidden feature를 2개씩 처리합니다. 실행 전 CE 변화를 예측하고, row-softmax·mean CE·gradient·Adam state가 W[2,3]을 어떻게 바꾸는지 추적하세요.",
        "Process seven hidden-feature rows two at a time. Predict the CE change, then trace row softmax, mean CE, gradients, and Adam state into W[2,3].",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={() => reset()}>
          {t("실습 초기화", "Reset lab")}
        </button>
      )}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"}>
        {interactiveReady
          ? t("mini-batch 실습 조작 준비 완료", "Mini-batch lab controls ready")
          : t("mini-batch 실습 준비 중", "Preparing the mini-batch lab")}
      </span>
      <div className="training-preset-bar" role="group" aria-label={t("mini-batch 순서 preset", "Mini-batch order presets")}>
        <span>{t("순서 preset", "ORDER PRESET")}</span>
        <button
          type="button"
          aria-pressed={batchPlan === "grouped"}
          onClick={() => choosePlan("grouped")}
        >
          {t("필수 진단 · class별 묶음", "Required diagnostic · grouped classes")}
        </button>
        <button
          type="button"
          aria-pressed={batchPlan === "interleaved"}
          onClick={() => choosePlan("interleaved")}
        >
          {t("탐색 · class 섞기", "Explore · interleaved")}
        </button>
      </div>
      <p className="training-preset-note">{t(
        "class별 grouped 순서는 한 batch의 개선이 전체 CE를 잠시 해칠 수 있음을 드러내는 의도적인 진단 현미경입니다. 일반 훈련에서는 표본을 shuffle해 class를 섞습니다.",
        "The class-grouped order is an intentional diagnostic microscope: one batch can improve while full CE briefly worsens. Normal training shuffles samples to mix classes.",
      )}</p>

      <div className="training-batch-planner">
        <div>
          <span>{t("표본", "SAMPLES")}</span>
          <strong>7</strong>
        </div>
        <div>
          <span>{t("batch size", "BATCH SIZE")}</span>
          <strong>2</strong>
        </div>
        <div>
          <span>{t("updates / epoch", "UPDATES / EPOCH")}</span>
          <strong>⌈7 / 2⌉ = 4</strong>
        </div>
        <div>
          <span>{t("마지막 batch", "TAIL BATCH")}</span>
          <strong>1 {t("행", "row")}</strong>
        </div>
      </div>

      <div className="training-run-panel">
        <fieldset className="training-prediction-fieldset">
          <legend>
            {epochComplete
              ? t("한 epoch 완료 · 증거를 검사하거나 순서를 초기화하세요", "Epoch complete · inspect the evidence or reset the order")
              : t(
                  `update ${state.cursor + 1} 실행 뒤 CE를 예측하세요`,
                  `Predict CE after update ${state.cursor + 1}`,
                )}
          </legend>
          <label>
            <span>{t("batch / full 방향", "Batch / full direction")}</span>
            <select
              value={prediction}
              disabled={epochComplete}
              onChange={(event) => setPrediction(event.currentTarget.value as TrainingPrediction)}
              aria-label={t("다음 update의 batch와 전체 CE 방향", "Batch and full CE direction for the next update")}
            >
              <option value="" disabled>{t("실행 전 예측", "Predict before running")}</option>
              {predictionOptions.map((option) => (
                <option value={option} key={option}>{predictionCopy[option][locale]}</option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-primary" onClick={runNextBatch}>
            {epochComplete
              ? t("epoch 완료 · 결과 설명 보기", "Epoch complete · review result")
              : t("다음 mini-batch forward → Adam", "Next mini-batch forward → Adam")}
          </button>
        </fieldset>

        <div className="training-live-summary" role="status" aria-live="polite">
          {latest ? (
            <>
              <strong>{latestPredictionCorrect ? t("예측 확인", "Prediction confirmed") : t("예측 수정 필요", "Prediction needs revision")}</strong>
              <span>{t("실행 당시 예측", "Prediction at run")}: {predictionCopy[latest.predictionAtRun][locale]}</span>
              <span>{t("실제", "Actual")}: {predictionCopy[latest.actualOutcome][locale]}</span>
              <span>
                batch CE {format(latest.batchLossBefore)} → {format(latest.batchLossAfter)} · full CE {format(latest.fullLossBefore)} → {format(latest.fullLossAfter)}
              </span>
            </>
          ) : (
            <span>{idleFeedback || t(
              "첫 class-0 batch는 자기 CE를 낮추면서 다른 class의 점수를 잠시 흔들 수 있습니다. 방향을 먼저 예측하세요.",
              "The first class-0 batch can lower its own CE while briefly disturbing other classes. Predict the directions first.",
            )}</span>
          )}
        </div>
      </div>

      {idleFeedback && latest ? <p className="training-idle-feedback" role="status">{idleFeedback}</p> : null}
      {runtimeError ? (
        <div className="training-runtime-fallback" role="alert">
          <strong>{t("수학 모델 fallback", "Math-model fallback")}</strong>
          <p>{runtimeError}</p>
          <button type="button" className="button button-secondary" onClick={() => reset("grouped")}>
            {t("기본 상태 복구", "Restore baseline")}
          </button>
        </div>
      ) : null}

      {latest ? (
        <div className="training-step-workspace">
          <header>
            <div>
              <span>UPDATE {latest.update} / {trainingBatchPlans[batchPlan].length}</span>
              <strong>
                batch [{latest.batchIndices.map((index) => index + 1).join(", ")}] · labels [{latest.labels.join(", ")}]
              </strong>
            </div>
            <span>{latest.batchIndices.length === 1 ? t("tail batch · 1행", "tail batch · 1 row") : t("mean CE · 2행", "mean CE · 2 rows")}</span>
          </header>
          <div className="training-matrix-pair">
            <MatrixGrid
              values={latest.logitsBefore}
              label={t("현재 batch logits", "Current batch logits")}
              rowLabels={latest.batchIndices.map((index) => t(`표본 ${index + 1}`, `sample ${index + 1}`))}
              columnLabels={trainingClassNames.map((name, index) => t(`class ${index}`, name))}
              formatValue={(value) => value.toFixed(3)}
              tone="indigo"
            />
            <MatrixGrid
              values={latest.probabilitiesBefore}
              label={t("row softmax 확률", "Row-softmax probabilities")}
              rowLabels={latest.batchIndices.map((index) => t(`표본 ${index + 1}`, `sample ${index + 1}`))}
              columnLabels={trainingClassNames.map((name, index) => t(`class ${index}`, name))}
              formatValue={(value) => value.toFixed(3)}
              tone="forest"
            />
          </div>
          <p className="training-row-contract">
            {t(
              `각 행은 한 표본입니다. 정답 class 확률만 -log로 읽어 ${latest.rowLossesBefore.map(format).join(" + ")}의 평균을 batch loss로 만듭니다.`,
              `Each row is one sample. Read only the true-class probability with -log, then average ${latest.rowLossesBefore.map(format).join(" + ")} into the batch loss.`,
            )}
          </p>
          <div className="training-parameter-inspector">
            <div>
              <span>{t("직접 검사", "INSPECT DIRECTLY")}</span>
              <h4>{t("W 셀을 눌러 gradient와 Adam memory를 연결하세요", "Select a W cell to connect its gradient and Adam memory")}</h4>
              <p>{t(
                "update 2 이후, 이전 moment와 이번 gradient가 모두 0이 아닌 셀을 찾아야 완료 증거가 됩니다.",
                "At update 2 or later, find a cell whose prior moment and current gradient are both nonzero.",
              )}</p>
            </div>
            <MatrixGrid
              values={latest.stateAfter.weights}
              label={t(`update ${latest.update} 뒤 W`, `W after update ${latest.update}`)}
              rowLabels={[t("hidden 1", "hidden 1"), t("hidden 2", "hidden 2")]}
              columnLabels={trainingClassNames.map((name, index) => t(`class ${index}`, name))}
              selectedCell={inspection?.update === latest.update
                ? { row: inspection.row, column: inspection.column }
                : null}
              formatValue={(value) => value.toFixed(3)}
              tone="terra"
              onSelectCell={selectParameter}
            />
          </div>
          {selectedDetail && inspection ? (
            <dl className="training-parameter-trace" aria-live="polite" aria-label={t("선택한 파라미터 update trace", "Selected parameter update trace")}>
              <div><dt>W[{inspection.row},{inspection.column}]</dt><dd>{format(selectedDetail.weightBefore)} → {format(selectedDetail.weightAfter)}</dd></div>
              <div><dt>gradient</dt><dd>{format(selectedDetail.gradient)}</dd></div>
              <div><dt>m before</dt><dd>{format(selectedDetail.momentBefore)}</dd></div>
              <div><dt>m after</dt><dd>{format(selectedDetail.momentAfter)}</dd></div>
              <div><dt>ΔW</dt><dd>{format(selectedDetail.weightAfter - selectedDetail.weightBefore)}</dd></div>
            </dl>
          ) : null}
          <TrainingLossTrace history={history} locale={locale} />
        </div>
      ) : null}

      <div className="training-evidence" aria-label={t("필수 실습 완료 증거", "Required lab completion evidence")}>
        <span className={evidence.firstPrediction ? "is-complete" : undefined} aria-label={t(`첫 batch 예측·관찰, ${evidence.firstPrediction ? "완료" : "미완료"}`, `Predict and observe the first batch, ${evidence.firstPrediction ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.firstPrediction ? "✓" : "○"}</b> {history.length ? t("첫 batch의 local↓ / full↑ 예측·관찰", "Predict and observe local↓ / full↑") : t("첫 batch 방향을 결과 전에 예측", "Predict the first batch directions before seeing the result")}</span>
        <span className={evidence.fullEpoch ? "is-complete" : undefined} aria-label={t(`필수 순서 네 update, ${evidence.fullEpoch ? "완료" : "미완료"}`, `Four updates in the required order, ${evidence.fullEpoch ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.fullEpoch ? "✓" : "○"}</b> {t("필수 순서로 4 updates", "Four updates in the required order")}</span>
        <span className={evidence.tail ? "is-complete" : undefined} aria-label={t(`마지막 tail batch, ${evidence.tail ? "완료" : "미완료"}`, `Final tail batch, ${evidence.tail ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.tail ? "✓" : "○"}</b> {t("마지막 1행 tail batch", "Final one-row tail batch")}</span>
        <span className={evidence.adam ? "is-complete" : undefined} aria-label={t(`gradient와 Adam 상태 분리, ${evidence.adam ? "완료" : "미완료"}`, `Separate gradients and Adam state, ${evidence.adam ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.adam ? "✓" : "○"}</b> {t("gradient는 새로, Adam moment는 유지", "Fresh gradient, preserved Adam moment")}</span>
        <span className={evidence.inspected ? "is-complete" : undefined} aria-label={t(`파라미터 직접 검사, ${evidence.inspected ? "완료" : "미완료"}`, `Inspect a parameter directly, ${evidence.inspected ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.inspected ? "✓" : "○"}</b> {t("update 2+ 파라미터 직접 검사", "Inspect an update 2+ parameter")}</span>
        <span className={evidence.recovered ? "is-complete" : undefined} aria-label={t(`epoch 손실 회복, ${evidence.recovered ? "완료" : "미완료"}`, `Recover the epoch loss, ${evidence.recovered ? "complete" : "incomplete"}`)}><b aria-hidden="true">{evidence.recovered ? "✓" : "○"}</b> {t("epoch 끝 full CE가 초기보다 감소", "End-of-epoch full CE below initial")}</span>
      </div>

      <div className={`training-mastery-feedback${mastery.mastered ? " is-complete" : ""}`} role="status" aria-live="polite">
        <strong>{mastery.mastered ? t("Mini-batch 훈련 증거 완성", "Mini-batch training evidence complete") : t("아직 훈련 증거를 모으는 중", "Still collecting training evidence")}</strong>
        <p>{mastery.mastered
          ? t(
              `한 batch의 full CE 상승을 관찰한 뒤, ${history.length}개 update로 ${format(history[0].fullLossBefore)} → ${format(history.at(-1)?.fullLossAfter ?? fullDatasetLoss(state))}까지 회복했습니다.`,
              `After observing a full-CE rise on one batch, ${history.length} updates recovered it from ${format(history[0].fullLossBefore)} to ${format(history.at(-1)?.fullLossAfter ?? fullDatasetLoss(state))}.`,
            )
          : t(
              "필수 grouped preset에서 예측 → 네 batch 실행 → update 2 이후 W 셀 검사를 순서대로 수행하세요.",
              "In the required grouped preset, predict, run all four batches, then inspect a W cell at update 2 or later.",
            )}</p>
      </div>
    </InteractiveLab>
  );
}

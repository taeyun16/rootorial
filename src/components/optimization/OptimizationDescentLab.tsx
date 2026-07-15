import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  canMasterDescentRepair,
  descentPresets,
  simulateGradientDescent,
  type DescentConfig,
  type DescentOutcome,
  type DescentSimulation,
  type LinearWeights,
} from "../../features/optimization/gradient-descent";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { MathFormula } from "../MathFormula";

const outcomeCopy: Record<DescentOutcome, { ko: string; en: string }> = {
  slow: { ko: "줄지만 너무 느림", en: "Decreases, but too slowly" },
  converging: { ko: "안정적으로 수렴", en: "Converges steadily" },
  diverging: { ko: "손실이 커지며 발산", en: "Loss grows and diverges" },
};

type PresetId = keyof typeof descentPresets;

const presetCopy: Record<PresetId, { ko: string; en: string }> = {
  "too-small": { ko: "너무 작음 · η 0.02", en: "Too small · η 0.02" },
  useful: { ko: "안정적 · η 0.30", en: "Useful · η 0.30" },
  "too-large": { ko: "너무 큼 · η 1.10", en: "Too large · η 1.10" },
  "near-solution": { ko: "근처에서 시작", en: "Start nearby" },
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "∞";
  if (Math.abs(value) >= 10_000) return value.toExponential(2);
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function configMatchesPreset(config: DescentConfig, preset: DescentConfig) {
  return config.initialWeights.bias === preset.initialWeights.bias
    && config.initialWeights.slope === preset.initialWeights.slope
    && config.learningRate === preset.learningRate
    && config.steps === preset.steps;
}

function predictionMessage(
  predicted: DescentOutcome,
  actual: DescentOutcome,
  locale: "ko" | "en",
) {
  if (predicted === actual) {
    return locale === "ko"
      ? `예측과 일치합니다: ${outcomeCopy[actual].ko}. 학습률이 만든 실제 loss trace로 확인했습니다.`
      : `Prediction matched: ${outcomeCopy[actual].en}. The actual loss trace confirms what this learning rate does.`;
  }
  return locale === "ko"
    ? `예측: '${outcomeCopy[predicted].ko}', 실제: '${outcomeCopy[actual].ko}'입니다. 첫 loss와 마지막 loss의 크기를 비교하세요.`
    : `You predicted '${outcomeCopy[predicted].en}', but the run '${outcomeCopy[actual].en}'. Compare the first and final losses.`;
}

function RegressionPlot({
  initialWeights,
  finalWeights,
  locale,
}: {
  initialWeights: LinearWeights;
  finalWeights: LinearWeights;
  locale: "ko" | "en";
}) {
  const width = 420;
  const height = 240;
  const padding = 34;
  const xMin = -1.5;
  const xMax = 1.5;
  const yMin = -5;
  const yMax = 5;
  const xScale = (x: number) => padding + ((x - xMin) / (xMax - xMin)) * (width - padding * 2);
  const yScale = (y: number) => height - padding - ((y - yMin) / (yMax - yMin)) * (height - padding * 2);
  const line = (weights: LinearWeights) => ({
    x1: xScale(xMin),
    y1: yScale(weights.bias + weights.slope * xMin),
    x2: xScale(xMax),
    y2: yScale(weights.bias + weights.slope * xMax),
  });
  const initialLine = line(initialWeights);
  const finalLine = line(finalWeights);
  const finalEndValues = [
    finalWeights.bias + finalWeights.slope * xMin,
    finalWeights.bias + finalWeights.slope * xMax,
  ];
  const finalLineState = finalEndValues.every((value) => value > yMax)
    ? "off-scale-above"
    : finalEndValues.every((value) => value < yMin)
      ? "off-scale-below"
      : "visible";
  const offScaleDescription = finalLineState === "off-scale-above"
    ? (locale === "ko" ? " 마지막 예측선은 표시 범위 위에 있어 위쪽 표식으로 나타냅니다." : " The final prediction line is above the plotted range and is represented by an upper marker.")
    : finalLineState === "off-scale-below"
      ? (locale === "ko" ? " 마지막 예측선은 표시 범위 아래에 있어 아래쪽 표식으로 나타냅니다." : " The final prediction line is below the plotted range and is represented by a lower marker.")
      : "";
  const points = [
    { x: -1, y: -1 },
    { x: 0, y: 1 },
    { x: 1, y: 3 },
  ];

  return (
    <svg
      className="optimization-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      data-final-line-state={finalLineState}
      aria-labelledby="optimization-fit-title optimization-fit-description"
    >
      <title id="optimization-fit-title">
        {locale === "ko" ? "업데이트 전후 예측선" : "Prediction line before and after updates"}
      </title>
      <desc id="optimization-fit-description">
        {locale === "ko"
          ? `세 데이터 점과 초기 파라미터의 예측선, 마지막 파라미터의 예측선을 비교합니다.${offScaleDescription}`
          : `Compares three data points with the prediction lines from the initial and final parameters.${offScaleDescription}`}
      </desc>
      <line className="optimization-axis" x1={padding} y1={yScale(0)} x2={width - padding} y2={yScale(0)} />
      <line className="optimization-axis" x1={xScale(0)} y1={padding} x2={xScale(0)} y2={height - padding} />
      <line className="optimization-fit-line is-initial" {...initialLine} />
      <line className="optimization-fit-line is-final" {...finalLine} />
      {points.map((point) => (
        <circle
          className="optimization-data-point"
          cx={xScale(point.x)}
          cy={yScale(point.y)}
          r="6"
          key={point.x}
        />
      ))}
      <text x={padding + 4} y={padding + 12}>{locale === "ko" ? "점: 데이터" : "dots: data"}</text>
      <text className="is-initial" x={padding + 4} y={padding + 30}>{locale === "ko" ? "점선: 시작" : "dashed: start"}</text>
      <text className="is-final" x={padding + 4} y={padding + 48}>{locale === "ko" ? "실선: 마지막" : "solid: final"}</text>
      {finalLineState !== "visible" ? (
        <text
          className="is-final optimization-offscale-label"
          x={padding + 4}
          y={finalLineState === "off-scale-above" ? padding + 66 : height - padding - 8}
        >
          {finalLineState === "off-scale-above"
            ? (locale === "ko" ? "↑ 마지막 선: 표시 범위 위" : "↑ final line: above range")
            : (locale === "ko" ? "↓ 마지막 선: 표시 범위 아래" : "↓ final line: below range")}
        </text>
      ) : null}
    </svg>
  );
}

function LossTrace({
  simulation,
  locale,
}: {
  simulation: DescentSimulation;
  locale: "ko" | "en";
}) {
  const width = 420;
  const height = 240;
  const padding = 34;
  const values = simulation.snapshots.map((snapshot) => {
    const safeLoss = Number.isFinite(snapshot.loss)
      ? Math.min(1_000_000_000_000, Math.max(0, snapshot.loss))
      : 1_000_000_000_000;
    return Math.log10(1 + safeLoss);
  });
  const maxValue = Math.max(1, ...values);
  const maxStep = Math.max(1, simulation.snapshots.at(-1)!.step);
  const points = simulation.snapshots.map((snapshot, index) => {
    const x = padding + (snapshot.step / maxStep) * (width - padding * 2);
    const y = height - padding - (values[index] / maxValue) * (height - padding * 2);
    return `${x},${y}`;
  }).join(" ");

  return (
    <svg
      className="optimization-chart"
      viewBox={`0 0 ${width} ${height}`}
      role="img"
      aria-labelledby="optimization-loss-title optimization-loss-description"
    >
      <title id="optimization-loss-title">
        {locale === "ko" ? "업데이트별 손실 기록" : "Loss history by update"}
      </title>
      <desc id="optimization-loss-description">
        {locale === "ko"
          ? `손실 ${formatNumber(simulation.initialLoss)}에서 ${formatNumber(simulation.finalLoss)}까지의 변화를 로그 눈금으로 표시합니다.`
          : `Shows the change from loss ${formatNumber(simulation.initialLoss)} to ${formatNumber(simulation.finalLoss)} on a log scale.`}
      </desc>
      <line className="optimization-axis" x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} />
      <line className="optimization-axis" x1={padding} y1={padding} x2={padding} y2={height - padding} />
      <polyline className={`optimization-loss-line is-${simulation.outcome}`} points={points} />
      {simulation.snapshots.map((snapshot, index) => {
        const [cx, cy] = points.split(" ")[index].split(",");
        return <circle className={`optimization-loss-point is-${simulation.outcome}`} cx={cx} cy={cy} r="4" key={snapshot.step} />;
      })}
      <text x={padding + 4} y={padding + 12}>{locale === "ko" ? "log(1 + loss)" : "log(1 + loss)"}</text>
      <text x={width - padding - 50} y={height - 10}>{locale === "ko" ? "업데이트" : "updates"}</text>
    </svg>
  );
}

export function OptimizationDescentLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [config, setConfig] = useState<DescentConfig>({ ...descentPresets["too-large"], initialWeights: { ...descentPresets["too-large"].initialWeights } });
  const [prediction, setPrediction] = useState<DescentOutcome | "">("");
  const [simulation, setSimulation] = useState<DescentSimulation | null>(null);
  const [stepPreview, setStepPreview] = useState<DescentSimulation | null>(null);
  const [badRunConfig, setBadRunConfig] = useState<DescentConfig | null>(null);
  const [mastered, setMastered] = useState(false);
  const [inputError, setInputError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);

  function revokeMastery() {
    if (!mastered) return;
    setMastered(false);
    onCompletionChange?.(false);
  }

  function changeConfig(next: DescentConfig) {
    setConfig(next);
    setPrediction("");
    setSimulation(null);
    setStepPreview(null);
    setInputError("");
    revokeMastery();
  }

  function applyPreset(id: PresetId) {
    const preset = descentPresets[id];
    changeConfig({ ...preset, initialWeights: { ...preset.initialWeights } });
  }

  function changeNumber(
    key: "bias" | "slope" | "learningRate" | "steps",
    value: number,
  ) {
    if (!Number.isFinite(value)) {
      setInputError(t("유한한 숫자를 입력하세요.", "Enter a finite number."));
      return;
    }
    const inRange = key === "bias" || key === "slope"
      ? value >= -4 && value <= 4
      : key === "learningRate"
        ? value >= 0.01 && value <= 1.2
        : value >= 1 && value <= 24;
    if (!inRange) {
      setInputError(
        key === "bias" || key === "slope"
          ? t("bias와 slope는 -4에서 4 사이여야 합니다.", "Bias and slope must stay between -4 and 4.")
          : key === "learningRate"
            ? t("학습률은 0.01에서 1.20 사이여야 합니다.", "The learning rate must stay between 0.01 and 1.20.")
            : t("업데이트 횟수는 1에서 24 사이여야 합니다.", "The update count must stay between 1 and 24."),
      );
      return;
    }
    const next: DescentConfig = key === "bias" || key === "slope"
      ? {
          ...config,
          initialWeights: { ...config.initialWeights, [key]: value },
        }
      : { ...config, [key]: key === "steps" ? Math.trunc(value) : value };
    changeConfig(next);
  }

  function previewFirstStep() {
    if (!prediction) return;
    setSimulation(null);
    setStepPreview(simulateGradientDescent({ ...config, steps: 1 }));
  }

  function runConfiguredSteps() {
    if (!prediction) return;
    const next = simulateGradientDescent(config);
    const predictionCorrect = prediction === next.outcome;
    const nextBadRunConfig = predictionCorrect && next.outcome !== "converging"
      ? { ...config, initialWeights: { ...config.initialWeights } }
      : badRunConfig;
    const nextMastered = canMasterDescentRepair({
      badRunConfig: nextBadRunConfig,
      currentConfig: config,
      predictedOutcome: prediction,
      simulation: next,
    });
    setSimulation(next);
    setStepPreview(null);
    setBadRunConfig(nextBadRunConfig);
    setMastered(nextMastered);
    onCompletionChange?.(nextMastered);
  }

  function resetLab() {
    setConfig({ ...descentPresets["too-large"], initialWeights: { ...descentPresets["too-large"].initialWeights } });
    setPrediction("");
    setSimulation(null);
    setStepPreview(null);
    setBadRunConfig(null);
    setMastered(false);
    setInputError("");
    onCompletionChange?.(false);
  }

  const displayed = stepPreview ?? simulation;
  const initialSnapshot = displayed?.snapshots[0];
  const finalSnapshot = displayed?.snapshots.at(-1);
  const updateVector = initialSnapshot ? {
    bias: -config.learningRate * initialSnapshot.gradient.bias,
    slope: -config.learningRate * initialSnapshot.gradient.slope,
  } : null;
  const presetIds = Object.keys(descentPresets) as PresetId[];
  const observedBadRate = badRunConfig !== null;
  const repairedAfterBadRate = badRunConfig !== null
    && config.learningRate !== badRunConfig.learningRate;
  const sameStartingConditions = badRunConfig !== null
    && config.initialWeights.bias === badRunConfig.initialWeights.bias
    && config.initialWeights.slope === badRunConfig.initialWeights.slope
    && config.steps === badRunConfig.steps;
  const summary = useMemo(() => {
    if (stepPreview) {
      const first = stepPreview.snapshots[0];
      const next = stepPreview.snapshots[1];
      return t(
        `첫 업데이트 계산 완료 — loss ${formatNumber(first.loss)} → ${formatNumber(next.loss)}, W₀=[${formatNumber(first.weights.bias)}, ${formatNumber(first.weights.slope)}] → W₁=[${formatNumber(next.weights.bias)}, ${formatNumber(next.weights.slope)}].`,
        `First update calculated — loss ${formatNumber(first.loss)} → ${formatNumber(next.loss)}, W₀=[${formatNumber(first.weights.bias)}, ${formatNumber(first.weights.slope)}] → W₁=[${formatNumber(next.weights.bias)}, ${formatNumber(next.weights.slope)}].`,
      );
    }
    if (!simulation) return t(
      "결과를 예측하고 첫 업데이트를 살펴본 뒤 전체 trace를 실행하세요.",
      "Predict the outcome, inspect the first update, then run the full trace.",
    );
    if (mastered) return t(
      "필수 실습 완료 — 실패한 학습률을 근거로 고쳐 손실을 안정적으로 줄였습니다.",
      "Required lab complete — you used evidence to repair a bad learning rate and reduce loss steadily.",
    );
    if (prediction === simulation.outcome && simulation.outcome === "converging") {
      if (!badRunConfig) return t(
        "수렴은 확인했지만 아직 비교할 실패 trace가 없습니다. 너무 작거나 큰 학습률을 정확히 예측·실행한 뒤 복구하세요.",
        "The run converged, but there is no failed trace to compare yet. Correctly predict and run a rate that is too small or too large, then repair it.",
      );
      if (!sameStartingConditions) return t(
        "수렴했지만 시작 W 또는 업데이트 횟수가 달라 학습률 효과를 비교할 수 없습니다. 실패한 run과 같은 시작 조건을 복원하고 η만 바꾸세요.",
        "The run converged, but its starting W or update count changed, so it does not isolate the learning rate. Restore the failed run's starting conditions and change only η.",
      );
      if (!repairedAfterBadRate) return t(
        "같은 학습률로는 복구 증거가 되지 않습니다. 실패 trace의 η를 바꾸고 다시 실행하세요.",
        "The same learning rate is not repair evidence. Change η from the failed trace and run again.",
      );
      if (simulation.initialLoss <= 0.01) return t(
        "이미 정답에 가까운 W에서 시작해 줄일 손실이 거의 없습니다. 실패 trace와 같은 시작 W로 돌아가세요.",
        "This W starts too close to the answer to show meaningful loss reduction. Return to the failed trace's starting W.",
      );
    }
    return predictionMessage(prediction as DescentOutcome, simulation.outcome, locale);
  }, [
    badRunConfig,
    locale,
    mastered,
    prediction,
    repairedAfterBadRate,
    sameStartingConditions,
    simulation,
    stepPreview,
  ]);

  return (
    <InteractiveLab
      kicker={t("필수 실습 · LEARNING-RATE REPAIR", "REQUIRED LAB · LEARNING-RATE REPAIR")}
      title={t("발산하는 학습률을 고쳐 손실을 줄이세요", "Repair a diverging learning rate and reduce the loss")}
      description={t(
        "세 점을 설명하는 W=[bias, slope]를 경사하강법으로 업데이트합니다. 먼저 전체 trace를 예측하고, 실패를 관찰한 뒤 학습률을 바꿔 수렴시키세요.",
        "Update W=[bias, slope] for a three-point line with gradient descent. Predict the full trace, observe a failure, then change the learning rate to make it converge.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetLab}>{t("실습 초기화", "Reset lab")}</button>}
      className="optimization-descent-lab"
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"}>
        {interactiveReady ? t("최적화 실습 조작 준비 완료", "Optimization lab controls ready") : t("최적화 실습 준비 중", "Preparing optimization lab")}
      </span>

      <div className="optimization-preset-bar" role="group" aria-label={t("학습률 프리셋", "Learning-rate presets")}>
        <span>{t("프리셋", "PRESETS")}</span>
        {presetIds.map((id) => (
          <button
            type="button"
            aria-pressed={configMatchesPreset(config, descentPresets[id])}
            onClick={() => applyPreset(id)}
            key={id}
          >
            {presetCopy[id][locale]}
          </button>
        ))}
      </div>

      <div className="optimization-config-grid">
        <label>
          <span>{t("시작 bias", "Starting bias")}</span>
          <input type="number" min="-4" max="4" step="0.5" value={config.initialWeights.bias} onChange={(event) => changeNumber("bias", event.currentTarget.valueAsNumber)} />
        </label>
        <label>
          <span>{t("시작 slope", "Starting slope")}</span>
          <input type="number" min="-4" max="4" step="0.5" value={config.initialWeights.slope} onChange={(event) => changeNumber("slope", event.currentTarget.valueAsNumber)} />
        </label>
        <label className="optimization-rate-control">
          <span>{t("학습률 η", "Learning rate η")} <output>{config.learningRate.toFixed(2)}</output></span>
          <input aria-label={t("학습률", "Learning rate")} type="range" min="0.01" max="1.2" step="0.01" value={config.learningRate} onChange={(event) => changeNumber("learningRate", event.currentTarget.valueAsNumber)} />
        </label>
        <label>
          <span>{t("업데이트 횟수", "Number of updates")}</span>
          <select value={config.steps} onChange={(event) => changeNumber("steps", Number(event.currentTarget.value))}>
            {[4, 6, 8, 12].map((steps) => <option value={steps} key={steps}>{steps}</option>)}
          </select>
        </label>
      </div>

      {inputError ? <div className="optimization-input-error" role="alert">{inputError}</div> : null}

      <div className="optimization-prediction-row">
        <label>
          <span>{t("실행 전 예측", "Prediction before running")}</span>
          <select
            aria-label={t("예상 loss trace", "Predicted loss trace")}
            value={prediction}
            onChange={(event) => {
              setPrediction(event.currentTarget.value as DescentOutcome);
              setSimulation(null);
              setStepPreview(null);
              revokeMastery();
            }}
          >
            <option value="" disabled>{t("결과를 먼저 고르세요", "Choose an outcome first")}</option>
            {(["slow", "converging", "diverging"] as const).map((outcome) => (
              <option value={outcome} key={outcome}>{outcomeCopy[outcome][locale]}</option>
            ))}
          </select>
        </label>
        <div className="optimization-run-actions">
          <button type="button" className="button button-secondary" disabled={!prediction} onClick={previewFirstStep}>{t("첫 업데이트 계산", "Calculate first update")}</button>
          <button type="button" className="button button-primary" disabled={!prediction} onClick={runConfiguredSteps}>{t(`${config.steps}회 실행`, `Run ${config.steps} updates`)}</button>
        </div>
      </div>

      <div className="optimization-live-summary" role="status" aria-live="polite">
        <strong>{stepPreview
          ? t("첫 업데이트", "First update")
          : simulation
            ? outcomeCopy[simulation.outcome][locale]
            : t("실행 대기", "Waiting to run")}</strong>
        <span>{summary}</span>
      </div>

      {displayed && initialSnapshot && finalSnapshot ? (
        <>
          <div className="optimization-vector-strip" aria-label={t("첫 파라미터 업데이트", "First parameter update")}>
            <div><span>W₀</span><strong>[{formatNumber(initialSnapshot.weights.bias)}, {formatNumber(initialSnapshot.weights.slope)}]</strong></div>
            <div><span>∇L(W₀)</span><strong>[{formatNumber(initialSnapshot.gradient.bias)}, {formatNumber(initialSnapshot.gradient.slope)}]</strong></div>
            <div><span>−η∇L</span><strong>[{formatNumber(updateVector!.bias)}, {formatNumber(updateVector!.slope)}]</strong></div>
            <div><span>W₁</span><strong>[{formatNumber(displayed.snapshots[1].weights.bias)}, {formatNumber(displayed.snapshots[1].weights.slope)}]</strong></div>
          </div>
          <div className="optimization-chart-grid">
            <RegressionPlot initialWeights={initialSnapshot.weights} finalWeights={finalSnapshot.weights} locale={locale} />
            <LossTrace simulation={displayed} locale={locale} />
          </div>
          <div className="optimization-trace-summary">
            <div><span>{t("시작 loss", "Initial loss")}</span><strong>{formatNumber(displayed.initialLoss)}</strong></div>
            <div><span>{t("마지막 loss", "Final loss")}</span><strong>{formatNumber(displayed.finalLoss)}</strong></div>
            <div><span>{t("마지막 W", "Final W")}</span><strong>[{formatNumber(finalSnapshot.weights.bias)}, {formatNumber(finalSnapshot.weights.slope)}]</strong></div>
            <div><span>{t("목표 W", "Target W")}</span><strong>[1, 2]</strong></div>
          </div>
        </>
      ) : (
        <div className="optimization-formula-placeholder">
          <MathFormula latex={String.raw`\mathbf{W}_{t+1}=\mathbf{W}_t-\eta\nabla L(\mathbf{W}_t)`} display />
          <p>{t("학습률 η는 gradient 방향을 바꾸지 않고 업데이트 벡터의 전체 크기를 조절합니다.", "The learning rate η scales the whole update vector without changing the gradient's direction.")}</p>
        </div>
      )}

      <div className="optimization-evidence" aria-label={t("실습 완료 증거", "Lab completion evidence")}>
        <span className={observedBadRate ? "is-complete" : undefined}>{observedBadRate ? "✓" : "○"} {t("나쁜 학습률을 정확히 예측·관찰", "Correctly predicted and observed a bad rate")}</span>
        <span className={repairedAfterBadRate ? "is-complete" : undefined}>{repairedAfterBadRate ? "✓" : "○"} {t("학습률 변경", "Changed the learning rate")}</span>
        <span className={mastered ? "is-complete" : undefined}>{mastered ? "✓" : "○"} {t("안정적 수렴", "Reached steady convergence")}</span>
      </div>
    </InteractiveLab>
  );
}

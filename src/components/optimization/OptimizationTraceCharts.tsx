import { useEffect, useId, useState } from "react";
import type { DescentSimulation, LinearWeights } from "../../features/optimization/gradient-descent";
import "./optimization-trace.css";

function number(value: number) {
  if (!Number.isFinite(value)) return "∞";
  if (value !== 0 && (Math.abs(value) >= 10_000 || Math.abs(value) < 0.001)) return value.toExponential(2);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

const width = 420;
const height = 280;
const left = 52;
const right = 24;
const top = 62;
const bottom = 48;
const plotWidth = width - left - right;
const plotHeight = height - top - bottom;

function RegressionPlot({ initialWeights, selectedWeights, step, locale }: {
  initialWeights: LinearWeights;
  selectedWeights: LinearWeights;
  step: number;
  locale: "ko" | "en";
}) {
  const id = useId();
  const isKo = locale === "ko";
  const xScale = (x: number) => left + ((x + 1.5) / 3) * plotWidth;
  const yScale = (y: number) => height - bottom - ((y + 5) / 10) * plotHeight;
  const line = (weights: LinearWeights) => ({
    x1: xScale(-1.5), y1: yScale(weights.bias - 1.5 * weights.slope),
    x2: xScale(1.5), y2: yScale(weights.bias + 1.5 * weights.slope),
  });
  const endpoints = [-1.5, 1.5].map((x) => selectedWeights.bias + selectedWeights.slope * x);
  const lineState = endpoints.every((value) => value > 5) ? "off-scale-above"
    : endpoints.every((value) => value < -5) ? "off-scale-below" : "visible";
  const offScale = lineState === "visible" ? "" : lineState === "off-scale-above"
    ? (isKo ? "선택한 직선: 표시 범위 위 ↑" : "Selected line: above range ↑")
    : (isKo ? "선택한 직선: 표시 범위 아래 ↓" : "Selected line: below range ↓");

  return <svg className="optimization-chart optimization-readable-chart" viewBox={`0 0 ${width} ${height}`} role="img"
    data-final-line-state={lineState} data-selected-step={step} aria-labelledby={`${id}-title ${id}-desc`}>
    <title id={`${id}-title`}>{isKo ? "업데이트 전후 예측선" : "Prediction line before and after updates"}</title>
    <desc id={`${id}-desc`}>{isKo
      ? `선택 단계 ${step}: y = ${number(selectedWeights.bias)} + ${number(selectedWeights.slope)} × x. 점은 데이터, 점선은 시작, 실선은 선택 단계입니다. ${offScale}`
      : `Selected update ${step}: y = ${number(selectedWeights.bias)} + ${number(selectedWeights.slope)} × x. Dots are data, dashed is the start, solid is the selected update. ${offScale}`}</desc>
    <defs><clipPath id={`${id}-clip`}><rect x={left} y={top} width={plotWidth} height={plotHeight} /></clipPath></defs>
    {[-5, 0, 5].map((y) => <g key={y}>
      <line className="optimization-axis" x1={left} x2={width - right} y1={yScale(y)} y2={yScale(y)} />
      <text x={left - 9} y={yScale(y) + 4} textAnchor="end">{y}</text>
    </g>)}
    {[-1, 0, 1].map((x) => <g key={x}>
      <line className="optimization-axis" x1={xScale(x)} x2={xScale(x)} y1={top} y2={height - bottom} />
      <text x={xScale(x)} y={height - bottom + 18} textAnchor="middle">{x}</text>
    </g>)}
    <g clipPath={`url(#${id}-clip)`}>
      <line className="optimization-fit-line is-initial" {...line(initialWeights)} />
      <line className="optimization-fit-line is-final" {...line(selectedWeights)} />
      {[{ x: -1, y: -1 }, { x: 0, y: 1 }, { x: 1, y: 3 }].map(({ x, y }) =>
        <circle className="optimization-data-point" cx={xScale(x)} cy={yScale(y)} r="6" key={x} />)}
    </g>
    <text x={left} y="20">{isKo ? "y · 점: 데이터 / 점선: 시작" : "y · dots: data / dashed: start"}</text>
    <text className="is-final" x={left} y="39">{isKo ? `실선: 선택 단계 ${step}` : `solid: selected update ${step}`}</text>
    <text x={width - right} y={height - 8} textAnchor="end">x</text>
    {offScale ? <text className="is-final optimization-offscale-label" x={left + 5}
      y={lineState === "off-scale-above" ? top + 18 : height - bottom - 10}>{offScale}</text> : null}
  </svg>;
}

function LossTrace({ simulation, selectedStep, onSelect, locale }: {
  simulation: DescentSimulation;
  selectedStep: number;
  onSelect: (step: number) => void;
  locale: "ko" | "en";
}) {
  const id = useId();
  const isKo = locale === "ko";
  // This is the same loss stored in each calculated snapshot; zero maps to zero.
  const values = simulation.snapshots.map(({ loss }) => Math.log10(1 + Math.max(0, loss)));
  const maxValue = Math.max(1, Math.ceil(Math.max(...values)));
  const maxStep = simulation.snapshots.at(-1)!.step;
  const xScale = (step: number) => left + (step / Math.max(1, maxStep)) * plotWidth;
  const yScale = (value: number) => height - bottom - (value / maxValue) * plotHeight;
  const ticks = [...new Set([0, Math.floor(maxStep / 2), maxStep])];
  return <svg className="optimization-chart optimization-readable-chart optimization-selectable-trace"
    viewBox={`0 0 ${width} ${height}`} role="img" aria-labelledby={`${id}-title ${id}-desc`}
    onClick={(event) => {
      const rect = event.currentTarget.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width * width;
      onSelect(Math.max(0, Math.min(maxStep, Math.round((x - left) / plotWidth * maxStep))));
    }}>
    <title id={`${id}-title`}>{isKo ? "업데이트별 손실 기록" : "Loss history by update"}</title>
    <desc id={`${id}-desc`}>{isKo
      ? `세로축은 log10(1 + loss)입니다. 손실 ${number(simulation.initialLoss)}에서 ${number(simulation.finalLoss)}까지. 그래프를 탭하거나 아래 단계 선택을 사용하세요. 모든 값은 펼침 표에서도 읽을 수 있습니다.`
      : `The vertical axis is log10(1 + loss). Loss changes from ${number(simulation.initialLoss)} to ${number(simulation.finalLoss)}. Tap the chart or use the update controls below. All values are also in the expandable table.`}</desc>
    {[0, maxValue / 2, maxValue].map((value) => <g key={value}>
      <line className="optimization-axis" x1={left} x2={width - right} y1={yScale(value)} y2={yScale(value)} />
      <text x={left - 9} y={yScale(value) + 4} textAnchor="end">{number(value)}</text>
    </g>)}
    {ticks.map((step) => <g key={step}>
      <line className="optimization-axis" x1={xScale(step)} x2={xScale(step)} y1={top} y2={height - bottom} />
      <text x={xScale(step)} y={height - bottom + 18} textAnchor="middle">{step}</text>
    </g>)}
    <polyline className={`optimization-loss-line is-${simulation.outcome}`}
      points={simulation.snapshots.map(({ step }, index) => `${xScale(step)},${yScale(values[index])}`).join(" ")} />
    {simulation.snapshots.map(({ step }, index) => <circle key={step}
      className={`optimization-loss-point is-${simulation.outcome}${step === selectedStep ? " is-selected" : ""}`}
      cx={xScale(step)} cy={yScale(values[index])} r={step === selectedStep ? 7 : 4} />)}
    <text x={left} y="20">log10(1 + loss)</text>
    <text x={left} y="39">{isKo ? `선택 단계 ${selectedStep}` : `Selected update ${selectedStep}`}</text>
    <text x={width - right} y={height - 8} textAnchor="end">{isKo ? "업데이트 횟수" : "update count"}</text>
  </svg>;
}

export function OptimizationTraceCharts({ simulation, locale }: { simulation: DescentSimulation; locale: "ko" | "en" }) {
  const [selectedStep, setSelectedStep] = useState(simulation.snapshots.length - 1);
  useEffect(() => setSelectedStep(simulation.snapshots.length - 1), [simulation]);
  const snapshot = simulation.snapshots[Math.min(selectedStep, simulation.snapshots.length - 1)];
  const lastStep = simulation.snapshots.length - 1;
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  return <div className="optimization-trace-explorer">
    <div className="optimization-chart-grid">
      <RegressionPlot initialWeights={simulation.snapshots[0].weights} selectedWeights={snapshot.weights} step={snapshot.step} locale={locale} />
      <LossTrace simulation={simulation} selectedStep={snapshot.step} onSelect={setSelectedStep} locale={locale} />
    </div>
    <div className="optimization-step-controls" role="group" aria-label={t("계산된 단계 탐색", "Explore calculated updates")}>
      <button type="button" className="button button-secondary" disabled={snapshot.step === 0}
        onClick={() => setSelectedStep(snapshot.step - 1)}>{t("이전 단계", "Previous update")}</button>
      <label>{t("선택 단계", "Selected update")}
        <input type="number" min="0" max={lastStep} step="1" value={snapshot.step} onChange={(event) => {
          const value = event.currentTarget.valueAsNumber;
          if (Number.isInteger(value) && value >= 0 && value <= lastStep) setSelectedStep(value);
        }} />
        <span>/ {lastStep}</span>
      </label>
      <button type="button" className="button button-secondary" disabled={snapshot.step === lastStep}
        onClick={() => setSelectedStep(snapshot.step + 1)}>{t("다음 단계", "Next update")}</button>
    </div>
    <div className="optimization-selected-snapshot" role="status" aria-live="polite" data-selected-step={snapshot.step}>
      <strong>{t(`단계 ${snapshot.step}의 계산값`, `Calculated values at update ${snapshot.step}`)}</strong>
      <span>W = [{number(snapshot.weights.bias)}, {number(snapshot.weights.slope)}]</span>
      <span>∇L(W) = [{number(snapshot.gradient.bias)}, {number(snapshot.gradient.slope)}]</span>
      <span>loss = {number(snapshot.loss)}</span>
      <small>{t("W와 gradient의 순서: [bias, slope]. loss는 변환 전 MSE입니다.", "W and gradient order: [bias, slope]. Loss is MSE before the log transform.")}</small>
    </div>
    <details className="optimization-numeric-trace">
      <summary>{t("모든 단계의 수치 표", "Numeric table of every update")}</summary>
      <div className="optimization-trace-table-scroll" role="region" aria-label={t("단계별 수치 표", "Values by update")} tabIndex={0}>
        <table>
          <caption>{t("각 단계의 W, 그 위치의 gradient, 변환 전 loss", "W, gradient at W, and untransformed loss at each update")}</caption>
          <thead><tr><th scope="col">{t("단계", "Update")}</th><th scope="col">W [bias, slope]</th><th scope="col">∇L [bias, slope]</th><th scope="col">loss (MSE)</th></tr></thead>
          <tbody>{simulation.snapshots.map((row) => <tr key={row.step} data-selected={row.step === snapshot.step}>
            <th scope="row"><button type="button" aria-pressed={row.step === snapshot.step} onClick={() => setSelectedStep(row.step)}
              aria-label={t(`단계 ${row.step} 선택`, `Select update ${row.step}`)}>{row.step}</button></th>
            <td>[{number(row.weights.bias)}, {number(row.weights.slope)}]</td>
            <td>[{number(row.gradient.bias)}, {number(row.gradient.slope)}]</td><td>{number(row.loss)}</td>
          </tr>)}</tbody>
        </table>
      </div>
    </details>
  </div>;
}

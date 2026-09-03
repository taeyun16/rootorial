import { useEffect, useMemo, useRef, useState } from "react";
import { PythonCode } from "./PythonCode";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";

type Vector = [number, number];

function drawArrow(
  context: CanvasRenderingContext2D,
  origin: { x: number; y: number },
  vector: Vector,
  scale: number,
  color: string,
  label: string,
  dashed = false,
) {
  const endX = origin.x + vector[0] * scale;
  const endY = origin.y - vector[1] * scale;
  const angle = Math.atan2(endY - origin.y, endX - origin.x);

  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 3;
  if (dashed) context.setLineDash([7, 7]);
  context.beginPath();
  context.moveTo(origin.x, origin.y);
  context.lineTo(endX, endY);
  context.stroke();
  context.setLineDash([]);
  context.beginPath();
  context.moveTo(endX, endY);
  context.lineTo(endX - 12 * Math.cos(angle - Math.PI / 6), endY - 12 * Math.sin(angle - Math.PI / 6));
  context.lineTo(endX - 12 * Math.cos(angle + Math.PI / 6), endY - 12 * Math.sin(angle + Math.PI / 6));
  context.closePath();
  context.fill();
  context.font = "600 14px ui-monospace, SFMono-Regular, monospace";
  context.fillText(label, endX + 10, endY - 10);
  context.restore();
}

export function VectorExplorer() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [v, setV] = useState<Vector>([3, 2]);
  const [w, setW] = useState<Vector>([-1, 3]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const metrics = useMemo(() => {
    const dot = v[0] * w[0] + v[1] * w[1];
    const normV = Math.hypot(...v);
    const normW = Math.hypot(...w);
    const cosine = normV && normW ? dot / (normV * normW) : null;
    const angle = cosine === null
      ? null
      : Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI);
    return { dot, normV, normW, cosine, angle };
  }, [v, w]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;

    const rect = canvas.getBoundingClientRect();
    const ratio = window.devicePixelRatio || 1;
    canvas.width = rect.width * ratio;
    canvas.height = rect.height * ratio;
    context.scale(ratio, ratio);

    const width = rect.width;
    const height = rect.height;
    const origin = { x: width / 2, y: height / 2 };
    const scale = Math.min(width / 10, height / 10);

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(70, 93, 106, 0.11)";
    context.lineWidth = 1;

    for (let x = origin.x % scale; x < width; x += scale) {
      context.beginPath();
      context.moveTo(x, 0);
      context.lineTo(x, height);
      context.stroke();
    }
    for (let y = origin.y % scale; y < height; y += scale) {
      context.beginPath();
      context.moveTo(0, y);
      context.lineTo(width, y);
      context.stroke();
    }

    context.strokeStyle = "rgba(37, 36, 32, 0.42)";
    context.beginPath();
    context.moveTo(0, origin.y);
    context.lineTo(width, origin.y);
    context.moveTo(origin.x, 0);
    context.lineTo(origin.x, height);
    context.stroke();

    drawArrow(context, origin, v, scale, "#365548", "v");
    drawArrow(context, origin, w, scale, "#465d6a", "w");
  }, [v, w]);

  function slider(
    vectorName: "v" | "w",
    label: string,
    value: number,
    onChange: (value: number) => void,
    color: "green" | "indigo",
  ) {
    return (
      <label className={`vector-slider vector-slider-${color}`}>
        <span>{label}</span>
        <input
          type="range"
          aria-label={isKo ? `${vectorName}의 ${label} 좌표` : `${vectorName} ${label} coordinate`}
          min="-4"
          max="4"
          step="0.5"
          value={value}
          onChange={(event) => onChange(Number(event.target.value))}
        />
        <output>{value.toFixed(1)}</output>
      </label>
    );
  }

  return (
    <div className="vector-explorer">
      <div className="vector-canvas-wrap">
        <canvas
          ref={canvasRef}
          className="vector-canvas"
          role="img"
          aria-label={isKo ? "벡터 v와 w의 방향을 비교하는 좌표 평면" : "Coordinate plane comparing the directions of vectors v and w"}
          aria-describedby="vector-explorer-description"
        />
        <div className="canvas-legend" aria-hidden="true">
          <span><i className="legend-v" /> v</span>
          <span><i className="legend-w" /> w</span>
        </div>
      </div>
      <div className="vector-controls">
        <div className="control-group">
          <div className="control-heading">
            <span className="vector-chip vector-chip-v">v</span>
            <PythonCode>{`[${v.join(", ")}]`}</PythonCode>
          </div>
          {slider("v", "x", v[0], (value) => setV([value, v[1]]), "green")}
          {slider("v", "y", v[1], (value) => setV([v[0], value]), "green")}
        </div>
        <div className="control-group">
          <div className="control-heading">
            <span className="vector-chip vector-chip-w">w</span>
            <PythonCode>{`[${w.join(", ")}]`}</PythonCode>
          </div>
          {slider("w", "x", w[0], (value) => setW([value, w[1]]), "indigo")}
          {slider("w", "y", w[1], (value) => setW([w[0], value]), "indigo")}
        </div>
        <div className="vector-presets" aria-label={isKo ? "관계 프리셋" : "Relationship presets"}>
          <span>{isKo ? "빠른 실험" : "QUICK EXPERIMENTS"}</span>
          <div>
            <button type="button" onClick={() => { setV([3, 2]); setW([6, 4]); }}>{isKo ? "같은 방향" : "Same direction"}</button>
            <button type="button" onClick={() => { setV([3, 0]); setW([0, 3]); }}>{isKo ? "직각" : "Perpendicular"}</button>
            <button type="button" onClick={() => { setV([3, 2]); setW([-3, -2]); }}>{isKo ? "반대 방향" : "Opposite directions"}</button>
            <button type="button" onClick={() => { setV([0, 0]); setW([2, 1]); }}>{isKo ? "영벡터" : "Zero vector"}</button>
          </div>
        </div>
        <div role="status" aria-live="polite" id="vector-explorer-description">
        <dl className="metric-grid">
          <div><dt>{isKo ? "내적" : "Dot product"}</dt><dd>{metrics.dot.toFixed(2)}</dd></div>
          <div><dt>{isKo ? "각도" : "Angle"}</dt><dd>{metrics.angle === null ? (isKo ? "정의 안 됨" : "Undefined") : `${metrics.angle.toFixed(1)}°`}</dd></div>
          <div><dt><MathFormula latex={String.raw`\lVert \mathbf{v} \rVert_2`} /></dt><dd>{metrics.normV.toFixed(2)}</dd></div>
          <div><dt><MathFormula latex={String.raw`\cos\theta`} /></dt><dd>{metrics.cosine === null ? (isKo ? "정의 안 됨" : "Undefined") : metrics.cosine.toFixed(3)}</dd></div>
        </dl>
        <div className="dot-breakdown" aria-label={isKo ? "내적의 원소별 계산" : "Element-wise dot-product calculation"}>
          <span>{isKo ? "원소별로 곱하고 모두 더하기" : "Multiply matching values, then add"}</span>
          <div aria-hidden="true">
            <strong>{v[0].toFixed(1)}</strong><i>×</i><strong>{w[0].toFixed(1)}</strong>
            <em>+</em>
            <strong>{v[1].toFixed(1)}</strong><i>×</i><strong>{w[1].toFixed(1)}</strong>
            <em>=</em>
            <output>{metrics.dot.toFixed(2)}</output>
          </div>
        </div>
        <p className="metric-insight">
          {metrics.cosine === null
            ? (isKo ? "영벡터에는 방향이 없어 각도와 코사인 유사도를 정의할 수 없습니다." : "The zero vector has no direction, so its angle and cosine similarity are undefined.")
            : metrics.dot > 0.1
            ? (isKo ? "두 벡터는 대체로 같은 방향을 바라봅니다." : "The two vectors point mostly in the same direction.")
            : metrics.dot < -0.1
              ? (isKo ? "두 벡터는 서로 반대 방향을 바라봅니다." : "The two vectors point in opposite directions.")
              : (isKo ? "두 벡터는 거의 직각입니다. 내적이 0에 가깝습니다." : "The two vectors are nearly perpendicular, so their dot product is close to zero.")}
        </p>
        </div>
      </div>
    </div>
  );
}

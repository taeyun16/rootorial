import { useEffect, useMemo, useRef, useState } from "react";
import { PythonCode } from "./PythonCode";

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
  const [v, setV] = useState<Vector>([3, 2]);
  const [w, setW] = useState<Vector>([-1, 3]);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const metrics = useMemo(() => {
    const dot = v[0] * w[0] + v[1] * w[1];
    const normV = Math.hypot(...v);
    const normW = Math.hypot(...w);
    const cosine = normV && normW ? dot / (normV * normW) : 0;
    const angle = Math.acos(Math.max(-1, Math.min(1, cosine))) * (180 / Math.PI);
    const projectionScale = normV ? dot / (normV * normV) : 0;
    const projection: Vector = [v[0] * projectionScale, v[1] * projectionScale];
    return { dot, normV, normW, cosine, angle, projection };
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
    const scale = Math.min(width / 14, height / 10);

    context.clearRect(0, 0, width, height);
    context.strokeStyle = "rgba(55, 65, 81, 0.11)";
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

    context.strokeStyle = "rgba(15, 23, 42, 0.42)";
    context.beginPath();
    context.moveTo(0, origin.y);
    context.lineTo(width, origin.y);
    context.moveTo(origin.x, 0);
    context.lineTo(origin.x, height);
    context.stroke();

    drawArrow(context, origin, metrics.projection, scale, "#d97757", "projᵥ(w)", true);
    drawArrow(context, origin, v, scale, "#1d4f45", "v");
    drawArrow(context, origin, w, scale, "#5b5bd6", "w");
  }, [metrics.projection, v, w]);

  function slider(
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
        <canvas ref={canvasRef} className="vector-canvas" aria-label="벡터 v, w와 투영을 보여주는 좌표 평면" />
        <div className="canvas-legend" aria-hidden="true">
          <span><i className="legend-v" /> v</span>
          <span><i className="legend-w" /> w</span>
          <span><i className="legend-p" /> 투영</span>
        </div>
      </div>
      <div className="vector-controls">
        <div className="control-group">
          <div className="control-heading">
            <span className="vector-chip vector-chip-v">v</span>
            <PythonCode>{`[${v.join(", ")}]`}</PythonCode>
          </div>
          {slider("x", v[0], (value) => setV([value, v[1]]), "green")}
          {slider("y", v[1], (value) => setV([v[0], value]), "green")}
        </div>
        <div className="control-group">
          <div className="control-heading">
            <span className="vector-chip vector-chip-w">w</span>
            <PythonCode>{`[${w.join(", ")}]`}</PythonCode>
          </div>
          {slider("x", w[0], (value) => setW([value, w[1]]), "indigo")}
          {slider("y", w[1], (value) => setW([w[0], value]), "indigo")}
        </div>
        <dl className="metric-grid">
          <div><dt>내적</dt><dd>{metrics.dot.toFixed(2)}</dd></div>
          <div><dt>각도</dt><dd>{Number.isFinite(metrics.angle) ? `${metrics.angle.toFixed(1)}°` : "—"}</dd></div>
          <div><dt>‖v‖</dt><dd>{metrics.normV.toFixed(2)}</dd></div>
          <div><dt>cos θ</dt><dd>{metrics.cosine.toFixed(3)}</dd></div>
        </dl>
        <p className="metric-insight">
          {metrics.dot > 0.1
            ? "두 벡터는 대체로 같은 방향을 바라봅니다."
            : metrics.dot < -0.1
              ? "두 벡터는 서로 반대 방향을 바라봅니다."
              : "두 벡터는 거의 직각입니다. 내적이 0에 가깝습니다."}
        </p>
      </div>
    </div>
  );
}

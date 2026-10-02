import { useId } from "react";
import type { KeyboardEvent } from "react";
import type { ConceptVector } from "./ThreeVectorScene";
import "./vector-plane-fallback.css";

type Props = {
  value: ConceptVector;
  locale: "ko" | "en";
  reason: "save-data" | "unavailable";
  onChange: (value: ConceptVector) => void;
  onKeyDown: (event: KeyboardEvent<SVGSVGElement>) => void;
  announcement: string;
};

export function VectorPlaneFallback({ value, locale, reason, onChange, onKeyDown, announcement }: Props) {
  const id = useId();
  const ko = locale === "ko";
  const clamp = (n: number) => Math.max(-2.5, Math.min(2.5, n));
  const instructions = ko
    ? "좌표 평면을 한 번 탭하거나 방향키로 이동하세요. Shift와 방향키는 0.5씩 이동합니다. 아래 숫자로도 입력할 수 있습니다."
    : "Tap the plane or use arrow keys. Hold Shift for steps of 0.5. You can also enter coordinates below.";
  const length = Math.hypot(value.x, value.y);
  return (
    <div className="three-vector-fallback vector-plane-fallback" tabIndex={-1}
      onFocus={(event) => { if (event.target === event.currentTarget) event.currentTarget.querySelector("svg")?.focus(); }}>
      <p>{ko
        ? (reason === "save-data" ? "데이터 절약 모드: 2D 좌표로 탐색합니다." : "3D를 사용할 수 없어 2D 좌표로 탐색합니다.")
        : (reason === "save-data" ? "Data saver: explore the 2D plane." : "3D is unavailable: explore the 2D plane.")}</p>
      <svg viewBox="-3 -3 6 6" role="application" tabIndex={0}
        aria-label={ko ? "2D 벡터 좌표 평면" : "2D vector coordinate plane"}
        aria-describedby={`${id}-instructions`} onKeyDown={onKeyDown}
        onPointerDown={(event) => {
          // Use the SVG transform so taps stay accurate when the viewport is letterboxed.
          const transform = event.currentTarget.getScreenCTM();
          if (!transform) return;
          const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
          event.currentTarget.focus({ preventScroll: true });
          onChange({ x: Math.round(clamp(point.x) * 10) / 10, y: Math.round(clamp(-point.y) * 10) / 10 });
        }}>
        <defs><marker id={`${id}-arrow`} markerWidth="5" markerHeight="5" refX="4" refY="2.5" orient="auto"><path d="M0,0 L5,2.5 L0,5 Z" fill="currentColor" /></marker></defs>
        <g aria-hidden="true">
          {[-2, -1, 0, 1, 2].map((n) => <g key={n}>
            <path className={n === 0 ? "vector-plane-axis" : "vector-plane-grid"} d={`M${n},-2.5 V2.5 M-2.5,${n} H2.5`} />
            {n !== 0 ? <><text x={n} y="0.28" textAnchor="middle">{n}</text><text x="0.12" y={-n + 0.08}>{n}</text></> : <text x="0.12" y="0.28">0</text>}
          </g>)}
          <text x="2.65" y="0.25">x</text><text x="0.1" y="-2.65">y</text>
          <path className="vector-plane-guides" d={`M${value.x},0 V${-value.y} H0`} />
          {length > 0.01 ? <path className="vector-plane-arrow" d={`M0,0 L${value.x},${-value.y}`} markerEnd={`url(#${id}-arrow)`} /> : null}
          <circle cx={value.x} cy={-value.y} r="0.09" fill="currentColor" />
        </g>
      </svg>
      <div className="vector-plane-inputs">
        {(["x", "y"] as const).map((axis) => <label key={axis}>
          <span>{axis}</span><input type="number" min={-2.5} max={2.5} step={0.1}
            aria-label={ko ? `2D 벡터 ${axis} 좌표` : `2D vector ${axis} coordinate`}
            value={Number(value[axis].toFixed(2))} onChange={(event) => {
              const next = event.currentTarget.valueAsNumber;
              if (Number.isFinite(next)) onChange({ ...value, [axis]: clamp(next) });
            }} />
        </label>)}
      </div>
      <p id={`${id}-instructions`}>{instructions}</p>
      <span className="sr-only" role="status">{announcement}</span>
    </div>
  );
}

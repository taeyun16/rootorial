import { useId, useState } from "react";
import type { vectorOperationTrace, Vector2 } from "../features/learning/vector-operation";
import "./vector-operation.css";
import { MathFormula } from "./MathFormula";

export function VectorOperationPlot({ trace, isKo }: { trace: ReturnType<typeof vectorOperationTrace>; isKo: boolean }) {
  const id = useId().replaceAll(":", "");
  const [axis, setAxis] = useState<0 | 1>(0);
  const vectors: Array<{ name: string; value: Vector2; color: string }> = [
    { name: "v", value: trace.v, color: "#28634e" },
    ...(["add", "subtract"].includes(trace.operation) ? [{ name: "w", value: trace.w, color: "#a04d2c" }] : []),
    { name: "r", value: trace.result, color: "#6f43aa" },
  ];
  const limit = Math.max(1, Math.ceil(Math.max(...vectors.flatMap(v => v.value.map(Math.abs)))));
  const scale = 140 / limit;
  const point = (v: Vector2) => [180 + v[0] * scale, 180 - v[1] * scale];
  const n = (v: number) => Number(v.toFixed(3));
  const start: Vector2 = trace.operation === "subtract" ? trace.w : trace.v;
  const end: Vector2 = trace.operation === "subtract" ? trace.v : trace.result;
  return <figure className="vector-operation-plot">
    <div role="group" aria-label={isKo ? "수식의 성분 강조" : "Highlight a coordinate"}>
      {[0, 1].map(i => <button type="button" key={i} aria-pressed={axis === i} onClick={() => setAxis(i as 0 | 1)}>{i === 0 ? "x · 1" : "y · 2"}</button>)}
    </div>
    <p aria-live="polite"><MathFormula latex={`r_${axis + 1} = ${trace.operation === "scale" ? `${n(trace.scalar)} \\times (${n(trace.v[axis])})` : `(${n(trace.v[axis])}) ${trace.operation === "add" ? "+" : "-"} (${n(trace.w[axis])})`} = ${n(trace.result[axis])}`} /></p>
    <svg viewBox="0 0 360 360" role="img" aria-label={isKo ? "입력 벡터와 계산 결과 r의 좌표 그림" : "Input vectors and computed result r"}>
      <title>{vectors.map(v => `${v.name} = [${v.value.map(n).join(", ")}]`).join("; ")}</title>
      <defs>{vectors.map(v => <marker key={v.name} id={`${id}-${v.name}`} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto"><path d="M0 0 L10 5 L0 10Z" fill={v.color} /></marker>)}</defs>
      {[-limit, 0, limit].map(t => <g key={t} fill="#47564f" fontSize="11"><line x1={180 + t * scale} y1="30" x2={180 + t * scale} y2="330" stroke="#ccd4cf" /><line x1="30" y1={180 - t * scale} x2="330" y2={180 - t * scale} stroke="#ccd4cf" /><text x={180 + t * scale} y="349" textAnchor="middle">{t}</text><text x="8" y={184 - t * scale}>{t}</text></g>)}
      <text x="340" y="175">x</text><text x="185" y="20">y</text>
      {vectors.map(v => { const [x, y] = point(v.value); return <g key={v.name}>
        <line x1="180" y1="180" x2={x} y2={y} stroke={v.color} strokeWidth={v.name === "r" ? 3.5 : 2} strokeDasharray={v.name === "w" ? "7 3" : undefined} markerEnd={Math.hypot(...v.value) ? `url(#${id}-${v.name})` : undefined} />
        <circle cx={x} cy={y} r={v.name === "r" ? 4 : 2} fill={v.color} />
        <line x1={axis === 0 ? 180 : x} y1={axis === 0 ? y : 180} x2={x} y2={y} stroke={v.color} strokeDasharray="3 4" opacity=".7" />
        <text x={Math.min(320, x + 7)} y={Math.max(28, y - 7)} fill={v.color} fontWeight="700">{v.name}</text>
      </g>; })}
      {["add", "subtract"].includes(trace.operation) && <line x1={point(start)[0]} y1={point(start)[1]} x2={point(end)[0]} y2={point(end)[1]} stroke="#6f43aa" strokeWidth="2" strokeDasharray="5 4" markerEnd={`url(#${id}-r)`} />}
    </svg>
    <figcaption>
      {["add", "subtract"].includes(trace.operation) && <p>{isKo ? "점선 연결 화살표는 덧셈의 연속 이동, 뺄셈에서는 w의 끝에서 v의 끝으로 향하는 차이를 나타냅니다." : "The dashed connecting arrow shows consecutive movement for addition, or the difference from w to v for subtraction."}</p>}
      <table><caption>{isKo ? "같은 계산에서 얻은 좌표" : "Coordinates from the same calculation"}</caption><thead><tr><th>{isKo ? "벡터" : "Vector"}</th><th scope="col">x</th><th scope="col">y</th></tr></thead><tbody>{vectors.map(v => <tr key={v.name}><th scope="row">{v.name}</th>{v.value.map((value, i) => <td key={i} className={axis === i ? "is-highlighted" : ""}>{n(value)}</td>)}</tr>)}</tbody></table>
    </figcaption>
  </figure>;
}

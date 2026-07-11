import { MathFormula } from "./MathFormula";

type Vector2 = readonly [number, number];

type UnitVectorPlotProps = {
  vector: Vector2;
  sourceVector?: Vector2;
  locale: "ko" | "en";
};

function formatNumber(value: number) {
  return Math.abs(value) < 0.0005 ? "0" : Number(value.toFixed(3)).toString();
}

export function UnitVectorPlot({ vector, sourceVector, locale }: UnitVectorPlotProps) {
  const isKo = locale === "ko";
  const [x, y] = vector;
  const origin = { x: 210, y: 150 };
  const scale = 104;
  const endpoint = {
    x: origin.x + x * scale,
    y: origin.y - y * scale,
  };
  const xLabelY = origin.y + (y >= 0 ? 22 : -12);
  const yLabelX = endpoint.x + (x >= 0 ? 13 : -13);
  const sourceLatex = sourceVector
    ? String.raw`[${formatNumber(sourceVector[0])},${formatNumber(sourceVector[1])}]`
    : String.raw`\mathbf v`;
  const normalizedLatex = String.raw`[${formatNumber(x)},${formatNumber(y)}]`;
  const proofLatex = String.raw`\sqrt{${formatNumber(x)}^2 + ${formatNumber(y)}^2} = ${formatNumber(Math.hypot(x, y))}`;

  return (
    <figure className="unit-vector-plot">
      <div className="unit-vector-plot-canvas">
        <svg
          viewBox="0 0 420 300"
          role="img"
          aria-labelledby="unit-vector-plot-title unit-vector-plot-description"
        >
          <title id="unit-vector-plot-title">
            {isKo ? "단위원 위에 놓인 정규화 벡터" : "Normalized vector on the unit circle"}
          </title>
          <desc id="unit-vector-plot-description">
            {isKo
              ? `정규화 벡터의 끝점은 ${formatNumber(x)}, ${formatNumber(y)}이고 원점에서 끝점까지의 거리는 1입니다.`
              : `The normalized vector ends at ${formatNumber(x)}, ${formatNumber(y)}, one unit from the origin.`}
          </desc>
          <defs>
            <marker id="unit-vector-arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
              <path d="M 0 0 L 10 5 L 0 10 z" />
            </marker>
          </defs>

          <g className="unit-vector-grid" aria-hidden="true">
            {[-1, -0.5, 0.5, 1].map((tick) => (
              <g key={tick}>
                <line x1={origin.x + tick * scale} y1="18" x2={origin.x + tick * scale} y2="282" />
                <line x1="72" y1={origin.y - tick * scale} x2="348" y2={origin.y - tick * scale} />
              </g>
            ))}
          </g>

          <circle className="unit-vector-circle" cx={origin.x} cy={origin.y} r={scale} />
          <g className="unit-vector-axes" aria-hidden="true">
            <line x1="62" y1={origin.y} x2="360" y2={origin.y} />
            <line x1={origin.x} y1="8" x2={origin.x} y2="290" />
            <text x="365" y={origin.y + 5}>x</text>
            <text x={origin.x + 7} y="14">y</text>
            <text x={origin.x - 13} y={origin.y + 17}>0</text>
            <text x={origin.x + scale - 3} y={origin.y + 17}>1</text>
            <text x={origin.x - scale - 10} y={origin.y + 17}>−1</text>
            <text x={origin.x + 7} y={origin.y - scale + 4}>1</text>
            <text x={origin.x + 7} y={origin.y + scale + 4}>−1</text>
          </g>

          <g className="unit-vector-projections" aria-hidden="true">
            <line x1={origin.x} y1={origin.y} x2={endpoint.x} y2={origin.y} />
            <line x1={endpoint.x} y1={origin.y} x2={endpoint.x} y2={endpoint.y} />
            <text x={(origin.x + endpoint.x) / 2} y={xLabelY} textAnchor="middle">x = {formatNumber(x)}</text>
            <text x={yLabelX} y={(origin.y + endpoint.y) / 2} textAnchor={x >= 0 ? "start" : "end"}>y = {formatNumber(y)}</text>
          </g>

          <line
            className="unit-vector-arrow"
            x1={origin.x}
            y1={origin.y}
            x2={endpoint.x}
            y2={endpoint.y}
            markerEnd="url(#unit-vector-arrow)"
          />
          <circle className="unit-vector-endpoint" cx={endpoint.x} cy={endpoint.y} r="5" />
          <g className="unit-vector-length" aria-hidden="true">
            <rect x={(origin.x + endpoint.x) / 2 - 22} y={(origin.y + endpoint.y) / 2 - 21} width="44" height="22" rx="2" />
            <text x={(origin.x + endpoint.x) / 2} y={(origin.y + endpoint.y) / 2 - 6} textAnchor="middle">{isKo ? "길이 1" : "length 1"}</text>
          </g>
        </svg>
      </div>

      <figcaption>
        <div className="unit-vector-plot-proof">
          <span>{isKo ? "원점에서 끝점까지의 거리" : "Distance from the origin"}</span>
          <MathFormula latex={proofLatex} display />
        </div>
        <p>
          {isKo ? (
            <>
              <MathFormula latex={normalizedLatex} />의 두 숫자는 좌표이고, 두 좌표로 만든 직각삼각형의 빗변이 <MathFormula latex="1" />입니다.
              따라서 <MathFormula latex={sourceLatex} />와 방향은 같지만 길이는 정확히 <MathFormula latex="1" />입니다.
            </>
          ) : (
            <>
              The two numbers in <MathFormula latex={normalizedLatex} /> are coordinates. The right triangle they form has a hypotenuse of <MathFormula latex="1" />.
              It keeps the direction of <MathFormula latex={sourceLatex} /> while making its length exactly <MathFormula latex="1" />.
            </>
          )}
        </p>
      </figcaption>
    </figure>
  );
}

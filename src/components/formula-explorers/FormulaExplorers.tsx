import { useId, useState, type ReactNode } from "react";
import { useLocale } from "../../features/localization/localization";
import { binarySample, cosineExample, finiteDifference, layerNormExample, positionExample } from "./formula-model";
import "./formula-explorers.css";

type Point = [number, number];
type Series = { name: string; points: Point[]; dashed?: boolean };
const fmt = (n: number) => Math.abs(n) < 0.00005 ? "0" : Number(n.toFixed(4)).toString();
const samples = (min: number, max: number, fn: (x: number) => number): Point[] => Array.from({ length: 129 }, (_, i) => { const x = min + (max - min) * i / 128; return [x, fn(x)]; });
function useText() { const { locale } = useLocale(); return (ko: string, en: string) => locale === "ko" ? ko : en; }

function Frame({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  const t = useText();
  return <aside className="formula-explorer" data-formula-explorer={id} aria-label={title}>
    <h3>{title}</h3><p className="formula-explorer-note">{t("설명용 예제 · 값을 바꾸면 그림과 숫자가 함께 갱신됩니다. 필수 실습의 채점에는 반영되지 않습니다.", "Explanatory example · Controls update the plot and numbers together. This does not affect required lab grading.")}</p>{children}
  </aside>;
}
function Slider({ label, value, min, max, step = 1, change }: { label: string; value: number; min: number; max: number; step?: number; change: (n: number) => void }) {
  const id = useId();
  return <label className="formula-explorer-control" htmlFor={id}><span>{label}: <strong>{fmt(value)}</strong></span><input id={id} type="range" min={min} max={max} step={step} value={value} onChange={(e) => change(Number(e.target.value))} /></label>;
}
function Plot({ title, series, xDomain, yDomain, xLabel, yLabel, markers = [], roomyLabels = false }: { title: string; series: Series[]; xDomain: Point; yDomain: Point; xLabel: string; yLabel: string; markers?: Point[]; roomyLabels?: boolean }) {
  const id = useId();
  const sx = (n: number) => 50 + (n - xDomain[0]) / (xDomain[1] - xDomain[0]) * 300;
  const sy = (n: number) => 190 - (n - yDomain[0]) / (yDomain[1] - yDomain[0]) * 160;
  return <figure className="formula-explorer-plot"><svg viewBox={roomyLabels ? "0 0 390 260" : "0 0 390 235"} role="img" aria-labelledby={id}>
    <title id={id}>{title}</title>
    {[0, .5, 1].map((fraction) => { const x = xDomain[0] + fraction * (xDomain[1] - xDomain[0]); const y = yDomain[0] + fraction * (yDomain[1] - yDomain[0]); return <g key={fraction} className="formula-explorer-axis"><line x1={sx(x)} x2={sx(x)} y1="30" y2="190" /><line x1="50" x2="350" y1={sy(y)} y2={sy(y)} /><text x={sx(x)} y={roomyLabels ? 218 : 207} textAnchor="middle">{fmt(x)}</text><text x="43" y={sy(y) + 4} textAnchor="end">{fmt(y)}</text></g>; })}
    {series.map((line, index) => <polyline key={line.name} className={`formula-series formula-series-${index % 4}`} points={line.points.map(([x, y]) => `${sx(x)},${sy(y)}`).join(" ")} strokeDasharray={line.dashed ? "6 4" : undefined} />)}
    {markers.map(([x, y], index) => <circle key={index} cx={sx(x)} cy={sy(y)} r="4.5" className="formula-explorer-marker" />)}
    <text x="200" y={roomyLabels ? 252 : 228} textAnchor="middle">{xLabel}</text><text x="50" y="18">{yLabel}</text>
  </svg><figcaption>{series.map((line, index) => <span className={`formula-legend formula-series-${index % 4}`} key={line.name}>{line.dashed ? "┄" : "━"} {line.name}</span>)}</figcaption></figure>;
}

export function FiniteDifferenceExplorer() {
  const t = useText(); const [x, setX] = useState(.6); const [epsilon, setEpsilon] = useState(.5); const result = finiteDifference(x, epsilon);
  return <Frame id="finite-difference" title={t("ε를 줄이며 할선과 접선 비교", "Compare secant and tangent as ε shrinks")}>
    <p>{t("차이를 보기 위해 L(w)=w⁴/4를 사용합니다. 앞의 이차 MSE와 다른 예제입니다. 접선 기울기는 w³이고, 중앙차분 오차는 wε²입니다. ε를 무조건 작게 하면 부동소수점 오차도 커질 수 있습니다.", "Use L(w)=w⁴/4 to expose the difference; this is separate from the quadratic MSE above. The tangent slope is w³ and central-difference error is wε². Arbitrarily small ε can also amplify floating-point error.")}</p>
    <div className="formula-explorer-controls"><Slider label="w" value={x} min={-1} max={1} step={.1} change={setX}/><Slider label="ε" value={epsilon} min={.05} max={1} step={.05} change={setEpsilon}/></div>
    <Plot title={t("손실 곡선과 선택점의 할선·접선. 아래에 기울기 숫자가 있습니다.", "Loss curve with secant and tangent at the selected point; slopes are listed below.")} xDomain={[-2, 2]} yDomain={[-2, 4]} xLabel="w" yLabel="L(w)" series={[
      { name: "L(w)=w⁴/4", points: samples(-2, 2, (w) => w ** 4 / 4) },
      { name: t("할선", "Secant"), points: [[x - epsilon, result.left], [x + epsilon, result.right]] },
      { name: t("접선", "Tangent"), dashed: true, points: [[x - epsilon, result.loss - epsilon * result.analytic], [x + epsilon, result.loss + epsilon * result.analytic]] },
    ]} markers={[[x - epsilon, result.left], [x + epsilon, result.right]]}/>
    <p role="status">L(w−ε)={fmt(result.left)} · L(w+ε)={fmt(result.right)}<br/>{t("할선", "Secant")}: ({fmt(result.right)}−{fmt(result.left)}) / {fmt(2 * epsilon)} = <strong>{fmt(result.numeric)}</strong> · {t("접선", "Tangent")}: <strong>{fmt(result.analytic)}</strong> · {t("차이", "Difference")}: {fmt(result.numeric - result.analytic)}</p>
  </Frame>;
}

export function SigmoidBceExplorer() {
  const t = useText(); const [z, setZ] = useState(0); const [label, setLabel] = useState(1); const result = binarySample(z, label);
  return <Frame id="sigmoid-bce" title={t("한 표본의 z → 확률 → BCE", "One sample: z → probability → BCE")}>
    <div className="formula-explorer-controls"><Slider label="z" value={z} min={-6} max={6} step={.1} change={setZ}/><Slider label={t("정답 y", "Label y")} value={label} min={0} max={1} change={setLabel}/></div>
    <p>{t("두 그림의 검은 점은 같은 z를 가리킵니다. y는 손실 곡선을 바꾸지만 sigmoid 자체를 바꾸지는 않습니다. 로그는 자연로그입니다.", "Both black dots use the same z. Changing y changes the loss curve, but not sigmoid itself. The logarithm is natural log.")}</p>
    <Plot roomyLabels title="p=σ(z)" xDomain={[-6,6]} yDomain={[0,1]} xLabel="z" yLabel="p" series={[{name:"σ(z)",points:samples(-6,6,(v)=>binarySample(v,label).probability)}]} markers={[[z,result.probability]]}/>
    <Plot roomyLabels title={`BCE(y=${label}, σ(z))`} xDomain={[-6,6]} yDomain={[0,6.1]} xLabel="z" yLabel="BCE" series={[{name:`BCE(y=${label}, σ(z))`,points:samples(-6,6,(v)=>binarySample(v,label).loss)}]} markers={[[z,result.loss]]}/>
    <p role="status">z={fmt(z)} → p={fmt(result.probability)} → BCE={fmt(result.loss)}<br/>∂L/∂z = p−y = <strong>{fmt(result.gradient)}</strong></p>
  </Frame>;
}

export function CosineExplorer() {
  const t = useText(); const [angle, setAngle] = useState(60); const [magnitude, setMagnitude] = useState(2); const result = cosineExample(angle,magnitude); const id = useId();
  const px = (x:number)=>180+x*45; const py = (y:number)=>180-y*45;
  return <Frame id="cosine-angle" title={t("길이와 각도를 따로 바꿔 보기", "Change length and angle separately")}>
    <div className="formula-explorer-controls"><Slider label="θ (°)" value={angle} min={0} max={180} change={setAngle}/><Slider label="‖b‖" value={magnitude} min={0} max={3} step={.1} change={setMagnitude}/></div>
    <p>{t("a=[1,0]을 고정한 2D 예제입니다. b의 양의 길이를 바꿔도 cosine은 유지됩니다. 길이가 0이면 각도와 cosine은 정의되지 않습니다.", "A 2D example with fixed a=[1,0]. A positive change in b’s length preserves cosine. At zero length, its angle and cosine are undefined.")}</p>
    <svg className="formula-explorer-angle" viewBox="0 0 360 245" role="img" aria-labelledby={id}><title id={id}>{t("두 벡터의 방향. 좌표와 cosine은 아래에 표시됩니다.", "Directions of two vectors; coordinates and cosine are listed below.")}</title><defs><marker id={`${id}-arrow`} markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto-start-reverse"><path d="M0,0 L6,3 L0,6 Z" fill="context-stroke"/></marker></defs><g className="formula-explorer-axis"><line x1="20" y1="180" x2="340" y2="180"/><line x1="180" y1="20" x2="180" y2="225"/>{[-3,-1,0,1,3].map(n=><text key={n} x={px(n)} y="202" textAnchor="middle">{n}</text>)}<text x="187" y="47">3</text><text x="330" y="172">x</text><text x="190" y="20">y</text></g><line className="formula-series formula-series-0" x1="180" y1="180" x2="225" y2="180" markerEnd={`url(#${id}-arrow)`}/><text x="228" y="171">a</text>{magnitude>0&&<><path d={`M210,180 A30,30 0 0,0 ${px(Math.cos(angle*Math.PI/180)*2/3)},${py(Math.sin(angle*Math.PI/180)*2/3)}`} fill="none" stroke="currentColor"/><line className="formula-series formula-series-1" x1="180" y1="180" x2={px(result.b[0])} y2={py(result.b[1])} markerEnd={`url(#${id}-arrow)`}/><text x={px(result.b[0])+6} y={py(result.b[1])-8}>b</text></>}</svg>
    <p role="status">a=[1,0] · b=[{result.b.map(fmt).join(", ")}] · a·b={fmt(result.dot)}<br/>cos(a,b) = <strong>{result.cosine===null?t("정의되지 않음 (분모 0)","undefined (zero denominator)"): `${fmt(result.dot)} / (1 × ${fmt(magnitude)}) = ${fmt(result.cosine)}`}</strong></p>
  </Frame>;
}

export function PositionWaveExplorer() {
  const t = useText(); const [position,setPosition]=useState(8); const [pair,setPair]=useState(0); const result=positionExample(position,pair);
  return <Frame id="position-wave" title={t("차원 쌍마다 다른 위치 파형", "Position waves differ by dimension pair")}>
    <div className="formula-explorer-controls"><Slider label="t" value={position} min={0} max={64} change={setPosition}/><Slider label="i (d=8)" value={pair} min={0} max={3} change={setPair}/></div>
    <p>{t("d=8을 고정합니다. i가 커질수록 같은 t 범위에서 파형이 천천히 변합니다. 검은 점 두 개는 같은 위치의 sin/cos 값입니다.", "Fix d=8. Larger i changes more slowly over the same t range. Both dots show sin/cos at the same position.")}</p>
    <Plot title={t("선택 차원 쌍의 sin과 cos 파형", "Sin and cos waves for the selected dimension pair")} xDomain={[0,64]} yDomain={[-1,1]} xLabel="t" yLabel="P" series={[{name:`P[t,${2*pair}] · sin`,points:samples(0,64,(v)=>positionExample(v,pair).sin)},{name:`P[t,${2*pair+1}] · cos`,dashed:true,points:samples(0,64,(v)=>positionExample(v,pair).cos)}]} markers={[[position,result.sin],[position,result.cos]]}/>
    <p role="status">10000^(2i/d)={fmt(result.denominator)} · {t("주기", "Period")}= {fmt(result.wavelength)}<br/>t={position} → P[t,{2*pair}]={fmt(result.sin)} · P[t,{2*pair+1}]={fmt(result.cos)}</p>
  </Frame>;
}

export function LayerNormExplorer() {
  const t=useText(); const [last,setLast]=useState(5); const [constant,setConstant]=useState(false); const [gamma,setGamma]=useState(1); const [beta,setBeta]=useState(0); const values=constant?[last,last,last,last]:[1,2,3,last]; const result=layerNormExample(values,gamma,beta); const stages=[values,result.centered,result.normalized,result.output]; const names=[t("입력 x","Input x"),"x−μ","(x−μ)/√(σ²+ε)","γ × normalized + β"]; const bound=Math.max(6,...stages.flat().map(Math.abs));
  return <Frame id="layernorm-stages" title={t("한 token: 중심 이동 → 크기 정규화 → affine", "One token: center → normalize → affine")}>
    <p>{t("4개 feature의 모집단 분산을 사용합니다. 설명을 위해 모든 feature에 같은 γ와 β를 적용합니다. 실제 학습에서는 feature마다 다른 값을 가질 수 있습니다. ε=0.00001은 고정입니다.", "Use population variance across four features. For clarity, share γ and β across features; learned values may differ by feature. Fix ε=0.00001.")}</p>
    <div className="formula-explorer-controls"><Slider label={constant?t("모든 feature x","All features x"):"x[3]"} value={last} min={-5} max={5} step={.5} change={setLast}/><Slider label="γ" value={gamma} min={-2} max={2} step={.25} change={setGamma}/><Slider label="β" value={beta} min={-2} max={2} step={.25} change={setBeta}/></div>
    <label className="formula-explorer-toggle"><input type="checkbox" checked={constant} onChange={e=>setConstant(e.target.checked)}/>{t("모든 feature를 같게 만들기 (분산 0)","Make all features equal (zero variance)")}</label>
    <Plot title={t("같은 feature의 변환 단계. 정확한 값은 아래 표에 있습니다.","Transformation stages for the same features; exact values follow in the table.")} xDomain={[0,3]} yDomain={[-bound,bound]} xLabel={t("feature 번호","Feature index")} yLabel={t("값","Value")} series={stages.map((stage,index)=>({name:names[index],points:stage.map((value,i)=>[i,value] as Point),dashed:index>1}))}/>
    <p role="status">μ={fmt(result.mean)} · σ²={fmt(result.variance)} · γ={fmt(gamma)} · β={fmt(beta)}{constant&&<> · {t("정규화 값은 0, 최종 값은 β입니다.","Normalized values are zero; final values equal β.")}</>}</p>
    <div className="formula-explorer-table"><table><caption>{t("동일 계산에서 얻은 feature별 값","Per-feature values from the same calculation")}</caption><thead><tr><th scope="col">{t("단계","Stage")}</th>{[0,1,2,3].map(i=><th scope="col" key={i}>x[{i}]</th>)}</tr></thead><tbody>{stages.map((stage,i)=><tr key={names[i]}><th scope="row">{names[i]}</th>{stage.map((value,j)=><td key={j}>{fmt(value)}</td>)}</tr>)}</tbody></table></div>
  </Frame>;
}

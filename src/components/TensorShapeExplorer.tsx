import { useId, useState } from "react";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";
import { TensorDiagram, type TensorValues } from "./interactive/TensorDiagram";

type TensorStageId = "vector" | "sequence" | "batch";

type TensorStage = {
  id: TensorStageId;
  label: string;
  title: string;
  shape: string;
  rank: number;
  axes: string[];
  description: string;
};

const stagesKo: TensorStage[] = [
  {
    id: "vector",
    label: "토큰 하나",
    title: "하나의 토큰 임베딩",
    shape: "[4]",
    rank: 1,
    axes: [String.raw`d_{\mathrm{model}} = 4`],
    description: "토큰 하나를 네 개의 숫자로 표현한 rank-1 벡터입니다.",
  },
  {
    id: "sequence",
    label: "문장 하나",
    title: "세 토큰으로 이루어진 문장",
    shape: "[3, 4]",
    rank: 2,
    axes: [String.raw`\mathrm{tokens} = 3`, String.raw`d_{\mathrm{model}} = 4`],
    description: "토큰 벡터 세 개를 행으로 쌓으면 rank-2 행렬이 됩니다.",
  },
  {
    id: "batch",
    label: "문장 두 개",
    title: "두 문장을 묶은 미니 배치",
    shape: "[2, 3, 4]",
    rank: 3,
    axes: [String.raw`\mathrm{batch} = 2`, String.raw`\mathrm{tokens} = 3`, String.raw`d_{\mathrm{model}} = 4`],
    description: "문장 행렬 두 개를 쌓으면 Transformer 입력의 기본 shape가 됩니다.",
  },
];

const stagesEn: TensorStage[] = [
  { id: "vector", label: "One token", title: "A single token embedding", shape: "[4]", rank: 1, axes: [String.raw`d_{\mathrm{model}} = 4`], description: "A rank-1 vector that represents one token with four numbers." },
  { id: "sequence", label: "One sentence", title: "A sentence of three tokens", shape: "[3, 4]", rank: 2, axes: [String.raw`\mathrm{tokens} = 3`, String.raw`d_{\mathrm{model}} = 4`], description: "Stacking three token vectors as rows creates a rank-2 matrix." },
  { id: "batch", label: "Two sentences", title: "A mini-batch of two sentences", shape: "[2, 3, 4]", rank: 3, axes: [String.raw`\mathrm{batch} = 2`, String.raw`\mathrm{tokens} = 3`, String.raw`d_{\mathrm{model}} = 4`], description: "Stacking two sentence matrices creates the basic Transformer input shape." },
];

const tokenValues = [
  [0.8, -0.3, 1.1, 0.2],
  [0.1, 0.7, -0.4, 0.9],
  [-0.5, 0.2, 0.6, 1.0],
];

export function TensorShapeExplorer() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const stages = isKo ? stagesKo : stagesEn;
  const [stageId, setStageId] = useState<TensorStageId>("vector");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const stage = stages.find((candidate) => candidate.id === stageId) ?? stages[0];
  const titleId = useId();
  const panelId = useId();
  const broadcastId = useId();
  const tensorValues: TensorValues = stageId === "vector"
    ? tokenValues[0]
    : stageId === "sequence"
      ? tokenValues
      : [tokenValues, tokenValues.map((row) => row.map((value) => value * 0.5))];
  const rowLabels = stageId === "vector"
    ? ["token"]
    : tokenValues.map((_, index) => `token ${index + 1}`);
  const columnLabels = tokenValues[0].map((_, index) => `d${index + 1}`);

  return (
    <section className="tensor-shape-explorer" aria-labelledby={titleId}>
      <div className="tensor-shape-header">
        <div>
          <p className="tensor-shape-kicker">SHAPE EXPLORER</p>
          <h3 id={titleId}>{isKo ? "텐서를 읽는 세 가지 축" : "The three axes of a tensor"}</h3>
        </div>
        <code className="tensor-current-shape" aria-label={`${isKo ? "현재 shape" : "Current shape"} ${stage.shape}`}>
          {stage.shape}
        </code>
      </div>

      <div className="tensor-stage-controls" role="group" aria-label={isKo ? "텐서 shape 단계" : "Tensor shape stages"}>
        {stages.map((candidate) => {
          const active = candidate.id === stageId;
          return (
            <button
              type="button"
              className={`tensor-stage-button${active ? " tensor-stage-button-active" : ""}`}
              aria-pressed={active}
              aria-controls={panelId}
              onClick={() => setStageId(candidate.id)}
              key={candidate.id}
            >
              {candidate.label}
            </button>
          );
        })}
      </div>

      <div className="tensor-stage-panel" id={panelId} aria-live="polite">
        <div className="tensor-stage-copy">
          <span>rank {stage.rank}</span>
          <h4>{stage.title}</h4>
          <p>{stage.description}</p>
          <dl className="tensor-axis-list">
            {stage.axes.map((axis, index) => (
              <div key={axis}>
                <dt>{isKo ? "축" : "Axis"} {index + 1}</dt>
                <dd><MathFormula latex={axis} /></dd>
              </div>
            ))}
          </dl>
        </div>
        <div className={`tensor-visual tensor-visual-${stage.id}`}>
          <TensorDiagram
            values={tensorValues}
            shape={stage.id === "vector" ? [4] : stage.id === "sequence" ? [3, 4] : [2, 3, 4]}
            label={stage.title}
            axisLabels={stage.id === "vector"
              ? [String.raw`d_model`]
              : stage.id === "sequence"
                ? [isKo ? "tokens" : "tokens", String.raw`d_model`]
                : ["batch", "tokens", String.raw`d_model`]}
            rowLabels={rowLabels}
            columnLabels={columnLabels}
            sliceLabels={stage.id === "batch" ? [isKo ? "문장 1" : "sentence 1", isKo ? "문장 2" : "sentence 2"] : undefined}
            compact
          />
        </div>
      </div>

      <div className="tensor-broadcast-panel">
        <div className="tensor-broadcast-heading">
          <div>
            <span>BROADCASTING</span>
            <h4>{isKo ? "위치 정보는 모든 문장에 같은 규칙으로 더해집니다" : "Positional information is added to every sentence by the same rule"}</h4>
          </div>
          <button
            type="button"
            className="tensor-broadcast-toggle"
            aria-expanded={showBroadcast}
            aria-controls={broadcastId}
            onClick={() => setShowBroadcast((visible) => !visible)}
          >
            {showBroadcast ? (isKo ? "설명 닫기" : "Hide explanation") : (isKo ? "왜 shape가 유지되나요?" : "Why does the shape stay the same?")}
          </button>
        </div>
        <div
          className="tensor-broadcast-equation"
          aria-label={isKo ? "배치 shape 2, 3, 4에 위치 shape 3, 4를 더하면 결과 shape는 2, 3, 4" : "Adding position shape 3, 4 to batch shape 2, 3, 4 produces shape 2, 3, 4"}
        >
          <span><small>token embeddings</small><code>[2, 3, 4]</code></span>
          <strong aria-hidden="true">+</strong>
          <span><small>positions</small><code>[3, 4]</code></span>
          <strong aria-hidden="true">=</strong>
          <span><small>encoded tokens</small><code>[2, 3, 4]</code></span>
        </div>
        {showBroadcast ? (
          <p className="tensor-broadcast-explanation" id={broadcastId}>
            {isKo
              ? "NumPy는 빠진 batch 축을 자동으로 맞춰 같은 위치 행렬을 두 문장에 각각 더합니다. 값은 바뀌지만 batch, tokens, d_model 축의 크기는 그대로입니다."
              : "NumPy automatically aligns the missing batch axis and adds the same positional matrix to both sentences. The values change, but the batch, tokens, and d_model axis sizes stay the same."}
          </p>
        ) : null}
      </div>
    </section>
  );
}

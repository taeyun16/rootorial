import { useState } from "react";

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

const stages: TensorStage[] = [
  {
    id: "vector",
    label: "토큰 하나",
    title: "하나의 토큰 임베딩",
    shape: "[4]",
    rank: 1,
    axes: ["d_model = 4"],
    description: "토큰 하나를 네 개의 숫자로 표현한 rank-1 벡터입니다.",
  },
  {
    id: "sequence",
    label: "문장 하나",
    title: "세 토큰으로 이루어진 문장",
    shape: "[3, 4]",
    rank: 2,
    axes: ["tokens = 3", "d_model = 4"],
    description: "토큰 벡터 세 개를 행으로 쌓으면 rank-2 행렬이 됩니다.",
  },
  {
    id: "batch",
    label: "문장 두 개",
    title: "두 문장을 묶은 미니 배치",
    shape: "[2, 3, 4]",
    rank: 3,
    axes: ["batch = 2", "tokens = 3", "d_model = 4"],
    description: "문장 행렬 두 개를 쌓으면 Transformer 입력의 기본 shape가 됩니다.",
  },
];

const tokenValues = [
  [0.8, -0.3, 1.1, 0.2],
  [0.1, 0.7, -0.4, 0.9],
  [-0.5, 0.2, 0.6, 1.0],
];

function TokenRow({ values, label }: { values: number[]; label: string }) {
  return (
    <div className="tensor-token-row">
      <span className="tensor-token-label">{label}</span>
      <div className="tensor-cells">
        {values.map((value, index) => (
          <span className="tensor-cell" key={`${label}-${index}`}>
            {value.toFixed(1)}
          </span>
        ))}
      </div>
    </div>
  );
}

function TensorVisual({ stage }: { stage: TensorStageId }) {
  if (stage === "vector") {
    return (
      <div className="tensor-visual tensor-visual-vector" aria-hidden="true">
        <TokenRow label="token" values={tokenValues[0]} />
      </div>
    );
  }

  const sentences = stage === "sequence" ? [tokenValues] : [tokenValues, tokenValues];

  return (
    <div className={`tensor-visual tensor-visual-${stage}`} aria-hidden="true">
      {sentences.map((sentence, sentenceIndex) => (
        <div className="tensor-sentence" key={`sentence-${sentenceIndex}`}>
          {stage === "batch" ? (
            <span className="tensor-sentence-label">문장 {sentenceIndex + 1}</span>
          ) : null}
          {sentence.map((values, tokenIndex) => (
            <TokenRow
              label={`token ${tokenIndex + 1}`}
              values={sentenceIndex === 0 ? values : values.map((value) => value * 0.5)}
              key={`sentence-${sentenceIndex}-token-${tokenIndex}`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function TensorShapeExplorer() {
  const [stageId, setStageId] = useState<TensorStageId>("vector");
  const [showBroadcast, setShowBroadcast] = useState(false);
  const stage = stages.find((candidate) => candidate.id === stageId) ?? stages[0];

  return (
    <section className="tensor-shape-explorer" aria-labelledby="tensor-explorer-title">
      <div className="tensor-shape-header">
        <div>
          <p className="tensor-shape-kicker">SHAPE EXPLORER</p>
          <h3 id="tensor-explorer-title">텐서를 읽는 세 가지 축</h3>
        </div>
        <code className="tensor-current-shape" aria-label={`현재 shape ${stage.shape}`}>
          {stage.shape}
        </code>
      </div>

      <div className="tensor-stage-controls" role="group" aria-label="텐서 shape 단계">
        {stages.map((candidate) => {
          const active = candidate.id === stageId;
          return (
            <button
              type="button"
              className={`tensor-stage-button${active ? " tensor-stage-button-active" : ""}`}
              aria-pressed={active}
              aria-controls="tensor-stage-panel"
              onClick={() => setStageId(candidate.id)}
              key={candidate.id}
            >
              {candidate.label}
            </button>
          );
        })}
      </div>

      <div className="tensor-stage-panel" id="tensor-stage-panel" aria-live="polite">
        <div className="tensor-stage-copy">
          <span>rank {stage.rank}</span>
          <h4>{stage.title}</h4>
          <p>{stage.description}</p>
          <dl className="tensor-axis-list">
            {stage.axes.map((axis, index) => (
              <div key={axis}>
                <dt>축 {index + 1}</dt>
                <dd>{axis}</dd>
              </div>
            ))}
          </dl>
        </div>
        <TensorVisual stage={stage.id} />
      </div>

      <div className="tensor-broadcast-panel">
        <div className="tensor-broadcast-heading">
          <div>
            <span>BROADCASTING</span>
            <h4>위치 정보는 모든 문장에 같은 규칙으로 더해집니다</h4>
          </div>
          <button
            type="button"
            className="tensor-broadcast-toggle"
            aria-expanded={showBroadcast}
            aria-controls="tensor-broadcast-explanation"
            onClick={() => setShowBroadcast((visible) => !visible)}
          >
            {showBroadcast ? "설명 닫기" : "왜 shape가 유지되나요?"}
          </button>
        </div>
        <div
          className="tensor-broadcast-equation"
          aria-label="배치 shape 2, 3, 4에 위치 shape 3, 4를 더하면 결과 shape는 2, 3, 4"
        >
          <span><small>token embeddings</small><code>[2, 3, 4]</code></span>
          <strong aria-hidden="true">+</strong>
          <span><small>positions</small><code>[3, 4]</code></span>
          <strong aria-hidden="true">=</strong>
          <span><small>encoded tokens</small><code>[2, 3, 4]</code></span>
        </div>
        {showBroadcast ? (
          <p className="tensor-broadcast-explanation" id="tensor-broadcast-explanation">
            NumPy는 빠진 batch 축을 자동으로 맞춰 같은 위치 행렬을 두 문장에
            각각 더합니다. 값은 바뀌지만 batch, tokens, d_model 축의 크기는
            그대로입니다.
          </p>
        ) : null}
      </div>
    </section>
  );
}

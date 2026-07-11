import { useMemo, useState } from "react";
import {
  multiplyMatrices,
  scaleMatrix,
  softmaxRows,
  transpose,
  type NumericMatrix,
} from "../features/interactive/math";
import { useLocale } from "../features/localization/localization";
import { InteractiveLab } from "./interactive/InteractiveLab";
import { MatrixGrid } from "./interactive/MatrixGrid";
import { StepExplorer, type ExplorerStage } from "./interactive/StepExplorer";
import { MathFormula } from "./MathFormula";

type PipelineStage = "tokens" | "scores" | "scaled" | "weights" | "context";
type ScenarioId = "neighbors" | "orthogonal" | "contrast";

type Scenario = {
  id: ScenarioId;
  labelKo: string;
  labelEn: string;
  tokensKo: string[];
  tokensEn: string[];
  matrix: NumericMatrix;
};

const scenarios: Scenario[] = [
  {
    id: "neighbors",
    labelKo: "비슷한 토큰",
    labelEn: "Similar tokens",
    tokensKo: ["고양이", "강아지", "자동차"],
    tokensEn: ["cat", "dog", "car"],
    matrix: [[1, 0.8, 0.1, 0], [0.9, 0.7, 0.2, 0.1], [0, 0.1, 0.9, 1]],
  },
  {
    id: "orthogonal",
    labelKo: "직교 관계",
    labelEn: "Orthogonal",
    tokensKo: ["가로", "세로", "대각"],
    tokensEn: ["horizontal", "vertical", "diagonal"],
    matrix: [[1, 0, 0, 0], [0, 1, 0, 0], [0.7, 0.7, 0, 0]],
  },
  {
    id: "contrast",
    labelKo: "대조되는 토큰",
    labelEn: "Contrasting tokens",
    tokensKo: ["뜨겁다", "차갑다", "온도"],
    tokensEn: ["hot", "cold", "temperature"],
    matrix: [[1, 0.6, 0, 0], [-1, -0.6, 0, 0], [0.6, 0.6, 0.8, 0]],
  },
];

const stagesKo: Array<ExplorerStage<PipelineStage>> = [
  { id: "tokens", index: "01", label: "토큰 벡터" },
  { id: "scores", index: "02", label: "모든 내적" },
  { id: "scaled", index: "03", label: "크기 조정" },
  { id: "weights", index: "04", label: "Softmax" },
  { id: "context", index: "05", label: "가중합" },
];

const stagesEn: Array<ExplorerStage<PipelineStage>> = [
  { id: "tokens", index: "01", label: "Token vectors" },
  { id: "scores", index: "02", label: "All dot products" },
  { id: "scaled", index: "03", label: "Scale" },
  { id: "weights", index: "04", label: "Softmax" },
  { id: "context", index: "05", label: "Weighted sum" },
];

const stageCopy = {
  ko: {
    tokens: { latex: String.raw`X \in \mathbb{R}^{T \times d_{\mathrm{model}}}`, description: "각 토큰을 같은 길이의 벡터로 놓고 하나의 행렬 X로 쌓습니다." },
    scores: { latex: String.raw`S = XX^{\mathsf{T}} \in \mathbb{R}^{T \times T}`, description: "각 행의 토큰을 모든 열의 토큰과 내적해 관계 점수를 한 번에 만듭니다." },
    scaled: { latex: String.raw`\widetilde{S} = \frac{S}{\sqrt{d_{\mathrm{model}}}}`, description: "벡터 차원이 커질수록 내적이 커지는 효과를 임베딩 차원의 제곱근으로 완화합니다." },
    weights: { latex: String.raw`A_{ij} = \frac{e^{\widetilde{S}_{ij}}}{\sum_k e^{\widetilde{S}_{ik}}},\quad \sum_j A_{ij} = 1`, description: "한 행의 점수를 확률처럼 읽을 수 있도록 0과 1 사이의 가중치로 바꿉니다." },
    context: { latex: String.raw`C = AX \in \mathbb{R}^{T \times d_{\mathrm{model}}}`, description: "각 토큰이 참고한 다른 토큰 벡터를 가중합해 새로운 문맥 벡터를 만듭니다." },
  },
  en: {
    tokens: { latex: String.raw`X \in \mathbb{R}^{T \times d_{\mathrm{model}}}`, description: "Stack equal-length token vectors as rows of a single matrix X." },
    scores: { latex: String.raw`S = XX^{\mathsf{T}} \in \mathbb{R}^{T \times T}`, description: "Dot every row token with every column token to create all relationship scores at once." },
    scaled: { latex: String.raw`\widetilde{S} = \frac{S}{\sqrt{d_{\mathrm{model}}}}`, description: "Divide by the square root of the embedding dimension so dot products do not grow only because vectors have more dimensions." },
    weights: { latex: String.raw`A_{ij} = \frac{e^{\widetilde{S}_{ij}}}{\sum_k e^{\widetilde{S}_{ik}}},\quad \sum_j A_{ij} = 1`, description: "Turn every row into weights between zero and one that can be read like probabilities." },
    context: { latex: String.raw`C = AX \in \mathbb{R}^{T \times d_{\mathrm{model}}}`, description: "Create a new context vector by taking a weighted sum of the token vectors each token referenced." },
  },
} as const;

function TokenFlow({ tokens, weights, selectedToken }: { tokens: string[]; weights: number[][]; selectedToken: number }) {
  return (
    <div className="attention-token-flow" aria-hidden="true">
      <svg viewBox="0 0 540 170" preserveAspectRatio="none">
        {tokens.map((_, target) => {
          const startY = 28 + selectedToken * 52;
          const endY = 28 + target * 52;
          const weight = weights[selectedToken][target];
          return (
            <path
              d={`M 112 ${startY} C 230 ${startY}, 310 ${endY}, 428 ${endY}`}
              style={{ strokeWidth: 1.5 + weight * 12, opacity: 0.18 + weight * 0.82 }}
              key={target}
            />
          );
        })}
      </svg>
      <div className="attention-flow-column attention-flow-query">
        {tokens.map((token, index) => <span className={index === selectedToken ? "active" : undefined} key={token}>{token}<small>query</small></span>)}
      </div>
      <div className="attention-flow-column attention-flow-key">
        {tokens.map((token, index) => <span key={token}>{token}<small>{Math.round(weights[selectedToken][index] * 100)}%</small></span>)}
      </div>
    </div>
  );
}

export function AttentionPipelineExplorer() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [scenarioId, setScenarioId] = useState<ScenarioId>("neighbors");
  const [stage, setStage] = useState<PipelineStage>("tokens");
  const [selectedToken, setSelectedToken] = useState(0);
  const scenario = scenarios.find((candidate) => candidate.id === scenarioId) ?? scenarios[0];
  const tokens = isKo ? scenario.tokensKo : scenario.tokensEn;
  const stages = isKo ? stagesKo : stagesEn;
  const copy = stageCopy[locale][stage];

  const pipeline = useMemo(() => {
    const scores = multiplyMatrices(scenario.matrix, transpose(scenario.matrix));
    const scaled = scaleMatrix(scores, Math.sqrt(scenario.matrix[0].length));
    const weights = softmaxRows(scaled);
    const context = multiplyMatrices(weights, scenario.matrix);
    return { scores, scaled, weights, context };
  }, [scenario]);

  const matrixForStage = stage === "tokens"
    ? scenario.matrix
    : stage === "scores"
      ? pipeline.scores
      : stage === "scaled"
        ? pipeline.scaled
        : stage === "weights"
          ? pipeline.weights
          : pipeline.context;
  const columns = stage === "tokens" || stage === "context"
    ? scenario.matrix[0].map((_, index) => `d${index + 1}`)
    : tokens;
  const matrixLabel = stage === "tokens" ? "X" : stage === "context" ? "context" : stage;

  return (
    <InteractiveLab
      kicker="ATTENTION PIPELINE"
      title={isKo ? "한 토큰의 질문이 문맥 벡터가 되는 과정" : "How one token's query becomes a context vector"}
      description={isKo ? "같은 데이터가 각 단계를 통과하며 shape와 의미가 어떻게 달라지는지 추적하세요." : "Trace how the same data changes shape and meaning at every step."}
      actions={(
        <div className="attention-scenarios" role="group" aria-label={isKo ? "토큰 관계 프리셋" : "Token relationship presets"}>
          {scenarios.map((candidate) => (
            <button
              type="button"
              aria-pressed={candidate.id === scenarioId}
              onClick={() => { setScenarioId(candidate.id); setSelectedToken(0); }}
              key={candidate.id}
            >
              {isKo ? candidate.labelKo : candidate.labelEn}
            </button>
          ))}
        </div>
      )}
      className="attention-pipeline"
    >
      <StepExplorer
        stages={stages}
        activeStage={stage}
        onStageChange={setStage}
        ariaLabel={isKo ? "Attention 계산 단계" : "Attention calculation stages"}
      />

      <div className="attention-pipeline-workspace">
        <aside className="attention-token-selector">
          <span>{isKo ? "살펴볼 토큰" : "FOCUS TOKEN"}</span>
          {tokens.map((token, index) => (
            <button
              type="button"
              aria-pressed={index === selectedToken}
              onClick={() => setSelectedToken(index)}
              key={token}
            >
              <small>{String(index + 1).padStart(2, "0")}</small>
              {token}
            </button>
          ))}
        </aside>

        <div className="attention-stage-visual" key={`${stage}-${scenarioId}`}>
          <MathFormula latex={copy.latex} display className="attention-stage-formula" />
          {(stage === "weights" || stage === "context") ? (
            <TokenFlow tokens={tokens} weights={pipeline.weights} selectedToken={selectedToken} />
          ) : null}
          <MatrixGrid
            values={matrixForStage}
            label={matrixLabel}
            rowLabels={tokens}
            columnLabels={columns}
            selectedRow={selectedToken}
            selectedColumn={stage === "scores" || stage === "scaled" || stage === "weights" ? selectedToken : null}
            formatValue={stage === "weights" ? (value) => `${Math.round(value * 100)}%` : undefined}
            tone={stage === "context" ? "terra" : stage === "weights" ? "indigo" : "forest"}
            onSelectCell={(row) => setSelectedToken(row)}
          />
        </div>

        <aside className="attention-stage-inspector" aria-live="polite">
          <span>{stages.findIndex((candidate) => candidate.id === stage) + 1} / {stages.length}</span>
          <p>{copy.description}</p>
          {stage === "weights" || stage === "context" ? (
            <dl>
              {tokens.map((token, index) => (
                <div key={token}>
                  <dt>{token}</dt>
                  <dd>{Math.round(pipeline.weights[selectedToken][index] * 100)}%</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </aside>
      </div>
    </InteractiveLab>
  );
}

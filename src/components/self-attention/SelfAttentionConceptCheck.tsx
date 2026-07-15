import { selfAttentionQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";

type QuestionId = keyof typeof selfAttentionQuestions;

export function SelfAttentionConceptCheck({
  onMasteryChange,
}: {
  onMasteryChange: (mastered: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const { recordAnswers } = useLearningAnalytics();

  const questions: Array<ConceptQuestionSpec<QuestionId>> = [
    {
      id: "qkv-source",
      index: "01",
      prompt: t(
        "Self-Attention에서 X[N,d_model] 하나로 Q, K, V를 만들 때 가장 정확한 설명은?",
        "Which statement best describes how self-attention creates Q, K, and V from one X[N,d_model]?",
      ),
      options: [
        {
          value: "separate-sequences-supply-qkv",
          label: t("서로 다른 세 sequence가 각각 Q, K, V를 공급한다", "three separate sequences supply Q, K, and V"),
        },
        {
          value: "same-x-separate-projections",
          label: t("같은 token row X에 서로 다른 W_Q, W_K, W_V를 적용한다", "apply separate W_Q, W_K, and W_V projections to the same token rows X"),
        },
        {
          value: "qkv-are-identical",
          label: t("같은 X에서 시작하므로 Q, K, V의 값도 항상 같다", "because they start from the same X, Q, K, and V are always numerically identical"),
        },
      ],
      correctAnswer: selfAttentionQuestions["qkv-source"].correctAnswer,
      answerLabel: t("정답: 같은 X, 서로 다른 projection", "Answer: the same X, separate projections"),
      correctFeedback: t(
        "맞았습니다. Self-Attention의 self는 Q·K·V의 token row가 같은 sequence에서 온다는 뜻입니다. 서로 다른 projection은 찾을 기준과 전달할 내용을 분리합니다.",
        "Right. Self means the Q, K, and V token rows come from the same sequence. Separate projections distinguish how information is matched from what is carried.",
      ),
      incorrectFeedback: t(
        "정보원과 projection을 분리하세요. X는 하나지만 W_Q, W_K, W_V가 서로 다르므로 Q, K, V가 같은 값일 필요는 없습니다.",
        "Separate the source from the projections. There is one X, but distinct W_Q, W_K, and W_V mean Q, K, and V need not have identical values.",
      ),
    },
    {
      id: "scaled-score",
      index: "02",
      prompt: t(
        "head 하나의 score가 QKᵀ이고 key/query 폭이 d_h일 때 Softmax 전에 적용할 scaling은?",
        "For one head with scores QK transpose and key/query width d_h, which scaling belongs before softmax?",
      ),
      options: [
        {
          value: "divide-by-sequence-length",
          label: t("token 수 N으로 나눈다", "divide by token count N"),
        },
        {
          value: "divide-by-model-width",
          label: t("head 분할과 무관하게 d_model로 나눈다", "divide by d_model regardless of the head split"),
        },
        {
          value: "divide-by-sqrt-head-dimension",
          label: t("각 score를 √d_h로 나눈다", "divide each score by the square root of d_h"),
        },
      ],
      correctAnswer: selfAttentionQuestions["scaled-score"].correctAnswer,
      answerLabel: t("정답: QKᵀ / √d_h", "Answer: QK transpose divided by the square root of d_h"),
      correctFeedback: t(
        "맞았습니다. 내적 항이 늘어날 때 logit 크기가 커져 Softmax가 지나치게 포화되는 현상을 head의 key/query 차원으로 보정합니다.",
        "Right. The head's key/query dimension compensates for dot-product magnitude growth that would otherwise make softmax overly saturated.",
      ),
      incorrectFeedback: t(
        "scaling은 token 수나 전체 model 폭을 정규화하는 단계가 아닙니다. 실제로 내적되는 한 head의 feature 수 d_h를 추적하세요.",
        "Scaling does not normalize token count or the full model width. Track d_h, the number of features actually contracted inside one head.",
      ),
    },
    {
      id: "causal-mask",
      index: "03",
      prompt: t(
        "autoregressive Self-Attention에서 query i가 미래 key j>i를 읽지 못하게 하는 올바른 계약은?",
        "Which contract prevents autoregressive self-attention query i from reading future key j greater than i?",
      ),
      options: [
        {
          value: "block-future-logits-before-softmax",
          label: t("미래 logit을 Softmax 전에 차단해 미래 weight를 0으로 만든다", "block future logits before softmax so their weights become zero"),
        },
        {
          value: "zero-future-context-after-merge",
          label: t("모든 head를 합친 뒤 미래 context만 0으로 덮는다", "merge all heads first, then overwrite future context with zero"),
        },
        {
          value: "mask-past-and-self",
          label: t("과거와 현재를 가리고 미래 key만 남긴다", "mask the past and current token, leaving only future keys"),
        },
      ],
      correctAnswer: selfAttentionQuestions["causal-mask"].correctAnswer,
      answerLabel: t("정답: future logit 차단 후 key-axis Softmax", "Answer: block future logits, then apply key-axis softmax"),
      correctFeedback: t(
        "맞았습니다. 각 query row는 현재와 과거 key만으로 합 1이 되고, 모든 미래 weight는 정확히 0이어야 합니다.",
        "Right. Each query row sums to one over its current and past keys, while every future weight is exactly zero.",
      ),
      incorrectFeedback: t(
        "미래 value가 context에 들어온 뒤 지우면 누출을 막은 routing 계약이 아닙니다. score 단계에서 j>i를 차단하고 현재 token은 허용하세요.",
        "Erasing future values after they entered context does not repair the routing contract. Block j greater than i at the score stage while keeping the current token visible.",
      ),
    },
    {
      id: "multi-head-contract",
      index: "04",
      prompt: t(
        "d_model=H·d_h인 multi-head Self-Attention의 분할·병합 순서는?",
        "When d_model equals H times d_h, what is the multi-head self-attention split-and-merge order?",
      ),
      options: [
        {
          value: "average-token-axis-before-attention",
          label: t("먼저 token 축을 평균내고 그 vector를 H번 복사한다", "average the token axis first, then copy that vector H times"),
        },
        {
          value: "split-features-run-heads-concat",
          label: t("feature를 H개 head로 나누어 각각 실행한 뒤 head feature를 이어 붙인다", "split features into H heads, run each head, then concatenate head features"),
        },
        {
          value: "share-one-weight-row-all-heads",
          label: t("첫 head의 weight row를 모든 head에 재사용하고 평균낸다", "reuse the first head's weight row for every head, then average them"),
        },
      ],
      correctAnswer: selfAttentionQuestions["multi-head-contract"].correctAnswer,
      answerLabel: t("정답: split → head별 Attention → concat", "Answer: split, attend per head, then concatenate"),
      correctFeedback: t(
        "맞았습니다. head마다 [N,N] routing 분포와 [N,d_h] context를 만들고, token 순서를 유지한 채 [N,H·d_h]로 이어 붙입니다.",
        "Right. Each head creates [N,N] routing distributions and [N,d_h] context, then concatenates features into [N,H·d_h] without changing token order.",
      ),
      incorrectFeedback: t(
        "multi-head는 token을 평균내거나 한 head의 분포를 복사하는 연산이 아닙니다. feature/head 축과 token 축을 따로 추적하세요.",
        "Multi-head attention neither averages tokens nor copies one head's distribution. Track the feature/head axis separately from the token axis.",
      ),
    },
    {
      id: "position-boundary",
      index: "05",
      prompt: t(
        "causal mask와 다음 Transformer block의 위치 정보 경계를 가장 정확히 설명한 것은?",
        "Which statement best separates a causal mask from positional information in the next Transformer block?",
      ),
      options: [
        {
          value: "causal-mask-fully-encodes-position",
          label: t("causal mask만 있으면 모든 절대·상대 위치가 표현된다", "a causal mask alone represents every absolute and relative position"),
        },
        {
          value: "attention-output-needs-no-position",
          label: t("Self-Attention은 순서를 자동으로 알기 때문에 별도 위치 신호가 불필요하다", "self-attention automatically knows order, so no positional signal is needed"),
        },
        {
          value: "mask-limits-visibility-position-next",
          label: t("mask는 미래 visibility를 제한하고, token 위치 표현은 다음 block의 positional signal이 담당한다", "the mask limits future visibility, while a positional signal in the next block represents token position"),
        },
      ],
      correctAnswer: selfAttentionQuestions["position-boundary"].correctAnswer,
      answerLabel: t("정답: visibility와 position은 다른 계약", "Answer: visibility and position are separate contracts"),
      correctFeedback: t(
        "맞았습니다. 이 장은 causal routing과 [N,d_model] 출력까지 완성합니다. 위치 신호·residual·normalization·FFN 조립은 다음 장의 범위입니다.",
        "Right. This chapter completes causal routing through an [N,d_model] output. Positional signals, residuals, normalization, and FFN assembly belong to the next chapter.",
      ),
      incorrectFeedback: t(
        "어떤 key를 볼 수 있는지와 token이 어느 위치인지 표현하는 일을 구분하세요. causal mask는 visibility 제약이지 완전한 위치 표현이 아닙니다.",
        "Separate which keys are visible from how token position is represented. A causal mask is a visibility constraint, not a complete positional representation.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE SELF-ATTENTION CONTRACT",
        title: t("token row에서 causal multi-head 출력까지 추적하세요", "Trace token rows through causal multi-head output"),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.",
          "Finish all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t("Self-Attention 계약을 정확히 추적했습니다", "Self-attention contract traced correctly"),
        incorrect: t("projection·scaling·mask·head 경계를 다시 추적하세요", "Retrace the projection, scaling, mask, and head boundaries"),
        checkAnswers: t("Self-Attention 계약 확인하기", "Check the self-attention contract"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("Q/K/V 정보원, causal visibility 또는 head shape가 아직 섞여 있습니다.", "Some Q/K/V sources, causal visibility, or head shapes are still mixed."),
        idle: t("다섯 답을 고른 뒤 Self-Attention 계약을 확인하세요.", "Choose all five answers, then check the self-attention contract."),
      }}
    />
  );
}

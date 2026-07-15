import { transformerBlockQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";

type QuestionId = keyof typeof transformerBlockQuestions;

export function TransformerBlockConceptCheck({
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
      id: "position-input",
      index: "01",
      prompt: t(
        "이 장의 absolute sinusoidal fixture에서 같은 token embedding의 순서를 구분하려면 위치 신호를 어디에 더해야 할까요?",
        "In this chapter's absolute sinusoidal fixture, where should the positional signal be added so identical token embeddings can be distinguished by order?",
      ),
      options: [
        {
          value: "mask-alone-encodes-position",
          label: t("causal mask가 모든 위치를 표현하므로 더하지 않는다", "do not add one because the causal mask represents every position"),
        },
        {
          value: "add-sinusoidal-once-before-first-block",
          label: t("첫 블록에 들어가기 전 token embedding에 sinusoidal 신호를 한 번 더한다", "add the sinusoidal signal once to token embeddings before the first block"),
        },
        {
          value: "add-position-after-logits",
          label: t("vocabulary logits를 만든 뒤 더한다", "add it after vocabulary logits are produced"),
        },
      ],
      correctAnswer: transformerBlockQuestions["position-input"].correctAnswer,
      answerLabel: t("정답: embedding + position → block", "Answer: embedding plus position, then the block"),
      correctFeedback: t(
        "맞았습니다. causal mask는 미래 visibility를 제한하고, 위치 신호는 입력 row가 어느 순서에 놓였는지를 표현합니다.",
        "Right. The causal mask limits future visibility; the positional signal represents where each input row occurs in the sequence.",
      ),
      incorrectFeedback: t(
        "visibility와 position을 분리하세요. 이 장의 deterministic position은 첫 블록 입력에서 embedding과 같은 [T,d_model] shape로 더해집니다.",
        "Separate visibility from position. This chapter's deterministic position is added at the first block input with the same [T,d_model] shape as the embeddings.",
      ),
    },
    {
      id: "prenorm-residual",
      index: "02",
      prompt: t(
        "pre-LayerNorm Self-Attention sublayer의 올바른 계산 순서는?",
        "What is the correct order for a pre-LayerNorm self-attention sublayer?",
      ),
      options: [
        {
          value: "add-before-sublayer",
          label: t("입력을 자기 자신과 먼저 더한 뒤 Attention을 실행한다", "add the input to itself before running attention"),
        },
        {
          value: "normalize-run-add-original",
          label: t("LN(x)로 Attention을 실행하고 결과를 원래 x에 element-wise로 더한다", "run attention on LN(x), then add the result element-wise to the original x"),
        },
        {
          value: "normalize-token-axis",
          label: t("token축 전체를 정규화하고 residual 없이 교체한다", "normalize across the token axis and replace the input without a residual"),
        },
      ],
      correctAnswer: transformerBlockQuestions["prenorm-residual"].correctAnswer,
      answerLabel: t("정답: x + Attention(LN(x))", "Answer: x plus Attention(LN(x))"),
      correctFeedback: t(
        "맞았습니다. sublayer는 정규화된 branch를 변환하지만 skip path는 원래 [T,d_model] 입력을 그대로 덧셈 지점까지 운반합니다.",
        "Right. The sublayer transforms the normalized branch while the skip path carries the original [T,d_model] input to the addition point.",
      ),
      incorrectFeedback: t(
        "정규화되는 branch와 보존되는 skip path를 따로 추적하세요. pre-norm에서 residual의 기준은 LN(x)가 아니라 원래 x입니다.",
        "Track the normalized branch separately from the preserved skip path. In pre-norm, the residual base is the original x, not LN(x).",
      ),
    },
    {
      id: "layernorm-axis",
      index: "03",
      prompt: t(
        "X shape가 [T,d_model]일 때 LayerNorm이 평균과 분산을 계산하는 축은?",
        "For X shaped [T,d_model], along which axis does LayerNorm compute mean and variance?",
      ),
      options: [
        {
          value: "tokens-within-feature",
          label: t("각 feature마다 T개 token을 묶는다", "group all T tokens for each feature"),
        },
        {
          value: "features-within-token",
          label: t("각 token row 안의 d_model feature를 묶는다", "group the d_model features within each token row"),
        },
        {
          value: "all-cells-global",
          label: t("[T,d_model]의 모든 셀을 한 번에 묶는다", "group every cell in [T,d_model] globally"),
        },
      ],
      correctAnswer: transformerBlockQuestions["layernorm-axis"].correctAnswer,
      answerLabel: t("정답: token별 feature축", "Answer: the feature axis within each token"),
      correctFeedback: t(
        "맞았습니다. 이 fixture의 γ=1, β=0에서는 token row마다 mean≈0, variance≈1이며 다른 token row의 값은 통계에 섞지 않습니다.",
        "Right. With this fixture's gamma=1 and beta=0, each token row gets mean near zero and variance near one without mixing statistics from other token rows.",
      ),
      incorrectFeedback: t(
        "LayerNorm은 BatchNorm이나 token pooling이 아닙니다. 한 token이 가진 feature vector 하나를 정규화합니다.",
        "LayerNorm is neither BatchNorm nor token pooling. It normalizes one token's feature vector at a time.",
      ),
    },
    {
      id: "positionwise-ffn",
      index: "04",
      prompt: t(
        "Transformer block의 position-wise FFN이 token row를 처리하는 방식은?",
        "How does a Transformer block's position-wise FFN process token rows?",
      ),
      options: [
        {
          value: "shared-mlp-each-token-row",
          label: t("모든 row에 같은 d_model→d_ff→d_model MLP를 독립 적용한다", "apply the same d_model to d_ff to d_model MLP independently to every row"),
        },
        {
          value: "mix-token-rows",
          label: t("FFN이 token축을 곱해 이웃 token 정보를 섞는다", "the FFN multiplies across the token axis to mix neighboring tokens"),
        },
        {
          value: "one-linear-no-activation",
          label: t("activation 없는 하나의 선형층만 사용한다", "use one linear layer with no activation"),
        },
      ],
      correctAnswer: transformerBlockQuestions["positionwise-ffn"].correctAnswer,
      answerLabel: t("정답: shared row-wise MLP", "Answer: a shared row-wise MLP"),
      correctFeedback: t(
        "맞았습니다. token 사이 routing은 Attention이 맡고, FFN은 같은 가중치로 각 token의 feature를 비선형 변환합니다.",
        "Right. Attention handles routing between tokens; the FFN uses shared weights to transform each token's features nonlinearly.",
      ),
      incorrectFeedback: t(
        "token을 섞는 단계와 feature를 변환하는 단계를 구분하세요. FFN은 row마다 독립이며 중간 ReLU가 두 선형층 사이에 있습니다.",
        "Separate token mixing from feature transformation. The FFN is row-independent, with a ReLU between its two linear layers.",
      ),
    },
    {
      id: "block-handoff",
      index: "05",
      prompt: t(
        "한 Transformer block이 mini-transformer의 다음 단계로 넘기는 출력 계약은?",
        "What output contract does one Transformer block hand to the next stage of the mini-transformer?",
      ),
      options: [
        {
          value: "flatten-token-axis",
          label: t("token축을 평탄화한 [T·d_model] vector", "a [T times d_model] vector with the token axis flattened"),
        },
        {
          value: "hidden-state-same-token-model-shape",
          label: t("token row와 d_model 폭을 보존한 [T,d_model] state", "a [T,d_model] state that preserves token rows and model width"),
        },
        {
          value: "block-emits-vocabulary-probabilities",
          label: t("블록이 직접 만든 vocabulary 확률", "vocabulary probabilities produced directly by the block"),
        },
      ],
      correctAnswer: transformerBlockQuestions["block-handoff"].correctAnswer,
      answerLabel: t("정답: [T,d_model] hidden state", "Answer: a [T,d_model] hidden state"),
      correctFeedback: t(
        "맞았습니다. residual 덧셈은 shape를 보존합니다. 다음 장은 한 block을 final norm, vocabulary projection과 loss에 연결하고, 더 깊은 stack은 같은 shape 계약을 반복하는 전이 과제로 다룹니다.",
        "Right. Residual additions preserve shape. The next chapter connects one block to final normalization, vocabulary projection, and loss, then treats a deeper stack as a transfer exercise that repeats the same shape contract.",
      ),
      incorrectFeedback: t(
        "block과 language-model head의 경계를 구분하세요. 이 장은 [T,d_model] state를 만들 뿐 tokenizer나 vocabulary 확률을 실행하지 않습니다.",
        "Separate the block from the language-model head. This chapter produces a [T,d_model] state; it does not run tokenization or vocabulary probabilities.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE PRE-NORM BLOCK",
        title: t("position에서 residual FFN handoff까지 추적하세요", "Trace position through the residual FFN handoff"),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.",
          "Finish all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t("Transformer block 계약을 정확히 추적했습니다", "Transformer block contract traced correctly"),
        incorrect: t("position·pre-norm·residual·FFN 경계를 다시 추적하세요", "Retrace the position, pre-norm, residual, and FFN boundaries"),
        checkAnswers: t("Transformer block 계약 확인하기", "Check the Transformer block contract"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("LayerNorm 축, residual 기준 또는 FFN token 경계가 아직 섞여 있습니다.", "The LayerNorm axis, residual base, or FFN token boundary is still mixed."),
        idle: t("다섯 답을 고른 뒤 Transformer block 계약을 확인하세요.", "Choose all five answers, then check the Transformer block contract."),
      }}
    />
  );
}

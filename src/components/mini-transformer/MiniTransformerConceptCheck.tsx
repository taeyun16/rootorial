import { miniTransformerQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";

type QuestionId = keyof typeof miniTransformerQuestions;

export function MiniTransformerConceptCheck({
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
      id: "shifted-target",
      index: "01",
      prompt: t(
        "teacher forcing에서 prefix의 token row가 예측해야 하는 target은 무엇일까요?",
        "Under teacher forcing, which target should a prefix token row predict?",
      ),
      options: [
        { value: "row-copies-current-token", label: t("현재 입력 token을 그대로 복사한다", "copy the current input token") },
        { value: "prefix-row-predicts-following-token", label: t("해당 prefix 다음에 오는 token을 예측한다", "predict the token that follows that prefix") },
        { value: "final-row-predicts-first-token", label: t("마지막 row가 첫 token을 예측한다", "make the final row predict the first token") },
      ],
      correctAnswer: miniTransformerQuestions["shifted-target"].correctAnswer,
      answerLabel: t("정답: 입력과 target을 한 칸 shift", "Answer: shift inputs and targets by one"),
      correctFeedback: t(
        "맞았습니다. 실행 fixture의 [BOS, the, cat, sat, .] 각 row는 [the, cat, sat, ., EOS]를 예측하며 미래 target은 입력으로 새지 않습니다.",
        "Right. Each row of the executable fixture [BOS, the, cat, sat, .] predicts [the, cat, sat, ., EOS] without leaking the future target into its input.",
      ),
      incorrectFeedback: t(
        "현재 token을 복사하는 분류가 아닙니다. row t는 causal prefix x≤t만 읽고 token t+1의 loss를 만듭니다.",
        "This is not current-token copying. Row t reads only the causal prefix x at or before t and produces loss for token t+1.",
      ),
    },
    {
      id: "lm-head-boundary",
      index: "02",
      prompt: t(
        "한 decoder block의 [T,d_model] state를 [T,V] vocabulary logits로 바꾸는 경계는?",
        "Which boundary converts one decoder block's [T,d_model] state into [T,V] vocabulary logits?",
      ),
      options: [
        { value: "block-output-is-probability", label: t("block output이 이미 vocabulary 확률이다", "the block output is already a vocabulary probability") },
        { value: "final-norm-then-vocabulary-projection", label: t("final LayerNorm 뒤 vocabulary projection을 적용한다", "apply a vocabulary projection after final LayerNorm") },
        { value: "tokenizer-creates-logits", label: t("tokenizer가 token ID와 함께 logits를 만든다", "the tokenizer creates logits together with token IDs") },
      ],
      correctAnswer: miniTransformerQuestions["lm-head-boundary"].correctAnswer,
      answerLabel: t("정답: final LN → vocabulary projection", "Answer: final LN, then vocabulary projection"),
      correctFeedback: t(
        "맞았습니다. block은 hidden state를 보존하고 LM head가 각 row를 vocabulary 크기의 logit vector로 투영합니다.",
        "Right. The block preserves hidden state; the LM head projects each row to a vocabulary-sized logit vector.",
      ),
      incorrectFeedback: t(
        "token ID, hidden feature, logit, probability를 서로 다른 표현으로 추적하세요. vocabulary 폭은 LM head에서 처음 나타납니다.",
        "Track token IDs, hidden features, logits, and probabilities as distinct representations. Vocabulary width first appears at the LM head.",
      ),
    },
    {
      id: "softmax-loss-axis",
      index: "03",
      prompt: t(
        "logits shape가 [T,V]일 때 next-token Softmax와 cross entropy는 어떻게 계산할까요?",
        "For logits shaped [T,V], how should next-token softmax and cross entropy be computed?",
      ),
      options: [
        { value: "vocabulary-axis-per-token-row", label: t("각 token row 안의 V개 vocabulary logit에 Softmax를 적용한다", "apply softmax across V vocabulary logits within each token row") },
        { value: "token-axis-per-vocabulary-column", label: t("각 vocabulary column마다 T개 token을 경쟁시킨다", "make T tokens compete within each vocabulary column") },
        { value: "single-global-softmax", label: t("[T,V] 전체를 하나의 Softmax로 묶는다", "apply one softmax over all of [T,V]") },
      ],
      correctAnswer: miniTransformerQuestions["softmax-loss-axis"].correctAnswer,
      answerLabel: t("정답: row별 vocabulary Softmax", "Answer: vocabulary softmax per row"),
      correctFeedback: t(
        "맞았습니다. 각 prefix마다 V개 next-token 후보의 확률 합이 1이고, shifted target의 -log p를 row 평균합니다.",
        "Right. Each prefix has V next-token probabilities summing to one, and loss averages negative log probability for shifted targets across rows.",
      ),
      incorrectFeedback: t(
        "time row끼리 경쟁시키면 서로 다른 prefix의 예측이 섞입니다. 각 row 안에서 max를 빼고 vocabulary축 Softmax를 계산하세요.",
        "Competing across time mixes predictions from different prefixes. Subtract the row maximum and compute softmax over the vocabulary axis within each row.",
      ),
    },
    {
      id: "head-update",
      index: "04",
      prompt: t(
        "이 장의 한 번의 LM-head gradient update는 어떤 방향으로 parameter를 움직일까요?",
        "In which direction does this chapter's single LM-head gradient update move parameters?",
      ),
      options: [
        { value: "add-loss-gradient-to-head", label: t("loss gradient를 parameter에 더한다", "add the loss gradient to parameters") },
        { value: "subtract-loss-gradient-from-head", label: t("learning rate를 곱한 loss gradient를 parameter에서 뺀다", "subtract the learning-rate-scaled loss gradient from parameters") },
        { value: "replace-hidden-state-with-label", label: t("hidden state를 정답 ID로 교체한다", "replace hidden state with the target ID") },
      ],
      correctAnswer: miniTransformerQuestions["head-update"].correctAnswer,
      answerLabel: t("정답: θ ← θ - η∇L", "Answer: theta becomes theta minus eta times gradient L"),
      correctFeedback: t(
        "맞았습니다. fixture는 hidden state를 고정하고 LM head만 한 번 업데이트해 같은 batch의 loss가 내려가는지 검증합니다.",
        "Right. The fixture freezes hidden states and updates only the LM head once, verifying that loss falls on the same batch.",
      ),
      incorrectFeedback: t(
        "gradient는 loss가 증가하는 방향입니다. 이 활동은 그 반대 방향으로 LM-head projection과 bias만 한 번 이동합니다.",
        "The gradient points toward increasing loss. This activity moves only the LM-head projection and bias once in the opposite direction.",
      ),
    },
    {
      id: "autoregressive-loop",
      index: "05",
      prompt: t(
        "greedy autoregressive decoding의 올바른 반복 경계는?",
        "What is the correct loop boundary for greedy autoregressive decoding?",
      ),
      options: [
        { value: "predict-all-future-tokens-once", label: t("한 번의 forward로 모든 미래 token을 확정한다", "decide every future token in one forward pass") },
        { value: "append-recompute-stop-on-eos-or-limit", label: t("마지막 row에서 하나를 골라 append하고 prefix를 다시 실행하며 EOS 또는 한도에서 멈춘다", "choose one token from the last row, append it, rerun the prefix, and stop at EOS or the limit") },
        { value: "remove-prefix-after-each-token", label: t("새 token을 만들 때마다 이전 prefix를 버린다", "discard the previous prefix after every new token") },
      ],
      correctAnswer: miniTransformerQuestions["autoregressive-loop"].correctAnswer,
      answerLabel: t("정답: append → recompute → EOS/limit", "Answer: append, recompute, then EOS or limit"),
      correctFeedback: t(
        "맞았습니다. 이 작은 fixture는 cache 없이 전체 prefix를 다시 계산하므로 실행한 구현과 설명이 일치합니다.",
        "Right. This tiny fixture has no cache and recomputes the full prefix, keeping the explanation aligned with the executed implementation.",
      ),
      incorrectFeedback: t(
        "causal LM은 다음 token 하나를 만든 뒤 그 token을 다음 입력에 포함합니다. EOS와 maxNewTokens가 두 독립적인 종료 안전장치입니다.",
        "A causal LM emits one next token, then includes it in the next input. EOS and maxNewTokens are two independent stopping safeguards.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "ASSEMBLE THE COMPLETE NEXT-TOKEN PATH",
        title: t("token ID에서 loss와 생성 loop까지 연결하세요", "Connect token IDs through loss and the generation loop"),
        description: t("다섯 문제와 두 필수 활동을 모두 마쳐야 마지막 챕터 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock the final chapter gate."),
        correct: t("Mini Transformer 경계를 정확히 연결했습니다", "Mini Transformer boundaries connected correctly"),
        incorrect: t("shift·LM head·loss·decode 경계를 다시 추적하세요", "Retrace the shift, LM head, loss, and decoding boundaries"),
        checkAnswers: t("Mini Transformer 계약 확인하기", "Check the Mini Transformer contract"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("입력/target shift, vocabulary축 또는 generation loop가 아직 섞여 있습니다.", "The input/target shift, vocabulary axis, or generation loop is still mixed."),
        idle: t("다섯 답을 고른 뒤 전체 모델 경계를 확인하세요.", "Choose all five answers, then check the complete model boundary."),
      }}
    />
  );
}

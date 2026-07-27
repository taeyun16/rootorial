import { sequenceQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof sequenceQuestions;

export function SequencesConceptCheck({
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
      id: "hidden-shape",
      index: "01",
      prompt: t(
        "embedding 입력 [B,T,D]를 RNN에 통과시켰을 때 전체 hidden trace와 마지막 hidden state의 shape는?",
        "After an RNN consumes embedding input [B,T,D], what are the shapes of the full hidden trace and final hidden state?",
      ),
      options: [
        { value: "hidden-keeps-entire-sequence", label: t("마지막 state가 원본 [B,T,D] 전체를 무손실로 저장", "the final state losslessly stores all of [B,T,D]") },
        { value: "hidden-is-bh-trace-is-bth", label: t("trace [B,T,H], 마지막 state [B,H]", "trace [B,T,H], final state [B,H]") },
        { value: "hidden-is-vocabulary", label: t("둘 다 vocabulary 축 [V]", "both use the vocabulary axis [V]") },
      ],
      correctAnswer: sequenceQuestions["hidden-shape"].correctAnswer,
      answerLabel: t("정답: 시간축 trace와 압축된 마지막 state", "Answer: a time-axis trace and compressed final state"),
      correctFeedback: t(
        "맞았습니다. cell은 위치마다 H차원 state를 만들고, 마지막 state는 전체 입력을 그대로 보관하는 배열이 아니라 학습된 압축입니다.",
        "Right. The cell produces an H-dimensional state per position; the final state is a learned compression, not a lossless copy of the input.",
      ),
      incorrectFeedback: t(
        "batch B와 hidden width H는 유지되지만, 전체 trace에만 token 위치 T가 남는지 확인하세요.",
        "Check where token axis T remains: batch B and hidden width H survive in both, but only the full trace retains T.",
      ),
    },
    {
      id: "shared-recurrence",
      index: "02",
      prompt: t(
        "같은 token multiset의 순서를 뒤집으면 scalar RNN의 마지막 state가 달라질 수 있는 이유는?",
        "Why can reversing the same token multiset change a scalar RNN's final state?",
      ),
      options: [
        { value: "mean-first-then-cell", label: t("항상 먼저 평균을 내기 때문", "it always averages before applying the cell") },
        { value: "sort-before-recurrence", label: t("RNN이 token을 자동 정렬하기 때문", "the RNN automatically sorts tokens") },
        { value: "same-cell-updates-ordered-state", label: t("같은 cell이 이전 state와 현재 입력을 순서대로 갱신하기 때문", "the same cell updates previous state with each current input in order") },
      ],
      correctAnswer: sequenceQuestions["shared-recurrence"].correctAnswer,
      answerLabel: t("정답: 공유 cell, 순서가 있는 state update", "Answer: a shared cell with ordered state updates"),
      correctFeedback: t(
        "맞았습니다. 같은 weight를 재사용해도 각 시점은 서로 다른 prefix state를 입력받습니다.",
        "Right. Reusing the same weights does not make timesteps identical: each receives a different prefix state.",
      ),
      incorrectFeedback: t(
        "h₁을 계산한 결과가 h₂의 입력으로 들어가는 recurrence를 한 단계씩 펼쳐 보세요.",
        "Unroll the recurrence one step at a time and follow h1 into the computation of h2.",
      ),
    },
    {
      id: "temporal-gradient",
      index: "03",
      prompt: t(
        "마지막 state의 첫 token 민감도 ∂h_T/∂x₀가 긴 sequence에서 작아질 수 있는 직접적인 이유는?",
        "What directly makes final-state sensitivity ∂h_T/∂x_0 to the first token shrink across a long sequence?",
      ),
      options: [
        { value: "product-of-local-jacobians", label: t("시간축 local Jacobian들을 연속으로 곱하기 때문", "it multiplies local Jacobians along the time axis") },
        { value: "one-direct-gradient", label: t("모든 token에 하나의 동일한 직접 gradient가 가기 때문", "one identical direct gradient reaches every token") },
        { value: "forward-zero-means-gradient-zero", label: t("forward state가 작으면 정의상 gradient가 항상 0이기 때문", "a small forward state makes the gradient exactly zero by definition") },
      ],
      correctAnswer: sequenceQuestions["temporal-gradient"].correctAnswer,
      answerLabel: t("정답: 시간축 chain rule의 곱", "Answer: a temporal chain-rule product"),
      correctFeedback: t(
        "맞았습니다. 각 factor의 크기가 1보다 작으면 긴 곱은 소실될 수 있습니다. forward 기억과 gradient 보존은 같은 주장이 아닙니다.",
        "Right. If factor magnitudes stay below one, the long product can vanish. Forward memory and gradient preservation are different claims.",
      ),
      incorrectFeedback: t(
        "첫 입력이 마지막 state에 닿기까지 거치는 recurrent edge마다 미분 factor가 하나씩 붙습니다.",
        "Each recurrent edge between the first input and final state contributes another derivative factor.",
      ),
    },
    {
      id: "lstm-cell-update",
      index: "04",
      prompt: t(
        "교육용 LSTM sandbox에서 cell state를 갱신하는 올바른 조립은?",
        "Which assembly correctly updates cell state in the teaching LSTM sandbox?",
      ),
      options: [
        { value: "output-overwrites-cell", label: "cₜ = oₜ·hₜ₋₁" },
        { value: "forget-carry-plus-input-candidate", label: "cₜ = fₜ·cₜ₋₁ + iₜ·gₜ" },
        { value: "input-gate-copies-raw-input", label: "cₜ = iₜ·xₜ" },
      ],
      correctAnswer: sequenceQuestions["lstm-cell-update"].correctAnswer,
      answerLabel: t("정답: carry와 candidate write의 덧셈", "Answer: add the carry and candidate-write branches"),
      correctFeedback: t(
        "맞았습니다. forget gate는 이전 cell carry를, input gate는 candidate write를 조절하고 output gate는 노출할 hidden만 조절합니다.",
        "Right. The forget gate controls prior-cell carry, the input gate controls candidate write, and the output gate only controls exposed hidden state.",
      ),
      incorrectFeedback: t(
        "f·c_prev, i·g, o·tanh(c)의 역할을 각각 carry·write·reveal로 분리하세요.",
        "Separate f·c_prev, i·g, and o·tanh(c) into carry, write, and reveal roles.",
      ),
    },
    {
      id: "causal-prefix",
      index: "05",
      prompt: t(
        "causal next-token 모델에서 시점 t의 state와 다음 장 Attention으로의 전이를 올바르게 설명한 것은?",
        "Which statement correctly describes state at time t in a causal next-token model and the transition to Attention?",
      ),
      options: [
        { value: "state-reads-future-token", label: t("hₜ는 정답을 위해 미래 token을 미리 읽어야 한다", "h_t must read future tokens to obtain the answer") },
        { value: "attention-needs-no-position-or-mask", label: t("Attention은 position과 mask 없이도 자동으로 순서와 인과를 안다", "Attention automatically knows order and causality without position or masking") },
        { value: "state-uses-current-and-past-only", label: t("hₜ는 현재·과거 prefix만 쓰고, Attention은 먼 위치에 한 층의 가중 경로를 만든다", "h_t uses only the current and past prefix; Attention creates a one-layer weighted path to a distant position") },
      ],
      correctAnswer: sequenceQuestions["causal-prefix"].correctAnswer,
      answerLabel: t("정답: prefix-only state, 더 짧은 정보 경로", "Answer: prefix-only state and a shorter information path"),
      correctFeedback: t(
        "맞았습니다. Attention의 Q/K/V 계산은 다음 장에서 다루며, position과 causal mask도 별도 계약으로 남습니다.",
        "Right. The next chapter handles Q/K/V computation; position and causal masking remain separate contracts.",
      ),
      incorrectFeedback: t(
        "생성 시점에 아직 존재하지 않는 미래 입력을 읽으면 leakage입니다. Attention도 순서·인과 규칙을 따로 받아야 합니다.",
        "Reading a future input that does not yet exist during generation is leakage. Attention also needs explicit order and causality rules.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE SEQUENCE CONTRACT",
        title: t("순서·gradient·gate·causal prefix를 연결하세요", "Connect order, gradients, gates, and causal prefixes"),
        description: t(
          "다섯 문제와 필수 sequence memory lab을 마치면 챕터 완료 조건이 열립니다.",
          "Finish all five questions and the required sequence-memory lab to unlock the chapter gate.",
        ),
        correct: t("시퀀스 계약을 정확히 추적했습니다", "Sequence contract traced correctly"),
        incorrect: t("hidden·gradient·cell·causal 경계를 다시 추적하세요", "Retrace hidden-state, gradient, cell, and causal boundaries"),
        checkAnswers: t("시퀀스 계약 확인하기", "Check the sequence contract"),
        completed: t("이해 확인 완료 — 필수 sequence memory lab의 완료 상태를 확인하세요.", "Concept check complete — now confirm the required sequence-memory lab."),
        retry: t("순서·gradient·gate·causal prefix 중 일부가 아직 섞여 있습니다.", "Some boundaries among order, gradients, gates, and causal prefixes are still mixed."),
        idle: t("다섯 답을 고른 뒤 시퀀스 계약을 확인하세요.", "Choose all five answers, then check the sequence contract."),
      }}
    />
  );
}

import { optimizationQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { MathFormula } from "../MathFormula";

type QuestionId = keyof typeof optimizationQuestions;

export function OptimizationConceptCheck({
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
      id: "loss-role",
      index: "01",
      prompt: t(
        "세 데이터 점의 잔차가 [0, -3, -6]일 때 MSE 손실이 하는 일은 무엇일까요?",
        "When the residuals for three data points are [0, -3, -6], what does MSE loss do?",
      ),
      options: [
        { value: "scalar-summary", label: t("여러 오차를 비교 가능한 스칼라 하나로 요약", "Summarize many errors as one comparable scalar") },
        { value: "parameter-vector", label: t("잔차를 새 파라미터 벡터로 사용", "Use the residuals as a new parameter vector") },
        { value: "accuracy-label", label: t("각 점을 정답/오답으로만 분류", "Label each point only correct or incorrect") },
      ],
      correctAnswer: optimizationQuestions["loss-role"].correctAnswer,
      answerLabel: t("정답: 스칼라 손실", "Answer: a scalar loss"),
      correctFeedback: t(
        "맞았습니다. 제곱한 잔차의 평균은 파라미터 후보들을 같은 기준으로 비교할 수 있는 숫자 하나가 됩니다.",
        "Right. The mean of squared residuals becomes one number for comparing parameter candidates on the same scale.",
      ),
      incorrectFeedback: t(
        "MSE는 파라미터도 accuracy도 아닙니다. 잔차 벡터를 제곱·평균해 하나의 연속적인 비용으로 압축합니다.",
        "MSE is neither a parameter nor accuracy. It squares and averages the residual vector into one continuous cost.",
      ),
    },
    {
      id: "gradient-direction",
      index: "02",
      prompt: isKo
        ? <>현재 gradient가 <MathFormula latex={String.raw`\nabla L(\mathbf{W})=[-6,-4]`} />입니다. 손실을 줄이는 기본 업데이트는?</>
        : <>The current gradient is <MathFormula latex={String.raw`\nabla L(\mathbf{W})=[-6,-4]`} />. Which basic update aims to lower loss?</>,
      options: [
        { value: "subtract-gradient", label: "W ← W − η∇L" },
        { value: "add-gradient", label: "W ← W + η∇L" },
        { value: "ignore-gradient", label: t("W를 바꾸지 않음", "Leave W unchanged") },
      ],
      correctAnswer: optimizationQuestions["gradient-direction"].correctAnswer,
      answerLabel: t("정답: gradient를 뺀다", "Answer: subtract the gradient"),
      correctFeedback: t(
        "맞았습니다. gradient는 가장 빠른 증가 방향이므로 음의 방향으로 이동합니다. 음수 성분을 빼면 해당 파라미터는 증가합니다.",
        "Right. The gradient points toward fastest increase, so the update goes in the negative direction. Subtracting a negative component increases that parameter.",
      ),
      incorrectFeedback: t(
        "gradient 자체는 내리막이 아니라 오르막 방향입니다. 학습률을 곱한 gradient를 현재 W에서 빼야 합니다.",
        "The gradient itself points uphill, not downhill. Multiply it by the learning rate and subtract it from W.",
      ),
    },
    {
      id: "learning-rate",
      index: "03",
      prompt: t(
        "업데이트 방향은 맞지만 학습률이 지나치게 크면 loss trace에 어떤 일이 생길 수 있을까요?",
        "If the update direction is correct but the learning rate is too large, what can happen to the loss trace?",
      ),
      options: [
        { value: "overshoot-diverge", label: t("최솟값을 건너뛰며 진동하거나 발산", "Overshoot the minimum and oscillate or diverge") },
        { value: "always-faster", label: t("항상 더 빠르게 0에 도달", "Always reach zero faster") },
        { value: "changes-minimum", label: t("손실함수의 최솟값 위치가 이동", "Move the location of the loss minimum") },
      ],
      correctAnswer: optimizationQuestions["learning-rate"].correctAnswer,
      answerLabel: t("정답: overshoot·발산", "Answer: overshoot and divergence"),
      correctFeedback: t(
        "맞았습니다. 학습률은 곡면을 바꾸지 않지만 한 번에 움직이는 거리를 키워 최솟값을 계속 건너뛸 수 있습니다.",
        "Right. The learning rate does not change the surface, but it can make each step large enough to keep crossing the minimum.",
      ),
      incorrectFeedback: t(
        "같은 loss 곡면에서도 보폭이 너무 크면 이전보다 높은 곳에 도착할 수 있습니다. 큰 값이 항상 빠른 것은 아닙니다.",
        "On the same loss surface, an oversized step can land higher than before. Larger is not always faster.",
      ),
    },
    {
      id: "gradient-shape",
      index: "04",
      prompt: isKo
        ? <>파라미터가 <MathFormula latex={String.raw`\mathbf{W}=[b,w]`} />인 선형 모델에서 <MathFormula latex={String.raw`\nabla L(\mathbf{W})`} />의 shape는?</>
        : <>For a linear model with parameters <MathFormula latex={String.raw`\mathbf{W}=[b,w]`} />, what is the shape of <MathFormula latex={String.raw`\nabla L(\mathbf{W})`} />?</>,
      options: [
        { value: "same-as-weights", label: t("W와 같은 2성분 벡터", "A two-component vector matching W") },
        { value: "one-scalar", label: t("loss와 같은 스칼라 하나", "One scalar like the loss") },
        { value: "same-as-batch", label: t("데이터 점 수와 같은 3성분 벡터", "A three-component vector matching the data points") },
      ],
      correctAnswer: optimizationQuestions["gradient-shape"].correctAnswer,
      answerLabel: t("정답: W와 같은 shape", "Answer: the same shape as W"),
      correctFeedback: t(
        "맞았습니다. bias와 slope마다 편미분 하나가 필요하므로 gradient는 W와 같은 두 성분을 가집니다.",
        "Right. Bias and slope each need one partial derivative, so the gradient has the same two components as W.",
      ),
      incorrectFeedback: t(
        "loss는 스칼라이지만 각 파라미터를 얼마나 움직일지는 따로 필요합니다. 따라서 gradient shape는 파라미터 shape와 같습니다.",
        "Loss is a scalar, but each parameter needs its own movement signal. The gradient therefore matches the parameter shape.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE UPDATE",
        title: t("손실·gradient·학습률을 하나의 학습 루프로 연결하세요", "Connect loss, gradient, and learning rate into one learning loop"),
        description: t("네 문제와 두 필수 활동을 모두 마치면 챕터 완료 조건이 열립니다.", "Finish all four questions and both required activities to unlock the chapter gate."),
        correct: t("학습 흐름을 정확히 읽었습니다", "Training flow read correctly"),
        incorrect: t("업데이트 근거를 다시 확인하세요", "Recheck the update evidence"),
        checkAnswers: t("최적화 흐름 확인하기", "Check the optimization loop"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("아직 섞인 역할이 있습니다. loss는 값, gradient는 방향, η는 보폭입니다.", "Some roles are still mixed up: loss is a value, the gradient gives direction, and η sets step size."),
        idle: t("네 답을 고른 뒤 학습 루프를 확인하세요.", "Choose all four answers, then check the learning loop."),
      }}
    />
  );
}

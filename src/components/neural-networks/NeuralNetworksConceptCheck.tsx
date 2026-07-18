import { neuralNetworkQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { MathFormula } from "../MathFormula";

type QuestionId = keyof typeof neuralNetworkQuestions;

export function NeuralNetworksConceptCheck({
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
      id: "logit-to-probability",
      index: "01",
      prompt: isKo
        ? <>뉴런의 <MathFormula latex={String.raw`z=\mathbf{x}\cdot\mathbf{w}+b`} />를 0과 1 사이 확률로 바꾸는 단계는?</>
        : <>Which step turns a neuron's <MathFormula latex={String.raw`z=\mathbf{x}\cdot\mathbf{w}+b`} /> into a probability between 0 and 1?</>,
      options: [
        { value: "sigmoid-maps-logit-to-probability", label: "p = sigmoid(z)" },
        { value: "threshold-creates-probability", label: t("threshold가 확률 자체를 생성", "A threshold creates the probability") },
        { value: "bce-creates-logit", label: t("BCE가 logit을 생성", "BCE creates the logit") },
      ],
      correctAnswer: neuralNetworkQuestions["logit-to-probability"].correctAnswer,
      answerLabel: t("정답: sigmoid가 logit을 probability로 매핑", "Answer: sigmoid maps a logit to probability"),
      correctFeedback: t(
        "맞았습니다. affine 결과 z는 제한 없는 점수이고, sigmoid가 이를 (0,1) 범위의 p로 바꾼 뒤 threshold가 class를 만듭니다.",
        "Right. The affine result z is an unbounded score; sigmoid maps it into p in (0,1), and only then does a threshold make a class.",
      ),
      incorrectFeedback: t(
        "logit, probability, class를 분리하세요. sigmoid가 z→p를 담당하고 threshold는 p를 0/1 class로 읽습니다.",
        "Separate logit, probability, and class. Sigmoid performs z→p; a threshold reads p as class 0 or 1.",
      ),
    },
    {
      id: "bce-penalty",
      index: "02",
      prompt: t(
        "정답 y=1인 두 예측 p=0.49와 p=0.01 중 BCE가 더 크게 벌점 주는 것은?",
        "For label y=1, which prediction receives the larger BCE penalty: p=0.49 or p=0.01?",
      ),
      options: [
        { value: "confident-wrong-costs-most", label: t("p=0.01 — 틀린 쪽을 강하게 확신", "p=0.01 — confidently wrong") },
        { value: "near-threshold-costs-most", label: t("p=0.49 — threshold에 가까움", "p=0.49 — close to the threshold") },
        { value: "same-accuracy-same-loss", label: t("둘 다 class 0이므로 같은 loss", "Both are class 0, so loss is equal") },
      ],
      correctAnswer: neuralNetworkQuestions["bce-penalty"].correctAnswer,
      answerLabel: t("정답: 확신한 오답의 비용이 가장 큼", "Answer: confident wrong predictions cost most"),
      correctFeedback: t(
        "맞았습니다. 둘 다 accuracy로는 오답이지만 -log(p)는 p가 0에 가까울수록 급격히 커져 확률의 질을 구분합니다.",
        "Right. Both are accuracy errors, but -log(p) grows sharply as p approaches zero, so BCE distinguishes probability quality.",
      ),
      incorrectFeedback: t(
        "BCE는 accuracy가 아닙니다. 정답 class에 배정한 확률의 로그를 읽으므로 더 확신한 오답을 훨씬 크게 벌점 줍니다.",
        "BCE is not accuracy. It reads the log probability assigned to the true class, heavily penalizing greater confidence in a wrong answer.",
      ),
    },
    {
      id: "activation-purpose",
      index: "03",
      prompt: t(
        "Linear 층 두 개 사이의 activation을 제거하면 XOR 표현력에 어떤 일이 생길까요?",
        "What happens to XOR expressiveness when the activation between two Linear layers is removed?",
      ),
      options: [
        { value: "nonlinearity-bends-boundaries", label: t("비선형성이 사라져 두 affine이 하나의 직선 경계로 축약", "Without nonlinearity, two affine maps collapse into one linear boundary") },
        { value: "depth-alone-solves-xor", label: t("층 수만으로 XOR 해결", "Depth alone solves XOR") },
        { value: "activation-only-changes-speed", label: t("표현력은 같고 속도만 변함", "Only speed changes, not expressiveness") },
      ],
      correctAnswer: neuralNetworkQuestions["activation-purpose"].correctAnswer,
      answerLabel: t("정답: activation이 경계를 비선형으로 만듦", "Answer: activation makes the boundary nonlinear"),
      correctFeedback: t(
        "맞았습니다. affine의 합성은 여전히 affine입니다. hidden activation이 중간 feature 공간을 구부려야 다음 affine이 XOR을 나눌 수 있습니다.",
        "Right. A composition of affine maps is still affine. A hidden activation must bend feature space before the next affine map can separate XOR.",
      ),
      incorrectFeedback: t(
        "층을 많이 쓰는 것만으로는 충분하지 않습니다. affine 사이에 비선형 함수가 없으면 하나의 affine 식으로 합칠 수 있습니다.",
        "More layers alone are insufficient. Without a nonlinear function between affine maps, they can be merged into one affine expression.",
      ),
    },
    {
      id: "xor-hidden-features",
      index: "04",
      prompt: t(
        "hidden OR와 NAND가 각각 XOR 네 행의 다른 패턴을 표시할 때 output 뉴런이 해야 할 일은?",
        "When hidden OR and NAND mark different patterns across the four XOR rows, what should the output neuron do?",
      ),
      options: [
        { value: "combine-hidden-features", label: t("두 hidden feature를 결합해 양성 행만 높은 logit으로 만듦", "Combine both hidden features so only positive rows get high logits") },
        { value: "copy-first-input", label: t("x₁만 그대로 복사", "Copy only x₁") },
        { value: "average-labels", label: t("정답 label 네 개를 평균", "Average the four labels") },
      ],
      correctAnswer: neuralNetworkQuestions["xor-hidden-features"].correctAnswer,
      answerLabel: t("정답: hidden feature를 조합", "Answer: combine hidden features"),
      correctFeedback: t(
        "맞았습니다. hidden unit은 최종 확률이 아니라 학습된 중간 feature입니다. output affine이 이 feature들을 다시 조합합니다.",
        "Right. Hidden units are learned intermediate features, not final probabilities. The output affine map recombines them.",
      ),
      incorrectFeedback: t(
        "XOR은 입력 하나만 복사해 풀 수 없습니다. 서로 다른 hidden pattern을 같은 행에서 함께 읽어야 합니다.",
        "XOR cannot be solved by copying one input. The output must read distinct hidden patterns together on each row.",
      ),
    },
    {
      id: "layer-shapes",
      index: "05",
      prompt: isKo
        ? <>W¹[2,2]을 update할 <MathFormula latex={String.raw`\nabla_{W^1}L`} />의 shape는?</>
        : <>What is the shape of <MathFormula latex={String.raw`\nabla_{W^1}L`} /> used to update W¹[2,2]?</>,
      options: [
        { value: "gradient-matches-first-weights", label: "∇W¹ [2,2]" },
        { value: "hidden-activation-gradient", label: "∂L/∂H [4,2]" },
        { value: "output-delta-shape", label: "δ² [4,1]" },
      ],
      correctAnswer: neuralNetworkQuestions["layer-shapes"].correctAnswer,
      answerLabel: t("정답: gradient shape는 W¹과 같은 [2,2]", "Answer: the gradient matches W¹ at [2,2]"),
      correctFeedback: t(
        "맞았습니다. δ¹[4,2]는 표본별 hidden signal이고 Xᵀ[2,4]와 곱해지면 W¹과 같은 [2,2] parameter gradient가 됩니다.",
        "Right. δ¹[4,2] is the per-sample hidden signal; multiplying by Xᵀ[2,4] produces a [2,2] parameter gradient matching W¹.",
      ),
      incorrectFeedback: t(
        "중간 signal shape와 parameter gradient shape를 구분하세요. update할 수 있으려면 ∇W¹은 W¹의 각 원소에 하나씩 대응해야 합니다.",
        "Separate intermediate-signal shapes from parameter-gradient shapes. To update W¹, ∇W¹ needs one value for each element of W¹.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ FORWARD AND BACKWARD",
        title: t("logit, hidden feature, gradient와 XOR 확률을 연결하세요", "Connect logits, hidden features, gradients, and XOR probabilities"),
        description: t("다섯 문제와 두 필수 lab을 마치면 챕터 완료 조건이 열립니다.", "Finish five questions and both required labs to unlock the chapter gate."),
        correct: t("forward와 backward를 정확히 읽었습니다", "Forward and backward passes read correctly"),
        incorrect: t("shape와 forward·backward 역할을 다시 추적하세요", "Retrace shapes and forward/backward roles"),
        checkAnswers: t("신경망 왕복 흐름 확인하기", "Check the round-trip network flow"),
        completed: t("이해 확인 완료 — 두 필수 lab의 완료 상태를 확인하세요.", "Concept check complete — now confirm both required lab states."),
        retry: t("logit·probability·feature·gradient의 역할이 아직 섞여 있습니다.", "Some roles among logits, probabilities, features, and gradients are still mixed."),
        idle: t("다섯 답을 고른 뒤 forward와 backward를 확인하세요.", "Choose all five answers, then check forward and backward."),
      }}
    />
  );
}

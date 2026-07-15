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
        ? <>X[4,2]·W¹[2,2] 뒤에 activation을 적용하고 W²[2,1]을 곱하면 마지막 shape는?</>
        : <>After X[4,2]·W¹[2,2], an activation, and multiplication by W²[2,1], what is the final shape?</>,
      options: [
        { value: "two-hidden-activations-one-logit", label: "H[4,2] → logits[4,1]" },
        { value: "batch-becomes-hidden", label: "H[2,4] → logits[2,1]" },
        { value: "one-logit-total", label: "H[4,2] → logits[1,1]" },
      ],
      correctAnswer: neuralNetworkQuestions["layer-shapes"].correctAnswer,
      answerLabel: t("정답: 네 행마다 hidden 2개와 logit 1개", "Answer: two hidden activations and one logit per row"),
      correctFeedback: t(
        "맞았습니다. batch 4는 끝까지 보존되고, feature 축만 2→2→1로 바뀝니다.",
        "Right. Batch size 4 is preserved throughout; only the feature axis changes 2→2→1.",
      ),
      incorrectFeedback: t(
        "행은 독립 표본입니다. 행렬 곱은 batch 축을 섞지 않고 각 행의 feature 수만 바꿉니다.",
        "Rows are independent samples. Matrix multiplication preserves the batch axis and changes only the feature width.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE FORWARD PASS",
        title: t("logit에서 hidden feature와 XOR 확률까지 연결하세요", "Connect logits, hidden features, and XOR probabilities"),
        description: t("다섯 문제와 두 필수 활동을 마치면 챕터 완료 조건이 열립니다.", "Finish five questions and both required activities to unlock the chapter gate."),
        correct: t("forward pass를 정확히 읽었습니다", "Forward pass read correctly"),
        incorrect: t("shape와 역할을 다시 추적하세요", "Retrace shapes and roles"),
        checkAnswers: t("신경망 흐름 확인하기", "Check the network flow"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("logit·probability·feature·class의 역할이 아직 섞여 있습니다.", "Some roles among logits, probabilities, features, and classes are still mixed."),
        idle: t("다섯 답을 고른 뒤 forward pass를 확인하세요.", "Choose all five answers, then check the forward pass."),
      }}
    />
  );
}

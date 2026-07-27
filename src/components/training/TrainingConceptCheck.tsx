import { trainingQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { MathFormula } from "../MathFormula";

type QuestionId = keyof typeof trainingQuestions;

export function TrainingConceptCheck({
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
      id: "epoch-update-count",
      index: "01",
      prompt: t(
        "표본 7개를 batch size 2로 한 epoch 학습할 때 optimizer.step()은 몇 번이며 마지막 batch 크기는?",
        "With seven samples and batch size two, how many optimizer.step() calls occur in one epoch, and what is the tail-batch size?",
      ),
      options: [
        { value: "ceil-samples-over-batch", label: "4 updates · tail 1" },
        { value: "one-update-per-epoch", label: "1 update · tail 7" },
        { value: "floor-drop-tail", label: "3 updates · tail dropped" },
      ],
      correctAnswer: trainingQuestions["epoch-update-count"].correctAnswer,
      answerLabel: t("정답: ceil(7/2)=4", "Answer: ceil(7/2)=4"),
      correctFeedback: t(
        "맞았습니다. epoch는 모든 표본을 한 번 순회하는 범위이고, mini-batch마다 별도의 gradient와 update가 생깁니다. 마지막 1행도 버리지 않습니다.",
        "Right. An epoch is one pass over every sample; each mini-batch creates its own gradient and update. The final one-row batch is not discarded.",
      ),
      incorrectFeedback: t(
        "epoch와 update를 분리하세요. batch 수는 floor가 아니라 ceil이며 마지막 불완전 batch도 한 update입니다.",
        "Separate epochs from updates. Batch count uses ceil, not floor, and the incomplete final batch is still one update.",
      ),
    },
    {
      id: "softmax-axis",
      index: "02",
      prompt: isKo
        ? <>logits shape가 <MathFormula latex={String.raw`[B,K]`} />일 때 각 표본의 class 확률 합을 1로 만드는 softmax 축은?</>
        : <>For logits with shape <MathFormula latex={String.raw`[B,K]`} />, which softmax axis makes each sample's class probabilities sum to one?</>,
      options: [
        { value: "classes-within-each-row", label: t("각 행 안의 K classes", "The K classes within each row") },
        { value: "samples-down-each-column", label: t("각 열 아래의 B samples", "The B samples down each column") },
        { value: "whole-batch-global", label: t("B×K 전체 셀", "All B×K cells globally") },
      ],
      correctAnswer: trainingQuestions["softmax-axis"].correctAnswer,
      answerLabel: t("정답: sample row의 class 축", "Answer: the class axis within each sample row"),
      correctFeedback: t(
        "맞았습니다. 각 행은 서로 독립적인 분류 문제입니다. 다른 표본의 logit은 이 행의 softmax 분모에 들어가지 않습니다.",
        "Right. Every row is an independent classification problem. Another sample's logit does not enter this row's softmax denominator.",
      ),
      incorrectFeedback: t(
        "softmax가 정규화하는 후보는 한 표본이 선택할 K개 class입니다. batch sample끼리는 확률을 나누지 않습니다.",
        "Softmax normalizes the K class candidates for one sample. Samples in a batch do not share probability mass.",
      ),
    },
    {
      id: "fused-cross-entropy",
      index: "03",
      prompt: t(
        "일반적인 fused CrossEntropyLoss에 전달할 값과 batch reduction의 올바른 조합은?",
        "Which input and batch reduction are correct for a typical fused CrossEntropyLoss?",
      ),
      options: [
        { value: "raw-logits-true-label-mean", label: t("raw logits · true label · mean", "raw logits · true label · mean") },
        { value: "probabilities-argmax-sum", label: t("softmax 확률 · argmax · sum", "softmax probabilities · argmax · sum") },
        { value: "thresholded-classes", label: t("threshold class만 전달", "pass thresholded classes only") },
      ],
      correctAnswer: trainingQuestions["fused-cross-entropy"].correctAnswer,
      answerLabel: t("정답: raw logits에서 stable mean CE", "Answer: stable mean CE from raw logits"),
      correctFeedback: t(
        "맞았습니다. fused loss가 log-softmax를 안정적으로 포함하므로 미리 softmax하지 않습니다. 정답 label 위치를 읽고 batch 평균을 냅니다.",
        "Right. The fused loss already includes a stable log-softmax, so do not pre-softmax. Read the true-label position and average across the batch.",
      ),
      incorrectFeedback: t(
        "double softmax와 argmax target은 확신한 오답을 숨깁니다. raw logits와 실제 label을 loss에 그대로 전달하세요.",
        "Double softmax and an argmax target hide confident mistakes. Pass raw logits and the real labels directly to the loss.",
      ),
    },
    {
      id: "checkpoint-choice",
      index: "04",
      prompt: t(
        "epoch 1→5의 train loss가 0.82→0.55→0.31→0.18→0.12이고 validation loss가 0.86→0.58→0.37→0.41→0.53이라면 어느 checkpoint를 보존해야 할까요?",
        "Across epochs 1→5, train loss is 0.82→0.55→0.31→0.18→0.12 while validation loss is 0.86→0.58→0.37→0.41→0.53. Which checkpoint should be kept?",
      ),
      options: [
        { value: "minimum-validation-loss", label: t("epoch 3 · validation minimum", "epoch 3 · validation minimum") },
        { value: "minimum-training-loss", label: t("epoch 5 · training minimum", "epoch 5 · training minimum") },
        { value: "last-epoch-always", label: t("항상 마지막 epoch", "always the final epoch") },
      ],
      correctAnswer: trainingQuestions["checkpoint-choice"].correctAnswer,
      answerLabel: t("정답: validation loss가 최소인 epoch 3", "Answer: epoch three, where validation loss is lowest"),
      correctFeedback: t(
        "맞았습니다. epoch 4부터 train은 좋아지지만 validation은 나빠져 generalization gap이 벌어집니다. test set은 checkpoint 선택에 쓰지 않습니다.",
        "Right. From epoch four, training improves while validation worsens, widening the generalization gap. The test set is not used to choose checkpoints.",
      ),
      incorrectFeedback: t(
        "낮은 train loss만으로 unseen data 성능을 보장할 수 없습니다. validation이 다시 오르기 직전의 최소점을 선택하세요.",
        "Low training loss alone does not guarantee unseen-data performance. Choose the validation minimum before it starts rising.",
      ),
    },
    {
      id: "dropout-mode",
      index: "05",
      prompt: t(
        "inverted dropout이 activation의 기댓값을 보존하면서 validation을 결정적으로 만드는 모드 조합은?",
        "Which mode combination lets inverted dropout preserve expected activations while keeping validation deterministic?",
      ),
      options: [
        { value: "train-random-eval-off", label: t("train: random mask/(1-p) · eval: dropout off", "train: random mask/(1-p) · eval: dropout off") },
        { value: "random-in-both", label: t("train·eval 모두 random mask", "random masks in train and eval") },
        { value: "off-in-both", label: t("train·eval 모두 dropout off", "dropout off in train and eval") },
      ],
      correctAnswer: trainingQuestions["dropout-mode"].correctAnswer,
      answerLabel: t("정답: train에서만 stochastic, eval에서는 off", "Answer: stochastic only in train, off in eval"),
      correctFeedback: t(
        "맞았습니다. 1/(1-p) scaling은 개별 mask의 합이 아니라 activation의 기댓값을 보존합니다. eval에서는 mask와 scaling 모두 사라집니다.",
        "Right. The 1/(1-p) scaling preserves expected activation, not every mask's sum. In eval, both masking and scaling disappear.",
      ),
      incorrectFeedback: t(
        "validation에서 dropout을 켜면 같은 입력의 점수와 loss가 seed마다 바뀝니다. mode 전환을 훈련 루프의 일부로 보세요.",
        "Leaving dropout on during validation makes scores and loss depend on the random seed. Treat mode switching as part of the training loop.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE TRAINING LOOP",
        title: t("logits에서 checkpoint까지 한 훈련 루프로 연결하세요", "Connect logits through checkpoints as one training loop"),
        description: t(
          "다섯 문제와 필수 mini-batch lab을 마치면 챕터 완료 조건이 열립니다.",
          "Finish all five questions and the required mini-batch lab to unlock the chapter gate.",
        ),
        correct: t("훈련 계약을 정확히 읽었습니다", "Training contract read correctly"),
        incorrect: t("shape·state·평가 경계를 다시 추적하세요", "Retrace shape, state, and evaluation boundaries"),
        checkAnswers: t("훈련 루프 확인하기", "Check the training loop"),
        completed: t("이해 확인 완료 — 필수 mini-batch lab 상태를 확인하세요.", "Concept check complete — now confirm the required mini-batch lab."),
        retry: t("epoch·softmax·loss·validation·dropout 중 일부 경계가 아직 섞여 있습니다.", "Some boundaries among epochs, softmax, loss, validation, and dropout are still mixed."),
        idle: t("다섯 답을 고른 뒤 훈련 루프를 확인하세요.", "Choose all five answers, then check the training loop."),
      }}
    />
  );
}

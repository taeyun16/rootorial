import { useState } from "react";
import { ChapterStartLink } from "./ChapterStartLink";
import { useLocale } from "../features/localization/localization";
import { vectorOperationTrace } from "../features/learning/vector-operation";
import { binarySample } from "./formula-explorers/formula-model";
import { ConceptCheckRenderer, type ConceptQuestionSpec } from "./interactive/ConceptCheckRenderer";
import { MatrixGlyph } from "./interactive/MatrixGlyph";
import { VectorOperationPlot } from "./VectorOperationPlot";
import { MathFormula } from "./MathFormula";

type FoundationChapter = "vectors" | "optimization" | "neural-networks";

export function FoundationTransferCheck({ chapterSlug }: { chapterSlug: FoundationChapter }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [passed, setPassed] = useState(false);
  // These checks use fresh examples and the same numeric model as the visual.
  const scaledGradient = vectorOperationTrace("scale", [-2, 1], [0, 0], -0.1).result;
  const update = vectorOperationTrace("add", [0.4, -0.2], scaledGradient, 1);
  const delta = binarySample(0, 1).gradient;
  const neuronUpdate = vectorOperationTrace("add", [0, 0], [-0.1 * delta * 2, -0.1 * delta], 1);
  const nextLogit = 2 * neuronUpdate.result[0] + neuronUpdate.result[1];
  const nextSample = binarySample(nextLogit, 1);
  const vectorLabel = (values: readonly number[]) => "[" + values.map(value => Number(value.toFixed(3))).join(", ") + "]";
  const reviewLabel = t("관련 그림과 실습으로 복습", "Review the related visual and exercise");
  const questions: Record<FoundationChapter, ConceptQuestionSpec<string>> = {
    vectors: {
      id: "transfer-vector-update", index: "01",
      prompt: t("W=[0.4, −0.2], gradient=[−2, 1], η=0.1입니다. W − η·gradient의 결과를 먼저 예측하세요.", "W=[0.4, −0.2], gradient=[−2, 1], η=0.1. Predict W − η·gradient first."),
      options: [{ value: "subtract", label: vectorLabel(update.result) }, { value: "add", label: "[0.2, −0.1]" }, { value: "scale-only", label: "[−0.2, 0.1]" }],
      correctAnswer: "subtract", answerLabel: vectorLabel(update.result),
      correctFeedback: t("음수 gradient를 빼므로 첫 좌표는 증가하고, 양수 gradient를 빼므로 둘째 좌표는 감소합니다. 그림의 v는 W, w는 이동량 −η·gradient, r은 새 W입니다.", "Subtracting the negative gradient increases the first coordinate; subtracting the positive gradient decreases the second. In the plot, v is W, w is the step −η·gradient, and r is the new W."),
      incorrectFeedback: t("gradient를 그대로 더하거나 이동량만 답하지 마세요. 각 좌표에 −η를 곱한 이동량을 현재 W에 더합니다. 그림의 v는 W, w는 이동량, r은 새 W입니다.", "Use both the starting W and the step: multiply each gradient coordinate by −η, then add that step to W. In the plot, v is W, w is the step, and r is the new W."),
      visual: <VectorOperationPlot trace={update} isKo={isKo} />,
      review: { href: "#basics", label: reviewLabel },
    },
    optimization: {
      id: "transfer-neuron-update", index: "01",
      prompt: t("뉴런에 x=2, w=0, b=0, 정답 y=1, η=0.1을 넣습니다. p=0.5, δ=p−y=−0.5, ∂L/∂w=δx, ∂L/∂b=δ일 때 새 [w,b]는?", "A neuron has x=2, w=0, b=0, target y=1, η=0.1. With p=0.5, δ=p−y=−0.5, ∂L/∂w=δx and ∂L/∂b=δ, predict the new [w,b]."),
      options: [{ value: "subtract", label: vectorLabel(neuronUpdate.result) }, { value: "uphill", label: "[−0.1, −0.05]" }, { value: "swapped", label: "[0.05, 0.1]" }],
      correctAnswer: "subtract", answerLabel: vectorLabel(neuronUpdate.result),
      correctFeedback: t("최적화의 좌표별 업데이트를 뉴런에도 적용했습니다. w에는 δx, b에는 δ를 사용합니다. 이 한 표본에서는 y=1에 준 확률이 커져 BCE가 줄어듭니다.", "The same coordinate-wise update works for a neuron: use δx for w and δ for b. For this one sample, probability assigned to y=1 rises and BCE falls."),
      incorrectFeedback: t("[w,b]의 순서를 유지하세요. 두 gradient 모두 음수이므로 빼면 두 파라미터 모두 증가합니다. w의 gradient에만 입력 x=2를 곱합니다.", "Keep the order [w,b]. Both gradients are negative, so subtracting them increases both parameters. Only the weight gradient is multiplied by x=2."),
      visual: <div className="foundation-transfer-result">
        <MathFormula latex={String.raw`z_{next}=2\cdot 0.1+0.05=0.25`} display />
        <table><caption>{t("같은 표본을 업데이트 전후에 비교", "Compare the same sample before and after the update")}</caption>
          <thead><tr><th>{t("측정", "Measure")}</th><th>{t("전", "Before")}</th><th>{t("후", "After")}</th></tr></thead>
          <tbody><tr><th scope="row">z</th><td>0</td><td>{nextLogit.toFixed(2)}</td></tr><tr><th scope="row">p=σ(z)</th><td>0.500</td><td>{nextSample.probability.toFixed(3)}</td></tr><tr><th scope="row">BCE (y=1)</th><td>{binarySample(0, 1).loss.toFixed(3)}</td><td>{nextSample.loss.toFixed(3)}</td></tr></tbody>
        </table>
      </div>,
      review: { href: "#gradient", label: reviewLabel },
    },
    "neural-networks": {
      id: "transfer-class-shape", index: "01",
      prompt: t("다른 모델로 적용하세요: X[5,2], hidden width 4, 출력 class 3개입니다. XW¹ → H → HW² → logits에서 [H, W², logits]의 shape는?", "Apply the rule to a new model: X[5,2], hidden width 4, and 3 output classes. For XW¹ → H → HW² → logits, predict the shapes [H, W², logits]."),
      options: [{ value: "preserve-rows", label: "[5,4] · [4,3] · [5,3]" }, { value: "swap-axes", label: "[4,5] · [5,3] · [4,3]" }, { value: "keep-binary", label: "[5,4] · [4,1] · [5,1]" }],
      correctAnswer: "preserve-rows", answerLabel: "H[5,4] · W²[4,3] · logits[5,3]",
      correctFeedback: t("표본 5개는 행에 남고, hidden width는 중간 feature 수, class 수는 logits의 열 수가 됩니다. 여러 class에는 다음 장의 Softmax를 사용하며 sigmoid 세 개를 그대로 합치지 않습니다.", "Five samples remain rows; hidden width sets the intermediate features, and class count sets the logit columns. The next chapter uses softmax for multiple classes, rather than combining three independent sigmoids."),
      incorrectFeedback: t("행은 표본 수 5를 유지합니다. H의 feature 4개를 W²의 첫 축과 맞추고, W²의 출력 열을 class 수 3으로 정하세요.", "Keep five sample rows. Match H's four features to W²'s first axis, and set W²'s output columns to the three classes."),
      visual: <div className="foundation-transfer-shapes" aria-label={t("같은 표본 행을 유지하는 shape 경로", "Shape path preserving sample rows")}>
        <MatrixGlyph rows={5} columns={2} label="X[5,2]" /> → <MatrixGlyph rows={5} columns={4} label="H[5,4]" tone="indigo" /> → <MatrixGlyph rows={5} columns={3} label="logits[5,3]" tone="terra" />
      </div>,
      review: { href: "#hidden", label: reviewLabel },
    },
  };
  const next = "#check";
  return <section className="foundation-transfer-check" aria-label={t("다음 문제에 적용", "Apply to the next problem")}>
    <ConceptCheckRenderer purpose="transfer" questions={[questions[chapterSlug]]} onMasteryChange={setPassed} copy={{
      kicker: t("선택 · 다음 문제에 적용", "OPTIONAL · APPLY TO THE NEXT PROBLEM"),
      title: t("새 입력으로 먼저 예측하세요", "Predict with fresh inputs"),
      description: t("예측 → 제출 → 그림과 해설 → 이해 확인 순서입니다. 이 선택 문제는 챕터 완료 조건에 추가되지 않습니다. 복귀하면 답을 다시 확인합니다.", "Predict → submit → visual explanation → concept check. This optional question adds no chapter completion requirement. Answers are checked again when you return."),
      correct: t("새 문제에도 적용했습니다", "Applied to a new problem"), incorrect: t("좌표와 축을 다시 추적하세요", "Retrace coordinates and axes"),
      checkAnswers: t("전이 예측 확인", "Check transfer prediction"), completed: t("설명을 확인한 뒤 이해 확인으로 이어가세요.", "Read the explanation, then continue to the concept check."),
      retry: t("복습 링크에서 규칙을 확인하고 다시 예측하세요.", "Review the rule with the link, then predict again."), idle: t("제출하면 그림과 해설이 나타납니다.", "Submit to reveal the visual and explanation."),
    }} />
    {passed ? <ChapterStartLink className="learning-guide-start" href={next}>{t("다음 행동: 이해 확인에 적용", "Next action: apply in the concept check")} →</ChapterStartLink> : null}
  </section>;
}

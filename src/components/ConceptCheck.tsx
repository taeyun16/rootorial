import { ConceptVisualExplanation } from "./ConceptVisualExplanation";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "./interactive/ConceptCheckRenderer";
import { useLocale } from "../features/localization/localization";
import { MathFormula } from "./MathFormula";
import { useLearningAnalytics } from "./LearningAnalyticsProvider";
import { chapterRegistry } from "../features/chapters/chapter-registry";
import type { ReactNode } from "react";

type ConceptCheckProps = {
  onMasteryChange: (mastered: boolean) => void;
};

const questionContracts =
  chapterRegistry["transformer-from-zero/vectors"].questions;
type QuestionId = keyof typeof questionContracts;

function questionOptions<Answer extends string>(
  answers: readonly Answer[],
  labels: Record<Answer, ReactNode>,
) {
  return answers.map((value) => ({ value, label: labels[value] }));
}

export function ConceptCheck({ onMasteryChange }: ConceptCheckProps) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const { recordAnswers } = useLearningAnalytics();

  const questions: Array<ConceptQuestionSpec<QuestionId>> = [
    {
      id: "orientation",
      index: "01",
      prompt: isKo
        ? <>NumPy의 행벡터 <code>(1, 3)</code>과 열벡터 <code>(3, 1)</code>을 더하면 shape는?</>
        : <>What shape results from adding a NumPy row vector <code>(1, 3)</code> and column vector <code>(3, 1)</code>?</>,
      options: questionOptions(questionContracts.orientation.answers, {
        "row-column": "(3, 3)",
        flat: "(3,)",
        error: t("항상 오류", "Always an error"),
      }),
      correctAnswer: questionContracts.orientation.correctAnswer,
      answerLabel: <>{t("정답:", "Answer:")} <code>(3, 3)</code></>,
      correctFeedback: t("맞았습니다. 두 축으로 브로드캐스팅되어 3 × 3 행렬이 됩니다.", "Right. Broadcasting expands both axes into a 3 × 3 matrix."),
      incorrectFeedback: t("(1, 3)과 (3, 1)은 각 축이 확장되어 결과가 (3, 3)이 됩니다.", "The (1, 3) and (3, 1) shapes expand along their missing axes, producing (3, 3)."),
      visual: <ConceptVisualExplanation kind="orientation" />,
    },
    {
      id: "normalization",
      index: "02",
      prompt: isKo
        ? <>영벡터 <MathFormula latex={String.raw`[0, 0]`} />을 단위벡터로 정규화하면?</>
        : <>What happens when the zero vector <MathFormula latex={String.raw`[0, 0]`} /> is normalized to a unit vector?</>,
      options: questionOptions(questionContracts.normalization.answers, {
        zero: "[0, 0]",
        undefined: t("정의되지 않는다", "It is undefined"),
        one: "[1, 1]",
      }),
      correctAnswer: questionContracts.normalization.correctAnswer,
      answerLabel: t("정답: 정의되지 않는다", "Answer: it is undefined"),
      correctFeedback: isKo
        ? <>맞았습니다. <MathFormula latex={String.raw`\lVert [0, 0] \rVert_2 = 0`} />이므로 0으로 나눌 수 없습니다.</>
        : <>Right. <MathFormula latex={String.raw`\lVert [0, 0] \rVert_2 = 0`} />, so normalization would divide by zero.</>,
      incorrectFeedback: isKo
        ? <>단위벡터는 <MathFormula latex={String.raw`\widehat{\mathbf{v}} = \frac{\mathbf{v}}{\lVert \mathbf{v} \rVert_2}`} />인데 영벡터의 노름은 0이라 정의되지 않습니다.</>
        : <>A unit vector is <MathFormula latex={String.raw`\widehat{\mathbf{v}} = \frac{\mathbf{v}}{\lVert \mathbf{v} \rVert_2}`} />, but the zero vector has norm 0, so the result is undefined.</>,
      visual: <ConceptVisualExplanation kind="normalization" />,
    },
    {
      id: "tensor-shape",
      index: "03",
      prompt: t("두 문장에 각각 토큰 4개가 있고 임베딩 차원이 8이라면 입력 shape는?", "What is the input shape for two sentences with four tokens each and embedding dimension 8?"),
      options: questionOptions(questionContracts["tensor-shape"].answers, {
        "4-8": "[4, 8]",
        "2-4-8": "[2, 4, 8]",
        "8-4-2": "[8, 4, 2]",
      }),
      correctAnswer: questionContracts["tensor-shape"].correctAnswer,
      answerLabel: <>{t("정답:", "Answer:")} <code>[2, 4, 8]</code></>,
      correctFeedback: t("맞았습니다. batch 2, tokens 4, d_model 8 순서입니다.", "Right. The order is batch 2, tokens 4, d_model 8."),
      incorrectFeedback: t("첫 축은 batch 2, 둘째 축은 tokens 4, 마지막 축은 d_model 8입니다.", "The first axis is batch 2, the second is tokens 4, and the last is d_model 8."),
      visual: <ConceptVisualExplanation kind="tensor-shape" />,
    },
    {
      id: "broadcast-shape",
      index: "04",
      prompt: isKo
        ? <>텐서 <code>[2, 4, 8]</code>에 보정값 <code>[4, 8]</code>을 더한 결과 shape는?</>
        : <>What shape results from adding an offset <code>[4, 8]</code> to a tensor <code>[2, 4, 8]</code>?</>,
      options: questionOptions(questionContracts["broadcast-shape"].answers, {
        "shape-kept": "[2, 4, 8]",
        "shape-expanded": "[2, 8, 8]",
        "cannot-add": t("shape가 달라 더할 수 없다", "Cannot add different shapes"),
      }),
      correctAnswer: questionContracts["broadcast-shape"].correctAnswer,
      answerLabel: <>{t("정답:", "Answer:")} <code>[2, 4, 8]</code></>,
      correctFeedback: t("맞았습니다. [4, 8]이 빠진 첫 축을 따라 두 번 반복되어 전체 shape는 유지됩니다.", "Right. [4, 8] repeats twice along the missing first axis, preserving the full shape."),
      incorrectFeedback: t("[4, 8] 보정값이 첫 축의 두 묶음에 각각 반복되므로 결과는 [2, 4, 8]입니다.", "The [4, 8] offset repeats across both items of the first axis, so the result remains [2, 4, 8]."),
      visual: <ConceptVisualExplanation kind="broadcast" />,
    },
    {
      id: "dot-product",
      index: "05",
      prompt: t("두 벡터가 직교하면 내적과 코사인 유사도는?", "When two vectors are perpendicular, what are their dot product and cosine similarity?"),
      options: questionOptions(questionContracts["dot-product"].answers, {
        zero: t("둘 다 0", "Both are 0"),
        one: t("둘 다 1", "Both are 1"),
        negative: t("둘 다 음수", "Both are negative"),
      }),
      correctAnswer: questionContracts["dot-product"].correctAnswer,
      answerLabel: t("정답: 둘 다 0", "Answer: both are 0"),
      correctFeedback: isKo
        ? <>맞았습니다. <MathFormula latex={String.raw`\cos 90^\circ = 0`} />이므로 내적도 0입니다.</>
        : <>Right. <MathFormula latex={String.raw`\cos 90^\circ = 0`} />, so the dot product is also 0.</>,
      incorrectFeedback: isKo
        ? <><MathFormula latex={String.raw`\mathbf{a}\cdot\mathbf{b}=\lVert\mathbf{a}\rVert_2\lVert\mathbf{b}\rVert_2\cos 90^\circ`} />이고 <MathFormula latex={String.raw`\cos 90^\circ = 0`} />입니다.</>
        : <><MathFormula latex={String.raw`\mathbf{a}\cdot\mathbf{b}=\lVert\mathbf{a}\rVert_2\lVert\mathbf{b}\rVert_2\cos 90^\circ`} />, and <MathFormula latex={String.raw`\cos 90^\circ = 0`} />.</>,
      visual: <ConceptVisualExplanation kind="dot-product" />,
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "PREDICT BEFORE YOU RUN",
        title: t("실행하지 않고 연산 결과와 shape를 먼저 예측하세요", "Predict each result and shape before running the code"),
        description: t("다섯 문제를 모두 맞히면 이 챕터를 완료할 수 있습니다.", "Answer all five questions correctly to complete this chapter."),
        correct: t("정답이에요", "Correct"),
        incorrect: t("다시 살펴봐요", "Take another look"),
        checkAnswers: t("답 확인하기", "Check answers"),
        completed: t("이해 확인 완료 — 이제 챕터를 완료할 수 있습니다.", "Concept check complete — you can now finish the chapter."),
        retry: t("아직 확인할 축이 있습니다. 설명을 읽고 다시 답해 보세요.", "Some axes still need attention. Read the explanations and try again."),
        idle: t("다섯 답을 고른 뒤 확인해 보세요.", "Choose all five answers, then check your work."),
      }}
    />
  );
}

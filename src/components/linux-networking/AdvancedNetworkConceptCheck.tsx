import type { AdvancedChapterConfig } from "../../features/linux-networking/advanced-networking";
import { useLocale } from "../../features/localization/localization";
import { ConceptCheckRenderer } from "../interactive/ConceptCheckRenderer";

export function AdvancedNetworkConceptCheck({ config, onMasteryChange }: { config: AdvancedChapterConfig; onMasteryChange: (mastered: boolean) => void }) {
  const { locale } = useLocale();
  const questions = config.questions.map((question, index) => ({
    id: question.id,
    index: String(index + 1).padStart(2, "0"),
    prompt: question.prompt[locale],
    options: question.options.map((candidate) => ({ value: candidate.value, label: candidate.label[locale] })),
    correctAnswer: question.correctAnswer,
    answerLabel: `${locale === "ko" ? "정답" : "Answer"}: ${question.options.find((candidate) => candidate.value === question.correctAnswer)?.label[locale]}`,
    correctFeedback: locale === "ko" ? "이 경계가 직접 증명하는 범위를 정확히 읽었습니다." : "You identified exactly what this boundary proves.",
    incorrectFeedback: locale === "ko" ? "명령의 출력과 실제로 증명된 경계를 다시 비교하세요." : "Compare the command output with the boundary it actually proves.",
  }));
  return <ConceptCheckRenderer questions={questions} onMasteryChange={onMasteryChange} copy={{ kicker: "CHECK THE EVIDENCE CONTRACT", title: locale === "ko" ? "관찰한 사실보다 더 많이 추론하지 마세요" : "Do not infer more than the evidence proves", description: locale === "ko" ? `다섯 질문으로 ${config.number}장의 핵심 경계를 점검합니다.` : `Use five questions to verify the key boundaries in chapter ${config.number}.`, correct: locale === "ko" ? "정확합니다" : "Correct", incorrect: locale === "ko" ? "다시 확인하세요" : "Check again", checkAnswers: locale === "ko" ? "답 확인하기" : "Check answers", completed: locale === "ko" ? "개념 확인 완료" : "Concept check complete", retry: locale === "ko" ? "실행 그림을 다시 확인한 뒤 수정하세요." : "Revisit the executable figure, then revise your answers.", idle: locale === "ko" ? "다섯 답을 선택하세요." : "Choose all five answers." }} />;
}

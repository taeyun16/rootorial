import { useState, type FormEvent, type ReactNode } from "react";

export type ConceptQuestionSpec<QuestionId extends string> = {
  id: QuestionId;
  index: string;
  prompt: ReactNode;
  options: Array<{ value: string; label: ReactNode }>;
  correctAnswer: string;
  answerLabel: ReactNode;
  correctFeedback: ReactNode;
  incorrectFeedback: ReactNode;
  visual?: ReactNode;
};

type ConceptCheckCopy = {
  kicker: string;
  title: string;
  description: string;
  correct: string;
  incorrect: string;
  checkAnswers: string;
  completed: string;
  retry: string;
  idle: string;
};

type ConceptCheckRendererProps<QuestionId extends string> = {
  questions: Array<ConceptQuestionSpec<QuestionId>>;
  copy: ConceptCheckCopy;
  onMasteryChange: (mastered: boolean) => void;
  onSubmitAttempt?: (answers: Record<QuestionId, string>) => void;
};

export function ConceptCheckRenderer<QuestionId extends string>({
  questions,
  copy,
  onMasteryChange,
  onSubmitAttempt,
}: ConceptCheckRendererProps<QuestionId>) {
  const [answers, setAnswers] = useState<Partial<Record<QuestionId, string>>>({});
  const [submitted, setSubmitted] = useState(false);
  const allAnswered = questions.every((question) => Boolean(answers[question.id]));
  const mastered = submitted && questions.every((question) => answers[question.id] === question.correctAnswer);

  function chooseAnswer(questionId: QuestionId, answer: string) {
    setAnswers((current) => ({ ...current, [questionId]: answer }));
    if (submitted) {
      setSubmitted(false);
      onMasteryChange(false);
    }
  }

  function checkAnswers(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passed = questions.every((question) => answers[question.id] === question.correctAnswer);
    setSubmitted(true);
    onMasteryChange(passed);
    onSubmitAttempt?.(answers as Record<QuestionId, string>);
  }

  return (
    <form className="concept-check" onSubmit={checkAnswers}>
      <div className="concept-check-intro">
        <p className="concept-check-kicker">{copy.kicker}</p>
        <h3>{copy.title}</h3>
        <p>{copy.description}</p>
      </div>

      {questions.map((question) => {
        const correct = answers[question.id] === question.correctAnswer;
        const feedbackId = `${question.id}-feedback`;
        return (
          <fieldset
            className="concept-question"
            aria-describedby={submitted ? feedbackId : undefined}
            data-question-id={question.id}
            key={question.id}
          >
            <legend>
              <span>{question.index}</span>
              <span className="concept-question-copy">{question.prompt}</span>
            </legend>
            <div className="concept-options">
              {question.options.map((option, optionIndex) => (
                <button
                  type="button"
                  className="concept-option"
                  aria-pressed={answers[question.id] === option.value}
                  onClick={() => chooseAnswer(question.id, option.value)}
                  key={option.value}
                >
                  <span aria-hidden="true">{answers[question.id] === option.value ? "✓" : String.fromCharCode(65 + optionIndex)}</span>
                  <code>{option.label}</code>
                </button>
              ))}
            </div>
            {submitted ? (
              <div
                className={`concept-feedback${correct ? " concept-feedback-correct" : " concept-feedback-incorrect"}`}
                id={feedbackId}
              >
                <div className="concept-feedback-header">
                  <strong>{correct ? copy.correct : copy.incorrect}</strong>
                  <span>{question.answerLabel}</span>
                </div>
                <p>{correct ? question.correctFeedback : question.incorrectFeedback}</p>
                {question.visual}
              </div>
            ) : null}
          </fieldset>
        );
      })}

      <div className="concept-check-actions">
        <button type="submit" className="button button-primary concept-check-submit" disabled={!allAnswered}>
          {copy.checkAnswers}
        </button>
        <div className="concept-check-summary" role="status" aria-live="polite">
          {submitted ? (mastered ? copy.completed : copy.retry) : copy.idle}
        </div>
      </div>
    </form>
  );
}

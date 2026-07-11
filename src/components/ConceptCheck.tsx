import { useState } from "react";

type ConceptCheckProps = {
  onMasteryChange: (mastered: boolean) => void;
};

type Answers = {
  tensorShape: string;
  broadcastShape: string;
};

const initialAnswers: Answers = {
  tensorShape: "",
  broadcastShape: "",
};

export function ConceptCheck({ onMasteryChange }: ConceptCheckProps) {
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [submitted, setSubmitted] = useState(false);

  const tensorShapeCorrect = answers.tensorShape === "2-4-8";
  const broadcastShapeCorrect = answers.broadcastShape === "shape-kept";
  const mastered = submitted && tensorShapeCorrect && broadcastShapeCorrect;

  function chooseAnswer(question: keyof Answers, answer: string) {
    setAnswers((current) => ({ ...current, [question]: answer }));
    if (submitted) {
      setSubmitted(false);
      onMasteryChange(false);
    }
  }

  function checkAnswers(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const passed = tensorShapeCorrect && broadcastShapeCorrect;
    setSubmitted(true);
    onMasteryChange(passed);
  }

  return (
    <form className="concept-check" onSubmit={checkAnswers}>
      <div className="concept-check-intro">
        <p className="concept-check-kicker">PREDICT BEFORE YOU RUN</p>
        <h3>숫자를 계산하지 않고 shape를 먼저 예측하세요</h3>
        <p>두 문제를 모두 맞히면 이 챕터를 완료할 수 있습니다.</p>
      </div>

      <fieldset
        className="concept-question"
        aria-describedby={submitted ? "tensor-shape-feedback" : undefined}
      >
        <legend>
          <span>01</span>
          <span className="concept-question-copy">
            두 문장에 각각 토큰 4개가 있고 임베딩 차원이 8이라면 입력 shape는?
          </span>
        </legend>
        <div className="concept-options">
          {[
            ["4-8", "[4, 8]"],
            ["2-4-8", "[2, 4, 8]"],
            ["8-4-2", "[8, 4, 2]"],
          ].map(([value, label]) => (
            <label className="concept-option" key={value}>
              <input
                type="radio"
                name="tensor-shape"
                value={value}
                checked={answers.tensorShape === value}
                onChange={() => chooseAnswer("tensorShape", value)}
                required
              />
              <code>{label}</code>
            </label>
          ))}
        </div>
        {submitted ? (
          <p
            className={`concept-feedback${tensorShapeCorrect ? " concept-feedback-correct" : " concept-feedback-incorrect"}`}
            id="tensor-shape-feedback"
          >
            {tensorShapeCorrect
              ? "맞았습니다. batch 2, tokens 4, d_model 8 순서입니다."
              : "첫 축은 batch 2, 둘째 축은 tokens 4, 마지막 축은 d_model 8입니다."}
          </p>
        ) : null}
      </fieldset>

      <fieldset
        className="concept-question"
        aria-describedby={submitted ? "broadcast-shape-feedback" : undefined}
      >
        <legend>
          <span>02</span>
          <span className="concept-question-copy">
            임베딩 <code>[2, 4, 8]</code>에 위치 행렬 <code>[4, 8]</code>을 더한
            결과 shape는?
          </span>
        </legend>
        <div className="concept-options">
          {[
            ["shape-kept", "[2, 4, 8]"],
            ["shape-expanded", "[2, 8, 8]"],
            ["cannot-add", "shape가 달라 더할 수 없다"],
          ].map(([value, label]) => (
            <label className="concept-option" key={value}>
              <input
                type="radio"
                name="broadcast-shape"
                value={value}
                checked={answers.broadcastShape === value}
                onChange={() => chooseAnswer("broadcastShape", value)}
                required
              />
              <code>{label}</code>
            </label>
          ))}
        </div>
        {submitted ? (
          <p
            className={`concept-feedback${broadcastShapeCorrect ? " concept-feedback-correct" : " concept-feedback-incorrect"}`}
            id="broadcast-shape-feedback"
          >
            {broadcastShapeCorrect
              ? "맞았습니다. [4, 8]이 batch 축으로 브로드캐스팅되어 전체 shape는 유지됩니다."
              : "[4, 8] 위치 행렬을 batch의 각 문장에 반복해서 더하므로 결과는 [2, 4, 8]입니다."}
          </p>
        ) : null}
      </fieldset>

      <div className="concept-check-actions">
        <button type="submit" className="button button-primary concept-check-submit">
          답 확인하기
        </button>
        <div className="concept-check-summary" role="status" aria-live="polite">
          {submitted
            ? mastered
              ? "이해 확인 완료 — 이제 챕터를 완료할 수 있습니다."
              : "아직 확인할 축이 있습니다. 설명을 읽고 다시 답해 보세요."
            : "두 답을 고른 뒤 확인해 보세요."}
        </div>
      </div>
    </form>
  );
}

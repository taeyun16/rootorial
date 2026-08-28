import { useEffect, useMemo, useState } from "react";
import { useLocale } from "../features/localization/localization";

type MissionId = "transpose" | "broadcast" | "tensor";

type Mission = {
  id: MissionId;
  index: string;
  title: string;
  context: string;
  code: string;
  question: string;
  options: Array<{ value: string; label: string }>;
  correctAnswer: string;
  explanation: string;
  repair: string;
};

type ShapeDebuggingLabProps = {
  onCompletionChange?: (completed: boolean) => void;
};

export function ShapeDebuggingLab({ onCompletionChange }: ShapeDebuggingLabProps = {}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const [answers, setAnswers] = useState<Partial<Record<MissionId, string>>>({});
  const [checked, setChecked] = useState<Partial<Record<MissionId, boolean>>>({});

  const missions = useMemo<Mission[]>(() => isKo ? [
    {
      id: "transpose",
      index: "01",
      title: "전치했는데 왜 세로가 되지 않을까요?",
      context: "rank-1 배열에는 바꿀 두 번째 축이 없습니다. 실행 전에 출력 shape를 예측하세요.",
      code: "v = np.array([1, 2, 3])\nprint(v.T.shape)",
      question: "출력되는 shape는 무엇일까요?",
      options: [
        { value: "flat", label: "(3,)" },
        { value: "row", label: "(1, 3)" },
        { value: "column", label: "(3, 1)" },
      ],
      correctAnswer: "flat",
      explanation: ".T는 존재하는 축의 순서만 바꿉니다. (3,)에는 축이 하나뿐이라 결과가 그대로입니다.",
      repair: "column = v.reshape(-1, 1)  # shape (3, 1)",
    },
    {
      id: "broadcast",
      index: "02",
      title: "벡터를 더했는데 표가 생겼습니다",
      context: "NumPy는 길이만 보는 대신 오른쪽부터 각 축을 비교합니다.",
      code: "column = np.ones((3, 1))\nrow = np.ones((1, 3))\nresult = column + row",
      question: "result의 shape는 무엇일까요?",
      options: [
        { value: "flat", label: "(3,)" },
        { value: "matrix", label: "(3, 3)" },
        { value: "error", label: "오류" },
      ],
      correctAnswer: "matrix",
      explanation: "첫 배열의 열 축 1은 3으로, 둘째 배열의 행 축 1도 3으로 늘어나 3 × 3 결과가 됩니다.",
      repair: "같은 방향의 벡터 덧셈이 목적이라면 두 배열을 모두 (3,) 또는 모두 (3, 1)로 맞추세요.",
    },
    {
      id: "tensor",
      index: "03",
      title: "숫자보다 먼저 축의 의미를 읽어 보세요",
      context: "문장 두 개, 문장마다 토큰 세 개, 토큰마다 숫자 네 개가 있습니다.",
      code: "batch = np.stack([sentence_a, sentence_b])\nprint(batch.shape)",
      question: "[batch, tokens, d_model] 순서의 shape는?",
      options: [
        { value: "correct", label: "[2, 3, 4]" },
        { value: "tokens-first", label: "[3, 2, 4]" },
        { value: "features-first", label: "[4, 3, 2]" },
      ],
      correctAnswer: "correct",
      explanation: "첫 축은 문장 수 2, 둘째 축은 문장 안의 토큰 수 3, 마지막 축은 토큰 벡터의 차원 4입니다.",
      repair: "shape를 볼 때 각 숫자를 batch → tokens → d_model 순서로 소리 내어 읽어 보세요.",
    },
  ] : [
    {
      id: "transpose",
      index: "01",
      title: "Why did transpose not make a column?",
      context: "A rank-1 array has no second axis to swap. Predict the output shape before running it.",
      code: "v = np.array([1, 2, 3])\nprint(v.T.shape)",
      question: "What shape is printed?",
      options: [
        { value: "flat", label: "(3,)" },
        { value: "row", label: "(1, 3)" },
        { value: "column", label: "(3, 1)" },
      ],
      correctAnswer: "flat",
      explanation: ".T only reorders axes that already exist. A (3,) array has one axis, so nothing changes.",
      repair: "column = v.reshape(-1, 1)  # shape (3, 1)",
    },
    {
      id: "broadcast",
      index: "02",
      title: "Adding two vectors created a table",
      context: "NumPy compares axes from the right instead of looking only at the number of values.",
      code: "column = np.ones((3, 1))\nrow = np.ones((1, 3))\nresult = column + row",
      question: "What is the shape of result?",
      options: [
        { value: "flat", label: "(3,)" },
        { value: "matrix", label: "(3, 3)" },
        { value: "error", label: "Error" },
      ],
      correctAnswer: "matrix",
      explanation: "The first array's size-1 column axis expands to 3, and the second array's size-1 row axis also expands to 3.",
      repair: "For ordinary vector addition, make both arrays (3,) or make both arrays (3, 1).",
    },
    {
      id: "tensor",
      index: "03",
      title: "Read axis meaning before values",
      context: "There are two sentences, three tokens per sentence, and four values per token.",
      code: "batch = np.stack([sentence_a, sentence_b])\nprint(batch.shape)",
      question: "What is the [batch, tokens, d_model] shape?",
      options: [
        { value: "correct", label: "[2, 3, 4]" },
        { value: "tokens-first", label: "[3, 2, 4]" },
        { value: "features-first", label: "[4, 3, 2]" },
      ],
      correctAnswer: "correct",
      explanation: "The first axis is 2 sentences, the second is 3 tokens, and the last is the 4-dimensional token vector.",
      repair: "Read every shape aloud in batch → tokens → d_model order.",
    },
  ], [isKo]);

  const solved = missions.filter((mission) => checked[mission.id] && answers[mission.id] === mission.correctAnswer).length;
  const hasAttempt = Object.keys(answers).length > 0;

  useEffect(() => {
    onCompletionChange?.(solved === missions.length);
  }, [missions.length, onCompletionChange, solved]);

  return (
    <section className="shape-debug-lab" aria-labelledby="shape-debug-title">
      <header className="shape-debug-header">
        <div>
          <p className="tensor-shape-kicker">SHAPE DETECTIVE</p>
          <h3 id="shape-debug-title">{isKo ? "실행 전에 shape를 예측하세요" : "Predict the shape before you run"}</h3>
          <p>{isKo ? "정답을 외우기보다 shape가 만들어지는 규칙을 세 번 추적합니다." : "Trace how each shape is formed instead of memorizing the answer."}</p>
        </div>
        <div className="shape-debug-progress">
          <strong aria-label={isKo ? `${solved}개 중 3개 해결` : `${solved} of 3 solved`}>{solved} / 3</strong>
          <button
            type="button"
            disabled={!hasAttempt}
            onClick={() => {
              setAnswers({});
              setChecked({});
            }}
          >
            {isKo ? "미션 초기화" : "Reset missions"}
          </button>
        </div>
      </header>

      <div className="shape-debug-missions">
        {missions.map((mission) => {
          const answer = answers[mission.id];
          const isChecked = Boolean(checked[mission.id]);
          const isCorrect = isChecked && answer === mission.correctAnswer;

          return (
            <article className={`shape-debug-mission${isChecked ? isCorrect ? " is-correct" : " is-incorrect" : ""}`} key={mission.id}>
              <div className="shape-debug-mission-heading">
                <span>{mission.index}</span>
                <div>
                  <h4>{mission.title}</h4>
                  <p>{mission.context}</p>
                </div>
              </div>
              <pre><code>{mission.code}</code></pre>
              <fieldset>
                <legend>{mission.question}</legend>
                <div className="shape-debug-options">
                  {mission.options.map((option) => (
                    <button
                      type="button"
                      aria-pressed={answer === option.value}
                      onClick={() => {
                        setAnswers((current) => ({ ...current, [mission.id]: option.value }));
                        setChecked((current) => ({ ...current, [mission.id]: false }));
                      }}
                      key={option.value}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </fieldset>
              <button
                type="button"
                className="shape-debug-check"
                disabled={!answer}
                onClick={() => setChecked((current) => ({ ...current, [mission.id]: true }))}
              >
                {isKo ? "예측 확인하기" : "Check prediction"}
              </button>
              {isChecked ? (
                <div className="shape-debug-feedback" role="status">
                  <strong>{isCorrect ? (isKo ? "정확해요" : "Correct") : (isKo ? "한 번 더 축을 따라가 보세요" : "Trace the axes once more")}</strong>
                  <p>{mission.explanation}</p>
                  <code>{mission.repair}</code>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>

      <footer className="shape-debug-summary" role="status" aria-live="polite">
        {solved === missions.length
          ? (isKo ? "세 가지 shape 함정을 모두 해결했습니다. 이제 실행 결과를 보기 전에 축을 먼저 읽을 수 있습니다." : "You solved all three shape traps. You can now read axes before looking at runtime output.")
          : (isKo ? "각 미션은 선택한 뒤 ‘예측 확인하기’를 눌러야 완료됩니다." : "Choose an answer and check the prediction to complete each mission.")}
      </footer>
    </section>
  );
}

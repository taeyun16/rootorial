import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  evaluatePracticeMastery,
  type PracticeAttempt,
  type PracticeCheck,
} from "../../features/practice/practice";
import {
  attentionSecondFixture,
  attentionVisibleFixture,
  broadcastBrokenRightShape,
  broadcastLeftShape,
  broadcastRepairShapes,
  evaluateAttentionScoreShape,
  evaluateBroadcastShapes,
  reshapeSecondFixture,
  reshapeVisibleFixture,
  reshapeWithColumnChoice,
  vectorPracticeChallenges,
  type AttentionScoreOperation,
  type AttentionShapePrediction,
  type BroadcastFailureAxis,
  type BroadcastPrediction,
  type BroadcastRepair,
  type ReshapeColumnChoice,
  type ReshapePrediction,
  type Shape,
  type VectorPracticeChallengeId,
} from "../../features/vectors/vectors-practice";
import { DirectChoice } from "../interactive/DirectChoice";
import {
  PracticeDeck,
  PracticeResultChecks,
} from "../interactive/PracticeDeck";

type Attempts = Partial<Record<
  VectorPracticeChallengeId,
  PracticeAttempt<VectorPracticeChallengeId>
>>;

function shapeText(shape: Shape | null) {
  return shape ? `(${shape.join(", ")})` : "ShapeError";
}

function operationText(operation: AttentionScoreOperation) {
  return {
    "q-k-transpose": "Q @ K.T",
    "q-transpose-k": "Q.T @ K",
    "q-k": "Q @ K",
  }[operation];
}

export function VectorsPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<VectorPracticeChallengeId>("reshape-inference");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [reshapePrediction, setReshapePrediction] =
    useState<ReshapePrediction | "">("");
  const [reshapeColumns, setReshapeColumns] =
    useState<ReshapeColumnChoice | "">("");
  const [broadcastPrediction, setBroadcastPrediction] =
    useState<BroadcastPrediction | "">("");
  const [broadcastAxis, setBroadcastAxis] =
    useState<BroadcastFailureAxis | "">("");
  const [broadcastRepair, setBroadcastRepair] =
    useState<BroadcastRepair | "">("");
  const [attentionPrediction, setAttentionPrediction] =
    useState<AttentionShapePrediction | "">("");
  const [attentionOperation, setAttentionOperation] =
    useState<AttentionScoreOperation | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(() => vectorPracticeChallenges.map((challenge) => {
    const localized = {
      "reshape-inference": {
        skillId: t("재현", "reproduce"),
        label: "reshape(3, ?)",
        title: t("두 fixture에서 행 계약을 유지하세요", "Keep the row contract across two fixtures"),
        summary: t(
          "원소 수가 달라져도 같은 learner 표현 하나로 세 행을 유지합니다.",
          "Keep three rows with one learner expression even when the element count changes.",
        ),
      },
      "broadcast-repair": {
        skillId: t("진단", "diagnose"),
        label: t("Broadcast 경계", "Broadcast boundary"),
        title: t("오른쪽부터 첫 비호환 축을 찾으세요", "Find the first incompatible axis from the right"),
        summary: t(
          "실패를 예측하고, 첫 경계를 지목한 뒤 오른쪽 operand만 최소 수정합니다.",
          "Predict the failure, identify its first boundary, then minimally repair only the right operand.",
        ),
      },
      "attention-score-shape": {
        skillId: t("전이", "transfer"),
        label: "QKᵀ shape",
        title: t("내적 shape를 Attention score로 전이하세요", "Transfer dot-product shape to Attention scores"),
        summary: t(
          "모든 query가 모든 key와 점수를 만들도록 하나의 행렬식을 두 fixture에 적용합니다.",
          "Apply one matrix expression to two fixtures so every query receives a score for every key.",
        ),
      },
    }[challenge.id];
    return { ...challenge, ...localized };
  }), [isKo]);

  const mastery = useMemo(
    () => evaluatePracticeMastery(challenges, attempts),
    [attempts, challenges],
  );

  const resultLabels = {
    idle: t("예측과 learner 영역을 채운 뒤 실행하세요.", "Complete the prediction and learner-owned controls, then run."),
    passed: t("이 문제의 증거가 완성되었습니다.", "Evidence for this challenge is complete."),
    failed: t("첫 실패 계약을 확인하고 같은 문제를 다시 실행하세요.", "Inspect the first failed contract, then run the same challenge again."),
    expected: t("기대 계약", "EXPECTED"),
    actual: t("실제 결과", "ACTUAL"),
    firstFailed: t("먼저 고칠 계약", "FIX THIS CONTRACT FIRST"),
  };

  const updateAttempt = (
    challengeId: VectorPracticeChallengeId,
    checks: readonly PracticeCheck[],
  ) => {
    setAttempts((current) => ({
      ...current,
      [challengeId]: {
        challengeId,
        passed: checks.every(({ passed }) => passed),
        checks,
      },
    }));
  };

  const invalidate = (challengeId: VectorPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReshape = () => {
    if (!reshapePrediction || reshapeColumns === "") return;
    const visible = reshapeWithColumnChoice(reshapeVisibleFixture, reshapeColumns);
    const second = reshapeWithColumnChoice(reshapeSecondFixture, reshapeColumns);
    updateAttempt("reshape-inference", [
      {
        id: "prediction",
        label: t("두 fixture 결과 예측", "Prediction for both fixtures"),
        passed: reshapePrediction === "adapts-both",
        expected: "(3, 4) · (3, 6)",
        actual: {
          "adapts-both": "(3, 4) · (3, 6)",
          "four-columns-both": "(3, 4) · (3, 4)",
          "second-errors": "(3, 4) · ShapeError",
        }[reshapePrediction],
        explanation: t(
          "-1은 남은 원소 수에서 정확한 한 축을 추론하므로 같은 코드가 두 입력에 적응합니다.",
          "-1 infers the one remaining axis from the element count, so the same code adapts to both inputs.",
        ),
      },
      {
        id: "visible-fixture",
        label: t("공개 fixture · 원소 12개", "Visible fixture · 12 elements"),
        passed: shapeText(visible) === "(3, 4)",
        expected: "(3, 4)",
        actual: shapeText(visible),
        explanation: t(
          "12개 원소를 세 행으로 나누면 각 행에는 네 원소가 남습니다.",
          "Dividing 12 elements into three rows leaves four elements per row.",
        ),
      },
      {
        id: "second-fixture",
        label: t("두 번째 fixture · 원소 18개", "Second fixture · 18 elements"),
        passed: shapeText(second) === "(3, 6)",
        expected: "(3, 6)",
        actual: shapeText(second),
        explanation: t(
          "고정된 4나 6이 아니라 추론 축을 사용해야 입력 크기가 바뀌어도 계약을 지킵니다.",
          "The inferred axis, rather than a fixed 4 or 6, preserves the contract when input size changes.",
        ),
      },
    ]);
  };

  const runBroadcast = () => {
    if (!broadcastPrediction || !broadcastAxis || !broadcastRepair) return;
    const broken = evaluateBroadcastShapes(
      broadcastLeftShape,
      broadcastBrokenRightShape,
    );
    const repaired = evaluateBroadcastShapes(
      broadcastLeftShape,
      broadcastRepairShapes[broadcastRepair],
    );
    updateAttempt("broadcast-repair", [
      {
        id: "prediction",
        label: t("실행 전 결과 예측", "Prediction before running"),
        passed: broadcastPrediction === "shape-error",
        expected: "ShapeError",
        actual: broadcastPrediction === "shape-error"
          ? "ShapeError"
          : t("브로드캐스트 성공", "broadcast succeeds"),
        explanation: t(
          "브로드캐스팅은 오른쪽 축부터 같거나 1인지 확인하며, 마지막 3과 2는 어느 쪽도 1이 아닙니다.",
          "Broadcasting compares from the right; the final 3 and 2 are unequal and neither is 1.",
        ),
      },
      {
        id: "first-failed-axis",
        label: t("첫 실패 계약", "First failed contract"),
        passed: broadcastAxis === "feature" && broken.failedAxisFromRight === 0,
        expected: t("feature 축 · 오른쪽에서 첫 번째", "feature axis · first from the right"),
        actual: {
          leading: t("leading 축", "leading axis"),
          middle: t("middle 축", "middle axis"),
          feature: t("feature 축", "feature axis"),
        }[broadcastAxis],
        explanation: t(
          "왼쪽부터 축 이름을 외우기보다 오른쪽 정렬 후 첫 불일치를 찾습니다.",
          "Right-align the shapes and stop at the first mismatch instead of memorizing names from the left.",
        ),
      },
      {
        id: "minimal-repair",
        label: t("오른쪽 operand 최소 수정", "Minimal repair to the right operand"),
        passed: broadcastRepair === "singleton-feature"
          && shapeText(repaired.outputShape) === "(2, 4, 3)",
        expected: "(1, 4, 1) → (2, 4, 3)",
        actual: `${shapeText(broadcastRepairShapes[broadcastRepair])} → ${shapeText(repaired.outputShape)}`,
        explanation: t(
          "마지막 축만 1로 바꾸면 middle의 4와 leading의 2는 각각 singleton 축을 확장합니다.",
          "Changing only the final axis to 1 lets the singleton middle and leading axes expand independently.",
        ),
      },
    ]);
  };

  const runAttention = () => {
    if (!attentionPrediction || !attentionOperation) return;
    const visible = evaluateAttentionScoreShape(
      attentionVisibleFixture,
      attentionOperation,
    );
    const second = evaluateAttentionScoreShape(
      attentionSecondFixture,
      attentionOperation,
    );
    updateAttempt("attention-score-shape", [
      {
        id: "prediction",
        label: t("score 축 예측", "Score-axis prediction"),
        passed: attentionPrediction === "queries-by-keys",
        expected: t("query × key", "queries × keys"),
        actual: attentionPrediction === "queries-by-keys"
          ? t("query × key", "queries × keys")
          : t("feature × feature", "features × features"),
        explanation: t(
          "공통 feature 축은 내적으로 사라지고 query 행과 key 행이 결과 축으로 남습니다.",
          "The shared feature axis is reduced by the dot product, leaving query rows and key rows as result axes.",
        ),
      },
      {
        id: "visible-fixture",
        label: "Q(2, 3) · K(4, 3)",
        passed: shapeText(visible) === "(2, 4)",
        expected: "Q @ K.T → (2, 4)",
        actual: `${operationText(attentionOperation)} → ${shapeText(visible)}`,
        explanation: t(
          "K를 전치하면 (3, 4)가 되어 Q의 feature 3과 내적할 수 있습니다.",
          "Transposing K yields (3, 4), aligning its feature size 3 with Q.",
        ),
      },
      {
        id: "second-fixture",
        label: "Q(5, 6) · K(7, 6)",
        passed: shapeText(second) === "(5, 7)",
        expected: "Q @ K.T → (5, 7)",
        actual: `${operationText(attentionOperation)} → ${shapeText(second)}`,
        explanation: t(
          "token 수가 바뀌어도 같은 식은 query 수 × key 수 score 행렬을 만듭니다.",
          "The same expression produces a query-count by key-count score matrix when token counts change.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reshape-inference") {
      setReshapePrediction("");
      setReshapeColumns("");
    } else if (activeId === "broadcast-repair") {
      setBroadcastPrediction("");
      setBroadcastAxis("");
      setBroadcastRepair("");
    } else {
      setAttentionPrediction("");
      setAttentionOperation("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setReshapePrediction("");
    setReshapeColumns("");
    setBroadcastPrediction("");
    setBroadcastAxis("");
    setBroadcastRepair("");
    setAttentionPrediction("");
    setAttentionOperation("");
    setActiveId("reshape-inference");
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  return (
    <PracticeDeck
      challenges={challenges}
      activeId={activeId}
      attempts={attempts}
      mastery={mastery}
      onSelect={setActiveId}
      onResetAll={resetAll}
      className="vectors-practice-deck"
      copy={{
        kicker: t("선택 연습 · 독립 수행", "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE"),
        title: t("shape 규칙을 새 입력에서도 다시 만들 수 있나요?", "Can you rebuild the shape rules with new inputs?"),
        description: t(
          "reshape·broadcasting·내적 shape를 안내 없이 재현·진단·전이합니다. 완료 진도와는 분리됩니다.",
          "Reproduce, diagnose, and transfer reshape, broadcasting, and dot-product shape without the walkthrough. This stays separate from chapter completion.",
        ),
        challengeNavigation: t("벡터 독립 연습 문제", "Vector independent practice challenges"),
        levelLabels: {
          "single-boundary": t("단일 경계", "Single boundary"),
          "multi-boundary": t("복합 경계", "Multi-boundary"),
          transfer: t("전이", "Transfer"),
        },
        evidenceTitle: t("독립 수행 증거", "Independent performance evidence"),
        evidenceDescription: t(
          "이 브라우저 세션에서만 유지되며 챕터 완료 조건을 바꾸지 않습니다.",
          "Kept only for this browser session and does not change the chapter completion gate.",
        ),
        complete: t(
          "reshape 재현·broadcast 진단·Attention 전이 증거를 모두 만들었습니다.",
          "You produced reshape, broadcast diagnosis, and Attention transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reshape-inference" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 support code", "Fixed support code")}>
            <span>{t("고정 support code", "FIXED SUPPORT CODE")}</span>
            <pre><code>{`function toRows(values) {
  return values.reshape(3, learnerColumns);
}

visible.length = 12
second.length  = 18`}</code></pre>
            <p>{t("세 행은 고정되고 원소 수만 바뀝니다.", "The three-row contract is fixed; only the element count changes.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("두 fixture 결과 예측", "Predict both fixture results")}
              value={reshapePrediction}
              options={[
                { value: "adapts-both", label: "(3, 4) · (3, 6)" },
                { value: "four-columns-both", label: "(3, 4) · (3, 4)" },
                { value: "second-errors", label: "(3, 4) · ShapeError" },
              ]}
              onChange={(value) => {
                setReshapePrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerColumns"
              value={reshapeColumns}
              options={[
                { value: -1, label: "-1" },
                { value: 4, label: "4" },
                { value: 6, label: "6" },
              ]}
              onChange={(value) => {
                setReshapeColumns(value);
                invalidate(activeId);
              }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!reshapePrediction || reshapeColumns === ""}
              onClick={runReshape}
            >
              {t("두 reshape fixture 실행", "Run both reshape fixtures")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}

      {activeId === "broadcast-repair" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 실행 조건", "Fixed execution conditions")}>
            <span>{t("고정 실행 조건", "FIXED EXECUTION CONDITIONS")}</span>
            <pre><code>{`left.shape  = (2, 1, 3)
right.shape = (1, 4, 2)
output = left + right`}</code></pre>
            <p>{t("오른쪽 operand의 shape만 수정할 수 있습니다.", "Only the right operand shape may be repaired.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t("실행 전 결과 예측", "Predict the result before running")}
              value={broadcastPrediction}
              options={[
                { value: "broadcasts", label: t("브로드캐스트 성공", "Broadcast succeeds") },
                { value: "shape-error", label: "ShapeError" },
              ]}
              onChange={(value) => {
                setBroadcastPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label={t("오른쪽부터 첫 실패 축", "First failed axis from the right")}
              value={broadcastAxis}
              options={[
                { value: "leading", label: t("leading 축", "Leading axis") },
                { value: "middle", label: t("middle 축", "Middle axis") },
                { value: "feature", label: t("feature 축", "Feature axis") },
              ]}
              onChange={(value) => {
                setBroadcastAxis(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label={t("오른쪽 operand 최소 수정", "Minimal repair to the right operand")}
              value={broadcastRepair}
              options={[
                { value: "singleton-feature", label: "(1, 4, 1)" },
                { value: "singleton-middle", label: "(1, 1, 2)" },
                { value: "match-left", label: "(2, 4, 2)" },
              ]}
              onChange={(value) => {
                setBroadcastRepair(value);
                invalidate(activeId);
              }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!broadcastPrediction || !broadcastAxis || !broadcastRepair}
              onClick={runBroadcast}
            >
              {t("실행하고 첫 실패 경계 확인", "Run and inspect the first failed boundary")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}

      {activeId === "attention-score-shape" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("새로운 transfer fixture", "New transfer fixtures")}>
            <span>{t("새로운 transfer fixture", "NEW TRANSFER FIXTURES")}</span>
            <pre><code>{`visible: Q(2, 3), K(4, 3)
second:  Q(5, 6), K(7, 6)

scores = learnerExpression`}</code></pre>
            <p>{t("두 입력 모두 마지막 축이 공통 feature입니다.", "The final axis is the shared feature axis in both fixtures.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t("score 결과 축 예측", "Predict the score result axes")}
              value={attentionPrediction}
              options={[
                { value: "queries-by-keys", label: t("query × key", "Queries × keys") },
                { value: "features-by-features", label: t("feature × feature", "Features × features") },
              ]}
              onChange={(value) => {
                setAttentionPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerExpression"
              value={attentionOperation}
              options={[
                { value: "q-k-transpose", label: "Q @ K.T" },
                { value: "q-transpose-k", label: "Q.T @ K" },
                { value: "q-k", label: "Q @ K" },
              ]}
              onChange={(value) => {
                setAttentionOperation(value);
                invalidate(activeId);
              }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!attentionPrediction || !attentionOperation}
              onClick={runAttention}
            >
              {t("두 Attention fixture 실행", "Run both Attention fixtures")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}
    </PracticeDeck>
  );
}

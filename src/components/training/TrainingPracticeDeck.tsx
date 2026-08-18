import { useMemo, useRef, useState } from "react";
import {
  adamSecondFixture,
  adamVisibleFixture,
  batchGradientSecondFixture,
  batchGradientVisibleFixture,
  compareDuplicatedBatchGradient,
  runAdamStateTransition,
  runSoftmaxGradientStep,
  softmaxGradientSecondFixture,
  softmaxGradientVisibleFixture,
  trainingPracticeChallenges,
  type AdamStatePolicy,
  type AdamStatePrediction,
  type BatchInvariancePrediction,
  type BatchReduction,
  type GradientInvariantPrediction,
  type SoftmaxGradientFormula,
  type TrainingPracticeChallengeId,
} from "../../features/training/training-practice";
import {
  evaluatePracticeMastery,
  type PracticeAttempt,
  type PracticeCheck,
} from "../../features/practice/practice";
import { useLocale } from "../../features/localization/localization";
import { DirectChoice } from "../interactive/DirectChoice";
import {
  PracticeDeck,
  PracticeResultChecks,
} from "../interactive/PracticeDeck";

type Attempts = Partial<Record<
  TrainingPracticeChallengeId,
  PracticeAttempt<TrainingPracticeChallengeId>
>>;

function formatNumber(value: number) {
  const normalized = Math.abs(value) < 0.00005 ? 0 : value;
  return normalized.toFixed(4);
}

function gradientText(values: readonly number[]) {
  return `[${values.map(formatNumber).join(", ")}]`;
}

function closeEnough(left: number, right: number) {
  return Math.abs(left - right) <= 1e-10;
}

export function TrainingPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<TrainingPracticeChallengeId>("reproduce-softmax-gradient");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [gradientPrediction, setGradientPrediction] =
    useState<GradientInvariantPrediction | "">("");
  const [gradientFormula, setGradientFormula] =
    useState<SoftmaxGradientFormula | "">("");
  const [batchPrediction, setBatchPrediction] =
    useState<BatchInvariancePrediction | "">("");
  const [batchReduction, setBatchReduction] =
    useState<BatchReduction | "">("");
  const [adamPrediction, setAdamPrediction] =
    useState<AdamStatePrediction | "">("");
  const [adamPolicy, setAdamPolicy] =
    useState<AdamStatePolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => trainingPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-softmax-gradient": {
          skillId: t("재현", "reproduce"),
          label: "∂CE/∂logits",
          title: t(
            "Softmax와 CE의 output gradient를 한 행에서 재현하세요",
            "Reproduce one Softmax-plus-CE output gradient",
          ),
          summary: t(
            "새 class row 두 개에서 loss를 낮추는 learner gradient를 선택합니다.",
            "Choose the learner-owned gradient that lowers loss on two unseen class rows.",
          ),
        },
        "diagnose-mean-reduction": {
          skillId: t("진단", "diagnose"),
          label: t("Mean reduction", "Mean reduction"),
          title: t(
            "batch를 복제해도 parameter gradient를 보존하세요",
            "Keep a parameter gradient invariant when a batch is duplicated",
          ),
          summary: t(
            "새 batch 두 개에서 Hᵀ @ grad_logits 뒤의 reduction 경계를 진단합니다.",
            "Diagnose the reduction boundary after Hᵀ @ grad_logits on two fresh batches.",
          ),
        },
        "transfer-adam-state": {
          skillId: t("전이", "transfer"),
          label: t("Adam 기억", "Adam memory"),
          title: t(
            "새 batch gradient에 optimizer memory를 이어 붙이세요",
            "Carry optimizer memory across a new batch gradient",
          ),
          summary: t(
            "ordinary gradient는 새로 계산하고 m·v·t는 두 optimizer state에서 보존합니다.",
            "Refresh the ordinary gradient while preserving m, v, and t on two optimizer states.",
          ),
        },
      }[challenge.id];
      return { ...challenge, ...localized };
    }),
    [isKo],
  );
  const mastery = useMemo(
    () => evaluatePracticeMastery(challenges, attempts),
    [attempts, challenges],
  );

  const resultLabels = {
    idle: t(
      "예측과 learner 영역을 채운 뒤 실행하세요.",
      "Complete the prediction and learner-owned controls, then run.",
    ),
    passed: t(
      "이 문제의 증거가 완성되었습니다.",
      "Evidence for this challenge is complete.",
    ),
    failed: t(
      "첫 실패 계약을 확인하고 같은 문제를 다시 실행하세요.",
      "Inspect the first failed contract, then run the same challenge again.",
    ),
    expected: t("기대 계약", "EXPECTED"),
    actual: t("실제 결과", "ACTUAL"),
    firstFailed: t("먼저 고칠 계약", "FIX THIS CONTRACT FIRST"),
  };

  const updateAttempt = (
    challengeId: TrainingPracticeChallengeId,
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

  const invalidate = (challengeId: TrainingPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!gradientPrediction || !gradientFormula) return;
    const visible = runSoftmaxGradientStep(
      softmaxGradientVisibleFixture,
      gradientFormula,
    );
    const second = runSoftmaxGradientStep(
      softmaxGradientSecondFixture,
      gradientFormula,
    );
    updateAttempt("reproduce-softmax-gradient", [
      {
        id: "gradient-invariant",
        label: t(
          "두 row의 gradient 합 예측",
          "Predict the gradient sum for both rows",
        ),
        passed: gradientPrediction === "zero-sum-both",
        expected: t("둘 다 class 합 0", "both class sums are zero"),
        actual: {
          "zero-sum-both": t("둘 다 0", "both zero"),
          "positive-sum-both": t("둘 다 양수", "both positive"),
          "negative-sum-both": t("둘 다 음수", "both negative"),
        }[gradientPrediction],
        explanation: t(
          "p와 one-hot label은 각각 합이 1이므로 p−oneHot(y)의 class 합은 0입니다.",
          "Both p and the one-hot label sum to one, so p−oneHot(y) sums to zero across classes.",
        ),
      },
      {
        id: "visible-gradient",
        label: t("공개 class row", "Visible class row"),
        passed:
          gradientFormula === "probability-minus-onehot"
          && closeEnough(visible.gradientSum, 0)
          && visible.afterLoss < visible.beforeLoss,
        expected:
          `Σg=0 · CE ${formatNumber(visible.beforeLoss)} → ↓`,
        actual:
          `g=${gradientText(visible.gradient)} · Σg=${formatNumber(visible.gradientSum)} · `
          + `CE ${formatNumber(visible.beforeLoss)} → ${formatNumber(visible.afterLoss)}`,
        explanation: t(
          "정답 class 성분은 음수이고 나머지는 양수여서 gradient를 빼면 정답 logit이 상대적으로 올라갑니다.",
          "The true-class component is negative while the others are positive, so subtracting the gradient raises the true logit relatively.",
        ),
      },
      {
        id: "second-gradient",
        label: t("두 번째 class row", "Second class row"),
        passed:
          gradientFormula === "probability-minus-onehot"
          && closeEnough(second.gradientSum, 0)
          && second.afterLoss < second.beforeLoss,
        expected:
          `Σg=0 · CE ${formatNumber(second.beforeLoss)} → ↓`,
        actual:
          `g=${gradientText(second.gradient)} · Σg=${formatNumber(second.gradientSum)} · `
          + `CE ${formatNumber(second.beforeLoss)} → ${formatNumber(second.afterLoss)}`,
        explanation: t(
          "logit 순서와 정답 class가 바뀌어도 같은 fused Softmax·CE gradient 계약을 적용합니다.",
          "The same fused Softmax-plus-CE gradient applies when both logit order and true class change.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!batchPrediction || !batchReduction) return;
    const expectedVisible = compareDuplicatedBatchGradient(
      batchGradientVisibleFixture,
      "mean",
    );
    const expectedSecond = compareDuplicatedBatchGradient(
      batchGradientSecondFixture,
      "mean",
    );
    const visible = compareDuplicatedBatchGradient(
      batchGradientVisibleFixture,
      batchReduction,
    );
    const second = compareDuplicatedBatchGradient(
      batchGradientSecondFixture,
      batchReduction,
    );
    updateAttempt("diagnose-mean-reduction", [
      {
        id: "duplicate-prediction",
        label: t(
          "같은 표본을 두 번 복제한 뒤 예측",
          "Predict after duplicating every sample",
        ),
        passed: batchPrediction === "same-gradient",
        expected: t(
          "mean gradient는 그대로",
          "the mean gradient stays unchanged",
        ),
        actual: {
          "same-gradient": t("그대로", "unchanged"),
          "double-gradient": t("2배", "doubles"),
          "half-gradient": t("절반", "halves"),
        }[batchPrediction],
        explanation: t(
          "같은 표본과 gradient 기여를 두 번 더한 뒤 batch 크기도 두 배로 나누면 평균은 같습니다.",
          "Duplicating every contribution and dividing by a doubled batch size preserves the mean.",
        ),
      },
      {
        id: "visible-reduction",
        label: t("공개 batch · W[0,0]", "Visible batch · W[0,0]"),
        passed:
          batchReduction === "mean"
          && closeEnough(visible.baseCell, visible.duplicatedCell),
        expected:
          `${formatNumber(expectedVisible.baseCell)} → ${formatNumber(expectedVisible.duplicatedCell)}`,
        actual:
          `${formatNumber(visible.baseCell)} → ${formatNumber(visible.duplicatedCell)}`,
        explanation: t(
          "mean CE의 parameter gradient는 Hᵀ @ grad_logits를 batch 크기 B로 한 번 나눕니다.",
          "The parameter gradient of mean CE divides Hᵀ @ grad_logits by batch size B exactly once.",
        ),
      },
      {
        id: "second-reduction",
        label: t("두 번째 batch · W[0,0]", "Second batch · W[0,0]"),
        passed:
          batchReduction === "mean"
          && closeEnough(second.baseCell, second.duplicatedCell),
        expected:
          `${formatNumber(expectedSecond.baseCell)} → ${formatNumber(expectedSecond.duplicatedCell)}`,
        actual:
          `${formatNumber(second.baseCell)} → ${formatNumber(second.duplicatedCell)}`,
        explanation: t(
          "B=3→6에서도 같은 불변식이 유지되어 우연히 B=2에만 맞은 상수를 배제합니다.",
          "The same invariant holds for B=3→6, ruling out a constant that only works for B=2.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!adamPrediction || !adamPolicy) return;
    const expectedVisible = runAdamStateTransition(
      adamVisibleFixture,
      "preserve-state",
    );
    const expectedSecond = runAdamStateTransition(
      adamSecondFixture,
      "preserve-state",
    );
    const visible = runAdamStateTransition(adamVisibleFixture, adamPolicy);
    const second = runAdamStateTransition(adamSecondFixture, adamPolicy);
    updateAttempt("transfer-adam-state", [
      {
        id: "state-prediction",
        label: t(
          "새 batch 경계의 state 예측",
          "Predict state at the new batch boundary",
        ),
        passed: adamPrediction === "continue-moments",
        expected: t(
          "새 g · m,v 유지 · t+1",
          "fresh g · keep m,v · increment t",
        ),
        actual: {
          "continue-moments": t("새 g · m,v 유지 · t+1", "fresh g · keep m,v · t+1"),
          "restart-step-one": t("새 g · 모두 초기화 · t=1", "fresh g · reset all · t=1"),
          "keep-step-reset-moments": t("새 g · m,v만 초기화", "fresh g · reset only m,v"),
        }[adamPrediction],
        explanation: t(
          "zero_grad는 ordinary gradient buffer만 비우고 optimizer의 m·v·t는 다음 step으로 이어집니다.",
          "zero_grad clears only the ordinary gradient buffer; optimizer m, v, and t continue into the next step.",
        ),
      },
      {
        id: "visible-adam",
        label: t("공개 optimizer state", "Visible optimizer state"),
        passed:
          adamPolicy === "preserve-state"
          && visible.stateAfter.step === expectedVisible.stateAfter.step
          && closeEnough(visible.nextParameter, expectedVisible.nextParameter),
        expected:
          `t=${expectedVisible.stateAfter.step} · θ′=${formatNumber(expectedVisible.nextParameter)}`,
        actual:
          `g=${formatNumber(visible.gradient)} · t=${visible.stateAfter.step} · `
          + `θ′=${formatNumber(visible.nextParameter)}`,
        explanation: t(
          "현재 batch의 fresh gradient를 이전 moment와 섞은 뒤 이어진 step 번호로 bias correction을 계산합니다.",
          "The fresh batch gradient mixes with prior moments, and bias correction uses the continued step number.",
        ),
      },
      {
        id: "second-adam",
        label: t("두 번째 optimizer state", "Second optimizer state"),
        passed:
          adamPolicy === "preserve-state"
          && second.stateAfter.step === expectedSecond.stateAfter.step
          && closeEnough(second.nextParameter, expectedSecond.nextParameter),
        expected:
          `t=${expectedSecond.stateAfter.step} · θ′=${formatNumber(expectedSecond.nextParameter)}`,
        actual:
          `g=${formatNumber(second.gradient)} · t=${second.stateAfter.step} · `
          + `θ′=${formatNumber(second.nextParameter)}`,
        explanation: t(
          "parameter, gradient, moment 부호가 달라도 fresh gradient와 persistent state의 수명 계약은 같습니다.",
          "Parameter, gradient, and moment signs changed, but fresh-gradient and persistent-state lifetimes stay the same.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-softmax-gradient") {
      setGradientPrediction("");
      setGradientFormula("");
    } else if (activeId === "diagnose-mean-reduction") {
      setBatchPrediction("");
      setBatchReduction("");
    } else {
      setAdamPrediction("");
      setAdamPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setGradientPrediction("");
    setGradientFormula("");
    setBatchPrediction("");
    setBatchReduction("");
    setAdamPrediction("");
    setAdamPolicy("");
    setActiveId("reproduce-softmax-gradient");
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
      className="training-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "새 batch에서도 훈련 step을 다시 만들 수 있나요?",
          "Can you rebuild a training step on fresh batches?",
        ),
        description: t(
          "필수 mini-batch lab과 다른 class row·batch·optimizer state로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with class rows, batches, and optimizer states outside the required lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "훈련 독립 연습 문제",
          "Training independent practice challenges",
        ),
        levelLabels: {
          "single-boundary": t("단일 경계", "Single boundary"),
          "multi-boundary": t("복합 경계", "Multi-boundary"),
          transfer: t("전이", "Transfer"),
        },
        evidenceTitle: t(
          "독립 수행 증거",
          "Independent performance evidence",
        ),
        evidenceDescription: t(
          "이 브라우저 세션에서만 유지되며 챕터 완료 조건을 바꾸지 않습니다.",
          "Kept only for this browser session and does not change the chapter completion gate.",
        ),
        complete: t(
          "Softmax gradient·mean reduction·Adam state 전이 증거를 모두 만들었습니다.",
          "You produced Softmax-gradient, mean-reduction, and Adam-state transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        resetAll: t(
          "세 문제 모두 초기화",
          "Reset all three challenges",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
      }}
    >
      {activeId === "reproduce-softmax-gradient" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 class row", "Fixed class rows")}
          >
            <span>{t("고정 class row", "FIXED CLASS ROWS")}</span>
            <pre><code>{`p = softmax(logits)
gradLogits = learnerGradient(p, oneHot(label))
logits = logits - learningRate * gradLogits

visible: logits=[1.2,-0.4,0.6], y=2
second:  logits=[-0.3,1.4,0.2], y=0`}</code></pre>
            <p>{t(
              "fixture와 learning rate는 고정됩니다.",
              "Fixtures and learning rates stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "두 row에서 class gradient 합 예측",
                "Predict the class-gradient sum for both rows",
              )}
              value={gradientPrediction}
              options={[
                { value: "zero-sum-both", label: t("둘 다 0", "Both zero") },
                { value: "positive-sum-both", label: t("둘 다 양수", "Both positive") },
                { value: "negative-sum-both", label: t("둘 다 음수", "Both negative") },
              ]}
              onChange={(value) => {
                setGradientPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerGradient"
              value={gradientFormula}
              options={[
                { value: "probability-minus-onehot", label: "p − oneHot(y)" },
                { value: "onehot-minus-probability", label: "oneHot(y) − p" },
                { value: "probabilities-only", label: "p" },
              ]}
              onChange={(value) => {
                setGradientFormula(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!gradientPrediction || !gradientFormula}
              onClick={runReproduce}
            >
              {t("두 class row 실행", "Run both class rows")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}

      {activeId === "diagnose-mean-reduction" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 batch gradient", "Fixed batch gradients")}
          >
            <span>{t("고정 batch gradient", "FIXED BATCH GRADIENTS")}</span>
            <pre><code>{`gradLogits = p - oneHot(labels)
rawGradW = H.T @ gradLogits
gradW = learnerReduction(rawGradW, batchSize)

visible: B=2 → duplicate to B=4
second:  B=3 → duplicate to B=6`}</code></pre>
            <p>{t(
              "각 batch는 같은 표본을 정확히 한 번 더 복제합니다.",
              "Each batch duplicates every sample exactly once.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t(
                "표본을 모두 복제한 뒤 mean gradient 예측",
                "Predict the mean gradient after duplicating every sample",
              )}
              value={batchPrediction}
              options={[
                { value: "same-gradient", label: t("그대로", "Unchanged") },
                { value: "double-gradient", label: t("2배", "Doubles") },
                { value: "half-gradient", label: t("절반", "Halves") },
              ]}
              onChange={(value) => {
                setBatchPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerReduction"
              value={batchReduction}
              options={[
                { value: "mean", label: "rawGradW ÷ B" },
                { value: "sum", label: "rawGradW" },
                { value: "double-mean", label: "rawGradW ÷ B²" },
              ]}
              onChange={(value) => {
                setBatchReduction(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!batchPrediction || !batchReduction}
              onClick={runDiagnose}
            >
              {t("두 batch 복제 계약 실행", "Run both duplicated-batch contracts")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}

      {activeId === "transfer-adam-state" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 Adam state", "Fixed Adam states")}
          >
            <span>{t("고정 Adam state", "FIXED ADAM STATES")}</span>
            <pre><code>{`gradient = currentBatchGradient
{m, v, t} = learnerStatePolicy(previousState)
m = 0.9*m + 0.1*gradient
v = 0.999*v + 0.001*gradient**2
t = t + 1
parameter = adamStep(parameter, m, v, t)`}</code></pre>
            <p>{t(
              "공개 state는 t=3, 두 번째 state는 t=5에서 시작합니다.",
              "The visible state starts at t=3 and the second at t=5.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t(
                "새 batch 경계의 gradient·state 예측",
                "Predict gradient and state at the new batch boundary",
              )}
              value={adamPrediction}
              options={[
                {
                  value: "continue-moments",
                  label: t(
                    "새 g · m,v 유지 · t+1",
                    "Fresh g · keep m,v · t+1",
                  ),
                },
                {
                  value: "restart-step-one",
                  label: t(
                    "새 g · 모두 초기화 · t=1",
                    "Fresh g · reset all · t=1",
                  ),
                },
                {
                  value: "keep-step-reset-moments",
                  label: t(
                    "새 g · m,v만 초기화",
                    "Fresh g · reset only m,v",
                  ),
                },
              ]}
              onChange={(value) => {
                setAdamPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerStatePolicy"
              value={adamPolicy}
              options={[
                {
                  value: "preserve-state",
                  label: t(
                    "fresh gradient · m,v,t 보존",
                    "fresh gradient · preserve m,v,t",
                  ),
                },
                {
                  value: "reset-state",
                  label: t(
                    "fresh gradient · m,v,t 초기화",
                    "fresh gradient · reset m,v,t",
                  ),
                },
                {
                  value: "reuse-moment-as-gradient",
                  label: t(
                    "m을 gradient로 재사용 · state 보존",
                    "reuse m as gradient · preserve state",
                  ),
                },
              ]}
              onChange={(value) => {
                setAdamPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!adamPrediction || !adamPolicy}
              onClick={runTransfer}
            >
              {t("두 Adam state 전이 실행", "Run both Adam-state transfers")}
            </button>
            <button
              type="button"
              className="button button-secondary"
              onClick={resetCurrent}
            >
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks
            attempt={attempts[activeId]}
            labels={resultLabels}
          />
        </div>
      ) : null}
    </PracticeDeck>
  );
}

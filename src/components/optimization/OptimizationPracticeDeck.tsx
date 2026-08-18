import { useMemo, useRef, useState } from "react";
import {
  applyLearnerVectorStep,
  closeEnough,
  diagnoseFixture,
  diagnoseRepairRates,
  optimizationPracticeChallenges,
  reproduceTransferFixture,
  reproduceVisibleFixture,
  runScalarQuadraticStep,
  transferLearningRates,
  transferSecondFixture,
  transferVisibleFixture,
  type DiagnoseRepairRate,
  type LossDirectionPrediction,
  type OptimizationPracticeChallengeId,
  type OvershootDiagnosis,
  type TransferLearningRate,
  type TransferPrediction,
  type UpdateDirectionPrediction,
  type UpdateOperator,
} from "../../features/optimization/optimization-practice";
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
  OptimizationPracticeChallengeId,
  PracticeAttempt<OptimizationPracticeChallengeId>
>>;

function formatNumber(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/0+$/, "").replace(/\.$/, "");
}

function vectorText(values: readonly [number, number]) {
  return `[${values.map(formatNumber).join(", ")}]`;
}

export function OptimizationPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<OptimizationPracticeChallengeId>("reproduce-step");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [stepPrediction, setStepPrediction] =
    useState<UpdateDirectionPrediction | "">("");
  const [biasOperator, setBiasOperator] = useState<UpdateOperator | "">("");
  const [slopeOperator, setSlopeOperator] = useState<UpdateOperator | "">("");
  const [diagnosePrediction, setDiagnosePrediction] =
    useState<LossDirectionPrediction | "">("");
  const [diagnosis, setDiagnosis] = useState<OvershootDiagnosis | "">("");
  const [repairRate, setRepairRate] = useState<DiagnoseRepairRate | "">("");
  const [transferPrediction, setTransferPrediction] =
    useState<TransferPrediction | "">("");
  const [transferRate, setTransferRate] =
    useState<TransferLearningRate | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(() => optimizationPracticeChallenges.map((challenge) => {
    const localized = {
      "reproduce-step": {
        skillId: t("재현", "reproduce"),
        label: "step(w, lr)",
        title: t("학습자가 소유한 두 update 줄을 완성하세요", "Complete both learner-owned update lines"),
        summary: t(
          "fixture·gradient·support code는 고정됩니다. 각 파라미터 update의 연산자만 직접 결정합니다.",
          "The fixture, gradient, and support code stay fixed. You own only the operator on each parameter update.",
        ),
      },
      "diagnose-overshoot": {
        skillId: t("진단", "diagnose"),
        label: t("Overshoot 진단", "Diagnose overshoot"),
        title: t("올바른 방향과 불안정한 step 크기를 분리하세요", "Separate a correct direction from an unstable step size"),
        summary: t(
          "gradient를 빼고 있지만 다음 loss가 커집니다. 첫 실패 계약을 진단하고 세 후보 중 가장 안정적으로 loss를 줄이는 값을 고르세요.",
          "The update subtracts the gradient, yet the next loss rises. Diagnose the first failed contract and choose the candidate that reduces loss most stably.",
        ),
      },
      "transfer-curvature": {
        skillId: t("전이", "transfer"),
        label: t("새 곡률", "New curvature"),
        title: t("더 가파른 이차함수에 update 규칙을 전이하세요", "Transfer the update rule to a steeper quadratic"),
        summary: t(
          "시작값과 target이 다른 두 fixture 모두에서 정확히 target에 도착하는 하나의 학습률을 찾습니다.",
          "Find one learning rate that lands exactly on target for two fixtures with different starts and targets.",
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
    challengeId: OptimizationPracticeChallengeId,
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

  const invalidate = (challengeId: OptimizationPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!stepPrediction || !biasOperator || !slopeOperator) return;
    const visible = applyLearnerVectorStep(
      reproduceVisibleFixture,
      biasOperator,
      slopeOperator,
    );
    const transfer = applyLearnerVectorStep(
      reproduceTransferFixture,
      biasOperator,
      slopeOperator,
    );
    const expectedVisible: readonly [number, number] = [-2, 1.5];
    const expectedTransfer: readonly [number, number] = [3.2, -1.8];
    updateAttempt("reproduce-step", [
      {
        id: "direction",
        label: t("실행 전 방향 예측", "Prediction before running"),
        passed: stepPrediction === "opposes",
        expected: t("update는 gradient와 반대 방향", "update opposes the gradient"),
        actual: stepPrediction === "opposes"
          ? t("반대 방향", "opposes")
          : t("같은 방향", "follows"),
        explanation: t(
          "내적 gradient·Δw가 음수여야 local loss의 내리막으로 움직입니다.",
          "The dot product gradient·Δw must be negative to move locally downhill.",
        ),
      },
      {
        id: "visible-fixture",
        label: t("공개 fixture", "Visible fixture"),
        passed: closeEnough(visible[0], expectedVisible[0])
          && closeEnough(visible[1], expectedVisible[1]),
        expected: vectorText(expectedVisible),
        actual: vectorText(visible),
        explanation: t(
          "bias와 slope는 각각 자기 gradient 성분을 빼야 합니다.",
          "Bias and slope must each subtract their own gradient component.",
        ),
      },
      {
        id: "transfer-fixture",
        label: t("두 번째 fixture", "Second fixture"),
        passed: closeEnough(transfer[0], expectedTransfer[0])
          && closeEnough(transfer[1], expectedTransfer[1]),
        expected: vectorText(expectedTransfer),
        actual: vectorText(transfer),
        explanation: t(
          "같은 두 learner 줄을 새 weight·gradient·학습률에 그대로 적용했습니다.",
          "The same two learner-owned lines were applied to new weights, gradients, and learning rate.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!diagnosePrediction || !diagnosis || repairRate === "") return;
    const broken = runScalarQuadraticStep(diagnoseFixture);
    const repaired = runScalarQuadraticStep({
      ...diagnoseFixture,
      learningRate: repairRate,
    });
    updateAttempt("diagnose-overshoot", [
      {
        id: "loss-prediction",
        label: t("다음 loss 예측", "Next-loss prediction"),
        passed: diagnosePrediction === "loss-increases",
        expected: `${formatNumber(broken.initialLoss)} → ${formatNumber(broken.nextLoss)}`,
        actual: diagnosePrediction === "loss-increases"
          ? t("증가", "increases")
          : t("감소", "decreases"),
        explanation: t(
          "부호는 맞지만 η=0.6이 최솟값을 지나쳐 loss를 키웁니다.",
          "The sign is correct, but η=0.6 crosses the minimum and raises loss.",
        ),
      },
      {
        id: "first-failed-contract",
        label: t("첫 실패 계약", "First failed contract"),
        passed: diagnosis === "overshoot",
        expected: "overshoot",
        actual: diagnosis,
        explanation: t(
          "gradient를 더하거나 멈춘 것이 아니라, 반대 방향으로 너무 멀리 이동한 실패입니다.",
          "The update neither adds the gradient nor stops; it moves too far in the opposite direction.",
        ),
      },
      {
        id: "repair-rate",
        label: t("세 후보 중 안정적 복구", "Stable repair among three candidates"),
        passed: repairRate === 0.2 && repaired.nextLoss < repaired.initialLoss,
        expected: `η=0.2 · loss ${formatNumber(repaired.initialLoss)} → 0.32`,
        actual: `η=${repairRate} · loss ${formatNumber(repaired.initialLoss)} → ${formatNumber(repaired.nextLoss)}`,
        explanation: t(
          "η=0.2는 세 후보 중 target에 가장 가까이 이동하며 loss를 0.32까지 줄입니다.",
          "η=0.2 moves closest to the target among the candidates and reduces loss to 0.32.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!transferPrediction || transferRate === "") return;
    const visible = runScalarQuadraticStep({
      ...transferVisibleFixture,
      learningRate: transferRate,
    });
    const second = runScalarQuadraticStep({
      ...transferSecondFixture,
      learningRate: transferRate,
    });
    updateAttempt("transfer-curvature", [
      {
        id: "transfer-prediction",
        label: t("공개 fixture 결과 예측", "Visible-fixture prediction"),
        passed: transferPrediction === "lands-on-target",
        expected: t("target에 정확히 도착", "lands exactly on target"),
        actual: {
          "lands-on-target": t("target에 도착", "lands on target"),
          "moves-closer": t("가까워지지만 남음", "moves closer"),
          overshoots: t("target을 지나침", "overshoots"),
        }[transferPrediction],
        explanation: t(
          "곡률 5에서는 gradient 계수 2a가 10이므로 η=0.1이 오차를 한 번에 0으로 만듭니다.",
          "With curvature 5, the gradient multiplier 2a is 10, so η=0.1 removes the error in one step.",
        ),
      },
      {
        id: "visible-transfer",
        label: t("공개 fixture · w=2, target=0", "Visible fixture · w=2, target=0"),
        passed: transferRate === 0.1 && closeEnough(visible.nextWeight, 0),
        expected: "w′=0 · loss=0",
        actual: `w′=${formatNumber(visible.nextWeight)} · loss=${formatNumber(visible.nextLoss)}`,
        explanation: t(
          "선택한 η를 support code의 같은 update 식에 적용했습니다.",
          "The chosen η was applied to the same update expression in the support code.",
        ),
      },
      {
        id: "second-transfer",
        label: t("두 번째 fixture · w=-3, target=1.5", "Second fixture · w=-3, target=1.5"),
        passed: transferRate === 0.1 && closeEnough(second.nextWeight, 1.5),
        expected: "w′=1.5 · loss=0",
        actual: `w′=${formatNumber(second.nextWeight)} · loss=${formatNumber(second.nextLoss)}`,
        explanation: t(
          "시작값과 target은 달라도 같은 곡률 계약에서는 같은 η가 전이됩니다.",
          "The start and target changed, but the same η transfers under the same curvature contract.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-step") {
      setStepPrediction("");
      setBiasOperator("");
      setSlopeOperator("");
    } else if (activeId === "diagnose-overshoot") {
      setDiagnosePrediction("");
      setDiagnosis("");
      setRepairRate("");
    } else {
      setTransferPrediction("");
      setTransferRate("");
    }
    requestAnimationFrame(() => firstControlRef.current?.querySelector<HTMLElement>("button")?.focus());
  };

  const resetAll = () => {
    setAttempts({});
    setStepPrediction("");
    setBiasOperator("");
    setSlopeOperator("");
    setDiagnosePrediction("");
    setDiagnosis("");
    setRepairRate("");
    setTransferPrediction("");
    setTransferRate("");
    setActiveId("reproduce-step");
    requestAnimationFrame(() => firstControlRef.current?.querySelector<HTMLElement>("button")?.focus());
  };

  return (
    <PracticeDeck
      challenges={challenges}
      activeId={activeId}
      attempts={attempts}
      mastery={mastery}
      onSelect={setActiveId}
      onResetAll={resetAll}
      className="optimization-practice-deck"
      copy={{
        kicker: t("선택 연습 · 독립 수행", "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE"),
        title: t("같은 원리를 새 숫자에서 다시 만들 수 있나요?", "Can you rebuild the same rule with new numbers?"),
        description: t(
          "장 내부 실습의 값을 외우지 않고 재현·진단·전이를 각각 한 문제로 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer without memorizing the in-chapter fixtures. This stays separate from chapter completion.",
        ),
        challengeNavigation: t("최적화 연습 문제", "Optimization practice challenges"),
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
          "재현·진단·전이 세 증거를 모두 만들었습니다.",
          "You produced reproduction, diagnosis, and transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-step" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 support code", "Fixed support code")}>
            <span>{t("고정 support code", "FIXED SUPPORT CODE")}</span>
            <pre><code>{`function step(weights, gradient, learningRate) {
  return {
    // learner-owned lines
    bias: weights.bias ? learningRate * gradient.bias,
    slope: weights.slope ? learningRate * gradient.slope,
  };
}`}</code></pre>
            <p>weights=[-1.5, 0.5] · gradient=[2, -4] · η=0.25</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("실행 전 update 방향 예측", "Predict the update direction before running")}
              value={stepPrediction}
              options={[
                { value: "opposes", label: t("gradient와 반대", "Opposes gradient") },
                { value: "follows", label: t("gradient와 같은 방향", "Follows gradient") },
              ]}
              onChange={(value) => { setStepPrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label="bias: weights.bias ___ η × gradient.bias"
              value={biasOperator}
              options={[
                { value: "subtract", label: "−" },
                { value: "add", label: "+" },
              ]}
              onChange={(value) => { setBiasOperator(value); invalidate(activeId); }}
              compact
            />
            <DirectChoice
              label="slope: weights.slope ___ η × gradient.slope"
              value={slopeOperator}
              options={[
                { value: "subtract", label: "−" },
                { value: "add", label: "+" },
              ]}
              onChange={(value) => { setSlopeOperator(value); invalidate(activeId); }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!stepPrediction || !biasOperator || !slopeOperator}
              onClick={runReproduce}
            >
              {t("공개·전이 fixture 실행", "Run visible and transfer fixtures")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}

      {activeId === "diagnose-overshoot" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 실행 조건", "Fixed execution conditions")}>
            <span>{t("고정 실행 조건", "FIXED EXECUTION CONDITIONS")}</span>
            <pre><code>{`loss = 2 × (w - 1)²
w = 3
gradient = 2 × 2 × (w - 1)
next_w = w - 0.6 × gradient`}</code></pre>
            <p>{t("부호는 고정되어 있습니다. 예측 후에만 실제 next_w와 loss를 공개합니다.", "The sign is fixed. The actual next_w and loss appear only after your prediction.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t("다음 loss 예측", "Predict the next loss")}
              value={diagnosePrediction}
              options={[
                { value: "loss-decreases", label: t("감소", "Decreases") },
                { value: "loss-increases", label: t("증가", "Increases") },
              ]}
              onChange={(value) => { setDiagnosePrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label={t("첫 실패 계약", "First failed contract")}
              value={diagnosis}
              options={[
                { value: "wrong-sign", label: t("gradient 부호", "Gradient sign") },
                { value: "overshoot", label: "overshoot" },
                { value: "stop", label: t("업데이트 정지", "No update") },
              ]}
              onChange={(value) => { setDiagnosis(value); invalidate(activeId); }}
            />
            <DirectChoice
              label={t("세 후보 중 가장 안정적인 복구 η", "Most stable repair η among the candidates")}
              value={repairRate}
              options={diagnoseRepairRates.map((value) => ({ value, label: String(value) }))}
              onChange={(value) => { setRepairRate(value); invalidate(activeId); }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!diagnosePrediction || !diagnosis || repairRate === ""}
              onClick={runDiagnose}
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

      {activeId === "transfer-curvature" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("새로운 transfer fixture", "New transfer fixtures")}>
            <span>{t("새로운 transfer fixture", "NEW TRANSFER FIXTURES")}</span>
            <pre><code>{`loss = 5 × (w - target)²
gradient = 2 × 5 × (w - target)
next_w = w - η × gradient

visible: w=2, target=0
second:  w=-3, target=1.5`}</code></pre>
            <p>{t("두 fixture의 시작값과 target은 다르지만 curvature는 같습니다.", "The fixtures use different starts and targets but share the same curvature.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t("공개 fixture 결과 예측", "Predict the visible-fixture outcome")}
              value={transferPrediction}
              options={[
                { value: "lands-on-target", label: t("target에 정확히 도착", "Lands exactly on target") },
                { value: "moves-closer", label: t("가까워지지만 남음", "Moves closer") },
                { value: "overshoots", label: t("target을 지나침", "Overshoots") },
              ]}
              onChange={(value) => { setTransferPrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label={t("두 fixture를 한 번에 푸는 η", "One η for both fixtures")}
              value={transferRate}
              options={transferLearningRates.map((value) => ({ value, label: String(value) }))}
              onChange={(value) => { setTransferRate(value); invalidate(activeId); }}
              compact
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!transferPrediction || transferRate === ""}
              onClick={runTransfer}
            >
              {t("두 fixture 실행", "Run both fixtures")}
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

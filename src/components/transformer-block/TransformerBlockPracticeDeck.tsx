import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  maximumMatrixError,
  maximumVectorError,
  prenormShiftSecondFixture,
  prenormShiftVisibleFixture,
  residualLedgerSecondFixture,
  residualLedgerVisibleFixture,
  runPrenormShiftPolicy,
  runResidualLedgerPolicy,
  runTwoBlockPolicy,
  transformerBlockPracticeChallenges,
  twoBlockSecondFixture,
  twoBlockVisibleFixture,
  type PrenormShiftPolicy,
  type PrenormShiftPrediction,
  type ResidualLedgerPolicy,
  type ResidualLedgerPrediction,
  type TransformerBlockPracticeChallengeId,
  type TwoBlockPolicy,
  type TwoBlockPrediction,
} from "../../features/transformer-block/transformer-block-practice";
import {
  evaluatePracticeMastery,
  type PracticeAttempt,
  type PracticeCheck,
} from "../../features/practice/practice";
import { DirectChoice } from "../interactive/DirectChoice";
import {
  PracticeDeck,
  PracticeResultChecks,
} from "../interactive/PracticeDeck";

type Attempts = Partial<Record<
  TransformerBlockPracticeChallengeId,
  PracticeAttempt<TransformerBlockPracticeChallengeId>
>>;

function format(value: number) {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return normalized.toFixed(6);
}

function vectorText(values: readonly number[]) {
  return `[${values.map(format).join(", ")}]`;
}

export function TransformerBlockPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<TransformerBlockPracticeChallengeId>(
      "reproduce-residual-ledger",
    );
  const [attempts, setAttempts] = useState<Attempts>({});
  const [residualPrediction, setResidualPrediction] =
    useState<ResidualLedgerPrediction | "">("");
  const [residualPolicy, setResidualPolicy] =
    useState<ResidualLedgerPolicy | "">("");
  const [shiftPrediction, setShiftPrediction] =
    useState<PrenormShiftPrediction | "">("");
  const [shiftPolicy, setShiftPolicy] =
    useState<PrenormShiftPolicy | "">("");
  const [stackPrediction, setStackPrediction] =
    useState<TwoBlockPrediction | "">("");
  const [stackPolicy, setStackPolicy] =
    useState<TwoBlockPolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => transformerBlockPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-residual-ledger": {
          skillId: t("재현", "reproduce"),
          title: t(
            "두 residual update를 새 state에서 재현하세요",
            "Reproduce both residual updates on fresh states",
          ),
          summary: t(
            "하나의 state stream에 Attention과 FFN branch 출력을 각 residual 경계에서 더합니다.",
            "Keep one state stream and add the Attention and FFN branch outputs at their matching residual boundaries.",
          ),
        },
        "diagnose-prenorm-shift": {
          skillId: t("진단", "diagnose"),
          title: t(
            "공통 feature 이동에서 pre-norm residual을 진단하세요",
            "Diagnose a pre-norm residual under a common feature shift",
          ),
          summary: t(
            "LayerNorm branch는 공통 이동을 제거하지만 skip path는 그 이동을 출력까지 운반해야 합니다.",
            "The LayerNorm branch removes a common shift while the skip path must carry that shift to the output.",
          ),
        },
        "transfer-two-block-handoff": {
          skillId: t("전이", "transfer"),
          title: t(
            "첫 block state를 두 번째 block으로 전이하세요",
            "Transfer the first block state into a second block",
          ),
          summary: t(
            "position은 한 번만 더하고 첫 block의 y를 다음 block 입력으로 넘깁니다.",
            "Add position once and hand the first block's y to the next block.",
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
    challengeId: TransformerBlockPracticeChallengeId,
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

  const invalidate = (challengeId: TransformerBlockPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runResidual = () => {
    if (!residualPrediction || !residualPolicy) return;
    const visible = runResidualLedgerPolicy(
      residualLedgerVisibleFixture,
      residualPolicy,
    );
    const second = runResidualLedgerPolicy(
      residualLedgerSecondFixture,
      residualPolicy,
    );
    const visibleX1Error = maximumVectorError(
      visible.actualX1,
      visible.expectedX1,
    );
    const visibleOutputError = maximumVectorError(
      visible.actualOutput,
      visible.expectedOutput,
    );
    const secondX1Error = maximumVectorError(
      second.actualX1,
      second.expectedX1,
    );
    const secondOutputError = maximumVectorError(
      second.actualOutput,
      second.expectedOutput,
    );
    updateAttempt("reproduce-residual-ledger", [
      {
        id: "residual-prediction",
        label: t(
          "두 residual의 state 흐름 예측",
          "Predict the two-residual state flow",
        ),
        passed:
          residualPrediction === "both-branches-update-shared-stream",
        expected: t(
          "x₁=x₀+A · y=x₁+F",
          "x1=x0+A · y=x1+F",
        ),
        actual: {
          "both-branches-update-shared-stream": "x₁=x₀+A · y=x₁+F",
          "branches-replace-the-stream": "x₁=A · y=F",
          "second-branch-reuses-x0": "x₁=x₀+A · y=x₀+F",
        }[residualPrediction],
        explanation: t(
          "각 branch는 같은 폭의 stream을 교체하지 않고 현재 state에 residual update로 더합니다.",
          "Each branch adds a residual update to the current same-width stream instead of replacing it.",
        ),
      },
      {
        id: "visible-residual-ledger",
        label: t(
          "공개 residual 원장",
          "Visible residual ledger",
        ),
        passed:
          residualPolicy === "two-residual-updates"
          && visibleX1Error <= 1e-9
          && visibleOutputError <= 1e-9,
        expected:
          `x₁=${vectorText(visible.expectedX1)} · y=${vectorText(visible.expectedOutput)}`,
        actual:
          `x₁=${vectorText(visible.actualX1)} · y=${vectorText(visible.actualOutput)} · max error=${format(Math.max(visibleX1Error, visibleOutputError))}`,
        explanation: t(
          "두 번째 skip는 FFN branch를 만든 x₁과 같은 state를 기준으로 합니다.",
          "The second skip uses the same x1 state that produced the FFN branch.",
        ),
      },
      {
        id: "second-residual-ledger",
        label: t(
          "두 번째 residual 원장",
          "Second residual ledger",
        ),
        passed:
          residualPolicy === "two-residual-updates"
          && secondX1Error <= 1e-9
          && secondOutputError <= 1e-9,
        expected:
          `x₁=${vectorText(second.expectedX1)} · y=${vectorText(second.expectedOutput)}`,
        actual:
          `x₁=${vectorText(second.actualX1)} · y=${vectorText(second.actualOutput)} · max error=${format(Math.max(secondX1Error, secondOutputError))}`,
        explanation: t(
          "새 숫자에서도 두 skip source를 보존해야 고정 원장을 외운 결과가 아닙니다.",
          "Preserving both skip sources on new numbers rules out memorizing the guided ledger.",
        ),
      },
    ]);
  };

  const runShift = () => {
    if (!shiftPrediction || !shiftPolicy) return;
    const visible = runPrenormShiftPolicy(
      prenormShiftVisibleFixture,
      shiftPolicy,
    );
    const second = runPrenormShiftPolicy(
      prenormShiftSecondFixture,
      shiftPolicy,
    );
    const visibleBranchError = maximumVectorError(
      visible.base.branch,
      visible.shifted.branch,
    );
    const visibleOutputError = maximumVectorError(
      visible.shifted.output,
      visible.expectedShiftedOutput,
    );
    const secondBranchError = maximumVectorError(
      second.base.branch,
      second.shifted.branch,
    );
    const secondOutputError = maximumVectorError(
      second.shifted.output,
      second.expectedShiftedOutput,
    );
    updateAttempt("diagnose-prenorm-shift", [
      {
        id: "shift-prediction",
        label: t(
          "공통 feature 이동 결과 예측",
          "Predict a common feature shift",
        ),
        passed:
          shiftPrediction === "branch-stays-output-shifts",
        expected: t(
          "branch는 동일 · output은 shift만큼 이동",
          "branch stays fixed · output moves by the shift",
        ),
        actual: {
          "branch-stays-output-shifts": t(
            "branch는 동일 · output은 shift만큼 이동",
            "branch stays fixed · output moves by the shift",
          ),
          "branch-and-output-stay-fixed": t(
            "branch와 output이 모두 동일",
            "branch and output both stay fixed",
          ),
          "branch-shifts-output-stays": t(
            "branch만 이동 · output은 동일",
            "only the branch moves · output stays fixed",
          ),
        }[shiftPrediction],
        explanation: t(
          "LN(x+c·1)=LN(x)이지만 residual의 identity path는 c·1을 지우지 않습니다.",
          "LN(x+c·1)=LN(x), but the residual identity path does not erase c·1.",
        ),
      },
      {
        id: "visible-shift-probe",
        label: t(
          "공개 +2 feature 이동",
          "Visible +2 feature shift",
        ),
        passed:
          shiftPolicy === "prenorm-plus-skip"
          && visibleBranchError <= 1e-9
          && visibleOutputError <= 1e-9,
        expected: "branch drift=0.000000 · output shift error=0.000000",
        actual:
          `branch drift=${format(visibleBranchError)} · output shift error=${format(visibleOutputError)} · y'=${vectorText(visible.shifted.output)}`,
        explanation: t(
          "branch-only는 이동을 잃고, ADD 뒤 post-norm은 identity 이동을 다시 정규화합니다.",
          "A branch-only path loses the shift, while post-norm after ADD normalizes the identity shift away again.",
        ),
      },
      {
        id: "second-shift-probe",
        label: t(
          "두 번째 −1.5 feature 이동",
          "Second −1.5 feature shift",
        ),
        passed:
          shiftPolicy === "prenorm-plus-skip"
          && secondBranchError <= 1e-9
          && secondOutputError <= 1e-9,
        expected: "branch drift=0.000000 · output shift error=0.000000",
        actual:
          `branch drift=${format(secondBranchError)} · output shift error=${format(secondOutputError)} · y'=${vectorText(second.shifted.output)}`,
        explanation: t(
          "이동의 부호와 row 값이 바뀌어도 pre-norm branch와 skip의 역할 분리가 유지되어야 합니다.",
          "Changing the shift sign and row values must preserve the separation between the pre-norm branch and skip path.",
        ),
      },
    ]);
  };

  const runStack = () => {
    if (!stackPrediction || !stackPolicy) return;
    const visible = runTwoBlockPolicy(twoBlockVisibleFixture, stackPolicy);
    const second = runTwoBlockPolicy(twoBlockSecondFixture, stackPolicy);
    const visibleError = maximumMatrixError(
      visible.actualSecond.output,
      visible.expectedSecond.output,
    );
    const secondError = maximumMatrixError(
      second.actualSecond.output,
      second.expectedSecond.output,
    );
    updateAttempt("transfer-two-block-handoff", [
      {
        id: "stack-prediction",
        label: t(
          "두 block position·state 경계 예측",
          "Predict the two-block position and state boundary",
        ),
        passed:
          stackPrediction === "position-once-then-handoff-y",
        expected: t(
          "x₀=E+P 한 번 · y₁을 block₂로 전달",
          "x0=E+P once · hand y1 to block2",
        ),
        actual: {
          "position-once-then-handoff-y": t(
            "x₀=E+P 한 번 · y₁을 block₂로 전달",
            "x0=E+P once · hand y1 to block2",
          ),
          "position-before-every-block": t(
            "각 block 전에 P를 다시 더함",
            "re-add P before every block",
          ),
          "restart-each-block-from-embedding": t(
            "각 block을 E+P에서 다시 시작",
            "restart every block from E+P",
          ),
        }[stackPrediction],
        explanation: t(
          "stack은 state update를 누적합니다. 이 fixture의 absolute position은 첫 block 입력에서만 더합니다.",
          "A stack accumulates state updates. This fixture adds absolute position only at the first block input.",
        ),
      },
      {
        id: "visible-two-block",
        label: t(
          "공개 T=2 두-block handoff",
          "Visible T=2 two-block handoff",
        ),
        passed:
          stackPolicy === "position-once-handoff-y"
          && visibleError <= 1e-9,
        expected:
          `max|y₂−expected|=0.000000 · row0=${vectorText(visible.expectedSecond.output[0])}`,
        actual:
          `max|y₂−expected|=${format(visibleError)} · row0=${vectorText(visible.actualSecond.output[0])}`,
        explanation: t(
          "block₂는 block₁의 residual update가 누적된 y₁ 전체를 입력으로 받아야 합니다.",
          "Block2 must receive all of y1, including the residual updates accumulated by block1.",
        ),
      },
      {
        id: "second-two-block",
        label: t(
          "두 번째 T=3 두-block handoff",
          "Second T=3 two-block handoff",
        ),
        passed:
          stackPolicy === "position-once-handoff-y"
          && secondError <= 1e-9,
        expected:
          `max|y₂−expected|=0.000000 · row0=${vectorText(second.expectedSecond.output[0])}`,
        actual:
          `max|y₂−expected|=${format(secondError)} · row0=${vectorText(second.actualSecond.output[0])}`,
        explanation: t(
          "다른 token 수에서도 position 재주입이나 stream 재시작 없이 같은 handoff 계약을 지켜야 합니다.",
          "A second token count must preserve the same handoff without reinjecting position or restarting the stream.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-residual-ledger") {
      setResidualPrediction("");
      setResidualPolicy("");
    } else if (activeId === "diagnose-prenorm-shift") {
      setShiftPrediction("");
      setShiftPolicy("");
    } else {
      setStackPrediction("");
      setStackPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setResidualPrediction("");
    setResidualPolicy("");
    setShiftPrediction("");
    setShiftPolicy("");
    setStackPrediction("");
    setStackPolicy("");
    setActiveId("reproduce-residual-ledger");
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
      className="transformer-block-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "guided lab 밖에서도 Transformer Block state를 보존할 수 있나요?",
          "Can you preserve Transformer Block state outside the guided lab?",
        ),
        description: t(
          "필수 position·norm·residual·FFN 조립 lab과 다른 state·shift·stack fixture로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer on fresh state, shift, and stack fixtures outside the required position, norm, residual, and FFN assembly lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "Transformer Block 독립 연습 문제",
          "Transformer Block independent practice challenges",
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
          "residual 원장·pre-norm shift·두 block handoff 증거를 모두 만들었습니다.",
          "You produced residual-ledger, pre-norm-shift, and two-block-handoff evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-residual-ledger" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 residual fixture",
              "Fixed residual fixtures",
            )}
          >
            <span>{t("고정 residual fixture", "FIXED RESIDUAL FIXTURES")}</span>
            <pre><code>{`A = Attention(LN(x0))
x1 = learnerResidual1(x0, A)
F = FFN(LN(x1))
y  = learnerResidual2(x0, x1, F)

visible and second: fresh 3-feature states`}</code></pre>
            <p>{t(
              "branch 출력과 shape는 고정되고 두 skip source만 선택합니다.",
              "Branch outputs and shapes stay fixed; only the two skip sources are learner-owned.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "두 residual의 state 흐름 예측",
                "Predict the two-residual state flow",
              )}
              value={residualPrediction}
              options={[
                { value: "both-branches-update-shared-stream", label: "x₁=x₀+A · y=x₁+F" },
                { value: "branches-replace-the-stream", label: "x₁=A · y=F" },
                { value: "second-branch-reuses-x0", label: "x₁=x₀+A · y=x₀+F" },
              ]}
              onChange={(value) => {
                setResidualPrediction(value as ResidualLedgerPrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerResiduals"
              value={residualPolicy}
              options={[
                {
                  value: "two-residual-updates",
                  label: t(
                    "x₁=x₀+A · y=x₁+F",
                    "x1=x0+A · y=x1+F",
                  ),
                },
                {
                  value: "drop-first-skip",
                  label: t(
                    "x₁=A · y=x₁+F",
                    "x1=A · y=x1+F",
                  ),
                },
                {
                  value: "reuse-x0-second-skip",
                  label: t(
                    "x₁=x₀+A · y=x₀+F",
                    "x1=x0+A · y=x0+F",
                  ),
                },
              ]}
              onChange={(value) => {
                setResidualPolicy(value as ResidualLedgerPolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={!residualPrediction || !residualPolicy}
                onClick={runResidual}
              >
                {t(
                  "두 residual fixture 실행",
                  "Run both fresh residual ledgers",
                )}
              </button>
              <button type="button" className="button button-secondary" onClick={resetCurrent}>
                {t("현재 문제 초기화", "Reset current challenge")}
              </button>
            </div>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : activeId === "diagnose-prenorm-shift" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 pre-norm shift fixture",
              "Fixed pre-norm shift fixtures",
            )}
          >
            <span>{t(
              "고정 pre-norm shift fixture",
              "FIXED PRE-NORM SHIFT FIXTURES",
            )}</span>
            <pre><code>{`branch(x) = FixedBranch(LN(x))
y = learnerNormBoundary(x, branch)
x' = x + c * [1, 1, 1]

visible: c=+2
second:  c=-1.5`}</code></pre>
            <p>{t(
              "feature 전체의 공통 이동과 branch 함수는 고정됩니다.",
              "The common feature shift and branch function stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "공통 feature 이동 결과 예측",
                "Predict a common feature shift",
              )}
              value={shiftPrediction}
              options={[
                {
                  value: "branch-stays-output-shifts",
                  label: t(
                    "branch 동일 · output은 c만큼 이동",
                    "Branch fixed · output shifts by c",
                  ),
                },
                {
                  value: "branch-and-output-stay-fixed",
                  label: t(
                    "branch와 output 모두 동일",
                    "Branch and output both fixed",
                  ),
                },
                {
                  value: "branch-shifts-output-stays",
                  label: t(
                    "branch만 이동 · output 동일",
                    "Only branch shifts · output fixed",
                  ),
                },
              ]}
              onChange={(value) => {
                setShiftPrediction(value as PrenormShiftPrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerNormBoundary"
              value={shiftPolicy}
              options={[
                {
                  value: "prenorm-plus-skip",
                  label: "y=x+FixedBranch(LN(x))",
                },
                {
                  value: "branch-only",
                  label: "y=FixedBranch(LN(x))",
                },
                {
                  value: "postnorm-after-add",
                  label: "y=LN(x+FixedBranch(LN(x)))",
                },
              ]}
              onChange={(value) => {
                setShiftPolicy(value as PrenormShiftPolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={!shiftPrediction || !shiftPolicy}
                onClick={runShift}
              >
                {t(
                  "두 pre-norm shift 계약 실행",
                  "Run both pre-norm shift contracts",
                )}
              </button>
              <button type="button" className="button button-secondary" onClick={resetCurrent}>
                {t("현재 문제 초기화", "Reset current challenge")}
              </button>
            </div>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 two-block fixture",
              "Fixed two-block fixtures",
            )}
          >
            <span>{t("고정 two-block fixture", "FIXED TWO-BLOCK FIXTURES")}</span>
            <pre><code>{`x0 = E + P
y1 = block1(x0)
y2 = block2(learnerHandoff(E, P, y1))

visible: T=2, distinct block1/block2 parameters
second:  T=3, distinct block1/block2 parameters`}</code></pre>
            <p>{t(
              "두 block의 parameter와 E·P는 고정되고 block₂ 입력만 선택합니다.",
              "Both blocks' parameters and E/P stay fixed; only block2's input is learner-owned.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "두 block position·state 경계 예측",
                "Predict the two-block position and state boundary",
              )}
              value={stackPrediction}
              options={[
                {
                  value: "position-once-then-handoff-y",
                  label: t(
                    "E+P 한 번 · y₁을 block₂로 전달",
                    "E+P once · hand y1 to block2",
                  ),
                },
                {
                  value: "position-before-every-block",
                  label: t(
                    "각 block 전에 P 재주입",
                    "Reinject P before every block",
                  ),
                },
                {
                  value: "restart-each-block-from-embedding",
                  label: t(
                    "각 block을 E+P에서 재시작",
                    "Restart every block from E+P",
                  ),
                },
              ]}
              onChange={(value) => {
                setStackPrediction(value as TwoBlockPrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerHandoff"
              value={stackPolicy}
              options={[
                {
                  value: "position-once-handoff-y",
                  label: "block2(y₁)",
                },
                {
                  value: "readd-position-before-block2",
                  label: "block2(y₁+P)",
                },
                {
                  value: "restart-block2-from-input",
                  label: "block2(E+P)",
                },
              ]}
              onChange={(value) => {
                setStackPolicy(value as TwoBlockPolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button
                type="button"
                className="button button-primary"
                disabled={!stackPrediction || !stackPolicy}
                onClick={runStack}
              >
                {t(
                  "두 two-block handoff 실행",
                  "Run both two-block handoffs",
                )}
              </button>
              <button type="button" className="button button-secondary" onClick={resetCurrent}>
                {t("현재 문제 초기화", "Reset current challenge")}
              </button>
            </div>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      )}
    </PracticeDeck>
  );
}

import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  evaluatePracticeMastery,
  type PracticeAttempt,
  type PracticeCheck,
} from "../../features/practice/practice";
import {
  evaluateEarlyInputGradient,
  gatedCarrySecondFixture,
  gatedCarryVisibleFixture,
  recurrenceSecondFixture,
  recurrenceVisibleFixture,
  runGatedCarryPolicy,
  runSharedRecurrence,
  sequencesPracticeChallenges,
  temporalGradientSecondFixture,
  temporalGradientVisibleFixture,
  type GatedCarryPolicy,
  type GatedCarryPrediction,
  type RecurrencePolicy,
  type RecurrencePrediction,
  type SequencesPracticeChallengeId,
  type TemporalGradientPolicy,
  type TemporalGradientPrediction,
} from "../../features/sequences/sequences-practice";
import { DirectChoice } from "../interactive/DirectChoice";
import {
  PracticeDeck,
  PracticeResultChecks,
} from "../interactive/PracticeDeck";

type Attempts = Partial<Record<
  SequencesPracticeChallengeId,
  PracticeAttempt<SequencesPracticeChallengeId>
>>;

function format(value: number) {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return normalized.toFixed(6);
}

function stateText(values: readonly number[]) {
  return `[${values.map(format).join(", ")}]`;
}

function close(left: number, right: number, tolerance = 1e-7) {
  return Math.abs(left - right) <= tolerance;
}

function sameStates(left: readonly number[], right: readonly number[]) {
  return left.length === right.length
    && left.every((value, index) => close(value, right[index]));
}

export function SequencesPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<SequencesPracticeChallengeId>("reproduce-shared-recurrence");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [recurrencePrediction, setRecurrencePrediction] =
    useState<RecurrencePrediction | "">("");
  const [recurrencePolicy, setRecurrencePolicy] =
    useState<RecurrencePolicy | "">("");
  const [gradientPrediction, setGradientPrediction] =
    useState<TemporalGradientPrediction | "">("");
  const [gradientPolicy, setGradientPolicy] =
    useState<TemporalGradientPolicy | "">("");
  const [carryPrediction, setCarryPrediction] =
    useState<GatedCarryPrediction | "">("");
  const [carryPolicy, setCarryPolicy] =
    useState<GatedCarryPolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => sequencesPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-shared-recurrence": {
          skillId: t("재현", "reproduce"),
          label: "h[t]",
          title: t(
            "새 sequence에서 shared recurrence를 재현하세요",
            "Reproduce shared recurrence on fresh sequences",
          ),
          summary: t(
            "이전 state를 같은 cell로 전달하며 timestep마다 state 하나를 만듭니다.",
            "Emit one state per timestep while carrying prior state through one shared cell.",
          ),
        },
        "diagnose-temporal-gradient": {
          skillId: t("진단", "diagnose"),
          label: "∂hT/∂x0",
          title: t(
            "시간축 gradient에서 빠진 edge를 진단하세요",
            "Diagnose a missing edge in the temporal gradient",
          ),
          summary: t(
            "두 경로 길이에서 analytic early-input gradient를 수치 probe와 비교합니다.",
            "Match an analytic early-input gradient to a numerical probe on two path lengths.",
          ),
        },
        "transfer-gated-carry": {
          skillId: t("전이", "transfer"),
          label: "c / h",
          title: t(
            "새 gate 값으로 carry·write·reveal을 전이하세요",
            "Transfer carry, write, and reveal to fresh gates",
          ),
          summary: t(
            "cell에 남는 기억과 output gate가 hidden으로 드러내는 값을 분리합니다.",
            "Separate memory retained in the cell from what the output gate reveals as hidden.",
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
    challengeId: SequencesPracticeChallengeId,
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

  const invalidate = (challengeId: SequencesPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!recurrencePrediction || !recurrencePolicy) return;
    const expectedVisible = runSharedRecurrence(
      recurrenceVisibleFixture,
      "shared-recurrence",
    );
    const expectedSecond = runSharedRecurrence(
      recurrenceSecondFixture,
      "shared-recurrence",
    );
    const visible = runSharedRecurrence(
      recurrenceVisibleFixture,
      recurrencePolicy,
    );
    const second = runSharedRecurrence(
      recurrenceSecondFixture,
      recurrencePolicy,
    );
    updateAttempt("reproduce-shared-recurrence", [
      {
        id: "trace-shape",
        label: t("두 sequence의 state shape 예측", "Predict both state-trace shapes"),
        passed: recurrencePrediction === "state-per-timestep",
        expected: t("각 timestep마다 state 하나", "one state per timestep"),
        actual: {
          "state-per-timestep": t("timestep마다 하나", "one per timestep"),
          "final-state-only": t("마지막 state 하나만", "only one final state"),
          "independent-token-states": t("이전 state 없는 독립 row", "independent token rows"),
        }[recurrencePrediction],
        explanation: t(
          "shared cell은 weight를 재사용하지만 매 timestep의 다른 prefix state를 trace에 남깁니다.",
          "The shared cell reuses weights while retaining one different prefix state at every timestep.",
        ),
      },
      {
        id: "visible-recurrence",
        label: t("공개 sequence · T=3", "Visible sequence · T=3"),
        passed:
          recurrencePolicy === "shared-recurrence"
          && sameStates(visible.states, expectedVisible.states),
        expected: `[3, 1] · ${stateText(expectedVisible.states)}`,
        actual: `[${visible.outputShape.join(", ")}] · ${stateText(visible.states)}`,
        explanation: t(
          "각 h[t]는 현재 x[t]와 바로 이전 h[t−1]을 모두 사용합니다.",
          "Every h[t] uses both current x[t] and the immediately previous h[t−1].",
        ),
      },
      {
        id: "second-recurrence",
        label: t("두 번째 sequence · T=4", "Second sequence · T=4"),
        passed:
          recurrencePolicy === "shared-recurrence"
          && sameStates(second.states, expectedSecond.states),
        expected: `[4, 1] · ${stateText(expectedSecond.states)}`,
        actual: `[${second.outputShape.join(", ")}] · ${stateText(second.states)}`,
        explanation: t(
          "길이와 입력 부호가 바뀌어도 같은 recurrence 계약을 timestep별로 적용합니다.",
          "The same recurrence contract applies per timestep when both length and input signs change.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!gradientPrediction || !gradientPolicy) return;
    const visible = evaluateEarlyInputGradient(
      temporalGradientVisibleFixture,
      gradientPolicy,
    );
    const second = evaluateEarlyInputGradient(
      temporalGradientSecondFixture,
      gradientPolicy,
    );
    updateAttempt("diagnose-temporal-gradient", [
      {
        id: "gradient-path",
        label: t("early-input gradient 경로 예측", "Predict the early-input gradient path"),
        passed: gradientPrediction === "all-local-edges",
        expected: t("첫 local derivative × 모든 recurrent edge", "first local derivative × every recurrent edge"),
        actual: {
          "all-local-edges": t("모든 local edge", "every local edge"),
          "first-step-only": t("첫 step만", "first step only"),
          "final-step-only": t("마지막 step만", "final step only"),
        }[gradientPrediction],
        explanation: t(
          "x0에서 hT까지 가는 chain rule은 중간 hidden 경계를 건너뛸 수 없습니다.",
          "The chain rule from x0 to hT cannot skip any intermediate hidden boundary.",
        ),
      },
      {
        id: "visible-gradient",
        label: t("공개 경로 · recurrent edge 3개", "Visible path · 3 recurrent edges"),
        passed:
          gradientPolicy === "include-recurrent-gains"
          && close(visible.analytic, visible.numerical),
        expected: `analytic ≈ numeric ${format(visible.numerical)}`,
        actual: `${format(visible.analytic)} vs ${format(visible.numerical)}`,
        explanation: t(
          "각 h[t−1]→h[t] edge는 r(1−h[t]²)를 한 번씩 곱합니다.",
          "Every h[t−1]→h[t] edge contributes one r(1−h[t]²) factor.",
        ),
      },
      {
        id: "second-gradient",
        label: t("두 번째 경로 · recurrent edge 4개", "Second path · 4 recurrent edges"),
        passed:
          gradientPolicy === "include-recurrent-gains"
          && close(second.analytic, second.numerical),
        expected: `analytic ≈ numeric ${format(second.numerical)}`,
        actual: `${format(second.analytic)} vs ${format(second.numerical)}`,
        explanation: t(
          "한 edge가 더 긴 fixture가 우연히 짧은 경로에만 맞는 식을 배제합니다.",
          "The longer fixture rules out a formula that only happens to fit the shorter path.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!carryPrediction || !carryPolicy) return;
    const expectedVisible = runGatedCarryPolicy(
      gatedCarryVisibleFixture,
      "carry-write-reveal",
    );
    const expectedSecond = runGatedCarryPolicy(
      gatedCarrySecondFixture,
      "carry-write-reveal",
    );
    const visible = runGatedCarryPolicy(gatedCarryVisibleFixture, carryPolicy);
    const second = runGatedCarryPolicy(gatedCarrySecondFixture, carryPolicy);
    updateAttempt("transfer-gated-carry", [
      {
        id: "closed-output",
        label: t("o=0일 때 cell·hidden 예측", "Predict cell and hidden when o=0"),
        passed: carryPrediction === "cell-survives-closed-output",
        expected: t("cell 유지 · hidden 0", "cell retained · hidden zero"),
        actual: {
          "cell-survives-closed-output": t("cell 유지 · hidden 0", "cell retained · hidden zero"),
          "closed-output-erases-both": t("cell·hidden 모두 0", "both cell and hidden zero"),
          "hidden-always-equals-cell": t("hidden = cell", "hidden equals cell"),
        }[carryPrediction],
        explanation: t(
          "output gate는 현재 cell을 읽는 경로만 닫고 cell update 자체를 되돌리지 않습니다.",
          "The output gate closes only the readout path; it does not undo the cell update.",
        ),
      },
      {
        id: "visible-carry",
        label: t("공개 gate · carry only", "Visible gates · carry only"),
        passed:
          carryPolicy === "carry-write-reveal"
          && close(visible.cell, expectedVisible.cell)
          && close(visible.hidden, expectedVisible.hidden),
        expected: `c=${format(expectedVisible.cell)} · h=${format(expectedVisible.hidden)}`,
        actual: `c=${format(visible.cell)} · h=${format(visible.hidden)}`,
        explanation: t(
          "f=1, i=0은 이전 cell 0.75를 보존하고 o=0은 hidden만 닫습니다.",
          "f=1 and i=0 preserve prior cell 0.75, while o=0 closes only hidden output.",
        ),
      },
      {
        id: "second-carry",
        label: t("두 번째 gate · carry + write + reveal", "Second gates · carry + write + reveal"),
        passed:
          carryPolicy === "carry-write-reveal"
          && close(second.cell, expectedSecond.cell)
          && close(second.hidden, expectedSecond.hidden),
        expected: `c=${format(expectedSecond.cell)} · h=${format(expectedSecond.hidden)}`,
        actual: `c=${format(second.cell)} · h=${format(second.hidden)}`,
        explanation: t(
          "새 gate 값에서도 f·old cell과 i·candidate를 더한 뒤 o로 hidden을 드러냅니다.",
          "Fresh gates still add f·old cell and i·candidate before o reveals hidden.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-shared-recurrence") {
      setRecurrencePrediction("");
      setRecurrencePolicy("");
    } else if (activeId === "diagnose-temporal-gradient") {
      setGradientPrediction("");
      setGradientPolicy("");
    } else {
      setCarryPrediction("");
      setCarryPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setRecurrencePrediction("");
    setRecurrencePolicy("");
    setGradientPrediction("");
    setGradientPolicy("");
    setCarryPrediction("");
    setCarryPolicy("");
    setActiveId("reproduce-shared-recurrence");
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
      className="sequences-practice-deck"
      copy={{
        kicker: t("선택 연습 · 독립 수행", "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE"),
        title: t(
          "새 sequence에서도 시간축 state 경계를 다시 만들 수 있나요?",
          "Can you rebuild temporal state boundaries on fresh sequences?",
        ),
        description: t(
          "필수 memory lab과 다른 입력·경로 길이·gate 값으로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with inputs, path lengths, and gate values outside the required memory lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t("sequence 독립 연습 문제", "Sequence independent practice challenges"),
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
          "recurrence·시간축 gradient·gated carry 전이 증거를 모두 만들었습니다.",
          "You produced recurrence, temporal-gradient, and gated-carry transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-shared-recurrence" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 recurrence fixture", "Fixed recurrence fixtures")}>
            <span>{t("고정 recurrence fixture", "FIXED RECURRENCE FIXTURES")}</span>
            <pre><code>{`h = 0
for x[t] in sequence:
  h = learnerRecurrence(x[t], h, r)
  trace.append(h)

visible: x=[0.6,-0.2,0.4], r=0.55
second:  x=[-0.3,0.7,0,-0.1], r=0.4`}</code></pre>
            <p>{t("입력 순서와 recurrent gain은 고정됩니다.", "Input order and recurrent gains stay fixed.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("두 sequence의 state trace 예측", "Predict the state trace for both sequences")}
              value={recurrencePrediction}
              options={[
                { value: "state-per-timestep", label: t("timestep마다 state 하나", "One state per timestep") },
                { value: "final-state-only", label: t("마지막 state 하나만", "Only one final state") },
                { value: "independent-token-states", label: t("token마다 독립 state", "Independent state per token") },
              ]}
              onChange={(value) => { setRecurrencePrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label="learnerRecurrence"
              value={recurrencePolicy}
              options={[
                { value: "shared-recurrence", label: "tanh(x[t] + r·h[t−1])" },
                { value: "input-only", label: "tanh(x[t])" },
                { value: "sum-then-tanh", label: "tanh(sum(sequence))" },
              ]}
              onChange={(value) => { setRecurrencePolicy(value); invalidate(activeId); }}
            />
          </div>
          <div className="practice-actions">
            <button type="button" className="button button-primary" disabled={!recurrencePrediction || !recurrencePolicy} onClick={runReproduce}>
              {t("두 recurrence fixture 실행", "Run both recurrence fixtures")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}

      {activeId === "diagnose-temporal-gradient" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 시간축 gradient fixture", "Fixed temporal-gradient fixtures")}>
            <span>{t("고정 시간축 gradient fixture", "FIXED TEMPORAL-GRADIENT FIXTURES")}</span>
            <pre><code>{`analytic = learnerTemporalPath(trace, r)
numeric = (hT(x0+eps) - hT(x0-eps)) / (2*eps)

visible: T=4, r=0.6
second:  T=5, r=0.7`}</code></pre>
            <p>{t("중앙 유한차분 probe와 epsilon은 고정됩니다.", "The central finite-difference probe and epsilon stay fixed.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t("x0→hT gradient 경로 예측", "Predict the x0→hT gradient path")}
              value={gradientPrediction}
              options={[
                { value: "all-local-edges", label: t("모든 local edge 곱", "Multiply every local edge") },
                { value: "first-step-only", label: t("첫 step만", "Use only the first step") },
                { value: "final-step-only", label: t("마지막 step만", "Use only the final step") },
              ]}
              onChange={(value) => { setGradientPrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label="learnerTemporalPath"
              value={gradientPolicy}
              options={[
                { value: "include-recurrent-gains", label: "(1−h1²) · Π r(1−ht²)" },
                { value: "omit-recurrent-gains", label: "(1−h1²) · Π (1−ht²)" },
                { value: "last-local-derivative", label: "1−hT²" },
              ]}
              onChange={(value) => { setGradientPolicy(value); invalidate(activeId); }}
            />
          </div>
          <div className="practice-actions">
            <button type="button" className="button button-primary" disabled={!gradientPrediction || !gradientPolicy} onClick={runDiagnose}>
              {t("두 시간축 gradient 계약 실행", "Run both temporal-gradient contracts")}
            </button>
            <button type="button" className="button button-secondary" onClick={resetCurrent}>
              {t("현재 문제 초기화", "Reset current challenge")}
            </button>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : null}

      {activeId === "transfer-gated-carry" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 gated-carry fixture", "Fixed gated-carry fixtures")}>
            <span>{t("고정 gated-carry fixture", "FIXED GATED-CARRY FIXTURES")}</span>
            <pre><code>{`c = learnerCell(f, oldCell, i, candidate)
h = learnerReveal(o, c)

visible: old=0.75, f=1, i=0, o=0
second:  old=-0.5, g=0.8, f=0.8, i=0.25, o=0.7`}</code></pre>
            <p>{t("cell·candidate와 세 gate 값은 고정됩니다.", "Cell, candidate, and all three gate values stay fixed.")}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t("o=0일 때 cell과 hidden 예측", "Predict cell and hidden when o=0")}
              value={carryPrediction}
              options={[
                { value: "cell-survives-closed-output", label: t("cell 유지 · hidden 0", "Cell retained · hidden zero") },
                { value: "closed-output-erases-both", label: t("cell·hidden 모두 0", "Both cell and hidden zero") },
                { value: "hidden-always-equals-cell", label: "hidden = cell" },
              ]}
              onChange={(value) => { setCarryPrediction(value); invalidate(activeId); }}
            />
            <DirectChoice
              label="learnerCellReveal"
              value={carryPolicy}
              options={[
                { value: "carry-write-reveal", label: "c=f·old+i·g · h=o·tanh(c)" },
                { value: "output-erases-cell", label: "o=0 → c=0, h=0" },
                { value: "swap-input-forget", label: "c=i·old+f·g · h=o·tanh(c)" },
              ]}
              onChange={(value) => { setCarryPolicy(value); invalidate(activeId); }}
            />
          </div>
          <div className="practice-actions">
            <button type="button" className="button button-primary" disabled={!carryPrediction || !carryPolicy} onClick={runTransfer}>
              {t("두 gated-carry 전이 실행", "Run both gated-carry transfers")}
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

import { useMemo, useRef, useState } from "react";
import {
  attentionPracticeChallenges,
  pairingSecondFixture,
  pairingVisibleFixture,
  routingSecondFixture,
  routingVisibleFixture,
  runPairingPolicy,
  runRoutingPolicy,
  runScoreShiftPolicy,
  scoreShiftSecondFixture,
  scoreShiftVisibleFixture,
  type AttentionPracticeChallengeId,
  type PairingPolicy,
  type PairingPrediction,
  type RoutingPolicy,
  type RoutingPrediction,
  type ScoreShiftPolicy,
  type ScoreShiftPrediction,
} from "../../features/attention/attention-practice";
import { useLocale } from "../../features/localization/localization";
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
  AttentionPracticeChallengeId,
  PracticeAttempt<AttentionPracticeChallengeId>
>>;

function close(left: number, right: number, tolerance = 1e-9) {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= tolerance;
}

function sameVector(left: readonly number[], right: readonly number[]) {
  return left.length === right.length
    && left.every((value, index) => close(value, right[index]));
}

function format(value: number) {
  if (!Number.isFinite(value)) return "non-finite";
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return normalized.toFixed(6);
}

function vectorText(values: readonly number[]) {
  return `[${values.map(format).join(", ")}]`;
}

export function AttentionPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<AttentionPracticeChallengeId>("reproduce-fresh-routing");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [routingPrediction, setRoutingPrediction] =
    useState<RoutingPrediction | "">("");
  const [routingPolicy, setRoutingPolicy] =
    useState<RoutingPolicy | "">("");
  const [pairingPrediction, setPairingPrediction] =
    useState<PairingPrediction | "">("");
  const [pairingPolicy, setPairingPolicy] =
    useState<PairingPolicy | "">("");
  const [shiftPrediction, setShiftPrediction] =
    useState<ScoreShiftPrediction | "">("");
  const [shiftPolicy, setShiftPolicy] =
    useState<ScoreShiftPolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => attentionPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-fresh-routing": {
          skillId: t("재현", "reproduce"),
          title: t(
            "새 memory row에서 routing을 재현하세요",
            "Reproduce routing on fresh memory rows",
          ),
          summary: t(
            "key마다 weight 하나를 만들고 짝이 맞는 value를 value 공간의 context로 합칩니다.",
            "Build one weight per key, then combine paired values into a context in value space.",
          ),
        },
        "diagnose-row-pairing": {
          skillId: t("진단", "diagnose"),
          title: t(
            "깨진 key-value row 순열을 진단하세요",
            "Diagnose a broken key-value row permutation",
          ),
          summary: t(
            "주소·내용·label을 source row 한 단위로 두 memory에서 함께 재정렬합니다.",
            "Reorder addresses, content, and labels as one source-row unit across two memories.",
          ),
        },
        "transfer-score-shift": {
          skillId: t("전이", "transfer"),
          title: t(
            "극단적 score offset에서도 stable routing을 전이하세요",
            "Transfer stable routing across extreme score offsets",
          ),
          summary: t(
            "모든 score에 같은 큰 상수를 더해도 weight와 context를 그대로 보존합니다.",
            "Preserve weights and context when every score receives the same large offset.",
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
    challengeId: AttentionPracticeChallengeId,
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

  const invalidate = (challengeId: AttentionPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!routingPrediction || !routingPolicy) return;
    const expectedVisible = runRoutingPolicy(
      routingVisibleFixture,
      "stable-softmax-values",
    );
    const expectedSecond = runRoutingPolicy(
      routingSecondFixture,
      "stable-softmax-values",
    );
    const visible = runRoutingPolicy(routingVisibleFixture, routingPolicy);
    const second = runRoutingPolicy(routingSecondFixture, routingPolicy);
    updateAttempt("reproduce-fresh-routing", [
      {
        id: "routing-boundary",
        label: t("routing 출력 경계 예측", "Predict the routing output boundary"),
        passed:
          routingPrediction === "weights-per-key-context-in-value-space",
        expected: t(
          "key마다 weight · value 공간 context",
          "one weight per key · context in value space",
        ),
        actual: {
          "weights-per-key-context-in-value-space": t(
            "key마다 weight · value 공간 context",
            "one weight per key · context in value space",
          ),
          "single-hard-row": t("top value row 하나", "one hard top-value row"),
          "context-in-key-space": t("key 공간 context", "context in key space"),
        }[routingPrediction],
        explanation: t(
          "softmax는 source key마다 coefficient를 만들고 αV는 dᵥ 폭의 soft mixture를 반환합니다.",
          "Softmax creates one coefficient per source key, while alpha V returns a d_v-wide soft mixture.",
        ),
      },
      {
        id: "visible-routing",
        label: t("공개 memory · red top", "Visible memory · red top"),
        passed:
          routingPolicy === "stable-softmax-values"
          && sameVector(visible.weights, expectedVisible.weights)
          && sameVector(visible.context, expectedVisible.context),
        expected: `top=${expectedVisible.topSlotId} · α=${vectorText(expectedVisible.weights)} · c=${vectorText(expectedVisible.context)}`,
        actual: `top=${visible.topSlotId} · α=${vectorText(visible.weights)} · c=${vectorText(visible.context)}`,
        explanation: t(
          "score를 안정적으로 정규화한 뒤 같은 row의 value를 weight로 합쳐야 합니다.",
          "Normalize scores stably, then combine values from the matching rows with those weights.",
        ),
      },
      {
        id: "second-routing",
        label: t("두 번째 memory · harbor top", "Second memory · harbor top"),
        passed:
          routingPolicy === "stable-softmax-values"
          && sameVector(second.weights, expectedSecond.weights)
          && sameVector(second.context, expectedSecond.context),
        expected: `top=${expectedSecond.topSlotId} · α=${vectorText(expectedSecond.weights)} · c=${vectorText(expectedSecond.context)}`,
        actual: `top=${second.topSlotId} · α=${vectorText(second.weights)} · c=${vectorText(second.context)}`,
        explanation: t(
          "query·key·value 숫자가 모두 바뀌어도 qKᵀ→softmax→αV 경계는 같습니다.",
          "The qK transpose, softmax, and alpha V boundaries stay the same when every fixture value changes.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!pairingPrediction || !pairingPolicy) return;
    const visible = runPairingPolicy(pairingVisibleFixture, pairingPolicy);
    const second = runPairingPolicy(pairingSecondFixture, pairingPolicy);
    updateAttempt("diagnose-row-pairing", [
      {
        id: "pairing-invariance",
        label: t("paired row 순열 결과 예측", "Predict a paired-row permutation"),
        passed:
          pairingPrediction === "context-and-top-label-stable",
        expected: t(
          "context·top label 유지",
          "context and top label stay stable",
        ),
        actual: {
          "context-and-top-label-stable": t(
            "context·top label 유지",
            "context and top label stay stable",
          ),
          "context-changes": t("context 변경", "context changes"),
          "top-label-changes": t("top label 변경", "top label changes"),
        }[pairingPrediction],
        explanation: t(
          "source row 순서 자체는 의미가 없지만 key·value·label의 row identity는 함께 움직여야 합니다.",
          "Source-row order itself is arbitrary, but key, value, and label identity must move together.",
        ),
      },
      {
        id: "visible-pairing",
        label: t("공개 순열 · [2,0,1]", "Visible permutation · [2,0,1]"),
        passed:
          pairingPolicy === "reorder-paired-rows"
          && sameVector(
            visible.baseline.context,
            visible.reordered.context,
          )
          && visible.baseline.topSlotId === visible.reordered.topSlotId,
        expected: `top=${visible.baseline.topSlotId} · c=${vectorText(visible.baseline.context)}`,
        actual: `top=${visible.reordered.topSlotId} · c=${vectorText(visible.reordered.context)}`,
        explanation: t(
          "세 배열을 함께 순열하면 score와 weight 위치만 이동하고 동일한 value 기여가 다시 합쳐집니다.",
          "Permuting all three arrays only moves score and weight positions; the same value contributions recombine.",
        ),
      },
      {
        id: "second-pairing",
        label: t("두 번째 순열 · [1,2,0]", "Second permutation · [1,2,0]"),
        passed:
          pairingPolicy === "reorder-paired-rows"
          && sameVector(
            second.baseline.context,
            second.reordered.context,
          )
          && second.baseline.topSlotId === second.reordered.topSlotId,
        expected: `top=${second.baseline.topSlotId} · c=${vectorText(second.baseline.context)}`,
        actual: `top=${second.reordered.topSlotId} · c=${vectorText(second.reordered.context)}`,
        explanation: t(
          "다른 top row와 순열에서도 같은 결과가 나와야 우연히 한 memory에만 맞춘 수리가 아닙니다.",
          "A second top row and permutation rule out a repair that only happens to fit one memory.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!shiftPrediction || !shiftPolicy) return;
    const visible = runScoreShiftPolicy(
      scoreShiftVisibleFixture,
      shiftPolicy,
    );
    const second = runScoreShiftPolicy(
      scoreShiftSecondFixture,
      shiftPolicy,
    );
    updateAttempt("transfer-score-shift", [
      {
        id: "shift-invariance",
        label: t("공통 score offset 결과 예측", "Predict a shared score offset"),
        passed: shiftPrediction === "weights-context-invariant",
        expected: t("weight·context 동일", "weights and context unchanged"),
        actual: {
          "weights-context-invariant": t(
            "weight·context 동일",
            "weights and context unchanged",
          ),
          "weights-become-uniform": t(
            "weight가 균등해짐",
            "weights become uniform",
          ),
          "top-weight-becomes-one": t(
            "top weight가 1이 됨",
            "top weight becomes one",
          ),
        }[shiftPrediction],
        explanation: t(
          "softmax의 분자·분모에 같은 exp(c)가 곱해져 공통 offset은 상쇄됩니다.",
          "The same exp(c) multiplies every numerator and the denominator, so a shared offset cancels.",
        ),
      },
      {
        id: "positive-shift",
        label: t("+1000 score offset", "+1000 score offset"),
        passed:
          shiftPolicy === "subtract-row-max"
          && sameVector(
            visible.baselineWeights,
            visible.shiftedWeights,
          )
          && sameVector(
            visible.baselineContext,
            visible.shiftedContext,
          ),
        expected: `α=${vectorText(visible.baselineWeights)} · c=${vectorText(visible.baselineContext)}`,
        actual: `α'=${vectorText(visible.shiftedWeights)} · c'=${vectorText(visible.shiftedContext)}`,
        explanation: t(
          "row 최댓값을 먼저 빼면 exp(1002) overflow 없이 동일한 분포를 계산합니다.",
          "Subtracting the row maximum computes the same distribution without overflowing at exp(1002).",
        ),
      },
      {
        id: "negative-shift",
        label: t("−800 score offset", "−800 score offset"),
        passed:
          shiftPolicy === "subtract-row-max"
          && sameVector(
            second.baselineWeights,
            second.shiftedWeights,
          )
          && sameVector(
            second.baselineContext,
            second.shiftedContext,
          ),
        expected: `α=${vectorText(second.baselineWeights)} · c=${vectorText(second.baselineContext)}`,
        actual: `α'=${vectorText(second.shiftedWeights)} · c'=${vectorText(second.shiftedContext)}`,
        explanation: t(
          "큰 음수 offset에서도 max-shift는 모든 exp가 0으로 underflow해 0/0이 되는 실패를 피합니다.",
          "Under a large negative offset, max shifting avoids every exponential underflowing to zero and producing 0/0.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-fresh-routing") {
      setRoutingPrediction("");
      setRoutingPolicy("");
    } else if (activeId === "diagnose-row-pairing") {
      setPairingPrediction("");
      setPairingPolicy("");
    } else {
      setShiftPrediction("");
      setShiftPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setRoutingPrediction("");
    setRoutingPolicy("");
    setPairingPrediction("");
    setPairingPolicy("");
    setShiftPrediction("");
    setShiftPolicy("");
    setActiveId("reproduce-fresh-routing");
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
      className="attention-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "guided lab 밖에서도 Attention routing을 보존할 수 있나요?",
          "Can you preserve Attention routing outside the guided lab?",
        ),
        description: t(
          "필수 lab과 다른 Q·K·V, row 순열, score offset으로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with Q/K/V rows, permutations, and score offsets outside the required lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "Attention 독립 연습 문제",
          "Attention independent practice challenges",
        ),
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
          "fresh routing·row pairing·stable score-shift 전이 증거를 모두 만들었습니다.",
          "You produced fresh-routing, row-pairing, and stable score-shift transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-fresh-routing" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 Attention fixture", "Fixed Attention fixtures")}
          >
            <span>{t("고정 Attention fixture", "FIXED ATTENTION FIXTURES")}</span>
            <pre><code>{`scores = q @ K.T
weights = learnerNormalize(scores)
context = learnerRead(weights, K, V)

visible: q=[1.2,-0.4], rows=3, d_v=3
second:  q=[-0.5,1.1], rows=3, d_v=3`}</code></pre>
            <p>{t(
              "Q·K·V와 source row 순서는 고정됩니다.",
              "Q, K, V, and source-row order stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "routing 출력 shape·의미 예측",
                "Predict routing output shape and meaning",
              )}
              value={routingPrediction}
              options={[
                {
                  value: "weights-per-key-context-in-value-space",
                  label: t(
                    "key마다 weight · value 공간 context",
                    "One weight per key · context in value space",
                  ),
                },
                {
                  value: "single-hard-row",
                  label: t("top value row 하나", "One hard top-value row"),
                },
                {
                  value: "context-in-key-space",
                  label: t("key 공간 context", "Context in key space"),
                },
              ]}
              onChange={(value) => {
                setRoutingPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerNormalize + learnerRead"
              value={routingPolicy}
              options={[
                {
                  value: "stable-softmax-values",
                  label: "softmax(scores−max) · weights @ V",
                },
                {
                  value: "normalize-score-sum-values",
                  label: "scores / sum(scores) · weights @ V",
                },
                {
                  value: "stable-softmax-keys",
                  label: "softmax(scores−max) · weights @ K",
                },
              ]}
              onChange={(value) => {
                setRoutingPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!routingPrediction || !routingPolicy}
              onClick={runReproduce}
            >
              {t(
                "두 Attention routing fixture 실행",
                "Run both Attention routing fixtures",
              )}
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

      {activeId === "diagnose-row-pairing" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 row 순열 fixture", "Fixed row-permutation fixtures")}
          >
            <span>{t("고정 row 순열 fixture", "FIXED ROW-PERMUTATION FIXTURES")}</span>
            <pre><code>{`baseline = attention(q, K, V, labels)
reordered = learnerReorder(sourceRows)

visible permutation: [2,0,1]
second permutation:  [1,2,0]`}</code></pre>
            <p>{t(
              "query와 순열은 고정되고 learner가 함께 움직일 배열만 선택합니다.",
              "Queries and permutations stay fixed; the learner chooses which arrays move together.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t(
                "paired row 순열 결과 예측",
                "Predict the paired-row permutation result",
              )}
              value={pairingPrediction}
              options={[
                {
                  value: "context-and-top-label-stable",
                  label: t(
                    "context·top label 유지",
                    "Context and top label stay stable",
                  ),
                },
                {
                  value: "context-changes",
                  label: t("context 변경", "Context changes"),
                },
                {
                  value: "top-label-changes",
                  label: t("top label 변경", "Top label changes"),
                },
              ]}
              onChange={(value) => {
                setPairingPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerReorder"
              value={pairingPolicy}
              options={[
                {
                  value: "reorder-paired-rows",
                  label: t(
                    "K·V·label 함께 재정렬",
                    "Reorder K, V, and labels together",
                  ),
                },
                {
                  value: "reorder-addresses-only",
                  label: t(
                    "K·label만 재정렬",
                    "Reorder only K and labels",
                  ),
                },
                {
                  value: "reorder-content-only",
                  label: t("V만 재정렬", "Reorder only V"),
                },
              ]}
              onChange={(value) => {
                setPairingPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!pairingPrediction || !pairingPolicy}
              onClick={runDiagnose}
            >
              {t(
                "두 row-pairing 계약 실행",
                "Run both row-pairing contracts",
              )}
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

      {activeId === "transfer-score-shift" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 score-shift fixture", "Fixed score-shift fixtures")}
          >
            <span>{t("고정 score-shift fixture", "FIXED SCORE-SHIFT FIXTURES")}</span>
            <pre><code>{`baseline = learnerSoftmax(scores)
shifted  = learnerSoftmax(scores + offset)
context  = weights @ V

visible offset: +1000
second offset:  -800`}</code></pre>
            <p>{t(
              "score 차이와 V는 고정되고 공통 offset만 바뀝니다.",
              "Score differences and V stay fixed; only the shared offset changes.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t(
                "공통 score offset 결과 예측",
                "Predict the shared score-offset result",
              )}
              value={shiftPrediction}
              options={[
                {
                  value: "weights-context-invariant",
                  label: t(
                    "weight·context 동일",
                    "Weights and context unchanged",
                  ),
                },
                {
                  value: "weights-become-uniform",
                  label: t(
                    "weight가 균등해짐",
                    "Weights become uniform",
                  ),
                },
                {
                  value: "top-weight-becomes-one",
                  label: t(
                    "top weight가 1이 됨",
                    "Top weight becomes one",
                  ),
                },
              ]}
              onChange={(value) => {
                setShiftPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerSoftmax"
              value={shiftPolicy}
              options={[
                {
                  value: "subtract-row-max",
                  label: "exp(s−max(s)) / Σexp(s−max(s))",
                },
                {
                  value: "raw-exponentials",
                  label: "exp(s) / Σexp(s)",
                },
                {
                  value: "divide-score-sum",
                  label: "s / Σs",
                },
              ]}
              onChange={(value) => {
                setShiftPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!shiftPrediction || !shiftPolicy}
              onClick={runTransfer}
            >
              {t(
                "두 score-shift 전이 실행",
                "Run both score-shift transfers",
              )}
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

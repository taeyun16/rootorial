import { useMemo, useRef, useState } from "react";
import {
  causalTransferSecondFixture,
  causalTransferVisibleFixture,
  duplicateSecondFixture,
  duplicateVisibleFixture,
  rowEquivarianceSecondFixture,
  rowEquivarianceVisibleFixture,
  runCausalTransferPolicy,
  runDuplicatePolicy,
  runRowEquivariancePolicy,
  selfAttentionPracticeChallenges,
  type CausalTransferPolicy,
  type CausalTransferPrediction,
  type DuplicatePolicy,
  type DuplicatePrediction,
  type Matrix,
  type RowEquivariancePolicy,
  type RowEquivariancePrediction,
  type SelfAttentionPracticeChallengeId,
} from "../../features/self-attention/self-attention-practice";
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
  SelfAttentionPracticeChallengeId,
  PracticeAttempt<SelfAttentionPracticeChallengeId>
>>;

function close(left: number, right: number, tolerance = 1e-9) {
  return Number.isFinite(left)
    && Number.isFinite(right)
    && Math.abs(left - right) <= tolerance;
}

function sameMatrix(left: Matrix, right: Matrix) {
  return left.length === right.length
    && left.every((row, rowIndex) =>
      row.length === right[rowIndex].length
      && row.every((value, column) =>
        close(value, right[rowIndex][column])
      )
    );
}

function maximumError(left: Matrix, right: Matrix) {
  return Math.max(
    ...left.flatMap((row, rowIndex) =>
      row.map((value, column) =>
        Math.abs(value - right[rowIndex][column])
      )
    ),
  );
}

function format(value: number) {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return normalized.toFixed(6);
}

function vectorText(values: readonly number[]) {
  return `[${values.map(format).join(", ")}]`;
}

export function SelfAttentionPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<SelfAttentionPracticeChallengeId>(
      "reproduce-row-equivariance",
    );
  const [attempts, setAttempts] = useState<Attempts>({});
  const [equivariancePrediction, setEquivariancePrediction] =
    useState<RowEquivariancePrediction | "">("");
  const [equivariancePolicy, setEquivariancePolicy] =
    useState<RowEquivariancePolicy | "">("");
  const [duplicatePrediction, setDuplicatePrediction] =
    useState<DuplicatePrediction | "">("");
  const [duplicatePolicy, setDuplicatePolicy] =
    useState<DuplicatePolicy | "">("");
  const [causalPrediction, setCausalPrediction] =
    useState<CausalTransferPrediction | "">("");
  const [causalPolicy, setCausalPolicy] =
    useState<CausalTransferPolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => selfAttentionPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-row-equivariance": {
          skillId: t("재현", "reproduce"),
          title: t(
            "token-row 순열 등변성을 재현하세요",
            "Reproduce token-row permutation equivariance",
          ),
          summary: t(
            "모든 row-wise projection 전에 X를 한 번 순열하고 출력 row가 같은 순열을 따르는지 확인합니다.",
            "Permute X once before every row-wise projection and verify that output rows follow the same permutation.",
          ),
        },
        "diagnose-position-free-duplicates": {
          skillId: t("진단", "diagnose"),
          title: t(
            "의도하지 않은 position 누출을 진단하세요",
            "Diagnose an accidental position leak",
          ),
          summary: t(
            "position과 visibility가 구분하지 않는 동일 token row는 동일 context를 받아야 합니다.",
            "Identical token rows receive identical contexts when neither position nor visibility distinguishes them.",
          ),
        },
        "transfer-causal-visibility": {
          skillId: t("전이", "transfer"),
          title: t(
            "순열 등변성을 causal visibility 경계로 전이하세요",
            "Transfer equivariance across a causal visibility boundary",
          ),
          summary: t(
            "token만 재배치하는 경우와 token·query-key visibility를 함께 relabel하는 경우를 구분합니다.",
            "Separate token-only reordering from jointly relabeling tokens and their query-key visibility relation.",
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
    challengeId: SelfAttentionPracticeChallengeId,
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

  const invalidate = (challengeId: SelfAttentionPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!equivariancePrediction || !equivariancePolicy) return;
    const visible = runRowEquivariancePolicy(
      rowEquivarianceVisibleFixture,
      equivariancePolicy,
    );
    const second = runRowEquivariancePolicy(
      rowEquivarianceSecondFixture,
      equivariancePolicy,
    );
    updateAttempt("reproduce-row-equivariance", [
      {
        id: "equivariance-prediction",
        label: t(
          "token-row 순열 결과 예측",
          "Predict a token-row permutation",
        ),
        passed:
          equivariancePrediction === "outputs-follow-token-permutation",
        expected: t(
          "출력 row가 같은 순열 P를 따름",
          "output rows follow the same permutation P",
        ),
        actual: {
          "outputs-follow-token-permutation": t(
            "출력 row가 같은 순열 P를 따름",
            "output rows follow the same permutation P",
          ),
          "outputs-stay-in-original-order": t(
            "출력이 원래 순서를 유지",
            "outputs stay in their original order",
          ),
          "token-axis-becomes-feature-axis": t(
            "token 축이 feature 축으로 바뀜",
            "the token axis becomes the feature axis",
          ),
        }[equivariancePrediction],
        explanation: t(
          "공유 projection과 attention은 row label을 보지 않으므로 X의 순열은 Y의 같은 순열로 이동합니다.",
          "Shared projections and attention do not inspect row labels, so a permutation of X produces the same permutation of Y.",
        ),
      },
      {
        id: "visible-equivariance",
        label: t(
          "공개 T=3 순열 · [2,0,1]",
          "Visible T=3 permutation · [2,0,1]",
        ),
        passed:
          equivariancePolicy === "permute-input-before-qkv"
          && sameMatrix(
            visible.permuted.contexts,
            visible.expectedContexts,
          ),
        expected: `max|Y'−P·Y|=0.000000 · row0=${vectorText(visible.expectedContexts[0])}`,
        actual: `max|Y'−P·Y|=${format(maximumError(visible.permuted.contexts, visible.expectedContexts))} · row0=${vectorText(visible.permuted.contexts[0])}`,
        explanation: t(
          "X를 한 번 순열한 뒤 Q/K/V를 모두 다시 만들면 query·key·value row identity가 함께 이동합니다.",
          "Permuting X once before rebuilding Q, K, and V moves query, key, and value row identity together.",
        ),
      },
      {
        id: "second-equivariance",
        label: t(
          "두 번째 T=4 순열 · [1,3,0,2]",
          "Second T=4 permutation · [1,3,0,2]",
        ),
        passed:
          equivariancePolicy === "permute-input-before-qkv"
          && sameMatrix(
            second.permuted.contexts,
            second.expectedContexts,
          ),
        expected: `max|Y'−P·Y|=0.000000 · row0=${vectorText(second.expectedContexts[0])}`,
        actual: `max|Y'−P·Y|=${format(maximumError(second.permuted.contexts, second.expectedContexts))} · row0=${vectorText(second.permuted.contexts[0])}`,
        explanation: t(
          "다른 길이와 순열에서도 성립해야 특정 숫자에 맞춘 우연한 수리가 아닙니다.",
          "A second length and permutation rule out a repair that only fits one numeric fixture.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!duplicatePrediction || !duplicatePolicy) return;
    const visible = runDuplicatePolicy(
      duplicateVisibleFixture,
      duplicatePolicy,
    );
    const second = runDuplicatePolicy(
      duplicateSecondFixture,
      duplicatePolicy,
    );
    updateAttempt("diagnose-position-free-duplicates", [
      {
        id: "duplicate-prediction",
        label: t(
          "동일 token row의 context 예측",
          "Predict contexts for identical token rows",
        ),
        passed:
          duplicatePrediction
          === "duplicate-rows-produce-duplicate-contexts",
        expected: t(
          "동일 row · 동일 context",
          "identical rows · identical contexts",
        ),
        actual: {
          "duplicate-rows-produce-duplicate-contexts": t(
            "동일 row · 동일 context",
            "identical rows · identical contexts",
          ),
          "duplicate-rows-produce-different-contexts": t(
            "동일 row · 다른 context",
            "identical rows · different contexts",
          ),
          "only-duplicate-keys-match": t(
            "key만 같고 context는 다름",
            "only keys match; contexts differ",
          ),
        }[duplicatePrediction],
        explanation: t(
          "동일 query row는 같은 K/V 집합에 같은 score row를 만들므로 같은 context를 얻습니다.",
          "Identical query rows produce the same score row over the same K/V set and therefore the same context.",
        ),
      },
      {
        id: "visible-duplicates",
        label: t(
          "공개 duplicate rows · 0 ↔ 2",
          "Visible duplicate rows · 0 ↔ 2",
        ),
        passed:
          duplicatePolicy === "no-position-signal"
          && sameMatrix(
            [visible.firstContext],
            [visible.secondContext],
          ),
        expected: `c0=c2=${vectorText(visible.firstContext)}`,
        actual: `c0=${vectorText(visible.firstContext)} · c2=${vectorText(visible.secondContext)}`,
        explanation: t(
          "row index를 query에 몰래 더하거나 causal prefix를 적용하면 두 위치가 구분되어 이 계약이 깨집니다.",
          "Secretly adding row index to queries or applying a causal prefix distinguishes the two positions and breaks this contract.",
        ),
      },
      {
        id: "second-duplicates",
        label: t(
          "두 번째 duplicate rows · 1 ↔ 3",
          "Second duplicate rows · 1 ↔ 3",
        ),
        passed:
          duplicatePolicy === "no-position-signal"
          && sameMatrix(
            [second.firstContext],
            [second.secondContext],
          ),
        expected: `c1=c3=${vectorText(second.firstContext)}`,
        actual: `c1=${vectorText(second.firstContext)} · c3=${vectorText(second.secondContext)}`,
        explanation: t(
          "다른 주변 row에서도 같아야 position-free 계산의 구조적 결과임을 확인할 수 있습니다.",
          "Matching under different surrounding rows shows this is a structural consequence of position-free computation.",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!causalPrediction || !causalPolicy) return;
    const visible = runCausalTransferPolicy(
      causalTransferVisibleFixture,
      causalPolicy,
    );
    const second = runCausalTransferPolicy(
      causalTransferSecondFixture,
      causalPolicy,
    );
    updateAttempt("transfer-causal-visibility", [
      {
        id: "causal-prediction",
        label: t(
          "causal 순열 경계 예측",
          "Predict the causal permutation boundary",
        ),
        passed:
          causalPrediction === "token-only-changes-joint-relabel-restores",
        expected: t(
          "token만 이동하면 prefix가 바뀜 · X와 M을 함께 relabel하면 복구",
          "token-only changes the prefix · jointly relabeling X and M restores the trace",
        ),
        actual: {
          "token-only-changes-joint-relabel-restores": t(
            "token만 이동하면 prefix가 바뀜 · X와 M을 함께 relabel하면 복구",
            "token-only changes the prefix · jointly relabeling X and M restores the trace",
          ),
          "token-only-preserves-equivariance": t(
            "token만 이동해도 항상 복구",
            "token-only always preserves the trace",
          ),
          "visibility-never-moves": t(
            "visibility는 어떤 순열에서도 고정",
            "visibility never moves under a permutation",
          ),
        }[causalPrediction],
        explanation: t(
          "causal mask는 token 내용이 아니라 query-key 위치 관계입니다. 임의 순열에서 같은 계산을 비교하려면 M도 P·M·Pᵀ로 relabel해야 합니다.",
          "A causal mask is a query-key position relation, not token content. Comparing the same computation under an arbitrary permutation requires relabeling M as P·M·Pᵀ.",
        ),
      },
      {
        id: "visible-causal-transfer",
        label: t(
          "공개 causal T=3 · X와 M relabel",
          "Visible causal T=3 · relabel X and M",
        ),
        passed:
          causalPolicy === "permute-input-and-visibility"
          && sameMatrix(
            visible.transferred.contexts,
            visible.expectedContexts,
          ),
        expected: `max|Y'−P·Y|=0.000000 · row0=${vectorText(visible.expectedContexts[0])}`,
        actual: `max|Y'−P·Y|=${format(maximumError(visible.transferred.contexts, visible.expectedContexts))} · row0=${vectorText(visible.transferred.contexts[0])}`,
        explanation: t(
          "token row와 mask의 query·key 두 축을 함께 이동하면 같은 허용 edge가 새 label 아래 보존됩니다.",
          "Moving token rows and both query/key axes of the mask preserves the same allowed edges under new labels.",
        ),
      },
      {
        id: "second-causal-transfer",
        label: t(
          "두 번째 causal T=4 · X와 M relabel",
          "Second causal T=4 · relabel X and M",
        ),
        passed:
          causalPolicy === "permute-input-and-visibility"
          && sameMatrix(
            second.transferred.contexts,
            second.expectedContexts,
          ),
        expected: `max|Y'−P·Y|=0.000000 · row0=${vectorText(second.expectedContexts[0])}`,
        actual: `max|Y'−P·Y|=${format(maximumError(second.transferred.contexts, second.expectedContexts))} · row0=${vectorText(second.transferred.contexts[0])}`,
        explanation: t(
          "T=4에서도 동일한 edge relabel 계약을 재현해야 mask shape와 token axis의 결합을 설명할 수 있습니다.",
          "Reproducing the same edge-relabeling contract at T=4 connects mask shape to the token axis.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-row-equivariance") {
      setEquivariancePrediction("");
      setEquivariancePolicy("");
    } else if (activeId === "diagnose-position-free-duplicates") {
      setDuplicatePrediction("");
      setDuplicatePolicy("");
    } else {
      setCausalPrediction("");
      setCausalPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setEquivariancePrediction("");
    setEquivariancePolicy("");
    setDuplicatePrediction("");
    setDuplicatePolicy("");
    setCausalPrediction("");
    setCausalPolicy("");
    setActiveId("reproduce-row-equivariance");
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
      className="self-attention-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "guided lab 밖에서도 Self-Attention row 의미를 보존할 수 있나요?",
          "Can you preserve Self-Attention row semantics outside the guided lab?",
        ),
        description: t(
          "필수 projection·mask·multi-head lab과 다른 row 순열·duplicate·visibility fixture로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with row permutations, duplicates, and visibility fixtures outside the required projection, mask, and multi-head lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "Self-Attention 독립 연습 문제",
          "Self-Attention independent practice challenges",
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
          "row 순열·position-free duplicate·causal visibility 전이 증거를 모두 만들었습니다.",
          "You produced row-permutation, position-free duplicate, and causal-visibility transfer evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-row-equivariance" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 non-causal 순열 fixture",
              "Fixed non-causal permutation fixtures",
            )}
          >
            <span>{t(
              "고정 non-causal 순열 fixture",
              "FIXED NON-CAUSAL PERMUTATION FIXTURES",
            )}</span>
            <pre><code>{`Y = selfAttention(X, visibility="all")
expected = P @ Y
actual = selfAttention(learnerPermute(X))

visible: T=3, P=[2,0,1]
second:  T=4, P=[1,3,0,2]`}</code></pre>
            <p>{t(
              "공유 WQ·WK·WV와 full visibility는 고정됩니다.",
              "Shared WQ, WK, WV, and full visibility stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "token-row 순열 출력 예측",
                "Predict token-row permutation output",
              )}
              value={equivariancePrediction}
              options={[
                {
                  value: "outputs-follow-token-permutation",
                  label: t(
                    "출력 row가 같은 순열 P를 따름",
                    "Output rows follow the same permutation P",
                  ),
                },
                {
                  value: "outputs-stay-in-original-order",
                  label: t(
                    "출력이 원래 순서를 유지",
                    "Outputs stay in original order",
                  ),
                },
                {
                  value: "token-axis-becomes-feature-axis",
                  label: t(
                    "token 축이 feature 축으로 바뀜",
                    "Token axis becomes feature axis",
                  ),
                },
              ]}
              onChange={(value) => {
                setEquivariancePrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerPermute"
              value={equivariancePolicy}
              options={[
                {
                  value: "permute-input-before-qkv",
                  label: "P @ X → project Q/K/V",
                },
                {
                  value: "permute-keys-only",
                  label: "X → project → P @ K only",
                },
                {
                  value: "permute-values-only",
                  label: "X → project → P @ V only",
                },
              ]}
              onChange={(value) => {
                setEquivariancePolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!equivariancePrediction || !equivariancePolicy}
              onClick={runReproduce}
            >
              {t(
                "두 row 순열 fixture 실행",
                "Run both row-permutation fixtures",
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

      {activeId === "diagnose-position-free-duplicates" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 duplicate-row fixture",
              "Fixed duplicate-row fixtures",
            )}
          >
            <span>{t(
              "고정 duplicate-row fixture",
              "FIXED DUPLICATE-ROW FIXTURES",
            )}</span>
            <pre><code>{`Q, K, V = sharedRowwiseProject(X)
Y = attention(Q, K, V, learnerBoundary)

visible: X[0] == X[2]
second:  X[1] == X[3]`}</code></pre>
            <p>{t(
              "duplicate row와 주변 token은 고정됩니다.",
              "Duplicate rows and surrounding tokens stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "동일 token row의 context 예측",
                "Predict contexts for identical token rows",
              )}
              value={duplicatePrediction}
              options={[
                {
                  value: "duplicate-rows-produce-duplicate-contexts",
                  label: t(
                    "동일 row · 동일 context",
                    "Identical rows · identical contexts",
                  ),
                },
                {
                  value: "duplicate-rows-produce-different-contexts",
                  label: t(
                    "동일 row · 다른 context",
                    "Identical rows · different contexts",
                  ),
                },
                {
                  value: "only-duplicate-keys-match",
                  label: t(
                    "key만 같고 context는 다름",
                    "Only keys match; contexts differ",
                  ),
                },
              ]}
              onChange={(value) => {
                setDuplicatePrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerBoundary"
              value={duplicatePolicy}
              options={[
                {
                  value: "no-position-signal",
                  label: "visibility=all · no position signal",
                },
                {
                  value: "inject-query-row-index",
                  label: "Q[row] += rowIndex",
                },
                {
                  value: "use-causal-prefix",
                  label: "visibility = causal(rowIndex)",
                },
              ]}
              onChange={(value) => {
                setDuplicatePolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!duplicatePrediction || !duplicatePolicy}
              onClick={runDiagnose}
            >
              {t(
                "두 duplicate-row 계약 실행",
                "Run both duplicate-row contracts",
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

      {activeId === "transfer-causal-visibility" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t(
              "고정 causal visibility fixture",
              "Fixed causal visibility fixtures",
            )}
          >
            <span>{t(
              "고정 causal visibility fixture",
              "FIXED CAUSAL VISIBILITY FIXTURES",
            )}</span>
            <pre><code>{`Y = selfAttention(X, visibility=M)
expected = P @ Y
actual = selfAttention(
  learnerRelabel(X, M)
)

M'[r,c] = M[P[r], P[c]]`}</code></pre>
            <p>{t(
              "causal M과 두 비단조 순열은 고정됩니다.",
              "Causal M and two non-monotonic permutations stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t(
                "causal 순열 경계 예측",
                "Predict the causal permutation boundary",
              )}
              value={causalPrediction}
              options={[
                {
                  value: "token-only-changes-joint-relabel-restores",
                  label: t(
                    "token만 이동하면 prefix 변경 · X와 M 함께 이동하면 복구",
                    "Token-only changes prefix · moving X and M together restores",
                  ),
                },
                {
                  value: "token-only-preserves-equivariance",
                  label: t(
                    "token만 이동해도 항상 복구",
                    "Token-only always restores",
                  ),
                },
                {
                  value: "visibility-never-moves",
                  label: t(
                    "visibility는 어떤 순열에서도 고정",
                    "Visibility never moves",
                  ),
                },
              ]}
              onChange={(value) => {
                setCausalPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerRelabel"
              value={causalPolicy}
              options={[
                {
                  value: "permute-input-and-visibility",
                  label: "X'=P@X · M'=P@M@Pᵀ",
                },
                {
                  value: "permute-input-keep-causal",
                  label: "X'=P@X · M'=causal(T)",
                },
                {
                  value: "permute-visibility-only",
                  label: "X'=X · M'=P@M@Pᵀ",
                },
              ]}
              onChange={(value) => {
                setCausalPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!causalPrediction || !causalPolicy}
              onClick={runTransfer}
            >
              {t(
                "두 causal relabel fixture 실행",
                "Run both causal relabel fixtures",
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

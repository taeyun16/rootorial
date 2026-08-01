import { useMemo, useRef, useState } from "react";
import {
  aggregateOccurrenceGradients,
  embeddingsPracticeChallenges,
  lookupSecondFixture,
  lookupVisibleFixture,
  runAddressedLookup,
  runUnknownTokenPath,
  scatterSecondFixture,
  scatterVisibleFixture,
  unknownSecondFixture,
  unknownVisibleFixture,
  type EmbeddingsPracticeChallengeId,
  type LookupPolicy,
  type LookupPrediction,
  type ScatterPolicy,
  type ScatterPrediction,
  type UnknownPolicy,
  type UnknownPrediction,
} from "../../features/embeddings/embeddings-practice";
import { lookupEmbeddings } from "../../features/embeddings/embedding-model";
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
  EmbeddingsPracticeChallengeId,
  PracticeAttempt<EmbeddingsPracticeChallengeId>
>>;

function formatNumber(value: number) {
  const normalized = Math.abs(value) < 0.00005 ? 0 : value;
  return normalized.toFixed(3);
}

function vectorText(vector: readonly number[]) {
  return `[${vector.map(formatNumber).join(", ")}]`;
}

function rowsText(rows: readonly (readonly number[])[]) {
  return rows.map(vectorText).join(" · ");
}

function idsText(ids: readonly number[]) {
  return `[${ids.join(", ")}]`;
}

function rowsEqual(
  left: readonly (readonly number[])[],
  right: readonly (readonly number[])[],
) {
  return left.length === right.length
    && left.every((row, rowIndex) =>
      row.length === right[rowIndex].length
      && row.every((value, columnIndex) =>
        Math.abs(value - right[rowIndex][columnIndex]) <= 1e-10
      )
    );
}

export function EmbeddingsPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<EmbeddingsPracticeChallengeId>("reproduce-addressed-lookup");
  const [attempts, setAttempts] = useState<Attempts>({});
  const [lookupPrediction, setLookupPrediction] =
    useState<LookupPrediction | "">("");
  const [lookupPolicy, setLookupPolicy] =
    useState<LookupPolicy | "">("");
  const [scatterPrediction, setScatterPrediction] =
    useState<ScatterPrediction | "">("");
  const [scatterPolicy, setScatterPolicy] =
    useState<ScatterPolicy | "">("");
  const [unknownPrediction, setUnknownPrediction] =
    useState<UnknownPrediction | "">("");
  const [unknownPolicy, setUnknownPolicy] =
    useState<UnknownPolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => embeddingsPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-addressed-lookup": {
          skillId: t("재현", "reproduce"),
          label: "E[ids]",
          title: t(
            "새 token ID에서 direct lookup을 재현하세요",
            "Reproduce direct lookup on fresh token IDs",
          ),
          summary: t(
            "ID와 sequence 길이가 바뀌어도 token 위치마다 output row 하나를 유지합니다.",
            "Keep one output row per token position while changing both IDs and sequence length.",
          ),
        },
        "diagnose-scatter-cancellation": {
          skillId: t("진단", "diagnose"),
          label: "scatter-add",
          title: t(
            "부분 또는 완전 상쇄되는 반복 token gradient를 진단하세요",
            "Diagnose repeated-token gradients that partially or fully cancel",
          ),
          summary: t(
            "참조된 row가 실제로 바뀌는지 판단하기 전에 모든 occurrence를 누적합니다.",
            "Accumulate every occurrence before deciding whether a referenced row changes.",
          ),
        },
        "transfer-unknown-collision": {
          skillId: t("전이", "transfer"),
          label: t("[UNK] 충돌", "[UNK] collision"),
          title: t(
            "lookup 규칙을 처음 보는 단어로 전이하세요",
            "Transfer lookup rules to unseen words",
          ),
          summary: t(
            "서로 다른 unseen word가 한 unknown row를 공유해도 token 위치는 보존합니다.",
            "Preserve token positions while observing that distinct unseen words may share one unknown row.",
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
    challengeId: EmbeddingsPracticeChallengeId,
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

  const invalidate = (challengeId: EmbeddingsPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runReproduce = () => {
    if (!lookupPrediction || !lookupPolicy) return;
    const expectedVisible = lookupEmbeddings(lookupVisibleFixture.ids);
    const expectedSecond = lookupEmbeddings(lookupSecondFixture.ids);
    const visible = runAddressedLookup(lookupVisibleFixture, lookupPolicy);
    const second = runAddressedLookup(lookupSecondFixture, lookupPolicy);
    updateAttempt("reproduce-addressed-lookup", [
      {
        id: "lookup-shape",
        label: t(
          "lookup output shape 예측",
          "Predict the lookup output shape",
        ),
        passed: lookupPrediction === "positions-by-dimension",
        expected: t("token 위치 × D", "token positions × D"),
        actual: {
          "positions-by-dimension": t("token 위치 × D", "token positions × D"),
          "vocabulary-by-dimension": "V × D",
          "single-vector": t("문장당 vector 하나", "one vector per sentence"),
        }[lookupPrediction],
        explanation: t(
          "각 ID는 vocab 전체가 아니라 E의 row 하나를 읽으므로 T개 위치는 [T,D]가 됩니다.",
          "Each ID reads one row of E rather than the whole vocabulary, so T positions produce [T,D].",
        ),
      },
      {
        id: "visible-lookup",
        label: t("공개 IDs [9,10]", "Visible IDs [9,10]"),
        passed:
          lookupPolicy === "direct-row"
          && rowsEqual(visible.rows, expectedVisible),
        expected: rowsText(expectedVisible),
        actual: `${idsText(visible.shape)} · ${rowsText(visible.rows)}`,
        explanation: t(
          "각 위치의 ID가 가리키는 E row를 순서와 좌표를 바꾸지 않고 그대로 반환합니다.",
          "Each position returns the E row addressed by its ID without changing order or coordinates.",
        ),
      },
      {
        id: "second-lookup",
        label: t("두 번째 IDs [4,7,8]", "Second IDs [4,7,8]"),
        passed:
          lookupPolicy === "direct-row"
          && rowsEqual(second.rows, expectedSecond),
        expected: rowsText(expectedSecond),
        actual: `${idsText(second.shape)} · ${rowsText(second.rows)}`,
        explanation: t(
          "sequence 길이와 ID가 모두 바뀌어도 같은 direct-row 계약이 세 위치에 적용됩니다.",
          "The same direct-row contract applies to three positions when both sequence length and IDs change.",
        ),
      },
    ]);
  };

  const runDiagnose = () => {
    if (!scatterPrediction || !scatterPolicy) return;
    const expectedVisible = aggregateOccurrenceGradients(
      scatterVisibleFixture,
      "sum-occurrences",
    );
    const expectedSecond = aggregateOccurrenceGradients(
      scatterSecondFixture,
      "sum-occurrences",
    );
    const visible = aggregateOccurrenceGradients(
      scatterVisibleFixture,
      scatterPolicy,
    );
    const second = aggregateOccurrenceGradients(
      scatterSecondFixture,
      scatterPolicy,
    );
    updateAttempt("diagnose-scatter-cancellation", [
      {
        id: "scatter-prediction",
        label: t(
          "두 repeated row의 net gradient 예측",
          "Predict the net gradient of both repeated rows",
        ),
        passed: scatterPrediction === "partial-then-zero",
        expected: t(
          "첫 row는 부분 상쇄 · 둘째 row는 0",
          "first row partially cancels · second row is zero",
        ),
        actual: {
          "partial-then-zero": t(
            "부분 상쇄 · 완전 상쇄",
            "partial cancellation · full cancellation",
          ),
          "both-double": t("둘 다 첫 기여의 2배", "both double the first contribution"),
          "last-only": t("둘 다 마지막 기여만", "both keep only the final contribution"),
        }[scatterPrediction],
        explanation: t(
          "반복 횟수만으로 방향을 알 수 없습니다. occurrence별 vector를 더한 뒤에야 net gradient를 판단합니다.",
          "A repeat count does not determine direction. Net gradient is known only after adding every occurrence vector.",
        ),
      },
      {
        id: "visible-scatter",
        label: t("공개 row 7 · 두 기여", "Visible row 7 · two contributions"),
        passed:
          scatterPolicy === "sum-occurrences"
          && rowsEqual([visible.repeatedGradient], [expectedVisible.repeatedGradient]),
        expected:
          `${expectedVisible.repeatedContributionCount} paths → ${vectorText(expectedVisible.repeatedGradient)}`,
        actual:
          `${visible.repeatedContributionCount} paths → ${vectorText(visible.repeatedGradient)}`,
        explanation: t(
          "[0.3,-0.1]+[-0.1,0.2]는 첫 기여를 두 배로 만들지 않고 [0.2,0.1]로 부분 상쇄됩니다.",
          "[0.3,-0.1]+[-0.1,0.2] partially cancels to [0.2,0.1] rather than doubling the first contribution.",
        ),
      },
      {
        id: "second-scatter",
        label: t("두 번째 row 4 · 두 기여", "Second row 4 · two contributions"),
        passed:
          scatterPolicy === "sum-occurrences"
          && rowsEqual([second.repeatedGradient], [expectedSecond.repeatedGradient]),
        expected:
          `${expectedSecond.repeatedContributionCount} paths → ${vectorText(expectedSecond.repeatedGradient)}`,
        actual:
          `${second.repeatedContributionCount} paths → ${vectorText(second.repeatedGradient)}`,
        explanation: t(
          "row 4는 forward에서 두 번 참조됐지만 반대 기여가 완전히 상쇄되어 net data gradient가 [0,0]입니다.",
          "Row 4 was referenced twice in forward, but opposing contributions fully cancel to a net data gradient of [0,0].",
        ),
      },
    ]);
  };

  const runTransfer = () => {
    if (!unknownPrediction || !unknownPolicy) return;
    const expectedVisible = runUnknownTokenPath(
      unknownVisibleFixture,
      "keep-unknown-id",
    );
    const expectedSecond = runUnknownTokenPath(
      unknownSecondFixture,
      "keep-unknown-id",
    );
    const visible = runUnknownTokenPath(unknownVisibleFixture, unknownPolicy);
    const second = runUnknownTokenPath(unknownSecondFixture, unknownPolicy);
    updateAttempt("transfer-unknown-collision", [
      {
        id: "unknown-prediction",
        label: t(
          "서로 다른 unseen word의 row 예측",
          "Predict rows for distinct unseen words",
        ),
        passed: unknownPrediction === "shared-unknown-row",
        expected: t("같은 [UNK] row를 위치마다 유지", "keep the same [UNK] row at each position"),
        actual: {
          "shared-unknown-row": t("같은 [UNK] row 공유", "share the same [UNK] row"),
          "separate-unknown-rows": t("철자마다 새 row", "a new row for each spelling"),
          "drop-unknown-words": t("unknown 위치 삭제", "drop unknown positions"),
        }[unknownPrediction],
        explanation: t(
          "whole-word vocab에 없는 철자는 모두 ID 1로 매핑됩니다. 같은 vector라도 두 token 위치는 사라지지 않습니다.",
          "Spellings absent from the whole-word vocabulary all map to ID 1. The two token positions remain even though their vectors match.",
        ),
      },
      {
        id: "visible-unknown",
        label: t('"river glows" 전이', 'Transfer "river glows"'),
        passed:
          unknownPolicy === "keep-unknown-id"
          && visible.ids.join(",") === expectedVisible.ids.join(",")
          && rowsEqual(visible.rows, expectedVisible.rows),
        expected: `IDs ${idsText(expectedVisible.ids)} · ${rowsText(expectedVisible.rows)}`,
        actual: `IDs ${idsText(visible.ids)} · ${rowsText(visible.rows)}`,
        explanation: t(
          "두 단어가 모두 unseen이므로 [UNK] row가 두 위치에 각각 lookup됩니다.",
          "Both words are unseen, so the [UNK] row is looked up at both positions.",
        ),
      },
      {
        id: "second-unknown",
        label: t('"cat comet" 전이', 'Transfer "cat comet"'),
        passed:
          unknownPolicy === "keep-unknown-id"
          && second.ids.join(",") === expectedSecond.ids.join(",")
          && rowsEqual(second.rows, expectedSecond.rows),
        expected: `IDs ${idsText(expectedSecond.ids)} · ${rowsText(expectedSecond.rows)}`,
        actual: `IDs ${idsText(second.ids)} · ${rowsText(second.rows)}`,
        explanation: t(
          "known cat은 row 2를 유지하고 unseen comet만 공용 [UNK] row 1로 이동합니다.",
          "Known cat keeps row 2 while only unseen comet maps to the shared [UNK] row 1.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-addressed-lookup") {
      setLookupPrediction("");
      setLookupPolicy("");
    } else if (activeId === "diagnose-scatter-cancellation") {
      setScatterPrediction("");
      setScatterPolicy("");
    } else {
      setUnknownPrediction("");
      setUnknownPolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setLookupPrediction("");
    setLookupPolicy("");
    setScatterPrediction("");
    setScatterPolicy("");
    setUnknownPrediction("");
    setUnknownPolicy("");
    setActiveId("reproduce-addressed-lookup");
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
      className="embeddings-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "새 token에서도 lookup과 gradient 경계를 다시 만들 수 있나요?",
          "Can you rebuild lookup and gradient boundaries on fresh tokens?",
        ),
        description: t(
          "필수 embedding lab과 다른 ID·occurrence gradient·unseen word로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer with IDs, occurrence gradients, and unseen words outside the required embedding lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "embedding 독립 연습 문제",
          "Embedding independent practice challenges",
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
          "direct lookup·scatter-add 상쇄·[UNK] 전이 증거를 모두 만들었습니다.",
          "You produced direct-lookup, scatter-add cancellation, and [UNK] transfer evidence.",
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
      {activeId === "reproduce-addressed-lookup" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 lookup fixture", "Fixed lookup fixtures")}
          >
            <span>{t("고정 lookup fixture", "FIXED LOOKUP FIXTURES")}</span>
            <pre><code>{`rows = learnerLookup(E, ids)

visible: ids=[9,10]
second:  ids=[4,7,8]
E shape: [11,2]`}</code></pre>
            <p>{t(
              "embedding table과 token 순서는 고정됩니다.",
              "The embedding table and token order stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("lookup output shape 예측", "Predict the lookup output shape")}
              value={lookupPrediction}
              options={[
                { value: "positions-by-dimension", label: t("token 위치 × D", "token positions × D") },
                { value: "vocabulary-by-dimension", label: "V × D" },
                { value: "single-vector", label: t("문장당 vector 하나", "one vector per sentence") },
              ]}
              onChange={(value) => {
                setLookupPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerLookup"
              value={lookupPolicy}
              options={[
                { value: "direct-row", label: "rows[t] = E[ids[t]]" },
                { value: "first-row-for-all", label: "rows[t] = E[ids[0]]" },
                { value: "mean-then-repeat", label: "rows[t] = mean(E[ids])" },
              ]}
              onChange={(value) => {
                setLookupPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!lookupPrediction || !lookupPolicy}
              onClick={runReproduce}
            >
              {t("두 lookup fixture 실행", "Run both lookup fixtures")}
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
      ) : activeId === "diagnose-scatter-cancellation" ? (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 occurrence gradient", "Fixed occurrence gradients")}
          >
            <span>{t("고정 occurrence gradient", "FIXED OCCURRENCE GRADIENTS")}</span>
            <pre><code>{`gradE = learnerScatterAdd(ids, upstream)

visible row 7:
[0.3,-0.1] + [-0.1,0.2]

second row 4:
[0.25,-0.3] + [-0.25,0.3]`}</code></pre>
            <p>{t(
              "weight decay 없이 data-gradient만 계산합니다.",
              "Only the data gradient is computed; weight decay is excluded.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("진단 영역", "DIAGNOSIS REGION")}</strong>
            <DirectChoice
              label={t(
                "두 repeated row의 net gradient 예측",
                "Predict the net gradient of both repeated rows",
              )}
              value={scatterPrediction}
              options={[
                { value: "partial-then-zero", label: t("부분 상쇄 · 완전 상쇄", "partial cancellation · full cancellation") },
                { value: "both-double", label: t("둘 다 첫 기여의 2배", "both double the first contribution") },
                { value: "last-only", label: t("둘 다 마지막 기여만", "both keep only the final contribution") },
              ]}
              onChange={(value) => {
                setScatterPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerScatterAdd"
              value={scatterPolicy}
              options={[
                { value: "sum-occurrences", label: "sum every occurrence" },
                { value: "first-occurrence-only", label: "dedupe then keep first" },
                { value: "overwrite-with-last", label: "overwrite with last" },
              ]}
              onChange={(value) => {
                setScatterPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!scatterPrediction || !scatterPolicy}
              onClick={runDiagnose}
            >
              {t("두 scatter-add 계약 실행", "Run both scatter-add contracts")}
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
      ) : (
        <div className="practice-workspace">
          <div
            className="practice-support-code"
            aria-label={t("고정 unseen-word fixture", "Fixed unseen-word fixtures")}
          >
            <span>{t("고정 unseen-word fixture", "FIXED UNSEEN-WORD FIXTURES")}</span>
            <pre><code>{`pieces = wholeWordTokenizer(text)
ids = learnerUnknownPath(pieces)
rows = E[ids]

visible: "river glows"
second:  "cat comet"`}</code></pre>
            <p>{t(
              "whole-word vocab과 [UNK]=1 계약은 고정됩니다.",
              "The whole-word vocabulary and [UNK]=1 contract stay fixed.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("전이 영역", "TRANSFER REGION")}</strong>
            <DirectChoice
              label={t(
                "서로 다른 unseen word의 row 예측",
                "Predict rows for distinct unseen words",
              )}
              value={unknownPrediction}
              options={[
                { value: "shared-unknown-row", label: t("같은 [UNK] row 공유", "share the same [UNK] row") },
                { value: "separate-unknown-rows", label: t("철자마다 새 row", "a new row for each spelling") },
                { value: "drop-unknown-words", label: t("unknown 위치 삭제", "drop unknown positions") },
              ]}
              onChange={(value) => {
                setUnknownPrediction(value);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerUnknownPath"
              value={unknownPolicy}
              options={[
                { value: "keep-unknown-id", label: "tokenize → keep [UNK] ID → E[id]" },
                { value: "invent-spelling-row", label: "invent row from spelling" },
                { value: "drop-unknown-id", label: "drop every [UNK] ID" },
              ]}
              onChange={(value) => {
                setUnknownPolicy(value);
                invalidate(activeId);
              }}
            />
          </div>
          <div className="practice-actions">
            <button
              type="button"
              className="button button-primary"
              disabled={!unknownPrediction || !unknownPolicy}
              onClick={runTransfer}
            >
              {t("두 unseen-word 전이 실행", "Run both unseen-word transfers")}
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
      )}
    </PracticeDeck>
  );
}

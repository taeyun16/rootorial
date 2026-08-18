import { useMemo, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  causalPrefixSecondFixture,
  causalPrefixVisibleFixture,
  kvCacheSecondFixture,
  kvCacheVisibleFixture,
  maximumMatrixError,
  miniTransformerPracticeChallenges,
  rowBoundarySecondFixture,
  rowBoundaryVisibleFixture,
  runCausalPrefixPolicy,
  runKvCachePolicy,
  runRowBoundaryPolicy,
  type CausalPrefixPolicy,
  type CausalPrefixPrediction,
  type KvCachePolicy,
  type KvCachePrediction,
  type MiniTransformerPracticeChallengeId,
  type RowBoundaryPolicy,
  type RowBoundaryPrediction,
} from "../../features/mini-transformer/mini-transformer-practice";
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
  MiniTransformerPracticeChallengeId,
  PracticeAttempt<MiniTransformerPracticeChallengeId>
>>;

function format(value: number) {
  const normalized = Math.abs(value) < 0.0000005 ? 0 : value;
  return normalized.toFixed(6);
}

function rowText(values: readonly number[]) {
  return `[${values.map(format).join(", ")}]`;
}

export function MiniTransformerPracticeDeck() {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [activeId, setActiveId] =
    useState<MiniTransformerPracticeChallengeId>(
      "reproduce-causal-prefix",
    );
  const [attempts, setAttempts] = useState<Attempts>({});
  const [prefixPrediction, setPrefixPrediction] =
    useState<CausalPrefixPrediction | "">("");
  const [prefixPolicy, setPrefixPolicy] =
    useState<CausalPrefixPolicy | "">("");
  const [rowPrediction, setRowPrediction] =
    useState<RowBoundaryPrediction | "">("");
  const [rowPolicy, setRowPolicy] =
    useState<RowBoundaryPolicy | "">("");
  const [cachePrediction, setCachePrediction] =
    useState<KvCachePrediction | "">("");
  const [cachePolicy, setCachePolicy] =
    useState<KvCachePolicy | "">("");
  const firstControlRef = useRef<HTMLDivElement>(null);

  const challenges = useMemo(
    () => miniTransformerPracticeChallenges.map((challenge) => {
      const localized = {
        "reproduce-causal-prefix": {
          skillId: t("재현", "reproduce"),
          title: t(
            "새 token ID에서 causal prefix 일관성을 재현하세요",
            "Reproduce causal prefix consistency on fresh token IDs",
          ),
          summary: t(
            "suffix를 붙인 뒤에도 이미 계산한 모든 prefix logit row가 같아야 합니다.",
            "Append a suffix and keep every already-computed prefix logit row unchanged.",
          ),
        },
        "diagnose-train-generate-rows": {
          skillId: t("진단", "diagnose"),
          title: t(
            "training과 generation이 읽는 row를 구분하세요",
            "Diagnose the rows read by training and generation",
          ),
          summary: t(
            "training loss는 모든 shifted row를 쓰고, generation은 현재 prefix의 마지막 row만 읽습니다.",
            "Training loss uses every shifted row; generation reads only the current prefix's final row.",
          ),
        },
        "transfer-kv-cache": {
          skillId: t("전이", "transfer"),
          title: t(
            "full-prefix attention을 incremental KV cache로 전이하세요",
            "Transfer full-prefix attention into an incremental KV cache",
          ),
          summary: t(
            "과거 key와 value를 함께 누적해 마지막 token context가 full recompute와 같음을 증명합니다.",
            "Accumulate past keys and values together so each last-token context matches full recomputation.",
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
    challengeId: MiniTransformerPracticeChallengeId,
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

  const invalidate = (challengeId: MiniTransformerPracticeChallengeId) => {
    setAttempts((current) => {
      if (!current[challengeId]) return current;
      const next = { ...current };
      delete next[challengeId];
      return next;
    });
  };

  const runPrefix = () => {
    if (!prefixPrediction || !prefixPolicy) return;
    const visible = runCausalPrefixPolicy(
      causalPrefixVisibleFixture,
      prefixPolicy,
    );
    const second = runCausalPrefixPolicy(
      causalPrefixSecondFixture,
      prefixPolicy,
    );
    const visibleError = maximumMatrixError(
      visible.actual,
      visible.expected,
    );
    const secondError = maximumMatrixError(
      second.actual,
      second.expected,
    );
    updateAttempt("reproduce-causal-prefix", [
      {
        id: "prefix-prediction",
        label: t(
          "causal suffix 결과 예측",
          "Predict the causal suffix result",
        ),
        passed:
          prefixPrediction === "suffix-cannot-change-prefix-rows",
        expected: t(
          "기존 prefix logit row는 모두 동일",
          "every prior prefix logit row stays fixed",
        ),
        actual: {
          "suffix-cannot-change-prefix-rows": t(
            "기존 prefix logit row는 모두 동일",
            "every prior prefix logit row stays fixed",
          ),
          "suffix-rewrites-every-row": t(
            "suffix가 모든 기존 row를 다시 씀",
            "the suffix rewrites every prior row",
          ),
          "only-first-row-stays-fixed": t(
            "첫 row만 동일",
            "only the first row stays fixed",
          ),
        }[prefixPrediction],
        explanation: t(
          "causal mask 아래의 row t는 t 이후 token을 읽을 수 없습니다.",
          "Under a causal mask, row t cannot read any token after t.",
        ),
      },
      {
        id: "visible-prefix",
        label: t(
          "공개 [BOS,the,cat] + [sat,.]",
          "Visible [BOS,the,cat] + [sat,.]",
        ),
        passed:
          prefixPolicy === "compare-matching-prefix-rows"
          && visibleError <= 1e-9,
        expected: "max prefix-logit error=0.000000",
        actual:
          `max prefix-logit error=${format(visibleError)} · last prefix row=${rowText(visible.actual.at(-1) ?? [])}`,
        explanation: t(
          "긴 sequence의 앞쪽 같은 위치 row와 짧은 prefix의 row를 일대일로 비교해야 합니다.",
          "Compare each short-prefix row with the same position in the longer sequence.",
        ),
      },
      {
        id: "second-prefix",
        label: t(
          "두 번째 [BOS,mat,the] + [cat,.]",
          "Second [BOS,mat,the] + [cat,.]",
        ),
        passed:
          prefixPolicy === "compare-matching-prefix-rows"
          && secondError <= 1e-9,
        expected: "max prefix-logit error=0.000000",
        actual:
          `max prefix-logit error=${format(secondError)} · last prefix row=${rowText(second.actual.at(-1) ?? [])}`,
        explanation: t(
          "token 값이 달라도 동일 위치의 causal-prefix 계약은 유지되어야 합니다.",
          "Changing token values must preserve the same-position causal-prefix contract.",
        ),
      },
    ]);
  };

  const runRows = () => {
    if (!rowPrediction || !rowPolicy) return;
    const visible = runRowBoundaryPolicy(
      rowBoundaryVisibleFixture,
      rowPolicy,
    );
    const second = runRowBoundaryPolicy(
      rowBoundarySecondFixture,
      rowPolicy,
    );
    const visibleLossError = Math.abs(
      visible.actualLoss - visible.expectedLoss,
    );
    const secondLossError = Math.abs(
      second.actualLoss - second.expectedLoss,
    );
    updateAttempt("diagnose-train-generate-rows", [
      {
        id: "row-prediction",
        label: t(
          "training·generation row 경계 예측",
          "Predict the training and generation row boundary",
        ),
        passed:
          rowPrediction === "train-all-rows-generate-last-row",
        expected: t(
          "training=모든 shifted row · generation=마지막 row",
          "training=all shifted rows · generation=last row",
        ),
        actual: {
          "train-all-rows-generate-last-row": t(
            "training=모든 shifted row · generation=마지막 row",
            "training=all shifted rows · generation=last row",
          ),
          "train-last-row-generate-last-row": t(
            "training과 generation 모두 마지막 row",
            "training and generation both use the last row",
          ),
          "train-all-rows-generate-average-row": t(
            "training=모든 row · generation=평균 row",
            "training=all rows · generation=average row",
          ),
        }[rowPrediction],
        explanation: t(
          "teacher forcing의 병렬 loss와 한 token씩 생성하는 controller는 같은 logits에서 서로 다른 row를 읽습니다.",
          "Parallel teacher-forced loss and the one-token generation controller read different rows from the same logits.",
        ),
      },
      {
        id: "visible-row-boundary",
        label: t(
          "공개 T=3·V=4 logits",
          "Visible T=3, V=4 logits",
        ),
        passed:
          rowPolicy === "separate-training-and-generation"
          && visibleLossError <= 1e-9
          && visible.actualTokenId === visible.expectedTokenId,
        expected:
          `loss error=0.000000 · next token=${visible.expectedTokenId}`,
        actual:
          `loss error=${format(visibleLossError)} · next token=${visible.actualTokenId}`,
        explanation: t(
          "각 target은 자신의 row 확률을 읽고, decode token만 마지막 row argmax에서 나옵니다.",
          "Each target reads its own row probability; only the decode token comes from the final-row argmax.",
        ),
      },
      {
        id: "second-row-boundary",
        label: t(
          "두 번째 T=4·V=3 logits",
          "Second T=4, V=3 logits",
        ),
        passed:
          rowPolicy === "separate-training-and-generation"
          && secondLossError <= 1e-9
          && second.actualTokenId === second.expectedTokenId,
        expected:
          `loss error=0.000000 · next token=${second.expectedTokenId}`,
        actual:
          `loss error=${format(secondLossError)} · next token=${second.actualTokenId}`,
        explanation: t(
          "T와 V가 바뀌어도 training row 축과 generation readout 경계는 바뀌지 않습니다.",
          "Changing T and V does not change the training-row axis or generation readout boundary.",
        ),
      },
    ]);
  };

  const runCache = () => {
    if (!cachePrediction || !cachePolicy) return;
    const visible = runKvCachePolicy(
      kvCacheVisibleFixture,
      cachePolicy,
    );
    const second = runKvCachePolicy(
      kvCacheSecondFixture,
      cachePolicy,
    );
    const visibleError = maximumMatrixError(
      visible.actual,
      visible.expected,
    );
    const secondError = maximumMatrixError(
      second.actual,
      second.expected,
    );
    updateAttempt("transfer-kv-cache", [
      {
        id: "cache-prediction",
        label: t(
          "KV cache 의미 예측",
          "Predict KV-cache semantics",
        ),
        passed:
          cachePrediction === "cache-kv-preserves-context",
        expected: t(
          "과거 K/V를 함께 보존하면 context가 동일",
          "preserving past K and V keeps contexts identical",
        ),
        actual: {
          "cache-kv-preserves-context": t(
            "과거 K/V를 함께 보존하면 context가 동일",
            "preserving past K and V keeps contexts identical",
          ),
          "cache-values-with-current-key-is-enough": t(
            "V만 누적하고 현재 K를 재사용해도 충분",
            "accumulating V with the current K is enough",
          ),
          "newest-kv-replaces-history": t(
            "최신 K/V가 과거 cache를 대체",
            "the newest K/V replaces cache history",
          ),
        }[cachePrediction],
        explanation: t(
          "cache는 attention의 과거 key/value 관계를 보존하며 결과 의미를 바꾸는 근사가 아닙니다.",
          "A cache preserves past key/value attention relations; it is not an approximation that changes semantics.",
        ),
      },
      {
        id: "visible-cache",
        label: t(
          "공개 T=3 incremental cache",
          "Visible T=3 incremental cache",
        ),
        passed:
          cachePolicy === "append-keys-and-values"
          && visibleError <= 1e-9,
        expected:
          `max context error=0.000000 · last=${rowText(visible.expected.at(-1) ?? [])}`,
        actual:
          `max context error=${format(visibleError)} · last=${rowText(visible.actual.at(-1) ?? [])}`,
        explanation: t(
          "각 step의 현재 query는 cache에 누적된 모든 과거·현재 K/V를 같은 위치로 읽습니다.",
          "At each step, the current query reads every cached past-and-current K/V at matching positions.",
        ),
      },
      {
        id: "second-cache",
        label: t(
          "두 번째 T=4 incremental cache",
          "Second T=4 incremental cache",
        ),
        passed:
          cachePolicy === "append-keys-and-values"
          && secondError <= 1e-9,
        expected:
          `max context error=0.000000 · last=${rowText(second.expected.at(-1) ?? [])}`,
        actual:
          `max context error=${format(secondError)} · last=${rowText(second.actual.at(-1) ?? [])}`,
        explanation: t(
          "길이와 값이 달라도 full causal recompute와 incremental cache의 마지막 context가 같아야 합니다.",
          "A different length and values must still produce the same contexts under full recomputation and incremental caching.",
        ),
      },
    ]);
  };

  const resetCurrent = () => {
    invalidate(activeId);
    if (activeId === "reproduce-causal-prefix") {
      setPrefixPrediction("");
      setPrefixPolicy("");
    } else if (activeId === "diagnose-train-generate-rows") {
      setRowPrediction("");
      setRowPolicy("");
    } else {
      setCachePrediction("");
      setCachePolicy("");
    }
    requestAnimationFrame(() =>
      firstControlRef.current?.querySelector<HTMLElement>("button")?.focus()
    );
  };

  const resetAll = () => {
    setAttempts({});
    setPrefixPrediction("");
    setPrefixPolicy("");
    setRowPrediction("");
    setRowPolicy("");
    setCachePrediction("");
    setCachePolicy("");
    setActiveId("reproduce-causal-prefix");
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
      className="mini-transformer-practice-deck"
      copy={{
        kicker: t(
          "선택 연습 · 독립 수행",
          "OPTIONAL PRACTICE · INDEPENDENT PERFORMANCE",
        ),
        title: t(
          "guided lab 밖에서도 Mini Transformer state flow를 보존할 수 있나요?",
          "Can you preserve Mini Transformer state flow outside the guided lab?",
        ),
        description: t(
          "필수 one-block·loss·generation lab과 다른 prefix·row·cache fixture로 재현·진단·전이를 증명합니다. 완료 진도와는 분리됩니다.",
          "Prove reproduction, diagnosis, and transfer on fresh prefix, row, and cache fixtures outside the required one-block, loss, and generation lab. This stays separate from chapter completion.",
        ),
        challengeNavigation: t(
          "Mini Transformer 독립 연습 문제",
          "Mini Transformer independent practice challenges",
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
          "causal prefix·row readout·KV cache 동등성 증거를 모두 만들었습니다.",
          "You produced causal-prefix, row-readout, and KV-cache-equivalence evidence.",
        ),
        incomplete: t(
          "원하는 문제만 풀어도 됩니다. 결과는 각 조작 바로 아래에 나타납니다.",
          "Complete any challenge you want. Results appear directly below the relevant controls.",
        ),
        nextIncomplete: t("다음 미완료 문제", "Next incomplete challenge"),
        resetAll: t("세 문제 모두 초기화", "Reset all three challenges"),
      }}
    >
      {activeId === "reproduce-causal-prefix" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 causal-prefix fixture", "Fixed causal-prefix fixtures")}>
            <span>{t("고정 causal-prefix fixture", "FIXED CAUSAL-PREFIX FIXTURES")}</span>
            <pre><code>{`short = forward(prefix).logits
long  = forward(prefix + suffix).logits

learnerPrefixRead(short, long)
visible and second: fresh token IDs`}</code></pre>
            <p>{t(
              "token IDs, position, block, final LN, LM head는 고정되고 비교할 row 경계만 선택합니다.",
              "Token IDs, position, block, final LN, and LM head stay fixed; only the row-read boundary is learner-owned.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("causal suffix 결과 예측", "Predict the causal suffix result")}
              value={prefixPrediction}
              options={[
                { value: "suffix-cannot-change-prefix-rows", label: t("기존 prefix row는 모두 동일", "every prior prefix row stays fixed") },
                { value: "suffix-rewrites-every-row", label: t("suffix가 모든 row를 변경", "the suffix changes every row") },
                { value: "only-first-row-stays-fixed", label: t("첫 row만 동일", "only the first row stays fixed") },
              ]}
              onChange={(value) => {
                setPrefixPrediction(value as CausalPrefixPrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerPrefixRead"
              value={prefixPolicy}
              options={[
                { value: "compare-matching-prefix-rows", label: "short[t] ↔ long[t]" },
                { value: "reuse-full-last-row", label: "short[t] ↔ long[-1]" },
                { value: "offset-prefix-rows", label: "short[t] ↔ long[t+1]" },
              ]}
              onChange={(value) => {
                setPrefixPolicy(value as CausalPrefixPolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button type="button" className="button button-primary" disabled={!prefixPrediction || !prefixPolicy} onClick={runPrefix}>
                {t("두 causal prefix fixture 실행", "Run both causal-prefix fixtures")}
              </button>
              <button type="button" className="button button-secondary" onClick={resetCurrent}>
                {t("현재 문제 초기화", "Reset current challenge")}
              </button>
            </div>
          </div>
          <PracticeResultChecks attempt={attempts[activeId]} labels={resultLabels} />
        </div>
      ) : activeId === "diagnose-train-generate-rows" ? (
        <div className="practice-workspace">
          <div className="practice-support-code" aria-label={t("고정 row-read fixture", "Fixed row-read fixtures")}>
            <span>{t("고정 row-read fixture", "FIXED ROW-READ FIXTURES")}</span>
            <pre><code>{`logits: [T, V]
loss = CE(logits[t], shifted_target[t])
next = argmax(logits[last])

learnerRowBoundary(logits, targets)`}</code></pre>
            <p>{t(
              "logits와 shifted target은 고정되고 training/generation이 읽는 row만 선택합니다.",
              "Logits and shifted targets stay fixed; only training and generation row reads are learner-owned.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("training·generation row 경계 예측", "Predict the training and generation row boundary")}
              value={rowPrediction}
              options={[
                { value: "train-all-rows-generate-last-row", label: t("training=모든 row · generation=마지막 row", "training=all rows · generation=last row") },
                { value: "train-last-row-generate-last-row", label: t("둘 다 마지막 row", "both use the last row") },
                { value: "train-all-rows-generate-average-row", label: t("generation=평균 row", "generation=average row") },
              ]}
              onChange={(value) => {
                setRowPrediction(value as RowBoundaryPrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerRowBoundary"
              value={rowPolicy}
              options={[
                { value: "separate-training-and-generation", label: "CE(all rows) · argmax(last row)" },
                { value: "last-row-for-both", label: "CE(last row repeated) · argmax(last row)" },
                { value: "average-row-for-generation", label: "CE(all rows) · argmax(mean rows)" },
              ]}
              onChange={(value) => {
                setRowPolicy(value as RowBoundaryPolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button type="button" className="button button-primary" disabled={!rowPrediction || !rowPolicy} onClick={runRows}>
                {t("두 row-read fixture 실행", "Run both row-read fixtures")}
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
          <div className="practice-support-code" aria-label={t("고정 KV-cache fixture", "Fixed KV-cache fixtures")}>
            <span>{t("고정 KV-cache fixture", "FIXED KV-CACHE FIXTURES")}</span>
            <pre><code>{`for each new token t:
  q_t, k_t, v_t = fixed projections
  learnerKvCache.append(k_t, v_t)
  context_t = attention(q_t, cached_K, cached_V)

compare with full causal recompute`}</code></pre>
            <p>{t(
              "Q/K/V와 scaled attention은 고정되고 cache 보존 정책만 선택합니다.",
              "Q/K/V and scaled attention stay fixed; only the cache-retention policy is learner-owned.",
            )}</p>
          </div>
          <div className="practice-learner-controls" ref={firstControlRef}>
            <strong>{t("학습자 편집 영역", "LEARNER-OWNED REGION")}</strong>
            <DirectChoice
              label={t("KV cache 의미 예측", "Predict KV-cache semantics")}
              value={cachePrediction}
              options={[
                { value: "cache-kv-preserves-context", label: t("과거 K/V를 함께 보존하면 동일", "preserve past K/V together") },
                { value: "cache-values-with-current-key-is-enough", label: t("V만 누적해도 동일", "accumulating only V is enough") },
                { value: "newest-kv-replaces-history", label: t("최신 K/V가 과거를 대체", "newest K/V replaces history") },
              ]}
              onChange={(value) => {
                setCachePrediction(value as KvCachePrediction);
                invalidate(activeId);
              }}
            />
            <DirectChoice
              label="learnerKvCache"
              value={cachePolicy}
              options={[
                { value: "append-keys-and-values", label: "append(K_t) · append(V_t)" },
                { value: "append-values-current-key", label: "repeat(K_t) · append(V_t)" },
                { value: "drop-past-cache", label: "K=[K_t] · V=[V_t]" },
              ]}
              onChange={(value) => {
                setCachePolicy(value as KvCachePolicy);
                invalidate(activeId);
              }}
            />
            <div className="practice-run-actions">
              <button type="button" className="button button-primary" disabled={!cachePrediction || !cachePolicy} onClick={runCache}>
                {t("두 KV-cache fixture 실행", "Run both KV-cache fixtures")}
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

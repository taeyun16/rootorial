import { useEffect, useRef, useState } from "react";
import {
  evaluateSelfAttentionRepair,
  selfAttentionDebuggerScenarioIds,
  selfAttentionDebuggerScenarios,
  type SelfAttentionDebuggerScenarioId,
  type SelfAttentionRepair,
  type SelfAttentionRepairResult,
} from "../../features/self-attention/self-attention-model";
import { useLocale } from "../../features/localization/localization";
import { DirectChoice } from "../interactive/DirectChoice";
import { InteractiveLab } from "../interactive/InteractiveLab";

const incidentCopy: Record<SelfAttentionDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
}> = {
  "qkv-projections": {
    title: {
      ko: "사건 01 · Q, K, V가 모두 같은 값이 됐습니다",
      en: "Incident 01 · Q, K, and V became identical",
    },
    clue: {
      ko: "같은 X에서 시작해도 세 역할은 서로 다른 학습 projection을 거쳐야 합니다.",
      en: "Although all three start from the same X, each role needs its own learned projection.",
    },
  },
  "score-scaling": {
    title: {
      ko: "사건 02 · 한 key가 너무 일찍 포화됐습니다",
      en: "Incident 02 · One key saturated too early",
    },
    clue: {
      ko: "head 차원 d_h=2인 score의 크기를 Softmax 전에 안정화해야 합니다.",
      en: "Stabilize scores for head dimension d_h=2 before applying softmax.",
    },
  },
  "mask-softmax": {
    title: {
      ko: "사건 03 · 미래 또는 padding으로 확률 질량이 샙니다",
      en: "Incident 03 · Probability mass leaks to the future or padding",
    },
    clue: {
      ko: "미래와 padding logit을 제외한 뒤 허용된 key끼리 각 active query 행을 다시 합 1로 만들어야 합니다.",
      en: "Exclude future and padding logits, then renormalize each active query row over the allowed keys to sum to one.",
    },
  },
  "head-merge-handoff": {
    title: {
      ko: "사건 04 · 다음 block으로 넘길 [T,d_model] shape가 깨졌습니다",
      en: "Incident 04 · The [T,d_model] handoff to the next block broke",
    },
    clue: {
      ko: "같은 token의 head feature를 합쳐 T=4와 d_model=4를 모두 보존해야 합니다.",
      en: "Join head features for the same token while preserving both T=4 and d_model=4.",
    },
  },
};

function formatNumber(value: number | null) {
  if (value === null) return "—";
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function resultFeedback(result: SelfAttentionRepairResult, locale: "ko" | "en") {
  const isKo = locale === "ko";
  const { metrics } = result;

  if (result.reason === "contract-restored") {
    if (result.scenarioId === "qkv-projections") {
      return isKo
        ? `fixture를 다시 실행해 Q/K/V가 각각 [4,${metrics.qColumns}] · [4,${metrics.kColumns}] · [4,${metrics.vColumns}]을 유지하면서 서로 다른 projection 값과 일치함을 확인했습니다.`
        : `Re-running the fixture confirmed Q, K, and V retain [4,${metrics.qColumns}], [4,${metrics.kColumns}], and [4,${metrics.vColumns}] while matching their distinct projected values.`;
    }
    if (result.scenarioId === "score-scaling") {
      return isKo
        ? `QKᵀ를 √d_h=${formatNumber(metrics.divisor)}로 나눈 뒤 검사 행의 entropy는 ${formatNumber(metrics.entropy)}입니다. canonical scaled distribution과 일치합니다.`
        : `After dividing QK transpose by sqrt(d_h)=${formatNumber(metrics.divisor)}, the inspected row has entropy ${formatNumber(metrics.entropy)} and matches the canonical scaled distribution.`;
    }
    if (result.scenarioId === "mask-softmax") {
      return isKo
        ? `미래 질량 ${formatNumber(metrics.futureMass)}, padding 질량 ${formatNumber(metrics.paddingMass)}, active 행 최소 합 ${formatNumber(metrics.minimumActiveRowSum)}, inactive query 질량 ${formatNumber(metrics.inactiveQueryMass)}입니다. visibility와 정규화 계약을 모두 복구했습니다.`
        : `Future mass is ${formatNumber(metrics.futureMass)}, padding mass is ${formatNumber(metrics.paddingMass)}, the minimum active-row sum is ${formatNumber(metrics.minimumActiveRowSum)}, and inactive-query mass is ${formatNumber(metrics.inactiveQueryMass)}. Both visibility and normalization contracts are restored.`;
    }
    return isKo
      ? `실행 결과는 [${metrics.outputRows},${metrics.outputColumns}]입니다. token 행을 늘리거나 head feature를 줄이지 않고 다음 block의 [T,d_model] 계약을 보존했습니다.`
      : `The executed output is [${metrics.outputRows},${metrics.outputColumns}]. It preserves the next block's [T,d_model] contract without adding token rows or reducing head features.`;
  }

  if (result.reason === "qkv-roles-collapsed") {
    return isKo
      ? `Q를 K와 V에 복사해 세 tensor의 shape는 [4,${metrics.qColumns}]이지만 역할별 값이 붕괴했습니다. 같은 X에 W_Q, W_K, W_V를 각각 적용하세요.`
      : `Copying Q into K and V keeps all three shapes at [4,${metrics.qColumns}] but collapses their role-specific values. Apply W_Q, W_K, and W_V independently to the same X.`;
  }
  if (result.reason === "raw-input-bypassed-projections") {
    return isKo
      ? `raw X를 그대로 재사용해 shape만 [4,${metrics.qColumns}]로 맞았습니다. shape 일치만으로는 projection 계약이 아니므로 XW_Q, XW_K, XW_V를 실행하세요.`
      : `Reusing raw X happens to keep shape [4,${metrics.qColumns}], but shape equality alone does not satisfy the projection contract. Execute XW_Q, XW_K, and XW_V.`;
  }
  if (result.reason === "wrong-scale-divisor") {
    return isKo
      ? `d_h=${formatNumber(metrics.divisor)}로 직접 나눠 검사 행 entropy가 ${formatNumber(metrics.entropy)}가 됐습니다. dot-product 분산을 맞추는 divisor는 d_h가 아니라 √d_h입니다.`
      : `Dividing directly by d_h=${formatNumber(metrics.divisor)} produced inspected-row entropy ${formatNumber(metrics.entropy)}. The divisor that controls dot-product variance is sqrt(d_h), not d_h.`;
  }
  if (result.reason === "scores-unscaled") {
    return isKo
      ? `divisor ${formatNumber(metrics.divisor)}로 score를 그대로 두어 검사 행 entropy가 ${formatNumber(metrics.entropy)}입니다. d_h가 커질수록 logit과 gradient 포화가 커지므로 √d_h로 나누세요.`
      : `Leaving scores at divisor ${formatNumber(metrics.divisor)} yields inspected-row entropy ${formatNumber(metrics.entropy)}. As d_h grows, logits and gradients saturate more, so divide by sqrt(d_h).`;
  }
  if (result.reason === "future-leak") {
    return isKo
      ? `미래 key에 ${formatNumber(metrics.futureMass)}의 질량이 남았습니다. causal logit을 Softmax 전에 차단하고 허용된 key만 다시 정규화하세요.`
      : `Future keys retain mass ${formatNumber(metrics.futureMass)}. Block causal logits before softmax, then renormalize only the allowed keys.`;
  }
  if (result.reason === "padding-leak") {
    return isKo
      ? `padding key에 ${formatNumber(metrics.paddingMass)}의 질량이 남았습니다. causal mask만으로는 padding을 알 수 없으므로 두 visibility 조건을 함께 적용하세요.`
      : `The padding key retains mass ${formatNumber(metrics.paddingMass)}. A causal mask cannot identify padding, so apply both visibility conditions together.`;
  }
  if (result.reason === "row-mass-lost") {
    return isKo
      ? `Softmax 뒤에서 weight를 0으로 바꿔 active 행 최소 합이 ${formatNumber(metrics.minimumActiveRowSum)}로 떨어졌습니다. mask를 logit에 먼저 적용해야 허용된 weight 합이 다시 1이 됩니다.`
      : `Zeroing weights after softmax reduced the minimum active-row sum to ${formatNumber(metrics.minimumActiveRowSum)}. Mask logits first so allowed weights renormalize to one.`;
  }
  if (result.reason === "head-features-averaged") {
    return isKo
      ? `head를 평균내 출력이 [${metrics.outputRows},${metrics.outputColumns}]로 줄었습니다. 같은 token의 feature 축에 concat해 d_model=4를 복원한 뒤 W_O를 적용하세요.`
      : `Averaging heads shrank the output to [${metrics.outputRows},${metrics.outputColumns}]. Concatenate along each token's feature axis to restore d_model=4, then apply W_O.`;
  }
  return isKo
    ? `head를 token 축에 이어 출력이 [${metrics.outputRows},${metrics.outputColumns}]가 됐습니다. token 수 T=4를 유지하고 같은 token row의 head feature를 concat하세요.`
    : `Concatenating heads on the token axis produced [${metrics.outputRows},${metrics.outputColumns}]. Keep T=4 and concatenate head features within the same token row.`;
}

export function SelfAttentionDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<SelfAttentionDebuggerScenarioId, SelfAttentionRepair>>>({});
  const [results, setResults] = useState<Partial<Record<SelfAttentionDebuggerScenarioId, SelfAttentionRepairResult>>>({});
  const [runtimeFailure, setRuntimeFailure] = useState<SelfAttentionDebuggerScenarioId | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  const runButtonRefs = useRef<Partial<Record<SelfAttentionDebuggerScenarioId, HTMLButtonElement | null>>>({});
  const focusRunAfterRecovery = useRef<SelfAttentionDebuggerScenarioId | null>(null);
  const solved = selfAttentionDebuggerScenarioIds.filter((scenarioId) => results[scenarioId]?.correct).length;
  const complete = solved === selfAttentionDebuggerScenarioIds.length;

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => {
    onCompletionChange?.(complete);
  }, [complete, onCompletionChange]);

  useEffect(() => {
    if (runtimeFailure) {
      recoveryButtonRef.current?.focus();
      return;
    }
    const scenarioId = focusRunAfterRecovery.current;
    if (scenarioId) {
      focusRunAfterRecovery.current = null;
      runButtonRefs.current[scenarioId]?.focus();
    }
  }, [runtimeFailure]);

  function chooseRepair(scenarioId: SelfAttentionDebuggerScenarioId, repair: SelfAttentionRepair) {
    setAnswers((current) => ({ ...current, [scenarioId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    if (runtimeFailure === scenarioId) setRuntimeFailure(null);
  }

  function runRepair(scenarioId: SelfAttentionDebuggerScenarioId) {
    const repair = answers[scenarioId];
    if (!repair) return;
    try {
      const result = evaluateSelfAttentionRepair(scenarioId, repair);
      setResults((current) => ({ ...current, [scenarioId]: result }));
      setRuntimeFailure(null);
    } catch {
      setResults((current) => {
        const next = { ...current };
        delete next[scenarioId];
        return next;
      });
      setRuntimeFailure(scenarioId);
    }
  }

  function resetScenario(scenarioId: SelfAttentionDebuggerScenarioId) {
    setAnswers((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    setResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    if (runtimeFailure === scenarioId) setRuntimeFailure(null);
  }

  function resetAll() {
    setAnswers({});
    setResults({});
    setRuntimeFailure(null);
    focusRunAfterRecovery.current = null;
  }

  function recoverRuntime() {
    if (!runtimeFailure) return;
    focusRunAfterRecovery.current = runtimeFailure;
    setRuntimeFailure(null);
  }

  return (
    <InteractiveLab
      className="self-attention-debugger-lab"
      kicker={t("별도 활동 · CAUSAL MULTI-HEAD REPAIR CONSOLE", "SEPARATE ACTIVITY · CAUSAL MULTI-HEAD REPAIR CONSOLE")}
      title={t("실행 결과로 네 Self-Attention 계약을 수리하세요", "Repair four Self-Attention contracts from executed results")}
      description={t(
        "각 repair는 고정된 4-token fixture에 후보 연산을 실제 적용합니다. Q/K/V projection, scale, mask 질량과 output shape가 의미론적으로 맞아야 통과합니다.",
        "Each repair executes a candidate operation against a fixed four-token fixture. Q/K/V projections, scaling, mask mass, and output shape must be semantically correct to pass.",
      )}
      actions={(
        <button
          type="button"
          className="button button-ghost"
          aria-label={t("Self-Attention debugger 전체 초기화", "Reset the entire Self-Attention debugger")}
          onClick={resetAll}
        >
          {t("fixture·debugger 초기화", "Reset fixture and debugger")}
        </button>
      )}
    >
      <div
        className="self-attention-debug-progress"
        data-interactive-ready={interactiveReady ? "true" : "false"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={t(`복구한 Self-Attention 계약 ${solved} / ${selfAttentionDebuggerScenarioIds.length}`, `${solved} of ${selfAttentionDebuggerScenarioIds.length} Self-Attention contracts restored`)}
      >
        <div>
          <span>{t("복구한 계약", "CONTRACTS RESTORED")}</span>
          <strong>{solved} / {selfAttentionDebuggerScenarioIds.length}</strong>
        </div>
        <span>{complete
          ? t("네 projection·scaling·mask·handoff 계약이 모두 결정적 검사를 통과했습니다.", "All projection, scaling, mask, and handoff contracts passed deterministic checks.")
          : t("오답은 실제 질량·entropy·shape와 다음 수리 방향을 설명합니다.", "Wrong repairs explain the resulting mass, entropy, shape, and next repair direction.")}</span>
      </div>

      {runtimeFailure ? (
        <div className="self-attention-runtime-fallback" role="alert">
          <strong>{t("로컬 Self-Attention debugger runtime 실패", "Local Self-Attention debugger runtime failure")}</strong>
          <p>{t(
            "해당 후보를 결정적으로 계산하지 못했습니다. 다른 사건의 정답은 보존되며, fixture를 바꾸지 않고 이 사건의 실행 버튼으로 돌아갈 수 있습니다.",
            "This candidate could not be computed deterministically. Correct work in other incidents is preserved, and you can return to this incident's run button without changing the fixture.",
          )}</p>
          <button
            ref={recoveryButtonRef}
            type="button"
            className="button button-secondary"
            onClick={recoverRuntime}
          >
            {t("기본 fixture로 안전하게 복귀", "Return safely to the default fixture")}
          </button>
        </div>
      ) : null}

      <div className="self-attention-debug-grid">
        {selfAttentionDebuggerScenarioIds.map((scenarioId, index) => {
          const scenario = selfAttentionDebuggerScenarios[scenarioId];
          const copy = incidentCopy[scenarioId];
          const answer = answers[scenarioId] ?? "";
          const result = results[scenarioId];
          const clueId = `${scenarioId}-self-attention-clue`;
          const feedbackId = `${scenarioId}-self-attention-feedback`;
          const describedBy = result ? `${clueId} ${feedbackId}` : clueId;

          return (
            <fieldset
              className={`self-attention-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={describedBy}
              data-scenario-id={scenarioId}
              data-repair-result={result ? result.correct ? "correct" : "incorrect" : "pending"}
              key={scenarioId}
            >
              <legend>{copy.title[locale]}</legend>
              <p id={clueId}>{copy.clue[locale]}</p>
              <DirectChoice
                label={t(`${index + 1}번 Self-Attention 사건 repair`, `Repair for Self-Attention incident ${index + 1}`)}
                value={answer}
                options={scenario.options.map((option) => ({
                  value: option.id,
                  label: option[isKo ? "labelKo" : "labelEn"],
                }))}
                onChange={(value) => chooseRepair(scenarioId, value as SelfAttentionRepair)}
              />
              <div className="self-attention-debug-actions">
                <button
                  ref={(node) => {
                    runButtonRefs.current[scenarioId] = node;
                  }}
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  aria-label={t(`${index + 1}번 Self-Attention 사건 repair 적용 및 계약 실행`, `Apply repair and run contract for Self-Attention incident ${index + 1}`)}
                  onClick={() => runRepair(scenarioId)}
                >
                  {t("repair 적용·계약 실행", "Apply repair and run contract")}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  aria-label={t(`${index + 1}번 Self-Attention 사건 초기화`, `Reset Self-Attention incident ${index + 1}`)}
                  onClick={() => resetScenario(scenarioId)}
                >
                  {t("사건 초기화", "Reset incident")}
                </button>
              </div>
              {result ? (
                <div
                  id={feedbackId}
                  className={`self-attention-debug-feedback ${result.correct ? "is-correct" : "is-incorrect"}`}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <strong>{result.correct ? t("계약 복구", "Contract restored") : t("결함이 남아 있습니다", "Failure remains")}</strong>
                  <p>{resultFeedback(result, locale)}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

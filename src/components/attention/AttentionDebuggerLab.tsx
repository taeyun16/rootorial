import { useEffect, useRef, useState } from "react";
import {
  attentionDebuggerScenarioIds,
  attentionDebuggerScenarios,
  attentionMemorySlots,
  evaluateAttentionRepair,
  type AttentionDebuggerScenarioId,
  type AttentionMemorySlotId,
  type AttentionRepair,
  type AttentionRepairResult,
} from "../../features/attention/attention-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { DirectChoice } from "../interactive/DirectChoice";

const incidentCopy: Record<AttentionDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
}> = {
  "softmax-axis": {
    title: {
      ko: "사건 01 · 세 query의 weight 합이 제각각입니다",
      en: "Incident 01 · The three queries have inconsistent weight sums",
    },
    clue: {
      ko: "score[Nq,Nk]의 각 query 행은 source key Nk개에 대해 독립적으로 합 1이어야 합니다.",
      en: "Every query row in scores[Nq,Nk] needs its own sum-one distribution over the Nk source keys.",
    },
  },
  "context-source": {
    title: {
      ko: "사건 02 · context 폭이 dᵥ=3에서 dₖ=2로 줄었습니다",
      en: "Incident 02 · Context width shrank from d_v=3 to d_k=2",
    },
    clue: {
      ko: "weight는 주소인 key가 아니라 같은 source row의 content인 value를 합성해야 합니다.",
      en: "Weights must combine the content values from matching source rows, not their address keys.",
    },
  },
  "qk-shape": {
    title: {
      ko: "사건 03 · score 표에서 query와 key 축이 뒤집혔습니다",
      en: "Incident 03 · Query and key axes are reversed in the score table",
    },
    clue: {
      ko: "Q[Nq,dₖ]의 각 행을 K[Nk,dₖ]의 모든 행과 비교해 score[Nq,Nk]를 만들어야 합니다.",
      en: "Compare every row of Q[Nq,d_k] with every row of K[Nk,d_k] to produce scores[Nq,Nk].",
    },
  },
  "independent-query-rows": {
    title: {
      ko: "사건 04 · 누가·어디서·무엇을 query가 모두 같은 곳을 봅니다",
      en: "Incident 04 · Who, where, and what queries all look at the same place",
    },
    clue: {
      ko: "각 query는 자기 score 행에서 softmax를 실행해야 하며 다른 query의 weight나 분모를 재사용하면 안 됩니다.",
      en: "Each query must softmax its own score row without reusing another query's weights or denominator.",
    },
  },
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return String(value);
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function formatShape(result: AttentionRepairResult) {
  return `[${result.metrics.candidateRows},${result.metrics.candidateColumns}]`;
}

function formatRowSums(result: AttentionRepairResult) {
  return `[${result.metrics.rowSums.map(formatNumber).join(", ")}]`;
}

function slotName(slotId: AttentionMemorySlotId | null, locale: "ko" | "en") {
  if (slotId === null) return locale === "ko" ? "판정 불가" : "unavailable";
  const slot = attentionMemorySlots.find(({ id }) => id === slotId);
  return slot ? locale === "ko" ? slot.labelKo : slot.labelEn : slotId;
}

function formatTopSlots(result: AttentionRepairResult, locale: "ko" | "en") {
  return result.metrics.topSlotIds.map((slotId) => slotName(slotId, locale)).join(" → ");
}

function resultFeedback(result: AttentionRepairResult, locale: "ko" | "en") {
  const isKo = locale === "ko";

  if (result.reason === "contract-restored") {
    if (result.scenarioId === "softmax-axis") {
      return isKo
        ? `실행한 weight ${formatShape(result)}의 query별 행 합은 ${formatRowSums(result)}입니다. 각 query가 key 축에서 자기 분포를 가집니다.`
        : `The executed weights ${formatShape(result)} have per-query row sums ${formatRowSums(result)}. Every query owns its distribution over keys.`;
    }
    if (result.scenarioId === "context-source") {
      return isKo
        ? `실행한 context ${formatShape(result)}의 폭은 ${result.metrics.contextDimension}으로 dᵥ=3과 같습니다. weight가 같은 row의 value content를 섞었습니다.`
        : `The executed context ${formatShape(result)} has width ${result.metrics.contextDimension}, matching d_v=3. The weights mixed value content from matching rows.`;
    }
    if (result.scenarioId === "qk-shape") {
      return isKo
        ? `QKᵀ가 score ${formatShape(result)}를 만들었습니다. 행은 query, 열은 key이며 query별 top slot은 ${formatTopSlots(result, locale)}입니다.`
        : `QK transpose produced scores ${formatShape(result)}. Rows are queries, columns are keys, and the per-query top slots are ${formatTopSlots(result, locale)}.`;
    }
    return isKo
      ? `query별 weight 행 합은 ${formatRowSums(result)}이고 top slot은 ${formatTopSlots(result, locale)}로 달라집니다.`
      : `The per-query weight rows sum to ${formatRowSums(result)}, and their top slots differ: ${formatTopSlots(result, locale)}.`;
  }

  if (result.reason === "softmax-over-value-features") {
    return isKo
      ? `후보 ${formatShape(result)}의 합 ${formatRowSums(result)}는 value feature를 정규화한 결과입니다. 합이 1이어도 query-key routing weight가 아니므로 score의 key 축을 정규화하세요.`
      : `Candidate ${formatShape(result)} with sums ${formatRowSums(result)} normalizes value features. Sum-one alone does not make it query-key routing; normalize the key axis of scores.`;
  }
  if (result.reason === "softmax-across-queries") {
    return isKo
      ? `key마다 query 축을 정규화해 query별 행 합이 ${formatRowSums(result)}가 됐습니다. 각 query 안에서 source key들이 분모를 공유해야 합니다.`
      : `Normalizing across queries for each key produced per-query row sums ${formatRowSums(result)}. Source keys must share the denominator within each query.`;
  }
  if (result.reason === "keys-used-as-context") {
    return isKo
      ? `후보 context ${formatShape(result)}의 폭 ${result.metrics.contextDimension}은 dₖ=2입니다. 주소 key가 아니라 V[S,3]를 weight와 합성해 dᵥ=3을 보존하세요.`
      : `Candidate context ${formatShape(result)} has width ${result.metrics.contextDimension}=d_k. Mix V[S,3] with the weights, rather than address keys, to preserve d_v=3.`;
  }
  if (result.reason === "argmax-key-drops-values") {
    return isKo
      ? `argmax key를 그대로 반환해 폭이 ${result.metrics.contextDimension}이고 나머지 value 기여가 사라졌습니다. context는 hard key 선택이 아니라 αV soft mixture입니다.`
      : `Returning the argmax key gives width ${result.metrics.contextDimension} and drops every other value contribution. Context is the soft mixture alpha V, not a hard key selection.`;
  }
  if (result.reason === "query-key-axes-swapped") {
    return isKo
      ? `후보 score ${formatShape(result)}는 KQᵀ라서 행이 key입니다. 현재 Nq=Nk=3이라 숫자 shape가 같아 보여도 의미 축이 뒤집혔습니다. QKᵀ를 실행하세요.`
      : `Candidate scores ${formatShape(result)} came from KQ transpose, so rows are keys. Nq=Nk=3 hides the reversal numerically; execute QK transpose.`;
  }
  if (result.reason === "inner-dimensions-do-not-align") {
    return isKo
      ? `QK는 내부 차원 dₖ와 Nk가 맞지 않아 후보 shape ${formatShape(result)}를 만들지 못했습니다. K를 전치해 [Nq,dₖ]@[dₖ,Nk]로 맞추세요.`
      : `QK cannot align inner dimensions d_k and Nk, so it produced candidate shape ${formatShape(result)}. Transpose K to multiply [Nq,d_k] by [d_k,Nk].`;
  }
  if (result.reason === "first-query-weights-reused") {
    return isKo
      ? `첫 weight 행을 복사해 top slot이 ${formatTopSlots(result, locale)}로 반복됩니다. query마다 자기 score 행을 다시 정규화하세요.`
      : `Copying the first weight row repeats the top slots as ${formatTopSlots(result, locale)}. Normalize each query's own score row.`;
  }
  if (result.reason === "all-query-rows-coupled") {
    return isKo
      ? `score 표 전체가 분모 하나를 공유해 query별 행 합이 ${formatRowSums(result)}입니다. 각 행의 합이 따로 1이 되도록 분리하세요.`
      : `The entire score table shares one denominator, producing per-query row sums ${formatRowSums(result)}. Separate the rows so each sums to one.`;
  }

  return isKo
    ? `실행 결과가 routing 계약을 복구하지 못했습니다. 기대 repair는 ${result.expectedRepair}입니다.`
    : `The executed result did not restore the routing contract. Expected repair: ${result.expectedRepair}.`;
}

export function AttentionDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<AttentionDebuggerScenarioId, AttentionRepair>>>({});
  const [results, setResults] = useState<Partial<Record<AttentionDebuggerScenarioId, AttentionRepairResult>>>({});
  const [runtimeFailure, setRuntimeFailure] = useState<AttentionDebuggerScenarioId | null>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  const runButtonRefs = useRef<Partial<Record<AttentionDebuggerScenarioId, HTMLButtonElement | null>>>({});
  const focusRunAfterRecovery = useRef<AttentionDebuggerScenarioId | null>(null);
  const solved = attentionDebuggerScenarioIds.filter((scenarioId) => results[scenarioId]?.correct).length;
  const complete = solved === attentionDebuggerScenarioIds.length;

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

  function chooseRepair(scenarioId: AttentionDebuggerScenarioId, repair: AttentionRepair) {
    setAnswers((current) => ({ ...current, [scenarioId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    if (runtimeFailure === scenarioId) setRuntimeFailure(null);
  }

  function runRepair(scenarioId: AttentionDebuggerScenarioId) {
    const repair = answers[scenarioId];
    if (!repair) return;
    try {
      const result = evaluateAttentionRepair(scenarioId, repair);
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

  function resetScenario(scenarioId: AttentionDebuggerScenarioId) {
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
      className="attention-debugger-lab"
      kicker={t("별도 활동 · ATTENTION ROUTING DEBUGGER", "SEPARATE ACTIVITY · ATTENTION ROUTING DEBUGGER")}
      title={t("숫자로 실행해 네 routing 계약을 복구하세요", "Execute the numbers and restore four routing contracts")}
      description={t(
        "각 repair는 같은 Q·K·V로 score, weight, context를 다시 계산합니다. 이름이 아니라 shape·행 합·top slot·context 폭으로 판정합니다.",
        "Every repair recomputes scores, weights, or context from the same Q, K, and V. Shape, row sums, top slots, and context width—not the label—decide the result.",
      )}
      actions={(
        <button
          type="button"
          className="button button-ghost"
          aria-label={t("Attention debugger 전체 초기화", "Reset the entire Attention debugger")}
          onClick={resetAll}
        >
          {t("debugger 전체 초기화", "Reset debugger")}
        </button>
      )}
    >
      <div
        className="attention-debug-progress"
        data-interactive-ready="true"
        aria-label={t(`복구한 routing 계약 ${solved} / ${attentionDebuggerScenarioIds.length}`, `${solved} of ${attentionDebuggerScenarioIds.length} routing contracts restored`)}
      >
        <div>
          <span>{t("복구한 계약", "CONTRACTS RESTORED")}</span>
          <strong>{solved} / {attentionDebuggerScenarioIds.length}</strong>
        </div>
        <span>{complete
          ? t("네 routing 경계가 모두 결정적 검사를 통과했습니다.", "All four routing boundaries passed their deterministic checks.")
          : t("오답은 실제 후보 shape와 깨진 축을 설명합니다.", "Wrong repairs explain the actual candidate shape and broken axis.")}</span>
      </div>

      {runtimeFailure ? (
        <div className="attention-runtime-fallback" role="alert">
          <strong>{t("로컬 Attention debugger runtime 실패", "Local Attention debugger runtime failure")}</strong>
          <p>{t(
            "해당 repair를 결정적으로 계산하지 못했습니다. 기존 정답은 보존하고 이 사건의 실행 버튼으로 안전하게 돌아갈 수 있습니다.",
            "This repair could not be computed deterministically. Existing correct work is preserved, and you can safely return to this incident's run button.",
          )}</p>
          <button
            ref={recoveryButtonRef}
            type="button"
            className="button button-secondary"
            onClick={recoverRuntime}
          >
            {t("사건 실행으로 안전하게 복귀", "Return safely to incident run")}
          </button>
        </div>
      ) : null}

      <div className="attention-debug-grid">
        {attentionDebuggerScenarioIds.map((scenarioId, index) => {
          const scenario = attentionDebuggerScenarios[scenarioId];
          const copy = incidentCopy[scenarioId];
          const answer = answers[scenarioId] ?? "";
          const result = results[scenarioId];
          const clueId = `${scenarioId}-attention-clue`;
          const feedbackId = `${scenarioId}-attention-feedback`;
          const describedBy = result ? `${clueId} ${feedbackId}` : clueId;

          return (
            <fieldset
              className={`attention-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={describedBy}
              data-scenario-id={scenarioId}
              data-repair-result={result ? result.correct ? "correct" : "incorrect" : "pending"}
              key={scenarioId}
            >
              <legend>{copy.title[locale]}</legend>
              <p id={clueId}>{copy.clue[locale]}</p>
              <DirectChoice
                compact
                label={`${scenario[isKo ? "labelKo" : "labelEn"]} · ${t("실행할 repair", "Repair to execute")}`}
                ariaLabel={t(`${index + 1}번 Attention 사건 repair`, `Repair for Attention incident ${index + 1}`)}
                value={answer}
                options={scenario.options.map((option) => ({ value: option.id, label: option[isKo ? "labelKo" : "labelEn"] }))}
                onChange={(repair) => chooseRepair(scenarioId, repair)}
              />
              <div className="attention-debug-actions">
                <button
                  ref={(node) => {
                    runButtonRefs.current[scenarioId] = node;
                  }}
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  aria-label={t(`${index + 1}번 Attention 사건 repair 적용 및 계약 실행`, `Apply repair and run contract for Attention incident ${index + 1}`)}
                  onClick={() => runRepair(scenarioId)}
                >
                  {t("repair 적용·계약 실행", "Apply repair and run contract")}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  aria-label={t(`${index + 1}번 Attention 사건 초기화`, `Reset Attention incident ${index + 1}`)}
                  onClick={() => resetScenario(scenarioId)}
                >
                  {t("사건 초기화", "Reset incident")}
                </button>
              </div>
              {result ? (
                <div
                  id={feedbackId}
                  className={`attention-debug-feedback ${result.correct ? "is-correct" : "is-incorrect"}`}
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

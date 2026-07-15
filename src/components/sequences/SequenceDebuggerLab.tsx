import { useEffect, useRef, useState } from "react";
import {
  evaluateSequenceRepair,
  sequenceDebuggerScenarioIds,
  sequenceRepairOptions,
  type SequenceDebuggerScenarioId,
  type SequenceRepair,
  type SequenceRepairResult,
} from "../../features/sequences/sequence-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

const scenarioCopy: Record<SequenceDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
}> = {
  "order-state": {
    title: { ko: "사건 01 · 순서를 바꿔도 final state가 같습니다", en: "Incident 01 · Reordering leaves final state unchanged" },
    clue: {
      ko: "같은 token multiset이라도 recurrence는 앞 state와 현재 입력을 순서대로 결합해야 합니다.",
      en: "Even with the same token multiset, recurrence must combine prior state and current input in order.",
    },
  },
  "causal-prefix": {
    title: { ko: "사건 02 · prefix state가 미래 token을 알고 있습니다", en: "Incident 02 · A prefix state already knows a future token" },
    clue: {
      ko: "단방향 causal recurrence의 h_t는 x_0부터 x_t까지만 읽을 수 있습니다.",
      en: "In a one-way causal recurrence, h_t may read only x_0 through x_t.",
    },
  },
  "cell-update": {
    title: { ko: "사건 03 · LSTM cell이 기억과 새 후보를 뒤섞습니다", en: "Incident 03 · The LSTM cell mixes old memory and the new candidate" },
    clue: {
      ko: "forget gate는 이전 cell branch에, input gate는 새 candidate branch에 각각 곱해져 더해집니다.",
      en: "The forget gate scales the prior-cell branch; the input gate scales the new-candidate branch; then they add.",
    },
  },
  "output-boundary": {
    title: { ko: "사건 04 · output gate가 장기 cell을 덮어씁니다", en: "Incident 04 · The output gate overwrites long-term cell memory" },
    clue: {
      ko: "output gate는 tanh(c_t)에서 외부로 보일 hidden만 제어하며 cell 자체를 바꾸지 않습니다.",
      en: "The output gate controls only the visible hidden state from tanh(c_t); it does not modify the cell itself.",
    },
  },
};

const repairCopy: Record<SequenceRepair, { ko: string; en: string }> = {
  "ordered-recurrence": { ko: "입력 순서대로 state recurrence", en: "recur state in input order" },
  "mean-pooling": { ko: "모든 입력을 먼저 평균", en: "mean-pool every input first" },
  "sorted-recurrence": { ko: "token을 정렬한 뒤 recurrence", en: "sort tokens before recurrence" },
  "prefix-only": { ko: "각 h_t는 현재까지의 prefix만 읽기", en: "let each h_t read only its prefix" },
  "broadcast-final": { ko: "final state를 모든 timestep에 복사", en: "broadcast final state to every timestep" },
  "bidirectional-lookahead": { ko: "역방향 state를 causal output에 합치기", en: "merge backward lookahead into causal output" },
  "forget-old-plus-input-candidate": { ko: "f_t·c_{t-1} + i_t·g_t", en: "f_t·c_{t-1} + i_t·g_t" },
  "input-old-plus-forget-candidate": { ko: "i_t·c_{t-1} + f_t·g_t", en: "i_t·c_{t-1} + f_t·g_t" },
  "multiply-cell-branches": { ko: "(f_t·c_{t-1}) × (i_t·g_t)", en: "(f_t·c_{t-1}) × (i_t·g_t)" },
  "output-gates-hidden": { ko: "h_t=o_t·tanh(c_t), c_t는 유지", en: "h_t=o_t·tanh(c_t), preserve c_t" },
  "output-overwrites-cell": { ko: "c_t=o_t·tanh(c_t)로 덮어쓰기", en: "overwrite c_t with o_t·tanh(c_t)" },
  "forget-gates-hidden": { ko: "forget gate로 hidden 출력 제어", en: "use the forget gate for hidden output" },
};

function resultFeedback(
  scenario: SequenceDebuggerScenarioId,
  result: SequenceRepairResult,
  locale: "ko" | "en",
) {
  const isKo = locale === "ko";
  if (result.correct) {
    if (scenario === "order-state") {
      return isKo
        ? "token을 원래 순서대로 한 번씩 실행해 같은 multiset의 순서 반전이 다른 final state를 만듭니다."
        : "Running tokens once in their original order makes a reversed version of the same multiset produce a different final state.";
    }
    if (scenario === "causal-prefix") {
      return isKo
        ? "미래 suffix를 바꿔도 이미 계산된 prefix state는 그대로여서 causal 경계가 복구됐습니다."
        : "Changing a future suffix leaves an already-computed prefix state unchanged, restoring the causal boundary.";
    }
    if (scenario === "cell-update") {
      return isKo
        ? "이전 cell 기억과 새 candidate가 서로 다른 gate를 통과한 뒤 덧셈으로 합쳐집니다."
        : "Prior cell memory and the new candidate pass through separate gates, then combine by addition.";
    }
    return isKo
      ? "output gate는 외부 hidden만 가리고 cell memory는 다음 timestep으로 그대로 전달합니다."
      : "The output gate masks only the exposed hidden state while cell memory continues to the next timestep.";
  }
  if (result.reason === "repair-not-applicable") {
    return isKo
      ? "이 repair는 다른 sequence 경계를 다룹니다. 사건의 불변식과 직접 연결된 계산을 선택하세요."
      : "This repair targets a different sequence boundary. Choose the computation tied directly to this incident's invariant.";
  }
  if (result.reason === "order-erased") {
    return isKo
      ? "평균은 교환법칙 때문에 token multiset만 남기고 위치 순서를 지웁니다. state를 timestep마다 갱신하세요."
      : "A commutative mean keeps the token multiset but erases positional order. Update state at every timestep.";
  }
  if (result.reason === "order-canonicalized") {
    return isKo
      ? "정렬은 입력의 실제 순서를 임의의 canonical order로 바꿉니다. 원래 index 순서를 보존하세요."
      : "Sorting replaces the input's real order with an arbitrary canonical order. Preserve original indices.";
  }
  if (result.reason === "future-leakage") {
    return isKo
      ? "prefix state가 아직 오지 않은 suffix에 따라 바뀌었습니다. 단방향 causal trace에서 미래 경로를 제거하세요."
      : "The prefix state changed with an unseen suffix. Remove the future path from the one-way causal trace.";
  }
  if (result.reason === "cell-branch-swapped") {
    return isKo
      ? "input과 forget gate의 branch가 뒤바뀌었습니다. forget은 c_{t-1}, input은 새 candidate를 제어합니다."
      : "The input and forget branches are swapped. Forget controls c_{t-1}; input controls the new candidate.";
  }
  if (result.reason === "cell-branches-multiplied") {
    return isKo
      ? "두 branch를 곱하면 어느 하나가 작을 때 기억과 새 입력이 함께 사라집니다. gated branch들은 더합니다."
      : "Multiplying the branches erases both memory and new input when either is small. Add the gated branches.";
  }
  if (result.reason === "cell-overwritten-by-output") {
    return isKo
      ? "output gate가 cell까지 덮어써 장기 경로를 끊었습니다. c_t와 외부 h_t를 분리하세요."
      : "The output gate overwrote the cell and broke the long path. Keep c_t separate from exposed h_t.";
  }
  if (result.reason === "wrong-hidden-gate") {
    return isKo
      ? "forget gate는 cell의 이전 기억을 제어합니다. 외부 hidden에는 output gate를 사용하세요."
      : "The forget gate controls prior cell memory. Use the output gate for the exposed hidden state.";
  }
  return isKo
    ? "실행 결과가 이 사건의 sequence 불변식을 복구하지 못했습니다."
    : "The computed result did not restore this incident's sequence invariant.";
}

export function SequenceDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<SequenceDebuggerScenarioId, SequenceRepair>>>({});
  const [results, setResults] = useState<Partial<Record<SequenceDebuggerScenarioId, SequenceRepairResult>>>({});
  const [runtimeError, setRuntimeError] = useState(false);
  const firstSelectRef = useRef<HTMLSelectElement>(null);
  const focusFirstAfterRecovery = useRef(false);
  const solved = sequenceDebuggerScenarioIds.filter((scenario) => results[scenario]?.correct).length;
  const complete = solved === sequenceDebuggerScenarioIds.length;

  useEffect(() => {
    onCompletionChange?.(complete);
  }, [complete, onCompletionChange]);

  useEffect(() => {
    if (!runtimeError && focusFirstAfterRecovery.current) {
      focusFirstAfterRecovery.current = false;
      firstSelectRef.current?.focus();
    }
  }, [runtimeError]);

  function chooseRepair(scenario: SequenceDebuggerScenarioId, repair: SequenceRepair) {
    setAnswers((current) => ({ ...current, [scenario]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenario];
      return next;
    });
    setRuntimeError(false);
  }

  function runRepair(scenario: SequenceDebuggerScenarioId) {
    const repair = answers[scenario];
    if (!repair) return;
    try {
      setResults((current) => ({
        ...current,
        [scenario]: evaluateSequenceRepair(scenario, repair),
      }));
      setRuntimeError(false);
    } catch {
      setRuntimeError(true);
    }
  }

  function resetScenario(scenario: SequenceDebuggerScenarioId) {
    setAnswers((current) => {
      const next = { ...current };
      delete next[scenario];
      return next;
    });
    setResults((current) => {
      const next = { ...current };
      delete next[scenario];
      return next;
    });
    setRuntimeError(false);
  }

  function resetAll() {
    setAnswers({});
    setResults({});
    setRuntimeError(false);
  }

  function recoverFromRuntimeError() {
    focusFirstAfterRecovery.current = true;
    resetAll();
  }

  return (
    <InteractiveLab
      className="sequences-debugger-lab"
      kicker={t("별도 활동 · SEQUENCE CONTRACT DEBUGGER", "SEPARATE ACTIVITY · SEQUENCE CONTRACT DEBUGGER")}
      title={t("계산으로 네 sequence 경계를 복구하세요", "Restore four sequence boundaries by computation")}
      description={t(
        "각 repair는 order sensitivity, causal prefix, LSTM cell update, output boundary를 실제 수치로 다시 실행합니다.",
        "Every repair recomputes order sensitivity, causal prefixes, the LSTM cell update, or its output boundary.",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={resetAll}>
          {t("debugger 전체 초기화", "Reset debugger")}
        </button>
      )}
    >
      <div
        className="sequences-debug-progress"
        data-interactive-ready="true"
      >
        <div>
          <span>{t("복구한 계약", "CONTRACTS RESTORED")}</span>
          <strong>{solved} / {sequenceDebuggerScenarioIds.length}</strong>
        </div>
        <span>{complete
          ? t("모든 sequence 경계가 결정적 검사를 통과했습니다.", "Every sequence boundary passed its deterministic check.")
          : t("오답은 깨진 state 경로와 원인을 즉시 설명합니다.", "Wrong repairs immediately explain the broken state path and cause.")}</span>
      </div>

      {runtimeError ? (
        <div className="sequences-runtime-fallback" role="alert">
          <strong>{t("로컬 debugger runtime 실패", "Local debugger runtime failure")}</strong>
          <p>{t(
            "계약 계산을 완료하지 못했습니다. 네트워크 없는 초기 상태로 돌아가 다시 실행하세요.",
            "The contract computation did not complete. Return to the network-free initial state and run again.",
          )}</p>
          <button type="button" className="button button-ghost" onClick={recoverFromRuntimeError}>
            {t("안전하게 초기화", "Reset safely")}
          </button>
        </div>
      ) : null}

      <div className="sequences-debug-grid">
        {sequenceDebuggerScenarioIds.map((scenario, index) => {
          const copy = scenarioCopy[scenario];
          const answer = answers[scenario] ?? "";
          const result = results[scenario];
          const feedbackId = `${scenario}-sequence-feedback`;
          return (
            <fieldset
              className={`sequences-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenario}
            >
              <legend>{copy.title[locale]}</legend>
              <p>{copy.clue[locale]}</p>
              <label>
                <span>{t("실행할 repair", "Repair to run")}</span>
                <select
                  ref={index === 0 ? firstSelectRef : undefined}
                  value={answer}
                  onChange={(event) => chooseRepair(scenario, event.currentTarget.value as SequenceRepair)}
                  aria-label={t(`${index + 1}번 sequence 사건 repair`, `Repair for sequence incident ${index + 1}`)}
                >
                  <option value="" disabled>{t("repair 선택", "Choose a repair")}</option>
                  {sequenceRepairOptions[scenario].map((repair) => (
                    <option value={repair} key={repair}>{repairCopy[repair][locale]}</option>
                  ))}
                </select>
              </label>
              <div className="sequences-debug-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  onClick={() => runRepair(scenario)}
                >
                  {t("repair 적용·계약 실행", "Apply repair and run contract")}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  aria-label={t(`${index + 1}번 sequence 사건 초기화`, `Reset sequence incident ${index + 1}`)}
                  onClick={() => resetScenario(scenario)}
                >
                  {t("사건 초기화", "Reset incident")}
                </button>
              </div>
              {result ? (
                <div className="sequences-debug-feedback" id={feedbackId} role="status" aria-live="polite" aria-atomic="true">
                  <strong>{result.correct ? t("계약 복구", "Contract restored") : t("결함이 남아 있습니다", "Failure remains")}</strong>
                  <p>{resultFeedback(scenario, result, locale)}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  evaluateMiniTransformerRepair,
  miniTransformerDebuggerScenarioIds,
  miniTransformerDebuggerScenarios,
  type MiniTransformerDebuggerScenarioId,
  type MiniTransformerRepair,
  type MiniTransformerRepairResult,
} from "../../features/mini-transformer/mini-transformer-model";
import { useLocale } from "../../features/localization/localization";
import { DirectChoice } from "../interactive/DirectChoice";
import { InteractiveLab } from "../interactive/InteractiveLab";

const incidentCopy: Record<MiniTransformerDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
}> = {
  "tokenizer-boundary": {
    title: { ko: "사건 01 · embedding 범위를 벗어난 ID 또는 시작 token이 보입니다", en: "Incident 01 · IDs leave the embedding range or the start token is missing" },
    clue: { ko: "문자를 임의의 숫자로 바꾸지 말고 고정 vocabulary lookup과 BOS 경계를 사용하세요.", en: "Use the fixed-vocabulary lookup and BOS boundary rather than arbitrary character numbers." },
  },
  "causal-attention": {
    title: { ko: "사건 02 · 미래 target이 prefix Attention으로 샙니다", en: "Incident 02 · Future targets leak into prefix attention" },
    clue: { ko: "미래 score를 Softmax 전에 차단하고 visible key의 row mass가 다시 1이 되는지 검사하세요.", en: "Block future scores before softmax and verify that visible-key row mass renormalizes to one." },
  },
  "vocab-probabilities": {
    title: { ko: "사건 03 · vocabulary 확률 또는 head update가 깨졌습니다", en: "Incident 03 · Vocabulary probabilities or the head update broke" },
    clue: { ko: "distinct final norm→d_model×V projection→row Softmax/shifted CE→gradient descent 순서를 실행하세요.", en: "Execute distinct final norm, d_model-by-V projection, row softmax/shifted CE, then gradient descent." },
  },
  "autoregressive-loop": {
    title: { ko: "사건 04 · 생성 prefix가 자라지 않거나 종료되지 않습니다", en: "Incident 04 · The generation prefix does not grow or stop" },
    clue: { ko: "last-row token을 append하고 전체 prefix를 다시 실행한 뒤 EOS 또는 maxNewTokens에서 멈추세요.", en: "Append the last-row token, rerun the full prefix, then stop at EOS or maxNewTokens." },
  },
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function resultFeedback(result: MiniTransformerRepairResult, locale: "ko" | "en") {
  const isKo = locale === "ko";
  const { metrics } = result;
  if (result.reason === "contract-restored") {
    if (result.scenarioId === "tokenizer-boundary") return isKo
      ? `BOS present=${metrics.bosPresent}, vocabulary ID valid=${metrics.vocabularyIdsValid}입니다. text→ID→embedding lookup 경계를 복구했습니다.`
      : `BOS present=${metrics.bosPresent} and vocabulary IDs valid=${metrics.vocabularyIdsValid}. The text-to-ID-to-embedding boundary is restored.`;
    if (result.scenarioId === "causal-attention") return isKo
      ? `미래 mass ${formatNumber(metrics.futureMass)}, visible row 최소 합 ${formatNumber(metrics.minimumRowSum)}입니다. mask-before-Softmax 계약이 통과했습니다.`
      : `Future mass is ${formatNumber(metrics.futureMass)} and minimum visible-row sum is ${formatNumber(metrics.minimumRowSum)}. The mask-before-softmax contract passed.`;
    if (result.scenarioId === "vocab-probabilities") return isKo
      ? `logits 폭 ${metrics.logitsColumns}, row 확률합 오차 ${formatNumber(metrics.maxProbabilityRowSumError)}, shifted target=${metrics.shiftedTargetsCorrect}, loss ${formatNumber(metrics.lossBefore)}→${formatNumber(metrics.lossAfter)}입니다.`
      : `Logit width is ${metrics.logitsColumns}, row-probability-sum error is ${formatNumber(metrics.maxProbabilityRowSumError)}, shifted targets=${metrics.shiftedTargetsCorrect}, and loss is ${formatNumber(metrics.lossBefore)} to ${formatNumber(metrics.lossAfter)}.`;
    return isKo
      ? `prefix 재실행 실패 ${metrics.prefixRecomputeFailures}, append 실패 ${metrics.appendFailures}, EOS stop=${metrics.eosStopped}, max respected=${metrics.maxLengthRespected}입니다.`
      : `Prefix-recompute failures=${metrics.prefixRecomputeFailures}, append failures=${metrics.appendFailures}, EOS stop=${metrics.eosStopped}, and max respected=${metrics.maxLengthRespected}.`;
  }
  if (result.reason === "outside-vocabulary") return isKo
    ? "character codepoint가 8-row embedding 범위를 벗어났습니다. 고정 vocabulary tokenizer로 ID를 만드세요."
    : "Character codepoints left the eight-row embedding range. Produce IDs with the fixed-vocabulary tokenizer.";
  if (result.reason === "bos-missing") return isKo
    ? "ID는 vocabulary 안이지만 첫 causal prefix에 BOS가 없습니다. prompt 앞에 BOS ID를 추가하세요."
    : "IDs are in vocabulary, but the first causal prefix has no BOS. Add the BOS ID before the prompt.";
  if (result.reason === "future-leak") return isKo
    ? `미래 Attention mass가 ${formatNumber(metrics.futureMass)}입니다. 미래 logit을 Softmax 전에 차단하세요.`
    : `Future attention mass is ${formatNumber(metrics.futureMass)}. Block future logits before softmax.`;
  if (result.reason === "row-mass-lost") return isKo
    ? `Softmax 뒤 미래 weight를 0으로 만들어 visible row 합이 ${formatNumber(metrics.minimumRowSum)}로 줄었습니다. mask 후 다시 정규화하세요.`
    : `Zeroing future weights after softmax reduced visible-row sum to ${formatNumber(metrics.minimumRowSum)}. Mask first, then normalize.`;
  if (result.reason === "wrong-softmax-axis") return isKo
    ? `row 확률합 최대 오차가 ${formatNumber(metrics.maxProbabilityRowSumError)}입니다. 각 prefix row 안의 vocabulary축으로 Softmax하세요.`
    : `Maximum row-probability-sum error is ${formatNumber(metrics.maxProbabilityRowSumError)}. Apply softmax over vocabulary within each prefix row.`;
  if (result.reason === "final-norm-skipped") return isKo
    ? `final norm applied=${metrics.finalNormApplied}입니다. block의 LN2와 별도인 final LayerNorm을 LM head 앞에 복구하세요.`
    : `Final norm applied=${metrics.finalNormApplied}. Restore the final LayerNorm, distinct from the block's LN2, before the LM head.`;
  if (result.reason === "loss-increased") return isKo
    ? `loss가 ${formatNumber(metrics.lossBefore)}→${formatNumber(metrics.lossAfter)}로 움직였습니다. gradient를 더하지 말고 learning-rate를 곱해 빼세요.`
    : `Loss moved from ${formatNumber(metrics.lossBefore)} to ${formatNumber(metrics.lossAfter)}. Subtract the learning-rate-scaled gradient rather than adding it.`;
  if (result.reason === "prefix-not-recomputed") return isKo
    ? `prefix 재실행 실패가 ${metrics.prefixRecomputeFailures}회입니다. 이 fixture에는 cache가 없으므로 append된 전체 prefix를 다시 실행하세요.`
    : `There are ${metrics.prefixRecomputeFailures} prefix-recompute failures. This fixture has no cache, so rerun the complete appended prefix.`;
  if (result.reason === "token-not-appended") return isKo
    ? `append 실패가 ${metrics.appendFailures}회입니다. 마지막 token을 교체하지 말고 prefix 길이를 한 칸 늘리세요.`
    : `There are ${metrics.appendFailures} append failures. Grow the prefix by one rather than replacing its last token.`;
  return isKo
    ? `EOS stop=${metrics.eosStopped}입니다. EOS와 maxNewTokens를 독립적인 두 종료 조건으로 검사하세요.`
    : `EOS stop=${metrics.eosStopped}. Check EOS and maxNewTokens as two independent stopping conditions.`;
}

export function MiniTransformerDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<MiniTransformerDebuggerScenarioId, MiniTransformerRepair>>>({});
  const [results, setResults] = useState<Partial<Record<MiniTransformerDebuggerScenarioId, MiniTransformerRepairResult>>>({});
  const [runtimeFailure, setRuntimeFailure] = useState<MiniTransformerDebuggerScenarioId | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  const runButtonRefs = useRef<Partial<Record<MiniTransformerDebuggerScenarioId, HTMLButtonElement | null>>>({});
  const focusRunAfterRecovery = useRef<MiniTransformerDebuggerScenarioId | null>(null);
  const solved = miniTransformerDebuggerScenarioIds.filter((scenarioId) => results[scenarioId]?.correct).length;
  const complete = solved === miniTransformerDebuggerScenarioIds.length;

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange?.(complete), [complete, onCompletionChange]);
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

  function chooseRepair(scenarioId: MiniTransformerDebuggerScenarioId, repair: MiniTransformerRepair) {
    setAnswers((current) => ({ ...current, [scenarioId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    if (runtimeFailure === scenarioId) setRuntimeFailure(null);
  }

  function runRepair(scenarioId: MiniTransformerDebuggerScenarioId) {
    const repair = answers[scenarioId];
    if (!repair) return;
    try {
      setResults((current) => ({ ...current, [scenarioId]: evaluateMiniTransformerRepair(scenarioId, repair) }));
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

  function resetScenario(scenarioId: MiniTransformerDebuggerScenarioId) {
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
      className="mini-transformer-debugger-lab"
      kicker={t("별도 활동 · COMPLETE MODEL REPAIR CONSOLE", "SEPARATE ACTIVITY · COMPLETE MODEL REPAIR CONSOLE")}
      title={t("실행 결과로 네 Mini Transformer 경계를 수리하세요", "Repair four Mini Transformer boundaries from executed results")}
      description={t("각 repair는 같은 tiny fixture에 후보 조립을 실제 적용합니다. tokenizer·causality·LM head·decode invariant가 의미론적으로 맞아야 통과합니다.", "Each repair executes a candidate assembly on the same tiny fixture. Tokenizer, causality, LM-head, and decoding invariants must be semantically correct to pass.")}
      actions={<button type="button" className="button button-ghost" aria-label={t("Mini Transformer debugger 전체 초기화", "Reset the entire Mini Transformer debugger")} onClick={resetAll}>{t("fixture·debugger 초기화", "Reset fixture and debugger")}</button>}
    >
      <div className="mini-transformer-debug-progress" data-interactive-ready={interactiveReady ? "true" : "false"} role="status" aria-live="polite" aria-atomic="true" aria-label={t(`복구한 Mini Transformer 경계 ${solved} / ${miniTransformerDebuggerScenarioIds.length}`, `${solved} of ${miniTransformerDebuggerScenarioIds.length} Mini Transformer boundaries restored`)}>
        <div><span>{t("복구한 경계", "BOUNDARIES RESTORED")}</span><strong>{solved} / {miniTransformerDebuggerScenarioIds.length}</strong></div>
        <span>{complete ? t("tokenizer·causal block·LM head·decode loop가 모두 결정적 검사를 통과했습니다.", "Tokenizer, causal block, LM head, and decoding loop all passed deterministic checks.") : t("오답은 계산된 invariant와 다음 수리 방향을 설명합니다.", "Wrong repairs explain the computed invariant and next repair direction.")}</span>
      </div>

      {runtimeFailure ? <div className="mini-transformer-runtime-fallback" role="alert"><strong>{t("로컬 Mini Transformer debugger runtime 실패", "Local Mini Transformer debugger runtime failure")}</strong><p>{t("해당 후보를 결정적으로 계산하지 못했습니다. 다른 사건의 결과를 보존한 채 이 사건의 실행 버튼으로 돌아갑니다.", "This candidate could not be computed deterministically. Results from other incidents are preserved while you return to this incident's run button.")}</p><button ref={recoveryButtonRef} type="button" className="button button-secondary" onClick={recoverRuntime}>{t("기본 fixture로 안전하게 복귀", "Return safely to the default fixture")}</button></div> : null}

      <div className="mini-transformer-debug-grid">
        {miniTransformerDebuggerScenarioIds.map((scenarioId, index) => {
          const scenario = miniTransformerDebuggerScenarios[scenarioId];
          const copy = incidentCopy[scenarioId];
          const answer = answers[scenarioId] ?? "";
          const result = results[scenarioId];
          const clueId = `${scenarioId}-mini-transformer-clue`;
          const feedbackId = `${scenarioId}-mini-transformer-feedback`;
          return (
            <fieldset className={`mini-transformer-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`} data-mini-transformer-incident={scenarioId} key={scenarioId}>
              <legend>{isKo ? copy.title.ko : copy.title.en}</legend>
              <p id={clueId}>{isKo ? copy.clue.ko : copy.clue.en}</p>
              <DirectChoice
                label={t(`${index + 1}번 Mini Transformer 사건 repair`, `Mini Transformer incident ${index + 1} repair`)}
                value={answer}
                options={scenario.options.map((option) => ({ value: option.id, label: isKo ? option.labelKo : option.labelEn }))}
                onChange={(value) => chooseRepair(scenarioId, value as MiniTransformerRepair)}
              />
              <div className="mini-transformer-debug-actions">
                <button ref={(element) => { runButtonRefs.current[scenarioId] = element; }} type="button" className="button button-primary" disabled={!answer} aria-label={t(`${index + 1}번 Mini Transformer repair 실행`, `Run Mini Transformer repair ${index + 1}`)} onClick={() => runRepair(scenarioId)}>{t("후보 실행 · invariant 검사", "Run candidate · check invariants")}</button>
                <button type="button" className="button button-secondary" aria-label={t(`${index + 1}번 Mini Transformer 사건 초기화`, `Reset Mini Transformer incident ${index + 1}`)} onClick={() => resetScenario(scenarioId)}>{t("사건 초기화", "Reset incident")}</button>
              </div>
              <div id={feedbackId} className={`mini-transformer-debug-feedback${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite" aria-atomic="true"><strong>{result ? result.correct ? t("계약 복구", "Contract restored") : t("계약 불일치", "Contract mismatch") : t("실행 대기", "Waiting to run")}</strong><p>{result ? resultFeedback(result, locale) : t("repair를 고른 뒤 실제 tiny-model invariant를 계산하세요.", "Choose a repair, then compute the actual tiny-model invariants.")}</p></div>
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

import { useEffect, useRef, useState } from "react";
import {
  evaluateTransformerBlockRepair,
  transformerBlockDebuggerScenarioIds,
  transformerBlockDebuggerScenarios,
  type TransformerBlockDebuggerScenarioId,
  type TransformerBlockRepair,
  type TransformerBlockRepairResult,
} from "../../features/transformer-block/transformer-block-model";
import { useLocale } from "../../features/localization/localization";
import { DirectChoice } from "../interactive/DirectChoice";
import { InteractiveLab } from "../interactive/InteractiveLab";

const incidentCopy: Record<TransformerBlockDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
}> = {
  "position-placement": {
    title: {
      ko: "사건 01 · 같은 token의 순서를 구분하지 못합니다",
      en: "Incident 01 · Identical tokens cannot be ordered",
    },
    clue: {
      ko: "이 fixture의 absolute sinusoidal P는 embedding과 같은 [T,d_model] shape로 첫 norm 전에 한 번 더해져야 합니다.",
      en: "In this fixture, absolute sinusoidal P must be added once to the same-shaped embeddings before the first normalization.",
    },
  },
  "layernorm-contract": {
    title: {
      ko: "사건 02 · token row의 정규화 통계가 깨졌습니다",
      en: "Incident 02 · Per-token normalization statistics broke",
    },
    clue: {
      ko: "각 token 안의 feature축을 정규화하고 작은 분산에서도 유한한 값을 보장해야 합니다.",
      en: "Normalize the feature axis within each token and keep values finite even for tiny variance.",
    },
  },
  "attention-residual": {
    title: {
      ko: "사건 03 · 첫 skip path가 원래 state를 잃었습니다",
      en: "Incident 03 · The first skip path lost the original state",
    },
    clue: {
      ko: "Attention은 LN(x₀)를 읽지만 branch 출력은 정규화 전의 x₀에 더해야 합니다.",
      en: "Attention reads LN(x0), but its branch output must be added to the pre-normalization x0.",
    },
  },
  "ffn-second-skip": {
    title: {
      ko: "사건 04 · FFN이 token 독립성 또는 두 번째 skip을 잃었습니다",
      en: "Incident 04 · The FFN lost token independence or the second skip",
    },
    clue: {
      ko: "같은 ReLU MLP를 row마다 독립 적용한 뒤 그 결과를 x₁에 더해야 합니다.",
      en: "Apply the same ReLU MLP independently to every row, then add its result to x1.",
    },
  },
};

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return String(value);
  if (Math.abs(value) < 0.0001 && value !== 0) return value.toExponential(2);
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function resultFeedback(result: TransformerBlockRepairResult, locale: "ko" | "en") {
  const isKo = locale === "ko";
  const { metrics } = result;

  if (result.reason === "contract-restored") {
    if (result.scenarioId === "position-placement") {
      return isKo
        ? `E+P 입력 오차 ${formatNumber(metrics.positionInputError)}, canonical block 출력 오차 ${formatNumber(metrics.positionOutputError)}입니다. position을 첫 norm 전에 한 번 더하는 경계를 복구했습니다.`
        : `E+P input error is ${formatNumber(metrics.positionInputError)} and canonical block-output error is ${formatNumber(metrics.positionOutputError)}. Position is restored once before the first normalization.`;
    }
    if (result.scenarioId === "layernorm-contract") {
      return isKo
        ? `row mean 최대 절댓값 ${formatNumber(metrics.maxRowMean)}, variance 계약 오차 ${formatNumber(metrics.maxVarianceContractError)}, epsilon ${formatNumber(metrics.epsilon)}, tiny-variance probe 비유한값 ${metrics.nonFiniteStabilityValues}개입니다.`
        : `Maximum absolute row mean is ${formatNumber(metrics.maxRowMean)}, variance-contract error is ${formatNumber(metrics.maxVarianceContractError)}, epsilon is ${formatNumber(metrics.epsilon)}, and the tiny-variance probe has ${metrics.nonFiniteStabilityValues} non-finite values.`;
    }
    if (result.scenarioId === "attention-residual") {
      return isKo
        ? `x₀+MHA(LN(x₀))와의 최대 오차가 ${formatNumber(metrics.firstResidualError)}입니다. 정규화 branch와 원래 skip 기준을 분리했습니다.`
        : `Maximum error against x0+MHA(LN(x0)) is ${formatNumber(metrics.firstResidualError)}. The normalized branch and original skip base are separated.`;
    }
    return isKo
      ? `순열 오차 ${formatNumber(metrics.ffnPermutationError)}, 다른 row 누출 ${formatNumber(metrics.ffnIsolationLeak)}, 두 번째 residual 오차 ${formatNumber(metrics.secondResidualError)}이며 출력은 [${metrics.outputRows},${metrics.outputColumns}]입니다.`
      : `Permutation error is ${formatNumber(metrics.ffnPermutationError)}, other-row leakage is ${formatNumber(metrics.ffnIsolationLeak)}, second-residual error is ${formatNumber(metrics.secondResidualError)}, and output shape is [${metrics.outputRows},${metrics.outputColumns}].`;
  }

  if (result.reason === "position-missing") {
    return isKo
      ? `position 입력 오차 ${formatNumber(metrics.positionInputError)}, 실행 출력 오차 ${formatNumber(metrics.positionOutputError)}입니다. causal mask는 absolute position vector를 만들지 않으므로 E와 P를 먼저 더하세요.`
      : `Position-input error is ${formatNumber(metrics.positionInputError)} and executed-output error is ${formatNumber(metrics.positionOutputError)}. A causal mask does not create an absolute position vector, so add E and P first.`;
  }
  if (result.reason === "position-added-too-late") {
    return isKo
      ? `P를 block 출력에 실제 더해도 입력 오차 ${formatNumber(metrics.positionInputError)}, canonical 출력 오차 ${formatNumber(metrics.positionOutputError)}가 남습니다. Attention과 FFN이 위치를 읽도록 첫 norm 전으로 옮기세요.`
      : `Even after actually adding P to the block output, input error is ${formatNumber(metrics.positionInputError)} and canonical-output error is ${formatNumber(metrics.positionOutputError)}. Move it before the first normalization so attention and the FFN can read position.`;
  }
  if (result.reason === "wrong-normalization-axis") {
    return isKo
      ? `token축 정규화 뒤 token row mean 최대 절댓값이 ${formatNumber(metrics.maxRowMean)}입니다. 각 row 안의 d_model feature축으로 통계를 다시 계산하세요.`
      : `After token-axis normalization, the maximum absolute token-row mean is ${formatNumber(metrics.maxRowMean)}. Recompute statistics over d_model features within each row.`;
  }
  if (result.reason === "epsilon-removed") {
    return isKo
      ? `epsilon ${formatNumber(metrics.epsilon)}에서 constant/tiny-variance probe의 최소 분모가 ${formatNumber(metrics.minimumStabilityDenominator)}, 비유한 출력이 ${metrics.nonFiniteStabilityValues}개입니다. epsilon을 분모 안에 복구하세요.`
      : `With epsilon ${formatNumber(metrics.epsilon)}, the constant/tiny-variance probe has minimum denominator ${formatNumber(metrics.minimumStabilityDenominator)} and ${metrics.nonFiniteStabilityValues} non-finite outputs. Restore epsilon inside the denominator.`;
  }
  if (result.reason === "input-skip-dropped") {
    return isKo
      ? `첫 residual 오차가 ${formatNumber(metrics.firstResidualError)}입니다. Attention 출력으로 stream을 교체하지 말고 원래 x₀에 더하세요.`
      : `First-residual error is ${formatNumber(metrics.firstResidualError)}. Do not replace the stream with attention output; add it to the original x0.`;
  }
  if (result.reason === "normalized-skip-used") {
    return isKo
      ? `첫 residual 오차가 ${formatNumber(metrics.firstResidualError)}입니다. LN(x₀)는 branch 입력일 뿐 skip 기준이 아니므로 원래 x₀를 사용하세요.`
      : `First-residual error is ${formatNumber(metrics.firstResidualError)}. LN(x0) is the branch input, not the skip base; use the original x0.`;
  }
  if (result.reason === "position-specific-parameters") {
    return isKo
      ? `position별 parameter 때문에 row 순열 오차가 ${formatNumber(metrics.ffnPermutationError)}입니다. 모든 row에 같은 W₁,b₁,W₂,b₂를 공유하세요.`
      : `Per-position parameters produced row-permutation error ${formatNumber(metrics.ffnPermutationError)}. Share the same W1, b1, W2, and b2 across every row.`;
  }
  if (result.reason === "second-skip-dropped") {
    return isKo
      ? `두 번째 residual 오차가 ${formatNumber(metrics.secondResidualError)}입니다. FFN output으로 x₁을 교체하지 말고 같은 좌표끼리 더하세요.`
      : `Second-residual error is ${formatNumber(metrics.secondResidualError)}. Do not replace x1 with the FFN output; add matching coordinates.`;
  }
  return isKo
    ? `ReLU를 우회해 음수 hidden을 포함한 row가 ${metrics.negativeHiddenCount}개입니다. 두 선형층 사이의 ReLU를 실행한 뒤 x₁ skip을 더하세요.`
    : `Bypassing ReLU left negative hidden values in ${metrics.negativeHiddenCount} rows. Run ReLU between the two linear layers, then add the x1 skip.`;
}

export function TransformerBlockDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<TransformerBlockDebuggerScenarioId, TransformerBlockRepair>>>({});
  const [results, setResults] = useState<Partial<Record<TransformerBlockDebuggerScenarioId, TransformerBlockRepairResult>>>({});
  const [runtimeFailure, setRuntimeFailure] = useState<TransformerBlockDebuggerScenarioId | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);
  const runButtonRefs = useRef<Partial<Record<TransformerBlockDebuggerScenarioId, HTMLButtonElement | null>>>({});
  const focusRunAfterRecovery = useRef<TransformerBlockDebuggerScenarioId | null>(null);
  const solved = transformerBlockDebuggerScenarioIds.filter((scenarioId) => results[scenarioId]?.correct).length;
  const complete = solved === transformerBlockDebuggerScenarioIds.length;

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

  function chooseRepair(scenarioId: TransformerBlockDebuggerScenarioId, repair: TransformerBlockRepair) {
    setAnswers((current) => ({ ...current, [scenarioId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenarioId];
      return next;
    });
    if (runtimeFailure === scenarioId) setRuntimeFailure(null);
  }

  function runRepair(scenarioId: TransformerBlockDebuggerScenarioId) {
    const repair = answers[scenarioId];
    if (!repair) return;
    try {
      setResults((current) => ({ ...current, [scenarioId]: evaluateTransformerBlockRepair(scenarioId, repair) }));
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

  function resetScenario(scenarioId: TransformerBlockDebuggerScenarioId) {
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
      className="transformer-block-debugger-lab"
      kicker={t("별도 활동 · PRE-NORM BLOCK REPAIR CONSOLE", "SEPARATE ACTIVITY · PRE-NORM BLOCK REPAIR CONSOLE")}
      title={t("실행 결과로 네 Transformer block 계약을 수리하세요", "Repair four Transformer block contracts from executed results")}
      description={t(
        "각 repair는 같은 4-token fixture에 후보 조립을 실제 적용합니다. position·LayerNorm·residual·row-wise FFN invariant가 의미론적으로 맞아야 통과합니다.",
        "Each repair executes a candidate assembly on the same four-token fixture. Position, LayerNorm, residual, and row-wise FFN invariants must be semantically correct to pass.",
      )}
      actions={<button type="button" className="button button-ghost" aria-label={t("Transformer block debugger 전체 초기화", "Reset the entire Transformer block debugger")} onClick={resetAll}>{t("fixture·debugger 초기화", "Reset fixture and debugger")}</button>}
    >
      <div
        className="transformer-block-debug-progress"
        data-interactive-ready={interactiveReady ? "true" : "false"}
        role="status"
        aria-live="polite"
        aria-atomic="true"
        aria-label={t(`복구한 Transformer block 계약 ${solved} / ${transformerBlockDebuggerScenarioIds.length}`, `${solved} of ${transformerBlockDebuggerScenarioIds.length} Transformer block contracts restored`)}
      >
        <div><span>{t("복구한 계약", "CONTRACTS RESTORED")}</span><strong>{solved} / {transformerBlockDebuggerScenarioIds.length}</strong></div>
        <span>{complete
          ? t("position·normalization·두 residual·FFN 계약이 모두 결정적 검사를 통과했습니다.", "Position, normalization, both residuals, and FFN contracts passed deterministic checks.")
          : t("오답은 계산된 오차와 다음 수리 방향을 설명합니다.", "Wrong repairs explain the computed error and next repair direction.")}</span>
      </div>

      {runtimeFailure ? <div className="transformer-block-runtime-fallback" role="alert">
        <strong>{t("로컬 Transformer block debugger runtime 실패", "Local Transformer block debugger runtime failure")}</strong>
        <p>{t("해당 후보를 결정적으로 계산하지 못했습니다. 다른 사건의 결과를 보존한 채 이 사건의 실행 버튼으로 돌아갑니다.", "This candidate could not be computed deterministically. Results from other incidents are preserved while you return to this incident's run button.")}</p>
        <button ref={recoveryButtonRef} type="button" className="button button-secondary" onClick={recoverRuntime}>{t("기본 fixture로 안전하게 복귀", "Return safely to the default fixture")}</button>
      </div> : null}

      <div className="transformer-block-debug-grid">
        {transformerBlockDebuggerScenarioIds.map((scenarioId, index) => {
          const scenario = transformerBlockDebuggerScenarios[scenarioId];
          const copy = incidentCopy[scenarioId];
          const answer = answers[scenarioId] ?? "";
          const result = results[scenarioId];
          const clueId = `${scenarioId}-transformer-block-clue`;
          const feedbackId = `${scenarioId}-transformer-block-feedback`;
          return (
            <fieldset
              className={`transformer-block-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? `${clueId} ${feedbackId}` : clueId}
              data-scenario-id={scenarioId}
              data-repair-result={result ? result.correct ? "correct" : "incorrect" : "pending"}
              key={scenarioId}
            >
              <legend>{copy.title[locale]}</legend>
              <p id={clueId}>{copy.clue[locale]}</p>
              <DirectChoice
                label={t(`${index + 1}번 Transformer block 사건 repair`, `Repair for Transformer block incident ${index + 1}`)}
                value={answer}
                options={scenario.options.map((option) => ({ value: option.id, label: option[isKo ? "labelKo" : "labelEn"] }))}
                onChange={(value) => chooseRepair(scenarioId, value as TransformerBlockRepair)}
              />
              <div className="transformer-block-debug-actions">
                <button
                  ref={(node) => { runButtonRefs.current[scenarioId] = node; }}
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  aria-label={t(`${index + 1}번 Transformer block 사건 repair 적용 및 계약 실행`, `Apply repair and run contract for Transformer block incident ${index + 1}`)}
                  onClick={() => runRepair(scenarioId)}
                >{t("repair 적용·계약 실행", "Apply repair and run contract")}</button>
                <button type="button" className="button button-ghost" aria-label={t(`${index + 1}번 Transformer block 사건 초기화`, `Reset Transformer block incident ${index + 1}`)} onClick={() => resetScenario(scenarioId)}>{t("사건 초기화", "Reset incident")}</button>
              </div>
              {result ? <div id={feedbackId} className={`transformer-block-debug-feedback ${result.correct ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite" aria-atomic="true">
                <strong>{result.correct ? t("계약 복구", "Contract restored") : t("결함이 남아 있습니다", "Failure remains")}</strong>
                <p>{resultFeedback(result, locale)}</p>
              </div> : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

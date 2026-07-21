import { useEffect, useMemo, useRef, useState } from "react";
import {
  evaluateSequenceLabMastery,
  gradeSequencePrediction,
  runSequenceTrace,
  sequencePresetIds,
  sequencePresets,
  type SequenceCellKind,
  type SequencePrediction,
  type SequencePresetId,
} from "../../features/sequences/sequence-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { DirectChoice } from "../interactive/DirectChoice";

type SequenceTrace = ReturnType<typeof runSequenceTrace>;

type SequenceEvidence = {
  correctOrderPrediction: boolean;
  rnnDecayObserved: boolean;
  lstmRetentionObserved: boolean;
  stepInspected: boolean;
};

type LabFeedback =
  | { kind: "idle" }
  | { kind: "preset"; preset: SequencePresetId }
  | { kind: "cell"; cellKind: SequenceCellKind }
  | { kind: "missing-prediction" }
  | {
      kind: "prediction";
      correct: boolean;
      predicted: SequencePrediction;
      actual: SequencePrediction;
      finalHidden: number;
      signalGradient: number;
      signalCellGradient: number | null;
      evidenceEligible: boolean;
    }
  | {
      kind: "step";
      index: number;
      hidden: number;
      hiddenGradient: number;
      cellGradient: number | null;
      inspectedCount: number;
    }
  | { kind: "retry" }
  | { kind: "reset" };

type RuntimeErrorKind = "gain-contract" | "calculation";

const EMPTY_EVIDENCE: SequenceEvidence = {
  correctOrderPrediction: false,
  rnnDecayObserved: false,
  lstmRetentionObserved: false,
  stepInspected: false,
};

const predictionOrder: readonly SequencePrediction[] = ["retained", "faded", "reversed"];

const presetCopy: Record<SequencePresetId, { ko: string; en: string }> = {
  "short-gap": { ko: "짧은 간격", en: "Short gap" },
  "long-gap": { ko: "긴 간격", en: "Long gap" },
  reversed: { ko: "순서 뒤집기", en: "Reverse order" },
};

const predictionCopy: Record<SequencePrediction, { ko: string; en: string }> = {
  retained: { ko: "초기 신호가 유지된다", en: "The early signal is retained" },
  faded: { ko: "초기 신호가 거의 사라진다", en: "The early signal fades near zero" },
  reversed: { ko: "최종 상태의 방향이 뒤집힌다", en: "The final state reverses direction" },
};

const knownTokenCopy: Record<string, { ko: string; en: string }> = {
  signal: { ko: "기억할 신호", en: "signal to remember" },
  "positive-signal": { ko: "양의 신호", en: "positive signal" },
  "negative-signal": { ko: "음의 신호", en: "negative signal" },
  distractor: { ko: "방해 입력", en: "distractor" },
  filler: { ko: "빈 간격", en: "gap filler" },
  query: { ko: "기억 조회", en: "memory query" },
};

function format(value: number) {
  if (!Number.isFinite(value)) return "—";
  return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function tokenLabel(tokenId: string, input: number, locale: "ko" | "en") {
  const gap = /^gap-(\d+)$/.exec(tokenId)?.[1];
  const copy = knownTokenCopy[tokenId]?.[locale]
    ?? (gap ? locale === "ko" ? `빈 간격 ${gap}` : `gap filler ${gap}` : tokenId.replaceAll("-", " "));
  return `${copy} · x=${format(input)}`;
}

function feedbackText(feedback: LabFeedback, locale: "ko" | "en") {
  const isKo = locale === "ko";
  if (feedback.kind === "preset") {
    return isKo
      ? `${presetCopy[feedback.preset].ko} preset을 불러왔습니다. 결과를 실행하기 전에 final state를 예측하세요.`
      : `${presetCopy[feedback.preset].en} preset loaded. Predict the final state before running it.`;
  }
  if (feedback.kind === "cell") {
    return isKo
      ? `${feedback.cellKind === "rnn" ? "단순 RNN" : "LSTM"} recurrence를 선택했습니다. 같은 sequence에서 기억 경로가 어떻게 달라질지 예측하세요.`
      : `${feedback.cellKind === "rnn" ? "Vanilla RNN" : "LSTM"} recurrence selected. Predict how its memory path changes on the same sequence.`;
  }
  if (feedback.kind === "missing-prediction") {
    return isKo
      ? "실행 전에 final state 예측을 선택하세요. 공개된 trace를 본 뒤 고르는 답은 증거가 되지 않습니다."
      : "Choose a final-state prediction before running. An answer chosen after seeing the trace does not count as evidence.";
  }
  if (feedback.kind === "prediction") {
    const outcome = predictionCopy[feedback.actual][locale];
    const sensitivities = feedback.signalCellGradient === null
      ? `∂h_final/∂x_signal=${format(feedback.signalGradient)}`
      : `∂c_final/∂x_signal=${format(feedback.signalCellGradient)}, ∂h_final/∂x_signal=${format(feedback.signalGradient)}`;
    const numbers = `h_final=${format(feedback.finalHidden)}, ${sensitivities}`;
    if (feedback.correct) {
      if (!feedback.evidenceEligible) {
        return isKo
          ? `예측 확인: ${outcome}. ${numbers}. 하지만 이미 결과를 본 동일 설정이라 연습 기록입니다. gain·preset·cell 중 하나를 바꾼 전이 예측으로 증거를 만드세요.`
          : `Prediction confirmed: ${outcome}. ${numbers}. This exact setup was already revealed, so it is practice only. Change the gain, preset, or cell and make a transfer prediction for evidence.`;
      }
      return isKo
        ? `예측 확인: ${outcome}. ${numbers}. 이제 서로 다른 timestep 두 개를 골라 기억 경로를 비교하세요.`
        : `Prediction confirmed: ${outcome}. ${numbers}. Now choose two different timesteps and compare the memory path.`;
    }
    return isKo
      ? `예측 수정 필요: 실제로는 “${outcome}”입니다. ${numbers}. 이 설정의 결과는 공개되어 연습용이 되었습니다. 수치를 비교한 뒤 변수를 바꿔 전이 예측하세요.`
      : `Prediction needs revision: the actual outcome is “${outcome}.” ${numbers}. This setup is now revealed and practice-only. Compare the values, then change a variable for a transfer prediction.`;
  }
  if (feedback.kind === "step") {
    const gradients = feedback.cellGradient === null
      ? `∂h/∂x_signal=${format(feedback.hiddenGradient)}`
      : `∂c/∂x_signal=${format(feedback.cellGradient)}, ∂h/∂x_signal=${format(feedback.hiddenGradient)}`;
    if (feedback.inspectedCount < 2) {
      return isKo
        ? `t${feedback.index} 검사: hidden=${format(feedback.hidden)}, ${gradients}. 비교를 위해 다른 timestep 하나를 더 고르세요.`
        : `Inspected t${feedback.index}: hidden=${format(feedback.hidden)}, ${gradients}. Choose one different timestep to make a comparison.`;
    }
    return isKo
      ? `t${feedback.index} 검사: hidden=${format(feedback.hidden)}, ${gradients}. 서로 다른 두 timestep 비교를 기록했습니다.`
      : `Inspected t${feedback.index}: hidden=${format(feedback.hidden)}, ${gradients}. Recorded a comparison across two different timesteps.`;
  }
  if (feedback.kind === "retry") {
    return isKo
      ? "현재 실행만 지웠습니다. 이미 공개된 동일 설정은 연습용입니다. gain·preset·cell 중 하나를 바꾸면 새 전이 예측 증거가 됩니다."
      : "Cleared only the current run. An already revealed setup is practice-only; change the gain, preset, or cell for new transfer evidence.";
  }
  if (feedback.kind === "reset") {
    return isKo
      ? "lab 증거를 초기화했습니다. 이미 공개된 정확한 설정은 계속 연습용이므로 변수를 바꿔 다시 예측하세요."
      : "Lab evidence reset. Exact setups already revealed remain practice-only, so change a variable before predicting again.";
  }
  return isKo
    ? "긴 간격에서 단순 RNN과 LSTM의 final state를 각각 예측하고 timestep 기억 경로를 검사하세요."
    : "Predict final state for both vanilla RNN and LSTM across a long gap, then inspect a timestep memory path.";
}

export function SequenceMemoryLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [preset, setPreset] = useState<SequencePresetId>("long-gap");
  const [cellKind, setCellKind] = useState<SequenceCellKind>("rnn");
  const [recurrentGain, setRecurrentGain] = useState("0.5");
  const [prediction, setPrediction] = useState<SequencePrediction | "">("");
  const [trace, setTrace] = useState<SequenceTrace | null>(null);
  const [selectedStep, setSelectedStep] = useState<number | null>(null);
  const [inspectedSteps, setInspectedSteps] = useState<readonly number[]>([]);
  const [evidence, setEvidence] = useState<SequenceEvidence>(EMPTY_EVIDENCE);
  const [feedback, setFeedback] = useState<LabFeedback>({ kind: "idle" });
  const [runtimeError, setRuntimeError] = useState<RuntimeErrorKind | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const predictionRef = useRef<HTMLDivElement>(null);
  const focusPredictionAfterRecovery = useRef(false);
  const revealedSetups = useRef(new Set<string>());
  const mastery = useMemo(() => evaluateSequenceLabMastery(evidence), [evidence]);
  const selected = trace && selectedStep !== null ? trace.steps[selectedStep] ?? null : null;
  const presetTokens = sequencePresets[preset].tokens;

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange?.(mastery.mastered);
  }, [mastery.mastered, onCompletionChange]);

  useEffect(() => {
    if (!runtimeError && focusPredictionAfterRecovery.current) {
      focusPredictionAfterRecovery.current = false;
      predictionRef.current?.focus();
    }
  }, [runtimeError]);

  function clearRun(nextFeedback: LabFeedback) {
    setPrediction("");
    setTrace(null);
    setSelectedStep(null);
    setInspectedSteps([]);
    setRuntimeError(null);
    setFeedback(nextFeedback);
  }

  function choosePreset(nextPreset: SequencePresetId) {
    setPreset(nextPreset);
    clearRun({ kind: "preset", preset: nextPreset });
  }

  function chooseCellKind(nextCellKind: SequenceCellKind) {
    setCellKind(nextCellKind);
    if (nextCellKind === "lstm") setRecurrentGain("0.5");
    clearRun({ kind: "cell", cellKind: nextCellKind });
  }

  function resetRun() {
    clearRun({ kind: "retry" });
  }

  function resetLab() {
    setPreset("long-gap");
    setCellKind("rnn");
    setRecurrentGain("0.5");
    setEvidence(EMPTY_EVIDENCE);
    clearRun({ kind: "reset" });
  }

  function recoverFromRuntimeError() {
    focusPredictionAfterRecovery.current = true;
    resetLab();
  }

  function runSequence() {
    if (!prediction) {
      setFeedback({ kind: "missing-prediction" });
      return;
    }
    try {
      const resolvedGain = cellKind === "rnn" ? Number(recurrentGain) : 0.5;
      const nextTrace = runSequenceTrace(preset, cellKind, resolvedGain);
      const result = gradeSequencePrediction(nextTrace, prediction);
      const setupKey = `${preset}:${cellKind}:${cellKind === "rnn" ? resolvedGain : "gated"}`;
      const evidenceEligible = !revealedSetups.current.has(setupKey);
      revealedSetups.current.add(setupKey);
      setTrace(nextTrace);
      setSelectedStep(null);
      setInspectedSteps([]);
      setRuntimeError(null);
      setFeedback({
        kind: "prediction",
        correct: result.correct,
        predicted: prediction,
        actual: nextTrace.outcome,
        finalHidden: nextTrace.finalHidden,
        signalGradient: nextTrace.signalGradient,
        signalCellGradient: nextTrace.signalCellGradient,
        evidenceEligible,
      });
      if (result.correct && evidenceEligible) {
        setEvidence((current) => ({
          ...current,
          correctOrderPrediction: current.correctOrderPrediction || preset === "reversed",
          rnnDecayObserved: current.rnnDecayObserved || (
            preset === "long-gap" && cellKind === "rnn" && nextTrace.outcome === "faded"
          ),
          lstmRetentionObserved: current.lstmRetentionObserved || (
            (
              preset === "long-gap"
                || (
                  preset === "short-gap"
                    && revealedSetups.current.has("long-gap:lstm:gated")
                )
            )
              && cellKind === "lstm"
              && nextTrace.outcome === "retained"
          ),
        }));
      }
    } catch {
      setTrace(null);
      const parsedGain = Number(recurrentGain);
      setRuntimeError(
        Number.isFinite(parsedGain) && parsedGain > 0 && parsedGain <= 1
          ? "calculation"
          : "gain-contract",
      );
    }
  }

  function inspectStep(index: number) {
    const step = trace?.steps[index];
    if (!step) return;
    const nextInspectedSteps = inspectedSteps.includes(index)
      ? inspectedSteps
      : [...inspectedSteps, index];
    setSelectedStep(index);
    setInspectedSteps(nextInspectedSteps);
    if (nextInspectedSteps.length >= 2) {
      setEvidence((current) => ({ ...current, stepInspected: true }));
    }
    setFeedback({
      kind: "step",
      index: step.index,
      hidden: step.hidden,
      hiddenGradient: step.gradientToSignal,
      cellGradient: step.cellGradientToSignal,
      inspectedCount: nextInspectedSteps.length,
    });
  }

  return (
    <InteractiveLab
      className="sequences-memory-lab"
      kicker={t("필수 LAB · ORDER → STATE → MEMORY", "REQUIRED LAB · ORDER → STATE → MEMORY")}
      title={t("같은 입력도 순서와 recurrence에 따라 다른 기억이 됩니다", "The same inputs form different memories under order and recurrence")}
      description={t(
        "결과를 보기 전에 final state를 예측하고, 단순 RNN의 감쇠와 LSTM cell path를 timestep별 수치로 추적하세요.",
        "Predict final state before revealing it, then trace vanilla-RNN decay and the LSTM cell path through numerical timesteps.",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={resetLab}>
          {t("lab 전체 초기화", "Reset lab")}
        </button>
      )}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"}>
        {interactiveReady
          ? t("sequence memory lab 조작 준비 완료", "Sequence memory lab controls ready")
          : t("sequence memory lab 준비 중", "Preparing the sequence memory lab")}
      </span>

      <div className="sequences-preset-bar" role="group" aria-label={t("sequence preset", "Sequence presets")}>
        <span>{t("순서 preset", "ORDER PRESET")}</span>
        {sequencePresetIds.map((candidate) => (
          <button
            type="button"
            aria-pressed={preset === candidate}
            onClick={() => choosePreset(candidate)}
            key={candidate}
          >
            {presetCopy[candidate][locale]}
          </button>
        ))}
      </div>

      <ol className="sequences-token-order" aria-label={t("현재 token 순서", "Current token order")}>
        {presetTokens.map((token, index) => (
          <li key={`${token.id}-${index}`}>
            <span>t{index}</span>
            <strong>{tokenLabel(token.id, token.input, locale)}</strong>
          </li>
        ))}
      </ol>

      <div className="sequences-run-grid">
        <fieldset className="sequences-cell-picker">
          <legend>{t("recurrence 선택", "Choose a recurrence")}</legend>
          {(["rnn", "lstm"] as const).map((candidate) => (
            <label key={candidate}>
              <input
                type="radio"
                name="sequence-cell-kind"
                value={candidate}
                checked={cellKind === candidate}
                onChange={() => chooseCellKind(candidate)}
              />
              <span>{candidate === "rnn" ? t("단순 RNN", "Vanilla RNN") : "LSTM"}</span>
            </label>
          ))}
          <label className="sequences-gain-field">
            <span>{t("RNN recurrent gain (0 초과, 1 이하)", "RNN recurrent gain (greater than 0, at most 1)")}</span>
            <input
              type="number"
              min="0.05"
              max="1"
              step="0.05"
              inputMode="decimal"
              value={recurrentGain}
              disabled={cellKind === "lstm" || Boolean(trace)}
              onChange={(event) => setRecurrentGain(event.currentTarget.value)}
              aria-label={t("RNN recurrent gain", "RNN recurrent gain")}
            />
            <small>{t(
              "gain을 낮추면 먼 신호의 hidden·gradient가 더 빨리 감쇠합니다. 계약 밖 값은 안전 fallback을 엽니다.",
              "A lower gain makes distant hidden state and gradients decay faster. An out-of-contract value opens the safe fallback.",
            )}</small>
          </label>
        </fieldset>

        <fieldset className="sequences-prediction-fieldset">
          <legend>{t("실행 전 final state 예측", "Predict final state before running")}</legend>
          <DirectChoice
            compact
            groupRef={predictionRef}
            label={t("초기 신호의 결과", "Outcome of the early signal")}
            ariaLabel={t("final state 예측", "Final-state prediction")}
            value={prediction}
            disabled={Boolean(trace)}
            options={predictionOrder.map((candidate) => ({ value: candidate, label: predictionCopy[candidate][locale] }))}
            onChange={setPrediction}
          />
          <div className="sequences-run-actions">
            <button
              type="button"
              className="button button-primary"
              onClick={runSequence}
            >
              {t("sequence recurrence 실행", "Run sequence recurrence")}
            </button>
            <button type="button" className="button button-ghost" onClick={resetRun}>
              {t("현재 실행 다시 예측", "Retry current setup")}
            </button>
          </div>
        </fieldset>
      </div>

      {runtimeError ? (
        <div className="sequences-runtime-fallback" role="alert">
          <strong>{t("로컬 sequence runtime 실패", "Local sequence runtime failure")}</strong>
          <p>{runtimeError === "gain-contract"
            ? t(
              `recurrent gain ${recurrentGain || "(빈 값)"}은 계약 밖입니다. 0보다 크고 1 이하여야 합니다.`,
              `Recurrent gain ${recurrentGain || "(empty)"} is outside the contract. It must be greater than zero and at most one.`,
            )
            : t(
              "이 상태를 계산하지 못했습니다. 네트워크가 필요 없는 고정 preset으로 안전하게 돌아갈 수 있습니다.",
              "This state could not be computed. Return safely to the fixed network-free preset.",
            )}</p>
          <button type="button" className="button button-ghost" onClick={recoverFromRuntimeError}>
            {t("안전하게 초기화", "Reset safely")}
          </button>
        </div>
      ) : null}

      {trace ? (
        <section className="sequences-trace-workspace" aria-labelledby="sequences-trace-title">
          <header>
            <div>
              <span>{cellKind === "rnn" ? "VANILLA RNN" : "LSTM"}</span>
              <h4 id="sequences-trace-title">{t("timestep 기억 경로", "Timestep memory path")}</h4>
            </div>
            <strong>
              {cellKind === "rnn" ? `gain=${format(Number(recurrentGain))} · ` : ""}
              h_final={format(trace.finalHidden)} · ∂h_final/∂x_signal={format(trace.signalGradient)}
              {trace.signalCellGradient === null
                ? ""
                : ` · ∂c_final/∂x_signal=${format(trace.signalCellGradient)}`}
            </strong>
          </header>

          <div className="sequences-timestep-picker" role="group" aria-label={t("검사할 timestep", "Timestep to inspect")}>
            {trace.steps.map((step, index) => (
              <button
                type="button"
                aria-pressed={selectedStep === index}
                aria-controls="sequences-step-panel"
                className={inspectedSteps.includes(index) ? "is-inspected" : undefined}
                onClick={() => inspectStep(index)}
                key={`${step.tokenId}-${step.index}`}
              >
                <span>t{step.index}</span>
                <strong>{step.tokenId}</strong>
                <small>h={format(step.hidden)}</small>
              </button>
            ))}
          </div>

          {selected ? (
            <div className="sequences-step-panel" id="sequences-step-panel">
              <div>
                <span>{t("선택한 입력", "SELECTED INPUT")}</span>
                <strong>{tokenLabel(selected.tokenId, selected.input, locale)}</strong>
                <p>{t(
                  "색이 아니라 아래 수치와 gate 이름으로 상태 변화를 읽으세요. 서로 다른 두 timestep을 골라야 비교 증거가 됩니다.",
                  "Read the state change from the values and gate names below, not from color alone. Choose two different timesteps for comparison evidence.",
                )}</p>
              </div>
              <dl>
                <div><dt>candidate</dt><dd>{format(selected.candidate)}</dd></div>
                <div><dt>hidden h</dt><dd>{format(selected.hidden)}</dd></div>
                {cellKind === "lstm" ? <div><dt>cell c</dt><dd>{format(selected.cell)}</dd></div> : null}
                {selected.cellGradientToSignal === null ? null : (
                  <div>
                    <dt>{t("cell carry 민감도 ∂cₜ/∂x_signal", "cell-carry sensitivity ∂c_t/∂x_signal")}</dt>
                    <dd>{format(selected.cellGradientToSignal)}</dd>
                  </div>
                )}
                <div>
                  <dt>{selected.cellGradientToSignal === null
                    ? t("hidden 민감도 ∂hₜ/∂x_signal", "hidden sensitivity ∂h_t/∂x_signal")
                    : t("hidden reveal 민감도 ∂hₜ/∂x_signal", "hidden-reveal sensitivity ∂h_t/∂x_signal")}</dt>
                  <dd>{format(selected.gradientToSignal)}</dd>
                </div>
                {selected.inputGate === null ? null : <div><dt>input gate i</dt><dd>{format(selected.inputGate)}</dd></div>}
                {selected.forgetGate === null ? null : <div><dt>forget gate f</dt><dd>{format(selected.forgetGate)}</dd></div>}
                {selected.outputGate === null ? null : <div><dt>output gate o</dt><dd>{format(selected.outputGate)}</dd></div>}
              </dl>
            </div>
          ) : (
            <div className="sequences-step-panel sequences-step-panel-empty" id="sequences-step-panel">
              <div>
                <span>{t("비교 시작", "START THE COMPARISON")}</span>
                <strong>{t("먼저 timestep 하나를 선택하세요", "Choose the first timestep")}</strong>
                <p>{t(
                  "첫 선택 뒤에는 다른 시점을 하나 더 골라 hidden과 신호 민감도의 변화를 비교합니다.",
                  "After the first selection, choose a different step and compare changes in hidden state and signal sensitivity.",
                )}</p>
              </div>
            </div>
          )}
        </section>
      ) : null}

      <p className="sequences-live-feedback" role="status" aria-live="polite" aria-atomic="true">
        {feedbackText(feedback, locale)}
      </p>

      <div className="sequences-evidence" aria-label={t("필수 sequence lab 증거", "Required sequence-lab evidence")}>
        <span className={evidence.correctOrderPrediction ? "is-complete" : undefined}>{evidence.correctOrderPrediction ? "✓" : "○"} {t("순서 반전 예측", "reverse-order prediction")}</span>
        <span className={evidence.rnnDecayObserved ? "is-complete" : undefined}>{evidence.rnnDecayObserved ? "✓" : "○"} {t("RNN 감쇠 관찰", "RNN decay observed")}</span>
        <span className={evidence.lstmRetentionObserved ? "is-complete" : undefined}>{evidence.lstmRetentionObserved ? "✓" : "○"} {t("LSTM 유지 관찰", "LSTM retention observed")}</span>
        <span className={evidence.stepInspected ? "is-complete" : undefined}>{evidence.stepInspected ? "✓" : "○"} {t("서로 다른 timestep 2개 비교", "two timesteps compared")}</span>
      </div>
    </InteractiveLab>
  );
}

import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  evaluateTrainingRepair,
  trainingDebuggerScenarioIds,
  type TrainingDebuggerScenarioId,
  type TrainingRepair,
  type TrainingRepairResult,
} from "../../features/training/training-simulator";
import { InteractiveLab } from "../interactive/InteractiveLab";

const scenarioCopy: Record<TrainingDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
  options: TrainingRepair[];
}> = {
  "softmax-contract": {
    title: { ko: "사건 01 · 표본이 서로의 확률을 훔칩니다", en: "Incident 01 · Samples steal probability from one another" },
    clue: {
      ko: "logits[batch, class]에 큰 수가 들어오자 일부 행의 합이 1이 아니고, 다른 표본을 바꾸면 첫 행 확률도 바뀝니다.",
      en: "With large logits[batch, class], some row sums are not one, and editing another sample changes the first row's probabilities.",
    },
    options: ["row-stable", "column-softmax", "global-softmax"],
  },
  "loss-contract": {
    title: { ko: "사건 02 · 확신한 오답이 싸게 계산됩니다", en: "Incident 02 · A confidently wrong row looks cheap" },
    clue: {
      ko: "loss가 정답 label 대신 argmax를 읽거나, batch를 복제했을 때 두 배가 됩니다. fused CE의 입력·target·reduction을 함께 복구하세요.",
      en: "Loss reads argmax instead of the true label, or doubles when the batch is duplicated. Restore fused CE input, target, and reduction together.",
    },
    options: ["true-class-mean-logits", "argmax-mean", "true-class-sum", "double-softmax"],
  },
  "state-lifetime": {
    title: { ko: "사건 03 · zero_grad가 Adam 기억까지 지웁니다", en: "Incident 03 · zero_grad erases Adam memory" },
    clue: {
      ko: "두 번째 batch 전에 일반 gradient buffer는 비워야 하지만 m·v와 t는 이어져야 합니다. 둘의 수명을 분리하세요.",
      en: "Before batch two, clear the ordinary gradient buffer while preserving m, v, and t. Separate their lifetimes.",
    },
    options: ["clear-gradient-keep-moments", "accumulate-gradient", "reset-all-state"],
  },
  "dropout-mode": {
    title: { ko: "사건 04 · 같은 validation이 매번 바뀝니다", en: "Incident 04 · The same validation changes every run" },
    clue: {
      ko: "train에서는 inverted dropout이 activation의 기댓값을 보존해야 하고, validation에서는 mask 자체를 꺼야 합니다.",
      en: "In training, inverted dropout should preserve expected activation; in validation, the mask itself must be off.",
    },
    options: ["inverted-train-eval-off", "no-inverted-scale", "dropout-during-eval"],
  },
};

const repairCopy: Record<TrainingRepair, { ko: string; en: string }> = {
  "row-stable": { ko: "row마다 max-shift softmax", en: "max-shift softmax per row" },
  "column-softmax": { ko: "class별 column softmax", en: "column softmax per class" },
  "global-softmax": { ko: "batch 전체 global softmax", en: "global softmax over the batch" },
  "true-class-mean-logits": { ko: "raw logits → true-label mean CE", en: "raw logits → true-label mean CE" },
  "argmax-mean": { ko: "argmax 확률의 mean -log", en: "mean -log of argmax probability" },
  "true-class-sum": { ko: "true-label CE 합계", en: "sum of true-label CE" },
  "double-softmax": { ko: "softmax 확률 → fused CE", en: "softmax probabilities → fused CE" },
  "clear-gradient-keep-moments": { ko: "grad=0, Adam m·v 유지, t++", en: "grad=0, keep Adam m·v, increment t" },
  "accumulate-gradient": { ko: "이전 grad를 다음 batch에 누적", en: "accumulate the prior gradient into the next batch" },
  "reset-all-state": { ko: "grad·m·v·t 모두 초기화", en: "reset grad, m, v, and t" },
  "inverted-train-eval-off": { ko: "train: mask/(1-p) · eval: identity", en: "train: mask/(1-p) · eval: identity" },
  "no-inverted-scale": { ko: "train: mask만 적용 · eval: identity", en: "train: mask only · eval: identity" },
  "dropout-during-eval": { ko: "train·eval 모두 mask 적용", en: "apply masks in both train and eval" },
};

function metric(value: number | number[] | undefined) {
  if (Array.isArray(value)) return `[${value.map((item) => item.toFixed(3)).join(", ")}]`;
  if (typeof value === "number") return value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
  return "—";
}

function feedback(result: TrainingRepairResult, locale: "ko" | "en") {
  const isKo = locale === "ko";
  if (result.reason === "contract-restored") {
    if (result.metrics.rowSums) {
      return isKo
        ? `각 sample row 합은 ${metric(result.metrics.rowSums)}이고 큰 logits도 finite입니다.`
        : `Each sample row sums to ${metric(result.metrics.rowSums)}, and large logits remain finite.`;
    }
    if (result.metrics.duplicatedLoss !== undefined) {
      return isKo
        ? `true-label mean CE ${metric(result.metrics.loss)}는 batch를 복제해도 ${metric(result.metrics.duplicatedLoss)}로 같습니다.`
        : `True-label mean CE ${metric(result.metrics.loss)} stays ${metric(result.metrics.duplicatedLoss)} when the batch is duplicated.`;
    }
    if (result.metrics.moment !== undefined) {
      return isKo
        ? `batch 2 gradient buffer=${metric(result.metrics.gradientBuffer)}, 이어진 m=${metric(result.metrics.moment)}, t=${metric(result.metrics.step)}입니다.`
        : `At batch two, gradient buffer=${metric(result.metrics.gradientBuffer)}, carried m=${metric(result.metrics.moment)}, and t=${metric(result.metrics.step)}.`;
    }
    return isKo
      ? `고정 mask 평균 ${metric(result.metrics.trainMean)}가 원래 activation과 같고 eval=${metric(result.metrics.evalOutput)}는 seed와 무관합니다.`
      : `The fixed-mask mean ${metric(result.metrics.trainMean)} matches the activations, while eval=${metric(result.metrics.evalOutput)} is seed-invariant.`;
  }
  if (result.reason === "sample-coupling") {
    return isKo
      ? `행 합이 ${metric(result.metrics.rowSums)}입니다. softmax 분모는 다른 sample이 아니라 같은 행의 class들만 공유해야 합니다.`
      : `Row sums are ${metric(result.metrics.rowSums)}. The softmax denominator must be shared only across classes in the same sample row.`;
  }
  if (result.reason === "wrong-target") {
    return isKo
      ? `argmax는 모델이 고른 class라서 오답을 숨깁니다. 정답 label 위치의 logit을 읽으세요.`
      : `Argmax is the model's chosen class, so it hides mistakes. Read the logit at the true-label position.`;
  }
  if (result.reason === "sum-reduction") {
    return isKo
      ? `합계 loss ${metric(result.metrics.loss)}는 batch 크기에 따라 배율이 바뀝니다. mean ${metric(result.metrics.correctMean)}으로 gradient 규모를 고정하세요.`
      : `Summed loss ${metric(result.metrics.loss)} scales with batch size. Use mean ${metric(result.metrics.correctMean)} to keep gradient scale stable.`;
  }
  if (result.reason === "non-fused-input") {
    return isKo
      ? `fused CE는 raw logits에서 stable log-sum-exp를 수행합니다. 미리 softmax하면 double softmax가 되어 loss가 ${metric(result.metrics.loss)}로 왜곡됩니다.`
      : `Fused CE performs stable log-sum-exp on raw logits. Pre-softmaxing causes double softmax and distorts loss to ${metric(result.metrics.loss)}.`;
  }
  if (result.reason === "gradient-accumulated") {
    return isKo
      ? `batch 2 buffer가 ${metric(result.metrics.gradientBuffer)}로 batch 1 gradient까지 포함합니다. 일반 gradient만 update 사이에 비우세요.`
      : `The batch-two buffer is ${metric(result.metrics.gradientBuffer)}, still containing batch-one gradient. Clear only the ordinary gradient between updates.`;
  }
  if (result.reason === "optimizer-memory-reset") {
    return isKo
      ? `m=${metric(result.metrics.moment)}, t=${metric(result.metrics.step)}로 Adam이 첫 step처럼 다시 시작했습니다. m·v·t는 optimizer state입니다.`
      : `With m=${metric(result.metrics.moment)} and t=${metric(result.metrics.step)}, Adam restarts like step one. m, v, and t are optimizer state.`;
  }
  if (result.reason === "expectation-shrunk") {
    return isKo
      ? `scaling이 없으면 평균 activation이 ${metric(result.metrics.trainMean)}로 절반이 됩니다. inverted dropout은 기댓값을 보존하며 개별 mask의 합을 고정하지는 않습니다.`
      : `Without scaling, mean activation shrinks to ${metric(result.metrics.trainMean)}. Inverted dropout preserves expectation, not every mask's sum.`;
  }
  if (result.reason === "stochastic-validation") {
    return isKo
      ? `eval 결과가 seed에 따라 ${metric(result.metrics.evalSeedOne)} / ${metric(result.metrics.evalSeedTwo)}로 바뀝니다. validation 전에 eval mode로 전환하세요.`
      : `Eval changes by seed: ${metric(result.metrics.evalSeedOne)} / ${metric(result.metrics.evalSeedTwo)}. Switch to eval mode before validation.`;
  }
  return isKo ? "이 사건에 맞는 patch를 선택하세요." : "Choose a patch that matches this incident.";
}

export function TrainingLoopDebugger({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<TrainingDebuggerScenarioId, TrainingRepair>>>({});
  const [results, setResults] = useState<Partial<Record<TrainingDebuggerScenarioId, TrainingRepairResult>>>({});
  const [runtimeError, setRuntimeError] = useState("");
  const solved = trainingDebuggerScenarioIds.filter((scenario) => results[scenario]?.correct).length;
  const complete = solved === trainingDebuggerScenarioIds.length;

  useEffect(() => {
    onCompletionChange?.(complete);
  }, [complete, onCompletionChange]);

  function changeAnswer(scenario: TrainingDebuggerScenarioId, repair: TrainingRepair) {
    setAnswers((current) => ({ ...current, [scenario]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenario];
      return next;
    });
    setRuntimeError("");
  }

  function runRepair(scenario: TrainingDebuggerScenarioId) {
    const repair = answers[scenario];
    if (!repair) return;
    try {
      const result = evaluateTrainingRepair(scenario, repair);
      setResults((current) => ({ ...current, [scenario]: result }));
      setRuntimeError("");
    } catch {
      setRuntimeError(t(
        "결정적 계약 실행에 실패했습니다. debugger를 초기화한 뒤 다시 시도하세요.",
        "The deterministic contract run failed. Reset the debugger and try again.",
      ));
    }
  }

  function resetScenario(scenario: TrainingDebuggerScenarioId) {
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
  }

  function resetAll() {
    setAnswers({});
    setResults({});
    setRuntimeError("");
  }

  return (
    <InteractiveLab
      className="training-debugger-lab"
      kicker={t("별도 활동 · TRAINING LOOP DEBUGGER", "SEPARATE ACTIVITY · TRAINING LOOP DEBUGGER")}
      title={t("숫자로 실행해 네 훈련 계약을 복구하세요", "Run the numbers and restore four training contracts")}
      description={t(
        "각 patch는 실제 row sum, loss, gradient buffer·Adam state, dropout 출력을 계산합니다. 이름이 그럴듯한지가 아니라 불변식이 복구됐는지 판정합니다.",
        "Each patch computes real row sums, loss, gradient-buffer and Adam state, or dropout outputs. The invariant—not the patch name—determines the result.",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={resetAll}>
          {t("debugger 전체 초기화", "Reset debugger")}
        </button>
      )}
    >
      <div className="training-debug-progress" role="status" aria-live="polite">
        <div>
          <span>{t("복구한 계약", "CONTRACTS RESTORED")}</span>
          <strong>{solved} / {trainingDebuggerScenarioIds.length}</strong>
        </div>
        <span>{complete
          ? t("모든 훈련 경계가 deterministic test를 통과했습니다.", "Every training boundary passed its deterministic test.")
          : t("오답은 실제로 깨진 수치와 원인을 설명합니다.", "Wrong patches report the broken numbers and their cause.")}</span>
      </div>

      {runtimeError ? <p className="training-runtime-fallback" role="alert">{runtimeError}</p> : null}

      <div className="training-debug-grid">
        {trainingDebuggerScenarioIds.map((scenario, index) => {
          const copy = scenarioCopy[scenario];
          const answer = answers[scenario] ?? "";
          const result = results[scenario];
          const feedbackId = `${scenario}-training-feedback`;
          return (
            <fieldset
              className={`training-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenario}
            >
              <legend>{copy.title[locale]}</legend>
              <p>{copy.clue[locale]}</p>
              <label>
                <span>{t("실행할 patch", "Patch to run")}</span>
                <select
                  value={answer}
                  onChange={(event) => changeAnswer(scenario, event.currentTarget.value as TrainingRepair)}
                  aria-label={t(`${index + 1}번 사건 patch`, `Patch for incident ${index + 1}`)}
                >
                  <option value="" disabled>{t("patch 선택", "Choose a patch")}</option>
                  {copy.options.map((option) => (
                    <option value={option} key={option}>{repairCopy[option][locale]}</option>
                  ))}
                </select>
              </label>
              <div className="training-debug-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  onClick={() => runRepair(scenario)}
                >
                  {t("patch 적용·계약 실행", "Apply patch and run contract")}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  aria-label={t(`${index + 1}번 훈련 사건 초기화`, `Reset training incident ${index + 1}`)}
                  onClick={() => resetScenario(scenario)}
                >
                  {t("사건 초기화", "Reset incident")}
                </button>
              </div>
              {result ? (
                <div className="training-debug-feedback" id={feedbackId} role="status" aria-live="polite">
                  <strong>{result.correct ? t("계약 복구", "Contract restored") : t("결함이 남아 있습니다", "Failure remains")}</strong>
                  <p>{feedback(result, locale)}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

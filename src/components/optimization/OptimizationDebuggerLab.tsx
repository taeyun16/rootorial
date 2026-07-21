import { useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  evaluateOptimizerAction,
  optimizerActionIds,
  optimizerDebuggerScenarioIds,
  optimizerDebuggerScenarios,
  type OptimizerActionId,
  type OptimizerDebuggerScenarioId,
  type OptimizerDebugResult,
} from "../../features/optimization/gradient-descent";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { DirectChoice } from "../interactive/DirectChoice";
import { MathFormula } from "../MathFormula";

type DebugAnswer = {
  action?: OptimizerActionId;
  learningRate?: number;
};

const scenarioCopy: Record<
  OptimizerDebuggerScenarioId,
  {
    title: { ko: string; en: string };
    clue: { ko: string; en: string };
  }
> = {
  "positive-gradient": {
    title: { ko: "사건 1 · 양의 gradient", en: "Incident 1 · Positive gradient" },
    clue: {
      ko: "현재 w=3이고 목표는 1입니다. gradient=4일 때 손실을 실제로 줄이는 동작을 고르세요.",
      en: "The current w is 3 and the target is 1. With gradient=4, choose an action that actually lowers the loss.",
    },
  },
  "negative-gradient": {
    title: { ko: "사건 2 · 음의 gradient", en: "Incident 2 · Negative gradient" },
    clue: {
      ko: "현재 w=-1이고 gradient=-4입니다. 음수를 뺄 때 어느 방향으로 움직이는지 확인하세요.",
      en: "The current w is -1 and the gradient is -4. Track which way subtraction moves when the gradient is negative.",
    },
  },
  "steep-gradient": {
    title: { ko: "사건 3 · 가파른 곡면", en: "Incident 3 · Steep surface" },
    clue: {
      ko: "L(w)=4(w-1)²라 gradient가 8입니다. 방향이 맞아도 보폭이 크면 최솟값을 건너뜁니다.",
      en: "For L(w)=4(w-1)², the gradient is 8. Even the right direction can overshoot with a large step.",
    },
  },
  "small-gradient": {
    title: { ko: "사건 4 · 작지만 남은 gradient", en: "Incident 4 · Small but nonzero gradient" },
    clue: {
      ko: "현재 w=1.1이고 gradient≈0.2입니다. 작은 값을 0으로 오해해 너무 일찍 멈추지 마세요.",
      en: "The current w is 1.1 and the gradient is about 0.2. Do not mistake a small value for zero and stop too early.",
    },
  },
};

const actionCopy: Record<OptimizerActionId, { ko: string; en: string }> = {
  "subtract-gradient": { ko: "w ← w − ηg", en: "w ← w − ηg" },
  "add-gradient": { ko: "w ← w + ηg", en: "w ← w + ηg" },
  stop: { ko: "업데이트하지 않음", en: "Do not update" },
};

function formatNumber(value: number) {
  if (Math.abs(value) < 1e-9) return "0";
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function resultMessage(
  result: OptimizerDebugResult,
  locale: "ko" | "en",
) {
  const values = `w: ${formatNumber(result.nextWeight)}, loss: ${formatNumber(result.previousLoss)} → ${formatNumber(result.nextLoss)}`;
  if (result.correct) {
    return locale === "ko"
      ? `정확합니다. g·Δw=${formatNumber(result.gradient * result.delta)}<0이고 실제 손실도 감소했습니다. ${values}`
      : `Correct. g·Δw=${formatNumber(result.gradient * result.delta)}<0 and the actual loss decreased. ${values}`;
  }
  if (result.reason === "no-update") {
    return locale === "ko"
      ? `gradient=${formatNumber(result.gradient)}가 남아 있어 멈추면 손실이 그대로입니다. gradient의 반대 방향을 선택하세요. ${values}`
      : `The gradient is still ${formatNumber(result.gradient)}, so stopping leaves the loss unchanged. Choose the direction opposite the gradient. ${values}`;
  }
  if (result.reason === "wrong-sign") {
    return locale === "ko"
      ? `g·Δw=${formatNumber(result.gradient * result.delta)}≥0이라 오르막으로 움직였습니다. gradient를 더하지 말고 빼세요. ${values}`
      : `g·Δw=${formatNumber(result.gradient * result.delta)}≥0, so the step moved uphill. Subtract the gradient instead of adding it. ${values}`;
  }
  return locale === "ko"
    ? `방향은 내리막이지만 보폭이 너무 커 최솟값을 건너뛰었습니다. 더 작은 η를 고르세요. ${values}`
    : `The direction is downhill, but the step overshot the minimum. Choose a smaller η. ${values}`;
}

export function OptimizationDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<OptimizerDebuggerScenarioId, DebugAnswer>>>({});
  const [results, setResults] = useState<Partial<Record<OptimizerDebuggerScenarioId, OptimizerDebugResult>>>({});
  const solvedCount = optimizerDebuggerScenarioIds.filter((id) => results[id]?.correct).length;

  function changeAnswer(
    scenarioId: OptimizerDebuggerScenarioId,
    patch: Partial<DebugAnswer>,
  ) {
    setAnswers((current) => ({
      ...current,
      [scenarioId]: { ...current[scenarioId], ...patch },
    }));
    if (results[scenarioId]) {
      const nextResults = { ...results };
      delete nextResults[scenarioId];
      setResults(nextResults);
      onCompletionChange?.(false);
    }
  }

  function checkScenario(scenarioId: OptimizerDebuggerScenarioId) {
    const answer = answers[scenarioId];
    if (!answer?.action) return;
    const rate = answer.action === "stop" ? 0 : answer.learningRate;
    if (rate === undefined) return;
    const result = evaluateOptimizerAction(scenarioId, answer.action, rate);
    const nextResults = { ...results, [scenarioId]: result };
    setResults(nextResults);
    onCompletionChange?.(
      optimizerDebuggerScenarioIds.every((id) => nextResults[id]?.correct),
    );
  }

  function resetDebugger() {
    setAnswers({});
    setResults({});
    onCompletionChange?.(false);
  }

  return (
    <InteractiveLab
      kicker={t("별도 활동 · ONE-STEP DEBUGGER", "SEPARATE ACTIVITY · ONE-STEP DEBUGGER")}
      title={t("공식이 아니라 실제 손실 변화로 업데이트를 판정하세요", "Judge each update by its actual loss change")}
      description={t(
        "각 사건에서 동작과 학습률을 고르면 엔진이 다음 w와 loss를 계산합니다. 네 사건을 모두 실제 내리막 조건으로 해결하세요.",
        "Choose an action and learning rate for each incident. The engine computes the next w and loss; solve all four using the actual downhill condition.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetDebugger}>{t("디버거 초기화", "Reset debugger")}</button>}
      className="optimization-debugger-lab"
    >
      <div className="optimization-debug-progress" role="status" aria-live="polite">
        <strong>{solvedCount} / {optimizerDebuggerScenarioIds.length}</strong>
        <span>{solvedCount === optimizerDebuggerScenarioIds.length
          ? t("네 업데이트를 모두 loss 감소로 검증했습니다.", "All four updates were verified by loss reduction.")
          : t("해결한 optimizer 사건", "Optimizer incidents solved")}</span>
      </div>

      <div className="optimization-debug-grid">
        {optimizerDebuggerScenarioIds.map((scenarioId) => {
          const scenario = optimizerDebuggerScenarios[scenarioId];
          const copy = scenarioCopy[scenarioId];
          const answer = answers[scenarioId];
          const result = results[scenarioId];
          const feedbackId = `${scenarioId}-optimizer-feedback`;
          return (
            <fieldset
              className={`optimization-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenarioId}
            >
              <legend>{copy.title[locale]}</legend>
              <div className="optimization-debug-formula">
                <MathFormula latex={`L(w)=${scenario.lossScale === 1 ? "" : scenario.lossScale}(w-${scenario.target})^2`} display />
                <dl>
                  <div><dt>w</dt><dd>{formatNumber(scenario.weight)}</dd></div>
                  <div><dt>g = dL/dw</dt><dd>{formatNumber(2 * scenario.lossScale * (scenario.weight - scenario.target))}</dd></div>
                  <div><dt>loss</dt><dd>{formatNumber(scenario.lossScale * (scenario.weight - scenario.target) ** 2)}</dd></div>
                </dl>
              </div>
              <p>{copy.clue[locale]}</p>
              <DirectChoice
                compact
                label={t("optimizer 동작", "Optimizer action")}
                value={answer?.action ?? ""}
                options={optimizerActionIds.map((action) => ({ value: action, label: actionCopy[action][locale] }))}
                onChange={(action) => changeAnswer(scenarioId, { action, learningRate: action === "stop" ? 0 : undefined })}
              />
              <DirectChoice
                compact
                label={t("학습률 η", "Learning rate η")}
                value={answer?.action === "stop" ? "" : answer?.learningRate ?? ""}
                disabled={!answer?.action || answer.action === "stop"}
                options={scenario.learningRates.filter((rate) => rate > 0).map((rate) => ({ value: rate, label: String(rate) }))}
                onChange={(learningRate) => changeAnswer(scenarioId, { learningRate })}
              />
              <button
                type="button"
                className="button button-secondary"
                disabled={!answer?.action || (answer.action !== "stop" && answer.learningRate === undefined)}
                onClick={() => checkScenario(scenarioId)}
              >
                {t("업데이트 실행·판정", "Run and grade update")}
              </button>
              {result ? (
                <div className="optimization-debug-feedback" id={feedbackId} role="status" aria-live="polite">
                  <strong>{result.correct ? t("loss 감소 확인", "Loss decrease verified") : t("업데이트를 다시 설계하세요", "Redesign the update")}</strong>
                  <p>{resultMessage(result, locale)}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

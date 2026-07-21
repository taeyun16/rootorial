import { useState } from "react";
import {
  evaluateNetworkRepair,
  networkDebuggerScenarioIds,
  xorDataset,
  type NetworkDebuggerRepair,
  type NetworkDebuggerResult,
  type NetworkDebuggerScenarioId,
} from "../../features/neural-networks/forward-pass";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { DirectChoice } from "../interactive/DirectChoice";

const scenarioCopy: Record<NetworkDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
  options: readonly NetworkDebuggerRepair[];
}> = {
  "shape-contract": {
    title: { ko: "사건 1 · 안쪽 shape 불일치", en: "Incident 1 · Inner-shape mismatch" },
    clue: {
      ko: "X[4,2] 뒤의 W¹과 고정된 W²[2,1]이 모두 곱해져 output [4,1]이 되어야 합니다.",
      en: "W¹ after X[4,2] must also connect to the fixed W²[2,1], producing output [4,1].",
    },
    options: ["3x2", "2x3", "2x2"],
  },
  "missing-activation": {
    title: { ko: "사건 2 · activation 삭제", en: "Incident 2 · Deleted activation" },
    clue: {
      ko: "OR·NAND hidden affine와 XOR output은 그대로지만 중간 함수가 사라져 두 affine이 하나의 직선으로 축약됐습니다.",
      en: "The OR/NAND hidden affine maps and XOR output remain, but without a middle function two affine maps collapse into one line.",
    },
    options: ["identity", "relu", "sigmoid"],
  },
  "output-combination": {
    title: { ko: "사건 3 · 출력 결합 손상", en: "Incident 3 · Corrupted output combination" },
    clue: {
      ko: "hidden OR와 NAND 값은 올바릅니다. 네 행의 실제 class와 BCE를 회복하는 출력 결합을 고르세요.",
      en: "Hidden OR and NAND values are correct. Choose an output combination that restores actual classes and BCE for all four rows.",
    },
    options: ["or", "same-sign", "inverted", "xor"],
  },
  "probability-head": {
    title: { ko: "사건 4 · BCE에 logit 전달", en: "Incident 4 · Logits sent into BCE" },
    clue: {
      ko: "마지막 affine의 z²는 -3.86 또는 3.71입니다. BCE가 읽을 수 있는 [0,1] 확률로 바꾸세요.",
      en: "The final affine emits z² around -3.86 or 3.71. Convert it into a [0,1] probability that BCE can read.",
    },
    options: ["identity", "tanh", "sigmoid"],
  },
};

function optionLabel(option: NetworkDebuggerRepair, isKo: boolean) {
  const labels: Record<string, { ko: string; en: string }> = {
    "2x2": { ko: "W¹ [2,2]", en: "W¹ [2,2]" },
    "3x2": { ko: "W¹ [3,2]", en: "W¹ [3,2]" },
    "2x3": { ko: "W¹ [2,3]", en: "W¹ [2,3]" },
    identity: { ko: "activation 없음 · identity", en: "No activation · identity" },
    relu: { ko: "ReLU", en: "ReLU" },
    sigmoid: { ko: "sigmoid", en: "sigmoid" },
    or: { ko: "OR output · [8,8], b=-4", en: "OR output · [8,8], b=-4" },
    "same-sign": { ko: "feature 빼기 · [8,-8], b=0", en: "Subtract features · [8,-8], b=0" },
    inverted: { ko: "반전 output · [-8,-8], b=12", en: "Inverted output · [-8,-8], b=12" },
    xor: { ko: "XOR output · [8,8], b=-12", en: "XOR output · [8,8], b=-12" },
    tanh: { ko: "tanh", en: "tanh" },
  };
  return isKo ? labels[option].ko : labels[option].en;
}

function feedbackMessage(
  result: NetworkDebuggerResult,
  locale: "ko" | "en",
) {
  const isKo = locale === "ko";
  if (result.correct) {
    if (result.outputShape) {
      return isKo
        ? `안쪽 크기가 모두 맞아 output [${result.outputShape.join(",")}]까지 연결됩니다.`
        : `Both inner dimensions match, so the network reaches output [${result.outputShape.join(",")}].`;
    }
    return isKo
      ? `실제 forward 결과 ${result.correctCount}/4, 평균 BCE ${(result.meanLoss ?? 0).toFixed(3)}로 회복됐습니다.`
      : `The actual forward pass is restored to ${result.correctCount}/4 with mean BCE ${(result.meanLoss ?? 0).toFixed(3)}.`;
  }
  if (result.reason === "shape-mismatch") {
    return isKo
      ? `곱셈의 안쪽 크기는 ${result.expectedInner}이어야 하지만 ${result.actualInner}입니다. batch 4가 아니라 feature 차원 2를 W¹의 첫 축과 맞추세요.`
      : `The inner size must be ${result.expectedInner}, but it is ${result.actualInner}. Match feature dimension 2—not batch 4—to the first axis of W¹.`;
  }
  if (result.reason === "invalid-probability") {
    const rows = (result.failingRows ?? []).map((index) => index + 1).join(", ");
    return isKo
      ? `행 ${rows}의 값이 [0,1] 확률 범위를 벗어나 BCE가 유효하지 않습니다. logit과 probability 사이 변환을 복구하세요.`
      : `Rows ${rows} fall outside the [0,1] probability range, so BCE is invalid. Restore the logit-to-probability transform.`;
  }
  const failingInputs = (result.failingRows ?? [])
    .map((index) => `[${xorDataset[index].input.join(",")}]`)
    .join(", ");
  return isKo
    ? `실제 결과는 ${result.correctCount}/4이고 실패 입력은 ${failingInputs || "—"}입니다. 이름이 아니라 이 truth table을 기준으로 다시 수리하세요.`
    : `The actual result is ${result.correctCount}/4; failing inputs are ${failingInputs || "—"}. Repair from this truth table, not from the option name.`;
}

export function NeuralNetworkDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<NetworkDebuggerScenarioId, NetworkDebuggerRepair>>>({});
  const [results, setResults] = useState<Partial<Record<NetworkDebuggerScenarioId, NetworkDebuggerResult>>>({});
  const [runtimeFailure, setRuntimeFailure] = useState<string | null>(null);
  const solvedCount = networkDebuggerScenarioIds.filter((id) => results[id]?.correct).length;

  function changeAnswer(scenarioId: NetworkDebuggerScenarioId, answer: NetworkDebuggerRepair) {
    setAnswers((current) => ({ ...current, [scenarioId]: answer }));
    if (results[scenarioId]) {
      setResults((current) => {
        const next = { ...current };
        delete next[scenarioId];
        return next;
      });
      onCompletionChange?.(false);
    }
    setRuntimeFailure(null);
  }

  function checkScenario(scenarioId: NetworkDebuggerScenarioId) {
    const answer = answers[scenarioId];
    if (!answer) return;
    try {
      const result = evaluateNetworkRepair(scenarioId, answer);
      const nextResults = { ...results, [scenarioId]: result };
      setResults(nextResults);
      setRuntimeFailure(null);
      onCompletionChange?.(
        networkDebuggerScenarioIds.every((id) => nextResults[id]?.correct),
      );
    } catch (error) {
      setRuntimeFailure(error instanceof Error ? error.message : String(error));
      onCompletionChange?.(false);
    }
  }

  function resetScenario(scenarioId: NetworkDebuggerScenarioId) {
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
    setRuntimeFailure(null);
    onCompletionChange?.(false);
  }

  function resetDebugger() {
    setAnswers({});
    setResults({});
    setRuntimeFailure(null);
    onCompletionChange?.(false);
  }

  return (
    <InteractiveLab
      kicker={t("별도 활동 · NETWORK SURGERY", "SEPARATE ACTIVITY · NETWORK SURGERY")}
      title={t("네트워크 이름이 아니라 실제 shape·확률·BCE로 네 결함을 수리하세요", "Repair four failures using actual shapes, probabilities, and BCE")}
      description={t(
        "각 patch를 적용하면 동일한 deterministic engine이 다시 forward pass를 실행합니다. 네 사건의 결과 계약을 모두 회복하세요.",
        "Each patch reruns the same deterministic forward engine. Restore the result contract in all four incidents.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetDebugger}>{t("디버거 초기화", "Reset debugger")}</button>}
      className="neural-debugger-lab"
    >
      <div className="neural-debug-progress" role="status" aria-live="polite">
        <strong>{solvedCount} / {networkDebuggerScenarioIds.length}</strong>
        <span>{runtimeFailure
          ? t(`수학 모델 오류: ${runtimeFailure}`, `Math-model error: ${runtimeFailure}`)
          : solvedCount === networkDebuggerScenarioIds.length
            ? t("네 결함이 실제 forward 계약으로 복구됐습니다.", "All four failures are restored by forward-pass contracts.")
            : t("해결한 network 사건", "Network incidents solved")}</span>
      </div>

      <div className="neural-debug-grid">
        {networkDebuggerScenarioIds.map((scenarioId) => {
          const copy = scenarioCopy[scenarioId];
          const answer = answers[scenarioId];
          const result = results[scenarioId];
          const feedbackId = `${scenarioId}-network-feedback`;
          return (
            <fieldset
              className={`neural-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenarioId}
            >
              <legend>{copy.title[locale]}</legend>
              <p>{copy.clue[locale]}</p>
              <DirectChoice compact label={t("적용할 patch", "Patch to apply")} value={answer ?? ""} options={copy.options.map((option) => ({ value: option, label: optionLabel(option, isKo) }))} onChange={(repair) => changeAnswer(scenarioId, repair)} />
              <div className="neural-debug-actions">
                <button type="button" className="button button-secondary" disabled={!answer} onClick={() => checkScenario(scenarioId)}>
                  {t("patch 적용·실행", "Apply patch and run")}
                </button>
                <button type="button" className="button button-ghost" onClick={() => resetScenario(scenarioId)}>
                  {t("사건 초기화", "Reset incident")}
                </button>
              </div>
              {result ? (
                <div className="neural-debug-feedback" id={feedbackId} role="status">
                  <strong>{result.correct ? t("계약 복구", "Contract restored") : t("결함이 남아 있습니다", "Failure remains")}</strong>
                  <p>{feedbackMessage(result, locale)}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

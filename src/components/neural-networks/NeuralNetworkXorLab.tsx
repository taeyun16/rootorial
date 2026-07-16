import { useState } from "react";
import {
  brokenXorConfig,
  collapsedXorConfig,
  evaluateXorMastery,
  runLinearXorBoundary,
  runXorNetwork,
  saturatedXorConfig,
  type ActivationId,
  type HiddenFeatureId,
  type OutputHeadId,
  type XorMastery,
  type XorNetworkConfig,
  type XorNetworkRun,
} from "../../features/neural-networks/forward-pass";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { NeuralNetworkStateView } from "./NeuralNetworkStateView";

type LinearPrediction = "four" | "three" | "two";

type LabEvidence = {
  predictionCorrect: boolean;
  linearFailureObserved: boolean;
  rebuiltAfterFailure: boolean;
};

const activationIds = ["identity", "sigmoid", "relu"] as const;
const hiddenFeatureIds = ["or", "and", "nand", "x1", "x2", "off"] as const;
const outputHeadIds = ["xor", "or", "same-sign", "inverted"] as const;

const initialEvidence: LabEvidence = {
  predictionCorrect: false,
  linearFailureObserved: false,
  rebuiltAfterFailure: false,
};

function formatLoss(value: number) {
  return Number.isFinite(value) ? value.toFixed(3) : "—";
}

function configEquals(left: XorNetworkConfig, right: XorNetworkConfig) {
  return left.activation === right.activation
    && left.hiddenFeatures[0] === right.hiddenFeatures[0]
    && left.hiddenFeatures[1] === right.hiddenFeatures[1]
    && left.outputHead === right.outputHead;
}

export function NeuralNetworkXorLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [prediction, setPrediction] = useState<LinearPrediction | "">("");
  const [linearResult, setLinearResult] = useState<ReturnType<typeof runLinearXorBoundary> | null>(null);
  const [config, setConfig] = useState<XorNetworkConfig>(brokenXorConfig);
  const [run, setRun] = useState<XorNetworkRun | null>(null);
  const [mastery, setMastery] = useState<XorMastery | null>(null);
  const [evidence, setEvidence] = useState<LabEvidence>(initialEvidence);
  const [runtimeFailure, setRuntimeFailure] = useState<string | null>(null);

  const activationCopy: Record<ActivationId, string> = {
    identity: t("없음 · identity", "None · identity"),
    sigmoid: "sigmoid",
    relu: "ReLU",
  };
  const hiddenCopy: Record<HiddenFeatureId, string> = {
    or: t("OR 감지 · [8, 8], b=-4", "OR detector · [8, 8], b=-4"),
    and: t("AND 감지 · [8, 8], b=-12", "AND detector · [8, 8], b=-12"),
    nand: t("NAND 감지 · [-8, -8], b=12", "NAND detector · [-8, -8], b=12"),
    x1: t("x₁ 감지 · [8, 0], b=-4", "x₁ detector · [8, 0], b=-4"),
    x2: t("x₂ 감지 · [0, 8], b=-4", "x₂ detector · [0, 8], b=-4"),
    off: t("꺼짐 · [0, 0], b=-20", "Off · [0, 0], b=-20"),
  };
  const outputCopy: Record<OutputHeadId, string> = {
    xor: t("두 feature가 함께 켜질 때 · [8, 8], b=-12", "Both features on · [8, 8], b=-12"),
    or: t("하나만 켜져도 · [8, 8], b=-4", "Either feature on · [8, 8], b=-4"),
    "same-sign": t("서로 빼기 · [8, -8], b=0", "Subtract features · [8, -8], b=0"),
    inverted: t("둘 다 뒤집기 · [-8, -8], b=12", "Invert both · [-8, -8], b=12"),
  };

  function resetLab() {
    setPrediction("");
    setLinearResult(null);
    setConfig(brokenXorConfig);
    setRun(null);
    setMastery(null);
    setEvidence(initialEvidence);
    setRuntimeFailure(null);
    onCompletionChange?.(false);
  }

  function runLinearPrediction() {
    if (!prediction) return;
    try {
      const nextResult = runLinearXorBoundary();
      const nextEvidence = {
        ...evidence,
        predictionCorrect: prediction === "three",
        linearFailureObserved: nextResult.correctCount < 4,
      };
      setLinearResult(nextResult);
      setEvidence(nextEvidence);
      setRuntimeFailure(null);
      onCompletionChange?.(false);
    } catch (error) {
      setRuntimeFailure(error instanceof Error ? error.message : String(error));
      onCompletionChange?.(false);
    }
  }

  function updateConfig(nextConfig: XorNetworkConfig) {
    setConfig(nextConfig);
    setRun(null);
    setMastery(null);
    setEvidence((current) => ({
      ...current,
      rebuiltAfterFailure: current.linearFailureObserved || current.rebuiltAfterFailure,
    }));
    setRuntimeFailure(null);
    onCompletionChange?.(false);
  }

  function patchConfig(patch: Partial<XorNetworkConfig>) {
    updateConfig({ ...config, ...patch });
  }

  function runNetwork() {
    try {
      const nextRun = runXorNetwork(config);
      const nextMastery = evaluateXorMastery(nextRun);
      setRun(nextRun);
      setMastery(nextMastery);
      setRuntimeFailure(null);
      onCompletionChange?.(
        evidence.predictionCorrect
        && evidence.linearFailureObserved
        && evidence.rebuiltAfterFailure
        && nextMastery.mastered,
      );
    } catch (error) {
      setRuntimeFailure(error instanceof Error ? error.message : String(error));
      setRun(null);
      setMastery(null);
      onCompletionChange?.(false);
    }
  }

  function masteryMessage() {
    if (!mastery || !run) return t("아직 hidden network를 실행하지 않았습니다.", "The hidden network has not run yet.");
    if (mastery.mastered) {
      return t(
        `XOR 4/4, 평균 BCE ${formatLoss(run.meanLoss)}입니다. h₁ 또는 h₂를 지우면 각각 ${mastery.ablatedCorrectCounts[0]}/4, ${mastery.ablatedCorrectCounts[1]}/4로 떨어져 두 feature가 모두 원인으로 작동합니다.`,
        `XOR is 4/4 with mean BCE ${formatLoss(run.meanLoss)}. Removing h₁ or h₂ drops the scores to ${mastery.ablatedCorrectCounts[0]}/4 and ${mastery.ablatedCorrectCounts[1]}/4, so both features are causally used.`,
      );
    }
    if (mastery.reason === "truth-table") {
      const failed = run.rows.filter((row) => row.predictedClass !== row.label).map((row) => row.input.join("")).join(", ");
      return t(
        `현재 ${run.correctCount}/4입니다. 실패 입력 ${failed || "—"}의 hidden 값을 비교해 feature 또는 출력 결합을 다시 설계하세요.`,
        `The network is ${run.correctCount}/4. Compare hidden values for failing inputs ${failed || "—"}, then redesign a feature or the output combination.`,
      );
    }
    if (mastery.reason === "confidence") {
      return t(
        `class는 4/4지만 평균 BCE가 ${formatLoss(run.meanLoss)}입니다. 정답 확률이 0.9 이상, 오답 확률이 0.1 이하가 되도록 logit의 여유를 키우세요.`,
        `Classes are 4/4, but mean BCE is ${formatLoss(run.meanLoss)}. Increase logit margin so positive probabilities exceed 0.9 and negatives stay below 0.1.`,
      );
    }
    return t(
      "한 hidden unit을 제거해도 결과가 유지됩니다. 서로 다른 두 feature가 실제로 필요하도록 조립하세요.",
      "The result survives removal of one hidden unit. Assemble the network so two distinct features are genuinely necessary.",
    );
  }

  const liveSummary = runtimeFailure
    ? t(`수학 모델 실행에 실패했습니다: ${runtimeFailure}. 초기화 후 다시 시도하세요.`, `The math model failed: ${runtimeFailure}. Reset and try again.`)
    : masteryMessage();

  return (
    <InteractiveLab
      kicker={t("필수 LAB · XOR FORWARD PASS", "REQUIRED LAB · XOR FORWARD PASS")}
      title={t("직선의 한계를 관찰하고 두 hidden feature로 XOR을 조립하세요", "Observe a line's limit, then assemble XOR from two hidden features")}
      description={t(
        "먼저 단일 sigmoid 경계의 결과를 예측·실행합니다. 그 실패를 본 뒤 activation, 두 hidden detector와 출력 결합을 바꿔 네 행의 실제 확률과 BCE로 검증하세요.",
        "Predict and run one sigmoid boundary first. After observing its failure, change the activation, two hidden detectors, and output combination; verify all four rows by actual probabilities and BCE.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetLab}>{t("전체 초기화", "Reset lab")}</button>}
      className="neural-xor-lab"
    >
      <fieldset className="neural-prediction-step">
        <legend>{t("1 · 단일 직선 경계 예측", "1 · Predict one linear boundary")}</legend>
        <label>
          <span>{t("XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?", "At most how many XOR points can one affine+sigmoid classify?")}</span>
          <select
            value={prediction}
            onChange={(event) => {
              const value = event.currentTarget.value as LinearPrediction;
              setPrediction(value);
              setLinearResult(null);
              setEvidence((current) => ({ ...current, predictionCorrect: false, linearFailureObserved: false, rebuiltAfterFailure: false }));
              setRun(null);
              setMastery(null);
              onCompletionChange?.(false);
            }}
          >
            <option value="" disabled>{t("먼저 예측하세요", "Predict first")}</option>
            <option value="four">4 / 4</option>
            <option value="three">3 / 4</option>
            <option value="two">2 / 4</option>
          </select>
        </label>
        <button type="button" className="button button-secondary" disabled={!prediction} onClick={runLinearPrediction}>
          {t("직선 경계 실행", "Run linear boundary")}
        </button>
        {linearResult ? (
          <p
            className={prediction === "three" ? "is-correct" : "is-incorrect"}
            role="status"
            aria-live="polite"
          >
            {prediction === "three"
              ? t(`맞았습니다. 대표 직선은 ${linearResult.correctCount}/4이고, 대각선의 두 양성을 한 half-plane에 넣으면 음성 하나도 함께 들어갑니다.`, `Correct. The representative line gets ${linearResult.correctCount}/4; one half-plane containing both diagonal positives also contains a negative.`)
              : t(`대표 직선은 ${linearResult.correctCount}/4입니다. 더 오래 최적화하는 문제가 아니라 한 직선으로 대각선 두 양성을 분리할 수 없는 표현력 문제입니다.`, `The representative line gets ${linearResult.correctCount}/4. This is not about optimizing longer; one line cannot isolate the two diagonal positives.`)}
          </p>
        ) : null}
      </fieldset>

      <section className="neural-builder" aria-labelledby="neural-builder-title">
        <header>
          <div>
            <span>{t("2 · 2→2→1 네트워크 조립", "2 · Assemble a 2→2→1 network")}</span>
            <h4 id="neural-builder-title">X[4, 2] → W¹[2, 2] → H[4, 2] → W²[2, 1] → p[4, 1]</h4>
          </div>
          <div className="neural-preset-bar" aria-label={t("깨진 네트워크 프리셋", "Broken network presets")}>
            <button type="button" aria-pressed={configEquals(config, brokenXorConfig)} onClick={() => updateConfig(brokenXorConfig)}>{t("activation 누락", "Missing activation")}</button>
            <button type="button" aria-pressed={configEquals(config, collapsedXorConfig)} onClick={() => updateConfig(collapsedXorConfig)}>{t("선형으로 축약", "Collapsed linear")}</button>
            <button type="button" aria-pressed={configEquals(config, saturatedXorConfig)} onClick={() => updateConfig(saturatedXorConfig)}>{t("출력 반전", "Inverted output")}</button>
          </div>
        </header>

        <div className="neural-config-grid">
          <label>
            <span>{t("hidden activation", "Hidden activation")}</span>
            <select value={config.activation} onChange={(event) => patchConfig({ activation: event.currentTarget.value as ActivationId })}>
              {activationIds.map((id) => <option value={id} key={id}>{activationCopy[id]}</option>)}
            </select>
          </label>
          <label>
            <span>{t("hidden unit h₁", "Hidden unit h₁")}</span>
            <select
              value={config.hiddenFeatures[0]}
              onChange={(event) => {
                const feature = event.currentTarget.value as HiddenFeatureId;
                patchConfig({ hiddenFeatures: [feature, config.hiddenFeatures[1]] });
              }}
            >
              {hiddenFeatureIds.map((id) => <option value={id} key={id}>{hiddenCopy[id]}</option>)}
            </select>
          </label>
          <label>
            <span>{t("hidden unit h₂", "Hidden unit h₂")}</span>
            <select
              value={config.hiddenFeatures[1]}
              onChange={(event) => {
                const feature = event.currentTarget.value as HiddenFeatureId;
                patchConfig({ hiddenFeatures: [config.hiddenFeatures[0], feature] });
              }}
            >
              {hiddenFeatureIds.map((id) => <option value={id} key={id}>{hiddenCopy[id]}</option>)}
            </select>
          </label>
          <label>
            <span>{t("output affine head", "Output affine head")}</span>
            <select value={config.outputHead} onChange={(event) => patchConfig({ outputHead: event.currentTarget.value as OutputHeadId })}>
              {outputHeadIds.map((id) => <option value={id} key={id}>{outputCopy[id]}</option>)}
            </select>
          </label>
        </div>
        <button type="button" className="button neural-run-button" disabled={!evidence.linearFailureObserved} onClick={runNetwork}>
          {t("네 행 forward pass 실행·판정", "Run and grade four-row forward pass")}
        </button>
        {!evidence.linearFailureObserved ? <p className="neural-builder-hint">{t("먼저 1단계의 직선 경계를 실행해 한계를 관찰하세요.", "Run the linear boundary in step 1 before rebuilding it.")}</p> : null}
      </section>

      {run ? <NeuralNetworkStateView run={run} /> : null}

      <div className="neural-evidence" aria-label={t("필수 lab 완료 증거", "Required lab completion evidence")}>
        <span className={evidence.predictionCorrect ? "is-complete" : undefined}>{evidence.predictionCorrect ? "✓" : "○"} {t("직선 한계 예측", "Predict linear limit")}</span>
        <span className={evidence.linearFailureObserved ? "is-complete" : undefined}>{evidence.linearFailureObserved ? "✓" : "○"} {t("3/4 실패 관찰", "Observe 3/4 failure")}</span>
        <span className={evidence.rebuiltAfterFailure ? "is-complete" : undefined}>{evidence.rebuiltAfterFailure ? "✓" : "○"} {t("hidden 구조 변경", "Change hidden structure")}</span>
        <span className={mastery?.mastered ? "is-complete" : undefined}>{mastery?.mastered ? "✓" : "○"} {t("XOR·BCE·ablation 통과", "Pass XOR, BCE, and ablation")}</span>
      </div>
      <div className={`neural-live-feedback${runtimeFailure ? " is-error" : mastery?.mastered ? " is-correct" : ""}`} role="status" aria-live="polite">
        {liveSummary}
      </div>
    </InteractiveLab>
  );
}

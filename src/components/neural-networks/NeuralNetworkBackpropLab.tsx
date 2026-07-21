import { useState } from "react";
import {
  forwardXorBackprop,
  runXorBackpropStep,
  type XorBackpropStep,
  xorBackpropFixture,
} from "../../features/neural-networks/backpropagation";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { DirectChoice } from "../interactive/DirectChoice";
import { MatrixGrid } from "../interactive/MatrixGrid";

type UpstreamFactor =
  | ""
  | "output-weight-transpose"
  | "first-weight-transpose"
  | "skip-upstream";

type LocalDerivative =
  | ""
  | "sigmoid-local-derivative"
  | "activation-value"
  | "skip-local";

type LabOutcome = "idle" | "incorrect" | "complete" | "error";

function formatNumber(value: number) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) < 0.0005) return "0";
  return value.toFixed(3).replace(/0+$/, "").replace(/\.$/, "");
}

function hasFiniteParameterShapedGradients(step: XorBackpropStep) {
  const gradients = step.gradients;
  const values = [
    ...gradients.firstWeights.flat(),
    ...gradients.firstBias,
    ...gradients.secondWeights,
    gradients.secondBias,
  ];
  return gradients.firstWeights.length === 2
    && gradients.firstWeights.every((row) => row.length === 2)
    && gradients.firstBias.length === 2
    && gradients.secondWeights.length === 2
    && values.every(Number.isFinite);
}

export function NeuralNetworkBackpropLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const initialForward = forwardXorBackprop();
  const representativeForward = initialForward.rows[2];
  const [upstreamFactor, setUpstreamFactor] = useState<UpstreamFactor>("");
  const [localDerivative, setLocalDerivative] = useState<LocalDerivative>("");
  const [step, setStep] = useState<XorBackpropStep | null>(null);
  const [outcome, setOutcome] = useState<LabOutcome>("idle");
  const [runtimeFailure, setRuntimeFailure] = useState<string | null>(null);

  const upstreamCorrect = upstreamFactor === "output-weight-transpose";
  const localCorrect = localDerivative === "sigmoid-local-derivative";
  const gradientsValid = step ? hasFiniteParameterShapedGradients(step) : false;
  const meanLossReduced = step
    ? step.after.meanLoss < step.before.meanLoss
      && step.after.correctCount === step.before.rows.length
    : false;

  function revokeResult() {
    setStep(null);
    setOutcome("idle");
    setRuntimeFailure(null);
    onCompletionChange?.(false);
  }

  function resetLab() {
    setUpstreamFactor("");
    setLocalDerivative("");
    revokeResult();
  }

  function runBackpropStep() {
    if (!upstreamFactor || !localDerivative) return;
    if (!upstreamCorrect || !localCorrect) {
      setStep(null);
      setOutcome("incorrect");
      setRuntimeFailure(null);
      onCompletionChange?.(false);
      return;
    }

    try {
      const nextStep = runXorBackpropStep();
      const nextGradientsValid = hasFiniteParameterShapedGradients(nextStep);
      const nextMeanLossReduced = nextStep.after.meanLoss < nextStep.before.meanLoss
        && nextStep.after.correctCount === nextStep.before.rows.length;
      const complete = nextGradientsValid && nextMeanLossReduced;
      setStep(nextStep);
      setOutcome(complete ? "complete" : "error");
      setRuntimeFailure(
        complete
          ? null
          : "Backpropagation produced invalid gradient shapes, failed to lower mean BCE, or changed the 4/4 XOR result.",
      );
      onCompletionChange?.(complete);
    } catch (error) {
      setStep(null);
      setOutcome("error");
      setRuntimeFailure(error instanceof Error ? error.message : String(error));
      onCompletionChange?.(false);
    }
  }

  function feedbackMessage() {
    if (outcome === "error") {
      return t(
        `수학 모델 실행에 실패했습니다: ${runtimeFailure ?? "unknown error"}. 초기화 후 다시 시도하세요.`,
        `The math model failed: ${runtimeFailure ?? "unknown error"}. Reset and try again.`,
      );
    }
    if (outcome === "complete" && step) {
      return t(
        `네 행의 평균 BCE가 ${formatNumber(step.before.meanLoss)} → ${formatNumber(step.after.meanLoss)}로 감소했고 XOR 4/4를 유지했습니다. forward cache를 역순으로 읽어 W¹까지 실제 gradient가 도달했습니다.`,
        `Mean BCE across all four rows fell from ${formatNumber(step.before.meanLoss)} to ${formatNumber(step.after.meanLoss)} while XOR stayed 4/4. Reading the forward cache in reverse delivered a real gradient to W¹.`,
      );
    }
    if (outcome === "incorrect") {
      if (!upstreamCorrect && !localCorrect) {
        return t(
          "두 factor를 모두 다시 보세요. 다음 층에서 온 gradient는 W²ᵀ를 거치고, sigmoid 노드에서는 H⊙(1−H)을 곱해야 합니다.",
          "Recheck both factors. The upstream gradient passes through W²ᵀ, then the sigmoid node multiplies it by H⊙(1−H).",
        );
      }
      if (!upstreamCorrect) {
        return t(
          "hidden은 자신이 output에 보낸 연결을 거슬러 올라갑니다. 따라서 upstream factor는 W²ᵀ입니다.",
          "Hidden units follow their outgoing connections back from the output, so the upstream factor is W²ᵀ.",
        );
      }
      return t(
        "sigmoid를 통과할 때 activation 값만 복사하지 않습니다. 저장한 H로 local derivative H⊙(1−H)을 계산하세요.",
        "Do not copy the activation value through sigmoid. Use cached H to compute the local derivative H⊙(1−H).",
      );
    }
    return t(
      "두 local factor를 고른 뒤 네 XOR 행의 mean BCE를 한 번 역전파하세요.",
      "Choose both local factors, then backpropagate the four-row XOR mean BCE once.",
    );
  }

  const representativeTrace = step?.rowTraces[2];
  const outputDeltas = step?.rowTraces.map((trace) => [trace.outputDelta]);
  const hiddenDeltas = step?.rowTraces.map((trace) => [...trace.hiddenLogitDelta]);

  return (
    <InteractiveLab
      kicker={t("필수 LAB · HIDDEN BACKPROP", "REQUIRED LAB · HIDDEN BACKPROP")}
      title={t(
        "빠진 두 chain-rule factor를 복구하고 한 번의 update로 BCE를 줄이세요",
        "Restore two missing chain-rule factors and reduce BCE with one update",
      )}
      description={t(
        "앞 실습과 같은 OR·NAND 방향을 유지하되 sigmoid가 포화되지 않은 2→2→1 snapshot을 사용합니다. 네 행의 gradient 기여를 평균하고 W¹까지 업데이트하세요.",
        "Reuse the previous lab's OR/NAND directions in a nonsaturated 2→2→1 snapshot. Average gradient contributions from all four rows and update through W¹.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetLab}>{t("실습 초기화", "Reset lab")}</button>}
      className="neural-backprop-lab"
    >
      <div className="neural-backprop-cache" role="group" aria-label={t("역전파 전에 저장한 forward 값", "Forward values cached before backpropagation")}>
        <article>
          <span>FULL XOR BATCH</span>
          <strong>4 / 4</strong>
          <p>{t("update 전 정확도", "accuracy before update")}</p>
        </article>
        <article>
          <span>MEAN BCE</span>
          <strong>{formatNumber(initialForward.meanLoss)}</strong>
          <p>{t("네 행 loss 평균", "mean loss over four rows")}</p>
        </article>
        <article>
          <span>{t("대표 행", "TRACE ROW")} · x=[1,0]</span>
          <strong>H=[{representativeForward.hiddenActivations.map(formatNumber).join(", ")}]</strong>
          <p>p={formatNumber(representativeForward.probability)} · y=1</p>
        </article>
      </div>

      <fieldset className="neural-backprop-controls">
        <legend>{t("backward graph의 두 빈칸", "Two missing factors in the backward graph")}</legend>
        <div className="neural-config-grid">
          <DirectChoice compact label={t("hidden으로 돌아오는 upstream factor", "Upstream factor returning to hidden")} value={upstreamFactor} options={[{ value: "output-weight-transpose", label: "W²ᵀ" }, { value: "first-weight-transpose", label: "W¹ᵀ" }, { value: "skip-upstream", label: `1 · ${t("연결 weight 생략", "skip connection weights")}` }]} onChange={(value: Exclude<UpstreamFactor, "">) => { setUpstreamFactor(value); revokeResult(); }} />
          <DirectChoice compact label={t("hidden sigmoid의 local derivative", "Hidden sigmoid local derivative")} value={localDerivative} options={[{ value: "sigmoid-local-derivative", label: "H ⊙ (1 − H)" }, { value: "activation-value", label: "H" }, { value: "skip-local", label: `1 · ${t("activation derivative 생략", "skip activation derivative")}` }]} onChange={(value: Exclude<LocalDerivative, "">) => { setLocalDerivative(value); revokeResult(); }} />
        </div>
        <button
          type="button"
          className="button neural-run-button"
          disabled={!upstreamFactor || !localDerivative}
          onClick={runBackpropStep}
        >
          {t("역전파 1 step 실행·판정", "Run and grade one backprop step")}
        </button>
      </fieldset>

      {step && representativeTrace && outputDeltas && hiddenDeltas ? (
        <div className="neural-backprop-result">
          <div
            className="neural-matrix-flow"
            role="group"
            aria-label={t("hidden-layer gradient shape 추적", "Hidden-layer gradient shape trace")}
            data-testid="neural-backprop-gradient-trace"
          >
            <MatrixGrid
              values={outputDeltas}
              label="δ² = p−y [4, 1]"
              rowLabels={["00", "01", "10", "11"]}
              columnLabels={["δ²"]}
              tone="terra"
              formatValue={formatNumber}
            />
            <span aria-hidden="true">× W²ᵀ ⊙ σ′</span>
            <MatrixGrid
              values={hiddenDeltas}
              label="δ¹ [4, 2]"
              rowLabels={["00", "01", "10", "11"]}
              columnLabels={["h₁", "h₂"]}
              tone="forest"
              formatValue={formatNumber}
            />
            <span aria-hidden="true">Xᵀ ×</span>
            <MatrixGrid
              values={step.gradients.firstWeights.map((row) => [...row])}
              label="∇W¹ [2, 2]"
              rowLabels={["x₁", "x₂"]}
              columnLabels={["h₁", "h₂"]}
              tone="indigo"
              formatValue={formatNumber}
            />
          </div>

          <article className="neural-row-trace" aria-label={t("대표 XOR 행의 chain-rule 기여", "Chain-rule contribution from the representative XOR row")}>
            <header>
              <span>{t("대표 행의 local derivative", "LOCAL DERIVATIVES FOR ONE ROW")}</span>
              <strong>x=[1, 0] → y=1</strong>
            </header>
            <dl>
              <div><dt>δ² = p−y</dt><dd>{formatNumber(representativeTrace.outputDelta)}</dd></div>
              <div><dt>W²ᵀ</dt><dd>[{xorBackpropFixture.secondWeights.join(", ")}]</dd></div>
              <div><dt>H⊙(1−H)</dt><dd>[{representativeTrace.hiddenDerivative.map(formatNumber).join(", ")}]</dd></div>
              <div><dt>δ¹</dt><dd>[{representativeTrace.hiddenLogitDelta.map(formatNumber).join(", ")}]</dd></div>
              <div><dt>xᵀδ¹</dt><dd>[[{representativeTrace.firstWeightContribution[0].map(formatNumber).join(", ")}], [{representativeTrace.firstWeightContribution[1].map(formatNumber).join(", ")}]]</dd></div>
            </dl>
            <p>{t(
              "이 행에서는 x₂=0이므로 W¹의 두 번째 입력 행 기여가 [0,0]입니다. 최종 ∇W¹은 나머지 세 행의 기여까지 더해 4로 나눈 값입니다.",
              "For this row, x₂=0 makes the second input row's W¹ contribution [0,0]. Final ∇W¹ adds the other three row contributions and divides by four.",
            )}</p>
          </article>

          <div className="neural-layer-ladder neural-backprop-loss-strip" aria-label={t("gradient update 전후 BCE", "BCE before and after the gradient update")}>
            <article><span>BEFORE</span><strong>mean BCE {formatNumber(step.before.meanLoss)}</strong><p>XOR {step.before.correctCount}/4</p></article>
            <span aria-hidden="true">→</span>
            <article><span>SGD UPDATE</span><strong>θ ← θ − {step.learningRate}·∇L</strong><p>{t("네 행 gradient 평균", "mean gradient over four rows")}</p></article>
            <span aria-hidden="true">→</span>
            <article><span>AFTER</span><strong>mean BCE {formatNumber(step.after.meanLoss)}</strong><p>XOR {step.after.correctCount}/4</p></article>
          </div>
        </div>
      ) : null}

      <div className="neural-evidence" role="group" aria-label={t("필수 hidden backprop lab 완료 증거", "Required hidden backprop lab completion evidence")}>
        <span className={upstreamCorrect ? "is-complete" : undefined}>{upstreamCorrect ? "✓" : "○"} {t("W²ᵀ upstream 경로", "W²ᵀ upstream path")}</span>
        <span className={localCorrect ? "is-complete" : undefined}>{localCorrect ? "✓" : "○"} {t("sigmoid local derivative", "Sigmoid local derivative")}</span>
        <span className={gradientsValid ? "is-complete" : undefined}>{gradientsValid ? "✓" : "○"} {t("gradient shape = parameter shape", "Gradient shape = parameter shape")}</span>
        <span className={meanLossReduced ? "is-complete" : undefined}>{meanLossReduced ? "✓" : "○"} {t("batch 평균 BCE 감소 · XOR 4/4 유지", "Lower batch mean BCE · keep XOR at 4/4")}</span>
      </div>
      <div
        id="neural-backprop-feedback"
        className={`neural-live-feedback${outcome === "complete" ? " is-correct" : outcome === "incorrect" || outcome === "error" ? " is-error" : ""}`}
        role={outcome === "error" ? "alert" : "status"}
        aria-live={outcome === "error" ? "assertive" : "polite"}
        aria-atomic="true"
      >
        {feedbackMessage()}
      </div>
    </InteractiveLab>
  );
}

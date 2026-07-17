import { useEffect, useMemo, useRef, useState } from "react";
import {
  TRANSFORMER_BLOCK_LAYER_NORM_EPSILON,
  canonicalTransformerBlockConfig,
  emptyTransformerBlockLabEvidence,
  evaluateTransformerBlockLabMastery,
  gradeTransformerBlockChallenge,
  isValidTransformerBlockInspection,
  probePositionWiseFfnContract,
  runTransformerBlock,
  transformerBlockChallengeDefaults,
  transformerBlockChallengeIds,
  transformerBlockCoreChallengeIds,
  transformerBlockChallengeRequirements,
  transformerBlockTokens,
  type TransformerBlockChallengeId,
  type TransformerBlockConfig,
  type TransformerBlockInspectStage,
  type TransformerBlockLabEvidenceEvent,
  type TransformerBlockPrediction,
  type TransformerBlockTrace,
} from "../../features/transformer-block/transformer-block-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { MatrixGrid } from "../interactive/MatrixGrid";
import { StepExplorer } from "../interactive/StepExplorer";

type Feedback = { correct: boolean; title: string; message: string };
type SuccessfulAttempt = {
  attemptId: string;
  challengeId: TransformerBlockChallengeId;
  config: TransformerBlockConfig;
};

function configCopy(config: TransformerBlockConfig): TransformerBlockConfig {
  return { ...config };
}

function formatValue(value: number) {
  if (Math.abs(value) >= 100) return value.toFixed(0);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

export function TransformerBlockLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [challengeId, setChallengeId] = useState<TransformerBlockChallengeId>("position-input");
  const [configState, setConfigState] = useState(() => configCopy(transformerBlockChallengeDefaults["position-input"]));
  const [positionScaleInput, setPositionScaleInput] = useState("0");
  const [epsilonInput, setEpsilonInput] = useState(String(TRANSFORMER_BLOCK_LAYER_NORM_EPSILON));
  const [prediction, setPrediction] = useState<TransformerBlockPrediction | "">("");
  const [trace, setTrace] = useState<TransformerBlockTrace | null>(null);
  const [activeStage, setActiveStage] = useState<TransformerBlockInspectStage>("position-input");
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [runtimeFailure, setRuntimeFailure] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [evidence, setEvidence] = useState(emptyTransformerBlockLabEvidence);
  const [successfulAttempt, setSuccessfulAttempt] = useState<SuccessfulAttempt | null>(null);
  const eventCounter = useRef(0);
  const attemptCounter = useRef(0);
  const predictionRef = useRef<HTMLSelectElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);

  const mastery = useMemo(() => evaluateTransformerBlockLabMastery(evidence), [evidence]);
  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(mastery.mastered), [mastery.mastered, onCompletionChange]);
  useEffect(() => {
    if (runtimeFailure) requestAnimationFrame(() => recoveryButtonRef.current?.focus());
  }, [runtimeFailure]);

  const challengeCopy = {
    "position-input": {
      label: t("1 · position input", "1 · Position input"),
      prompt: t("sinusoidal P가 언제, 어떤 shape로 더해지는지 예측하고 position scale을 복구하세요.", "Predict when and at what shape sinusoidal P is added, then repair the position scale."),
      predictions: [
        ["position-omitted", t("causal mask만으로 충분해 P는 생략한다", "omit P because the causal mask is enough")],
        ["position-added-after-output", t("block output 뒤에 P를 더한다", "add P after the block output")],
        ["position-added-before-attention", t("첫 block 전 embedding에 P를 더한다", "add P to embeddings before the first block")],
      ],
    },
    layernorm: {
      label: t("2 · feature-axis LN", "2 · Feature-axis LN"),
      prompt: t("각 token row의 feature mean·variance와 epsilon 계약을 예측하고 pre-norm을 복구하세요.", "Predict each token row's feature mean, variance, and epsilon contract, then repair pre-norm."),
      predictions: [
        ["token-axis-normalized", t("feature마다 token축을 정규화한다", "normalize the token axis for each feature")],
        ["epsilon-unnecessary", t("variance가 있으므로 epsilon은 불필요하다", "epsilon is unnecessary when variance is nonzero")],
        ["feature-axis-centered-with-epsilon", t("token별 feature축을 epsilon과 정규화한다", "normalize features per token with epsilon")],
      ],
    },
    "attention-residual": {
      label: t("3 · Attention residual", "3 · Attention residual"),
      prompt: t("Attention branch가 어느 state에 더해지는지 예측하고 첫 skip path를 복구하세요.", "Predict which state receives the attention branch, then repair the first skip path."),
      predictions: [
        ["attention-replaces-x0", t("Attention 출력이 x₀를 교체한다", "the attention output replaces x0")],
        ["norm1-is-residual-base", t("LN(x₀)에 Attention을 더한다", "add attention to LN(x0)")],
        ["attention-update-adds-to-x0", t("원래 x₀에 Attention을 더한다", "add attention to the original x0")],
      ],
    },
    "positionwise-ffn": {
      label: t("4 · row-wise FFN", "4 · Row-wise FFN"),
      prompt: t("FFN parameter 공유와 token 독립성을 예측하고 shared ReLU FFN을 복구하세요.", "Predict FFN parameter sharing and token independence, then repair the shared ReLU FFN."),
      predictions: [
        ["one-ffn-per-position", t("position마다 별도 FFN parameter를 쓴다", "use separate FFN parameters at every position")],
        ["ffn-mixes-token-rows", t("FFN이 token row끼리 섞는다", "the FFN mixes token rows")],
        ["shared-rowwise-relu-permutation-equivariant", t("같은 ReLU MLP를 row마다 독립 적용한다", "apply one shared ReLU MLP independently to each row")],
      ],
    },
    "block-handoff": {
      label: t("5 · second skip · handoff", "5 · Second skip · handoff"),
      prompt: t("두 번째 residual 뒤 output shape와 다음 단계 경계를 예측하고 skip을 복구하세요.", "Predict the output shape and next-stage boundary after the second residual, then repair the skip."),
      predictions: [
        ["ffn-output-replaces-stream", t("FFN 출력이 stream을 교체한다", "the FFN output replaces the stream")],
        ["token-axis-concatenates", t("FFN을 token축으로 concat한다", "concatenate the FFN on the token axis")],
        ["second-skip-preserves-tokens-and-width", t("x₁+FFN으로 [T,d_model]을 유지한다", "use x1 plus FFN to keep [T,d_model]")],
      ],
    },
  } satisfies Record<TransformerBlockChallengeId, {
    label: string;
    prompt: string;
    predictions: Array<[TransformerBlockPrediction, string]>;
  }>;

  const misconceptionHints: Partial<Record<TransformerBlockPrediction, string>> = {
    "position-omitted": t("causal mask는 미래 visibility만 제한하고 absolute position vector를 만들지 않습니다. 이 fixture에서는 첫 block 전에 E와 P를 더하세요.", "A causal mask only limits future visibility; it does not create an absolute position vector. Add E and P before the first block in this fixture."),
    "position-added-after-output": t("block 출력 뒤에 P를 더하면 Attention과 FFN이 위치를 읽지 못합니다. P는 첫 norm보다 앞선 입력 경계에 있어야 합니다.", "Adding P after the block prevents attention and the FFN from reading position. P belongs at the input boundary before the first normalization."),
    "token-axis-normalized": t("LayerNorm은 feature마다 여러 token을 묶지 않습니다. 각 token row 안의 d_model feature로 mean과 variance를 계산하세요.", "LayerNorm does not group multiple tokens per feature. Compute mean and variance over d_model features within each token row."),
    "epsilon-unnecessary": t("constant 또는 tiny-variance row에서는 epsilon이 없으면 분모가 0에 가까워져 비유한값이 생길 수 있습니다. sqrt(variance+epsilon)을 사용하세요.", "A constant or tiny-variance row can produce a zero-like denominator and non-finite values without epsilon. Use sqrt(variance+epsilon)."),
    "attention-replaces-x0": t("Attention output은 stream을 교체하지 않습니다. 같은 [T,d_model] 좌표의 원래 x₀에 branch update를 더하세요.", "Attention output does not replace the stream. Add the branch update to the original x0 at matching [T,d_model] coordinates."),
    "norm1-is-residual-base": t("LN(x₀)는 Attention branch 입력이고 residual 기준은 아닙니다. skip path에는 정규화 전의 원래 x₀를 보존하세요.", "LN(x0) is the attention-branch input, not the residual base. Preserve the original pre-normalization x0 on the skip path."),
    "one-ffn-per-position": t("position마다 다른 MLP를 두지 않습니다. 같은 W₁,b₁,W₂,b₂를 모든 token row에 공유해야 row 순열에도 같은 결과가 납니다.", "Do not assign a different MLP to each position. Share W1, b1, W2, and b2 across every token row so row permutations produce matching results."),
    "ffn-mixes-token-rows": t("token mixing은 Attention의 역할입니다. position-wise FFN은 각 row의 feature만 같은 MLP로 독립 변환합니다.", "Token mixing is attention's job. The position-wise FFN independently transforms features within each row using the same MLP."),
    "ffn-output-replaces-stream": t("두 번째 sublayer도 residual update입니다. FFN output으로 stream을 교체하지 말고 원래 x₁에 더하세요.", "The second sublayer is also a residual update. Add the FFN output to the original x1 instead of replacing the stream."),
    "token-axis-concatenates": t("residual은 token축 concat이 아니라 같은 shape의 element-wise 덧셈입니다. x₁과 FFN output을 [T,d_model] 그대로 더하세요.", "A residual is same-shaped element-wise addition, not token-axis concatenation. Add x1 and the FFN output while preserving [T,d_model]."),
  };

  const stages = [
    { id: "position-input", index: "01", label: t("E + P", "E + P") },
    { id: "norm1", index: "02", label: "LN(x₀)" },
    { id: "residual1", index: "03", label: "x₀ + MHA" },
    { id: "ffn", index: "04", label: "LN(x₁) → FFN" },
    { id: "output", index: "05", label: "x₁ + FFN" },
  ] satisfies Array<{ id: TransformerBlockInspectStage; index: string; label: string }>;

  const currentConfig = (): TransformerBlockConfig => ({
    ...configState,
    positionScale: Number(positionScaleInput),
    layerNormEpsilon: Number(epsilonInput),
  });

  const invalidateRun = () => {
    setTrace(null);
    setSuccessfulAttempt(null);
    setSelectedCell(null);
    setFeedback(null);
    setRuntimeFailure(false);
  };

  const chooseChallenge = (next: TransformerBlockChallengeId) => {
    const defaults = configCopy(transformerBlockChallengeDefaults[next]);
    const inspection = transformerBlockChallengeRequirements[next].requiredInspection;
    setChallengeId(next);
    setConfigState(defaults);
    setPositionScaleInput(String(defaults.positionScale));
    setEpsilonInput(String(defaults.layerNormEpsilon));
    setPrediction("");
    setActiveStage(inspection.stage);
    invalidateRun();
    requestAnimationFrame(() => predictionRef.current?.focus());
  };

  const updateConfig = (patch: Partial<TransformerBlockConfig>) => {
    setConfigState((current) => ({ ...current, ...patch }));
    invalidateRun();
  };

  const nextEventId = () => `tb-e${++eventCounter.current}`;

  const runChallenge = () => {
    if (!prediction) return;
    const config = currentConfig();
    try {
      const nextTrace = runTransformerBlock(config);
      const grade = gradeTransformerBlockChallenge(challengeId, prediction, config);
      const attemptId = `tb-a${++attemptCounter.current}`;
      const frozenConfig = Object.freeze({ ...config });
      const base = { attemptId, challengeId, config: frozenConfig };
      const events: TransformerBlockLabEvidenceEvent[] = [
        { ...base, eventId: nextEventId(), kind: "prediction", prediction },
        { ...base, eventId: nextEventId(), kind: "run" },
      ];
      setEvidence((current) => ({ events: Object.freeze([...current.events, ...events]) }));
      setTrace(nextTrace);
      setRuntimeFailure(false);
      setSuccessfulAttempt(grade.correct ? { attemptId, challengeId, config: frozenConfig } : null);
      const configHint = config.positionScale !== 1
        ? t("position scale을 1로 복구해 E+P를 실행하세요.", "Restore position scale to 1 and execute E+P.")
        : !config.preNorm
          ? t("두 sublayer가 LN(x)를 입력으로 받도록 pre-norm을 켜세요.", "Enable pre-norm so both sublayers receive LN(x).")
          : !config.firstResidual
            ? t("Attention 출력을 원래 x₀에 더하는 첫 residual을 켜세요.", "Enable the first residual that adds attention to the original x0.")
            : !config.sharedFfn
              ? t("모든 token row가 같은 FFN parameter를 공유하게 하세요.", "Make every token row share the same FFN parameters.")
              : !config.secondResidual
                ? t("FFN 출력을 x₁에 더하는 두 번째 residual을 켜세요.", "Enable the second residual that adds the FFN output to x1.")
                : config.layerNormEpsilon !== TRANSFORMER_BLOCK_LAYER_NORM_EPSILON
                  ? t("LayerNorm epsilon을 0.00001로 복구하세요.", "Restore LayerNorm epsilon to 0.00001.")
                  : t("prediction과 선택한 block 계약을 다시 점검하세요.", "Recheck the prediction and selected block contract.");
      const required = transformerBlockChallengeRequirements[challengeId].requiredInspection;
      setActiveStage(required.stage);
      setSelectedCell({ row: required.tokenIndex, column: required.featureIndex });
      setFeedback(grade.correct ? {
        correct: true,
        title: t("예측과 실행 계약이 맞았습니다", "Prediction and executed contract match"),
        message: t(`이제 token ${required.tokenIndex}, feature ${required.featureIndex}의 ${required.stage} 수치를 직접 눌러 증거를 기록하세요.`, `Now select token ${required.tokenIndex}, feature ${required.featureIndex} in ${required.stage} to record numeric evidence.`),
      } : {
        correct: false,
        title: grade.predictionCorrect ? t("조립 설정이 아직 깨져 있습니다", "The assembly setup is still broken") : t("예측과 실행 결과가 다릅니다", "The prediction differs from the executed result"),
        message: grade.predictionCorrect ? configHint : misconceptionHints[prediction] ?? configHint,
      });
      requestAnimationFrame(() => predictionRef.current?.focus());
    } catch {
      setTrace(null);
      setSuccessfulAttempt(null);
      setRuntimeFailure(true);
      setFeedback(null);
    }
  };

  const recordInspection = (stage: TransformerBlockInspectStage, row: number, column: number) => {
    setSelectedCell({ row, column });
    if (!successfulAttempt || successfulAttempt.challengeId !== challengeId) {
      setFeedback({
        correct: false,
        title: t("먼저 예측과 조립 실행을 완료하세요", "Complete the prediction and assembly run first"),
        message: t("정답 설정으로 block을 실행한 뒤 요구된 matrix cell을 직접 선택할 수 있습니다.", "Run the block with the correct setup before selecting the required matrix cell."),
      });
      return;
    }
    const inspection = { stage, tokenIndex: row, featureIndex: column };
    if (!isValidTransformerBlockInspection(challengeId, successfulAttempt.config, inspection)) {
      const required = transformerBlockChallengeRequirements[challengeId].requiredInspection;
      setFeedback({
        correct: false,
        title: t("아직 필수 수치 증거가 아닙니다", "This is not the required numeric evidence yet"),
        message: t(`${required.stage}의 token ${required.tokenIndex}, feature ${required.featureIndex} cell을 선택해 해당 invariant를 확인하세요.`, `Select token ${required.tokenIndex}, feature ${required.featureIndex} in ${required.stage} to inspect the required invariant.`),
      });
      return;
    }
    const event: TransformerBlockLabEvidenceEvent = {
      eventId: nextEventId(),
      attemptId: successfulAttempt.attemptId,
      challengeId,
      config: Object.freeze({ ...successfulAttempt.config }),
      kind: "inspect",
      ...inspection,
    };
    setEvidence((current) => ({ events: Object.freeze([...current.events, event]) }));
    setSuccessfulAttempt(null);
    setFeedback({
      correct: true,
      title: t("수치 관찰 증거를 기록했습니다", "Numeric inspection evidence recorded"),
      message: t("다음 preset으로 이동해 다른 block 경계를 예측·복구하세요.", "Move to the next preset and predict and repair another block boundary."),
    });
  };

  const resetCurrent = () => chooseChallenge(challengeId);

  const resetAll = () => {
    const defaults = transformerBlockChallengeDefaults["position-input"];
    eventCounter.current = 0;
    attemptCounter.current = 0;
    setEvidence(emptyTransformerBlockLabEvidence);
    setChallengeId("position-input");
    setConfigState(configCopy(defaults));
    setPositionScaleInput(String(defaults.positionScale));
    setEpsilonInput(String(defaults.layerNormEpsilon));
    setPrediction("");
    setTrace(null);
    setActiveStage("position-input");
    setSelectedCell(null);
    setFeedback(null);
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
    requestAnimationFrame(() => resetButtonRef.current?.focus());
  };

  const recoverRuntime = () => {
    const defaults = transformerBlockChallengeDefaults[challengeId];
    setConfigState(configCopy(defaults));
    setPositionScaleInput(String(defaults.positionScale));
    setEpsilonInput(String(defaults.layerNormEpsilon));
    setPrediction("");
    setTrace(null);
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
    requestAnimationFrame(() => predictionRef.current?.focus());
  };

  const rowLabels = [...transformerBlockTokens];
  const featureLabels = ["d0", "d1", "d2", "d3"];
  const hiddenLabels = ["h0", "h1", "h2", "h3", "h4", "h5"];
  const ffnContract = trace ? probePositionWiseFfnContract(trace.config) : null;
  const attentionInputLabel = trace?.config.preNorm ? "LN(x₀)" : t("x₀ · LN 우회", "x₀ · LN bypassed");
  const ffnInputLabel = trace?.config.preNorm ? "LN(x₁)" : t("x₁ · LN 우회", "x₁ · LN bypassed");
  const firstResidualEquation = trace?.config.firstResidual
    ? `x₀ + MHA(${attentionInputLabel})`
    : t(`MHA(${attentionInputLabel})가 x₀를 교체`, `MHA(${attentionInputLabel}) replaces x₀`);
  const secondResidualEquation = trace?.config.secondResidual
    ? `x₁ + FFN(${ffnInputLabel})`
    : t(`FFN(${ffnInputLabel})이 x₁을 교체`, `FFN(${ffnInputLabel}) replaces x₁`);

  const targetGrid = (
    values: readonly (readonly number[])[],
    label: string,
    stage: TransformerBlockInspectStage,
    tone: "forest" | "indigo" | "terra" = "indigo",
  ) => {
    const required = transformerBlockChallengeRequirements[challengeId].requiredInspection;
    const targetCell = successfulAttempt?.challengeId === challengeId && required.stage === stage
      ? { row: required.tokenIndex, column: required.featureIndex }
      : null;
    return <MatrixGrid
      values={values as number[][]}
      label={label}
      rowLabels={rowLabels}
      columnLabels={featureLabels}
      selectedCell={selectedCell}
      targetCell={targetCell}
      tone={tone}
      formatValue={formatValue}
      onSelectCell={(row, column) => recordInspection(stage, row, column)}
    />;
  };

  return (
    <InteractiveLab
      kicker={t("CORE LAB · 핵심 3 + 선택 2 · PREDICT → CONFIGURE → ASSEMBLE → INSPECT", "CORE LAB · 3 CORE + 2 OPTIONAL · PREDICT → CONFIGURE → ASSEMBLE → INSPECT")}
      title={t("Pre-Norm Block Assembly Workbench", "Pre-Norm Block Assembly Workbench")}
      description={t("LayerNorm·FFN·block handoff의 핵심 preset 세 개를 완료하면 통과합니다. 나머지 두 preset은 선택 탐색입니다.", "Complete the three core LayerNorm, FFN, and block-handoff presets. The other two presets are optional exploration.")}
      className="transformer-block-workbench"
      actions={<button ref={resetButtonRef} type="button" className="button button-ghost" aria-label={t("Transformer block lab 전체 초기화", "Reset the entire Transformer block lab")} onClick={resetAll}>{t("전체 lab 초기화", "Reset entire lab")}</button>}
    >
      <div data-interactive-ready={interactiveReady ? "true" : "false"}>
        <div className="transformer-block-preset-row" role="group" aria-label={t("Transformer block challenge preset", "Transformer block challenge presets")}>
          <span>CHALLENGE PRESETS</span>
          {transformerBlockChallengeIds.map((id) => {
            const core = transformerBlockCoreChallengeIds.some((coreId) => coreId === id);
            return <button type="button" data-transformer-block-preset={id} data-core-challenge={core ? "true" : "false"} aria-pressed={challengeId === id} onClick={() => chooseChallenge(id)} key={id}>{core ? t("핵심", "Core") : t("선택", "Optional")} · {challengeCopy[id].label}</button>;
          })}
        </div>

        <div className="transformer-block-control-panel">
          <label><span>{t("position scale · canonical 1", "Position scale · canonical 1")}</span><input aria-label={t("Transformer block position scale", "Transformer block position scale")} type="number" inputMode="decimal" min="0" max="2" step="0.25" value={positionScaleInput} onChange={(event) => { setPositionScaleInput(event.currentTarget.value); invalidateRun(); }} /></label>
          <label><span>{t("block ordering", "Block ordering")}</span><select aria-label={t("Transformer block pre-norm", "Transformer block pre-norm")} value={configState.preNorm ? "pre" : "bypass"} onChange={(event) => updateConfig({ preNorm: event.currentTarget.value === "pre" })}><option value="bypass">{t("LN branch 우회", "bypass normalized branch")}</option><option value="pre">pre-LayerNorm</option></select></label>
          <label><span>{t("Attention skip", "Attention skip")}</span><select aria-label={t("Transformer block 첫 residual", "Transformer block first residual")} value={configState.firstResidual ? "add" : "replace"} onChange={(event) => updateConfig({ firstResidual: event.currentTarget.value === "add" })}><option value="replace">{t("x₀ 교체", "replace x0")}</option><option value="add">x₀ + MHA</option></select></label>
          <label><span>{t("FFN parameters", "FFN parameters")}</span><select aria-label={t("Transformer block FFN 공유", "Transformer block FFN sharing")} value={configState.sharedFfn ? "shared" : "per-position"} onChange={(event) => updateConfig({ sharedFfn: event.currentTarget.value === "shared" })}><option value="per-position">{t("position별 별도", "separate per position")}</option><option value="shared">{t("모든 row 공유", "shared by every row")}</option></select></label>
          <label><span>{t("FFN skip", "FFN skip")}</span><select aria-label={t("Transformer block 두 번째 residual", "Transformer block second residual")} value={configState.secondResidual ? "add" : "replace"} onChange={(event) => updateConfig({ secondResidual: event.currentTarget.value === "add" })}><option value="replace">{t("x₁ 교체", "replace x1")}</option><option value="add">x₁ + FFN</option></select></label>
          <label><span>LayerNorm epsilon</span><input aria-label={t("Transformer block LayerNorm epsilon", "Transformer block LayerNorm epsilon")} type="number" inputMode="decimal" min="0" max="0.01" step="0.00001" value={epsilonInput} onChange={(event) => { setEpsilonInput(event.currentTarget.value); invalidateRun(); }} /></label>
          <label><span>{t("실행 전 예측", "Prediction before running")}</span><select ref={predictionRef} aria-label={t("Transformer block challenge 예측", "Transformer block challenge prediction")} value={prediction} onChange={(event) => { setPrediction(event.currentTarget.value as TransformerBlockPrediction); invalidateRun(); }}><option value="">{t("예측 선택", "Choose a prediction")}</option>{challengeCopy[challengeId].predictions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <div className="transformer-block-run-actions">
            <button type="button" className="button button-primary" disabled={!prediction} aria-label={t("Transformer block 조립 실행", "Assemble and run the Transformer block")} onClick={runChallenge}>{t("예측 고정 · block 조립", "Lock prediction · assemble block")}</button>
            <button type="button" className="button button-secondary" aria-label={t("현재 Transformer block challenge 초기화", "Reset the current Transformer block challenge")} onClick={resetCurrent}>{t("현재 설정 초기화", "Reset current setup")}</button>
          </div>
        </div>

        <div className={`transformer-block-live-feedback${feedback ? feedback.correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          <strong>{feedback?.title ?? t("실행 전 prediction과 조립 설정을 고정하세요", "Lock a prediction and assembly setup before running")}</strong>
          <span>{feedback?.message ?? challengeCopy[challengeId].prompt}</span>
        </div>

        {runtimeFailure ? <div className="transformer-block-runtime-fallback" role="alert"><strong>{t("로컬 Transformer block runtime 실패", "Local Transformer block runtime failure")}</strong><p>{t("position scale, epsilon 또는 계산값이 유한한 범위를 벗어났습니다. 기존 숙달 증거는 유지한 채 이 challenge의 시작 preset으로 복구할 수 있습니다.", "The position scale, epsilon, or a derived value left the finite range. Existing mastery evidence is preserved while you recover to this challenge's starting preset.")}</p><button ref={recoveryButtonRef} type="button" className="button button-secondary" onClick={recoverRuntime}>{t("challenge 시작 preset으로 안전하게 복구", "Recover safely to the challenge starting preset")}</button></div> : null}

        <StepExplorer stages={stages} activeStage={activeStage} onStageChange={(stage) => { setActiveStage(stage); setSelectedCell(null); }} ariaLabel={t("Transformer block 계산 단계", "Transformer block computation stages")} panelId="transformer-block-stage-panel" />

        <div className="transformer-block-stage-panel" id="transformer-block-stage-panel">
          {!trace ? <header><span>{activeStage.toUpperCase()}</span><strong>{t("아직 조립 trace가 없습니다", "No assembly trace yet")}</strong><p>{t("prediction을 고르고 block을 실행하면 이 단계의 matrix와 invariant가 나타납니다.", "Choose a prediction and run the block to reveal this stage's matrices and invariants.")}</p></header> : null}
          {trace && activeStage === "position-input" ? <>
            <header><span>EMBEDDING + SCALED SINUSOIDAL POSITION</span><strong>{t(`token 1, feature 0에서 실행된 E + ${trace.config.positionScale}·P = x₀를 확인하세요`, `Inspect the executed E plus ${trace.config.positionScale} times P equals x0 at token 1, feature 0`)}</strong><p>{t("canonical scale 1의 정답 실행에서 x₀ target cell을 눌러야 evidence가 기록됩니다.", "Evidence is recorded only by selecting the x0 target cell after a correct canonical-scale-1 run.")}</p></header>
            <div className="transformer-block-matrix-stack"><MatrixGrid values={trace.tokenEmbeddings as number[][]} label="token embeddings E [4,4]" rowLabels={rowLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.scaledPositionSignal as number[][]} label={`position signal ${trace.config.positionScale}·P [4,4]`} rowLabels={rowLabels} columnLabels={featureLabels} tone="forest" formatValue={formatValue} />{targetGrid(trace.x0, trace.config.positionScale === 1 ? "target x₀ = E + P [4,4]" : `executed x₀ = E + ${trace.config.positionScale}·P [4,4]`, "position-input")}</div>
          </> : null}
          {trace && activeStage === "norm1" ? <>
            <header><span>{trace.config.preNorm ? "FEATURE-AXIS LAYERNORM APPLIED" : "LAYERNORM BYPASSED IN EXECUTED BRANCH"}</span><strong>{trace.config.preNorm ? t("token 1의 feature row 통계와 d2 값을 검사하세요", "Inspect token 1's feature-row statistics and d2 value") : t("실행된 Attention 입력은 정규화되지 않은 x₀입니다", "The executed attention input is the unnormalized x0")}</strong><p>{trace.config.preNorm ? t("fixture γ=1, β=0이며 variance contract는 σ²/(σ²+ε)입니다.", "The fixture uses gamma=1 and beta=0; the variance contract is sigma squared divided by sigma squared plus epsilon.") : t("reference LN trace가 계산되어도 branch가 우회했으므로 Attention은 x₀를 직접 읽습니다.", "A reference LN trace is still computed, but the bypassed branch makes attention read x0 directly.")}</p></header>
            <div className="transformer-block-matrix-stack"><MatrixGrid values={trace.x0 as number[][]} label="x₀ before LN [4,4]" rowLabels={rowLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} />{targetGrid(trace.attention.input, trace.config.preNorm ? "target LN(x₀) [4,4]" : "executed Attention input x₀ · LN bypassed [4,4]", "norm1")}</div>
            {trace.config.preNorm
              ? <div className="transformer-block-stat-grid">{trace.norm1.rows.slice(0, 3).map((row) => <span key={row.tokenIndex}><strong>token {row.tokenIndex}</strong> μ={formatValue(row.outputMean)} · var={formatValue(row.outputVariance)}</span>)}</div>
              : <div className="transformer-block-stat-grid"><span><strong>{t("참고 LN 통계 · 실행에는 미적용", "REFERENCE LN STATS · NOT APPLIED")}</strong>{t("branch가 x₀를 직접 읽으므로 이 실행의 Attention 입력 통계가 아닙니다.", "The branch reads x0 directly, so these are not the statistics of this execution's attention input.")}</span></div>}
          </> : null}
          {trace && activeStage === "residual1" ? <>
            <header><span>EXECUTED ATTENTION BRANCH + FIRST SKIP</span><strong>{firstResidualEquation}</strong><p>{trace.config.firstResidual ? t(`Attention은 ${attentionInputLabel}에서 실행되고 residual base는 원래 x₀입니다.`, `Attention runs on ${attentionInputLabel}, and the residual base is the original x0.`) : t("첫 skip이 꺼져 Attention 출력이 x₀를 교체했습니다.", "With the first skip disabled, attention output replaced x0.")}</p></header>
            <div className="transformer-block-matrix-stack"><MatrixGrid values={trace.x0 as number[][]} label={trace.config.firstResidual ? "residual base x₀ [4,4]" : "discarded x₀ · first skip off [4,4]"} rowLabels={rowLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.attention.output as number[][]} label={`MHA(${attentionInputLabel}) [4,4]`} rowLabels={rowLabels} columnLabels={featureLabels} tone="forest" formatValue={formatValue} />{targetGrid(trace.residual1, "target x₁ [4,4]", "residual1")}</div>
          </> : null}
          {trace && activeStage === "ffn" ? <>
            <header><span>{trace.config.sharedFfn ? "SHARED POSITION-WISE RELU FFN" : "POSITION-SPECIFIC RELU FFN · BROKEN SHARING"}</span><strong>{t("token 2, d1의 실행된 FFN output과 row 독립성을 검사하세요", "Inspect the executed FFN output at token 2, d1 and row independence")}</strong><p>{trace.config.sharedFfn ? t(`[4,4]→[4,6]→[4,4]이며 같은 parameter set 0을 모든 row가 사용합니다. 입력은 ${ffnInputLabel}입니다.`, `[4,4] to [4,6] to [4,4] uses parameter set 0 for every row. Its input is ${ffnInputLabel}.`) : t(`position마다 다른 parameter set을 사용한 결함 실행입니다. 입력은 ${ffnInputLabel}입니다.`, `This broken execution uses a different parameter set per position. Its input is ${ffnInputLabel}.`)}</p></header>
            <div className="transformer-block-matrix-stack"><MatrixGrid values={trace.ffn.input as number[][]} label={`${ffnInputLabel} · executed FFN input [4,4]`} rowLabels={rowLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.ffn.hidden as number[][]} label="ReLU hidden [4,6]" rowLabels={rowLabels} columnLabels={hiddenLabels} tone="forest" formatValue={formatValue} />{targetGrid(trace.ffn.output, "target FFN output [4,4]", "ffn")}</div>
            <div className="transformer-block-stat-grid"><span><strong>{t("순열 오차", "Permutation error")}</strong>{formatValue(ffnContract?.permutationError ?? 0)}</span><span><strong>{t("다른 row 누출", "Other-row leak")}</strong>{formatValue(ffnContract?.isolationLeak ?? 0)}</span></div>
          </> : null}
          {trace && activeStage === "output" ? <>
            <header><span>EXECUTED SECOND SKIP + BLOCK HANDOFF</span><strong>{secondResidualEquation}</strong><p>{trace.config.secondResidual ? t("이 hidden state는 logits가 아니며 다음 block 또는 final norm으로 갑니다.", "This hidden state is not logits; it goes to the next block or final normalization.") : t("두 번째 skip이 꺼져 FFN output이 x₁을 교체한 결함 state입니다.", "With the second skip disabled, the FFN output replaced x1, producing a broken state.")}</p></header>
            <div className="transformer-block-matrix-stack"><MatrixGrid values={trace.residual1 as number[][]} label={trace.config.secondResidual ? "residual base x₁ [4,4]" : "discarded x₁ · second skip off [4,4]"} rowLabels={rowLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.ffn.output as number[][]} label={`FFN(${ffnInputLabel}) [4,4]`} rowLabels={rowLabels} columnLabels={featureLabels} tone="forest" formatValue={formatValue} />{targetGrid(trace.output, "target block output y [4,4]", "output")}</div>
            <div className="transformer-block-handoff-note"><strong>[{trace.handoff.outputShape.join(",")}]</strong><span>{t("token axis 보존 · model width 보존 · next: mini-transformer", "token axis preserved · model width preserved · next: mini-transformer")}</span></div>
          </> : null}
        </div>

        <div className="transformer-block-evidence" data-mastered={mastery.mastered ? "true" : "false"} role="status" aria-live="polite">
          <strong>MASTERY EVIDENCE · PREDICTION → ASSEMBLY → NUMERIC CELL</strong>
          {transformerBlockChallengeIds.map((id) => {
            const core = transformerBlockCoreChallengeIds.some((coreId) => coreId === id);
            const complete = mastery.completedChallengeIds.includes(id);
            return <span className={`${core ? "is-core" : "is-optional"}${complete ? " is-complete" : ""}`} key={id}>{complete ? "✓" : core ? "○" : t("선택", "Optional")} {challengeCopy[id].label}</span>;
          })}
        </div>
      </div>
    </InteractiveLab>
  );
}

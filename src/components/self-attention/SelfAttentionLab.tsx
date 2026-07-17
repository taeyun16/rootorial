import { useEffect, useMemo, useRef, useState } from "react";
import {
  canonicalSelfAttentionConfig,
  emptySelfAttentionLabEvidence,
  evaluateSelfAttentionLabMastery,
  gradeSelfAttentionChallenge,
  isValidSelfAttentionInspection,
  runSelfAttention,
  selfAttentionChallengeDefaults,
  selfAttentionChallengeIds,
  selfAttentionCoreChallengeIds,
  selfAttentionTokens,
  type SelfAttentionChallengeId,
  type SelfAttentionInspectStage,
  type SelfAttentionLabEvidenceEvent,
  type SelfAttentionPrediction,
  type SelfAttentionRunConfig,
  type SelfAttentionTrace,
} from "../../features/self-attention/self-attention-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { MatrixGrid } from "../interactive/MatrixGrid";
import { StepExplorer } from "../interactive/StepExplorer";

type Feedback = { correct: boolean; title: string; message: string };
type SuccessfulAttempt = { attemptId: string; challengeId: SelfAttentionChallengeId; config: SelfAttentionRunConfig };

const requiredInspection: Readonly<Record<SelfAttentionChallengeId, SelfAttentionInspectStage>> = {
  projection: "projections",
  scaling: "scores",
  "causal-mask": "mask",
  "padding-key": "weights",
  "multi-head": "output",
};

const challengeView: Readonly<Record<SelfAttentionChallengeId, { head: number; query: number }>> = {
  projection: { head: 1, query: 0 },
  scaling: { head: 1, query: 2 },
  "causal-mask": { head: 1, query: 1 },
  "padding-key": { head: 1, query: 0 },
  "multi-head": { head: 0, query: 2 },
};

function configCopy(config: SelfAttentionRunConfig): SelfAttentionRunConfig {
  return { ...config };
}

function formatValue(value: number) {
  return Math.abs(value) >= 10 ? value.toFixed(1) : value.toFixed(3);
}

export function SelfAttentionLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [challengeId, setChallengeId] = useState<SelfAttentionChallengeId>("projection");
  const [configState, setConfigState] = useState(() => configCopy(selfAttentionChallengeDefaults.projection));
  const [gainInput, setGainInput] = useState("1");
  const [prediction, setPrediction] = useState<SelfAttentionPrediction | "">("");
  const [trace, setTrace] = useState<SelfAttentionTrace | null>(null);
  const [activeStage, setActiveStage] = useState<SelfAttentionInspectStage>("projections");
  const [selectedHead, setSelectedHead] = useState(1);
  const [selectedQuery, setSelectedQuery] = useState(0);
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [runtimeFailure, setRuntimeFailure] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [evidence, setEvidence] = useState(emptySelfAttentionLabEvidence);
  const [successfulAttempt, setSuccessfulAttempt] = useState<SuccessfulAttempt | null>(null);
  const eventCounter = useRef(0);
  const attemptCounter = useRef(0);
  const predictionRef = useRef<HTMLSelectElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);

  const mastery = useMemo(() => evaluateSelfAttentionLabMastery(evidence), [evidence]);
  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(mastery.mastered), [mastery.mastered, onCompletionChange]);
  useEffect(() => {
    if (runtimeFailure) requestAnimationFrame(() => recoveryButtonRef.current?.focus());
  }, [runtimeFailure]);

  const challengeCopy = {
    projection: {
      label: t("1 · 같은 X, 다른 역할", "1 · One X, distinct roles"),
      prompt: t("token row가 같은 X에서 왔을 때 Q·K·V 값의 관계를 예측하세요.", "Predict how Q, K, and V relate when their token rows come from the same X."),
      predictions: [
        ["qkv-identical", t("Q=K=V로 모두 같다", "Q=K=V everywhere")],
        ["same-x-separate-qkv", t("같은 X지만 projection이 달라 값이 다르다", "one X, but separate projections produce different values")],
        ["only-v-differs", t("Q=K이고 V만 다르다", "Q=K, and only V differs")],
      ],
    },
    scaling: {
      label: t("2 · score scaling", "2 · Score scaling"),
      prompt: t("√d_h scaling이 top key와 분포 entropy에 미칠 영향을 예측하고 scaling을 복구하세요.", "Predict how sqrt(d_h) scaling affects the top key and entropy, then repair scaling."),
      predictions: [
        ["top-changes", t("top key가 바뀐다", "the top key changes")],
        ["scaled-is-sharper", t("scaled 분포가 더 뾰족하다", "the scaled distribution is sharper")],
        ["same-top-higher-entropy", t("top은 같고 scaled 분포가 덜 포화된다", "the top stays while the scaled distribution is less saturated")],
      ],
    },
    "causal-mask": {
      label: t("3 · causal visibility", "3 · Causal visibility"),
      prompt: t("query 1에서 미래 key 2·3을 막은 뒤 weight row를 예측하고 mask를 복구하세요.", "Predict query 1's weights after blocking future keys 2 and 3, then repair the mask."),
      predictions: [
        ["future-small-positive", t("미래 weight가 작지만 양수로 남는다", "future weights remain small and positive")],
        ["future-zero-row-renormalized", t("미래는 0이고 허용 key 합은 1이다", "future weights are zero and allowed keys renormalize to one")],
        ["current-also-blocked", t("현재 token도 함께 차단된다", "the current token is blocked too")],
      ],
    },
    "padding-key": {
      label: t("4 · padding key 반사실", "4 · Padding-key counterfactual"),
      prompt: t("padding key를 일부러 노출하면 active query와 inactive padding query가 어떻게 달라질지 예측하세요.", "Predict what changes when the padding key is deliberately exposed while its padding query stays inactive."),
      predictions: [
        ["padding-query-activates", t("padding query도 함께 활성화된다", "the padding query activates too")],
        ["nothing-changes", t("어떤 weight도 바뀌지 않는다", "no weight changes")],
        ["padding-gains-mass-active-renormalizes-pad-query-zero", t("active row에서 padding mass가 생기지만 padding query row는 0이다", "padding gains mass in active rows, but the padding query row stays zero")],
      ],
    },
    "multi-head": {
      label: t("5 · head merge", "5 · Head merge"),
      prompt: t("두 [T,2] head context를 합쳐 다음 장으로 넘길 shape를 예측하세요.", "Predict the handoff shape made from two [T,2] head contexts."),
      predictions: [
        ["average-heads-to-two", t("head를 평균내 [T,2]", "average heads into [T,2]")],
        ["concat-preserves-token-shape", t("token별 feature concat으로 [T,4]", "concatenate features per token into [T,4]")],
        ["concat-weight-tables", t("두 [T,T] weight 표를 붙여 [T,8]", "concatenate two [T,T] weight tables into [T,8]")],
      ],
    },
  } satisfies Record<SelfAttentionChallengeId, { label: string; prompt: string; predictions: Array<[SelfAttentionPrediction, string]> }>;

  const stages = [
    { id: "projections", index: "01", label: t("Q · K · V", "Q · K · V") },
    { id: "scores", index: "02", label: t("raw · scaled", "raw · scaled") },
    { id: "mask", index: "03", label: t("mask", "mask") },
    { id: "weights", index: "04", label: t("weights", "weights") },
    { id: "output", index: "05", label: t("heads · output", "heads · output") },
  ];

  const currentConfig = (): SelfAttentionRunConfig => ({ ...configState, inputGain: Number(gainInput) });

  const invalidateRun = () => {
    setTrace(null);
    setSuccessfulAttempt(null);
    setSelectedCell(null);
    setFeedback(null);
    setRuntimeFailure(false);
  };

  const chooseChallenge = (next: SelfAttentionChallengeId) => {
    const defaults = configCopy(selfAttentionChallengeDefaults[next]);
    const view = challengeView[next];
    setChallengeId(next);
    setConfigState(defaults);
    setGainInput(String(defaults.inputGain));
    setSelectedHead(view.head);
    setSelectedQuery(view.query);
    setActiveStage(requiredInspection[next]);
    setPrediction("");
    invalidateRun();
    requestAnimationFrame(() => predictionRef.current?.focus());
  };

  const updateConfig = (patch: Partial<SelfAttentionRunConfig>) => {
    setConfigState((current) => ({ ...current, ...patch }));
    invalidateRun();
  };

  const nextEventId = () => `sa-e${++eventCounter.current}`;

  const runChallenge = () => {
    if (!prediction) return;
    const config = currentConfig();
    try {
      const nextTrace = runSelfAttention(config);
      const grade = gradeSelfAttentionChallenge(challengeId, prediction, config);
      const attemptId = `sa-a${++attemptCounter.current}`;
      const base = { attemptId, challengeId, config: Object.freeze({ ...config }) };
      const events: SelfAttentionLabEvidenceEvent[] = [
        { ...base, eventId: nextEventId(), kind: "prediction", prediction },
        { ...base, eventId: nextEventId(), kind: "run" },
      ];
      setEvidence((current) => ({ events: Object.freeze([...current.events, ...events]) }));
      setTrace(nextTrace);
      setRuntimeFailure(false);
      setSuccessfulAttempt(grade.correct ? { attemptId, challengeId, config } : null);
      const configHint = challengeId === "scaling" && !config.scaleScores
        ? t("√d_h scaling을 켠 뒤 다시 실행하세요.", "Turn on sqrt(d_h) scaling and run again.")
        : challengeId === "causal-mask" && !config.causal
          ? t("causal mask를 켜 future key를 score 단계에서 차단하세요.", "Enable the causal mask to block future keys at the score stage.")
          : challengeId === "padding-key" && (!config.exposePaddingKey || config.causal)
            ? t("causal mask는 끄고 padding key 노출 반사실을 켜세요.", "Turn causal masking off and expose the padding key for this counterfactual.")
            : config.inputGain !== 1
              ? t("숙달 증거는 input gain 1.0의 canonical fixture에서 기록합니다.", "Mastery evidence uses the canonical fixture at input gain 1.0.")
              : t("prediction과 현재 설정을 다시 점검하세요.", "Recheck the prediction and current setup.");
      setFeedback(grade.correct ? {
        correct: true,
        title: t("예측과 실행 계약이 맞았습니다", "Prediction and executed contract match"),
        message: t(`이제 ${requiredInspection[challengeId]} 단계의 수치를 직접 검사해 이 challenge를 기록하세요.`, `Inspect the numeric ${requiredInspection[challengeId]} stage to record this challenge.`),
      } : {
        correct: false,
        title: grade.predictionCorrect ? t("설정 계약이 아직 깨져 있습니다", "The setup contract is still broken") : t("예측과 실행 결과가 다릅니다", "The prediction differs from the executed result"),
        message: configHint,
      });
      requestAnimationFrame(() => predictionRef.current?.focus());
    } catch {
      setTrace(null);
      setSuccessfulAttempt(null);
      setRuntimeFailure(true);
      setFeedback(null);
    }
  };

  const recordInspection = (stage: SelfAttentionInspectStage, cell?: { row: number; column: number }) => {
    if (cell) {
      setSelectedCell(cell);
      setSelectedQuery(cell.row);
    }
    if (!successfulAttempt || successfulAttempt.challengeId !== challengeId) {
      setFeedback({
        correct: false,
        title: t("먼저 예측과 실행을 완료하세요", "Complete the prediction and run first"),
        message: t("정답 설정으로 pipeline을 실행한 뒤 요구된 수치 관찰을 기록할 수 있습니다.", "Run the pipeline with the correct setup before recording the required numeric observation."),
      });
      return;
    }
    if (requiredInspection[challengeId] !== stage) {
      setFeedback({
        correct: false,
        title: t("이 challenge의 필수 단계를 검사하세요", "Inspect this challenge's required stage"),
        message: t(`${requiredInspection[challengeId]} 단계에서 의미 있는 row 또는 cell을 선택하세요.`, `Choose a meaningful row or cell in the ${requiredInspection[challengeId]} stage.`),
      });
      return;
    }
    const inspection = {
      stage,
      headIndex: selectedHead,
      queryIndex: cell?.row ?? selectedQuery,
      keyIndex: cell?.column ?? null,
    };
    if (!isValidSelfAttentionInspection(challengeId, successfulAttempt.config, inspection)) {
      const message = challengeId === "projection"
        ? t("Q·K·V 세 row가 실제로 서로 다른 active token/head 조합을 선택하세요.", "Choose an active token/head slice whose Q, K, and V rows are actually distinct.")
        : challengeId === "scaling"
          ? t("raw와 scaled 값, top key, entropy 차이를 함께 비교할 수 있는 active row를 선택하세요.", "Choose an active row where raw/scaled values, top key, and entropy can all be compared.")
          : challengeId === "causal-mask"
            ? t("query 1 행에서 미래 key 2 또는 3의 차단 셀을 선택하세요.", "Choose blocked future key 2 or 3 in query row 1.")
            : challengeId === "padding-key"
              ? t("active query 0 행의 padding key 3 weight를 선택하세요.", "Choose padding-key weight 3 in active query row 0.")
              : t("active token row에서 두 head가 [T,4]로 합쳐지는 output을 확인하세요.", "Inspect an active token row where both heads merge into the [T,4] output.");
      setFeedback({
        correct: false,
        title: t("아직 필수 수치 증거가 아닙니다", "This is not the required numeric evidence yet"),
        message,
      });
      return;
    }
    const event: SelfAttentionLabEvidenceEvent = {
      eventId: nextEventId(),
      attemptId: successfulAttempt.attemptId,
      challengeId,
      config: Object.freeze({ ...successfulAttempt.config }),
      kind: "inspect",
      stage,
      headIndex: inspection.headIndex,
      queryIndex: inspection.queryIndex,
      keyIndex: inspection.keyIndex,
    };
    setEvidence((current) => ({ events: Object.freeze([...current.events, event]) }));
    setSuccessfulAttempt(null);
    setFeedback({
      correct: true,
      title: t("관찰 증거를 기록했습니다", "Inspection evidence recorded"),
      message: t("다른 preset으로 이동해 다음 projection·mask·head 경계를 예측하세요.", "Move to another preset and predict the next projection, mask, or head boundary."),
    });
  };

  const resetCurrent = () => {
    chooseChallenge(challengeId);
  };

  const resetAll = () => {
    eventCounter.current = 0;
    attemptCounter.current = 0;
    setEvidence(emptySelfAttentionLabEvidence);
    setChallengeId("projection");
    setConfigState(configCopy(canonicalSelfAttentionConfig));
    setGainInput("1");
    setPrediction("");
    setTrace(null);
    setActiveStage("projections");
    setSelectedHead(1);
    setSelectedQuery(0);
    setSelectedCell(null);
    setFeedback(null);
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
    requestAnimationFrame(() => resetButtonRef.current?.focus());
  };

  const recoverRuntime = () => {
    const defaults = configCopy(selfAttentionChallengeDefaults[challengeId]);
    setConfigState(defaults);
    setGainInput("1");
    setPrediction("");
    setTrace(null);
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
    requestAnimationFrame(() => predictionRef.current?.focus());
  };

  const head = trace?.heads[selectedHead];
  const rowLabels = [...selfAttentionTokens];
  const headColumns = ["d0", "d1"];
  const keyColumns = selfAttentionTokens.map((_, index) => `k${index}`);
  const targetCell = successfulAttempt?.challengeId === challengeId
    ? challengeId === "causal-mask"
      ? { row: 1, column: 2 }
      : challengeId === "padding-key"
        ? { row: 0, column: 3 }
        : null
    : null;

  return (
    <InteractiveLab
      kicker={t("CORE LAB · 핵심 3 + 선택 2 · PREDICT → CONFIGURE → RUN → INSPECT", "CORE LAB · 3 CORE + 2 OPTIONAL · PREDICT → CONFIGURE → RUN → INSPECT")}
      title={t("Self-Attention Workbench", "Self-Attention Workbench")}
      description={t("핵심 preset 세 개를 완료하면 통과합니다. Scaling과 padding preset은 더 확인하고 싶을 때 선택하세요.", "Complete three core presets. Choose the scaling and padding presets only when you want deeper verification.")}
      className="self-attention-workbench"
      actions={<button ref={resetButtonRef} type="button" className="button button-ghost" aria-label={t("Self-Attention lab 전체 초기화", "Reset the entire Self-Attention lab")} onClick={resetAll}>{t("전체 lab 초기화", "Reset entire lab")}</button>}
    >
      <div data-interactive-ready={interactiveReady ? "true" : "false"}>
        <div className="self-attention-preset-row" role="group" aria-label={t("Self-Attention challenge preset", "Self-Attention challenge presets")}>
          <span>{t("CHALLENGE PRESETS", "CHALLENGE PRESETS")}</span>
          {selfAttentionChallengeIds.map((id) => {
            const core = selfAttentionCoreChallengeIds.some((coreId) => coreId === id);
            return <button type="button" data-self-attention-preset={id} data-core-challenge={core ? "true" : "false"} aria-pressed={challengeId === id} onClick={() => chooseChallenge(id)} key={id}>{core ? t("핵심", "Core") : t("선택", "Optional")} · {challengeCopy[id].label}</button>;
          })}
        </div>

        <div className="self-attention-control-panel">
          <label><span>{t("관찰할 query token", "Query token to inspect")}</span><select aria-label={t("관찰할 query token", "Query token to inspect")} value={selectedQuery} onChange={(event) => { setSelectedQuery(Number(event.currentTarget.value)); setSelectedCell(null); }}>{selfAttentionTokens.slice(0, 3).map((token, index) => <option value={index} key={token}>{index} · {token}</option>)}</select></label>
          <label><span>{t("관찰할 head", "Head to inspect")}</span><select aria-label={t("관찰할 Self-Attention head", "Self-Attention head to inspect")} value={selectedHead} onChange={(event) => { setSelectedHead(Number(event.currentTarget.value)); setSelectedCell(null); }}><option value={0}>head 0</option><option value={1}>head 1</option></select></label>
          <label><span>{t("score scaling", "Score scaling")}</span><select aria-label={t("Self-Attention score scaling", "Self-Attention score scaling")} value={configState.scaleScores ? "sqrt" : "none"} onChange={(event) => updateConfig({ scaleScores: event.currentTarget.value === "sqrt" })}><option value="none">{t("나누지 않음", "unscaled")}</option><option value="sqrt">÷ √d_h</option></select></label>
          <label><span>{t("visibility mask", "Visibility mask")}</span><select aria-label={t("Self-Attention causal mask", "Self-Attention causal mask")} value={configState.causal ? "causal" : "none"} onChange={(event) => updateConfig({ causal: event.currentTarget.value === "causal" })}><option value="none">{t("양방향", "bidirectional")}</option><option value="causal">causal · j≤i</option></select></label>
          <label><span>{t("padding key", "Padding key")}</span><select aria-label={t("Self-Attention padding key visibility", "Self-Attention padding key visibility")} value={configState.exposePaddingKey ? "exposed" : "masked"} onChange={(event) => updateConfig({ exposePaddingKey: event.currentTarget.value === "exposed" })}><option value="masked">{t("차단", "masked")}</option><option value="exposed">{t("반사실 노출", "counterfactual: exposed")}</option></select></label>
          <label><span>{t("입력 gain · canonical 1.0", "Input gain · canonical 1.0")}</span><input aria-label={t("Self-Attention 입력 gain", "Self-Attention input gain")} type="number" inputMode="decimal" min="0.25" max="4" step="0.25" value={gainInput} onChange={(event) => { setGainInput(event.currentTarget.value); invalidateRun(); }} /></label>
          <label><span>{t("실행 전 예측", "Prediction before running")}</span><select ref={predictionRef} aria-label={t("Self-Attention challenge 예측", "Self-Attention challenge prediction")} value={prediction} onChange={(event) => { setPrediction(event.currentTarget.value as SelfAttentionPrediction); invalidateRun(); }}><option value="">{t("예측 선택", "Choose a prediction")}</option>{challengeCopy[challengeId].predictions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label>
          <div className="self-attention-run-actions">
            <button type="button" className="button button-primary" disabled={!prediction} aria-label={t("Self-Attention pipeline 실행", "Run the Self-Attention pipeline")} onClick={runChallenge}>{t("예측 고정 · pipeline 실행", "Lock prediction · run pipeline")}</button>
            <button type="button" className="button button-secondary" aria-label={t("현재 Self-Attention challenge 설정 초기화", "Reset the current Self-Attention challenge setup")} onClick={resetCurrent}>{t("현재 설정 초기화", "Reset current setup")}</button>
          </div>
        </div>

        <div className={`self-attention-live-feedback${feedback ? feedback.correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          <strong>{feedback?.title ?? t("실행 전 prediction과 설정을 고정하세요", "Lock a prediction and setup before running")}</strong>
          <span>{feedback?.message ?? challengeCopy[challengeId].prompt}</span>
        </div>

        {runtimeFailure ? <div className="self-attention-runtime-fallback" role="alert"><strong>{t("로컬 Self-Attention runtime 실패", "Local Self-Attention runtime failure")}</strong><p>{t("입력 gain이나 계산값이 유한한 범위를 벗어났습니다. 숙달 증거는 바뀌지 않았으며 현재 challenge의 시작 preset으로 복구할 수 있습니다.", "The input gain or a derived value left the finite range. Existing mastery evidence is unchanged, and you can recover to this challenge's starting preset.")}</p><button ref={recoveryButtonRef} type="button" className="button button-secondary" onClick={recoverRuntime}>{t("challenge 시작 preset으로 안전하게 복구", "Recover safely to the challenge starting preset")}</button></div> : null}

        <StepExplorer stages={stages} activeStage={activeStage} onStageChange={(stage) => { setActiveStage(stage as SelfAttentionInspectStage); setSelectedCell(null); }} ariaLabel={t("Self-Attention 계산 단계", "Self-Attention computation stages")} panelId="self-attention-stage-panel" />

        <div className="self-attention-stage-panel" id="self-attention-stage-panel">
          {!trace ? <header><span>{activeStage.toUpperCase()}</span><strong>{t("아직 실행 trace가 없습니다", "No executed trace yet")}</strong><p>{t("prediction을 고른 뒤 pipeline을 실행하면 이 단계의 실제 matrix가 나타납니다.", "Choose a prediction and run the pipeline to reveal the actual matrices for this stage.")}</p></header> : null}
          {trace && head && activeStage === "projections" ? <>
            <header><span>PROJECTIONS · HEAD {selectedHead}</span><strong>{t("같은 token row의 Q·K·V 역할을 비교하세요", "Compare Q, K, and V roles for the same token row")}</strong><p>{t("색이 아니라 row label과 수치를 읽으세요. 이 fixture의 W는 고정되어 있지만 실제 모델에서는 학습됩니다.", "Read row labels and values, not color alone. W is fixed in this fixture but learned in a real model.")}</p></header>
            <div className="self-attention-matrix-stack"><MatrixGrid values={head.q as number[][]} label={`Q head ${selectedHead} [4,2]`} rowLabels={rowLabels} columnLabels={headColumns} selectedRow={selectedQuery} tone="terra" /><MatrixGrid values={head.k as number[][]} label={`K head ${selectedHead} [4,2]`} rowLabels={rowLabels} columnLabels={headColumns} selectedRow={selectedQuery} tone="indigo" /><MatrixGrid values={head.v as number[][]} label={`V head ${selectedHead} [4,2]`} rowLabels={rowLabels} columnLabels={headColumns} selectedRow={selectedQuery} tone="forest" /></div>
            <button type="button" className="button button-secondary" onClick={() => recordInspection("projections")}>{t("선택 token의 Q/K/V row 검사", "Inspect the selected token's Q/K/V rows")}</button>
          </> : null}
          {trace && head && activeStage === "scores" ? <>
            <header><span>RAW QKᵀ → SCALED</span><strong>{t("top key와 분포 포화를 분리해서 보세요", "Separate top-key order from distribution saturation")}</strong><p>{t("raw와 ÷√d_h score의 같은 query row를 비교합니다.", "Compare the same query row before and after division by sqrt(d_h).")}</p></header>
            <div className="self-attention-matrix-stack"><MatrixGrid values={head.rawScores as number[][]} label={`raw scores · head ${selectedHead}`} rowLabels={rowLabels} columnLabels={keyColumns} selectedRow={selectedQuery} tone="terra" formatValue={formatValue} /><MatrixGrid values={head.scaledScores as number[][]} label={`${trace.config.scaleScores ? "÷√d_h" : "unscaled"} · head ${selectedHead}`} rowLabels={rowLabels} columnLabels={keyColumns} selectedRow={selectedQuery} tone="indigo" formatValue={formatValue} /></div>
            <button type="button" className="button button-secondary" onClick={() => recordInspection("scores")}>{t("선택 row의 raw/scaled score 비교", "Compare raw and scaled scores for the selected row")}</button>
          </> : null}
          {trace && head && activeStage === "mask" ? <>
            <header><span>MASKED LOGITS</span><strong>{t("차단 셀은 0점이 아니라 Softmax 후보에서 제외됩니다", "A blocked cell is excluded from softmax, not assigned a score of zero")}</strong><p>{t("causal challenge는 query 1의 future key 셀을 직접 누르세요.", "For the causal challenge, select a future-key cell in query row 1.")}</p></header>
            <div className="self-attention-masked-grid-wrap"><table className="self-attention-masked-grid"><caption>{t(`head ${selectedHead} masked score · 행=query, 열=key`, `head ${selectedHead} masked scores · rows=query, columns=key`)}</caption><thead><tr><th scope="col">q\k</th>{selfAttentionTokens.map((token, index) => <th scope="col" key={token}>k{index}</th>)}</tr></thead><tbody>{head.maskedScores.map((row, rowIndex) => <tr key={rowIndex}><th scope="row">q{rowIndex}</th>{row.map((value, columnIndex) => { const blocked = value === null; const pressed = selectedCell?.row === rowIndex && selectedCell.column === columnIndex; const target = targetCell?.row === rowIndex && targetCell.column === columnIndex; return <td key={columnIndex}><button type="button" className={[blocked ? "is-blocked" : "", target ? "matrix-cell-target" : ""].filter(Boolean).join(" ") || undefined} aria-pressed={pressed} aria-label={blocked ? t(`query ${rowIndex}의 미래 또는 padding key ${columnIndex} 차단`, `future or padding key ${columnIndex} blocked for query ${rowIndex}`) : t(`query ${rowIndex}, key ${columnIndex} scaled score ${formatValue(value)}`, `query ${rowIndex}, key ${columnIndex}, scaled score ${formatValue(value)}`)} onClick={() => recordInspection("mask", { row: rowIndex, column: columnIndex })}>{blocked ? t("차단", "blocked") : formatValue(value)}</button></td>; })}</tr>)}</tbody></table></div>
          </> : null}
          {trace && head && activeStage === "weights" ? <>
            <header><span>ROW SOFTMAX WEIGHTS</span><strong>{t("active query의 key mass와 inactive padding query를 함께 확인하세요", "Inspect active-query key mass and the inactive padding query together")}</strong><p>{t("padding challenge는 query 0, key 3의 weight를 직접 선택하세요.", "For the padding challenge, select the weight at query 0, key 3.")}</p></header>
            <MatrixGrid values={head.weights as number[][]} label={`weights · head ${selectedHead}`} rowLabels={rowLabels} columnLabels={keyColumns} selectedRow={selectedQuery} selectedCell={selectedCell} targetCell={challengeId === "padding-key" ? targetCell : null} tone="indigo" formatValue={formatValue} onSelectCell={(row, column) => recordInspection("weights", { row, column })} />
            <div className="self-attention-stage-inspection">{t(`선택 query row 합: ${head.rowSums[selectedQuery].toFixed(6)} · padding query row 합: ${head.rowSums[3].toFixed(6)}`, `Selected query row sum: ${head.rowSums[selectedQuery].toFixed(6)} · padding query row sum: ${head.rowSums[3].toFixed(6)}`)}</div>
          </> : null}
          {trace && activeStage === "output" ? <>
            <header><span>HEAD CONTEXTS → CONCAT → OUTPUT</span><strong>{t("같은 token row의 head feature를 이어 붙여 [T,4]를 유지합니다", "Concatenate head features for the same token row to preserve [T,4]")}</strong><p>{t("residual-compatible shape만 확인하며 residual·LayerNorm·FFN은 실행하지 않습니다.", "Verify only the residual-compatible shape; residual, LayerNorm, and FFN do not run here.")}</p></header>
            <div className="self-attention-matrix-stack"><MatrixGrid values={trace.heads[0].contexts as number[][]} label="head 0 context [4,2]" rowLabels={rowLabels} columnLabels={headColumns} selectedRow={selectedQuery} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.heads[1].contexts as number[][]} label="head 1 context [4,2]" rowLabels={rowLabels} columnLabels={headColumns} selectedRow={selectedQuery} tone="indigo" formatValue={formatValue} /><MatrixGrid values={trace.concatenated as number[][]} label="concat [4,4]" rowLabels={rowLabels} columnLabels={["h0d0", "h0d1", "h1d0", "h1d1"]} selectedRow={selectedQuery} tone="forest" formatValue={formatValue} /><MatrixGrid values={trace.attentionOutput as number[][]} label="attention output [4,4]" rowLabels={rowLabels} columnLabels={["o0", "o1", "o2", "o3"]} selectedRow={selectedQuery} tone="forest" formatValue={formatValue} /></div>
            <button type="button" className="button button-secondary" onClick={() => recordInspection("output")}>{t("선택 token의 두 head와 [T,4] handoff 검사", "Inspect both heads and the [T,4] handoff for the selected token")}</button>
          </> : null}
        </div>

        <div className="self-attention-evidence" data-mastered={mastery.mastered ? "true" : "false"} role="status" aria-live="polite">
          <strong>{t("MASTERY EVIDENCE · prediction → run → numeric inspection", "MASTERY EVIDENCE · prediction → run → numeric inspection")}</strong>
          {selfAttentionChallengeIds.map((id) => {
            const core = selfAttentionCoreChallengeIds.some((coreId) => coreId === id);
            const complete = mastery.completedChallengeIds.includes(id);
            return <span className={`${core ? "is-core" : "is-optional"}${complete ? " is-complete" : ""}`} key={id}>{complete ? "✓" : core ? "○" : t("선택", "Optional")} {challengeCopy[id].label}</span>;
          })}
        </div>
      </div>
    </InteractiveLab>
  );
}

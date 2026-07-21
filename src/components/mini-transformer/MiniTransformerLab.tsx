import { useEffect, useMemo, useRef, useState } from "react";
import {
  MINI_TRANSFORMER_LAB_PROMPT,
  MINI_TRANSFORMER_TRAINING_TEXT,
  canonicalMiniTransformerConfig,
  emptyMiniTransformerLabEvidence,
  evaluateMiniTransformerLabMastery,
  generateMiniTransformer,
  gradeMiniTransformerChallenge,
  isValidMiniTransformerInspection,
  miniTransformerChallengeDefaults,
  miniTransformerChallengeIds,
  miniTransformerCoreChallengeIds,
  miniTransformerChallengeRequirements,
  miniTransformerVocabulary,
  runMiniTransformer,
  runMiniTransformerLmHeadUpdate,
  type MiniTransformerChallengeId,
  type MiniTransformerConfig,
  type MiniTransformerForwardTrace,
  type MiniTransformerGenerationTrace,
  type MiniTransformerInspectStage,
  type MiniTransformerLabEvidenceEvent,
  type MiniTransformerLmHeadUpdateTrace,
  type MiniTransformerPrediction,
} from "../../features/mini-transformer/mini-transformer-model";
import { useLocale } from "../../features/localization/localization";
import { DirectChoice } from "../interactive/DirectChoice";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { MatrixGrid } from "../interactive/MatrixGrid";
import { StepExplorer } from "../interactive/StepExplorer";

type Feedback = { correct: boolean; title: string; message: string };
type SuccessfulAttempt = {
  attemptId: string;
  challengeId: MiniTransformerChallengeId;
  config: MiniTransformerConfig;
};

function copyConfig(config: MiniTransformerConfig): MiniTransformerConfig {
  return { ...config };
}

function formatValue(value: number) {
  if (Math.abs(value) >= 10) return value.toFixed(2);
  if (Math.abs(value) < 0.001 && value !== 0) return value.toExponential(2);
  return value.toFixed(3);
}

export function MiniTransformerLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [challengeId, setChallengeId] = useState<MiniTransformerChallengeId>("tokenize");
  const [configState, setConfigState] = useState(() => copyConfig(miniTransformerChallengeDefaults.tokenize));
  const [positionScaleInput, setPositionScaleInput] = useState(String(miniTransformerChallengeDefaults.tokenize.positionScale));
  const [prediction, setPrediction] = useState<MiniTransformerPrediction | "">("");
  const [trace, setTrace] = useState<MiniTransformerForwardTrace | null>(null);
  const [training, setTraining] = useState<MiniTransformerLmHeadUpdateTrace | null>(null);
  const [generation, setGeneration] = useState<MiniTransformerGenerationTrace | null>(null);
  const [activeStage, setActiveStage] = useState<MiniTransformerInspectStage>("tokenize");
  const [selectedCell, setSelectedCell] = useState<{ row: number; column: number } | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [runtimeFailure, setRuntimeFailure] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [evidence, setEvidence] = useState(emptyMiniTransformerLabEvidence);
  const [successfulAttempt, setSuccessfulAttempt] = useState<SuccessfulAttempt | null>(null);
  const eventCounter = useRef(0);
  const attemptCounter = useRef(0);
  const predictionRef = useRef<HTMLDivElement>(null);
  const resetButtonRef = useRef<HTMLButtonElement>(null);
  const recoveryButtonRef = useRef<HTMLButtonElement>(null);

  const mastery = useMemo(() => evaluateMiniTransformerLabMastery(evidence), [evidence]);
  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(mastery.mastered), [mastery.mastered, onCompletionChange]);
  useEffect(() => {
    if (runtimeFailure) requestAnimationFrame(() => recoveryButtonRef.current?.focus());
  }, [runtimeFailure]);

  const challengeCopy = {
    tokenize: {
      label: t("1 · tokenize + BOS", "1 · Tokenize + BOS"),
      prompt: t("고정 vocabulary와 BOS 경계를 예측하고 token ID stream을 복구하세요.", "Predict the fixed-vocabulary and BOS boundary, then repair the token-ID stream."),
      predictions: [
        ["characters-without-vocabulary", t("문자 codepoint를 token ID로 쓴다", "use character codepoints as token IDs")],
        ["prompt-only-no-bos", t("prompt token만 쓰고 BOS는 생략한다", "use prompt tokens and omit BOS")],
        ["bos-and-vocabulary-ids", t("고정 vocabulary ID 앞에 BOS를 둔다", "place BOS before fixed-vocabulary IDs")],
      ],
    },
    "embed-position": {
      label: t("2 · embedding + position", "2 · Embedding + position"),
      prompt: t("lookup row와 sinusoidal position을 첫 block 전에 한 번 합치세요.", "Combine lookup rows and sinusoidal position once before the first block."),
      predictions: [
        ["position-after-logits", t("vocabulary logits 뒤에 position을 더한다", "add position after vocabulary logits")],
        ["position-every-generation-step", t("기존 prefix row에도 매 decode step마다 position을 누적한다", "accumulate position again on old prefix rows at every decoding step")],
        ["embedding-plus-position-once", t("첫 block 입력에서 embedding+position을 한 번 만든다", "form embedding plus position once at the first block input")],
      ],
    },
    "causal-block": {
      label: t("3 · causal block", "3 · Causal block"),
      prompt: t("미래 weight가 0인 pre-LN block과 [T,d_model] handoff를 복구하세요.", "Repair a pre-LN block with zero future weight and a [T,d_model] handoff."),
      predictions: [
        ["future-token-mixing", t("training 문장에서는 미래 token을 Attention이 읽어도 된다", "attention may read future tokens during training")],
        ["block-outputs-vocab-directly", t("block이 [T,V] 확률을 직접 출력한다", "the block directly emits [T,V] probabilities")],
        ["causal-prefix-preserves-shape", t("causal prefix만 읽고 [T,d_model]을 유지한다", "read only the causal prefix and preserve [T,d_model]")],
      ],
    },
    "vocab-projection": {
      label: t("4 · logits + loss + update", "4 · Logits + loss + update"),
      prompt: t("final norm·vocabulary projection·row Softmax·shifted CE·head-only update를 연결하세요.", "Connect final norm, vocabulary projection, row softmax, shifted CE, and a head-only update."),
      predictions: [
        ["softmax-over-sequence", t("token sequence축으로 Softmax한다", "apply softmax over the token sequence axis")],
        ["argmax-before-projection", t("hidden state에서 먼저 argmax하고 projection한다", "take argmax on hidden state before projection")],
        ["last-hidden-to-vocab-row-softmax", t("final hidden을 [T,V]로 투영하고 row별 vocabulary Softmax한다", "project final hidden to [T,V] and apply vocabulary softmax per row")],
      ],
    },
    "autoregressive-decode": {
      label: t("5 · autoregressive decode", "5 · Autoregressive decode"),
      prompt: t("마지막 row에서 하나를 골라 append·prefix 재실행·EOS/max stop을 복구하세요.", "Choose one token from the last row, append it, rerun the prefix, and restore EOS/max stopping."),
      predictions: [
        ["reuse-first-prefix-state", t("첫 prefix hidden을 모든 step에서 재사용한다", "reuse the first prefix hidden state at every step")],
        ["replace-last-prefix-token", t("새 token으로 마지막 prefix token을 교체한다", "replace the last prefix token with the new token")],
        ["append-recompute-stop-eos-or-limit", t("append 후 전체 prefix를 재실행하고 EOS/한도에서 멈춘다", "append, rerun the full prefix, and stop on EOS or the limit")],
      ],
    },
  } satisfies Record<MiniTransformerChallengeId, {
    label: string;
    prompt: string;
    predictions: Array<[MiniTransformerPrediction, string]>;
  }>;

  const misconceptionHints: Partial<Record<MiniTransformerPrediction, string>> = {
    "characters-without-vocabulary": t("문자 codepoint는 이 모델의 embedding row를 가리키지 않습니다. 고정 vocabulary의 ID와 BOS를 사용하세요.", "Character codepoints do not address this model's embedding rows. Use fixed-vocabulary IDs with BOS."),
    "prompt-only-no-bos": t("BOS는 첫 causal prefix의 시작 상태를 명시합니다. prompt ID 앞에 vocabulary 안의 BOS ID를 추가하세요.", "BOS explicitly marks the first causal prefix state. Add the in-vocabulary BOS ID before prompt IDs."),
    "position-after-logits": t("logits 뒤의 position은 Attention과 FFN이 읽을 수 없습니다. embedding lookup 직후 첫 block 입력에서 더하세요.", "Position after logits cannot be read by attention or the FFN. Add it after embedding lookup at the first block input."),
    "position-every-generation-step": t("prefix를 다시 실행해도 각 절대 위치의 E+P를 새로 계산할 뿐 같은 row에 P를 누적하지 않습니다.", "Rerunning a prefix recomputes E+P for each absolute position; it does not accumulate P again on the same row."),
    "future-token-mixing": t("teacher forcing도 causal mask를 유지해야 target token이 입력 branch로 새지 않습니다.", "Teacher forcing must keep the causal mask so target tokens do not leak into the input branch."),
    "block-outputs-vocab-directly": t("block output 폭은 d_model입니다. distinct final norm과 d_model×V projection 뒤에 vocabulary 폭이 생깁니다.", "The block output width is d_model. Vocabulary width appears only after a distinct final norm and d_model-by-V projection."),
    "softmax-over-sequence": t("서로 다른 prefix row를 경쟁시키지 마세요. 각 row 안에서 V개 next-token 후보의 합이 1이어야 합니다.", "Do not compete different prefix rows. The V next-token candidates within each row must sum to one."),
    "argmax-before-projection": t("hidden feature index는 token ID가 아닙니다. LM head로 V개 logits를 만든 뒤 선택하세요.", "A hidden-feature index is not a token ID. Produce V logits with the LM head before selecting."),
    "reuse-first-prefix-state": t("이 fixture에는 KV cache가 없습니다. append한 token까지 포함한 전체 prefix를 매 step 다시 실행하세요.", "This fixture has no KV cache. Rerun the full prefix including the appended token at every step."),
    "replace-last-prefix-token": t("생성은 prefix를 보존하고 길이를 1 늘립니다. 마지막 token을 교체하면 조건 문맥이 사라집니다.", "Generation preserves the prefix and grows it by one. Replacing the last token discards conditioning context."),
  };

  const stages = miniTransformerChallengeIds.map((id, index) => ({
    id,
    label: challengeCopy[id].label,
    description: challengeCopy[id].prompt,
    index: String(index + 1).padStart(2, "0"),
  }));

  function nextEventId() {
    eventCounter.current += 1;
    return `mini-transformer-event-${eventCounter.current}`;
  }

  function invalidateRun() {
    setTrace(null);
    setTraining(null);
    setGeneration(null);
    setSelectedCell(null);
    setFeedback(null);
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
  }

  function updateConfig(patch: Partial<MiniTransformerConfig>) {
    setConfigState((current) => ({ ...current, ...patch }));
    invalidateRun();
  }

  function chooseChallenge(id: MiniTransformerChallengeId) {
    const defaults = miniTransformerChallengeDefaults[id];
    setChallengeId(id);
    setConfigState(copyConfig(defaults));
    setPositionScaleInput(String(defaults.positionScale));
    setPrediction("");
    setActiveStage(id);
    invalidateRun();
    requestAnimationFrame(() => predictionRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  }

  function runChallenge() {
    if (!prediction) return;
    const config = { ...configState, positionScale: Number(positionScaleInput) };
    const attemptId = `mini-transformer-attempt-${++attemptCounter.current}`;
    try {
      const nextTrace = runMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, config);
      const nextTraining = config.probabilityAxis === "vocabulary"
        ? runMiniTransformerLmHeadUpdate(MINI_TRANSFORMER_TRAINING_TEXT, config)
        : null;
      const nextGeneration = generateMiniTransformer(MINI_TRANSFORMER_LAB_PROMPT, config);
      const grade = gradeMiniTransformerChallenge(challengeId, prediction, config);
      const predictionEvent: MiniTransformerLabEvidenceEvent = {
        eventId: nextEventId(), attemptId, challengeId, config: Object.freeze({ ...config }),
        prompt: MINI_TRANSFORMER_LAB_PROMPT, kind: "prediction", prediction,
      };
      const runEvent: MiniTransformerLabEvidenceEvent = {
        eventId: nextEventId(), attemptId, challengeId, config: Object.freeze({ ...config }),
        prompt: MINI_TRANSFORMER_LAB_PROMPT, kind: "run",
      };
      setEvidence((current) => ({ events: Object.freeze([...current.events, predictionEvent, runEvent]) }));
      setTrace(nextTrace);
      setTraining(nextTraining);
      setGeneration(nextGeneration);
      setActiveStage(challengeId);
      setSelectedCell(null);
      setRuntimeFailure(false);
      if (grade.correct) {
        setSuccessfulAttempt({ attemptId, challengeId, config: Object.freeze({ ...config }) });
        setFeedback({
          correct: true,
          title: t("예측과 실행 계약이 맞았습니다", "Prediction and execution contracts match"),
          message: t("이제 안내된 수치 cell을 직접 선택해 이 challenge의 evidence를 기록하세요.", "Now select the required numeric cell to record evidence for this challenge."),
        });
        return;
      }
      setSuccessfulAttempt(null);
      const hint = misconceptionHints[prediction];
      const observed = grade.observed;
      const configHint = challengeId === "tokenize"
        ? t(`BOS first=${observed.bosFirst}. tokenizer 설정을 고정 vocabulary+BOS로 복구하세요.`, `BOS first=${observed.bosFirst}. Repair the tokenizer to fixed vocabulary plus BOS.`)
        : challengeId === "embed-position"
          ? t(`position 오차 ${formatValue(observed.positionError)}입니다. scale 1을 사용하세요.`, `Position error is ${formatValue(observed.positionError)}. Use scale 1.`)
          : challengeId === "causal-block"
            ? t(`미래 Attention mass ${formatValue(observed.futureAttentionMass)}입니다. causal mask를 켜세요.`, `Future attention mass is ${formatValue(observed.futureAttentionMass)}. Enable the causal mask.`)
            : challengeId === "vocab-projection"
              ? t(`row 확률합 최대 오차 ${formatValue(observed.maxProbabilityRowSumError)}입니다. vocabulary축으로 복구하세요.`, `Maximum row-probability-sum error is ${formatValue(observed.maxProbabilityRowSumError)}. Restore the vocabulary axis.`)
              : t(`prefix 재실행 실패 ${observed.prefixRecomputeFailures}, append 실패 ${observed.appendFailures}입니다.`, `Prefix-recompute failures: ${observed.prefixRecomputeFailures}; append failures: ${observed.appendFailures}.`);
      setFeedback({
        correct: false,
        title: grade.predictionCorrect ? t("실행 설정을 더 수리하세요", "Repair the execution settings") : t("예측의 경계를 다시 보세요", "Revisit the prediction boundary"),
        message: hint ?? configHint,
      });
    } catch {
      setTrace(null);
      setTraining(null);
      setGeneration(null);
      setSuccessfulAttempt(null);
      setRuntimeFailure(true);
    }
  }

  function recordInspection(stage: MiniTransformerInspectStage, row: number, column: number) {
    setSelectedCell({ row, column });
    if (!successfulAttempt || successfulAttempt.challengeId !== challengeId) {
      setFeedback({ correct: false, title: t("먼저 정답 실행을 만드세요", "Create a correct run first"), message: t("prediction과 canonical 설정이 통과한 현재 attempt에서만 수치 evidence를 기록할 수 있습니다.", "Numeric evidence can be recorded only from the current attempt after prediction and canonical settings pass.") });
      return;
    }
    const inspection = { stage, rowIndex: row, columnIndex: column };
    if (!isValidMiniTransformerInspection(challengeId, successfulAttempt.config, inspection)) {
      const required = miniTransformerChallengeRequirements[challengeId].requiredInspection;
      setFeedback({
        correct: false,
        title: t("아직 필수 수치 증거가 아닙니다", "This is not the required numeric evidence yet"),
        message: t(`${required.stage}의 row ${required.rowIndex}, column ${required.columnIndex} cell을 선택하세요.`, `Select row ${required.rowIndex}, column ${required.columnIndex} in ${required.stage}.`),
      });
      return;
    }
    const event: MiniTransformerLabEvidenceEvent = {
      eventId: nextEventId(), attemptId: successfulAttempt.attemptId, challengeId,
      config: Object.freeze({ ...successfulAttempt.config }), prompt: MINI_TRANSFORMER_LAB_PROMPT,
      kind: "inspect", ...inspection,
    };
    setEvidence((current) => ({ events: Object.freeze([...current.events, event]) }));
    setSuccessfulAttempt(null);
    setFeedback({ correct: true, title: t("수치 관찰 증거를 기록했습니다", "Numeric inspection evidence recorded"), message: t("다음 preset으로 이동해 다른 모델 경계를 예측·복구하세요.", "Move to the next preset and predict and repair another model boundary.") });
  }

  function resetCurrent() {
    chooseChallenge(challengeId);
  }

  function resetAll() {
    const defaults = miniTransformerChallengeDefaults.tokenize;
    eventCounter.current = 0;
    attemptCounter.current = 0;
    setEvidence(emptyMiniTransformerLabEvidence);
    setChallengeId("tokenize");
    setConfigState(copyConfig(defaults));
    setPositionScaleInput(String(defaults.positionScale));
    setPrediction("");
    setActiveStage("tokenize");
    invalidateRun();
    requestAnimationFrame(() => resetButtonRef.current?.focus());
  }

  function recoverRuntime() {
    const defaults = miniTransformerChallengeDefaults[challengeId];
    setConfigState(copyConfig(defaults));
    setPositionScaleInput(String(defaults.positionScale));
    setPrediction("");
    setRuntimeFailure(false);
    setSuccessfulAttempt(null);
    requestAnimationFrame(() => predictionRef.current?.querySelector<HTMLButtonElement>("button")?.focus());
  }

  const tokenLabels = trace?.tokens.map((token, index) => `${index}:${token}`) ?? [];
  const vocabLabels = miniTransformerVocabulary.map(({ text }) => text);
  const featureLabels = ["d0", "d1", "d2", "d3"];
  const generationProbabilityRows = generation?.steps.map((step) => (
    [...step.forward.probabilities[step.forward.lastRowIndex]]
  )) ?? [];
  const inspectionTarget = (stage: MiniTransformerInspectStage) => {
    const required = miniTransformerChallengeRequirements[challengeId].requiredInspection;
    return successfulAttempt?.challengeId === challengeId && required.stage === stage
      ? { row: required.rowIndex, column: required.columnIndex }
      : null;
  };

  return (
    <InteractiveLab
      kicker={t("CORE LAB · 핵심 3 + 선택 2 · PREDICT → CONFIGURE → RUN → INSPECT", "CORE LAB · 3 CORE + 2 OPTIONAL · PREDICT → CONFIGURE → RUN → INSPECT")}
      title={t("Mini Transformer End-to-End Workbench", "Mini Transformer End-to-End Workbench")}
      description={t("Causal block·LM head·생성의 핵심 preset 세 개를 완료하면 통과합니다. Tokenize와 position preset은 선택 복습입니다.", "Complete the three core causal-block, LM-head, and generation presets. Tokenization and position are optional review.")}
      className="mini-transformer-workbench"
      actions={<button ref={resetButtonRef} type="button" className="button button-ghost" aria-label={t("Mini Transformer lab 전체 초기화", "Reset the entire Mini Transformer lab")} onClick={resetAll}>{t("전체 lab 초기화", "Reset entire lab")}</button>}
    >
      <div data-interactive-ready={interactiveReady ? "true" : "false"}>
        <div className="mini-transformer-preset-row" role="group" aria-label={t("Mini Transformer challenge preset", "Mini Transformer challenge presets")}>
          <span>CHALLENGE PRESETS</span>
          {miniTransformerChallengeIds.map((id) => {
            const core = miniTransformerCoreChallengeIds.some((coreId) => coreId === id);
            return <button type="button" data-mini-transformer-preset={id} data-core-challenge={core ? "true" : "false"} aria-pressed={challengeId === id} onClick={() => chooseChallenge(id)} key={id}>{core ? t("핵심", "Core") : t("선택", "Optional")} · {challengeCopy[id].label}</button>;
          })}
        </div>

        <div className="mini-transformer-control-panel">
          <p className="challenge-control-summary">{t("end-to-end 경로 전체 대신 현재 challenge의 한 경계만 설정합니다. 나머지는 canonical 실행으로 고정됩니다.", "Configure one boundary for the current challenge instead of the whole end-to-end path. Everything else stays canonical.")}</p>
          {challengeId === "tokenize" ? <DirectChoice compact label={t("Mini Transformer BOS 추가", "Mini Transformer add BOS")} value={configState.addBos ? 1 : 0} options={[{ value: 0, label: t("prompt만", "prompt only") }, { value: 1, label: "BOS + prompt" }]} onChange={(value) => updateConfig({ addBos: value === 1 })} /> : null}
          {challengeId === "embed-position" ? <label><span>{t("position scale · canonical 1", "Position scale · canonical 1")}</span><input aria-label={t("Mini Transformer position scale", "Mini Transformer position scale")} type="number" inputMode="decimal" min="0" max="2" step="0.25" value={positionScaleInput} onChange={(event) => { setPositionScaleInput(event.currentTarget.value); invalidateRun(); }} /></label> : null}
          {challengeId === "causal-block" ? <DirectChoice compact label={t("Mini Transformer causal mask", "Mini Transformer causal mask")} value={configState.causal ? 1 : 0} options={[{ value: 0, label: t("미래 포함", "future visible") }, { value: 1, label: "causal prefix" }]} onChange={(value) => updateConfig({ causal: value === 1 })} /> : null}
          {challengeId === "vocab-projection" ? <DirectChoice compact label={t("Mini Transformer probability axis", "Mini Transformer probability axis")} value={configState.probabilityAxis} options={[{ value: "sequence", label: t("token sequence축", "token sequence") }, { value: "vocabulary", label: t("row별 vocabulary축", "vocabulary within each row") }]} onChange={(value) => updateConfig({ probabilityAxis: value as MiniTransformerConfig["probabilityAxis"] })} /> : null}
          {challengeId === "autoregressive-decode" ? <DirectChoice compact label={t("Mini Transformer prefix 재실행", "Mini Transformer prefix recomputation")} value={configState.recomputePrefix ? 1 : 0} options={[{ value: 0, label: t("첫 hidden 재사용", "reuse first hidden") }, { value: 1, label: t("append 후 전체 재실행", "rerun full prefix after append") }]} onChange={(value) => updateConfig({ recomputePrefix: value === 1 })} /> : null}
          <details className="challenge-advanced-settings">
            <summary>{t("고급 생성 설정", "Advanced generation settings")}</summary>
            <div>
              <DirectChoice compact label={t("Mini Transformer EOS 정지", "Mini Transformer EOS stopping")} value={configState.stopAtEos ? 1 : 0} options={[{ value: 0, label: t("한도에서만", "limit only") }, { value: 1, label: "EOS + maxNewTokens" }]} onChange={(value) => updateConfig({ stopAtEos: value === 1 })} />
              <DirectChoice compact label="Mini Transformer max new tokens" value={configState.maxNewTokens} options={[1, 2, 3, 4, 5].map((value) => ({ value, label: String(value) }))} onChange={(value) => updateConfig({ maxNewTokens: value })} />
            </div>
          </details>
          <DirectChoice className="direct-choice-prediction" groupRef={predictionRef} label={t("실행 전 예측", "Prediction before running")} ariaLabel={t("Mini Transformer challenge 예측", "Mini Transformer challenge prediction")} value={prediction} options={challengeCopy[challengeId].predictions.map(([value, label]) => ({ value, label }))} onChange={(value) => { setPrediction(value as MiniTransformerPrediction); invalidateRun(); }} />
          <div className="mini-transformer-run-actions">
            <button type="button" className="button button-primary" disabled={!prediction} aria-label={t("Mini Transformer 실행", "Run the Mini Transformer")} onClick={runChallenge}>{t("예측 고정 · 전체 경로 실행", "Lock prediction · run full path")}</button>
            <button type="button" className="button button-secondary" aria-label={t("현재 Mini Transformer challenge 초기화", "Reset the current Mini Transformer challenge")} onClick={resetCurrent}>{t("현재 설정 초기화", "Reset current setup")}</button>
          </div>
        </div>

        <div className={`mini-transformer-live-feedback${feedback ? feedback.correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite" aria-atomic="true">
          <strong>{feedback?.title ?? t("실행 전 prediction과 모델 설정을 고정하세요", "Lock a prediction and model setup before running")}</strong>
          <span>{feedback?.message ?? challengeCopy[challengeId].prompt}</span>
        </div>

        {runtimeFailure ? <div className="mini-transformer-runtime-fallback" role="alert"><strong>{t("로컬 Mini Transformer runtime 실패", "Local Mini Transformer runtime failure")}</strong><p>{t("position scale 또는 context 설정이 결정적 fixture 범위를 벗어났습니다. 기존 숙달 증거는 유지한 채 이 challenge의 시작 preset으로 복구할 수 있습니다.", "The position scale or context settings left the deterministic fixture range. Existing mastery evidence is preserved while you recover to this challenge's starting preset.")}</p><button ref={recoveryButtonRef} type="button" className="button button-secondary" onClick={recoverRuntime}>{t("challenge 시작 preset으로 안전하게 복구", "Recover safely to the challenge starting preset")}</button></div> : null}

        <StepExplorer stages={stages} activeStage={activeStage} onStageChange={(stage) => { setActiveStage(stage); setSelectedCell(null); }} ariaLabel={t("Mini Transformer 계산 단계", "Mini Transformer computation stages")} panelId="mini-transformer-stage-panel" />

        <div className="mini-transformer-stage-panel" id="mini-transformer-stage-panel">
          {!trace ? <header><span>{activeStage.toUpperCase()}</span><strong>{t("아직 실행 trace가 없습니다", "No execution trace yet")}</strong><p>{t("prediction을 고르고 모델을 실행하면 이 단계의 ID, matrix와 invariant가 나타납니다.", "Choose a prediction and run the model to reveal IDs, matrices, and invariants for this stage.")}</p></header> : null}
          {trace && activeStage === "tokenize" ? <>
            <header><span>FIXED VOCABULARY TOKEN IDS</span><strong>{t("row 0의 BOS ID cell을 검사하세요", "Inspect the BOS ID cell in row 0")}</strong><p>{t(`prompt “${MINI_TRANSFORMER_LAB_PROMPT}” → [${trace.tokenIds.join(", ")}]`, `Prompt “${MINI_TRANSFORMER_LAB_PROMPT}” becomes [${trace.tokenIds.join(", ")}]`)}</p></header>
            <div className="mini-transformer-matrix-stack"><MatrixGrid values={trace.tokenIds.map((id) => [id]) as number[][]} label="token IDs [T,1]" rowLabels={trace.tokens.map((token, index) => `${index}:${token}`)} columnLabels={["id"]} selectedCell={selectedCell} targetCell={inspectionTarget("tokenize")} tone="terra" formatValue={(value) => String(value)} onSelectCell={(row, column) => recordInspection("tokenize", row, column)} /></div>
          </> : null}
          {trace && activeStage === "embed-position" ? <>
            <header><span>EMBEDDING LOOKUP + SINUSOIDAL POSITION ONCE</span><strong>{t("row 1, d0의 E+P 값을 검사하세요", "Inspect E+P at row 1, d0")}</strong><p>{t(`실행 position scale은 ${trace.config.positionScale}입니다.`, `Executed position scale is ${trace.config.positionScale}.`)}</p></header>
            <div className="mini-transformer-matrix-stack"><MatrixGrid values={trace.block.embeddings as number[][]} label="embedding lookup E [T,4]" rowLabels={tokenLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={trace.block.scaledPositionSignal as number[][]} label="scaled position P [T,4]" rowLabels={tokenLabels} columnLabels={featureLabels} tone="forest" formatValue={formatValue} /><MatrixGrid values={trace.block.x0 as number[][]} label="x0 = E + P [T,4]" rowLabels={tokenLabels} columnLabels={featureLabels} selectedCell={selectedCell} targetCell={inspectionTarget("embed-position")} tone="indigo" formatValue={formatValue} onSelectCell={(row, column) => recordInspection("embed-position", row, column)} /></div>
          </> : null}
          {trace && activeStage === "causal-block" ? <>
            <header><span>CAUSAL PRE-LN DECODER BLOCK</span><strong>{t("query row 0, future key column 1의 weight 0을 검사하세요", "Inspect zero weight at query row 0, future-key column 1")}</strong><p>{t(`hidden handoff [${trace.handoff.hiddenShape.join(",")}] · causal=${trace.config.causal}`, `Hidden handoff [${trace.handoff.hiddenShape.join(",")}] · causal=${trace.config.causal}`)}</p></header>
            <div className="mini-transformer-matrix-stack"><MatrixGrid values={trace.block.attention.heads[0].weights as number[][]} label="head 0 attention weights [T,T]" rowLabels={tokenLabels} columnLabels={[...trace.tokens]} selectedCell={selectedCell} targetCell={inspectionTarget("causal-block")} tone="forest" formatValue={formatValue} onSelectCell={(row, column) => recordInspection("causal-block", row, column)} /><MatrixGrid values={trace.block.output as number[][]} label="block hidden H [T,4]" rowLabels={tokenLabels} columnLabels={featureLabels} tone="indigo" formatValue={formatValue} /></div>
          </> : null}
          {trace && activeStage === "vocab-projection" ? <>
            <header><span>FINAL LN → VOCAB LOGITS → SHIFTED CE → ONE HEAD UPDATE</span><strong>{t("training row 2, target token sat(ID 3)의 확률을 검사하세요", "Inspect the target-token probability for sat (ID 3) at training row 2")}</strong><p>{training ? t(`loss ${formatValue(training.meanLossBefore)} → ${formatValue(training.meanLossAfter)} · hidden 고정 · LM head만 갱신`, `Loss ${formatValue(training.meanLossBefore)} → ${formatValue(training.meanLossAfter)} · hidden fixed · LM head only`) : t("sequence축 Softmax에서는 shifted CE update를 실행하지 않습니다.", "Shifted CE update does not run under sequence-axis softmax.")}</p></header>
            <div className="mini-transformer-matrix-stack"><MatrixGrid values={(training?.hidden ?? trace.finalNorm.output) as number[][]} label={training ? "training final normalized hidden [T,4]" : "final normalized hidden [T,4]"} rowLabels={training ? [...training.inputTokens] : tokenLabels} columnLabels={featureLabels} tone="terra" formatValue={formatValue} /><MatrixGrid values={(training?.probabilitiesBefore ?? trace.probabilities) as number[][]} label="vocabulary probabilities [T,8]" rowLabels={training ? [...training.inputTokens] : tokenLabels} columnLabels={vocabLabels} selectedCell={selectedCell} targetCell={inspectionTarget("vocab-projection")} tone="indigo" formatValue={formatValue} onSelectCell={(row, column) => recordInspection("vocab-projection", row, column)} /></div>
            {training ? <div className="mini-transformer-stat-grid"><span><strong>{t("shifted targets", "SHIFTED TARGETS")}</strong>{training.targetTokens.join(" → ")}</span><span><strong>{t("loss 감소", "LOSS DECREASE")}</strong>{formatValue(training.meanLossBefore)} → {formatValue(training.meanLossAfter)}</span><span><strong>{t("변경 범위", "UPDATED SCOPE")}</strong>{training.updatedOnly}</span></div> : null}
          </> : null}
          {trace && activeStage === "autoregressive-decode" && generation ? <>
            <header><span>LAST ROW → APPEND → FULL PREFIX RERUN</span><strong>{t("generation step 1, emitted token .(ID 4)의 probability cell을 검사하세요", "Inspect the probability cell for emitted token . (ID 4) at generation step 1")}</strong><p>{t(`stop=${generation.stopReason} · generated [${generation.steps.map((step) => step.emittedToken).join(", ")}]`, `Stop=${generation.stopReason} · generated [${generation.steps.map((step) => step.emittedToken).join(", ")}]`)}</p></header>
            <div className="mini-transformer-matrix-stack"><MatrixGrid values={generationProbabilityRows as number[][]} label="last-row next-token probabilities by generation step" rowLabels={generation.steps.map((step) => `step ${step.stepIndex}`)} columnLabels={vocabLabels} selectedCell={selectedCell} targetCell={inspectionTarget("autoregressive-decode")} tone="indigo" formatValue={formatValue} onSelectCell={(row, column) => recordInspection("autoregressive-decode", row, column)} /></div>
            <div className="mini-transformer-generation-trace">{generation.steps.map((step) => <span key={step.stepIndex}><strong>step {step.stepIndex}</strong>{step.prefixTokens.join(" ")} → {step.emittedToken} · {step.recomputedFromFullPrefix ? t("전체 prefix 재실행", "full prefix rerun") : t("첫 hidden 재사용", "first hidden reused")}</span>)}</div>
          </> : null}
        </div>

        <div className="mini-transformer-evidence" data-mastered={mastery.mastered ? "true" : "false"} role="status" aria-live="polite">
          <strong>MASTERY EVIDENCE · PREDICTION → EXECUTION → NUMERIC CELL</strong>
          {miniTransformerChallengeIds.map((id) => {
            const core = miniTransformerCoreChallengeIds.some((coreId) => coreId === id);
            const complete = mastery.completedChallengeIds.includes(id);
            return <span className={`${core ? "is-core" : "is-optional"}${complete ? " is-complete" : ""}`} key={id}>{complete ? "✓" : core ? "○" : t("선택", "Optional")} {challengeCopy[id].label}</span>;
          })}
        </div>
      </div>
    </InteractiveLab>
  );
}

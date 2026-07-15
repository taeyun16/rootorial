import { useEffect, useMemo, useRef, useState } from "react";
import {
  attentionMemorySlots,
  attentionPresetIds,
  attentionPresets,
  evaluateAttentionLabMastery,
  gradeAttentionPrediction,
  inputForAttentionPresets,
  runCrossAttention,
  type AttentionMemorySlotId,
  type AttentionPrediction,
  type AttentionPresetId,
} from "../features/attention/attention-model";
import { useLocale } from "../features/localization/localization";
import { InteractiveLab } from "./interactive/InteractiveLab";
import { MatrixGrid } from "./interactive/MatrixGrid";
import { StepExplorer, type ExplorerStage } from "./interactive/StepExplorer";
import { MathFormula } from "./MathFormula";

type PipelineStage = "memory" | "scores" | "weights" | "contributions" | "context";
type AttentionEvidence = Parameters<typeof evaluateAttentionLabMastery>[0];
type AttentionEvidenceEvent = AttentionEvidence["events"][number];
type AttentionRun = ReturnType<typeof runCrossAttention>;
type CounterfactualPrediction =
  | "scores-and-weights-stay-context-changes"
  | "scores-change"
  | "nothing-changes";

type RunAttempt = {
  attemptId: string;
  presetId: AttentionPresetId;
  correct: boolean;
  evidenceEligible: boolean;
};

const EMPTY_EVIDENCE: AttentionEvidence = { events: [] };

const stages = {
  ko: [
    { id: "memory", index: "01", label: "Q · K · V" },
    { id: "scores", index: "02", label: "qKᵀ 점수" },
    { id: "weights", index: "03", label: "key축 Softmax" },
    { id: "contributions", index: "04", label: "αⱼvⱼ 기여" },
    { id: "context", index: "05", label: "context 합" },
  ],
  en: [
    { id: "memory", index: "01", label: "Q, K, V" },
    { id: "scores", index: "02", label: "qKᵀ scores" },
    { id: "weights", index: "03", label: "Key-axis softmax" },
    { id: "contributions", index: "04", label: "αⱼvⱼ contributions" },
    { id: "context", index: "05", label: "Context sum" },
  ],
} satisfies Record<"ko" | "en", Array<ExplorerStage<PipelineStage>>>;

const counterfactualOrder: readonly CounterfactualPrediction[] = [
  "scores-and-weights-stay-context-changes",
  "scores-change",
  "nothing-changes",
];

function closeEnough(left: readonly number[], right: readonly number[]) {
  return left.length === right.length
    && left.every((value, index) => Math.abs(value - right[index]) < 1e-9);
}

function format(value: number) {
  return Math.abs(value) < 0.0005 ? "0.000" : value.toFixed(3);
}

function copyMatrix(matrix: readonly (readonly number[])[]) {
  return matrix.map((row) => [...row]);
}

export function AttentionPipelineExplorer({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [presetId, setPresetId] = useState<AttentionPresetId>("find-subject");
  const [queryValues, setQueryValues] = useState(() => attentionPresets["find-subject"].query.map(String));
  const [prediction, setPrediction] = useState<AttentionPrediction | "">("");
  const [stage, setStage] = useState<PipelineStage>("memory");
  const [run, setRun] = useState<AttentionRun | null>(null);
  const [attempt, setAttempt] = useState<RunAttempt | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<AttentionMemorySlotId>("subject");
  const [inspectedThisRun, setInspectedThisRun] = useState<readonly AttentionMemorySlotId[]>([]);
  const [counterfactualPrediction, setCounterfactualPrediction] = useState<CounterfactualPrediction | "">("");
  const [counterfactualContext, setCounterfactualContext] = useState<readonly number[] | null>(null);
  const [counterfactualRevealed, setCounterfactualRevealed] = useState(false);
  const [evidence, setEvidence] = useState<AttentionEvidence>(EMPTY_EVIDENCE);
  const [feedback, setFeedback] = useState(t(
    "query가 가장 많이 읽을 source row를 먼저 예측하세요.",
    "First predict which source row the query will read most.",
  ));
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "correct" | "error">("idle");
  const [runtimeError, setRuntimeError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const predictionRef = useRef<HTMLSelectElement>(null);
  const focusPredictionAfterRecovery = useRef(false);
  const revealedPresets = useRef(new Set<AttentionPresetId>());
  const nextEventId = useRef(0);
  const nextAttemptId = useRef(0);
  const mastery = useMemo(() => evaluateAttentionLabMastery(evidence), [evidence]);
  const preset = attentionPresets[presetId];
  const baseInput = useMemo(() => inputForAttentionPresets([presetId]), [presetId]);
  const slotLabels = attentionMemorySlots.map((slot) => isKo ? slot.labelKo : slot.labelEn);
  const query = queryValues.map(Number);
  const exactPresetQuery = closeEnough(query, preset.query);

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

  function eventId() {
    nextEventId.current += 1;
    return `attention-event-${nextEventId.current}`;
  }

  function appendEvents(events: AttentionEvidenceEvent[]) {
    setEvidence((current) => ({ events: [...current.events, ...events] }));
  }

  function clearCurrentRun(nextFeedback?: string) {
    setPrediction("");
    setStage("memory");
    setRun(null);
    setAttempt(null);
    setSelectedSlotId("subject");
    setInspectedThisRun([]);
    setCounterfactualPrediction("");
    setCounterfactualContext(null);
    setCounterfactualRevealed(false);
    setRuntimeError("");
    setFeedbackTone("idle");
    setFeedback(nextFeedback ?? t(
      "현재 결과를 닫았습니다. 같은 공개 preset은 연습용이며 다른 preset을 예측하면 새 증거가 됩니다.",
      "Closed the current result. The revealed preset is practice-only; predict a different preset for new evidence.",
    ));
  }

  function choosePreset(nextPresetId: AttentionPresetId) {
    setPresetId(nextPresetId);
    setQueryValues(attentionPresets[nextPresetId].query.map(String));
    clearCurrentRun(t(
      `${attentionPresets[nextPresetId].labelKo} query를 불러왔습니다. 실행 전에 top source row를 예측하세요.`,
      `Loaded the ${attentionPresets[nextPresetId].labelEn} query. Predict its top source row before running.`,
    ));
  }

  function changeQuery(index: number, value: string) {
    setQueryValues((current) => current.map((candidate, candidateIndex) => candidateIndex === index ? value : candidate));
    setRun(null);
    setAttempt(null);
    setStage("memory");
    setPrediction("");
    setInspectedThisRun([]);
    setCounterfactualContext(null);
    setCounterfactualPrediction("");
    setCounterfactualRevealed(false);
    setRuntimeError("");
    setFeedbackTone("idle");
    setFeedback(t(
      "query를 직접 바꿨습니다. 이 실행은 인과 조작 연습이며 고정 preset 숙달 증거에는 포함되지 않습니다.",
      "You changed the query directly. This run is causal-manipulation practice and does not count as fixed-preset mastery evidence.",
    ));
  }

  function chooseStage(nextStage: PipelineStage) {
    if (!run && nextStage !== "memory") {
      setStage("memory");
      setFeedbackTone("error");
      setFeedback(t(
        "점수 이후 단계는 실행 결과입니다. top source row를 먼저 예측하고 Attention routing을 실행하세요.",
        "Stages after memory are computed results. Predict the top source row, then run Attention routing first.",
      ));
      return;
    }
    setStage(nextStage);
  }

  function resetLab() {
    revealedPresets.current.clear();
    nextEventId.current = 0;
    nextAttemptId.current = 0;
    setEvidence(EMPTY_EVIDENCE);
    setPresetId("find-subject");
    setQueryValues(attentionPresets["find-subject"].query.map(String));
    clearCurrentRun(t(
      "lab 증거와 공개 기록을 초기화했습니다. 결과를 보기 전에 다시 예측하세요.",
      "Reset the lab evidence and reveal history. Predict again before seeing any result.",
    ));
  }

  function recoverFromRuntimeError() {
    focusPredictionAfterRecovery.current = true;
    setQueryValues(attentionPresets[presetId].query.map(String));
    clearCurrentRun(t(
      "고정된 로컬 preset으로 복구했습니다. top source row를 다시 예측하세요.",
      "Recovered the fixed local preset. Predict the top source row again.",
    ));
  }

  function runAttention() {
    if (!prediction) {
      setFeedbackTone("error");
      setFeedback(t(
        "결과를 열기 전에 top source row 예측을 선택하세요.",
        "Choose a top-source-row prediction before revealing the result.",
      ));
      predictionRef.current?.focus();
      return;
    }

    try {
      const input = {
        ...baseInput,
        queries: [query],
      };
      const nextRun = runCrossAttention(input);
      const grade = gradeAttentionPrediction(input, prediction);
      const evidenceEligible = exactPresetQuery && !revealedPresets.current.has(presetId);
      const attemptId = `attention-attempt-${++nextAttemptId.current}`;

      if (exactPresetQuery) revealedPresets.current.add(presetId);
      if (evidenceEligible) {
        appendEvents([
          {
            kind: "prediction",
            eventId: eventId(),
            attemptId,
            presetId,
            prediction,
          },
          {
            kind: "run",
            eventId: eventId(),
            attemptId,
            presetId,
          },
        ]);
      }

      setRun(nextRun);
      setAttempt({ attemptId, presetId, correct: grade.correct, evidenceEligible });
      setSelectedSlotId(nextRun.topSlotIds[0]);
      setInspectedThisRun([]);
      setCounterfactualPrediction("");
      setCounterfactualContext(null);
      setCounterfactualRevealed(false);
      setStage("scores");
      setRuntimeError("");
      setFeedbackTone(grade.correct ? "correct" : "error");
      setFeedback(grade.correct
        ? t(
          `예측이 맞았습니다. ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.expected)]} row가 top입니다. 이제 서로 다른 두 value 기여를 검사하세요.`,
          `Correct. The ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.expected)]} row is top. Now inspect two different value contributions.`,
        )
        : t(
          `예측은 ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.predicted)]}, 실제 top은 ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.expected)]}입니다. q·k 부호와 크기를 직접 비교하세요. 이 preset의 재실행은 연습용입니다.`,
          `You predicted ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.predicted)]}; the actual top row is ${slotLabels[attentionMemorySlots.findIndex(({ id }) => id === grade.expected)]}. Compare q·k signs and magnitudes. Replaying this preset is practice-only.`,
        ));
    } catch {
      setRun(null);
      setAttempt(null);
      setRuntimeError(t(
        `query [${queryValues.map((value) => value || "빈 값").join(", ")}]는 유한한 두 숫자여야 합니다. 외부 runtime 없이 고정 preset으로 복구할 수 있습니다.`,
        `Query [${queryValues.map((value) => value || "empty").join(", ")}] must contain two finite numbers. Recover to the fixed preset without any external runtime.`,
      ));
      setFeedbackTone("error");
      setFeedback(t("로컬 Attention 계산이 중단됐습니다.", "The local Attention calculation stopped."));
    }
  }

  function inspectSlot(slotId: AttentionMemorySlotId) {
    if (!run || !attempt) return;
    const slotIndex = attentionMemorySlots.findIndex(({ id }) => id === slotId);
    const nextInspected = inspectedThisRun.includes(slotId)
      ? inspectedThisRun
      : [...inspectedThisRun, slotId];
    setSelectedSlotId(slotId);
    setInspectedThisRun(nextInspected);
    setStage("contributions");

    if (attempt.correct && attempt.evidenceEligible && !inspectedThisRun.includes(slotId)) {
      appendEvents([{
        kind: "inspect",
        eventId: eventId(),
        attemptId: attempt.attemptId,
        presetId: attempt.presetId,
        slotId,
      }]);
    }

    setFeedbackTone("correct");
    setFeedback(t(
      `${attentionMemorySlots[slotIndex].labelKo} row: weight ${format(run.weights[0][slotIndex])} × value [${run.values[slotIndex].map(format).join(", ")}]가 context에 [${run.valueContributions[0][slotIndex].map(format).join(", ")}]를 보냅니다.`,
      `${attentionMemorySlots[slotIndex].labelEn} row: weight ${format(run.weights[0][slotIndex])} × value [${run.values[slotIndex].map(format).join(", ")}] contributes [${run.valueContributions[0][slotIndex].map(format).join(", ")}] to context.`,
    ));
  }

  function runValueCounterfactual() {
    if (!run || !attempt) return;
    if (!counterfactualPrediction) {
      setFeedbackTone("error");
      setFeedback(t(
        "value만 바꿀 때 score·weight·context 중 무엇이 변할지 먼저 예측하세요.",
        "First predict what changes among scores, weights, and context when only a value changes.",
      ));
      return;
    }

    try {
      const slotIndex = attentionMemorySlots.findIndex(({ id }) => id === selectedSlotId);
      const replacementValue = run.values[slotIndex].map((value) => Number((1 - value).toFixed(3)));
      const nextValues = copyMatrix(run.values);
      nextValues[slotIndex] = replacementValue;
      const counterfactual = runCrossAttention({
        queries: copyMatrix(run.queries),
        keys: copyMatrix(run.keys),
        values: nextValues,
        slotIds: [...run.slotIds],
      });
      const eligible = attempt.correct && attempt.evidenceEligible && !counterfactualRevealed;

      if (eligible) {
        appendEvents([{
          kind: "value-counterfactual",
          eventId: eventId(),
          attemptId: attempt.attemptId,
          presetId: attempt.presetId,
          slotId: selectedSlotId,
          replacementValue,
          prediction: counterfactualPrediction,
        }]);
      }

      setCounterfactualContext(counterfactual.contexts[0]);
      setCounterfactualRevealed(true);
      setStage("context");
      const correct = counterfactualPrediction === "scores-and-weights-stay-context-changes";
      setFeedbackTone(correct ? "correct" : "error");
      setFeedback(correct
        ? t(
          `맞았습니다. K와 q는 그대로라 score·weight는 같고, ${attentionMemorySlots[slotIndex].labelKo} value만 바뀌어 context가 [${counterfactual.contexts[0].map(format).join(", ")}]로 이동했습니다.`,
          `Correct. K and q stayed fixed, so scores and weights stayed fixed; changing only the ${attentionMemorySlots[slotIndex].labelEn} value moved context to [${counterfactual.contexts[0].map(format).join(", ")}].`,
        )
        : t(
          `K와 q를 바꾸지 않았으므로 score·weight는 그대로입니다. value는 주소가 아니라 전달 내용이어서 context [${counterfactual.contexts[0].map(format).join(", ")}]만 달라집니다. 새 증거가 필요하면 아직 열지 않은 preset을 고르거나 lab 전체를 초기화하세요.`,
          `K and q did not change, so scores and weights stay fixed. A value is delivered content, not an address; only context changes to [${counterfactual.contexts[0].map(format).join(", ")}]. For fresh evidence, choose an unrevealed preset or reset the entire lab.`,
        ));
    } catch {
      setRuntimeError(t(
        "value counterfactual을 계산하지 못했습니다. 고정 preset으로 안전하게 복구하세요.",
        "The value counterfactual could not be calculated. Recover safely to the fixed preset.",
      ));
      setFeedbackTone("error");
    }
  }

  const selectedSlotIndex = attentionMemorySlots.findIndex(({ id }) => id === selectedSlotId);
  const hasValidCounterfactual = evidence.events.some((event) => (
    event.kind === "value-counterfactual"
    && event.prediction === "scores-and-weights-stay-context-changes"
  ));

  return (
    <InteractiveLab
      className="attention-pipeline attention-routing-lab"
      kicker={t("필수 LAB · PREDICT → ROUTE → INSPECT", "REQUIRED LAB · PREDICT → ROUTE → INSPECT")}
      title={t("한 decoder query가 source memory를 읽는 경로", "How one decoder query reads source memory")}
      description={t(
        "top row를 결과 전에 예측하고, qKᵀ·key축 softmax·αV를 직접 추적한 뒤 value-only 반사실을 실행하세요.",
        "Predict the top row before revealing it, trace qK transpose, key-axis softmax, and alpha V, then run a value-only counterfactual.",
      )}
      actions={(
        <button type="button" className="button button-ghost attention-lab-reset" onClick={resetLab}>
          {t("Attention lab 전체 초기화", "Reset Attention lab")}
        </button>
      )}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"}>
        {interactiveReady
          ? t("Attention routing lab 조작 준비 완료", "Attention routing lab controls ready")
          : t("Attention routing lab 준비 중", "Preparing the Attention routing lab")}
      </span>

      <div className="attention-preset-bar" role="group" aria-label={t("decoder query preset", "Decoder query presets")}>
        {attentionPresetIds.map((candidate) => (
          <button
            type="button"
            data-attention-preset={candidate}
            aria-pressed={candidate === presetId}
            onClick={() => choosePreset(candidate)}
            key={candidate}
          >
            <strong>{isKo ? attentionPresets[candidate].labelKo : attentionPresets[candidate].labelEn}</strong>
            <span>q=[{attentionPresets[candidate].query.map((value) => value.toFixed(1)).join(", ")}]</span>
          </button>
        ))}
      </div>

      <div className="attention-prediction-workspace">
        <fieldset className="attention-query-controls">
          <legend>{t("query 직접 조작", "Manipulate the query")}</legend>
          {queryValues.map((value, index) => (
            <label key={`q-${index}`}>
              <span>q{index}</span>
              <input
                className="attention-query-input"
                type="number"
                step="0.1"
                inputMode="decimal"
                value={value}
                disabled={Boolean(run)}
                aria-label={t(`query 성분 q${index}`, `Query component q${index}`)}
                onChange={(event) => changeQuery(index, event.currentTarget.value)}
              />
            </label>
          ))}
          <small>{exactPresetQuery
            ? t("고정 preset · 새 설정이면 숙달 증거 가능", "Fixed preset · eligible for mastery evidence when fresh")
            : t("직접 바꾼 query · 인과 조작 연습용", "Custom query · causal-manipulation practice")}</small>
        </fieldset>

        <fieldset className="attention-prediction-controls">
          <legend>{t("실행 전 top source row 예측", "Predict the top source row before running")}</legend>
          <label>
            <span>{t("q와 가장 큰 내적을 만들 key", "Key with the largest dot product with q")}</span>
            <select
              className="attention-prediction-select"
              ref={predictionRef}
              value={prediction}
              disabled={Boolean(run)}
              aria-label={t("top source row 예측", "Top source row prediction")}
              onChange={(event) => setPrediction(event.currentTarget.value as AttentionPrediction)}
            >
              <option value="" disabled>{t("결과를 보기 전에 선택", "Choose before revealing the result")}</option>
              {attentionMemorySlots.map((slot) => (
                <option value={slot.id} key={slot.id}>{isKo ? slot.labelKo : slot.labelEn}</option>
              ))}
            </select>
          </label>
          <div className="attention-run-actions">
            <button type="button" className="button button-primary attention-run-button" onClick={runAttention}>
              {t("Attention routing 실행", "Run Attention routing")}
            </button>
            <button type="button" className="button button-ghost attention-retry-button" onClick={() => clearCurrentRun()}>
              {t("현재 설정 다시 예측", "Retry current setup")}
            </button>
          </div>
        </fieldset>
      </div>

      {runtimeError ? (
        <div className="attention-runtime-fallback" role="alert">
          <strong>{t("로컬 Attention runtime 실패", "Local Attention runtime failure")}</strong>
          <p>{runtimeError}</p>
          <button type="button" className="button button-ghost attention-runtime-recover" onClick={recoverFromRuntimeError}>
            {t("고정 preset으로 안전하게 복구", "Recover the fixed preset safely")}
          </button>
        </div>
      ) : null}

      <StepExplorer
        stages={stages[locale]}
        activeStage={stage}
        onStageChange={chooseStage}
        ariaLabel={t("Attention 계산 단계", "Attention calculation stages")}
        panelId="attention-stage-panel"
      />

      <div className="attention-pipeline-workspace" id="attention-stage-panel">
        {stage === "memory" || !run ? (
          <div className="attention-memory-stage">
            <div className="attention-query-vector"><span>QUERY · q[2]</span><strong>[{queryValues.map((value) => value || "?").join(", ")}]</strong><p>{isKo ? preset.labelKo : preset.labelEn}</p></div>
            <MatrixGrid values={attentionMemorySlots.map(({ key }) => [...key])} label="KEYS · K [3,2]" rowLabels={slotLabels} columnLabels={["k0", "k1"]} tone="indigo" />
            <MatrixGrid values={attentionMemorySlots.map(({ value }) => [...value])} label="VALUES · V [3,3]" rowLabels={slotLabels} columnLabels={["v0", "v1", "v2"]} tone="forest" />
          </div>
        ) : stage === "scores" ? (
          <div className="attention-stage-visual">
            <MathFormula latex={String.raw`s=qK^{\mathsf T}`} display className="attention-stage-formula" />
            <MatrixGrid values={copyMatrix(run.scores)} label="SCORES · [1,3]" rowLabels={["q"]} columnLabels={slotLabels} selectedCell={{ row: 0, column: selectedSlotIndex }} tone="terra" />
            <p>{t("부호와 크기를 읽으세요. 이 장에서는 아직 √dₖ scaling을 적용하지 않습니다.", "Read signs and magnitudes. This chapter does not apply square-root d_k scaling yet.")}</p>
          </div>
        ) : stage === "weights" ? (
          <div className="attention-stage-visual">
            <MathFormula latex={String.raw`\alpha_j=\operatorname{softmax}_{\mathrm{keys}}(s)_j`} display className="attention-stage-formula" />
            <MatrixGrid values={copyMatrix(run.weights)} label="WEIGHTS · [1,3]" rowLabels={["q"]} columnLabels={slotLabels} selectedCell={{ row: 0, column: selectedSlotIndex }} formatValue={(value) => `${(value * 100).toFixed(1)}%`} tone="indigo" />
            <p>{t(`이 query의 weight 합은 ${format(run.weights[0].reduce((sum, value) => sum + value, 0))}입니다.`, `This query's weights sum to ${format(run.weights[0].reduce((sum, value) => sum + value, 0))}.`)}</p>
          </div>
        ) : stage === "contributions" ? (
          <div className="attention-contribution-stage">
            <MathFormula latex={String.raw`\text{contribution}_j=\alpha_jv_j`} display className="attention-stage-formula" />
            <div className="attention-slot-inspections" role="group" aria-label={t("검사할 value 기여", "Value contribution to inspect")}>
              {attentionMemorySlots.map((slot, index) => (
                <button
                  type="button"
                  className="attention-slot-inspect"
                  data-slot={slot.id}
                  aria-pressed={selectedSlotId === slot.id}
                  onClick={() => inspectSlot(slot.id)}
                  key={slot.id}
                >
                  <span>{isKo ? slot.labelKo : slot.labelEn}</span>
                  <strong>α={format(run.weights[0][index])}</strong>
                  <small>{inspectedThisRun.includes(slot.id) ? t("검사함", "inspected") : t("기여 검사", "inspect contribution")}</small>
                </button>
              ))}
            </div>
            <MatrixGrid
              values={copyMatrix(run.valueContributions[0])}
              label="ROW CONTRIBUTIONS · [3,3]"
              rowLabels={slotLabels}
              columnLabels={["c0", "c1", "c2"]}
              selectedRow={selectedSlotIndex}
              tone="forest"
            />
          </div>
        ) : (
          <div className="attention-context-stage">
            <MathFormula latex={String.raw`c=\sum_j\alpha_jv_j=\alpha V`} display className="attention-stage-formula" />
            <MatrixGrid values={copyMatrix(run.contexts)} label="CONTEXT · [1,3]" rowLabels={["c(q)"]} columnLabels={["c0", "c1", "c2"]} tone="forest" />
            {counterfactualContext ? (
              <MatrixGrid values={[[...counterfactualContext]]} label="VALUE-ONLY COUNTERFACTUAL · [1,3]" rowLabels={["c'(q)"]} columnLabels={["c0", "c1", "c2"]} tone="terra" />
            ) : null}
          </div>
        )}
      </div>

      {run ? (
        <section className="attention-counterfactual" aria-labelledby="attention-counterfactual-title">
          <div>
            <span>VALUE-ONLY COUNTERFACTUAL</span>
            <h4 id="attention-counterfactual-title">{t("선택한 row의 value만 바꾸면 무엇이 변할까요?", "What changes if only the selected row's value changes?")}</h4>
            <p>{t(
              "query와 모든 key는 고정하고 선택한 value vector만 반대로 바꿉니다. 실행 전에 계약을 예측하세요.",
              "Keep the query and every key fixed, then flip only the selected value vector. Predict the contract before running.",
            )}</p>
          </div>
          <label>
            <span>{t("변화 예측", "Change prediction")}</span>
            <select
              className="attention-counterfactual-select"
              value={counterfactualPrediction}
              disabled={counterfactualRevealed}
              aria-label={t("value-only counterfactual 예측", "Value-only counterfactual prediction")}
              onChange={(event) => setCounterfactualPrediction(event.currentTarget.value as CounterfactualPrediction)}
            >
              <option value="" disabled>{t("실행 전에 선택", "Choose before running")}</option>
              {counterfactualOrder.map((candidate) => (
                <option value={candidate} key={candidate}>
                  {candidate === "scores-and-weights-stay-context-changes"
                    ? t("score·weight는 같고 context만 변한다", "scores and weights stay; only context changes")
                    : candidate === "scores-change"
                      ? t("score부터 변해 weight도 변한다", "scores change, so weights change too")
                      : t("아무것도 변하지 않는다", "nothing changes")}
                </option>
              ))}
            </select>
          </label>
          <button type="button" className="button button-secondary attention-counterfactual-run" onClick={runValueCounterfactual}>
            {t("value-only 반사실 실행", "Run value-only counterfactual")}
          </button>
        </section>
      ) : null}

      <div className="attention-evidence" data-mastered={mastery.mastered ? "true" : "false"}>
        <strong>{t("숙달 증거", "MASTERY EVIDENCE")}</strong>
        <span className={mastery.correctPresetIds.length >= 2 ? "is-complete" : undefined}>
          {mastery.correctPresetIds.length >= 2 ? "✓" : "○"} {t(`서로 다른 올바른 예측 ${mastery.correctPresetIds.length}/2`, `Distinct correct predictions ${mastery.correctPresetIds.length}/2`)}
        </span>
        <span className={mastery.inspectedSlotIds.length >= 2 ? "is-complete" : undefined}>
          {mastery.inspectedSlotIds.length >= 2 ? "✓" : "○"} {t(`value 기여 검사 ${mastery.inspectedSlotIds.length}/2`, `Value contributions inspected ${mastery.inspectedSlotIds.length}/2`)}
        </span>
        <span className={hasValidCounterfactual ? "is-complete" : undefined}>
          {hasValidCounterfactual ? "✓" : "○"} {t("value-only 반사실", "Value-only counterfactual")}
        </span>
      </div>

      <p className={`attention-live-feedback is-${feedbackTone}`} role="status" aria-live="polite">
        {feedback}
      </p>
    </InteractiveLab>
  );
}

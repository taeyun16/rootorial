import { useEffect, useMemo, useRef, useState } from "react";
import {
  EMBEDDING_DIMENSION,
  EmbeddingTokenizerError,
  applyEmbeddingGradient,
  baseEmbeddingTable,
  embeddingVocabulary,
  evaluateEmbeddingLabMastery,
  lookupEmbeddings,
  multiplyOneHotByTable,
  oneHotVector,
  tokenizeText,
  uniqueTokenIds,
  vectorDelta,
  vectorMagnitude,
  vectorsApproximatelyEqual,
  type EmbeddingLabEvidence,
  type EmbeddingTable,
  type EmbeddingVector,
  type TokenPiece,
  type TokenizerMode,
} from "../../features/embeddings/embedding-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

const presets = {
  subword: { text: "kitten sleeps", mode: "subword" as const },
  repeated: { text: "cat cat runs", mode: "subword" as const },
  unknown: { text: "comet runs", mode: "whole-word" as const },
};

const EMPTY_EVIDENCE: EmbeddingLabEvidence = {
  correctShapePrediction: false,
  lookupEquivalenceInspected: false,
  repeatedRowUpdateObserved: false,
  unusedRowVerifiedStable: false,
};

function cloneTable(table: EmbeddingTable = baseEmbeddingTable): EmbeddingVector[] {
  return table.map((row) => [...row] as EmbeddingVector);
}

function parsePredictedRows(value: string) {
  if (!value.trim()) return [];
  const rows = value.split(",").map((part) => Number(part.trim()));
  if (rows.some((row) => !Number.isInteger(row))) return [];
  return [...new Set(rows)].sort((left, right) => left - right);
}

function sameRows(left: readonly number[], right: readonly number[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatVector(vector: readonly number[]) {
  return `[${vector.map((value) => value.toFixed(3)).join(", ")}]`;
}

export function EmbeddingLookupLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [text, setText] = useState(presets.subword.text);
  const [mode, setMode] = useState<TokenizerMode>(presets.subword.mode);
  const [predictedLength, setPredictedLength] = useState("");
  const [predictedDimension, setPredictedDimension] = useState("");
  const [predictedRows, setPredictedRows] = useState("");
  const [pieces, setPieces] = useState<TokenPiece[] | null>(null);
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [table, setTable] = useState<EmbeddingVector[]>(() => cloneTable());
  const [beforeUpdate, setBeforeUpdate] = useState<EmbeddingVector[] | null>(null);
  const [updatedIds, setUpdatedIds] = useState<number[]>([]);
  const [gradientAttempted, setGradientAttempted] = useState(false);
  const [stableRowId, setStableRowId] = useState(4);
  const [evidence, setEvidence] = useState<EmbeddingLabEvidence>(EMPTY_EVIDENCE);
  const [feedback, setFeedback] = useState(t(
    "먼저 output의 token 길이 T와 embedding 차원 D를 예측하세요.",
    "First predict output token length T and embedding dimension D.",
  ));
  const [runtimeError, setRuntimeError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const textInputRef = useRef<HTMLInputElement>(null);
  const focusTextAfterRecovery = useRef(false);
  const mastery = evaluateEmbeddingLabMastery(evidence);

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  useEffect(() => {
    if (!runtimeError && focusTextAfterRecovery.current) {
      focusTextAfterRecovery.current = false;
      textInputRef.current?.focus();
    }
  }, [runtimeError]);

  useEffect(() => {
    onCompletionChange?.(mastery.mastered);
  }, [mastery.mastered, onCompletionChange]);

  const selectedPiece = pieces?.[selectedPosition] ?? null;
  const selectedRow = selectedPiece ? table[selectedPiece.id] : null;
  const selectedOneHot = useMemo(
    () => selectedPiece ? oneHotVector(selectedPiece.id) : null,
    [selectedPiece],
  );

  function clearRunState(nextFeedback?: string) {
    setPredictedLength("");
    setPredictedDimension("");
    setPredictedRows("");
    setPieces(null);
    setSelectedPosition(0);
    setTable(cloneTable());
    setBeforeUpdate(null);
    setUpdatedIds([]);
    setGradientAttempted(false);
    setStableRowId(4);
    setEvidence(EMPTY_EVIDENCE);
    setRuntimeError("");
    setFeedback(nextFeedback ?? t(
      "초기화했습니다. 실행 전에 T와 D를 다시 예측하세요.",
      "Reset complete. Predict T and D again before running.",
    ));
  }

  function resetLab() {
    setText(presets.subword.text);
    setMode(presets.subword.mode);
    clearRunState();
  }

  function recoverFromRuntimeError() {
    focusTextAfterRecovery.current = true;
    resetLab();
  }

  function applyPreset(preset: keyof typeof presets) {
    const next = presets[preset];
    setText(next.text);
    setMode(next.mode);
    clearRunState(t(
      preset === "repeated"
        ? "반복 preset입니다. T·D를 예측한 뒤 affected rows에 2,5를 입력해 보세요."
        : preset === "subword"
          ? "subword preset입니다. kitten이 몇 pieces가 되는지 먼저 예측하세요."
          : "unknown preset입니다. whole-word vocab에 없는 단어가 어떤 ID가 되는지 관찰하세요.",
      preset === "repeated"
        ? "Repeated preset loaded. Predict T and D, then try 2,5 for affected rows."
        : preset === "subword"
          ? "Subword preset loaded. First predict how many pieces kitten becomes."
          : "Unknown preset loaded. Observe the ID assigned to a word outside the whole-word vocabulary.",
    ));
  }

  function invalidateExecution(nextText?: string, nextMode?: TokenizerMode) {
    if (nextText !== undefined) setText(nextText);
    if (nextMode !== undefined) setMode(nextMode);
    setPieces(null);
    setBeforeUpdate(null);
    setUpdatedIds([]);
    setTable(cloneTable());
    setRuntimeError("");
    setFeedback(t(
      "입력이 바뀌었습니다. 현재 문자열의 T와 D를 예측한 뒤 다시 실행하세요.",
      "The input changed. Predict T and D for the current text, then run again.",
    ));
  }

  function runTokenization() {
    if (!predictedLength || !predictedDimension) {
      setFeedback(t(
        "실행 전에 T와 D 두 값을 모두 입력하세요. tokenization 결과를 먼저 보지 않는 예측 단계입니다.",
        "Enter both T and D before running. This prediction must happen before seeing tokenization output.",
      ));
      return;
    }
    try {
      const nextPieces = tokenizeText(text, mode);
      const correct = (
        Number(predictedLength) === nextPieces.length
        && Number(predictedDimension) === EMBEDDING_DIMENSION
      );
      setPieces(nextPieces);
      setSelectedPosition(0);
      setTable(cloneTable());
      setBeforeUpdate(null);
      setUpdatedIds([]);
      setEvidence((current) => ({
        ...current,
        correctShapePrediction: current.correctShapePrediction || correct,
      }));
      setRuntimeError("");
      setFeedback(correct
        ? t(
          `예측 확인: ${nextPieces.length} pieces × ${EMBEDDING_DIMENSION} dimensions입니다. 이제 한 위치를 골라 one-hot 동치를 실행하세요.`,
          `Prediction confirmed: ${nextPieces.length} pieces × ${EMBEDDING_DIMENSION} dimensions. Choose a position and run the one-hot equivalence.`,
        )
        : t(
          `예측 수정 필요: 실제 shape는 [T=${nextPieces.length}, D=${EMBEDDING_DIMENSION}]입니다. 단어 수가 아니라 tokenizer가 만든 piece 수를 세세요.`,
          `Prediction needs revision: actual shape is [T=${nextPieces.length}, D=${EMBEDDING_DIMENSION}]. Count tokenizer pieces, not words.`,
        ));
    } catch (error) {
      setPieces(null);
      setRuntimeError(error instanceof EmbeddingTokenizerError
        ? error.code === "no-letter-word"
          ? t(
            "글자가 포함된 단어를 하나 이상 입력하세요.",
            "Enter at least one word containing letters.",
          )
          : t(
            "교육 tokenizer는 최대 여덟 pieces까지 처리합니다.",
            "The didactic tokenizer accepts at most eight pieces.",
          )
        : t(
          "결정적 tokenizer 실행에 실패했습니다.",
          "The deterministic tokenizer failed.",
        ));
    }
  }

  function inspectLookupEquivalence() {
    if (!selectedPiece || !selectedOneHot) return;
    try {
      const product = multiplyOneHotByTable(selectedOneHot, table);
      const lookup = lookupEmbeddings([selectedPiece.id], table)[0];
      const equal = vectorsApproximatelyEqual(product, lookup);
      setEvidence((current) => ({
        ...current,
        lookupEquivalenceInspected: current.lookupEquivalenceInspected || equal,
      }));
      setRuntimeError("");
      setFeedback(equal
        ? t(
          `${selectedPiece.token}의 one-hot에서 1인 row ${selectedPiece.id}만 남아 ${formatVector(product)}가 direct lookup과 같습니다.`,
          `Only row ${selectedPiece.id}, where ${selectedPiece.token}'s one-hot is 1, survives. ${formatVector(product)} equals direct lookup.`,
        )
        : t("row 선택 계약이 깨졌습니다. lab을 초기화하세요.", "The row-selection contract failed. Reset the lab."));
    } catch {
      setRuntimeError(t(
        "one-hot × E 계산에 실패했습니다. lab을 초기화한 뒤 다시 시도하세요.",
        "The one-hot × E calculation failed. Reset the lab and try again.",
      ));
    }
  }

  function runGradientUpdate() {
    if (!pieces) return;
    if (gradientAttempted) {
      setFeedback(t(
        "이미 이 snapshot에 update를 한 번 실행했습니다. 공개된 결과를 재사용하지 말고 반복 preset 또는 lab 초기화로 돌아가 새 예측을 제출하세요.",
        "This snapshot already received one update. Do not reuse the revealed result; reload the repeated preset or reset the lab before submitting a new prediction.",
      ));
      return;
    }
    const ids = pieces.map(({ id }) => id);
    const expectedRows = uniqueTokenIds(ids);
    const prediction = parsePredictedRows(predictedRows);
    try {
      const snapshot = cloneTable(table);
      const update = applyEmbeddingGradient(table, ids, [0.2, -0.1], 0.5);
      const repeatedId = expectedRows.find((id) => ids.filter((candidate) => candidate === id).length > 1);
      const singleId = expectedRows.find((id) => ids.filter((candidate) => candidate === id).length === 1);
      const repeatedDelta = repeatedId === undefined
        ? 0
        : vectorMagnitude(vectorDelta(snapshot[repeatedId], update.table[repeatedId]));
      const singleDelta = singleId === undefined
        ? 0
        : vectorMagnitude(vectorDelta(snapshot[singleId], update.table[singleId]));
      const correctPrediction = sameRows(prediction, expectedRows);
      const repeatedObserved = (
        correctPrediction
        && repeatedId !== undefined
        && singleId !== undefined
        && Math.abs(repeatedDelta - 2 * singleDelta) < 1e-9
      );
      setBeforeUpdate(snapshot);
      setTable(update.table);
      setUpdatedIds(update.changedRows);
      setGradientAttempted(true);
      setEvidence((current) => ({
        ...current,
        repeatedRowUpdateObserved: current.repeatedRowUpdateObserved || repeatedObserved,
        unusedRowVerifiedStable: false,
      }));
      setRuntimeError("");
      if (!correctPrediction) {
        setFeedback(t(
          `affected rows 예측이 다릅니다. 실제 unique rows는 ${expectedRows.join(", ")}입니다. update는 실행됐으므로 반복 기여 증거를 다시 얻으려면 반복 preset으로 초기화하세요.`,
          `Affected-row prediction differs. Actual unique rows are ${expectedRows.join(", ")}. The update ran, so reload the repeated preset to earn repeated-contribution evidence.`,
        ));
      } else if (!repeatedObserved) {
        setFeedback(t(
          "예측한 rows는 맞지만 반복 token과 단일 token을 함께 포함해야 2× 누적을 관찰할 수 있습니다. 반복 preset을 사용하세요.",
          "The row prediction is right, but you need both a repeated and a single token to observe 2× accumulation. Use the repeated preset.",
        ));
      } else {
        setFeedback(t(
          `row ${repeatedId}의 이동 크기는 row ${singleId}의 정확히 2배입니다. 이제 update되지 않은 row를 직접 검증하세요.`,
          `Row ${repeatedId} moved exactly twice as far as row ${singleId}. Now verify an unupdated row directly.`,
        ));
      }
    } catch {
      setRuntimeError(t(
        "embedding update 실행에 실패했습니다. lab을 초기화한 뒤 다시 시도하세요.",
        "The embedding update failed. Reset the lab and try again.",
      ));
    }
  }

  function verifyStableRow() {
    if (!beforeUpdate || !pieces) {
      setFeedback(t("먼저 gradient update를 실행하세요.", "Run the gradient update first."));
      return;
    }
    const referenced = uniqueTokenIds(pieces.map(({ id }) => id));
    const unchanged = vectorsApproximatelyEqual(beforeUpdate[stableRowId], table[stableRowId]);
    const valid = !referenced.includes(stableRowId) && unchanged;
    setEvidence((current) => ({
      ...current,
      unusedRowVerifiedStable: current.unusedRowVerifiedStable || valid,
    }));
    setFeedback(valid
      ? t(
        `row ${stableRowId}는 forward에서 참조되지 않아 data-gradient update 전후 ${formatVector(table[stableRowId])}로 같습니다.`,
        `Row ${stableRowId} was not referenced in forward and remains ${formatVector(table[stableRowId])} across the data-gradient update.`,
      )
      : referenced.includes(stableRowId)
        ? t(
          `row ${stableRowId}는 현재 입력이 참조했습니다. affected rows 밖의 row를 선택하세요.`,
          `Row ${stableRowId} was referenced by the current input. Choose a row outside the affected set.`,
        )
        : t(
          `row ${stableRowId}가 바뀌었습니다. update state를 초기화하고 다시 실행하세요.`,
          `Row ${stableRowId} changed. Reset the update state and try again.`,
        ));
  }

  return (
    <InteractiveLab
      className="embeddings-lookup-lab"
      kicker={t("필수 LAB · TOKEN → ROW → GRADIENT", "REQUIRED LAB · TOKEN → ROW → GRADIENT")}
      title={t("token ID가 고른 row와 반복 gradient를 직접 추적하세요", "Trace the row selected by a token ID and its repeated gradient")}
      description={t(
        "작은 고정 vocab은 원리를 드러내기 위한 교육 모델입니다. 실제 tokenizer와 table은 모델마다 다르지만 shape·lookup·gradient 계약은 같습니다.",
        "This small fixed vocabulary is a didactic model that exposes the mechanism. Real tokenizers and tables vary by model, but the shape, lookup, and gradient contracts stay.",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={resetLab}>
          {t("lab 전체 초기화", "Reset lab")}
        </button>
      )}
    >
      <div className="embeddings-presets" role="group" aria-label={t("tokenizer preset", "Tokenizer presets")}>
        <button type="button" className="button button-ghost" onClick={() => applyPreset("subword")}>{t("subword", "Subword")}</button>
        <button type="button" className="button button-ghost" onClick={() => applyPreset("repeated")}>{t("반복 token", "Repeated token")}</button>
        <button type="button" className="button button-ghost" onClick={() => applyPreset("unknown")}>{t("unknown", "Unknown")}</button>
      </div>

      <div
        className="embeddings-input-grid"
        data-interactive-ready={interactiveReady ? "true" : "false"}
      >
        <label className="embeddings-text-field">
          <span>{t("tokenize할 텍스트", "Text to tokenize")}</span>
          <input
            ref={textInputRef}
            type="text"
            maxLength={48}
            value={text}
            onChange={(event) => invalidateExecution(event.currentTarget.value)}
            placeholder="cat cat runs"
          />
        </label>
        <fieldset>
          <legend>{t("교육 tokenizer 모드", "Didactic tokenizer mode")}</legend>
          {(["whole-word", "subword"] as const).map((value) => (
            <label key={value}>
              <input
                type="radio"
                name="embedding-tokenizer-mode"
                value={value}
                checked={mode === value}
                onChange={() => invalidateExecution(undefined, value)}
              />
              <span>{value}</span>
            </label>
          ))}
        </fieldset>
      </div>

      <fieldset className="embeddings-shape-prediction">
        <legend>{t("실행 전 shape 예측", "Pre-run shape prediction")}</legend>
        <label>
          <span>T · {t("token pieces", "token pieces")}</span>
          <input
            type="number"
            min="1"
            max="8"
            inputMode="numeric"
            value={predictedLength}
            onChange={(event) => setPredictedLength(event.currentTarget.value)}
          />
        </label>
        <label>
          <span>D · {t("row dimensions", "row dimensions")}</span>
          <input
            type="number"
            min="1"
            max="8"
            inputMode="numeric"
            value={predictedDimension}
            onChange={(event) => setPredictedDimension(event.currentTarget.value)}
          />
        </label>
        <button type="button" className="button button-primary" onClick={runTokenization}>
          {t("tokenize + lookup 실행", "Run tokenize + lookup")}
        </button>
      </fieldset>

      {runtimeError ? (
        <div className="embeddings-runtime-fallback" role="alert">
          <strong>{t("로컬 runtime 실패", "Local runtime failure")}</strong>
          <p>{runtimeError}</p>
          <button type="button" className="button button-ghost" onClick={recoverFromRuntimeError}>{t("안전하게 초기화", "Reset safely")}</button>
        </div>
      ) : null}

      {pieces ? (
        <div className="embeddings-lookup-workspace">
          <div className="embeddings-token-strip" role="group" aria-label={t("token 위치 선택", "Choose a token position")}>
            {pieces.map((piece, index) => (
              <button
                type="button"
                className={selectedPosition === index ? "is-selected" : undefined}
                aria-pressed={selectedPosition === index}
                onClick={() => setSelectedPosition(index)}
                key={`${piece.token}-${index}`}
              >
                <small>t{index}</small>
                <strong>{piece.token}</strong>
                <span>ID {piece.id}</span>
              </button>
            ))}
          </div>

          {selectedPiece && selectedRow && selectedOneHot ? (
            <div className="embeddings-equivalence-card">
              <div>
                <span>one_hot(ID {selectedPiece.id}) [V={selectedOneHot.length}]</span>
                <div className="embeddings-one-hot" aria-label={t(`ID ${selectedPiece.id} one-hot vector`, `One-hot vector for ID ${selectedPiece.id}`)}>
                  {selectedOneHot.map((value, id) => <code className={value === 1 ? "is-hot" : undefined} key={id}>{value}</code>)}
                </div>
              </div>
              <span aria-hidden="true">× E[V,D] =</span>
              <strong>{formatVector(selectedRow)}</strong>
              <button type="button" className="button button-secondary" onClick={inspectLookupEquivalence}>
                {t("one-hot × E와 lookup 비교", "Compare one-hot × E with lookup")}
              </button>
            </div>
          ) : null}

          <div className="embeddings-table" role="table" aria-label={t("교육 embedding table", "Didactic embedding table")}>
            <div role="row" className="embeddings-table-head">
              <span role="columnheader">ROW · TOKEN</span>
              <span role="columnheader">d0</span>
              <span role="columnheader">d1</span>
            </div>
            {embeddingVocabulary.map(({ id, token }) => (
              <div
                role="row"
                className={`${updatedIds.includes(id) ? "is-updated" : ""}${selectedPiece?.id === id ? " is-selected" : ""}`}
                key={id}
              >
                <strong role="rowheader">{id} · {token}</strong>
                <span role="cell">{table[id][0].toFixed(3)}</span>
                <span role="cell">{table[id][1].toFixed(3)}</span>
              </div>
            ))}
          </div>

          <fieldset className="embeddings-gradient-runner">
            <legend>{t("고정 upstream gradient [0.2,-0.1] · lr 0.5", "Fixed upstream gradient [0.2,-0.1] · lr 0.5")}</legend>
            <label>
              <span>{t("바뀔 unique row IDs 예측 (쉼표 구분)", "Predict unique row IDs that change (comma-separated)")}</span>
              <input
                type="text"
                inputMode="text"
                autoCapitalize="none"
                spellCheck={false}
                value={predictedRows}
                onChange={(event) => setPredictedRows(event.currentTarget.value)}
                placeholder="2,5"
              />
            </label>
            <button type="button" className="button button-secondary" onClick={runGradientUpdate}>
              {t("embedding update 실행", "Run embedding update")}
            </button>
          </fieldset>

          {beforeUpdate ? (
            <div className="embeddings-stability-check">
              <label>
                <span>{t("바뀌지 않은 row 직접 검사", "Verify an unchanged row")}</span>
                <select value={stableRowId} onChange={(event) => setStableRowId(Number(event.currentTarget.value))}>
                  {embeddingVocabulary.map(({ id, token }) => <option value={id} key={id}>row {id} · {token}</option>)}
                </select>
              </label>
              <button type="button" className="button button-secondary" onClick={verifyStableRow}>
                {t("update 전후 비교", "Compare before and after")}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      <p className="embeddings-live-feedback" role="status" aria-live="polite">{feedback}</p>

      <div className="embeddings-evidence" aria-label={t("필수 lab 증거", "Required lab evidence")}>
        <span className={evidence.correctShapePrediction ? "is-complete" : undefined}>{evidence.correctShapePrediction ? "✓" : "○"} {t("T×D 예측", "T×D prediction")}</span>
        <span className={evidence.lookupEquivalenceInspected ? "is-complete" : undefined}>{evidence.lookupEquivalenceInspected ? "✓" : "○"} {t("one-hot = lookup", "one-hot = lookup")}</span>
        <span className={evidence.repeatedRowUpdateObserved ? "is-complete" : undefined}>{evidence.repeatedRowUpdateObserved ? "✓" : "○"} {t("반복 row 누적", "repeated-row accumulation")}</span>
        <span className={evidence.unusedRowVerifiedStable ? "is-complete" : undefined}>{evidence.unusedRowVerifiedStable ? "✓" : "○"} {t("미참조 row 불변", "unused row stable")}</span>
      </div>
    </InteractiveLab>
  );
}

import { useEffect, useState } from "react";
import {
  embeddingDebuggerScenarioIds,
  evaluateEmbeddingRepair,
  type EmbeddingDebuggerScenarioId,
  type EmbeddingRepair,
  type EmbeddingRepairResult,
} from "../../features/embeddings/embedding-model";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

const scenarioCopy: Record<EmbeddingDebuggerScenarioId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
  options: readonly EmbeddingRepair[];
}> = {
  "lookup-contract": {
    title: { ko: "사건 01 · lookup 뒤 음수 좌표가 사라졌습니다", en: "Incident 01 · Negative coordinates vanished after lookup" },
    clue: {
      ko: "ID 4는 E의 row 4를 그대로 골라야 합니다. embedding 차원은 class 확률이 아닙니다.",
      en: "ID 4 must select row 4 of E unchanged. Embedding dimensions are not class probabilities.",
    },
    options: ["direct-lookup", "softmax-row", "average-table"],
  },
  "gradient-aggregation": {
    title: { ko: "사건 02 · 두 번 나온 cat의 update가 한 번뿐입니다", en: "Incident 02 · Repeated cat updated only once" },
    clue: {
      ko: "IDs [2,2,5]에서 occurrence마다 같은 upstream gradient가 도착합니다.",
      en: "For IDs [2,2,5], the same upstream gradient arrives from every occurrence.",
    },
    options: ["sum-occurrences", "dedupe-occurrences", "update-all-rows"],
  },
  "cosine-scale": {
    title: { ko: "사건 03 · candidate를 7배 했더니 더 비슷해졌습니다", en: "Incident 03 · Scaling a candidate by seven made it more similar" },
    clue: {
      ko: "retrieval score가 방향을 비교한다면 candidate의 양의 scale에 불변이어야 합니다.",
      en: "If retrieval compares direction, its score must be invariant to a positive candidate scale.",
    },
    options: ["cosine-normalized", "raw-dot", "query-only-normalized"],
  },
  "masked-pooling": {
    title: { ko: "사건 04 · PAD 두 개를 붙이자 문장 vector가 줄었습니다", en: "Incident 04 · Two PAD tokens shrank the sentence vector" },
    clue: {
      ko: "plain mean은 PAD를 합과 분모 모두에서 제외하고 실제 token 수로 나눠야 합니다.",
      en: "Plain mean must exclude PAD from both sum and denominator, then divide by the real-token count.",
    },
    options: ["mask-pad", "include-pad", "sum-only"],
  },
};

const repairCopy: Record<EmbeddingRepair, { ko: string; en: string }> = {
  "direct-lookup": { ko: "E[id] row를 그대로 반환", en: "return E[id] unchanged" },
  "softmax-row": { ko: "embedding 차원에 softmax", en: "softmax over embedding dimensions" },
  "average-table": { ko: "vocab table 전체 평균", en: "average the full vocabulary table" },
  "sum-occurrences": { ko: "occurrence 기여를 row별 합산", en: "sum occurrence contributions by row" },
  "dedupe-occurrences": { ko: "unique ID당 한 번만 update", en: "update once per unique ID" },
  "update-all-rows": { ko: "vocab 모든 row update", en: "update every vocabulary row" },
  "cosine-normalized": { ko: "두 vector norm으로 나눈 cosine", en: "cosine divided by both vector norms" },
  "raw-dot": { ko: "raw dot product", en: "raw dot product" },
  "query-only-normalized": { ko: "query만 normalize한 dot", en: "dot with only the query normalized" },
  "mask-pad": { ko: "PAD mask + real-token mean", en: "PAD mask + real-token mean" },
  "include-pad": { ko: "PAD를 포함한 전체 길이 mean", en: "mean over the full padded length" },
  "sum-only": { ko: "mask 없이 vector sum", en: "vector sum without a mean" },
};

function vector(value: readonly number[] | undefined) {
  return value ? `[${value.map((item) => item.toFixed(3)).join(", ")}]` : "—";
}

function metric(value: number | undefined) {
  return value === undefined ? "—" : value.toFixed(4).replace(/0+$/, "").replace(/\.$/, "");
}

function resultFeedback(
  result: EmbeddingRepairResult,
  scenario: EmbeddingDebuggerScenarioId,
  locale: "ko" | "en",
) {
  const isKo = locale === "ko";
  if (result.correct) {
    if (scenario === "lookup-contract") {
      return isKo
        ? `lookup ${vector(result.metrics.output)}가 E[4] ${vector(result.metrics.expected)}와 정확히 같습니다.`
        : `Lookup ${vector(result.metrics.output)} exactly matches E[4] ${vector(result.metrics.expected)}.`;
    }
    if (scenario === "gradient-aggregation") {
      return isKo
        ? `changed rows=${result.metrics.changedRows?.join(",")}; 반복 row 이동 ${metric(result.metrics.repeatedDelta)}는 단일 row ${metric(result.metrics.singleDelta)}의 2배입니다.`
        : `Changed rows=${result.metrics.changedRows?.join(",")}; repeated-row movement ${metric(result.metrics.repeatedDelta)} is 2× single-row movement ${metric(result.metrics.singleDelta)}.`;
    }
    if (scenario === "cosine-scale") {
      return isKo
        ? `원래 score ${metric(result.metrics.score)}와 7배 candidate score ${metric(result.metrics.scaledScore)}가 같습니다.`
        : `Original score ${metric(result.metrics.score)} equals the 7× candidate score ${metric(result.metrics.scaledScore)}.`;
    }
    return isKo
      ? `PAD 전 ${vector(result.metrics.basePool)}와 PAD 후 ${vector(result.metrics.paddedPool)}가 같습니다.`
      : `Before PAD ${vector(result.metrics.basePool)} equals after PAD ${vector(result.metrics.paddedPool)}.`;
  }
  if (result.reason === "row-transformed") {
    return isKo
      ? `softmax output ${vector(result.metrics.output)}는 원래 row ${vector(result.metrics.expected)}를 확률처럼 왜곡했습니다. 좌표는 음수여도 됩니다.`
      : `Softmax output ${vector(result.metrics.output)} distorts original row ${vector(result.metrics.expected)} as if dimensions were probabilities. Coordinates may be negative.`;
  }
  if (result.reason === "row-averaged") {
    return isKo
      ? `table 평균 ${vector(result.metrics.output)}는 ID 4의 row ${vector(result.metrics.expected)}가 아닙니다.`
      : `Table mean ${vector(result.metrics.output)} is not ID 4's row ${vector(result.metrics.expected)}.`;
  }
  if (result.reason === "repeat-deduplicated") {
    return isKo
      ? `반복 row 이동 ${metric(result.metrics.repeatedDelta)}와 단일 row ${metric(result.metrics.singleDelta)}가 같아 occurrence 하나가 사라졌습니다.`
      : `Repeated-row movement ${metric(result.metrics.repeatedDelta)} equals single-row movement ${metric(result.metrics.singleDelta)}, so one occurrence vanished.`;
  }
  if (result.reason === "unreferenced-rows-updated") {
    return isKo
      ? `changed rows가 ${result.metrics.changedRows?.length}개입니다. forward가 읽은 row 2와 5만 data-gradient를 받아야 합니다.`
      : `${result.metrics.changedRows?.length} rows changed. Only rows 2 and 5 read in forward should receive data gradients.`;
  }
  if (result.reason === "magnitude-leak") {
    return isKo
      ? `candidate 7배 전후 score가 ${metric(result.metrics.score)} → ${metric(result.metrics.scaledScore)}로 바뀌었습니다. 두 norm을 모두 나누세요.`
      : `The score changed from ${metric(result.metrics.score)} to ${metric(result.metrics.scaledScore)} after 7× scaling. Divide by both norms.`;
  }
  if (result.reason === "padding-shrunk-mean") {
    return isKo
      ? `PAD 전 ${vector(result.metrics.basePool)}가 PAD 후 ${vector(result.metrics.paddedPool)}로 줄었습니다. PAD를 분모에서도 빼세요.`
      : `Before-PAD ${vector(result.metrics.basePool)} shrank to ${vector(result.metrics.paddedPool)}. Remove PAD from the denominator too.`;
  }
  return isKo
    ? `sum ${vector(result.metrics.basePool)}는 padding에는 불변이지만 expected mean ${vector(result.metrics.expected)}가 아닙니다.`
    : `Sum ${vector(result.metrics.basePool)} is padding-invariant but is not expected mean ${vector(result.metrics.expected)}.`;
}

export function EmbeddingDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<EmbeddingDebuggerScenarioId, EmbeddingRepair>>>({});
  const [results, setResults] = useState<Partial<Record<EmbeddingDebuggerScenarioId, EmbeddingRepairResult>>>({});
  const [runtimeError, setRuntimeError] = useState("");
  const solved = embeddingDebuggerScenarioIds.filter((scenario) => results[scenario]?.correct).length;
  const complete = solved === embeddingDebuggerScenarioIds.length;

  useEffect(() => {
    onCompletionChange?.(complete);
  }, [complete, onCompletionChange]);

  function changeAnswer(scenario: EmbeddingDebuggerScenarioId, repair: EmbeddingRepair) {
    setAnswers((current) => ({ ...current, [scenario]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[scenario];
      return next;
    });
    setRuntimeError("");
  }

  function runRepair(scenario: EmbeddingDebuggerScenarioId) {
    const repair = answers[scenario];
    if (!repair) return;
    try {
      setResults((current) => ({
        ...current,
        [scenario]: evaluateEmbeddingRepair(scenario, repair),
      }));
      setRuntimeError("");
    } catch {
      setRuntimeError(t(
        "결정적 embedding 계약 실행에 실패했습니다. debugger를 초기화한 뒤 다시 시도하세요.",
        "The deterministic embedding contract failed. Reset the debugger and try again.",
      ));
    }
  }

  function resetScenario(scenario: EmbeddingDebuggerScenarioId) {
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
      className="embeddings-debugger-lab"
      kicker={t("별도 활동 · EMBEDDING CONTRACT DEBUGGER", "SEPARATE ACTIVITY · EMBEDDING CONTRACT DEBUGGER")}
      title={t("계산 결과로 네 embedding 계약을 복구하세요", "Restore four embedding contracts from computed results")}
      description={t(
        "각 repair는 실제 row, gradient delta, similarity, pooled vector를 다시 계산합니다. 이름이 아니라 불변식으로 판정합니다.",
        "Every repair recomputes actual rows, gradient deltas, similarity, and pooled vectors. The invariant—not the label—determines success.",
      )}
      actions={(
        <button type="button" className="button button-ghost" onClick={resetAll}>
          {t("debugger 전체 초기화", "Reset debugger")}
        </button>
      )}
    >
      <div className="embeddings-debug-progress" role="status" aria-live="polite" data-interactive-ready="true">
        <div>
          <span>{t("복구한 계약", "CONTRACTS RESTORED")}</span>
          <strong>{solved} / {embeddingDebuggerScenarioIds.length}</strong>
        </div>
        <span>{complete
          ? t("모든 embedding 경계가 결정적 검사를 통과했습니다.", "Every embedding boundary passed its deterministic check.")
          : t("오답은 깨진 vector와 원인을 즉시 설명합니다.", "Wrong repairs immediately explain the broken vectors and cause.")}</span>
      </div>

      {runtimeError ? <p className="embeddings-runtime-fallback" role="alert">{runtimeError}</p> : null}

      <div className="embeddings-debug-grid">
        {embeddingDebuggerScenarioIds.map((scenario, index) => {
          const copy = scenarioCopy[scenario];
          const answer = answers[scenario] ?? "";
          const result = results[scenario];
          const feedbackId = `${scenario}-embeddings-feedback`;
          return (
            <fieldset
              className={`embeddings-debug-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenario}
            >
              <legend>{copy.title[locale]}</legend>
              <p>{copy.clue[locale]}</p>
              <label>
                <span>{t("실행할 repair", "Repair to run")}</span>
                <select
                  value={answer}
                  onChange={(event) => changeAnswer(scenario, event.currentTarget.value as EmbeddingRepair)}
                  aria-label={t(`${index + 1}번 사건 repair`, `Repair for incident ${index + 1}`)}
                >
                  <option value="" disabled>{t("repair 선택", "Choose a repair")}</option>
                  {copy.options.map((option) => (
                    <option value={option} key={option}>{repairCopy[option][locale]}</option>
                  ))}
                </select>
              </label>
              <div className="embeddings-debug-actions">
                <button
                  type="button"
                  className="button button-secondary"
                  disabled={!answer}
                  onClick={() => runRepair(scenario)}
                >
                  {t("계약 실행", "Run contract")}
                </button>
                <button type="button" className="button button-ghost" onClick={() => resetScenario(scenario)}>
                  {t(`사건 ${index + 1} 초기화`, `Reset incident ${index + 1}`)}
                </button>
              </div>
              {result ? (
                <p
                  id={feedbackId}
                  className={`embeddings-debug-feedback ${result.correct ? "is-correct" : "is-incorrect"}`}
                  role="status"
                  aria-live="polite"
                >
                  <strong>{result.correct ? t("복구 완료", "Restored") : t("아직 깨짐", "Still broken")}</strong>
                  <span>{resultFeedback(result, scenario, locale)}</span>
                </p>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

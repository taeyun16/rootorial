import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NotebookCodeEditor } from "./NotebookCodeEditor";
import {
  NotebookExecutionError,
  prepareNotebookRuntime,
  restartNotebookRuntime,
  retainNotebookRuntime,
  runNotebookCode,
} from "./notebookRuntime";
import type { NotebookRunPhase } from "./notebookRuntime";
import { useLocale } from "../features/localization/localization";

type NotebookCellStatus =
  | "idle"
  | "loading"
  | "queued"
  | "running"
  | "done"
  | "stopped"
  | "error";

export type NotebookCellProps = {
  initialCode: string;
  title?: string;
  description?: ReactNode;
  hint?: ReactNode;
  ariaLabel?: string;
  editorMinHeight?: number;
  figureAlt?: string | ((index: number) => string);
  className?: string;
};

const statusLabelsKo: Record<NotebookCellStatus, string> = {
  idle: "실행 대기",
  loading: "Python 준비 중",
  queued: "실행 순서 대기 중",
  running: "코드 실행 중",
  done: "실행 완료",
  stopped: "실행 중지",
  error: "실행 오류",
};

const statusLabelsEn: Record<NotebookCellStatus, string> = {
  idle: "Ready to run", loading: "Preparing Python", queued: "Waiting in queue",
  running: "Running code", done: "Run complete", stopped: "Run stopped", error: "Run error",
};

function statusFromPhase(phase: NotebookRunPhase): NotebookCellStatus {
  if (phase === "queued") return "queued";
  if (phase === "running") return "running";
  return "loading";
}

function executionPrompt(
  status: NotebookCellStatus,
  executionCount: number | null,
) {
  if (status === "loading" || status === "queued" || status === "running") {
    return "In [*]";
  }
  return `In [${executionCount ?? " "}]`;
}

export function NotebookCell({
  initialCode,
  title = "Python 코드 셀",
  description,
  hint,
  ariaLabel,
  editorMinHeight = 190,
  figureAlt,
  className,
}: NotebookCellProps) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const statusLabels = isKo ? statusLabelsKo : statusLabelsEn;
  const titleId = useId();
  const statusId = useId();
  const outputId = useId();
  const [code, setCode] = useState(initialCode);
  const [status, setStatus] = useState<NotebookCellStatus>("idle");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [figures, setFigures] = useState<string[]>([]);
  const [executionCount, setExecutionCount] = useState<number | null>(null);
  const runVersionRef = useRef(0);
  const inFlightRef = useRef(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    const releaseRuntime = retainNotebookRuntime();
    return () => {
      mountedRef.current = false;
      inFlightRef.current = false;
      runVersionRef.current += 1;
      releaseRuntime();
    };
  }, []);

  useEffect(() => {
    runVersionRef.current += 1;
    inFlightRef.current = false;
    setCode(initialCode);
    setStatus("idle");
    setOutput("");
    setError("");
    setFigures([]);
    setExecutionCount(null);
  }, [initialCode]);

  const busy = status === "loading" || status === "queued" || status === "running";
  const changed = code !== initialCode;
  const hasResult = status === "done" || status === "stopped" || status === "error";
  const resolvedAriaLabel = ariaLabel ?? (isKo ? `${title}에 실행할 Python 코드` : `Python code to run for ${title}`);

  async function runCode() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const runVersion = runVersionRef.current + 1;
    runVersionRef.current = runVersion;
    setStatus("loading");
    setOutput("");
    setError("");
    setFigures([]);

    const onPhase = (phase: NotebookRunPhase) => {
      if (!mountedRef.current || runVersionRef.current !== runVersion) return;
      setStatus(statusFromPhase(phase));
    };

    try {
      const result = await runNotebookCode(code, onPhase);
      if (!mountedRef.current || runVersionRef.current !== runVersion) return;

      setOutput(result.output);
      setFigures(result.figures);
      setExecutionCount(result.executionCount);
      setStatus("done");
    } catch (caughtError) {
      if (!mountedRef.current || runVersionRef.current !== runVersion) return;

      if (caughtError instanceof NotebookExecutionError) {
        setOutput(caughtError.output);
        setFigures(caughtError.figures);
        setExecutionCount(caughtError.executionCount ?? null);
        if (caughtError.code === "stopped" || caughtError.code === "disposed") {
          setError("");
          setStatus("stopped");
          return;
        }
        setError(caughtError.message);
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : (isKo ? "Python 코드를 실행하지 못했습니다." : "Could not run the Python code."),
        );
      }
      setStatus("error");
    } finally {
      if (runVersionRef.current === runVersion) {
        inFlightRef.current = false;
      }
    }
  }

  function stopCode() {
    if (!inFlightRef.current) return;

    runVersionRef.current += 1;
    inFlightRef.current = false;
    restartNotebookRuntime();
    setStatus("stopped");
    setOutput("");
    setError("");
    setFigures([]);
    setExecutionCount(null);
  }

  function resetCell() {
    runVersionRef.current += 1;
    inFlightRef.current = false;
    setCode(initialCode);
    setStatus("idle");
    setOutput("");
    setError("");
    setFigures([]);
    setExecutionCount(null);
  }

  function prepareRuntime() {
    void prepareNotebookRuntime().catch(() => {
      // The normal run path reports initialization errors with full cell context.
    });
  }

  function getFigureAlt(index: number) {
    if (typeof figureAlt === "function") return figureAlt(index);
    if (figureAlt) {
      return figures.length > 1 ? `${figureAlt} ${index + 1}` : figureAlt;
    }
    return isKo ? `${title} 실행 결과 차트 ${index + 1}` : `${title} output chart ${index + 1}`;
  }

  const rootClassName = [
    "notebook-cell",
    `notebook-cell-${status}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      className={rootClassName}
      data-status={status}
      aria-labelledby={titleId}
      aria-busy={busy}
    >
      <div className="notebook-cell-prompt" aria-hidden="true">
        {executionPrompt(status, executionCount)}
      </div>

      <div className="notebook-cell-main">
        <div className="notebook-cell-toolbar">
          <div className="notebook-cell-heading">
            <span className="notebook-cell-language">Python</span>
            <strong className="notebook-cell-title" id={titleId}>{title}</strong>
          </div>
          <div className="notebook-cell-actions">
            <button
              type="button"
              className="notebook-cell-reset"
              onClick={resetCell}
              disabled={busy || (!changed && status === "idle")}
            >
              {isKo ? "초기화" : "Reset"}
            </button>
            <button
              type="button"
              className="notebook-cell-run"
              onClick={busy ? stopCode : runCode}
              onPointerEnter={busy ? undefined : prepareRuntime}
              onFocus={busy ? undefined : prepareRuntime}
              aria-describedby={statusId}
              aria-controls={outputId}
              aria-label={busy ? (isKo ? `${title} 실행 중지` : `Stop ${title}`) : (isKo ? `${title} 실행` : `Run ${title}`)}
            >
              {busy ? (isKo ? "중지" : "Stop") : (isKo ? "실행" : "Run")}
            </button>
          </div>
        </div>

        {description ? (
          <div className="notebook-cell-description">{description}</div>
        ) : null}

        <div className="notebook-cell-editor-shell">
          <NotebookCodeEditor
            value={code}
            onChange={setCode}
            onRun={runCode}
            ariaLabel={resolvedAriaLabel}
            minHeight={editorMinHeight}
          />
        </div>

        <span className="sr-only" id={statusId} aria-live="polite">
          {statusLabels[status]}
        </span>

        <div className="notebook-cell-output" id={outputId}>
          {hasResult ? (
            <>
              <div className="notebook-cell-output-heading">
                <span aria-hidden="true">Out [{executionCount ?? " "}]</span>
                <span className={`notebook-cell-status notebook-cell-status-${status}`}>
                  {statusLabels[status]}
                </span>
              </div>

              {output ? (
                <pre className="notebook-cell-output-text">{output}</pre>
              ) : status === "stopped" ? (
                <p className="notebook-cell-empty-output">
                  {isKo ? "실행을 중지했습니다. 다시 실행하면 새 Python 커널을 시작합니다." : "Execution stopped. Running again will start a new Python kernel."}
                </p>
              ) : status === "done" && figures.length === 0 ? (
                <p className="notebook-cell-empty-output">
                  {isKo ? "실행을 마쳤습니다. 표시할 출력은 없습니다." : "Execution finished with no output to display."}
                </p>
              ) : null}

              {error ? (
                <pre className="notebook-cell-error">{error}</pre>
              ) : null}

              {figures.length > 0 ? (
                <div className="notebook-cell-figures">
                  {figures.map((source, index) => (
                    <figure className="notebook-cell-figure" key={`${executionCount}-${index}`}>
                      <img src={source} alt={getFigureAlt(index)} />
                    </figure>
                  ))}
                </div>
              ) : null}
            </>
          ) : (
            <p className="notebook-cell-output-placeholder">
              <span aria-hidden="true">Out [ ]</span>
              {isKo ? "실행 결과가 여기에 표시됩니다." : "Output will appear here."}
            </p>
          )}
        </div>

        {hint ? (
          <aside className="notebook-cell-hint">
            <strong>{isKo ? "실험 제안" : "Experiment suggestion"}</strong>
            <div>{hint}</div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

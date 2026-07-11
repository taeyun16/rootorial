import { useEffect, useId, useRef, useState } from "react";
import type { ReactNode } from "react";
import { NotebookCodeEditor } from "./NotebookCodeEditor";
import {
  NotebookExecutionError,
  runNotebookCode,
} from "./notebookRuntime";
import type { NotebookRunPhase } from "./notebookRuntime";

type NotebookCellStatus =
  | "idle"
  | "loading"
  | "queued"
  | "running"
  | "done"
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

const statusLabels: Record<NotebookCellStatus, string> = {
  idle: "실행 대기",
  loading: "Python 준비 중",
  queued: "실행 순서 대기 중",
  running: "코드 실행 중",
  done: "실행 완료",
  error: "실행 오류",
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
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      runVersionRef.current += 1;
    };
  }, []);

  const busy = status === "loading" || status === "queued" || status === "running";
  const changed = code !== initialCode;
  const hasResult = status === "done" || status === "error";
  const resolvedAriaLabel = ariaLabel ?? `${title}에 실행할 Python 코드`;

  async function runCode() {
    if (busy) return;

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
        setError(caughtError.message);
      } else {
        setError(
          caughtError instanceof Error
            ? caughtError.message
            : "Python 코드를 실행하지 못했습니다.",
        );
      }
      setStatus("error");
    }
  }

  function resetCell() {
    runVersionRef.current += 1;
    setCode(initialCode);
    setStatus("idle");
    setOutput("");
    setError("");
    setFigures([]);
    setExecutionCount(null);
  }

  function getFigureAlt(index: number) {
    if (typeof figureAlt === "function") return figureAlt(index);
    if (figureAlt) {
      return figures.length > 1 ? `${figureAlt} ${index + 1}` : figureAlt;
    }
    return `${title} 실행 결과 차트 ${index + 1}`;
  }

  const rootClassName = [
    "notebook-cell",
    `notebook-cell-${status}`,
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section className={rootClassName} data-status={status} aria-labelledby={titleId}>
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
              초기화
            </button>
            <button
              type="button"
              className="notebook-cell-run"
              onClick={runCode}
              disabled={busy}
              aria-describedby={statusId}
              aria-controls={outputId}
            >
              <span aria-hidden="true">{busy ? "◌" : "▶"}</span>
              {busy ? "실행 중" : "실행"}
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

        <div className="notebook-cell-output" id={outputId} aria-live="polite">
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
              ) : status === "done" && figures.length === 0 ? (
                <p className="notebook-cell-empty-output">
                  실행을 마쳤습니다. 표시할 출력은 없습니다.
                </p>
              ) : null}

              {error ? (
                <pre className="notebook-cell-error" role="alert">{error}</pre>
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
              실행 결과가 여기에 표시됩니다.
            </p>
          )}
        </div>

        {hint ? (
          <aside className="notebook-cell-hint">
            <strong>실험 제안</strong>
            <div>{hint}</div>
          </aside>
        ) : null}
      </div>
    </section>
  );
}

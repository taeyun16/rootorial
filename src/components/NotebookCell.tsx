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

type NotebookErrorCategory =
  | "syntax"
  | "name"
  | "type"
  | "index"
  | "module"
  | "runtime"
  | "execution";

export type NotebookCellProps = {
  initialCode: string;
  supportCode?: string;
  title?: string;
  description?: ReactNode;
  hint?: ReactNode;
  ariaLabel?: string;
  editorMinHeight?: number;
  figureAlt?: string | ((index: number) => string);
  className?: string;
  defaultExpanded?: boolean;
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

function classifyNotebookError(caughtError: unknown): NotebookErrorCategory {
  const message = caughtError instanceof Error ? caughtError.message : String(caughtError);

  if (caughtError instanceof NotebookExecutionError && caughtError.code === "runtime") {
    return "runtime";
  }
  if (/SyntaxError|IndentationError|TabError/i.test(message)) return "syntax";
  if (/NameError|UnboundLocalError/i.test(message)) return "name";
  if (/TypeError|ValueError/i.test(message)) return "type";
  if (/IndexError|KeyError/i.test(message)) return "index";
  if (/ModuleNotFoundError|ImportError/i.test(message)) return "module";
  return "execution";
}

function notebookErrorNextAction(category: NotebookErrorCategory, isKo: boolean) {
  const messages: Record<NotebookErrorCategory, { ko: string; en: string }> = {
    syntax: {
      ko: "오류가 난 줄의 괄호, 콜론, 들여쓰기를 확인한 뒤 다시 실행하세요.",
      en: "Check brackets, colons, and indentation on the reported line, then run again.",
    },
    name: {
      ko: "변수 이름의 철자와 그 변수가 앞에서 정의되었는지 확인하세요.",
      en: "Check the variable spelling and make sure it is defined before this line.",
    },
    type: {
      ko: "오류가 난 연산에 전달한 값의 자료형과 shape을 확인하세요.",
      en: "Check the value type and shape passed to the failing operation.",
    },
    index: {
      ko: "배열의 shape과 사용한 행·열 인덱스 범위를 확인하세요.",
      en: "Check the array shape and the row or column index range.",
    },
    module: {
      ko: "모듈 이름을 확인하세요. 이 브라우저 실습은 셀에 준비된 라이브러리만 지원합니다.",
      en: "Check the module name. This browser lab supports the libraries prepared in the cell.",
    },
    runtime: {
      ko: "네트워크 연결을 확인한 뒤 잠시 후 코드 실행을 다시 누르세요.",
      en: "Check your network connection, wait a moment, then choose Run code again.",
    },
    execution: {
      ko: "오류 메시지의 마지막 줄을 확인하고 해당 코드를 수정한 뒤 다시 실행하세요.",
      en: "Read the last line of the error, fix that part of the code, then run again.",
    },
  };

  return isKo ? messages[category].ko : messages[category].en;
}

export function NotebookCell({
  initialCode,
  supportCode,
  title = "Python 코드 셀",
  description,
  hint,
  ariaLabel,
  editorMinHeight = 190,
  figureAlt,
  className,
  defaultExpanded = false,
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
  const [errorCategory, setErrorCategory] = useState<NotebookErrorCategory | null>(null);
  const [figures, setFigures] = useState<string[]>([]);
  const [executionCount, setExecutionCount] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(defaultExpanded);
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
    setErrorCategory(null);
    setFigures([]);
    setExecutionCount(null);
    setExpanded(defaultExpanded);
  }, [defaultExpanded, initialCode, supportCode]);

  const busy = status === "loading" || status === "queued" || status === "running";
  const changed = code !== initialCode;
  const hasResult = status === "done" || status === "stopped" || status === "error";
  const resolvedAriaLabel = ariaLabel ?? (isKo ? `${title}에 실행할 Python 코드` : `Python code to run for ${title}`);
  const codeLines = code.split("\n");
  const supportLineCount = supportCode?.split("\n").length ?? 0;
  const repairMarkerIndex = codeLines.findIndex((line) => line.includes("REPAIR:"));
  const repairLineIndex = repairMarkerIndex >= 0 && repairMarkerIndex + 1 < codeLines.length
    ? repairMarkerIndex + 1
    : -1;

  function updateRepairLine(nextLine: string) {
    if (repairLineIndex < 0) return;
    const nextCodeLines = [...codeLines];
    nextCodeLines[repairLineIndex] = nextLine;
    setCode(nextCodeLines.join("\n"));
  }

  async function runCode() {
    if (inFlightRef.current) return;
    inFlightRef.current = true;

    const runVersion = runVersionRef.current + 1;
    runVersionRef.current = runVersion;
    setStatus("loading");
    setOutput("");
    setError("");
    setErrorCategory(null);
    setFigures([]);

    const onPhase = (phase: NotebookRunPhase) => {
      if (!mountedRef.current || runVersionRef.current !== runVersion) return;
      setStatus(statusFromPhase(phase));
    };

    try {
      const executionCode = supportCode ? `${supportCode}\n\n${code}` : code;
      const result = await runNotebookCode(executionCode, onPhase);
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
          setErrorCategory(null);
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
      setErrorCategory(classifyNotebookError(caughtError));
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
    setErrorCategory(null);
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
    setErrorCategory(null);
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
              className="notebook-cell-toggle"
              aria-expanded={expanded}
              onClick={() => setExpanded((current) => !current)}
            >
              {expanded
                ? (isKo ? "코드 접기" : "Hide code")
                : supportCode
                  ? (isKo ? "핵심 코드 보기" : "Show learner code")
                  : (isKo ? "전체 코드 보기" : "Show full code")}
            </button>
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
              aria-label={busy
                ? (isKo ? `실행 중지: ${title}` : `Stop code: ${title}`)
                : (isKo ? `코드 실행: ${title}` : `Run code: ${title}`)}
            >
              {busy ? (isKo ? "실행 중지" : "Stop code") : (isKo ? "코드 실행" : "Run code")}
            </button>
          </div>
        </div>

        {description ? (
          <div className="notebook-cell-description">{description}</div>
        ) : null}

        {supportCode ? (
          <details className="notebook-cell-support-code">
            <summary>
              <span>{isKo ? "고정 실행 준비" : "Fixed runtime setup"}</span>
              <strong>{isKo ? `${supportLineCount}줄 · 실행 시 자동 포함` : `${supportLineCount} lines · included automatically`}</strong>
            </summary>
            <p>{isKo
              ? "fixture와 재사용 함수입니다. 아래 핵심 코드와 함께 실행되지만 직접 수정할 필요는 없습니다."
              : "This fixture and its reusable helpers run with the learner code below; you do not need to edit them."}</p>
            <pre><code>{supportCode}</code></pre>
          </details>
        ) : null}

        {repairLineIndex >= 0 ? (
          <div className="notebook-cell-guided-repair">
            <div>
              <span>{isKo ? "수정 지점" : "Repair focus"}</span>
              <strong>{isKo ? `${repairLineIndex + 1}번 줄만 먼저 고치세요` : `Start with line ${repairLineIndex + 1}`}</strong>
              <p>{codeLines[repairMarkerIndex].replace(/^\s*#\s*/, "")}</p>
            </div>
            <label>
              <span className="sr-only">{isKo ? `${title} 수정할 코드 한 줄` : `One repair line for ${title}`}</span>
              <input
                type="text"
                value={codeLines[repairLineIndex]}
                onChange={(event) => updateRepairLine(event.currentTarget.value)}
                spellCheck={false}
                aria-label={isKo ? `${title} 수정할 코드 한 줄` : `One repair line for ${title}`}
              />
            </label>
          </div>
        ) : null}

        {expanded ? (
          <>
            <p className="notebook-cell-instruction">
              {isKo
                ? supportCode
                  ? "핵심 단계 수정 → 고정 준비 코드와 함께 실행 (Shift+Enter)"
                  : "선택: 전체 코드 수정 → 코드 실행 (Shift+Enter)"
                : supportCode
                  ? "Edit the learner steps → run with fixed setup (Shift+Enter)"
                  : "Optional: edit the full code → Run code (Shift+Enter)"}
            </p>

            <div className="notebook-cell-editor-shell">
              <NotebookCodeEditor
                value={code}
                onChange={setCode}
                onRun={runCode}
                ariaLabel={resolvedAriaLabel}
                minHeight={editorMinHeight}
              />
            </div>
          </>
        ) : null}

        <span className="sr-only" id={statusId} aria-live="polite">
          {statusLabels[status]}
        </span>

        <div
          className="notebook-cell-output"
          id={outputId}
          aria-label={isKo ? `${title} 실행 결과` : `${title} output`}
          aria-live="polite"
          aria-atomic="false"
        >
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

              {error && errorCategory ? (
                <div className="notebook-cell-error-region">
                  <p className="notebook-cell-error-guidance">
                    <strong>{isKo ? "다음 행동" : "Next action"}</strong>{" "}
                    {notebookErrorNextAction(errorCategory, isKo)}
                  </p>
                  <pre className="notebook-cell-error">{error}</pre>
                </div>
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

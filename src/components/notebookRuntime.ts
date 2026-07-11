export type NotebookRunPhase =
  | "loading-runtime"
  | "queued"
  | "loading-packages"
  | "running";

export type NotebookExecutionResult = {
  output: string;
  figures: string[];
  executionCount: number;
  elapsedMs: number;
};

export type NotebookExecutionErrorCode =
  | "execution"
  | "runtime"
  | "stopped"
  | "disposed";

type WorkerReadyMessage = {
  type: "ready";
};

type WorkerStatusMessage = {
  type: "status";
  requestId: string;
  phase: Exclude<NotebookRunPhase, "loading-runtime">;
  executionCount?: number;
};

type WorkerResultMessage = NotebookExecutionResult & {
  type: "result";
  requestId: string;
};

type WorkerErrorMessage = {
  type: "error";
  requestId?: string;
  error: string;
  output?: string;
  figures?: string[];
  executionCount?: number;
};

type NotebookWorkerMessage =
  | WorkerReadyMessage
  | WorkerStatusMessage
  | WorkerResultMessage
  | WorkerErrorMessage;

type PendingRun = {
  resolve: (result: NotebookExecutionResult) => void;
  reject: (error: NotebookExecutionError) => void;
  onPhase?: (phase: NotebookRunPhase) => void;
};

export class NotebookExecutionError extends Error {
  readonly code: NotebookExecutionErrorCode;
  readonly output: string;
  readonly figures: string[];
  readonly executionCount?: number;

  constructor(
    message: string,
    options: {
      code?: NotebookExecutionErrorCode;
      output?: string;
      figures?: string[];
      executionCount?: number;
    } = {},
  ) {
    super(message);
    this.name = "NotebookExecutionError";
    this.code = options.code ?? "execution";
    this.output = options.output ?? "";
    this.figures = options.figures ?? [];
    this.executionCount = options.executionCount;
  }
}

let worker: Worker | null = null;
let readyPromise: Promise<void> | null = null;
let resolveReady: (() => void) | null = null;
let rejectReady: ((error: Error) => void) | null = null;
let requestSequence = 0;
const pendingRuns = new Map<string, PendingRun>();
let activeConsumers = 0;
let idleDisposeTimer: ReturnType<typeof setTimeout> | null = null;

const IDLE_DISPOSE_DELAY_MS = 15_000;

function nextRequestId() {
  requestSequence += 1;
  return `notebook-${Date.now()}-${requestSequence}`;
}

function rejectPendingRuns(error: NotebookExecutionError) {
  for (const pending of pendingRuns.values()) {
    pending.reject(error);
  }
  pendingRuns.clear();
}

function cancelIdleDispose() {
  if (!idleDisposeTimer) return;
  clearTimeout(idleDisposeTimer);
  idleDisposeTimer = null;
}

function terminateRuntime(error: NotebookExecutionError) {
  const activeWorker = worker;
  const rejectInitialization = rejectReady;

  worker = null;
  readyPromise = null;
  resolveReady = null;
  rejectReady = null;
  activeWorker?.terminate();
  rejectInitialization?.(error);
  rejectPendingRuns(error);
}

function scheduleIdleDispose() {
  cancelIdleDispose();
  if (!worker) return;

  idleDisposeTimer = setTimeout(() => {
    idleDisposeTimer = null;
    if (activeConsumers > 0 || !worker) return;

    terminateRuntime(
      new NotebookExecutionError(
        "사용하지 않는 Python 실행기를 정리했습니다. 다시 실행하면 새 커널을 시작합니다.",
        { code: "disposed" },
      ),
    );
  }, IDLE_DISPOSE_DELAY_MS);
}

function handleWorkerFailure(message: string) {
  cancelIdleDispose();
  terminateRuntime(
    new NotebookExecutionError(message, { code: "runtime" }),
  );
}

function handleWorkerMessage(
  source: Worker,
  event: MessageEvent<NotebookWorkerMessage>,
) {
  if (source !== worker) return;
  const message = event.data;

  if (message.type === "ready") {
    resolveReady?.();
    resolveReady = null;
    rejectReady = null;
    return;
  }

  if (message.type === "status") {
    pendingRuns.get(message.requestId)?.onPhase?.(message.phase);
    return;
  }

  if (message.type === "result") {
    const pending = pendingRuns.get(message.requestId);
    if (!pending) return;

    pendingRuns.delete(message.requestId);
    pending.resolve({
      output: message.output,
      figures: message.figures,
      executionCount: message.executionCount,
      elapsedMs: message.elapsedMs,
    });
    return;
  }

  if (message.requestId) {
    const pending = pendingRuns.get(message.requestId);
    if (!pending) return;

    pendingRuns.delete(message.requestId);
    pending.reject(
      new NotebookExecutionError(message.error, {
        code: "execution",
        output: message.output,
        figures: message.figures,
        executionCount: message.executionCount,
      }),
    );
    return;
  }

  handleWorkerFailure(message.error);
}

function createWorker() {
  if (typeof Worker === "undefined") {
    throw new NotebookExecutionError(
      "이 브라우저에서는 Python Web Worker를 사용할 수 없습니다.",
    );
  }

  const nextWorker = new Worker("/pyodide-worker.js");
  nextWorker.addEventListener("message", (event) => {
    handleWorkerMessage(nextWorker, event);
  });
  nextWorker.addEventListener("error", (event) => {
    if (nextWorker !== worker) return;
    handleWorkerFailure(
      event.message || "Python 실행기를 불러오는 중 오류가 발생했습니다.",
    );
  });
  nextWorker.addEventListener("messageerror", () => {
    if (nextWorker !== worker) return;
    handleWorkerFailure("Python 실행 결과를 읽지 못했습니다.");
  });
  worker = nextWorker;
  return nextWorker;
}

async function ensureRuntime(onPhase?: (phase: NotebookRunPhase) => void) {
  cancelIdleDispose();
  if (!readyPromise) {
    onPhase?.("loading-runtime");
    const activeWorker = worker ?? createWorker();
    readyPromise = new Promise<void>((resolve, reject) => {
      resolveReady = resolve;
      rejectReady = reject;
    });
    activeWorker.postMessage({ type: "init" });
  } else if (resolveReady) {
    onPhase?.("loading-runtime");
  }

  await readyPromise;
}

/** Begin loading the shared runtime when the user signals intent to run a cell. */
export function prepareNotebookRuntime() {
  return ensureRuntime();
}

/** Keep the shared kernel alive while at least one notebook cell is mounted. */
export function retainNotebookRuntime() {
  activeConsumers += 1;
  cancelIdleDispose();
  let released = false;

  return () => {
    if (released) return;
    released = true;
    activeConsumers = Math.max(0, activeConsumers - 1);
    if (activeConsumers === 0) scheduleIdleDispose();
  };
}

/**
 * Stop the shared kernel and reject every queued or running request.
 * A later runNotebookCode call lazily creates a clean interpreter.
 */
export function restartNotebookRuntime() {
  cancelIdleDispose();
  terminateRuntime(
    new NotebookExecutionError(
      "공유 Python 실행을 중지했습니다. 다시 실행하면 새 커널을 시작합니다.",
      { code: "stopped" },
    ),
  );
}

/**
 * Run Python in the page-wide notebook runtime.
 *
 * All NotebookCell instances share one lazily-created Worker and Pyodide
 * interpreter. The worker serializes executions, matching a notebook kernel's
 * predictable, stateful execution model without blocking the main thread.
 */
export async function runNotebookCode(
  code: string,
  onPhase?: (phase: NotebookRunPhase) => void,
): Promise<NotebookExecutionResult> {
  await ensureRuntime(onPhase);

  const activeWorker = worker;
  if (!activeWorker) {
    throw new NotebookExecutionError("Python 실행기를 시작하지 못했습니다.");
  }

  const requestId = nextRequestId();
  return new Promise<NotebookExecutionResult>((resolve, reject) => {
    pendingRuns.set(requestId, { resolve, reject, onPhase });
    try {
      activeWorker.postMessage({ type: "run", requestId, code });
    } catch (caughtError) {
      pendingRuns.delete(requestId);
      reject(
        new NotebookExecutionError(
          caughtError instanceof Error
            ? caughtError.message
            : "Python 실행 요청을 보내지 못했습니다.",
          { code: "runtime" },
        ),
      );
    }
  });
}

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    cancelIdleDispose();
    terminateRuntime(
      new NotebookExecutionError("개발 서버 갱신으로 Python 실행기를 다시 시작합니다.", {
        code: "disposed",
      }),
    );
  });
}

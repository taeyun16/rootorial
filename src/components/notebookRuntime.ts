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
  readonly output: string;
  readonly figures: string[];
  readonly executionCount?: number;

  constructor(
    message: string,
    options: {
      output?: string;
      figures?: string[];
      executionCount?: number;
    } = {},
  ) {
    super(message);
    this.name = "NotebookExecutionError";
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

function discardWorker() {
  worker?.terminate();
  worker = null;
  readyPromise = null;
  resolveReady = null;
  rejectReady = null;
}

function handleWorkerFailure(message: string) {
  const error = new NotebookExecutionError(message);
  rejectReady?.(error);
  rejectPendingRuns(error);
  discardWorker();
}

function handleWorkerMessage(event: MessageEvent<NotebookWorkerMessage>) {
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
  nextWorker.addEventListener("message", handleWorkerMessage);
  nextWorker.addEventListener("error", (event) => {
    handleWorkerFailure(
      event.message || "Python 실행기를 불러오는 중 오류가 발생했습니다.",
    );
  });
  nextWorker.addEventListener("messageerror", () => {
    handleWorkerFailure("Python 실행 결과를 읽지 못했습니다.");
  });
  worker = nextWorker;
  return nextWorker;
}

async function ensureRuntime(onPhase?: (phase: NotebookRunPhase) => void) {
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
    activeWorker.postMessage({ type: "run", requestId, code });
  });
}

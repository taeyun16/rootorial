const PYODIDE_VERSION = "0.27.7";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReady;
let runQueue = Promise.resolve();
let executionCount = 0;

async function initialize() {
  if (!pyodideReady) {
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    pyodideReady = self.loadPyodide({ indexURL: PYODIDE_BASE }).then(async (pyodide) => {
      await pyodide.runPythonAsync(`
import os as __rezero_os
import warnings as __rezero_warnings
__rezero_os.environ.setdefault("MPLBACKEND", "Agg")
__rezero_warnings.filterwarnings(
    "ignore",
    message="FigureCanvasAgg is non-interactive.*",
)
del __rezero_os, __rezero_warnings
`);
      return pyodide;
    });
  }
  return pyodideReady;
}

function postRunMessage(message, requestId) {
  self.postMessage(requestId ? { ...message, requestId } : message);
}

async function clearFigures(pyodide) {
  await pyodide.runPythonAsync(`
import sys as __rezero_sys
if "matplotlib.pyplot" in __rezero_sys.modules:
    __rezero_sys.modules["matplotlib.pyplot"].close("all")
del __rezero_sys
`);
}

async function collectFigures(pyodide) {
  let figureProxy;

  try {
    figureProxy = await pyodide.runPythonAsync(`
def __rezero_capture_figures():
    import sys
    import io
    import base64

    pyplot = sys.modules.get("matplotlib.pyplot")
    images = []
    if pyplot is None:
        return images

    try:
        for figure_number in pyplot.get_fignums():
            figure = pyplot.figure(figure_number)
            buffer = io.BytesIO()
            try:
                figure.savefig(
                    buffer,
                    format="png",
                    dpi=130,
                    bbox_inches="tight",
                    facecolor=figure.get_facecolor(),
                )
                encoded = base64.b64encode(buffer.getvalue()).decode("ascii")
                images.append("data:image/png;base64," + encoded)
            finally:
                buffer.close()
        return images
    finally:
        pyplot.close("all")

try:
    __rezero_capture_result = __rezero_capture_figures()
finally:
    del __rezero_capture_figures
__rezero_capture_result
`);
    const figures = figureProxy.toJs({ create_pyproxies: false });
    return Array.from(figures, (figure) => String(figure));
  } finally {
    figureProxy?.destroy?.();
    try {
      await pyodide.runPythonAsync(
        `globals().pop("__rezero_capture_result", None)`,
      );
    } catch {
      // Do not mask the original execution or figure-capture error.
    }
  }
}

const discardOutput = () => {};

function resetOutputHandlers(pyodide) {
  try {
    pyodide.setStdout({ batched: discardOutput });
    pyodide.setStderr({ batched: discardOutput });
  } catch {
    // The worker may be terminating after a fatal interpreter error.
  }
}

async function executeRun({ code, requestId }) {
  const startedAt = performance.now();
  const currentExecution = ++executionCount;
  const lines = [];
  const appendOutput = (message) => {
    if (message === "Matplotlib is building the font cache; this may take a moment.") {
      return;
    }
    lines.push(message);
  };
  let pyodide;
  let result;

  try {
    pyodide = await initialize();
    postRunMessage(
      { type: "status", phase: "loading-packages", executionCount: currentExecution },
      requestId,
    );
    await pyodide.loadPackagesFromImports(code);
    await clearFigures(pyodide);

    pyodide.setStdout({ batched: appendOutput });
    pyodide.setStderr({ batched: appendOutput });
    postRunMessage(
      { type: "status", phase: "running", executionCount: currentExecution },
      requestId,
    );

    result = await pyodide.runPythonAsync(code);
    if (result !== undefined && result !== null && String(result) !== "None") {
      lines.push(String(result));
    }

    const figures = await collectFigures(pyodide);
    postRunMessage(
      {
        type: "result",
        output: lines.join("\n"),
        figures,
        executionCount: currentExecution,
        elapsedMs: Math.round(performance.now() - startedAt),
      },
      requestId,
    );
  } catch (error) {
    let figures = [];
    if (pyodide) {
      try {
        figures = await collectFigures(pyodide);
      } catch {
        // Preserve the original Python error if figure collection also fails.
      }
    }

    postRunMessage(
      {
        type: "error",
        error: String(error),
        output: lines.join("\n"),
        figures,
        executionCount: currentExecution,
      },
      requestId,
    );
  } finally {
    result?.destroy?.();
    if (pyodide) resetOutputHandlers(pyodide);
  }
}

self.onmessage = async (event) => {
  if (event.data.type === "init") {
    try {
      await initialize();
      self.postMessage({ type: "ready" });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
    return;
  }

  if (event.data.type === "run") {
    const request = {
      code: String(event.data.code ?? ""),
      requestId: event.data.requestId,
    };
    postRunMessage({ type: "status", phase: "queued" }, request.requestId);
    runQueue = runQueue.then(
      () => executeRun(request),
      () => executeRun(request),
    );
  }
};

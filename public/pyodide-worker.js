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
  const figureProxy = await pyodide.runPythonAsync(`
import sys as __rezero_sys
__rezero_figure_images = []
if "matplotlib.pyplot" in __rezero_sys.modules:
    import io as __rezero_io
    import base64 as __rezero_base64
    __rezero_plt = __rezero_sys.modules["matplotlib.pyplot"]
    for __rezero_figure_number in __rezero_plt.get_fignums():
        __rezero_figure = __rezero_plt.figure(__rezero_figure_number)
        __rezero_buffer = __rezero_io.BytesIO()
        __rezero_figure.savefig(
            __rezero_buffer,
            format="png",
            dpi=130,
            bbox_inches="tight",
            facecolor=__rezero_figure.get_facecolor(),
        )
        __rezero_encoded = __rezero_base64.b64encode(
            __rezero_buffer.getvalue()
        ).decode("ascii")
        __rezero_figure_images.append("data:image/png;base64," + __rezero_encoded)
        __rezero_buffer.close()
    __rezero_plt.close("all")
__rezero_figure_images
`);

  try {
    const figures = figureProxy.toJs({ create_proxies: false });
    return Array.from(figures, (figure) => String(figure));
  } finally {
    figureProxy.destroy?.();
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

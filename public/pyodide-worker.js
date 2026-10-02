const PYODIDE_VERSION = "0.27.7";
const LOCAL_ASSET_HELP = "Local Python assets are unavailable. Run npm run python:prepare -- --download on an authorized network, or use --from DIRECTORY, then reload the page.";

let pyodideReady;
let runQueue = Promise.resolve();
let executionCount = 0;

async function initialize() {
  if (!pyodideReady) {
    pyodideReady = (async () => {
      let manifest;
      try {
        const response = await fetch(new URL("python-runtime/manifest.json", self.location.href), { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        manifest = await response.json();
        if (manifest.version !== PYODIDE_VERSION ||
            !new RegExp(`^/python-runtime/v${PYODIDE_VERSION.replaceAll(".", "\\.")}-[a-f0-9]{16}/$`).test(manifest.baseURL)) {
          throw new Error("Runtime version or asset path mismatch");
        }
        const baseURL = new URL(manifest.baseURL, self.location.origin).href;
        importScripts(`${baseURL}pyodide.js`);
        const pyodide = await self.loadPyodide({ indexURL: baseURL, lockFileURL: `${baseURL}pyodide-lock.json`, stdLibURL: `${baseURL}python_stdlib.zip` });
        if (pyodide.version !== PYODIDE_VERSION) throw new Error("Runtime version mismatch");
        await pyodide.runPythonAsync(`
import os as __rootorial_os
import warnings as __rootorial_warnings
__rootorial_os.environ.setdefault("MPLBACKEND", "Agg")
__rootorial_warnings.filterwarnings(
    "ignore",
    message="FigureCanvasAgg is non-interactive.*",
)
del __rootorial_os, __rootorial_warnings
`);
        return pyodide;
      } catch (error) {
        throw new Error(`${LOCAL_ASSET_HELP}\n${String(error)}`);
      }
    })();
  }
  return pyodideReady;
}

function postRunMessage(message, requestId) {
  self.postMessage(requestId ? { ...message, requestId } : message);
}

async function clearFigures(pyodide) {
  await pyodide.runPythonAsync(`
import sys as __rootorial_sys
if "matplotlib.pyplot" in __rootorial_sys.modules:
    __rootorial_sys.modules["matplotlib.pyplot"].close("all")
del __rootorial_sys
`);
}

async function collectFigures(pyodide) {
  let figureProxy;

  try {
    figureProxy = await pyodide.runPythonAsync(`
def __rootorial_capture_figures():
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
    __rootorial_capture_result = __rootorial_capture_figures()
finally:
    del __rootorial_capture_figures
__rootorial_capture_result
`);
    const figures = figureProxy.toJs({ create_pyproxies: false });
    return Array.from(figures, (figure) => String(figure));
  } finally {
    figureProxy?.destroy?.();
    try {
      await pyodide.runPythonAsync(
        `globals().pop("__rootorial_capture_result", None)`,
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
    const packageErrors = [];
    await pyodide.loadPackagesFromImports(code, { errorCallback: (message) => packageErrors.push(message) });
    if (packageErrors.length > 0) {
      const error = new Error(`Python package assets are unavailable locally. Prepared lesson libraries: NumPy and Matplotlib. Reprepare the assets if one of these is missing.\n${packageErrors.join("\n")}`);
      error.runtimeAssetError = true;
      throw error;
    }
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
        code: !pyodide || error.runtimeAssetError ? "runtime" : "execution",
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

const PYODIDE_VERSION = "0.27.7";
const PYODIDE_BASE = `https://cdn.jsdelivr.net/pyodide/v${PYODIDE_VERSION}/full/`;

let pyodideReady;

async function initialize() {
  if (!pyodideReady) {
    importScripts(`${PYODIDE_BASE}pyodide.js`);
    pyodideReady = self.loadPyodide({ indexURL: PYODIDE_BASE }).then(async (pyodide) => {
      await pyodide.loadPackage("numpy");
      return pyodide;
    });
  }
  return pyodideReady;
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
    try {
      const pyodide = await initialize();
      const lines = [];
      pyodide.setStdout({ batched: (message) => lines.push(message) });
      pyodide.setStderr({ batched: (message) => lines.push(message) });
      const result = await pyodide.runPythonAsync(event.data.code);
      if (result !== undefined && result !== null && String(result) !== "None") {
        lines.push(String(result));
      }
      result?.destroy?.();
      self.postMessage({ type: "result", output: lines.join("\n") });
    } catch (error) {
      self.postMessage({ type: "error", error: String(error) });
    }
  }
};

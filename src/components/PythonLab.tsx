import { useEffect, useRef, useState } from "react";
import { PythonCode } from "./PythonCode";
import { PythonCodeEditor } from "./PythonCodeEditor";

type WorkerMessage =
  | { type: "ready" }
  | { type: "result"; output: string }
  | { type: "error"; error: string };

export function PythonLab({ initialCode }: { initialCode: string }) {
  const [code, setCode] = useState(initialCode);
  const [output, setOutput] = useState("실행하면 결과가 여기에 표시됩니다.");
  const [status, setStatus] = useState<"idle" | "loading" | "running" | "done" | "error">("idle");
  const workerRef = useRef<Worker | null>(null);

  useEffect(() => () => workerRef.current?.terminate(), []);

  function ensureWorker() {
    if (workerRef.current) return workerRef.current;
    const worker = new Worker("/pyodide-worker.js");
    worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      if (event.data.type === "ready") {
        setStatus("running");
        worker.postMessage({ type: "run", code });
      } else if (event.data.type === "result") {
        setOutput(event.data.output || "실행을 마쳤습니다. 반환값은 없습니다.");
        setStatus("done");
      } else if (event.data.type === "error") {
        setOutput(event.data.error);
        setStatus("error");
      }
    };
    worker.onerror = (event) => {
      setOutput(event.message || "Python 실행기를 불러오지 못했습니다.");
      setStatus("error");
    };
    workerRef.current = worker;
    return worker;
  }

  function runCode() {
    const worker = ensureWorker();
    setOutput("Python과 NumPy를 준비하고 있습니다…");
    if (status === "idle" || status === "error") {
      setStatus("loading");
      worker.postMessage({ type: "init" });
    } else {
      setStatus("running");
      worker.postMessage({ type: "run", code });
    }
  }

  function resetLab() {
    workerRef.current?.terminate();
    workerRef.current = null;
    setCode(initialCode);
    setOutput("실행하면 결과가 여기에 표시됩니다.");
    setStatus("idle");
  }

  const busy = status === "loading" || status === "running";

  return (
    <div className="python-lab">
      <div className="lab-toolbar">
        <div className="lab-file"><span className="python-mark">Py</span> vector_lab.py</div>
        <div className="lab-actions">
          <button type="button" className="lab-reset" onClick={resetLab}>초기화</button>
          <button type="button" className="lab-run" onClick={runCode} disabled={busy}>
            <span aria-hidden="true">{busy ? "◌" : "▶"}</span>
            {status === "loading" ? "준비 중" : status === "running" ? "실행 중" : "실행"}
          </button>
        </div>
      </div>
      <div className="lab-body">
        <div className="code-editor-shell">
          <PythonCodeEditor
            value={code}
            onChange={setCode}
            ariaLabel="실행할 Python 코드"
          />
        </div>
        <div className="lab-output" aria-live="polite">
          <div className="output-heading">
            <span>OUTPUT</span>
            <span className={`output-status output-status-${status}`}>{status === "done" ? "완료" : status === "error" ? "오류" : busy ? "실행 중" : "대기"}</span>
          </div>
          <pre>{output}</pre>
        </div>
      </div>
      <div className="lab-hint">
        <span>실험 제안</span>
        <p>
          <PythonCode>w</PythonCode>를 <PythonCode>[2.0, -3.0]</PythonCode>
          {"으로 바꾸고 내적과 코사인 유사도가 어떻게 달라지는지 확인해 보세요."}
        </p>
      </div>
    </div>
  );
}

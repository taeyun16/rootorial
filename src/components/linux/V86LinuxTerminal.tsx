import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent } from "react";
import type { V86 } from "v86";
import type { Locale } from "../../data/curriculum";
import { linuxExperimentAssetUrl } from "../../features/linux-runtime/linux-assets";

const V86_WASM_URL = linuxExperimentAssetUrl("v86.wasm");
const V86_FALLBACK_WASM_URL = linuxExperimentAssetUrl("v86-fallback.wasm");
const V86_BIOS_URL = linuxExperimentAssetUrl("seabios.bin");
const V86_VGA_BIOS_URL = linuxExperimentAssetUrl("vgabios.bin");
const BUILDROOT_IMAGE_URL = linuxExperimentAssetUrl("buildroot-bzimage68.bin");
const MAX_TERMINAL_CHARACTERS = 60_000;
const BOOT_TIMEOUT_MS = 90_000;

type BrowserRuntimeGlobal = {
  setImmediate?: (callback: (...arguments_: unknown[]) => void, ...arguments_: unknown[]) => number;
};

type EmulatorStatus = "idle" | "loading" | "booting" | "ready" | "stopping" | "stopped" | "error";

type DownloadProgress = {
  fileName: string;
  loaded: number;
  total: number;
};

const copy = {
  ko: {
    title: "실제 Linux 커널 부팅",
    summary: "v86가 32비트 x86 PC를 WebAssembly로 에뮬레이션하고, 최소 Buildroot 커널을 직렬 콘솔로 부팅합니다.",
    idle: "시작 전",
    loading: "런타임 내려받는 중",
    booting: "커널 부팅 중",
    ready: "셸 준비 완료",
    stopping: "중지 중",
    stopped: "중지됨",
    error: "시작 실패",
    start: "Linux 부팅 시작",
    startAgain: "Linux 다시 시작",
    restart: "다시 부팅",
    stop: "중지",
    cancel: "부팅 취소",
    commandLabel: "실제 Linux 명령",
    commandPlaceholder: "uname -a",
    run: "실행",
    tryCommands: "부팅 후 확인할 명령",
    bootHint: "처음 실행할 때 외부 v86 데모 부팅 자산 약 14MB를 내려받습니다. 브라우저와 네트워크에 따라 수 초가 걸릴 수 있습니다.",
    networkHint: "게스트 이미지의 기본 배너에 네트워크·파일 전송 안내가 보일 수 있습니다. emulated NIC는 존재하지만 network relay/backend를 설정하지 않아 외부 경로는 없으므로 해당 안내는 적용되지 않습니다.",
    errorHint: "외부 자산을 내려받지 못했습니다. 네트워크 상태를 확인한 뒤 다시 시도하세요.",
    timeoutError: "90초 안에 Linux 셸이 준비되지 않아 부팅을 중단했습니다.",
    elapsed: "부팅 시간",
    downloaded: "다운로드",
    terminal: "v86 Linux 직렬 콘솔 출력",
    source: "v86 공식 소스",
    unsupported: "이 브라우저는 WebAssembly를 지원하지 않아 선택형 실제 커널 실험을 시작할 수 없습니다.",
    fallback: "네트워크가 필요 없는 결정론적 대체 활동으로 돌아가기",
  },
  en: {
    title: "Boot a real Linux kernel",
    summary: "v86 emulates a 32-bit x86 PC with WebAssembly and boots a minimal Buildroot kernel into a serial console.",
    idle: "Not started",
    loading: "Downloading runtime",
    booting: "Booting kernel",
    ready: "Shell ready",
    stopping: "Stopping",
    stopped: "Stopped",
    error: "Boot failed",
    start: "Start Linux boot",
    startAgain: "Start Linux again",
    restart: "Reboot",
    stop: "Stop",
    cancel: "Cancel boot",
    commandLabel: "Real Linux command",
    commandPlaceholder: "uname -a",
    run: "Run",
    tryCommands: "Commands to try after boot",
    bootHint: "The first run downloads about 14 MB of external v86 demo boot assets. It can take a few seconds depending on the browser and network.",
    networkHint: "The stock guest banner may mention networking and file transfer. An emulated NIC exists, but no network relay or backend is configured, so there is no external path and those instructions do not apply here.",
    errorHint: "The external assets could not be downloaded. Check the network and try again.",
    timeoutError: "Linux did not reach the shell within 90 seconds, so the boot was stopped.",
    elapsed: "Boot time",
    downloaded: "Downloaded",
    terminal: "v86 Linux serial console output",
    source: "Official v86 source",
    unsupported: "This browser does not support WebAssembly, so the optional real-kernel experiment cannot start.",
    fallback: "Return to the deterministic, network-free fallback activity",
  },
} as const;

const suggestedCommands = [
  "uname -a",
  "cat /proc/cpuinfo | head",
  "mount",
  "ps",
  "ls -la --color=never /",
] as const;

function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function stripAnsi(value: string) {
  return value.replace(/\u001B\[[0-?]*[ -/]*[@-~]/g, "");
}

async function fetchBootAsset(
  url: string,
  signal: AbortSignal,
  onProgress: (progress: DownloadProgress) => void,
) {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url} returned ${response.status}`);

  const fileName = url.split("/").pop() ?? url;
  const total = Number(response.headers.get("content-length")) || 0;
  if (!response.body) {
    const buffer = await response.arrayBuffer();
    onProgress({ fileName, loaded: buffer.byteLength, total });
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    onProgress({ fileName, loaded, total });
  }

  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes.buffer;
}

export function V86LinuxTerminal({
  locale,
  fallbackHref = "#shell-lab",
}: {
  locale: Locale;
  fallbackHref?: string;
}) {
  const c = copy[locale];
  const emulatorRef = useRef<V86 | null>(null);
  const outputRef = useRef("");
  const frameRef = useRef<number | null>(null);
  const bootStartedAtRef = useRef(0);
  const bootGenerationRef = useRef(0);
  const downloadControllerRef = useRef<AbortController | null>(null);
  const bootWatchdogRef = useRef<number | null>(null);
  const readyDetectedRef = useRef(false);
  const terminalRef = useRef<HTMLPreElement>(null);
  const [status, setStatus] = useState<EmulatorStatus>("idle");
  const [output, setOutput] = useState("");
  const [command, setCommand] = useState("");
  const [download, setDownload] = useState<DownloadProgress | null>(null);
  const [bootElapsedMs, setBootElapsedMs] = useState<number | null>(null);
  const [errorMessage, setErrorMessage] = useState("");
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);

  useEffect(() => {
    setWasmSupported(typeof WebAssembly !== "undefined");
  }, []);

  const flushOutput = useCallback(() => {
    frameRef.current = null;
    setOutput(outputRef.current);
  }, []);

  const appendOutput = useCallback((chunk: string) => {
    outputRef.current = `${outputRef.current}${chunk}`.slice(-MAX_TERMINAL_CHARACTERS);
    if (frameRef.current === null) frameRef.current = requestAnimationFrame(flushOutput);
  }, [flushOutput]);

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [output]);

  useEffect(() => () => {
    bootGenerationRef.current += 1;
    if (bootWatchdogRef.current !== null) window.clearTimeout(bootWatchdogRef.current);
    bootWatchdogRef.current = null;
    downloadControllerRef.current?.abort();
    downloadControllerRef.current = null;
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    const emulator = emulatorRef.current;
    emulatorRef.current = null;
    if (emulator) void emulator.destroy().catch(() => undefined);
  }, []);

  const destroyExistingEmulator = useCallback(async () => {
    const emulator = emulatorRef.current;
    emulatorRef.current = null;
    if (emulator) await emulator.destroy().catch(() => undefined);
  }, []);

  const clearBootWatchdog = useCallback(() => {
    if (bootWatchdogRef.current !== null) window.clearTimeout(bootWatchdogRef.current);
    bootWatchdogRef.current = null;
  }, []);

  const boot = useCallback(async () => {
    const bootGeneration = bootGenerationRef.current + 1;
    bootGenerationRef.current = bootGeneration;
    downloadControllerRef.current?.abort();
    const downloadController = new AbortController();
    downloadControllerRef.current = downloadController;
    clearBootWatchdog();
    bootWatchdogRef.current = window.setTimeout(() => {
      if (bootGenerationRef.current !== bootGeneration) return;
      bootGenerationRef.current += 1;
      downloadController.abort();
      if (downloadControllerRef.current === downloadController) downloadControllerRef.current = null;
      const emulator = emulatorRef.current;
      emulatorRef.current = null;
      if (emulator) void emulator.destroy().catch(() => undefined);
      setDownload(null);
      setErrorMessage(c.timeoutError);
      setStatus("error");
      bootWatchdogRef.current = null;
    }, BOOT_TIMEOUT_MS);
    setStatus("loading");
    readyDetectedRef.current = false;
    await destroyExistingEmulator();
    if (bootGenerationRef.current !== bootGeneration) return;

    outputRef.current = "[rootorial] loading v86 and the Buildroot kernel…\n";
    setOutput(outputRef.current);
    setDownload(null);
    setBootElapsedMs(null);
    setErrorMessage("");
    bootStartedAtRef.current = performance.now();

    try {
      // TanStack's browser bundle exposes a lightweight `process` shim, which
      // makes v86 choose its Node scheduler. Provide the scheduler primitive
      // that branch expects before loading the emulator module.
      const runtimeGlobal = globalThis as unknown as BrowserRuntimeGlobal;
      if (typeof runtimeGlobal.setImmediate !== "function") {
        runtimeGlobal.setImmediate = (callback: (...arguments_: unknown[]) => void, ...arguments_: unknown[]) => (
          window.setTimeout(() => callback(...arguments_), 0)
        );
      }
      const modulePromise = import("v86");
      const reportProgress = (progress: DownloadProgress) => {
        if (bootGenerationRef.current === bootGeneration) setDownload(progress);
      };
      const [wasm, fallbackWasm, bios, vgaBios, bzimage] = await Promise.all([
        fetchBootAsset(V86_WASM_URL, downloadController.signal, reportProgress),
        fetchBootAsset(V86_FALLBACK_WASM_URL, downloadController.signal, reportProgress),
        fetchBootAsset(V86_BIOS_URL, downloadController.signal, reportProgress),
        fetchBootAsset(V86_VGA_BIOS_URL, downloadController.signal, reportProgress),
        fetchBootAsset(BUILDROOT_IMAGE_URL, downloadController.signal, reportProgress),
      ]);
      const [primaryWasmModule, fallbackWasmModule] = await Promise.all([
        WebAssembly.compile(wasm).catch(() => null),
        WebAssembly.compile(fallbackWasm),
      ]);
      const { V86: V86Constructor } = await modulePromise;
      if (bootGenerationRef.current !== bootGeneration) return;
      if (downloadControllerRef.current === downloadController) downloadControllerRef.current = null;
      setDownload(null);
      setStatus("booting");

      const emulator = new V86Constructor({
        wasm_fn: async (imports) => {
          if (primaryWasmModule) {
            try {
              return (await WebAssembly.instantiate(primaryWasmModule, imports)).exports;
            } catch {
              // Older browsers may require v86's compatibility build.
            }
          }
          return (await WebAssembly.instantiate(fallbackWasmModule, imports)).exports;
        },
        memory_size: 64 * 1024 * 1024,
        vga_memory_size: 2 * 1024 * 1024,
        bios: { buffer: bios },
        vga_bios: { buffer: vgaBios },
        bzimage: { buffer: bzimage },
        filesystem: {},
        net_device: { type: "ne2k" },
        cmdline: "tsc=reliable mitigations=off random.trust_cpu=on console=ttyS0",
        autostart: false,
        disable_keyboard: true,
        disable_mouse: true,
        disable_speaker: true,
      });
      emulatorRef.current = emulator;
      const isCurrentEmulator = () => (
        bootGenerationRef.current === bootGeneration && emulatorRef.current === emulator
      );

      emulator.add_listener("emulator-loaded", () => {
        if (!isCurrentEmulator()) {
          void emulator.destroy().catch(() => undefined);
          return;
        }
        void emulator.run().catch((error: unknown) => {
          if (!isCurrentEmulator()) return;
          clearBootWatchdog();
          setErrorMessage(error instanceof Error ? error.message : String(error));
          setStatus("error");
        });
      });
      emulator.add_listener("serial0-output-byte", (byte) => {
        if (!isCurrentEmulator()) return;
        const character = String.fromCharCode(byte);
        if (character === "\r") return;
        appendOutput(character);
        if (!readyDetectedRef.current && outputRef.current.endsWith("~% ")) {
          readyDetectedRef.current = true;
          clearBootWatchdog();
          setBootElapsedMs(performance.now() - bootStartedAtRef.current);
          setStatus("ready");
          setDownload(null);
        }
      });
    } catch (error) {
      if (bootGenerationRef.current !== bootGeneration) return;
      clearBootWatchdog();
      downloadController.abort();
      if (downloadControllerRef.current === downloadController) downloadControllerRef.current = null;
      setErrorMessage(error instanceof Error ? error.message : String(error));
      setStatus("error");
    }
  }, [appendOutput, c.timeoutError, clearBootWatchdog, destroyExistingEmulator]);

  const sendCommand = useCallback((source: string) => {
    const line = source.trim();
    const emulator = emulatorRef.current;
    if (!line || !emulator || status !== "ready") return;
    emulator.serial0_send(`${line}\n`);
    setCommand("");
  }, [status]);

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    sendCommand(command);
  };

  const restart = useCallback(() => {
    // A hard CPU reset can leave this minimal Buildroot image in a #GP panic
    // on some v86 builds. Recreate the machine instead; browser caching keeps
    // the second boot fast while guaranteeing a clean BIOS-to-kernel path.
    void boot();
  }, [boot]);

  const cancelBoot = useCallback(() => {
    if (status !== "loading" && status !== "booting") return;
    bootGenerationRef.current += 1;
    clearBootWatchdog();
    downloadControllerRef.current?.abort();
    downloadControllerRef.current = null;
    const emulator = emulatorRef.current;
    emulatorRef.current = null;
    if (emulator) void emulator.destroy().catch(() => undefined);
    outputRef.current = "[rootorial] boot cancelled.\n";
    setOutput(outputRef.current);
    setDownload(null);
    setErrorMessage("");
    setStatus("stopped");
  }, [clearBootWatchdog, status]);

  const stop = useCallback(async () => {
    const emulator = emulatorRef.current;
    if (!emulator) return;
    clearBootWatchdog();
    const stopGeneration = bootGenerationRef.current + 1;
    bootGenerationRef.current = stopGeneration;
    setStatus("stopping");
    try {
      await emulator.stop();
      if (bootGenerationRef.current === stopGeneration && emulatorRef.current === emulator) {
        setStatus("stopped");
      }
    } catch (error) {
      if (bootGenerationRef.current === stopGeneration) {
        setErrorMessage(error instanceof Error ? error.message : String(error));
        setStatus("error");
      }
    }
  }, [clearBootWatchdog]);

  const statusLabel = c[status];
  const progressLabel = useMemo(() => {
    if (!download) return null;
    const loaded = formatBytes(download.loaded);
    return download.total > 0
      ? `${download.fileName} · ${loaded} / ${formatBytes(download.total)}`
      : `${download.fileName} · ${loaded}`;
  }, [download]);
  const visibleOutput = useMemo(() => stripAnsi(output), [output]);
  const canStart = wasmSupported !== false && (status === "idle" || status === "stopped" || status === "error");

  return (
    <section className="linux-runtime-card linux-runtime-card-v86" aria-labelledby="v86-linux-title">
      <div className="linux-runtime-heading">
        <div>
          <p className="section-index">V86 · X86 → WASM JIT</p>
          <h2 id="v86-linux-title">{c.title}</h2>
          <p>{c.summary}</p>
        </div>
        <span className={`linux-runtime-state is-${status}`} role="status">
          <span aria-hidden="true" /> {statusLabel}
        </span>
      </div>

      {visibleOutput ? (
        <pre className="v86-terminal-output" ref={terminalRef} aria-label={c.terminal}>{visibleOutput}</pre>
      ) : (
        <div className="v86-terminal-placeholder">
          <span aria-hidden="true">$</span>
          <p>{c.bootHint}</p>
        </div>
      )}

      {progressLabel ? (
        <div className="v86-download" aria-hidden="true">
          <span>{c.downloaded}</span>
          <strong>{progressLabel}</strong>
          {download && download.total > 0 ? (
            <progress value={download.loaded} max={download.total}>{progressLabel}</progress>
          ) : null}
        </div>
      ) : null}

      {status === "error" ? (
        <div className="linux-runtime-error" role="alert">
          <strong>{c.errorHint}</strong>
          {errorMessage ? <code>{errorMessage}</code> : null}
        </div>
      ) : null}

      {wasmSupported === false ? (
        <div className="linux-runtime-error linux-runtime-fallback" role="alert">
          <strong>{c.unsupported}</strong>
          <a href={fallbackHref}>{c.fallback} →</a>
        </div>
      ) : null}

      <div className="v86-controls">
        {status === "loading" || status === "booting" ? (
          <button className="button linux-button-quiet" type="button" onClick={cancelBoot}>{c.cancel}</button>
        ) : emulatorRef.current && status === "ready" ? (
          <>
            <button className="button linux-button-secondary" type="button" onClick={restart}>{c.restart}</button>
            <button className="button linux-button-quiet" type="button" onClick={() => void stop()}>{c.stop}</button>
          </>
        ) : (
          <button className="button button-primary" type="button" onClick={() => void boot()} disabled={!canStart}>
            {status === "idle" ? c.start : c.startAgain} <span aria-hidden="true">→</span>
          </button>
        )}
        {bootElapsedMs !== null ? <span className="v86-boot-time">{c.elapsed}: {(bootElapsedMs / 1000).toFixed(1)}s</span> : null}
      </div>

      <form className="v86-command-form" onSubmit={submitCommand}>
        <label htmlFor="v86-command">{c.commandLabel}</label>
        <div>
          <span aria-hidden="true">~%</span>
          <input
            id="v86-command"
            value={command}
            onChange={(event) => setCommand(event.target.value)}
            placeholder={c.commandPlaceholder}
            disabled={status !== "ready"}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" disabled={status !== "ready" || !command.trim()}>{c.run}</button>
        </div>
      </form>

      <div className="v86-suggestions">
        <span>{c.tryCommands}</span>
        <div>
          {suggestedCommands.map((suggestion) => (
            <button type="button" key={suggestion} onClick={() => sendCommand(suggestion)} disabled={status !== "ready"}>
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      <div className="linux-runtime-notes">
        <p>{c.networkHint}</p>
        <a href="https://github.com/copy/v86" target="_blank" rel="noreferrer">{c.source} ↗</a>
      </div>
    </section>
  );
}

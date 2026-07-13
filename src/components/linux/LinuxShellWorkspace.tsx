import { useEffect, useMemo, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  createLinuxShellState,
  runLinuxCommand,
  snapshotFilesystem,
  type LinuxShellState,
} from "../../features/linux-shell/linuxShell";
import {
  emptyLinuxShellObservations,
  linuxShellTaskState,
  recordLinuxShellObservations,
} from "../../features/linux-shell/linuxShellMastery";

type TranscriptEntry = {
  id: number;
  cwd: string;
  command: string;
  output: string;
  exitCode: number;
};

type LinuxShellWorkspaceProps = {
  id?: string;
  variant?: "experiment" | "chapter";
  onCompletionChange?: (complete: boolean) => void;
};

const copy = {
  ko: {
    simulatorEyebrow: "GUIDED SHELL · DETERMINISTIC MODEL",
    simulatorTitle: "경로가 움직이는 규칙부터 익히기",
    chapterTitle: "직접 명령해 첫 작업공간 만들기",
    simulatorSummary: "이 터미널은 실제 커널이 아니라 수업을 위해 만든 인메모리 모델입니다. 명령 결과는 Linux와 닮았지만, 현재 디렉터리와 파일 트리가 어떻게 변하는지 즉시 나란히 볼 수 있습니다.",
    chapterSummary: "명령의 출력과 종료 상태, 그리고 실제로 바뀐 파일 트리를 함께 확인합니다. 마지막에는 보호된 시스템 파일에 쓰기를 시도해 오류도 중요한 관찰 결과라는 사실을 확인합니다.",
    simulatorBadge: "교육용 시뮬레이터 · 실제 Linux 아님",
    reset: "처음 상태로",
    promptLabel: "교육용 Linux 명령 입력",
    run: "실행",
    placeholder: "명령을 입력하세요",
    welcome: "Rootorial 셸 시뮬레이터\n지원되는 학습 명령은 `help`로 확인하세요.",
    commandCompleted: "명령 완료",
    commandFailed: "명령 실패",
    examples: "명령 예시",
    tasks: "첫 번째 실습",
    chapterTasks: "필수 실습",
    taskSummary: "경로를 확인하고, 설정 파일을 읽고, 내 디렉터리와 메모를 만드세요.",
    chapterTaskSummary: "다섯 관찰을 모두 마치면 이 챕터의 실습 조건을 통과합니다. 명령 버튼은 입력만 채우므로 직접 실행해야 합니다.",
    taskItems: [
      ["현재 위치 확인", "pwd"],
      ["배포판 정보 읽기", "cat /etc/os-release"],
      ["실습 디렉터리 만들기", "mkdir -p /home/student/lab"],
      ["경로 규칙 기록하기", "echo \"absolute paths start at /\" > /home/student/lab/notes.txt"],
    ],
    chapterTaskItems: [
      ["현재 위치 확인", "pwd"],
      ["배포판 정보 읽기", "cat /etc/os-release"],
      ["상대 경로로 실습 디렉터리 만들기", "mkdir -p lab"],
      ["상대 경로에 규칙 기록하기", "echo \"absolute paths start at /\" > lab/notes.txt"],
    ],
    permissionTask: ["보호된 파일의 권한 오류 관찰", "echo \"change\" > /etc/os-release"],
    completed: "완료",
    taskProgress: "개 과제 완료",
    filesystem: "가상 파일시스템",
    filesystemSummary: "명령을 실행할 때마다 같은 상태에서 갱신됩니다.",
    file: "파일",
    directory: "디렉터리",
    emptyFile: "빈 파일",
    selectEntry: "파일을 선택하면 내용을 볼 수 있습니다.",
  },
  en: {
    simulatorEyebrow: "GUIDED SHELL · DETERMINISTIC MODEL",
    simulatorTitle: "Learn the rules that move paths first",
    chapterTitle: "Build your first workspace with commands",
    simulatorSummary: "This terminal is an in-memory teaching model, not a real kernel. Its commands resemble Linux, while the current directory and file tree remain visible beside every change.",
    chapterSummary: "Inspect command output and exit status alongside the file tree that actually changed. Finish by trying to write to a protected system file and treating the error as useful evidence.",
    simulatorBadge: "Teaching simulator · not real Linux",
    reset: "Reset state",
    promptLabel: "Teaching Linux command",
    run: "Run",
    placeholder: "Enter a command",
    welcome: "Rootorial shell simulator\nType `help` to see the supported learning commands.",
    commandCompleted: "Command completed",
    commandFailed: "Command failed",
    examples: "Command examples",
    tasks: "First lab",
    chapterTasks: "REQUIRED LAB",
    taskSummary: "Inspect your path, read system information, then create a directory and a note.",
    chapterTaskSummary: "Complete all five observations to pass this chapter lab. A command button only fills the prompt; you still run it yourself.",
    taskItems: [
      ["Check the current path", "pwd"],
      ["Read distribution info", "cat /etc/os-release"],
      ["Create a lab directory", "mkdir -p /home/student/lab"],
      ["Record the path rule", "echo \"absolute paths start at /\" > /home/student/lab/notes.txt"],
    ],
    chapterTaskItems: [
      ["Check the current path", "pwd"],
      ["Read distribution info", "cat /etc/os-release"],
      ["Create a lab directory with a relative path", "mkdir -p lab"],
      ["Record the rule at a relative path", "echo \"absolute paths start at /\" > lab/notes.txt"],
    ],
    permissionTask: ["Observe a permission error on a protected file", "echo \"change\" > /etc/os-release"],
    completed: "Done",
    taskProgress: "tasks complete",
    filesystem: "Virtual filesystem",
    filesystemSummary: "It updates from the same state after every command.",
    file: "File",
    directory: "Directory",
    emptyFile: "Empty file",
    selectEntry: "Select a file to inspect its contents.",
  },
} as const;

const exampleCommands = [
  "pwd",
  "ls -la",
  "cat /etc/os-release",
  "mkdir -p /home/student/lab",
  'echo "absolute paths start at /" > /home/student/lab/notes.txt',
  "tree /home/student",
] as const;

function promptPath(state: LinuxShellState) {
  if (state.cwd === state.home) return "~";
  if (state.cwd.startsWith(`${state.home}/`)) return `~${state.cwd.slice(state.home.length)}`;
  return state.cwd;
}

function fileName(path: string) {
  return path === "/" ? "/" : path.slice(path.lastIndexOf("/") + 1);
}

function compactPromptPath(state: LinuxShellState) {
  return state.cwd === state.home ? "~" : fileName(state.cwd);
}

export function LinuxShellWorkspace({
  id = "shell-lab",
  variant = "experiment",
  onCompletionChange,
}: LinuxShellWorkspaceProps) {
  const { locale } = useLocale();
  const c = copy[locale];
  const [shellState, setShellState] = useState(() => createLinuxShellState());
  const [observations, setObservations] = useState(emptyLinuxShellObservations);
  const [transcript, setTranscript] = useState<TranscriptEntry[]>([]);
  const [command, setCommand] = useState("");
  const [history, setHistory] = useState<string[]>([]);
  const [historyCursor, setHistoryCursor] = useState<number | null>(null);
  const [selectedPath, setSelectedPath] = useState("/home/student/readme.txt");
  const terminalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const transcriptId = useRef(0);
  const inputId = `${id}-command`;
  const previewId = `${id}-file-preview`;

  useEffect(() => {
    terminalRef.current?.scrollTo({ top: terminalRef.current.scrollHeight });
  }, [transcript]);

  const filesystem = useMemo(() => snapshotFilesystem(shellState), [shellState]);
  const filesystemEntries = useMemo(
    () => Object.entries(filesystem).sort(([left], [right]) => left.localeCompare(right)),
    [filesystem],
  );
  const selectedEntry = filesystem[selectedPath];
  const lastTranscript = transcript.at(-1);
  const terminalAnnouncement = lastTranscript
    ? `${lastTranscript.command}. ${lastTranscript.exitCode === 0 ? c.commandCompleted : c.commandFailed}${lastTranscript.output ? `: ${lastTranscript.output}` : ""}`
    : "";

  const taskState = useMemo(() => {
    return linuxShellTaskState(observations, filesystem, variant === "chapter");
  }, [filesystem, observations, variant]);

  const isComplete = taskState.every(Boolean);

  useEffect(() => {
    onCompletionChange?.(isComplete);
  }, [isComplete, onCompletionChange]);

  const executeCommand = (source: string) => {
    const line = source.trim();
    if (!line) return;
    const result = runLinuxCommand(shellState, line);
    const entry: TranscriptEntry = {
      id: transcriptId.current++,
      cwd: shellState.cwd,
      command: line,
      output: result.output,
      exitCode: result.exitCode,
    };
    setShellState(result.state);
    setObservations((current) => recordLinuxShellObservations(current, result));
    setTranscript((current) => result.clearScreen ? [] : [...current, entry]);
    setHistory((current) => [...current, line]);
    setHistoryCursor(null);
    setCommand("");
  };

  const submitCommand = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    executeCommand(command);
  };

  const handleCommandKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== "ArrowUp" && event.key !== "ArrowDown") return;
    event.preventDefault();
    if (history.length === 0) return;

    if (event.key === "ArrowUp") {
      const next = historyCursor === null ? history.length - 1 : Math.max(0, historyCursor - 1);
      setHistoryCursor(next);
      setCommand(history[next]);
      return;
    }

    if (historyCursor === null) return;
    const next = historyCursor + 1;
    if (next >= history.length) {
      setHistoryCursor(null);
      setCommand("");
    } else {
      setHistoryCursor(next);
      setCommand(history[next]);
    }
  };

  const resetShell = () => {
    setShellState(createLinuxShellState());
    setObservations(emptyLinuxShellObservations);
    setTranscript([]);
    setHistory([]);
    setHistoryCursor(null);
    setCommand("");
    setSelectedPath("/home/student/readme.txt");
    inputRef.current?.focus();
  };

  const taskItems = variant === "chapter"
    ? [...c.chapterTaskItems, c.permissionTask]
    : c.taskItems;

  return (
    <section
      className={`linux-shell-section${variant === "chapter" ? " linux-shell-lesson-section" : ""}`}
      id={id}
      aria-labelledby={`${id}-title`}
    >
      <div className="linux-runtime-heading">
        <div>
          <p className="section-index">{c.simulatorEyebrow}</p>
          <h2 id={`${id}-title`}>{variant === "chapter" ? c.chapterTitle : c.simulatorTitle}</h2>
          <p>{variant === "chapter" ? c.chapterSummary : c.simulatorSummary}</p>
        </div>
        <span className="linux-simulator-badge">{c.simulatorBadge}</span>
      </div>

      <div className="linux-shell-workspace">
        <div className="linux-sim-terminal">
          <div className="linux-terminal-toolbar">
            <div aria-hidden="true"><span /><span /><span /></div>
            <strong>student@rootorial:{promptPath(shellState)}</strong>
            <button type="button" onClick={resetShell}>{c.reset}</button>
          </div>
          <div className="linux-terminal-scroll" ref={terminalRef}>
            <pre className="linux-terminal-welcome">{c.welcome}</pre>
            {transcript.map((entry) => (
              <div className="linux-terminal-entry" key={entry.id}>
                <div><span>student@rootorial:{promptPath({ ...shellState, cwd: entry.cwd })}$</span> {entry.command}</div>
                {entry.output ? <pre className={entry.exitCode === 0 ? undefined : "is-error"}>{entry.output}</pre> : null}
              </div>
            ))}
          </div>
          <p className="sr-only" role="status" aria-live="polite" aria-atomic="true">{terminalAnnouncement}</p>
          <form className="linux-terminal-form" onSubmit={submitCommand}>
            <label className="sr-only" htmlFor={inputId}>{c.promptLabel}</label>
            <span aria-hidden="true">{compactPromptPath(shellState)}$</span>
            <input
              id={inputId}
              ref={inputRef}
              value={command}
              onChange={(event) => setCommand(event.target.value)}
              onKeyDown={handleCommandKeyDown}
              placeholder={c.placeholder}
              autoComplete="off"
              spellCheck={false}
            />
            <button type="submit" disabled={!command.trim()}>{c.run}</button>
          </form>
        </div>

        <aside className="linux-filesystem-panel">
          <div className="linux-panel-heading"><div><p>{c.filesystem}</p><span>{c.filesystemSummary}</span></div><code>{shellState.cwd}</code></div>
          <div className="linux-filesystem-content">
            <div className="linux-file-tree" role="list" aria-label={c.filesystem}>
              {filesystemEntries.map(([path, entry]) => {
                const depth = path === "/" ? 0 : Math.max(0, path.split("/").length - 2);
                return (
                  <div role="listitem" key={path}>
                    <button
                      type="button"
                      aria-current={selectedPath === path ? "true" : undefined}
                      aria-controls={previewId}
                      aria-label={`${entry.type === "directory" ? c.directory : c.file}: ${path}`}
                      className={selectedPath === path ? "is-selected" : undefined}
                      style={{ paddingInlineStart: `${12 + depth * 14}px` }}
                      onClick={() => setSelectedPath(path)}
                    >
                      <span aria-hidden="true">{entry.type === "directory" ? "▸" : "·"}</span>
                      {fileName(path)}
                    </button>
                  </div>
                );
              })}
            </div>
            <div
              aria-label={locale === "ko" ? "선택한 파일 정보" : "Selected file details"}
              aria-live="polite"
              className="linux-file-preview"
              id={previewId}
              role="region"
            >
              {selectedEntry ? (
                <>
                  <div><span>{selectedEntry.type === "file" ? c.file : c.directory}</span><code>{selectedPath}</code></div>
                  {selectedEntry.type === "file" ? <pre>{selectedEntry.content || c.emptyFile}</pre> : <p>{c.selectEntry}</p>}
                </>
              ) : <p>{c.selectEntry}</p>}
            </div>
          </div>
        </aside>
      </div>

      <div className="linux-practice-rail">
        <div className="linux-command-examples"><span>{c.examples}</span><div>{exampleCommands.map((example) => <button type="button" key={example} onClick={() => { setCommand(example); inputRef.current?.focus(); }}>{example}</button>)}</div></div>
        <aside className="linux-task-card">
          <div><p className="section-index">{variant === "chapter" ? c.chapterTasks : c.tasks}</p><strong role="status" aria-live="polite" aria-atomic="true" aria-label={`${taskState.filter(Boolean).length}/${taskState.length} ${c.taskProgress}`}>{taskState.filter(Boolean).length}/{taskState.length}</strong></div>
          <p>{variant === "chapter" ? c.chapterTaskSummary : c.taskSummary}</p>
          <ol>
            {taskItems.map(([title, commandText], index) => (
              <li className={taskState[index] ? "is-complete" : undefined} key={title}>
                <span aria-hidden="true">{taskState[index] ? "✓" : index + 1}</span>
                <div><strong>{title}</strong><button type="button" onClick={() => { setCommand(commandText); inputRef.current?.focus(); }}>{commandText}</button></div>
                {taskState[index] ? <small>{c.completed}</small> : null}
              </li>
            ))}
          </ol>
        </aside>
      </div>
    </section>
  );
}

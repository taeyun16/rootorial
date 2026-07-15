export const processStateCodes = {
  runnable: "R",
  sleeping: "S",
  stopped: "T",
  zombie: "Z",
} as const;

export type ProcessState = keyof typeof processStateCodes;
export type ProcessProgram = "cpu-worker" | "pipe-reader" | "term-resistant";
export type ProcessOutputTarget = "terminal" | "file";
export type TermDisposition = "cleanup" | "default" | "ignore";
export type ProcessSignal = "SIGSTOP" | "SIGCONT" | "SIGTERM" | "SIGKILL";

export type ProcessRecord = {
  pid: number;
  ppid: number;
  command: string;
  program: "init" | "shell" | ProcessProgram;
  state: ProcessState;
  resumeState?: "runnable" | "sleeping";
  stdin: "terminal" | "pipe";
  stdout: ProcessOutputTarget;
  stderr: "terminal";
  termDisposition: TermDisposition;
  ticks: number;
  queuedInput: string[];
  pendingSignal?: "SIGTERM";
  shellStatus?: number;
  exitCause?: "SIGTERM" | "SIGKILL";
};

export type WaitRecord = {
  pid: number;
  shellStatus: number;
  cause: "SIGTERM" | "SIGKILL";
};

export type ProcessEvent = {
  reason: ProcessTransitionReason;
  pid?: number;
  value?: string | number;
};

export type ProcessMachine = {
  processes: ProcessRecord[];
  nextPid: number;
  lastScheduledPid: number | null;
  terminalOutput: string[];
  fileOutput: string[];
  waited: WaitRecord[];
  events: ProcessEvent[];
};

export type SpawnConfig = {
  program: ProcessProgram;
  stdout: ProcessOutputTarget;
};

export type ProcessTransitionReason =
  | "spawned"
  | "tick-ran"
  | "no-runnable-child"
  | "stopped"
  | "already-stopped"
  | "continued"
  | "continued-to-sleep"
  | "not-stopped"
  | "term-cleanup"
  | "term-default"
  | "term-ignored"
  | "term-pending"
  | "killed"
  | "zombie-cannot-receive-signal"
  | "reaped"
  | "child-still-running"
  | "process-not-found"
  | "pipe-input-ready"
  | "pipe-input-queued-while-stopped"
  | "not-a-pipe-reader"
  | "empty-pipe-input";

export type ProcessTransition = {
  machine: ProcessMachine;
  reason: ProcessTransitionReason;
  pid?: number;
  outputTarget?: ProcessOutputTarget;
  shellStatus?: number;
};

function baseProcesses(): ProcessRecord[] {
  return [
    {
      pid: 1,
      ppid: 0,
      command: "init",
      program: "init",
      state: "sleeping",
      stdin: "terminal",
      stdout: "terminal",
      stderr: "terminal",
      termDisposition: "default",
      ticks: 0,
      queuedInput: [],
    },
    {
      pid: 42,
      ppid: 1,
      command: "sh",
      program: "shell",
      state: "runnable",
      stdin: "terminal",
      stdout: "terminal",
      stderr: "terminal",
      termDisposition: "default",
      ticks: 0,
      queuedInput: [],
    },
  ];
}

export function createProcessMachine(): ProcessMachine {
  return {
    processes: baseProcesses(),
    nextPid: 73,
    lastScheduledPid: null,
    terminalOutput: [],
    fileOutput: [],
    waited: [],
    events: [],
  };
}

function cloneMachine(machine: ProcessMachine): ProcessMachine {
  return {
    ...machine,
    processes: machine.processes.map((process) => ({
      ...process,
      queuedInput: [...process.queuedInput],
    })),
    terminalOutput: [...machine.terminalOutput],
    fileOutput: [...machine.fileOutput],
    waited: machine.waited.map((entry) => ({ ...entry })),
    events: machine.events.map((event) => ({ ...event })),
  };
}

function finish(
  machine: ProcessMachine,
  reason: ProcessTransitionReason,
  details: Omit<ProcessTransition, "machine" | "reason"> = {},
): ProcessTransition {
  machine.events.push({ reason, pid: details.pid, value: details.shellStatus });
  return { machine, reason, ...details };
}

function processByPid(machine: ProcessMachine, pid: number) {
  return machine.processes.find((process) => process.pid === pid);
}

function childProcesses(machine: ProcessMachine) {
  return machine.processes.filter((process) => process.ppid === 42);
}

function configurationForProgram(program: ProcessProgram) {
  if (program === "pipe-reader") {
    return {
      command: "read_pipe",
      state: "sleeping" as const,
      stdin: "pipe" as const,
      termDisposition: "default" as const,
    };
  }
  if (program === "term-resistant") {
    return {
      command: "term_resistant",
      state: "runnable" as const,
      stdin: "terminal" as const,
      termDisposition: "ignore" as const,
    };
  }
  return {
    command: "cpu_worker",
    state: "runnable" as const,
    stdin: "terminal" as const,
    termDisposition: "cleanup" as const,
  };
}

export function spawnChild(
  current: ProcessMachine,
  config: SpawnConfig,
): ProcessTransition {
  const machine = cloneMachine(current);
  const pid = machine.nextPid;
  const program = configurationForProgram(config.program);
  machine.processes.push({
    pid,
    ppid: 42,
    command: program.command,
    program: config.program,
    state: program.state,
    stdin: program.stdin,
    stdout: config.stdout,
    stderr: "terminal",
    termDisposition: program.termDisposition,
    ticks: 0,
    queuedInput: [],
  });
  machine.nextPid += 1;
  return finish(machine, "spawned", { pid });
}

export function nextRunnablePid(machine: ProcessMachine): number | null {
  const runnable = childProcesses(machine)
    .filter((process) => process.state === "runnable")
    .map((process) => process.pid)
    .sort((left, right) => left - right);
  if (runnable.length === 0) return null;
  if (machine.lastScheduledPid === null) return runnable[0];
  const lastScheduledPid = machine.lastScheduledPid;
  return runnable.find((pid) => pid > lastScheduledPid) ?? runnable[0];
}

export function runSchedulerTick(current: ProcessMachine): ProcessTransition {
  const machine = cloneMachine(current);
  const pid = nextRunnablePid(machine);
  if (pid === null) return finish(machine, "no-runnable-child");
  const process = processByPid(machine, pid)!;
  process.ticks += 1;
  machine.lastScheduledPid = pid;

  let line: string;
  if (process.program === "pipe-reader") {
    const input = process.queuedInput.shift() ?? "";
    line = `pipe[${pid}] ${input}`;
    process.state = process.queuedInput.length > 0 ? "runnable" : "sleeping";
  } else {
    line = `worker[${pid}] tick ${process.ticks}`;
  }
  if (process.stdout === "file") machine.fileOutput.push(line);
  else machine.terminalOutput.push(line);
  return finish(machine, "tick-ran", {
    pid,
    outputTarget: process.stdout,
  });
}

function terminate(
  machine: ProcessMachine,
  process: ProcessRecord,
  signal: "SIGTERM" | "SIGKILL",
) {
  process.state = "zombie";
  delete process.resumeState;
  delete process.pendingSignal;
  process.exitCause = signal;
  process.shellStatus = signal === "SIGKILL" ? 137 : process.termDisposition === "cleanup" ? 0 : 143;
}

export function sendSignal(
  current: ProcessMachine,
  pid: number,
  signal: ProcessSignal,
): ProcessTransition {
  const machine = cloneMachine(current);
  const process = processByPid(machine, pid);
  if (!process || process.ppid !== 42) {
    return finish(machine, "process-not-found", { pid });
  }
  if (process.state === "zombie") {
    return finish(machine, "zombie-cannot-receive-signal", { pid });
  }

  if (signal === "SIGSTOP") {
    if (process.state === "stopped") {
      return finish(machine, "already-stopped", { pid });
    }
    process.resumeState = process.state;
    process.state = "stopped";
    return finish(machine, "stopped", { pid });
  }

  if (signal === "SIGCONT") {
    if (process.state !== "stopped") {
      return finish(machine, "not-stopped", { pid });
    }
    const restored = process.resumeState ?? "runnable";
    delete process.resumeState;
    if (process.pendingSignal === "SIGTERM") {
      terminate(machine, process, "SIGTERM");
      return finish(machine, process.termDisposition === "cleanup" ? "term-cleanup" : "term-default", {
        pid,
        shellStatus: process.shellStatus,
      });
    }
    process.state = restored;
    return finish(machine, restored === "sleeping" ? "continued-to-sleep" : "continued", { pid });
  }

  if (signal === "SIGKILL") {
    terminate(machine, process, "SIGKILL");
    return finish(machine, "killed", { pid, shellStatus: 137 });
  }

  if (process.termDisposition === "ignore") {
    return finish(machine, "term-ignored", { pid });
  }
  if (process.state === "stopped") {
    process.pendingSignal = "SIGTERM";
    return finish(machine, "term-pending", { pid });
  }
  terminate(machine, process, "SIGTERM");
  return finish(machine, process.termDisposition === "cleanup" ? "term-cleanup" : "term-default", {
    pid,
    shellStatus: process.shellStatus,
  });
}

export function waitForChild(
  current: ProcessMachine,
  pid: number,
): ProcessTransition {
  const machine = cloneMachine(current);
  const process = processByPid(machine, pid);
  if (!process || process.ppid !== 42) {
    return finish(machine, "process-not-found", { pid });
  }
  if (process.state !== "zombie" || process.shellStatus === undefined || !process.exitCause) {
    return finish(machine, "child-still-running", { pid });
  }
  machine.processes = machine.processes.filter((candidate) => candidate.pid !== pid);
  machine.waited.push({
    pid,
    shellStatus: process.shellStatus,
    cause: process.exitCause,
  });
  return finish(machine, "reaped", { pid, shellStatus: process.shellStatus });
}

export function feedPipe(
  current: ProcessMachine,
  pid: number,
  value: string,
): ProcessTransition {
  const machine = cloneMachine(current);
  const process = processByPid(machine, pid);
  if (!process || process.ppid !== 42) {
    return finish(machine, "process-not-found", { pid });
  }
  if (process.program !== "pipe-reader" || process.state === "zombie") {
    return finish(machine, "not-a-pipe-reader", { pid });
  }
  const input = value.trim();
  if (!input) return finish(machine, "empty-pipe-input", { pid });
  process.queuedInput.push(input);
  if (process.state === "stopped") {
    process.resumeState = "runnable";
    return finish(machine, "pipe-input-queued-while-stopped", { pid });
  }
  process.state = "runnable";
  return finish(machine, "pipe-input-ready", { pid });
}

export type LifecycleEvidence = {
  correctSpawnPredictions: number;
  firstTickCorrect: boolean;
  secondTickCorrect: boolean;
  terminalOutputObserved: boolean;
  fileOutputObserved: boolean;
  stoppedProcessExcluded: boolean;
  continuedProcessScheduled: boolean;
  zombiePids: readonly number[];
  reapedPids: readonly number[];
};

export function canMasterProcessLifecycle(
  machine: ProcessMachine,
  evidence: LifecycleEvidence,
) {
  const children = childProcesses(machine);
  return evidence.correctSpawnPredictions >= 2
    && evidence.firstTickCorrect
    && evidence.secondTickCorrect
    && evidence.terminalOutputObserved
    && evidence.fileOutputObserved
    && evidence.stoppedProcessExcluded
    && evidence.continuedProcessScheduled
    && new Set(evidence.zombiePids).size >= 2
    && new Set(evidence.reapedPids).size >= 2
    && children.length === 0;
}

export const processIncidentIds = [
  "stopped-worker",
  "sleeping-reader",
  "zombie-child",
  "term-resistant",
] as const;

export type ProcessIncidentId = (typeof processIncidentIds)[number];
export const processIncidentActionIds = [
  "tick",
  "SIGCONT",
  "SIGTERM",
  "SIGKILL",
  "waitpid",
  "feed-pipe",
] as const;
export type ProcessIncidentAction = (typeof processIncidentActionIds)[number];

function incidentChild(
  state: ProcessState,
  program: ProcessProgram,
  overrides: Partial<ProcessRecord> = {},
): ProcessRecord {
  const config = configurationForProgram(program);
  return {
    pid: 73,
    ppid: 42,
    command: config.command,
    program,
    state,
    resumeState: state === "stopped" ? "runnable" : undefined,
    stdin: config.stdin,
    stdout: "terminal",
    stderr: "terminal",
    termDisposition: config.termDisposition,
    ticks: 0,
    queuedInput: [],
    ...overrides,
  };
}

export function createProcessIncident(id: ProcessIncidentId): ProcessMachine {
  const machine = createProcessMachine();
  machine.nextPid = 74;
  if (id === "stopped-worker") {
    machine.processes.push(incidentChild("stopped", "cpu-worker"));
  } else if (id === "sleeping-reader") {
    machine.processes.push(incidentChild("sleeping", "pipe-reader"));
  } else if (id === "zombie-child") {
    machine.processes.push(incidentChild("zombie", "cpu-worker", {
      shellStatus: 143,
      exitCause: "SIGTERM",
    }));
  } else {
    machine.processes.push(incidentChild("runnable", "term-resistant"));
    machine.events.push({ reason: "term-ignored", pid: 73 });
  }
  return machine;
}

export function applyProcessIncidentAction(
  current: ProcessMachine,
  action: ProcessIncidentAction,
  input = "",
): ProcessTransition {
  if (action === "tick") return runSchedulerTick(current);
  if (action === "waitpid") return waitForChild(current, 73);
  if (action === "feed-pipe") return feedPipe(current, 73, input);
  return sendSignal(current, 73, action);
}

export function isProcessIncidentComplete(
  id: ProcessIncidentId,
  machine: ProcessMachine,
) {
  const child = processByPid(machine, 73);
  const waited = machine.waited.find((entry) => entry.pid === 73);
  if (id === "stopped-worker") {
    return child?.state === "runnable"
      && child.ticks >= 1
      && machine.terminalOutput.some((line) => line.startsWith("worker[73]"));
  }
  if (id === "sleeping-reader") {
    return child?.state === "sleeping"
      && machine.terminalOutput.some((line) => line.startsWith("pipe[73] ") && line.length > "pipe[73] ".length);
  }
  if (id === "zombie-child") {
    return child === undefined && waited?.shellStatus === 143;
  }
  return child === undefined && waited?.shellStatus === 137;
}

export function canCompleteProcessesChapter({
  lifecycleLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  lifecycleLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return lifecycleLabComplete && incidentsComplete && conceptsMastered;
}

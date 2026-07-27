import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  applyProcessIncidentAction,
  canCompleteProcessesChapter,
  canMasterProcessLifecycle,
  createProcessIncident,
  createProcessMachine,
  feedPipe,
  isProcessIncidentComplete,
  nextRunnablePid,
  processStateCodes,
  runSchedulerTick,
  sendSignal,
  spawnChild,
  waitForChild,
} from "../src/features/linux-runtime/processes-and-signals.ts";

function twoWorkers() {
  let machine = createProcessMachine();
  machine = spawnChild(machine, { program: "cpu-worker", stdout: "terminal" }).machine;
  machine = spawnChild(machine, { program: "cpu-worker", stdout: "file" }).machine;
  return machine;
}

test("spawns deterministic children while exec keeps each child PID and inherited stdio", () => {
  const machine = twoWorkers();
  const children = machine.processes.filter(({ ppid }) => ppid === 42);
  assert.deepEqual(children.map(({ pid, ppid, command }) => ({ pid, ppid, command })), [
    { pid: 73, ppid: 42, command: "cpu_worker" },
    { pid: 74, ppid: 42, command: "cpu_worker" },
  ]);
  assert.equal(children[0].stdout, "terminal");
  assert.equal(children[1].stdout, "file");
  assert.equal(children[0].stderr, "terminal");
  assert.equal(machine.nextPid, 75);
});

test("runs only runnable children in deterministic round-robin order", () => {
  let machine = twoWorkers();
  assert.equal(nextRunnablePid(machine), 73);
  let transition = runSchedulerTick(machine);
  assert.equal(transition.pid, 73);
  assert.equal(transition.outputTarget, "terminal");
  machine = transition.machine;
  transition = runSchedulerTick(machine);
  assert.equal(transition.pid, 74);
  assert.equal(transition.outputTarget, "file");
  machine = transition.machine;

  machine = sendSignal(machine, 73, "SIGSTOP").machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "stopped");
  assert.equal(processStateCodes.stopped, "T");
  transition = runSchedulerTick(machine);
  assert.equal(transition.pid, 74);
  machine = transition.machine;

  machine = sendSignal(machine, 73, "SIGCONT").machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "runnable");
  transition = runSchedulerTick(machine);
  assert.equal(transition.pid, 73);
  assert.match(machine.terminalOutput[0], /worker\[73\] tick 1/);
  assert.match(machine.fileOutput[0], /worker\[74\] tick 1/);
});

test("restores a stopped sleeper to its prior wait condition and wakes it with pipe input", () => {
  let machine = createProcessMachine();
  machine = spawnChild(machine, { program: "pipe-reader", stdout: "terminal" }).machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "sleeping");
  machine = sendSignal(machine, 73, "SIGSTOP").machine;
  const continued = sendSignal(machine, 73, "SIGCONT");
  assert.equal(continued.reason, "continued-to-sleep");
  machine = continued.machine;
  assert.equal(nextRunnablePid(machine), null);

  const empty = feedPipe(machine, 73, "   ");
  assert.equal(empty.reason, "empty-pipe-input");
  const ready = feedPipe(machine, 73, "hello pipe");
  assert.equal(ready.reason, "pipe-input-ready");
  machine = ready.machine;
  assert.equal(nextRunnablePid(machine), 73);
  machine = runSchedulerTick(machine).machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "sleeping");
  assert.deepEqual(machine.terminalOutput, ["pipe[73] hello pipe"]);

  machine = feedPipe(machine, 73, "first").machine;
  machine = feedPipe(machine, 73, "second").machine;
  machine = runSchedulerTick(machine).machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "runnable");
  machine = runSchedulerTick(machine).machine;
  assert.equal(machine.processes.find(({ pid }) => pid === 73).state, "sleeping");
  assert.deepEqual(machine.terminalOutput.slice(-2), ["pipe[73] first", "pipe[73] second"]);
});

test("distinguishes cooperative TERM, ignored TERM, forced KILL, zombie, and wait", () => {
  let cooperative = createProcessMachine();
  cooperative = spawnChild(cooperative, { program: "cpu-worker", stdout: "terminal" }).machine;
  const terminated = sendSignal(cooperative, 73, "SIGTERM");
  assert.equal(terminated.reason, "term-cleanup");
  assert.equal(terminated.machine.processes.find(({ pid }) => pid === 73).state, "zombie");
  assert.equal(terminated.shellStatus, 0);
  const cannotKillZombie = sendSignal(terminated.machine, 73, "SIGKILL");
  assert.equal(cannotKillZombie.reason, "zombie-cannot-receive-signal");
  const reaped = waitForChild(cannotKillZombie.machine, 73);
  assert.equal(reaped.reason, "reaped");
  assert.equal(reaped.machine.processes.some(({ pid }) => pid === 73), false);
  assert.deepEqual(reaped.machine.waited[0], { pid: 73, shellStatus: 0, cause: "SIGTERM" });

  let resistant = createProcessMachine();
  resistant = spawnChild(resistant, { program: "term-resistant", stdout: "terminal" }).machine;
  const ignored = sendSignal(resistant, 73, "SIGTERM");
  assert.equal(ignored.reason, "term-ignored");
  assert.equal(ignored.machine.processes.find(({ pid }) => pid === 73).state, "runnable");
  const killed = sendSignal(ignored.machine, 73, "SIGKILL");
  assert.equal(killed.reason, "killed");
  assert.equal(killed.shellStatus, 137);
  assert.equal(killed.machine.processes.find(({ pid }) => pid === 73).state, "zombie");
  assert.equal(waitForChild(killed.machine, 73).shellStatus, 137);
});

test("grades all four incidents from resulting process state", () => {
  let stopped = createProcessIncident("stopped-worker");
  stopped = applyProcessIncidentAction(stopped, "SIGCONT").machine;
  assert.equal(isProcessIncidentComplete("stopped-worker", stopped), false);
  stopped = applyProcessIncidentAction(stopped, "tick").machine;
  assert.equal(isProcessIncidentComplete("stopped-worker", stopped), true);

  let sleeping = createProcessIncident("sleeping-reader");
  const wrongContinue = applyProcessIncidentAction(sleeping, "SIGCONT");
  assert.equal(wrongContinue.reason, "not-stopped");
  sleeping = applyProcessIncidentAction(wrongContinue.machine, "feed-pipe", "payload").machine;
  sleeping = applyProcessIncidentAction(sleeping, "tick").machine;
  assert.equal(isProcessIncidentComplete("sleeping-reader", sleeping), true);

  let zombie = createProcessIncident("zombie-child");
  const wrongSignal = applyProcessIncidentAction(zombie, "SIGKILL");
  assert.equal(wrongSignal.reason, "zombie-cannot-receive-signal");
  zombie = applyProcessIncidentAction(wrongSignal.machine, "waitpid").machine;
  assert.equal(isProcessIncidentComplete("zombie-child", zombie), true);

  let resistant = createProcessIncident("term-resistant");
  assert.equal(applyProcessIncidentAction(resistant, "SIGTERM").reason, "term-ignored");
  resistant = applyProcessIncidentAction(resistant, "SIGKILL").machine;
  assert.equal(isProcessIncidentComplete("term-resistant", resistant), false);
  resistant = applyProcessIncidentAction(resistant, "waitpid").machine;
  assert.equal(isProcessIncidentComplete("term-resistant", resistant), true);
});

test("requires causal lifecycle evidence and every chapter gate", () => {
  let machine = twoWorkers();
  machine = sendSignal(machine, 73, "SIGTERM").machine;
  machine = sendSignal(machine, 74, "SIGTERM").machine;
  machine = waitForChild(machine, 73).machine;
  machine = waitForChild(machine, 74).machine;
  const evidence = {
    correctSpawnPredictions: 2,
    firstTickCorrect: true,
    secondTickCorrect: true,
    terminalOutputObserved: true,
    fileOutputObserved: true,
    stoppedProcessExcluded: true,
    continuedProcessScheduled: true,
    zombiePids: [73, 74],
    reapedPids: [73, 74],
  };
  assert.equal(canMasterProcessLifecycle(machine, evidence), true);
  for (const missing of [
    "firstTickCorrect",
    "fileOutputObserved",
    "stoppedProcessExcluded",
    "continuedProcessScheduled",
  ]) {
    assert.equal(canMasterProcessLifecycle(machine, { ...evidence, [missing]: false }), false);
  }
  assert.equal(canMasterProcessLifecycle(machine, { ...evidence, zombiePids: [73] }), false);
  assert.equal(canMasterProcessLifecycle(machine, { ...evidence, reapedPids: [73] }), false);

  assert.equal(canCompleteProcessesChapter({
    lifecycleLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  }), true);
  for (const missing of ["lifecycleLabComplete", "incidentsComplete", "conceptsMastered"]) {
    assert.equal(canCompleteProcessesChapter({
      lifecycleLabComplete: true,
      incidentsComplete: true,
      conceptsMastered: true,
      [missing]: false,
    }), false);
  }
});

test("keeps every per-incident retry control at a 44px touch target", async () => {
  const styles = await readFile(new URL("../src/styles/globals.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /\.process-incident-card > \.text-link \{[\s\S]*?min-height: 44px;[\s\S]*?display: inline-flex;/,
  );
});

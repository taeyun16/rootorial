import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  canCompleteTinyLinuxChapter,
  canCompleteTinyLinuxIncidents,
  canMasterTinyLinuxLab,
  createTinyLinuxMachine,
  evaluateTinyLinuxIncident,
  inspectTinyLinuxStage,
  runTinyLinux,
  setTinyLinuxConfigField,
  simulateTinyLinux,
  tinyLinuxIncidentIds,
  tinyLinuxPredictionIds,
  tinyLinuxPresetIds,
  tinyLinuxRequiredInspectionStages,
  tinyLinuxStageIds,
} from "../src/features/linux-runtime/assemble-a-tiny-linux.ts";

function changedConfig(patch) {
  return {
    ...createTinyLinuxMachine("healthy").config,
    ...patch,
  };
}

function transitionMachine(transition) {
  assert.equal(transition.ok, true, transition.error);
  assert.equal(transition.error, undefined);
  return transition.machine;
}

function completeLayeredRecovery({ wrongPredictionFirst = false } = {}) {
  let machine = createTinyLinuxMachine("layered-recovery");

  if (wrongPredictionFirst) {
    machine = transitionMachine(runTinyLinux(machine, "served"));
    assert.equal(machine.attempts.at(-1).predictionCorrect, false);
  }

  machine = transitionMachine(runTinyLinux(machine, "init-not-executable"));
  machine = transitionMachine(setTinyLinuxConfigField(machine, "initMode", "0755"));
  machine = transitionMachine(runTinyLinux(machine, "synack-no-return-route"));
  machine = transitionMachine(setTinyLinuxConfigField(machine, "defaultGateway", "10.0.0.1"));
  machine = transitionMachine(runTinyLinux(machine, "report-read-denied"));
  machine = transitionMachine(setTinyLinuxConfigField(machine, "reportMode", "0640"));
  machine = transitionMachine(runTinyLinux(machine, "served"));

  for (const stage of tinyLinuxRequiredInspectionStages) {
    machine = transitionMachine(inspectTinyLinuxStage(machine, stage));
  }
  return machine;
}

const correctIncidents = {
  "init-handoff": {
    initPath: "/init",
    preserveKernel: true,
    preserveInitramfs: true,
  },
  "pid1-supervision": {
    reapAction: "wait-child",
    restartAction: "spawn-child",
    restartedPid: 8,
    restartedPpid: 1,
    pid1Remains: true,
  },
  "report-access": {
    serviceUid: 1100,
    serviceGid: 4000,
    directoryMode: "0750",
    reportGroupGid: 4000,
    reportMode: "0640",
  },
  "remote-listener": {
    listenAddress: "0.0.0.0",
    listenPort: 8080,
    listenerFd: 3,
    acceptedFd: 4,
    fileFd: 5,
    sendFd: 4,
  },
};

test("exports the bounded stage, preset, prediction, inspection, and incident contracts", () => {
  assert.deepEqual(tinyLinuxStageIds, [
    "kernel",
    "rootfs",
    "init",
    "pid1",
    "network",
    "service",
    "listener",
    "accept",
    "report",
    "response",
  ]);
  assert.deepEqual(tinyLinuxRequiredInspectionStages, [
    "rootfs",
    "pid1",
    "listener",
    "report",
    "response",
  ]);
  assert.deepEqual(tinyLinuxPresetIds, [
    "layered-recovery",
    "missing-kernel",
    "missing-initramfs",
    "healthy",
  ]);
  assert.equal(new Set(tinyLinuxPredictionIds).size, tinyLinuxPredictionIds.length);
  assert.deepEqual(tinyLinuxIncidentIds, [
    "init-handoff",
    "pid1-supervision",
    "report-access",
    "remote-listener",
  ]);
});

test("stops at every reachable boundary without inventing later stage progress", () => {
  const cases = [
    [{ kernelImagePresent: false }, "kernel-image-missing", []],
    [{ initramfsAttached: false }, "initramfs-missing", ["kernel"]],
    [{ rootfsUnpackable: false }, "rootfs-unpack-failed", ["kernel"]],
    [{ initPath: "/sbin/init" }, "init-missing", ["kernel", "rootfs"]],
    [{ initMode: "0644" }, "init-not-executable", ["kernel", "rootfs"]],
    [{ initInterpreterPresent: false }, "init-interpreter-missing", ["kernel", "rootfs"]],
    [{ pid1KeepsRunning: false }, "pid1-exited", ["kernel", "rootfs", "init"]],
    [{ interfacePresent: false }, "network-interface-missing", ["kernel", "rootfs", "init", "pid1"]],
    [{ linkUp: false }, "network-link-down", ["kernel", "rootfs", "init", "pid1"]],
    [{ address: "" }, "network-address-missing", ["kernel", "rootfs", "init", "pid1"]],
    [{ serviceBinaryMode: "0644" }, "service-exec-denied", ["kernel", "rootfs", "init", "pid1", "network"]],
    [{ listenAddress: "127.0.0.1" }, "listener-not-found", ["kernel", "rootfs", "init", "pid1", "network", "service"]],
    [{ listenPort: 8081 }, "listener-not-found", ["kernel", "rootfs", "init", "pid1", "network", "service"]],
    [{ defaultGateway: "" }, "synack-no-return-route", ["kernel", "rootfs", "init", "pid1", "network", "service", "listener"]],
    [{ acceptedFdAvailable: false }, "accepted-fd-missing", ["kernel", "rootfs", "init", "pid1", "network", "service", "listener"]],
    [{ directoryMode: "0700" }, "report-path-search-denied", ["kernel", "rootfs", "init", "pid1", "network", "service", "listener", "accept"]],
    [{ reportMode: "0600" }, "report-read-denied", ["kernel", "rootfs", "init", "pid1", "network", "service", "listener", "accept"]],
  ];

  for (const [patch, stopCode, stagesReached] of cases) {
    const result = simulateTinyLinux(changedConfig(patch));
    assert.equal(result.stopCode, stopCode, JSON.stringify(patch));
    assert.deepEqual(result.stagesReached, stagesReached, stopCode);
    assert.equal(result.stagesReached.includes("response"), false, stopCode);
  }
});

test("assembles a healthy system with PID 1, least privilege, separate fds, and conserved bytes", () => {
  const result = simulateTinyLinux(createTinyLinuxMachine("healthy").config);
  assert.equal(result.stopCode, "served");
  assert.deepEqual(result.stagesReached, tinyLinuxStageIds);
  assert.equal(result.runtime.kernel.booted, true);
  assert.equal(result.runtime.rootfs.unpacked, true);
  assert.equal(result.runtime.rootfs.initPath, "/init");
  assert.deepEqual(result.runtime.pid1, { pid: 1, path: "/init", supervising: true });
  assert.deepEqual(result.runtime.service, {
    pid: 7,
    uid: 1100,
    gid: 4000,
    executable: "/usr/bin/reportd",
  });
  assert.equal(result.runtime.report.path, "/srv/report.txt");
  assert.equal(result.runtime.report.directoryMode, "0750");
  assert.equal(result.runtime.report.mode, "0640");
  assert.equal(result.runtime.report.readable, true);
  assert.equal(result.runtime.report.writable, false);
  assert.equal(result.runtime.report.guestReadable, false);
  assert.deepEqual(result.runtime.descriptors, {
    listenerFd: 3,
    acceptedFd: 4,
    reportFd: 5,
    sendFd: 4,
  });
  assert.notEqual(result.runtime.descriptors.listenerFd, result.runtime.descriptors.acceptedFd);
  assert.equal(result.runtime.descriptors.sendFd, result.runtime.descriptors.acceptedFd);
  assert.equal(result.runtime.delivery.sentBytes, result.runtime.report.bytes);
  assert.equal(result.runtime.delivery.receivedBytes, result.runtime.report.bytes);
});

test("uses functional immutable transitions and returns specific errors without changing prior state", () => {
  const initial = createTinyLinuxMachine();
  const invalidConfig = setTinyLinuxConfigField(initial, "initMode", "0777");
  assert.deepEqual(invalidConfig, {
    ok: false,
    machine: initial,
    error: "invalid-config-value",
  });
  assert.equal(initial.revision, 0);
  assert.deepEqual(initial.journal, []);

  const invalidPrediction = runTinyLinux(initial, "not-a-stop-code");
  assert.equal(invalidPrediction.ok, false);
  assert.equal(invalidPrediction.error, "invalid-prediction");
  assert.equal(invalidPrediction.machine, initial);

  const noAttempt = inspectTinyLinuxStage(initial, "rootfs");
  assert.equal(noAttempt.ok, false);
  assert.equal(noAttempt.error, "no-attempt");

  const firstRun = runTinyLinux(initial, "init-not-executable");
  const afterRun = transitionMachine(firstRun);
  assert.notEqual(afterRun, initial);
  assert.equal(initial.attempts.length, 0);
  assert.equal(afterRun.attempts.length, 1);
  assert.equal(afterRun.revision, 1);

  const unreached = inspectTinyLinuxStage(afterRun, "response");
  assert.equal(unreached.ok, false);
  assert.equal(unreached.error, "stage-not-reached");
  assert.equal(unreached.machine, afterRun);

  const inspected = transitionMachine(inspectTinyLinuxStage(afterRun, "rootfs"));
  assert.deepEqual(afterRun.attempts[0].inspections, []);
  assert.deepEqual(inspected.attempts[0].inspections, ["rootfs"]);
  const duplicate = inspectTinyLinuxStage(inspected, "rootfs");
  assert.equal(duplicate.ok, false);
  assert.equal(duplicate.error, "stage-already-inspected");

  const configured = transitionMachine(setTinyLinuxConfigField(afterRun, "initMode", "0755"));
  assert.equal(afterRun.config.initMode, "0644");
  assert.equal(configured.config.initMode, "0755");
  assert.equal(configured.revision, afterRun.revision + 1);
  assert.deepEqual(configured.journal.map(({ revision }) => revision), [1, 2]);
});

test("allows a wrong prediction retry but requires the ordered three repairs and five final inspections", () => {
  const completed = completeLayeredRecovery({ wrongPredictionFirst: true });
  assert.deepEqual(
    completed.attempts.map(({ prediction, stopCode, predictionCorrect }) => ({
      prediction,
      stopCode,
      predictionCorrect,
    })),
    [
      { prediction: "served", stopCode: "init-not-executable", predictionCorrect: false },
      { prediction: "init-not-executable", stopCode: "init-not-executable", predictionCorrect: true },
      { prediction: "synack-no-return-route", stopCode: "synack-no-return-route", predictionCorrect: true },
      { prediction: "report-read-denied", stopCode: "report-read-denied", predictionCorrect: true },
      { prediction: "served", stopCode: "served", predictionCorrect: true },
    ],
  );
  assert.deepEqual(completed.attempts.at(-1).inspections, tinyLinuxRequiredInspectionStages);
  assert.equal(canMasterTinyLinuxLab(completed), true);

  let wrongAtRoute = createTinyLinuxMachine();
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "init-not-executable"));
  wrongAtRoute = transitionMachine(setTinyLinuxConfigField(wrongAtRoute, "initMode", "0755"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "served"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "synack-no-return-route"));
  wrongAtRoute = transitionMachine(setTinyLinuxConfigField(wrongAtRoute, "defaultGateway", "10.0.0.1"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "served"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "report-read-denied"));
  wrongAtRoute = transitionMachine(setTinyLinuxConfigField(wrongAtRoute, "reportMode", "0640"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "report-read-denied"));
  wrongAtRoute = transitionMachine(runTinyLinux(wrongAtRoute, "served"));
  for (const stage of tinyLinuxRequiredInspectionStages) {
    wrongAtRoute = transitionMachine(inspectTinyLinuxStage(wrongAtRoute, stage));
  }
  assert.equal(canMasterTinyLinuxLab(wrongAtRoute), true);

  let missingInspection = createTinyLinuxMachine();
  missingInspection = transitionMachine(runTinyLinux(missingInspection, "init-not-executable"));
  missingInspection = transitionMachine(setTinyLinuxConfigField(missingInspection, "initMode", "0755"));
  missingInspection = transitionMachine(runTinyLinux(missingInspection, "synack-no-return-route"));
  missingInspection = transitionMachine(setTinyLinuxConfigField(missingInspection, "defaultGateway", "10.0.0.1"));
  missingInspection = transitionMachine(runTinyLinux(missingInspection, "report-read-denied"));
  missingInspection = transitionMachine(setTinyLinuxConfigField(missingInspection, "reportMode", "0640"));
  missingInspection = transitionMachine(runTinyLinux(missingInspection, "served"));
  for (const stage of tinyLinuxRequiredInspectionStages.slice(0, -1)) {
    missingInspection = transitionMachine(inspectTinyLinuxStage(missingInspection, stage));
  }
  assert.equal(canMasterTinyLinuxLab(missingInspection), false);
});

test("does not award mastery for a healthy preset, skipped failures, or a broad/root shortcut", () => {
  let healthy = createTinyLinuxMachine("healthy");
  healthy = transitionMachine(runTinyLinux(healthy, "served"));
  for (const stage of tinyLinuxRequiredInspectionStages) {
    healthy = transitionMachine(inspectTinyLinuxStage(healthy, stage));
  }
  assert.equal(canMasterTinyLinuxLab(healthy), false);

  let shortcut = createTinyLinuxMachine();
  shortcut = transitionMachine(runTinyLinux(shortcut, "init-not-executable"));
  shortcut = transitionMachine(setTinyLinuxConfigField(shortcut, "initMode", "0755"));
  shortcut = transitionMachine(runTinyLinux(shortcut, "synack-no-return-route"));
  shortcut = transitionMachine(setTinyLinuxConfigField(shortcut, "defaultGateway", "10.0.0.1"));
  shortcut = transitionMachine(runTinyLinux(shortcut, "report-read-denied"));
  shortcut = transitionMachine(setTinyLinuxConfigField(shortcut, "reportMode", "0640"));
  shortcut = transitionMachine(setTinyLinuxConfigField(shortcut, "serviceUid", 0));
  shortcut = transitionMachine(runTinyLinux(shortcut, "served"));
  for (const stage of tinyLinuxRequiredInspectionStages) {
    shortcut = transitionMachine(inspectTinyLinuxStage(shortcut, stage));
  }
  assert.equal(shortcut.attempts.at(-1).stopCode, "served");
  assert.equal(canMasterTinyLinuxLab(shortcut), false);

  let extraRepair = createTinyLinuxMachine();
  extraRepair = transitionMachine(runTinyLinux(extraRepair, "init-not-executable"));
  extraRepair = transitionMachine(setTinyLinuxConfigField(extraRepair, "initMode", "0755"));
  extraRepair = transitionMachine(setTinyLinuxConfigField(extraRepair, "kernelImagePresent", false));
  extraRepair = transitionMachine(setTinyLinuxConfigField(extraRepair, "kernelImagePresent", true));
  extraRepair = transitionMachine(runTinyLinux(extraRepair, "synack-no-return-route"));
  extraRepair = transitionMachine(setTinyLinuxConfigField(extraRepair, "defaultGateway", "10.0.0.1"));
  extraRepair = transitionMachine(runTinyLinux(extraRepair, "report-read-denied"));
  extraRepair = transitionMachine(setTinyLinuxConfigField(extraRepair, "reportMode", "0640"));
  extraRepair = transitionMachine(runTinyLinux(extraRepair, "served"));
  for (const stage of tinyLinuxRequiredInspectionStages) {
    extraRepair = transitionMachine(inspectTinyLinuxStage(extraRepair, stage));
  }
  assert.equal(canMasterTinyLinuxLab(extraRepair), false);
});

test("rejects tampered state, forged attempts, broken journal hashes, and reordered journal entries", () => {
  const completed = completeLayeredRecovery();
  assert.equal(canMasterTinyLinuxLab(completed), true);

  const changedConfigState = structuredClone(completed);
  changedConfigState.config.reportMode = "0666";
  assert.equal(canMasterTinyLinuxLab(changedConfigState), false);

  const forgedRuntime = structuredClone(completed);
  forgedRuntime.attempts.at(-1).runtime.descriptors.sendFd = 3;
  assert.equal(canMasterTinyLinuxLab(forgedRuntime), false);

  const forgedPrediction = structuredClone(completed);
  forgedPrediction.attempts[0].predictionCorrect = false;
  assert.equal(canMasterTinyLinuxLab(forgedPrediction), false);

  const brokenHash = structuredClone(completed);
  brokenHash.journal[0].hash = "00000000";
  assert.equal(canMasterTinyLinuxLab(brokenHash), false);

  const changedJournalValue = structuredClone(completed);
  const initRepair = changedJournalValue.journal.find(
    (entry) => entry.kind === "config" && entry.field === "initMode",
  );
  initRepair.value = "0644";
  assert.equal(canMasterTinyLinuxLab(changedJournalValue), false);

  const reordered = structuredClone(completed);
  [reordered.journal[0], reordered.journal[1]] = [reordered.journal[1], reordered.journal[0]];
  assert.equal(canMasterTinyLinuxLab(reordered), false);
});

test("grades all four incidents from semantic state and rejects plausible near misses", () => {
  for (const id of tinyLinuxIncidentIds) {
    const evaluation = evaluateTinyLinuxIncident(id, correctIncidents[id]);
    assert.equal(evaluation.correct, true, `${id}: ${evaluation.errors.join(", ")}`);
    assert.deepEqual(evaluation.errors, []);
    assert.ok(Object.keys(evaluation.metrics).length > 0);
  }

  const initDrift = evaluateTinyLinuxIncident("init-handoff", {
    initPath: "/init",
    preserveKernel: false,
    preserveInitramfs: true,
  });
  assert.equal(initDrift.correct, false);
  assert.deepEqual(initDrift.errors, ["artifact-preservation"]);

  const unreaped = evaluateTinyLinuxIncident("pid1-supervision", {
    reapAction: "signal-child",
    restartAction: "replace-pid1",
    restartedPid: 1,
    restartedPpid: 0,
    pid1Remains: false,
  });
  assert.equal(unreaped.correct, false);
  assert.ok(unreaped.errors.includes("reap-action"));
  assert.ok(unreaped.errors.includes("restart-parent"));

  const worldReadable = evaluateTinyLinuxIncident("report-access", {
    serviceUid: 1100,
    serviceGid: 4000,
    directoryMode: "0777",
    reportGroupGid: 4000,
    reportMode: "0666",
  });
  assert.equal(worldReadable.correct, false);
  assert.equal(worldReadable.metrics.guestRead, true);
  assert.ok(worldReadable.errors.includes("least-privilege"));

  const searchableButUnreadable = evaluateTinyLinuxIncident("report-access", {
    serviceUid: 1100,
    serviceGid: 4000,
    directoryMode: "0777",
    reportGroupGid: 4000,
    reportMode: "0600",
  });
  assert.equal(searchableButUnreadable.metrics.guestRead, false);

  const readableButUnsearchable = evaluateTinyLinuxIncident("report-access", {
    serviceUid: 1100,
    serviceGid: 4000,
    directoryMode: "0750",
    reportGroupGid: 4000,
    reportMode: "0666",
  });
  assert.equal(readableButUnsearchable.metrics.guestRead, false);

  const listenerFdSend = evaluateTinyLinuxIncident("remote-listener", {
    listenAddress: "0.0.0.0",
    listenPort: 8080,
    listenerFd: 3,
    acceptedFd: 4,
    fileFd: 5,
    sendFd: 3,
  });
  assert.equal(listenerFdSend.correct, false);
  assert.equal(listenerFdSend.metrics.remoteMatch, true);
  assert.equal(listenerFdSend.metrics.sendUsesAcceptedFd, false);
  assert.ok(listenerFdSend.errors.includes("descriptor-boundary"));
});

test("requires one valid submission for every incident", () => {
  assert.equal(canCompleteTinyLinuxIncidents(correctIncidents), true);
  for (const missing of tinyLinuxIncidentIds) {
    const incomplete = { ...correctIncidents };
    delete incomplete[missing];
    assert.equal(canCompleteTinyLinuxIncidents(incomplete), false, missing);
  }
  assert.equal(canCompleteTinyLinuxIncidents({
    ...correctIncidents,
    "report-access": {
      ...correctIncidents["report-access"],
      reportMode: "0666",
    },
  }), false);
});

test("requires the assembly lab, incident debugger, and concepts together", () => {
  const complete = {
    assemblyLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteTinyLinuxChapter(complete), true);
  for (const missing of Object.keys(complete)) {
    assert.equal(canCompleteTinyLinuxChapter({ ...complete, [missing]: false }), false);
  }
});

test("keeps the prerequisite and optional v86 links at 44px touch targets", async () => {
  const styles = await readFile(new URL("../src/styles/globals.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /\.tiny-system-prerequisite a,\s*\n\.tiny-system-v86-embed a \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 44px;/,
  );
});

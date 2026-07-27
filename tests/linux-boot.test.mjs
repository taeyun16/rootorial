import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  bootOutcomeForPrediction,
  bootConfigPresets,
  bootStageIds,
  canCompleteBootChapter,
  evaluateBootFailure,
  simulateBoot,
} from "../src/features/linux-runtime/boot-sequence.ts";

const healthyConfig = {
  kernelTarget: "buildroot-kernel",
  rootFilesystem: "embedded-rootfs",
  initPath: "/sbin/init",
  initAction: "start-serial-shell",
};

test("crosses firmware, kernel, init, and shell only with a complete boot contract", () => {
  const result = simulateBoot(healthyConfig);
  assert.equal(result.complete, true);
  assert.equal(result.failureCode, null);
  assert.equal(result.passedStages, 4);
  assert.deepEqual(result.events.map(({ stage }) => stage), bootStageIds);
  assert.ok(result.events.every(({ outcome }) => outcome === "passed"));
});

test("stops at the earliest broken boundary and never invents later progress", () => {
  const missingKernel = simulateBoot(bootConfigPresets["missing-kernel"]);
  assert.deepEqual(missingKernel.events, [{
    stage: "firmware",
    outcome: "failed",
    code: "firmware-kernel-missing",
  }]);

  const missingRoot = simulateBoot(bootConfigPresets["missing-root"]);
  assert.equal(missingRoot.failureCode, "kernel-root-unavailable");
  assert.deepEqual(missingRoot.events.map(({ stage }) => stage), ["firmware", "kernel"]);

  const missingInit = simulateBoot(bootConfigPresets["missing-init"]);
  assert.equal(missingInit.failureCode, "init-missing");
  assert.deepEqual(missingInit.events.map(({ stage }) => stage), ["firmware", "kernel", "init"]);

  const missingShell = simulateBoot(bootConfigPresets["missing-shell"]);
  assert.equal(missingShell.failureCode, "shell-not-started");
  assert.equal(missingShell.passedStages, 3);
});

test("maps a pre-run prediction to the first stopped stage or expected prompt", () => {
  assert.equal(
    bootOutcomeForPrediction(simulateBoot(bootConfigPresets["missing-kernel"])),
    "firmware",
  );
  assert.equal(
    bootOutcomeForPrediction(simulateBoot(bootConfigPresets["missing-root"])),
    "kernel",
  );
  assert.equal(
    bootOutcomeForPrediction(simulateBoot(bootConfigPresets["missing-init"])),
    "init",
  );
  assert.equal(
    bootOutcomeForPrediction(simulateBoot(bootConfigPresets["missing-shell"])),
    "shell",
  );
  assert.equal(bootOutcomeForPrediction(simulateBoot(healthyConfig)), "prompt");
});

test("grades a failure diagnosis as a boundary and repair pair", () => {
  assert.deepEqual(
    evaluateBootFailure("missing-root", "kernel-rootfs", "provide-rootfs"),
    { boundaryCorrect: true, repairCorrect: true, correct: true },
  );
  assert.deepEqual(
    evaluateBootFailure("missing-root", "firmware-to-kernel", "provide-rootfs"),
    { boundaryCorrect: false, repairCorrect: true, correct: false },
  );
  assert.deepEqual(
    evaluateBootFailure("missing-root", "kernel-rootfs", "restore-init"),
    { boundaryCorrect: true, repairCorrect: false, correct: false },
  );
});

test("requires both semantic activities and the concept check for chapter completion", () => {
  assert.equal(canCompleteBootChapter({
    bootLabComplete: true,
    diagnosticsComplete: true,
    conceptsMastered: true,
  }), true);
  for (const missing of ["bootLabComplete", "diagnosticsComplete", "conceptsMastered"]) {
    const state = {
      bootLabComplete: true,
      diagnosticsComplete: true,
      conceptsMastered: true,
      [missing]: false,
    };
    assert.equal(canCompleteBootChapter(state), false);
  }
});

test("keeps the visible boot completion checklist aligned with its five-question gate", async () => {
  const chapterSource = await readFile(
    new URL("../src/components/linux/LinuxBootChapter.tsx", import.meta.url),
    "utf8",
  );
  const conceptSource = await readFile(
    new URL("../src/components/linux/LinuxBootConceptCheck.tsx", import.meta.url),
    "utf8",
  );

  assert.match(chapterSource, /이해 확인 5문제/);
  assert.match(chapterSource, /Five concept questions/);
  assert.doesNotMatch(chapterSource, /이해 확인 4문제|Four concept questions/);
  assert.equal((conceptSource.match(/id: "/g) ?? []).length, 5);
});

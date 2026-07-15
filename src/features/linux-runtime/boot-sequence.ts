export const bootStageIds = [
  "firmware",
  "kernel",
  "init",
  "shell",
] as const;

export type BootStageId = (typeof bootStageIds)[number];

export type BootConfig = {
  kernelTarget: "buildroot-kernel" | "missing";
  rootFilesystem: "embedded-rootfs" | "unavailable";
  initPath: "/sbin/init" | "/missing";
  initAction: "start-serial-shell" | "no-shell";
};

export type BootEventCode =
  | "firmware-kernel-ready"
  | "firmware-kernel-missing"
  | "kernel-root-mounted"
  | "kernel-root-unavailable"
  | "init-started"
  | "init-missing"
  | "shell-ready"
  | "shell-not-started";

export type BootEvent = {
  stage: BootStageId;
  outcome: "passed" | "failed";
  code: BootEventCode;
};

export type BootSimulation = {
  events: BootEvent[];
  complete: boolean;
  passedStages: number;
  failureCode: BootEventCode | null;
};

export const bootPredictionIds = [
  "firmware",
  "kernel",
  "init",
  "shell",
  "prompt",
] as const;

export type BootPredictionId = (typeof bootPredictionIds)[number];

export const initialBootConfig: BootConfig = {
  kernelTarget: "missing",
  rootFilesystem: "embedded-rootfs",
  initPath: "/sbin/init",
  initAction: "start-serial-shell",
};

export const bootConfigPresets = {
  "missing-kernel": initialBootConfig,
  "missing-root": {
    kernelTarget: "buildroot-kernel",
    rootFilesystem: "unavailable",
    initPath: "/sbin/init",
    initAction: "start-serial-shell",
  },
  "missing-init": {
    kernelTarget: "buildroot-kernel",
    rootFilesystem: "embedded-rootfs",
    initPath: "/missing",
    initAction: "start-serial-shell",
  },
  "missing-shell": {
    kernelTarget: "buildroot-kernel",
    rootFilesystem: "embedded-rootfs",
    initPath: "/sbin/init",
    initAction: "no-shell",
  },
} as const satisfies Record<string, BootConfig>;

export function simulateBoot(config: BootConfig): BootSimulation {
  const events: BootEvent[] = [];

  if (config.kernelTarget !== "buildroot-kernel") {
    events.push({
      stage: "firmware",
      outcome: "failed",
      code: "firmware-kernel-missing",
    });
    return bootSimulation(events);
  }
  events.push({
    stage: "firmware",
    outcome: "passed",
    code: "firmware-kernel-ready",
  });

  if (config.rootFilesystem !== "embedded-rootfs") {
    events.push({
      stage: "kernel",
      outcome: "failed",
      code: "kernel-root-unavailable",
    });
    return bootSimulation(events);
  }
  events.push({
    stage: "kernel",
    outcome: "passed",
    code: "kernel-root-mounted",
  });

  if (config.initPath !== "/sbin/init") {
    events.push({
      stage: "init",
      outcome: "failed",
      code: "init-missing",
    });
    return bootSimulation(events);
  }
  events.push({ stage: "init", outcome: "passed", code: "init-started" });

  if (config.initAction !== "start-serial-shell") {
    events.push({
      stage: "shell",
      outcome: "failed",
      code: "shell-not-started",
    });
    return bootSimulation(events);
  }
  events.push({ stage: "shell", outcome: "passed", code: "shell-ready" });

  return bootSimulation(events);
}

export function bootOutcomeForPrediction(
  simulation: BootSimulation,
): BootPredictionId {
  const failure = simulation.events.find((event) => event.outcome === "failed");
  return failure?.stage ?? "prompt";
}

function bootSimulation(events: BootEvent[]): BootSimulation {
  const failure = events.find((event) => event.outcome === "failed");
  const passedStages = events.filter((event) => event.outcome === "passed").length;
  return {
    events,
    complete: passedStages === bootStageIds.length && !failure,
    passedStages,
    failureCode: failure?.code ?? null,
  };
}

export const bootFailureScenarioIds = [
  "missing-kernel",
  "missing-root",
  "missing-init",
  "missing-shell",
] as const;

export type BootFailureScenarioId = (typeof bootFailureScenarioIds)[number];

export const bootBoundaryIds = [
  "firmware-to-kernel",
  "kernel-rootfs",
  "kernel-to-init",
  "init-to-shell",
] as const;

export type BootBoundaryId = (typeof bootBoundaryIds)[number];

export const bootRepairIds = [
  "attach-kernel",
  "provide-rootfs",
  "restore-init",
  "start-console-shell",
] as const;

export type BootRepairId = (typeof bootRepairIds)[number];

const bootFailureAnswers = {
  "missing-kernel": {
    boundary: "firmware-to-kernel",
    repair: "attach-kernel",
  },
  "missing-root": {
    boundary: "kernel-rootfs",
    repair: "provide-rootfs",
  },
  "missing-init": {
    boundary: "kernel-to-init",
    repair: "restore-init",
  },
  "missing-shell": {
    boundary: "init-to-shell",
    repair: "start-console-shell",
  },
} as const satisfies Record<
  BootFailureScenarioId,
  { boundary: BootBoundaryId; repair: BootRepairId }
>;

export function evaluateBootFailure(
  scenarioId: BootFailureScenarioId,
  boundary: BootBoundaryId,
  repair: BootRepairId,
) {
  const answer = bootFailureAnswers[scenarioId];
  return {
    boundaryCorrect: boundary === answer.boundary,
    repairCorrect: repair === answer.repair,
    correct: boundary === answer.boundary && repair === answer.repair,
  };
}

export function canCompleteBootChapter({
  bootLabComplete,
  diagnosticsComplete,
  conceptsMastered,
}: {
  bootLabComplete: boolean;
  diagnosticsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return bootLabComplete && diagnosticsComplete && conceptsMastered;
}

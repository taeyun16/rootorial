export const tinyLinuxStageIds = [
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
] as const;

export type TinyLinuxStageId = (typeof tinyLinuxStageIds)[number];

export const tinyLinuxRequiredInspectionStages = [
  "rootfs",
  "pid1",
  "listener",
  "report",
  "response",
] as const satisfies ReadonlyArray<TinyLinuxStageId>;

export type TinyLinuxInspectionStage = (typeof tinyLinuxRequiredInspectionStages)[number];

export const tinyLinuxPresetIds = [
  "layered-recovery",
  "missing-kernel",
  "missing-initramfs",
  "healthy",
] as const;

export type TinyLinuxPresetId = (typeof tinyLinuxPresetIds)[number];

export const tinyLinuxPredictionIds = [
  "kernel-image-missing",
  "initramfs-missing",
  "rootfs-unpack-failed",
  "init-missing",
  "init-not-executable",
  "init-interpreter-missing",
  "pid1-exited",
  "network-interface-missing",
  "network-link-down",
  "network-address-missing",
  "synack-no-return-route",
  "service-exec-denied",
  "listener-not-found",
  "report-path-search-denied",
  "report-read-denied",
  "accepted-fd-missing",
  "served",
] as const;

export type TinyLinuxPredictionId = (typeof tinyLinuxPredictionIds)[number];

export type TinyLinuxConfig = {
  kernelImagePresent: boolean;
  initramfsAttached: boolean;
  rootfsUnpackable: boolean;
  initPath: string;
  initMode: string;
  initInterpreterPresent: boolean;
  pid1KeepsRunning: boolean;
  interfacePresent: boolean;
  linkUp: boolean;
  address: string;
  defaultGateway: string;
  serviceBinaryMode: string;
  serviceUid: number;
  serviceGid: number;
  directoryMode: string;
  reportGroupGid: number;
  reportMode: string;
  listenAddress: string;
  listenPort: number;
  acceptedFdAvailable: boolean;
};

export type TinyLinuxConfigField = keyof TinyLinuxConfig;

export type TinyLinuxRuntime = {
  kernel: { image: string; booted: boolean };
  rootfs: { archive: string; unpacked: boolean; initPath: string };
  pid1: { pid: number | null; path: string; supervising: boolean };
  network: {
    interface: string | null;
    linkUp: boolean;
    address: string | null;
    defaultGateway: string | null;
  };
  service: { pid: number | null; uid: number; gid: number; executable: string };
  report: {
    path: string;
    directoryMode: string;
    groupGid: number;
    mode: string;
    readable: boolean;
    writable: boolean;
    guestReadable: boolean;
    bytes: number;
  };
  descriptors: {
    listenerFd: number | null;
    acceptedFd: number | null;
    reportFd: number | null;
    sendFd: number | null;
  };
  delivery: { sentBytes: number; receivedBytes: number };
};

export type TinyLinuxSimulation = {
  stopCode: TinyLinuxPredictionId;
  stagesReached: ReadonlyArray<TinyLinuxStageId>;
  events: ReadonlyArray<string>;
  runtime: TinyLinuxRuntime;
};

export type TinyLinuxAttempt = TinyLinuxSimulation & {
  id: string;
  prediction: TinyLinuxPredictionId;
  predictionCorrect: boolean;
  inspections: ReadonlyArray<TinyLinuxInspectionStage>;
};

type TinyLinuxConfigJournalEntry = {
  revision: number;
  kind: "config";
  field: TinyLinuxConfigField;
  value: TinyLinuxConfig[TinyLinuxConfigField];
  previousHash: string;
  hash: string;
};

type TinyLinuxRunJournalEntry = {
  revision: number;
  kind: "run";
  prediction: TinyLinuxPredictionId;
  previousHash: string;
  hash: string;
};

type TinyLinuxInspectJournalEntry = {
  revision: number;
  kind: "inspect";
  stage: TinyLinuxInspectionStage;
  previousHash: string;
  hash: string;
};

export type TinyLinuxJournalEntry =
  | TinyLinuxConfigJournalEntry
  | TinyLinuxRunJournalEntry
  | TinyLinuxInspectJournalEntry;

export type TinyLinuxMachine = {
  preset: TinyLinuxPresetId;
  initialConfig: TinyLinuxConfig;
  config: TinyLinuxConfig;
  revision: number;
  attempts: ReadonlyArray<TinyLinuxAttempt>;
  journal: ReadonlyArray<TinyLinuxJournalEntry>;
};

export type TinyLinuxTransitionError =
  | "invalid-config-value"
  | "invalid-prediction"
  | "no-attempt"
  | "stage-not-reached"
  | "stage-already-inspected";

export type TinyLinuxTransition = {
  ok: boolean;
  machine: TinyLinuxMachine;
  error?: TinyLinuxTransitionError;
};

const healthyConfig: TinyLinuxConfig = {
  kernelImagePresent: true,
  initramfsAttached: true,
  rootfsUnpackable: true,
  initPath: "/init",
  initMode: "0755",
  initInterpreterPresent: true,
  pid1KeepsRunning: true,
  interfacePresent: true,
  linkUp: true,
  address: "10.0.0.20/24",
  defaultGateway: "10.0.0.1",
  serviceBinaryMode: "0755",
  serviceUid: 1100,
  serviceGid: 4000,
  directoryMode: "0750",
  reportGroupGid: 4000,
  reportMode: "0640",
  listenAddress: "0.0.0.0",
  listenPort: 8080,
  acceptedFdAvailable: true,
};

function configForPreset(preset: TinyLinuxPresetId): TinyLinuxConfig {
  const config = { ...healthyConfig };
  if (preset === "layered-recovery") {
    config.initMode = "0644";
    config.defaultGateway = "";
    config.reportMode = "0600";
  } else if (preset === "missing-kernel") {
    config.kernelImagePresent = false;
  } else if (preset === "missing-initramfs") {
    config.initramfsAttached = false;
  }
  return config;
}

const booleanFields = new Set<TinyLinuxConfigField>([
  "kernelImagePresent",
  "initramfsAttached",
  "rootfsUnpackable",
  "initInterpreterPresent",
  "pid1KeepsRunning",
  "interfacePresent",
  "linkUp",
  "acceptedFdAvailable",
]);

const numberFields = new Set<TinyLinuxConfigField>([
  "serviceUid",
  "serviceGid",
  "reportGroupGid",
  "listenPort",
]);

const allowedStrings: Partial<Record<TinyLinuxConfigField, ReadonlyArray<string>>> = {
  initPath: ["/init", "/sbin/init", ""],
  initMode: ["0644", "0755"],
  address: ["10.0.0.20/24", ""],
  defaultGateway: ["10.0.0.1", ""],
  serviceBinaryMode: ["0644", "0755"],
  directoryMode: ["0700", "0750", "0777"],
  reportMode: ["0600", "0640", "0666"],
  listenAddress: ["127.0.0.1", "0.0.0.0"],
};

function isValidConfigValue(
  field: TinyLinuxConfigField,
  value: TinyLinuxConfig[TinyLinuxConfigField],
): boolean {
  if (booleanFields.has(field)) return typeof value === "boolean";
  if (numberFields.has(field)) return typeof value === "number" && Number.isInteger(value) && value >= 0;
  return typeof value === "string" && (allowedStrings[field]?.includes(value) ?? false);
}

function emptyRuntime(config: TinyLinuxConfig): TinyLinuxRuntime {
  return {
    kernel: { image: "bzImage", booted: false },
    rootfs: { archive: "initramfs.cpio", unpacked: false, initPath: config.initPath },
    pid1: { pid: null, path: config.initPath, supervising: false },
    network: { interface: null, linkUp: false, address: null, defaultGateway: null },
    service: { pid: null, uid: config.serviceUid, gid: config.serviceGid, executable: "/usr/bin/reportd" },
    report: {
      path: "/srv/report.txt",
      directoryMode: config.directoryMode,
      groupGid: config.reportGroupGid,
      mode: config.reportMode,
      readable: false,
      writable: false,
      guestReadable: false,
      bytes: 18,
    },
    descriptors: { listenerFd: null, acceptedFd: null, reportFd: null, sendFd: null },
    delivery: { sentBytes: 0, receivedBytes: 0 },
  };
}

export function simulateTinyLinux(config: TinyLinuxConfig): TinyLinuxSimulation {
  const stages: TinyLinuxStageId[] = [];
  const events: string[] = [];
  const runtime = emptyRuntime(config);
  const stop = (stopCode: TinyLinuxPredictionId): TinyLinuxSimulation => ({
    stopCode,
    stagesReached: stages,
    events,
    runtime,
  });

  if (!config.kernelImagePresent) {
    events.push("firmware: kernel image bzImage not found");
    return stop("kernel-image-missing");
  }
  runtime.kernel.booted = true;
  stages.push("kernel");
  events.push("kernel: bzImage entered");

  if (!config.initramfsAttached) {
    events.push("kernel: no initramfs attached");
    return stop("initramfs-missing");
  }
  if (!config.rootfsUnpackable) {
    events.push("kernel: initramfs unpack failed");
    return stop("rootfs-unpack-failed");
  }
  runtime.rootfs.unpacked = true;
  stages.push("rootfs");
  events.push("kernel: initramfs unpacked at /");

  if (config.initPath !== "/init") {
    events.push(`kernel: ${config.initPath || "init"} missing from initramfs`);
    return stop("init-missing");
  }
  if (config.initMode !== "0755") {
    events.push("kernel: /init exists but is not executable");
    return stop("init-not-executable");
  }
  if (!config.initInterpreterPresent) {
    events.push("kernel: /init interpreter is missing");
    return stop("init-interpreter-missing");
  }
  stages.push("init");
  runtime.pid1.pid = 1;
  events.push("kernel: exec /init as PID 1");

  if (!config.pid1KeepsRunning) {
    events.push("init: PID 1 exited before supervision");
    return stop("pid1-exited");
  }
  runtime.pid1.supervising = true;
  stages.push("pid1");
  events.push("init[1]: mounted /proc and supervising children");

  if (!config.interfacePresent) {
    events.push("init[1]: eth0 device is absent");
    return stop("network-interface-missing");
  }
  runtime.network.interface = "eth0";
  if (!config.linkUp) {
    events.push("init[1]: eth0 remains DOWN");
    return stop("network-link-down");
  }
  runtime.network.linkUp = true;
  if (config.address !== "10.0.0.20/24") {
    events.push("init[1]: eth0 has no service address");
    return stop("network-address-missing");
  }
  runtime.network.address = config.address;
  runtime.network.defaultGateway = config.defaultGateway || null;
  stages.push("network");
  events.push(`init[1]: eth0 UP ${config.address}`);

  if (config.serviceBinaryMode !== "0755") {
    events.push("init[1]: /usr/bin/reportd is not executable");
    return stop("service-exec-denied");
  }
  runtime.service.pid = 7;
  stages.push("service");
  events.push(`reportd[7]: exec uid=${config.serviceUid} gid=${config.serviceGid}`);

  if (config.listenAddress !== "0.0.0.0" || config.listenPort !== 8080) {
    events.push(`reportd[7]: listener ${config.listenAddress}:${config.listenPort} does not match remote target`);
    return stop("listener-not-found");
  }
  runtime.descriptors.listenerFd = 3;
  stages.push("listener");
  events.push("reportd[7]: LISTEN 0.0.0.0:8080 fd=3");

  if (config.defaultGateway !== "10.0.0.1") {
    events.push("kernel: SYN arrived, but SYN-ACK has no return route");
    return stop("synack-no-return-route");
  }
  if (!config.acceptedFdAvailable) {
    events.push("reportd[7]: listener is ready, but accept produced no connected fd");
    return stop("accepted-fd-missing");
  }
  runtime.descriptors.acceptedFd = 4;
  stages.push("accept");
  events.push("reportd[7]: accept listener fd=3 -> connected fd=4");

  if (config.directoryMode !== "0750" || config.serviceGid !== config.reportGroupGid) {
    events.push("reportd[7]: path search denied at /srv");
    return stop("report-path-search-denied");
  }
  const groupReadable = config.reportMode === "0640" && config.serviceGid === config.reportGroupGid;
  runtime.report.readable = groupReadable;
  runtime.report.writable = false;
  runtime.report.guestReadable = config.reportMode === "0666";
  if (!groupReadable) {
    events.push("reportd[7]: open('/srv/report.txt') = EACCES");
    return stop("report-read-denied");
  }
  runtime.descriptors.reportFd = 5;
  stages.push("report");
  events.push("reportd[7]: read fd=5 -> 18 bytes");

  runtime.descriptors.sendFd = 4;
  runtime.delivery.sentBytes = runtime.report.bytes;
  runtime.delivery.receivedBytes = runtime.report.bytes;
  stages.push("response");
  events.push("reportd[7]: send fd=4 -> peer recv 18 bytes");
  return stop("served");
}

const initialHash = "tiny-linux-v1";

function stableValue(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) return `[${value.map(stableValue).join(",")}]`;
  return `{${Object.entries(value as Record<string, unknown>)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
    .join(",")}}`;
}

function hashEntry(previousHash: string, core: object): string {
  const input = `${previousHash}|${stableValue(core)}`;
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, "0");
}

function appendEntry<Core extends Omit<TinyLinuxJournalEntry, "revision" | "previousHash" | "hash">>(
  machine: TinyLinuxMachine,
  core: Core,
): TinyLinuxJournalEntry {
  const previousHash = machine.journal.at(-1)?.hash ?? initialHash;
  const revision = machine.revision + 1;
  return {
    ...core,
    revision,
    previousHash,
    hash: hashEntry(previousHash, { ...core, revision }),
  } as unknown as TinyLinuxJournalEntry;
}

function rebuildMachine(preset: TinyLinuxPresetId, journal: ReadonlyArray<TinyLinuxJournalEntry>): TinyLinuxMachine | null {
  const initialConfig = configForPreset(preset);
  let config = { ...initialConfig };
  let attempts: TinyLinuxAttempt[] = [];
  let previousHash = initialHash;
  let revision = 0;

  for (const entry of journal) {
    revision += 1;
    if (entry.revision !== revision || entry.previousHash !== previousHash) return null;
    const { hash: _hash, previousHash: _previousHash, ...coreWithRevision } = entry;
    const expectedHash = hashEntry(previousHash, coreWithRevision);
    if (entry.hash !== expectedHash) return null;
    previousHash = entry.hash;

    if (entry.kind === "config") {
      if (!isValidConfigValue(entry.field, entry.value)) return null;
      config = { ...config, [entry.field]: entry.value };
    } else if (entry.kind === "run") {
      if (!tinyLinuxPredictionIds.includes(entry.prediction)) return null;
      const simulation = simulateTinyLinux(config);
      attempts = [
        ...attempts,
        {
          ...simulation,
          id: `attempt-${attempts.length + 1}`,
          prediction: entry.prediction,
          predictionCorrect: simulation.stopCode === entry.prediction,
          inspections: [],
        },
      ];
    } else {
      const latest = attempts.at(-1);
      if (!latest || !latest.stagesReached.includes(entry.stage) || latest.inspections.includes(entry.stage)) return null;
      attempts = [
        ...attempts.slice(0, -1),
        { ...latest, inspections: [...latest.inspections, entry.stage] },
      ];
    }
  }

  return { preset, initialConfig, config, revision, attempts, journal: [...journal] };
}

export function createTinyLinuxMachine(
  preset: TinyLinuxPresetId = "layered-recovery",
): TinyLinuxMachine {
  const normalizedPreset = tinyLinuxPresetIds.includes(preset) ? preset : "layered-recovery";
  const initialConfig = configForPreset(normalizedPreset);
  return {
    preset: normalizedPreset,
    initialConfig,
    config: { ...initialConfig },
    revision: 0,
    attempts: [],
    journal: [],
  };
}

export function setTinyLinuxConfigField<Field extends TinyLinuxConfigField>(
  machine: TinyLinuxMachine,
  field: Field,
  value: TinyLinuxConfig[Field],
): TinyLinuxTransition {
  if (!isValidConfigValue(field, value)) return { ok: false, machine, error: "invalid-config-value" };
  const entry = appendEntry(machine, { kind: "config", field, value } as Omit<TinyLinuxConfigJournalEntry, "revision" | "previousHash" | "hash">);
  const next = rebuildMachine(machine.preset, [...machine.journal, entry]);
  return next ? { ok: true, machine: next } : { ok: false, machine, error: "invalid-config-value" };
}

export function runTinyLinux(
  machine: TinyLinuxMachine,
  prediction: TinyLinuxPredictionId,
): TinyLinuxTransition {
  if (!tinyLinuxPredictionIds.includes(prediction)) return { ok: false, machine, error: "invalid-prediction" };
  const entry = appendEntry(machine, { kind: "run", prediction } as Omit<TinyLinuxRunJournalEntry, "revision" | "previousHash" | "hash">);
  const next = rebuildMachine(machine.preset, [...machine.journal, entry]);
  return next ? { ok: true, machine: next } : { ok: false, machine, error: "invalid-prediction" };
}

export function inspectTinyLinuxStage(
  machine: TinyLinuxMachine,
  stage: TinyLinuxInspectionStage,
): TinyLinuxTransition {
  const latest = machine.attempts.at(-1);
  if (!latest) return { ok: false, machine, error: "no-attempt" };
  if (!latest.stagesReached.includes(stage)) return { ok: false, machine, error: "stage-not-reached" };
  if (latest.inspections.includes(stage)) return { ok: false, machine, error: "stage-already-inspected" };
  const entry = appendEntry(machine, { kind: "inspect", stage } as Omit<TinyLinuxInspectJournalEntry, "revision" | "previousHash" | "hash">);
  const next = rebuildMachine(machine.preset, [...machine.journal, entry]);
  return next ? { ok: true, machine: next } : { ok: false, machine, error: "stage-not-reached" };
}

function sameMachine(left: TinyLinuxMachine, right: TinyLinuxMachine): boolean {
  return stableValue(left) === stableValue(right);
}

function hasRequiredMasteryJournal(machine: TinyLinuxMachine): boolean {
  const expectedStops: ReadonlyArray<TinyLinuxPredictionId> = [
    "init-not-executable",
    "synack-no-return-route",
    "report-read-denied",
    "served",
  ];
  const expectedRepairs: ReadonlyArray<{
    field: TinyLinuxConfigField;
    value: TinyLinuxConfig[TinyLinuxConfigField];
  }> = [
    { field: "initMode", value: "0755" },
    { field: "defaultGateway", value: "10.0.0.1" },
    { field: "reportMode", value: "0640" },
  ];
  let phase = 0;
  let attemptIndex = 0;
  let observedExpectedStop = false;

  for (const entry of machine.journal) {
    if (entry.kind === "run") {
      const attempt = machine.attempts[attemptIndex];
      attemptIndex += 1;
      if (!attempt || phase >= expectedStops.length) return false;
      if (attempt.predictionCorrect && attempt.stopCode === expectedStops[phase]) {
        observedExpectedStop = true;
        if (phase === expectedRepairs.length) phase += 1;
      }
      continue;
    }
    if (entry.kind === "config") {
      const expected = expectedRepairs[phase];
      if (!expected
        || !observedExpectedStop
        || entry.field !== expected.field
        || entry.value !== expected.value) return false;
      phase += 1;
      observedExpectedStop = false;
    }
  }

  return phase === expectedStops.length && attemptIndex === machine.attempts.length;
}

export function canMasterTinyLinuxLab(machine: TinyLinuxMachine): boolean {
  if (machine.preset !== "layered-recovery") return false;
  const rebuilt = rebuildMachine(machine.preset, machine.journal);
  if (!rebuilt || !sameMachine(machine, rebuilt)) return false;
  if (!hasRequiredMasteryJournal(rebuilt)) return false;
  const finalAttempt = rebuilt.attempts.at(-1);
  if (!finalAttempt || !tinyLinuxRequiredInspectionStages.every((stage) => finalAttempt.inspections.includes(stage))) return false;
  return rebuilt.config.initMode === "0755"
    && rebuilt.config.defaultGateway === "10.0.0.1"
    && rebuilt.config.reportMode === "0640"
    && finalAttempt.runtime.pid1.pid === 1
    && finalAttempt.runtime.service.pid === 7
    && finalAttempt.runtime.service.uid === 1100
    && finalAttempt.runtime.service.gid === 4000
    && finalAttempt.runtime.report.readable
    && !finalAttempt.runtime.report.writable
    && !finalAttempt.runtime.report.guestReadable
    && finalAttempt.runtime.descriptors.listenerFd === 3
    && finalAttempt.runtime.descriptors.acceptedFd === 4
    && finalAttempt.runtime.descriptors.reportFd === 5
    && finalAttempt.runtime.descriptors.sendFd === 4
    && finalAttempt.runtime.delivery.sentBytes === finalAttempt.runtime.delivery.receivedBytes;
}

export const tinyLinuxIncidentIds = [
  "init-handoff",
  "pid1-supervision",
  "report-access",
  "remote-listener",
] as const;

export type TinyLinuxIncidentId = (typeof tinyLinuxIncidentIds)[number];

export type TinyLinuxIncidentSubmission = {
  initPath?: string;
  preserveKernel?: boolean;
  preserveInitramfs?: boolean;
  reapAction?: string;
  restartAction?: string;
  restartedPid?: number;
  restartedPpid?: number;
  pid1Remains?: boolean;
  serviceUid?: number;
  serviceGid?: number;
  directoryMode?: string;
  reportGroupGid?: number;
  reportMode?: string;
  listenAddress?: string;
  listenPort?: number;
  listenerFd?: number;
  acceptedFd?: number;
  fileFd?: number;
  sendFd?: number;
};

export type TinyLinuxIncidentEvaluation = {
  correct: boolean;
  errors: ReadonlyArray<string>;
  metrics: Readonly<Record<string, boolean | number | string>>;
};

export function evaluateTinyLinuxIncident(
  id: TinyLinuxIncidentId,
  submission: TinyLinuxIncidentSubmission,
): TinyLinuxIncidentEvaluation {
  const errors: string[] = [];
  let metrics: Record<string, boolean | number | string> = {};

  if (id === "init-handoff") {
    if (submission.initPath !== "/init") errors.push("init-path");
    if (submission.preserveKernel !== true || submission.preserveInitramfs !== true) errors.push("artifact-preservation");
    metrics = {
      kernelPreserved: submission.preserveKernel === true,
      initramfsPreserved: submission.preserveInitramfs === true,
      pidOnePath: submission.initPath ?? "",
    };
  } else if (id === "pid1-supervision") {
    if (submission.reapAction !== "wait-child") errors.push("reap-action");
    if (submission.restartAction !== "spawn-child"
      || submission.restartedPid !== 8
      || submission.restartedPpid !== 1
      || submission.pid1Remains !== true) errors.push("restart-parent");
    metrics = {
      zombieReaped: submission.reapAction === "wait-child",
      childRestarted: submission.restartAction === "spawn-child" && submission.restartedPid === 8,
      pidOneStillSupervises: submission.restartedPpid === 1 && submission.pid1Remains === true,
    };
  } else if (id === "report-access") {
    if (submission.serviceUid !== 1100 || submission.serviceGid !== 4000) errors.push("service-identity");
    if (submission.directoryMode !== "0750") errors.push("directory-contract");
    if (submission.reportGroupGid !== 4000 || submission.reportMode !== "0640") errors.push("report-contract");
    const servicePathSearch = submission.serviceGid === 4000
      && (submission.directoryMode === "0750" || submission.directoryMode === "0777");
    const serviceRead = servicePathSearch
      && submission.reportGroupGid === 4000
      && (submission.reportMode === "0640" || submission.reportMode === "0666");
    const serviceAppend = servicePathSearch && submission.reportMode === "0666";
    const guestRead = submission.directoryMode === "0777" && submission.reportMode === "0666";
    if (!serviceRead || serviceAppend || guestRead) errors.push("least-privilege");
    metrics = { serviceRead, serviceAppend, guestRead };
  } else if (id === "remote-listener") {
    if (submission.listenAddress !== "0.0.0.0" || submission.listenPort !== 8080) errors.push("listener-address");
    const descriptorBoundary = submission.listenerFd === 3
      && submission.acceptedFd === 4
      && submission.fileFd === 5
      && submission.sendFd === 4
      && Number(submission.listenerFd) !== Number(submission.acceptedFd);
    if (!descriptorBoundary) errors.push("descriptor-boundary");
    metrics = {
      remoteMatch: submission.listenAddress === "0.0.0.0" && submission.listenPort === 8080,
      descriptorBoundary,
      sendUsesAcceptedFd: submission.sendFd === submission.acceptedFd,
    };
  } else {
    errors.push("incomplete");
  }

  return { correct: errors.length === 0, errors, metrics };
}

export function canCompleteTinyLinuxIncidents(
  record: Partial<Record<TinyLinuxIncidentId, TinyLinuxIncidentSubmission>>,
): boolean {
  return tinyLinuxIncidentIds.every((id) => evaluateTinyLinuxIncident(id, record[id] ?? {}).correct);
}

export function canCompleteTinyLinuxChapter({
  assemblyLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  assemblyLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return assemblyLabComplete && incidentsComplete && conceptsMastered;
}

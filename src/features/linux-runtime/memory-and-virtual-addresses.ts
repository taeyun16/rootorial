export const MEMORY_PAGE_SIZE = 4096;

export type MemoryProcessId = "parent" | "child";
export type MemoryOperation = "read" | "write" | "execute";
export type MemoryPrediction =
  | "mapped"
  | "cow-copy"
  | "demand-zero"
  | "protection-fault"
  | "segmentation-fault";

export type MemoryRegion = "code" | "heap" | "anonymous" | "stack";

export type PageTableEntry = {
  vpn: number;
  frame: number | null;
  present: boolean;
  readable: boolean;
  writable: boolean;
  executable: boolean;
  vmaReadable: boolean;
  vmaWritable: boolean;
  vmaExecutable: boolean;
  cow: boolean;
  region: MemoryRegion;
};

export type MemoryProcess = {
  pid: number;
  pages: PageTableEntry[];
};

export type PhysicalFrame = {
  id: number;
  bytes: Record<number, number>;
  source: "file" | "anonymous" | "zero-page";
};

export type VirtualMemoryMachine = {
  processes: Record<MemoryProcessId, MemoryProcess>;
  frames: PhysicalFrame[];
  nextFrame: number;
};

export type MemoryAccessResult = {
  machine: VirtualMemoryMachine;
  prediction: MemoryPrediction;
  processId: MemoryProcessId;
  operation: MemoryOperation;
  virtualAddress: number;
  vpn: number;
  offset: number;
  frame: number | null;
  physicalAddress: number | null;
  value: number | null;
  resumed: boolean;
};

function page(
  vpn: number,
  frame: number | null,
  region: MemoryRegion,
  permissions: Pick<PageTableEntry, "readable" | "writable" | "executable">,
  overrides: Partial<PageTableEntry> = {},
): PageTableEntry {
  return {
    vpn,
    frame,
    region,
    present: frame !== null,
    cow: false,
    ...permissions,
    vmaReadable: permissions.readable,
    vmaWritable: permissions.writable,
    vmaExecutable: permissions.executable,
    ...overrides,
  };
}

export function createVirtualMemoryMachine(): VirtualMemoryMachine {
  const sharedPages = [
    page(0x1, 2, "code", { readable: true, writable: false, executable: true }),
    page(0x4, 7, "heap", { readable: true, writable: false, executable: false }, { cow: true, vmaWritable: true }),
    page(0x5, null, "anonymous", { readable: true, writable: true, executable: false }),
  ];
  return {
    processes: {
      parent: {
        pid: 420,
        pages: [
          ...sharedPages.map((entry) => ({ ...entry })),
          page(0x7, 9, "stack", { readable: true, writable: true, executable: false }),
        ],
      },
      child: {
        pid: 421,
        pages: [
          ...sharedPages.map((entry) => ({ ...entry })),
          page(0x7, 10, "stack", { readable: true, writable: true, executable: false }),
        ],
      },
    },
    frames: [
      { id: 0, bytes: {}, source: "zero-page" },
      { id: 2, bytes: { [0x18]: 204 }, source: "file" },
      { id: 7, bytes: { [0x18]: 41 }, source: "anonymous" },
      { id: 9, bytes: { [0x18]: 70 }, source: "anonymous" },
      { id: 10, bytes: { [0x18]: 71 }, source: "anonymous" },
    ],
    nextFrame: 12,
  };
}

function cloneMachine(machine: VirtualMemoryMachine): VirtualMemoryMachine {
  return {
    processes: {
      parent: {
        ...machine.processes.parent,
        pages: machine.processes.parent.pages.map((entry) => ({ ...entry })),
      },
      child: {
        ...machine.processes.child,
        pages: machine.processes.child.pages.map((entry) => ({ ...entry })),
      },
    },
    frames: machine.frames.map((frame) => ({ ...frame, bytes: { ...frame.bytes } })),
    nextFrame: machine.nextFrame,
  };
}

export function parseVirtualAddress(value: string): number | null {
  const input = value.trim().toLowerCase();
  if (!/^(?:0x[0-9a-f]+|[0-9]+)$/.test(input)) return null;
  const parsed = Number.parseInt(input, input.startsWith("0x") ? 16 : 10);
  return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= 0xffff ? parsed : null;
}

export function splitVirtualAddress(virtualAddress: number) {
  return {
    vpn: Math.floor(virtualAddress / MEMORY_PAGE_SIZE),
    offset: virtualAddress % MEMORY_PAGE_SIZE,
  };
}

export function expectedMemoryPrediction(
  machine: VirtualMemoryMachine,
  processId: MemoryProcessId,
  virtualAddress: number,
  operation: MemoryOperation,
): MemoryPrediction {
  const { vpn } = splitVirtualAddress(virtualAddress);
  const entry = machine.processes[processId].pages.find((candidate) => candidate.vpn === vpn);
  if (!entry) return "segmentation-fault";
  if (!entry.present) {
    const vmaAllowed = operation === "read"
      ? entry.vmaReadable
      : operation === "write"
        ? entry.vmaWritable
        : entry.vmaExecutable;
    if (!vmaAllowed) return "protection-fault";
    return entry.region === "anonymous" ? "demand-zero" : "segmentation-fault";
  }
  if (operation === "write" && entry.cow) return "cow-copy";
  const allowed = operation === "read"
    ? entry.readable
    : operation === "write"
      ? entry.writable
      : entry.executable;
  return allowed ? "mapped" : "protection-fault";
}

export function accessVirtualMemory(
  current: VirtualMemoryMachine,
  processId: MemoryProcessId,
  virtualAddress: number,
  operation: MemoryOperation,
  writeValue = 99,
): MemoryAccessResult {
  const machine = cloneMachine(current);
  const { vpn, offset } = splitVirtualAddress(virtualAddress);
  const entry = machine.processes[processId].pages.find((candidate) => candidate.vpn === vpn);
  const prediction = expectedMemoryPrediction(current, processId, virtualAddress, operation);

  if (!entry || prediction === "segmentation-fault" || prediction === "protection-fault") {
    return {
      machine,
      prediction,
      processId,
      operation,
      virtualAddress,
      vpn,
      offset,
      frame: entry?.frame ?? null,
      physicalAddress: null,
      value: null,
      resumed: false,
    };
  }

  if (prediction === "demand-zero") {
    entry.present = true;
    if (operation === "read") {
      entry.frame = 0;
      entry.writable = false;
      entry.cow = true;
    } else {
      const frame = machine.nextFrame;
      machine.nextFrame += 1;
      entry.frame = frame;
      machine.frames.push({ id: frame, bytes: {}, source: "anonymous" });
    }
  }

  if (prediction === "cow-copy") {
    const source = machine.frames.find((candidate) => candidate.id === entry.frame);
    const frame = machine.nextFrame;
    machine.nextFrame += 1;
    entry.frame = frame;
    entry.cow = false;
    entry.writable = true;
    machine.frames.push({ id: frame, bytes: { ...source?.bytes }, source: "anonymous" });
  }

  const frame = machine.frames.find((candidate) => candidate.id === entry.frame);
  if (operation === "write" && frame) frame.bytes[offset] = writeValue;
  return {
    machine,
    prediction,
    processId,
    operation,
    virtualAddress,
    vpn,
    offset,
    frame: entry.frame,
    physicalAddress: entry.frame === null ? null : entry.frame * MEMORY_PAGE_SIZE + offset,
    value: frame?.bytes[offset] ?? 0,
    resumed: true,
  };
}

export function heapIsolation(machine: VirtualMemoryMachine) {
  const parentEntry = machine.processes.parent.pages.find((entry) => entry.vpn === 0x4);
  const childEntry = machine.processes.child.pages.find((entry) => entry.vpn === 0x4);
  const parentFrame = machine.frames.find((frame) => frame.id === parentEntry?.frame);
  const childFrame = machine.frames.find((frame) => frame.id === childEntry?.frame);
  return {
    parentFrame: parentEntry?.frame ?? null,
    childFrame: childEntry?.frame ?? null,
    parentValue: parentFrame?.bytes[0x18] ?? 0,
    childValue: childFrame?.bytes[0x18] ?? 0,
    sharedCow: parentEntry?.frame === childEntry?.frame
      && parentEntry?.cow === true
      && childEntry?.cow === true,
    separated: parentEntry?.frame !== childEntry?.frame,
    isolated: parentEntry?.frame !== childEntry?.frame
      && parentFrame?.bytes[0x18] === 41
      && childFrame?.bytes[0x18] !== undefined
      && childFrame.bytes[0x18] !== 41,
  };
}

export type MemoryLabEvidence = {
  sharedReadPredicted: boolean;
  offsetPreserved: boolean;
  cowWritePredicted: boolean;
  isolationVerified: boolean;
  demandFaultPredicted: boolean;
};

export function memoryLabEvidenceAfterAccess(
  before: VirtualMemoryMachine,
  access: MemoryAccessResult,
  predictionCorrect: boolean,
  current: MemoryLabEvidence,
): MemoryLabEvidence {
  const beforeHeap = heapIsolation(before);
  const offsetPreserved = access.physicalAddress !== null
    && access.physicalAddress % MEMORY_PAGE_SIZE === access.offset;
  return {
    ...current,
    sharedReadPredicted: current.sharedReadPredicted || (
      beforeHeap.sharedCow
      && access.processId === "child"
      && access.virtualAddress === 0x4018
      && access.operation === "read"
      && predictionCorrect
    ),
    offsetPreserved: current.offsetPreserved || offsetPreserved,
    cowWritePredicted: current.cowWritePredicted || (
      beforeHeap.sharedCow
      && access.processId === "child"
      && access.virtualAddress === 0x4018
      && access.operation === "write"
      && access.prediction === "cow-copy"
      && predictionCorrect
    ),
    isolationVerified: current.isolationVerified || heapIsolation(access.machine).isolated,
    demandFaultPredicted: current.demandFaultPredicted || (
      access.processId === "parent"
      && access.virtualAddress === 0x5018
      && access.operation === "write"
      && access.prediction === "demand-zero"
      && predictionCorrect
    ),
  };
}

export function canMasterVirtualMemoryLab(
  machine: VirtualMemoryMachine,
  evidence: MemoryLabEvidence,
) {
  const demandPage = machine.processes.parent.pages.find((entry) => entry.vpn === 0x5);
  return Object.values(evidence).every(Boolean)
    && heapIsolation(machine).isolated
    && demandPage?.present === true
    && demandPage.frame !== null;
}

export const memoryIncidentIds = ["translation", "tlb-miss", "cow-isolation", "maps-residency"] as const;
export type MemoryIncidentId = (typeof memoryIncidentIds)[number];

export type MemoryIncidentSubmission = {
  vpn?: number;
  offset?: number;
  physicalAddress?: number;
  parentFrame?: number;
  childFrame?: number;
  parentValue?: number;
  childValue?: number;
  ptePresent?: boolean;
  tlbOutcome?: "page-table-walk" | "page-fault" | "segmentation-fault";
  mappedPages?: number;
  residentPages?: number;
  residencyConclusion?: "all-mapped-resident" | "mapped-not-resident" | "rss-is-virtual";
};

export type MemoryIncidentEvaluation = {
  correct: boolean;
  errors: readonly string[];
};

export function evaluateMemoryIncident(
  id: MemoryIncidentId,
  submission: MemoryIncidentSubmission,
): MemoryIncidentEvaluation {
  const errors: string[] = [];
  if (id === "translation") {
    if (submission.vpn !== 0x2) errors.push("vpn");
    if (submission.offset !== 0xabc) errors.push("offset");
    if (submission.physicalAddress !== 0x9abc) errors.push("physical-address");
  } else if (id === "tlb-miss") {
    if (submission.ptePresent !== true) errors.push("pte-present");
    if (submission.tlbOutcome !== "page-table-walk") errors.push("tlb-outcome");
  } else if (id === "cow-isolation") {
    if (submission.parentFrame !== 7) errors.push("parent-frame");
    if (
      submission.childFrame === undefined
      || !Number.isInteger(submission.childFrame)
      || submission.childFrame < 0
      || submission.childFrame === submission.parentFrame
      || [0, 2, 9, 10].includes(submission.childFrame)
    ) errors.push("child-frame");
    if (submission.parentValue !== 41) errors.push("parent-value");
    if (submission.childValue !== 99) errors.push("child-value");
  } else {
    if (submission.mappedPages !== 6) errors.push("mapped-pages");
    if (submission.residentPages !== 3) errors.push("resident-pages");
    if (submission.residencyConclusion !== "mapped-not-resident") errors.push("residency-conclusion");
  }
  return { correct: errors.length === 0, errors };
}

export function canCompleteMemoryChapter({
  memoryLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  memoryLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}) {
  return memoryLabComplete && incidentsComplete && conceptsMastered;
}

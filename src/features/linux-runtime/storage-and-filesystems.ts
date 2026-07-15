export type StorageDeviceId = "rootfs" | "datafs";

export const STORAGE_BLOCK_SIZE = 4096;

export type StorageExtent = Readonly<{
  logicalStart: number;
  blockCount: number;
  deviceBlockStart: number;
}>;

export type StorageInode = Readonly<{
  id: number;
  kind: "directory" | "file";
  sizeBytes: number;
  linkCount: number;
  openRefs: number;
  extents: readonly StorageExtent[];
  persistedData: string;
  cachedData: string;
  dirty: boolean;
}>;

export type StorageDirectoryEntry = Readonly<{
  directoryInode: number;
  name: string;
  inode: number;
}>;

export type StorageFileSystem = Readonly<{
  device: StorageDeviceId;
  rootInode: number;
  inodes: readonly StorageInode[];
  entries: readonly StorageDirectoryEntry[];
  freeBlocks: number;
  freeInodes: number;
}>;

export type StorageMount = Readonly<{
  path: string;
  device: StorageDeviceId;
  active: boolean;
}>;

export type StorageReference = Readonly<{
  handleId: number;
  device: StorageDeviceId;
  inode: number;
}>;

export type StorageCrashSnapshot = Readonly<{
  device: StorageDeviceId;
  inode: number;
  hadDirtyData: boolean;
  beforeCachedData: string;
  beforePersistedData: string;
  afterData: string;
}>;

export type StorageEvent =
  | Readonly<{
      kind: "link";
      sourcePath: string;
      targetPath: string;
      device: StorageDeviceId;
      inode: number;
    }>
  | Readonly<{
      kind: "unlink";
      path: string;
      device: StorageDeviceId;
      inode: number;
      remainingLinks: number;
      retainedByOpenReference: boolean;
    }>
  | Readonly<{
      kind: "open" | "close";
      handleId: number;
      device: StorageDeviceId;
      inode: number;
      openRefs: number;
    }>
  | Readonly<{
      kind: "write";
      path: string;
      device: StorageDeviceId;
      inode: number;
      value: string;
      persistedBefore: string;
    }>
  | Readonly<{
      kind: "fsync";
      path: string;
      device: StorageDeviceId;
      inode: number;
      value: string;
    }>
  | Readonly<{
      kind: "crash";
      snapshots: readonly StorageCrashSnapshot[];
    }>;

export type StorageMachine = Readonly<{
  filesystems: Readonly<Record<StorageDeviceId, StorageFileSystem>>;
  mounts: readonly StorageMount[];
  openHandles: readonly StorageReference[];
  nextHandleId: number;
  history: readonly StorageEvent[];
}>;

export type StoragePathStep =
  | Readonly<{
      kind: "directory-entry";
      device: StorageDeviceId;
      directoryInode: number;
      name: string;
      inode: number;
    }>
  | Readonly<{
      kind: "mount";
      mountPoint: string;
      fromDevice: StorageDeviceId;
      hiddenInode: number;
      toDevice: StorageDeviceId;
      rootInode: number;
    }>;

export type StorageBlockTrace = Readonly<{
  device: StorageDeviceId;
  inode: number;
  logicalBlock: number;
  deviceBlock: number;
}>;

export type StoragePathResolution = Readonly<{
  path: string;
  found: boolean;
  error: "invalid-path" | "not-found" | "not-directory" | null;
  device: StorageDeviceId | null;
  inode: StorageInode | null;
  steps: readonly StoragePathStep[];
  blocks: readonly StorageBlockTrace[];
}>;

export type StorageOffsetTrace = Readonly<{
  path: string;
  byteOffset: number;
  found: boolean;
  error: StoragePathResolution["error"] | "offset-out-of-range";
  device: StorageDeviceId | null;
  inode: number | null;
  logicalBlock: number | null;
  inBlockOffset: number | null;
  deviceBlock: number | null;
  deviceByteAddress: number | null;
}>;

export type StorageOperationError =
  | "invalid-path"
  | "not-found"
  | "not-directory"
  | "already-exists"
  | "is-directory"
  | "cross-device-link"
  | "invalid-reference";

export type StorageOperationResult = Readonly<{
  machine: StorageMachine;
  ok: boolean;
  error: StorageOperationError | null;
  reference: StorageReference | null;
}>;

function inode(
  id: number,
  kind: StorageInode["kind"],
  overrides: Partial<Omit<StorageInode, "id" | "kind">> = {},
): StorageInode {
  return Object.freeze({
    id,
    kind,
    sizeBytes: 0,
    linkCount: 1,
    openRefs: 0,
    extents: Object.freeze([]) as readonly StorageExtent[],
    persistedData: "",
    cachedData: "",
    dirty: false,
    ...overrides,
  });
}

function freezeFileSystem(filesystem: StorageFileSystem): StorageFileSystem {
  return Object.freeze({
    ...filesystem,
    inodes: Object.freeze(filesystem.inodes.map((candidate) => Object.freeze({
      ...candidate,
      extents: Object.freeze(candidate.extents.map((extent) => Object.freeze({ ...extent }))),
    }))),
    entries: Object.freeze(filesystem.entries.map((entry) => Object.freeze({ ...entry }))),
  });
}

function freezeMachine(machine: StorageMachine): StorageMachine {
  return Object.freeze({
    filesystems: Object.freeze({
      rootfs: freezeFileSystem(machine.filesystems.rootfs),
      datafs: freezeFileSystem(machine.filesystems.datafs),
    }),
    mounts: Object.freeze(machine.mounts.map((mount) => Object.freeze({ ...mount }))),
    openHandles: Object.freeze(machine.openHandles.map((reference) => Object.freeze({ ...reference }))),
    nextHandleId: machine.nextHandleId,
    history: Object.freeze(machine.history.map((event) => {
      if (event.kind !== "crash") return Object.freeze({ ...event });
      return Object.freeze({
        ...event,
        snapshots: Object.freeze(event.snapshots.map((snapshot) => Object.freeze({ ...snapshot }))),
      });
    })),
  });
}

export function createStorageMachine(): StorageMachine {
  return freezeMachine({
    filesystems: {
      rootfs: {
        device: "rootfs",
        rootInode: 1,
        inodes: [
          inode(1, "directory", { linkCount: 2 }),
          inode(2, "directory", { linkCount: 2 }),
          inode(3, "directory", { linkCount: 2 }),
          inode(4, "file", {
            sizeBytes: 9,
            extents: [{ logicalStart: 0, blockCount: 1, deviceBlockStart: 9 }],
            persistedData: "underlay",
            cachedData: "underlay",
          }),
        ],
        entries: [
          { directoryInode: 1, name: "srv", inode: 2 },
          { directoryInode: 2, name: "data", inode: 3 },
          { directoryInode: 3, name: "README.local", inode: 4 },
        ],
        freeBlocks: 64,
        freeInodes: 28,
      },
      datafs: {
        device: "datafs",
        rootInode: 10,
        inodes: [
          inode(10, "directory", { linkCount: 2 }),
          inode(17, "file", {
            sizeBytes: 0x2000,
            extents: [{ logicalStart: 0, blockCount: 2, deviceBlockStart: 43 }],
            persistedData: "draft",
            cachedData: "draft",
          }),
        ],
        entries: [
          { directoryInode: 10, name: "report.bin", inode: 17 },
        ],
        freeBlocks: 128,
        freeInodes: 31,
      },
    },
    mounts: [{ path: "/srv/data", device: "datafs", active: true }],
    openHandles: [],
    nextHandleId: 1,
    history: [],
  });
}

function normalizedParts(path: string): readonly string[] | null {
  if (!path.startsWith("/") || path.includes("\0")) return null;
  const raw = path.split("/").filter(Boolean);
  if (raw.some((part) => part === "." || part === "..")) return null;
  return raw;
}

function blocksFor(device: StorageDeviceId, candidate: StorageInode): readonly StorageBlockTrace[] {
  return Object.freeze(candidate.extents.flatMap((extent) =>
    Array.from({ length: extent.blockCount }, (_, offset) => Object.freeze({
      device,
      inode: candidate.id,
      logicalBlock: extent.logicalStart + offset,
      deviceBlock: extent.deviceBlockStart + offset,
    })),
  ));
}

export function resolveStoragePath(
  machine: StorageMachine,
  path: string,
): StoragePathResolution {
  const parts = normalizedParts(path);
  if (!parts) {
    return Object.freeze({
      path,
      found: false,
      error: "invalid-path",
      device: null,
      inode: null,
      steps: Object.freeze([]),
      blocks: Object.freeze([]),
    });
  }

  let device: StorageDeviceId = "rootfs";
  let currentInode = machine.filesystems.rootfs.rootInode;
  const steps: StoragePathStep[] = [];
  let walkedPath = "";

  for (const part of parts) {
    const filesystem = machine.filesystems[device];
    const directory = filesystem.inodes.find((candidate) => candidate.id === currentInode);
    if (!directory || directory.kind !== "directory") {
      return Object.freeze({
        path,
        found: false,
        error: "not-directory",
        device,
        inode: directory ?? null,
        steps: Object.freeze(steps),
        blocks: Object.freeze([]),
      });
    }
    const entry = filesystem.entries.find((candidate) =>
      candidate.directoryInode === directory.id && candidate.name === part,
    );
    if (!entry) {
      return Object.freeze({
        path,
        found: false,
        error: "not-found",
        device,
        inode: null,
        steps: Object.freeze(steps),
        blocks: Object.freeze([]),
      });
    }
    steps.push(Object.freeze({
      kind: "directory-entry",
      device,
      directoryInode: directory.id,
      name: part,
      inode: entry.inode,
    }));
    currentInode = entry.inode;
    walkedPath += `/${part}`;

    const mount = machine.mounts.find((candidate) => candidate.active && candidate.path === walkedPath);
    if (mount) {
      const hiddenDevice = device;
      const hiddenInode = currentInode;
      device = mount.device;
      currentInode = machine.filesystems[device].rootInode;
      steps.push(Object.freeze({
        kind: "mount",
        mountPoint: mount.path,
        fromDevice: hiddenDevice,
        hiddenInode,
        toDevice: device,
        rootInode: currentInode,
      }));
    }
  }

  const target = machine.filesystems[device].inodes.find((candidate) => candidate.id === currentInode) ?? null;
  return Object.freeze({
    path,
    found: target !== null,
    error: target ? null : "not-found",
    device: target ? device : null,
    inode: target,
    steps: Object.freeze(steps),
    blocks: target ? blocksFor(device, target) : Object.freeze([]),
  });
}

export function traceStorageOffset(
  machine: StorageMachine,
  path: string,
  byteOffset: number,
): StorageOffsetTrace {
  const resolution = resolveStoragePath(machine, path);
  if (!resolution.found || !resolution.inode || !resolution.device) {
    return Object.freeze({
      path,
      byteOffset,
      found: false,
      error: resolution.error,
      device: resolution.device,
      inode: resolution.inode?.id ?? null,
      logicalBlock: null,
      inBlockOffset: null,
      deviceBlock: null,
      deviceByteAddress: null,
    });
  }
  if (
    resolution.inode.kind !== "file"
    || !Number.isSafeInteger(byteOffset)
    || byteOffset < 0
    || byteOffset >= resolution.inode.sizeBytes
  ) {
    return Object.freeze({
      path,
      byteOffset,
      found: false,
      error: "offset-out-of-range",
      device: resolution.device,
      inode: resolution.inode.id,
      logicalBlock: null,
      inBlockOffset: null,
      deviceBlock: null,
      deviceByteAddress: null,
    });
  }
  const logicalBlock = Math.floor(byteOffset / STORAGE_BLOCK_SIZE);
  const inBlockOffset = byteOffset % STORAGE_BLOCK_SIZE;
  const block = resolution.blocks.find((candidate) => candidate.logicalBlock === logicalBlock);
  if (!block) {
    return Object.freeze({
      path,
      byteOffset,
      found: false,
      error: "offset-out-of-range",
      device: resolution.device,
      inode: resolution.inode.id,
      logicalBlock,
      inBlockOffset,
      deviceBlock: null,
      deviceByteAddress: null,
    });
  }
  return Object.freeze({
    path,
    byteOffset,
    found: true,
    error: null,
    device: resolution.device,
    inode: resolution.inode.id,
    logicalBlock,
    inBlockOffset,
    deviceBlock: block.deviceBlock,
    deviceByteAddress: block.deviceBlock * STORAGE_BLOCK_SIZE + inBlockOffset,
  });
}

export function setStorageMountActive(
  machine: StorageMachine,
  mountPath: string,
  active: boolean,
): StorageMachine {
  return freezeMachine({
    ...machine,
    mounts: machine.mounts.map((mount) =>
      mount.path === mountPath ? { ...mount, active } : mount,
    ),
  });
}

function operationFailure(machine: StorageMachine, error: StorageOperationError): StorageOperationResult {
  return Object.freeze({ machine, ok: false, error, reference: null });
}

function appendEvent(machine: StorageMachine, event: StorageEvent): StorageMachine {
  return freezeMachine({ ...machine, history: [...machine.history, event] });
}

function replaceFileSystem(
  machine: StorageMachine,
  device: StorageDeviceId,
  filesystem: StorageFileSystem,
): StorageMachine {
  return freezeMachine({
    ...machine,
    filesystems: { ...machine.filesystems, [device]: filesystem },
  });
}

function updateInode(
  machine: StorageMachine,
  device: StorageDeviceId,
  inodeId: number,
  update: (candidate: StorageInode) => StorageInode,
): StorageMachine {
  const filesystem = machine.filesystems[device];
  return replaceFileSystem(machine, device, {
    ...filesystem,
    inodes: filesystem.inodes.map((candidate) =>
      candidate.id === inodeId ? update(candidate) : candidate,
    ),
  });
}

function parentAndName(path: string): { parentPath: string; name: string } | null {
  const parts = normalizedParts(path);
  if (!parts || parts.length === 0) return null;
  return {
    parentPath: parts.length === 1 ? "/" : `/${parts.slice(0, -1).join("/")}`,
    name: parts.at(-1) ?? "",
  };
}

export function createStorageHardLink(
  machine: StorageMachine,
  sourcePath: string,
  targetPath: string,
): StorageOperationResult {
  const source = resolveStoragePath(machine, sourcePath);
  if (!source.found || !source.inode || !source.device) {
    return operationFailure(machine, source.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (source.inode.kind === "directory") return operationFailure(machine, "is-directory");
  if (resolveStoragePath(machine, targetPath).found) return operationFailure(machine, "already-exists");
  const target = parentAndName(targetPath);
  if (!target) return operationFailure(machine, "invalid-path");
  const parent = resolveStoragePath(machine, target.parentPath);
  if (!parent.found || !parent.inode || !parent.device) {
    return operationFailure(machine, parent.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (parent.inode.kind !== "directory") return operationFailure(machine, "not-directory");
  if (parent.device !== source.device) return operationFailure(machine, "cross-device-link");
  const filesystem = machine.filesystems[source.device];
  let next = replaceFileSystem(machine, source.device, {
    ...filesystem,
    entries: [...filesystem.entries, {
      directoryInode: parent.inode.id,
      name: target.name,
      inode: source.inode.id,
    }],
    inodes: filesystem.inodes.map((candidate) =>
      candidate.id === source.inode?.id
        ? { ...candidate, linkCount: candidate.linkCount + 1 }
        : candidate,
    ),
  });
  next = appendEvent(next, {
    kind: "link",
    sourcePath,
    targetPath,
    device: source.device,
    inode: source.inode.id,
  });
  return Object.freeze({ machine: next, ok: true, error: null, reference: null });
}

function reclaimIfUnreferenced(
  machine: StorageMachine,
  reference: Pick<StorageReference, "device" | "inode">,
): StorageMachine {
  const filesystem = machine.filesystems[reference.device];
  const target = filesystem.inodes.find((candidate) => candidate.id === reference.inode);
  if (!target || target.linkCount > 0 || target.openRefs > 0) return machine;
  const reclaimedBlocks = target.extents.reduce((sum, extent) => sum + extent.blockCount, 0);
  return replaceFileSystem(machine, reference.device, {
    ...filesystem,
    inodes: filesystem.inodes.filter((candidate) => candidate.id !== reference.inode),
    freeBlocks: filesystem.freeBlocks + reclaimedBlocks,
    freeInodes: filesystem.freeInodes + 1,
  });
}

export function unlinkStoragePath(
  machine: StorageMachine,
  path: string,
): StorageOperationResult {
  const target = resolveStoragePath(machine, path);
  if (!target.found || !target.inode || !target.device) {
    return operationFailure(machine, target.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (target.inode.kind === "directory") return operationFailure(machine, "is-directory");
  const parentTarget = parentAndName(path);
  if (!parentTarget) return operationFailure(machine, "invalid-path");
  const parent = resolveStoragePath(machine, parentTarget.parentPath);
  if (!parent.found || !parent.inode || parent.device !== target.device) {
    return operationFailure(machine, "not-found");
  }
  const nextLinkCount = Math.max(0, target.inode.linkCount - 1);
  const filesystem = machine.filesystems[target.device];
  let next = replaceFileSystem(machine, target.device, {
    ...filesystem,
    entries: filesystem.entries.filter((entry) => !(
      entry.directoryInode === parent.inode?.id && entry.name === parentTarget.name
    )),
    inodes: filesystem.inodes.map((candidate) =>
      candidate.id === target.inode?.id
        ? { ...candidate, linkCount: nextLinkCount }
        : candidate,
    ),
  });
  next = appendEvent(next, {
    kind: "unlink",
    path,
    device: target.device,
    inode: target.inode.id,
    remainingLinks: nextLinkCount,
    retainedByOpenReference: nextLinkCount === 0 && target.inode.openRefs > 0,
  });
  next = reclaimIfUnreferenced(next, { device: target.device, inode: target.inode.id });
  return Object.freeze({ machine: next, ok: true, error: null, reference: null });
}

export function openStoragePath(
  machine: StorageMachine,
  path: string,
): StorageOperationResult {
  const target = resolveStoragePath(machine, path);
  if (!target.found || !target.inode || !target.device) {
    return operationFailure(machine, target.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (target.inode.kind === "directory") return operationFailure(machine, "is-directory");
  const reference = Object.freeze({
    handleId: machine.nextHandleId,
    device: target.device,
    inode: target.inode.id,
  });
  let next = updateInode(machine, target.device, target.inode.id, (candidate) => ({
    ...candidate,
    openRefs: candidate.openRefs + 1,
  }));
  next = freezeMachine({
    ...next,
    openHandles: [...next.openHandles, reference],
    nextHandleId: next.nextHandleId + 1,
  });
  next = appendEvent(next, {
    kind: "open",
    ...reference,
    openRefs: target.inode.openRefs + 1,
  });
  return Object.freeze({ machine: next, ok: true, error: null, reference });
}

export function closeStorageReference(
  machine: StorageMachine,
  reference: StorageReference,
): StorageOperationResult {
  const activeHandle = machine.openHandles.find((candidate) =>
    candidate.handleId === reference.handleId
      && candidate.device === reference.device
      && candidate.inode === reference.inode,
  );
  const target = machine.filesystems[reference.device].inodes.find((candidate) =>
    candidate.id === reference.inode,
  );
  if (!activeHandle || !target || target.openRefs === 0) {
    return operationFailure(machine, "invalid-reference");
  }
  const openRefs = target.openRefs - 1;
  let next = updateInode(machine, reference.device, reference.inode, (candidate) => ({
    ...candidate,
    openRefs,
  }));
  next = freezeMachine({
    ...next,
    openHandles: next.openHandles.filter(({ handleId }) => handleId !== reference.handleId),
  });
  next = appendEvent(next, { kind: "close", ...reference, openRefs });
  next = reclaimIfUnreferenced(next, reference);
  return Object.freeze({ machine: next, ok: true, error: null, reference });
}

export function readStoragePath(machine: StorageMachine, path: string): string | null {
  const target = resolveStoragePath(machine, path);
  return target.inode?.kind === "file" ? target.inode.cachedData : null;
}

export function readStorageReference(
  machine: StorageMachine,
  reference: StorageReference,
): string | null {
  const activeHandle = machine.openHandles.some((candidate) =>
    candidate.handleId === reference.handleId
      && candidate.device === reference.device
      && candidate.inode === reference.inode,
  );
  const target = machine.filesystems[reference.device].inodes.find((candidate) =>
    candidate.id === reference.inode,
  );
  return activeHandle && target?.kind === "file" && target.openRefs > 0 ? target.cachedData : null;
}

export function writeStoragePath(
  machine: StorageMachine,
  path: string,
  value: string,
): StorageOperationResult {
  const target = resolveStoragePath(machine, path);
  if (!target.found || !target.inode || !target.device) {
    return operationFailure(machine, target.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (target.inode.kind === "directory") return operationFailure(machine, "is-directory");
  let next = updateInode(machine, target.device, target.inode.id, (candidate) => ({
    ...candidate,
    cachedData: value,
    dirty: value !== candidate.persistedData,
  }));
  next = appendEvent(next, {
    kind: "write",
    path,
    device: target.device,
    inode: target.inode.id,
    value,
    persistedBefore: target.inode.persistedData,
  });
  return Object.freeze({ machine: next, ok: true, error: null, reference: null });
}

export function fsyncStoragePath(
  machine: StorageMachine,
  path: string,
): StorageOperationResult {
  const target = resolveStoragePath(machine, path);
  if (!target.found || !target.inode || !target.device) {
    return operationFailure(machine, target.error === "invalid-path" ? "invalid-path" : "not-found");
  }
  if (target.inode.kind === "directory") return operationFailure(machine, "is-directory");
  let next = updateInode(machine, target.device, target.inode.id, (candidate) => ({
    ...candidate,
    persistedData: candidate.cachedData,
    dirty: false,
  }));
  next = appendEvent(next, {
    kind: "fsync",
    path,
    device: target.device,
    inode: target.inode.id,
    value: target.inode.cachedData,
  });
  return Object.freeze({ machine: next, ok: true, error: null, reference: null });
}

export function crashStorageMachine(machine: StorageMachine): StorageMachine {
  const snapshots: StorageCrashSnapshot[] = [];
  const crashFilesystem = (device: StorageDeviceId): StorageFileSystem => {
    const filesystem = machine.filesystems[device];
    const crashedInodes = filesystem.inodes.map((candidate) => {
      if (candidate.kind !== "file") return candidate;
      snapshots.push(Object.freeze({
        device,
        inode: candidate.id,
        hadDirtyData: candidate.dirty,
        beforeCachedData: candidate.cachedData,
        beforePersistedData: candidate.persistedData,
        afterData: candidate.persistedData,
      }));
      return {
        ...candidate,
        cachedData: candidate.persistedData,
        dirty: false,
        openRefs: 0,
      };
    });
    const reclaimed = crashedInodes.filter((candidate) =>
      candidate.kind === "file" && candidate.linkCount === 0,
    );
    return {
      ...filesystem,
      inodes: crashedInodes.filter((candidate) => !reclaimed.includes(candidate)),
      freeBlocks: filesystem.freeBlocks + reclaimed.reduce(
        (sum, candidate) => sum + candidate.extents.reduce(
          (extentSum, extent) => extentSum + extent.blockCount,
          0,
        ),
        0,
      ),
      freeInodes: filesystem.freeInodes + reclaimed.length,
    };
  };
  const filesystems: Record<StorageDeviceId, StorageFileSystem> = {
    rootfs: crashFilesystem("rootfs"),
    datafs: crashFilesystem("datafs"),
  };
  return appendEvent(freezeMachine({ ...machine, filesystems, openHandles: [] }), {
    kind: "crash",
    snapshots: Object.freeze(snapshots),
  });
}

export type StoragePathPrediction = Readonly<{
  byteOffset: number;
  device: StorageDeviceId;
  inode: number;
  logicalBlock: number;
  inBlockOffset: number;
  deviceBlock: number;
  deviceByteAddress: number;
}>;

export type StorageLabEvidence = Readonly<{
  pathPredictionCorrect: boolean;
  hardLinkIdentityVerified: boolean;
  unlinkLifetimeVerified: boolean;
  dirtyCrashPredicted: boolean;
  syncedCrashPredicted: boolean;
}>;

export const emptyStorageLabEvidence: StorageLabEvidence = Object.freeze({
  pathPredictionCorrect: false,
  hardLinkIdentityVerified: false,
  unlinkLifetimeVerified: false,
  dirtyCrashPredicted: false,
  syncedCrashPredicted: false,
});

function lastStorageEventIndex(
  events: readonly StorageEvent[],
  predicate: (event: StorageEvent) => boolean,
): number {
  for (let index = events.length - 1; index >= 0; index -= 1) {
    const event = events[index];
    if (event && predicate(event)) return index;
  }
  return -1;
}

export function storageLabEvidenceAfterResolution(
  machine: StorageMachine,
  path: string,
  prediction: StoragePathPrediction,
  current: StorageLabEvidence,
): StorageLabEvidence {
  const actual = traceStorageOffset(machine, path, prediction.byteOffset);
  const correct = path === "/srv/data/report.bin"
    && prediction.byteOffset === 0x1340
    && actual.found
    && actual.device === prediction.device
    && actual.inode === prediction.inode
    && actual.logicalBlock === prediction.logicalBlock
    && actual.inBlockOffset === prediction.inBlockOffset
    && actual.deviceBlock === prediction.deviceBlock
    && actual.deviceByteAddress === prediction.deviceByteAddress;
  return Object.freeze({
    ...current,
    pathPredictionCorrect: current.pathPredictionCorrect || correct,
  });
}

export function storageLabEvidenceAfterHardLink(
  before: StorageMachine,
  result: StorageOperationResult,
  sourcePath: string,
  targetPath: string,
  current: StorageLabEvidence,
): StorageLabEvidence {
  const beforeSource = resolveStoragePath(before, sourcePath);
  const beforeTarget = resolveStoragePath(before, targetPath);
  const afterSource = resolveStoragePath(result.machine, sourcePath);
  const afterTarget = resolveStoragePath(result.machine, targetPath);
  const verified = result.ok
    && sourcePath === "/srv/data/report.bin"
    && targetPath === "/srv/data/report.link"
    && beforeSource.found
    && !beforeTarget.found
    && afterSource.device === afterTarget.device
    && afterSource.inode?.id === afterTarget.inode?.id
    && afterSource.blocks[0]?.deviceBlock === afterTarget.blocks[0]?.deviceBlock
    && afterSource.inode?.linkCount === (beforeSource.inode?.linkCount ?? 0) + 1;
  return Object.freeze({
    ...current,
    hardLinkIdentityVerified: current.hardLinkIdentityVerified || verified,
  });
}

export function storageLabEvidenceAfterUnlink(
  before: StorageMachine,
  result: StorageOperationResult,
  removedPath: string,
  survivorPath: string,
  current: StorageLabEvidence,
): StorageLabEvidence {
  const removedBefore = resolveStoragePath(before, removedPath);
  const survivorBefore = resolveStoragePath(before, survivorPath);
  const removedAfter = resolveStoragePath(result.machine, removedPath);
  const survivorAfter = resolveStoragePath(result.machine, survivorPath);
  const verified = result.ok
    && removedPath === "/srv/data/report.bin"
    && survivorPath === "/srv/data/report.link"
    && removedBefore.inode?.id === survivorBefore.inode?.id
    && !removedAfter.found
    && survivorAfter.found
    && survivorAfter.inode?.id === survivorBefore.inode?.id
    && survivorAfter.inode?.linkCount === (survivorBefore.inode?.linkCount ?? 0) - 1
    && readStoragePath(result.machine, survivorPath) === readStoragePath(before, removedPath);
  return Object.freeze({
    ...current,
    unlinkLifetimeVerified: current.unlinkLifetimeVerified || verified,
  });
}

export function storageLabEvidenceAfterCrash(
  before: StorageMachine,
  after: StorageMachine,
  path: string,
  predictedData: string,
  phase: "dirty" | "synced",
  current: StorageLabEvidence,
): StorageLabEvidence {
  const beforeTarget = resolveStoragePath(before, path);
  const afterTarget = resolveStoragePath(after, path);
  const actualData = readStoragePath(after, path);
  const crashEvent = after.history.at(-1);
  const snapshot = crashEvent?.kind === "crash"
    ? crashEvent.snapshots.find((candidate) =>
        candidate.device === beforeTarget.device && candidate.inode === beforeTarget.inode?.id,
      )
    : undefined;
  const dirtyVerified = phase === "dirty"
    && beforeTarget.inode?.dirty === true
    && beforeTarget.inode.cachedData !== beforeTarget.inode.persistedData
    && snapshot?.hadDirtyData === true
    && actualData === beforeTarget.inode.persistedData
    && predictedData === actualData;
  const priorWriteIndex = lastStorageEventIndex(before.history, (event) =>
    event.kind === "write" && event.inode === beforeTarget.inode?.id,
  );
  const priorFsyncIndex = lastStorageEventIndex(before.history, (event) =>
    event.kind === "fsync" && event.inode === beforeTarget.inode?.id,
  );
  const priorCrashIndex = lastStorageEventIndex(before.history, (event) =>
    event.kind === "crash",
  );
  const syncedVerified = phase === "synced"
    && current.dirtyCrashPredicted
    && beforeTarget.inode?.dirty === false
    && priorWriteIndex > priorCrashIndex
    && priorFsyncIndex > priorWriteIndex
    && priorWriteIndex >= 0
    && beforeTarget.inode.cachedData === beforeTarget.inode.persistedData
    && snapshot?.hadDirtyData === false
    && afterTarget.inode?.cachedData === beforeTarget.inode.cachedData
    && predictedData === actualData;
  return Object.freeze({
    ...current,
    dirtyCrashPredicted: current.dirtyCrashPredicted || dirtyVerified,
    syncedCrashPredicted: current.syncedCrashPredicted || syncedVerified,
  });
}

function orderedLabHistory(machine: StorageMachine): boolean {
  const linkIndex = machine.history.findIndex((event) => event.kind === "link"
    && event.sourcePath === "/srv/data/report.bin"
    && event.targetPath === "/srv/data/report.link"
    && event.device === "datafs"
    && event.inode === 17);
  const unlinkIndex = machine.history.findIndex((event, index) => index > linkIndex
    && event.kind === "unlink"
    && event.path === "/srv/data/report.bin"
    && event.inode === 17
    && event.remainingLinks === 1);
  const dirtyWriteIndex = machine.history.findIndex((event, index) => index > unlinkIndex
    && event.kind === "write"
    && event.path === "/srv/data/report.link"
    && event.inode === 17
    && event.value !== event.persistedBefore);
  const dirtyWrite = machine.history[dirtyWriteIndex];
  const dirtyCrashIndex = machine.history.findIndex((event, index) => index > dirtyWriteIndex
    && event.kind === "crash"
    && event.snapshots.some((snapshot) => snapshot.device === "datafs"
      && snapshot.inode === 17
      && snapshot.hadDirtyData
      && snapshot.beforeCachedData === (dirtyWrite?.kind === "write" ? dirtyWrite.value : null)
      && snapshot.afterData === snapshot.beforePersistedData));
  const syncedWriteIndex = machine.history.findIndex((event, index) => index > dirtyCrashIndex
    && event.kind === "write"
    && event.path === "/srv/data/report.link"
    && event.inode === 17
    && event.value !== event.persistedBefore);
  const syncedWrite = machine.history[syncedWriteIndex];
  const fsyncIndex = machine.history.findIndex((event, index) => index > syncedWriteIndex
    && event.kind === "fsync"
    && event.path === "/srv/data/report.link"
    && event.inode === 17
    && event.value === (syncedWrite?.kind === "write" ? syncedWrite.value : null));
  const syncedCrashIndex = machine.history.findIndex((event, index) => index > fsyncIndex
    && event.kind === "crash"
    && event.snapshots.some((snapshot) => snapshot.device === "datafs"
      && snapshot.inode === 17
      && !snapshot.hadDirtyData
      && snapshot.beforeCachedData === snapshot.beforePersistedData
      && snapshot.afterData === (syncedWrite?.kind === "write" ? syncedWrite.value : null)));
  return linkIndex >= 0
    && unlinkIndex > linkIndex
    && dirtyWriteIndex > unlinkIndex
    && dirtyCrashIndex > dirtyWriteIndex
    && syncedWriteIndex > dirtyCrashIndex
    && fsyncIndex > syncedWriteIndex
    && syncedCrashIndex > fsyncIndex;
}

export function canMasterStorageLab(
  machine: StorageMachine,
  evidence: StorageLabEvidence,
): boolean {
  const survivor = resolveStoragePath(machine, "/srv/data/report.link");
  return Object.values(evidence).every(Boolean)
    && orderedLabHistory(machine)
    && !resolveStoragePath(machine, "/srv/data/report.bin").found
    && survivor.device === "datafs"
    && survivor.inode?.id === 17
    && survivor.inode.linkCount === 1
    && survivor.inode.dirty === false
    && survivor.inode.cachedData === survivor.inode.persistedData;
}

export type StorageCapacity = Readonly<{
  freeBlocks: number;
  freeInodes: number;
}>;

export function evaluateStorageCapacity(
  capacity: StorageCapacity,
  blocksNeeded = 1,
): Readonly<{ canCreate: boolean; reason: "ok" | "no-blocks" | "no-inodes" }> {
  if (capacity.freeInodes < 1) return Object.freeze({ canCreate: false, reason: "no-inodes" });
  if (capacity.freeBlocks < blocksNeeded) return Object.freeze({ canCreate: false, reason: "no-blocks" });
  return Object.freeze({ canCreate: true, reason: "ok" });
}

export const crashSafeReplaceSteps = Object.freeze([
  "write-temp",
  "fsync-temp",
  "rename",
  "fsync-directory",
] as const);

export type CrashSafeReplaceStep = typeof crashSafeReplaceSteps[number];

export function analyzeCrashSafeReplace(steps: readonly CrashSafeReplaceStep[]) {
  let tempWritten = false;
  let tempDurable = false;
  let renameVisible = false;
  let dataDurableBeforeRename = false;
  let directoryEntryDurable = false;
  for (const step of steps) {
    if (step === "write-temp") tempWritten = true;
    else if (step === "fsync-temp" && tempWritten) tempDurable = true;
    else if (step === "rename" && tempWritten) {
      renameVisible = true;
      dataDurableBeforeRename = tempDurable;
      directoryEntryDurable = false;
    } else if (step === "fsync-directory" && renameVisible) {
      directoryEntryDurable = true;
    }
  }
  return Object.freeze({
    tempWritten,
    dataDurableBeforeRename,
    renameVisible,
    directoryEntryDurable,
    crashSafe: renameVisible && dataDurableBeforeRename && directoryEntryDurable,
  });
}

export const storageIncidentIds = Object.freeze([
  "mount-shadow",
  "inode-exhaustion",
  "deleted-open",
  "crash-safe-replace",
] as const);

export type StorageIncidentId = typeof storageIncidentIds[number];

export type StorageIncidentSubmission = Readonly<{
  mountedDevice?: StorageDeviceId;
  mountedInode?: number;
  underlayDevice?: StorageDeviceId;
  underlayInode?: number;
  mergedView?: boolean;
  freeBlocks?: number;
  freeInodes?: number;
  createOutcome?: "succeeds" | "enospc";
  repairedFreeBlocks?: number;
  repairedFreeInodes?: number;
  repairedOutcome?: "succeeds" | "enospc";
  linkCount?: number;
  openRefs?: number;
  blocksAllocated?: boolean;
  afterCloseBlocksAllocated?: boolean;
  replaceSteps?: readonly CrashSafeReplaceStep[];
  crashGuarantee?: "old-or-new" | "new-only" | "unspecified";
}>;

export type StorageIncidentEvaluation = Readonly<{
  correct: boolean;
  errors: readonly string[];
}>;

export function evaluateStorageIncident(
  id: StorageIncidentId,
  submission: StorageIncidentSubmission,
): StorageIncidentEvaluation {
  const errors: string[] = [];
  if (id === "mount-shadow") {
    const mounted = resolveStoragePath(createStorageMachine(), "/srv/data/report.bin");
    const unmountedMachine = setStorageMountActive(createStorageMachine(), "/srv/data", false);
    const underlay = resolveStoragePath(unmountedMachine, "/srv/data/README.local");
    if (submission.mountedDevice !== mounted.device) errors.push("mounted-device");
    if (submission.mountedInode !== mounted.inode?.id) errors.push("mounted-inode");
    if (submission.underlayDevice !== underlay.device) errors.push("underlay-device");
    if (submission.underlayInode !== underlay.inode?.id) errors.push("underlay-inode");
    if (submission.mergedView !== false) errors.push("merged-view");
  } else if (id === "inode-exhaustion") {
    const before = evaluateStorageCapacity({
      freeBlocks: submission.freeBlocks ?? -1,
      freeInodes: submission.freeInodes ?? -1,
    }, 0);
    const after = evaluateStorageCapacity({
      freeBlocks: submission.repairedFreeBlocks ?? -1,
      freeInodes: submission.repairedFreeInodes ?? -1,
    }, 0);
    if (submission.freeBlocks !== 128) errors.push("free-blocks");
    if (submission.freeInodes !== 0) errors.push("free-inodes");
    if (submission.createOutcome !== (before.canCreate ? "succeeds" : "enospc")) errors.push("create-outcome");
    if (submission.repairedFreeBlocks !== 128) errors.push("repaired-free-blocks");
    if (submission.repairedFreeInodes !== 1) errors.push("repaired-free-inodes");
    if (submission.repairedOutcome !== (after.canCreate ? "succeeds" : "enospc")) errors.push("repaired-outcome");
  } else if (id === "deleted-open") {
    const retained = (submission.linkCount ?? -1) === 0 && (submission.openRefs ?? -1) > 0;
    if (submission.linkCount !== 0) errors.push("link-count");
    if (submission.openRefs !== 1) errors.push("open-refs");
    if (submission.blocksAllocated !== retained) errors.push("blocks-allocated");
    if (submission.afterCloseBlocksAllocated !== false) errors.push("after-close-reclaim");
  } else {
    const analysis = analyzeCrashSafeReplace(submission.replaceSteps ?? []);
    if (!analysis.tempWritten) errors.push("temp-write");
    if (!analysis.dataDurableBeforeRename) errors.push("temp-fsync-before-rename");
    if (!analysis.renameVisible) errors.push("rename");
    if (!analysis.directoryEntryDurable) errors.push("parent-directory-fsync");
    if (submission.crashGuarantee !== (analysis.crashSafe ? "old-or-new" : "unspecified")) {
      errors.push("crash-guarantee");
    }
  }
  return Object.freeze({ correct: errors.length === 0, errors: Object.freeze(errors) });
}

export function canCompleteStorageChapter({
  pathLabComplete,
  incidentsComplete,
  conceptsMastered,
}: {
  pathLabComplete: boolean;
  incidentsComplete: boolean;
  conceptsMastered: boolean;
}): boolean {
  return pathLabComplete && incidentsComplete && conceptsMastered;
}

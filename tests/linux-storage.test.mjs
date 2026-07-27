import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  STORAGE_BLOCK_SIZE,
  analyzeCrashSafeReplace,
  canCompleteStorageChapter,
  canMasterStorageLab,
  closeStorageReference,
  crashStorageMachine,
  createStorageHardLink,
  createStorageMachine,
  emptyStorageLabEvidence,
  evaluateStorageCapacity,
  evaluateStorageIncident,
  fsyncStoragePath,
  openStoragePath,
  readStoragePath,
  readStorageReference,
  resolveStoragePath,
  setStorageMountActive,
  storageLabEvidenceAfterCrash,
  storageLabEvidenceAfterHardLink,
  storageLabEvidenceAfterResolution,
  storageLabEvidenceAfterUnlink,
  traceStorageOffset,
  unlinkStoragePath,
  writeStoragePath,
} from "../src/features/linux-runtime/storage-and-filesystems.ts";

test("walks the mounted namespace from directory entries to inode extents and device bytes", () => {
  const machine = createStorageMachine();
  const resolution = resolveStoragePath(machine, "/srv/data/report.bin");

  assert.equal(STORAGE_BLOCK_SIZE, 4096);
  assert.equal(resolution.found, true);
  assert.equal(resolution.device, "datafs");
  assert.equal(resolution.inode.id, 17);
  assert.equal(resolution.inode.sizeBytes, 0x2000);
  assert.deepEqual(resolution.steps, [
    { kind: "directory-entry", device: "rootfs", directoryInode: 1, name: "srv", inode: 2 },
    { kind: "directory-entry", device: "rootfs", directoryInode: 2, name: "data", inode: 3 },
    {
      kind: "mount",
      mountPoint: "/srv/data",
      fromDevice: "rootfs",
      hiddenInode: 3,
      toDevice: "datafs",
      rootInode: 10,
    },
    { kind: "directory-entry", device: "datafs", directoryInode: 10, name: "report.bin", inode: 17 },
  ]);
  assert.deepEqual(resolution.blocks, [
    { device: "datafs", inode: 17, logicalBlock: 0, deviceBlock: 43 },
    { device: "datafs", inode: 17, logicalBlock: 1, deviceBlock: 44 },
  ]);
  assert.deepEqual(traceStorageOffset(machine, "/srv/data/report.bin", 0x1340), {
    path: "/srv/data/report.bin",
    byteOffset: 0x1340,
    found: true,
    error: null,
    device: "datafs",
    inode: 17,
    logicalBlock: 1,
    inBlockOffset: 0x340,
    deviceBlock: 44,
    deviceByteAddress: 0x2c340,
  });
  assert.equal(traceStorageOffset(machine, "/srv/data/report.bin", 0x2340).error, "offset-out-of-range");
  assert.equal(traceStorageOffset(machine, "/srv/data/report.bin", 0x2000).error, "offset-out-of-range");
  assert.equal(traceStorageOffset(machine, "/srv/data/report.bin", -1).error, "offset-out-of-range");
});

test("a mount replaces the underlay view instead of merging directory entries", () => {
  const mounted = createStorageMachine();
  assert.equal(resolveStoragePath(mounted, "/srv/data/README.local").found, false);
  assert.equal(resolveStoragePath(mounted, "/srv/data/report.bin").device, "datafs");

  const unmounted = setStorageMountActive(mounted, "/srv/data", false);
  const underlay = resolveStoragePath(unmounted, "/srv/data/README.local");
  assert.equal(underlay.found, true);
  assert.equal(underlay.device, "rootfs");
  assert.equal(underlay.inode.id, 4);
  assert.equal(resolveStoragePath(unmounted, "/srv/data/report.bin").found, false);
  assert.equal(mounted.mounts[0].active, true);
});

test("creates a hard link as a second directory entry for the same inode and extents", () => {
  const original = createStorageMachine();
  const linked = createStorageHardLink(
    original,
    "/srv/data/report.bin",
    "/srv/data/report.link",
  );
  const source = resolveStoragePath(linked.machine, "/srv/data/report.bin");
  const alias = resolveStoragePath(linked.machine, "/srv/data/report.link");

  assert.equal(linked.ok, true);
  assert.equal(source.inode.id, 17);
  assert.equal(alias.inode.id, 17);
  assert.equal(source.inode.linkCount, 2);
  assert.deepEqual(alias.blocks, source.blocks);
  assert.equal(resolveStoragePath(original, "/srv/data/report.link").found, false);
  assert.equal(resolveStoragePath(original, "/srv/data/report.bin").inode.linkCount, 1);

  const crossDevice = createStorageHardLink(
    original,
    "/srv/data/report.bin",
    "/report.link",
  );
  assert.equal(crossDevice.ok, false);
  assert.equal(crossDevice.error, "cross-device-link");
});

test("unlink removes one name while another hard link keeps the inode and blocks alive", () => {
  const original = createStorageMachine();
  const linked = createStorageHardLink(
    original,
    "/srv/data/report.bin",
    "/srv/data/report.link",
  ).machine;
  const unlinked = unlinkStoragePath(linked, "/srv/data/report.bin");
  const survivor = resolveStoragePath(unlinked.machine, "/srv/data/report.link");

  assert.equal(unlinked.ok, true);
  assert.equal(resolveStoragePath(unlinked.machine, "/srv/data/report.bin").found, false);
  assert.equal(survivor.inode.id, 17);
  assert.equal(survivor.inode.linkCount, 1);
  assert.equal(readStoragePath(unlinked.machine, "/srv/data/report.link"), "draft");
  assert.equal(unlinked.machine.filesystems.datafs.freeBlocks, 128);
});

test("an open reference retains an unlinked inode until the last close", () => {
  const original = createStorageMachine();
  const opened = openStoragePath(original, "/srv/data/report.bin");
  assert.equal(opened.ok, true);
  const unlinked = unlinkStoragePath(opened.machine, "/srv/data/report.bin");
  const retained = unlinked.machine.filesystems.datafs.inodes.find(({ id }) => id === 17);

  assert.equal(resolveStoragePath(unlinked.machine, "/srv/data/report.bin").found, false);
  assert.equal(retained.linkCount, 0);
  assert.equal(retained.openRefs, 1);
  assert.equal(readStorageReference(unlinked.machine, opened.reference), "draft");
  assert.equal(unlinked.machine.filesystems.datafs.freeBlocks, 128);

  const closed = closeStorageReference(unlinked.machine, opened.reference);
  assert.equal(closed.ok, true);
  assert.equal(closed.machine.filesystems.datafs.inodes.some(({ id }) => id === 17), false);
  assert.equal(closed.machine.filesystems.datafs.freeBlocks, 130);
  assert.equal(closed.machine.filesystems.datafs.freeInodes, 32);
  assert.equal(readStorageReference(closed.machine, opened.reference), null);
  assert.equal(original.filesystems.datafs.inodes.some(({ id }) => id === 17), true);
});

test("assigns unique open handles and rejects double-close without consuming another fd", () => {
  const initial = createStorageMachine();
  const first = openStoragePath(initial, "/srv/data/report.bin");
  const second = openStoragePath(first.machine, "/srv/data/report.bin");
  assert.notEqual(first.reference.handleId, second.reference.handleId);
  assert.equal(resolveStoragePath(second.machine, "/srv/data/report.bin").inode.openRefs, 2);

  const firstClose = closeStorageReference(second.machine, first.reference);
  assert.equal(firstClose.ok, true);
  assert.equal(readStorageReference(firstClose.machine, first.reference), null);
  assert.equal(readStorageReference(firstClose.machine, second.reference), "draft");
  assert.equal(resolveStoragePath(firstClose.machine, "/srv/data/report.bin").inode.openRefs, 1);

  const duplicateClose = closeStorageReference(firstClose.machine, first.reference);
  assert.equal(duplicateClose.ok, false);
  assert.equal(duplicateClose.error, "invalid-reference");
  assert.equal(readStorageReference(duplicateClose.machine, second.reference), "draft");
  assert.equal(resolveStoragePath(duplicateClose.machine, "/srv/data/report.bin").inode.openRefs, 1);
});

test("crash discards dirty page-cache bytes but preserves bytes persisted by fsync", () => {
  const initial = createStorageMachine();
  const dirty = writeStoragePath(initial, "/srv/data/report.bin", "cached-v2").machine;
  const dirtyInode = resolveStoragePath(dirty, "/srv/data/report.bin").inode;
  assert.equal(dirtyInode.cachedData, "cached-v2");
  assert.equal(dirtyInode.persistedData, "draft");
  assert.equal(dirtyInode.dirty, true);

  const dirtyCrash = crashStorageMachine(dirty);
  assert.equal(readStoragePath(dirtyCrash, "/srv/data/report.bin"), "draft");
  assert.equal(resolveStoragePath(dirtyCrash, "/srv/data/report.bin").inode.dirty, false);
  assert.equal(resolveStoragePath(dirty, "/srv/data/report.bin").inode.cachedData, "cached-v2");

  const rewritten = writeStoragePath(dirtyCrash, "/srv/data/report.bin", "durable-v3").machine;
  const synced = fsyncStoragePath(rewritten, "/srv/data/report.bin").machine;
  const syncedInode = resolveStoragePath(synced, "/srv/data/report.bin").inode;
  assert.equal(syncedInode.cachedData, "durable-v3");
  assert.equal(syncedInode.persistedData, "durable-v3");
  assert.equal(syncedInode.dirty, false);
  assert.equal(readStoragePath(crashStorageMachine(synced), "/srv/data/report.bin"), "durable-v3");
});

function completeStorageLab() {
  let machine = createStorageMachine();
  let evidence = storageLabEvidenceAfterResolution(machine, "/srv/data/report.bin", {
    byteOffset: 0x1340,
    device: "datafs",
    inode: 17,
    logicalBlock: 1,
    inBlockOffset: 0x340,
    deviceBlock: 44,
    deviceByteAddress: 0x2c340,
  }, emptyStorageLabEvidence);

  const linked = createStorageHardLink(machine, "/srv/data/report.bin", "/srv/data/report.link");
  evidence = storageLabEvidenceAfterHardLink(
    machine,
    linked,
    "/srv/data/report.bin",
    "/srv/data/report.link",
    evidence,
  );
  machine = linked.machine;

  const unlinked = unlinkStoragePath(machine, "/srv/data/report.bin");
  evidence = storageLabEvidenceAfterUnlink(
    machine,
    unlinked,
    "/srv/data/report.bin",
    "/srv/data/report.link",
    evidence,
  );
  machine = unlinked.machine;

  const dirty = writeStoragePath(machine, "/srv/data/report.link", "cached-v2").machine;
  const dirtyCrash = crashStorageMachine(dirty);
  evidence = storageLabEvidenceAfterCrash(
    dirty,
    dirtyCrash,
    "/srv/data/report.link",
    "draft",
    "dirty",
    evidence,
  );
  machine = dirtyCrash;

  const rewritten = writeStoragePath(machine, "/srv/data/report.link", "durable-v3").machine;
  const synced = fsyncStoragePath(rewritten, "/srv/data/report.link").machine;
  const syncedCrash = crashStorageMachine(synced);
  evidence = storageLabEvidenceAfterCrash(
    synced,
    syncedCrash,
    "/srv/data/report.link",
    "durable-v3",
    "synced",
    evidence,
  );
  return { machine: syncedCrash, evidence };
}

test("requires predictions plus the ordered path, link, unlink, dirty-crash, and synced-crash sequence", () => {
  const completed = completeStorageLab();
  assert.deepEqual(completed.evidence, {
    pathPredictionCorrect: true,
    hardLinkIdentityVerified: true,
    unlinkLifetimeVerified: true,
    dirtyCrashPredicted: true,
    syncedCrashPredicted: true,
  });
  assert.equal(canMasterStorageLab(completed.machine, completed.evidence), true);
  for (const missing of Object.keys(completed.evidence)) {
    assert.equal(canMasterStorageLab(
      completed.machine,
      { ...completed.evidence, [missing]: false },
    ), false);
  }
});

test("does not award mastery for forged evidence, wrong predictions, or replayed order", () => {
  const allTrue = {
    pathPredictionCorrect: true,
    hardLinkIdentityVerified: true,
    unlinkLifetimeVerified: true,
    dirtyCrashPredicted: true,
    syncedCrashPredicted: true,
  };
  assert.equal(canMasterStorageLab(createStorageMachine(), allTrue), false);

  const wrongPrediction = storageLabEvidenceAfterResolution(
    createStorageMachine(),
    "/srv/data/report.bin",
    {
      byteOffset: 0x1340,
      device: "datafs",
      inode: 17,
      logicalBlock: 1,
      inBlockOffset: 0x340,
      deviceBlock: 43,
      deviceByteAddress: 0x2b340,
    },
    emptyStorageLabEvidence,
  );
  assert.equal(wrongPrediction.pathPredictionCorrect, false);

  let machine = writeStoragePath(createStorageMachine(), "/srv/data/report.bin", "too-early").machine;
  machine = crashStorageMachine(machine);
  machine = createStorageHardLink(machine, "/srv/data/report.bin", "/srv/data/report.link").machine;
  machine = unlinkStoragePath(machine, "/srv/data/report.bin").machine;
  machine = fsyncStoragePath(
    writeStoragePath(machine, "/srv/data/report.link", "durable").machine,
    "/srv/data/report.link",
  ).machine;
  machine = crashStorageMachine(machine);
  assert.equal(canMasterStorageLab(machine, allTrue), false);
});

test("requires a new dirty write after the first crash before synced-crash evidence", () => {
  let machine = createStorageMachine();
  let evidence = storageLabEvidenceAfterResolution(machine, "/srv/data/report.bin", {
    byteOffset: 0x1340,
    device: "datafs",
    inode: 17,
    logicalBlock: 1,
    inBlockOffset: 0x340,
    deviceBlock: 44,
    deviceByteAddress: 0x2c340,
  }, emptyStorageLabEvidence);
  const linked = createStorageHardLink(machine, "/srv/data/report.bin", "/srv/data/report.link");
  evidence = storageLabEvidenceAfterHardLink(machine, linked, "/srv/data/report.bin", "/srv/data/report.link", evidence);
  machine = linked.machine;
  const unlinked = unlinkStoragePath(machine, "/srv/data/report.bin");
  evidence = storageLabEvidenceAfterUnlink(machine, unlinked, "/srv/data/report.bin", "/srv/data/report.link", evidence);
  machine = unlinked.machine;

  const dirty = writeStoragePath(machine, "/srv/data/report.link", "candidate-v2").machine;
  const dirtyCrash = crashStorageMachine(dirty);
  evidence = storageLabEvidenceAfterCrash(
    dirty,
    dirtyCrash,
    "/srv/data/report.link",
    "draft",
    "dirty",
    evidence,
  );
  assert.equal(evidence.dirtyCrashPredicted, true);

  const cleanFsync = fsyncStoragePath(dirtyCrash, "/srv/data/report.link").machine;
  const cleanCrash = crashStorageMachine(cleanFsync);
  const replayedEvidence = storageLabEvidenceAfterCrash(
    cleanFsync,
    cleanCrash,
    "/srv/data/report.link",
    "draft",
    "synced",
    evidence,
  );
  assert.equal(replayedEvidence.syncedCrashPredicted, false);
  assert.equal(canMasterStorageLab(cleanCrash, replayedEvidence), false);
});

test("computes block and inode capacity independently", () => {
  assert.deepEqual(evaluateStorageCapacity({ freeBlocks: 128, freeInodes: 0 }), {
    canCreate: false,
    reason: "no-inodes",
  });
  assert.deepEqual(evaluateStorageCapacity({ freeBlocks: 0, freeInodes: 2 }), {
    canCreate: false,
    reason: "no-blocks",
  });
  assert.deepEqual(evaluateStorageCapacity({ freeBlocks: 2, freeInodes: 1 }), {
    canCreate: true,
    reason: "ok",
  });
  assert.deepEqual(evaluateStorageCapacity({ freeBlocks: 0, freeInodes: 1 }, 0), {
    canCreate: true,
    reason: "ok",
  });
});

test("grades mount shadow, inode exhaustion, and deleted-open lifetime from computed state", () => {
  assert.equal(evaluateStorageIncident("mount-shadow", {
    mountedDevice: "datafs",
    mountedInode: 17,
    underlayDevice: "rootfs",
    underlayInode: 4,
    mergedView: false,
  }).correct, true);
  assert.deepEqual(evaluateStorageIncident("mount-shadow", {
    mountedDevice: "rootfs",
    mountedInode: 3,
    underlayDevice: "rootfs",
    underlayInode: 4,
    mergedView: true,
  }).errors, ["mounted-device", "mounted-inode", "merged-view"]);

  assert.equal(evaluateStorageIncident("inode-exhaustion", {
    freeBlocks: 128,
    freeInodes: 0,
    createOutcome: "enospc",
    repairedFreeBlocks: 128,
    repairedFreeInodes: 1,
    repairedOutcome: "succeeds",
  }).correct, true);
  assert.ok(evaluateStorageIncident("inode-exhaustion", {
    freeBlocks: 128,
    freeInodes: 0,
    createOutcome: "succeeds",
    repairedFreeBlocks: 127,
    repairedFreeInodes: 0,
    repairedOutcome: "enospc",
  }).errors.includes("create-outcome"));

  assert.equal(evaluateStorageIncident("deleted-open", {
    linkCount: 0,
    openRefs: 1,
    blocksAllocated: true,
    afterCloseBlocksAllocated: false,
  }).correct, true);
  assert.deepEqual(evaluateStorageIncident("deleted-open", {
    linkCount: 0,
    openRefs: 1,
    blocksAllocated: false,
    afterCloseBlocksAllocated: true,
  }).errors, ["blocks-allocated", "after-close-reclaim"]);
});

test("requires temp data and the renamed directory entry to cross separate durability boundaries", () => {
  const safeSteps = ["write-temp", "fsync-temp", "rename", "fsync-directory"];
  assert.deepEqual(analyzeCrashSafeReplace(safeSteps), {
    tempWritten: true,
    dataDurableBeforeRename: true,
    renameVisible: true,
    directoryEntryDurable: true,
    crashSafe: true,
  });
  assert.equal(evaluateStorageIncident("crash-safe-replace", {
    replaceSteps: safeSteps,
    crashGuarantee: "old-or-new",
  }).correct, true);

  const lateFileSync = evaluateStorageIncident("crash-safe-replace", {
    replaceSteps: ["write-temp", "rename", "fsync-temp", "fsync-directory"],
    crashGuarantee: "old-or-new",
  });
  assert.equal(lateFileSync.correct, false);
  assert.ok(lateFileSync.errors.includes("temp-fsync-before-rename"));
  assert.ok(lateFileSync.errors.includes("crash-guarantee"));

  const missingDirectorySync = evaluateStorageIncident("crash-safe-replace", {
    replaceSteps: ["write-temp", "fsync-temp", "rename"],
    crashGuarantee: "old-or-new",
  });
  assert.ok(missingDirectorySync.errors.includes("parent-directory-fsync"));
});

test("requires the path lab, all incidents, and concepts for chapter completion", () => {
  const complete = {
    pathLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteStorageChapter(complete), true);
  for (const missing of Object.keys(complete)) {
    assert.equal(canCompleteStorageChapter({ ...complete, [missing]: false }), false);
  }
});

test("derives path-lab completion into the parent chapter gate", async () => {
  const source = await readFile(
    new URL("../src/components/linux/LinuxStoragePathLab.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /const labComplete = canMasterStorageLab\(machine, evidence\);/);
  assert.match(
    source,
    /useEffect\(\(\) => \{\s*onCompletionChange\(labComplete\);\s*\}, \[labComplete, onCompletionChange\]\);/,
  );
});

test("keeps the storage prerequisite handoff at a 44px touch target", async () => {
  const styles = await readFile(new URL("../src/styles/globals.css", import.meta.url), "utf8");
  assert.match(
    styles,
    /\.storage-prerequisite a \{[\s\S]*?display: inline-flex;[\s\S]*?min-height: 44px;/,
  );
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  MEMORY_PAGE_SIZE,
  accessVirtualMemory,
  canCompleteMemoryChapter,
  canMasterVirtualMemoryLab,
  createVirtualMemoryMachine,
  evaluateMemoryIncident,
  expectedMemoryPrediction,
  heapIsolation,
  memoryLabEvidenceAfterAccess,
  parseVirtualAddress,
  splitVirtualAddress,
} from "../src/features/linux-runtime/memory-and-virtual-addresses.ts";

test("splits a 4 KiB teaching address into VPN and an unchanged offset", () => {
  assert.equal(MEMORY_PAGE_SIZE, 4096);
  assert.deepEqual(splitVirtualAddress(0x4018), { vpn: 0x4, offset: 0x18 });
  assert.deepEqual(splitVirtualAddress(0x2abc), { vpn: 0x2, offset: 0xabc });
  assert.equal(parseVirtualAddress("0x4018"), 0x4018);
  assert.equal(parseVirtualAddress("16408"), 0x4018);
  assert.equal(parseVirtualAddress("0x10000"), null);
  assert.equal(parseVirtualAddress("4 KiB"), null);
});

test("uses process-specific PTEs while preserving the physical page offset", () => {
  const machine = createVirtualMemoryMachine();
  const parentStack = accessVirtualMemory(machine, "parent", 0x7018, "read");
  const childStack = accessVirtualMemory(machine, "child", 0x7018, "read");

  assert.equal(parentStack.prediction, "mapped");
  assert.equal(childStack.prediction, "mapped");
  assert.equal(parentStack.frame, 9);
  assert.equal(childStack.frame, 10);
  assert.notEqual(parentStack.physicalAddress, childStack.physicalAddress);
  assert.equal(parentStack.physicalAddress % MEMORY_PAGE_SIZE, 0x18);
  assert.equal(childStack.physicalAddress % MEMORY_PAGE_SIZE, 0x18);
  assert.equal(machine.processes.parent.pages.find((entry) => entry.vpn === 0x7).frame, 9);
});

test("separates the writable VMA contract from a COW write-protected PTE", () => {
  const machine = createVirtualMemoryMachine();
  const heap = machine.processes.child.pages.find((entry) => entry.vpn === 0x4);
  assert.equal(heap.vmaWritable, true);
  assert.equal(heap.writable, false);
  assert.equal(heap.cow, true);
  assert.equal(expectedMemoryPrediction(machine, "child", 0x4018, "read"), "mapped");
  assert.equal(expectedMemoryPrediction(machine, "child", 0x4018, "write"), "cow-copy");
  assert.equal(expectedMemoryPrediction(machine, "child", 0x4018, "execute"), "protection-fault");
});

test("resolves a COW write into a private child frame without changing the parent", () => {
  const original = createVirtualMemoryMachine();
  const result = accessVirtualMemory(original, "child", 0x4018, "write", 99);
  const isolation = heapIsolation(result.machine);

  assert.equal(result.prediction, "cow-copy");
  assert.equal(result.resumed, true);
  assert.deepEqual(isolation, {
    parentFrame: 7,
    childFrame: 12,
    parentValue: 41,
    childValue: 99,
    sharedCow: false,
    separated: true,
    isolated: true,
  });
  assert.equal(original.processes.child.pages.find((entry) => entry.vpn === 0x4).frame, 7);
  assert.equal(original.frames.find((frame) => frame.id === 7).bytes[0x18], 41);
});

test("stores bytes by page offset instead of treating a frame as one scalar", () => {
  const initial = createVirtualMemoryMachine();
  const written = accessVirtualMemory(initial, "child", 0x4018, "write", 55).machine;
  const writtenByte = accessVirtualMemory(written, "child", 0x4018, "read");
  const adjacentByte = accessVirtualMemory(written, "child", 0x4019, "read");
  const parentByte = accessVirtualMemory(written, "parent", 0x4018, "read");
  assert.equal(writtenByte.value, 55);
  assert.equal(adjacentByte.value, 0);
  assert.equal(parentByte.value, 41);
});

test("distinguishes demand allocation, protection, and an unmapped gap", () => {
  const initial = createVirtualMemoryMachine();
  assert.equal(expectedMemoryPrediction(initial, "parent", 0x5018, "read"), "demand-zero");
  assert.equal(expectedMemoryPrediction(initial, "parent", 0x5018, "execute"), "protection-fault");
  assert.equal(expectedMemoryPrediction(initial, "parent", 0x6018, "read"), "segmentation-fault");

  const demand = accessVirtualMemory(initial, "parent", 0x5018, "write", 5);
  assert.equal(demand.prediction, "demand-zero");
  assert.equal(demand.resumed, true);
  assert.equal(demand.value, 5);
  assert.equal(demand.frame, 12);
  assert.equal(demand.physicalAddress, 0xc018);

  const protection = accessVirtualMemory(initial, "parent", 0x4018, "execute");
  assert.equal(protection.resumed, false);
  assert.equal(protection.physicalAddress, null);
  assert.deepEqual(protection.machine, initial);
});

test("maps anonymous reads to a shared read-only zero page before COW on write", () => {
  const initial = createVirtualMemoryMachine();
  const read = accessVirtualMemory(initial, "parent", 0x5018, "read");
  const readEntry = read.machine.processes.parent.pages.find((entry) => entry.vpn === 0x5);
  assert.equal(read.prediction, "demand-zero");
  assert.equal(read.frame, 0);
  assert.equal(read.value, 0);
  assert.equal(readEntry.writable, false);
  assert.equal(readEntry.cow, true);

  const write = accessVirtualMemory(read.machine, "parent", 0x5018, "write", 5);
  assert.equal(write.prediction, "cow-copy");
  assert.equal(write.frame, 12);
  assert.equal(write.value, 5);
  assert.equal(read.machine.frames.find((frame) => frame.id === 0).bytes[0x18], undefined);
});

test("requires causal COW and demand evidence for virtual-memory lab mastery", () => {
  const initial = createVirtualMemoryMachine();
  const cow = accessVirtualMemory(initial, "child", 0x4018, "write", 55).machine;
  const completedMachine = accessVirtualMemory(cow, "parent", 0x5018, "write", 5).machine;
  const evidence = {
    sharedReadPredicted: true,
    offsetPreserved: true,
    cowWritePredicted: true,
    isolationVerified: true,
    demandFaultPredicted: true,
  };
  assert.equal(canMasterVirtualMemoryLab(completedMachine, evidence), true);
  for (const missing of Object.keys(evidence)) {
    assert.equal(canMasterVirtualMemoryLab(completedMachine, { ...evidence, [missing]: false }), false);
  }
  assert.equal(canMasterVirtualMemoryLab(cow, evidence), false);
});

test("does not award pre-COW sharing evidence after COW already split the page", () => {
  const empty = {
    sharedReadPredicted: false,
    offsetPreserved: false,
    cowWritePredicted: false,
    isolationVerified: false,
    demandFaultPredicted: false,
  };
  const initial = createVirtualMemoryMachine();
  const cow = accessVirtualMemory(initial, "child", 0x4018, "write", 55);
  let evidence = memoryLabEvidenceAfterAccess(initial, cow, true, empty);
  const lateRead = accessVirtualMemory(cow.machine, "child", 0x4018, "read");
  evidence = memoryLabEvidenceAfterAccess(cow.machine, lateRead, true, evidence);
  const demand = accessVirtualMemory(lateRead.machine, "parent", 0x5018, "write", 5);
  evidence = memoryLabEvidenceAfterAccess(lateRead.machine, demand, true, evidence);

  assert.equal(evidence.sharedReadPredicted, false);
  assert.equal(evidence.cowWritePredicted, true);
  assert.equal(evidence.demandFaultPredicted, true);
  assert.equal(canMasterVirtualMemoryLab(demand.machine, evidence), false);
});

test("accepts a non-99 COW write when the parent byte is preserved", () => {
  const initial = createVirtualMemoryMachine();
  const sharedRead = accessVirtualMemory(initial, "child", 0x4018, "read");
  let evidence = memoryLabEvidenceAfterAccess(initial, sharedRead, true, {
    sharedReadPredicted: false,
    offsetPreserved: false,
    cowWritePredicted: false,
    isolationVerified: false,
    demandFaultPredicted: false,
  });
  const cow = accessVirtualMemory(sharedRead.machine, "child", 0x4018, "write", 55);
  evidence = memoryLabEvidenceAfterAccess(sharedRead.machine, cow, true, evidence);
  const demand = accessVirtualMemory(cow.machine, "parent", 0x5018, "write", 5);
  evidence = memoryLabEvidenceAfterAccess(cow.machine, demand, true, evidence);
  assert.equal(heapIsolation(demand.machine).childValue, 55);
  assert.equal(canMasterVirtualMemoryLab(demand.machine, evidence), true);
});

test("grades four debugger incidents from computed semantics", () => {
  assert.deepEqual(evaluateMemoryIncident("translation", {
    vpn: 2,
    offset: 0xabc,
    physicalAddress: 0x9abc,
  }), { correct: true, errors: [] });
  assert.deepEqual(evaluateMemoryIncident("translation", {
    vpn: 2,
    offset: 0,
    physicalAddress: 0x9000,
  }).errors, ["offset", "physical-address"]);

  assert.equal(evaluateMemoryIncident("tlb-miss", {
    ptePresent: true,
    tlbOutcome: "page-table-walk",
  }).correct, true);
  assert.deepEqual(evaluateMemoryIncident("tlb-miss", {
    ptePresent: true,
    tlbOutcome: "page-fault",
  }).errors, ["tlb-outcome"]);

  assert.equal(evaluateMemoryIncident("cow-isolation", {
    parentFrame: 7,
    childFrame: 42,
    parentValue: 41,
    childValue: 99,
  }).correct, true);
  assert.ok(evaluateMemoryIncident("cow-isolation", {
    parentFrame: 7,
    childFrame: 7,
    parentValue: 99,
    childValue: 99,
  }).errors.includes("child-frame"));
  assert.ok(evaluateMemoryIncident("cow-isolation", {
    parentFrame: 7,
    childFrame: 0,
    parentValue: 41,
    childValue: 99,
  }).errors.includes("child-frame"));
  assert.ok(evaluateMemoryIncident("cow-isolation", {
    parentFrame: 7,
    childFrame: 2,
    parentValue: 41,
    childValue: 99,
  }).errors.includes("child-frame"));

  assert.equal(evaluateMemoryIncident("maps-residency", {
    mappedPages: 6,
    residentPages: 3,
    residencyConclusion: "mapped-not-resident",
  }).correct, true);
  assert.deepEqual(evaluateMemoryIncident("maps-residency", {
    mappedPages: 6,
    residentPages: 6,
    residencyConclusion: "all-mapped-resident",
  }).errors, ["resident-pages", "residency-conclusion"]);
});

test("requires the lab, all incidents, and concepts for chapter completion", () => {
  const complete = {
    memoryLabComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  };
  assert.equal(canCompleteMemoryChapter(complete), true);
  for (const missing of Object.keys(complete)) {
    assert.equal(canCompleteMemoryChapter({ ...complete, [missing]: false }), false);
  }
});

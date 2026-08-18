import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  NETWORK_VIEW_ETH0_ADDRESS,
  NETWORK_VIEW_ETH0_PREFIX,
  NETWORK_VIEW_LOOPBACK_ADDRESS,
  NETWORK_VIEW_LOOPBACK_PREFIX,
  applyNetworkViewAction,
  canCompleteInterfacesAddressesLoopbackChapter,
  canCompleteNetworkViewIncidents,
  canMasterNetworkViewLab,
  createNetworkViewMachine,
  emptyNetworkViewLabEvidence,
  evaluateNetworkViewIncidentRepair,
  evaluateNetworkViewLabPrediction,
  inspectNetworkViewInvariants,
  mergeNetworkViewLabEvidence,
  networkViewEvidenceCommandIds,
  networkViewIncidentIds,
  networkViewPhaseIds,
  networkViewPhaseSnapshot,
  networkViewPhaseSnapshots,
  networkOperationalState,
  projectNetworkViewCommand,
  traceLocalhost,
} from "../src/features/linux-networking/interfaces-addresses-and-loopback.ts";

const correctPrediction = {
  initialEth0: "exists-admin-down",
  afterAdminUp: "admin-up-carrier-down",
  addressMeaning: "ipv4-with-prefix",
  localhostPath: "host-loopback",
  loDownResult: "resolves-but-not-usable",
};

test("builds six cumulative figure phases from observable network state", () => {
  assert.deepEqual(networkViewPhaseSnapshots.map(({ id }) => id), networkViewPhaseIds);
  assert.equal(networkViewPhaseSnapshots.length, 6);

  const observed = networkViewPhaseSnapshot("observe");
  assert.equal(observed.invariants.eth0Exists, true);
  assert.equal(observed.invariants.eth0AdminUp, false);
  assert.equal(observed.invariants.eth0CarrierUp, false);
  assert.equal(observed.invariants.loopbackAddressConfigured, true);
  assert.equal(observed.invariants.loopbackAdminUp, false);

  const adminUp = networkViewPhaseSnapshot("eth0-up");
  assert.equal(adminUp.invariants.eth0AdminUp, true);
  assert.equal(adminUp.invariants.eth0CarrierUp, false);
  assert.equal(adminUp.commands["eth0-operstate"].lines[0], "down");
  assert.equal(networkOperationalState(adminUp.machine.interfaces.find(({ id }) => id === "eth0")), "DOWN");
  assert.match(adminUp.commands["ip-brief-link"].lines.join("\n"), /eth0\s+DOWN.*<BROADCAST,MULTICAST,UP>/);

  const addressed = networkViewPhaseSnapshot("address-added");
  assert.equal(addressed.invariants.eth0CarrierUp, false);
  assert.equal(addressed.invariants.eth0AddressConfigured, true);
  assert.match(
    addressed.commands["ip-brief-address"].lines.join("\n"),
    new RegExp(`${NETWORK_VIEW_ETH0_ADDRESS}/${NETWORK_VIEW_ETH0_PREFIX}`.replaceAll(".", "\\.")),
  );

  const loopbackUp = networkViewPhaseSnapshot("lo-up");
  assert.equal(loopbackUp.invariants.loopbackAdminUp, true);
  assert.equal(loopbackUp.invariants.loopbackAddressConfigured, true);

  const pass = networkViewPhaseSnapshot("localhost-pass");
  assert.deepEqual(pass.localhostTrace, {
    hostname: "localhost",
    resolved: true,
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
    interfaceId: "lo",
    scope: "host",
    leavesHost: false,
    usable: true,
    failure: null,
  });

  const counterfactual = networkViewPhaseSnapshot("lo-down-counterfactual");
  assert.equal(counterfactual.localhostTrace.resolved, true);
  assert.equal(counterfactual.localhostTrace.usable, false);
  assert.equal(counterfactual.localhostTrace.failure, "loopback-admin-down");
  assert.equal(counterfactual.localhostTrace.leavesHost, false);
  assert.equal(
    counterfactual.commands["getent-localhost-v4"].lines[0],
    `${NETWORK_VIEW_LOOPBACK_ADDRESS}  STREAM localhost`,
  );
});

test("keeps interface existence, admin state, carrier, and IPv4 assignment independent", () => {
  const initial = createNetworkViewMachine();
  const eth0Initial = initial.interfaces.find(({ id }) => id === "eth0");
  assert.ok(eth0Initial);
  assert.equal(eth0Initial.adminState, "down");
  assert.equal(eth0Initial.carrierState, "down");
  assert.deepEqual(eth0Initial.ipv4, []);

  const admin = applyNetworkViewAction(initial, {
    type: "set-admin",
    interfaceId: "eth0",
    state: "up",
  });
  assert.equal(admin.ok, true);
  const eth0Admin = admin.machine.interfaces.find(({ id }) => id === "eth0");
  assert.equal(eth0Admin.carrierState, "down");
  assert.deepEqual(eth0Admin.ipv4, []);

  const address = applyNetworkViewAction(admin.machine, {
    type: "assign-ipv4",
    interfaceId: "eth0",
    address: NETWORK_VIEW_ETH0_ADDRESS,
    prefixLength: NETWORK_VIEW_ETH0_PREFIX,
  });
  const eth0Addressed = address.machine.interfaces.find(({ id }) => id === "eth0");
  assert.equal(eth0Addressed.adminState, "up");
  assert.equal(eth0Addressed.carrierState, "down");
  assert.deepEqual(eth0Addressed.ipv4, [{
    address: NETWORK_VIEW_ETH0_ADDRESS,
    prefixLength: NETWORK_VIEW_ETH0_PREFIX,
    scope: "global",
  }]);

  const carrier = applyNetworkViewAction(address.machine, {
    type: "restore-carrier",
    interfaceId: "eth0",
  });
  const eth0Ready = carrier.machine.interfaces.find(({ id }) => id === "eth0");
  assert.equal(eth0Ready.adminState, "up");
  assert.equal(eth0Ready.carrierState, "up");
  assert.deepEqual(eth0Ready.ipv4, eth0Addressed.ipv4);
});

test("rejects invalid configuration without changing the machine", () => {
  const initial = createNetworkViewMachine();
  for (const action of [
    { type: "set-admin", interfaceId: "missing0", state: "up" },
    { type: "restore-carrier", interfaceId: "lo" },
    { type: "assign-ipv4", interfaceId: "eth0", address: "10.0.0.999", prefixLength: 24 },
    { type: "assign-ipv4", interfaceId: "eth0", address: "10.0.0.2", prefixLength: 33 },
    { type: "remove-ipv4", interfaceId: "eth0", address: "10.0.0.2" },
  ]) {
    const transition = applyNetworkViewAction(initial, action);
    assert.equal(transition.ok, false);
    assert.equal(transition.machine, initial);
  }
});

test("resolves localhost independently from loopback address and admin usability", () => {
  let machine = createNetworkViewMachine();
  let trace = traceLocalhost(machine);
  assert.equal(trace.resolved, true);
  assert.equal(trace.usable, false);
  assert.equal(trace.failure, "loopback-admin-down");
  assert.equal(trace.leavesHost, false);

  machine = applyNetworkViewAction(machine, {
    type: "remove-ipv4",
    interfaceId: "lo",
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
  }).machine;
  trace = traceLocalhost(machine);
  assert.equal(trace.resolved, true);
  assert.equal(trace.usable, false);
  assert.equal(trace.failure, "loopback-address-missing");

  machine = applyNetworkViewAction(machine, {
    type: "assign-ipv4",
    interfaceId: "lo",
    address: NETWORK_VIEW_LOOPBACK_ADDRESS,
    prefixLength: NETWORK_VIEW_LOOPBACK_PREFIX,
  }).machine;

  machine = applyNetworkViewAction(machine, {
    type: "set-admin",
    interfaceId: "lo",
    state: "up",
  }).machine;
  trace = traceLocalhost(machine);
  assert.equal(trace.usable, true);
  assert.equal(trace.interfaceId, "lo");
  assert.equal(trace.scope, "host");
  assert.equal(trace.leavesHost, false);
});

test("projects five deterministic read-only evidence commands", () => {
  const machine = networkViewPhaseSnapshot("localhost-pass").machine;
  assert.equal(networkViewEvidenceCommandIds.length, 5);
  for (const id of networkViewEvidenceCommandIds) {
    const before = structuredClone(machine);
    const first = projectNetworkViewCommand(machine, id);
    const second = projectNetworkViewCommand(machine, id);
    assert.deepEqual(first, second);
    assert.deepEqual(machine, before);
    assert.ok(first.command.length > 0);
    assert.ok(first.lines.length > 0);
  }
  assert.match(
    projectNetworkViewCommand(machine, "route-get-loopback").lines[0],
    /^local 127\.0\.0\.1 dev lo/,
  );
});

test("requires prediction evidence and ordered model history for lab mastery", () => {
  const evaluation = evaluateNetworkViewLabPrediction(correctPrediction);
  assert.equal(evaluation.correct, true);
  const evidence = mergeNetworkViewLabEvidence(emptyNetworkViewLabEvidence, evaluation);
  const pass = networkViewPhaseSnapshot("localhost-pass").machine;
  assert.equal(canMasterNetworkViewLab(pass, evidence), true);
  assert.equal(canMasterNetworkViewLab(pass, emptyNetworkViewLabEvidence), false);

  const sameFinalConfigurationWithoutHistory = {
    ...pass,
    events: [],
  };
  assert.deepEqual(
    inspectNetworkViewInvariants(sameFinalConfigurationWithoutHistory),
    inspectNetworkViewInvariants(pass),
  );
  assert.equal(canMasterNetworkViewLab(sameFinalConfigurationWithoutHistory, evidence), false);

  const counterfactual = networkViewPhaseSnapshot("lo-down-counterfactual").machine;
  assert.equal(canMasterNetworkViewLab(counterfactual, evidence), false);
});

test("repairs four single-fault incidents semantically", () => {
  const correctRepairs = {
    "interface-absent": "restore-interface",
    "admin-down": "bring-admin-up",
    "carrier-down": "restore-carrier",
    "loopback-address-missing": "restore-loopback-address",
  };
  assert.deepEqual(Object.keys(correctRepairs), [...networkViewIncidentIds]);
  for (const id of networkViewIncidentIds) {
    const evaluation = evaluateNetworkViewIncidentRepair(id, correctRepairs[id]);
    assert.equal(evaluation.correct, true, `${id}: ${evaluation.errors.join(", ")}`);
    assert.equal(traceLocalhost(evaluation.machine).usable, true);
  }
  assert.equal(
    evaluateNetworkViewIncidentRepair("admin-down", "restore-carrier").correct,
    false,
  );
  assert.equal(canCompleteNetworkViewIncidents(correctRepairs), true);
  assert.equal(canCompleteNetworkViewIncidents({ ...correctRepairs, "carrier-down": "bring-admin-up" }), false);
});

test("keeps chapter completion conjunctive", () => {
  assert.equal(canCompleteInterfacesAddressesLoopbackChapter({
    labComplete: true,
    incidentsComplete: true,
    conceptsMastered: true,
  }), true);
  for (const missing of ["labComplete", "incidentsComplete", "conceptsMastered"]) {
    const state = {
      labComplete: true,
      incidentsComplete: true,
      conceptsMastered: true,
      [missing]: false,
    };
    assert.equal(canCompleteInterfacesAddressesLoopbackChapter(state), false);
  }
});

test("returns reset focus to the prediction that replaces the command list", async () => {
  const source = await readFile(
    new URL("../src/components/linux-networking/LinuxNetworkViewFigure.tsx", import.meta.url),
    "utf8",
  );
  assert.match(source, /const predictionGroupRef = useRef<HTMLDivElement>\(null\);/);
  assert.match(source, /requestAnimationFrame\(\(\) => \{[\s\S]*?predictionGroupRef\.current[\s\S]*?querySelector<HTMLButtonElement>\("button"\)[\s\S]*?\.focus\(\);/);
  assert.match(source, /groupRef=\{predictionGroupRef\}/);
});

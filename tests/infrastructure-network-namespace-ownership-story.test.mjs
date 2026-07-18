import assert from "node:assert/strict";
import test from "node:test";
import {
  ownershipStoryDeltas,
  ownershipStorySnapshots,
  ownershipStoryStepIds,
} from "../src/features/infrastructure/network-namespace-ownership-story.ts";

test("moves one interface object without cloning it", () => {
  assert.equal(ownershipStorySnapshots["separate-views"].interfaceNamespace, "host");
  assert.equal(ownershipStorySnapshots["interface-moves"].interfaceNamespace, "app");
  for (const stepId of ownershipStoryStepIds) {
    assert.equal(typeof ownershipStorySnapshots[stepId].interfaceNamespace, "string");
  }
});

test("moves the thread without migrating the existing host socket", () => {
  const snapshot = ownershipStorySnapshots["thread-enters-app"];
  assert.equal(snapshot.threadNamespace, "app");
  assert.deepEqual(snapshot.listeners, [{
    id: "host-listener",
    namespaceId: "host",
    createdIn: "host",
    endpoint: "127.0.0.1:8080",
  }]);
});

test("creates a second listener with the same endpoint in the app namespace", () => {
  const snapshot = ownershipStorySnapshots["socket-created-in-app"];
  assert.equal(snapshot.listeners.length, 2);
  assert.deepEqual(snapshot.listeners.map(({ namespaceId }) => namespaceId), ["host", "app"]);
  assert.deepEqual(new Set(snapshot.listeners.map(({ endpoint }) => endpoint)), new Set(["127.0.0.1:8080"]));
});

test("keeps route and neighbor tables distinct through every story step", () => {
  for (const snapshot of Object.values(ownershipStorySnapshots)) {
    assert.notEqual(snapshot.tables.host.route, snapshot.tables.app.route);
    assert.notEqual(snapshot.tables.host.neighbor, snapshot.tables.app.neighbor);
  }
});

test("reports the interface move as one ownership change", () => {
  const delta = ownershipStoryDeltas["interface-moves"];

  assert.equal(delta.previousStepId, "separate-views");
  assert.deepEqual(delta.changedRows, [{
    objectId: "interface",
    objectKind: "interface",
    beforeOwner: "host",
    afterOwner: "app",
  }]);
  assert.deepEqual(delta.createdRows, []);
  assert.deepEqual(delta.preservedRows.map(({ objectId }) => objectId), [
    "thread",
    "host-listener",
  ]);
});

test("reports that setns moves the thread while preserving the host socket", () => {
  const delta = ownershipStoryDeltas["thread-enters-app"];

  assert.deepEqual(delta.changedRows, [{
    objectId: "thread",
    objectKind: "thread",
    beforeOwner: "host",
    afterOwner: "app",
  }]);
  assert.deepEqual(delta.createdRows, []);
  assert.deepEqual(delta.preservedRows, [
    {
      objectId: "interface",
      objectKind: "interface",
      beforeOwner: "app",
      afterOwner: "app",
    },
    {
      objectId: "host-listener",
      objectKind: "socket",
      beforeOwner: "host",
      afterOwner: "host",
    },
  ]);
});

test("reports the app socket as created without changing the host socket", () => {
  const delta = ownershipStoryDeltas["socket-created-in-app"];

  assert.deepEqual(delta.changedRows, []);
  assert.deepEqual(delta.createdRows, [{
    objectId: "app-listener",
    objectKind: "socket",
    beforeOwner: null,
    afterOwner: "app",
  }]);
  assert.deepEqual(delta.preservedRows.find(
    ({ objectId }) => objectId === "host-listener",
  ), {
    objectId: "host-listener",
    objectKind: "socket",
    beforeOwner: "host",
    afterOwner: "host",
  });
});

test("uses the initial state as a preserved baseline", () => {
  const delta = ownershipStoryDeltas["separate-views"];

  assert.equal(delta.previousStepId, null);
  assert.deepEqual(delta.changedRows, []);
  assert.deepEqual(delta.createdRows, []);
  assert.deepEqual(delta.preservedRows.map(({ objectId }) => objectId), [
    "interface",
    "thread",
    "host-listener",
  ]);
});

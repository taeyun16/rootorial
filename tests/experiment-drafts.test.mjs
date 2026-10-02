import assert from "node:assert/strict";
import test from "node:test";
import { ExperimentDraftStore, experimentDraftKey } from "../src/features/progress/experiment-drafts.ts";

function memory() {
  const items = new Map();
  return { getItem: (key) => items.get(key) ?? null, setItem: (key, value) => items.set(key, value), removeItem: (key) => items.delete(key) };
}

test("drafts restore only matching identity and never update completion or outbox", () => {
  const storage = memory();
  storage.setItem("account-a", '["transformer-from-zero/training"]');
  storage.setItem("account-a:outbox:v1", "pending");
  const first = new ExperimentDraftStore(storage, "account-a");
  first.start();
  first.set("vector:v1", { v: [2, 3], scalar: 2 });
  assert.deepEqual(first.getSnapshot().restoredIds, []);
  const reload = new ExperimentDraftStore(storage, "account-a");
  reload.start();
  assert.deepEqual(reload.getSnapshot().values["vector:v1"], { v: [2, 3], scalar: 2 });
  assert.deepEqual(reload.getSnapshot().restoredIds, ["vector:v1"]);
  for (const identity of ["account-b", "anonymous", "rehearsal"]) {
    const other = new ExperimentDraftStore(storage, identity);
    other.start();
    assert.deepEqual(other.getSnapshot().values, {});
  }
  assert.equal(storage.getItem("account-a"), '["transformer-from-zero/training"]');
  assert.equal(storage.getItem("account-a:outbox:v1"), "pending");
});

test("clear/reset notify consumers without recreating drafts and preserve other namespaces", () => {
  const storage = memory();
  storage.setItem(experimentDraftKey("other"), '{"keep":true}');
  const store = new ExperimentDraftStore(storage, "rehearsal");
  store.start();
  store.set("v1", [1, 2]);
  store.set("v2", [3, 4]);
  let updates = 0;
  const unsubscribe = store.subscribe(() => updates++);
  store.clear("v1");
  assert.deepEqual(store.getSnapshot().values, { v2: [3, 4] });
  assert.equal(store.reset(), true);
  assert.deepEqual(store.getSnapshot().values, {});
  assert.equal(updates, 2);
  assert.equal(storage.getItem(experimentDraftKey("rehearsal")), null);
  assert.equal(storage.getItem(experimentDraftKey("other")), '{"keep":true}');
  unsubscribe();
});

test("blocked storage keeps inputs in memory and reports reset failure honestly", () => {
  const broken = { getItem: () => { throw Error("blocked"); }, setItem: () => { throw Error("quota"); }, removeItem: () => { throw Error("blocked"); } };
  const store = new ExperimentDraftStore(broken, "a");
  store.start();
  assert.equal(store.getSnapshot().storageAvailable, false);
  store.set("v1", [4, 5]);
  assert.deepEqual(store.getSnapshot().values.v1, [4, 5]);
  assert.equal(store.getSnapshot().storageAvailable, false);
  assert.equal(store.reset(), false);
  assert.deepEqual(store.getSnapshot().values, {});
});

test("malformed stored JSON and premature writes cannot overwrite saved drafts", () => {
  const storage = memory();
  storage.setItem(experimentDraftKey("a"), "malformed");
  const store = new ExperimentDraftStore(storage, "a");
  store.set("v1", "premature");
  assert.equal(storage.getItem(experimentDraftKey("a")), "malformed");
  store.start();
  assert.deepEqual(store.getSnapshot().values, {});
  assert.equal(store.getSnapshot().storageAvailable, true);
  assert.equal(storage.getItem(experimentDraftKey("a")), "malformed");
});

test("two tabs preserve each other's distinct drafts and use last writer for the same input", () => {
  const storage = memory();
  const tab1 = new ExperimentDraftStore(storage, "a");
  const tab2 = new ExperimentDraftStore(storage, "a");
  tab1.start();
  tab2.start();
  tab1.set("vector:v1", [1, 2]);
  tab2.set("another:v1", { x: 4 });
  assert.deepEqual(JSON.parse(storage.getItem(experimentDraftKey("a"))), { "vector:v1": [1, 2], "another:v1": { x: 4 } });
  tab1.clear("vector:v1");
  assert.deepEqual(JSON.parse(storage.getItem(experimentDraftKey("a"))), { "another:v1": { x: 4 } });
  tab2.set("another:v1", { x: 5 });
  assert.deepEqual(JSON.parse(storage.getItem(experimentDraftKey("a"))), { "another:v1": { x: 5 } });
  tab1.set("another:v1", { x: 6 });
  assert.deepEqual(JSON.parse(storage.getItem(experimentDraftKey("a"))), { "another:v1": { x: 6 } });
});

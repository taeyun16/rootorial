import assert from "node:assert/strict";
import test from "node:test";
import { ProgressClient } from "../src/features/progress/progress-client.ts";

function memory() {
  const items = new Map();
  return { getItem: (k) => items.get(k) ?? null, setItem: (k, v) => items.set(k, v), removeItem: (k) => items.delete(k) };
}
const vector = "transformer-from-zero/vectors";
const shell = "linux-systems/shell-and-filesystem";
const empty = () => ({ completed: [], resume: null });

test("outbox survives failure/reload and retry sends the same evidence safely", async () => {
  const storage = memory();
  const failing = { read: async () => empty(), merge: async () => { throw Error("offline"); } };
  const client = new ProgressClient(storage, "account-a", failing);
  await client.start();
  await client.complete(vector);
  assert.equal(client.state.status, "error");
  assert.deepEqual(JSON.parse(storage.getItem("account-a:outbox:v1")).completed, [vector]);
  client.dispose();
  const sent = [];
  const next = new ProgressClient(storage, "account-a", { read: async () => empty(), merge: async (p) => { sent.push(p); return p; } });
  await next.start();
  assert.deepEqual(next.state.completed, [vector]);
  assert.deepEqual(sent[0].completed, [vector]);
  assert.equal(storage.getItem("account-a:outbox:v1"), null);
  assert.equal(next.state.status, "synced");
});

test("an older response cannot erase a completion made in flight", async () => {
  let release;
  const requests = [];
  let delay = false;
  const remote = { read: async () => empty(), merge: async (p) => { requests.push(p); if (delay) { delay = false; await new Promise((r) => { release = r; }); } return p; } };
  const client = new ProgressClient(memory(), "a", remote);
  await client.start();
  delay = true;
  const first = client.complete(vector);
  const second = client.complete(shell);
  release();
  await Promise.all([first, second]);
  assert.deepEqual(client.state.completed, [vector, shell]);
  assert.deepEqual(requests.at(-1).completed, [vector, shell]);
  assert.equal(client.state.status, "synced");
});

test("storage failure is reported honestly and rehearsal reset leaves public progress alone", async () => {
  const broken = { getItem: () => null, setItem: () => { throw Error("quota"); }, removeItem: () => {} };
  const client = new ProgressClient(broken, "a");
  await client.start();
  await client.complete(vector);
  assert.equal(client.state.status, "memory");
  assert.equal(client.state.storageAvailable, false);
  assert.deepEqual(client.state.completed, [vector]);
  const storage = memory();
  storage.setItem("public", JSON.stringify([shell]));
  const rehearsal = new ProgressClient(storage, "rehearsal");
  await rehearsal.start();
  await rehearsal.complete(vector);
  rehearsal.reset();
  assert.equal(storage.getItem("rehearsal"), null);
  assert.equal(storage.getItem("public"), JSON.stringify([shell]));
});

test("disposed identity never schedules another write after its delayed read", async () => {
  let release;
  let writes = 0;
  const client = new ProgressClient(memory(), "a", { read: () => new Promise((r) => { release = r; }), merge: async (p) => { writes++; return p; } });
  const start = client.start();
  client.dispose();
  release(empty());
  await start;
  assert.equal(writes, 0);
});

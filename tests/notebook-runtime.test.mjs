import assert from "node:assert/strict";
import test from "node:test";

const tick = () => new Promise((resolve) => setImmediate(resolve));

test("stopping the shared notebook kernel rejects every run and permits a clean restart", async (context) => {
  const originalWorker = globalThis.Worker;
  const originalSetTimeout = globalThis.setTimeout;
  const workers = [];

  class FakeWorker {
    listeners = new Map();
    messages = [];
    terminated = false;

    constructor(url) {
      this.url = url;
      workers.push(this);
    }

    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }

    postMessage(message) {
      this.messages.push(message);
      if (message.type === "init") {
        queueMicrotask(() => this.emit("message", { data: { type: "ready" } }));
      }
      if (message.type === "run" && message.code === "complete") {
        queueMicrotask(() => {
          this.emit("message", {
            data: {
              type: "result",
              requestId: message.requestId,
              output: "fresh kernel",
              figures: [],
              executionCount: 1,
              elapsedMs: 2,
            },
          });
        });
      }
    }

    terminate() {
      this.terminated = true;
    }

    emit(type, event) {
      if (this.terminated) return;
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
  }

  globalThis.Worker = FakeWorker;
  context.after(() => {
    globalThis.Worker = originalWorker;
    globalThis.setTimeout = originalSetTimeout;
  });

  const moduleUrl = new URL("../src/components/notebookRuntime.ts", import.meta.url);
  moduleUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const runtime = await import(moduleUrl.href);
  const releaseRuntime = runtime.retainNotebookRuntime();

  const firstRun = runtime.runNotebookCode("hang one").catch((error) => error);
  const secondRun = runtime.runNotebookCode("hang two").catch((error) => error);
  await tick();

  assert.equal(workers.length, 1);
  assert.equal(
    workers[0].messages.filter((message) => message.type === "run").length,
    2,
  );

  runtime.restartNotebookRuntime();
  const [firstError, secondError] = await Promise.all([firstRun, secondRun]);
  assert.equal(firstError.code, "stopped");
  assert.equal(secondError.code, "stopped");
  assert.equal(workers[0].terminated, true);

  const result = await runtime.runNotebookCode("complete");
  assert.equal(workers.length, 2);
  assert.equal(result.output, "fresh kernel");
  assert.equal(result.executionCount, 1);

  let scheduledDispose;
  globalThis.setTimeout = (callback, delay) => {
    scheduledDispose = { callback, delay };
    return 1;
  };
  releaseRuntime();
  assert.equal(scheduledDispose.delay, 15_000);
  scheduledDispose.callback();
  assert.equal(workers[1].terminated, true);
});

async function initializationFixture(context) {
  const saved = { Worker: globalThis.Worker, setTimeout: globalThis.setTimeout, clearTimeout: globalThis.clearTimeout };
  const workers = [];
  const timers = [];
  class ControlledWorker {
    listeners = new Map();
    messages = [];
    terminated = false;
    throwOnInit = false;
    constructor() { workers.push(this); }
    addEventListener(type, listener) {
      const listeners = this.listeners.get(type) ?? [];
      listeners.push(listener);
      this.listeners.set(type, listeners);
    }
    postMessage(message) {
      if (message.type === "init" && this.throwOnInit) throw new Error("init transport failed");
      this.messages.push(message);
    }
    terminate() { this.terminated = true; }
    // Deliberately deliver callbacks even after termination to simulate queued events.
    emit(type, event) {
      for (const listener of this.listeners.get(type) ?? []) listener(event);
    }
  }
  globalThis.Worker = ControlledWorker;
  globalThis.setTimeout = (callback, delay) => {
    const timer = { callback, delay, cleared: false, id: timers.length + 1 };
    timers.push(timer);
    return timer.id;
  };
  globalThis.clearTimeout = (id) => {
    const timer = timers.find((timer) => timer.id === id);
    if (timer) timer.cleared = true;
  };
  const moduleUrl = new URL("../src/components/notebookRuntime.ts", import.meta.url);
  moduleUrl.searchParams.set("initialization-test", Math.random().toString());
  const runtime = await import(moduleUrl.href);
  context.after(() => {
    runtime.restartNotebookRuntime();
    Object.assign(globalThis, saved);
  });
  return { workers, timers, runtime };
}

test("a stalled initialization rejects all consumers, clears its timer and ignores late worker/timer events during retry", async (context) => {
  const { workers, timers, runtime } = await initializationFixture(context);
  const first = runtime.runNotebookCode("first").catch((error) => error);
  const second = runtime.runNotebookCode("second").catch((error) => error);
  assert.equal(workers.length, 1);
  assert.equal(timers[0].delay, 180_000);
  timers[0].callback();
  const errors = await Promise.all([first, second]);
  for (const error of errors) {
    assert.equal(error.code, "runtime");
    assert.match(error.message, /timed out after 3 minutes/);
  }
  assert.equal(workers[0].terminated, true);
  assert.equal(timers[0].cleared, true);
  let settled = false;
  const retry = runtime.runNotebookCode("retry").then((result) => { settled = true; return result; });
  workers[0].emit("message", { data: { type: "ready" } });
  workers[0].emit("message", { data: { type: "error", error: "late failure" } });
  workers[0].emit("error", { message: "late transport failure" });
  workers[0].emit("messageerror", {});
  timers[0].callback();
  await tick();
  assert.equal(settled, false);
  assert.equal(workers[1].terminated, false);
  assert.equal(workers[1].messages.some((message) => message.type === "run"), false);
  workers[1].emit("message", { data: { type: "ready" } });
  await tick();
  assert.equal(timers[1].cleared, true);
  const requestId = workers[1].messages.find((message) => message.type === "run").requestId;
  const result = { type: "result", requestId, output: "fresh", figures: [], executionCount: 1, elapsedMs: 1 };
  workers[0].emit("message", { data: { ...result, output: "old worker" } });
  timers[1].callback(); // Already queued watchdog callbacks also cannot kill a ready kernel.
  await tick();
  assert.equal(settled, false);
  assert.equal(workers[1].terminated, false);
  workers[1].emit("message", { data: result });
  assert.equal((await retry).output, "fresh");
});

test("bootstrap failure cancels the watchdog and permits a new initialization; synchronous init-send failure also settles", async (context) => {
  const { workers, timers, runtime } = await initializationFixture(context);
  const pending = runtime.runNotebookCode("failed").catch((error) => error);
  workers[0].emit("message", { data: { type: "error", error: "local WASM HTTP 404" } });
  assert.equal((await pending).code, "runtime");
  assert.equal(timers[0].cleared, true);
  assert.equal(workers[0].terminated, true);

  const retry = runtime.runNotebookCode("retry").catch((error) => error);
  assert.equal(workers.length, 2);
  runtime.restartNotebookRuntime();
  assert.equal((await retry).code, "stopped");
  assert.equal(timers[1].cleared, true);

  // Constructor behavior is otherwise unchanged; inject an init transport fault.
  const originalPost = globalThis.Worker.prototype.postMessage;
  globalThis.Worker.prototype.postMessage = function(message) {
    this.throwOnInit = true;
    return originalPost.call(this, message);
  };
  const sendFailure = await runtime.runNotebookCode("send failure").catch((error) => error);
  assert.equal(sendFailure.code, "runtime");
  assert.match(sendFailure.message, /initialization could not start/);
  assert.equal(workers[2].terminated, true);
  assert.equal(timers[2].cleared, true);
});

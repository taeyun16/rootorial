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

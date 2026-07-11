import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("renders the curriculum home", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Transformer를/);
  assert.match(html, /바닥부터/);
  assert.match(html, /벡터와 텐서/);
  assert.match(html, /Mini Transformer/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the interactive vectors chapter", async () => {
  const response = await render("/chapters/vectors");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /CHAPTER 01/);
  assert.match(html, /두 벡터를 움직여 보세요/);
  assert.match(html, /NumPy로 같은 계산 재현하기/);
  assert.match(html, /이 챕터 완료하기/);
  assert.match(html, /data-language="python"/);
  assert.match(html, /tok-variableName/);
  assert.match(html, /tok-number/);
});

test("ships the browser Python worker and removes the starter preview", async () => {
  const worker = await readFile(new URL("../public/pyodide-worker.js", import.meta.url), "utf8");
  assert.match(worker, /loadPyodide/);
  assert.match(worker, /loadPackage\("numpy"\)/);
  await assert.rejects(access(new URL("../app\/_sites-preview", import.meta.url)));
});

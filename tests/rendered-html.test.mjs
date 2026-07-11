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
  assert.match(html, /로그인 준비 중/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the interactive vectors chapter", async () => {
  const response = await render("/chapters/vectors");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /CHAPTER 01/);
  assert.match(html, /텐서를 읽는 세 가지 축/);
  assert.match(html, /batch, tokens, d_model/);
  assert.match(html, /브로드캐스팅/);
  assert.match(html, /두 벡터를 움직여 보세요/);
  assert.match(html, /벡터를 만들고 크기와 방향 확인하기/);
  assert.match(html, /브로드캐스팅 전후 값을 heatmap으로 비교하기/);
  assert.match(html, /내적을 Attention 행렬로 확장하기/);
  assert.match(html, /작은 Self-Attention heatmap 만들기/);
  assert.match(html, /DISCUSSION/);
  assert.match(html, /벡터 크기 코드 셀/);
  assert.match(html, /텐서 shape 탐색기/);
  assert.match(html, /shape 이해 확인/);
  assert.match(html, /이해 확인: shape를 먼저 예측하기/);
  assert.match(html, /aria-label="v의 x 좌표"/);
  assert.match(html, /aria-label="w의 x 좌표"/);
  assert.match(html, /In \[ \]/);
  assert.match(html, /이 챕터 완료하기/);
  assert.match(html, /data-language="python"/);
  assert.match(html, /tok-variableName/);
  assert.match(html, /tok-number/);
});

test("ships the browser Python worker and removes legacy framework entrypoints", async () => {
  const worker = await readFile(new URL("../public/pyodide-worker.js", import.meta.url), "utf8");
  assert.match(worker, /loadPyodide/);
  assert.match(worker, /loadPackagesFromImports/);
  assert.match(worker, /matplotlib\.pyplot/);
  assert.match(worker, /data:image\/png;base64/);
  await assert.rejects(access(new URL("../worker/index.ts", import.meta.url)));
  await assert.rejects(access(new URL("../next.config.ts", import.meta.url)));
});

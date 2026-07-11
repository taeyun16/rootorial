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

test("renders the Rootorial curriculum catalog", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Rootorial/);
  assert.match(html, /Technology, understood from the root\./);
  assert.match(html, /복잡한 기술을 바닥부터\./);
  assert.match(html, /Transformer를/);
  assert.match(html, /바닥부터/);
  assert.match(html, /Linux 시스템을 바닥부터/);
  assert.match(html, /인프라 설계를 바닥부터/);
  assert.match(html, /디자인 패턴을 바닥부터/);
  assert.match(html, /다음으로 준비하고 있어요/);
  assert.match(html, /로그인 준비 중/);
  assert.match(html, /한국어로 보기/);
  assert.match(html, /View in English/);
  assert.match(html, /첫 챕터 바로 시작/);
  assert.match(html, /href="https:\/\/x\.com\/taeyun16_"/);
  assert.match(html, /href="https:\/\/github\.com\/taeyun16"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/taeyun16\/"/);
  assert.match(html, /aria-label="의견 보내기"/);
  assert.match(html, /Taeyun Jang/);
  assert.match(html, /새로운 커리큘럼과 실험 기록/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the English landing on the first server response", async () => {
  const response = await render("/?lang=en");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/);
  assert.match(html, /Rootorial/);
  assert.match(html, /Technology, understood from the root\./);
  assert.doesNotMatch(html, /복잡한 기술을 바닥부터\./);
  assert.match(html, /Start the first chapter/);
  assert.match(html, /Taeyun Jang&#x27;s social accounts/);
  assert.match(html, /What we&#x27;re preparing next/);
  assert.match(html, /Rootorial — Technology, understood from the root\./);
  assert.doesNotMatch(html, /첫 챕터 바로 시작/);
});

test("renders the Transformer curriculum detail", async () => {
  const response = await render("/curricula/transformer-from-zero");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Rootorial/);
  assert.match(html, /Transformer를/);
  assert.match(html, /벡터와 텐서/);
  assert.match(html, /Mini Transformer/);
});

test("renders the interactive vectors chapter", async () => {
  const response = await render("/curricula/transformer-from-zero/chapters/vectors");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /Rootorial/);
  assert.match(html, /CHAPTER 01/);
  assert.match(html, /텐서를 읽는 세 가지 축/);
  assert.match(html, /batch, tokens, d_model/);
  assert.match(html, /브로드캐스팅/);
  assert.match(html, /두 벡터를 움직여 보세요/);
  assert.match(html, /행렬곱은 내적을 표 전체로 확장합니다/);
  assert.match(html, /결과의 한 칸을 선택해 계산을 추적하세요/);
  assert.match(html, /data-latex="A_\{m \\times n\} B_\{n \\times p\} = C_\{m \\times p\}"/);
  assert.match(html, /data-latex="c_\{11\} = A_\{1,:\} \\cdot B_\{:,1\}"/);
  assert.match(html, /data-latex="c_\{11\} = 1 \\cdot 7 \+ 2 \\cdot 9 \+ 3 \\cdot 11 = 58"/);
  assert.match(html, /data-latex="c_\{ij\} = \\sum_\{k=1\}\^\{n\} a_\{ik\}b_\{kj\}"/);
  assert.match(html, /원소별로 곱하고 모두 더하기/);
  assert.match(html, /연산을 바꾸고 결과를 예측하세요/);
  assert.match(html, /수식은 기호로 압축한 문장입니다/);
  assert.match(html, /아래 첨자와 위 첨자는 달라요/);
  assert.match(html, /data-latex="\\sqrt\{13\} \\approx 3\.606"/);
  assert.match(html, /class="katex-mathml"/);
  assert.match(html, /data-latex="X \\in \\mathbb\{R\}/);
  assert.doesNotMatch(html, /katex-error/);
  assert.ok((html.match(/data-latex=/g) ?? []).length >= 20);
  assert.match(html, /벡터 표기 짧은 확인/);
  assert.match(html, /배열·행벡터·열벡터의 shape와 전치 비교하기/);
  assert.match(html, /영벡터를 정규화할 수 없는 이유 확인/);
  assert.match(html, /컨텍스트 벡터를 만든다는 핵심 구조/);
  assert.match(html, /벡터를 만들고 크기와 방향 확인하기/);
  assert.match(html, /브로드캐스팅 전후 값을 heatmap으로 비교하기/);
  assert.match(html, /내적을 Attention 행렬로 확장하기/);
  assert.match(html, /한 토큰의 질문이 문맥 벡터가 되는 과정/);
  assert.match(html, /토큰 벡터/);
  assert.match(html, /모든 내적/);
  assert.match(html, />Softmax</);
  assert.match(html, /작은 Self-Attention heatmap 만들기/);
  assert.match(html, /DISCUSSION/);
  assert.match(html, /벡터 크기 코드 셀/);
  assert.match(html, /텐서 shape 탐색기/);
  assert.match(html, /shape 이해 확인/);
  assert.match(html, /이해 확인: 계산 전에 구조를 예측하기/);
  assert.match(html, /여섯 문제를 모두 맞히면/);
  assert.match(html, /aria-label="v의 x 좌표"/);
  assert.match(html, /aria-label="w의 x 좌표"/);
  assert.match(html, /In \[ \]/);
  assert.match(html, /이 챕터 완료하기/);
  assert.match(html, /data-language="python"/);
  assert.match(html, /tok-variableName/);
  assert.match(html, /tok-number/);
});

test("redirects the legacy chapter URL to its curriculum-aware canonical URL", async () => {
  const response = await render("/chapters/vectors");
  assert.equal(response.status, 307);
  assert.equal(
    response.headers.get("location"),
    "/curricula/transformer-from-zero/chapters/vectors",
  );
});

test("ships the browser Python worker and removes legacy framework entrypoints", async () => {
  const worker = await readFile(new URL("../public/pyodide-worker.js", import.meta.url), "utf8");
  const favicon = await readFile(new URL("../public/favicon.svg", import.meta.url), "utf8");
  assert.match(worker, /loadPyodide/);
  assert.match(worker, /loadPackagesFromImports/);
  assert.match(worker, /matplotlib\.pyplot/);
  assert.match(worker, /data:image\/png;base64/);
  assert.match(favicon, /M20 49V17h14/);
  assert.match(favicon, /fill="#e08162"/);
  await assert.rejects(access(new URL("../worker/index.ts", import.meta.url)));
  await assert.rejects(access(new URL("../next.config.ts", import.meta.url)));
});

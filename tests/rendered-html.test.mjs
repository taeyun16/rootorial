import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";
import { workerTestEnv } from "./worker-test-env.mjs";

register("./cloudflare-workers-loader.mjs", import.meta.url);

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}-${pathname}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    workerTestEnv(),
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

async function renderWithPublicationRows(pathname, rows) {
  globalThis.__ROOTORIAL_TEST_PUBLICATION_ROWS__ = rows;
  try {
    return await render(pathname);
  } finally {
    delete globalThis.__ROOTORIAL_TEST_PUBLICATION_ROWS__;
  }
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
  assert.match(html, /href="\/curricula\/linux-systems"/);
  assert.match(html, /샘플 커리큘럼/);
  assert.match(html, /인프라 설계를 바닥부터/);
  assert.match(html, /디자인 패턴을 바닥부터/);
  assert.match(html, /다음으로 준비하고 있어요/);
  assert.match(html, /로그인 준비 중/);
  assert.match(html, /한국어로 보기/);
  assert.match(html, /View in English/);
  assert.match(html, /60초 학습 미리보기/);
  assert.match(html, /첫 챕터 바로 시작/);
  assert.match(html, /data-testid="rootorial-learning-scene"/);
  assert.match(html, /aria-controls="hero-learning-preview"/);
  assert.match(html, /href="https:\/\/x\.com\/taeyun16_"/);
  assert.match(html, /href="https:\/\/github\.com\/taeyun16"/);
  assert.match(html, /href="https:\/\/www\.linkedin\.com\/in\/taeyun16\/"/);
  assert.match(html, /aria-label="의견 보내기"/);
  assert.match(html, /Taeyun Jang/);
  assert.match(html, /새로운 커리큘럼과 실험 기록/);
  assert.match(html, /href="\/favicon\.svg"/);
  assert.doesNotMatch(html, /codex-preview|Your site is taking shape|react-loading-skeleton/i);
});

test("renders the Linux browser runtime experiment", async () => {
  const response = await render("/experiments/linux");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /LINUX SYSTEMS · RUNTIME EXPERIMENT 01/);
  assert.match(html, /Linux를/);
  assert.match(html, /브라우저 안에서/);
  assert.match(html, /교육용 시뮬레이터 · 실제 Linux 아님/);
  assert.match(html, /Rootorial shell simulator/);
  assert.match(html, /실제 Linux 커널 부팅/);
  assert.match(html, /v86가 32비트 x86 PC를 WebAssembly로 에뮬레이션/);
  assert.match(html, /Linux 부팅 시작/);
  assert.match(html, /브라우저 Linux 실험 · Rootorial/);
  assert.match(html, /교육용 가상 파일시스템과 셸 명령을 실습합니다/);

  const englishResponse = await render("/experiments/linux?lang=en");
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(englishHtml, /Linux in the Browser Experiment · Rootorial/);
  assert.match(englishHtml, /Teaching simulator · not real Linux/);
});

test("renders the English landing on the first server response", async () => {
  const response = await render("/?lang=en");
  assert.equal(response.status, 200);

  const html = await response.text();
  assert.match(html, /<html[^>]+lang="en"/);
  assert.match(html, /Rootorial/);
  assert.match(html, /Technology, understood from the root\./);
  assert.doesNotMatch(html, /복잡한 기술을 바닥부터\./);
  assert.match(html, /Try a 60-second lesson/);
  assert.match(html, /Start the first chapter/);
  assert.match(html, /Taeyun Jang&#x27;s social accounts/);
  assert.match(html, /What we&#x27;re preparing next/);
  assert.match(html, /Rootorial — Technology, understood from the root\./);
  assert.doesNotMatch(html, /첫 챕터 바로 시작/);
  assert.doesNotMatch(html, /60초 학습 미리보기/);
});

test("renders the Transformer curriculum detail", async () => {
  const response = await render("/curricula/transformer-from-zero");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Rootorial/);
  assert.match(html, /Transformer를/);
  assert.match(html, /벡터와 텐서/);
  assert.match(html, /학습과 최적화/);
  assert.match(html, /분류와 신경망/);
  assert.doesNotMatch(
    html,
    /href="\/curricula\/transformer-from-zero\/chapters\/(?:optimization|neural-networks|training|embeddings|sequences)"/,
  );
  assert.match(html, /Mini Transformer/);
});

test("renders the Linux sample curriculum in both locales", async () => {
  const response = await render("/curricula/linux-systems");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Linux 시스템을/);
  assert.match(html, /첫 샘플 챕터 시작하기/);
  assert.match(html, /셸에서 첫 파일까지/);
  assert.match(html, /전원이 켜지고 셸이 뜨기까지/);
  assert.match(html, /프로세스와 시그널/);
  assert.match(html, /저장장치와 파일시스템/);
  assert.match(html, /패킷에서 소켓까지/);
  assert.match(html, /작은 Linux 조립하기/);
  assert.match(html, /href="\/curricula\/linux-systems\/chapters\/shell-and-filesystem"/);
  assert.doesNotMatch(
    html,
    /href="\/curricula\/linux-systems\/chapters\/(?:boot-to-shell|processes-and-signals|users-and-permissions|memory-and-virtual-addresses|storage-and-filesystems|networking-from-a-packet|assemble-a-tiny-linux)"/,
  );
  assert.match(html, /href="\/experiments\/linux"/);
  assert.match(html, /Linux 실험 열기/);
  assert.match(html, /Linux 시스템을 바닥부터 · Rootorial/);

  const englishResponse = await render("/curricula/linux-systems?lang=en");
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(englishHtml, /Linux Systems from the Ground Up · Rootorial/);
  assert.match(englishHtml, /Start the sample chapter/);
  assert.match(englishHtml, /From the Shell to Your First File/);
});

test("renders the interactive Linux shell and filesystem chapter", async () => {
  const response = await render("/curricula/linux-systems/chapters/shell-and-filesystem");
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /01\. 셸에서 첫 파일까지 · Rootorial/);
  assert.match(html, /셸은 명령을 받아 프로그램과 파일시스템을 연결합니다/);
  assert.match(html, /경로는 파일의 주소이자 탐색을 시작할 기준입니다/);
  assert.match(html, /교육용 시뮬레이터 · 실제 Linux 아님/);
  assert.match(html, /필수 실습/);
  assert.match(html, /mkdir -p lab/);
  assert.match(html, /리다이렉션이 출력을 화면 대신 상대 경로의 파일에 기록합니다/);
  assert.match(html, /보호된 파일의 권한 오류 관찰/);
  assert.match(html, /명령을 외우기보다 경로와 오류의 규칙을 설명해 보세요/);
  assert.match(html, /실제 Linux 부팅 실험 열기/);
  assert.match(html, /이 챕터 완료하기/);

  const englishResponse = await render("/curricula/linux-systems/chapters/shell-and-filesystem?lang=en");
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(englishHtml, /01\. From the Shell to Your First File · Rootorial/);
  assert.match(englishHtml, /The shell connects your commands to programs and the filesystem/);
  assert.match(englishHtml, /Teaching simulator · not real Linux/);
});

test("keeps the completed draft and unknown Linux chapters unavailable", async () => {
  const boot = await render("/curricula/linux-systems/chapters/boot-to-shell");
  const processes = await render(
    "/curricula/linux-systems/chapters/processes-and-signals",
  );
  const permissions = await render(
    "/curricula/linux-systems/chapters/users-and-permissions",
  );
  const permissionsEnglish = await render(
    "/curricula/linux-systems/chapters/users-and-permissions?lang=en",
  );
  const memory = await render(
    "/curricula/linux-systems/chapters/memory-and-virtual-addresses",
  );
  const memoryEnglish = await render(
    "/curricula/linux-systems/chapters/memory-and-virtual-addresses?lang=en",
  );
  const storage = await render(
    "/curricula/linux-systems/chapters/storage-and-filesystems",
  );
  const storageEnglish = await render(
    "/curricula/linux-systems/chapters/storage-and-filesystems?lang=en",
  );
  const networking = await render(
    "/curricula/linux-systems/chapters/networking-from-a-packet",
  );
  const networkingEnglish = await render(
    "/curricula/linux-systems/chapters/networking-from-a-packet?lang=en",
  );
  const tinySystem = await render(
    "/curricula/linux-systems/chapters/assemble-a-tiny-linux",
  );
  const tinySystemEnglish = await render(
    "/curricula/linux-systems/chapters/assemble-a-tiny-linux?lang=en",
  );
  assert.equal(boot.status, 404);
  assert.equal(processes.status, 404);
  assert.equal(permissions.status, 404);
  assert.equal(permissionsEnglish.status, 404);
  assert.equal(memory.status, 404);
  assert.equal(memoryEnglish.status, 404);
  assert.equal(storage.status, 404);
  assert.equal(storageEnglish.status, 404);
  assert.equal(networking.status, 404);
  assert.equal(networkingEnglish.status, 404);
  assert.equal(tinySystem.status, 404);
  assert.equal(tinySystemEnglish.status, 404);
  await Promise.all([
    boot.text(),
    processes.text(),
    permissions.text(),
    permissionsEnglish.text(),
    memory.text(),
    memoryEnglish.text(),
    storage.text(),
    storageEnglish.text(),
    networking.text(),
    networkingEnglish.text(),
    tinySystem.text(),
    tinySystemEnglish.text(),
  ]);

  const unknown = await render("/curricula/linux-systems/chapters/not-a-chapter");
  assert.equal(unknown.status, 404);
  await unknown.text();
});

test("keeps completed Transformer drafts unavailable on their public URLs", async () => {
  const optimization = await render(
    "/curricula/transformer-from-zero/chapters/optimization",
  );
  const neuralNetworks = await render(
    "/curricula/transformer-from-zero/chapters/neural-networks",
  );
  const training = await render(
    "/curricula/transformer-from-zero/chapters/training",
  );
  const trainingEnglish = await render(
    "/curricula/transformer-from-zero/chapters/training?lang=en",
  );
  const embeddings = await render(
    "/curricula/transformer-from-zero/chapters/embeddings",
  );
  const embeddingsEnglish = await render(
    "/curricula/transformer-from-zero/chapters/embeddings?lang=en",
  );
  const sequences = await render(
    "/curricula/transformer-from-zero/chapters/sequences",
  );
  const sequencesEnglish = await render(
    "/curricula/transformer-from-zero/chapters/sequences?lang=en",
  );
  const attention = await render(
    "/curricula/transformer-from-zero/chapters/attention",
  );
  const attentionEnglish = await render(
    "/curricula/transformer-from-zero/chapters/attention?lang=en",
  );
  const selfAttention = await render(
    "/curricula/transformer-from-zero/chapters/self-attention",
  );
  const selfAttentionEnglish = await render(
    "/curricula/transformer-from-zero/chapters/self-attention?lang=en",
  );
  const transformerBlock = await render(
    "/curricula/transformer-from-zero/chapters/transformer-block",
  );
  const transformerBlockEnglish = await render(
    "/curricula/transformer-from-zero/chapters/transformer-block?lang=en",
  );
  const miniTransformer = await render(
    "/curricula/transformer-from-zero/chapters/mini-transformer",
  );
  const miniTransformerEnglish = await render(
    "/curricula/transformer-from-zero/chapters/mini-transformer?lang=en",
  );
  assert.equal(optimization.status, 404);
  assert.equal(neuralNetworks.status, 404);
  assert.equal(training.status, 404);
  assert.equal(trainingEnglish.status, 404);
  assert.equal(embeddings.status, 404);
  assert.equal(embeddingsEnglish.status, 404);
  assert.equal(sequences.status, 404);
  assert.equal(sequencesEnglish.status, 404);
  assert.equal(attention.status, 404);
  assert.equal(attentionEnglish.status, 404);
  assert.equal(selfAttention.status, 404);
  assert.equal(selfAttentionEnglish.status, 404);
  assert.equal(transformerBlock.status, 404);
  assert.equal(transformerBlockEnglish.status, 404);
  assert.equal(miniTransformer.status, 404);
  assert.equal(miniTransformerEnglish.status, 404);
  await Promise.all([
    optimization.text(),
    neuralNetworks.text(),
    training.text(),
    trainingEnglish.text(),
    embeddings.text(),
    embeddingsEnglish.text(),
    sequences.text(),
    sequencesEnglish.text(),
    attention.text(),
    attentionEnglish.text(),
    selfAttention.text(),
    selfAttentionEnglish.text(),
    transformerBlock.text(),
    transformerBlockEnglish.text(),
    miniTransformer.text(),
    miniTransformerEnglish.text(),
  ]);
});

test("SSR-renders the bilingual Self-Attention chapter with an explicit test-only publication override", async () => {
  const rows = [
    {
      resource_key: "chapter:transformer-from-zero/self-attention",
      resource_kind: "chapter",
      curriculum_slug: "transformer-from-zero",
      chapter_slug: "self-attention",
      publication_status: "published",
      listing: "listed",
      scheduled_at: null,
      published_at: 1,
      version: 1,
      updated_by_user_id: "user_test",
      created_at: 1,
      updated_at: 1,
    },
  ];
  const response = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/self-attention",
    rows,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(
    html,
    /한 query가 바깥 memory를 읽던 Attention을, 같은 token sequence의 모든 row가 서로를 읽는 계산으로 확장합니다/,
  );
  assert.match(html, /07 — CAUSAL MULTI-HEAD REPAIR CONSOLE/);

  const englishResponse = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/self-attention?lang=en",
    rows,
  );
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(
    englishHtml,
    /Extend Attention from one query reading external memory into every row of one token sequence reading that sequence/,
  );
  assert.match(englishHtml, /07 — CAUSAL MULTI-HEAD REPAIR CONSOLE/);
});

test("SSR-renders the bilingual Transformer Block chapter with an explicit test-only publication override", async () => {
  const rows = [
    {
      resource_key: "chapter:transformer-from-zero/transformer-block",
      resource_kind: "chapter",
      curriculum_slug: "transformer-from-zero",
      chapter_slug: "transformer-block",
      publication_status: "published",
      listing: "listed",
      scheduled_at: null,
      published_at: 1,
      version: 1,
      updated_by_user_id: "user_test",
      created_at: 1,
      updated_at: 1,
    },
  ];
  const response = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/transformer-block",
    rows,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(
    html,
    /직전 장의 causal multi-head routing을 완성된 decoder block으로 조립합니다/,
  );
  assert.match(html, /08 — BLOCK CONTRACT REPAIR CONSOLE/);

  const englishResponse = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/transformer-block?lang=en",
    rows,
  );
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(
    englishHtml,
    /Assemble the prior chapter(?:'|&#x27;)s causal multi-head routing into a complete decoder block/,
  );
  assert.match(englishHtml, /08 — BLOCK CONTRACT REPAIR CONSOLE/);
});

test("SSR-renders the bilingual Mini Transformer chapter with an explicit test-only publication override", async () => {
  const rows = [
    {
      resource_key: "chapter:transformer-from-zero/mini-transformer",
      resource_kind: "chapter",
      curriculum_slug: "transformer-from-zero",
      chapter_slug: "mini-transformer",
      publication_status: "published",
      listing: "listed",
      scheduled_at: null,
      published_at: 1,
      version: 1,
      updated_by_user_id: "user_test",
      created_at: 1,
      updated_at: 1,
    },
  ];
  const response = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/mini-transformer",
    rows,
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(
    html,
    /앞의 아홉 장을 작은 decoder-only next-token 모델 하나로 닫습니다/,
  );
  assert.match(html, /07 — MODEL BOUNDARY REPAIR CONSOLE/);
  assert.match(html, /필수 LAB · PREDICT → CONFIGURE → RUN → INSPECT/);

  const englishResponse = await renderWithPublicationRows(
    "/curricula/transformer-from-zero/chapters/mini-transformer?lang=en",
    rows,
  );
  assert.equal(englishResponse.status, 200);
  const englishHtml = await englishResponse.text();
  assert.match(englishHtml, /<html[^>]+lang="en"/);
  assert.match(
    englishHtml,
    /Close the previous nine chapters by assembling one tiny decoder-only next-token model/,
  );
  assert.match(englishHtml, /07 — MODEL BOUNDARY REPAIR CONSOLE/);
  assert.match(englishHtml, /REQUIRED LAB · PREDICT → CONFIGURE → RUN → INSPECT/);
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
  assert.match(html, /LIVE CONCEPT LAB/);
  assert.match(html, /끝점을 드래그하거나 방향키로 움직여 보세요/);
  assert.match(html, /원소별로 곱하고 모두 더하기/);
  assert.match(html, /연산을 바꾸고 결과를 예측하세요/);
  assert.match(html, /예측 완료 · 결과 보기/);
  assert.match(html, /수식은 기호로 압축한 문장입니다/);
  assert.match(html, /아래 첨자와 위 첨자는 달라요/);
  assert.match(html, /data-latex="\\sqrt\{13\} \\approx 3\.606"/);
  assert.match(html, /class="katex-mathml"/);
  assert.doesNotMatch(html, /katex-error/);
  assert.ok((html.match(/data-latex=/g) ?? []).length >= 12);
  assert.match(html, /벡터 표기 짧은 확인/);
  assert.match(html, /SHAPE DETECTIVE/);
  assert.match(html, /RESHAPE BLOCKS/);
  assert.match(html, /값은 그대로 두고 shape만 다시 배치해 보세요/);
  assert.match(html, /a\.reshape\(6\)/);
  assert.match(html, /필수 실습 · AXIS BUILDER/);
  assert.match(html, /축을 만들고, 늘리고, 없애 보세요/);
  assert.match(html, /np\.stack\(\[a, b\], axis=0\)/);
  assert.match(html, /전치했는데 왜 세로가 되지 않을까요/);
  assert.match(html, /벡터를 더했는데 표가 생겼습니다/);
  assert.match(html, /숫자보다 먼저 축의 의미를 읽어 보세요/);
  assert.match(html, /예측 확인하기/);
  assert.match(html, /미션 초기화/);
  assert.match(html, /영벡터를 정규화할 수 없는 이유 확인/);
  assert.match(html, /벡터를 만들고 크기와 방향 확인하기/);
  assert.match(html, /두 벡터의 내적은 관계를 하나의 점수로 바꿉니다/);
  assert.doesNotMatch(html, /행렬곱은 내적을 표 전체로 확장합니다/);
  assert.doesNotMatch(html, /한 토큰의 질문이 문맥 벡터가 되는 과정/);
  assert.doesNotMatch(html, /작은 Self-Attention heatmap 만들기/);
  assert.match(html, /DISCUSSION/);
  assert.match(html, /벡터 크기 코드 셀/);
  assert.match(html, /텐서 shape 탐색기/);
  assert.doesNotMatch(html, /토큰 벡터를 문장과 배치로 쌓기/);
  assert.match(html, /shape 이해 확인/);
  assert.match(html, /이해 확인: 계산 전에 구조를 예측하기/);
  assert.match(html, /다섯 문제를 모두 맞히면/);
  assert.match(html, /남은 조건: Axis Builder 세 연산 · Shape Detective 세 미션 · 이해 확인 5문제/);
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

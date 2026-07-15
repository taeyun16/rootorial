import assert from "node:assert/strict";
import { register } from "node:module";
import test from "node:test";
import { chapterRegistry } from "../src/features/chapters/chapter-registry.ts";
import { getActiveDiscussionScopeIds } from "../src/data/discussionScopes.ts";
import { workerTestEnv } from "./worker-test-env.mjs";

register("./cloudflare-workers-loader.mjs", import.meta.url);

async function render(pathname) {
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

test("serves localized curriculum and chapter metadata in the first response", async () => {
  const curriculumResponse = await render("/curricula/transformer-from-zero?lang=en");
  assert.equal(curriculumResponse.status, 200);
  const curriculumHtml = await curriculumResponse.text();
  assert.match(curriculumHtml, /Transformers from the Ground Up · Rootorial/);
  assert.match(
    curriculumHtml,
    /Move and run every idea from vectors through attention to a small Transformer\./,
  );

  const chapterResponse = await render(
    "/curricula/transformer-from-zero/chapters/vectors?lang=en",
  );
  assert.equal(chapterResponse.status, 200);
  const chapterHtml = await chapterResponse.text();
  assert.match(chapterHtml, /<html[^>]+lang="en"/);
  assert.match(chapterHtml, /01\. Vectors and Tensors · Rootorial/);
  assert.match(chapterHtml, /How collections of numbers gain meaning and direction/);
});

test("keeps registered completed Transformer drafts and unknown chapters private", async () => {
  assert.ok(chapterRegistry["transformer-from-zero/optimization"]);
  assert.ok(chapterRegistry["transformer-from-zero/neural-networks"]);
  assert.ok(chapterRegistry["transformer-from-zero/training"]);
  assert.ok(chapterRegistry["transformer-from-zero/embeddings"]);
  assert.ok(chapterRegistry["transformer-from-zero/sequences"]);
  assert.ok(chapterRegistry["transformer-from-zero/attention"]);
  assert.ok(chapterRegistry["transformer-from-zero/self-attention"]);
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
  const unknown = await render(
    "/curricula/transformer-from-zero/chapters/not-a-chapter",
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
  assert.equal(unknown.status, 404);
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
    unknown.text(),
  ]);
});

test("keeps registered completed Linux drafts behind the public boundary", async () => {
  assert.ok(chapterRegistry["linux-systems/boot-to-shell"]);
  assert.ok(chapterRegistry["linux-systems/processes-and-signals"]);
  assert.ok(chapterRegistry["linux-systems/users-and-permissions"]);
  assert.ok(chapterRegistry["linux-systems/memory-and-virtual-addresses"]);
  assert.ok(chapterRegistry["linux-systems/storage-and-filesystems"]);
  assert.ok(chapterRegistry["linux-systems/networking-from-a-packet"]);
  assert.ok(chapterRegistry["linux-systems/assemble-a-tiny-linux"]);
  const boot = await render(
    "/curricula/linux-systems/chapters/boot-to-shell",
  );
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
});

test("returns not found instead of a server error for malformed route slugs", async () => {
  const malformedCurriculum = await render("/curricula/INVALID_SLUG");
  const malformedChapter = await render(
    "/curricula/transformer-from-zero/chapters/INVALID_SLUG",
  );
  assert.equal(malformedCurriculum.status, 404);
  assert.equal(malformedChapter.status, 404);
  await Promise.all([malformedCurriculum.text(), malformedChapter.text()]);
});

test("keeps the rendered concept checks aligned with the active registry", async () => {
  const response = await render(
    "/curricula/transformer-from-zero/chapters/vectors",
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  const renderedQuestionIds = [
    ...html.matchAll(
      /<fieldset[^>]*class="concept-question"[\s\S]*?<input[^>]*name="([^"]+)"/g,
    ),
  ]
    .map((match) => match[1])
    .filter((questionId, index, all) => all.indexOf(questionId) === index)
    .sort();
  const registeredQuestionIds = Object.keys(
    chapterRegistry["transformer-from-zero/vectors"].questions,
  ).sort();

  assert.deepEqual(renderedQuestionIds, registeredQuestionIds);
  assert.equal((html.match(/class="concept-question"/g) ?? []).length, 5);
  assert.doesNotMatch(html, /name="attention-context"/);

  const renderedDiscussionScopes = [
    ...html.matchAll(/data-discussion-scope="([^"]+)"/g),
  ].map((match) => match[1]).sort();
  assert.deepEqual(
    renderedDiscussionScopes,
    getActiveDiscussionScopeIds("transformer-from-zero", "vectors").sort(),
  );
});

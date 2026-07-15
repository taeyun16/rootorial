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
  const unknown = await render(
    "/curricula/transformer-from-zero/chapters/not-a-chapter",
  );
  assert.equal(optimization.status, 404);
  assert.equal(neuralNetworks.status, 404);
  assert.equal(training.status, 404);
  assert.equal(trainingEnglish.status, 404);
  assert.equal(unknown.status, 404);
  await Promise.all([
    optimization.text(),
    neuralNetworks.text(),
    training.text(),
    trainingEnglish.text(),
    unknown.text(),
  ]);
});

test("keeps registered completed Linux drafts behind the public boundary", async () => {
  assert.ok(chapterRegistry["linux-systems/boot-to-shell"]);
  assert.ok(chapterRegistry["linux-systems/processes-and-signals"]);
  assert.ok(chapterRegistry["linux-systems/users-and-permissions"]);
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
  assert.equal(boot.status, 404);
  assert.equal(processes.status, 404);
  assert.equal(permissions.status, 404);
  assert.equal(permissionsEnglish.status, 404);
  await Promise.all([
    boot.text(),
    processes.text(),
    permissions.text(),
    permissionsEnglish.text(),
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

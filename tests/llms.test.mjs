import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { register } from "node:module";
import test from "node:test";

import { renderDefaultLlmsText } from "../scripts/generate-llms.ts";
import { curricula } from "../src/data/curriculum.ts";
import { renderLlmsText, ROOTORIAL_URL } from "../src/features/llms/llms.ts";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  isPublicationAccessible,
  isPublicationListed,
  resolvePublicationCatalog,
} from "../src/features/publication/publication.ts";
import { workerTestEnv } from "./worker-test-env.mjs";

register("./cloudflare-workers-loader.mjs", import.meta.url);

const transformerKey = curriculumPublicationKey("transformer-from-zero");
const vectorsKey = chapterPublicationKey("transformer-from-zero", "vectors");
const transformerUrl = `${ROOTORIAL_URL}/curricula/transformer-from-zero`;
const vectorsUrl = `${transformerUrl}/chapters/vectors`;
const optimizationUrl = `${transformerUrl}/chapters/optimization`;
const linuxBootUrl = `${ROOTORIAL_URL}/curricula/linux-systems/chapters/boot-to-shell`;
const linuxProcessesUrl = `${ROOTORIAL_URL}/curricula/linux-systems/chapters/processes-and-signals`;
const defaultCatalog = resolvePublicationCatalog([], 0);

function publicationOverride({
  resourceKey,
  resourceKind,
  curriculumSlug,
  chapterSlug = null,
  publicationStatus,
  listing,
  scheduledAt = null,
}) {
  const publishedAt = publicationStatus === "draft" ? null : 1;
  return {
    resourceKey,
    resourceKind,
    curriculumSlug,
    chapterSlug,
    publicationStatus,
    listing,
    scheduledAt,
    publishedAt,
    version: 1,
    updatedByUserId: "user_test",
    createdAt: 1,
    updatedAt: 1,
  };
}

function publicationRow(override) {
  return {
    resource_key: override.resourceKey,
    resource_kind: override.resourceKind,
    curriculum_slug: override.curriculumSlug,
    chapter_slug: override.chapterSlug,
    publication_status: override.publicationStatus,
    listing: override.listing,
    scheduled_at: override.scheduledAt,
    published_at: override.publishedAt,
    version: override.version,
    updated_by_user_id: override.updatedByUserId,
    created_at: override.createdAt,
    updated_at: override.updatedAt,
  };
}

function databaseWithRows(rows) {
  return {
    prepare() {
      return {
        async all() {
          return { results: rows, success: true, meta: {} };
        },
      };
    },
  };
}

async function loadWorker() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("llms-test", `${process.pid}-${Date.now()}`);
  return (await import(workerUrl.href)).default;
}

test("keeps the committed llms.txt byte-identical to publication defaults", async () => {
  const contents = await readFile(
    new URL("../public/llms.txt", import.meta.url),
    "utf8",
  );

  assert.equal(contents, renderDefaultLlmsText());
  assert.match(contents, /^# Rootorial$/m);
  assert.match(contents, /Canonical site: https:\/\/rootorial\.com/);
  assert.match(contents, /MUST clearly identify Rootorial as the source/);
  assert.match(contents, /https:\/\/x\.com\/taeyun16_/);
  assert.match(contents, /https:\/\/linkedin\.com\/in\/taeyun16/);
  assert.ok(contents.includes(transformerUrl));
  assert.ok(contents.includes(vectorsUrl));
  assert.ok(!contents.includes(optimizationUrl));
  assert.ok(!contents.includes(linuxBootUrl));
  assert.ok(!contents.includes(linuxProcessesUrl));

  for (const curriculum of curricula) {
    const curriculumKey = curriculumPublicationKey(curriculum.slug);
    const curriculumUrl = `${ROOTORIAL_URL}/curricula/${curriculum.slug}`;
    const shouldListCurriculum =
      isPublicationAccessible(defaultCatalog, curriculumKey) &&
      isPublicationListed(defaultCatalog, curriculumKey);
    assert.equal(
      contents.includes(curriculumUrl),
      shouldListCurriculum,
      `unexpected curriculum link state: ${curriculum.slug}`,
    );

    for (const chapter of curriculum.chapters.en) {
      const chapterKey = chapterPublicationKey(curriculum.slug, chapter.slug);
      const chapterUrl = `${curriculumUrl}/chapters/${chapter.slug}`;
      const shouldListChapter =
        isPublicationAccessible(defaultCatalog, chapterKey) &&
        isPublicationListed(defaultCatalog, chapterKey);
      assert.equal(
        contents.includes(chapterUrl),
        shouldListChapter,
        `unexpected chapter link state: ${curriculum.slug}/${chapter.slug}`,
      );
    }
  }

  assert.ok(contents.endsWith("\n"));
  assert.ok(!contents.endsWith("\n\n"));
});

test("keeps non-public resources out of current content links", () => {
  const hiddenVectors = publicationOverride({
    resourceKey: vectorsKey,
    resourceKind: "chapter",
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    publicationStatus: "published",
    listing: "hidden",
  });
  const hiddenVectorsText = renderLlmsText(
    resolvePublicationCatalog([hiddenVectors], 100),
  );
  assert.ok(hiddenVectorsText.includes(transformerUrl));
  assert.ok(!hiddenVectorsText.includes(vectorsUrl));

  const draftTransformer = publicationOverride({
    resourceKey: transformerKey,
    resourceKind: "curriculum",
    curriculumSlug: "transformer-from-zero",
    publicationStatus: "draft",
    listing: "listed",
  });
  const draftText = renderLlmsText(
    resolvePublicationCatalog([draftTransformer], 100),
  );
  assert.match(draftText, /## Roadmap/);
  assert.match(draftText, /Transformers from the Ground Up/);
  assert.ok(!draftText.includes(transformerUrl));
  assert.ok(!draftText.includes(vectorsUrl));

  const unlistedTransformer = {
    ...draftTransformer,
    publicationStatus: "published",
    listing: "unlisted",
    publishedAt: 1,
  };
  const unlistedText = renderLlmsText(
    resolvePublicationCatalog([unlistedTransformer], 100),
  );
  assert.ok(!unlistedText.includes(transformerUrl));
  assert.ok(!unlistedText.includes(vectorsUrl));
});

test("serves llms.txt from the live publication catalog", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    workerTestEnv(),
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/plain\b/i);
  assert.equal(response.headers.get("cache-control"), "no-store");
  assert.equal(await response.text(), renderDefaultLlmsText());

  const hiddenVectors = publicationOverride({
    resourceKey: vectorsKey,
    resourceKind: "chapter",
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    publicationStatus: "published",
    listing: "hidden",
  });
  const hiddenResponse = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    { ...workerTestEnv(), DB: databaseWithRows([publicationRow(hiddenVectors)]) },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const hiddenContents = await hiddenResponse.text();
  assert.equal(hiddenResponse.status, 200);
  assert.ok(hiddenContents.includes(transformerUrl));
  assert.ok(!hiddenContents.includes(vectorsUrl));

  const futureVectors = publicationOverride({
    resourceKey: vectorsKey,
    resourceKind: "chapter",
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    publicationStatus: "draft",
    listing: "listed",
    scheduledAt: Date.now() + 60_000,
  });
  const futureResponse = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    { ...workerTestEnv(), DB: databaseWithRows([publicationRow(futureVectors)]) },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.ok(!(await futureResponse.text()).includes(vectorsUrl));

  const dueVectors = {
    ...futureVectors,
    scheduledAt: Date.now() - 60_000,
  };
  const dueResponse = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    { ...workerTestEnv(), DB: databaseWithRows([publicationRow(dueVectors)]) },
    { waitUntil() {}, passThroughOnException() {} },
  );
  assert.ok((await dueResponse.text()).includes(vectorsUrl));

  const archivedTransformer = publicationOverride({
    resourceKey: transformerKey,
    resourceKind: "curriculum",
    curriculumSlug: "transformer-from-zero",
    publicationStatus: "archived",
    listing: "listed",
  });
  const archivedResponse = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    {
      ...workerTestEnv(),
      DB: databaseWithRows([publicationRow(archivedTransformer)]),
    },
    { waitUntil() {}, passThroughOnException() {} },
  );
  const archivedContents = await archivedResponse.text();
  assert.ok(!archivedContents.includes(transformerUrl));
  assert.ok(!archivedContents.includes(vectorsUrl));
});

test("fails closed when the live publication catalog is unavailable", async () => {
  const worker = await loadWorker();
  const response = await worker.fetch(
    new Request("http://localhost/llms.txt"),
    {
      ...workerTestEnv(),
      DB: {
        prepare() {
          return {
            async all() {
              throw new Error("database unavailable");
            },
          };
        },
      },
    },
    { waitUntil() {}, passThroughOnException() {} },
  );

  assert.equal(response.status, 503);
  assert.equal(response.headers.get("cache-control"), "no-store");
  const contents = await response.text();
  assert.match(contents, /temporarily unavailable/);
  assert.ok(!contents.includes("/curricula/"));
});

test("runs the Worker before the static llms.txt build snapshot", async () => {
  const wrangler = JSON.parse(
    await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8"),
  );
  const packageJson = JSON.parse(
    await readFile(new URL("../package.json", import.meta.url), "utf8"),
  );
  const readme = await readFile(
    new URL("../README.md", import.meta.url),
    "utf8",
  );

  assert.deepEqual(wrangler.assets.run_worker_first, ["/llms.txt"]);
  assert.equal(packageJson.scripts.prebuild, "npm run generate:llms");
  assert.match(packageJson.scripts.test, /^npm run check:llms &&/);
  assert.match(readme, /## `llms\.txt` maintenance/);
  assert.match(readme, /Production requests to `\/llms\.txt` run through the Worker first/);
});

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  isPublicationAccessible,
  isPublicationListed,
  publicPublicationCatalog,
  resolvePublicationCatalog,
  validateResetPublicationInput,
  validateUpdatePublicationInput,
} from "../src/features/publication/publication.ts";
import {
  loadPublicationCatalog,
  loadPublicPlatformCatalog,
} from "../src/features/publication/publication.server.ts";

const transformerKey = curriculumPublicationKey("transformer-from-zero");
const vectorsKey = chapterPublicationKey("transformer-from-zero", "vectors");
const optimizationKey = chapterPublicationKey(
  "transformer-from-zero",
  "optimization",
);
const linuxKey = curriculumPublicationKey("linux-systems");
const linuxShellKey = chapterPublicationKey(
  "linux-systems",
  "shell-and-filesystem",
);
const linuxBootKey = chapterPublicationKey("linux-systems", "boot-to-shell");

function override(resourceKey, values = {}) {
  const chapter = resourceKey.startsWith("chapter:");
  const path = resourceKey.slice(resourceKey.indexOf(":") + 1);
  const [curriculumSlug, chapterSlug = null] = path.split("/");
  return {
    resourceKey,
    resourceKind: chapter ? "chapter" : "curriculum",
    curriculumSlug,
    chapterSlug,
    publicationStatus: "draft",
    listing: "listed",
    scheduledAt: null,
    publishedAt: null,
    version: 1,
    updatedByUserId: "user_admin",
    createdAt: 1,
    updatedAt: 1,
    ...values,
  };
}

test("preserves the current public catalog when no overrides exist", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  assert.equal(isPublicationAccessible(catalog, transformerKey), true);
  assert.equal(isPublicationAccessible(catalog, vectorsKey), true);
  assert.equal(isPublicationAccessible(catalog, optimizationKey), false);
  assert.equal(isPublicationListed(catalog, optimizationKey), true);

  const publicCatalog = publicPublicationCatalog(catalog);
  assert.ok(
    publicCatalog.curricula.some(
      ({ curriculum }) => curriculum.slug === "transformer-from-zero",
    ),
  );
  assert.ok(
    publicCatalog.curricula.some(
      ({ curriculum }) => curriculum.slug === "linux-systems",
    ),
  );
});

test("keeps editorial progress independent from chapter runtime readiness", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  const vectors = catalog.resources[
    chapterPublicationKey("transformer-from-zero", "vectors")
  ];

  assert.equal(vectors.developmentStatus, "complete");
  assert.equal(vectors.contentReady, true);
  assert.equal(vectors.source, "default");
  assert.equal(vectors.publicationStatus, "published");
  assert.equal(vectors.effectivePublicationStatus, "published");
  assert.equal(vectors.listing, "listed");
  assert.equal(vectors.scheduledAt, null);
  assert.equal(isPublicationAccessible(catalog, vectorsKey), true);
});

test("publishes the completed Linux sample while keeping planned chapters closed", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  const linux = catalog.resources[linuxKey];
  const shell = catalog.resources[linuxShellKey];
  const boot = catalog.resources[linuxBootKey];

  assert.equal(linux.contentReady, true);
  assert.equal(linux.effectivePublicationStatus, "published");
  assert.equal(linux.listing, "listed");
  assert.equal(isPublicationAccessible(catalog, linuxKey), true);

  assert.equal(shell.developmentStatus, "complete");
  assert.equal(shell.contentReady, true);
  assert.equal(shell.effectivePublicationStatus, "published");
  assert.equal(shell.listing, "listed");
  assert.equal(isPublicationAccessible(catalog, linuxShellKey), true);

  assert.equal(boot.developmentStatus, "planned");
  assert.equal(boot.contentReady, false);
  assert.equal(boot.effectivePublicationStatus, "draft");
  assert.equal(boot.listing, "listed");
  assert.equal(isPublicationAccessible(catalog, linuxBootKey), false);

  const linuxCatalog = publicPublicationCatalog(catalog).curricula.find(
    ({ curriculum }) => curriculum.slug === "linux-systems",
  );
  assert.equal(linuxCatalog?.chapters.length, 8);
});

test("fails closed when the durable publication store is unavailable", async () => {
  assert.equal(await loadPublicationCatalog(undefined, 1_000), null);
  assert.deepEqual(await loadPublicPlatformCatalog(undefined, 1_000), {
    generatedAt: 1_000,
    curricula: [],
  });
});

test("ignores overrides for catalog resources removed by a later deploy", async () => {
  const database = {
    prepare() {
      return {
        async all() {
          return {
            results: [{
              resource_key: "chapter:retired/removed",
              resource_kind: "chapter",
              curriculum_slug: "retired",
              chapter_slug: "removed",
              publication_status: "published",
              listing: "listed",
              scheduled_at: null,
              published_at: 500,
              version: 1,
              updated_by_user_id: "user_admin",
              created_at: 500,
              updated_at: 500,
            }],
          };
        },
      };
    },
  };
  const catalog = await loadPublicationCatalog(database, 1_000);
  assert.ok(catalog);
  assert.equal(isPublicationAccessible(catalog, transformerKey), true);
});

test("inherits curriculum publication access for chapters", () => {
  const catalog = resolvePublicationCatalog([
    override(transformerKey, { listing: "hidden" }),
    override(vectorsKey, {
      publicationStatus: "published",
      publishedAt: 500,
    }),
  ], 1_000);
  assert.equal(isPublicationAccessible(catalog, transformerKey), false);
  assert.equal(isPublicationAccessible(catalog, vectorsKey), false);
  assert.equal(isPublicationListed(catalog, transformerKey), false);
});

test("removes hidden chapter metadata from the public catalog payload", () => {
  const catalog = resolvePublicationCatalog([
    override(vectorsKey, {
      publicationStatus: "published",
      listing: "hidden",
      publishedAt: 500,
    }),
  ], 1_000);
  const transformer = publicPublicationCatalog(catalog).curricula.find(
    ({ curriculum }) => curriculum.slug === "transformer-from-zero",
  );
  assert.ok(transformer);
  assert.equal(
    transformer.curriculum.chapters.ko.some(
      (chapter) => chapter.slug === "vectors",
    ),
    false,
  );
  assert.equal(
    transformer.chapters.some(({ chapter }) => chapter.slug === "vectors"),
    false,
  );
});

test("supports unlisted direct access without catalog exposure", () => {
  const catalog = resolvePublicationCatalog([
    override(transformerKey, {
      publicationStatus: "published",
      listing: "unlisted",
      publishedAt: 500,
    }),
  ], 1_000);
  assert.equal(isPublicationAccessible(catalog, transformerKey), true);
  assert.equal(isPublicationListed(catalog, transformerKey), false);
  assert.equal(
    publicPublicationCatalog(catalog).curricula.some(
      ({ curriculum }) => curriculum.slug === "transformer-from-zero",
    ),
    false,
  );
});

test("makes scheduled drafts effective exactly at the scheduled instant", () => {
  const scheduled = override(transformerKey, { scheduledAt: 2_000 });
  assert.equal(
    isPublicationAccessible(resolvePublicationCatalog([scheduled], 1_999), transformerKey),
    false,
  );
  assert.equal(
    isPublicationAccessible(resolvePublicationCatalog([scheduled], 2_000), transformerKey),
    true,
  );
});

test("normalizes publication mutation inputs and rejects invalid combinations", () => {
  assert.deepEqual(validateUpdatePublicationInput({
    resourceKey: vectorsKey,
    publicationStatus: "draft",
    listing: "hidden",
    scheduledAt: 2_000,
    expectedVersion: 0,
  }), {
    resourceKey: vectorsKey,
    publicationStatus: "draft",
    listing: "hidden",
    scheduledAt: 2_000,
    expectedVersion: 0,
  });
  assert.throws(() => validateUpdatePublicationInput({
    resourceKey: vectorsKey,
    publicationStatus: "published",
    listing: "listed",
    scheduledAt: 2_000,
    expectedVersion: 0,
  }));
  assert.throws(() => validateUpdatePublicationInput({
    resourceKey: "chapter:missing/nope",
    publicationStatus: "draft",
    listing: "listed",
    scheduledAt: null,
    expectedVersion: 0,
  }));
  assert.deepEqual(validateResetPublicationInput({
    resourceKey: transformerKey,
    expectedVersion: 3,
  }), { resourceKey: transformerKey, expectedVersion: 3 });
});

test("adds a constrained durable publication override table", async () => {
  const migration = await readFile(
    new URL("../drizzle/0009_parched_mojo.sql", import.meta.url),
    "utf8",
  );
  assert.match(migration, /CREATE TABLE `content_publication_overrides`/);
  assert.match(migration, /content_publication_overrides_resource_identity_check/);
  assert.match(migration, /content_publication_overrides_schedule_check/);
  assert.match(migration, /content_publication_overrides_version_check/);
});

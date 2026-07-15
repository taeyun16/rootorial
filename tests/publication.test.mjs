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
const neuralNetworksKey = chapterPublicationKey(
  "transformer-from-zero",
  "neural-networks",
);
const trainingKey = chapterPublicationKey(
  "transformer-from-zero",
  "training",
);
const embeddingsKey = chapterPublicationKey(
  "transformer-from-zero",
  "embeddings",
);
const linuxKey = curriculumPublicationKey("linux-systems");
const linuxShellKey = chapterPublicationKey(
  "linux-systems",
  "shell-and-filesystem",
);
const linuxBootKey = chapterPublicationKey("linux-systems", "boot-to-shell");
const linuxProcessesKey = chapterPublicationKey(
  "linux-systems",
  "processes-and-signals",
);
const linuxPermissionsKey = chapterPublicationKey(
  "linux-systems",
  "users-and-permissions",
);
const linuxMemoryKey = chapterPublicationKey(
  "linux-systems",
  "memory-and-virtual-addresses",
);
const linuxStorageKey = chapterPublicationKey(
  "linux-systems",
  "storage-and-filesystems",
);

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
  assert.equal(isPublicationAccessible(catalog, neuralNetworksKey), false);
  assert.equal(isPublicationListed(catalog, neuralNetworksKey), true);
  assert.equal(isPublicationAccessible(catalog, trainingKey), false);
  assert.equal(isPublicationListed(catalog, trainingKey), true);
  assert.equal(isPublicationAccessible(catalog, embeddingsKey), false);
  assert.equal(isPublicationListed(catalog, embeddingsKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxPermissionsKey), false);
  assert.equal(isPublicationListed(catalog, linuxPermissionsKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxMemoryKey), false);
  assert.equal(isPublicationListed(catalog, linuxMemoryKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxStorageKey), false);
  assert.equal(isPublicationListed(catalog, linuxStorageKey), true);

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

test("keeps published vectors and completed Transformer drafts editorially independent", () => {
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

  const optimization = catalog.resources[optimizationKey];
  assert.equal(optimization.developmentStatus, "complete");
  assert.equal(optimization.contentReady, true);
  assert.equal(optimization.source, "default");
  assert.equal(optimization.publicationStatus, "draft");
  assert.equal(optimization.effectivePublicationStatus, "draft");
  assert.equal(optimization.listing, "listed");
  assert.equal(optimization.scheduledAt, null);
  assert.equal(optimization.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, optimizationKey), false);

  const neuralNetworks = catalog.resources[neuralNetworksKey];
  assert.equal(neuralNetworks.developmentStatus, "complete");
  assert.equal(neuralNetworks.contentReady, true);
  assert.equal(neuralNetworks.source, "default");
  assert.equal(neuralNetworks.publicationStatus, "draft");
  assert.equal(neuralNetworks.effectivePublicationStatus, "draft");
  assert.equal(neuralNetworks.listing, "listed");
  assert.equal(neuralNetworks.scheduledAt, null);
  assert.equal(neuralNetworks.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, neuralNetworksKey), false);

  const training = catalog.resources[trainingKey];
  assert.equal(training.developmentStatus, "complete");
  assert.equal(training.contentReady, true);
  assert.equal(training.source, "default");
  assert.equal(training.publicationStatus, "draft");
  assert.equal(training.effectivePublicationStatus, "draft");
  assert.equal(training.listing, "listed");
  assert.equal(training.scheduledAt, null);
  assert.equal(training.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, trainingKey), false);

  const embeddings = catalog.resources[embeddingsKey];
  assert.equal(embeddings.developmentStatus, "complete");
  assert.equal(embeddings.contentReady, true);
  assert.equal(embeddings.source, "default");
  assert.equal(embeddings.publicationStatus, "draft");
  assert.equal(embeddings.effectivePublicationStatus, "draft");
  assert.equal(embeddings.listing, "listed");
  assert.equal(embeddings.scheduledAt, null);
  assert.equal(embeddings.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, embeddingsKey), false);
});

test("publishes the existing Linux sample while keeping completed later chapters draft", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  const linux = catalog.resources[linuxKey];
  const shell = catalog.resources[linuxShellKey];
  const boot = catalog.resources[linuxBootKey];
  const processes = catalog.resources[linuxProcessesKey];
  const permissions = catalog.resources[linuxPermissionsKey];
  const memory = catalog.resources[linuxMemoryKey];
  const storage = catalog.resources[linuxStorageKey];

  assert.equal(linux.contentReady, true);
  assert.equal(linux.effectivePublicationStatus, "published");
  assert.equal(linux.listing, "listed");
  assert.equal(isPublicationAccessible(catalog, linuxKey), true);

  assert.equal(shell.developmentStatus, "complete");
  assert.equal(shell.contentReady, true);
  assert.equal(shell.effectivePublicationStatus, "published");
  assert.equal(shell.listing, "listed");
  assert.equal(isPublicationAccessible(catalog, linuxShellKey), true);

  assert.equal(boot.developmentStatus, "complete");
  assert.equal(boot.contentReady, true);
  assert.equal(boot.source, "default");
  assert.equal(boot.publicationStatus, "draft");
  assert.equal(boot.effectivePublicationStatus, "draft");
  assert.equal(boot.listing, "listed");
  assert.equal(boot.scheduledAt, null);
  assert.equal(boot.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxBootKey), false);

  assert.equal(processes.developmentStatus, "complete");
  assert.equal(processes.contentReady, true);
  assert.equal(processes.source, "default");
  assert.equal(processes.publicationStatus, "draft");
  assert.equal(processes.effectivePublicationStatus, "draft");
  assert.equal(processes.listing, "listed");
  assert.equal(processes.scheduledAt, null);
  assert.equal(processes.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxProcessesKey), false);

  assert.equal(permissions.developmentStatus, "complete");
  assert.equal(permissions.contentReady, true);
  assert.equal(permissions.source, "default");
  assert.equal(permissions.publicationStatus, "draft");
  assert.equal(permissions.effectivePublicationStatus, "draft");
  assert.equal(permissions.listing, "listed");
  assert.equal(permissions.scheduledAt, null);
  assert.equal(permissions.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxPermissionsKey), false);

  assert.equal(memory.developmentStatus, "complete");
  assert.equal(memory.contentReady, true);
  assert.equal(memory.source, "default");
  assert.equal(memory.publicationStatus, "draft");
  assert.equal(memory.effectivePublicationStatus, "draft");
  assert.equal(memory.listing, "listed");
  assert.equal(memory.scheduledAt, null);
  assert.equal(memory.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxMemoryKey), false);

  assert.equal(storage.developmentStatus, "complete");
  assert.equal(storage.contentReady, true);
  assert.equal(storage.source, "default");
  assert.equal(storage.publicationStatus, "draft");
  assert.equal(storage.effectivePublicationStatus, "draft");
  assert.equal(storage.listing, "listed");
  assert.equal(storage.scheduledAt, null);
  assert.equal(storage.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxStorageKey), false);

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

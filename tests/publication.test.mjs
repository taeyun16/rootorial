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
const sequencesKey = chapterPublicationKey(
  "transformer-from-zero",
  "sequences",
);
const attentionKey = chapterPublicationKey(
  "transformer-from-zero",
  "attention",
);
const selfAttentionKey = chapterPublicationKey(
  "transformer-from-zero",
  "self-attention",
);
const transformerBlockKey = chapterPublicationKey(
  "transformer-from-zero",
  "transformer-block",
);
const miniTransformerKey = chapterPublicationKey(
  "transformer-from-zero",
  "mini-transformer",
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
const linuxNetworkingKey = chapterPublicationKey(
  "linux-systems",
  "networking-from-a-packet",
);
const linuxTinySystemKey = chapterPublicationKey(
  "linux-systems",
  "assemble-a-tiny-linux",
);
const linuxNetworkingCurriculumKey = curriculumPublicationKey(
  "linux-networking",
);
const infrastructureKey = curriculumPublicationKey("infrastructure-design");
const infrastructureNamespacesKey = chapterPublicationKey(
  "infrastructure-design",
  "network-namespaces-and-boundaries",
);
const infrastructureVethRoutingKey = chapterPublicationKey(
  "infrastructure-design",
  "veth-bridges-and-routing",
);
const infrastructureEgressNatKey = chapterPublicationKey(
  "infrastructure-design",
  "egress-nat-and-conntrack",
);
const infrastructureServiceDiscoveryKey = chapterPublicationKey(
  "infrastructure-design",
  "service-discovery-and-load-balancing",
);
const infrastructureNetworkPolicyKey = chapterPublicationKey(
  "infrastructure-design",
  "network-policy-and-firewalls",
);
const infrastructureAvailabilityKey = chapterPublicationKey(
  "infrastructure-design",
  "availability-and-failure-domains",
);
const infrastructureObservabilityKey = chapterPublicationKey(
  "infrastructure-design",
  "network-observability-and-capacity",
);
const systemArchitectureKey = curriculumPublicationKey("system-architecture");

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
  assert.equal(isPublicationAccessible(catalog, sequencesKey), false);
  assert.equal(isPublicationListed(catalog, sequencesKey), true);
  assert.equal(isPublicationAccessible(catalog, attentionKey), false);
  assert.equal(isPublicationListed(catalog, attentionKey), true);
  assert.equal(isPublicationAccessible(catalog, selfAttentionKey), false);
  assert.equal(isPublicationListed(catalog, selfAttentionKey), true);
  assert.equal(isPublicationAccessible(catalog, transformerBlockKey), false);
  assert.equal(isPublicationListed(catalog, transformerBlockKey), true);
  assert.equal(isPublicationAccessible(catalog, miniTransformerKey), false);
  assert.equal(isPublicationListed(catalog, miniTransformerKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxPermissionsKey), false);
  assert.equal(isPublicationListed(catalog, linuxPermissionsKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxMemoryKey), false);
  assert.equal(isPublicationListed(catalog, linuxMemoryKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxStorageKey), false);
  assert.equal(isPublicationListed(catalog, linuxStorageKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxNetworkingKey), false);
  assert.equal(isPublicationListed(catalog, linuxNetworkingKey), true);
  assert.equal(isPublicationAccessible(catalog, linuxTinySystemKey), false);
  assert.equal(isPublicationListed(catalog, linuxTinySystemKey), true);

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

  const sequences = catalog.resources[sequencesKey];
  assert.equal(sequences.developmentStatus, "complete");
  assert.equal(sequences.contentReady, true);
  assert.equal(sequences.source, "default");
  assert.equal(sequences.publicationStatus, "draft");
  assert.equal(sequences.effectivePublicationStatus, "draft");
  assert.equal(sequences.listing, "listed");
  assert.equal(sequences.scheduledAt, null);
  assert.equal(sequences.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, sequencesKey), false);

  const attention = catalog.resources[attentionKey];
  assert.equal(attention.developmentStatus, "complete");
  assert.equal(attention.contentReady, true);
  assert.equal(attention.source, "default");
  assert.equal(attention.publicationStatus, "draft");
  assert.equal(attention.effectivePublicationStatus, "draft");
  assert.equal(attention.listing, "listed");
  assert.equal(attention.scheduledAt, null);
  assert.equal(attention.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, attentionKey), false);

  const selfAttention = catalog.resources[selfAttentionKey];
  assert.equal(selfAttention.developmentStatus, "complete");
  assert.equal(selfAttention.contentReady, true);
  assert.equal(selfAttention.source, "default");
  assert.equal(selfAttention.publicationStatus, "draft");
  assert.equal(selfAttention.effectivePublicationStatus, "draft");
  assert.equal(selfAttention.listing, "listed");
  assert.equal(selfAttention.scheduledAt, null);
  assert.equal(selfAttention.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, selfAttentionKey), false);

  const transformerBlock = catalog.resources[transformerBlockKey];
  assert.equal(transformerBlock.developmentStatus, "complete");
  assert.equal(transformerBlock.contentReady, true);
  assert.equal(transformerBlock.source, "default");
  assert.equal(transformerBlock.publicationStatus, "draft");
  assert.equal(transformerBlock.effectivePublicationStatus, "draft");
  assert.equal(transformerBlock.listing, "listed");
  assert.equal(transformerBlock.scheduledAt, null);
  assert.equal(transformerBlock.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, transformerBlockKey), false);

  const miniTransformer = catalog.resources[miniTransformerKey];
  assert.equal(miniTransformer.developmentStatus, "complete");
  assert.equal(miniTransformer.contentReady, true);
  assert.equal(miniTransformer.source, "default");
  assert.equal(miniTransformer.publicationStatus, "draft");
  assert.equal(miniTransformer.effectivePublicationStatus, "draft");
  assert.equal(miniTransformer.listing, "listed");
  assert.equal(miniTransformer.scheduledAt, null);
  assert.equal(miniTransformer.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, miniTransformerKey), false);

  const transformerCatalog = publicPublicationCatalog(catalog).curricula.find(
    ({ curriculum }) => curriculum.slug === "transformer-from-zero",
  );
  assert.equal(transformerCatalog?.chapters.length, 10);
  assert.equal(
    transformerCatalog?.chapters.filter(
      ({ publication }) => publication.contentReady,
    ).length,
    10,
  );
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
  const networking = catalog.resources[linuxNetworkingKey];
  const tinySystem = catalog.resources[linuxTinySystemKey];

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

  assert.equal(networking.developmentStatus, "complete");
  assert.equal(networking.contentReady, true);
  assert.equal(networking.source, "default");
  assert.equal(networking.publicationStatus, "draft");
  assert.equal(networking.effectivePublicationStatus, "draft");
  assert.equal(networking.listing, "listed");
  assert.equal(networking.scheduledAt, null);
  assert.equal(networking.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxNetworkingKey), false);

  assert.equal(tinySystem.developmentStatus, "complete");
  assert.equal(tinySystem.contentReady, true);
  assert.equal(tinySystem.source, "default");
  assert.equal(tinySystem.publicationStatus, "draft");
  assert.equal(tinySystem.effectivePublicationStatus, "draft");
  assert.equal(tinySystem.listing, "listed");
  assert.equal(tinySystem.scheduledAt, null);
  assert.equal(tinySystem.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, linuxTinySystemKey), false);

  const linuxCatalog = publicPublicationCatalog(catalog).curricula.find(
    ({ curriculum }) => curriculum.slug === "linux-systems",
  );
  assert.equal(linuxCatalog?.chapters.length, 8);
});

test("lists the new curriculum keys as drafts while respecting page readiness", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  const linuxNetworking = catalog.resources[linuxNetworkingCurriculumKey];
  const systemArchitecture = catalog.resources[systemArchitectureKey];

  assert.equal(linuxNetworking.developmentStatus, "in-progress");
  assert.equal(linuxNetworking.previewReady, true);
  assert.equal(linuxNetworking.contentReady, false);
  assert.equal(linuxNetworking.source, "default");
  assert.equal(linuxNetworking.publicationStatus, "draft");
  assert.equal(linuxNetworking.effectivePublicationStatus, "draft");
  assert.equal(linuxNetworking.listing, "listed");
  assert.equal(isPublicationListed(catalog, linuxNetworkingCurriculumKey), true);
  assert.equal(
    isPublicationAccessible(catalog, linuxNetworkingCurriculumKey),
    false,
  );

  assert.equal(systemArchitecture.developmentStatus, "planned");
  assert.equal(systemArchitecture.previewReady, true);
  assert.equal(systemArchitecture.contentReady, false);
  assert.equal(systemArchitecture.source, "default");
  assert.equal(systemArchitecture.publicationStatus, "draft");
  assert.equal(systemArchitecture.effectivePublicationStatus, "draft");
  assert.equal(systemArchitecture.listing, "listed");
  assert.equal(isPublicationListed(catalog, systemArchitectureKey), true);
  assert.equal(isPublicationAccessible(catalog, systemArchitectureKey), false);

  const publicCatalog = publicPublicationCatalog(catalog);
  const linuxNetworkingCatalog = publicCatalog.curricula.find(
    ({ curriculum }) => curriculum.slug === "linux-networking",
  );
  const systemArchitectureCatalog = publicCatalog.curricula.find(
    ({ curriculum }) => curriculum.slug === "system-architecture",
  );
  assert.equal(linuxNetworkingCatalog?.chapters.length, 0);
  assert.equal(systemArchitectureCatalog?.chapters.length, 0);
});

test("keeps completed infrastructure chapters unpublished by default", () => {
  const catalog = resolvePublicationCatalog([], 1_000);
  const infrastructure = catalog.resources[infrastructureKey];
  const namespaces = catalog.resources[infrastructureNamespacesKey];
  const vethRouting = catalog.resources[infrastructureVethRoutingKey];
  const egressNat = catalog.resources[infrastructureEgressNatKey];
  const serviceDiscovery = catalog.resources[infrastructureServiceDiscoveryKey];
  const networkPolicy = catalog.resources[infrastructureNetworkPolicyKey];
  const availability = catalog.resources[infrastructureAvailabilityKey];
  const observability = catalog.resources[infrastructureObservabilityKey];

  assert.equal(infrastructure.developmentStatus, "in-progress");
  assert.equal(infrastructure.contentReady, true);
  assert.equal(infrastructure.source, "default");
  assert.equal(infrastructure.publicationStatus, "draft");
  assert.equal(infrastructure.effectivePublicationStatus, "draft");
  assert.equal(infrastructure.listing, "listed");
  assert.equal(infrastructure.scheduledAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureKey), false);

  assert.equal(namespaces.developmentStatus, "complete");
  assert.equal(namespaces.contentReady, true);
  assert.equal(namespaces.source, "default");
  assert.equal(namespaces.publicationStatus, "draft");
  assert.equal(namespaces.effectivePublicationStatus, "draft");
  assert.equal(namespaces.listing, "hidden");
  assert.equal(namespaces.scheduledAt, null);
  assert.equal(namespaces.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureNamespacesKey), false);

  assert.equal(vethRouting.developmentStatus, "complete");
  assert.equal(vethRouting.previewReady, true);
  assert.equal(vethRouting.contentReady, true);
  assert.equal(vethRouting.source, "default");
  assert.equal(vethRouting.publicationStatus, "draft");
  assert.equal(vethRouting.effectivePublicationStatus, "draft");
  assert.equal(vethRouting.listing, "hidden");
  assert.equal(vethRouting.scheduledAt, null);
  assert.equal(vethRouting.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureVethRoutingKey), false);
  assert.equal(isPublicationListed(catalog, infrastructureVethRoutingKey), false);

  assert.equal(egressNat.developmentStatus, "complete");
  assert.equal(egressNat.previewReady, true);
  assert.equal(egressNat.contentReady, true);
  assert.equal(egressNat.publicationStatus, "draft");
  assert.equal(egressNat.effectivePublicationStatus, "draft");
  assert.equal(egressNat.listing, "hidden");
  assert.equal(isPublicationAccessible(catalog, infrastructureEgressNatKey), false);
  assert.equal(isPublicationListed(catalog, infrastructureEgressNatKey), false);

  assert.equal(serviceDiscovery.developmentStatus, "complete");
  assert.equal(serviceDiscovery.previewReady, true);
  assert.equal(serviceDiscovery.contentReady, true);
  assert.equal(serviceDiscovery.source, "default");
  assert.equal(serviceDiscovery.publicationStatus, "draft");
  assert.equal(serviceDiscovery.effectivePublicationStatus, "draft");
  assert.equal(serviceDiscovery.listing, "hidden");
  assert.equal(serviceDiscovery.scheduledAt, null);
  assert.equal(serviceDiscovery.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureServiceDiscoveryKey), false);
  assert.equal(isPublicationListed(catalog, infrastructureServiceDiscoveryKey), false);

  assert.equal(networkPolicy.developmentStatus, "complete");
  assert.equal(networkPolicy.previewReady, true);
  assert.equal(networkPolicy.contentReady, true);
  assert.equal(networkPolicy.source, "default");
  assert.equal(networkPolicy.publicationStatus, "draft");
  assert.equal(networkPolicy.effectivePublicationStatus, "draft");
  assert.equal(networkPolicy.listing, "hidden");
  assert.equal(networkPolicy.scheduledAt, null);
  assert.equal(networkPolicy.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureNetworkPolicyKey), false);
  assert.equal(isPublicationListed(catalog, infrastructureNetworkPolicyKey), false);
  assert.equal(availability.developmentStatus, "complete");
  assert.equal(availability.previewReady, true);
  assert.equal(availability.contentReady, true);
  assert.equal(availability.publicationStatus, "draft");
  assert.equal(availability.effectivePublicationStatus, "draft");
  assert.equal(availability.listing, "hidden");
  assert.equal(isPublicationAccessible(catalog, infrastructureAvailabilityKey), false);
  assert.equal(observability.developmentStatus, "complete");
  assert.equal(observability.previewReady, true);
  assert.equal(observability.contentReady, true);
  assert.equal(observability.source, "default");
  assert.equal(observability.publicationStatus, "draft");
  assert.equal(observability.effectivePublicationStatus, "draft");
  assert.equal(observability.listing, "hidden");
  assert.equal(observability.scheduledAt, null);
  assert.equal(observability.publishedAt, null);
  assert.equal(isPublicationAccessible(catalog, infrastructureObservabilityKey), false);
  assert.equal(isPublicationListed(catalog, infrastructureObservabilityKey), false);

  const announced = publicPublicationCatalog(catalog).curricula.find(
    ({ curriculum }) => curriculum.slug === "infrastructure-design",
  );
  assert.equal(announced?.publication.effectivePublicationStatus, "draft");
  assert.deepEqual(announced?.chapters.map(({ chapter }) => chapter.slug), []);
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

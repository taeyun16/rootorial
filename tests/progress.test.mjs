import assert from "node:assert/strict";
import test from "node:test";
import {
  accountProgressKey,
  buildProgressMetadata,
  mergeCompletedSlugs,
  normalizeCompletedSlugs,
  parseStoredProgress,
  readCompletedFromMetadata,
  readProgressVersion,
  validateCompletedSlugs,
} from "../src/features/progress/progress.ts";

test("normalizes stored progress to known chapters in curriculum order", () => {
  assert.deepEqual(
    normalizeCompletedSlugs([
      "transformer-block",
      "self-attention",
      "attention",
      "vectors",
      "unknown",
      "vectors",
      42,
    ]),
    [
      "transformer-from-zero/vectors",
      "transformer-from-zero/attention",
      "transformer-from-zero/self-attention",
      "transformer-from-zero/transformer-block",
    ],
  );
  assert.deepEqual(parseStoredProgress("not-json"), []);
  assert.deepEqual(parseStoredProgress('{"vectors":true}'), []);
});

test("validates sync input and rejects unknown chapter slugs", () => {
  assert.deepEqual(
    validateCompletedSlugs([
      "vectors",
      "optimization",
      "neural-networks",
      "training",
      "embeddings",
      "sequences",
      "attention",
      "self-attention",
      "transformer-block",
    ]),
    [
      "transformer-from-zero/vectors",
      "transformer-from-zero/optimization",
      "transformer-from-zero/neural-networks",
      "transformer-from-zero/training",
      "transformer-from-zero/embeddings",
      "transformer-from-zero/sequences",
      "transformer-from-zero/attention",
      "transformer-from-zero/self-attention",
      "transformer-from-zero/transformer-block",
    ],
  );
  assert.throws(
    () => validateCompletedSlugs(["vectors", "not-a-chapter"]),
    /알 수 없는 챕터/,
  );
  assert.throws(() => validateCompletedSlugs("vectors"), /목록이 필요/);
});

test("merges anonymous, cached, and remote progress without duplicates", () => {
  assert.deepEqual(
    mergeCompletedSlugs(
      ["self-attention", "attention", "vectors"],
      [
        "vectors",
        "optimization",
        "neural-networks",
        "training",
        "embeddings",
        "sequences",
      ],
    ),
    [
      "transformer-from-zero/vectors",
      "transformer-from-zero/optimization",
      "transformer-from-zero/neural-networks",
      "transformer-from-zero/training",
      "transformer-from-zero/embeddings",
      "transformer-from-zero/sequences",
      "transformer-from-zero/attention",
      "transformer-from-zero/self-attention",
    ],
  );
});

test("converts Clerk private metadata without trusting unknown values", () => {
  const metadata = {
    rootorial: {
      completedChapters: {
        "transformer-block": true,
        "self-attention": true,
        attention: true,
        vectors: true,
        optimization: false,
        admin: true,
      },
    },
  };

  assert.deepEqual(readCompletedFromMetadata(metadata), [
    "transformer-from-zero/vectors",
    "transformer-from-zero/attention",
    "transformer-from-zero/self-attention",
    "transformer-from-zero/transformer-block",
  ]);
  assert.deepEqual(
    buildProgressMetadata(["transformer-block", "self-attention", "attention", "vectors"]),
    {
      rootorial: {
        progressVersion: 2,
        curricula: {
          "transformer-from-zero": {
            completedChapters: {
              vectors: true,
              attention: true,
              "self-attention": true,
              "transformer-block": true,
            },
          },
        },
      },
    },
  );
  assert.deepEqual(readCompletedFromMetadata({ rootorial: [] }), []);
  assert.equal(readProgressVersion(metadata), 1);
});

test("reads curriculum-aware v2 metadata", () => {
  assert.deepEqual(readCompletedFromMetadata({
    rootorial: {
      progressVersion: 2,
      curricula: {
        "transformer-from-zero": {
          completedChapters: {
            vectors: true,
            optimization: true,
            "neural-networks": true,
            training: true,
            embeddings: true,
            sequences: true,
            attention: true,
            "self-attention": true,
            "transformer-block": true,
          },
        },
      },
    },
  }), [
    "transformer-from-zero/vectors",
    "transformer-from-zero/optimization",
    "transformer-from-zero/neural-networks",
    "transformer-from-zero/training",
    "transformer-from-zero/embeddings",
    "transformer-from-zero/sequences",
    "transformer-from-zero/attention",
    "transformer-from-zero/self-attention",
    "transformer-from-zero/transformer-block",
  ]);
  assert.equal(readProgressVersion({ rootorial: { progressVersion: 2 } }), 2);
});

test("keeps Linux and Transformer progress in separate curriculum buckets", () => {
  const completed = [
    "linux-systems/assemble-a-tiny-linux",
    "linux-systems/networking-from-a-packet",
    "linux-systems/storage-and-filesystems",
    "linux-systems/memory-and-virtual-addresses",
    "linux-systems/users-and-permissions",
    "linux-systems/processes-and-signals",
    "linux-systems/boot-to-shell",
    "linux-systems/shell-and-filesystem",
    "transformer-from-zero/vectors",
  ];
  assert.deepEqual(validateCompletedSlugs(completed), [
    "transformer-from-zero/vectors",
    "linux-systems/shell-and-filesystem",
    "linux-systems/boot-to-shell",
    "linux-systems/processes-and-signals",
    "linux-systems/users-and-permissions",
    "linux-systems/memory-and-virtual-addresses",
    "linux-systems/storage-and-filesystems",
    "linux-systems/networking-from-a-packet",
    "linux-systems/assemble-a-tiny-linux",
  ]);
  assert.deepEqual(buildProgressMetadata(completed), {
    rootorial: {
      progressVersion: 2,
      curricula: {
        "transformer-from-zero": {
          completedChapters: { vectors: true },
        },
        "linux-systems": {
          completedChapters: {
            "shell-and-filesystem": true,
            "boot-to-shell": true,
            "processes-and-signals": true,
            "users-and-permissions": true,
            "memory-and-virtual-addresses": true,
            "storage-and-filesystems": true,
            "networking-from-a-packet": true,
            "assemble-a-tiny-linux": true,
          },
        },
      },
    },
  });
});

test("uses an encoded, account-specific local fallback key", () => {
  assert.equal(
    accountProgressKey("user/demo@example.com"),
    "rootorial-progress:account:user%2Fdemo%40example.com",
  );
});

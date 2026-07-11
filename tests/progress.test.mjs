import assert from "node:assert/strict";
import test from "node:test";
import {
  accountProgressKey,
  buildProgressMetadata,
  mergeCompletedSlugs,
  normalizeCompletedSlugs,
  parseStoredProgress,
  readCompletedFromMetadata,
  validateCompletedSlugs,
} from "../src/features/progress/progress.ts";

test("normalizes stored progress to known chapters in curriculum order", () => {
  assert.deepEqual(
    normalizeCompletedSlugs([
      "attention",
      "vectors",
      "unknown",
      "vectors",
      42,
    ]),
    ["vectors", "attention"],
  );
  assert.deepEqual(parseStoredProgress("not-json"), []);
  assert.deepEqual(parseStoredProgress('{"vectors":true}'), []);
});

test("validates sync input and rejects unknown chapter slugs", () => {
  assert.deepEqual(validateCompletedSlugs(["vectors", "optimization"]), [
    "vectors",
    "optimization",
  ]);
  assert.throws(
    () => validateCompletedSlugs(["vectors", "not-a-chapter"]),
    /알 수 없는 챕터/,
  );
  assert.throws(() => validateCompletedSlugs("vectors"), /목록이 필요/);
});

test("merges anonymous, cached, and remote progress without duplicates", () => {
  assert.deepEqual(
    mergeCompletedSlugs(
      ["attention", "vectors"],
      ["vectors", "optimization"],
    ),
    ["vectors", "optimization", "attention"],
  );
});

test("converts Clerk private metadata without trusting unknown values", () => {
  const metadata = {
    rezero: {
      completedChapters: {
        attention: true,
        vectors: true,
        optimization: false,
        admin: true,
      },
    },
  };

  assert.deepEqual(readCompletedFromMetadata(metadata), ["vectors", "attention"]);
  assert.deepEqual(buildProgressMetadata(["attention", "vectors"]), {
    rezero: {
      completedChapters: {
        vectors: true,
        attention: true,
      },
    },
  });
  assert.deepEqual(readCompletedFromMetadata({ rezero: [] }), []);
});

test("uses an encoded, account-specific local fallback key", () => {
  assert.equal(
    accountProgressKey("user/demo@example.com"),
    "rezero-progress:account:user%2Fdemo%40example.com",
  );
});

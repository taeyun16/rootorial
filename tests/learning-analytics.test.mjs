import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  conceptQuestionRegistry,
  learningPresenceShard,
  validateAttemptInput,
  validateCourseAccessInput,
  validateHeartbeatInput,
  validateStartSessionInput,
} from "../src/features/learning-analytics/learning-analytics.ts";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";
const submissionId = "123e4567-e89b-42d3-a456-426614174001";

test("accepts only the known learning surface and locale", () => {
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    locale: "ko",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    locale: "ko",
  });
  assert.throws(() => validateStartSessionInput({
    curriculumSlug: "unknown",
    chapterSlug: "vectors",
    locale: "ko",
  }));
});

test("accepts course access only for a known curriculum", () => {
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: null,
    path: "/curricula/transformer-from-zero",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    path: "/curricula/transformer-from-zero/chapters/vectors",
  });
  assert.throws(() => validateCourseAccessInput({ curriculumSlug: "unknown" }));
  assert.throws(() => validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "planned" }));
});

test("normalizes heartbeat activity so hidden tabs cannot be active", () => {
  assert.deepEqual(validateHeartbeatInput({ sessionId, visible: false, active: true }), {
    sessionId,
    visible: false,
    active: false,
  });
});

test("routes the same learner to a stable bounded presence shard", () => {
  const shard = learningPresenceShard("user_2abc123");
  assert.equal(shard, learningPresenceShard("user_2abc123"));
  assert.ok(shard >= 0 && shard < 16);
});

test("validates submitted answers against the versioned server registry", () => {
  const result = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    answers: { orientation: "row-column", normalization: "zero" },
  });
  assert.equal(result.answers[0].key, "transformer-from-zero/vectors/orientation");
  assert.equal(conceptQuestionRegistry[result.answers[0].key].correctAnswer, "row-column");
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    answers: { orientation: "client-says-correct" },
  }));
});

test("ships D1 analytics tables and a SQLite Durable Object migration", async () => {
  const migration = await readFile(new URL("../drizzle/0004_workable_blockbuster.sql", import.meta.url), "utf8");
  const visitorMigration = await readFile(new URL("../drizzle/0005_smooth_chimera.sql", import.meta.url), "utf8");
  const reachMigration = await readFile(new URL("../drizzle/0006_ambiguous_jasper_sitwell.sql", import.meta.url), "utf8");
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE `learning_sessions`/);
  assert.match(migration, /CREATE TABLE `learning_attempts`/);
  assert.match(visitorMigration, /CREATE TABLE `course_visitors`/);
  assert.match(reachMigration, /CREATE TABLE `content_impressions`/);
  assert.match(reachMigration, /CREATE TABLE `content_visitors`/);
  assert.match(wrangler, /"new_sqlite_classes": \["LearningSession", "LearningPresence"\]/);
  assert.match(wrangler, /"name": "LEARNING_SESSIONS"/);
  assert.match(wrangler, /"name": "LEARNING_PRESENCE"/);
  assert.match(wrangler, /"binding": "CONTENT_ANALYTICS"/);
});

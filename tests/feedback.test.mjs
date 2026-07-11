import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  FEEDBACK_MESSAGE_MAX_LENGTH,
  validateSubmitFeedbackInput,
} from "../src/features/feedback/feedback.ts";

test("normalizes feedback without trusting client-owned identity fields", () => {
  assert.deepEqual(
    validateSubmitFeedbackInput({
      kind: "confusing",
      message: "  텐서 shape 예시를 하나 더 보고 싶어요.  ",
      pagePath: "  /chapters/vectors?from=home  ",
      pageTitle: "  01. 벡터와 텐서 · Rootorial  ",
      authorUserId: "user_spoofed",
      createdAt: 1,
    }),
    {
      kind: "confusing",
      message: "텐서 shape 예시를 하나 더 보고 싶어요.",
      pagePath: "/chapters/vectors?from=home",
      pageTitle: "01. 벡터와 텐서 · Rootorial",
    },
  );
});

test("rejects invalid kinds, external paths, and oversized messages", () => {
  const valid = {
    kind: "suggestion",
    message: "예제를 추가해 주세요.",
    pagePath: "/chapters/vectors",
    pageTitle: "벡터와 텐서",
  };

  assert.throws(
    () => validateSubmitFeedbackInput({ ...valid, kind: "praise" }),
    /종류/,
  );
  assert.throws(
    () => validateSubmitFeedbackInput({ ...valid, pagePath: "https://example.com" }),
    /페이지 경로/,
  );
  assert.throws(
    () => validateSubmitFeedbackInput({ ...valid, pagePath: "//example.com/path" }),
    /페이지 경로/,
  );
  assert.throws(
    () => validateSubmitFeedbackInput({
      ...valid,
      message: "x".repeat(FEEDBACK_MESSAGE_MAX_LENGTH + 1),
    }),
    /2,000자/,
  );
});

test("Drizzle migrations include durable content feedback storage", () => {
  const migration = readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort()
    .map((name) => readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"))
    .join("\n");

  assert.match(migration, /CREATE TABLE `content_feedback`/);
  assert.match(migration, /content_feedback_author_created_idx/);
  assert.match(migration, /content_feedback_page_created_idx/);
  assert.match(migration, /content_feedback_message_length/);
});

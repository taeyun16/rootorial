import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import test from "node:test";
import {
  ANSWER_BODY_MAX_LENGTH,
  QUESTION_BODY_MAX_LENGTH,
  answerKindForUser,
  canBlockAuthor,
  canLikeAnswer,
  canReplyToDiscussionQuestion,
  getDiscussionCapabilities,
  isDiscussionAdmin,
  parseAdminUserIds,
  validateCreateAnswerInput,
  validateCreateQuestionInput,
  validateDeletePostInput,
  validateGetDiscussionInput,
  validateModeratePostInput,
  validateSetAnswerLikeInput,
  validateSetAuthorBlockInput,
  validateUpdateDiscussionProfileInput,
  validateUpdatePostInput,
} from "../src/features/discussion/discussion.ts";
import {
  activeDiscussionScopeIds,
  discussionScopeIds,
  isActiveDiscussionScopeId,
  isDiscussionScopeId,
} from "../src/data/discussionScopes.ts";

const QUESTION_ID = "018f0f47-3d6f-7d0a-8b5e-516d1f1ad333";
const ANSWER_ID = "76f68414-2c6d-44f8-a8af-5b7d1fe32ae0";

test("keeps discussion scopes finite, typed, and stable", () => {
  assert.ok(discussionScopeIds.includes("transformer-from-zero.vectors.meaning"));
  assert.ok(
    discussionScopeIds.includes("transformer-from-zero.vectors.notebook.attention-preview"),
  );
  assert.ok(activeDiscussionScopeIds.includes("transformer-from-zero.vectors.meaning"));
  assert.equal(
    activeDiscussionScopeIds.includes("transformer-from-zero.vectors.notebook.attention-preview"),
    false,
  );
  assert.equal(
    isActiveDiscussionScopeId("transformer-from-zero.vectors.notebook.attention-preview"),
    false,
  );
  assert.equal(isDiscussionScopeId("transformer-from-zero.vectors.dot-product.explorer"), true);
  assert.equal(isDiscussionScopeId("transformer-from-zero.vectors.arbitrary-client-scope"), false);
  assert.equal(isDiscussionScopeId("toString"), false);
  assert.throws(
    () => validateGetDiscussionInput({ scopeId: "toString" }),
    /학습 항목/,
  );
});

test("normalizes question and answer inputs without trusting client identity", () => {
  assert.deepEqual(
    validateCreateQuestionInput({
      scopeId: "transformer-from-zero.vectors.meaning",
      body: "  벡터의 방향은 어떻게 정해지나요?  ",
      authorUserId: "user_spoofed",
      state: "hidden",
    }),
    {
      scopeId: "transformer-from-zero.vectors.meaning",
      body: "벡터의 방향은 어떻게 정해지나요?",
    },
  );
  assert.deepEqual(
    validateCreateAnswerInput({
      questionId: QUESTION_ID,
      body: "  원점에서 끝점으로 향하는 방향입니다.  ",
      kind: "official",
    }),
    {
      questionId: QUESTION_ID,
      body: "원점에서 끝점으로 향하는 방향입니다.",
    },
  );

  assert.throws(
    () =>
      validateCreateQuestionInput({
        scopeId: "transformer-from-zero.vectors.made-up",
        body: "질문",
      }),
    /학습 항목/,
  );
  assert.throws(
    () =>
      validateCreateQuestionInput({
        scopeId: "transformer-from-zero.vectors.notebook.attention-preview",
        body: "이전 섹션에 새 질문을 남깁니다.",
      }),
    /질문을 남길 수 없는/,
  );
  assert.equal(
    validateGetDiscussionInput({
      scopeId: "transformer-from-zero.vectors.notebook.attention-preview",
    }).scopeId,
    "transformer-from-zero.vectors.notebook.attention-preview",
  );
  assert.throws(
    () =>
      validateCreateQuestionInput({
        scopeId: "transformer-from-zero.vectors.meaning",
        body: "x".repeat(QUESTION_BODY_MAX_LENGTH + 1),
      }),
    /2,000자/,
  );
  assert.throws(
    () =>
      validateCreateAnswerInput({
        questionId: QUESTION_ID,
        body: "x".repeat(ANSWER_BODY_MAX_LENGTH + 1),
      }),
    /4,000자/,
  );
});

test("validates a user-controlled public discussion profile", () => {
  assert.deepEqual(
    validateUpdateDiscussionProfileInput({
      displayName: "  벡터   탐험가  ",
      imageVisible: false,
      userId: "user_spoofed",
    }),
    { displayName: "벡터 탐험가", imageVisible: false },
  );
  assert.throws(
    () => validateUpdateDiscussionProfileInput({
      displayName: "A",
      imageVisible: false,
    }),
    /2~24자/,
  );
  assert.throws(
    () => validateUpdateDiscussionProfileInput({
      displayName: "벡터 탐험가",
      imageVisible: "yes",
    }),
    /공개 설정/,
  );
});

test("validates owner update and delete mutation targets", () => {
  assert.deepEqual(
    validateUpdatePostInput({
      targetType: "question",
      targetId: QUESTION_ID,
      body: "  수정한 질문  ",
      authorUserId: "user_spoofed",
    }),
    {
      targetType: "question",
      targetId: QUESTION_ID,
      body: "수정한 질문",
    },
  );
  assert.deepEqual(
    validateDeletePostInput({
      targetType: "answer",
      targetId: ANSWER_ID,
      state: "deleted",
    }),
    { targetType: "answer", targetId: ANSWER_ID },
  );
  assert.throws(
    () => validateUpdatePostInput({
      targetType: "answer",
      targetId: ANSWER_ID,
      body: " ",
    }),
    /답변 내용을 입력/,
  );
});

test("validates cursors and idempotent social mutation inputs", () => {
  assert.deepEqual(
    validateGetDiscussionInput({
      scopeId: "transformer-from-zero.vectors.notebook.vector-magnitude",
      cursor: { createdAt: 1_783_740_000_000, id: QUESTION_ID },
    }),
    {
      scopeId: "transformer-from-zero.vectors.notebook.vector-magnitude",
      cursor: { createdAt: 1_783_740_000_000, id: QUESTION_ID },
    },
  );
  assert.deepEqual(
    validateSetAnswerLikeInput({ answerId: ANSWER_ID, liked: true }),
    { answerId: ANSWER_ID, liked: true },
  );
  assert.deepEqual(
    validateSetAuthorBlockInput({
      sourceType: "answer",
      sourceId: ANSWER_ID,
      blocked: false,
    }),
    { sourceType: "answer", sourceId: ANSWER_ID, blocked: false },
  );
  assert.deepEqual(
    validateSetAuthorBlockInput({
      blockToken: `question.${QUESTION_ID}`,
      blocked: false,
    }),
    { blockToken: `question.${QUESTION_ID}`, blocked: false },
  );
  assert.throws(
    () =>
      validateSetAuthorBlockInput({
        blockToken: `question.${QUESTION_ID}`,
        blocked: true,
      }),
    /차단 해제 요청/,
  );
  assert.throws(
    () => validateSetAnswerLikeInput({ answerId: "answer-1", liked: true }),
    /답변을 찾을 수 없습니다/,
  );
  assert.throws(
    () =>
      validateSetAuthorBlockInput({
        sourceType: "profile",
        sourceId: ANSWER_ID,
        blocked: true,
      }),
    /질문 또는 답변/,
  );
});

test("admin configuration fails closed and only accepts Clerk user ids", () => {
  assert.deepEqual([...parseAdminUserIds(undefined)], []);
  assert.deepEqual(
    [...parseAdminUserIds(" user_admin1,invalid, user_admin2 ,,org_owner")],
    ["user_admin1", "user_admin2"],
  );
  assert.equal(isDiscussionAdmin("user_admin1", undefined), false);
  assert.equal(
    isDiscussionAdmin("user_admin1", "user_admin1,user_admin2"),
    true,
  );
  assert.equal(
    isDiscussionAdmin("user_learner", "user_admin1,user_admin2"),
    false,
  );
  assert.equal(
    answerKindForUser("user_admin1", "user_admin1"),
    "official",
  );
  assert.equal(answerKindForUser("user_learner", "user_admin1"), "community");
});

test("ownership, likes, blocks, and moderation capabilities are server-derived", () => {
  assert.deepEqual(
    getDiscussionCapabilities(
      "user_author",
      "user_author",
      "visible",
      "user_admin",
    ),
    { canEdit: true, canDelete: true, canModerate: false },
  );
  assert.deepEqual(
    getDiscussionCapabilities(
      "user_admin",
      "user_author",
      "hidden",
      "user_admin",
    ),
    { canEdit: false, canDelete: false, canModerate: true },
  );
  assert.equal(canLikeAnswer("user_reader", "user_author", "visible"), true);
  assert.equal(canLikeAnswer("user_author", "user_author", "visible"), false);
  assert.equal(canLikeAnswer("user_reader", "user_author", "hidden"), false);
  assert.equal(
    canReplyToDiscussionQuestion(
      "transformer-from-zero.vectors.meaning",
      "visible",
    ),
    true,
  );
  assert.equal(
    canReplyToDiscussionQuestion(
      "transformer-from-zero.vectors.notebook.attention-preview",
      "visible",
    ),
    false,
  );
  assert.equal(
    canBlockAuthor("user_reader", "user_author", "user_admin"),
    true,
  );
  assert.equal(
    canBlockAuthor("user_reader", "user_admin", "user_admin"),
    false,
  );
  assert.equal(
    canBlockAuthor("user_reader", "user_reader", "user_admin"),
    false,
  );
});

test("moderation input requires a concrete target and an auditable reason", () => {
  assert.deepEqual(
    validateModeratePostInput({
      targetType: "question",
      targetId: QUESTION_ID,
      action: "hide",
      reason: "  개인정보가 포함되어 있습니다.  ",
    }),
    {
      targetType: "question",
      targetId: QUESTION_ID,
      action: "hide",
      reason: "개인정보가 포함되어 있습니다.",
    },
  );
  assert.throws(
    () =>
      validateModeratePostInput({
        targetType: "answer",
        targetId: ANSWER_ID,
        action: "delete",
        reason: "스팸",
      }),
    /지원하지 않는/,
  );
  assert.throws(
    () =>
      validateModeratePostInput({
        targetType: "answer",
        targetId: ANSWER_ID,
        action: "restore",
        reason: "   ",
      }),
    /조치 사유/,
  );
});

test("Drizzle migrations contain the complete discussion contract", () => {
  const migrationNames = readdirSync(new URL("../drizzle/", import.meta.url))
    .filter((name) => /^\d{4}_.*\.sql$/.test(name))
    .sort();
  assert.ok(migrationNames.length, "expected Drizzle SQL migrations");

  const migration = migrationNames
    .map((name) =>
      readFileSync(new URL(`../drizzle/${name}`, import.meta.url), "utf8"),
    )
    .join("\n");
  for (const table of [
    "discussion_profiles",
    "discussion_questions",
    "discussion_answers",
    "discussion_answer_likes",
    "discussion_user_blocks",
    "discussion_moderation_events",
    "discussion_rate_limits",
  ]) {
    assert.ok(
      migration.includes(`CREATE TABLE \`${table}\``),
      `missing ${table} migration`,
    );
  }
  assert.match(migration, /discussion_user_blocks_not_self/);
  assert.match(migration, /discussion_answers_kind_check/);
  assert.match(migration, /discussion_moderation_events_action_check/);
  assert.match(migration, /discussion_rate_limits_window_kind_check/);
});

test("discussion writes use atomic rate windows and sanitized failure logs", () => {
  const serverSource = readFileSync(
    new URL(
      "../src/features/discussion/discussion.functions.ts",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(serverSource, /onConflictDoUpdate/);
  assert.match(serverSource, /setWhere: lt\(discussionRateLimits\.count/);
  assert.match(serverSource, /mutationFailure\("rate_limited"/);
  assert.match(serverSource, /mutationFailure\(\s*"profile_required"/);
  assert.match(serverSource, /answer\.authorConfiguredAt != null && answer\.authorImageVisible/);
  assert.match(serverSource, /question\.authorConfiguredAt != null &&[\s\S]*question\.authorImageVisible/);
  assert.match(serverSource, /scopeId: discussionQuestions\.scopeId/);
  assert.match(serverSource, /canReplyToDiscussionQuestion\(question\.scopeId, question\.state\)/);
  assert.doesNotMatch(serverSource, /console\.(?:error|warn)\([^\n]*,\s*error/);
});

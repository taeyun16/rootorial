import { sql } from "drizzle-orm";
import {
  check,
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
} from "drizzle-orm/sqlite-core";

export const discussionProfiles = sqliteTable("discussion_profiles", {
  userId: text("user_id").primaryKey(),
  displayName: text("display_name").notNull(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
}, (table) => [
  check(
    "discussion_profiles_display_name_length",
    sql`length(trim(${table.displayName})) between 1 and 80`,
  ),
]);

export const discussionQuestions = sqliteTable("discussion_questions", {
  id: text("id").primaryKey(),
  scopeId: text("scope_id").notNull(),
  authorUserId: text("author_user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  body: text("body").notNull(),
  state: text("state", { enum: ["visible", "hidden", "deleted"] })
    .notNull()
    .default("visible"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  moderatedByUserId: text("moderated_by_user_id").references(
    () => discussionProfiles.userId,
  ),
  moderatedAt: integer("moderated_at"),
  moderationReason: text("moderation_reason"),
}, (table) => [
  index("discussion_questions_scope_state_created_idx").on(
    table.scopeId,
    table.state,
    table.createdAt,
    table.id,
  ),
  index("discussion_questions_author_created_idx").on(
    table.authorUserId,
    table.createdAt,
    table.id,
  ),
  check(
    "discussion_questions_scope_length",
    sql`length(${table.scopeId}) between 3 and 120`,
  ),
  check(
    "discussion_questions_state_check",
    sql`${table.state} in ('visible', 'hidden', 'deleted')`,
  ),
  check(
    "discussion_questions_body_check",
    sql`${table.state} = 'deleted' or length(trim(${table.body})) between 1 and 2000`,
  ),
  check(
    "discussion_questions_moderation_check",
    sql`${table.state} != 'hidden' or (${table.moderatedByUserId} is not null and ${table.moderatedAt} is not null and length(trim(${table.moderationReason})) between 1 and 500)`,
  ),
]);

export const discussionAnswers = sqliteTable("discussion_answers", {
  id: text("id").primaryKey(),
  questionId: text("question_id")
    .notNull()
    .references(() => discussionQuestions.id, { onDelete: "cascade" }),
  authorUserId: text("author_user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  kind: text("kind", { enum: ["community", "official"] })
    .notNull()
    .default("community"),
  body: text("body").notNull(),
  state: text("state", { enum: ["visible", "hidden", "deleted"] })
    .notNull()
    .default("visible"),
  createdAt: integer("created_at").notNull(),
  updatedAt: integer("updated_at").notNull(),
  moderatedByUserId: text("moderated_by_user_id").references(
    () => discussionProfiles.userId,
  ),
  moderatedAt: integer("moderated_at"),
  moderationReason: text("moderation_reason"),
}, (table) => [
  index("discussion_answers_question_state_created_idx").on(
    table.questionId,
    table.state,
    table.createdAt,
    table.id,
  ),
  index("discussion_answers_author_created_idx").on(
    table.authorUserId,
    table.createdAt,
    table.id,
  ),
  check(
    "discussion_answers_kind_check",
    sql`${table.kind} in ('community', 'official')`,
  ),
  check(
    "discussion_answers_state_check",
    sql`${table.state} in ('visible', 'hidden', 'deleted')`,
  ),
  check(
    "discussion_answers_body_check",
    sql`${table.state} = 'deleted' or length(trim(${table.body})) between 1 and 4000`,
  ),
  check(
    "discussion_answers_moderation_check",
    sql`${table.state} != 'hidden' or (${table.moderatedByUserId} is not null and ${table.moderatedAt} is not null and length(trim(${table.moderationReason})) between 1 and 500)`,
  ),
]);

export const discussionAnswerLikes = sqliteTable("discussion_answer_likes", {
  answerId: text("answer_id")
    .notNull()
    .references(() => discussionAnswers.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.answerId, table.userId] }),
  index("discussion_answer_likes_user_answer_idx").on(
    table.userId,
    table.answerId,
  ),
]);

export const discussionUserBlocks = sqliteTable("discussion_user_blocks", {
  blockerUserId: text("blocker_user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  blockedUserId: text("blocked_user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  primaryKey({ columns: [table.blockerUserId, table.blockedUserId] }),
  index("discussion_user_blocks_blocked_blocker_idx").on(
    table.blockedUserId,
    table.blockerUserId,
  ),
  check(
    "discussion_user_blocks_not_self",
    sql`${table.blockerUserId} != ${table.blockedUserId}`,
  ),
]);

export const discussionModerationEvents = sqliteTable("discussion_moderation_events", {
  id: text("id").primaryKey(),
  actorUserId: text("actor_user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  targetType: text("target_type", { enum: ["question", "answer"] }).notNull(),
  targetId: text("target_id").notNull(),
  action: text("action", { enum: ["hide", "restore"] }).notNull(),
  reason: text("reason").notNull(),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("discussion_moderation_events_target_created_idx").on(
    table.targetType,
    table.targetId,
    table.createdAt,
  ),
  index("discussion_moderation_events_actor_created_idx").on(
    table.actorUserId,
    table.createdAt,
  ),
  check(
    "discussion_moderation_events_target_type_check",
    sql`${table.targetType} in ('question', 'answer')`,
  ),
  check(
    "discussion_moderation_events_action_check",
    sql`${table.action} in ('hide', 'restore')`,
  ),
  check(
    "discussion_moderation_events_reason_length",
    sql`length(trim(${table.reason})) between 1 and 500`,
  ),
]);

export const discussionRateLimits = sqliteTable("discussion_rate_limits", {
  key: text("key").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => discussionProfiles.userId),
  action: text("action", {
    enum: ["question", "answer", "social"],
  }).notNull(),
  windowKind: text("window_kind", {
    enum: ["burst", "daily"],
  }).notNull(),
  windowStart: integer("window_start").notNull(),
  count: integer("count").notNull().default(1),
}, (table) => [
  index("discussion_rate_limits_window_start_idx").on(table.windowStart),
  check(
    "discussion_rate_limits_action_check",
    sql`${table.action} in ('question', 'answer', 'social')`,
  ),
  check(
    "discussion_rate_limits_window_kind_check",
    sql`${table.windowKind} in ('burst', 'daily')`,
  ),
  check(
    "discussion_rate_limits_count_check",
    sql`${table.count} > 0`,
  ),
]);

export const contentFeedback = sqliteTable("content_feedback", {
  id: text("id").primaryKey(),
  authorUserId: text("author_user_id").notNull(),
  kind: text("kind", {
    enum: ["incorrect", "confusing", "suggestion"],
  }).notNull(),
  message: text("message").notNull(),
  pagePath: text("page_path").notNull(),
  pageTitle: text("page_title").notNull(),
  status: text("status", {
    enum: ["pending", "reviewing", "resolved"],
  }).notNull().default("pending"),
  adminNote: text("admin_note"),
  reviewedByUserId: text("reviewed_by_user_id"),
  reviewedAt: integer("reviewed_at"),
  createdAt: integer("created_at").notNull(),
}, (table) => [
  index("content_feedback_author_created_idx").on(
    table.authorUserId,
    table.createdAt,
  ),
  index("content_feedback_page_created_idx").on(
    table.pagePath,
    table.createdAt,
  ),
  index("content_feedback_status_created_idx").on(
    table.status,
    table.createdAt,
  ),
  check(
    "content_feedback_kind_check",
    sql`${table.kind} in ('incorrect', 'confusing', 'suggestion')`,
  ),
  check(
    "content_feedback_message_length",
    sql`length(trim(${table.message})) between 1 and 2000`,
  ),
  check(
    "content_feedback_page_path_length",
    sql`length(${table.pagePath}) between 1 and 500`,
  ),
  check(
    "content_feedback_page_title_length",
    sql`length(trim(${table.pageTitle})) between 1 and 200`,
  ),
  check(
    "content_feedback_status_check",
    sql`${table.status} in ('pending', 'reviewing', 'resolved')`,
  ),
  check(
    "content_feedback_admin_note_length",
    sql`${table.adminNote} is null or length(trim(${table.adminNote})) between 1 and 1000`,
  ),
]);

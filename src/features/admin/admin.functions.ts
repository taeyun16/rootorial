import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { desc, eq, gte, inArray, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { contentFeedback, discussionAnswers, discussionProfiles, discussionQuestions, systemEvents } from "../../../db/schema";
import type { LearningPresence } from "../../durable-objects/LearningPresence";
import { getConceptQuestionLabel } from "../chapters/chapter-registry";
import { LEARNING_PRESENCE_SHARD_COUNT } from "../learning-analytics/learning-analytics";
import { type AdminDashboard, validateUpdateFeedbackInput } from "./admin";
import { currentAdmin, privateResponse } from "./admin-auth.server";
import { curricula } from "../../data/curriculum";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
} from "../publication/publication";
import { loadPublicationCatalog } from "../publication/publication.server";

type AdminBindings = {
  DB?: D1Database;
  LEARNING_PRESENCE?: DurableObjectNamespace<LearningPresence>;
};

function bindings() {
  return env as unknown as AdminBindings;
}

async function onlineLearnerCount() {
  const namespace = bindings().LEARNING_PRESENCE;
  if (!namespace) return 0;
  const now = Date.now();
  const counts = await Promise.all(Array.from({ length: LEARNING_PRESENCE_SHARD_COUNT }, (_, shard) =>
    namespace.getByName(`learning-presence-${shard}`).count(now),
  ));
  return counts.reduce((total, count) => total + count, 0);
}

export const getAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const viewer = await currentAdmin();
  return { signedIn: Boolean(viewer.userId), isAdmin: viewer.isAdmin };
});

export const getOnlineLearnerCount = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const viewer = await currentAdmin();
  if (!viewer.userId || !viewer.isAdmin) return { ok: false as const };
  try {
    return { ok: true as const, count: await onlineLearnerCount(), updatedAt: Date.now() };
  } catch {
    console.error("[admin:presence] count failed");
    return { ok: false as const };
  }
});

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<AdminDashboard> => {
  privateResponse();
  const viewer = await currentAdmin();
  if (!viewer.userId) return { available: false, reason: "unauthorized", message: "관리자 계정으로 로그인해 주세요." };
  if (!viewer.isAdmin) return { available: false, reason: "forbidden", message: "이 계정에는 관리자 권한이 없습니다." };
  if (!bindings().DB) return { available: false, reason: "unavailable", message: "관리자 데이터베이스가 연결되지 않았습니다." };

  try {
    const database = bindings().DB!;
    const db = getDb(database);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const learningSince = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const count = sql<number>`count(*)`.mapWith(Number);
    const [learners, questions, answers, feedbackTotal, feedbackPending, recentQuestions, recentAnswers, recentFeedback, notificationPending, notificationDead] = await Promise.all([
      db.select({ value: count }).from(discussionProfiles),
      db.select({ value: count }).from(discussionQuestions),
      db.select({ value: count }).from(discussionAnswers),
      db.select({ value: count }).from(contentFeedback),
      db.select({ value: count }).from(contentFeedback).where(eq(contentFeedback.status, "pending")),
      db.select({ value: count }).from(discussionQuestions).where(gte(discussionQuestions.createdAt, weekAgo)),
      db.select({ value: count }).from(discussionAnswers).where(gte(discussionAnswers.createdAt, weekAgo)),
      db.select({ value: count }).from(contentFeedback).where(gte(contentFeedback.createdAt, weekAgo)),
      db.select({ value: count }).from(systemEvents).where(inArray(systemEvents.status, ["pending", "queued"])),
      db.select({ value: count }).from(systemEvents).where(eq(systemEvents.status, "dead")),
    ]);

    const [kindRows, questionDays, answerDays, feedbackDays, feedbackRows, learningSessionsResult, learningAttemptsResult, learningMasteryResult, learningQuestionsResult, courseVisitorsResult, contentReachResult, onlineLearners, recentSystemEvents, publicationCatalog] = await Promise.all([
      db.select({ kind: contentFeedback.kind, value: count }).from(contentFeedback).groupBy(contentFeedback.kind),
      db.select({ date: sql<string>`date(${discussionQuestions.createdAt} / 1000, 'unixepoch')`, value: count }).from(discussionQuestions).where(gte(discussionQuestions.createdAt, weekAgo)).groupBy(sql`date(${discussionQuestions.createdAt} / 1000, 'unixepoch')`),
      db.select({ date: sql<string>`date(${discussionAnswers.createdAt} / 1000, 'unixepoch')`, value: count }).from(discussionAnswers).where(gte(discussionAnswers.createdAt, weekAgo)).groupBy(sql`date(${discussionAnswers.createdAt} / 1000, 'unixepoch')`),
      db.select({ date: sql<string>`date(${contentFeedback.createdAt} / 1000, 'unixepoch')`, value: count }).from(contentFeedback).where(gte(contentFeedback.createdAt, weekAgo)).groupBy(sql`date(${contentFeedback.createdAt} / 1000, 'unixepoch')`),
      db.select().from(contentFeedback).orderBy(desc(contentFeedback.createdAt)).limit(100),
      database.prepare(`
        SELECT count(*) AS sessions,
               count(DISTINCT user_id) AS learners,
               coalesce(avg(dwell_seconds), 0) AS average_dwell_seconds,
               coalesce(avg(active_seconds), 0) AS average_active_seconds,
               coalesce(sum(active_seconds), 0) AS active_seconds,
               coalesce(sum(dwell_seconds), 0) AS dwell_seconds
        FROM learning_sessions WHERE started_at >= ?
      `).bind(learningSince).first<{
        sessions: number; learners: number; average_dwell_seconds: number;
        average_active_seconds: number; active_seconds: number; dwell_seconds: number;
      }>(),
      database.prepare(`
        SELECT count(*) AS attempts,
               sum(CASE WHEN attempt_number = 1 THEN 1 ELSE 0 END) AS first_attempts,
               sum(CASE WHEN attempt_number = 1 AND is_correct = 1 THEN 1 ELSE 0 END) AS first_correct
        FROM learning_attempts WHERE submitted_at >= ?
      `).bind(learningSince).first<{ attempts: number; first_attempts: number; first_correct: number }>(),
      database.prepare(`
        SELECT count(*) AS attempted_pairs,
               sum(eventually_correct) AS mastered_pairs
        FROM (
          SELECT user_id, curriculum_slug, chapter_slug, question_id, question_version,
                 max(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS eventually_correct
          FROM learning_attempts WHERE submitted_at >= ?
          GROUP BY user_id, curriculum_slug, chapter_slug, question_id, question_version
        )
      `).bind(learningSince).first<{ attempted_pairs: number; mastered_pairs: number }>(),
      database.prepare(`
        SELECT curriculum_slug, chapter_slug, question_id, question_version,
               count(*) AS attempts,
               count(DISTINCT user_id) AS learners,
               sum(CASE WHEN attempt_number = 1 THEN 1 ELSE 0 END) AS first_attempts,
               sum(CASE WHEN attempt_number = 1 AND is_correct = 1 THEN 1 ELSE 0 END) AS first_correct,
               sum(CASE WHEN is_correct = 1 THEN 1 ELSE 0 END) AS correct
        FROM learning_attempts WHERE submitted_at >= ?
        GROUP BY curriculum_slug, chapter_slug, question_id, question_version
        ORDER BY first_correct * 1.0 / nullif(first_attempts, 0) ASC, attempts DESC
      `).bind(learningSince).all<{
        curriculum_slug: string; chapter_slug: string;
        question_id: string; question_version: number;
        attempts: number; learners: number;
        first_attempts: number; first_correct: number; correct: number;
      }>(),
      database.prepare(`
        SELECT count(*) AS visitors,
               sum(CASE WHEN last_accessed_at >= ? THEN 1 ELSE 0 END) AS visitors_30d
        FROM course_visitors WHERE curriculum_slug = ?
      `).bind(learningSince, "transformer-from-zero").first<{ visitors: number; visitors_30d: number }>(),
      database.prepare(`
        SELECT i.path, i.curriculum_slug, i.chapter_slug,
               i.view_count AS views, i.signed_in_view_count AS signed_in_views,
               count(v.user_id) AS learners
        FROM content_impressions i
        LEFT JOIN content_visitors v ON v.path = i.path
        GROUP BY i.path, i.curriculum_slug, i.chapter_slug, i.view_count, i.signed_in_view_count
        ORDER BY i.view_count DESC, i.path ASC
      `).all<{
        path: string; curriculum_slug: string; chapter_slug: string | null;
        views: number; signed_in_views: number; learners: number;
      }>(),
      onlineLearnerCount().catch(() => 0),
      db.select({
        id: systemEvents.id,
        type: systemEvents.type,
        entityId: systemEvents.entityId,
        status: systemEvents.status,
        attemptCount: systemEvents.attemptCount,
        lastErrorCode: systemEvents.lastErrorCode,
        createdAt: systemEvents.createdAt,
        deliveredAt: systemEvents.deliveredAt,
      }).from(systemEvents).orderBy(desc(systemEvents.createdAt)).limit(50),
      loadPublicationCatalog(database),
    ]);

    const dayMap = new Map<string, { date: string; questions: number; answers: number; feedback: number }>();
    for (let offset = 6; offset >= 0; offset--) {
      const date = new Date(Date.now() - offset * 86400000).toISOString().slice(0, 10);
      dayMap.set(date, { date, questions: 0, answers: 0, feedback: 0 });
    }
    for (const row of questionDays) if (dayMap.has(row.date)) dayMap.get(row.date)!.questions = row.value;
    for (const row of answerDays) if (dayMap.has(row.date)) dayMap.get(row.date)!.answers = row.value;
    for (const row of feedbackDays) if (dayMap.has(row.date)) dayMap.get(row.date)!.feedback = row.value;

    const byKind = { incorrect: 0, confusing: 0, suggestion: 0 };
    for (const row of kindRows) byKind[row.kind] = row.value;
    const value = (rows: Array<{ value: number }>) => rows[0]?.value ?? 0;
    const ratio = (numerator: number | null | undefined, denominator: number | null | undefined) =>
      denominator ? Math.round(((numerator ?? 0) / denominator) * 100) : 0;
    const sessionMetrics = learningSessionsResult ?? {
      sessions: 0, learners: 0, average_dwell_seconds: 0,
      average_active_seconds: 0, active_seconds: 0, dwell_seconds: 0,
    };
    const attemptMetrics = learningAttemptsResult ?? { attempts: 0, first_attempts: 0, first_correct: 0 };
    const masteryMetrics = learningMasteryResult ?? { attempted_pairs: 0, mastered_pairs: 0 };
    const visitorMetrics = courseVisitorsResult ?? { visitors: 0, visitors_30d: 0 };
    return {
      available: true,
      generatedAt: Date.now(),
      publication: publicationCatalog
        ? {
            available: true,
            curricula: curricula.map((curriculum) => ({
              item: publicationCatalog.resources[
                curriculumPublicationKey(curriculum.slug)
              ],
              chapters: curriculum.chapters.ko.map(
                (chapter) =>
                  publicationCatalog.resources[
                    chapterPublicationKey(curriculum.slug, chapter.slug)
                  ],
              ),
            })),
          }
        : {
            available: false,
            message: "게시 상태 저장소를 불러오지 못했습니다.",
          },
      metrics: {
        learners: value(learners), questions: value(questions), answers: value(answers),
        feedbackTotal: value(feedbackTotal), feedbackPending: value(feedbackPending),
        activity7d: value(recentQuestions) + value(recentAnswers) + value(recentFeedback),
        notificationPending: value(notificationPending), notificationDead: value(notificationDead),
      },
      feedbackByKind: byKind,
      dailyActivity: [...dayMap.values()],
      learning: {
        windowDays: 30,
        onlineLearners,
        courseVisitors: Number(visitorMetrics.visitors),
        courseVisitors30d: Number(visitorMetrics.visitors_30d),
        sessions: Number(sessionMetrics.sessions),
        learners: Number(sessionMetrics.learners),
        averageDwellSeconds: Math.round(Number(sessionMetrics.average_dwell_seconds)),
        averageActiveSeconds: Math.round(Number(sessionMetrics.average_active_seconds)),
        activeRatio: ratio(Number(sessionMetrics.active_seconds), Number(sessionMetrics.dwell_seconds)),
        firstAttemptAccuracy: ratio(Number(attemptMetrics.first_correct), Number(attemptMetrics.first_attempts)),
        eventualMasteryRate: ratio(Number(masteryMetrics.mastered_pairs), Number(masteryMetrics.attempted_pairs)),
        contentReach: contentReachResult.results.map((row) => ({
          path: row.path,
          curriculumSlug: row.curriculum_slug,
          chapterSlug: row.chapter_slug,
          views: Number(row.views),
          signedInViews: Number(row.signed_in_views),
          learners: Number(row.learners),
        })),
        questionStats: learningQuestionsResult.results.map((row) => ({
          curriculumSlug: row.curriculum_slug,
          chapterSlug: row.chapter_slug,
          questionId: row.question_id,
          questionVersion: Number(row.question_version),
          label: getConceptQuestionLabel(
            row.curriculum_slug,
            row.chapter_slug,
            row.question_id,
            Number(row.question_version),
          ),
          attempts: Number(row.attempts),
          learners: Number(row.learners),
          firstAttemptAccuracy: ratio(Number(row.first_correct), Number(row.first_attempts)),
          overallAccuracy: ratio(Number(row.correct), Number(row.attempts)),
        })),
      },
      systemEvents: recentSystemEvents,
      feedback: feedbackRows,
    };
  } catch {
    console.error("[admin:dashboard] database operation failed");
    return { available: false, reason: "unavailable", message: "관리자 데이터를 불러오지 못했습니다. 잠시 뒤 다시 시도해 주세요." };
  }
});

export const updateFeedbackReview = createServerFn({ method: "POST" })
  .validator(validateUpdateFeedbackInput)
  .handler(async ({ data }) => {
    privateResponse();
    const viewer = await currentAdmin();
    if (!viewer.userId || !viewer.isAdmin) return { ok: false as const, message: "관리자 권한이 필요합니다." };
    const database = bindings().DB;
    if (!database) return { ok: false as const, message: "데이터베이스가 연결되지 않았습니다." };
    try {
      const db = getDb(database);
      const rows = await db.update(contentFeedback).set({
        status: data.status,
        adminNote: data.adminNote,
        reviewedByUserId: viewer.userId,
        reviewedAt: Date.now(),
      }).where(eq(contentFeedback.id, data.id)).returning({ id: contentFeedback.id });
      return rows.length ? { ok: true as const } : { ok: false as const, message: "피드백을 찾을 수 없습니다." };
    } catch {
      console.error("[admin:feedback-review] database operation failed");
      return { ok: false as const, message: "처리 상태를 저장하지 못했습니다." };
    }
  });

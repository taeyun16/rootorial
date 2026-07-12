import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { desc, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { contentFeedback, discussionAnswers, discussionProfiles, discussionQuestions } from "../../../db/schema";
import { isDiscussionAdmin } from "../discussion/discussion";
import { type AdminDashboard, validateUpdateFeedbackInput } from "./admin";

type AdminBindings = { DB?: D1Database; ROOTORIAL_ADMIN_USER_IDS?: string };

function bindings() {
  return env as unknown as AdminBindings;
}

function configuredAdmins() {
  return bindings().ROOTORIAL_ADMIN_USER_IDS ?? process.env.ROOTORIAL_ADMIN_USER_IDS;
}

async function currentAdmin() {
  try {
    const userId = (await auth()).userId;
    return { userId, isAdmin: isDiscussionAdmin(userId, configuredAdmins()) };
  } catch {
    return { userId: null, isAdmin: false };
  }
}

function privateResponse() {
  setResponseHeader("Cache-Control", "private, no-store");
}

export const getAdminAccess = createServerFn({ method: "GET" }).handler(async () => {
  privateResponse();
  const viewer = await currentAdmin();
  return { signedIn: Boolean(viewer.userId), isAdmin: viewer.isAdmin };
});

export const getAdminDashboard = createServerFn({ method: "GET" }).handler(async (): Promise<AdminDashboard> => {
  privateResponse();
  const viewer = await currentAdmin();
  if (!viewer.userId) return { available: false, reason: "unauthorized", message: "관리자 계정으로 로그인해 주세요." };
  if (!viewer.isAdmin) return { available: false, reason: "forbidden", message: "이 계정에는 관리자 권한이 없습니다." };
  if (!bindings().DB) return { available: false, reason: "unavailable", message: "관리자 데이터베이스가 연결되지 않았습니다." };

  try {
    const db = getDb(bindings().DB!);
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const count = sql<number>`count(*)`.mapWith(Number);
    const [learners, questions, answers, feedbackTotal, feedbackPending, recentQuestions, recentAnswers, recentFeedback] = await Promise.all([
      db.select({ value: count }).from(discussionProfiles),
      db.select({ value: count }).from(discussionQuestions),
      db.select({ value: count }).from(discussionAnswers),
      db.select({ value: count }).from(contentFeedback),
      db.select({ value: count }).from(contentFeedback).where(eq(contentFeedback.status, "pending")),
      db.select({ value: count }).from(discussionQuestions).where(gte(discussionQuestions.createdAt, weekAgo)),
      db.select({ value: count }).from(discussionAnswers).where(gte(discussionAnswers.createdAt, weekAgo)),
      db.select({ value: count }).from(contentFeedback).where(gte(contentFeedback.createdAt, weekAgo)),
    ]);

    const [kindRows, questionDays, answerDays, feedbackDays, feedbackRows] = await Promise.all([
      db.select({ kind: contentFeedback.kind, value: count }).from(contentFeedback).groupBy(contentFeedback.kind),
      db.select({ date: sql<string>`date(${discussionQuestions.createdAt} / 1000, 'unixepoch')`, value: count }).from(discussionQuestions).where(gte(discussionQuestions.createdAt, weekAgo)).groupBy(sql`date(${discussionQuestions.createdAt} / 1000, 'unixepoch')`),
      db.select({ date: sql<string>`date(${discussionAnswers.createdAt} / 1000, 'unixepoch')`, value: count }).from(discussionAnswers).where(gte(discussionAnswers.createdAt, weekAgo)).groupBy(sql`date(${discussionAnswers.createdAt} / 1000, 'unixepoch')`),
      db.select({ date: sql<string>`date(${contentFeedback.createdAt} / 1000, 'unixepoch')`, value: count }).from(contentFeedback).where(gte(contentFeedback.createdAt, weekAgo)).groupBy(sql`date(${contentFeedback.createdAt} / 1000, 'unixepoch')`),
      db.select().from(contentFeedback).orderBy(desc(contentFeedback.createdAt)).limit(100),
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
    return {
      available: true,
      generatedAt: Date.now(),
      metrics: {
        learners: value(learners), questions: value(questions), answers: value(answers),
        feedbackTotal: value(feedbackTotal), feedbackPending: value(feedbackPending),
        activity7d: value(recentQuestions) + value(recentAnswers) + value(recentFeedback),
      },
      feedbackByKind: byKind,
      dailyActivity: [...dayMap.values()],
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

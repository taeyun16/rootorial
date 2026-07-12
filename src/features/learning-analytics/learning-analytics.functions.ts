import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import type { LearningPresence } from "../../durable-objects/LearningPresence";
import type { LearningSession } from "../../durable-objects/LearningSession";
import {
  conceptQuestionRegistry,
  learningPresenceShard,
  type PublicCurriculumReach,
  type PublicPlatformReach,
  validateAttemptInput,
  validateCourseAccessInput,
  validateHeartbeatInput,
  validateStartSessionInput,
} from "./learning-analytics";

type LearningBindings = {
  CONTENT_ANALYTICS?: AnalyticsEngineDataset;
  DB?: D1Database;
  LEARNING_PRESENCE?: DurableObjectNamespace<LearningPresence>;
  LEARNING_SESSIONS?: DurableObjectNamespace<LearningSession>;
};

function bindings() { return env as unknown as LearningBindings; }
function privateResponse() { setResponseHeader("Cache-Control", "private, no-store"); }
async function userId() { try { return (await auth()).userId ?? null; } catch { return null; } }
async function touchPresence(currentUserId: string, now: number) {
  const namespace = bindings().LEARNING_PRESENCE;
  if (!namespace) return;
  try {
    await namespace.getByName(`learning-presence-${learningPresenceShard(currentUserId)}`).touch(currentUserId, now);
  } catch {
    console.error("[learning:presence] update failed");
  }
}
export const recordCourseAccess = createServerFn({ method: "POST" })
  .validator(validateCourseAccessInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const database = bindings().DB;
    bindings().CONTENT_ANALYTICS?.writeDataPoint({
      blobs: [data.path, data.curriculumSlug, data.chapterSlug ?? "", currentUserId ? "signed-in" : "anonymous"],
      doubles: [1],
      indexes: [data.curriculumSlug],
    });
    if (!database) return { ok: false as const };
    const now = Date.now();
    const statements = [database.prepare(`
      INSERT INTO content_impressions (
        path, curriculum_slug, chapter_slug, view_count, signed_in_view_count, created_at, updated_at
      ) VALUES (?, ?, ?, 1, ?, ?, ?)
      ON CONFLICT(path) DO UPDATE SET
        view_count = content_impressions.view_count + 1,
        signed_in_view_count = content_impressions.signed_in_view_count + excluded.signed_in_view_count,
        updated_at = excluded.updated_at
    `).bind(data.path, data.curriculumSlug, data.chapterSlug, currentUserId ? 1 : 0, now, now)];
    if (currentUserId) {
      statements.push(
        database.prepare(`
          INSERT INTO course_visitors (user_id, curriculum_slug, first_accessed_at, last_accessed_at, access_count)
          VALUES (?, ?, ?, ?, 1)
          ON CONFLICT(user_id, curriculum_slug) DO UPDATE SET
            last_accessed_at = excluded.last_accessed_at,
            access_count = course_visitors.access_count + 1
        `).bind(currentUserId, data.curriculumSlug, now, now),
        database.prepare(`
          INSERT INTO content_visitors (
            user_id, path, curriculum_slug, chapter_slug, first_accessed_at, last_accessed_at, access_count
          ) VALUES (?, ?, ?, ?, ?, ?, 1)
          ON CONFLICT(user_id, path) DO UPDATE SET
            last_accessed_at = excluded.last_accessed_at,
            access_count = content_visitors.access_count + 1
        `).bind(currentUserId, data.path, data.curriculumSlug, data.chapterSlug, now, now),
      );
    }
    await database.batch(statements);
    return { ok: true as const };
  });

export const getPlatformReach = createServerFn({ method: "GET" }).handler(async (): Promise<PublicPlatformReach> => {
  const database = bindings().DB;
  if (!database) return { learners: 0, views: 0, curricula: {} };
  try {
    const [overall, visitorRows, viewRows] = await Promise.all([
      database.prepare(`SELECT count(DISTINCT user_id) AS learners FROM course_visitors`)
        .first<{ learners: number }>(),
      database.prepare(`
        SELECT curriculum_slug, count(*) AS learners
        FROM course_visitors GROUP BY curriculum_slug
      `).all<{ curriculum_slug: string; learners: number }>(),
      database.prepare(`
        SELECT curriculum_slug, sum(view_count) AS views
        FROM content_impressions GROUP BY curriculum_slug
      `).all<{ curriculum_slug: string; views: number }>(),
    ]);
    const curricula: PublicPlatformReach["curricula"] = {};
    for (const row of visitorRows.results) curricula[row.curriculum_slug] = { learners: Number(row.learners), views: 0 };
    let views = 0;
    for (const row of viewRows.results) {
      const count = Number(row.views);
      views += count;
      curricula[row.curriculum_slug] = { learners: curricula[row.curriculum_slug]?.learners ?? 0, views: count };
    }
    return { learners: Number(overall?.learners ?? 0), views, curricula };
  } catch {
    return { learners: 0, views: 0, curricula: {} };
  }
});

export const getCurriculumReach = createServerFn({ method: "GET" })
  .validator((value) => {
    const data = validateCourseAccessInput(value);
    return { curriculumSlug: data.curriculumSlug };
  })
  .handler(async ({ data }): Promise<PublicCurriculumReach> => {
    const database = bindings().DB;
    const empty = { curriculumSlug: data.curriculumSlug, learners: 0, views: 0, chapters: {} };
    if (!database) return empty;
    try {
      const [course, contentRows] = await Promise.all([
        database.prepare(`
          SELECT count(*) AS learners FROM course_visitors WHERE curriculum_slug = ?
        `).bind(data.curriculumSlug).first<{ learners: number }>(),
        database.prepare(`
          SELECT i.chapter_slug, i.view_count AS views, count(v.user_id) AS learners
          FROM content_impressions i
          LEFT JOIN content_visitors v ON v.path = i.path
          WHERE i.curriculum_slug = ?
          GROUP BY i.path, i.chapter_slug, i.view_count
        `).bind(data.curriculumSlug).all<{ chapter_slug: string | null; views: number; learners: number }>(),
      ]);
      const result: PublicCurriculumReach = { ...empty, learners: Number(course?.learners ?? 0) };
      for (const row of contentRows.results) {
        const views = Number(row.views);
        result.views += views;
        if (row.chapter_slug) result.chapters[row.chapter_slug] = { learners: Number(row.learners), views };
      }
      return result;
    } catch {
      return empty;
    }
  });

export const startLearningSession = createServerFn({ method: "POST" })
  .validator(validateStartSessionInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const namespace = bindings().LEARNING_SESSIONS;
    if (!currentUserId) return { ok: false as const, code: "unauthorized" as const };
    if (!namespace || !bindings().DB) return { ok: false as const, code: "unavailable" as const };
    const sessionId = crypto.randomUUID();
    const now = Date.now();
    await namespace.getByName(`${currentUserId}:${sessionId}`).init({
      sessionId, userId: currentUserId, ...data, now,
    });
    await touchPresence(currentUserId, now);
    return { ok: true as const, sessionId };
  });

export const recordLearningHeartbeat = createServerFn({ method: "POST" })
  .validator(validateHeartbeatInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const namespace = bindings().LEARNING_SESSIONS;
    if (!currentUserId || !namespace) return { ok: false as const, closed: true as const };
    const result = await namespace.getByName(`${currentUserId}:${data.sessionId}`).heartbeat({
      userId: currentUserId,
      now: Date.now(),
      visible: data.visible,
      active: data.active,
    });
    if (data.visible) await touchPresence(currentUserId, Date.now());
    return result.closed
      ? { ok: false as const, closed: true as const }
      : { ok: true as const, closed: false as const };
  });

export const recordConceptAttempt = createServerFn({ method: "POST" })
  .validator(validateAttemptInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const database = bindings().DB;
    const namespace = bindings().LEARNING_SESSIONS;
    if (!currentUserId || !database || !namespace) return { ok: false as const };
    const now = Date.now();
    const session = await namespace.getByName(`${currentUserId}:${data.sessionId}`).heartbeat({
      userId: currentUserId, now, visible: true, active: true,
    });
    if (session.closed) return { ok: false as const };
    await touchPresence(currentUserId, now);
    for (const answer of data.answers) {
      const question = conceptQuestionRegistry[answer.key];
      await database.prepare(`
        INSERT INTO learning_attempts (
          id, submission_id, session_id, user_id, curriculum_slug, chapter_slug,
          question_id, question_version, selected_answer, is_correct,
          attempt_number, submitted_at
        )
        SELECT ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, coalesce(max(attempt_number), 0) + 1, ?
        FROM learning_attempts
        WHERE user_id = ? AND curriculum_slug = ? AND chapter_slug = ?
          AND question_id = ? AND question_version = ?
        ON CONFLICT(id) DO NOTHING
      `).bind(
        `${data.submissionId}:${answer.questionId}`, data.submissionId, data.sessionId,
        currentUserId, data.curriculumSlug, data.chapterSlug, answer.questionId,
        question.version, answer.selectedAnswer,
        answer.selectedAnswer === question.correctAnswer ? 1 : 0, now,
        currentUserId, data.curriculumSlug, data.chapterSlug, answer.questionId,
        question.version,
      ).run();
    }
    return { ok: true as const };
  });

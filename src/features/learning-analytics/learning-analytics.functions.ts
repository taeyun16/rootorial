import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import type { LearningPresence } from "../../durable-objects/LearningPresence";
import type { LearningSession } from "../../durable-objects/LearningSession";
import {
  conceptQuestionRegistry,
  learningPresenceShard,
  validateAttemptInput,
  validateCourseAccessInput,
  validateHeartbeatInput,
  validateStartSessionInput,
} from "./learning-analytics";

type LearningBindings = {
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
async function upsertCourseAccess(database: D1Database, currentUserId: string, curriculumSlug: string, now: number) {
  await database.prepare(`
    INSERT INTO course_visitors (user_id, curriculum_slug, first_accessed_at, last_accessed_at, access_count)
    VALUES (?, ?, ?, ?, 1)
    ON CONFLICT(user_id, curriculum_slug) DO UPDATE SET
      last_accessed_at = excluded.last_accessed_at,
      access_count = course_visitors.access_count + 1
  `).bind(currentUserId, curriculumSlug, now, now).run();
}

export const recordCourseAccess = createServerFn({ method: "POST" })
  .validator(validateCourseAccessInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const database = bindings().DB;
    if (!currentUserId || !database) return { ok: false as const };
    await upsertCourseAccess(database, currentUserId, data.curriculumSlug, Date.now());
    return { ok: true as const };
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
    await upsertCourseAccess(bindings().DB!, currentUserId, data.curriculumSlug, now);
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

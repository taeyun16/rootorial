import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import type { LearningPresence } from "../../durable-objects/LearningPresence";
import type { LearningSession } from "../../durable-objects/LearningSession";
import {
  learningPresenceShard,
  publicAnalyticsResources,
  type PublicCurriculumReach,
  type PublicAnalyticsResource,
  type PublicPlatformReach,
  validateAttemptInput,
  validateCourseAccessInput,
  validateHeartbeatInput,
  validateStartSessionInput,
} from "./learning-analytics";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
} from "../publication/publication";
import {
  isPublicResourceAccessible,
  loadPublicationCatalog,
} from "../publication/publication.server";

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

type PublicReachQuery = {
  learners: number;
  curricula: Record<string, { learners: number; views: number }>;
  chapters: Record<string, Record<string, { learners: number; views: number }>>;
};

function analyticsResourceFilter(resources: PublicAnalyticsResource[]) {
  const values: string[] = [];
  const clauses = resources.map((resource) => {
    values.push(resource.curriculumSlug);
    if (resource.chapterSlug === null) {
      return "(curriculum_slug = ? AND chapter_slug IS NULL)";
    }
    values.push(resource.chapterSlug);
    return "(curriculum_slug = ? AND chapter_slug = ?)";
  });
  return { sql: clauses.join(" OR "), values };
}

async function queryPublicReach(
  database: D1Database,
  resources: PublicAnalyticsResource[],
): Promise<PublicReachQuery> {
  const empty: PublicReachQuery = { learners: 0, curricula: {}, chapters: {} };
  if (!resources.length) return empty;
  const filter = analyticsResourceFilter(resources);
  const [overall, curriculumLearners, resourceLearners, resourceViews] =
    await Promise.all([
      database.prepare(`
        SELECT count(DISTINCT user_id) AS learners
        FROM content_visitors WHERE ${filter.sql}
      `).bind(...filter.values).first<{ learners: number }>(),
      database.prepare(`
        SELECT curriculum_slug, count(DISTINCT user_id) AS learners
        FROM content_visitors WHERE ${filter.sql}
        GROUP BY curriculum_slug
      `).bind(...filter.values).all<{
        curriculum_slug: string;
        learners: number;
      }>(),
      database.prepare(`
        SELECT curriculum_slug, chapter_slug,
               count(DISTINCT user_id) AS learners
        FROM content_visitors WHERE ${filter.sql}
        GROUP BY curriculum_slug, chapter_slug
      `).bind(...filter.values).all<{
        curriculum_slug: string;
        chapter_slug: string | null;
        learners: number;
      }>(),
      database.prepare(`
        SELECT curriculum_slug, chapter_slug, sum(view_count) AS views
        FROM content_impressions WHERE ${filter.sql}
        GROUP BY curriculum_slug, chapter_slug
      `).bind(...filter.values).all<{
        curriculum_slug: string;
        chapter_slug: string | null;
        views: number;
      }>(),
    ]);

  const result: PublicReachQuery = {
    learners: Number(overall?.learners ?? 0),
    curricula: {},
    chapters: {},
  };
  for (const row of curriculumLearners.results) {
    result.curricula[row.curriculum_slug] = {
      learners: Number(row.learners),
      views: 0,
    };
  }
  for (const row of resourceLearners.results) {
    if (!row.chapter_slug) continue;
    result.chapters[row.curriculum_slug] ??= {};
    result.chapters[row.curriculum_slug][row.chapter_slug] = {
      learners: Number(row.learners),
      views: 0,
    };
  }
  for (const row of resourceViews.results) {
    const views = Number(row.views);
    result.curricula[row.curriculum_slug] ??= { learners: 0, views: 0 };
    result.curricula[row.curriculum_slug].views += views;
    if (!row.chapter_slug) continue;
    result.chapters[row.curriculum_slug] ??= {};
    result.chapters[row.curriculum_slug][row.chapter_slug] ??= {
      learners: 0,
      views: 0,
    };
    result.chapters[row.curriculum_slug][row.chapter_slug].views += views;
  }
  return result;
}

export const recordCourseAccess = createServerFn({ method: "POST" })
  .validator(validateCourseAccessInput)
  .handler(async ({ data }) => {
    privateResponse();
    const currentUserId = await userId();
    const database = bindings().DB;
    if (!database) return { ok: false as const };
    const resourceKey = data.chapterSlug
      ? chapterPublicationKey(data.curriculumSlug, data.chapterSlug)
      : curriculumPublicationKey(data.curriculumSlug);
    if (!(await isPublicResourceAccessible(database, resourceKey))) {
      return { ok: false as const };
    }
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
  privateResponse();
  const database = bindings().DB;
  if (!database) return { learners: 0, views: 0, curricula: {} };
  try {
    const publication = await loadPublicationCatalog(database);
    if (!publication) return { learners: 0, views: 0, curricula: {} };
    const reach = await queryPublicReach(
      database,
      publicAnalyticsResources(publication),
    );
    return {
      learners: reach.learners,
      views: Object.values(reach.curricula).reduce(
        (total, curriculum) => total + curriculum.views,
        0,
      ),
      curricula: reach.curricula,
    };
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
    privateResponse();
    const database = bindings().DB;
    const empty = { curriculumSlug: data.curriculumSlug, learners: 0, views: 0, chapters: {} };
    if (!database) return empty;
    try {
      const publication = await loadPublicationCatalog(database);
      if (!publication) return empty;
      const resources = publicAnalyticsResources(
        publication,
        data.curriculumSlug,
      );
      if (!resources.length) return empty;
      const reach = await queryPublicReach(database, resources);
      const curriculum = reach.curricula[data.curriculumSlug];
      return {
        curriculumSlug: data.curriculumSlug,
        learners: curriculum?.learners ?? 0,
        views: curriculum?.views ?? 0,
        chapters: reach.chapters[data.curriculumSlug] ?? {},
      };
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
    const database = bindings().DB;
    if (!namespace || !database) return { ok: false as const, code: "unavailable" as const };
    if (!(await isPublicResourceAccessible(
      database,
      chapterPublicationKey(data.curriculumSlug, data.chapterSlug),
    ))) {
      return { ok: false as const, code: "unavailable" as const };
    }
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
    if (!(await isPublicResourceAccessible(
      database,
      chapterPublicationKey(data.curriculumSlug, data.chapterSlug),
    ))) {
      return { ok: false as const };
    }
    const now = Date.now();
    const session = await namespace.getByName(`${currentUserId}:${data.sessionId}`).heartbeat({
      userId: currentUserId,
      now,
      visible: true,
      active: true,
      context: {
        curriculumSlug: data.curriculumSlug,
        chapterSlug: data.chapterSlug,
      },
    });
    if (session.closed) return { ok: false as const };
    await touchPresence(currentUserId, now);
    for (const answer of data.answers) {
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
        answer.version, answer.selectedAnswer,
        answer.selectedAnswer === answer.correctAnswer ? 1 : 0, now,
        currentUserId, data.curriculumSlug, data.chapterSlug, answer.questionId,
        answer.version,
      ).run();
    }
    return { ok: true as const };
  });

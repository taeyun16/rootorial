import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import {
  and,
  asc,
  desc,
  eq,
  inArray,
  lt,
  notInArray,
  or,
  sql,
} from "drizzle-orm";
import { getDb } from "../../../db";
import {
  discussionAnswerLikes,
  discussionAnswers,
  discussionModerationEvents,
  discussionProfiles,
  discussionQuestions,
  discussionRateLimits,
  discussionUserBlocks,
  notificationDeliveries,
  systemEvents,
} from "../../../db/schema";
import { enqueueSystemEvent, systemEventRows, type SystemEventQueueBody } from "../system-events/system-events";
import {
  DISCUSSION_PAGE_SIZE,
  answerKindForUser,
  canBlockAuthor,
  canLikeAnswer,
  canReplyToDiscussionQuestion,
  getDiscussionCapabilities,
  isDiscussionAdmin,
  type DiscussionBlockList,
  type DiscussionMutationErrorCode,
  type DiscussionMutationResult,
  type DiscussionPostType,
  type DiscussionView,
  validateCreateAnswerInput,
  validateCreateQuestionInput,
  validateDeletePostInput,
  validateGetDiscussionInput,
  validateModeratePostInput,
  validateSetAnswerLikeInput,
  validateSetAuthorBlockInput,
  validateUpdateDiscussionProfileInput,
  validateUpdatePostInput,
} from "./discussion";

type DiscussionBindings = {
  DB?: D1Database;
  ROOTORIAL_ADMIN_USER_IDS?: string;
  SYSTEM_EVENTS_QUEUE?: Queue<SystemEventQueueBody>;
};

type DiscussionDb = ReturnType<typeof getDb>;

const DISCUSSION_UNAVAILABLE_MESSAGE =
  "토론 데이터베이스가 아직 연결되지 않았습니다.";
const PROFILE_REFRESH_INTERVAL_MS = 24 * 60 * 60 * 1_000;
const DISCUSSION_ANSWER_PAGE_LIMIT = 400;

function preventSharedCaching() {
  setResponseHeader("Cache-Control", "private, no-store");
}

function getBindings() {
  return env as unknown as DiscussionBindings;
}

function getDiscussionDb() {
  const database = getBindings().DB;
  return database ? getDb(database) : null;
}

function getConfiguredAdminUserIds() {
  return (
    getBindings().ROOTORIAL_ADMIN_USER_IDS ??
    process.env.ROOTORIAL_ADMIN_USER_IDS
  );
}

function unavailableView(
  reason: "not_configured" | "temporary" = "not_configured",
): DiscussionView {
  return {
    available: false,
    reason,
    message: DISCUSSION_UNAVAILABLE_MESSAGE,
  };
}

function blockToken(sourceType: DiscussionPostType, sourceId: string) {
  return `${sourceType}.${sourceId}`;
}

function sourceFromBlockToken(value: string) {
  const separator = value.indexOf(".");
  return {
    sourceType: value.slice(0, separator) as DiscussionPostType,
    sourceId: value.slice(separator + 1),
  };
}

function mutationFailure(
  code: DiscussionMutationErrorCode,
  message: string,
) {
  return { ok: false as const, code, message };
}

function reportDatabaseFailure(operation: string, _error: unknown) {
  // Drizzle errors may contain bound params, including private post bodies.
  // Log only a fixed operation label and never the error/message/cause/query.
  console.error(`[discussion:${operation}] database operation failed`);
}

async function getOptionalUserId() {
  try {
    const authState = await auth();
    return authState.userId ?? null;
  } catch {
    // Clerk is intentionally optional for local content-only development.
    return null;
  }
}

function normalizeDisplayName(
  nameParts: Array<string | null | undefined>,
  fallback: string | null | undefined,
) {
  const fullName = nameParts
    .map((part) => part?.trim() ?? "")
    .filter(Boolean)
    .join(" ")
    .trim();
  return (fullName || fallback?.trim() || "학습자").slice(0, 80);
}

async function ensureDiscussionProfile(db: DiscussionDb, userId: string) {
  const now = Date.now();
  const [existing] = await db
    .select()
    .from(discussionProfiles)
    .where(eq(discussionProfiles.userId, userId))
    .limit(1);

  if (existing && existing.updatedAt >= now - PROFILE_REFRESH_INTERVAL_MS) {
    return existing;
  }

  const profileIsConfigured = existing?.configuredAt != null;
  let displayName = existing?.displayName ?? "학습자";
  let imageUrl = existing?.imageUrl ?? null;

  try {
    const user = await clerkClient().users.getUser(userId);
    if (!profileIsConfigured) {
      displayName = normalizeDisplayName(
        [user.firstName, user.lastName],
        user.username,
      );
    }
    imageUrl = user.imageUrl || null;
  } catch {
    if (existing) return existing;
    console.warn("[discussion:profile] Clerk profile lookup failed");
  }

  await db
    .insert(discussionProfiles)
    .values({
      userId,
      displayName,
      imageUrl,
      imageVisible: existing?.imageVisible ?? false,
      configuredAt: existing?.configuredAt ?? null,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: discussionProfiles.userId,
      set: { displayName, imageUrl, updatedAt: now },
    });

  return {
    userId,
    displayName,
    imageUrl,
    imageVisible: existing?.imageVisible ?? false,
    configuredAt: existing?.configuredAt ?? null,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

function discussionProfileView(
  profile: Awaited<ReturnType<typeof ensureDiscussionProfile>>,
) {
  return {
    displayName: profile.displayName,
    imageUrl: profile.imageUrl,
    imageVisible: profile.imageVisible,
    configured: profile.configuredAt != null,
  };
}

type DiscussionWriteAction = "question" | "answer" | "social";

const postingLimits = {
  question: {
    burst: { durationMs: 10 * 60 * 1_000, limit: 5 },
    daily: { durationMs: 24 * 60 * 60 * 1_000, limit: 30 },
    total: 1_000,
  },
  answer: {
    burst: { durationMs: 10 * 60 * 1_000, limit: 20 },
    daily: { durationMs: 24 * 60 * 60 * 1_000, limit: 200 },
    total: 10_000,
  },
  social: {
    burst: { durationMs: 10 * 60 * 1_000, limit: 60 },
    daily: { durationMs: 24 * 60 * 60 * 1_000, limit: 500 },
  },
} as const;

async function claimPostingWindow(
  db: DiscussionDb,
  userId: string,
  action: DiscussionWriteAction,
  windowKind: "burst" | "daily",
  now: number,
) {
  const config = postingLimits[action][windowKind];
  const windowStart = Math.floor(now / config.durationMs) * config.durationMs;
  const key = `${userId}:${action}:${windowKind}:${windowStart}`;
  const rows = await db
    .insert(discussionRateLimits)
    .values({
      key,
      userId,
      action,
      windowKind,
      windowStart,
      count: 1,
    })
    .onConflictDoUpdate({
      target: discussionRateLimits.key,
      set: { count: sql`${discussionRateLimits.count} + 1` },
      setWhere: lt(discussionRateLimits.count, config.limit),
    })
    .returning({ count: discussionRateLimits.count });

  return rows.length === 1;
}

async function checkPostingLimit(
  db: DiscussionDb,
  userId: string,
  action: DiscussionWriteAction,
) {
  const config = postingLimits[action];
  if ("total" in config) {
    const [totalRow] = action === "question"
      ? await db
          .select({ value: sql<number>`count(*)`.mapWith(Number) })
          .from(discussionQuestions)
          .where(eq(discussionQuestions.authorUserId, userId))
      : await db
          .select({ value: sql<number>`count(*)`.mapWith(Number) })
          .from(discussionAnswers)
          .where(eq(discussionAnswers.authorUserId, userId));

    if ((totalRow?.value ?? 0) >= config.total) {
      return action === "question"
        ? "한 계정에서 등록할 수 있는 질문 수를 모두 사용했습니다."
        : "한 계정에서 등록할 수 있는 답변 수를 모두 사용했습니다.";
    }
  }

  const now = Date.now();
  if (!await claimPostingWindow(db, userId, action, "burst", now)) {
    return "짧은 시간에 글을 너무 많이 등록했습니다. 잠시 뒤 다시 시도해 주세요.";
  }
  if (!await claimPostingWindow(db, userId, action, "daily", now)) {
    return "오늘 등록할 수 있는 글 수를 모두 사용했습니다. 내일 다시 시도해 주세요.";
  }

  return null;
}

async function cleanupPostingWindows(db: DiscussionDb) {
  const cutoff = Date.now() - 2 * 24 * 60 * 60 * 1_000;
  try {
    await db
      .delete(discussionRateLimits)
      .where(lt(discussionRateLimits.windowStart, cutoff));
  } catch {
    reportDatabaseFailure("rate-limit-cleanup", null);
  }
}

export const getDiscussion = createServerFn({ method: "GET" })
  .validator(validateGetDiscussionInput)
  .handler(async ({ data }): Promise<DiscussionView> => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) return unavailableView();

    try {
      const viewerUserId = await getOptionalUserId();
      const viewerProfile = viewerUserId
        ? await ensureDiscussionProfile(db, viewerUserId)
        : null;
      const configuredAdminUserIds = getConfiguredAdminUserIds();
      const viewerIsAdmin = isDiscussionAdmin(
        viewerUserId,
        configuredAdminUserIds,
      );

      const blockedUserIds = new Set<string>();
      if (viewerUserId && !viewerIsAdmin) {
        const blocks = await db
          .select({ blockedUserId: discussionUserBlocks.blockedUserId })
          .from(discussionUserBlocks)
          .where(eq(discussionUserBlocks.blockerUserId, viewerUserId));
        for (const block of blocks) {
          if (!isDiscussionAdmin(block.blockedUserId, configuredAdminUserIds)) {
            blockedUserIds.add(block.blockedUserId);
          }
        }
      }

      const blocked = [...blockedUserIds];
      const visibleQuestionCondition = viewerIsAdmin
        ? inArray(discussionQuestions.state, [
            "visible",
            "hidden",
            "deleted",
          ])
        : or(
            eq(discussionQuestions.state, "visible"),
            and(
              eq(discussionQuestions.state, "deleted"),
              sql<boolean>`exists (
                select 1
                from discussion_answers as visible_answer
                where visible_answer.question_id = ${discussionQuestions.id}
                  and visible_answer.state = 'visible'
              )`,
            ),
          );
      const cursorCondition = data.cursor
        ? or(
            lt(discussionQuestions.createdAt, data.cursor.createdAt),
            and(
              eq(discussionQuestions.createdAt, data.cursor.createdAt),
              lt(discussionQuestions.id, data.cursor.id),
            ),
          )
        : undefined;

      const questionRows = await db
        .select({
          id: discussionQuestions.id,
          body: discussionQuestions.body,
          state: discussionQuestions.state,
          authorUserId: discussionQuestions.authorUserId,
          authorDisplayName: discussionProfiles.displayName,
          authorImageUrl: discussionProfiles.imageUrl,
          authorImageVisible: discussionProfiles.imageVisible,
          authorConfiguredAt: discussionProfiles.configuredAt,
          createdAt: discussionQuestions.createdAt,
          updatedAt: discussionQuestions.updatedAt,
          moderationReason: discussionQuestions.moderationReason,
        })
        .from(discussionQuestions)
        .innerJoin(
          discussionProfiles,
          eq(discussionQuestions.authorUserId, discussionProfiles.userId),
        )
        .where(
          and(
            eq(discussionQuestions.scopeId, data.scopeId),
            visibleQuestionCondition,
            cursorCondition,
            blocked.length
              ? notInArray(discussionQuestions.authorUserId, blocked)
              : undefined,
          ),
        )
        .orderBy(
          desc(discussionQuestions.createdAt),
          desc(discussionQuestions.id),
        )
        .limit(DISCUSSION_PAGE_SIZE + 1);

      const hasNextPage = questionRows.length > DISCUSSION_PAGE_SIZE;
      const pageQuestionRows = questionRows.slice(0, DISCUSSION_PAGE_SIZE);
      const questionIds = pageQuestionRows.map((question) => question.id);

      const fetchedAnswerRows = questionIds.length
        ? await db
            .select({
              id: discussionAnswers.id,
              questionId: discussionAnswers.questionId,
              body: discussionAnswers.body,
              kind: discussionAnswers.kind,
              state: discussionAnswers.state,
              authorUserId: discussionAnswers.authorUserId,
              authorDisplayName: discussionProfiles.displayName,
              authorImageUrl: discussionProfiles.imageUrl,
              authorImageVisible: discussionProfiles.imageVisible,
              authorConfiguredAt: discussionProfiles.configuredAt,
              createdAt: discussionAnswers.createdAt,
              updatedAt: discussionAnswers.updatedAt,
              moderationReason: discussionAnswers.moderationReason,
            })
            .from(discussionAnswers)
            .innerJoin(
              discussionProfiles,
              eq(discussionAnswers.authorUserId, discussionProfiles.userId),
            )
            .where(
              and(
                inArray(discussionAnswers.questionId, questionIds),
                viewerIsAdmin
                  ? inArray(discussionAnswers.state, ["visible", "hidden", "deleted"])
                  : inArray(discussionAnswers.state, ["visible", "deleted"]),
                blocked.length
                  ? notInArray(discussionAnswers.authorUserId, blocked)
                  : undefined,
              ),
            )
            .orderBy(
              asc(discussionAnswers.createdAt),
              asc(discussionAnswers.id),
            )
            .limit(DISCUSSION_ANSWER_PAGE_LIMIT + 1)
        : [];
      const answersTruncated =
        fetchedAnswerRows.length > DISCUSSION_ANSWER_PAGE_LIMIT;
      const answerRows = fetchedAnswerRows.slice(
        0,
        DISCUSSION_ANSWER_PAGE_LIMIT,
      );

      const answerIds = answerRows.map((answer) => answer.id);
      const likeCounts = answerIds.length
        ? await db
            .select({
              answerId: discussionAnswerLikes.answerId,
              count: sql<number>`count(*)`.mapWith(Number),
            })
            .from(discussionAnswerLikes)
            .where(inArray(discussionAnswerLikes.answerId, answerIds))
            .groupBy(discussionAnswerLikes.answerId)
        : [];
      const likedRows = viewerUserId && answerIds.length
        ? await db
            .select({ answerId: discussionAnswerLikes.answerId })
            .from(discussionAnswerLikes)
            .where(
              and(
                eq(discussionAnswerLikes.userId, viewerUserId),
                inArray(discussionAnswerLikes.answerId, answerIds),
              ),
            )
        : [];

      const likeCountByAnswer = new Map(
        likeCounts.map((like) => [like.answerId, like.count]),
      );
      const likedAnswerIds = new Set(likedRows.map((like) => like.answerId));
      const answersByQuestion = new Map<
        string,
        Extract<DiscussionView, { available: true }>["questions"][number]["answers"]
      >();

      for (const answer of answerRows) {
        const answers = answersByQuestion.get(answer.questionId) ?? [];
        answers.push({
          id: answer.id,
          body: answer.body,
          kind: answer.kind,
          state: answer.state,
          createdAt: answer.createdAt,
          updatedAt: answer.updatedAt,
          moderationReason: viewerIsAdmin ? answer.moderationReason : null,
          author: {
            displayName:
              answer.authorConfiguredAt == null
                ? "학습자"
                : answer.authorDisplayName,
            imageUrl:
              answer.authorConfiguredAt != null && answer.authorImageVisible
                ? answer.authorImageUrl
                : null,
          },
          capabilities: getDiscussionCapabilities(
            viewerUserId,
            answer.authorUserId,
            answer.state,
            configuredAdminUserIds,
          ),
          likeCount: likeCountByAnswer.get(answer.id) ?? 0,
          likedByMe: likedAnswerIds.has(answer.id),
          canLike: canLikeAnswer(
            viewerUserId,
            answer.authorUserId,
            answer.state,
          ),
          canBlockAuthor:
            answer.state === "visible" &&
            canBlockAuthor(
              viewerUserId,
              answer.authorUserId,
              configuredAdminUserIds,
            ),
        });
        answersByQuestion.set(answer.questionId, answers);
      }

      const questions = pageQuestionRows
        .map((question) => ({
          id: question.id,
          body: question.body,
          state: question.state,
          createdAt: question.createdAt,
          updatedAt: question.updatedAt,
          moderationReason: viewerIsAdmin ? question.moderationReason : null,
          author: {
            displayName:
              question.authorConfiguredAt == null
                ? "학습자"
                : question.authorDisplayName,
            imageUrl:
              question.authorConfiguredAt != null &&
              question.authorImageVisible
                ? question.authorImageUrl
                : null,
          },
          capabilities: getDiscussionCapabilities(
            viewerUserId,
            question.authorUserId,
            question.state,
            configuredAdminUserIds,
          ),
          canBlockAuthor:
            question.state === "visible" &&
            canBlockAuthor(
              viewerUserId,
              question.authorUserId,
              configuredAdminUserIds,
            ),
          answers: answersByQuestion.get(question.id) ?? [],
        }))
        .filter(
          (question) =>
            question.state !== "deleted" || question.answers.length > 0,
        );

      const lastQuestion = pageQuestionRows.at(-1);
      return {
        available: true,
        scopeId: data.scopeId,
        viewer: {
          signedIn: Boolean(viewerUserId),
          isAdmin: viewerIsAdmin,
          profile: viewerProfile ? discussionProfileView(viewerProfile) : null,
        },
        questions,
        answersTruncated,
        nextCursor:
          hasNextPage && lastQuestion
            ? { createdAt: lastQuestion.createdAt, id: lastQuestion.id }
            : null,
      };
    } catch (error) {
      reportDatabaseFailure("get", error);
      return unavailableView("temporary");
    }
  });

export const getMyDiscussionBlocks = createServerFn({ method: "GET" }).handler(
  async (): Promise<DiscussionBlockList> => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return {
        available: false,
        reason: "not_configured",
        message: DISCUSSION_UNAVAILABLE_MESSAGE,
      };
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return {
        available: false,
        reason: "unauthorized",
        message: "로그인이 필요합니다.",
      };
    }

    try {
      const rows = await db
        .select({
          blockedUserId: discussionUserBlocks.blockedUserId,
          createdAt: discussionUserBlocks.createdAt,
          displayName: discussionProfiles.displayName,
          imageUrl: discussionProfiles.imageUrl,
          imageVisible: discussionProfiles.imageVisible,
          configuredAt: discussionProfiles.configuredAt,
        })
        .from(discussionUserBlocks)
        .innerJoin(
          discussionProfiles,
          eq(discussionUserBlocks.blockedUserId, discussionProfiles.userId),
        )
        .where(eq(discussionUserBlocks.blockerUserId, userId))
        .orderBy(desc(discussionUserBlocks.createdAt))
        .limit(50);

      const blocks: Extract<DiscussionBlockList, { available: true }>["blocks"] = [];
      for (const row of rows) {
        const [question] = await db
          .select({ id: discussionQuestions.id })
          .from(discussionQuestions)
          .where(eq(discussionQuestions.authorUserId, row.blockedUserId))
          .orderBy(desc(discussionQuestions.createdAt))
          .limit(1);
        const [answer] = question
          ? []
          : await db
              .select({ id: discussionAnswers.id })
              .from(discussionAnswers)
              .where(eq(discussionAnswers.authorUserId, row.blockedUserId))
              .orderBy(desc(discussionAnswers.createdAt))
              .limit(1);
        const sourceType: DiscussionPostType = question ? "question" : "answer";
        const sourceId = question?.id ?? answer?.id;
        if (!sourceId) continue;

        blocks.push({
          blockToken: blockToken(sourceType, sourceId),
          author: {
            displayName: row.configuredAt == null ? "학습자" : row.displayName,
            imageUrl:
              row.configuredAt != null && row.imageVisible
                ? row.imageUrl
                : null,
          },
          createdAt: row.createdAt,
        });
      }

      return { available: true, blocks };
    } catch (error) {
      reportDatabaseFailure("get-blocks", error);
      return {
        available: false,
        reason: "temporary",
        message: "차단 목록을 불러오지 못했습니다.",
      };
    }
  },
);

export const updateDiscussionProfile = createServerFn({ method: "POST" })
  .validator(validateUpdateDiscussionProfileInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      const existing = await ensureDiscussionProfile(db, userId);
      const now = Date.now();
      await db
        .update(discussionProfiles)
        .set({
          displayName: data.displayName,
          imageVisible: data.imageVisible,
          configuredAt: existing.configuredAt ?? now,
          updatedAt: now,
        })
        .where(eq(discussionProfiles.userId, userId));

      return {
        ok: true as const,
        profile: {
          displayName: data.displayName,
          imageUrl: existing.imageUrl,
          imageVisible: data.imageVisible,
          configured: true,
        },
      };
    } catch (error) {
      reportDatabaseFailure("update-profile", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const createQuestion = createServerFn({ method: "POST" })
  .validator(validateCreateQuestionInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      const profile = await ensureDiscussionProfile(db, userId);
      if (profile.configuredAt == null) {
        return mutationFailure(
          "profile_required",
          "질문을 등록하기 전에 공개 프로필을 설정해 주세요.",
        );
      }
      const limitMessage = await checkPostingLimit(db, userId, "question");
      if (limitMessage) {
        return mutationFailure("rate_limited", limitMessage);
      }
      const id = crypto.randomUUID();
      const now = Date.now();
      const systemEvent = systemEventRows({
        type: "discussion.question.created",
        actorUserId: userId,
        entityId: id,
        payload: { scopeId: data.scopeId },
        createdAt: now,
      });
      await db.batch([db.insert(discussionQuestions).values({
        id,
        scopeId: data.scopeId,
        authorUserId: userId,
        body: data.body,
        state: "visible",
        createdAt: now,
        updatedAt: now,
      }), db.insert(systemEvents).values(systemEvent.event), db.insert(notificationDeliveries).values(systemEvent.delivery)]);
      await enqueueSystemEvent(
        getBindings().DB!,
        getBindings().SYSTEM_EVENTS_QUEUE,
        systemEvent.event.id,
      );
      await cleanupPostingWindows(db);

      return { ok: true as const, questionId: id };
    } catch (error) {
      reportDatabaseFailure("create-question", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const createAnswer = createServerFn({ method: "POST" })
  .validator(validateCreateAnswerInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      const profile = await ensureDiscussionProfile(db, userId);
      if (profile.configuredAt == null) {
        return mutationFailure(
          "profile_required",
          "답변을 등록하기 전에 공개 프로필을 설정해 주세요.",
        );
      }
      const limitMessage = await checkPostingLimit(db, userId, "answer");
      if (limitMessage) {
        return mutationFailure("rate_limited", limitMessage);
      }
      const [question] = await db
        .select({
          scopeId: discussionQuestions.scopeId,
          state: discussionQuestions.state,
        })
        .from(discussionQuestions)
        .where(eq(discussionQuestions.id, data.questionId))
        .limit(1);
      if (!question) {
        return mutationFailure("not_found", "질문을 찾을 수 없습니다.");
      }
      if (!canReplyToDiscussionQuestion(question.scopeId, question.state)) {
        return mutationFailure(
          "conflict",
          "현재 이 질문에는 답변을 남길 수 없습니다.",
        );
      }

      const id = crypto.randomUUID();
      const now = Date.now();
      const kind = answerKindForUser(userId, getConfiguredAdminUserIds());
      await db.insert(discussionAnswers).values({
        id,
        questionId: data.questionId,
        authorUserId: userId,
        kind,
        body: data.body,
        state: "visible",
        createdAt: now,
        updatedAt: now,
      });
      await cleanupPostingWindows(db);

      return { ok: true as const, answerId: id, kind };
    } catch (error) {
      reportDatabaseFailure("create-answer", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const updatePost = createServerFn({ method: "POST" })
  .validator(validateUpdatePostInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      const [target] = data.targetType === "question"
        ? await db
            .select({
              authorUserId: discussionQuestions.authorUserId,
              state: discussionQuestions.state,
            })
            .from(discussionQuestions)
            .where(eq(discussionQuestions.id, data.targetId))
            .limit(1)
        : await db
            .select({
              authorUserId: discussionAnswers.authorUserId,
              state: discussionAnswers.state,
            })
            .from(discussionAnswers)
            .where(eq(discussionAnswers.id, data.targetId))
            .limit(1);

      if (!target) return mutationFailure("not_found", "글을 찾을 수 없습니다.");
      if (target.authorUserId !== userId) {
        return mutationFailure("forbidden", "내가 작성한 글만 수정할 수 있습니다.");
      }
      if (target.state !== "visible") {
        return mutationFailure("conflict", "현재 이 글은 수정할 수 없습니다.");
      }

      const updatedAt = Date.now();
      if (data.targetType === "question") {
        await db
          .update(discussionQuestions)
          .set({ body: data.body, updatedAt })
          .where(eq(discussionQuestions.id, data.targetId));
      } else {
        await db
          .update(discussionAnswers)
          .set({ body: data.body, updatedAt })
          .where(eq(discussionAnswers.id, data.targetId));
      }

      return { ok: true as const, body: data.body, updatedAt };
    } catch (error) {
      reportDatabaseFailure("update-post", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const deletePost = createServerFn({ method: "POST" })
  .validator(validateDeletePostInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      const [target] = data.targetType === "question"
        ? await db
            .select({
              authorUserId: discussionQuestions.authorUserId,
              state: discussionQuestions.state,
            })
            .from(discussionQuestions)
            .where(eq(discussionQuestions.id, data.targetId))
            .limit(1)
        : await db
            .select({
              authorUserId: discussionAnswers.authorUserId,
              state: discussionAnswers.state,
            })
            .from(discussionAnswers)
            .where(eq(discussionAnswers.id, data.targetId))
            .limit(1);

      if (!target) return mutationFailure("not_found", "글을 찾을 수 없습니다.");
      if (target.authorUserId !== userId) {
        return mutationFailure("forbidden", "내가 작성한 글만 삭제할 수 있습니다.");
      }
      if (target.state !== "visible") {
        return mutationFailure("conflict", "현재 이 글은 삭제할 수 없습니다.");
      }

      const updatedAt = Date.now();
      const deletedValues = {
        body: "",
        state: "deleted" as const,
        updatedAt,
        moderatedByUserId: null,
        moderatedAt: null,
        moderationReason: null,
      };
      if (data.targetType === "question") {
        await db
          .update(discussionQuestions)
          .set(deletedValues)
          .where(eq(discussionQuestions.id, data.targetId));
      } else {
        await db
          .update(discussionAnswers)
          .set(deletedValues)
          .where(eq(discussionAnswers.id, data.targetId));
      }

      return { ok: true as const, state: "deleted" as const, updatedAt };
    } catch (error) {
      reportDatabaseFailure("delete-post", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const setAnswerLike = createServerFn({ method: "POST" })
  .validator(validateSetAnswerLikeInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      await ensureDiscussionProfile(db, userId);
      const limitMessage = await checkPostingLimit(db, userId, "social");
      if (limitMessage) {
        return mutationFailure("rate_limited", limitMessage);
      }
      const [answer] = await db
        .select({
          authorUserId: discussionAnswers.authorUserId,
          state: discussionAnswers.state,
        })
        .from(discussionAnswers)
        .where(eq(discussionAnswers.id, data.answerId))
        .limit(1);
      if (!answer) {
        return mutationFailure("not_found", "답변을 찾을 수 없습니다.");
      }
      if (!canLikeAnswer(userId, answer.authorUserId, answer.state)) {
        return mutationFailure(
          answer.state === "visible" ? "forbidden" : "conflict",
          answer.state === "visible"
            ? "내 답변에는 좋아요를 누를 수 없습니다."
            : "현재 이 답변에는 좋아요를 누를 수 없습니다.",
        );
      }

      const [existingLike] = await db
        .select({ answerId: discussionAnswerLikes.answerId })
        .from(discussionAnswerLikes)
        .where(
          and(
            eq(discussionAnswerLikes.answerId, data.answerId),
            eq(discussionAnswerLikes.userId, userId),
          ),
        )
        .limit(1);
      if (Boolean(existingLike) === data.liked) {
        const [currentCount] = await db
          .select({ value: sql<number>`count(*)`.mapWith(Number) })
          .from(discussionAnswerLikes)
          .where(eq(discussionAnswerLikes.answerId, data.answerId));
        return {
          ok: true as const,
          answerId: data.answerId,
          liked: data.liked,
          likeCount: currentCount?.value ?? 0,
          changed: false,
        };
      }

      if (data.liked) {
        await db
          .insert(discussionAnswerLikes)
          .values({
            answerId: data.answerId,
            userId,
            createdAt: Date.now(),
          })
          .onConflictDoNothing();
      } else {
        await db
          .delete(discussionAnswerLikes)
          .where(
            and(
              eq(discussionAnswerLikes.answerId, data.answerId),
              eq(discussionAnswerLikes.userId, userId),
            ),
          );
      }

      const [count] = await db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(discussionAnswerLikes)
        .where(eq(discussionAnswerLikes.answerId, data.answerId));
      await cleanupPostingWindows(db);

      return {
        ok: true as const,
        answerId: data.answerId,
        liked: data.liked,
        likeCount: count?.value ?? 0,
        changed: true,
      };
    } catch (error) {
      reportDatabaseFailure("set-like", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const setAuthorBlock = createServerFn({ method: "POST" })
  .validator(validateSetAuthorBlockInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }

    try {
      await ensureDiscussionProfile(db, userId);
      const limitMessage = await checkPostingLimit(db, userId, "social");
      if (limitMessage) {
        return mutationFailure("rate_limited", limitMessage);
      }
      const sourceInput: { sourceType: DiscussionPostType; sourceId: string } =
        "blockToken" in data
          ? sourceFromBlockToken(data.blockToken as string)
          : {
              sourceType: data.sourceType as DiscussionPostType,
              sourceId: data.sourceId as string,
            };
      const [source] = sourceInput.sourceType === "question"
        ? await db
            .select({ authorUserId: discussionQuestions.authorUserId })
            .from(discussionQuestions)
            .where(eq(discussionQuestions.id, sourceInput.sourceId))
            .limit(1)
        : await db
            .select({ authorUserId: discussionAnswers.authorUserId })
            .from(discussionAnswers)
            .where(eq(discussionAnswers.id, sourceInput.sourceId))
            .limit(1);

      if (!source) {
        return mutationFailure("not_found", "작성자를 찾을 수 없습니다.");
      }
      if (
        data.blocked &&
        !canBlockAuthor(
          userId,
          source.authorUserId,
          getConfiguredAdminUserIds(),
        )
      ) {
        return mutationFailure(
          "forbidden",
          userId === source.authorUserId
            ? "나 자신은 차단할 수 없습니다."
            : "관리자 답변은 차단할 수 없습니다.",
        );
      }

      const [existingBlock] = await db
        .select({ blockedUserId: discussionUserBlocks.blockedUserId })
        .from(discussionUserBlocks)
        .where(
          and(
            eq(discussionUserBlocks.blockerUserId, userId),
            eq(discussionUserBlocks.blockedUserId, source.authorUserId),
          ),
        )
        .limit(1);
      if (Boolean(existingBlock) === data.blocked) {
        return {
          ok: true as const,
          blocked: data.blocked,
          blockToken: blockToken(sourceInput.sourceType, sourceInput.sourceId),
          changed: false,
        };
      }

      if (data.blocked) {
        await db
          .insert(discussionUserBlocks)
          .values({
            blockerUserId: userId,
            blockedUserId: source.authorUserId,
            createdAt: Date.now(),
          })
          .onConflictDoNothing();
      } else {
        await db
          .delete(discussionUserBlocks)
          .where(
            and(
              eq(discussionUserBlocks.blockerUserId, userId),
              eq(discussionUserBlocks.blockedUserId, source.authorUserId),
            ),
          );
      }
      await cleanupPostingWindows(db);

      return {
        ok: true as const,
        blocked: data.blocked,
        blockToken: blockToken(sourceInput.sourceType, sourceInput.sourceId),
        changed: true,
      };
    } catch (error) {
      reportDatabaseFailure("set-block", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

export const moderatePost = createServerFn({ method: "POST" })
  .validator(validateModeratePostInput)
  .handler(async ({ data }) => {
    preventSharedCaching();

    const db = getDiscussionDb();
    if (!db) {
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }

    const userId = await getOptionalUserId();
    if (!userId) {
      return mutationFailure("unauthorized", "로그인이 필요합니다.");
    }
    if (!isDiscussionAdmin(userId, getConfiguredAdminUserIds())) {
      return mutationFailure("forbidden", "관리자 권한이 필요합니다.");
    }

    try {
      const [target] = data.targetType === "question"
        ? await db
            .select({ state: discussionQuestions.state })
            .from(discussionQuestions)
            .where(eq(discussionQuestions.id, data.targetId))
            .limit(1)
        : await db
            .select({ state: discussionAnswers.state })
            .from(discussionAnswers)
            .where(eq(discussionAnswers.id, data.targetId))
            .limit(1);

      if (!target) {
        return mutationFailure("not_found", "관리할 항목을 찾을 수 없습니다.");
      }
      if (target.state === "deleted") {
        return mutationFailure(
          "conflict",
          "작성자가 삭제한 항목은 복원하거나 숨길 수 없습니다.",
        );
      }

      const nextState = data.action === "hide" ? "hidden" : "visible";
      if (target.state === nextState) {
        return { ok: true as const, state: nextState, changed: false };
      }

      await ensureDiscussionProfile(db, userId);
      const now = Date.now();
      const moderationValues = data.action === "hide"
        ? {
            state: "hidden" as const,
            moderatedByUserId: userId,
            moderatedAt: now,
            moderationReason: data.reason,
            updatedAt: now,
          }
        : {
            state: "visible" as const,
            moderatedByUserId: null,
            moderatedAt: null,
            moderationReason: null,
            updatedAt: now,
          };

      const updateTarget = data.targetType === "question"
        ? db
            .update(discussionQuestions)
            .set(moderationValues)
            .where(eq(discussionQuestions.id, data.targetId))
        : db
            .update(discussionAnswers)
            .set(moderationValues)
            .where(eq(discussionAnswers.id, data.targetId));
      const insertEvent = db.insert(discussionModerationEvents).values({
        id: crypto.randomUUID(),
        actorUserId: userId,
        targetType: data.targetType,
        targetId: data.targetId,
        action: data.action,
        reason: data.reason,
        createdAt: now,
      });

      await db.batch([updateTarget, insertEvent]);
      return { ok: true as const, state: nextState, changed: true };
    } catch (error) {
      reportDatabaseFailure("moderate", error);
      return mutationFailure("unavailable", DISCUSSION_UNAVAILABLE_MESSAGE);
    }
  });

// Keeps the generic result contract import live for consumers that infer server
// function return values from this module without importing implementation types.
export type { DiscussionMutationResult };

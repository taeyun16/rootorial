import { auth } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { env } from "cloudflare:workers";
import { and, eq, gte, sql } from "drizzle-orm";
import { getDb } from "../../../db";
import { contentFeedback } from "../../../db/schema";
import {
  type SubmitFeedbackResult,
  validateSubmitFeedbackInput,
} from "./feedback";

type FeedbackBindings = { DB?: D1Database };

const DAILY_FEEDBACK_LIMIT = 10;

export const submitContentFeedback = createServerFn({ method: "POST" })
  .validator(validateSubmitFeedbackInput)
  .handler(async ({ data }): Promise<SubmitFeedbackResult> => {
    let userId: string | null = null;
    try {
      userId = (await auth()).userId;
    } catch {
      // Clerk can be intentionally disabled for content-only local development.
    }

    if (!userId) {
      return {
        ok: false,
        code: "unauthorized",
        message: "피드백을 보내려면 먼저 가입하거나 로그인해 주세요.",
      };
    }

    const database = (env as unknown as FeedbackBindings).DB;
    if (!database) {
      return {
        ok: false,
        code: "unavailable",
        message: "피드백 저장소를 준비하고 있습니다. 잠시 뒤 다시 시도해 주세요.",
      };
    }

    try {
      const db = getDb(database);
      const dayAgo = Date.now() - 24 * 60 * 60 * 1_000;
      const [countRow] = await db
        .select({ value: sql<number>`count(*)`.mapWith(Number) })
        .from(contentFeedback)
        .where(and(
          eq(contentFeedback.authorUserId, userId),
          gte(contentFeedback.createdAt, dayAgo),
        ));

      if ((countRow?.value ?? 0) >= DAILY_FEEDBACK_LIMIT) {
        return {
          ok: false,
          code: "rate_limited",
          message: "오늘 보낼 수 있는 피드백을 모두 사용했습니다. 내일 다시 보내 주세요.",
        };
      }

      const feedbackId = crypto.randomUUID();
      await db.insert(contentFeedback).values({
        id: feedbackId,
        authorUserId: userId,
        kind: data.kind,
        message: data.message,
        pagePath: data.pagePath,
        pageTitle: data.pageTitle,
        createdAt: Date.now(),
      });

      return { ok: true, feedbackId };
    } catch {
      console.error("[feedback:create] database operation failed");
      return {
        ok: false,
        code: "unavailable",
        message: "피드백을 저장하지 못했습니다. 잠시 뒤 다시 시도해 주세요.",
      };
    }
  });

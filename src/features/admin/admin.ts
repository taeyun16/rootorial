export type FeedbackStatus = "pending" | "reviewing" | "resolved";

export type AdminDashboard =
  | { available: false; reason: "unauthorized" | "forbidden" | "unavailable"; message: string }
  | {
      available: true;
      generatedAt: number;
      metrics: {
        learners: number;
        questions: number;
        answers: number;
        feedbackTotal: number;
        feedbackPending: number;
        activity7d: number;
        notificationPending: number;
        notificationDead: number;
      };
      feedbackByKind: Record<"incorrect" | "confusing" | "suggestion", number>;
      dailyActivity: Array<{ date: string; questions: number; answers: number; feedback: number }>;
      learning: {
        windowDays: number;
        onlineLearners: number;
        courseVisitors: number;
        courseVisitors30d: number;
        sessions: number;
        learners: number;
        averageDwellSeconds: number;
        averageActiveSeconds: number;
        activeRatio: number;
        firstAttemptAccuracy: number;
        eventualMasteryRate: number;
        contentReach: Array<{
          path: string;
          curriculumSlug: string;
          chapterSlug: string | null;
          views: number;
          signedInViews: number;
          learners: number;
        }>;
        questionStats: Array<{
          curriculumSlug: string;
          chapterSlug: string;
          questionId: string;
          questionVersion: number;
          label: string;
          attempts: number;
          learners: number;
          firstAttemptAccuracy: number;
          overallAccuracy: number;
        }>;
      };
      systemEvents: Array<{
        id: string;
        type: "feedback.created" | "discussion.question.created" | "user.created";
        entityId: string;
        status: "pending" | "queued" | "delivered" | "dead";
        attemptCount: number;
        lastErrorCode: string | null;
        createdAt: number;
        deliveredAt: number | null;
      }>;
      feedback: Array<{
        id: string;
        authorUserId: string;
        kind: "incorrect" | "confusing" | "suggestion";
        message: string;
        pagePath: string;
        pageTitle: string;
        status: FeedbackStatus;
        adminNote: string | null;
        reviewedByUserId: string | null;
        reviewedAt: number | null;
        createdAt: number;
      }>;
    };

export function validateUpdateFeedbackInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("피드백 처리 정보를 확인해 주세요.");
  }
  const input = value as Record<string, unknown>;
  if (typeof input.id !== "string" || !/^[0-9a-f-]{36}$/i.test(input.id)) {
    throw new Error("피드백을 찾을 수 없습니다.");
  }
  if (input.status !== "pending" && input.status !== "reviewing" && input.status !== "resolved") {
    throw new Error("처리 상태를 확인해 주세요.");
  }
  if (typeof input.adminNote !== "string" || input.adminNote.trim().length > 1000) {
    throw new Error("관리자 메모는 1,000자 이내로 입력해 주세요.");
  }
  return {
    id: input.id,
    status: input.status as FeedbackStatus,
    adminNote: input.adminNote.trim() || null,
  };
}

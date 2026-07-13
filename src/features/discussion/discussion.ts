import {
  isActiveDiscussionScopeId,
  isDiscussionScopeId,
  type ActiveDiscussionScopeId,
  type DiscussionScopeId,
} from "../../data/discussionScopes.ts";

export const QUESTION_BODY_MAX_LENGTH = 2_000;
export const ANSWER_BODY_MAX_LENGTH = 4_000;
export const MODERATION_REASON_MAX_LENGTH = 500;
export const DISPLAY_NAME_MIN_LENGTH = 2;
export const DISPLAY_NAME_MAX_LENGTH = 24;
export const DISCUSSION_PAGE_SIZE = 20;

export type DiscussionPostState = "visible" | "hidden" | "deleted";
export type DiscussionPostType = "question" | "answer";
export type DiscussionAnswerKind = "community" | "official";
export type DiscussionModerationAction = "hide" | "restore";
export type DiscussionUnavailableReason =
  | "not_configured"
  | "temporary"
  | "content_unavailable";

export type DiscussionAuthorView = {
  displayName: string;
  imageUrl: string | null;
};

export type DiscussionProfileView = DiscussionAuthorView & {
  configured: boolean;
  imageVisible: boolean;
};

export type DiscussionCapabilities = {
  canEdit: boolean;
  canDelete: boolean;
  canModerate: boolean;
};

export type DiscussionAnswerView = {
  id: string;
  body: string;
  kind: DiscussionAnswerKind;
  state: DiscussionPostState;
  createdAt: number;
  updatedAt: number;
  moderationReason: string | null;
  author: DiscussionAuthorView;
  capabilities: DiscussionCapabilities;
  likeCount: number;
  likedByMe: boolean;
  canLike: boolean;
  canBlockAuthor: boolean;
};

export type DiscussionQuestionView = {
  id: string;
  body: string;
  state: DiscussionPostState;
  createdAt: number;
  updatedAt: number;
  moderationReason: string | null;
  author: DiscussionAuthorView;
  capabilities: DiscussionCapabilities;
  canBlockAuthor: boolean;
  answers: DiscussionAnswerView[];
};

export type DiscussionView =
  | {
      available: false;
      reason: DiscussionUnavailableReason;
      message: string;
    }
  | {
      available: true;
      scopeId: DiscussionScopeId;
      viewer: {
        signedIn: boolean;
        isAdmin: boolean;
        profile: DiscussionProfileView | null;
      };
      questions: DiscussionQuestionView[];
      answersTruncated: boolean;
      nextCursor: DiscussionCursor | null;
    };

export type DiscussionBlockView = {
  blockToken: string;
  author: DiscussionAuthorView;
  createdAt: number;
};

export type DiscussionBlockList =
  | {
      available: false;
      reason: DiscussionUnavailableReason | "unauthorized";
      message: string;
    }
  | {
      available: true;
      blocks: DiscussionBlockView[];
    };

export type DiscussionMutationErrorCode =
  | "unavailable"
  | "unauthorized"
  | "profile_required"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "rate_limited";

export type DiscussionMutationResult<T extends Record<string, unknown>> =
  | ({ ok: true } & T)
  | {
      ok: false;
      code: DiscussionMutationErrorCode;
      message: string;
    };

export class DiscussionValidationError extends Error {
  readonly code = "invalid_input";

  constructor(message: string) {
    super(message);
    this.name = "DiscussionValidationError";
  }
}

function readRecord(value: unknown, message: string): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new DiscussionValidationError(message);
  }

  return value as Record<string, unknown>;
}

function readBoolean(value: unknown, message: string) {
  if (typeof value !== "boolean") {
    throw new DiscussionValidationError(message);
  }

  return value;
}

export function validateDisplayName(value: unknown) {
  if (typeof value !== "string") {
    throw new DiscussionValidationError("공개 닉네임을 입력해 주세요.");
  }

  const displayName = value.trim().replace(/\s+/g, " ");
  if (
    displayName.length < DISPLAY_NAME_MIN_LENGTH ||
    displayName.length > DISPLAY_NAME_MAX_LENGTH
  ) {
    throw new DiscussionValidationError(
      `공개 닉네임은 ${DISPLAY_NAME_MIN_LENGTH}~${DISPLAY_NAME_MAX_LENGTH}자로 입력해 주세요.`,
    );
  }
  if (/\p{Cc}/u.test(displayName)) {
    throw new DiscussionValidationError("공개 닉네임에 제어 문자를 사용할 수 없습니다.");
  }

  return displayName;
}

export function validateUpdateDiscussionProfileInput(value: unknown) {
  const input = readRecord(value, "공개 프로필 정보가 필요합니다.");
  return {
    displayName: validateDisplayName(input.displayName),
    imageVisible: readBoolean(
      input.imageVisible,
      "프로필 이미지 공개 설정이 올바르지 않습니다.",
    ),
  };
}

function readPostType(value: unknown): DiscussionPostType {
  if (value !== "question" && value !== "answer") {
    throw new DiscussionValidationError("질문 또는 답변 대상을 선택해 주세요.");
  }

  return value;
}

export function validateDiscussionId(value: unknown, label = "항목") {
  if (
    typeof value !== "string" ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      value,
    )
  ) {
    throw new DiscussionValidationError(`${label}을 찾을 수 없습니다.`);
  }

  return value;
}

export function validateDiscussionBody(
  value: unknown,
  label: "질문" | "답변",
) {
  if (typeof value !== "string") {
    throw new DiscussionValidationError(`${label} 내용을 입력해 주세요.`);
  }

  const body = value.trim();
  const maxLength =
    label === "질문" ? QUESTION_BODY_MAX_LENGTH : ANSWER_BODY_MAX_LENGTH;

  if (!body) {
    throw new DiscussionValidationError(`${label} 내용을 입력해 주세요.`);
  }

  if (body.length > maxLength) {
    throw new DiscussionValidationError(
      `${label}은 ${maxLength.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`,
    );
  }

  return body;
}

export function canReplyToDiscussionQuestion(
  scopeId: unknown,
  state: DiscussionPostState,
) {
  return state === "visible" && isActiveDiscussionScopeId(scopeId);
}

export function validateModerationReason(value: unknown) {
  if (typeof value !== "string") {
    throw new DiscussionValidationError("조치 사유를 입력해 주세요.");
  }

  const reason = value.trim();
  if (!reason) {
    throw new DiscussionValidationError("조치 사유를 입력해 주세요.");
  }

  if (reason.length > MODERATION_REASON_MAX_LENGTH) {
    throw new DiscussionValidationError(
      `조치 사유는 ${MODERATION_REASON_MAX_LENGTH}자 이내로 입력해 주세요.`,
    );
  }

  return reason;
}

function validateKnownScope(value: unknown): DiscussionScopeId {
  if (!isDiscussionScopeId(value)) {
    throw new DiscussionValidationError("질문을 남길 학습 항목을 찾을 수 없습니다.");
  }

  return value;
}

function validateActiveScope(value: unknown): ActiveDiscussionScopeId {
  if (!isActiveDiscussionScopeId(value)) {
    throw new DiscussionValidationError("현재 질문을 남길 수 없는 학습 항목입니다.");
  }

  return value;
}

export type DiscussionCursor = {
  createdAt: number;
  id: string;
};

function validateCursor(value: unknown): DiscussionCursor | undefined {
  if (value === undefined || value === null) return undefined;

  const input = readRecord(value, "잘못된 페이지 위치입니다.");
  if (
    typeof input.createdAt !== "number" ||
    !Number.isSafeInteger(input.createdAt) ||
    input.createdAt < 0
  ) {
    throw new DiscussionValidationError("잘못된 페이지 위치입니다.");
  }

  return {
    createdAt: input.createdAt,
    id: validateDiscussionId(input.id, "페이지 위치"),
  };
}

export function validateGetDiscussionInput(value: unknown) {
  const input = readRecord(value, "학습 항목이 필요합니다.");
  return {
    scopeId: validateKnownScope(input.scopeId),
    cursor: validateCursor(input.cursor),
  };
}

export function validateCreateQuestionInput(value: unknown) {
  const input = readRecord(value, "질문 내용이 필요합니다.");
  return {
    scopeId: validateActiveScope(input.scopeId),
    body: validateDiscussionBody(input.body, "질문"),
  };
}

export function validateCreateAnswerInput(value: unknown) {
  const input = readRecord(value, "답변 내용이 필요합니다.");
  return {
    questionId: validateDiscussionId(input.questionId, "질문"),
    body: validateDiscussionBody(input.body, "답변"),
  };
}

export function validateUpdatePostInput(value: unknown) {
  const input = readRecord(value, "수정할 글이 필요합니다.");
  const targetType = readPostType(input.targetType);
  return {
    targetType,
    targetId: validateDiscussionId(input.targetId),
    body: validateDiscussionBody(
      input.body,
      targetType === "question" ? "질문" : "답변",
    ),
  };
}

export function validateDeletePostInput(value: unknown) {
  const input = readRecord(value, "삭제할 글이 필요합니다.");
  return {
    targetType: readPostType(input.targetType),
    targetId: validateDiscussionId(input.targetId),
  };
}

export function validateSetAnswerLikeInput(value: unknown) {
  const input = readRecord(value, "답변과 좋아요 상태가 필요합니다.");
  return {
    answerId: validateDiscussionId(input.answerId, "답변"),
    liked: readBoolean(input.liked, "좋아요 상태가 올바르지 않습니다."),
  };
}

export function validateSetAuthorBlockInput(value: unknown) {
  const input = readRecord(value, "차단할 작성자가 필요합니다.");
  if ("blockToken" in input) {
    if (input.blocked !== false) {
      throw new DiscussionValidationError("차단 해제 요청이 올바르지 않습니다.");
    }
    if (
      typeof input.blockToken !== "string" ||
      !/^(question|answer)\.[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
        input.blockToken,
      )
    ) {
      throw new DiscussionValidationError("차단 기록을 찾을 수 없습니다.");
    }

    return {
      blockToken: input.blockToken,
      blocked: false as const,
    };
  }

  return {
    sourceType: readPostType(input.sourceType),
    sourceId: validateDiscussionId(input.sourceId),
    blocked: readBoolean(input.blocked, "차단 상태가 올바르지 않습니다."),
  };
}

export function validateModeratePostInput(value: unknown) {
  const input = readRecord(value, "관리할 항목이 필요합니다.");
  if (input.action !== "hide" && input.action !== "restore") {
    throw new DiscussionValidationError("지원하지 않는 관리 작업입니다.");
  }
  const action: DiscussionModerationAction = input.action;

  return {
    targetType: readPostType(input.targetType),
    targetId: validateDiscussionId(input.targetId),
    action,
    reason: validateModerationReason(input.reason),
  };
}

export function parseAdminUserIds(value: string | undefined) {
  if (!value) return new Set<string>();

  return new Set(
    value
      .split(",")
      .map((entry) => entry.trim())
      .filter((entry) => /^user_[A-Za-z0-9]+$/.test(entry)),
  );
}

export function isDiscussionAdmin(
  userId: string | null | undefined,
  configuredUserIds: string | undefined,
) {
  return Boolean(
    userId && parseAdminUserIds(configuredUserIds).has(userId),
  );
}

export function getDiscussionCapabilities(
  viewerUserId: string | null | undefined,
  authorUserId: string,
  state: DiscussionPostState,
  configuredAdminUserIds: string | undefined,
) {
  const isOwner = viewerUserId === authorUserId;
  const isAdmin = isDiscussionAdmin(viewerUserId, configuredAdminUserIds);

  return {
    canEdit: isOwner && state === "visible",
    canDelete: isOwner && state === "visible",
    canModerate: isAdmin && state !== "deleted",
  };
}

export function answerKindForUser(
  userId: string,
  configuredAdminUserIds: string | undefined,
): DiscussionAnswerKind {
  return isDiscussionAdmin(userId, configuredAdminUserIds)
    ? "official"
    : "community";
}

export function canLikeAnswer(
  viewerUserId: string | null | undefined,
  authorUserId: string,
  state: DiscussionPostState,
) {
  return Boolean(
    viewerUserId && viewerUserId !== authorUserId && state === "visible",
  );
}

export function canBlockAuthor(
  viewerUserId: string | null | undefined,
  authorUserId: string,
  configuredAdminUserIds: string | undefined,
) {
  return Boolean(
    viewerUserId &&
      viewerUserId !== authorUserId &&
      !isDiscussionAdmin(authorUserId, configuredAdminUserIds),
  );
}

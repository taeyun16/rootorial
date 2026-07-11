export const FEEDBACK_MESSAGE_MAX_LENGTH = 2_000;
export const FEEDBACK_PAGE_PATH_MAX_LENGTH = 500;
export const FEEDBACK_PAGE_TITLE_MAX_LENGTH = 200;

export type FeedbackKind = "incorrect" | "confusing" | "suggestion";

export type SubmitFeedbackResult =
  | { ok: true; feedbackId: string }
  | {
      ok: false;
      code: "unauthorized" | "unavailable" | "rate_limited";
      message: string;
    };

export class FeedbackValidationError extends Error {
  readonly code = "invalid_input";

  constructor(message: string) {
    super(message);
    this.name = "FeedbackValidationError";
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new FeedbackValidationError("피드백 내용을 확인해 주세요.");
  }
  return value as Record<string, unknown>;
}

function readTrimmedString(
  value: unknown,
  label: string,
  maxLength: number,
) {
  if (typeof value !== "string") {
    throw new FeedbackValidationError(`${label}을 확인해 주세요.`);
  }
  const normalized = value.trim();
  if (!normalized) {
    throw new FeedbackValidationError(`${label}을 입력해 주세요.`);
  }
  if (normalized.length > maxLength) {
    throw new FeedbackValidationError(
      `${label}은 ${maxLength.toLocaleString("ko-KR")}자 이내로 입력해 주세요.`,
    );
  }
  return normalized;
}

export function validateSubmitFeedbackInput(value: unknown) {
  const input = readRecord(value);
  if (
    input.kind !== "incorrect" &&
    input.kind !== "confusing" &&
    input.kind !== "suggestion"
  ) {
    throw new FeedbackValidationError("피드백 종류를 선택해 주세요.");
  }

  const pagePath = readTrimmedString(
    input.pagePath,
    "페이지 경로",
    FEEDBACK_PAGE_PATH_MAX_LENGTH,
  );
  if (!pagePath.startsWith("/") || pagePath.startsWith("//")) {
    throw new FeedbackValidationError("페이지 경로를 확인해 주세요.");
  }

  return {
    kind: input.kind as FeedbackKind,
    message: readTrimmedString(
      input.message,
      "피드백",
      FEEDBACK_MESSAGE_MAX_LENGTH,
    ),
    pagePath,
    pageTitle: readTrimmedString(
      input.pageTitle,
      "페이지 제목",
      FEEDBACK_PAGE_TITLE_MAX_LENGTH,
    ),
  };
}

import type { FeedbackKind } from "./feedback";

export const CONTENT_FEEDBACK_REQUEST_EVENT = "rootorial:content-feedback-request";

export type ContentFeedbackRequest = {
  kind?: FeedbackKind;
  message?: string;
};

export function requestContentFeedback(detail: ContentFeedbackRequest = {}) {
  window.dispatchEvent(
    new CustomEvent<ContentFeedbackRequest>(CONTENT_FEEDBACK_REQUEST_EVENT, {
      detail,
    }),
  );
}

declare global {
  interface WindowEventMap {
    [CONTENT_FEEDBACK_REQUEST_EVENT]: CustomEvent<ContentFeedbackRequest>;
  }
}

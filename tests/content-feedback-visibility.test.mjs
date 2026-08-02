import assert from "node:assert/strict";
import test from "node:test";
import {
  shouldRenderContentFeedback,
} from "../src/features/feedback/content-feedback-visibility.ts";

test("keeps feedback available on public learning routes", () => {
  for (const pathname of [
    "/",
    "/curricula/linux-systems/chapters/shell-and-filesystem",
    "/experiments/linux",
  ]) {
    assert.equal(shouldRenderContentFeedback({ pathname, contentPreviewMode: false }), true);
  }
});

test("enables feedback only for local content-preview admin routes", () => {
  for (const pathname of [
    "/admin/preview",
    "/admin/preview/curricula",
    "/admin/preview/curricula/linux-systems/chapters/shell-and-filesystem",
  ]) {
    assert.equal(shouldRenderContentFeedback({ pathname, contentPreviewMode: true }), true);
    assert.equal(shouldRenderContentFeedback({ pathname, contentPreviewMode: false }), false);
  }
});

test("keeps feedback closed on operational admin routes and prefix lookalikes", () => {
  for (const pathname of [
    "/admin",
    "/admin/publication",
    "/admin/moderation",
    "/admin/previewish",
  ]) {
    assert.equal(shouldRenderContentFeedback({ pathname, contentPreviewMode: true }), false);
  }
});

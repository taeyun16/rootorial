import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import {
  createTestUser,
  deleteTestUser,
  discussionToggleName,
  signInTestUser,
} from "./helpers";

const createdUserIds: string[] = [];

test.afterEach(async () => {
  for (const userId of createdUserIds.splice(0)) {
    await deleteTestUser(userId);
  }
});

test("supports replies, likes, blocking, and unblocking across two users", async ({
  browser,
  page,
}) => {
  const author = await createTestUser("Author");
  const responder = await createTestUser("Responder");
  createdUserIds.push(responder.userId, author.userId);

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const question = `[E2E ${runId}] 두 사용자 질문입니다.`;
  const answerText = `[E2E ${runId}] 두 번째 사용자의 답변입니다.`;
  const answer = `**${answerText}**\n\n` +
    "```tsx\nconst vector: number[] = [3, 2]\nconsole.log(vector)\n```";
  const editedAnswer = `${answerText} 수정 완료`;

  await signInTestUser(page, author.email);
  await page.getByRole("button", { name: discussionToggleName }).click();
  await page
    .getByPlaceholder("어디에서 막혔는지, 어떤 실행 결과가 예상과 달랐는지 적어주세요.")
    .fill(question);
  await page.getByRole("button", { name: "질문 등록" }).click();
  await expect(page.getByText(question, { exact: true })).toBeVisible();

  const responderContext = await browser.newContext();
  const responderPage = await responderContext.newPage();
  await signInTestUser(responderPage, responder.email);
  await responderPage.getByRole("button", { name: discussionToggleName }).click();
  const responderThread = responderPage.locator(".discussion-question", {
    hasText: question,
  });
  await responderThread.getByRole("button", { name: "답변 남기기" }).click();
  const replyForm = responderThread.locator(".discussion-reply-form");
  await replyForm
    .getByPlaceholder("계산 과정이나 실행 가능한 예시를 함께 남겨주세요.")
    .fill(answer);
  await replyForm.getByRole("tab", { name: "미리보기" }).click();
  await expect(replyForm.locator("strong", { hasText: answerText })).toBeVisible();
  await expect(replyForm.locator("pre code.hljs.language-tsx"))
    .toContainText("console.log(vector)");
  await expect(replyForm.locator(".hljs-keyword", { hasText: "const" }))
    .toBeVisible();
  await replyForm.getByRole("tab", { name: "작성" }).click();
  await responderThread.getByRole("button", { name: "답변 등록" }).click();
  await expect(responderPage.getByText(answerText, { exact: true })).toBeVisible();
  const communitySummary = responderPage.getByRole("region", { name: "커뮤니티 현황" });
  await expect(communitySummary.getByLabel("질문 1개")).toBeVisible();
  await expect(communitySummary.getByLabel("답변 1개")).toBeVisible();
  await expect(communitySummary.getByLabel("참여자 2명")).toBeVisible();
  await expect(communitySummary.getByRole("img", { name: "E2E Author 아바타" })).toBeVisible();
  await expect(communitySummary.getByRole("img", { name: "E2E Responder 아바타" })).toBeVisible();
  await expect(responderThread.getByText("답변 1", { exact: true })).toBeVisible();

  const responderAnswer = responderPage.locator(".discussion-answer", {
    hasText: answerText,
  });
  await expect(responderAnswer.locator("pre code.hljs.language-tsx"))
    .toContainText("const vector");
  await responderAnswer.getByRole("button", { name: "답변 수정" }).click();
  await responderAnswer.getByRole("textbox", { name: "답변 수정" }).fill(editedAnswer);
  await responderAnswer.getByRole("button", { name: "수정 저장" }).click();
  await expect(responderPage.getByText(editedAnswer, { exact: true })).toBeVisible();

  await page.reload();
  await clerk.loaded({ page });
  await expect(page.locator(".cl-userButtonTrigger")).toBeVisible();
  const contextualDiscussion = page.getByRole("button", {
    name: discussionToggleName,
  });
  await expect(contextualDiscussion.locator(".discussion-toggle-count"))
    .toHaveText("1");
  const triggerBox = await contextualDiscussion.boundingBox();
  const discussedElementBox = await page.locator(".concept-definition-grid").first()
    .boundingBox();
  expect(triggerBox).not.toBeNull();
  expect(discussedElementBox).not.toBeNull();
  expect(triggerBox!.x).toBeGreaterThanOrEqual(
    discussedElementBox!.x + discussedElementBox!.width,
  );
  const scrollPosition = await page.evaluate(() => window.scrollY);
  await contextualDiscussion.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  expect(await page.evaluate(() => window.scrollY)).toBe(scrollPosition);
  const answerCard = page.locator(".discussion-answer", { hasText: editedAnswer });
  await expect(answerCard).toBeVisible();
  await answerCard.getByRole("button", { name: "좋아요 0" }).click();
  await expect(answerCard.getByRole("button", { name: "좋아요 1" })).toBeVisible();
  await expect(page.getByRole("region", { name: "커뮤니티 현황" })
    .getByLabel("좋아요 1개")).toBeVisible();

  await answerCard.getByRole("button", { name: "작성자 차단" }).click();
  await page.getByRole("button", { name: "차단하기" }).click();
  await expect(page.getByText(editedAnswer, { exact: true })).toHaveCount(0);
  await expect(page.getByText("E2E Responder 님의 글을 숨겼습니다.")).toBeVisible();

  await page.getByRole("button", { name: "차단한 사용자 관리" }).click();
  await page.getByRole("region", { name: "차단한 사용자 관리" })
    .getByRole("button", { name: "차단 해제" })
    .click();
  await expect(page.getByText(editedAnswer, { exact: true })).toBeVisible();

  await responderPage.reload();
  await clerk.loaded({ page: responderPage });
  await expect(responderPage.locator(".cl-userButtonTrigger")).toBeVisible();
  await responderPage.getByRole("button", { name: discussionToggleName }).click();
  const editedResponderAnswer = responderPage.locator(".discussion-answer", {
    hasText: editedAnswer,
  });
  await editedResponderAnswer.getByRole("button", { name: "답변 삭제" }).click();
  await responderPage.getByRole("alertdialog", { name: "답변 삭제 확인" })
    .getByRole("button", { name: "삭제하기" })
    .click();
  await expect(responderPage.getByText(editedAnswer, { exact: true })).toHaveCount(0);

  await responderContext.close();
});

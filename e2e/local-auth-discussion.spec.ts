import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";
import {
  deleteTestUser,
  discussionToggleName,
  findUserByEmail,
} from "./helpers";

let createdEmail: string | null = null;

test.afterEach(async () => {
  if (!createdEmail || !process.env.CLERK_SECRET_KEY) return;
  const user = await findUserByEmail(createdEmail);
  if (user) {
    await deleteTestUser(user.id);
  }
  createdEmail = null;
});

test("signs up a local test user and persists a discussion question in D1", async ({
  page,
}) => {
  await setupClerkTestingToken({ page });

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  createdEmail = `rootorial+clerk_test_${runId}@example.com`;
  const questionText = `[E2E ${runId}] 로컬 D1에 질문이 저장되나요?`;
  const question = `**${questionText}**\n\n` +
    "```python\nvector = [3, 2]\nprint(vector)\n```";
  const editedQuestion = `${questionText} 수정 완료`;

  await page.addInitScript(() => {
    localStorage.setItem("rootorial-progress", JSON.stringify(["vectors"]));
  });

  await page.goto("/curricula/transformer-from-zero/chapters/vectors");
  await clerk.loaded({ page });
  await page.getByRole("button", { name: "가입하기" }).click();
  await expect(page.locator(".cl-signUp-root")).toBeVisible({ timeout: 15_000 });

  await page.locator("input[name=emailAddress]").fill(createdEmail);
  await page.locator("input[name=password]").fill("RzLocal-E2E-2026!Test");
  await page.getByRole("button", { name: "Continue", exact: true }).click();

  const verificationCode = page.getByRole("textbox", {
    name: /Enter verification code/,
  });
  await expect(verificationCode).toBeVisible();
  await verificationCode.pressSequentially("424242");

  await expect(page.locator(".cl-userButtonTrigger")).toBeVisible();
  await expect(page.getByText("진도가 계정에 저장되었습니다.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();

  const createdUser = await findUserByEmail(createdEmail);
  expect(createdUser?.privateMetadata).toMatchObject({
    rootorial: {
      progressVersion: 2,
      curricula: {
        "transformer-from-zero": { completedChapters: { vectors: true } },
      },
    },
  });

  await page
    .getByRole("button", {
      name: discussionToggleName,
    })
    .click();
  const composer = page.locator(".discussion-composer");
  await composer
    .getByPlaceholder("어디에서 막혔는지, 어떤 실행 결과가 예상과 달랐는지 적어주세요.")
    .fill(question);
  await composer.getByRole("tab", { name: "미리보기" }).click();
  await expect(composer.locator("strong", { hasText: questionText })).toBeVisible();
  await expect(composer.locator("pre code.hljs.language-python"))
    .toContainText("print(vector)");
  await composer.getByRole("tab", { name: "작성" }).click();
  await page.getByRole("button", { name: "질문 등록" }).click();
  await expect(page.locator(".discussion-question", { hasText: questionText })
    .getByText(questionText, { exact: true })).toBeVisible();

  await page.reload();
  await clerk.loaded({ page });
  await expect(page.locator(".cl-userButtonTrigger")).toBeVisible();
  await page
    .getByRole("button", {
      name: discussionToggleName,
    })
    .click();
  await expect(page.locator(".discussion-question", { hasText: questionText })
    .getByText(questionText, { exact: true })).toBeVisible();

  const questionThread = page.locator(".discussion-question", { hasText: questionText });
  await questionThread.getByRole("button", { name: "질문 수정" }).click();
  await questionThread.getByRole("textbox", { name: "질문 수정" }).fill(editedQuestion);
  await questionThread.getByRole("button", { name: "수정 저장" }).click();
  const editedThread = page.locator(".discussion-question", { hasText: editedQuestion });
  await expect(editedThread.getByText(editedQuestion, { exact: true })).toBeVisible();
  await editedThread.getByRole("button", { name: "질문 삭제" }).click();
  const deleteDialog = page.getByRole("alertdialog", { name: "질문 삭제 확인" });
  await deleteDialog.getByRole("button", { name: "삭제하기" }).click();
  await expect(deleteDialog).toBeHidden({ timeout: 15_000 });
  await expect(editedThread).toHaveCount(0);
});

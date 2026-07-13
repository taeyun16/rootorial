import { expect, test } from "@playwright/test";
import {
  cleanupLocalDiscussion,
  createTestUser,
  deleteTestUser,
  discussionToggleName,
  findUserByEmail,
  setupDiscussionProfile,
  signInTestUser,
} from "./helpers";

let learnerUserId: string | null = null;
let adminUserId: string | null = null;

test.afterEach(async () => {
  if (learnerUserId) await deleteTestUser(learnerUserId);
  if (adminUserId) cleanupLocalDiscussion(adminUserId);
  learnerUserId = null;
  adminUserId = null;
});

test("lets an allowlisted admin hide and restore a question", async ({
  browser,
  page,
}) => {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");

  const learner = await createTestUser("Moderated");
  learnerUserId = learner.userId;
  const admin = await findUserByEmail(process.env.E2E_ADMIN_EMAIL!);
  if (!admin) throw new Error("Prepared E2E admin was not found.");
  adminUserId = admin.id;

  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const question = `[E2E ${runId}] 관리 대상 질문입니다.`;

  const learnerContext = await browser.newContext();
  const learnerPage = await learnerContext.newPage();
  await signInTestUser(learnerPage, learner.email);
  await learnerPage.getByRole("button", { name: discussionToggleName }).click();
  await setupDiscussionProfile(learnerPage, "검토 대상 학습자");
  await learnerPage
    .getByPlaceholder("어디에서 막혔는지, 어떤 실행 결과가 예상과 달랐는지 적어주세요.")
    .fill(question);
  await learnerPage.getByRole("button", { name: "질문 등록" }).click();
  await expect(learnerPage.locator(".discussion-question", { hasText: question })
    .getByText(question, { exact: true })).toBeVisible();

  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
  await page.getByRole("button", { name: discussionToggleName }).click();
  const adminThread = page.locator(".discussion-question", { hasText: question });
  await adminThread.getByRole("button", { name: "질문 숨기기" }).click();
  await adminThread
    .getByPlaceholder("감사 기록에 남길 사유를 입력하세요.")
    .fill("로컬 E2E 숨김 검증");
  await adminThread.getByRole("button", { name: "숨김 적용" }).click();
  await expect(adminThread.getByText("관리 사유: 로컬 E2E 숨김 검증")).toBeVisible();

  const publicContext = await browser.newContext();
  const publicPage = await publicContext.newPage();
  await publicPage.goto("/curricula/transformer-from-zero/chapters/vectors");
  await publicPage.getByRole("button", { name: discussionToggleName }).click();
  await expect(publicPage.getByText(question, { exact: true })).toHaveCount(0);

  await adminThread.getByRole("button", { name: "질문 복구" }).click();
  await adminThread
    .getByPlaceholder("감사 기록에 남길 사유를 입력하세요.")
    .fill("로컬 E2E 복구 검증");
  await adminThread.getByRole("button", { name: "복구 적용" }).click();

  await publicPage.reload();
  await publicPage.getByRole("button", { name: discussionToggleName }).click();
  await expect(publicPage.locator(".discussion-question", { hasText: question })
    .getByText(question, { exact: true })).toBeVisible();

  await publicContext.close();
  await learnerContext.close();
});

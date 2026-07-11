import { createClerkClient } from "@clerk/backend";
import { clerk, setupClerkTestingToken } from "@clerk/testing/playwright";
import type { Page } from "@playwright/test";
import { execFileSync } from "node:child_process";

export const discussionToggleName =
  /DISCUSSION 벡터를 읽는 세 관점.*열기/;

function clerkClient() {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new Error("CLERK_SECRET_KEY is required for E2E tests.");
  }
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

export async function createTestUser(label: string) {
  const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const email = `rootorial-${label}+clerk_test_${runId}@example.com`;
  const user = await clerkClient().users.createUser({
    emailAddress: [email],
    firstName: "E2E",
    lastName: label,
    skipPasswordRequirement: true,
  });
  return { email, userId: user.id };
}

export async function signInTestUser(page: Page, email: string) {
  await setupClerkTestingToken({ page });
  await page.goto("/curricula/transformer-from-zero/chapters/vectors");
  await clerk.loaded({ page });
  await clerk.signIn({ page, emailAddress: email });
  await page.reload();
  await clerk.loaded({ page });
}

export function cleanupLocalDiscussion(userId: string) {
  const safeUserId = userId.replaceAll("'", "''");
  const sql = [
    "PRAGMA foreign_keys = ON",
    `DELETE FROM discussion_answer_likes WHERE user_id = '${safeUserId}'`,
    `DELETE FROM discussion_moderation_events WHERE actor_user_id = '${safeUserId}'`,
    `DELETE FROM discussion_user_blocks WHERE blocker_user_id = '${safeUserId}' OR blocked_user_id = '${safeUserId}'`,
    `DELETE FROM discussion_rate_limits WHERE user_id = '${safeUserId}'`,
    `DELETE FROM discussion_answers WHERE author_user_id = '${safeUserId}'`,
    `DELETE FROM discussion_questions WHERE author_user_id = '${safeUserId}'`,
    `DELETE FROM discussion_profiles WHERE user_id = '${safeUserId}'`,
  ].join("; ");

  execFileSync("npx", [
    "wrangler",
    "d1",
    "execute",
    "DB",
    "--local",
    "--env",
    "e2e",
    "--persist-to",
    ".wrangler/e2e-state",
    "--command",
    sql,
  ], { stdio: "ignore" });
}

export async function deleteTestUser(userId: string) {
  cleanupLocalDiscussion(userId);
  await clerkClient().users.deleteUser(userId);
}

export async function findUserByEmail(email: string) {
  const users = await clerkClient().users.getUserList({ emailAddress: [email] });
  return users.data[0] ?? null;
}

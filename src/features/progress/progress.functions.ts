import { auth, clerkClient } from "@clerk/tanstack-react-start/server";
import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { readCompletedFromMetadata, validateCompletedSlugs } from "./progress";
import { d1ProgressRepository, importProgressOnce, validateResume } from "./progress-repository";

function identityInput(input: unknown) {
  if (!input || typeof input !== "object" || Array.isArray(input)) throw new Error("Invalid progress request");
  const value = input as Record<string, unknown>;
  if (typeof value.expectedUserId !== "string" || !value.expectedUserId || value.expectedUserId.length > 200) throw new Error("Invalid account");
  return { expectedUserId: value.expectedUserId };
}

async function accountRepository(expectedUserId: string) {
  setResponseHeader("Cache-Control", "private, no-store");
  if (import.meta.env.DEV && ["content-preview", "e2e-anonymous"].includes(import.meta.env.MODE)) {
    throw new Error("Account progress is disabled in isolated learning");
  }
  const { userId } = await auth();
  if (!userId || userId !== expectedUserId) throw new Error("Account changed. Retry after signing in.");
  const database = (env as unknown as { DB?: D1Database }).DB;
  if (!database) throw new Error("Progress database is unavailable");
  return { userId, repository: d1ProgressRepository(database) };
}

// Reads never migrate or mutate. Import happens atomically on the first sync.
export const getMyProgress = createServerFn({ method: "GET" })
  .validator(identityInput)
  .handler(async ({ data }) => {
    const { userId, repository } = await accountRepository(data.expectedUserId);
    return repository.read(userId);
  });

export const syncMyProgress = createServerFn({ method: "POST" })
  .validator((input: unknown) => {
    const identity = identityInput(input);
    const value = input as Record<string, unknown>;
    return { ...identity, completed: validateCompletedSlugs(value.completedSlugs), resume: validateResume(value.resume) };
  })
  .handler(async ({ data }) => {
    const { userId, repository } = await accountRepository(data.expectedUserId);
    await importProgressOnce(repository, userId, async () => {
      const user = await clerkClient().users.getUser(userId);
      return readCompletedFromMetadata(user.privateMetadata);
    });
    // A bad client clock must not freeze resume updates indefinitely.
    const resume = data.resume ? { ...data.resume, updatedAt: Math.min(data.resume.updatedAt, Date.now()) } : null;
    return repository.merge(userId, { completed: data.completed, resume });
  });

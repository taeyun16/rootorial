// Test entrypoint only. Never imported by src/ or the application's Wrangler config.
// Exercises the real repository and D1, not Clerk or TanStack account authentication.
import { d1ProgressRepository, importProgressOnce, validateResume } from "../../src/features/progress/progress-repository";
import { validateCompletedSlugs } from "../../src/features/progress/progress";

export default {
  async fetch(request: Request, env: { DB: D1Database; LOCAL_REPOSITORY_TEST?: string }) {
    const url = new URL(request.url);
    const host = request.headers.get("host");
    if (env.LOCAL_REPOSITORY_TEST !== "1" || !["127.0.0.1", "localhost", "[::1]"].includes(url.hostname)
      || (host && !/^(127\.0\.0\.1|localhost|\[::1\])(?::\d+)?$/.test(host))
      || request.headers.has("X-Forwarded-Host")) {
      return new Response("Unavailable", { status: 404 });
    }
    if (url.pathname === "/health") return new Response("local-repository-test");
    if (url.pathname !== "/progress") return new Response("Not found", { status: 404 });
    // Fixed synthetic identities belong to this test fixture, never production auth.
    const userId = request.headers.get("X-Local-Test-User");
    if (userId !== "fixture-a" && userId !== "fixture-b") return new Response("Unknown test user", { status: 401 });
    const repository = d1ProgressRepository(env.DB);
    if (request.method === "GET") return Response.json(await repository.read(userId));
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405 });
    let completed: string[], resume;
    try {
      const input = await request.json() as Record<string, unknown>;
      if (!input || typeof input !== "object" || Array.isArray(input) || Object.keys(input).some((key) => !["completedSlugs", "resume"].includes(key))) throw Error("Invalid input");
      completed = validateCompletedSlugs(input.completedSlugs);
      resume = validateResume(input.resume);
    } catch { return new Response("Invalid progress", { status: 400 }); }
    await importProgressOnce(repository, userId, async () => []);
    return Response.json(await repository.merge(userId, { completed, resume }));
  },
};

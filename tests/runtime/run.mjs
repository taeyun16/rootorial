import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, readdir } from "node:fs/promises";
import { toJSON } from "seroval";
import { createServer } from "node:net";
import { resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { root, launch, finished, stopChild, migrationArgs, viteArgs, wrangler, fixtureConfig, appConfig } from "../../scripts/local-runtime.mjs";

await mkdir(resolve(root, "work/local-runtime"), { recursive: true });
const run = await mkdtemp(resolve(root, "work/local-runtime/run-"));
const state = resolve(run, "state");
const fresh = resolve(run, "fresh");
const vector = "transformer-from-zero/vectors", shell = "linux-systems/shell-and-filesystem";
const empty = { completed: [], resume: null };
for (const port of [3220, 3221, 3223]) {
  const server = createServer();
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  await new Promise((resolve) => server.close(resolve));
}
let child;
async function stop() {
  if (!child || child.exitCode !== null) { child = undefined; return; }
  await stopChild(child);
  child = undefined;
}
for (const signal of ["SIGINT", "SIGTERM"]) process.on(signal, async () => { await stop(); process.exit(1); });
async function start(args, directory, health) {
  child = await launch(args, directory);
  for (let i = 0; i < 120; i++) {
    if (child.exitCode !== null) throw Error(`Server exited: ${child.exitCode}`);
    try { const response = await fetch(health, { signal: AbortSignal.timeout(1000) }); if (response.ok) return; } catch {}
    await delay(500);
  }
  throw Error(`Server did not start: ${health}`);
}
function workerArgs(directory) {
  return [wrangler, "dev", "--local", "--config", fixtureConfig, "--env", "integration", "--persist-to", directory, "--ip", "127.0.0.1", "--port", "3221", "--inspector-port", "0"];
}
async function request(user = "fixture-a", body, expected = 200) {
  const response = await fetch("http://127.0.0.1:3221/progress", {
    method: body === undefined ? "GET" : "POST",
    headers: { "X-Local-Test-User": user, "Content-Type": "application/json" },
    body: body === undefined ? undefined : typeof body === "string" ? body : JSON.stringify(body),
  });
  assert.equal(response.status, expected, await response.clone().text());
  return expected === 200 ? response.json() : response.text();
}
async function sql(directory, command) {
  const query = await launch([wrangler, "d1", "execute", "DB", "--local", "--config", appConfig, "--env", "integration", "--persist-to", directory, "--command", command, "--json"], directory, { stdio: ["ignore", "pipe", "inherit"] });
  let output = "";
  query.stdout.on("data", (chunk) => output += chunk);
  await finished(query);
  return JSON.parse(output)[0].results;
}
try {
  for (const directory of [state, fresh]) await finished(await launch(migrationArgs(directory), directory));
  await start(workerArgs(state), state, "http://127.0.0.1:3221/health");
  assert.deepEqual(await request(), empty);
  assert.equal((await fetch("http://127.0.0.1:3221/progress", { headers: { "X-Forwarded-Host": "example.com", "X-Local-Test-User": "fixture-a" } })).status, 404);
  await request("untrusted", undefined, 401);
  const first = { completedSlugs: [vector], resume: { chapterId: vector, sectionId: "check", updatedAt: 20 } };
  const snapshot = await request("fixture-a", first);
  assert.deepEqual(snapshot, { completed: [vector], resume: first.resume });
  assert.deepEqual(await request("fixture-a", first), snapshot);
  assert.deepEqual(await request("fixture-b"), empty);
  await request("fixture-b", { completedSlugs: [shell], resume: null });
  assert.deepEqual(await request(), snapshot);
  for (const malformed of ["{", null, [], {}, { completedSlugs: ["unknown"] }, { completedSlugs: [vector], userId: "fixture-b" }, { completedSlugs: [vector], resume: { chapterId: vector, sectionId: "https://example.com", updatedAt: 1 } }]) {
    await request("fixture-a", malformed === null ? "null" : malformed, 400);
  }
  assert.deepEqual(await request(), snapshot);
  await request("fixture-a", { completedSlugs: [shell], resume: { chapterId: vector, sectionId: "older", updatedAt: 10 } });
  const saved = { completed: [vector, shell], resume: first.resume };
  assert.deepEqual(await request(), saved);
  await stop();
  assert.deepEqual(await sql(state, "SELECT user_id, COUNT(*) AS n FROM learning_completions GROUP BY user_id ORDER BY user_id"), [{ user_id: "fixture-a", n: 2 }, { user_id: "fixture-b", n: 1 }]);
  assert.deepEqual(await sql(state, "SELECT COUNT(*) AS n FROM learning_progress_imports"), [{ n: 2 }]);
  await start(workerArgs(state), state, "http://127.0.0.1:3221/health");
  assert.deepEqual(await request(), saved);
  await stop();
  await start(workerArgs(fresh), fresh, "http://127.0.0.1:3221/health");
  assert.deepEqual(await request(), empty);
  await stop();
  // Real application runtime, same migrated D1 path; test identity is not an app route.
  await start(viteArgs(), state, "http://127.0.0.1:3220/admin/preview/curricula/");
  const preview = await fetch("http://127.0.0.1:3220/admin/preview/curricula/");
  assert.match(await preview.text(), /Rootorial/i);
  const write = await fetch("http://127.0.0.1:3220/", { method: "POST", headers: { "X-Local-Test-User": "fixture-a" }, body: "{}" });
  assert.equal(write.status, 403);
  assert.equal((await fetch("http://127.0.0.1:3220/progress", { headers: { "X-Local-Test-User": "fixture-a" } })).status, 404);
  await stop();
  assert.deepEqual(await sql(state, "SELECT COUNT(*) AS n FROM learning_completions"), [{ n: 3 }]);
  const production = await readFile(resolve(root, "wrangler.jsonc"), "utf8");
  assert.doesNotMatch(production, /progress-worker|LOCAL_REPOSITORY_TEST|X-Local-Test-User/);
  const assets = resolve(root, "dist/server/assets");
  let progressBundle;
  for (const file of await readdir(assets)) {
    if (!file.endsWith(".js")) continue;
    const code = await readFile(resolve(assets, file), "utf8");
    assert.doesNotMatch(code, /X-Local-Test-User|LOCAL_REPOSITORY_TEST|local-repository-test/);
    if (file.startsWith("progress.functions-")) progressBundle = code;
  }
  assert.ok(progressBundle, "Run npm run build before the production boundary test");
  const getId = progressBundle.match(/id: "([a-f0-9]+)",\s*name: "getMyProgress"/)[1];
  const syncId = progressBundle.match(/id: "([a-f0-9]+)",\s*name: "syncMyProgress"/)[1];
  await start([wrangler, "dev", "--local", "--config", "tests/runtime/wrangler.production-check.json", "--env", "integration", "--persist-to", state, "--ip", "127.0.0.1", "--port", "3223", "--inspector-port", "0"], state, "http://127.0.0.1:3223/");
  for (const [id, method, data] of [
    [getId, "GET", { expectedUserId: "fixture-a" }],
    [syncId, "POST", { expectedUserId: "fixture-a", completedSlugs: [vector], resume: null }],
  ]) {
    const payload = JSON.stringify(toJSON({ data }));
    const response = await fetch(`http://127.0.0.1:3223/_serverFn/${id}${method === "GET" ? `?payload=${encodeURIComponent(payload)}` : ""}`, {
      method,
      headers: { "X-Local-Test-User": "fixture-a", "Content-Type": "application/json", "x-tsr-serverFn": "true", Origin: "http://127.0.0.1:3223", "Sec-Fetch-Site": "same-origin" },
      ...(method === "POST" ? { body: payload } : {}),
    });
    const body = await response.text();
    // TanStack transports handler errors inside a successful RPC envelope.
    assert.equal(response.status, 200, body);
    const envelope = JSON.parse(body);
    const errorIndex = envelope.p.k.indexOf("error");
    assert.ok(errorIndex >= 0, body);
    assert.equal(envelope.p.v[errorIndex].t, 25, body);
    assert.match(body, /clerkMiddleware|signing in|auth\(\)/i);
  }
  assert.equal((await fetch("http://127.0.0.1:3223/progress", { headers: { "X-Local-Test-User": "fixture-a" } })).status, 404);
  await stop();
  assert.deepEqual(await sql(state, "SELECT COUNT(*) AS n FROM learning_completions"), [{ n: 3 }]);
  console.log(`PASS: real workerd/D1 save/read, invalid input, idempotence, user separation, restart, fresh state, Vite read-only boundary, built production rejects test identity. Evidence state: ${run}`);
} finally { await stop(); }

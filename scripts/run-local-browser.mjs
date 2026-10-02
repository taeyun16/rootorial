import { mkdir, mkdtemp } from "node:fs/promises";
import { resolve } from "node:path";
import { root, launch, finished, localEnv, migrationArgs } from "./local-runtime.mjs";
import { verifyPreparedAssets } from "./python-assets.mjs";

await verifyPreparedAssets(root);
await mkdir(resolve(root, "work/local-runtime"), { recursive: true });
const state = await mkdtemp(resolve(root, "work/local-runtime/browser-"));
await finished(await launch(migrationArgs(state), state));
const env = {
  ...await localEnv(state),
  PLAYWRIGHT_BROWSERS_PATH: process.env.PLAYWRIGHT_BROWSERS_PATH || resolve(root, "work/playwright"),
  ROOTORIAL_REHEARSAL_URL: "http://127.0.0.1:3220",
  ...(process.env.ROOTORIAL_BROWSER_EXECUTABLE ? { ROOTORIAL_BROWSER_EXECUTABLE: process.env.ROOTORIAL_BROWSER_EXECUTABLE } : {}),
};
console.log(`Browser evidence state: ${state}; browser: ${env.ROOTORIAL_BROWSER_EXECUTABLE || "locked Playwright Chromium"}`);
const selected = [], extra = [];
const args = process.argv.slice(2);
for (let index = 0; index < args.length; index++) {
  if (args[index] === "--project") selected.push(args[++index]);
  else if (args[index].startsWith("--project=")) selected.push(args[index].slice("--project=".length));
  else extra.push(args[index]);
}
const all = ["local-learning", "local-python", "public-boundary"];
if (selected.some((name) => !all.includes(name))) throw Error(`Projects: ${all.join(", ")}`);
const projects = selected.length ? selected : all;
// Workerd owns its persisted storage while running. Reuse the database across
// modes sequentially; never start two independent runtimes over the same state.
let failed = false;
for (const [mode, names] of [["content-preview", ["local-learning", "local-python"]], ["e2e-anonymous", ["public-boundary"]]]) {
  const group = names.filter((name) => projects.includes(name));
  if (!group.length) continue;
  try {
    await finished(await launch(["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.runtime.config.ts", ...group.flatMap((name) => ["--project", name]), ...extra], state, { env: { ...env, ROOTORIAL_RUNTIME_BROWSER_MODE: mode } }));
  } catch (error) { console.error(error.message); failed = true; }
}
if (failed) process.exitCode = 1;

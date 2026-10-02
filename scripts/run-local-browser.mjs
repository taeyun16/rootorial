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
await finished(await launch(["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.runtime.config.ts", ...process.argv.slice(2)], state, { env }));

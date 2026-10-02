import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { verifyPreparedAssets } from "./python-assets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
try {
  await verifyPreparedAssets(root);
  for (const args of [
    ["node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "DB", "--local", "--env", "e2e", "--persist-to", ".wrangler/e2e-state"],
    ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.python.config.ts", ...process.argv.slice(2)],
  ]) {
    const result = spawnSync(process.execPath, args, { cwd: root, stdio: "inherit", windowsHide: true, env: { ...process.env, CLOUDFLARE_ENV: "e2e" } });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status ?? 1);
  }
} catch (error) {
  console.error(`Local Python E2E cannot start: ${error.message}. Prepare assets with npm run python:prepare -- --download (authorized network) or --from DIRECTORY.`);
  process.exitCode = 1;
}

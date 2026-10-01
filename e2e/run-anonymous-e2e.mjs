import { spawnSync } from "node:child_process";

// No Clerk SDK, account creation, credentials, or remote database commands.
for (const args of [
  ["node_modules/wrangler/bin/wrangler.js", "d1", "migrations", "apply", "DB", "--local", "--env", "e2e", "--persist-to", ".wrangler/e2e-state"],
  ["node_modules/@playwright/test/cli.js", "test", "--config", "playwright.anonymous.config.ts", ...process.argv.slice(2)],
]) {
  const result = spawnSync(process.execPath, args, { stdio: "inherit", env: process.env });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

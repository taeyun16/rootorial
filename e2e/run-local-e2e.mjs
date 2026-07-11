import { createClerkClient } from "@clerk/backend";
import { config as loadEnv } from "dotenv";
import { spawn } from "node:child_process";
import { rm, writeFile } from "node:fs/promises";

loadEnv({ path: [".env.local", ".env"] });

if (!process.env.CLERK_SECRET_KEY) {
  throw new Error("CLERK_SECRET_KEY is required for local E2E tests.");
}

const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY,
});
const runId = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const adminEmail = `rootorial-admin+clerk_test_${runId}@example.com`;
const workerEnvFile = ".dev.vars.e2e";
let admin = null;

function runPlaywright() {
  return new Promise((resolve, reject) => {
    const child = spawn("npx", ["playwright", "test", ...process.argv.slice(2)], {
      stdio: "inherit",
      env: {
        ...process.env,
        E2E_ADMIN_EMAIL: adminEmail,
        CLOUDFLARE_ENV: "e2e",
      },
    });
    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) reject(new Error(`Playwright stopped by ${signal}.`));
      else resolve(code ?? 1);
    });
  });
}

let exitCode = 1;
try {
  admin = await clerkClient.users.createUser({
    emailAddress: [adminEmail],
    firstName: "E2E",
    lastName: "Admin",
    skipPasswordRequirement: true,
  });
  await writeFile(
    workerEnvFile,
    [
      `CLERK_PUBLISHABLE_KEY=${process.env.CLERK_PUBLISHABLE_KEY}`,
      `CLERK_SECRET_KEY=${process.env.CLERK_SECRET_KEY}`,
      `ROOTORIAL_ADMIN_USER_IDS=${admin.id}`,
      "",
    ].join("\n"),
    { mode: 0o600 },
  );
  exitCode = await runPlaywright();
} finally {
  await rm(workerEnvFile, { force: true });
  if (admin) await clerkClient.users.deleteUser(admin.id);
}

process.exitCode = exitCode;

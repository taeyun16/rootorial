import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["learning-flow.spec.ts", "linux-curriculum.spec.ts", "local-learning.spec.ts", "ui-improvements.spec.ts", "optimization-trace.spec.ts", "formula-explorers.spec.ts", "vector-fallback.spec.ts", "learning-path.spec.ts", "reading-resume.spec.ts", "foundation-path.spec.ts", "learning-audit-improvements.spec.ts", "subnet-keyboard.spec.ts", "focus-recovery.spec.ts", "initial-chapter-fragment.spec.ts", "linux-result-provenance.spec.ts", "route-evidence-alignment.spec.ts", "network-future-evidence.spec.ts"],
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: "http://localhost:3100", actionTimeout: 15_000, trace: "retain-on-failure", screenshot: "only-on-failure" },
  webServer: [
    { command: "node node_modules/vite/bin/vite.js dev --port 3100 --mode e2e-anonymous", url: "http://localhost:3100", timeout: 120_000, reuseExistingServer: false,
      env: { CLOUDFLARE_ENV: "e2e", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" } },
    { command: "node node_modules/vite/bin/vite.js dev --port 3101 --mode content-preview", url: "http://localhost:3101/admin/preview/curricula/", timeout: 120_000, reuseExistingServer: false,
      env: { CLOUDFLARE_ENV: "e2e", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" } },
  ],
  projects: [{ name: "anonymous-chromium", use: { ...devices["Desktop Chrome"] } }],
});

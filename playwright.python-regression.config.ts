import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: ["learning-flow.spec.ts", "local-learning.spec.ts"],
  grep: /runs Python and persists anonymous chapter progress|notebook compares a prediction/,
  workers: 1,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3213",
    channel: process.env.ROOTORIAL_PYTHON_BROWSER_CHANNEL,
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 3213 --mode e2e-anonymous",
      url: "http://127.0.0.1:3213",
      reuseExistingServer: true,
      timeout: 120_000,
      env: { CLOUDFLARE_ENV: "e2e", ROOTORIAL_PRIVATE_PREVIEW: "1", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" },
    },
    {
      command: "node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 3212 --mode content-preview",
      url: "http://127.0.0.1:3212/admin/preview/curricula/",
      reuseExistingServer: true,
      timeout: 120_000,
      env: { CLOUDFLARE_ENV: "e2e", ROOTORIAL_PRIVATE_PREVIEW: "1", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "" },
    },
  ],
  projects: [{ name: "python-regression-chromium", use: { ...devices["Desktop Chrome"] } }],
});

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report/runtime", open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3220",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.ROOTORIAL_BROWSER_EXECUTABLE ? { executablePath: process.env.ROOTORIAL_BROWSER_EXECUTABLE } : {},
  },
  webServer: [
    { command: "node scripts/local-runtime.mjs serve", url: "http://127.0.0.1:3220/admin/preview/curricula/", reuseExistingServer: false, timeout: 120_000 },
    { command: "node scripts/local-runtime.mjs serve 3222 e2e-anonymous", url: "http://127.0.0.1:3222/", reuseExistingServer: false, timeout: 120_000 },
  ],
  projects: [
    { name: "local-learning", testMatch: "local-learning.spec.ts", grepInvert: /public routes keep drafts/ },
    { name: "public-boundary", testMatch: "local-learning.spec.ts", grep: /public routes keep drafts/, use: { baseURL: "http://127.0.0.1:3222" } },
    { name: "local-python", testMatch: "python-runtime.spec.ts" },
  ],
});

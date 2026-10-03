import { defineConfig, devices } from "@playwright/test";

const publicMode = process.env.ROOTORIAL_RUNTIME_BROWSER_MODE === "e2e-anonymous";
const group = publicMode ? "public" : "learning";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  outputDir: `test-results/runtime-${group}`,
  reporter: [["list"], ["html", { outputFolder: `playwright-report/runtime-${group}`, open: "never" }]],
  use: {
    ...devices["Desktop Chrome"],
    baseURL: "http://127.0.0.1:3220",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    launchOptions: process.env.ROOTORIAL_BROWSER_EXECUTABLE ? { executablePath: process.env.ROOTORIAL_BROWSER_EXECUTABLE } : {},
  },
  webServer: {
    stdout: "pipe",
    command: `node scripts/local-runtime.mjs serve 3220 ${publicMode ? "e2e-anonymous" : "content-preview"}`,
    url: publicMode ? "http://127.0.0.1:3220/" : "http://127.0.0.1:3220/admin/preview/curricula/",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [
    { name: "local-learning", testMatch: "local-learning.spec.ts", grepInvert: /public routes keep drafts/ },
    { name: "public-boundary", testMatch: "local-learning.spec.ts", grep: /public routes keep drafts/ },
    { name: "local-python", testMatch: "python-runtime.spec.ts" },
  ],
});

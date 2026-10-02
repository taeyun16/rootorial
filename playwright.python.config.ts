import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "python-runtime.spec.ts",
  workers: 1,
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  timeout: 120_000,
  expect: { timeout: 20_000 },
  reporter: [["list"], ["html", { outputFolder: "playwright-report/python", open: "never" }]],
  use: { baseURL: "http://127.0.0.1:3212", trace: "retain-on-failure", screenshot: "only-on-failure", channel: process.env.ROOTORIAL_PYTHON_BROWSER_CHANNEL },
  webServer: {
    command: "node node_modules/vite/bin/vite.js dev --host 127.0.0.1 --port 3212 --mode content-preview",
    url: "http://127.0.0.1:3212/admin/preview/curricula/",
    reuseExistingServer: true,
    timeout: 120_000,
    env: { CLOUDFLARE_ENV: "e2e", ROOTORIAL_PRIVATE_PREVIEW: "1", CLERK_PUBLISHABLE_KEY: "", CLERK_SECRET_KEY: "", ROOTORIAL_ADMIN_USER_IDS: "" },
  },
  projects: [{ name: "python-chromium", use: { ...devices["Desktop Chrome"] } }],
});

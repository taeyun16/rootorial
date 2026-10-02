import { writeFile } from "node:fs/promises";
import { expect, test, type Locator, type Page } from "@playwright/test";

const vectorPath = "/admin/preview/curricula/transformer-from-zero/chapters/vectors?lang=en";
type NetworkEntry = { url: string; type: string; status?: number; failure?: string; contentType?: string };
const traffic = new WeakMap<object, NetworkEntry[]>();

test.beforeEach(async ({ context, baseURL }) => {
  const requests: NetworkEntry[] = [];
  traffic.set(context, requests);
  context.on("request", (request) => requests.push({ url: request.url(), type: request.resourceType() }));
  context.on("response", (response) => {
    const entry = requests.findLast((entry) => entry.url === response.url());
    if (entry) { entry.status = response.status(); entry.contentType = response.headers()["content-type"]; }
  });
  context.on("requestfailed", (request) => {
    const entry = requests.findLast((entry) => entry.url === request.url());
    if (entry) entry.failure = request.failure()?.errorText;
  });
  const origin = new URL(baseURL!).origin;
  // A cold browser is permitted to contact only the test server. This is a test
  // assertion and never changes browser security or substitutes a Python result.
  await context.route(/^https?:\/\//, (route) => {
    if (new URL(route.request().url()).origin === origin) return route.continue();
    return route.abort("blockedbyclient");
  });
});

test.afterEach(async ({ context, baseURL }, testInfo) => {
  const requests = traffic.get(context)!;
  const evidencePath = testInfo.outputPath("python-network.json");
  await writeFile(evidencePath, JSON.stringify(requests, null, 2));
  await testInfo.attach("python-network.json", { path: evidencePath, contentType: "application/json" });
  const external = requests.filter((request) => new URL(request.url).origin !== new URL(baseURL!).origin);
  expect(external, "Python execution and lesson loading must use only the local origin").toEqual([]);
});

async function openCell(page: Page) {
  await page.goto(vectorPath);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const cell = page.locator(".notebook-cell").first();
  await cell.getByRole("button", { name: "Show full code", exact: true }).click();
  return cell;
}

async function run(cell: Locator, code: string) {
  await cell.locator(".cm-content").fill(code);
  await cell.getByRole("button", { name: /^Run code:/ }).click();
}

test("runs both vector lessons with real NumPy, Matplotlib and local WASM assets", async ({ page, context }, testInfo) => {
  await page.goto(vectorPath);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const first = page.locator(".notebook-cell").first();
  await first.getByRole("button", { name: /^Run code:/ }).click();
  await expect(first.locator(".notebook-cell-output-text")).toContainText("shape: (2,)", { timeout: 90_000 });
  await expect(first.locator(".notebook-cell-figure img")).toBeVisible();
  await expect(first.locator(".notebook-cell-output-text")).not.toContainText(/Glyph.*missing from font/);
  expect(await first.locator(".notebook-cell-figure img").evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(100);
  const second = page.locator(".notebook-cell").nth(1);
  await second.getByRole("button", { name: /^Run code:/ }).click();
  await expect(second.locator(".notebook-cell-output-text")).toContainText(/90° -> cosine\s+0\.000/);
  await expect(second.locator(".notebook-cell-figure img")).toBeVisible();
  await expect(second.locator(".notebook-cell-output-text")).not.toContainText(/Glyph.*missing from font/);
  const requests = traffic.get(context)!;
  expect(requests.some((entry) => entry.url.endsWith("/pyodide.asm.wasm") && entry.status === 200 && entry.contentType === "application/wasm")).toBe(true);
  expect(requests.some((entry) => /numpy-.*\.whl$/.test(entry.url) && entry.status === 200)).toBe(true);
  expect(requests.some((entry) => /matplotlib-.*\.whl$/.test(entry.url) && entry.status === 200)).toBe(true);
  await testInfo.attach("vector-output.txt", { body: await first.locator(".notebook-cell-output-text").innerText() + "\n" + await second.locator(".notebook-cell-output-text").innerText(), contentType: "text/plain" });
});

test("reports actual stdout, stderr, expression results and Python errors, then reruns", async ({ page }) => {
  const cell = await openCell(page);
  await run(cell, 'import sys\nprint("stdout evidence")\nprint("stderr evidence", file=sys.stderr)\n6 * 7');
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("stdout evidence\nstderr evidence\n42", { timeout: 90_000 });
  await run(cell, 'print("before error")\nraise ValueError("real Python error")');
  await expect(cell).toHaveAttribute("data-status", "error");
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("before error");
  await expect(cell.locator(".notebook-cell-error")).toContainText("ValueError: real Python error");
  await expect(cell.locator(".notebook-cell-error-guidance")).toContainText("Check the value type");
  await run(cell, 'print("recovered")');
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("recovered");
  await expect(cell.locator(".notebook-cell-error")).toHaveCount(0);
});

test("compares predictions, invalidates edited and in-flight evidence, stops and restarts a clean interpreter", async ({ page }) => {
  const cell = await openCell(page);
  await cell.getByLabel(/Predict before running/).fill("2");
  await run(cell, "print(2)");
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("2", { timeout: 90_000 });
  await expect(cell.locator(".notebook-cell-comparison")).toContainText("My prediction before this run: 2");
  await cell.locator(".cm-content").fill("print(3)");
  await expect(cell).toHaveAttribute("data-evidence", "stale");
  await expect(cell.getByText("Previous output", { exact: true })).toBeVisible();
  await cell.getByRole("button", { name: /^Run code:/ }).click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("3");
  await expect(cell).toHaveAttribute("data-evidence", "current");

  await run(cell, 'import time\ntime.sleep(2)\nprint("old input")');
  await expect(cell).toHaveAttribute("data-status", "running");
  await cell.locator(".cm-content").fill('print("new input")');
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("old input");
  await expect(cell).toHaveAttribute("data-evidence", "stale");
  await cell.getByRole("button", { name: /^Run code:/ }).click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("new input");
  await expect(cell).toHaveAttribute("data-evidence", "current");

  await run(cell, "old_kernel_value = 123\nwhile True: pass");
  await expect(cell).toHaveAttribute("data-status", "running");
  await cell.getByRole("button", { name: /^Stop code:/ }).click();
  await expect(cell).toHaveAttribute("data-status", "stopped");
  await run(cell, 'print("fresh", "old_kernel_value" in globals())');
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("fresh False", { timeout: 90_000 });
  await cell.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(cell).toHaveAttribute("data-evidence", "unexecuted");
  await expect(cell.locator(".notebook-cell-output-text")).toHaveCount(0);
});

test("explains missing local assets and recovers when they become available", async ({ page, context }) => {
  await context.route("**/python-runtime/manifest.json", (route) => route.abort("failed"));
  const cell = await openCell(page);
  await run(cell, "print(42)");
  await expect(cell).toHaveAttribute("data-status", "error");
  await expect(cell.locator(".notebook-cell-error")).toContainText("npm run python:prepare");
  await expect(cell.locator(".notebook-cell-error-guidance")).toContainText("Python assets");
  await context.unroute("**/python-runtime/manifest.json");
  await cell.getByRole("button", { name: /^Run code:/ }).click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("42", { timeout: 90_000 });
});

test("reports an unprepared package without falling back to an external package source", async ({ page }) => {
  const cell = await openCell(page);
  await run(cell, "import pandas as pd\nprint(pd.__version__)");
  await expect(cell).toHaveAttribute("data-status", "error", { timeout: 90_000 });
  await expect(cell.locator(".notebook-cell-error")).toContainText("Python package assets");
  await run(cell, "import numpy as np\nprint(np.arange(3).tolist())");
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("[0, 1, 2]");
});

for (const [asset, mode] of [
  ["pyodide.asm.wasm", "404"],
  ["python_stdlib.zip", "404"],
  ["pyodide-lock.json", "404"],
  ["pyodide.asm.wasm", "network"],
] as const) {
  test(`reports bootstrap ${asset} ${mode} promptly and retries real Python in the same cell`, async ({ page, context }) => {
    const pattern = `**/${asset}`;
    await context.route(pattern, (route) => mode === "404"
      ? route.fulfill({ status: 404, contentType: "text/plain", body: "Injected missing local asset" })
      : route.abort("failed"));
    const cell = await openCell(page);
    await run(cell, "print(42)");
    await expect(cell).toHaveAttribute("data-status", "error", { timeout: 10_000 });
    await expect(cell).toHaveAttribute("aria-busy", "false");
    await expect(cell.locator(".notebook-cell-error")).toContainText("npm run python:prepare");
    if (mode === "404") {
      await expect(cell.locator(".notebook-cell-error")).toContainText(`${asset} returned HTTP 404`);
    }
    await context.unroute(pattern);
    await cell.getByRole("button", { name: /^Run code:/ }).click();
    await expect(cell.locator(".notebook-cell-output-text")).toHaveText("42", { timeout: 90_000 });
    await expect(cell).toHaveAttribute("data-evidence", "current");
  });
}

test("bounds a stalled bootstrap on the main thread, discards its late fetch, and retries actual Python", async ({ page, context }) => {
  await page.clock.install();
  let markRequested!: () => void;
  const requested = new Promise<void>((resolve) => { markRequested = resolve; });
  let release!: () => void;
  const held = new Promise<void>((resolve) => { release = resolve; });
  const pattern = "**/pyodide.asm.wasm";
  await context.route(pattern, async (route) => {
    markRequested();
    await held;
    try { await route.continue(); } catch { /* The timed-out worker is already gone. */ }
  });
  const cell = await openCell(page);
  await run(cell, "print(42)");
  await requested;
  await expect(cell).toHaveAttribute("data-status", "loading");
  // Advance only the page watchdog clock. WASM/Python are never substituted.
  await page.clock.fastForward(180_001);
  await expect(cell).toHaveAttribute("data-status", "error");
  await expect(cell).toHaveAttribute("aria-busy", "false");
  await expect(cell.locator(".notebook-cell-error")).toContainText("timed out after 3 minutes");
  await context.unroute(pattern);
  release();
  await cell.getByRole("button", { name: /^Run code:/ }).click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("42", { timeout: 90_000 });
  await expect(cell).toHaveAttribute("data-status", "done");
});

test("renders both stock Korean lesson charts without missing glyph warnings", async ({ page }) => {
  await page.goto(vectorPath.replace("?lang=en", "?lang=ko"));
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  for (let index = 0; index < 2; index += 1) {
    const cell = page.locator(".notebook-cell").nth(index);
    await cell.locator(".notebook-cell-run").click();
    await expect(cell.locator(".notebook-cell-figure img")).toBeVisible({ timeout: 90_000 });
    await expect(cell.locator(".notebook-cell-output-text")).not.toContainText(/Glyph.*missing from font/);
  }
});

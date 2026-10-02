import { expect, test, type Page } from "@playwright/test";

const rehearsal = process.env.ROOTORIAL_REHEARSAL_URL ?? "http://localhost:3101";
const vectorPath = "/admin/preview/curricula/transformer-from-zero/chapters/vectors";

async function solveQuiz(page: Page) {
  for (const [id, answer] of [["orientation", "(3, 3)"], ["normalization", "정의되지 않는다"], ["tensor-shape", "[2, 4, 8]"], ["broadcast-shape", "[2, 4, 8]"], ["dot-product", "둘 다 0"]]) {
    await page.locator(`[data-question-id="${id}"]`).getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByRole("button", { name: "답 확인하기", exact: true }).click();
}

test("rehearses completion, invalidation, refresh and reset without account or analytics writes", async ({ page, request }) => {
  const writes: string[] = [];
  const identityRequests: string[] = [];
  page.on("request", (req) => {
    if (req.method() === "POST") writes.push(req.url());
    if (/clerk\.(accounts|com|dev)|clerk\./.test(req.url())) identityRequests.push(req.url());
  });
  await page.goto(`${rehearsal}/`);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.evaluate(() => {
    localStorage.setItem("rootorial-progress", '["linux-systems/shell-and-filesystem"]');
    localStorage.setItem("rootorial-progress:account:test-user", '["transformer-from-zero/training"]');
  });
  await page.getByRole("link", { name: "로컬 학습 · 전체 커리큘럼" }).click();
  await expect(page.locator(".local-preview-chapters .is-ready")).toHaveCount(32);
  await expect(page.locator(".local-preview-chapters .is-planned")).toHaveCount(8);
  await page.goto(rehearsal + vectorPath);
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const complete = page.getByRole("button", { name: /이 챕터 완료하기/ });
  await solveQuiz(page);
  await expect(page.locator('[data-check-purpose="core"] .concept-check-summary')).toContainText("남은 조건: 축 조립 세 연산 · shape 탐정 세 미션");
  await expect(complete).toBeDisabled();
  const shape = page.locator(".shape-debug-lab");
  for (const [i, answer] of ["(3,)", "(3, 3)", "[2, 3, 4]"].entries()) {
    const mission = shape.locator(".shape-debug-mission").nth(i);
    await mission.getByRole("button", { name: answer, exact: true }).click();
    await mission.getByRole("button", { name: "예측 확인하기" }).click();
  }
  const axis = page.locator(".axis-builder-lab");
  for (const [stage, answer] of [["새 축 만들기", "(2, 3)"], ["기존 축 늘리기", "(6,)"], ["축 없애기", "(3,)"]]) {
    await axis.getByRole("tab", { name: new RegExp(stage) }).click();
    await axis.getByRole("radio", { name: answer, exact: true }).check();
    await axis.getByRole("button", { name: "예측 확인", exact: true }).click();
  }
  await expect(complete).toBeEnabled();
  await page.locator('[data-question-id="orientation"]').getByRole("button", { name: "(3,)", exact: true }).click();
  await expect(complete).toBeDisabled();
  await solveQuiz(page);
  await expect(complete).toBeEnabled();
  await complete.click();
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await expect(page.getByText("챕터 완료", { exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress:rehearsal:v1"))).toBe('["transformer-from-zero/vectors"]');
  await page.getByRole("button", { name: "연습 진도 초기화", exact: true }).click();
  await expect(complete).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBe('["linux-systems/shell-and-filesystem"]');
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress:account:test-user"))).toBe('["transformer-from-zero/training"]');
  expect(writes).toEqual([]);
  expect(identityRequests).toEqual([]);
  expect((await request.post(`${rehearsal}/`, { data: {} })).status()).toBe(403);
});

test("public routes keep drafts and preview protected", async ({ request }) => {
  for (const path of ["/admin/preview/curricula/", vectorPath, "/curricula/transformer-from-zero/chapters/optimization", "/curricula/system-architecture/chapters/requirements-and-quality-attributes"]) {
    expect((await request.get(path)).status(), path).toBe(404);
  }
  expect((await request.get("/curricula/transformer-from-zero/chapters/vectors")).status()).toBe(200);
});

test("notebook compares a prediction, marks edits stale, stops, restarts and resets", async ({ page }) => {
  await page.goto(rehearsal + vectorPath + "?lang=en");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const cell = page.locator(".notebook-cell").first();
  await cell.getByLabel(/Predict before running/).fill("2");
  await cell.getByRole("button", { name: "Show full code", exact: true }).click();
  const editor = cell.locator(".cm-content");
  await editor.fill("print(2)");
  const run = cell.getByRole("button", { name: /^Run code:/ });
  await run.click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("2", { timeout: 90_000 });
  await expect(cell.locator(".notebook-cell-comparison")).toContainText("My prediction before this run: 2");
  await editor.fill("print(3)");
  await expect(cell).toHaveAttribute("data-evidence", "stale");
  await expect(cell.getByText("Previous output", { exact: true })).toBeVisible();
  await run.click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("3");
  await expect(cell).toHaveAttribute("data-evidence", "current");
  await editor.fill("while True: pass");
  await run.click();
  await cell.getByRole("button", { name: /^Stop code:/ }).click();
  await expect(cell).toHaveAttribute("data-status", "stopped");
  await editor.fill("print(4)");
  await run.click();
  await expect(cell.locator(".notebook-cell-output-text")).toHaveText("4", { timeout: 90_000 });
  await cell.getByRole("button", { name: "Reset", exact: true }).click();
  await expect(cell).toHaveAttribute("data-evidence", "unexecuted");
  await expect(cell.locator(".notebook-cell-output-text")).toHaveCount(0);
});

test("restores a saved section without restoring quiz evidence", async ({ page }) => {
  await page.goto(rehearsal + vectorPath + "?lang=en");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  await page.locator('.article-toc a[href="#tensor-shape"]').click();
  await expect(page.getByRole("link", { name: "Continue from your saved section" })).toHaveAttribute("href", "#tensor-shape");
  await page.reload();
  await expect(page.getByRole("link", { name: "Continue from your saved section" })).toHaveAttribute("href", "#tensor-shape");
  await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
  await page.getByRole("button", { name: "Reset practice progress" }).click();
  await expect(page.getByRole("link", { name: "Continue from your saved section" })).toHaveCount(0);
});

test("reports unavailable browser storage instead of claiming a durable save", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("rootorial-progress:rehearsal:v1", '["transformer-from-zero/vectors"]');
    Storage.prototype.setItem = () => { throw new DOMException("Storage disabled", "QuotaExceededError"); };
  });
  await page.goto(rehearsal + vectorPath + "?lang=en");
  await expect(page.getByText("Browser storage is unavailable. Progress lasts only on this page.")).toBeVisible();
  await expect(page.getByText("Progress saved in this browser.", { exact: true })).toHaveCount(0);
});

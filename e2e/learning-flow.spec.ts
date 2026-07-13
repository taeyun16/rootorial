import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("keeps the English chapter free of untranslated Korean UI", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByRole("link", { name: /View curriculum/ }).click();
  await page.getByRole("link", { name: "Start chapter one" }).click();
  await expect(page.getByRole("heading", { name: "Vectors and Tensors" })).toBeVisible();
  await expect(page).toHaveTitle("01. Vectors and Tensors · Rootorial");

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (element.closest(".discussion-post-body")) continue;
      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const attributes = ["aria-label", "title", "placeholder"]
        .map((name) => element.getAttribute(name))
        .filter(Boolean)
        .join(" | ");
      const value = [ownText, attributes].filter(Boolean).join(" | ");
      if (/[가-힣]/.test(value)) rows.push(value);
    }
    return rows;
  });

  expect(untranslated).toEqual([]);
});

test("runs Python and persists anonymous chapter progress", async ({ page }) => {
  await page.goto("/curricula/transformer-from-zero/chapters/vectors");
  await clerk.loaded({ page });

  const firstCell = page.locator(".notebook-cell").first();
  await firstCell.getByRole("button", { name: /벡터를 만들고 크기와 방향 확인하기 실행$/ }).click();
  await expect(firstCell.locator(".notebook-cell-output-text")).toContainText(
    "shape: (2,)",
    { timeout: 90_000 },
  );
  await expect(firstCell.locator(".notebook-cell-figure img")).toBeVisible();

  await page.getByRole("radio", { name: "(3, 3)" }).check();
  await page.getByRole("radio", { name: "정의되지 않는다" }).check();
  const correctShapeAnswers = page.getByRole("radio", { name: "[2, 4, 8]", exact: true });
  await correctShapeAnswers.nth(0).check();
  await correctShapeAnswers.nth(1).check();
  await page.getByRole("radio", { name: "둘 다 0" }).check();
  await page.getByRole("button", { name: "답 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 이제 챕터를 완료할 수 있습니다.")).toBeVisible();
  await expect(page.locator(".answer-visual")).toHaveCount(5);
  await expect(page.getByText("그림으로 확인")).toHaveCount(5);

  await page.getByRole("button", { name: /이 챕터 완료하기/ }).click();
  await expect(page.getByText("진도가 이 브라우저에 저장되었습니다.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress")))
    .toBe('["transformer-from-zero/vectors"]');

  await page.reload();
  await clerk.loaded({ page });
  await expect(page.getByText("챕터 완료", { exact: true })).toBeVisible();
});

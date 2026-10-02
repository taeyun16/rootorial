import { expect, test } from "@playwright/test";
const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const chapters = ["vectors", "optimization", "neural-networks", "training", "embeddings", "sequences", "attention", "self-attention", "transformer-block", "mini-transformer"];
for (const width of [360, 390, 1440]) {
  test(`AI core links transfer keyboard focus across all ten chapters at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    for (const chapter of chapters) {
      await page.goto(`${preview}/admin/preview/curricula/transformer-from-zero/chapters/${chapter}?lang=en`);
      const first = page.locator(".learning-guide-start");
      await expect(first).toBeVisible();
      const href = await first.getAttribute("href");
      await first.focus();
      await first.press("Enter");
      await expect(page.locator(href!)).toBeFocused();
      const check = page.locator('.transformer-learning-guide-path ol a[href="#check"]');
      await check.focus();
      await check.press("Enter");
      await expect(page.locator("#check")).toBeFocused();
      await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
    }
  });
  test(`sequence safe recovery focuses a usable prediction control at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(`${preview}/admin/preview/curricula/transformer-from-zero/chapters/sequences?lang=en`);
    const lab = page.locator(".sequences-memory-lab");
    await lab.getByLabel("RNN recurrent gain", { exact: true }).fill("0");
    await lab.locator('[data-choice-value="faded"]').click();
    await lab.getByRole("button", { name: "Run sequence recurrence", exact: true }).click();
    await expect(lab.getByRole("alert")).toContainText("outside the contract");
    await lab.getByRole("button", { name: "Reset safely", exact: true }).click();
    const choice = lab.locator('[data-choice-value="retained"]');
    await expect(choice).toBeFocused();
    await expect(choice).toBeEnabled();
    await expect(lab.getByLabel("RNN recurrent gain", { exact: true })).toHaveValue("0.5");
    await choice.press("Space");
    await expect(choice).toHaveAttribute("aria-pressed", "true");
    await lab.getByRole("button", { name: "Run sequence recurrence", exact: true }).click();
    await expect(lab.locator(".sequences-trace-workspace")).toBeVisible();
    await expect(lab.getByRole("alert")).toHaveCount(0);
    await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
  });
}

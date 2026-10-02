import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const examples = [
  ["optimization", "finite-difference"],
  ["neural-networks", "sigmoid-bce"],
  ["embeddings", "cosine-angle"],
  ["transformer-block", "position-wave"],
  ["transformer-block", "layernorm-stages"],
] as const;

for (const width of [1440, 390]) {
  test(`formula explanations keep their numerical alternatives synchronized at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [chapter, id] of examples) {
      await page.goto(`${preview}/admin/preview/curricula/transformer-from-zero/chapters/${chapter}?lang=en`);
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
      const example = page.locator(`[data-formula-explorer="${id}"]`);
      const status = example.getByRole("status");
      await expect(status).toBeVisible();
      const before = await status.textContent();
      const slider = example.getByRole("slider").first();
      await slider.focus();
      await slider.press("ArrowLeft");
      await expect(status).not.toHaveText(before!);
      const keyboardResult = await status.textContent();
      const bounds = await slider.boundingBox();
      await slider.click({ position: { x: bounds!.width * .8, y: bounds!.height / 2 } });
      await expect(status).not.toHaveText(keyboardResult!);
      if (id === "cosine-angle") {
        await example.getByRole("slider", { name: "‖b‖" }).fill("0");
        await expect(status).toContainText("undefined (zero denominator)");
      }
      if (id === "layernorm-stages") {
        await example.getByRole("checkbox").check();
        await expect(status).toContainText("σ²=0");
        await expect(example.locator("tbody tr").last().locator("td")).toHaveText(["0", "0", "0", "0"]);
      }
      expect(await example.evaluate((el) => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    }
  });
}

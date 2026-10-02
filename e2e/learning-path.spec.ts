import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const route = (chapter: string) => `${preview}/admin/preview/curricula/transformer-from-zero/chapters/${chapter}?lang=en`;

test("optional depth preserves anchor navigation and leaves required sections open", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    for (const chapter of ["optimization", "neural-networks", "embeddings", "transformer-block"]) {
      await page.goto(route(chapter));
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
      const debug = page.locator("details.optional-learning-section").filter({ has: page.locator("#debug") });
      const practice = page.locator("details.optional-learning-section").filter({ has: page.locator("#practice") });
      await expect(debug).toHaveJSProperty("open", false);
      await expect(practice).toHaveJSProperty("open", false);
      await expect(page.locator("#check")).toBeVisible();
      const firstCore = page.getByRole("link", { name: "Go to the first required exercise" });
      const href = await firstCore.getAttribute("href");
      await firstCore.click();
      await expect(page.locator(href!)).toBeVisible();

      // Native summary works with a keyboard. Closing depth must not remove the section.
      const summary = debug.locator(":scope > summary");
      await summary.focus();
      await summary.press("Enter");
      await expect(debug).toHaveJSProperty("open", true);
      await summary.press("Enter");
      await expect(debug).toHaveJSProperty("open", false);
      await expect(page.locator("#debug")).toHaveCount(1);

      // A direct URL reveals the collapsed destination after hydration.
      await page.goto(route(chapter) + "#practice");
      await expect(practice).toHaveJSProperty("open", true);
      await expect(page.locator("#practice")).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth), `${chapter} at ${width}px`).toBeLessThanOrEqual(width + 1);
    }
  }
});

test("collapsing optional depth preserves answers and repeated same-hash navigation reopens it", async ({ page }) => {
  await page.goto(route("optimization") + "#debug");
  const debug = page.locator("details.optional-learning-section").filter({ has: page.locator("#debug") });
  await expect(debug).toHaveJSProperty("open", true);
  const firstIncident = page.locator(".optimization-debug-card").first();
  const action = firstIncident.locator('[data-choice-value="subtract-gradient"]');
  await action.click();
  const learningRate = firstIncident.getByRole("group", { name: "Learning rate η" }).getByRole("button").first();
  await learningRate.click();
  await firstIncident.getByRole("button", { name: "Run and grade update" }).click();
  const feedback = await firstIncident.locator(".optimization-debug-feedback").textContent();
  await debug.locator(":scope > summary").click();
  await expect(debug).toHaveJSProperty("open", false);
  // The hash is already #debug, so this must work even without a hashchange event.
  await page.locator('a[href="#debug"]').first().click();
  await expect(debug).toHaveJSProperty("open", true);
  await expect(action).toHaveAttribute("aria-pressed", "true");
  await expect(firstIncident.locator(".optimization-debug-feedback")).toHaveText(feedback!);
  await expect(page.locator("#check")).toBeVisible();
});

test("plain-language guide and expandable glossary work in both locales", async ({ page }) => {
  for (const lang of ["ko", "en"]) {
    await page.goto(route("optimization").replace("lang=en", `lang=${lang}`));
    const guide = page.locator(".transformer-learning-guide");
    await expect(guide.getByRole("link", { name: lang === "ko" ? "첫 필수 실습으로 이동" : "Go to the first required exercise" })).toBeVisible();
    await expect(guide.locator(".learning-lab-glossary")).toHaveJSProperty("open", false);
    await guide.locator(".learning-lab-glossary > summary").click();
    await expect(guide.locator(".learning-lab-glossary dd")).toHaveCount(5);
    await expect(guide.locator(".learning-lab-glossary")).toContainText(lang === "ko" ? "이 실습의 기준 상태" : "reference setup");
  }
});

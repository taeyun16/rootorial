import { expect, test } from "@playwright/test";

const url = "http://localhost:3101/admin/preview/curricula/transformer-from-zero/chapters/vectors?lang=en";
const key = "rootorial-progress:rehearsal:v1:resume";

for (const width of [1440, 390]) {
  test(`reading position saves user scroll, preserves initial resume and resets at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(url);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await page.evaluate((key) => localStorage.setItem(key, JSON.stringify({ chapterId: "transformer-from-zero/vectors", sectionId: "tensor-shape", updatedAt: Date.now() })), key);
    await page.reload();
    const resume = page.getByRole("link", { name: "Continue from your saved section" });
    await expect(resume).toHaveAttribute("href", "#tensor-shape");
    // Programmatic layout/restoration cannot overwrite the saved reading point.
    await page.locator("#dot-product").evaluate((node) => node.scrollIntoView());
    await page.evaluate(() => {
      // A hidden optional section after the current reading point must not win.
      const optional = document.createElement("details");
      optional.innerHTML = '<summary>Optional fixture</summary><section id="hidden-reading-fixture">Hidden content</section>';
      document.querySelector(".lesson-article")!.append(optional);
    });
    await page.waitForTimeout(900);
    await expect(resume).toHaveAttribute("href", "#tensor-shape");
    await page.mouse.move(width / 2, 350);
    await page.mouse.wheel(0, 60);
    await expect(resume).toHaveAttribute("href", "#dot-product");
    await page.reload();
    await expect(resume).toHaveAttribute("href", "#dot-product");
    await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
    await page.getByRole("button", { name: "Reset practice progress" }).click();
    await expect(resume).toHaveCount(0);
    expect(await page.evaluate((key) => localStorage.getItem(key), key)).toBeNull();
  });
}

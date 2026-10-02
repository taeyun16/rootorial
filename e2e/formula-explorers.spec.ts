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
      // Finite differences are part of the optional NumPy reproduction section.
      if (id === "finite-difference") await page.locator("details.optional-learning-section").filter({ has: example }).locator(":scope > summary").click();
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

for (const width of [360, 390, 1440]) for (const lang of ["ko", "en"]) {
  test("sigmoid mobile labels remain readable and separated at " + width + "px " + lang, async ({ browser }) => {
    const context = await browser.newContext({ viewport: { width, height: 900 }, isMobile: width < 600, hasTouch: width < 600 });
    const page = await context.newPage();
    try {
    await page.goto(preview + "/admin/preview/curricula/transformer-from-zero/chapters/neural-networks?lang=" + lang);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const example = page.locator('[data-formula-explorer="sigmoid-bce"]');
    await expect(example.getByRole("status")).toBeVisible();
    for (const svg of await example.locator(".formula-explorer-plot svg").all()) {
      const result = await svg.evaluate(node => {
        const box = node.getBoundingClientRect();
        const labels = [...node.querySelectorAll("text")].map(text => {
          const bounds = text.getBoundingClientRect();
          return { text: text.textContent, x: bounds.left, y: bounds.top, right: bounds.right, bottom: bounds.bottom,
            fontPx: parseFloat(getComputedStyle(text).fontSize) * text.getScreenCTM()!.a };
        });
        const clipped = labels.filter(label => label.x < box.left - 1 || label.right > box.right + 1 || label.y < box.top - 1 || label.bottom > box.bottom + 1);
        const overlaps = labels.flatMap((a, index) => labels.slice(index + 1).filter(b => a.x < b.right && a.right > b.x && a.y < b.bottom && a.bottom > b.y).map(b => [a.text, b.text]));
        return { minFont: Math.min(...labels.map(label => label.fontPx)), clipped, overlaps };
      });
      expect(result.clipped).toEqual([]);
      expect(result.overlaps).toEqual([]);
      if (width < 600) expect(result.minFont).toBeGreaterThanOrEqual(12);
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
    } finally { await context.close(); }
  });
}

test("rounded normalization uses approximation while exact coordinates retain equality", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const lang of ["ko", "en"]) {
    await page.goto(preview + "/admin/preview/curricula/transformer-from-zero/chapters/vectors?lang=" + lang);
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const lab = page.locator(".vector-basics-lab");
    await lab.getByRole("button", { name: lang === "ko" ? "벡터 v를 단위벡터로 정규화" : "normalize v to a unit vector", exact: true }).click();
    for (const [input, predicted, relation] of [[[1,1], [0.707,0.707], "approx"], [[3,4], [0.6,0.8], "exact"]] as const) {
      for (const index of [0, 1]) await lab.locator(".vector-basics-coordinate input").nth(index).fill(String(input[index]));
      for (const index of [0, 1]) await lab.locator(".vector-prediction-fields input").nth(index).fill(String(predicted[index]));
      await lab.locator(".vector-basics-reveal button").click();
      const proof = lab.locator(".unit-vector-plot-proof .math-formula");
      if (relation === "approx") {
        await expect(proof).toHaveAttribute("data-latex", /\\approx/);
        await expect(lab.locator(".vector-basics-answer")).toHaveAttribute("data-latex", /\\approx/);
        await expect(lab.locator(".unit-vector-rounding-note")).toBeVisible();
      } else {
        await expect(proof).toHaveAttribute("data-latex", / = 1$/);
        await expect(lab.locator(".vector-basics-answer")).toHaveAttribute("data-latex", /^= /);
        await expect(lab.locator(".unit-vector-rounding-note")).toHaveCount(0);
      }
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(391);
  }
});

import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const route = (track: string, chapter: string) => `${preview}/admin/preview/curricula/${track}/chapters/${chapter}`;

test("long chapter headings remain inside narrow viewports", async ({ page }) => {
  for (const width of [320, 360, 390, 768]) {
    await page.setViewportSize({ width, height: 844 });
    for (const chapter of ["veth-bridges-and-routing", "egress-nat-and-conntrack", "network-observability-and-capacity"]) {
      await page.goto(route("infrastructure-design", chapter));
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
      const geometry = await page.evaluate(() => ({ viewport: innerWidth, document: document.documentElement.scrollWidth }));
      expect(geometry.document, `${chapter} at ${width}px`).toBeLessThanOrEqual(geometry.viewport + 1);
    }
  }
});

test("vector predictions gate geometry and edits invalidate the displayed answer", async ({ page }) => {
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route("transformer-from-zero", "vectors") + "?lang=en");
    const lab = page.locator(".vector-basics-lab");
    const reveal = lab.getByRole("button", { name: "Prediction ready · reveal result" });
    await expect(reveal).toBeDisabled();
    await expect(lab.locator(".vector-operation-plot")).toHaveCount(0);
    await lab.getByLabel("Predicted x", { exact: true }).fill("6");
    await lab.getByLabel("Predicted y", { exact: true }).fill("-2");
    await reveal.click();
    await expect(lab).toHaveAttribute("data-evidence", "current");
    await expect(lab.locator(".vector-prediction-feedback")).toContainText("Your prediction matches.");
    await expect(lab.locator(".vector-operation-plot tbody tr").last()).toHaveText(/r6-2/);
    await lab.getByRole("button", { name: "y · 2", exact: true }).click();
    await expect(lab.locator("td.is-highlighted").last()).toHaveText("-2");
    await lab.locator('.vector-basics-coordinate input').first().fill("2");
    await expect(lab).toHaveAttribute("data-evidence", "stale");
    await expect(lab.locator(".vector-operation-plot")).toHaveCount(0);
    await expect(lab.getByText(/Inputs changed. Previous result/)).toBeVisible();
    await expect(reveal).toBeDisabled();
    await lab.getByRole("button", { name: "normalize v to a unit vector", exact: true }).click();
    await lab.locator('.vector-basics-coordinate input').nth(0).fill("0");
    await lab.locator('.vector-basics-coordinate input').nth(1).fill("0");
    await lab.getByLabel("Predict undefined", { exact: true }).check();
    await reveal.click();
    await expect(lab.locator(".vector-prediction-feedback")).toContainText("Your prediction matches.");
    await expect(lab.locator(".unit-vector-plot")).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
  }
});

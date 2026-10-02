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
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    await lab.getByRole("button", { name: "Reset experiment inputs", exact: true }).click();
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
    await expect(lab.getByText(/Current prediction has not run. Previous result/)).toBeVisible();
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

test("experiment inputs resume without restoring a prediction or completion", async ({ page }) => {
  await page.goto(route("transformer-from-zero", "vectors") + "?lang=en");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const lab = page.locator(".vector-basics-lab");
  await lab.locator('.vector-basics-coordinate input').first().fill("4");
  await lab.getByLabel("Predicted x", { exact: true }).fill("9");
  await lab.getByLabel("Predicted y", { exact: true }).fill("-2");
  await lab.getByRole("button", { name: "Prediction ready · reveal result" }).click();
  await page.reload();
  await expect(lab.locator('.vector-basics-coordinate input').first()).toHaveValue("4");
  await expect(lab.getByText(/Previous experiment inputs restored/)).toBeVisible();
  await expect(lab).toHaveAttribute("data-evidence", "unexecuted");
  await expect(lab.getByLabel("Predicted x", { exact: true })).toHaveValue("");
  await expect(lab.locator(".vector-operation-plot")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
  await lab.getByRole("button", { name: "Reset experiment inputs", exact: true }).click();
  await page.reload();
  await expect(lab.locator('.vector-basics-coordinate input').first()).toHaveValue("1");
  await expect(lab.getByText(/Previous experiment inputs restored/)).toHaveCount(0);
});

test("input drafts report storage failure without preventing exploration", async ({ page }) => {
  await page.addInitScript(() => { Storage.prototype.setItem = () => { throw new DOMException("Blocked", "QuotaExceededError"); }; });
  await page.goto(route("transformer-from-zero", "vectors") + "?lang=en");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const lab = page.locator(".vector-basics-lab");
  await lab.locator('.vector-basics-coordinate input').first().fill("4");
  await expect(lab.getByText(/Inputs cannot be saved/)).toBeVisible();
  await expect(lab.locator('.vector-basics-coordinate input').first()).toHaveValue("4");
  await page.reload();
  await expect(lab.locator('.vector-basics-coordinate input').first()).toHaveValue("1");
});

test("failed storage deletion still clears transient prediction evidence", async ({ page }) => {
  await page.goto(route("transformer-from-zero", "vectors") + "?lang=en");
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const lab = page.locator(".vector-basics-lab");
  await lab.locator('.vector-basics-coordinate input').first().fill("2");
  await lab.getByLabel("Predicted x", { exact: true }).fill("7");
  await lab.getByLabel("Predicted y", { exact: true }).fill("-2");
  await lab.getByRole("button", { name: "Prediction ready · reveal result" }).click();
  await page.evaluate(() => { Storage.prototype.removeItem = () => { throw new DOMException("Blocked", "SecurityError"); }; });
  await page.getByRole("button", { name: "Reset practice progress", exact: true }).click();
  await expect(lab.locator('.vector-basics-coordinate input').first()).toHaveValue("1");
  await expect(lab).toHaveAttribute("data-evidence", "unexecuted");
  await expect(lab.locator(".vector-operation-plot")).toHaveCount(0);
  await expect(lab.locator(".vector-prediction-feedback")).toHaveCount(0);
  await expect(lab.getByText(/Inputs cannot be saved/)).toBeVisible();
  await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
});

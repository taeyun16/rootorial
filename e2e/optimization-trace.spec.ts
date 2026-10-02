import { expect, test } from "@playwright/test";

const rehearsal = process.env.E2E_REHEARSAL_URL ?? "http://localhost:3101";
const path = "/admin/preview/curricula/transformer-from-zero/chapters/optimization?lang=en";

for (const width of [1440, 390]) {
  test(`connects loss points, selected weights and numeric evidence at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    const errors: string[] = [];
    page.on("pageerror", (error) => errors.push(error.message));
    await page.goto(rehearsal + path);
    const lab = page.locator(".optimization-descent-lab");
    await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1);
    const predict = (value: string) => lab.getByRole("group", { name: "Predicted loss trace" }).locator(`[data-choice-value="${value}"]`).click();
    const run = lab.getByRole("button", { name: "Run 12 updates", exact: true });
    await expect(run).toBeDisabled();
    await expect(lab.locator(".optimization-trace-explorer")).toHaveCount(0);
    await predict("diverging");
    await run.click();
    const selected = lab.locator(".optimization-selected-snapshot");
    const step = lab.getByRole("spinbutton", { name: "Selected update" });
    await expect(step).toHaveValue("12");
    await expect(lab.locator(".optimization-selectable-trace")).toContainText("log10(1 + loss)");
    await expect(lab.locator('[data-final-line-state="off-scale-below"]')).toHaveCount(1);

    // Numeric selection, keyboard buttons and chart taps share the same snapshot.
    await step.fill("0");
    await expect(selected).toContainText("W = [-2, -1]");
    await expect(selected).toContainText("∇L(W) = [-6, -4]");
    await expect(selected).toContainText("loss = 15");
    await expect(lab.getByRole("button", { name: "Previous update" })).toBeDisabled();
    await lab.getByRole("button", { name: "Next update" }).focus();
    await page.keyboard.press("Enter");
    await expect(step).toHaveValue("1");
    await expect(selected).toContainText("W = [4.6, 3.4]");
    await expect(selected).toContainText("∇L(W) = [7.2, 1.867]");
    await expect(selected).toContainText("loss = 14.267");
    await expect(lab.locator('svg[data-selected-step="1"]')).toContainText("solid: selected update 1");
    const chart = lab.locator(".optimization-selectable-trace");
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await chart.click({ position: { x: box.width * 52 / 420, y: box.height / 2 } });
    await expect(step).toHaveValue("0");

    await lab.getByText("Numeric table of every update", { exact: true }).click();
    await expect(lab.locator(".optimization-numeric-trace tbody tr")).toHaveCount(13);
    await lab.getByRole("button", { name: "Select update 6", exact: true }).click();
    await expect(step).toHaveValue("6");
    await expect(lab.locator('svg[data-selected-step="6"]')).toHaveCount(1);
    await expect(lab.getByRole("button", { name: "Select update 6", exact: true })).toHaveAttribute("aria-pressed", "true");
    expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
    await lab.getByText("Numeric table of every update", { exact: true }).click();
    await lab.locator(".optimization-trace-explorer").evaluate((element) => {
      window.scrollTo(0, element.getBoundingClientRect().top + window.scrollY - 120);
    });
    await lab.locator(".optimization-trace-explorer").screenshot({ path: test.info().outputPath(`optimization-trace-${width}.png`) });

    // Selecting a calculated step does not change mastery; changing input does.
    await lab.getByRole("button", { name: /Useful/ }).click();
    await expect(lab.locator(".optimization-trace-explorer")).toHaveCount(0);
    await expect(run).toBeDisabled();
    await predict("converging");
    await run.click();
    await expect(lab.locator(".optimization-evidence .is-complete")).toHaveCount(3);
    await step.fill("0");
    await expect(lab.locator(".optimization-evidence .is-complete")).toHaveCount(3);

    // Exact solution keeps zero loss finite on the log10(1 + loss) axis.
    await lab.getByRole("spinbutton", { name: "Starting bias" }).fill("1");
    await lab.getByRole("spinbutton", { name: "Starting slope" }).fill("2");
    await expect(lab.locator(".optimization-trace-explorer")).toHaveCount(0);
    await expect(lab.locator(".optimization-evidence .is-complete")).toHaveCount(2);
    await predict("converging");
    await run.click();
    await expect(selected).toContainText("loss = 0");
    expect(await chart.locator("polyline").getAttribute("points")).not.toMatch(/NaN|Infinity/);
    await lab.getByRole("button", { name: "Reset lab", exact: true }).click();
    await expect(lab.locator(".optimization-trace-explorer")).toHaveCount(0);
    await expect(run).toBeDisabled();
    expect(errors).toEqual([]);
  });
}

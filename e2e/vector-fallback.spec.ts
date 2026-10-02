import { expect, test } from "@playwright/test";

test.use({ baseURL: process.env.ROOTORIAL_REHEARSAL_ORIGIN ?? "http://localhost:3101" });
const vectorPath = "/admin/preview/curricula/transformer-from-zero/chapters/vectors";

for (const width of [390, 1440]) {
  test(`WebGL fallback preserves vector learning with taps, keys and numbers at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    await page.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (type: string, ...args: unknown[]) {
        if (type.startsWith("webgl") || type === "experimental-webgl") return null;
        return Reflect.apply(original, this, [type, ...args]);
      } as typeof original;
    });
    await page.goto(vectorPath);
    const stage = page.locator("#chapter-learning-preview");
    const plane = stage.getByRole("application", { name: "2D 벡터 좌표 평면" });
    await expect(plane).toBeVisible();
    await stage.getByRole("spinbutton", { name: "2D 벡터 x 좌표" }).fill("0");
    await stage.getByRole("spinbutton", { name: "2D 벡터 y 좌표" }).fill("0");
    await expect(stage.locator(".concept-stage-metrics dd").nth(1)).toHaveText("0.00");
    await expect(stage.locator(".concept-stage-output")).toContainText("nan");
    await plane.focus();
    await plane.press("Shift+ArrowRight");
    await expect(stage.getByRole("spinbutton", { name: "2D 벡터 x 좌표" })).toHaveValue("0.5");
    await expect(stage.locator(".concept-stage-metrics dd").nth(1)).toHaveText("0.50");
    await expect(stage.locator(".concept-stage-output")).toContainText("array([0.50, 0.00])");
    // A single click/tap changes the position; dragging is not required.
    await plane.click({ position: { x: 160, y: 60 } });
    await expect(stage.getByRole("spinbutton", { name: "2D 벡터 y 좌표" })).not.toHaveValue("0");
    await stage.getByRole("button", { name: "초기화", exact: true }).click();
    await expect(stage.locator(".concept-stage-output")).toContainText("array([1.63, 1.15])");
    await expect(plane).toBeFocused();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  });
}

test("data saver keeps a working 2D scene without loading Three.js", async ({ page }) => {
  const threeRequests: string[] = [];
  page.on("request", (request) => { if (/three[._]|\/three\//i.test(request.url())) threeRequests.push(request.url()); });
  await page.addInitScript(() => Object.defineProperty(navigator, "connection", { value: { saveData: true }, configurable: true }));
  await page.goto(vectorPath);
  const stage = page.locator("#chapter-learning-preview");
  await expect(stage.getByText("데이터 절약 모드: 2D 좌표로 탐색합니다.")).toBeVisible();
  await stage.getByRole("spinbutton", { name: "2D 벡터 x 좌표" }).fill("-2");
  await stage.getByRole("spinbutton", { name: "2D 벡터 y 좌표" }).fill("0");
  await expect(stage.locator(".concept-stage-metrics dd").nth(1)).toHaveText("2.00");
  await expect(stage.locator(".concept-stage-metrics dd").nth(2)).toHaveText("180.0°");
  await expect(stage.locator(".concept-stage-output")).toContainText("array([-2.00, 0.00])");
  expect(threeRequests).toEqual([]);
});

for (const [slug, className] of [
  ["transformer-block", ".transformer-block-workbench"],
  ["self-attention", ".self-attention-workbench"],
  ["mini-transformer", ".mini-transformer-workbench"],
]) {
  test(`${slug} action names contain their visible labels`, async ({ page }) => {
    await page.goto(`/admin/preview/curricula/transformer-from-zero/chapters/${slug}`);
    const buttons = page.locator(`${className} .button[aria-label]`);
    await expect(buttons.first()).toBeVisible();
    for (const button of await buttons.all()) {
      const text = (await button.innerText()).trim();
      await expect(button).toHaveAccessibleName(new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
  });
}

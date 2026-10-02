import { expect, test } from "@playwright/test";
const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const targets = [
  ["boot-to-shell", "real-kernel"], ["processes-and-signals", "incidents"],
  ["users-and-permissions", "real-linux"], ["memory-and-virtual-addresses", "real-linux"],
  ["storage-and-filesystems", "real-linux"], ["networking-from-a-packet", "real-linux"],
  ["assemble-a-tiny-linux", "real-linux"],
];
const url = (chapter: string, id: string) => `${preview}/admin/preview/curricula/linux-systems/chapters/${chapter}?lang=en#${id}`;
const distance = (node: HTMLElement) => Math.abs(node.getBoundingClientRect().top - (parseFloat(getComputedStyle(node).scrollMarginTop) || 0));
for (const width of [360, 390, 1440]) {
  for (const [chapter, id] of targets) {
    test(`initial ${chapter} fragment settles and receives focus at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto(url(chapter, id));
      const target = page.locator(`#${id}`);
      await expect(target).toBeFocused();
      await expect.poll(() => target.evaluate(distance)).toBeLessThanOrEqual(2);
      await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
    });
  }
  test(`initial fragment follows late layout once and stops after user scroll at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto(url("boot-to-shell", "real-kernel"));
    const target = page.locator("#real-kernel");
    await expect(target).toBeFocused();
    await expect.poll(() => target.evaluate(distance)).toBeLessThanOrEqual(2);
    await page.evaluate(() => {
      const spacer = document.createElement("div"); spacer.id = "late-layout-fixture"; spacer.style.height = "500px";
      const parent = document.querySelector<HTMLElement>(".continuous-chapter-frame")!;
      parent.insertBefore(spacer, parent.firstChild);
    });
    await expect.poll(() => target.evaluate(distance)).toBeLessThanOrEqual(2);
    await page.mouse.move(width / 2, 700);
    await page.mouse.wheel(0, 250);
    await expect.poll(() => target.evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(0);
    await page.evaluate(() => { document.getElementById("late-layout-fixture")!.style.height = "900px"; });
    await page.waitForTimeout(400);
    // Native scroll anchoring may adjust scrollY to preserve the reading position.
    // The initial-fragment helper must never bring the target back to its margin.
    expect(await target.evaluate(el => el.getBoundingClientRect().top)).toBeLessThan(0);
  });
}
test("a direct optional section opens before its initial fragment is focused", async ({ page }) => {
  await page.goto(`${preview}/admin/preview/curricula/transformer-from-zero/chapters/optimization?lang=en#debug`);
  const target = page.locator("#debug");
  await expect(target).toBeFocused();
  await expect(target.locator("xpath=ancestor::details")).toHaveJSProperty("open", true);
});

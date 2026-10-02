import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const route = `${preview}/admin/preview/curricula/linux-networking/chapters/subnets-neighbors-and-gateways?lang=en`;

for (const width of [360, 390, 1440]) {
  test(`subnet incident tabs support keyboard navigation and preserve repairs at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route);
    const lab = page.locator(".subnet-incident-lab");
    const tabs = lab.getByRole("tab");
    await expect(tabs).toHaveCount(4);
    const panel = lab.getByRole("tabpanel");
    await expect(panel).toHaveAttribute("id", /.+/);
    await expect(tabs.first()).toHaveAttribute("aria-controls", await panel.getAttribute("id") as string);
    await expect(panel).toHaveAttribute("aria-labelledby", await tabs.first().getAttribute("id") as string);
    await expect(lab.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);

    await lab.getByRole("button", { name: "Restore 10.20.0.2/24", exact: true }).click();
    await expect(tabs.first()).toHaveClass("is-active");
    await expect(lab.getByRole("status")).toContainText("You repaired exactly the broken boundary.");
    await tabs.first().focus();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.nth(1)).toBeFocused();
    await expect(tabs.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(tabs.first()).toHaveClass("is-solved");
    await expect(lab.getByRole("status")).toContainText("Execute the smallest repair supported by the evidence.");

    await page.keyboard.press("End");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("ArrowRight");
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await expect(tabs.last()).toBeFocused();
    await page.keyboard.press("Home");
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await expect(tabs.nth(1)).toBeFocused();
    await page.keyboard.press("ArrowUp");
    await expect(tabs.first()).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(lab.getByRole("button", { name: "Restore 10.20.0.2/24", exact: true })).toBeFocused();
    await expect(lab.locator('[role="tab"][tabindex="0"]')).toHaveCount(1);
    await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
  });
}

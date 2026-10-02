import { expect, test } from "@playwright/test";
const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
for (const width of [360, 390, 1440]) test(`route lookup commands, matching bars and destination stay aligned at ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 844 });
  await page.goto(`${preview}/admin/preview/curricula/linux-networking/chapters/routes-and-packet-paths?lang=en`);
  const figure = page.getByTestId("routes-and-packet-paths-figure");
  await expect(figure.locator(".ranked-bar-chart")).toHaveCount(0);
  await figure.locator('[data-choice-value="route"]').click();
  const candidates = figure.locator(".ranked-bar-chart > div");
  const destination = figure.locator('[data-node-id="remote"] .journey-node-detail');
  await expect(candidates).toHaveCount(2);
  await expect(figure.locator(".ranked-bar-chart .is-selected")).toHaveCount(0);
  await expect(figure.locator(".advanced-terminal")).toContainText("198.51.100.0/24");
  await figure.getByRole("button", { name: /02\s*Longest prefix/ }).click();
  await expect(destination).toHaveText("203.0.113.20");
  await expect(figure.locator(".advanced-terminal")).toContainText("ip route get 203.0.113.20");
  await expect(figure.locator(".ranked-bar-chart .is-selected code")).toHaveText("203.0.113.0/24");
  await figure.getByRole("button", { name: /03\s*Metric tie-break/ }).click();
  await expect(destination).toHaveText("198.51.100.8");
  await expect(candidates).toHaveCount(3);
  await expect(figure.locator(".ranked-bar-chart")).not.toContainText("203.0.113.0/24");
  await expect(figure.locator(".ranked-bar-chart .is-selected")).toContainText("198.51.100.0/24");
  await expect(figure.locator(".ranked-bar-chart .is-selected")).toContainText("metric 20");
  await expect(figure.locator(".advanced-facts")).toContainText("198.51.100.0/24");
  await expect(figure.locator(".advanced-terminal")).toContainText("198.51.100.8 via 10.20.0.1");
  for (const name of ["04First link", "05Router forwards", "06TTL expires"]) {
    await figure.getByRole("button", { name: new RegExp(name.replace(/^(\d{2})/, "$1\\s*")) }).click();
    await expect(destination).toHaveText("203.0.113.20");
    await expect(figure.locator(".advanced-terminal")).toContainText("203.0.113.20");
    await expect(candidates).toHaveCount(2);
  }
  await expect(figure).toHaveAttribute("data-mastered", "true");
  expect(await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)).toBeLessThanOrEqual(1);
});

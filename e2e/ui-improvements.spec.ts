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

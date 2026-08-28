import { expect, test, type Page } from "@playwright/test";
import { findUndersizedVisibleTouchTargets } from "./helpers/touch-targets";

function watchConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

test("citation sections meet 44px touch target and console error requirements", async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);
  
  await page.goto("/admin/preview/curricula/transformer-from-zero/chapters/attention");
  
  const citationSection = page.locator(".citation-section");
  await expect(citationSection).toBeVisible();
  
  const citationHeading = citationSection.getByRole("heading", { name: /더 알아보기|Learn More/ });
  await expect(citationHeading).toBeVisible();
  
  const citationLinks = citationSection.locator(".citation-link");
  await expect(citationLinks).toHaveCount(3);
  
  await expect(citationLinks.first()).toHaveAttribute("target", "_blank");
  await expect(citationLinks.first()).toHaveAttribute("rel", "noopener noreferrer");
  
  const externalIcons = citationSection.locator(".external-link-icon");
  await expect(externalIcons).toHaveCount(3);
  
  const undersizedTargets = await findUndersizedVisibleTouchTargets(
    page.locator(".lesson-article"),
    44,
  );
  expect(undersizedTargets).toEqual([]);
  
  expect(consoleErrors).toEqual([]);
});

test("citation sections display on Linux infrastructure chapters", async ({ page }) => {
  const consoleErrors = watchConsoleErrors(page);
  
  await page.goto("/admin/preview/curricula/linux-networking/chapters/interfaces-addresses-and-loopback");
  
  const citationSection = page.locator(".citation-section");
  await expect(citationSection).toBeVisible();
  
  const citationLinks = citationSection.locator(".citation-link");
  await expect(citationLinks.first()).toBeVisible();
  
  await expect(citationLinks.first()).toHaveAttribute("href");
  await expect(citationLinks.first()).toHaveAttribute("target", "_blank");
  
  const undersizedTargets = await findUndersizedVisibleTouchTargets(
    page.locator(".lesson-article"),
    44,
  );
  expect(undersizedTargets).toEqual([]);
  
  expect(consoleErrors).toEqual([]);
});

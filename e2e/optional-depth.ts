import { expect, type Page } from "@playwright/test";

export async function openOptionalDepth(page: Page, sectionId: "debug" | "practice") {
  const details = page.locator("details.optional-learning-section").filter({ has: page.locator(`#${sectionId}`) });
  await expect(details).toHaveCount(1);
  if (!(await details.evaluate((element) => (element as HTMLDetailsElement).open))) {
    await details.locator(":scope > summary").click();
  }
  await expect(page.locator(`#${sectionId}`)).toBeVisible();
}

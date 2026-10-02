import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const route = (slug: string, lang = "en") => preview + "/admin/preview/curricula/transformer-from-zero/chapters/" + slug + "?lang=" + lang;

for (const width of [360, 390, 1440]) {
  test("foundation transfer: hidden answers, keyboard retry, stale grading and resume at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    for (const [slug, correct, wrong] of [["vectors", "[0.6, -0.3]", "[0.2, −0.1]"], ["optimization", "[0.1, 0.05]", "[−0.1, −0.05]"], ["neural-networks", "[5,4] · [4,3] · [5,3]", "[5,4] · [4,1] · [5,1]"]]) {
      await page.goto(route(slug));
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
      await page.locator("details.optional-learning-section").filter({ has: page.locator(".learning-guide-prerequisites") }).locator(":scope > summary").click();
      await expect(page.locator(".learning-guide-prerequisites")).toBeVisible();
      const transfer = page.locator(".foundation-transfer-check");
      await expect(transfer.locator(".concept-feedback")).toHaveCount(0);
      await expect(transfer.locator("svg, .foundation-transfer-result, .foundation-transfer-shapes")).toHaveCount(0);
      await expect(transfer.getByRole("button", { name: "Check transfer prediction" })).toBeDisabled();
      await transfer.getByRole("button", { name: wrong, exact: true }).click();
      const submit = transfer.getByRole("button", { name: "Check transfer prediction" });
      await submit.focus(); await submit.press("Enter");
      await expect(transfer.locator(".concept-feedback-incorrect")).toBeVisible();
      const review = transfer.locator(".concept-review-link");
      const href = await review.getAttribute("href");
      await review.click();
      await expect(page.locator(href!)).toBeVisible();
      const option = transfer.getByRole("button", { name: correct, exact: true });
      await option.focus(); await option.press("Space");
      await expect(transfer.locator(".concept-feedback")).toHaveCount(0);
      await submit.focus(); await submit.press("Space");
      await expect(transfer.locator(".concept-feedback-correct")).toBeVisible();
      const next = transfer.getByRole("link", { name: "Next action: apply in the concept check" });
      await next.focus();
      await next.press("Enter");
      const check = page.locator("#check");
      await expect(check).toBeFocused();
      await expect(check).toBeVisible();
      await page.keyboard.press("Tab");
      await expect(check.locator("button:not([disabled])").first()).toBeFocused();
      await expect(page.getByRole("button", { name: /Complete this chapter/ })).toBeDisabled();
      // An edited answer revokes the successful handoff until re-submitted.
      await transfer.getByRole("button", { name: wrong, exact: true }).click();
      await expect(next).toHaveCount(0);
      await expect(transfer.locator(".concept-feedback")).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width + 1);
      // Stop and return: keep the section; do not claim the answer was saved.
      await page.goto(preview + "/admin/preview/curricula/");
      await page.goto(route(slug));
      const resume = page.getByRole("link", { name: "Continue from your saved section" });
      await expect(resume).toHaveAttribute("href", "#check");
      await resume.click();
      await expect(transfer.locator(".concept-feedback")).toHaveCount(0);
      await page.getByRole("button", { name: "Reset practice progress", exact: true }).click();
      await expect(resume).toHaveCount(0);
    }
  });

  test("vector wrong prediction can be corrected with unchanged inputs at " + width + "px", async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto(route("vectors"));
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const lab = page.locator(".vector-basics-lab");
    const inputs = lab.locator(".vector-basics-inputs input");
    await expect(inputs).toHaveCount(4);
    const before = await inputs.evaluateAll(nodes => nodes.map(node => (node as HTMLInputElement).value));
    await lab.getByRole("spinbutton", { name: "Predicted x" }).fill("0");
    await lab.getByRole("spinbutton", { name: "Predicted y" }).fill("0");
    await lab.getByRole("button", { name: /reveal result/ }).click();
    await expect(lab.locator(".vector-prediction-feedback")).toContainText("Compare the differing coordinates");
    const retry = lab.getByRole("button", { name: "Predict again with the same inputs" });
    await retry.focus(); await retry.press("Enter");
    await expect(lab.getByRole("spinbutton", { name: "Predicted x" })).toBeFocused();
    expect(await inputs.evaluateAll(nodes => nodes.map(node => (node as HTMLInputElement).value))).toEqual(before);
    await expect(lab.locator(".vector-operation-plot")).toHaveCount(0);
    await lab.getByRole("spinbutton", { name: "Predicted x" }).fill("6");
    await lab.getByRole("spinbutton", { name: "Predicted y" }).fill("-2");
    await lab.getByRole("button", { name: /reveal result/ }).click();
    await expect(lab.locator(".vector-prediction-feedback")).toContainText("Your prediction matches");
    await inputs.first().fill("2");
    await expect(lab).toHaveAttribute("data-evidence", "stale");
    await expect(lab.getByRole("button", { name: /reveal result/ })).toBeDisabled();
  });
}

test("three chapters navigate consecutively and Korean transfer remains actionable", async ({ page }) => {
  await page.goto(route("vectors"));
  await page.locator(".chapter-bottom-nav").getByRole("link", { name: /Next: Learning and Optimization/ }).click();
  await expect(page).toHaveURL(/chapters\/optimization/);
  await page.locator(".chapter-bottom-nav").getByRole("link", { name: /Next: Classification and Neural Networks/ }).click();
  await expect(page).toHaveURL(/chapters\/neural-networks/);
  for (const slug of ["vectors", "optimization", "neural-networks"]) {
    await page.goto(route(slug, "ko"));
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    const transfer = page.locator(".foundation-transfer-check");
    await expect(transfer.locator(".concept-feedback")).toHaveCount(0);
    await transfer.locator(".concept-option").first().click();
    await expect(transfer.locator(".concept-option").first()).toHaveAttribute("aria-pressed", "true");
    await transfer.getByRole("button", { name: "전이 예측 확인" }).click();
    const next = transfer.getByRole("link", { name: "다음 행동: 이해 확인에 적용" });
    await next.focus();
    await next.press("Enter");
    const check = page.locator("#check");
    await expect(check).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(check.locator("button:not([disabled])").first()).toBeFocused();
  }
});

test("negative-prefix typing stays editable and Korean operation labels are localized", async ({ page }) => {
  await page.goto(route("vectors", "ko"));
  await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
  const lab = page.locator(".vector-basics-lab");
  await expect(lab.getByRole("button", { name: "벡터 v와 w 더하기", exact: true })).toBeVisible();
  await expect(lab.getByRole("button", { name: "벡터 v에서 w 빼기", exact: true })).toBeVisible();
  await expect(lab.getByRole("button", { name: "벡터 v에 스칼라 곱하기", exact: true })).toBeVisible();
  await expect(lab.getByRole("button", { name: "벡터 v를 단위벡터로 정규화", exact: true })).toBeVisible();
  const x = lab.locator(".vector-basics-coordinate input").first();
  await x.fill("");
  await x.press("-");
  await expect(x).toHaveAttribute("aria-invalid", "true");
  await expect(lab.locator(".vector-basics-reveal button")).toBeDisabled();
  await x.press("3");
  await expect(x).toHaveValue("-3");
  await expect(x).toHaveAttribute("aria-invalid", "false");
  await x.fill("");
  await lab.getByRole("button", { name: "실험 입력 초기화" }).click();
  await expect(x).toHaveValue("1");
  await expect(x).toHaveAttribute("aria-invalid", "false");
});

import { expect, test } from "@playwright/test";

const preview = process.env.CONTENT_PREVIEW_URL ?? "http://localhost:3101";
const route = (curriculum: string, chapter: string) => `${preview}/admin/preview/curricula/${curriculum}/chapters/${chapter}`;

for (const width of [360, 390, 1440]) {
  test(`first action reaches the task with keyboard focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: width === 1440 ? 1000 : 800 });
    for (const [curriculum, chapter, target] of [
      ["transformer-from-zero", "vectors", "vector-first-action"],
      ["transformer-from-zero", "optimization", "descent"],
      ["transformer-from-zero", "neural-networks", "xor-lab"],
      ["linux-systems", "shell-and-filesystem", "practice"],
      ["linux-networking", "interfaces-addresses-and-loopback", "required-figure"],
      ["infrastructure-design", "network-namespaces-and-boundaries", "namespace-topology-lab"],
    ]) {
      await page.goto(route(curriculum, chapter));
      await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
      const start = page.locator(".lesson-first-action").first();
      await expect(start).toBeInViewport();
      await start.focus();
      await start.press("Enter");
      await expect(page.locator(`#${target}`)).toBeFocused();
      await expect(page).toHaveURL(new RegExp(`#${target}$`));
    }
  });

  test(`optional NumPy depth preserves code, history and focus at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    for (const [chapter, id] of [["optimization", "numpy-check"], ["neural-networks", "numpy-bridge"]]) {
      await page.goto(route("transformer-from-zero", chapter));
      const depth = page.locator("details.optional-learning-section").filter({ has: page.locator(`#${id}`) });
      await expect(depth).toHaveJSProperty("open", false);
      await page.locator(`.article-toc a[href="#${id}"]`).click();
      await expect(page.locator(`#${id}`)).toBeFocused();
      const cell = depth.locator(".notebook-cell").first();
      await cell.getByRole("button", { name: "전체 코드 보기", exact: true }).click();
      await cell.locator(".cm-content").fill('print("kept draft")');
      await depth.locator(":scope > summary").click();
      await page.locator(`.article-toc a[href="#${id}"]`).click();
      await expect(cell.locator(".cm-content")).toHaveText('print("kept draft")');
      await page.locator(".lesson-first-action").click();
      await page.goBack();
      await expect(page.locator(`#${id}`)).toBeFocused();
      await expect(depth).toHaveJSProperty("open", true);
      await page.goForward();
      await page.goBack();
      await expect(cell.locator(".cm-content")).toHaveText('print("kept draft")');
    }
  });

  test(`retry shows submitted inputs and current unexecuted state at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(route("transformer-from-zero", "vectors"));
    const lab = page.locator(".vector-basics-lab");
    await lab.getByLabel("예측 x", { exact: true }).fill("0");
    await lab.getByLabel("예측 y", { exact: true }).fill("0");
    await expect(lab.locator(".attempt-comparison")).toHaveCount(0);
    await lab.getByRole("button", { name: "예측 완료 · 결과 보기" }).click();
    await lab.locator(".vector-basics-coordinate input").nth(2).fill("6");
    await expect(lab).toHaveAttribute("data-evidence", "stale");
    await expect(lab.locator(".attempt-comparison")).toHaveAttribute("data-current-result", "unexecuted");
    await expect(lab.locator(".attempt-comparison")).toContainText("[5, -4]");
    await expect(lab.locator(".attempt-comparison")).toContainText("[6, -4]");
    await lab.getByLabel("예측 x", { exact: true }).fill("7");
    await lab.getByLabel("예측 y", { exact: true }).fill("-2");
    await lab.getByRole("button", { name: "예측 완료 · 결과 보기" }).click();
    await expect(lab.locator(".attempt-comparison")).toContainText("[7, -2]");
    await expect(lab.locator(".attempt-comparison")).toHaveAttribute("data-current-result", "current");
  });

  test(`restored inputs do not invent completion and mobile return link is usable at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(route("transformer-from-zero", "vectors"));
    await page.locator(".vector-basics-coordinate input").nth(2).fill("6");
    await page.locator('.article-toc a[href="#tensor-shape"]').click();
    await page.reload();
    const resume = page.locator(".chapter-resume");
    await expect(resume).toContainText("완료 기록 없음");
    await expect(resume).toContainText("벡터 연산·좌표·스칼라");
    await expect(resume).toContainText("재확인할 답안");
    await expect(page.locator(".vector-basics-lab")).toHaveAttribute("data-evidence", "unexecuted");
    // Fixture represents an existing durable completion, separate from current answers.
    await page.evaluate(() => localStorage.setItem("rootorial-progress:rehearsal:v1", '["infrastructure-design/network-namespaces-and-boundaries"]'));
    await page.goto(route("infrastructure-design", "network-namespaces-and-boundaries"));
    const back = page.locator(".completed-return-link");
    await expect(back).toBeVisible();
    const rect = (await back.boundingBox())!;
    expect(rect.height).toBeGreaterThanOrEqual(44);
    expect(rect.width).toBeGreaterThanOrEqual(44);
    await back.focus();
    await expect(back).toBeFocused();
    await back.press("Enter");
    await expect(page).toHaveURL(/\/curricula\/infrastructure-design$/);
  });

  test(`firewall content stays inside the document at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 800 });
    await page.goto(route("infrastructure-design", "network-policy-and-firewalls"));
    await expect(page.locator("html")).toHaveAttribute("data-hydrated", "true");
    for (const id of ["hooks", "policy-lab", "check"]) {
      await page.locator(`#${id}`).scrollIntoViewIfNeeded();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    }
  });
}

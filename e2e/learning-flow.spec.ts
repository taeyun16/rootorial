import { clerk } from "@clerk/testing/playwright";
import { expect, test } from "@playwright/test";

test("starts the localized Three.js lesson preview from the landing page", async ({ page }) => {
  await page.goto("/?lang=en");

  const stage = page.getByTestId("rootorial-learning-scene").first();
  const canvas = stage.locator("canvas");
  await expect(page.getByRole("button", { name: "Try a 60-second lesson" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Start the first chapter" })).toHaveAttribute(
    "href",
    "/curricula/transformer-from-zero/chapters/vectors?lang=en",
  );
  await expect(canvas).toHaveAttribute("data-ready", "true");

  await page.getByRole("button", { name: "Try a 60-second lesson" }).click();
  await expect(canvas).toBeFocused();

  await page.getByRole("button", { name: "Pause motion" }).click();
  const vectorValue = stage.locator(".concept-stage-metrics dd").first();
  const before = await vectorValue.textContent();
  await canvas.press("ArrowRight");
  await expect(vectorValue).not.toHaveText(before ?? "");
});

test("keeps the English chapter free of untranslated Korean UI", async ({ page }) => {
  await page.goto("/?lang=en");
  await page.getByRole("link", { name: "Transformers from the Ground Up" }).click();
  await page.getByRole("link", { name: "Start chapter one" }).click();
  await expect(page.getByRole("heading", { name: "Vectors and Tensors" })).toBeVisible();
  await expect(page).toHaveTitle("01. Vectors and Tensors · Rootorial");

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      if (element.closest(".discussion-post-body")) continue;
      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const attributes = ["aria-label", "title", "placeholder"]
        .map((name) => element.getAttribute(name))
        .filter(Boolean)
        .join(" | ");
      const value = [ownText, attributes].filter(Boolean).join(" | ");
      if (/[가-힣]/.test(value)) rows.push(value);
    }
    return rows;
  });

  expect(untranslated).toEqual([]);
});

test("runs Python and persists anonymous chapter progress", async ({ page }) => {
  await page.goto("/curricula/transformer-from-zero/chapters/vectors");
  await clerk.loaded({ page });

  const firstCell = page.locator(".notebook-cell").first();
  await firstCell.getByRole("button", { name: /벡터를 만들고 크기와 방향 확인하기 실행$/ }).click();
  await expect(firstCell.locator(".notebook-cell-output-text")).toContainText(
    "shape: (2,)",
    { timeout: 90_000 },
  );
  await expect(firstCell.locator(".notebook-cell-figure img")).toBeVisible();

  const finishButton = page.getByRole("button", { name: /이 챕터 완료하기/ });
  await expect(finishButton).toBeDisabled();

  const shapeLab = page.locator(".shape-debug-lab");
  const shapeAnswers = ["(3,)", "(3, 3)", "[2, 3, 4]"];
  for (let index = 0; index < shapeAnswers.length; index += 1) {
    const mission = shapeLab.locator(".shape-debug-mission").nth(index);
    await mission.getByRole("button", { name: shapeAnswers[index], exact: true }).click();
    await mission.getByRole("button", { name: "예측 확인하기" }).click();
    await expect(mission).toHaveClass(/is-correct/);
  }
  await expect(shapeLab.getByText(/세 가지 shape 함정을 모두 해결했습니다/)).toBeVisible();
  await expect(finishButton).toBeDisabled();

  const axisLab = page.locator(".axis-builder-lab");
  const axisMissions = [
    { stage: "새 축 만들기", answer: "(2, 3)" },
    { stage: "기존 축 늘리기", answer: "(6,)" },
    { stage: "축 없애기", answer: "(3,)" },
  ];
  for (const mission of axisMissions) {
    await axisLab.getByRole("button", { name: mission.stage }).click();
    await axisLab.getByRole("radio", { name: mission.answer, exact: true }).check();
    await axisLab.getByRole("button", { name: "예측 확인", exact: true }).click();
    await expect(axisLab.getByText(/정확해요/)).toBeVisible();
  }
  await expect(axisLab.getByText("세 가지 축 연산을 모두 예측했습니다.")).toBeVisible();
  await expect(finishButton).toBeDisabled();

  await page.getByRole("radio", { name: "(3, 3)" }).check();
  await page.getByRole("radio", { name: "정의되지 않는다" }).check();
  await page.locator('input[name="tensor-shape"][value="2-4-8"]').check();
  await page.locator('input[name="broadcast-shape"][value="shape-kept"]').check();
  await page.getByRole("radio", { name: "둘 다 0" }).check();
  await page.getByRole("button", { name: "답 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 이제 챕터를 완료할 수 있습니다.")).toBeVisible();
  await expect(page.locator(".concept-question")).toHaveCount(5);
  await expect(page.locator('input[name="attention-context"]')).toHaveCount(0);
  await expect(page.locator(".answer-visual")).toHaveCount(5);
  await expect(page.getByText("그림으로 확인")).toHaveCount(5);
  await expect(finishButton).toBeEnabled();

  await finishButton.click();
  await expect(page.getByText("진도가 이 브라우저에 저장되었습니다.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress")))
    .toBe('["transformer-from-zero/vectors"]');

  await page.reload();
  await clerk.loaded({ page });
  await expect(page.getByText("챕터 완료", { exact: true })).toBeVisible();
});

test("keeps the vectors practice usable on a 390px reduced-motion viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/curricula/transformer-from-zero/chapters/vectors?lang=en");

  await expect(page.getByRole("heading", { name: "Vectors and Tensors" })).toBeVisible();
  const pageOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  );
  expect(pageOverflow).toBeLessThanOrEqual(1);

  const firstMission = page.locator(".shape-debug-mission").first();
  await firstMission.getByRole("button", { name: "(1, 3)", exact: true }).click();
  await firstMission.getByRole("button", { name: "Check prediction" }).click();
  await expect(firstMission).toHaveClass(/is-incorrect/);
  await expect(firstMission.getByText("Trace the axes once more", { exact: true })).toBeVisible();

  await firstMission.getByRole("button", { name: "(3,)", exact: true }).click();
  await firstMission.getByRole("button", { name: "Check prediction" }).click();
  await expect(firstMission).toHaveClass(/is-correct/);
  await expect(firstMission.getByText("Correct", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "Reset missions" }).click();
  await expect(firstMission).not.toHaveClass(/is-correct|is-incorrect/);
  await expect(page.locator(".shape-debug-progress strong")).toHaveText("0 / 3");
});

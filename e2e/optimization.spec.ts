import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/optimization";
const publicPath = "/curricula/transformer-from-zero/chapters/optimization";

async function signInAsAdmin(page: Parameters<typeof signInTestUser>[0]) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

async function completeLearningRateRepair(
  page: Parameters<typeof signInTestUser>[0],
) {
  const lab = page.locator(".optimization-descent-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const prediction = lab.getByRole("combobox", { name: "예상 loss trace" });
  const runButton = lab.getByRole("button", { name: "12회 실행" });
  await expect(runButton).toBeDisabled();

  await prediction.selectOption("converging");
  await runButton.click();
  await expect(lab.getByText(/예측: '안정적으로 수렴', 실제: '손실이 커지며 발산'/)).toBeVisible();

  await prediction.selectOption("diverging");
  await runButton.click();
  await expect(lab.getByText(/예측과 일치합니다: 손실이 커지며 발산/)).toBeVisible();
  await expect(lab.getByText("나쁜 학습률을 정확히 예측·관찰")).toHaveClass(/is-complete/);

  await lab.getByRole("spinbutton", { name: "시작 bias" }).fill("1");
  await lab.getByRole("combobox", { name: "업데이트 횟수" }).selectOption("8");
  await prediction.selectOption("converging");
  await lab.getByRole("button", { name: "8회 실행" }).click();
  await expect(lab.getByText(/시작 W 또는 업데이트 횟수가 달라 학습률 효과를 비교할 수 없습니다/)).toBeVisible();
  await expect(lab.getByText("안정적 수렴")).not.toHaveClass(/is-complete/);

  await lab.getByRole("button", { name: "안정적 · η 0.30" }).click();
  await expect(runButton).toBeDisabled();
  await prediction.selectOption("converging");
  await lab.getByRole("button", { name: "첫 업데이트 계산" }).click();
  await expect(lab.locator(".optimization-vector-strip")).toContainText("[-0.2, 0.2]");
  await runButton.click();
  await expect(lab.getByText("필수 실습 완료 — 실패한 학습률을 근거로 고쳐 손실을 안정적으로 줄였습니다.")).toBeVisible();
  await expect(lab.getByText("안정적 수렴")).toHaveClass(/is-complete/);
}

test("completes both optimization activities in the admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const optionalRuntimeRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/pyodide-worker.js")
      || request.url().includes("cdn.jsdelivr.net/pyodide")
    ) optionalRuntimeRequests.push(request.url());
  });

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 02. 학습과 최적화 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "학습과 최적화" })).toBeVisible();
  await expect(page.getByText("필수 실습 · LEARNING-RATE REPAIR", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · ONE-STEP DEBUGGER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "실제 NumPy에서 trace와 gradient 계약을 함께 확인하세요" })).toBeVisible();
  await expect(page.getByText("NumPy로 MSE gradient descent 실행", { exact: true })).toBeVisible();
  await expect(page.getByText("finite difference로 MSE gradient 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".optimization-notebook-section .notebook-cell")).toHaveCount(2);

  await completeLearningRateRepair(page);
  const descentLab = page.locator(".optimization-descent-lab");
  await descentLab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(descentLab.getByText("안정적 수렴")).not.toHaveClass(/is-complete/);
  await completeLearningRateRepair(page);

  const incidents = page.locator(".optimization-debug-card");
  const firstIncident = incidents.nth(0);
  await firstIncident.getByRole("combobox", { name: "optimizer 동작" }).selectOption("add-gradient");
  await firstIncident.getByRole("combobox", { name: "학습률 η" }).selectOption("0.25");
  await firstIncident.getByRole("button", { name: "업데이트 실행·판정" }).click();
  await expect(firstIncident.getByText("업데이트를 다시 설계하세요", { exact: true })).toBeVisible();
  await expect(firstIncident).toHaveClass(/is-incorrect/);

  const answers = [
    ["subtract-gradient", "0.25"],
    ["subtract-gradient", "0.25"],
    ["subtract-gradient", "0.05"],
    ["subtract-gradient", "0.25"],
  ] as const;
  for (let index = 0; index < answers.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox", { name: "optimizer 동작" }).selectOption(answers[index][0]);
    if (answers[index][1]) {
      await incident.getByRole("combobox", { name: "학습률 η" }).selectOption(answers[index][1]);
    }
    await incident.getByRole("button", { name: "업데이트 실행·판정" }).click();
    await expect(incident).toHaveClass(/is-correct/);
  }
  await expect(page.locator(".optimization-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="loss-role"][value="scalar-summary"]').check();
  await page.locator('input[name="gradient-direction"][value="subtract-gradient"]').check();
  await page.locator('input[name="learning-rate"][value="overshoot-diverge"]').check();
  await page.locator('input[name="gradient-shape"][value="same-as-weights"]').check();
  await page.locator('input[name="sse-mse-scale"][value="divide-by-batch-size"]').check();
  await page.getByRole("button", { name: "최적화 흐름 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  const checklist = page.locator(".optimization-completion-checklist");
  await expect(checklist.locator(".is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(optionalRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px and its public URL closed", async ({ page }) => {
  const optionalRuntimeRequests: string[] = [];
  page.on("request", (request) => {
    if (
      request.url().includes("/pyodide-worker.js")
      || request.url().includes("cdn.jsdelivr.net/pyodide")
    ) optionalRuntimeRequests.push(request.url());
  });

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${previewPath}?lang=en`);
  await expect(page.getByRole("heading", { name: "Learning and Optimization" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Check both the trace and gradient contract in real NumPy" })).toBeVisible();
  await expect(page.getByText("Repair the MSE gradient with finite differences", { exact: true })).toBeVisible();
  await expect(page.locator(".optimization-notebook-section .notebook-cell")).toHaveCount(2);

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
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

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  const notebookBounds = await page.locator(".optimization-notebook-section .notebook-cell").evaluateAll((cells) =>
    cells.map((cell) => {
      const rect = cell.getBoundingClientRect();
      return { left: rect.left, right: rect.right };
    }),
  );
  expect(notebookBounds.every(({ left, right }) => left >= 0 && right <= 390.5)).toBe(true);
  await expect(page.getByRole("img", { name: "Prediction line before and after updates" })).toHaveCount(0);

  await expect(page.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const lab = page.locator(".optimization-descent-lab");
  await lab.getByRole("combobox", { name: "Predicted loss trace" }).selectOption("diverging");
  await lab.getByRole("button", { name: "Run 12 updates" }).click();
  await expect(lab.getByRole("img", { name: /Prediction line before and after updates/ })).toBeVisible();
  await expect(lab.getByRole("img", { name: /Loss history by update/ })).toBeVisible();
  await expect(lab.locator('[data-final-line-state="off-scale-below"]')).toHaveCount(1);
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBeLessThanOrEqual(1);

  await lab.getByRole("spinbutton", { name: "Starting bias" }).fill("999");
  await expect(lab.getByRole("alert")).toContainText("Bias and slope must stay between -4 and 4.");
  await expect(lab.getByRole("spinbutton", { name: "Starting bias" })).toHaveValue("-2");

  const usefulPreset = page.getByRole("button", { name: "Useful · η 0.30" });
  await usefulPreset.focus();
  await usefulPreset.press("Enter");
  await expect(page.getByRole("slider", { name: "Learning rate" })).toHaveValue("0.3");
  await lab.getByRole("combobox", { name: "Predicted loss trace" }).selectOption("converging");
  const firstUpdate = lab.getByRole("button", { name: "Calculate first update" });
  await firstUpdate.focus();
  await firstUpdate.press("Enter");
  await expect(lab.getByText(/First update calculated — loss 15 → 3.6/)).toBeVisible();
  await expect(lab.locator('[data-final-line-state="visible"]')).toHaveCount(1);
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBeLessThanOrEqual(1);
  const resetLab = page.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(page.getByRole("slider", { name: "Learning rate" })).toHaveValue("1.1");

  const firstIncident = page.locator(".optimization-debug-card").first();
  await firstIncident.getByRole("combobox", { name: "Optimizer action" }).selectOption("add-gradient");
  await firstIncident.getByRole("combobox", { name: "Learning rate η" }).selectOption("0.25");
  await firstIncident.getByRole("button", { name: "Run and grade update" }).click();
  await expect(firstIncident.getByText("Redesign the update", { exact: true })).toBeVisible();
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Optimizer action" })).toHaveValue("");

  expect(optionalRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

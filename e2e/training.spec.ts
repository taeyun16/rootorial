import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/training";
const publicPath = "/curricula/transformer-from-zero/chapters/training";

type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchHeavyRuntimeRequests(page: TestPage) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = new URL(request.url());
    const path = url.pathname.toLowerCase();
    if (
      path.includes("/pyodide-worker.js")
      || url.hostname === "cdn.jsdelivr.net" && path.includes("/pyodide")
      || path.includes("/api/experiments/linux-assets/")
      || path.includes("/api/workers-ai/")
      || path.includes("/api/ai/")
      || /\.(?:wasm|onnx|safetensors|gguf)$/.test(path)
      || /\/(?:models?|webgpu)\//.test(path)
    ) requests.push(request.url());
  });
  return requests;
}

async function runBatch(
  lab: ReturnType<TestPage["locator"]>,
  prediction: string,
) {
  await lab.getByRole("combobox", {
    name: "다음 update의 batch와 전체 CE 방향",
  }).selectOption(prediction);
  const run = lab.getByRole("button", { name: "다음 mini-batch forward → Adam" });
  await run.click();
  await expect(lab.locator(".training-prediction-fieldset .button-primary")).toBeFocused();
}

test("completes mini-batch training, four repairs, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 04. 딥러닝 학습 구조 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "3-class logits의 Softmax·Cross Entropy를 mini-batch와 Adam update로 연결하고, validation·Dropout 경계를 실행하며 디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "딥러닝 학습 구조" })).toBeVisible();
  await expect(page.getByText("필수 LAB · MINI-BATCH → ADAM", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · TRAINING LOOP DEBUGGER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "배치 실습의 두 경계를 실제 NumPy로 다시 실행합니다" })).toBeVisible();
  await expect(page.getByText("Softmax class 축 한 줄 수리", { exact: true })).toBeVisible();
  await expect(page.getByText("한 epoch Adam 상태 trace", { exact: true })).toBeVisible();
  await expect(page.locator(".training-python-bridge .notebook-cell")).toHaveCount(2);

  const lab = page.locator(".training-batch-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  await lab.getByRole("combobox", {
    name: "다음 update의 batch와 전체 CE 방향",
  }).selectOption("both-down");
  await lab.getByRole("button", { name: "다음 mini-batch forward → Adam" }).click();
  await expect(lab.locator(".training-live-summary")).toContainText("예측 수정 필요");
  await expect(lab.locator(".training-live-summary")).toContainText("현재 batch CE ↓ · 전체 CE ↑");
  await lab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(lab.locator(".training-evidence .is-complete")).toHaveCount(0);

  await runBatch(lab, "batch-down-full-up");
  await expect(lab.locator(".training-live-summary")).toContainText("예측 확인");
  await runBatch(lab, "both-down");
  await lab.getByRole("button", {
    name: /update 2 뒤 W, hidden 1, class 0:/,
  }).click();
  await expect(lab.locator(".training-parameter-trace")).toContainText("m before");
  await runBatch(lab, "both-down");
  await runBatch(lab, "both-down");
  await expect(lab.getByText("Mini-batch 훈련 증거 완성", { exact: true })).toBeVisible();
  await expect(lab.locator(".training-evidence .is-complete")).toHaveCount(6);
  await expect(lab.getByRole("img", { name: "업데이트별 전체 데이터 cross entropy" })).toBeVisible();

  const incidents = page.locator(".training-debug-card");
  await expect(incidents).toHaveCount(4);
  const softmaxIncident = incidents.nth(0);
  await softmaxIncident.getByRole("combobox", { name: "1번 사건 patch" }).selectOption("global-softmax");
  await softmaxIncident.getByRole("button", { name: "patch 적용·계약 실행" }).click();
  await expect(softmaxIncident).toHaveClass(/is-incorrect/);
  await expect(softmaxIncident.locator(".training-debug-feedback")).toContainText("softmax 분모");

  const repairs = [
    "row-stable",
    "true-class-mean-logits",
    "clear-gradient-keep-moments",
    "inverted-train-eval-off",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox", { name: `${index + 1}번 사건 patch` }).selectOption(repairs[index]);
    const run = incident.getByRole("button", { name: "patch 적용·계약 실행" });
    await run.click();
    await expect(run).toBeFocused();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".training-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="epoch-update-count"][value="ceil-samples-over-batch"]').check();
  await page.locator('input[name="softmax-axis"][value="classes-within-each-row"]').check();
  await page.locator('input[name="fused-cross-entropy"][value="raw-logits-true-label-mean"]').check();
  await page.locator('input[name="checkpoint-choice"][value="minimum-validation-loss"]').check();
  await page.locator('input[name="dropout-mode"][value="train-random-eval-off"]').check();
  await page.getByRole("button", { name: "훈련 루프 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".training-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with no heavy runtime or public access", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 04. Deep Learning Training · Rootorial");
  await expect(page.getByRole("heading", { name: "Deep Learning Training" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Re-execute two batch-lab boundaries in real NumPy" })).toBeVisible();
  await expect(page.getByText("Repair the Softmax class axis in one line", { exact: true })).toBeVisible();
  await expect(page.getByText("Trace Adam state across one epoch", { exact: true })).toBeVisible();
  await expect(page.locator(".training-python-bridge .notebook-cell")).toHaveCount(2);

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
      if (/[\uAC00-\uD7A3]/.test(value)) rows.push(value);
    }
    return rows;
  });
  expect(untranslated).toEqual([]);

  const horizontalOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".training-batch-lab");
  const explorePreset = lab.getByRole("button", { name: "Explore · interleaved" });
  await explorePreset.focus();
  await explorePreset.press("Enter");
  await expect(explorePreset).toHaveAttribute("aria-pressed", "true");
  expect(await explorePreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  const resetLab = lab.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(lab.getByRole("combobox", {
    name: "Batch and full CE direction for the next update",
  })).toHaveValue("");

  const requiredPreset = lab.getByRole("button", { name: "Required diagnostic · grouped classes" });
  await requiredPreset.focus();
  await requiredPreset.press("Enter");
  await expect(requiredPreset).toHaveAttribute("aria-pressed", "true");
  const run = lab.getByRole("button", { name: "Next mini-batch forward → Adam" });
  await run.focus();
  await run.press("Enter");
  await expect(lab.locator(".training-live-summary")).toContainText("Choose a prediction before running");
  await lab.getByRole("combobox", {
    name: "Batch and full CE direction for the next update",
  }).selectOption("batch-down-full-up");
  await run.focus();
  await run.press("Enter");
  await expect(run).toBeFocused();
  await expect(lab.locator(".training-live-summary")).toContainText("Prediction confirmed");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  const overflowingSurfaces = await page.locator(
    ".training-batch-lab, .training-step-workspace, .training-parameter-inspector, .training-python-bridge, .training-python-bridge .notebook-cell, .training-debugger-lab, .training-debug-grid",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
  expect(overflowingSurfaces).toEqual([]);

  const firstIncident = page.locator(".training-debug-card").first();
  await firstIncident.getByRole("combobox", { name: "Patch for incident 1" }).selectOption("column-softmax");
  const runRepair = firstIncident.getByRole("button", { name: "Apply patch and run contract" });
  await runRepair.focus();
  await runRepair.press("Enter");
  await expect(runRepair).toBeFocused();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".training-debug-feedback")).toContainText("softmax denominator");
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Patch for incident 1" })).toHaveValue("");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

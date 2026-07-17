import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/sequences";
const publicPath = "/curricula/transformer-from-zero/chapters/sequences";

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

test("completes memory evidence, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 06. 순서가 있는 데이터 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "결정적 RNN unroll에서 hidden state와 공유 recurrence를 조작하고, 시간축 gradient와 LSTM cell update를 계산해 causal prefix를 디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "순서가 있는 데이터" })).toBeVisible();
  await expect(page.getByText("필수 LAB · ORDER → STATE → MEMORY", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · SEQUENCE CONTRACT DEBUGGER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "시간축 recurrence와 gradient 경로를 실제 NumPy로 다시 펼칩니다" })).toBeVisible();
  await expect(page.getByText("batch에서 순서 민감성 증명", { exact: true })).toBeVisible();
  await expect(page.getByText("긴 recurrent 경로의 gradient 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".sequences-python-bridge .notebook-cell")).toHaveCount(2);

  const lab = page.locator(".sequences-memory-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });

  const prediction = lab.getByLabel("final state 예측");
  const run = lab.getByRole("button", { name: "sequence recurrence 실행" });
  const gain = lab.getByLabel("RNN recurrent gain");

  await gain.fill("0");
  await prediction.selectOption("faded");
  await run.click();
  await expect(lab.locator(".sequences-runtime-fallback")).toContainText("로컬 sequence runtime 실패");
  const safeReset = lab.getByRole("button", { name: "안전하게 초기화" });
  await safeReset.click();
  await expect(prediction).toBeFocused();
  await expect(gain).toHaveValue("0.5");
  await expect(lab.locator(".sequences-runtime-fallback")).toHaveCount(0);

  await gain.fill("0.35");
  await prediction.selectOption("retained");
  await run.click();
  await expect(run).toBeFocused();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("예측 수정 필요");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(0);

  await lab.getByRole("button", { name: "현재 실행 다시 예측" }).click();
  await prediction.selectOption("faded");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("연습 기록");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(0);

  await lab.getByRole("button", { name: "현재 실행 다시 예측" }).click();
  await gain.fill("0.5");
  await prediction.selectOption("faded");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("예측 확인");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(1);
  const firstStep = lab.locator(".sequences-timestep-picker button").first();
  const lastStep = lab.locator(".sequences-timestep-picker button").last();
  await firstStep.click();
  await expect(firstStep).toHaveAttribute("aria-pressed", "true");
  await expect(lab.locator(".sequences-live-feedback")).toContainText("다른 timestep 하나");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(1);
  await lastStep.click();
  await expect(lastStep).toHaveAttribute("aria-pressed", "true");
  await expect(lab.locator(".sequences-live-feedback")).toContainText("두 timestep 비교");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(2);

  const resetLab = lab.getByRole("button", { name: "lab 전체 초기화" });
  await resetLab.click();
  await expect(resetLab).toBeFocused();
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(0);
  await gain.fill("0.4");
  await prediction.selectOption("faded");
  await run.click();
  await lab.locator(".sequences-timestep-picker button").first().click();
  await lab.locator(".sequences-timestep-picker button").last().click();
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(2);

  await lab.getByRole("radio", { name: "LSTM" }).check();
  await prediction.selectOption("faded");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("예측 수정 필요");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(2);
  await lab.getByRole("button", { name: "현재 실행 다시 예측" }).click();
  await prediction.selectOption("retained");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("연습 기록");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(2);
  await lab.getByRole("button", { name: "짧은 간격" }).click();
  await prediction.selectOption("retained");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("예측 확인");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(3);
  await expect(lab.locator(".sequences-trace-workspace > header")).toContainText("∂c_final/∂x_signal");
  await lab.locator(".sequences-timestep-picker button").nth(1).click();
  await expect(lab.locator(".sequences-step-panel")).toContainText("cell carry 민감도");
  await expect(lab.locator(".sequences-step-panel")).toContainText("hidden reveal 민감도");

  const reversedPreset = lab.getByRole("button", { name: "순서 뒤집기" });
  await reversedPreset.click();
  await expect(reversedPreset).toHaveAttribute("aria-pressed", "true");
  await prediction.selectOption("reversed");
  await run.click();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("예측 확인");
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(4);

  const incidents = page.locator(".sequences-debug-card");
  await expect(incidents).toHaveCount(4);
  const orderIncident = incidents.nth(0);
  await orderIncident.getByRole("combobox", { name: "1번 sequence 사건 repair" }).selectOption("mean-pooling");
  await orderIncident.getByRole("button", { name: "repair 적용·계약 실행" }).click();
  await expect(orderIncident).toHaveClass(/is-incorrect/);
  await expect(orderIncident.locator(".sequences-debug-feedback")).toContainText("평균은 교환법칙");

  const repairs = [
    "ordered-recurrence",
    "prefix-only",
    "forget-old-plus-input-candidate",
    "output-gates-hidden",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox", { name: `${index + 1}번 sequence 사건 repair` }).selectOption(repairs[index]);
    const applyRepair = incident.getByRole("button", { name: "repair 적용·계약 실행" });
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".sequences-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="hidden-shape"][value="hidden-is-bh-trace-is-bth"]').check();
  await page.locator('input[name="shared-recurrence"][value="same-cell-updates-ordered-state"]').check();
  await page.locator('input[name="temporal-gradient"][value="product-of-local-jacobians"]').check();
  await page.locator('input[name="lstm-cell-update"][value="forget-carry-plus-input-candidate"]').check();
  await page.locator('input[name="causal-prefix"][value="state-uses-current-and-past-only"]').check();
  await page.getByRole("button", { name: "시퀀스 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".sequences-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with reduced motion and no heavy runtime", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 06. Sequential Data · Rootorial");
  await expect(page.getByRole("heading", { name: "Sequential Data" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Re-unroll temporal recurrence and its gradient path in real NumPy" })).toBeVisible();
  await expect(page.getByText("Prove order sensitivity in a batch", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair the gradient through a long recurrent path", { exact: true })).toBeVisible();
  await expect(page.locator(".sequences-python-bridge .notebook-cell")).toHaveCount(2);

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

  const lab = page.locator(".sequences-memory-lab");
  const prediction = lab.getByLabel("Final-state prediction");
  const run = lab.getByRole("button", { name: "Run sequence recurrence" });
  await lab.getByRole("radio", { name: "LSTM" }).check();
  await lab.getByRole("button", { name: "Short gap" }).click();
  await prediction.selectOption("retained");
  await run.click();
  await expect(lab.locator(".sequences-evidence .is-complete")).toHaveCount(0);
  await lab.getByRole("button", { name: "Reset lab" }).click();

  const reversedPreset = lab.getByRole("button", { name: "Reverse order" });
  await reversedPreset.focus();
  await reversedPreset.press("Enter");
  await expect(reversedPreset).toBeFocused();
  await expect(reversedPreset).toHaveAttribute("aria-pressed", "true");
  expect(await reversedPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  await prediction.selectOption("reversed");
  await run.focus();
  await run.press("Enter");
  await expect(run).toBeFocused();
  await expect(lab.locator(".sequences-live-feedback")).toContainText("Prediction confirmed");
  const firstTimestep = lab.locator(".sequences-timestep-picker button").first();
  const timestep = lab.locator(".sequences-timestep-picker button").last();
  await firstTimestep.focus();
  await firstTimestep.press("Enter");
  await expect(firstTimestep).toBeFocused();
  await expect(firstTimestep).toHaveAttribute("aria-pressed", "true");
  await timestep.focus();
  await timestep.press("Enter");
  await expect(timestep).toBeFocused();
  await expect(timestep).toHaveAttribute("aria-pressed", "true");

  const targets = [
    reversedPreset,
    lab.getByLabel("RNN recurrent gain"),
    prediction,
    run,
    timestep,
  ];
  for (const target of targets) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const overflowingSurfaces = await page.locator(
    ".sequences-memory-lab, .sequences-run-grid, .sequences-trace-workspace, .sequences-step-panel, .sequences-debugger-lab, .sequences-debug-grid, .sequences-order-pair, .sequences-gate-roles, .sequences-chapter-shell .math-formula-display",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
  expect(overflowingSurfaces).toEqual([]);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const firstIncident = page.locator(".sequences-debug-card").first();
  await firstIncident.getByRole("combobox", { name: "Repair for sequence incident 1" }).selectOption("mean-pooling");
  const applyRepair = firstIncident.getByRole("button", { name: "Apply repair and run contract" });
  await applyRepair.focus();
  await applyRepair.press("Enter");
  await expect(applyRepair).toBeFocused();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".sequences-debug-feedback")).toContainText("commutative mean");
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Repair for sequence incident 1" })).toHaveValue("");

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

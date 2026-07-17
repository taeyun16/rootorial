import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/attention";
const publicPath = "/curricula/transformer-from-zero/chapters/attention";

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

async function attentionOverflow(page: TestPage) {
  return page.locator(
    ".attention-routing-lab, .attention-prediction-workspace, .attention-query-controls, .attention-prediction-controls, .attention-pipeline-workspace, .attention-memory-stage, .attention-stage-visual, .attention-contribution-stage, .attention-slot-inspections, .attention-counterfactual, .attention-evidence, .attention-causal-ledger, .attention-ledger-example, .attention-python-bridge, .attention-python-bridge .notebook-cell, .attention-debugger-lab, .attention-debug-grid, .attention-debug-card, .attention-chapter-shell .math-formula-display",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
}

test("completes routing evidence, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 07. Attention · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "단일 query와 분리된 Key·Value로 점수를 계산하고, key축 Softmax와 value 가중합 문맥을 실행하며 잘못된 Attention 계약을 디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Attention" })).toBeVisible();
  await expect(page.getByText("필수 LAB · PREDICT → ROUTE → INSPECT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · ATTENTION ROUTING DEBUGGER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "한 역할만 바꾸고 score·weight·context의 이동을 추적합니다" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "세 query의 routing과 value read를 실제 NumPy로 연결합니다" })).toBeVisible();
  await expect(page.getByText("세 query의 Attention routing trace", { exact: true })).toBeVisible();
  await expect(page.getByText("weights·V context 한 줄 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".attention-python-bridge .notebook-cell")).toHaveCount(2);

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(completionButton).toBeDisabled();

  const lab = page.locator(".attention-routing-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const prediction = lab.getByLabel("top source row 예측");
  const run = lab.getByRole("button", { name: "Attention routing 실행" });
  const query0 = lab.getByLabel("query 성분 q0");
  const query1 = lab.getByLabel("query 성분 q1");

  const weightsBeforeRun = lab.getByRole("button", { name: /key축 Softmax/ });
  await weightsBeforeRun.click();
  await expect(weightsBeforeRun).toHaveAttribute("aria-pressed", "false");
  await expect(lab.locator(".attention-live-feedback")).toContainText("실행 결과입니다");

  await query0.fill("1.79e308");
  await query1.fill("1.79e308");
  await prediction.selectOption("subject");
  await run.click();
  await expect(lab.locator(".attention-runtime-fallback")).toContainText("로컬 Attention runtime 실패");
  const recover = lab.getByRole("button", { name: "고정 preset으로 안전하게 복구" });
  await recover.click();
  await expect(prediction).toBeFocused();
  await expect(query0).toHaveValue("1.4");
  await expect(query1).toHaveValue("0.1");
  await expect(lab.locator(".attention-runtime-fallback")).toHaveCount(0);

  await prediction.selectOption("place");
  await run.click();
  await expect(run).toBeFocused();
  await expect(lab.locator(".attention-live-feedback")).toContainText("실제 top은 주체 단서");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(0);
  await expect(lab.locator(".attention-evidence")).toHaveAttribute("data-mastered", "false");

  await lab.getByRole("button", { name: "현재 설정 다시 예측" }).click();
  await prediction.selectOption("subject");
  await run.click();
  await expect(lab.locator(".attention-live-feedback")).toContainText("예측이 맞았습니다");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(0);
  await expect(lab.locator(".attention-evidence")).toHaveAttribute("data-mastered", "false");

  const placePreset = lab.locator('[data-attention-preset="find-place"]');
  await placePreset.click();
  await expect(placePreset).toHaveAttribute("aria-pressed", "true");
  await prediction.selectOption("place");
  await run.click();
  await expect(lab.locator(".attention-live-feedback")).toContainText("예측이 맞았습니다");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(0);

  await lab.getByRole("button", { name: /αⱼvⱼ 기여/ }).click();
  const subjectContribution = lab.locator('.attention-slot-inspect[data-slot="subject"]');
  const placeContribution = lab.locator('.attention-slot-inspect[data-slot="place"]');
  await subjectContribution.click();
  await expect(subjectContribution).toHaveAttribute("aria-pressed", "true");
  await placeContribution.click();
  await expect(placeContribution).toHaveAttribute("aria-pressed", "true");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(1);

  await lab.getByLabel("value-only counterfactual 예측").selectOption("scores-and-weights-stay-context-changes");
  const runCounterfactual = lab.getByRole("button", { name: "value-only 반사실 실행" });
  await runCounterfactual.click();
  await expect(runCounterfactual).toBeFocused();
  await expect(lab.locator(".attention-live-feedback")).toContainText("score·weight는 같고");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(2);
  await expect(lab.locator(".attention-evidence")).toHaveAttribute("data-mastered", "false");

  const actionPreset = lab.locator('[data-attention-preset="find-action"]');
  await actionPreset.click();
  await prediction.selectOption("action");
  await run.click();
  await expect(lab.locator(".attention-live-feedback")).toContainText("예측이 맞았습니다");
  await expect(lab.locator(".attention-evidence")).toHaveAttribute("data-mastered", "true");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(3);

  const incidents = page.locator(".attention-debug-card");
  await expect(incidents).toHaveCount(4);
  const softmaxIncident = incidents.nth(0);
  await softmaxIncident.getByRole("combobox", { name: "1번 Attention 사건 repair" }).selectOption("normalize-values-by-feature");
  await softmaxIncident.getByRole("button", { name: "1번 Attention 사건 repair 적용 및 계약 실행" }).click();
  await expect(softmaxIncident).toHaveClass(/is-incorrect/);
  await expect(softmaxIncident.locator(".attention-debug-feedback")).toContainText("value feature를 정규화");

  const repairs = [
    "normalize-over-keys-per-query",
    "combine-values-with-weights",
    "queries-times-keys-transposed",
    "run-each-query-row-independently",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox", { name: `${index + 1}번 Attention 사건 repair` }).selectOption(repairs[index]);
    const applyRepair = incident.getByRole("button", { name: `${index + 1}번 Attention 사건 repair 적용 및 계약 실행` });
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".attention-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="qk-roles"][value="query-compares-keys"]').check();
  await page.locator('input[name="score-shape"][value="scores-nq-nk"]').check();
  await page.locator('input[name="softmax-axis"][value="keys-within-each-query"]').check();
  await page.locator('input[name="value-context"][value="weights-mix-values"]').check();
  await page.locator('input[name="attention-boundary"][value="single-query-cross-attention-first"]').check();
  await page.getByRole("button", { name: "Attention 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".attention-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with reduced motion and no overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 07. Attention · Rootorial");
  await expect(page.getByRole("heading", { name: "Attention" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Change one role at a time and trace scores, weights, and context" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connect three-query routing to value reads in real NumPy" })).toBeVisible();
  await expect(page.getByText("Trace Attention routing for three queries", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair weights-times-V context in one line", { exact: true })).toBeVisible();
  await expect(page.locator(".attention-python-bridge .notebook-cell")).toHaveCount(2);

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

  const documentOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".attention-routing-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const actionPreset = lab.locator('[data-attention-preset="find-action"]');
  await actionPreset.focus();
  await actionPreset.press("Enter");
  await expect(actionPreset).toBeFocused();
  await expect(actionPreset).toHaveAttribute("aria-pressed", "true");
  expect(await actionPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  const prediction = lab.getByLabel("Top source row prediction");
  await prediction.selectOption("action");
  const run = lab.getByRole("button", { name: "Run Attention routing" });
  await run.focus();
  await run.press("Enter");
  await expect(run).toBeFocused();
  await expect(lab.locator(".attention-live-feedback")).toContainText("Correct");

  const contributionStage = lab.getByRole("button", { name: /αⱼvⱼ contributions/ });
  await contributionStage.focus();
  await contributionStage.press("Enter");
  await expect(contributionStage).toBeFocused();
  await expect(contributionStage).toHaveAttribute("aria-pressed", "true");
  const inspectSubject = lab.locator('.attention-slot-inspect[data-slot="subject"]');
  await inspectSubject.focus();
  await inspectSubject.press("Enter");
  await expect(inspectSubject).toBeFocused();
  await expect(inspectSubject).toHaveAttribute("aria-pressed", "true");

  const coreControls = [
    actionPreset,
    lab.getByLabel("Query component q0"),
    prediction,
    run,
    contributionStage,
    inspectSubject,
  ];
  for (const target of coreControls) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await attentionOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  await lab.getByLabel("Value-only counterfactual prediction").selectOption("scores-change");
  await lab.getByRole("button", { name: "Run value-only counterfactual" }).click();
  await expect(lab.locator(".attention-live-feedback")).toContainText("choose an unrevealed preset or reset the entire lab");

  const resetLab = lab.getByRole("button", { name: "Reset Attention lab", exact: true });
  await expect(resetLab).toHaveCount(1);
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(resetLab).toBeFocused();
  await expect(prediction).toHaveValue("");
  await expect(lab.locator(".attention-evidence .is-complete")).toHaveCount(0);

  const firstIncident = page.locator(".attention-debug-card").first();
  const repairSelect = firstIncident.getByRole("combobox", { name: "Repair for Attention incident 1" });
  await repairSelect.selectOption("normalize-values-by-feature");
  const applyRepair = firstIncident.getByRole("button", { name: "Apply repair and run contract for Attention incident 1" });
  await applyRepair.focus();
  await applyRepair.press("Enter");
  await expect(applyRepair).toBeFocused();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".attention-debug-feedback")).toContainText("normalizes value features");
  for (const target of [repairSelect, applyRepair]) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const resetDebugger = page.getByRole("button", { name: "Reset the entire Attention debugger", exact: true });
  await expect(resetDebugger).toHaveCount(1);
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(resetDebugger).toBeFocused();
  await expect(repairSelect).toHaveValue("");

  expect(await attentionOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

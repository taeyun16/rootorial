import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/self-attention";
const publicPath = "/curricula/transformer-from-zero/chapters/self-attention";

type TestPage = Parameters<typeof signInTestUser>[0];

function choiceGroup(scope: Locator, label: string) {
  return scope.getByRole("group", { name: label });
}

function choiceOption(scope: Locator, label: string, value: string) {
  return choiceGroup(scope, label).locator(`[data-choice-value="${value}"]`);
}

async function choose(scope: Locator, label: string, value: string) {
  const option = choiceOption(scope, label, value);
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
  return option;
}

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

function watchConsoleErrors(page: TestPage) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

async function selfAttentionOverflow(page: TestPage) {
  return page.locator(
    ".self-attention-boundary-grid, .self-attention-shape-ladder, .self-attention-worked-trace, .self-attention-formula-stack, .self-attention-mask-table-wrap, .self-attention-workbench, .self-attention-preset-row, .self-attention-control-panel, .self-attention-run-actions, .self-attention-workbench .step-explorer, .self-attention-stage-panel, .self-attention-matrix-stack, .self-attention-matrix-stack .array-diagram, .self-attention-matrix-stack .array-diagram-scroll, .self-attention-masked-grid-wrap, .self-attention-evidence, .self-attention-python-bridge, .self-attention-python-bridge .notebook-cell, .self-attention-debugger-lab, .self-attention-debug-grid, .self-attention-debug-card, .self-attention-debug-actions, .self-attention-debug-feedback, .self-attention-practice-deck, .self-attention-practice-deck .practice-workspace, .self-attention-transfer-task, .self-attention-completion-checklist, .self-attention-chapter-shell .math-formula-display",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
}

test("completes five traces, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 08. Self-Attention · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "같은 입력에서 Q·K·V를 따로 투영해 모든 token row의 scaled dot-product를 계산하고, causal mask와 multi-head 분할·병합 계약을 실행하며 정보 누출과 shape 결함을 디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Self-Attention", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByText("필수 LAB · PREDICT → CONFIGURE → RUN → INSPECT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · CAUSAL MULTI-HEAD REPAIR CONSOLE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "sat query 한 행을 score에서 concat까지 끝까지 추적합니다" })).toBeVisible();
  const workedTrace = page.locator(".self-attention-worked-trace");
  await expect(workedTrace).toContainText("raw = [2, 1, 0, 1]");
  await expect(workedTrace).toContainText("weights = [0.575975, 0.283995, 0.140029, 0]");
  await expect(workedTrace).toContainText("context₁ = [0.716005, 0.424025]");
  await expect(workedTrace).toContainText("concat = [0.744765, 0.503490, 0.716005, 0.424025]");
  await expect(page.getByRole("heading", { name: "고정 trace와 mask repair를 실제 NumPy로 다시 실행합니다" })).toBeVisible();
  await expect(page.getByText("Q/K/V 투영부터 two-head concat까지 실행", { exact: true })).toBeVisible();
  await expect(page.getByText("Softmax 뒤 mask 버그 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".self-attention-python-bridge .notebook-cell")).toHaveCount(2);
  await expect(page.locator(".self-attention-python-bridge .notebook-cell-support-code")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "핵심 코드 보기" })).toHaveCount(2);

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(completionButton).toBeDisabled();

  const lab = page.locator(".self-attention-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  await lab.locator(".challenge-advanced-settings summary").click();
  const prediction = choiceGroup(lab, "Self-Attention challenge 예측");
  const run = lab.getByRole("button", { name: "Self-Attention pipeline 실행" });
  const gain = lab.getByLabel("Self-Attention 입력 gain");

  await gain.fill("5");
  await choose(lab, "Self-Attention challenge 예측", "same-x-separate-qkv");
  await run.click();
  await expect(lab.locator(".self-attention-runtime-fallback")).toContainText("로컬 Self-Attention runtime 실패");
  const recover = lab.getByRole("button", { name: "challenge 시작 preset으로 안전하게 복구" });
  await expect(recover).toBeFocused();
  await recover.click();
  await expect(prediction.getByRole("button").first()).toBeFocused();
  await expect(gain).toHaveValue("1");
  await expect(lab.locator(".self-attention-runtime-fallback")).toHaveCount(0);
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(0);

  const projectionPrediction = await choose(lab, "Self-Attention challenge 예측", "same-x-separate-qkv");
  await run.click();
  await expect(projectionPrediction).toBeFocused();
  await expect(lab.locator(".self-attention-live-feedback")).toContainText("예측과 실행 계약이 맞았습니다");
  const inspectProjection = lab.getByRole("button", { name: "선택 token의 Q/K/V row 검사" });
  await choose(lab, "관찰할 Self-Attention head", "0");
  await choose(lab, "관찰할 query token", "1");
  await inspectProjection.click();
  await expect(lab.locator(".self-attention-live-feedback")).toContainText("아직 필수 수치 증거가 아닙니다");
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(0);
  await choose(lab, "관찰할 Self-Attention head", "1");
  await choose(lab, "관찰할 query token", "0");
  await inspectProjection.click();
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(1);

  const scalingPreset = lab.locator('[data-self-attention-preset="scaling"]');
  await scalingPreset.click();
  await expect(scalingPreset).toHaveAttribute("aria-pressed", "true");
  await choose(lab, "Self-Attention score scaling", "1");
  await choose(lab, "Self-Attention challenge 예측", "same-top-higher-entropy");
  await run.click();
  await lab.getByRole("button", { name: "선택 row의 raw/scaled score 비교" }).click();
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(2);

  const causalPreset = lab.locator('[data-self-attention-preset="causal-mask"]');
  await causalPreset.click();
  await expect(causalPreset).toHaveAttribute("aria-pressed", "true");
  await choose(lab, "Self-Attention causal mask", "1");
  await choose(lab, "Self-Attention challenge 예측", "future-zero-row-renormalized");
  await run.click();
  const futureCell = lab.getByRole("button", { name: "query 1의 미래 또는 padding key 2 차단" });
  await futureCell.click();
  await expect(futureCell).toHaveAttribute("aria-pressed", "true");
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(3);

  const paddingPreset = lab.locator('[data-self-attention-preset="padding-key"]');
  await paddingPreset.click();
  await expect(paddingPreset).toHaveAttribute("aria-pressed", "true");
  await choose(lab, "Self-Attention padding key visibility", "1");
  await choose(lab, "Self-Attention challenge 예측", "padding-gains-mass-active-renormalizes-pad-query-zero");
  await run.click();
  const exposedPaddingCell = lab.getByRole("button", { name: /weights · head 1, the, k3:/ });
  await exposedPaddingCell.click();
  await expect(exposedPaddingCell).toHaveAttribute("aria-pressed", "true");
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(4);

  const multiHeadPreset = lab.locator('[data-self-attention-preset="multi-head"]');
  await multiHeadPreset.click();
  await expect(multiHeadPreset).toHaveAttribute("aria-pressed", "true");
  await choose(lab, "Self-Attention challenge 예측", "concat-preserves-token-shape");
  await run.click();
  await lab.getByRole("button", { name: "선택 token의 두 head와 [T,4] handoff 검사" }).click();
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(5);
  await expect(lab.locator(".self-attention-evidence")).toHaveAttribute("data-mastered", "true");

  const incidents = page.locator(".self-attention-debug-card");
  await expect(page.locator('.self-attention-debug-progress[data-interactive-ready="true"]')).toHaveCount(1);
  await expect(incidents).toHaveCount(4);
  const projectionIncident = incidents.nth(0);
  await choose(projectionIncident, "1번 Self-Attention 사건 repair", "reuse-query-for-kv");
  await projectionIncident.getByRole("button", { name: "1번 Self-Attention 사건 repair 적용 및 계약 실행" }).click();
  await expect(projectionIncident).toHaveAttribute("data-repair-result", "incorrect");
  await expect(projectionIncident.locator(".self-attention-debug-feedback")).toContainText("역할별 값이 붕괴");

  const repairs = [
    "project-qkv-independently",
    "divide-by-sqrt-head-dimension",
    "mask-before-softmax",
    "concat-features-then-output",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await choose(incident, `${index + 1}번 Self-Attention 사건 repair`, repairs[index]);
    const applyRepair = incident.getByRole("button", { name: `${index + 1}번 Self-Attention 사건 repair 적용 및 계약 실행` });
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveAttribute("data-repair-result", "correct");
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".self-attention-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="qkv-source"][value="same-x-separate-projections"]').check();
  await page.locator('input[name="scaled-score"][value="divide-by-sqrt-head-dimension"]').check();
  await page.locator('input[name="causal-mask"][value="block-future-logits-before-softmax"]').check();
  await page.locator('input[name="multi-head-contract"][value="split-features-run-heads-concat"]').check();
  await page.locator('input[name="position-boundary"][value="mask-limits-visibility-position-next"]').check();
  await page.getByRole("button", { name: "Self-Attention 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".self-attention-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with reduced motion and no overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 08. Self-Attention · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Project Q, K, and V separately from the same input, compute scaled dot products for every token row, then execute causal-masking and multi-head split/merge contracts while debugging information leaks and shape defects.",
  );
  await expect(page.getByRole("heading", { name: "Self-Attention", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByRole("heading", { name: "Trace one sat query row from scores through concatenation" })).toBeVisible();
  const workedTrace = page.locator(".self-attention-worked-trace");
  await expect(workedTrace).toContainText("masked = [1.414214, 0.707107, 0, -inf]");
  await expect(workedTrace).toContainText("concat = [0.744765, 0.503490, 0.716005, 0.424025]");
  await expect(page.getByRole("heading", { name: "Re-execute the fixed trace and mask repair in real NumPy" })).toBeVisible();
  await expect(page.getByText("Run Q/K/V projections through two-head concat", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair the mask-after-softmax bug", { exact: true })).toBeVisible();
  await expect(page.locator(".self-attention-python-bridge .notebook-cell")).toHaveCount(2);
  await expect(page.locator(".self-attention-python-bridge .notebook-cell-support-code")).toHaveCount(2);
  await expect(page.getByRole("button", { name: "Show learner code" })).toHaveCount(2);

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

  const lab = page.locator(".self-attention-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const advancedSettings = lab.locator(".challenge-advanced-settings summary");
  const scalingPreset = lab.locator('[data-self-attention-preset="scaling"]');
  const prediction = choiceGroup(lab, "Self-Attention challenge prediction");
  await scalingPreset.focus();
  await scalingPreset.press("Enter");
  await expect(scalingPreset).toHaveAttribute("aria-pressed", "true");
  await expect(prediction.getByRole("button").first()).toBeFocused();
  expect(await scalingPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  const scaling = await choose(lab, "Self-Attention score scaling", "1");
  const scalingPrediction = await choose(lab, "Self-Attention challenge prediction", "same-top-higher-entropy");
  const run = lab.getByRole("button", { name: "Run the Self-Attention pipeline" });
  await run.focus();
  await run.press("Enter");
  await expect(scalingPrediction).toBeFocused();
  await expect(lab.locator(".self-attention-live-feedback")).toContainText("Prediction and executed contract match");

  const scoresStage = lab.getByRole("button", { name: /raw · scaled/ });
  await scoresStage.focus();
  await scoresStage.press("Enter");
  await expect(scoresStage).toBeFocused();
  await expect(scoresStage).toHaveAttribute("aria-pressed", "true");
  const inspectScores = lab.getByRole("button", { name: "Compare raw and scaled scores for the selected row" });
  await inspectScores.focus();
  await inspectScores.press("Enter");
  await expect(inspectScores).toBeFocused();
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(1);

  const coreControls = [advancedSettings, scalingPreset, scaling, prediction, run, scoresStage, inspectScores];
  for (const target of coreControls) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await selfAttentionOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const causalPreset = lab.locator('[data-self-attention-preset="causal-mask"]');
  await causalPreset.focus();
  await causalPreset.press("Enter");
  await choose(lab, "Self-Attention causal mask", "1");
  await choose(lab, "Self-Attention challenge prediction", "future-zero-row-renormalized");
  await run.press("Enter");
  const futureCell = lab.getByRole("button", { name: "future or padding key 2 blocked for query 1" });
  await futureCell.focus();
  await futureCell.press("Enter");
  await expect(futureCell).toHaveAttribute("aria-pressed", "true");
  expect(await selfAttentionOverflow(page)).toEqual([]);

  const paddingPreset = lab.locator('[data-self-attention-preset="padding-key"]');
  await paddingPreset.focus();
  await paddingPreset.press("Enter");
  await choose(lab, "Self-Attention padding key visibility", "1");
  await choose(lab, "Self-Attention challenge prediction", "padding-gains-mass-active-renormalizes-pad-query-zero");
  await run.press("Enter");
  const paddingCell = lab.locator('button[aria-label^="weights · head 1, the, k3:"]');
  await expect(paddingCell).toHaveCount(1);
  await paddingCell.focus();
  await paddingCell.press("Enter");
  await expect(paddingCell).toHaveAttribute("aria-pressed", "true");
  expect(await selfAttentionOverflow(page)).toEqual([]);

  const multiHeadPreset = lab.locator('[data-self-attention-preset="multi-head"]');
  await multiHeadPreset.focus();
  await multiHeadPreset.press("Enter");
  await choose(lab, "Self-Attention challenge prediction", "concat-preserves-token-shape");
  await run.press("Enter");
  const inspectOutput = lab.getByRole("button", { name: "Inspect both heads and the [T,4] handoff for the selected token" });
  await inspectOutput.focus();
  await inspectOutput.press("Enter");
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(4);
  expect(await selfAttentionOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const resetLab = lab.getByRole("button", { name: "Reset the entire Self-Attention lab", exact: true });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(resetLab).toBeFocused();
  await expect(prediction.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(lab.locator(".self-attention-evidence .is-complete")).toHaveCount(0);

  const firstIncident = page.locator(".self-attention-debug-card").first();
  const repairSelect = choiceGroup(firstIncident, "Repair for Self-Attention incident 1");
  await choose(firstIncident, "Repair for Self-Attention incident 1", "reuse-query-for-kv");
  const applyRepair = firstIncident.getByRole("button", { name: "Apply repair and run contract for Self-Attention incident 1" });
  await applyRepair.focus();
  await applyRepair.press("Enter");
  await expect(applyRepair).toBeFocused();
  await expect(firstIncident).toHaveAttribute("data-repair-result", "incorrect");
  await expect(firstIncident.locator(".self-attention-debug-feedback")).toContainText("collapses their role-specific values");
  for (const target of [repairSelect, applyRepair]) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const resetDebugger = page.getByRole("button", { name: "Reset the entire Self-Attention debugger", exact: true });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(resetDebugger).toBeFocused();
  await expect(repairSelect.locator('[aria-pressed="true"]')).toHaveCount(0);

  const conceptAnswers = [
    ['input[name="qkv-source"][value="same-x-separate-projections"]'],
    ['input[name="scaled-score"][value="divide-by-sqrt-head-dimension"]'],
    ['input[name="causal-mask"][value="block-future-logits-before-softmax"]'],
    ['input[name="multi-head-contract"][value="split-features-run-heads-concat"]'],
    ['input[name="position-boundary"][value="mask-limits-visibility-position-next"]'],
  ] as const;
  for (const [selector] of conceptAnswers) {
    const answer = page.locator(selector);
    await answer.focus();
    await answer.press("Space");
    await expect(answer).toBeChecked();
  }
  const checkConcepts = page.getByRole("button", { name: "Check the self-attention contract" });
  await checkConcepts.focus();
  await checkConcepts.press("Enter");
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();

  expect(await selfAttentionOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("retries and completes the independent Self-Attention practice on fresh fixtures", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);

  const practice = page.locator(".self-attention-practice-deck");
  expect(await practice.locator("select").count()).toBe(0);
  await expect(practice.getByRole("heading", {
    name: "Can you preserve Self-Attention row semantics outside the guided lab?",
  })).toBeVisible();
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("0 / 3");
  const completionButton = page.getByRole("button", {
    name: "Completion is disabled in preview",
  });
  await expect(completionButton).toHaveAttribute(
    "data-completion-ready",
    "false",
  );

  await choose(
    practice,
    "Predict token-row permutation output",
    "outputs-stay-in-original-order",
  );
  await choose(practice, "learnerPermute", "permute-keys-only");
  await practice.getByRole("button", {
    name: "Run both row-permutation fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-failed/);
  await expect(practice.locator(".practice-result")).toContainText(
    "max|Y'−P·Y|=",
  );

  await choose(
    practice,
    "Predict token-row permutation output",
    "outputs-follow-token-permutation",
  );
  await choose(
    practice,
    "learnerPermute",
    "permute-input-before-qkv",
  );
  await practice.getByRole("button", {
    name: "Run both row-permutation fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  const navigation = practice.locator(".practice-deck-navigation button");
  await navigation.nth(1).focus();
  await navigation.nth(1).press("Enter");
  await choose(
    practice,
    "Predict contexts for identical token rows",
    "duplicate-rows-produce-duplicate-contexts",
  );
  await choose(practice, "learnerBoundary", "no-position-signal");
  await practice.getByRole("button", {
    name: "Run both duplicate-row contracts",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  await navigation.nth(2).focus();
  await navigation.nth(2).press("Space");
  await choose(
    practice,
    "Predict the causal permutation boundary",
    "token-only-changes-joint-relabel-restores",
  );
  await choose(
    practice,
    "learnerRelabel",
    "permute-input-and-visibility",
  );
  await practice.getByRole("button", {
    name: "Run both causal relabel fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("3 / 3");
  await expect(practice.locator(".practice-deck-evidence")).toContainText(
    "You produced row-permutation, position-free duplicate, and causal-visibility transfer evidence.",
  );
  await expect(completionButton).toHaveAttribute(
    "data-completion-ready",
    "false",
  );

  await practice.getByRole("button", {
    name: "Reset all three challenges",
  }).click();
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("0 / 3");
  await expect(choiceOption(
    practice,
    "Predict token-row permutation output",
    "outputs-follow-token-permutation",
  )).toBeFocused();
  expect(await selfAttentionOverflow(page)).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

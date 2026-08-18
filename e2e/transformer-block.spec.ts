import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/transformer-block";
const publicPath = "/curricula/transformer-from-zero/chapters/transformer-block";

type TestPage = Parameters<typeof signInTestUser>[0];

function choiceGroup(scope: Locator, label: string) {
  return scope.getByRole("group", { name: label });
}

async function choose(scope: Locator, label: string, value: string) {
  const option = choiceGroup(scope, label).locator(`[data-choice-value="${value}"]`);
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

async function transformerBlockOverflow(page: TestPage) {
  return page.locator(
    ".transformer-block-boundary-grid, .transformer-block-formula-stack, .transformer-block-flow, .transformer-block-prerequisite, .transformer-block-workbench, .transformer-block-preset-row, .transformer-block-control-panel, .transformer-block-run-actions, .transformer-block-workbench .step-explorer, .transformer-block-stage-panel, .transformer-block-matrix-stack, .transformer-block-matrix-stack .array-diagram, .transformer-block-matrix-stack .array-diagram-scroll, .transformer-block-stat-grid, .transformer-block-handoff-note, .transformer-block-evidence, .transformer-block-python-bridge, .transformer-block-python-bridge .notebook-cell, .transformer-block-debugger-lab, .transformer-block-debug-progress, .transformer-block-debug-grid, .transformer-block-debug-card, .transformer-block-debug-actions, .transformer-block-debug-feedback, .transformer-block-practice-deck, .transformer-block-practice-deck .practice-workspace, .transformer-block-transfer-task, .transformer-block-completion-checklist, .transformer-block-chapter-shell .math-formula-display",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
}

async function completeChallenge({
  lab,
  id,
  prediction,
  configure,
  requiredCell,
  completedCount,
}: {
  lab: Locator;
  id: string;
  prediction: string;
  configure: () => Promise<unknown>;
  requiredCell: RegExp;
  completedCount: number;
}) {
  const preset = lab.locator(`[data-transformer-block-preset="${id}"]`);
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await configure();
  await choose(lab, "Transformer block challenge 예측", prediction);
  await lab.getByRole("button", { name: "Transformer block 조립 실행" }).click();
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("예측과 실행 계약이 맞았습니다");
  await lab.getByRole("button", { name: requiredCell }).click();
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(completedCount);
}

test("completes five block challenges, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 09. Transformer 블록 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "결정적 absolute 위치 신호를 첫 블록 입력에 한 번 더하고, pre-LayerNorm causal Self-Attention과 position-wise FFN을 residual 경로로 감싸 [T,d_model]을 보존하는 decoder-only block을 실행·디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Transformer 블록", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByText("필수 LAB · PREDICT → CONFIGURE → ASSEMBLE → INSPECT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · PRE-NORM BLOCK REPAIR CONSOLE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "한 token을 E+P부터 두 번째 residual까지 숫자로 추적합니다" })).toBeVisible();
  await expect(page.getByText("Pre-norm 블록 stage 원장 검증", { exact: true })).toBeVisible();
  await expect(page.getByText("두 번째 residual 기준 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".transformer-block-python-bridge .notebook-cell")).toHaveCount(2);

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(completionButton).toBeDisabled();

  const lab = page.locator(".transformer-block-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const prediction = choiceGroup(lab, "Transformer block challenge 예측");
  const run = lab.getByRole("button", { name: "Transformer block 조립 실행" });
  const positionScale = lab.getByLabel("Transformer block position scale");

  await positionScale.fill("3");
  await choose(lab, "Transformer block challenge 예측", "position-added-before-attention");
  await run.click();
  await expect(lab.locator(".transformer-block-runtime-fallback")).toContainText("로컬 Transformer block runtime 실패");
  const recover = lab.getByRole("button", { name: "challenge 시작 preset으로 안전하게 복구" });
  await expect(recover).toBeFocused();
  await recover.click();
  await expect(prediction.getByRole("button").first()).toBeFocused();
  await expect(positionScale).toHaveValue("0");
  await expect(lab.locator(".transformer-block-runtime-fallback")).toHaveCount(0);
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(0);

  const positionPreset = lab.locator('[data-transformer-block-preset="position-input"]');
  await positionPreset.click();
  await positionScale.fill("1");
  await choose(lab, "Transformer block challenge 예측", "position-omitted");
  await run.click();
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("causal mask는 미래 visibility만 제한");
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(0);
  await choose(lab, "Transformer block challenge 예측", "position-added-before-attention");
  await run.click();
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("예측과 실행 계약이 맞았습니다");
  await lab.getByRole("button", { name: /^target x₀ = E \+ P \[4,4\], the, d0:/ }).click();
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("아직 필수 수치 증거가 아닙니다");
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(0);
  await lab.getByRole("button", { name: /^target x₀ = E \+ P \[4,4\], cat, d0:/ }).click();
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(1);

  await completeChallenge({
    lab,
    id: "layernorm",
    prediction: "feature-axis-centered-with-epsilon",
    configure: async () => choose(lab, "Transformer block pre-norm", "1"),
    requiredCell: /^target LN\(x₀\) \[4,4\], cat, d2:/,
    completedCount: 2,
  });
  await completeChallenge({
    lab,
    id: "attention-residual",
    prediction: "attention-update-adds-to-x0",
    configure: async () => choose(lab, "Transformer block 첫 residual", "1"),
    requiredCell: /^target x₁ \[4,4\], cat, d0:/,
    completedCount: 3,
  });
  await completeChallenge({
    lab,
    id: "positionwise-ffn",
    prediction: "shared-rowwise-relu-permutation-equivariant",
    configure: async () => choose(lab, "Transformer block FFN 공유", "1"),
    requiredCell: /^target FFN output \[4,4\], sat, d1:/,
    completedCount: 4,
  });
  await completeChallenge({
    lab,
    id: "block-handoff",
    prediction: "second-skip-preserves-tokens-and-width",
    configure: async () => choose(lab, "Transformer block 두 번째 residual", "1"),
    requiredCell: /^target block output y \[4,4\], sat, d0:/,
    completedCount: 5,
  });
  await expect(lab.locator(".transformer-block-evidence")).toHaveAttribute("data-mastered", "true");

  const incidents = page.locator(".transformer-block-debug-card");
  await expect(page.locator('.transformer-block-debug-progress[data-interactive-ready="true"]')).toHaveCount(1);
  await expect(incidents).toHaveCount(4);
  const incidentCount = await incidents.count();
  const wrongRepairs = [
    "omit-position-signal",
    "token-axis-with-epsilon",
    "replace-x0-with-attention",
    "per-position-parameters-plus-skip",
  ] as const;
  const correctRepairs = [
    "add-position-before-norm1",
    "feature-axis-with-epsilon",
    "add-x0-to-attention",
    "shared-rowwise-relu-plus-second-skip",
  ] as const;
  for (let index = 0; index < incidentCount; index += 1) {
    const incident = incidents.nth(index);
    const repairLabel = `${index + 1}번 Transformer block 사건 repair`;
    const applyRepair = incident.getByRole("button", { name: `${index + 1}번 Transformer block 사건 repair 적용 및 계약 실행` });
    await choose(incident, repairLabel, wrongRepairs[index]);
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveAttribute("data-repair-result", "incorrect");
    await expect(incident.locator(".transformer-block-debug-feedback")).toContainText("결함이 남아 있습니다");
    await choose(incident, repairLabel, correctRepairs[index]);
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveAttribute("data-repair-result", "correct");
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".transformer-block-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="position-input"][value="add-sinusoidal-once-before-first-block"]').check();
  await page.locator('input[name="prenorm-residual"][value="normalize-run-add-original"]').check();
  await page.locator('input[name="layernorm-axis"][value="features-within-token"]').check();
  await page.locator('input[name="positionwise-ffn"][value="shared-mlp-each-token-row"]').check();
  await page.locator('input[name="block-handoff"][value="hidden-state-same-token-model-shape"]').check();
  await page.getByRole("button", { name: "Transformer block 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", { exact: true })).toBeVisible();

  await expect(page.locator(".transformer-block-completion-checklist .is-complete")).toHaveCount(3);
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
  await expect(page).toHaveTitle("[Preview] 09. The Transformer Block · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Add a deterministic absolute positional signal once before the first block, then execute and debug a decoder-only pre-LayerNorm block whose causal self-attention and position-wise FFN preserve [T,d_model] through residual paths.",
  );
  await expect(page.getByRole("heading", { name: "The Transformer Block", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByRole("heading", { name: "Trace one token numerically from E+P through the second residual" })).toBeVisible();
  await expect(page.getByText("Verify the pre-norm block stage ledger", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair the second residual base", { exact: true })).toBeVisible();
  await expect(page.locator(".transformer-block-python-bridge .notebook-cell")).toHaveCount(2);

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

  const completionButton = page.getByRole("button", { name: "Completion is disabled in preview" });
  await expect(completionButton).toBeDisabled();
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".transformer-block-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const advancedSettings = lab.locator(".challenge-advanced-settings summary");
  const prediction = choiceGroup(lab, "Transformer block challenge prediction");
  const positionScale = lab.getByLabel("Transformer block position scale");
  const run = lab.getByRole("button", { name: "Assemble and run the Transformer block" });

  await positionScale.fill("3");
  await choose(lab, "Transformer block challenge prediction", "position-added-before-attention");
  await run.focus();
  await run.press("Enter");
  await expect(lab.locator(".transformer-block-runtime-fallback")).toContainText("Local Transformer block runtime failure");
  const recover = lab.getByRole("button", { name: "Recover safely to the challenge starting preset" });
  await expect(recover).toBeFocused();
  await recover.press("Enter");
  await expect(prediction.getByRole("button").first()).toBeFocused();
  await expect(positionScale).toHaveValue("0");

  const layerNormPreset = lab.locator('[data-transformer-block-preset="layernorm"]');
  await layerNormPreset.focus();
  await layerNormPreset.press("Enter");
  await expect(layerNormPreset).toHaveAttribute("aria-pressed", "true");
  await expect(prediction.getByRole("button").first()).toBeFocused();
  expect(await layerNormPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  await choose(lab, "Transformer block challenge prediction", "feature-axis-centered-with-epsilon");
  await run.focus();
  await run.press("Enter");
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("assembly setup is still broken");
  await expect(lab.locator(".transformer-block-stage-panel")).toContainText("LAYERNORM BYPASSED IN EXECUTED BRANCH");
  await expect(lab.locator(".transformer-block-stage-panel")).toContainText("REFERENCE LN STATS · NOT APPLIED");
  await expect(lab.getByRole("button", { name: /^executed Attention input x₀ · LN bypassed \[4,4\], cat, d2:/ })).toBeVisible();
  const preNormChoice = await choose(lab, "Transformer block pre-norm", "1");
  const correctPrediction = await choose(lab, "Transformer block challenge prediction", "feature-axis-centered-with-epsilon");
  await run.focus();
  await run.press("Enter");
  await expect(correctPrediction).toBeFocused();
  await expect(lab.locator(".transformer-block-live-feedback")).toContainText("Prediction and executed contract match");

  const normStage = lab.locator(".step-explorer").getByRole("tab", { name: "02 LN(x₀)", exact: true });
  await normStage.focus();
  await normStage.press("Enter");
  await expect(normStage).toBeFocused();
  await expect(normStage).toHaveAttribute("aria-selected", "true");
  const normCell = lab.getByRole("button", { name: /^target LN\(x₀\) \[4,4\], cat, d2:/ });
  await normCell.focus();
  await normCell.press("Enter");
  await expect(normCell).toBeFocused();
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(1);

  const coreControls = [advancedSettings, layerNormPreset, preNormChoice, correctPrediction, run, normStage, normCell];
  for (const target of coreControls) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }
  expect(await transformerBlockOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const resetLab = lab.getByRole("button", { name: "Reset the entire Transformer block lab", exact: true });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(resetLab).toBeFocused();
  await expect(prediction.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(lab.locator(".transformer-block-evidence .is-complete")).toHaveCount(0);

  const firstIncident = page.locator('.transformer-block-debug-card[data-scenario-id="position-placement"]');
  const repairSelect = choiceGroup(firstIncident, "Repair for Transformer block incident 1");
  await choose(firstIncident, "Repair for Transformer block incident 1", "omit-position-signal");
  const applyRepair = firstIncident.getByRole("button", { name: "Apply repair and run contract for Transformer block incident 1" });
  await applyRepair.focus();
  await applyRepair.press("Enter");
  await expect(applyRepair).toBeFocused();
  await expect(firstIncident).toHaveAttribute("data-repair-result", "incorrect");
  await expect(firstIncident.locator(".transformer-block-debug-feedback")).toContainText("does not create an absolute position vector");
  for (const target of [repairSelect, applyRepair]) {
    const box = await target.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
  }

  const resetIncident = firstIncident.getByRole("button", { name: "Reset Transformer block incident 1" });
  await resetIncident.focus();
  await resetIncident.press("Enter");
  await expect(resetIncident).toBeFocused();
  await expect(repairSelect.locator('[aria-pressed="true"]')).toHaveCount(0);

  const resetDebugger = page.getByRole("button", { name: "Reset the entire Transformer block debugger", exact: true });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(resetDebugger).toBeFocused();
  await expect(repairSelect.locator('[aria-pressed="true"]')).toHaveCount(0);

  const conceptAnswers = [
    ['input[name="position-input"][value="add-sinusoidal-once-before-first-block"]'],
    ['input[name="prenorm-residual"][value="normalize-run-add-original"]'],
    ['input[name="layernorm-axis"][value="features-within-token"]'],
    ['input[name="positionwise-ffn"][value="shared-mlp-each-token-row"]'],
    ['input[name="block-handoff"][value="hidden-state-same-token-model-shape"]'],
  ] as const;
  for (const [selector] of conceptAnswers) {
    const answer = page.locator(selector);
    await answer.focus();
    await answer.press("Space");
    await expect(answer).toBeChecked();
  }
  const checkConcepts = page.getByRole("button", { name: "Check the Transformer block contract" });
  await checkConcepts.focus();
  await checkConcepts.press("Enter");
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();

  expect(await transformerBlockOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("retries and completes independent Transformer Block practice on fresh fixtures", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);

  const practice = page.locator(".transformer-block-practice-deck");
  expect(await practice.locator("select").count()).toBe(0);
  await expect(practice.getByRole("heading", {
    name: "Can you preserve Transformer Block state outside the guided lab?",
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
    "Predict the two-residual state flow",
    "second-branch-reuses-x0",
  );
  await choose(
    practice,
    "learnerResiduals",
    "reuse-x0-second-skip",
  );
  await practice.getByRole("button", {
    name: "Run both fresh residual ledgers",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-failed/);
  await expect(practice.locator(".practice-result")).toContainText(
    "max error=",
  );

  await choose(
    practice,
    "Predict the two-residual state flow",
    "both-branches-update-shared-stream",
  );
  await choose(practice, "learnerResiduals", "two-residual-updates");
  await practice.getByRole("button", {
    name: "Run both fresh residual ledgers",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  const navigation = practice.locator(".practice-deck-navigation button");
  await navigation.nth(1).focus();
  await navigation.nth(1).press("Enter");
  await choose(
    practice,
    "Predict a common feature shift",
    "branch-stays-output-shifts",
  );
  await choose(practice, "learnerNormBoundary", "prenorm-plus-skip");
  await practice.getByRole("button", {
    name: "Run both pre-norm shift contracts",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  await navigation.nth(2).focus();
  await navigation.nth(2).press("Space");
  await choose(
    practice,
    "Predict the two-block position and state boundary",
    "position-once-then-handoff-y",
  );
  await choose(practice, "learnerHandoff", "position-once-handoff-y");
  await practice.getByRole("button", {
    name: "Run both two-block handoffs",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("3 / 3");
  await expect(practice.locator(".practice-deck-evidence")).toContainText(
    "You produced residual-ledger, pre-norm-shift, and two-block-handoff evidence.",
  );
  await expect(completionButton).toHaveAttribute(
    "data-completion-ready",
    "false",
  );

  await practice.getByRole("button", {
    name: "Reset all three challenges",
  }).click();
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("0 / 3");
  await expect(
    choiceGroup(practice, "Predict the two-residual state flow")
      .locator('[data-choice-value="both-branches-update-shared-stream"]'),
  ).toBeFocused();
  expect(await transformerBlockOverflow(page)).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

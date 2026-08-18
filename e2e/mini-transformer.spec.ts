import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/mini-transformer";
const publicPath = "/curricula/transformer-from-zero/chapters/mini-transformer";

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

async function miniTransformerOverflow(page: TestPage) {
  return page.locator(
    ".mini-transformer-chapter-shell, .mini-transformer-boundary-grid, .mini-transformer-formula-stack, .mini-transformer-flow, .mini-transformer-shift-example, .mini-transformer-decode-steps, .mini-transformer-workbench, .mini-transformer-preset-row, .mini-transformer-control-panel, .mini-transformer-run-actions, .mini-transformer-workbench .step-explorer, .mini-transformer-stage-panel, .mini-transformer-matrix-stack, .mini-transformer-matrix-stack .array-diagram, .mini-transformer-matrix-stack .array-diagram-scroll, .mini-transformer-stat-grid, .mini-transformer-generation-trace, .mini-transformer-evidence, .mini-transformer-python-bridge, .mini-transformer-python-bridge .notebook-cell, .mini-transformer-debugger-lab, .mini-transformer-debug-progress, .mini-transformer-debug-grid, .mini-transformer-debug-card, .mini-transformer-debug-actions, .mini-transformer-debug-feedback, .mini-transformer-practice-deck, .mini-transformer-practice-deck .practice-workspace, .mini-transformer-practice-deck .practice-support-code, .mini-transformer-practice-deck .practice-learner-controls, .mini-transformer-practice-deck .practice-result, .mini-transformer-transfer-task, .mini-transformer-completion-checklist, .mini-transformer-chapter-shell .math-formula-display",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
}

async function activate(control: Locator, useKeyboard = false) {
  if (useKeyboard) {
    await control.focus();
    await control.press("Enter");
  } else {
    await control.click();
  }
}

async function expectMinimumTarget(control: Locator) {
  const box = await control.boundingBox();
  expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  expect(box?.width ?? 0).toBeGreaterThanOrEqual(44);
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
  const preset = lab.locator(`[data-mini-transformer-preset="${id}"]`);
  await preset.click();
  await expect(preset).toHaveAttribute("aria-pressed", "true");
  await configure();
  await choose(lab, "Mini Transformer challenge 예측", prediction);
  await lab.getByRole("button", { name: "Mini Transformer 실행" }).click();
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("예측과 실행 계약이 맞았습니다");
  await lab.getByRole("button", { name: requiredCell }).click();
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(completedCount);
}

test("completes five model challenges, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 10. Mini Transformer · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "결정적 tokenizer→embedding+position→pre-LayerNorm decoder block→final norm→vocabulary logits를 연결하고, shifted target loss·한 번의 LM-head update와 EOS/max-length autoregressive decoding을 실행·디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Mini Transformer", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByText("필수 LAB · PREDICT → CONFIGURE → RUN → INSPECT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · COMPLETE MODEL REPAIR CONSOLE", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "shifted loss와 generation controller를 실제 NumPy로 분리해 검증합니다" })).toBeVisible();
  await expect(page.getByText("shifted cross entropy와 LM-head 한 번 갱신", { exact: true })).toBeVisible();
  await expect(page.getByText("append·recompute·stop generation controller 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".mini-transformer-python-bridge .notebook-cell")).toHaveCount(2);

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(completionButton).toBeDisabled();

  const lab = page.locator(".mini-transformer-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const prediction = choiceGroup(lab, "Mini Transformer challenge 예측");
  const run = lab.getByRole("button", { name: "Mini Transformer 실행" });
  const embedStressPreset = lab.locator('[data-mini-transformer-preset="embed-position"]');
  await embedStressPreset.click();
  const positionScale = lab.getByLabel("Mini Transformer position scale");

  await positionScale.fill("3");
  await choose(lab, "Mini Transformer challenge 예측", "embedding-plus-position-once");
  await run.click();
  await expect(lab.locator(".mini-transformer-runtime-fallback")).toContainText("로컬 Mini Transformer runtime 실패");
  const recover = lab.getByRole("button", { name: "challenge 시작 preset으로 안전하게 복구" });
  await expect(recover).toBeFocused();
  await recover.click();
  await expect(prediction.getByRole("button").first()).toBeFocused();
  await expect(positionScale).toHaveValue("0");
  await expect(lab.locator(".mini-transformer-runtime-fallback")).toHaveCount(0);
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(0);

  const tokenizePreset = lab.locator('[data-mini-transformer-preset="tokenize"]');
  await tokenizePreset.click();
  const bos = choiceGroup(lab, "Mini Transformer BOS 추가");
  await expect(bos.locator('[data-choice-value="0"]')).toHaveAttribute("aria-pressed", "true");
  await choose(lab, "Mini Transformer BOS 추가", "1");
  await choose(lab, "Mini Transformer challenge 예측", "prompt-only-no-bos");
  await run.click();
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("예측의 경계를 다시 보세요");
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("BOS");
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(0);
  await choose(lab, "Mini Transformer challenge 예측", "bos-and-vocabulary-ids");
  await run.click();
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("예측과 실행 계약이 맞았습니다");
  await lab.getByRole("button", { name: /^token IDs \[T,1\], 1:the, id: 1$/ }).click();
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("아직 필수 수치 증거가 아닙니다");
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(0);
  await lab.getByRole("button", { name: /^token IDs \[T,1\], 0:<bos>, id: 0$/ }).click();
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(1);

  await completeChallenge({
    lab,
    id: "embed-position",
    prediction: "embedding-plus-position-once",
    configure: async () => positionScale.fill("1"),
    requiredCell: /^x0 = E \+ P \[T,4\], 1:the, d0:/,
    completedCount: 2,
  });
  await completeChallenge({
    lab,
    id: "causal-block",
    prediction: "causal-prefix-preserves-shape",
    configure: async () => choose(lab, "Mini Transformer causal mask", "1"),
    requiredCell: /^head 0 attention weights \[T,T\], 0:<bos>, the:/,
    completedCount: 3,
  });
  await completeChallenge({
    lab,
    id: "vocab-projection",
    prediction: "last-hidden-to-vocab-row-softmax",
    configure: async () => choose(lab, "Mini Transformer probability axis", "vocabulary"),
    requiredCell: /^vocabulary probabilities \[T,8\], cat, sat:/,
    completedCount: 4,
  });
  await completeChallenge({
    lab,
    id: "autoregressive-decode",
    prediction: "append-recompute-stop-eos-or-limit",
    configure: async () => choose(lab, "Mini Transformer prefix 재실행", "1"),
    requiredCell: /^last-row next-token probabilities by generation step, step 1, \.:/,
    completedCount: 5,
  });
  await expect(lab.locator(".mini-transformer-evidence")).toHaveAttribute("data-mastered", "true");

  const incidents = page.locator(".mini-transformer-debug-card");
  await expect(page.locator('.mini-transformer-debug-progress[data-interactive-ready="true"]')).toHaveCount(1);
  await expect(incidents).toHaveCount(4);
  const wrongRepairs = [
    "character-codepoints",
    "unmasked-row-softmax",
    "sequence-axis-softmax",
    "reuse-first-prefix",
  ] as const;
  const correctRepairs = [
    "bos-vocabulary-tokenization",
    "mask-before-row-softmax",
    "final-norm-vocab-softmax-ce-descent",
    "append-recompute-stop",
  ] as const;
  for (let index = 0; index < 4; index += 1) {
    const incident = incidents.nth(index);
    const repairLabel = `${index + 1}번 Mini Transformer 사건 repair`;
    const applyRepair = incident.getByRole("button", { name: `${index + 1}번 Mini Transformer repair 실행` });
    await choose(incident, repairLabel, wrongRepairs[index]);
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveClass(/is-incorrect/);
    await expect(incident.locator(".mini-transformer-debug-feedback")).toContainText("계약 불일치");
    await choose(incident, repairLabel, correctRepairs[index]);
    await applyRepair.click();
    await expect(applyRepair).toBeFocused();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.getByText("계약 복구", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".mini-transformer-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="shifted-target"][value="prefix-row-predicts-following-token"]').check();
  await page.locator('input[name="lm-head-boundary"][value="final-norm-then-vocabulary-projection"]').check();
  await page.locator('input[name="softmax-loss-axis"][value="vocabulary-axis-per-token-row"]').check();
  await page.locator('input[name="head-update"][value="subtract-loss-gradient-from-head"]').check();
  await page.locator('input[name="autoregressive-loop"][value="append-recompute-stop-on-eos-or-limit"]').check();
  await page.getByRole("button", { name: "Mini Transformer 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", { exact: true })).toBeVisible();

  await expect(page.locator(".mini-transformer-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("retries and completes independent Mini Transformer practice on fresh fixtures", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);

  const practice = page.locator(".mini-transformer-practice-deck");
  expect(await practice.locator("select").count()).toBe(0);
  await expect(practice.getByRole("heading", {
    name: "Can you preserve Mini Transformer state flow outside the guided lab?",
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
    "Predict the causal suffix result",
    "suffix-rewrites-every-row",
  );
  await choose(practice, "learnerPrefixRead", "reuse-full-last-row");
  await practice.getByRole("button", {
    name: "Run both causal-prefix fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-failed/);
  await expect(practice.locator(".practice-result")).toContainText(
    "max prefix-logit error=",
  );

  await choose(
    practice,
    "Predict the causal suffix result",
    "suffix-cannot-change-prefix-rows",
  );
  await choose(
    practice,
    "learnerPrefixRead",
    "compare-matching-prefix-rows",
  );
  await practice.getByRole("button", {
    name: "Run both causal-prefix fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  const navigation = practice.locator(".practice-deck-navigation button");
  await navigation.nth(1).focus();
  await navigation.nth(1).press("Enter");
  await choose(
    practice,
    "Predict the training and generation row boundary",
    "train-all-rows-generate-last-row",
  );
  await choose(
    practice,
    "learnerRowBoundary",
    "separate-training-and-generation",
  );
  await practice.getByRole("button", {
    name: "Run both row-read fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);

  await navigation.nth(2).focus();
  await navigation.nth(2).press("Space");
  await choose(
    practice,
    "Predict KV-cache semantics",
    "cache-kv-preserves-context",
  );
  await choose(practice, "learnerKvCache", "append-keys-and-values");
  await practice.getByRole("button", {
    name: "Run both KV-cache fixtures",
  }).click();
  await expect(practice.locator(".practice-result")).toHaveClass(/is-passed/);
  await expect(practice.locator(".practice-deck-header > strong")).toHaveText("3 / 3");
  await expect(practice.locator(".practice-deck-evidence")).toContainText(
    "You produced causal-prefix, row-readout, and KV-cache-equivalence evidence.",
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
    choiceGroup(practice, "Predict the causal suffix result")
      .locator('[data-choice-value="suffix-cannot-change-prefix-rows"]'),
  ).toBeFocused();
  expect(await miniTransformerOverflow(page)).toEqual([]);
  expect(consoleErrors).toEqual([]);
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
  await expect(page).toHaveTitle("[Preview] 10. Mini Transformer · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Connect a deterministic tokenizer, embedding plus position, one pre-LayerNorm decoder block, final normalization, and vocabulary logits, then execute and debug shifted-target loss, one LM-head update, and EOS/max-length autoregressive decoding.",
  );
  await expect(page.getByRole("heading", { name: "Mini Transformer", exact: true })).toBeVisible();
  expect(await page.locator(".lesson-article select").count()).toBe(0);
  await expect(page.getByRole("heading", { name: "Verify shifted loss and the generation controller separately in real NumPy" })).toBeVisible();
  await expect(page.getByText("Shifted cross entropy and one LM-head update", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair the append, recompute, and stop generation controller", { exact: true })).toBeVisible();
  await expect(page.locator(".mini-transformer-python-bridge .notebook-cell")).toHaveCount(2);

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

  const lab = page.locator(".mini-transformer-workbench");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const advancedSettings = lab.locator(".challenge-advanced-settings summary");
  const prediction = choiceGroup(lab, "Mini Transformer challenge prediction");
  const embedStressPreset = lab.locator('[data-mini-transformer-preset="embed-position"]');
  await activate(embedStressPreset, true);
  const positionScale = lab.getByLabel("Mini Transformer position scale");
  const run = lab.getByRole("button", { name: "Run the Mini Transformer" });

  await positionScale.fill("3");
  await choose(lab, "Mini Transformer challenge prediction", "embedding-plus-position-once");
  await activate(run, true);
  await expect(lab.locator(".mini-transformer-runtime-fallback")).toContainText("Local Mini Transformer runtime failure");
  const recover = lab.getByRole("button", { name: "Recover safely to the challenge starting preset" });
  await expect(recover).toBeFocused();
  await activate(recover, true);
  await expect(prediction.getByRole("button").first()).toBeFocused();
  await expect(positionScale).toHaveValue("0");

  const embedPreset = lab.locator('[data-mini-transformer-preset="embed-position"]');
  await activate(embedPreset, true);
  await expect(embedPreset).toHaveAttribute("aria-pressed", "true");
  await expect(prediction.getByRole("button").first()).toBeFocused();
  expect(await embedPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  await choose(lab, "Mini Transformer challenge prediction", "embedding-plus-position-once");
  await activate(run, true);
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("Repair the execution settings");
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("Position error");
  await positionScale.fill("1");
  await choose(lab, "Mini Transformer challenge prediction", "embedding-plus-position-once");
  await activate(run, true);
  await expect(run).toBeFocused();
  await expect(lab.locator(".mini-transformer-live-feedback")).toContainText("Prediction and execution contracts match");

  const embedStage = lab.locator(".step-explorer").getByRole("tab", { name: /02.*Embedding \+ position/ });
  await activate(embedStage, true);
  await expect(embedStage).toBeFocused();
  await expect(embedStage).toHaveAttribute("aria-selected", "true");
  const causalStage = lab.locator(".step-explorer").getByRole("tab", { name: /03.*Causal block/ });
  await embedStage.press("ArrowRight");
  await expect(causalStage).toBeFocused();
  await expect(causalStage).toHaveAttribute("aria-selected", "true");
  await causalStage.press("ArrowLeft");
  await expect(embedStage).toBeFocused();
  await expect(embedStage).toHaveAttribute("aria-selected", "true");
  const embedCell = lab.getByRole("button", { name: /^x0 = E \+ P \[T,4\], 1:the, d0:/ });
  await activate(embedCell, true);
  await expect(embedCell).toBeFocused();
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(1);
  const embedGrid = embedCell.locator("xpath=ancestor::figure[1]");
  const adjacentCell = lab.getByRole("button", { name: /^x0 = E \+ P \[T,4\], 1:the, d1:/ });
  await expect(embedGrid.locator('button[tabindex="0"]')).toHaveCount(1);
  await embedCell.press("ArrowRight");
  await expect(adjacentCell).toBeFocused();
  await expect(embedCell).toHaveAttribute("tabindex", "-1");
  await adjacentCell.press("ArrowLeft");
  await expect(embedCell).toBeFocused();

  const selectedPrediction = choiceGroup(lab, "Mini Transformer challenge prediction").locator('[aria-pressed="true"]');
  for (const control of [advancedSettings, embedPreset, positionScale, selectedPrediction, run, embedStage, embedCell]) {
    await expectMinimumTarget(control);
  }
  expect(await miniTransformerOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const resetLab = lab.getByRole("button", { name: "Reset the entire Mini Transformer lab", exact: true });
  await activate(resetLab, true);
  await expect(resetLab).toBeFocused();
  await expect(prediction.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(lab.locator(".mini-transformer-evidence .is-complete")).toHaveCount(0);

  const firstIncident = page.locator('.mini-transformer-debug-card[data-mini-transformer-incident="tokenizer-boundary"]');
  const repairSelect = choiceGroup(firstIncident, "Mini Transformer incident 1 repair");
  await choose(firstIncident, "Mini Transformer incident 1 repair", "character-codepoints");
  const applyRepair = firstIncident.getByRole("button", { name: "Run Mini Transformer repair 1" });
  await activate(applyRepair, true);
  await expect(applyRepair).toBeFocused();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".mini-transformer-debug-feedback")).toContainText("left the eight-row embedding range");
  for (const control of [repairSelect, applyRepair]) await expectMinimumTarget(control);

  const resetIncident = firstIncident.getByRole("button", { name: "Reset Mini Transformer incident 1" });
  await activate(resetIncident, true);
  await expect(resetIncident).toBeFocused();
  await expect(repairSelect.locator('[aria-pressed="true"]')).toHaveCount(0);

  const resetDebugger = page.getByRole("button", { name: "Reset the entire Mini Transformer debugger", exact: true });
  await activate(resetDebugger, true);
  await expect(resetDebugger).toBeFocused();
  await expect(repairSelect.locator('[aria-pressed="true"]')).toHaveCount(0);

  const conceptAnswers = [
    'input[name="shifted-target"][value="prefix-row-predicts-following-token"]',
    'input[name="lm-head-boundary"][value="final-norm-then-vocabulary-projection"]',
    'input[name="softmax-loss-axis"][value="vocabulary-axis-per-token-row"]',
    'input[name="head-update"][value="subtract-loss-gradient-from-head"]',
    'input[name="autoregressive-loop"][value="append-recompute-stop-on-eos-or-limit"]',
  ] as const;
  for (const selector of conceptAnswers) {
    const answer = page.locator(selector);
    await answer.focus();
    await answer.press("Space");
    await expect(answer).toBeChecked();
  }
  const checkConcepts = page.getByRole("button", { name: "Check the Mini Transformer contract" });
  await activate(checkConcepts, true);
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();

  expect(await miniTransformerOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/neural-networks";
const publicPath = "/curricula/transformer-from-zero/chapters/neural-networks";

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

async function completeXorLab(
  page: TestPage,
  { includeWrongPrediction = false }: { includeWrongPrediction?: boolean } = {},
) {
  const lab = page.locator(".neural-xor-lab");
  const runBoundary = lab.getByRole("button", { name: "직선 경계 실행" });
  await expect(choiceGroup(lab, "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?").locator('[aria-pressed="true"]')).toHaveCount(0);

  if (includeWrongPrediction) {
    await choose(lab, "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?", "four");
    await expect(choiceOption(lab, "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?", "four")).toHaveAttribute("aria-pressed", "true");
    await expect(runBoundary).toBeEnabled();
    await runBoundary.click();
    const wrongFeedback = lab.locator(".neural-prediction-step p.is-incorrect");
    await expect(wrongFeedback).toHaveAttribute("role", "status");
    await expect(wrongFeedback).toHaveAttribute("aria-live", "polite");
    await expect(wrongFeedback).toContainText(
      "대표 직선은 3/4",
    );
  }

  await choose(lab, "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?", "three");
  await expect(choiceOption(lab, "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?", "three")).toHaveAttribute("aria-pressed", "true");
  await expect(runBoundary).toBeEnabled();
  await runBoundary.click();
  const correctFeedback = lab.locator(".neural-prediction-step p.is-correct");
  await expect(correctFeedback).toHaveAttribute("role", "status");
  await expect(correctFeedback).toHaveAttribute("aria-live", "polite");
  await expect(correctFeedback).toContainText(
    "맞았습니다. 대표 직선은 3/4",
  );

  await choose(lab, "hidden activation", "sigmoid");
  await choose(lab, "hidden unit h₂", "nand");
  await lab.getByRole("button", { name: "네 행 forward pass 실행·판정" }).click();

  const masteryFeedback = lab.locator(".neural-live-feedback");
  await expect(masteryFeedback).toContainText("XOR 4/4, 평균 BCE");
  await expect(masteryFeedback).toContainText("h₁ 또는 h₂를 지우면 각각 2/4, 2/4");
  await expect(masteryFeedback).toContainText("두 feature가 모두 원인으로 작동합니다");
  await expect(lab.locator(".neural-truth-card.is-correct")).toHaveCount(4);
  await expect(lab.locator(".neural-evidence .is-complete")).toHaveCount(4);
}

async function completeBackpropLab(
  page: TestPage,
  { includeWrongFactors = false }: { includeWrongFactors?: boolean } = {},
) {
  const lab = page.locator(".neural-backprop-lab");
  const runStep = lab.getByRole("button", { name: "역전파 1 step 실행·판정" });

  if (includeWrongFactors) {
    await choose(lab, "hidden으로 돌아오는 upstream factor", "first-weight-transpose");
    await choose(lab, "hidden sigmoid의 local derivative", "activation-value");
    await runStep.click();
    await expect(lab.locator("#neural-backprop-feedback")).toContainText(
      "두 factor를 모두 다시 보세요",
    );
    await expect(lab.locator('[data-testid="neural-backprop-gradient-trace"]')).toHaveCount(0);
    await expect(lab.locator(".neural-evidence .is-complete")).toHaveCount(0);
  }

  await choose(lab, "hidden으로 돌아오는 upstream factor", "output-weight-transpose");
  await choose(lab, "hidden sigmoid의 local derivative", "sigmoid-local-derivative");
  await runStep.click();

  const gradientTrace = lab.getByRole("group", { name: "hidden-layer gradient shape 추적" });
  await expect(gradientTrace).toContainText("δ² = p−y [4, 1]");
  await expect(gradientTrace).toContainText("δ¹ [4, 2]");
  await expect(gradientTrace).toContainText("∇W¹ [2, 2]");
  await expect(lab.getByRole("article", { name: "대표 XOR 행의 chain-rule 기여" })).toContainText(
    "x₂=0이므로 W¹의 두 번째 입력 행 기여가 [0,0]",
  );
  await expect(lab.locator("#neural-backprop-feedback")).toContainText(
    "평균 BCE가 0.329 → 0.315로 감소했고 XOR 4/4를 유지",
  );
  await expect(lab.locator(".neural-evidence .is-complete")).toHaveCount(4);
}

test("completes XOR, hidden backprop, network surgery, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 03. 분류와 신경망 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "sigmoid와 BCE로 이진 분류를 읽고, hidden feature로 XOR을 조립한 뒤 chain rule로 두 weight 층까지 역전파합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  const previewBanner = page.locator(".publication-preview-banner");
  await expect(previewBanner.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(previewBanner.getByText(/03\. 분류와 신경망 · 공개 분석, 토론, 진도 저장이 비활성화/)).toBeVisible();
  await expect(previewBanner.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute(
    "href",
    publicPath,
  );
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "분류와 신경망" })).toBeVisible();
  await expect(page.getByText("필수 LAB · XOR FORWARD PASS", { exact: true })).toBeVisible();
  await expect(page.getByText("필수 LAB · HIDDEN BACKPROP", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · NETWORK SURGERY", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "시뮬레이터의 XOR을 실제 NumPy forward pass로 옮깁니다" })).toBeVisible();
  await expect(page.getByText("직선 하나로 XOR을 탐색", { exact: true })).toBeVisible();
  const collapseTrace = page.getByRole("group", { name: "activation이 없을 때 두 affine이 하나로 합쳐지는 수치 추적" });
  await expect(collapseTrace.getByRole("heading", { name: "유효 가중치 [0, 0], 유효 편향 52" })).toBeVisible();
  await expect(collapseTrace.getByRole("heading", { name: "logits = [52, 52, 52, 52]" })).toBeVisible();
  await expect(collapseTrace).toContainText("2/4에 머뭅니다");
  await expect(page.getByText("빠진 hidden activation 수리", { exact: true })).toBeVisible();

  const completeButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completeButton).toHaveAttribute("data-completion-ready", "false");

  await completeXorLab(page, { includeWrongPrediction: true });
  const xorLab = page.locator(".neural-xor-lab");
  await xorLab.getByRole("button", { name: "전체 초기화" }).click();
  await expect(xorLab.locator(".neural-evidence .is-complete")).toHaveCount(0);
  await expect(choiceOption(xorLab, "hidden activation", "identity")).toHaveAttribute("aria-pressed", "true");
  await completeXorLab(page);
  await expect(completeButton).toHaveAttribute("data-completion-ready", "false");

  await completeBackpropLab(page, { includeWrongFactors: true });
  const backpropLab = page.locator(".neural-backprop-lab");
  await backpropLab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(backpropLab.locator(".neural-evidence .is-complete")).toHaveCount(0);
  await expect(choiceGroup(backpropLab, "hidden으로 돌아오는 upstream factor").locator('[aria-pressed="true"]')).toHaveCount(0);
  await completeBackpropLab(page);
  await expect(completeButton).toHaveAttribute("data-completion-ready", "false");

  const incidents = page.locator(".neural-debug-card");
  const missingActivation = incidents.nth(1);
  await choose(missingActivation, "적용할 patch", "identity");
  await missingActivation.getByRole("button", { name: "patch 적용·실행" }).click();
  await expect(missingActivation).toHaveClass(/is-incorrect/);
  await expect(missingActivation.locator(".neural-debug-feedback")).toContainText("결함이 남아 있습니다");

  const repairs = ["2x2", "sigmoid", "xor", "sigmoid"] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await choose(incident, "적용할 patch", repairs[index]);
    await incident.getByRole("button", { name: "patch 적용·실행" }).click();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.locator(".neural-debug-feedback")).toContainText("계약 복구");
  }
  await expect(page.locator(".neural-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="logit-to-probability"][value="sigmoid-maps-logit-to-probability"]').check();
  await page.locator('input[name="bce-penalty"][value="confident-wrong-costs-most"]').check();
  await page.locator('input[name="activation-purpose"][value="nonlinearity-bends-boundaries"]').check();
  await page.locator('input[name="xor-hidden-features"][value="combine-hidden-features"]').check();
  await page.locator('input[name="layer-shapes"][value="gradient-matches-first-weights"]').check();
  await page.getByRole("button", { name: "신경망 왕복 흐름 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 필수 lab의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".neural-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completeButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completeButton).toBeDisabled();

  await backpropLab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(backpropLab.locator(".neural-evidence .is-complete")).toHaveCount(0);
  await expect(completeButton).toHaveAttribute("data-completion-ready", "false");
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with no heavy runtime or public access", async ({ page }) => {
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 03. Classification and Neural Networks · Rootorial");
  await expect(page.getByRole("heading", { name: "Classification and Neural Networks" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Reading cached forward values in reverse produces hidden gradients" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Restore two missing chain-rule factors and reduce BCE with one update" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Move the simulator's XOR into a real NumPy forward pass" })).toBeVisible();
  await expect(page.getByText("Search XOR with one line", { exact: true })).toBeVisible();
  const collapseTrace = page.getByRole("group", { name: "Numeric trace of two affine maps collapsing without an activation" });
  await expect(collapseTrace.getByRole("heading", { name: "Effective weights [0, 0], effective bias 52" })).toBeVisible();
  await expect(collapseTrace.getByRole("heading", { name: "logits = [52, 52, 52, 52]" })).toBeVisible();
  await expect(collapseTrace).toContainText("accuracy stops at 2/4");
  await expect(page.getByText("Repair the missing hidden activation", { exact: true })).toBeVisible();

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

  const xorLab = page.locator(".neural-xor-lab");
  const invertedPreset = xorLab.getByRole("button", { name: "Inverted output" });
  await invertedPreset.focus();
  await invertedPreset.press("Enter");
  await expect(choiceOption(xorLab, "Output affine head", "inverted")).toHaveAttribute("aria-pressed", "true");

  const collapsedPreset = xorLab.getByRole("button", { name: "Collapsed linear" });
  await collapsedPreset.focus();
  await collapsedPreset.press("Enter");
  await expect(choiceOption(xorLab, "Hidden activation", "identity")).toHaveAttribute("aria-pressed", "true");
  await expect(choiceOption(xorLab, "Hidden unit h₂", "nand")).toHaveAttribute("aria-pressed", "true");

  const resetLab = xorLab.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(choiceGroup(xorLab, "At most how many XOR points can one affine+sigmoid classify?").locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(choiceOption(xorLab, "Hidden unit h₂", "and")).toHaveAttribute("aria-pressed", "true");

  await choose(xorLab, "At most how many XOR points can one affine+sigmoid classify?", "three");
  const runBoundary = xorLab.getByRole("button", { name: "Run linear boundary" });
  await runBoundary.focus();
  await runBoundary.press("Enter");
  await expect(xorLab.locator(".neural-prediction-step p.is-correct")).toContainText(
    "Correct. The representative line gets 3/4",
  );
  await choose(xorLab, "Hidden activation", "sigmoid");
  await choose(xorLab, "Hidden unit h₂", "nand");
  const runForward = xorLab.getByRole("button", { name: "Run and grade four-row forward pass" });
  await runForward.focus();
  await runForward.press("Enter");
  const masteryFeedback = xorLab.locator(".neural-live-feedback");
  await expect(masteryFeedback).toContainText("XOR is 4/4 with mean BCE");
  await expect(masteryFeedback).toContainText("Removing h₁ or h₂ drops the scores to 2/4 and 2/4");
  await expect(masteryFeedback).toContainText("both features are causally used");
  await expect(xorLab.locator(".neural-truth-card.is-correct")).toHaveCount(4);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const backpropLab = page.locator(".neural-backprop-lab");
  await choose(backpropLab, "Upstream factor returning to hidden", "output-weight-transpose");
  await choose(backpropLab, "Hidden sigmoid local derivative", "sigmoid-local-derivative");
  const runBackprop = backpropLab.getByRole("button", { name: "Run and grade one backprop step" });
  await runBackprop.focus();
  await runBackprop.press("Enter");
  await expect(backpropLab.locator("#neural-backprop-feedback")).toContainText(
    "Mean BCE across all four rows fell from 0.329 to 0.315 while XOR stayed 4/4",
  );
  await expect(backpropLab.locator(".neural-evidence .is-complete")).toHaveCount(4);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const resetBackprop = backpropLab.getByRole("button", { name: "Reset lab" });
  await resetBackprop.focus();
  await resetBackprop.press("Enter");
  await expect(choiceGroup(backpropLab, "Upstream factor returning to hidden").locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(choiceGroup(backpropLab, "Hidden sigmoid local derivative").locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect(backpropLab.locator(".neural-evidence .is-complete")).toHaveCount(0);

  const firstIncident = page.locator(".neural-debug-card").first();
  await choose(firstIncident, "Patch to apply", "3x2");
  await firstIncident.getByRole("button", { name: "Apply patch and run" }).click();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(choiceGroup(firstIncident, "Patch to apply").locator('[aria-pressed="true"]')).toHaveCount(0);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("retries and completes the independent neural-network practice without hidden choices", async ({ page }) => {
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);

  const practice = page.getByRole("region", {
    name: "Can you rebuild the forward and backward contracts on fresh inputs?",
  });
  await expect(practice).toBeVisible();

  await choose(
    practice,
    "Predict loss direction after one update",
    "both-increase",
  );
  await choose(practice, "learnerSignal", "y-minus-p");
  await practice.getByRole("button", { name: "Run both scalar fixtures" }).click();
  await expect(practice.getByText(
    "Inspect the first failed contract, then run the same challenge again.",
  )).toBeVisible();

  await choose(
    practice,
    "Predict loss direction after one update",
    "both-decrease",
  );
  await choose(practice, "learnerSignal", "p-minus-y");
  await practice.getByRole("button", { name: "Run both scalar fixtures" }).click();
  await expect(practice.getByText("✓ δ² = ?", { exact: true })).toBeVisible();

  const gradientChallenge = practice.getByRole("button", {
    name: "02 · Multi-boundary Gradient check",
    exact: true,
  });
  await gradientChallenge.press("Enter");
  await expect(gradientChallenge).toHaveAttribute("aria-pressed", "true");
  await choose(
    practice,
    "Predict analytic-to-numeric results",
    "both-match",
  );
  await choose(practice, "learnerHiddenPath", "complete-chain");
  await practice.getByRole("button", {
    name: "Compare analytic and numeric gradients",
  }).click();
  await expect(practice.getByText("✓ Gradient check", { exact: true })).toBeVisible();

  const transferChallenge = practice.getByRole("button", {
    name: "03 · Transfer XOR → XNOR",
    exact: true,
  });
  await transferChallenge.press(" ");
  await expect(transferChallenge).toHaveAttribute("aria-pressed", "true");
  await choose(practice, "Predict the XNOR truth table", "invert-labels");
  await choose(practice, "learnerTransform", "negate-logit");
  await practice.getByRole("button", { name: "Run both XNOR fixtures" }).click();
  await expect(practice.getByText("✓ XOR → XNOR", { exact: true })).toBeVisible();
  await expect(practice.getByText("3 / 3", { exact: true })).toBeVisible();

  expect(await page.locator("select").count()).toBe(0);
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - window.innerWidth,
  )).toBeLessThanOrEqual(1);
  const undersized = await practice.locator("button:enabled").evaluateAll(
    (buttons) => buttons
      .filter((button) => {
        const rect = button.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((button) => button.textContent?.trim() ?? ""),
  );
  expect(undersized).toEqual([]);

  await practice.getByRole("button", {
    name: "Reset all three challenges",
  }).click();
  await expect(practice.getByText("0 / 3", { exact: true })).toBeVisible();
});

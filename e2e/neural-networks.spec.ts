import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/neural-networks";
const publicPath = "/curricula/transformer-from-zero/chapters/neural-networks";

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

async function completeXorLab(
  page: TestPage,
  { includeWrongPrediction = false }: { includeWrongPrediction?: boolean } = {},
) {
  const lab = page.locator(".neural-xor-lab");
  const prediction = lab.getByRole("combobox", {
    name: "XOR 네 점 중 한 affine+sigmoid가 맞힐 수 있는 최대 개수는?",
  });
  const runBoundary = lab.getByRole("button", { name: "직선 경계 실행" });
  await expect(prediction).toHaveValue("");

  if (includeWrongPrediction) {
    await prediction.selectOption("four");
    await expect(prediction).toHaveValue("four");
    await expect(runBoundary).toBeEnabled();
    await runBoundary.click();
    const wrongFeedback = lab.locator(".neural-prediction-step p.is-incorrect");
    await expect(wrongFeedback).toHaveAttribute("role", "status");
    await expect(wrongFeedback).toHaveAttribute("aria-live", "polite");
    await expect(wrongFeedback).toContainText(
      "대표 직선은 3/4",
    );
  }

  await prediction.selectOption("three");
  await expect(prediction).toHaveValue("three");
  await expect(runBoundary).toBeEnabled();
  await runBoundary.click();
  const correctFeedback = lab.locator(".neural-prediction-step p.is-correct");
  await expect(correctFeedback).toHaveAttribute("role", "status");
  await expect(correctFeedback).toHaveAttribute("aria-live", "polite");
  await expect(correctFeedback).toContainText(
    "맞았습니다. 대표 직선은 3/4",
  );

  await lab.getByRole("combobox", { name: "hidden activation" }).selectOption("sigmoid");
  await lab.getByRole("combobox", { name: "hidden unit h₂" }).selectOption("nand");
  await lab.getByRole("button", { name: "네 행 forward pass 실행·판정" }).click();

  const masteryFeedback = lab.locator(".neural-live-feedback");
  await expect(masteryFeedback).toContainText("XOR 4/4, 평균 BCE");
  await expect(masteryFeedback).toContainText("h₁ 또는 h₂를 지우면 각각 2/4, 2/4");
  await expect(masteryFeedback).toContainText("두 feature가 모두 원인으로 작동합니다");
  await expect(lab.locator(".neural-truth-card.is-correct")).toHaveCount(4);
  await expect(lab.locator(".neural-evidence .is-complete")).toHaveCount(4);
}

test("completes XOR, network surgery, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 03. 분류와 신경망 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "sigmoid와 BCE로 이진 분류를 읽고, hidden feature와 두 행렬 곱을 조립해 XOR을 해결하고 신경망 결함을 디버깅합니다.",
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
  await expect(page.getByText("별도 활동 · NETWORK SURGERY", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "시뮬레이터의 XOR을 실제 NumPy forward pass로 옮깁니다" })).toBeVisible();
  await expect(page.getByText("직선 하나로 XOR을 탐색", { exact: true })).toBeVisible();
  await expect(page.getByText("빠진 hidden activation 수리", { exact: true })).toBeVisible();

  await completeXorLab(page, { includeWrongPrediction: true });
  const xorLab = page.locator(".neural-xor-lab");
  await xorLab.getByRole("button", { name: "전체 초기화" }).click();
  await expect(xorLab.locator(".neural-evidence .is-complete")).toHaveCount(0);
  await expect(xorLab.getByRole("combobox", { name: "hidden activation" })).toHaveValue("identity");
  await completeXorLab(page);

  const incidents = page.locator(".neural-debug-card");
  const missingActivation = incidents.nth(1);
  await missingActivation.getByRole("combobox", { name: "적용할 patch" }).selectOption("identity");
  await missingActivation.getByRole("button", { name: "patch 적용·실행" }).click();
  await expect(missingActivation).toHaveClass(/is-incorrect/);
  await expect(missingActivation.locator(".neural-debug-feedback")).toContainText("결함이 남아 있습니다");

  const repairs = ["2x2", "sigmoid", "xor", "sigmoid"] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox", { name: "적용할 patch" }).selectOption(repairs[index]);
    await incident.getByRole("button", { name: "patch 적용·실행" }).click();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.locator(".neural-debug-feedback")).toContainText("계약 복구");
  }
  await expect(page.locator(".neural-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="logit-to-probability"][value="sigmoid-maps-logit-to-probability"]').check();
  await page.locator('input[name="bce-penalty"][value="confident-wrong-costs-most"]').check();
  await page.locator('input[name="activation-purpose"][value="nonlinearity-bends-boundaries"]').check();
  await page.locator('input[name="xor-hidden-features"][value="combine-hidden-features"]').check();
  await page.locator('input[name="layer-shapes"][value="two-hidden-activations-one-logit"]').check();
  await page.getByRole("button", { name: "신경망 흐름 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".neural-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
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
  await expect(page.getByRole("heading", { name: "Move the simulator's XOR into a real NumPy forward pass" })).toBeVisible();
  await expect(page.getByText("Search XOR with one line", { exact: true })).toBeVisible();
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
  await expect(xorLab.getByRole("combobox", { name: "Output affine head" })).toHaveValue("inverted");

  const collapsedPreset = xorLab.getByRole("button", { name: "Collapsed linear" });
  await collapsedPreset.focus();
  await collapsedPreset.press("Enter");
  await expect(xorLab.getByRole("combobox", { name: "Hidden activation" })).toHaveValue("identity");
  await expect(xorLab.getByRole("combobox", { name: "Hidden unit h₂" })).toHaveValue("nand");

  const resetLab = xorLab.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(xorLab.getByRole("combobox", {
    name: "At most how many XOR points can one affine+sigmoid classify?",
  })).toHaveValue("");
  await expect(xorLab.getByRole("combobox", { name: "Hidden unit h₂" })).toHaveValue("and");

  await xorLab.getByRole("combobox", {
    name: "At most how many XOR points can one affine+sigmoid classify?",
  }).selectOption("three");
  const runBoundary = xorLab.getByRole("button", { name: "Run linear boundary" });
  await runBoundary.focus();
  await runBoundary.press("Enter");
  await expect(xorLab.locator(".neural-prediction-step p.is-correct")).toContainText(
    "Correct. The representative line gets 3/4",
  );
  await xorLab.getByRole("combobox", { name: "Hidden activation" }).selectOption("sigmoid");
  await xorLab.getByRole("combobox", { name: "Hidden unit h₂" }).selectOption("nand");
  const runForward = xorLab.getByRole("button", { name: "Run and grade four-row forward pass" });
  await runForward.focus();
  await runForward.press("Enter");
  const masteryFeedback = xorLab.locator(".neural-live-feedback");
  await expect(masteryFeedback).toContainText("XOR is 4/4 with mean BCE");
  await expect(masteryFeedback).toContainText("Removing h₁ or h₂ drops the scores to 2/4 and 2/4");
  await expect(masteryFeedback).toContainText("both features are causally used");
  await expect(xorLab.locator(".neural-truth-card.is-correct")).toHaveCount(4);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const firstIncident = page.locator(".neural-debug-card").first();
  await firstIncident.getByRole("combobox", { name: "Patch to apply" }).selectOption("3x2");
  await firstIncident.getByRole("button", { name: "Apply patch and run" }).click();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Patch to apply" })).toHaveValue("");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

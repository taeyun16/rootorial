import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/transformer-from-zero/chapters/embeddings";
const publicPath = "/curricula/transformer-from-zero/chapters/embeddings";

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

test("completes lookup evidence, four repairs, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 05. 토큰과 임베딩 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "결정적 subword 토큰화에서 embedding lookup·반복 row gradient·cosine·masked mean까지 직접 계산하고 디버깅합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "토큰과 임베딩" })).toBeVisible();
  await expect(page.getByText("필수 LAB · TOKEN → ROW → GRADIENT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · EMBEDDING CONTRACT DEBUGGER", { exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "forward gather와 backward scatter-add를 실제 NumPy로 연결합니다" })).toBeVisible();
  await expect(page.getByText("lookup·one-hot·masked mean 동치 증명", { exact: true })).toBeVisible();
  await expect(page.getByText("반복 token의 scatter-add 수리", { exact: true })).toBeVisible();
  await expect(page.locator(".embeddings-python-bridge .notebook-cell")).toHaveCount(2);

  const lab = page.locator(".embeddings-lookup-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  await lab.getByLabel("tokenize할 텍스트").fill("123");
  await lab.getByLabel("T · token pieces").fill("1");
  await lab.getByLabel("D · row dimensions").fill("2");
  await lab.getByRole("button", { name: "tokenize + lookup 실행" }).click();
  await expect(lab.locator(".embeddings-runtime-fallback")).toContainText("글자가 포함된 단어를 하나 이상 입력하세요");
  await lab.getByRole("button", { name: "안전하게 초기화" }).click();
  await expect(lab.getByLabel("tokenize할 텍스트")).toBeFocused();

  await lab.getByLabel("T · token pieces").fill("2");
  await lab.getByLabel("D · row dimensions").fill("2");
  await lab.getByRole("button", { name: "tokenize + lookup 실행" }).click();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("예측 수정 필요");
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("T=3, D=2");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(0);

  const repeatedPreset = lab.getByRole("button", { name: "반복 token" });
  await repeatedPreset.click();
  await lab.getByLabel("T · token pieces").fill("3");
  await lab.getByLabel("D · row dimensions").fill("2");
  const runLookup = lab.getByRole("button", { name: "tokenize + lookup 실행" });
  await runLookup.click();
  await expect(runLookup).toBeFocused();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("예측 확인");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(1);

  const compareLookup = lab.getByRole("button", { name: "one-hot × E와 lookup 비교" });
  await compareLookup.click();
  await expect(compareLookup).toBeFocused();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("direct lookup과 같습니다");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(2);

  const affectedRows = lab.getByLabel("바뀔 unique row IDs 예측 (쉼표 구분)");
  await expect(affectedRows).toHaveAttribute("inputmode", "text");
  await affectedRows.fill("2");
  const runUpdate = lab.getByRole("button", { name: "embedding update 실행" });
  await runUpdate.click();
  await expect(runUpdate).toBeFocused();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("실제 unique rows는 2, 5");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(2);
  await affectedRows.fill("2,5");
  await runUpdate.click();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("공개된 결과를 재사용하지 말고");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(2);
  await runLookup.click();
  await runUpdate.click();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("공개된 결과를 재사용하지 말고");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(2);
  await lab.getByLabel("tokenize할 텍스트").fill("cat cat runs ");
  await runLookup.click();
  await runUpdate.click();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("공개된 결과를 재사용하지 말고");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(2);

  await repeatedPreset.click();
  await lab.getByLabel("T · token pieces").fill("3");
  await lab.getByLabel("D · row dimensions").fill("2");
  await runLookup.click();
  await compareLookup.click();
  await affectedRows.fill("2,5");
  await runUpdate.click();
  await expect(runUpdate).toBeFocused();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("정확히 2배");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(3);

  await choose(lab, "바뀌지 않은 row 직접 검사", "4");
  await lab.getByRole("button", { name: "update 전후 비교" }).click();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("data-gradient update 전후");
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(4);

  const incidents = page.locator(".embeddings-debug-card");
  await expect(incidents).toHaveCount(4);
  const lookupIncident = incidents.nth(0);
  await choose(lookupIncident, "1번 사건 repair", "softmax-row");
  await lookupIncident.getByRole("button", { name: "계약 실행" }).click();
  await expect(lookupIncident).toHaveClass(/is-incorrect/);
  await expect(lookupIncident.locator(".embeddings-debug-feedback")).toContainText("좌표는 음수여도 됩니다");

  const repairs = [
    "direct-lookup",
    "sum-occurrences",
    "cosine-normalized",
    "mask-pad",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await choose(incident, `${index + 1}번 사건 repair`, repairs[index]);
    const run = incident.getByRole("button", { name: "계약 실행" });
    await run.click();
    await expect(run).toBeFocused();
    await expect(incident).toHaveClass(/is-correct/);
    await expect(incident.getByText("복구 완료", { exact: true })).toBeVisible();
  }
  await expect(page.locator(".embeddings-debug-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="tokenizer-contract"][value="tokens-depend-on-tokenizer"]').check();
  await page.locator('input[name="lookup-shape"][value="ids-bt-to-vectors-btd"]').check();
  await page.locator('input[name="repeated-gradient"][value="referenced-rows-sum-contributions"]').check();
  await page.locator('input[name="cosine-contract"][value="angle-not-id-or-magnitude"]').check();
  await page.locator('input[name="pooling-order"][value="masked-mean-drops-pad-and-order"]').check();
  await page.getByRole("button", { name: "임베딩 계약 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".embeddings-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with fallback and no heavy runtime", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 05. Tokens and Embeddings · Rootorial");
  await expect(page.getByRole("heading", { name: "Tokens and Embeddings" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Connect forward gather to backward scatter-add in real NumPy" })).toBeVisible();
  await expect(page.getByText("Prove lookup, one-hot, and masked-mean equivalence", { exact: true })).toBeVisible();
  await expect(page.getByText("Repair scatter-add for repeated tokens", { exact: true })).toBeVisible();
  await expect(page.locator(".embeddings-python-bridge .notebook-cell")).toHaveCount(2);

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

  const lab = page.locator(".embeddings-lookup-lab");
  const repeatedPreset = lab.getByRole("button", { name: "Repeated token" });
  await repeatedPreset.focus();
  await repeatedPreset.press("Enter");
  await expect(repeatedPreset).toBeFocused();
  expect(await repeatedPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  const runLookup = lab.getByRole("button", { name: "Run tokenize + lookup" });
  await runLookup.focus();
  await runLookup.press("Enter");
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("Enter both T and D before running");
  await lab.getByLabel("T · token pieces").fill("3");
  await lab.getByLabel("D · row dimensions").fill("2");
  await runLookup.focus();
  await runLookup.press("Enter");
  await expect(runLookup).toBeFocused();
  await expect(lab.locator(".embeddings-live-feedback")).toContainText("Prediction confirmed");

  await lab.getByRole("button", { name: "Compare one-hot × E with lookup" }).click();
  const affectedRows = lab.getByLabel("Predict unique row IDs that change (comma-separated)");
  await expect(affectedRows).toHaveAttribute("inputmode", "text");
  await affectedRows.fill("2,5");
  await lab.getByRole("button", { name: "Run embedding update" }).click();
  await choose(lab, "Verify an unchanged row", "4");
  await lab.getByRole("button", { name: "Compare before and after" }).click();
  await expect(lab.locator(".embeddings-evidence .is-complete")).toHaveCount(4);

  const overflowingSurfaces = await page.locator(
    ".embeddings-lookup-lab, .embeddings-lookup-workspace, .embeddings-table, .embeddings-debugger-lab, .embeddings-debug-grid",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
  expect(overflowingSurfaces).toEqual([]);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const firstIncident = page.locator(".embeddings-debug-card").first();
  await choose(firstIncident, "Repair for incident 1", "softmax-row");
  const runRepair = firstIncident.getByRole("button", { name: "Run contract" });
  await runRepair.focus();
  await runRepair.press("Enter");
  await expect(runRepair).toBeFocused();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".embeddings-debug-feedback")).toContainText("Coordinates may be negative");
  const resetDebugger = page.getByRole("button", { name: "Reset debugger" });
  await resetDebugger.focus();
  await resetDebugger.press("Enter");
  await expect(choiceGroup(firstIncident, "Repair for incident 1").locator('[aria-pressed="true"]')).toHaveCount(0);

  await lab.getByRole("button", { name: "Reset lab" }).click();
  await lab.getByLabel("Text to tokenize").fill("123");
  await lab.getByLabel("T · token pieces").fill("1");
  await lab.getByLabel("D · row dimensions").fill("2");
  await lab.getByRole("button", { name: "Run tokenize + lookup" }).click();
  await expect(lab.locator(".embeddings-runtime-fallback")).toContainText("Enter at least one word containing letters");
  const safeReset = lab.getByRole("button", { name: "Reset safely" });
  await safeReset.focus();
  await safeReset.press("Enter");
  await expect(lab.getByLabel("Text to tokenize")).toHaveValue("kitten sleeps");
  await expect(lab.getByLabel("Text to tokenize")).toBeFocused();
  await expect(lab.locator(".embeddings-runtime-fallback")).toHaveCount(0);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("retries and completes the independent Embeddings practice on fresh tokens", async ({ page }) => {
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);

  const practice = page.getByRole("region", {
    name: "Can you rebuild lookup and gradient boundaries on fresh tokens?",
  });
  await expect(practice).toBeVisible();

  await choose(
    practice,
    "Predict the lookup output shape",
    "vocabulary-by-dimension",
  );
  await choose(practice, "learnerLookup", "first-row-for-all");
  await practice.getByRole("button", {
    name: "Run both lookup fixtures",
  }).click();
  await expect(practice.getByText(
    "Inspect the first failed contract, then run the same challenge again.",
  )).toBeVisible();

  await choose(
    practice,
    "Predict the lookup output shape",
    "positions-by-dimension",
  );
  await choose(practice, "learnerLookup", "direct-row");
  await practice.getByRole("button", {
    name: "Run both lookup fixtures",
  }).click();
  await expect(practice.getByText("✓ E[ids]", { exact: true })).toBeVisible();

  const scatterChallenge = practice.getByRole("button", {
    name: "02 · Multi-boundary scatter-add",
    exact: true,
  });
  await scatterChallenge.press("Enter");
  await expect(scatterChallenge).toHaveAttribute("aria-pressed", "true");
  await choose(
    practice,
    "Predict the net gradient of both repeated rows",
    "partial-then-zero",
  );
  await choose(practice, "learnerScatterAdd", "sum-occurrences");
  await practice.getByRole("button", {
    name: "Run both scatter-add contracts",
  }).click();
  await expect(practice.getByText("✓ scatter-add", { exact: true })).toBeVisible();

  const unknownChallenge = practice.getByRole("button", {
    name: "03 · Transfer [UNK] collision",
    exact: true,
  });
  await unknownChallenge.press(" ");
  await expect(unknownChallenge).toHaveAttribute("aria-pressed", "true");
  await choose(
    practice,
    "Predict rows for distinct unseen words",
    "shared-unknown-row",
  );
  await choose(practice, "learnerUnknownPath", "keep-unknown-id");
  await practice.getByRole("button", {
    name: "Run both unseen-word transfers",
  }).click();
  await expect(practice.getByText("✓ [UNK] collision", { exact: true })).toBeVisible();
  await expect(practice.getByText("3 / 3", { exact: true })).toBeVisible();

  await expect(page.getByRole("button", {
    name: "Completion is disabled in preview",
  })).toBeDisabled();
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

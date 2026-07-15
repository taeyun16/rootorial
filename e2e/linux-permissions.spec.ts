import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/users-and-permissions";
const publicPath = "/curricula/linux-systems/chapters/users-and-permissions";

type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchHeavyRuntimeRequests(page: TestPage) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url().toLowerCase();
    if (
      url.includes("/api/experiments/linux-assets/")
      || url.includes("/pyodide-worker.js")
      || url.includes("cdn.jsdelivr.net/pyodide")
      || url.includes("/v86/")
      || /\.(?:wasm|onnx)(?:\?|$)/.test(url)
    ) requests.push(request.url());
  });
  return requests;
}

async function completePermissionPolicy(page: TestPage) {
  const lab = page.locator(".permission-policy-lab");
  const prediction = lab.getByRole("combobox", { name: "결과 예측" });
  const runRequest = lab.getByRole("button", { name: "접근 요청 실행·판정" });
  const target = lab.getByRole("combobox", { name: "chmod 대상" });
  const expression = lab.getByRole("textbox", { name: "mode 표현" });
  const applyMode = lab.getByRole("button", { name: "chmod 적용" });

  await prediction.selectOption("deny");
  await runRequest.click();
  await expect(lab.locator(".permission-live-feedback")).toContainText(
    "/srv/release에서 group 클래스의 x 비트가 없어 먼저 거부됐습니다",
  );

  await target.selectOption("directory");
  await expression.fill("g+rx");
  await applyMode.click();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(2);

  await target.selectOption("file");
  await expression.fill("640");
  await applyMode.click();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(3);

  await lab.getByRole("button", { name: "최소 권한 정책 감사" }).click();
  await expect(lab.getByText("필수 실습 완료", { exact: true })).toBeVisible();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(4);
}

async function repairIncident(
  incident: ReturnType<TestPage["locator"]>,
  patch: string,
) {
  const auditButton = incident.locator(".permission-incident-actions .button-primary");
  await incident.getByRole("combobox", { name: "적용할 repair" }).selectOption(patch);
  await auditButton.click();
  await expect(incident).toHaveClass(/is-correct/);
  await expect(auditButton).toBeFocused();
  await expect(incident.getByText("최소 권한 계약 통과", { exact: true })).toBeVisible();
}

test("completes permission policy, four incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 04. 사용자와 권한 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "사용자와 권한" })).toBeVisible();
  await expect(page.getByText("필수 실습 · ACCESS DECISION", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · PERMISSION INCIDENTS", { exact: true })).toBeVisible();

  const policy = page.locator(".permission-policy-lab");
  await expect(policy.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  await policy.getByRole("combobox", { name: "결과 예측" }).selectOption("allow");
  await policy.getByRole("button", { name: "접근 요청 실행·판정" }).click();
  await expect(policy.locator(".permission-live-feedback")).toHaveClass(/is-incorrect/);
  await expect(policy.locator(".permission-live-feedback")).toContainText(
    "/srv/release에서 group 클래스의 x 비트가 없어 먼저 거부됐습니다",
  );
  await policy.getByRole("button", { name: "실습 초기화" }).click();
  await expect(policy.getByRole("combobox", { name: "결과 예측" })).toHaveValue("");
  await expect(policy.locator(".permission-evidence .is-complete")).toHaveCount(0);
  await policy.getByRole("textbox", { name: "mode 표현" }).fill("0700");
  await policy.getByRole("button", { name: "chmod 적용" }).click();
  await expect(policy.locator(".permission-live-feedback")).toContainText(
    "mode가 실제로 바뀌지 않아 학습 증거로 기록하지 않았습니다",
  );
  await expect(policy.locator(".permission-evidence .is-complete")).toHaveCount(0);
  await completePermissionPolicy(page);

  const incidents = page.locator(".permission-incident-card");
  await expect(incidents).toHaveCount(4);
  const traversal = incidents.nth(0);
  await traversal.getByRole("combobox", { name: "적용할 repair" }).selectOption("world-open");
  await traversal.getByRole("button", { name: "repair 적용·정책 판정" }).click();
  await expect(traversal).toHaveClass(/is-incorrect/);
  await expect(traversal.locator(".permission-incident-feedback")).toContainText("과잉 허용");
  await expect(traversal.locator(".permission-incident-feedback")).toContainText(
    /허용되어서는 안 되지만 열렸습니다|불필요한.*권한/,
  );
  await repairIncident(traversal, "directory-group-execute");
  await repairIncident(incidents.nth(1), "directory-group-no-write");
  await repairIncident(incidents.nth(2), "file-group-reviewers");
  await repairIncident(incidents.nth(3), "script-group-execute-private");
  await expect(page.locator(".permission-incident-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="process-credentials"][value="effective-uid-and-groups"]').check();
  await page.locator('input[name="permission-class"][value="owner-then-group-then-other"]').check();
  await page.locator('input[name="directory-search"][value="execute-allows-traversal"]').check();
  await page.locator('input[name="delete-boundary"][value="parent-write-and-search"]').check();
  await page.locator('input[name="least-privilege"][value="smallest-sufficient-grant"]').check();
  await page.getByRole("button", { name: "권한 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 필수 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".chapter-finish .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with no runtime or public access", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Users and Permissions" })).toBeVisible();

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

  const horizontalOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const policy = page.locator(".permission-policy-lab");
  await expect(policy.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const worldOpen = policy.getByRole("button", { name: "World open" });
  expect(await worldOpen.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await worldOpen.focus();
  await worldOpen.press("Enter");
  await expect(worldOpen).toHaveAttribute("aria-pressed", "true");
  const resetLab = policy.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(policy.getByRole("button", { name: "Missing path x" })).toHaveAttribute("aria-pressed", "true");
  await expect(policy.getByRole("combobox", { name: "Predict result" })).toHaveValue("");

  const firstIncident = page.locator(".permission-incident-card").first();
  await firstIncident.getByRole("combobox", { name: "Repair to apply" }).selectOption("world-open");
  await firstIncident.getByRole("button", { name: "Apply repair and audit" }).click();
  await expect(firstIncident.locator(".permission-incident-feedback")).toContainText("Access overgrant");
  const resetIncidents = page.getByRole("button", { name: "Reset all incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Repair to apply" })).toHaveValue("");
  await expect(firstIncident.locator(".permission-incident-feedback")).toHaveCount(0);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const overflowingPermissionSurfaces = await page.locator('[class*="permission-"]').evaluateAll(
    (elements) => elements
      .filter((element) => element.scrollWidth - element.clientWidth > 1)
      .map((element) => element.className),
  );
  expect(overflowingPermissionSurfaces).toEqual([]);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

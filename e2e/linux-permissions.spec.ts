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

function collectConsoleErrors(page: TestPage) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

async function completePermissionPolicy(page: TestPage) {
  const lab = page.locator(".permission-policy-lab");
  const prediction = lab.getByRole("group", { name: "결과 예측" });
  const runRequest = lab.getByRole("button", { name: "접근 요청 실행·판정" });
  const target = lab.getByRole("group", { name: "chmod 대상" });
  const expression = lab.getByRole("textbox", { name: "mode 표현" });
  const applyMode = lab.getByRole("button", { name: "chmod 적용" });

  await prediction.getByRole("button", { name: "DENY" }).click();
  await runRequest.click();
  await expect(lab.locator(".permission-live-feedback")).toContainText(
    "/srv/release에서 group 클래스의 x 비트가 없어 먼저 거부됐습니다",
  );

  await target.getByRole("button", { name: "/srv/release · directory" }).click();
  await expression.fill("g+rx");
  await applyMode.click();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(2);

  await target.getByRole("button", { name: "/srv/release/plan.txt · file" }).click();
  await expression.fill("640");
  await applyMode.click();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(3);

  await lab.getByRole("button", { name: "최소 권한 정책 감사" }).click();
  await expect(lab.getByText("필수 실습 완료", { exact: true })).toBeVisible();
  await expect(lab.locator(".permission-evidence .is-complete")).toHaveCount(4);
}

async function repairIncident(
  incident: ReturnType<TestPage["locator"]>,
  repairLabel: string,
) {
  const auditButton = incident.locator(".permission-incident-actions .button-primary");
  await incident.getByRole("group", { name: "적용할 repair" })
    .getByRole("button", { name: repairLabel }).click();
  await auditButton.click();
  await expect(incident).toHaveClass(/is-correct/);
  await expect(auditButton).toBeFocused();
  await expect(incident.getByText("최소 권한 계약 통과", { exact: true })).toBeVisible();
}

test("completes permission policy, four incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);

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
  await policy.getByRole("group", { name: "결과 예측" })
    .getByRole("button", { name: "ALLOW" }).click();
  await policy.getByRole("button", { name: "접근 요청 실행·판정" }).click();
  await expect(policy.locator(".permission-live-feedback")).toHaveClass(/is-incorrect/);
  await expect(policy.locator(".permission-live-feedback")).toContainText(
    "/srv/release에서 group 클래스의 x 비트가 없어 먼저 거부됐습니다",
  );
  await policy.getByRole("button", { name: "실습 초기화" }).click();
  await expect(policy.getByRole("group", { name: "결과 예측" })
    .getByRole("button", { name: "ALLOW" })).toHaveAttribute("aria-pressed", "false");
  await expect(policy.getByRole("group", { name: "결과 예측" })
    .getByRole("button", { name: "DENY" })).toHaveAttribute("aria-pressed", "false");
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
  await traversal.getByRole("group", { name: "적용할 repair" })
    .getByRole("button", { name: "directory와 file을 chmod 777" }).click();
  await traversal.getByRole("button", { name: "repair 적용·정책 판정" }).click();
  await expect(traversal).toHaveClass(/is-incorrect/);
  await expect(traversal.locator(".permission-incident-feedback")).toContainText("과잉 허용");
  await expect(traversal.locator(".permission-incident-feedback")).toContainText(
    /허용되어서는 안 되지만 열렸습니다|불필요한.*권한/,
  );
  await repairIncident(traversal, "chmod g+x /srv/release");
  await repairIncident(incidents.nth(1), "chmod g-w /srv/release");
  await repairIncident(incidents.nth(2), "chgrp reviewers plan.txt");
  await repairIncident(incidents.nth(3), "chmod 750 deploy.sh");
  await expect(page.locator(".permission-incident-progress strong")).toHaveText("4 / 4");

  for (const answer of [
    "프로세스의 PID 숫자",
    "owner 클래스만 선택되므로 읽기 거부",
    "디렉터리 x가 경로 탐색을 허용",
    "부모 디렉터리 /srv/release의 w+x",
    "필요한 주체·객체·동작에만 최소 비트를 부여하고 결과를 검증",
  ]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByRole("button", { name: "권한 판정 확인하기" }).click();
  await expect(page.locator(".concept-check-summary")).toContainText("아직 섞인 경계가 있습니다");
  await expect(page.locator(".concept-feedback-incorrect")).toContainText(
    "PID는 프로세스를 찾는 번호일 뿐 권한 클래스가 아닙니다",
  );
  await page.getByRole("button", {
    name: "프로세스의 effective UID·GID와 supplementary group",
    exact: true,
  }).click();
  await page.getByRole("button", { name: "권한 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 필수 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".chapter-finish .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with no runtime or public access", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);

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
  await expect(page.locator("select")).toHaveCount(0);

  const targetSizes = await page.locator(
    ".lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary, .lesson-article input:not([disabled])",
  ).evaluateAll((elements) => elements
    .map((element) => element.getBoundingClientRect())
    .filter(({ width, height }) => width > 0 && height > 0)
    .map(({ width, height }) => ({ width, height })));
  expect(targetSizes.length).toBeGreaterThan(0);
  expect(targetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);

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
  await expect(policy.getByRole("group", { name: "Predict result" })
    .getByRole("button", { name: "ALLOW" })).toHaveAttribute("aria-pressed", "false");
  await expect(policy.getByRole("group", { name: "Predict result" })
    .getByRole("button", { name: "DENY" })).toHaveAttribute("aria-pressed", "false");

  const firstIncident = page.locator(".permission-incident-card").first();
  await firstIncident.getByRole("group", { name: "Repair to apply" })
    .getByRole("button", { name: "chmod both directory and file to 777" }).click();
  await firstIncident.getByRole("button", { name: "Apply repair and audit" }).click();
  await expect(firstIncident.locator(".permission-incident-feedback")).toContainText("Access overgrant");
  const resetIncidents = page.getByRole("button", { name: "Reset all incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(firstIncident.getByRole("group", { name: "Repair to apply" })
    .getByRole("button", { name: "Choose a repair" })).toHaveAttribute("aria-pressed", "true");
  await expect(firstIncident.locator(".permission-incident-feedback")).toHaveCount(0);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const overflowingPermissionSurfaces = await page.locator('[class*="permission-"]').evaluateAll(
    (elements) => elements
      .filter((element) => element.scrollWidth - element.clientWidth > 1)
      .map((element) => element.className),
  );
  expect(overflowingPermissionSurfaces).toEqual([]);

  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

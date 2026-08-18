import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/service-discovery-and-load-balancing";
const publicPath = "/curricula/infrastructure-design/chapters/service-discovery-and-load-balancing";
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
      || path.includes("/v86/")
      || /\.(?:wasm|onnx|safetensors|gguf)$/.test(path)
      || /\/(?:models?|webgpu)\//.test(path)
    ) requests.push(request.url());
  });
  return requests;
}

function watchConsoleErrors(page: TestPage) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function activate(control: Locator) {
  await control.focus();
  await control.press("Enter");
}

async function choose(lab: Locator, controlId: string, value: string) {
  await lab.locator(`[data-control-id="${controlId}"] [data-choice-value="${value}"]`).click();
}

async function completeDns(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  await choose(lab, "resolver-policy", "honor-ttl");
  await choose(lab, "old-vip-retirement", "160");
  await choose(lab, "service-path-prediction", "cache-then-authority");
  const visual = lab.getByTestId("service-path-visualization");
  await expect(visual).toHaveAttribute("data-service-mode", "dns-lifecycle");
  await expect(visual).toHaveAttribute("data-cache-state", "fresh-then-expired");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: isKo ? "DNS·connection path 실행" : "Run DNS and connection path" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual).toHaveAttribute("data-path-state", "reachable");
}

async function completeAffinity(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  await lab.getByRole("button", { name: /HEALTH \+ AFFINITY/ }).click();
  await choose(lab, "backend-membership", "healthy-only");
  await choose(lab, "balancing-algorithm", "source-affinity");
  await choose(lab, "affinity-failure-policy", "remap-ineligible");
  await choose(lab, "service-path-prediction", "stable-then-remap");
  const visual = lab.getByTestId("service-path-visualization");
  await expect(visual).toHaveAttribute("data-service-mode", "health-affinity");
  await expect(visual).toHaveAttribute("data-selection-state", "healthy-remap");
  await lab.getByRole("button", { name: isKo ? "DNS·connection path 실행" : "Run DNS and connection path" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-endpoint-id="app-b"]')).toHaveAttribute("data-health-state", "unhealthy");
  await expect(visual.locator('[data-endpoint-id="app-b"]')).toHaveAttribute("data-eligibility-state", "ineligible");
}

async function repairIncidents(page: TestPage, locale: "ko" | "en") {
  const cards = page.locator(".service-incident-card");
  await expect(cards).toHaveCount(4);
  const repairs = [
    "refresh-after-ttl",
    "probe-backend-service-port",
    "exclude-from-new-connections",
    "remap-against-healthy-set",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await card.locator(`[data-control-id^="service-incident-"] [data-choice-value="${repairs[index]}"]`).click();
    await card.getByRole("button", { name: locale === "ko" ? "상태 재실행·판정" : "Re-run state and grade" }).click();
    await expect(card.locator(".service-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en", retryFirst = false) {
  const isKo = locale === "ko";
  const questions = page.locator(".concept-question");
  const answers = isKo
    ? [
        "만료 전에는 cache, 만료 경계부터 authority",
        "backend가 request를 받을 준비가 됐는지",
        "healthy하고 draining이 아닌 후보만 사용",
        "transport connection flow",
        "현재 healthy set에서 다시 매핑",
      ]
    : [
        "use cache before expiry and authority at the expiry boundary",
        "whether a backend is ready to receive requests",
        "use only healthy, non-draining candidates",
        "a transport connection flow",
        "remap against the current healthy set",
      ];
  if (retryFirst) {
    await questions.nth(0).getByRole("button", { name: "authority 변경을 감지해 즉시 refresh", exact: true }).click();
  } else {
    await questions.nth(0).getByRole("button", { name: answers[0], exact: true }).click();
  }
  for (let index = 1; index < answers.length; index += 1) {
    await questions.nth(index).getByRole("button", { name: answers[index], exact: true }).click();
  }
  const submit = page.getByRole("button", { name: isKo ? "service path 판정 확인" : "Check service path decisions" });
  await submit.click();
  if (retryFirst) {
    await expect(questions.nth(0)).toContainText("authority state와 resolver가 현재 사용할 수 있는 cached answer를 분리하세요");
    await questions.nth(0).getByRole("button", { name: answers[0], exact: true }).click();
    await submit.click();
  }
}

function serviceOverflow(page: TestPage) {
  return page.locator(
    ".service-discovery-chapter-shell, .service-contract-grid, .service-health-grid, .service-path-lab, .infrastructure-workspace, .service-path-visualization, .service-map, .service-boundary-card, .service-backend-pool, .service-backend-node, .service-ttl-timeline, .service-affinity-trace, .service-direct-controls, .service-path-stages, .service-command-evidence, .service-incident-lab, .service-incident-grid, .service-incident-card, .network-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes DNS, affinity, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 05. 서비스 탐색과 load balancing · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "DNS record 수명, health 상태와 L4 load-balancer 선택을 namespace 서비스 토폴로지에 연결하고 stale endpoint를 진단합니다.");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "서비스 탐색과 load balancing", exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED LAB · RESOLVE AND SELECT", { exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED ACTIVITY · SERVICE-PATH INCIDENTS", { exact: true })).toBeVisible();

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toBeDisabled();
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  const lab = page.locator(".service-path-lab");
  await expect(lab).toHaveAttribute("data-interactive-ready", "true");
  const visual = lab.getByTestId("service-path-visualization");
  await expect(visual.getByRole("group", { name: /client가 api.internal을 조회합니다/ })).toBeVisible();
  await expect(visual.locator("select, input[type=checkbox]")).toHaveCount(0);
  await expect(visual).toHaveAttribute("data-service-mode", "dns-lifecycle");
  await expect(visual).toHaveAttribute("data-cache-state", "stale-after-expiry");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");

  await completeDns(lab, "ko");
  await completeAffinity(lab, "ko");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("2 / 2");
  await choose(lab, "backend-membership", "all-registered");
  await expect(visual).toHaveAttribute("data-selection-state", "unhealthy-member");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("1 / 2");
  await choose(lab, "backend-membership", "healthy-only");
  await choose(lab, "service-path-prediction", "stable-then-remap");
  await lab.getByRole("button", { name: "DNS·connection path 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko", true);
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", { exact: true })).toBeVisible();
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();

  await choose(lab, "service-path-prediction", "round-robin");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator(".service-feedback")).not.toHaveClass(/is-success/);
  await expect(lab.locator(".service-feedback")).toContainText("예측이 바뀌었습니다.");
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  await choose(lab, "service-path-prediction", "stable-then-remap");
  await lab.getByRole("button", { name: "DNS·connection path 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("2 / 2");
  await expect(completion).toHaveAttribute("data-completion-ready", "true");

  await lab.getByRole("button", { name: "현재 mode 초기화" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator('[data-control-id="service-path-prediction"] [aria-pressed="true"]')).toHaveCount(0);
  await expect(lab.locator(".service-feedback")).not.toHaveClass(/is-success/);
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
});

test("keeps the English draft keyboard-usable at 390px without overflow or untranslated text", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".service-path-lab")).toHaveAttribute("data-interactive-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 05. Service Discovery and Load Balancing · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", "Connect DNS record lifetime, health state, and L4 load-balancer choices to a namespace service topology, then diagnose stale endpoints.");
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Service Discovery and Load Balancing", exact: true })).toBeVisible();

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const ownText = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
      const attributes = ["aria-label", "title", "placeholder"].map((name) => element.getAttribute(name)).filter(Boolean).join(" | ");
      const value = [ownText, attributes].filter(Boolean).join(" | ");
      if (/[\uAC00-\uD7A3]/.test(value)) rows.push(value);
    }
    return rows;
  });
  expect(untranslated).toEqual([]);
  const undersizedTargets = await page
    .locator('.lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary, .lesson-article input:not([disabled]), .lesson-article textarea:not([disabled])')
    .evaluateAll((elements) => elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0
          && (rect.width < 44 || rect.height < 44);
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: element.textContent?.replace(/\s+/g, " ").trim().slice(0, 80),
          width: Math.round(rect.width),
          height: Math.round(rect.height),
        };
      }));
  expect(undersizedTargets).toEqual([]);
  const documentOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await serviceOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".service-path-lab");
  const visual = lab.getByTestId("service-path-visualization");
  await expect(visual.getByRole("group", { name: /The client resolves api.internal/ })).toBeVisible();
  await completeDns(lab, "en");
  expect(await serviceOverflow(page)).toEqual([]);
  await completeAffinity(lab, "en");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("2 / 2");
  expect(await serviceOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const reset = lab.getByRole("button", { name: "Reset current mode" });
  await activate(reset);
  await expect(reset).toBeFocused();
  await expect(visual).toHaveAttribute("data-service-mode", "health-affinity");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".service-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator('[data-control-id="service-path-prediction"] [aria-pressed="true"]')).toHaveCount(0);

  const firstIncident = page.locator(".service-incident-card").first();
  await firstIncident.locator('[data-control-id^="service-incident-"] [data-choice-value="refresh-after-ttl"]').click();
  const runIncident = firstIncident.getByRole("button", { name: "Re-run state and grade" });
  await activate(runIncident);
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".service-feedback")).toHaveClass(/is-success/);
  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" })).toHaveAttribute("data-completion-ready", "false");
  expect(await serviceOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

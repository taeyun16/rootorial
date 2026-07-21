import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/network-policy-and-firewalls";
const publicPath = "/curricula/infrastructure-design/chapters/network-policy-and-firewalls";

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

function choiceControl(scope: Locator, controlId: string, value: string) {
  return scope.locator(`[data-control-id="${controlId}"] [data-choice-value="${value}"]`);
}

async function choose(scope: Locator, controlId: string, value: string) {
  const control = choiceControl(scope, controlId, value);
  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
}

async function chooseWithKeyboard(scope: Locator, controlId: string, value: string) {
  const control = choiceControl(scope, controlId, value);
  await expect(control).toHaveAttribute("aria-pressed", "false");
  await control.focus();
  await control.press("Enter");
  await expect(control).toHaveAttribute("aria-pressed", "true");
  await expect(control).toBeFocused();
}

async function setSwitch(scope: Locator, controlId: string, checked = true) {
  const control = scope.locator(`[data-control-id="${controlId}"][role="switch"]`);
  if (await control.getAttribute("aria-checked") !== String(checked)) await control.click();
  await expect(control).toHaveAttribute("aria-checked", String(checked));
}

async function enableSwitchWithKeyboard(scope: Locator, controlId: string) {
  const control = scope.locator(`[data-control-id="${controlId}"][role="switch"]`);
  await expect(control).toHaveAttribute("aria-checked", "false");
  await control.focus();
  await control.press("Space");
  await expect(control).toHaveAttribute("aria-checked", "true");
  await expect(control).toBeFocused();
}

async function configureWorkingPolicy(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  const activeMode = await lab.getAttribute("data-active-mode");
  if (isKo) await choose(lab, "policy-hook", activeMode ?? "forward");
  else await chooseWithKeyboard(lab, "policy-hook", activeMode ?? "forward");
  await choose(lab, "policy-default", "drop");
  if (isKo) await setSwitch(lab, "policy-stateful-rule");
  else await enableSwitchWithKeyboard(lab, "policy-stateful-rule");
  await choose(lab, "policy-allow-scope", "exact");
  await choose(lab, "policy-rule-order", "stateful-specific-deny");
  await choose(lab, "policy-prediction", "intended-only");
}

async function completeMode(lab: Locator, locale: "ko" | "en", mode: "forward" | "input") {
  const isKo = locale === "ko";
  if (mode === "input") await lab.getByRole("button", { name: /ROUTER-LOCAL \/ INPUT MODE/ }).click();
  else if (await lab.getAttribute("data-active-mode") !== "forward") await lab.getByRole("button", { name: /TRANSIT \/ FORWARD MODE/ }).click();
  await configureWorkingPolicy(lab, locale);
  const visual = lab.getByTestId("network-policy-visualization");
  await expect(visual).toHaveAttribute("data-policy-mode", mode);
  await expect(visual).toHaveAttribute("data-policy-state", "least-allow");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-probe-verdict="not-run"]')).toHaveCount(5);
  await lab.getByRole("button", { name: isKo ? "packet probe suite 실행" : "Run packet probe suite" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-probe-verdict="accept"]')).toHaveCount(2);
  await expect(visual.locator('[data-probe-verdict="drop"]')).toHaveCount(3);
}

async function repairIncidents(page: TestPage, locale: "ko" | "en") {
  const cards = page.locator(".network-policy-incident-card");
  await expect(cards).toHaveCount(4);
  const incidents = [
    "service-rule-on-input",
    "deny-before-allow",
    "missing-established-reply",
    "default-accept-leak",
  ] as const;
  const repairs = [
    "move-service-rule-to-forward",
    "move-specific-allow-before-deny",
    "add-established-related-rule",
    "set-base-policy-drop",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await choose(card, `policy-incident-${incidents[index]}-repair`, repairs[index]);
    await card.getByRole("button", { name: locale === "ko" ? "packet suite 재실행·판정" : "Re-run packet suite and grade" }).click();
    await expect(card.locator(".network-policy-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [
    'input[name="filter-hook-scope"][value="transit-packet-uses-forward-hook"]',
    'input[name="default-deny-contract"][value="explicit-allow-else-drop"]',
    'input[name="terminal-verdict-order"][value="first-matching-terminal-verdict-controls-chain"]',
    'input[name="stateful-reply-rule"][value="ct-established-allows-mapped-reply"]',
    'input[name="firewall-vs-reachability"][value="firewall-does-not-repair-route-or-nat"]',
  ];
  for (const selector of answers) await page.locator(selector).check();
  await page.getByRole("button", { name: locale === "ko" ? "정책 판정 확인" : "Check policy decisions" }).click();
}

function policyOverflow(page: TestPage) {
  return page.locator(
    ".network-policy-chapter-shell, .network-policy-preflight, .network-policy-hook-grid, .network-policy-lab, .network-policy-boundary-controls, .network-policy-chain-controls, .network-policy-visualization, .network-policy-map, .network-policy-boundary, .network-policy-trace-grid, .network-policy-chain, .network-policy-probes, .network-policy-command-evidence, .network-policy-incident-lab, .network-policy-incident-grid, .network-policy-incident-card, .network-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes FORWARD, INPUT, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 04. 네트워크 정책과 firewall · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "namespace 경계마다 default-deny 정책을 세우고 stateful nftables chain의 hook·direction·rule order를 검증합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "네트워크 정책과 firewall", exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED LAB · LEAST-ALLOW BOTH HOOKS", { exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED ACTIVITY · FIREWALL INCIDENTS", { exact: true })).toBeVisible();

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toBeDisabled();
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".network-policy-lab");
  await expect(lab).toHaveAttribute("data-interactive-ready", "true");
  await expect(lab.locator('select, input[type="checkbox"]')).toHaveCount(0);
  const visual = lab.getByTestId("network-policy-visualization");
  await expect(visual.getByRole("group", { name: /FORWARD와 INPUT firewall policy 지도/ })).toBeVisible();
  await expect(visual).toHaveAttribute("data-policy-mode", "forward");
  await expect(visual).toHaveAttribute("data-policy-state", "wrong-hook");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-probe-verdict="not-run"]')).toHaveCount(5);

  await completeMode(lab, "ko", "forward");
  await completeMode(lab, "ko", "input");
  await expect(lab.locator(".network-policy-lab-header > strong")).toHaveText("2 / 2");

  await choose(lab, "policy-allow-scope", "any-source");
  await expect(visual).toHaveAttribute("data-policy-state", "overbroad");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await choose(lab, "policy-prediction", "intended-only");
  await lab.getByRole("button", { name: "packet probe suite 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "failed");
  await choose(lab, "policy-allow-scope", "exact");
  await choose(lab, "policy-prediction", "intended-only");
  await lab.getByRole("button", { name: "packet probe suite 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko");
  await expect(page.getByText("이해 확인 완료 — 두 policy mode와 사건 완료 상태를 확인하세요.", { exact: true })).toBeVisible();
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();
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
  await expect(page.locator(".network-policy-lab")).toHaveAttribute("data-interactive-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 04. Network Policy and Firewalls · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Establish default-deny policy at namespace boundaries and verify hook, direction, and rule order in stateful nftables chains.",
  );
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Network Policy and Firewalls", exact: true })).toBeVisible();

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const ownText = Array.from(element.childNodes)
        .filter((node) => node.nodeType === Node.TEXT_NODE)
        .map((node) => node.textContent ?? "")
        .join(" ")
        .replace(/\s+/g, " ")
        .trim();
      const attributes = ["aria-label", "title", "placeholder"].map((name) => element.getAttribute(name)).filter(Boolean).join(" | ");
      const value = [ownText, attributes].filter(Boolean).join(" | ");
      if (/[\uAC00-\uD7A3]/.test(value)) rows.push(value);
    }
    return rows;
  });
  expect(untranslated).toEqual([]);

  const documentOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await policyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".network-policy-lab");
  const visual = lab.getByTestId("network-policy-visualization");
  await expect(visual.getByRole("group", { name: /FORWARD and INPUT firewall policy map/ })).toBeVisible();
  await completeMode(lab, "en", "forward");
  expect(await policyOverflow(page)).toEqual([]);
  await completeMode(lab, "en", "input");
  expect(await policyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const reset = lab.getByRole("button", { name: "Reset current mode" });
  await activate(reset);
  await expect(reset).toBeFocused();
  await expect(visual).toHaveAttribute("data-policy-mode", "input");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator('[data-control-id="policy-prediction"] [aria-pressed="true"]')).toHaveCount(0);

  const firstIncident = page.locator(".network-policy-incident-card").first();
  await activate(choiceControl(firstIncident, "policy-incident-service-rule-on-input-repair", "move-service-rule-to-forward"));
  await expect(choiceControl(firstIncident, "policy-incident-service-rule-on-input-repair", "move-service-rule-to-forward")).toHaveAttribute("aria-pressed", "true");
  const runIncident = firstIncident.getByRole("button", { name: "Re-run packet suite and grade" });
  await activate(runIncident);
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".network-policy-feedback")).toHaveClass(/is-success/);

  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — now confirm both policy modes and the incidents.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" })).toHaveAttribute("data-completion-ready", "false");
  expect(await policyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

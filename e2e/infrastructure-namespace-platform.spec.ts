import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/assemble-a-namespace-platform";
const publicPath = "/curricula/infrastructure-design/chapters/assemble-a-namespace-platform";

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
      || path.includes("d3")
      || path.includes("sigma")
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

async function assembleEvidence(lab: Locator, locale: "ko" | "en") {
  await lab.getByRole("button", {
    name: locale === "ko" ? "7개 evaluator 실행" : "Run seven evaluators",
  }).click();
  const visual = lab.getByTestId("namespace-platform-visualization");
  await expect(visual).toHaveAttribute("data-evidence-state", "verified");
  await expect(visual.locator('[data-receipt-status="verified"]')).toHaveCount(7);
}

async function loadWorkingBlueprint(lab: Locator, locale: "ko" | "en") {
  await lab.getByRole("button", {
    name: locale === "ko" ? "검증 가능한 blueprint" : "Verifiable blueprint",
  }).click();
}

async function repairScaffoldThroughControls(lab: Locator) {
  await lab.getByLabel("public ingress 경계").selectOption("edge-443-only");
  await lab.getByLabel("app address 노출").selectOption("private");
  await lab.getByLabel("data address 노출").selectOption("private");
  await lab.getByLabel("edge에서 app 경로").selectOption("correct");
  await lab.getByLabel("app에서 data 경로").selectOption("correct");
  await lab.getByLabel("app 외부 update 경로").selectOption("edge-nat-conntrack");
  await lab.getByLabel("edge app data zone 배치").selectOption("split-zones");
  await lab.getByLabel("900 rps capacity plan").selectOption("headroom");

  await expect(lab.getByLabel("public ingress 경계")).toHaveValue("edge-443-only");
  await expect(lab.getByLabel("app address 노출")).toHaveValue("private");
  await expect(lab.getByLabel("data address 노출")).toHaveValue("private");
  await expect(lab.getByLabel("edge에서 app 경로")).toHaveValue("correct");
  await expect(lab.getByLabel("app에서 data 경로")).toHaveValue("correct");
  await expect(lab.getByLabel("app 외부 update 경로")).toHaveValue("edge-nat-conntrack");
  await expect(lab.getByLabel("edge app data zone 배치")).toHaveValue("split-zones");
  await expect(lab.getByLabel("900 rps capacity plan")).toHaveValue("headroom");
}

async function runScenario(
  lab: Locator,
  locale: "ko" | "en",
  name: RegExp,
  scenarioId: string,
) {
  const scenarioButton = lab.getByRole("button", { name });
  await scenarioButton.click();
  await expect(scenarioButton).toHaveAttribute("aria-pressed", "true");
  expect(await scenarioButton.evaluate((element) => getComputedStyle(element).boxShadow)).not.toBe("none");
  const visual = lab.getByTestId("namespace-platform-visualization");
  await expect(visual).toHaveAttribute("data-scenario", scenarioId);
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", {
    name: locale === "ko" ? "현재 scenario 실행" : "Run current scenario",
  }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-edge-state="configured"]')).toHaveCount(4);
  await expect(visual.locator(".namespace-platform-screen-reader-summary"))
    .toContainText(locale === "ko" ? "app-egress 구성됨" : "app-egress configured");
  if (locale === "ko" && scenarioId === "normal-request") {
    await expect(visual.locator('[data-path-stage="public-client"]')).toContainText("공개 client → edge tcp/443");
    await expect(visual.locator('[data-path-stage="public-client"]')).not.toContainText("public client");
  }
}

async function runAllScenarios(lab: Locator, locale: "ko" | "en") {
  await runScenario(lab, locale, locale === "ko" ? /^정상 요청/ : /^Normal request/, "normal-request");
  await runScenario(lab, locale, locale === "ko" ? /^사설 egress/ : /^Private egress/, "private-egress");
  await runScenario(lab, locale, locale === "ko" ? /^zone A 장애/ : /^Zone A failure/, "zone-a-failure");
  await runScenario(lab, locale, /^900 rps peak/, "peak-load");
}

async function repairIncidents(page: TestPage, locale: "ko" | "en") {
  const cards = page.locator(".namespace-platform-incident-grid article[data-incident-id]");
  await expect(cards).toHaveCount(4);
  const repairs = [
    "make-app-private",
    "restore-app-data-5432",
    "restore-edge-nat-conntrack",
    "spread-platform-across-zones",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await card.getByRole("combobox").selectOption(repairs[index]);
    await card.getByRole("button", {
      name: locale === "ko" ? "repair 후 전체 contract 재실행" : "Re-run the full contract after repair",
    }).click();
    await expect(card.locator(".namespace-platform-incident-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [
    'input[name="evidence-reexecution"][value="rerun-current-evaluators"]',
    'input[name="public-ingress-boundary"][value="edge-443-only"]',
    'input[name="private-egress-state"][value="edge-nat-conntrack-return"]',
    'input[name="zone-failure-survival"][value="independent-zone-b-path"]',
    'input[name="capacity-headroom-contract"][value="all-resource-ratios-at-most-0-7"]',
  ];
  for (const selector of answers) await page.locator(selector).check();
  await page.getByRole("button", {
    name: locale === "ko" ? "platform 설계 판정 확인" : "Check platform design decisions",
  }).click();
}

function namespacePlatformOverflow(page: TestPage) {
  return page.locator(
    ".namespace-platform-chapter-shell, .namespace-platform-requirement-grid, .namespace-platform-path-table, .namespace-platform-lab, .namespace-platform-evidence-workspace, .namespace-platform-design-workspace, .namespace-platform-control-grid, .namespace-platform-scenario-workspace, .namespace-platform-visualization, .namespace-platform-map, .namespace-platform-node-grid, .namespace-platform-edge-grid, .namespace-platform-capacity-grid, .namespace-platform-incident-lab, .namespace-platform-incident-grid, .namespace-platform-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes the Korean namespace-platform capstone while the public chapter stays hidden", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));

  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 08. namespace 플랫폼 조립하기 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "client·edge·app·data namespace를 요구사항에서 조립하고 route, NAT, policy, discovery와 failure evidence로 설계 결정을 검증합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "namespace 플랫폼 조립하기", exact: true })).toBeVisible();

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toBeDisabled();
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".namespace-platform-lab");
  await expect(lab).toHaveAttribute("data-interactive-ready", "true");
  const visual = lab.getByTestId("namespace-platform-visualization");
  await expect(visual.getByRole("img", { name: /client, edge, app, data namespace.*443.*8080.*5432/ })).toBeVisible();
  await expect(visual).toHaveAttribute("data-evidence-state", "not-run");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-edge-state="not-run"]')).toHaveCount(4);

  await assembleEvidence(lab, "ko");
  await repairScaffoldThroughControls(lab);
  await runAllScenarios(lab, "ko");
  await expect(visual.locator('[data-utilization-state="headroom"]')).toHaveCount(3);
  await expect(visual.locator('[data-capacity-resource="edge-bandwidth"]')).toContainText("54%");
  await expect(visual.locator('[data-capacity-resource="edge-queue"]')).toContainText("63%");
  await expect(visual.locator('[data-capacity-resource="app-connections"]')).toContainText("60%");
  await expect(lab.locator(".namespace-platform-lab-header > strong")).toHaveText("5 / 5");

  await lab.getByLabel("app address 노출").selectOption("public");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  await lab.getByLabel("app address 노출").selectOption("private");
  await expect(lab.getByLabel("edge에서 app 경로")).toHaveValue("correct");
  await runAllScenarios(lab, "ko");

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko");
  await expect(page.getByText("개념 확인 완료 — studio와 incident 완료 상태를 확인하세요.", { exact: true })).toBeVisible();
  await expect(page.locator(".namespace-platform-completion-checklist .is-complete")).toHaveCount(7);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
});

test("keeps the English capstone keyboard-usable at 390px with reduced motion", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".namespace-platform-lab")).toHaveAttribute("data-interactive-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 08. Assemble a Namespace Platform · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Assemble client, edge, app, and data namespaces from requirements, then verify design decisions with route, NAT, policy, discovery, and failure evidence.",
  );
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Assemble a Namespace Platform", exact: true })).toBeVisible();

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

  const documentOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await namespacePlatformOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".namespace-platform-lab");
  const visual = lab.getByTestId("namespace-platform-visualization");
  await expect(visual.getByRole("img", { name: /Platform map showing client, edge, app, and data namespaces/ })).toBeVisible();
  await expect(visual.locator(".namespace-platform-map > svg")).toBeHidden();
  const disabledIncidentButton = page.locator(".namespace-platform-incident-grid article").first()
    .getByRole("button", { name: "Re-run the full contract after repair" });
  await expect(disabledIncidentButton).toBeDisabled();
  await expect(disabledIncidentButton).toHaveCSS("opacity", "0.48");
  await assembleEvidence(lab, "en");
  await loadWorkingBlueprint(lab, "en");
  await runScenario(lab, "en", /^Normal request/, "normal-request");
  await runScenario(lab, "en", /^900 rps peak/, "peak-load");
  await expect(visual.locator('[data-utilization-state="headroom"]')).toHaveCount(3);
  expect(await namespacePlatformOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const resetEvidence = lab.getByRole("button", { name: "Reset evidence" });
  await resetEvidence.focus();
  await resetEvidence.press("Enter");
  await expect(resetEvidence).toBeFocused();
  await expect(visual).toHaveAttribute("data-evidence-state", "not-run");
  await expect(visual.locator('[data-receipt-status="not-run"]')).toHaveCount(7);
  const transitionSeconds = await visual
    .locator(".namespace-platform-capacity-grid article > div span")
    .first()
    .evaluate((element) => Number.parseFloat(getComputedStyle(element).transitionDuration));
  expect(transitionSeconds).toBeLessThan(0.001);

  const firstIncident = page.locator('.namespace-platform-incident-grid article[data-incident-id="app-publicly-exposed"]');
  await firstIncident.getByRole("combobox").selectOption("make-app-private");
  const runIncident = firstIncident.getByRole("button", { name: "Re-run the full contract after repair" });
  await runIncident.focus();
  await runIncident.press("Enter");
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".namespace-platform-incident-feedback")).toHaveClass(/is-success/);

  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — confirm the studio and incident states.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" }))
    .toHaveAttribute("data-completion-ready", "false");
  expect(await namespacePlatformOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/veth-bridges-and-routing";
const publicPath = "/curricula/infrastructure-design/chapters/veth-bridges-and-routing";

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

async function completeBridge(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  await lab.getByLabel(isKo ? "client veth peer 연결 대상" : "Client veth peer target").selectOption("bridge");
  await lab.getByLabel(isKo ? "app veth peer 연결 대상" : "App veth peer target").selectOption("bridge");
  await lab.getByLabel(isKo ? "client veth 양 endpoint UP" : "Both client-veth endpoints UP").check();
  await lab.getByLabel(isKo ? "app veth 양 endpoint UP" : "Both app-veth endpoints UP").check();
  await lab.getByLabel(isKo ? "app eth0 address" : "App eth0 address").selectOption("10.20.0.3/24");
  await lab.getByLabel(isKo ? "topology 실행 결과 예측" : "Predict topology execution result").selectOption("round-trip-connected");
  const visual = lab.getByTestId("veth-routing-visualization");
  await expect(visual).toHaveAttribute("data-topology-mode", "bridge");
  await expect(visual).toHaveAttribute("data-topology-state", "reachable");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: isKo ? "forward·return path 실행" : "Run forward and return paths" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual).toHaveAttribute("data-path-state", "reachable");
}

async function completeRouter(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  await lab.getByRole("button", { name: /ROUTER MODE/ }).click();
  await lab.getByLabel(isKo ? "client veth peer 연결 대상" : "Client veth peer target").selectOption("router");
  await lab.getByLabel(isKo ? "app veth peer 연결 대상" : "App veth peer target").selectOption("router");
  await lab.getByLabel(isKo ? "client veth 양 endpoint UP" : "Both client-veth endpoints UP").check();
  await lab.getByLabel(isKo ? "app veth 양 endpoint UP" : "Both app-veth endpoints UP").check();
  await lab.getByLabel(isKo ? "client forward route" : "Client forward route").selectOption("correct");
  await lab.getByLabel(isKo ? "app return route" : "App return route").selectOption("correct");
  await lab.getByLabel("router net.ipv4.ip_forward=1").check();
  await lab.getByLabel(isKo ? "topology 실행 결과 예측" : "Predict topology execution result").selectOption("round-trip-connected");
  const visual = lab.getByTestId("veth-routing-visualization");
  await expect(visual).toHaveAttribute("data-topology-mode", "router");
  await expect(visual).toHaveAttribute("data-topology-state", "reachable");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: isKo ? "forward·return path 실행" : "Run forward and return paths" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-route-role="forward"]')).toHaveCount(1);
  await expect(visual.locator('[data-route-role="return"]')).toHaveCount(1);
}

async function repairIncidents(page: TestPage, locale: "ko" | "en") {
  const cards = page.locator(".veth-incident-card");
  await expect(cards).toHaveCount(4);
  const repairs = [
    "attach-peer-to-bridge",
    "assign-distinct-app-address",
    "enable-router-forwarding",
    "add-app-return-route",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await card.getByRole("combobox").selectOption(repairs[index]);
    const run = card.getByRole("button", { name: locale === "ko" ? "상태 재실행·판정" : "Re-run state and grade" });
    await run.click();
    await expect(card.locator(".veth-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [
    'input[name="veth-pair-contract"][value="two-linked-interface-objects"]',
    'input[name="bridge-forwarding-scope"][value="same-l2-domain-only"]',
    'input[name="gateway-reachability"][value="gateway-must-be-on-link"]',
    'input[name="router-forwarding"][value="enable-ip-forwarding"]',
    'input[name="return-path"][value="reply-needs-route-back"]',
  ];
  for (const selector of answers) await page.locator(selector).check();
  await page.getByRole("button", { name: locale === "ko" ? "토폴로지 판정 확인" : "Check topology decisions" }).click();
}

function topologyOverflow(page: TestPage) {
  return page.locator(
    ".veth-routing-chapter-shell, .veth-contract-grid, .veth-topology-lab, .veth-control-grid, .veth-routing-visualization, .veth-topology-map, .veth-boundary-card, .veth-link, .veth-path-grid, .veth-command-evidence, .veth-routing-incident-lab, .veth-incident-grid, .veth-incident-card, .network-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes bridge, router, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 02. veth·bridge·routing으로 토폴로지 조립 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "veth pair와 bridge 또는 router namespace를 선택하고, 겹치지 않는 CIDR·address·default route·return path를 조립합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "veth·bridge·routing으로 토폴로지 조립", exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED LAB · BUILD BOTH PATHS", { exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED ACTIVITY · TOPOLOGY INCIDENTS", { exact: true })).toBeVisible();

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toBeDisabled();
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".veth-topology-lab");
  await expect(lab).toHaveAttribute("data-interactive-ready", "true");
  const visual = lab.getByTestId("veth-routing-visualization");
  await expect(visual.getByRole("img", { name: /veth bridge router 왕복 topology 지도/ })).toBeVisible();
  await expect(visual.getByRole("img")).toHaveCount(1);
  await expect(visual).toHaveAttribute("data-topology-mode", "bridge");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-path-state", "not-run");
  await expect(visual.locator('[data-hop-status="not-run"]')).toHaveCount(10);
  await expect(visual.locator('[data-veth-pair-id="client-veth"]')).toHaveAttribute("data-placement-state", "dangling");

  await completeBridge(lab, "ko");
  await expect(visual.locator('[data-veth-pair-id][data-link-state="up"][data-placement-state="attached"]')).toHaveCount(2);
  await completeRouter(lab, "ko");
  await expect(lab.locator(".veth-lab-header > strong")).toHaveText("2 / 2");

  await lab.getByLabel("app return route").selectOption("missing");
  await expect(visual).toHaveAttribute("data-topology-state", "missing-return-route");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-hop-status="not-run"]')).toHaveCount(10);
  await lab.getByLabel("app return route").selectOption("correct");
  await lab.getByLabel("topology 실행 결과 예측").selectOption("round-trip-connected");
  await lab.getByRole("button", { name: "forward·return path 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko");
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", { exact: true })).toBeVisible();
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
  await expect(page.locator(".veth-topology-lab")).toHaveAttribute("data-interactive-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 02. Assemble Topologies with veth, Bridges, and Routing · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Choose veth pairs, a bridge, or a router namespace, then assemble non-overlapping CIDRs, addresses, default routes, and return paths.",
  );
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Assemble Topologies with veth, Bridges, and Routing", exact: true })).toBeVisible();

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
  expect(await topologyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".veth-topology-lab");
  const visual = lab.getByTestId("veth-routing-visualization");
  await expect(visual.getByRole("img", { name: /veth bridge and router round-trip topology map/ })).toBeVisible();
  await completeBridge(lab, "en");
  expect(await topologyOverflow(page)).toEqual([]);
  await completeRouter(lab, "en");
  expect(await topologyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const reset = lab.getByRole("button", { name: "Reset current mode" });
  await activate(reset);
  await expect(reset).toBeFocused();
  await expect(visual).toHaveAttribute("data-topology-mode", "router");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.getByLabel("Predict topology execution result")).toHaveValue("");

  const firstIncident = page.locator(".veth-incident-card").first();
  await firstIncident.getByRole("combobox").selectOption("attach-peer-to-bridge");
  const runIncident = firstIncident.getByRole("button", { name: "Re-run state and grade" });
  await activate(runIncident);
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".veth-feedback")).toHaveClass(/is-success/);

  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" })).toHaveAttribute("data-completion-ready", "false");
  expect(await topologyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

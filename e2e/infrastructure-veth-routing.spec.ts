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

async function completeBridge(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  if (isKo) await choose(lab, "veth-client-peer-target", "bridge");
  else await chooseWithKeyboard(lab, "veth-client-peer-target", "bridge");
  await choose(lab, "veth-app-peer-target", "bridge");
  if (isKo) await setSwitch(lab, "veth-client-link");
  else await enableSwitchWithKeyboard(lab, "veth-client-link");
  await setSwitch(lab, "veth-app-link");
  await choose(lab, "veth-app-address", "10.20.0.3/24");
  await choose(lab, "veth-prediction", "round-trip-connected");
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
  await choose(lab, "veth-client-peer-target", "router");
  await choose(lab, "veth-app-peer-target", "router");
  await setSwitch(lab, "veth-client-link");
  await setSwitch(lab, "veth-app-link");
  await choose(lab, "veth-client-forward-route", "correct");
  await choose(lab, "veth-app-return-route", "correct");
  await setSwitch(lab, "veth-router-forwarding");
  await choose(lab, "veth-prediction", "round-trip-connected");
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
  const incidents = [
    "dangling-bridge-peer",
    "duplicate-bridge-address",
    "forwarding-disabled",
    "missing-return-route",
  ] as const;
  const repairs = [
    "attach-peer-to-bridge",
    "assign-distinct-app-address",
    "enable-router-forwarding",
    "add-app-return-route",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await choose(card, `veth-incident-${incidents[index]}-repair`, repairs[index]);
    const run = card.getByRole("button", { name: locale === "ko" ? "상태 재실행·판정" : "Re-run state and grade" });
    await run.click();
    await expect(card.locator(".veth-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en", retryFirst = false) {
  const questions = page.locator(".concept-question");
  await expect(questions).toHaveCount(5);
  const answers = locale === "ko"
    ? [
        "서로 연결된 두 interface가 각자 하나의 namespace를 소유",
        "서로 다른 CIDR 사이의 IP routing",
        "gateway가 선택한 egress link에서 on-link가 아님",
        "net.ipv4.ip_forward=1",
        "reply path가 없어 왕복 연결 실패",
      ]
    : [
        "two linked interfaces each have one namespace owner",
        "IP routing between different CIDRs",
        "the gateway is not on-link through the selected egress",
        "net.ipv4.ip_forward=1",
        "the connection fails because the reply path is missing",
      ];
  const submit = page.getByRole("button", {
    name: locale === "ko" ? "토폴로지 판정 확인" : "Check topology decisions",
  });

  if (retryFirst) {
    await questions.nth(0).getByRole("button", {
      name: locale === "ko"
        ? "한 interface가 두 namespace에 동시에 존재"
        : "one interface exists in both namespaces",
      exact: true,
    }).click();
  } else {
    await questions.nth(0).getByRole("button", { name: answers[0], exact: true }).click();
  }
  for (let index = 1; index < answers.length; index += 1) {
    await questions.nth(index).getByRole("button", { name: answers[index], exact: true }).click();
  }
  await submit.click();

  if (retryFirst) {
    await expect(questions.nth(0)).toContainText(
      locale === "ko"
        ? "Chapter 1의 interface 단일 소유권을 유지하세요"
        : "Keep Chapter 1's single-owner interface rule",
    );
    await questions.nth(0).getByRole("button", { name: answers[0], exact: true }).click();
    await submit.click();
  }
}

function topologyOverflow(page: TestPage) {
  return page.locator(
    ".veth-routing-chapter-shell, .veth-contract-grid, .veth-topology-lab, .veth-topology-inspector, .veth-routing-visualization, .veth-topology-map, .veth-boundary-card, .veth-link, .veth-path-grid, .veth-command-evidence, .veth-routing-incident-lab, .veth-incident-grid, .veth-incident-card, .network-completion-checklist",
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
  await expect(lab.locator('select, input[type="checkbox"]')).toHaveCount(0);
  const visual = lab.getByTestId("veth-routing-visualization");
  await expect(visual.getByRole("group", { name: /veth bridge router 왕복 topology 지도/ })).toBeVisible();
  await expect(visual).toHaveAttribute("data-topology-mode", "bridge");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-path-state", "not-run");
  await expect(visual.locator('[data-hop-status="not-run"]')).toHaveCount(10);
  await expect(visual.locator('[data-veth-pair-id="client-veth"]')).toHaveAttribute("data-placement-state", "dangling");

  await completeBridge(lab, "ko");
  await expect(visual.locator('[data-veth-pair-id][data-link-state="up"][data-placement-state="attached"]')).toHaveCount(2);
  await completeRouter(lab, "ko");
  await expect(lab.locator(".veth-lab-header > strong")).toHaveText("2 / 2");

  await choose(lab, "veth-app-return-route", "missing");
  await expect(visual).toHaveAttribute("data-topology-state", "missing-return-route");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-hop-status="not-run"]')).toHaveCount(10);
  await choose(lab, "veth-app-return-route", "correct");
  await choose(lab, "veth-prediction", "round-trip-connected");
  await lab.getByRole("button", { name: "forward·return path 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko", true);
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
  await expect(visual.getByRole("group", { name: /veth bridge and router round-trip topology map/ })).toBeVisible();
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
  await expect(lab.locator('[data-control-id="veth-prediction"] [aria-pressed="true"]')).toHaveCount(0);

  const firstIncident = page.locator(".veth-incident-card").first();
  await activate(choiceControl(firstIncident, "veth-incident-dangling-bridge-peer-repair", "attach-peer-to-bridge"));
  await expect(choiceControl(firstIncident, "veth-incident-dangling-bridge-peer-repair", "attach-peer-to-bridge")).toHaveAttribute("aria-pressed", "true");
  const runIncident = firstIncident.getByRole("button", { name: "Re-run state and grade" });
  await activate(runIncident);
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".veth-feedback")).toHaveClass(/is-success/);

  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" })).toHaveAttribute("data-completion-ready", "false");
  const undersizedTargets = await page
    .locator('.lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary, .lesson-article input:not([disabled]), .lesson-article textarea:not([disabled])')
    .evaluateAll((elements) => elements
      .filter((element) => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && rect.width > 0 && rect.height > 0;
      })
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        return rect.width < 44 || rect.height < 44;
      })
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          tag: element.tagName,
          text: (element.getAttribute("aria-label") || element.textContent || "").trim().slice(0, 80),
          width: rect.width,
          height: rect.height,
        };
      }));
  expect(undersizedTargets).toEqual([]);
  expect(await topologyOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

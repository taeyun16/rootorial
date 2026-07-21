import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/network-observability-and-capacity";
const publicPath = "/curricula/infrastructure-design/chapters/network-observability-and-capacity";

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

async function choose(controlRoot: Locator, controlId: string, value: string) {
  await controlRoot
    .locator(`[data-control-id="${controlId}"] [data-choice-value="${value}"]`)
    .click();
}

async function expectGroupDescription(group: Locator, expected: string | RegExp) {
  const descriptionId = await group.getAttribute("aria-describedby");
  expect(descriptionId, "the observability path group must reference a detailed description").toBeTruthy();
  await expect(group.locator(`[id="${descriptionId}"]`)).toContainText(expected);
}

async function completeEvidence(lab: Locator, locale: "ko" | "en") {
  const values = [
    ["client-route", "client", "route-identifies-egress-only"],
    ["edge-counter", "edge", "counter-delta-localizes-drops"],
    ["edge-capture", "edge", "capture-absence-is-local"],
    ["app-sockets", "app", "socket-table-is-namespace-local"],
  ] as const;
  for (const [probeId, namespaceId, claim] of values) {
    const editor = lab.locator(`[data-probe-editor="${probeId}"]`);
    await choose(editor, `evidence-${probeId}-scope`, namespaceId);
    await choose(editor, `evidence-${probeId}-claim`, claim);
  }
  const visual = lab.getByTestId("network-observability-visualization");
  await expect(visual).toHaveAttribute("data-evidence-state", "aligned");
  await expect(visual).toHaveAttribute("data-evidence-grade-state", "not-run");
  await lab.getByRole("button", {
    name: locale === "ko" ? "네 evidence receipt 판정" : "Grade four evidence receipts",
  }).click();
  await expect(visual).toHaveAttribute("data-evidence-grade-state", "passed");
}

async function completeCapacityScenario(
  lab: Locator,
  locale: "ko" | "en",
  values: {
    scenarioButton: RegExp;
    scenarioId: string;
    prediction: string;
    plan: string;
    plannedResource: string;
    plannedUtilization: string;
  },
) {
  const visual = lab.getByTestId("network-observability-visualization");
  const feedback = lab.locator(".network-observability-lab-feedback");
  await lab.getByRole("button", { name: values.scenarioButton }).click();
  await expect(feedback).not.toHaveClass(/is-success|is-error/);
  await expect(feedback).toContainText(locale === "ko" ? "scenario로 전환했습니다" : "scenario selected");
  await expect(visual).toHaveAttribute("data-capacity-scenario", values.scenarioId);
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-bottleneck", "not-run");
  await choose(lab, "capacity-bottleneck-prediction", values.prediction);
  await choose(lab, "capacity-plan", values.plan);
  await expect(visual).toHaveAttribute("data-bottleneck", "not-run");
  await expect(visual.locator('[data-utilization-state="not-run"]')).toHaveCount(3);
  await lab.getByRole("button", {
    name: locale === "ko" ? "baseline 계산·plan 판정" : "Calculate baseline and grade plan",
  }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual).toHaveAttribute("data-bottleneck", values.prediction);
  await expect(visual.locator(`[data-capacity-resource="${values.plannedResource}"]`))
    .toHaveAttribute("data-displayed-utilization", values.plannedUtilization);
  await expect(visual.locator(`[data-capacity-resource="${values.plannedResource}"]`))
    .toHaveAttribute("data-utilization-state", "headroom");
  const resourceLabel = ({
    "edge-bandwidth": "edge bandwidth",
    "edge-queue": "edge burst queue",
    "app-connections": "app connections",
  } as const)[values.plannedResource as "edge-bandwidth" | "edge-queue" | "app-connections"];
  const utilizationPercent = Math.round(Number(values.plannedUtilization) * 100);
  await expect(visual.getByTestId("network-observability-capacity-summary")).toContainText(
    new RegExp(`${resourceLabel}.*utilization ${utilizationPercent}%.*${locale === "ko" ? "상태 30% headroom 확보" : "status 30% headroom available"}`),
  );
}

async function repairIncidents(page: TestPage, locale: "ko" | "en") {
  const cards = page.locator(".network-observability-incident-card");
  await expect(cards).toHaveCount(4);
  const repairs = [
    "inspect-app-sockets",
    "compare-window-delta",
    "dual-capture-same-window",
    "increase-drain-service",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await card.locator(`[data-control-id^="observability-incident-"] [data-choice-value="${repairs[index]}"]`).click();
    await card.getByRole("button", {
      name: locale === "ko" ? "증거·용량 재실행" : "Re-run evidence and capacity",
    }).click();
    await expect(card.locator(".network-observability-incident-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [
    'input[name="observation-scope"][value="probe-in-owning-namespace"]',
    'input[name="counter-window"][value="same-interface-window-delta"]',
    'input[name="capture-absence"][value="absence-is-scope-and-window-bound"]',
    'input[name="limiting-resource"][value="highest-ratio-crossing-limit"]',
    'input[name="queue-role"][value="queue-absorbs-bursts-not-sustained-overload"]',
  ];
  for (const selector of answers) await page.locator(selector).check();
  await page.getByRole("button", {
    name: locale === "ko" ? "관측·용량 판정 확인" : "Check observability and capacity decisions",
  }).click();
}

function observabilityOverflow(page: TestPage) {
  return page.locator(
    ".network-observability-chapter-shell, .network-observability-coordinate-strip, .network-observability-formula-grid, .network-observability-capacity-lab, .infrastructure-workspace, .infrastructure-choice-rail, .network-observability-evidence-grid, .network-observability-fixture-ledger, .network-observability-visualization, .network-observability-boundary-grid, .network-observability-capacity-grid, .network-observability-capacity-controls, .network-observability-incident-lab, .network-observability-incident-grid, .network-observability-incident-card, .network-observability-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes evidence, three capacity scenarios, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 07. 네트워크 관측과 용량 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "ip·ss·tcpdump·counter 증거를 한 packet path에 정렬하고 queue·bandwidth·connection limit의 포화 지점을 추정합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "네트워크 관측과 용량", exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED LAB · ALIGN → CALCULATE → PLAN", { exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED ACTIVITY · OBSERVABILITY INCIDENTS", { exact: true })).toBeVisible();

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toBeDisabled();
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".network-observability-capacity-lab");
  await expect(lab).toHaveAttribute("data-interactive-ready", "true");
  const visual = lab.getByTestId("network-observability-visualization");
  const pathGroup = visual.getByRole("group", { name: /namespace별 probe packet path와 capacity 비교/ });
  await expect(pathGroup).toBeVisible();
  await expect(pathGroup).toHaveAttribute("aria-labelledby", /.+/);
  await expectGroupDescription(pathGroup, /ip route get: host namespace · 잘못된 scope/);
  await expect(visual.getByRole("img")).toHaveCount(0);
  await expect(visual).toHaveAttribute("data-evidence-state", "unaligned");
  await expect(visual).toHaveAttribute("data-bottleneck", "not-run");
  await expect(visual.getByTestId("network-observability-capacity-summary"))
    .toContainText(/edge bandwidth.*utilization 계산 전.*상태 계산 전/);
  await expect(lab.locator("select, input[type=checkbox]")).toHaveCount(0);
  await expect(visual.locator('[data-observation-scope="host"]')).toHaveCount(0);
  await expect(visual.locator('[data-boundary-id="host"]')).toContainText("ip route get");

  await completeEvidence(lab, "ko");
  await expect(visual.locator('[data-placement-state="scoped"]')).toHaveCount(4);
  await expect(visual.locator('[data-boundary-id="host"]')).toHaveCount(0);
  await expectGroupDescription(pathGroup, /ip route get: client namespace · scope 일치/);

  await completeCapacityScenario(lab, "ko", {
    scenarioButton: /^BANDWIDTH/,
    scenarioId: "bandwidth-saturation",
    prediction: "edge-bandwidth",
    plan: "upgrade-edge-link",
    plannedResource: "edge-bandwidth",
    plannedUtilization: "0.64",
  });
  await choose(lab, "capacity-plan", "increase-edge-queue");
  await lab.getByRole("button", { name: "baseline 계산·plan 판정" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "failed");
  await expect(visual.getByTestId("network-observability-capacity-summary"))
    .toContainText(/edge bandwidth.*utilization 128%.*상태 포화 또는 용량 초과/);
  await choose(lab, "capacity-plan", "upgrade-edge-link");
  await lab.getByRole("button", { name: "baseline 계산·plan 판정" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await completeCapacityScenario(lab, "ko", {
    scenarioButton: /^BURST QUEUE/,
    scenarioId: "burst-queue",
    prediction: "edge-queue",
    plan: "increase-drain-capacity",
    plannedResource: "edge-queue",
    plannedUtilization: "0",
  });
  await completeCapacityScenario(lab, "ko", {
    scenarioButton: /^CONNECTIONS/,
    scenarioId: "connection-limit",
    prediction: "app-connections",
    plan: "add-app-replica",
    plannedResource: "app-connections",
    plannedUtilization: "0.625",
  });
  await expect(lab.locator(".network-observability-lab-header > strong")).toHaveText("4 / 4");

  await choose(lab, "capacity-bottleneck-prediction", "edge-bandwidth");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-bottleneck", "not-run");
  await choose(lab, "capacity-bottleneck-prediction", "app-connections");
  await lab.getByRole("button", { name: "baseline 계산·plan 판정" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  const routeEditor = lab.locator('[data-probe-editor="client-route"]');
  await choose(routeEditor, "evidence-client-route-scope", "host");
  await lab.getByRole("button", { name: "네 evidence receipt 판정" }).click();
  await expect(lab.locator(".network-observability-lab-feedback")).toHaveClass(/is-error/);
  await choose(routeEditor, "evidence-client-route-scope", "client");
  await lab.getByRole("button", { name: "네 evidence receipt 판정" }).click();
  await expect(lab.locator(".network-observability-lab-feedback")).toHaveClass(/is-success/);

  await repairIncidents(page, "ko");
  await answerConcepts(page, "ko");
  await expect(page.getByText("이해 확인 완료 — lab과 사건 완료 상태를 확인하세요.", { exact: true })).toBeVisible();
  await expect(page.locator(".network-observability-completion-checklist .is-complete")).toHaveCount(6);
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
  await expect(page.locator(".network-observability-capacity-lab")).toHaveAttribute("data-interactive-ready", "true", { timeout: 20_000 });
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 07. Network Observability and Capacity · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Align ip, ss, tcpdump, and counter evidence along one packet path, then estimate queue, bandwidth, and connection-limit saturation.",
  );
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "Network Observability and Capacity", exact: true })).toBeVisible();

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
  expect(await observabilityOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const lab = page.locator(".network-observability-capacity-lab");
  const visual = lab.getByTestId("network-observability-visualization");
  const pathGroup = visual.getByRole("group", { name: /Namespace-scoped probe packet path and capacity comparison/ });
  await expect(pathGroup).toBeVisible();
  await expect(pathGroup).toHaveAttribute("aria-labelledby", /.+/);
  await expectGroupDescription(pathGroup, /ip route get: host namespace · mis-scoped/);
  await expect(visual.getByRole("img")).toHaveCount(0);
  await expect(visual.getByTestId("network-observability-capacity-summary"))
    .toContainText(/edge bandwidth.*utilization not calculated.*status not calculated/);
  await completeEvidence(lab, "en");
  await expectGroupDescription(pathGroup, /ip route get: client namespace · scoped/);
  await completeCapacityScenario(lab, "en", {
    scenarioButton: /^BANDWIDTH/,
    scenarioId: "bandwidth-saturation",
    prediction: "edge-bandwidth",
    plan: "upgrade-edge-link",
    plannedResource: "edge-bandwidth",
    plannedUtilization: "0.64",
  });
  expect(await observabilityOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const reset = lab.getByRole("button", { name: "Reset current scenario" });
  await reset.focus();
  await reset.press("Enter");
  await expect(reset).toBeFocused();
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator('[data-control-id="capacity-bottleneck-prediction"] [aria-pressed="true"]')).toHaveCount(0);
  expect(await reset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");

  const firstIncident = page.locator(".network-observability-incident-card").first();
  await firstIncident.locator('[data-control-id^="observability-incident-"] [data-choice-value="inspect-app-sockets"]').click();
  const runIncident = firstIncident.getByRole("button", { name: "Re-run evidence and capacity" });
  await runIncident.focus();
  await runIncident.press("Enter");
  await expect(runIncident).toBeFocused();
  await expect(firstIncident.locator(".network-observability-incident-feedback")).toHaveClass(/is-success/);

  await answerConcepts(page, "en");
  await expect(page.getByText("Concept check complete — now confirm the lab and incident states.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Completion is disabled in preview" })).toHaveAttribute("data-completion-ready", "false");
  expect(await observabilityOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/network-namespaces-and-boundaries";
const publicPath = "/curricula/infrastructure-design/chapters/network-namespaces-and-boundaries";

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

async function configureBoundary(
  lab: Locator,
  title: string,
  namespaceId: "app" | "data",
  labels: {
    process: string;
    listener: string;
    probe: string;
  },
) {
  const boundary = lab.getByRole("group", { name: title });
  await boundary.getByLabel(labels.process).selectOption(namespaceId);
  await boundary.getByLabel(labels.listener).selectOption(namespaceId);
  await boundary.getByLabel(labels.probe).selectOption(namespaceId);
  await lab.getByLabel(`${namespaceId} lo admin state`).check();
}

async function completeTopology(lab: Locator, locale: "ko" | "en") {
  const isKo = locale === "ko";
  await lab.getByLabel(isKo ? "namespace 설계 결과 예측" : "Predict namespace design result")
    .selectOption("both-local-only");
  await configureBoundary(lab, "APP · 127.0.0.1:8080", "app", {
    process: isKo ? "service process 위치" : "service process namespace",
    listener: isKo ? "listener 생성 위치" : "listener creation namespace",
    probe: isKo ? "local health probe 위치" : "local health probe namespace",
  });
  await configureBoundary(lab, "DATA · 127.0.0.1:5432", "data", {
    process: isKo ? "service process 위치" : "service process namespace",
    listener: isKo ? "listener 생성 위치" : "listener creation namespace",
    probe: isKo ? "local health probe 위치" : "local health probe namespace",
  });
  const visual = lab.getByTestId("network-namespace-visualization");
  await expect(visual).toHaveAttribute("data-boundary-state", "working-boundaries");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", {
    name: isKo ? "reachability 실행·설계 판정" : "Run reachability and grade design",
  }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
}

async function repairAllIncidents(page: TestPage) {
  const incidents = page.locator(".namespace-incident-card");
  await expect(incidents).toHaveCount(4);
  const repairs = [
    "inspect-app",
    "bring-app-loopback-up",
    "recreate-listener-in-app",
    "run-probe-in-app",
  ] as const;
  for (let index = 0; index < repairs.length; index += 1) {
    const incident = incidents.nth(index);
    await incident.getByRole("combobox").selectOption(repairs[index]);
    const run = incident.getByRole("button", { name: "상태 재실행·판정" });
    await run.click();
    await expect(run).toBeFocused();
    await expect(incident.locator(".namespace-feedback")).toHaveClass(/is-success/);
  }
  await expect(page.locator(".namespace-mastery-progress .is-complete")).toHaveCount(4);
}

function namespaceOverflow(page: TestPage) {
  return page.locator(
    ".network-namespaces-chapter-shell, .namespace-view-grid, .namespace-loopback-strip, .namespace-ownership-grid, .namespace-evidence-pipeline, .namespace-lab, .namespace-design-grid, .namespace-lab-grid, .namespace-boundary-visualization, .namespace-kernel-boundary-map, .namespace-boundary-map-grid, .namespace-boundary-map-card, .namespace-boundary-object-lanes, .namespace-boundary-probe-list, .namespace-incident-grid, .namespace-incident-card, .network-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({
      className: element.className,
      overflow: element.scrollWidth - element.clientWidth,
    })));
}

test("completes the namespace topology, four incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 01. 네트워크 namespace와 격리 경계 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "프로세스, 인터페이스, route와 socket을 namespace별 network view에 배치하고, loopback과 listener 경계를 직접 실행하며 격리 실패를 진단합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", {
    name: "네트워크 namespace와 격리 경계",
    exact: true,
  })).toBeVisible();
  await expect(page.getByText("REQUIRED LAB · DESIGN THE BOUNDARY", { exact: true })).toBeVisible();
  await expect(page.getByText("REQUIRED ACTIVITY · INCIDENT CONSOLE", { exact: true })).toBeVisible();

  const ownershipStory = page.getByTestId("namespace-ownership-scenario-player");
  await expect(ownershipStory).toHaveAttribute("data-interactive-ready", "true");
  await expect(ownershipStory.locator("select")).toHaveCount(0);
  await expect(ownershipStory.locator('input[type="checkbox"]')).toHaveCount(0);
  await expect(ownershipStory.locator("[data-ownership-stage]")).toHaveCount(4);
  await expect(ownershipStory.getByRole("button")).toHaveCount(4);
  expect(await ownershipStory.evaluate((element) => Array.from(element.attributes)
    .map((attribute) => attribute.name)
    .filter((name) => /motion|player|transition|settled|duration/.test(name)))).toEqual([]);
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "separate-views");
  const ownershipBefore = ownershipStory.locator('[data-comparison-side="before"]');
  const ownershipAfter = ownershipStory.locator('[data-comparison-side="after"]');
  await expect(ownershipBefore).toHaveAttribute("data-snapshot-step", "separate-views");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "separate-views");
  await expect(ownershipBefore.locator("[data-object-id]")).toHaveCount(0);
  await expect(ownershipAfter.locator('[data-object-id="story-thread"]'))
    .toHaveAttribute("data-owner-namespace", "host");
  await expect(ownershipAfter.locator('[data-object-id="eth-app"]'))
    .toHaveAttribute("data-owner-namespace", "host");
  await expect(ownershipAfter.locator('[data-object-id="host-listener"]'))
    .toHaveAttribute("data-owner-namespace", "host");
  await expect(ownershipAfter.locator('[data-object-kind="socket"]')).toHaveCount(1);
  const initialOwnershipStatus = await ownershipStory.getByRole("status").textContent();
  await page.waitForTimeout(800);
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "separate-views");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "separate-views");

  const moveThread = ownershipStory.locator('[data-ownership-stage="thread-enters-app"] button');
  await activate(moveThread);
  await expect(moveThread).toBeFocused();
  await expect(moveThread).toHaveAttribute("aria-current", "step");
  await expect(ownershipStory.locator('[data-ownership-stage] button[aria-current="step"]')).toHaveCount(1);
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "thread-enters-app");
  await expect(ownershipBefore).toHaveAttribute("data-snapshot-step", "interface-moves");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "thread-enters-app");
  await expect(ownershipAfter.locator('[data-object-id="story-thread"]'))
    .toHaveAttribute("data-owner-namespace", "app");
  await expect(ownershipAfter.locator('[data-object-id="host-listener"]'))
    .toHaveAttribute("data-owner-namespace", "host");
  await expect(ownershipAfter.locator('[data-object-kind="socket"]')).toHaveCount(1);
  await expect(ownershipStory.locator('[data-delta-object-id="thread"]'))
    .toHaveAttribute("data-delta-kind", "changed");
  await expect(ownershipStory.locator('[data-delta-object-id="host-listener"]'))
    .toHaveAttribute("data-delta-kind", "preserved");
  await expect(ownershipStory.getByRole("status")).not.toHaveText(initialOwnershipStatus ?? "");

  const threadOwnershipStatus = await ownershipStory.getByRole("status").textContent();
  const createSocket = ownershipStory.locator('[data-ownership-stage="socket-created-in-app"] button');
  await activate(createSocket);
  await expect(createSocket).toBeFocused();
  await expect(createSocket).toHaveAttribute("aria-current", "step");
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "socket-created-in-app");
  await expect(ownershipBefore).toHaveAttribute("data-snapshot-step", "thread-enters-app");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "socket-created-in-app");
  await expect(ownershipAfter.locator('[data-object-kind="socket"]')).toHaveCount(2);
  await expect(ownershipAfter.locator('[data-object-id="app-listener"]'))
    .toHaveAttribute("data-owner-namespace", "app");
  await expect(ownershipAfter.locator('[data-object-kind="socket"]'))
    .toContainText(["127.0.0.1:8080", "127.0.0.1:8080"]);
  await expect(ownershipStory.locator('[data-delta-object-id="app-listener"]'))
    .toHaveAttribute("data-delta-kind", "created");
  await expect(ownershipStory.locator('[data-delta-object-id="host-listener"]'))
    .toHaveAttribute("data-delta-kind", "preserved");
  await expect(ownershipStory.getByRole("status")).not.toHaveText(threadOwnershipStatus ?? "");

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toBeDisabled();
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  const topology = page.locator(".namespace-topology-lab");
  await expect(topology).toHaveAttribute("data-interactive-ready", "true");
  await expect(topology.getByRole("heading", { name: "namespace별 local health와 격리 행렬 설계" })).toBeVisible();
  const visual = topology.getByTestId("network-namespace-visualization");
  await expect(visual.getByRole("img", { name: /네트워크 namespace 경계 지도/ })).toBeVisible();
  await expect(visual).toHaveAttribute("data-boundary-state", "collapsed");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-cross-namespace-path", "absent");
  await expect(visual.locator('[data-object-id="app-listener"]')).toHaveAttribute("data-owner-namespace", "host");
  await expect(visual.locator('[data-namespace-id="app"]')).toHaveAttribute("data-loopback-state", "down");
  await expect(visual.locator('[data-namespace-id="data"]')).toHaveAttribute("data-loopback-state", "down");
  await expect(visual.locator('[data-result="not-run"]')).toHaveCount(5);
  const appBoundary = topology.getByRole("group", { name: "APP · 127.0.0.1:8080" });
  await topology.getByRole("button", { name: "격리됨 · lo down" }).click();
  await expect(appBoundary.getByLabel("service process 위치")).toHaveValue("app");
  await expect(visual).toHaveAttribute("data-boundary-state", "isolated-down");
  await expect(visual.locator('[data-object-id="app-service"]')).toHaveAttribute("data-owner-namespace", "app");
  await expect(visual.locator('[data-object-id="app-listener"]')).toHaveAttribute("data-owner-namespace", "app");
  await topology.getByRole("button", { name: "전체 초기화" }).click();
  await expect(appBoundary.getByLabel("service process 위치")).toHaveValue("host");
  await expect(visual).toHaveAttribute("data-boundary-state", "collapsed");
  await topology.getByLabel("namespace 설계 결과 예측").selectOption("host-can-reach");
  await topology.getByRole("button", { name: "reachability 실행·설계 판정" }).click();
  await expect(topology.locator(".namespace-feedback")).toContainText("예측을 다시 보세요");
  await expect(visual).toHaveAttribute("data-grade-state", "failed");
  await expect(visual.locator(".namespace-boundary-probe-list > li")).toHaveCount(5);
  await expect(topology.locator(".namespace-feedback")).toHaveClass(/is-error/);

  await completeTopology(topology, "ko");
  await expect(topology.getByText("설계 통과", { exact: true })).toBeVisible();
  await expect(topology.locator(".namespace-feedback")).toContainText("app·data local health는 각자의 lo와 socket table에서 성공");
  await expect(topology.locator(".namespace-feedback")).toHaveClass(/is-success/);
  await expect(visual.locator('[data-result="connected"]')).toHaveCount(2);
  await expect(visual.locator('[data-result="connection-refused"]')).toHaveCount(3);

  await appBoundary.getByLabel("listener 생성 위치").selectOption("host");
  await expect(visual).toHaveAttribute("data-boundary-state", "misconfigured");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-object-id="app-listener"]')).toHaveAttribute("data-owner-namespace", "host");
  await expect(visual.locator('[data-result="not-run"]')).toHaveCount(5);
  await appBoundary.getByLabel("listener 생성 위치").selectOption("app");
  await expect(visual).toHaveAttribute("data-boundary-state", "working-boundaries");
  await topology.getByRole("button", { name: "reachability 실행·설계 판정" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");

  await repairAllIncidents(page);

  await page.locator('input[name="namespace-network-view"][value="interfaces-routes-neighbors-sockets"]').check();
  await page.locator('input[name="loopback-scope"][value="current-namespace-loopback"]').check();
  await page.locator('input[name="socket-ownership"][value="creation-network-namespace"]').check();
  await page.locator('input[name="interface-ownership"][value="one-network-namespace-at-a-time"]').check();
  await page.locator('input[name="observation-scope"][value="execute-observer-in-target-namespace"]').check();
  await page.getByRole("button", { name: "namespace 경계 판정 확인" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", { exact: true })).toBeVisible();

  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable and resettable at 390px without overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page.locator(".namespace-topology-lab")).toHaveAttribute("data-interactive-ready", "true");
  await page.getByRole("button", { name: "EN", exact: true }).click();
  await expect(page).toHaveURL(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 01. Network Namespaces and Isolation Boundaries · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Place processes, interfaces, routes, and sockets into namespace-local network views, execute loopback and listener boundaries, and diagnose failed isolation.",
  );
  await expect(page.locator(".lesson-article").getByRole("heading", {
    name: "Network Namespaces and Isolation Boundaries",
    exact: true,
  })).toBeVisible();

  const ownershipStory = page.getByTestId("namespace-ownership-scenario-player");
  await expect(ownershipStory).toHaveAttribute("data-interactive-ready", "true");
  await expect(ownershipStory.locator("[data-ownership-stage]")).toHaveCount(4);
  await expect(ownershipStory.getByRole("button")).toHaveCount(4);
  expect(await ownershipStory.evaluate((element) => Array.from(element.attributes)
    .map((attribute) => attribute.name)
    .filter((name) => /motion|player|transition|settled|duration/.test(name)))).toEqual([]);
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "separate-views");
  const ownershipBefore = ownershipStory.locator('[data-comparison-side="before"]');
  const ownershipAfter = ownershipStory.locator('[data-comparison-side="after"]');
  await expect(ownershipBefore).toHaveAttribute("data-snapshot-step", "separate-views");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "separate-views");
  const storyStatus = ownershipStory.getByRole("status");
  await expect(storyStatus).toHaveAttribute("aria-live", "polite");
  await expect(storyStatus).toHaveAttribute("aria-atomic", "true");
  const initialStoryStatus = await storyStatus.textContent();
  const ownershipCommands = ownershipStory.locator("[data-ownership-stage] button");
  const separateViews = ownershipCommands.nth(0);
  const moveInterface = ownershipCommands.nth(1);
  const moveThread = ownershipCommands.nth(2);
  const createSocket = ownershipCommands.nth(3);
  await expect(separateViews).toHaveAttribute("tabindex", "0");
  await expect(moveInterface).toHaveAttribute("tabindex", "-1");
  await separateViews.focus();
  await separateViews.press("ArrowRight");
  await expect(moveInterface).toBeFocused();
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "interface-moves");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "interface-moves");
  await expect(ownershipAfter.locator('[data-object-id="eth-app"]'))
    .toHaveAttribute("data-owner-namespace", "app");
  await expect(ownershipStory.locator('[data-delta-object-id="interface"]'))
    .toHaveAttribute("data-delta-kind", "changed");
  await expect(storyStatus).not.toHaveText(initialStoryStatus ?? "");
  await moveInterface.press("ArrowDown");
  await expect(moveThread).toBeFocused();
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "thread-enters-app");
  await expect(ownershipAfter.locator('[data-object-id="story-thread"]'))
    .toHaveAttribute("data-owner-namespace", "app");
  await moveThread.press("ArrowLeft");
  await expect(moveInterface).toBeFocused();
  await moveInterface.press("ArrowUp");
  await expect(separateViews).toBeFocused();
  await separateViews.press("End");
  await expect(createSocket).toBeFocused();
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "socket-created-in-app");
  await expect(ownershipAfter.locator('[data-object-kind="socket"]')).toHaveCount(2);
  await expect(ownershipStory.locator('[data-delta-object-id="app-listener"]'))
    .toHaveAttribute("data-delta-kind", "created");
  await createSocket.press("Home");
  await expect(separateViews).toBeFocused();
  await expect(separateViews).toHaveAttribute("aria-current", "step");
  await expect(ownershipStory).toHaveAttribute("data-active-stage", "separate-views");
  await expect(ownershipAfter).toHaveAttribute("data-snapshot-step", "separate-views");
  expect(await ownershipStory.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  )).toBeLessThanOrEqual(1);

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

  const documentOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const completionButton = page.getByRole("button", { name: "Completion is disabled in preview" });
  await expect(completionButton).toBeDisabled();
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  const topology = page.locator(".namespace-topology-lab");
  await expect(topology).toHaveAttribute("data-interactive-ready", "true");
  const visual = topology.getByTestId("network-namespace-visualization");
  await expect(visual.getByRole("img", { name: /Network namespace boundary map/ })).toBeVisible();
  await expect(visual.getByRole("img")).toHaveCount(1);
  await expect(visual).toHaveAttribute("data-boundary-state", "collapsed");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual).toHaveAttribute("data-cross-namespace-path", "absent");
  const isolatedPreset = topology.getByRole("button", { name: "Isolated · lo down" });
  await activate(isolatedPreset);
  await expect(isolatedPreset).toBeFocused();
  await expect(topology.getByLabel("app lo admin state")).not.toBeChecked();
  await expect(visual).toHaveAttribute("data-boundary-state", "isolated-down");
  await completeTopology(topology, "en");
  await expect(topology.getByText("DESIGN PASSED", { exact: true })).toBeVisible();
  await expect(visual.locator('[data-result="connected"]')).toHaveCount(2);
  await expect(visual.locator('[data-result="connection-refused"]')).toHaveCount(3);
  expect(await namespaceOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);

  const resetTopology = topology.getByRole("button", { name: "Reset all" });
  await activate(resetTopology);
  await expect(resetTopology).toBeFocused();
  await expect(topology.getByLabel("Predict namespace design result")).toHaveValue("");
  await expect(topology.getByRole("group", { name: "APP · 127.0.0.1:8080" })
    .getByLabel("service process namespace")).toHaveValue("host");
  await expect(visual).toHaveAttribute("data-boundary-state", "collapsed");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-result="not-run"]')).toHaveCount(5);

  const firstIncident = page.locator(".namespace-incident-card").first();
  const repair = firstIncident.getByRole("combobox");
  await repair.selectOption("inspect-app");
  const runRepair = firstIncident.getByRole("button", { name: "Re-run state and grade" });
  await activate(runRepair);
  await expect(runRepair).toBeFocused();
  await expect(firstIncident.locator(".namespace-feedback")).toHaveClass(/is-success/);
  const resetCard = firstIncident.getByRole("button", { name: "Reset card" });
  await activate(resetCard);
  await expect(resetCard).toBeFocused();
  await expect(repair).toHaveValue("");
  await expect(firstIncident.locator(".namespace-feedback")).not.toHaveClass(/is-success/);

  const conceptAnswers = [
    'input[name="namespace-network-view"][value="interfaces-routes-neighbors-sockets"]',
    'input[name="loopback-scope"][value="current-namespace-loopback"]',
    'input[name="socket-ownership"][value="creation-network-namespace"]',
    'input[name="interface-ownership"][value="one-network-namespace-at-a-time"]',
    'input[name="observation-scope"][value="execute-observer-in-target-namespace"]',
  ] as const;
  for (const selector of conceptAnswers) {
    const answer = page.locator(selector);
    await answer.focus();
    await answer.press("Space");
    await expect(answer).toBeChecked();
  }
  const checkConcepts = page.getByRole("button", { name: "Check namespace-boundary decisions" });
  await activate(checkConcepts);
  await expect(checkConcepts).toBeFocused();
  await expect(page.getByText("Concept check complete — now confirm both activity states.", { exact: true })).toBeVisible();
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  expect(await namespaceOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

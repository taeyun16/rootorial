import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";
import { findUndersizedVisibleTouchTargets } from "./helpers/touch-targets";

const previewPath = "/admin/preview/curricula/linux-networking/chapters/interfaces-addresses-and-loopback";
const publicPath = "/curricula/linux-networking/chapters/interfaces-addresses-and-loopback";

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

async function predictDelivery(page: TestPage, locale: "ko" | "en") {
  const label = locale === "ko"
    ? "현재 network view의 lo 상태와 주소"
    : "The lo state and address in the current network view";
  const control = page.getByRole("button", { name: label, exact: true });
  await expect(control).toHaveCount(1);
  await control.click();
  await expect(control).toHaveAttribute("aria-pressed", "true");
}

async function completeFigure(figure: Locator) {
  const phaseControls = figure.locator("[data-command-id] button[data-command-trigger]");
  for (let index = 1; index < 6; index += 1) {
    await phaseControls.nth(index).click();
  }
  await expect(figure).toHaveAttribute("data-network-view-phase", "lo-down-counterfactual");
  await expect(figure).toHaveAttribute("data-mastered", "true");
}

async function repairAllIncidents(page: TestPage) {
  const lab = page.locator(".network-view-incident-lab");
  const incidents = [
    { incident: /사건 1 · eth0 행이 없다/, repair: "device/driver 복구 → eth0 생성" },
    { incident: /사건 2 · eth0 DOWN/, repair: "ip link set eth0 up" },
    { incident: /사건 3 · UP, NO-CARRIER/, repair: "cable/virtual peer 복구" },
    { incident: /사건 4 · localhost delivery 실패/, repair: "127.0.0.1/8을 lo에 복구" },
  ] as const;

  await expect(lab.locator(".network-view-incident-rail > li")).toHaveCount(4);
  for (const { incident, repair } of incidents) {
    await lab.getByRole("button", { name: incident }).click();
    await lab.getByRole("button", { name: repair, exact: true }).click();
    await expect(lab.locator(".network-view-incident-feedback")).toHaveAttribute(
      "data-result",
      "correct",
    );
  }
  await expect(lab.locator(".network-view-incident-progress strong")).toHaveText("4 / 4");
}

async function answerAllConcepts(page: TestPage, locale: "ko" | "en" = "ko") {
  const correctAnswers = locale === "ko" ? [
    "행은 존재, DOWN은 operstate, UP flag 부재는 admin down",
    "주소는 인터페이스의 IPv4 식별값, /24는 네트워크 경계",
    "현재 호스트 안의 lo와 로컬 네트워크 스택",
    "127.0.0.1 같은 루프백 주소로 해석되는 호스트 이름",
    "링크 상태, 주소, 선택된 경로를 각각 확인",
  ] : [
    "The row proves existence, DOWN is operstate, and the absent UP flag means admin down",
    "The address is the interface's IPv4 identity; /24 defines the network boundary",
    "Through lo and the local stack inside the current host network view",
    "A hostname that resolves to a loopback address such as 127.0.0.1",
    "Inspect link, address, and the selected route as separate evidence",
  ];
  for (const label of correctAnswers) {
    const control = page.getByRole("button", { name: label, exact: true });
    await expect(control).toHaveCount(1);
    await control.click();
  }
  const submitLabel = locale === "ko" ? "답 확인하기" : "Check answers";
  const completionCopy = locale === "ko"
    ? "개념 확인 완료 — 필수 실습과 장애 복구 상태를 확인하세요."
    : "Concept check complete — now confirm the required lab and incident repairs.";
  const submit = page.getByRole("button", { name: submitLabel, exact: true });
  await expect(submit).toHaveCount(1);
  await submit.click();
  await expect(page.getByText(completionCopy, { exact: true })).toBeVisible();
}

function untranslatedHangul(page: TestPage) {
  return page.locator(".lesson-article").evaluate((root) => {
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
}

test("completes the executable host view, four repairs, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 01. 인터페이스·주소·루프백 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "인터페이스의 존재와 링크 상태를 구분하고, MAC 주소·IPv4 주소·프리픽스와 루프백을 배치한 뒤 localhost 통신이 호스트 안에서 어떻게 끝나는지 관찰합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", {
    name: "인터페이스·주소·루프백",
    exact: true,
  })).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);

  const figure = page.getByTestId("linux-network-view-figure");
  await expect(page.locator('figure[data-testid="linux-network-view-figure"]')).toHaveCount(1);
  await expect(figure).toHaveClass(/\bexecutable-figure\b/);
  await expect(figure).toHaveAccessibleName("인터페이스·주소·루프백을 한 화면에서 분리해 보세요");
  await expect(figure).toHaveAccessibleDescription(
    "명령을 실행할 때마다 한 호스트에서 바뀐 상태가 그림과 상태표에 함께 표시됩니다. 무엇이 생겼고, 바뀌었으며, 그대로인지 비교하세요.",
  );
  await expect(figure).toHaveAttribute("data-component", "linux-network-view-explorer");
  await expect(figure).toHaveAttribute("data-interactive-ready", "true");
  await expect(figure).toHaveAttribute("data-network-view-phase", "observe");
  await expect(figure).toHaveAttribute("data-mastered", "false");
  await expect(figure.locator(":scope > figcaption.executable-figure-caption")).toHaveCount(1);
  await expect(figure.locator("figure")).toHaveCount(0);

  await predictDelivery(page, "ko");

  const phaseControls = figure.locator("[data-command-id] button[data-command-trigger]");
  await expect(phaseControls).toHaveCount(6);
  await phaseControls.nth(1).click();
  await expect(figure).toHaveAttribute("data-network-view-phase", "eth0-up");
  await expect(figure.locator('[data-interface-row="eth0"]')).toHaveAttribute("data-admin-state", "up");
  await phaseControls.nth(1).press("ArrowRight");
  await expect(phaseControls.nth(2)).toBeFocused();
  await expect(figure).toHaveAttribute("data-network-view-phase", "address-added");
  await expect(figure.locator('[data-interface-row="eth0"]')).toContainText("10.0.0.2");

  const resetFigure = figure.getByTestId("linux-network-view-reset");
  await activate(resetFigure);
  await expect(figure).toHaveAttribute("data-network-view-phase", "observe");
  await expect(figure).toHaveAttribute("data-mastered", "false");
  await expect(phaseControls.nth(0)).toBeFocused();

  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toBeDisabled();
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  await completeFigure(figure);
  await expect(figure).toHaveAttribute("data-probe-result", "blocked");
  await expect(figure.locator('[data-interface-row="lo"]')).toContainText("127.0.0.1");
  await repairAllIncidents(page);
  await answerAllConcepts(page);

  await expect(page.locator(".network-view-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English executable figure keyboard-usable at 390px with reduced motion and no overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = watchConsoleErrors(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 01. Interfaces, Addresses, and Loopback · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Separate interface existence from link state, place MAC and IPv4 addresses with prefixes, and observe which boundary contains loopback and localhost.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.locator(".lesson-article").getByRole("heading", {
    name: "Interfaces, Addresses, and Loopback",
    exact: true,
  })).toBeVisible();
  await expect(page.locator("select")).toHaveCount(0);

  const figure = page.getByTestId("linux-network-view-figure");
  await expect(page.locator('figure[data-testid="linux-network-view-figure"]')).toHaveCount(1);
  await expect(figure).toHaveClass(/\bexecutable-figure\b/);
  await expect(figure).toHaveAccessibleName("Separate interfaces, addresses, and loopback in one state view");
  await expect(figure).toHaveAccessibleDescription(
    "Each command updates the diagram and state table for the same host. Compare what appeared, changed, and stayed fixed.",
  );
  await expect(figure).toHaveAttribute("data-network-view-phase", "observe");
  expect(await page.evaluate(() => matchMedia("(prefers-reduced-motion: reduce)").matches)).toBe(true);

  await predictDelivery(page, "en");

  const phaseControls = figure.locator("[data-command-id] button[data-command-trigger]");
  await expect(phaseControls).toHaveCount(6);
  await completeFigure(figure);
  const first = phaseControls.nth(0);
  const second = phaseControls.nth(1);
  const third = phaseControls.nth(2);
  const last = phaseControls.nth(5);
  await first.focus();
  await first.press("End");
  await expect(last).toBeFocused();
  await expect(figure).toHaveAttribute("data-network-view-phase", "lo-down-counterfactual");
  await last.press("Home");
  await expect(first).toBeFocused();
  await expect(figure).toHaveAttribute("data-network-view-phase", "observe");
  await first.press("ArrowRight");
  await expect(second).toBeFocused();
  await expect(figure).toHaveAttribute("data-network-view-phase", "eth0-up");
  await second.press("ArrowDown");
  await expect(third).toBeFocused();
  await expect(figure).toHaveAttribute("data-network-view-phase", "address-added");
  await third.press("ArrowLeft");
  await expect(second).toBeFocused();
  await second.press("ArrowUp");
  await expect(first).toBeFocused();

  const figureMotionViolations = await figure.locator("*").evaluateAll((elements) => {
    const durationInMs = (duration: string) => {
      const value = Number.parseFloat(duration);
      if (!Number.isFinite(value)) return 0;
      return duration.trim().endsWith("ms") ? value : value * 1_000;
    };
    const violations: string[] = [];
    for (const element of elements) {
      for (const pseudo of [null, "::before", "::after"] as const) {
        const style = getComputedStyle(element, pseudo);
        const durations = [style.animationDuration, style.transitionDuration]
          .flatMap((value) => value.split(","))
          .map(durationInMs);
        if (durations.some((duration) => duration > 1)) {
          violations.push(`${element.tagName.toLowerCase()}${pseudo ?? ""}`);
        }
      }
    }
    return violations;
  });
  expect(figureMotionViolations).toEqual([]);
  expect(await untranslatedHangul(page)).toEqual([]);

  await answerAllConcepts(page, "en");
  expect(
    await findUndersizedVisibleTouchTargets(page.locator(".lesson-article"), 44),
    "every currently visible enabled lesson target should meet the 44px mobile contract",
  ).toEqual([]);

  expect(await figure.evaluate(
    (element) => element.scrollWidth - element.clientWidth,
  )).toBeLessThanOrEqual(1);
  expect(await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  )).toBeLessThanOrEqual(1);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

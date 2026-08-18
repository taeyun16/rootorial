import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/egress-nat-and-conntrack";
const publicPath = "/curricula/infrastructure-design/chapters/egress-nat-and-conntrack";
type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchConsoleErrors(page: TestPage) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
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

async function completeMode(lab: Locator, locale: "ko" | "en", mode: "snat" | "masquerade") {
  const ko = locale === "ko";
  await expect(lab).toHaveAttribute("data-interactive-ready", "true", {
    timeout: 20_000,
  });
  if (mode === "snat") {
    await lab.getByRole("button", { name: /^SNAT/ }).click();
    if (ko) {
      await setSwitch(lab, "nat-forwarding");
      await choose(lab, "nat-hook", "postrouting");
    } else {
      await enableSwitchWithKeyboard(lab, "nat-forwarding");
      await chooseWithKeyboard(lab, "nat-hook", "postrouting");
    }
    await choose(lab, "nat-snat-target", "egress-address");
  } else {
    await lab.getByRole("button", { name: /^MASQUERADE/ }).click();
    await choose(lab, "nat-hook", "postrouting");
    await setSwitch(lab, "nat-egress-address-present");
    await choose(lab, "nat-return-router", "same-router");
  }
  await choose(lab, "nat-prediction", "round-trip");
  const visual = lab.getByTestId("nat-conntrack-visualization");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: ko ? "forward·return NAT flow 실행" : "Run forward and return NAT flow" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
}

async function repairIncidents(page: TestPage) {
  const repairs = ["move-rule-to-postrouting", "use-egress-owned-address", "return-through-original-router", "use-masquerade-for-dynamic-egress"];
  const incidents = ["wrong-nat-hook", "unowned-snat-address", "asymmetric-return", "dynamic-egress-stale-snat"];
  const cards = page.locator(".nat-incident-card");
  await expect(cards).toHaveCount(4);
  for (let index = 0; index < repairs.length; index += 1) {
    const card = cards.nth(index);
    await choose(card, `nat-incident-${incidents[index]}-repair`, repairs[index]);
    await card.locator(".button-primary").click();
    await expect(card.locator(".nat-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en", retryFirst = false) {
  const questions = page.locator(".concept-question");
  const answers = locale === "ko"
    ? [/route lookup이 먼저 egress를 선택/, /고정 주소는 SNAT, 동적 주소는 MASQUERADE/, /reply tuple이 conntrack의 original flow에 매핑/, /route와 IP forwarding은 별도 contract/, /reply가 original stateful router를 통과/]
    : [/route lookup first selects the egress/, /SNAT for fixed addresses; masquerade for dynamic ones/, /reply tuple maps to conntrack's original flow/, /routes and IP forwarding remain separate contracts/, /reply crosses the original stateful router/];
  for (let index = 0; index < answers.length; index += 1) {
    await questions.nth(index).getByRole("button", { name: answers[index] }).click();
  }
  const submit = page.getByRole("button", {
    name: locale === "ko" ? "egress 판단 확인" : "Check egress decisions",
  });
  if (retryFirst) {
    await questions.nth(0).getByRole("button", {
      name: locale === "ko" ? /NAT가 missing route를 생성/ : /NAT creates a missing route/,
    }).click();
    await submit.click();
    await expect(questions.nth(0)).toContainText(
      locale === "ko" ? "route·forwarding·translation 순서" : "Recheck route, forwarding, and translation order",
    );
    await questions.nth(0).getByRole("button", { name: answers[0] }).click();
  }
  await submit.click();
}

function natOverflow(page: TestPage) {
  return page.locator(
    ".egress-nat-chapter-shell, .nat-conntrack-lab, .nat-flow-visualization, .nat-topology-map, .nat-node, .nat-node-controls, .nat-node-control-stack, .nat-node-switch-grid, .nat-run-row, .nat-conntrack-lab .infrastructure-choice-rail, .nat-conntrack-lab .infrastructure-state-switch, .nat-incident-grid, .nat-incident-card",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

test("completes both NAT modes, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 03. egress·NAT·conntrack · Rootorial");
  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  const lab = page.locator(".nat-conntrack-lab");
  await expect(lab.locator('select, input[type="checkbox"]')).toHaveCount(0);
  const visual = lab.getByTestId("nat-conntrack-visualization");
  await expect(visual.getByRole("group", { name: /private client와 NAT router, external service topology 지도/ })).toBeVisible();
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-stage-status="not-run"]')).toHaveCount(10);
  await completeMode(lab, "ko", "snat");
  await completeMode(lab, "ko", "masquerade");
  await expect(lab.locator(".nat-lab-header > strong")).toHaveText("2 / 2");
  await repairIncidents(page);
  await answerConcepts(page, "ko", true);
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(consoleErrors).toEqual([]);
  expect((await page.goto(publicPath))?.status()).toBe(404);
});

test("keeps the English draft usable at 390px without untranslated text or overflow", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 03. Egress, NAT, and Conntrack · Rootorial");
  await expect(page.locator(".lesson-article")).not.toContainText(/[가-힣]/);
  const documentOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await natOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  const lab = page.locator(".nat-conntrack-lab");
  await completeMode(lab, "en", "snat");
  expect(await natOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  await completeMode(lab, "en", "masquerade");
  expect(await natOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  const reset = lab.getByRole("button", { name: "Reset current mode" });
  await reset.focus();
  await reset.press("Enter");
  await expect(reset).toBeFocused();
  await expect(lab.getByTestId("nat-conntrack-visualization")).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator('[data-control-id="nat-prediction"] [aria-pressed="true"]')).toHaveCount(0);
  expect(await natOverflow(page)).toEqual([]);
  expect(await documentOverflow()).toBeLessThanOrEqual(1);
  await answerConcepts(page, "en");
  const undersizedTargets = await page
    .locator('.lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary, .lesson-article input:not([disabled]), .lesson-article textarea:not([disabled])')
    .evaluateAll((elements) => elements
      .filter((element) => {
        const rect = element.getBoundingClientRect();
        const style = getComputedStyle(element);
        return style.visibility !== "hidden"
          && style.display !== "none"
          && rect.width > 0
          && rect.height > 0
          && (rect.width < 44 || rect.height < 44);
      })
      .map((element) => ({
        label: element.textContent?.trim() || element.getAttribute("aria-label"),
        width: element.getBoundingClientRect().width,
        height: element.getBoundingClientRect().height,
      })));
  expect(undersizedTargets).toEqual([]);
  expect(consoleErrors).toEqual([]);
  expect((await page.goto(`${publicPath}?lang=en`))?.status()).toBe(404);
});

import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/availability-and-failure-domains";
const publicPath = "/curricula/infrastructure-design/chapters/availability-and-failure-domains";
type TestPage = Parameters<typeof signInTestUser>[0];
async function signInAsAdmin(page: TestPage) { test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required."); await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!); }

async function choose(lab: Locator, controlId: string, value: string) {
  await lab.locator(`[data-control-id="${controlId}"] [data-choice-value="${value}"]`).click();
}

async function completeMode(lab: Locator, locale: "ko" | "en", mode: "placement" | "recovery") {
  const ko = locale === "ko";
  await expect(lab).toHaveAttribute("data-interactive-ready", "true", {
    timeout: 20_000,
  });
  await lab.getByRole("button", { name: mode === "placement" ? /DOMAIN PLACEMENT/ : /DEPENDENCY RECOVERY/ }).click();
  if (mode === "placement") {
    await choose(lab, "gateway-placement", "split-zones");
    await choose(lab, "replica-placement", "split-zones");
    await choose(lab, "database-placement", "cross-zone-standby");
  } else {
    await choose(lab, "database-placement", "cross-zone-standby");
    const dependency = lab.locator('[data-control-id="optional-dependency-policy"]');
    if (await dependency.getAttribute("aria-checked") !== "true") await dependency.click();
    await lab.locator('[data-control-id="recovery-seconds"]').fill("20");
  }
  await choose(lab, "availability-prediction", "target-met");
  const visual = lab.getByTestId("availability-failure-domain-visualization");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: ko ? "10,000 request failure trace 실행" : "Run the 10,000-request failure trace" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-availability-state="target-met"]')).toBeVisible();
}

async function repairIncidents(page: TestPage) {
  const repairs = ["spread-replicas-across-zones", "split-gateways-across-zones", "move-standby-to-zone-b", "degrade-optional-dependency"];
  const cards = page.locator(".availability-incident-grid article"); await expect(cards).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) { const card = cards.nth(index); await card.locator(`[data-control-id^="availability-incident-"] [data-choice-value="${repairs[index]}"]`).click(); await card.getByRole("button", { name: /failure trace/ }).click(); await expect(card.locator(".availability-feedback")).toHaveClass(/is-success/); }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [["failure-domain-diversity", "replicas-must-span-failure-domains"], ["gateway-diversity", "front-door-remains-correlated"], ["failover-budget", "bound-recovery-and-request-loss"], ["dependency-budget", "optional-dependency-has-degraded-mode"], ["availability-math", "served-over-total-is-99-6"]];
  for (const [name, value] of answers) await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.getByRole("button", { name: locale === "ko" ? "가용성 판단 확인" : "Check availability decisions" }).click();
}

function availabilityOverflow(page: TestPage) {
  return page.locator(
    ".availability-chapter-shell, .availability-principle, .availability-lab, .infrastructure-workspace, .infrastructure-workspace-stage, .infrastructure-workspace-inspector, .availability-visual, .availability-map, .availability-zone, .availability-placement-controls, .availability-recovery-control, .availability-meter, .availability-checks, .availability-run, .infrastructure-choice-rail, .availability-incident-lab, .availability-incident-grid, .availability-incident-grid article, .network-completion-checklist",
  ).evaluateAll((elements) => elements
    .filter((element) => element.scrollWidth - element.clientWidth > 1)
    .map((element) => ({ className: element.className, overflow: element.scrollWidth - element.clientWidth })));
}

async function expectNoAvailabilityOverflow(page: TestPage) {
  expect(await availabilityOverflow(page)).toEqual([]);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
}

test("completes the Korean draft availability lab, incidents, and concepts", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  expect((await page.goto(previewPath))?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 06. 가용성과 failure domain · Rootorial");

  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  const lab = page.locator(".availability-lab");
  const visual = lab.getByTestId("availability-failure-domain-visualization");
  await expect(visual.getByRole("group", { name: /zone A·B·C/ })).toBeVisible();
  await expect(lab.locator("select, input[type=checkbox]")).toHaveCount(0);
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-check-status="not-run"]')).toHaveCount(5);

  await completeMode(lab, "ko", "placement");
  await completeMode(lab, "ko", "recovery");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("2 / 2");
  await repairIncidents(page);
  await answerConcepts(page, "ko");
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();

  await choose(lab, "availability-prediction", "target-missed");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator(".availability-feedback")).not.toHaveClass(/is-success/);
  await expect(lab.locator(".availability-feedback")).toContainText("예측이 바뀌었습니다.");
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  await choose(lab, "availability-prediction", "target-met");
  await lab.getByRole("button", { name: "10,000 request failure trace 실행" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("2 / 2");
  await expect(completion).toHaveAttribute("data-completion-ready", "true");

  await lab.getByRole("button", { name: "현재 mode 초기화" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator('[data-control-id="availability-prediction"] [aria-pressed="true"]')).toHaveCount(0);
  await expect(lab.locator(".availability-feedback")).not.toHaveClass(/is-success/);
  await expect(completion).toHaveAttribute("data-completion-ready", "false");

  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect((await page.goto(publicPath))?.status()).toBe(404);
});

test("keeps the English availability draft usable at 390px", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 06. Availability and Failure Domains · Rootorial");
  await expect(page.locator(".lesson-article")).not.toContainText(/[가-힣]/);

  const lab = page.locator(".availability-lab");
  const visual = lab.getByTestId("availability-failure-domain-visualization");
  await expectNoAvailabilityOverflow(page);

  await completeMode(lab, "en", "placement");
  await expectNoAvailabilityOverflow(page);
  await completeMode(lab, "en", "recovery");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("2 / 2");
  await expectNoAvailabilityOverflow(page);

  await lab.getByRole("button", { name: "Reset current mode" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(lab.locator(".availability-lab-header > strong")).toHaveText("1 / 2");
  await expect(lab.locator('[data-control-id="availability-prediction"] [aria-pressed="true"]')).toHaveCount(0);
  await expectNoAvailabilityOverflow(page);

  await answerConcepts(page, "en");
  expect((await page.goto(`${publicPath}?lang=en`))?.status()).toBe(404);
});

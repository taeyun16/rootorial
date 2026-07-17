import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/availability-and-failure-domains";
const publicPath = "/curricula/infrastructure-design/chapters/availability-and-failure-domains";
type TestPage = Parameters<typeof signInTestUser>[0];
async function signInAsAdmin(page: TestPage) { test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required."); await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!); }

async function completeMode(lab: Locator, locale: "ko" | "en", mode: "placement" | "recovery") {
  const ko = locale === "ko";
  await lab.getByRole("button", { name: mode === "placement" ? /DOMAIN PLACEMENT/ : /DEPENDENCY RECOVERY/ }).click();
  if (mode === "placement") {
    await lab.getByLabel(ko ? "gateway failure domain" : "Gateway failure domains").selectOption("split-zones");
    await lab.getByLabel(ko ? "app replica placement" : "App replica placement").selectOption("split-zones");
    await lab.getByLabel(ko ? "database primary·standby" : "Database primary and standby").selectOption("cross-zone-standby");
  } else {
    await lab.getByLabel(ko ? "database primary·standby" : "Database primary and standby").selectOption("cross-zone-standby");
    await lab.getByLabel(ko ? "optional dependency 정책" : "Optional dependency policy").selectOption("degraded-mode");
    await lab.getByLabel(ko ? "zone failover recovery" : "Zone failover recovery").selectOption("20");
  }
  await lab.getByLabel(ko ? "가용성 실행 결과 예측" : "Predict availability result").selectOption("target-met");
  const visual = lab.getByTestId("availability-failure-domain-visualization");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: ko ? "10,000 request failure trace 실행" : "Run the 10,000-request failure trace" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
  await expect(visual.locator('[data-availability-state="target-met"]')).toBeVisible();
}

async function repairIncidents(page: TestPage) {
  const repairs = ["spread-replicas-across-zones", "split-gateways-across-zones", "move-standby-to-zone-b", "degrade-optional-dependency"];
  const cards = page.locator(".availability-incident-grid article"); await expect(cards).toHaveCount(4);
  for (let index = 0; index < 4; index += 1) { await cards.nth(index).getByRole("combobox").selectOption(repairs[index]); await cards.nth(index).getByRole("button").click(); await expect(cards.nth(index).locator(".availability-feedback")).toHaveClass(/is-success/); }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [["failure-domain-diversity", "replicas-must-span-failure-domains"], ["gateway-diversity", "front-door-remains-correlated"], ["failover-budget", "bound-recovery-and-request-loss"], ["dependency-budget", "optional-dependency-has-degraded-mode"], ["availability-math", "served-over-total-is-99-6"]];
  for (const [name, value] of answers) await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.getByRole("button", { name: locale === "ko" ? "가용성 판단 확인" : "Check availability decisions" }).click();
}

test("completes the Korean draft availability lab, incidents, and concepts", async ({ page }) => {
  test.setTimeout(120_000); await signInAsAdmin(page); await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  expect((await page.goto(previewPath))?.status()).toBe(200); await expect(page).toHaveTitle("[미리보기] 06. 가용성과 failure domain · Rootorial");
  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" }); await expect(completion).toHaveAttribute("data-completion-ready", "false");
  const lab = page.locator(".availability-lab"); const visual = lab.getByTestId("availability-failure-domain-visualization"); await expect(visual.getByRole("img")).toHaveCount(1); await expect(visual).toHaveAttribute("data-grade-state", "not-run"); await expect(visual.locator('[data-check-status="not-run"]')).toHaveCount(5);
  await completeMode(lab, "ko", "placement"); await completeMode(lab, "ko", "recovery"); await expect(lab.locator(".availability-lab-header > strong")).toHaveText("2 / 2"); await repairIncidents(page); await answerConcepts(page, "ko");
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4); await expect(completion).toHaveAttribute("data-completion-ready", "true"); await expect(completion).toBeDisabled(); expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull(); expect((await page.goto(publicPath))?.status()).toBe(404);
});

test("keeps the English availability draft usable at 390px", async ({ page }) => {
  test.setTimeout(120_000); await signInAsAdmin(page); await page.setViewportSize({ width: 390, height: 844 }); await page.emulateMedia({ reducedMotion: "reduce" }); await page.goto(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 06. Availability and Failure Domains · Rootorial"); await expect(page.locator(".lesson-article")).not.toContainText(/[가-힣]/);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  await completeMode(page.locator(".availability-lab"), "en", "placement"); await answerConcepts(page, "en"); expect((await page.goto(`${publicPath}?lang=en`))?.status()).toBe(404);
});

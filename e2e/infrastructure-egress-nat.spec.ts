import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/infrastructure-design/chapters/egress-nat-and-conntrack";
const publicPath = "/curricula/infrastructure-design/chapters/egress-nat-and-conntrack";
type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

async function completeMode(lab: Locator, locale: "ko" | "en", mode: "snat" | "masquerade") {
  const ko = locale === "ko";
  await expect(lab).toHaveAttribute("data-interactive-ready", "true", {
    timeout: 20_000,
  });
  if (mode === "snat") {
    await lab.getByRole("button", { name: /^SNAT/ }).click();
    await lab.getByLabel("router net.ipv4.ip_forward=1").check();
    await lab.getByLabel(ko ? "NAT rule hook" : "NAT rule hook").selectOption("postrouting");
    await lab.getByLabel("SNAT target").selectOption("egress-address");
  } else {
    await lab.getByRole("button", { name: /^MASQUERADE/ }).click();
    await lab.getByLabel("NAT rule hook").selectOption("postrouting");
    await lab.getByLabel(ko ? "egress interface에 usable address 존재" : "Egress interface has a usable address").check();
    await lab.getByLabel(ko ? "reply가 지나는 router" : "Router traversed by reply").selectOption("same-router");
  }
  await lab.getByLabel(ko ? "NAT flow 실행 결과 예측" : "Predict NAT flow execution result").selectOption("round-trip");
  const visual = lab.getByTestId("nat-conntrack-visualization");
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await lab.getByRole("button", { name: ko ? "forward·return NAT flow 실행" : "Run forward and return NAT flow" }).click();
  await expect(visual).toHaveAttribute("data-grade-state", "passed");
}

async function repairIncidents(page: TestPage) {
  const repairs = ["move-rule-to-postrouting", "use-egress-owned-address", "return-through-original-router", "use-masquerade-for-dynamic-egress"];
  const cards = page.locator(".nat-incident-card");
  await expect(cards).toHaveCount(4);
  for (let index = 0; index < repairs.length; index += 1) {
    await cards.nth(index).getByRole("combobox").selectOption(repairs[index]);
    await cards.nth(index).getByRole("button").click();
    await expect(cards.nth(index).locator(".nat-feedback")).toHaveClass(/is-success/);
  }
}

async function answerConcepts(page: TestPage, locale: "ko" | "en") {
  const answers = [
    ["nat-after-routing", "source-nat-runs-on-selected-egress"],
    ["snat-vs-masquerade", "static-snat-dynamic-masquerade"],
    ["conntrack-reply-tuple", "reply-maps-to-original-private-flow"],
    ["nat-not-routing", "routing-and-forwarding-remain-required"],
    ["stateful-return-path", "reply-must-cross-original-stateful-router"],
  ];
  for (const [name, value] of answers) await page.locator(`input[name="${name}"][value="${value}"]`).check();
  await page.getByRole("button", { name: locale === "ko" ? "egress 판단 확인" : "Check egress decisions" }).click();
}

test("completes both NAT modes, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 03. egress·NAT·conntrack · Rootorial");
  const completion = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completion).toHaveAttribute("data-completion-ready", "false");
  const lab = page.locator(".nat-conntrack-lab");
  const visual = lab.getByTestId("nat-conntrack-visualization");
  await expect(visual.getByRole("img")).toHaveCount(1);
  await expect(visual).toHaveAttribute("data-grade-state", "not-run");
  await expect(visual.locator('[data-stage-status="not-run"]')).toHaveCount(10);
  await completeMode(lab, "ko", "snat");
  await completeMode(lab, "ko", "masquerade");
  await expect(lab.locator(".nat-lab-header > strong")).toHaveText("2 / 2");
  await repairIncidents(page);
  await answerConcepts(page, "ko");
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(4);
  await expect(completion).toHaveAttribute("data-completion-ready", "true");
  await expect(completion).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect((await page.goto(publicPath))?.status()).toBe(404);
});

test("keeps the English draft usable at 390px without untranslated text or overflow", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${previewPath}?lang=en`);
  await expect(page).toHaveTitle("[Preview] 03. Egress, NAT, and Conntrack · Rootorial");
  await expect(page.locator(".lesson-article")).not.toContainText(/[가-힣]/);
  const overflow = await page.locator(".egress-nat-chapter-shell, .nat-flow-visualization, .nat-control-grid, .nat-incident-grid").evaluateAll((elements) => elements.filter((element) => element.scrollWidth - element.clientWidth > 1).length);
  expect(overflow).toBe(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(1);
  const lab = page.locator(".nat-conntrack-lab");
  await completeMode(lab, "en", "snat");
  const reset = lab.getByRole("button", { name: "Reset current mode" });
  await reset.focus();
  await reset.press("Enter");
  await expect(reset).toBeFocused();
  await expect(lab.getByTestId("nat-conntrack-visualization")).toHaveAttribute("data-grade-state", "not-run");
  await answerConcepts(page, "en");
  expect((await page.goto(`${publicPath}?lang=en`))?.status()).toBe(404);
});

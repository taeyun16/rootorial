import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/boot-to-shell";
const publicPath = "/curricula/linux-systems/chapters/boot-to-shell";

async function signInAsAdmin(page: Parameters<typeof signInTestUser>[0]) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function collectConsoleErrors(page: Parameters<typeof signInTestUser>[0]) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

async function completeBootContract(page: Parameters<typeof signInTestUser>[0]) {
  const lab = page.locator(".boot-sequence-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const runButton = lab.getByRole("button", { name: "이 설정으로 부팅 실행" });
  const prediction = lab.getByRole("group", { name: "실행 전 예측 · 이 설정은 어디까지 갈까요?" });
  await expect(runButton).toBeDisabled();
  await prediction.getByRole("button", { name: "커널에서 중단" }).click();
  await runButton.click();
  await expect(lab.getByText("예측을 다시 보세요", { exact: true })).toBeVisible();
  await prediction.getByRole("button", { name: "펌웨어에서 중단" }).click();
  await runButton.click();
  await expect(lab.getByText("예측이 맞았습니다", { exact: true })).toBeVisible();
  await expect(lab.locator('[data-stage-state="failed"]')).toContainText("펌웨어");
  await expect(lab.getByText("마지막 실패 표식을 읽고 원인이 된 설정 하나를 바꾼 뒤 다시 실행하세요.")).toBeVisible();
  await lab.getByRole("group", { name: "펌웨어 다음 대상" })
    .getByRole("button", { name: "buildroot-bzimage68.bin" }).click();
  await expect(runButton).toBeDisabled();
  await prediction.getByRole("button", { name: "정상 프롬프트 도달" }).click();
  await runButton.click();
  await expect(lab.getByText("필수 실습 완료 — 실패한 인계를 고쳐 네 단계 모두 프롬프트까지 연결했습니다.")).toBeVisible();
  await expect(lab.locator(".boot-stage-timeline .is-passed")).toHaveCount(4);
}

test("completes both boot activities in the admin draft preview without saving progress", async ({ page }) => {
  test.setTimeout(120_000);
  const bootAssetRequests: string[] = [];
  const consoleErrors = collectConsoleErrors(page);
  page.on("request", (request) => {
    if (request.url().includes("/api/experiments/linux-assets/")) {
      bootAssetRequests.push(request.url());
    }
  });

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 02. 전원이 켜지고 셸이 뜨기까지 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "전원이 켜지고 셸이 뜨기까지" })).toBeVisible();
  await expect(page.getByText("필수 실습 · BOOT CONTRACT", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · LAST GOOD MARKER", { exact: true })).toBeVisible();

  await completeBootContract(page);
  const sequenceLab = page.locator(".boot-sequence-lab");
  await sequenceLab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(sequenceLab.locator(".boot-lab-progress strong")).toHaveText("0 / 4");
  await completeBootContract(page);

  const missions = page.locator(".boot-failure-mission");
  const answers = [
    ["펌웨어 → 커널 인계", "커널 이미지 연결"],
    ["커널의 rootfs 마운트", "올바른 rootfs 제공"],
    ["커널 → init 인계", "/sbin/init 복구"],
    ["init → 콘솔 셸 인계", "init이 콘솔 셸을 시작하도록 구성"],
  ] as const;

  await expect(missions).toHaveCount(4);
  const firstMission = missions.nth(0);
  await firstMission.getByRole("group", { name: "가장 이른 고장 경계" })
    .getByRole("button", { name: "커널의 rootfs 마운트" }).click();
  await firstMission.getByRole("group", { name: "가장 작은 복구 조치" })
    .getByRole("button", { name: "커널 이미지 연결" }).click();
  await firstMission.getByRole("button", { name: "진단 확인" }).click();
  await expect(firstMission.getByText("표식을 다시 읽어 보세요", { exact: true })).toBeVisible();
  await expect(firstMission).toHaveClass(/is-incorrect/);

  for (let index = 0; index < answers.length; index += 1) {
    const mission = missions.nth(index);
    await mission.getByRole("group", { name: "가장 이른 고장 경계" })
      .getByRole("button", { name: answers[index][0] }).click();
    await mission.getByRole("group", { name: "가장 작은 복구 조치" })
      .getByRole("button", { name: answers[index][1] }).click();
    await mission.getByRole("button", { name: "진단 확인" }).click();
    await expect(mission).toHaveClass(/is-correct/);
  }
  await expect(page.locator(".boot-failure-progress strong")).toHaveText("4 / 4");

  for (const answer of [
    "실행할 커널 이미지",
    "커널은 실행됐지만 사용자 공간은 아직",
    "init이 직렬 콘솔 셸을 시작하는지",
    "init",
    "마운트된 rootfs에서 init 실행",
  ]) {
    await page.getByRole("button", { name: answer, exact: true }).click();
  }
  await page.getByRole("button", { name: "부팅 흐름 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 이제 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  const previewCompleteButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(previewCompleteButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(bootAssetRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px and the public URL closed", async ({ page }) => {
  const bootAssetRequests: string[] = [];
  const consoleErrors = collectConsoleErrors(page);
  page.on("request", (request) => {
    if (request.url().includes("/api/experiments/linux-assets/")) {
      bootAssetRequests.push(request.url());
    }
  });

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${previewPath}?lang=en`);
  await expect(page.getByRole("heading", { name: "From Power-On to a Shell" })).toBeVisible();

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
      if (/[가-힣]/.test(value)) rows.push(value);
    }
    return rows;
  });
  expect(untranslated).toEqual([]);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(1);
  await expect(page.locator("select")).toHaveCount(0);

  const targetSizes = await page.locator(".lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary").evaluateAll(
    (elements) => elements
      .map((element) => element.getBoundingClientRect())
      .filter(({ width, height }) => width > 0 && height > 0)
      .map(({ width, height }) => ({ width, height })),
  );
  expect(targetSizes.length).toBeGreaterThan(0);
  expect(targetSizes.every(({ width, height }) => width >= 44 && height >= 44)).toBe(true);

  const kernelTarget = page.getByRole("group", { name: "Target after firmware" });
  await expect(page.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const missingRootPreset = page.getByRole("button", { name: "Missing rootfs" });
  await missingRootPreset.focus();
  await missingRootPreset.press("Enter");
  await expect(kernelTarget.getByRole("button", { name: "buildroot-bzimage68.bin" }))
    .toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("group", { name: "Root mounted by the kernel" })
    .getByRole("button", { name: "Unavailable rootfs" }))
    .toHaveAttribute("aria-pressed", "true");
  const resetLab = page.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(kernelTarget.getByRole("button", { name: "No kernel attached" }))
    .toHaveAttribute("aria-pressed", "true");

  const mobileMissions = page.locator(".boot-failure-mission");
  await expect(mobileMissions).toHaveCount(4);
  const firstMission = mobileMissions.nth(0);
  await firstMission.getByRole("group", { name: "Earliest failed boundary" })
    .getByRole("button", { name: "Kernel rootfs mount" }).click();
  await firstMission.getByRole("group", { name: "Smallest repair" })
    .getByRole("button", { name: "Attach the kernel image" }).click();
  await firstMission.getByRole("button", { name: "Check diagnosis" }).click();
  await expect(firstMission.getByText("Read the markers again", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset incidents" }).click();
  await expect(firstMission.locator('[aria-pressed="true"]')).toHaveCount(0);

  expect(bootAssetRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
});

test("offers the deterministic activity when WebAssembly is unavailable", async ({ page }) => {
  const bootAssetRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/experiments/linux-assets/")) {
      bootAssetRequests.push(request.url());
    }
  });

  await signInAsAdmin(page);
  await page.addInitScript(() => {
    Object.defineProperty(globalThis, "WebAssembly", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto(`${previewPath}?lang=en`);

  const fallback = page.locator(".linux-runtime-fallback");
  await expect(fallback).toHaveAttribute("role", "alert");
  await expect(fallback).toContainText("This browser does not support WebAssembly");
  await expect(page.getByRole("button", { name: "Start Linux boot" })).toBeDisabled();
  const fallbackLink = fallback.getByRole("link", {
    name: "Return to the deterministic, network-free fallback activity →",
  });
  await expect(fallbackLink).toHaveAttribute("href", "#diagnose");
  await fallbackLink.click();
  await expect(page).toHaveURL(/#diagnose$/);
  await expect(page.locator("#diagnose")).toBeVisible();
  expect(bootAssetRequests).toEqual([]);
});

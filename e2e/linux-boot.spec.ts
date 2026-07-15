import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/boot-to-shell";
const publicPath = "/curricula/linux-systems/chapters/boot-to-shell";

async function signInAsAdmin(page: Parameters<typeof signInTestUser>[0]) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

async function completeBootContract(page: Parameters<typeof signInTestUser>[0]) {
  const lab = page.locator(".boot-sequence-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const runButton = lab.getByRole("button", { name: "이 설정으로 부팅 실행" });
  const prediction = lab.getByRole("combobox", { name: "예상 부팅 결과" });
  await expect(runButton).toBeDisabled();
  await prediction.selectOption("kernel");
  await runButton.click();
  await expect(lab.getByText("예측을 다시 보세요", { exact: true })).toBeVisible();
  await prediction.selectOption("firmware");
  await runButton.click();
  await expect(lab.getByText("예측이 맞았습니다", { exact: true })).toBeVisible();
  await expect(lab.locator('[data-stage-state="failed"]')).toContainText("펌웨어");
  await expect(lab.getByText("마지막 실패 표식을 읽고 원인이 된 설정 하나를 바꾼 뒤 다시 실행하세요.")).toBeVisible();
  await lab.getByRole("combobox", { name: "펌웨어 다음 대상" }).selectOption("buildroot-kernel");
  await expect(runButton).toBeDisabled();
  await prediction.selectOption("prompt");
  await runButton.click();
  await expect(lab.getByText("필수 실습 완료 — 실패한 인계를 고쳐 네 단계 모두 프롬프트까지 연결했습니다.")).toBeVisible();
  await expect(lab.locator(".boot-stage-timeline .is-passed")).toHaveCount(4);
}

test("completes both boot activities in the admin draft preview without saving progress", async ({ page }) => {
  test.setTimeout(120_000);
  const bootAssetRequests: string[] = [];
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
    ["firmware-to-kernel", "attach-kernel"],
    ["kernel-rootfs", "provide-rootfs"],
    ["kernel-to-init", "restore-init"],
    ["init-to-shell", "start-console-shell"],
  ] as const;

  const firstMission = missions.nth(0);
  await firstMission.getByRole("combobox", { name: "가장 이른 고장 경계" }).selectOption("kernel-rootfs");
  await firstMission.getByRole("combobox", { name: "가장 작은 복구 조치" }).selectOption("attach-kernel");
  await firstMission.getByRole("button", { name: "진단 확인" }).click();
  await expect(firstMission.getByText("표식을 다시 읽어 보세요", { exact: true })).toBeVisible();
  await expect(firstMission).toHaveClass(/is-incorrect/);

  for (let index = 0; index < answers.length; index += 1) {
    const mission = missions.nth(index);
    await mission.getByRole("combobox", { name: "가장 이른 고장 경계" }).selectOption(answers[index][0]);
    await mission.getByRole("combobox", { name: "가장 작은 복구 조치" }).selectOption(answers[index][1]);
    await mission.getByRole("button", { name: "진단 확인" }).click();
    await expect(mission).toHaveClass(/is-correct/);
  }
  await expect(page.locator(".boot-failure-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="firmware-handoff"][value="kernel-image"]').check();
  await page.locator('input[name="kernel-userspace-boundary"][value="kernel-only"]').check();
  await page.locator('input[name="shell-origin"][value="init-starts-shell"]').check();
  await page.locator('input[name="pid-one"][value="init"]').check();
  await page.getByRole("button", { name: "부팅 흐름 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 이제 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  const previewCompleteButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(previewCompleteButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(bootAssetRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px and the public URL closed", async ({ page }) => {
  const bootAssetRequests: string[] = [];
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

  const kernelSelect = page.getByRole("combobox", { name: "Target after firmware" });
  await expect(page.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const missingRootPreset = page.getByRole("button", { name: "Missing rootfs" });
  await missingRootPreset.focus();
  await missingRootPreset.press("Enter");
  await expect(kernelSelect).toHaveValue("buildroot-kernel");
  await expect(page.getByRole("combobox", { name: "Root mounted by the kernel" })).toHaveValue("unavailable");
  const resetLab = page.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(kernelSelect).toHaveValue("missing");

  const firstMission = page.locator(".boot-failure-mission").first();
  await firstMission.getByRole("combobox", { name: "Earliest failed boundary" }).selectOption("kernel-rootfs");
  await firstMission.getByRole("combobox", { name: "Smallest repair" }).selectOption("attach-kernel");
  await firstMission.getByRole("button", { name: "Check diagnosis" }).click();
  await expect(firstMission.getByText("Read the markers again", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Reset incidents" }).click();
  await expect(firstMission.getByRole("combobox", { name: "Earliest failed boundary" })).toHaveValue("");

  expect(bootAssetRequests).toEqual([]);
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

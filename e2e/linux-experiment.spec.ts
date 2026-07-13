import { expect, test } from "@playwright/test";

test("runs the guided Linux shell and updates the visible filesystem", async ({ page }) => {
  await page.goto("/experiments/linux");

  await expect(page.getByRole("heading", { name: /Linux를.*브라우저 안에서.*바닥부터/ })).toBeVisible();
  await expect(page.getByText("교육용 시뮬레이터 · 실제 Linux 아님")).toBeVisible();
  await expect(page.locator(".linux-capability-card")).toContainText("사용 가능", { timeout: 20_000 });

  const input = page.getByLabel("교육용 Linux 명령 입력");
  const run = page.locator(".linux-terminal-form").getByRole("button", { name: "실행" });
  await input.fill("pwd");
  await run.click();
  await expect(page.locator(".linux-terminal-entry").last()).toContainText("/home/student");

  await input.fill("mkdir -p lab");
  await run.click();
  await expect(page.getByRole("button", { name: "디렉터리: /home/student/lab", exact: true })).toBeVisible();

  await input.fill('echo "absolute paths start at /" > lab/notes.txt');
  await run.click();
  await page.getByRole("button", { name: "파일: /home/student/lab/notes.txt", exact: true }).click();
  await expect(page.locator(".linux-file-preview")).toContainText("absolute paths start at /");

  await page.getByRole("button", { name: "처음 상태로" }).click();
  await expect(page.getByRole("button", { name: "디렉터리: /home/student/lab", exact: true })).toHaveCount(0);
  await expect(page.locator(".linux-terminal-entry")).toHaveCount(0);
});

test("cancels a stalled Linux asset download without leaving a stale VM", async ({ page }) => {
  let releaseKernel!: () => void;
  let markKernelRequested!: () => void;
  const kernelGate = new Promise<void>((resolve) => { releaseKernel = resolve; });
  const kernelRequested = new Promise<void>((resolve) => { markKernelRequested = resolve; });

  await page.route("**/api/experiments/linux-assets/**", async (route) => {
    if (route.request().url().endsWith("buildroot-bzimage68.bin")) {
      markKernelRequested();
      await kernelGate;
    }
    try {
      await route.fulfill({
        status: 200,
        contentType: "application/octet-stream",
        body: Buffer.from([0]),
      });
    } catch {
      // The expected AbortController cancellation can close the route first.
    }
  });

  await page.goto("/experiments/linux");
  await expect(page.locator(".linux-capability-card")).toContainText("사용 가능", { timeout: 20_000 });
  const runtime = page.locator(".linux-runtime-card-v86");
  const runtimeState = runtime.locator(".linux-runtime-state");
  await runtime.getByRole("button", { name: "Linux 부팅 시작" }).click();
  await kernelRequested;
  await expect(runtimeState).toContainText("런타임 내려받는 중");
  await runtime.getByRole("button", { name: "부팅 취소" }).click();
  await expect(runtimeState).toContainText("중지됨");
  await expect(runtime.getByRole("button", { name: "Linux 다시 시작" })).toBeVisible();
  releaseKernel();
});

test("boots Buildroot through v86 and accepts real serial commands", async ({ page }) => {
  test.skip(!process.env.RUN_V86_E2E, "Opt in because this test downloads the external kernel assets.");
  test.setTimeout(90_000);

  await page.goto("/experiments/linux");
  await expect(page.locator(".linux-capability-card")).toContainText("사용 가능", { timeout: 20_000 });

  const runtime = page.locator(".linux-runtime-card-v86");
  const runtimeState = runtime.locator(".linux-runtime-state");
  await runtime.scrollIntoViewIfNeeded();
  await runtime.getByRole("button", { name: "Linux 부팅 시작" }).click();
  await expect(runtimeState).toContainText("셸 준비 완료", { timeout: 60_000 });
  await expect(runtime).toContainText("부팅 시간");

  const input = runtime.getByLabel("실제 Linux 명령");
  const run = runtime.getByRole("button", { name: "실행" });
  await input.fill("uname -a");
  await run.click();
  await expect(runtime.locator(".v86-terminal-output")).toContainText(/Linux .* i686 GNU\/Linux/, { timeout: 10_000 });

  await input.fill("mount");
  await run.click();
  await expect(runtime.locator(".v86-terminal-output")).toContainText("/proc type proc", { timeout: 10_000 });

  await runtime.getByRole("button", { name: "다시 부팅" }).click();
  await expect(runtimeState).toContainText("셸 준비 완료", { timeout: 45_000 });
  await runtime.getByRole("button", { name: "중지" }).click();
  await expect(runtimeState).toContainText("중지됨");
  await expect(runtime.getByRole("button", { name: "Linux 다시 시작" })).toBeVisible();
});

import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/processes-and-signals";
const publicPath = "/curricula/linux-systems/chapters/processes-and-signals";

type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchOptionalRuntimeRequests(page: TestPage) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url().toLowerCase();
    if (
      url.includes("/api/experiments/linux-assets/")
      || url.includes("/pyodide-worker.js")
      || url.includes("cdn.jsdelivr.net/pyodide")
      || url.endsWith(".wasm")
    ) requests.push(request.url());
  });
  return requests;
}

async function completeProcessLifecycle(page: TestPage) {
  const lab = page.locator(".process-lifecycle-lab");
  const spawnPrediction = lab.getByRole("combobox", { name: "fork 뒤 자식이 exec하면?" });
  const spawnButton = lab.getByRole("button", { name: "fork → exec 실행" });
  const tickPrediction = lab.getByRole("combobox", { name: "다음 worker PID" });
  const runTick = lab.getByRole("button", { name: "worker queue 1 tick 실행" });
  const target = lab.getByRole("combobox", { name: "대상 자식" });
  const signal = lab.getByRole("combobox", { name: "signal" });
  const sendSignal = lab.getByRole("button", { name: "signal 보내기" });
  const waitpid = lab.getByRole("button", { name: "waitpid" });

  await spawnPrediction.selectOption("new-child-same-pid");
  await spawnButton.click();
  await expect(lab.getByText(/fork가 새 자식을 만들었습니다\(PID 73\).*exec는 그 PID를 유지/)).toBeVisible();

  await lab.getByRole("button", { name: "redirected → out.log" }).click();
  await spawnPrediction.selectOption("new-child-same-pid");
  await spawnButton.click();
  await expect(lab.getByRole("button", { name: "자식 2개 생성됨" })).toBeDisabled();

  await tickPrediction.selectOption("73");
  await runTick.click();
  await expect(lab.getByText("worker[73] tick 1", { exact: true })).toBeVisible();
  await tickPrediction.selectOption("74");
  await runTick.click();
  await expect(lab.getByText("worker[74] tick 1", { exact: true })).toBeVisible();

  await target.selectOption("73");
  await signal.selectOption("SIGSTOP");
  await sendSignal.click();
  await expect(lab.locator(".process-live-feedback")).toContainText("PID 73: T 상태로 정지했습니다.");

  await tickPrediction.selectOption("74");
  await runTick.click();
  await signal.selectOption("SIGCONT");
  await sendSignal.click();
  await tickPrediction.selectOption("73");
  await runTick.click();

  await signal.selectOption("SIGTERM");
  await sendSignal.click();
  await expect(lab.locator(".process-live-feedback")).toContainText("PID 73: SIGTERM을 처리해 정리한 뒤 Z 상태");
  await waitpid.click();
  await expect(target).toHaveValue("74");

  await sendSignal.click();
  await waitpid.click();
  await expect(lab.getByText("필수 실습 완료", { exact: true })).toBeVisible();
  await expect(lab.locator(".process-evidence-checklist .is-complete")).toHaveCount(7);
}

async function runIncidentAction(
  incident: ReturnType<TestPage["locator"]>,
  action: string,
) {
  await incident.getByRole("combobox", { name: "프로세스 동작" }).selectOption(action);
  await incident.getByRole("button", { name: "동작 실행·상태 판정" }).click();
}

test("completes process lifecycle, state incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const optionalRuntimeRequests = watchOptionalRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 03. 프로세스와 시그널 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "프로세스와 시그널" })).toBeVisible();
  await expect(page.getByText("필수 실습 · PROCESS LIFECYCLE", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · STATE DEBUGGER", { exact: true })).toBeVisible();

  const lifecycle = page.locator(".process-lifecycle-lab");
  await expect(lifecycle.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  await lifecycle.getByRole("combobox", { name: "fork 뒤 자식이 exec하면?" }).selectOption("shell-replaced");
  await lifecycle.getByRole("button", { name: "fork → exec 실행" }).click();
  await expect(lifecycle.getByText(/실제 결과는 새 자식 PID 73 하나입니다/)).toBeVisible();
  await lifecycle.getByRole("button", { name: "실습 초기화" }).click();
  await expect(lifecycle.locator(".process-evidence-checklist .is-complete")).toHaveCount(0);
  await completeProcessLifecycle(page);

  const incidents = page.locator(".process-incident-card");
  const stopped = incidents.nth(0);
  await runIncidentAction(stopped, "waitpid");
  await expect(stopped.locator(".process-incident-feedback")).toContainText("상태를 다시 읽으세요");
  await expect(stopped.locator(".process-incident-feedback")).toContainText("아직 종료하지 않아 waitpid로 거둘 수 없습니다");
  await expect(stopped).toHaveClass(/is-incorrect/);
  await runIncidentAction(stopped, "SIGCONT");
  await runIncidentAction(stopped, "tick");
  await expect(stopped).toHaveClass(/is-correct/);

  const sleeping = incidents.nth(1);
  await sleeping.getByRole("textbox", { name: "pipe 입력 데이터" }).fill("diagnostic");
  await runIncidentAction(sleeping, "feed-pipe");
  await runIncidentAction(sleeping, "tick");
  await expect(sleeping).toHaveClass(/is-correct/);

  const zombie = incidents.nth(2);
  await runIncidentAction(zombie, "waitpid");
  await expect(zombie).toHaveClass(/is-correct/);

  const resistant = incidents.nth(3);
  await runIncidentAction(resistant, "SIGTERM");
  await expect(resistant.locator(".process-incident-feedback")).toContainText("SIGTERM을 무시해 계속 실행 가능합니다");
  await expect(resistant).toHaveClass(/is-incorrect/);
  await runIncidentAction(resistant, "SIGKILL");
  await runIncidentAction(resistant, "waitpid");
  await expect(resistant).toHaveClass(/is-correct/);
  await expect(page.locator(".process-incident-progress strong")).toHaveText("4 / 4");

  await page.locator('input[name="program-vs-process"][value="same-program-distinct-processes"]').check();
  await page.locator('input[name="fork-exec-pid"][value="exec-replaces-image-keeps-pid"]').check();
  await page.locator('input[name="stdio-redirection"][value="redirects-stdout-only"]').check();
  await page.locator('input[name="signal-choice"][value="term-before-kill"]').check();
  await page.locator('input[name="wait-reaps-child"][value="zombie-until-wait"]').check();
  await page.getByRole("button", { name: "프로세스 수명주기 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".process-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(optionalRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px with no runtime or public access", async ({ page }) => {
  const optionalRuntimeRequests = watchOptionalRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Processes and Signals" })).toBeVisible();

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

  const horizontalOverflow = () => page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const lifecycle = page.locator(".process-lifecycle-lab");
  await expect(lifecycle.locator('[data-interactive-ready="true"]')).toHaveCount(1, {
    timeout: 30_000,
  });
  const filePreset = lifecycle.getByRole("button", { name: "redirected → out.log" });
  await filePreset.focus();
  await filePreset.press("Enter");
  await expect(lifecycle.getByRole("combobox", { name: "Child stdout · fd 1" })).toHaveValue("file");
  const resetLab = lifecycle.getByRole("button", { name: "Reset lab" });
  await resetLab.focus();
  await resetLab.press("Enter");
  await expect(lifecycle.getByRole("combobox", { name: "Child stdout · fd 1" })).toHaveValue("terminal");

  const firstIncident = page.locator(".process-incident-card").first();
  await firstIncident.getByRole("combobox", { name: "Process action" }).selectOption("waitpid");
  await firstIncident.getByRole("button", { name: "Run action and grade state" }).click();
  await expect(firstIncident.locator(".process-incident-feedback")).toContainText("Read the state again");
  const resetIncidents = page.getByRole("button", { name: "Reset all incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(firstIncident.getByRole("combobox", { name: "Process action" })).toHaveValue("");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  expect(optionalRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(optionalRuntimeRequests).toEqual([]);
});

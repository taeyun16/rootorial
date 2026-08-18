import { expect, test, type Locator } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/assemble-a-tiny-linux";
const publicPath = "/curricula/linux-systems/chapters/assemble-a-tiny-linux";

type TestPage = Parameters<typeof signInTestUser>[0];
type Locale = "ko" | "en";

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
      path.includes("/api/experiments/linux-assets/")
      || path.includes("/node_modules/.vite/deps/v86")
      || path.includes("/node_modules/v86/")
      || path.includes("pyodide")
      || /\.(?:wasm|onnx)$/.test(path)
    ) requests.push(request.url());
  });
  return requests;
}

function collectConsoleErrors(page: TestPage) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function choose(scope: Locator, groupName: string, optionName: string) {
  const option = scope
    .getByRole("group", { name: groupName, exact: true })
    .getByRole("button", { name: optionName, exact: true });
  await option.click();
  await expect(option).toHaveAttribute("aria-pressed", "true");
}

async function activate(control: ReturnType<TestPage["getByRole"]>, useKeyboard: boolean) {
  if (useKeyboard) {
    await control.focus();
    await control.press("Enter");
  } else {
    await control.click();
  }
}

async function completeAssembly(
  page: TestPage,
  locale: Locale,
  useKeyboard = false,
) {
  const isKo = locale === "ko";
  const lab = page.locator(".tiny-system-assembly-lab");
  const run = lab.getByRole("button", {
    name: isKo ? "부팅·요청 실행하고 판정" : "Run boot and request, then grade",
  });

  await choose(lab, isKo ? "다음 stop code" : "Next stop code", isKo ? "/init 실행 bit가 없음" : "/init has no execute bit");
  await activate(run, useKeyboard);
  await expect(lab.locator(".tiny-system-attempt strong")).toHaveText("init-not-executable");
  await expect(lab.locator(".tiny-system-live-feedback")).toContainText(
    isKo ? "예측이 맞았습니다: /init 실행 bit가 없음" : "Prediction correct: /init has no execute bit",
  );

  await choose(lab, "/init mode", "0755 · rwxr-xr-x");
  await choose(lab, isKo ? "다음 stop code" : "Next stop code", isKo ? "SYN-ACK return route가 없음" : "The SYN-ACK has no return route");
  await activate(run, useKeyboard);
  await expect(lab.locator(".tiny-system-attempt strong")).toHaveText("synack-no-return-route");

  await choose(lab, isKo ? "default return route" : "Default return route", "default via 10.0.0.1");
  await choose(lab, isKo ? "다음 stop code" : "Next stop code", isKo ? "report file group read 거부" : "Group read of the report file is denied");
  await activate(run, useKeyboard);
  await expect(lab.locator(".tiny-system-attempt strong")).toHaveText("report-read-denied");

  await choose(lab, "/srv/report.txt mode", "0640 · group read");
  await choose(lab, isKo ? "다음 stop code" : "Next stop code", isKo ? "remote recv까지 18 byte 전달" : "All 18 bytes reach remote recv");
  await activate(run, useKeyboard);
  await expect(lab.locator(".tiny-system-attempt strong")).toHaveText("served");
  await expect(lab.locator(".tiny-system-live-feedback")).toContainText(
    isKo
      ? "예측이 맞았습니다. 이제 다섯 probe를 직접 열어 경계별 증거를 수집하세요."
      : "Prediction correct. Now open all five probes and collect boundary-specific evidence.",
  );

  const explorer = lab.getByRole("tablist", {
    name: isKo ? "작은 Linux readiness probe 단계" : "Tiny Linux readiness probe stages",
  });
  const tabs = explorer.getByRole("tab");
  await expect(tabs).toHaveCount(5);
  const probes = [
    "boot log · ls -l /init",
    "ps · cat /proc/1/status · mount",
    "ip address · ip route get · ss -lntp",
    "id · namei -l · open/read trace",
    "accept/send trace · peer recv",
  ];
  const panel = lab.locator(".tiny-system-inspection-panel");
  for (let index = 0; index < probes.length; index += 1) {
    await activate(tabs.nth(index), useKeyboard);
    await expect(panel).toContainText(probes[index]);
    const record = panel.getByRole("button", {
      name: isKo ? "probe 실행·증거 기록" : "Run probe and record evidence",
    });
    await activate(record, useKeyboard);
    await expect(panel.getByRole("button", {
      name: isKo ? "이 실행에 기록됨" : "Recorded for this run",
    })).toBeDisabled();
  }

  await expect(lab.locator(".tiny-system-assembly-evidence .is-complete")).toHaveCount(5);
  await expect(lab.locator(".tiny-system-lab-mastered")).toContainText(
    isKo ? "필수 조립 완료" : "Required assembly complete",
  );
}

async function completeIncidents(
  page: TestPage,
  locale: Locale,
  useKeyboard = false,
) {
  const isKo = locale === "ko";
  const lab = page.locator(".tiny-system-incident-lab");
  const cards = lab.locator(".tiny-system-incident-card");
  await expect(cards).toHaveCount(4);

  const init = cards.nth(0);
  await choose(init, isKo ? "PID 1 경로" : "PID 1 path", "/init");
  await choose(init, isKo ? "기존 kernel 보존" : "Preserve existing kernel", "true");
  await choose(init, isKo ? "기존 initramfs 보존" : "Preserve existing initramfs", "true");
  const initSubmit = init.getByRole("button", {
    name: isKo ? "상태 재계산·진단" : "Recompute state and diagnose",
  });
  if (useKeyboard) {
    await initSubmit.focus();
    await initSubmit.press("Enter");
  } else {
    await initSubmit.click();
  }
  await expect(init).toHaveClass(/is-correct/);

  const supervision = cards.nth(1);
  await choose(supervision, isKo ? "zombie 처리" : "Zombie action", "wait(child)");
  await choose(supervision, isKo ? "서비스 재시작" : "Service restart", "spawn child");
  await supervision.getByRole("spinbutton", {
    name: isKo ? "PID 1 사건 새 PID" : "PID 1 incident new PID",
  }).fill("8");
  await supervision.getByRole("spinbutton", {
    name: isKo ? "PID 1 사건 새 PPID" : "PID 1 incident new PPID",
  }).fill("1");
  await choose(supervision, isKo ? "PID 1 유지" : "PID 1 remains", "true");
  await supervision.getByRole("button", {
    name: isKo ? "상태 재계산·진단" : "Recompute state and diagnose",
  }).click();
  await expect(supervision).toHaveClass(/is-correct/);

  const access = cards.nth(2);
  await choose(access, "reportd UID", "1100 · report");
  await choose(access, "reportd GID", "4000 · report");
  await choose(access, "/srv mode", "0750");
  await choose(access, "report group", "4000 · report");
  await choose(access, "report mode", "0640");
  await access.getByRole("button", {
    name: isKo ? "상태 재계산·진단" : "Recompute state and diagnose",
  }).click();
  await expect(access).toHaveClass(/is-correct/);

  const listener = cards.nth(3);
  await choose(listener, isKo ? "listen 주소" : "Listen address", "0.0.0.0");
  await choose(listener, isKo ? "listen port" : "Listen port", "8080");
  for (const [key, value] of [
    ["listenerFd", "3"],
    ["acceptedFd", "4"],
    ["fileFd", "5"],
    ["sendFd", "4"],
  ] as const) {
    await listener.getByRole("spinbutton", {
      name: `${isKo ? "listener 사건" : "Listener incident"} ${key}`,
    }).fill(value);
  }
  await listener.getByRole("button", {
    name: isKo ? "상태 재계산·진단" : "Recompute state and diagnose",
  }).click();
  await expect(listener).toHaveClass(/is-correct/);
  await expect(lab.locator(".tiny-system-incident-progress strong")).toHaveText("4 / 4");
}

async function completeConceptChecks(
  page: TestPage,
  locale: Locale,
  useKeyboard = false,
) {
  const isKo = locale === "ko";
  const questions = page.locator(".concept-question");
  const correctAnswers = isKo
    ? [/initramfs manifest에 \/init/, /필요한 filesystem mount/, /reportd의 egid/, /mount·credentials/, /고정 guest의 실제 kernel/]
    : [/Add \/init and the required userspace/, /Mount required filesystems/, /Give reportd GID 4000/, /Check mounts, credentials/, /It lets us compare real kernel/];
  for (let index = 0; index < correctAnswers.length; index += 1) {
    await questions.nth(index).getByRole("button", { name: correctAnswers[index] }).click();
  }
  const submit = page.getByRole("button", {
    name: isKo ? "작은 Linux 계약 확인하기" : "Check the tiny-Linux contracts",
  });
  if (useKeyboard) {
    await submit.focus();
    await submit.press("Enter");
  } else {
    await submit.click();
  }
  await expect(page.getByText(
    isKo
      ? "이해 확인 완료 — 조립 실습과 사건 진단의 완료 상태를 확인하세요."
      : "Concept check complete — now confirm the assembly and incident activity states.",
  )).toBeVisible();
}

test("completes assembly, incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));

  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 08. 작은 Linux 조립하기 · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "kernel image와 rootfs artifact를 구분하고 PID 1의 mount·최소 권한 service·network 순서를 조립한 뒤, 경계별 증거로 reportd readiness를 진단합니다.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.getByRole("heading", { name: "작은 Linux 조립하기" })).toBeVisible();
  await expect(page.getByText("필수 실습 · ASSEMBLE → PREDICT → PROBE", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · CROSS-LAYER INCIDENTS", { exact: true })).toBeVisible();
  await expect(page.locator('.tiny-system-assembly-lab [data-interactive-ready="true"]')).toHaveCount(1);
  await expect(page.locator('.tiny-system-incident-lab [data-interactive-ready="true"]')).toHaveCount(1);
  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(page.locator("select")).toHaveCount(0);

  const firstIncident = page.locator(".tiny-system-incident-card").first();
  await choose(firstIncident, "PID 1 경로", "/sbin/init");
  await choose(firstIncident, "기존 kernel 보존", "true");
  await choose(firstIncident, "기존 initramfs 보존", "true");
  await firstIncident.getByRole("button", { name: "상태 재계산·진단" }).click();
  await expect(firstIncident).toHaveClass(/is-incorrect/);
  await expect(firstIncident.locator(".tiny-system-incident-feedback")).toContainText(
    "initramfs manifest에는 /init만 있습니다",
  );

  await completeAssembly(page, "ko");
  await completeIncidents(page, "ko");
  const conceptQuestions = page.locator(".concept-question");
  await conceptQuestions.nth(0).getByRole("button", { name: /kernel config에서 init/ }).click();
  await conceptQuestions.nth(1).getByRole("button", { name: /필요한 filesystem mount/ }).click();
  await conceptQuestions.nth(2).getByRole("button", { name: /reportd의 egid/ }).click();
  await conceptQuestions.nth(3).getByRole("button", { name: /mount·credentials/ }).click();
  await conceptQuestions.nth(4).getByRole("button", { name: /고정 guest의 실제 kernel/ }).click();
  await page.getByRole("button", { name: "작은 Linux 계약 확인하기" }).click();
  await expect(conceptQuestions.nth(0)).toContainText("artifact, PID 1, 권한과 readiness 증거를 다시 나누세요");
  await expect(page.locator(".tiny-system-completion-checklist .is-complete")).toHaveCount(2);
  await completeConceptChecks(page, "ko");
  await expect(page.locator(".tiny-system-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  await expect(page.getByRole("button", { name: "Linux 부팅 시작" })).toBeEnabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("keeps the complete English capstone keyboard-usable at 390px before optional runtime starts", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAsAdmin(page);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 08. Assemble a Tiny Linux System · Rootorial");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "Separate kernel-image and rootfs artifacts, assemble PID 1's mounts, least-privilege service, and network order, then diagnose reportd readiness with evidence at each boundary.",
  );
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.getByRole("heading", { name: "Assemble a Tiny Linux System" })).toBeVisible();
  await expect(page.locator('.tiny-system-assembly-lab [data-interactive-ready="true"]')).toHaveCount(1);
  await expect(page.locator('.tiny-system-incident-lab [data-interactive-ready="true"]')).toHaveCount(1);
  const completionButton = page.getByRole("button", { name: "Completion is disabled in preview" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");
  await expect(page.locator("select")).toHaveCount(0);

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

  const resetAssembly = page.locator(".tiny-system-assembly-lab").getByRole("button", {
    name: /Reset required lab/,
  });
  expect(await resetAssembly.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await resetAssembly.focus();
  await resetAssembly.press("Enter");
  await expect(page.locator(".tiny-system-assembly-lab")
    .getByRole("group", { name: "/init mode", exact: true })
    .getByRole("button", { name: "0644 · rw-r--r--", exact: true }))
    .toHaveAttribute("aria-pressed", "true");
  const resetIncidents = page.locator(".tiny-system-incident-lab").getByRole("button", { name: "Reset incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(page.locator(".tiny-system-incident-progress strong")).toHaveText("0 / 4");

  await completeAssembly(page, "en", true);
  await completeIncidents(page, "en", true);
  await completeConceptChecks(page, "en", true);
  await expect(page.locator(".tiny-system-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(page.getByRole("button", { name: "Start Linux boot" })).toBeEnabled();

  const undersizedTargets = await page
    .locator('.lesson-article button:not([disabled]), .lesson-article a[href], .lesson-article summary, .lesson-article input:not([disabled])')
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

  const horizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(horizontalOverflow).toBeLessThanOrEqual(1);
  const overflowingTinySystemSurfaces = await page.locator('[class*="tiny-system-"]').evaluateAll(
    (elements) => elements
      .filter((element) => element.scrollWidth - element.clientWidth > 1)
      .map((element) => element.className),
  );
  expect(overflowingTinySystemSurfaces).toEqual([]);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/memory-and-virtual-addresses";
const publicPath = "/curricula/linux-systems/chapters/memory-and-virtual-addresses";

type TestPage = Parameters<typeof signInTestUser>[0];

async function signInAsAdmin(page: TestPage) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchHeavyRuntimeRequests(page: TestPage) {
  const requests: string[] = [];
  page.on("request", (request) => {
    const url = request.url().toLowerCase();
    if (
      url.includes("/api/experiments/linux-assets/")
      || url.includes("/pyodide-worker.js")
      || url.includes("cdn.jsdelivr.net/pyodide")
      || url.includes("/v86/")
      || /\.(?:wasm|onnx)(?:\?|$)/.test(url)
    ) requests.push(request.url());
  });
  return requests;
}

async function completeMemoryLab(page: TestPage) {
  const lab = page.locator(".virtual-memory-lab");
  const prediction = lab.getByRole("combobox", { name: "접근 결과 예측" });
  const run = lab.getByRole("button", { name: "CPU 접근 실행·판정" });

  await prediction.selectOption("mapped");
  await run.click();
  await expect(lab.locator(".memory-live-feedback")).toContainText("예측이 맞았습니다");
  await expect(lab.locator(".memory-evidence .is-complete")).toHaveCount(2);

  await lab.getByRole("button", { name: "2. COW 쓰기" }).click();
  await prediction.selectOption("cow-copy");
  await run.click();
  await expect(lab.locator(".memory-live-feedback")).toContainText("자식 전용 프레임");
  await expect(lab.locator(".memory-isolation-proof")).toContainText("격리 증명");
  await expect(lab.locator(".memory-evidence .is-complete")).toHaveCount(4);

  await lab.getByRole("button", { name: "3. demand page" }).click();
  await prediction.selectOption("demand-zero");
  await run.click();
  await expect(lab.locator(".memory-live-feedback")).toContainText("private zero-filled page 할당");
  await expect(lab.locator(".memory-evidence .is-complete")).toHaveCount(5);
  await expect(lab.getByText("필수 실습 완료", { exact: false })).toBeVisible();
}

async function completeMemoryIncidents(page: TestPage) {
  const incidents = page.locator(".memory-debug-card");
  await expect(incidents).toHaveCount(4);

  const translation = incidents.nth(0);
  await translation.getByRole("textbox", { name: "translation 사건 VPN" }).fill("0x2");
  await translation.getByRole("textbox", { name: "translation 사건 offset" }).fill("0x0");
  await translation.getByRole("textbox", { name: "translation 사건 물리 주소" }).fill("0x9000");
  await translation.getByRole("button", { name: "계산 실행·진단" }).click();
  await expect(translation).toHaveClass(/is-incorrect/);
  await expect(translation.locator(".memory-debug-feedback")).toContainText("0xabc");
  await translation.getByRole("textbox", { name: "translation 사건 offset" }).fill("0xabc");
  await translation.getByRole("textbox", { name: "translation 사건 물리 주소" }).fill("0x9abc");
  await translation.getByRole("button", { name: "계산 실행·진단" }).click();
  await expect(translation).toHaveClass(/is-correct/);

  const tlb = incidents.nth(1);
  await tlb.getByRole("combobox", { name: "TLB 사건 PTE 상태" }).selectOption("present");
  await tlb.getByRole("combobox", { name: "TLB miss 다음 동작" }).selectOption("page-table-walk");
  await tlb.getByRole("button", { name: "trace 실행·진단" }).click();
  await expect(tlb).toHaveClass(/is-correct/);

  const cow = incidents.nth(2);
  await cow.getByRole("spinbutton", { name: "COW 부모 frame" }).fill("7");
  await cow.getByRole("spinbutton", { name: "COW 자식 frame" }).fill("12");
  await cow.getByRole("spinbutton", { name: "COW 부모 값" }).fill("41");
  await cow.getByRole("spinbutton", { name: "COW 자식 값" }).fill("99");
  await cow.getByRole("button", { name: "PTE 수리·검증" }).click();
  await expect(cow).toHaveClass(/is-correct/);

  const maps = incidents.nth(3);
  await maps.getByRole("spinbutton", { name: "maps 사건 mapped page 수" }).fill("6");
  await maps.getByRole("spinbutton", { name: "maps 사건 resident page 수" }).fill("3");
  await maps.getByRole("combobox", { name: "maps와 residency 결론" }).selectOption("mapped-not-resident");
  await maps.getByRole("button", { name: "수치 감사·진단" }).click();
  await expect(maps).toHaveClass(/is-correct/);
  await expect(page.locator(".memory-debug-progress strong")).toHaveText("4 / 4");
}

test("completes translation, four incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 05. 메모리와 가상 주소 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "메모리와 가상 주소" })).toBeVisible();
  await expect(page.getByText("필수 실습 · PAGE TABLE + COW", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · MEMORY INCIDENTS", { exact: true })).toBeVisible();

  const lab = page.locator(".virtual-memory-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  await lab.getByRole("combobox", { name: "접근 결과 예측" }).selectOption("protection-fault");
  await lab.getByRole("button", { name: "CPU 접근 실행·판정" }).click();
  await expect(lab.locator(".memory-live-feedback")).toHaveClass(/is-incorrect/);
  await expect(lab.locator(".memory-live-feedback")).toContainText("실제 결과는 mapped");
  await lab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(lab.getByRole("combobox", { name: "접근 결과 예측" })).toHaveValue("");
  await expect(lab.locator(".memory-evidence .is-complete")).toHaveCount(0);
  await completeMemoryLab(page);

  await completeMemoryIncidents(page);

  await page.locator('input[name="address-translation"][value="vpn-to-frame-offset-unchanged"]').check();
  await page.locator('input[name="process-isolation"][value="same-va-can-map-different-frames"]').check();
  await page.locator('input[name="page-fault"][value="tlb-miss-is-not-page-fault"]').check();
  await page.locator('input[name="region-lifetime"][value="maps-shows-vmas-not-residency"]').check();
  await page.locator('input[name="copy-on-write"][value="first-write-copies-that-page"]').check();
  await page.getByRole("button", { name: "메모리 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".chapter-finish .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px without heavy runtime or public access", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 05. Memory and Virtual Addresses · Rootorial");
  await expect(page.getByRole("heading", { name: "Memory and Virtual Addresses" })).toBeVisible();

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

  const lab = page.locator(".virtual-memory-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const cowPreset = lab.getByRole("button", { name: "2. COW write" });
  expect(await cowPreset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await cowPreset.focus();
  await cowPreset.press("Enter");
  await expect(lab.getByRole("combobox", { name: "Memory operation" })).toHaveValue("write");
  await lab.getByRole("combobox", { name: "Access result prediction" }).selectOption("cow-copy");
  const run = lab.getByRole("button", { name: "Run and evaluate CPU access" });
  await run.focus();
  await run.press("Enter");
  await expect(run).toBeFocused();
  await expect(lab.locator(".memory-live-feedback")).toContainText("Prediction correct");
  const reset = lab.getByRole("button", { name: "Reset lab" });
  await reset.focus();
  await reset.press("Enter");
  await expect(lab.getByRole("combobox", { name: "Access result prediction" })).toHaveValue("");

  const debuggerLab = page.locator(".memory-debugger-lab");
  const resetIncidents = debuggerLab.getByRole("button", { name: "Reset all incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(debuggerLab.locator(".memory-debug-progress strong")).toHaveText("0 / 4");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  const overflowingMemorySurfaces = await page.locator('[class*="memory-"]').evaluateAll(
    (elements) => elements
      .filter((element) => element.scrollWidth - element.clientWidth > 1)
      .map((element) => element.className),
  );
  expect(overflowingMemorySurfaces).toEqual([]);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

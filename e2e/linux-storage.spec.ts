import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/storage-and-filesystems";
const publicPath = "/curricula/linux-systems/chapters/storage-and-filesystems";

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

async function fillStoragePrediction(page: TestPage, deviceBlock = "44") {
  const lab = page.locator(".storage-path-lab");
  await lab.getByRole("combobox", { name: "도착 filesystem 예측" }).selectOption("datafs");
  await lab.getByRole("textbox", { name: "inode 번호 예측" }).fill("17");
  await lab.getByRole("textbox", { name: "logical block 예측" }).fill("1");
  await lab.getByRole("textbox", { name: "block 내부 offset 예측" }).fill("0x340");
  await lab.getByRole("textbox", { name: "device block 예측" }).fill(deviceBlock);
  await lab.getByRole("textbox", { name: "device byte 주소 예측" }).fill("0x2c340");
}

async function completeStorageLab(page: TestPage) {
  const lab = page.locator(".storage-path-lab");
  await fillStoragePrediction(page);
  await lab.getByRole("button", { name: "path·block trace 실행" }).click();
  await expect(lab.locator(".storage-feedback")).toContainText("예측이 맞았습니다");
  await expect(lab.locator(".storage-evidence .is-complete")).toHaveCount(1);
  await lab.getByRole("button", { name: "path·block trace 실행" }).click();
  await expect(lab.locator(".storage-feedback")).toHaveClass(/is-correct/);

  await lab.getByRole("button", { name: "report.link 만들기" }).click();
  await expect(lab.locator(".storage-feedback")).toContainText("link count는 2");
  await lab.getByRole("button", { name: "원본 report.bin unlink" }).click();
  await expect(lab.locator(".storage-feedback")).toContainText("link count는 1");
  await expect(lab.locator(".storage-evidence .is-complete")).toHaveCount(3);

  await lab.getByRole("button", { name: "이 round에 cache 쓰기" }).click();
  await expect(lab.locator(".storage-cache-strip .is-dirty")).toContainText("candidate-v2");
  await lab.getByRole("textbox", { name: "crash 뒤 남을 version marker 예측" }).fill("draft");
  await lab.getByRole("button", { name: "이 round crash 주입·판정" }).click();
  await expect(lab.locator(".storage-feedback")).toContainText("dirty cache는 사라지고");
  await expect(lab.locator(".storage-evidence .is-complete")).toHaveCount(4);

  await lab.getByRole("button", { name: "이 round에 cache 쓰기" }).click();
  await lab.getByRole("textbox", { name: "crash 뒤 남을 version marker 예측" }).fill("draft");
  await lab.getByRole("button", { name: "이 round crash 주입·판정" }).click();
  await expect(lab.locator(".storage-feedback")).toHaveClass(/is-correct/);
  await expect(lab.locator(".storage-feedback")).toContainText("두 번째 round에서도 fsync를 빠뜨렸습니다");
  await expect(lab.getByRole("textbox", { name: "crash 뒤 남을 version marker 예측" })).toHaveValue("");
  await expect(lab.locator(".storage-evidence .is-complete")).toHaveCount(4);

  await lab.getByRole("button", { name: "이 round에 cache 쓰기" }).click();
  await lab.getByRole("button", { name: "두 번째 round: file fsync" }).click();
  await lab.getByRole("textbox", { name: "crash 뒤 남을 version marker 예측" }).fill("durable-v3");
  await lab.getByRole("button", { name: "이 round crash 주입·판정" }).click();
  await expect(lab.locator(".storage-evidence .is-complete")).toHaveCount(5);
  await expect(lab.getByText("필수 실습 완료", { exact: false })).toBeVisible();
}

async function completeStorageIncidents(page: TestPage) {
  const cards = page.locator(".storage-incident-card");
  await expect(cards).toHaveCount(4);

  const mount = cards.nth(0);
  await mount.getByRole("combobox", { name: "mount 사건 mounted filesystem" }).selectOption("datafs");
  await mount.getByRole("spinbutton", { name: "mount 사건 mounted inode" }).fill("17");
  await mount.getByRole("combobox", { name: "mount 사건 underlay filesystem" }).selectOption("rootfs");
  await mount.getByRole("spinbutton", { name: "mount 사건 underlay inode" }).fill("4");
  await mount.getByRole("combobox", { name: "mount view 병합 여부" }).selectOption("false");
  await mount.getByRole("button", { name: "namespace 실행·진단" }).click();
  await expect(mount).toHaveClass(/is-correct/);

  const capacity = cards.nth(1);
  await capacity.getByRole("spinbutton", { name: "고갈 사건 free blocks" }).fill("128");
  await capacity.getByRole("spinbutton", { name: "고갈 사건 free inodes" }).fill("0");
  await capacity.getByRole("combobox", { name: "고갈 사건 create 결과" }).selectOption("enospc");
  await capacity.getByRole("spinbutton", { name: "수리 뒤 free blocks" }).fill("128");
  await capacity.getByRole("spinbutton", { name: "수리 뒤 free inodes" }).fill("1");
  await capacity.getByRole("combobox", { name: "수리 뒤 create 결과" }).selectOption("succeeds");
  await capacity.getByRole("button", { name: "용량 계산·진단" }).click();
  await expect(capacity).toHaveClass(/is-correct/);

  const lifetime = cards.nth(2);
  await lifetime.getByRole("spinbutton", { name: "deleted-open link count" }).fill("0");
  await lifetime.getByRole("spinbutton", { name: "deleted-open open refs" }).fill("1");
  await lifetime.getByRole("combobox", { name: "close 전 block 유지 여부" }).selectOption("true");
  await lifetime.getByRole("combobox", { name: "close 뒤 block 유지 여부" }).selectOption("false");
  await lifetime.getByRole("button", { name: "수명 계산·진단" }).click();
  await expect(lifetime).toHaveClass(/is-correct/);

  const crash = cards.nth(3);
  await crash.getByRole("combobox", { name: "crash-safe 교체 1번째 단계" }).selectOption("write-temp");
  await crash.getByRole("combobox", { name: "crash-safe 교체 2번째 단계" }).selectOption("fsync-temp");
  await crash.getByRole("combobox", { name: "crash-safe 교체 3번째 단계" }).selectOption("rename");
  await crash.getByRole("combobox", { name: "crash-safe 교체 4번째 단계" }).selectOption("fsync-directory");
  await crash.getByRole("combobox", { name: "crash 뒤 config 계약" }).selectOption("old-or-new");
  await crash.getByRole("button", { name: "순서 실행·crash 진단" }).click();
  await expect(crash).toHaveClass(/is-correct/);
  await expect(page.locator(".storage-incident-progress strong")).toHaveText("4 / 4");
}

test("completes path, durability, incidents, and concepts in the Korean admin draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));
  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 06. 저장장치와 파일시스템 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.getByRole("heading", { name: "저장장치와 파일시스템" })).toBeVisible();
  await expect(page.getByText("필수 실습 · PATH → BLOCK → DURABILITY", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · FILESYSTEM INCIDENTS", { exact: true })).toBeVisible();

  const lab = page.locator(".storage-path-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  await fillStoragePrediction(page, "43");
  await lab.getByRole("button", { name: "path·block trace 실행" }).click();
  await expect(lab.locator(".storage-feedback")).toHaveClass(/is-incorrect/);
  await expect(lab.locator(".storage-feedback")).toContainText("device block 44");
  await lab.getByRole("button", { name: "실습 초기화" }).click();
  await expect(lab.getByRole("combobox", { name: "도착 filesystem 예측" })).toHaveValue("");
  await completeStorageLab(page);
  await completeStorageIncidents(page);

  await page.locator('input[name="path-resolution"][value="mount-root-dentry-inode-block"]').check();
  await page.locator('input[name="mount-namespace"][value="mounted-root-shadows-underlay"]').check();
  await page.locator('input[name="link-lifetime"][value="same-inode-reclaim-after-zero-links-and-opens"]').check();
  await page.locator('input[name="inode-capacity"][value="free-blocks-zero-free-inodes"]').check();
  await page.locator('input[name="crash-durability"][value="fsync-file-rename-fsync-parent"]').check();
  await page.getByRole("button", { name: "파일시스템 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();

  await expect(page.locator(".storage-completion-checklist .is-complete")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" })).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English storage draft keyboard-usable at 390px without heavy runtime or public access", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);

  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 06. Storage and Filesystems · Rootorial");
  await expect(page.getByRole("heading", { name: "Storage and Filesystems" })).toBeVisible();

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

  const horizontalOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  const lab = page.locator(".storage-path-lab");
  await expect(lab.locator('[data-interactive-ready="true"]')).toHaveCount(1, { timeout: 30_000 });
  const underlay = lab.getByRole("button", { name: "Observe unmounted underlay" });
  expect(await underlay.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await underlay.focus();
  await underlay.press("Enter");
  await expect(lab.getByRole("textbox", { name: "Storage path to trace" })).toHaveValue("/srv/data/README.local");
  const reset = lab.getByRole("button", { name: "Reset lab" });
  await reset.focus();
  await reset.press("Enter");
  await expect(lab.getByRole("textbox", { name: "Storage path to trace" })).toHaveValue("/srv/data/report.bin");

  await lab.getByRole("combobox", { name: "Predicted target filesystem" }).selectOption("datafs");
  await lab.getByRole("textbox", { name: "Predicted inode number" }).fill("17");
  await lab.getByRole("textbox", { name: "Predicted logical block" }).fill("1");
  await lab.getByRole("textbox", { name: "Predicted in-block offset" }).fill("0x340");
  await lab.getByRole("textbox", { name: "Predicted device block" }).fill("43");
  await lab.getByRole("textbox", { name: "Predicted device byte address" }).fill("0x2c340");
  const runTrace = lab.getByRole("button", { name: "Run path and block trace" });
  await runTrace.focus();
  await runTrace.press("Enter");
  await expect(lab.locator(".storage-feedback")).toHaveAttribute("role", "status");
  await expect(lab.locator(".storage-feedback")).toContainText("device block 44");
  await lab.getByRole("textbox", { name: "Predicted device block" }).fill("44");
  await runTrace.focus();
  await runTrace.press("Enter");
  await expect(lab.locator(".storage-feedback")).toContainText("Prediction correct");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);

  const representativeControls = [
    lab.getByRole("textbox", { name: "Predicted inode number" }),
    lab.getByRole("combobox", { name: "Predicted target filesystem" }),
    runTrace,
  ];
  for (const control of representativeControls) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }

  const incidentLab = page.locator(".storage-incident-lab");
  const resetIncidents = incidentLab.getByRole("button", { name: "Reset all incidents" });
  await resetIncidents.focus();
  await resetIncidents.press("Enter");
  await expect(incidentLab.locator(".storage-incident-progress strong")).toHaveText("0 / 4");
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  const overflowingStorageSurfaces = await page.locator('[class*="storage-"]').evaluateAll(
    (elements) => elements.filter((element) => element.scrollWidth - element.clientWidth > 1).map((element) => element.className),
  );
  expect(overflowingStorageSurfaces).toEqual([]);

  expect(heavyRuntimeRequests).toEqual([]);
  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

import { expect, test } from "@playwright/test";

test("moves from the Linux roadmap through the sample chapter and persists progress", async ({ page }) => {
  test.setTimeout(120_000);
  const bootAssetRequests: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/experiments/linux-assets/")) bootAssetRequests.push(request.url());
  });

  await page.goto("/");
  const linuxCurriculumLink = page.getByRole("link", { name: "Linux 시스템을 바닥부터" });
  await expect(linuxCurriculumLink).toHaveAttribute("href", "/curricula/linux-systems");
  await linuxCurriculumLink.click();
  await expect(page.getByRole("heading", { name: /Linux 시스템을/ })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText("첫 명령에서 작은 Linux 조립까지")).toBeVisible();
  const sampleChapterLink = page.getByRole("link", { name: /첫 샘플 챕터 시작하기/ });
  await expect(sampleChapterLink)
    .toHaveAttribute("href", "/curricula/linux-systems/chapters/shell-and-filesystem");
  await sampleChapterLink.click();

  await expect(page).toHaveTitle("01. 셸에서 첫 파일까지 · Rootorial");
  await expect(page.locator(".lesson-article").getByRole("heading", { name: "셸에서 첫 파일까지" })).toBeVisible({ timeout: 30_000 });
  const completeButton = page.getByRole("button", { name: /이 챕터 완료하기/ });
  await expect(completeButton).toBeDisabled();
  await expect(page.getByText("필수 실습 다섯 과제와 이해 확인 세 문제를 모두 마치면 완료할 수 있습니다.")).toBeVisible();

  const commandInput = page.getByRole("textbox", { name: "교육용 Linux 명령 입력" });
  const runCommand = page.getByRole("button", { name: "실행", exact: true });
  const execute = async (command: string) => {
    await expect(async () => {
      await commandInput.fill(command);
      await expect(runCommand).toBeEnabled({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await runCommand.click();
    await expect(commandInput).toHaveValue("");
  };
  for (const command of [
    "pwd",
    "cat /etc/os-release",
    "mkdir -p lab",
    'echo "absolute paths start at /" > lab/notes.txt',
    'echo "change" > /etc/os-release',
  ]) {
    await execute(command);
  }

  await expect(page.getByRole("status", { name: "5/5 개 과제 완료" })).toBeVisible();
  await expect(page.getByText("echo: /etc/os-release: Permission denied", { exact: true })).toBeVisible();
  await expect(page.getByText("필수 실습을 통과했습니다. 이해 확인 세 문제를 맞혀 주세요.")).toBeVisible();

  await execute("clear");
  await expect(page.getByRole("status", { name: "5/5 개 과제 완료" })).toBeVisible();

  await page.getByRole("radio", { name: ".", exact: true }).check();
  await page.getByRole("radio", { name: "/home/student/readme.txt", exact: true }).check();
  await page.getByRole("radio", { name: "student가 root 소유 파일을 쓸 수 없어서", exact: true }).check();
  await page.getByRole("button", { name: "답 확인하기" }).click();
  await expect(page.getByText("아직 연결되지 않은 규칙이 있습니다. 설명을 읽고 다시 답해 보세요.")).toBeVisible();
  await expect(completeButton).toBeDisabled();

  await page.getByRole("radio", { name: "/", exact: true }).check();
  await page.getByRole("button", { name: "답 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 이제 실습 완료 상태를 확인하세요.")).toBeVisible();
  await expect(completeButton).toBeEnabled();

  await completeButton.click();
  await expect(page.getByText("진도가 이 브라우저에 저장되었습니다.")).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress")))
    .toBe('["linux-systems/shell-and-filesystem"]');

  await page.reload();
  await expect(page.getByText("챕터 완료", { exact: true })).toBeVisible({ timeout: 30_000 });

  await page.goto("/");
  await expect(page.getByRole("link", { name: /학습 이어가기/ }))
    .toHaveAttribute("href", "/curricula/linux-systems");
  expect(bootAssetRequests).toEqual([]);
});

test("renders the English sample chapter without untranslated lesson UI", async ({ page }) => {
  await page.goto("/curricula/linux-systems/chapters/shell-and-filesystem?lang=en");
  await expect(page).toHaveTitle("01. From the Shell to Your First File · Rootorial");
  await expect(page.getByRole("heading", { name: "From the Shell to Your First File" })).toBeVisible();

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

  const curriculumLink = page.getByRole("link", { name: "← Curriculum", exact: true });
  await expect(curriculumLink).toHaveAttribute("href", "/curricula/linux-systems?lang=en");
  await curriculumLink.click();
  await expect(page.getByRole("heading", { name: "Understand Linux from the ground up" })).toBeVisible();
  const chapterLink = page.getByRole("link", { name: /Start the sample chapter/ });
  await expect(chapterLink).toHaveAttribute(
    "href",
    "/curricula/linux-systems/chapters/shell-and-filesystem?lang=en",
  );
  await chapterLink.click();
  await expect(page.getByRole("heading", { name: "From the Shell to Your First File" })).toBeVisible();
});

test("keeps the Linux sample usable on a narrow mobile viewport", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/curricula/linux-systems/chapters/shell-and-filesystem");
  const commandInput = page.getByRole("textbox", { name: "교육용 Linux 명령 입력" });
  await expect(commandInput).toBeVisible();
  await expect(async () => {
    await commandInput.click();
    await expect(commandInput).toBeFocused({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  for (const target of [
    page.getByRole("button", { name: "처음 상태로" }),
    page.getByRole("button", { name: "실행", exact: true }),
    page.getByRole("button", { name: "파일: /etc/os-release" }),
    page.locator(".linux-command-examples").getByRole("button", { name: "pwd", exact: true }),
  ]) {
    const box = await target.boundingBox();
    expect(box?.height).toBeGreaterThanOrEqual(44);
    expect(box?.width).toBeGreaterThanOrEqual(44);
  }
});

import { expect, test, type Page } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewBase = "/admin/preview/curricula/linux-networking/chapters";

const chapters = [
  {
    slug: "subnets-neighbors-and-gateways",
    title: "Subnets, Neighbors, and Gateways",
    testId: "subnet-path-figure",
    prediction: "Which address should ARP resolve when sending to 203.0.113.20?",
    wrongValue: "remote",
    correctValue: "gateway",
    wrongFeedback: "The remote address is not on this link.",
    correctFeedback: "Prediction confirmed. Execute each state in order.",
    secondStep: "02 Same link: ARP",
  },
  {
    slug: "routes-and-packet-paths",
    title: "Routes and Packet Paths",
    testId: "routes-and-packet-paths-figure",
    prediction: "What decides the path for a destination first?",
    wrongValue: "neighbor",
    correctValue: "route",
    wrongFeedback: "That boundary does not come first.",
    correctFeedback: "Prediction confirmed. Execute the evidence in order.",
    secondStep: "02 Longest prefix",
  },
  {
    slug: "sockets-ports-and-tcp",
    title: "Sockets, Ports, and TCP",
    testId: "sockets-ports-and-tcp-figure",
    prediction: "What is the final proof that the application read the bytes?",
    wrongValue: "ack",
    correctValue: "recv",
    wrongFeedback: "That boundary does not come first.",
    correctFeedback: "Prediction confirmed. Execute the evidence in order.",
    secondStep: "02 Connect",
  },
  {
    slug: "dns-and-service-reachability",
    title: "DNS and Service Reachability",
    testId: "dns-and-service-reachability-figure",
    prediction: "Which boundary follows a DNS answer in service verification?",
    wrongValue: "healthy",
    correctValue: "connect",
    wrongFeedback: "That boundary does not come first.",
    correctFeedback: "Prediction confirmed. Execute the evidence in order.",
    secondStep: "02 DNS answer",
  },
  {
    slug: "diagnose-a-linux-network",
    title: "Diagnose a Linux Network",
    testId: "diagnose-a-linux-network-figure",
    prediction: "What should be fixed before running diagnostic commands?",
    wrongValue: "restart",
    correctValue: "scope",
    wrongFeedback: "That boundary does not come first.",
    correctFeedback: "Prediction confirmed. Execute the evidence in order.",
    secondStep: "02 Route and neighbor",
  },
] as const;

async function signInAsAdmin(page: Page) {
  test.skip(!process.env.E2E_ADMIN_EMAIL, "E2E admin bootstrap is required.");
  await signInTestUser(page, process.env.E2E_ADMIN_EMAIL!);
}

function watchConsoleErrors(page: Page) {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  return consoleErrors;
}

async function openChapter(page: Page, chapter: (typeof chapters)[number]) {
  const response = await page.goto(`${previewBase}/${chapter.slug}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page.getByText("Loading chapter…", { exact: true })).toHaveCount(0);
  await expect(page.locator(".lesson-article").getByRole("heading", {
    name: chapter.title,
    exact: true,
  })).toBeVisible();
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
    "content",
    "noindex, nofollow",
  );
  await expect(page.locator("select")).toHaveCount(0);
}

test("opens every advanced Linux Networking route and exposes immediate prediction feedback", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 1280, height: 720 });

  for (const chapter of chapters) {
    await test.step(chapter.slug, async () => {
      await openChapter(page, chapter);
      const figure = page.getByTestId(chapter.testId);
      await expect(figure).toHaveAttribute("data-mastered", "false");

      const prediction = figure.getByRole("group", { name: chapter.prediction });
      await prediction.locator(`button[data-choice-value="${chapter.wrongValue}"]`).click();
      await expect(figure.getByText(chapter.wrongFeedback, { exact: false })).toBeVisible();

      const correctAnswer = prediction.locator(
        `button[data-choice-value="${chapter.correctValue}"]`,
      );
      await correctAnswer.focus();
      await correctAnswer.press("Enter");
      await expect(correctAnswer).toHaveAttribute("aria-pressed", "true");
      await expect(figure.getByText(chapter.correctFeedback, { exact: true })).toBeVisible();
      await expect(figure.getByRole("button", {
        name: chapter.secondStep,
        exact: true,
      })).toBeEnabled();

      await expect(page.locator(".network-view-completion-checklist")).toContainText(
        /All executable states|Six path states/,
      );
    });
  }

  expect(consoleErrors).toEqual([]);
});

test("keeps every advanced Linux Networking route usable at 390x844", async ({ page }) => {
  test.setTimeout(120_000);
  const consoleErrors = watchConsoleErrors(page);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  for (const chapter of chapters) {
    await test.step(chapter.slug, async () => {
      await openChapter(page, chapter);
      expect(await page.evaluate(
        () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
      )).toBeLessThanOrEqual(1);

      const coreTargets = page.locator(
        ".lesson-article button:visible:not(:disabled), .lesson-article a[href]:visible",
      );
      const undersizedTargets = await coreTargets.evaluateAll((elements) => elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          return {
            label: element.getAttribute("aria-label") || element.textContent?.trim() || element.tagName,
            width: rect.width,
            height: rect.height,
          };
        })
        .filter(({ width, height }) => width < 44 || height < 44));
      expect(undersizedTargets, `${chapter.slug} has targets smaller than 44px`).toEqual([]);
    });
  }

  expect(consoleErrors).toEqual([]);
});

import { expect, test } from "@playwright/test";
import { signInTestUser } from "./helpers";

const previewPath = "/admin/preview/curricula/linux-systems/chapters/networking-from-a-packet";
const publicPath = "/curricula/linux-systems/chapters/networking-from-a-packet";

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

async function fillCorrectPrediction(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  await lab.getByRole("combobox", { name: "socket syscall 경계 예측" }).selectOption("fd-handshake-queue");
  await lab.getByRole("combobox", { name: "같은 link 경로 예측" }).selectOption("direct-24-peer");
  await lab.getByRole("combobox", { name: "원격 route와 주소 경계 예측" }).selectOption("default-gateway-preserve-ip");
  await lab.getByRole("combobox", { name: "TCP segmentation 예측" }).selectOption("mss-1460-syn-consumes-one");
  await lab.getByRole("combobox", { name: "TCP 유실 복구 예측" }).selectOption("gap-rto-cumulative");
  await lab.getByRole("button", { name: "두 경로·TCP 예측 판정" }).click();
  await expect(lab.locator(".network-live-feedback")).toContainText("예측이 맞았습니다");
}

async function completeJourney(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  await fillCorrectPrediction(page);
  await lab.getByRole("button", { name: /1 · 고정 hostname mapping 읽기/ }).click();
  await lab.getByRole("button", { name: /2 · socket\(\) → fd 4/ }).click();
  await lab.getByRole("button", { name: /3 · route · ARP · handshake/ }).click();
  await expect(lab.getByText("accept queue 1 · fd 미할당")).toBeVisible();
  await lab.getByRole("button", { name: /4 · accept\(fd 3\) → fd 5/ }).click();
  await expect(lab.getByText("accepted fd 5 · ESTABLISHED")).toBeVisible();
  await lab.getByRole("button", { name: /5 · send\(3000\)/ }).click();

  const disposition = lab.getByRole("combobox", { name: "다음 segment 전달 또는 유실 선택" });
  const transmit = lab.getByRole("button", { name: /6–8 · 다음 segment 전송/ });
  await disposition.selectOption("deliver");
  await transmit.click();
  await expect(lab.getByText("receive queue 1460 B")).toBeVisible();
  await disposition.selectOption("drop");
  await transmit.click();
  await disposition.selectOption("deliver");
  await transmit.click();
  await expect(lab.getByText("receiver next 2461")).toBeVisible();

  await lab.getByRole("button", { name: /9 · RTO · 첫 gap 재전송/ }).click();
  await expect(lab.getByText("receive queue 3000 B")).toBeVisible();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "tcp", exact: true }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "ip", exact: true }).click();
  await lab.getByRole("button", { name: /10 · accepted fd 5에서 recv 실행/ }).click();
  await expect(lab.getByText("recv(fd 5) → 3000 B", { exact: true })).toBeVisible();
  await expect(lab.getByText("필수 실습 완료", { exact: false })).toBeVisible();
}

async function completeIncidents(page: TestPage) {
  const lab = page.locator(".network-incident-lab");
  const cards = lab.locator(".network-incident-card");
  await expect(cards).toHaveCount(4);

  const route = cards.nth(0);
  await route.getByRole("spinbutton", { name: "route 사건 prefix 길이" }).fill("25");
  await route.getByRole("combobox", { name: "route 사건 gateway" }).selectOption("10.0.0.252");
  await route.getByRole("combobox", { name: "route 사건 egress interface" }).selectOption("eth0");
  await route.getByRole("button", { name: "route 계산·진단" }).click();
  await expect(route).toHaveClass(/is-correct/);

  const frame = cards.nth(1);
  await frame.getByRole("combobox", { name: "frame 사건 next hop" }).selectOption("192.0.2.1");
  await frame.getByRole("combobox", { name: "frame 사건 Ethernet 목적지" }).selectOption("02:00:00:00:00:21");
  await frame.getByRole("combobox", { name: "frame 사건 IPv4 목적지" }).selectOption("203.0.113.20");
  await frame.getByRole("spinbutton", { name: "frame 사건 outgoing TTL" }).fill("2");
  await frame.getByRole("button", { name: "frame 전달·진단" }).click();
  await expect(frame).toHaveClass(/is-correct/);

  const ack = cards.nth(2);
  await ack.getByRole("spinbutton", { name: "ACK gap 사건 gap 뒤 ACK" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK gap 사건 재전송 sequence" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK gap 사건 재전송 byte" }).fill("600");
  await ack.getByRole("spinbutton", { name: "ACK gap 사건 최종 ACK" }).fill("6501");
  await ack.getByRole("button", { name: "byte stream 계산·진단" }).click();
  await expect(ack).toHaveClass(/is-correct/);

  const listener = cards.nth(3);
  await listener.getByRole("combobox", { name: "listener 사건 network delivery" }).selectOption("true");
  await listener.getByRole("combobox", { name: "listener 사건 listener match" }).selectOption("false");
  await listener.getByRole("combobox", { name: "listener 사건 TCP 응답" }).selectOption("rst");
  await listener.getByRole("combobox", { name: "listener 사건 application delivery" }).selectOption("false");
  await listener.getByRole("button", { name: "demux·delivery 진단" }).click();
  await expect(listener).toHaveClass(/is-correct/);
  await expect(lab.locator(".network-incident-progress strong")).toHaveText("4 / 4");
}

async function completeEnglishJourneyWithKeyboard(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  await lab.getByRole("combobox", { name: "Predict socket syscall boundaries" }).selectOption("fd-handshake-queue");
  await lab.getByRole("combobox", { name: "Predict on-link route" }).selectOption("direct-24-peer");
  await lab.getByRole("combobox", { name: "Predict remote route and addressing boundaries" }).selectOption("default-gateway-preserve-ip");
  await lab.getByRole("combobox", { name: "Predict TCP segmentation" }).selectOption("mss-1460-syn-consumes-one");
  await lab.getByRole("combobox", { name: "Predict TCP loss recovery" }).selectOption("gap-rto-cumulative");

  const submitPrediction = lab.getByRole("button", { name: "Check both paths and TCP prediction" });
  await submitPrediction.focus();
  await submitPrediction.press("Enter");
  await expect(lab.locator(".network-live-feedback")).toContainText("Prediction correct");

  const resolve = lab.getByRole("button", { name: /1 · Read fixed hostname mapping/ });
  await resolve.focus();
  await resolve.press("Enter");
  await lab.getByRole("button", { name: /2 · socket\(\) → fd 4/ }).click();
  await lab.getByRole("button", { name: /3 · route · ARP · handshake/ }).click();
  await lab.getByRole("button", { name: /4 · accept\(fd 3\) → fd 5/ }).click();
  await lab.getByRole("button", { name: /5 · send\(3000\)/ }).click();

  const disposition = lab.getByRole("combobox", { name: "Choose delivery or loss for next segment" });
  const transmit = lab.getByRole("button", { name: /6–8 · Transmit next segment/ });
  await disposition.selectOption("deliver");
  await transmit.focus();
  await transmit.press("Enter");
  await disposition.selectOption("drop");
  await transmit.click();
  await disposition.selectOption("deliver");
  await transmit.click();
  await lab.getByRole("button", { name: /9 · RTO · Retransmit first gap/ }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "tcp", exact: true }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "ip", exact: true }).click();
  await lab.getByRole("button", { name: /10 · Run recv on accepted fd 5/ }).click();
  await expect(lab.getByText("Required lab complete", { exact: false })).toBeVisible();
}

async function completeEnglishIncidentsWithKeyboard(page: TestPage) {
  const lab = page.locator(".network-incident-lab");
  const cards = lab.locator(".network-incident-card");

  const route = cards.nth(0);
  await route.getByRole("spinbutton", { name: "Route incident prefix length" }).fill("25");
  await route.getByRole("combobox", { name: "Route incident gateway" }).selectOption("10.0.0.252");
  await route.getByRole("combobox", { name: "Route incident egress interface" }).selectOption("eth0");
  const routeAudit = route.getByRole("button", { name: "Compute route and diagnose" });
  await routeAudit.focus();
  await routeAudit.press("Enter");
  await expect(route).toHaveClass(/is-correct/);

  const frame = cards.nth(1);
  await frame.getByRole("combobox", { name: "Frame incident next hop" }).selectOption("192.0.2.1");
  await frame.getByRole("combobox", { name: "Frame incident Ethernet destination" }).selectOption("02:00:00:00:00:21");
  await frame.getByRole("combobox", { name: "Frame incident IPv4 destination" }).selectOption("203.0.113.20");
  await frame.getByRole("spinbutton", { name: "Frame incident outgoing TTL" }).fill("2");
  await frame.getByRole("button", { name: "Forward frame and diagnose" }).click();

  const ack = cards.nth(2);
  await ack.getByRole("spinbutton", { name: "ACK-gap incident ACK after gap" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident retransmission sequence" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident retransmission bytes" }).fill("600");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident final ACK" }).fill("6501");
  await ack.getByRole("button", { name: "Compute byte stream and diagnose" }).click();

  const listener = cards.nth(3);
  await listener.getByRole("combobox", { name: "Listener incident network delivery" }).selectOption("true");
  await listener.getByRole("combobox", { name: "Listener incident listener match" }).selectOption("false");
  await listener.getByRole("combobox", { name: "Listener incident TCP response" }).selectOption("rst");
  await listener.getByRole("combobox", { name: "Listener incident application delivery" }).selectOption("false");
  await listener.getByRole("button", { name: "Diagnose demux and delivery" }).click();
  await expect(lab.locator(".network-incident-progress strong")).toHaveText("4 / 4");
}

test("completes the causal packet journey, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  await signInAsAdmin(page);
  await page.evaluate(() => localStorage.removeItem("rootorial-progress"));

  const response = await page.goto(previewPath);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[미리보기] 07. 패킷에서 소켓까지 · Rootorial");
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, nofollow");
  await expect(page.getByText("관리자 미리보기", { exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "공개 URL 확인" })).toHaveAttribute("href", publicPath);
  await expect(page.getByRole("heading", { name: "패킷에서 소켓까지" })).toBeVisible();
  await expect(page.getByText("필수 실습 · SOCKET → ROUTE → TCP → RECV", { exact: true })).toBeVisible();
  await expect(page.getByText("별도 활동 · NETWORK INCIDENTS", { exact: true })).toBeVisible();
  await expect(page.locator('.network-journey-lab [data-interactive-ready="true"]')).toHaveCount(1);
  await expect(page.locator('.network-incident-lab [data-interactive-ready="true"]')).toHaveCount(1);
  const completionButton = page.getByRole("button", { name: "미리보기에서는 완료할 수 없습니다" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  const lab = page.locator(".network-journey-lab");
  const prematureConnect = lab.getByRole("button", { name: /3 · route · ARP · handshake/ });
  await expect(prematureConnect).toHaveAttribute("aria-disabled", "true");
  await prematureConnect.focus();
  await prematureConnect.press("Enter");
  await expect(lab.locator(".network-live-feedback")).toContainText("socket fd 4를 먼저");

  await lab.getByRole("combobox", { name: "socket syscall 경계 예측" }).selectOption("wire-dns-delivered");
  await lab.getByRole("combobox", { name: "같은 link 경로 예측" }).selectOption("default-gateway");
  await lab.getByRole("combobox", { name: "원격 route와 주소 경계 예측" }).selectOption("direct-server-rewrite-ip");
  await lab.getByRole("combobox", { name: "TCP segmentation 예측" }).selectOption("mtu-1500-syn-free");
  await lab.getByRole("combobox", { name: "TCP 유실 복구 예측" }).selectOption("skip-gap-new-sequence");
  await lab.getByRole("button", { name: "두 경로·TCP 예측 판정" }).click();
  await expect(lab.locator(".network-live-feedback")).toContainText("fd는 process-local 참조");
  await expect(lab.locator(".network-live-feedback")).toContainText("1500−IPv4 20−TCP 20=1460");
  await lab.getByRole("button", { name: "실습 초기화" }).click();

  await completeJourney(page);
  await completeIncidents(page);
  await page.locator('input[name="socket-boundary"][value="fd-references-kernel-socket"]').check();
  await page.locator('input[name="longest-prefix-route"][value="most-specific-prefix"]').check();
  await page.locator('input[name="next-hop-addressing"][value="gateway-mac-keeps-remote-ip"]').check();
  await page.locator('input[name="cumulative-ack"][value="ack-covers-contiguous-bytes"]').check();
  await page.locator('input[name="listener-delivery"][value="accept-new-fd-recv-confirms-delivery"]').check();
  await page.getByRole("button", { name: "네트워크 경로 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px without untranslated or heavy runtime surfaces", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  await signInAsAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.emulateMedia({ reducedMotion: "reduce" });

  const response = await page.goto(`${previewPath}?lang=en`);
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("[Preview] 07. From Packets to Sockets · Rootorial");
  await expect(page.getByRole("heading", { name: "From Packets to Sockets" })).toBeVisible();
  await expect(page.locator('.network-journey-lab [data-interactive-ready="true"]')).toHaveCount(1);
  await expect(page.locator('.network-incident-lab [data-interactive-ready="true"]')).toHaveCount(1);
  const completionButton = page.getByRole("button", { name: "Completion is disabled in preview" });
  await expect(completionButton).toHaveAttribute("data-completion-ready", "false");

  const untranslated = await page.locator(".lesson-article").evaluate((root) => {
    const rows: string[] = [];
    for (const element of Array.from(root.querySelectorAll("*"))) {
      const ownText = Array.from(element.childNodes).filter((node) => node.nodeType === Node.TEXT_NODE).map((node) => node.textContent ?? "").join(" ").replace(/\s+/g, " ").trim();
      const attributes = ["aria-label", "title", "placeholder"].map((name) => element.getAttribute(name)).filter(Boolean).join(" | ");
      const value = [ownText, attributes].filter(Boolean).join(" | ");
      if (/[가-힣]/.test(value)) rows.push(value);
    }
    return rows;
  });
  expect(untranslated).toEqual([]);

  const horizontalOverflow = () => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  const reset = page.locator(".network-journey-lab").getByRole("button", { name: "Reset lab" });
  expect(await reset.evaluate((element) => getComputedStyle(element).transitionDuration)).toBe("0s");
  await reset.focus();
  await reset.press("Enter");
  await expect(page.locator(".network-journey-lab").getByRole("combobox", { name: "Predict socket syscall boundaries" })).toHaveValue("");

  await completeEnglishJourneyWithKeyboard(page);
  await completeEnglishIncidentsWithKeyboard(page);
  await page.locator('input[name="socket-boundary"][value="fd-references-kernel-socket"]').check();
  await page.locator('input[name="longest-prefix-route"][value="most-specific-prefix"]').check();
  await page.locator('input[name="next-hop-addressing"][value="gateway-mac-keeps-remote-ip"]').check();
  await page.locator('input[name="cumulative-ack"][value="ack-covers-contiguous-bytes"]').check();
  await page.locator('input[name="listener-delivery"][value="accept-new-fd-recv-confirms-delivery"]').check();
  const conceptSubmit = page.getByRole("button", { name: "Check the network-path decisions" });
  await conceptSubmit.focus();
  await conceptSubmit.press("Enter");
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");

  const representativeControls = [
    page.locator(".network-journey-lab").getByRole("combobox", { name: "Predict socket syscall boundaries" }),
    page.locator(".network-journey-lab").getByRole("button", { name: "Check both paths and TCP prediction" }),
    page.locator(".network-incident-lab").getByRole("button", { name: "Reset all incidents" }),
  ];
  for (const control of representativeControls) {
    const box = await control.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  }
  const overflowingNetworkSurfaces = await page.locator('[class*="network-"]').evaluateAll((elements) => elements.filter((element) => element.scrollWidth - element.clientWidth > 1).map((element) => element.className));
  expect(overflowingNetworkSurfaces).toEqual([]);
  expect(await horizontalOverflow()).toBeLessThanOrEqual(1);
  expect(heavyRuntimeRequests).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
});

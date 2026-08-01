import { expect, test, type Locator } from "@playwright/test";
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

function collectConsoleErrors(page: TestPage) {
  const errors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") errors.push(message.text());
  });
  return errors;
}

async function choose(scope: Locator, groupName: string, optionName: string) {
  await scope
    .getByRole("group", { name: groupName, exact: true })
    .getByRole("button", { name: optionName, exact: true })
    .click();
}

async function fillCorrectPrediction(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  await choose(lab, "fd · connect · send 경계", "fd는 local 참조 · connect는 handshake · send는 local queue");
  await choose(lab, "same-link 10.0.0.42", "/24 direct · next hop 10.0.0.42 · peer MAC");
  await choose(lab, "remote route · frame", "/0 via 10.0.0.1 · gateway MAC · IP dst 203.0.113.20");
  await choose(lab, "MTU · MSS · sequence", "MSS 1460 · payload 1460/1460/80 · seq 1001/2461/3921");
  await choose(lab, "gap · RTO · cumulative ACK", "ACK 2461 → 2461 · RTO seq 2461 · final ACK 4001");
  await lab.getByRole("button", { name: "두 경로·TCP 예측 판정" }).click();
  await expect(lab.locator(".network-live-feedback")).toContainText("예측이 맞았습니다");
}

async function completeJourney(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  const visual = lab.getByTestId("network-packet-visualization");
  const timeline = visual.getByRole("list", { name: "TCP ACK 타임라인" });
  await expect(visual.getByRole("img", { name: /패킷 경로 토폴로지/ })).toBeVisible();
  await expect(timeline).toBeVisible();
  await expect(visual).toHaveAttribute("data-network-phase", "idle");
  await fillCorrectPrediction(page);
  await lab.getByRole("button", { name: /1 · 고정 hostname mapping 읽기/ }).click();
  await lab.getByRole("button", { name: /2 · socket\(\) → fd 4/ }).click();
  await lab.getByRole("button", { name: /3 · route · ARP · handshake/ }).click();
  await expect(visual).toHaveAttribute("data-network-phase", "accept-queued");
  await expect(visual).toContainText("10.0.0.1");
  await expect(visual).toContainText("02:00:00:00:00:01");
  await expect(visual).toContainText("203.0.113.20:443");
  await expect(lab.getByText("accept queue 1 · fd 미할당")).toBeVisible();
  await lab.getByRole("button", { name: /4 · accept\(fd 3\) → fd 5/ }).click();
  await expect(lab.getByText("accepted fd 5 · ESTABLISHED")).toBeVisible();
  await lab.getByRole("button", { name: /5 · send\(3000\)/ }).click();
  await expect(visual).toHaveAttribute("data-network-phase", "queued");
  await expect(timeline.locator("[data-segment-index]")).toHaveCount(3);
  await expect(timeline.locator('[data-segment-index="1"]')).toContainText("[1001, 2461) · 1460 B");
  await expect(timeline.locator('[data-segment-index="2"]')).toContainText("[2461, 3921) · 1460 B");
  await expect(timeline.locator('[data-segment-index="3"]')).toContainText("[3921, 4001) · 80 B");

  const disposition = lab.getByRole("group", { name: "다음 segment의 wire 결과", exact: true });
  const transmit = lab.getByRole("button", { name: /6–8 · 다음 segment 전송/ });
  await disposition.getByRole("button", { name: "전달", exact: true }).click();
  await transmit.click();
  await expect(visual).toHaveAttribute("data-network-phase", "transmitting");
  await expect(timeline.locator('[data-segment-index="1"]')).toContainText("누적 ACK 완료");
  await expect(visual.locator(".network-packet-current-state")).toContainText("ACK 2461");
  await expect(lab.getByText("receive queue 1460 B")).toBeVisible();
  await disposition.getByRole("button", { name: "유실", exact: true }).click();
  await transmit.click();
  await expect(visual).toHaveAttribute("data-network-phase", "gap");
  await expect(timeline.locator('[data-segment-index="2"]')).toContainText("첫 전송 유실");
  await expect(timeline.locator('[data-segment-index="2"]')).toContainText("ACK 2461");
  await disposition.getByRole("button", { name: "전달", exact: true }).click();
  await transmit.click();
  await expect(timeline.locator('[data-segment-index="3"]')).toContainText("순서 밖 buffer");
  await expect(timeline.locator('[data-segment-index="3"]')).toContainText("duplicate ACK 2461");
  await expect(lab.getByText("receiver next 2461")).toBeVisible();

  await lab.getByRole("button", { name: /9 · RTO · 첫 gap 재전송/ }).click();
  await expect(visual).toHaveAttribute("data-network-phase", "recovered");
  await expect(timeline.locator('[data-segment-index="2"]')).toHaveAttribute("data-segment-state", "recovered");
  await expect(timeline.locator('[data-segment-index="2"]')).toContainText("RTO 재전송");
  await expect(timeline.locator('[data-segment-index="2"]')).toContainText("tx 2");
  await expect(visual.locator(".network-packet-current-state")).toContainText("누적 ACK 4001");
  await expect(lab.getByText("receive queue 3000 B")).toBeVisible();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "tcp", exact: true }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "ip", exact: true }).click();
  await lab.getByRole("button", { name: /10 · accepted fd 5에서 recv 실행/ }).click();
  await expect(visual).toHaveAttribute("data-network-phase", "received");
  await expect(visual.locator(".network-packet-current-state")).toContainText("recv(fd 5)");
  await expect(visual).toContainText("APPLICATION · 3000 B");
  await expect(lab.getByText("recv(fd 5) → 3000 B", { exact: true })).toBeVisible();
  await expect(lab.getByText("필수 실습 완료", { exact: false })).toBeVisible();
}

async function completeIncidents(page: TestPage) {
  const lab = page.locator(".network-incident-lab");
  const cards = lab.locator(".network-incident-card");
  await expect(cards).toHaveCount(4);

  const route = cards.nth(0);
  await route.getByRole("spinbutton", { name: "route 사건 prefix 길이" }).fill("25");
  await choose(route, "gateway", "10.0.0.253");
  await choose(route, "interface", "eth0");
  await route.getByRole("button", { name: "route 계산·진단" }).click();
  await expect(route.locator(".network-incident-feedback")).toContainText("낮은 metric 100");
  await choose(route, "gateway", "10.0.0.252");
  await route.getByRole("button", { name: "route 계산·진단" }).click();
  await expect(route).toHaveClass(/is-correct/);

  const frame = cards.nth(1);
  await choose(frame, "next hop", "192.0.2.1");
  await choose(frame, "Ethernet dst", "02:00:00:00:00:21");
  await choose(frame, "IPv4 dst", "203.0.113.20");
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
  await choose(listener, "IP packet 전달", "예");
  await choose(listener, "listener 일치", "아니요");
  await choose(listener, "TCP response", "RST");
  await choose(listener, "application byte 인수", "아니요");
  await listener.getByRole("button", { name: "demux·delivery 진단" }).click();
  await expect(listener).toHaveClass(/is-correct/);
  await expect(lab.locator(".network-incident-progress strong")).toHaveText("4 / 4");
}

async function completeEnglishJourneyWithKeyboard(page: TestPage) {
  const lab = page.locator(".network-journey-lab");
  const visual = lab.getByTestId("network-packet-visualization");
  await expect(visual.getByRole("img", { name: /Packet path topology/ })).toBeVisible();
  await expect(visual.getByRole("list", { name: "TCP ACK timeline" })).toBeVisible();
  await expect(visual).toHaveAttribute("data-network-phase", "idle");
  await choose(lab, "Fd, connect, and send boundaries", "Fd is local · connect waits for handshake · send enqueues locally");
  await choose(lab, "Same-link 10.0.0.42", "/24 direct · next hop 10.0.0.42 · peer MAC");
  await choose(lab, "Remote route and frame", "/0 via 10.0.0.1 · gateway MAC · IP dst 203.0.113.20");
  await choose(lab, "MTU, MSS, and sequence", "MSS 1460 · payload 1460/1460/80 · seq 1001/2461/3921");
  await choose(lab, "Gap, RTO, and cumulative ACK", "ACK 2461 → 2461 · RTO seq 2461 · final ACK 4001");

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

  const disposition = lab.getByRole("group", { name: "Next segment wire result", exact: true });
  const transmit = lab.getByRole("button", { name: /6–8 · Transmit next segment/ });
  await disposition.getByRole("button", { name: "Deliver", exact: true }).click();
  await transmit.focus();
  await transmit.press("Enter");
  await disposition.getByRole("button", { name: "Drop", exact: true }).click();
  await transmit.click();
  await disposition.getByRole("button", { name: "Deliver", exact: true }).click();
  await transmit.click();
  await lab.getByRole("button", { name: /9 · RTO · Retransmit first gap/ }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "tcp", exact: true }).click();
  await lab.locator(".network-layer-tabs").getByRole("button", { name: "ip", exact: true }).click();
  await lab.getByRole("button", { name: /10 · Run recv on accepted fd 5/ }).click();
  await expect(visual).toHaveAttribute("data-network-phase", "received");
  await expect(visual.locator(".network-packet-current-state")).toContainText("recv(fd 5)");
  await expect(lab.getByText("Required lab complete", { exact: false })).toBeVisible();
}

async function completeEnglishIncidentsWithKeyboard(page: TestPage) {
  const lab = page.locator(".network-incident-lab");
  const cards = lab.locator(".network-incident-card");

  const route = cards.nth(0);
  await route.getByRole("spinbutton", { name: "Route incident prefix length" }).fill("25");
  await choose(route, "gateway", "10.0.0.252");
  await choose(route, "interface", "eth0");
  const routeAudit = route.getByRole("button", { name: "Compute route and diagnose" });
  await routeAudit.focus();
  await routeAudit.press("Enter");
  await expect(route).toHaveClass(/is-correct/);

  const frame = cards.nth(1);
  await choose(frame, "next hop", "192.0.2.1");
  await choose(frame, "Ethernet dst", "02:00:00:00:00:21");
  await choose(frame, "IPv4 dst", "203.0.113.20");
  await frame.getByRole("spinbutton", { name: "Frame incident outgoing TTL" }).fill("2");
  await frame.getByRole("button", { name: "Forward frame and diagnose" }).click();

  const ack = cards.nth(2);
  await ack.getByRole("spinbutton", { name: "ACK-gap incident ACK after gap" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident retransmission sequence" }).fill("5601");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident retransmission bytes" }).fill("600");
  await ack.getByRole("spinbutton", { name: "ACK-gap incident final ACK" }).fill("6501");
  await ack.getByRole("button", { name: "Compute byte stream and diagnose" }).click();

  const listener = cards.nth(3);
  await choose(listener, "Network delivered", "Yes");
  await choose(listener, "Listener matched", "No");
  await choose(listener, "TCP response", "RST");
  await choose(listener, "Application received bytes", "No");
  await listener.getByRole("button", { name: "Diagnose demux and delivery" }).click();
  await expect(lab.locator(".network-incident-progress strong")).toHaveText("4 / 4");
}

test("completes the causal packet journey, incidents, and concepts in the Korean draft preview", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);
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

  await choose(lab, "fd · connect · send 경계", "fd가 wire로 이동 · 이름 해석 뒤 연결 · send는 remote 처리");
  await choose(lab, "same-link 10.0.0.42", "/0 via 10.0.0.1 · gateway MAC");
  await choose(lab, "remote route · frame", "/24 direct · server MAC · IP dst 10.0.0.1");
  await choose(lab, "MTU · MSS · sequence", "MSS 1486 · payload 1500/1500 · seq 1000/2460/3920");
  await choose(lab, "gap · RTO · cumulative ACK", "ACK 2461 → 4001 · new seq 4001 · final ACK 3921");
  await lab.getByRole("button", { name: "두 경로·TCP 예측 판정" }).click();
  await expect(lab.locator(".network-live-feedback")).toContainText("fd는 process-local 참조");
  await expect(lab.locator(".network-live-feedback")).toContainText("1500−IPv4 20−TCP 20=1460");
  await lab.getByRole("button", { name: "실습 초기화" }).click();

  await completeJourney(page);
  await completeIncidents(page);
  await page.getByRole("button", { name: "fd 번호 4가 TCP header에 들어가 원격 프로세스의 같은 번호 fd를 선택", exact: true }).click();
  await page.getByRole("button", { name: "목적지와 일치하는 route 중 prefix가 가장 긴 /25, next hop 192.0.2.254", exact: true }).click();
  await page.getByRole("button", { name: "frame은 gateway의 MAC, IP packet은 계속 remote server의 IP 198.51.100.20", exact: true }).click();
  await page.getByRole("button", { name: "server TCP가 1099까지 연속된 byte를 받았고 다음으로 1100을 기대함", exact: true }).click();
  await page.getByRole("button", { name: "fd 3은 LISTEN을 유지하고 fd 5가 연결을 담당하며, application delivery는 recv(fd 5)가 payload를 반환할 때 확인", exact: true }).click();
  await page.getByRole("button", { name: "네트워크 경로 판정 확인하기" }).click();
  await expect(page.getByText("fd, route, link hop, TCP와 application 경계를 다시 추적하세요", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "fd 4는 이 프로세스의 커널 socket 참조이고, send는 user buffer의 byte를 그 socket의 send buffer로 복사", exact: true }).click();
  await page.getByRole("button", { name: "네트워크 경로 판정 확인하기" }).click();
  await expect(page.getByText("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.")).toBeVisible();
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");
  await expect(completionButton).toBeDisabled();
  await expect(page.locator("select")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.getItem("rootorial-progress"))).toBeNull();
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(publicPath);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

test("keeps the English draft keyboard-usable at 390px without untranslated or heavy runtime surfaces", async ({ page }) => {
  test.setTimeout(120_000);
  const heavyRuntimeRequests = watchHeavyRuntimeRequests(page);
  const consoleErrors = collectConsoleErrors(page);
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
  await expect(
    page
      .locator(".network-journey-lab")
      .getByRole("group", { name: "Fd, connect, and send boundaries", exact: true })
      .getByRole("button", { name: "Fd is local · connect waits for handshake · send enqueues locally", exact: true }),
  ).toHaveAttribute("aria-pressed", "false");

  await completeEnglishJourneyWithKeyboard(page);
  const markerMotion = await page.locator(".network-journey-lab [data-packet-marker]").evaluate((element) => {
    const style = getComputedStyle(element);
    return [style.animationName, style.transitionDuration];
  });
  expect(markerMotion).toEqual(["none", "0s"]);
  await completeEnglishIncidentsWithKeyboard(page);
  await page.getByRole("button", { name: "fd 4 is this process's reference to a kernel socket, and send copies bytes from the user buffer into that socket's send buffer", exact: true }).click();
  await page.getByRole("button", { name: "The matching route with the longest prefix: /25 via next hop 192.0.2.254", exact: true }).click();
  await page.getByRole("button", { name: "The frame targets the gateway's MAC while the IP packet keeps remote server IP 198.51.100.20", exact: true }).click();
  await page.getByRole("button", { name: "Server TCP received contiguous bytes through 1099 and expects 1100 next", exact: true }).click();
  await page.getByRole("button", { name: "fd 3 remains in LISTEN, fd 5 owns the connection, and application delivery is confirmed when recv(fd 5) returns the payload", exact: true }).click();
  const conceptSubmit = page.getByRole("button", { name: "Check the network-path decisions" });
  await conceptSubmit.focus();
  await conceptSubmit.press("Enter");
  await expect(page.locator(".network-completion-checklist .is-complete")).toHaveCount(3);
  await expect(completionButton).toHaveAttribute("data-completion-ready", "true");

  const representativeControls = [
    page
      .locator(".network-journey-lab")
      .getByRole("group", { name: "Fd, connect, and send boundaries", exact: true })
      .getByRole("button", { name: "Fd is local · connect waits for handshake · send enqueues locally", exact: true }),
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
  await expect(page.locator("select")).toHaveCount(0);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);

  const publicResponse = await page.goto(`${publicPath}?lang=en`);
  expect(publicResponse?.status()).toBe(404);
  expect(heavyRuntimeRequests).toEqual([]);
  expect(consoleErrors).toEqual([]);
});

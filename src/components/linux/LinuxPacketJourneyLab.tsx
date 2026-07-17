import { useEffect, useRef, useState } from "react";
import {
  NETWORK_GATEWAY_ADDRESS,
  NETWORK_GATEWAY_MAC,
  NETWORK_CLIENT_SOCKET_FD,
  NETWORK_LAB_PAYLOAD_BYTES,
  NETWORK_REMOTE_ADDRESS,
  NETWORK_REMOTE_HOSTNAME,
  NETWORK_REMOTE_PORT,
  NETWORK_SERVER_ACCEPTED_FD,
  NETWORK_SERVER_LISTENER_FD,
  acceptTcpConnection,
  canReceiveNetworkApplication,
  canMasterNetworkLab,
  connectTcpSocket,
  createNetworkingMachine,
  createTcpSocket,
  emptyNetworkLabEvidence,
  evaluateNetworkLabPrediction,
  fireTcpRetransmissionTimeout,
  mergeNetworkLabEvidence,
  receiveTcpApplication,
  resolveNetworkHost,
  sendTcpPayload,
  transmitTcpSegment,
  type NetworkLabEvidence,
  type NetworkLabPrediction,
  type NetworkMachine,
} from "../../features/linux-runtime/networking-from-a-packet";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { NetworkPacketTopologyView } from "./NetworkPacketTopologyView";

type Feedback = { correct: boolean; text: string };
type Layer = "socket" | "tcp" | "ip" | "ethernet";

const initialAnswers = {
  boundaryPath: "",
  localRoute: "",
  remoteRoute: "",
  segmentation: "",
  lossRecovery: "",
};

function predictionFrom(answers: typeof initialAnswers): NetworkLabPrediction {
  const boundaryCorrect = answers.boundaryPath === "fd-handshake-queue";
  const remoteCorrect = answers.remoteRoute === "default-gateway-preserve-ip";
  const segmentationCorrect = answers.segmentation === "mss-1460-syn-consumes-one";
  const recoveryCorrect = answers.lossRecovery === "gap-rto-cumulative";
  return {
    socketBoundary: boundaryCorrect ? "process-fd" : "packet-id",
    connectBoundary: boundaryCorrect ? "handshake-before-success" : "dns-means-connected",
    sendBoundary: boundaryCorrect ? "queued-not-delivered" : "peer-has-bytes",
    resolvedAddress: NETWORK_REMOTE_ADDRESS,
    routePrefixLength: remoteCorrect ? 0 : 24,
    nextHop: remoteCorrect ? NETWORK_GATEWAY_ADDRESS : NETWORK_REMOTE_ADDRESS,
    arpTarget: remoteCorrect ? NETWORK_GATEWAY_ADDRESS : NETWORK_REMOTE_ADDRESS,
    ethernetDestination: remoteCorrect ? NETWORK_GATEWAY_MAC : "02:00:00:00:00:20",
    ipDestination: remoteCorrect ? NETWORK_REMOTE_ADDRESS : NETWORK_GATEWAY_ADDRESS,
    mss: segmentationCorrect ? 1460 : 1486,
    segmentPayloads: segmentationCorrect ? [1460, 1460, 80] : [1500, 1500],
    segmentSequences: segmentationCorrect ? [1001, 2461, 3921] : [1000, 2460, 3920],
    ackAfterFirst: 2461,
    ackAfterGap: recoveryCorrect ? 2461 : 4001,
    retransmissionTrigger: recoveryCorrect ? "timeout" : "new-sequence",
    retransmitSequence: recoveryCorrect ? 2461 : 4001,
    finalAck: recoveryCorrect ? 4001 : 3921,
  };
}

export function LinuxPacketJourneyLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [machine, setMachine] = useState<NetworkMachine>(createNetworkingMachine);
  const [answers, setAnswers] = useState(initialAnswers);
  const [evidence, setEvidence] = useState<NetworkLabEvidence>(emptyNetworkLabEvidence);
  const [localRouteCorrect, setLocalRouteCorrect] = useState(false);
  const [inspectedLayers, setInspectedLayers] = useState<Layer[]>([]);
  const inspectedLayersRef = useRef<Layer[]>([]);
  const [selectedLayer, setSelectedLayer] = useState<Layer>("socket");
  const [segmentDisposition, setSegmentDisposition] = useState<"" | "deliver" | "drop">("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => {
    setFeedback(null);
    setEngineError("");
  }, [locale]);

  const publishCompletion = (
    nextMachine = machine,
    nextEvidence = evidence,
    nextLocal = localRouteCorrect,
    nextLayers = inspectedLayers,
  ) => {
    onCompletionChange(
      canMasterNetworkLab(nextMachine, nextEvidence)
      && nextLocal
      && nextLayers.length >= 2,
    );
  };

  const reset = () => {
    setMachine(createNetworkingMachine());
    setAnswers(initialAnswers);
    setEvidence(emptyNetworkLabEvidence);
    setLocalRouteCorrect(false);
    setInspectedLayers([]);
    inspectedLayersRef.current = [];
    setSelectedLayer("socket");
    setSegmentDisposition("");
    setFeedback(null);
    setEngineError("");
    onCompletionChange(false);
  };

  const updateAnswer = (key: keyof typeof answers, value: string) => {
    setAnswers((current) => ({ ...current, [key]: value }));
    setFeedback(null);
    setEvidence(emptyNetworkLabEvidence);
    setLocalRouteCorrect(false);
    setMachine(createNetworkingMachine());
    setInspectedLayers([]);
    inspectedLayersRef.current = [];
    setSegmentDisposition("");
    onCompletionChange(false);
  };

  const checkPrediction = () => {
    try {
      const evaluation = evaluateNetworkLabPrediction(machine, predictionFrom(answers));
      const localCorrect = answers.localRoute === "direct-24-peer";
      const nextEvidence = mergeNetworkLabEvidence(emptyNetworkLabEvidence, evaluation);
      setEvidence(nextEvidence);
      setLocalRouteCorrect(localCorrect);
      setEngineError("");
    publishCompletion(machine, nextEvidence, localCorrect, []);
      const correct = evaluation.correct && localCorrect;
      const groups = [
        evaluation.errors.some((error) => ["socket-boundary", "connect-boundary", "send-boundary"].includes(error))
          ? t("fd는 process-local 참조이고 connect는 handshake 뒤, send는 local queue 적재 뒤 반환합니다.", "An fd is process-local; connect returns after the handshake, while send returns after local enqueue.")
          : "",
        !localCorrect || evaluation.errors.some((error) => ["route-prefix", "next-hop", "arp-target", "ethernet-destination", "ip-destination"].includes(error))
          ? t("같은 link는 /24 direct peer이고, 원격은 /0 gateway MAC을 쓰되 endpoint IP를 보존합니다.", "The on-link host is a direct /24 peer; the remote host uses the /0 gateway MAC while retaining its endpoint IP.")
          : "",
        evaluation.errors.some((error) => ["mss", "segment-payloads", "segment-sequences"].includes(error))
          ? t("1500−IPv4 20−TCP 20=1460이며 SYN이 sequence 하나를 소비해 data는 1001부터 시작합니다.", "1500 minus 20-byte IPv4 and 20-byte TCP headers gives 1460; SYN consumes one sequence number, so data begins at 1001.")
          : "",
        evaluation.errors.some((error) => ["ack-after-first", "ack-after-gap", "retransmission-trigger", "retransmit-sequence", "final-ack"].includes(error))
          ? t("gap에서는 ACK 2461이 멈추고 RTO가 seq 2461을 재전송한 뒤 ACK 4001로 누적됩니다.", "The gap stalls ACK at 2461; RTO retransmits seq 2461 before the cumulative ACK advances to 4001.")
          : "",
      ].filter(Boolean);
      setFeedback({
        correct,
        text: correct
          ? t("예측이 맞았습니다. 같은 link는 /24 direct route와 peer MAC을, 원격 host는 /0 gateway와 gateway MAC을 사용하되 IP destination은 유지합니다. 이제 상태 전이를 직접 실행하세요.", "Prediction correct. The on-link host uses the direct /24 route and peer MAC; the remote host uses the /0 gateway and gateway MAC while retaining its IP destination. Now execute the state transitions.")
          : groups.join(" "),
      });
    } catch {
      setEngineError(t("네트워크 예측 모델을 실행하지 못했습니다. 실습 초기화 후 외부 네트워크 없이 다시 시작하세요.", "The network prediction model could not run. Reset the lab to restart without an external network."));
      onCompletionChange(false);
    }
  };

  const applyTransition = (label: string, action: (current: NetworkMachine) => { machine: NetworkMachine; ok: boolean; reason: string }) => {
    try {
      const transition = action(machine);
      setMachine(transition.machine);
      setEngineError("");
      publishCompletion(transition.machine);
      setFeedback({
        correct: transition.ok,
        text: transition.ok
          ? t(`${label} 상태 전이가 기록됐습니다. 아래 event와 socket·segment 상태에서 다음 경계를 확인하세요.`, `${label} was recorded. Inspect the event and socket or segment state below before crossing the next boundary.`)
          : t(`${label}을 실행할 수 없습니다: ${transition.reason}. 앞선 event와 현재 socket 상태를 확인하세요.`, `${label} cannot run: ${transition.reason}. Inspect the preceding event and current socket state.`),
      });
    } catch {
      setEngineError(t("결정론적 packet engine이 실패했습니다. 초기화하면 같은 fixture로 네트워크 없이 복구됩니다.", "The deterministic packet engine failed. Reset to recover the same fixture without a network."));
      onCompletionChange(false);
    }
  };

  const resolveHost = () => applyTransition(t("hostname 해석", "Hostname resolution"), (current) => resolveNetworkHost(current, NETWORK_REMOTE_HOSTNAME));
  const createSocket = () => applyTransition(t("socket 생성", "Socket creation"), createTcpSocket);
  const connect = () => applyTransition(t("route·ARP·handshake", "Route, ARP, and handshake"), (current) => connectTcpSocket(current, NETWORK_CLIENT_SOCKET_FD, NETWORK_REMOTE_ADDRESS, NETWORK_REMOTE_PORT));
  const accept = () => applyTransition(t("listener accept", "Listener accept"), (current) => acceptTcpConnection(current, NETWORK_SERVER_LISTENER_FD));
  const send = () => applyTransition(t("send queue 적재", "Send-queue enqueue"), (current) => sendTcpPayload(current, NETWORK_CLIENT_SOCKET_FD, NETWORK_LAB_PAYLOAD_BYTES));
  const transmitNext = () => {
    const segment = machine.segments.find((candidate) => candidate.transmissions === 0);
    if (!segment || !segmentDisposition) {
      setFeedback({ correct: false, text: t("다음 segment의 wire 결과를 전달 또는 유실로 먼저 예측하세요.", "Predict whether the next segment is delivered or dropped before transmitting it.") });
      return;
    }
    try {
      const transition = transmitTcpSegment(machine, NETWORK_CLIENT_SOCKET_FD, segment.index, segmentDisposition);
      const expected = segment.index === 1 ? "drop" : "deliver";
      const choiceCorrect = segmentDisposition === expected;
      setMachine(transition.machine);
      setSegmentDisposition("");
      setEngineError("");
      publishCompletion(transition.machine);
      setFeedback({
        correct: transition.ok && choiceCorrect,
        text: !transition.ok
          ? t(`segment 전이를 실행할 수 없습니다: ${transition.reason}.`, `The segment transition cannot run: ${transition.reason}.`)
          : choiceCorrect
            ? segment.index === 1
              ? t("두 번째 segment가 유실되어 ACK는 2461에 머뭅니다. 세 번째 segment를 보내 gap 뒤의 누적 ACK를 관찰하세요.", "The second segment was dropped, so ACK remains at 2461. Send the third segment and observe the cumulative ACK behind the gap.")
              : t(`segment ${segment.index + 1}을 전달했습니다. receiver의 next expected byte와 ACK가 어떻게 변했는지 확인하세요.`, `Segment ${segment.index + 1} was delivered. Inspect how the receiver's next expected byte and ACK changed.`)
            : t("이 선택으로도 실제 모델 상태는 바뀌었지만 필수 loss fixture와 다릅니다. event trace를 읽고 실습을 초기화해 첫째·셋째는 전달, 둘째는 유실로 인과를 다시 만드세요.", "The model recorded this choice, but it differs from the required loss fixture. Read the event trace, reset, and rebuild the causal path with the first and third delivered and the second dropped."),
      });
    } catch {
      setEngineError(t("segment 전송 모델이 실패했습니다. 실습을 초기화해 다시 시작하세요.", "The segment transmission model failed. Reset the lab and start again."));
      onCompletionChange(false);
    }
  };
  const fireRto = () => applyTransition("RTO", (current) => fireTcpRetransmissionTimeout(current, NETWORK_CLIENT_SOCKET_FD));

  const inspectLayer = (layer: Layer) => {
    const currentLayers = inspectedLayersRef.current;
    const nextLayers = currentLayers.includes(layer) ? currentLayers : [...currentLayers, layer];
    inspectedLayersRef.current = nextLayers;
    setSelectedLayer(layer);
    setInspectedLayers(nextLayers);
    publishCompletion(machine, evidence, localRouteCorrect, nextLayers);
    setFeedback({ correct: true, text: t(`${layer} 층의 주소와 상태를 열었습니다. 색이 아니라 아래 field 이름과 숫자로 경계를 확인하세요.`, `Opened the ${layer} layer. Use the field names and numbers below, not color alone, to inspect the boundary.`) });
  };

  const receiveApplication = () => {
    if (!canReceiveNetworkApplication(machine, evidence)) {
      setFeedback({ correct: false, text: t("ACK 4001까지의 유실 복구를 먼저 완료하세요. transport ACK 뒤에만 remote recv 경계를 실행할 수 있습니다.", "Complete loss recovery through ACK 4001 first. The remote recv boundary becomes available only after the transport acknowledgement.") });
      return;
    }
    try {
      const transition = receiveTcpApplication(machine, NETWORK_SERVER_ACCEPTED_FD, NETWORK_LAB_PAYLOAD_BYTES);
      setMachine(transition.machine);
      setEngineError("");
      publishCompletion(transition.machine);
      setFeedback({ correct: transition.ok, text: transition.ok ? t("remote PID 91의 accepted fd 5가 receive queue에서 3,000바이트를 꺼냈습니다. send 반환, TCP ACK와 application recv가 서로 다른 경계임을 실제 모델 상태로 증명했습니다.", "Accepted fd 5 in remote PID 91 removed 3,000 bytes from its receive queue. The model now proves send return, TCP acknowledgement, and application recv as distinct boundaries.") : t(`remote recv를 실행할 수 없습니다: ${transition.reason}.`, `Remote recv cannot run: ${transition.reason}.`) });
    } catch {
      setEngineError(t("application recv 전이를 실행하지 못했습니다. 초기화 후 다시 시작하세요.", "The application recv transition failed. Reset and start again."));
      onCompletionChange(false);
    }
  };

  const socket = machine.sockets.find((candidate) => candidate.fd === NETWORK_CLIENT_SOCKET_FD);
  const pending = machine.pendingTcpConnections.find((candidate) => candidate.listenerFd === NETWORK_SERVER_LISTENER_FD);
  const accepted = machine.acceptedSockets.find((candidate) => candidate.fd === NETWORK_SERVER_ACCEPTED_FD);
  const lastFrame = machine.frames.at(-1);
  const predictionReady = Object.values(evidence).every(Boolean) && localRouteCorrect;
  const transportReadyForRecv = canReceiveNetworkApplication(machine, evidence);
  const labMastered = canMasterNetworkLab(machine, evidence);
  const eventNames: Record<string, [string, string]> = {
    resolved: ["hostname 해석", "hostname resolved"],
    "socket-created": ["socket fd 생성", "socket fd created"],
    "route-selected": ["route 선택", "route selected"],
    "arp-request": ["ARP 요청", "ARP request"],
    "arp-reply": ["ARP 응답", "ARP reply"],
    "syn-sent": ["SYN 전송", "SYN sent"],
    "syn-ack-received": ["SYN-ACK 수신", "SYN-ACK received"],
    "handshake-ack-sent": ["handshake ACK", "handshake ACK"],
    "socket-established": ["socket 연결", "socket established"],
    "connection-queued-for-accept": ["accept queue 대기", "queued for accept"],
    "accepted-socket-created": ["accepted socket 생성", "accepted socket created"],
    "send-enqueued": ["send queue 적재", "send enqueued"],
    "segment-sent": ["segment 전송", "segment sent"],
    "segment-dropped": ["segment 유실", "segment dropped"],
    "ack-received": ["누적 ACK", "cumulative ACK"],
    "retransmission-timeout": ["재전송 timeout", "retransmission timeout"],
    "segment-retransmitted": ["segment 재전송", "segment retransmitted"],
    "application-received": ["application recv", "application recv"],
  };
  const canResolve = predictionReady && !machine.events.some((event) => event.kind === "resolved");
  const canCreateSocket = machine.events.some((event) => event.kind === "resolved") && machine.sockets.length === 0;
  const canConnect = machine.sockets.length > 0 && socket?.state === "closed";
  const canAccept = socket?.state === "established" && Boolean(pending) && !accepted;
  const canSend = socket?.state === "established" && accepted?.state === "established" && machine.segments.length === 0;
  const canTransmitNext = machine.segments.length === 3 && machine.segments.some((segment) => segment.transmissions === 0);
  const canFireRto = machine.segments.length === 3
    && machine.segments.every((segment) => segment.transmissions > 0)
    && !machine.events.some((event) => event.kind === "retransmission-timeout");
  const runWhen = (allowed: boolean, blockedKo: string, blockedEn: string, action: () => void) => {
    if (allowed) action();
    else setFeedback({ correct: false, text: t(blockedKo, blockedEn) });
  };

  return (
    <InteractiveLab
      kicker={t("필수 실습 · SOCKET → ROUTE → TCP → RECV", "REQUIRED LAB · SOCKET → ROUTE → TCP → RECV")}
      title={t("한 payload의 경로를 예측하고 유실을 복구하세요", "Predict one payload's path and recover its loss")}
      description={t("같은 link와 gateway 경로를 먼저 예측한 뒤, socket fd 4 생성부터 handshake·accept·send·세 segment·RTO·remote recv를 인과 순서로 실행해야 완료됩니다.", "First predict both on-link and gateway paths, then execute socket fd 4 creation, the handshake, accept, send, three segments, RTO, and remote recv in causal order.")}
      className="network-journey-lab"
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t("실습 초기화", "Reset lab")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="network-runtime-fallback" role="alert"><strong>{t("runtime fallback", "Runtime fallback")}</strong><p>{engineError}</p><button type="button" className="button button-secondary" onClick={reset}>{t("결정론적 모델 다시 시작", "Restart deterministic model")}</button></div> : null}

      <div className="network-fixture-bar"><span>IPv4 · MTU 1500 · {NETWORK_LAB_PAYLOAD_BYTES} B</span><strong>{NETWORK_REMOTE_HOSTNAME} → {NETWORK_REMOTE_ADDRESS}:{NETWORK_REMOTE_PORT}<br />10.0.0.1 → {NETWORK_GATEWAY_MAC}</strong></div>
      <fieldset className="network-prediction-fieldset">
        <legend>{t("실행 전 예측 — 모든 결과는 제출 뒤에만 공개됩니다", "Pre-run prediction — results appear only after submission")}</legend>
        <div className="network-prediction-grid">
          <label><span>{t("fd · connect · send 경계", "Fd, connect, and send boundaries")}</span><select aria-label={t("socket syscall 경계 예측", "Predict socket syscall boundaries")} value={answers.boundaryPath} onChange={(event) => updateAnswer("boundaryPath", event.target.value)}><option value="">—</option><option value="fd-handshake-queue">{t("fd는 local 참조 · connect는 handshake · send는 local queue", "Fd is local · connect waits for handshake · send enqueues locally")}</option><option value="wire-dns-delivered">{t("fd가 wire로 이동 · 이름 해석 뒤 연결 · send는 remote 처리", "Fd travels on wire · name resolution connects · send proves remote processing")}</option></select></label>
          <label><span>{t("same-link 10.0.0.42", "Same-link 10.0.0.42")}</span><select aria-label={t("같은 link 경로 예측", "Predict on-link route")} value={answers.localRoute} onChange={(event) => updateAnswer("localRoute", event.target.value)}><option value="">—</option><option value="direct-24-peer">/24 direct · next hop 10.0.0.42 · peer MAC</option><option value="default-gateway">/0 via 10.0.0.1 · gateway MAC</option></select></label>
          <label><span>{t("remote route · frame", "Remote route and frame")}</span><select aria-label={t("원격 route와 주소 경계 예측", "Predict remote route and addressing boundaries")} value={answers.remoteRoute} onChange={(event) => updateAnswer("remoteRoute", event.target.value)}><option value="">—</option><option value="default-gateway-preserve-ip">/0 via 10.0.0.1 · gateway MAC · IP dst 203.0.113.20</option><option value="direct-server-rewrite-ip">/24 direct · server MAC · IP dst 10.0.0.1</option></select></label>
          <label><span>{t("MTU · MSS · sequence", "MTU, MSS, and sequence")}</span><select aria-label={t("TCP segmentation 예측", "Predict TCP segmentation")} value={answers.segmentation} onChange={(event) => updateAnswer("segmentation", event.target.value)}><option value="">—</option><option value="mss-1460-syn-consumes-one">MSS 1460 · payload 1460/1460/80 · seq 1001/2461/3921</option><option value="mtu-1500-syn-free">MSS 1486 · payload 1500/1500 · seq 1000/2460/3920</option></select></label>
          <label><span>{t("gap · RTO · cumulative ACK", "Gap, RTO, and cumulative ACK")}</span><select aria-label={t("TCP 유실 복구 예측", "Predict TCP loss recovery")} value={answers.lossRecovery} onChange={(event) => updateAnswer("lossRecovery", event.target.value)}><option value="">—</option><option value="gap-rto-cumulative">ACK 2461 → 2461 · RTO seq 2461 · final ACK 4001</option><option value="skip-gap-new-sequence">ACK 2461 → 4001 · new seq 4001 · final ACK 3921</option></select></label>
        </div>
        <button type="button" className="button button-primary network-prediction-submit" onClick={checkPrediction}>{t("두 경로·TCP 예측 판정", "Check both paths and TCP prediction")}</button>
      </fieldset>

      {feedback ? <p className={`network-live-feedback ${feedback.correct ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">{feedback.text}</p> : <p className="network-live-feedback" role="status" aria-live="polite">{t("힌트: MTU는 IP packet의 최대 크기입니다. Ethernet header 14바이트는 MSS 계산에서 빼지 않습니다.", "Hint: MTU limits the IP packet. Do not subtract the 14-byte Ethernet header when computing MSS.")}</p>}

      <p id="network-step-guidance" className="sr-only">{t("현재 순서보다 이른 단계를 실행하면 live feedback이 필요한 선행 상태를 설명합니다.", "Activating a step before its turn makes the live feedback explain the missing prerequisite.")}</p>
      <div className="network-action-grid" role="group" aria-label={t("네트워크 상태 전이", "Network state transitions")}>
        <button type="button" className="button button-secondary" aria-disabled={!canResolve} aria-describedby="network-step-guidance" onClick={() => runWhen(canResolve, "두 route와 TCP 예측을 먼저 맞히세요.", "Correct both route and TCP predictions first.", resolveHost)}>1 · {t("고정 hostname mapping 읽기", "Read fixed hostname mapping")}</button>
        <button type="button" className="button button-secondary" aria-disabled={!canCreateSocket} aria-describedby="network-step-guidance" onClick={() => runWhen(canCreateSocket, "고정 hostname mapping을 먼저 읽으세요.", "Read the fixed hostname mapping first.", createSocket)}>2 · socket() → fd 4</button>
        <button type="button" className="button button-secondary" aria-disabled={!canConnect} aria-describedby="network-step-guidance" onClick={() => runWhen(canConnect, "client socket fd 4를 먼저 만드세요.", "Create client socket fd 4 first.", connect)}>3 · route · ARP · handshake → accept queue</button>
        <button type="button" className="button button-secondary" aria-disabled={!canAccept} aria-describedby="network-step-guidance" onClick={() => runWhen(canAccept, "handshake를 완료해 listener의 accept queue에 연결을 먼저 넣으세요.", "Complete the handshake so the connection reaches the listener's accept queue first.", accept)}>4 · accept(fd 3) → fd 5</button>
        <button type="button" className="button button-secondary" aria-disabled={!canSend} aria-describedby="network-step-guidance" onClick={() => runWhen(canSend, "listener fd 3에서 accept를 실행해 connected fd 5를 먼저 만드세요.", "Run accept on listener fd 3 to create connected fd 5 first.", send)}>5 · send(3000)</button>
        <label className="network-disposition-control"><span>{t("다음 segment의 wire 결과", "Next segment wire result")}</span><select aria-label={t("다음 segment 전달 또는 유실 선택", "Choose delivery or loss for next segment")} value={segmentDisposition} disabled={machine.segments.length !== 3 || machine.segments.every((segment) => segment.transmissions > 0)} onChange={(event) => setSegmentDisposition(event.target.value as "" | "deliver" | "drop")}><option value="">—</option><option value="deliver">{t("전달", "Deliver")}</option><option value="drop">{t("유실", "Drop")}</option></select></label>
        <button type="button" className="button button-secondary" aria-disabled={!canTransmitNext} aria-describedby="network-step-guidance" onClick={() => runWhen(canTransmitNext, "send(3000)으로 세 sequence range를 먼저 만드세요.", "Create the three sequence ranges with send(3000) first.", transmitNext)}>6–8 · {t("다음 segment 전송", "Transmit next segment")}</button>
        <button type="button" className="button button-primary" aria-disabled={!canFireRto} aria-describedby="network-step-guidance" onClick={() => runWhen(canFireRto, "세 segment의 첫 wire 결과를 모두 결정한 뒤 gap timeout을 실행하세요.", "Choose the first wire result for all three segments before firing the gap timeout.", fireRto)}>9 · RTO · {t("첫 gap 재전송", "Retransmit first gap")}</button>
      </div>

      <NetworkPacketTopologyView machine={machine} locale={locale} />

      <div className="network-state-grid" role="group" aria-label={t("socket, route와 TCP 상태", "Socket, route, and TCP state")}>
        <article><span>CLIENT PID 73</span><strong>fd 3 {t("regular file", "regular file")} → buffer → fd 4 socket</strong><p>{t("fd 번호는 이 프로세스 안에서만 의미가 있습니다.", "Fd numbers have meaning only inside this process.")}</p></article>
        <article><span>KERNEL SOCKET</span><strong>{socket?.state ?? "closed"}</strong><p>{socket?.localAddress ?? "—"}:{socket?.localPort ?? "—"} → {socket?.remoteAddress ?? "—"}:{socket?.remotePort ?? "—"}</p></article>
        <article><span>ROUTE · NEIGHBOR</span><strong>{socket?.nextHop ?? "—"}</strong><p>{socket?.interfaceId ?? "—"} · {socket?.nextHopMac ?? "—"}</p></article>
        <article><span>TCP BYTE STATE</span><strong>snd_una {socket?.sendUnacknowledged ?? 1000} · snd_nxt {socket?.sendNext ?? 1000}</strong><p>receiver next {socket?.receiverNextExpected ?? 1001}</p></article>
        <article><span>SERVER PID 91</span><strong>{machine.listeners[0] ? `listener fd ${machine.listeners[0].fd} · ${machine.listeners[0].state.toUpperCase()}` : t("listener 없음", "no listener")}</strong><p>{accepted ? `accepted fd ${accepted.fd} · ${accepted.state.toUpperCase()}` : pending ? `${t("accept queue", "accept queue")} 1 · ${t("fd 미할당", "fd not assigned")}` : t("accept queue 대기", "waiting for accept queue")}</p></article>
        <article><span>APPLICATION DELIVERY</span><strong>{accepted?.applicationReceivedBytes ? `recv(fd ${accepted.fd}) → ${accepted.applicationReceivedBytes} B` : `${t("receive queue", "receive queue")} ${accepted?.receiveQueueBytes ?? 0} B`}</strong><p>{t("TCP ACK만으로 application의 byte 인수나 처리를 증명하지 않습니다.", "A TCP ACK alone proves neither application receipt nor processing.")}</p></article>
      </div>

      <div className="network-segment-grid" role="group" aria-label={t("TCP segment 상태", "TCP segment state")}>
        {machine.segments.length === 0 ? <p>{t("send를 실행하면 sequence 범위가 여기에 나타납니다.", "Sequence ranges appear here after send runs.")}</p> : machine.segments.map((segment) => <article key={segment.id} className={segment.acknowledged ? "is-acknowledged" : segment.firstDisposition === "dropped" ? "is-dropped" : undefined}><span>SEGMENT {segment.index + 1}</span><strong>[{segment.sequenceStart}, {segment.sequenceEnd}) · {segment.payloadBytes} B</strong><p>{t("전송", "tx")} {segment.transmissions} · {segment.firstDisposition === "queued" ? t("대기", "queued") : segment.firstDisposition === "delivered" ? t("전달", "delivered") : t("유실", "dropped")} · ACK {segment.acknowledged ? t("완료", "yes") : t("대기", "pending")}</p></article>)}
      </div>

      <div className="network-layer-inspector">
        <div className="network-layer-tabs" role="group" aria-label={t("frame layer 검사", "Inspect frame layers")}>
          {(["socket", "tcp", "ip", "ethernet"] as const).map((layer) => <button type="button" key={layer} aria-pressed={selectedLayer === layer} className={inspectedLayers.includes(layer) ? "is-inspected" : undefined} onClick={() => inspectLayer(layer)}>{layer}</button>)}
        </div>
        <div className="network-layer-detail" role="group" aria-label={t("선택한 network layer 상세", "Selected network layer detail")}>
          {selectedLayer === "socket" ? <><span>PROCESS → KERNEL</span><strong>fd 4 → TCP socket</strong><p>{t("process-local descriptor · wire field 아님", "Process-local descriptor · not an on-wire field")}</p></> : null}
          {selectedLayer === "tcp" ? <><span>TCP HEADER · BYTE STREAM</span><strong>{lastFrame ? `${lastFrame.sourcePort} → ${lastFrame.destinationPort} · seq ${lastFrame.sequenceStart}` : "49152 → 443"}</strong><p>{t("port와 sequence는 end-to-end transport 상태입니다.", "Ports and sequence numbers are end-to-end transport state.")}</p></> : null}
          {selectedLayer === "ip" ? <><span>IPV4 HEADER</span><strong>{lastFrame ? `${lastFrame.sourceIp} → ${lastFrame.destinationIp} · TTL ${lastFrame.ttl}` : "10.0.0.10 → 203.0.113.20"}</strong><p>{t("router는 TTL을 줄이지만 이 no-NAT fixture의 destination IP는 유지합니다.", "A router decrements TTL while this no-NAT fixture retains the destination IP.")}</p></> : null}
          {selectedLayer === "ethernet" ? <><span>ETHERNET HEADER · FCS EXCLUDED</span><strong>{lastFrame ? `${lastFrame.sourceMac} → ${lastFrame.destinationMac}` : `${NETWORK_GATEWAY_MAC} next hop`}</strong><p>{lastFrame ? `${lastFrame.ethernetBytesBeforeFcs} B ${t("before FCS", "before FCS")}` : t("gateway MAC은 첫 link의 목적지입니다.", "The gateway MAC is the first-link destination.")}</p></> : null}
        </div>
      </div>

      <div className="network-event-trace" role="group" aria-label={t("텍스트 네트워크 event trace", "Text network event trace")}>
        <strong>{t("텍스트 event trace", "TEXT EVENT TRACE")}</strong>
        {machine.events.length === 0 ? <p>{t("예측 뒤 첫 단계를 실행하세요. 이 목록은 시각 상태와 같은 정보를 문자로 제공합니다.", "Run the first step after prediction. This list provides the same information as the visual state in text.")}</p> : <ol>{machine.events.map((event) => <li key={event.order}><span>{String(event.order).padStart(2, "0")}</span><strong>{t(...(eventNames[event.kind] ?? [event.kind, event.kind]))}</strong><code>{[event.address, event.nextHop, event.mac, event.sequenceStart, event.acknowledgement, event.payloadBytes].filter((value) => value !== undefined).join(" · ")}</code></li>)}</ol>}
      </div>

      <button type="button" className="button button-primary network-recv-action" aria-disabled={!transportReadyForRecv} aria-describedby="network-step-guidance" onClick={receiveApplication}>{labMastered ? t("remote recv 완료", "Remote recv complete") : t("10 · accepted fd 5에서 recv 실행", "10 · Run recv on accepted fd 5")}</button>
      <div className="network-evidence" role="group" aria-label={t("필수 실습 완료 증거", "Required lab completion evidence")}>
        <span className={localRouteCorrect ? "is-complete" : undefined}>{localRouteCorrect ? "✓" : "○"} {t("같은 link route 예측", "On-link route prediction")}</span>
        <span className={Object.values(evidence).every(Boolean) ? "is-complete" : undefined}>{Object.values(evidence).every(Boolean) ? "✓" : "○"} {t("원격 path·TCP 예측", "Remote path and TCP prediction")}</span>
        <span className={transportReadyForRecv || labMastered ? "is-complete" : undefined}>{transportReadyForRecv || labMastered ? "✓" : "○"} {t("유실·RTO 인과 trace", "Causal loss and RTO trace")}</span>
        <span className={inspectedLayers.length >= 2 ? "is-complete" : undefined}>{inspectedLayers.length >= 2 ? "✓" : "○"} {t("서로 다른 layer 2개 검사", "Inspect two distinct layers")}</span>
        <span className={labMastered ? "is-complete" : undefined}>{labMastered ? "✓" : "○"} {t("remote application recv", "Remote application recv")}</span>
      </div>
      {labMastered && inspectedLayers.length >= 2 ? <p className="network-lab-mastered" role="status">{t("필수 실습 완료 — fd에서 gateway frame, TCP gap 복구와 remote recv까지 인과 상태로 증명했습니다.", "Required lab complete — you proved the causal state from fd through the gateway frame, TCP gap recovery, and remote recv.")}</p> : null}
      <noscript><p>{t("JavaScript 없이도 위의 packet 경계 설명은 읽을 수 있습니다. 상호작용을 켜면 상태 전이를 직접 검증할 수 있습니다.", "The packet-boundary explanation remains readable without JavaScript. Enable interaction to verify the state transitions directly.")}</p></noscript>
    </InteractiveLab>
  );
}

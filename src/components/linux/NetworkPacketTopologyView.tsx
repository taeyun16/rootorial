import { useId } from "react";
import {
  NETWORK_CLIENT_ADDRESS,
  NETWORK_CLIENT_ISN,
  NETWORK_CLIENT_MAC,
  NETWORK_EPHEMERAL_PORT,
  NETWORK_GATEWAY_ADDRESS,
  NETWORK_GATEWAY_MAC,
  NETWORK_LAB_PAYLOAD_BYTES,
  NETWORK_REMOTE_ADDRESS,
  NETWORK_REMOTE_PORT,
  type NetworkMachine,
} from "../../features/linux-runtime/networking-from-a-packet";
import {
  buildNetworkPacketVisualState,
  type NetworkPacketVisualPhase,
  type NetworkPacketVisualSegment,
} from "../../features/linux-runtime/network-packet-visual";
import type { Locale } from "../../features/localization/localization";

type Props = {
  machine: NetworkMachine;
  locale: Locale;
};

const TIMELINE_X = 54;
const TIMELINE_WIDTH = 792;
const TIMELINE_START = NETWORK_CLIENT_ISN + 1;
const TIMELINE_END = TIMELINE_START + NETWORK_LAB_PAYLOAD_BYTES;

function timelineX(sequence: number) {
  return TIMELINE_X
    + ((sequence - TIMELINE_START) / (TIMELINE_END - TIMELINE_START)) * TIMELINE_WIDTH;
}

export function NetworkPacketTopologyView({ machine, locale }: Props) {
  const id = useId().replaceAll(":", "");
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const visual = buildNetworkPacketVisualState(machine);
  const latestAck = visual.transport.latestAcknowledgement;
  const duplicateAck = visual.transport.acknowledgements.some((ack) => ack.duplicate);
  const routeActive = visual.route.selected;
  const serverActive = visual.client.state === "established";
  const frameActive = visual.frame !== null;

  const phaseNames: Record<NetworkPacketVisualPhase, [string, string]> = {
    idle: ["실행 대기", "Waiting"],
    resolved: ["이름 해석", "Resolved"],
    "socket-created": ["local socket", "Local socket"],
    connected: ["연결 완료", "Connected"],
    "accept-queued": ["accept queue", "Accept queue"],
    accepted: ["accepted fd", "Accepted fd"],
    queued: ["send queue", "Send queue"],
    transmitting: ["전송 중", "Transmitting"],
    gap: ["TCP gap", "TCP gap"],
    recovered: ["누적 ACK 복구", "Cumulative ACK recovered"],
    received: ["application recv", "Application recv"],
    reset: ["연결 거부", "Connection reset"],
  };

  const currentState = (() => {
    switch (visual.phase) {
      case "idle":
        return t(
          "아직 client 경로를 실행하지 않았습니다. remote listener fd 3만 LISTEN 중입니다.",
          "The client path has not run yet. Only remote listener fd 3 is in LISTEN.",
        );
      case "resolved":
        return t(
          `고정 resolver가 ${NETWORK_REMOTE_ADDRESS}를 반환했습니다. 아직 socket과 packet은 없습니다.`,
          `The fixed resolver returned ${NETWORK_REMOTE_ADDRESS}. There is no socket or packet yet.`,
        );
      case "socket-created":
        return t(
          `PID 73에 local socket fd ${visual.client.fd ?? 4}가 생겼습니다. fd 자체는 wire를 건너지 않습니다.`,
          `PID 73 now owns local socket fd ${visual.client.fd ?? 4}. The fd itself never crosses the wire.`,
        );
      case "connected":
        return t(
          "TCP handshake가 끝났지만 application recv와는 아직 별개입니다.",
          "The TCP handshake completed, but application recv is still a separate boundary.",
        );
      case "accept-queued":
        return t(
          `handshake가 끝나 연결이 listener fd ${visual.server.listenerFd ?? 3}의 accept queue에 있습니다.`,
          `The handshake completed and the connection is waiting in listener fd ${visual.server.listenerFd ?? 3}'s accept queue.`,
        );
      case "accepted":
        return t(
          `remote PID 91에 accepted fd ${visual.server.acceptedFd ?? 5}가 생겼습니다. payload는 아직 send queue에 없습니다.`,
          `Remote PID 91 now owns accepted fd ${visual.server.acceptedFd ?? 5}. No payload is in the send queue yet.`,
        );
      case "queued":
        return t(
          "send(3000)은 세 TCP 구간을 local queue에 넣었습니다. 아직 wire 전달은 증명되지 않았습니다.",
          "send(3000) put three TCP ranges in the local queue. Wire delivery is not proven yet.",
        );
      case "transmitting":
        return t(
          `연속 수신 구간까지 누적 ACK ${latestAck ?? visual.transport.sendUnacknowledged}가 돌아왔습니다.`,
          `Cumulative ACK ${latestAck ?? visual.transport.sendUnacknowledged} covers the contiguous received range.`,
        );
      case "gap":
        return duplicateAck
          ? t(
              `두 번째 구간이 비어 세 번째 구간은 순서 밖 buffer에 있습니다. duplicate ACK ${latestAck ?? 2461}가 gap을 가리킵니다.`,
              `The second range is missing, so the third is buffered out of order. Duplicate ACK ${latestAck ?? 2461} points to the gap.`,
            )
          : t(
              `두 번째 구간이 유실되었습니다. 누적 ACK ${latestAck ?? visual.transport.sendUnacknowledged}는 첫 gap에서 멈춥니다.`,
              `The second range was dropped. Cumulative ACK ${latestAck ?? visual.transport.sendUnacknowledged} stops at the first gap.`,
            );
      case "recovered":
        return t(
          `RTO가 [${visual.transport.timeoutSequence ?? 2461}, 3921)을 재전송했고 누적 ACK ${latestAck ?? 4001}가 전체 byte stream을 확인했습니다.`,
          `RTO retransmitted [${visual.transport.timeoutSequence ?? 2461}, 3921), and cumulative ACK ${latestAck ?? 4001} confirmed the full byte stream.`,
        );
      case "received":
        return t(
          `recv(fd ${visual.server.acceptedFd ?? 5})가 kernel queue에서 ${visual.server.applicationReceivedBytes} B를 application으로 옮겼습니다.`,
          `recv(fd ${visual.server.acceptedFd ?? 5}) moved ${visual.server.applicationReceivedBytes} B from the kernel queue to the application.`,
        );
      case "reset":
        return t(
          "route와 neighbor는 찾았지만 matching listener가 없어 RST를 받았습니다.",
          "The route and neighbor resolved, but no matching listener existed, so the socket received RST.",
        );
    }
  })();

  const topologyDescription = t(
    `${currentState} Ethernet 관측 범위는 client eth0에서 gateway ${visual.route.nextHop ?? NETWORK_GATEWAY_ADDRESS}까지이며, end-to-end IPv4 목적지는 ${NETWORK_REMOTE_ADDRESS}입니다.`,
    `${currentState} The observed Ethernet scope runs from client eth0 to gateway ${visual.route.nextHop ?? NETWORK_GATEWAY_ADDRESS}, while the end-to-end IPv4 destination remains ${NETWORK_REMOTE_ADDRESS}.`,
  );

  const segmentState = (segment: NetworkPacketVisualSegment) => {
    switch (segment.status) {
      case "queued":
        return t("send queue 대기", "Waiting in send queue");
      case "sent":
        return t("wire 전송", "Sent on wire");
      case "buffered":
        return t(
          `순서 밖 buffer · duplicate ACK ${latestAck ?? 2461}`,
          `Out-of-order buffer · duplicate ACK ${latestAck ?? 2461}`,
        );
      case "dropped":
        return t(
          `첫 전송 유실 · ACK ${latestAck ?? visual.transport.sendUnacknowledged}에서 정지`,
          `First transmission dropped · ACK stopped at ${latestAck ?? visual.transport.sendUnacknowledged}`,
        );
      case "acknowledged":
        return t("전달 · 누적 ACK 완료", "Delivered · cumulatively acknowledged");
      case "recovered":
        return t(
          "첫 전송 유실 · RTO 재전송 · ACK 완료",
          "First transmission dropped · RTO retransmission · acknowledged",
        );
    }
  };

  const topologyTitleId = `${id}-topology-title`;
  const topologyDescriptionId = `${id}-topology-description`;
  const timelineTitleId = `${id}-timeline-title`;
  const timelineDescriptionId = `${id}-timeline-description`;
  const arrowId = `${id}-arrow`;
  const recoveredPatternId = `${id}-recovered-pattern`;
  const clientEndpoint = visual.client.localAddress
    ? `${visual.client.localAddress}:${visual.client.localPort ?? NETWORK_EPHEMERAL_PORT}`
    : `${NETWORK_CLIENT_ADDRESS}:${NETWORK_EPHEMERAL_PORT}`;
  const serverEndpoint = `${visual.client.remoteAddress ?? NETWORK_REMOTE_ADDRESS}:${visual.client.remotePort ?? NETWORK_REMOTE_PORT}`;

  return (
    <figure
      className="network-packet-visualization"
      data-testid="network-packet-visualization"
      data-network-phase={visual.phase}
    >
      <figcaption className="network-packet-visual-heading">
        <span>{t("LIVE PROJECTION · NETWORKMACHINE 1개", "LIVE PROJECTION · ONE NETWORKMACHINE")}</span>
        <div>
          <strong>{t("packet 경로와 TCP ACK gap", "Packet path and TCP ACK gap")}</strong>
          <em data-phase={visual.phase}>{t(...phaseNames[visual.phase])}</em>
        </div>
        <p>{t(
          "아래 그림은 별도 animation 상태가 아니라 이 실습의 socket·route·frame·ACK 상태를 그대로 투영합니다.",
          "The view below projects this lab's socket, route, frame, and ACK state without separate animation state.",
        )}</p>
      </figcaption>

      <div className="network-packet-visual-grid">
        <section className="network-topology-panel" aria-label={t("packet 경로 패널", "Packet path panel")}>
          <header>
            <span>01 · TOPOLOGY</span>
            <strong>{t("L2 first hop과 end-to-end L3/L4", "L2 first hop and end-to-end L3/L4")}</strong>
          </header>
          <svg
            className="network-packet-topology"
            viewBox="0 0 900 310"
            role="img"
            aria-labelledby={`${topologyTitleId} ${topologyDescriptionId}`}
            focusable="false"
          >
            <title id={topologyTitleId}>{t("패킷 경로 토폴로지", "Packet path topology")}</title>
            <desc id={topologyDescriptionId}>{topologyDescription}</desc>
            <defs>
              <marker id={arrowId} viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" />
              </marker>
            </defs>

            <path className={`network-topology-link network-topology-l2 ${routeActive ? "is-active" : ""}`} d="M 270 146 L 365 146" markerEnd={`url(#${arrowId})`} />
            <path className={`network-topology-link network-topology-forward ${serverActive ? "is-active" : ""}`} d="M 535 146 L 630 146" markerEnd={`url(#${arrowId})`} />
            <path className={`network-topology-link network-topology-endpoint ${serverActive ? "is-active" : ""}`} d="M 180 262 C 330 300, 570 300, 720 262" markerEnd={`url(#${arrowId})`} />

            <text className="network-topology-edge-label" x="318" y="128" textAnchor="middle">L2 FRAME</text>
            <text className="network-topology-edge-value" x="318" y="164" textAnchor="middle">{visual.route.nextHopMac ?? "MAC —"}</text>
            <text className="network-topology-edge-label" x="582" y="128" textAnchor="middle">{t("개념적 forwarding", "CONCEPTUAL FORWARDING")}</text>
            <text className="network-topology-edge-value" x="582" y="164" textAnchor="middle">{t("추가 frame 미모델링", "NO SECOND FRAME MODELED")}</text>
            <text className="network-topology-edge-label" x="450" y="286" textAnchor="middle">END-TO-END IPv4/TCP · {clientEndpoint} → {serverEndpoint}</text>

            <g className={`network-topology-node network-topology-client ${visual.client.fd !== null ? "is-active" : ""}`}>
              <rect x="30" y="44" width="240" height="192" rx="12" />
              <text className="network-topology-kicker" x="52" y="72">CLIENT · PID 73</text>
              <text className="network-topology-title" x="52" y="103">fd {visual.client.fd ?? "—"} · {visual.client.state.toUpperCase()}</text>
              <line x1="52" y1="118" x2="248" y2="118" />
              <text className="network-topology-label" x="52" y="143">KERNEL SOCKET</text>
              <text className="network-topology-value" x="52" y="163">{clientEndpoint}</text>
              <text className="network-topology-label" x="52" y="190">eth0 · {NETWORK_CLIENT_ADDRESS}/24</text>
              <text className="network-topology-value" x="52" y="210">{NETWORK_CLIENT_MAC}</text>
            </g>

            <g className={`network-topology-node network-topology-gateway ${routeActive ? "is-active" : ""}`}>
              <rect x="365" y="82" width="170" height="154" rx="12" />
              <text className="network-topology-kicker" x="450" y="110" textAnchor="middle">FIRST HOP</text>
              <text className="network-topology-title" x="450" y="140" textAnchor="middle">{visual.route.nextHop ?? NETWORK_GATEWAY_ADDRESS}</text>
              <text className="network-topology-label" x="450" y="166" textAnchor="middle">{visual.route.interfaceId ?? "eth0"} · /{visual.route.prefixLength ?? 0}</text>
              <text className="network-topology-value" x="450" y="190" textAnchor="middle">{visual.route.nextHopMac ?? NETWORK_GATEWAY_MAC}</text>
              <text className="network-topology-label" x="450" y="216" textAnchor="middle">{visual.route.resolution === "cache-hit" ? "NEIGHBOR CACHE" : visual.route.resolution === "arp" ? "ARP RESOLVED" : "ROUTE WAITING"}</text>
            </g>

            <g className={`network-topology-node network-topology-server ${serverActive ? "is-active" : ""}`}>
              <rect x="630" y="44" width="240" height="192" rx="12" />
              <text className="network-topology-kicker" x="652" y="72">REMOTE · PID 91</text>
              <text className="network-topology-title" x="652" y="103">{NETWORK_REMOTE_ADDRESS}:{NETWORK_REMOTE_PORT}</text>
              <line x1="652" y1="118" x2="848" y2="118" />
              <text className="network-topology-label" x="652" y="143">fd {visual.server.listenerFd ?? 3} · {visual.server.listenerState.toUpperCase()}</text>
              <text className="network-topology-value" x="652" y="166">{visual.server.acceptedFd !== null ? `accepted fd ${visual.server.acceptedFd}` : visual.server.acceptQueueDepth > 0 ? `accept queue ${visual.server.acceptQueueDepth}` : "accepted fd —"}</text>
              <text className="network-topology-label" x="652" y="190">KERNEL QUEUE · {visual.server.receiveQueueBytes} B</text>
              <text className="network-topology-value" x="652" y="212">APPLICATION · {visual.server.applicationReceivedBytes} B</text>
            </g>

            {frameActive ? (
              <g className={`network-packet-marker ${visual.frame?.retransmission ? "is-retransmission" : ""}`} data-packet-marker="true" transform="translate(316 146)">
                <circle r="17" />
                <text x="0" y="3" textAnchor="middle">{visual.frame?.retransmission ? "RE" : "TX"}</text>
              </g>
            ) : null}
          </svg>
          <div
            className="network-topology-mobile"
            role="img"
            aria-label={`${t("패킷 경로 토폴로지", "Packet path topology")}. ${topologyDescription}`}
          >
            <article className={visual.client.fd !== null ? "is-active" : undefined}>
              <span>CLIENT · PID 73</span>
              <strong>fd {visual.client.fd ?? "—"} · {visual.client.state.toUpperCase()}</strong>
              <p>{clientEndpoint}<br />eth0 · {NETWORK_CLIENT_ADDRESS}/24</p>
            </article>
            <div className={routeActive ? "network-topology-mobile-link is-active" : "network-topology-mobile-link"} aria-hidden="true">
              <span>↓</span><small>L2 · {visual.route.nextHopMac ?? "MAC —"}</small>
            </div>
            <article className={routeActive ? "is-active" : undefined}>
              <span>FIRST HOP</span>
              <strong>{visual.route.nextHop ?? NETWORK_GATEWAY_ADDRESS}</strong>
              <p>{visual.route.nextHopMac ?? NETWORK_GATEWAY_MAC}<br />{visual.route.resolution === "cache-hit" ? "NEIGHBOR CACHE" : visual.route.resolution === "arp" ? "ARP RESOLVED" : "ROUTE WAITING"}</p>
            </article>
            <div className={serverActive ? "network-topology-mobile-link is-active" : "network-topology-mobile-link"} aria-hidden="true">
              <span>↓</span><small>{t("개념적 forwarding · 추가 frame 미모델링", "Conceptual forwarding · no second frame modeled")}</small>
            </div>
            <article className={serverActive ? "is-active" : undefined}>
              <span>REMOTE · PID 91</span>
              <strong>{NETWORK_REMOTE_ADDRESS}:{NETWORK_REMOTE_PORT}</strong>
              <p>fd {visual.server.listenerFd ?? 3} · {visual.server.listenerState.toUpperCase()}<br />{visual.server.acceptedFd !== null ? `accepted fd ${visual.server.acceptedFd}` : visual.server.acceptQueueDepth > 0 ? `accept queue ${visual.server.acceptQueueDepth}` : "accepted fd —"}</p>
            </article>
            <p className="network-topology-mobile-endpoint">IPv4/TCP · {clientEndpoint} → {serverEndpoint}</p>
          </div>
          <dl className="network-topology-facts">
            <div><dt>ETHERNET dst</dt><dd>{visual.frame?.destinationMac ?? visual.route.nextHopMac ?? "—"}</dd></div>
            <div><dt>IPv4 dst</dt><dd>{visual.frame?.destinationIp ?? NETWORK_REMOTE_ADDRESS}</dd></div>
            <div><dt>{t("remote 경계", "Remote boundary")}</dt><dd>{visual.server.acceptedFd !== null ? `fd ${visual.server.acceptedFd}` : visual.server.acceptQueueDepth > 0 ? "accept queue" : "LISTEN"}</dd></div>
          </dl>
        </section>

        <section className="network-timeline-panel" aria-label={t("TCP ACK timeline 패널", "TCP ACK timeline panel")}>
          <header>
            <span>02 · BYTE STREAM</span>
            <strong>seq {TIMELINE_START} → {TIMELINE_END} · snd_una {visual.transport.sendUnacknowledged}</strong>
          </header>
          <svg
            className="network-ack-rail"
            viewBox="0 0 900 212"
            role="img"
            aria-labelledby={`${timelineTitleId} ${timelineDescriptionId}`}
            focusable="false"
          >
            <title id={timelineTitleId}>{t("TCP byte 범위와 누적 ACK", "TCP byte ranges and cumulative ACKs")}</title>
            <desc id={timelineDescriptionId}>{currentState}</desc>
            <defs>
              <pattern id={recoveredPatternId} width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
                <rect width="10" height="10" />
                <line x1="0" y1="0" x2="0" y2="10" />
              </pattern>
            </defs>

            <line className="network-ack-axis" x1={TIMELINE_X} y1="126" x2={TIMELINE_X + TIMELINE_WIDTH} y2="126" />
            {visual.segments.length === 0 ? (
              <g className="network-ack-empty">
                <rect x={TIMELINE_X} y="82" width={TIMELINE_WIDTH} height="60" rx="6" />
                <text x="450" y="117" textAnchor="middle">{t("send(3000) 뒤 세 sequence 범위가 나타납니다", "Three sequence ranges appear after send(3000)")}</text>
              </g>
            ) : visual.segments.map((segment) => {
              const x = timelineX(segment.sequenceStart);
              const width = timelineX(segment.sequenceEnd) - x;
              const fill = segment.status === "recovered" ? `url(#${recoveredPatternId})` : undefined;
              return (
                <g key={segment.index} className={`network-ack-range is-${segment.status}`} data-segment-index={segment.index + 1}>
                  <rect x={x} y="82" width={Math.max(width, 2)} height="60" rx="4" fill={fill} />
                  {width > 70 ? <text x={x + width / 2} y="108" textAnchor="middle">SEG {segment.index + 1}</text> : null}
                  {width > 70 ? <text x={x + width / 2} y="128" textAnchor="middle">{segment.status.toUpperCase()}</text> : null}
                </g>
              );
            })}
            {visual.segments.length > 0 ? <text className="network-ack-small-range" x={timelineX(4001)} y="163" textAnchor="end">SEG 3 · 80 B</text> : null}
            <text className="network-ack-tick" x={TIMELINE_X} y="181" textAnchor="start">1001</text>
            <text className="network-ack-tick" x={timelineX(2461)} y="181" textAnchor="middle">2461</text>
            <text className="network-ack-tick" x={timelineX(3921) - 5} y="181" textAnchor="end">3921</text>
            <text className="network-ack-tick" x={TIMELINE_X + TIMELINE_WIDTH + 5} y="181" textAnchor="start">4001</text>

            {visual.transport.acknowledgements.map((ack, index) => {
              const x = timelineX(ack.value);
              const anchor = ack.value === TIMELINE_END ? "end" : "middle";
              return (
                <g key={ack.order} className={`network-ack-marker ${ack.duplicate ? "is-duplicate" : ""}`} transform={`translate(${x} ${26 + index * 21})`}>
                  <line x1="0" y1="6" x2="0" y2={50 - index * 21} />
                  <path d="M -4 45 L 0 52 L 4 45" transform={`translate(0 ${-index * 21})`} />
                  <text x={ack.value === TIMELINE_END ? -4 : 0} y="0" textAnchor={anchor}>{ack.duplicate ? "DUP " : ""}ACK {ack.value}</text>
                </g>
              );
            })}
          </svg>

          <ol className="network-ack-timeline" aria-label={t("TCP ACK 타임라인", "TCP ACK timeline")}>
            {visual.segments.length === 0 ? (
              <li className="is-empty"><span>WAITING</span><strong>[1001, 4001) · 3000 B</strong><p>{t("아직 segment 없음 · send queue도 비어 있음", "No segments yet · send queue is empty")}</p></li>
            ) : visual.segments.map((segment) => (
              <li key={segment.index} className={`is-${segment.status}`} data-segment-index={segment.index + 1} data-segment-state={segment.status}>
                <span>SEGMENT {segment.index + 1}</span>
                <strong>[{segment.sequenceStart}, {segment.sequenceEnd}) · {segment.payloadBytes} B</strong>
                <p>{segmentState(segment)} · tx {segment.transmissions}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      <p className="network-packet-current-state" role="status" aria-live="polite" aria-atomic="true">
        <span>{t("현재 상태", "CURRENT STATE")}</span>
        {currentState}
      </p>
    </figure>
  );
}

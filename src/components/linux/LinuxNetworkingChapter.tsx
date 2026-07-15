import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { LINUX_CURRICULUM_SLUG, linuxChaptersEn, linuxChaptersKo } from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteNetworkingChapter } from "../../features/linux-runtime/networking-from-a-packet";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxNetworkIncidentLab } from "./LinuxNetworkIncidentLab";
import { LinuxNetworkingConceptCheck } from "./LinuxNetworkingConceptCheck";
import { LinuxPacketJourneyLab } from "./LinuxPacketJourneyLab";

const tocItems = {
  ko: [
    { id: "socket-boundary", label: "fd에서 kernel socket으로" },
    { id: "routing", label: "route와 next hop" },
    { id: "transport", label: "TCP byte stream" },
    { id: "delivery", label: "listener에서 recv까지" },
    { id: "network-lab", label: "필수 패킷 여정 실습" },
    { id: "incidents", label: "네트워크 사건 진단" },
    { id: "real-linux", label: "실제 Linux 관찰" },
    { id: "transfer", label: "작은 Linux로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "socket-boundary", label: "From fd to kernel socket" },
    { id: "routing", label: "Routes and next hops" },
    { id: "transport", label: "TCP byte stream" },
    { id: "delivery", label: "From listener to recv" },
    { id: "network-lab", label: "Required packet journey lab" },
    { id: "incidents", label: "Diagnose network incidents" },
    { id: "real-linux", label: "Observe real Linux" },
    { id: "transfer", label: "Transfer to tiny Linux" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxNetworkingChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "networking-from-a-packet");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [journeyComplete, setJourneyComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteNetworkingChapter({ packetLabComplete: journeyComplete, incidentsComplete, conceptsMastered });
  const previousHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/storage-and-filesystems${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-networking-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}>
          <RootorialMark className="wordmark-mark" /><span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
          <div className="chapter-progress-label"><span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span><div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div><span>{chapterNumber} / {chapters.length}</span></div>
          <LanguageSwitcher compact /><AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />
        <article className="lesson-article">
          <header className="lesson-hero linux-lesson-hero linux-networking-hero">
            <p className="eyebrow">FD → SOCKET/TCP → IP ROUTE → ETHERNET FRAME → PEER TCP → RECV · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">07</div><h1>{chapter.title}</h1>
            <p className="lesson-deck">{isKo ? <>지난 장의 regular-file fd에서 읽은 바이트는 user buffer를 거쳐 <em>socket fd</em>에 도착했습니다. 이제 그 작은 정수 뒤의 kernel socket, route, link frame과 TCP 상태를 따라 원격 프로세스가 recv를 호출할 때까지 갑니다.</> : <>Bytes read from the previous chapter's regular-file fd crossed a user buffer into a <em>socket fd</em>. Now follow the kernel socket, route, link frame, and TCP state behind that small integer until the remote process calls recv.</>}</p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives"><span>{t("학습 목표", "LEARNING OBJECTIVES")}</span><ul>
              <li>{t("process-local fd와 kernel socket, local·remote endpoint를 구분하고 fd 번호가 packet header에 실리지 않음을 설명할 수 있다.", "Distinguish a process-local fd from a kernel socket and its local and remote endpoints, explaining why an fd number never appears in a packet header.")}</li>
              <li>{t("목적지 IPv4에 longest-prefix matching을 적용해 egress interface와 direct·gateway next hop을 계산할 수 있다.", "Apply longest-prefix matching to a destination IPv4 address and compute the egress interface and direct or gateway next hop.")}</li>
              <li>{t("MTU에서 TCP MSS를 계산하고 3,000바이트를 sequence 범위로 나눈 뒤 유실 gap에서 누적 ACK와 재전송을 추적할 수 있다.", "Derive TCP MSS from an MTU, split 3,000 bytes into sequence ranges, and trace cumulative acknowledgements and retransmission across a loss gap.")}</li>
              <li>{t("listener fd가 LISTEN 상태로 남고 accept가 별도 connected fd를 만든다는 사실을 4-tuple과 함께 판정할 수 있다.", "Use the four-tuple to establish that the listener fd remains in LISTEN while accept creates a separate connected fd.")}</li>
              <li>{t("send 반환, peer TCP ACK, remote receive queue와 application recv를 서로 다른 전달 경계로 진단할 수 있다.", "Diagnose send return, peer TCP acknowledgement, the remote receive queue, and application recv as distinct delivery boundaries.")}</li>
            </ul></div>
          </header>

          <section className="article-section" id="socket-boundary">
            <div className="margin-label">01 — PROCESS FD → KERNEL SOCKET</div>
            <h2>{t("fd 4는 wire 주소가 아니라 프로세스 안의 참조입니다", "Fd 4 is a process-local reference, not an address on the wire")}</h2>
            <p>{t("socket()은 현재 프로세스의 fd table에 작은 정수를 만들고 kernel socket object를 가리키게 합니다. connect() 뒤 socket은 protocol, local 10.0.0.10:49152와 remote 203.0.113.20:443을 기억합니다. TCP header에는 두 port가, IP header에는 두 IP가 들어가지만 PID와 fd 4는 들어가지 않습니다.", "socket() creates a small integer in the current process's fd table that references a kernel socket object. After connect(), the socket remembers its protocol, local 10.0.0.10:49152, and remote 203.0.113.20:443. The TCP header carries the two ports and the IP header carries the two IPs, but neither PID nor fd 4 travels on the wire.")}</p>
            <div className="network-boundary-strip" role="group" aria-label={t("프로세스 fd에서 frame까지의 경계", "Boundaries from a process fd to a frame")}><span><small>{t("프로세스", "PROCESS")}</small><strong>fd 4</strong></span><span aria-hidden="true">→</span><span><small>{t("커널", "KERNEL")}</small><strong>TCP socket · 4-tuple</strong></span><span aria-hidden="true">→</span><span><small>{t("전송", "WIRE")}</small><strong>TCP/IP/Ethernet</strong></span></div>
            <div className="concept-callout network-prerequisite"><span className="callout-mark">↩</span><div><strong>{t("선행 개념", "Prerequisites")}</strong><p>{t("process fd table과 read/write가 user buffer를 건너는 경계를 기억하면 충분합니다. 이번 장은 고정된 hostname→IPv4 resolver mapping과 Ethernet/ARP fixture를 사용합니다. 실제 DNS packet 교환, IPv6, NAT, firewall, TLS와 congestion control은 필수 모델 밖입니다.", "It is enough to remember the process fd table and how read and write cross a user buffer. This chapter uses a fixed hostname-to-IPv4 resolver mapping and Ethernet/ARP fixture. Real DNS packet exchange, IPv6, NAT, firewalls, TLS, and congestion control stay outside the required model.")}</p>{preview ? <a href={previousHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전 챕터는 관리자 드래프트 미리보기에서 연결됩니다.", "The previous chapter is linked from the admin draft preview.")}</span>}</div></div>
          </section>

          <section className="article-section" id="routing">
            <div className="margin-label">02 — DESTINATION → ROUTE → NEXT HOP</div>
            <h2>{t("route는 port가 아니라 목적지 IP의 가장 긴 prefix로 고릅니다", "A route follows the longest destination-IP prefix, not a port")}</h2>
            <p>{t("10.0.0.0/24와 0.0.0.0/0이 모두 맞으면 /24가 더 구체적이므로 먼저 선택됩니다. prefix 길이가 같을 때 이 fixture는 낮은 metric을, metric도 같으면 선언 순서를 사용합니다. 같은 subnet의 목적지는 직접 next hop이지만 203.0.113.20처럼 off-link 목적지는 default gateway 10.0.0.1이 next hop입니다. 그때 Ethernet destination은 gateway MAC이지만 IP destination은 원격 서버로 유지됩니다.", "When both 10.0.0.0/24 and 0.0.0.0/0 match, /24 wins because it is more specific. For equal prefix lengths, this fixture chooses the lower metric, then declaration order when metrics also tie. An on-link destination is its own next hop; an off-link destination such as 203.0.113.20 uses default gateway 10.0.0.1. The Ethernet destination is then the gateway MAC while the IP destination remains the remote server.")}</p>
            <div className="network-route-figure" role="group" aria-label={t("직접 경로와 gateway 경로 비교", "Comparison of direct and gateway routes")}><article><span>{t("같은 link", "ON LINK")}</span><strong>10.0.0.44/24</strong><p>ARP 10.0.0.44 → {t("peer MAC", "peer MAC")}</p></article><article><span>{t("원격 link", "OFF LINK")}</span><strong>203.0.113.20</strong><p>default via 10.0.0.1 → {t("gateway MAC", "gateway MAC")}</p></article><article><span>{t("end-to-end", "END TO END")}</span><strong>IP dst 203.0.113.20</strong><p>{t("router가 link header를 새로 만들고 TTL·IPv4 checksum을 갱신", "Router rebuilds the link header and updates TTL and the IPv4 checksum")}</p></article></div>
            <details className="network-prediction-answer"><summary>{t("예측: gateway를 거치면 IP destination도 10.0.0.1로 바뀔까요?", "Predict: does the IP destination change to 10.0.0.1 when using a gateway?")}</summary><p>{t("아닙니다. 이 no-NAT fixture에서 route는 다음 link에 보낼 frame 주소를 gateway로 정합니다. IP destination은 203.0.113.20으로 남고 router는 TTL을 하나 줄인 새 frame으로 전달합니다.", "No. In this no-NAT fixture, routing selects the gateway as the frame target on the next link. The IP destination stays 203.0.113.20, and the router forwards it in a new frame after decrementing TTL.")}</p></details>
          </section>

          <section className="article-section" id="transport">
            <div className="margin-label">03 — TCP SEQUENCE · GAP · CUMULATIVE ACK</div>
            <h2>{t("TCP는 packet 개수가 아니라 다음에 필요한 byte를 ACK합니다", "TCP acknowledges the next required byte, not a packet count")}</h2>
            <p>{t("client ISN 1000의 SYN은 sequence 하나를 소비하므로 첫 data는 1001에서 시작합니다. IPv4·TCP option이 없는 이 fixture에서 MTU 1500에서 IPv4 20바이트와 TCP 20바이트를 빼면 MSS는 1460입니다. 따라서 3,000바이트는 [1001,2461), [2461,3921), [3921,4001) 세 범위가 됩니다.", "A SYN with client ISN 1000 consumes one sequence number, so data begins at 1001. In this fixture with no IPv4 or TCP options, subtracting 20-byte IPv4 and TCP headers from MTU 1500 yields MSS 1460. The 3,000 bytes therefore occupy [1001,2461), [2461,3921), and [3921,4001).")}</p>
            <ol className="network-ack-pipeline"><li><span>01</span><strong>ACK 2461</strong><p>{t("첫 범위가 연속으로 도착했습니다.", "The first contiguous range arrived.")}</p></li><li><span>02</span><strong>ACK 2461</strong><p>{t("두 번째는 유실되고 세 번째만 먼저 도착해 gap을 건너뛰지 않습니다.", "The second range was lost; an early third range cannot skip the gap.")}</p></li><li><span>03</span><strong>RTO · seq 2461</strong><p>{t("같은 byte 범위를 새 sequence가 아니라 그대로 재전송합니다.", "Retransmit the same byte range, not a newly numbered one.")}</p></li><li><span>04</span><strong>ACK 4001</strong><p>{t("gap이 채워져 buffer의 연속 범위까지 한 번에 누적 확인합니다.", "Filling the gap cumulatively acknowledges the buffered contiguous range too.")}</p></li></ol>
            <p>{t("여기서 두 번째 구간은 명시적인 deterministic RTO로 복구합니다. 후속 duplicate ACK가 충분하지 않으므로 이를 fast retransmit이라 부르지 않습니다. TCP segmentation만 모델링하며 IP fragmentation은 만들지 않습니다.", "The second range is recovered by an explicit deterministic RTO. There are not enough following duplicate acknowledgements to call this fast retransmit. The model performs TCP segmentation only and does not create IP fragmentation.")}</p>
          </section>

          <section className="article-section" id="delivery">
            <div className="margin-label">04 — LISTEN → ACCEPTED FD → RECV</div>
            <h2>{t("연결과 application delivery는 서로 다른 증거를 남깁니다", "Connection and application delivery leave different evidence")}</h2>
            <p>{t("서버의 0.0.0.0:443 listener는 wildcard local address로 SYN을 demultiplex합니다. 이 blocking connect fixture에서 handshake 뒤 listener fd 3은 LISTEN에 남고 accept가 fd 5의 connected socket을 돌려줍니다. 이 fixture의 send(3000)가 3000을 반환하면 local send queue가 모든 byte를 받았다는 뜻이고 peer ACK는 remote TCP가 byte를 받았다는 뜻입니다. remote application이 byte를 인수했다는 증거는 fd 5에서 recv가 그 byte를 꺼낸 뒤에만 생기며, 업무 처리가 끝났다는 뜻은 아닙니다. 실제 nonblocking connect는 EINPROGRESS를, send는 partial byte count를 반환할 수 있습니다.", "The server's 0.0.0.0:443 listener demultiplexes the SYN through a wildcard local address. In this blocking-connect fixture, listener fd 3 remains in LISTEN after the handshake and accept returns connected fd 5. When this fixture's send(3000) returns 3000, the local send queue accepted every byte; a peer ACK means remote TCP accepted them. Evidence that the remote application took ownership of the bytes appears only after recv removes them from fd 5; it does not prove business processing is complete. A real nonblocking connect may return EINPROGRESS, and send may return a partial byte count.")}</p>
            <div className="network-delivery-strip" role="group" aria-label={t("전달 경계 네 단계", "Four delivery boundaries")}><span><small>client</small><strong>send returned</strong></span><span aria-hidden="true">→</span><span><small>server TCP</small><strong>ACK 4001</strong></span><span aria-hidden="true">→</span><span><small>kernel</small><strong>receive queue 3000 B</strong></span><span aria-hidden="true">→</span><span><small>PID 91</small><strong>recv 3000 B</strong></span></div>
          </section>

          <div id="network-lab"><LinuxPacketJourneyLab onCompletionChange={setJourneyComplete} /></div>
          <section className="article-section" id="incidents"><div className="margin-label">06 — DEBUG NETWORK INCIDENTS</div><h2>{t("ping 하나 대신 실패한 경계를 상태로 수리합니다", "Repair the failed boundary as state instead of trusting one ping")}</h2><p>{t("다음 활동은 가장 구체적인 route, gateway frame 주소, 누적 ACK gap, listener와 application delivery를 각각 의미론적으로 판정합니다. 정답 preset 이름이 아니라 같은 route·TCP 모델이 입력을 다시 계산하므로 일부 값만 맞춰서는 통과하지 않습니다.", "The next activity semantically grades the most-specific route, gateway frame addressing, a cumulative-ACK gap, and listener versus application delivery. The same route and TCP model recomputes each submission rather than comparing a preset name, so partial answers cannot pass.")}</p><LinuxNetworkIncidentLab onCompletionChange={setIncidentsComplete} /></section>

          <section className="article-section" id="real-linux"><div className="margin-label">07 — OPTIONAL REAL LINUX OBSERVATION</div><h2>{t("실제 명령은 모델의 경계를 관찰하되 완료 조건과 분리합니다", "Real commands observe model boundaries but stay outside completion")}</h2><p>{t("로컬 Linux가 있다면 아래 read-only 명령으로 interface, 선택 route, neighbor와 TCP socket 상태를 비교하세요. 출력 이름과 권한은 배포판·namespace·kernel에 따라 달라지며 이 챕터의 완료에는 shell, VM, root 권한이나 외부 네트워크가 필요하지 않습니다.", "If local Linux is available, compare interfaces, a selected route, neighbors, and TCP socket state with these read-only commands. Names and permissions vary across distributions, namespaces, and kernels; completing this chapter needs no shell, VM, root access, or external network.")}</p><pre className="network-observation-command" aria-label={t("선택 Linux 네트워크 관찰 명령", "Optional Linux networking observation commands")}>{"ip address show\nip route get 203.0.113.20\nip neigh show\nss -tnlp"}</pre></section>

          <section className="article-section" id="transfer"><div className="margin-label">08 — TRANSFER TO TINY LINUX</div><h2>{t("마지막 장에서는 이 경로를 직접 부팅한 시스템에 조립합니다", "The final chapter assembles this path into a system you boot")}</h2><div className="network-transfer-task"><strong>{t("전이 과제", "TRANSFER TASK")}</strong><p>{t("eth0은 있지만 down이고 address·default route가 없는 tiny Linux에서 다음 상태를 순서대로 조립하세요: driver/interface 존재 → PID 1이 link up·10.0.0.20/24 address·default via 10.0.0.1 설정 → reportd 시작 → 0.0.0.0:8080 bind/listen → accept → report 파일 read → connected fd로 send. driver·link·address는 ip address, route는 ip route get, listener는 ss -lnt, accepted connection은 ss -tn, file read·send는 reportd event trace로 각각 확인하세요.", "On a tiny Linux system where eth0 exists but is down and has no address or default route, assemble these states in order: driver/interface exists → PID 1 configures link up, address 10.0.0.20/24, and default via 10.0.0.1 → start reportd → bind/listen on 0.0.0.0:8080 → accept → read the report file → send through the connected fd. Verify driver, link, and address with ip address; the route with ip route get; the listener with ss -lnt; the accepted connection with ss -tn; and file read plus send with the reportd event trace.")}</p></div></section>

          <section className="article-section concept-check" id="check"><div className="margin-label">09 — CONCEPT CHECK</div><LinuxNetworkingConceptCheck onMasteryChange={setConceptsMastered} /><div className="network-completion-checklist" role="status" aria-live="polite"><span className={journeyComplete ? "is-complete" : undefined}>{journeyComplete ? "✓" : "○"} {t("필수 패킷 여정 실습", "Required packet journey lab")}</span><span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("네트워크 사건 진단", "Network incident diagnosis")}</span><span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span></div><CompleteChapter curriculumSlug={LINUX_CURRICULUM_SLUG} slug="networking-from-a-packet" canComplete={canComplete} lockedMessage={t("필수 패킷 여정, 사건 진단과 다섯 개념 확인을 모두 완료하세요.", "Complete the required packet journey, incident diagnosis, and all five concept checks.")} /></section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousHref}>← {t("이전: 저장장치와 파일시스템", "Previous: Storage and Filesystems")}</a> : <span>← {t("이전: 저장장치와 파일시스템", "Previous: Storage and Filesystems")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>}
            <span>{t("다음: 작은 Linux 조립하기", "Next: Assemble a Tiny Linux System")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}

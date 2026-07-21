export const advancedLinuxNetworkingSlugs = [
  "routes-and-packet-paths",
  "sockets-ports-and-tcp",
  "dns-and-service-reachability",
  "diagnose-a-linux-network",
] as const;

export type AdvancedLinuxNetworkingSlug = (typeof advancedLinuxNetworkingSlugs)[number];
export type LocalizedText = Readonly<{ ko: string; en: string }>;

export type NetworkJourneyNode = Readonly<{
  id: string;
  label: LocalizedText;
  detail: string;
  x: number;
  y: number;
  kind: "host" | "router" | "service" | "resolver" | "kernel" | "evidence";
}>;

export type NetworkJourneyEdge = Readonly<{
  id: string;
  from: string;
  to: string;
  label: LocalizedText;
}>;

export type NetworkJourneyPhase = Readonly<{
  id: string;
  label: LocalizedText;
  command: string;
  output: readonly string[];
  activeNodes: readonly string[];
  activeEdges: readonly string[];
  decision: LocalizedText;
  facts: readonly Readonly<{ label: LocalizedText; value: string }>[];
}>;

export type NetworkIncident = Readonly<{
  id: string;
  title: LocalizedText;
  symptom: LocalizedText;
  evidence: string;
  repairs: readonly Readonly<{ id: string; label: LocalizedText }>[];
  correctRepair: string;
  explanation: LocalizedText;
}>;

export type NetworkQuestion = Readonly<{
  id: string;
  prompt: LocalizedText;
  options: readonly Readonly<{ value: string; label: LocalizedText }>[];
  correctAnswer: string;
}>;

export type AdvancedChapterConfig = Readonly<{
  slug: AdvancedLinuxNetworkingSlug;
  number: number;
  eyebrow: string;
  deck: LocalizedText;
  objectives: readonly LocalizedText[];
  foundation: Readonly<{ title: LocalizedText; body: LocalizedText }>;
  boundary: Readonly<{ title: LocalizedText; body: LocalizedText; warning: LocalizedText }>;
  figure: Readonly<{
    kicker: string;
    title: LocalizedText;
    description: LocalizedText;
    nodes: readonly NetworkJourneyNode[];
    edges: readonly NetworkJourneyEdge[];
    phases: readonly NetworkJourneyPhase[];
  }>;
  incidents: readonly NetworkIncident[];
  questions: readonly NetworkQuestion[];
  linuxCommands: string;
  transfer: Readonly<{ title: LocalizedText; body: LocalizedText; infrastructureChapter: string }>;
}>;

const t = (ko: string, en: string): LocalizedText => Object.freeze({ ko, en });
const fact = (ko: string, en: string, value: string) => Object.freeze({ label: t(ko, en), value });
const node = (id: string, ko: string, en: string, detail: string, x: number, y: number, kind: NetworkJourneyNode["kind"]): NetworkJourneyNode => Object.freeze({ id, label: t(ko, en), detail, x, y, kind });
const edge = (id: string, from: string, to: string, ko: string, en: string): NetworkJourneyEdge => Object.freeze({ id, from, to, label: t(ko, en) });
const repair = (id: string, ko: string, en: string) => Object.freeze({ id, label: t(ko, en) });
const option = (value: string, ko: string, en: string) => Object.freeze({ value, label: t(ko, en) });

export const advancedLinuxNetworkingConfigs: Record<AdvancedLinuxNetworkingSlug, AdvancedChapterConfig> = {
  "routes-and-packet-paths": {
    slug: "routes-and-packet-paths",
    number: 3,
    eyebrow: "DESTINATION → LONGEST PREFIX → EGRESS → NEXT HOP → TTL",
    deck: t("라우팅 표는 위에서부터 읽는 목록이 아닙니다. 목적지와 가장 길게 일치하는 프리픽스를 찾고, 같은 길이일 때만 metric을 비교합니다.", "A routing table is not a first-match list. Linux selects the longest matching prefix and compares metrics only among equally specific routes."),
    objectives: [
      t("longest-prefix match로 경로를 선택할 수 있다.", "Select a route with longest-prefix matching."),
      t("egress interface, source address와 next hop을 구분할 수 있다.", "Separate the egress interface, source address, and next hop."),
      t("router에서 Ethernet header와 TTL이 바뀌는 이유를 설명할 수 있다.", "Explain why Ethernet headers and TTL change at a router."),
      t("누락 경로, 잘못된 metric과 TTL 실패를 최소 변경으로 복구할 수 있다.", "Repair missing routes, wrong metrics, and TTL failures minimally."),
    ],
    foundation: {
      title: t("가장 구체적인 경로가 기본 경로보다 먼저 선택됩니다", "The most specific route wins over the default route"),
      body: t("203.0.113.20은 203.0.113.0/24와 0.0.0.0/0에 모두 일치하지만 /24가 더 구체적입니다. metric은 프리픽스 길이가 같은 후보끼리만 우선순위를 정합니다.", "203.0.113.20 matches both 203.0.113.0/24 and 0.0.0.0/0, but /24 is more specific. A metric ranks only candidates with the same prefix length."),
    },
    boundary: {
      title: t("라우터는 IP 목적지를 유지하고 링크 전달만 새로 만듭니다", "A router preserves the IP destination and rebuilds link delivery"),
      body: t("호스트는 게이트웨이 MAC으로 프레임을 보내고, 라우터는 그 프레임을 제거합니다. TTL을 1 줄인 뒤 다음 링크의 MAC 주소로 새 프레임을 만듭니다.", "The host sends a frame to the gateway MAC. The router removes that frame, decrements TTL, and creates a new frame for the next link."),
      warning: t("TTL 만료는 DNS나 TCP 실패가 아니라 forwarding 경계의 증거입니다.", "TTL expiry is evidence from the forwarding boundary, not a DNS or TCP failure."),
    },
    figure: {
      kicker: "EXECUTABLE FIGURE · ROUTE LOOKUP AND TWO LINKS",
      title: t("목적지에서 실제 packet path를 계산하세요", "Compute the packet path from the destination"),
      description: t("경로 조회부터 두 링크의 프레임과 TTL 변화를 순서대로 실행합니다.", "Execute route lookup, two link frames, and TTL changes in order."),
      nodes: [
        node("host", "출발 호스트", "SOURCE HOST", "10.20.0.2", 120, 150, "host"),
        node("router", "라우터", "ROUTER", "10.20.0.1 / 10.30.0.1", 470, 150, "router"),
        node("remote", "원격 호스트", "REMOTE HOST", "203.0.113.20", 820, 150, "service"),
      ],
      edges: [
        edge("host-router", "host", "router", "링크 A · 게이트웨이 MAC", "LINK A · GATEWAY MAC"),
        edge("router-remote", "router", "remote", "링크 B · 원격 MAC", "LINK B · REMOTE MAC"),
      ],
      phases: [
        { id: "inspect-table", label: t("경로 표 읽기", "Read routes"), command: "ip -4 route show", output: ["203.0.113.0/24 via 10.20.0.1 dev eth0 metric 20", "default via 10.20.0.254 dev eth0 metric 100"], activeNodes: ["host"], activeEdges: [], decision: t("/24와 /0 후보를 찾았습니다.", "Found /24 and /0 candidates."), facts: [fact("후보", "CANDIDATES", "/24 · /0"), fact("선택 전", "BEFORE SELECT", "2 routes")] },
        { id: "longest-prefix", label: t("가장 긴 프리픽스", "Longest prefix"), command: "ip route get 203.0.113.20", output: ["203.0.113.20 via 10.20.0.1 dev eth0 src 10.20.0.2"], activeNodes: ["host", "router"], activeEdges: ["host-router"], decision: t("/24가 /0보다 구체적이므로 선택됩니다.", "/24 is selected because it is more specific than /0."), facts: [fact("선택 경로", "SELECTED", "203.0.113.0/24"), fact("다음 홉", "NEXT HOP", "10.20.0.1")] },
        { id: "metric-tie", label: t("같은 길이의 metric", "Metric tie-break"), command: "ip route get 198.51.100.8", output: ["198.51.100.8 via 10.20.0.1 dev eth0 src 10.20.0.2 metric 20"], activeNodes: ["host", "router"], activeEdges: ["host-router"], decision: t("같은 /24 후보 중 metric 20이 선택됩니다.", "Metric 20 wins among equal /24 candidates."), facts: [fact("프리픽스", "PREFIX", "/24 = /24"), fact("선택 metric", "METRIC", "20")] },
        { id: "first-link", label: t("첫 링크 전송", "First link"), command: "tcpdump -eni eth0 'host 203.0.113.20'", output: ["eth dst 02:00:00:00:00:01 · ip dst 203.0.113.20 · ttl 64"], activeNodes: ["host", "router"], activeEdges: ["host-router"], decision: t("프레임은 게이트웨이로, IP 패킷은 원격 호스트로 향합니다.", "The frame targets the gateway while the IP packet targets the remote host."), facts: [fact("Ethernet dst", "ETHERNET DST", "gateway MAC"), fact("IP dst", "IP DST", "203.0.113.20")] },
        { id: "forward", label: t("라우터 전달", "Router forwards"), command: "tcpdump -eni eth1 'host 203.0.113.20'", output: ["eth src 02:00:00:00:01:01 · eth dst 02:00:00:00:01:20", "ip dst 203.0.113.20 · ttl 63"], activeNodes: ["router", "remote"], activeEdges: ["router-remote"], decision: t("링크 헤더는 교체되고 TTL은 63이 됩니다.", "The link header is replaced and TTL becomes 63."), facts: [fact("새 프레임", "NEW FRAME", "link B"), fact("TTL", "TTL", "64 → 63")] },
        { id: "ttl-expired", label: t("TTL 만료", "TTL expires"), command: "traceroute -m 1 203.0.113.20", output: ["1  10.20.0.1  0.412 ms", "ICMP time exceeded"], activeNodes: ["host", "router"], activeEdges: ["host-router"], decision: t("TTL 1은 첫 라우터에서 0이 되어 전달되지 않습니다.", "TTL 1 becomes 0 at the first router and is not forwarded."), facts: [fact("중단 경계", "STOPPED AT", "router"), fact("ICMP", "ICMP", "time exceeded")] },
      ],
    },
    incidents: [
      { id: "missing-specific-route", title: t("원격 /24가 기본 경로로 샙니다", "Remote /24 falls through to default"), symptom: t("ip route get이 10.20.0.254를 선택합니다.", "ip route get selects 10.20.0.254."), evidence: "no 203.0.113.0/24 route", repairs: [repair("restore-specific-route", "203.0.113.0/24 경로 복구", "Restore 203.0.113.0/24 route"), repair("flush-neighbors", "이웃 표 전체 삭제", "Flush the neighbor table"), repair("restart-dns", "resolver 재시작", "Restart the resolver")], correctRepair: "restore-specific-route", explanation: t("경로 후보가 없으므로 가장 구체적인 정적 경로를 복구합니다.", "The candidate route is absent, so restore the specific static route.") },
      { id: "wrong-metric", title: t("백업 경로가 주 경로를 이깁니다", "Backup route beats the primary"), symptom: t("같은 /24 중 느린 링크가 선택됩니다.", "The slow link wins among equal /24 routes."), evidence: "metric 10 on backup · metric 50 on primary", repairs: [repair("fix-primary-metric", "주 경로 metric을 더 낮게 수정", "Lower the primary route metric"), repair("widen-prefix", "경로를 /16으로 확장", "Widen the route to /16"), repair("add-default", "기본 경로 추가", "Add another default route")], correctRepair: "fix-primary-metric", explanation: t("동일 프리픽스 후보의 metric만 바로잡습니다.", "Correct only the metric among equal-prefix candidates.") },
      { id: "forwarding-off", title: t("라우터에서 패킷이 멈춥니다", "Packet stops at the router"), symptom: t("ingress capture는 보이지만 egress capture가 없습니다.", "Ingress capture is present but egress capture is absent."), evidence: "net.ipv4.ip_forward = 0", repairs: [repair("enable-forwarding", "의도한 라우터에서 forwarding 활성화", "Enable forwarding on the intended router"), repair("change-dns", "DNS 주소 변경", "Change the DNS address"), repair("open-listener", "클라이언트 listener 추가", "Add a client listener")], correctRepair: "enable-forwarding", explanation: t("라우팅 경계에서 전달 기능 자체가 꺼져 있습니다.", "Forwarding itself is disabled at the routing boundary.") },
    ],
    questions: [
      { id: "longest-prefix", prompt: t("/24와 기본 경로가 모두 일치할 때 선택은?", "What wins when /24 and default both match?"), options: [option("specific-prefix", "더 구체적인 /24", "The more specific /24"), option("first-route", "표의 첫 번째 행", "The first listed row"), option("lowest-default", "기본 경로의 metric", "The default route metric")], correctAnswer: "specific-prefix" },
      { id: "metric-scope", prompt: t("metric은 언제 경로 선택을 가르나요?", "When does a metric break a route tie?"), options: [option("equal-prefix", "프리픽스 길이가 같은 후보", "Candidates with equal prefix length"), option("all-routes", "일치하는 모든 경로", "All matching routes"), option("after-arp", "ARP 이후", "After ARP")], correctAnswer: "equal-prefix" },
      { id: "router-frame", prompt: t("라우터를 지난 뒤 유지되는 것은?", "What remains after crossing a router?"), options: [option("ip-destination", "최종 IP 목적지", "Final IP destination"), option("ethernet-header", "기존 Ethernet header", "Original Ethernet header"), option("same-ttl", "동일한 TTL", "Unchanged TTL")], correctAnswer: "ip-destination" },
      { id: "ttl-boundary", prompt: t("TTL 1이 첫 라우터에 도착하면?", "What happens when TTL 1 reaches the first router?"), options: [option("time-exceeded", "0이 되어 ICMP time exceeded", "Becomes 0 and returns ICMP time exceeded"), option("tcp-reset", "TCP reset", "TCP reset"), option("dns-nxdomain", "DNS NXDOMAIN", "DNS NXDOMAIN")], correctAnswer: "time-exceeded" },
      { id: "route-evidence", prompt: t("한 목적지의 실제 선택 경로를 보는 명령은?", "Which command shows the selected route for one destination?"), options: [option("route-get", "ip route get <주소>", "ip route get <address>"), option("ip-neigh", "ip neigh", "ip neigh"), option("ss-listen", "ss -lnt", "ss -lnt")], correctAnswer: "route-get" },
    ],
    linuxCommands: "ip -4 route show\nip route get 203.0.113.20\ntraceroute -n 203.0.113.20\ntcpdump -eni eth0 'host 203.0.113.20'",
    transfer: { title: t("다음에는 선택된 경로 위에 TCP 연결을 올립니다", "Next, place a TCP connection on the selected path"), body: t("IP 경로가 존재해도 어느 프로세스도 포트를 듣지 않으면 서비스에는 도달하지 못합니다. 다음 장은 kernel socket과 application read 경계를 연결합니다.", "An IP path does not make a service reachable when no process listens on the port. The next chapter connects kernel sockets to application reads."), infrastructureChapter: "veth-bridges-and-routing" },
  },

  "sockets-ports-and-tcp": {
    slug: "sockets-ports-and-tcp",
    number: 4,
    eyebrow: "PROCESS → FD → SOCKET → 4-TUPLE → ACK → RECV",
    deck: t("프로세스가 가진 fd, 커널의 socket, 네트워크의 4-tuple은 같은 대상을 서로 다른 경계에서 본 것입니다. ACK는 커널 도착을 증명하지만 application read를 증명하지 않습니다.", "A process fd, kernel socket, and network four-tuple are views of one flow at different boundaries. An ACK proves kernel delivery, not an application read."),
    objectives: [t("fd와 kernel socket의 관계를 설명할 수 있다.", "Explain the relationship between an fd and a kernel socket."), t("bind·listen·connect·accept를 TCP 상태에 배치할 수 있다.", "Place bind, listen, connect, and accept in the TCP lifecycle."), t("ACK·receive queue·recv의 증거 범위를 구분할 수 있다.", "Separate the evidence scopes of ACK, receive queue, and recv."), t("listener와 queue 장애를 최소 변경으로 복구할 수 있다.", "Repair listener and queue failures minimally.")],
    foundation: { title: t("listen socket과 accepted socket은 서로 다른 역할을 가집니다", "A listening socket and an accepted socket have different roles"), body: t("listen socket은 새 연결을 기다립니다. accept는 연결 하나를 위한 새 fd를 반환하며, 실제 byte stream은 이 accepted socket에서 recv합니다.", "A listening socket waits for new connections. accept returns a new fd for one connection, and recv reads the byte stream from that accepted socket.") },
    boundary: { title: t("TCP ACK는 application이 읽었다는 뜻이 아닙니다", "A TCP ACK does not mean the application read the bytes"), body: t("ACK는 상대 커널의 receive queue까지 연속된 바이트가 도착했음을 뜻합니다. application 전달은 recv가 바이트를 반환할 때 별도로 증명됩니다.", "An ACK means contiguous bytes reached the peer kernel receive queue. Application delivery is proven separately when recv returns those bytes."), warning: t("포트가 열려 있다는 사실과 올바른 application response는 서로 다른 증거입니다.", "An open port and a correct application response are different evidence.") },
    figure: {
      kicker: "EXECUTABLE FIGURE · TCP FROM PROCESS TO PROCESS",
      title: t("한 바이트가 두 프로세스 사이의 경계를 지나는 과정을 실행하세요", "Execute one byte across the boundaries between two processes"),
      description: t("listener 생성부터 accept, ACK와 recv까지 커널과 application 경계를 분리합니다.", "Separate kernel and application boundaries from listener creation through accept, ACK, and recv."),
      nodes: [node("client-app", "클라이언트", "CLIENT PROCESS", "fd 7", 100, 100, "host"), node("client-kernel", "클라이언트 커널", "CLIENT KERNEL", "10.20.0.2:49152", 300, 210, "kernel"), node("server-kernel", "서버 커널", "SERVER KERNEL", "10.30.0.8:8080", 650, 210, "kernel"), node("server-app", "서버", "SERVER PROCESS", "listen fd 3 · accepted fd 4", 860, 100, "service")],
      edges: [edge("client-fd", "client-app", "client-kernel", "send / socket fd", "send / socket fd"), edge("tcp-flow", "client-kernel", "server-kernel", "TCP 4-tuple", "TCP FOUR-TUPLE"), edge("server-fd", "server-kernel", "server-app", "accept / recv", "accept / recv")],
      phases: [
        { id: "listen", label: t("bind·listen", "Bind and listen"), command: "ss -lntp 'sport = :8080'", output: ["LISTEN 0 128 10.30.0.8:8080 users:((\"server\",pid=42,fd=3))"], activeNodes: ["server-kernel", "server-app"], activeEdges: ["server-fd"], decision: t("server fd 3이 새 연결을 기다립니다.", "Server fd 3 waits for new connections."), facts: [fact("상태", "STATE", "LISTEN"), fact("local", "LOCAL", "10.30.0.8:8080")] },
        { id: "connect", label: t("connect", "Connect"), command: "connect(7, 10.30.0.8:8080)", output: ["SYN 10.20.0.2:49152 → 10.30.0.8:8080", "SYN-ACK ← · ACK →"], activeNodes: ["client-kernel", "server-kernel"], activeEdges: ["tcp-flow"], decision: t("4-tuple이 연결 하나를 식별합니다.", "The four-tuple identifies one connection."), facts: [fact("source", "SOURCE", "10.20.0.2:49152"), fact("destination", "DESTINATION", "10.30.0.8:8080")] },
        { id: "accept", label: t("accept", "Accept"), command: "accept4(3, ...) = 4", output: ["listener fd 3 remains LISTEN", "accepted fd 4 is ESTABLISHED"], activeNodes: ["server-kernel", "server-app"], activeEdges: ["server-fd"], decision: t("listener는 유지되고 연결 전용 fd 4가 생깁니다.", "The listener remains and connection fd 4 is created."), facts: [fact("listener", "LISTENER", "fd 3"), fact("connected", "CONNECTED", "fd 4")] },
        { id: "send", label: t("send", "Send bytes"), command: "send(7, \"GET /\", 5, 0) = 5", output: ["seq 1001:1006 · len 5", "server receive queue +5 bytes"], activeNodes: ["client-app", "client-kernel", "server-kernel"], activeEdges: ["client-fd", "tcp-flow"], decision: t("바이트는 서버 커널 queue에 도착했습니다.", "Bytes reached the server kernel queue."), facts: [fact("보낸 byte", "SENT", "5"), fact("수신 queue", "RECV-Q", "5")] },
        { id: "ack", label: t("ACK 확인", "Observe ACK"), command: "tcpdump -nn 'tcp port 8080'", output: ["10.30.0.8.8080 > 10.20.0.2.49152: ack 1006"], activeNodes: ["client-kernel", "server-kernel"], activeEdges: ["tcp-flow"], decision: t("ACK 1006은 커널 수신까지만 증명합니다.", "ACK 1006 proves kernel receipt only."), facts: [fact("연속 수신", "CONTIGUOUS", "through 1005"), fact("app read", "APP READ", "not proven")] },
        { id: "recv", label: t("recv", "Application recv"), command: "recvfrom(4, \"GET /\", 4096, 0, ...) = 5", output: ["accepted fd 4 returned 5 bytes", "server receive queue 5 → 0"], activeNodes: ["server-kernel", "server-app"], activeEdges: ["server-fd"], decision: t("이제 application 전달이 증명됩니다.", "Application delivery is now proven."), facts: [fact("반환 byte", "RETURNED", "5"), fact("수신 queue", "RECV-Q", "0")] },
      ],
    },
    incidents: [
      { id: "loopback-listener", title: t("원격 연결만 거절됩니다", "Only remote connections are refused"), symptom: t("localhost:8080은 성공하지만 10.30.0.8:8080은 거절됩니다.", "localhost:8080 works but 10.30.0.8:8080 is refused."), evidence: "LISTEN 127.0.0.1:8080", repairs: [repair("bind-service-address", "서비스 주소 또는 0.0.0.0에 bind", "Bind the service address or 0.0.0.0"), repair("add-default-route", "기본 경로 추가", "Add a default route"), repair("flush-dns", "DNS cache 삭제", "Flush DNS cache")], correctRepair: "bind-service-address", explanation: t("listener 범위만 서비스 인터페이스로 확장합니다.", "Expand only the listener scope to the service interface.") },
      { id: "accept-stalled", title: t("handshake 뒤 application이 멈춥니다", "Application stalls after handshake"), symptom: t("ESTABLISHED 연결과 커지는 Recv-Q가 보입니다.", "ESTABLISHED connections and a growing Recv-Q are visible."), evidence: "ACK present · recvfrom absent", repairs: [repair("resume-accept-recv", "accept/recv loop 복구", "Restore the accept/recv loop"), repair("change-mtu", "MTU 축소", "Reduce MTU"), repair("replace-gateway", "게이트웨이 교체", "Replace the gateway")], correctRepair: "resume-accept-recv", explanation: t("네트워크는 전달했으며 application read 경계를 복구해야 합니다.", "The network delivered the bytes; repair the application read boundary.") },
      { id: "port-conflict", title: t("서버가 시작되지 않습니다", "Server cannot start"), symptom: t("bind가 EADDRINUSE로 실패합니다.", "bind fails with EADDRINUSE."), evidence: "another pid owns 0.0.0.0:8080", repairs: [repair("resolve-port-owner", "기존 listener 소유자를 확인해 충돌 해소", "Identify the existing listener and resolve the conflict"), repair("delete-route", "connected route 삭제", "Delete the connected route"), repair("disable-arp", "ARP 비활성화", "Disable ARP")], correctRepair: "resolve-port-owner", explanation: t("포트 소유권 충돌을 해당 프로세스 경계에서 해결합니다.", "Resolve port ownership at the process boundary.") },
    ],
    questions: [
      { id: "listener-accepted", prompt: t("accept가 성공한 뒤 listener fd는?", "What happens to the listener fd after accept succeeds?"), options: [option("listener-remains", "그대로 남고 새 연결 fd가 생김", "It remains and a new connected fd appears"), option("listener-converts", "연결 fd로 변환됨", "It becomes the connected fd"), option("listener-closes", "자동 종료됨", "It closes automatically")], correctAnswer: "listener-remains" },
      { id: "four-tuple", prompt: t("TCP 연결 하나를 구분하는 값은?", "What identifies one TCP connection?"), options: [option("src-dst-pairs", "source IP·port와 destination IP·port", "Source IP and port plus destination IP and port"), option("port-only", "destination port만", "Destination port only"), option("pid-only", "process id만", "Process ID only")], correctAnswer: "src-dst-pairs" },
      { id: "ack-scope", prompt: t("ACK가 직접 증명하는 것은?", "What does an ACK directly prove?"), options: [option("peer-kernel-received", "상대 커널이 연속 바이트를 수신", "Peer kernel received contiguous bytes"), option("app-read", "application이 recv 완료", "Application completed recv"), option("response-correct", "응답 내용이 정확함", "Response content is correct")], correctAnswer: "peer-kernel-received" },
      { id: "recv-proof", prompt: t("application 전달의 직접 증거는?", "What directly proves application delivery?"), options: [option("recv-returns", "accepted fd의 recv가 바이트 반환", "recv on the accepted fd returns bytes"), option("syn-seen", "SYN 관찰", "A SYN is observed"), option("arp-entry", "ARP entry 존재", "An ARP entry exists")], correctAnswer: "recv-returns" },
      { id: "listener-scope", prompt: t("127.0.0.1:8080 listener의 도달 범위는?", "What is the reachability scope of a 127.0.0.1:8080 listener?"), options: [option("local-loopback", "현재 네트워크 view의 loopback", "Loopback in the current network view"), option("all-interfaces", "모든 인터페이스", "All interfaces"), option("remote-subnet", "원격 서브넷", "Remote subnets")], correctAnswer: "local-loopback" },
    ],
    linuxCommands: "ss -lntp\nss -nto 'sport = :8080 or dport = :8080'\nstrace -f -e trace=network -p <pid>\ntcpdump -nn 'tcp port 8080'",
    transfer: { title: t("다음에는 hostname이 이 4-tuple의 목적지 주소가 되는 과정을 봅니다", "Next, see how a hostname becomes the destination address in this four-tuple"), body: t("socket 연결 전에 resolver가 이름을 주소로 바꿉니다. 다음 장은 DNS cache와 실제 서비스 연결 증거를 분리합니다.", "Before a socket connects, the resolver turns a name into an address. The next chapter separates DNS cache evidence from actual service connectivity."), infrastructureChapter: "network-namespaces-and-boundaries" },
  },

  "dns-and-service-reachability": {
    slug: "dns-and-service-reachability", number: 5,
    eyebrow: "NAME → RESOLVER → CACHE → ADDRESS → CONNECT → RESPONSE",
    deck: t("DNS 성공은 주소를 얻었다는 뜻이고, 서비스 성공은 그 주소의 포트에 연결해 올바른 응답을 받았다는 뜻입니다. 한 번의 curl 실패를 네 경계로 나눠야 합니다.", "DNS success means an address was obtained. Service success means connecting to a port at that address and receiving the expected response. One curl failure must be split across four boundaries."),
    objectives: [t("resolver와 authoritative answer의 역할을 구분할 수 있다.", "Separate resolver and authoritative-answer roles."), t("TTL이 cache 수명을 제한하는 방식을 설명할 수 있다.", "Explain how TTL bounds cache lifetime."), t("이름·경로·TCP·application 실패를 각 증거로 분리할 수 있다.", "Separate name, route, TCP, and application failures by evidence."), t("stale record와 잘못된 listener를 최소 변경으로 복구할 수 있다.", "Repair stale records and wrong listeners minimally.")],
    foundation: { title: t("resolver는 이름을 주소로 바꾸지만 서비스 상태를 보장하지 않습니다", "A resolver turns a name into an address but does not guarantee service health"), body: t("getent는 application이 사용하는 이름 해석 경로를 보여 줍니다. dig는 DNS 응답과 TTL을 자세히 보여 주지만, 어느 프로세스가 포트를 듣는지는 알지 못합니다.", "getent shows the name-resolution path used by applications. dig exposes DNS answers and TTLs, but neither proves that a process listens on the target port.") },
    boundary: { title: t("같은 증상을 네 개의 독립된 질문으로 나눕니다", "Split one symptom into four independent questions"), body: t("이름이 주소가 되는가, 그 주소까지 경로가 있는가, 포트에 TCP 연결되는가, application이 올바르게 응답하는가를 순서대로 확인합니다.", "Ask in order: does the name become an address, is there a route to it, does TCP connect to the port, and does the application return the expected response?"), warning: t("DNS record를 바꾸어 route나 listener 문제를 가리지 마세요.", "Do not change DNS records to mask route or listener problems.") },
    figure: {
      kicker: "EXECUTABLE FIGURE · NAME TO VERIFIED RESPONSE",
      title: t("이름에서 응답까지 각 증거 경계를 실행하세요", "Execute every evidence boundary from name to response"),
      description: t("cache miss, DNS answer, 경로, TCP와 HTTP를 하나의 서비스 도달 경로에 정렬합니다.", "Align cache miss, DNS answer, route, TCP, and HTTP on one service path."),
      nodes: [node("client", "클라이언트", "CLIENT", "api.lab.test", 90, 150, "host"), node("resolver", "resolver", "RESOLVER", "10.20.0.53", 300, 70, "resolver"), node("cache", "로컬 cache", "LOCAL CACHE", "TTL countdown", 300, 235, "kernel"), node("endpoint", "서비스 주소", "SERVICE ADDRESS", "10.30.0.8:8080", 610, 150, "router"), node("service", "application", "APPLICATION", "HTTP 200", 860, 150, "service")],
      edges: [edge("client-resolver", "client", "resolver", "질의", "QUERY"), edge("resolver-cache", "resolver", "cache", "A record · TTL", "A RECORD · TTL"), edge("cache-endpoint", "cache", "endpoint", "선택 주소", "SELECTED ADDRESS"), edge("endpoint-service", "endpoint", "service", "TCP · HTTP", "TCP · HTTP")],
      phases: [
        { id: "cache-miss", label: t("cache miss", "Cache miss"), command: "getent ahostsv4 api.lab.test", output: ["local cache: no unexpired entry", "query configured resolver 10.20.0.53"], activeNodes: ["client", "resolver"], activeEdges: ["client-resolver"], decision: t("resolver 질의가 필요합니다.", "A resolver query is required."), facts: [fact("이름", "NAME", "api.lab.test"), fact("cache", "CACHE", "MISS")] },
        { id: "dns-answer", label: t("DNS 응답", "DNS answer"), command: "dig +noall +answer api.lab.test A", output: ["api.lab.test. 30 IN A 10.30.0.8"], activeNodes: ["resolver", "cache"], activeEdges: ["resolver-cache"], decision: t("주소 10.30.0.8을 30초 동안 cache할 수 있습니다.", "10.30.0.8 may be cached for 30 seconds."), facts: [fact("record", "RECORD", "A 10.30.0.8"), fact("TTL", "TTL", "30s")] },
        { id: "cache-hit", label: t("cache hit", "Cache hit"), command: "getent hosts api.lab.test", output: ["10.30.0.8 api.lab.test", "remaining TTL 18s"], activeNodes: ["client", "cache", "endpoint"], activeEdges: ["cache-endpoint"], decision: t("새 질의 없이 cache 주소를 사용합니다.", "The cached address is used without a new query."), facts: [fact("주소", "ADDRESS", "10.30.0.8"), fact("남은 TTL", "TTL LEFT", "18s")] },
        { id: "route", label: t("주소 경로", "Route to address"), command: "ip route get 10.30.0.8", output: ["10.30.0.8 via 10.20.0.1 dev eth0 src 10.20.0.2"], activeNodes: ["client", "endpoint"], activeEdges: ["cache-endpoint"], decision: t("이름 해석 뒤 별도로 IP 경로가 선택됩니다.", "An IP route is selected separately after resolution."), facts: [fact("egress", "EGRESS", "eth0"), fact("next hop", "NEXT HOP", "10.20.0.1")] },
        { id: "tcp-connect", label: t("TCP 연결", "TCP connect"), command: "nc -vz 10.30.0.8 8080", output: ["Connection to 10.30.0.8 8080 port [tcp/*] succeeded!"], activeNodes: ["endpoint", "service"], activeEdges: ["endpoint-service"], decision: t("포트의 listener까지 도달했습니다.", "The listener on the port is reachable."), facts: [fact("TCP", "TCP", "ESTABLISHED"), fact("port", "PORT", "8080")] },
        { id: "response", label: t("응답 검증", "Verify response"), command: "curl -sS -o /dev/null -w '%{http_code}' http://api.lab.test:8080/health", output: ["200"], activeNodes: ["client", "endpoint", "service"], activeEdges: ["cache-endpoint", "endpoint-service"], decision: t("application 응답까지 별도로 검증했습니다.", "The application response is verified separately."), facts: [fact("HTTP", "HTTP", "200"), fact("health", "HEALTH", "expected body")] },
      ],
    },
    incidents: [
      { id: "nxdomain", title: t("이름이 주소가 되지 않습니다", "Name does not become an address"), symptom: t("curl: Could not resolve host", "curl: Could not resolve host"), evidence: "dig status: NXDOMAIN", repairs: [repair("restore-a-record", "권한 DNS의 A record 복구", "Restore the authoritative A record"), repair("open-port", "서버 포트 개방", "Open the server port"), repair("add-route", "클라이언트 route 추가", "Add a client route")], correctRepair: "restore-a-record", explanation: t("실패가 이름 해석에서 끝났으므로 record를 복구합니다.", "Resolution stops at DNS, so restore the record.") },
      { id: "stale-address", title: t("만료 전 오래된 주소를 사용합니다", "An old address remains cached"), symptom: t("DNS 서버는 새 주소를 주지만 application은 이전 주소에 연결합니다.", "The DNS server returns a new address while the application connects to the old one."), evidence: "cached A 10.30.0.7 · TTL 22s remaining", repairs: [repair("wait-or-evict-cache", "TTL 만료를 기다리거나 해당 cache entry만 제거", "Wait for TTL expiry or evict only that cache entry"), repair("lower-mtu", "MTU 낮추기", "Lower MTU"), repair("flush-routes", "모든 route 삭제", "Flush all routes")], correctRepair: "wait-or-evict-cache", explanation: t("남아 있는 cache 수명만 처리합니다.", "Handle only the remaining cache lifetime.") },
      { id: "connection-refused", title: t("이름과 경로는 맞지만 연결이 거절됩니다", "Name and route work but connection is refused"), symptom: t("10.30.0.8:8080에서 RST를 받습니다.", "A reset returns from 10.30.0.8:8080."), evidence: "A record correct · route present · no LISTEN :8080", repairs: [repair("restore-listener", "10.30.0.8:8080 listener 복구", "Restore the 10.30.0.8:8080 listener"), repair("change-record", "DNS를 다른 임의 주소로 변경", "Point DNS to an arbitrary address"), repair("add-neighbor", "원격 IP를 ARP 표에 추가", "Add the remote IP to ARP")], correctRepair: "restore-listener", explanation: t("TCP listener 경계의 결함만 복구합니다.", "Repair only the TCP listener boundary.") },
    ],
    questions: [
      { id: "dns-proof", prompt: t("DNS A 응답이 직접 증명하는 것은?", "What does a DNS A answer directly prove?"), options: [option("name-to-address", "이름과 IPv4 주소의 매핑", "A name-to-IPv4 mapping"), option("service-healthy", "서비스가 정상", "The service is healthy"), option("port-listening", "포트가 LISTEN", "The port is listening")], correctAnswer: "name-to-address" },
      { id: "ttl-role", prompt: t("record TTL의 역할은?", "What is a record TTL for?"), options: [option("cache-lifetime", "cache가 응답을 재사용할 최대 시간", "Maximum time a cache may reuse the answer"), option("packet-hops", "IP packet의 hop 수", "IP packet hop count"), option("tcp-timeout", "TCP connect timeout", "TCP connect timeout")], correctAnswer: "cache-lifetime" },
      { id: "resolver-evidence", prompt: t("application이 실제로 사용하는 이름 해석 결과를 보는 명령은?", "Which command shows name resolution as used by applications?"), options: [option("getent", "getent hosts", "getent hosts"), option("ip-route", "ip route show", "ip route show"), option("ss", "ss -lnt", "ss -lnt")], correctAnswer: "getent" },
      { id: "refused-boundary", prompt: t("정확한 주소에서 connection refused가 뜻하는 것은?", "What does connection refused at the correct address mean?"), options: [option("listener-boundary", "해당 포트의 listener 경계", "The listener boundary on that port"), option("dns-nxdomain", "DNS NXDOMAIN", "DNS NXDOMAIN"), option("no-route", "반드시 route 없음", "Necessarily no route")], correctAnswer: "listener-boundary" },
      { id: "full-reachability", prompt: t("서비스 도달을 끝까지 증명하는 것은?", "What proves service reachability end to end?"), options: [option("expected-response", "이름·연결 뒤 기대한 application 응답", "Expected application response after resolution and connect"), option("a-record-only", "A record 하나", "An A record alone"), option("arp-only", "ARP entry 하나", "An ARP entry alone")], correctAnswer: "expected-response" },
    ],
    linuxCommands: "getent ahostsv4 api.lab.test\ndig +noall +answer api.lab.test A\nip route get 10.30.0.8\nnc -vz 10.30.0.8 8080\ncurl -v http://api.lab.test:8080/health",
    transfer: { title: t("마지막 장에서는 모든 경계의 증거를 한 진단 순서로 묶습니다", "The final chapter combines evidence from every boundary into one diagnostic order"), body: t("무작정 설정을 바꾸지 않고, 가장 가까운 경계부터 증거를 모아 첫 실패 지점을 찾습니다.", "Instead of changing settings at random, collect evidence from the nearest boundary outward and locate the first failure."), infrastructureChapter: "service-discovery-and-load-balancing" },
  },

  "diagnose-a-linux-network": {
    slug: "diagnose-a-linux-network", number: 6,
    eyebrow: "SYMPTOM → SCOPE → FIRST FAILED BOUNDARY → MINIMAL REPAIR → PROOF",
    deck: t("좋은 진단은 명령을 많이 실행하는 일이 아니라 첫 실패 경계를 좁히는 일입니다. interface부터 application response까지 같은 순서로 증거를 정렬합니다.", "Good diagnosis is not running many commands; it is narrowing down the first failed boundary. Align evidence in the same order from interface to application response."),
    objectives: [t("증상을 local·same-link·remote·service 범위로 좁힐 수 있다.", "Narrow symptoms to local, same-link, remote, or service scope."), t("interface부터 application까지 첫 실패 경계를 찾을 수 있다.", "Find the first failed boundary from interface through application."), t("tcpdump의 관찰 위치와 부재 증거를 해석할 수 있다.", "Interpret tcpdump location and absence evidence."), t("여러 결함이 섞인 사건을 최소 변경과 재검증으로 해결할 수 있다.", "Resolve multi-fault incidents with minimal changes and re-verification.")],
    foundation: { title: t("항상 가장 가까운 확실한 사실에서 시작합니다", "Always start from the nearest certain fact"), body: t("link, address, route, neighbor, listener, DNS, connect, response 순서로 확인하면 뒤 단계의 실패를 앞 단계 설정으로 가리는 일을 피할 수 있습니다.", "Checking link, address, route, neighbor, listener, DNS, connect, and response in order prevents masking a later failure with an earlier configuration change.") },
    boundary: { title: t("패킷이 보이지 않는 위치도 증거입니다", "A location where no packet appears is also evidence"), body: t("송신 interface에는 SYN이 있지만 라우터 egress에는 없다면 두 관찰점 사이가 첫 실패 범위입니다. 단, capture filter와 interface 선택이 맞는지 먼저 확인해야 합니다.", "If a SYN appears on the source interface but not on router egress, the first failure lies between those observation points—after verifying the capture filter and interface."), warning: t("ping 성공을 DNS, TCP listener 또는 application 정상의 증거로 확장하지 마세요.", "Do not extend ping success into proof of DNS, a TCP listener, or application health."),
    },
    figure: {
      kicker: "EXECUTABLE FIGURE · EVIDENCE LADDER",
      title: t("첫 실패 경계가 나타날 때까지 증거를 한 단계씩 쌓으세요", "Build evidence one boundary at a time until the first failure appears"),
      description: t("한 서비스 요청을 interface, route, packet, listener, DNS와 응답 관찰점에 통과시킵니다.", "Pass one service request through interface, route, packet, listener, DNS, and response observation points."),
      nodes: [node("link", "링크·주소", "LINK · ADDRESS", "ip link / addr", 85, 90, "evidence"), node("route", "경로·이웃", "ROUTE · NEIGH", "ip route / neigh", 250, 220, "evidence"), node("packet", "패킷 관찰", "PACKET CAPTURE", "tcpdump", 430, 90, "evidence"), node("socket", "소켓", "SOCKET", "ss", 610, 220, "evidence"), node("name", "이름", "NAME", "getent / dig", 770, 90, "evidence"), node("response", "응답", "RESPONSE", "curl", 900, 220, "service")],
      edges: [edge("link-route", "link", "route", "local state", "LOCAL STATE"), edge("route-packet", "route", "packet", "selected path", "SELECTED PATH"), edge("packet-socket", "packet", "socket", "SYN / ACK", "SYN / ACK"), edge("socket-name", "socket", "name", "endpoint", "ENDPOINT"), edge("name-response", "name", "response", "request", "REQUEST")],
      phases: [
        { id: "scope-link", label: t("링크·주소", "Link and address"), command: "ip -br link && ip -br -4 addr", output: ["eth0 UP 10.20.0.2/24", "lo UNKNOWN 127.0.0.1/8"], activeNodes: ["link"], activeEdges: [], decision: t("local interface 경계는 정상입니다.", "The local interface boundary is healthy."), facts: [fact("eth0", "ETH0", "UP"), fact("IPv4", "IPV4", "10.20.0.2/24")] },
        { id: "scope-route", label: t("경로·이웃", "Route and neighbor"), command: "ip route get 10.30.0.8 && ip neigh show 10.20.0.1", output: ["10.30.0.8 via 10.20.0.1 dev eth0", "10.20.0.1 lladdr 02:00:00:00:00:01 REACHABLE"], activeNodes: ["link", "route"], activeEdges: ["link-route"], decision: t("egress와 다음 홉 해석은 정상입니다.", "Egress and next-hop resolution are healthy."), facts: [fact("egress", "EGRESS", "eth0"), fact("next hop", "NEXT HOP", "10.20.0.1")] },
        { id: "scope-packet", label: t("패킷 위치", "Packet location"), command: "tcpdump -nn -i eth0 'host 10.30.0.8 and tcp port 8080'", output: ["10.20.0.2.49152 > 10.30.0.8.8080: Flags [S]", "10.30.0.8.8080 > 10.20.0.2.49152: Flags [S.]"] , activeNodes: ["route", "packet", "socket"], activeEdges: ["route-packet", "packet-socket"], decision: t("왕복 SYN이 보여 IP 경로를 통과했습니다.", "Bidirectional SYN traffic proves the IP path."), facts: [fact("outbound", "OUTBOUND", "SYN"), fact("return", "RETURN", "SYN-ACK")] },
        { id: "scope-socket", label: t("listener", "Listener"), command: "ss -lntp 'sport = :8080'", output: ["LISTEN 0 128 10.30.0.8:8080 users:((\"api\",pid=42,fd=3))"], activeNodes: ["socket"], activeEdges: [], decision: t("서비스 주소에서 listener가 확인됩니다.", "A listener is confirmed on the service address."), facts: [fact("state", "STATE", "LISTEN"), fact("owner", "OWNER", "pid 42") ] },
        { id: "scope-name", label: t("이름·주소", "Name and address"), command: "getent ahostsv4 api.lab.test", output: ["10.30.0.8 STREAM api.lab.test"], activeNodes: ["socket", "name"], activeEdges: ["socket-name"], decision: t("application resolver도 같은 endpoint를 선택합니다.", "The application resolver selects the same endpoint."), facts: [fact("name", "NAME", "api.lab.test"), fact("address", "ADDRESS", "10.30.0.8")] },
        { id: "scope-response", label: t("응답 검증", "Response proof"), command: "curl -fsS http://api.lab.test:8080/health", output: ["{\"status\":\"ok\"}"], activeNodes: ["name", "response"], activeEdges: ["name-response"], decision: t("기대한 응답으로 전체 경로를 검증했습니다.", "The expected response verifies the entire path."), facts: [fact("HTTP", "HTTP", "200"), fact("body", "BODY", "status=ok")] },
      ],
    },
    incidents: [
      { id: "two-faults", title: t("주소와 listener가 함께 잘못되었습니다", "Address and listener are both wrong"), symptom: t("처음에는 no route, 주소 복구 뒤에는 connection refused가 납니다.", "The first error is no route; after fixing the address, connection is refused."), evidence: "eth0 has 10.21.0.2/24 · service process bound 127.0.0.1:8080", repairs: [repair("fix-address-then-listener", "10.20.0.2/24 복구 후 listener를 서비스 주소에 bind", "Restore 10.20.0.2/24, then bind the listener to the service address"), repair("change-dns-only", "DNS 주소만 변경", "Change only DNS"), repair("flush-everything", "네트워크 상태 전체 초기화", "Reset all network state")], correctRepair: "fix-address-then-listener", explanation: t("첫 실패부터 하나씩 복구하고 매번 다음 경계를 재검증합니다.", "Repair from the first failure and re-check the next boundary each time.") },
      { id: "return-path", title: t("SYN은 나가지만 응답이 없습니다", "SYN leaves but no reply returns"), symptom: t("클라이언트 egress에는 SYN, 서버 ingress에는 SYN이 보입니다.", "SYN appears on client egress and server ingress."), evidence: "server route get 10.20.0.2 → unreachable", repairs: [repair("restore-return-route", "서버의 10.20.0.0/24 반환 경로 복구", "Restore the server return route to 10.20.0.0/24"), repair("restart-resolver", "resolver 재시작", "Restart the resolver"), repair("change-client-port", "client source port 고정", "Pin the client source port")], correctRepair: "restore-return-route", explanation: t("forward path 뒤의 첫 실패는 reply route입니다.", "The first failure after the forward path is the reply route.") },
      { id: "wrong-answer", title: t("연결되지만 health 검증이 실패합니다", "Connection succeeds but health verification fails"), symptom: t("TCP는 성공하고 HTTP 503을 받습니다.", "TCP succeeds and HTTP 503 is returned."), evidence: "SYN/SYN-ACK/ACK complete · listener present · response body degraded", repairs: [repair("repair-application-dependency", "application dependency와 health 상태 복구", "Repair the application dependency and health state"), repair("add-arp-entry", "정적 ARP entry 추가", "Add a static ARP entry"), repair("widen-prefix", "client prefix를 /8로 변경", "Change the client prefix to /8")], correctRepair: "repair-application-dependency", explanation: t("네트워크 경계는 통과했으므로 application 상태를 복구합니다.", "The network boundaries passed, so repair application health.") },
      { id: "capture-mismatch", title: t("capture에 패킷이 전혀 없습니다", "No packet appears in the capture"), symptom: t("curl은 timeout이지만 tcpdump는 조용합니다.", "curl times out while tcpdump stays silent."), evidence: "capture on eth1 · selected egress is eth0", repairs: [repair("capture-selected-egress", "ip route get으로 고른 eth0에서 다시 capture", "Capture again on eth0 selected by ip route get"), repair("declare-network-drop", "즉시 방화벽 drop으로 결론", "Immediately conclude firewall drop"), repair("delete-default", "기본 경로 삭제", "Delete the default route")], correctRepair: "capture-selected-egress", explanation: t("부재 증거를 해석하기 전에 관찰 위치를 바로잡습니다.", "Correct the observation point before interpreting absence evidence.") },
    ],
    questions: [
      { id: "first-boundary", prompt: t("진단에서 먼저 찾을 것은?", "What should diagnosis locate first?"), options: [option("first-failed-boundary", "증거가 처음 끊기는 경계", "The first boundary where evidence breaks"), option("most-complex-config", "가장 복잡한 설정", "The most complex configuration"), option("last-log-line", "마지막 로그 한 줄", "The last log line")], correctAnswer: "first-failed-boundary" },
      { id: "capture-absence", prompt: t("tcpdump에 패킷이 없을 때 먼저 확인할 것은?", "What comes first when tcpdump shows no packet?"), options: [option("observation-point", "interface와 filter가 실제 경로와 맞는지", "Whether interface and filter match the actual path"), option("dns-record", "DNS record 삭제", "Delete the DNS record"), option("listener-restart", "listener 재시작", "Restart the listener")], correctAnswer: "observation-point" },
      { id: "ping-scope", prompt: t("ping 성공이 증명하지 못하는 것은?", "What does successful ping not prove?"), options: [option("application-response", "TCP listener와 application 응답", "A TCP listener and application response"), option("some-ip-return", "일부 IP 왕복", "Some IP return path"), option("icmp-reply", "ICMP reply", "An ICMP reply")], correctAnswer: "application-response" },
      { id: "return-evidence", prompt: t("서버 ingress에 SYN이 있고 client에 SYN-ACK가 없을 때 다음 증거는?", "If SYN reaches server ingress but SYN-ACK never reaches the client, what evidence is next?"), options: [option("server-reply-route", "서버 listener와 client로의 반환 경로", "Server listener and return route to the client"), option("client-dns", "client DNS cache만", "Only client DNS cache"), option("source-mac", "원격 최종 호스트의 MAC", "Remote final-host MAC")], correctAnswer: "server-reply-route" },
      { id: "repair-proof", prompt: t("복구가 끝났음을 증명하는 방식은?", "How do you prove a repair is complete?"), options: [option("rerun-end-to-end", "최소 변경 뒤 같은 경로를 끝까지 재검증", "Re-run the same path end to end after the minimal change"), option("config-saved", "설정 파일 저장", "Save the config file"), option("one-command", "한 명령의 exit 0", "One command exits 0")], correctAnswer: "rerun-end-to-end" },
    ],
    linuxCommands: "ip -br link\nip -br -4 addr\nip route get <service-ip>\nip neigh show\nss -lntp\ngetent ahostsv4 <service-name>\ntcpdump -nn -i <egress> 'host <service-ip>'\ncurl -v http://<service-name>:<port>/health",
    transfer: { title: t("이제 단일 호스트 진단을 격리된 인프라 설계로 확장합니다", "Now extend single-host diagnosis into isolated infrastructure design"), body: t("동일한 interface·route·socket·DNS 증거를 namespace, veth, bridge, NAT, policy와 가용성 경계에 다시 적용합니다. 기초 과정에서 익힌 진단 순서가 설계 검증 계약이 됩니다.", "Reuse the same interface, route, socket, and DNS evidence across namespaces, veth pairs, bridges, NAT, policy, and availability boundaries. The diagnostic order from this foundation becomes the design verification contract."), infrastructureChapter: "network-observability-and-capacity" },
  },
};

export function getAdvancedLinuxNetworkingConfig(slug: AdvancedLinuxNetworkingSlug): AdvancedChapterConfig {
  return advancedLinuxNetworkingConfigs[slug];
}

export function evaluateAdvancedIncident(slug: AdvancedLinuxNetworkingSlug, incidentId: string, repairId: string): boolean {
  const incident = advancedLinuxNetworkingConfigs[slug].incidents.find((candidate) => candidate.id === incidentId);
  return incident?.correctRepair === repairId;
}

export function canCompleteAdvancedIncidents(slug: AdvancedLinuxNetworkingSlug, repairs: Readonly<Record<string, string>>): boolean {
  return advancedLinuxNetworkingConfigs[slug].incidents.every((incident) => repairs[incident.id] === incident.correctRepair);
}

export function canCompleteAdvancedChapter(input: { figureComplete: boolean; incidentsComplete: boolean; conceptsMastered: boolean }): boolean {
  return input.figureComplete && input.incidentsComplete && input.conceptsMastered;
}

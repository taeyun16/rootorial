import { linuxNetworkingQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxNetworkingQuestions;

export function LinuxNetworkingConceptCheck({
  onMasteryChange,
}: {
  onMasteryChange: (mastered: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const { recordAnswers } = useLearningAnalytics();

  const questions: Array<ConceptQuestionSpec<QuestionId>> = [
    {
      id: "socket-boundary",
      index: "01",
      prompt: isKo
        ? <><code>socket()</code>이 프로세스에 <code>fd 4</code>를 반환했습니다. 이어서 <code>send(fd 4, buffer)</code>를 호출할 때 fd와 byte의 경계를 올바르게 설명한 것은?</>
        : <><code>socket()</code> returned <code>fd 4</code> to a process. When it next calls <code>send(fd 4, buffer)</code>, which statement correctly describes the fd and byte boundary?</>,
      options: [
        {
          value: "fd-references-kernel-socket",
          label: t(
            "fd 4는 이 프로세스의 커널 socket 참조이고, send는 user buffer의 byte를 그 socket의 send buffer로 복사",
            "fd 4 is this process's reference to a kernel socket, and send copies bytes from the user buffer into that socket's send buffer",
          ),
        },
        {
          value: "fd-number-crosses-network",
          label: t(
            "fd 번호 4가 TCP header에 들어가 원격 프로세스의 같은 번호 fd를 선택",
            "The number 4 is placed in the TCP header to select the same fd number in the remote process",
          ),
        },
        {
          value: "socket-is-remote-file",
          label: t(
            "fd 4는 원격 파일 자체이며 send가 로컬 kernel을 거치지 않고 그 파일에 직접 기록",
            "fd 4 is the remote file itself, so send writes to it directly without passing through the local kernel",
          ),
        },
      ],
      correctAnswer: linuxNetworkingQuestions["socket-boundary"].correctAnswer,
      answerLabel: t(
        "정답: process-local fd → kernel socket → send buffer",
        "Answer: process-local fd → kernel socket → send buffer",
      ),
      correctFeedback: t(
        "맞았습니다. fd 번호는 프로세스의 descriptor table 안에서만 의미가 있습니다. kernel은 그 참조로 socket을 찾고 user buffer의 byte를 전송 상태에 넘기며, fd 번호 자체는 packet에 실리지 않습니다.",
        "Right. An fd number has meaning only inside the process's descriptor table. The kernel uses it to find the socket and hand user-buffer bytes to transport state; the fd number itself never appears in a packet.",
      ),
      incorrectFeedback: t(
        "프로세스의 번호표와 네트워크 endpoint를 분리하세요. fd는 로컬 descriptor table의 index이고, 실제 전송은 fd가 가리키는 kernel socket과 그 local/remote endpoint 상태를 통해 진행됩니다.",
        "Separate the process's handle from the network endpoint. An fd is an index in a local descriptor table; transmission proceeds through the referenced kernel socket and its local and remote endpoint state.",
      ),
    },
    {
      id: "longest-prefix-route",
      index: "02",
      prompt: isKo
        ? <>목적지가 <code>198.51.100.140</code>이고 route table에 <code>198.51.100.0/24 via 192.0.2.1</code>, <code>198.51.100.128/25 via 192.0.2.254</code>, default route가 있다면 어느 route를 선택해야 할까요?</>
        : <>The destination is <code>198.51.100.140</code>. The route table contains <code>198.51.100.0/24 via 192.0.2.1</code>, <code>198.51.100.128/25 via 192.0.2.254</code>, and a default route. Which route should be selected?</>,
      options: [
        {
          value: "most-specific-prefix",
          label: t(
            "목적지와 일치하는 route 중 prefix가 가장 긴 /25, next hop 192.0.2.254",
            "The matching route with the longest prefix: /25 via next hop 192.0.2.254",
          ),
        },
        {
          value: "first-listed-route",
          label: t(
            "표에 먼저 적힌 /24, next hop 192.0.2.1",
            "The /24 route via 192.0.2.1 because it appears first",
          ),
        },
        {
          value: "default-route-wins",
          label: t(
            "default route는 모든 주소와 일치하므로 항상 default gateway",
            "The default gateway because a default route matches every address and therefore always wins",
          ),
        },
      ],
      correctAnswer: linuxNetworkingQuestions["longest-prefix-route"].correctAnswer,
      answerLabel: t(
        "정답: 가장 구체적인 일치인 198.51.100.128/25",
        "Answer: the most specific match, 198.51.100.128/25",
      ),
      correctFeedback: t(
        "맞았습니다. 세 route가 모두 주소와 일치할 수 있지만 /25가 가장 긴 prefix이므로 먼저 선택됩니다. 같은 prefix 길이끼리 경쟁할 때에야 metric 같은 추가 기준을 비교합니다.",
        "Right. All three routes can match the address, but /25 wins because it has the longest prefix. Additional criteria such as metrics matter only among otherwise competing routes of the same prefix length.",
      ),
      incorrectFeedback: t(
        "route table을 위에서부터 실행하는 명령 목록으로 읽지 마세요. 먼저 목적지와 일치하는 prefix를 모은 뒤 가장 긴, 즉 가장 구체적인 prefix를 선택합니다. default route의 /0은 마지막 fallback입니다.",
        "Do not read the route table as commands executed from top to bottom. Gather matching prefixes first, then choose the longest and therefore most specific one. The default route's /0 is the fallback.",
      ),
    },
    {
      id: "next-hop-addressing",
      index: "03",
      prompt: isKo
        ? <>client <code>192.0.2.10/24</code>가 gateway <code>192.0.2.1</code>을 거쳐 다른 subnet의 server <code>198.51.100.20</code>으로 보냅니다. client가 내보내는 첫 frame과 그 안의 IP packet은 누구를 목적지로 삼을까요?</>
        : <>Client <code>192.0.2.10/24</code> sends through gateway <code>192.0.2.1</code> to server <code>198.51.100.20</code> on another subnet. What destinations do the client's first frame and its enclosed IP packet use?</>,
      options: [
        {
          value: "gateway-mac-keeps-remote-ip",
          label: t(
            "frame은 gateway의 MAC, IP packet은 계속 remote server의 IP 198.51.100.20",
            "The frame targets the gateway's MAC while the IP packet keeps remote server IP 198.51.100.20",
          ),
        },
        {
          value: "remote-mac-directly",
          label: t(
            "client가 다른 subnet을 건너 remote server의 MAC을 직접 알아내 frame에 사용",
            "The client discovers the remote server's MAC across subnets and uses it in the frame",
          ),
        },
        {
          value: "gateway-ip-replaces-destination",
          label: t(
            "frame과 IP packet 모두 gateway를 목적지로 바꾸므로 IP destination도 192.0.2.1",
            "Both frame and IP packet switch to the gateway, so the IP destination becomes 192.0.2.1",
          ),
        },
      ],
      correctAnswer: linuxNetworkingQuestions["next-hop-addressing"].correctAnswer,
      answerLabel: t(
        "정답: link 목적지는 next hop, IP 목적지는 end host",
        "Answer: the link destination is the next hop; the IP destination is the end host",
      ),
      correctFeedback: t(
        "맞았습니다. 이 no-NAT fixture에서 client는 같은 link에 있는 gateway의 MAC을 neighbor table로 해석합니다. router는 다음 link의 frame header를 새로 만들지만 IP destination은 remote server로 유지합니다.",
        "Right. In this no-NAT fixture, the client resolves the MAC of the gateway on its own link. The router builds a new frame header for the next link, while the IP destination remains the remote server.",
      ),
      incorrectFeedback: t(
        "end-to-end IP destination과 hop-by-hop link destination을 나누세요. 다른 subnet의 MAC은 client link에서 직접 도달하지 않으므로 client는 route가 정한 next hop의 MAC으로 frame을 보냅니다.",
        "Separate the end-to-end IP destination from the hop-by-hop link destination. A remote-subnet MAC is not directly reachable on the client's link, so the frame targets the MAC of the next hop selected by the route.",
      ),
    },
    {
      id: "cumulative-ack",
      index: "04",
      prompt: isKo
        ? <>server TCP가 client에게 <code>ACK 1100</code>을 보냈습니다. 이 fixture에서 client가 sequence 1000부터 byte를 보냈다면 ACK가 직접 보장하는 것은?</>
        : <>Server TCP sent <code>ACK 1100</code> to the client. In this fixture, the client began sending bytes at sequence 1000. What does the ACK directly establish?</>,
      options: [
        {
          value: "ack-covers-contiguous-bytes",
          label: t(
            "server TCP가 1099까지 연속된 byte를 받았고 다음으로 1100을 기대함",
            "Server TCP received contiguous bytes through 1099 and expects 1100 next",
          ),
        },
        {
          value: "ack-is-packet-count",
          label: t(
            "server가 packet 1,100개를 받았다는 누적 packet 개수",
            "The server received a cumulative count of 1,100 packets",
          ),
        },
        {
          value: "ack-means-application-read",
          label: t(
            "server application이 모든 byte를 recv하고 업무 처리까지 끝냈음",
            "The server application called recv for every byte and finished processing them",
          ),
        },
      ],
      correctAnswer: linuxNetworkingQuestions["cumulative-ack"].correctAnswer,
      answerLabel: t(
        "정답: 1099까지 연속 수신, 다음 기대 sequence 1100",
        "Answer: contiguous receipt through 1099; next expected sequence 1100",
      ),
      correctFeedback: t(
        "맞았습니다. TCP ACK 값은 다음에 기대하는 byte sequence이므로 앞선 연속 구간을 누적 확인합니다. 중간 byte가 비면 뒤 byte가 도착해도 ACK는 그 첫 gap을 넘어가지 않습니다.",
        "Right. A TCP ACK names the next byte sequence expected and therefore cumulatively confirms the preceding contiguous range. If a byte in the middle is missing, later arrivals do not move the ACK beyond that first gap.",
      ),
      incorrectFeedback: t(
        "ACK를 packet 수나 application 완료 신호로 읽지 마세요. TCP는 byte stream의 연속 수신 경계를 확인하며, application이 receive queue에서 byte를 읽었는지는 별도 상태입니다.",
        "Do not read an ACK as a packet count or application-completion signal. TCP acknowledges a contiguous byte-stream boundary; whether the application consumed those bytes from its receive queue is separate state.",
      ),
    },
    {
      id: "listener-delivery",
      index: "05",
      prompt: isKo
        ? <>server의 <code>fd 3</code>이 <code>LISTEN</code> 중이고 handshake 뒤 <code>accept()</code>가 <code>fd 5</code>를 반환했습니다. client의 send와 TCP ACK까지 끝났지만 server process는 아직 <code>recv()</code>를 호출하지 않았습니다. 올바른 상태 설명은?</>
        : <>Server <code>fd 3</code> is in <code>LISTEN</code>, and after the handshake <code>accept()</code> returned <code>fd 5</code>. The client's send and TCP ACK completed, but the server process has not called <code>recv()</code>. Which state description is correct?</>,
      options: [
        {
          value: "accept-new-fd-recv-confirms-delivery",
          label: t(
            "fd 3은 LISTEN을 유지하고 fd 5가 연결을 담당하며, application delivery는 recv(fd 5)가 payload를 반환할 때 확인",
            "fd 3 remains in LISTEN, fd 5 owns the connection, and application delivery is confirmed when recv(fd 5) returns the payload",
          ),
        },
        {
          value: "listener-becomes-connected",
          label: t(
            "fd 3 자체가 CONNECTED로 바뀌고 accept의 fd 5는 같은 fd의 별칭",
            "fd 3 itself becomes CONNECTED and fd 5 from accept is merely an alias for the same fd",
          ),
        },
        {
          value: "send-return-proves-application",
          label: t(
            "client send가 성공하고 ACK가 왔으므로 recv 없이도 server application 처리가 완료",
            "Because client send succeeded and an ACK arrived, server application processing is complete without recv",
          ),
        },
      ],
      correctAnswer: linuxNetworkingQuestions["listener-delivery"].correctAnswer,
      answerLabel: t(
        "정답: listener는 유지, accepted fd는 별도, recv가 application 경계",
        "Answer: listener retained, accepted fd separate, recv marks the application boundary",
      ),
      correctFeedback: t(
        "맞았습니다. listening socket은 새 연결을 계속 받을 수 있고 accept가 반환한 별도 socket fd가 한 client의 byte stream을 담당합니다. TCP ACK는 peer transport 수신을 말하지만 application 소비는 recv 결과로 확인해야 합니다.",
        "Right. The listening socket remains available for new connections, while the separate socket fd returned by accept owns one client's byte stream. A TCP ACK establishes peer transport receipt; application consumption requires evidence from recv.",
      ),
      incorrectFeedback: t(
        "listener, accepted connection, application 소비를 세 경계로 분리하세요. accept는 listener를 변환하지 않고 새 connected fd를 반환하며, send와 ACK만으로 remote process의 recv나 처리를 증명할 수 없습니다.",
        "Separate the listener, accepted connection, and application-consumption boundaries. accept returns a new connected fd rather than converting the listener, and send plus ACK cannot prove remote recv or processing.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE FD → TCP → IP → NEXT HOP",
        title: t(
          "socket, route, next hop과 전달 경계를 연결하세요",
          "Connect sockets, routes, next hops, and delivery boundaries",
        ),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.",
          "Finish all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t(
          "프로세스에서 원격 application까지의 경계를 정확히 추적했습니다",
          "The boundaries from process to remote application are traced correctly",
        ),
        incorrect: t(
          "fd, route, link hop, TCP와 application 경계를 다시 추적하세요",
          "Retrace the fd, route, link-hop, TCP, and application boundaries",
        ),
        checkAnswers: t(
          "네트워크 경로 판정 확인하기",
          "Check the network-path decisions",
        ),
        completed: t(
          "이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.",
          "Concept check complete — now confirm both activity states.",
        ),
        retry: t(
          "가장 긴 prefix, next hop, 누적 ACK와 recv 경계 중 일부가 아직 섞여 있습니다.",
          "Some boundaries among longest-prefix routing, next hops, cumulative ACKs, and recv are still mixed.",
        ),
        idle: t(
          "다섯 답을 고른 뒤 fd에서 remote application까지의 경로를 확인하세요.",
          "Choose all five answers, then check the path from the fd to the remote application.",
        ),
      }}
    />
  );
}

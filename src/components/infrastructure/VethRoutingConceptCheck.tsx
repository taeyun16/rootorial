import { infrastructureVethRoutingQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureVethRoutingQuestions;

export function VethRoutingConceptCheck({
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
      id: "veth-pair-contract",
      index: "01",
      prompt: t(
        "veth pair를 client와 host에 나눠 놓았을 때 kernel이 관리하는 object 관계는 무엇일까요?",
        "After splitting a veth pair between client and host, which object relationship does the kernel manage?",
      ),
      options: [
        { value: "one-interface-in-two-namespaces", label: t("한 interface가 두 namespace에 동시에 존재", "one interface exists in both namespaces") },
        { value: "two-linked-interface-objects", label: t("서로 연결된 두 interface가 각자 하나의 namespace를 소유", "two linked interfaces each have one namespace owner") },
        { value: "bridge-created-automatically", label: t("veth를 만들면 bridge도 자동 생성", "creating veth automatically creates a bridge") },
      ],
      correctAnswer: infrastructureVethRoutingQuestions["veth-pair-contract"].correctAnswer,
      answerLabel: t("정답: 연결된 두 interface object", "Answer: two linked interface objects"),
      correctFeedback: t(
        "맞았습니다. packet은 한 endpoint로 들어가 peer endpoint에서 나오며, 두 endpoint의 namespace 소유권과 admin state는 각각 독립적입니다.",
        "Correct. A packet entering one endpoint emerges from its peer; each endpoint has independent namespace ownership and admin state.",
      ),
      incorrectFeedback: t(
        "Chapter 1의 interface 단일 소유권을 유지하세요. veth는 그 규칙을 깨지 않고 별도의 peer object를 연결합니다.",
        "Keep Chapter 1's single-owner interface rule. veth connects a distinct peer object without breaking that rule.",
      ),
    },
    {
      id: "bridge-forwarding-scope",
      index: "02",
      prompt: t(
        "client와 app veth peer를 br0에 연결했지만 두 주소가 서로 다른 subnet이라면 bridge가 해 주지 않는 일은?",
        "The client and app peers are attached to br0, but their addresses are in different subnets. What will the bridge not do?",
      ),
      options: [
        { value: "same-l2-domain-only", label: t("서로 다른 CIDR 사이의 IP routing", "IP routing between different CIDRs") },
        { value: "routes-between-any-cidr", label: t("MAC 기반 L2 frame forwarding", "MAC-based Layer 2 frame forwarding") },
        { value: "enables-nat-by-default", label: t("veth frame을 peer로 전달", "delivery of veth frames to their peers") },
      ],
      correctAnswer: infrastructureVethRoutingQuestions["bridge-forwarding-scope"].correctAnswer,
      answerLabel: t("정답: bridge는 같은 L2 domain만 잇습니다", "Answer: a bridge joins one Layer 2 domain"),
      correctFeedback: t(
        "맞았습니다. bridge는 L2 forwarding을 제공하지만 다른 IP subnet 사이의 route나 gateway 역할을 자동으로 만들지 않습니다.",
        "Correct. A bridge forwards at Layer 2; it does not automatically create routes or act as a gateway between IP subnets.",
      ),
      incorrectFeedback: t(
        "bridge port 연결과 IP route를 분리하세요. 서로 다른 CIDR을 건너려면 router와 forwarding이 필요합니다.",
        "Separate bridge-port attachment from IP routing. Crossing different CIDRs requires a router and forwarding.",
      ),
    },
    {
      id: "gateway-reachability",
      index: "03",
      prompt: t(
        "client가 10.30.0.0/24를 `via 10.99.0.1`로 보내려 하지만 eth0은 10.20.0.2/24입니다. 최초 실패 조건은?",
        "The client routes 10.30.0.0/24 via 10.99.0.1, while eth0 is 10.20.0.2/24. What fails first?",
      ),
      options: [
        { value: "gateway-must-be-on-link", label: t("gateway가 선택한 egress link에서 on-link가 아님", "the gateway is not on-link through the selected egress") },
        { value: "gateway-may-be-any-address", label: t("gateway 주소는 어느 subnet이어도 됨", "a gateway may be in any subnet") },
        { value: "destination-must-equal-gateway", label: t("destination CIDR가 gateway 주소와 같아야 함", "the destination CIDR must equal the gateway address") },
      ],
      correctAnswer: infrastructureVethRoutingQuestions["gateway-reachability"].correctAnswer,
      answerLabel: t("정답: next-hop gateway는 먼저 on-link여야 합니다", "Answer: the next-hop gateway must first be on-link"),
      correctFeedback: t(
        "맞았습니다. kernel은 remote destination을 보내기 전에 local link에서 next-hop gateway를 resolve할 수 있어야 합니다.",
        "Correct. Before sending toward a remote destination, the kernel must be able to resolve the next-hop gateway on the local link.",
      ),
      incorrectFeedback: t(
        "route의 destination과 next hop을 나누세요. gateway는 destination을 대체하지 않으며 local egress에서 직접 도달 가능해야 합니다.",
        "Separate the route destination from its next hop. A gateway does not replace the destination and must be directly reachable on the local egress.",
      ),
    },
    {
      id: "router-forwarding",
      index: "04",
      prompt: t(
        "router namespace의 두 interface와 route가 맞지만 packet이 한 interface에서 다른 interface로 넘어가지 않습니다. 필요한 kernel state는?",
        "Both router-namespace interfaces and routes are correct, but packets do not cross from one interface to the other. Which kernel state is required?",
      ),
      options: [
        { value: "enable-ip-forwarding", label: "net.ipv4.ip_forward=1" },
        { value: "attach-both-links-to-loopback", label: t("두 link를 lo에 연결", "attach both links to lo") },
        { value: "bind-listener-on-router", label: t("router에서 app listener 생성", "create the app listener on the router") },
      ],
      correctAnswer: infrastructureVethRoutingQuestions["router-forwarding"].correctAnswer,
      answerLabel: t("정답: router namespace에서 IP forwarding 활성화", "Answer: enable IP forwarding inside the router namespace"),
      correctFeedback: t(
        "맞았습니다. router process가 아니라 router namespace의 network stack이 두 L3 interface 사이에서 packet을 전달합니다.",
        "Correct. The router namespace's network stack—not a router process—moves packets between the two Layer 3 interfaces.",
      ),
      incorrectFeedback: t(
        "listener와 forwarding을 구분하세요. destination service가 열려 있어도 중간 namespace가 packet을 전달하도록 설정돼야 합니다.",
        "Separate listener state from forwarding. Even with an open destination service, the transit namespace must be configured to forward packets.",
      ),
    },
    {
      id: "return-path",
      index: "05",
      prompt: t(
        "client → app SYN이 도착했지만 app에는 10.20.0.0/24로 돌아가는 route가 없습니다. 연결 판정은?",
        "The client-to-app SYN arrives, but app has no route back to 10.20.0.0/24. What is the connection outcome?",
      ),
      options: [
        { value: "reply-needs-route-back", label: t("reply path가 없어 왕복 연결 실패", "the connection fails because the reply path is missing") },
        { value: "forward-route-is-enough", label: t("forward path가 있으므로 연결 성공", "the connection succeeds because the forward path exists") },
        { value: "tcp-discovers-route-automatically", label: t("TCP가 자동으로 return route 생성", "TCP automatically creates the return route") },
      ],
      correctAnswer: infrastructureVethRoutingQuestions["return-path"].correctAnswer,
      answerLabel: t("정답: request와 reply 모두 route가 필요합니다", "Answer: both request and reply need routes"),
      correctFeedback: t(
        "맞았습니다. one-way reachability는 TCP 연결이 아닙니다. app의 reply도 router를 통해 client subnet으로 돌아갈 수 있어야 합니다.",
        "Correct. One-way reachability is not a TCP connection. The app reply must also return through the router to the client subnet.",
      ),
      incorrectFeedback: t(
        "SYN 도착과 handshake 완료를 분리하세요. return route가 없으면 SYN-ACK가 client로 돌아가지 못합니다.",
        "Separate SYN arrival from handshake completion. Without a return route, the SYN-ACK cannot get back to the client.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "VETH → TRANSIT → ROUTE → RETURN",
        title: t("두 방향의 topology contract를 판정하세요", "Judge the two-way topology contract"),
        description: t("다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock chapter completion."),
        correct: t("L2와 L3 경계를 정확히 구분했습니다", "The Layer 2 and Layer 3 boundaries are separated correctly"),
        incorrect: t("veth peer·bridge·gateway·return path를 다시 추적하세요", "Retrace the veth peers, bridge, gateway, and return path"),
        checkAnswers: t("토폴로지 판정 확인", "Check topology decisions"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("forward path와 return path 중 하나가 아직 섞여 있습니다.", "One of the forward or return paths is still mixed."),
        idle: t("다섯 답을 고른 뒤 왕복 topology를 확인하세요.", "Choose all five answers, then check the round-trip topology."),
      }}
    />
  );
}

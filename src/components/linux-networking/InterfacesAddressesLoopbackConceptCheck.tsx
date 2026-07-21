import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId =
  | "interface-link-state"
  | "address-prefix"
  | "loopback-scope"
  | "localhost-resolution"
  | "observation-scope";

export function InterfacesAddressesLoopbackConceptCheck({
  onMasteryChange,
}: {
  onMasteryChange: (mastered: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => (isKo ? ko : en);
  const { recordAnswers } = useLearningAnalytics();

  const questions: Array<ConceptQuestionSpec<QuestionId>> = [
    {
      id: "interface-link-state",
      index: "01",
      prompt: isKo ? (
        <><code>eth0 DOWN</code>이 출력됐습니다. 이 한 줄이 확실히 증명하는 것은 무엇일까요?</>
      ) : (
        <><code>eth0 DOWN</code> is printed. What does that line prove?</>
      ),
      options: [
        {
          value: "interface-exists-while-link-down",
          label: t("eth0는 존재하지만 관리 상태가 down이다", "eth0 exists while its admin state is down"),
        },
        {
          value: "interface-does-not-exist",
          label: t("eth0 장치가 존재하지 않는다", "The eth0 device does not exist"),
        },
        {
          value: "address-is-unreachable",
          label: t("모든 IPv4 주소가 원격에서 도달 가능하지 않다", "Every IPv4 address is unreachable remotely"),
        },
      ],
      correctAnswer: "interface-exists-while-link-down",
      answerLabel: t("정답: 존재와 관리 상태는 별도", "Answer: existence and link state are separate"),
      correctFeedback: t("맞았습니다. 출력에 이름이 있다는 것은 인터페이스의 존재를, DOWN은 관리 상태를 말합니다.", "Right. The name proves the object exists; DOWN reports its admin state."),
      incorrectFeedback: t("존재하지 않는 인터페이스는 이 목록에 행 자체가 없습니다. 이름과 상태를 분리해 읽으세요.", "A missing interface has no row in the list. Read the name and state separately."),
    },
    {
      id: "address-prefix",
      index: "02",
      prompt: isKo ? (
        <><code>10.0.0.2/24</code>에서 주소와 프리픽스는 각각 무엇을 설명할까요?</>
      ) : (
        <>What do the address and prefix in <code>10.0.0.2/24</code> describe?</>
      ),
      options: [
        {
          value: "address-on-interface-prefix-defines-network",
          label: t("주소는 인터페이스의 IPv4 식별값, /24는 네트워크 경계", "The address is the interface's IPv4 identity; /24 defines the network boundary"),
        },
        {
          value: "address-is-mac-prefix-is-port",
          label: t("주소는 MAC, /24는 애플리케이션 포트", "The address is a MAC; /24 is an application port"),
        },
        {
          value: "prefix-turns-link-up",
          label: t("/24가 인터페이스의 링크 상태를 up으로 변경", "/24 changes the interface link state to up"),
        },
      ],
      correctAnswer: "address-on-interface-prefix-defines-network",
      answerLabel: t("정답: 인터페이스 주소와 네트워크 프리픽스", "Answer: interface address and network prefix"),
      correctFeedback: t("맞았습니다. 주소 할당은 링크 상태나 MAC 주소를 대신하지 않으며 /24에서 10.0.0.0/24가 파생됩니다.", "Right. Assigning an address replaces neither link state nor MAC, and /24 derives 10.0.0.0/24."),
      incorrectFeedback: t("IPv4 주소, 프리픽스, MAC 주소와 포트는 서로 다른 층의 정보입니다.", "IPv4 addresses, prefixes, MACs, and ports are different kinds of state."),
    },
    {
      id: "loopback-scope",
      index: "03",
      prompt: t("127.0.0.1로 향한 패킷 경로는 어디까지 나갈까요?", "How far does a packet path to 127.0.0.1 travel?"),
      options: [
        {
          value: "loopback-stays-inside-current-network-view",
          label: t("현재 호스트 안의 lo와 로컬 네트워크 스택", "Through lo and the local stack inside the current host network view"),
        },
        {
          value: "ethernet-default-gateway",
          label: t("eth0 프레임과 기본 게이트웨이", "An eth0 frame and the default gateway"),
        },
        {
          value: "all-hosts-loopback",
          label: t("같은 LAN에 있는 모든 호스트의 루프백", "The loopback interface on every host in the LAN"),
        },
      ],
      correctAnswer: "loopback-stays-inside-current-network-view",
      answerLabel: t("정답: 현재 호스트 내부", "Answer: inside the current network view"),
      correctFeedback: t("맞았습니다. 루프백 경로는 Ethernet 프레임을 만들지 않고 현재 호스트의 로컬 네트워크 스택 안에서 끝납니다.", "Right. A loopback path creates no Ethernet frame and closes inside the current host's local stack."),
      incorrectFeedback: t("127.0.0.1은 원격 호스트나 게이트웨이를 가리키는 주소가 아닙니다.", "127.0.0.1 does not name a remote host or gateway."),
    },
    {
      id: "localhost-resolution",
      index: "04",
      prompt: t("localhost는 인터페이스 이름일까요, 호스트 이름일까요?", "Is localhost an interface name or a hostname?"),
      options: [
        {
          value: "localhost-resolves-to-loopback",
          label: t("127.0.0.1 같은 루프백 주소로 해석되는 호스트 이름", "A hostname that resolves to a loopback address such as 127.0.0.1"),
        },
        {
          value: "localhost-is-interface",
          label: t("커널이 반드시 만드는 인터페이스 이름", "An interface name the kernel must create"),
        },
        {
          value: "localhost-is-gateway",
          label: t("로컬 서브넷 게이트웨이의 별칭", "An alias for the local subnet's gateway"),
        },
      ],
      correctAnswer: "localhost-resolves-to-loopback",
      answerLabel: t("정답: 호스트 이름 → 루프백 주소", "Answer: hostname → loopback address"),
      correctFeedback: t("맞았습니다. 이름 해석은 성공해도 lo가 down이면 로컬 전달은 실패할 수 있습니다.", "Right. Name resolution can succeed even while local delivery fails because lo is down."),
      incorrectFeedback: t("인터페이스 목록에는 lo가 있고 hosts 이름 연결에는 localhost가 있습니다. 두 이름의 역할을 분리하세요.", "The interface list contains lo while the hosts mapping contains localhost. Keep their roles separate."),
    },
    {
      id: "observation-scope",
      index: "05",
      prompt: t("인터페이스가 보이지만 통신이 되지 않을 때 어떤 관찰 순서가 가장 정확할까요?", "An interface exists, but communication fails. Which observation sequence is most precise?"),
      options: [
        {
          value: "inspect-link-address-and-route-separately",
          label: t("링크 상태, 주소, 선택된 경로를 각각 확인", "Inspect link, address, and the selected route as separate evidence"),
        },
        {
          value: "ping-only",
          label: t("ping 결과 하나로 모든 층 판정", "Use one ping result to judge every layer"),
        },
        {
          value: "change-dns-first",
          label: t("인터페이스 상태와 무관하게 DNS부터 교체", "Replace DNS first regardless of interface state"),
        },
      ],
      correctAnswer: "inspect-link-address-and-route-separately",
      answerLabel: t("정답: 각 상태를 별도 명령으로 관찰", "Answer: observe each state separately"),
      correctFeedback: t("맞았습니다. 존재, 관리 상태와 연결 신호, 주소와 경로는 서로 다른 실패 경계입니다.", "Right. Existence, admin/carrier, addresses, and routes are distinct failure boundaries."),
      incorrectFeedback: t("한 성공·실패 결과는 어느 층이 원인인지 충분히 말해 주지 않습니다.", "One success or failure does not identify which layer caused it."),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "CHECK WHAT EACH OUTPUT PROVES",
        title: t("이제 이름과 상태를 한 문장으로 섞지 마세요", "Keep names and states in separate sentences"),
        description: t("다섯 질문은 앞 실습에서 확인한 상태 변화를 다시 점검합니다.", "These five questions revisit the state changes from the previous lab."),
        correct: t("각 출력이 증명하는 범위를 정확히 읽었습니다", "You read each output's scope correctly"),
        incorrect: t("어떤 인터페이스의 어떤 상태인지 다시 분리하세요", "Separate the interface from its state again"),
        checkAnswers: t("답 확인하기", "Check answers"),
        completed: t("개념 확인 완료 — 필수 실습과 장애 복구 상태를 확인하세요.", "Concept check complete — now confirm the required lab and incident repairs."),
        retry: t("아직 섞인 상태가 있습니다. 앞 실습의 상태표와 명령 출력을 다시 비교하세요.", "Some states are still mixed together. Compare the previous lab's state table and command output again."),
        idle: t("다섯 답을 선택한 뒤 확인하세요.", "Choose five answers, then check them."),
      }}
    />
  );
}

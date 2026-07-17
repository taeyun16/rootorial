import { infrastructureNamespaceQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureNamespaceQuestions;

export function NetworkNamespacesConceptCheck({
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
      id: "namespace-network-view",
      index: "01",
      prompt: t(
        "network namespace를 새로 만들 때 host와 독립되는 network view의 핵심 묶음은 무엇일까요?",
        "Which core network view becomes independent from the host when a network namespace is created?",
      ),
      options: [
        { value: "kernel-and-memory", label: t("kernel image · physical memory", "kernel image · physical memory") },
        { value: "interfaces-routes-neighbors-sockets", label: t("interface · route · neighbor · socket", "interfaces · routes · neighbors · sockets") },
        { value: "filesystem-and-users", label: t("전체 filesystem · user database", "the entire filesystem · user database") },
      ],
      correctAnswer: infrastructureNamespaceQuestions["namespace-network-view"].correctAnswer,
      answerLabel: t("정답: interface·route·neighbor·socket view", "Answer: interfaces, routes, neighbors, and sockets"),
      correctFeedback: t(
        "맞았습니다. namespace는 kernel을 복제하지 않고 같은 kernel이 보여 주는 network objects의 집합을 분리합니다.",
        "Correct. A namespace does not copy the kernel; it separates the set of network objects exposed by that same kernel.",
      ),
      incorrectFeedback: t(
        "network namespace를 작은 VM과 동일시하지 마세요. kernel과 physical memory는 공유되고 network view가 격리됩니다.",
        "Do not equate a network namespace with a small VM. The kernel and physical memory remain shared while the network view is isolated.",
      ),
    },
    {
      id: "loopback-scope",
      index: "02",
      prompt: t(
        "host의 curl이 127.0.0.1:8080에 접속할 때 app namespace의 listener에 도달하지 못하는 이유는?",
        "Why can a host curl to 127.0.0.1:8080 not reach a listener in the app namespace?",
      ),
      options: [
        { value: "host-loopback-always", label: t("127.0.0.1은 항상 host의 listener를 전역 검색", "127.0.0.1 always searches host listeners globally") },
        { value: "all-namespaces-loopback", label: t("모든 namespace가 하나의 loopback을 공유", "all namespaces share one loopback") },
        { value: "current-namespace-loopback", label: t("127.0.0.1은 호출 프로세스의 현재 namespace loopback", "127.0.0.1 is loopback in the caller's current namespace") },
      ],
      correctAnswer: infrastructureNamespaceQuestions["loopback-scope"].correctAnswer,
      answerLabel: t("정답: 현재 namespace의 loopback", "Answer: loopback in the current namespace"),
      correctFeedback: t(
        "맞았습니다. 같은 숫자 주소라도 lookup 대상은 호출 프로세스가 속한 network namespace의 lo와 socket table입니다.",
        "Correct. Even with the same numeric address, lookup uses the lo device and socket table of the caller's network namespace.",
      ),
      incorrectFeedback: t(
        "주소 문자열보다 먼저 호출 프로세스의 namespace를 확인하세요. localhost는 host 전체의 전역 서비스 검색 주소가 아닙니다.",
        "Check the caller's namespace before the address string. Localhost is not a global service-discovery address for the host.",
      ),
    },
    {
      id: "socket-ownership",
      index: "03",
      prompt: t(
        "app process가 app namespace에 들어가기 전에 host에서 만든 listening socket은 어느 socket table에 남을까요?",
        "An app process created a listening socket on the host before entering the app namespace. Which socket table retains it?",
      ),
      options: [
        { value: "creation-network-namespace", label: t("socket을 만든 시점의 network namespace", "the network namespace active when the socket was created") },
        { value: "port-number-namespace", label: t("port 번호가 자동으로 고른 namespace", "a namespace automatically selected by the port number") },
        { value: "host-owns-all-sockets", label: t("항상 host socket table", "always the host socket table") },
      ],
      correctAnswer: infrastructureNamespaceQuestions["socket-ownership"].correctAnswer,
      answerLabel: t("정답: 생성 시점의 network namespace", "Answer: the network namespace at socket creation"),
      correctFeedback: t(
        "맞았습니다. process 이름이나 port가 socket을 나중에 이동시키지 않습니다. target namespace에서 listener를 다시 만들어야 합니다.",
        "Correct. Neither the process name nor the port moves a socket later. Recreate the listener inside the target namespace.",
      ),
      incorrectFeedback: t(
        "socket의 network namespace는 bind address나 port 이름으로 추론되지 않습니다. socket 생성 당시 thread의 network namespace가 소유 경계입니다.",
        "A socket's network namespace is not inferred from its bind address or port. The creating thread's network namespace establishes ownership.",
      ),
    },
    {
      id: "interface-ownership",
      index: "04",
      prompt: t(
        "eth-app interface를 host에서 app namespace로 이동하면 올바른 상태는?",
        "What is the correct state after moving interface eth-app from the host into the app namespace?",
      ),
      options: [
        { value: "copied-into-every-namespace", label: t("host와 app에 같은 interface가 복제", "the same interface is copied into both host and app") },
        { value: "one-network-namespace-at-a-time", label: t("한 번에 정확히 한 network namespace에만 존재", "it exists in exactly one network namespace at a time") },
        { value: "process-namespace-only", label: t("interface 소유권은 무관하고 process만 격리", "interface ownership is irrelevant because only processes are isolated") },
      ],
      correctAnswer: infrastructureNamespaceQuestions["interface-ownership"].correctAnswer,
      answerLabel: t("정답: 한 interface, 한 network namespace", "Answer: one interface, one network namespace"),
      correctFeedback: t(
        "맞았습니다. 이동은 복사가 아니며 host view에서 사라집니다. veth의 다른 끝은 별도 interface이므로 다음 장에서 서로 다른 namespace에 둘 수 있습니다.",
        "Correct. Moving is not copying; the interface disappears from the host view. A veth peer is a separate interface and can live in another namespace in the next chapter.",
      ),
      incorrectFeedback: t(
        "interface 객체와 veth peer를 구분하세요. 하나의 interface는 한 namespace에 속하고, 연결된 peer가 별도 namespace에 놓일 수 있습니다.",
        "Distinguish an interface object from its veth peer. One interface belongs to one namespace; a connected peer may live elsewhere.",
      ),
    },
    {
      id: "observation-scope",
      index: "05",
      prompt: t(
        "app namespace의 127.0.0.1:8080 listener를 증명하는 가장 직접적인 관찰은?",
        "Which observation most directly proves a 127.0.0.1:8080 listener inside the app namespace?",
      ),
      options: [
        { value: "host-ss-shows-everything", label: t("host에서 ss -lnt 한 번 실행", "run ss -lnt once on the host") },
        { value: "ping-proves-listener", label: t("host에서 127.0.0.1 ping 성공", "a successful host ping to 127.0.0.1") },
        { value: "execute-observer-in-target-namespace", label: "ip netns exec app ss -lnt" },
      ],
      correctAnswer: infrastructureNamespaceQuestions["observation-scope"].correctAnswer,
      answerLabel: t("정답: observer도 target namespace 안에서 실행", "Answer: execute the observer in the target namespace"),
      correctFeedback: t(
        "맞았습니다. 관측 도구 역시 하나의 process이므로 target network view 안에서 실행해야 그 listener를 볼 수 있습니다.",
        "Correct. An observation tool is also a process, so it must execute inside the target network view to see that listener.",
      ),
      incorrectFeedback: t(
        "관측 위치를 증거에 포함하세요. host의 ss와 ping은 app namespace socket table의 존재를 증명하지 않습니다.",
        "Include observation location in the evidence. Host ss and ping do not prove the app namespace's socket table.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "PROCESS → NETNS → NETWORK VIEW",
        title: t("같은 kernel 안의 서로 다른 network view를 구분하세요", "Distinguish network views inside one kernel"),
        description: t("다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock chapter completion."),
        correct: t("namespace 경계를 정확히 추적했습니다", "The namespace boundary is traced correctly"),
        incorrect: t("process·interface·socket의 소유 namespace를 다시 추적하세요", "Retrace the owning namespace of the process, interface, and socket"),
        checkAnswers: t("namespace 경계 판정 확인", "Check namespace-boundary decisions"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("localhost 또는 network object 소유권이 아직 섞여 있습니다.", "Localhost or network-object ownership is still mixed."),
        idle: t("다섯 답을 고른 뒤 network view 경계를 확인하세요.", "Choose all five answers, then check the network-view boundaries."),
      }}
    />
  );
}

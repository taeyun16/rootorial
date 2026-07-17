import { infrastructureNetworkObservabilityQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureNetworkObservabilityQuestions;

export function NetworkObservabilityCapacityConceptCheck({
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
      id: "observation-scope",
      index: "01",
      prompt: t(
        "host의 `ss -lnt`에 :8080이 없지만 app namespace에는 listener가 있을 수 있습니다. 어떤 관측이 그 존재를 판정할까요?",
        "Host `ss -lnt` has no :8080, but the app namespace may still contain the listener. Which observation can judge its presence?",
      ),
      options: [
        { value: "host-output-is-global", label: t("host 출력은 모든 namespace의 socket을 합칩니다", "Host output combines sockets from every namespace") },
        { value: "probe-in-owning-namespace", label: t("app namespace 안에서 `ss`를 실행합니다", "Run `ss` inside the app namespace") },
        { value: "tool-name-defines-scope", label: t("도구 이름이 같으면 실행 위치는 중요하지 않습니다", "The execution location does not matter when the tool name is the same") },
      ],
      correctAnswer: infrastructureNetworkObservabilityQuestions["observation-scope"].correctAnswer,
      answerLabel: t("정답: object를 소유한 namespace에서 probe 실행", "Answer: run the probe in the object's owning namespace"),
      correctFeedback: t("맞았습니다. 명령 output에는 실행한 network view가 암묵적으로 포함됩니다.", "Correct. Command output implicitly includes the network view from which it ran."),
      incorrectFeedback: t("도구보다 observation scope를 먼저 기록하세요. host socket table은 app socket table이 아닙니다.", "Record the observation scope before the tool. The host socket table is not the app socket table."),
    },
    {
      id: "counter-window",
      index: "02",
      prompt: t(
        "edge egress drop counter가 20,000입니다. 현재 1분 사건에서 drop이 발생했음을 입증하려면 무엇이 더 필요할까요?",
        "The edge-egress drop counter is 20,000. What else is required to prove drops occurred during the current one-minute incident?",
      ),
      options: [
        { value: "same-interface-window-delta", label: t("같은 interface의 window 시작·끝 값을 비교", "Compare start and end values for the same interface and window") },
        { value: "absolute-counter-alone", label: t("누적값 20,000만 기록", "Record only the accumulated value of 20,000") },
        { value: "reset-counter-before-incident", label: t("사건 도중 counter를 먼저 reset", "Reset the counter during the incident") },
      ],
      correctAnswer: infrastructureNetworkObservabilityQuestions["counter-window"].correctAnswer,
      answerLabel: t("정답: 동일 scope와 window의 delta", "Answer: a delta from the same scope and window"),
      correctFeedback: t("맞았습니다. 누적 counter의 크기가 아니라 사건 window의 증가량이 현재 drop을 입증합니다.", "Correct. The increase during the incident window, not the accumulated magnitude, establishes current drops."),
      incorrectFeedback: t("counter가 언제부터 누적됐는지 알 수 없다면 현재 사건과 연결할 수 없습니다.", "Without knowing when accumulation began, the counter cannot be tied to the current incident."),
    },
    {
      id: "capture-absence",
      index: "03",
      prompt: t(
        "edge egress에서 request-17 packet이 보이지 않았습니다. 이 빈 capture가 직접 입증하는 가장 좁은 주장은?",
        "No request-17 packet appeared at edge egress. What is the narrowest claim directly established by that empty capture?",
      ),
      options: [
        { value: "absence-proves-no-traffic-anywhere", label: t("전체 topology 어디에도 traffic이 없음", "No traffic exists anywhere in the topology") },
        { value: "capture-needs-no-flow-key", label: t("flow key나 시간 window 없이도 packet 부재가 확정", "Packet absence is certain without a flow key or time window") },
        { value: "absence-is-scope-and-window-bound", label: t("그 capture point·flow·window에서 관측되지 않음", "It was not observed at that capture point for that flow and window") },
      ],
      correctAnswer: infrastructureNetworkObservabilityQuestions["capture-absence"].correctAnswer,
      answerLabel: t("정답: 부재 증거도 scope와 window에 묶입니다", "Answer: negative evidence remains bound to scope and window"),
      correctFeedback: t("맞았습니다. 인접 capture와 비교해야 packet이 어느 경계 전에 멈췄는지 좁힐 수 있습니다.", "Correct. Compare an adjacent capture to narrow where the packet stopped."),
      incorrectFeedback: t("빈 capture를 global silence로 확대하지 마세요. interface, filter와 시간 범위를 함께 읽어야 합니다.", "Do not expand an empty capture into global silence. Read the interface, filter, and time range together."),
    },
    {
      id: "limiting-resource",
      index: "04",
      prompt: t(
        "bandwidth 128%, queue 40%, connections 62%라면 현재 load를 제한하는 resource는 무엇으로 판정할까요?",
        "If bandwidth is at 128%, queue at 40%, and connections at 62%, how should the limiting resource be selected?",
      ),
      options: [
        { value: "average-all-utilizations", label: t("세 utilization의 평균", "Average the three utilizations") },
        { value: "highest-ratio-crossing-limit", label: t("한도를 넘은 가장 높은 demand/capacity ratio", "The highest demand-to-capacity ratio that crosses its limit") },
        { value: "largest-capacity-value", label: t("절대 capacity 숫자가 가장 큰 resource", "The resource with the largest absolute capacity number") },
      ],
      correctAnswer: infrastructureNetworkObservabilityQuestions["limiting-resource"].correctAnswer,
      answerLabel: t("정답: resource별 동일 단위 ratio를 비교", "Answer: compare each resource through its own normalized ratio"),
      correctFeedback: t("맞았습니다. 단위가 다른 demand를 더하지 않고 각 한도에 대한 utilization으로 비교합니다.", "Correct. Compare utilization against each limit instead of adding demands with different units."),
      incorrectFeedback: t("Mbps, packet과 connection 수는 직접 평균낼 수 없습니다. 각 capacity에 대한 비율을 먼저 만드세요.", "Mbps, packets, and connection counts cannot be averaged directly. Normalize each by its capacity first."),
    },
    {
      id: "queue-role",
      index: "05",
      prompt: t(
        "지속 offered load가 drain capacity보다 큰 상태에서 queue만 확대하면 무엇이 바뀔까요?",
        "When sustained offered load exceeds drain capacity, what changes if only the queue is enlarged?",
      ),
      options: [
        { value: "queue-absorbs-bursts-not-sustained-overload", label: t("drop 시점을 늦추지만 throughput은 늘리지 않고 delay를 키울 수 있음", "It delays drops but does not add throughput and may increase delay") },
        { value: "queue-adds-link-bandwidth", label: t("link bandwidth가 queue 크기만큼 증가", "Link bandwidth increases with queue size") },
        { value: "queue-removes-connection-limit", label: t("application connection limit가 사라짐", "The application connection limit disappears") },
      ],
      correctAnswer: infrastructureNetworkObservabilityQuestions["queue-role"].correctAnswer,
      answerLabel: t("정답: queue는 burst buffer이지 지속 capacity가 아닙니다", "Answer: a queue is a burst buffer, not sustained capacity"),
      correctFeedback: t("맞았습니다. 지속 overload는 drain capacity나 offered load를 바꿔야 합니다.", "Correct. Sustained overload requires changing drain capacity or offered load."),
      incorrectFeedback: t("buffer와 service rate를 분리하세요. 더 큰 buffer는 service rate를 높이지 않습니다.", "Separate buffering from service rate. A larger buffer does not increase the service rate."),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "SCOPE → WINDOW → DELTA → CAPACITY",
        title: t("증거의 범위와 용량 한도를 판정하세요", "Judge evidence scope and capacity limits"),
        description: t("다섯 문제와 두 필수 활동을 모두 마쳐야 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock completion."),
        correct: t("증거와 용량 contract를 정확히 분리했습니다", "Evidence and capacity contracts are separated correctly"),
        incorrect: t("namespace·window·resource ratio를 다시 추적하세요", "Retrace the namespace, window, and resource ratios"),
        checkAnswers: t("관측·용량 판정 확인", "Check observability and capacity decisions"),
        completed: t("이해 확인 완료 — lab과 사건 완료 상태를 확인하세요.", "Concept check complete — now confirm the lab and incident states."),
        retry: t("증거 claim 하나가 scope를 벗어나거나 capacity 단위가 섞였습니다.", "One evidence claim exceeds its scope or capacity units remain mixed."),
        idle: t("다섯 답을 고른 뒤 증거 contract를 확인하세요.", "Choose all five answers, then check the evidence contract."),
      }}
    />
  );
}

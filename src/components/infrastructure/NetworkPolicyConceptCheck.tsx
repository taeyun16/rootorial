import { infrastructureNetworkPolicyQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureNetworkPolicyQuestions;

export function NetworkPolicyConceptCheck({
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
      id: "filter-hook-scope",
      index: "01",
      prompt: t(
        "client에서 app으로 지나가며 router 자체 주소가 목적지가 아닌 packet은 어느 filter hook을 통과할까요?",
        "Which filter hook sees a client-to-app packet whose destination is not the router itself?",
      ),
      options: [
        { value: "router-local-input-uses-forward", label: t("router-local packet처럼 INPUT", "INPUT, like router-local traffic") },
        { value: "transit-packet-uses-forward-hook", label: t("transit packet이므로 FORWARD", "FORWARD, because the packet is in transit") },
        { value: "all-ingress-uses-input", label: t("들어오는 모든 packet은 INPUT", "all arriving packets use INPUT") },
      ],
      correctAnswer: infrastructureNetworkPolicyQuestions["filter-hook-scope"].correctAnswer,
      answerLabel: t("정답: transit packet은 FORWARD hook", "Answer: transit packets use the FORWARD hook"),
      correctFeedback: t(
        "맞았습니다. route 결정 뒤 local stack이 소비하지 않는 packet은 FORWARD chain에서 정책을 적용받습니다.",
        "Correct. After routing, a packet not consumed by the local stack is filtered through the FORWARD chain.",
      ),
      incorrectFeedback: t(
        "interface에 들어왔다는 사실과 최종 목적지를 분리하세요. router 자체가 목적지일 때만 INPUT입니다.",
        "Separate arrival on an interface from the final destination. INPUT applies only when the router itself is the destination.",
      ),
    },
    {
      id: "default-deny-contract",
      index: "02",
      prompt: t(
        "default-deny 정책의 가장 작은 계약은 무엇일까요?",
        "What is the smallest useful contract for a default-deny policy?",
      ),
      options: [
        { value: "explicit-allow-else-drop", label: t("필요한 flow만 명시적으로 allow하고 나머지는 drop", "explicitly allow required flows and drop everything else") },
        { value: "accept-then-deny-known-ports", label: t("우선 모두 accept하고 알려진 port만 deny", "accept everything first, then deny known ports") },
        { value: "nat-implies-deny", label: t("NAT가 있으면 자동으로 deny", "NAT automatically implies deny") },
      ],
      correctAnswer: infrastructureNetworkPolicyQuestions["default-deny-contract"].correctAnswer,
      answerLabel: t("정답: 명시적 allow 외에는 drop", "Answer: drop everything outside explicit allows"),
      correctFeedback: t(
        "맞았습니다. 표본 deny rule 목록이 아니라 base policy까지 fail-closed여야 새로운 unmatched traffic도 닫힙니다.",
        "Correct. The base policy—not only a list of sampled deny rules—must fail closed for new unmatched traffic.",
      ),
      incorrectFeedback: t(
        "known bad traffic을 열거하는 방식은 새로운 port와 protocol을 놓칩니다. 필요한 flow를 기준으로 allow하세요.",
        "Enumerating known-bad traffic misses new ports and protocols. Build allows from required flows instead.",
      ),
    },
    {
      id: "terminal-verdict-order",
      index: "03",
      prompt: t(
        "specific allow보다 앞선 `counter drop`이 packet과 match하면 뒤의 allow는 어떻게 될까요?",
        "What happens when `counter drop` matches before a later specific allow?",
      ),
      options: [
        { value: "rule-order-only-affects-counters", label: t("counter 값만 달라지고 verdict는 같음", "only counters change; the verdict is unchanged") },
        { value: "last-rule-always-wins", label: t("항상 마지막 allow가 승리", "the last allow always wins") },
        { value: "first-matching-terminal-verdict-controls-chain", label: t("먼저 match한 terminal drop에서 chain 평가 종료", "the first matching terminal drop ends chain evaluation") },
      ],
      correctAnswer: infrastructureNetworkPolicyQuestions["terminal-verdict-order"].correctAnswer,
      answerLabel: t("정답: 먼저 match한 terminal verdict", "Answer: the first matching terminal verdict"),
      correctFeedback: t(
        "맞았습니다. counter 자체는 계속 진행할 수 있지만 drop verdict는 즉시 terminal이며 뒤의 allow를 보지 않습니다.",
        "Correct. A counter alone can continue, but a drop verdict is terminal and prevents the later allow from being evaluated.",
      ),
      incorrectFeedback: t(
        "non-terminal statement와 accept/drop verdict를 나누세요. 이 장의 single base-chain 모델에서는 terminal verdict 순서가 결과를 결정합니다.",
        "Separate non-terminal statements from accept/drop verdicts. In this chapter's single-base-chain model, terminal-verdict order decides the result.",
      ),
    },
    {
      id: "stateful-reply-rule",
      index: "04",
      prompt: t(
        "허용된 client → app 연결의 reply를 최소 권한으로 여는 규칙은?",
        "Which rule opens the reply of an allowed client-to-app connection with least privilege?",
      ),
      options: [
        { value: "reply-is-new-to-opposite-port", label: t("reply를 반대 방향의 새로운 연결로 취급", "treat the reply as a new reverse connection") },
        { value: "ct-established-allows-mapped-reply", label: "ct state established accept" },
        { value: "allow-all-ephemeral-ports", label: t("모든 ephemeral port를 무조건 allow", "unconditionally allow every ephemeral port") },
      ],
      correctAnswer: infrastructureNetworkPolicyQuestions["stateful-reply-rule"].correctAnswer,
      answerLabel: t("정답: conntrack의 established reply", "Answer: the conntrack-established reply"),
      correctFeedback: t(
        "맞았습니다. reply tuple은 기존 connection state에 연결되므로 넓은 reverse-port rule이 필요하지 않습니다.",
        "Correct. The reply tuple belongs to existing connection state, so it does not need a broad reverse-port rule.",
      ),
      incorrectFeedback: t(
        "service port와 reply의 ephemeral port 범위를 직접 대칭시키지 마세요. connection state가 의도한 flow의 reply인지 판정합니다.",
        "Do not mirror service ports with a broad ephemeral range. Connection state identifies whether the packet is the intended flow's reply.",
      ),
    },
    {
      id: "firewall-vs-reachability",
      index: "05",
      prompt: t(
        "return route가 없고 forwarding도 꺼진 topology에 `policy accept`를 적용하면 무엇이 수리될까요?",
        "What is repaired by applying `policy accept` to a topology with no return route and forwarding disabled?",
      ),
      options: [
        { value: "firewall-does-not-repair-route-or-nat", label: t("아무것도 수리되지 않음 — route·forwarding·NAT는 별도 invariant", "nothing—routes, forwarding, and NAT are separate invariants") },
        { value: "drop-policy-creates-return-route", label: t("drop policy가 return route 생성", "a drop policy creates the return route") },
        { value: "accept-policy-enables-forwarding", label: t("accept policy가 IP forwarding 활성화", "an accept policy enables IP forwarding") },
      ],
      correctAnswer: infrastructureNetworkPolicyQuestions["firewall-vs-reachability"].correctAnswer,
      answerLabel: t("정답: firewall은 reachability를 만들지 않습니다", "Answer: a firewall does not create reachability"),
      correctFeedback: t(
        "맞았습니다. 먼저 route·forwarding·NAT로 왕복 path를 검증하고 그 위에 allow/drop 정책을 적용해야 합니다.",
        "Correct. First verify the round-trip path through routes, forwarding, and NAT; then apply allow/drop policy on top.",
      ),
      incorrectFeedback: t(
        "connectivity와 authorization을 분리하세요. filter verdict는 kernel route와 forwarding state를 생성하지 않습니다.",
        "Separate connectivity from authorization. A filter verdict does not create kernel routes or forwarding state.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "HOOK → ORDER → STATE → LEAST ALLOW",
        title: t("연결 가능한 path 위의 policy contract를 판정하세요", "Judge the policy contract on top of a reachable path"),
        description: t("다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock chapter completion."),
        correct: t("hook·order·stateful reply를 정확히 분리했습니다", "Hook, order, and stateful reply are separated correctly"),
        incorrect: t("INPUT·FORWARD와 첫 terminal verdict를 다시 추적하세요", "Retrace INPUT, FORWARD, and the first terminal verdict"),
        checkAnswers: t("정책 판정 확인", "Check policy decisions"),
        completed: t("이해 확인 완료 — 두 policy mode와 사건 완료 상태를 확인하세요.", "Concept check complete — now confirm both policy modes and the incidents."),
        retry: t("최소 허용 contract 중 하나가 아직 넓거나 잘못된 hook에 있습니다.", "One least-allow contract is still overbroad or attached to the wrong hook."),
        idle: t("다섯 답을 고른 뒤 policy 경계를 확인하세요.", "Choose all five answers, then check the policy boundaries."),
      }}
    />
  );
}

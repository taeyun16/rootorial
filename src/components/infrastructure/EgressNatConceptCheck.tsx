import { infrastructureEgressNatQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import { ConceptCheckRenderer, type ConceptQuestionSpec } from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureEgressNatQuestions;

export function EgressNatConceptCheck({ onMasteryChange }: { onMasteryChange: (mastered: boolean) => void }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const { recordAnswers } = useLearningAnalytics();
  const specs: Array<{
    id: QuestionId;
    prompt: [string, string];
    options: Array<[string, string, string]>;
    answer: [string, string];
  }> = [
    {
      id: "nat-after-routing",
      prompt: ["source NAT가 실행되기 전에 무엇이 egress interface를 결정할까요?", "What selects the egress interface before source NAT runs?"],
      options: [["nat-creates-route", "NAT가 missing route를 생성", "NAT creates a missing route"], ["source-nat-runs-on-selected-egress", "route lookup이 먼저 egress를 선택", "route lookup first selects the egress"], ["conntrack-skips-routing", "conntrack이 route lookup을 생략", "conntrack skips route lookup"]],
      answer: ["정답: route가 먼저 egress를 선택합니다", "Answer: routing selects the egress first"],
    },
    {
      id: "snat-vs-masquerade",
      prompt: ["고정 public address와 동적 interface lease에 알맞은 target 조합은?", "Which targets fit a fixed public address and a dynamic interface lease?"],
      options: [["static-snat-dynamic-masquerade", "고정 주소는 SNAT, 동적 주소는 MASQUERADE", "SNAT for fixed addresses; masquerade for dynamic ones"], ["snat-always-follows-interface", "SNAT도 항상 현재 interface 주소를 자동 추적", "SNAT always follows the current interface address"], ["both-ignore-address-lifetime", "둘 다 address lifetime과 무관", "Both ignore address lifetime"]],
      answer: ["정답: static SNAT와 dynamic MASQUERADE", "Answer: static SNAT and dynamic masquerade"],
    },
    {
      id: "conntrack-reply-tuple",
      prompt: ["external reply가 private client tuple로 복원되는 근거는?", "What lets an external reply restore the private-client tuple?"],
      options: [["remote-knows-private-address", "remote service가 private address를 기억", "the remote service remembers the private address"], ["tcp-creates-private-route", "TCP가 private route를 생성", "TCP creates a private route"], ["reply-maps-to-original-private-flow", "reply tuple이 conntrack의 original flow에 매핑", "the reply tuple maps to conntrack's original flow"]],
      answer: ["정답: reply tuple과 original flow의 conntrack binding", "Answer: the conntrack binding between reply tuple and original flow"],
    },
    {
      id: "nat-not-routing",
      prompt: ["NAT rule이 있어도 packet이 upstream에 도달하지 못할 수 있는 이유는?", "Why can a packet still miss the upstream despite a NAT rule?"],
      options: [["nat-enables-forwarding", "NAT가 forwarding도 자동 활성화", "NAT automatically enables forwarding"], ["routing-and-forwarding-remain-required", "route와 IP forwarding은 별도 contract", "routes and IP forwarding remain separate contracts"], ["translation-opens-listener", "translation이 remote listener를 열어 줌", "translation opens the remote listener"]],
      answer: ["정답: routing과 forwarding은 여전히 필요합니다", "Answer: routing and forwarding are still required"],
    },
    {
      id: "stateful-return-path",
      prompt: ["stateful NAT reply path의 핵심 요구사항은?", "What is the key requirement for a stateful NAT reply path?"],
      options: [["reply-must-cross-original-stateful-router", "reply가 original stateful router를 통과", "the reply crosses the original stateful router"], ["any-router-can-reverse", "아무 router나 reverse translation 가능", "any router can reverse-translate"], ["client-route-restores-state", "client route가 conntrack state를 복원", "the client route restores conntrack state"]],
      answer: ["정답: 같은 stateful router를 통과해야 합니다", "Answer: the reply must cross the same stateful router"],
    },
  ];

  const questions: Array<ConceptQuestionSpec<QuestionId>> = specs.map((spec, index) => ({
    id: spec.id,
    index: String(index + 1).padStart(2, "0"),
    prompt: t(...spec.prompt),
    options: spec.options.map(([value, ko, en]) => ({ value, label: t(ko, en) })),
    correctAnswer: infrastructureEgressNatQuestions[spec.id].correctAnswer,
    answerLabel: t(...spec.answer),
    correctFeedback: t("맞았습니다. route·translation·stateful return을 서로 다른 경계로 추적했습니다.", "Correct. You kept routing, translation, and stateful return as distinct boundaries."),
    incorrectFeedback: t("packet의 original·translated·reply·restored tuple을 순서대로 다시 추적하세요.", "Retrace the packet's original, translated, reply, and restored tuples in order."),
  }));

  return <ConceptCheckRenderer questions={questions} onMasteryChange={onMasteryChange} onSubmitAttempt={recordAnswers} copy={{
    kicker: "ROUTE → TRANSLATE → TRACK → RESTORE",
    title: t("egress translation contract를 판정하세요", "Judge the egress translation contract"),
    description: t("두 NAT mode, 네 사건과 다섯 개념을 모두 완료해야 챕터 완료 조건이 열립니다.", "Complete both NAT modes, four incidents, and all five concepts to unlock completion."),
    correct: t("NAT와 conntrack 경계를 정확히 분리했습니다", "The NAT and conntrack boundaries are separated correctly"),
    incorrect: t("route·address lifetime·reply state를 다시 확인하세요", "Recheck routing, address lifetime, and reply state"),
    checkAnswers: t("egress 판단 확인", "Check egress decisions"),
    completed: t("이해 확인 완료 — 두 필수 활동의 상태를 확인하세요.", "Concept check complete — verify the two required activities."),
    retry: t("하나 이상의 translation invariant가 아직 섞여 있습니다.", "One or more translation invariants are still mixed."),
    idle: t("다섯 답을 고른 뒤 tuple lifecycle을 확인하세요.", "Choose all five answers, then check the tuple lifecycle."),
  }} />;
}

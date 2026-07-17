import { infrastructureNamespacePlatformQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import { ConceptCheckRenderer, type ConceptQuestionSpec } from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureNamespacePlatformQuestions;

export function NamespacePlatformConceptCheck({
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
      id: "evidence-reexecution",
      index: "01",
      prompt: t("Ch3 receipt에 `passed`가 저장돼 있습니다. 현재 capstone에서 가장 강한 검증은 무엇일까요?", "A Chapter 3 receipt stores `passed`. What is the strongest validation in the current capstone?"),
      options: [
        { value: "trust-stored-verdict", label: t("저장된 verdict를 그대로 신뢰", "Trust the stored verdict") },
        { value: "rerun-current-evaluators", label: t("현재 canonical evaluator를 재실행하고 fingerprint 비교", "Re-run the current canonical evaluator and compare the fingerprint") },
        { value: "accept-any-newer-timestamp", label: t("timestamp가 새로우면 통과", "Pass any newer timestamp") },
      ],
      correctAnswer: infrastructureNamespacePlatformQuestions["evidence-reexecution"].correctAnswer,
      answerLabel: t("정답: 현재 evaluator 재실행", "Answer: re-run the current evaluator"),
      correctFeedback: t("맞았습니다. receipt는 결과를 대체하지 않고 재실행 가능한 contract를 가리킵니다.", "Correct. A receipt points to a reproducible contract; it does not replace execution."),
      incorrectFeedback: t("stale·tampered 결과를 구분하려면 현재 adapter revision과 evaluator 결과가 필요합니다.", "Current adapter revisions and evaluator results are required to distinguish stale and tampered evidence."),
    },
    {
      id: "public-ingress-boundary",
      index: "02",
      prompt: t("요구사항이 'public ingress는 edge:443만'이라면 어떤 listener 집합이 최소 허용일까요?", "If the requirement says 'public ingress only at edge:443,' which listener set is least-allow?"),
      options: [
        { value: "edge-443-only", label: "edge public tcp/443 only" },
        { value: "edge-and-app-443", label: "edge + app public tcp/443" },
        { value: "app-443-only", label: "app public tcp/443 only" },
      ],
      correctAnswer: infrastructureNamespacePlatformQuestions["public-ingress-boundary"].correctAnswer,
      answerLabel: t("정답: edge tcp/443 하나", "Answer: edge TCP 443 only"),
      correctFeedback: t("맞았습니다. app:8080과 data:5432는 private service path에 남습니다.", "Correct. App 8080 and data 5432 remain on private service paths."),
      incorrectFeedback: t("route 가능성과 public exposure를 분리하세요. 내부에서 reachable해도 public listener일 필요는 없습니다.", "Separate reachability from public exposure. Internal reachability does not require a public listener."),
    },
    {
      id: "private-egress-state",
      index: "03",
      prompt: t("private app이 외부 update service에 요청하고 reply를 받아야 합니다. 어떤 경로가 전체 contract를 충족할까요?", "A private app must call an external update service and receive the reply. Which path satisfies the full contract?"),
      options: [
        { value: "assign-app-public-address", label: t("app에 public 주소 직접 할당", "Assign a public address directly to app") },
        { value: "edge-snat-without-state", label: t("edge에서 source만 바꾸고 state는 저장하지 않음", "Rewrite only the source at edge without retaining state") },
        { value: "edge-nat-conntrack-return", label: t("edge NAT와 conntrack reverse translation 사용", "Use edge NAT and conntrack reverse translation") },
      ],
      correctAnswer: infrastructureNamespacePlatformQuestions["private-egress-state"].correctAnswer,
      answerLabel: t("정답: edge NAT + conntrack", "Answer: edge NAT plus conntrack"),
      correctFeedback: t("맞았습니다. app private boundary와 stateful reply path를 동시에 보존합니다.", "Correct. This preserves both the private app boundary and the stateful reply path."),
      incorrectFeedback: t("forward translation만으로 reply tuple이 private app으로 돌아오지 않습니다.", "Forward translation alone does not restore the reply tuple to the private app."),
    },
    {
      id: "zone-failure-survival",
      index: "04",
      prompt: t("zone A가 사라져도 service path가 살아 있으려면 어떤 배치가 필요한가요?", "Which placement is required for the service path to survive loss of Zone A?"),
      options: [
        { value: "more-zone-a-replicas", label: t("zone A에 replica 수만 증가", "Only add replicas in Zone A") },
        { value: "independent-zone-b-path", label: t("edge·app·data의 독립 zone B path 확보", "Provide an independent Zone B path for edge, app, and data") },
        { value: "larger-zone-a-edge", label: t("zone A edge 크기만 확대", "Only enlarge the Zone A edge") },
      ],
      correctAnswer: infrastructureNamespacePlatformQuestions["zone-failure-survival"].correctAnswer,
      answerLabel: t("정답: zone B의 완전한 독립 path", "Answer: a complete independent path in Zone B"),
      correctFeedback: t("맞았습니다. replica count가 아니라 request path 전체의 failure-domain 독립성이 중요합니다.", "Correct. Failure-domain independence across the whole request path matters more than replica count."),
      incorrectFeedback: t("같은 zone의 replica는 zone 장애와 상관됩니다.", "Replicas in the same zone remain correlated with a zone failure."),
    },
    {
      id: "capacity-headroom-contract",
      index: "05",
      prompt: t("900 rps에서 bandwidth 54%, queue 62.5%, connections 60%입니다. 30% headroom contract의 판정은?", "At 900 rps, bandwidth is 54%, queue 62.5%, and connections 60%. What is the 30% headroom verdict?"),
      options: [
        { value: "all-resource-ratios-at-most-0-7", label: t("모든 resource가 70% 이하이므로 통과", "Pass because every resource is at or below 70%") },
        { value: "average-ratio-only", label: t("세 비율 평균만 70% 이하면 통과", "Pass if only the average of the three ratios is below 70%") },
        { value: "highest-capacity-number", label: t("절대 capacity가 가장 큰 항목만 확인", "Check only the largest absolute capacity") },
      ],
      correctAnswer: infrastructureNamespacePlatformQuestions["capacity-headroom-contract"].correctAnswer,
      answerLabel: t("정답: 각 resource ratio ≤ 0.70", "Answer: every resource ratio is at most 0.70"),
      correctFeedback: t("맞았습니다. 한 resource라도 70%를 넘으면 aggregate 평균과 무관하게 contract를 위반합니다.", "Correct. Any resource above 70% violates the contract regardless of the aggregate average."),
      incorrectFeedback: t("단위가 다른 resource는 각자 demand/capacity ratio로 검증합니다.", "Resources with different units are each checked through their own demand-to-capacity ratio."),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "EVIDENCE → BOUNDARY → PATH → FAILURE → HEADROOM",
        title: t("platform architecture contract를 최종 판정하세요", "Make the final platform architecture judgments"),
        description: t("다섯 문제와 evidence·scenario·incident 활동을 모두 마쳐야 완료할 수 있습니다.", "Complete all five questions plus the evidence, scenario, and incident activities."),
        correct: t("architecture 경계와 proof contract를 정확히 연결했습니다", "Architecture boundaries and proof contracts are connected correctly"),
        incorrect: t("최초로 위반된 boundary와 그것을 입증하는 evidence를 다시 추적하세요", "Retrace the first violated boundary and the evidence that proves it"),
        checkAnswers: t("platform 설계 판정 확인", "Check platform design decisions"),
        completed: t("개념 확인 완료 — studio와 incident 완료 상태를 확인하세요.", "Concept check complete — confirm the studio and incident states."),
        retry: t("한 설계 결정이 요구사항보다 넓거나 evidence 범위를 벗어났습니다.", "One design decision is broader than the requirement or exceeds its evidence scope."),
        idle: t("다섯 답을 고른 뒤 platform contract를 확인하세요.", "Choose all five answers, then check the platform contract."),
      }}
    />
  );
}

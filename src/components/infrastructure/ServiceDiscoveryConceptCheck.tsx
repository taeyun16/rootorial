import { infrastructureServiceDiscoveryQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof infrastructureServiceDiscoveryQuestions;

export function ServiceDiscoveryConceptCheck({
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
      id: "dns-ttl-lifecycle",
      index: "01",
      prompt: t(
        "authority가 새 VIP를 게시했지만 resolver cache의 TTL이 아직 남아 있습니다. 올바른 동작은?",
        "The authority published a new VIP, but the resolver cache still has TTL remaining. What is correct?",
      ),
      options: [
        { value: "refresh-on-authority-change", label: t("authority 변경을 감지해 즉시 refresh", "refresh immediately when authority changes") },
        { value: "cache-until-expiry-then-refresh", label: t("만료 전에는 cache, 만료 경계부터 authority", "use cache before expiry and authority at the expiry boundary") },
        { value: "cache-forever", label: t("한 번 받은 answer를 계속 사용", "keep the first answer forever") },
      ],
      correctAnswer: infrastructureServiceDiscoveryQuestions["dns-ttl-lifecycle"].correctAnswer,
      answerLabel: t("정답: TTL 만료 경계가 cache 수명을 결정합니다", "Answer: the TTL expiry boundary controls cache lifetime"),
      correctFeedback: t("맞았습니다. authority 변경과 resolver cache 만료는 서로 다른 사건입니다.", "Correct. Authority change and resolver-cache expiry are separate events."),
      incorrectFeedback: t("authority state와 resolver가 현재 사용할 수 있는 cached answer를 분리하세요.", "Separate authority state from the cached answer the resolver may still use."),
    },
    {
      id: "dns-health-boundary",
      index: "02",
      prompt: t("`api.internal`이 주소를 반환했습니다. 이 증거만으로 알 수 없는 것은?", "`api.internal` returned an address. What does that evidence not establish?"),
      options: [
        { value: "dns-answer-is-address-not-readiness", label: t("backend가 request를 받을 준비가 됐는지", "whether a backend is ready to receive requests") },
        { value: "dns-ttl-is-health-probe", label: t("query한 이름과 answer 주소", "the queried name and answer address") },
        { value: "dns-removes-failed-process", label: t("record의 남은 TTL", "the record's remaining TTL") },
      ],
      correctAnswer: infrastructureServiceDiscoveryQuestions["dns-health-boundary"].correctAnswer,
      answerLabel: t("정답: DNS answer는 readiness 증거가 아닙니다", "Answer: a DNS answer is not readiness evidence"),
      correctFeedback: t("맞았습니다. 이름 해석 성공 뒤에도 VIP listener와 backend health를 따로 검증해야 합니다.", "Correct. After successful name resolution, verify the VIP listener and backend health separately."),
      incorrectFeedback: t("address discovery와 service health를 서로 다른 control-plane state로 보세요.", "Treat address discovery and service health as separate control-plane states."),
    },
    {
      id: "health-eligibility",
      index: "03",
      prompt: t("registered이지만 probe가 실패한 app-b에 신규 connection을 보내야 할까요?", "Should a new connection be sent to app-b when it is registered but its probe is failing?"),
      options: [
        { value: "all-registered-backends", label: t("registered이면 항상 후보", "registration always makes it eligible") },
        { value: "affinity-overrides-health", label: t("affinity가 있으면 health보다 우선", "affinity overrides health") },
        { value: "new-connections-use-healthy-nondraining-backends", label: t("healthy하고 draining이 아닌 후보만 사용", "use only healthy, non-draining candidates") },
      ],
      correctAnswer: infrastructureServiceDiscoveryQuestions["health-eligibility"].correctAnswer,
      answerLabel: t("정답: registration과 eligibility는 다릅니다", "Answer: registration and eligibility differ"),
      correctFeedback: t("맞았습니다. pool에 존재하는 것과 새 flow를 받을 수 있는 것은 별도 상태입니다.", "Correct. Presence in the pool and eligibility for new flows are separate states."),
      incorrectFeedback: t("health와 draining state가 신규 connection candidate set을 좁힌다는 점을 확인하세요.", "Remember that health and draining state narrow the candidate set for new connections."),
    },
    {
      id: "l4-selection-unit",
      index: "04",
      prompt: t("이 챕터의 L4 load balancer가 backend를 선택하는 단위는?", "At what unit does this chapter's Layer 4 load balancer select a backend?"),
      options: [
        { value: "l4-balancer-selects-connection-flows", label: t("transport connection flow", "a transport connection flow") },
        { value: "l4-balancer-selects-every-http-request", label: t("모든 HTTP request", "every HTTP request") },
        { value: "dns-selects-every-packet", label: t("각 packet마다 DNS가 선택", "DNS selects each packet") },
      ],
      correctAnswer: infrastructureServiceDiscoveryQuestions["l4-selection-unit"].correctAnswer,
      answerLabel: t("정답: L4 선택 단위는 connection flow입니다", "Answer: Layer 4 selects a connection flow"),
      correctFeedback: t("맞았습니다. 하나의 keep-alive connection 안의 HTTP request를 각각 재선택한다고 가정하지 않습니다.", "Correct. Do not assume each HTTP request inside one keep-alive connection is reselected."),
      incorrectFeedback: t("application request와 transport connection 경계를 분리하세요.", "Separate application requests from the transport-connection boundary."),
    },
    {
      id: "affinity-failure",
      index: "05",
      prompt: t("sticky target이 unhealthy로 바뀌었습니다. 다음 신규 connection은?", "A sticky target became unhealthy. What should happen to the next new connection?"),
      options: [
        { value: "keep-target-until-ttl", label: t("DNS TTL까지 unhealthy target 유지", "keep the unhealthy target until DNS TTL expires") },
        { value: "remap-when-sticky-target-ineligible", label: t("현재 healthy set에서 다시 매핑", "remap against the current healthy set") },
        { value: "send-to-all-backends", label: t("모든 backend로 복제", "duplicate it to every backend") },
      ],
      correctAnswer: infrastructureServiceDiscoveryQuestions["affinity-failure"].correctAnswer,
      answerLabel: t("정답: affinity는 health eligibility를 넘지 않습니다", "Answer: affinity does not override health eligibility"),
      correctFeedback: t("맞았습니다. affinity는 eligible target 안에서만 연속성을 제공합니다.", "Correct. Affinity provides continuity only while its target remains eligible."),
      incorrectFeedback: t("sticky mapping을 현재 healthy candidate set에 다시 적용해야 합니다.", "Reapply the sticky mapping to the current healthy candidate set."),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "NAME → VIP → HEALTHY SET → CONNECTION",
        title: t("service path의 control-plane 경계를 판정하세요", "Judge the service path's control-plane boundaries"),
        description: t("다섯 문제와 두 필수 mode를 모두 완료해야 챕터 완료 조건이 열립니다.", "Finish all five questions and both required modes to unlock chapter completion."),
        correct: t("DNS·health·affinity 경계를 정확히 분리했습니다", "DNS, health, and affinity boundaries are separated correctly"),
        incorrect: t("cache 수명과 backend eligibility를 다시 추적하세요", "Retrace cache lifetime and backend eligibility"),
        checkAnswers: t("service path 판정 확인", "Check service path decisions"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("name resolution과 connection selection 중 하나가 아직 섞여 있습니다.", "Name resolution and connection selection are still mixed somewhere."),
        idle: t("다섯 답을 고른 뒤 service path를 확인하세요.", "Choose all five answers, then check the service path."),
      }}
    />
  );
}

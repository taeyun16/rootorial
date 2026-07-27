import { attentionQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";

type QuestionId = keyof typeof attentionQuestions;

export function AttentionConceptCheck({
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
      id: "qk-roles",
      index: "01",
      prompt: t(
        "한 decoder query가 세 source row를 읽을 때 query, key, value의 역할을 올바르게 구분한 것은?",
        "When one decoder query reads three source rows, which statement correctly separates query, key, and value roles?",
      ),
      options: [
        {
          value: "values-rank-keys",
          label: t("value가 먼저 key의 순위를 정하고 query는 마지막에 더한다", "values rank keys first, then the query is added at the end"),
        },
        {
          value: "query-compares-keys",
          label: t("query는 필요한 정보를 표현해 key들과 비교하고, 같은 row의 value가 가중합 재료가 된다", "the query expresses the current need and compares with keys; values from the same rows become weighted-sum material"),
        },
        {
          value: "keys-average-queries",
          label: t("key들이 여러 query를 먼저 평균내고 그 평균이 context가 된다", "keys average all queries first, and that average becomes context"),
        },
      ],
      correctAnswer: attentionQuestions["qk-roles"].correctAnswer,
      answerLabel: t("정답: query는 key를 비교하고 value를 라우팅합니다", "Answer: the query compares keys and routes values"),
      correctFeedback: t(
        "맞았습니다. key는 source row가 현재 query와 얼마나 맞는지 점수화하고, value는 그 row가 context에 보낼 내용입니다. key와 value의 row 대응은 유지되어야 합니다.",
        "Right. A key scores how well its source row matches the current query, while the value is the content that row contributes to context. Key-value row identity must stay aligned.",
      ),
      incorrectFeedback: t(
        "점수를 만드는 q·k와 최종 context를 만드는 α·V를 분리하세요. value는 key 순위를 정하지 않고, query도 마지막에 단순히 더하지 않습니다.",
        "Separate q·k, which creates scores, from alpha·V, which creates context. Values do not rank keys, and the query is not simply added at the end.",
      ),
    },
    {
      id: "score-shape",
      index: "02",
      prompt: t(
        "Q의 shape가 [Nq,dₖ], K가 [Nk,dₖ]일 때 QKᵀ의 shape는?",
        "If Q has shape [Nq,d_k] and K has shape [Nk,d_k], what is the shape of QK transpose?",
      ),
      options: [
        { value: "scores-dk-dv", label: "[dₖ,dᵥ]" },
        { value: "scores-nk-dv", label: "[Nk,dᵥ]" },
        { value: "scores-nq-nk", label: "[Nq,Nk]" },
      ],
      correctAnswer: attentionQuestions["score-shape"].correctAnswer,
      answerLabel: t("정답: query 행 × key 열 = [Nq,Nk]", "Answer: query rows by key columns gives [Nq,Nk]"),
      correctFeedback: t(
        "맞았습니다. dₖ 축이 내적으로 사라지고 query 수와 key 수가 남습니다. 이 장의 필수 lab은 Nq=1이므로 한 key-axis score row를 봅니다.",
        "Right. The d_k axis contracts, leaving the number of queries and keys. The required lab uses Nq=1, so it shows one key-axis score row.",
      ),
      incorrectFeedback: t(
        "맞닿는 dₖ를 내적해 없앤 뒤 바깥 축을 읽으세요. value 폭 dᵥ는 아직 score 계산에 등장하지 않습니다.",
        "Contract the matching d_k dimensions, then read the outer axes. Value width d_v has not entered the score calculation yet.",
      ),
    },
    {
      id: "softmax-axis",
      index: "03",
      prompt: t(
        "여러 query가 여러 source key를 읽을 때 softmax를 적용할 축과 그 결과는?",
        "When multiple queries read multiple source keys, which axis receives softmax and what invariant results?",
      ),
      options: [
        {
          value: "keys-within-each-query",
          label: t("각 query 안에서 key 축으로 적용해 query별 weight 합을 1로 만든다", "apply it across keys within each query so every query's weights sum to one"),
        },
        {
          value: "queries-within-each-key",
          label: t("각 key 안에서 query 축으로 적용해 key가 query를 선택하게 한다", "apply it across queries within each key so each key selects a query"),
        },
        {
          value: "all-cells-globally",
          label: t("score 표 전체를 한 번에 정규화해 모든 셀 합만 1로 만든다", "normalize the entire score table at once so only the global cell sum is one"),
        },
      ],
      correctAnswer: attentionQuestions["softmax-axis"].correctAnswer,
      answerLabel: t("정답: query별 key-axis softmax", "Answer: key-axis softmax per query"),
      correctFeedback: t(
        "맞았습니다. 각 query는 자신의 source routing 분포를 가집니다. 안정적 softmax는 같은 row의 최댓값을 먼저 빼도 결과 분포를 바꾸지 않습니다.",
        "Right. Every query owns its own source-routing distribution. Stable softmax can subtract that row's maximum without changing the resulting distribution.",
      ),
      incorrectFeedback: t(
        "한 query가 어떤 source row들을 얼마나 읽는지 묻고 있습니다. 따라서 그 query의 key 점수끼리 경쟁해야 하며, 표 전체나 query 축으로 섞으면 안 됩니다.",
        "The question asks how much one query reads each source row. Its key scores must compete with one another; do not mix the entire table or normalize across queries.",
      ),
    },
    {
      id: "value-context",
      index: "04",
      prompt: t(
        "weights [Nq,Nk]와 values [Nk,dᵥ]에서 context를 만드는 올바른 계약은?",
        "Which contract correctly creates context from weights [Nq,Nk] and values [Nk,d_v]?",
      ),
      options: [
        {
          value: "weights-pick-one-value",
          label: t("weight로 key를 섞어 value 폭 dᵥ를 사용하지 않는다", "mix keys with the weights and never use value width d_v"),
        },
        {
          value: "weights-mix-values",
          label: t("같은 source row의 value들을 weight로 가중합해 [Nq,dᵥ]를 만든다", "take a weighted sum of values from matching source rows to produce [Nq,d_v]"),
        },
        {
          value: "keys-become-context",
          label: t("weight 벡터 [Nk] 자체가 최종 context이므로 V를 곱하지 않는다", "treat the weight vector [Nk] itself as final context and never multiply by V"),
        },
      ],
      correctAnswer: attentionQuestions["value-context"].correctAnswer,
      answerLabel: t("정답: αV는 value들의 soft mixture입니다", "Answer: alpha V is a soft mixture of values"),
      correctFeedback: t(
        "맞았습니다. 여러 양수 weight가 남으면 여러 value가 기여합니다. attention은 기본적으로 argmax hard retrieval이 아닙니다.",
        "Right. When several positive weights remain, several values contribute. Attention is not an argmax hard-retrieval operation by default.",
      ),
      incorrectFeedback: t(
        "key는 위치를 찾기 위한 비교 재료이고 context의 내용은 value에서 옵니다. α의 모든 항과 같은 row의 V를 곱해 더하세요.",
        "Keys are comparison material for locating information; context content comes from values. Multiply every alpha entry by the value from the same row and add them.",
      ),
    },
    {
      id: "attention-boundary",
      index: "05",
      prompt: t(
        "이 장과 다음 Self-Attention 장의 범위를 가장 정확히 나눈 설명은?",
        "Which statement most accurately separates this chapter from the next Self-Attention chapter?",
      ),
      options: [
        {
          value: "all-token-self-attention-now",
          label: t("이 장에서 이미 모든 token을 query로 쌓아 같은 sequence끼리 전부 비교한다", "this chapter already stacks every token as a query and compares the sequence with itself"),
        },
        {
          value: "multi-head-and-mask-now",
          label: t("이 장의 완료 조건에 scaling, causal mask와 multi-head 조립까지 포함한다", "this chapter's completion gate includes scaling, causal masking, and multi-head assembly"),
        },
        {
          value: "single-query-cross-attention-first",
          label: t("이 장은 decoder query 하나가 encoder K/V를 읽고, 모든-token query·learned projection·scaling·mask·multi-head는 다음으로 미룬다", "this chapter lets one decoder query read encoder K/V, deferring all-token queries, learned projections, scaling, masks, and multiple heads"),
        },
      ],
      correctAnswer: attentionQuestions["attention-boundary"].correctAnswer,
      answerLabel: t("정답: 단일-query cross-attention부터", "Answer: single-query cross-attention first"),
      correctFeedback: t(
        "맞았습니다. 이번 장은 Q/K/V 역할과 soft routing을 분리해 익힙니다. 다음 장에서 같은 sequence의 모든 query와 추가 계약을 조립합니다.",
        "Right. This chapter isolates Q/K/V roles and soft routing. The next chapter assembles every query from the same sequence plus the additional contracts.",
      ),
      incorrectFeedback: t(
        "현재 완료 조건은 decoder query 하나와 source memory만 사용합니다. scaling, causal mask, learned all-token projections와 multi-head를 실행했다면 다음 장의 범위를 앞당긴 것입니다.",
        "The current completion path uses one decoder query and source memory only. Executing scaling, causal masking, learned all-token projections, or multiple heads would pull the next chapter forward.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE ATTENTION CONTRACT",
        title: t("query·key·value의 경계를 끝까지 추적하세요", "Trace query, key, and value boundaries end to end"),
        description: t(
          "다섯 문제와 필수 Attention routing lab을 마치면 챕터 완료 조건이 열립니다.",
          "Finish all five questions and the required Attention routing lab to unlock the chapter gate.",
        ),
        correct: t("Attention 계약을 정확히 추적했습니다", "Attention contract traced correctly"),
        incorrect: t("score·softmax·value 경계를 다시 추적하세요", "Retrace score, softmax, and value boundaries"),
        checkAnswers: t("Attention 계약 확인하기", "Check the Attention contract"),
        completed: t("이해 확인 완료 — 필수 Attention routing lab의 완료 상태를 확인하세요.", "Concept check complete — now confirm the required Attention routing lab."),
        retry: t("Q/K/V 역할, shape 또는 장 경계가 아직 섞여 있습니다.", "Some Q/K/V roles, shapes, or chapter boundaries are still mixed."),
        idle: t("다섯 답을 고른 뒤 Attention 계약을 확인하세요.", "Choose all five answers, then check the Attention contract."),
      }}
    />
  );
}

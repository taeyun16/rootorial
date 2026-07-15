import { embeddingQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof embeddingQuestions;

export function EmbeddingsConceptCheck({
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
      id: "tokenizer-contract",
      index: "01",
      prompt: t(
        "문자열 kitten이 어떤 모델에서는 한 token이고 이 장의 subword tokenizer에서는 kit + ##ten인 이유는?",
        "Why can kitten be one token for one model but kit + ##ten for this chapter's subword tokenizer?",
      ),
      options: [
        { value: "tokens-depend-on-tokenizer", label: t("token 경계와 ID는 tokenizer vocab·규칙에 달려 있다", "Token boundaries and IDs depend on tokenizer vocabulary and rules") },
        { value: "one-word-one-token", label: t("모든 단어는 항상 token 하나다", "Every word is always exactly one token") },
        { value: "ids-measure-meaning", label: t("더 큰 ID가 더 긴 의미를 뜻한다", "A larger ID means a longer meaning") },
      ],
      correctAnswer: embeddingQuestions["tokenizer-contract"].correctAnswer,
      answerLabel: t("정답: tokenization은 모델 계약", "Answer: tokenization is a model contract"),
      correctFeedback: t(
        "맞았습니다. ID는 vocab row 주소이며 자연어의 보편적인 단어 번호가 아닙니다.",
        "Right. An ID is a vocabulary-row address, not a universal word number.",
      ),
      incorrectFeedback: t(
        "공백과 단어만 보지 말고 tokenizer가 가진 vocab과 분할 규칙을 확인하세요.",
        "Look beyond spaces and words: inspect the tokenizer's vocabulary and split rules.",
      ),
    },
    {
      id: "lookup-shape",
      index: "02",
      prompt: t(
        "token IDs shape [B,T]와 embedding table E[V,D]를 lookup하면 output shape는?",
        "What output shape results from looking up token IDs [B,T] in embedding table E[V,D]?",
      ),
      options: [
        { value: "ids-bt-to-vectors-btd", label: "[B,T] → [B,T,D]" },
        { value: "ids-bt-to-vocabulary-btv", label: "[B,T] → [B,T,V]" },
        { value: "ids-bt-to-one-vector-d", label: "[B,T] → [D]" },
      ],
      correctAnswer: embeddingQuestions["lookup-shape"].correctAnswer,
      answerLabel: t("정답: 각 위치에 D-vector 하나", "Answer: one D-vector at each position"),
      correctFeedback: t(
        "맞았습니다. one-hot [V]는 계산 설명이고, direct lookup은 각 ID가 고른 E row만 반환합니다.",
        "Right. One-hot [V] explains the computation; direct lookup returns only the E row chosen by each ID.",
      ),
      incorrectFeedback: t(
        "batch와 token 위치 축은 보존되고, 각 scalar ID가 길이 D의 row로 바뀝니다.",
        "Batch and token-position axes stay; every scalar ID becomes a length-D row.",
      ),
    },
    {
      id: "repeated-gradient",
      index: "03",
      prompt: t(
        "weight decay가 없는 한 batch에서 token 2가 두 번, token 5가 한 번 등장했다면 embedding data-gradient는?",
        "With no weight decay, token 2 appears twice and token 5 once in a batch. What happens to embedding data gradients?",
      ),
      options: [
        { value: "referenced-rows-sum-contributions", label: t("row 2에 두 기여가 더해지고 row 5에 한 기여가 생긴다", "Two contributions add into row 2; one reaches row 5") },
        { value: "all-rows-receive-gradient", label: t("vocab 모든 row가 같은 gradient를 받는다", "Every vocabulary row receives the same gradient") },
        { value: "duplicates-are-deduplicated", label: t("반복 token은 자동으로 한 번만 센다", "Repeated tokens are automatically deduplicated") },
      ],
      correctAnswer: embeddingQuestions["repeated-gradient"].correctAnswer,
      answerLabel: t("정답: 참조한 row에 occurrence별 기여 합산", "Answer: sum occurrence contributions into referenced rows"),
      correctFeedback: t(
        "맞았습니다. 서로 반대인 기여는 상쇄될 수 있지만 반복 자체가 사라지지는 않습니다.",
        "Right. Opposing contributions may cancel, but repetition itself is not discarded.",
      ),
      incorrectFeedback: t(
        "forward가 실제로 읽은 table row와 각 occurrence가 만든 gradient 경로를 따로 추적하세요.",
        "Trace the table rows actually read in forward and the gradient path from every occurrence.",
      ),
    },
    {
      id: "cosine-contract",
      index: "04",
      prompt: t(
        "candidate vector를 양의 상수 7배로 키웠을 때 cosine similarity에 대한 올바른 설명은?",
        "What correctly describes cosine similarity after multiplying a candidate vector by positive scalar seven?",
      ),
      options: [
        { value: "angle-not-id-or-magnitude", label: t("방향이 같아 cosine은 유지되며 zero vector에서는 정의되지 않는다", "Direction is unchanged, so cosine stays; it is undefined for a zero vector") },
        { value: "larger-id-more-similar", label: t("ID와 vector 크기가 커져 더 비슷해진다", "The larger ID and magnitude make it more similar") },
        { value: "zero-vector-cosine-zero", label: t("zero vector와의 cosine은 항상 0이다", "Cosine with a zero vector is always zero") },
      ],
      correctAnswer: embeddingQuestions["cosine-contract"].correctAnswer,
      answerLabel: t("정답: cosine은 정규화된 방향 비교", "Answer: cosine compares normalized directions"),
      correctFeedback: t(
        "맞았습니다. 높은 cosine은 이 table과 학습 목적 안의 관계이며 동의어·인과를 보장하지 않습니다.",
        "Right. High cosine is a relation inside this table and objective; it guarantees neither synonymy nor causality.",
      ),
      incorrectFeedback: t(
        "dot/(norm·norm)에서 양의 scale이 분자와 norm에 함께 들어가 상쇄됨을 계산하세요.",
        "Compute dot/(norm·norm): a positive scale enters both numerator and norm, then cancels.",
      ),
    },
    {
      id: "pooling-order",
      index: "05",
      prompt: t(
        "PAD를 mask한 plain mean pooling의 능력과 한계는?",
        "What can masked plain-mean pooling do, and what is its limitation?",
      ),
      options: [
        { value: "masked-mean-drops-pad-and-order", label: t("PAD 영향은 제거하지만 같은 token multiset의 순서는 잃는다", "It removes PAD influence but loses order for the same token multiset") },
        { value: "mean-preserves-order", label: t("평균만으로 모든 token 순서를 보존한다", "A mean alone preserves every token order") },
        { value: "pad-must-enter-denominator", label: t("PAD도 평균 분모에 반드시 포함해야 한다", "PAD must always enter the mean denominator") },
      ],
      correctAnswer: embeddingQuestions["pooling-order"].correctAnswer,
      answerLabel: t("정답: padding invariant, order blind", "Answer: padding invariant, order blind"),
      correctFeedback: t(
        "맞았습니다. lookup row 배열에는 순서가 남지만 교환법칙이 있는 평균에서 사라져 다음 장의 order-aware state가 필요합니다.",
        "Right. Lookup rows retain order, but a commutative mean erases it, motivating order-aware state in the next chapter.",
      ),
      incorrectFeedback: t(
        "[cat,runs,dog]과 [dog,runs,cat]의 row 배열과 합을 각각 비교하세요.",
        "Compare the row arrays and then the sums for [cat,runs,dog] and [dog,runs,cat].",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE EMBEDDING CONTRACT",
        title: t("token ID에서 순서를 잃는 pooling까지 연결하세요", "Connect token IDs through order-losing pooling"),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마쳐야 챕터 완료 조건이 열립니다.",
          "Finish all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t("임베딩 계약을 정확히 읽었습니다", "Embedding contract read correctly"),
        incorrect: t("token·row·geometry·pooling 경계를 다시 추적하세요", "Retrace token, row, geometry, and pooling boundaries"),
        checkAnswers: t("임베딩 계약 확인하기", "Check the embedding contract"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("tokenizer·lookup·gradient·cosine·pooling 중 일부가 아직 섞여 있습니다.", "Some boundaries among tokenizer, lookup, gradient, cosine, and pooling are still mixed."),
        idle: t("다섯 답을 고른 뒤 임베딩 계약을 확인하세요.", "Choose all five answers, then check the embedding contract."),
      }}
    />
  );
}

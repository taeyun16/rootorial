import type { Locale } from "./curriculum";

export const transformerLearningGuideSlugs = [
  "vectors",
  "optimization",
  "neural-networks",
  "training",
  "embeddings",
  "sequences",
  "attention",
  "self-attention",
  "transformer-block",
  "mini-transformer",
] as const;

export type TransformerLearningGuideSlug = typeof transformerLearningGuideSlugs[number];

type LocalizedText = Record<Locale, string>;

export type TransformerKeyTerm = {
  label: LocalizedText;
  english: string;
  definition: LocalizedText;
};

export type TransformerLearningGuide = {
  phaseIndex: number;
  transformerRole: LocalizedText;
  coreActions: Array<{ href: string; label: LocalizedText }>;
  optionalPath: LocalizedText;
  terms: TransformerKeyTerm[];
};

export const transformerLearningPhases = [
  { ko: "기초 계산", en: "Foundations" },
  { ko: "표현과 순서", en: "Representation" },
  { ko: "Attention", en: "Attention" },
  { ko: "조립과 생성", en: "Assembly" },
] as const;

const text = (ko: string, en: string): LocalizedText => ({ ko, en });
const term = (
  ko: string,
  english: string,
  definitionKo: string,
  definitionEn: string,
): TransformerKeyTerm => ({
  label: text(ko, english),
  english,
  definition: text(definitionKo, definitionEn),
});

export const transformerLearningGuides: Record<TransformerLearningGuideSlug, TransformerLearningGuide> = {
  vectors: {
    phaseIndex: 0,
    transformerRole: text(
      "여기서 익힌 shape와 내적은 뒤에서 token 행렬을 읽고 Q·K 관계 점수를 만드는 규칙으로 돌아옵니다.",
      "Shapes and dot products return later as the rules for reading token matrices and computing Q/K relationship scores.",
    ),
    coreActions: [
      { href: "#orientation", label: text("배열 구조 맞히기 3개", "Three Shape Detective missions") },
      { href: "#tensor-shape", label: text("배열 축 조립하기 3개", "Three Axis Builder operations") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text(
      "Python 코드 셀과 나머지 탐색기는 이해를 넓히는 선택 실험입니다.",
      "Python cells and the remaining explorers are optional experiments for deeper intuition.",
    ),
    terms: [
      term("벡터", "vector", "순서가 있는 숫자 묶음으로 하나의 상태나 방향을 표현합니다.", "An ordered group of numbers representing one state or direction."),
      term("차원", "dimension", "벡터를 구성하는 숫자의 개수입니다.", "The number of values that make up a vector."),
      term("배열 구조", "shape", "각 축에 몇 개의 항목이 있는지 적은 배열의 구조입니다.", "The structure of an array, written as the size of each axis."),
      term("축", "axis", "배열을 읽거나 합치거나 줄일 때 기준이 되는 방향입니다.", "A direction used to read, combine, or reduce an array."),
      term("내적", "dot product", "두 벡터의 대응 값을 곱해 더한 값으로 정렬 정도를 요약합니다.", "A sum of pairwise products that summarizes vector alignment."),
    ],
  },
  optimization: {
    phaseIndex: 0,
    transformerRole: text(
      "Transformer도 loss를 계산하고 같은 gradient update로 embedding, Attention, FFN 파라미터를 바꿉니다.",
      "A Transformer uses the same loss-and-gradient update to change embedding, Attention, and FFN parameters.",
    ),
    coreActions: [
      { href: "#descent", label: text("학습률을 조정해 손실 줄이기", "Learning-rate repair lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("잘못된 업데이트의 원인 찾기와 Python 재현은 필요할 때 펼쳐 보는 선택 실습입니다.", "Diagnosing broken updates and reproducing them in Python are optional exercises to open when needed."),
    terms: [
      term("잔차", "residual", "예측값에서 정답을 뺀 오차입니다.", "The error obtained by subtracting the target from a prediction."),
      term("평균제곱오차", "MSE", "잔차를 제곱해 평균낸 하나의 loss입니다.", "One loss value formed by averaging squared residuals."),
      term("기울기", "gradient", "각 파라미터를 움직일 때 loss가 가장 빨리 커지는 방향입니다.", "The direction in which loss rises fastest as parameters move."),
      term("학습률", "learning rate", "한 update에서 gradient를 얼마나 따라갈지 정하는 보폭입니다.", "The step size applied to the gradient in one update."),
      term("변화 기록", "trace", "업데이트가 진행되며 파라미터와 손실이 바뀌는 기록입니다.", "A record of how parameters and loss change across updates."),
    ],
  },
  "neural-networks": {
    phaseIndex: 0,
    transformerRole: text(
      "여기서 조립한 hidden feature와 두 번의 선형 변환, 그 사이를 되짚는 gradient 경로는 Transformer 블록의 FFN에서도 다시 나타납니다.",
      "Hidden features, stacked linear transforms, and the gradient path back through them return inside each Transformer block's FFN.",
    ),
    coreActions: [
      { href: "#xor-lab", label: text("XOR을 분류하는 신경망 조립하기", "XOR assembly lab") },
      { href: "#backprop-lab", label: text("은닉층까지 기울기 되짚기", "Hidden backprop lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("신경망의 잘못된 연결 찾기와 Python 재구성은 선택 실습입니다.", "Diagnosing broken network connections and rebuilding them in Python are optional exercises."),
    terms: [
      term("Logit", "logit", "확률로 바꾸기 전 모델이 만든 제한 없는 점수입니다.", "An unrestricted model score before conversion to a probability."),
      term("Sigmoid", "sigmoid", "하나의 logit을 0과 1 사이 확률로 누르는 함수입니다.", "A function that squashes one logit into a probability between zero and one."),
      term("이진 교차 엔트로피", "BCE", "이진 정답에 낮은 확률을 준 정도를 벌점으로 만드는 loss입니다.", "A loss that penalizes low probability assigned to the binary target."),
      term("Affine 변환", "affine transform", "입력에 가중치를 곱하고 bias를 더하는 계산입니다.", "A weighted input followed by an added bias."),
      term("은닉층 특징", "hidden feature", "다음 층이 더 쉽게 판단하도록 중간 층이 만든 표현입니다.", "An intermediate representation that makes the next decision easier."),
      term("연쇄법칙", "chain rule", "뒤 층에서 온 upstream gradient에 각 노드의 local derivative를 곱해 앞 층으로 보내는 규칙입니다.", "The rule that sends an upstream gradient backward by multiplying each node's local derivative."),
    ],
  },
  training: {
    phaseIndex: 0,
    transformerRole: text(
      "여러 token과 vocabulary 후보를 batch로 학습할 때도 여기의 stable Softmax, cross entropy, Adam 상태를 그대로 씁니다.",
      "Training over many tokens and vocabulary candidates reuses stable softmax, cross entropy, and Adam state from this chapter.",
    ),
    coreActions: [
      { href: "#batch-lab", label: text("작은 데이터 묶음으로 가중치 갱신하기", "Mini-batch update lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("훈련 규칙의 오류 찾기, NumPy로 재현하기, 일반화 비교는 선택 실습입니다.", "Diagnosing training-rule errors, NumPy reproductions, and generalization comparisons are optional."),
    terms: [
      term("Mini-batch", "mini-batch", "한 번의 update에서 함께 계산하는 작은 데이터 묶음입니다.", "A small group of examples processed together for one update."),
      term("Epoch", "epoch", "훈련 데이터 전체를 한 번 사용한 단위입니다.", "One complete pass over the training data."),
      term("Stable Softmax", "stable softmax", "가장 큰 logit을 먼저 빼 overflow 없이 확률을 만드는 방법입니다.", "Softmax after subtracting the largest logit to avoid overflow."),
      term("교차 엔트로피", "cross entropy", "정답 class에 준 확률을 loss로 바꾸는 규칙입니다.", "A rule that turns target-class probability into a loss."),
      term("Adam", "Adam", "gradient의 이동 평균을 기억해 파라미터별 보폭을 조정하는 optimizer입니다.", "An optimizer that keeps gradient moving averages to adapt each parameter's step."),
    ],
  },
  embeddings: {
    phaseIndex: 1,
    transformerRole: text(
      "이 장부터 문장이 실제 token ID와 벡터 행렬이 됩니다. 이 행렬 X가 다음 장부터 모든 sequence 계산의 입력입니다.",
      "Here a sentence becomes real token IDs and a vector matrix X, the input to every sequence computation that follows.",
    ),
    coreActions: [
      { href: "#lookup-lab", label: text("토큰 번호로 임베딩 행 가져오기", "Embedding lookup lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("임베딩 계산의 오류 찾기와 Python 검증은 선택 실습입니다.", "Diagnosing embedding errors and checking them in Python are optional exercises."),
    terms: [
      term("Token", "token", "모델이 한 단위로 읽도록 문자열을 나눈 조각입니다.", "A piece of text treated as one model input unit."),
      term("Token ID", "token ID", "Vocabulary 안에서 token을 가리키는 정수 번호입니다.", "An integer index that identifies a token in the vocabulary."),
      term("행 가져오기", "lookup", "토큰 번호로 임베딩 표의 한 행을 가져오는 연산입니다.", "Fetching one row of an embedding table by token ID."),
      term("Scatter-add", "scatter-add", "같은 token이 반복되면 해당 행의 gradient를 모아 더하는 연산입니다.", "Accumulating gradients into the same row when a token repeats."),
      term("Masked mean", "masked mean", "PAD 위치를 빼고 실제 token 벡터만 평균내는 pooling입니다.", "Pooling that averages real token vectors while excluding PAD positions."),
    ],
  },
  sequences: {
    phaseIndex: 1,
    transformerRole: text(
      "RNN의 긴 정보 경로를 직접 본 뒤, Attention이 모든 token을 짧은 경로로 읽어야 하는 이유를 준비합니다.",
      "After tracing the RNN's long information path, you are ready to see why Attention gives every token a shorter read path.",
    ),
    coreActions: [
      { href: "#memory-lab", label: text("입력 순서와 기억 비교하기", "Order-and-memory lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("시간별 기울기, LSTM의 기억 조절, 오류 찾기, Python 재현은 선택 심화입니다.", "Temporal gradients, LSTM gates, debugging, and Python are optional deep dives."),
    terms: [
      term("은닉 상태", "hidden state", "지금까지 읽은 입력을 고정 폭 벡터로 요약한 기억입니다.", "A fixed-width memory summarizing the prefix read so far."),
      term("Prefix", "prefix", "현재 위치까지 이미 나타난 token들의 앞부분입니다.", "The tokens that have appeared up to the current position."),
      term("Unroll", "unroll", "같은 recurrent 계산을 시간 순서대로 펼쳐 그린 것입니다.", "The same recurrent computation drawn out across time steps."),
      term("Recurrent path", "recurrent path", "과거 정보가 현재까지 state를 거쳐 이동하는 연속 경로입니다.", "The chain through which past information travels to the present state."),
      term("LSTM gate", "LSTM gate", "기억을 쓰고, 지우고, 읽는 양을 조절하는 값입니다.", "A value controlling how much memory is written, erased, or read."),
    ],
  },
  attention: {
    phaseIndex: 2,
    transformerRole: text(
      "Encoder–decoder cross-attention으로 Q·K·V 역할을 분리해 본 뒤, 다음 장에서 같은 sequence가 세 역할을 모두 만드는 Self-Attention으로 이동합니다.",
      "Cross-attention separates Q, K, and V roles; next, Self-Attention lets one sequence create all three roles.",
    ),
    coreActions: [
      { href: "#attention-lab", label: text("질문에 따라 가져올 정보 고르기", "Attention routing lab") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("정보 선택의 오류 찾기, 원인과 결과 비교, Python 재현은 선택 실습입니다.", "Diagnosing routing errors, comparing causes and effects, and reproducing results in Python are optional."),
    terms: [
      term("Query", "query", "지금 어떤 정보를 찾는지 나타내는 벡터입니다.", "A vector describing what information is being requested."),
      term("Key", "key", "각 source 항목이 무엇을 제공할 수 있는지 비교하는 벡터입니다.", "A vector used to compare what each source item can offer."),
      term("Value", "value", "선택된 정도만큼 실제로 가져와 섞을 내용 벡터입니다.", "The content vector actually retrieved and mixed by the learned weights."),
      term("Attention score", "attention score", "Query와 Key의 관련성을 나타내는 원시 점수입니다.", "A raw relevance score between a query and a key."),
      term("Context", "context", "Attention weight로 Value들을 가중합한 결과입니다.", "The weighted sum of values produced by attention weights."),
    ],
  },
  "self-attention": {
    phaseIndex: 2,
    transformerRole: text(
      "같은 token 행렬에서 Q·K·V를 만들고 causal mask와 multi-head를 적용합니다. 이것이 decoder block의 핵심 mixing 연산입니다.",
      "One token matrix creates Q, K, and V, then applies causal masking and multiple heads—the decoder block's core mixing operation.",
    ),
    coreActions: [
      { href: "#self-attention-lab", label: text("핵심 표시가 있는 실습 과제 3개", "Three exercises marked Core") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("선택 표시가 있는 과제 2개, 오류 찾기, NumPy 재현은 완료 조건에 포함되지 않습니다.", "The two exercises marked optional, debugging, and NumPy reproductions are outside the completion requirements."),
    terms: [
      term("Self-Attention", "self-attention", "같은 sequence가 Query, Key, Value의 출처가 되는 Attention입니다.", "Attention where the same sequence supplies queries, keys, and values."),
      term("Projection", "projection", "입력 X에 서로 다른 가중치를 곱해 Q·K·V를 만드는 변환입니다.", "A learned transform that maps X into distinct Q, K, and V matrices."),
      term("Scaling", "scaling", "내적을 √d_k로 나눠 Softmax가 너무 뾰족해지는 것을 막습니다.", "Dividing scores by the square root of d_k to prevent overly sharp softmax."),
      term("Causal mask", "causal mask", "현재 token이 미래 위치를 읽지 못하게 점수를 가리는 규칙입니다.", "A rule that blocks each token from reading future positions."),
      term("Head", "attention head", "서로 다른 투영 공간에서 관계를 읽는 병렬 Attention 한 갈래입니다.", "One parallel attention branch reading relationships in its own projected space."),
    ],
  },
  "transformer-block": {
    phaseIndex: 3,
    transformerRole: text(
      "Self-Attention을 position, LayerNorm, residual, FFN과 묶어 shape를 보존하는 decoder block 하나를 완성합니다.",
      "Position, LayerNorm, residual paths, and an FFN wrap Self-Attention into one shape-preserving decoder block.",
    ),
    coreActions: [
      { href: "#transformer-block-lab", label: text("핵심 표시가 있는 실습 과제 3개", "Three exercises marked Core") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("선택 표시가 있는 과제 2개, 오류 찾기, NumPy 계산 기록은 완료 조건에 포함되지 않습니다.", "The two exercises marked optional, debugging, and NumPy calculation records are outside the completion requirements."),
    terms: [
      term("Position signal", "position signal", "Token 순서를 embedding과 같은 폭의 값으로 더한 정보입니다.", "Order information added with the same width as token embeddings."),
      term("Pre-norm", "pre-norm", "각 sublayer를 실행하기 전에 입력을 LayerNorm하는 배치입니다.", "A layout that applies LayerNorm before each sublayer."),
      term("Residual path", "residual path", "Sublayer 출력에 원래 stream을 더해 정보와 gradient 경로를 보존합니다.", "A skip path that adds the original stream back to preserve information and gradients."),
      term("LayerNorm", "LayerNorm", "Token 한 행의 feature들을 평균 0에 가깝고 안정된 크기로 맞춥니다.", "Normalization across one token's features to stabilize scale."),
      term("Position-wise FFN", "position-wise FFN", "모든 token 행에 같은 두 층 MLP를 독립적으로 적용합니다.", "The same two-layer MLP applied independently to every token row."),
    ],
  },
  "mini-transformer": {
    phaseIndex: 3,
    transformerRole: text(
      "앞의 모든 부품을 tokenizer부터 next-token loss와 autoregressive decode까지 한 실행 경로로 닫습니다.",
      "Every previous component closes into one runnable path from tokenization to next-token loss and autoregressive decoding.",
    ),
    coreActions: [
      { href: "#mini-transformer-lab", label: text("핵심 표시가 있는 실습 과제 3개", "Three exercises marked Core") },
      { href: "#check", label: text("핵심 확인 5문제", "Five core questions") },
    ],
    optionalPath: text("선택 표시가 있는 과제 2개, 오류 찾기, Python 단계별 검증은 완료 조건에 포함되지 않습니다.", "The two exercises marked optional, debugging, and Python boundary checks are outside the completion requirements."),
    terms: [
      term("BOS / EOS", "BOS / EOS", "문장의 시작과 끝을 명시하는 특별 token입니다.", "Special tokens that mark the beginning and end of a sequence."),
      term("Shifted target", "shifted target", "각 입력 위치의 정답을 바로 다음 token으로 한 칸 옮긴 배열입니다.", "Targets shifted so each input position predicts the next token."),
      term("Teacher forcing", "teacher forcing", "훈련 중 실제 이전 token을 입력으로 주고 다음 token loss를 병렬 계산합니다.", "Training with the true previous tokens so next-token losses can be computed in parallel."),
      term("LM head", "language-model head", "Hidden state를 vocabulary 크기의 logits로 바꾸는 마지막 projection입니다.", "The final projection from hidden states to vocabulary-sized logits."),
      term("Autoregressive decode", "autoregressive decoding", "방금 생성한 token을 prefix에 붙여 다음 token을 반복 생성합니다.", "Repeatedly appending the generated token to the prefix to produce the next one."),
    ],
  },
};

// Current-chapter review links remain usable when another chapter is unpublished.
export const foundationPrerequisites: Partial<Record<TransformerLearningGuideSlug, {
  carry: LocalizedText;
  review: Array<{ href: string; label: LocalizedText }>;
}>> = {
  vectors: {
    carry: text("준비 개념: 숫자의 순서와 좌표. 같은 숫자라도 행·열·축이 바뀌면 계산 구조가 달라집니다.", "Start with ordered numbers and coordinates. Rows, columns, and axes determine how the same values combine."),
    review: [{ href: "#orientation", label: text("행·열과 shape부터 확인", "Review rows, columns, and shape") }],
  },
  optimization: {
    carry: text("벡터에서 가져올 것: 내적은 예측 점수 하나를 만들고, 좌표별 연산은 같은 shape의 파라미터를 갱신합니다. 이번 장에서는 그 이동을 loss로 판단합니다.", "Carry forward: a dot product produces one prediction; coordinate-wise operations update same-shaped parameters. Here, loss tells us whether that movement helped."),
    review: [{ href: "#predict", label: text("내적 → 예측 다시 보기", "Review dot product → prediction") }, { href: "#gradient", label: text("같은 shape → 업데이트 다시 보기", "Review same shape → update") }],
  },
  "neural-networks": {
    carry: text("최적화에서 가져올 것: 예측 → loss → gradient → 업데이트. 이번 장에서는 점수를 확률로 바꾸고 hidden 층까지 gradient를 전달합니다.", "Carry forward: prediction → loss → gradient → update. Here, scores become probabilities and gradients travel through a hidden layer."),
    review: [{ href: "#logit", label: text("내적 점수 → 확률 다시 보기", "Review dot-product score → probability") }, { href: "#backprop-lab", label: text("gradient → hidden 업데이트 확인", "Review gradient → hidden update") }],
  },
};

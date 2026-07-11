export type Chapter = {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  runtime: "NumPy" | "NumPy + WebGPU" | "WebGPU" | "Workers AI + NumPy";
  duration: string;
  status: "available" | "planned";
  concepts: string[];
};

export const chapters: Chapter[] = [
  {
    number: 1,
    slug: "vectors",
    title: "벡터와 텐서",
    subtitle: "숫자의 묶음이 어떻게 의미와 방향을 갖는가",
    description:
      "벡터 연산, 내적, 크기, 투영과 브로드캐스팅을 그림과 NumPy 코드로 연결합니다.",
    runtime: "NumPy",
    duration: "35분",
    status: "available",
    concepts: ["shape", "내적", "투영"],
  },
  {
    number: 2,
    slug: "optimization",
    title: "학습과 최적화",
    subtitle: "모델은 어떻게 정답에 가까워지는가",
    description:
      "손실함수, 미분과 경사하강법을 직접 움직이며 학습률의 의미를 확인합니다.",
    runtime: "NumPy",
    duration: "40분",
    status: "planned",
    concepts: ["loss", "gradient", "learning rate"],
  },
  {
    number: 3,
    slug: "neural-networks",
    title: "분류와 신경망",
    subtitle: "직선을 쌓아 복잡한 경계를 만드는 법",
    description:
      "로지스틱 회귀에서 시작해 활성함수와 다층 퍼셉트론으로 XOR 문제를 해결합니다.",
    runtime: "NumPy + WebGPU",
    duration: "45분",
    status: "planned",
    concepts: ["sigmoid", "BCE", "MLP"],
  },
  {
    number: 4,
    slug: "training",
    title: "딥러닝 학습 구조",
    subtitle: "작은 배치가 깊은 모델을 학습시키는 과정",
    description:
      "Mini-batch, Adam, Softmax, Cross Entropy, Dropout을 하나의 작은 분류기에 연결합니다.",
    runtime: "WebGPU",
    duration: "50분",
    status: "planned",
    concepts: ["mini-batch", "Adam", "Dropout"],
  },
  {
    number: 5,
    slug: "embeddings",
    title: "토큰과 임베딩",
    subtitle: "단어를 계산 가능한 공간에 놓기",
    description:
      "토큰화, one-hot, embedding lookup과 의미 유사도를 연결하고 실제 문장 임베딩을 비교합니다.",
    runtime: "Workers AI + NumPy",
    duration: "45분",
    status: "planned",
    concepts: ["token", "embedding", "cosine"],
  },
  {
    number: 6,
    slug: "sequences",
    title: "순서가 있는 데이터",
    subtitle: "RNN은 무엇을 기억하고 무엇을 잊는가",
    description:
      "Hidden state, 장기 의존성, 기울기 소실과 LSTM의 게이트를 시퀀스 위에서 관찰합니다.",
    runtime: "NumPy + WebGPU",
    duration: "50분",
    status: "planned",
    concepts: ["hidden state", "RNN", "LSTM"],
  },
  {
    number: 7,
    slug: "attention",
    title: "Attention",
    subtitle: "필요한 정보를 직접 찾아보는 방법",
    description:
      "Query, Key, Value의 유사도에서 문맥 벡터가 만들어지는 전 과정을 단계별로 계산합니다.",
    runtime: "NumPy",
    duration: "45분",
    status: "planned",
    concepts: ["Query", "Key", "Value"],
  },
  {
    number: 8,
    slug: "self-attention",
    title: "Self-Attention",
    subtitle: "문장 안의 단어들이 서로를 읽게 만들기",
    description:
      "Scaled dot-product, causal mask와 multi-head attention을 토큰별 heatmap으로 분해합니다.",
    runtime: "NumPy + WebGPU",
    duration: "55분",
    status: "planned",
    concepts: ["scaled dot-product", "mask", "multi-head"],
  },
  {
    number: 9,
    slug: "transformer-block",
    title: "Transformer 블록",
    subtitle: "Attention만으로는 충분하지 않다",
    description:
      "Positional encoding, residual, layer normalization과 FFN을 하나의 블록으로 조립합니다.",
    runtime: "WebGPU",
    duration: "55분",
    status: "planned",
    concepts: ["position", "residual", "FFN"],
  },
  {
    number: 10,
    slug: "mini-transformer",
    title: "Mini Transformer",
    subtitle: "배운 조각을 하나의 작동하는 모델로",
    description:
      "Tokenizer부터 logits까지 연결하고 작은 next-token 모델이 학습되는 과정을 관찰합니다.",
    runtime: "WebGPU",
    duration: "70분",
    status: "planned",
    concepts: ["tokenizer", "block", "logits"],
  },
];

export const availableChapterCount = chapters.filter(
  (chapter) => chapter.status === "available",
).length;

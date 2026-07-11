// The catalog is intentionally framework-agnostic so content can later be localized.
export type Chapter = {
  number: number;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  /** Short, user-facing label for the primary learning environment. */
  runtime: string;
  estimatedMinutes?: number;
  status: "available" | "planned";
  concepts: string[];
};

export type Locale = "ko" | "en";
export type LocalizedText = Record<Locale, string>;
export type CurriculumStatus = "available" | "in-progress" | "planned";

export type CurriculumChapter = Chapter & {
  /** Stable, globally unique identifier used by progress and social features. */
  id: string;
  curriculumSlug: string;
};

export type Curriculum = {
  id: string;
  slug: string;
  category: LocalizedText;
  title: LocalizedText;
  summary: LocalizedText;
  eyebrow: LocalizedText;
  level: "beginner" | "intermediate" | "advanced";
  status: CurriculumStatus;
  accent: "violet" | "green" | "blue" | "orange";
  chapters: Record<Locale, CurriculumChapter[]>;
};

export const TRANSFORMER_CURRICULUM_SLUG = "transformer-from-zero";

export function chapterId(curriculumSlug: string, chapterSlug: string) {
  return `${curriculumSlug}/${chapterSlug}`;
}

export const VECTOR_CHAPTER_ESTIMATED_MINUTES = 60;

export const chaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "vectors",
    title: "벡터와 텐서",
    subtitle: "숫자의 묶음이 어떻게 의미와 방향을 갖는가",
    description:
      "벡터 연산, 내적, 크기, 투영과 브로드캐스팅을 그림과 NumPy 코드로 연결합니다.",
    runtime: "NumPy",
    estimatedMinutes: VECTOR_CHAPTER_ESTIMATED_MINUTES,
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
    status: "planned",
    concepts: ["tokenizer", "block", "logits"],
  },
];

export const chaptersEn: Chapter[] = [
  {
    number: 1, slug: "vectors", title: "Vectors and Tensors",
    subtitle: "How collections of numbers gain meaning and direction",
    description: "Connect vector operations, dot products, magnitude, projection, and broadcasting through diagrams and NumPy code.",
    runtime: "NumPy", estimatedMinutes: VECTOR_CHAPTER_ESTIMATED_MINUTES, status: "available", concepts: ["shape", "dot product", "projection"],
  },
  {
    number: 2, slug: "optimization", title: "Learning and Optimization",
    subtitle: "How a model moves closer to the right answer",
    description: "Move through loss functions, derivatives, and gradient descent to understand what the learning rate controls.",
    runtime: "NumPy", status: "planned", concepts: ["loss", "gradient", "learning rate"],
  },
  {
    number: 3, slug: "neural-networks", title: "Classification and Neural Networks",
    subtitle: "Building complex boundaries from simple lines",
    description: "Start with logistic regression, then use activation functions and a multilayer perceptron to solve XOR.",
    runtime: "NumPy + WebGPU", status: "planned", concepts: ["sigmoid", "BCE", "MLP"],
  },
  {
    number: 4, slug: "training", title: "Deep Learning Training",
    subtitle: "How small batches train deep models",
    description: "Connect mini-batches, Adam, Softmax, cross entropy, and dropout in one small classifier.",
    runtime: "WebGPU", status: "planned", concepts: ["mini-batch", "Adam", "Dropout"],
  },
  {
    number: 5, slug: "embeddings", title: "Tokens and Embeddings",
    subtitle: "Placing words in a space we can compute with",
    description: "Connect tokenization, one-hot vectors, embedding lookup, and semantic similarity, then compare real sentence embeddings.",
    runtime: "Workers AI + NumPy", status: "planned", concepts: ["token", "embedding", "cosine"],
  },
  {
    number: 6, slug: "sequences", title: "Sequential Data",
    subtitle: "What an RNN remembers and forgets",
    description: "Observe hidden state, long-range dependencies, vanishing gradients, and LSTM gates across a sequence.",
    runtime: "NumPy + WebGPU", status: "planned", concepts: ["hidden state", "RNN", "LSTM"],
  },
  {
    number: 7, slug: "attention", title: "Attention",
    subtitle: "Finding the information that matters directly",
    description: "Calculate every step from Query-Key-Value similarity to the resulting context vectors.",
    runtime: "NumPy", status: "planned", concepts: ["Query", "Key", "Value"],
  },
  {
    number: 8, slug: "self-attention", title: "Self-Attention",
    subtitle: "Letting words in a sentence read one another",
    description: "Break scaled dot-product, causal masking, and multi-head attention into token-level heatmaps.",
    runtime: "NumPy + WebGPU", status: "planned", concepts: ["scaled dot-product", "mask", "multi-head"],
  },
  {
    number: 9, slug: "transformer-block", title: "The Transformer Block",
    subtitle: "Why attention alone is not enough",
    description: "Assemble positional encoding, residual connections, layer normalization, and an FFN into one block.",
    runtime: "WebGPU", status: "planned", concepts: ["position", "residual", "FFN"],
  },
  {
    number: 10, slug: "mini-transformer", title: "Mini Transformer",
    subtitle: "Combining the pieces into a working model",
    description: "Connect the tokenizer to logits and watch a small next-token model learn.",
    runtime: "WebGPU", status: "planned", concepts: ["tokenizer", "block", "logits"],
  },
];

export const chapters = chaptersKo;

export const availableChapterCount = chaptersKo.filter(
  (chapter) => chapter.status === "available",
).length;

function scopeChapters(curriculumSlug: string, source: Chapter[]): CurriculumChapter[] {
  return source.map((chapter) => ({
    ...chapter,
    id: chapterId(curriculumSlug, chapter.slug),
    curriculumSlug,
  }));
}

export const curricula: Curriculum[] = [
  {
    id: TRANSFORMER_CURRICULUM_SLUG,
    slug: TRANSFORMER_CURRICULUM_SLUG,
    category: { ko: "AI · 머신러닝", en: "AI · MACHINE LEARNING" },
    title: { ko: "Transformer를 바닥부터", en: "Transformers from the Ground Up" },
    summary: {
      ko: "벡터에서 시작해 Attention과 작은 Transformer까지 직접 움직이고 실행하며 연결합니다.",
      en: "Move and run every idea from vectors through attention to a small Transformer.",
    },
    eyebrow: { ko: "대표 커리큘럼", en: "FEATURED CURRICULUM" },
    level: "beginner",
    status: "in-progress",
    accent: "violet",
    chapters: {
      ko: scopeChapters(TRANSFORMER_CURRICULUM_SLUG, chaptersKo),
      en: scopeChapters(TRANSFORMER_CURRICULUM_SLUG, chaptersEn),
    },
  },
  {
    id: "linux-systems",
    slug: "linux-systems",
    category: { ko: "시스템", en: "SYSTEMS" },
    title: { ko: "Linux 시스템을 바닥부터", en: "Linux Systems from the Ground Up" },
    summary: {
      ko: "프로세스, 메모리, 파일과 네트워크가 운영체제 안에서 만나는 과정을 추적합니다.",
      en: "Trace how processes, memory, files, and networks meet inside an operating system.",
    },
    eyebrow: { ko: "준비 중", en: "PLANNED" },
    level: "beginner",
    status: "planned",
    accent: "green",
    chapters: { ko: [], en: [] },
  },
  {
    id: "infrastructure-design",
    slug: "infrastructure-design",
    category: { ko: "인프라", en: "INFRASTRUCTURE" },
    title: { ko: "인프라 설계를 바닥부터", en: "Infrastructure Design from the Ground Up" },
    summary: {
      ko: "요구사항에서 출발해 확장성, 가용성, 비용 사이의 선택을 실제 구조로 만듭니다.",
      en: "Turn requirements into concrete choices across scale, availability, and cost.",
    },
    eyebrow: { ko: "준비 중", en: "PLANNED" },
    level: "intermediate",
    status: "planned",
    accent: "blue",
    chapters: { ko: [], en: [] },
  },
  {
    id: "design-patterns",
    slug: "design-patterns",
    category: { ko: "소프트웨어 설계", en: "SOFTWARE DESIGN" },
    title: { ko: "디자인 패턴을 바닥부터", en: "Design Patterns from the Ground Up" },
    summary: {
      ko: "패턴 이름을 외우기보다 변화하는 코드에서 패턴이 필요한 순간을 발견합니다.",
      en: "Discover why patterns emerge from changing code instead of memorizing their names.",
    },
    eyebrow: { ko: "준비 중", en: "PLANNED" },
    level: "intermediate",
    status: "planned",
    accent: "orange",
    chapters: { ko: [], en: [] },
  },
];

export function getCurriculum(slug: string) {
  return curricula.find((curriculum) => curriculum.slug === slug);
}

export function getCurriculumChapters(slug: string, locale: Locale) {
  return getCurriculum(slug)?.chapters[locale] ?? [];
}

export const curriculumChapterIds = Object.freeze(
  curricula.flatMap((curriculum) => curriculum.chapters.ko.map((chapter) => chapter.id)),
);

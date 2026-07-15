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
  /** Editorial progress. Kept separate from runtime/public access readiness. */
  developmentStatus: "planned" | "in-progress" | "complete";
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
  experiment?: {
    href: "/experiments/linux";
    label: LocalizedText;
  };
};

export const TRANSFORMER_CURRICULUM_SLUG = "transformer-from-zero";
export const LINUX_CURRICULUM_SLUG = "linux-systems";

export function chapterId(curriculumSlug: string, chapterSlug: string) {
  return `${curriculumSlug}/${chapterSlug}`;
}

export const VECTOR_CHAPTER_ESTIMATED_MINUTES = 60;
export const LINUX_SHELL_CHAPTER_ESTIMATED_MINUTES = 35;
export const LINUX_BOOT_CHAPTER_ESTIMATED_MINUTES = 50;

export const chaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "vectors",
    title: "벡터와 텐서",
    subtitle: "숫자의 묶음이 어떻게 의미와 방향을 갖는가",
    description:
      "벡터의 크기와 방향, NumPy reshape와 axis, 브로드캐스팅과 내적을 예측·수정 실습으로 연결합니다.",
    runtime: "NumPy",
    estimatedMinutes: VECTOR_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["reshape", "axis", "내적"],
  },
  {
    number: 2,
    slug: "optimization",
    title: "학습과 최적화",
    subtitle: "모델은 어떻게 정답에 가까워지는가",
    description:
      "손실함수, 미분과 경사하강법을 직접 움직이며 학습률의 의미를 확인합니다.",
    runtime: "NumPy",
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
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
    developmentStatus: "planned",
    status: "planned",
    concepts: ["tokenizer", "block", "logits"],
  },
];

export const chaptersEn: Chapter[] = [
  {
    number: 1, slug: "vectors", title: "Vectors and Tensors",
    subtitle: "How collections of numbers gain meaning and direction",
    description: "Connect vector magnitude and direction, NumPy reshape and axes, broadcasting, and dot products through predict-and-repair practice.",
    runtime: "NumPy", estimatedMinutes: VECTOR_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["reshape", "axis", "dot product"],
  },
  {
    number: 2, slug: "optimization", title: "Learning and Optimization",
    subtitle: "How a model moves closer to the right answer",
    description: "Move through loss functions, derivatives, and gradient descent to understand what the learning rate controls.",
    runtime: "NumPy", developmentStatus: "planned", status: "planned", concepts: ["loss", "gradient", "learning rate"],
  },
  {
    number: 3, slug: "neural-networks", title: "Classification and Neural Networks",
    subtitle: "Building complex boundaries from simple lines",
    description: "Start with logistic regression, then use activation functions and a multilayer perceptron to solve XOR.",
    runtime: "NumPy + WebGPU", developmentStatus: "planned", status: "planned", concepts: ["sigmoid", "BCE", "MLP"],
  },
  {
    number: 4, slug: "training", title: "Deep Learning Training",
    subtitle: "How small batches train deep models",
    description: "Connect mini-batches, Adam, Softmax, cross entropy, and dropout in one small classifier.",
    runtime: "WebGPU", developmentStatus: "planned", status: "planned", concepts: ["mini-batch", "Adam", "Dropout"],
  },
  {
    number: 5, slug: "embeddings", title: "Tokens and Embeddings",
    subtitle: "Placing words in a space we can compute with",
    description: "Connect tokenization, one-hot vectors, embedding lookup, and semantic similarity, then compare real sentence embeddings.",
    runtime: "Workers AI + NumPy", developmentStatus: "planned", status: "planned", concepts: ["token", "embedding", "cosine"],
  },
  {
    number: 6, slug: "sequences", title: "Sequential Data",
    subtitle: "What an RNN remembers and forgets",
    description: "Observe hidden state, long-range dependencies, vanishing gradients, and LSTM gates across a sequence.",
    runtime: "NumPy + WebGPU", developmentStatus: "planned", status: "planned", concepts: ["hidden state", "RNN", "LSTM"],
  },
  {
    number: 7, slug: "attention", title: "Attention",
    subtitle: "Finding the information that matters directly",
    description: "Calculate every step from Query-Key-Value similarity to the resulting context vectors.",
    runtime: "NumPy", developmentStatus: "planned", status: "planned", concepts: ["Query", "Key", "Value"],
  },
  {
    number: 8, slug: "self-attention", title: "Self-Attention",
    subtitle: "Letting words in a sentence read one another",
    description: "Break scaled dot-product, causal masking, and multi-head attention into token-level heatmaps.",
    runtime: "NumPy + WebGPU", developmentStatus: "planned", status: "planned", concepts: ["scaled dot-product", "mask", "multi-head"],
  },
  {
    number: 9, slug: "transformer-block", title: "The Transformer Block",
    subtitle: "Why attention alone is not enough",
    description: "Assemble positional encoding, residual connections, layer normalization, and an FFN into one block.",
    runtime: "WebGPU", developmentStatus: "planned", status: "planned", concepts: ["position", "residual", "FFN"],
  },
  {
    number: 10, slug: "mini-transformer", title: "Mini Transformer",
    subtitle: "Combining the pieces into a working model",
    description: "Connect the tokenizer to logits and watch a small next-token model learn.",
    runtime: "WebGPU", developmentStatus: "planned", status: "planned", concepts: ["tokenizer", "block", "logits"],
  },
];

export const linuxChaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "shell-and-filesystem",
    title: "셸에서 첫 파일까지",
    subtitle: "명령, 경로와 파일이 만나는 가장 작은 Linux 작업 흐름",
    description:
      "프롬프트를 읽고 절대·상대 경로를 이동한 뒤, 디렉터리와 파일을 만들며 오류 메시지를 시스템의 단서로 해석합니다.",
    runtime: "교육용 셸",
    estimatedMinutes: LINUX_SHELL_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["shell", "path", "filesystem"],
  },
  {
    number: 2,
    slug: "boot-to-shell",
    title: "전원이 켜지고 셸이 뜨기까지",
    subtitle: "BIOS, 커널과 init이 한 줄의 프롬프트를 만드는 과정",
    description:
      "결정론적 부팅 모델에서 실패 경계를 복구하고, 선택형 v86 실험과 비교하며 펌웨어에서 커널, init과 직렬 콘솔 셸까지 추적합니다.",
    runtime: "부팅 모델 · 선택 v86",
    estimatedMinutes: LINUX_BOOT_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["firmware", "rootfs", "PID 1"],
  },
  {
    number: 3,
    slug: "processes-and-signals",
    title: "프로세스와 시그널",
    subtitle: "실행 중인 프로그램은 어떻게 태어나고 끝나는가",
    description:
      "PID, 부모·자식 프로세스, 표준 스트림과 시그널을 관찰해 셸이 프로그램을 다루는 방식을 이해합니다.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["PID", "stdio", "signal"],
  },
  {
    number: 4,
    slug: "users-and-permissions",
    title: "사용자와 권한",
    subtitle: "누가 어떤 파일을 읽고 바꿀 수 있는가",
    description:
      "사용자·그룹과 rwx 권한을 실제 접근 성공과 실패에 연결하고 최소 권한의 의미를 확인합니다.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["uid", "group", "rwx"],
  },
  {
    number: 5,
    slug: "memory-and-virtual-addresses",
    title: "메모리와 가상 주소",
    subtitle: "각 프로세스가 자기만의 메모리를 가진 것처럼 보이는 이유",
    description:
      "스택, 힙, 페이지와 가상 메모리를 작은 프로그램의 주소 변화와 /proc 정보로 연결합니다.",
    runtime: "C · Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["stack", "heap", "page"],
  },
  {
    number: 6,
    slug: "storage-and-filesystems",
    title: "저장장치와 파일시스템",
    subtitle: "바이트 덩어리가 이름 있는 파일이 되는 구조",
    description:
      "블록 장치, inode, 디렉터리와 mount를 추적하며 파일 경로 아래의 저장 구조를 조립합니다.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["block", "inode", "mount"],
  },
  {
    number: 7,
    slug: "networking-from-a-packet",
    title: "패킷에서 소켓까지",
    subtitle: "한 프로세스의 데이터가 다른 컴퓨터에 닿는 과정",
    description:
      "인터페이스, IP, 라우팅, TCP와 소켓을 하나의 요청이 이동하는 순서로 관찰합니다.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["IP", "TCP", "socket"],
  },
  {
    number: 8,
    slug: "assemble-a-tiny-linux",
    title: "작은 Linux 조립하기",
    subtitle: "부팅부터 네트워크까지 배운 층을 하나의 시스템으로",
    description:
      "커널과 root filesystem을 구성하고 부팅 실패를 진단하며 최소 Linux 시스템을 완성합니다.",
    runtime: "Buildroot · v86",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["kernel config", "rootfs", "debugging"],
  },
];

export const linuxChaptersEn: Chapter[] = [
  {
    number: 1,
    slug: "shell-and-filesystem",
    title: "From the Shell to Your First File",
    subtitle: "The smallest Linux workflow connecting commands, paths, and files",
    description:
      "Read the prompt, move through absolute and relative paths, create directories and files, and treat error messages as clues about system state.",
    runtime: "Teaching shell",
    estimatedMinutes: LINUX_SHELL_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["shell", "path", "filesystem"],
  },
  {
    number: 2,
    slug: "boot-to-shell",
    title: "From Power-On to a Shell",
    subtitle: "How BIOS, the kernel, and init produce one command prompt",
    description:
      "Repair failed boundaries in a deterministic boot model, compare them with an optional v86 run, and trace firmware through the kernel, init, and the serial console shell.",
    runtime: "Boot model · optional v86",
    estimatedMinutes: LINUX_BOOT_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["firmware", "rootfs", "PID 1"],
  },
  {
    number: 3,
    slug: "processes-and-signals",
    title: "Processes and Signals",
    subtitle: "How a running program begins and ends",
    description:
      "Observe PIDs, parent-child processes, standard streams, and signals to understand how a shell controls programs.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["PID", "stdio", "signal"],
  },
  {
    number: 4,
    slug: "users-and-permissions",
    title: "Users and Permissions",
    subtitle: "Who can read or change each file",
    description:
      "Connect users, groups, and rwx permissions to real access successes and failures, then apply least privilege.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["uid", "group", "rwx"],
  },
  {
    number: 5,
    slug: "memory-and-virtual-addresses",
    title: "Memory and Virtual Addresses",
    subtitle: "Why every process appears to have memory of its own",
    description:
      "Connect stacks, heaps, pages, and virtual memory to address changes in a small program and information from /proc.",
    runtime: "C · Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["stack", "heap", "page"],
  },
  {
    number: 6,
    slug: "storage-and-filesystems",
    title: "Storage and Filesystems",
    subtitle: "How blocks of bytes become named files",
    description:
      "Trace block devices, inodes, directories, and mounts to assemble the storage structure beneath a file path.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["block", "inode", "mount"],
  },
  {
    number: 7,
    slug: "networking-from-a-packet",
    title: "From Packets to Sockets",
    subtitle: "How one process reaches another computer",
    description:
      "Observe interfaces, IP, routing, TCP, and sockets in the order that one request moves through them.",
    runtime: "Linux VM",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["IP", "TCP", "socket"],
  },
  {
    number: 8,
    slug: "assemble-a-tiny-linux",
    title: "Assemble a Tiny Linux System",
    subtitle: "Combine every layer from boot to networking",
    description:
      "Configure a kernel and root filesystem, diagnose boot failures, and complete a minimal Linux system.",
    runtime: "Buildroot · v86",
    developmentStatus: "planned",
    status: "planned",
    concepts: ["kernel config", "rootfs", "debugging"],
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
    id: LINUX_CURRICULUM_SLUG,
    slug: LINUX_CURRICULUM_SLUG,
    category: { ko: "시스템", en: "SYSTEMS" },
    title: { ko: "Linux 시스템을 바닥부터", en: "Linux Systems from the Ground Up" },
    summary: {
      ko: "프로세스, 메모리, 파일과 네트워크가 운영체제 안에서 만나는 과정을 추적합니다.",
      en: "Trace how processes, memory, files, and networks meet inside an operating system.",
    },
    eyebrow: { ko: "샘플 커리큘럼", en: "SAMPLE CURRICULUM" },
    level: "beginner",
    status: "in-progress",
    accent: "green",
    chapters: {
      ko: scopeChapters(LINUX_CURRICULUM_SLUG, linuxChaptersKo),
      en: scopeChapters(LINUX_CURRICULUM_SLUG, linuxChaptersEn),
    },
    experiment: {
      href: "/experiments/linux",
      label: { ko: "Linux 실험 열기", en: "Open the Linux experiment" },
    },
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

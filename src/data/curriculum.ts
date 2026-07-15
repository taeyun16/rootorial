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
export const OPTIMIZATION_CHAPTER_ESTIMATED_MINUTES = 55;
export const NEURAL_NETWORKS_CHAPTER_ESTIMATED_MINUTES = 60;
export const TRAINING_CHAPTER_ESTIMATED_MINUTES = 65;
export const EMBEDDINGS_CHAPTER_ESTIMATED_MINUTES = 65;
export const SEQUENCES_CHAPTER_ESTIMATED_MINUTES = 65;
export const ATTENTION_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_SHELL_CHAPTER_ESTIMATED_MINUTES = 35;
export const LINUX_BOOT_CHAPTER_ESTIMATED_MINUTES = 50;
export const LINUX_PROCESSES_CHAPTER_ESTIMATED_MINUTES = 55;
export const LINUX_PERMISSIONS_CHAPTER_ESTIMATED_MINUTES = 60;
export const LINUX_MEMORY_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_STORAGE_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_NETWORKING_CHAPTER_ESTIMATED_MINUTES = 65;

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
      "선형 모델의 MSE와 gradient를 계산하고, 발산하는 학습률을 직접 복구하며 한 번의 파라미터 업데이트를 디버깅합니다.",
    runtime: "수학 모델 · 선택 NumPy",
    estimatedMinutes: OPTIMIZATION_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["MSE", "gradient", "learning rate"],
  },
  {
    number: 3,
    slug: "neural-networks",
    title: "분류와 신경망",
    subtitle: "직선을 쌓아 복잡한 경계를 만드는 법",
    description:
      "sigmoid와 BCE로 이진 분류를 읽고, hidden feature와 두 행렬 곱을 조립해 XOR을 해결하고 신경망 결함을 디버깅합니다.",
    runtime: "수학 모델",
    estimatedMinutes: NEURAL_NETWORKS_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["sigmoid · BCE", "hidden layer", "XOR"],
  },
  {
    number: 4,
    slug: "training",
    title: "딥러닝 학습 구조",
    subtitle: "작은 배치가 깊은 모델을 학습시키는 과정",
    description:
      "3-class logits의 Softmax·Cross Entropy를 mini-batch와 Adam update로 연결하고, validation·Dropout 경계를 실행하며 디버깅합니다.",
    runtime: "TypeScript 수학 모델",
    estimatedMinutes: TRAINING_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["mini-batch · CE", "Adam state", "validation · Dropout"],
  },
  {
    number: 5,
    slug: "embeddings",
    title: "토큰과 임베딩",
    subtitle: "단어를 계산 가능한 공간에 놓기",
    description:
      "결정적 subword 토큰화에서 embedding lookup·반복 row gradient·cosine·masked mean까지 직접 계산하고 디버깅합니다.",
    runtime: "TypeScript 임베딩 모델",
    estimatedMinutes: EMBEDDINGS_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["token ID · lookup", "row gradient · cosine", "masked mean"],
  },
  {
    number: 6,
    slug: "sequences",
    title: "순서가 있는 데이터",
    subtitle: "RNN은 무엇을 기억하고 무엇을 잊는가",
    description:
      "결정적 RNN unroll에서 hidden state와 공유 recurrence를 조작하고, 시간축 gradient와 LSTM cell update를 계산해 causal prefix를 디버깅합니다.",
    runtime: "TypeScript 시퀀스 모델",
    estimatedMinutes: SEQUENCES_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["hidden state · recurrence", "temporal gradient", "LSTM · causal prefix"],
  },
  {
    number: 7,
    slug: "attention",
    title: "Attention",
    subtitle: "필요한 정보를 직접 찾아보는 방법",
    description:
      "단일 query와 분리된 Key·Value로 점수를 계산하고, key축 Softmax와 value 가중합 문맥을 실행하며 잘못된 Attention 계약을 디버깅합니다.",
    runtime: "TypeScript Attention 모델",
    estimatedMinutes: ATTENTION_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["Query · Key 역할", "key축 Softmax", "Value · context"],
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
    description: "Compute MSE and gradients for a linear model, repair a diverging learning rate, and debug one parameter update at a time.",
    runtime: "Math model · optional NumPy", estimatedMinutes: OPTIMIZATION_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["MSE", "gradient", "learning rate"],
  },
  {
    number: 3, slug: "neural-networks", title: "Classification and Neural Networks",
    subtitle: "Building complex boundaries from simple lines",
    description: "Read binary classification through sigmoid and BCE, then assemble hidden features and two matrix products to solve XOR and debug network failures.",
    runtime: "Math model", estimatedMinutes: NEURAL_NETWORKS_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["sigmoid · BCE", "hidden layer", "XOR"],
  },
  {
    number: 4, slug: "training", title: "Deep Learning Training",
    subtitle: "How small batches train deep models",
    description: "Connect three-class Softmax and cross entropy to mini-batch Adam updates, then run and debug validation and dropout boundaries.",
    runtime: "TypeScript math model", estimatedMinutes: TRAINING_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["mini-batch · CE", "Adam state", "validation · dropout"],
  },
  {
    number: 5, slug: "embeddings", title: "Tokens and Embeddings",
    subtitle: "Placing words in a space we can compute with",
    description: "Compute and debug deterministic subword tokenization, embedding lookup, repeated-row gradients, cosine similarity, and masked mean pooling.",
    runtime: "TypeScript embedding model", estimatedMinutes: EMBEDDINGS_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["token ID · lookup", "row gradient · cosine", "masked mean"],
  },
  {
    number: 6, slug: "sequences", title: "Sequential Data",
    subtitle: "What an RNN remembers and forgets",
    description: "Manipulate hidden state and shared recurrence in a deterministic RNN unroll, then compute temporal gradients and LSTM cell updates to debug causal prefixes.",
    runtime: "TypeScript sequence model", estimatedMinutes: SEQUENCES_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["hidden state · recurrence", "temporal gradient", "LSTM · causal prefix"],
  },
  {
    number: 7, slug: "attention", title: "Attention",
    subtitle: "Finding the information that matters directly",
    description: "Compute scores from a single query and separate keys and values, then run key-axis softmax and a weighted-value context while debugging broken Attention contracts.",
    runtime: "TypeScript attention model", estimatedMinutes: ATTENTION_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["Query · Key roles", "key-axis Softmax", "Value · context"],
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
      "결정론적 프로세스 모델에서 fork·exec, PID·PPID, 표준 스트림, signal과 wait의 상태 전이를 직접 조작하고 진단합니다.",
    runtime: "프로세스 모델",
    estimatedMinutes: LINUX_PROCESSES_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["PID·PPID", "stdio", "signal·wait"],
  },
  {
    number: 4,
    slug: "users-and-permissions",
    title: "사용자와 권한",
    subtitle: "누가 어떤 파일을 읽고 바꿀 수 있는가",
    description:
      "프로세스 자격 증명과 파일 owner·group·rwx를 비교하고, 경로 탐색·삭제 경계를 진단하며 최소 권한 정책을 조립합니다.",
    runtime: "권한 모델",
    estimatedMinutes: LINUX_PERMISSIONS_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["UID·GID", "rwx · path search", "least privilege"],
  },
  {
    number: 5,
    slug: "memory-and-virtual-addresses",
    title: "메모리와 가상 주소",
    subtitle: "각 프로세스가 자기만의 메모리를 가진 것처럼 보이는 이유",
    description:
      "프로세스별 VA를 VPN·offset과 PTE·frame으로 번역하고, TLB miss·page fault·COW와 /proc maps의 경계를 직접 실행하고 진단합니다.",
    runtime: "주소 변환 모델 · 선택 Linux 관찰",
    estimatedMinutes: LINUX_MEMORY_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["virtual page · PTE", "TLB · page fault", "mmap · COW"],
  },
  {
    number: 6,
    slug: "storage-and-filesystems",
    title: "저장장치와 파일시스템",
    subtitle: "바이트 덩어리가 이름 있는 파일이 되는 구조",
    description:
      "경로가 mount와 directory entry를 지나 inode·block에 닿는 과정을 추적하고, hard link 수명·용량 고갈·crash-safe 저장을 직접 실행하고 진단합니다.",
    runtime: "파일시스템 모델 · 선택 Linux 관찰",
    estimatedMinutes: LINUX_STORAGE_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["mount · inode", "hard link · unlink", "fsync · durability"],
  },
  {
    number: 7,
    slug: "networking-from-a-packet",
    title: "패킷에서 소켓까지",
    subtitle: "한 프로세스의 데이터가 다른 컴퓨터에 닿는 과정",
    description:
      "regular-file fd에서 읽은 바이트를 socket fd로 넘기고, longest-prefix route·next hop·TCP 누적 ACK를 따라 원격 프로세스의 recv까지 실행하고 진단합니다.",
    runtime: "네트워크 경로 모델 · 선택 Linux 관찰",
    estimatedMinutes: LINUX_NETWORKING_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["socket fd · endpoint", "CIDR route · next hop", "TCP ACK · recv"],
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
      "Manipulate and diagnose fork, exec, PID and PPID, standard streams, signals, and wait transitions in a deterministic process model.",
    runtime: "Process model",
    estimatedMinutes: LINUX_PROCESSES_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["PID·PPID", "stdio", "signal·wait"],
  },
  {
    number: 4,
    slug: "users-and-permissions",
    title: "Users and Permissions",
    subtitle: "Who can read or change each file",
    description:
      "Compare process credentials with file owner, group, and rwx bits, diagnose path traversal and deletion boundaries, and assemble a least-privilege policy.",
    runtime: "Permission model",
    estimatedMinutes: LINUX_PERMISSIONS_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["UID·GID", "rwx · path search", "least privilege"],
  },
  {
    number: 5,
    slug: "memory-and-virtual-addresses",
    title: "Memory and Virtual Addresses",
    subtitle: "Why every process appears to have memory of its own",
    description:
      "Translate per-process VAs through VPNs, offsets, PTEs, and frames, then run and diagnose TLB misses, page faults, COW, and /proc maps boundaries.",
    runtime: "Address translation model · optional Linux observation",
    estimatedMinutes: LINUX_MEMORY_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["virtual page · PTE", "TLB · page fault", "mmap · COW"],
  },
  {
    number: 6,
    slug: "storage-and-filesystems",
    title: "Storage and Filesystems",
    subtitle: "How blocks of bytes become named files",
    description:
      "Trace a path across mounts and directory entries into inodes and blocks, then run and diagnose hard-link lifetime, capacity exhaustion, and crash-safe storage.",
    runtime: "Filesystem model · optional Linux observation",
    estimatedMinutes: LINUX_STORAGE_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["mount · inode", "hard link · unlink", "fsync · durability"],
  },
  {
    number: 7,
    slug: "networking-from-a-packet",
    title: "From Packets to Sockets",
    subtitle: "How one process reaches another computer",
    description:
      "Move bytes read from a regular-file fd into a socket fd, then run and diagnose longest-prefix routing, next-hop resolution, cumulative TCP acknowledgements, and delivery to the remote process's recv call.",
    runtime: "Network path model · optional Linux observation",
    estimatedMinutes: LINUX_NETWORKING_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["socket fd · endpoint", "CIDR route · next hop", "TCP ACK · recv"],
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

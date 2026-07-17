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
  /** An advisory cross-curriculum foundation. It never gates access or progress. */
  recommendedPrerequisite?: {
    curriculumSlug: string;
    reason: LocalizedText;
  };
  experiment?: {
    href: "/experiments/linux";
    label: LocalizedText;
  };
};

export const TRANSFORMER_CURRICULUM_SLUG = "transformer-from-zero";
export const LINUX_CURRICULUM_SLUG = "linux-systems";
export const LINUX_NETWORKING_CURRICULUM_SLUG = "linux-networking";
export const INFRASTRUCTURE_CURRICULUM_SLUG = "infrastructure-design";
export const SYSTEM_ARCHITECTURE_CURRICULUM_SLUG = "system-architecture";

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
export const SELF_ATTENTION_CHAPTER_ESTIMATED_MINUTES = 75;
export const TRANSFORMER_BLOCK_CHAPTER_ESTIMATED_MINUTES = 80;
export const MINI_TRANSFORMER_CHAPTER_ESTIMATED_MINUTES = 90;
export const LINUX_SHELL_CHAPTER_ESTIMATED_MINUTES = 35;
export const LINUX_BOOT_CHAPTER_ESTIMATED_MINUTES = 50;
export const LINUX_PROCESSES_CHAPTER_ESTIMATED_MINUTES = 55;
export const LINUX_PERMISSIONS_CHAPTER_ESTIMATED_MINUTES = 60;
export const LINUX_MEMORY_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_STORAGE_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_NETWORKING_CHAPTER_ESTIMATED_MINUTES = 65;
export const LINUX_TINY_SYSTEM_CHAPTER_ESTIMATED_MINUTES = 75;
export const INFRASTRUCTURE_NAMESPACE_CHAPTER_ESTIMATED_MINUTES = 65;

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
    subtitle: "같은 시퀀스의 토큰들이 서로를 읽는 법",
    description:
      "같은 입력에서 Q·K·V를 따로 투영해 모든 token row의 scaled dot-product를 계산하고, causal mask와 multi-head 분할·병합 계약을 실행하며 정보 누출과 shape 결함을 디버깅합니다.",
    runtime: "TypeScript Self-Attention 모델",
    estimatedMinutes: SELF_ATTENTION_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["Q/K/V 투영 · token row", "scaled score · causal mask", "multi-head split · concat"],
  },
  {
    number: 9,
    slug: "transformer-block",
    title: "Transformer 블록",
    subtitle: "Attention만으로는 충분하지 않다",
    description:
      "결정적 absolute 위치 신호를 첫 블록 입력에 한 번 더하고, pre-LayerNorm causal Self-Attention과 position-wise FFN을 residual 경로로 감싸 [T,d_model]을 보존하는 decoder-only block을 실행·디버깅합니다.",
    runtime: "TypeScript Transformer 블록 모델",
    estimatedMinutes: TRANSFORMER_BLOCK_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["position · block input", "pre-LayerNorm · residual", "position-wise FFN · handoff"],
  },
  {
    number: 10,
    slug: "mini-transformer",
    title: "Mini Transformer",
    subtitle: "배운 조각을 하나의 작동하는 모델로",
    description:
      "결정적 tokenizer→embedding+position→pre-LayerNorm decoder block→final norm→vocabulary logits를 연결하고, shifted target loss·한 번의 LM-head update와 EOS/max-length autoregressive decoding을 실행·디버깅합니다.",
    runtime: "TypeScript Mini Transformer 모델",
    estimatedMinutes: MINI_TRANSFORMER_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["shifted target · causal prefix", "final norm · vocabulary logits", "loss · autoregressive decode"],
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
    subtitle: "Letting every token read the same sequence",
    description: "Project Q, K, and V separately from the same input, compute scaled dot products for every token row, then execute causal-masking and multi-head split/merge contracts while debugging information leaks and shape defects.",
    runtime: "TypeScript self-attention model", estimatedMinutes: SELF_ATTENTION_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["Q/K/V projections · token rows", "scaled scores · causal mask", "multi-head split · concatenate"],
  },
  {
    number: 9, slug: "transformer-block", title: "The Transformer Block",
    subtitle: "Why attention alone is not enough",
    description: "Add a deterministic absolute positional signal once before the first block, then execute and debug a decoder-only pre-LayerNorm block whose causal self-attention and position-wise FFN preserve [T,d_model] through residual paths.",
    runtime: "TypeScript Transformer block model", estimatedMinutes: TRANSFORMER_BLOCK_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["position · block input", "pre-LayerNorm · residual", "position-wise FFN · handoff"],
  },
  {
    number: 10, slug: "mini-transformer", title: "Mini Transformer",
    subtitle: "Combining the pieces into a working model",
    description: "Connect a deterministic tokenizer, embedding plus position, one pre-LayerNorm decoder block, final normalization, and vocabulary logits, then execute and debug shifted-target loss, one LM-head update, and EOS/max-length autoregressive decoding.",
    runtime: "TypeScript Mini Transformer model", estimatedMinutes: MINI_TRANSFORMER_CHAPTER_ESTIMATED_MINUTES, developmentStatus: "complete", status: "available", concepts: ["shifted targets · causal prefixes", "final norm · vocabulary logits", "loss · autoregressive decoding"],
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
      "kernel image와 rootfs artifact를 구분하고 PID 1의 mount·최소 권한 service·network 순서를 조립한 뒤, 경계별 증거로 reportd readiness를 진단합니다.",
    runtime: "시스템 조립 모델 · 선택 v86",
    estimatedMinutes: LINUX_TINY_SYSTEM_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["artifact · rootfs", "PID 1 · service", "readiness · evidence"],
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
      "Separate kernel-image and rootfs artifacts, assemble PID 1's mounts, least-privilege service, and network order, then diagnose reportd readiness with evidence at each boundary.",
    runtime: "System assembly model · optional v86",
    estimatedMinutes: LINUX_TINY_SYSTEM_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["artifact · rootfs", "PID 1 · service", "readiness · evidence"],
  },
];

export const linuxNetworkingChaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "interfaces-addresses-and-loopback",
    title: "인터페이스·주소·loopback",
    subtitle: "한 호스트의 network view를 이루는 가장 작은 상태",
    description:
      "interface의 존재와 link state를 구분하고, MAC·IPv4 address·prefix와 loopback을 배치한 뒤 localhost가 어느 경계에 닫혀 있는지 관찰합니다.",
    runtime: "TypeScript network-view 모델 · 선택 iproute2",
    estimatedMinutes: 45,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["interface · link state", "address · prefix", "loopback · localhost"],
  },
  {
    number: 2,
    slug: "subnets-neighbors-and-gateways",
    title: "subnet·neighbor·gateway",
    subtitle: "목적지가 같은 link에 있는지 먼저 판정하기",
    description:
      "IPv4 address와 prefix로 same-link 여부를 계산하고, ARP neighbor와 default gateway가 remote destination으로 향하는 frame을 어떻게 결정하는지 실행합니다.",
    runtime: "TypeScript subnet·neighbor 모델 · 선택 iproute2",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["CIDR · same-link", "ARP · neighbor", "gateway · frame"],
  },
  {
    number: 3,
    slug: "routes-and-packet-paths",
    title: "route와 packet path",
    subtitle: "목적지에서 egress interface와 next hop까지",
    description:
      "route table의 longest-prefix match와 metric으로 egress·source address·next hop을 선택하고, router를 지나는 동안 link header와 TTL이 어떻게 바뀌는지 추적합니다.",
    runtime: "TypeScript routing 모델 · 선택 iproute2",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["longest-prefix route", "egress · next hop", "TTL · forwarding"],
  },
  {
    number: 4,
    slug: "sockets-ports-and-tcp",
    title: "socket·port·TCP",
    subtitle: "프로세스의 byte가 원격 application에 도착하는 경계",
    description:
      "fd와 kernel socket을 구분하고 bind·listen·connect·accept를 4-tuple에 연결한 뒤, TCP byte stream과 ACK·receive queue·recv의 전달 경계를 진단합니다.",
    runtime: "TypeScript socket·TCP 모델 · 선택 ss",
    estimatedMinutes: 60,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["socket fd · 4-tuple", "listen · accept", "TCP ACK · recv"],
  },
  {
    number: 5,
    slug: "dns-and-service-reachability",
    title: "DNS와 서비스 도달 가능성",
    subtitle: "이름을 endpoint로 바꾸고 실패한 경계를 구분하기",
    description:
      "resolver가 hostname을 address로 바꾸는 과정과 record TTL을 읽고, 이름 해석·route·TCP 연결·application response 실패를 서로 다른 증거로 분리합니다.",
    runtime: "TypeScript resolver·service-path 모델 · 선택 dig·curl",
    estimatedMinutes: 50,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["resolver · DNS record", "TTL · cache", "name · connect · response"],
  },
  {
    number: 6,
    slug: "diagnose-a-linux-network",
    title: "Linux 네트워크 진단하기",
    subtitle: "증상에서 interface·route·socket 경계를 순서대로 찾기",
    description:
      "ip link·address·route·neigh, ss, dig·getent, curl과 tcpdump 증거를 한 packet path에 정렬해 여러 결함이 섞인 서비스 도달 실패를 진단합니다.",
    runtime: "TypeScript 진단 스튜디오 · 선택 Linux 관찰",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["layered evidence", "ip · ss · DNS", "tcpdump · fault isolation"],
  },
];

export const linuxNetworkingChaptersEn: Chapter[] = [
  {
    number: 1,
    slug: "interfaces-addresses-and-loopback",
    title: "Interfaces, Addresses, and Loopback",
    subtitle: "The smallest state that forms one host's network view",
    description:
      "Separate interface existence from link state, place MAC and IPv4 addresses with prefixes, and observe which boundary contains loopback and localhost.",
    runtime: "TypeScript network-view model · optional iproute2",
    estimatedMinutes: 45,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["interface · link state", "address · prefix", "loopback · localhost"],
  },
  {
    number: 2,
    slug: "subnets-neighbors-and-gateways",
    title: "Subnets, Neighbors, and Gateways",
    subtitle: "Decide whether a destination is on the same link first",
    description:
      "Compute same-link reachability from an IPv4 address and prefix, then execute how ARP neighbors and the default gateway determine the frame toward a remote destination.",
    runtime: "TypeScript subnet and neighbor model · optional iproute2",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["CIDR · same-link", "ARP · neighbor", "gateway · frame"],
  },
  {
    number: 3,
    slug: "routes-and-packet-paths",
    title: "Routes and Packet Paths",
    subtitle: "From a destination to an egress interface and next hop",
    description:
      "Select the egress, source address, and next hop with longest-prefix matching and metrics, then trace how link headers and TTL change across routers.",
    runtime: "TypeScript routing model · optional iproute2",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["longest-prefix route", "egress · next hop", "TTL · forwarding"],
  },
  {
    number: 4,
    slug: "sockets-ports-and-tcp",
    title: "Sockets, Ports, and TCP",
    subtitle: "The boundaries between process bytes and a remote application",
    description:
      "Separate an fd from its kernel socket, connect bind, listen, connect, and accept to a four-tuple, then diagnose TCP stream, ACK, receive-queue, and recv boundaries.",
    runtime: "TypeScript socket and TCP model · optional ss",
    estimatedMinutes: 60,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["socket fd · 4-tuple", "listen · accept", "TCP ACK · recv"],
  },
  {
    number: 5,
    slug: "dns-and-service-reachability",
    title: "DNS and Service Reachability",
    subtitle: "Turn a name into an endpoint and separate the failing boundary",
    description:
      "Read how a resolver turns a hostname into an address and applies record TTL, then separate name-resolution, route, TCP-connect, and application-response failures with distinct evidence.",
    runtime: "TypeScript resolver and service-path model · optional dig and curl",
    estimatedMinutes: 50,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["resolver · DNS record", "TTL · cache", "name · connect · response"],
  },
  {
    number: 6,
    slug: "diagnose-a-linux-network",
    title: "Diagnose a Linux Network",
    subtitle: "Locate interface, route, and socket boundaries from symptoms",
    description:
      "Align ip link, address, route, and neigh output with ss, dig or getent, curl, and tcpdump evidence to diagnose a service path containing several simultaneous faults.",
    runtime: "TypeScript diagnosis studio · optional Linux observation",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["layered evidence", "ip · ss · DNS", "tcpdump · fault isolation"],
  },
];

export const infrastructureChaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "network-namespaces-and-boundaries",
    title: "네트워크 namespace와 격리 경계",
    subtitle: "같은 커널 안에서 서로 다른 localhost를 설계하는 법",
    description:
      "프로세스, 인터페이스, route와 socket을 namespace별 network view에 배치하고, loopback과 listener 경계를 직접 실행하며 격리 실패를 진단합니다.",
    runtime: "TypeScript namespace 모델 · 선택 iproute2",
    estimatedMinutes: INFRASTRUCTURE_NAMESPACE_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["network namespace · ownership", "loopback · listener", "reachability · evidence"],
  },
  {
    number: 2,
    slug: "veth-bridges-and-routing",
    title: "veth·bridge·routing으로 토폴로지 조립",
    subtitle: "격리된 network view 사이에 의도한 경로만 연결하기",
    description:
      "veth pair와 bridge 또는 router namespace를 선택하고, 겹치지 않는 CIDR·address·default route·return path를 조립합니다.",
    runtime: "TypeScript 토폴로지 모델 · 선택 iproute2",
    estimatedMinutes: 80,
    developmentStatus: "complete",
    status: "available",
    concepts: ["veth pair · bridge", "CIDR · gateway", "forwarding · return path"],
  },
  {
    number: 3,
    slug: "egress-nat-and-conntrack",
    title: "egress·NAT·conntrack",
    subtitle: "사설 주소의 흐름을 경계에서 상태 있게 번역하기",
    description:
      "router namespace의 forwarding, SNAT·MASQUERADE와 conntrack reply 경로를 연결하고 asymmetric path와 stale state를 진단합니다.",
    runtime: "TypeScript packet-state 모델 · 선택 nftables",
    estimatedMinutes: 80,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["IP forwarding", "SNAT · MASQUERADE", "conntrack · reply path"],
  },
  {
    number: 4,
    slug: "network-policy-and-firewalls",
    title: "네트워크 정책과 firewall",
    subtitle: "연결 가능성 위에 최소 허용 규칙 세우기",
    description:
      "namespace 경계마다 default-deny 정책을 세우고 stateful nftables chain의 hook·direction·rule order를 검증합니다.",
    runtime: "TypeScript 정책 모델 · 선택 nftables",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["default deny", "hook · direction", "stateful policy"],
  },
  {
    number: 5,
    slug: "service-discovery-and-load-balancing",
    title: "서비스 탐색과 load balancing",
    subtitle: "변하는 endpoint를 안정적인 이름과 진입점 뒤에 두기",
    description:
      "DNS record 수명, health 상태와 L4 load-balancer 선택을 namespace 서비스 토폴로지에 연결하고 stale endpoint를 진단합니다.",
    runtime: "TypeScript service-path 모델",
    estimatedMinutes: 80,
    developmentStatus: "complete",
    status: "available",
    concepts: ["DNS · TTL", "health check", "L4 balancing · affinity"],
  },
  {
    number: 6,
    slug: "availability-and-failure-domains",
    title: "가용성과 failure domain",
    subtitle: "복제 수가 아니라 독립적인 실패 경계를 설계하기",
    description:
      "서비스 replica와 gateway를 서로 다른 failure domain에 배치하고 dependency budget·failover·degraded mode의 실제 가용성을 계산합니다.",
    runtime: "TypeScript failure 시뮬레이터",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["failure domain", "redundancy · failover", "dependency budget"],
  },
  {
    number: 7,
    slug: "network-observability-and-capacity",
    title: "네트워크 관측과 용량",
    subtitle: "증상에서 namespace 경계와 병목을 찾기",
    description:
      "ip·ss·tcpdump·counter 증거를 한 packet path에 정렬하고 queue·bandwidth·connection limit의 포화 지점을 추정합니다.",
    runtime: "TypeScript 증거·용량 모델 · 선택 Linux 관찰",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["namespace-scoped evidence", "queue · saturation", "SLO · capacity"],
  },
  {
    number: 8,
    slug: "assemble-a-namespace-platform",
    title: "namespace 플랫폼 조립하기",
    subtitle: "격리·연결·정책·가용성을 하나의 검증 가능한 설계로",
    description:
      "client·edge·app·data namespace를 요구사항에서 조립하고 route, NAT, policy, discovery와 failure evidence로 설계 결정을 검증합니다.",
    runtime: "TypeScript 인프라 설계 스튜디오",
    estimatedMinutes: 95,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["requirements · topology", "policy · availability", "evidence · trade-off"],
  },
];

export const infrastructureChaptersEn: Chapter[] = [
  {
    number: 1,
    slug: "network-namespaces-and-boundaries",
    title: "Network Namespaces and Isolation Boundaries",
    subtitle: "Designing different localhost views inside one kernel",
    description:
      "Place processes, interfaces, routes, and sockets into namespace-local network views, execute loopback and listener boundaries, and diagnose failed isolation.",
    runtime: "TypeScript namespace model · optional iproute2",
    estimatedMinutes: INFRASTRUCTURE_NAMESPACE_CHAPTER_ESTIMATED_MINUTES,
    developmentStatus: "complete",
    status: "available",
    concepts: ["network namespace · ownership", "loopback · listener", "reachability · evidence"],
  },
  {
    number: 2,
    slug: "veth-bridges-and-routing",
    title: "Assemble Topologies with veth, Bridges, and Routing",
    subtitle: "Connect only the intended paths between isolated network views",
    description:
      "Choose veth pairs, a bridge, or a router namespace, then assemble non-overlapping CIDRs, addresses, default routes, and return paths.",
    runtime: "TypeScript topology model · optional iproute2",
    estimatedMinutes: 80,
    developmentStatus: "complete",
    status: "available",
    concepts: ["veth pair · bridge", "CIDR · gateway", "forwarding · return path"],
  },
  {
    number: 3,
    slug: "egress-nat-and-conntrack",
    title: "Egress, NAT, and Conntrack",
    subtitle: "Translate private-address flows statefully at a boundary",
    description:
      "Connect forwarding, SNAT or masquerade, and conntrack reply paths in a router namespace, then diagnose asymmetric paths and stale state.",
    runtime: "TypeScript packet-state model · optional nftables",
    estimatedMinutes: 80,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["IP forwarding", "SNAT · MASQUERADE", "conntrack · reply path"],
  },
  {
    number: 4,
    slug: "network-policy-and-firewalls",
    title: "Network Policy and Firewalls",
    subtitle: "Add least-allow rules on top of reachability",
    description:
      "Establish default-deny policy at namespace boundaries and verify hook, direction, and rule order in stateful nftables chains.",
    runtime: "TypeScript policy model · optional nftables",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["default deny", "hook · direction", "stateful policy"],
  },
  {
    number: 5,
    slug: "service-discovery-and-load-balancing",
    title: "Service Discovery and Load Balancing",
    subtitle: "Place changing endpoints behind stable names and entry points",
    description:
      "Connect DNS record lifetime, health state, and L4 load-balancer choices to a namespace service topology, then diagnose stale endpoints.",
    runtime: "TypeScript service-path model",
    estimatedMinutes: 80,
    developmentStatus: "complete",
    status: "available",
    concepts: ["DNS · TTL", "health check", "L4 balancing · affinity"],
  },
  {
    number: 6,
    slug: "availability-and-failure-domains",
    title: "Availability and Failure Domains",
    subtitle: "Design independent failure boundaries, not just replica counts",
    description:
      "Place service replicas and gateways across failure domains, then compute actual availability from dependency budgets, failover, and degraded modes.",
    runtime: "TypeScript failure simulator",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["failure domain", "redundancy · failover", "dependency budget"],
  },
  {
    number: 7,
    slug: "network-observability-and-capacity",
    title: "Network Observability and Capacity",
    subtitle: "Find namespace boundaries and bottlenecks from evidence",
    description:
      "Align ip, ss, tcpdump, and counter evidence along one packet path, then estimate queue, bandwidth, and connection-limit saturation.",
    runtime: "TypeScript evidence and capacity model · optional Linux observation",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["namespace-scoped evidence", "queue · saturation", "SLO · capacity"],
  },
  {
    number: 8,
    slug: "assemble-a-namespace-platform",
    title: "Assemble a Namespace Platform",
    subtitle: "Combine isolation, connectivity, policy, and availability into a verifiable design",
    description:
      "Assemble client, edge, app, and data namespaces from requirements, then verify design decisions with route, NAT, policy, discovery, and failure evidence.",
    runtime: "TypeScript infrastructure design studio",
    estimatedMinutes: 95,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["requirements · topology", "policy · availability", "evidence · trade-off"],
  },
];

export const systemArchitectureChaptersKo: Chapter[] = [
  {
    number: 1,
    slug: "requirements-and-quality-attributes",
    title: "요구사항과 품질 속성",
    subtitle: "기능보다 먼저 설계가 지켜야 할 숫자와 제약 정하기",
    description:
      "workload·latency·availability·durability·cost 요구를 측정 가능한 목표로 바꾸고, 서로 충돌하는 quality attribute의 우선순위를 정합니다.",
    runtime: "TypeScript 요구사항·trade-off 모델",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["workload · constraint", "quality attribute", "trade-off · budget"],
  },
  {
    number: 2,
    slug: "components-and-request-flows",
    title: "컴포넌트 경계와 요청 흐름",
    subtitle: "한 요청이 지나가는 책임·신뢰·실패 경계 그리기",
    description:
      "client에서 edge·service·data store까지 request path를 나누고, 각 component의 책임·API contract·trust boundary와 실패 전파를 검증합니다.",
    runtime: "TypeScript request-flow 설계 보드",
    estimatedMinutes: 60,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["component boundary", "request flow · contract", "trust · failure boundary"],
  },
  {
    number: 3,
    slug: "data-ownership-and-source-of-truth",
    title: "데이터 소유권과 source of truth",
    subtitle: "상태를 어디에 두고 누가 바꿀 수 있는지 결정하기",
    description:
      "entity와 access pattern에서 저장 경계를 만들고, source of truth·derived state·transaction boundary를 구분해 중복 쓰기와 소유권 충돌을 진단합니다.",
    runtime: "TypeScript data-boundary 모델",
    estimatedMinutes: 65,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["data ownership", "source of truth", "transaction · derived state"],
  },
  {
    number: 4,
    slug: "sync-async-and-idempotency",
    title: "동기·비동기 통신과 idempotency",
    subtitle: "응답 경로와 작업 경로를 분리해 실패를 흡수하기",
    description:
      "동기 호출과 queue 기반 비동기 흐름을 latency·coupling·delivery semantics로 비교하고, retry·deduplication·idempotency key로 중복 효과를 막습니다.",
    runtime: "TypeScript message-flow 시뮬레이터",
    estimatedMinutes: 70,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["sync · async", "queue · backpressure", "retry · idempotency"],
  },
  {
    number: 5,
    slug: "caching-and-consistency",
    title: "cache와 consistency",
    subtitle: "빠른 읽기와 최신 상태 사이의 계약 설계하기",
    description:
      "cache-aside와 write path를 실행하고 TTL·invalidation·stale read를 관찰한 뒤, 사용자 흐름에 필요한 consistency 수준과 복구 전략을 선택합니다.",
    runtime: "TypeScript cache·consistency 모델",
    estimatedMinutes: 65,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["cache-aside · TTL", "invalidation · stale read", "consistency contract"],
  },
  {
    number: 6,
    slug: "capacity-scaling-and-partitioning",
    title: "용량·확장·partitioning",
    subtitle: "평균이 아니라 peak와 병목에서 scale 계획 세우기",
    description:
      "traffic·storage·bandwidth budget을 계산하고 horizontal scaling과 partition key를 선택해 hot key·skew·rebalancing이 만드는 병목을 진단합니다.",
    runtime: "TypeScript capacity·partition 시뮬레이터",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["capacity budget", "horizontal scale", "partition · hot key"],
  },
  {
    number: 7,
    slug: "reliability-observability-and-slos",
    title: "신뢰성·관측성·SLO",
    subtitle: "실패를 숨기지 않고 제한하고 측정하는 시스템 만들기",
    description:
      "timeout·retry·circuit breaker·degraded mode를 dependency graph에 적용하고, metric·log·trace와 error budget으로 실제 사용자 신뢰성을 판정합니다.",
    runtime: "TypeScript failure·SLO 시뮬레이터",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["timeout · circuit breaker", "degraded mode", "SLO · error budget"],
  },
  {
    number: 8,
    slug: "design-and-review-a-system",
    title: "시스템을 설계하고 리뷰하기",
    subtitle: "요구사항에서 검증 가능한 architecture decision까지",
    description:
      "실제 서비스 요구에서 component·data·communication·scale·reliability 설계를 조립하고, failure scenario·cost·운영 증거로 architecture decision을 방어합니다.",
    runtime: "TypeScript 시스템 아키텍처 스튜디오",
    estimatedMinutes: 95,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["architecture decision", "failure · cost review", "evidence · trade-off"],
  },
];

export const systemArchitectureChaptersEn: Chapter[] = [
  {
    number: 1,
    slug: "requirements-and-quality-attributes",
    title: "Requirements and Quality Attributes",
    subtitle: "Set measurable constraints before choosing features or components",
    description:
      "Turn workload, latency, availability, durability, and cost requirements into measurable targets, then prioritize quality attributes that cannot all be maximized together.",
    runtime: "TypeScript requirements and trade-off model",
    estimatedMinutes: 55,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["workload · constraint", "quality attribute", "trade-off · budget"],
  },
  {
    number: 2,
    slug: "components-and-request-flows",
    title: "Components and Request Flows",
    subtitle: "Draw responsibility, trust, and failure boundaries along one request",
    description:
      "Split a request path across client, edge, services, and data stores, then verify each component's responsibility, API contract, trust boundary, and failure propagation.",
    runtime: "TypeScript request-flow design board",
    estimatedMinutes: 60,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["component boundary", "request flow · contract", "trust · failure boundary"],
  },
  {
    number: 3,
    slug: "data-ownership-and-source-of-truth",
    title: "Data Ownership and Sources of Truth",
    subtitle: "Decide where state lives and who is allowed to change it",
    description:
      "Derive storage boundaries from entities and access patterns, then separate sources of truth, derived state, and transaction boundaries to diagnose duplicate writes and ownership conflicts.",
    runtime: "TypeScript data-boundary model",
    estimatedMinutes: 65,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["data ownership", "source of truth", "transaction · derived state"],
  },
  {
    number: 4,
    slug: "sync-async-and-idempotency",
    title: "Synchronous, Asynchronous, and Idempotent Work",
    subtitle: "Separate response paths from work paths to absorb failure",
    description:
      "Compare synchronous calls and queue-based flows through latency, coupling, and delivery semantics, then prevent duplicate effects with retries, deduplication, and idempotency keys.",
    runtime: "TypeScript message-flow simulator",
    estimatedMinutes: 70,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["sync · async", "queue · backpressure", "retry · idempotency"],
  },
  {
    number: 5,
    slug: "caching-and-consistency",
    title: "Caching and Consistency",
    subtitle: "Design the contract between faster reads and fresher state",
    description:
      "Execute cache-aside and write paths, observe TTL, invalidation, and stale reads, then choose the consistency level and recovery strategy required by each user flow.",
    runtime: "TypeScript cache and consistency model",
    estimatedMinutes: 65,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["cache-aside · TTL", "invalidation · stale read", "consistency contract"],
  },
  {
    number: 6,
    slug: "capacity-scaling-and-partitioning",
    title: "Capacity, Scaling, and Partitioning",
    subtitle: "Plan for peaks and bottlenecks instead of averages",
    description:
      "Calculate traffic, storage, and bandwidth budgets, then choose horizontal scaling and partition keys while diagnosing hot keys, skew, and rebalancing bottlenecks.",
    runtime: "TypeScript capacity and partition simulator",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["capacity budget", "horizontal scale", "partition · hot key"],
  },
  {
    number: 7,
    slug: "reliability-observability-and-slos",
    title: "Reliability, Observability, and SLOs",
    subtitle: "Contain and measure failure instead of hiding it",
    description:
      "Apply timeouts, retries, circuit breakers, and degraded modes to a dependency graph, then judge user-visible reliability with metrics, logs, traces, and error budgets.",
    runtime: "TypeScript failure and SLO simulator",
    estimatedMinutes: 75,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["timeout · circuit breaker", "degraded mode", "SLO · error budget"],
  },
  {
    number: 8,
    slug: "design-and-review-a-system",
    title: "Design and Review a System",
    subtitle: "Move from requirements to defensible architecture decisions",
    description:
      "Assemble component, data, communication, scale, and reliability decisions for a real service, then defend them with failure scenarios, cost, and operational evidence.",
    runtime: "TypeScript system architecture studio",
    estimatedMinutes: 95,
    developmentStatus: "planned",
    status: "planned",
    concepts: ["architecture decision", "failure · cost review", "evidence · trade-off"],
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
    id: LINUX_NETWORKING_CURRICULUM_SLUG,
    slug: LINUX_NETWORKING_CURRICULUM_SLUG,
    category: { ko: "네트워크", en: "NETWORKING" },
    title: { ko: "Linux 네트워킹을 바닥부터", en: "Linux Networking from the Ground Up" },
    summary: {
      ko: "interface와 주소에서 시작해 route·socket·TCP·DNS를 연결하고 Linux 서비스 경로를 증거로 진단합니다.",
      en: "Start with interfaces and addresses, connect routes, sockets, TCP, and DNS, then diagnose a Linux service path from evidence.",
    },
    eyebrow: { ko: "새 커리큘럼", en: "NEW CURRICULUM" },
    level: "beginner",
    status: "in-progress",
    accent: "green",
    chapters: {
      ko: scopeChapters(LINUX_NETWORKING_CURRICULUM_SLUG, linuxNetworkingChaptersKo),
      en: scopeChapters(LINUX_NETWORKING_CURRICULUM_SLUG, linuxNetworkingChaptersEn),
    },
  },
  {
    id: INFRASTRUCTURE_CURRICULUM_SLUG,
    slug: INFRASTRUCTURE_CURRICULUM_SLUG,
    category: { ko: "인프라", en: "INFRASTRUCTURE" },
    title: {
      ko: "Linux 네트워크 인프라 설계를 바닥부터",
      en: "Linux Network Infrastructure Design from the Ground Up",
    },
    summary: {
      ko: "Linux network namespace에서 격리·routing·정책·가용성을 직접 조립하고 증거로 설계를 검증합니다.",
      en: "Assemble isolation, routing, policy, and availability in Linux network namespaces, then verify the design with evidence.",
    },
    eyebrow: { ko: "새 커리큘럼", en: "NEW CURRICULUM" },
    level: "intermediate",
    status: "in-progress",
    accent: "blue",
    chapters: {
      ko: scopeChapters(INFRASTRUCTURE_CURRICULUM_SLUG, infrastructureChaptersKo),
      en: scopeChapters(INFRASTRUCTURE_CURRICULUM_SLUG, infrastructureChaptersEn),
    },
    recommendedPrerequisite: {
      curriculumSlug: LINUX_NETWORKING_CURRICULUM_SLUG,
      reason: {
        ko: "interface·주소·route·socket의 기본 packet path를 먼저 익히면 namespace 격리와 연결 경계를 더 쉽게 설계할 수 있습니다.",
        en: "Learn interfaces, addresses, routes, sockets, and the basic packet path first so namespace isolation and connectivity boundaries have a clear foundation.",
      },
    },
  },
  {
    id: SYSTEM_ARCHITECTURE_CURRICULUM_SLUG,
    slug: SYSTEM_ARCHITECTURE_CURRICULUM_SLUG,
    category: { ko: "시스템 설계", en: "SYSTEM DESIGN" },
    title: { ko: "시스템 아키텍처를 바닥부터", en: "System Architecture from the Ground Up" },
    summary: {
      ko: "요구사항에서 시작해 component·data·통신·확장·신뢰성의 경계를 조립하고 trade-off를 증거로 검증합니다.",
      en: "Start from requirements, assemble component, data, communication, scale, and reliability boundaries, and verify trade-offs with evidence.",
    },
    eyebrow: { ko: "준비 중", en: "PLANNED" },
    level: "intermediate",
    status: "planned",
    accent: "orange",
    chapters: {
      ko: scopeChapters(SYSTEM_ARCHITECTURE_CURRICULUM_SLUG, systemArchitectureChaptersKo),
      en: scopeChapters(SYSTEM_ARCHITECTURE_CURRICULUM_SLUG, systemArchitectureChaptersEn),
    },
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

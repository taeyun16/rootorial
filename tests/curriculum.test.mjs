import assert from "node:assert/strict";
import test from "node:test";
import {
  chaptersEn,
  chaptersKo,
  curricula,
  getCurriculum,
  infrastructureChaptersEn,
  infrastructureChaptersKo,
  linuxChaptersEn,
  linuxChaptersKo,
  linuxNetworkingChaptersEn,
  linuxNetworkingChaptersKo,
  systemArchitectureChaptersEn,
  systemArchitectureChaptersKo,
} from "../src/data/curriculum.ts";

test("builds the infrastructure ladder from network namespaces to a platform capstone", () => {
  assert.equal(infrastructureChaptersKo.length, 8);
  assert.deepEqual(
    infrastructureChaptersKo.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
    infrastructureChaptersEn.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
  );
  assert.deepEqual(
    infrastructureChaptersKo.map(({ slug }) => slug),
    [
      "network-namespaces-and-boundaries",
      "veth-bridges-and-routing",
      "egress-nat-and-conntrack",
      "network-policy-and-firewalls",
      "service-discovery-and-load-balancing",
      "availability-and-failure-domains",
      "network-observability-and-capacity",
      "assemble-a-namespace-platform",
    ],
  );
  assert.deepEqual(
    infrastructureChaptersKo.map(({ status, developmentStatus }) => ({ status, developmentStatus })),
    [
      { status: "available", developmentStatus: "complete" },
      { status: "available", developmentStatus: "complete" },
      ...Array.from({ length: 6 }, () => ({ status: "planned", developmentStatus: "planned" })),
    ],
  );
  const koreanVethRouting = infrastructureChaptersKo[1];
  const englishVethRouting = infrastructureChaptersEn[1];
  assert.deepEqual(
    {
      number: koreanVethRouting.number,
      slug: koreanVethRouting.slug,
      title: koreanVethRouting.title,
      subtitle: koreanVethRouting.subtitle,
      runtime: koreanVethRouting.runtime,
      estimatedMinutes: koreanVethRouting.estimatedMinutes,
      status: koreanVethRouting.status,
      developmentStatus: koreanVethRouting.developmentStatus,
      concepts: koreanVethRouting.concepts,
    },
    {
      number: 2,
      slug: "veth-bridges-and-routing",
      title: "veth·bridge·routing으로 토폴로지 조립",
      subtitle: "격리된 network view 사이에 의도한 경로만 연결하기",
      runtime: "TypeScript 토폴로지 모델 · 선택 iproute2",
      estimatedMinutes: 80,
      status: "available",
      developmentStatus: "complete",
      concepts: ["veth pair · bridge", "CIDR · gateway", "forwarding · return path"],
    },
  );
  assert.deepEqual(
    {
      number: englishVethRouting.number,
      slug: englishVethRouting.slug,
      title: englishVethRouting.title,
      subtitle: englishVethRouting.subtitle,
      runtime: englishVethRouting.runtime,
      estimatedMinutes: englishVethRouting.estimatedMinutes,
      status: englishVethRouting.status,
      developmentStatus: englishVethRouting.developmentStatus,
      concepts: englishVethRouting.concepts,
    },
    {
      number: 2,
      slug: "veth-bridges-and-routing",
      title: "Assemble Topologies with veth, Bridges, and Routing",
      subtitle: "Connect only the intended paths between isolated network views",
      runtime: "TypeScript topology model · optional iproute2",
      estimatedMinutes: 80,
      status: "available",
      developmentStatus: "complete",
      concepts: ["veth pair · bridge", "CIDR · gateway", "forwarding · return path"],
    },
  );
  assert.match(koreanVethRouting.description, /겹치지 않는 CIDR.*return path/);
  assert.match(englishVethRouting.description, /non-overlapping CIDRs.*return paths/);
  const curriculum = getCurriculum("infrastructure-design");
  assert.equal(curriculum?.status, "in-progress");
  assert.deepEqual(curriculum?.title, {
    ko: "Linux 네트워크 인프라 설계를 바닥부터",
    en: "Linux Network Infrastructure Design from the Ground Up",
  });
  assert.match(curriculum?.summary.en ?? "", /Linux network namespaces/);
  assert.equal(
    curriculum?.recommendedPrerequisite?.curriculumSlug,
    "linux-networking",
  );
  assert.match(
    curriculum?.recommendedPrerequisite?.reason.ko ?? "",
    /interface.*주소.*route.*socket/,
  );
  assert.match(
    curriculum?.recommendedPrerequisite?.reason.en ?? "",
    /interfaces.*addresses.*routes.*sockets/i,
  );
});

test("defines a bilingual beginner Linux networking prerequisite path", () => {
  assert.equal(linuxNetworkingChaptersKo.length, 6);
  assert.deepEqual(
    linuxNetworkingChaptersKo.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
    linuxNetworkingChaptersEn.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
  );
  assert.deepEqual(
    linuxNetworkingChaptersKo.map(({ slug }) => slug),
    [
      "interfaces-addresses-and-loopback",
      "subnets-neighbors-and-gateways",
      "routes-and-packet-paths",
      "sockets-ports-and-tcp",
      "dns-and-service-reachability",
      "diagnose-a-linux-network",
    ],
  );
  assert.ok(
    linuxNetworkingChaptersKo.every(
      ({ status, developmentStatus }) =>
        status === "planned" && developmentStatus === "planned",
    ),
  );
  assert.ok(
    linuxNetworkingChaptersEn.every(
      ({ title, description }) => title.length > 0 && description.length > 0,
    ),
  );

  const curriculum = getCurriculum("linux-networking");
  assert.equal(curriculum?.level, "beginner");
  assert.equal(curriculum?.status, "in-progress");
  assert.deepEqual(curriculum?.title, {
    ko: "Linux 네트워킹을 바닥부터",
    en: "Linux Networking from the Ground Up",
  });
  assert.equal(
    curriculum?.chapters.ko[0].id,
    "linux-networking/interfaces-addresses-and-loopback",
  );
  assert.equal(
    curriculum?.chapters.en[5].id,
    "linux-networking/diagnose-a-linux-network",
  );
});

test("replaces the design-pattern placeholder with a bilingual system architecture roadmap", () => {
  assert.equal(systemArchitectureChaptersKo.length, 8);
  assert.deepEqual(
    systemArchitectureChaptersKo.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
    systemArchitectureChaptersEn.map(
      ({ number, slug, status, developmentStatus }) => ({
        number,
        slug,
        status,
        developmentStatus,
      }),
    ),
  );
  assert.deepEqual(
    systemArchitectureChaptersKo.map(({ slug }) => slug),
    [
      "requirements-and-quality-attributes",
      "components-and-request-flows",
      "data-ownership-and-source-of-truth",
      "sync-async-and-idempotency",
      "caching-and-consistency",
      "capacity-scaling-and-partitioning",
      "reliability-observability-and-slos",
      "design-and-review-a-system",
    ],
  );
  assert.ok(
    systemArchitectureChaptersKo.every(
      ({ status, developmentStatus }) =>
        status === "planned" && developmentStatus === "planned",
    ),
  );
  assert.ok(
    systemArchitectureChaptersEn.every(
      ({ title, description }) => title.length > 0 && description.length > 0,
    ),
  );

  const curriculum = getCurriculum("system-architecture");
  assert.equal(curriculum?.status, "planned");
  assert.deepEqual(curriculum?.title, {
    ko: "시스템 아키텍처를 바닥부터",
    en: "System Architecture from the Ground Up",
  });
  assert.equal(getCurriculum("design-patterns"), undefined);
  assert.equal(
    curricula.some(({ slug }) => slug === "design-patterns"),
    false,
  );
});

test("keeps the bilingual Transformer roadmap structurally aligned", () => {
  assert.equal(chaptersKo.length, 10);
  assert.deepEqual(
    chaptersKo.map(({ number, slug, status }) => ({ number, slug, status })),
    chaptersEn.map(({ number, slug, status }) => ({ number, slug, status })),
  );
  assert.deepEqual(
    chaptersKo.slice(0, 10).map(
      ({ slug, status, developmentStatus, estimatedMinutes }) => ({
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    ),
    [
      {
        slug: "vectors",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 60,
      },
      {
        slug: "optimization",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 55,
      },
      {
        slug: "neural-networks",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 60,
      },
      {
        slug: "training",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "embeddings",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "sequences",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "attention",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "self-attention",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 75,
      },
      {
        slug: "transformer-block",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 80,
      },
      {
        slug: "mini-transformer",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 90,
      },
    ],
  );
  assert.deepEqual(
    {
      subtitle: chaptersKo[9].subtitle,
      runtime: chaptersKo[9].runtime,
      description: chaptersKo[9].description,
      concepts: chaptersKo[9].concepts,
    },
    {
      subtitle: "배운 조각을 하나의 작동하는 모델로",
      runtime: "TypeScript Mini Transformer 모델",
      description:
        "결정적 tokenizer→embedding+position→pre-LayerNorm decoder block→final norm→vocabulary logits를 연결하고, shifted target loss·한 번의 LM-head update와 EOS/max-length autoregressive decoding을 실행·디버깅합니다.",
      concepts: ["shifted target · causal prefix", "final norm · vocabulary logits", "loss · autoregressive decode"],
    },
  );
  assert.deepEqual(
    {
      subtitle: chaptersEn[9].subtitle,
      runtime: chaptersEn[9].runtime,
      description: chaptersEn[9].description,
      concepts: chaptersEn[9].concepts,
    },
    {
      subtitle: "Combining the pieces into a working model",
      runtime: "TypeScript Mini Transformer model",
      description:
        "Connect a deterministic tokenizer, embedding plus position, one pre-LayerNorm decoder block, final normalization, and vocabulary logits, then execute and debug shifted-target loss, one LM-head update, and EOS/max-length autoregressive decoding.",
      concepts: ["shifted targets · causal prefixes", "final norm · vocabulary logits", "loss · autoregressive decoding"],
    },
  );
  assert.deepEqual(
    {
      subtitle: chaptersKo[8].subtitle,
      runtime: chaptersKo[8].runtime,
      description: chaptersKo[8].description,
      concepts: chaptersKo[8].concepts,
    },
    {
      subtitle: "Attention만으로는 충분하지 않다",
      runtime: "TypeScript Transformer 블록 모델",
      description:
        "결정적 absolute 위치 신호를 첫 블록 입력에 한 번 더하고, pre-LayerNorm causal Self-Attention과 position-wise FFN을 residual 경로로 감싸 [T,d_model]을 보존하는 decoder-only block을 실행·디버깅합니다.",
      concepts: ["position · block input", "pre-LayerNorm · residual", "position-wise FFN · handoff"],
    },
  );
  assert.deepEqual(
    {
      subtitle: chaptersEn[8].subtitle,
      runtime: chaptersEn[8].runtime,
      description: chaptersEn[8].description,
      concepts: chaptersEn[8].concepts,
    },
    {
      subtitle: "Why attention alone is not enough",
      runtime: "TypeScript Transformer block model",
      description:
        "Add a deterministic absolute positional signal once before the first block, then execute and debug a decoder-only pre-LayerNorm block whose causal self-attention and position-wise FFN preserve [T,d_model] through residual paths.",
      concepts: ["position · block input", "pre-LayerNorm · residual", "position-wise FFN · handoff"],
    },
  );
  assert.deepEqual(
    {
      subtitle: chaptersKo[7].subtitle,
      runtime: chaptersKo[7].runtime,
      description: chaptersKo[7].description,
      concepts: chaptersKo[7].concepts,
    },
    {
      subtitle: "같은 시퀀스의 토큰들이 서로를 읽는 법",
      runtime: "TypeScript Self-Attention 모델",
      description:
        "같은 입력에서 Q·K·V를 따로 투영해 모든 token row의 scaled dot-product를 계산하고, causal mask와 multi-head 분할·병합 계약을 실행하며 정보 누출과 shape 결함을 디버깅합니다.",
      concepts: ["Q/K/V 투영 · token row", "scaled score · causal mask", "multi-head split · concat"],
    },
  );
  assert.deepEqual(
    {
      subtitle: chaptersEn[7].subtitle,
      runtime: chaptersEn[7].runtime,
      description: chaptersEn[7].description,
      concepts: chaptersEn[7].concepts,
    },
    {
      subtitle: "Letting every token read the same sequence",
      runtime: "TypeScript self-attention model",
      description:
        "Project Q, K, and V separately from the same input, compute scaled dot products for every token row, then execute causal-masking and multi-head split/merge contracts while debugging information leaks and shape defects.",
      concepts: ["Q/K/V projections · token rows", "scaled scores · causal mask", "multi-head split · concatenate"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersKo[6].runtime,
      description: chaptersKo[6].description,
      concepts: chaptersKo[6].concepts,
    },
    {
      runtime: "TypeScript Attention 모델",
      description:
        "단일 query와 분리된 Key·Value로 점수를 계산하고, key축 Softmax와 value 가중합 문맥을 실행하며 잘못된 Attention 계약을 디버깅합니다.",
      concepts: ["Query · Key 역할", "key축 Softmax", "Value · context"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersEn[6].runtime,
      description: chaptersEn[6].description,
      concepts: chaptersEn[6].concepts,
    },
    {
      runtime: "TypeScript attention model",
      description:
        "Compute scores from a single query and separate keys and values, then run key-axis softmax and a weighted-value context while debugging broken Attention contracts.",
      concepts: ["Query · Key roles", "key-axis Softmax", "Value · context"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersKo[5].runtime,
      description: chaptersKo[5].description,
      concepts: chaptersKo[5].concepts,
    },
    {
      runtime: "TypeScript 시퀀스 모델",
      description:
        "결정적 RNN unroll에서 hidden state와 공유 recurrence를 조작하고, 시간축 gradient와 LSTM cell update를 계산해 causal prefix를 디버깅합니다.",
      concepts: ["hidden state · recurrence", "temporal gradient", "LSTM · causal prefix"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersEn[5].runtime,
      description: chaptersEn[5].description,
      concepts: chaptersEn[5].concepts,
    },
    {
      runtime: "TypeScript sequence model",
      description:
        "Manipulate hidden state and shared recurrence in a deterministic RNN unroll, then compute temporal gradients and LSTM cell updates to debug causal prefixes.",
      concepts: ["hidden state · recurrence", "temporal gradient", "LSTM · causal prefix"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersKo[4].runtime,
      description: chaptersKo[4].description,
      concepts: chaptersKo[4].concepts,
    },
    {
      runtime: "TypeScript 임베딩 모델",
      description:
        "결정적 subword 토큰화에서 embedding lookup·반복 row gradient·cosine·masked mean까지 직접 계산하고 디버깅합니다.",
      concepts: ["token ID · lookup", "row gradient · cosine", "masked mean"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersEn[4].runtime,
      description: chaptersEn[4].description,
      concepts: chaptersEn[4].concepts,
    },
    {
      runtime: "TypeScript embedding model",
      description:
        "Compute and debug deterministic subword tokenization, embedding lookup, repeated-row gradients, cosine similarity, and masked mean pooling.",
      concepts: ["token ID · lookup", "row gradient · cosine", "masked mean"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersKo[3].runtime,
      description: chaptersKo[3].description,
      concepts: chaptersKo[3].concepts,
    },
    {
      runtime: "TypeScript 수학 모델",
      description:
        "3-class logits의 Softmax·Cross Entropy를 mini-batch와 Adam update로 연결하고, validation·Dropout 경계를 실행하며 디버깅합니다.",
      concepts: ["mini-batch · CE", "Adam state", "validation · Dropout"],
    },
  );
  assert.deepEqual(
    {
      runtime: chaptersEn[3].runtime,
      description: chaptersEn[3].description,
      concepts: chaptersEn[3].concepts,
    },
    {
      runtime: "TypeScript math model",
      description:
        "Connect three-class Softmax and cross entropy to mini-batch Adam updates, then run and debug validation and dropout boundaries.",
      concepts: ["mini-batch · CE", "Adam state", "validation · dropout"],
    },
  );
  assert.ok(chaptersKo.slice(10).every(({ status }) => status === "planned"));
});

test("keeps the bilingual Linux roadmap structurally aligned", () => {
  assert.equal(linuxChaptersKo.length, 8);
  assert.deepEqual(
    linuxChaptersKo.map(({ number, slug, status }) => ({ number, slug, status })),
    linuxChaptersEn.map(({ number, slug, status }) => ({ number, slug, status })),
  );
  assert.equal(linuxChaptersKo[0].slug, "shell-and-filesystem");
  assert.equal(linuxChaptersKo[0].status, "available");
  assert.deepEqual(
    linuxChaptersKo.slice(0, 8).map(
      ({ slug, status, developmentStatus, estimatedMinutes }) => ({
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    ),
    [
      {
        slug: "shell-and-filesystem",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 35,
      },
      {
        slug: "boot-to-shell",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 50,
      },
      {
        slug: "processes-and-signals",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 55,
      },
      {
        slug: "users-and-permissions",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 60,
      },
      {
        slug: "memory-and-virtual-addresses",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "storage-and-filesystems",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "networking-from-a-packet",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 65,
      },
      {
        slug: "assemble-a-tiny-linux",
        status: "available",
        developmentStatus: "complete",
        estimatedMinutes: 75,
      },
    ],
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersKo[3].runtime,
      description: linuxChaptersKo[3].description,
      concepts: linuxChaptersKo[3].concepts,
    },
    {
      runtime: "권한 모델",
      description:
        "프로세스 자격 증명과 파일 owner·group·rwx를 비교하고, 경로 탐색·삭제 경계를 진단하며 최소 권한 정책을 조립합니다.",
      concepts: ["UID·GID", "rwx · path search", "least privilege"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersEn[3].runtime,
      description: linuxChaptersEn[3].description,
      concepts: linuxChaptersEn[3].concepts,
    },
    {
      runtime: "Permission model",
      description:
        "Compare process credentials with file owner, group, and rwx bits, diagnose path traversal and deletion boundaries, and assemble a least-privilege policy.",
      concepts: ["UID·GID", "rwx · path search", "least privilege"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersKo[4].runtime,
      description: linuxChaptersKo[4].description,
      concepts: linuxChaptersKo[4].concepts,
    },
    {
      runtime: "주소 변환 모델 · 선택 Linux 관찰",
      description:
        "프로세스별 VA를 VPN·offset과 PTE·frame으로 번역하고, TLB miss·page fault·COW와 /proc maps의 경계를 직접 실행하고 진단합니다.",
      concepts: ["virtual page · PTE", "TLB · page fault", "mmap · COW"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersEn[4].runtime,
      description: linuxChaptersEn[4].description,
      concepts: linuxChaptersEn[4].concepts,
    },
    {
      runtime: "Address translation model · optional Linux observation",
      description:
        "Translate per-process VAs through VPNs, offsets, PTEs, and frames, then run and diagnose TLB misses, page faults, COW, and /proc maps boundaries.",
      concepts: ["virtual page · PTE", "TLB · page fault", "mmap · COW"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersKo[5].runtime,
      description: linuxChaptersKo[5].description,
      concepts: linuxChaptersKo[5].concepts,
    },
    {
      runtime: "파일시스템 모델 · 선택 Linux 관찰",
      description:
        "경로가 mount와 directory entry를 지나 inode·block에 닿는 과정을 추적하고, hard link 수명·용량 고갈·crash-safe 저장을 직접 실행하고 진단합니다.",
      concepts: ["mount · inode", "hard link · unlink", "fsync · durability"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersEn[5].runtime,
      description: linuxChaptersEn[5].description,
      concepts: linuxChaptersEn[5].concepts,
    },
    {
      runtime: "Filesystem model · optional Linux observation",
      description:
        "Trace a path across mounts and directory entries into inodes and blocks, then run and diagnose hard-link lifetime, capacity exhaustion, and crash-safe storage.",
      concepts: ["mount · inode", "hard link · unlink", "fsync · durability"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersKo[6].runtime,
      description: linuxChaptersKo[6].description,
      concepts: linuxChaptersKo[6].concepts,
    },
    {
      runtime: "네트워크 경로 모델 · 선택 Linux 관찰",
      description:
        "regular-file fd에서 읽은 바이트를 socket fd로 넘기고, longest-prefix route·next hop·TCP 누적 ACK를 따라 원격 프로세스의 recv까지 실행하고 진단합니다.",
      concepts: ["socket fd · endpoint", "CIDR route · next hop", "TCP ACK · recv"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersEn[6].runtime,
      description: linuxChaptersEn[6].description,
      concepts: linuxChaptersEn[6].concepts,
    },
    {
      runtime: "Network path model · optional Linux observation",
      description:
        "Move bytes read from a regular-file fd into a socket fd, then run and diagnose longest-prefix routing, next-hop resolution, cumulative TCP acknowledgements, and delivery to the remote process's recv call.",
      concepts: ["socket fd · endpoint", "CIDR route · next hop", "TCP ACK · recv"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersKo[7].runtime,
      description: linuxChaptersKo[7].description,
      concepts: linuxChaptersKo[7].concepts,
    },
    {
      runtime: "시스템 조립 모델 · 선택 v86",
      description:
        "kernel image와 rootfs artifact를 구분하고 PID 1의 mount·최소 권한 service·network 순서를 조립한 뒤, 경계별 증거로 reportd readiness를 진단합니다.",
      concepts: ["artifact · rootfs", "PID 1 · service", "readiness · evidence"],
    },
  );
  assert.deepEqual(
    {
      runtime: linuxChaptersEn[7].runtime,
      description: linuxChaptersEn[7].description,
      concepts: linuxChaptersEn[7].concepts,
    },
    {
      runtime: "System assembly model · optional v86",
      description:
        "Separate kernel-image and rootfs artifacts, assemble PID 1's mounts, least-privilege service, and network order, then diagnose reportd readiness with evidence at each boundary.",
      concepts: ["artifact · rootfs", "PID 1 · service", "readiness · evidence"],
    },
  );
  assert.ok(linuxChaptersKo.every(({ status }) => status === "available"));
  assert.ok(linuxChaptersKo.every(({ developmentStatus }) => developmentStatus === "complete"));
});

test("publishes Linux as an in-progress curriculum with a retained experiment", () => {
  const curriculum = getCurriculum("linux-systems");
  assert.ok(curriculum);
  assert.equal(curriculum.status, "in-progress");
  assert.equal(curriculum.chapters.ko[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.chapters.en[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.experiment?.href, "/experiments/linux");
});

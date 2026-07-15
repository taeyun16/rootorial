import assert from "node:assert/strict";
import test from "node:test";
import {
  chaptersEn,
  chaptersKo,
  getCurriculum,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../src/data/curriculum.ts";

test("keeps the bilingual Transformer roadmap structurally aligned", () => {
  assert.equal(chaptersKo.length, 10);
  assert.deepEqual(
    chaptersKo.map(({ number, slug, status }) => ({ number, slug, status })),
    chaptersEn.map(({ number, slug, status }) => ({ number, slug, status })),
  );
  assert.deepEqual(
    chaptersKo.slice(0, 7).map(
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
    ],
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
  assert.ok(chaptersKo.slice(7).every(({ status }) => status === "planned"));
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
    linuxChaptersKo.slice(0, 7).map(
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
  assert.ok(linuxChaptersKo.slice(7).every(({ status }) => status === "planned"));
});

test("publishes Linux as an in-progress curriculum with a retained experiment", () => {
  const curriculum = getCurriculum("linux-systems");
  assert.ok(curriculum);
  assert.equal(curriculum.status, "in-progress");
  assert.equal(curriculum.chapters.ko[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.chapters.en[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.experiment?.href, "/experiments/linux");
});

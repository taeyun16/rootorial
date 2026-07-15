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
    chaptersKo.slice(0, 4).map(
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
    ],
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
  assert.ok(chaptersKo.slice(4).every(({ status }) => status === "planned"));
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
    linuxChaptersKo.slice(0, 5).map(
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
  assert.ok(linuxChaptersKo.slice(5).every(({ status }) => status === "planned"));
});

test("publishes Linux as an in-progress curriculum with a retained experiment", () => {
  const curriculum = getCurriculum("linux-systems");
  assert.ok(curriculum);
  assert.equal(curriculum.status, "in-progress");
  assert.equal(curriculum.chapters.ko[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.chapters.en[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.experiment?.href, "/experiments/linux");
});

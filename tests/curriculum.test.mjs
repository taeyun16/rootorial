import assert from "node:assert/strict";
import test from "node:test";
import {
  getCurriculum,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../src/data/curriculum.ts";

test("keeps the bilingual Linux roadmap structurally aligned", () => {
  assert.equal(linuxChaptersKo.length, 8);
  assert.deepEqual(
    linuxChaptersKo.map(({ number, slug, status }) => ({ number, slug, status })),
    linuxChaptersEn.map(({ number, slug, status }) => ({ number, slug, status })),
  );
  assert.equal(linuxChaptersKo[0].slug, "shell-and-filesystem");
  assert.equal(linuxChaptersKo[0].status, "available");
  assert.deepEqual(
    linuxChaptersKo.slice(0, 2).map(
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
    ],
  );
  assert.ok(linuxChaptersKo.slice(2).every(({ status }) => status === "planned"));
});

test("publishes Linux as an in-progress curriculum with a retained experiment", () => {
  const curriculum = getCurriculum("linux-systems");
  assert.ok(curriculum);
  assert.equal(curriculum.status, "in-progress");
  assert.equal(curriculum.chapters.ko[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.chapters.en[0].id, "linux-systems/shell-and-filesystem");
  assert.equal(curriculum.experiment?.href, "/experiments/linux");
});

import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterRegistry,
  conceptQuestionRegistry,
  getChapterRegistration,
  getConceptQuestion,
  getConceptQuestionCatalogEntry,
  getConceptQuestionVersionEntry,
  getPublishedChapter,
  registeredChapterIds,
} from "../src/features/chapters/chapter-registry.ts";
import {
  curricula,
  getCurriculum,
} from "../src/data/curriculum.ts";
import {
  chapterPageMetadata,
  pageMetadataForPath,
} from "../src/features/localization/page-metadata.ts";

test("keeps localized catalog chapter identities aligned", () => {
  for (const curriculum of curricula) {
    const korean = curriculum.chapters.ko.map(
      ({ id, number, slug, status, developmentStatus, estimatedMinutes }) => ({
        id,
        number,
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    );
    const english = curriculum.chapters.en.map(
      ({ id, number, slug, status, developmentStatus, estimatedMinutes }) => ({
        id,
        number,
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    );
    assert.deepEqual(english, korean);
  }
});

test("requires every available catalog chapter to have a runtime registration", () => {
  const availableIds = curricula.flatMap((curriculum) =>
    curriculum.chapters.ko
      .filter((chapter) => chapter.status === "available")
      .map((chapter) => chapter.id),
  );
  for (const availableId of availableIds) {
    assert.ok(
      registeredChapterIds.includes(availableId),
      `missing runtime registration for ${availableId}`,
    );
  }

  for (const registeredId of registeredChapterIds) {
    const [curriculumSlug, chapterSlug] = registeredId.split("/");
    const curriculum = getCurriculum(curriculumSlug);
    assert.ok(curriculum?.chapters.ko.some((chapter) => chapter.slug === chapterSlug));
    assert.ok(curriculum?.chapters.en.some((chapter) => chapter.slug === chapterSlug));
    assert.equal(
      getChapterRegistration(curriculumSlug, chapterSlug),
      chapterRegistry[registeredId],
    );
  }
});

test("publishes only available chapters that also have a renderer contract", () => {
  assert.equal(
    getPublishedChapter("transformer-from-zero", "vectors", "en")?.chapter.title,
    "Vectors and Tensors",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "boot-to-shell", "en")?.chapter.title,
    "From Power-On to a Shell",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "processes-and-signals", "en")?.chapter.title,
    "Processes and Signals",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "optimization", "en")?.chapter.title,
    "Learning and Optimization",
  );
  assert.equal(getPublishedChapter("transformer-from-zero", "missing"), undefined);
});

test("separates active question submissions from historical labels", () => {
  assert.equal(
    getConceptQuestion("transformer-from-zero", "vectors", "orientation")?.status,
    "active",
  );
  assert.equal(
    getConceptQuestion("transformer-from-zero", "vectors", "attention-context"),
    undefined,
  );
  assert.equal(
    getConceptQuestionCatalogEntry(
      "transformer-from-zero",
      "vectors",
      "attention-context",
    )?.status,
    "retired",
  );
  assert.equal(
    conceptQuestionRegistry["transformer-from-zero/vectors/attention-context"].label,
    "Attention 컨텍스트 shape",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "vectors",
      "orientation",
      1,
    )?.correctAnswer,
    "row-column",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "vectors",
      "orientation",
      2,
    ),
    undefined,
  );
  assert.equal(
    getConceptQuestion("linux-systems", "boot-to-shell", "pid-one")?.correctAnswer,
    "init",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "boot-to-shell",
      "firmware-handoff",
      1,
    )?.correctAnswer,
    "kernel-image",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "boot-to-shell",
      "firmware-handoff",
      2,
    ),
    undefined,
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "optimization",
      "gradient-direction",
    )?.correctAnswer,
    "subtract-gradient",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "optimization",
      "learning-rate",
      1,
    )?.correctAnswer,
    "overshoot-diverge",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "optimization",
      "learning-rate",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/processes-and-signals"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "program-vs-process": "same-program-distinct-processes",
      "fork-exec-pid": "exec-replaces-image-keeps-pid",
      "stdio-redirection": "redirects-stdout-only",
      "signal-choice": "term-before-kill",
      "wait-reaps-child": "zombie-until-wait",
    },
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "processes-and-signals",
      "signal-choice",
      1,
    )?.correctAnswer,
    "term-before-kill",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "processes-and-signals",
      "signal-choice",
      2,
    ),
    undefined,
  );
});

test("derives localized metadata from the catalog without route-specific copies", () => {
  const englishChapter = getCurriculum("transformer-from-zero")
    ?.chapters.en.find((chapter) => chapter.slug === "vectors");
  assert.ok(englishChapter);
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "vectors", "en"),
    {
      title: `${String(englishChapter.number).padStart(2, "0")}. ${englishChapter.title} · Rootorial`,
      description: englishChapter.description,
    },
  );
  assert.equal(pageMetadataForPath("/admin", "en"), undefined);
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/optimization",
      "ko",
    ),
    {
      title: "02. 학습과 최적화 · Rootorial",
      description:
        "선형 모델의 MSE와 gradient를 계산하고, 발산하는 학습률을 직접 복구하며 한 번의 파라미터 업데이트를 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "boot-to-shell", "en"),
    {
      title: "02. From Power-On to a Shell · Rootorial",
      description:
        "Repair failed boundaries in a deterministic boot model, compare them with an optional v86 run, and trace firmware through the kernel, init, and the serial console shell.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "processes-and-signals", "en"),
    {
      title: "03. Processes and Signals · Rootorial",
      description:
        "Manipulate and diagnose fork, exec, PID and PPID, standard streams, signals, and wait transitions in a deterministic process model.",
    },
  );
});

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
    const korean = curriculum.chapters.ko.map(({ id, number, slug, status }) => ({
      id,
      number,
      slug,
      status,
    }));
    const english = curriculum.chapters.en.map(({ id, number, slug, status }) => ({
      id,
      number,
      slug,
      status,
    }));
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
  assert.equal(getPublishedChapter("transformer-from-zero", "optimization"), undefined);
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
  assert.equal(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/optimization",
      "ko",
    ),
    undefined,
  );
});

import {
  chapterId,
  curricula,
  curriculumChapterIds,
  TRANSFORMER_CURRICULUM_SLUG,
} from "../../data/curriculum.ts";

export const anonymousProgressKey = "rootorial-progress";

const accountProgressKeyPrefix = "rootorial-progress:account:";
const chapterOrder = new Map(
  curriculumChapterIds.map((id, index) => [id, index]),
);
const knownChapterSlugs = new Set(chapterOrder.keys());
const legacyChapterIds = new Map<string, string>();

for (const curriculum of curricula) {
  for (const chapter of curriculum.chapters.ko) {
    const existing = legacyChapterIds.get(chapter.slug);
    legacyChapterIds.set(chapter.slug, existing && existing !== chapter.id ? "" : chapter.id);
  }
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function sortByCurriculumOrder(slugs: Iterable<string>) {
  return [...slugs].sort(
    (left, right) =>
      (chapterOrder.get(left) ?? Number.MAX_SAFE_INTEGER) -
      (chapterOrder.get(right) ?? Number.MAX_SAFE_INTEGER),
  );
}

export function normalizeCompletedSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];

  const completed = new Set<string>();
  for (const slug of value) {
    if (typeof slug !== "string") continue;
    if (knownChapterSlugs.has(slug)) {
      completed.add(slug);
      continue;
    }

    // v1 stored global chapter slugs. Accept only unambiguous legacy values.
    const migrated = legacyChapterIds.get(slug);
    if (migrated) {
      completed.add(migrated);
    }
  }

  return sortByCurriculumOrder(completed);
}

export function validateCompletedSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("완료한 챕터 목록이 필요합니다.");
  }

  if (value.length > curriculumChapterIds.length) {
    throw new Error("완료한 챕터 목록이 너무 깁니다.");
  }

  for (const slug of value) {
    if (
      typeof slug !== "string" ||
      (!knownChapterSlugs.has(slug) && !legacyChapterIds.get(slug))
    ) {
      throw new Error("알 수 없는 챕터가 포함되어 있습니다.");
    }
  }

  return normalizeCompletedSlugs(value);
}

export function mergeCompletedSlugs(...groups: readonly string[][]): string[] {
  return normalizeCompletedSlugs(groups.flat());
}

export function parseStoredProgress(rawValue: string | null): string[] {
  if (!rawValue) return [];

  try {
    return normalizeCompletedSlugs(JSON.parse(rawValue));
  } catch {
    return [];
  }
}

export function accountProgressKey(userId: string) {
  return `${accountProgressKeyPrefix}${encodeURIComponent(userId)}`;
}

export function readCompletedFromMetadata(metadata: unknown): string[] {
  if (!isRecord(metadata)) return [];

  const rootorial = metadata.rootorial;
  if (!isRecord(rootorial)) return [];

  const ids: string[] = [];
  const curriculumProgress = rootorial.curricula;
  if (isRecord(curriculumProgress)) {
    for (const [curriculumSlug, value] of Object.entries(curriculumProgress)) {
      if (!isRecord(value) || !isRecord(value.completedChapters)) continue;
      for (const [slug, completed] of Object.entries(value.completedChapters)) {
        if (completed === true) ids.push(chapterId(curriculumSlug, slug));
      }
    }
  }

  // v1 metadata stored every chapter in a single global map.
  const legacyCompleted = rootorial.completedChapters;
  if (isRecord(legacyCompleted)) {
    ids.push(
      ...Object.entries(legacyCompleted)
        .filter(([, completed]) => completed === true)
        .map(([slug]) => slug),
    );
  }

  return normalizeCompletedSlugs(ids);
}

export function readProgressVersion(metadata: unknown) {
  if (!isRecord(metadata) || !isRecord(metadata.rootorial)) return 0;
  return metadata.rootorial.progressVersion === 2 ? 2 : 1;
}

export function buildProgressMetadata(completedSlugs: readonly string[]) {
  const curriculaProgress: Record<string, { completedChapters: Record<string, true> }> = {};
  for (const id of validateCompletedSlugs([...completedSlugs])) {
    const separator = id.indexOf("/");
    const curriculumSlug = id.slice(0, separator);
    const chapterSlug = id.slice(separator + 1);
    curriculaProgress[curriculumSlug] ??= { completedChapters: {} };
    curriculaProgress[curriculumSlug].completedChapters[chapterSlug] = true;
  }

  return {
    rootorial: {
      progressVersion: 2,
      curricula: curriculaProgress,
    },
  };
}

export const legacyTransformerChapterId = (slug: string) =>
  chapterId(TRANSFORMER_CURRICULUM_SLUG, slug);

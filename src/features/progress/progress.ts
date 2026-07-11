import { chapters } from "../../data/curriculum.ts";

export const anonymousProgressKey = "rezero-progress";

const accountProgressKeyPrefix = "rezero-progress:account:";
const chapterOrder = new Map(
  chapters.map((chapter, index) => [chapter.slug, index]),
);
const knownChapterSlugs = new Set(chapterOrder.keys());

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
    if (typeof slug === "string" && knownChapterSlugs.has(slug)) {
      completed.add(slug);
    }
  }

  return sortByCurriculumOrder(completed);
}

export function validateCompletedSlugs(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new Error("완료한 챕터 목록이 필요합니다.");
  }

  if (value.length > chapters.length) {
    throw new Error("완료한 챕터 목록이 너무 깁니다.");
  }

  for (const slug of value) {
    if (typeof slug !== "string" || !knownChapterSlugs.has(slug)) {
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

  const rezero = metadata.rezero;
  if (!isRecord(rezero)) return [];

  const completedChapters = rezero.completedChapters;
  if (!isRecord(completedChapters)) return [];

  return normalizeCompletedSlugs(
    Object.entries(completedChapters)
      .filter(([, completed]) => completed === true)
      .map(([slug]) => slug),
  );
}

export function buildProgressMetadata(completedSlugs: readonly string[]) {
  const completedChapters = Object.fromEntries(
    validateCompletedSlugs([...completedSlugs]).map((slug) => [slug, true]),
  );

  return {
    rezero: {
      completedChapters,
    },
  };
}

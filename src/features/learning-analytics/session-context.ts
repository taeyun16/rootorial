export type LearningSessionContext = {
  curriculumSlug: string;
  chapterSlug: string;
};

export function learningSessionContextMatches(
  current: LearningSessionContext,
  expected: LearningSessionContext,
) {
  return current.curriculumSlug === expected.curriculumSlug
    && current.chapterSlug === expected.chapterSlug;
}

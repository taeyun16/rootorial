export const practiceLevels = [
  "single-boundary",
  "multi-boundary",
  "transfer",
] as const;

export type PracticeLevel = (typeof practiceLevels)[number];

export type PracticeChallengeDefinition<Id extends string = string> = Readonly<{
  id: Id;
  level: PracticeLevel;
  skillId: string;
  label: string;
  title: string;
  summary: string;
}>;

export type PracticeCheck = Readonly<{
  id: string;
  label: string;
  passed: boolean;
  expected: string;
  actual: string;
  explanation: string;
}>;

export type PracticeAttempt<Id extends string = string> = Readonly<{
  challengeId: Id;
  passed: boolean;
  checks: readonly PracticeCheck[];
}>;

export type PracticeMastery<Id extends string = string> = Readonly<{
  completedIds: readonly Id[];
  completedLevels: readonly PracticeLevel[];
  mastered: boolean;
}>;

export function orderPracticeChecksForReview(
  checks: readonly PracticeCheck[],
): readonly PracticeCheck[] {
  const firstFailedIndex = checks.findIndex(({ passed }) => !passed);
  if (firstFailedIndex <= 0) return checks;
  return [
    checks[firstFailedIndex],
    ...checks.slice(0, firstFailedIndex),
    ...checks.slice(firstFailedIndex + 1),
  ];
}

export function evaluatePracticeMastery<Id extends string>(
  challenges: readonly PracticeChallengeDefinition<Id>[],
  attempts: Readonly<Partial<Record<Id, PracticeAttempt<Id>>>>,
): PracticeMastery<Id> {
  const completedIds = challenges
    .filter(({ id }) => attempts[id]?.passed)
    .map(({ id }) => id);
  const completedLevels = practiceLevels.filter((level) =>
    challenges.some(({ id, level: challengeLevel }) =>
      challengeLevel === level && attempts[id]?.passed
    )
  );
  return {
    completedIds,
    completedLevels,
    mastered: completedIds.length === challenges.length,
  };
}

export function findNextIncompleteChallenge<Id extends string>(
  challenges: readonly PracticeChallengeDefinition<Id>[],
  attempts: Readonly<Partial<Record<Id, PracticeAttempt<Id>>>>,
  activeId: Id,
): PracticeChallengeDefinition<Id> | undefined {
  if (!attempts[activeId]?.passed) return undefined;
  const activeIndex = challenges.findIndex(({ id }) => id === activeId);
  if (activeIndex < 0) return undefined;
  const remainingChallenges = [
    ...challenges.slice(activeIndex + 1),
    ...challenges.slice(0, activeIndex),
  ];
  return remainingChallenges.find(({ id }) => !attempts[id]?.passed);
}

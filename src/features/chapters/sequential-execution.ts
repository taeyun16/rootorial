export function canExecuteSequentialPhase({
  phaseIndex,
  visitedCount,
  predictionCorrect,
}: {
  phaseIndex: number;
  visitedCount: number;
  predictionCorrect: boolean;
}) {
  return predictionCorrect
    && phaseIndex >= 0
    && phaseIndex <= visitedCount;
}

export function hasMasteredSequentialEvidence({
  predictionCorrect,
  visitedCount,
  phaseCount,
}: {
  predictionCorrect: boolean;
  visitedCount: number;
  phaseCount: number;
}) {
  return predictionCorrect && phaseCount > 0 && visitedCount >= phaseCount;
}

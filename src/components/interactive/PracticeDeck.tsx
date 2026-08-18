import { useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  findNextIncompleteChallenge,
  orderPracticeChecksForReview,
} from "../../features/practice/practice";
import type {
  PracticeAttempt,
  PracticeCheck,
  PracticeChallengeDefinition,
  PracticeLevel,
  PracticeMastery,
} from "../../features/practice/practice";

export type PracticeResultLabels = Readonly<{
  idle: string;
  passed: string;
  failed: string;
  expected: string;
  actual: string;
  firstFailed: string;
}>;

function activateFromKeyboard(
  event: KeyboardEvent<HTMLButtonElement>,
  activate: () => void,
) {
  if (event.key !== "Enter" && event.key !== " ") return;
  event.preventDefault();
  activate();
}

export function PracticeResultChecks<Id extends string>({
  attempt,
  labels,
}: {
  attempt: PracticeAttempt<Id> | undefined;
  labels: PracticeResultLabels;
}) {
  if (!attempt) {
    return <div className="practice-result is-idle" role="status">{labels.idle}</div>;
  }
  const checks = orderPracticeChecksForReview(attempt.checks);
  const firstFailedId = attempt.checks.find(({ passed }) => !passed)?.id;
  return (
    <div
      className={`practice-result${attempt.passed ? " is-passed" : " is-failed"}`}
      role="status"
      aria-live="polite"
    >
      <strong>{attempt.passed ? labels.passed : labels.failed}</strong>
      <div className="practice-check-list">
        {checks.map((check: PracticeCheck) => {
          const isFirstFailed = check.id === firstFailedId;
          return (
            <article
              className={check.passed ? "is-passed" : "is-failed"}
              data-first-failed={isFirstFailed ? "true" : undefined}
              key={check.id}
            >
              {isFirstFailed ? (
                <em className="practice-first-failure">{labels.firstFailed}</em>
              ) : null}
              <span>{check.passed ? "✓" : "×"} {check.label}</span>
              <dl>
                <div><dt>{labels.expected}</dt><dd>{check.expected}</dd></div>
                <div><dt>{labels.actual}</dt><dd>{check.actual}</dd></div>
              </dl>
              <p>{check.explanation}</p>
            </article>
          );
        })}
      </div>
    </div>
  );
}

type PracticeDeckCopy = Readonly<{
  kicker: string;
  title: string;
  description: string;
  challengeNavigation: string;
  levelLabels: Record<PracticeLevel, string>;
  evidenceTitle: string;
  evidenceDescription: string;
  complete: string;
  incomplete: string;
  nextIncomplete: string;
  resetAll: string;
}>;

type PracticeDeckProps<Id extends string> = {
  challenges: readonly PracticeChallengeDefinition<Id>[];
  activeId: Id;
  attempts: Readonly<Partial<Record<Id, PracticeAttempt<Id>>>>;
  mastery: PracticeMastery<Id>;
  copy: PracticeDeckCopy;
  onSelect: (id: Id) => void;
  onResetAll: () => void;
  children: ReactNode;
  className?: string;
};

export function PracticeDeck<Id extends string>({
  challenges,
  activeId,
  attempts,
  mastery,
  copy,
  onSelect,
  onResetAll,
  children,
  className,
}: PracticeDeckProps<Id>) {
  const titleId = useId();
  const stageRef = useRef<HTMLDivElement>(null);
  const activeChallenge = challenges.find(({ id }) => id === activeId)!;
  const nextIncomplete = mastery.mastered
    ? undefined
    : findNextIncompleteChallenge(challenges, attempts, activeId);

  const selectNextIncomplete = () => {
    if (!nextIncomplete) return;
    onSelect(nextIncomplete.id);
    requestAnimationFrame(() => {
      stageRef.current
        ?.querySelector<HTMLElement>(
          ".practice-learner-controls button:not(:disabled)",
        )
        ?.focus();
    });
  };

  return (
    <section
      className={["practice-deck", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
    >
      <header className="practice-deck-header">
        <div>
          <p>{copy.kicker}</p>
          <h3 id={titleId}>{copy.title}</h3>
          <span>{copy.description}</span>
        </div>
        <strong aria-label={`${mastery.completedIds.length} / ${challenges.length}`}>
          {mastery.completedIds.length} / {challenges.length}
        </strong>
      </header>

      <div
        className="practice-deck-navigation"
        role="group"
        aria-label={copy.challengeNavigation}
      >
        {challenges.map((challenge, index) => {
          const complete = attempts[challenge.id]?.passed ?? false;
          return (
            <button
              key={challenge.id}
              type="button"
              aria-pressed={challenge.id === activeId}
              data-practice-complete={complete ? "true" : "false"}
              onClick={() => onSelect(challenge.id)}
              onKeyDown={(event) => activateFromKeyboard(
                event,
                () => onSelect(challenge.id),
              )}
            >
              <span>{String(index + 1).padStart(2, "0")} · {copy.levelLabels[challenge.level]}</span>
              <strong>{complete ? "✓ " : ""}{challenge.label}</strong>
            </button>
          );
        })}
      </div>

      <div className="practice-deck-stage" ref={stageRef}>
        <header>
          <span>{copy.levelLabels[activeChallenge.level]} · {activeChallenge.skillId}</span>
          <h4>{activeChallenge.title}</h4>
          <p>{activeChallenge.summary}</p>
        </header>
        {children}
      </div>

      <footer className="practice-deck-evidence">
        <div>
          <strong>{copy.evidenceTitle}</strong>
          <span>{copy.evidenceDescription}</span>
        </div>
        <div className="practice-deck-evidence-list" role="status" aria-live="polite">
          {challenges.map((challenge) => {
            const complete = attempts[challenge.id]?.passed ?? false;
            return (
              <span className={complete ? "is-complete" : undefined} key={challenge.id}>
                {complete ? "✓" : "○"} {challenge.label}
              </span>
            );
          })}
        </div>
        <div className="practice-deck-footer-actions">
          {nextIncomplete ? (
            <button
              type="button"
              className="button button-primary"
              onClick={selectNextIncomplete}
              onKeyDown={(event) => activateFromKeyboard(
                event,
                selectNextIncomplete,
              )}
            >
              <span>{copy.nextIncomplete}</span>
              <strong>{nextIncomplete.label}</strong>
            </button>
          ) : null}
          <button type="button" className="button button-secondary" onClick={onResetAll}>
            {copy.resetAll}
          </button>
        </div>
        <p>{mastery.mastered ? copy.complete : copy.incomplete}</p>
      </footer>
    </section>
  );
}

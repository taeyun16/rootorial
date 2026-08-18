import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import {
  evaluatePracticeMastery,
  findNextIncompleteChallenge,
  orderPracticeChecksForReview,
  practiceLevels,
} from "../src/features/practice/practice.ts";

const challenges = [
  {
    id: "reproduce",
    level: "single-boundary",
    skillId: "reproduce",
    label: "Reproduce",
    title: "Reproduce",
    summary: "Reproduce a known rule.",
  },
  {
    id: "diagnose",
    level: "multi-boundary",
    skillId: "diagnose",
    label: "Diagnose",
    title: "Diagnose",
    summary: "Find the first failed contract.",
  },
  {
    id: "transfer",
    level: "transfer",
    skillId: "transfer",
    label: "Transfer",
    title: "Transfer",
    summary: "Apply the rule to a new fixture.",
  },
];

const passedAttempt = (challengeId) => ({
  challengeId,
  passed: true,
  checks: [],
});

test("keeps practice evidence separate by challenge and level", () => {
  const partial = evaluatePracticeMastery(challenges, {
    reproduce: passedAttempt("reproduce"),
    diagnose: {
      challengeId: "diagnose",
      passed: false,
      checks: [],
    },
  });
  assert.deepEqual(partial.completedIds, ["reproduce"]);
  assert.deepEqual(partial.completedLevels, ["single-boundary"]);
  assert.equal(partial.mastered, false);

  const complete = evaluatePracticeMastery(challenges, {
    reproduce: passedAttempt("reproduce"),
    diagnose: passedAttempt("diagnose"),
    transfer: passedAttempt("transfer"),
  });
  assert.deepEqual(complete.completedLevels, practiceLevels);
  assert.equal(complete.mastered, true);
});

test("advances to the next incomplete challenge only after a pass", () => {
  assert.equal(findNextIncompleteChallenge(challenges, {}, "reproduce"), undefined);

  const afterReproduce = {
    reproduce: passedAttempt("reproduce"),
  };
  assert.equal(
    findNextIncompleteChallenge(challenges, afterReproduce, "reproduce")?.id,
    "diagnose",
  );

  const wrapped = {
    reproduce: passedAttempt("reproduce"),
    transfer: passedAttempt("transfer"),
  };
  assert.equal(
    findNextIncompleteChallenge(challenges, wrapped, "transfer")?.id,
    "diagnose",
  );

  const complete = {
    ...wrapped,
    diagnose: passedAttempt("diagnose"),
  };
  assert.equal(
    findNextIncompleteChallenge(challenges, complete, "transfer"),
    undefined,
  );
});

test("promotes the original first failed contract without losing evidence order", () => {
  const checks = [
    { id: "prediction", passed: true },
    { id: "visible-fixture", passed: true },
    { id: "fresh-fixture", passed: false },
    { id: "repair", passed: false },
  ].map((check) => ({
    ...check,
    label: check.id,
    expected: "expected",
    actual: "actual",
    explanation: "explanation",
  }));

  assert.deepEqual(
    orderPracticeChecksForReview(checks).map(({ id }) => id),
    ["fresh-fixture", "prediction", "visible-fixture", "repair"],
  );
  const alreadyFirst = checks.slice(2);
  const allPassed = checks.slice(0, 2);
  assert.strictEqual(
    orderPracticeChecksForReview(alreadyFirst),
    alreadyFirst,
  );
  assert.strictEqual(
    orderPracticeChecksForReview(allPassed),
    allPassed,
  );
});

test("keeps the shared progression contract across all Transformer practice decks", () => {
  const wrappers = [
    "src/components/vectors/VectorsPracticeDeck.tsx",
    "src/components/optimization/OptimizationPracticeDeck.tsx",
    "src/components/neural-networks/NeuralNetworksPracticeDeck.tsx",
    "src/components/training/TrainingPracticeDeck.tsx",
    "src/components/embeddings/EmbeddingsPracticeDeck.tsx",
    "src/components/sequences/SequencesPracticeDeck.tsx",
    "src/components/attention/AttentionPracticeDeck.tsx",
    "src/components/self-attention/SelfAttentionPracticeDeck.tsx",
    "src/components/transformer-block/TransformerBlockPracticeDeck.tsx",
    "src/components/mini-transformer/MiniTransformerPracticeDeck.tsx",
  ];

  for (const wrapper of wrappers) {
    const source = readFileSync(join(process.cwd(), wrapper), "utf8");
    assert.match(
      source,
      /nextIncomplete: t\("다음 미완료 문제", "Next incomplete challenge"\)/,
      wrapper,
    );
    assert.match(
      source,
      /firstFailed: t\("먼저 고칠 계약", "FIX THIS CONTRACT FIRST"\)/,
      wrapper,
    );
    assert.match(
      source,
      /"첫 실패 계약을 확인하고 같은 문제를 다시 실행하세요\.",\s*"Inspect the first failed contract, then run the same challenge again\."/,
      wrapper,
    );
    const explanations = [...source.matchAll(
      /explanation:\s*t\(\s*"([^"]+)",\s*"([^"]+)"/g,
    )];
    assert.equal(explanations.length, 9, `${wrapper} result explanations`);
    for (const [, ko, en] of explanations) {
      assert.ok([...ko].length <= 100, `${wrapper} concise Korean explanation`);
      assert.ok(en.length <= 170, `${wrapper} concise English explanation`);
    }
    assert.equal(
      (source.match(/<PracticeResultChecks/g) ?? []).length,
      3,
      `${wrapper} result surfaces`,
    );
    assert.equal(
      (source.match(/onClick=\{resetCurrent\}/g) ?? []).length,
      3,
      `${wrapper} current reset controls`,
    );
  }
});

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  analyzeCurriculumQuality,
  renderCurriculumQualityMarkdown,
} from "../scripts/report-curriculum-quality.ts";
import { transformerContentQualityContracts } from "../src/features/chapters/content-quality.ts";

test("tracks every Transformer chapter without structural contract drift", () => {
  const report = analyzeCurriculumQuality();

  assert.equal(report.chapters.length, 10);
  assert.deepEqual(
    report.chapters.map(({ number }) => number),
    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
  );
  assert.deepEqual(report.issues, []);
});

test("closes the executable-Python gap across every Transformer chapter", () => {
  const report = analyzeCurriculumQuality();
  const pythonCells = Object.fromEntries(
    report.chapters.map(({ slug, pythonCells: count }) => [slug, count]),
  );

  assert.equal(pythonCells.vectors, 2);
  assert.equal(pythonCells.optimization, 2);
  assert.equal(pythonCells["neural-networks"], 2);
  assert.equal(pythonCells.training, 2);
  assert.equal(pythonCells.embeddings, 2);
  assert.equal(pythonCells.sequences, 2);
  assert.equal(pythonCells.attention, 2);
  assert.equal(pythonCells["self-attention"], 2);
  assert.equal(pythonCells["transformer-block"], 2);
  assert.equal(pythonCells["mini-transformer"], 2);
  assert.equal(
    report.targetGaps.filter((gap) => gap.includes("Python cells")).length,
    0,
  );
});

test("keeps the core learning path visible, supported, and within its interaction budget", () => {
  const report = analyzeCurriculumQuality();

  assert.deepEqual(
    report.chapters.map(({ terminologySupportCount }) => terminologySupportCount),
    [5, 5, 6, 5, 5, 5, 5, 5, 5, 5],
  );
  assert.ok(report.chapters.every(({ visibleClarificationAccess }) => visibleClarificationAccess));
  assert.deepEqual(
    report.chapters.map(({ requiredCheckpointGroups }) => requiredCheckpointGroups),
    [3, 2, 3, 2, 2, 2, 2, 2, 2, 2],
  );
  assert.deepEqual(
    report.chapters.map(({ estimatedMinimumSuccessfulActions }) => estimatedMinimumSuccessfulActions),
    [17, 13, 16, 13, 13, 13, 13, 15, 15, 15],
  );
  assert.deepEqual(
    report.chapters.map(({ maxAllowedInteractionBudget }) => maxAllowedInteractionBudget),
    [18, 16, 18, 16, 16, 16, 16, 16, 16, 16],
  );
  assert.ok(report.chapters.every(({ learningExperienceScore }) => learningExperienceScore === 5));
  assert.ok(
    Object.values(transformerContentQualityContracts).every(({ activities }) =>
      activities.every(({ kind, required, runtime }) =>
        !required || (kind !== "debug" && runtime !== "python"))),
  );
  for (const slug of ["self-attention", "transformer-block", "mini-transformer"]) {
    const requiredChallenges = transformerContentQualityContracts[slug].activities
      .filter(({ required }) => required)
      .reduce((sum, { gradedTasks }) => sum + gradedTasks, 0);
    assert.equal(requiredChallenges, 3);
  }

  const neuralNetworks = report.chapters.find(({ slug }) => slug === "neural-networks");
  assert.deepEqual(
    {
      activities: neuralNetworks?.activities,
      activityKinds: neuralNetworks?.activityKinds,
      gradedTasks: neuralNetworks?.gradedTasks,
      conceptQuestions: neuralNetworks?.conceptQuestions,
      defaultPublication: neuralNetworks?.defaultPublication,
    },
    {
      activities: 6,
      activityKinds: 5,
      gradedTasks: 13,
      conceptQuestions: 5,
      defaultPublication: "draft",
    },
  );
});

test("audits native select density and Python cell size independently from the quality score", () => {
  const report = analyzeCurriculumQuality();
  const chapters = Object.fromEntries(report.chapters.map((chapter) => [chapter.slug, chapter]));

  for (const slug of report.chapters.map((chapter) => chapter.slug)) {
    assert.equal(chapters[slug].nativeSelectDefinitions, 0);
  }
  assert.equal(chapters.training.maxPythonCellLines, 66);
  assert.equal(chapters["self-attention"].maxPythonCellLines, 55);
  assert.equal(report.targetGaps.filter((gap) => gap.includes("native select")).length, 0);
  assert.equal(report.targetGaps.filter((gap) => gap.includes("Python cell")).length, 0);
});

test("keeps Transformer repair code focused and full editors optional by default", () => {
  const notebookCell = readFileSync(new URL("../src/components/NotebookCell.tsx", import.meta.url), "utf8");
  const directChoice = readFileSync(
    new URL("../src/components/interactive/DirectChoice.tsx", import.meta.url),
    "utf8",
  );
  const directChoiceGroup = readFileSync(
    new URL("../src/components/interactive/DirectChoiceGroup.tsx", import.meta.url),
    "utf8",
  );

  assert.match(notebookCell, /defaultExpanded = false/);
  assert.match(notebookCell, /supportCode\?: string/);
  assert.match(notebookCell, /executionCode = supportCode/);
  assert.match(notebookCell, /notebook-cell-support-code/);
  assert.match(notebookCell, /notebook-cell-guided-repair/);
  assert.match(notebookCell, /전체 코드 보기/);
  assert.doesNotMatch(directChoice, /<select/);
  assert.match(directChoice, /<DirectChoiceGroup/);
  assert.doesNotMatch(directChoiceGroup, /<select/);
  assert.match(directChoiceGroup, /data-choice-value/);
  assert.match(directChoiceGroup, /aria-pressed/);
});

test("renders a reviewable Markdown report with score and draft state", () => {
  const markdown = renderCurriculumQualityMarkdown(analyzeCurriculumQuality());

  assert.match(markdown, /벡터와 텐서.*2.*45\/45.*published/);
  assert.match(markdown, /학습과 최적화.*2.*45\/45.*draft/);
  assert.match(markdown, /분류와 신경망.*2.*45\/45.*draft/);
  assert.match(markdown, /딥러닝 학습 구조.*2.*45\/45.*draft/);
  assert.match(markdown, /토큰과 임베딩.*2.*45\/45.*draft/);
  assert.match(markdown, /순서가 있는 데이터.*2.*45\/45.*draft/);
  assert.match(markdown, /Attention.*2.*45\/45.*draft/);
  assert.match(markdown, /Self-Attention.*2.*45\/45.*draft/);
  assert.match(markdown, /Transformer 블록.*2.*45\/45.*draft/);
  assert.match(markdown, /Mini Transformer.*2.*45\/45.*draft/);
  assert.match(markdown, /\| Max code lines \| Native selects \| Questions \| Terms \| Help \| Required groups \| Actions min\/max \| Quality \|/);
  assert.match(markdown, /벡터와 텐서.*\| 5 \| yes \| 3 \| 17\/18 \| 45\/45/);
  assert.match(markdown, /분류와 신경망.*\| 6 \| yes \| 3 \| 16\/18 \| 45\/45/);
  assert.match(markdown, /Mini Transformer.*\| 5 \| yes \| 2 \| 15\/16 \| 45\/45/);
  assert.match(markdown, /Structural contract issues: 0/);
});

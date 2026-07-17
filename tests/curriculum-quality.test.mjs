import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCurriculumQuality,
  renderCurriculumQualityMarkdown,
} from "../scripts/report-curriculum-quality.ts";

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
  assert.match(markdown, /Structural contract issues: 0/);
});

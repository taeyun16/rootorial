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

test("makes the current executable-Python gap explicit", () => {
  const report = analyzeCurriculumQuality();
  const pythonCells = Object.fromEntries(
    report.chapters.map(({ slug, pythonCells: count }) => [slug, count]),
  );

  assert.equal(pythonCells.vectors, 2);
  assert.equal(pythonCells.optimization, 2);
  assert.equal(pythonCells["neural-networks"], 2);
  assert.equal(pythonCells.training, 2);
  assert.equal(pythonCells.embeddings, 2);
  assert.equal(pythonCells["self-attention"], 2);
  for (const slug of [
    "sequences",
    "attention",
    "transformer-block",
    "mini-transformer",
  ]) {
    assert.equal(pythonCells[slug], 0, `${slug} baseline changed`);
  }
  assert.equal(
    report.targetGaps.filter((gap) => gap.includes("Python cells")).length,
    4,
  );
});

test("renders a reviewable Markdown report with score and draft state", () => {
  const markdown = renderCurriculumQualityMarkdown(analyzeCurriculumQuality());

  assert.match(markdown, /벡터와 텐서.*2.*45\/45.*published/);
  assert.match(markdown, /학습과 최적화.*2.*45\/45.*draft/);
  assert.match(markdown, /분류와 신경망.*2.*45\/45.*draft/);
  assert.match(markdown, /딥러닝 학습 구조.*2.*45\/45.*draft/);
  assert.match(markdown, /토큰과 임베딩.*2.*45\/45.*draft/);
  assert.match(markdown, /Self-Attention.*2.*45\/45.*draft/);
  assert.match(markdown, /Structural contract issues: 0/);
});

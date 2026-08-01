import assert from "node:assert/strict";
import test from "node:test";
import {
  analyzeCurriculumInteractionAudit,
  renderCurriculumInteractionAuditMarkdown,
} from "../scripts/report-curriculum-interactions.ts";

test("derives one structurally valid interaction-audit row for every implemented chapter", () => {
  const report = analyzeCurriculumInteractionAudit();
  assert.equal(report.chapters.length, 32);
  assert.deepEqual(report.structuralIssues, []);
  assert.equal(new Set(report.chapters.map(({ chapterId }) => chapterId)).size, 32);
  assert.equal(new Set(report.chapters.map(({ previewRoute }) => previewRoute)).size, 32);
  assert.equal(report.chapters.every(({ learningOutput }) => learningOutput.length > 0), true);
  assert.equal(report.chapters.every(({ activityKinds }) => activityKinds.length >= 3), true);
  assert.equal(report.chapters.every(({ sourceControlDefinitions }) => sourceControlDefinitions.nativeSelects === 0), true);
});

test("keeps browser-spec evidence separate from remaining exhaustive coverage targets", () => {
  const report = analyzeCurriculumInteractionAudit();
  assert.equal(report.signalCoverage.route, 32);
  assert.equal(report.signalCoverage.desktop, 32);
  assert.equal(report.signalCoverage.mobile390x844, 32);
  assert.equal(report.signalCoverage.keyboard, 31);
  assert.equal(report.signalCoverage.console, 18);
  assert.equal(report.signalCoverage.targetSize44, 24);
  assert.equal(report.signalCoverage.nativeSelectZero, 27);
  assert.equal(report.coverageTargets.length, 28);
  assert.deepEqual(
    report.chapters
      .filter(({ browserSpecSignals }) => !browserSpecSignals.route)
      .map(({ chapterId }) => chapterId),
    [],
  );

  const markdown = renderCurriculumInteractionAuditMarkdown(report);
  assert.match(markdown, /do not prove that every control was clicked/);
  assert.match(markdown, /Browser-spec coverage targets:/);
  assert.match(markdown, /transformer-from-zero\/vectors/);
  assert.match(markdown, /linux-systems\/shell-and-filesystem/);
  assert.match(markdown, /infrastructure-design\/assemble-a-namespace-platform/);
});

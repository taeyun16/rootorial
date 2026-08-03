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

test("labels browser-spec assertion patterns without implying exhaustive runtime coverage", () => {
  const report = analyzeCurriculumInteractionAudit();
  assert.equal(report.signalCoverage.route, 32);
  assert.equal(report.signalCoverage.desktop, 32);
  assert.equal(report.signalCoverage.mobile390x844, 32);
  assert.equal(report.signalCoverage.keyboard, 32);
  assert.equal(report.signalCoverage.console, 32);
  assert.equal(report.signalCoverage.targetSize44Assertion, 32);
  assert.equal(report.signalCoverage.nativeSelectZero, 32);
  assert.equal(report.coverageTargets.length, 0);
  assert.deepEqual(report.touchTargetScopeCoverage, {
    "specific-control": 5,
    "component-scan": 6,
    "page-visible-scan": 21,
  });
  assert.equal(
    report.chapters.every(({ touchTargetAuditScope }) => touchTargetAuditScope !== "undeclared"),
    true,
  );
  assert.deepEqual(
    report.chapters
      .filter(({ browserSpecSignals }) => !browserSpecSignals.route)
      .map(({ chapterId }) => chapterId),
    [],
  );

  const markdown = renderCurriculumInteractionAuditMarkdown(report);
  assert.match(markdown, /do not prove that every control was measured or clicked/);
  assert.match(markdown, /specific-control/);
  assert.match(markdown, /component-scan/);
  assert.match(markdown, /page-visible-scan/);
  assert.match(markdown, /Even page-visible scans cover one rendered state, not every possible state/);
  assert.match(markdown, /Browser-spec assertion gaps:/);
  assert.match(markdown, /Touch-target scope: specific-control 5\/32 · component-scan 6\/32 · page-visible-scan 21\/32/);
  assert.doesNotMatch(markdown, /\| 44px \|/);
  assert.match(markdown, /\| 44px assertion pattern \|/);
  assert.match(markdown, /\| Touch-target scope \|/);
  assert.match(markdown, /transformer-from-zero\/vectors/);
  assert.match(markdown, /linux-systems\/shell-and-filesystem/);
  assert.match(markdown, /infrastructure-design\/assemble-a-namespace-platform/);
});

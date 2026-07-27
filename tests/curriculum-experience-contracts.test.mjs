import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import {
  auditExperienceContractCoverage,
  chapterExperienceContracts,
  curriculumExperienceTheses,
} from "../src/features/chapters/experience-contracts.ts";

const repoRoot = path.resolve(import.meta.dirname, "..");

test("every catalog chapter has one curriculum-specific experience contract", () => {
  const coverage = auditExperienceContractCoverage();
  assert.deepEqual(coverage.missing, []);
  assert.deepEqual(coverage.orphaned, []);
  assert.equal(coverage.total, 40);
  assert.equal(coverage.implemented, 32);
  assert.equal(coverage.planned, 8);
  assert.equal(Object.keys(curriculumExperienceTheses).length, 5);
});

test("implemented curricula do not render native select controls", () => {
  const componentRoot = path.join(repoRoot, "src/components");
  const sourceFiles = fs.readdirSync(componentRoot, { recursive: true, encoding: "utf8" })
    .filter((entry) => entry.endsWith(".tsx"))
    .map((entry) => path.join(componentRoot, entry));
  const curriculumSources = sourceFiles.filter((sourceFile) =>
    /\/(linux|linux-networking|infrastructure)\//.test(sourceFile)
    || /\/(attention|embeddings|mini-transformer|neural-networks|optimization|self-attention|sequences|training|transformer-block)\//.test(sourceFile)
    || /\/(VectorsChapter|VectorBasicsLab|ShapeDebuggingLab|TensorShapeExplorer|MatrixMultiplicationExplorer)\.tsx$/.test(sourceFile),
  );
  const offenders = curriculumSources.filter((sourceFile) => /<select\b/.test(fs.readFileSync(sourceFile, "utf8")));
  assert.deepEqual(offenders, []);

  const legacyChoiceConsumers = curriculumSources.filter((sourceFile) =>
    /DirectChoiceSelect/.test(fs.readFileSync(sourceFile, "utf8")),
  );
  assert.deepEqual(legacyChoiceConsumers, []);

  const nestedInteractiveLabels = curriculumSources.filter((sourceFile) =>
    /<label\b[^>]*>(?:(?!<\/label>)[\s\S])*<ChoiceField\b/.test(fs.readFileSync(sourceFile, "utf8")),
  );
  assert.deepEqual(nestedInteractiveLabels, []);
});

test("shared concept checks submit on Enter and Space in the in-app browser", () => {
  const source = fs.readFileSync(
    path.join(repoRoot, "src/components/interactive/ConceptCheckRenderer.tsx"),
    "utf8",
  );

  assert.match(source, /event\.key !== "Enter" && event\.key !== " "/);
  assert.match(source, /event\.currentTarget\.form\?\.requestSubmit\(\)/);
  assert.match(source, /onKeyDown=\{checkAnswersWithKeyboard\}/);
});

test("advanced Linux Networking contracts use a complete typed visualization registry", () => {
  const registrySource = fs.readFileSync(
    path.join(repoRoot, "src/features/chapters/visualization-registry.tsx"),
    "utf8",
  );
  const expected = {
    "linux-networking/routes-and-packet-paths": "route-prefix-bars",
    "linux-networking/sockets-ports-and-tcp": "tcp-boundary-sequence",
    "linux-networking/dns-and-service-reachability": "dns-ttl-timeline",
    "linux-networking/diagnose-a-linux-network": "diagnostic-evidence-ladder",
  };
  for (const [id, visualizationKey] of Object.entries(expected)) {
    assert.equal(chapterExperienceContracts[id].status, "implemented");
    assert.equal(chapterExperienceContracts[id].visualizationKey, visualizationKey);
  }
  assert.equal(
    chapterExperienceContracts["linux-networking/dns-and-service-reachability"].interaction,
    "predict-and-repair",
  );
  for (const visualizationKey of [
    "route-prefix-bars",
    "tcp-boundary-sequence",
    "dns-ttl-timeline",
    "diagnostic-evidence-ladder",
  ]) assert.match(registrySource, new RegExp(`\\"${visualizationKey}\\"\\s*:`));
  assert.match(registrySource, /satisfies Record<VisualizationKey,/);
});

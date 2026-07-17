import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";
import {
  transformerChapterSlugs,
  transformerContentQualityContracts,
  type EditorialReview,
  type TransformerChapterSlug,
} from "../src/features/chapters/content-quality.ts";
import { chapterRegistry } from "../src/features/chapters/chapter-registry.ts";
import { publicationResources } from "../src/features/publication/publication.ts";
import { transformerLearningGuides } from "../src/data/transformerLearningGuide.ts";

const scriptFile = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptFile), "..");

type SourceMetrics = {
  sectionIds: string[];
  paragraphs: number;
  listItems: number;
  bilingualCalls: number;
  componentInstances: Record<string, number>;
  pythonCells: number;
  hasConceptCheck: boolean;
  hasCompletionGate: boolean;
  hasTransferSection: boolean;
};

export type ChapterQualityResult = {
  slug: TransformerChapterSlug;
  number: number;
  title: string;
  sections: number;
  paragraphs: number;
  activities: number;
  activityKinds: number;
  gradedTasks: number;
  pythonCells: number;
  conceptQuestions: number;
  completionGate: boolean;
  defaultPublication: "published" | "draft" | "other";
  terminologySupportCount: number;
  visibleClarificationAccess: boolean;
  requiredCheckpointGroups: number;
  estimatedMinimumSuccessfulActions: number;
  maxAllowedInteractionBudget: number;
  learningExperienceScore: number;
  editorialScore: number;
  editorialMaximum: 45;
  issues: string[];
  targetGaps: string[];
};

export type CurriculumQualityReport = {
  generatedAt: string;
  chapters: ChapterQualityResult[];
  issues: string[];
  targetGaps: string[];
};

function attributeText(
  attributes: ts.JsxAttributes,
  name: string,
): string | undefined {
  const attribute = attributes.properties.find(
    (candidate): candidate is ts.JsxAttribute =>
      ts.isJsxAttribute(candidate) && candidate.name.getText() === name,
  );
  if (!attribute?.initializer) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer)
    && attribute.initializer.expression
    && ts.isStringLiteral(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return undefined;
}

function analyzeSource(sourceFile: string, sourceText: string): SourceMetrics {
  const source = ts.createSourceFile(
    sourceFile,
    sourceText,
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const sectionIds: string[] = [];
  const componentInstances: Record<string, number> = {};
  let paragraphs = 0;
  let listItems = 0;
  let bilingualCalls = 0;

  const recordTag = (tagName: ts.JsxTagNameExpression, attributes: ts.JsxAttributes) => {
    const tag = tagName.getText(source);
    if (tag === "section") {
      const id = attributeText(attributes, "id");
      if (id) sectionIds.push(id);
    }
    if (tag === "p") paragraphs += 1;
    if (tag === "li") listItems += 1;
    if (/^[A-Z]/.test(tag)) {
      componentInstances[tag] = (componentInstances[tag] ?? 0) + 1;
    }
  };

  const visit = (node: ts.Node) => {
    if (ts.isJsxSelfClosingElement(node)) {
      recordTag(node.tagName, node.attributes);
    } else if (ts.isJsxOpeningElement(node)) {
      recordTag(node.tagName, node.attributes);
    } else if (
      ts.isCallExpression(node)
      && ts.isIdentifier(node.expression)
      && node.expression.text === "t"
      && node.arguments.length >= 2
    ) {
      bilingualCalls += 1;
    }
    ts.forEachChild(node, visit);
  };
  visit(source);

  return {
    sectionIds,
    paragraphs,
    listItems,
    bilingualCalls,
    componentInstances,
    pythonCells:
      (componentInstances.NotebookCell ?? 0)
      + (componentInstances.PythonLab ?? 0),
    hasConceptCheck: Object.keys(componentInstances).some((name) =>
      name.endsWith("ConceptCheck") || name === "ConceptCheck"),
    hasCompletionGate: (componentInstances.CompleteChapter ?? 0) > 0,
    hasTransferSection: sectionIds.includes("transfer"),
  };
}

const learningExperienceTargets = {
  terminologySupportCount: 5,
  requiredCheckpointGroups: 3,
  maxAllowedInteractionBudget: 18,
} as const;

function learningExperienceScore(
  terminologySupportCount: number,
  visibleClarificationAccess: boolean,
  requiredCheckpointGroups: number,
  estimatedMinimumSuccessfulActions: number,
  maxAllowedInteractionBudget: number,
) {
  return [
    terminologySupportCount >= learningExperienceTargets.terminologySupportCount,
    visibleClarificationAccess,
    requiredCheckpointGroups <= learningExperienceTargets.requiredCheckpointGroups,
    estimatedMinimumSuccessfulActions <= maxAllowedInteractionBudget,
    maxAllowedInteractionBudget <= learningExperienceTargets.maxAllowedInteractionBudget,
  ].filter(Boolean).length;
}

function editorialScore(
  review: EditorialReview,
  pythonCells: number,
  experienceScore: number,
) {
  const qualitative = Object.values(review).reduce((sum, value) => sum + value, 0);
  const pythonScore = pythonCells >= 2 ? 5 : pythonCells === 1 ? 3 : 0;
  return qualitative + pythonScore + experienceScore;
}

function publicationKind(value: string | undefined): "published" | "draft" | "other" {
  if (value === "published" || value === "draft") return value;
  return "other";
}

export function analyzeCurriculumQuality(
  repoRoot = defaultRepoRoot,
): CurriculumQualityReport {
  const resources = publicationResources();
  const learningGuideSourcePath = path.join(
    repoRoot,
    "src/components/TransformerLearningGuide.tsx",
  );
  const learningGuideSource = fs.existsSync(learningGuideSourcePath)
    ? fs.readFileSync(learningGuideSourcePath, "utf8")
    : "";
  const guideOffersClarification = learningGuideSource.includes("requestContentFeedback")
    && /<button\b/.test(learningGuideSource);
  const chapters = transformerChapterSlugs.map((slug): ChapterQualityResult => {
    const contract = transformerContentQualityContracts[slug];
    const sourcePath = path.join(repoRoot, contract.sourceFile);
    const e2ePath = path.join(repoRoot, contract.e2eFile);
    const issues: string[] = [];
    const targetGaps: string[] = [];
    const experience = contract.learningExperience;

    if (!fs.existsSync(sourcePath)) {
      return {
        slug,
        number: contract.number,
        title: contract.title,
        sections: 0,
        paragraphs: 0,
        activities: contract.activities.length,
        activityKinds: new Set(contract.activities.map(({ kind }) => kind)).size,
        gradedTasks: contract.activities.reduce((sum, item) => sum + item.gradedTasks, 0),
        pythonCells: 0,
        conceptQuestions: 0,
        completionGate: false,
        defaultPublication: "other",
        terminologySupportCount: 0,
        visibleClarificationAccess: false,
        requiredCheckpointGroups: 0,
        estimatedMinimumSuccessfulActions: experience.estimatedMinimumSuccessfulActions,
        maxAllowedInteractionBudget: experience.maxAllowedInteractionBudget,
        learningExperienceScore: 0,
        editorialScore: editorialScore(contract.editorialReview, 0, 0),
        editorialMaximum: 45,
        issues: [`missing source file: ${contract.sourceFile}`],
        targetGaps: [],
      };
    }

    const sourceText = fs.readFileSync(sourcePath, "utf8");
    const metrics = analyzeSource(contract.sourceFile, sourceText);
    const e2eText = fs.existsSync(e2ePath) ? fs.readFileSync(e2ePath, "utf8") : "";
    const registration = chapterRegistry[`transformer-from-zero/${slug}`];
    const conceptQuestions = registration
      ? Object.keys(registration.questions).length
      : 0;
    const publication = resources.find(
      (resource) =>
        resource.curriculumSlug === "transformer-from-zero"
        && resource.chapterSlug === slug,
    );
    const defaultPublication = publicationKind(publication?.defaultPublicationStatus);
    const hasLearningGuide = (metrics.componentInstances.TransformerLearningGuide ?? 0) > 0;
    const terminologySupportCount = hasLearningGuide
      ? transformerLearningGuides[slug].terms.length
      : 0;
    const visibleClarificationAccess = hasLearningGuide
      && guideOffersClarification;
    const requiredCheckpointGroups = new Set(
      contract.activities
        .filter(({ required }) => required)
        .map(({ component }) => component),
    ).size + (metrics.hasConceptCheck ? 1 : 0);
    const experienceScore = learningExperienceScore(
      terminologySupportCount,
      visibleClarificationAccess,
      requiredCheckpointGroups,
      experience.estimatedMinimumSuccessfulActions,
      experience.maxAllowedInteractionBudget,
    );

    if (metrics.sectionIds.length < 6) {
      issues.push(`only ${metrics.sectionIds.length} identified sections; minimum is 6`);
    }
    if (metrics.listItems < 4) {
      issues.push(`only ${metrics.listItems} list items; learning objectives may be missing`);
    }
    if (metrics.bilingualCalls === 0) {
      issues.push("no bilingual t(ko, en) calls found");
    }
    if (!metrics.hasConceptCheck) {
      issues.push("no concept-check component rendered");
    }
    if (!metrics.hasCompletionGate) {
      issues.push("no CompleteChapter gate rendered");
    }
    if (!hasLearningGuide) {
      issues.push("no TransformerLearningGuide rendered");
    }
    if (terminologySupportCount !== experience.terminologySupportCount) {
      issues.push(
        `terminology support drift: expected ${experience.terminologySupportCount}, found ${terminologySupportCount}`,
      );
    }
    if (visibleClarificationAccess !== experience.visibleClarificationAccess) {
      issues.push(
        `clarification access drift: expected ${experience.visibleClarificationAccess}, found ${visibleClarificationAccess}`,
      );
    }
    if (requiredCheckpointGroups !== experience.requiredCheckpointGroups) {
      issues.push(
        `required checkpoint group drift: expected ${experience.requiredCheckpointGroups}, found ${requiredCheckpointGroups}`,
      );
    }
    if (
      contract.activities.some(
        ({ kind, required, runtime }) => required && (kind === "debug" || runtime === "python"),
      )
    ) {
      issues.push("debugger and Python activities must remain optional on the core path");
    }
    if (conceptQuestions !== contract.expectedConceptQuestions) {
      issues.push(
        `concept question contract drift: expected ${contract.expectedConceptQuestions}, found ${conceptQuestions}`,
      );
    }
    if (!e2eText) {
      issues.push(`missing E2E file: ${contract.e2eFile}`);
    } else if (!e2eText.includes("lang=en")) {
      issues.push("E2E does not exercise the English chapter");
    }
    if (contract.expectedDefaultPublication !== defaultPublication) {
      issues.push(
        `default publication drift: expected ${contract.expectedDefaultPublication}, found ${defaultPublication}`,
      );
    }
    if (
      contract.expectedDefaultPublication === "draft"
      && !/toBe\(404\)/.test(e2eText)
    ) {
      issues.push("draft E2E does not assert a 404 public boundary");
    }

    const uniqueComponents = new Set(
      contract.activities.map(({ component }) => component),
    );
    for (const component of uniqueComponents) {
      if ((metrics.componentInstances[component] ?? 0) === 0) {
        issues.push(`declared activity component is not rendered: ${component}`);
      }
    }
    const declaredPythonActivities = contract.activities.filter(
      ({ runtime }) => runtime === "python",
    ).length;
    if (metrics.pythonCells < declaredPythonActivities) {
      issues.push(
        `Python activity contract drift: declared ${declaredPythonActivities}, found ${metrics.pythonCells}`,
      );
    }

    if (metrics.pythonCells < contract.targetPythonCells) {
      targetGaps.push(
        `Python cells ${metrics.pythonCells}/${contract.targetPythonCells}`,
      );
    }
    if (conceptQuestions < 5) {
      targetGaps.push(`concept questions ${conceptQuestions}/5`);
    }
    if (contract.editorialReview.narrativeDensity < 4) {
      targetGaps.push("narrative density below 4/5");
    }
    if (contract.editorialReview.workedExamples < 4) {
      targetGaps.push("worked examples below 4/5");
    }
    if (new Set(contract.activities.map(({ kind }) => kind)).size < 3) {
      targetGaps.push("fewer than 3 activity types");
    }
    if (terminologySupportCount < learningExperienceTargets.terminologySupportCount) {
      targetGaps.push(
        `visible key terms ${terminologySupportCount}/${learningExperienceTargets.terminologySupportCount}`,
      );
    }
    if (!visibleClarificationAccess) {
      targetGaps.push("no visible clarification access at chapter entry");
    }
    if (requiredCheckpointGroups > learningExperienceTargets.requiredCheckpointGroups) {
      targetGaps.push(
        `required checkpoint groups ${requiredCheckpointGroups}/${learningExperienceTargets.requiredCheckpointGroups} max`,
      );
    }
    if (
      experience.estimatedMinimumSuccessfulActions
      > experience.maxAllowedInteractionBudget
    ) {
      targetGaps.push(
        `minimum successful actions ${experience.estimatedMinimumSuccessfulActions}/${experience.maxAllowedInteractionBudget} budget`,
      );
    }
    if (
      experience.maxAllowedInteractionBudget
      > learningExperienceTargets.maxAllowedInteractionBudget
    ) {
      targetGaps.push(
        `interaction budget ${experience.maxAllowedInteractionBudget}/${learningExperienceTargets.maxAllowedInteractionBudget} max`,
      );
    }

    return {
      slug,
      number: contract.number,
      title: contract.title,
      sections: metrics.sectionIds.length,
      paragraphs: metrics.paragraphs,
      activities: contract.activities.length,
      activityKinds: new Set(contract.activities.map(({ kind }) => kind)).size,
      gradedTasks: contract.activities.reduce((sum, item) => sum + item.gradedTasks, 0),
      pythonCells: metrics.pythonCells,
      conceptQuestions,
      completionGate: metrics.hasCompletionGate,
      defaultPublication,
      terminologySupportCount,
      visibleClarificationAccess,
      requiredCheckpointGroups,
      estimatedMinimumSuccessfulActions: experience.estimatedMinimumSuccessfulActions,
      maxAllowedInteractionBudget: experience.maxAllowedInteractionBudget,
      learningExperienceScore: experienceScore,
      editorialScore: editorialScore(
        contract.editorialReview,
        metrics.pythonCells,
        experienceScore,
      ),
      editorialMaximum: 45,
      issues,
      targetGaps,
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    chapters,
    issues: chapters.flatMap((chapter) =>
      chapter.issues.map((issue) => `${chapter.slug}: ${issue}`)),
    targetGaps: chapters.flatMap((chapter) =>
      chapter.targetGaps.map((gap) => `${chapter.slug}: ${gap}`)),
  };
}

export function renderCurriculumQualityMarkdown(report: CurriculumQualityReport) {
  const rows = report.chapters.map((chapter) => {
    const gaps = chapter.targetGaps.length ? chapter.targetGaps.join("; ") : "—";
    const help = chapter.visibleClarificationAccess ? "yes" : "no";
    const actions = `${chapter.estimatedMinimumSuccessfulActions}/${chapter.maxAllowedInteractionBudget}`;
    return `| ${chapter.number} | ${chapter.title} | ${chapter.sections} | ${chapter.activities} (${chapter.activityKinds}종) | ${chapter.pythonCells} | ${chapter.conceptQuestions} | ${chapter.terminologySupportCount} | ${help} | ${chapter.requiredCheckpointGroups} | ${actions} | ${chapter.editorialScore}/45 | ${chapter.defaultPublication} | ${gaps} |`;
  });
  return [
    "# Transformer curriculum content-quality report",
    "",
    `Generated: ${report.generatedAt}`,
    "",
    "| # | Chapter | Sections | Activities | Python | Questions | Terms | Help | Required groups | Actions min/max | Quality | Default | Target gaps |",
    "|---:|---|---:|---:|---:|---:|---:|:---:|---:|---:|---:|---|---|",
    ...rows,
    "",
    `Structural contract issues: ${report.issues.length}`,
    `Improvement targets: ${report.targetGaps.length}`,
    "",
    "Quality score uses seven reviewed editorial dimensions, a Python score (0 cells = 0, 1 cell = 3, 2+ cells = 5), and five structural learning-experience signals: visible terms, clarification access, required-group count, action estimate within budget, and curriculum-wide budget cap.",
  ].join("\n");
}

function runCli() {
  const report = analyzeCurriculumQuality();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
  } else if (process.argv.includes("--check")) {
    if (report.issues.length > 0) {
      console.error("Curriculum quality contract failures:");
      for (const issue of report.issues) console.error(`- ${issue}`);
      process.exitCode = 1;
      return;
    }
    console.log(
      `Curriculum quality contracts valid: ${report.chapters.length} chapters; ${report.targetGaps.length} improvement targets tracked.`,
    );
  } else {
    console.log(renderCurriculumQualityMarkdown(report));
  }
}

if (path.resolve(process.argv[1] ?? "") === scriptFile) {
  runCli();
}

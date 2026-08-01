import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  platformContentQualityContracts,
  transformerContentQualityContracts,
  type ChapterActivityKind,
} from "../src/features/chapters/content-quality.ts";
import {
  chapterExperienceContracts,
  type InteractionFamily,
  type VisualFamily,
} from "../src/features/chapters/experience-contracts.ts";
import { registeredChapterIds } from "../src/features/chapters/chapter-registry.ts";

const scriptFile = fileURLToPath(import.meta.url);
const defaultRepoRoot = path.resolve(path.dirname(scriptFile), "..");

export type BrowserSpecSignals = Readonly<{
  route: boolean;
  desktop: boolean;
  mobile390x844: boolean;
  keyboard: boolean;
  immediateResult: boolean;
  console: boolean;
  overflow: boolean;
  targetSize44: boolean;
  nativeSelectZero: boolean;
}>;

export type CurriculumInteractionAuditRow = Readonly<{
  chapterId: string;
  previewRoute: string;
  sourceFile: string;
  e2eFile: string;
  interaction: InteractionFamily;
  primaryVisual: VisualFamily;
  learningOutput: string;
  activityKinds: readonly ChapterActivityKind[];
  browserSpecSignals: BrowserSpecSignals;
  sourceControlDefinitions: Readonly<{
    buttons: number;
    inputs: number;
    textareas: number;
    nativeSelects: number;
  }>;
  structuralIssues: readonly string[];
  coverageTargets: readonly string[];
}>;

export type CurriculumInteractionAuditReport = Readonly<{
  chapters: readonly CurriculumInteractionAuditRow[];
  structuralIssues: readonly string[];
  coverageTargets: readonly string[];
  signalCoverage: Readonly<Record<keyof BrowserSpecSignals, number>>;
}>;

type NormalizedQualityContract = Readonly<{
  chapterId: string;
  sourceFile: string;
  e2eFile: string;
  activityKinds: readonly ChapterActivityKind[];
}>;

function normalizedQualityContracts(): Map<string, NormalizedQualityContract> {
  const transformer = Object.entries(transformerContentQualityContracts).map(
    ([slug, contract]) => [
      `transformer-from-zero/${slug}`,
      {
        chapterId: `transformer-from-zero/${slug}`,
        sourceFile: contract.sourceFile,
        e2eFile: contract.e2eFile,
        activityKinds: [...new Set(contract.activities.map(({ kind }) => kind))],
      },
    ] as const,
  );
  const platform = Object.values(platformContentQualityContracts).map((contract) => [
    contract.chapterId,
    {
      chapterId: contract.chapterId,
      sourceFile: contract.sourceFile,
      e2eFile: contract.e2eFile,
      activityKinds: contract.activityKinds,
    },
  ] as const);
  return new Map([...transformer, ...platform]);
}

function countMatches(source: string, pattern: RegExp) {
  return source.match(pattern)?.length ?? 0;
}

function browserSignals(chapterId: string, e2eSource: string): BrowserSpecSignals {
  const [, chapterSlug] = chapterId.split("/");
  const hasNavigation = /page\.goto\(|gotoChapter\(|openChapter\(/.test(e2eSource);
  return {
    route: Boolean(chapterSlug && e2eSource.includes(chapterSlug) && hasNavigation),
    desktop: hasNavigation,
    mobile390x844: /width:\s*390/.test(e2eSource) && /height:\s*844/.test(e2eSource),
    keyboard: /press\(["'](?:Enter| )["']\)|keyboard\.press\(["'](?:Enter|Space)["']\)/.test(e2eSource),
    immediateResult: /to(?:Contain|Have)Text\(|getByRole\(["']status["']|\.is-(?:correct|incorrect|passed|failed)/.test(e2eSource),
    console: /page\.on\(["']console["']|consoleErrors|consoleWarnings/.test(e2eSource),
    overflow: /scrollWidth/.test(e2eSource),
    targetSize44: /(?:>=|<|toBeGreaterThanOrEqual\()\s*44|44px/.test(e2eSource),
    nativeSelectZero: /locator\((?:'[^']*select[^']*'|"[^"]*select[^"]*")\)[\s\S]{0,160}(?:toHaveCount\(0\)|count\(\)[\s\S]{0,80}toBe\(0\))/.test(e2eSource),
  };
}

const signalLabels: Record<keyof BrowserSpecSignals, string> = {
  route: "chapter route",
  desktop: "desktop flow",
  mobile390x844: "390x844 mobile flow",
  keyboard: "keyboard activation",
  immediateResult: "immediate result assertion",
  console: "console monitoring",
  overflow: "horizontal overflow assertion",
  targetSize44: "44px target assertion",
  nativeSelectZero: "native-select zero assertion",
};

export function analyzeCurriculumInteractionAudit(
  repoRoot = defaultRepoRoot,
): CurriculumInteractionAuditReport {
  const qualityContracts = normalizedQualityContracts();
  const implementedContractIds = Object.entries(chapterExperienceContracts)
    .filter(([, contract]) => contract.status === "implemented")
    .map(([chapterId]) => chapterId);
  const chapterIds = [...new Set([...registeredChapterIds, ...implementedContractIds])].sort();

  const chapters = chapterIds.map((chapterId): CurriculumInteractionAuditRow => {
    const quality = qualityContracts.get(chapterId);
    const experience = chapterExperienceContracts[chapterId as keyof typeof chapterExperienceContracts];
    const [curriculumSlug, chapterSlug] = chapterId.split("/");
    const structuralIssues: string[] = [];

    if (!registeredChapterIds.includes(chapterId as (typeof registeredChapterIds)[number])) {
      structuralIssues.push("missing chapter registry entry");
    }
    if (!experience || experience.status !== "implemented") {
      structuralIssues.push("missing implemented experience contract");
    }
    if (!quality) structuralIssues.push("missing content-quality contract");

    const sourceFile = quality?.sourceFile ?? "";
    const e2eFile = quality?.e2eFile ?? "";
    const sourcePath = sourceFile ? path.join(repoRoot, sourceFile) : "";
    const e2ePath = e2eFile ? path.join(repoRoot, e2eFile) : "";
    if (!sourcePath || !fs.existsSync(sourcePath)) structuralIssues.push("missing chapter source file");
    if (!e2ePath || !fs.existsSync(e2ePath)) structuralIssues.push("missing E2E source file");

    const source = sourcePath && fs.existsSync(sourcePath) ? fs.readFileSync(sourcePath, "utf8") : "";
    const e2eSource = e2ePath && fs.existsSync(e2ePath) ? fs.readFileSync(e2ePath, "utf8") : "";
    const signals = browserSignals(chapterId, e2eSource);
    const sourceControlDefinitions = {
      buttons: countMatches(source, /<button\b/g),
      inputs: countMatches(source, /<input\b/g),
      textareas: countMatches(source, /<textarea\b/g),
      nativeSelects: countMatches(source, /<select\b/g),
    };
    if (sourceControlDefinitions.nativeSelects > 0) {
      structuralIssues.push(`chapter source defines ${sourceControlDefinitions.nativeSelects} native select(s)`);
    }

    const coverageTargets = (Object.entries(signals) as [keyof BrowserSpecSignals, boolean][])
      .filter(([, covered]) => !covered)
      .map(([signal]) => signalLabels[signal]);

    return {
      chapterId,
      previewRoute: `/admin/preview/curricula/${curriculumSlug}/chapters/${chapterSlug}`,
      sourceFile,
      e2eFile,
      interaction: experience?.interaction ?? "build-and-observe",
      primaryVisual: experience?.primaryVisual ?? "boundary-map",
      learningOutput: experience?.linkedEvidence ?? "",
      activityKinds: quality?.activityKinds ?? [],
      browserSpecSignals: signals,
      sourceControlDefinitions,
      structuralIssues,
      coverageTargets,
    };
  });

  const signalCoverage = Object.fromEntries(
    (Object.keys(signalLabels) as (keyof BrowserSpecSignals)[]).map((signal) => [
      signal,
      chapters.filter((chapter) => chapter.browserSpecSignals[signal]).length,
    ]),
  ) as Record<keyof BrowserSpecSignals, number>;

  return {
    chapters,
    structuralIssues: chapters.flatMap((chapter) =>
      chapter.structuralIssues.map((issue) => `${chapter.chapterId}: ${issue}`)),
    coverageTargets: chapters.flatMap((chapter) =>
      chapter.coverageTargets.map((target) => `${chapter.chapterId}: ${target}`)),
    signalCoverage,
  };
}

function yesNo(value: boolean) {
  return value ? "yes" : "—";
}

export function renderCurriculumInteractionAuditMarkdown(report: CurriculumInteractionAuditReport) {
  const rows = report.chapters.map((chapter) => {
    const signals = chapter.browserSpecSignals;
    const controls = chapter.sourceControlDefinitions;
    const targets = chapter.coverageTargets.length ? chapter.coverageTargets.join("; ") : "—";
    return `| ${chapter.chapterId} | ${chapter.interaction} | ${chapter.activityKinds.join(" · ")} | ${controls.buttons}/${controls.inputs}/${controls.textareas}/${controls.nativeSelects} | ${yesNo(signals.mobile390x844)} | ${yesNo(signals.keyboard)} | ${yesNo(signals.immediateResult)} | ${yesNo(signals.console)} | ${yesNo(signals.overflow)} | ${yesNo(signals.targetSize44)} | ${yesNo(signals.nativeSelectZero)} | ${chapter.learningOutput} | ${targets} |`;
  });
  return [
    "# Curriculum interaction-audit inventory",
    "",
    "This report derives implemented routes and declared learning outputs from the chapter registry and quality/experience contracts. Browser-spec signals indicate that the named E2E file contains an assertion pattern; they do not prove that every control was clicked. Source control counts cover only the primary chapter file and do not expand imported child components.",
    "",
    "| Chapter | Interaction | Activities | Primary-source button/input/textarea/select | 390x844 | Keyboard | Result | Console | Overflow | 44px | Select=0 | Learning output | Coverage targets |",
    "|---|---|---|---:|:---:|:---:|:---:|:---:|:---:|:---:|:---:|---|---|",
    ...rows,
    "",
    `Structural issues: ${report.structuralIssues.length}`,
    `Browser-spec coverage targets: ${report.coverageTargets.length}`,
    `Signal coverage: ${Object.entries(report.signalCoverage).map(([signal, count]) => `${signal} ${count}/${report.chapters.length}`).join(" · ")}`,
  ].join("\n");
}

function runCli() {
  const report = analyzeCurriculumInteractionAudit();
  if (process.argv.includes("--json")) {
    console.log(JSON.stringify(report, null, 2));
    return;
  }
  if (process.argv.includes("--check")) {
    if (report.structuralIssues.length > 0) {
      console.error("Curriculum interaction-audit structural failures:");
      for (const issue of report.structuralIssues) console.error(`- ${issue}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Curriculum interaction inventory valid: ${report.chapters.length} implemented chapters; ${report.coverageTargets.length} browser-spec coverage targets tracked.`);
    return;
  }
  console.log(renderCurriculumInteractionAuditMarkdown(report));
}

if (path.resolve(process.argv[1] ?? "") === scriptFile) runCli();

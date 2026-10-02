import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { foundationPrerequisites } from "../src/data/transformerLearningGuide.ts";

const chapters = {
  vectors: ["VectorsChapter.tsx", "ConceptCheck.tsx"],
  optimization: ["optimization/OptimizationChapter.tsx", "optimization/OptimizationConceptCheck.tsx"],
  "neural-networks": ["neural-networks/NeuralNetworksChapter.tsx", "neural-networks/NeuralNetworksConceptCheck.tsx"],
};
const source = name => readFileSync(new URL("../src/components/" + name, import.meta.url), "utf8");

test("foundation prerequisites and all fifteen remediation links target existing chapter sections", () => {
  for (const [slug, [chapter, check]] of Object.entries(chapters)) {
    const chapterSource = source(chapter);
    const links = [...source(check).matchAll(/review: \{ href: "(#.*?)"/g)].map(match => match[1]);
    assert.equal(links.length, 5, slug);
    for (const item of foundationPrerequisites[slug].review) links.push(item.href);
    for (const href of links) assert.ok(chapterSource.includes('id="' + href.slice(1) + '"'), slug + ': ' + href);
    for (const locale of ["ko", "en"]) assert.ok(foundationPrerequisites[slug].carry[locale].length > 30);
  }
});

test("an unsubmitted concept check includes choices but no answer, explanation, or review hint", () => {
  const compiled = ts.transpileModule(source("interactive/ConceptCheckRenderer.tsx"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  const module = { exports: {} };
  Function("require", "module", "exports", compiled.outputText)(createRequire(import.meta.url), module, module.exports);
  const html = renderToStaticMarkup(createElement(module.exports.ConceptCheckRenderer, {
    questions: [{ id: "probe", index: "01", prompt: "Choose a direction", options: [{ value: "left", label: "Left" }, { value: "right", label: "Right" }], correctAnswer: "right", answerLabel: "SECRET ANSWER", correctFeedback: "SECRET EXPLANATION", incorrectFeedback: "SECRET HINT", visual: createElement("span", null, "SECRET VISUAL"), review: { href: "#review", label: "SECRET REVIEW" } }],
    copy: { kicker: "CHECK", title: "Predict", description: "Choose first", correct: "Correct", incorrect: "Retry", checkAnswers: "Submit", completed: "Done", retry: "Try again", idle: "Waiting" },
    onMasteryChange() {},
  }));
  assert.match(html, /Left/);
  assert.match(html, /Right/);
  assert.doesNotMatch(html, /SECRET|concept-feedback|concept-review-link/);
  assert.match(html, /disabled=""/);
});

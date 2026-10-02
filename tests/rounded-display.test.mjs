import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";
import { isRoundedDisplay } from "../src/features/learning/rounded-display.ts";

test("rounding identifies diagonal coordinates while preserving exact unit-vector examples", () => {
  for (const value of [1 / Math.sqrt(2), -1 / Math.sqrt(5), 0.0004]) assert.equal(isRoundedDisplay(value), true);
  for (const value of [0, 1, -1, 0.6, -0.8, 1 - Number.EPSILON]) assert.equal(isRoundedDisplay(value), false);
});

test("normalization proof uses approximation only when displayed operands or distance are rounded", () => {
  const source = readFileSync(new URL("../src/components/UnitVectorPlot.tsx", import.meta.url), "utf8");
  const compiled = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  const require = createRequire(import.meta.url);
  const module = { exports: {} };
  const localRequire = name => name === "../features/learning/rounded-display" ? { isRoundedDisplay } : name === "./MathFormula" ? { MathFormula: ({ latex }) => createElement("span", { "data-latex": latex }) } : require(name);
  Function("require", "module", "exports", compiled.outputText)(localRequire, module, module.exports);
  const render = vector => renderToStaticMarkup(createElement(module.exports.UnitVectorPlot, { vector, sourceVector: [1, 1], locale: "en" }));
  assert.match(render([1 / Math.sqrt(2), 1 / Math.sqrt(2)]), /\\sqrt\{0\.707\^2 \+ 0\.707\^2\} \\approx 1/);
  assert.match(render([1 / Math.sqrt(2), 1 / Math.sqrt(2)]), /rounded to three decimal places/);
  for (const vector of [[0.6, 0.8], [0, 1], [-1, 0]]) {
    const html = render(vector);
    assert.match(html, /\\sqrt\{.*\} = 1/);
    assert.doesNotMatch(html, /\\approx|unit-vector-rounding-note/);
  }
});

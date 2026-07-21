import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

async function loadExecutableFigure() {
  const fileUrl = new URL(
    "../src/components/interactive/ExecutableFigure.tsx",
    import.meta.url,
  );
  const source = await readFile(fileUrl, "utf8");
  const compiled = ts.transpileModule(source, {
    fileName: fileUrl.pathname,
    compilerOptions: {
      esModuleInterop: true,
      jsx: ts.JsxEmit.ReactJSX,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
  });
  const module = { exports: {} };
  const localRequire = (specifier) =>
    specifier.endsWith(".css") ? {} : require(specifier);

  Function("require", "module", "exports", compiled.outputText)(
    localRequire,
    module,
    module.exports,
  );
  return module.exports.ExecutableFigure;
}

function attribute(html, name) {
  const value = html.match(new RegExp(`${name}="([^"]+)"`))?.[1];
  assert.ok(value, `${name} should be rendered`);
  return value;
}

test("SSR exposes one labelled figure with the selected heading level", async () => {
  const ExecutableFigure = await loadExecutableFigure();
  const html = renderToStaticMarkup(
    createElement(
      ExecutableFigure,
      {
        kicker: "EXECUTABLE FIGURE · OWNERSHIP",
        title: "Which object changed?",
        description: "Compare the ownership delta.",
        headingLevel: 4,
        id: "ownership-delta",
        testId: "ownership-figure",
        className: "ownership-renderer",
        footer: createElement("strong", null, "Deterministic model"),
      },
      createElement("svg", { "aria-label": "Ownership graph" }),
    ),
  );

  assert.equal((html.match(/<figure\b/g) ?? []).length, 1);
  assert.equal((html.match(/<figcaption\b/g) ?? []).length, 1);
  assert.match(
    html,
    /^<figure class="executable-figure ownership-renderer"[^>]+id="ownership-delta">/,
  );
  assert.match(html, /data-testid="ownership-figure"/);
  assert.match(html, /<figcaption class="executable-figure-caption">/);
  assert.match(html, /<h4 class="executable-figure-title"[^>]*>Which object changed\?<\/h4>/);
  assert.match(html, /<p class="executable-figure-description"[^>]*>Compare the ownership delta\.<\/p>/);
  assert.match(html, /<div class="executable-figure-body"><svg aria-label="Ownership graph"><\/svg><\/div>/);
  assert.match(html, /<div class="executable-figure-footer"><strong>Deterministic model<\/strong><\/div>/);

  const labelledBy = attribute(html, "aria-labelledby");
  const describedBy = attribute(html, "aria-describedby");
  assert.match(html, new RegExp(`<h4[^>]+id="${labelledBy}"`));
  assert.match(html, new RegExp(`<p[^>]+id="${describedBy}"`));
});

test("root attributes forward state hooks without overriding the figure contract", async () => {
  const ExecutableFigure = await loadExecutableFigure();
  const html = renderToStaticMarkup(
    createElement(
      ExecutableFigure,
      {
        kicker: "EXECUTABLE FIGURE",
        title: "Safe root",
        description: "Owned accessible description",
        testId: "safe-figure",
        figureAttributes: {
          "aria-busy": true,
          "data-active-stage": "move-thread",
          "data-interactive-ready": "true",
          "data-testid": "forged-test-id",
          "aria-labelledby": "forged-title",
          "aria-describedby": "forged-description",
          className: "forged-class",
          children: "forged-child",
          id: "forged-id",
        },
      },
      createElement("span", null, "Renderer output"),
    ),
  );

  assert.match(html, /^<figure aria-busy="true"/);
  assert.match(html, /data-active-stage="move-thread"/);
  assert.match(html, /data-interactive-ready="true"/);
  assert.match(html, /data-testid="safe-figure"/);
  assert.match(html, /<h3 class="executable-figure-title"/);
  assert.doesNotMatch(html, /forged-(?:test-id|title|description|class|child|id)/);
  assert.doesNotMatch(html, /executable-figure-footer/);

  const labelledBy = attribute(html, "aria-labelledby");
  const describedBy = attribute(html, "aria-describedby");
  assert.notEqual(labelledBy, "forged-title");
  assert.notEqual(describedBy, "forged-description");
  assert.match(html, new RegExp(`<h3[^>]+id="${labelledBy}"`));
  assert.match(html, new RegExp(`<p[^>]+id="${describedBy}"`));
});

test("caption and renderer body expose independent responsive spacing tokens", async () => {
  const css = await readFile(
    new URL(
      "../src/components/interactive/ExecutableFigure.css",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(
    css,
    /--executable-figure-caption-padding-inline:\s*var\(\s*--executable-figure-padding-inline\s*\)/,
  );
  assert.match(
    css,
    /--executable-figure-body-padding-inline:\s*var\(\s*--executable-figure-padding-inline\s*\)/,
  );
  assert.match(
    css,
    /\.executable-figure-body\s*\{[^}]*padding:\s*var\(--executable-figure-body-padding-block\)\s*var\(--executable-figure-body-padding-inline\)/s,
  );
  assert.match(
    css,
    /@container \(max-width: 32rem\)[\s\S]*\.executable-figure-body\s*\{[^}]*var\(--executable-figure-compact-body-padding-block\)[^}]*var\(--executable-figure-compact-body-padding-inline\)/,
  );
});

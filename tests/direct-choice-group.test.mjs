import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import ts from "typescript";

const require = createRequire(import.meta.url);

async function loadDirectChoiceGroup() {
  const fileUrl = new URL(
    "../src/components/interactive/DirectChoiceGroup.tsx",
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
  return module.exports.DirectChoiceGroup;
}

const options = [
  {
    value: "route",
    label: "Route",
    detail: "Inspect the selected path",
    eyebrow: "EVIDENCE",
  },
  {
    value: "socket",
    label: "Socket",
    disabled: true,
  },
];

test("renders one accessible pressed-button contract for every variant", async () => {
  const DirectChoiceGroup = await loadDirectChoiceGroup();

  for (const variant of ["generic", "fieldset", "infrastructure"]) {
    const html = renderToStaticMarkup(
      createElement(DirectChoiceGroup, {
        variant,
        label: "Evidence boundary",
        value: "route",
        options,
        onChange() {},
        compact: true,
        controlId: `${variant}-choice`,
      }),
    );

    assert.equal((html.match(/<button\b/g) ?? []).length, 2);
    assert.match(html, /aria-pressed="true"/);
    assert.match(html, /data-choice-value="route"/);
    assert.match(html, /disabled=""/);
    assert.match(html, new RegExp(`data-control-id="${variant}-choice"`));
  }
});

test("preserves legacy wrapper classes while centralizing button rendering", async () => {
  const DirectChoiceGroup = await loadDirectChoiceGroup();
  const fieldset = renderToStaticMarkup(
    createElement(DirectChoiceGroup, {
      variant: "fieldset",
      label: "Prediction",
      value: "",
      options,
      onChange() {},
      compact: true,
    }),
  );
  const infrastructure = renderToStaticMarkup(
    createElement(DirectChoiceGroup, {
      variant: "infrastructure",
      label: "Repair",
      value: "route",
      options,
      onChange() {},
      compact: true,
    }),
  );

  assert.match(
    fieldset,
    /^<fieldset class="direct-choice-group direct-choice is-compact"/,
  );
  assert.match(fieldset, /<legend[^>]*>Prediction<\/legend>/);
  assert.match(
    infrastructure,
    /^<div class="direct-choice-group infrastructure-choice-rail is-compact"/,
  );
  assert.match(infrastructure, /class="infrastructure-choice-card"/);
  assert.match(infrastructure, /<small>EVIDENCE<\/small>/);
  assert.match(infrastructure, /<span>Inspect the selected path<\/span>/);
});

test("keeps DirectChoice and InfrastructureChoiceRail as compatibility wrappers", async () => {
  const directChoice = await readFile(
    new URL("../src/components/interactive/DirectChoice.tsx", import.meta.url),
    "utf8",
  );
  const infrastructurePrimitives = await readFile(
    new URL(
      "../src/components/infrastructure/InfrastructureInteractionPrimitives.tsx",
      import.meta.url,
    ),
    "utf8",
  );

  assert.match(directChoice, /<DirectChoiceGroup/);
  assert.doesNotMatch(directChoice, /<button/);
  assert.match(infrastructurePrimitives, /variant="infrastructure"/);
});

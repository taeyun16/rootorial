import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

import { renderLlmsText } from "../src/features/llms/llms.ts";
import { resolvePublicationCatalog } from "../src/features/publication/publication.ts";

const outputUrl = new URL("../public/llms.txt", import.meta.url);

export function renderDefaultLlmsText() {
  return renderLlmsText(resolvePublicationCatalog([], 0));
}

async function currentOutput() {
  return readFile(outputUrl, "utf8").catch(() => "");
}

async function writeDefaultLlmsText() {
  const nextContent = renderDefaultLlmsText();
  if ((await currentOutput()) === nextContent) return false;
  await writeFile(outputUrl, nextContent, "utf8");
  return true;
}

async function checkDefaultLlmsText() {
  if ((await currentOutput()) === renderDefaultLlmsText()) return true;
  console.error(
    "public/llms.txt is stale. Run `npm run generate:llms` and commit the result.",
  );
  return false;
}

async function main() {
  if (process.argv.includes("--check")) {
    if (!(await checkDefaultLlmsText())) process.exitCode = 1;
    return;
  }

  const changed = await writeDefaultLlmsText();
  console.log(
    changed
      ? `Generated ${fileURLToPath(outputUrl)}`
      : "public/llms.txt is already up to date.",
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}

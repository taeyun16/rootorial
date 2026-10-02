import { copyFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { existsSync, createWriteStream } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";
import { Readable } from "node:stream";
import { pipeline } from "node:stream/promises";
import { assetPlan, assetRevision, CORE_FILES, inspectFile, readJson, sha256, verifyPreparedAssets } from "./python-assets.mjs";

const root = fileURLToPath(new URL("../", import.meta.url));
const args = process.argv.slice(2);
try {
  if (args.some((arg, index) => arg !== "--download" && arg !== "--check" && arg !== "--from" && args[index - 1] !== "--from")
      || args.includes("--from") && !args[args.indexOf("--from") + 1]
      || args.includes("--check") && args.length !== 1
      || args.includes("--download") && args.includes("--from")) {
    throw new Error("Usage: node scripts/prepare-python-assets.mjs [--check | --download | --from DIRECTORY]");
  }
  if (args.includes("--check")) {
    const manifest = await verifyPreparedAssets(root);
    console.log(`Python assets verified: ${manifest.version}, ${manifest.packages.length} packages, ${manifest.baseURL}`);
    process.exit(0);
  }
  const plan = await assetPlan(root);
  const cache = join(root, "work", "pyodide", plan.version);
  let source = args.includes("--from") ? resolve(args[args.indexOf("--from") + 1]) : join(cache, "packages");
  if (args.includes("--download")) {
    await mkdir(cache, { recursive: true });
    const archive = join(cache, `pyodide-${plan.version}.tar.bz2`);
    const releaseURL = `https://github.com/pyodide/pyodide/releases/download/${plan.version}/pyodide-${plan.version}.tar.bz2`;
    if (!existsSync(archive)) {
      console.log(`Preparing assets from the official release (about 389 MB): ${releaseURL}`);
      const response = await fetch(releaseURL, { signal: AbortSignal.timeout(600_000) });
      if (!response.ok || !response.body) throw new Error(`Official release returned HTTP ${response.status}: ${releaseURL}`);
      await pipeline(Readable.fromWeb(response.body), createWriteStream(archive + ".partial"));
      await rename(archive + ".partial", archive);
    }
    // Extract only the needed files. Fixed member names avoid traversal; no shell is used.
    const members = execFileSync("tar", ["-tf", archive], { encoding: "utf8", windowsHide: true, maxBuffer: 8 * 1024 * 1024 }).split(/\r?\n/);
    const names = ["pyodide-lock.json", ...plan.packages.map((name) => plan.lock.packages[name].file_name)];
    const selected = names.map((name) => {
      const member = members.find((entry) => entry === `pyodide/${name}`);
      if (!member) throw new Error(`Official archive is missing pyodide/${name}`);
      return member;
    });
    const extractRoot = join(cache, "extracted");
    await mkdir(extractRoot, { recursive: true });
    execFileSync("tar", ["-xf", archive, "-C", extractRoot, ...selected], { stdio: "inherit", windowsHide: true });
    source = join(extractRoot, "pyodide");
  }
  if (!existsSync(source)) {
    throw new Error(`Package source unavailable: ${source}. Use --download on an authorized network, or --from DIRECTORY with the official ${plan.version} distribution. No CDN fallback is used.`);
  }
  const sourceLock = await readJson(join(source, "pyodide-lock.json"));
  if (sourceLock.info.version !== plan.version ||
      sha256(await readFile(join(source, "pyodide-lock.json"))) !== sha256(await readFile(join(plan.npmRoot, "pyodide-lock.json")))) {
    throw new Error("Package source lockfile differs from the pinned official npm distribution.");
  }
  const files = [];
  for (const name of CORE_FILES) files.push(await inspectFile(plan.npmRoot, name));
  for (const name of plan.packages) {
    const entry = plan.lock.packages[name];
    files.push(await inspectFile(source, entry.file_name, entry.sha256));
  }
  const baseURL = `/python-runtime/v${plan.version}-${assetRevision(plan.version, plan.packages, files)}/`;
  const directory = join(root, "public", baseURL);
  await mkdir(directory, { recursive: true });
  // Keep the validated local package cache for subsequent preparation without a network.
  const packageCache = join(cache, "packages");
  await mkdir(packageCache, { recursive: true });
  if (resolve(source) !== resolve(packageCache)) await copyFile(join(source, "pyodide-lock.json"), join(packageCache, "pyodide-lock.json"));
  for (const file of files) {
    const isCore = CORE_FILES.includes(file.name);
    await copyFile(join(isCore ? plan.npmRoot : source, file.name), join(directory, file.name));
    if (!isCore && resolve(source) !== resolve(packageCache)) {
      await copyFile(join(source, file.name), join(packageCache, file.name));
    }
  }
  await copyFile(join(plan.npmRoot, "README.md"), join(directory, "PYODIDE-README.md"));
  await copyFile(join(root, "docs", "licenses", "pyodide-" + plan.version + "-LICENSE.txt"), join(directory, "PYODIDE-LICENSE.txt"));
  await writeFile(join(directory, "NOTICE.txt"), `Rootorial local Python assets\nPyodide ${plan.version}: https://github.com/pyodide/pyodide/tree/${plan.version}\nCore: official npm pyodide@${plan.version}, license MPL-2.0 (npm package metadata).\nCPython and bundled libraries retain their upstream licenses.\nPython package wheels are unmodified; their .dist-info license/metadata files are preserved.\nPackage SHA-256 values and versions: pyodide-lock.json.\nSource: https://github.com/pyodide/pyodide/releases/tag/${plan.version}\nPyodide license: https://github.com/pyodide/pyodide/blob/${plan.version}/LICENSE\nCPython license: https://docs.python.org/3.12/license.html\n`);
  const manifest = { version: plan.version, baseURL, packages: plan.packages, files };
  // Publish the pointer last: a partial/failed preparation never selects partial assets.
  const manifestPath = join(root, "public", "python-runtime", "manifest.json");
  await writeFile(manifestPath + ".tmp", JSON.stringify(manifest, null, 2) + "\n");
  await rename(manifestPath + ".tmp", manifestPath);
  await verifyPreparedAssets(root);
  console.log(`Python assets ready: ${baseURL} (${files.reduce((total, file) => total + file.bytes, 0)} bytes, ${plan.packages.length} packages). Browser execution needs no external runtime/package downloads.`);
} catch (error) {
  console.error(`Python asset preparation failed: ${error.message}${error.cause?.code ? " (" + error.cause.code + ")" : ""}`);
  process.exitCode = 1;
}

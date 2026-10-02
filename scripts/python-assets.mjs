import { createHash } from "node:crypto";
import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";

export const CORE_FILES = ["pyodide.js", "pyodide.asm.js", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"];
export const LESSON_PACKAGES = ["numpy", "matplotlib"];
export const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");
export const readJson = async (path) => JSON.parse(await readFile(path, "utf8"));

export function packageClosure(lock, roots = LESSON_PACKAGES) {
  const selected = new Set();
  function visit(name) {
    if (selected.has(name)) return;
    const entry = lock.packages[name];
    if (!entry || !/^[a-zA-Z0-9_.+-]+$/.test(entry.file_name) || !/^[a-f0-9]{64}$/.test(entry.sha256)) {
      throw new Error(`Invalid Pyodide package entry: ${name}`);
    }
    selected.add(name);
    for (const dependency of entry.depends) visit(dependency);
  }
  roots.forEach(visit);
  return [...selected].sort();
}

export async function assetPlan(root) {
  const project = await readJson(join(root, "package.json"));
  const npmRoot = join(root, "node_modules", "pyodide");
  const installed = await readJson(join(npmRoot, "package.json"));
  const version = project.devDependencies.pyodide;
  if (installed.version !== version || !/^\d+\.\d+\.\d+$/.test(version)) {
    throw new Error("Pyodide must be installed at the exact version pinned in package.json. Run npm ci.");
  }
  const lock = await readJson(join(npmRoot, "pyodide-lock.json"));
  if (lock.info.version !== version) throw new Error("Pyodide npm runtime/lockfile version mismatch.");
  return { version, npmRoot, lock, packages: packageClosure(lock) };
}

export async function inspectFile(directory, name, expectedHash) {
  const bytes = await readFile(join(directory, name));
  const hash = sha256(bytes);
  if (expectedHash && hash !== expectedHash) throw new Error(`SHA-256 mismatch: ${name}`);
  return { name, sha256: hash, bytes: bytes.length };
}

export function assetRevision(version, packages, files) {
  return sha256(JSON.stringify({ version, packages, files })).slice(0, 16);
}

export async function verifyPreparedAssets(root) {
  const plan = await assetPlan(root);
  const publicRoot = join(root, "public");
  const manifest = await readJson(join(publicRoot, "python-runtime", "manifest.json"));
  if (manifest.version !== plan.version || JSON.stringify(manifest.packages) !== JSON.stringify(plan.packages)) {
    throw new Error("Prepared Python assets do not match the pinned runtime/packages. Run npm run python:prepare.");
  }
  const files = [];
  for (const name of CORE_FILES) files.push(await inspectFile(plan.npmRoot, name));
  for (const name of plan.packages) {
    const entry = plan.lock.packages[name];
    files.push({ name: entry.file_name, sha256: entry.sha256, bytes: (manifest.files.find((f) => f.name === entry.file_name) ?? {}).bytes });
  }
  const expectedBase = `/python-runtime/v${plan.version}-${assetRevision(plan.version, plan.packages, files)}/`;
  if (manifest.baseURL !== expectedBase || JSON.stringify(manifest.files) !== JSON.stringify(files)) {
    throw new Error("Python asset manifest is inconsistent with the npm runtime or distribution lockfile.");
  }
  const directory = join(publicRoot, manifest.baseURL);
  for (const file of files) {
    const actual = await inspectFile(directory, file.name, file.sha256);
    if (actual.bytes !== file.bytes) throw new Error(`Size mismatch: ${file.name}`);
  }
  for (const name of ["NOTICE.txt", "PYODIDE-README.md", "PYODIDE-LICENSE.txt"]) {
    if ((await stat(join(directory, name))).size === 0) throw new Error(`Missing license/provenance notice: ${name}`);
  }
  return manifest;
}

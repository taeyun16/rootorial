import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, readFile, writeFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { assetRevision, CORE_FILES, inspectFile, packageClosure, sha256, verifyPreparedAssets } from "../scripts/python-assets.mjs";

test("resolves the complete package dependency closure and rejects unsafe filenames", () => {
  const entry = (depends = [], file_name = "safe.whl") => ({ depends, file_name, sha256: "a".repeat(64) });
  const lock = { packages: { numpy: entry(), matplotlib: entry(["numpy", "helper"]), helper: entry(["shared"]), shared: entry(["helper"]) } };
  assert.deepEqual(packageClosure(lock), ["helper", "matplotlib", "numpy", "shared"]);
  assert.throws(() => packageClosure({ packages: { numpy: entry([], "../outside.whl") } }, ["numpy"]), /Invalid/);
  assert.throws(() => packageClosure(lock, ["missing"]), /Invalid/);
});

test("verifies prepared assets, version alignment, package hashes and a content-derived URL", async (context) => {
  const root = await mkdtemp(join(tmpdir(), "rootorial-python-assets-"));
  context.after(() => rm(root, { recursive: true, force: true }));
  const npmRoot = join(root, "node_modules", "pyodide");
  await mkdir(npmRoot, { recursive: true });
  const lock = { info: { version: "0.27.7" }, packages: {
    numpy: { file_name: "numpy.whl", depends: [], sha256: sha256("numpy") },
    matplotlib: { file_name: "matplotlib.whl", depends: ["numpy"], sha256: sha256("matplotlib") },
  } };
  await writeFile(join(root, "package.json"), JSON.stringify({ devDependencies: { pyodide: "0.27.7" } }));
  await writeFile(join(npmRoot, "package.json"), JSON.stringify({ version: "0.27.7" }));
  for (const name of CORE_FILES) await writeFile(join(npmRoot, name), name === "pyodide-lock.json" ? JSON.stringify(lock) : name);
  const packages = packageClosure(lock);
  const files = await Promise.all(CORE_FILES.map((name) => inspectFile(npmRoot, name)));
  for (const name of packages) files.push({ name: name + ".whl", sha256: sha256(name), bytes: Buffer.byteLength(name) });
  const baseURL = `/python-runtime/v0.27.7-${assetRevision("0.27.7", packages, files)}/`;
  const target = join(root, "public", baseURL);
  await mkdir(target, { recursive: true });
  for (const name of CORE_FILES) await writeFile(join(target, name), await readFile(join(npmRoot, name)));
  for (const name of packages) await writeFile(join(target, name + ".whl"), name);
  for (const name of ["NOTICE.txt", "PYODIDE-README.md", "PYODIDE-LICENSE.txt"]) await writeFile(join(target, name), "licenses");
  const manifest = { version: "0.27.7", baseURL, packages, files };
  const manifestPath = join(root, "public", "python-runtime", "manifest.json");
  await writeFile(manifestPath, JSON.stringify(manifest));
  assert.deepEqual(await verifyPreparedAssets(root), manifest);
  await writeFile(join(target, "numpy.whl"), "corrupted");
  await assert.rejects(verifyPreparedAssets(root), /SHA-256 mismatch/);
  await writeFile(join(target, "numpy.whl"), "numpy");
  await writeFile(manifestPath, JSON.stringify({ ...manifest, baseURL: "/python-runtime/wrong/" }));
  await assert.rejects(verifyPreparedAssets(root), /manifest is inconsistent/);
  await writeFile(manifestPath, JSON.stringify({ ...manifest, version: "0.28.0" }));
  await assert.rejects(verifyPreparedAssets(root), /do not match/);
});

test("the worker and npm dependency keep the same exact runtime version and no CDN loader", async () => {
  const project = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
  const worker = await readFile(new URL("../public/pyodide-worker.js", import.meta.url), "utf8");
  assert.ok(worker.includes(`const PYODIDE_VERSION = "${project.devDependencies.pyodide}";`));
  assert.ok(!worker.includes("cdn.jsdelivr"));
});

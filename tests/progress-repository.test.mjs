import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { d1ProgressRepository, importProgressOnce, validateResume } from "../src/features/progress/progress-repository.ts";

function database() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec(readFileSync(new URL("../drizzle/0010_learning_progress.sql", import.meta.url), "utf8"));
  const db = {
    prepare(sql) {
      return { bind(...args) { return {
        async all() { return { results: sqlite.prepare(sql).all(...args) }; },
        async first() { return sqlite.prepare(sql).get(...args) ?? null; },
        run() { return sqlite.prepare(sql).run(...args); },
      }; } };
    },
    async batch(statements) {
      sqlite.exec("BEGIN");
      try { const result = statements.map((s) => s.run()); sqlite.exec("COMMIT"); return result; }
      catch (error) { sqlite.exec("ROLLBACK"); throw error; }
    },
  };
  return { sqlite, db };
}
const vector = "transformer-from-zero/vectors";
const shell = "linux-systems/shell-and-filesystem";

test("D1 keeps additive completions, newer resume and separate users on repeated/reordered writes", async () => {
  const { db, sqlite } = database();
  try {
    const repo = d1ProgressRepository(db, () => 50);
    await repo.merge("a", { completed: [vector], resume: { chapterId: vector, sectionId: "check", updatedAt: 20 } });
    await repo.merge("a", { completed: [shell], resume: { chapterId: vector, sectionId: "meaning", updatedAt: 10 } });
    await repo.merge("a", { completed: [vector], resume: null });
    assert.deepEqual((await repo.read("a")).completed, [vector, shell]);
    assert.equal((await repo.read("a")).resume.sectionId, "check");
    assert.deepEqual(await repo.read("b"), { completed: [], resume: null });
    assert.equal(sqlite.prepare("SELECT count(*) AS n FROM learning_completions").get().n, 2);
  } finally { sqlite.close(); }
});

test("legacy metadata imports once, never clears existing progress, and retries failed imports", async () => {
  const { db, sqlite } = database();
  try {
    const repo = d1ProgressRepository(db);
    await repo.merge("a", { completed: [shell], resume: null });
    let reads = 0;
    const legacy = async () => { reads++; return [vector]; };
    await importProgressOnce(repo, "a", legacy);
    await importProgressOnce(repo, "a", legacy);
    assert.equal(reads, 1);
    assert.deepEqual((await repo.read("a")).completed, [vector, shell]);
    await assert.rejects(importProgressOnce(repo, "b", async () => { throw Error("offline"); }));
    assert.equal(await repo.hasImported("b"), false);
    await importProgressOnce(repo, "b", legacy);
    assert.deepEqual((await repo.read("b")).completed, [vector]);
    sqlite.exec("CREATE TRIGGER reject_import BEFORE INSERT ON learning_progress_imports WHEN NEW.user_id = 'c' BEGIN SELECT RAISE(ABORT, 'test failure'); END;");
    await assert.rejects(repo.importLegacy("c", [vector]));
    assert.deepEqual((await repo.read("c")).completed, []);
    assert.equal(await repo.hasImported("c"), false);
  } finally { sqlite.close(); }
});

test("resume validation rejects unknown chapters, arbitrary URLs, and invalid times", () => {
  for (const point of [
    { chapterId: "unknown", sectionId: "check", updatedAt: 1 },
    { chapterId: vector, sectionId: "https://example.com", updatedAt: 1 },
    { chapterId: vector, sectionId: "check", updatedAt: -1 },
  ]) assert.throws(() => validateResume(point));
});

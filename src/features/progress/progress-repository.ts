import { mergeCompletedSlugs, validateCompletedSlugs } from "./progress.ts";

export type ResumePoint = { chapterId: string; sectionId: string; updatedAt: number };
export type ProgressSnapshot = { completed: string[]; resume: ResumePoint | null };
export type ProgressRepository = {
  read: (userId: string) => Promise<ProgressSnapshot>;
  hasImported: (userId: string) => Promise<boolean>;
  importLegacy: (userId: string, completed: string[]) => Promise<void>;
  merge: (userId: string, progress: ProgressSnapshot) => Promise<ProgressSnapshot>;
};

export function validateResume(value: unknown): ResumePoint | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "object" || Array.isArray(value)) throw new Error("Invalid resume point");
  const { chapterId, sectionId, updatedAt } = value as Record<string, unknown>;
  const [id] = validateCompletedSlugs([chapterId]);
  if (typeof sectionId !== "string" || !/^[a-zA-Z0-9][a-zA-Z0-9_-]{0,99}$/.test(sectionId)
    || typeof updatedAt !== "number" || !Number.isSafeInteger(updatedAt) || updatedAt < 0) {
    throw new Error("Invalid resume point");
  }
  return { chapterId: id, sectionId, updatedAt };
}

export function mergeProgress(...snapshots: ProgressSnapshot[]): ProgressSnapshot {
  const resume = snapshots.flatMap((s) => s.resume ? [s.resume] : [])
    .sort((a, b) => b.updatedAt - a.updatedAt || a.chapterId.localeCompare(b.chapterId) || a.sectionId.localeCompare(b.sectionId))[0] ?? null;
  return { completed: mergeCompletedSlugs(...snapshots.map((s) => s.completed)), resume };
}

/** Identity is supplied by the server boundary; this module has no Clerk dependency. */
export function d1ProgressRepository(database: D1Database, now = () => Date.now()): ProgressRepository {
  async function read(userId: string): Promise<ProgressSnapshot> {
    const [completed, resume] = await Promise.all([
      database.prepare("SELECT chapter_id FROM learning_completions WHERE user_id = ?").bind(userId).all<{ chapter_id: string }>(),
      database.prepare("SELECT chapter_id, section_id, updated_at FROM learning_resume WHERE user_id = ?").bind(userId).first<{ chapter_id: string; section_id: string; updated_at: number }>(),
    ]);
    return { completed: mergeCompletedSlugs(completed.results.map((r) => r.chapter_id)), resume: resume ? { chapterId: resume.chapter_id, sectionId: resume.section_id, updatedAt: resume.updated_at } : null };
  }
  return {
    read,
    async hasImported(userId) {
      return Boolean(await database.prepare("SELECT user_id FROM learning_progress_imports WHERE user_id = ?").bind(userId).first());
    },
    async importLegacy(userId, completed) {
      const statements = validateCompletedSlugs(completed).map((chapterId) =>
        database.prepare(`INSERT OR IGNORE INTO learning_completions (user_id, chapter_id, completed_at)
          SELECT ?, ?, ? WHERE NOT EXISTS (SELECT 1 FROM learning_progress_imports WHERE user_id = ?)`)
          .bind(userId, chapterId, now(), userId));
      statements.push(database.prepare("INSERT OR IGNORE INTO learning_progress_imports (user_id, imported_at) VALUES (?, ?)").bind(userId, now()));
      // D1 batches are atomic: the marker never survives a failed import.
      await database.batch(statements);
    },
    async merge(userId, progress) {
      const statements = validateCompletedSlugs(progress.completed).map((chapterId) =>
        database.prepare("INSERT OR IGNORE INTO learning_completions (user_id, chapter_id, completed_at) VALUES (?, ?, ?)").bind(userId, chapterId, now()));
      const resume = validateResume(progress.resume);
      if (resume) statements.push(database.prepare(`INSERT INTO learning_resume (user_id, chapter_id, section_id, updated_at)
        VALUES (?, ?, ?, ?) ON CONFLICT(user_id) DO UPDATE SET chapter_id = excluded.chapter_id,
        section_id = excluded.section_id, updated_at = excluded.updated_at
        WHERE excluded.updated_at > learning_resume.updated_at`).bind(userId, resume.chapterId, resume.sectionId, resume.updatedAt));
      if (statements.length) await database.batch(statements);
      return read(userId);
    },
  };
}

export async function importProgressOnce(repository: ProgressRepository, userId: string, readLegacy: () => Promise<string[]>) {
  if (!await repository.hasImported(userId)) await repository.importLegacy(userId, await readLegacy());
  return repository.read(userId);
}

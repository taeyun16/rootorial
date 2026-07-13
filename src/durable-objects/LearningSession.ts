import { DurableObject } from "cloudflare:workers";
import {
  learningSessionScopeMatches,
  type LearningLocale,
} from "../features/learning-analytics/learning-analytics";

type LearningSessionEnv = { DB: D1Database };
type SessionRow = {
  session_id: string;
  user_id: string;
  curriculum_slug: string;
  chapter_slug: string;
  locale: LearningLocale;
  started_at: number;
  last_seen_at: number;
  previous_visible: number;
  previous_active: number;
  dwell_ms: number;
  active_ms: number;
  heartbeat_count: number;
  finalized_at: number | null;
  ended_at: number | null;
  exported_at: number | null;
};

const MAX_CREDITED_INTERVAL_MS = 30_000;
const SESSION_ALARM_DELAY_MS = 90_000;

export class LearningSession extends DurableObject<LearningSessionEnv> {
  constructor(ctx: DurableObjectState, env: LearningSessionEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS session_state (
          id INTEGER PRIMARY KEY CHECK (id = 1),
          session_id TEXT NOT NULL,
          user_id TEXT NOT NULL,
          curriculum_slug TEXT NOT NULL,
          chapter_slug TEXT NOT NULL,
          locale TEXT NOT NULL,
          started_at INTEGER NOT NULL,
          last_seen_at INTEGER NOT NULL,
          previous_visible INTEGER NOT NULL,
          previous_active INTEGER NOT NULL,
          dwell_ms INTEGER NOT NULL DEFAULT 0,
          active_ms INTEGER NOT NULL DEFAULT 0,
          heartbeat_count INTEGER NOT NULL DEFAULT 0,
          finalized_at INTEGER,
          ended_at INTEGER,
          exported_at INTEGER
        )
      `);
    });
  }

  async init(input: {
    sessionId: string;
    userId: string;
    curriculumSlug: string;
    chapterSlug: string;
    locale: LearningLocale;
    now: number;
  }) {
    this.ctx.storage.sql.exec(
      `INSERT OR IGNORE INTO session_state (
        id, session_id, user_id, curriculum_slug, chapter_slug, locale,
        started_at, last_seen_at, previous_visible, previous_active
      ) VALUES (1, ?, ?, ?, ?, ?, ?, ?, 1, 1)`,
      input.sessionId, input.userId, input.curriculumSlug, input.chapterSlug,
      input.locale, input.now, input.now,
    );
    await this.ctx.storage.setAlarm(input.now + SESSION_ALARM_DELAY_MS);
    return { ok: true as const };
  }

  async heartbeat(input: {
    userId: string;
    now: number;
    visible: boolean;
    active: boolean;
    curriculumSlug?: string;
    chapterSlug?: string;
  }) {
    const row = this.read();
    if (!row || row.user_id !== input.userId) throw new Error("Learning session identity mismatch");
    if (row.finalized_at) {
      return { ok: false as const, closed: true as const, scopeMismatch: false as const };
    }
    if (
      input.curriculumSlug !== undefined ||
      input.chapterSlug !== undefined
    ) {
      const completeScope = input.curriculumSlug !== undefined && input.chapterSlug !== undefined;
      if (
        !completeScope ||
        !learningSessionScopeMatches(
          { curriculumSlug: row.curriculum_slug, chapterSlug: row.chapter_slug },
          { curriculumSlug: input.curriculumSlug!, chapterSlug: input.chapterSlug! },
        )
      ) {
        return { ok: false as const, closed: false as const, scopeMismatch: true as const };
      }
    }
    const delta = Math.max(0, Math.min(input.now - row.last_seen_at, MAX_CREDITED_INTERVAL_MS));
    this.ctx.storage.sql.exec(
      `UPDATE session_state SET
        last_seen_at = ?,
        previous_visible = ?,
        previous_active = ?,
        dwell_ms = dwell_ms + ?,
        active_ms = active_ms + ?,
        heartbeat_count = heartbeat_count + 1
       WHERE id = 1`,
      input.now,
      input.visible ? 1 : 0,
      input.active ? 1 : 0,
      row.previous_visible ? delta : 0,
      row.previous_active ? delta : 0,
    );
    await this.ctx.storage.setAlarm(input.now + SESSION_ALARM_DELAY_MS);
    return { ok: true as const, closed: false as const, scopeMismatch: false as const };
  }

  async alarm() {
    const row = this.read();
    if (!row) return;
    if (!row.finalized_at) {
      const now = Date.now();
      const delta = Math.max(0, Math.min(now - row.last_seen_at, MAX_CREDITED_INTERVAL_MS));
      const endedAt = row.last_seen_at + delta;
      this.ctx.storage.sql.exec(
        `UPDATE session_state SET
          dwell_ms = dwell_ms + ?, active_ms = active_ms + ?,
          ended_at = ?, finalized_at = ?
         WHERE id = 1`,
        row.previous_visible ? delta : 0,
        row.previous_active ? delta : 0,
        endedAt,
        now,
      );
    }
    await this.exportToD1();
  }

  private read() {
    return this.ctx.storage.sql.exec<SessionRow>("SELECT * FROM session_state WHERE id = 1").toArray()[0] ?? null;
  }

  private async exportToD1() {
    const row = this.read();
    if (!row?.finalized_at || !row.ended_at || row.exported_at) return;
    const elapsedSeconds = Math.max(0, Math.round((row.ended_at - row.started_at) / 1000));
    const dwellSeconds = Math.min(elapsedSeconds, Math.round(row.dwell_ms / 1000));
    const activeSeconds = Math.min(dwellSeconds, Math.round(row.active_ms / 1000));
    await this.env.DB.prepare(`
      INSERT INTO learning_sessions (
        id, user_id, curriculum_slug, chapter_slug, locale, started_at, ended_at,
        elapsed_seconds, dwell_seconds, active_seconds, heartbeat_count, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        ended_at = excluded.ended_at,
        elapsed_seconds = excluded.elapsed_seconds,
        dwell_seconds = excluded.dwell_seconds,
        active_seconds = excluded.active_seconds,
        heartbeat_count = excluded.heartbeat_count,
        updated_at = excluded.updated_at
    `).bind(
      row.session_id, row.user_id, row.curriculum_slug, row.chapter_slug, row.locale,
      row.started_at, row.ended_at, elapsedSeconds, dwellSeconds, activeSeconds,
      row.heartbeat_count, row.started_at, row.finalized_at,
    ).run();
    this.ctx.storage.sql.exec("UPDATE session_state SET exported_at = ? WHERE id = 1", Date.now());
  }
}

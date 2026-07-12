import { DurableObject } from "cloudflare:workers";
import { LEARNING_ONLINE_WINDOW_MS } from "../features/learning-analytics/learning-analytics";

type PresenceRow = { count: number };
type NextExpiryRow = { expires_at: number | null };
type LearningPresenceEnv = Record<string, never>;

export class LearningPresence extends DurableObject<LearningPresenceEnv> {
  constructor(ctx: DurableObjectState, env: LearningPresenceEnv) {
    super(ctx, env);
    ctx.blockConcurrencyWhile(async () => {
      this.ctx.storage.sql.exec(`
        CREATE TABLE IF NOT EXISTS presence (
          user_id TEXT PRIMARY KEY,
          expires_at INTEGER NOT NULL
        );
        CREATE INDEX IF NOT EXISTS presence_expires_at_idx ON presence (expires_at);
      `);
    });
  }

  async touch(userId: string, now: number) {
    this.ctx.storage.sql.exec(
      `INSERT INTO presence (user_id, expires_at) VALUES (?, ?)
       ON CONFLICT(user_id) DO UPDATE SET expires_at = excluded.expires_at`,
      userId,
      now + LEARNING_ONLINE_WINDOW_MS,
    );
    await this.scheduleNextExpiry();
  }

  async count(now: number) {
    this.ctx.storage.sql.exec("DELETE FROM presence WHERE expires_at <= ?", now);
    const count = this.ctx.storage.sql.exec<PresenceRow>("SELECT count(*) AS count FROM presence").one().count;
    await this.scheduleNextExpiry();
    return count;
  }

  async alarm() {
    this.ctx.storage.sql.exec("DELETE FROM presence WHERE expires_at <= ?", Date.now());
    await this.scheduleNextExpiry();
  }

  private async scheduleNextExpiry() {
    const next = this.ctx.storage.sql.exec<NextExpiryRow>(
      "SELECT min(expires_at) AS expires_at FROM presence",
    ).one().expires_at;
    if (next === null) await this.ctx.storage.deleteAlarm();
    else await this.ctx.storage.setAlarm(next);
  }
}

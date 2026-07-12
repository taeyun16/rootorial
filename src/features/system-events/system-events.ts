import { and, eq } from "drizzle-orm";
import { getDb } from "../../../db";
import { notificationDeliveries, systemEvents } from "../../../db/schema";
import {
  discordMessageForEvent,
  discordThreadIdForEvent,
} from "./system-event-format";

export { discordMessageForEvent, systemEventRows } from "./system-event-format";
export type { SystemEventPayload, SystemEventType } from "./system-event-format";

export type SystemEventQueueBody = { eventId: string };

export type SystemEventBindings = Env & {
  DISCORD_WEBHOOK_URL?: string;
  CLERK_WEBHOOK_SIGNING_SECRET?: string;
};

export async function enqueueSystemEvent(
  database: D1Database,
  queue: Queue<SystemEventQueueBody> | undefined,
  eventId: string,
) {
  if (!queue) return false;
  try {
    await queue.send({ eventId });
    await database.prepare(`
      UPDATE system_events
      SET status = 'queued', queued_at = ?
      WHERE id = ? AND status = 'pending'
    `).bind(Date.now(), eventId).run();
    return true;
  } catch {
    console.error("[system-events:enqueue] queue delivery failed", { eventId });
    return false;
  }
}

export async function dispatchPendingSystemEvents(env: SystemEventBindings) {
  if (!env.DB || !env.SYSTEM_EVENTS_QUEUE) return;
  const pending = await env.DB.prepare(`
    SELECT id FROM system_events
    WHERE status = 'pending'
    ORDER BY created_at ASC
    LIMIT 100
  `).all<{ id: string }>();
  for (const row of pending.results) {
    await enqueueSystemEvent(env.DB, env.SYSTEM_EVENTS_QUEUE, row.id);
  }
}

function queueBody(value: unknown): SystemEventQueueBody | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const eventId = (value as Record<string, unknown>).eventId;
  return typeof eventId === "string" && eventId.length > 0 && eventId.length <= 200
    ? { eventId }
    : null;
}

function discordWebhookUrl(value: string | undefined, threadId: string | undefined) {
  if (!value || !threadId || !/^\d{17,20}$/.test(threadId)) return null;
  try {
    const url = new URL(value);
    if (url.protocol !== "https:" || url.hostname !== "discord.com") return null;
    if (!/^\/api\/webhooks\/[^/]+\/[^/]+$/.test(url.pathname)) return null;
    url.searchParams.set("wait", "true");
    url.searchParams.set("thread_id", threadId);
    return url;
  } catch {
    return null;
  }
}

function retryDelay(attempts: number) {
  return Math.min(900, 30 * 2 ** Math.max(0, attempts - 1));
}

async function markDead(database: D1Database, eventId: string, errorCode: string) {
  const now = Date.now();
  await database.batch([
    database.prepare(`
      UPDATE system_events
      SET status = 'dead', last_error_code = ?, attempt_count = attempt_count + 1
      WHERE id = ? AND status != 'delivered'
    `).bind(errorCode, eventId),
    database.prepare(`
      UPDATE notification_deliveries
      SET status = 'failed', attempts = attempts + 1, last_attempt_at = ?
      WHERE event_id = ? AND channel = 'discord' AND status != 'sent'
    `).bind(now, eventId),
  ]);
}

async function deliverMessage(
  message: Message<unknown>,
  env: SystemEventBindings,
) {
  const body = queueBody(message.body);
  if (!body) {
    console.error("[system-events:consume] invalid queue body");
    message.ack();
    return;
  }

  const db = getDb(env.DB);
  const [event] = await db.select().from(systemEvents)
    .where(eq(systemEvents.id, body.eventId)).limit(1);
  if (!event || event.status === "delivered") {
    message.ack();
    return;
  }
  const [delivery] = await db.select().from(notificationDeliveries).where(and(
    eq(notificationDeliveries.eventId, body.eventId),
    eq(notificationDeliveries.channel, "discord"),
  )).limit(1);
  if (delivery?.status === "sent") {
    await db.update(systemEvents).set({ status: "delivered", deliveredAt: delivery.deliveredAt ?? Date.now() })
      .where(eq(systemEvents.id, body.eventId));
    message.ack();
    return;
  }

  const threadId = discordThreadIdForEvent(event.type, env);
  const webhook = discordWebhookUrl(env.DISCORD_WEBHOOK_URL, threadId);
  if (!webhook) {
    const errorCode = threadId && /^\d{17,20}$/.test(threadId)
      ? "discord_webhook_invalid"
      : "discord_thread_invalid";
    await markDead(env.DB, body.eventId, errorCode);
    console.error("[system-events:consume] Discord routing is unavailable", { eventId: body.eventId });
    message.ack();
    return;
  }

  let response: Response;
  try {
    response = await fetch(webhook, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(discordMessageForEvent({
        id: event.id,
        type: event.type,
        entityId: event.entityId,
        payloadJson: event.payloadJson,
        createdAt: event.createdAt,
      })),
    });
  } catch {
    await markDeliveryFailure(env.DB, body.eventId, message.attempts, "discord_network_error");
    message.retry({ delaySeconds: retryDelay(message.attempts) });
    return;
  }

  if (!response.ok) {
    await markDeliveryFailure(env.DB, body.eventId, message.attempts, `discord_http_${response.status}`);
    message.retry({ delaySeconds: retryDelay(message.attempts) });
    return;
  }

  const responseBody: { id?: string } = await response.json<{ id?: string }>().catch(() => ({}));
  const now = Date.now();
  await env.DB.batch([
    env.DB.prepare(`
      UPDATE notification_deliveries
      SET status = 'sent', attempts = ?, last_attempt_at = ?, external_message_id = ?, delivered_at = ?
      WHERE event_id = ? AND channel = 'discord'
    `).bind(message.attempts, now, responseBody.id ?? null, now, body.eventId),
    env.DB.prepare(`
      UPDATE system_events
      SET status = 'delivered', attempt_count = ?, last_error_code = NULL, delivered_at = ?
      WHERE id = ?
    `).bind(message.attempts, now, body.eventId),
  ]);
  message.ack();
}

async function markDeliveryFailure(
  database: D1Database,
  eventId: string,
  attempts: number,
  errorCode: string,
) {
  const now = Date.now();
  await database.batch([
    database.prepare(`
      UPDATE notification_deliveries
      SET status = 'failed', attempts = ?, last_attempt_at = ?
      WHERE event_id = ? AND channel = 'discord' AND status != 'sent'
    `).bind(attempts, now, eventId),
    database.prepare(`
      UPDATE system_events
      SET attempt_count = ?, last_error_code = ?
      WHERE id = ? AND status != 'delivered'
    `).bind(attempts, errorCode, eventId),
  ]);
}

export async function consumeSystemEventBatch(
  batch: MessageBatch<unknown>,
  env: SystemEventBindings,
) {
  const isDeadLetterQueue = batch.queue === "rootorial-system-events-dlq";
  for (const message of batch.messages) {
    const body = queueBody(message.body);
    if (isDeadLetterQueue) {
      if (body) await markDead(env.DB, body.eventId, "queue_retries_exhausted");
      console.error("[system-events:dlq] event exhausted retries", { eventId: body?.eventId });
      message.ack();
      continue;
    }
    try {
      await deliverMessage(message, env);
    } catch {
      console.error("[system-events:consume] unexpected delivery failure", { eventId: body?.eventId });
      message.retry({ delaySeconds: retryDelay(message.attempts) });
    }
  }
}

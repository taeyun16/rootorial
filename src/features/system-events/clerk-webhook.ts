import { verifyWebhook } from "@clerk/backend/webhooks";
import { enqueueSystemEvent, systemEventRows, type SystemEventBindings } from "./system-events";

const WEBHOOK_PATH = "/api/webhooks/clerk";

function response(status: number, message = "") {
  return new Response(status === 204 ? null : message, {
    status,
    headers: {
      "cache-control": "no-store",
      "content-type": "text/plain; charset=utf-8",
    },
  });
}

export async function handleClerkWebhook(
  request: Request,
  env: SystemEventBindings,
) {
  const url = new URL(request.url);
  if (url.pathname !== WEBHOOK_PATH) return null;
  if (request.method !== "POST") return response(405, "Method not allowed");
  if (!env.CLERK_WEBHOOK_SIGNING_SECRET) {
    console.error("[clerk-webhook] signing secret is not configured");
    return response(503, "Webhook is not configured");
  }

  let event: Awaited<ReturnType<typeof verifyWebhook>>;
  try {
    event = await verifyWebhook(request, {
      signingSecret: env.CLERK_WEBHOOK_SIGNING_SECRET,
    });
  } catch {
    console.warn("[clerk-webhook] signature verification failed");
    return response(400, "Invalid webhook");
  }

  if (event.type !== "user.created") return response(204);
  const webhookId = request.headers.get("svix-id")?.trim();
  const userId = event.data.id;
  if (!webhookId || !userId) return response(400, "Invalid webhook payload");

  const rows = systemEventRows({
    id: `clerk:${webhookId}`,
    type: "user.created",
    actorUserId: userId,
    entityId: userId,
    payload: { source: "clerk" },
    createdAt: Date.now(),
  });
  try {
    await env.DB.batch([
      env.DB.prepare(`
        INSERT OR IGNORE INTO system_events
          (id, type, actor_user_id, entity_id, payload_json, status, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?)
      `).bind(
        rows.event.id,
        rows.event.type,
        rows.event.actorUserId,
        rows.event.entityId,
        rows.event.payloadJson,
        rows.event.createdAt,
      ),
      env.DB.prepare(`
        INSERT OR IGNORE INTO notification_deliveries
          (event_id, channel, status)
        VALUES (?, 'discord', 'pending')
      `).bind(rows.event.id),
    ]);
    await enqueueSystemEvent(env.DB, env.SYSTEM_EVENTS_QUEUE, rows.event.id);
    return response(204);
  } catch {
    console.error("[clerk-webhook] event persistence failed", { eventId: rows.event.id });
    return response(500, "Webhook processing failed");
  }
}

export const CLERK_WEBHOOK_PATH = WEBHOOK_PATH;

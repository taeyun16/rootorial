import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleClerkWebhook } from "./features/system-events/clerk-webhook";
import { handleLinuxExperimentAsset } from "./features/linux-runtime/linux-assets";
import {
  consumeSystemEventBatch,
  dispatchPendingSystemEvents,
  type SystemEventBindings,
} from "./features/system-events/system-events";
import { renderLlmsText } from "./features/llms/llms";
import {
  loadPublicationCatalog,
  publishDueContent,
} from "./features/publication/publication.server";

export { LearningSession } from "./durable-objects/LearningSession";
export { LearningPresence } from "./durable-objects/LearningPresence";

const startFetch = createStartHandler(defaultStreamHandler);

async function handleLlmsText(
  request: Request,
  env: SystemEventBindings,
): Promise<Response | null> {
  if (new URL(request.url).pathname !== "/llms.txt") return null;

  const headers = new Headers({
    "Cache-Control": "no-store",
    "Content-Type": "text/plain; charset=utf-8",
    "X-Content-Type-Options": "nosniff",
  });

  if (request.method !== "GET" && request.method !== "HEAD") {
    headers.set("Allow", "GET, HEAD");
    return new Response("Method Not Allowed\n", { status: 405, headers });
  }

  const catalog = await loadPublicationCatalog(env.DB);
  const body = catalog
    ? renderLlmsText(catalog)
    : "# Rootorial\n\n> The public publication catalog is temporarily unavailable.\n";

  return new Response(request.method === "HEAD" ? null : body, {
    status: catalog ? 200 : 503,
    headers,
  });
}

export default {
  async fetch(request: Request, env: SystemEventBindings) {
    const linuxAssetResponse = await handleLinuxExperimentAsset(request);
    if (linuxAssetResponse) return linuxAssetResponse;
    const llmsResponse = await handleLlmsText(request, env);
    if (llmsResponse) return llmsResponse;
    const webhookResponse = await handleClerkWebhook(request, env);
    return webhookResponse ?? startFetch(request);
  },
  async queue(batch: MessageBatch<unknown>, env: SystemEventBindings) {
    await consumeSystemEventBatch(batch, env);
  },
  async scheduled(
    _controller: ScheduledController,
    env: SystemEventBindings,
    context: ExecutionContext,
  ) {
    context.waitUntil(dispatchPendingSystemEvents(env));
    context.waitUntil(publishDueContent(env.DB));
  },
} satisfies ExportedHandler<SystemEventBindings>;

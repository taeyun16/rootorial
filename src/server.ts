import { createStartHandler, defaultStreamHandler } from "@tanstack/react-start/server";
import { handleClerkWebhook } from "./features/system-events/clerk-webhook";
import {
  consumeSystemEventBatch,
  dispatchPendingSystemEvents,
  type SystemEventBindings,
} from "./features/system-events/system-events";
import { publishDueContent } from "./features/publication/publication.server";

export { LearningSession } from "./durable-objects/LearningSession";
export { LearningPresence } from "./durable-objects/LearningPresence";

const startFetch = createStartHandler(defaultStreamHandler);

export default {
  async fetch(request: Request, env: SystemEventBindings) {
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

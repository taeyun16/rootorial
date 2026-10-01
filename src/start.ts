import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createCsrfMiddleware, createMiddleware, createStart } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

const isolatedLearning = import.meta.env.DEV && import.meta.env.MODE === "content-preview";
const localWriteBoundary = createMiddleware().server(({ request, next }) => {
  if (isolatedLearning && !["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    return new Response("Local learning does not send server writes.", { status: 403 });
  }
  return next();
});

export const startInstance = createStart(() => ({
  // Clerk only establishes identity here. Public learning routes remain open;
  // write actions will opt into auth checks at their server boundary.
  requestMiddleware: [
    localWriteBoundary,
    csrfMiddleware,
    ...(!isolatedLearning && process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
      ? [clerkMiddleware()]
      : []),
  ],
}));

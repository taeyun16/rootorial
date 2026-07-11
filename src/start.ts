import { clerkMiddleware } from "@clerk/tanstack-react-start/server";
import { createCsrfMiddleware, createStart } from "@tanstack/react-start";

const csrfMiddleware = createCsrfMiddleware({
  filter: (context) => context.handlerType === "serverFn",
});

export const startInstance = createStart(() => ({
  // Clerk only establishes identity here. Public learning routes remain open;
  // write actions will opt into auth checks at their server boundary.
  requestMiddleware: [
    csrfMiddleware,
    ...(process.env.CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
      ? [clerkMiddleware()]
      : []),
  ],
}));

import { ClerkProvider } from "@clerk/tanstack-react-start";
import { ScriptOnce } from "@tanstack/react-router";
import { getGlobalStartContext } from "@tanstack/react-start";
import { createContext, useContext } from "react";

declare global {
  interface Window {
    __rootorialClerkEnabled?: boolean;
  }
}

const ClerkEnabledContext = createContext(false);

function clerkIsEnabled() {
  if (typeof window !== "undefined") {
    return window.__rootorialClerkEnabled === true;
  }

  try {
    const context = getGlobalStartContext() as
      | {
          clerkInitialState?: {
            __internal_clerk_state?: { __publishableKey?: string };
          };
        }
      | undefined;

    return Boolean(
      context?.clerkInitialState?.__internal_clerk_state?.__publishableKey,
    );
  } catch {
    return false;
  }
}

export function ClerkBoundary({ children }: { children: React.ReactNode }) {
  const enabled = clerkIsEnabled();
  const content = enabled ? <ClerkProvider>{children}</ClerkProvider> : children;

  return (
    <ClerkEnabledContext.Provider value={enabled}>
      <ScriptOnce>{`window.__rootorialClerkEnabled = ${JSON.stringify(enabled)};`}</ScriptOnce>
      {content}
    </ClerkEnabledContext.Provider>
  );
}

export function useClerkEnabled() {
  return useContext(ClerkEnabledContext);
}

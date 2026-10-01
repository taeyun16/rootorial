import { useAuth } from "@clerk/tanstack-react-start";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { accountProgressKey, anonymousProgressKey, parseStoredProgress } from "../features/progress/progress";
import { getMyProgress, syncMyProgress } from "../features/progress/progress.functions";
import { ProgressClient, type ClientProgress, type ProgressStatus, type ProgressTransport } from "../features/progress/progress-client";
import type { ResumePoint } from "../features/progress/progress-repository";
import { useClerkEnabled } from "./ClerkBoundary";

export type { ProgressStatus };
type ProgressContextValue = ClientProgress & {
  markComplete: (slug: string) => Promise<void>;
  saveResume: (point: ResumePoint) => Promise<void>;
  retry: () => void;
  resetLocal?: () => boolean;
};
const initial: ClientProgress = { completed: [], resume: null, status: "loading", storageAvailable: true };
const ProgressContext = createContext<ProgressContextValue | null>(null);

// Access can itself throw (blocked storage); let the adapter report that truthfully.
const browserStorage = {
  getItem: (key: string) => window.localStorage.getItem(key),
  setItem: (key: string, value: string) => window.localStorage.setItem(key, value),
  removeItem: (key: string) => window.localStorage.removeItem(key),
};

function StoredProgressProvider({ children, storageKey, remote }: { children: ReactNode; storageKey: string; remote?: ProgressTransport }) {
  const [state, setState] = useState<ClientProgress>(initial);
  const clientRef = useRef<ProgressClient | null>(null);
  useEffect(() => {
    const client = new ProgressClient(browserStorage, storageKey, remote, setState);
    clientRef.current = client;
    let anonymousRaw: string | null = null;
    if (remote) {
      try { anonymousRaw = browserStorage.getItem(anonymousProgressKey); } catch { /* The adapter reports storage failure. */ }
    }
    const clearImportedAnonymous = () => {
      if (!remote || client.state.status !== "synced" || anonymousRaw === null) return;
      try {
        // Do not remove anonymous work added by another tab during the request.
        if (browserStorage.getItem(anonymousProgressKey) === anonymousRaw) browserStorage.removeItem(anonymousProgressKey);
      } catch { /* Safe to import again; completion inserts are idempotent. */ }
    };
    void client.start({ completed: parseStoredProgress(anonymousRaw), resume: null }).then(clearImportedAnonymous);
    const retry = () => { void client.flush().then(clearImportedAnonymous); };
    window.addEventListener("online", retry);
    const interval = remote ? window.setInterval(() => { if (navigator.onLine) retry(); }, 15_000) : null;
    return () => {
      client.dispose();
      clientRef.current = null;
      window.removeEventListener("online", retry);
      if (interval !== null) window.clearInterval(interval);
    };
  }, [remote, storageKey]);
  const markComplete = useCallback((slug: string) => clientRef.current?.complete(slug) ?? Promise.resolve(), []);
  const saveResume = useCallback((point: ResumePoint) => clientRef.current?.resume(point) ?? Promise.resolve(), []);
  const retry = useCallback(() => { void clientRef.current?.retry(); }, []);
  return <ProgressContext.Provider value={{ ...state, markComplete, saveResume, retry, resetLocal: remote ? undefined : () => clientRef.current?.reset() ?? false }}>{children}</ProgressContext.Provider>;
}

function AccountProgressProvider({ children, userId }: { children: ReactNode; userId: string }) {
  const remote = useMemo<ProgressTransport>(() => ({
    read: () => getMyProgress({ data: { expectedUserId: userId } }),
    merge: (snapshot) => syncMyProgress({ data: { expectedUserId: userId, completedSlugs: snapshot.completed, resume: snapshot.resume } }),
  }), [userId]);
  return <StoredProgressProvider storageKey={accountProgressKey(userId)} remote={remote}>{children}</StoredProgressProvider>;
}

function IdentityProgressProvider({ children }: { children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  if (!isLoaded) return <ProgressContext.Provider value={{ ...initial, markComplete: async () => {}, saveResume: async () => {}, retry: () => {} }}>{children}</ProgressContext.Provider>;
  if (isSignedIn && userId) return <AccountProgressProvider key={userId} userId={userId}>{children}</AccountProgressProvider>;
  return <StoredProgressProvider key="anonymous" storageKey={anonymousProgressKey}>{children}</StoredProgressProvider>;
}

export function ProgressProvider({ children, isolated = false }: { children: ReactNode; isolated?: boolean }) {
  const clerkEnabled = useClerkEnabled();
  if (isolated) return <StoredProgressProvider key="rehearsal" storageKey="rootorial-progress:rehearsal:v1">{children}</StoredProgressProvider>;
  return clerkEnabled ? <IdentityProgressProvider>{children}</IdentityProgressProvider> : <StoredProgressProvider storageKey={anonymousProgressKey}>{children}</StoredProgressProvider>;
}

export function useProgress() {
  const progress = useContext(ProgressContext);
  if (!progress) throw new Error("useProgress must be inside ProgressProvider");
  return progress;
}

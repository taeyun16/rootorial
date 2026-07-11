import { useAuth } from "@clerk/tanstack-react-start";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  accountProgressKey,
  anonymousProgressKey,
  mergeCompletedSlugs,
  parseStoredProgress,
  validateCompletedSlugs,
} from "../features/progress/progress";
import {
  getMyProgress,
  syncMyProgress,
} from "../features/progress/progress.functions";
import { useClerkEnabled } from "./ClerkBoundary";

export type ProgressStatus =
  | "loading"
  | "local"
  | "syncing"
  | "synced"
  | "error";

type ProgressContextValue = {
  completed: string[];
  markComplete: (slug: string) => Promise<void>;
  status: ProgressStatus;
  retry: () => void;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

function readLocalProgress(key: string) {
  try {
    return parseStoredProgress(window.localStorage.getItem(key));
  } catch {
    return [];
  }
}

function writeLocalProgress(key: string, completed: string[]) {
  try {
    window.localStorage.setItem(key, JSON.stringify(completed));
  } catch {
    // Progress remains available in React state when storage is unavailable.
  }
}

function removeLocalProgress(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // A later successful sync can retry cleanup in storage-constrained browsers.
  }
}

function LocalProgressProvider({ children }: { children: React.ReactNode }) {
  const [completed, setCompleted] = useState<string[]>([]);

  useEffect(() => {
    setCompleted(readLocalProgress(anonymousProgressKey));
  }, []);

  const markComplete = useCallback(async (slug: string) => {
    const [validatedSlug] = validateCompletedSlugs([slug]);

    setCompleted((current) => {
      const next = mergeCompletedSlugs(current, [validatedSlug]);
      writeLocalProgress(anonymousProgressKey, next);
      return next;
    });
  }, []);

  return (
    <ProgressContext.Provider
      value={{ completed, markComplete, status: "local", retry: () => {} }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

function ClerkProgressProvider({ children }: { children: React.ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const [completed, setCompleted] = useState<string[]>([]);
  const [status, setStatus] = useState<ProgressStatus>("loading");
  const [retryVersion, setRetryVersion] = useState(0);
  const completedRef = useRef(completed);
  const activeUserIdRef = useRef<string | undefined>(undefined);

  useEffect(() => {
    activeUserIdRef.current = isSignedIn ? userId : undefined;
  }, [isSignedIn, userId]);

  useEffect(() => {
    completedRef.current = completed;
  }, [completed]);

  useEffect(() => {
    if (!isLoaded) return;

    if (!isSignedIn || !userId) {
      const local = readLocalProgress(anonymousProgressKey);
      completedRef.current = local;
      setCompleted(local);
      setStatus("local");
      return;
    }

    let cancelled = false;
    const syncInitialProgress = async () => {
      const anonymous = readLocalProgress(anonymousProgressKey);
      const accountKey = accountProgressKey(userId);
      const cached = readLocalProgress(accountKey);

      setStatus("loading");

      try {
        const remote = await getMyProgress();
        const merged = mergeCompletedSlugs(
          remote.completed,
          cached,
          anonymous,
        );

        const synced =
          merged.length === remote.completed.length
            ? remote.completed
            : (await syncMyProgress({ data: { completedSlugs: merged } }))
                .completed;

        if (cancelled) return;

        const next = mergeCompletedSlugs(merged, synced);
        writeLocalProgress(accountKey, next);
        removeLocalProgress(anonymousProgressKey);
        completedRef.current = next;
        setCompleted(next);
        setStatus("synced");
      } catch {
        if (cancelled) return;

        const fallback = mergeCompletedSlugs(cached, anonymous);
        completedRef.current = fallback;
        setCompleted(fallback);
        setStatus("error");
      }
    };

    void syncInitialProgress();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, retryVersion, userId]);

  const markComplete = useCallback(
    async (slug: string) => {
      const [validatedSlug] = validateCompletedSlugs([slug]);

      if (!isSignedIn || !userId) {
        const next = mergeCompletedSlugs(
          readLocalProgress(anonymousProgressKey),
          [validatedSlug],
        );
        writeLocalProgress(anonymousProgressKey, next);
        completedRef.current = next;
        setCompleted(next);
        setStatus("local");
        return;
      }

      const next = mergeCompletedSlugs(completedRef.current, [validatedSlug]);
      const accountKey = accountProgressKey(userId);
      writeLocalProgress(accountKey, next);
      completedRef.current = next;
      setCompleted(next);
      setStatus("syncing");

      try {
        const syncingUserId = userId;
        const remote = await syncMyProgress({
          data: { completedSlugs: next },
        });
        if (activeUserIdRef.current !== syncingUserId) return;

        const synced = mergeCompletedSlugs(next, remote.completed);
        writeLocalProgress(accountKey, synced);
        completedRef.current = synced;
        setCompleted(synced);
        setStatus("synced");
      } catch {
        if (activeUserIdRef.current === userId) {
          setStatus("error");
        }
      }
    },
    [isSignedIn, userId],
  );

  const retry = useCallback(() => {
    if (isSignedIn && userId) {
      setRetryVersion((version) => version + 1);
    }
  }, [isSignedIn, userId]);

  return (
    <ProgressContext.Provider value={{ completed, markComplete, status, retry }}>
      {children}
    </ProgressContext.Provider>
  );
}

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const clerkEnabled = useClerkEnabled();

  return clerkEnabled ? (
    <ClerkProgressProvider>{children}</ClerkProgressProvider>
  ) : (
    <LocalProgressProvider>{children}</LocalProgressProvider>
  );
}

export function useProgress() {
  const progress = useContext(ProgressContext);
  if (!progress) {
    throw new Error("useProgress는 ProgressProvider 안에서 사용해야 합니다.");
  }

  return progress;
}

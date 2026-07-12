import { useAuth } from "@clerk/tanstack-react-start";
import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { useLocale } from "../features/localization/localization";
import {
  LEARNING_ACTIVE_WINDOW_MS,
  LEARNING_HEARTBEAT_INTERVAL_MS,
} from "../features/learning-analytics/learning-analytics";
import {
  recordConceptAttempt,
  recordLearningHeartbeat,
  startLearningSession,
} from "../features/learning-analytics/learning-analytics.functions";
import { useClerkEnabled } from "./ClerkBoundary";

type LearningAnalyticsContextValue = {
  recordAnswers: (answers: Record<string, string>) => void;
};

const noOpValue: LearningAnalyticsContextValue = { recordAnswers: () => {} };
const LearningAnalyticsContext = createContext(noOpValue);

export function LearningAnalyticsProvider({
  curriculumSlug,
  chapterSlug,
  children,
}: {
  curriculumSlug: string;
  chapterSlug: string;
  children: ReactNode;
}) {
  const clerkEnabled = useClerkEnabled();
  if (!clerkEnabled) {
    return <LearningAnalyticsContext.Provider value={noOpValue}>{children}</LearningAnalyticsContext.Provider>;
  }
  return <ClerkLearningAnalyticsProvider curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>{children}</ClerkLearningAnalyticsProvider>;
}

function ClerkLearningAnalyticsProvider({
  curriculumSlug,
  chapterSlug,
  children,
}: {
  curriculumSlug: string;
  chapterSlug: string;
  children: ReactNode;
}) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  const { locale } = useLocale();
  const sessionIdRef = useRef<string | null>(null);
  const lastActivityAtRef = useRef(Date.now());
  const startingRef = useRef(false);

  const beginSession = useCallback(async () => {
    if (!isLoaded || !isSignedIn || !userId || startingRef.current) return null;
    startingRef.current = true;
    try {
      const result = await startLearningSession({ data: { curriculumSlug, chapterSlug, locale } });
      if (!result.ok) return null;
      sessionIdRef.current = result.sessionId;
      lastActivityAtRef.current = Date.now();
      return result.sessionId;
    } catch {
      return null;
    } finally {
      startingRef.current = false;
    }
  }, [chapterSlug, curriculumSlug, isLoaded, isSignedIn, locale, userId]);

  const sendHeartbeat = useCallback(async () => {
    let sessionId = sessionIdRef.current;
    if (!sessionId) sessionId = await beginSession();
    if (!sessionId) return;
    const visible = document.visibilityState === "visible";
    const active = visible && Date.now() - lastActivityAtRef.current <= LEARNING_ACTIVE_WINDOW_MS;
    try {
      const result = await recordLearningHeartbeat({ data: { sessionId, visible, active } });
      if (!result.ok && result.closed && sessionIdRef.current === sessionId) {
        sessionIdRef.current = null;
        if (visible) await beginSession();
      }
    } catch {
      // Learning remains fully usable when analytics is unavailable.
    }
  }, [beginSession]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) {
      sessionIdRef.current = null;
      return;
    }
    let cancelled = false;
    void beginSession().then(() => { if (cancelled) sessionIdRef.current = null; });
    const markActivity = () => { lastActivityAtRef.current = Date.now(); };
    const heartbeatOnVisibility = () => { void sendHeartbeat(); };
    const events: Array<keyof WindowEventMap> = ["pointerdown", "keydown", "scroll", "touchstart"];
    for (const event of events) window.addEventListener(event, markActivity, { passive: true });
    document.addEventListener("visibilitychange", heartbeatOnVisibility);
    const interval = window.setInterval(() => void sendHeartbeat(), LEARNING_HEARTBEAT_INTERVAL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", heartbeatOnVisibility);
      for (const event of events) window.removeEventListener(event, markActivity);
      void sendHeartbeat();
      sessionIdRef.current = null;
    };
  }, [beginSession, isLoaded, isSignedIn, sendHeartbeat, userId]);

  const recordAnswers = useCallback((answers: Record<string, string>) => {
    const sessionId = sessionIdRef.current;
    if (!sessionId || !isSignedIn) return;
    void recordConceptAttempt({
      data: {
        sessionId,
        submissionId: crypto.randomUUID(),
        curriculumSlug,
        chapterSlug,
        answers,
      },
    }).catch(() => undefined);
  }, [chapterSlug, curriculumSlug, isSignedIn]);

  return <LearningAnalyticsContext.Provider value={{ recordAnswers }}>{children}</LearningAnalyticsContext.Provider>;
}

export function useLearningAnalytics() {
  return useContext(LearningAnalyticsContext);
}

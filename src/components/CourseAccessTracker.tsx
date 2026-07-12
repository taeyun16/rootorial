import { useAuth } from "@clerk/tanstack-react-start";
import { useEffect, useRef, type ReactNode } from "react";
import { recordCourseAccess } from "../features/learning-analytics/learning-analytics.functions";
import { useClerkEnabled } from "./ClerkBoundary";

type TrackerProps = { curriculumSlug: string; chapterSlug?: string; children: ReactNode };

export function CourseAccessTracker({ curriculumSlug, chapterSlug, children }: TrackerProps) {
  const clerkEnabled = useClerkEnabled();
  if (!clerkEnabled) return <AnonymousCourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>{children}</AnonymousCourseAccessTracker>;
  return <ClerkCourseAccessTracker curriculumSlug={curriculumSlug} chapterSlug={chapterSlug}>{children}</ClerkCourseAccessTracker>;
}

function AnonymousCourseAccessTracker({ curriculumSlug, chapterSlug, children }: TrackerProps) {
  useEffect(() => {
    void recordCourseAccess({ data: { curriculumSlug, chapterSlug } }).catch(() => undefined);
  }, [chapterSlug, curriculumSlug]);
  return children;
}

function ClerkCourseAccessTracker({ curriculumSlug, chapterSlug, children }: TrackerProps) {
  const { isLoaded } = useAuth();
  const recordedRef = useRef(false);
  useEffect(() => {
    if (!isLoaded || recordedRef.current) return;
    recordedRef.current = true;
    void recordCourseAccess({ data: { curriculumSlug, chapterSlug } }).catch(() => undefined);
  }, [chapterSlug, curriculumSlug, isLoaded]);
  return children;
}

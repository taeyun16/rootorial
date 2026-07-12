import { useAuth } from "@clerk/tanstack-react-start";
import { useEffect, type ReactNode } from "react";
import { recordCourseAccess } from "../features/learning-analytics/learning-analytics.functions";
import { useClerkEnabled } from "./ClerkBoundary";

export function CourseAccessTracker({ curriculumSlug, children }: { curriculumSlug: string; children: ReactNode }) {
  const clerkEnabled = useClerkEnabled();
  if (!clerkEnabled) return children;
  return <ClerkCourseAccessTracker curriculumSlug={curriculumSlug}>{children}</ClerkCourseAccessTracker>;
}

function ClerkCourseAccessTracker({ curriculumSlug, children }: { curriculumSlug: string; children: ReactNode }) {
  const { isLoaded, isSignedIn, userId } = useAuth();
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !userId) return;
    void recordCourseAccess({ data: { curriculumSlug } }).catch(() => undefined);
  }, [curriculumSlug, isLoaded, isSignedIn, userId]);
  return children;
}

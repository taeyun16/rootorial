/**
 * Generate a preview URL for admin content review.
 * 
 * @param curriculumSlug - The curriculum identifier
 * @param chapterSlug - Optional chapter identifier
 * @param english - Whether to append English language query parameter
 * @returns Admin preview URL
 */
export function previewHref(
  curriculumSlug: string,
  chapterSlug?: string | null,
  english = false,
): string {
  const chapterPath = chapterSlug ? `/chapters/${chapterSlug}` : "";
  return `/admin/preview/curricula/${curriculumSlug}${chapterPath}${english ? "?lang=en" : ""}`;
}

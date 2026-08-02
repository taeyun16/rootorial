export type ContentFeedbackVisibility = Readonly<{
  pathname: string;
  contentPreviewMode: boolean;
}>;

function isAdminPreviewPath(pathname: string) {
  return pathname === "/admin/preview" || pathname.startsWith("/admin/preview/");
}

export function shouldRenderContentFeedback({
  pathname,
  contentPreviewMode,
}: ContentFeedbackVisibility) {
  if (!pathname.startsWith("/admin")) return true;
  return contentPreviewMode && isAdminPreviewPath(pathname);
}

import {
  discussionScopes,
  isDiscussionScopeId,
  type DiscussionScopeId,
} from "../../data/discussionScopes.ts";
import {
  chapterPublicationKey,
  isPublicationAccessible,
  type PublicationCatalog,
} from "../publication/publication.ts";

export type DiscussionPublicationAction = "read" | "write" | "moderate";

export function discussionPublicationResourceKey(
  scopeId: unknown,
): string | null {
  if (!isDiscussionScopeId(scopeId)) return null;
  const scope = discussionScopes[scopeId];
  return chapterPublicationKey(scope.curriculumSlug, scope.chapterSlug);
}

/**
 * Public discussion follows the same access boundary as its chapter. Admins
 * may inspect and moderate a non-public chapter, but normal posting and social
 * mutations never bypass publication state.
 */
export function isDiscussionPublicationAllowed(
  catalog: PublicationCatalog | null,
  scopeId: DiscussionScopeId | unknown,
  action: DiscussionPublicationAction,
  viewerIsAdmin = false,
) {
  if (viewerIsAdmin && (action === "read" || action === "moderate")) {
    return true;
  }
  const resourceKey = discussionPublicationResourceKey(scopeId);
  return Boolean(
    catalog &&
      resourceKey &&
      isPublicationAccessible(catalog, resourceKey),
  );
}

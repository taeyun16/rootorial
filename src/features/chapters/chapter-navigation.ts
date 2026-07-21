import {
  isPublicationAccessible,
  type PublicationCatalog,
} from "../publication/publication";

export type ChapterNavigationAccess = Readonly<{
  preview: boolean;
  curriculumSlugs: readonly string[];
  chapterIds: readonly string[];
}>;

export function chapterNavigationId(curriculumSlug: string, chapterSlug: string) {
  return `${curriculumSlug}/${chapterSlug}`;
}

export function buildChapterNavigationAccess(
  catalog: PublicationCatalog,
  preview: boolean,
): ChapterNavigationAccess {
  const resources = Object.values(catalog.resources);
  const available = preview
    ? resources.filter((resource) => resource.previewReady)
    : resources.filter((resource) =>
        isPublicationAccessible(catalog, resource.resourceKey),
      );

  return {
    preview,
    curriculumSlugs: available
      .filter((resource) => resource.resourceKind === "curriculum")
      .map((resource) => resource.curriculumSlug),
    chapterIds: available
      .filter(
        (resource): resource is typeof resource & { chapterSlug: string } =>
          resource.resourceKind === "chapter" && resource.chapterSlug !== null,
      )
      .map((resource) =>
        chapterNavigationId(resource.curriculumSlug, resource.chapterSlug),
      ),
  };
}

export function navigationHasCurriculum(
  access: ChapterNavigationAccess,
  curriculumSlug: string,
) {
  return access.curriculumSlugs.includes(curriculumSlug);
}

export function navigationHasChapter(
  access: ChapterNavigationAccess,
  curriculumSlug: string,
  chapterSlug: string,
) {
  return access.chapterIds.includes(
    chapterNavigationId(curriculumSlug, chapterSlug),
  );
}

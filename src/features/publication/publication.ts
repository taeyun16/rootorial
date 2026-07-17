import {
  curricula,
  getCurriculum,
  type Curriculum,
  type CurriculumChapter,
  type LocalizedText,
} from "../../data/curriculum.ts";
import { getChapterRegistration } from "../chapters/chapter-registry.ts";

export type PublicationResourceKind = "curriculum" | "chapter";
export type PublicationStatus = "draft" | "published" | "archived";
export type PublicationListing = "hidden" | "listed" | "unlisted";
export type DevelopmentStatus = "planned" | "in-progress" | "complete";

export type PublicationOverride = {
  resourceKey: string;
  resourceKind: PublicationResourceKind;
  curriculumSlug: string;
  chapterSlug: string | null;
  publicationStatus: PublicationStatus;
  listing: PublicationListing;
  scheduledAt: number | null;
  publishedAt: number | null;
  version: number;
  updatedByUserId: string;
  createdAt: number;
  updatedAt: number;
};

export type PublicationResource = {
  resourceKey: string;
  resourceKind: PublicationResourceKind;
  curriculumSlug: string;
  chapterSlug: string | null;
  title: LocalizedText;
  developmentStatus: DevelopmentStatus;
  contentReady: boolean;
  defaultPublicationStatus: PublicationStatus;
  defaultListing: PublicationListing;
};

export type ResolvedPublication = PublicationResource & {
  publicationStatus: PublicationStatus;
  effectivePublicationStatus: PublicationStatus;
  listing: PublicationListing;
  scheduledAt: number | null;
  publishedAt: number | null;
  version: number;
  source: "default" | "override";
  updatedByUserId: string | null;
  updatedAt: number | null;
};

export type PublicationCatalog = {
  generatedAt: number;
  resources: Record<string, ResolvedPublication>;
};

export type PublicCurriculumCatalogItem = {
  curriculum: Curriculum;
  publication: ResolvedPublication;
  chapters: Array<{
    chapter: CurriculumChapter;
    publication: ResolvedPublication;
  }>;
};

export type PublicPublicationCatalog = {
  generatedAt: number;
  curricula: PublicCurriculumCatalogItem[];
};

export function curriculumPublicationKey(curriculumSlug: string) {
  return `curriculum:${curriculumSlug}`;
}

export function chapterPublicationKey(
  curriculumSlug: string,
  chapterSlug: string,
) {
  return `chapter:${curriculumSlug}/${chapterSlug}`;
}

// These entries preserve the catalog and completed feature branches that
// existed before durable publication controls were introduced. New catalog
// resources intentionally default to a hidden draft until an administrator
// chooses otherwise.
const announcedPublicationKeys = new Set([
  "curriculum:transformer-from-zero",
  "curriculum:linux-systems",
  "curriculum:infrastructure-design",
  "curriculum:design-patterns",
  "chapter:transformer-from-zero/vectors",
  "chapter:transformer-from-zero/optimization",
  "chapter:transformer-from-zero/neural-networks",
  "chapter:transformer-from-zero/training",
  "chapter:transformer-from-zero/embeddings",
  "chapter:transformer-from-zero/sequences",
  "chapter:transformer-from-zero/attention",
  "chapter:transformer-from-zero/self-attention",
  "chapter:transformer-from-zero/transformer-block",
  "chapter:transformer-from-zero/mini-transformer",
  "chapter:linux-systems/shell-and-filesystem",
  "chapter:linux-systems/boot-to-shell",
  "chapter:linux-systems/processes-and-signals",
  "chapter:linux-systems/users-and-permissions",
  "chapter:linux-systems/memory-and-virtual-addresses",
  "chapter:linux-systems/storage-and-filesystems",
  "chapter:linux-systems/networking-from-a-packet",
  "chapter:linux-systems/assemble-a-tiny-linux",
]);

const legacyPublishedKeys = new Set([
  "curriculum:transformer-from-zero",
  "chapter:transformer-from-zero/vectors",
  "curriculum:linux-systems",
  "chapter:linux-systems/shell-and-filesystem",
]);

// CurriculumHome currently implements the Transformer learning journey. Add a
// slug here only after its landing-page renderer is ready for public traffic.
const registeredCurriculumPageSlugs = new Set([
  "transformer-from-zero",
  "linux-systems",
  "infrastructure-design",
]);

function publicationDefaults(resourceKey: string) {
  return {
    publicationStatus: legacyPublishedKeys.has(resourceKey)
      ? "published" as const
      : "draft" as const,
    listing: announcedPublicationKeys.has(resourceKey)
      ? "listed" as const
      : "hidden" as const,
  };
}

function curriculumDevelopmentStatus(
  status: Curriculum["status"],
): DevelopmentStatus {
  if (status === "planned") return "planned";
  if (status === "in-progress") return "in-progress";
  return "complete";
}

function localizedChapterTitle(
  curriculum: Curriculum,
  chapterSlug: string,
): LocalizedText {
  const ko = curriculum.chapters.ko.find((chapter) => chapter.slug === chapterSlug);
  const en = curriculum.chapters.en.find((chapter) => chapter.slug === chapterSlug);
  return {
    ko: ko?.title ?? chapterSlug,
    en: en?.title ?? chapterSlug,
  };
}

export function publicationResources(): PublicationResource[] {
  return curricula.flatMap((curriculum) => {
    const curriculumKey = curriculumPublicationKey(curriculum.slug);
    const curriculumDefaults = publicationDefaults(curriculumKey);
    const curriculumResource: PublicationResource = {
      resourceKey: curriculumKey,
      resourceKind: "curriculum",
      curriculumSlug: curriculum.slug,
      chapterSlug: null,
      title: curriculum.title,
      developmentStatus: curriculumDevelopmentStatus(curriculum.status),
      contentReady:
        registeredCurriculumPageSlugs.has(curriculum.slug) &&
        curriculum.status !== "planned" &&
        curriculum.chapters.ko.length > 0,
      defaultPublicationStatus: curriculumDefaults.publicationStatus,
      defaultListing: curriculumDefaults.listing,
    };

    const chapterResources = curriculum.chapters.ko.map(
      (chapter): PublicationResource => {
        const resourceKey = chapterPublicationKey(
          curriculum.slug,
          chapter.slug,
        );
        const defaults = publicationDefaults(resourceKey);
        return {
          resourceKey,
          resourceKind: "chapter",
          curriculumSlug: curriculum.slug,
          chapterSlug: chapter.slug,
          title: localizedChapterTitle(curriculum, chapter.slug),
          developmentStatus: chapter.developmentStatus,
          contentReady:
            chapter.status === "available" &&
            Boolean(getChapterRegistration(curriculum.slug, chapter.slug)),
          defaultPublicationStatus: defaults.publicationStatus,
          defaultListing: defaults.listing,
        };
      },
    );

    return [curriculumResource, ...chapterResources];
  });
}

export function getPublicationResource(
  resourceKey: string,
): PublicationResource | undefined {
  return publicationResources().find(
    (resource) => resource.resourceKey === resourceKey,
  );
}

function effectivePublicationStatus(
  publicationStatus: PublicationStatus,
  scheduledAt: number | null,
  now: number,
): PublicationStatus {
  if (
    publicationStatus === "draft" &&
    scheduledAt !== null &&
    scheduledAt <= now
  ) {
    return "published";
  }
  return publicationStatus;
}

function overrideMatchesResource(
  override: PublicationOverride,
  resource: PublicationResource,
) {
  return (
    override.resourceKind === resource.resourceKind &&
    override.curriculumSlug === resource.curriculumSlug &&
    override.chapterSlug === resource.chapterSlug
  );
}

export function resolvePublicationCatalog(
  overrides: PublicationOverride[],
  now = Date.now(),
): PublicationCatalog {
  const overrideByKey = new Map(
    overrides.map((override) => [override.resourceKey, override]),
  );
  const resources: Record<string, ResolvedPublication> = {};

  for (const resource of publicationResources()) {
    const candidate = overrideByKey.get(resource.resourceKey);
    const override =
      candidate && overrideMatchesResource(candidate, resource)
        ? candidate
        : undefined;
    const publicationStatus =
      override?.publicationStatus ?? resource.defaultPublicationStatus;
    const scheduledAt = override?.scheduledAt ?? null;
    resources[resource.resourceKey] = {
      ...resource,
      publicationStatus,
      effectivePublicationStatus: effectivePublicationStatus(
        publicationStatus,
        scheduledAt,
        now,
      ),
      listing: override?.listing ?? resource.defaultListing,
      scheduledAt,
      publishedAt: override?.publishedAt ?? null,
      version: override?.version ?? 0,
      source: override ? "override" : "default",
      updatedByUserId: override?.updatedByUserId ?? null,
      updatedAt: override?.updatedAt ?? null,
    };
  }

  return { generatedAt: now, resources };
}

function hasOwnResource(
  catalog: PublicationCatalog,
  resourceKey: string,
): ResolvedPublication | undefined {
  return Object.hasOwn(catalog.resources, resourceKey)
    ? catalog.resources[resourceKey]
    : undefined;
}

export function isPublicationAccessible(
  catalog: PublicationCatalog,
  resourceKey: string,
): boolean {
  const resource = hasOwnResource(catalog, resourceKey);
  if (
    !resource ||
    !resource.contentReady ||
    resource.effectivePublicationStatus !== "published" ||
    resource.listing === "hidden"
  ) {
    return false;
  }

  if (resource.resourceKind === "chapter") {
    return isPublicationAccessible(
      catalog,
      curriculumPublicationKey(resource.curriculumSlug),
    );
  }
  return true;
}

export function isPublicationListed(
  catalog: PublicationCatalog,
  resourceKey: string,
): boolean {
  const resource = hasOwnResource(catalog, resourceKey);
  if (
    !resource ||
    resource.listing !== "listed" ||
    resource.effectivePublicationStatus === "archived"
  ) {
    return false;
  }
  if (resource.resourceKind === "chapter") {
    return isPublicationAccessible(
      catalog,
      curriculumPublicationKey(resource.curriculumSlug),
    );
  }
  return true;
}

export function publicPublicationCatalog(
  catalog: PublicationCatalog,
): PublicPublicationCatalog {
  const catalogItems = curricula.flatMap((curriculum) => {
    const publication = catalog.resources[curriculumPublicationKey(curriculum.slug)];
    if (!publication || !isPublicationListed(catalog, publication.resourceKey)) {
      return [];
    }
    const chapters = curriculum.chapters.ko.flatMap((canonicalChapter) => {
      const chapterPublication =
        catalog.resources[
          chapterPublicationKey(curriculum.slug, canonicalChapter.slug)
        ];
      if (
        !chapterPublication ||
        !isPublicationListed(catalog, chapterPublication.resourceKey)
      ) {
        return [];
      }
      return [{ chapter: canonicalChapter, publication: chapterPublication }];
    });
    const chapterSlugs = new Set(chapters.map(({ chapter }) => chapter.slug));
    const publicCurriculum: Curriculum = {
      ...curriculum,
      chapters: {
        ko: curriculum.chapters.ko.filter((chapter) =>
          chapterSlugs.has(chapter.slug),
        ),
        en: curriculum.chapters.en.filter((chapter) =>
          chapterSlugs.has(chapter.slug),
        ),
      },
    };
    return [{ curriculum: publicCurriculum, publication, chapters }];
  });

  return { generatedAt: catalog.generatedAt, curricula: catalogItems };
}

export function publicCurriculumCatalogItem(
  catalog: PublicationCatalog,
  curriculumSlug: string,
): PublicCurriculumCatalogItem | undefined {
  if (
    !isPublicationAccessible(
      catalog,
      curriculumPublicationKey(curriculumSlug),
    )
  ) {
    return undefined;
  }
  return publicPublicationCatalog(catalog).curricula.find(
    (item) => item.curriculum.slug === curriculumSlug,
  ) ?? (() => {
    const curriculum = getCurriculum(curriculumSlug);
    const publication = catalog.resources[curriculumPublicationKey(curriculumSlug)];
    if (!curriculum || !publication) return undefined;
    const chapters = curriculum.chapters.ko.flatMap((chapter) => {
      const chapterState =
        catalog.resources[chapterPublicationKey(curriculumSlug, chapter.slug)];
      return chapterState && isPublicationListed(catalog, chapterState.resourceKey)
        ? [{ chapter, publication: chapterState }]
        : [];
    });
    const chapterSlugs = new Set(chapters.map(({ chapter }) => chapter.slug));
    return {
      curriculum: {
        ...curriculum,
        chapters: {
          ko: curriculum.chapters.ko.filter((chapter) =>
            chapterSlugs.has(chapter.slug),
          ),
          en: curriculum.chapters.en.filter((chapter) =>
            chapterSlugs.has(chapter.slug),
          ),
        },
      },
      publication,
      chapters,
    };
  })();
}

function objectInput(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(message);
  }
  return value as Record<string, unknown>;
}

export type UpdatePublicationInput = {
  resourceKey: string;
  publicationStatus: PublicationStatus;
  listing: PublicationListing;
  scheduledAt: number | null;
  expectedVersion: number;
};

export function validateUpdatePublicationInput(
  value: unknown,
): UpdatePublicationInput {
  const input = objectInput(value, "게시 상태 정보를 확인해 주세요.");
  if (
    typeof input.resourceKey !== "string" ||
    !getPublicationResource(input.resourceKey)
  ) {
    throw new Error("게시 대상을 찾을 수 없습니다.");
  }
  if (
    input.publicationStatus !== "draft" &&
    input.publicationStatus !== "published" &&
    input.publicationStatus !== "archived"
  ) {
    throw new Error("게시 상태를 확인해 주세요.");
  }
  if (
    input.listing !== "hidden" &&
    input.listing !== "listed" &&
    input.listing !== "unlisted"
  ) {
    throw new Error("목록 노출 상태를 확인해 주세요.");
  }
  if (
    input.scheduledAt !== null &&
    (typeof input.scheduledAt !== "number" ||
      !Number.isSafeInteger(input.scheduledAt) ||
      input.scheduledAt <= 0)
  ) {
    throw new Error("예약 발행 시각을 확인해 주세요.");
  }
  if (
    input.publicationStatus !== "draft" &&
    input.scheduledAt !== null
  ) {
    throw new Error("예약 발행은 초안 상태에서만 설정할 수 있습니다.");
  }
  if (
    typeof input.expectedVersion !== "number" ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 0
  ) {
    throw new Error("게시 상태 버전을 확인해 주세요.");
  }
  return {
    resourceKey: input.resourceKey,
    publicationStatus: input.publicationStatus,
    listing: input.listing,
    scheduledAt: input.scheduledAt,
    expectedVersion: input.expectedVersion,
  };
}

export function validateResetPublicationInput(value: unknown) {
  const input = objectInput(value, "게시 상태 초기화 정보를 확인해 주세요.");
  if (
    typeof input.resourceKey !== "string" ||
    !getPublicationResource(input.resourceKey)
  ) {
    throw new Error("게시 대상을 찾을 수 없습니다.");
  }
  if (
    typeof input.expectedVersion !== "number" ||
    !Number.isSafeInteger(input.expectedVersion) ||
    input.expectedVersion < 1
  ) {
    throw new Error("초기화할 게시 상태 버전을 확인해 주세요.");
  }
  return {
    resourceKey: input.resourceKey,
    expectedVersion: input.expectedVersion,
  };
}

import {
  getPublicationResource,
  isPublicationAccessible,
  publicCurriculumCatalogItem,
  publicPublicationCatalog,
  resolvePublicationCatalog,
  type PublicationCatalog,
  type PublicationListing,
  type PublicationOverride,
  type PublicationResource,
  type PublicationResourceKind,
  type PublicationStatus,
  type UpdatePublicationInput,
} from "./publication.ts";

type PublicationRow = {
  resource_key: string;
  resource_kind: string;
  curriculum_slug: string;
  chapter_slug: string | null;
  publication_status: string;
  listing: string;
  scheduled_at: number | null;
  published_at: number | null;
  version: number;
  updated_by_user_id: string;
  created_at: number;
  updated_at: number;
};

function isIntegerOrNull(value: unknown): value is number | null {
  return value === null || Number.isSafeInteger(value);
}

function publicationStatus(value: string): value is PublicationStatus {
  return value === "draft" || value === "published" || value === "archived";
}

function publicationListing(value: string): value is PublicationListing {
  return value === "hidden" || value === "listed" || value === "unlisted";
}

function publicationResourceKind(
  value: string,
): value is PublicationResourceKind {
  return value === "curriculum" || value === "chapter";
}

function parsePublicationRow(row: PublicationRow): PublicationOverride {
  const resource = getPublicationResource(row.resource_key);
  if (
    !resource ||
    !publicationResourceKind(row.resource_kind) ||
    !publicationStatus(row.publication_status) ||
    !publicationListing(row.listing) ||
    row.resource_kind !== resource.resourceKind ||
    row.curriculum_slug !== resource.curriculumSlug ||
    row.chapter_slug !== resource.chapterSlug ||
    !isIntegerOrNull(row.scheduled_at) ||
    !isIntegerOrNull(row.published_at) ||
    !Number.isSafeInteger(row.version) ||
    row.version < 1 ||
    !Number.isSafeInteger(row.created_at) ||
    !Number.isSafeInteger(row.updated_at) ||
    typeof row.updated_by_user_id !== "string" ||
    !row.updated_by_user_id
  ) {
    throw new Error("Invalid publication override row");
  }
  if (
    row.publication_status !== "draft" &&
    row.scheduled_at !== null
  ) {
    throw new Error("Invalid publication schedule state");
  }
  if (
    row.publication_status !== "draft" &&
    row.published_at === null
  ) {
    throw new Error("Invalid publication timestamp state");
  }

  return {
    resourceKey: row.resource_key,
    resourceKind: row.resource_kind,
    curriculumSlug: row.curriculum_slug,
    chapterSlug: row.chapter_slug,
    publicationStatus: row.publication_status,
    listing: row.listing,
    scheduledAt: row.scheduled_at,
    publishedAt: row.published_at,
    version: row.version,
    updatedByUserId: row.updated_by_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const publicationSelect = `
  SELECT resource_key, resource_kind, curriculum_slug, chapter_slug,
         publication_status, listing, scheduled_at, published_at, version,
         updated_by_user_id, created_at, updated_at
  FROM content_publication_overrides
`;

export async function loadPublicationCatalog(
  database: D1Database | undefined,
  now = Date.now(),
): Promise<PublicationCatalog | null> {
  if (!database) return null;
  try {
    const rows = await database.prepare(publicationSelect).all<PublicationRow>();
    const overrides = rows.results.flatMap((row) =>
      getPublicationResource(row.resource_key)
        ? [parsePublicationRow(row)]
        : [],
    );
    return resolvePublicationCatalog(overrides, now);
  } catch {
    console.error("[publication:catalog] database operation failed");
    return null;
  }
}

export async function loadPublicPlatformCatalog(
  database: D1Database | undefined,
  now = Date.now(),
) {
  const catalog = await loadPublicationCatalog(database, now);
  return catalog
    ? publicPublicationCatalog(catalog)
    : { generatedAt: now, curricula: [] };
}

export async function loadPublicCurriculumPage(
  database: D1Database | undefined,
  curriculumSlug: string,
  now = Date.now(),
) {
  const catalog = await loadPublicationCatalog(database, now);
  if (!catalog) return null;
  const item = publicCurriculumCatalogItem(catalog, curriculumSlug);
  return item ? { catalog, item } : null;
}

export async function isPublicResourceAccessible(
  database: D1Database | undefined,
  resourceKey: string,
  now = Date.now(),
) {
  const catalog = await loadPublicationCatalog(database, now);
  return catalog ? isPublicationAccessible(catalog, resourceKey) : false;
}

export type PublicationMutationResult =
  | { ok: true; catalog: PublicationCatalog }
  | { ok: false; code: "invalid" | "conflict" | "unavailable"; message: string };

function ensurePublishable(
  resource: PublicationResource,
  input: UpdatePublicationInput,
  currentCatalog: PublicationCatalog,
  now: number,
): string | null {
  const willPublish =
    input.publicationStatus === "published" || input.scheduledAt !== null;
  if (willPublish && !resource.contentReady) {
    return "콘텐츠 렌더러와 제작 상태가 준비된 뒤 발행할 수 있습니다.";
  }
  if (input.scheduledAt !== null && input.scheduledAt <= now) {
    return "예약 발행 시각은 현재보다 이후여야 합니다.";
  }
  const current = currentCatalog.resources[resource.resourceKey];
  if (
    input.publicationStatus === "archived" &&
    current.effectivePublicationStatus !== "published"
  ) {
    return "공개된 콘텐츠만 보관 처리할 수 있습니다.";
  }
  return null;
}

function publishedAtForUpdate(
  currentCatalog: PublicationCatalog,
  resource: PublicationResource,
  input: UpdatePublicationInput,
  now: number,
) {
  const current = currentCatalog.resources[resource.resourceKey];
  if (input.publicationStatus === "draft") return null;
  if (input.publicationStatus === "published") {
    return current.effectivePublicationStatus === "published"
      ? current.publishedAt ?? now
      : now;
  }
  return current.publishedAt ?? now;
}

async function mutationCatalog(
  database: D1Database,
  now: number,
): Promise<PublicationMutationResult> {
  const catalog = await loadPublicationCatalog(database, now);
  return catalog
    ? { ok: true, catalog }
    : {
        ok: false,
        code: "unavailable",
        message: "게시 상태를 다시 불러오지 못했습니다.",
      };
}

export async function updatePublicationOverride(
  database: D1Database,
  userId: string,
  input: UpdatePublicationInput,
  now = Date.now(),
): Promise<PublicationMutationResult> {
  const resource = getPublicationResource(input.resourceKey);
  if (!resource) {
    return { ok: false, code: "invalid", message: "게시 대상을 찾을 수 없습니다." };
  }
  const currentCatalog = await loadPublicationCatalog(database, now);
  if (!currentCatalog) {
    return { ok: false, code: "unavailable", message: "게시 상태 저장소에 연결할 수 없습니다." };
  }
  const invalidReason = ensurePublishable(resource, input, currentCatalog, now);
  if (invalidReason) {
    return { ok: false, code: "invalid", message: invalidReason };
  }

  const publishedAt = publishedAtForUpdate(
    currentCatalog,
    resource,
    input,
    now,
  );
  const commonValues = [
    resource.resourceKind,
    resource.curriculumSlug,
    resource.chapterSlug,
    input.publicationStatus,
    input.listing,
    input.scheduledAt,
    publishedAt,
    userId,
    now,
  ] as const;

  try {
    let result: D1Result<PublicationRow>;
    if (input.expectedVersion === 0) {
      result = await database.prepare(`
        INSERT INTO content_publication_overrides (
          resource_key, resource_kind, curriculum_slug, chapter_slug,
          publication_status, listing, scheduled_at, published_at, version,
          updated_by_user_id, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?, ?, ?)
        ON CONFLICT(resource_key) DO NOTHING
        RETURNING resource_key, resource_kind, curriculum_slug, chapter_slug,
                  publication_status, listing, scheduled_at, published_at,
                  version, updated_by_user_id, created_at, updated_at
      `).bind(
        resource.resourceKey,
        ...commonValues,
        now,
      ).all<PublicationRow>();
    } else {
      result = await database.prepare(`
        UPDATE content_publication_overrides
        SET resource_kind = ?, curriculum_slug = ?, chapter_slug = ?,
            publication_status = ?, listing = ?, scheduled_at = ?,
            published_at = ?, version = version + 1,
            updated_by_user_id = ?, updated_at = ?
        WHERE resource_key = ? AND version = ?
        RETURNING resource_key, resource_kind, curriculum_slug, chapter_slug,
                  publication_status, listing, scheduled_at, published_at,
                  version, updated_by_user_id, created_at, updated_at
      `).bind(
        ...commonValues,
        resource.resourceKey,
        input.expectedVersion,
      ).all<PublicationRow>();
    }
    if (!result.results.length) {
      return {
        ok: false,
        code: "conflict",
        message: "다른 관리자 변경이 먼저 저장되었습니다. 새로고침 후 다시 시도해 주세요.",
      };
    }
    parsePublicationRow(result.results[0]);
    return mutationCatalog(database, now);
  } catch {
    console.error("[publication:update] database operation failed");
    return { ok: false, code: "unavailable", message: "게시 상태를 저장하지 못했습니다." };
  }
}

export async function resetPublicationOverride(
  database: D1Database,
  resourceKey: string,
  expectedVersion: number,
  now = Date.now(),
): Promise<PublicationMutationResult> {
  try {
    const result = await database.prepare(`
      DELETE FROM content_publication_overrides
      WHERE resource_key = ? AND version = ?
      RETURNING resource_key
    `).bind(resourceKey, expectedVersion).all<{ resource_key: string }>();
    if (!result.results.length) {
      return {
        ok: false,
        code: "conflict",
        message: "다른 관리자 변경이 먼저 저장되었습니다. 새로고침 후 다시 시도해 주세요.",
      };
    }
    return mutationCatalog(database, now);
  } catch {
    console.error("[publication:reset] database operation failed");
    return { ok: false, code: "unavailable", message: "기본 게시 상태로 되돌리지 못했습니다." };
  }
}

export async function publishDueContent(
  database: D1Database | undefined,
  now = Date.now(),
) {
  if (!database) return 0;
  try {
    const result = await database.prepare(`
      UPDATE content_publication_overrides
      SET publication_status = 'published',
          published_at = scheduled_at,
          scheduled_at = NULL,
          version = version + 1,
          updated_by_user_id = 'system:scheduler',
          updated_at = ?
      WHERE publication_status = 'draft'
        AND scheduled_at IS NOT NULL
        AND scheduled_at <= ?
      RETURNING resource_key
    `).bind(now, now).all<{ resource_key: string }>();
    return result.results.length;
  } catch {
    console.error("[publication:scheduler] database operation failed");
    return 0;
  }
}

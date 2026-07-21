import { createServerFn } from "@tanstack/react-start";
import { setResponseHeader } from "@tanstack/react-start/server";
import { env } from "cloudflare:workers";
import { getCurriculum } from "../../data/curriculum";
import { currentAdmin, privateResponse } from "../admin/admin-auth.server";
import { buildChapterNavigationAccess } from "../chapters/chapter-navigation";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  isPublicationAccessible,
  validateResetPublicationInput,
  validateUpdatePublicationInput,
} from "./publication";
import {
  loadPublicationCatalog,
  loadPublicCurriculumPage,
  loadPublicPlatformCatalog,
  resetPublicationOverride,
  updatePublicationOverride,
} from "./publication.server";

type PublicationBindings = {
  DB?: D1Database;
};

function bindings() {
  return env as unknown as PublicationBindings;
}

function publicDynamicResponse() {
  setResponseHeader("Cache-Control", "no-store");
}

function routePart(value: unknown) {
  return typeof value === "string" &&
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)
    ? value
    : null;
}

function validateCurriculumInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { curriculumSlug: null };
  }
  const curriculumSlug = routePart(
    (value as Record<string, unknown>).curriculumSlug,
  );
  return { curriculumSlug };
}

function validateChapterInput(value: unknown) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return { curriculumSlug: null, chapterSlug: null };
  }
  const input = value as Record<string, unknown>;
  return {
    curriculumSlug: routePart(input.curriculumSlug),
    chapterSlug: routePart(input.chapterSlug),
  };
}

export const getPublicPublicationCatalog = createServerFn({ method: "GET" })
  .handler(async () => {
    publicDynamicResponse();
    return loadPublicPlatformCatalog(bindings().DB);
  });

export const getPublicCurriculumPublication = createServerFn({ method: "GET" })
  .validator(validateCurriculumInput)
  .handler(async ({ data }) => {
    publicDynamicResponse();
    if (!data.curriculumSlug) return null;
    const page = await loadPublicCurriculumPage(
      bindings().DB,
      data.curriculumSlug,
    );
    if (!page) return null;
    if (page.item.publication.listing === "unlisted") {
      setResponseHeader("X-Robots-Tag", "noindex, follow");
    }
    const prerequisiteSlug =
      page.item.curriculum.recommendedPrerequisite?.curriculumSlug;
    const prerequisiteAvailable = prerequisiteSlug
      ? isPublicationAccessible(
          page.catalog,
          curriculumPublicationKey(prerequisiteSlug),
        )
      : false;
    const continuationSlug =
      page.item.curriculum.recommendedContinuation?.curriculumSlug;
    const continuationAvailable = continuationSlug
      ? isPublicationAccessible(
          page.catalog,
          curriculumPublicationKey(continuationSlug),
        )
      : false;
    return { item: page.item, prerequisiteAvailable, continuationAvailable };
  });

export const getPublicChapterPublication = createServerFn({ method: "GET" })
  .validator(validateChapterInput)
  .handler(async ({ data }) => {
    publicDynamicResponse();
    if (!data.curriculumSlug || !data.chapterSlug) return null;
    const catalog = await loadPublicationCatalog(bindings().DB);
    const curriculum = getCurriculum(data.curriculumSlug);
    const chapter = curriculum?.chapters.ko.find(
      (candidate) => candidate.slug === data.chapterSlug,
    );
    const resourceKey = chapterPublicationKey(
      data.curriculumSlug,
      data.chapterSlug,
    );
    if (
      !catalog ||
      !curriculum ||
      !chapter ||
      !isPublicationAccessible(catalog, resourceKey)
    ) {
      return null;
    }
    const chapterPublication = catalog.resources[resourceKey];
    const curriculumPublication =
      catalog.resources[curriculumPublicationKey(data.curriculumSlug)];
    if (
      chapterPublication.listing === "unlisted" ||
      curriculumPublication.listing === "unlisted"
    ) {
      setResponseHeader("X-Robots-Tag", "noindex, follow");
    }
    const publicCurriculum = {
      ...curriculum,
      chapters: {
        ko: curriculum.chapters.ko.filter(
          (candidate) => candidate.slug === data.chapterSlug,
        ),
        en: curriculum.chapters.en.filter(
          (candidate) => candidate.slug === data.chapterSlug,
        ),
      },
    };
    return {
      curriculum: publicCurriculum,
      publication: chapterPublication,
      curriculumPublication,
      navigation: buildChapterNavigationAccess(catalog, false),
    };
  });

export const getAdminPublicationPreview = createServerFn({ method: "GET" })
  .validator((value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {
        curriculumSlug: null,
        chapterSlug: undefined,
      };
    }
    const input = value as Record<string, unknown>;
    const chapterSlug =
      input.chapterSlug === null || input.chapterSlug === undefined
        ? null
        : routePart(input.chapterSlug) ?? undefined;
    return {
      curriculumSlug: routePart(input.curriculumSlug),
      chapterSlug,
    };
  })
  .handler(async ({ data }) => {
    privateResponse();
    setResponseHeader("X-Robots-Tag", "noindex, nofollow");
    const viewer = await currentAdmin();
    if (!viewer.userId || !viewer.isAdmin) return null;
    if (!data.curriculumSlug || data.chapterSlug === undefined) return null;
    const catalog = await loadPublicationCatalog(bindings().DB);
    if (!catalog) return null;
    const resourceKey = data.chapterSlug
      ? chapterPublicationKey(data.curriculumSlug, data.chapterSlug)
      : curriculumPublicationKey(data.curriculumSlug);
    const resource = catalog.resources[resourceKey];
    const curriculum = getCurriculum(data.curriculumSlug);
    if (!resource || !resource.previewReady || !curriculum) return null;
    if (
      data.chapterSlug &&
      !curriculum.chapters.ko.some(
        (chapter) => chapter.slug === data.chapterSlug,
      )
    ) {
      return null;
    }
    return { catalog, curriculum, resource };
  });

export const updateContentPublication = createServerFn({ method: "POST" })
  .validator(validateUpdatePublicationInput)
  .handler(async ({ data }) => {
    privateResponse();
    const viewer = await currentAdmin();
    if (!viewer.userId || !viewer.isAdmin) {
      return { ok: false as const, message: "관리자 권한이 필요합니다." };
    }
    const database = bindings().DB;
    if (!database) {
      return { ok: false as const, message: "데이터베이스가 연결되지 않았습니다." };
    }
    const result = await updatePublicationOverride(
      database,
      viewer.userId,
      data,
    );
    return result.ok
      ? { ok: true as const }
      : { ok: false as const, message: result.message, code: result.code };
  });

export const resetContentPublication = createServerFn({ method: "POST" })
  .validator(validateResetPublicationInput)
  .handler(async ({ data }) => {
    privateResponse();
    const viewer = await currentAdmin();
    if (!viewer.userId || !viewer.isAdmin) {
      return { ok: false as const, message: "관리자 권한이 필요합니다." };
    }
    const database = bindings().DB;
    if (!database) {
      return { ok: false as const, message: "데이터베이스가 연결되지 않았습니다." };
    }
    const result = await resetPublicationOverride(
      database,
      data.resourceKey,
      data.expectedVersion,
    );
    return result.ok
      ? { ok: true as const }
      : { ok: false as const, message: result.message, code: result.code };
  });

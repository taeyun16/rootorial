import { curricula } from "../../data/curriculum.ts";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  type PublicationCatalog,
} from "./publication.ts";

export type LocalContentPreviewGate = Readonly<{
  development: boolean;
  enabledValue: string | undefined;
  host: string;
}>;

function hostnameFromHostHeader(host: string) {
  const normalized = host.trim().toLowerCase();
  if (normalized.startsWith("[")) {
    const end = normalized.indexOf("]");
    return end === -1 ? normalized : normalized.slice(1, end);
  }
  return normalized.split(":", 1)[0];
}

/**
 * Local draft access is deliberately narrower than administrator access:
 * it only unlocks read-only preview routes while the Vite development build
 * is serving an explicitly enabled loopback request.
 */
export function isLocalContentPreviewAllowed({
  development,
  enabledValue,
  host,
}: LocalContentPreviewGate) {
  if (!development || enabledValue !== "1") return false;
  const hostname = hostnameFromHostHeader(host);
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function buildLocalContentPreviewCatalog(catalog: PublicationCatalog) {
  const items = curricula.map((curriculum) => {
    const publication = catalog.resources[curriculumPublicationKey(curriculum.slug)];
    const chapters = curriculum.chapters.ko.map((chapter, index) => {
      const englishChapter = curriculum.chapters.en[index];
      const chapterPublication =
        catalog.resources[chapterPublicationKey(curriculum.slug, chapter.slug)];
      return {
        slug: chapter.slug,
        number: chapter.number,
        title: { ko: chapter.title, en: englishChapter?.title ?? chapter.title },
        sourceStatus: chapter.status,
        developmentStatus: chapter.developmentStatus,
        previewReady: Boolean(chapterPublication?.previewReady),
      };
    });

    return {
      slug: curriculum.slug,
      title: curriculum.title,
      summary: curriculum.summary,
      level: curriculum.level,
      status: curriculum.status,
      previewReady: Boolean(publication?.previewReady),
      chapters,
    };
  });

  const chapters = items.flatMap((item) => item.chapters);
  return {
    generatedAt: catalog.generatedAt,
    implementedChapters: chapters.filter((chapter) => chapter.previewReady).length,
    plannedChapters: chapters.filter((chapter) => !chapter.previewReady).length,
    curricula: items,
  };
}

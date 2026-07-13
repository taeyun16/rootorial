import {
  getCurriculum,
  type Locale,
} from "../../data/curriculum.ts";
import { getPublishedChapter } from "../chapters/chapter-registry.ts";

export type PageMetadata = {
  title: string;
  description: string;
};

const platformMetadata: Record<Locale, PageMetadata> = {
  ko: {
    title: "Rootorial — 복잡한 기술을 바닥부터.",
    description: "AI, Linux 시스템, 인프라 설계와 소프트웨어 패턴을 직접 움직이고 실행하며 바닥부터 이해합니다.",
  },
  en: {
    title: "Rootorial — Technology, understood from the root.",
    description: "Interactive curricula for understanding AI, systems, infrastructure, and software design from the ground up.",
  },
};

export function localeFromLanguage(value: unknown): Locale {
  return value === "en" ? "en" : "ko";
}

export function platformPageMetadata(locale: Locale): PageMetadata {
  return platformMetadata[locale];
}

export function curriculumPageMetadata(
  curriculumSlug: string,
  locale: Locale,
): PageMetadata | undefined {
  const curriculum = getCurriculum(curriculumSlug);
  if (!curriculum || curriculum.status === "planned") return undefined;
  return {
    title: `${curriculum.title[locale]} · Rootorial`,
    description: curriculum.summary[locale],
  };
}

export function chapterPageMetadata(
  curriculumSlug: string,
  chapterSlug: string,
  locale: Locale,
): PageMetadata | undefined {
  const published = getPublishedChapter(curriculumSlug, chapterSlug, locale);
  if (!published) return undefined;
  return {
    title: `${String(published.chapter.number).padStart(2, "0")}. ${published.chapter.title} · Rootorial`,
    description: published.chapter.description,
  };
}

export function pageMetadataForPath(
  pathname: string,
  locale: Locale,
): PageMetadata | undefined {
  if (pathname === "/") return platformPageMetadata(locale);

  const chapterMatch = pathname.match(
    /^\/curricula\/([^/]+)\/chapters\/([^/]+)\/?$/,
  );
  if (chapterMatch) {
    return chapterPageMetadata(chapterMatch[1], chapterMatch[2], locale);
  }

  const curriculumMatch = pathname.match(/^\/curricula\/([^/]+)\/?$/);
  if (curriculumMatch) {
    return curriculumPageMetadata(curriculumMatch[1], locale);
  }

  return undefined;
}

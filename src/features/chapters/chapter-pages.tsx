import type { ComponentType } from "react";
import { VectorsChapter } from "../../components/VectorsChapter";
import { chapterId } from "../../data/curriculum";
import {
  isRegisteredChapterId,
  type RegisteredChapterId,
} from "./chapter-registry";

export type ChapterPageProps = {
  curriculumSlug: string;
  chapterSlug: string;
  learnerCount: number;
};

function VectorsChapterPage({ learnerCount }: ChapterPageProps) {
  return <VectorsChapter learnerCount={learnerCount} />;
}

const chapterPages = {
  "transformer-from-zero/vectors": VectorsChapterPage,
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

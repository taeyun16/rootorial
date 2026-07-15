import type { ComponentType } from "react";
import { LinuxBootChapter } from "../../components/linux/LinuxBootChapter";
import { LinuxShellChapter } from "../../components/linux/LinuxShellChapter";
import { OptimizationChapter } from "../../components/optimization/OptimizationChapter";
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

function LinuxShellChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxShellChapter learnerCount={learnerCount} />;
}

function LinuxBootChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxBootChapter learnerCount={learnerCount} />;
}

function OptimizationChapterPage({ learnerCount }: ChapterPageProps) {
  return <OptimizationChapter learnerCount={learnerCount} />;
}

const chapterPages = {
  "transformer-from-zero/vectors": VectorsChapterPage,
  "transformer-from-zero/optimization": OptimizationChapterPage,
  "linux-systems/shell-and-filesystem": LinuxShellChapterPage,
  "linux-systems/boot-to-shell": LinuxBootChapterPage,
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

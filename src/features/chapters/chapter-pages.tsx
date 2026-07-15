import type { ComponentType } from "react";
import { LinuxBootChapter } from "../../components/linux/LinuxBootChapter";
import { LinuxProcessesChapter } from "../../components/linux/LinuxProcessesChapter";
import { LinuxShellChapter } from "../../components/linux/LinuxShellChapter";
import { NeuralNetworksChapter } from "../../components/neural-networks/NeuralNetworksChapter";
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

function LinuxProcessesChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxProcessesChapter learnerCount={learnerCount} />;
}

function OptimizationChapterPage({ learnerCount }: ChapterPageProps) {
  return <OptimizationChapter learnerCount={learnerCount} />;
}

function NeuralNetworksChapterPage({ learnerCount }: ChapterPageProps) {
  return <NeuralNetworksChapter learnerCount={learnerCount} />;
}

const chapterPages = {
  "transformer-from-zero/vectors": VectorsChapterPage,
  "transformer-from-zero/optimization": OptimizationChapterPage,
  "transformer-from-zero/neural-networks": NeuralNetworksChapterPage,
  "linux-systems/shell-and-filesystem": LinuxShellChapterPage,
  "linux-systems/boot-to-shell": LinuxBootChapterPage,
  "linux-systems/processes-and-signals": LinuxProcessesChapterPage,
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

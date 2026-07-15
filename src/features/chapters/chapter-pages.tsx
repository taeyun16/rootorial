import type { ComponentType } from "react";
import { EmbeddingsChapter } from "../../components/embeddings/EmbeddingsChapter";
import { LinuxBootChapter } from "../../components/linux/LinuxBootChapter";
import { LinuxProcessesChapter } from "../../components/linux/LinuxProcessesChapter";
import { LinuxPermissionsChapter } from "../../components/linux/LinuxPermissionsChapter";
import { LinuxMemoryChapter } from "../../components/linux/LinuxMemoryChapter";
import { LinuxShellChapter } from "../../components/linux/LinuxShellChapter";
import { NeuralNetworksChapter } from "../../components/neural-networks/NeuralNetworksChapter";
import { OptimizationChapter } from "../../components/optimization/OptimizationChapter";
import { TrainingChapter } from "../../components/training/TrainingChapter";
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

function LinuxPermissionsChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxPermissionsChapter learnerCount={learnerCount} />;
}

function LinuxMemoryChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxMemoryChapter learnerCount={learnerCount} />;
}

function OptimizationChapterPage({ learnerCount }: ChapterPageProps) {
  return <OptimizationChapter learnerCount={learnerCount} />;
}

function NeuralNetworksChapterPage({ learnerCount }: ChapterPageProps) {
  return <NeuralNetworksChapter learnerCount={learnerCount} />;
}

function TrainingChapterPage({ learnerCount }: ChapterPageProps) {
  return <TrainingChapter learnerCount={learnerCount} />;
}

function EmbeddingsChapterPage({ learnerCount }: ChapterPageProps) {
  return <EmbeddingsChapter learnerCount={learnerCount} />;
}

const chapterPages = {
  "transformer-from-zero/vectors": VectorsChapterPage,
  "transformer-from-zero/optimization": OptimizationChapterPage,
  "transformer-from-zero/neural-networks": NeuralNetworksChapterPage,
  "transformer-from-zero/training": TrainingChapterPage,
  "transformer-from-zero/embeddings": EmbeddingsChapterPage,
  "linux-systems/shell-and-filesystem": LinuxShellChapterPage,
  "linux-systems/boot-to-shell": LinuxBootChapterPage,
  "linux-systems/processes-and-signals": LinuxProcessesChapterPage,
  "linux-systems/users-and-permissions": LinuxPermissionsChapterPage,
  "linux-systems/memory-and-virtual-addresses": LinuxMemoryChapterPage,
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

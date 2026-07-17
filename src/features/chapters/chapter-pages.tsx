import type { ComponentType } from "react";
import { AttentionChapter } from "../../components/attention/AttentionChapter";
import { EmbeddingsChapter } from "../../components/embeddings/EmbeddingsChapter";
import { LinuxBootChapter } from "../../components/linux/LinuxBootChapter";
import { LinuxProcessesChapter } from "../../components/linux/LinuxProcessesChapter";
import { LinuxPermissionsChapter } from "../../components/linux/LinuxPermissionsChapter";
import { LinuxMemoryChapter } from "../../components/linux/LinuxMemoryChapter";
import { LinuxNetworkingChapter } from "../../components/linux/LinuxNetworkingChapter";
import { LinuxShellChapter } from "../../components/linux/LinuxShellChapter";
import { LinuxStorageChapter } from "../../components/linux/LinuxStorageChapter";
import { LinuxTinySystemChapter } from "../../components/linux/LinuxTinySystemChapter";
import { EgressNatChapter } from "../../components/infrastructure/EgressNatChapter";
import { NetworkNamespacesChapter } from "../../components/infrastructure/NetworkNamespacesChapter";
import { ServiceDiscoveryChapter } from "../../components/infrastructure/ServiceDiscoveryChapter";
import { VethRoutingChapter } from "../../components/infrastructure/VethRoutingChapter";
import { MiniTransformerChapter } from "../../components/mini-transformer/MiniTransformerChapter";
import { NeuralNetworksChapter } from "../../components/neural-networks/NeuralNetworksChapter";
import { OptimizationChapter } from "../../components/optimization/OptimizationChapter";
import { SequencesChapter } from "../../components/sequences/SequencesChapter";
import { SelfAttentionChapter } from "../../components/self-attention/SelfAttentionChapter";
import { TrainingChapter } from "../../components/training/TrainingChapter";
import { TransformerBlockChapter } from "../../components/transformer-block/TransformerBlockChapter";
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

function LinuxStorageChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxStorageChapter learnerCount={learnerCount} />;
}

function LinuxNetworkingChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxNetworkingChapter learnerCount={learnerCount} />;
}

function LinuxTinySystemChapterPage({ learnerCount }: ChapterPageProps) {
  return <LinuxTinySystemChapter learnerCount={learnerCount} />;
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

function SequencesChapterPage({ learnerCount }: ChapterPageProps) {
  return <SequencesChapter learnerCount={learnerCount} />;
}

function AttentionChapterPage({ learnerCount }: ChapterPageProps) {
  return <AttentionChapter learnerCount={learnerCount} />;
}

function SelfAttentionChapterPage({ learnerCount }: ChapterPageProps) {
  return <SelfAttentionChapter learnerCount={learnerCount} />;
}

function TransformerBlockChapterPage({ learnerCount }: ChapterPageProps) {
  return <TransformerBlockChapter learnerCount={learnerCount} />;
}

function MiniTransformerChapterPage({ learnerCount }: ChapterPageProps) {
  return <MiniTransformerChapter learnerCount={learnerCount} />;
}

function NetworkNamespacesChapterPage({ learnerCount }: ChapterPageProps) {
  return <NetworkNamespacesChapter learnerCount={learnerCount} />;
}

function VethRoutingChapterPage({ learnerCount }: ChapterPageProps) {
  return <VethRoutingChapter learnerCount={learnerCount} />;
}

function EgressNatChapterPage({ learnerCount }: ChapterPageProps) {
  return <EgressNatChapter learnerCount={learnerCount} />;
}

function ServiceDiscoveryChapterPage({ learnerCount }: ChapterPageProps) {
  return <ServiceDiscoveryChapter learnerCount={learnerCount} />;
}

const chapterPages = {
  "transformer-from-zero/vectors": VectorsChapterPage,
  "transformer-from-zero/optimization": OptimizationChapterPage,
  "transformer-from-zero/neural-networks": NeuralNetworksChapterPage,
  "transformer-from-zero/training": TrainingChapterPage,
  "transformer-from-zero/embeddings": EmbeddingsChapterPage,
  "transformer-from-zero/sequences": SequencesChapterPage,
  "transformer-from-zero/attention": AttentionChapterPage,
  "transformer-from-zero/self-attention": SelfAttentionChapterPage,
  "transformer-from-zero/transformer-block": TransformerBlockChapterPage,
  "transformer-from-zero/mini-transformer": MiniTransformerChapterPage,
  "linux-systems/shell-and-filesystem": LinuxShellChapterPage,
  "linux-systems/boot-to-shell": LinuxBootChapterPage,
  "linux-systems/processes-and-signals": LinuxProcessesChapterPage,
  "linux-systems/users-and-permissions": LinuxPermissionsChapterPage,
  "linux-systems/memory-and-virtual-addresses": LinuxMemoryChapterPage,
  "linux-systems/storage-and-filesystems": LinuxStorageChapterPage,
  "linux-systems/networking-from-a-packet": LinuxNetworkingChapterPage,
  "linux-systems/assemble-a-tiny-linux": LinuxTinySystemChapterPage,
  "infrastructure-design/network-namespaces-and-boundaries": NetworkNamespacesChapterPage,
  "infrastructure-design/veth-bridges-and-routing": VethRoutingChapterPage,
  "infrastructure-design/egress-nat-and-conntrack": EgressNatChapterPage,
  "infrastructure-design/service-discovery-and-load-balancing": ServiceDiscoveryChapterPage,
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

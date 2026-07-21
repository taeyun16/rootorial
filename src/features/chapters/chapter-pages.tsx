import { lazy, Suspense } from "react";
import type { ComponentType } from "react";
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

type ChapterComponent = ComponentType<{ learnerCount?: number }>;
type ChapterModuleLoader = () => Promise<{ default: ChapterComponent }>;

function chapterPage(load: ChapterModuleLoader): ComponentType<ChapterPageProps> {
  const Chapter = lazy(load);
  return function LazyChapterPage({ learnerCount }: ChapterPageProps) {
    return (
      <Suspense fallback={<main className="chapter-shell chapter-loading-shell"><p role="status">Loading chapter…</p></main>}>
        <Chapter learnerCount={learnerCount} />
      </Suspense>
    );
  };
}

const chapterPages = {
  "transformer-from-zero/vectors": chapterPage(() => import("../../components/VectorsChapter").then(({ VectorsChapter }) => ({ default: VectorsChapter }))),
  "transformer-from-zero/optimization": chapterPage(() => import("../../components/optimization/OptimizationChapter").then(({ OptimizationChapter }) => ({ default: OptimizationChapter }))),
  "transformer-from-zero/neural-networks": chapterPage(() => import("../../components/neural-networks/NeuralNetworksChapter").then(({ NeuralNetworksChapter }) => ({ default: NeuralNetworksChapter }))),
  "transformer-from-zero/training": chapterPage(() => import("../../components/training/TrainingChapter").then(({ TrainingChapter }) => ({ default: TrainingChapter }))),
  "transformer-from-zero/embeddings": chapterPage(() => import("../../components/embeddings/EmbeddingsChapter").then(({ EmbeddingsChapter }) => ({ default: EmbeddingsChapter }))),
  "transformer-from-zero/sequences": chapterPage(() => import("../../components/sequences/SequencesChapter").then(({ SequencesChapter }) => ({ default: SequencesChapter }))),
  "transformer-from-zero/attention": chapterPage(() => import("../../components/attention/AttentionChapter").then(({ AttentionChapter }) => ({ default: AttentionChapter }))),
  "transformer-from-zero/self-attention": chapterPage(() => import("../../components/self-attention/SelfAttentionChapter").then(({ SelfAttentionChapter }) => ({ default: SelfAttentionChapter }))),
  "transformer-from-zero/transformer-block": chapterPage(() => import("../../components/transformer-block/TransformerBlockChapter").then(({ TransformerBlockChapter }) => ({ default: TransformerBlockChapter }))),
  "transformer-from-zero/mini-transformer": chapterPage(() => import("../../components/mini-transformer/MiniTransformerChapter").then(({ MiniTransformerChapter }) => ({ default: MiniTransformerChapter }))),
  "linux-systems/shell-and-filesystem": chapterPage(() => import("../../components/linux/LinuxShellChapter").then(({ LinuxShellChapter }) => ({ default: LinuxShellChapter }))),
  "linux-systems/boot-to-shell": chapterPage(() => import("../../components/linux/LinuxBootChapter").then(({ LinuxBootChapter }) => ({ default: LinuxBootChapter }))),
  "linux-systems/processes-and-signals": chapterPage(() => import("../../components/linux/LinuxProcessesChapter").then(({ LinuxProcessesChapter }) => ({ default: LinuxProcessesChapter }))),
  "linux-systems/users-and-permissions": chapterPage(() => import("../../components/linux/LinuxPermissionsChapter").then(({ LinuxPermissionsChapter }) => ({ default: LinuxPermissionsChapter }))),
  "linux-systems/memory-and-virtual-addresses": chapterPage(() => import("../../components/linux/LinuxMemoryChapter").then(({ LinuxMemoryChapter }) => ({ default: LinuxMemoryChapter }))),
  "linux-systems/storage-and-filesystems": chapterPage(() => import("../../components/linux/LinuxStorageChapter").then(({ LinuxStorageChapter }) => ({ default: LinuxStorageChapter }))),
  "linux-systems/networking-from-a-packet": chapterPage(() => import("../../components/linux/LinuxNetworkingChapter").then(({ LinuxNetworkingChapter }) => ({ default: LinuxNetworkingChapter }))),
  "linux-systems/assemble-a-tiny-linux": chapterPage(() => import("../../components/linux/LinuxTinySystemChapter").then(({ LinuxTinySystemChapter }) => ({ default: LinuxTinySystemChapter }))),
  "infrastructure-design/network-policy-and-firewalls": chapterPage(() => import("../../components/infrastructure/NetworkPolicyChapter").then(({ NetworkPolicyChapter }) => ({ default: NetworkPolicyChapter }))),
  "infrastructure-design/network-namespaces-and-boundaries": chapterPage(() => import("../../components/infrastructure/NetworkNamespacesChapter").then(({ NetworkNamespacesChapter }) => ({ default: NetworkNamespacesChapter }))),
  "infrastructure-design/veth-bridges-and-routing": chapterPage(() => import("../../components/infrastructure/VethRoutingChapter").then(({ VethRoutingChapter }) => ({ default: VethRoutingChapter }))),
  "infrastructure-design/egress-nat-and-conntrack": chapterPage(() => import("../../components/infrastructure/EgressNatChapter").then(({ EgressNatChapter }) => ({ default: EgressNatChapter }))),
  "infrastructure-design/service-discovery-and-load-balancing": chapterPage(() => import("../../components/infrastructure/ServiceDiscoveryChapter").then(({ ServiceDiscoveryChapter }) => ({ default: ServiceDiscoveryChapter }))),
  "infrastructure-design/availability-and-failure-domains": chapterPage(() => import("../../components/infrastructure/AvailabilityFailureDomainsChapter").then(({ AvailabilityFailureDomainsChapter }) => ({ default: AvailabilityFailureDomainsChapter }))),
  "infrastructure-design/network-observability-and-capacity": chapterPage(() => import("../../components/infrastructure/NetworkObservabilityCapacityChapter").then(({ NetworkObservabilityCapacityChapter }) => ({ default: NetworkObservabilityCapacityChapter }))),
  "infrastructure-design/assemble-a-namespace-platform": chapterPage(() => import("../../components/infrastructure/NamespacePlatformChapter").then(({ NamespacePlatformChapter }) => ({ default: NamespacePlatformChapter }))),
} satisfies Record<RegisteredChapterId, ComponentType<ChapterPageProps>>;

export function getChapterPage(
  curriculumSlug: string,
  chapterSlug: string,
): ComponentType<ChapterPageProps> | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterPages[id] : undefined;
}

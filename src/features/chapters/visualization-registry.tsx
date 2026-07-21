import type { ComponentType } from "react";
import { DnsTtlEvidence } from "../../components/linux-networking/evidence/DnsTtlEvidence";
import { NetworkDiagnosticEvidence } from "../../components/linux-networking/evidence/NetworkDiagnosticEvidence";
import { RoutePrefixEvidence } from "../../components/linux-networking/evidence/RoutePrefixEvidence";
import { TcpBoundaryEvidence } from "../../components/linux-networking/evidence/TcpBoundaryEvidence";
import type { AdvancedNetworkEvidenceProps } from "../../components/linux-networking/evidence/evidence-types";
import {
  getChapterExperienceContract,
  type VisualizationKey,
} from "./experience-contracts";

export const chapterVisualizationRegistry = Object.freeze({
  "diagnostic-evidence-ladder": NetworkDiagnosticEvidence,
  "dns-ttl-timeline": DnsTtlEvidence,
  "route-prefix-bars": RoutePrefixEvidence,
  "tcp-boundary-sequence": TcpBoundaryEvidence,
} satisfies Record<VisualizationKey, ComponentType<AdvancedNetworkEvidenceProps>>);

export function ChapterContractVisualization({
  chapterId,
  ...props
}: AdvancedNetworkEvidenceProps & { chapterId: string }) {
  const contract = getChapterExperienceContract(chapterId);
  const visualizationKey = contract?.visualizationKey;
  if (!visualizationKey) return null;
  const Visualization = chapterVisualizationRegistry[visualizationKey];
  return (
    <div data-visualization-key={visualizationKey}>
      <Visualization {...props} />
    </div>
  );
}

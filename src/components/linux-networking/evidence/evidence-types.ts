import type { AdvancedChapterConfig } from "../../../features/linux-networking/advanced-networking";

export type AdvancedNetworkEvidenceProps = {
  config: AdvancedChapterConfig;
  locale: "ko" | "en";
  phaseId: string;
  visited: ReadonlySet<string>;
};

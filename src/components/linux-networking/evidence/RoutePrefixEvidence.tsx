import { RankedBarLens } from "../../interactive/evidence/RankedBarLens";
import type { AdvancedNetworkEvidenceProps } from "./evidence-types";

export function RoutePrefixEvidence({ locale, phaseId }: AdvancedNetworkEvidenceProps) {
  const text = (ko: string, en: string) => locale === "ko" ? ko : en;
  return (
    <RankedBarLens
      ariaLabel={text("longest-prefix 비교 차트", "Longest-prefix comparison chart")}
      items={[
        { id: "primary", label: "203.0.113.0/24", value: 24, meta: "/24 · metric 20", selected: phaseId !== "inspect-table", annotation: phaseId !== "inspect-table" ? text("선택", "SELECTED") : undefined },
        { id: "backup", label: "203.0.113.0/24", value: 24, meta: "/24 · metric 80", annotation: text("동일 길이 · 높은 metric", "SAME LENGTH · HIGHER METRIC") },
        { id: "default", label: "0.0.0.0/0", value: 0, meta: "/0 · metric 100" },
      ]}
      kicker="LINKED VIEW · ROUTE CANDIDATES"
      maxValue={24}
      title={text("프리픽스 길이를 먼저, 같은 길이면 metric을 비교합니다", "Compare prefix length first, then metric only on a tie")}
      visualizationKey="route-prefix-bars"
    />
  );
}

import { RankedBarLens } from "../../interactive/evidence/RankedBarLens";
import type { AdvancedNetworkEvidenceProps } from "./evidence-types";

export function RoutePrefixEvidence({ config, locale, phaseId }: AdvancedNetworkEvidenceProps) {
  const text = (ko: string, en: string) => locale === "ko" ? ko : en;
  const lookup = config.figure.phases.find(phase => phase.id === phaseId)?.routeLookup;
  if (!lookup) return null;
  return (
    <RankedBarLens
      ariaLabel={text("longest-prefix 비교 차트", "Longest-prefix comparison chart")}
      items={lookup.candidates.map(route => ({
        id: route.id, label: route.prefix, value: route.prefixLength,
        meta: `/${route.prefixLength} · metric ${route.metric} · via ${route.nextHop}`,
        selected: phaseId !== "inspect-table" && route.id === lookup.selected?.id,
        annotation: phaseId !== "inspect-table" && route.id === lookup.selected?.id ? text("선택", "SELECTED") : undefined,
      }))}
      kicker={`LINKED VIEW · ${lookup.destination} · ROUTE CANDIDATES`}
      maxValue={32}
      title={text("프리픽스 길이를 먼저, 같은 길이만 metric을 봅니다", "Compare prefix length first, then metric only on a tie")}
      visualizationKey="route-prefix-bars"
    />
  );
}

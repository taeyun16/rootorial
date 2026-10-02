import { StateTimeline } from "../../interactive/evidence/StateTimeline";
import type { AdvancedNetworkEvidenceProps } from "./evidence-types";

export function DnsTtlEvidence({ config, locale, phaseId, visited }: AdvancedNetworkEvidenceProps) {
  const phaseIndex = config.figure.phases.findIndex((phase) => phase.id === phaseId);
  const text = (ko: string, en: string) => locale === "ko" ? ko : en;
  const ttl = phaseId === "dns-answer" ? 30 : phaseId === "cache-hit" ? 18 : phaseIndex > 2 ? 12 : 0;
  const stages = [
    { id: "cache-miss", label: text("이름", "Name") },
    { id: "dns-answer", label: "A record" },
    { id: "route", label: text("경로", "Route") },
    { id: "tcp-connect", label: "TCP" },
    { id: "response", label: "HTTP" },
  ];
  return (
    <StateTimeline
      ariaLabel={text("DNS TTL과 서비스 도달 타임라인", "DNS TTL and service-reachability timeline")}
      kicker="LINKED VIEW · CACHE LIFETIME"
      meterLabel={text("남은 cache 수명", "cache lifetime remaining")}
      meterMaximum={30}
      meterUnit="s"
      meterValue={ttl}
      steps={stages.map(stage => ({ ...stage, reached: visited.has(stage.id) }))}
      title={text("이름 해석과 서비스 응답은 서로 다른 검증입니다", "Name resolution and service response are separate checks")}
      visualizationKey="dns-ttl-timeline"
    />
  );
}

import { BoundarySequence } from "../../interactive/evidence/BoundarySequence";
import type { AdvancedNetworkEvidenceProps } from "./evidence-types";

export function TcpBoundaryEvidence({ config, locale, phaseId, visited }: AdvancedNetworkEvidenceProps) {
  const text = (ko: string, en: string) => locale === "ko" ? ko : en;
  return (
    <BoundarySequence
      actors={["CLIENT APP", "CLIENT KERNEL", "SERVER KERNEL", "SERVER APP"]}
      ariaLabel={text("TCP 경계 시퀀스 다이어그램", "TCP boundary sequence diagram")}
      kicker="LINKED VIEW · PROCESS / KERNEL SEQUENCE"
      steps={config.figure.phases.map((phase, index) => ({
        id: phase.id,
        index: String(index + 1).padStart(2, "0"),
        label: phase.label[locale],
        detail: phase.facts.map((fact) => fact.value).join(" · "),
        state: phase.id === phaseId ? "current" : visited.has(phase.id) ? "visited" : "pending",
      }))}
      title={text("ACK와 application read의 증거 경계를 분리합니다", "Separate ACK evidence from application-read evidence")}
      visualizationKey="tcp-boundary-sequence"
    />
  );
}

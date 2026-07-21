import { EvidenceLadder } from "../../interactive/evidence/EvidenceLadder";
import type { AdvancedNetworkEvidenceProps } from "./evidence-types";

export function NetworkDiagnosticEvidence({ config, locale, phaseId, visited }: AdvancedNetworkEvidenceProps) {
  const text = (ko: string, en: string) => locale === "ko" ? ko : en;
  return (
    <EvidenceLadder
      ariaLabel={text("네트워크 진단 증거 사다리", "Network diagnostic evidence ladder")}
      kicker="LINKED VIEW · FIRST FAILED BOUNDARY"
      steps={config.figure.phases.map((phase, index) => {
        const state = phase.id === phaseId ? "current" : visited.has(phase.id) ? "proven" : "pending";
        return {
          id: phase.id,
          index: String(index + 1).padStart(2, "0"),
          label: phase.label[locale],
          detail: phase.command,
          state,
          statusLabel: state === "current" ? text("관찰 중", "OBSERVING") : state === "proven" ? text("증명됨", "PROVEN") : text("미검증", "UNTESTED"),
        };
      })}
      title={text("가까운 경계부터 증거를 쌓고 첫 단절에서 멈춥니다", "Build evidence outward and stop at the first break")}
      visualizationKey="diagnostic-evidence-ladder"
    />
  );
}

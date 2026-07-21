import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  canCompleteSubnetIncidents,
  evaluateSubnetIncidentRepair,
  subnetIncidentIds,
  type SubnetIncidentId,
  type SubnetRepairId,
} from "../../features/linux-networking/subnets-neighbors-and-gateways";

const repairs: SubnetRepairId[] = ["restore-prefix-24", "refresh-peer-neighbor", "restore-default-route", "restore-on-link-gateway"];

export function SubnetIncidentLab({ onCompletionChange }: { onCompletionChange?: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [active, setActive] = useState<SubnetIncidentId>("prefix-too-wide");
  const [solved, setSolved] = useState<Partial<Record<SubnetIncidentId, SubnetRepairId>>>({});
  const [feedback, setFeedback] = useState<string>("");
  const complete = canCompleteSubnetIncidents(solved);
  useEffect(() => onCompletionChange?.(complete), [complete, onCompletionChange]);

  const incidentCopy: Record<SubnetIncidentId, [string, string, string, string]> = {
    "prefix-too-wide": ["프리픽스가 /16으로 넓어짐", "Prefix widened to /16", "203.0.113.20은 아니지만 10.20.44.9까지 같은 링크라고 오판합니다.", "The host now misclassifies 10.20.44.9 as on-link."],
    "wrong-peer-mac": ["이웃 MAC이 오래된 값", "Neighbor MAC is stale", "10.20.0.44의 프레임이 이전 장치로 향합니다.", "Frames for 10.20.0.44 target an old device."],
    "default-route-missing": ["기본 경로가 사라짐", "Default route is missing", "같은 링크는 되지만 203.0.113.20은 경로 선택에서 막힙니다.", "On-link delivery works, but the remote destination is blocked at route selection."],
    "gateway-off-link": ["게이트웨이가 링크 밖에 있음", "Gateway is off-link", "10.21.0.1의 MAC을 현재 /24에서 해석할 수 없습니다.", "The host cannot resolve 10.21.0.1 on the current /24."],
  };
  const repairCopy: Record<SubnetRepairId, [string, string]> = {
    "restore-prefix-24": ["10.20.0.2/24로 복구", "Restore 10.20.0.2/24"],
    "refresh-peer-neighbor": ["이웃 항목을 다시 해석", "Refresh the neighbor entry"],
    "restore-default-route": ["default via 10.20.0.1 복구", "Restore default via 10.20.0.1"],
    "restore-on-link-gateway": ["게이트웨이를 10.20.0.1로 복구", "Restore gateway 10.20.0.1"],
  };

  function repair(id: SubnetRepairId) {
    const result = evaluateSubnetIncidentRepair(active, id);
    setFeedback(result.correct ? t("정확한 경계만 복구했습니다.", "You repaired exactly the broken boundary.") : t("이 조치는 현재 증거와 맞지 않습니다.", "That change does not match the current evidence."));
    if (result.correct) setSolved((current) => ({ ...current, [active]: id }));
  }

  return (
    <div className="subnet-incident-lab">
      <div className="subnet-incident-tabs" role="tablist" aria-label={t("장애 사건", "Network incidents")}>
        {subnetIncidentIds.map((id, index) => <button key={id} type="button" role="tab" aria-selected={active === id} className={active === id ? "is-active" : solved[id] ? "is-solved" : undefined} onClick={() => { setActive(id); setFeedback(""); }}><span>{solved[id] ? "✓" : String(index + 1).padStart(2, "0")}</span>{incidentCopy[id][locale === "ko" ? 0 : 1]}</button>)}
      </div>
      <div className="subnet-incident-scene" role="tabpanel">
        <p className="section-index">FAULT EVIDENCE</p>
        <h3>{incidentCopy[active][locale === "ko" ? 0 : 1]}</h3>
        <p>{incidentCopy[active][locale === "ko" ? 2 : 3]}</p>
        <div className="subnet-repair-actions">
          {repairs.map((id) => <button key={id} type="button" onClick={() => repair(id)}>{repairCopy[id][locale === "ko" ? 0 : 1]}</button>)}
        </div>
        <div className="subnet-repair-feedback" role="status" aria-live="polite">{feedback || t("관찰과 일치하는 최소 복구를 실행하세요.", "Execute the smallest repair supported by the evidence.")}</div>
      </div>
    </div>
  );
}

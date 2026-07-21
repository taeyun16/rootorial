import { useEffect, useState } from "react";
import { availabilityIncidentFixtures, evaluateAvailabilityIncident, type AvailabilityIncidentId, type AvailabilityRepair } from "../../features/infrastructure/availability-failure-domains";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(availabilityIncidentFixtures) as AvailabilityIncidentId[];

export function AvailabilityFailureDomainIncidentLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<AvailabilityIncidentId, AvailabilityRepair>>>({});
  const [results, setResults] = useState<Partial<Record<AvailabilityIncidentId, ReturnType<typeof evaluateAvailabilityIncident>>>>({});
  const [completed, setCompleted] = useState<AvailabilityIncidentId[]>([]);
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);
  const copy: Record<AvailabilityIncidentId, { title: string; evidence: string }> = {
    "replicas-share-zone": { title: t("replica 셋이 하나의 zone을 공유", "All replicas share one zone"), evidence: "app-a · zone-a\napp-b · zone-a\napp-c · zone-a" },
    "gateways-share-domain": { title: t("gateway 둘이 같은 failure domain을 공유", "Both gateways share one failure domain"), evidence: "gateway-a · rack-a · zone-a\ngateway-b · rack-a · zone-a" },
    "standby-shares-zone": { title: t("DB standby가 primary와 같은 zone", "The DB standby shares the primary zone"), evidence: "db-primary · zone-a\ndb-standby · zone-a" },
    "optional-dependency-cascade": { title: t("추천 dependency 장애가 전체 request를 실패", "A recommendations outage fails the whole request"), evidence: "recommendations timeout → app 500\nrequired dependency budget consumed" },
  };
  const optionLabel = (repair: AvailabilityRepair) => ({
    "spread-replicas-across-zones": t("replica를 A/B/C zone에 분산", "spread replicas across zones A/B/C"),
    "add-replica-same-zone": t("zone A에 replica 하나 추가", "add another replica in zone A"),
    "split-gateways-across-zones": t("gateway를 zone A/B에 분산", "split gateways across zones A/B"),
    "increase-gateway-size": t("같은 gateway의 instance size 증가", "increase the same gateway instance size"),
    "move-standby-to-zone-b": t("standby를 zone B로 이동", "move standby to zone B"),
    "add-backup-same-rack": t("같은 rack에 backup 추가", "add a backup in the same rack"),
    "degrade-optional-dependency": t("추천 결과 없이 degraded response", "serve a degraded response without recommendations"),
    "increase-retry-count": t("timeout retry 횟수 증가", "increase timeout retries"),
  } satisfies Record<AvailabilityRepair, string>)[repair];
  function choose(id: AvailabilityIncidentId, repair: AvailabilityRepair) {
    setRepairs((current) => ({ ...current, [id]: repair }));
    setResults((current) => { const next = { ...current }; delete next[id]; return next; });
    setCompleted((current) => current.filter((candidate) => candidate !== id));
  }
  function run(id: AvailabilityIncidentId) {
    const repair = repairs[id]; if (!repair) return;
    const result = evaluateAvailabilityIncident(id, repair); setResults((current) => ({ ...current, [id]: result }));
    setCompleted((current) => result.passed ? [...new Set([...current, id])] : current.filter((candidate) => candidate !== id));
  }
  function reset() { setRepairs({}); setResults({}); setCompleted(() => []); }
  return <section className="interactive-lab availability-incident-lab" data-interactive-ready={ready ? "true" : "false"} aria-labelledby="availability-incidents-title"><div className="availability-lab-header"><div><p className="concept-check-kicker">REQUIRED ACTIVITY · FOUR CORRELATED FAILURES</p><h3 id="availability-incidents-title">{t("replica 수가 아니라 독립 failure domain으로 네 사건을 수리", "Repair four incidents with independent failure domains, not replica counts")}</h3></div><strong>{completed.length} / 4</strong></div><div className="availability-toolbar"><button type="button" className="button button-ghost" onClick={reset}>{t("모든 사건 초기화", "Reset all incidents")}</button></div><div className="availability-incident-grid">{incidentIds.map((id, index) => { const result = results[id]; const item = copy[id]; return <article key={id} data-incident-id={id}><span>{String(index + 1).padStart(2, "0")} · {id}</span><h4>{item.title}</h4><pre>{item.evidence}</pre><InfrastructureChoiceRail compact controlId={`availability-incident-${id}-repair`} label={t("failure domain에 적용할 최소 수리", "Minimal repair for the failure domain")} value={repairs[id] ?? ""} options={availabilityIncidentFixtures[id].repairs.map((repair) => ({ value: repair, label: optionLabel(repair) }))} onChange={(repair) => choose(id, repair)} /><button type="button" className="button button-primary" disabled={!repairs[id]} onClick={() => run(id)}>{t("failure trace 재실행", "Re-run failure trace")}</button><div className={`availability-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">{result ? result.passed ? t("통과 — 독립 failure domain과 degraded contract를 복구했습니다.", "Passed — independent failure domains and the degraded contract are restored.") : t(`실패 — ${result.reason} 상태가 남았습니다.`, `Failed — ${result.reason} remains.`) : t("증거와 첫 correlated boundary를 연결하세요.", "Connect the evidence to the first correlated boundary.")}</div></article>; })}</div></section>;
}

import { buildAvailabilityVisualState } from "../../features/infrastructure/availability-failure-domains-visual";
import type {
  AvailabilityDraft,
  AvailabilityEvaluation,
  DatabasePlacement,
  DomainPlacement,
  OptionalDependencyPolicy,
  RecoveryTime,
} from "../../features/infrastructure/availability-failure-domains";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail, InfrastructureStateSwitch } from "./InfrastructureInteractionPrimitives";

export function AvailabilityFailureDomainView({
  draft,
  evaluation,
  onGatewayPlacementChange,
  onReplicaPlacementChange,
  onDatabasePlacementChange,
  onDependencyPolicyChange,
  onRecoverySecondsChange,
}: {
  draft: AvailabilityDraft;
  evaluation: AvailabilityEvaluation | null;
  onGatewayPlacementChange: (value: DomainPlacement) => void;
  onReplicaPlacementChange: (value: DomainPlacement) => void;
  onDatabasePlacementChange: (value: DatabasePlacement) => void;
  onDependencyPolicyChange: (value: OptionalDependencyPolicy) => void;
  onRecoverySecondsChange: (value: RecoveryTime) => void;
}) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const visual = buildAvailabilityVisualState(draft, evaluation);
  return (
    <section className="availability-visual" data-testid="availability-failure-domain-visualization" data-mode={visual.mode} data-platform-state={visual.platformState} data-grade-state={visual.gradeState} data-failure-domain={visual.failureDomain} aria-labelledby="availability-visual-title">
      <header><div><span>ZONE A FAILURE · N-1 TRACE</span><h4 id="availability-visual-title">{t("failure domain과 recovery budget 지도", "Failure-domain and recovery-budget map")}</h4></div><strong>{evaluation ? evaluation.passed ? t("목표 통과", "Target passed") : t("최초 실패 표시", "First failure shown") : t("실행 전 · 판정 숨김", "Before run · verdict hidden")}</strong></header>
      <div className="availability-map" role="group" aria-label={t("zone A·B·C에 gateway, app replica, database와 optional dependency를 배치한 가용성 지도", "Availability map placing gateways, app replicas, databases, and an optional dependency across zones A, B, and C")}>
        {(["a", "b", "c"] as const).map((zone) => <section key={zone} className="availability-zone" data-zone={zone}><h5>ZONE {zone.toUpperCase()}</h5>{visual.nodes.filter((node) => node.zone === zone).map((node) => <article key={node.id} data-node-id={node.id} data-role={node.role} data-active={node.active ? "true" : "false"}><span>{node.role.toUpperCase()}</span><strong>{node.id}</strong>{zone === "a" && evaluation ? <small>{t("failure domain 제거", "failure domain removed")}</small> : null}</article>)}</section>)}
      </div>
      <div className="availability-placement-controls">
        <InfrastructureChoiceRail compact controlId="gateway-placement" label={t("gateway 카드를 failure domain에 배치", "Place gateway cards across failure domains")} value={draft.gatewayPlacement} options={[
          { value: "same-zone-a", label: "A + A", detail: t("같은 zone", "same zone") },
          { value: "split-zones", label: "A + B", detail: t("독립 zone", "independent zones") },
        ]} onChange={onGatewayPlacementChange} />
        <InfrastructureChoiceRail compact controlId="replica-placement" label={t("app replica 카드를 zone에 배치", "Place app replica cards across zones")} value={draft.replicaPlacement} options={[
          { value: "same-zone-a", label: "A + A + A", detail: t("상관 장애", "correlated") },
          { value: "split-zones", label: "A + B + C", detail: t("분산 배치", "spread") },
        ]} onChange={onReplicaPlacementChange} />
        <InfrastructureChoiceRail compact controlId="database-placement" label={t("database standby 카드를 배치", "Place the database standby card")} value={draft.databasePlacement} options={[
          { value: "same-zone-standby", label: "primary A · standby A" },
          { value: "cross-zone-standby", label: "primary A · standby B" },
        ]} onChange={onDatabasePlacementChange} />
        <InfrastructureStateSwitch
          controlId="optional-dependency-policy"
          label={t("recommendations dependency", "Recommendations dependency")}
          detail={t("zone 장애 시 degraded mode 허용", "Allow degraded mode during a zone failure")}
          checked={draft.optionalDependencyPolicy === "degraded-mode"}
          stateOn={t("DEGRADED", "DEGRADED")}
          stateOff={t("REQUIRED", "REQUIRED")}
          onChange={(checked) => onDependencyPolicyChange(checked ? "degraded-mode" : "required")}
        />
        <label className="availability-recovery-control">
          <span>{t("zone failover recovery budget", "Zone failover recovery budget")}</span>
          <input
            type="range"
            min="20"
            max="90"
            step="70"
            value={draft.recoverySeconds}
            data-control-id="recovery-seconds"
            aria-label={t("zone failover recovery seconds", "Zone failover recovery seconds")}
            onChange={(event) => onRecoverySecondsChange(Number(event.currentTarget.value) as RecoveryTime)}
          />
          <output>{draft.recoverySeconds}s · {draft.recoverySeconds === 20 ? t("40 request loss", "40 request loss") : t("budget 초과", "over budget")}</output>
        </label>
      </div>
      <div className="availability-meter" data-availability-state={evaluation ? evaluation.passed ? "target-met" : "target-missed" : "not-run"}><div><span>{t("served request", "Served requests")}</span><strong>{visual.servedRequests === null ? "NOT RUN" : `${visual.servedRequests.toLocaleString()} / 10,000`}</strong></div><div><span>{t("가용성", "Availability")}</span><strong>{visual.availability === null ? "—" : `${visual.availability.toFixed(2)}%`}</strong></div><div><span>{t("목표", "Target")}</span><strong>≥ 99.50%</strong></div></div>
      <ol className="availability-checks">{visual.checks.map((check) => <li key={check.id} data-check-id={check.id} data-check-status={check.status}><span>{check.id}</span><strong>{check.status}</strong></li>)}</ol>
    </section>
  );
}

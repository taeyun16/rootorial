import { buildAvailabilityVisualState } from "../../features/infrastructure/availability-failure-domains-visual";
import type { AvailabilityDraft, AvailabilityEvaluation } from "../../features/infrastructure/availability-failure-domains";
import { useLocale } from "../../features/localization/localization";

export function AvailabilityFailureDomainView({ draft, evaluation }: { draft: AvailabilityDraft; evaluation: AvailabilityEvaluation | null }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const visual = buildAvailabilityVisualState(draft, evaluation);
  return (
    <section className="availability-visual" data-testid="availability-failure-domain-visualization" data-mode={visual.mode} data-platform-state={visual.platformState} data-grade-state={visual.gradeState} data-failure-domain={visual.failureDomain} aria-labelledby="availability-visual-title">
      <header><div><span>ZONE A FAILURE · N-1 TRACE</span><h4 id="availability-visual-title">{t("failure domain과 recovery budget 지도", "Failure-domain and recovery-budget map")}</h4></div><strong>{evaluation ? evaluation.passed ? t("목표 통과", "Target passed") : t("최초 실패 표시", "First failure shown") : t("실행 전 · 판정 숨김", "Before run · verdict hidden")}</strong></header>
      <div className="availability-map" role="img" aria-label={t("zone A·B·C에 gateway, app replica, database와 optional dependency를 배치한 가용성 지도", "Availability map placing gateways, app replicas, databases, and an optional dependency across zones A, B, and C")}>
        {(["a", "b", "c"] as const).map((zone) => <section key={zone} className="availability-zone" data-zone={zone}><h5>ZONE {zone.toUpperCase()}</h5>{visual.nodes.filter((node) => node.zone === zone).map((node) => <article key={node.id} data-node-id={node.id} data-role={node.role} data-active={node.active ? "true" : "false"}><span>{node.role.toUpperCase()}</span><strong>{node.id}</strong>{zone === "a" && evaluation ? <small>{t("failure domain 제거", "failure domain removed")}</small> : null}</article>)}</section>)}
      </div>
      <div className="availability-meter" data-availability-state={evaluation ? evaluation.passed ? "target-met" : "target-missed" : "not-run"}><div><span>{t("served request", "Served requests")}</span><strong>{visual.servedRequests === null ? "NOT RUN" : `${visual.servedRequests.toLocaleString()} / 10,000`}</strong></div><div><span>{t("가용성", "Availability")}</span><strong>{visual.availability === null ? "—" : `${visual.availability.toFixed(2)}%`}</strong></div><div><span>{t("목표", "Target")}</span><strong>≥ 99.50%</strong></div></div>
      <ol className="availability-checks">{visual.checks.map((check) => <li key={check.id} data-check-id={check.id} data-check-status={check.status}><span>{check.id}</span><strong>{check.status}</strong></li>)}</ol>
    </section>
  );
}

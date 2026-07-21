import { useId } from "react";
import {
  buildNetworkObservabilityVisualState,
  type ObservabilityGradeState,
  type ObservabilityVisualMetric,
} from "../../features/infrastructure/network-observability-capacity-visual";
import type {
  CapacityEvaluation,
  CapacityResource,
  CapacityScenarioId,
  ObservationEvidenceEvaluation,
  ObservationProbeId,
} from "../../features/infrastructure/network-observability-capacity";
import { useLocale } from "../../features/localization/localization";

export function NetworkObservabilityCapacityView({
  evidence,
  capacity,
  scenarioId,
  baselineLimitingResource,
  evidenceGradeState,
  capacityGradeState,
}: {
  evidence: ObservationEvidenceEvaluation;
  capacity: CapacityEvaluation;
  scenarioId: CapacityScenarioId;
  baselineLimitingResource?: CapacityResource;
  evidenceGradeState: ObservabilityGradeState;
  capacityGradeState: ObservabilityGradeState;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const pathTitleId = useId();
  const pathDescriptionId = useId();
  const state = buildNetworkObservabilityVisualState({
    evidence,
    capacity,
    scenarioId,
    baselineLimitingResource,
    evidenceGradeState,
    capacityGradeState,
  });
  const probeLabel = (probeId: ObservationProbeId) => ({
    "client-route": "ip route get",
    "edge-counter": "ip/tc Δ",
    "edge-capture": "tcpdump",
    "app-sockets": "ss -lnt",
  }[probeId]);
  const resourceLabel = (resource: CapacityResource) => ({
    "edge-bandwidth": t("edge bandwidth", "edge bandwidth"),
    "edge-queue": t("edge burst queue", "edge burst queue"),
    "app-connections": t("app connections", "app connections"),
  }[resource]);
  const scenarioLabel = ({
    "bandwidth-saturation": t("bandwidth saturation", "bandwidth saturation"),
    "burst-queue": t("burst queue", "burst queue"),
    "connection-limit": t("connection limit", "connection limit"),
  } as const)[scenarioId];
  const hostProbes = state.probes.filter(({ namespaceId }) => namespaceId === "host");
  const probeDescription = state.probes
    .map((probe) => `${probeLabel(probe.probeId)}: ${probe.namespaceId} namespace · ${probe.placement === "scoped" ? t("scope 일치", "scoped") : t("잘못된 scope", "mis-scoped")}`)
    .join(". ");
  const utilizationStateLabel = (metricState: ObservabilityVisualMetric["state"]) => ({
    "not-run": t("계산 전", "not calculated"),
    headroom: t("30% headroom 확보", "30% headroom available"),
    warning: t("30% headroom 부족", "below the 30% headroom target"),
    saturated: t("포화 또는 용량 초과", "saturated or overloaded"),
  }[metricState]);

  return (
    <figure
      className="network-observability-visualization"
      data-testid="network-observability-visualization"
      data-evidence-state={state.evidenceState}
      data-evidence-grade-state={state.evidenceGradeState}
      data-capacity-scenario={state.scenarioId}
      data-bottleneck={state.displayedBottleneck}
      data-grade-state={state.capacityGradeState}
    >
      <figcaption className="network-observability-visual-header">
        <div>
          <span>PACKET PATH · EVIDENCE SCOPE</span>
          <strong>{state.evidenceGradeState === "not-run"
            ? t("증거 판정 전", "Evidence not graded")
            : state.evidenceGradeState === "passed"
              ? t("같은 flow·window에 정렬됨", "Aligned to one flow and window")
              : t("scope 또는 claim 불일치", "Scope or claim mismatch")}</strong>
        </div>
        <div>
          <span>CAPACITY PLAN · {scenarioLabel}</span>
          <strong>{state.displayedBottleneck === "not-run"
            ? t("실행 전 — 병목 숨김", "Not run — bottleneck hidden")
            : `${t("baseline 제한 resource", "baseline limiting resource")}: ${resourceLabel(state.displayedBottleneck)}`}</strong>
        </div>
      </figcaption>

      <div
        className="network-observability-path-map"
        role="group"
        aria-labelledby={pathTitleId}
        aria-describedby={pathDescriptionId}
      >
        <span className="sr-only" id={pathTitleId}>{t(
          "namespace별 probe packet path와 capacity 비교",
          "Namespace-scoped probe packet path and capacity comparison",
        )}</span>
        <span className="sr-only" id={pathDescriptionId}>{t(
          `client에서 data까지의 packet path에 namespace별 probe를 배치하고 ${scenarioLabel}의 bandwidth, queue와 connection capacity를 비교하는 지도`,
          `Map aligning namespace-scoped probes from client to data and comparing bandwidth, queue, and connection capacity for ${scenarioLabel}`,
        )}. {t("현재 probe 위치와 상태", "Current probe locations and status")}: {probeDescription}.</span>
        <svg viewBox="0 0 960 48" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <line x1="80" y1="24" x2="880" y2="24" />
          <path d="M860 12 L884 24 L860 36" />
        </svg>
        <div className="network-observability-boundary-grid">
          {state.boundaries.map((boundary) => (
            <article data-boundary-id={boundary.id} key={boundary.id}>
              <span>{boundary.label}</span>
              <strong>{({
                client: t("요청·route", "request and route"),
                edge: t("transit·queue", "transit and queue"),
                app: t("listener·connections", "listener and connections"),
                data: t("dependency 응답", "dependency response"),
              } as const)[boundary.id]}</strong>
              <div className="network-observability-probe-list">
                {state.probes
                  .filter(({ probeId }) => boundary.probeIds.includes(probeId))
                  .map((probe) => (
                    <span
                      data-probe-id={probe.probeId}
                      data-observation-scope={probe.namespaceId}
                      data-placement-state={probe.placement}
                      key={probe.probeId}
                    >
                      {probeLabel(probe.probeId)} · {probe.placement === "scoped" ? t("scope 일치", "scoped") : t("잘못된 scope", "mis-scoped")}
                    </span>
                  ))}
                {boundary.probeIds.length === 0 ? <em>{t("probe 없음", "no probe")}</em> : null}
              </div>
            </article>
          ))}
        </div>
      </div>

      {hostProbes.length > 0 ? (
        <div className="network-observability-host-probes" data-boundary-id="host">
          <strong>{t("path 밖 host view에 잘못 놓인 probe", "Probes misplaced in the host view outside the path")}</strong>
          <span>{hostProbes.map(({ probeId }) => probeLabel(probeId)).join(" · ")}</span>
        </div>
      ) : null}

      <div className="network-observability-capacity-grid" aria-hidden="true">
        {state.metrics.map((metric) => {
          const displayedPercent = metric.displayedUtilization === null
            ? 0
            : Math.min(100, metric.displayedUtilization * 100);
          return (
            <article
              data-capacity-resource={metric.resource}
              data-utilization-state={metric.state}
              data-displayed-utilization={metric.displayedUtilization === null ? "not-run" : String(metric.displayedUtilization)}
              key={metric.resource}
            >
              <header>
                <strong>{resourceLabel(metric.resource)}</strong>
                <span>{metric.displayedUtilization === null
                  ? "NOT RUN"
                  : `${Math.round(metric.displayedUtilization * 100)}%`}</span>
              </header>
              <div className="network-observability-capacity-track"><span style={{ width: `${displayedPercent}%` }} /></div>
              <p>{t("요구", "demand")} {formatMetric(metric.demand)} / {t("한도", "limit")} {formatMetric(metric.capacity)} {metric.unit}</p>
            </article>
          );
        })}
      </div>

      <p
        className="sr-only"
        data-testid="network-observability-capacity-summary"
        aria-live="polite"
      >
        {state.metrics.map((metric) => {
          const utilization = metric.displayedUtilization === null
            ? t("utilization 계산 전", "utilization not calculated")
            : `${t("utilization", "utilization")} ${Math.round(metric.displayedUtilization * 100)}%`;
          return `${resourceLabel(metric.resource)}: ${t("요구", "demand")} ${formatMetric(metric.demand)}, ${t("한도", "limit")} ${formatMetric(metric.capacity)} ${metric.unit}; ${utilization}; ${t("상태", "status")} ${utilizationStateLabel(metric.state)}`;
        }).join(". ")}
      </p>
    </figure>
  );
}

function formatMetric(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

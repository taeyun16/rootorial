import { useId, useMemo } from "react";
import { buildServicePathVisualState } from "../../features/infrastructure/service-discovery-visual";
import type {
  AffinityFailurePolicy,
  BalancingAlgorithm,
  MembershipPolicy,
  ResolverPolicy,
  ServicePathDraft,
  ServicePathEvaluation,
  ServicePathFailureReason,
} from "../../features/infrastructure/service-discovery";
import { useLocale } from "../../features/localization/localization";
import {
  InfrastructureChoiceRail,
  InfrastructureStateSwitch,
} from "./InfrastructureInteractionPrimitives";

export function ServicePathView({
  preview,
  evaluation,
  draft,
  onResolverPolicyChange,
  onOldVipRetirementChange,
  onVipListenerChange,
  onMembershipPolicyChange,
  onAlgorithmChange,
  onAffinityFailurePolicyChange,
}: {
  preview: ServicePathEvaluation;
  evaluation: ServicePathEvaluation | null;
  draft: ServicePathDraft;
  onResolverPolicyChange: (value: ResolverPolicy) => void;
  onOldVipRetirementChange: (value: number) => void;
  onVipListenerChange: (value: boolean) => void;
  onMembershipPolicyChange: (value: MembershipPolicy) => void;
  onAlgorithmChange: (value: BalancingAlgorithm) => void;
  onAffinityFailurePolicyChange: (value: AffinityFailurePolicy) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const id = useId().replace(/:/g, "");
  const visual = useMemo(
    () => buildServicePathVisualState(preview, evaluation ? (evaluation.passed ? "passed" : "failed") : "not-run"),
    [evaluation, preview],
  );
  const titleId = `${id}-service-path-title`;
  const descriptionId = `${id}-service-path-description`;
  const reasonCopy: Record<ServicePathFailureReason | "not-run", { ko: string; en: string }> = {
    "not-run": { ko: "실행 전", en: "NOT RUN" },
    connected: { ko: "service path 연결", en: "SERVICE PATH CONNECTED" },
    "refreshed-before-expiry": { ko: "TTL 전 조기 refresh", en: "REFRESHED BEFORE TTL" },
    "expired-cache-reused": { ko: "만료 cache 재사용", en: "EXPIRED CACHE REUSED" },
    "old-vip-retired-before-ttl": { ko: "기존 VIP 조기 종료", en: "OLD VIP RETIRED EARLY" },
    "vip-unavailable": { ko: "VIP listener 없음", en: "VIP UNAVAILABLE" },
    "no-healthy-backend": { ko: "healthy backend 없음", en: "NO HEALTHY BACKEND" },
    "unhealthy-backend-selected": { ko: "unhealthy backend 선택", en: "UNHEALTHY BACKEND SELECTED" },
    "affinity-broken": { ko: "affinity 불안정", en: "AFFINITY BROKEN" },
    "ineligible-affinity-retained": { ko: "실패 target affinity 유지", en: "FAILED AFFINITY RETAINED" },
    "listener-missing": { ko: "backend listener 없음", en: "BACKEND LISTENER MISSING" },
  };
  const reason = reasonCopy[visual.displayedReason][locale];
  const before = preview.dns.beforeExpiry;
  const after = preview.dns.atExpiry;
  const selectedBackend = preview.balancing.afterFailure.backendId;
  const description = visual.mode === "dns-lifecycle"
    ? t(
        `client가 api.internal을 조회합니다. t=${before.atSeconds}에는 ${before.source}에서 ${before.address}, t=${after.atSeconds}에는 ${after.source}에서 ${after.address}를 얻습니다. 현재 실행 상태는 ${reason}입니다.`,
        `The client resolves api.internal. At t=${before.atSeconds} it receives ${before.address} from ${before.source}; at t=${after.atSeconds} it receives ${after.address} from ${after.source}. The current execution state is ${reason}.`,
      )
    : t(
        `client-a connection이 VIP와 L4 balancer를 지나 ${selectedBackend ?? "선택된 backend 없음"}으로 향합니다. app-b는 unhealthy이며 현재 실행 상태는 ${reason}입니다.`,
        `The client-a connection crosses the VIP and Layer 4 balancer toward ${selectedBackend ?? "no selected backend"}. app-b is unhealthy. The current execution state is ${reason}.`,
      );

  return (
    <section
      className="service-path-visualization"
      data-testid="service-path-visualization"
      data-service-mode={visual.mode}
      data-topology-state={visual.topologyState}
      data-cache-state={visual.cacheState}
      data-resolution-state={visual.resolutionState}
      data-selection-state={visual.selectionState}
      data-grade-state={visual.gradeState}
      data-path-state={visual.pathState}
    >
      <div className="service-visual-heading">
        <div><span>LIVE SERVICE PATH</span><strong id={titleId}>{visual.mode === "dns-lifecycle" ? "DNS TTL HANDOFF" : "HEALTH + AFFINITY"}</strong></div>
        <span className={`service-state-badge is-${visual.pathState}`}>{reason}</span>
      </div>

      <div className="service-map" role="group" aria-labelledby={`${titleId} ${descriptionId}`}>
        <p className="sr-only" id={descriptionId}>{description}</p>
        <svg className="service-map-connectors" viewBox="0 0 1000 180" preserveAspectRatio="none" aria-hidden="true">
          <defs><marker id={`${id}-arrow`} markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0 0L8 4L0 8Z" /></marker></defs>
          <path d="M125 90H315" markerEnd={`url(#${id}-arrow)`} />
          <path d="M385 90H575" markerEnd={`url(#${id}-arrow)`} />
          <path d="M645 90H835" markerEnd={`url(#${id}-arrow)`} />
          <path className="service-control-edge" d="M625 145C720 205 805 205 900 145" />
        </svg>
        <article className="service-boundary-card" data-boundary-id="client"><span>01 · SOURCE</span><strong>client netns</strong><code>client-a</code><small>{t("새 connection", "new connection")}</small></article>
        <article className="service-boundary-card" data-boundary-id="resolver"><span>02 · DISCOVERY</span><strong>resolver cache</strong><code>api.internal</code><small>{visual.mode === "dns-lifecycle" ? `TTL ${preview.dns.beforeExpiry.cacheExpiresAtSeconds}s` : t("fresh VIP answer", "fresh VIP answer")}</small></article>
        <article className="service-boundary-card" data-boundary-id="edge"><span>03 · ENTRY</span><strong>L4 VIP</strong><code>10.40.0.20:8080</code><small>{t("connection selector", "connection selector")}</small></article>
        <div className="service-backend-pool" data-boundary-id="backend-pool">
          <span>04 · BACKEND POOL</span>
          {visual.backends.map((backend) => {
            const selected = selectedBackend === backend.id;
            return (
              <article
                key={backend.id}
                className={`service-backend-node${selected ? " is-selected" : ""}`}
                data-endpoint-id={backend.id}
                data-health-state={backend.health}
                data-eligibility-state={backend.registered && backend.health === "healthy" ? "eligible" : "ineligible"}
              >
                <strong>{backend.id}</strong><code>{backend.address}</code><small>{backend.health.toUpperCase()}</small>
              </article>
            );
          })}
        </div>
      </div>

      {visual.mode === "dns-lifecycle" ? (
        <div className="service-direct-controls">
          <div className="service-ttl-timeline" aria-label={t("DNS TTL handoff timeline", "DNS TTL handoff timeline")}>
            <div data-time-state="cached"><span>t=100</span><strong>{t("cache 저장", "CACHE STORED")}</strong><code>10.40.0.10</code></div>
            <div data-time-state={before.source}><span>t=159</span><strong>{before.source.toUpperCase()}</strong><code>{before.address}</code></div>
            <div data-time-state={after.source}><span>t=160</span><strong>{t("TTL 만료", "TTL EXPIRES")}</strong><code>{after.address}</code></div>
          </div>
          <InfrastructureChoiceRail
            compact
            controlId="resolver-policy"
            label={t("timeline에서 resolver가 answer를 바꾸는 시점", "When the resolver changes answers on the timeline")}
            value={draft.resolverPolicy}
            options={[
              { value: "cache-forever", label: t("계속 cache", "Keep cache"), detail: "t=159 · 160 cache" },
              { value: "refresh-early", label: t("즉시 refresh", "Refresh early"), detail: "t=159 · 160 authority" },
              { value: "honor-ttl", label: t("TTL 준수", "Honor TTL"), detail: "t=159 cache → t=160 authority" },
            ]}
            onChange={onResolverPolicyChange}
          />
          <InfrastructureChoiceRail
            compact
            controlId="old-vip-retirement"
            label={t("기존 VIP를 timeline에서 제거할 시점", "When to remove the old VIP from the timeline")}
            value={draft.oldVipRetirementSeconds}
            options={[
              { value: 150, label: "t=150", detail: t("TTL 전 종료", "before TTL") },
              { value: 160, label: "t=160", detail: t("TTL 경계", "at TTL") },
              { value: 220, label: "t=220", detail: t("TTL 후 유지", "after TTL") },
            ]}
            onChange={onOldVipRetirementChange}
          />
          <InfrastructureStateSwitch
            controlId="vip-listener"
            label="10.40.0.20:8080"
            detail={t("새 VIP listener", "New VIP listener")}
            checked={draft.vipListenerUp}
            stateOn="LISTEN"
            stateOff="CLOSED"
            onChange={onVipListenerChange}
          />
        </div>
      ) : (
        <div className="service-direct-controls">
          <div className="service-affinity-trace" aria-label={t("affinity failure trace", "Affinity failure trace")}>
            <span>client-a #1 → <strong>{preview.balancing.first.backendId ?? "none"}</strong></span>
            <span>client-a #2 → <strong>{preview.balancing.repeated.backendId ?? "none"}</strong></span>
            <span>{preview.balancing.failedBackendId ?? "target"} DOWN → <strong>{preview.balancing.afterFailure.backendId ?? "none"}</strong></span>
          </div>
          <InfrastructureChoiceRail
            compact
            controlId="backend-membership"
            label={t("backend pool에서 신규 flow 후보를 고르는 규칙", "Rule for choosing new-flow candidates from the backend pool")}
            value={draft.membershipPolicy}
            options={[
              { value: "all-registered", label: t("등록 전체", "All registered"), detail: t("app-b 포함", "includes app-b") },
              { value: "healthy-only", label: t("healthy만", "Healthy only"), detail: t("app-b 제외", "excludes app-b") },
            ]}
            onChange={onMembershipPolicyChange}
          />
          <InfrastructureChoiceRail
            compact
            controlId="balancing-algorithm"
            label={t("같은 client의 connection을 backend에 배치", "Place same-client connections onto backends")}
            value={draft.algorithm}
            options={[
              { value: "round-robin", label: "round-robin" },
              { value: "source-affinity", label: "source affinity" },
            ]}
            onChange={onAlgorithmChange}
          />
          <InfrastructureChoiceRail
            compact
            controlId="affinity-failure-policy"
            label={t("sticky target이 실패했을 때", "When the sticky target fails")}
            value={draft.affinityFailurePolicy}
            options={[
              { value: "keep-ineligible", label: t("실패 target 유지", "Keep failed target") },
              { value: "remap-ineligible", label: t("healthy set 재매핑", "Remap to healthy set") },
            ]}
            onChange={onAffinityFailurePolicyChange}
          />
        </div>
      )}

      <ol className="service-path-stages" aria-label={t("실행된 service path 단계", "Executed service path stages")}>
        {visual.path.map((stage) => <li key={stage.id} data-path-stage={stage.id} data-hop-status={stage.status}><span aria-hidden="true">{stage.status === "passed" ? "✓" : stage.status === "blocked" ? "×" : "○"}</span><code>{stage.label}</code><small>{stage.status.toUpperCase()}</small></li>)}
      </ol>
      <div className="service-edge-legend" aria-label={t("edge 의미", "Edge meanings")}><span><i aria-hidden="true" />FLOW</span><span><i className="is-control" aria-hidden="true" />HEALTH CONTROL</span></div>
    </section>
  );
}

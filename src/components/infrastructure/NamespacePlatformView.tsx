import { useLocale } from "../../features/localization/localization";
import { buildNamespacePlatformVisualState } from "../../features/infrastructure/namespace-platform-visual";
import type {
  NamespacePlatformDraft,
  NamespacePlatformScenarioEvaluation,
  NamespacePlatformScenarioId,
} from "../../features/infrastructure/namespace-platform";
import type { NamespacePlatformEvidenceBundleEvaluation } from "../../features/infrastructure/namespace-platform-evidence";

export function NamespacePlatformView({
  draft,
  scenarioId,
  scenario,
  evidence,
}: {
  draft: NamespacePlatformDraft;
  scenarioId: NamespacePlatformScenarioId;
  scenario: NamespacePlatformScenarioEvaluation | null;
  evidence: NamespacePlatformEvidenceBundleEvaluation | null;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const state = buildNamespacePlatformVisualState({ draft, scenarioId, scenario, evidence });
  const scenarioLabel = ({
    "normal-request": t("정상 요청", "normal request"),
    "private-egress": t("사설 egress", "private egress"),
    "zone-a-failure": t("zone A 장애", "zone A failure"),
    "peak-load": t("peak 부하", "peak load"),
  } as const)[scenarioId];
  const nodeLabel = ({
    client: "client",
    edge: "edge",
    app: "app",
    data: "data",
  } as const);
  const resourceLabel = ({
    "edge-bandwidth": "edge bandwidth",
    "edge-queue": "edge queue",
    "app-connections": "app connections",
  } as const);
  const pathStageLabel: Record<string, string> = {
    "public-client": t("공개 client → edge tcp/443", "public client → edge TCP 443"),
    "edge-ingress": t("edge의 tcp/443 listener", "edge listener TCP 443"),
    "edge-app": t("app.internal → private app tcp/8080", "app.internal → private app TCP 8080"),
    "app-data": t("data.internal → private data tcp/5432", "data.internal → private data TCP 5432"),
    "normal-reply": t("stateful 응답 → client", "stateful reply → client"),
    "app-update": t("private app의 update 요청", "private app update request"),
    "edge-route": t("edge를 경유하는 private route", "private route via edge"),
    "source-translation": t("edge POSTROUTING source 변환", "edge POSTROUTING source translation"),
    "external-update": t("외부 update service tcp/443", "external update service TCP 443"),
    "conntrack-return": t("conntrack reverse translation → app", "conntrack reverse translation → app"),
    "zone-a-removed": t("zone A 제거", "Zone A removed"),
    "edge-zone-b": t("zone B의 edge gateway", "edge gateway in Zone B"),
    "app-zone-b": t("zone B의 app replica", "app replica in Zone B"),
    "data-zone-b": t("zone B의 data replica", "data replica in Zone B"),
    "service-survives": t("요청 path 가용성 유지", "request path remains available"),
    "peak-rate": t("초당 900 requests", "900 requests per second"),
    "bandwidth-headroom": t("edge bandwidth 사용률 ≤ 70%", "edge bandwidth utilization ≤ 70%"),
    "queue-headroom": t("edge queue 사용률 ≤ 70%", "edge queue utilization ≤ 70%"),
    "connection-headroom": t("app connection 사용률 ≤ 70%", "app connection utilization ≤ 70%"),
  };

  return (
    <figure
      className="namespace-platform-visualization"
      data-testid="namespace-platform-visualization"
      data-evidence-state={state.evidenceState}
      data-scenario={scenarioId}
      data-grade-state={state.gradeState}
    >
      <figcaption className="namespace-platform-visual-header">
        <div>
          <span>EVIDENCE BUNDLE · CH 01–07</span>
          <strong>{state.evidenceState === "not-run"
            ? t("검증 전 — verdict 숨김", "Not verified — verdict hidden")
            : state.evidenceState === "verified"
              ? t("7개 receipt 검증됨", "Seven receipts verified")
              : t("receipt contract 불일치", "Receipt contract mismatch")}</strong>
        </div>
        <div>
          <span>SCENARIO · {scenarioLabel}</span>
          <strong>{state.gradeState === "not-run"
            ? t("실행 전", "Not run")
            : state.gradeState === "passed" ? t("경로 통과", "Path passed") : t("경로 차단", "Path blocked")}</strong>
        </div>
      </figcaption>

      <div className="namespace-platform-receipt-rail" aria-label={t("선행 챕터 evidence receipt 상태", "Prerequisite chapter evidence receipt status") }>
        {state.receipts.map(({ chapterId, status }, index) => (
          <span data-receipt-chapter={chapterId} data-receipt-status={status} key={chapterId}>
            CH{String(index + 1).padStart(2, "0")} · {status === "not-run" ? "—" : status === "verified" ? "✓" : "!"}
          </span>
        ))}
      </div>

      <div
        className="namespace-platform-map"
        role="img"
        aria-label={t(
          `${scenarioLabel}에서 client, edge, app, data namespace와 tcp 443, 8080, 5432 경로를 보여 주는 플랫폼 지도`,
          `Platform map showing client, edge, app, and data namespaces with TCP 443, 8080, and 5432 paths for ${scenarioLabel}`,
        )}
      >
        <svg viewBox="0 0 960 76" preserveAspectRatio="none" aria-hidden="true" focusable="false">
          <defs><marker id="namespace-platform-arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" /></marker></defs>
          <line x1="95" y1="38" x2="865" y2="38" markerEnd="url(#namespace-platform-arrow)" />
        </svg>
        <div className="namespace-platform-node-grid">
          {state.nodes.map((node) => (
            <article data-node-id={node.id} data-exposure={node.exposure} key={node.id}>
              <span>{nodeLabel[node.id]} netns</span>
              <strong>{node.exposure}</strong>
              <small>{node.placement}</small>
            </article>
          ))}
        </div>
        <div className="namespace-platform-edge-grid" aria-hidden="true">
          {state.edges.map((edge) => (
            <span data-edge-id={edge.id} data-configured={edge.configured === null ? "not-run" : String(edge.configured)} data-edge-state={edge.state} key={edge.id}>
              {edge.configured === null ? "—" : edge.configured ? "✓" : "×"} {edge.label}
            </span>
          ))}
        </div>
      </div>

      <p className="sr-only namespace-platform-screen-reader-summary" role="status" aria-live="polite">
        {t("플랫폼 노드: ", "Platform nodes: ")}
        {state.nodes.map((node) => `${node.id} ${node.exposure}, ${node.placement}`).join("; ")}.
        {" "}{t("경계 상태: ", "Boundary states: ")}
        {state.edges.map((edge) => `${edge.id} ${edge.state === "not-run"
          ? t("미실행", "not run")
          : edge.state === "configured" ? t("구성됨", "configured") : t("차단됨", "broken")}`).join("; ")}.
      </p>

      <div className="namespace-platform-path-ledger" aria-label={t("현재 scenario packet path", "Current scenario packet path") }>
        {state.path.length === 0 ? (
          <p>{t("scenario를 실행하면 첫 차단 경계까지의 path stage가 표시됩니다.", "Run the scenario to reveal path stages through the first blocked boundary.")}</p>
        ) : state.path.map((stage) => (
          <span data-path-stage={stage.id} data-stage-status={stage.status} key={stage.id}>
            {stage.status === "passed" ? "✓" : stage.status === "blocked" ? "×" : "○"} {pathStageLabel[stage.id] ?? stage.label}
          </span>
        ))}
      </div>

      <div className="namespace-platform-capacity-grid" aria-hidden="true">
        {state.capacity.map((metric) => {
          const percent = metric.displayedUtilization === null ? 0 : Math.min(100, metric.displayedUtilization * 100);
          return (
            <article data-capacity-resource={metric.resource} data-utilization-state={metric.state} key={metric.resource}>
              <header><strong>{resourceLabel[metric.resource]}</strong><span>{metric.displayedUtilization === null ? "NOT RUN" : `${Math.round(metric.displayedUtilization * 100)}%`}</span></header>
              <div><span style={{ width: `${percent}%` }} /></div>
            </article>
          );
        })}
      </div>
      <p className="sr-only">{state.capacity.map((metric) => `${resourceLabel[metric.resource]} ${metric.displayedUtilization === null ? "not run" : `${Math.round(metric.displayedUtilization * 100)} percent`}`).join(". ")}</p>
    </figure>
  );
}

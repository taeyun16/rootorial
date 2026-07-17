import { useId, useMemo } from "react";
import {
  buildVethRoutingVisualState,
  type VethRoutingVisualBoundary,
  type VethRoutingVisualPathStage,
} from "../../features/infrastructure/veth-routing-visual";
import type {
  VethTopologyEvaluation,
  VethTopologyFailureReason,
  VethTopologyInterface,
  VethTopologyRoute,
} from "../../features/infrastructure/veth-routing";
import { useLocale } from "../../features/localization/localization";

export function VethTopologyView({
  preview,
  evaluation,
}: {
  preview: VethTopologyEvaluation;
  evaluation: VethTopologyEvaluation | null;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const id = useId().replace(/:/g, "");
  const visual = useMemo(
    () => buildVethRoutingVisualState(preview, evaluation ? (evaluation.passed ? "passed" : "failed") : "not-run"),
    [evaluation, preview],
  );
  const titleId = `${id}-veth-routing-title`;
  const descriptionId = `${id}-veth-routing-description`;
  const reasonCopy = (reason: VethTopologyFailureReason | "not-run") => ({
    "not-run": { ko: "실행 전", en: "NOT RUN" },
    connected: { ko: "왕복 연결", en: "ROUND TRIP CONNECTED" },
    "veth-peer-missing": { ko: "router peer 없음", en: "ROUTER PEER MISSING" },
    "interface-down": { ko: "interface down", en: "INTERFACE DOWN" },
    "bridge-port-missing": { ko: "bridge port 없음", en: "BRIDGE PORT MISSING" },
    "invalid-address": { ko: "address plan 불일치", en: "ADDRESS PLAN MISMATCH" },
    "duplicate-address": { ko: "address 중복", en: "DUPLICATE ADDRESS" },
    "overlapping-router-subnets": { ko: "router subnet 겹침", en: "ROUTER SUBNETS OVERLAP" },
    "gateway-off-link": { ko: "gateway off-link", en: "GATEWAY OFF-LINK" },
    "no-forward-route": { ko: "forward route 없음", en: "FORWARD ROUTE MISSING" },
    "forwarding-disabled": { ko: "forwarding off", en: "FORWARDING OFF" },
    "no-return-route": { ko: "return route 없음", en: "RETURN ROUTE MISSING" },
    "listener-missing": { ko: "listener 없음", en: "LISTENER MISSING" },
  }[reason]);
  const reasonLabel = (reason: VethTopologyFailureReason | "not-run") => reasonCopy(reason)[locale];
  const description = visual.boundaries.map((boundary) => {
    const interfaces = boundary.interfaces.map((networkInterface) => `${networkInterface.name} in ${networkInterface.ownerNamespace}${networkInterface.address ? ` ${networkInterface.address}` : ""}`).join(", ") || "no interfaces";
    return `${boundary.label}: ${interfaces}`;
  }).join(". ");
  const currentState = visual.gradeState === "not-run"
    ? t("endpoint·bridge·route state는 live로 반영됐고, 왕복 verdict는 아직 실행하지 않았습니다.", "Endpoint, bridge, and route state is live; the round-trip verdict has not been executed yet.")
    : visual.pathState === "reachable"
      ? t("forward와 return trace가 모두 연결됐습니다.", "Both forward and return traces are connected.")
      : (() => {
          const reason = reasonCopy(visual.displayedReason);
          return t(`첫 blocked hop: ${reason.ko}`, `First blocked hop: ${reason.en}`);
        })();

  return (
    <figure
      className={`veth-routing-visualization is-${visual.topologyState}`}
      data-testid="veth-routing-visualization"
      data-topology-mode={visual.mode}
      data-topology-state={visual.topologyState}
      data-grade-state={visual.gradeState}
      data-path-state={visual.pathState}
    >
      <figcaption className="veth-visual-header">
        <div>
          <span>LIVE NAMESPACE TOPOLOGY</span>
          <strong>{visual.mode === "bridge" ? t("br0를 지나는 하나의 L2 domain", "One Layer 2 domain through br0") : t("router namespace를 지나는 두 L3 link", "Two Layer 3 links through a router namespace")}</strong>
        </div>
        <span className="veth-visual-verdict">{reasonLabel(visual.displayedReason)}</span>
      </figcaption>

      <div className="veth-topology-map" role="img" aria-labelledby={`${titleId} ${descriptionId}`}>
        <span className="sr-only" id={titleId}>{t("veth bridge router 왕복 topology 지도", "veth bridge and router round-trip topology map")}</span>
        <span className="sr-only" id={descriptionId}>{description}. {currentState}</span>
        <BoundaryCard boundary={visual.boundaries[0]} t={t} />
        <VethLink link={visual.links[0]} t={t} />
        <BoundaryCard boundary={visual.boundaries[1]} t={t} />
        <VethLink link={visual.links[1]} t={t} />
        <BoundaryCard boundary={visual.boundaries[2]} t={t} listenerUp={preview.machine.listener.up} />
      </div>

      <div className="veth-path-grid">
        <PathTrace title={t("FORWARD · client request", "FORWARD · client request")} stages={visual.forwardPath} t={t} />
        <PathTrace title={t("RETURN · app reply", "RETURN · app reply")} stages={visual.returnPath} t={t} />
      </div>

      <p className="veth-visual-current-state" role="status" aria-live="polite" aria-atomic="true">
        <span>{t("현재 실행 상태", "CURRENT EXECUTION STATE")}</span>
        {currentState}
      </p>
    </figure>
  );
}

function BoundaryCard({
  boundary,
  listenerUp,
  t,
}: {
  boundary: VethRoutingVisualBoundary;
  listenerUp?: boolean;
  t: (ko: string, en: string) => string;
}) {
  return (
    <article className="veth-boundary-card" data-namespace-id={boundary.namespaceId} data-boundary-id={boundary.id}>
      <header>
        <span>{boundary.label}</span>
        <strong>{boundary.id === "transit" ? t("TRANSIT", "TRANSIT") : t("ENDPOINT", "ENDPOINT")}</strong>
      </header>
      {boundary.bridgeId ? <div className="veth-transit-device" data-bridge-id={boundary.bridgeId}><small>LINUX BRIDGE</small><strong>br0 · UP</strong></div> : null}
      {boundary.forwarding !== null ? <div className={`veth-transit-device${boundary.forwarding ? " is-ready" : " is-blocked"}`} data-forwarding-state={boundary.forwarding ? "on" : "off"}><small>IP FORWARDING</small><strong>{boundary.forwarding ? "ON" : "OFF"}</strong></div> : null}
      <ul className="veth-interface-list">
        {boundary.interfaces.map((networkInterface) => <InterfaceRow key={networkInterface.id} networkInterface={networkInterface} />)}
      </ul>
      {boundary.routes.length ? <ul className="veth-route-list">
        {boundary.routes.map((route) => <RouteRow key={route.id} route={route} t={t} />)}
      </ul> : null}
      {listenerUp !== undefined ? (
        <div className={`veth-listener-state${listenerUp ? " is-ready" : " is-blocked"}`} data-listener-id="app-listener" data-listener-state={listenerUp ? "listening" : "closed"}>
          <small>SOCKET TABLE</small>
          <strong>0.0.0.0:8080 · {listenerUp ? "LISTEN" : "CLOSED"}</strong>
        </div>
      ) : null}
    </article>
  );
}

function InterfaceRow({ networkInterface }: { networkInterface: VethTopologyInterface }) {
  return (
    <li
      data-interface-id={networkInterface.id}
      data-owner-namespace={networkInterface.ownerNamespace}
      data-link-state={networkInterface.up ? "up" : "down"}
      data-address={networkInterface.address ?? "none"}
    >
      <small>{networkInterface.ownerNamespace} · {networkInterface.id}</small>
      <strong>{networkInterface.name} · {networkInterface.up ? "UP" : "DOWN"}</strong>
      <code>{networkInterface.address ?? (networkInterface.bridgeId ? `master ${networkInterface.bridgeId}` : "no address")}</code>
    </li>
  );
}

function RouteRow({
  route,
  t,
}: {
  route: VethTopologyRoute;
  t: (ko: string, en: string) => string;
}) {
  return (
    <li data-route-id={route.id} data-route-role={route.role} data-route-state={route.state}>
      <small>{route.role === "return" ? t("RETURN ROUTE", "RETURN ROUTE") : route.role === "forward" ? t("FORWARD ROUTE", "FORWARD ROUTE") : t("CONNECTED ROUTE", "CONNECTED ROUTE")}</small>
      <code>{route.destination}{route.gateway ? ` via ${route.gateway}` : " dev eth0"}</code>
    </li>
  );
}

function VethLink({
  link,
  t,
}: {
  link: ReturnType<typeof buildVethRoutingVisualState>["links"][number];
  t: (ko: string, en: string) => string;
}) {
  return (
    <div
      className={`veth-link is-${link.state} is-${link.placement}`}
      data-veth-pair-id={link.id}
      data-endpoint-a={link.endpointA.id}
      data-endpoint-b={link.endpointB.id}
      data-link-state={link.state}
      data-placement-state={link.placement}
    >
      <svg aria-hidden="true" viewBox="0 0 120 28" preserveAspectRatio="none">
        <line x1="2" y1="14" x2="118" y2="14" />
        <circle cx="4" cy="14" r="3" />
        <circle cx="116" cy="14" r="3" />
      </svg>
      <strong>{link.id}</strong>
      <span>{link.state.toUpperCase()} · {link.placement === "attached" ? t("연결됨", "ATTACHED") : t("dangling", "DANGLING")}</span>
    </div>
  );
}

function PathTrace({
  title,
  stages,
  t,
}: {
  title: string;
  stages: readonly VethRoutingVisualPathStage[];
  t: (ko: string, en: string) => string;
}) {
  const statusLabel = (status: VethRoutingVisualPathStage["status"]) => ({
    "not-run": t("실행 전", "NOT RUN"),
    passed: t("통과", "PASSED"),
    blocked: t("차단", "BLOCKED"),
    pending: t("대기", "PENDING"),
  }[status]);
  return (
    <section>
      <h4>{title}</h4>
      <ol>
        {stages.map((stage, index) => (
          <li key={stage.id} className={`is-${stage.status}`} data-path-hop={stage.id} data-hop-index={index} data-hop-status={stage.status}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{stage.label}</strong>
            <small>{statusLabel(stage.status)}</small>
          </li>
        ))}
      </ol>
    </section>
  );
}

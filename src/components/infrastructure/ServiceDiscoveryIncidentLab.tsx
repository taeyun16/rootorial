import { useEffect, useState } from "react";
import {
  evaluateServiceDiscoveryIncident,
  serviceDiscoveryIncidentFixtures,
  type ServiceDiscoveryIncidentId,
  type ServiceDiscoveryIncidentRepair,
} from "../../features/infrastructure/service-discovery";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(serviceDiscoveryIncidentFixtures) as ServiceDiscoveryIncidentId[];
type IncidentResult = ReturnType<typeof evaluateServiceDiscoveryIncident>;

export function ServiceDiscoveryIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<ServiceDiscoveryIncidentId, ServiceDiscoveryIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<ServiceDiscoveryIncidentId, IncidentResult>>>({});
  const [completed, setCompleted] = useState<ServiceDiscoveryIncidentId[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);

  function chooseRepair(incidentId: ServiceDiscoveryIncidentId, repair: ServiceDiscoveryIncidentRepair) {
    setRuntimeFailed(false);
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
  }

  function diagnose(incidentId: ServiceDiscoveryIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateServiceDiscoveryIncident(incidentId, repair);
      setResults((current) => ({ ...current, [incidentId]: result }));
      setCompleted((current) => result.passed
        ? [...new Set([...current, incidentId])]
        : current.filter((candidate) => candidate !== incidentId));
    } catch {
      setRuntimeFailed(true);
      setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
    }
  }

  function resetAll() {
    setRepairs({});
    setResults({});
    setCompleted(() => []);
    setRuntimeFailed(false);
  }

  const copy: Record<ServiceDiscoveryIncidentId, { number: string; title: string; evidence: string; prompt: string }> = {
    "expired-dns-cache": {
      number: "01",
      title: t("TTL 만료 뒤에도 retired VIP를 사용", "A retired VIP remains in use after TTL expiry"),
      evidence: "resolver$ now=160 cache=10.40.0.10 cached_at=100 ttl=60\nauthority$ api.internal A 10.40.0.20",
      prompt: t("process를 재시작하지 말고 cache lifetime 경계를 수리하세요.", "Repair the cache-lifetime boundary without restarting the service."),
    },
    "health-check-wrong-scope": {
      number: "02",
      title: t("host localhost probe는 통과하지만 app port는 닫힘", "The host localhost probe passes while the app port is closed"),
      evidence: "edge$ curl 127.0.0.1:8080 → 200\napp-b$ ss -lnt sport=:8080 → no listener",
      prompt: t("실제 backend namespace와 service port에서 readiness를 관찰하세요.", "Observe readiness at the actual backend namespace and service port."),
    },
    "unhealthy-backend-still-eligible": {
      number: "03",
      title: t("app-b probe 실패 뒤에도 신규 flow 후보", "app-b remains eligible for new flows after its probe fails"),
      evidence: "health set → app-a UP · app-b DOWN · app-c UP\nnew connection → app-b",
      prompt: t("registration을 지우는 대신 신규 flow candidate set을 수리하세요.", "Repair the new-flow candidate set rather than confusing it with registration."),
    },
    "affinity-to-retired-backend": {
      number: "04",
      title: t("sticky mapping이 unhealthy target을 계속 보존", "A sticky mapping keeps an unhealthy target"),
      evidence: "affinity client-a → app-c\napp-c health → DOWN\nnext client-a connection → app-c",
      prompt: t("affinity continuity를 현재 healthy set 안으로 제한하세요.", "Constrain affinity continuity to the current healthy set."),
    },
  };

  const optionLabel = (repair: ServiceDiscoveryIncidentRepair) => ({
    "refresh-after-ttl": t("만료 경계부터 authority를 다시 조회", "refresh from authority at the expiry boundary"),
    "increase-ttl": t("retired 주소의 TTL을 더 늘림", "increase the retired address TTL"),
    "restart-app": t("backend app을 재시작", "restart the backend app"),
    "probe-backend-service-port": t("backend namespace의 실제 service port probe", "probe the real service port in the backend namespace"),
    "probe-host-localhost": t("edge host localhost만 계속 probe", "keep probing edge-host localhost"),
    "treat-dns-as-health": t("DNS answer가 있으면 healthy로 판정", "treat any DNS answer as healthy"),
    "exclude-from-new-connections": t("unhealthy backend를 신규 connection 후보에서 제외", "exclude the unhealthy backend from new connections"),
    "keep-with-affinity": t("affinity가 있으면 unhealthy target 유지", "keep the unhealthy target when affinity exists"),
    "add-retries": t("같은 unhealthy target으로 retry 추가", "add retries to the same unhealthy target"),
    "remap-against-healthy-set": t("현재 healthy set에서 affinity 재매핑", "remap affinity against the current healthy set"),
    "extend-affinity": t("affinity 만료 시간을 연장", "extend the affinity lifetime"),
    "keep-retired-target": t("retired target을 후보에 고정", "pin the retired target in the pool"),
  }[repair]);

  const resultMessage = (result: IncidentResult) => result.passed
    ? ({
        "expired-dns-cache": t("통과 — TTL 경계부터 새 authority answer를 사용합니다.", "Passed — the resolver uses the new authority answer at the TTL boundary."),
        "health-check-wrong-scope": t("통과 — 실제 backend service 경계에서 readiness를 관찰합니다.", "Passed — readiness is observed at the real backend service boundary."),
        "unhealthy-backend-still-eligible": t("통과 — unhealthy backend가 신규 connection set에서 빠졌습니다.", "Passed — the unhealthy backend is excluded from new connections."),
        "affinity-to-retired-backend": t("통과 — affinity가 현재 healthy set으로 재매핑됩니다.", "Passed — affinity remaps against the current healthy set."),
      } satisfies Record<ServiceDiscoveryIncidentId, string>)[result.incidentId]
    : ({
        "expired-dns-cache": t("app state가 아니라 resolver cache expiry를 수리하세요.", "Repair resolver-cache expiry, not app state."),
        "health-check-wrong-scope": t("DNS나 host localhost는 backend readiness를 증명하지 않습니다.", "DNS and host localhost do not prove backend readiness."),
        "unhealthy-backend-still-eligible": t("retry나 affinity보다 health eligibility가 먼저입니다.", "Health eligibility comes before retries or affinity."),
        "affinity-to-retired-backend": t("sticky mapping은 unhealthy target을 보존할 권한이 없습니다.", "A sticky mapping cannot preserve an unhealthy target."),
      } satisfies Record<ServiceDiscoveryIncidentId, string>)[result.incidentId];

  return (
    <section className="interactive-lab service-incident-lab" aria-labelledby="service-incidents-title" data-interactive-ready={interactiveReady ? "true" : "false"}>
      <div className="service-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · SERVICE-PATH INCIDENTS</p>
          <h3 id="service-incidents-title">{t("stale answer와 unhealthy selection의 네 사건 수리", "Repair four stale-answer and unhealthy-selection incidents")}</h3>
          <p>{t("각 선택은 같은 DNS·health·affinity invariant로 다시 판정됩니다.", "Each choice is regraded through the same DNS, health, and affinity invariants.")}</p>
        </div>
        <strong>{completed.length} / {incidentIds.length}</strong>
      </div>
      <div className="service-lab-toolbar"><button type="button" className="button button-ghost" onClick={resetAll}>{t("모든 사건 초기화", "Reset all incidents")}</button></div>
      {runtimeFailed ? <div className="service-feedback is-error" role="alert">{t("브라우저 service model을 실행하지 못했습니다. 초기화 후 다시 시도하세요.", "The browser service model failed. Reset and try again.")}</div> : null}
      <div className="service-incident-grid">
        {incidentIds.map((incidentId) => {
          const fixture = serviceDiscoveryIncidentFixtures[incidentId];
          const item = copy[incidentId];
          const result = results[incidentId];
          return (
            <article className="service-incident-card" key={incidentId}>
              <span>{item.number} · {incidentId}</span>
              <h4>{item.title}</h4>
              <pre aria-label={t(`${item.title} 증거`, `${item.title} evidence`)}>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail compact controlId={`service-incident-${incidentId}-repair`} label={t("service path에 적용할 최소 수리", "Minimal repair for the service path")} value={repairs[incidentId] ?? ""} options={fixture.repairs.map((repair) => ({ value: repair, label: optionLabel(repair) }))} onChange={(repair) => chooseRepair(incidentId, repair)} />
              <div className="service-incident-actions"><button type="button" className="button button-primary" disabled={!repairs[incidentId]} onClick={() => diagnose(incidentId)}>{t("상태 재실행·판정", "Re-run state and grade")}</button></div>
              <div className={`service-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">{result ? resultMessage(result) : t("증거와 최초 실패 invariant를 연결하세요.", "Connect the evidence to the first failed invariant.")}</div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

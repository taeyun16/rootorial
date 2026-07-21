import { useEffect, useState } from "react";
import {
  evaluateVethTopologyIncident,
  vethTopologyIncidentFixtures,
  type VethTopologyIncidentEvaluation,
  type VethTopologyIncidentId,
  type VethTopologyIncidentRepair,
} from "../../features/infrastructure/veth-routing";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(vethTopologyIncidentFixtures) as VethTopologyIncidentId[];

export function VethRoutingIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<VethTopologyIncidentId, VethTopologyIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<VethTopologyIncidentId, VethTopologyIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<VethTopologyIncidentId[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);

  function chooseRepair(incidentId: VethTopologyIncidentId, repair: VethTopologyIncidentRepair) {
    setRuntimeFailed(false);
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
  }

  function diagnose(incidentId: VethTopologyIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateVethTopologyIncident(incidentId, repair);
      setResults((current) => ({ ...current, [incidentId]: result }));
      setCompleted((current) => result.passed
        ? [...new Set([...current, incidentId])]
        : current.filter((candidate) => candidate !== incidentId));
    } catch {
      setRuntimeFailed(true);
      setResults((current) => ({ ...current, [incidentId]: undefined }));
      setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
    }
  }

  function resetAll() {
    setRuntimeFailed(false);
    setRepairs({});
    setResults({});
    setCompleted(() => []);
  }

  const copy: Record<VethTopologyIncidentId, {
    number: string;
    title: string;
    evidence: string;
    prompt: string;
  }> = {
    "dangling-bridge-peer": {
      number: "01",
      title: t("veth는 UP이지만 app peer가 br0 port가 아님", "The veth is UP, but the app peer is not a br0 port"),
      evidence: "host$ ip -br link → veth-app-host UP\nhost$ bridge link → veth-client-host master br0; no veth-app-host",
      prompt: t("address plan을 바꾸지 않고 L2 path의 끊긴 edge를 수리하세요.", "Repair the missing Layer 2 edge without changing the address plan."),
    },
    "duplicate-bridge-address": {
      number: "02",
      title: t("client와 app이 같은 10.20.0.2/24 사용", "Client and app both use 10.20.0.2/24"),
      evidence: "client$ ip -br addr → eth0 10.20.0.2/24\napp$ ip -br addr → eth0 10.20.0.2/24",
      prompt: t("같은 L2 subnet은 유지하면서 endpoint identity를 분리하세요.", "Keep one Layer 2 subnet while separating endpoint identity."),
    },
    "forwarding-disabled": {
      number: "03",
      title: t("두 router leg와 route는 맞지만 forwarding이 꺼짐", "Both router legs and routes are correct, but forwarding is off"),
      evidence: "router$ ip route → both connected prefixes\nrouter$ sysctl net.ipv4.ip_forward → 0",
      prompt: t("주소 번역을 추가하지 않고 transit network stack을 활성화하세요.", "Enable the transit network stack without adding address translation."),
    },
    "missing-return-route": {
      number: "04",
      title: t("SYN은 app에 도착하지만 SYN-ACK가 돌아오지 않음", "The SYN reaches app, but the SYN-ACK cannot return"),
      evidence: "client route → 10.30.0.0/24 via 10.20.0.1\napp route → no 10.20.0.0/24 entry",
      prompt: t("이미 맞는 forward path를 중복하지 말고 reply path를 추가하세요.", "Add the reply path instead of duplicating the already-correct forward path."),
    },
  };

  const optionLabel = (repair: VethTopologyIncidentRepair) => ({
    "attach-peer-to-bridge": t("veth-app-host를 master br0에 연결", "attach veth-app-host to master br0"),
    "move-peer-to-client": t("host peer도 client namespace로 이동", "move the host peer into the client namespace"),
    "assign-distinct-app-address": t("app을 10.20.0.3/24로 변경", "change app to 10.20.0.3/24"),
    "widen-prefix": t("두 endpoint를 같은 주소로 둔 채 prefix만 확대", "keep the duplicate address and only widen the prefix"),
    "enable-router-forwarding": "net.ipv4.ip_forward=1",
    "enable-nat": t("route 대신 MASQUERADE 추가", "add MASQUERADE instead of fixing forwarding"),
    "add-app-return-route": "app: 10.20.0.0/24 via 10.30.0.1",
    "add-another-client-route": t("client forward route를 하나 더 추가", "add another client forward route"),
  }[repair]);

  const resultMessage = (result: VethTopologyIncidentEvaluation) => {
    if (result.passed) {
      return ({
        "dangling-bridge-peer": t("통과 — 두 host-side peer가 br0 port가 되어 하나의 L2 path가 완성됐습니다.", "Passed — both host-side peers are now br0 ports, completing one Layer 2 path."),
        "duplicate-bridge-address": t("통과 — 같은 subnet 안에서 client와 app 주소가 서로 달라졌습니다.", "Passed — client and app now have distinct addresses within the same subnet."),
        "forwarding-disabled": t("통과 — router namespace가 두 L3 interface 사이에서 packet을 전달합니다.", "Passed — the router namespace now forwards packets between its two Layer 3 interfaces."),
        "missing-return-route": t("통과 — app reply가 router를 통해 client subnet으로 돌아갑니다.", "Passed — the app reply now returns through the router to the client subnet."),
      } satisfies Record<VethTopologyIncidentId, string>)[result.incidentId];
    }
    return ({
      "dangling-bridge-peer": t("peer 소유권을 겹치게 하지 말고 host-side endpoint를 br0에 명시적으로 연결하세요.", "Do not overlap peer ownership; explicitly attach the host-side endpoint to br0."),
      "duplicate-bridge-address": t("prefix 변경은 duplicate IP를 수리하지 않습니다. app에 같은 subnet의 고유 주소를 주세요.", "Changing the prefix does not repair a duplicate IP. Give app a unique address in the same subnet."),
      "forwarding-disabled": t("NAT는 forwarding의 대체물이 아닙니다. router namespace의 IP forwarding을 직접 켜세요.", "NAT is not a substitute for forwarding. Enable IP forwarding in the router namespace."),
      "missing-return-route": t("forward route는 이미 있습니다. app에서 client subnet으로 돌아가는 route가 필요합니다.", "The forward route already exists. App needs a route back to the client subnet."),
    } satisfies Record<VethTopologyIncidentId, string>)[result.incidentId];
  };

  return (
    <section
      className="interactive-lab veth-routing-incident-lab"
      aria-labelledby="veth-routing-incidents-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
    >
      <div className="veth-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · TOPOLOGY INCIDENTS</p>
          <h3 id="veth-routing-incidents-title">{t("L2 edge와 L3 return path의 네 사건 수리", "Repair four Layer 2 edge and Layer 3 return-path incidents")}</h3>
          <p>{t("각 선택은 같은 topology evaluator로 다시 실행됩니다.", "Every choice is re-executed through the same topology evaluator.")}</p>
        </div>
        <strong>{completed.length} / {incidentIds.length}</strong>
      </div>
      <div className="veth-lab-toolbar">
        <button type="button" className="button button-ghost" onClick={resetAll}>{t("모든 사건 초기화", "Reset all incidents")}</button>
      </div>
      {runtimeFailed ? <div className="veth-feedback is-error" role="alert">{t("브라우저 topology model을 실행하지 못했습니다. 초기화 후 다시 시도하세요.", "The browser topology model failed. Reset and try again.")}</div> : null}
      <div className="veth-incident-grid">
        {incidentIds.map((incidentId) => {
          const fixture = vethTopologyIncidentFixtures[incidentId];
          const item = copy[incidentId];
          const result = results[incidentId];
          return (
            <article className="veth-incident-card" key={incidentId}>
              <span>{item.number} · {incidentId}</span>
              <h4>{item.title}</h4>
              <pre aria-label={t(`${item.title} 증거`, `${item.title} evidence`)}>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail
                compact
                controlId={`veth-incident-${incidentId}-repair`}
                label={t("끊긴 경계에 적용할 최소 수리", "Minimal repair for the broken boundary")}
                value={repairs[incidentId] ?? ""}
                options={fixture.repairOptions.map((repair) => ({ value: repair, label: optionLabel(repair) }))}
                onChange={(repair) => chooseRepair(incidentId, repair)}
              />
              <div className="veth-incident-actions">
                <button type="button" className="button button-primary" disabled={!repairs[incidentId]} onClick={() => diagnose(incidentId)}>{t("상태 재실행·판정", "Re-run state and grade")}</button>
              </div>
              <div className={`veth-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">
                {result ? resultMessage(result) : t("증거와 최초 실패 invariant를 연결하세요.", "Connect the evidence to the first failed invariant.")}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

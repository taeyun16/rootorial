import { useEffect, useState } from "react";
import {
  evaluateNetworkPolicyIncident,
  networkPolicyIncidentFixtures,
  type NetworkPolicyIncidentEvaluation,
  type NetworkPolicyIncidentId,
  type NetworkPolicyIncidentRepair,
} from "../../features/infrastructure/network-policy";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(networkPolicyIncidentFixtures) as NetworkPolicyIncidentId[];

export function NetworkPolicyIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<NetworkPolicyIncidentId, NetworkPolicyIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<NetworkPolicyIncidentId, NetworkPolicyIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<NetworkPolicyIncidentId[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);

  function chooseRepair(incidentId: NetworkPolicyIncidentId, repair: NetworkPolicyIncidentRepair) {
    setRuntimeFailed(false);
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
  }

  function runIncident(incidentId: NetworkPolicyIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateNetworkPolicyIncident(incidentId, repair);
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

  const copy: Record<NetworkPolicyIncidentId, {
    number: string;
    title: string;
    evidence: string;
    prompt: string;
  }> = {
    "service-rule-on-input": {
      number: "01",
      title: t("app:8080 allow가 INPUT chain에 있음", "The app:8080 allow is attached to INPUT"),
      evidence: "packet path → client → router → app\nchain input counter → 0 packets\nchain forward policy drop → app SYN dropped",
      prompt: t("router-local service를 열지 않고 transit packet이 실제로 지나는 hook을 수리하세요.", "Repair the hook traversed by the transit packet without opening a router-local service."),
    },
    "deny-before-allow": {
      number: "02",
      title: t("terminal drop이 specific allow보다 앞에 있음", "A terminal drop precedes the specific allow"),
      evidence: "forward rule 01 → counter drop packets 18\nforward rule 02 → tcp dport 8080 accept packets 0",
      prompt: t("base policy를 fail-open으로 바꾸지 말고 terminal verdict 순서를 수리하세요.", "Repair terminal-verdict order without changing the base policy to fail open."),
    },
    "missing-established-reply": {
      number: "03",
      title: t("NEW request는 허용되지만 ESTABLISHED reply가 drop", "The NEW request is allowed, but the ESTABLISHED reply is dropped"),
      evidence: "client → app:8080 ct state new accept\napp → client:41000 ct state established → counter drop",
      prompt: t("넓은 ephemeral port 범위 대신 기존 connection에 속한 reply만 여세요.", "Open only replies belonging to existing connections instead of a broad ephemeral-port range."),
    },
    "default-accept-leak": {
      number: "04",
      title: t("표본 deny 뒤 unmatched UDP가 policy accept로 통과", "Unmatched UDP passes through policy accept after a sampled deny"),
      evidence: "chain input { type filter hook input; policy accept; }\nadmin tcp dport 8080 drop\nuntracked udp dport 9999 → policy accept",
      prompt: t("한 port만 더 막지 말고 unmatched traffic의 base-chain contract를 닫으세요.", "Close the base-chain contract for unmatched traffic instead of denying only one more port."),
    },
  };

  const optionLabel = (repair: NetworkPolicyIncidentRepair) => ({
    "move-service-rule-to-forward": t("app:8080 allow를 FORWARD chain으로 이동", "move the app:8080 allow to FORWARD"),
    "open-router-input-service": t("router INPUT에도 app:8080을 allow", "also allow app:8080 in router INPUT"),
    "move-specific-allow-before-deny": t("specific allow를 terminal deny 앞으로 이동", "move the specific allow before the terminal deny"),
    "change-base-policy-accept": t("chain policy를 accept로 변경", "change the chain policy to accept"),
    "add-established-related-rule": "ct state established accept",
    "allow-all-ephemeral-ports": t("모든 ephemeral destination port allow", "allow every ephemeral destination port"),
    "set-base-policy-drop": t("base chain policy를 drop으로 변경", "set the base-chain policy to drop"),
    "deny-only-ssh": t("SSH port 하나만 추가 deny", "add a deny for SSH only"),
  }[repair]);

  const resultMessage = (result: NetworkPolicyIncidentEvaluation) => {
    if (result.passed) {
      return ({
        "service-rule-on-input": t("통과 — transit service allow가 FORWARD hook에서 packet을 봅니다.", "Passed — the transit service allow now sees packets at the FORWARD hook."),
        "deny-before-allow": t("통과 — 필요한 allow가 terminal deny 전에 평가됩니다.", "Passed — the required allow is evaluated before the terminal deny."),
        "missing-established-reply": t("통과 — 기존 connection의 reply만 statefully 허용됩니다.", "Passed — only replies belonging to existing connections are allowed statefully."),
        "default-accept-leak": t("통과 — 명시적으로 허용하지 않은 traffic은 base policy에서 drop됩니다.", "Passed — traffic outside explicit allows is dropped by the base policy."),
      } satisfies Record<NetworkPolicyIncidentId, string>)[result.incidentId];
    }
    return ({
      "service-rule-on-input": t("INPUT은 router 자체 목적 traffic만 봅니다. app으로 지나가는 packet은 FORWARD에 정책을 두세요.", "INPUT sees traffic addressed to the router itself. Put the app transit policy on FORWARD."),
      "deny-before-allow": t("policy accept는 rule order를 수리하지 않습니다. specific allow가 terminal drop보다 먼저 와야 합니다.", "Policy accept does not repair rule order. The specific allow must precede the terminal drop."),
      "missing-established-reply": t("ephemeral port 전체를 여는 것은 최소 허용이 아닙니다. conntrack의 ESTABLISHED state를 사용하세요.", "Opening every ephemeral port is not least allow. Use conntrack ESTABLISHED state."),
      "default-accept-leak": t("한 port deny는 다른 protocol을 계속 놓칩니다. base chain 자체를 fail-closed로 만드세요.", "One port deny still misses other protocols. Make the base chain itself fail closed."),
    } satisfies Record<NetworkPolicyIncidentId, string>)[result.incidentId];
  };

  return (
    <section
      className="interactive-lab network-policy-incident-lab"
      aria-labelledby="network-policy-incidents-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
    >
      <div className="network-policy-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · FIREWALL INCIDENTS</p>
          <h3 id="network-policy-incidents-title">{t("hook·order·state·default의 네 사건 수리", "Repair four hook, order, state, and default incidents")}</h3>
          <p>{t("각 repair는 같은 packet probe evaluator로 다시 실행됩니다.", "Every repair is re-executed through the same packet-probe evaluator.")}</p>
        </div>
        <strong>{completed.length} / {incidentIds.length}</strong>
      </div>
      <div className="network-policy-lab-toolbar">
        <button type="button" className="button button-ghost" onClick={resetAll}>{t("모든 사건 초기화", "Reset all incidents")}</button>
      </div>
      {runtimeFailed ? <div className="network-policy-feedback is-error" role="alert">{t("브라우저 policy model을 실행하지 못했습니다. 초기화 후 다시 시도하세요.", "The browser policy model failed. Reset and try again.")}</div> : null}
      <div className="network-policy-incident-grid">
        {incidentIds.map((incidentId) => {
          const fixture = networkPolicyIncidentFixtures[incidentId];
          const item = copy[incidentId];
          const result = results[incidentId];
          return (
            <article className="network-policy-incident-card" key={incidentId}>
              <span>{item.number} · {incidentId}</span>
              <h4>{item.title}</h4>
              <pre aria-label={t(`${item.title} 증거`, `${item.title} evidence`)}>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail
                compact
                controlId={`policy-incident-${incidentId}-repair`}
                label={t("packet trace에 적용할 최소 수리", "Minimal repair for the packet trace")}
                value={repairs[incidentId] ?? ""}
                options={fixture.repairOptions.map((repair) => ({ value: repair, label: optionLabel(repair) }))}
                onChange={(repair) => chooseRepair(incidentId, repair)}
              />
              <div className="network-policy-incident-actions">
                <button type="button" className="button button-primary" disabled={!repairs[incidentId]} onClick={() => runIncident(incidentId)}>{t("packet suite 재실행·판정", "Re-run packet suite and grade")}</button>
              </div>
              <div className={`network-policy-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">
                {result ? resultMessage(result) : t("증거를 최초 실패한 policy invariant와 연결하세요.", "Connect the evidence to the first failed policy invariant.")}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

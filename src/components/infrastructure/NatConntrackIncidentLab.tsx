import { useEffect, useState } from "react";
import {
  evaluateNatIncident,
  natIncidentFixtures,
  type NatIncidentEvaluation,
  type NatIncidentId,
  type NatIncidentRepair,
} from "../../features/infrastructure/egress-nat";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(natIncidentFixtures) as NatIncidentId[];

export function NatConntrackIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<NatIncidentId, NatIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<NatIncidentId, NatIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<NatIncidentId[]>([]);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);

  const copy: Record<NatIncidentId, { title: string; evidence: string; prompt: string }> = {
    "wrong-nat-hook": {
      title: t("source NAT rule이 prerouting에 있음", "The source-NAT rule is in prerouting"),
      evidence: "router$ nft list chain ip nat prerouting\n  ip saddr 10.20.0.0/24 snat to 203.0.113.10",
      prompt: t("route가 선택한 egress에서 source를 바꾸도록 hook을 수리하세요.", "Repair the hook so the source changes on the routed egress."),
    },
    "unowned-snat-address": {
      title: t("SNAT target을 egress가 소유하지 않음", "The egress does not own the SNAT target"),
      evidence: "router$ ip -br addr show wan0 → 203.0.113.10/24\nrule → snat to 203.0.113.99",
      prompt: t("upstream이 reply할 수 있는 egress-owned identity를 선택하세요.", "Choose an egress-owned identity that the upstream can reply to."),
    },
    "asymmetric-return": {
      title: t("reply가 original stateful router를 우회", "The reply bypasses the original stateful router"),
      evidence: "request → nat-gw-a · conntrack ESTABLISHED\nreply → nat-gw-b · no matching state",
      prompt: t("reverse translation이 같은 flow state를 조회하게 하세요.", "Make reverse translation consult the same flow state."),
    },
    "dynamic-egress-stale-snat": {
      title: t("동적 egress lease가 바뀌었지만 SNAT 주소는 고정", "The dynamic egress lease changed but SNAT stayed fixed"),
      evidence: "wan0 lease → 203.0.113.77\nSNAT rule → 203.0.113.10",
      prompt: t("변하는 interface 주소 수명과 translation rule을 맞추세요.", "Align the translation rule with the changing interface-address lifetime."),
    },
  };

  const optionLabel = (repair: NatIncidentRepair) => ({
    "move-rule-to-postrouting": t("source NAT rule을 postrouting으로 이동", "move the source-NAT rule to postrouting"),
    "add-dnat-in-prerouting": t("prerouting에 DNAT도 추가", "also add DNAT in prerouting"),
    "use-egress-owned-address": t("SNAT target을 egress-owned address로 변경", "change SNAT target to the egress-owned address"),
    "advertise-private-address-upstream": t("private address를 upstream에 광고", "advertise the private address upstream"),
    "return-through-original-router": t("reply를 original NAT router로 복귀", "return the reply through the original NAT router"),
    "disable-conntrack": t("conntrack을 비활성화", "disable conntrack"),
    "use-masquerade-for-dynamic-egress": t("동적 egress에는 MASQUERADE 사용", "use masquerade for dynamic egress"),
    "pin-old-egress-address": t("만료된 old address를 다시 고정", "pin the expired old address again"),
  } satisfies Record<NatIncidentRepair, string>)[repair];

  function choose(incidentId: NatIncidentId, repair: NatIncidentRepair) {
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((id) => id !== incidentId));
  }

  function run(incidentId: NatIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      const result = evaluateNatIncident(incidentId, repair);
      setResults((current) => ({ ...current, [incidentId]: result }));
      setCompleted((current) => result.passed
        ? [...new Set([...current, incidentId])]
        : current.filter((id) => id !== incidentId));
    } catch {
      setResults((current) => ({ ...current, [incidentId]: undefined }));
      setCompleted((current) => current.filter((id) => id !== incidentId));
    }
  }

  function reset() {
    setRepairs({});
    setResults({});
    setCompleted(() => []);
  }

  return (
    <section className="interactive-lab nat-incident-lab" aria-labelledby="nat-incidents-title" data-interactive-ready={interactiveReady ? "true" : "false"}>
      <div className="nat-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · NAT / CONNTRACK INCIDENTS</p>
          <h3 id="nat-incidents-title">{t("네 개의 egress 사건을 최초 실패 경계에서 수리", "Repair four egress incidents at the first failed boundary")}</h3>
          <p>{t("각 repair는 같은 packet-state evaluator로 다시 실행됩니다.", "Every repair is re-executed through the same packet-state evaluator.")}</p>
        </div>
        <strong>{completed.length} / {incidentIds.length}</strong>
      </div>
      <div className="nat-lab-toolbar"><button type="button" className="button button-ghost" onClick={reset}>{t("모든 사건 초기화", "Reset all incidents")}</button></div>
      <div className="nat-incident-grid">
        {incidentIds.map((incidentId, index) => {
          const item = copy[incidentId];
          const result = results[incidentId];
          return (
            <article className="nat-incident-card" key={incidentId} data-incident-id={incidentId}>
              <span>{String(index + 1).padStart(2, "0")} · {incidentId}</span>
              <h4>{item.title}</h4>
              <pre>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail compact controlId={`nat-incident-${incidentId}-repair`} label={t("packet 경계에 적용할 최소 수리", "Minimal repair for the packet boundary")} value={repairs[incidentId] ?? ""} options={natIncidentFixtures[incidentId].repairOptions.map((repair) => ({ value: repair, label: optionLabel(repair) }))} onChange={(repair) => choose(incidentId, repair)} />
              <button type="button" className="button button-primary" disabled={!repairs[incidentId]} onClick={() => run(incidentId)}>{t("packet state 재실행", "Re-run packet state")}</button>
              <div className={`nat-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">
                {result ? result.passed ? t("통과 — request와 reply가 동일한 translation contract를 만족합니다.", "Passed — request and reply satisfy the same translation contract.") : t(`실패 — ${result.reason} 경계가 남았습니다.`, `Failed — the ${result.reason} boundary remains.`) : t("증거와 repair를 연결한 뒤 상태를 다시 실행하세요.", "Connect the evidence to a repair, then re-run the state.")}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}

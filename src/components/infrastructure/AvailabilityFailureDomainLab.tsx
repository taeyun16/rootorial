import { useEffect, useState } from "react";
import { availabilityPresets, evaluateAvailability, type AvailabilityDraft, type AvailabilityMode } from "../../features/infrastructure/availability-failure-domains";
import { useLocale } from "../../features/localization/localization";
import { AvailabilityFailureDomainView } from "./AvailabilityFailureDomainView";

type Prediction = "" | "target-met" | "target-missed";
type Completion = { placement: boolean; recovery: boolean };

function scaffold(mode: AvailabilityMode): AvailabilityDraft {
  return { ...availabilityPresets[`${mode}-scaffold`] };
}

export function AvailabilityFailureDomainLab({ onCompletionChange }: { onCompletionChange: (completion: Completion) => void }) {
  const { locale } = useLocale();
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const [draft, setDraft] = useState<AvailabilityDraft>(() => scaffold("domain-placement"));
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateAvailability> | null>(null);
  const [completion, setCompletion] = useState<Completion>({ placement: false, recovery: false });
  const [feedback, setFeedback] = useState(t("zone A failure를 견디도록 placement를 조립하세요.", "Assemble placement that survives a zone A failure."));
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);

  const completionKey = draft.mode === "domain-placement" ? "placement" : "recovery";
  function publish(next: Completion) { setCompletion(next); onCompletionChange(next); }
  function invalidate() { setEvaluation(null); setPrediction(""); publish({ ...completion, [completionKey]: false }); setFeedback(t("설계 revision이 바뀌었습니다. 결과를 다시 예측하고 실행하세요.", "The design revision changed. Predict and run again.")); }
  function setField<K extends keyof AvailabilityDraft>(field: K, value: AvailabilityDraft[K]) { setDraft((current) => ({ ...current, [field]: value })); invalidate(); }
  function switchMode(mode: AvailabilityMode) { setDraft(scaffold(mode)); setEvaluation(null); setPrediction(""); setFeedback(mode === "domain-placement" ? t("gateway·replica·standby를 서로 다른 zone에 배치하세요.", "Place gateways, replicas, and standby across distinct zones.") : t("dependency와 failover recovery budget을 조립하세요.", "Assemble dependency and failover recovery budgets.")); }
  function run() {
    if (!prediction) { setFeedback(t("먼저 zone failure 결과를 예측하세요.", "Predict the zone-failure result first.")); return; }
    const result = evaluateAvailability(draft);
    setEvaluation(result);
    const passed = result.passed && prediction === "target-met";
    publish({ ...completion, [completionKey]: passed });
    setFeedback(passed ? t(`통과 — ${result.servedRequests.toLocaleString()} / 10,000 request, ${result.availabilityPercent.toFixed(2)}%입니다.`, `Passed — ${result.servedRequests.toLocaleString()} / 10,000 requests, ${result.availabilityPercent.toFixed(2)}%.`) : t(`실행 결과: ${result.reason}. 최초 실패 budget을 수리하세요.`, `Result: ${result.reason}. Repair the first failed budget.`));
  }

  return <section className="interactive-lab availability-lab" aria-labelledby="availability-lab-title" data-interactive-ready={ready ? "true" : "false"} data-active-mode={draft.mode}>
    <div className="availability-lab-header"><div><p className="concept-check-kicker">REQUIRED LAB · CORRELATED FAILURE AND RECOVERY</p><h3 id="availability-lab-title">{t("domain placement와 dependency recovery를 각각 실행", "Execute domain placement and dependency recovery")}</h3></div><strong>{Number(completion.placement) + Number(completion.recovery)} / 2</strong></div>
    <div className="availability-toolbar" role="group" aria-label={t("가용성 mode", "Availability mode")}><button type="button" className="button button-ghost" aria-pressed={draft.mode === "domain-placement"} onClick={() => switchMode("domain-placement")}>DOMAIN PLACEMENT {completion.placement ? "✓" : ""}</button><button type="button" className="button button-ghost" aria-pressed={draft.mode === "dependency-recovery"} onClick={() => switchMode("dependency-recovery")}>DEPENDENCY RECOVERY {completion.recovery ? "✓" : ""}</button><button type="button" className="button button-ghost" onClick={() => switchMode(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button></div>
    <div className="availability-controls">
      <label><span>{t("gateway failure domain", "Gateway failure domains")}</span><select aria-label={t("gateway failure domain", "Gateway failure domains")} value={draft.gatewayPlacement} onChange={(event) => setField("gatewayPlacement", event.target.value as AvailabilityDraft["gatewayPlacement"])}><option value="same-zone-a">gateway-a + gateway-b · zone A</option><option value="split-zones">gateway-a · zone A / gateway-b · zone B</option></select></label>
      <label><span>{t("app replica placement", "App replica placement")}</span><select aria-label={t("app replica placement", "App replica placement")} value={draft.replicaPlacement} onChange={(event) => setField("replicaPlacement", event.target.value as AvailabilityDraft["replicaPlacement"])}><option value="same-zone-a">app-a/b/c · zone A</option><option value="split-zones">app-a/b/c · zones A/B/C</option></select></label>
      <label><span>{t("database primary·standby", "Database primary and standby")}</span><select aria-label={t("database primary·standby", "Database primary and standby")} value={draft.databasePlacement} onChange={(event) => setField("databasePlacement", event.target.value as AvailabilityDraft["databasePlacement"])}><option value="same-zone-standby">primary + standby · zone A</option><option value="cross-zone-standby">primary · A / standby · B</option></select></label>
      <label><span>{t("optional dependency 정책", "Optional dependency policy")}</span><select aria-label={t("optional dependency 정책", "Optional dependency policy")} value={draft.optionalDependencyPolicy} onChange={(event) => setField("optionalDependencyPolicy", event.target.value as AvailabilityDraft["optionalDependencyPolicy"])}><option value="required">required · cascade failure</option><option value="degraded-mode">optional · degraded mode</option></select></label>
      <label><span>{t("zone failover recovery", "Zone failover recovery")}</span><select aria-label={t("zone failover recovery", "Zone failover recovery")} value={String(draft.recoverySeconds)} onChange={(event) => setField("recoverySeconds", Number(event.target.value) as AvailabilityDraft["recoverySeconds"])}><option value="90">{t("90s · budget 초과", "90s · over budget")}</option><option value="20">20s · 40 request loss</option></select></label>
    </div>
    <AvailabilityFailureDomainView draft={draft} evaluation={evaluation} />
    <div className="availability-run"><label><span>{t("zone A failure 결과 예측", "Predict the zone A failure result")}</span><select aria-label={t("가용성 실행 결과 예측", "Predict availability result")} value={prediction} onChange={(event) => { setPrediction(event.target.value as Prediction); setEvaluation(null); }}><option value="">—</option><option value="target-met">≥ 99.50%</option><option value="target-missed">&lt; 99.50%</option></select></label><button type="button" className="button button-primary" onClick={run}>{t("10,000 request failure trace 실행", "Run the 10,000-request failure trace")}</button></div>
    <div className={`availability-feedback${evaluation?.passed && prediction === "target-met" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">{feedback}</div>
  </section>;
}

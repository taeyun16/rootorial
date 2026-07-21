import { useEffect, useState } from "react";
import { availabilityPresets, evaluateAvailability, type AvailabilityDraft, type AvailabilityMode } from "../../features/infrastructure/availability-failure-domains";
import { useLocale } from "../../features/localization/localization";
import { AvailabilityFailureDomainView } from "./AvailabilityFailureDomainView";
import { InfrastructureChoiceRail, InfrastructureWorkspace } from "./InfrastructureInteractionPrimitives";

type Prediction = "" | "target-met" | "target-missed";
type Completion = { placement: boolean; recovery: boolean };

function scaffold(mode: AvailabilityMode): AvailabilityDraft {
  return { ...availabilityPresets[`${mode}-scaffold`] };
}

function completionKeyFor(mode: AvailabilityMode): keyof Completion {
  return mode === "domain-placement" ? "placement" : "recovery";
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

  useEffect(() => {
    onCompletionChange(completion);
  }, [completion, onCompletionChange]);

  function setModeCompletion(mode: AvailabilityMode, complete: boolean) {
    const key = completionKeyFor(mode);
    setCompletion((current) => current[key] === complete
      ? current
      : { ...current, [key]: complete });
  }

  function invalidate() { setEvaluation(null); setPrediction(""); setModeCompletion(draft.mode, false); setFeedback(t("설계 revision이 바뀌었습니다. 결과를 다시 예측하고 실행하세요.", "The design revision changed. Predict and run again.")); }
  function setField<K extends keyof AvailabilityDraft>(field: K, value: AvailabilityDraft[K]) { setDraft((current) => ({ ...current, [field]: value })); invalidate(); }
  function switchMode(mode: AvailabilityMode) { setDraft(scaffold(mode)); setEvaluation(null); setPrediction(""); setModeCompletion(mode, false); setFeedback(mode === "domain-placement" ? t("gateway·replica·standby를 서로 다른 zone에 배치하세요.", "Place gateways, replicas, and standby across distinct zones.") : t("dependency와 failover recovery budget을 조립하세요.", "Assemble dependency and failover recovery budgets.")); }
  function changePrediction(value: Exclude<Prediction, "">) { setPrediction(value); setEvaluation(null); setModeCompletion(draft.mode, false); setFeedback(t("예측이 바뀌었습니다. 현재 failure trace를 다시 실행하세요.", "Prediction changed. Re-run the current failure trace.")); }
  function run() {
    if (!prediction) { setFeedback(t("먼저 zone failure 결과를 예측하세요.", "Predict the zone-failure result first.")); return; }
    const result = evaluateAvailability(draft);
    setEvaluation(result);
    const passed = result.passed && prediction === "target-met";
    setModeCompletion(draft.mode, passed);
    setFeedback(passed ? t(`통과 — ${result.servedRequests.toLocaleString()} / 10,000 request, ${result.availabilityPercent.toFixed(2)}%입니다.`, `Passed — ${result.servedRequests.toLocaleString()} / 10,000 requests, ${result.availabilityPercent.toFixed(2)}%.`) : t(`실행 결과: ${result.reason}. 최초 실패 budget을 수리하세요.`, `Result: ${result.reason}. Repair the first failed budget.`));
  }

  return <section className="interactive-lab availability-lab" aria-labelledby="availability-lab-title" data-interactive-ready={ready ? "true" : "false"} data-active-mode={draft.mode}>
    <div className="availability-lab-header"><div><p className="concept-check-kicker">REQUIRED LAB · CORRELATED FAILURE AND RECOVERY</p><h3 id="availability-lab-title">{t("domain placement와 dependency recovery를 각각 실행", "Execute domain placement and dependency recovery")}</h3></div><strong>{Number(completion.placement) + Number(completion.recovery)} / 2</strong></div>
    <div className="availability-toolbar" role="group" aria-label={t("가용성 mode", "Availability mode")}><button type="button" className="button button-ghost" aria-pressed={draft.mode === "domain-placement"} onClick={() => switchMode("domain-placement")}>DOMAIN PLACEMENT {completion.placement ? "✓" : ""}</button><button type="button" className="button button-ghost" aria-pressed={draft.mode === "dependency-recovery"} onClick={() => switchMode("dependency-recovery")}>DEPENDENCY RECOVERY {completion.recovery ? "✓" : ""}</button><button type="button" className="button button-ghost" onClick={() => switchMode(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button></div>
    <InfrastructureWorkspace
      label={t("failure domain 직접 조작 workspace", "Direct failure-domain workspace")}
      stage={(
        <AvailabilityFailureDomainView
          draft={draft}
          evaluation={evaluation}
          onGatewayPlacementChange={(value) => setField("gatewayPlacement", value)}
          onReplicaPlacementChange={(value) => setField("replicaPlacement", value)}
          onDatabasePlacementChange={(value) => setField("databasePlacement", value)}
          onDependencyPolicyChange={(value) => setField("optionalDependencyPolicy", value)}
          onRecoverySecondsChange={(value) => setField("recoverySeconds", value)}
        />
      )}
      inspector={(
        <div className="availability-failure-contract">
          <span>FAILURE INJECTION</span>
          <strong>ZONE A → OFFLINE</strong>
          <p>{t("지도에서 placement와 recovery budget을 바꾸고 10,000 request trace를 실행하세요.", "Change placement and the recovery budget on the map, then run the 10,000-request trace.")}</p>
          <dl>
            <div><dt>{t("목표", "Target")}</dt><dd>≥ 99.50%</dd></div>
            <div><dt>{t("허용 손실", "Loss budget")}</dt><dd>≤ 50 / 10,000</dd></div>
          </dl>
        </div>
      )}
    />
    <div className="availability-run">
      <InfrastructureChoiceRail<Exclude<Prediction, "">>
        controlId="availability-prediction"
        label={t("zone A failure 결과 예측", "Predict the zone A failure result")}
        value={prediction}
        options={[
          { value: "target-met", label: "≥ 99.50%", detail: t("목표 충족", "target met") },
          { value: "target-missed", label: "< 99.50%", detail: t("목표 미달", "target missed") },
        ]}
        onChange={changePrediction}
      />
      <button type="button" className="button button-primary" onClick={run}>{t("10,000 request failure trace 실행", "Run the 10,000-request failure trace")}</button>
    </div>
    <div className={`availability-feedback${evaluation?.passed && prediction === "target-met" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">{feedback}</div>
  </section>;
}

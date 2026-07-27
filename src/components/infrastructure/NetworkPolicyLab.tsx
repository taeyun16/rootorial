import { useEffect, useMemo, useState } from "react";
import {
  evaluateNetworkPolicy,
  networkPolicyPresets,
  type NetworkPolicyAllowScope,
  type NetworkPolicyDefault,
  type NetworkPolicyDraft,
  type NetworkPolicyFailureReason,
  type NetworkPolicyHook,
  type NetworkPolicyMode,
  type NetworkPolicyRuleOrder,
} from "../../features/infrastructure/network-policy";
import type { NetworkPolicyGradeState } from "../../features/infrastructure/network-policy-visual";
import { useLocale } from "../../features/localization/localization";
import {
  InfrastructureChoiceRail,
  InfrastructureStateSwitch,
} from "./InfrastructureInteractionPrimitives";
import { NetworkPolicyView } from "./NetworkPolicyView";

type Prediction = "" | "intended-only" | "all-allowed" | "all-blocked";
type LocalizedMessage = { ko: string; en: string };
type Completion = { forward: boolean; input: boolean };

const initialMessage: LocalizedMessage = {
  ko: "FORWARD scaffold의 hook·default·order·state를 수리하고 packet suite 결과를 예측하세요.",
  en: "Repair the FORWARD scaffold's hook, default, order, and state, then predict the packet-suite result.",
};

function message(ko: string, en: string): LocalizedMessage {
  return { ko, en };
}

function scaffoldFor(mode: NetworkPolicyMode): NetworkPolicyDraft {
  return { ...networkPolicyPresets[`${mode}-scaffold`] };
}

export function NetworkPolicyLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: Completion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<NetworkPolicyDraft>(() => scaffoldFor("forward"));
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateNetworkPolicy> | null>(null);
  const [completed, setCompleted] = useState<Completion>({ forward: false, input: false });
  const [feedback, setFeedback] = useState<LocalizedMessage>(initialMessage);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const preview = useMemo(() => evaluateNetworkPolicy(draft), [draft]);
  const gradeState: NetworkPolicyGradeState = !evaluation
    ? "not-run"
    : evaluation.passed && prediction === "intended-only" ? "passed" : "failed";

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed);
  }, [completed, onCompletionChange]);

  function setModeCompletion(mode: NetworkPolicyMode, complete: boolean) {
    setCompleted((current) => current[mode] === complete
      ? current
      : { ...current, [mode]: complete });
  }

  function invalidate(nextFeedback: LocalizedMessage, mode = draft.mode) {
    setEvaluation(null);
    setPrediction("");
    setModeCompletion(mode, false);
    setFeedback(nextFeedback);
  }

  function changePrediction(value: Exclude<Prediction, "">) {
    setPrediction(value);
    setEvaluation(null);
    setModeCompletion(draft.mode, false);
    setFeedback(message(
      "예측이 바뀌었습니다. 현재 packet probe suite를 다시 실행하세요.",
      "Prediction changed. Re-run the current packet-probe suite.",
    ));
  }

  function applyScaffold(mode: NetworkPolicyMode) {
    setDraft(scaffoldFor(mode));
    invalidate(mode === "forward"
      ? message("FORWARD scaffold를 불러왔습니다. transit packet이 지나는 fail-closed chain을 조립하세요.", "FORWARD scaffold loaded. Assemble the fail-closed chain traversed by transit packets.")
      : message("INPUT scaffold를 불러왔습니다. router-local SSH와 established reply만 여세요.", "INPUT scaffold loaded. Open only router-local SSH and established replies."), mode);
  }

  function setField<K extends keyof NetworkPolicyDraft>(field: K, value: NetworkPolicyDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(message(
      "policy state가 바뀌었습니다. packet suite 결과를 다시 예측하고 실행하세요.",
      "Policy state changed. Predict and run the packet suite again.",
    ));
  }

  const reasonLabel = (reason: NetworkPolicyFailureReason): LocalizedMessage => ({
    "least-allow": message("최소 허용 policy 통과", "least-allow policy passed"),
    "wrong-hook": message("packet path와 hook이 다름", "the hook does not match the packet path"),
    "default-accept": message("base chain policy가 accept", "the base-chain policy is accept"),
    "deny-before-allow": message("terminal deny가 allow보다 앞섬", "the terminal deny precedes the allow"),
    "missing-established-rule": message("established reply rule 누락", "the established-reply rule is missing"),
    "overbroad-allow": message("source 또는 port allow가 너무 넓음", "the source or port allow is overbroad"),
    "required-flow-dropped": message("필수 NEW flow가 drop", "the required NEW flow is dropped"),
    "established-reply-dropped": message("ESTABLISHED reply가 drop", "the ESTABLISHED reply is dropped"),
    "unexpected-flow-allowed": message("의도하지 않은 probe가 accept", "an unintended probe is accepted"),
  }[reason]);

  function runPolicy() {
    if (!prediction) {
      setFeedback(message("먼저 현재 chain의 packet suite 결과를 예측하세요.", "Predict the current chain's packet-suite result first."));
      return;
    }
    try {
      const result = evaluateNetworkPolicy(draft);
      setEvaluation(result);
      const passed = result.passed && prediction === "intended-only";
      setModeCompletion(draft.mode, passed);
      if (passed) {
        setFeedback(draft.mode === "forward"
          ? message("FORWARD 통과 — app:8080 NEW와 ESTABLISHED reply만 accept되고 나머지는 drop됩니다.", "FORWARD passed — only app:8080 NEW and its ESTABLISHED reply are accepted; everything else drops.")
          : message("INPUT 통과 — admin SSH와 ESTABLISHED local reply만 accept되고 나머지는 drop됩니다.", "INPUT passed — only admin SSH and ESTABLISHED local replies are accepted; everything else drops."));
      } else if (result.passed) {
        setFeedback(message("policy는 최소 허용으로 통과했습니다. 실행 전 prediction을 probe 요구사항과 다시 비교하세요.", "The policy passes least allow. Compare the pre-run prediction with the probe requirements."));
      } else {
        const reason = reasonLabel(result.reason);
        setFeedback(message(
          `실행 결과: ${reason.ko}. visual chain의 최초 실패 invariant부터 수리하세요.`,
          `Execution result: ${reason.en}. Repair the first failed invariant in the visual chain.`,
        ));
      }
    } catch {
      setEvaluation(null);
      setModeCompletion(draft.mode, false);
      setFeedback(message("브라우저 policy model을 실행하지 못했습니다. 현재 mode를 초기화하세요.", "The browser policy model failed. Reset the current mode."));
    }
  }

  const commandEvidence = `table inet filter {\n  chain ${draft.mode} {\n    type filter hook ${draft.hook} priority filter; policy ${draft.defaultPolicy};\n${preview.machine.chain.rules.map(({ description }) => `    ${description}`).join("\n")}\n  }\n}`;

  return (
    <section
      className="interactive-lab network-policy-lab"
      aria-labelledby="network-policy-lab-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
      data-active-mode={draft.mode}
    >
      <div className="network-policy-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED LAB · LEAST-ALLOW BOTH HOOKS</p>
          <h3 id="network-policy-lab-title">{t("FORWARD와 INPUT chain을 최소 허용으로 조립", "Assemble least-allow FORWARD and INPUT chains")}</h3>
          <p>{t("mode마다 ordered rule과 다섯 packet probe를 브라우저에서 실행합니다.", "Each mode executes an ordered chain and five packet probes in the browser.")}</p>
        </div>
        <strong>{Number(completed.forward) + Number(completed.input)} / 2</strong>
      </div>

      <div className="network-policy-mode-toolbar" role="group" aria-label={t("policy mode와 초기화", "Policy mode and reset")}>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "forward"} onClick={() => applyScaffold("forward")}>TRANSIT / FORWARD MODE {completed.forward ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "input"} onClick={() => applyScaffold("input")}>ROUTER-LOCAL / INPUT MODE {completed.input ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" onClick={() => applyScaffold(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button>
      </div>

      <NetworkPolicyView
        preview={preview}
        evaluation={evaluation}
        gradeState={gradeState}
        controls={{
          boundary: <div className="network-policy-boundary-controls">
            <InfrastructureChoiceRail<NetworkPolicyHook>
              controlId="policy-hook"
              label={t("packet을 어느 base-chain hook에 놓을까요?", "Which base-chain hook should receive the packet?")}
              value={draft.hook}
              compact
              options={[
                { value: "input", label: "INPUT", detail: t("router-local destination", "Router-local destination") },
                { value: "forward", label: "FORWARD", detail: t("transit destination", "Transit destination") },
              ]}
              onChange={(value) => setField("hook", value)}
            />
            <InfrastructureChoiceRail<NetworkPolicyDefault>
              controlId="policy-default"
              label={t("unmatched packet의 base policy", "Base policy for unmatched packets")}
              value={draft.defaultPolicy}
              compact
              options={[
                { value: "accept", label: "policy accept", eyebrow: "FAIL OPEN" },
                { value: "drop", label: "policy drop", eyebrow: "FAIL CLOSED" },
              ]}
              onChange={(value) => setField("defaultPolicy", value)}
            />
            <p className="network-policy-derived-state">{draft.mode === "forward"
              ? t("router 자체가 목적지가 아닌 transit packet은 FORWARD를 통과합니다.", "Transit packets not addressed to the router cross FORWARD.")
              : t("router-local socket이 목적지인 packet은 INPUT을 통과합니다.", "Packets targeting a router-local socket cross INPUT.")}</p>
          </div>,
          chain: <div className="network-policy-chain-controls">
            <InfrastructureStateSwitch
              controlId="policy-stateful-rule"
              label="ct state established accept"
              detail={t("reply traffic용 stateful rule", "Stateful rule for reply traffic")}
              checked={draft.statefulRule}
              onChange={(value) => setField("statefulRule", value)}
              stateOn="IN CHAIN"
              stateOff="REMOVED"
            />
            <InfrastructureChoiceRail<NetworkPolicyAllowScope>
              controlId="policy-allow-scope"
              label={t("specific NEW allow card의 범위", "Scope of the specific NEW allow card")}
              value={draft.allowScope}
              compact
              options={[
                { value: "exact", label: draft.mode === "forward" ? "10.20.0.2 → app:8080" : "198.51.100.25 → router:22", eyebrow: "EXACT" },
                { value: "any-source", label: t("모든 source", "Any source"), detail: t("service port 고정", "Service port fixed") },
                { value: "any-port", label: t("모든 TCP port", "Any TCP port"), detail: t("source만 고정", "Source fixed") },
              ]}
              onChange={(value) => setField("allowScope", value)}
            />
            <InfrastructureChoiceRail<NetworkPolicyRuleOrder>
              controlId="policy-rule-order"
              label={t("rule card 순서", "Rule-card order")}
              value={draft.ruleOrder}
              options={[
                { value: "stateful-specific-deny", label: t("stateful → specific → drop", "Stateful → specific → drop"), detail: t("필요한 두 flow 뒤 terminal deny", "Required flows before terminal deny") },
                { value: "deny-specific-stateful", label: t("drop → specific → stateful", "Drop → specific → stateful"), detail: t("terminal deny가 먼저 실행", "Terminal deny runs first") },
              ]}
              onChange={(value) => setField("ruleOrder", value)}
            />
          </div>,
        }}
      />

      <div className="network-policy-command-evidence">
        <span>{t("현재 nftables ruleset projection", "Current nftables ruleset projection")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="network-policy-run-row">
        <InfrastructureChoiceRail<Exclude<Prediction, "">>
          controlId="policy-prediction"
          label={t("packet probe suite 결과 예측", "Predict the packet-probe suite")}
          value={prediction}
          options={[
            { value: "intended-only", label: t("요구한 두 flow만 ACCEPT", "Only two required flows ACCEPT"), eyebrow: "LEAST ALLOW" },
            { value: "all-allowed", label: t("모든 probe ACCEPT", "All probes ACCEPT"), eyebrow: "FAIL OPEN" },
            { value: "all-blocked", label: t("모든 probe DROP", "All probes DROP"), eyebrow: "LOCKED OUT" },
          ]}
          onChange={changePrediction}
        />
        <button type="button" className="button button-primary" onClick={runPolicy}>{t("packet probe suite 실행", "Run packet probe suite")}</button>
      </div>

      <div className={`network-policy-feedback${gradeState === "passed" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

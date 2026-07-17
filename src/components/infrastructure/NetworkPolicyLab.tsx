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

  function publishCompletion(next: Completion) {
    setCompleted(next);
    onCompletionChange(next);
  }

  function invalidate(nextFeedback: LocalizedMessage, mode = draft.mode) {
    setEvaluation(null);
    setPrediction("");
    publishCompletion({ ...completed, [mode]: false });
    setFeedback(nextFeedback);
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
      publishCompletion({ ...completed, [draft.mode]: passed });
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
      publishCompletion({ ...completed, [draft.mode]: false });
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

      <div className="network-policy-control-grid">
        <fieldset>
          <legend>{t("base chain 경계", "Base-chain boundary")}</legend>
          <label>
            <span>{t("base chain hook", "Base chain hook")}</span>
            <select aria-label={t("base chain hook", "Base chain hook")} value={draft.hook} onChange={(event) => setField("hook", event.target.value as NetworkPolicyHook)}>
              <option value="input">INPUT</option>
              <option value="forward">FORWARD</option>
            </select>
          </label>
          <label>
            <span>{t("base chain policy", "Base chain policy")}</span>
            <select aria-label={t("base chain policy", "Base chain policy")} value={draft.defaultPolicy} onChange={(event) => setField("defaultPolicy", event.target.value as NetworkPolicyDefault)}>
              <option value="accept">policy accept</option>
              <option value="drop">policy drop</option>
            </select>
          </label>
          <p className="network-policy-derived-state">{draft.mode === "forward"
            ? t("목적지가 router 자체가 아닌 transit packet만 FORWARD hook을 통과합니다.", "Only transit packets not addressed to the router itself cross the FORWARD hook.")
            : t("router-local socket이 최종 목적지인 packet만 INPUT hook을 통과합니다.", "Only packets whose final destination is a router-local socket cross the INPUT hook.")}</p>
        </fieldset>

        <fieldset>
          <legend>{t("state와 allow 범위", "State and allow scope")}</legend>
          <label className="network-policy-check-control">
            <input type="checkbox" checked={draft.statefulRule} onChange={(event) => setField("statefulRule", event.target.checked)} />
            ct state established,related accept
          </label>
          <label>
            <span>{t("required allow scope", "Required allow scope")}</span>
            <select aria-label={t("required allow scope", "Required allow scope")} value={draft.allowScope} onChange={(event) => setField("allowScope", event.target.value as NetworkPolicyAllowScope)}>
              <option value="exact">{draft.mode === "forward" ? "10.20.0.2 → 10.30.0.2:8080/tcp" : "198.51.100.25 → router:22/tcp"}</option>
              <option value="any-source">{t("모든 source에서 service port", "service port from any source")}</option>
              <option value="any-port">{t("승인 source의 모든 TCP port", "every TCP port from the approved source")}</option>
            </select>
          </label>
        </fieldset>

        <fieldset>
          <legend>{t("ordered terminal verdict", "Ordered terminal verdict")}</legend>
          <label>
            <span>{t("terminal rule order", "Terminal rule order")}</span>
            <select aria-label={t("terminal rule order", "Terminal rule order")} value={draft.ruleOrder} onChange={(event) => setField("ruleOrder", event.target.value as NetworkPolicyRuleOrder)}>
              <option value="stateful-specific-deny">ESTABLISHED accept → specific NEW accept → drop</option>
              <option value="deny-specific-stateful">drop → specific NEW accept → ESTABLISHED accept</option>
            </select>
          </label>
          <p className="network-policy-derived-state">{t("counter는 non-terminal일 수 있지만 이 lab의 accept·drop verdict는 현재 single base chain의 평가를 끝냅니다.", "A counter may be non-terminal, but this lab's accept and drop verdicts end evaluation in the current single base chain.")}</p>
        </fieldset>
      </div>

      <NetworkPolicyView preview={preview} evaluation={evaluation} gradeState={gradeState} />

      <div className="network-policy-command-evidence">
        <span>{t("현재 nftables ruleset projection", "Current nftables ruleset projection")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="network-policy-run-row">
        <label>
          <span>{t("policy 실행 결과 예측", "Predict the policy result")}</span>
          <select aria-label={t("policy 실행 결과 예측", "Predict the policy result")} value={prediction} onChange={(event) => { setPrediction(event.target.value as Prediction); setEvaluation(null); }}>
            <option value="">—</option>
            <option value="intended-only">{t("요구한 두 flow만 accept", "only the two required flows are accepted")}</option>
            <option value="all-allowed">{t("모든 probe accept", "all probes are accepted")}</option>
            <option value="all-blocked">{t("모든 probe drop", "all probes are dropped")}</option>
          </select>
        </label>
        <button type="button" className="button button-primary" onClick={runPolicy}>{t("packet probe suite 실행", "Run packet probe suite")}</button>
      </div>

      <div className={`network-policy-feedback${gradeState === "passed" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

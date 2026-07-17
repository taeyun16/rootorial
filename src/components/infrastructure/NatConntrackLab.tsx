import { useEffect, useState } from "react";
import {
  evaluateNatFlow,
  natFlowPresets,
  type NatFlowDraft,
  type NatFlowFailureReason,
  type NatMode,
  type NatReturnRouter,
  type NatRuleHook,
  type NatTarget,
} from "../../features/infrastructure/egress-nat";
import { useLocale } from "../../features/localization/localization";
import { NatConntrackView } from "./NatConntrackView";

type Prediction = "" | "round-trip" | "forward-only" | "blocked-before-external";
type Completion = { snat: boolean; masquerade: boolean };
type LocalizedMessage = { ko: string; en: string };

const initialFeedback: LocalizedMessage = {
  ko: "SNAT scaffold에서 forwarding, postrouting rule과 egress-owned address를 조립하세요.",
  en: "Assemble forwarding, a postrouting rule, and an egress-owned address in the SNAT scaffold.",
};

function message(ko: string, en: string): LocalizedMessage {
  return { ko, en };
}

function scaffold(mode: NatMode): NatFlowDraft {
  return { ...natFlowPresets[`${mode}-scaffold`] };
}

export function NatConntrackLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: Completion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<NatFlowDraft>(() => scaffold("snat"));
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateNatFlow> | null>(null);
  const [completed, setCompleted] = useState<Completion>({ snat: false, masquerade: false });
  const [feedback, setFeedback] = useState<LocalizedMessage>(initialFeedback);
  const [interactiveReady, setInteractiveReady] = useState(false);

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

  function applyScaffold(mode: NatMode) {
    setDraft(scaffold(mode));
    invalidate(mode === "snat"
      ? message("고정 egress용 SNAT scaffold를 불러왔습니다.", "Loaded the fixed-egress SNAT scaffold.")
      : message("동적 egress용 MASQUERADE scaffold를 불러왔습니다.", "Loaded the dynamic-egress masquerade scaffold."), mode);
  }

  function setField<K extends keyof NatFlowDraft>(field: K, value: NatFlowDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(message(
      "packet state가 바뀌었습니다. 결과를 다시 예측하고 실행하세요.",
      "Packet state changed. Predict and run the result again.",
    ));
  }

  const reasonLabel = (reason: NatFlowFailureReason) => ({
    connected: message("왕복 translation 연결", "round-trip translation connected"),
    "client-link-down": message("client 또는 router link가 DOWN", "a client or router link is down"),
    "private-route-missing": message("private client egress route가 없음", "the private-client egress route is missing"),
    "forwarding-disabled": message("router IP forwarding이 꺼짐", "router IP forwarding is disabled"),
    "nat-rule-missing": message("source translation rule이 없음", "the source-translation rule is missing"),
    "wrong-nat-hook": message("source translation rule이 postrouting에 없음", "the source-translation rule is not in postrouting"),
    "snat-address-unowned": message("SNAT target이 egress 소유 주소가 아님", "the SNAT target is not owned by the egress"),
    "stale-snat-address": message("동적 egress에 hard-coded SNAT 주소를 사용", "a hard-coded SNAT address is used on dynamic egress"),
    "egress-address-missing": message("egress에 번역할 주소가 없음", "the egress has no translation address"),
    "listener-missing": message("external listener가 닫힘", "the external listener is closed"),
    "external-return-route-missing": message("translated source로 돌아오는 upstream route가 없음", "the upstream route back to the translated source is missing"),
    "conntrack-disabled": message("reverse translation용 conntrack state가 없음", "conntrack state for reverse translation is missing"),
    "asymmetric-return": message("reply가 original NAT router를 지나지 않음", "the reply bypasses the original NAT router"),
  } satisfies Record<NatFlowFailureReason, LocalizedMessage>)[reason];

  function runFlow() {
    if (!prediction) {
      setFeedback(message("먼저 왕복 결과를 예측하세요.", "Predict the round-trip outcome first."));
      return;
    }
    try {
      const result = evaluateNatFlow(draft);
      setEvaluation(result);
      const passed = result.passed && prediction === "round-trip";
      publishCompletion({ ...completed, [draft.mode]: passed });
      if (passed) {
        setFeedback(draft.mode === "snat"
          ? message("SNAT 통과 — 고정 egress address와 conntrack reply가 original private tuple을 복원합니다.", "SNAT passed — the fixed egress address and conntrack reply restore the original private tuple.")
          : message("MASQUERADE 통과 — 동적 egress address를 선택하고 같은 conntrack 경로로 reply를 복원합니다.", "Masquerade passed — the dynamic egress address is selected and the reply is restored through the same conntrack path."));
      } else if (result.passed) {
        setFeedback(message("실제 flow는 왕복합니다. forward 도착과 reply 복원을 나눠 예측하세요.", "The actual flow completes a round trip. Separate forward arrival from reply restoration in your prediction."));
      } else {
        const reason = reasonLabel(result.reason);
        setFeedback(message(
          `실행 결과: ${reason.ko}. live packet state의 첫 blocked stage를 수리하세요.`,
          `Execution result: ${reason.en}. Repair the first blocked stage in the live packet state.`,
        ));
      }
    } catch {
      setEvaluation(null);
      publishCompletion({ ...completed, [draft.mode]: false });
      setFeedback(message("브라우저 packet-state model을 실행하지 못했습니다. 현재 mode를 초기화하세요.", "The browser packet-state model failed. Reset the current mode."));
    }
  }

  const publicAddress = draft.egressAddressMode === "dynamic" ? "203.0.113.77" : "203.0.113.10";
  const commandEvidence = `client$ ip route → ${draft.privateRoute ? "default via 10.20.0.1" : "no default route"}\n`
    + `router$ sysctl net.ipv4.ip_forward → ${draft.forwarding ? "1" : "0"}\n`
    + `router$ nft list chain ip nat ${draft.natHook} → ${draft.natHook === "none" ? "no source NAT rule" : `${draft.mode.toUpperCase()} to ${publicAddress}`}\n`
    + `router$ conntrack -L → ${evaluation?.conntrack ? `${evaluation.conntrack.state} ${evaluation.conntrack.original}` : t("실행 전 숨김", "hidden before run")}`;

  return (
    <section
      className="interactive-lab nat-conntrack-lab"
      aria-labelledby="nat-conntrack-lab-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
      data-active-mode={draft.mode}
    >
      <div className="nat-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED LAB · TRANSLATE BOTH EGRESS MODES</p>
          <h3 id="nat-conntrack-lab-title">{t("고정 SNAT와 동적 MASQUERADE 왕복 조립", "Assemble fixed SNAT and dynamic masquerade round trips")}</h3>
          <p>{t("route와 forwarding을 먼저 맞춘 뒤 source translation과 stateful reply를 실행합니다.", "Fix routes and forwarding first, then execute source translation and the stateful reply.")}</p>
        </div>
        <strong>{Number(completed.snat) + Number(completed.masquerade)} / 2</strong>
      </div>

      <div className="nat-mode-toolbar" role="group" aria-label={t("NAT mode와 초기화", "NAT mode and reset")}>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "snat"} onClick={() => applyScaffold("snat")}>SNAT {completed.snat ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "masquerade"} onClick={() => applyScaffold("masquerade")}>MASQUERADE {completed.masquerade ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" onClick={() => applyScaffold(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button>
      </div>

      <div className="nat-control-grid">
        <fieldset>
          <legend>{t("route와 forwarding", "Routes and forwarding")}</legend>
          <label className="nat-check-control"><input type="checkbox" checked={draft.clientLinkUp} onChange={(event) => setField("clientLinkUp", event.target.checked)} />{t("client veth 양 endpoint UP", "Both client-veth endpoints UP")}</label>
          <label className="nat-check-control"><input type="checkbox" checked={draft.routerLinksUp} onChange={(event) => setField("routerLinksUp", event.target.checked)} />{t("router private·egress link UP", "Router private and egress links UP")}</label>
          <label className="nat-check-control"><input type="checkbox" checked={draft.privateRoute} onChange={(event) => setField("privateRoute", event.target.checked)} />{t("client default route 존재", "Client default route present")}</label>
          <label className="nat-check-control"><input type="checkbox" checked={draft.forwarding} onChange={(event) => setField("forwarding", event.target.checked)} />router net.ipv4.ip_forward=1</label>
        </fieldset>

        <fieldset>
          <legend>{t("source translation", "Source translation")}</legend>
          <label><span>{t("egress address 수명", "Egress address lifetime")}</span><select aria-label={t("egress address 수명", "Egress address lifetime")} value={draft.egressAddressMode} onChange={(event) => setField("egressAddressMode", event.target.value as NatFlowDraft["egressAddressMode"])}><option value="static">{t("고정 · 203.0.113.10", "static · 203.0.113.10")}</option><option value="dynamic">{t("동적 lease · 203.0.113.77", "dynamic lease · 203.0.113.77")}</option></select></label>
          <label><span>{t("NAT rule hook", "NAT rule hook")}</span><select aria-label={t("NAT rule hook", "NAT rule hook")} value={draft.natHook} onChange={(event) => setField("natHook", event.target.value as NatRuleHook)}><option value="none">{t("rule 없음", "no rule")}</option><option value="prerouting">prerouting</option><option value="postrouting">postrouting</option></select></label>
          {draft.mode === "snat" ? <label><span>SNAT target</span><select aria-label="SNAT target" value={draft.natTarget} onChange={(event) => setField("natTarget", event.target.value as NatTarget)}><option value="unowned-address">203.0.113.99 · {t("미소유", "unowned")}</option><option value="egress-address">{publicAddress} · {t("egress 소유", "egress-owned")}</option></select></label> : <p className="nat-derived-state">{t("MASQUERADE는 실행 시점의 egress interface address를 선택합니다.", "Masquerade selects the egress interface address at execution time.")}</p>}
          <label className="nat-check-control"><input type="checkbox" checked={draft.egressAddressPresent} onChange={(event) => setField("egressAddressPresent", event.target.checked)} />{t("egress interface에 usable address 존재", "Egress interface has a usable address")}</label>
        </fieldset>

        <fieldset>
          <legend>{t("reply와 conntrack", "Reply and conntrack")}</legend>
          <label className="nat-check-control"><input type="checkbox" checked={draft.externalListener} onChange={(event) => setField("externalListener", event.target.checked)} />external 198.51.100.20:443 LISTEN</label>
          <label className="nat-check-control"><input type="checkbox" checked={draft.externalReturnRoute} onChange={(event) => setField("externalReturnRoute", event.target.checked)} />{t("translated source로 upstream return route", "Upstream return route to translated source")}</label>
          <label className="nat-check-control"><input type="checkbox" checked={draft.conntrackEnabled} onChange={(event) => setField("conntrackEnabled", event.target.checked)} />{t("conntrack state 생성", "Create conntrack state")}</label>
          <label><span>{t("reply가 지나는 router", "Router traversed by reply")}</span><select aria-label={t("reply가 지나는 router", "Router traversed by reply")} value={draft.returnRouter} onChange={(event) => setField("returnRouter", event.target.value as NatReturnRouter)}><option value="different-router">{t("다른 router · state 없음", "different router · no state")}</option><option value="same-router">{t("original NAT router", "original NAT router")}</option></select></label>
        </fieldset>
      </div>

      <NatConntrackView draft={draft} evaluation={evaluation} />

      <div className="nat-command-evidence">
        <span>{t("현재 namespace-scoped command evidence", "Current namespace-scoped command evidence")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="nat-run-row">
        <label><span>{t("실행 전 왕복 결과 예측", "Predict the round-trip result before execution")}</span><select aria-label={t("NAT flow 실행 결과 예측", "Predict NAT flow execution result")} value={prediction} onChange={(event) => { setPrediction(event.target.value as Prediction); setEvaluation(null); }}><option value="">—</option><option value="round-trip">{t("request·reply tuple 모두 복원", "Both request and reply tuples restore")}</option><option value="forward-only">{t("request만 external에 도착", "Only the request reaches external")}</option><option value="blocked-before-external">{t("request가 external 전에 차단", "The request is blocked before external")}</option></select></label>
        <button type="button" className="button button-primary" onClick={runFlow}>{t("forward·return NAT flow 실행", "Run forward and return NAT flow")}</button>
      </div>

      <div className={`nat-feedback${evaluation?.passed && prediction === "round-trip" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

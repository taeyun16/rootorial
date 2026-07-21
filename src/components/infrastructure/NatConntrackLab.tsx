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
import {
  InfrastructureChoiceRail,
  InfrastructureStateSwitch,
} from "./InfrastructureInteractionPrimitives";
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

  useEffect(() => {
    onCompletionChange(completed);
  }, [completed, onCompletionChange]);

  function setModeCompletion(mode: NatMode, complete: boolean) {
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
      "예측이 바뀌었습니다. 현재 packet 왕복을 다시 실행하세요.",
      "Prediction changed. Re-run the current packet round trip.",
    ));
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
      setModeCompletion(draft.mode, passed);
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
      setModeCompletion(draft.mode, false);
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

      <NatConntrackView
        draft={draft}
        evaluation={evaluation}
        nodeControls={{
          client: <div className="nat-node-control-stack">
            <InfrastructureStateSwitch
              controlId="nat-client-link"
              label={t("client veth pair", "Client veth pair")}
              checked={draft.clientLinkUp}
              onChange={(value) => setField("clientLinkUp", value)}
              stateOn="UP"
              stateOff="DOWN"
            />
            <InfrastructureStateSwitch
              controlId="nat-private-route"
              label={t("client default route", "Client default route")}
              checked={draft.privateRoute}
              onChange={(value) => setField("privateRoute", value)}
              stateOn="INSTALLED"
              stateOff="MISSING"
            />
          </div>,
          router: <div className="nat-node-control-stack">
            <div className="nat-node-switch-grid">
              <InfrastructureStateSwitch
                controlId="nat-router-links"
                label={t("private·egress link", "Private and egress links")}
                checked={draft.routerLinksUp}
                onChange={(value) => setField("routerLinksUp", value)}
                stateOn="UP"
                stateOff="DOWN"
              />
              <InfrastructureStateSwitch
                controlId="nat-forwarding"
                label="net.ipv4.ip_forward"
                checked={draft.forwarding}
                onChange={(value) => setField("forwarding", value)}
                stateOn="1"
                stateOff="0"
              />
              <InfrastructureStateSwitch
                controlId="nat-egress-address-present"
                label={t("egress interface address", "Egress interface address")}
                checked={draft.egressAddressPresent}
                onChange={(value) => setField("egressAddressPresent", value)}
                stateOn="USABLE"
                stateOff="MISSING"
              />
              <InfrastructureStateSwitch
                controlId="nat-conntrack"
                label="conntrack"
                checked={draft.conntrackEnabled}
                onChange={(value) => setField("conntrackEnabled", value)}
                stateOn="STATEFUL"
                stateOff="DISABLED"
              />
            </div>
            <InfrastructureChoiceRail<NatFlowDraft["egressAddressMode"]>
              controlId="nat-egress-address-mode"
              label={t("egress address 수명", "Egress address lifetime")}
              value={draft.egressAddressMode}
              compact
              options={[
                { value: "static", label: t("고정 address", "Static address"), detail: "203.0.113.10" },
                { value: "dynamic", label: t("동적 lease", "Dynamic lease"), detail: "203.0.113.77" },
              ]}
              onChange={(value) => setField("egressAddressMode", value)}
            />
            <InfrastructureChoiceRail<NatRuleHook>
              controlId="nat-hook"
              label={t("source translation rule을 놓을 hook", "Hook for the source-translation rule")}
              value={draft.natHook}
              compact
              options={[
                { value: "none", label: t("rule 없음", "No rule"), eyebrow: "EMPTY" },
                { value: "prerouting", label: "PREROUTING", eyebrow: "BEFORE ROUTE" },
                { value: "postrouting", label: "POSTROUTING", eyebrow: "AFTER ROUTE" },
              ]}
              onChange={(value) => setField("natHook", value)}
            />
            {draft.mode === "snat" ? <InfrastructureChoiceRail<NatTarget>
              controlId="nat-snat-target"
              label="SNAT target"
              value={draft.natTarget}
              compact
              options={[
                { value: "unowned-address", label: "203.0.113.99", detail: t("router 미소유", "Not owned by router") },
                { value: "egress-address", label: publicAddress, detail: t("egress 소유", "Owned by egress") },
              ]}
              onChange={(value) => setField("natTarget", value)}
            /> : <p className="nat-derived-state">{t("MASQUERADE는 실행 시점의 egress interface address를 직접 읽습니다.", "Masquerade reads the egress interface address at execution time.")}</p>}
          </div>,
          external: <div className="nat-node-control-stack">
            <InfrastructureStateSwitch
              controlId="nat-external-listener"
              label="198.51.100.20:443"
              checked={draft.externalListener}
              onChange={(value) => setField("externalListener", value)}
              stateOn="LISTEN"
              stateOff="CLOSED"
            />
            <InfrastructureStateSwitch
              controlId="nat-external-return-route"
              label={t("translated source return route", "Translated-source return route")}
              checked={draft.externalReturnRoute}
              onChange={(value) => setField("externalReturnRoute", value)}
              stateOn="ROUTED"
              stateOff="MISSING"
            />
            <InfrastructureChoiceRail<NatReturnRouter>
              controlId="nat-return-router"
              label={t("reply가 통과할 router", "Router traversed by the reply")}
              value={draft.returnRouter}
              compact
              options={[
                { value: "different-router", label: t("다른 router", "Different router"), detail: t("state 없음", "No state") },
                { value: "same-router", label: t("original NAT router", "Original NAT router"), detail: t("conntrack state 재사용", "Reuse conntrack state") },
              ]}
              onChange={(value) => setField("returnRouter", value)}
            />
          </div>,
        }}
      />

      <div className="nat-command-evidence">
        <span>{t("현재 namespace-scoped command evidence", "Current namespace-scoped command evidence")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="nat-run-row">
        <InfrastructureChoiceRail<Exclude<Prediction, "">>
          controlId="nat-prediction"
          label={t("실행 전 packet 왕복 결과 예측", "Predict the packet round-trip before execution")}
          value={prediction}
          options={[
            { value: "round-trip", label: t("tuple 왕복 복원", "Round trip restores tuples"), detail: t("request·reply 모두 연결", "Request and reply connect") },
            { value: "forward-only", label: t("forward만 도착", "Forward only"), detail: t("reply 복원 실패", "Reply restoration fails") },
            { value: "blocked-before-external", label: t("external 전 차단", "Blocked before external"), detail: t("request가 service에 도달하지 못함", "Request does not reach the service") },
          ]}
          onChange={changePrediction}
        />
        <button type="button" className="button button-primary" onClick={runFlow}>{t("forward·return NAT flow 실행", "Run forward and return NAT flow")}</button>
      </div>

      <div className={`nat-feedback${evaluation?.passed && prediction === "round-trip" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

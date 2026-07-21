import { useEffect, useMemo, useState } from "react";
import {
  evaluateVethTopology,
  vethTopologyPresets,
  type VethPeerTarget,
  type VethRouteChoice,
  type VethTopologyDraft,
  type VethTopologyFailureReason,
  type VethTopologyMode,
} from "../../features/infrastructure/veth-routing";
import { useLocale } from "../../features/localization/localization";
import {
  InfrastructureChoiceRail,
  InfrastructureStateSwitch,
} from "./InfrastructureInteractionPrimitives";
import { VethTopologyView } from "./VethTopologyView";
import "./veth-routing-interactive.css";

type Prediction = "" | "round-trip-connected" | "forward-only" | "blocked-before-app";
type LocalizedMessage = { ko: string; en: string };
type Completion = { bridge: boolean; router: boolean };

const initialMessage: LocalizedMessage = {
  ko: "bridge scaffold의 peer·link·address를 수리하고 실행 전 왕복 결과를 예측하세요.",
  en: "Repair the bridge scaffold's peers, links, and addresses, then predict the round-trip result.",
};

function message(ko: string, en: string): LocalizedMessage {
  return { ko, en };
}

function scaffoldFor(mode: VethTopologyMode): VethTopologyDraft {
  return { ...vethTopologyPresets[`${mode}-scaffold`] };
}

export function VethTopologyLab({
  onCompletionChange,
}: {
  onCompletionChange: (completion: Completion) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<VethTopologyDraft>(() => scaffoldFor("bridge"));
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<ReturnType<typeof evaluateVethTopology> | null>(null);
  const [completed, setCompleted] = useState<Completion>({ bridge: false, router: false });
  const [feedback, setFeedback] = useState<LocalizedMessage>(initialMessage);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const preview = useMemo(() => evaluateVethTopology(draft), [draft]);

  useEffect(() => setInteractiveReady(true), []);

  useEffect(() => {
    onCompletionChange(completed);
  }, [completed, onCompletionChange]);

  function setModeCompletion(mode: VethTopologyMode, complete: boolean) {
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
      "예측이 바뀌었습니다. 현재 topology의 forward·return path를 다시 실행하세요.",
      "Prediction changed. Re-run the current topology's forward and return paths.",
    ));
  }

  function applyScaffold(mode: VethTopologyMode) {
    setDraft(scaffoldFor(mode));
    invalidate(mode === "bridge"
      ? message("bridge scaffold를 불러왔습니다. 두 host-side peer를 br0에 연결하세요.", "Bridge scaffold loaded. Attach both host-side peers to br0.")
      : message("router scaffold를 불러왔습니다. peer·route·forwarding·return path를 조립하세요.", "Router scaffold loaded. Assemble peers, routes, forwarding, and the return path."), mode);
  }

  function setField<K extends keyof VethTopologyDraft>(field: K, value: VethTopologyDraft[K]) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(message(
      "topology state가 바뀌었습니다. 결과를 다시 예측하고 실행하세요.",
      "Topology state changed. Predict and run the result again.",
    ));
  }

  const reasonLabel = (reason: VethTopologyFailureReason): LocalizedMessage => ({
    connected: message("왕복 path 연결", "round-trip path connected"),
    "veth-peer-missing": message("veth peer가 router namespace에 없음", "veth peer is missing from the router namespace"),
    "interface-down": message("veth endpoint 중 하나가 DOWN", "one veth endpoint is DOWN"),
    "bridge-port-missing": message("host-side peer가 br0 port가 아님", "a host-side peer is not a br0 port"),
    "invalid-address": message("address/prefix plan이 mode와 맞지 않음", "the address and prefix plan does not match the mode"),
    "duplicate-address": message("endpoint address가 중복됨", "endpoint addresses are duplicated"),
    "overlapping-router-subnets": message("router의 두 subnet이 겹침", "the router's two subnets overlap"),
    "gateway-off-link": message("gateway가 선택한 link에서 on-link가 아님", "the gateway is not on-link through the selected link"),
    "no-forward-route": message("client forward route가 없음", "the client forward route is missing"),
    "forwarding-disabled": message("router IP forwarding이 꺼짐", "router IP forwarding is disabled"),
    "no-return-route": message("app return route가 없음", "the app return route is missing"),
    "listener-missing": message("app listener가 닫힘", "the app listener is closed"),
  }[reason]);

  function runTopology() {
    if (!prediction) {
      setFeedback(message("먼저 왕복 결과를 예측하세요.", "Predict the round-trip outcome first."));
      return;
    }
    try {
      const result = evaluateVethTopology(draft);
      setEvaluation(result);
      const passed = result.passed && prediction === "round-trip-connected";
      setModeCompletion(draft.mode, passed);
      if (passed) {
        setFeedback(draft.mode === "bridge"
          ? message("bridge 통과 — 두 veth pair와 br0가 같은 L2 subnet의 request·reply를 전달합니다.", "Bridge passed — both veth pairs and br0 carry request and reply within one Layer 2 subnet.")
          : message("router 통과 — on-link gateway, forwarding, forward route와 return route가 왕복 path를 완성합니다.", "Router passed — on-link gateways, forwarding, the forward route, and the return route complete the round trip."));
      } else if (result.passed) {
        setFeedback(message("topology는 연결됐습니다. forward 도착과 왕복 연결을 구분해 예측을 다시 보세요.", "The topology is connected. Revisit the prediction and distinguish forward arrival from a round-trip connection."));
      } else {
        const reason = reasonLabel(result.reason);
        setFeedback(message(
          `실행 결과: ${reason.ko}. live map의 첫 blocked hop부터 수리하세요.`,
          `Execution result: ${reason.en}. Repair the first blocked hop in the live map.`,
        ));
      }
    } catch {
      setEvaluation(null);
      setModeCompletion(draft.mode, false);
      setFeedback(message("브라우저 topology model을 실행하지 못했습니다. 현재 mode를 초기화하세요.", "The browser topology model failed. Reset the current mode."));
    }
  }

  const routeText = (choice: VethRouteChoice, direction: "forward" | "return") => {
    if (choice === "missing") return t("없음", "missing");
    if (choice === "wrong-gateway") return direction === "forward"
      ? "10.30.0.0/24 via 10.99.0.1"
      : "10.20.0.0/24 via 10.99.0.1";
    return direction === "forward"
      ? "10.30.0.0/24 via 10.20.0.1"
      : "10.20.0.0/24 via 10.30.0.1";
  };
  const commandEvidence = draft.mode === "bridge"
    ? `client$ ip -br addr show eth0 → ${draft.clientAddress} ${draft.clientLinkUp ? "UP" : "DOWN"}\n` +
      `host$ bridge link → client:${draft.clientPeerTarget === "bridge" ? "master br0" : "no master"} · app:${draft.appPeerTarget === "bridge" ? "master br0" : "no master"}\n` +
      `app$ ip -br addr show eth0 → ${draft.appAddress} ${draft.appLinkUp ? "UP" : "DOWN"}`
    : `client$ ip route → ${routeText(draft.clientForwardRoute, "forward")}\n` +
      `router$ ip -br addr → left ${draft.routerClientAddress} · right ${draft.routerAppAddress}\n` +
      `router$ sysctl net.ipv4.ip_forward → ${draft.forwarding ? "1" : "0"}\n` +
      `app$ ip route → ${routeText(draft.appReturnRoute, "return")}`;

  return (
    <section
      className="interactive-lab veth-topology-lab"
      aria-labelledby="veth-topology-lab-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
      data-active-mode={draft.mode}
    >
      <div className="veth-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED LAB · BUILD BOTH PATHS</p>
          <h3 id="veth-topology-lab-title">{t("bridge L2 path와 router L3 round trip 조립", "Assemble a bridge Layer 2 path and a router Layer 3 round trip")}</h3>
          <p>{t("mode마다 live state를 먼저 조립한 뒤 실행 결과를 공개합니다.", "Assemble each mode's live state before revealing the executed result.")}</p>
        </div>
        <strong>{Number(completed.bridge) + Number(completed.router)} / 2</strong>
      </div>

      <div className="veth-mode-toolbar" role="group" aria-label={t("topology mode와 초기화", "Topology mode and reset")}>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "bridge"} onClick={() => applyScaffold("bridge")}>BRIDGE MODE {completed.bridge ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" aria-pressed={draft.mode === "router"} onClick={() => applyScaffold("router")}>ROUTER MODE {completed.router ? "✓" : ""}</button>
        <button type="button" className="button button-ghost" onClick={() => applyScaffold(draft.mode)}>{t("현재 mode 초기화", "Reset current mode")}</button>
      </div>

      <VethTopologyView
        preview={preview}
        evaluation={evaluation}
        controls={(
          <section
            className="veth-topology-inspector"
            role="group"
            aria-label={t("topology 직접 조작 inspector", "Direct topology inspector")}
          >
            <section data-inspector-node="client">
              <header><span>CLIENT ENDPOINT</span><strong>{t("peer·link·address", "Peer, link, and address")}</strong></header>
              <InfrastructureChoiceRail<VethPeerTarget>
                controlId="veth-client-peer-target"
                label={t("client peer를 어디에 꽂을까요?", "Where should the client peer attach?")}
                value={draft.clientPeerTarget}
                compact
                options={peerChoices(t)}
                onChange={(value) => setField("clientPeerTarget", value)}
              />
              <InfrastructureStateSwitch
                controlId="veth-client-link"
                label={t("client veth endpoint", "Client veth endpoints")}
                detail={t("pair 양쪽 admin state", "Admin state on both ends of the pair")}
                checked={draft.clientLinkUp}
                onChange={(value) => setField("clientLinkUp", value)}
                stateOn="UP"
                stateOff="DOWN"
              />
              <InfrastructureChoiceRail<string>
                controlId="veth-client-address"
                label="client eth0"
                value={draft.clientAddress}
                compact
                options={addressChoices(["10.20.0.2/24", "10.20.0.1/24", "10.30.0.2/24"])}
                onChange={(value) => setField("clientAddress", value)}
              />
              {draft.mode === "router" ? <InfrastructureChoiceRail<VethRouteChoice>
                controlId="veth-client-forward-route"
                label={t("client route table에 놓을 forward route", "Forward route to place in the client route table")}
                value={draft.clientForwardRoute}
                compact
                options={routeChoices("forward", t)}
                onChange={(value) => setField("clientForwardRoute", value)}
              /> : null}
            </section>

            <section data-inspector-node="transit">
              <header><span>{draft.mode === "bridge" ? "BR0" : "ROUTER NETNS"}</span><strong>{t("transit 장치", "Transit device")}</strong></header>
              {draft.mode === "router" ? <>
                <InfrastructureChoiceRail<string>
                  controlId="veth-router-client-address"
                  label={t("router client-side address", "Router client-side address")}
                  value={draft.routerClientAddress}
                  compact
                  options={addressChoices(["10.20.0.1/24", "10.99.0.1/24", "10.30.0.1/24"])}
                  onChange={(value) => setField("routerClientAddress", value)}
                />
                <InfrastructureChoiceRail<string>
                  controlId="veth-router-app-address"
                  label={t("router app-side address", "Router app-side address")}
                  value={draft.routerAppAddress}
                  compact
                  options={addressChoices(["10.30.0.1/24", "10.20.1.1/16", "10.99.0.1/24"])}
                  onChange={(value) => setField("routerAppAddress", value)}
                />
                <InfrastructureStateSwitch
                  controlId="veth-router-forwarding"
                  label="net.ipv4.ip_forward"
                  checked={draft.forwarding}
                  onChange={(value) => setField("forwarding", value)}
                  stateOn="1 · FORWARD"
                  stateOff="0 · BLOCK"
                />
              </> : <p className="veth-direct-note">{t("br0 port에 두 host-side peer를 연결하면 같은 L2 domain이 됩니다.", "Attach both host-side peers to br0 to form one Layer 2 domain.")}</p>}
            </section>

            <section data-inspector-node="app">
              <header><span>APP ENDPOINT</span><strong>{t("peer·return·socket", "Peer, return path, and socket")}</strong></header>
              <InfrastructureChoiceRail<VethPeerTarget>
                controlId="veth-app-peer-target"
                label={t("app peer를 어디에 꽂을까요?", "Where should the app peer attach?")}
                value={draft.appPeerTarget}
                compact
                options={peerChoices(t)}
                onChange={(value) => setField("appPeerTarget", value)}
              />
              <InfrastructureStateSwitch
                controlId="veth-app-link"
                label={t("app veth endpoint", "App veth endpoints")}
                detail={t("pair 양쪽 admin state", "Admin state on both ends of the pair")}
                checked={draft.appLinkUp}
                onChange={(value) => setField("appLinkUp", value)}
                stateOn="UP"
                stateOff="DOWN"
              />
              <InfrastructureChoiceRail<string>
                controlId="veth-app-address"
                label="app eth0"
                value={draft.appAddress}
                compact
                options={addressChoices(["10.30.0.2/24", "10.20.0.3/24", "10.20.0.2/24", "10.30.0.3/24"])}
                onChange={(value) => setField("appAddress", value)}
              />
              {draft.mode === "router" ? <InfrastructureChoiceRail<VethRouteChoice>
                controlId="veth-app-return-route"
                label={t("app route table에 놓을 return route", "Return route to place in the app route table")}
                value={draft.appReturnRoute}
                compact
                options={routeChoices("return", t)}
                onChange={(value) => setField("appReturnRoute", value)}
              /> : null}
              <InfrastructureStateSwitch
                controlId="veth-app-listener"
                label="app 0.0.0.0:8080"
                checked={draft.appListenerUp}
                onChange={(value) => setField("appListenerUp", value)}
                stateOn="LISTEN"
                stateOff="CLOSED"
              />
            </section>
          </section>
        )}
      />

      <div className="veth-command-evidence">
        <span>{t("현재 namespace-scoped command evidence", "Current namespace-scoped command evidence")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="veth-run-row">
        <InfrastructureChoiceRail<Exclude<Prediction, "">>
          controlId="veth-prediction"
          label={t("실행 전 왕복 결과를 지도 위 상태로 예측", "Predict the round-trip result from the map state")}
          value={prediction}
          options={[
            { value: "round-trip-connected", label: t("왕복 연결", "Round trip connects"), detail: t("request와 reply 모두 연결", "Both request and reply connect") },
            { value: "forward-only", label: t("편도만 도착", "Forward only"), detail: t("request만 app에 도착", "Only the request reaches app") },
            { value: "blocked-before-app", label: t("app 전 차단", "Blocked before app"), detail: t("request가 app 전에 차단", "Request is blocked before app") },
          ]}
          onChange={changePrediction}
        />
        <button type="button" className="button button-primary" onClick={runTopology}>{t("forward·return path 실행", "Run forward and return paths")}</button>
      </div>

      <div className={`veth-feedback${evaluation?.passed && prediction === "round-trip-connected" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

function peerChoices(t: (ko: string, en: string) => string) {
  return [
    { value: "host", label: t("host에 dangling", "Dangling on host"), eyebrow: "NO OWNER" },
    { value: "bridge", label: "br0 port", eyebrow: "L2" },
    { value: "router", label: "router netns", eyebrow: "L3" },
  ] as const;
}

function addressChoices(addresses: readonly string[]) {
  return addresses.map((address) => ({ value: address, label: address }));
}

function routeChoices(direction: "forward" | "return", t: (ko: string, en: string) => string) {
  const destination = direction === "forward" ? "10.30.0.0/24" : "10.20.0.0/24";
  const gateway = direction === "forward" ? "10.20.0.1" : "10.30.0.1";
  return [
    { value: "missing", label: t("route 없음", "Missing route"), eyebrow: "EMPTY" },
    { value: "correct", label: `${destination} via ${gateway}`, eyebrow: "ON-LINK" },
    { value: "wrong-gateway", label: `${destination} via 10.99.0.1`, eyebrow: "OFF-LINK" },
  ] as const;
}

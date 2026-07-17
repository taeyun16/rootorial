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
import { VethTopologyView } from "./VethTopologyView";

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
      const next = { ...completed, [draft.mode]: passed };
      publishCompletion(next);
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
      publishCompletion({ ...completed, [draft.mode]: false });
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

      <div className="veth-control-grid">
        <fieldset>
          <legend>{t("veth endpoint와 link", "veth endpoints and links")}</legend>
          <label><span>{t("client peer 연결 대상", "Client peer target")}</span><select aria-label={t("client veth peer 연결 대상", "Client veth peer target")} value={draft.clientPeerTarget} onChange={(event) => setField("clientPeerTarget", event.target.value as VethPeerTarget)}><PeerOptions t={t} /></select></label>
          <label><span>{t("app peer 연결 대상", "App peer target")}</span><select aria-label={t("app veth peer 연결 대상", "App veth peer target")} value={draft.appPeerTarget} onChange={(event) => setField("appPeerTarget", event.target.value as VethPeerTarget)}><PeerOptions t={t} /></select></label>
          <label className="veth-check-control"><input type="checkbox" checked={draft.clientLinkUp} onChange={(event) => setField("clientLinkUp", event.target.checked)} />{t("client veth 양 endpoint UP", "Both client-veth endpoints UP")}</label>
          <label className="veth-check-control"><input type="checkbox" checked={draft.appLinkUp} onChange={(event) => setField("appLinkUp", event.target.checked)} />{t("app veth 양 endpoint UP", "Both app-veth endpoints UP")}</label>
        </fieldset>

        <fieldset>
          <legend>{t("endpoint address plan", "Endpoint address plan")}</legend>
          <label><span>client eth0</span><select aria-label={t("client eth0 address", "Client eth0 address")} value={draft.clientAddress} onChange={(event) => setField("clientAddress", event.target.value)}><option>10.20.0.2/24</option><option>10.20.0.1/24</option><option>10.30.0.2/24</option></select></label>
          <label><span>app eth0</span><select aria-label={t("app eth0 address", "App eth0 address")} value={draft.appAddress} onChange={(event) => setField("appAddress", event.target.value)}><option>10.30.0.2/24</option><option>10.20.0.3/24</option><option>10.20.0.2/24</option><option>10.30.0.3/24</option></select></label>
          {draft.mode === "router" ? <>
            <label><span>router left</span><select aria-label={t("router client-side address", "Router client-side address")} value={draft.routerClientAddress} onChange={(event) => setField("routerClientAddress", event.target.value)}><option>10.20.0.1/24</option><option>10.99.0.1/24</option><option>10.30.0.1/24</option></select></label>
            <label><span>router right</span><select aria-label={t("router app-side address", "Router app-side address")} value={draft.routerAppAddress} onChange={(event) => setField("routerAppAddress", event.target.value)}><option>10.30.0.1/24</option><option>10.20.1.1/16</option><option>10.99.0.1/24</option></select></label>
          </> : <p className="veth-derived-state">{t("bridge에는 L3 gateway를 두지 않습니다. 두 endpoint의 connected route가 같은 subnet을 가리켜야 합니다.", "A bridge has no Layer 3 gateway. Both endpoint connected routes must identify the same subnet.")}</p>}
        </fieldset>

        <fieldset>
          <legend>{t("route·forwarding·service", "Routes, forwarding, and service")}</legend>
          {draft.mode === "router" ? <>
            <label><span>{t("client forward route", "Client forward route")}</span><select aria-label={t("client forward route", "Client forward route")} value={draft.clientForwardRoute} onChange={(event) => setField("clientForwardRoute", event.target.value as VethRouteChoice)}><RouteOptions direction="forward" t={t} /></select></label>
            <label><span>{t("app return route", "App return route")}</span><select aria-label={t("app return route", "App return route")} value={draft.appReturnRoute} onChange={(event) => setField("appReturnRoute", event.target.value as VethRouteChoice)}><RouteOptions direction="return" t={t} /></select></label>
            <label className="veth-check-control"><input type="checkbox" checked={draft.forwarding} onChange={(event) => setField("forwarding", event.target.checked)} />router net.ipv4.ip_forward=1</label>
          </> : <p className="veth-derived-state">{t("같은 subnet에서는 connected route와 br0의 L2 forwarding을 사용합니다.", "Within one subnet, connected routes and br0 Layer 2 forwarding carry the path.")}</p>}
          <label className="veth-check-control"><input type="checkbox" checked={draft.appListenerUp} onChange={(event) => setField("appListenerUp", event.target.checked)} />app 0.0.0.0:8080 LISTEN</label>
        </fieldset>
      </div>

      <VethTopologyView preview={preview} evaluation={evaluation} />

      <div className="veth-command-evidence">
        <span>{t("현재 namespace-scoped command evidence", "Current namespace-scoped command evidence")}</span>
        <pre>{commandEvidence}</pre>
      </div>

      <div className="veth-run-row">
        <label><span>{t("실행 전 왕복 결과 예측", "Predict the round-trip result before execution")}</span><select aria-label={t("topology 실행 결과 예측", "Predict topology execution result")} value={prediction} onChange={(event) => { setPrediction(event.target.value as Prediction); setEvaluation(null); }}><option value="">—</option><option value="round-trip-connected">{t("request와 reply 모두 연결", "Both request and reply connect")}</option><option value="forward-only">{t("request만 app에 도착", "Only the request reaches app")}</option><option value="blocked-before-app">{t("request가 app 전에 차단", "The request is blocked before app")}</option></select></label>
        <button type="button" className="button button-primary" onClick={runTopology}>{t("forward·return path 실행", "Run forward and return paths")}</button>
      </div>

      <div className={`veth-feedback${evaluation?.passed && prediction === "round-trip-connected" ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {feedback[locale]}
      </div>
    </section>
  );
}

function PeerOptions({ t }: { t: (ko: string, en: string) => string }) {
  return <>
    <option value="host">{t("host에 dangling", "dangling on host")}</option>
    <option value="bridge">br0 port</option>
    <option value="router">router netns</option>
  </>;
}

function RouteOptions({
  direction,
  t,
}: {
  direction: "forward" | "return";
  t: (ko: string, en: string) => string;
}) {
  const destination = direction === "forward" ? "10.30.0.0/24" : "10.20.0.0/24";
  const gateway = direction === "forward" ? "10.20.0.1" : "10.30.0.1";
  return <>
    <option value="missing">{t("route 없음", "missing route")}</option>
    <option value="correct">{destination} via {gateway}</option>
    <option value="wrong-gateway">{destination} via 10.99.0.1</option>
  </>;
}

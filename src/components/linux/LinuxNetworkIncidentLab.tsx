import { useEffect, useState } from "react";
import {
  evaluateNetworkIncident,
  networkIncidentIds,
  type NetworkIncidentEvaluation,
  type NetworkIncidentId,
  type NetworkIncidentSubmission,
} from "../../features/linux-runtime/networking-from-a-packet";
import { useLocale } from "../../features/localization/localization";
import { ChoiceField } from "../interactive/ChoiceField";
import { InteractiveLab } from "../interactive/InteractiveLab";

type Drafts = Record<NetworkIncidentId, Record<string, string>>;

const emptyDrafts = (): Drafts => ({
  "longest-prefix": {},
  "next-hop-frame": {},
  "ack-gap": {},
  "listener-delivery": {},
});

function optionalNumber(value: string | undefined) {
  if (value === undefined || value.trim() === "") return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : Number.NaN;
}

function optionalBoolean(value: string | undefined) {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

function submissionFor(id: NetworkIncidentId, draft: Record<string, string>): NetworkIncidentSubmission {
  if (id === "longest-prefix") {
    return { routePrefixLength: optionalNumber(draft.routePrefixLength), routeGateway: draft.routeGateway, routeInterfaceId: draft.routeInterfaceId };
  }
  if (id === "next-hop-frame") {
    return { nextHop: draft.nextHop, ethernetDestination: draft.ethernetDestination, ipDestination: draft.ipDestination, outgoingTtl: optionalNumber(draft.outgoingTtl) };
  }
  if (id === "ack-gap") {
    return { ackAfterGap: optionalNumber(draft.ackAfterGap), retransmitSequence: optionalNumber(draft.retransmitSequence), retransmitBytes: optionalNumber(draft.retransmitBytes), finalAck: optionalNumber(draft.finalAck) };
  }
  return {
    networkDelivered: optionalBoolean(draft.networkDelivered),
    listenerMatched: optionalBoolean(draft.listenerMatched),
    listenerResponse: draft.listenerResponse as NetworkIncidentSubmission["listenerResponse"],
    applicationDelivered: optionalBoolean(draft.applicationDelivered),
  };
}

export function LinuxNetworkIncidentLab({ onCompletionChange }: { onCompletionChange: (complete: boolean) => void }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [drafts, setDrafts] = useState<Drafts>(emptyDrafts);
  const [evaluations, setEvaluations] = useState<Partial<Record<NetworkIncidentId, NetworkIncidentEvaluation>>>({});
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => setEngineError(""), [locale]);

  const setField = (id: NetworkIncidentId, field: string, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setEvaluations((current) => ({ ...current, [id]: undefined }));
    onCompletionChange(false);
  };

  const resetAll = () => {
    setDrafts(emptyDrafts());
    setEvaluations({});
    setEngineError("");
    onCompletionChange(false);
  };

  const resetIncident = (id: NetworkIncidentId) => {
    setDrafts((current) => ({ ...current, [id]: {} }));
    setEvaluations((current) => ({ ...current, [id]: undefined }));
    setEngineError("");
    onCompletionChange(false);
  };

  const audit = (id: NetworkIncidentId) => {
    try {
      const evaluation = evaluateNetworkIncident(id, submissionFor(id, drafts[id]));
      const next = { ...evaluations, [id]: evaluation };
      setEvaluations(next);
      setEngineError("");
      onCompletionChange(networkIncidentIds.every((candidate) => next[candidate]?.correct));
    } catch {
      setEngineError(t("네트워크 사건 판정기를 실행하지 못했습니다. 전체 초기화 뒤 외부 네트워크 없이 다시 시도하세요.", "The network incident evaluator failed. Reset all incidents and retry without an external network."));
      onCompletionChange(false);
    }
  };

  const feedbackFor = (id: NetworkIncidentId, evaluation: NetworkIncidentEvaluation) => {
    if (evaluation.correct) {
      const correct: Record<NetworkIncidentId, [string, string]> = {
        "longest-prefix": ["/25 중 metric 100인 route를 골랐습니다. declaration order가 아니라 longest prefix 뒤 metric이 결정합니다.", "You selected the metric-100 route among /25 matches. Longest prefix, then metric—not declaration order—determines the route."],
        "next-hop-frame": ["router는 gateway MAC으로 새 frame을 만들고 endpoint IP를 보존하며 TTL만 2로 줄였습니다.", "The router targets the gateway MAC in a new frame, preserves the endpoint IP, and decrements TTL to 2."],
        "ack-gap": ["ACK 5601이 gap에서 멈춘 뒤 [5601,6201)을 재전송해 buffered tail까지 ACK 6501로 누적했습니다.", "ACK 5601 stalled at the gap; retransmitting [5601,6201) cumulatively acknowledged the buffered tail through ACK 6501."],
        "listener-delivery": ["IP 전달 성공과 port 8443 listener 부재를 분리했습니다. TCP는 RST를 보내며 accept와 application delivery는 일어나지 않습니다.", "You separated successful IP delivery from the missing port-8443 listener. TCP returns RST; neither accept nor application delivery occurs."],
      };
      return t(...correct[id]);
    }
    const errors: Record<string, [string, string]> = {
      "route-prefix": ["목적지 203.0.113.20과 일치하는 가장 긴 prefix는 /25입니다.", "The longest prefix matching destination 203.0.113.20 is /25."],
      "route-gateway": ["같은 /25끼리는 낮은 metric 100이 이겨 gateway 10.0.0.252가 됩니다.", "Among equal /25 routes, lower metric 100 wins, selecting gateway 10.0.0.252."],
      "route-interface": ["선택 route의 egress interface는 eth0입니다.", "The selected route uses egress interface eth0."],
      "next-hop": ["원격 subnet으로 나가는 다음 홉은 같은 link의 gateway 192.0.2.1입니다.", "The next hop toward the remote subnet is gateway 192.0.2.1 on the local link."],
      "ethernet-destination": ["첫 frame의 destination은 gateway neighbor MAC 02:00:00:00:00:21입니다.", "The first frame targets gateway neighbor MAC 02:00:00:00:00:21."],
      "ip-destination": ["no-NAT fixture이므로 IP destination은 endpoint 203.0.113.20으로 남습니다.", "This no-NAT fixture retains endpoint 203.0.113.20 as its IP destination."],
      "outgoing-ttl": ["router가 TTL 3을 하나 줄여 outgoing TTL은 2입니다.", "The router decrements TTL 3 once, producing outgoing TTL 2."],
      "ack-after-gap": ["[5601,6201)이 비어 있으므로 뒤 range가 와도 next expected ACK는 5601입니다.", "Because [5601,6201) is missing, the next expected ACK remains 5601 even after the later range arrives."],
      "retransmit-sequence": ["재전송은 첫 missing byte 5601에서 시작합니다.", "Retransmission starts at the first missing byte, 5601."],
      "retransmit-bytes": ["missing range [5601,6201)의 길이는 600바이트입니다.", "The missing range [5601,6201) is 600 bytes long."],
      "final-ack": ["gap이 채워지면 buffered [6201,6501)도 연속이 되어 final ACK는 6501입니다.", "Once the gap is filled, buffered [6201,6501) becomes contiguous, yielding final ACK 6501."],
      "network-delivered": ["이 사건은 IP packet이 server까지 도착한 뒤의 TCP demultiplex 실패입니다.", "In this incident, the IP packet reached the server before TCP demultiplexing failed."],
      "listener-matched": ["listener는 443뿐이고 SYN destination은 8443이므로 일치하지 않습니다.", "The only listener is on 443 while the SYN targets 8443, so no listener matches."],
      "listener-response": ["도달 가능한 host의 닫힌 TCP port는 이 fixture에서 RST로 응답합니다.", "In this fixture, a reachable host responds with RST for a closed TCP port."],
      "application-delivery": ["listener match와 accepted socket이 없으므로 application delivery도 false입니다.", "Without a listener match or accepted socket, application delivery is false."],
    };
    return evaluation.errors.map((error) => t(...(errors[error] ?? [error, error]))).join(" ");
  };

  const completed = networkIncidentIds.filter((id) => evaluations[id]?.correct).length;

  return (
    <InteractiveLab
      kicker={t("별도 활동 · NETWORK INCIDENTS", "SEPARATE ACTIVITY · NETWORK INCIDENTS")}
      title={t("어느 경계가 실패했는지 네 사건을 수리하세요", "Repair the failed boundary in four incidents")}
      description={t("각 카드는 route, frame, TCP byte range 또는 listener state를 같은 순수 모델로 다시 계산합니다. 모든 사건은 독립 reset과 field별 피드백을 제공합니다.", "Each card recomputes route, frame, TCP byte-range, or listener state through the same pure model. Every incident has an independent reset and field-specific feedback.")}
      className="network-incident-lab"
      actions={<button type="button" className="button button-secondary" onClick={resetAll}>{t("모든 사건 초기화", "Reset all incidents")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="network-runtime-fallback" role="alert"><p>{engineError}</p><button type="button" className="button button-secondary" onClick={resetAll}>{t("판정기 다시 시작", "Restart evaluator")}</button></div> : null}
      <div className="network-incident-progress" role="group" aria-label={t("수리한 사건 진행률", "Repaired incident progress")}><div><span>{t("수리한 경계", "REPAIRED BOUNDARIES")}</span><p>{t("route · frame · byte stream · listener", "route · frame · byte stream · listener")}</p></div><strong>{completed} / {networkIncidentIds.length}</strong></div>
      <div className="network-incident-grid">
        <fieldset className={`network-incident-card ${evaluations["longest-prefix"]?.correct ? "is-correct" : evaluations["longest-prefix"] ? "is-incorrect" : ""}`}>
          <legend>01 · {t("default가 이긴 route 오진", "Default-route misdiagnosis")}</legend>
          <p>{t("dst 203.0.113.20 · /0, /24, 두 /25(metric 200·100)가 동시에 존재", "dst 203.0.113.20 · /0, /24, and two /25 routes (metrics 200 and 100) coexist")}</p>
          <pre aria-label={t("route 사건 route table", "Route incident route table")}>{"0.0.0.0/0       via 10.0.0.1   metric 100\n203.0.113.0/24  via 10.0.0.254 metric 50\n203.0.113.0/25  via 10.0.0.253 metric 200\n203.0.113.0/25  via 10.0.0.252 metric 100\nall dev eth0"}</pre>
          <label><span>prefix length</span><input type="number" aria-label={t("route 사건 prefix 길이", "Route incident prefix length")} value={drafts["longest-prefix"].routePrefixLength ?? ""} onChange={(event) => setField("longest-prefix", "routePrefixLength", event.target.value)} /></label>
          <ChoiceField label="gateway" value={drafts["longest-prefix"].routeGateway ?? ""} onValueChange={(value) => setField("longest-prefix", "routeGateway", value)} options={[{ value: "", label: "—" }, { value: "10.0.0.1", label: "10.0.0.1" }, { value: "10.0.0.253", label: "10.0.0.253" }, { value: "10.0.0.252", label: "10.0.0.252" }]} />
          <ChoiceField label="interface" value={drafts["longest-prefix"].routeInterfaceId ?? ""} onValueChange={(value) => setField("longest-prefix", "routeInterfaceId", value)} options={[{ value: "", label: "—" }, { value: "eth0", label: "eth0" }, { value: "lo", label: "lo" }]} />
          <div className="network-incident-actions"><button type="button" className="button button-primary" onClick={() => audit("longest-prefix")}>{t("route 계산·진단", "Compute route and diagnose")}</button><button type="button" className="button button-ghost" aria-label={t("route 사건 카드 초기화", "Reset route incident card")} onClick={() => resetIncident("longest-prefix")}>{t("카드 초기화", "Reset card")}</button></div>
          {evaluations["longest-prefix"] ? <p className="network-incident-feedback" role="status" aria-live="polite">{feedbackFor("longest-prefix", evaluations["longest-prefix"])}</p> : null}
        </fieldset>

        <fieldset className={`network-incident-card ${evaluations["next-hop-frame"]?.correct ? "is-correct" : evaluations["next-hop-frame"] ? "is-incorrect" : ""}`}>
          <legend>02 · {t("remote MAC을 찾은 frame 오진", "Remote-MAC frame misdiagnosis")}</legend>
          <p>{t("router input TTL 3 · route 203.0.113.0/24 via 192.0.2.1 on wan0", "router input TTL 3 · route 203.0.113.0/24 via 192.0.2.1 on wan0")}</p>
          <pre aria-label={t("frame 사건 neighbor table", "Frame incident neighbor table")}>{"route: 203.0.113.0/24 via 192.0.2.1 dev wan0\nneighbor: 192.0.2.1 → 02:00:00:00:00:21\npacket: 10.0.0.10 → 203.0.113.20 · TTL 3"}</pre>
          <ChoiceField label="next hop" value={drafts["next-hop-frame"].nextHop ?? ""} onValueChange={(value) => setField("next-hop-frame", "nextHop", value)} options={[{ value: "", label: "—" }, { value: "192.0.2.1", label: "192.0.2.1" }, { value: "203.0.113.20", label: "203.0.113.20" }]} />
          <ChoiceField label="Ethernet dst" value={drafts["next-hop-frame"].ethernetDestination ?? ""} onValueChange={(value) => setField("next-hop-frame", "ethernetDestination", value)} options={[{ value: "", label: "—" }, { value: "02:00:00:00:00:21", label: "02:00:00:00:00:21" }, { value: "02:00:00:00:00:20", label: "02:00:00:00:00:20" }]} />
          <ChoiceField label="IPv4 dst" value={drafts["next-hop-frame"].ipDestination ?? ""} onValueChange={(value) => setField("next-hop-frame", "ipDestination", value)} options={[{ value: "", label: "—" }, { value: "203.0.113.20", label: "203.0.113.20" }, { value: "192.0.2.1", label: "192.0.2.1" }]} />
          <label><span>outgoing TTL</span><input type="number" aria-label={t("frame 사건 outgoing TTL", "Frame incident outgoing TTL")} value={drafts["next-hop-frame"].outgoingTtl ?? ""} onChange={(event) => setField("next-hop-frame", "outgoingTtl", event.target.value)} /></label>
          <div className="network-incident-actions"><button type="button" className="button button-primary" onClick={() => audit("next-hop-frame")}>{t("frame 전달·진단", "Forward frame and diagnose")}</button><button type="button" className="button button-ghost" aria-label={t("frame 사건 카드 초기화", "Reset frame incident card")} onClick={() => resetIncident("next-hop-frame")}>{t("카드 초기화", "Reset card")}</button></div>
          {evaluations["next-hop-frame"] ? <p className="network-incident-feedback" role="status" aria-live="polite">{feedbackFor("next-hop-frame", evaluations["next-hop-frame"])}</p> : null}
        </fieldset>

        <fieldset className={`network-incident-card ${evaluations["ack-gap"]?.correct ? "is-correct" : evaluations["ack-gap"] ? "is-incorrect" : ""}`}>
          <legend>03 · {t("out-of-order byte를 ACK한 오진", "Out-of-order ACK misdiagnosis")}</legend>
          <p>{t("[5001,5601) 도착 · [5601,6201) 유실 · [6201,6501) 먼저 도착", "[5001,5601) arrives · [5601,6201) lost · [6201,6501) arrives early")}</p>
          <label><span>ACK after gap</span><input type="number" aria-label={t("ACK gap 사건 gap 뒤 ACK", "ACK-gap incident ACK after gap")} value={drafts["ack-gap"].ackAfterGap ?? ""} onChange={(event) => setField("ack-gap", "ackAfterGap", event.target.value)} /></label>
          <label><span>retransmit seq</span><input type="number" aria-label={t("ACK gap 사건 재전송 sequence", "ACK-gap incident retransmission sequence")} value={drafts["ack-gap"].retransmitSequence ?? ""} onChange={(event) => setField("ack-gap", "retransmitSequence", event.target.value)} /></label>
          <label><span>retransmit bytes</span><input type="number" aria-label={t("ACK gap 사건 재전송 byte", "ACK-gap incident retransmission bytes")} value={drafts["ack-gap"].retransmitBytes ?? ""} onChange={(event) => setField("ack-gap", "retransmitBytes", event.target.value)} /></label>
          <label><span>final ACK</span><input type="number" aria-label={t("ACK gap 사건 최종 ACK", "ACK-gap incident final ACK")} value={drafts["ack-gap"].finalAck ?? ""} onChange={(event) => setField("ack-gap", "finalAck", event.target.value)} /></label>
          <div className="network-incident-actions"><button type="button" className="button button-primary" onClick={() => audit("ack-gap")}>{t("byte stream 계산·진단", "Compute byte stream and diagnose")}</button><button type="button" className="button button-ghost" aria-label={t("ACK gap 사건 카드 초기화", "Reset ACK-gap incident card")} onClick={() => resetIncident("ack-gap")}>{t("카드 초기화", "Reset card")}</button></div>
          {evaluations["ack-gap"] ? <p className="network-incident-feedback" role="status" aria-live="polite">{feedbackFor("ack-gap", evaluations["ack-gap"])}</p> : null}
        </fieldset>

        <fieldset className={`network-incident-card ${evaluations["listener-delivery"]?.correct ? "is-correct" : evaluations["listener-delivery"] ? "is-incorrect" : ""}`}>
          <legend>04 · {t("IP 전달을 service 성공으로 본 오진", "IP delivery mistaken for service success")}</legend>
          <p>{t("IP packet은 server 도착 · SYN dst 8443 · listener는 0.0.0.0:443뿐 · recv 미실행", "IP packet reached server · SYN dst 8443 · only listener is 0.0.0.0:443 · recv not run")}</p>
          <ChoiceField label={t("IP packet 전달", "Network delivered")} value={drafts["listener-delivery"].networkDelivered ?? ""} onValueChange={(value) => setField("listener-delivery", "networkDelivered", value)} options={[{ value: "", label: "—" }, { value: "true", label: t("예", "Yes") }, { value: "false", label: t("아니요", "No") }]} />
          <ChoiceField label={t("listener 일치", "Listener matched")} value={drafts["listener-delivery"].listenerMatched ?? ""} onValueChange={(value) => setField("listener-delivery", "listenerMatched", value)} options={[{ value: "", label: "—" }, { value: "true", label: t("예", "Yes") }, { value: "false", label: t("아니요", "No") }]} />
          <ChoiceField label="TCP response" value={drafts["listener-delivery"].listenerResponse ?? ""} onValueChange={(value) => setField("listener-delivery", "listenerResponse", value)} options={[{ value: "", label: "—" }, { value: "syn-ack", label: "SYN-ACK" }, { value: "rst", label: "RST" }, { value: "none", label: "none" }]} />
          <ChoiceField label={t("application byte 인수", "Application received bytes")} value={drafts["listener-delivery"].applicationDelivered ?? ""} onValueChange={(value) => setField("listener-delivery", "applicationDelivered", value)} options={[{ value: "", label: "—" }, { value: "true", label: t("예", "Yes") }, { value: "false", label: t("아니요", "No") }]} />
          <div className="network-incident-actions"><button type="button" className="button button-primary" onClick={() => audit("listener-delivery")}>{t("demux·delivery 진단", "Diagnose demux and delivery")}</button><button type="button" className="button button-ghost" aria-label={t("listener 사건 카드 초기화", "Reset listener incident card")} onClick={() => resetIncident("listener-delivery")}>{t("카드 초기화", "Reset card")}</button></div>
          {evaluations["listener-delivery"] ? <p className="network-incident-feedback" role="status" aria-live="polite">{feedbackFor("listener-delivery", evaluations["listener-delivery"])}</p> : null}
        </fieldset>
      </div>
      {completed === networkIncidentIds.length ? <p className="network-incidents-mastered">{t("사건 진단 완료 — route, link frame, TCP gap과 listener/application 경계를 각각 상태로 수리했습니다.", "Incident diagnosis complete — you repaired route, link-frame, TCP-gap, and listener/application boundaries as state.")}</p> : null}
      <noscript><p>{t("JavaScript 없이도 위 사건 자료를 읽을 수 있습니다. 상호작용을 켜면 각 경계를 의미론적으로 판정할 수 있습니다.", "The incident evidence remains readable without JavaScript. Enable interaction to grade each boundary semantically.")}</p></noscript>
    </InteractiveLab>
  );
}

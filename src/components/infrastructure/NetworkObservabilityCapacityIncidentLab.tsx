import { useEffect, useState } from "react";
import {
  evaluateObservabilityIncident,
  observabilityIncidentFixtures,
  observabilityIncidentIds,
  type ObservabilityIncidentEvaluation,
  type ObservabilityIncidentId,
  type ObservabilityIncidentRepair,
} from "../../features/infrastructure/network-observability-capacity";
import { useLocale } from "../../features/localization/localization";

export function NetworkObservabilityCapacityIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<ObservabilityIncidentId, ObservabilityIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<ObservabilityIncidentId, ObservabilityIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<ObservabilityIncidentId[]>([]);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [runtimeFailed, setRuntimeFailed] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(
    () => onCompletionChange(completed.length === observabilityIncidentIds.length),
    [completed, onCompletionChange],
  );

  const copy: Record<ObservabilityIncidentId, {
    number: string;
    title: string;
    evidence: string;
    prompt: string;
  }> = {
    "wrong-namespace-ss": {
      number: "01",
      title: t("host ss가 비어 app listener도 없다고 결론", "Concluding the app listener is absent because host ss is empty"),
      evidence: "host$ ss -lnt → no :8080\napp log → listen 0.0.0.0:8080 ok",
      prompt: t("socket object를 소유한 network view에서 증거를 다시 수집하세요.", "Collect the evidence again from the network view that owns the socket object."),
    },
    "absolute-drop-counter": {
      number: "02",
      title: t("누적 drop 20,000을 현재 사건의 drop으로 해석", "Treating an accumulated 20,000-drop counter as the current incident"),
      evidence: "12:00 edge egress drops=20000\nincident window=12:00–12:01",
      prompt: t("누적 크기가 아니라 현재 window의 변화를 입증하세요.", "Establish change during the current window rather than the accumulated magnitude."),
    },
    "single-point-capture": {
      number: "03",
      title: t("client capture에 reply가 없어 app을 바로 비난", "Blaming the app because no reply appears in a client-side capture"),
      evidence: "client$ tcpdump flow=request-17 → no reply\nedge/app capture → not collected",
      prompt: t("같은 flow와 window를 인접 boundary에서 비교하세요.", "Compare the same flow and window at adjacent boundaries."),
    },
    "queue-hides-overload": {
      number: "04",
      title: t("지속 bandwidth 초과를 더 큰 queue로 숨김", "Masking sustained bandwidth overload with a larger queue"),
      evidence: "offered=800 pps · drain=600 pps · 30 s\nqueue=64 packets · queue wait keeps rising",
      prompt: t("buffer가 아니라 지속 drain capacity를 수리하세요.", "Repair sustained drain capacity rather than only the buffer."),
    },
  };

  const repairLabel = (repair: ObservabilityIncidentRepair) => ({
    "inspect-app-sockets": t("app namespace에서 ss -lnt 실행", "run ss -lnt inside the app namespace"),
    "repeat-host-sockets": t("host ss -lnt만 반복", "repeat only host ss -lnt"),
    "compare-window-delta": t("같은 interface의 시작·끝 counter delta 비교", "compare start/end counter deltas on the same interface"),
    "reset-counter-before-window": t("사건 도중 counter를 reset하고 절대값 사용", "reset the counter during the incident and use the absolute value"),
    "dual-capture-same-window": t("edge egress와 app ingress에서 같은 flow/window capture", "capture the same flow/window at edge egress and app ingress"),
    "extend-client-capture": t("client capture 시간만 무제한 연장", "extend only the client capture indefinitely"),
    "increase-drain-service": t("drain/service capacity를 offered load 이상으로 확장", "increase drain/service capacity to at least the offered load"),
    "only-enlarge-queue": t("queue만 크게 확장", "only enlarge the queue"),
  }[repair]);

  const reasonLabel = (result: ObservabilityIncidentEvaluation) => ({
    "scoped-socket-evidence": t("app socket table에서 listener를 확인했습니다.", "The listener is confirmed in the app socket table."),
    "counter-delta-established": t("같은 window의 counter delta가 현재 drop을 입증합니다.", "The counter delta from the same window establishes current drops."),
    "capture-boundary-compared": t("인접 capture가 packet의 최초 부재 boundary를 좁혔습니다.", "Adjacent captures narrow the first boundary where the packet disappears."),
    "sustained-capacity-repaired": t("지속 drain capacity가 offered load를 처리합니다.", "Sustained drain capacity now handles the offered load."),
    "wrong-observation-scope": t("host socket table은 app listener의 부재를 증명하지 않습니다.", "The host socket table does not prove absence of the app listener."),
    "absolute-counter-only": t("절대 counter만으로 현재 사건의 증가량을 알 수 없습니다.", "An absolute counter alone cannot establish the increase during this incident."),
    "capture-claim-too-broad": t("한 capture point의 부재를 전체 path의 부재로 확대했습니다.", "Absence at one capture point was expanded to the whole path."),
    "queue-does-not-add-throughput": t("더 큰 queue는 지속 throughput을 늘리지 않고 delay만 키울 수 있습니다.", "A larger queue does not add sustained throughput and may only increase delay."),
  }[result.reason]);

  function chooseRepair(incidentId: ObservabilityIncidentId, repair: ObservabilityIncidentRepair) {
    setRuntimeFailed(false);
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => {
      return current.filter((candidate) => candidate !== incidentId);
    });
  }

  function runIncident(incidentId: ObservabilityIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateObservabilityIncident(incidentId, repair);
      setResults((current) => ({ ...current, [incidentId]: result }));
      setCompleted((current) => {
        return result.passed
          ? [...new Set([...current, incidentId])]
          : current.filter((candidate) => candidate !== incidentId);
      });
    } catch {
      setRuntimeFailed(true);
      setResults((current) => ({ ...current, [incidentId]: undefined }));
      setCompleted((current) => {
        return current.filter((candidate) => candidate !== incidentId);
      });
    }
  }

  function resetAll() {
    setRepairs({});
    setResults({});
    setCompleted([]);
    setRuntimeFailed(false);
  }

  return (
    <section
      className="network-observability-incident-lab"
      aria-labelledby="network-observability-incidents-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
    >
      <header className="network-observability-incident-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · OBSERVABILITY INCIDENTS</p>
          <h3 id="network-observability-incidents-title">{t("네 증거·용량 사건을 최초 실패 invariant로 수리", "Repair four evidence and capacity incidents at the first failed invariant")}</h3>
        </div>
        <strong>{completed.length} / {observabilityIncidentIds.length}</strong>
      </header>

      {runtimeFailed ? <div role="alert" className="network-observability-runtime-alert">{t("결정론적 사건 모델을 실행하지 못했습니다. 활동을 초기화하세요.", "The deterministic incident model could not run. Reset the activity.")}</div> : null}

      <div className="network-observability-incident-grid">
        {observabilityIncidentIds.map((incidentId) => {
          const fixture = observabilityIncidentFixtures[incidentId];
          const result = results[incidentId];
          const item = copy[incidentId];
          return (
            <article className="network-observability-incident-card" data-incident-id={incidentId} key={incidentId}>
              <span>{item.number}</span>
              <h4>{item.title}</h4>
              <pre>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <label>
                <span>{t("최소 수리 선택", "Choose the minimal repair")}</span>
                <select
                  aria-label={t(`${item.number} 사건 수리`, `Incident ${item.number} repair`)}
                  value={repairs[incidentId] ?? ""}
                  onChange={(event) => chooseRepair(incidentId, event.target.value as ObservabilityIncidentRepair)}
                >
                  <option value="">—</option>
                  {fixture.repairOptions.map((repair) => <option value={repair} key={repair}>{repairLabel(repair)}</option>)}
                </select>
              </label>
              <button
                type="button"
                className="button button-secondary"
                disabled={!repairs[incidentId]}
                onClick={() => runIncident(incidentId)}
              >
                {t("증거·용량 재실행", "Re-run evidence and capacity")}
              </button>
              <div className={`network-observability-incident-feedback${result ? result.passed ? " is-success" : " is-error" : ""}`} role="status" aria-live="polite">
                {result ? reasonLabel(result) : t("수리를 선택한 뒤 같은 fixture를 다시 실행하세요.", "Choose a repair, then re-run the same fixture.")}
              </div>
            </article>
          );
        })}
      </div>

      <button type="button" className="button button-ghost" onClick={resetAll}>{t("네 사건 초기화", "Reset four incidents")}</button>
    </section>
  );
}

import { useEffect, useMemo, useState } from "react";
import {
  evaluateNamespaceTopology,
  namespaceTopologyPresets,
  networkNamespaceIds,
  type NamespaceTopologyDraft,
  type NamespaceTopologyEvaluation,
  type NetworkNamespaceId,
} from "../../features/infrastructure/network-namespaces";
import { useLocale } from "../../features/localization/localization";
import { NetworkNamespaceBoundaryView } from "./NetworkNamespaceBoundaryView";

type Prediction = "" | "both-local-only" | "host-can-reach" | "no-local-health";
type LocalizedMessage = { ko: string; en: string };

const initialDraft: NamespaceTopologyDraft = {
  ...namespaceTopologyPresets.collapsed,
};
const initialMessage: LocalizedMessage = {
  ko: "예측을 고르고 process·listener·loopback 배치를 설계한 뒤 실행하세요.",
  en: "Choose a prediction, design process, listener, and loopback placement, then run it.",
};

function localizedMessage(ko: string, en: string): LocalizedMessage {
  return { ko, en };
}

export function NetworkNamespaceTopologyLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [draft, setDraft] = useState<NamespaceTopologyDraft>(initialDraft);
  const [prediction, setPrediction] = useState<Prediction>("");
  const [evaluation, setEvaluation] = useState<NamespaceTopologyEvaluation | null>(null);
  const [message, setMessage] = useState<LocalizedMessage>(initialMessage);
  const [complete, setComplete] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  const preview = useMemo(() => evaluateNamespaceTopology(draft), [draft]);

  function invalidate(nextMessage?: LocalizedMessage) {
    setEvaluation(null);
    setComplete(false);
    onCompletionChange(false);
    if (nextMessage) setMessage(nextMessage);
  }

  function setNamespaceField(
    field: keyof NamespaceTopologyDraft,
    value: NetworkNamespaceId,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(localizedMessage("배치가 바뀌었습니다. 결과를 다시 예측·실행하세요.", "Placement changed. Predict and run the result again."));
  }

  function setBooleanField(
    field: "appLoopbackUp" | "dataLoopbackUp",
    value: boolean,
  ) {
    setDraft((current) => ({ ...current, [field]: value }));
    invalidate(localizedMessage("interface 상태가 바뀌었습니다. 결과를 다시 실행하세요.", "Interface state changed. Run the result again."));
  }

  function applyPreset(id: "collapsed" | "isolated-but-down") {
    setDraft({ ...namespaceTopologyPresets[id] });
    setPrediction("");
    invalidate(id === "collapsed"
      ? localizedMessage("모든 workload가 host에 겹친 출발점입니다. 격리 경계를 설계하세요.", "Every workload starts collapsed onto the host. Design isolation boundaries.")
      : localizedMessage("service는 격리됐지만 두 lo가 down입니다. local health가 왜 실패하는지 수리하세요.", "Services are isolated, but both lo devices are down. Repair the local health failure."));
  }

  function reset() {
    setDraft({ ...initialDraft });
    setPrediction("");
    invalidate(localizedMessage("초기화했습니다. host에 겹친 workload를 다시 분리하세요.", "Reset. Separate the workloads collapsed on the host again."));
  }

  function runDesign() {
    if (!prediction) {
      setMessage(localizedMessage("먼저 최종 reachability를 예측하세요.", "Predict the final reachability first."));
      return;
    }
    try {
      const result = evaluateNamespaceTopology(draft);
      const passed = result.passed && prediction === "both-local-only";
      setEvaluation(result);
      setComplete(passed);
      onCompletionChange(passed);
      if (passed) {
        setMessage(localizedMessage(
          "설계 통과 — app·data local health는 각자의 lo와 socket table에서 성공하고, host localhost와 app localhost:5432 조회에는 대상 listener가 없습니다.",
          "Design passed — app and data local health succeed in their own lo devices and socket tables; host localhost and app localhost:5432 contain no target listener.",
        ));
        return;
      }
      if (prediction !== "both-local-only") {
        setMessage(localizedMessage(
          "예측을 다시 보세요. 이 장의 목표는 두 service의 namespace-local health만 성공하고 다른 namespace의 localhost 조회는 실패하는 상태입니다.",
          "Revisit the prediction. This chapter targets namespace-local health for both services while localhost lookups from other namespaces fail.",
        ));
      } else if (!result.checks["separate-service-boundaries"]) {
        setMessage(localizedMessage(
          "app process·listener는 app에, data process·listener는 data에 두어 이름과 소유 경계를 일치시키세요.",
          "Place the app process and listener in app, and the data process and listener in data, so names match their ownership boundaries.",
        ));
      } else if (!result.checks["app-local-health"] || !result.checks["data-local-health"]) {
        setMessage(localizedMessage(
          "local health probe는 target listener와 같은 namespace에 있어야 하며 그 namespace의 lo가 UP이어야 합니다.",
          "A local health probe must share the target listener's namespace, and that namespace's lo must be UP.",
        ));
      } else if (!result.checks["host-localhost-empty"] || !result.checks["app-localhost-cannot-see-data"]) {
        setMessage(localizedMessage(
          "host localhost 또는 app localhost:5432에서 다른 namespace의 listener가 보입니다. process·listener 소유권을 다시 분리하세요.",
          "A listener from another namespace appears in host localhost or app localhost:5432. Separate process and listener ownership again.",
        ));
      }
    } catch {
      setEvaluation(null);
      setComplete(false);
      onCompletionChange(false);
      setMessage(localizedMessage(
        "브라우저 모델 실행에 실패했습니다. 초기화 후 다시 시도하세요. 설명과 선택 Linux 관찰은 계속 사용할 수 있습니다.",
        "The browser model failed to run. Reset and try again; the explanation and optional Linux observation remain available.",
      ));
    }
  }

  const namespaceLabel = (namespaceId: NetworkNamespaceId) => namespaceId === "host"
    ? "host"
    : `${namespaceId} netns`;
  return (
    <section
      className="interactive-lab namespace-lab namespace-topology-lab"
      aria-labelledby="namespace-topology-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
    >
      <div className="namespace-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED LAB · DESIGN THE BOUNDARY</p>
          <h3 id="namespace-topology-title">{t("namespace별 local health와 격리 행렬 설계", "Design namespace-local health and the isolation matrix")}</h3>
          <p>{t(
            "app:8080과 data:5432는 각자의 health probe에만 열고, host와 service 사이에는 아직 veth path를 만들지 마세요.",
            "Expose app:8080 and data:5432 only to their local health probes; do not create a veth path from the host or between services yet.",
          )}</p>
        </div>
        <strong>{complete ? t("설계 통과", "DESIGN PASSED") : t("설계 중", "DESIGNING")}</strong>
      </div>

      <div className="namespace-lab-toolbar" role="group" aria-label={t("namespace 설계 preset과 초기화", "Namespace design presets and reset")}>
        <button type="button" className="button button-ghost" onClick={() => applyPreset("collapsed")}>{t("host에 겹친 상태", "Collapsed on host")}</button>
        <button type="button" className="button button-ghost" onClick={() => applyPreset("isolated-but-down")}>{t("격리됨 · lo down", "Isolated · lo down")}</button>
        <button type="button" className="button button-ghost" onClick={reset}>{t("전체 초기화", "Reset all")}</button>
      </div>

      <label>
        <span>{t("실행 전 reachability 예측", "Predict reachability before execution")}</span>
        <select
          aria-label={t("namespace 설계 결과 예측", "Predict namespace design result")}
          value={prediction}
          onChange={(event) => {
            setPrediction(event.target.value as Prediction);
            invalidate();
          }}
        >
          <option value="">—</option>
          <option value="both-local-only">{t("두 local health만 성공, 다른 localhost 조회는 실패", "Only both local health checks succeed; other localhost lookups fail")}</option>
          <option value="host-can-reach">{t("host가 두 localhost listener에 모두 도달", "The host reaches both localhost listeners")}</option>
          <option value="no-local-health">{t("격리하면 local health도 항상 실패", "Isolation always breaks local health")}</option>
        </select>
      </label>

      <div className="namespace-design-grid">
        <ServiceBoundaryEditor
          title="APP · 127.0.0.1:8080"
          processValue={draft.appProcessNamespace}
          probeValue={draft.appProbeNamespace}
          listenerValue={draft.appListenerNamespace}
          onProcess={(value) => setNamespaceField("appProcessNamespace", value)}
          onProbe={(value) => setNamespaceField("appProbeNamespace", value)}
          onListener={(value) => setNamespaceField("appListenerNamespace", value)}
          t={t}
        />
        <ServiceBoundaryEditor
          title="DATA · 127.0.0.1:5432"
          processValue={draft.dataProcessNamespace}
          probeValue={draft.dataProbeNamespace}
          listenerValue={draft.dataListenerNamespace}
          onProcess={(value) => setNamespaceField("dataProcessNamespace", value)}
          onProbe={(value) => setNamespaceField("dataProbeNamespace", value)}
          onListener={(value) => setNamespaceField("dataListenerNamespace", value)}
          t={t}
        />
        <fieldset>
          <legend>{t("설계 계약", "Design contract")}</legend>
          <p>{t("같은 namespace", "SAME NAMESPACE")}: service process · listener · local health probe</p>
          <p>{t("서로 다른 namespace", "DIFFERENT NAMESPACES")}: app · data · host</p>
          <p>{t("interface 상태", "INTERFACE STATE")}: app lo UP · data lo UP</p>
          <p>{t("아직 없는 것", "NOT BUILT YET")}: veth · bridge · router · NAT</p>
        </fieldset>
      </div>

      <div className="namespace-lab-grid" role="group" aria-label={t("namespace별 현재 network view", "Current network view per namespace")}>
        {networkNamespaceIds.map((namespaceId) => {
          const processes = preview.machine.processes.filter((candidate) => candidate.namespaceId === namespaceId);
          const listeners = preview.machine.listeners.filter((candidate) => candidate.namespaceId === namespaceId);
          const loopback = preview.machine.interfaces.find((candidate) => candidate.namespaceId === namespaceId && candidate.kind === "loopback");
          return (
            <article className="namespace-state-card" key={namespaceId}>
              <span>{namespaceLabel(namespaceId)}</span>
              <strong>lo {loopback?.up ? "UP" : "DOWN"}</strong>
              {namespaceId !== "host" ? (
                <label className="namespace-loopback-control">
                  <input
                    type="checkbox"
                    checked={namespaceId === "app" ? draft.appLoopbackUp : draft.dataLoopbackUp}
                    onChange={(event) => setBooleanField(
                      namespaceId === "app" ? "appLoopbackUp" : "dataLoopbackUp",
                      event.target.checked,
                    )}
                  />
                  {t(`${namespaceId} lo admin state`, `${namespaceId} lo admin state`)}
                </label>
              ) : null}
              <ul>
                <li>{t("process", "processes")}: {processes.map(({ label }) => label).join(" · ") || "—"}</li>
                <li>{t("listener", "listeners")}: {listeners.map(({ address, port }) => `${address}:${port}`).join(" · ") || "—"}</li>
              </ul>
            </article>
          );
        })}
      </div>

      <NetworkNamespaceBoundaryView preview={preview} evaluation={evaluation} />

      <div className="namespace-lab-actions">
        <button type="button" className="button button-primary" onClick={runDesign}>{t("reachability 실행·설계 판정", "Run reachability and grade design")}</button>
      </div>

      <div className={`namespace-feedback${complete ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {message[locale]}
      </div>
    </section>
  );
}

function ServiceBoundaryEditor({
  title,
  processValue,
  probeValue,
  listenerValue,
  onProcess,
  onProbe,
  onListener,
  t,
}: {
  title: string;
  processValue: NetworkNamespaceId;
  probeValue: NetworkNamespaceId;
  listenerValue: NetworkNamespaceId;
  onProcess: (value: NetworkNamespaceId) => void;
  onProbe: (value: NetworkNamespaceId) => void;
  onListener: (value: NetworkNamespaceId) => void;
  t: (ko: string, en: string) => string;
}) {
  const select = (
    label: string,
    value: NetworkNamespaceId,
    onChange: (value: NetworkNamespaceId) => void,
  ) => (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value as NetworkNamespaceId)}>
        {networkNamespaceIds.map((namespaceId) => <option value={namespaceId} key={namespaceId}>{namespaceId}</option>)}
      </select>
    </label>
  );
  return (
    <fieldset>
      <legend>{title}</legend>
      {select(t("service process 위치", "service process namespace"), processValue, onProcess)}
      {select(t("listener 생성 위치", "listener creation namespace"), listenerValue, onListener)}
      {select(t("local health probe 위치", "local health probe namespace"), probeValue, onProbe)}
    </fieldset>
  );
}

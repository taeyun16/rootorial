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
import {
  InfrastructureChoiceRail,
  InfrastructureWorkspace,
} from "./InfrastructureInteractionPrimitives";
import {
  NetworkNamespaceBoundaryView,
  type NamespaceEditableObjectId,
} from "./NetworkNamespaceBoundaryView";
import "./network-namespace-interactive.css";

type Prediction = "" | "both-local-only" | "host-can-reach" | "no-local-health";
type PredictionChoice = Exclude<Prediction, "">;
type LocalizedMessage = { ko: string; en: string };
type NamespacePlacementField =
  | "appProcessNamespace"
  | "dataProcessNamespace"
  | "appProbeNamespace"
  | "dataProbeNamespace"
  | "appListenerNamespace"
  | "dataListenerNamespace";

const objectPlacementFields: Record<NamespaceEditableObjectId, NamespacePlacementField> = {
  "app-service": "appProcessNamespace",
  "data-service": "dataProcessNamespace",
  "app-probe": "appProbeNamespace",
  "data-probe": "dataProbeNamespace",
  "app-listener": "appListenerNamespace",
  "data-listener": "dataListenerNamespace",
};

const objectLabels: Record<NamespaceEditableObjectId, string> = {
  "app-service": "app service process",
  "data-service": "data service process",
  "app-probe": "app local health probe",
  "data-probe": "data local health probe",
  "app-listener": "app listener · 127.0.0.1:8080",
  "data-listener": "data listener · 127.0.0.1:5432",
};

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
  const [selectedObjectId, setSelectedObjectId] = useState<NamespaceEditableObjectId | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  useEffect(() => {
    onCompletionChange(complete);
  }, [complete, onCompletionChange]);

  const preview = useMemo(() => evaluateNamespaceTopology(draft), [draft]);

  function invalidate(nextMessage: LocalizedMessage) {
    setEvaluation(null);
    setComplete(() => false);
    setMessage(nextMessage);
  }

  function setNamespaceField(
    field: NamespacePlacementField,
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
    setSelectedObjectId(null);
    invalidate(id === "collapsed"
      ? localizedMessage("모든 workload가 host에 겹친 출발점입니다. 격리 경계를 설계하세요.", "Every workload starts collapsed onto the host. Design isolation boundaries.")
      : localizedMessage("service는 격리됐지만 두 lo가 down입니다. local health가 왜 실패하는지 수리하세요.", "Services are isolated, but both lo devices are down. Repair the local health failure."));
  }

  function reset() {
    setDraft({ ...initialDraft });
    setPrediction("");
    setSelectedObjectId(null);
    invalidate(localizedMessage("초기화했습니다. host에 겹친 workload를 다시 분리하세요.", "Reset. Separate the workloads collapsed on the host again."));
  }

  function placeSelectedObject(namespaceId: NetworkNamespaceId) {
    if (!selectedObjectId) return;
    setNamespaceField(objectPlacementFields[selectedObjectId], namespaceId);
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
      setComplete(() => passed);
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
      setComplete(() => false);
      setMessage(localizedMessage(
        "브라우저 모델 실행에 실패했습니다. 초기화 후 다시 시도하세요. 설명과 선택 Linux 관찰은 계속 사용할 수 있습니다.",
        "The browser model failed to run. Reset and try again; the explanation and optional Linux observation remain available.",
      ));
    }
  }

  const namespaceLabel = (namespaceId: NetworkNamespaceId) => namespaceId === "host"
    ? "host"
    : `${namespaceId} netns`;
  const selectedNamespaceId = selectedObjectId
    ? draft[objectPlacementFields[selectedObjectId]]
    : "";
  const selectedNamespaceLabel = selectedNamespaceId
    ? namespaceLabel(selectedNamespaceId)
    : "";
  const selectedObjectIsListener = selectedObjectId === "app-listener"
    || selectedObjectId === "data-listener";
  const predictionOptions = [
    {
      value: "both-local-only",
      eyebrow: t("의도한 경계", "INTENDED BOUNDARY"),
      label: t("두 local health만 성공", "Only both local health checks connect"),
      detail: t("host와 다른 namespace의 localhost 조회는 실패", "Host and cross-namespace localhost lookups fail"),
    },
    {
      value: "host-can-reach",
      eyebrow: t("경계 누출", "BOUNDARY LEAK"),
      label: t("host가 두 listener에 도달", "The host reaches both listeners"),
      detail: t("127.0.0.1이 모든 namespace에 공유된다고 예측", "Predicts that 127.0.0.1 is shared across namespaces"),
    },
    {
      value: "no-local-health",
      eyebrow: t("과도한 격리", "OVER-ISOLATION"),
      label: t("격리하면 local health도 실패", "Isolation also breaks local health"),
      detail: t("같은 namespace의 probe도 연결되지 않는다고 예측", "Predicts that even same-namespace probes cannot connect"),
    },
  ] as const;
  const destinationOptions = networkNamespaceIds.map((namespaceId) => ({
    value: namespaceId,
    eyebrow: namespaceId === "host" ? "ROOT VIEW" : "ISOLATED VIEW",
    label: namespaceLabel(namespaceId),
    detail: namespaceId === "host"
      ? t("초기 공유 network view", "Initial shared network view")
      : t(`${namespaceId} 전용 socket·lo`, `${namespaceId}-local sockets and loopback`),
  }));
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

      <div className="namespace-prediction-step">
        <span className="namespace-editor-step">01 · PREDICT</span>
        <InfrastructureChoiceRail<PredictionChoice>
          label={t("실행 전 reachability 결과를 선택하세요", "Choose the reachability outcome before running")}
          value={prediction}
          options={predictionOptions}
          onChange={(value) => {
            setPrediction(value);
            invalidate(localizedMessage(
              "예측이 바뀌었습니다. 현재 reachability를 다시 실행하세요.",
              "Prediction changed. Run the current reachability again.",
            ));
          }}
          controlId="namespace-prediction"
        />
      </div>

      <div className="namespace-editor-workspace">
        <InfrastructureWorkspace
          label={t("network namespace 경계 직접 편집기", "Direct network namespace boundary editor")}
          stage={(
            <NetworkNamespaceBoundaryView
              preview={preview}
              evaluation={evaluation}
              selectedObjectId={selectedObjectId}
              onSelectObject={setSelectedObjectId}
              onLoopbackChange={(namespaceId, up) => setBooleanField(
                namespaceId === "app" ? "appLoopbackUp" : "dataLoopbackUp",
                up,
              )}
            />
          )}
          inspector={(
            <div className="namespace-editor-inspector">
              <span className="namespace-editor-step">02 · PLACE OBJECTS</span>
              <h4>{selectedObjectId
                ? objectLabels[selectedObjectId]
                : t("지도에서 object를 선택하세요", "Select an object on the map")}</h4>
              <p className="namespace-editor-selection" role="status" aria-live="polite" aria-atomic="true">
                {selectedObjectId
                  ? t(
                    `${objectLabels[selectedObjectId]} 선택됨 · 현재 ${selectedNamespaceLabel}`,
                    `${objectLabels[selectedObjectId]} selected · currently in ${selectedNamespaceLabel}`,
                  )
                  : t(
                    "process, listener, health probe 중 하나를 선택하면 배치할 network view가 열립니다.",
                    "Select a process, listener, or health probe to reveal its placement views.",
                  )}
              </p>
              {selectedObjectId ? (
                <InfrastructureChoiceRail<NetworkNamespaceId>
                  label={selectedObjectIsListener
                    ? t(
                      "이 listener를 만들거나 다시 만들 network view",
                      "Create or recreate this listener in a network view",
                    )
                    : t(
                      "이 object를 배치할 network view",
                      "Place this object in a network view",
                    )}
                  value={selectedNamespaceId}
                  options={destinationOptions}
                  onChange={placeSelectedObject}
                  controlId="namespace-object-destination"
                  compact
                />
              ) : null}
              <div className="namespace-editor-contract">
                <span>{t("설계 계약", "DESIGN CONTRACT")}</span>
                <p><strong>{t("같은 namespace", "SAME NAMESPACE")}</strong> service process · listener · local health probe</p>
                <p><strong>{t("서로 다른 namespace", "DIFFERENT NAMESPACES")}</strong> app · data · host</p>
                <p><strong>{t("interface 상태", "INTERFACE STATE")}</strong> app lo UP · data lo UP</p>
                <p><strong>{t("아직 없는 것", "NOT BUILT YET")}</strong> veth · bridge · router · NAT</p>
              </div>
            </div>
          )}
        />
      </div>

      <div className="namespace-lab-actions">
        <button type="button" className="button button-primary" onClick={runDesign}>{t("reachability 실행·설계 판정", "Run reachability and grade design")}</button>
      </div>

      <div className={`namespace-feedback${complete ? " is-success" : evaluation ? " is-error" : ""}`} role="status" aria-live="polite">
        {message[locale]}
      </div>
    </section>
  );
}

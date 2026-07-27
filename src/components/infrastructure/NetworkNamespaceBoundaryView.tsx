import { useId, useMemo } from "react";
import {
  buildNetworkNamespaceVisualState,
  type NamespaceBoundaryState,
  type NamespaceVisualObject,
  type NamespaceVisualProbeId,
  type NamespaceVisualProbeResult,
} from "../../features/infrastructure/network-namespace-visual";
import type { NamespaceTopologyEvaluation, NetworkNamespaceId } from "../../features/infrastructure/network-namespaces";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureStateSwitch } from "./InfrastructureInteractionPrimitives";

export type NamespaceEditableObjectId =
  | "app-service"
  | "data-service"
  | "app-probe"
  | "data-probe"
  | "app-listener"
  | "data-listener";

const editableObjectIds = new Set<NamespaceEditableObjectId>([
  "app-service",
  "data-service",
  "app-probe",
  "data-probe",
  "app-listener",
  "data-listener",
]);

function isEditableObjectId(id: string): id is NamespaceEditableObjectId {
  return editableObjectIds.has(id as NamespaceEditableObjectId);
}

type Props = {
  preview: NamespaceTopologyEvaluation;
  evaluation: NamespaceTopologyEvaluation | null;
  selectedObjectId: NamespaceEditableObjectId | null;
  onSelectObject: (objectId: NamespaceEditableObjectId) => void;
  onLoopbackChange: (namespaceId: "app" | "data", up: boolean) => void;
};

export function NetworkNamespaceBoundaryView({
  preview,
  evaluation,
  selectedObjectId,
  onSelectObject,
  onLoopbackChange,
}: Props) {
  const { locale } = useLocale();
  const id = useId().replace(/:/g, "");
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const visual = useMemo(
    () => buildNetworkNamespaceVisualState(
      preview,
      evaluation ? (evaluation.passed ? "passed" : "failed") : "not-run",
    ),
    [evaluation, preview],
  );
  const titleId = `${id}-namespace-visual-title`;
  const descriptionId = `${id}-namespace-visual-description`;

  const namespaceLabel = (namespaceId: NetworkNamespaceId) => namespaceId === "host"
    ? "host netns"
    : `${namespaceId} netns`;
  const objectLabel = (object: NamespaceVisualObject) => ({
    "host-lo": "lo",
    "app-lo": "lo",
    "data-lo": "lo",
    "host-probe": t("host 관측 probe", "host observation probe"),
    "app-service": "app service",
    "data-service": "data service",
    "app-probe": "app health probe",
    "data-probe": "data health probe",
    "app-local-5432-probe": t("app → localhost:5432 probe", "app → localhost:5432 probe"),
    "app-listener": object.label,
    "data-listener": object.label,
  }[object.id] ?? object.label);
  const kindLabel = (object: NamespaceVisualObject) => ({
    interface: "INTERFACE",
    process: "PROCESS",
    probe: "PROBE",
    listener: "LISTENER",
  }[object.kind]);
  const boundaryStateLabel = (state: NamespaceBoundaryState) => ({
    collapsed: t("host에 겹침", "COLLAPSED ON HOST"),
    "isolated-down": t("경계 분리 · lo down", "ISOLATED · LO DOWN"),
    misconfigured: t("소유 경계 불일치", "OWNERSHIP MISMATCH"),
    "working-boundaries": t("의도한 경계", "WORKING BOUNDARIES"),
  }[state]);
  const probeLabel = (probeId: NamespaceVisualProbeId) => ({
    "app-health": "app local health",
    "data-health": "data local health",
    "host-8080": "host localhost:8080",
    "host-5432": "host localhost:5432",
    "app-5432": "app localhost:5432",
  }[probeId]);
  const resultLabel = (result: NamespaceVisualProbeResult) => ({
    "not-run": t("실행 전", "NOT RUN"),
    connected: t("연결됨", "CONNECTED"),
    "loopback-down": "LO DOWN",
    "connection-refused": t("이 namespace에 listener 없음", "NO LISTENER IN THIS NAMESPACE"),
    "source-process-missing": t("probe process 없음", "PROBE PROCESS MISSING"),
  }[result]);
  const currentState = evaluation
    ? evaluation.passed
      ? t("실행 결과가 의도한 namespace-local 경계를 확인했습니다.", "The executed result confirms the intended namespace-local boundaries.")
      : t("실행 결과가 현재 배치의 경계 오류를 확인했습니다.", "The executed result confirms a boundary error in the current placement.")
    : t("배치는 실시간으로 반영되며 reachability 결과는 아직 실행하지 않았습니다.", "Placement updates live; reachability has not been executed yet.");
  const description = visual.boundaries.map((boundary) => {
    const objects = boundary.objects
      .filter(({ kind }) => kind !== "interface")
      .map(objectLabel)
      .join(", ") || t("network object 없음", "no network objects");
    return `${namespaceLabel(boundary.id)}: lo ${boundary.loopbackUp ? "UP" : "DOWN"}; ${objects}`;
  }).join(". ");

  return (
    <figure
      className={`namespace-boundary-visualization is-${visual.boundaryState}`}
      data-testid="network-namespace-visualization"
      data-boundary-state={visual.boundaryState}
      data-grade-state={visual.gradeState}
      data-cross-namespace-path={visual.crossNamespacePath}
    >
      <figcaption className="namespace-boundary-visual-header">
        <div>
          <span>LIVE KERNEL NETWORK VIEW</span>
          <strong>{t("하나의 커널, 세 개의 동등한 network namespace", "One kernel, three peer network namespaces")}</strong>
        </div>
        <span className="namespace-boundary-state-badge">{boundaryStateLabel(visual.boundaryState)}</span>
      </figcaption>

      <section
        className="namespace-kernel-boundary-map"
        aria-labelledby={titleId}
        aria-describedby={descriptionId}
      >
        <span className="sr-only" id={titleId}>{t("네트워크 namespace 경계 지도", "Network namespace boundary map")}</span>
        <span className="sr-only" id={descriptionId}>{description}</span>
        <div className="namespace-kernel-boundary-label">
          <span>ONE LINUX KERNEL</span>
          <strong>{t("namespace는 부모·자식 VM이 아니라 동등한 조회 경계입니다", "Namespaces are peer lookup boundaries, not parent and child VMs")}</strong>
        </div>

        <div className="namespace-boundary-map-grid">
          {visual.boundaries.map((boundary) => {
            const loopback = boundary.objects.find(({ kind }) => kind === "interface");
            const processes = boundary.objects.filter(({ kind }) => kind === "process" || kind === "probe");
            const listeners = boundary.objects.filter(({ kind }) => kind === "listener");
            return (
              <article
                className={`namespace-boundary-map-card is-loopback-${boundary.loopbackUp ? "up" : "down"}`}
                key={boundary.id}
                data-namespace-id={boundary.id}
                data-loopback-state={boundary.loopbackUp ? "up" : "down"}
              >
                <header>
                  <span>{namespaceLabel(boundary.id)}</span>
                  <strong>{t("독립 network view", "ISOLATED NETWORK VIEW")}</strong>
                </header>
                <div
                  className={`namespace-boundary-loopback${boundary.id === "host" ? " is-fixed" : ""}`}
                  data-object-id={loopback?.id}
                  data-object-kind="interface"
                  data-owner-namespace={boundary.id}
                >
                  {boundary.id === "host" ? (
                    <>
                      <span>lo · 127.0.0.1</span>
                      <strong>UP · {t("고정", "FIXED")}</strong>
                    </>
                  ) : (
                    <InfrastructureStateSwitch
                      label={`${boundary.id} lo`}
                      detail="127.0.0.1 · namespace-local interface"
                      checked={boundary.loopbackUp}
                      onChange={(up) => onLoopbackChange(boundary.id === "app" ? "app" : "data", up)}
                      stateOn="UP"
                      stateOff="DOWN"
                      controlId={`${boundary.id}-loopback`}
                    />
                  )}
                </div>
                <div className="namespace-boundary-object-lanes">
                  <div>
                    <span>{t("실행 위치", "EXECUTION VIEW")}</span>
                    <ul>
                      {processes.length ? processes.map((object) => {
                        const editableObjectId = isEditableObjectId(object.id) ? object.id : null;
                        const selected = editableObjectId !== null && selectedObjectId === editableObjectId;
                        return (
                          <li
                            className={`${editableObjectId ? "is-editable" : "is-fixed"}${selected ? " is-selected" : ""}`}
                            key={object.id}
                            data-object-id={object.id}
                            data-object-kind={object.kind}
                            data-owner-namespace={object.ownerNamespace}
                          >
                            {editableObjectId ? (
                              <button
                                type="button"
                                aria-pressed={selected}
                                aria-label={t(
                                  `${objectLabel(object)} 배치 선택 · 현재 ${namespaceLabel(object.ownerNamespace)}`,
                                  `Select placement for ${objectLabel(object)} · currently in ${namespaceLabel(object.ownerNamespace)}`,
                                )}
                                onClick={() => onSelectObject(editableObjectId)}
                              >
                                <small>{kindLabel(object)}</small>
                                <strong>{objectLabel(object)}</strong>
                                <span>{t("배치 선택", "Select placement")}</span>
                              </button>
                            ) : (
                              <div>
                                <small>{kindLabel(object)}</small>
                                <strong>{objectLabel(object)}</strong>
                                <span>{t("고정된 관측 object", "Fixed observation object")}</span>
                              </div>
                            )}
                          </li>
                        );
                      }) : <li className="is-empty">—</li>}
                    </ul>
                  </div>
                  <div>
                    <span>{t("socket table", "SOCKET TABLE")}</span>
                    <ul>
                      {listeners.length ? listeners.map((object) => {
                        const editableObjectId = isEditableObjectId(object.id) ? object.id : null;
                        const selected = editableObjectId !== null && selectedObjectId === editableObjectId;
                        return (
                          <li
                            className={`${editableObjectId ? "is-editable" : "is-fixed"}${selected ? " is-selected" : ""}`}
                            key={object.id}
                            data-object-id={object.id}
                            data-object-kind={object.kind}
                            data-owner-namespace={object.ownerNamespace}
                          >
                            {editableObjectId ? (
                              <button
                                type="button"
                                aria-pressed={selected}
                                aria-label={t(
                                  `${objectLabel(object)} 배치 선택 · 현재 ${namespaceLabel(object.ownerNamespace)}`,
                                  `Select placement for ${objectLabel(object)} · currently in ${namespaceLabel(object.ownerNamespace)}`,
                                )}
                                onClick={() => onSelectObject(editableObjectId)}
                              >
                                <small>{kindLabel(object)}</small>
                                <strong>{objectLabel(object)}</strong>
                                <span>{t("배치 선택", "Select placement")}</span>
                              </button>
                            ) : (
                              <div>
                                <small>{kindLabel(object)}</small>
                                <strong>{objectLabel(object)}</strong>
                              </div>
                            )}
                          </li>
                        );
                      }) : <li className="is-empty">—</li>}
                    </ul>
                  </div>
                </div>
                <p className="namespace-boundary-local-path">
                  <span aria-hidden="true">↳</span>
                  {t("localhost 조회는 이 경계 안의 lo와 socket table에서 끝남", "localhost lookup ends at this boundary's lo and socket table")}
                </p>
              </article>
            );
          })}
        </div>

        <div className="namespace-boundary-no-path">
          <span aria-hidden="true">∅</span>
          <strong>NO VETH · NO BRIDGE · NO ROUTE</strong>
          <p>{t("namespace 사이를 잇는 data path는 아직 없습니다", "No data path connects the namespaces yet")}</p>
        </div>
      </section>

      <ol className="namespace-boundary-probe-list" aria-label={t("localhost reachability 실행 결과", "Executed localhost reachability results")}>
        {visual.probes.map((probe) => (
          <li
            className={`is-${probe.displayedResult}`}
            key={probe.id}
            data-probe-id={probe.id}
            data-result={probe.displayedResult}
          >
            <div>
              <span>{probeLabel(probe.id)}</span>
              <code>{probe.sourceNamespace} netns → 127.0.0.1:{probe.port}</code>
            </div>
            <strong>{resultLabel(probe.displayedResult)}</strong>
          </li>
        ))}
      </ol>

      <p className="namespace-boundary-current-state" role="status" aria-live="polite" aria-atomic="true">
        <span>{t("현재 지도", "CURRENT MAP")}</span>
        {currentState}
      </p>
    </figure>
  );
}

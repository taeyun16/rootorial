import { useEffect, useState } from "react";
import {
  evaluateNamespaceIncident,
  namespaceIncidentFixtures,
  type NamespaceIncidentEvaluation,
  type NamespaceIncidentId,
  type NamespaceIncidentRepair,
} from "../../features/infrastructure/network-namespaces";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

const incidentIds = Object.keys(namespaceIncidentFixtures) as NamespaceIncidentId[];

export function NetworkNamespaceIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<NamespaceIncidentId, NamespaceIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<NamespaceIncidentId, NamespaceIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<NamespaceIncidentId[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  useEffect(() => {
    onCompletionChange(completed.length === incidentIds.length);
  }, [completed, onCompletionChange]);

  function chooseRepair(incidentId: NamespaceIncidentId, repair: NamespaceIncidentRepair) {
    setRuntimeFailed(false);
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
  }

  function diagnose(incidentId: NamespaceIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateNamespaceIncident(incidentId, repair);
      setResults((current) => ({ ...current, [incidentId]: result }));
      setCompleted((current) => result.passed
        ? [...new Set([...current, incidentId])]
        : current.filter((candidate) => candidate !== incidentId));
    } catch {
      setRuntimeFailed(true);
      setResults((current) => ({ ...current, [incidentId]: undefined }));
      setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
    }
  }

  function resetIncident(incidentId: NamespaceIncidentId) {
    setRuntimeFailed(false);
    setRepairs((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setResults((current) => {
      const next = { ...current };
      delete next[incidentId];
      return next;
    });
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
  }

  function resetAll() {
    setRuntimeFailed(false);
    setRepairs({});
    setResults({});
    setCompleted(() => []);
  }

  const copy: Record<NamespaceIncidentId, {
    number: string;
    title: string;
    evidence: string;
    prompt: string;
  }> = {
    "wrong-inspection-context": {
      number: "01",
      title: t("host ss만 보고 app listener가 없다고 결론", "Concluding the app listener is absent from host ss alone"),
      evidence: "host$ ss -lnt → no :8080\napp service log → bind 127.0.0.1:8080 ok",
      prompt: t("어느 network view에서 listener를 다시 관측해야 할까요?", "From which network view should the listener be observed again?"),
    },
    "loopback-down": {
      number: "02",
      title: t("같은 namespace인데 local health가 ENETUNREACH", "Local health returns ENETUNREACH inside one namespace"),
      evidence: "app$ ip -br link show lo → lo UNKNOWN DOWN\napp$ ss -lnt → 127.0.0.1:8080",
      prompt: t("listener를 옮기지 않고 최초 실패 경계를 수리하세요.", "Repair the first failed boundary without moving the listener."),
    },
    "socket-created-before-setns": {
      number: "03",
      title: t("process는 app인데 listener는 host에 남음", "The process is in app but its listener remains on the host"),
      evidence: "socket() + bind() + listen() in host\nsetns(app)\napp$ ss -lnt → no :8080",
      prompt: t("socket 생성 시점의 namespace affinity를 보존해 수리하세요.", "Repair the socket's creation-time namespace affinity."),
    },
    "wildcard-stays-local": {
      number: "04",
      title: t("app의 0.0.0.0 bind를 host 전체 공개로 오해", "Treating app's 0.0.0.0 bind as host-wide exposure"),
      evidence: "app$ ss -lnt → 0.0.0.0:8080\nhost$ curl 127.0.0.1:8080 → refused",
      prompt: t("wildcard도 namespace-local임을 어느 probe로 입증할까요?", "Which probe proves that wildcard binding is still namespace-local?"),
    },
  };

  const optionLabel = (repair: NamespaceIncidentRepair) => ({
    "inspect-app": t("ip netns exec app ss -lnt 실행", "run ip netns exec app ss -lnt"),
    "inspect-host": t("host ss -lnt만 다시 실행", "run host ss -lnt again"),
    "bring-app-loopback-up": t("app에서 ip link set lo up", "run ip link set lo up inside app"),
    "move-probe-host": t("health probe를 host로 이동", "move the health probe to the host"),
    "recreate-listener-in-app": t("기존 socket을 닫고 app 안에서 socket·bind·listen 재실행", "close the old socket and recreate socket, bind, and listen inside app"),
    "enable-host-loopback": t("host lo를 다시 UP", "bring host lo UP again"),
    "run-probe-in-app": t("app 안에서 curl 127.0.0.1:8080 실행하고 host 실패와 비교", "run curl 127.0.0.1:8080 inside app and compare it with host failure"),
    "bind-wildcard-on-host": t("app listener는 둔 채 host에서도 wildcard bind라고 가정", "assume the app wildcard is also bound on the host"),
  }[repair]);

  const resultMessage = (result: NamespaceIncidentEvaluation) => {
    const successMessages: Partial<Record<NamespaceIncidentEvaluation["reason"], string>> = {
      "target-listener-observed": t("통과 — observer를 app view로 옮기자 :8080 listener가 보였습니다.", "Passed — moving the observer into the app view revealed the :8080 listener."),
      "loopback-restored": t("통과 — app lo를 UP으로 바꾸자 같은 namespace의 health probe가 연결됐습니다.", "Passed — bringing app lo UP allowed the same-namespace health probe to connect."),
      "listener-recreated-in-target": t("통과 — app 안에서 새 socket을 만들자 app health는 성공하고 host 접근은 닫혔습니다.", "Passed — recreating the socket inside app restored app health while host access stayed closed."),
      "wildcard-confirmed-namespace-local": t("통과 — app probe만 wildcard listener에 연결되고 host probe는 계속 거부됐습니다.", "Passed — only the app probe reached the wildcard listener; the host probe remained refused."),
    };
    if (result.passed) return successMessages[result.reason] ?? t("사건을 수리했습니다.", "Incident repaired.");
    const failureMessages: Partial<Record<NamespaceIncidentEvaluation["reason"], string>> = {
      "wrong-observation-scope": t("host output은 app socket table의 부재를 증명하지 않습니다. observer를 app 안에서 실행하세요.", "Host output cannot prove absence from the app socket table. Execute the observer inside app."),
      "loopback-still-down": t("probe 위치를 바꾸면 요구사항을 지웁니다. app lo의 admin state를 직접 수리하세요.", "Moving the probe erases the requirement. Repair the app lo admin state directly."),
      "listener-still-in-host": t("host 상태를 넓혀도 socket affinity는 바뀌지 않습니다. app 안에서 listener를 다시 만드세요.", "Expanding host state does not change socket affinity. Recreate the listener inside app."),
      "wildcard-does-not-cross-namespaces": t("0.0.0.0은 현재 namespace의 local addresses 전체이지 다른 namespace 전체가 아닙니다.", "0.0.0.0 covers local addresses in the current namespace, not every other namespace."),
    };
    return failureMessages[result.reason] ?? t("선택한 수리는 invariant를 만족하지 않습니다.", "The selected repair does not satisfy the invariant.");
  };

  return (
    <section
      className="interactive-lab namespace-lab namespace-incident-lab"
      aria-labelledby="namespace-incidents-title"
      data-interactive-ready={interactiveReady ? "true" : "false"}
    >
      <div className="namespace-lab-header">
        <div>
          <p className="concept-check-kicker">REQUIRED ACTIVITY · INCIDENT CONSOLE</p>
          <h3 id="namespace-incidents-title">{t("관측 범위와 object ownership으로 네 사건 수리", "Repair four incidents through observation scope and object ownership")}</h3>
          <p>{t("각 선택은 동일한 namespace state 모델로 다시 실행됩니다. 정답처럼 보이는 명령 이름만으로는 통과하지 않습니다.", "Each choice is re-executed through the same namespace state model. A command that merely looks plausible cannot pass.")}</p>
        </div>
        <strong>{completed.length} / {incidentIds.length}</strong>
      </div>
      <div className="namespace-lab-toolbar">
        <button type="button" className="button button-ghost" onClick={resetAll}>{t("모든 사건 초기화", "Reset all incidents")}</button>
      </div>
      {runtimeFailed ? (
        <div className="namespace-feedback is-error" role="alert">
          {t(
            "브라우저 상태 모델 실행에 실패했습니다. 사건을 초기화한 뒤 다시 시도하세요. 위의 증거와 선택 Linux 관찰 명령은 계속 사용할 수 있습니다.",
            "The browser state model failed. Reset the incident and try again; the evidence and optional Linux observation commands above remain available.",
          )}
        </div>
      ) : null}
      <div className="namespace-incident-grid">
        {incidentIds.map((incidentId) => {
          const fixture = namespaceIncidentFixtures[incidentId];
          const item = copy[incidentId];
          const result = results[incidentId];
          return (
            <article className="namespace-incident-card" key={incidentId}>
              <span>{item.number} · {incidentId}</span>
              <h4>{item.title}</h4>
              <pre aria-label={t(`${item.title} 증거`, `${item.title} evidence`)}>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail
                compact
                controlId={`namespace-incident-${incidentId}-repair`}
                label={t("증거에 적용할 최소 수리", "Minimal repair to apply to the evidence")}
                value={repairs[incidentId] ?? ""}
                options={fixture.repairOptions.map((repair) => ({
                  value: repair,
                  label: optionLabel(repair),
                }))}
                onChange={(repair) => chooseRepair(incidentId, repair)}
              />
              <div className="namespace-incident-actions">
                <button type="button" className="button button-primary" disabled={!repairs[incidentId]} onClick={() => diagnose(incidentId)}>{t("상태 재실행·판정", "Re-run state and grade")}</button>
                <button type="button" className="button button-ghost" onClick={() => resetIncident(incidentId)}>{t("카드 초기화", "Reset card")}</button>
              </div>
              <div className={`namespace-feedback${result?.passed ? " is-success" : result ? " is-error" : ""}`} role="status" aria-live="polite">
                {result ? resultMessage(result) : t("증거와 최초 실패 경계를 연결하세요.", "Connect the evidence to the first failed boundary.")}
              </div>
            </article>
          );
        })}
      </div>
      <div className="namespace-mastery-progress" role="status" aria-live="polite">
        {incidentIds.map((incidentId) => <span className={completed.includes(incidentId) ? "is-complete" : undefined} key={incidentId}>{completed.includes(incidentId) ? "✓" : "○"} {incidentId}</span>)}
      </div>
    </section>
  );
}

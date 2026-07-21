import { useEffect, useState } from "react";
import {
  evaluateNamespacePlatformIncident,
  namespacePlatformIncidentFixtures,
  namespacePlatformIncidentIds,
  type NamespacePlatformIncidentEvaluation,
  type NamespacePlatformIncidentId,
  type NamespacePlatformIncidentRepair,
} from "../../features/infrastructure/namespace-platform";
import { useLocale } from "../../features/localization/localization";
import { InfrastructureChoiceRail } from "./InfrastructureInteractionPrimitives";

export function NamespacePlatformIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [repairs, setRepairs] = useState<Partial<Record<NamespacePlatformIncidentId, NamespacePlatformIncidentRepair>>>({});
  const [results, setResults] = useState<Partial<Record<NamespacePlatformIncidentId, NamespacePlatformIncidentEvaluation>>>({});
  const [completed, setCompleted] = useState<NamespacePlatformIncidentId[]>([]);
  const [runtimeFailed, setRuntimeFailed] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange(completed.length === namespacePlatformIncidentIds.length), [completed, onCompletionChange]);

  const copy: Record<NamespacePlatformIncidentId, { number: string; title: string; evidence: string; prompt: string }> = {
    "app-publicly-exposed": {
      number: "01",
      title: t("app namespace가 public 443을 직접 listen", "The app namespace directly listens on public 443"),
      evidence: "public listeners = edge:443, app:443\napp address = public",
      prompt: t("edge 하나만 public ingress를 소유하도록 최소 경계를 수리하세요.", "Repair the smallest boundary so only edge owns public ingress."),
    },
    "missing-data-route": {
      number: "02",
      title: t("app에서 private data:5432로 가는 route가 없음", "The app lacks a route to private data:5432"),
      evidence: "edge → app:8080 = pass\napp → data:5432 = missing",
      prompt: t("data를 공개하지 않고 내부 service path만 복구하세요.", "Restore only the internal service path without publishing data."),
    },
    "stateless-private-egress": {
      number: "03",
      title: t("edge가 source를 번역하지만 reply state를 보존하지 않음", "Edge translates the source but does not retain reply state"),
      evidence: "app private → edge SNAT → external\nconntrack lookup = missing",
      prompt: t("app에 public 주소를 주지 말고 stateful return path를 복구하세요.", "Restore the stateful return path without giving app a public address."),
    },
    "zone-a-correlated-platform": {
      number: "04",
      title: t("edge·app·data가 모두 zone A에 상관 배치", "Edge, app, and data are all correlated in Zone A"),
      evidence: "zone A = edge + app + data primary/standby\nzone B = empty",
      prompt: t("replica 수가 아니라 독립 failure domain을 추가하세요.", "Add an independent failure domain rather than only another replica."),
    },
  };

  const repairLabel = (repair: NamespacePlatformIncidentRepair) => ({
    "make-app-private": t("app public listener를 제거하고 private로 유지", "remove the app public listener and keep it private"),
    "add-edge-access-log": t("edge access log만 추가", "only add an edge access log"),
    "restore-app-data-5432": t("app→data tcp/5432 route와 allow 복구", "restore the app-to-data TCP 5432 route and allow"),
    "publish-data-5432": t("data:5432를 public으로 공개", "publish data:5432 publicly"),
    "restore-edge-nat-conntrack": t("edge NAT와 conntrack return path 복구", "restore edge NAT and the conntrack return path"),
    "assign-app-public-ip": t("app에 public IP 직접 할당", "assign a public IP directly to app"),
    "spread-platform-across-zones": t("edge·app·data를 zone A/B에 분산", "spread edge, app, and data across Zones A and B"),
    "add-zone-a-replica": t("zone A에 replica 하나 더 추가", "add another replica in Zone A"),
  }[repair]);

  function chooseRepair(incidentId: NamespacePlatformIncidentId, repair: NamespacePlatformIncidentRepair) {
    setRepairs((current) => ({ ...current, [incidentId]: repair }));
    setResults((current) => ({ ...current, [incidentId]: undefined }));
    setCompleted((current) => current.filter((candidate) => candidate !== incidentId));
    setRuntimeFailed(false);
  }

  function runIncident(incidentId: NamespacePlatformIncidentId) {
    const repair = repairs[incidentId];
    if (!repair) return;
    try {
      setRuntimeFailed(false);
      const result = evaluateNamespacePlatformIncident(incidentId, repair);
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

  function resetAll() {
    setRepairs({});
    setResults({});
    setCompleted([]);
    setRuntimeFailed(false);
  }

  return (
    <section className="namespace-platform-incident-lab" aria-labelledby="namespace-platform-incidents-title" data-interactive-ready={interactiveReady ? "true" : "false"}>
      <header className="namespace-platform-incident-header">
        <div><p className="concept-check-kicker">REQUIRED ACTIVITY · PLATFORM INCIDENTS</p><h3 id="namespace-platform-incidents-title">{t("네 platform 사건을 최소 architecture repair로 수리", "Repair four platform incidents with minimal architecture changes")}</h3></div>
        <strong>{completed.length} / {namespacePlatformIncidentIds.length}</strong>
      </header>
      {runtimeFailed ? <div className="namespace-platform-runtime-alert" role="alert">{t("사건 evaluator를 실행하지 못했습니다. 활동을 초기화하세요.", "The incident evaluator could not run. Reset the activity.")}</div> : null}
      <div className="namespace-platform-incident-grid">
        {namespacePlatformIncidentIds.map((incidentId) => {
          const item = copy[incidentId];
          const fixture = namespacePlatformIncidentFixtures[incidentId];
          const result = results[incidentId];
          return (
            <article data-incident-id={incidentId} key={incidentId}>
              <span>{item.number}</span>
              <h4>{item.title}</h4>
              <pre>{item.evidence}</pre>
              <p>{item.prompt}</p>
              <InfrastructureChoiceRail compact controlId={`platform-incident-${incidentId}-repair`} label={t("architecture에 적용할 최소 repair", "Minimal architecture repair")} value={repairs[incidentId] ?? ""} options={fixture.repairOptions.map((repair) => ({ value: repair, label: repairLabel(repair) }))} onChange={(repair) => chooseRepair(incidentId, repair)} />
              <button type="button" className="button button-secondary" disabled={!repairs[incidentId]} onClick={() => runIncident(incidentId)}>{t("repair 후 전체 contract 재실행", "Re-run the full contract after repair")}</button>
              <div className={`namespace-platform-incident-feedback${result ? result.passed ? " is-success" : " is-error" : ""}`} role="status" aria-live="polite">
                {result ? result.passed
                  ? t("최소 repair가 전체 platform contract를 복구했습니다.", "The minimal repair restored the full platform contract.")
                  : t(`아직 차단됨: ${result.reason}`, `Still blocked: ${result.reason}`)
                  : t("repair를 선택하고 같은 incident를 다시 실행하세요.", "Choose a repair and re-run the same incident.")}
              </div>
            </article>
          );
        })}
      </div>
      <button type="button" className="button button-ghost" onClick={resetAll}>{t("네 incident 초기화", "Reset four incidents")}</button>
    </section>
  );
}

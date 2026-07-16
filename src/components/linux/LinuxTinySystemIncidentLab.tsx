import { useEffect, useRef, useState } from "react";
import {
  canCompleteTinyLinuxIncidents,
  evaluateTinyLinuxIncident,
  tinyLinuxIncidentIds,
  type TinyLinuxIncidentEvaluation,
  type TinyLinuxIncidentId,
  type TinyLinuxIncidentSubmission,
} from "../../features/linux-runtime/assemble-a-tiny-linux";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

type IncidentAnswers = Partial<Record<TinyLinuxIncidentId, TinyLinuxIncidentSubmission>>;
type IncidentResults = Partial<Record<TinyLinuxIncidentId, TinyLinuxIncidentEvaluation>>;
type BooleanIncidentKey = "preserveKernel" | "preserveInitramfs" | "pid1Remains";

const incidentCopy = {
  "init-handoff": {
    title: { ko: "사건 1 · rootfs는 열렸지만 PID 1이 없다", en: "Incident 1 · Rootfs opened, but PID 1 is missing" },
    log: "[kernel] initramfs unpacked at /\nRun /sbin/init as init process\nFailed to execute /sbin/init: -2",
    clue: {
      ko: "커널과 같은 initramfs를 보존하면서 실제 artifact 안의 첫 userspace 경로를 골라야 합니다.",
      en: "Keep the same kernel and initramfs while selecting the first-userspace path that actually exists in the artifact.",
    },
  },
  "pid1-supervision": {
    title: { ko: "사건 2 · reportd가 zombie로 남았다", en: "Incident 2 · reportd remains a zombie" },
    log: "PID  PPID  S  COMMAND\n1    0     S  /init\n7    1     Z  [reportd] <defunct>",
    clue: {
      ko: "이미 종료한 zombie에는 signal을 보내도 되살아나지 않습니다. 부모 PID 1이 상태를 회수한 뒤 새 child를 시작해야 합니다.",
      en: "A signal cannot revive an exited zombie. Parent PID 1 must collect its status and then start a new child.",
    },
  },
  "report-access": {
    title: { ko: "사건 3 · non-root reportd가 EACCES를 받는다", en: "Incident 3 · Non-root reportd receives EACCES" },
    log: "reportd[7]: open('/srv/report.txt', O_RDONLY) = -1 EACCES\n/srv       root:report 0750\nreport.txt root:root   0600",
    clue: {
      ko: "root 실행이나 world-write 없이 service에는 path search와 read만, guest에는 둘 다 거부해야 합니다.",
      en: "Without running as root or granting world write, allow only path search and read to the service while denying both to guests.",
    },
  },
  "remote-listener": {
    title: { ko: "사건 4 · localhost에서는 되지만 원격 SYN은 RST", en: "Incident 4 · Localhost works, but remote SYN receives RST" },
    log: "LISTEN 0 16 127.0.0.1:8080 users:((\"reportd\",pid=7,fd=3))\nremote probe 10.0.0.20:8080 -> RST",
    clue: {
      ko: "listener fd는 유지하고 remote 주소에 match한 뒤 별도 accepted fd로만 payload를 보내야 합니다.",
      en: "Keep the listener fd, match the remote address, then send payload only through a distinct accepted fd.",
    },
  },
} as const;

function numberValue(value: string): number | undefined {
  if (!value.trim()) return undefined;
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : undefined;
}

export function LinuxTinySystemIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const firstControlRef = useRef<HTMLSelectElement>(null);
  const [answers, setAnswers] = useState<IncidentAnswers>({});
  const [results, setResults] = useState<IncidentResults>({});
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => {
    setResults({});
    setEngineError("");
    onCompletionChange(false);
  }, [locale, onCompletionChange]);

  const completedCount = tinyLinuxIncidentIds.filter((id) => results[id]?.correct).length;

  function updateAnswer<Key extends keyof TinyLinuxIncidentSubmission>(
    id: TinyLinuxIncidentId,
    key: Key,
    value: TinyLinuxIncidentSubmission[Key],
  ) {
    const nextAnswers = {
      ...answers,
      [id]: { ...answers[id], [key]: value },
    };
    setAnswers(nextAnswers);
    if (results[id]) {
      const nextResults = { ...results };
      delete nextResults[id];
      setResults(nextResults);
      onCompletionChange(false);
    }
  }

  function checkIncident(id: TinyLinuxIncidentId) {
    try {
      const submission = answers[id] ?? {};
      const result = evaluateTinyLinuxIncident(id, submission);
      const nextResults = { ...results, [id]: result };
      setResults(nextResults);
      setEngineError("");
      onCompletionChange(
        result.correct
          && canCompleteTinyLinuxIncidents(answers)
          && tinyLinuxIncidentIds.every((incidentId) => nextResults[incidentId]?.correct),
      );
    } catch {
      setEngineError(t(
        "사건 판정 모델을 실행하지 못했습니다. 네트워크 없이 같은 fixture를 다시 시작할 수 있습니다.",
        "The incident evaluator could not run. Restart the same fixture without a network runtime.",
      ));
      onCompletionChange(false);
    }
  }

  function resetIncidents() {
    setAnswers({});
    setResults({});
    setEngineError("");
    onCompletionChange(false);
    requestAnimationFrame(() => firstControlRef.current?.focus());
  }

  function feedback(id: TinyLinuxIncidentId, result: TinyLinuxIncidentEvaluation) {
    if (result.correct) {
      const copy = {
        "init-handoff": t("같은 kernel·initramfs에서 /init을 PID 1로 실행했습니다.", "The same kernel and initramfs now execute /init as PID 1."),
        "pid1-supervision": t("PID 1이 wait로 zombie를 회수하고 PID 8 child를 다시 시작했습니다.", "PID 1 collected the zombie with wait and restarted child PID 8."),
        "report-access": t("reportd에는 group read만, append와 guest 접근은 거부하는 최소 권한입니다.", "The service receives group read only, while append and guest access remain denied."),
        "remote-listener": t("listener fd 3은 LISTEN을 유지하고 accepted fd 4만 payload를 전송합니다.", "Listener fd 3 stays in LISTEN while only accepted fd 4 sends the payload."),
      } as const;
      return copy[id];
    }
    const first = result.errors[0] ?? "incomplete";
    const messages: Record<string, { ko: string; en: string }> = {
      "init-path": { ko: "initramfs manifest에는 /init만 있습니다. kernel이나 archive를 바꾸지 말고 그 경로를 선택하세요.", en: "The initramfs manifest contains only /init. Select that path without replacing the kernel or archive." },
      "artifact-preservation": { ko: "이미 통과한 kernel과 initramfs artifact는 보존해야 합니다.", en: "Preserve the kernel and initramfs artifacts that already passed." },
      "reap-action": { ko: "zombie의 부모 PID 1이 wait 계열 호출로 종료 상태를 회수해야 합니다.", en: "Parent PID 1 must collect the zombie's exit status with a wait-family call." },
      "restart-parent": { ko: "새 reportd는 PID 1의 child여야 합니다. PID 8, PPID 1을 다시 확인하세요.", en: "The new reportd must be a child of PID 1. Recheck PID 8 and PPID 1." },
      "service-identity": { ko: "root 우회가 아니라 UID 1100, GID 4000인 reportd를 유지하세요.", en: "Keep reportd at UID 1100 and GID 4000 instead of bypassing the contract as root." },
      "directory-contract": { ko: "/srv는 root:report 0750이어야 path search는 service group에만 열립니다.", en: "/srv must be root:report 0750 so path search is available only to the service group." },
      "report-contract": { ko: "report.txt를 root:report 0640으로 만들어 group read만 허용하세요.", en: "Set report.txt to root:report 0640 to grant group read only." },
      "least-privilege": { ko: "service read는 허용하되 append와 guest read는 모두 거부되어야 합니다.", en: "Allow service read while denying both append and guest read." },
      "listener-address": { ko: "127.0.0.1은 원격 목적지와 match하지 않습니다. 0.0.0.0:8080 경계를 확인하세요.", en: "127.0.0.1 does not match the remote destination. Check the 0.0.0.0:8080 boundary." },
      "descriptor-boundary": { ko: "listener fd 3, accepted fd 4, regular-file fd 5를 분리하고 send에는 fd 4만 사용하세요.", en: "Separate listener fd 3, accepted fd 4, and regular-file fd 5; use only fd 4 for send." },
      incomplete: { ko: "모든 상태 값을 채운 뒤 가장 작은 복구가 각 불변식을 만족하는지 다시 계산하세요.", en: "Fill every state value, then recompute whether the smallest repair satisfies each invariant." },
    };
    return (messages[first] ?? messages.incomplete)[locale];
  }

  const selectBoolean = (
    id: TinyLinuxIncidentId,
    key: BooleanIncidentKey,
    label: string,
    inputRef?: typeof firstControlRef,
  ) => (
    <label>
      <span>{label}</span>
      <select
        ref={inputRef}
        value={String(answers[id]?.[key] ?? "")}
        onChange={(event) => updateAnswer(id, key, event.target.value ? event.target.value === "true" : undefined)}
      >
        <option value="">—</option>
        <option value="true">true</option>
        <option value="false">false</option>
      </select>
    </label>
  );

  return (
    <InteractiveLab
      kicker={t("별도 활동 · CROSS-LAYER INCIDENTS", "SEPARATE ACTIVITY · CROSS-LAYER INCIDENTS")}
      title={t("마지막 성공 표식 뒤의 한 계약만 수리하세요", "Repair one contract after the last good marker")}
      description={t(
        "각 제출은 fixture에 적용되어 전체 상태가 다시 계산됩니다. root·chmod 777 같은 넓은 우회나 fd 혼동은 일부 값이 맞아도 통과하지 않습니다.",
        "Every submission is applied to its fixture and the full state is recomputed. Broad root or chmod 777 bypasses and fd confusion fail even when some values happen to match.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetIncidents}>{t("사건 초기화", "Reset incidents")}</button>}
      className="tiny-system-incident-lab"
    >
      <span data-interactive-ready={interactiveReady ? "true" : "false"} hidden />
      {engineError ? (
        <div className="tiny-system-runtime-fallback" role="alert">
          <strong>{t("runtime fallback", "Runtime fallback")}</strong>
          <p>{engineError}</p>
          <button type="button" className="button button-secondary" onClick={resetIncidents}>{t("결정론적 사건 다시 시작", "Restart deterministic incidents")}</button>
        </div>
      ) : null}
      <div className="tiny-system-incident-progress" role="status" aria-live="polite">
        <strong>{completedCount} / {tinyLinuxIncidentIds.length}</strong>
        <span>{completedCount === tinyLinuxIncidentIds.length ? t("네 경계를 모두 최소 수정으로 복구했습니다.", "All four boundaries were recovered with minimal repairs.") : t("완료한 commissioning 사건", "Commissioning incidents solved")}</span>
      </div>
      <div className="tiny-system-incident-grid">
        {tinyLinuxIncidentIds.map((id, index) => {
          const result = results[id];
          const copy = incidentCopy[id];
          const feedbackId = `tiny-system-${id}-feedback`;
          return (
            <fieldset
              className={`tiny-system-incident-card${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={id}
            >
              <legend>{copy.title[locale]}</legend>
              <pre aria-label={t(`${copy.title.ko} 로그`, `${copy.title.en} log`)}>{copy.log}</pre>
              <p>{copy.clue[locale]}</p>

              {id === "init-handoff" ? (
                <div className="tiny-system-incident-controls">
                  <label><span>{t("PID 1 경로", "PID 1 path")}</span><select ref={index === 0 ? firstControlRef : undefined} aria-label={t("init 사건 PID 1 경로", "Init incident PID 1 path")} value={answers[id]?.initPath ?? ""} onChange={(event) => updateAnswer(id, "initPath", event.target.value as TinyLinuxIncidentSubmission["initPath"])}><option value="">—</option><option value="/sbin/init">/sbin/init</option><option value="/init">/init</option></select></label>
                  {selectBoolean(id, "preserveKernel", t("기존 kernel 보존", "Preserve existing kernel"))}
                  {selectBoolean(id, "preserveInitramfs", t("기존 initramfs 보존", "Preserve existing initramfs"))}
                </div>
              ) : null}

              {id === "pid1-supervision" ? (
                <div className="tiny-system-incident-controls">
                  <label><span>{t("zombie 처리", "Zombie action")}</span><select aria-label={t("PID 1 사건 zombie 처리", "PID 1 incident zombie action")} value={answers[id]?.reapAction ?? ""} onChange={(event) => updateAnswer(id, "reapAction", event.target.value as TinyLinuxIncidentSubmission["reapAction"])}><option value="">—</option><option value="wait-child">wait(child)</option><option value="signal-zombie">signal(zombie)</option><option value="replace-pid1">replace PID 1</option></select></label>
                  <label><span>{t("서비스 재시작", "Service restart")}</span><select aria-label={t("PID 1 사건 서비스 재시작", "PID 1 incident service restart")} value={answers[id]?.restartAction ?? ""} onChange={(event) => updateAnswer(id, "restartAction", event.target.value as TinyLinuxIncidentSubmission["restartAction"])}><option value="">—</option><option value="spawn-child">spawn child</option><option value="replace-pid1">replace PID 1</option><option value="none">none</option></select></label>
                  <label><span>{t("새 PID", "New PID")}</span><input aria-label={t("PID 1 사건 새 PID", "PID 1 incident new PID")} type="number" inputMode="numeric" value={answers[id]?.restartedPid ?? ""} onChange={(event) => updateAnswer(id, "restartedPid", numberValue(event.target.value))} /></label>
                  <label><span>{t("새 PPID", "New PPID")}</span><input aria-label={t("PID 1 사건 새 PPID", "PID 1 incident new PPID")} type="number" inputMode="numeric" value={answers[id]?.restartedPpid ?? ""} onChange={(event) => updateAnswer(id, "restartedPpid", numberValue(event.target.value))} /></label>
                  {selectBoolean(id, "pid1Remains", t("PID 1 유지", "PID 1 remains"))}
                </div>
              ) : null}

              {id === "report-access" ? (
                <div className="tiny-system-incident-controls">
                  <label><span>reportd UID</span><select aria-label={t("권한 사건 service UID", "Permission incident service UID")} value={answers[id]?.serviceUid ?? ""} onChange={(event) => updateAnswer(id, "serviceUid", numberValue(event.target.value))}><option value="">—</option><option value="0">0 · root</option><option value="1100">1100 · report</option></select></label>
                  <label><span>reportd GID</span><select aria-label={t("권한 사건 service GID", "Permission incident service GID")} value={answers[id]?.serviceGid ?? ""} onChange={(event) => updateAnswer(id, "serviceGid", numberValue(event.target.value))}><option value="">—</option><option value="0">0 · root</option><option value="4000">4000 · report</option></select></label>
                  <label><span>/srv mode</span><select aria-label={t("권한 사건 directory mode", "Permission incident directory mode")} value={answers[id]?.directoryMode ?? ""} onChange={(event) => updateAnswer(id, "directoryMode", event.target.value)}><option value="">—</option><option value="0750">0750</option><option value="0777">0777</option></select></label>
                  <label><span>report group</span><select aria-label={t("권한 사건 report group", "Permission incident report group")} value={answers[id]?.reportGroupGid ?? ""} onChange={(event) => updateAnswer(id, "reportGroupGid", numberValue(event.target.value))}><option value="">—</option><option value="0">0 · root</option><option value="4000">4000 · report</option></select></label>
                  <label><span>report mode</span><select aria-label={t("권한 사건 report mode", "Permission incident report mode")} value={answers[id]?.reportMode ?? ""} onChange={(event) => updateAnswer(id, "reportMode", event.target.value)}><option value="">—</option><option value="0600">0600</option><option value="0640">0640</option><option value="0666">0666</option></select></label>
                </div>
              ) : null}

              {id === "remote-listener" ? (
                <div className="tiny-system-incident-controls">
                  <label><span>{t("listen 주소", "Listen address")}</span><select aria-label={t("listener 사건 listen 주소", "Listener incident listen address")} value={answers[id]?.listenAddress ?? ""} onChange={(event) => updateAnswer(id, "listenAddress", event.target.value)}><option value="">—</option><option value="127.0.0.1">127.0.0.1</option><option value="0.0.0.0">0.0.0.0</option></select></label>
                  <label><span>{t("listen port", "Listen port")}</span><select aria-label={t("listener 사건 listen port", "Listener incident listen port")} value={answers[id]?.listenPort ?? ""} onChange={(event) => updateAnswer(id, "listenPort", numberValue(event.target.value))}><option value="">—</option><option value="8080">8080</option><option value="8081">8081</option></select></label>
                  {(["listenerFd", "acceptedFd", "fileFd", "sendFd"] as const).map((key) => <label key={key}><span>{key}</span><input aria-label={t(`listener 사건 ${key}`, `Listener incident ${key}`)} type="number" inputMode="numeric" value={answers[id]?.[key] ?? ""} onChange={(event) => updateAnswer(id, key, numberValue(event.target.value))} /></label>)}
                </div>
              ) : null}

              <button type="button" className="button button-secondary" onClick={() => checkIncident(id)}>{t("상태 재계산·진단", "Recompute state and diagnose")}</button>
              {result ? <div className="tiny-system-incident-feedback" id={feedbackId} role="status" aria-live="polite"><strong>{result.correct ? t("복구 계약 통과", "Repair contract passed") : t("계약을 다시 추적하세요", "Trace the contract again")}</strong><p>{feedback(id, result)}</p></div> : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

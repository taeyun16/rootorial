import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  applyProcessIncidentAction,
  createProcessIncident,
  isProcessIncidentComplete,
  processIncidentActionIds,
  processIncidentIds,
  type ProcessIncidentAction,
  type ProcessIncidentId,
  type ProcessMachine,
} from "../../features/linux-runtime/processes-and-signals";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { LinuxProcessStateView, processEventText } from "./LinuxProcessStateView";

const incidentCopy: Record<ProcessIncidentId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
  goal: { ko: string; en: string };
  complete: { ko: string; en: string };
}> = {
  "stopped-worker": {
    title: { ko: "사건 1 · T 상태 worker", en: "Incident 1 · Worker in T" },
    clue: {
      ko: "PID 73은 종료된 것이 아니라 SIGSTOP으로 멈췄습니다. 같은 PID가 다시 stdout을 쓰게 만드세요.",
      en: "PID 73 did not exit; SIGSTOP paused it. Make the same PID write to stdout again.",
    },
    goal: { ko: "목표: T → R → tick", en: "Goal: T → R → tick" },
    complete: { ko: "같은 PID 73이 재개되어 새 tick을 출력했습니다.", en: "The same PID 73 resumed and produced a new tick." },
  },
  "sleeping-reader": {
    title: { ko: "사건 2 · pipe 입력 대기", en: "Incident 2 · Waiting for pipe input" },
    clue: {
      ko: "PID 73은 T가 아니라 S입니다. stdin에 실제 데이터를 넣고 그 데이터가 stdout에 도달하게 하세요.",
      en: "PID 73 is in S, not T. Put real data on stdin and make it reach stdout.",
    },
    goal: { ko: "목표: input → R → tick → S", en: "Goal: input → R → tick → S" },
    complete: { ko: "pipe 입력이 프로세스를 깨우고 stdout에 전달된 뒤 다시 S가 됐습니다.", en: "Pipe input woke the process, reached stdout, and the reader returned to S." },
  },
  "zombie-child": {
    title: { ko: "사건 3 · 이미 종료한 자식", en: "Incident 3 · Child already exited" },
    clue: {
      ko: "PID 73은 Z이며 CPU에서 실행되지 않습니다. 부모 sh가 종료 정보를 회수해 행을 없애게 하세요.",
      en: "PID 73 is Z and no longer executes on the CPU. Have parent sh collect its status and remove the row.",
    },
    goal: { ko: "목표: Z → waitpid → 행 없음", en: "Goal: Z → waitpid → no row" },
    complete: { ko: "waitpid가 shell status 143을 회수하고 zombie 행을 제거했습니다.", en: "waitpid collected shell status 143 and removed the zombie row." },
  },
  "term-resistant": {
    title: { ko: "사건 4 · SIGTERM 무시", en: "Incident 4 · SIGTERM ignored" },
    clue: {
      ko: "PID 73은 이미 SIGTERM을 무시했다는 기록이 있습니다. 강제 종료 뒤에도 부모가 종료 정보를 회수해야 합니다.",
      en: "The trace already shows PID 73 ignored SIGTERM. After forcing exit, the parent must still collect its status.",
    },
    goal: { ko: "목표: SIGKILL → Z(137) → waitpid", en: "Goal: SIGKILL → Z(137) → waitpid" },
    complete: { ko: "SIGKILL 뒤 shell status 137을 waitpid로 회수했습니다.", en: "After SIGKILL, waitpid collected shell status 137." },
  },
};

const actionCopy: Record<ProcessIncidentAction, { ko: string; en: string }> = {
  tick: { ko: "worker queue 1 tick", en: "Run one worker-queue tick" },
  SIGCONT: { ko: "SIGCONT 보내기", en: "Send SIGCONT" },
  SIGTERM: { ko: "SIGTERM 보내기", en: "Send SIGTERM" },
  SIGKILL: { ko: "SIGKILL 보내기", en: "Send SIGKILL" },
  waitpid: { ko: "부모가 waitpid 실행", en: "Parent runs waitpid" },
  "feed-pipe": { ko: "pipe stdin에 입력", en: "Write to pipe stdin" },
};

function initialMachines() {
  return Object.fromEntries(
    processIncidentIds.map((id) => [id, createProcessIncident(id)]),
  ) as Record<ProcessIncidentId, ProcessMachine>;
}

function initialActions() {
  return Object.fromEntries(processIncidentIds.map((id) => [id, ""])) as Record<
    ProcessIncidentId,
    ProcessIncidentAction | ""
  >;
}

function initialInputs() {
  return Object.fromEntries(processIncidentIds.map((id) => [id, "hello"] as const)) as Record<ProcessIncidentId, string>;
}

function initialFeedback(locale: "ko" | "en") {
  return Object.fromEntries(processIncidentIds.map((id) => [id, incidentCopy[id].clue[locale]])) as Record<ProcessIncidentId, string>;
}

export function LinuxProcessIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [machines, setMachines] = useState(initialMachines);
  const [actions, setActions] = useState(initialActions);
  const [inputs, setInputs] = useState(initialInputs);
  const [feedback, setFeedback] = useState(() => initialFeedback(locale));
  const [tones, setTones] = useState<Record<ProcessIncidentId, "idle" | "correct" | "incorrect">>(() => Object.fromEntries(processIncidentIds.map((id) => [id, "idle"])) as Record<ProcessIncidentId, "idle">);
  const [completed, setCompleted] = useState<Partial<Record<ProcessIncidentId, boolean>>>({});
  const [engineError, setEngineError] = useState("");
  const completedCount = processIncidentIds.filter((id) => completed[id]).length;
  const allComplete = completedCount === processIncidentIds.length;

  useEffect(() => onCompletionChange?.(allComplete), [allComplete, onCompletionChange]);
  useEffect(() => {
    setFeedback(Object.fromEntries(processIncidentIds.map((id) => {
      if (completed[id]) return [id, incidentCopy[id].complete[locale]];
      const event = machines[id].events.at(-1);
      return [id, event ? processEventText(event, locale) : incidentCopy[id].clue[locale]];
    })) as Record<ProcessIncidentId, string>);
  }, [locale]);

  function resetIncident(id: ProcessIncidentId) {
    setMachines((current) => ({ ...current, [id]: createProcessIncident(id) }));
    setActions((current) => ({ ...current, [id]: "" }));
    setInputs((current) => ({ ...current, [id]: "hello" }));
    setFeedback((current) => ({ ...current, [id]: incidentCopy[id].clue[locale] }));
    setTones((current) => ({ ...current, [id]: "idle" }));
    setCompleted((current) => ({ ...current, [id]: false }));
    setEngineError("");
  }

  function resetAll() {
    setMachines(initialMachines());
    setActions(initialActions());
    setInputs(initialInputs());
    setFeedback(initialFeedback(locale));
    setTones(Object.fromEntries(processIncidentIds.map((id) => [id, "idle"])) as Record<ProcessIncidentId, "idle">);
    setCompleted({});
    setEngineError("");
  }

  function isProductive(id: ProcessIncidentId, reason: string) {
    if (id === "stopped-worker") return reason === "continued" || reason === "tick-ran";
    if (id === "sleeping-reader") return reason === "pipe-input-ready" || reason === "tick-ran";
    if (id === "zombie-child") return reason === "reaped";
    return reason === "killed" || reason === "reaped";
  }

  function runAction(id: ProcessIncidentId) {
    const action = actions[id];
    if (!action || completed[id]) return;
    try {
      const transition = applyProcessIncidentAction(machines[id], action, inputs[id]);
      const solved = isProcessIncidentComplete(id, transition.machine);
      const event = transition.machine.events.at(-1);
      setMachines((current) => ({ ...current, [id]: transition.machine }));
      setCompleted((current) => ({ ...current, [id]: solved }));
      setTones((current) => ({
        ...current,
        [id]: solved || isProductive(id, transition.reason) ? "correct" : "incorrect",
      }));
      setFeedback((current) => ({
        ...current,
        [id]: solved
          ? incidentCopy[id].complete[locale]
          : event
            ? processEventText(event, locale)
            : incidentCopy[id].clue[locale],
      }));
      setActions((current) => ({ ...current, [id]: "" }));
      setEngineError("");
    } catch {
      setEngineError(t(
        "사건 모델을 실행하지 못했습니다. 각 사건을 초기화해 네트워크 없이 다시 시도하세요.",
        "The incident model could not run. Reset the incident and retry without a network runtime.",
      ));
      onCompletionChange?.(false);
    }
  }

  return (
    <InteractiveLab
      kicker={t("별도 활동 · STATE DEBUGGER", "SEPARATE ACTIVITY · STATE DEBUGGER")}
      title={t("상태의 원인을 고쳐 같은 PID의 다음 결과를 만드세요", "Repair the cause of each state and produce the next result")}
      description={t(
        "signal 이름을 맞히는 퀴즈가 아닙니다. 선택한 동작을 같은 상태 머신에 적용하고, 실제 PID·상태·stdout·wait 결과가 사건의 목표를 만족하는지 판정합니다.",
        "This is not a signal-name quiz. Each chosen action runs through the same state machine and is graded by the resulting PID, state, stdout, and wait evidence.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetAll}>{t("사건 전체 초기화", "Reset all incidents")}</button>}
      className="process-incident-lab"
    >
      {engineError ? <div className="process-engine-error" role="alert">{engineError}</div> : null}
      <div className="process-incident-progress" role="status" aria-live="polite">
        <strong>{completedCount} / {processIncidentIds.length}</strong>
        <span>{allComplete ? t("네 사건을 상태 변화로 해결했습니다.", "All four incidents are solved by state evidence.") : t("각 사건의 목표 상태까지 여러 동작을 이어도 됩니다.", "You may chain multiple actions until each goal state is reached.")}</span>
      </div>

      <div className="process-incident-grid">
        {processIncidentIds.map((id) => {
          const copy = incidentCopy[id];
          const solved = completed[id] === true;
          return (
            <fieldset className={`process-incident-card${solved ? " is-correct" : tones[id] === "incorrect" ? " is-incorrect" : ""}`} key={id}>
              <legend>{copy.title[locale]}</legend>
              <p>{copy.clue[locale]}</p>
              <strong className="process-incident-goal">{copy.goal[locale]}</strong>
              <LinuxProcessStateView machine={machines[id]} locale={locale} compact />
              <label>
                <span>{t("다음 동작", "Next action")}</span>
                <select
                  aria-label={t("프로세스 동작", "Process action")}
                  value={actions[id]}
                  disabled={solved}
                  onChange={(event) => {
                    const nextAction = event.currentTarget.value as ProcessIncidentAction | "";
                    setActions((current) => ({ ...current, [id]: nextAction }));
                  }}
                >
                  <option value="">{t("동작 선택", "Choose an action")}</option>
                  {processIncidentActionIds.map((action) => <option value={action} key={action}>{actionCopy[action][locale]}</option>)}
                </select>
              </label>
              <label>
                <span>{t("pipe 입력 데이터", "Pipe input data")}</span>
                <input
                  type="text"
                  value={inputs[id]}
                  disabled={solved}
                  maxLength={40}
                  onChange={(event) => {
                    const nextInput = event.currentTarget.value;
                    setInputs((current) => ({ ...current, [id]: nextInput }));
                  }}
                />
              </label>
              <button type="button" className="button button-primary" disabled={!actions[id] || solved} onClick={() => runAction(id)}>
                {solved ? t("사건 해결됨", "Incident solved") : t("동작 실행·상태 판정", "Run action and grade state")}
              </button>
              <div className={`process-incident-feedback is-${tones[id]}`} role="status" aria-live="polite" aria-atomic="true">
                <strong>{solved ? t("목표 상태 도달", "Goal state reached") : tones[id] === "incorrect" ? t("상태를 다시 읽으세요", "Read the state again") : t("관찰", "Observation")}</strong>
                <span>{feedback[id]}</span>
              </div>
              <button type="button" className="text-link" onClick={() => resetIncident(id)}>{t("이 사건 초기화", "Reset this incident")}</button>
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

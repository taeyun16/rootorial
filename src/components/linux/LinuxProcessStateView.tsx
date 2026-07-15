import {
  processStateCodes,
  type ProcessEvent,
  type ProcessMachine,
  type ProcessState,
} from "../../features/linux-runtime/processes-and-signals";

const stateCopy: Record<ProcessState, { ko: string; en: string }> = {
  runnable: { ko: "실행 가능", en: "runnable" },
  sleeping: { ko: "대기", en: "sleeping" },
  stopped: { ko: "정지", en: "stopped" },
  zombie: { ko: "종료됨 · wait 대기", en: "exited · awaiting wait" },
};

export function processEventText(event: ProcessEvent, locale: "ko" | "en") {
  const pid = event.pid ?? "—";
  const copy = {
    spawned: {
      ko: `sh가 fork로 새 자식을 만들었습니다(PID ${pid}). 자식의 exec는 같은 PID에 프로그램을 올렸습니다.`,
      en: `sh forked PID ${pid}; the child's exec loaded a program into that same PID.`,
    },
    "tick-ran": {
      ko: `PID ${pid}가 한 번 실행되어 연결된 stdout에 기록했습니다.`,
      en: `PID ${pid} ran for one tick and wrote to its connected stdout.`,
    },
    "no-runnable-child": {
      ko: "R 상태인 자식이 없어 실행할 수 없습니다.",
      en: "No child is runnable, so no tick can run.",
    },
    stopped: { ko: `PID ${pid}: T 상태로 정지했습니다.`, en: `PID ${pid} entered stopped state T.` },
    "already-stopped": { ko: `PID ${pid}는 이미 정지 상태입니다.`, en: `PID ${pid} is already stopped.` },
    continued: { ko: `PID ${pid}: 다시 R 상태가 됐습니다.`, en: `PID ${pid} returned to runnable state R.` },
    "continued-to-sleep": { ko: `PID ${pid}는 정지는 풀렸지만 입력을 기다리는 S 상태입니다.`, en: `PID ${pid} is no longer stopped, but still sleeps waiting for input.` },
    "not-stopped": { ko: `PID ${pid}는 T 상태가 아니어서 SIGCONT가 바꿀 상태가 없습니다.`, en: `PID ${pid} is not in T, so SIGCONT has no stopped state to restore.` },
    "term-cleanup": { ko: `PID ${pid}: SIGTERM을 처리해 정리한 뒤 Z 상태가 됐습니다.`, en: `PID ${pid} handled SIGTERM, cleaned up, and entered Z.` },
    "term-default": { ko: `PID ${pid}: SIGTERM의 기본 동작으로 종료되어 Z 상태가 됐습니다.`, en: `PID ${pid} took SIGTERM's default action and entered Z.` },
    "term-ignored": { ko: `PID ${pid}: SIGTERM을 무시해 계속 실행 가능합니다.`, en: `PID ${pid} ignored SIGTERM and remains runnable.` },
    "term-pending": { ko: `정지 중인 PID ${pid}에 SIGTERM이 보류됐습니다.`, en: `SIGTERM is pending for stopped PID ${pid}.` },
    killed: { ko: `PID ${pid}: SIGKILL로 즉시 종료되어 Z 상태, shell status 137이 됐습니다.`, en: `SIGKILL ended PID ${pid} immediately; it is Z with shell status 137.` },
    "zombie-cannot-receive-signal": { ko: `PID ${pid}는 이미 실행을 끝낸 zombie라 signal로 거둘 수 없습니다.`, en: `PID ${pid} has already exited; a signal cannot reap a zombie.` },
    reaped: { ko: `sh가 waitpid(${pid})로 종료 정보를 회수해 행을 제거했습니다.`, en: `sh collected PID ${pid}'s status with waitpid and removed its row.` },
    "child-still-running": { ko: `PID ${pid}는 아직 종료하지 않아 waitpid로 거둘 수 없습니다.`, en: `PID ${pid} has not exited, so waitpid cannot reap it yet.` },
    "process-not-found": { ko: `PID ${pid} 자식을 찾지 못했습니다.`, en: `Child PID ${pid} was not found.` },
    "pipe-input-ready": { ko: `pipe 입력이 PID ${pid}를 S에서 R로 깨웠습니다.`, en: `Pipe input woke PID ${pid} from S to R.` },
    "pipe-input-queued-while-stopped": { ko: `입력은 도착했지만 PID ${pid}는 T 상태라 SIGCONT가 필요합니다.`, en: `Input arrived, but PID ${pid} remains in T until SIGCONT.` },
    "not-a-pipe-reader": { ko: `PID ${pid}의 stdin은 이 pipe 입력과 연결되지 않았습니다.`, en: `PID ${pid}'s stdin is not connected to this pipe input.` },
    "empty-pipe-input": { ko: "빈 입력은 대기 조건을 충족하지 않습니다.", en: "Empty input does not satisfy the wait condition." },
  } as const;
  return copy[event.reason][locale];
}

export function LinuxProcessStateView({
  machine,
  locale,
  compact = false,
}: {
  machine: ProcessMachine;
  locale: "ko" | "en";
  compact?: boolean;
}) {
  const t = (ko: string, en: string) => locale === "ko" ? ko : en;
  const recentEvents = machine.events.slice(-5).reverse();
  const displayedProcesses = compact
    ? machine.processes.filter((process) => process.ppid === 42)
    : machine.processes;

  return (
    <div className={`process-state-view${compact ? " is-compact" : ""}`}>
      <section className="process-tree-panel" aria-labelledby={compact ? undefined : "process-tree-heading"}>
        {compact ? null : <h4 id="process-tree-heading">{t("프로세스 트리", "Process tree")}</h4>}
        <ul className="process-card-list" aria-label={t("현재 프로세스 상태", "Current process states")}>
          {displayedProcesses.length === 0 ? (
            <li className="process-card-empty">{t("자식 행 없음 · wait 완료", "No child row · wait complete")}</li>
          ) : null}
          {displayedProcesses.map((process) => (
            <li className={`process-card is-${process.state}`} key={process.pid}>
              <div className="process-card-identity">
                <span>PID</span>
                <strong>{process.pid}</strong>
              </div>
              <dl>
                <div><dt>PPID</dt><dd>{process.ppid}</dd></div>
                <div><dt>{t("명령", "COMMAND")}</dt><dd><code>{process.command}</code></dd></div>
                <div>
                  <dt>{t("상태", "STATE")}</dt>
                  <dd><strong>{processStateCodes[process.state]}</strong> · {stateCopy[process.state][locale]}</dd>
                </div>
                <div><dt>stdin · 0</dt><dd>{process.stdin}</dd></div>
                <div><dt>stdout · 1</dt><dd>{process.stdout === "file" ? "out.log" : "terminal"}</dd></div>
                <div><dt>stderr · 2</dt><dd>{process.stderr}</dd></div>
              </dl>
              {process.shellStatus === undefined ? null : (
                <p className="process-exit-status">shell status {process.shellStatus} · {process.exitCause}</p>
              )}
            </li>
          ))}
        </ul>
      </section>

      <div className="process-output-grid">
        <section aria-label={t("터미널 stdout", "Terminal stdout")}>
          <h4>terminal · stdout</h4>
          <pre>{machine.terminalOutput.length > 0 ? machine.terminalOutput.join("\n") : t("(아직 출력 없음)", "(no output yet)")}</pre>
        </section>
        <section aria-label={t("out.log 파일 stdout", "out.log file stdout")}>
          <h4>out.log · stdout</h4>
          <pre>{machine.fileOutput.length > 0 ? machine.fileOutput.join("\n") : t("(아직 출력 없음)", "(no output yet)")}</pre>
        </section>
      </div>

      {recentEvents.length > 0 ? (
        <details className="process-event-trace">
          <summary>{t("최근 상태 전이 보기", "Show recent transitions")}</summary>
          <ol>
            {recentEvents.map((event, index) => (
              <li key={`${event.reason}-${event.pid ?? "none"}-${machine.events.length - index}`}>
                {processEventText(event, locale)}
              </li>
            ))}
          </ol>
        </details>
      ) : null}
    </div>
  );
}

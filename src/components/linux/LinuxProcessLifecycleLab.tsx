import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  canMasterProcessLifecycle,
  createProcessMachine,
  nextRunnablePid,
  runSchedulerTick,
  sendSignal,
  spawnChild,
  waitForChild,
  type LifecycleEvidence,
  type ProcessOutputTarget,
  type ProcessSignal,
  type ProcessTransition,
} from "../../features/linux-runtime/processes-and-signals";
import { ChoiceField } from "../interactive/ChoiceField";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { LinuxProcessStateView, processEventText } from "./LinuxProcessStateView";

const initialEvidence = (): LifecycleEvidence => ({
  correctSpawnPredictions: 0,
  firstTickCorrect: false,
  secondTickCorrect: false,
  terminalOutputObserved: false,
  fileOutputObserved: false,
  stoppedProcessExcluded: false,
  continuedProcessScheduled: false,
  zombiePids: [],
  reapedPids: [],
});

type SpawnPrediction = "new-child-same-pid" | "shell-replaced" | "two-child-pids" | "";

function latestTransitionMessage(
  transition: ProcessTransition,
  locale: "ko" | "en",
) {
  const event = transition.machine.events.at(-1);
  return event ? processEventText(event, locale) : "";
}

export function LinuxProcessLifecycleLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [machine, setMachine] = useState(createProcessMachine);
  const [evidence, setEvidence] = useState<LifecycleEvidence>(initialEvidence);
  const [stdout, setStdout] = useState<ProcessOutputTarget>("terminal");
  const [spawnPrediction, setSpawnPrediction] = useState<SpawnPrediction>("");
  const [tickPrediction, setTickPrediction] = useState<number | "">("");
  const [targetPid, setTargetPid] = useState<number | "">("");
  const [signal, setSignal] = useState<ProcessSignal>("SIGSTOP");
  const [tickCount, setTickCount] = useState(0);
  const [stoppedPid, setStoppedPid] = useState<number | null>(null);
  const [continuedPid, setContinuedPid] = useState<number | null>(null);
  const [feedback, setFeedback] = useState(t(
    "stdout 목적지와 fork/exec 결과를 예측한 뒤 두 자식을 직접 만드세요.",
    "Choose stdout and predict the fork/exec result, then create two children yourself.",
  ));
  const [feedbackTone, setFeedbackTone] = useState<"idle" | "correct" | "incorrect">("idle");
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const children = machine.processes.filter((process) => process.ppid === 42);
  const complete = canMasterProcessLifecycle(machine, evidence);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange?.(complete), [complete, onCompletionChange]);
  useEffect(() => {
    setFeedback(locale === "ko"
      ? "현재 상태는 유지됩니다. 다음 조작을 선택해 수명주기 증거를 이어 가세요."
      : "The current state is preserved. Choose the next action and continue collecting lifecycle evidence.");
    setFeedbackTone("idle");
  }, [locale]);

  function resetLab() {
    setMachine(createProcessMachine());
    setEvidence(initialEvidence());
    setStdout("terminal");
    setSpawnPrediction("");
    setTickPrediction("");
    setTargetPid("");
    setSignal("SIGSTOP");
    setTickCount(0);
    setStoppedPid(null);
    setContinuedPid(null);
    setFeedback(t(
      "초기화했습니다. terminal worker와 redirected worker를 하나씩 만드세요.",
      "Reset complete. Create one terminal worker and one redirected worker.",
    ));
    setFeedbackTone("idle");
    setEngineError("");
  }

  function safely(run: () => void) {
    try {
      run();
      setEngineError("");
    } catch {
      setEngineError(t(
        "프로세스 모델이 예상하지 못한 상태를 만났습니다. 실습을 초기화하면 네트워크 없이 다시 시작할 수 있습니다.",
        "The process model reached an unexpected state. Reset the lab to restart without any network runtime.",
      ));
      onCompletionChange?.(false);
    }
  }

  function choosePreset(next: ProcessOutputTarget) {
    setStdout(next);
    setSpawnPrediction("");
    setFeedbackTone("idle");
    setFeedback(next === "terminal"
      ? t("다음 자식의 fd 1은 terminal을 가리킵니다.", "The next child's fd 1 will point to the terminal.")
      : t("셸이 바꾼 fd 1을 자식이 상속해 out.log를 가리킵니다.", "The child will inherit the shell's changed fd 1, which points to out.log."));
  }

  function spawnWorker() {
    safely(() => {
      if (!spawnPrediction || children.length >= 2) return;
      const transition = spawnChild(machine, { program: "cpu-worker", stdout });
      const correctPrediction = spawnPrediction === "new-child-same-pid";
      setMachine(transition.machine);
      setEvidence((current) => ({
        ...current,
        correctSpawnPredictions: current.correctSpawnPredictions + (correctPrediction ? 1 : 0),
      }));
      setTargetPid(transition.pid ?? "");
      setSpawnPrediction("");
      setTickPrediction("");
      setFeedbackTone(correctPrediction ? "correct" : "incorrect");
      setFeedback(correctPrediction
        ? t(
            `정확합니다. fork가 새 자식을 만들었습니다(PID ${transition.pid}). exec는 그 PID를 유지한 채 cpu_worker로 교체했습니다.`,
            `Correct. fork created child PID ${transition.pid}; exec kept that PID while replacing its image with cpu_worker.`,
          )
        : t(
            `실제 결과는 새 자식 PID ${transition.pid} 하나입니다. fork가 만들고, 그 자식의 exec는 새 PID를 만들지 않습니다. 완료 증거를 다시 모으려면 초기화하세요.`,
            `The result is one new child, PID ${transition.pid}. fork creates it; the child's exec does not create another PID. Reset to rebuild completion evidence.`,
          ));
    });
  }

  function tick() {
    safely(() => {
      if (tickPrediction === "") return;
      const expected = nextRunnablePid(machine);
      const transition = runSchedulerTick(machine);
      const correctPrediction = transition.pid === tickPrediction;
      const stoppedWasExcluded = stoppedPid !== null
        && machine.processes.some((process) => process.pid === stoppedPid && process.state === "stopped")
        && transition.pid !== stoppedPid
        && correctPrediction;
      const continuedWasScheduled = continuedPid !== null
        && transition.pid === continuedPid
        && correctPrediction;
      setMachine(transition.machine);
      setEvidence((current) => ({
        ...current,
        firstTickCorrect: current.firstTickCorrect || (tickCount === 0 && transition.pid === 73 && correctPrediction),
        secondTickCorrect: current.secondTickCorrect || (tickCount === 1 && transition.pid === 74 && correctPrediction),
        terminalOutputObserved: current.terminalOutputObserved || transition.outputTarget === "terminal",
        fileOutputObserved: current.fileOutputObserved || transition.outputTarget === "file",
        stoppedProcessExcluded: current.stoppedProcessExcluded || stoppedWasExcluded,
        continuedProcessScheduled: current.continuedProcessScheduled || continuedWasScheduled,
      }));
      setTickCount((current) => current + (transition.pid === undefined ? 0 : 1));
      setTickPrediction("");
      setFeedbackTone(correctPrediction ? "correct" : "incorrect");
      setFeedback(correctPrediction
        ? t(
            `예측한 PID ${transition.pid}가 실행됐습니다. ${transition.outputTarget === "file" ? "fd 1이 out.log라 파일에" : "fd 1이 terminal이라 화면에"} 기록했습니다.`,
            `Predicted PID ${transition.pid} ran. Its fd 1 points to ${transition.outputTarget === "file" ? "out.log, so the write went to the file" : "the terminal, so the write appeared on screen"}.`,
          )
        : t(
            `예측은 PID ${tickPrediction}, 실제 runnable queue의 다음 값은 ${expected ?? "없음"}입니다. T·S·Z 상태는 이 교육용 worker queue에서 제외됩니다.`,
            `You predicted PID ${tickPrediction}; the next runnable PID was ${expected ?? "none"}. T, S, and Z are excluded from this teaching worker queue.`,
          ));
    });
  }

  function deliverSignal() {
    safely(() => {
      if (targetPid === "") return;
      const transition = sendSignal(machine, targetPid, signal);
      setMachine(transition.machine);
      setTickPrediction("");
      if (transition.reason === "stopped") {
        setStoppedPid(targetPid);
        setContinuedPid(null);
      }
      if (transition.reason === "continued") setContinuedPid(targetPid);
      if (transition.reason === "term-cleanup" || transition.reason === "term-default") {
        setEvidence((current) => ({
          ...current,
          zombiePids: [...current.zombiePids, targetPid],
        }));
      }
      const expectedLifecycleSignal = transition.reason === "stopped"
        || transition.reason === "continued"
        || transition.reason === "term-cleanup";
      setFeedbackTone(expectedLifecycleSignal ? "correct" : "incorrect");
      setFeedback(latestTransitionMessage(transition, locale));
    });
  }

  function reapTarget() {
    safely(() => {
      if (targetPid === "") return;
      const transition = waitForChild(machine, targetPid);
      setMachine(transition.machine);
      setTickPrediction("");
      if (transition.reason === "reaped") {
        setEvidence((current) => ({
          ...current,
          reapedPids: [...current.reapedPids, targetPid],
        }));
        const remaining = transition.machine.processes.filter((process) => process.ppid === 42);
        setTargetPid(remaining[0]?.pid ?? "");
      }
      setFeedbackTone(transition.reason === "reaped" ? "correct" : "incorrect");
      setFeedback(latestTransitionMessage(transition, locale));
    });
  }

  const evidenceRows = [
    [evidence.correctSpawnPredictions >= 2, t("fork/exec 예측 2회", "Two fork/exec predictions")],
    [evidence.firstTickCorrect && evidence.secondTickCorrect, t("73 → 74 순서 예측", "Predict 73 → 74 order")],
    [evidence.terminalOutputObserved && evidence.fileOutputObserved, t("terminal·out.log 출력 관찰", "Observe terminal and out.log")],
    [evidence.stoppedProcessExcluded, t("정지 프로세스 제외 관찰", "Observe stopped process exclusion")],
    [evidence.continuedProcessScheduled, t("같은 PID 재개 관찰", "Observe same PID resume")],
    [new Set(evidence.zombiePids).size >= 2, t("SIGTERM 뒤 Z 두 개 관찰", "Observe two Z states after SIGTERM")],
    [new Set(evidence.reapedPids).size >= 2, t("waitpid로 두 자식 회수", "Reap both children with waitpid")],
  ] as const;

  return (
    <InteractiveLab
      kicker={t("필수 실습 · PROCESS LIFECYCLE", "REQUIRED LAB · PROCESS LIFECYCLE")}
      title={t("두 자식을 만들고 멈추고 거두세요", "Create, stop, resume, and reap two children")}
      description={t(
        "이 모델은 일반적인 셸의 fork→exec→run→exit→wait 인과관계와 작은 round-robin worker queue만 재현합니다. 실제 Linux CFS를 흉내 낸 스케줄러가 아닙니다.",
        "This model reproduces the causal fork→exec→run→exit→wait path of a typical shell plus a tiny round-robin worker queue. It does not claim to emulate Linux CFS.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetLab}>{t("실습 초기화", "Reset lab")}</button>}
      className="process-lifecycle-lab"
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"}>
        {interactiveReady ? t("프로세스 실습 조작 준비 완료", "Process lab controls ready") : t("프로세스 실습 준비 중", "Preparing process lab")}
      </span>
      {engineError ? <div className="process-engine-error" role="alert">{engineError}</div> : null}

      <div className="process-preset-bar" role="group" aria-label={t("stdout 연결 프리셋", "stdout connection presets")}>
        <span>{t("다음 자식", "NEXT CHILD")}</span>
        <button type="button" aria-pressed={stdout === "terminal"} onClick={() => choosePreset("terminal")}>terminal worker</button>
        <button type="button" aria-pressed={stdout === "file"} onClick={() => choosePreset("file")}>redirected → out.log</button>
      </div>

      <div className="process-spawn-controls">
        <ChoiceField label={t("자식 stdout · fd 1", "Child stdout · fd 1")} value={stdout} onValueChange={choosePreset} options={[{ value: "terminal", label: "terminal" }, { value: "file", label: "out.log" }]} />
        <ChoiceField label={t("fork 뒤 자식이 exec하면?", "After the child execs?")} value={spawnPrediction} onValueChange={setSpawnPrediction} options={[
          { value: "new-child-same-pid", label: t("새 자식 1개, exec 뒤에도 같은 PID", "One new child; same PID after exec") },
          { value: "shell-replaced", label: t("셸 자체가 프로그램으로 교체됨", "The shell itself is replaced") },
          { value: "two-child-pids", label: t("fork와 exec가 PID를 하나씩 만듦", "fork and exec each create a PID") },
        ]} />
        <button
          type="button"
          className="button button-primary"
          disabled={!spawnPrediction || children.length >= 2}
          onClick={spawnWorker}
        >
          {children.length >= 2 ? t("자식 2개 생성됨", "Two children created") : t("fork → exec 실행", "Run fork → exec")}
        </button>
      </div>

      <LinuxProcessStateView machine={machine} locale={locale} />

      <div className="process-action-grid">
        <fieldset>
          <legend>{t("실행 순서 예측", "Predict the run order")}</legend>
          <ChoiceField label={t("다음 worker PID", "Next worker PID")} value={tickPrediction} onValueChange={setTickPrediction} options={children.map((process) => ({ value: process.pid, label: `PID ${process.pid} · ${process.state}` }))} />
          <button type="button" className="button button-primary" disabled={tickPrediction === ""} onClick={tick}>
            {t("worker queue 1 tick 실행", "Run one worker-queue tick")}
          </button>
        </fieldset>

        <fieldset>
          <legend>{t("상태 전이 조작", "Manipulate lifecycle state")}</legend>
          <ChoiceField label={t("대상 자식", "Target child")} value={targetPid} onValueChange={setTargetPid} options={children.map((process) => ({ value: process.pid, label: `PID ${process.pid} · ${processStateLabel(process.state, locale)}` }))} />
          <ChoiceField label="signal" value={signal} onValueChange={setSignal} options={[
            { value: "SIGSTOP", label: "SIGSTOP · T" },
            { value: "SIGCONT", label: "SIGCONT · resume" },
            { value: "SIGTERM", label: "SIGTERM · cleanup" },
            { value: "SIGKILL", label: "SIGKILL · force" },
          ]} />
          <div className="process-action-buttons">
            <button type="button" className="button button-secondary" disabled={targetPid === ""} onClick={deliverSignal}>{t("signal 보내기", "Send signal")}</button>
            <button type="button" className="button button-secondary" disabled={targetPid === ""} onClick={reapTarget}>waitpid</button>
          </div>
        </fieldset>
      </div>

      <div className={`process-live-feedback is-${feedbackTone}`} role="status" aria-live="polite" aria-atomic="true">
        <strong>{complete ? t("필수 실습 완료", "Required lab complete") : t("최근 관찰", "Latest observation")}</strong>
        <span>{complete ? t("두 자식의 PID·stdio·상태·종료 정보를 모두 근거로 확인했습니다.", "You verified both children's PID, stdio, state, and termination evidence.") : feedback}</span>
      </div>

      <div className="process-evidence-checklist" aria-label={t("필수 실습 증거", "Required lab evidence")}>
        {evidenceRows.map(([done, label]) => <span className={done ? "is-complete" : undefined} key={label}>{done ? "✓" : "○"} {label}</span>)}
      </div>
    </InteractiveLab>
  );
}

function processStateLabel(state: string, locale: "ko" | "en") {
  const labels: Record<string, { ko: string; en: string }> = {
    runnable: { ko: "R 실행 가능", en: "R runnable" },
    sleeping: { ko: "S 입력 대기", en: "S sleeping" },
    stopped: { ko: "T 정지", en: "T stopped" },
    zombie: { ko: "Z wait 대기", en: "Z awaiting wait" },
  };
  return labels[state]?.[locale] ?? state;
}

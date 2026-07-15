import { useEffect, useId, useRef, useState } from "react";
import {
  canMasterTinyLinuxLab,
  createTinyLinuxMachine,
  inspectTinyLinuxStage,
  runTinyLinux,
  setTinyLinuxConfigField,
  tinyLinuxRequiredInspectionStages,
  type TinyLinuxAttempt,
  type TinyLinuxInspectionStage,
  type TinyLinuxMachine,
  type TinyLinuxPredictionId,
  type TinyLinuxPresetId,
} from "../../features/linux-runtime/assemble-a-tiny-linux";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { StepExplorer } from "../interactive/StepExplorer";

type Feedback = { correct: boolean; text: string };

const predictionOptions: ReadonlyArray<{
  id: TinyLinuxPredictionId;
  ko: string;
  en: string;
}> = [
  { id: "kernel-image-missing", ko: "firmware가 kernel image를 찾지 못함", en: "Firmware cannot find the kernel image" },
  { id: "initramfs-missing", ko: "kernel에 initramfs가 연결되지 않음", en: "No initramfs is attached to the kernel" },
  { id: "rootfs-unpack-failed", ko: "initramfs unpack 실패", en: "Initramfs unpack fails" },
  { id: "init-missing", ko: "rootfs에 PID 1 경로가 없음", en: "The PID 1 path is absent from the rootfs" },
  { id: "init-not-executable", ko: "/init 실행 bit가 없음", en: "/init has no execute bit" },
  { id: "init-interpreter-missing", ko: "/init interpreter가 없음", en: "The /init interpreter is missing" },
  { id: "pid1-exited", ko: "PID 1이 supervision 전에 종료", en: "PID 1 exits before supervision" },
  { id: "network-interface-missing", ko: "eth0 device가 없음", en: "The eth0 device is missing" },
  { id: "network-link-down", ko: "eth0 link가 down", en: "The eth0 link is down" },
  { id: "network-address-missing", ko: "service address가 없음", en: "The service address is missing" },
  { id: "synack-no-return-route", ko: "SYN-ACK return route가 없음", en: "The SYN-ACK has no return route" },
  { id: "service-exec-denied", ko: "reportd exec 권한 거부", en: "Executing reportd is denied" },
  { id: "listener-not-found", ko: "원격 target과 맞는 listener가 없음", en: "No listener matches the remote target" },
  { id: "report-path-search-denied", ko: "/srv path search 권한 거부", en: "Path search under /srv is denied" },
  { id: "report-read-denied", ko: "report file group read 거부", en: "Group read of the report file is denied" },
  { id: "accepted-fd-missing", ko: "accepted connection fd가 없음", en: "The accepted connection fd is missing" },
  { id: "served", ko: "remote recv까지 18 byte 전달", en: "All 18 bytes reach remote recv" },
] as const;

const presetCopy: ReadonlyArray<{
  id: TinyLinuxPresetId;
  ko: string;
  en: string;
  required?: boolean;
}> = [
  { id: "layered-recovery", ko: "필수 · 3단계 복구", en: "Required · three-layer recovery", required: true },
  { id: "missing-kernel", ko: "연습 · kernel 없음", en: "Practice · missing kernel" },
  { id: "missing-initramfs", ko: "연습 · initramfs 없음", en: "Practice · missing initramfs" },
  { id: "healthy", ko: "관찰 · healthy", en: "Observe · healthy" },
] as const;

function actualBoundaryCopy(
  stopCode: TinyLinuxPredictionId,
  isKo: boolean,
): string {
  const selected = predictionOptions.find(({ id }) => id === stopCode);
  return selected ? (isKo ? selected.ko : selected.en) : stopCode;
}

function stageReceipt(
  attempt: TinyLinuxAttempt,
  stage: TinyLinuxInspectionStage,
  isKo: boolean,
): { title: string; claim: string; probe: string; value: string } {
  const { runtime } = attempt;
  if (stage === "rootfs") {
    return {
      title: isKo ? "artifact → rootfs" : "Artifact → rootfs",
      claim: isKo ? "kernel이 같은 initramfs를 /에 풀고 /init을 찾았습니다." : "The kernel unpacked the same initramfs at / and found /init.",
      probe: "boot log · ls -l /init",
      value: `${runtime.rootfs.archive} · ${runtime.rootfs.initPath} · ${runtime.rootfs.unpacked ? "unpacked" : "blocked"}`,
    };
  }
  if (stage === "pid1") {
    return {
      title: "rootfs → PID 1",
      claim: isKo ? "PID 1이 살아 있으며 mount와 child supervision을 소유합니다." : "PID 1 remains alive and owns mounts and child supervision.",
      probe: "ps · cat /proc/1/status · mount",
      value: `pid=${runtime.pid1.pid ?? "—"} · ${runtime.pid1.path} · supervising=${String(runtime.pid1.supervising)}`,
    };
  }
  if (stage === "listener") {
    return {
      title: "network → listener",
      claim: isKo ? "eth0의 service address와 원격 주소에 맞는 listener가 있습니다. return route는 별도 값으로 아직 없을 수 있습니다." : "The eth0 service address and a listener match the remote address. The separate return-route value may still be absent.",
      probe: "ip address · ip route get · ss -lntp",
      value: `${runtime.network.address ?? "no-address"} · via ${runtime.network.defaultGateway ?? "no-route"} · fd=${runtime.descriptors.listenerFd ?? "—"}`,
    };
  }
  if (stage === "report") {
    return {
      title: "credentials → report fd",
      claim: isKo ? "non-root reportd가 group read만 사용해 report byte를 읽었습니다." : "Non-root reportd read the report bytes through group read only.",
      probe: "id · namei -l · open/read trace",
      value: `uid=${runtime.service.uid} gid=${runtime.service.gid} · mode=${runtime.report.mode} · fd=${runtime.descriptors.reportFd ?? "—"}`,
    };
  }
  return {
    title: "accepted fd → remote recv",
    claim: isKo ? "listener와 accepted fd를 구분하고, accepted fd의 byte가 remote recv와 보존됩니다." : "The listener and accepted fd stay distinct, and bytes on the accepted fd are conserved at remote recv.",
    probe: "accept/send trace · peer recv",
    value: `listen=${runtime.descriptors.listenerFd ?? "—"} · accepted=${runtime.descriptors.acceptedFd ?? "—"} · send=${runtime.descriptors.sendFd ?? "—"} · ${runtime.delivery.sentBytes}/${runtime.delivery.receivedBytes} B`,
  };
}

export function LinuxTinySystemAssemblyLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const panelId = useId();
  const firstControlRef = useRef<HTMLButtonElement>(null);
  const [machine, setMachine] = useState<TinyLinuxMachine>(() => createTinyLinuxMachine());
  const [prediction, setPrediction] = useState<TinyLinuxPredictionId | "">("");
  const [activeStage, setActiveStage] = useState<TinyLinuxInspectionStage>("rootfs");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => setFeedback(null), [locale]);

  const latestAttempt = machine.attempts.at(-1);
  const mastered = canMasterTinyLinuxLab(machine);

  function acceptMachine(next: TinyLinuxMachine) {
    setMachine(next);
    onCompletionChange(canMasterTinyLinuxLab(next));
  }

  function choosePreset(preset: TinyLinuxPresetId) {
    const next = createTinyLinuxMachine(preset);
    setMachine(next);
    setPrediction("");
    setActiveStage("rootfs");
    setFeedback({
      correct: preset === "layered-recovery",
      text: preset === "layered-recovery"
        ? t("필수 fixture를 복원했습니다. 먼저 상태를 바꾸지 말고 최초 실패를 예측·실행하세요.", "Required fixture restored. Predict and run the first failure before changing state.")
        : t("연습 preset은 경계 관찰용이며 완료 증거에는 포함되지 않습니다. 필수 preset으로 돌아오면 새 이력으로 시작합니다.", "Practice presets expose one boundary and do not count toward completion. Returning to the required preset starts a new journal."),
    });
    setEngineError("");
    onCompletionChange(false);
  }

  function changeConfig(
    field: "initMode" | "defaultGateway" | "reportMode",
    value: string,
  ) {
    try {
      const transition = setTinyLinuxConfigField(machine, field, value);
      if (!transition.ok) {
        setFeedback({ correct: false, text: t("허용된 계약 값만 선택하세요.", "Choose one of the allowed contract values.") });
        return;
      }
      acceptMachine(transition.machine);
      setEngineError("");
      const repairCopy = {
        initMode: t("/init mode를 바꿨습니다. 같은 artifact에서 다음 최초 실패를 다시 예측하세요.", "Changed the /init mode. Predict the next earliest failure in the same artifact."),
        defaultGateway: t("return route를 바꿨습니다. listener 이후 request가 어느 경계까지 가는지 다시 예측하세요.", "Changed the return route. Predict how far a request proceeds after the listener."),
        reportMode: t("report mode를 바꿨습니다. root 권한을 넓히지 않은 최종 경로를 예측하세요.", "Changed the report mode. Predict the final path without widening root authority."),
      } as const;
      setFeedback({ correct: true, text: repairCopy[field] });
    } catch {
      failEngine();
    }
  }

  function runAssembly() {
    if (!prediction) {
      setFeedback({
        correct: false,
        text: t("상태 전이 전에 최초로 멈출 경계를 예측하세요.", "Predict the earliest stopping boundary before running the transition."),
      });
      return;
    }
    try {
      const transition = runTinyLinux(machine, prediction);
      if (!transition.ok) {
        setFeedback({ correct: false, text: t("예측 값을 판정하지 못했습니다. preset을 다시 시작하세요.", "The prediction could not be graded. Restart the preset.") });
        return;
      }
      const attempt = transition.machine.attempts.at(-1);
      acceptMachine(transition.machine);
      setEngineError("");
      setPrediction("");
      if (!attempt) return;
      setFeedback({
        correct: attempt.predictionCorrect,
        text: attempt.predictionCorrect
          ? attempt.stopCode === "served"
            ? t("예측이 맞았습니다. 이제 다섯 probe를 직접 열어 경계별 증거를 수집하세요.", "Prediction correct. Now open all five probes and collect boundary-specific evidence.")
            : t(`예측이 맞았습니다: ${actualBoundaryCopy(attempt.stopCode, true)}. 이미 통과한 계약은 유지하고 이 경계의 한 값만 수리하세요.`, `Prediction correct: ${actualBoundaryCopy(attempt.stopCode, false)}. Preserve passed contracts and repair one value at this boundary.`)
          : t(`예측은 ${actualBoundaryCopy(prediction, true)}였지만 실제 최초 중단은 ${actualBoundaryCopy(attempt.stopCode, true)}입니다. 상태는 바뀌지 않았으므로 같은 경계를 다시 예측할 수 있습니다.`, `You predicted ${actualBoundaryCopy(prediction, false)}, but the first actual stop is ${actualBoundaryCopy(attempt.stopCode, false)}. State is unchanged, so you can predict the same boundary again.`),
      });
    } catch {
      failEngine();
    }
  }

  function inspectStage(stage: TinyLinuxInspectionStage) {
    try {
      const transition = inspectTinyLinuxStage(machine, stage);
      if (!transition.ok) {
        const text = transition.error === "stage-not-reached"
          ? t("최근 실행이 아직 이 경계에 도달하지 않았습니다. 앞선 계약부터 수리하세요.", "The latest run has not reached this boundary. Repair the earlier contract first.")
          : transition.error === "stage-already-inspected"
            ? t("이 probe의 증거는 이미 이 실행 이력에 기록됐습니다.", "This probe is already recorded in the current run journal.")
            : t("먼저 fixture를 실행해 runtime state를 만드세요.", "Run the fixture first to create runtime state.");
        setFeedback({ correct: false, text });
        return;
      }
      acceptMachine(transition.machine);
      setEngineError("");
      setFeedback({
        correct: true,
        text: t("이 probe가 증명하는 경계만 evidence journal에 기록했습니다.", "Recorded only the boundary established by this probe in the evidence journal."),
      });
    } catch {
      failEngine();
    }
  }

  function failEngine() {
    setEngineError(t(
      "시스템 조립 모델을 실행하지 못했습니다. 외부 runtime 없이 같은 필수 fixture를 다시 시작할 수 있습니다.",
      "The system assembly model could not run. Restart the same required fixture without an external runtime.",
    ));
    onCompletionChange(false);
  }

  function resetRequired() {
    choosePreset("layered-recovery");
    requestAnimationFrame(() => firstControlRef.current?.focus());
  }

  const stages = tinyLinuxRequiredInspectionStages.map((id, index) => ({
    id,
    index: String(index + 1).padStart(2, "0"),
    label: {
      rootfs: t("rootfs", "rootfs"),
      pid1: "PID 1",
      listener: t("listener", "listener"),
      report: t("report read", "report read"),
      response: t("remote recv", "remote recv"),
    }[id],
  }));
  const selectedReceipt = latestAttempt?.stagesReached.includes(activeStage)
    ? stageReceipt(latestAttempt, activeStage, isKo)
    : null;
  const evidenceRows = tinyLinuxRequiredInspectionStages.map((stage) => ({
    stage,
    complete: latestAttempt?.inspections.includes(stage) ?? false,
  }));

  return (
    <InteractiveLab
      kicker={t("필수 실습 · ASSEMBLE → PREDICT → PROBE", "REQUIRED LAB · ASSEMBLE → PREDICT → PROBE")}
      title={t("같은 artifact에서 최초 실패만 세 번 수리하세요", "Repair only the earliest failure three times in the same artifact")}
      description={t(
        "필수 fixture는 /init execute bit → SYN-ACK return route → report group-read 순서로 막힙니다. 실행 전 예측, 한 값의 최소 수리, 최종 다섯 probe가 모두 journal에서 재현돼야 완료됩니다.",
        "The required fixture stops at the /init execute bit, then the SYN-ACK return route, then report group read. Completion requires a pre-run prediction, one-value repair, and five final probes, all replayable from the journal.",
      )}
      actions={<button ref={firstControlRef} type="button" className="button button-secondary" onClick={resetRequired}>{t("필수 실습 초기화", "Reset required lab")}</button>}
      className="tiny-system-assembly-lab"
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? (
        <div className="tiny-system-runtime-fallback" role="alert">
          <strong>{t("runtime fallback", "Runtime fallback")}</strong>
          <p>{engineError}</p>
          <button type="button" className="button button-secondary" onClick={resetRequired}>{t("결정론적 fixture 다시 시작", "Restart deterministic fixture")}</button>
        </div>
      ) : null}

      <div className="tiny-system-preset-row" role="group" aria-label={t("작은 Linux fixture preset", "Tiny Linux fixture presets") }>
        {presetCopy.map((preset) => (
          <button
            type="button"
            className={`button button-ghost${machine.preset === preset.id ? " is-active" : ""}`}
            aria-pressed={machine.preset === preset.id}
            onClick={() => choosePreset(preset.id)}
            key={preset.id}
          >
            {isKo ? preset.ko : preset.en}{preset.required ? <span className="sr-only"> ({t("완료 경로", "completion path")})</span> : null}
          </button>
        ))}
      </div>

      <div className="tiny-system-config-grid">
        <article>
          <span>ARTIFACT</span>
          <strong>bzImage + initramfs.cpio</strong>
          <small>{machine.config.kernelImagePresent ? "kernel ✓" : "kernel ✕"} · {machine.config.initramfsAttached ? "rootfs ✓" : "rootfs ✕"}</small>
        </article>
        <label>
          <span>/init mode</span>
          <select aria-label={t("PID 1 init mode", "PID 1 init mode")} value={machine.config.initMode} onChange={(event) => changeConfig("initMode", event.target.value)}>
            <option value="0644">0644 · rw-r--r--</option>
            <option value="0755">0755 · rwxr-xr-x</option>
          </select>
        </label>
        <label>
          <span>{t("default return route", "Default return route")}</span>
          <select aria-label={t("SYN-ACK default return route", "SYN-ACK default return route")} value={machine.config.defaultGateway} onChange={(event) => changeConfig("defaultGateway", event.target.value)}>
            <option value="">{t("없음", "None")}</option>
            <option value="10.0.0.1">default via 10.0.0.1</option>
          </select>
        </label>
        <label>
          <span>/srv/report.txt mode</span>
          <select aria-label={t("report file mode", "Report file mode")} value={machine.config.reportMode} onChange={(event) => changeConfig("reportMode", event.target.value)}>
            <option value="0600">0600 · root only</option>
            <option value="0640">0640 · group read</option>
            <option value="0666">0666 · world write</option>
          </select>
        </label>
      </div>

      <fieldset className="tiny-system-run-controls">
        <legend>{t("실행 전 최초 실패 예측", "Predict the first failure before running")}</legend>
        <label>
          <span>{t("다음 stop code", "Next stop code")}</span>
          <select aria-label={t("다음 최초 실패 경계 예측", "Predicted next first-failure boundary")} value={prediction} onChange={(event) => setPrediction(event.target.value as TinyLinuxPredictionId | "")}>
            <option value="">— {t("먼저 예측", "Predict first")} —</option>
            {predictionOptions.map((option) => <option value={option.id} key={option.id}>{isKo ? option.ko : option.en}</option>)}
          </select>
        </label>
        <button type="button" className="button button-primary" onClick={runAssembly}>{t("부팅·요청 실행하고 판정", "Run boot and request, then grade")}</button>
      </fieldset>

      <div className={`tiny-system-live-feedback${feedback ? feedback.correct ? " is-correct" : " is-incorrect" : ""}`} role="status" aria-live="polite">
        <strong>{feedback ? feedback.correct ? t("상태 전이 확인", "State transition verified") : t("예측을 다시 좁히세요", "Narrow the prediction") : t("현재 mission", "Current mission")}</strong>
        <p>{feedback?.text ?? t("상태를 바꾸기 전에 0644인 /init이 어디에서 멈출지 예측하세요.", "Before changing state, predict where /init with mode 0644 will stop.")}</p>
      </div>

      {latestAttempt ? (
        <div className="tiny-system-attempt" aria-label={t("최근 실행 결과", "Latest run result") }>
          <header>
            <div><span>{latestAttempt.id}</span><strong>{latestAttempt.stopCode}</strong></div>
            <span className={latestAttempt.predictionCorrect ? "is-correct" : "is-incorrect"}>{latestAttempt.predictionCorrect ? t("예측 일치", "Prediction matched") : t("예측 불일치", "Prediction differed")}</span>
          </header>
          <ol>
            {latestAttempt.events.map((event, index) => <li key={`${event}-${index}`}><span>{String(index + 1).padStart(2, "0")}</span><code>{event}</code></li>)}
          </ol>
        </div>
      ) : null}

      <div className="tiny-system-inspection-workspace">
        <header>
          <span>{t("최종 실행 evidence", "Final-run evidence")}</span>
          <p>{t("tab을 여는 것과 probe 증거를 기록하는 것은 별도 동작입니다. 도달하지 못한 stage는 판정되지 않습니다.", "Opening a tab and recording probe evidence are separate actions. An unreached stage cannot be credited.")}</p>
        </header>
        <StepExplorer
          stages={stages}
          activeStage={activeStage}
          onStageChange={setActiveStage}
          ariaLabel={t("작은 Linux readiness probe 단계", "Tiny Linux readiness probe stages")}
          panelId={panelId}
        />
        <section className="tiny-system-inspection-panel" id={panelId} aria-live="polite">
          {selectedReceipt ? (
            <>
              <span>{selectedReceipt.title}</span>
              <h4>{selectedReceipt.claim}</h4>
              <dl><div><dt>PROBE</dt><dd><code>{selectedReceipt.probe}</code></dd></div><div><dt>OBSERVED</dt><dd><code>{selectedReceipt.value}</code></dd></div></dl>
              <button
                type="button"
                className="button button-secondary"
                disabled={latestAttempt?.inspections.includes(activeStage)}
                onClick={() => inspectStage(activeStage)}
              >
                {latestAttempt?.inspections.includes(activeStage) ? t("이 실행에 기록됨", "Recorded for this run") : t("probe 실행·증거 기록", "Run probe and record evidence")}
              </button>
            </>
          ) : <p>{latestAttempt
            ? t(`최근 실행은 ${activeStage} 경계에 도달하지 않았습니다. 긍정적인 readiness 증거를 만들지 않고 앞선 최초 실패를 수리하세요.`, `The latest run did not reach the ${activeStage} boundary. Repair the earlier first failure without creating affirmative readiness evidence.`)
            : t("먼저 fixture를 실행하면 각 stage의 실제 state가 나타납니다.", "Run the fixture first to expose actual state at each stage.")}</p>}
        </section>
      </div>

      <div className="tiny-system-assembly-evidence" role="status" aria-live="polite">
        {evidenceRows.map(({ stage, complete }) => <span className={complete ? "is-complete" : undefined} key={stage}>{complete ? "✓" : "○"} {stage}</span>)}
      </div>
      {mastered ? <p className="tiny-system-lab-mastered" role="status">{t("필수 조립 완료 — 세 최초 실패를 순서대로 수리하고 다섯 readiness 경계를 독립 probe로 증명했습니다.", "Required assembly complete — you repaired three first failures in order and established five readiness boundaries with independent probes.")}</p> : null}
      <noscript><p>{t("JavaScript가 없어도 위 계약 설명은 읽을 수 있습니다. 상호작용을 켜면 로컬 결정론적 모델로 완료 증거를 만들 수 있습니다.", "The contract explanation remains readable without JavaScript. Enable interaction to build completion evidence in the local deterministic model.")}</p></noscript>
    </InteractiveLab>
  );
}

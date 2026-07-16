import { useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  bootBoundaryIds,
  bootFailureScenarioIds,
  bootRepairIds,
  evaluateBootFailure,
  type BootBoundaryId,
  type BootFailureScenarioId,
  type BootRepairId,
} from "../../features/linux-runtime/boot-sequence";
import { InteractiveLab } from "../interactive/InteractiveLab";

const scenarioCopy: Record<
  BootFailureScenarioId,
  {
    title: { ko: string; en: string };
    log: string;
    clue: { ko: string; en: string };
    boundaryHint: { ko: string; en: string };
    repairHint: { ko: string; en: string };
    correct: { ko: string; en: string };
  }
> = {
  "missing-kernel": {
    title: { ko: "사건 1 · 커널 표식이 없다", en: "Incident 1 · No kernel marker" },
    log: "[firmware] hardware initialized\n[rootorial] kernel image unavailable",
    clue: {
      ko: "펌웨어는 끝났지만 커널의 첫 줄이 한 번도 나타나지 않았습니다.",
      en: "Firmware finished, but the first kernel line never appeared.",
    },
    boundaryHint: {
      ko: "커널 로그가 없으므로 rootfs나 init보다 앞선 펌웨어→커널 인계에서 멈췄습니다.",
      en: "With no kernel log, the stop is at the firmware-to-kernel handoff, before rootfs or init.",
    },
    repairHint: {
      ko: "경로와 init을 바꿔도 실행할 커널이 없습니다. 먼저 커널 이미지를 연결해야 합니다.",
      en: "Changing paths or init cannot help when there is no kernel to run. Attach the kernel image first.",
    },
    correct: {
      ko: "정확합니다. 펌웨어 다음에 커널 이미지를 연결하는 최소 수정입니다.",
      en: "Correct. Supplying the kernel image repairs the earliest failed handoff.",
    },
  },
  "missing-root": {
    title: { ko: "사건 2 · VFS panic", en: "Incident 2 · VFS panic" },
    log: "[kernel] Linux version 6.x\nVFS: Unable to mount root fs on unknown-block(0,0)",
    clue: {
      ko: "커널은 실행됐지만 root filesystem을 열지 못했습니다.",
      en: "The kernel is running, but it cannot open the root filesystem.",
    },
    boundaryHint: {
      ko: "Linux version 표식은 펌웨어 인계가 끝났다는 증거입니다. 실패는 커널의 rootfs 단계입니다.",
      en: "The Linux version marker proves the firmware handoff succeeded. The failure is at the kernel rootfs step.",
    },
    repairHint: {
      ko: "아직 /sbin/init을 읽을 파일시스템이 없습니다. init보다 먼저 올바른 rootfs를 제공해야 합니다.",
      en: "There is no filesystem from which to read /sbin/init yet. Provide the correct rootfs before changing init.",
    },
    correct: {
      ko: "정확합니다. 커널에 읽을 수 있는 rootfs를 제공하면 다음 경계로 진행합니다.",
      en: "Correct. A reachable rootfs lets the kernel continue to the next boundary.",
    },
  },
  "missing-init": {
    title: { ko: "사건 3 · init을 찾지 못함", en: "Incident 3 · Init not found" },
    log: "[kernel] rootfs mounted\nKernel panic - not syncing: No working init found",
    clue: {
      ko: "rootfs는 마운트됐지만 첫 사용자 공간 프로그램이 시작되지 않았습니다.",
      en: "The rootfs mounted, but the first userspace program did not start.",
    },
    boundaryHint: {
      ko: "rootfs mounted 표식 뒤이므로 커널은 이미 실행 중입니다. kernel→init 경계가 실패했습니다.",
      en: "The rootfs marker means the kernel is already running. The kernel-to-init boundary failed.",
    },
    repairHint: {
      ko: "셸 서비스보다 먼저 PID 1이 필요합니다. 실행 가능한 /sbin/init을 복구하세요.",
      en: "PID 1 must exist before any shell service. Restore an executable /sbin/init.",
    },
    correct: {
      ko: "정확합니다. 실행 가능한 init을 복구하면 사용자 공간이 시작됩니다.",
      en: "Correct. Restoring an executable init starts userspace.",
    },
  },
  "missing-shell": {
    title: { ko: "사건 4 · 프롬프트가 없다", en: "Incident 4 · No prompt" },
    log: "[kernel] Run /sbin/init as init process\n[init] PID 1 ready\n(no console prompt)",
    clue: {
      ko: "init은 실행됐지만 콘솔에서 명령을 받을 셸이 시작되지 않았습니다.",
      en: "Init is running, but no shell was started to accept console commands.",
    },
    boundaryHint: {
      ko: "PID 1 ready가 보이므로 펌웨어·커널·init 시작은 통과했습니다. init→셸 경계를 확인하세요.",
      en: "PID 1 ready proves firmware, kernel, and init startup passed. Inspect the init-to-shell boundary.",
    },
    repairHint: {
      ko: "커널을 바꾸는 대신 init이 직렬 콘솔 셸을 시작하도록 구성해야 합니다.",
      en: "Do not replace the kernel; configure init to start the serial console shell.",
    },
    correct: {
      ko: "정확합니다. init이 콘솔 셸을 시작해야 사용자가 프롬프트를 볼 수 있습니다.",
      en: "Correct. Init must start the console shell before a user can see a prompt.",
    },
  },
};

const boundaryCopy: Record<BootBoundaryId, { ko: string; en: string }> = {
  "firmware-to-kernel": { ko: "펌웨어 → 커널 인계", en: "Firmware → kernel handoff" },
  "kernel-rootfs": { ko: "커널의 rootfs 마운트", en: "Kernel rootfs mount" },
  "kernel-to-init": { ko: "커널 → init 인계", en: "Kernel → init handoff" },
  "init-to-shell": { ko: "init → 콘솔 셸 인계", en: "Init → console shell handoff" },
};

const repairCopy: Record<BootRepairId, { ko: string; en: string }> = {
  "attach-kernel": { ko: "커널 이미지 연결", en: "Attach the kernel image" },
  "provide-rootfs": { ko: "올바른 rootfs 제공", en: "Provide the correct rootfs" },
  "restore-init": { ko: "/sbin/init 복구", en: "Restore /sbin/init" },
  "start-console-shell": { ko: "init이 콘솔 셸을 시작하도록 구성", en: "Configure init to start the console shell" },
};

type MissionAnswer = {
  boundary?: BootBoundaryId;
  repair?: BootRepairId;
};

type MissionResult = ReturnType<typeof evaluateBootFailure>;

export function LinuxBootFailureLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<BootFailureScenarioId, MissionAnswer>>>({});
  const [results, setResults] = useState<Partial<Record<BootFailureScenarioId, MissionResult>>>({});
  const completedCount = bootFailureScenarioIds.filter((id) => results[id]?.correct).length;

  function updateAnswer(
    scenarioId: BootFailureScenarioId,
    key: keyof MissionAnswer,
    value: BootBoundaryId | BootRepairId,
  ) {
    setAnswers((current) => ({
      ...current,
      [scenarioId]: { ...current[scenarioId], [key]: value },
    }));
    if (results[scenarioId]) {
      const nextResults = { ...results };
      delete nextResults[scenarioId];
      setResults(nextResults);
      onCompletionChange?.(false);
    }
  }

  function checkMission(scenarioId: BootFailureScenarioId) {
    const answer = answers[scenarioId];
    if (!answer?.boundary || !answer.repair) return;
    const result = evaluateBootFailure(scenarioId, answer.boundary, answer.repair);
    const nextResults = { ...results, [scenarioId]: result };
    setResults(nextResults);
    onCompletionChange?.(
      bootFailureScenarioIds.every((id) => nextResults[id]?.correct),
    );
  }

  function resetMissions() {
    setAnswers({});
    setResults({});
    onCompletionChange?.(false);
  }

  return (
    <InteractiveLab
      kicker={t("별도 활동 · LAST GOOD MARKER", "SEPARATE ACTIVITY · LAST GOOD MARKER")}
      title={t(
        "마지막 성공 표식으로 가장 이른 고장 경계를 찾으세요",
        "Use the last good marker to find the earliest failed boundary",
      )}
      description={t(
        "각 로그에서 마지막으로 성공한 층을 읽고, 고장 경계와 최소 수정을 한 쌍으로 제출하세요. 네 사건을 모두 해결해야 합니다.",
        "Read the last successful layer in each log, then submit the failed boundary and smallest repair as a pair. Solve all four incidents.",
      )}
      actions={(
        <button type="button" className="button button-secondary" onClick={resetMissions}>
          {t("사건 초기화", "Reset incidents")}
        </button>
      )}
      className="boot-failure-lab"
    >
      <div className="boot-failure-progress" role="status" aria-live="polite">
        <strong>{completedCount} / {bootFailureScenarioIds.length}</strong>
        <span>
          {completedCount === bootFailureScenarioIds.length
            ? t("네 고장 경계를 모두 근거로 진단했습니다.", "All four failed boundaries were diagnosed from evidence.")
            : t("완료한 부팅 장애 사건", "Boot incidents solved")}
        </span>
      </div>

      <div className="boot-failure-grid">
        {bootFailureScenarioIds.map((scenarioId) => {
          const scenario = scenarioCopy[scenarioId];
          const answer = answers[scenarioId];
          const result = results[scenarioId];
          const feedback = result?.correct
            ? scenario.correct[locale]
            : result && !result.boundaryCorrect
              ? scenario.boundaryHint[locale]
              : result
                ? scenario.repairHint[locale]
                : null;
          const feedbackId = `${scenarioId}-diagnosis-feedback`;
          return (
            <fieldset
              className={`boot-failure-mission${result ? result.correct ? " is-correct" : " is-incorrect" : ""}`}
              aria-describedby={result ? feedbackId : undefined}
              key={scenarioId}
            >
              <legend>{scenario.title[locale]}</legend>
              <pre aria-label={t(`${scenario.title.ko} 부팅 로그`, `${scenario.title.en} boot log`)}>{scenario.log}</pre>
              <p>{scenario.clue[locale]}</p>
              <label>
                <span>{t("가장 이른 고장 경계", "Earliest failed boundary")}</span>
                <select
                  value={answer?.boundary ?? ""}
                  onChange={(event) => updateAnswer(
                    scenarioId,
                    "boundary",
                    event.target.value as BootBoundaryId,
                  )}
                >
                  <option value="" disabled>{t("경계 선택", "Choose a boundary")}</option>
                  {bootBoundaryIds.map((boundary) => (
                    <option value={boundary} key={boundary}>{boundaryCopy[boundary][locale]}</option>
                  ))}
                </select>
              </label>
              <label>
                <span>{t("가장 작은 복구 조치", "Smallest repair")}</span>
                <select
                  value={answer?.repair ?? ""}
                  onChange={(event) => updateAnswer(
                    scenarioId,
                    "repair",
                    event.target.value as BootRepairId,
                  )}
                >
                  <option value="" disabled>{t("복구 선택", "Choose a repair")}</option>
                  {bootRepairIds.map((repair) => (
                    <option value={repair} key={repair}>{repairCopy[repair][locale]}</option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button-secondary"
                disabled={!answer?.boundary || !answer.repair}
                onClick={() => checkMission(scenarioId)}
              >
                {t("진단 확인", "Check diagnosis")}
              </button>
              {feedback ? (
                <div className="boot-diagnosis-feedback" id={feedbackId} role="status" aria-live="polite">
                  <strong>{result?.correct ? t("정확한 진단", "Correct diagnosis") : t("표식을 다시 읽어 보세요", "Read the markers again")}</strong>
                  <p>{feedback}</p>
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

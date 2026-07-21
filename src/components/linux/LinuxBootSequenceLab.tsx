import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  bootOutcomeForPrediction,
  bootConfigPresets,
  bootPredictionIds,
  bootStageIds,
  initialBootConfig,
  simulateBoot,
  type BootConfig,
  type BootEventCode,
  type BootPredictionId,
  type BootSimulation,
  type BootStageId,
} from "../../features/linux-runtime/boot-sequence";
import { ChoiceField } from "../interactive/ChoiceField";
import { InteractiveLab } from "../interactive/InteractiveLab";

const eventCopy: Record<BootEventCode, { ko: string; en: string }> = {
  "firmware-kernel-ready": {
    ko: "펌웨어 초기화 완료 — 제공된 Buildroot 커널 이미지를 찾았습니다.",
    en: "Firmware initialized — the supplied Buildroot kernel image is available.",
  },
  "firmware-kernel-missing": {
    ko: "인계 중단 — 펌웨어 다음에 실행할 커널 이미지가 없습니다.",
    en: "Handoff stopped — no kernel image is available after firmware.",
  },
  "kernel-root-mounted": {
    ko: "커널 실행 — 하드웨어를 초기화하고 root filesystem을 마운트했습니다.",
    en: "Kernel running — hardware is initialized and the root filesystem is mounted.",
  },
  "kernel-root-unavailable": {
    ko: "Kernel panic — root filesystem을 찾지 못해 사용자 공간을 열 수 없습니다.",
    en: "Kernel panic — userspace cannot start because the root filesystem is unavailable.",
  },
  "init-started": {
    ko: "사용자 공간 시작 — 커널이 /sbin/init을 PID 1로 실행했습니다.",
    en: "Userspace started — the kernel launched /sbin/init as PID 1.",
  },
  "init-missing": {
    ko: "Kernel panic — root filesystem은 있지만 실행 가능한 init을 찾지 못했습니다.",
    en: "Kernel panic — the root filesystem exists, but no executable init was found.",
  },
  "shell-ready": {
    ko: "직렬 셸 준비 완료 — 이 모델의 정상 프롬프트가 네 인계 경계를 모두 통과했음을 보여 줍니다.",
    en: "Serial shell ready — this model's expected prompt shows that all four handoff boundaries passed.",
  },
  "shell-not-started": {
    ko: "init은 실행 중이지만 직렬 셸 서비스를 시작하지 않아 프롬프트가 없습니다.",
    en: "Init is running, but it did not start the serial shell service, so there is no prompt.",
  },
};

const stageCopy: Record<BootStageId, { ko: string; en: string }> = {
  firmware: { ko: "펌웨어", en: "Firmware" },
  kernel: { ko: "커널", en: "Kernel" },
  init: { ko: "init · PID 1", en: "init · PID 1" },
  shell: { ko: "직렬 콘솔 셸", en: "Serial console shell" },
};

const predictionCopy: Record<BootPredictionId, { ko: string; en: string }> = {
  firmware: { ko: "펌웨어에서 중단", en: "Stops at firmware" },
  kernel: { ko: "커널에서 중단", en: "Stops at the kernel" },
  init: { ko: "init에서 중단", en: "Stops at init" },
  shell: { ko: "직렬 셸에서 중단", en: "Stops at the serial shell" },
  prompt: { ko: "정상 프롬프트 도달", en: "Reaches the expected prompt" },
};

type LinuxBootSequenceLabProps = {
  onCompletionChange?: (complete: boolean) => void;
};

export function LinuxBootSequenceLab({
  onCompletionChange,
}: LinuxBootSequenceLabProps) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [config, setConfig] = useState<BootConfig>({ ...initialBootConfig });
  const [result, setResult] = useState<BootSimulation | null>(null);
  const [prediction, setPrediction] = useState<BootPredictionId | "">("");
  const [predictionResult, setPredictionResult] = useState<{
    predicted: BootPredictionId;
    actual: BootPredictionId;
  } | null>(null);
  const [observedFailure, setObservedFailure] = useState(false);
  const [repairedAfterFailure, setRepairedAfterFailure] = useState(false);
  const [mastered, setMastered] = useState(false);
  const [interactiveReady, setInteractiveReady] = useState(false);

  useEffect(() => {
    setInteractiveReady(true);
  }, []);

  function clearMastery() {
    if (!mastered) return;
    setMastered(false);
    onCompletionChange?.(false);
  }

  function updateConfig<Key extends keyof BootConfig>(
    key: Key,
    value: BootConfig[Key],
  ) {
    if (result?.failureCode) setRepairedAfterFailure(true);
    setConfig((current) => ({ ...current, [key]: value }));
    setResult(null);
    setPrediction("");
    setPredictionResult(null);
    clearMastery();
  }

  function applyPreset(preset: keyof typeof bootConfigPresets) {
    if (result?.failureCode) setRepairedAfterFailure(true);
    setConfig({ ...bootConfigPresets[preset] });
    setResult(null);
    setPrediction("");
    setPredictionResult(null);
    clearMastery();
  }

  function resetLab() {
    setConfig({ ...initialBootConfig });
    setResult(null);
    setPrediction("");
    setPredictionResult(null);
    setObservedFailure(false);
    setRepairedAfterFailure(false);
    setMastered(false);
    onCompletionChange?.(false);
  }

  function runBoot() {
    if (!prediction) return;
    const nextResult = simulateBoot(config);
    const actual = bootOutcomeForPrediction(nextResult);
    const predictionCorrect = prediction === actual;
    const nextObservedFailure = observedFailure || Boolean(nextResult.failureCode);
    const nextMastered = nextResult.complete
      && nextObservedFailure
      && repairedAfterFailure
      && predictionCorrect;
    setResult(nextResult);
    setPredictionResult({ predicted: prediction, actual });
    setObservedFailure(nextObservedFailure);
    setMastered(nextMastered);
    onCompletionChange?.(nextMastered);
  }

  const eventByStage = new Map(
    result?.events.map((event) => [event.stage, event]) ?? [],
  );
  const summary = !result
    ? t(
        "설정을 고르고 멈출 지점을 예측한 뒤 부팅하세요. 먼저 한 번 실패를 관찰하고 원인을 고쳐야 합니다.",
        "Choose the settings, predict the stopping point, then boot. You must observe one failure, then repair its cause.",
      )
    : mastered
      ? t(
          "필수 실습 완료 — 실패한 인계를 고쳐 네 단계 모두 프롬프트까지 연결했습니다.",
          "Required lab complete — you repaired a failed handoff and connected all four stages to a prompt.",
        )
      : result.complete
        ? t(
            "프롬프트에는 도달했지만, 실패를 관찰하고 설정을 직접 고친 기록이 아직 필요합니다.",
            "You reached a prompt, but you still need to observe a failure and repair its configuration yourself.",
          )
        : t(
            "마지막 실패 표식을 읽고 원인이 된 설정 하나를 바꾼 뒤 다시 실행하세요.",
            "Read the last failed marker, change the setting that caused it, and run again.",
          );

  return (
    <InteractiveLab
      kicker={t("필수 실습 · BOOT CONTRACT", "REQUIRED LAB · BOOT CONTRACT")}
      title={t(
        "부팅 계약을 고쳐 프롬프트까지 연결하세요",
        "Repair the boot contract and reach a prompt",
      )}
      description={t(
        "이 모델은 현재 v86 실험처럼 펌웨어 뒤에 커널 이미지를 직접 넘깁니다. 한 번 실패시키고, 마지막 표식의 원인을 고쳐 다시 실행하세요.",
        "Like the current v86 experiment, this model supplies a kernel image directly after firmware. Observe one failure, repair the cause of its last marker, and rerun.",
      )}
      actions={(
        <button type="button" className="button button-secondary" onClick={resetLab}>
          {t("실습 초기화", "Reset lab")}
        </button>
      )}
      className="boot-sequence-lab"
    >
      <span
        className="sr-only"
        data-interactive-ready={interactiveReady ? "true" : "false"}
      >
        {interactiveReady
          ? t("부팅 실습 조작 준비 완료", "Boot lab controls ready")
          : t("부팅 실습 준비 중", "Preparing boot lab controls")}
      </span>
      <div className="boot-preset-bar" aria-label={t("고장 프리셋", "Failure presets")}>
        <span>{t("고장 프리셋", "FAILURE PRESETS")}</span>
        <button type="button" onClick={() => applyPreset("missing-kernel")}>
          {t("커널 없음", "Missing kernel")}
        </button>
        <button type="button" onClick={() => applyPreset("missing-root")}>
          {t("rootfs 없음", "Missing rootfs")}
        </button>
        <button type="button" onClick={() => applyPreset("missing-init")}>
          {t("init 없음", "Missing init")}
        </button>
        <button type="button" onClick={() => applyPreset("missing-shell")}>
          {t("셸 없음", "Missing shell")}
        </button>
      </div>

      <div className="boot-config-grid">
        <ChoiceField
          label={t("펌웨어 다음 대상", "Target after firmware")}
          value={config.kernelTarget}
          onValueChange={(value) => updateConfig("kernelTarget", value)}
          options={[
            { value: "missing", label: t("연결된 커널 없음", "No kernel attached") },
            { value: "buildroot-kernel", label: "buildroot-bzimage68.bin" },
          ]}
        />
        <ChoiceField
          label={t("커널이 마운트할 루트", "Root mounted by the kernel")}
          value={config.rootFilesystem}
          onValueChange={(value) => updateConfig("rootFilesystem", value)}
          options={[
            { value: "embedded-rootfs", label: t("제공된 Buildroot rootfs", "Supplied Buildroot rootfs") },
            { value: "unavailable", label: t("찾을 수 없는 rootfs", "Unavailable rootfs") },
          ]}
        />
        <ChoiceField
          label={t("첫 사용자 공간 프로그램", "First userspace program")}
          value={config.initPath}
          onValueChange={(value) => updateConfig("initPath", value)}
          options={[
            { value: "/sbin/init", label: "/sbin/init" },
            { value: "/missing", label: "/missing" },
          ]}
        />
        <ChoiceField
          label={t("init의 콘솔 동작", "Init console action")}
          value={config.initAction}
          onValueChange={(value) => updateConfig("initAction", value)}
          options={[
            { value: "start-serial-shell", label: t("직렬 셸 시작", "Start serial shell") },
            { value: "no-shell", label: t("셸 서비스 시작 안 함", "Do not start a shell") },
          ]}
        />
      </div>

      <div className="boot-prediction-panel">
        <ChoiceField
          label={t("실행 전 예측 · 이 설정은 어디까지 갈까요?", "Predict before running · How far will this configuration go?")}
          value={prediction}
          onValueChange={(value) => {
            setPrediction(value);
            setPredictionResult(null);
            clearMastery();
          }}
          options={[
            { value: "", label: t("결과를 먼저 예측하세요", "Predict the result first"), disabled: true },
            ...bootPredictionIds.map((outcome) => ({ value: outcome, label: predictionCopy[outcome][locale] })),
          ]}
        />
        <div className="boot-prediction-feedback" role="status" aria-live="polite">
          {predictionResult ? (
            <>
              <strong>
                {predictionResult.predicted === predictionResult.actual
                  ? t("예측이 맞았습니다", "Prediction matched")
                  : t("예측을 다시 보세요", "Revisit the prediction")}
              </strong>
              <p>
                {predictionResult.predicted === predictionResult.actual
                  ? t(
                      `실제 결과도 '${predictionCopy[predictionResult.actual].ko}'입니다. 마지막 표식과 설정의 인과가 일치합니다.`,
                      `The actual result is also '${predictionCopy[predictionResult.actual].en}'. The last marker matches the causal setting.`,
                    )
                  : t(
                      `예측은 '${predictionCopy[predictionResult.predicted].ko}'였지만 실제 결과는 '${predictionCopy[predictionResult.actual].ko}'입니다. 타임라인의 첫 중단 표식과 그 직전 설정을 비교하세요.`,
                      `You predicted '${predictionCopy[predictionResult.predicted].en}', but the actual result is '${predictionCopy[predictionResult.actual].en}'. Compare the first stopped marker with the setting immediately before it.`,
                    )}
              </p>
            </>
          ) : (
            <p>{t("예측은 실행 뒤 실제 첫 중단 표식과 비교됩니다.", "After the run, your prediction is compared with the first actual stopped marker.")}</p>
          )}
        </div>
      </div>

      <div className="boot-run-bar">
        <button type="button" className="button button-primary" onClick={runBoot} disabled={!prediction}>
          {t("이 설정으로 부팅 실행", "Run boot with this configuration")}
        </button>
        <div className="boot-lab-progress" role="status" aria-live="polite">
          <strong>{result?.passedStages ?? 0} / {bootStageIds.length}</strong>
          <span>{summary}</span>
        </div>
      </div>

      <ol className="boot-stage-timeline" aria-label={t("부팅 단계 결과", "Boot stage results")}>
        {bootStageIds.map((stage) => {
          const event = eventByStage.get(stage);
          const state = event?.outcome ?? "pending";
          return (
            <li className={`is-${state}`} data-stage-state={state} key={stage}>
              <span>{stageCopy[stage][locale]}</span>
              <strong>
                {state === "passed"
                  ? t("통과", "Passed")
                  : state === "failed"
                    ? t("중단", "Stopped")
                    : t("대기", "Waiting")}
              </strong>
              <p>
                {event
                  ? eventCopy[event.code][locale]
                  : t("앞 단계의 인계를 기다립니다.", "Waiting for the previous handoff.")}
              </p>
            </li>
          );
        })}
      </ol>

      <div className="boot-observation-checks" aria-label={t("실습 증거", "Lab evidence")}>
        <span className={observedFailure ? "is-complete" : undefined}>
          {observedFailure ? "✓" : "○"} {t("실패 경계 관찰", "Observed a failed boundary")}
        </span>
        <span className={repairedAfterFailure ? "is-complete" : undefined}>
          {repairedAfterFailure ? "✓" : "○"} {t("원인 설정 변경", "Changed the causal setting")}
        </span>
        <span className={mastered ? "is-complete" : undefined}>
          {mastered ? "✓" : "○"} {t("프롬프트 도달", "Reached a prompt")}
        </span>
      </div>
    </InteractiveLab>
  );
}

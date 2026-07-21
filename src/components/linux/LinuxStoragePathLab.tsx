import { useEffect, useState } from "react";
import {
  canMasterStorageLab,
  crashStorageMachine,
  createStorageHardLink,
  createStorageMachine,
  emptyStorageLabEvidence,
  fsyncStoragePath,
  readStoragePath,
  resolveStoragePath,
  setStorageMountActive,
  storageLabEvidenceAfterCrash,
  storageLabEvidenceAfterHardLink,
  storageLabEvidenceAfterResolution,
  storageLabEvidenceAfterUnlink,
  traceStorageOffset,
  unlinkStoragePath,
  writeStoragePath,
  type StorageDeviceId,
  type StorageLabEvidence,
  type StorageMachine,
  type StorageOffsetTrace,
  type StoragePathPrediction,
} from "../../features/linux-runtime/storage-and-filesystems";
import { useLocale } from "../../features/localization/localization";
import { ChoiceField } from "../interactive/ChoiceField";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { StorageStateView } from "./StorageStateView";

type Feedback = { correct: boolean; text: string };

function numericInput(value: string): number | null {
  const normalized = value.trim().toLowerCase();
  if (!/^(?:0x[0-9a-f]+|[0-9]+)$/.test(normalized)) return null;
  const parsed = Number.parseInt(normalized, normalized.startsWith("0x") ? 16 : 10);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

const initialPrediction = {
  device: "" as StorageDeviceId | "",
  inode: "",
  logicalBlock: "",
  inBlockOffset: "",
  deviceBlock: "",
  deviceByteAddress: "",
};

export function LinuxStoragePathLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [machine, setMachine] = useState<StorageMachine>(createStorageMachine);
  const [path, setPath] = useState("/srv/data/report.bin");
  const [offset, setOffset] = useState("0x1340");
  const [prediction, setPrediction] = useState(initialPrediction);
  const [trace, setTrace] = useState<StorageOffsetTrace | null>(null);
  const [evidence, setEvidence] = useState<StorageLabEvidence>(emptyStorageLabEvidence);
  const [writeValue, setWriteValue] = useState("candidate-v2");
  const [crashPrediction, setCrashPrediction] = useState("");
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [engineError, setEngineError] = useState("");

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => {
    setFeedback(null);
    setEngineError("");
  }, [locale]);

  const updateCompletion = (nextMachine: StorageMachine, nextEvidence: StorageLabEvidence) => {
    onCompletionChange(canMasterStorageLab(nextMachine, nextEvidence));
  };

  const reset = () => {
    setMachine(createStorageMachine());
    setPath("/srv/data/report.bin");
    setOffset("0x1340");
    setPrediction(initialPrediction);
    setTrace(null);
    setEvidence(emptyStorageLabEvidence);
    setWriteValue("candidate-v2");
    setCrashPrediction("");
    setFeedback(null);
    setEngineError("");
    onCompletionChange(false);
  };

  const showUnderlay = () => {
    const nextMachine = setStorageMountActive(createStorageMachine(), "/srv/data", false);
    setMachine(nextMachine);
    setPath("/srv/data/README.local");
    setOffset("0");
    setPrediction(initialPrediction);
    setTrace(null);
    setEvidence(emptyStorageLabEvidence);
    setFeedback({
      correct: true,
      text: t("mount를 끄면 rootfs의 README.local이 다시 보입니다. 필수 mission을 시작하려면 초기화하세요.", "With the mount inactive, rootfs README.local is visible again. Reset to start the required mission."),
    });
    onCompletionChange(false);
  };

  const runPathTrace = () => {
    const byteOffset = numericInput(offset);
    const inode = numericInput(prediction.inode);
    const logicalBlock = numericInput(prediction.logicalBlock);
    const inBlockOffset = numericInput(prediction.inBlockOffset);
    const deviceBlock = numericInput(prediction.deviceBlock);
    const deviceByteAddress = numericInput(prediction.deviceByteAddress);
    if (byteOffset === null || !prediction.device || inode === null || logicalBlock === null || inBlockOffset === null || deviceBlock === null || deviceByteAddress === null) {
      setFeedback({ correct: false, text: t("경로·offset과 여섯 예측 값을 모두 채우세요. 0x 접두사의 16진수도 사용할 수 있습니다.", "Complete the path, offset, and all six prediction values. Hexadecimal values with 0x are accepted.") });
      return;
    }
    try {
      const submitted: StoragePathPrediction = {
        byteOffset,
        device: prediction.device,
        inode,
        logicalBlock,
        inBlockOffset,
        deviceBlock,
        deviceByteAddress,
      };
      const actualTrace = traceStorageOffset(machine, path, byteOffset);
      const nextEvidence = storageLabEvidenceAfterResolution(machine, path, submitted, evidence);
      const correct = path === "/srv/data/report.bin"
        && byteOffset === 0x1340
        && actualTrace.found
        && actualTrace.device === submitted.device
        && actualTrace.inode === submitted.inode
        && actualTrace.logicalBlock === submitted.logicalBlock
        && actualTrace.inBlockOffset === submitted.inBlockOffset
        && actualTrace.deviceBlock === submitted.deviceBlock
        && actualTrace.deviceByteAddress === submitted.deviceByteAddress;
      setTrace(actualTrace);
      setEvidence(nextEvidence);
      setEngineError("");
      updateCompletion(machine, nextEvidence);
      setFeedback({
        correct,
        text: correct
          ? t("예측이 맞았습니다. datafs inode 17의 logical block 1이 block 44에 매핑되고 0x340 offset을 보존해 0x2c340이 됩니다.", "Prediction correct. Logical block 1 of datafs inode 17 maps to block 44 and preserves offset 0x340, producing 0x2c340.")
          : actualTrace.found
            ? t(`실제 trace는 ${actualTrace.device}:inode ${actualTrace.inode}, LBN ${actualTrace.logicalBlock}, block 안 0x${actualTrace.inBlockOffset?.toString(16)}, device block ${actualTrace.deviceBlock}, byte 0x${actualTrace.deviceByteAddress?.toString(16)}입니다. filesystem과 inode를 한 쌍으로 다시 입력하세요.`, `The trace is ${actualTrace.device}:inode ${actualTrace.inode}, LBN ${actualTrace.logicalBlock}, in-block 0x${actualTrace.inBlockOffset?.toString(16)}, device block ${actualTrace.deviceBlock}, byte 0x${actualTrace.deviceByteAddress?.toString(16)}. Re-enter the filesystem and inode as one identity.`)
            : t("경로가 현재 namespace에서 파일과 block에 도달하지 못했습니다. mount 상태와 절대 경로를 확인하세요.", "The path did not reach a file and block in the current namespace. Check the mount state and absolute path."),
      });
    } catch {
      setEngineError(t("저장 경로 모델을 실행하지 못했습니다. 실습 초기화 후 네트워크 없이 다시 시작하세요.", "The storage-path model could not run. Reset the lab to restart without a network runtime."));
      onCompletionChange(false);
    }
  };

  const createLink = () => {
    try {
      const result = createStorageHardLink(machine, "/srv/data/report.bin", "/srv/data/report.link");
      const nextEvidence = storageLabEvidenceAfterHardLink(machine, result, "/srv/data/report.bin", "/srv/data/report.link", evidence);
      setMachine(result.machine);
      setEvidence(nextEvidence);
      setEngineError("");
      updateCompletion(result.machine, nextEvidence);
      setFeedback({
        correct: result.ok,
        text: result.ok
          ? t("report.link가 새 dentry로 추가됐습니다. 두 이름은 datafs:inode 17과 같은 block mapping을 공유하며 link count는 2입니다.", "report.link was added as a new dentry. Both names share datafs:inode 17 and the same block mapping; link count is now 2.")
          : t(`hard link를 만들지 못했습니다: ${result.error}. 먼저 필수 path trace를 확인하고 중복 이름이면 초기화하세요.`, `Could not create the hard link: ${result.error}. Verify the required path trace first, or reset if the name already exists.`),
      });
    } catch {
      setEngineError(t("hard link 전이를 실행하지 못했습니다. 초기화 후 다시 시작하세요.", "The hard-link transition failed. Reset and start again."));
      onCompletionChange(false);
    }
  };

  const unlinkOriginal = () => {
    try {
      const result = unlinkStoragePath(machine, "/srv/data/report.bin");
      const nextEvidence = storageLabEvidenceAfterUnlink(machine, result, "/srv/data/report.bin", "/srv/data/report.link", evidence);
      setMachine(result.machine);
      setEvidence(nextEvidence);
      setPath("/srv/data/report.link");
      setEngineError("");
      updateCompletion(result.machine, nextEvidence);
      setFeedback({
        correct: result.ok && nextEvidence.unlinkLifetimeVerified,
        text: result.ok
          ? nextEvidence.unlinkLifetimeVerified
            ? t("원래 이름만 사라졌고 report.link는 같은 inode 17과 data를 유지합니다. link count는 1입니다. 이 실습은 이 namespace 변경이 이미 반영됐다고 두고 이후 crash에서 file data만 비교합니다.", "Only the original name disappeared. report.link keeps inode 17 and its data, with link count 1. This lab treats that namespace change as committed, then compares file data only across later crashes.")
            : t("unlink는 실행됐지만 같은 inode를 먼저 hard link로 증명하지 않았습니다. 인과 순서를 초기화해 다시 실행하세요.", "unlink ran, but the shared inode was not proved through a hard link first. Reset and replay the causal sequence.")
          : t(`unlink를 실행하지 못했습니다: ${result.error}. report.link를 먼저 만드세요.`, `Could not unlink: ${result.error}. Create report.link first.`),
      });
    } catch {
      setEngineError(t("unlink 전이를 실행하지 못했습니다. 초기화 후 다시 시작하세요.", "The unlink transition failed. Reset and start again."));
      onCompletionChange(false);
    }
  };

  const writeCache = () => {
    if (!writeValue.trim()) {
      setFeedback({ correct: false, text: t("cache에 쓸 새 문자열을 입력하세요.", "Enter a new string to write into the cache.") });
      return;
    }
    try {
      const result = writeStoragePath(machine, "/srv/data/report.link", writeValue);
      setMachine(result.machine);
      setEngineError("");
      updateCompletion(result.machine, evidence);
      setFeedback({
        correct: result.ok,
        text: result.ok
          ? t(`write가 반환되어 cache에는 “${writeValue}”가 보이지만 disk 값은 아직 유지됩니다. crash 결과를 먼저 예측하세요.`, `write returned, so cache shows “${writeValue}” while disk still keeps its prior value. Predict the crash result next.`)
          : t(`write를 실행하지 못했습니다: ${result.error}. hard link와 unlink 단계를 먼저 마치세요.`, `Could not write: ${result.error}. Complete the hard-link and unlink steps first.`),
      });
    } catch {
      setEngineError(t("cache write를 실행하지 못했습니다. 초기화 후 다시 시작하세요.", "The cache write failed. Reset and start again."));
      onCompletionChange(false);
    }
  };

  const fsyncFile = () => {
    try {
      const target = resolveStoragePath(machine, "/srv/data/report.link");
      if (!evidence.dirtyCrashPredicted || target.inode?.kind !== "file" || !target.inode.dirty) {
        setFeedback({ correct: false, text: t("dirty crash 뒤 새 값을 다시 write한 다음에만 fsync할 수 있습니다.", "Fsync is available only after the dirty crash and a new write in the second round.") });
        return;
      }
      const result = fsyncStoragePath(machine, "/srv/data/report.link");
      setMachine(result.machine);
      setEngineError("");
      updateCompletion(result.machine, evidence);
      setFeedback({
        correct: result.ok,
        text: result.ok
          ? t("fsync가 cache의 현재 값을 파일의 persisted data로 옮겼습니다. 같은 값을 crash 결과로 예측해 확인하세요.", "fsync moved the current cache value into persisted file data. Predict the same value after a crash to verify it.")
          : t(`fsync를 실행하지 못했습니다: ${result.error}.`, `Could not fsync: ${result.error}.`),
      });
    } catch {
      setEngineError(t("fsync 전이를 실행하지 못했습니다. 초기화 후 다시 시작하세요.", "The fsync transition failed. Reset and start again."));
      onCompletionChange(false);
    }
  };

  const injectCrash = () => {
    try {
      if (!crashPrediction.trim()) {
        setFeedback({ correct: false, text: t("상태를 바꾸기 전에 crash 뒤 남을 version marker를 먼저 예측하세요.", "Before changing state, predict the version marker that will remain after the crash.") });
        return;
      }
      const target = resolveStoragePath(machine, "/srv/data/report.link");
      if (!target.found || target.inode?.kind !== "file") {
        setFeedback({ correct: false, text: t("crash를 주입할 report.link가 없습니다. link와 unlink 단계를 순서대로 실행하세요.", "There is no report.link for crash injection. Run link and unlink in order.") });
        return;
      }
      const phase = target.inode.dirty ? "dirty" : "synced";
      if (phase === "synced" && !evidence.dirtyCrashPredicted) {
        setFeedback({ correct: false, text: t("먼저 dirty write를 fsync하지 않은 채 crash시켜 손실을 증명하세요.", "First prove loss by crashing a dirty write before fsync.") });
        return;
      }
      const nextMachine = crashStorageMachine(machine);
      const nextEvidence = storageLabEvidenceAfterCrash(machine, nextMachine, "/srv/data/report.link", crashPrediction, phase, evidence);
      const gainedEvidence = phase === "dirty"
        ? !evidence.dirtyCrashPredicted && nextEvidence.dirtyCrashPredicted
        : !evidence.syncedCrashPredicted && nextEvidence.syncedCrashPredicted;
      const actual = readStoragePath(nextMachine, "/srv/data/report.link");
      const attemptCorrect = actual !== null && crashPrediction === actual;
      setMachine(nextMachine);
      setEvidence(nextEvidence);
      setEngineError("");
      updateCompletion(nextMachine, nextEvidence);
      setFeedback({
        correct: attemptCorrect,
        text: attemptCorrect
          ? gainedEvidence
            ? phase === "dirty"
              ? t(`예측이 맞았습니다. dirty cache는 사라지고 persisted 값 “${actual}”로 돌아갔습니다. 이제 다른 값을 write→fsync→crash 하세요.`, `Prediction correct. The dirty cache disappeared and reverted to persisted value “${actual}”. Now write a different value, fsync it, and crash again.`)
              : t(`예측이 맞았습니다. fsync한 “${actual}”가 crash 뒤에도 남아 필수 저장 실습을 완성했습니다.`, `Prediction correct. The fsynced value “${actual}” survived the crash, completing the required storage lab.`)
            : phase === "dirty"
              ? t(`예측은 맞아 persisted 값 “${actual}”로 돌아갔지만, 두 번째 round에서도 fsync를 빠뜨렸습니다. 새 값을 다시 write하고 fsync한 뒤 crash하세요.`, `Your prediction correctly returned to persisted value “${actual}”, but the second round still skipped fsync. Write a new value again, fsync it, then crash.`)
              : t(`예측은 현재 disk 값 “${actual}”와 맞지만 두 번째 round의 새 write를 증명하지 못했습니다. 새 값을 write하고 fsync한 뒤 다시 예측·crash하세요.`, `Your prediction matches the current disk value “${actual}”, but it did not prove a new second-round write. Write a new value, fsync it, then predict and crash again.`)
          : t(`예측 “${crashPrediction}”과 실제 persisted 결과 “${actual}”가 다릅니다. namespace 증거는 유지되므로 새 값을 write한 뒤 이 round의 fsync 여부에 맞춰 다시 예측·crash하세요.`, `Prediction “${crashPrediction}” differs from persisted result “${actual}”. The namespace evidence remains, so write a new value and retry the prediction and crash with the correct fsync choice for this round.`),
      });
      setCrashPrediction("");
      if (phase === "dirty" && gainedEvidence) {
        setWriteValue("durable-v3");
      }
    } catch {
      setEngineError(t("crash 모델을 실행하지 못했습니다. 초기화 후 네트워크 없이 다시 시작하세요.", "The crash model could not run. Reset to restart without a network runtime."));
      onCompletionChange(false);
    }
  };

  const activeResolution = resolveStoragePath(machine, path);
  const survivorResolution = resolveStoragePath(machine, "/srv/data/report.link");
  const canFsyncSecondRound = evidence.dirtyCrashPredicted
    && survivorResolution.inode?.kind === "file"
    && survivorResolution.inode.dirty;
  const evidenceRows = [
    [evidence.pathPredictionCorrect, t("mount·inode·block 주소 예측", "Predict mount, inode, and block address")],
    [evidence.hardLinkIdentityVerified, t("hard link의 inode 동일성 증명", "Prove hard-link inode identity")],
    [evidence.unlinkLifetimeVerified, t("unlink 뒤 survivor 수명 증명", "Prove survivor lifetime after unlink")],
    [evidence.dirtyCrashPredicted, t("dirty write 손실 예측", "Predict dirty-write loss")],
    [evidence.syncedCrashPredicted, t("fsync write 생존 예측", "Predict fsynced-write survival")],
  ] as const;

  return (
    <InteractiveLab
      kicker={t("필수 실습 · PATH → BLOCK → DURABILITY", "REQUIRED LAB · PATH → BLOCK → DURABILITY")}
      title={t("한 파일의 이름, inode, block과 crash 수명을 직접 바꾸세요", "Change one file's name, inode references, blocks, and crash lifetime")}
      description={t("예측 → path trace → hard link·unlink → dirty crash → 두 번째 write·fsync·crash 순서의 실제 상태 전이로만 완료됩니다. link/unlink namespace는 반영된 상태로 두고 두 crash는 file data marker의 생존만 비교합니다.", "Completion requires actual state transitions in order: prediction → path trace → hard link and unlink → dirty crash → second write, fsync, and crash. The link/unlink namespace is treated as committed so both crashes compare only survival of the file-data marker.")}
      className="storage-path-lab"
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t("실습 초기화", "Reset lab")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="storage-engine-error" role="alert">{engineError}</div> : null}
      <div className="storage-lab-body">
        <div className="storage-preset-row" role="group" aria-label={t("저장 namespace preset", "Storage namespace presets")}>
          <button type="button" className="button button-ghost" onClick={reset}>{t("mission 시작", "Mission start")}</button>
          <button type="button" className="button button-ghost" onClick={showUnderlay}>{t("unmount underlay 관찰", "Observe unmounted underlay")}</button>
        </div>

        <div className="storage-control-grid">
          <label className="storage-wide-control"><span>{t("절대 경로", "Absolute path")}</span><input aria-label={t("추적할 저장 경로", "Storage path to trace")} value={path} onChange={(event) => setPath(event.target.value)} spellCheck={false} /></label>
          <label><span>{t("파일 offset", "File offset")}</span><input aria-label={t("추적할 파일 offset", "File offset to trace")} value={offset} onChange={(event) => setOffset(event.target.value)} spellCheck={false} /></label>
          <ChoiceField label={t("filesystem 예측", "Predict filesystem")} value={prediction.device} onValueChange={(value) => setPrediction((current) => ({ ...current, device: value }))} options={[{ value: "rootfs", label: "rootfs" }, { value: "datafs", label: "datafs" }]} />
          <label><span>inode</span><input aria-label={t("inode 번호 예측", "Predicted inode number")} value={prediction.inode} onChange={(event) => setPrediction((current) => ({ ...current, inode: event.target.value }))} inputMode="numeric" /></label>
          <label><span>logical block</span><input aria-label={t("logical block 예측", "Predicted logical block")} value={prediction.logicalBlock} onChange={(event) => setPrediction((current) => ({ ...current, logicalBlock: event.target.value }))} inputMode="numeric" /></label>
          <label><span>in-block offset</span><input aria-label={t("block 내부 offset 예측", "Predicted in-block offset")} value={prediction.inBlockOffset} onChange={(event) => setPrediction((current) => ({ ...current, inBlockOffset: event.target.value }))} spellCheck={false} /></label>
          <label><span>device block</span><input aria-label={t("device block 예측", "Predicted device block")} value={prediction.deviceBlock} onChange={(event) => setPrediction((current) => ({ ...current, deviceBlock: event.target.value }))} inputMode="numeric" /></label>
          <label className="storage-wide-control"><span>device byte address</span><input aria-label={t("device byte 주소 예측", "Predicted device byte address")} value={prediction.deviceByteAddress} onChange={(event) => setPrediction((current) => ({ ...current, deviceByteAddress: event.target.value }))} spellCheck={false} /></label>
          <button type="button" className="button button-primary storage-run-action" onClick={runPathTrace}>{t("path·block trace 실행", "Run path and block trace")}</button>
        </div>

        {feedback ? <p className={`storage-feedback ${feedback.correct ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite">{feedback.text}</p> : <p className="storage-feedback" role="status" aria-live="polite">{t("힌트: 0x1340 ÷ 0x1000에서 quotient와 remainder를 먼저 구하세요.", "Hint: first compute the quotient and remainder of 0x1340 ÷ 0x1000.")}</p>}

        {trace ? (
          <div className="storage-trace" role="group" aria-label={t("최근 path와 block trace", "Latest path and block trace")}>
            <article><span>namespace</span><strong>{trace.device ?? "—"}</strong></article>
            <article><span>dentry → inode</span><strong>{trace.inode ?? "—"}</strong></article>
            <article><span>logical block</span><strong>{trace.logicalBlock ?? "—"} + 0x{trace.inBlockOffset?.toString(16) ?? "—"}</strong></article>
            <article><span>extent</span><strong>device block {trace.deviceBlock ?? "—"}</strong></article>
            <article><span>device byte</span><strong>{trace.deviceByteAddress === null ? "—" : `0x${trace.deviceByteAddress.toString(16)}`}</strong></article>
          </div>
        ) : activeResolution.steps.length > 0 ? (
          <div className="storage-trace" role="group" aria-label={t("현재 pathname 탐색 단계", "Current pathname lookup steps")}>
            {activeResolution.steps.map((step, index) => <article key={`${step.kind}-${index}`}><span>{step.kind}</span><strong>{step.kind === "mount" ? `${step.mountPoint}: ${step.fromDevice} → ${step.toDevice}` : `${step.device}:dir ${step.directoryInode} / ${step.name} → inode ${step.inode}`}</strong></article>)}
          </div>
        ) : null}

        <StorageStateView machine={machine} locale={locale} />

        <div className="storage-control-grid" role="group" aria-label={t("link와 crash 상태 전이", "Link and crash state transitions")}>
          <button type="button" className="button button-secondary" onClick={createLink} disabled={!evidence.pathPredictionCorrect}>{t("report.link 만들기", "Create report.link")}</button>
          <button type="button" className="button button-secondary" onClick={unlinkOriginal} disabled={!evidence.hardLinkIdentityVerified}>{t("원본 report.bin unlink", "Unlink original report.bin")}</button>
          <label className="storage-wide-control"><span>{t("cache에 쓸 값", "Value to write into cache")}</span><input aria-label={t("cache write 값", "Cache write value")} value={writeValue} onChange={(event) => setWriteValue(event.target.value)} /></label>
          <button type="button" className="button button-secondary" onClick={writeCache} disabled={!evidence.unlinkLifetimeVerified}>{t("이 round에 cache 쓰기", "Write cache this round")}</button>
          <button type="button" className="button button-secondary" onClick={fsyncFile} disabled={!canFsyncSecondRound}>{t("두 번째 round: file fsync", "Second round: fsync file")}</button>
          <label className="storage-wide-control"><span>{t("crash 뒤 version marker 예측", "Predict version marker after crash")}</span><input aria-label={t("crash 뒤 남을 version marker 예측", "Predicted version marker after crash")} value={crashPrediction} onChange={(event) => setCrashPrediction(event.target.value)} /></label>
          <button type="button" className="button button-primary storage-run-action" onClick={injectCrash} disabled={!evidence.unlinkLifetimeVerified}>{t("이 round crash 주입·판정", "Crash this round and evaluate")}</button>
        </div>

        <div className="storage-evidence" role="status" aria-live="polite">
          {evidenceRows.map(([complete, label]) => <span key={label} className={complete ? "is-complete" : undefined}>{complete ? "✓" : "○"} {label}</span>)}
        </div>
        {canMasterStorageLab(machine, evidence) ? <p className="storage-lab-mastered" role="status">{t("필수 실습 완료 — path, hard link 수명과 dirty·synced crash를 인과 순서로 증명했습니다.", "Required lab complete — you proved path resolution, hard-link lifetime, and dirty versus synced crashes in causal order.")}</p> : null}
        <noscript><p>{t("JavaScript 없이도 위의 초기 namespace 설명을 읽을 수 있습니다. 상호작용을 켜면 상태 전이를 직접 검증할 수 있습니다.", "The initial namespace explanation remains readable without JavaScript. Enable interaction to verify the transitions directly.")}</p></noscript>
      </div>
    </InteractiveLab>
  );
}

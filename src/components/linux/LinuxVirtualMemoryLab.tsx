import { useEffect, useState } from "react";
import {
  accessVirtualMemory,
  canMasterVirtualMemoryLab,
  createVirtualMemoryMachine,
  heapIsolation,
  memoryLabEvidenceAfterAccess,
  parseVirtualAddress,
  type MemoryAccessResult,
  type MemoryLabEvidence,
  type MemoryOperation,
  type MemoryPrediction,
  type MemoryProcessId,
} from "../../features/linux-runtime/memory-and-virtual-addresses";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { VirtualMemoryStateView } from "./VirtualMemoryStateView";

const emptyEvidence: MemoryLabEvidence = {
  sharedReadPredicted: false,
  offsetPreserved: false,
  cowWritePredicted: false,
  isolationVerified: false,
  demandFaultPredicted: false,
};

type Feedback = {
  correct: boolean;
  text: string;
};

export function LinuxVirtualMemoryLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [machine, setMachine] = useState(createVirtualMemoryMachine);
  const [processId, setProcessId] = useState<MemoryProcessId>("child");
  const [operation, setOperation] = useState<MemoryOperation>("read");
  const [address, setAddress] = useState("0x4018");
  const [writeValue, setWriteValue] = useState("99");
  const [prediction, setPrediction] = useState<MemoryPrediction | "">("");
  const [result, setResult] = useState<MemoryAccessResult | null>(null);
  const [evidence, setEvidence] = useState(emptyEvidence);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [engineError, setEngineError] = useState("");

  useEffect(() => setInteractiveReady(true), []);

  const reset = () => {
    setMachine(createVirtualMemoryMachine());
    setProcessId("child");
    setOperation("read");
    setAddress("0x4018");
    setWriteValue("99");
    setPrediction("");
    setResult(null);
    setEvidence(emptyEvidence);
    setFeedback(null);
    setEngineError("");
    onCompletionChange(false);
  };

  const setPreset = (preset: "shared" | "cow" | "demand" | "protection") => {
    if (preset === "shared") {
      setProcessId("child");
      setAddress("0x4018");
      setOperation("read");
    } else if (preset === "cow") {
      setProcessId("child");
      setAddress("0x4018");
      setOperation("write");
      setWriteValue("99");
    } else if (preset === "demand") {
      setProcessId("parent");
      setAddress("0x5018");
      setOperation("write");
      setWriteValue("5");
    } else {
      setProcessId("child");
      setAddress("0x4018");
      setOperation("execute");
    }
    setPrediction("");
    setResult(null);
    setFeedback(null);
  };

  const runAccess = () => {
    const parsedAddress = parseVirtualAddress(address);
    const parsedWriteValue = Number(writeValue);
    if (parsedAddress === null) {
      setFeedback({
        correct: false,
        text: t("주소는 0x0000부터 0xffff까지의 16진수 또는 10진수로 입력하세요.", "Enter a hexadecimal or decimal address from 0x0000 through 0xffff."),
      });
      return;
    }
    if (!prediction) {
      setFeedback({
        correct: false,
        text: t("먼저 CPU 접근의 결과를 예측하세요.", "Predict the CPU access result first."),
      });
      return;
    }
    if (operation === "write" && (!Number.isInteger(parsedWriteValue) || parsedWriteValue < 0 || parsedWriteValue > 255)) {
      setFeedback({
        correct: false,
        text: t("쓸 값은 0부터 255 사이의 정수여야 합니다.", "The written value must be an integer from 0 through 255."),
      });
      return;
    }

    let access: MemoryAccessResult;
    try {
      access = accessVirtualMemory(machine, processId, parsedAddress, operation, parsedWriteValue);
      setEngineError("");
    } catch {
      setEngineError(t("가상 메모리 모델을 실행하지 못했습니다. 실습 초기화 후 네트워크 없이 다시 시작하세요.", "The virtual-memory model could not run. Reset the lab to restart without a network runtime."));
      onCompletionChange(false);
      return;
    }
    const predictionCorrect = prediction === access.prediction;
    const nextEvidence = memoryLabEvidenceAfterAccess(
      machine,
      access,
      predictionCorrect,
      evidence,
    );
    setMachine(access.machine);
    setResult(access);
    setEvidence(nextEvidence);
    const mastered = canMasterVirtualMemoryLab(access.machine, nextEvidence);
    onCompletionChange(mastered);

    const outcome = access.prediction === "mapped"
      ? t("PTE의 권한으로 접근했고 같은 page offset을 유지해 물리 주소를 만들었습니다.", "The PTE allowed access, and translation kept the same page offset in the physical address.")
      : access.prediction === "cow-copy"
        ? t("쓰기 보호 fault를 커널이 COW로 처리해 자식 전용 프레임을 만든 뒤 명령을 재개했습니다.", "The kernel handled the write-protection fault with COW, created a private child frame, then resumed the instruction.")
        : access.prediction === "demand-zero"
          ? access.operation === "read"
            ? t("not-present read fault를 커널이 공유 read-only zero page mapping으로 처리한 뒤 명령을 재개했습니다.", "The kernel handled the not-present read fault by mapping a shared read-only zero page, then resumed the instruction.")
            : t("not-present write fault를 커널이 private zero-filled page 할당으로 처리하고 값을 쓴 뒤 명령을 재개했습니다.", "The kernel handled the not-present write fault by allocating a private zero-filled page, writing the value, then resuming the instruction.")
          : access.prediction === "protection-fault"
            ? t("페이지는 있지만 요청한 동작의 PTE 권한이 없어 명령을 재개하지 못했습니다.", "The page exists, but its PTE does not permit this operation, so the instruction did not resume.")
            : t("해당 VPN의 유효한 mapping이 없어 이 모델에서는 SIGSEGV로 끝납니다.", "No valid mapping covers that VPN, so this model ends with SIGSEGV.");
    setFeedback({
      correct: predictionCorrect,
      text: predictionCorrect
        ? `${t("예측이 맞았습니다.", "Prediction correct.")} ${outcome}`
        : `${t(`예측은 ${prediction}였지만 실제 결과는 ${access.prediction}입니다.`, `You predicted ${prediction}, but the actual result is ${access.prediction}.`)} ${outcome}${access.prediction === "cow-copy" || access.prediction === "demand-zero" ? ` ${t("page 상태가 바뀌었으므로 같은 시나리오를 다시 예측하려면 실습을 초기화하세요.", "Page state changed; reset the lab before retrying that scenario.")}` : ""}`,
    });
  };

  const isolation = heapIsolation(machine);
  const evidenceRows = [
    [evidence.sharedReadPredicted, t("공유 COW page 읽기 예측", "Predict shared COW-page read")],
    [evidence.offsetPreserved, t("page offset 보존 확인", "Verify preserved page offset")],
    [evidence.cowWritePredicted, t("COW 쓰기 fault 예측", "Predict COW write fault")],
    [evidence.isolationVerified, t("부모·자식 값 격리 확인", "Verify parent-child value isolation")],
    [evidence.demandFaultPredicted, t("demand-zero fault 예측", "Predict demand-zero fault")],
  ] as const;

  return (
    <InteractiveLab
      kicker={t("필수 실습 · PAGE TABLE + COW", "REQUIRED LAB · PAGE TABLE + COW")}
      title={t("가상 주소 하나를 번역하고 fault를 처리하세요", "Translate one virtual address and handle its fault")}
      description={t("예측 → CPU 접근 → PTE·프레임 변화의 순서로 같은 가상 주소와 같은 물리 저장소를 분리합니다.", "Follow prediction → CPU access → PTE and frame changes to separate equal virtual addresses from equal physical storage.")}
      className="virtual-memory-lab"
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t("실습 초기화", "Reset lab")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="memory-engine-error" role="alert">{engineError}</div> : null}
      <div className="virtual-memory-lab-body">
        <div className="memory-preset-row" role="group" aria-label={t("학습 시나리오 preset", "Learning scenario presets")}>
          <button type="button" className="button button-ghost" onClick={() => setPreset("shared")}>{t("1. 공유 읽기", "1. Shared read")}</button>
          <button type="button" className="button button-ghost" onClick={() => setPreset("cow")}>{t("2. COW 쓰기", "2. COW write")}</button>
          <button type="button" className="button button-ghost" onClick={() => setPreset("demand")}>{t("3. demand page", "3. Demand page")}</button>
          <button type="button" className="button button-ghost" onClick={() => setPreset("protection")}>{t("보호 fault 비교", "Compare protection fault")}</button>
        </div>

        <div className="memory-control-grid">
          <label>
            <span>{t("프로세스", "Process")}</span>
            <select aria-label={t("접근할 프로세스", "Process to access")} value={processId} onChange={(event) => setProcessId(event.target.value as MemoryProcessId)}>
              <option value="parent">{t("부모 PID 420", "Parent PID 420")}</option>
              <option value="child">{t("자식 PID 421", "Child PID 421")}</option>
            </select>
          </label>
          <label>
            <span>{t("가상 주소", "Virtual address")}</span>
            <input aria-label={t("가상 주소 입력", "Virtual address input")} value={address} onChange={(event) => setAddress(event.target.value)} inputMode="text" spellCheck={false} />
          </label>
          <label>
            <span>{t("동작", "Operation")}</span>
            <select aria-label={t("메모리 동작", "Memory operation")} value={operation} onChange={(event) => setOperation(event.target.value as MemoryOperation)}>
              <option value="read">read</option>
              <option value="write">write</option>
              <option value="execute">execute</option>
            </select>
          </label>
          <label>
            <span>{t("쓸 값", "Write value")}</span>
            <input aria-label={t("쓸 byte 값", "Byte value to write")} type="number" min="0" max="255" value={writeValue} onChange={(event) => setWriteValue(event.target.value)} disabled={operation !== "write"} />
          </label>
          <label className="memory-prediction-control">
            <span>{t("결과 예측", "Predict result")}</span>
            <select aria-label={t("접근 결과 예측", "Access result prediction")} value={prediction} onChange={(event) => setPrediction(event.target.value as MemoryPrediction | "")}>
              <option value="">{t("예측 선택", "Choose a prediction")}</option>
              <option value="mapped">mapped</option>
              <option value="cow-copy">COW copy + resume</option>
              <option value="demand-zero">demand-zero + resume</option>
              <option value="protection-fault">protection fault</option>
              <option value="segmentation-fault">unmapped → SIGSEGV</option>
            </select>
          </label>
          <button type="button" className="button button-primary memory-run-access" onClick={runAccess}>{t("CPU 접근 실행·판정", "Run and evaluate CPU access")}</button>
        </div>

        {feedback ? (
          <div className={`memory-live-feedback ${feedback.correct ? "is-correct" : "is-incorrect"}`} role="status" aria-live="polite" tabIndex={-1}>
            {feedback.text}
          </div>
        ) : (
          <p className="memory-live-feedback" role="status" aria-live="polite">{t("preset 1부터 순서대로 예측하면 모든 증거를 모을 수 있습니다.", "Predict presets 1 through 3 in order to collect every piece of evidence.")}</p>
        )}

        {result ? (
          <div className="memory-translation-strip" role="group" aria-label={t("최근 주소 번역 결과", "Latest address translation result")}>
            <span>VA <strong>0x{result.virtualAddress.toString(16).padStart(4, "0")}</strong></span>
            <span>VPN <strong>0x{result.vpn.toString(16)}</strong></span>
            <span>offset <strong>0x{result.offset.toString(16).padStart(3, "0")}</strong></span>
            <span>frame <strong>{result.frame === null ? "—" : `F${result.frame}`}</strong></span>
            <span>PA <strong>{result.physicalAddress === null ? "—" : `0x${result.physicalAddress.toString(16)}`}</strong></span>
          </div>
        ) : null}

        <VirtualMemoryStateView machine={machine} locale={locale} />

        <div className="memory-isolation-proof" role="group" aria-label={t("COW 격리 증거", "COW isolation evidence")}>
          <span>{t("부모 heap", "Parent heap")}: F{isolation.parentFrame ?? "—"} · {t("값", "value")} {isolation.parentValue ?? "—"}</span>
          <span>{t("자식 heap", "Child heap")}: F{isolation.childFrame ?? "—"} · {t("값", "value")} {isolation.childValue ?? "—"}</span>
          <strong>{isolation.isolated
            ? t("격리 증명", "ISOLATION PROVED")
            : isolation.separated
              ? t("frame 분리 · 다른 값을 써서 증명", "FRAMES SEPARATED · WRITE A DIFFERENT VALUE TO PROVE")
              : t("아직 공유 중", "STILL SHARED")}</strong>
        </div>

        <div className="memory-evidence" role="status" aria-live="polite">
          {evidenceRows.map(([complete, label]) => (
            <span key={label} className={complete ? "is-complete" : undefined}>{complete ? "✓" : "○"} {label}</span>
          ))}
        </div>
        {canMasterVirtualMemoryLab(machine, evidence) ? <p className="memory-lab-mastered" role="status">{t("필수 실습 완료 — 주소 번역, COW 격리와 demand paging을 모두 증명했습니다.", "Required lab complete — you proved address translation, COW isolation, and demand paging.")}</p> : null}
        <noscript><p>{t("상호작용을 실행할 수 없어도 위의 초기 page table을 읽을 수 있습니다. JavaScript를 켜면 상태 전이를 직접 검증할 수 있습니다.", "The initial page table remains readable without interaction. Enable JavaScript to verify the state transitions directly.")}</p></noscript>
      </div>
    </InteractiveLab>
  );
}

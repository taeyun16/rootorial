import { useEffect, useState } from "react";
import {
  evaluateMemoryIncident,
  memoryIncidentIds,
  type MemoryIncidentEvaluation,
  type MemoryIncidentId,
  type MemoryIncidentSubmission,
} from "../../features/linux-runtime/memory-and-virtual-addresses";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

type Draft = Record<string, string>;

function numberFrom(value: string | undefined) {
  if (!value) return undefined;
  const input = value.trim().toLowerCase();
  if (!/^(?:0x[0-9a-f]+|[0-9]+)$/.test(input)) return undefined;
  return Number.parseInt(input, input.startsWith("0x") ? 16 : 10);
}

const emptyDrafts: Record<MemoryIncidentId, Draft> = {
  translation: {},
  "tlb-miss": {},
  "cow-isolation": {},
  "maps-residency": {},
};

export function LinuxMemoryDebuggerLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [evaluations, setEvaluations] = useState<Partial<Record<MemoryIncidentId, MemoryIncidentEvaluation>>>({});
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [engineError, setEngineError] = useState("");

  useEffect(() => setInteractiveReady(true), []);

  const setField = (id: MemoryIncidentId, field: string, value: string) => {
    setDrafts((current) => ({
      ...current,
      [id]: { ...current[id], [field]: value },
    }));
    setEvaluations((current) => ({ ...current, [id]: undefined }));
    onCompletionChange(false);
  };

  const submissionFor = (id: MemoryIncidentId): MemoryIncidentSubmission => {
    const draft = drafts[id];
    if (id === "translation") {
      return {
        vpn: numberFrom(draft.vpn),
        offset: numberFrom(draft.offset),
        physicalAddress: numberFrom(draft.physicalAddress),
      };
    }
    if (id === "tlb-miss") {
      return {
        ptePresent: draft.ptePresent === "present" ? true : draft.ptePresent === "absent" ? false : undefined,
        tlbOutcome: draft.tlbOutcome as MemoryIncidentSubmission["tlbOutcome"],
      };
    }
    if (id === "cow-isolation") {
      return {
        parentFrame: numberFrom(draft.parentFrame),
        childFrame: numberFrom(draft.childFrame),
        parentValue: numberFrom(draft.parentValue),
        childValue: numberFrom(draft.childValue),
      };
    }
    return {
      mappedPages: numberFrom(draft.mappedPages),
      residentPages: numberFrom(draft.residentPages),
      residencyConclusion: draft.residencyConclusion as MemoryIncidentSubmission["residencyConclusion"],
    };
  };

  const audit = (id: MemoryIncidentId) => {
    try {
      const evaluation = evaluateMemoryIncident(id, submissionFor(id));
      const next = { ...evaluations, [id]: evaluation };
      setEvaluations(next);
      setEngineError("");
      onCompletionChange(memoryIncidentIds.every((incidentId) => next[incidentId]?.correct));
    } catch {
      setEngineError(t("메모리 사건 판정기를 실행하지 못했습니다. 모든 사건을 초기화해 다시 시작하세요.", "The memory-incident grader could not run. Reset all incidents and start again."));
      onCompletionChange(false);
    }
  };

  const reset = () => {
    setDrafts(emptyDrafts);
    setEvaluations({});
    setEngineError("");
    onCompletionChange(false);
  };

  const feedbackFor = (id: MemoryIncidentId, evaluation: MemoryIncidentEvaluation) => {
    if (evaluation.correct) {
      if (id === "translation") return t("수리 완료. VPN만 frame으로 바꾸고 0xabc offset은 그대로 보존해 PA 0x9abc를 만들었습니다.", "Repair complete. You replaced only the VPN with the frame and preserved offset 0xabc to produce PA 0x9abc.");
      if (id === "tlb-miss") return t("수리 완료. TLB miss 뒤 present PTE를 page-table walk로 찾아 translation cache를 채웠습니다. page fault는 발생하지 않았습니다.", "Repair complete. After the TLB miss, a page-table walk found the present PTE and filled the translation cache. No page fault occurred.");
      if (id === "cow-isolation") return t("수리 완료. 자식만 새 frame과 값 99를 가지며 부모 frame 7의 값 41은 보존됩니다.", "Repair complete. Only the child has a new frame and value 99; parent frame 7 keeps value 41.");
      return t("수리 완료. 여섯 virtual page가 mapped되어도 현재 resident인 것은 세 page뿐임을 구분했습니다.", "Repair complete. You distinguished six mapped virtual pages from only three pages currently resident.");
    }
    const labels: Record<string, string> = {
      vpn: t("VA 0x2abc를 4 KiB로 나눈 VPN은 0x2입니다.", "Splitting VA 0x2abc by 4 KiB gives VPN 0x2."),
      offset: t("page 안의 offset은 하위 12 bit, 즉 0xabc이며 translation 중 바뀌지 않습니다.", "The in-page offset is the low 12 bits, 0xabc, and translation does not change it."),
      "physical-address": t("PTE의 frame 0x9와 보존한 offset 0xabc를 결합하세요.", "Combine PTE frame 0x9 with the preserved offset 0xabc."),
      "pte-present": t("incident 기록에 PTE present=1이 있으므로 not-present fault가 아닙니다.", "The incident record says PTE present=1, so this is not a not-present fault."),
      "tlb-outcome": t("TLB는 translation cache입니다. miss 뒤에는 먼저 page table을 걷고 present PTE를 cache에 채웁니다.", "The TLB is a translation cache. After a miss, first walk the page table and cache the present PTE."),
      "parent-frame": t("COW 쓰기는 부모 PTE를 바꾸지 않으므로 부모는 frame 7을 유지합니다.", "A COW write does not change the parent PTE, so the parent keeps frame 7."),
      "child-frame": t("자식 frame은 유효한 새 frame이어야 하며 부모 frame과 달라야 합니다. 숫자는 특정 값으로 고정되지 않습니다.", "The child needs a valid new frame distinct from the parent frame; its numeric ID is not fixed."),
      "parent-value": t("부모의 기존 값 41은 자식 쓰기 뒤에도 보존되어야 합니다.", "The parent's existing value 41 must remain after the child write."),
      "child-value": t("자식의 private frame에 요청한 값 99가 기록되어야 합니다.", "The requested value 99 must be written to the child's private frame."),
      "mapped-pages": t("maps의 세 구간 길이를 4 KiB page로 나누면 2+3+1=6 page입니다.", "Converting the three maps ranges to 4 KiB pages gives 2+3+1=6 pages."),
      "resident-pages": t("mincore 증거의 resident bit는 1+1+1=3 page입니다.", "The mincore evidence contains 1+1+1=3 resident pages."),
      "residency-conclusion": t("/proc/<pid>/maps는 VMA 계약을 보여 주며 모든 page의 현재 RAM residency를 보장하지 않습니다.", "/proc/<pid>/maps shows VMA contracts; it does not guarantee that every page is currently resident in RAM."),
    };
    return evaluation.errors.map((error) => labels[error]).filter(Boolean).join(" ");
  };

  const completed = memoryIncidentIds.filter((id) => evaluations[id]?.correct).length;

  return (
    <InteractiveLab
      kicker={t("별도 활동 · MEMORY INCIDENTS", "SEPARATE ACTIVITY · MEMORY INCIDENTS")}
      title={t("네 개의 메모리 진단 기록을 계산으로 수리하세요", "Repair four memory diagnostics with computed evidence")}
      description={t("정답 preset 이름이 아니라 VPN·offset·frame·resident 상태의 실제 계약으로 판정합니다.", "Grading uses the actual VPN, offset, frame, and residency contracts—not the name of an answer preset.")}
      className="memory-debugger-lab"
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t("모든 사건 초기화", "Reset all incidents")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="memory-engine-error" role="alert">{engineError}</div> : null}
      <div className="memory-debugger-body">
        <div className="memory-debug-progress" role="status" aria-live="polite">
          <strong>{completed} / {memoryIncidentIds.length}</strong>
          <span>{t("의미 계약을 통과한 사건", "incidents passing their semantic contracts")}</span>
        </div>
        <div className="memory-debug-grid">
          <fieldset className={`memory-debug-card ${evaluations.translation?.correct ? "is-correct" : evaluations.translation ? "is-incorrect" : ""}`}>
            <legend>01 · {t("offset을 잃은 translator", "Translator dropped the offset")}</legend>
            <p>page=4 KiB · VA=0x2abc · PTE[0x2]→frame 0x9</p>
            <label><span>VPN</span><input aria-label={t("translation 사건 VPN", "Translation incident VPN")} value={drafts.translation.vpn ?? ""} onChange={(event) => setField("translation", "vpn", event.target.value)} placeholder="0x…" /></label>
            <label><span>offset</span><input aria-label={t("translation 사건 offset", "Translation incident offset")} value={drafts.translation.offset ?? ""} onChange={(event) => setField("translation", "offset", event.target.value)} placeholder="0x…" /></label>
            <label><span>{t("물리 주소", "Physical address")}</span><input aria-label={t("translation 사건 물리 주소", "Translation incident physical address")} value={drafts.translation.physicalAddress ?? ""} onChange={(event) => setField("translation", "physicalAddress", event.target.value)} placeholder="0x…" /></label>
            <button type="button" className="button button-primary" onClick={() => audit("translation")}>{t("계산 실행·진단", "Run calculation and diagnose")}</button>
            {evaluations.translation ? <p className="memory-debug-feedback" role="status" aria-live="polite">{feedbackFor("translation", evaluations.translation)}</p> : null}
          </fieldset>

          <fieldset className={`memory-debug-card ${evaluations["tlb-miss"]?.correct ? "is-correct" : evaluations["tlb-miss"] ? "is-incorrect" : ""}`}>
            <legend>02 · {t("TLB miss를 fault로 오진", "TLB miss misdiagnosed as a fault")}</legend>
            <p>TLB=miss · PTE[0x4]: present=1, r=1</p>
            <label><span>PTE</span><select aria-label={t("TLB 사건 PTE 상태", "TLB incident PTE state")} value={drafts["tlb-miss"].ptePresent ?? ""} onChange={(event) => setField("tlb-miss", "ptePresent", event.target.value)}><option value="">—</option><option value="present">present</option><option value="absent">not present</option></select></label>
            <label><span>{t("다음 동작", "Next action")}</span><select aria-label={t("TLB miss 다음 동작", "Action after TLB miss")} value={drafts["tlb-miss"].tlbOutcome ?? ""} onChange={(event) => setField("tlb-miss", "tlbOutcome", event.target.value)}><option value="">—</option><option value="page-table-walk">page-table walk + fill</option><option value="page-fault">page fault</option><option value="segmentation-fault">SIGSEGV</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("tlb-miss")}>{t("trace 실행·진단", "Run trace and diagnose")}</button>
            {evaluations["tlb-miss"] ? <p className="memory-debug-feedback" role="status" aria-live="polite">{feedbackFor("tlb-miss", evaluations["tlb-miss"])}</p> : null}
          </fieldset>

          <fieldset className={`memory-debug-card ${evaluations["cow-isolation"]?.correct ? "is-correct" : evaluations["cow-isolation"] ? "is-incorrect" : ""}`}>
            <legend>03 · {t("부모까지 바뀐 COW", "COW write leaked into parent")}</legend>
            <p>{t("초기: 부모·자식 VA 0x4018 → F7, 값 41 · 자식 write(99)", "Initial: parent and child VA 0x4018 → F7, value 41 · child write(99)")}</p>
            <label><span>{t("부모 frame", "Parent frame")}</span><input type="number" aria-label={t("COW 부모 frame", "COW parent frame")} value={drafts["cow-isolation"].parentFrame ?? ""} onChange={(event) => setField("cow-isolation", "parentFrame", event.target.value)} /></label>
            <label><span>{t("자식 frame", "Child frame")}</span><input type="number" aria-label={t("COW 자식 frame", "COW child frame")} value={drafts["cow-isolation"].childFrame ?? ""} onChange={(event) => setField("cow-isolation", "childFrame", event.target.value)} /></label>
            <label><span>{t("부모 값", "Parent value")}</span><input type="number" aria-label={t("COW 부모 값", "COW parent value")} value={drafts["cow-isolation"].parentValue ?? ""} onChange={(event) => setField("cow-isolation", "parentValue", event.target.value)} /></label>
            <label><span>{t("자식 값", "Child value")}</span><input type="number" aria-label={t("COW 자식 값", "COW child value")} value={drafts["cow-isolation"].childValue ?? ""} onChange={(event) => setField("cow-isolation", "childValue", event.target.value)} /></label>
            <button type="button" className="button button-primary" onClick={() => audit("cow-isolation")}>{t("PTE 수리·검증", "Repair PTEs and verify")}</button>
            {evaluations["cow-isolation"] ? <p className="memory-debug-feedback" role="status" aria-live="polite">{feedbackFor("cow-isolation", evaluations["cow-isolation"])}</p> : null}
          </fieldset>

          <fieldset className={`memory-debug-card ${evaluations["maps-residency"]?.correct ? "is-correct" : evaluations["maps-residency"] ? "is-incorrect" : ""}`}>
            <legend>04 · {t("maps를 RSS로 오독", "Reading maps as RSS")}</legend>
            <pre>{`004000-006000 r-xp app\n010000-013000 rw-p [heap]\n07f000-080000 rw-p [stack]\nmincore: 10 | 010 | 1`}</pre>
            <label><span>{t("mapped page 수", "Mapped pages")}</span><input type="number" aria-label={t("maps 사건 mapped page 수", "Maps incident mapped page count")} value={drafts["maps-residency"].mappedPages ?? ""} onChange={(event) => setField("maps-residency", "mappedPages", event.target.value)} /></label>
            <label><span>{t("resident page 수", "Resident pages")}</span><input type="number" aria-label={t("maps 사건 resident page 수", "Maps incident resident page count")} value={drafts["maps-residency"].residentPages ?? ""} onChange={(event) => setField("maps-residency", "residentPages", event.target.value)} /></label>
            <label><span>{t("결론", "Conclusion")}</span><select aria-label={t("maps와 residency 결론", "Maps and residency conclusion")} value={drafts["maps-residency"].residencyConclusion ?? ""} onChange={(event) => setField("maps-residency", "residencyConclusion", event.target.value)}><option value="">—</option><option value="all-mapped-resident">{t("mapped면 모두 resident", "Every mapped page is resident")}</option><option value="mapped-not-resident">{t("mapping과 residency는 별도", "Mapping and residency are distinct")}</option><option value="rss-is-virtual">{t("RSS가 virtual 범위", "RSS is the virtual range")}</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("maps-residency")}>{t("수치 감사·진단", "Audit counts and diagnose")}</button>
            {evaluations["maps-residency"] ? <p className="memory-debug-feedback" role="status" aria-live="polite">{feedbackFor("maps-residency", evaluations["maps-residency"])}</p> : null}
          </fieldset>
        </div>
        {completed === memoryIncidentIds.length ? <p className="memory-debug-mastered" role="status">{t("사건 디버깅 완료 — 네 오진을 실제 translation·frame·residency 계약으로 수리했습니다.", "Incident debugging complete — all four misdiagnoses now satisfy the actual translation, frame, and residency contracts.")}</p> : null}
      </div>
    </InteractiveLab>
  );
}

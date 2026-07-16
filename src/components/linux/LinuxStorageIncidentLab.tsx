import { useEffect, useState } from "react";
import {
  crashSafeReplaceSteps,
  evaluateStorageIncident,
  storageIncidentIds,
  type CrashSafeReplaceStep,
  type StorageIncidentEvaluation,
  type StorageIncidentId,
  type StorageIncidentSubmission,
} from "../../features/linux-runtime/storage-and-filesystems";
import { useLocale } from "../../features/localization/localization";
import { InteractiveLab } from "../interactive/InteractiveLab";

type Draft = Record<string, string>;

const emptyDrafts: Record<StorageIncidentId, Draft> = {
  "mount-shadow": {},
  "inode-exhaustion": {},
  "deleted-open": {},
  "crash-safe-replace": {},
};

function numberFrom(value: string | undefined) {
  if (!value || !/^(?:0x[0-9a-f]+|[0-9]+)$/i.test(value.trim())) return undefined;
  const normalized = value.trim().toLowerCase();
  return Number.parseInt(normalized, normalized.startsWith("0x") ? 16 : 10);
}

function booleanFrom(value: string | undefined) {
  return value === "true" ? true : value === "false" ? false : undefined;
}

export function LinuxStorageIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [drafts, setDrafts] = useState(emptyDrafts);
  const [evaluations, setEvaluations] = useState<Partial<Record<StorageIncidentId, StorageIncidentEvaluation>>>({});
  const [interactiveReady, setInteractiveReady] = useState(false);
  const [engineError, setEngineError] = useState("");

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => setEngineError(""), [locale]);

  const setField = (id: StorageIncidentId, field: string, value: string) => {
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [field]: value } }));
    setEvaluations((current) => ({ ...current, [id]: undefined }));
    onCompletionChange(false);
  };

  const submissionFor = (id: StorageIncidentId): StorageIncidentSubmission => {
    const draft = drafts[id];
    if (id === "mount-shadow") {
      return {
        mountedDevice: draft.mountedDevice as StorageIncidentSubmission["mountedDevice"],
        mountedInode: numberFrom(draft.mountedInode),
        underlayDevice: draft.underlayDevice as StorageIncidentSubmission["underlayDevice"],
        underlayInode: numberFrom(draft.underlayInode),
        mergedView: booleanFrom(draft.mergedView),
      };
    }
    if (id === "inode-exhaustion") {
      return {
        freeBlocks: numberFrom(draft.freeBlocks),
        freeInodes: numberFrom(draft.freeInodes),
        createOutcome: draft.createOutcome as StorageIncidentSubmission["createOutcome"],
        repairedFreeBlocks: numberFrom(draft.repairedFreeBlocks),
        repairedFreeInodes: numberFrom(draft.repairedFreeInodes),
        repairedOutcome: draft.repairedOutcome as StorageIncidentSubmission["repairedOutcome"],
      };
    }
    if (id === "deleted-open") {
      return {
        linkCount: numberFrom(draft.linkCount),
        openRefs: numberFrom(draft.openRefs),
        blocksAllocated: booleanFrom(draft.blocksAllocated),
        afterCloseBlocksAllocated: booleanFrom(draft.afterCloseBlocksAllocated),
      };
    }
    return {
      replaceSteps: [draft.step1, draft.step2, draft.step3, draft.step4]
        .filter((value): value is CrashSafeReplaceStep => crashSafeReplaceSteps.includes(value as CrashSafeReplaceStep)),
      crashGuarantee: draft.crashGuarantee as StorageIncidentSubmission["crashGuarantee"],
    };
  };

  const audit = (id: StorageIncidentId) => {
    try {
      const evaluation = evaluateStorageIncident(id, submissionFor(id));
      const next = { ...evaluations, [id]: evaluation };
      setEvaluations(next);
      setEngineError("");
      onCompletionChange(storageIncidentIds.every((incidentId) => next[incidentId]?.correct));
    } catch {
      setEngineError(t("파일시스템 사건 판정기를 실행하지 못했습니다. 모든 사건을 초기화해 다시 시작하세요.", "The filesystem-incident grader could not run. Reset all incidents and start again."));
      onCompletionChange(false);
    }
  };

  const reset = () => {
    setDrafts(emptyDrafts);
    setEvaluations({});
    setEngineError("");
    onCompletionChange(false);
  };

  const feedbackFor = (id: StorageIncidentId, evaluation: StorageIncidentEvaluation) => {
    if (evaluation.correct) {
      if (id === "mount-shadow") return t("수리 완료. mount 중에는 datafs:inode 17이 보이고, unmount 뒤 rootfs:inode 4가 되며 두 directory는 합쳐지지 않습니다.", "Repair complete. The mounted view reaches datafs:inode 17; unmount reveals rootfs:inode 4, and the directories never merge.");
      if (id === "inode-exhaustion") return t("수리 완료. 128 free block과 0 free inode를 분리했고 data block이 없는 기존 빈 파일을 지워 inode 하나만 회수한 뒤 create가 성공함을 계산했습니다.", "Repair complete. You separated 128 free blocks from zero free inodes, deleted an existing empty file with no data blocks, and computed success after reclaiming its inode.");
      if (id === "deleted-open") return t("수리 완료. link count 0이어도 open ref 1이 block을 유지하고, 마지막 close 뒤 회수됩니다.", "Repair complete. One open reference keeps the blocks alive at link count zero; the final close reclaims them.");
      return t("수리 완료. 최종 파일과 같은 부모의 temp data를 먼저 fsync하고 rename 뒤 그 parent directory를 fsync해 old-or-new crash contract를 만들었습니다.", "Repair complete. You fsynced same-parent temporary data before rename and that parent directory afterward, establishing the old-or-new crash contract.");
    }
    const labels: Record<string, string> = {
      "mounted-device": t("mount가 활성화되면 /srv/data/report.bin은 datafs에서 찾습니다.", "With the mount active, /srv/data/report.bin resolves on datafs."),
      "mounted-inode": t("datafs의 report.bin directory entry는 inode 17을 가리킵니다.", "The report.bin entry on datafs points to inode 17."),
      "underlay-device": t("unmount 뒤 README.local은 rootfs에 있습니다.", "After unmounting, README.local is on rootfs."),
      "underlay-inode": t("rootfs underlay의 README.local은 inode 4입니다.", "README.local in the rootfs underlay is inode 4."),
      "merged-view": t("mount view는 underlay와 병합되지 않습니다.", "The mounted view does not merge with the underlay."),
      "free-blocks": t("사건 기록의 free data block은 128입니다.", "The incident record has 128 free data blocks."),
      "free-inodes": t("새 파일이 실패한 원인은 free inode가 0이기 때문입니다.", "Creation fails because free inodes are zero."),
      "create-outcome": t("free inode가 0이면 내용이 빈 파일도 ENOSPC로 실패합니다.", "With zero free inodes, even an empty file fails with ENOSPC."),
      "repaired-free-blocks": t("삭제 대상 empty.tmp는 data block이 없는 기존 빈 파일이므로 inode를 회수해도 free block은 128입니다.", "The existing empty.tmp target has no data blocks, so deleting it reclaims an inode while free blocks remain 128."),
      "repaired-free-inodes": t("기존 빈 파일 empty.tmp를 삭제하면 free inode가 1이 됩니다.", "Deleting the existing empty file empty.tmp produces one free inode."),
      "repaired-outcome": t("free inode 1과 free block 128이면 create가 성공합니다.", "With one free inode and 128 free blocks, creation succeeds."),
      "link-count": t("마지막 pathname까지 unlink했으므로 link count는 0입니다.", "After unlinking the last pathname, link count is zero."),
      "open-refs": t("사건 기록에는 아직 열린 fd 하나가 있으므로 open refs는 1입니다.", "The incident still has one open fd, so open refs equals one."),
      "blocks-allocated": t("link 0이어도 open ref 1이 있으면 block은 유지됩니다.", "At link count zero, one open reference still retains the blocks."),
      "after-close-reclaim": t("마지막 open ref를 close하면 link와 open ref가 모두 0이어서 block을 회수합니다.", "Closing the last open reference leaves zero links and opens, so the blocks are reclaimed."),
      "temp-write": t("먼저 최종 파일과 같은 부모에 temp를 만들고 완성된 새 내용을 써야 합니다.", "First create the temporary file in the destination's parent and write the complete new contents."),
      "temp-fsync-before-rename": t("rename 전에 같은 부모의 임시 파일 data를 fsync해야 합니다.", "The same-parent temporary file data must be fsynced before rename."),
      rename: t("같은 부모 디렉터리 안에서 temp를 최종 이름으로 rename해 namespace를 전환하세요.", "Rename the temporary file to the final name within the same parent directory."),
      "parent-directory-fsync": t("rename 뒤 그 parent directory를 fsync해 새 directory entry를 지속시키세요.", "After rename, fsync that parent directory to persist the new entry."),
      "crash-guarantee": t("완전한 순서는 crash 뒤 old-or-new 완성본 계약을 만듭니다.", "The complete sequence establishes an old-or-new complete-file contract after a crash."),
    };
    return evaluation.errors.map((error) => labels[error]).filter(Boolean).join(" ");
  };

  const completed = storageIncidentIds.filter((id) => evaluations[id]?.correct).length;
  const stepOptions = (index: number) => <>
    <option value="">{index}. —</option>
    <option value="write-temp">{index}. {t("같은 부모에 temp 쓰기", "write same-parent temp")}</option>
    <option value="fsync-temp">{index}. {t("temp fsync", "fsync temp")}</option>
    <option value="rename">{index}. {t("최종 이름으로 rename", "rename to final name")}</option>
    <option value="fsync-directory">{index}. {t("그 parent directory fsync", "fsync that parent directory")}</option>
  </>;

  return (
    <InteractiveLab
      kicker={t("별도 활동 · FILESYSTEM INCIDENTS", "SEPARATE ACTIVITY · FILESYSTEM INCIDENTS")}
      title={t("네 개의 저장 사건을 상태 불변식으로 수리하세요", "Repair four storage incidents with state invariants")}
      description={t("정답 preset 이름이 아니라 mount lookup, 자원 수치, link·open reference와 실제 단계 순서를 계산해 판정합니다.", "Grading computes mount lookup, capacity values, link and open references, and the actual step order—not an answer preset name.")}
      className="storage-incident-lab"
      actions={<button type="button" className="button button-secondary" onClick={reset}>{t("모든 사건 초기화", "Reset all incidents")}</button>}
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="storage-engine-error" role="alert">{engineError}</div> : null}
      <div className="storage-incident-body">
        <div className="storage-incident-progress" role="status" aria-live="polite"><strong>{completed} / {storageIncidentIds.length}</strong><span>{t("의미 계약을 통과한 사건", "incidents passing semantic contracts")}</span></div>
        <div className="storage-incident-grid">
          <fieldset className={`storage-incident-card ${evaluations["mount-shadow"]?.correct ? "is-correct" : evaluations["mount-shadow"] ? "is-incorrect" : ""}`}>
            <legend>01 · {t("합쳐져 보인 mount", "Mount appeared merged")}</legend>
            <pre>{`mounted: /srv/data/report.bin
unmounted: /srv/data/README.local`}</pre>
            <label><span>{t("mounted filesystem", "Mounted filesystem")}</span><select aria-label={t("mount 사건 mounted filesystem", "Mount incident mounted filesystem")} value={drafts["mount-shadow"].mountedDevice ?? ""} onChange={(event) => setField("mount-shadow", "mountedDevice", event.target.value)}><option value="">—</option><option value="rootfs">rootfs</option><option value="datafs">datafs</option></select></label>
            <label><span>{t("mounted inode", "Mounted inode")}</span><input type="number" aria-label={t("mount 사건 mounted inode", "Mount incident mounted inode")} value={drafts["mount-shadow"].mountedInode ?? ""} onChange={(event) => setField("mount-shadow", "mountedInode", event.target.value)} /></label>
            <label><span>{t("unmounted filesystem", "Unmounted filesystem")}</span><select aria-label={t("mount 사건 underlay filesystem", "Mount incident underlay filesystem")} value={drafts["mount-shadow"].underlayDevice ?? ""} onChange={(event) => setField("mount-shadow", "underlayDevice", event.target.value)}><option value="">—</option><option value="rootfs">rootfs</option><option value="datafs">datafs</option></select></label>
            <label><span>{t("underlay inode", "Underlay inode")}</span><input type="number" aria-label={t("mount 사건 underlay inode", "Mount incident underlay inode")} value={drafts["mount-shadow"].underlayInode ?? ""} onChange={(event) => setField("mount-shadow", "underlayInode", event.target.value)} /></label>
            <label><span>{t("두 view가 병합되는가", "Are the views merged?")}</span><select aria-label={t("mount view 병합 여부", "Whether mount views merge")} value={drafts["mount-shadow"].mergedView ?? ""} onChange={(event) => setField("mount-shadow", "mergedView", event.target.value)}><option value="">—</option><option value="true">{t("예", "Yes")}</option><option value="false">{t("아니요", "No")}</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("mount-shadow")}>{t("namespace 실행·진단", "Run namespace diagnosis")}</button>
            {evaluations["mount-shadow"] ? <p className="storage-incident-feedback" role="status" aria-live="polite">{feedbackFor("mount-shadow", evaluations["mount-shadow"])}</p> : null}
          </fieldset>

          <fieldset className={`storage-incident-card ${evaluations["inode-exhaustion"]?.correct ? "is-correct" : evaluations["inode-exhaustion"] ? "is-incorrect" : ""}`}>
            <legend>02 · {t("block만 본 ENOSPC", "ENOSPC diagnosed from blocks alone")}</legend>
            <p>{t("df -h: 128 free blocks · df -i: 0 free inodes · touch 새 빈 파일 실패 · 수리: data block이 없는 기존 empty.tmp 삭제", "df -h: 128 free blocks · df -i: 0 free inodes · touch of a new empty file fails · repair: delete existing empty.tmp, which has no data blocks")}</p>
            <label><span>free blocks</span><input type="number" aria-label={t("고갈 사건 free blocks", "Exhaustion incident free blocks")} value={drafts["inode-exhaustion"].freeBlocks ?? ""} onChange={(event) => setField("inode-exhaustion", "freeBlocks", event.target.value)} /></label>
            <label><span>free inodes</span><input type="number" aria-label={t("고갈 사건 free inodes", "Exhaustion incident free inodes")} value={drafts["inode-exhaustion"].freeInodes ?? ""} onChange={(event) => setField("inode-exhaustion", "freeInodes", event.target.value)} /></label>
            <label><span>touch outcome</span><select aria-label={t("고갈 사건 create 결과", "Exhaustion incident create outcome")} value={drafts["inode-exhaustion"].createOutcome ?? ""} onChange={(event) => setField("inode-exhaustion", "createOutcome", event.target.value)}><option value="">—</option><option value="succeeds">{t("성공", "Succeeds")}</option><option value="enospc">ENOSPC</option></select></label>
            <label><span>{t("기존 empty.tmp 삭제 뒤 blocks", "Blocks after deleting existing empty.tmp")}</span><input type="number" aria-label={t("수리 뒤 free blocks", "Free blocks after repair")} value={drafts["inode-exhaustion"].repairedFreeBlocks ?? ""} onChange={(event) => setField("inode-exhaustion", "repairedFreeBlocks", event.target.value)} /></label>
            <label><span>{t("기존 empty.tmp 삭제 뒤 inodes", "Inodes after deleting existing empty.tmp")}</span><input type="number" aria-label={t("수리 뒤 free inodes", "Free inodes after repair")} value={drafts["inode-exhaustion"].repairedFreeInodes ?? ""} onChange={(event) => setField("inode-exhaustion", "repairedFreeInodes", event.target.value)} /></label>
            <label><span>{t("수리 뒤 touch", "touch after repair")}</span><select aria-label={t("수리 뒤 create 결과", "Create outcome after repair")} value={drafts["inode-exhaustion"].repairedOutcome ?? ""} onChange={(event) => setField("inode-exhaustion", "repairedOutcome", event.target.value)}><option value="">—</option><option value="succeeds">{t("성공", "Succeeds")}</option><option value="enospc">ENOSPC</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("inode-exhaustion")}>{t("용량 계산·진단", "Compute capacity and diagnose")}</button>
            {evaluations["inode-exhaustion"] ? <p className="storage-incident-feedback" role="status" aria-live="polite">{feedbackFor("inode-exhaustion", evaluations["inode-exhaustion"])}</p> : null}
          </fieldset>

          <fieldset className={`storage-incident-card ${evaluations["deleted-open"]?.correct ? "is-correct" : evaluations["deleted-open"] ? "is-incorrect" : ""}`}>
            <legend>03 · {t("사라지지 않은 deleted-open", "Deleted-open file did not disappear")}</legend>
            <p>{t("마지막 pathname unlink · fd 3은 아직 open · 그 뒤 close(fd 3)", "Last pathname unlinked · fd 3 remains open · then close(fd 3)")}</p>
            <label><span>link count</span><input type="number" aria-label={t("deleted-open link count", "Deleted-open link count")} value={drafts["deleted-open"].linkCount ?? ""} onChange={(event) => setField("deleted-open", "linkCount", event.target.value)} /></label>
            <label><span>open refs</span><input type="number" aria-label={t("deleted-open open refs", "Deleted-open open refs")} value={drafts["deleted-open"].openRefs ?? ""} onChange={(event) => setField("deleted-open", "openRefs", event.target.value)} /></label>
            <label><span>{t("close 전 block 유지", "Blocks retained before close")}</span><select aria-label={t("close 전 block 유지 여부", "Whether blocks remain before close")} value={drafts["deleted-open"].blocksAllocated ?? ""} onChange={(event) => setField("deleted-open", "blocksAllocated", event.target.value)}><option value="">—</option><option value="true">{t("예", "Yes")}</option><option value="false">{t("아니요", "No")}</option></select></label>
            <label><span>{t("close 뒤 block 유지", "Blocks retained after close")}</span><select aria-label={t("close 뒤 block 유지 여부", "Whether blocks remain after close")} value={drafts["deleted-open"].afterCloseBlocksAllocated ?? ""} onChange={(event) => setField("deleted-open", "afterCloseBlocksAllocated", event.target.value)}><option value="">—</option><option value="true">{t("예", "Yes")}</option><option value="false">{t("아니요", "No")}</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("deleted-open")}>{t("수명 계산·진단", "Compute lifetime and diagnose")}</button>
            {evaluations["deleted-open"] ? <p className="storage-incident-feedback" role="status" aria-live="polite">{feedbackFor("deleted-open", evaluations["deleted-open"])}</p> : null}
          </fieldset>

          <fieldset className={`storage-incident-card ${evaluations["crash-safe-replace"]?.correct ? "is-correct" : evaluations["crash-safe-replace"] ? "is-incorrect" : ""}`}>
            <legend>04 · {t("rename만 믿은 config 교체", "Config replacement trusted rename alone")}</legend>
            <p>{t("temp는 config와 같은 부모 디렉터리에 둡니다. 네 단계를 순서대로 조립하고 crash 뒤 허용되는 결과를 고르세요.", "The temporary file shares config's parent directory. Assemble four steps in order and choose the allowed post-crash result.")}</p>
            {([1, 2, 3, 4] as const).map((index) => <label key={index}><span>{t(`${index}번째 단계`, `Step ${index}`)}</span><select aria-label={t(`crash-safe 교체 ${index}번째 단계`, `Crash-safe replacement step ${index}`)} value={drafts["crash-safe-replace"][`step${index}`] ?? ""} onChange={(event) => setField("crash-safe-replace", `step${index}`, event.target.value)}>{stepOptions(index)}</select></label>)}
            <label><span>{t("crash 뒤 계약", "Post-crash contract")}</span><select aria-label={t("crash 뒤 config 계약", "Post-crash config contract")} value={drafts["crash-safe-replace"].crashGuarantee ?? ""} onChange={(event) => setField("crash-safe-replace", "crashGuarantee", event.target.value)}><option value="">—</option><option value="old-or-new">{t("완성된 이전본 또는 새 본", "Complete old or complete new")}</option><option value="new-only">{t("새 본만", "New only")}</option><option value="unspecified">{t("보장 없음", "Unspecified")}</option></select></label>
            <button type="button" className="button button-primary" onClick={() => audit("crash-safe-replace")}>{t("순서 실행·crash 진단", "Run sequence and diagnose crash")}</button>
            {evaluations["crash-safe-replace"] ? <p className="storage-incident-feedback" role="status" aria-live="polite">{feedbackFor("crash-safe-replace", evaluations["crash-safe-replace"])}</p> : null}
          </fieldset>
        </div>
        {completed === storageIncidentIds.length ? <p className="storage-incidents-mastered" role="status">{t("사건 진단 완료 — namespace, 용량, 수명과 crash durability의 네 오진을 상태로 수리했습니다.", "Incident diagnosis complete — you repaired all four namespace, capacity, lifetime, and crash-durability misdiagnoses with state.")}</p> : null}
      </div>
    </InteractiveLab>
  );
}

import { useEffect, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  createPermissionIncident,
  evaluatePermissionIncidentRepair,
  permissionIncidentIds,
  permissionIncidentPatchIds,
  permissionUsers,
  type PermissionIncidentId,
  type PermissionIncidentPatch,
  type PermissionOperation,
} from "../../features/linux-runtime/users-and-permissions";
import { ChoiceField } from "../interactive/ChoiceField";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { PermissionStateView } from "./PermissionStateView";

type IncidentResult = ReturnType<typeof evaluatePermissionIncidentRepair>;
type FeedbackTone = "correct" | "incorrect";

const incidentCopy: Record<PermissionIncidentId, {
  title: { ko: string; en: string };
  clue: { ko: string; en: string };
  goal: { ko: string; en: string };
  complete: { ko: string; en: string };
}> = {
  "missing-traversal": {
    title: { ko: "사건 1 · 파일은 읽기 가능, 경로는 통과 불가", en: "Incident 1 · Readable file, unsearchable path" },
    clue: {
      ko: "Joon은 reviewers 보조 그룹으로 plan.txt의 group r을 선택합니다. 그런데 open은 파일보다 먼저 /srv/release를 통과해야 합니다.",
      en: "Joon's reviewers supplementary group selects group r on plan.txt. But open must traverse /srv/release before checking the file.",
    },
    goal: {
      ko: "목표: reviewer read 허용 · append/create 거부 · Guest 거부",
      en: "Goal: allow reviewer read · deny append/create · deny Guest",
    },
    complete: {
      ko: "디렉터리에 group search만 더해 Joon의 read 경로를 열고 쓰기와 Guest 접근은 닫아 두었습니다.",
      en: "Group search was added only to the directory, opening Joon's read path while keeping writes and Guest access closed.",
    },
  },
  "delete-boundary": {
    title: { ko: "사건 2 · 읽기 전용 파일이 삭제됨", en: "Incident 2 · Read-only file can be deleted" },
    clue: {
      ko: "plan.txt는 0440이지만 Joon이 부모 디렉터리에 w+x를 가집니다. unlink는 파일 w가 아니라 부모 디렉터리를 변경합니다.",
      en: "plan.txt is 0440, but Joon has w+x on its parent directory. unlink mutates the parent directory rather than requiring file w.",
    },
    goal: {
      ko: "목표: reviewer read 허용 · delete/create 거부 · Guest 거부",
      en: "Goal: allow reviewer read · deny delete/create · deny Guest",
    },
    complete: {
      ko: "부모 디렉터리의 group w만 제거해 읽기는 유지하고 생성·삭제 경계를 닫았습니다.",
      en: "Removing only group w from the parent preserved reading while closing the create/delete boundary.",
    },
  },
  "group-mismatch": {
    title: { ko: "사건 3 · 올바른 mode, 잘못된 group", en: "Incident 3 · Right mode, wrong group" },
    clue: {
      ko: "디렉터리 group은 reviewers지만 plan.txt group은 ops입니다. Joon에게 o+r을 주면 읽히기는 해도 Guest까지 같은 other 권한을 얻습니다.",
      en: "The directory group is reviewers, but plan.txt belongs to ops. Adding o+r lets Joon read only by granting the same other permission to Guest.",
    },
    goal: {
      ko: "목표: 파일 group=reviewers · reviewer read-only · other 접근 없음",
      en: "Goal: file group=reviewers · reviewer read-only · no other access",
    },
    complete: {
      ko: "파일 group을 reviewers로 맞춰 기존 0640의 group r을 의도한 주체에게만 연결했습니다.",
      en: "The file group now matches reviewers, connecting the existing group r in 0640 only to the intended subjects.",
    },
  },
  "deploy-script": {
    title: { ko: "사건 4 · 읽히지만 실행할 수 없는 배포 스크립트", en: "Incident 4 · Deploy script is readable but not executable" },
    clue: {
      ko: "Runner 프로세스의 effective group은 deploy입니다. 현재 0744는 group에 r만 주고, 의도하지 않은 other에도 r을 남깁니다.",
      en: "The Runner process's effective group is deploy. The current 0744 gives group only r while leaving r for unintended other subjects.",
    },
    goal: {
      ko: "목표: owner rwx · deploy group r-x · other --- · group write 없음",
      en: "Goal: owner rwx · deploy group r-x · other --- · no group write",
    },
    complete: {
      ko: "스크립트를 0750으로 만들어 deploy group에 read+execute만 주고 group write와 other 접근을 제거했습니다.",
      en: "Mode 0750 gives the deploy group only read+execute while removing group write and all other access.",
    },
  },
};

const patchCopy: Record<PermissionIncidentPatch, { ko: string; en: string }> = {
  "directory-group-execute": { ko: "chmod g+x /srv/release", en: "chmod g+x /srv/release" },
  "file-group-read": { ko: "chmod g+r plan.txt", en: "chmod g+r plan.txt" },
  "directory-group-write": { ko: "chmod g+w /srv/release", en: "chmod g+w /srv/release" },
  "world-open": { ko: "directory와 file을 chmod 777", en: "chmod both directory and file to 777" },
  "directory-group-no-write": { ko: "chmod g-w /srv/release", en: "chmod g-w /srv/release" },
  "file-group-no-write": { ko: "chmod g-w plan.txt", en: "chmod g-w plan.txt" },
  "file-owner-only": { ko: "chmod 400 plan.txt", en: "chmod 400 plan.txt" },
  "file-group-reviewers": { ko: "chgrp reviewers plan.txt", en: "chgrp reviewers plan.txt" },
  "file-other-read": { ko: "chmod o+r plan.txt", en: "chmod o+r plan.txt" },
  "file-world-write": { ko: "chmod 666 plan.txt", en: "chmod 666 plan.txt" },
  "directory-group-reviewers": { ko: "chgrp reviewers /srv/release", en: "chgrp reviewers /srv/release" },
  "script-group-execute-private": { ko: "chmod 750 deploy.sh", en: "chmod 750 deploy.sh" },
  "script-everyone-execute": { ko: "chmod 755 deploy.sh", en: "chmod 755 deploy.sh" },
  "script-group-write": { ko: "chmod 770 deploy.sh", en: "chmod 770 deploy.sh" },
  "script-remove-owner-execute": { ko: "chmod 640 deploy.sh", en: "chmod 640 deploy.sh" },
};

const operationCopy: Record<PermissionOperation, { ko: string; en: string }> = {
  "read-file": { ko: "파일 읽기", en: "read the file" },
  "append-file": { ko: "파일 덧쓰기", en: "append to the file" },
  "execute-file": { ko: "파일 실행", en: "execute the file" },
  "list-directory": { ko: "디렉터리 목록 보기", en: "list the directory" },
  "traverse-directory": { ko: "디렉터리 통과", en: "traverse the directory" },
  "create-entry": { ko: "항목 생성", en: "create an entry" },
  "delete-file": { ko: "파일 삭제", en: "delete the file" },
};

const violationCopy: Record<string, { ko: string; en: string }> = {
  "file-group-not-reviewers": {
    ko: "plan.txt의 직접 group이 아직 reviewers가 아닙니다.",
    en: "The direct group on plan.txt is still not reviewers.",
  },
  "file-other-read-overgrant": {
    ko: "plan.txt의 other r이 남아 의도하지 않은 주체가 파일 비트를 얻습니다.",
    en: "other r remains on plan.txt, granting a file bit to unintended subjects.",
  },
  "reviewer-write-overgrant": {
    ko: "reviewer에게 파일 w까지 부여되어 read-only 계약을 넘었습니다.",
    en: "The reviewer received file w, exceeding the read-only contract.",
  },
  "deploy-group-missing-read": {
    ko: "deploy group에 스크립트 r이 없습니다.",
    en: "The deploy group is missing r on the script.",
  },
  "deploy-group-missing-execute": {
    ko: "deploy group에 스크립트 x가 없습니다.",
    en: "The deploy group is missing x on the script.",
  },
  "deploy-group-write-overgrant": {
    ko: "deploy group에 불필요한 스크립트 w가 열렸습니다.",
    en: "The deploy group has unnecessary w on the script.",
  },
  "script-other-overgrant": {
    ko: "스크립트 other에 r 또는 x가 남아 있습니다.",
    en: "The script still grants r or x to other.",
  },
};

function patchesFor(id: PermissionIncidentId): readonly PermissionIncidentPatch[] {
  return permissionIncidentPatchIds[id] as readonly PermissionIncidentPatch[];
}

function expectationText(
  check: IncidentResult["checks"][number],
  locale: "ko" | "en",
) {
  const actor = permissionUsers[check.actorId].name;
  const operation = operationCopy[check.operation][locale];
  const failure = check.decision.firstFailure;
  if (check.expected && !check.actual) {
    if (failure) {
      return locale === "ko"
        ? `${actor}의 ${operation}가 여전히 거부됩니다. 첫 실패: ${failure.path}의 ${failure.permissionClass} ${failure.requiredBit}.`
        : `${actor} still cannot ${operation}. First failure: ${failure.permissionClass} ${failure.requiredBit} on ${failure.path}.`;
    }
    return locale === "ko"
      ? `${actor}의 ${operation}가 여전히 거부됩니다.`
      : `${actor} still cannot ${operation}.`;
  }
  return locale === "ko"
    ? `${actor}의 ${operation}가 허용되어서는 안 되지만 열렸습니다.`
    : `${actor} can ${operation}, but that access must remain denied.`;
}

function feedbackSections(
  result: IncidentResult,
  locale: "ko" | "en",
) {
  const sections: Array<{ kind: string; label: string; messages: string[] }> = [];
  if (result.missing.length > 0) {
    sections.push({
      kind: "missing",
      label: locale === "ko" ? "필수 접근 누락" : "Required access still missing",
      messages: result.missing.map((check) => expectationText(check, locale)),
    });
  }
  if (result.overgrants.length > 0) {
    sections.push({
      kind: "overgrant",
      label: locale === "ko" ? "과잉 허용" : "Access overgrant",
      messages: result.overgrants.map((check) => expectationText(check, locale)),
    });
  }
  if (result.configurationViolations.length > 0) {
    sections.push({
      kind: "configuration",
      label: locale === "ko" ? "직접 설정 위반" : "Direct configuration violation",
      messages: result.configurationViolations.map((id) => violationCopy[id]?.[locale] ?? id),
    });
  }
  return sections;
}

export function LinuxPermissionIncidentLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const [answers, setAnswers] = useState<Partial<Record<PermissionIncidentId, PermissionIncidentPatch>>>({});
  const [results, setResults] = useState<Partial<Record<PermissionIncidentId, IncidentResult>>>({});
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const solvedCount = permissionIncidentIds.filter((id) => results[id]?.correct).length;
  const allComplete = solvedCount === permissionIncidentIds.length && !engineError;

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange?.(allComplete), [allComplete, onCompletionChange]);

  function chooseRepair(id: PermissionIncidentId, patch: PermissionIncidentPatch) {
    setAnswers((current) => ({ ...current, [id]: patch }));
    setResults((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setEngineError("");
  }

  function auditRepair(id: PermissionIncidentId) {
    const patch = answers[id];
    if (!patch) return;
    try {
      const result = evaluatePermissionIncidentRepair(id, patch);
      setResults((current) => ({ ...current, [id]: result }));
      setEngineError("");
    } catch {
      setEngineError(t(
        "권한 사건 모델을 실행하지 못했습니다. 사건을 초기화해 네트워크 없이 다시 시도하세요.",
        "The permission incident model could not run. Reset the incident and retry without a network runtime.",
      ));
      onCompletionChange?.(false);
    }
  }

  function resetIncident(id: PermissionIncidentId) {
    setAnswers((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setResults((current) => {
      const next = { ...current };
      delete next[id];
      return next;
    });
    setEngineError("");
  }

  function resetAll() {
    setAnswers({});
    setResults({});
    setEngineError("");
  }

  return (
    <InteractiveLab
      kicker={t("별도 활동 · PERMISSION INCIDENTS", "SEPARATE ACTIVITY · PERMISSION INCIDENTS")}
      title={t("작동만 시키지 말고 네 권한 사건을 최소 권한으로 수리하세요", "Repair four permission incidents without granting more than required")}
      description={t(
        "각 repair를 실제 owner·group·other 선택과 경로 검사에 적용합니다. 필요한 접근을 복구하는 동시에 과잉 허용과 직접 metadata 위반이 없는 결과만 통과합니다.",
        "Each repair runs through actual owner/group/other selection and path checks. A repair passes only when it restores required access without overgrants or direct metadata violations.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetAll}>{t("사건 전체 초기화", "Reset all incidents")}</button>}
      className="permission-incident-lab"
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="permission-engine-error" role="alert">{engineError}</div> : null}

      <div className="permission-incident-progress" role="status" aria-live="polite" aria-atomic="true">
        <strong>{solvedCount} / {permissionIncidentIds.length}</strong>
        <span>{allComplete
          ? t("네 사건을 모두 실제 권한 계약으로 해결했습니다.", "All four incidents are solved by actual permission contracts.")
          : t("해결한 최소 권한 사건", "Least-privilege incidents solved")}</span>
      </div>

      <div className="permission-incident-grid">
        {permissionIncidentIds.map((id) => {
          const copy = incidentCopy[id];
          const answer = answers[id];
          const result = results[id];
          const solved = result?.correct === true;
          const feedbackId = `${id}-permission-feedback`;
          const clueId = `${id}-permission-clue`;
          const sections = result && !solved ? feedbackSections(result, locale) : [];
          return (
            <fieldset
              className={`permission-incident-card${solved ? " is-correct" : result ? " is-incorrect" : ""}`}
              aria-describedby={`${clueId}${result ? ` ${feedbackId}` : ""}`}
              key={id}
            >
              <legend>{copy.title[locale]}</legend>
              <p id={clueId}>{copy.clue[locale]}</p>
              <strong className="permission-incident-goal">{copy.goal[locale]}</strong>

              <PermissionStateView
                workspace={result?.workspace ?? createPermissionIncident(id)}
                locale={locale}
                compact
              />

              <ChoiceField
                label={t("적용할 repair", "Repair to apply")}
                value={answer ?? ""}
                disabled={solved}
                onValueChange={(value) => {
                  if (value) chooseRepair(id, value);
                }}
                options={[
                  { value: "", label: t("수리 선택", "Choose a repair"), disabled: true },
                  ...patchesFor(id).map((patch) => ({ value: patch, label: patchCopy[patch][locale] })),
                ]}
              />

              <div className="permission-incident-actions">
                <button
                  type="button"
                  className="button button-primary"
                  disabled={!answer}
                  onClick={() => auditRepair(id)}
                >
                  {solved ? t("사건 해결됨", "Incident solved") : t("repair 적용·정책 판정", "Apply repair and audit")}
                </button>
                <button
                  type="button"
                  className="button button-ghost"
                  aria-label={t(`이 사건 초기화: ${copy.title.ko}`, `Reset ${copy.title.en}`)}
                  onClick={() => resetIncident(id)}
                >
                  {t("이 사건 초기화", "Reset this incident")}
                </button>
              </div>

              {result ? (
                <div
                  className={`permission-incident-feedback is-${(solved ? "correct" : "incorrect") satisfies FeedbackTone}`}
                  id={feedbackId}
                  role="status"
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <strong>{solved ? t("최소 권한 계약 통과", "Least-privilege contract passed") : t("수리가 아직 불완전합니다", "The repair is still incomplete")}</strong>
                  {solved ? <p>{copy.complete[locale]}</p> : (
                    <div className="permission-incident-feedback-groups">
                      {sections.map((section) => (
                        <section className={`is-${section.kind}`} key={section.kind}>
                          <strong>{section.label}</strong>
                          <ul>
                            {section.messages.map((message) => <li key={message}>{message}</li>)}
                          </ul>
                        </section>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}
            </fieldset>
          );
        })}
      </div>
    </InteractiveLab>
  );
}

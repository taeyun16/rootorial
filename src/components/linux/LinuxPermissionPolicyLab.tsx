import { useEffect, useRef, useState } from "react";
import { useLocale } from "../../features/localization/localization";
import {
  canMasterPermissionLab,
  chmodWorkspace,
  createPermissionWorkspace,
  evaluatePermission,
  evaluateReleasePolicy,
  permissionLabChmodEvidence,
  permissionUsers,
  permissionWorkspacePresets,
  type PermissionDecision,
  type PermissionLabEvidence,
  type PermissionOperation,
  type PermissionTarget,
  type PermissionUserId,
  type PermissionWorkspace,
  type PermissionWorkspacePresetId,
} from "../../features/linux-runtime/users-and-permissions";
import { InteractiveLab } from "../interactive/InteractiveLab";
import { PermissionStateView } from "./PermissionStateView";

type Prediction = "allow" | "deny" | "";
type FeedbackTone = "idle" | "correct" | "incorrect";

const emptyEvidence = (): PermissionLabEvidence => ({
  pathDenialObserved: false,
  symbolicChmodApplied: false,
  octalChmodApplied: false,
  policyPassed: false,
});

const operationCopy: Record<PermissionOperation, { ko: string; en: string }> = {
  "read-file": { ko: "plan.txt 읽기", en: "Read plan.txt" },
  "append-file": { ko: "plan.txt 내용 덧쓰기", en: "Append to plan.txt" },
  "execute-file": { ko: "plan.txt 실행 요청", en: "Request execution of plan.txt" },
  "list-directory": { ko: "release 이름 목록 보기", en: "List names in release" },
  "traverse-directory": { ko: "release 경로 통과", en: "Traverse the release path" },
  "create-entry": { ko: "release에 새 파일 만들기", en: "Create a new file in release" },
  "delete-file": { ko: "release에서 plan.txt 삭제", en: "Delete plan.txt from release" },
};

const policyCopy: Record<string, { ko: string; en: string }> = {
  "owner-read": { ko: "Mina가 문서를 읽음", en: "Mina reads the document" },
  "owner-append": { ko: "Mina가 문서를 편집", en: "Mina edits the document" },
  "owner-create": { ko: "Mina가 항목을 생성", en: "Mina creates an entry" },
  "owner-delete": { ko: "Mina가 항목을 삭제", en: "Mina deletes an entry" },
  "reviewer-read": { ko: "Joon이 reviewer로 읽음", en: "Joon reads as a reviewer" },
  "reviewer-list": { ko: "Joon이 이름 목록을 봄", en: "Joon lists names" },
  "reviewer-append-denied": { ko: "Joon 편집은 거부", en: "Joon edit is denied" },
  "reviewer-create-denied": { ko: "Joon 생성은 거부", en: "Joon create is denied" },
  "reviewer-delete-denied": { ko: "Joon 삭제는 거부", en: "Joon delete is denied" },
  "guest-read-denied": { ko: "Guest 읽기는 거부", en: "Guest read is denied" },
  "guest-traverse-denied": { ko: "Guest 경로 통과는 거부", en: "Guest traversal is denied" },
  "guest-list-denied": { ko: "Guest 목록 보기는 거부", en: "Guest listing is denied" },
  "owner-execute-denied": { ko: "문서를 Mina도 실행하지 않음", en: "Mina cannot execute the document" },
  "reviewer-execute-denied": { ko: "문서를 Joon도 실행하지 않음", en: "Joon cannot execute the document" },
  "guest-execute-denied": { ko: "문서를 Guest도 실행하지 않음", en: "Guest cannot execute the document" },
};

const policyConfigurationCopy: Record<string, { ko: string; en: string }> = {
  "directory-owner-not-mina": { ko: "release 디렉터리 owner는 Mina여야 함", en: "The release directory owner must remain Mina" },
  "directory-group-not-reviewers": { ko: "release 디렉터리 group은 reviewers여야 함", en: "The release directory group must be reviewers" },
  "directory-mode-not-0750": { ko: "release 디렉터리는 정확히 0750이어야 함", en: "The release directory must be exactly 0750" },
  "file-owner-not-mina": { ko: "plan.txt owner는 Mina여야 함", en: "The plan.txt owner must remain Mina" },
  "file-group-not-reviewers": { ko: "plan.txt group은 reviewers여야 함", en: "The plan.txt group must be reviewers" },
  "file-mode-not-0640": { ko: "plan.txt는 정확히 0640이어야 함", en: "plan.txt must be exactly 0640" },
};

export function LinuxPermissionPolicyLab({
  onCompletionChange,
}: {
  onCompletionChange?: (complete: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const actorRef = useRef<HTMLSelectElement>(null);
  const [workspace, setWorkspace] = useState<PermissionWorkspace>(createPermissionWorkspace);
  const [preset, setPreset] = useState<PermissionWorkspacePresetId | null>("missing-traversal");
  const [actorId, setActorId] = useState<PermissionUserId>("joon");
  const [operation, setOperation] = useState<PermissionOperation>("read-file");
  const [prediction, setPrediction] = useState<Prediction>("");
  const [decision, setDecision] = useState<PermissionDecision | null>(null);
  const [target, setTarget] = useState<PermissionTarget>("directory");
  const [expression, setExpression] = useState("");
  const [evidence, setEvidence] = useState<PermissionLabEvidence>(emptyEvidence);
  const [feedback, setFeedback] = useState(t(
    "Joon의 read 요청이 file의 group r만으로 성공할지 먼저 예측하세요.",
    "First predict whether Joon's read succeeds from the file's group r alone.",
  ));
  const [tone, setTone] = useState<FeedbackTone>("idle");
  const [inputError, setInputError] = useState("");
  const [engineError, setEngineError] = useState("");
  const [interactiveReady, setInteractiveReady] = useState(false);
  const complete = canMasterPermissionLab(workspace, evidence);

  useEffect(() => setInteractiveReady(true), []);
  useEffect(() => onCompletionChange?.(complete), [complete, onCompletionChange]);

  function resetLab() {
    setWorkspace(createPermissionWorkspace());
    setPreset("missing-traversal");
    setActorId("joon");
    setOperation("read-file");
    setPrediction("");
    setDecision(null);
    setTarget("directory");
    setExpression("");
    setEvidence(emptyEvidence());
    setFeedback(t(
      "초기화했습니다. Joon의 read 결과부터 예측하세요.",
      "Reset complete. Start by predicting Joon's read result.",
    ));
    setTone("idle");
    setInputError("");
    setEngineError("");
    actorRef.current?.focus();
  }

  function choosePreset(id: PermissionWorkspacePresetId) {
    setWorkspace(permissionWorkspacePresets[id]);
    setPreset(id);
    setDecision(null);
    setPrediction("");
    setExpression("");
    setEvidence(emptyEvidence());
    setFeedback(t(
      "프리셋을 불러왔습니다. actor와 요청을 고르고 현재 결과를 예측하세요.",
      "Preset loaded. Choose an actor and request, then predict the current result.",
    ));
    setTone("idle");
    setInputError("");
    setEngineError("");
  }

  function changeProbe(next: Partial<{
    actorId: PermissionUserId;
    operation: PermissionOperation;
  }>) {
    if (next.actorId) setActorId(next.actorId);
    if (next.operation) setOperation(next.operation);
    setPrediction("");
    setDecision(null);
    setTone("idle");
  }

  function runProbe() {
    if (!prediction) return;
    try {
      const nextDecision = evaluatePermission(workspace, permissionUsers[actorId], operation);
      const predictedAllowed = prediction === "allow";
      const correct = predictedAllowed === nextDecision.allowed;
      const failure = nextDecision.firstFailure;
      setDecision(nextDecision);
      setEvidence((current) => ({
        ...current,
        pathDenialObserved: current.pathDenialObserved || Boolean(
          correct
          && actorId === "joon"
          && operation === "read-file"
          && failure?.purpose === "path-search"
          && failure.requiredBit === "x",
        ),
        policyPassed: false,
      }));
      setFeedback(nextDecision.allowed
        ? t(
            `${permissionUsers[actorId].name}의 요청은 모든 검사 비트가 있어 허용됐습니다. ${correct ? "예측도 맞았습니다." : "예측과 실제를 비교하세요."}`,
            `${permissionUsers[actorId].name}'s request is allowed because every required bit is present. ${correct ? "Your prediction was correct." : "Compare the prediction with the trace."}`,
          )
        : t(
            `${failure?.path}에서 ${failure?.permissionClass} 클래스의 ${failure?.requiredBit} 비트가 없어 먼저 거부됐습니다. ${actorId === "joon" && failure?.permissionClass === "group" ? "보조 GID 2000이 group을 선택했지만 비트 자체는 따로 필요합니다." : "아래 첫 실패를 확인하세요."}`,
            `The first denial occurs at ${failure?.path}: the selected ${failure?.permissionClass} class lacks ${failure?.requiredBit}. ${actorId === "joon" && failure?.permissionClass === "group" ? "Supplementary GID 2000 selects group, but the required bit must still exist." : "Inspect the first failed check below."}`,
          ));
      setTone(correct ? "correct" : "incorrect");
      setInputError("");
      setEngineError("");
    } catch {
      setEngineError(t(
        "권한 모델을 실행하지 못했습니다. 실습을 초기화해 네트워크 없이 다시 시작하세요.",
        "The permission model could not run. Reset the lab to restart without a network runtime.",
      ));
      onCompletionChange?.(false);
    }
  }

  function applyMode() {
    try {
      const changed = chmodWorkspace(workspace, target, expression);
      if (!changed.result.ok) {
        setInputError(changed.result.error === "invalid-octal"
          ? t("8진수 mode는 000~777의 세 자리만 사용합니다.", "An octal mode uses exactly three digits from 000 through 777.")
          : t("지원 문법: 640 또는 g+rx, o-rwx, u=rw처럼 u/g/o/a와 +, -, =를 사용하세요.", "Supported syntax: 640, or u/g/o/a with +, -, = such as g+rx, o-rwx, or u=rw."));
        setTone("incorrect");
        return;
      }
      const format = changed.result.format;
      const previousMode = workspace[target].mode;
      const nextWorkspace = changed.workspace;
      const chmodEvidence = permissionLabChmodEvidence(
        workspace,
        nextWorkspace,
        target,
        format,
      );
      setWorkspace(nextWorkspace);
      setPreset(null);
      setDecision(null);
      setEvidence((current) => ({
        ...current,
        symbolicChmodApplied:
          current.symbolicChmodApplied || chmodEvidence.symbolicChmodApplied,
        octalChmodApplied:
          current.octalChmodApplied || chmodEvidence.octalChmodApplied,
        policyPassed: false,
      }));
      if (previousMode === nextWorkspace[target].mode) {
        setFeedback(t(
          `${previousMode} → ${nextWorkspace[target].mode}: mode가 실제로 바뀌지 않아 학습 증거로 기록하지 않았습니다.`,
          `${previousMode} → ${nextWorkspace[target].mode}: the mode did not change, so this is not recorded as learning evidence.`,
        ));
        setTone("incorrect");
      } else if (
        !chmodEvidence.symbolicChmodApplied
        && !chmodEvidence.octalChmodApplied
      ) {
        setFeedback(t(
          `${target === "directory" ? "디렉터리" : "파일"} mode는 ${previousMode} → ${nextWorkspace[target].mode}로 바뀌었지만 완료 증거는 아닙니다. symbolic은 상위 x 거부를 read 허용으로 바꾸고, octal은 file을 0640으로 최소화해야 합니다.`,
          `${target === "directory" ? "Directory" : "File"} mode changed from ${previousMode} to ${nextWorkspace[target].mode}, but it is not completion evidence. Symbolic chmod must turn the ancestor-x denial into an allowed read; octal chmod must minimize the file to 0640.`,
        ));
        setTone("incorrect");
      } else {
        setFeedback(t(
          `${target === "directory" ? "디렉터리" : "파일"} mode가 ${previousMode} → ${nextWorkspace[target].mode}로 바뀌고 목표 전이가 기록됐습니다. 정책 감사로 직접 비트의 최소값까지 확인하세요.`,
          `${target === "directory" ? "Directory" : "File"} mode changed from ${previousMode} to ${nextWorkspace[target].mode}, recording the target transition. Audit the exact direct bits as well.`,
        ));
        setTone("correct");
      }
      setExpression("");
      setInputError("");
      setEngineError("");
    } catch {
      setEngineError(t(
        "chmod 모델을 적용하지 못했습니다. 입력을 지우거나 실습을 초기화하세요.",
        "The chmod model could not apply the change. Clear the input or reset the lab.",
      ));
      onCompletionChange?.(false);
    }
  }

  function auditPolicy() {
    try {
      const result = evaluateReleasePolicy(workspace);
      setEvidence((current) => ({ ...current, policyPassed: result.passed }));
      setDecision(null);
      if (result.passed) {
        setFeedback(t(
          `정책 통과: ${workspace.directory.mode}은 Mina에게 관리, reviewers에게 list·search만 주고 ${workspace.file.mode}은 Mina의 rw와 reviewers의 r만 남깁니다. Guest와 불필요한 실행은 모두 거부됩니다.`,
          `Policy passed: ${workspace.directory.mode} lets Mina manage and reviewers only list/search; ${workspace.file.mode} keeps Mina's rw and reviewers' r. Guest access and unnecessary execution are denied.`,
        ));
        setTone("correct");
      } else {
        const accessExamples = result.failures.slice(0, 3).map((item) => {
          const label = policyCopy[item.id]?.[locale] ?? item.id;
          return `${label}: ${item.expected ? t("허용 필요", "must allow") : t("거부 필요", "must deny")}`;
        });
        const configurationExamples = result.configurationViolations.slice(0, 3).map(
          (id) => policyConfigurationCopy[id]?.[locale] ?? id,
        );
        const examples = [...accessExamples, ...configurationExamples].slice(0, 3).join(" · ");
        const issueCount = result.failures.length + result.configurationViolations.length;
        setFeedback(t(
          `정책 ${issueCount}개가 맞지 않습니다. ${examples}. 경로에 가려진 직접 비트까지 최소값인지 확인하세요.`,
          `${issueCount} policy checks still fail. ${examples}. Verify the direct bits hidden behind path denials are minimal too.`,
        ));
        setTone("incorrect");
      }
      setInputError("");
      setEngineError("");
    } catch {
      setEngineError(t(
        "정책 감사를 실행하지 못했습니다. 실습을 초기화해 다시 시도하세요.",
        "The policy audit could not run. Reset the lab and try again.",
      ));
      onCompletionChange?.(false);
    }
  }

  return (
    <InteractiveLab
      kicker={t("필수 실습 · ACCESS DECISION", "REQUIRED LAB · ACCESS DECISION")}
      title={t("첫 거부 원인을 추적하고 release 경로를 최소 권한으로 여세요", "Trace the first denial and open the release path with least privilege")}
      description={t(
        "Joon의 보조 그룹이 file group과 맞아도 상위 directory x가 없으면 open은 먼저 실패합니다. 요청을 예측·실행한 뒤 symbolic과 octal chmod를 모두 적용하고 허용·거부 정책을 감사하세요.",
        "Even when Joon's supplementary group matches the file group, open fails first without directory x. Predict and run the request, apply both symbolic and octal chmod, then audit required allows and denials.",
      )}
      actions={<button type="button" className="button button-secondary" onClick={resetLab}>{t("실습 초기화", "Reset lab")}</button>}
      className="permission-policy-lab"
    >
      <span className="sr-only" data-interactive-ready={interactiveReady ? "true" : "false"} />
      {engineError ? <div className="permission-engine-error" role="alert">{engineError}</div> : null}

      <div className="permission-preset-bar" role="group" aria-label={t("깨진 권한 프리셋", "Broken permission presets")}>
        <span>{t("깨진 상태", "BROKEN STATE")}</span>
        {([
          ["missing-traversal", t("경로 x 누락", "Missing path x")],
          ["deletion-trap", t("삭제 노출", "Deletion exposed")],
          ["world-open", t("모두에게 개방", "World open")],
          ["wrong-group", t("group 불일치", "Wrong group")],
        ] as Array<[PermissionWorkspacePresetId, string]>).map(([id, label]) => (
          <button type="button" aria-pressed={preset === id} key={id} onClick={() => choosePreset(id)}>{label}</button>
        ))}
      </div>

      <PermissionStateView workspace={workspace} decision={decision} locale={locale} />

      <fieldset className="permission-probe-panel">
        <legend>{t("1 · 접근 결과 예측·실행", "1 · Predict and run an access request")}</legend>
        <div className="permission-probe-grid">
          <label>
            <span>{t("요청 프로세스", "Requesting process")}</span>
            <select ref={actorRef} value={actorId} onChange={(event) => changeProbe({ actorId: event.currentTarget.value as PermissionUserId })}>
              <option value="mina">Mina · uid 1001</option>
              <option value="joon">Joon · uid 1002 · +reviewers</option>
              <option value="guest">Guest · uid 1003</option>
            </select>
          </label>
          <label>
            <span>{t("요청 동작", "Requested operation")}</span>
            <select value={operation} onChange={(event) => changeProbe({ operation: event.currentTarget.value as PermissionOperation })}>
              {(Object.keys(operationCopy) as PermissionOperation[]).map((id) => <option value={id} key={id}>{operationCopy[id][locale]}</option>)}
            </select>
          </label>
          <label>
            <span>{t("결과 예측", "Predict result")}</span>
            <select value={prediction} onChange={(event) => setPrediction(event.currentTarget.value as Prediction)}>
              <option value="">{t("허용/거부 선택", "Choose allow or deny")}</option>
              <option value="allow">ALLOW</option>
              <option value="deny">DENY</option>
            </select>
          </label>
          <button type="button" className="button button-primary" disabled={!prediction} onClick={runProbe}>{t("접근 요청 실행·판정", "Run and grade access")}</button>
        </div>
      </fieldset>

      <fieldset className="permission-chmod-panel">
        <legend>{t("2 · chmod로 정책 조립", "2 · Assemble the policy with chmod")}</legend>
        <div className="permission-chmod-grid">
          <label>
            <span>{t("chmod 대상", "chmod target")}</span>
            <select value={target} onChange={(event) => setTarget(event.currentTarget.value as PermissionTarget)}>
              <option value="directory">/srv/release · directory</option>
              <option value="file">/srv/release/plan.txt · file</option>
            </select>
          </label>
          <label>
            <span>{t("mode 표현", "Mode expression")}</span>
            <input
              type="text"
              value={expression}
              maxLength={24}
              aria-describedby="permission-mode-help permission-mode-error"
              placeholder={t("예: g+rx 또는 640", "e.g. g+rx or 640")}
              onChange={(event) => {
                setExpression(event.currentTarget.value);
                setInputError("");
              }}
            />
          </label>
          <button type="button" className="button button-secondary" disabled={!expression.trim()} onClick={applyMode}>{t("chmod 적용", "Apply chmod")}</button>
        </div>
        <p id="permission-mode-help">{t("특수 비트 없이 u/g/o/a, +/−/=, rwx 또는 세 자리 octal만 모델링합니다.", "This model accepts u/g/o/a with +/−/= and rwx, or three octal digits; special bits are out of scope.")}</p>
        <p id="permission-mode-error" className={inputError ? "is-visible" : undefined} role="status" aria-live="polite">{inputError}</p>
        <button type="button" className="button button-primary permission-audit-button" onClick={auditPolicy}>{t("최소 권한 정책 감사", "Audit least-privilege policy")}</button>
      </fieldset>

      <div className="permission-evidence" role="group" aria-label={t("필수 실습 완료 증거", "Required lab completion evidence")}>
        <span className={evidence.pathDenialObserved ? "is-complete" : undefined}>{evidence.pathDenialObserved ? "✓" : "○"} {t("상위 x 실패 관찰", "Observe ancestor x denial")}</span>
        <span className={evidence.symbolicChmodApplied ? "is-complete" : undefined}>{evidence.symbolicChmodApplied ? "✓" : "○"} {t("symbolic chmod 적용", "Apply symbolic chmod")}</span>
        <span className={evidence.octalChmodApplied ? "is-complete" : undefined}>{evidence.octalChmodApplied ? "✓" : "○"} {t("octal chmod 적용", "Apply octal chmod")}</span>
        <span className={evidence.policyPassed ? "is-complete" : undefined}>{evidence.policyPassed ? "✓" : "○"} {t("최소 권한 감사 통과", "Pass least-privilege audit")}</span>
      </div>

      <div className={`permission-live-feedback is-${tone}`} role="status" aria-live="polite" aria-atomic="true">
        <strong>{complete ? t("필수 실습 완료", "Required lab complete") : tone === "incorrect" ? t("첫 실패와 과도 권한을 다시 확인하세요", "Recheck the first failure and overgrants") : t("판정 근거", "Decision evidence")}</strong>
        <p>{feedback}</p>
      </div>
    </InteractiveLab>
  );
}

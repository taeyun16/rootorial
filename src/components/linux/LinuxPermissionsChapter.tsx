import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompletePermissionsChapter } from "../../features/linux-runtime/users-and-permissions";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxPermissionIncidentLab } from "./LinuxPermissionIncidentLab";
import { LinuxPermissionPolicyLab } from "./LinuxPermissionPolicyLab";
import { LinuxPermissionsConceptCheck } from "./LinuxPermissionsConceptCheck";

const tocItems = {
  ko: [
    { id: "credentials", label: "요청의 주체" },
    { id: "class-selection", label: "정확히 한 클래스" },
    { id: "mode", label: "rwx와 8진수 mode" },
    { id: "path", label: "파일과 디렉터리" },
    { id: "policy-lab", label: "필수 권한 정책 실습" },
    { id: "incidents", label: "권한 사건 디버깅" },
    { id: "real-linux", label: "실제 Linux 경계" },
    { id: "transfer", label: "가상 메모리로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "credentials", label: "The subject of a request" },
    { id: "class-selection", label: "Exactly one class" },
    { id: "mode", label: "rwx and octal modes" },
    { id: "path", label: "Files and directories" },
    { id: "policy-lab", label: "Required policy lab" },
    { id: "incidents", label: "Debug permission incidents" },
    { id: "real-linux", label: "Real Linux boundary" },
    { id: "transfer", label: "Transfer to virtual memory" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxPermissionsChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "users-and-permissions");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [accessLabComplete, setAccessLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompletePermissionsChapter({
    accessLabComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const previousHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/processes-and-signals${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-permissions-chapter-shell">
      <header className="chapter-topbar">
        <Link
          className="wordmark"
          to="/"
          search={isKo ? {} : { lang: "en" }}
          aria-label={t("Rootorial 홈", "Rootorial home")}
        >
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <div className="chapter-header-actions">
          <span className="chapter-runtime-status">
            <span className="status-dot" aria-hidden="true" /> {chapter.runtime}
          </span>
          <div className="chapter-progress-label">
            <span>CHAPTER {String(chapterNumber).padStart(2, "0")}</span>
            <div className="mini-progress">
              <span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} />
            </div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero linux-lesson-hero linux-permissions-hero">
            <p className="eyebrow">
              SUBJECT → CLASS → BITS → PATH · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">04</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>지난 장의 프로세스에 <em>자격 증명</em>을 붙이면 “누가 요청했는가”가 생깁니다. Linux는 그 주체와 경로의 owner·group·rwx를 차례로 비교해 첫 번째 거부 지점을 찾고, 필요한 동작만 허용합니다.</>
              ) : (
                <>Attach <em>credentials</em> to the previous chapter's process and every request gains a subject. Linux compares that subject with owner, group, and rwx metadata along the path, stopping at the first denial and granting only the requested operation.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("접근 요청의 주체가 프로세스이며 effective UID·GID와 supplementary group을 사용함을 설명할 수 있다.", "Explain that a process is the subject of an access request and uses its effective UID and GID plus supplementary groups.")}</li>
                <li>{t("owner → group → other 순서로 정확히 한 권한 클래스만 선택하고 결과를 예측할 수 있다.", "Select exactly one permission class in owner → group → other order and predict the result.")}</li>
                <li>{t("rwx를 8진수 mode로 변환하고 같은 비트가 일반 파일과 디렉터리에서 다른 동작을 허용함을 구분할 수 있다.", "Convert rwx to an octal mode and distinguish what the same bits authorize on files and directories.")}</li>
                <li>{t("모든 상위 디렉터리의 search 권한과 삭제의 부모 w+x 경계를 따라 첫 Permission denied 원인을 진단할 수 있다.", "Trace search permission on every ancestor and the parent's w+x deletion boundary to diagnose the first Permission denied cause.")}</li>
                <li>{t("필요한 접근은 복구하면서 다른 사용자와 쓰기 권한을 넓히지 않는 최소 권한 정책을 조립하고 검증할 수 있다.", "Assemble and verify a least-privilege policy that restores required access without widening writes or access for other users.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="credentials">
            <div className="margin-label">01 — PROCESS CREDENTIALS</div>
            <h2>{t("파일이 아니라 프로세스가 접근을 요청합니다", "A process, not a filename, makes the access request")}</h2>
            <p>
              {t(
                "셸에서 cat을 실행하면 이전 장의 fork·exec 흐름으로 cat 프로세스가 생깁니다. 이 프로세스의 effective UID가 파일 owner와 일치하는지, effective GID 또는 supplementary group 중 하나가 파일 group과 일치하는지가 기본 rwx 판정의 입력입니다. PID는 프로세스를 찾는 번호이고 terminal owner는 입출력 장치의 metadata일 뿐, 이 요청의 권한 클래스가 아닙니다.",
                "Launching cat from a shell creates a cat process through the previous chapter's fork and exec flow. Basic rwx evaluation asks whether that process's effective UID matches the file owner and whether its effective GID or any supplementary group matches the file group. A PID locates the process and the terminal owner describes an I/O device; neither is the permission class for this request.",
              )}
            </p>
            <div className="permission-credential-flow" role="group" aria-label={t("프로세스 자격 증명에서 접근 판정까지", "From process credentials to an access decision")}>
              <article>
                <span>{t("요청 주체", "SUBJECT")}</span>
                <strong>cat · PID 812</strong>
                <p>euid=1002 · egid=1002<br />groups=2000(reviewers)</p>
              </article>
              <span aria-hidden="true">→</span>
              <article>
                <span>{t("객체 metadata", "OBJECT METADATA")}</span>
                <strong>/srv/release/plan.txt</strong>
                <p>owner=1001 · group=2000<br />mode=0640</p>
              </article>
              <span aria-hidden="true">→</span>
              <article>
                <span>{t("요청", "REQUEST")}</span>
                <strong>read</strong>
                <p>{t("선택된 클래스의 r을 검사", "Check r in the selected class")}</p>
              </article>
            </div>
            <div className="concept-callout permission-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("프로그램과 프로세스를 구분하고 PID·부모·자식, fork·exec와 실행 중인 프로세스의 상태를 이해하면 충분합니다. 이번 장은 그 프로세스에 UID·GID를 더합니다.", "It is enough to distinguish a program from a process and understand PID, parent and child, fork and exec, and a running process's state. This chapter adds UID and GID to that process.")}</p>
                {preview ? (
                  <a href={previousHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                ) : (
                  <span>{t("이전 챕터는 관리자 드래프트 미리보기에서 연결됩니다.", "The previous chapter is linked from the admin draft preview.")}</span>
                )}
              </div>
            </div>
          </section>

          <section className="article-section" id="class-selection">
            <div className="margin-label">02 — SELECT ONE CLASS</div>
            <h2>{t("owner가 선택되면 group으로 떨어지지 않습니다", "Once owner is selected, evaluation does not fall through to group")}</h2>
            <p>
              {t(
                "기본 mode 판정은 세 클래스의 권한을 합치지 않습니다. effective UID가 owner와 같으면 owner 비트만, 그렇지 않고 파일 group이 primary 또는 supplementary group과 맞으면 group 비트만, 둘 다 아니면 other 비트만 선택합니다. 선택된 클래스에 필요한 비트가 없으면 뒤의 더 넓은 클래스에 비트가 있어도 거부됩니다.",
                "Basic mode evaluation does not combine permissions across classes. If the effective UID matches owner, only owner bits apply. Otherwise a matching primary or supplementary group selects group bits; if neither matches, only other bits apply. Missing permission in the selected class is a denial even if a later, broader class contains that bit.",
              )}
            </p>
            <ol className="permission-class-ladder">
              <li><span>01</span><strong>euid === owner?</strong><p>{t("예: Mina(1001)는 owner 클래스만 검사", "Example: Mina (1001) checks only owner")}</p></li>
              <li><span>02</span><strong>file group ∈ process groups?</strong><p>{t("예: Joon은 supplementary reviewers(2000)로 group 선택", "Example: Joon selects group via supplementary reviewers (2000)")}</p></li>
              <li><span>03</span><strong>otherwise</strong><p>{t("일치가 없는 Guest는 other 선택", "Guest, with no match, selects other")}</p></li>
            </ol>
            <details className="permission-prediction-answer">
              <summary>{t("예측: owner=-w-, group=r--인 파일을 owner가 읽을 수 있을까요?", "Predict: can the owner read a file whose owner=-w- and group=r--?")}</summary>
              <p>{t("읽을 수 없습니다. UID가 일치한 순간 owner 클래스만 선택되므로 group r로 fallback하지 않습니다. group r은 owner가 아닌 group 구성원의 요청에만 쓰입니다.", "No. The UID match selects owner exclusively, so evaluation does not fall back to group r. That group bit applies only to a non-owner whose groups match the file group.")}</p>
            </details>
          </section>

          <section className="article-section" id="mode">
            <div className="margin-label">03 — RWX · OCTAL</div>
            <h2>{t("4·2·1을 더하면 각 클래스의 한 자리 숫자가 됩니다", "Add 4, 2, and 1 to form one digit per class")}</h2>
            <p>{t("read=4, write=2, execute=1입니다. owner·group·other의 합을 왼쪽부터 적으므로 rw-r-----는 6·4·0, 즉 0640입니다. chmod g+r처럼 현재 mode에 비트를 더하거나 chmod 640처럼 세 클래스를 한 번에 설정할 수 있습니다. 숫자는 보안 수준이 아니라 각 클래스에 켜진 동작의 정확한 합입니다.", "Read=4, write=2, and execute=1. Write the owner, group, and other sums from left to right: rw-r----- becomes 6·4·0, or 0640. You can add a bit to the current mode with chmod g+r or set all three classes with chmod 640. The number is not a security score; it is the exact sum of enabled operations in each class.")}</p>
            <div className="permission-mode-grid">
              <article><strong>r--</strong><span>4</span><p>{t("읽기", "read")}</p></article>
              <article><strong>-w-</strong><span>2</span><p>{t("쓰기", "write")}</p></article>
              <article><strong>--x</strong><span>1</span><p>{t("실행 또는 경로 search", "execute or path search")}</p></article>
              <article><strong>rw-</strong><span>6</span><p>4 + 2</p></article>
              <article><strong>r-x</strong><span>5</span><p>4 + 1</p></article>
              <article><strong>rwx</strong><span>7</span><p>4 + 2 + 1</p></article>
            </div>
            <pre className="permission-mode-example" aria-label={t("0640 mode를 owner group other로 분해", "Break mode 0640 into owner group and other")}>{`          owner   group   other
symbolic   rw-     r--     ---
octal       6       4       0`}</pre>
          </section>

          <section className="article-section" id="path">
            <div className="margin-label">04 — FILE ≠ DIRECTORY</div>
            <h2>{t("같은 rwx라도 객체 종류와 요청에 따라 의미가 달라집니다", "The same rwx bits mean different operations on files and directories")}</h2>
            <div className="permission-object-comparison">
              <article>
                <span>{t("일반 파일", "REGULAR FILE")}</span>
                <dl>
                  <div><dt>r</dt><dd>{t("내용 읽기", "Read contents")}</dd></div>
                  <div><dt>w</dt><dd>{t("내용 변경", "Change contents")}</dd></div>
                  <div><dt>x</dt><dd>{t("실행 시도를 허가", "Authorize an execution attempt")}</dd></div>
                </dl>
                <p>{t("파일 x는 실행 시도를 허가할 뿐입니다. 올바른 실행 형식, 유효한 shebang과 interpreter, 필요한 mount·보안 조건까지 보장하지 않습니다.", "File x only authorizes an execution attempt. It does not guarantee a valid executable format, a valid shebang and interpreter, or satisfaction of mount and security conditions.")}</p>
              </article>
              <article>
                <span>{t("디렉터리", "DIRECTORY")}</span>
                <dl>
                  <div><dt>r</dt><dd>{t("항목 이름 목록 읽기", "Read the list of entry names")}</dd></div>
                  <div><dt>w</dt><dd>{t("항목 생성·삭제·이름 변경", "Create, remove, or rename entries")}</dd></div>
                  <div><dt>x</dt><dd>{t("경로 search·통과", "Search or traverse the path")}</dd></div>
                </dl>
                <p>{t("디렉터리 w만으로는 변경할 수 없습니다. 이 장의 생성·삭제 모델에서는 부모 디렉터리의 w+x가 함께 필요합니다.", "Directory w alone is insufficient. In this chapter's create and delete model, the parent directory requires both w and x.")}</p>
              </article>
            </div>
            <p>{t("/srv/release/plan.txt를 열려면 파일 r을 보기 전에 /srv와 /srv/release를 차례로 search할 x가 필요합니다. 어느 상위 디렉터리에서든 x가 없으면 검사는 그곳에서 멈춥니다. 아래 교육 fixture는 /와 /srv를 이미 통과했다고 가정하고 /srv/release부터 trace합니다. 반대로 plan.txt가 0440이어도 부모 release에 w+x가 있다면 directory entry인 plan.txt를 unlink할 수 있습니다. chmod로 target file만 반복해서 바꾸기 전에 첫 실패 경계를 찾으세요.", "Opening /srv/release/plan.txt requires x to search /srv and /srv/release before file r is considered. Missing x on any ancestor stops evaluation there. The teaching fixture below assumes / and /srv are already searchable and traces from /srv/release. Conversely, plan.txt can be unlinked even at 0440 if its parent release directory grants w+x, because unlink changes the directory entry. Find the first failed boundary before repeatedly changing only the target file.")}</p>
            <details className="permission-prediction-answer">
              <summary>{t("예측: plan.txt의 group r은 있는데 /srv/release의 group x가 없다면?", "Predict: plan.txt has group r but /srv/release lacks group x")}</summary>
              <p>{t("파일 비트에 도달하기 전에 directory search가 거부됩니다. 아래 필수 실습은 바로 이 상태에서 시작하며, 예측과 실제 판정 trace를 비교한 뒤 최소 정책을 조립합니다.", "Directory search is denied before evaluation reaches the file bits. The required lab begins in exactly this state: compare a prediction with the decision trace, then assemble the smallest sufficient policy.")}</p>
            </details>
          </section>

          <div id="policy-lab">
            <LinuxPermissionPolicyLab onCompletionChange={setAccessLabComplete} />
          </div>

          <section className="article-section" id="incidents">
            <div className="margin-label">06 — DEBUG PERMISSION INCIDENTS</div>
            <h2>{t("접근이 되기만 하는 수정과 올바른 정책을 구분합니다", "Distinguish a repair that merely works from a correct policy")}</h2>
            <p>{t("chmod 777은 많은 거부를 숨기지만 의도하지 않은 주체와 동작까지 함께 엽니다. 각 사건에서 필요한 allow·deny 결과와 owner·group·mode 자체를 다시 계산해, 첫 실패만 고치고 새로운 overgrant가 없는지 확인하세요.", "chmod 777 hides many denials by opening unintended subjects and operations as well. For each incident, recompute the required allow and deny outcomes plus the owner, group, and mode metadata; repair only the first failure and verify that no new overgrant appears.")}</p>
            <LinuxPermissionIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section linux-real-bridge" id="real-linux">
            <div className="margin-label">07 — REAL LINUX BOUNDARY</div>
            <h2>{t("이 모델은 기본 rwx 판정을 정확히 좁혀 연습합니다", "This model deliberately narrows practice to basic rwx evaluation")}</h2>
            <p>{t("필수 활동은 네트워크나 가상 머신 없이 결정론적으로 owner·group·other, 파일·디렉터리 mode와 경로 search를 계산합니다. 실제 Linux에서는 id로 프로세스에 전달될 identity와 group을, stat으로 객체의 owner·group·mode를 관찰한 뒤 같은 질문을 시작할 수 있습니다. 이 교육 모델은 filesystem UID·GID가 effective UID·GID와 같다고 두며, 별도의 fsuid·fsgid 변경은 모델링하지 않습니다.", "The required activities deterministically compute owner, group, other, file and directory modes, and path search without a network or virtual machine. On real Linux, id can show identity and groups supplied to a process while stat shows an object's owner, group, and mode; those observations begin the same line of questioning. This teaching model treats the filesystem UID and GID as equal to the effective UID and GID and does not model separate fsuid or fsgid changes.")}</p>
            <div className="permission-observation-commands">
              <article><code>id</code><p>{t("현재 프로세스가 사용할 UID·GID와 group 집합", "UID, GID, and group set available to the current process")}</p></article>
              <article><code>stat -c &apos;%U %G %A %a&apos; PATH</code><p>{t("객체의 owner·group·symbolic·octal mode", "The object's owner, group, symbolic mode, and octal mode")}</p></article>
              <article><code>namei -l PATH</code><p>{t("지원되는 환경에서 경로 구성요소별 metadata 관찰", "Inspect metadata for each path component where available")}</p></article>
            </div>
            <div className="concept-callout permission-scope-callout">
              <span className="callout-mark">∂</span>
              <div>
                <strong>{t("이번 장의 명시적 경계", "Explicit scope of this chapter")}</strong>
                <p>{t("root와 Linux capabilities에 의한 우회·세분화, POSIX ACL, LSM(SELinux·AppArmor), set-ID 비트, sticky bit, 새 객체의 초기 mode를 바꾸는 umask는 다루지 않습니다. 실제 시스템에서 기본 rwx 예상과 결과가 다르면 이 추가 계층과 mount 옵션을 확인해야 합니다. 이 장의 모델을 그 기능들까지 지원한다고 해석하지 마세요.", "This chapter does not model root and Linux capability bypasses or refinements, POSIX ACLs, LSMs such as SELinux or AppArmor, set-ID bits, the sticky bit, or umask shaping a new object's initial mode. If basic rwx predicts a different result on a real system, inspect these extra layers and mount options. Do not treat the chapter model as support for them.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER TO MEMORY</div>
            <h2>{t("같은 PID의 자격 증명에서 그 프로세스의 주소 공간으로 이동합니다", "Move from a PID's credentials to that process's address space")}</h2>
            <p>{t("실제 Linux의 /proc/<pid>/status에는 Uid·Gid·Groups 행이 있어 이 장의 요청 주체를 관찰할 수 있습니다. 다음 장에서는 같은 PID의 /proc/<pid>/maps를 단서로 코드·stack·heap과 mapping을 읽습니다. /proc 자체도 접근 통제 대상이므로 다른 프로세스의 status나 maps가 항상 보인다고 가정하지 않습니다.", "On real Linux, /proc/<pid>/status exposes Uid, Gid, and Groups lines that help observe this chapter's requesting subject. The next chapter uses /proc/<pid>/maps for the same PID to inspect code, stack, heap, and mappings. Because /proc is itself access-controlled, do not assume another process's status or maps is always readable.")}</p>
            <div className="permission-transfer-map">
              <article>
                <span>{t("이번 장", "THIS CHAPTER")}</span>
                <strong>/proc/&lt;pid&gt;/status</strong>
                <p>Uid · Gid · Groups<br />{t("누가 요청하는가", "Who makes the request")}</p>
              </article>
              <span aria-hidden="true">→</span>
              <article>
                <span>{t("다음 장", "NEXT CHAPTER")}</span>
                <strong>/proc/&lt;pid&gt;/maps</strong>
                <p>code · stack · heap<br />{t("그 프로세스가 어떤 주소를 보는가", "Which addresses that process sees")}</p>
              </article>
            </div>
            <details className="permission-transfer-answer">
              <summary>{t("전이 질문: 두 프로세스의 출력에 같은 주소가 보이면 같은 메모리일까요?", "Transfer question: if two processes print the same address, is it the same memory?")}</summary>
              <p>{t("그렇다고 결론 내릴 수 없습니다. 주소 숫자는 각 프로세스의 가상 주소 공간에서 해석됩니다. 다음 장은 page mapping을 조작해 같은 가상 주소와 같은 물리 저장소를 구분합니다.", "Not necessarily. The address number is interpreted inside each process's virtual address space. The next chapter manipulates page mappings to distinguish the same virtual address from the same physical storage.")}</p>
            </details>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">09 — CHECK</div>
            <LinuxPermissionsConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 Permission denied를 첫 경계부터 설명할 수 있습니다", "You can now explain Permission denied from its first failed boundary")}</h2>
            <p>{t("경로 거부를 직접 관찰하고 symbolic·octal chmod로 release 정책을 조립하고, 네 사건을 overgrant 없이 수리하며 다섯 개념을 연결하면 이 챕터의 목표에 도달했습니다.", "You have reached the goal after observing a path denial, assembling the release policy with symbolic and octal chmod, repairing four incidents without overgrants, and connecting all five concepts.")}</p>
            <div className="permission-completion-checklist" role="status" aria-live="polite">
              <span className={accessLabComplete ? "is-complete" : undefined}>{accessLabComplete ? "✓" : "○"} {t("권한 정책 실습", "Permission policy lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("권한 사건 4개", "Four permission incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="users-and-permissions"
              canComplete={canComplete}
              lockedMessage={t(
                "권한 정책 실습, 권한 사건 네 개와 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the permission policy lab, all four permission incidents, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <CitationSection
            citations={[
              {
                title: "Operating Systems: Three Easy Pieces (OSTEP)",
                url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={previousHref}>← {t("이전: 프로세스와 시그널", "Previous: Processes and Signals")}</a>
            ) : (
              <span>← {t("이전: 프로세스와 시그널", "Previous: Processes and Signals")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>
            )}
            <span>{t("다음: 메모리와 가상 주소", "Next: Memory and Virtual Addresses")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}

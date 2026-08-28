import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteProcessesChapter } from "../../features/linux-runtime/processes-and-signals";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxProcessIncidentLab } from "./LinuxProcessIncidentLab";
import { LinuxProcessLifecycleLab } from "./LinuxProcessLifecycleLab";
import { LinuxProcessesConceptCheck } from "./LinuxProcessesConceptCheck";

const tocItems = {
  ko: [
    { id: "tree", label: "프롬프트 뒤의 트리" },
    { id: "program", label: "프로그램과 프로세스" },
    { id: "launch", label: "fork · exec · wait" },
    { id: "stdio", label: "세 개의 기본 연결" },
    { id: "lifecycle", label: "필수 수명주기 실습" },
    { id: "signals", label: "상태와 시그널" },
    { id: "incidents", label: "상태 디버깅" },
    { id: "transfer", label: "자격 증명으로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "tree", label: "The tree behind the prompt" },
    { id: "program", label: "Programs and processes" },
    { id: "launch", label: "fork · exec · wait" },
    { id: "stdio", label: "Three default connections" },
    { id: "lifecycle", label: "Required lifecycle lab" },
    { id: "signals", label: "States and signals" },
    { id: "incidents", label: "Debug process states" },
    { id: "transfer", label: "Transfer to credentials" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxProcessesChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "processes-and-signals");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [lifecycleLabComplete, setLifecycleLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteProcessesChapter({
    lifecycleLabComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const previousHref = `${preview ? "/admin/preview" : ""}/curricula/${LINUX_CURRICULUM_SLUG}/chapters/boot-to-shell${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-processes-chapter-shell">
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
            <div className="mini-progress"><span style={{ width: `${(chapterNumber / chapters.length) * 100}%` }} /></div>
            <span>{chapterNumber} / {chapters.length}</span>
          </div>
          <LanguageSwitcher compact />
          <AuthControls compact />
        </div>
      </header>

      <div className="article-layout">
        <ChapterToc items={[...tocItems[locale]]} />

        <article className="lesson-article">
          <header className="lesson-hero linux-lesson-hero linux-processes-hero">
            <p className="eyebrow">
              FORK → EXEC → EXIT → WAIT · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">03</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>프롬프트에서 실행한 명령은 파일 이름으로 끝나지 않습니다. 셸이 만든 <em>프로세스</em>가 PID와 연결을 물려받고, signal에 반응하고, 부모가 종료 정보를 거둘 때까지 상태를 바꿉니다.</>
              ) : (
                <>A command launched at the prompt does not end with a filename. A <em>process</em> created by the shell inherits an identity and connections, responds to signals, and changes state until its parent collects the termination status.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("프로그램 파일과 실행 중인 프로세스를 구분하고 PID·PPID로 부모·자식 관계를 읽을 수 있다.", "Distinguish a program file from a running process and read parent-child relationships from PID and PPID.")}</li>
                <li>{t("일반적인 셸 모델에서 fork는 자식을 만들고 exec는 같은 PID의 프로그램 이미지를 교체함을 설명할 수 있다.", "Explain that fork creates a child while exec replaces the program image within that same PID in a typical shell model.")}</li>
                <li>{t("stdin·stdout·stderr 연결의 상속과 stdout 리다이렉션 결과를 예측할 수 있다.", "Predict inherited stdin, stdout, and stderr connections and the result of redirecting stdout.")}</li>
                <li>{t("R·S·T·Z 상태와 SIGSTOP·SIGCONT·SIGTERM·SIGKILL의 상태 변화를 관찰할 수 있다.", "Observe R, S, T, and Z states and transitions caused by SIGSTOP, SIGCONT, SIGTERM, and SIGKILL.")}</li>
                <li>{t("종료한 자식이 wait 전에는 zombie로 남는 이유를 설명하고 상황에 맞는 복구 동작을 선택할 수 있다.", "Explain why an exited child remains a zombie before wait and choose an appropriate recovery action for each state.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="tree">
            <div className="margin-label">01 — TRACE THE TREE</div>
            <h2>{t("지난 장의 PID 1 아래에서 다음 명령이 태어납니다", "The next command is born below PID 1 from the previous chapter")}</h2>
            <p>
              {isKo ? <><code>init(1)</code>이 셸 <code>sh(42)</code>를 시작했고, 그 프롬프트에서 실행한 명령은 셸의 자식이 됩니다. PID는 한 시점의 프로세스를 식별하고 PPID는 직접 부모를 가리킵니다. 이 장의 1·42·73·74는 결과를 비교하기 위한 고정 교육 값이며, 실제 Linux는 빈 PID를 나중에 재사용할 수 있습니다.</> : <><code>init(1)</code> started <code>sh(42)</code>, and a command launched at that prompt becomes a child of the shell. A PID identifies a process at one moment; PPID points to its direct parent. This chapter fixes 1, 42, 73, and 74 for deterministic comparison, while real Linux may later reuse a free PID.</>}
            </p>
            <pre className="process-tree-preview" aria-label={t("명령 실행 뒤 프로세스 트리", "Process tree after launching a command")}>{`PID  PPID  STATE  COMMAND\n  1     0    S    init\n 42     1    R    sh\n 73    42    R    cpu_worker`}</pre>
            <div className="concept-callout process-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("터미널·셸·프롬프트와 > 리다이렉션, 그리고 부팅 뒤 init이 PID 1이고 셸이 그 아래에서 명령을 시작한다는 사실만 사용합니다. signal이나 scheduler 지식은 필요하지 않습니다.", "Use only the ideas that terminal, shell, and prompt differ; > redirects output; and after boot init is PID 1 while a shell launches commands below it. No prior signal or scheduler knowledge is required.")}</p>
                <a href={previousHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
              </div>
            </div>
          </section>

          <section className="article-section" id="program">
            <div className="margin-label">02 — PROGRAM ≠ PROCESS</div>
            <h2>{t("프로그램은 파일이고 프로세스는 한 번의 실행입니다", "A program is a file; a process is one execution")}</h2>
            <p>{t("/usr/bin/report 같은 실행 파일은 디스크에 저장된 프로그램입니다. 셸이 같은 파일을 두 번 실행하면 코드 출처는 같아도 PID, 상태, 열린 파일과 메모리를 따로 가진 두 프로세스가 됩니다. fork 직후 내용이 비슷해 보여도 부모와 자식은 서로의 이후 쓰기를 직접 공유하는 하나의 주소 공간이 아닙니다.", "An executable such as /usr/bin/report is a program stored on disk. Launch it twice and two processes may share the code source while retaining distinct PIDs, states, open files, and memory. Although parent and child begin with similar contents after fork, later writes do not occur in one directly shared address space.")}</p>
            <div className="program-process-comparison">
              <article><span>{t("프로그램", "PROGRAM")}</span><strong>/usr/bin/report</strong><p>{t("실행할 명령과 데이터가 저장된 파일", "A file storing instructions and data to execute")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("프로세스 A", "PROCESS A")}</span><strong>PID 73</strong><p>PPID 42 · stdout terminal</p></article>
              <article><span>{t("프로세스 B", "PROCESS B")}</span><strong>PID 74</strong><p>PPID 42 · stdout out.log</p></article>
            </div>
          </section>

          <section className="article-section" id="launch">
            <div className="margin-label">03 — FORK · EXEC · WAIT</div>
            <h2>{t("셸은 자식을 만들고 프로그램을 교체한 뒤 종료 정보를 거둡니다", "The shell creates a child, replaces its program, then collects termination status")}</h2>
            <ol className="process-lifecycle-overview">
              <li><span>01</span><strong>fork</strong><p>{t("셸을 부모로 갖는 새 자식 PID를 만듭니다. 부모에는 자식 PID, 자식에는 0이라는 서로 다른 반환 경로가 생깁니다.", "Creates a new child PID whose parent is the shell. Parent and child receive different return paths: the child PID in the parent and zero in the child.")}</p></li>
              <li><span>02</span><strong>exec</strong><p>{t("자식 프로세스의 프로그램 이미지를 명령으로 교체합니다. PID와 기본 열린 fd는 유지되고 성공하면 이전 프로그램으로 돌아오지 않습니다.", "Replaces the child's program image with the command. The PID and ordinary open descriptors remain; success does not return to the old program.")}</p></li>
              <li><span>03</span><strong>run · exit</strong><p>{t("실행 가능한 동안 CPU 시간을 받고, 반환하거나 signal의 기본 동작을 따르면 종료 상태 정보를 남깁니다.", "Receives CPU time while runnable, then leaves termination information after returning or taking a signal's default action.")}</p></li>
              <li><span>04</span><strong>waitpid</strong><p>{t("부모 셸이 자식의 종료 정보를 회수합니다. foreground 명령이라면 셸은 보통 이 시점까지 프롬프트를 다시 내주지 않습니다.", "The parent shell collects the child's termination status. For a foreground command, the shell typically does not return the prompt until this point.")}</p></li>
            </ol>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("모든 셸 명령이 똑같이 fork하는 것은 아닙니다", "Not every shell command follows an identical fork path")}</strong>
                <p>{t("cd 같은 built-in은 셸 자체에서 실행되어야 현재 디렉터리를 바꿀 수 있고, 셸은 posix_spawn 같은 다른 구현 경로를 쓸 수도 있습니다. 이 장은 외부 명령을 설명하는 일반적인 fork→exec 모델을 학습 경계로 사용합니다.", "A built-in such as cd must run inside the shell to change its current directory, and shells may use implementation paths such as posix_spawn. This chapter uses the common fork→exec model for an external command as its teaching boundary.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="stdio">
            <div className="margin-label">04 — STDIO CONNECTIONS</div>
            <h2>{t("입출력은 프로세스 안의 세 연결에서 시작합니다", "Input and output begin as three process connections")}</h2>
            <p>{t("프로세스는 보통 열린 file descriptor 0·1·2를 stdin·stdout·stderr로 사용합니다. 셸은 fork 전에 연결을 준비하고 자식은 이를 상속하며, exec 뒤에도 close-on-exec으로 표시되지 않은 fd는 남습니다. 따라서 >는 프로그램을 옮기는 대신 fd 1이 가리키는 곳을 파일로 바꿉니다.", "Processes conventionally use open file descriptors 0, 1, and 2 as stdin, stdout, and stderr. The shell prepares connections that the child inherits; descriptors not marked close-on-exec remain after exec. Thus > changes where fd 1 points instead of moving the program.")}</p>
            <div className="stdio-connection-grid">
              <article><span>fd 0</span><strong>stdin</strong><p>{t("terminal 또는 pipe에서 읽기", "Read from a terminal or pipe")}</p></article>
              <article><span>fd 1</span><strong>stdout</strong><p>{t("terminal 또는 > out.log에 쓰기", "Write to the terminal or > out.log")}</p></article>
              <article><span>fd 2</span><strong>stderr</strong><p>{t("2>로 바꾸지 않으면 terminal에 유지", "Remain on the terminal unless changed with 2>")}</p></article>
            </div>
            <details className="process-prediction-answer">
              <summary>{t("예측: report > out.log가 오류도 냈다면?", "Predict: report > out.log also reports an error")}</summary>
              <p>{t("정상 stdout은 out.log로 가지만 stderr는 fd 2이므로 terminal에 남습니다. 아래 실습에서는 fd 1의 두 목적지를 실제 tick 출력으로 비교합니다.", "Normal stdout goes to out.log, but stderr remains on the terminal because it is fd 2. The lab below compares two fd 1 destinations using actual tick output.")}</p>
            </details>
          </section>

          <div id="lifecycle">
            <LinuxProcessLifecycleLab onCompletionChange={setLifecycleLabComplete} />
          </div>

          <section className="article-section" id="signals">
            <div className="margin-label">06 — STATES · SIGNALS</div>
            <h2>{t("kill은 ‘죽이기’보다 signal을 보내는 인터페이스입니다", "kill is an interface for sending signals, not a guarantee of death")}</h2>
            <p>{t("R·S·T·Z는 서로 다른 상태입니다. R은 실행 가능, S는 입력이나 사건 대기, T는 signal로 정지, Z는 이미 종료했지만 부모의 wait를 기다리는 상태입니다. sleeping·stopped·zombie를 모두 ‘죽었다’고 읽으면 복구 동작을 고를 수 없습니다.", "R, S, T, and Z are distinct. R is runnable, S waits for input or an event, T is signal-stopped, and Z has exited but awaits the parent's wait. Calling sleeping, stopped, and zombie all ‘dead’ makes the correct recovery action impossible to choose.")}</p>
            <div className="process-state-legend">
              <article><strong>R</strong><span>{t("실행 가능", "runnable")}</span><p>{t("교육용 queue의 tick 후보", "Eligible for a teaching-queue tick")}</p></article>
              <article><strong>S</strong><span>{t("대기", "sleeping")}</span><p>{t("입력·사건이 오면 R로", "Returns to R when input or an event arrives")}</p></article>
              <article><strong>T</strong><span>{t("정지", "stopped")}</span><p>{t("SIGCONT로 이전 조건 복원", "SIGCONT restores the prior condition")}</p></article>
              <article><strong>Z</strong><span>{t("종료 정보 보존", "termination status retained")}</span><p>{t("signal이 아니라 부모 wait 필요", "Needs parent wait, not another signal")}</p></article>
            </div>
            <div className="signal-behavior-list">
              <article><code>SIGINT</code><p>{t("terminal의 Ctrl+C가 foreground 작업에 보내는 대표 signal입니다. 기본 동작은 종료지만 프로그램이 처리할 수 있습니다.", "A representative signal sent to a foreground job by terminal Ctrl+C. Its default is termination, but a program can handle it.")}</p></article>
              <article><code>SIGTERM</code><p>{t("정리할 기회를 주는 협력적 종료 요청입니다. 처리하거나 무시할 수 있습니다.", "A cooperative termination request that allows cleanup. It can be handled or ignored.")}</p></article>
              <article><code>SIGKILL</code><p>{t("catch·block·ignore할 수 없는 강제 종료입니다. 먼저 상태를 관찰한 뒤 마지막 수단으로 씁니다.", "A forceful termination that cannot be caught, blocked, or ignored. Use it as a last resort after observing state.")}</p></article>
              <article><code>SIGSTOP · SIGCONT</code><p>{t("실행을 끝내지 않고 정지·재개합니다. 정지 전 S였다면 CONT 뒤에도 입력 대기가 남을 수 있습니다.", "Pause and resume without exiting. If the process was waiting in S before stopping, it may still await input after CONT.")}</p></article>
            </div>
          </section>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — DEBUG STATE</div>
            <h2>{t("이름을 외우지 말고 목표 상태가 생겼는지 확인합니다", "Do not memorize names; verify that the goal state actually appears")}</h2>
            <p>{t("signal 하나만 보내고 성공이라고 가정하지 않습니다. stopped worker는 같은 PID의 새 출력, sleeping reader는 입력 전달, zombie는 행 제거, 무응답 worker는 status 137 회수까지 확인해야 합니다.", "Do not assume one signal means success. Verify a new output from the same stopped PID, delivered input for a sleeping reader, removal of a zombie row, and collection of status 137 for an unresponsive worker.")}</p>
            <LinuxProcessIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER</div>
            <h2>{t("다음에는 ‘누가 실행 중인가’를 프로세스에 붙입니다", "Next, attach ‘who is running’ to each process")}</h2>
            <p>{t("프로세스는 PID와 fd만 갖지 않습니다. 실행 주체의 UID·GID 같은 자격 증명도 가지며, 커널은 다음 장에서 그 값과 파일의 소유자·group·rwx를 비교해 접근을 허용하거나 거부합니다. 이 장에서는 권한을 판정하지 않고, 같은 명령도 실행 주체에 따라 다른 결과를 낼 수 있다는 질문만 넘깁니다.", "A process has more than a PID and file descriptors. It also carries credentials such as the executing UID and GID. In the next chapter, the kernel compares those values with file ownership, group, and rwx bits to allow or deny access. This chapter leaves that decision open and transfers only the question of why the same command can behave differently for different actors.")}</p>
            <div className="process-transfer-map">
              <article><span>{t("이번 장", "THIS CHAPTER")}</span><strong>PID · PPID · fd · state</strong><p>{t("무엇이 실행되고 어디에 연결됐는가", "What is running and where it is connected")}</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("다음 장", "NEXT CHAPTER")}</span><strong>UID · GID · rwx</strong><p>{t("누가 어떤 자원에 접근할 수 있는가", "Who may access which resource")}</p></article>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">09 — CHECK</div>
            <LinuxProcessesConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 프로세스 행을 다음 상태로 바꾸는 원인을 설명할 수 있습니다", "You can now explain what moves a process row into its next state")}</h2>
            <p>{t("두 자식의 PID·stdout·정지·재개·종료·wait를 직접 관찰하고 네 사건을 실제 상태 결과로 해결하며 다섯 개념을 연결하면 이 챕터의 목표에 도달했습니다.", "You have reached the goal after observing two children's PID, stdout, stop, resume, exit, and wait transitions; solving four incidents by actual state results; and connecting all five concepts.")}</p>
            <div className="process-completion-checklist" role="status" aria-live="polite">
              <span className={lifecycleLabComplete ? "is-complete" : undefined}>{lifecycleLabComplete ? "✓" : "○"} {t("프로세스 수명주기 실습", "Process lifecycle lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("상태 사건 4개", "Four state incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="processes-and-signals"
              canComplete={canComplete}
              lockedMessage={t(
                "프로세스 수명주기 실습, 상태 사건 네 개와 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the process lifecycle lab, all four state incidents, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <CitationSection
            citations={[
              {
                title: "Operating Systems: Three Easy Pieces (OSTEP)",
                url: "https://pages.cs.wisc.edu/~remzi/OSTEP/",
              },
              {
                title: "Linux Kernel Development (Love, 2010)",
                url: "https://www.oreilly.com/library/view/linux-kernel-development/9780768696974/",
              },
            ]}
          />

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            <a href={previousHref}>← {t("이전: 전원이 켜지고 셸이 뜨기까지", "Previous: From Power-On to a Shell")}</a>
            <span>{t("다음: 사용자와 권한", "Next: Users and Permissions")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}

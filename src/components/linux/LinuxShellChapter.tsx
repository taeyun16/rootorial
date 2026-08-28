import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxConceptCheck } from "./LinuxConceptCheck";
import { LinuxShellWorkspace } from "./LinuxShellWorkspace";

const tocItems = {
  ko: [
    { id: "mental-model", label: "셸의 역할" },
    { id: "paths", label: "경로 읽기" },
    { id: "practice", label: "필수 실습" },
    { id: "real-linux", label: "실제 Linux 비교" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "mental-model", label: "What the shell does" },
    { id: "paths", label: "Reading paths" },
    { id: "practice", label: "Required lab" },
    { id: "real-linux", label: "Compare real Linux" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxShellChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(
    ({ slug }) => slug === "shell-and-filesystem",
  );
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [labComplete, setLabComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = labComplete && conceptsMastered;
  const experimentHref = `/experiments/linux${isKo ? "" : "?lang=en"}#real-linux`;

  const lockedMessage = !labComplete && !conceptsMastered
    ? t(
        "필수 실습 다섯 과제와 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
        "Finish all five required lab tasks and all five concept-check questions to complete the chapter.",
      )
    : !labComplete
      ? t(
          "이해 확인을 통과했습니다. 필수 실습 다섯 과제를 마쳐 주세요.",
          "You passed the concept check. Finish the five required lab tasks.",
        )
      : t(
          "필수 실습을 통과했습니다. 이해 확인 다섯 문제를 맞혀 주세요.",
          "You passed the required lab. Answer all five concept-check questions correctly.",
        );

  return (
    <main className="chapter-shell linux-chapter-shell linux-lab-shell">
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
            <span className="status-dot" aria-hidden="true" /> {t("교육용 셸", "Teaching shell")}
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
          <header className="lesson-hero linux-lesson-hero">
            <p className="eyebrow">
              SYSTEMS FOUNDATION · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">01</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>Linux에서 파일을 다루는 첫 단계는 명령을 많이 외우는 일이 아닙니다. <em>내가 누구인지</em>, <em>지금 어디에 있는지</em>, 그리고 입력한 경로가 <em>어디에서 시작하는지</em> 읽는 일입니다.</>
              ) : (
                <>The first step in working with files on Linux is not memorizing commands. It is reading <em>who you are</em>, <em>where you are</em>, and <em>where each path begins</em>.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("프롬프트, 명령, 출력의 역할을 구분할 수 있다.", "Distinguish the prompt, command, and output.")}</li>
                <li>{t("절대 경로와 상대 경로를 현재 디렉터리와 연결해 설명할 수 있다.", "Explain absolute and relative paths in relation to the current directory.")}</li>
                <li>{t("디렉터리와 파일을 만들고 파일 트리의 변화를 확인할 수 있다.", "Create directories and files, then verify the resulting tree.")}</li>
                <li>{t("권한 오류를 실패가 아니라 시스템 상태의 단서로 읽을 수 있다.", "Read a permission error as evidence about system state rather than a dead end.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="mental-model">
            <div className="margin-label">01 — SHELL</div>
            <h2>{t("셸은 명령을 받아 프로그램과 파일시스템을 연결합니다", "The shell connects your commands to programs and the filesystem")}</h2>
            <p>
              {isKo ? <>터미널은 글자를 보여 주는 화면이고, 셸은 그 안에서 명령을 해석하는 프로그램입니다. <code>student@rootorial:~$</code>는 출력 결과가 아니라 새 명령을 기다린다는 프롬프트입니다.</> : <>The terminal is the screen that displays text; the shell is the program inside it that interprets commands. <code>student@rootorial:~$</code> is not command output. It is the prompt waiting for a new command.</>}
            </p>
            <div className="linux-prompt-anatomy" aria-label={t("Linux 프롬프트 구성", "Anatomy of a Linux prompt")}>
              <div><code>student</code><span>{t("사용자", "user")}</span></div>
              <b aria-hidden="true">@</b>
              <div><code>rootorial</code><span>{t("컴퓨터 이름", "host")}</span></div>
              <b aria-hidden="true">:</b>
              <div><code>~</code><span>{t("현재 경로", "current path")}</span></div>
              <div><code>$</code><span>{t("일반 사용자", "regular user")}</span></div>
            </div>
            <p>
              {isKo ? <><code>pwd</code>는 셸의 현재 작업 디렉터리를 보여 주고, <code>whoami</code>는 명령을 실행하는 사용자를 보여 줍니다. 같은 명령이라도 이 두 상태에 따라 읽거나 바꿀 수 있는 대상이 달라집니다.</> : <><code>pwd</code> shows the shell&apos;s current working directory, while <code>whoami</code> shows the user running the command. The same command can reach different things depending on these two pieces of state.</>}
            </p>
          </section>

          <section className="article-section" id="paths">
            <div className="margin-label">02 — PATHS</div>
            <h2>{t("경로는 파일의 주소이자 탐색을 시작할 기준입니다", "A path is both a file address and a starting point for navigation")}</h2>
            <p>
              {isKo ? <>절대 경로는 루트 <code>/</code>에서 시작하므로 현재 위치가 바뀌어도 같은 대상을 가리킵니다. 상대 경로는 현재 디렉터리에서 시작합니다. 그래서 <code>cat readme.txt</code>의 의미는 먼저 <code>pwd</code>를 알아야 확정됩니다.</> : <>An absolute path starts at the root <code>/</code>, so it points to the same target even when your current directory changes. A relative path starts in the current directory. That means you need <code>pwd</code> before you can fully interpret <code>cat readme.txt</code>.</>}
            </p>
            <div className="linux-path-grid">
              <article><code>/</code><strong>{t("루트", "Root")}</strong><p>{t("모든 절대 경로가 시작하는 파일시스템의 맨 위입니다.", "The top of the filesystem where every absolute path begins.")}</p></article>
              <article><code>~</code><strong>{t("홈", "Home")}</strong><p>{t("현재 사용자의 작업 공간입니다. 여기서는 /home/student입니다.", "The current user's workspace; here it means /home/student.")}</p></article>
              <article><code>.</code><strong>{t("현재 위치", "Current")}</strong><p>{t("셸이 지금 작업 중인 디렉터리를 명시합니다.", "Explicitly names the directory where the shell is working now.")}</p></article>
              <article><code>..</code><strong>{t("부모 위치", "Parent")}</strong><p>{t("현재 디렉터리를 포함하는 한 단계 위 디렉터리입니다.", "The directory one level above the current directory.")}</p></article>
            </div>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("오류도 결과입니다", "An error is still a result")}</strong>
                <p>{t("Permission denied는 명령이 무의미했다는 뜻이 아니라, 대상 파일이나 상위 디렉터리에 현재 사용자가 필요한 권한을 갖지 못했다는 단서입니다. 실습 마지막 과제에서는 존재하는 /etc/os-release 파일의 쓰기 경계를 직접 확인합니다.", "Permission denied does not mean the command was meaningless. It tells you that the current user lacks a required permission on the target or one of its parent directories. The final task observes that boundary on the existing /etc/os-release file.")}</p>
              </div>
            </div>
            <p>
              {isKo ? <><code>mkdir -p lab</code>은 현재 위치 아래에 <code>lab</code> 디렉터리를 만듭니다. 이어서 <code>echo &quot;...&quot; &gt; lab/notes.txt</code>를 실행하면 셸의 <code>&gt;</code> 리다이렉션이 출력을 화면 대신 상대 경로의 파일에 기록합니다. 곧 나오는 실습에서 두 변화를 파일 트리로 확인하세요.</> : <><code>mkdir -p lab</code> creates a <code>lab</code> directory beneath the current location. Then <code>echo &quot;...&quot; &gt; lab/notes.txt</code> uses the shell&apos;s <code>&gt;</code> redirection to write output into a relative-path file instead of the screen. Verify both changes in the file tree in the lab below.</>}
            </p>
          </section>

          <LinuxShellWorkspace
            id="practice"
            variant="chapter"
            onCompletionChange={setLabComplete}
          />

          <section className="article-section linux-real-bridge" id="real-linux">
            <div className="margin-label">04 — REAL KERNEL · OPTIONAL</div>
            <h2>{t("같은 명령을 실제 Linux 커널에서도 비교해 보세요", "Compare the same ideas on a real Linux kernel")}</h2>
            <p>
              {t(
                "필수 실습은 빠르고 반복 가능한 교육 모델에서 진행합니다. 선택 실험에서는 v86이 BIOS부터 Buildroot Linux를 실제로 부팅하며 uname, mount와 ps 결과를 보여 줍니다. 외부 부팅 자산을 내려받기 때문에 챕터 완료 조건에는 포함하지 않습니다.",
                "The required lab uses a fast, repeatable teaching model. The optional experiment uses v86 to boot real Buildroot Linux from its BIOS and exposes uname, mount, and ps. Because it downloads external boot assets, it is not required for chapter completion.",
              )}
            </p>
            <div className="linux-runtime-compare">
              <article><span>{t("필수", "REQUIRED")}</span><strong>{t("교육용 셸", "Teaching shell")}</strong><p>{t("경로와 파일 상태를 즉시 초기화하고 정확하게 판정합니다.", "Resets path and file state instantly for deterministic assessment.")}</p></article>
              <article><span>{t("선택", "OPTIONAL")}</span><strong>{t("실제 Linux VM", "Real Linux VM")}</strong><p>{t("BIOS, 커널, init과 프로세스가 실제로 동작하는 전체 시스템입니다.", "A complete system where BIOS, the kernel, init, and processes actually run.")}</p></article>
            </div>
            <a className="button button-secondary" href={experimentHref}>
              {t("실제 Linux 부팅 실험 열기", "Open the real Linux boot experiment")} <span aria-hidden="true">↗</span>
            </a>
          </section>

          <section className="article-section" id="check">
            <div className="margin-label">05 — CHECK</div>
            <LinuxConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHAPTER COMPLETE</p>
            <h2>{t("이제 명령 앞에서 먼저 상태를 읽을 수 있습니다", "You can now read the state before reaching for a command")}</h2>
            <p>
              {t(
                "프롬프트에서 사용자와 현재 위치를 찾고, 경로의 시작점을 구분하고, 파일 트리와 오류 메시지로 결과를 검증할 수 있다면 이 챕터의 목표에 도달했습니다.",
                "If you can find the user and current directory in a prompt, distinguish where a path begins, and verify results through the file tree and error messages, you have reached this chapter's goal.",
              )}
            </p>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="shell-and-filesystem"
              canComplete={canComplete}
              lockedMessage={lockedMessage}
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
            <Link
              to="/curricula/$curriculumSlug"
              params={{ curriculumSlug: LINUX_CURRICULUM_SLUG }}
              search={isKo ? {} : { lang: "en" }}
            >
              ← {t("커리큘럼", "Curriculum")}
            </Link>
            <span>
              {t("다음: 전원이 켜지고 셸이 뜨기까지", "Next: From Power-On to a Shell")} <small>{t("준비 중", "Coming soon")}</small>
            </span>
          </nav>
        </article>
      </div>
    </main>
  );
}

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteBootChapter } from "../../features/linux-runtime/boot-sequence";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxBootConceptCheck } from "./LinuxBootConceptCheck";
import { LinuxBootFailureLab } from "./LinuxBootFailureLab";
import { LinuxBootSequenceLab } from "./LinuxBootSequenceLab";
import { V86LinuxTerminal } from "./V86LinuxTerminal";

const tocItems = {
  ko: [
    { id: "backward", label: "프롬프트에서 역추적" },
    { id: "handoffs", label: "부팅 경계" },
    { id: "boot-lab", label: "필수 부팅 실습" },
    { id: "diagnose", label: "장애 진단" },
    { id: "real-kernel", label: "실제 커널 비교" },
    { id: "transfer", label: "프로세스로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "backward", label: "Trace from the prompt" },
    { id: "handoffs", label: "Boot boundaries" },
    { id: "boot-lab", label: "Required boot lab" },
    { id: "diagnose", label: "Diagnose failures" },
    { id: "real-kernel", label: "Compare a real kernel" },
    { id: "transfer", label: "Transfer to processes" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxBootChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "boot-to-shell");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [bootLabComplete, setBootLabComplete] = useState(false);
  const [diagnosticsComplete, setDiagnosticsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteBootChapter({
    bootLabComplete,
    diagnosticsComplete,
    conceptsMastered,
  });

  return (
    <main className="chapter-shell linux-chapter-shell linux-boot-chapter-shell">
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
          <header className="lesson-hero linux-lesson-hero linux-boot-hero">
            <p className="eyebrow">
              BOOT BOUNDARIES · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">02</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>지난 챕터에서 보았던 <em>정상 프롬프트</em>는 이 부팅 모델에서 출발점이 아니라 결과입니다. 전원이 켜진 뒤 펌웨어, 커널, root filesystem과 init이 차례로 경계를 넘었기 때문에 직렬 셸이 명령을 기다릴 수 있습니다.</>
              ) : (
                <>The <em>expected prompt</em> from the previous chapter is an outcome, not a starting point, in this boot model. A serial shell can wait for commands only because firmware, the kernel, the root filesystem, and init crossed their boundaries after power-on.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("펌웨어, 커널, root filesystem, init과 셸의 역할과 인계 순서를 구분할 수 있다.", "Distinguish the roles and handoff order of firmware, the kernel, the root filesystem, init, and the shell.")}</li>
                <li>{t("부팅 표식을 단계에 연결해 시스템이 어디까지 진행했는지 판단할 수 있다.", "Map boot markers to stages and determine how far the system progressed.")}</li>
                <li>{t("커널 실행과 사용자 공간·셸 준비가 다른 상태인 이유를 설명할 수 있다.", "Explain why a running kernel and a ready userspace shell are different states.")}</li>
                <li>{t("가장 이른 실패 경계를 찾아 최소 수정으로 프롬프트를 복구할 수 있다.", "Locate the earliest failed boundary and restore a prompt with the smallest repair.")}</li>
                <li>{t("init에서 셸로 이어지는 관계를 다음 챕터의 부모·자식 프로세스로 연결할 수 있다.", "Connect init's path to the shell with the parent-child processes in the next chapter.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="backward">
            <div className="margin-label">01 — TRACE BACKWARD</div>
            <h2>{t("프롬프트에서 전원 버튼까지 거꾸로 추적합니다", "Trace backward from the prompt to the power button")}</h2>
            <p>
              {isKo ? <><code>student@rootorial:~$</code>가 보인다는 사실은 셸 프로그램이 실행 중이라는 뜻입니다. 셸이 파일 경로를 읽으려면 root filesystem이 열려 있어야 하고, 셸을 시작할 사용자 공간의 첫 프로그램인 <code>init</code>이 먼저 실행되어야 합니다. init을 실행하고 메모리·장치를 준비한 주체가 커널이며, 커널을 시작할 기계 상태를 만든 주체가 펌웨어입니다.</> : <>Seeing <code>student@rootorial:~$</code> means a shell program is running. Before the shell can read paths, the root filesystem must be available and <code>init</code>, the first userspace program, must start the shell service. The kernel prepares memory and devices and launches init; firmware prepares the machine state from which the kernel can begin.</>}
            </p>
            <div className="concept-callout">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("터미널·셸·프롬프트를 구분하고, /가 파일시스템 루트이며 오류가 시스템 상태의 단서라는 지난 챕터의 규칙만 사용합니다. PID와 시그널 지식은 아직 필요하지 않습니다.", "Use only the previous chapter's rules: distinguish terminal, shell, and prompt; know that / is the filesystem root; and treat errors as evidence. You do not need prior knowledge of PIDs or signals.")}</p>
                <Link
                  to="/curricula/$curriculumSlug/chapters/$chapterSlug"
                  params={{ curriculumSlug: LINUX_CURRICULUM_SLUG, chapterSlug: "shell-and-filesystem" }}
                  search={isKo ? {} : { lang: "en" }}
                >
                  {t("이전 챕터 다시 보기", "Review the previous chapter")} →
                </Link>
              </div>
            </div>
          </section>

          <section className="article-section" id="handoffs">
            <div className="margin-label">02 — HANDOFFS</div>
            <h2>{t("Linux 부팅은 한 프로그램이 아니라 경계들의 연속입니다", "Linux boot is a sequence of boundaries, not one program")}</h2>
            <p>
              {t(
                "일반 PC는 BIOS 또는 UEFI 뒤에 bootloader를 둘 수 있지만 모든 시스템이 같은 경로를 따르지는 않습니다. 이 챕터의 실제 v86 실험은 SeaBIOS와 커널 이미지를 직접 제공하므로, 존재하지 않는 GRUB·디스크 단계를 꾸며 내지 않고 관찰 가능한 네 경계만 모델링합니다.",
                "A general PC may place a bootloader after BIOS or UEFI, but not every system follows one path. This chapter's v86 experiment supplies SeaBIOS and a kernel image directly, so the model uses only four observable boundaries instead of inventing a GRUB or disk stage that is not configured.",
              )}
            </p>
            <ol className="boot-handoff-overview">
              <li><span>01</span><strong>{t("펌웨어", "Firmware")}</strong><p>{t("CPU와 가상 하드웨어를 초기화하고 실행할 커널 이미지로 인계합니다.", "Initializes the CPU and virtual hardware, then hands off to an available kernel image.")}</p></li>
              <li><span>02</span><strong>{t("커널", "Kernel")}</strong><p>{t("메모리와 장치를 준비하고 root filesystem을 연 뒤 init을 실행합니다.", "Prepares memory and devices, opens the root filesystem, then launches init.")}</p></li>
              <li><span>03</span><strong>init · PID 1</strong><p>{t("첫 사용자 공간 프로세스입니다. 이 고정 게스트에서는 BusyBox init이 직렬 /bin/sh를 직접 시작합니다.", "Runs as the first userspace process. In this fixed guest, BusyBox init starts serial /bin/sh directly.")}</p></li>
              <li><span>04</span><strong>{t("직렬 콘솔 셸", "Serial console shell")}</strong><p>{t("사용자의 명령을 읽고 다음 챕터에서 만날 자식 프로세스를 실행합니다. 일반 배포판은 중간에 getty나 로그인 단계를 둘 수 있습니다.", "Reads user commands and launches the child processes explored in the next chapter. A general distribution may insert getty or login steps.")}</p></li>
            </ol>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("커널이 떴다 ≠ 시스템이 준비됐다", "Kernel running ≠ system ready")}</strong>
                <p>{t("커널 로그가 보여도 rootfs, init 또는 콘솔 셸 경계에서 멈출 수 있습니다. 이 모델의 정상 프롬프트는 네 경계를 통과했다는 마지막 표식입니다. 일반 Linux의 initramfs·복구 프롬프트는 정상 부팅 완료를 뜻하지 않을 수 있습니다. init은 커널의 일부도, 언제나 systemd인 것도 아닙니다.", "A visible kernel log can still be followed by a failure at rootfs, init, or the console shell. This model's expected prompt is the final marker that its four boundaries passed; an initramfs or rescue prompt on a general Linux system may not mean normal boot completed. Init is neither part of the kernel nor always systemd.")}</p>
              </div>
            </div>
          </section>

          <div id="boot-lab">
            <LinuxBootSequenceLab onCompletionChange={setBootLabComplete} />
          </div>

          <section className="article-section" id="diagnose">
            <div className="margin-label">04 — DIAGNOSE</div>
            <h2>{t("오류 문장보다 마지막 성공 표식을 먼저 찾습니다", "Find the last good marker before reading the error sentence")}</h2>
            <p>
              {t(
                "부팅 로그가 길어도 질문은 작습니다. 마지막으로 성공한 주체가 누구인지 찾으면 원인이 있을 수 없는 앞 단계와 아직 시작하지 못한 뒷 단계를 동시에 지울 수 있습니다. 아래 로그는 정확한 게스트 캡처가 아니라 경계를 연습하기 위한 결정론적 교육 모델입니다.",
                "Even a long boot log reduces to one small question: who succeeded last? That marker rules out earlier stages and tells you which later stages never began. The snippets below are deterministic teaching models, not claimed verbatim captures from the guest image.",
              )}
            </p>
            <LinuxBootFailureLab onCompletionChange={setDiagnosticsComplete} />
          </section>

          <section className="article-section linux-real-bridge" id="real-kernel">
            <div className="margin-label">05 — REAL KERNEL · OPTIONAL</div>
            <h2>{t("선택 심화에서 실제 x86 Linux 부팅 표식과 비교하세요", "Optionally compare the model with markers from a real x86 Linux boot")}</h2>
            <p>
              {t(
                "아래 v86 런타임은 32비트 x86 PC를 에뮬레이션하고 Buildroot 커널을 직렬 콘솔로 부팅합니다. 처음 시작할 때 외부 v86 데모 부팅 자산 약 14MB를 내려받으므로 필수 완료 조건과 분리했습니다. 네트워크나 WebAssembly가 실패해도 앞의 두 활동과 이해 확인은 그대로 완료할 수 있습니다.",
                "The v86 runtime below emulates a 32-bit x86 PC and boots a Buildroot kernel into a serial console. Its first run downloads about 14 MB of external v86 demo boot assets, so it is separate from required completion. The two activities and concept check remain fully usable if the network or WebAssembly fails.",
              )}
            </p>
            <div className="boot-observation-commands">
              <article><code>uname -a</code><p>{t("실행 중인 커널의 식별 정보", "Identity of the running kernel")}</p></article>
              <article><code>cat /proc/cmdline</code><p>{t("커널이 받은 시작 인자", "Startup arguments received by the kernel")}</p></article>
              <article><code>mount</code><p>{t("현재 열린 root filesystem과 mount 상태", "The mounted root filesystem and mount state")}</p></article>
              <article><code>ps</code><p>{t("PID 1과 셸의 프로세스 관계", "The process relationship between PID 1 and the shell")}</p></article>
            </div>
            <div className="linux-v86-section boot-v86-embed">
              <V86LinuxTerminal locale={locale} fallbackHref="#diagnose" />
            </div>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">06 — TRANSFER</div>
            <h2>{t("프롬프트 다음에는 프로세스 트리가 보입니다", "After the prompt comes a process tree")}</h2>
            <p>
              {t(
                "부팅이 끝나면 경계는 사라지지 않고 부모·자식 관계로 남습니다. 아래 표에서 프롬프트보다 먼저 존재한 프로세스와 다음 명령의 부모를 예측해 보세요. 시그널과 종료 규칙은 다음 챕터에서 직접 조작합니다.",
                "After boot, the handoffs remain visible as parent-child relationships. Predict which process existed before the prompt and which process will parent the next command. You will manipulate signals and termination rules in the next chapter.",
              )}
            </p>
            <pre className="boot-process-preview" aria-label={t("고정 게스트 부팅 뒤 프로세스 트리", "Process tree after boot in the fixed guest")}>{`PID  PPID  COMMAND\n  1     0  init\n 42     1  sh\n 73    42  ps`}</pre>
            <details className="boot-transfer-answer">
              <summary>{t("예측 확인", "Check prediction")}</summary>
              <p>{t("이 고정 게스트에서는 init(PID 1)이 직렬 sh(PID 42)를 직접 시작했습니다. 따라서 이 셸에서 실행한 ps(PID 73)는 sh를 부모로 갖습니다. 일반 배포판에서는 그 사이에 getty나 로그인 프로세스가 보일 수 있습니다.", "In this fixed guest, init (PID 1) started the serial sh (PID 42) directly, so ps (PID 73), launched from that shell, has sh as its parent. A general distribution may show getty or login processes in between.")}</p>
            </details>
          </section>

          <section className="article-section" id="check">
            <div className="margin-label">07 — CHECK</div>
            <LinuxBootConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHAPTER COMPLETE</p>
            <h2>{t("이제 이 모델의 정상 프롬프트를 마지막 부팅 표식으로 읽을 수 있습니다", "You can now read this model's expected prompt as its final boot marker")}</h2>
            <p>
              {t(
                "실패한 인계를 설정으로 복구하고, 로그의 마지막 성공 표식으로 장애를 진단하고, 커널·init·셸의 책임을 설명하면 이 챕터의 목표에 도달했습니다.",
                "You have reached the goal when you can repair a failed handoff through configuration, diagnose logs from their last good marker, and explain the separate responsibilities of the kernel, init, and shell.",
              )}
            </p>
            <div className="boot-completion-checklist" role="status" aria-live="polite">
              <span className={bootLabComplete ? "is-complete" : undefined}>{bootLabComplete ? "✓" : "○"} {t("부팅 계약 실습", "Boot contract lab")}</span>
              <span className={diagnosticsComplete ? "is-complete" : undefined}>{diagnosticsComplete ? "✓" : "○"} {t("장애 진단 4개", "Four failure diagnoses")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 4문제", "Four concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="boot-to-shell"
              canComplete={canComplete}
              lockedMessage={t(
                "부팅 계약 실습, 장애 진단 네 사건과 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.",
                "Finish the boot contract lab, all four failure incidents, and all five concept questions to complete the chapter.",
              )}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            <Link
              to="/curricula/$curriculumSlug/chapters/$chapterSlug"
              params={{ curriculumSlug: LINUX_CURRICULUM_SLUG, chapterSlug: "shell-and-filesystem" }}
              search={isKo ? {} : { lang: "en" }}
            >
              ← {t("이전: 셸에서 첫 파일까지", "Previous: From the Shell to Your First File")}
            </Link>
            <span>
              {t("다음: 프로세스와 시그널", "Next: Processes and Signals")} <small>{t("준비 중", "Coming soon")}</small>
            </span>
          </nav>
        </article>
      </div>
    </main>
  );
}

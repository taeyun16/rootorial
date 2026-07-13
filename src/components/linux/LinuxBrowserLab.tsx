import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useLocale } from "../../features/localization/localization";
import { AuthControls } from "../AuthControls";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { RootorialMark } from "../RootorialMark";
import { LinuxShellWorkspace } from "./LinuxShellWorkspace";
import { V86LinuxTerminal } from "./V86LinuxTerminal";

const copy = {
  ko: {
    home: "Rootorial 홈",
    back: "커리큘럼 홈",
    navLab: "셸 실습",
    navBoot: "실제 부팅",
    eyebrow: "LINUX SYSTEMS · RUNTIME EXPERIMENT 01",
    titleLead: "Linux를",
    titleEm: "브라우저 안에서",
    titleTail: "바닥부터",
    summary: "설치 없이 경로와 파일을 직접 바꾸고, 필요할 때는 BIOS부터 실제 Linux 커널이 올라오는 과정까지 관찰합니다. 두 실행 환경의 차이도 숨기지 않습니다.",
    startShell: "셸부터 실습하기",
    seeBoot: "실제 부팅 보기",
    capability: "BROWSER CAPABILITY",
    checking: "확인 중",
    available: "사용 가능",
    unavailable: "지원 안 됨",
    cores: "논리 코어",
    noInstall: "설치 없음",
    pipelineLabel: "브라우저에서 BusyBox 셸까지의 부팅 단계",
    verdict: "FEASIBILITY VERDICT",
    verdictTitle: "가능합니다. 다만 목적에 따라 런타임을 나눠야 합니다.",
    verdictSummary: "커널 부팅은 v86, 반복 가능한 경로·파일 수업은 작은 교육용 모델이 더 적합합니다. 현대적인 x86-64 개발 환경 전체를 브라우저에 옮기는 일은 후속 실험으로 남깁니다.",
    verdictCards: [
      ["실제 커널", "가능", "v86가 BIOS와 32비트 x86 하드웨어를 에뮬레이션해 Buildroot Linux를 부팅합니다."],
      ["파일·셸 수업", "적합", "결정적인 가상 파일시스템은 빠르게 초기화되고 과제 상태를 정확히 판정할 수 있습니다."],
      ["완전한 개발 VM", "후속", "x86-64, 패키지 설치, 네트워크까지 포함하면 자산 크기와 격리 정책을 별도로 설계해야 합니다."],
    ],
    pipeline: ["브라우저", "v86 WebAssembly", "가상 x86 PC", "BIOS", "Linux 커널", "BusyBox 셸"],
    simulatorEyebrow: "GUIDED SHELL · DETERMINISTIC MODEL",
    simulatorTitle: "경로가 움직이는 규칙부터 익히기",
    simulatorSummary: "이 터미널은 실제 커널이 아니라 수업을 위해 만든 인메모리 모델입니다. 명령 결과는 Linux와 닮았지만, 현재 디렉터리와 파일 트리가 어떻게 변하는지 즉시 나란히 볼 수 있습니다.",
    simulatorBadge: "교육용 시뮬레이터 · 실제 Linux 아님",
    reset: "처음 상태로",
    promptLabel: "교육용 Linux 명령 입력",
    run: "실행",
    placeholder: "명령을 입력하세요",
    welcome: "Rootorial 셸 시뮬레이터\n지원되는 학습 명령은 `help`로 확인하세요.",
    commandCompleted: "명령 완료",
    commandFailed: "명령 실패",
    examples: "명령 예시",
    tasks: "첫 번째 실습",
    taskSummary: "경로를 확인하고, 설정 파일을 읽고, 내 디렉터리와 메모를 만드세요.",
    taskItems: [
      ["현재 위치 확인", "pwd"],
      ["배포판 정보 읽기", "cat /etc/os-release"],
      ["실습 디렉터리 만들기", "mkdir -p lab"],
      ["경로 규칙 기록하기", "echo \"absolute paths start at /\" > lab/notes.txt"],
    ],
    completed: "완료",
    taskProgress: "개 과제 완료",
    filesystem: "가상 파일시스템",
    filesystemSummary: "명령을 실행할 때마다 같은 상태에서 갱신됩니다.",
    file: "파일",
    directory: "디렉터리",
    emptyFile: "빈 파일",
    selectEntry: "파일을 선택하면 내용을 볼 수 있습니다.",
    limitations: "EXPERIMENT NOTES",
    limitationsTitle: "이번 실험이 증명하는 것과 아직 남은 것",
    notes: [
      ["증명됨", "브라우저에서 BIOS → 커널 → init → 셸 흐름과 직렬 명령 입력을 실행할 수 있습니다."],
      ["의도적 분리", "빠른 반복 학습은 커널 VM이 아니라 결정적인 셸 모델을 사용합니다."],
      ["다음 판단", "자체 Buildroot 이미지, 체크섬·라이선스 고지, 영속 디스크와 격리된 배포 origin을 결정해야 합니다."],
    ],
  },
  en: {
    home: "Rootorial home",
    back: "Curriculum home",
    navLab: "Shell lab",
    navBoot: "Real boot",
    eyebrow: "LINUX SYSTEMS · RUNTIME EXPERIMENT 01",
    titleLead: "Linux",
    titleEm: "inside the browser",
    titleTail: "from the ground up",
    summary: "Change paths and files without installing anything, then observe a real Linux kernel come up from the BIOS when you need the whole machine. The two environments are labeled honestly.",
    startShell: "Start with the shell",
    seeBoot: "See the real boot",
    capability: "BROWSER CAPABILITY",
    checking: "Checking",
    available: "Available",
    unavailable: "Unavailable",
    cores: "logical cores",
    noInstall: "No install",
    pipelineLabel: "Boot stages from the browser to the BusyBox shell",
    verdict: "FEASIBILITY VERDICT",
    verdictTitle: "It works, but the runtime should match the learning goal.",
    verdictSummary: "v86 is the right layer for kernel boot, while a small teaching model is better for repeatable path and file lessons. A complete modern x86-64 development environment remains a later experiment.",
    verdictCards: [
      ["Real kernel", "Feasible", "v86 emulates a BIOS and 32-bit x86 hardware to boot Buildroot Linux."],
      ["File and shell lessons", "Good fit", "A deterministic virtual filesystem resets quickly and makes task completion observable."],
      ["Full development VM", "Next", "x86-64, package installs, and networking need a separate asset and isolation design."],
    ],
    pipeline: ["Browser", "v86 WebAssembly", "Virtual x86 PC", "BIOS", "Linux kernel", "BusyBox shell"],
    simulatorEyebrow: "GUIDED SHELL · DETERMINISTIC MODEL",
    simulatorTitle: "Learn the rules that move paths first",
    simulatorSummary: "This terminal is an in-memory teaching model, not a real kernel. Its commands resemble Linux, while the current directory and file tree remain visible beside every change.",
    simulatorBadge: "Teaching simulator · not real Linux",
    reset: "Reset state",
    promptLabel: "Teaching Linux command",
    run: "Run",
    placeholder: "Enter a command",
    welcome: "Rootorial shell simulator\nType `help` to see the supported learning commands.",
    commandCompleted: "Command completed",
    commandFailed: "Command failed",
    examples: "Command examples",
    tasks: "First lab",
    taskSummary: "Inspect your path, read system information, then create a directory and a note.",
    taskItems: [
      ["Check the current path", "pwd"],
      ["Read distribution info", "cat /etc/os-release"],
      ["Create a lab directory", "mkdir -p lab"],
      ["Record the path rule", "echo \"absolute paths start at /\" > lab/notes.txt"],
    ],
    completed: "Done",
    taskProgress: "tasks complete",
    filesystem: "Virtual filesystem",
    filesystemSummary: "It updates from the same state after every command.",
    file: "File",
    directory: "Directory",
    emptyFile: "Empty file",
    selectEntry: "Select a file to inspect its contents.",
    limitations: "EXPERIMENT NOTES",
    limitationsTitle: "What this experiment proves and what remains",
    notes: [
      ["Proven", "A browser can run the BIOS → kernel → init → shell path and accept serial commands."],
      ["Split on purpose", "Fast repeatable practice uses the deterministic shell model instead of the kernel VM."],
      ["Next decision", "Choose a first-party Buildroot image, checksum and license notices, persistent disks, and an isolated deployment origin."],
    ],
  },
} as const;

export function LinuxBrowserLab() {
  const { locale } = useLocale();
  const c = copy[locale];
  const [wasmSupported, setWasmSupported] = useState<boolean | null>(null);
  const [logicalCores, setLogicalCores] = useState<number | null>(null);

  useEffect(() => {
    setWasmSupported(typeof WebAssembly !== "undefined");
    setLogicalCores(navigator.hardwareConcurrency || null);
  }, []);

  return (
    <div className="site-shell linux-lab-shell">
      <header className="topbar">
        <Link className="wordmark" to="/" search={locale === "en" ? { lang: "en" } : {}} aria-label={c.home}>
          <RootorialMark className="wordmark-mark" />
          <span className="wordmark-name">Rootorial</span>
        </Link>
        <nav className="topnav" aria-label={locale === "ko" ? "Linux 실험 메뉴" : "Linux experiment navigation"}>
          <Link to="/" search={locale === "en" ? { lang: "en" } : {}}>{c.back}</Link>
          <a href="#shell-lab">{c.navLab}</a>
          <a href="#real-linux">{c.navBoot}</a>
          <LanguageSwitcher />
          <AuthControls />
        </nav>
      </header>

      <main>
        <section className="linux-lab-hero" aria-labelledby="linux-lab-title">
          <div className="linux-lab-hero-copy">
            <p className="eyebrow">{c.eyebrow}</p>
            <h1 id="linux-lab-title">{c.titleLead}<br /><em>{c.titleEm}</em><br />{c.titleTail}</h1>
            <p>{c.summary}</p>
            <div className="hero-actions">
              <a className="button button-primary" href="#shell-lab">{c.startShell} <span aria-hidden="true">↓</span></a>
              <a className="text-link" href="#real-linux">{c.seeBoot}</a>
            </div>
          </div>
          <aside className="linux-capability-card" aria-label={c.capability}>
            <p className="section-index">{c.capability}</p>
            <dl>
              <div><dt>WebAssembly</dt><dd className={wasmSupported === false ? "is-unavailable" : "is-available"}>{wasmSupported === null ? c.checking : wasmSupported ? c.available : c.unavailable}</dd></div>
              <div><dt>CPU</dt><dd>{logicalCores ? `${logicalCores} ${c.cores}` : c.checking}</dd></div>
              <div><dt>Runtime</dt><dd>{c.noInstall}</dd></div>
            </dl>
            <div className="linux-boot-pipeline" aria-label={c.pipelineLabel}>
              {c.pipeline.map((step, index) => (
                <div key={step}><span>{String(index + 1).padStart(2, "0")}</span><strong>{step}</strong></div>
              ))}
            </div>
          </aside>
        </section>

        <section className="linux-verdict" aria-labelledby="linux-verdict-title">
          <div className="section-heading">
            <div><p className="section-index">{c.verdict}</p><h2 id="linux-verdict-title">{c.verdictTitle}</h2></div>
            <p>{c.verdictSummary}</p>
          </div>
          <div className="linux-verdict-grid">
            {c.verdictCards.map(([title, state, body], index) => (
              <article key={title}><span>{String(index + 1).padStart(2, "0")}</span><strong>{state}</strong><h3>{title}</h3><p>{body}</p></article>
            ))}
          </div>
        </section>

        <LinuxShellWorkspace />

        <div id="real-linux" className="linux-v86-section">
          <V86LinuxTerminal locale={locale} />
        </div>

        <section className="linux-experiment-notes" aria-labelledby="linux-notes-title">
          <p className="section-index">{c.limitations}</p>
          <h2 id="linux-notes-title">{c.limitationsTitle}</h2>
          <div>{c.notes.map(([label, body]) => <article key={label}><strong>{label}</strong><p>{body}</p></article>)}</div>
        </section>
      </main>
    </div>
  );
}

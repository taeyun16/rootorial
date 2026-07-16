import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteTinyLinuxChapter } from "../../features/linux-runtime/assemble-a-tiny-linux";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxTinySystemAssemblyLab } from "./LinuxTinySystemAssemblyLab";
import { LinuxTinySystemConceptCheck } from "./LinuxTinySystemConceptCheck";
import { LinuxTinySystemIncidentLab } from "./LinuxTinySystemIncidentLab";
import { V86LinuxTerminal } from "./V86LinuxTerminal";

const tocItems = {
  ko: [
    { id: "artifact-runtime", label: "artifact와 runtime" },
    { id: "pid-one-order", label: "PID 1 의존성 순서" },
    { id: "service-path", label: "reportd의 전체 경로" },
    { id: "evidence", label: "경계별 readiness 증거" },
    { id: "assembly-lab", label: "필수 시스템 조립 실습" },
    { id: "incidents", label: "commissioning 사건 진단" },
    { id: "real-linux", label: "고정 guest 선택 관찰" },
    { id: "transfer", label: "새 service로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "artifact-runtime", label: "Artifacts and runtime" },
    { id: "pid-one-order", label: "PID 1 dependency order" },
    { id: "service-path", label: "The complete reportd path" },
    { id: "evidence", label: "Evidence at each boundary" },
    { id: "assembly-lab", label: "Required system assembly lab" },
    { id: "incidents", label: "Diagnose commissioning incidents" },
    { id: "real-linux", label: "Optional fixed-guest observation" },
    { id: "transfer", label: "Transfer to a new service" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxTinySystemChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "assemble-a-tiny-linux");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [assemblyComplete, setAssemblyComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteTinyLinuxChapter({
    assemblyLabComplete: assemblyComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const previousPreviewHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/networking-from-a-packet${isKo ? "" : "?lang=en"}`;
  const curriculumPreviewHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-tiny-system-chapter-shell">
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
          <header className="lesson-hero linux-lesson-hero linux-tiny-system-hero">
            <p className="eyebrow">
              ARTIFACT → BOOT → PID 1 → FILE → SOCKET → RECV · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}
            </p>
            <div className="lesson-number">08</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>앞선 일곱 장의 층을 한 번에 다시 외우지 않습니다. <em>kernel image와 rootfs artifact</em>가 어떤 runtime state를 만들고, PID 1이 그 의존성을 어떤 순서로 조립해야 report 파일의 byte가 remote <code>recv</code>까지 가는지 하나의 계약 사슬로 연결합니다.</>
              ) : (
                <>This chapter does not ask you to memorize all seven earlier layers again. Instead, connect the <em>kernel image and rootfs artifacts</em> to the runtime state they create, then order PID 1&apos;s dependencies so bytes from the report file reach remote <code>recv</code>.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("kernel image·rootfs의 build artifact와 PID·mount·route·listener의 runtime state를 구분할 수 있다.", "Distinguish kernel-image and rootfs build artifacts from runtime state such as PIDs, mounts, routes, and listeners.")}</li>
                <li>{t("firmware → kernel → rootfs → PID 1 → mount·network → service 인계를 의존성 순서로 조립하고 첫 실패 경계를 찾을 수 있다.", "Assemble firmware → kernel → rootfs → PID 1 → mount and network → service in dependency order and locate the first failed boundary.")}</li>
                <li>{t("non-root reportd가 executable을 map하고 /srv/report.txt를 읽어 listener·accepted fd·send·remote recv까지 가는 경로를 추적할 수 있다.", "Trace a non-root reportd process as it maps its executable, reads /srv/report.txt, and crosses listener, accepted-fd, send, and remote-recv boundaries.")}</li>
                <li>{t("boot log, ps, mount, credentials, ip, ss와 event trace가 각각 어디까지 readiness를 증명하는지 구분할 수 있다.", "Distinguish how far boot logs, ps, mounts, credentials, ip, ss, and event traces establish readiness.")}</li>
                <li>{t("이미 통과한 계약과 최소 권한을 보존하면서 cross-layer 장애의 최초 원인만 수리할 수 있다.", "Repair only the earliest cause of a cross-layer failure while preserving passed contracts and least privilege.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="artifact-runtime">
            <div className="margin-label">01 — BUILD ARTIFACT ≠ RUNTIME STATE</div>
            <h2>{t("이미지에 넣는 것과 부팅 뒤 만드는 것을 먼저 나눕니다", "First separate what enters an image from what is created after boot")}</h2>
            <p>
              {t(
                "kernel config는 어떤 kernel 기능과 driver가 image에 들어가는지 정합니다. 이 fixture의 initramfs manifest는 /init, /bin/sh, reportd, ip 같은 userspace binary와 설정·data 파일을 정합니다. 반면 PID, 열린 fd, mount table, interface address, route와 listener는 image 안에 멈춰 있는 상태가 아니라 이 artifact들이 실행되면서 매 부팅 새로 만들어지는 상태입니다.",
                "Kernel configuration chooses the kernel features and drivers placed in the image. This fixture's initramfs manifest chooses userspace binaries such as /init, /bin/sh, reportd, and ip, plus configuration and data files. PIDs, open fds, mount tables, interface addresses, routes, and listeners are not frozen inside the image; the artifacts recreate that state on every boot.",
              )}
            </p>
            <div className="tiny-system-contract-grid" role="group" aria-label={t("build artifact와 runtime state 비교", "Build artifact and runtime state comparison")}>
              <article>
                <span>BUILD · KERNEL</span>
                <strong>console · rootfs · procfs · eth0 driver</strong>
                <p>{t("kernel image에 포함할 capability", "Capabilities included in the kernel image")}</p>
              </article>
              <article>
                <span>BUILD · ROOTFS</span>
                <strong>/init · reportd · /srv/report.txt</strong>
                <p>{t("부팅 전에 존재해야 할 userspace 파일", "Userspace files that must exist before boot")}</p>
              </article>
              <article>
                <span>RUNTIME · PID 1</span>
                <strong>mount · credentials · address · route</strong>
                <p>{t("init policy가 순서대로 만드는 상태", "State created in order by init policy")}</p>
              </article>
              <article>
                <span>RUNTIME · REPORTD</span>
                <strong>PID · mapping · fd · listener · recv</strong>
                <p>{t("service 실행과 요청이 남기는 증거", "Evidence left by service execution and a request")}</p>
              </article>
            </div>
            <div className="concept-callout tiny-system-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("부팅의 마지막 성공 표식, PID 1과 자식 process, credentials와 path search, file-backed mapping, mount·inode·regular-file fd, socket·route·listener·recv 경계를 사용합니다. 각 층의 세부 계산은 다시 풀지 않고 조립 계약의 입력으로 재사용합니다.", "Use the last good boot marker, PID 1 and child processes, credentials and path search, file-backed mappings, mounts, inodes, regular-file fds, and socket, route, listener, and recv boundaries. Their detailed calculations are reused as assembly inputs rather than retaught.")}</p>
                {preview ? (
                  <a href={previousPreviewHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a>
                ) : (
                  <span>{t("이전 챕터는 관리자 드래프트 미리보기에서 연결됩니다.", "The previous chapter is linked from the admin draft preview.")}</span>
                )}
              </div>
            </div>
          </section>

          <section className="article-section" id="pid-one-order">
            <div className="margin-label">02 — PID 1 · ORDERED DEPENDENCIES</div>
            <h2>{t("PID 1은 존재하는 부품을 service-ready 상태로 바꿉니다", "PID 1 turns present parts into service-ready state")}</h2>
            <p>
              {t(
                "kernel이 /init을 실행했다는 사실은 userspace 시작만 증명합니다. 이 fixture의 PID 1은 /proc와 /srv를 준비하고, eth0을 up으로 바꾸고 10.0.0.20/24와 default via 10.0.0.1을 설정한 뒤, UID 1100·GID 4000인 reportd 자식을 fork·exec합니다. 앞 단계가 실패하면 뒷 단계의 오류를 넓게 고치지 않고 그 최초 경계에서 멈춥니다.",
                "The kernel executing /init establishes only the start of userspace. In this fixture, PID 1 prepares /proc and /srv, brings eth0 up, configures 10.0.0.20/24 and default via 10.0.0.1, then forks and execs reportd as UID 1100 and GID 4000. If an earlier stage fails, the system stops at that first boundary instead of broadly patching later symptoms.",
              )}
            </p>
            <ol className="tiny-system-boot-pipeline">
              <li><span>01</span><strong>kernel → rootfs</strong><p>{t("initramfs를 풀고 /init을 찾습니다.", "Unpack the initramfs and locate /init.")}</p></li>
              <li><span>02</span><strong>PID 1 → mounts</strong><p>{t("/proc와 /srv의 namespace를 준비합니다.", "Prepare /proc and the /srv namespace.")}</p></li>
              <li><span>03</span><strong>PID 1 → network</strong><p>{t("driver가 만든 eth0에 link·address·route 상태를 더합니다.", "Add link, address, and route state to eth0 created by the driver.")}</p></li>
              <li><span>04</span><strong>fork → exec reportd</strong><p>{t("non-root credentials와 stdio를 가진 service process를 만듭니다.", "Create the service process with non-root credentials and stdio.")}</p></li>
              <li><span>05</span><strong>bind → listen</strong><p>{t("0.0.0.0:8080 listener를 만들되 아직 application delivery라고 부르지 않습니다.", "Create the 0.0.0.0:8080 listener without calling it application delivery yet.")}</p></li>
            </ol>
            <div className="concept-callout misconception-callout">
              <span className="callout-mark">!</span>
              <div>
                <strong>{t("작다 ≠ 파일 수가 가장 적다", "Tiny does not mean the fewest possible files")}</strong>
                <p>{t("이 챕터에서 최소 시스템은 목표 계약을 만족하는 가장 작은 충분한 집합입니다. /init이나 필요한 driver·binary·data를 지워 boot를 짧게 만드는 것은 최적화가 아니라 계약 위반입니다. 반대로 권한 오류를 root나 0777로 덮는 것도 불필요한 capability를 추가합니다.", "A minimal system here is the smallest sufficient set that satisfies the target contracts. Removing /init or a required driver, binary, or data file is a contract violation, not an optimization. Likewise, masking permission failures with root or 0777 adds unnecessary capability.")}</p>
              </div>
            </div>
          </section>

          <section className="article-section" id="service-path">
            <div className="margin-label">03 — EXECUTABLE PAGE → FILE BYTE → SOCKET BYTE</div>
            <h2>{t("reportd 한 process에서 memory, storage와 network가 만납니다", "Memory, storage, and networking meet inside one reportd process")}</h2>
            <p>
              {t(
                "exec는 rootfs의 /usr/bin/reportd를 같은 자식 PID의 새 program image로 바꾸고 file-backed mapping을 만듭니다. 첫 instruction 접근은 그 executable byte를 가져오는 page fault를 만들 수 있습니다. 이어 reportd의 credentials가 /srv 경로를 탐색하고 report.txt의 group-read를 통과하면 regular-file fd에서 user buffer로 byte를 읽습니다. socket fd로 넘긴 byte는 listener가 accept한 connected fd와 remote recv라는 별도 경계를 지나갑니다.",
                "Exec replaces the child PID's program image with /usr/bin/reportd from the rootfs and creates file-backed mappings. First instruction access may fault while fetching those executable bytes. Reportd's credentials then traverse /srv and, after passing group-read on report.txt, read bytes from a regular-file fd into a user buffer. Passing them to a socket fd begins separate listener, accepted-connection, and remote-recv boundaries.",
              )}
            </p>
            <div className="tiny-system-service-path" role="group" aria-label={t("reportd executable에서 remote recv까지의 경로", "Path from the reportd executable to remote recv")}>
              <span><small>exec</small><strong>/usr/bin/reportd</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>memory</small><strong>file-backed page</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>storage</small><strong>report.txt · regular fd</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>network</small><strong>listener · accepted fd</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>peer</small><strong>recv(report bytes)</strong></span>
            </div>
            <details className="tiny-system-prediction-answer">
              <summary>{t("예측: kernel과 shell이 정상이고 reportd PID도 보이면 remote service까지 준비됐을까요?", "Predict: if the kernel and shell are healthy and a reportd PID is visible, is the remote service ready?")}</summary>
              <p>{t("아닙니다. exec 성공 뒤에도 data mount·path permission·file read·address·route·listener·accepted connection·send·peer recv가 각각 실패할 수 있습니다. 다음 표식 하나가 아니라 ordered evidence 전체로 판정합니다.", "No. Even after exec succeeds, the data mount, path permission, file read, address, route, listener, accepted connection, send, and peer recv can fail independently. Grade the ordered evidence, not the next single marker.")}</p>
            </details>
          </section>

          <section className="article-section" id="evidence">
            <div className="margin-label">04 — CLAIM → PROBE → BOUNDARY</div>
            <h2>{t("한 명령의 성공을 전체 시스템 readiness로 확대하지 않습니다", "Do not expand one successful command into whole-system readiness")}</h2>
            <p>{t("probe는 관찰한 경계까지만 주장할 수 있습니다. 아래 fixture에서 같은 target을 여러 독립 증거로 확인해야 ‘reportd가 report byte를 remote application에 전달했다’고 말할 수 있습니다.", "A probe supports a claim only through the boundary it observes. In this fixture, several independent pieces of evidence are required before claiming that reportd delivered report bytes to the remote application.")}</p>
            <div className="tiny-system-evidence-grid">
              <article><code>boot log · ps</code><strong>{t("kernel · PID 1 · child", "kernel · PID 1 · child")}</strong><p>{t("어디까지 실행됐는가", "How far execution progressed")}</p></article>
              <article><code>mount · credentials · trace</code><strong>{t("namespace · 권한 · read", "namespace · permission · read")}</strong><p>{t("report byte를 소유했는가", "Whether reportd acquired the report bytes")}</p></article>
              <article><code>ip address · ip route get</code><strong>{t("link · address · route", "link · address · route")}</strong><p>{t("kernel network 경로가 있는가", "Whether the kernel has a network path")}</p></article>
              <article><code>ss -lnt · ss -tn</code><strong>{t("listener · connection", "listener · connection")}</strong><p>{t("port와 accepted flow가 있는가", "Whether the port and accepted flow exist")}</p></article>
              <article><code>reportd send · peer recv</code><strong>{t("application 경계", "application boundary")}</strong><p>{t("remote process가 byte를 인수했는가", "Whether the remote process consumed the bytes")}</p></article>
            </div>
          </section>

          <div id="assembly-lab">
            <LinuxTinySystemAssemblyLab onCompletionChange={setAssemblyComplete} />
          </div>

          <section className="article-section" id="incidents">
            <div className="margin-label">06 — CROSS-LAYER COMMISSIONING</div>
            <h2>{t("증상보다 먼저 깨진 계약을 수리합니다", "Repair the first broken contract, not the broadest symptom")}</h2>
            <p>
              {t(
                "다음 별도 활동은 잘못된 init handoff, PID 1의 zombie supervision, report file의 group-read, 원격 listener와 fd 경계를 독립 fixture로 판정합니다. last-good marker, 실패 경계, 최소 repair와 검증 probe가 같은 원인을 가리키고, repair를 적용한 전체 상태가 target을 만족해야 통과합니다. root 실행이나 0777처럼 더 넓은 우회는 성공으로 세지 않습니다.",
                "The separate activity grades a wrong init handoff, PID 1 zombie supervision, report-file group read, and remote-listener and fd boundaries as independent fixtures. The last-good marker, failed boundary, minimal repair, and verification probe must identify the same cause, and the repaired state must satisfy the target. Broad bypasses such as running as root or using 0777 do not count.",
              )}
            </p>
            <LinuxTinySystemIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section linux-real-bridge" id="real-linux">
            <div className="margin-label">07 — FIXED BUILDROOT GUEST · OPTIONAL</div>
            <h2>{t("v86에서는 실제 kernel 표식만 비교합니다", "Use v86 only to compare real kernel markers")}</h2>
            <p>
              {t(
                "아래 선택 심화는 외부의 고정 Buildroot boot image와 v86 자산 약 14MB를 내려받아 32-bit x86 guest를 직렬 shell까지 부팅합니다. 브라우저에서 이 챕터의 kernel config나 rootfs를 build하지 않습니다. v86의 emulated NIC는 보일 수 있지만 network relay/backend를 설정하지 않으므로 외부 경로는 없습니다. 따라서 uname·/proc/cmdline·mount·ps의 실제 표식을 비교할 수는 있지만 reportd network 경로나 필수 완료 증거로 사용하지 않습니다. WebAssembly나 network가 실패해도 두 결정론적 활동과 이해 확인은 그대로 완료할 수 있습니다.",
                "This optional extension downloads about 14 MB of external v86 assets and a fixed Buildroot boot image, then boots a 32-bit x86 guest to a serial shell. It does not build this chapter's kernel configuration or rootfs in the browser. An emulated NIC may be visible, but no network relay or backend is configured, so there is no external path. You can compare real markers from uname, /proc/cmdline, mount, and ps, but the run proves neither the reportd network path nor required completion. Both deterministic activities and the concept check remain fully usable if WebAssembly or the network fails.",
              )}
            </p>
            <div className="tiny-system-observation-commands">
              <article><code>uname -a</code><p>{t("고정 guest의 kernel·architecture", "Kernel and architecture of the fixed guest")}</p></article>
              <article><code>cat /proc/cmdline</code><p>{t("kernel 시작 인자와 serial console", "Kernel startup arguments and serial console")}</p></article>
              <article><code>mount</code><p>{t("현재 guest의 rootfs와 pseudo filesystem", "Rootfs and pseudo-filesystems in the current guest")}</p></article>
              <article><code>ps</code><p>{t("PID 1과 shell process", "PID 1 and the shell process")}</p></article>
            </div>
            <div className="linux-v86-section tiny-system-v86-embed">
              <V86LinuxTerminal locale={locale} fallbackHref="#assembly-lab" />
            </div>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER · NEW SERVICE CONTRACT</div>
            <h2>{t("같은 사다리를 처음 보는 metricsd에 적용하세요", "Apply the same ladder to an unfamiliar metricsd service")}</h2>
            <div className="tiny-system-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t("새 요구사항은 non-root metricsd가 /var/lib/metrics/current를 읽어 0.0.0.0:9100에서 제공하는 것입니다. (1) kernel/rootfs artifact에 있어야 할 항목, (2) PID 1의 mount·network·fork/exec 순서, (3) world write 없이 읽게 할 credentials와 mode, (4) boot log·ps·mount·ip·ss·service trace 중 각 readiness 주장을 검증할 probe를 한 줄씩 적으세요. 마지막으로 default route가 빠진 사건에서 이미 통과한 artifact·mount·permission 계약을 바꾸지 않고 한 가지 최소 repair만 제안하세요.", "A new requirement asks a non-root metricsd process to read /var/lib/metrics/current and serve it on 0.0.0.0:9100. Write one line each for (1) what belongs in the kernel and rootfs artifacts, (2) PID 1's mount, network, and fork/exec order, (3) credentials and modes that grant the read without world write, and (4) which probe among boot logs, ps, mount, ip, ss, and the service trace establishes each readiness claim. Finally, for an incident with a missing default route, propose one minimal repair without changing already-passed artifact, mount, or permission contracts.")}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">09 — CONCEPT CHECK · CURRICULUM CAPSTONE</div>
            <LinuxTinySystemConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="tiny-system-completion-checklist" role="status" aria-live="polite">
              <span className={assemblyComplete ? "is-complete" : undefined}>{assemblyComplete ? "✓" : "○"} {t("필수 시스템 조립 실습", "Required system assembly lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("cross-layer 사건 진단", "Cross-layer incident diagnosis")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("다섯 개념 확인", "Five concept checks")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="assemble-a-tiny-linux"
              canComplete={canComplete}
              lockedMessage={t(
                "필수 시스템 조립, 네 commissioning 사건과 다섯 개념 확인을 모두 완료하세요.",
                "Complete the required system assembly, all four commissioning incidents, and all five concept checks.",
              )}
            />
          </section>

          <section className="chapter-finish tiny-system-finish">
            <p className="eyebrow">LINUX SYSTEMS · ASSEMBLED</p>
            <h2>{t("이제 prompt가 아니라 증거 사슬로 작은 Linux를 설명할 수 있습니다", "You can now explain a tiny Linux system through an evidence chain, not a prompt")}</h2>
            <p>{t("kernel image와 rootfs에서 시작해 PID 1의 순서, non-root service의 file read와 network delivery까지 각 경계를 독립 상태와 probe로 연결했습니다. 이것이 이 커리큘럼에서 말하는 ‘바닥부터 조립’입니다.", "You connected kernel and rootfs artifacts to PID 1's order, then to a non-root service's file read and network delivery through independent state and probes. That is what assembling Linux from the ground up means in this curriculum.")}</p>
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? (
              <a href={previousPreviewHref}>← {t("이전: 패킷에서 소켓까지", "Previous: From Packets to Sockets")}</a>
            ) : (
              <span>← {t("이전: 패킷에서 소켓까지", "Previous: From Packets to Sockets")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>
            )}
            {preview ? (
              <a href={curriculumPreviewHref}>{t("Linux 시스템 커리큘럼 미리보기", "Preview the Linux Systems curriculum")} →</a>
            ) : (
              <Link to="/curricula/$curriculumSlug" params={{ curriculumSlug: LINUX_CURRICULUM_SLUG }} search={isKo ? {} : { lang: "en" }}>
                {t("Linux 시스템 커리큘럼으로", "Back to the Linux Systems curriculum")} →
              </Link>
            )}
          </nav>
        </article>
      </div>
    </main>
  );
}

import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteMemoryChapter } from "../../features/linux-runtime/memory-and-virtual-addresses";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxMemoryConceptCheck } from "./LinuxMemoryConceptCheck";
import { LinuxMemoryDebuggerLab } from "./LinuxMemoryDebuggerLab";
import { LinuxVirtualMemoryLab } from "./LinuxVirtualMemoryLab";

const tocItems = {
  ko: [
    { id: "address-space", label: "프로세스별 주소 공간" },
    { id: "regions", label: "stack·heap·mmap" },
    { id: "translation", label: "VPN·offset·PTE" },
    { id: "tlb-fault", label: "TLB와 page fault" },
    { id: "memory-lab", label: "필수 주소 변환 실습" },
    { id: "incidents", label: "메모리 사건 디버깅" },
    { id: "real-linux", label: "실제 Linux 관찰 경계" },
    { id: "transfer", label: "저장장치로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "address-space", label: "Per-process address spaces" },
    { id: "regions", label: "Stack, heap, and mmap" },
    { id: "translation", label: "VPN, offset, and PTE" },
    { id: "tlb-fault", label: "TLB and page faults" },
    { id: "memory-lab", label: "Required translation lab" },
    { id: "incidents", label: "Debug memory incidents" },
    { id: "real-linux", label: "Real Linux boundary" },
    { id: "transfer", label: "Transfer to storage" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxMemoryChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "memory-and-virtual-addresses");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [memoryLabComplete, setMemoryLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteMemoryChapter({
    memoryLabComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const previousHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/users-and-permissions${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-memory-chapter-shell">
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
          <span className="chapter-runtime-status"><span className="status-dot" aria-hidden="true" /> {chapter.runtime}</span>
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
          <header className="lesson-hero linux-lesson-hero linux-memory-hero">
            <p className="eyebrow">VA → VPN + OFFSET → PTE → FRAME · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">05</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>지난 장의 PID와 credentials는 <em>누가 접근하는가</em>를 정했습니다. 이제 같은 주소 숫자도 어느 프로세스가 요청했는지에 따라 다른 page table을 지나며, 커널은 그 mapping으로 격리와 의도적인 공유를 함께 만듭니다.</>
              ) : (
                <>The previous chapter's PID and credentials established <em>who is accessing</em>. Now the same address number can traverse a different page table depending on the requesting process, letting the kernel build both isolation and intentional sharing.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("/proc/<pid>/maps 행의 범위·rwx·p/s·pathname으로 stack, heap, anonymous와 file-backed mapping을 분류하고 mapping과 residency를 구분할 수 있다.", "Classify stack, heap, anonymous, and file-backed mappings from ranges, rwx, p/s, and pathnames in /proc/<pid>/maps while distinguishing mapping from residency.")}</li>
                <li>{t("4 KiB 교육 모델에서 VA를 VPN과 offset으로 나누고 프로세스별 PTE의 frame에 같은 offset을 결합할 수 있다.", "Split a VA into VPN and offset in the 4 KiB teaching model and combine the same offset with the frame in a process-specific PTE.")}</li>
                <li>{t("TLB hit·miss, page-table walk, present·permission 검사를 순서대로 추적하고 TLB miss 자체는 page fault가 아님을 설명할 수 있다.", "Trace TLB hits and misses, page-table walks, and present and permission checks, explaining why a TLB miss alone is not a page fault.")}</li>
                <li>{t("demand allocation과 COW처럼 복구 가능한 fault를 unmapped·protection fault와 구분하고, fork 뒤 첫 쓰기의 frame 변화를 예측할 수 있다.", "Distinguish resolvable demand-allocation and COW faults from unmapped and protection faults, and predict frame changes on the first write after fork.")}</li>
                <li>{t("stack·heap·mmap의 lifetime을 읽되 주소 성장 방향이나 allocator 구현을 보편 규칙으로 오해하지 않고 file-backed mapping을 다음 저장장치 계층으로 연결할 수 있다.", "Read stack, heap, and mmap lifetimes without treating address-growth direction or allocator internals as universal rules, then connect file-backed mappings to the next storage layer.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="address-space">
            <div className="margin-label">01 — PER-PROCESS ADDRESS SPACE</div>
            <h2>{t("주소 숫자는 PID의 주소 공간 안에서 해석됩니다", "An address number is interpreted inside a PID's address space")}</h2>
            <p>{t("프로그램의 load·store 명령은 가상 주소를 냅니다. CPU와 커널은 현재 프로세스의 page table을 사용해 그 주소를 물리 frame으로 번역합니다. 그래서 부모와 자식이 모두 0x4018을 출력해도 같은 물리 저장소라고 단정할 수 없습니다. 서로 다른 frame일 수도 있고, shared mapping이나 COW 첫 쓰기 전처럼 같은 frame을 의도적으로 가리킬 수도 있습니다.", "A program's load and store instructions produce virtual addresses. The CPU and kernel translate each address through the current process's page table into a physical frame. Therefore, a parent and child both printing 0x4018 does not prove identical physical storage. Their PTEs may point to different frames, or intentionally share one through a shared mapping or before the first COW write.")}</p>
            <div className="memory-address-space-figure" role="group" aria-label={t("같은 가상 주소의 프로세스별 번역", "Process-specific translation of the same virtual address")}>
              <article><span>PID 420</span><strong>VA 0x4018</strong><p>PTE[0x4] → F7</p></article>
              <span aria-hidden="true">≠ / =</span>
              <article><span>PID 421</span><strong>VA 0x4018</strong><p>PTE[0x4] → F7 {t("또는", "or")} F12</p></article>
              <span aria-hidden="true">→</span>
              <article><span>{t("물리 저장소", "PHYSICAL STORAGE")}</span><strong>{t("PTE가 결정", "PTE decides")}</strong><p>{t("주소 숫자만으로는 모름", "Not known from VA alone")}</p></article>
            </div>
            <div className="concept-callout memory-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("프로그램과 실행 중인 프로세스, fork로 생긴 부모·자식, PID와 프로세스 credentials를 이해하면 충분합니다. 이번 장은 각 프로세스에 독립적인 주소 번역 상태를 더합니다.", "It is enough to understand programs versus running processes, parent and child from fork, PIDs, and process credentials. This chapter adds independent address-translation state to each process.")}</p>
                {preview ? <a href={previousHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전 챕터는 관리자 드래프트 미리보기에서 연결됩니다.", "The previous chapter is linked from the admin draft preview.")}</span>}
              </div>
            </div>
            <details className="memory-prediction-answer">
              <summary>{t("예측: fork 직후 부모와 자식의 heap 주소와 값이 같다면 전체 heap이 이미 두 번 복사됐을까요?", "Predict: if parent and child heap addresses and values match immediately after fork, was the entire heap already copied twice?")}</summary>
              <p>{t("그렇지 않습니다. 각자는 독립 주소 공간을 가지지만 private page의 PTE가 같은 frame을 COW로 가리킬 수 있습니다. 첫 쓰기에서 해당 page만 새 frame으로 분리합니다.", "No. Each process has an independent address space, while private-page PTEs may point to the same frame through COW. The first write separates only that page into a new frame.")}</p>
            </details>
          </section>

          <section className="article-section" id="regions">
            <div className="margin-label">02 — VIRTUAL MEMORY AREAS</div>
            <h2>{t("maps는 가상 영역의 계약을 보여 줍니다", "maps shows contracts for virtual regions")}</h2>
            <p>{t("/proc/<pid>/maps의 각 행은 [start, end) 가상 범위와 read·write·execute, private/shared 계약, file offset과 pathname을 기록합니다. 아래 주소·page 크기·frame ID는 계산을 위한 교육 fixture이며 ASLR과 다양한 실제 page 크기를 생략합니다. 특히 maps에는 물리 frame 번호나 각 page의 현재 RAM residency가 없습니다.", "Each /proc/<pid>/maps row records a [start, end) virtual range, read/write/execute permissions, private/shared contract, file offset, and pathname. The addresses, page size, and frame IDs below are teaching fixtures for calculation; they omit ASLR and the range of real page sizes. Crucially, maps contains neither physical frame numbers nor each page's current RAM residency.")}</p>
            <div className="memory-maps-card">
              <pre aria-label={t("교육용 proc maps 예시", "Teaching proc maps example")}>{`00001000-00003000 r-xp 00000000 08:01 120 /opt/demo
00004000-00006000 rw-p 00000000 00:00   0 [heap]
00007000-00008000 rw-p 00000000 00:00   0 [stack]`}</pre>
              <dl>
                <div><dt>rwx</dt><dd>{t("VMA가 허용하는 접근 종류", "Access kinds permitted by the VMA")}</dd></div>
                <div><dt>p / s</dt><dd>{t("private COW 계약 / shared 계약", "Private-COW / shared contract")}</dd></div>
                <div><dt>offset · path</dt><dd>{t("file-backed byte 범위의 출발점", "Start of a file-backed byte range")}</dd></div>
                <div><dt>{t("표에 없음", "NOT SHOWN")}</dt><dd>{t("PTE·PFN·현재 residency", "PTE, PFN, or current residency")}</dd></div>
              </dl>
            </div>
            <div className="memory-region-grid">
              <article><span>stack</span><strong>{t("호출 lifetime", "Call lifetime")}</strong><p>{t("return 뒤 frame이 논리적으로 끝납니다. local이 항상 RAM의 stack에 놓인다고 가정하지 마세요.", "A frame logically ends after return. Do not assume every local necessarily resides on a RAM stack.")}</p></article>
              <article><span>heap</span><strong>{t("allocator lifetime", "Allocator lifetime")}</strong><p>{t("malloc/free가 관리하지만 brk와 anonymous mmap 사용은 allocator에 달려 있습니다. free가 즉시 VMA를 지운다는 보장도 없습니다.", "malloc/free manages it, but use of brk versus anonymous mmap depends on the allocator. free need not immediately remove a VMA.")}</p></article>
              <article><span>mmap</span><strong>{t("mapping lifetime", "Mapping lifetime")}</strong><p>{t("munmap 또는 프로세스 종료까지 유지되며 anonymous/file-backed, private/shared 계약을 명시합니다.", "It lasts until munmap or process exit and declares anonymous/file-backed and private/shared contracts.")}</p></article>
            </div>
          </section>

          <section className="article-section" id="translation">
            <div className="margin-label">03 — VPN + OFFSET → PTE → FRAME</div>
            <h2>{t("page table은 VPN만 바꾸고 offset은 보존합니다", "The page table replaces the VPN and preserves the offset")}</h2>
            <p>{t("이 장은 4 KiB=4096 byte page를 고정한 교육 모델입니다. 0x4018 ÷ 0x1000에서 VPN은 0x4, page 내부 offset은 0x018입니다. 현재 PID의 PTE[0x4]가 frame 7을 가리키면 물리 주소는 7×0x1000+0x018=0x7018입니다. 실제 architecture는 여러 page 크기와 다단계 page table을 사용할 수 있지만 이 분해 원리는 같습니다.", "This chapter fixes pages at 4 KiB=4096 bytes as a teaching model. Dividing 0x4018 by 0x1000 yields VPN 0x4 and in-page offset 0x018. If the current PID's PTE[0x4] points to frame 7, the physical address is 7×0x1000+0x018=0x7018. Real architectures can use multiple page sizes and multilevel page tables, but this decomposition remains the same.")}</p>
            <div className="memory-translation-equation" aria-label={t("가상 주소 0x4018 번역", "Translation of virtual address 0x4018")}>
              <span><small>VA</small><strong>0x4 | 018</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>PTE[VPN 0x4]</small><strong>frame 0x7 · r-- · COW</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>PA</small><strong>0x7 | 018</strong></span>
            </div>
            <p>{t("PTE는 frame뿐 아니라 present와 read/write/execute 권한도 가집니다. VMA가 rw-p여도 fork 직후 private page의 현재 PTE는 COW를 위해 write-protected일 수 있습니다. VMA 계약과 순간적인 PTE 상태를 같은 writable 값으로 합치지 않는 이유입니다.", "A PTE carries present and read/write/execute state in addition to the frame. Even when a VMA says rw-p, a private page's current PTE may be write-protected after fork to implement COW. That is why the VMA contract and momentary PTE state must not be collapsed into one writable value.")}</p>
          </section>

          <section className="article-section" id="tlb-fault">
            <div className="margin-label">04 — TLB · WALK · FAULT</div>
            <h2>{t("cache miss, page fault와 치명적 오류는 서로 다른 경계입니다", "Cache misses, page faults, and fatal errors are different boundaries")}</h2>
            <ol className="memory-access-pipeline">
              <li><span>01</span><strong>TLB lookup</strong><p>{t("translation cache hit이면 PTE 정보를 빠르게 재사용합니다. TLB는 데이터 cache가 아닙니다.", "A translation-cache hit reuses PTE information quickly. The TLB is not a data cache.")}</p></li>
              <li><span>02</span><strong>page-table walk</strong><p>{t("TLB miss이면 현재 프로세스의 page table에서 VPN을 찾습니다. present PTE라면 TLB를 채우고 계속할 수 있습니다.", "On a TLB miss, walk the current process's page table for the VPN. A present PTE can fill the TLB and continue.")}</p></li>
              <li><span>03</span><strong>present · permission</strong><p>{t("not-present 또는 허용되지 않은 write/execute라면 CPU가 page-fault exception을 커널에 전달합니다.", "A not-present entry or disallowed write/execute makes the CPU deliver a page-fault exception to the kernel.")}</p></li>
              <li><span>04</span><strong>resolve or signal</strong><p>{t("demand allocation·file load·COW는 커널이 해결하고 명령을 재개할 수 있습니다. 유효 VMA가 없거나 정책상 복구할 수 없으면 signal로 이어질 수 있습니다.", "The kernel can resolve demand allocation, file loading, or COW and resume the instruction. A missing valid VMA or unrecoverable protection violation can lead to a signal.")}</p></li>
            </ol>
            <details className="memory-prediction-answer">
              <summary>{t("예측: page fault가 발생했다면 프로그램 버그가 확정일까요?", "Predict: does a page fault prove the program has a bug?")}</summary>
              <p>{t("아닙니다. 첫 접근의 demand paging과 COW 첫 쓰기도 정상 실행 경로의 page fault입니다. 커널이 fault 원인과 VMA 계약을 검사한 뒤 복구 또는 signal을 결정합니다.", "No. Demand paging on first access and the first COW write are normal execution paths that use page faults. The kernel checks the cause and VMA contract before choosing recovery or a signal.")}</p>
            </details>
          </section>

          <div id="memory-lab"><LinuxVirtualMemoryLab onCompletionChange={setMemoryLabComplete} /></div>

          <section className="article-section" id="incidents">
            <div className="margin-label">06 — DEBUG MEMORY INCIDENTS</div>
            <h2>{t("주소 숫자보다 translation의 인과 증거를 수리합니다", "Repair causal translation evidence, not just address numbers")}</h2>
            <p>{t("다음 활동은 VPN·offset 계산, TLB miss trace, COW 이후 PTE·값, maps와 residency 수치를 각각 입력받습니다. 일부 값만 맞거나 ‘더 넓게 허용’한 상태는 통과하지 않습니다. 모든 판정은 외부 VM 없이 같은 입력에 같은 결과를 내므로 필수 완료 경로에서 네트워크·WASM 실패를 만들지 않습니다.", "The next activity collects VPN and offset calculations, a TLB-miss trace, post-COW PTEs and values, and maps-versus-residency counts. Partial answers or broadly permissive states do not pass. Every decision is deterministic without an external VM, keeping network and WASM failure out of the required completion path.")}</p>
            <LinuxMemoryDebuggerLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section linux-real-bridge" id="real-linux">
            <div className="margin-label">07 — REAL LINUX BOUNDARY</div>
            <h2>{t("실제 관찰은 선택 사항이며 PFN을 약속하지 않습니다", "Real observation is optional and does not promise PFNs")}</h2>
            <p>{t("필수 실습의 frame 번호는 교육용입니다. 실제 Linux에서는 /proc/self/maps로 VMA를 읽고 /proc/self/status의 VmSize·VmRSS를 비교할 수 있지만, maps만으로 page별 residency나 PFN을 볼 수 없습니다. /proc/pagemap의 PFN 정보는 보안상 제한될 수 있으므로 이 챕터는 권한 상승을 완료 조건으로 요구하지 않습니다.", "Frame numbers in the required lab are teaching-only. On real Linux, /proc/self/maps exposes VMAs and /proc/self/status lets you compare VmSize with VmRSS, but maps alone does not reveal per-page residency or PFNs. PFN information in /proc/pagemap may be security-restricted, so this chapter never requires elevated privileges for completion.")}</p>
            <pre className="memory-observation-command" aria-label={t("선택 Linux 관찰 명령", "Optional Linux observation commands")}>{`$ sed -n '1,12p' /proc/self/maps
$ grep -E 'Vm(Size|RSS)' /proc/self/status
$ getconf PAGESIZE`}</pre>
            <p>{t("출력 주소, 크기와 순서는 kernel·architecture·ASLR·allocator에 따라 달라집니다. stack은 흔히 낮은 주소 쪽으로, 전통적 brk heap은 높은 주소 쪽으로 자라지만 이를 모든 platform과 allocation의 보편 법칙으로 사용하지 마세요.", "Output addresses, sizes, and ordering vary with the kernel, architecture, ASLR, and allocator. Stacks commonly grow toward lower addresses and traditional brk heaps toward higher ones, but do not treat that as a universal rule for every platform and allocation.")}</p>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">08 — TRANSFER TO STORAGE</div>
            <h2>{t("file-backed VA를 계산하면 다음 질문은 byte가 어디에서 오는가입니다", "After computing a file-backed VA, ask where its bytes come from")}</h2>
            <p>{t("maps 행이 0x2000에서 시작하고 file offset이 0x1000이라면 VA 0x2340의 file offset은 0x1000+(0x2340−0x2000)=0x1340입니다. 첫 접근은 그 file-backed page를 읽는 fault를 만들 수 있습니다. 그러나 그 byte가 어느 장치 block에 있는지, pathname이 어떤 inode를 가리키고 어느 mount를 통과하는지는 page table이 답하지 않습니다. 다음 장이 그 저장 계층을 연결합니다.", "If a maps row begins at 0x2000 with file offset 0x1000, VA 0x2340 corresponds to file offset 0x1000+(0x2340−0x2000)=0x1340. First access may fault while loading that file-backed page. But the page table cannot say which device block contains the byte, which inode the pathname names, or which mount is crossed. The next chapter connects that storage layer.")}</p>
            <div className="memory-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t("file-backed maps 행 하나에서 VA의 file offset과 private/shared 계약을 계산한 뒤, ‘pathname → mount → directory entry → inode → block’ 중 page table 다음에 필요한 정보를 한 문장으로 적어 보세요.", "Given one file-backed maps row, compute the VA's file offset and private/shared contract, then write one sentence naming what must be learned next along pathname → mount → directory entry → inode → block.")}</p>
            </div>
          </section>

          <section className="article-section concept-check-section" id="check">
            <div className="margin-label">09 — CHECK</div>
            <LinuxMemoryConceptCheck onMasteryChange={setConceptsMastered} />
          </section>

          <section className="chapter-finish">
            <p className="eyebrow">CHECKPOINT</p>
            <h2>{t("이제 VA에서 frame까지의 경계를 설명할 수 있습니다", "You can now explain every boundary from a VA to a frame")}</h2>
            <p>{t("주소 번역과 COW·demand fault를 직접 실행하고, 네 오진을 수치와 상태로 수리하며 다섯 개념을 연결하면 목표에 도달했습니다.", "You reach the goal by running translation plus COW and demand faults, repairing four misdiagnoses with numeric and state evidence, and connecting all five concepts.")}</p>
            <div className="memory-completion-checklist" role="status" aria-live="polite">
              <span className={memoryLabComplete ? "is-complete" : undefined}>{memoryLabComplete ? "✓" : "○"} {t("주소 변환·COW 실습", "Translation and COW lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("메모리 사건 4개", "Four memory incidents")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("이해 확인 5문제", "Five concept questions")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="memory-and-virtual-addresses"
              canComplete={canComplete}
              lockedMessage={t("주소 변환 실습, 메모리 사건 네 개와 이해 확인 다섯 문제를 모두 마치면 완료할 수 있습니다.", "Finish the translation lab, all four memory incidents, and all five concept questions to complete the chapter.")}
            />
          </section>

          <nav className="chapter-bottom-nav" aria-label={t("챕터 이동", "Chapter navigation")}>
            {preview ? <a href={previousHref}>← {t("이전: 사용자와 권한", "Previous: Users and Permissions")}</a> : <span>← {t("이전: 사용자와 권한", "Previous: Users and Permissions")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>}
            <span>{t("다음: 저장장치와 파일시스템", "Next: Storage and Filesystems")} <small>{t("준비 중", "Coming soon")}</small></span>
          </nav>
        </article>
      </div>
    </main>
  );
}

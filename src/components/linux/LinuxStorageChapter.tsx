import { Link } from "@tanstack/react-router";
import { useState } from "react";
import {
  LINUX_CURRICULUM_SLUG,
  linuxChaptersEn,
  linuxChaptersKo,
} from "../../data/curriculum";
import { useLocale } from "../../features/localization/localization";
import { canCompleteStorageChapter } from "../../features/linux-runtime/storage-and-filesystems";
import { AuthControls } from "../AuthControls";
import { ChapterToc } from "../ChapterToc";
import { CitationSection } from "../CitationSection";
import { CompleteChapter } from "../CompleteChapter";
import { LanguageSwitcher } from "../LanguageSwitcher";
import { usePublicationPreview } from "../PublicationPreview";
import { PublicLearningProof } from "../PublicLearningProof";
import { RootorialMark } from "../RootorialMark";
import { LinuxStorageConceptCheck } from "./LinuxStorageConceptCheck";
import { LinuxStorageIncidentLab } from "./LinuxStorageIncidentLab";
import { LinuxStoragePathLab } from "./LinuxStoragePathLab";

const tocItems = {
  ko: [
    { id: "namespace", label: "이름에서 inode까지" },
    { id: "mounts", label: "mount 경계" },
    { id: "blocks", label: "offset에서 block까지" },
    { id: "lifetime", label: "link와 열린 파일 수명" },
    { id: "durability", label: "cache와 영속성" },
    { id: "storage-lab", label: "필수 경로·저장 실습" },
    { id: "incidents", label: "파일시스템 사건 진단" },
    { id: "real-linux", label: "실제 Linux 관찰" },
    { id: "transfer", label: "네트워크로 전이" },
    { id: "check", label: "이해 확인" },
  ],
  en: [
    { id: "namespace", label: "From names to inodes" },
    { id: "mounts", label: "Mount boundaries" },
    { id: "blocks", label: "From offsets to blocks" },
    { id: "lifetime", label: "Links and open-file lifetime" },
    { id: "durability", label: "Cache and durability" },
    { id: "storage-lab", label: "Required path and storage lab" },
    { id: "incidents", label: "Diagnose filesystem incidents" },
    { id: "real-linux", label: "Observe real Linux" },
    { id: "transfer", label: "Transfer to networking" },
    { id: "check", label: "Concept check" },
  ],
} as const;

export function LinuxStorageChapter({ learnerCount = 0 }: { learnerCount?: number }) {
  const { locale } = useLocale();
  const preview = usePublicationPreview();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const chapters = isKo ? linuxChaptersKo : linuxChaptersEn;
  const chapterIndex = chapters.findIndex(({ slug }) => slug === "storage-and-filesystems");
  const chapter = chapters[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const [pathLabComplete, setPathLabComplete] = useState(false);
  const [incidentsComplete, setIncidentsComplete] = useState(false);
  const [conceptsMastered, setConceptsMastered] = useState(false);
  const canComplete = canCompleteStorageChapter({
    pathLabComplete,
    incidentsComplete,
    conceptsMastered,
  });
  const previousHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/memory-and-virtual-addresses${isKo ? "" : "?lang=en"}`;
  const nextHref = `/admin/preview/curricula/${LINUX_CURRICULUM_SLUG}/chapters/networking-from-a-packet${isKo ? "" : "?lang=en"}`;

  return (
    <main className="chapter-shell linux-chapter-shell linux-storage-chapter-shell">
      <header className="chapter-topbar">
        <Link className="wordmark" to="/" search={isKo ? {} : { lang: "en" }} aria-label={t("Rootorial 홈", "Rootorial home")}>
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
          <header className="lesson-hero linux-lesson-hero linux-storage-hero">
            <p className="eyebrow">PATH → MOUNT → DENTRY → INODE → BLOCK · {isKo ? `약 ${chapter.estimatedMinutes}분` : `ABOUT ${chapter.estimatedMinutes} MIN`}</p>
            <div className="lesson-number">06</div>
            <h1>{chapter.title}</h1>
            <p className="lesson-deck">
              {isKo ? (
                <>지난 장의 file-backed 주소는 <em>파일 offset</em>에서 끝났습니다. 이제 pathname을 mount table과 directory entry로 해석하고, inode의 extent를 따라 page cache와 block device까지 내려갑니다.</>
              ) : (
                <>The previous chapter's file-backed address ended at a <em>file offset</em>. Now resolve the pathname through mounts and directory entries, then follow the inode's extent through the page cache to a block device.</>
              )}
            </p>
            <PublicLearningProof count={learnerCount} locale={locale} scope="chapter" />
            <div className="lesson-objectives">
              <span>{t("학습 목표", "LEARNING OBJECTIVES")}</span>
              <ul>
                <li>{t("pathname을 구성 요소별로 탐색하고 mount crossing 뒤의 filesystem·directory entry·inode를 정확히 식별할 수 있다.", "Walk a pathname component by component and identify the filesystem, directory entry, and inode after crossing a mount.")}</li>
                <li>{t("유효한 file offset을 logical block과 block 내부 offset으로 나누고 extent에서 device block·device byte를 계산할 수 있다.", "Split a valid file offset into a logical block and in-block offset, then map it through an extent to a device block and byte.")}</li>
                <li>{t("hard link가 파일 복사가 아니라 같은 filesystem의 같은 inode를 가리키는 이름임을 증명하고 unlink·open reference의 수명을 추적할 수 있다.", "Prove that a hard link is another name for the same inode on one filesystem—not a copy—and trace lifetime across unlink and open references.")}</li>
                <li>{t("free block과 free inode 고갈을 분리하고 page cache의 dirty byte와 영속 저장된 byte를 구분할 수 있다.", "Distinguish free-block exhaustion from free-inode exhaustion, and dirty page-cache bytes from persisted bytes.")}</li>
                <li>{t("같은 부모 디렉터리에 temp를 만들고 write → fsync(file) → rename → fsync(parent directory)를 조립해 원자적 이름 변경과 crash durability를 분리할 수 있다.", "Create a temporary file in the same parent directory and assemble write → fsync(file) → rename → fsync(parent directory), separating atomic namespace replacement from crash durability.")}</li>
              </ul>
            </div>
          </header>

          <section className="article-section" id="namespace">
            <div className="margin-label">01 — NAMESPACE → INODE</div>
            <h2>{t("파일 이름은 inode 안이 아니라 부모 디렉터리에 있습니다", "A filename lives in its parent directory, not in the inode")}</h2>
            <p>{t("커널은 /srv/data/report.bin을 한 번에 inode로 바꾸지 않습니다. root directory에서 srv entry를 찾고, 그 directory에서 data entry를 찾고, 마지막으로 report.bin entry가 가리키는 inode를 얻습니다. inode는 종류·크기·권한·data mapping을 담지만 이름을 소유하지 않습니다. 그래서 여러 directory entry가 같은 inode를 가리킬 수 있습니다.", "The kernel does not convert /srv/data/report.bin into an inode in one step. It finds the srv entry in the root directory, then data in that directory, then the inode referenced by report.bin. An inode contains type, size, permissions, and data mappings, but does not own a name. Multiple directory entries can therefore reference one inode.")}</p>
            <div className="storage-path-strip" role="group" aria-label={t("경로를 inode로 해석하는 순서", "Order for resolving a path to an inode")}>
              <span><small>pathname</small><strong>/srv/data/report.bin</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>directory entries</small><strong>/ · srv · data · report.bin</strong></span>
              <span aria-hidden="true">→</span>
              <span><small>identity</small><strong>datafs:inode 17</strong></span>
            </div>
            <div className="concept-callout storage-prerequisite">
              <span className="callout-mark">↩</span>
              <div>
                <strong>{t("선행 개념", "Prerequisites")}</strong>
                <p>{t("절대 경로와 디렉터리 search 권한, process file descriptor, file-backed mapping의 file offset을 기억하면 충분합니다. memory page와 filesystem block은 별도 크기와 상태를 가질 수 있습니다.", "It is enough to remember absolute paths and directory search permission, process file descriptors, and the file offset of a file-backed mapping. Memory pages and filesystem blocks can have different sizes and states.")}</p>
                {preview ? <a href={previousHref}>{t("이전 드래프트 챕터 다시 보기", "Review the previous draft chapter")} →</a> : <span>{t("이전 챕터는 관리자 드래프트 미리보기에서 연결됩니다.", "The previous chapter is linked from the admin draft preview.")}</span>}
              </div>
            </div>
          </section>

          <section className="article-section" id="mounts">
            <div className="margin-label">02 — MOUNT NAMESPACE</div>
            <h2>{t("mount point는 그 아래 이름을 다른 filesystem root로 전환합니다", "A mount point switches the names below it to another filesystem root")}</h2>
            <p>{t("이 장의 fixture에서 rootfs의 /srv/data inode는 datafs의 root로 가는 경계입니다. mount가 활성화되면 기존 rootfs/data 아래의 README.local은 지워지거나 합쳐지지 않고 잠시 가려집니다. unmount하면 다시 보입니다. inode 2가 두 filesystem에 있어도 서로 다른 객체이므로 정체성은 filesystem(실제로는 device)+inode 쌍으로 읽어야 합니다.", "In this chapter's fixture, the rootfs inode at /srv/data is a boundary to the datafs root. While mounted, README.local under the original rootfs directory is hidden—not deleted or merged—and reappears after unmount. Even if inode 2 exists on both filesystems, the objects differ, so identity requires a filesystem (in practice, device) plus inode pair.")}</p>
            <details className="storage-prediction-answer">
              <summary>{t("예측: /srv/data 위에 datafs를 mount하면 rootfs의 README.local이 datafs로 복사될까요?", "Predict: does mounting datafs on /srv/data copy the rootfs README.local into datafs?")}</summary>
              <p>{t("아닙니다. pathname walk가 mount table을 만나 datafs root로 전환되므로 underlay entry가 가려질 뿐입니다. unmount는 그 원래 namespace를 다시 드러냅니다.", "No. The pathname walk meets the mount table and switches to the datafs root, merely hiding the underlay entry. Unmounting exposes the original namespace again.")}</p>
            </details>
          </section>

          <section className="article-section" id="blocks">
            <div className="margin-label">03 — FILE OFFSET → DEVICE BLOCK</div>
            <h2>{t("offset은 먼저 파일의 logical block으로 나뉩니다", "An offset first splits into a file logical block")}</h2>
            <p>{t("4 KiB filesystem block fixture에서 offset 0x1340은 logical block 1과 block 내부 offset 0x340입니다. inode 17의 extent가 logical block 1을 /dev/vdb1 block 44에 연결하므로 device byte offset은 44×0x1000+0x340=0x2c340입니다. 이 숫자는 교육용 block address이며 SSD의 물리 셀 위치가 아닙니다. 이 fixture는 extent 밖 접근을 범위 오류로 판정합니다. 실제 파일 크기 안에서 mapping이 없는 영역은 sparse hole일 수 있고 zero로 읽히지만 device block 0을 읽는다는 뜻은 아닙니다.", "With this fixture's 4 KiB filesystem blocks, offset 0x1340 becomes logical block 1 plus in-block offset 0x340. Inode 17's extent maps logical block 1 to /dev/vdb1 block 44, so the device byte offset is 44×0x1000+0x340=0x2c340. This is a teaching block address, not an SSD cell location. This fixture grades access outside its extents as out of range. In a real file, an unmapped range within the file size can be a sparse hole that reads as zeros; it still does not mean reading device block zero.")}</p>
            <div className="storage-block-equation" aria-label={t("파일 offset에서 device byte까지의 계산", "Calculation from file offset to device byte")}>
              <span><small>file offset</small><strong>0x1340</strong></span><span aria-hidden="true">→</span>
              <span><small>logical + inner</small><strong>LBN 1 + 0x340</strong></span><span aria-hidden="true">→</span>
              <span><small>extent</small><strong>block 44</strong></span><span aria-hidden="true">→</span>
              <span><small>device byte</small><strong>0x2c340</strong></span>
            </div>
          </section>

          <section className="article-section" id="lifetime">
            <div className="margin-label">04 — LINK · OPEN REF · RECLAIM</div>
            <h2>{t("unlink는 파일 객체가 아니라 이름 하나를 제거합니다", "unlink removes one name, not necessarily the file object")}</h2>
            <ol className="storage-lifetime-pipeline">
              <li><span>01</span><strong>link</strong><p>{t("같은 filesystem에 새 dentry를 만들고 같은 inode를 가리킵니다. data byte 복사는 없습니다.", "Create another dentry on the same filesystem pointing to the same inode. No data bytes are copied.")}</p></li>
              <li><span>02</span><strong>open</strong><p>{t("프로세스의 fd가 열린 파일 설명을 통해 inode를 참조합니다. pathname을 나중에 지워도 이 참조는 유지됩니다.", "A process fd references the inode through an open-file description. This reference survives a later pathname removal.")}</p></li>
              <li><span>03</span><strong>unlink</strong><p>{t("부모 directory entry 하나와 link count 하나를 제거합니다. 다른 이름이나 open ref가 있으면 block은 남습니다.", "Remove one parent-directory entry and one link count. Blocks remain while another name or open reference exists.")}</p></li>
              <li><span>04</span><strong>reclaim</strong><p>{t("link count=0이고 open refs=0일 때에만 이 모델이 inode와 data block을 회수합니다.", "Only when link count=0 and open refs=0 does this model reclaim the inode and data blocks.")}</p></li>
            </ol>
          </section>

          <section className="article-section" id="durability">
            <div className="margin-label">05 — PAGE CACHE ≠ DURABLE STORAGE</div>
            <h2>{t("write 성공, 다른 프로세스의 관찰과 crash 뒤 생존은 다른 계약입니다", "A successful write, visibility, and survival after a crash are different contracts")}</h2>
            <p>{t("write가 반환되면 새 byte가 page cache에서 읽힐 수 있지만 아직 dirty일 수 있습니다. fsync(file)은 그 파일의 data와 필요한 metadata를 영속화하는 경계입니다. 이 fixture처럼 최종 파일과 같은 부모 디렉터리에 temp를 만들면 rename은 같은 filesystem 안에서 이름 전환을 원자적으로 만듭니다. 다른 디렉터리에서 rename하면 두 parent directory의 영속성을 함께 따져야 하므로 여기서는 다루지 않습니다.", "After write returns, new bytes may be visible through the page cache while still dirty. fsync(file) is the boundary that persists the file's data and required metadata. When the temporary file is created in the same parent directory as the destination, as in this fixture, rename makes the name switch atomic within one filesystem. Renaming across directories can require reasoning about persistence of both parent directories and is outside this fixture.")}</p>
            <div className="storage-durability-sequence" role="group" aria-label={t("crash-safe 파일 교체 순서", "Crash-safe file replacement sequence")}>
              <span><strong>1</strong> write same-dir temp</span><span><strong>2</strong> fsync(temp)</span><span><strong>3</strong> rename</span><span><strong>4</strong> fsync(parent)</span>
            </div>
            <details className="storage-prediction-answer">
              <summary>{t("예측: rename이 성공했으니 전원 장애 뒤에도 새 이름과 새 data가 반드시 남을까요?", "Predict: because rename succeeded, must the new name and data survive power loss?")}</summary>
              <p>{t("이 fixture의 temp는 최종 파일과 같은 부모 디렉터리에 있습니다. rename은 관찰 가능한 namespace 전환을 원자적으로 만들지만 곧바로 durability를 뜻하지 않습니다. temp file을 fsync하고 rename한 뒤 그 parent directory도 fsync하는 순서를 분리해 검증합니다.", "The temporary file in this fixture shares the destination's parent directory. Rename makes the visible namespace switch atomic, but that does not itself establish durability. Verify the separate order: fsync the temporary file, rename it, then fsync that parent directory.")}</p>
            </details>
          </section>

          <div id="storage-lab"><LinuxStoragePathLab onCompletionChange={setPathLabComplete} /></div>

          <section className="article-section" id="incidents">
            <div className="margin-label">07 — DEBUG FILESYSTEM INCIDENTS</div>
            <h2>{t("용량 숫자나 파일 이름 하나 대신 수명과 영속성의 불변식을 수리합니다", "Repair lifetime and durability invariants, not a single capacity number or filename")}</h2>
            <p>{t("다음 활동은 mount shadow, inode 고갈, deleted-open 파일, crash-safe 교체를 각각 의미론적 상태로 판정합니다. 모든 계산은 브라우저 안의 결정론적 TypeScript 모델에서 실행되며 외부 VM이나 네트워크는 완료 조건이 아닙니다.", "The next activity grades mount shadowing, inode exhaustion, a deleted-but-open file, and crash-safe replacement against semantic state. Every calculation runs in a deterministic in-browser TypeScript model; no external VM or network is required for completion.")}</p>
            <LinuxStorageIncidentLab onCompletionChange={setIncidentsComplete} />
          </section>

          <section className="article-section" id="real-linux">
            <div className="margin-label">08 — OPTIONAL REAL LINUX OBSERVATION</div>
            <h2>{t("실제 명령은 모델의 경계를 관찰하되 완료 조건과 분리합니다", "Real commands observe model boundaries but stay outside completion")}</h2>
            <p>{t("로컬 Linux가 있다면 다음 명령으로 pathname의 mount, device+inode, block과 inode 용량을 비교하세요. stat의 block 수나 filesystem 구현은 달라질 수 있으며 일반 계정으로 안전하게 읽기만 합니다.", "If local Linux is available, compare a pathname's mount, device-plus-inode identity, and block versus inode capacity with these commands. stat block counts and filesystem implementations vary; these commands are safe read-only observations as a regular user.")}</p>
            <pre className="storage-observation-command">{`findmnt -T /path/to/file
stat /path/to/file
ls -li /path/to/file
df -h /path/to/file
df -i /path/to/file`}</pre>
          </section>

          <section className="article-section" id="transfer">
            <div className="margin-label">09 — TRANSFER TO NETWORKING</div>
            <h2>{t("regular-file fd에서 읽은 byte를 socket fd로 쓰면 다음 층이 시작됩니다", "The next layer begins when bytes read from a regular-file fd are written to a socket fd")}</h2>
            <div className="storage-transfer-task">
              <strong>{t("전이 과제", "TRANSFER TASK")}</strong>
              <p>{t("프로세스가 /srv/data/report.link를 open하고 offset 0x1340을 읽어 socket fd 4에 쓰는 trace를 pathname → mount → inode → open file description/regular-file fd → read → page cache/block → user buffer → socket fd 순서로 적으세요. 다음 장에서는 fd 4 이후를 socket buffer → TCP → IP → interface로 확장합니다.", "Write the trace for a process opening /srv/data/report.link, reading offset 0x1340, and writing it to socket fd 4: pathname → mount → inode → open file description/regular-file fd → read → page cache/block → user buffer → socket fd. The next chapter extends after fd 4 through socket buffer → TCP → IP → interface.")}</p>
            </div>
          </section>

          <section className="article-section concept-check" id="check">
            <div className="margin-label">10 — CONCEPT CHECK</div>
            <LinuxStorageConceptCheck onMasteryChange={setConceptsMastered} />
            <div className="storage-completion-checklist" role="status" aria-live="polite">
              <span className={pathLabComplete ? "is-complete" : undefined}>{pathLabComplete ? "✓" : "○"} {t("필수 경로·저장 실습", "Required path and storage lab")}</span>
              <span className={incidentsComplete ? "is-complete" : undefined}>{incidentsComplete ? "✓" : "○"} {t("파일시스템 사건 진단", "Filesystem incident diagnosis")}</span>
              <span className={conceptsMastered ? "is-complete" : undefined}>{conceptsMastered ? "✓" : "○"} {t("개념 확인", "Concept check")}</span>
            </div>
            <CompleteChapter
              curriculumSlug={LINUX_CURRICULUM_SLUG}
              slug="storage-and-filesystems"
              canComplete={canComplete}
              lockedMessage={t("필수 실습, 사건 진단과 다섯 개념 확인을 모두 완료하세요.", "Complete the required lab, incident diagnosis, and all five concept checks.")}
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
            {preview ? <a href={previousHref}>← {t("이전: 메모리와 가상 주소", "Previous: Memory and Virtual Addresses")}</a> : <span>← {t("이전: 메모리와 가상 주소", "Previous: Memory and Virtual Addresses")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>}
            {preview ? <a href={nextHref}>{t("다음: 패킷에서 소켓까지", "Next: From Packets to Sockets")} →</a> : <span>{t("다음: 패킷에서 소켓까지", "Next: From Packets to Sockets")} <small>{t("드래프트 미리보기 전용", "Draft preview only")}</small></span>}
          </nav>
        </article>
      </div>
    </main>
  );
}

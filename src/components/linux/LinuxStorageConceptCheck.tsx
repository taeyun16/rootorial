import { linuxStorageQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxStorageQuestions;

export function LinuxStorageConceptCheck({
  onMasteryChange,
}: {
  onMasteryChange: (mastered: boolean) => void;
}) {
  const { locale } = useLocale();
  const isKo = locale === "ko";
  const t = (ko: string, en: string) => isKo ? ko : en;
  const { recordAnswers } = useLearningAnalytics();

  const questions: Array<ConceptQuestionSpec<QuestionId>> = [
    {
      id: "path-resolution",
      index: "01",
      prompt: isKo
        ? <><code>/srv/data</code>에 다른 파일시스템이 마운트되어 있습니다. 프로세스가 <code>/srv/data/report.bin</code>의 바이트를 읽을 때 올바른 탐색 순서는?</>
        : <>Another filesystem is mounted at <code>/srv/data</code>. Which lookup sequence reaches the bytes of <code>/srv/data/report.bin</code>?</>,
      options: [
        {
          value: "mount-root-dentry-inode-block",
          label: t(
            "마운트된 root → report.bin 디렉터리 엔트리 → inode → data block",
            "Mounted root → report.bin directory entry → inode → data block",
          ),
        },
        {
          value: "inode-stores-name-and-path",
          label: t(
            "inode가 /srv/data/report.bin이라는 전체 경로와 이름을 직접 저장",
            "The inode stores the full /srv/data/report.bin path and name directly",
          ),
        },
        {
          value: "path-points-directly-to-block",
          label: t(
            "경로 문자열이 directory와 inode를 건너뛰고 data block을 직접 가리킴",
            "The path string skips the directory and inode and points directly to a data block",
          ),
        },
      ],
      correctAnswer: linuxStorageQuestions["path-resolution"].correctAnswer,
      answerLabel: t(
        "정답: mount → dentry → inode → block",
        "Answer: mount → dentry → inode → block",
      ),
      correctFeedback: t(
        "맞았습니다. mount 지점에서 대상 파일시스템의 root로 넘어간 뒤, 디렉터리 엔트리가 이름을 inode 번호에 연결하고 inode가 파일의 data block 위치를 가리킵니다.",
        "Right. Lookup crosses the mount into the target filesystem root, the directory entry maps the name to an inode number, and the inode points to the file's data blocks.",
      ),
      incorrectFeedback: t(
        "이름과 파일 객체를 분리하세요. 디렉터리 엔트리가 이름을 inode에 연결하며, inode는 메타데이터와 block 위치를 담습니다. 전체 경로는 inode 안에 저장되지 않습니다.",
        "Separate the name from the file object. A directory entry maps the name to an inode, while the inode holds metadata and block locations. The full path is not stored in the inode.",
      ),
    },
    {
      id: "mount-namespace",
      index: "02",
      prompt: isKo
        ? <>root 파일시스템의 <code>/srv/data</code> 안에 <code>README.local</code>이 있는데, 다른 파일시스템을 그 경로에 마운트했습니다. 이제 <code>/srv/data</code>를 조회하면?</>
        : <>The root filesystem has <code>README.local</code> beneath <code>/srv/data</code>, then another filesystem is mounted there. What does lookup at <code>/srv/data</code> see now?</>,
      options: [
        {
          value: "mounted-root-shadows-underlay",
          label: t(
            "마운트된 파일시스템의 root가 보이며, 기존 내용은 삭제되지 않고 가려짐",
            "The mounted filesystem root is visible; the old contents remain but are hidden",
          ),
        },
        {
          value: "mount-merges-directories",
          label: t(
            "두 디렉터리의 항목이 하나의 목록으로 자동 병합됨",
            "Entries from both directories are automatically merged into one listing",
          ),
        },
        {
          value: "mount-deletes-underlay",
          label: t(
            "마운트하는 순간 README.local과 기존 디렉터리 내용이 삭제됨",
            "Mounting deletes README.local and the previous directory contents",
          ),
        },
      ],
      correctAnswer: linuxStorageQuestions["mount-namespace"].correctAnswer,
      answerLabel: t(
        "정답: 새 root가 기존 내용을 가림",
        "Answer: the new root shadows the underlay",
      ),
      correctFeedback: t(
        "맞았습니다. mount는 경로 탐색이 다른 파일시스템 root로 건너가게 합니다. 기존 /srv/data 내용은 합쳐지거나 지워지지 않으며 unmount하면 다시 보입니다.",
        "Right. A mount makes path lookup cross into another filesystem root. The old /srv/data contents are neither merged nor erased and become visible again after unmounting.",
      ),
      incorrectFeedback: t(
        "mount를 파일 복사나 디렉터리 병합으로 보지 마세요. 같은 경로에서 어떤 파일시스템 root를 따라갈지 namespace 연결만 바뀝니다.",
        "Do not treat a mount as copying files or merging directories. It changes which filesystem root path lookup follows at that point in the namespace.",
      ),
    },
    {
      id: "link-lifetime",
      index: "03",
      prompt: isKo
        ? <><code>report.txt</code>와 <code>latest.txt</code>가 같은 inode를 가리키는 hard link입니다. <code>report.txt</code>를 unlink한 뒤에도 <code>latest.txt</code>와 열린 fd가 남아 있다면?</>
        : <><code>report.txt</code> and <code>latest.txt</code> are hard links to the same inode. After unlinking <code>report.txt</code>, <code>latest.txt</code> and an open fd remain. What follows?</>,
      options: [
        {
          value: "same-inode-reclaim-after-zero-links-and-opens",
          label: t(
            "latest.txt와 fd는 같은 데이터를 읽고, link count와 open reference가 모두 0일 때 회수",
            "latest.txt and the fd read the same data; reclaim waits for zero links and zero open references",
          ),
        },
        {
          value: "hard-link-copies-blocks",
          label: t(
            "hard link 생성 시 inode와 data block이 복사되므로 두 파일은 즉시 독립",
            "Creating a hard link copies the inode and data blocks, so the files are immediately independent",
          ),
        },
        {
          value: "first-unlink-reclaims-data",
          label: t(
            "이름 하나를 unlink하는 즉시 inode와 block이 회수되어 남은 link와 fd가 끊김",
            "Unlinking one name immediately reclaims the inode and blocks, breaking the remaining link and fd",
          ),
        },
      ],
      correctAnswer: linuxStorageQuestions["link-lifetime"].correctAnswer,
      answerLabel: t(
        "정답: 이름은 공유 inode의 참조이며 마지막 참조 뒤 회수",
        "Answer: names reference a shared inode; reclaim follows the last reference",
      ),
      correctFeedback: t(
        "맞았습니다. hard link는 새 파일 복사본이 아니라 같은 inode를 가리키는 새 디렉터리 엔트리입니다. 마지막 이름이 사라져도 열린 fd가 있으면 객체와 block은 유지됩니다.",
        "Right. A hard link is another directory entry for the same inode, not a copied file. Even after the last name disappears, an open fd keeps the object and its blocks alive.",
      ),
      incorrectFeedback: t(
        "unlink는 경로의 디렉터리 엔트리 하나를 제거합니다. 같은 inode를 가리키는 다른 이름이나 열린 fd가 남아 있으면 파일 데이터의 수명은 끝나지 않습니다.",
        "unlink removes one directory entry from a path. The file data remains alive while another name or an open fd still references the same inode.",
      ),
    },
    {
      id: "inode-capacity",
      index: "04",
      prompt: isKo
        ? <><code>df -h</code>에는 data block 여유가 있지만 빈 파일을 만드는 <code>touch</code>가 <code>ENOSPC</code>로 실패하고 <code>df -i</code>는 inode 100% 사용을 보입니다. 원인은?</>
        : <><code>df -h</code> shows free data blocks, but <code>touch</code> fails with <code>ENOSPC</code> and <code>df -i</code> shows 100% inode use. What is the cause?</>,
      options: [
        {
          value: "free-blocks-zero-free-inodes",
          label: t(
            "파일 내용 공간은 남았지만 새 파일 객체를 나타낼 free inode가 없음",
            "Content space remains, but no free inode can represent a new file object",
          ),
        },
        {
          value: "page-cache-needs-emptying",
          label: t(
            "page cache가 가득 찼으므로 sync만 실행하면 새 inode가 생김",
            "The page cache is full, so running sync alone will create a new inode",
          ),
        },
        {
          value: "touch-needs-data-block-first",
          label: t(
            "빈 파일도 먼저 큰 data block을 할당해야 하므로 block 표시가 잘못됨",
            "Even an empty file must allocate a large data block first, so the block report is wrong",
          ),
        },
      ],
      correctAnswer: linuxStorageQuestions["inode-capacity"].correctAnswer,
      answerLabel: t(
        "정답: block 여유와 inode 여유는 별도 자원",
        "Answer: free blocks and free inodes are separate resources",
      ),
      correctFeedback: t(
        "맞았습니다. 새 파일은 내용을 쓰기 전에도 inode가 필요합니다. 불필요한 파일을 제거해 inode를 회수하거나 inode가 더 많은 파일시스템 구성이 필요합니다.",
        "Right. A new file needs an inode even before it stores content. Reclaim an inode by removing an unneeded file, or use a filesystem configuration with more inodes.",
      ),
      incorrectFeedback: t(
        "용량을 한 숫자로 보지 말고 df -h의 block과 df -i의 inode를 분리해 읽으세요. sync는 dirty cache를 쓰지만 inode 총량을 늘리지 않습니다.",
        "Do not reduce capacity to one number: read blocks in df -h separately from inodes in df -i. sync writes dirty cache but does not increase the inode supply.",
      ),
    },
    {
      id: "crash-durability",
      index: "05",
      prompt: isKo
        ? <>전원 장애 뒤에도 <code>config</code>가 완성된 새 내용이나 완성된 이전 내용 중 하나를 가리키게 하려 합니다. temp는 <code>config</code>와 같은 부모 디렉터리에 만들고 page cache의 새 파일이 이미 보일 수 있을 때, 올바른 교체 순서는?</>
        : <>After a power loss, <code>config</code> must name either the complete new contents or the complete old contents. The temporary file is created in the same parent directory as <code>config</code>, and its page-cache copy may already be visible. Which replacement order establishes durability?</>,
      options: [
        {
          value: "fsync-file-rename-fsync-parent",
          label: t(
            "같은 부모에 임시 파일 쓰기 → 임시 파일 fsync → config로 rename → 그 parent directory fsync",
            "Write a temporary file in the same parent → fsync the file → rename it to config → fsync that parent directory",
          ),
        },
        {
          value: "write-visible-means-durable",
          label: t(
            "새 내용이 read에 보이면 이미 영구 저장되었으므로 바로 rename",
            "Once a read sees the new contents, they are durable, so rename immediately",
          ),
        },
        {
          value: "rename-alone-persists-everything",
          label: t(
            "rename 하나가 file data와 directory entry를 모두 영구 저장",
            "rename alone durably stores both the file data and the directory entry",
          ),
        },
      ],
      correctAnswer: linuxStorageQuestions["crash-durability"].correctAnswer,
      answerLabel: t(
        "정답: file fsync → rename → parent fsync",
        "Answer: file fsync → rename → parent fsync",
      ),
      correctFeedback: t(
        "맞았습니다. read에 보이는 cache 상태와 전원 장애를 견디는 persistence는 다릅니다. 같은 부모의 새 파일 데이터를 먼저 지속시키고, atomic rename 뒤 그 parent directory를 fsync해 이름 변경까지 지속시킵니다.",
        "Right. Cache visibility differs from persistence across power loss. Persist the same-parent temporary file first, then use atomic rename and fsync that parent directory to persist the name change.",
      ),
      incorrectFeedback: t(
        "visibility, file data durability, directory entry durability를 나눠 보세요. rename은 이름 전환을 atomic하게 하지만 page cache의 data와 directory update를 스스로 모두 지속시키지는 않습니다.",
        "Separate visibility, file-data durability, and directory-entry durability. rename makes the name switch atomic, but does not by itself persist both cached data and the directory update.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE PATH → INODE → BLOCK",
        title: t(
          "이름, 파일 객체, 저장 상태의 경계를 연결하세요",
          "Connect names, file objects, and persisted state",
        ),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마치면 챕터 완료 조건이 열립니다.",
          "Complete all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t("저장 경계를 정확히 읽었습니다", "Storage boundary read correctly"),
        incorrect: t("경로와 지속성 경계를 다시 확인하세요", "Recheck the path and durability boundaries"),
        checkAnswers: t("파일시스템 판정 확인하기", "Check the filesystem decisions"),
        completed: t(
          "이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.",
          "Concept check complete — now confirm both activity states.",
        ),
        retry: t(
          "mount, dentry, inode, block을 순서대로 추적하고 visibility와 persistence를 분리하세요.",
          "Trace mount, dentry, inode, and block in order, then separate visibility from persistence.",
        ),
        idle: t(
          "다섯 답을 고른 뒤 경로와 crash 경계를 확인하세요.",
          "Choose all five answers, then check the path and crash boundaries.",
        ),
      }}
    />
  );
}

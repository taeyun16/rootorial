import { linuxPermissionQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxPermissionQuestions;

export function LinuxPermissionsConceptCheck({
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
      id: "process-credentials",
      index: "01",
      prompt: isKo
        ? <><code>cat /srv/release/plan.txt</code>를 실행한 프로세스가 파일 읽기를 요청합니다. 이 챕터의 권한 모델에서 커널이 파일 메타데이터와 비교할 주체는 무엇일까요?</>
        : <><code>cat /srv/release/plan.txt</code> issues a file-read request. In this chapter's permission model, which subject does the kernel compare with the file metadata?</>,
      options: [
        {
          value: "effective-uid-and-groups",
          label: t(
            "프로세스의 effective UID·GID와 supplementary group",
            "The process's effective UID and GID plus supplementary groups",
          ),
        },
        {
          value: "terminal-owner",
          label: t(
            "명령을 입력한 terminal 장치의 owner",
            "The owner of the terminal device where the command was typed",
          ),
        },
        {
          value: "process-id",
          label: t(
            "프로세스의 PID 숫자",
            "The process's numeric PID",
          ),
        },
      ],
      correctAnswer: linuxPermissionQuestions["process-credentials"].correctAnswer,
      answerLabel: t(
        "정답: 프로세스의 effective UID·GID와 supplementary group 집합",
        "Answer: the process's effective UID and GID plus supplementary group set",
      ),
      correctFeedback: t(
        "맞았습니다. 접근 요청의 주체는 프로세스입니다. 이 모델은 effective UID로 owner 일치를, effective GID와 supplementary group으로 group 일치를 판정합니다.",
        "Right. The process is the subject making the request. This model uses its effective UID for the owner match and its effective GID plus supplementary groups for the group match.",
      ),
      incorrectFeedback: t(
        "terminal은 입출력 장치이고 PID는 프로세스를 찾는 번호일 뿐 권한 클래스가 아닙니다. 요청한 프로세스의 effective UID와 전체 group 집합을 파일의 owner·group과 비교하세요.",
        "A terminal is an I/O device, and a PID locates a process; neither is a permission class. Compare the requesting process's effective UID and complete group set with the file owner and group.",
      ),
    },
    {
      id: "permission-class",
      index: "02",
      prompt: t(
        "프로세스 UID가 파일 owner와 일치합니다. owner 비트에는 r이 없지만, 프로세스가 속한 파일 group 비트에는 r이 있습니다. 기본 rwx 판정 결과는?",
        "A process UID matches the file owner. The owner bits lack r, but the file's group bits include r and the process belongs to that group. What is the basic rwx result?",
      ),
      options: [
        {
          value: "owner-then-group-then-other",
          label: t(
            "owner 클래스만 선택되므로 읽기 거부",
            "The owner class alone is selected, so read is denied",
          ),
        },
        {
          value: "combine-all-classes",
          label: t(
            "owner·group·other 비트를 합쳐 r이 있으므로 허용",
            "Combine owner, group, and other; any r allows the read",
          ),
        },
        {
          value: "fallback-after-denial",
          label: t(
            "owner에서 거부된 뒤 group으로 내려가 허용",
            "Fall through from the denied owner class to the group class",
          ),
        },
      ],
      correctAnswer: linuxPermissionQuestions["permission-class"].correctAnswer,
      answerLabel: t(
        "정답: owner → group → other 중 정확히 한 클래스",
        "Answer: exactly one class from owner → group → other",
      ),
      correctFeedback: t(
        "맞았습니다. 먼저 일치하는 클래스를 하나 고른 뒤 그 클래스의 비트만 검사합니다. owner가 일치하면 group 권한을 더하거나 거부 뒤에 fallback하지 않습니다.",
        "Right. First select one matching class, then inspect only that class's bits. An owner match neither adds group permissions nor falls through after a denial.",
      ),
      incorrectFeedback: t(
        "세 클래스는 권한을 합치는 후보 목록이 아닙니다. UID가 owner와 일치하는 순간 owner 클래스가 선택되며, owner의 r이 없으면 group의 r과 무관하게 거부됩니다.",
        "The three classes are not permissions to combine. Once the UID matches the owner, the owner class is selected; without owner r, the read is denied regardless of group r.",
      ),
    },
    {
      id: "directory-search",
      index: "03",
      prompt: isKo
        ? <><code>plan.txt</code> 자체에는 Joon이 사용할 r이 있지만 부모 <code>/srv/release</code> 디렉터리에는 Joon이 사용할 x가 없습니다. 파일 경로를 열 수 있게 하는 디렉터리 권한은?</>
        : <><code>plan.txt</code> has an r bit available to Joon, but its parent directory <code>/srv/release</code> has no x bit available to Joon. Which directory permission enables opening the file path?</>,
      options: [
        {
          value: "execute-allows-traversal",
          label: t(
            "디렉터리 x가 경로 탐색을 허용",
            "Directory x permits path traversal",
          ),
        },
        {
          value: "read-alone-opens-path",
          label: t(
            "디렉터리 r만 있으면 경로를 열 수 있음",
            "Directory r alone is enough to open the path",
          ),
        },
        {
          value: "file-write-opens-parent",
          label: t(
            "대상 파일 w가 부모 디렉터리를 열어 줌",
            "The target file's w bit opens its parent directory",
          ),
        },
      ],
      correctAnswer: linuxPermissionQuestions["directory-search"].correctAnswer,
      answerLabel: t(
        "정답: 디렉터리 x는 search/traverse",
        "Answer: directory x means search/traverse",
      ),
      correctFeedback: t(
        "맞았습니다. 디렉터리 x는 그 디렉터리를 경로 구성 요소로 통과해 알려진 이름을 찾게 합니다. r은 디렉터리 항목의 이름 목록을 읽는 별도 능력입니다.",
        "Right. Directory x lets a process traverse that directory as a path component and look up a known name. Directory r separately permits reading the list of entry names.",
      ),
      incorrectFeedback: t(
        "파일 비트는 부모 경로 검사를 건너뛰게 하지 않습니다. 각 선행 디렉터리에 search 권한인 x가 있어야 대상 파일의 r을 검사하는 단계까지 도달합니다.",
        "File bits do not bypass checks on the parent path. Each preceding directory needs x for search before the request can reach the target file's r check.",
      ),
    },
    {
      id: "delete-boundary",
      index: "04",
      prompt: isKo
        ? <>sticky bit·ACL 같은 추가 규칙이 없는 기본 모델에서 <code>/srv/release/old.txt</code>의 이름을 삭제하려면 어느 권한이 핵심일까요?</>
        : <>In the basic model without extra rules such as sticky bits or ACLs, which permission is decisive for removing the name <code>/srv/release/old.txt</code>?</>,
      options: [
        {
          value: "parent-write-and-search",
          label: t(
            "부모 디렉터리 /srv/release의 w+x",
            "w+x on the parent directory /srv/release",
          ),
        },
        {
          value: "target-file-write",
          label: t(
            "대상 old.txt의 w",
            "w on the target old.txt",
          ),
        },
        {
          value: "target-file-read",
          label: t(
            "대상 old.txt의 r",
            "r on the target old.txt",
          ),
        },
      ],
      correctAnswer: linuxPermissionQuestions["delete-boundary"].correctAnswer,
      answerLabel: t(
        "정답: 부모 디렉터리의 w+x",
        "Answer: w+x on the parent directory",
      ),
      correctFeedback: t(
        "맞았습니다. 삭제는 파일 내용을 쓰는 작업이 아니라 부모 디렉터리에서 이름과 inode의 연결을 제거하는 작업입니다. 그래서 부모의 w와 x를 함께 검사합니다.",
        "Right. Deletion does not write the file contents; it removes the name-to-inode link from the parent directory. That is why both w and x are checked on the parent.",
      ),
      incorrectFeedback: t(
        "읽기 전용 파일도 부모 디렉터리에 w+x가 있으면 이름이 제거될 수 있습니다. 파일 내용의 r·w가 아니라 이름을 보관한 부모 디렉터리의 변경·탐색 권한을 찾으세요.",
        "Even a read-only file can have its name removed when the parent grants w+x. Look at change and search permissions on the directory holding the name, not r or w on the file contents.",
      ),
    },
    {
      id: "least-privilege",
      index: "05",
      prompt: t(
        "reviewers는 release 디렉터리를 탐색·목록화하고 plan.txt를 읽어야 하지만, 파일 수정·생성·삭제는 하면 안 됩니다. 가장 좋은 정책 선택 원칙은?",
        "Reviewers must traverse and list the release directory and read plan.txt, but must not modify the file or create or delete entries. Which policy principle is best?",
      ),
      options: [
        {
          value: "smallest-sufficient-grant",
          label: t(
            "필요한 주체·객체·동작에만 최소 비트를 부여하고 결과를 검증",
            "Grant only the minimum bits for the required subjects, objects, and actions, then verify the result",
          ),
        },
        {
          value: "chmod-777",
          label: t(
            "실패를 피하도록 디렉터리와 파일을 모두 chmod 777",
            "Use chmod 777 on both directory and file to avoid failures",
          ),
        },
        {
          value: "allow-then-audit-later",
          label: t(
            "우선 모든 쓰기를 허용하고 나중에 필요 여부를 감사",
            "Allow all writes first and audit whether they were needed later",
          ),
        },
      ],
      correctAnswer: linuxPermissionQuestions["least-privilege"].correctAnswer,
      answerLabel: t(
        "정답: 필요한 동작만 가능한 가장 작은 권한",
        "Answer: the smallest grant that permits only the required actions",
      ),
      correctFeedback: t(
        "맞았습니다. 정책은 성공해야 하는 동작뿐 아니라 실패해야 하는 동작도 함께 명시해야 합니다. reviewers의 read·list·traverse는 통과시키고 write·create·delete는 계속 거부되는지 검증하세요.",
        "Right. A policy must state both what should succeed and what must still fail. Verify reviewer read, list, and traverse access while write, create, and delete remain denied.",
      ),
      incorrectFeedback: t(
        "777이나 선허용은 당장 오류를 숨기지만 관계없는 사용자에게 수정·실행 권한까지 엽니다. 요구된 접근을 만족하는 가장 작은 비트 집합과 거부 조건을 함께 검사하세요.",
        "777 or allow-first policies may hide the immediate error, but they also expose modification and execution to unrelated users. Check the smallest bit set that meets the required access and preserves the required denials.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE PERMISSION DECISION",
        title: t(
          "주체·클래스·경로·객체 경계를 순서대로 판정하세요",
          "Evaluate the subject, class, path, and object boundaries in order",
        ),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마치면 챕터 완료 조건이 열립니다.",
          "Finish all five questions and both required activities to unlock the chapter gate.",
        ),
        correct: t("권한 경계를 정확히 읽었습니다", "Permission boundary read correctly"),
        incorrect: t("첫 번째 거부 경계를 다시 찾으세요", "Find the first denial boundary again"),
        checkAnswers: t("권한 판정 확인하기", "Check the permission decisions"),
        completed: t(
          "이해 확인 완료 — 두 필수 활동의 완료 상태를 확인하세요.",
          "Concept check complete — now confirm both required activity states.",
        ),
        retry: t(
          "아직 섞인 경계가 있습니다. 프로세스 자격 증명부터 한 클래스 선택, 경로 x, 대상 또는 부모 권한 순서로 다시 추적하세요.",
          "Some boundaries are still mixed up. Trace again from process credentials to one selected class, path x, and then target or parent permissions.",
        ),
        idle: t(
          "다섯 답을 고른 뒤 권한 판정 순서를 확인하세요.",
          "Choose all five answers, then check the permission-decision order.",
        ),
      }}
    />
  );
}

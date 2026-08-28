import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId =
  | "absolute-path"
  | "relative-path"
  | "permission-error"
  | "path-after-cd"
  | "error-evidence-scope";

export function LinuxConceptCheck({
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
      id: "absolute-path",
      index: "01",
      prompt: t(
        "현재 위치와 관계없이 같은 파일을 가리키는 절대 경로는 어떤 문자로 시작할까요?",
        "Which character begins an absolute path that points to the same file regardless of your current directory?",
      ),
      options: [
        { value: "slash", label: "/" },
        { value: "dot", label: "." },
        { value: "tilde", label: "~" },
      ],
      correctAnswer: "slash",
      answerLabel: t("정답: /", "Answer: /"),
      correctFeedback: t(
        "맞았습니다. /는 파일시스템의 루트에서 경로를 시작합니다.",
        "Right. / starts the path at the filesystem root.",
      ),
      incorrectFeedback: t(
        ".은 현재 디렉터리, ~는 홈 디렉터리를 뜻합니다. 절대 경로는 루트인 /에서 시작합니다.",
        ". means the current directory and ~ means the home directory. An absolute path starts at the root, /.",
      ),
    },
    {
      id: "relative-path",
      index: "02",
      prompt: isKo
        ? <>현재 위치가 <code>/home/student</code>일 때 <code>cat readme.txt</code>는 어느 파일을 읽을까요?</>
        : <>When the current directory is <code>/home/student</code>, which file does <code>cat readme.txt</code> read?</>,
      options: [
        { value: "current-directory", label: "/home/student/readme.txt" },
        { value: "root-directory", label: "/readme.txt" },
        { value: "etc-directory", label: "/etc/readme.txt" },
      ],
      correctAnswer: "current-directory",
      answerLabel: <code>/home/student/readme.txt</code>,
      correctFeedback: t(
        "맞았습니다. /로 시작하지 않는 상대 경로는 현재 디렉터리를 기준으로 해석됩니다.",
        "Right. A relative path without a leading / is resolved from the current directory.",
      ),
      incorrectFeedback: t(
        "readme.txt는 상대 경로이므로 현재 위치 /home/student 뒤에 붙여 해석합니다.",
        "readme.txt is relative, so it is resolved beneath the current directory, /home/student.",
      ),
    },
    {
      id: "permission-error",
      index: "03",
      prompt: isKo
        ? <><code>echo "change" &gt; /etc/os-release</code>가 권한 오류로 실패한 가장 직접적인 이유는 무엇일까요?</>
        : <>Why does <code>echo "change" &gt; /etc/os-release</code> fail with a permission error?</>,
      options: [
        { value: "protected-file", label: t("student가 root 소유 파일을 쓸 수 없어서", "student cannot write a root-owned file") },
        { value: "missing-file", label: t("파일이 존재하지 않아서", "the file does not exist") },
        { value: "invalid-echo", label: t("echo는 파일에 쓸 수 없어서", "echo cannot write to files") },
      ],
      correctAnswer: "protected-file",
      answerLabel: t("정답: 소유권과 쓰기 권한", "Answer: ownership and write permission"),
      correctFeedback: t(
        "맞았습니다. 실패는 파일이 보호되고 있다는 시스템 상태를 알려 줍니다.",
        "Right. The failure reveals that the file is protected by the system's ownership and permission rules.",
      ),
      incorrectFeedback: t(
        "파일은 존재하고 리다이렉션도 올바릅니다. student 사용자에게 root 소유 파일의 쓰기 권한이 없습니다.",
        "The file exists and the redirection is valid. The student user lacks write permission on the root-owned file.",
      ),
    },
    {
      id: "path-after-cd",
      index: "04",
      prompt: isKo
        ? <><code>cd /var/log</code> 다음에 <code>cat boot.log</code>를 실행하면 상대 경로는 어디에서 시작할까요?</>
        : <>After <code>cd /var/log</code>, where does the relative path in <code>cat boot.log</code> begin?</>,
      options: [
        { value: "new-working-directory", label: "/var/log/boot.log" },
        { value: "previous-directory", label: "/home/student/boot.log" },
        { value: "filesystem-root", label: "/boot.log" },
      ],
      correctAnswer: "new-working-directory",
      answerLabel: <code>/var/log/boot.log</code>,
      correctFeedback: t(
        "맞았습니다. cd가 프로세스의 현재 작업 디렉터리를 바꾸므로 이후 상대 경로의 기준도 함께 바뀝니다.",
        "Right. cd changes the process working directory, so later relative paths use the new location.",
      ),
      incorrectFeedback: t(
        "상대 경로는 명령을 실행하는 순간의 현재 작업 디렉터리에서 해석됩니다.",
        "A relative path is resolved from the working directory at the moment the command runs.",
      ),
    },
    {
      id: "error-evidence-scope",
      index: "05",
      prompt: t(
        "Permission denied가 직접 증명하는 범위를 가장 정확히 고르세요.",
        "Choose the most precise claim directly supported by Permission denied.",
      ),
      options: [
        { value: "operation-denied-at-path", label: t("현재 자격으로 해당 경로의 연산이 거부됨", "The operation at that path was denied for the current credentials") },
        { value: "file-is-corrupt", label: t("파일 내용이 손상됨", "The file contents are corrupt") },
        { value: "command-never-ran", label: t("명령 자체가 실행되지 않음", "The command itself never ran") },
      ],
      correctAnswer: "operation-denied-at-path",
      answerLabel: t("정답: 현재 자격·경로·연산의 거부", "Answer: denial at the credential, path, and operation boundary"),
      correctFeedback: t(
        "맞았습니다. 오류는 실패 경계를 좁혀 주지만 파일 손상이나 명령 미실행까지 증명하지는 않습니다.",
        "Right. The error narrows the failed boundary but does not prove corruption or that the command never started.",
      ),
      incorrectFeedback: t(
        "오류 문구가 직접 보여 주는 사실만 주장하세요. 현재 사용자로 해당 경로의 연산이 거부됐다는 증거입니다.",
        "Claim only what the message directly shows: the operation at that path was denied for the current user.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE SYSTEM STATE",
        title: t(
          "명령을 외우기보다 경로와 오류의 규칙을 설명해 보세요",
          "Explain the rules behind paths and errors instead of memorizing commands",
        ),
        description: t(
          "다섯 문제를 모두 맞히고 필수 실습을 마치면 챕터를 완료할 수 있습니다.",
          "Answer all five questions and finish the required lab to complete this chapter.",
        ),
        correct: t("정답이에요", "Correct"),
        incorrect: t("다시 살펴봐요", "Take another look"),
        checkAnswers: t("답 확인하기", "Check answers"),
        completed: t(
          "이해 확인 완료 — 이제 실습 완료 상태를 확인하세요.",
          "Concept check complete — now confirm your lab status.",
        ),
        retry: t(
          "아직 연결되지 않은 규칙이 있습니다. 설명을 읽고 다시 답해 보세요.",
          "One or more rules are still disconnected. Read the explanations and try again.",
        ),
        idle: t(
          "다섯 답을 고른 뒤 확인해 보세요.",
          "Choose all five answers, then check your work.",
        ),
      }}
    />
  );
}

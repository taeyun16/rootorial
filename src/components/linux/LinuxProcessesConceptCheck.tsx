import { linuxProcessQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxProcessQuestions;

export function LinuxProcessesConceptCheck({
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
      id: "program-vs-process",
      index: "01",
      prompt: t(
        "같은 /usr/bin/report 프로그램을 셸에서 두 번 실행하면 무엇을 관찰할 수 있을까요?",
        "What can you observe after launching the same /usr/bin/report program twice from a shell?",
      ),
      options: [
        { value: "same-program-distinct-processes", label: t("같은 프로그램 이미지지만 서로 다른 PID의 두 프로세스", "Two processes with distinct PIDs running the same program image") },
        { value: "one-program-one-pid", label: t("프로그램 파일마다 영구 PID 하나", "One permanent PID for each program file") },
        { value: "pid-identifies-file", label: t("PID가 실행 파일 자체의 번호", "The PID is the program file's own number") },
      ],
      correctAnswer: linuxProcessQuestions["program-vs-process"].correctAnswer,
      answerLabel: t("정답: 같은 프로그램, 다른 프로세스", "Answer: same program, distinct processes"),
      correctFeedback: t(
        "맞았습니다. 프로그램은 실행할 바이트가 담긴 파일이고, 프로세스는 그 프로그램을 실행하는 한 인스턴스입니다.",
        "Right. A program is a file containing executable bytes; a process is one running instance of that program.",
      ),
      incorrectFeedback: t(
        "PID는 실행 파일에 붙은 영구 번호가 아닙니다. 실행할 때마다 별도 프로세스가 생기며 PID는 나중에 재사용될 수도 있습니다.",
        "A PID is not a permanent number attached to a file. Each launch creates a distinct process, and PIDs may later be reused.",
      ),
    },
    {
      id: "fork-exec-pid",
      index: "02",
      prompt: t(
        "일반적인 셸 모델에서 fork로 PID 73 자식이 생긴 뒤 그 자식이 exec에 성공했습니다. PID 73에는 무슨 일이 생길까요?",
        "In a typical shell model, fork creates child PID 73 and that child successfully execs. What happens to PID 73?",
      ),
      options: [
        { value: "exec-replaces-image-keeps-pid", label: t("프로그램 이미지는 교체되지만 PID 73은 유지", "The program image is replaced while PID 73 stays") },
        { value: "exec-creates-another-pid", label: t("exec가 새 PID 74를 추가 생성", "exec creates another PID 74") },
        { value: "fork-replaces-shell", label: t("부모 셸 PID 42가 사라짐", "Parent shell PID 42 disappears") },
      ],
      correctAnswer: linuxProcessQuestions["fork-exec-pid"].correctAnswer,
      answerLabel: t("정답: exec 뒤에도 같은 PID", "Answer: the same PID after exec"),
      correctFeedback: t(
        "맞았습니다. fork가 자식을 만들고, exec는 호출한 자식의 프로그램 이미지와 주소 공간 내용을 교체합니다. 성공한 exec는 이전 프로그램으로 돌아오지 않습니다.",
        "Right. fork creates the child; exec replaces the calling child's program image and address-space contents. A successful exec does not return to the old program.",
      ),
      incorrectFeedback: t(
        "새 PID를 만드는 경계는 fork입니다. exec는 이미 존재하는 호출 프로세스를 다른 프로그램으로 바꿉니다.",
        "fork is the boundary that creates a new PID. exec changes the program inside an existing calling process.",
      ),
    },
    {
      id: "stdio-redirection",
      index: "03",
      prompt: isKo
        ? <><code>report &gt; out.log</code>가 stdout에는 쓰고 stderr에도 오류를 냈습니다. 별도 지정이 없다면 어디에 보일까요?</>
        : <><code>report &gt; out.log</code> writes to stdout and also reports an error on stderr. Where do they appear without another redirection?</>,
      options: [
        { value: "redirects-stdout-only", label: t("stdout은 out.log, stderr는 terminal", "stdout goes to out.log; stderr stays on the terminal") },
        { value: "redirects-all-three", label: t("stdin·stdout·stderr가 모두 out.log", "stdin, stdout, and stderr all go to out.log") },
        { value: "changes-program-file", label: t("report 실행 파일 자체가 out.log로 이동", "The report executable itself moves to out.log") },
      ],
      correctAnswer: linuxProcessQuestions["stdio-redirection"].correctAnswer,
      answerLabel: t("정답: fd 1만 out.log", "Answer: only fd 1 goes to out.log"),
      correctFeedback: t(
        "맞았습니다. >는 기본적으로 stdout인 fd 1의 연결만 바꿉니다. stderr인 fd 2는 2>처럼 따로 바꾸지 않으면 terminal에 남습니다.",
        "Right. > changes the connection for stdout, fd 1. stderr, fd 2, stays on the terminal unless redirected separately, such as with 2>.",
      ),
      incorrectFeedback: t(
        "리다이렉션은 프로그램 파일을 옮기는 동작이 아니라 열린 파일 디스크립터의 목적지를 바꾸는 동작입니다. >의 기본 대상은 fd 1입니다.",
        "Redirection changes an open file descriptor's destination; it does not move the program file. > targets fd 1 by default.",
      ),
    },
    {
      id: "signal-choice",
      index: "04",
      prompt: t(
        "서비스를 종료해야 하지만 정리 작업을 할 기회를 먼저 주고 싶습니다. 합리적인 순서는 무엇일까요?",
        "You must stop a service but want to give it a chance to clean up first. What is a reasonable sequence?",
      ),
      options: [
        { value: "term-before-kill", label: t("SIGTERM을 보내고 관찰한 뒤, 무응답일 때만 SIGKILL", "Send SIGTERM and observe; use SIGKILL only if it remains unresponsive") },
        { value: "kill-first", label: t("항상 SIGKILL부터 보내기", "Always begin with SIGKILL") },
        { value: "stop-then-wait", label: t("SIGSTOP 뒤 바로 waitpid", "Send SIGSTOP and immediately waitpid") },
      ],
      correctAnswer: linuxProcessQuestions["signal-choice"].correctAnswer,
      answerLabel: t("정답: TERM 뒤 필요할 때 KILL", "Answer: TERM, then KILL only if needed"),
      correctFeedback: t(
        "맞았습니다. SIGTERM은 처리하거나 무시할 수 있어 정리 기회를 줍니다. SIGKILL은 catch·block·ignore할 수 없어 마지막 강제 수단입니다.",
        "Right. SIGTERM can be handled or ignored, allowing cleanup. SIGKILL cannot be caught, blocked, or ignored, so it is the final forceful step.",
      ),
      incorrectFeedback: t(
        "SIGSTOP은 종료가 아니고 waitpid는 종료한 자식의 정보를 회수합니다. 먼저 협력적 SIGTERM을 보내고 실제 상태를 관찰하세요.",
        "SIGSTOP does not terminate, and waitpid collects an exited child's status. Start with cooperative SIGTERM and observe the actual state.",
      ),
    },
    {
      id: "wait-reaps-child",
      index: "05",
      prompt: t(
        "자식이 실행을 끝냈지만 부모가 아직 wait하지 않아 ps에 Z로 남았습니다. 이 상태를 정확히 설명한 것은?",
        "A child finished executing, but its parent has not waited yet, so ps shows Z. Which description is accurate?",
      ),
      options: [
        { value: "zombie-until-wait", label: t("CPU 작업은 끝났고 부모가 종료 정보를 회수할 때까지 행이 남음", "CPU work is finished; a row remains until the parent collects termination status") },
        { value: "signal-reaps-zombie", label: t("zombie에 SIGKILL을 보내면 부모 대신 회수", "SIGKILL sent to the zombie reaps it for the parent") },
        { value: "zombie-still-runs", label: t("zombie가 CPU를 계속 사용하며 실행 중", "The zombie keeps running on the CPU") },
      ],
      correctAnswer: linuxProcessQuestions["wait-reaps-child"].correctAnswer,
      answerLabel: t("정답: 종료 정보가 wait를 기다림", "Answer: termination status awaits wait"),
      correctFeedback: t(
        "맞았습니다. zombie는 이미 실행을 끝냈습니다. 부모의 wait 계열 호출이 종료 정보를 회수하면 커널이 남은 프로세스 항목을 제거합니다.",
        "Right. A zombie has finished executing. After a wait-family call collects its termination status, the kernel removes the remaining process entry.",
      ),
      incorrectFeedback: t(
        "Z는 멈추거나 실행 중인 상태가 아니라 이미 종료한 상태입니다. 더 강한 signal이 아니라 부모의 wait가 필요합니다.",
        "Z means already exited, not stopped or still running. It needs the parent's wait, not a stronger signal.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "READ THE PROCESS STATE",
        title: t("PID·stdio·signal·wait를 하나의 수명주기로 연결하세요", "Connect PID, stdio, signals, and wait into one lifecycle"),
        description: t("다섯 문제와 두 필수 활동을 모두 마치면 챕터 완료 조건이 열립니다.", "Finish all five questions and both required activities to unlock the chapter gate."),
        correct: t("상태 근거를 정확히 읽었습니다", "State evidence read correctly"),
        incorrect: t("상태 전이를 다시 확인하세요", "Recheck the state transition"),
        checkAnswers: t("프로세스 수명주기 확인하기", "Check the process lifecycle"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("아직 섞인 경계가 있습니다. 생성은 fork, 교체는 exec, 종료 정보 회수는 wait입니다.", "Some boundaries are still mixed up: fork creates, exec replaces, and wait collects termination status."),
        idle: t("다섯 답을 고른 뒤 수명주기를 확인하세요.", "Choose all five answers, then check the lifecycle."),
      }}
    />
  );
}

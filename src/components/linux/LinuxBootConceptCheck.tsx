import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId =
  | "firmware-handoff"
  | "kernel-userspace-boundary"
  | "shell-origin"
  | "pid-one";

export function LinuxBootConceptCheck({
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
      id: "firmware-handoff",
      index: "01",
      prompt: t(
        "현재 v86 실험처럼 펌웨어 뒤에 커널을 직접 넘기는 모델에서, 다음 단계가 시작되려면 무엇이 있어야 할까요?",
        "In a model that hands directly from firmware to the kernel, like the current v86 experiment, what must be available next?",
      ),
      options: [
        { value: "kernel-image", label: t("실행할 커널 이미지", "A kernel image to execute") },
        { value: "shell-history", label: t("사용자의 셸 기록", "The user's shell history") },
        { value: "pid-list", label: t("완성된 PID 목록", "A complete PID list") },
      ],
      correctAnswer: "kernel-image",
      answerLabel: t("정답: 커널 이미지", "Answer: a kernel image"),
      correctFeedback: t(
        "맞았습니다. 펌웨어가 하드웨어를 준비해도 실행할 커널 이미지가 없으면 Linux는 시작되지 않습니다.",
        "Right. Firmware can prepare the machine, but Linux cannot start without a kernel image to execute.",
      ),
      incorrectFeedback: t(
        "셸 기록과 PID는 사용자 공간이 시작된 뒤의 상태입니다. 먼저 실행할 커널 이미지가 필요합니다.",
        "Shell history and PIDs are later userspace state. A kernel image must be available first.",
      ),
    },
    {
      id: "kernel-userspace-boundary",
      index: "02",
      prompt: isKo
        ? <><code>Linux version 6.x</code> 뒤에 <code>VFS: Unable to mount root fs</code>가 보입니다. 어디까지 진행된 상태일까요?</>
        : <><code>Linux version 6.x</code> is followed by <code>VFS: Unable to mount root fs</code>. How far did the system progress?</>,
      options: [
        { value: "kernel-only", label: t("커널은 실행됐지만 사용자 공간은 아직", "The kernel is running, but userspace is not") },
        { value: "firmware-only", label: t("펌웨어도 시작되지 않음", "Firmware never started") },
        { value: "shell-ready", label: t("셸 프롬프트까지 준비됨", "The shell prompt is ready") },
      ],
      correctAnswer: "kernel-only",
      answerLabel: t("정답: 커널 실행, 사용자 공간 전", "Answer: kernel running, before userspace"),
      correctFeedback: t(
        "맞았습니다. 커널 로그는 시작을 증명하지만 rootfs를 마운트하지 못하면 init을 읽어 사용자 공간을 열 수 없습니다.",
        "Right. The kernel log proves startup, but without a mounted rootfs it cannot load init and enter userspace.",
      ),
      incorrectFeedback: t(
        "Linux version 표식은 커널이 실행 중이라는 증거입니다. 그러나 rootfs 실패 뒤에는 init과 셸이 올 수 없습니다.",
        "The Linux version marker proves the kernel is running, but init and the shell cannot follow a rootfs failure.",
      ),
    },
    {
      id: "shell-origin",
      index: "03",
      prompt: t(
        "커널과 init이 모두 실행 중인데 콘솔 프롬프트가 없습니다. 가장 직접적으로 확인할 설정은 무엇일까요?",
        "The kernel and init are both running, but there is no console prompt. Which setting should you inspect first?",
      ),
      options: [
        { value: "init-starts-shell", label: t("init이 직렬 콘솔 셸을 시작하는지", "Whether init starts the serial console shell") },
        { value: "firmware-clock", label: t("펌웨어 시계가 맞는지", "Whether the firmware clock is correct") },
        { value: "root-directory-name", label: t("/ 디렉터리 이름을 바꿨는지", "Whether the / directory was renamed") },
      ],
      correctAnswer: "init-starts-shell",
      answerLabel: t("정답: init의 직렬 콘솔 셸 설정", "Answer: init's serial console shell setting"),
      correctFeedback: t(
        "맞았습니다. 이 고정 v86 게스트의 정상 프롬프트는 커널 자체가 아니라 BusyBox init이 시작한 직렬 /bin/sh에서 나옵니다.",
        "Right. In this fixed v86 guest, the expected prompt comes from the serial /bin/sh started by BusyBox init, not from the kernel itself.",
      ),
      incorrectFeedback: t(
        "init이 이미 실행 중이라는 표식을 사용하세요. 남은 경계는 init에서 콘솔 셸로 넘어가는 과정입니다.",
        "Use the marker that init is already running. The remaining boundary is from init to the console shell.",
      ),
    },
    {
      id: "pid-one",
      index: "04",
      prompt: t(
        "다음 챕터에서 프로세스 트리를 볼 때 PID 1에서 시작하는 프로그램은 무엇일까요?",
        "When you inspect a process tree in the next chapter, which program begins at PID 1?",
      ),
      options: [
        { value: "init", label: "init" },
        { value: "firmware", label: t("펌웨어", "firmware") },
        { value: "kernel", label: t("커널", "kernel") },
      ],
      correctAnswer: "init",
      answerLabel: t("정답: init", "Answer: init"),
      correctFeedback: t(
        "맞았습니다. 커널이 시작한 첫 사용자 공간 프로세스인 init이 PID 1이 되고 이후 서비스를 낳습니다.",
        "Right. Init is the first userspace process started by the kernel, becomes PID 1, and launches later services.",
      ),
      incorrectFeedback: t(
        "펌웨어와 커널은 사용자 공간 프로세스가 아닙니다. PID 1은 커널이 실행한 init입니다.",
        "Firmware and the kernel are not userspace processes. PID 1 is init, launched by the kernel.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE THE HANDOFF",
        title: t(
          "프롬프트를 결과로 보고 그 앞의 경계를 설명하세요",
          "Treat the prompt as evidence and explain the boundaries before it",
        ),
        description: t(
          "네 문제를 모두 맞히고 두 필수 활동을 마치면 챕터 완료 조건이 충족됩니다.",
          "Answer all four questions and finish both required activities to satisfy the chapter gate.",
        ),
        correct: t("경계를 정확히 읽었습니다", "Boundary read correctly"),
        incorrect: t("마지막 성공 표식을 확인하세요", "Check the last good marker"),
        checkAnswers: t("부팅 흐름 확인하기", "Check the boot flow"),
        completed: t(
          "이해 확인 완료 — 이제 두 활동의 완료 상태를 확인하세요.",
          "Concept check complete — now confirm both activity states.",
        ),
        retry: t(
          "아직 섞인 경계가 있습니다. 각 로그에서 마지막으로 성공한 주체를 다시 찾으세요.",
          "One or more boundaries are still mixed up. Find the last successful actor in each log.",
        ),
        idle: t(
          "네 답을 고른 뒤 부팅 흐름을 확인하세요.",
          "Choose all four answers, then check the boot flow.",
        ),
      }}
    />
  );
}

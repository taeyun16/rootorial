import { linuxTinySystemQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxTinySystemQuestions;

export function LinuxTinySystemConceptCheck({
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
      id: "artifact-runtime-boundary",
      index: "01",
      prompt: isKo
        ? <><code>kernel</code>은 initramfs를 풀었지만 이 fixture의 <code>/init</code>을 찾지 못했습니다. artifact와 runtime state의 경계를 지키는 수리는 무엇일까요?</>
        : <>The <code>kernel</code> unpacked the initramfs but could not find this fixture&apos;s <code>/init</code>. Which repair respects the boundary between artifacts and runtime state?</>,
      options: [
        {
          value: "rootfs-carries-userspace",
          label: t(
            "initramfs manifest에 /init과 필요한 userspace binary를 넣고 archive를 다시 만든다",
            "Add /init and the required userspace binaries to the initramfs manifest, then rebuild the archive",
          ),
        },
        {
          value: "kernel-config-creates-binaries",
          label: t(
            "kernel config에서 init과 reportd를 켜면 커널이 userspace binary를 자동 생성한다",
            "Enable init and reportd in the kernel configuration so the kernel creates the userspace binaries",
          ),
        },
        {
          value: "runtime-state-persisted-in-image",
          label: t(
            "실행 중인 PID·route·listener를 image에 저장하면 다음 boot에서 init 없이 복원된다",
            "Store live PIDs, routes, and listeners in the image so the next boot restores them without init",
          ),
        },
      ],
      correctAnswer: linuxTinySystemQuestions["artifact-runtime-boundary"].correctAnswer,
      answerLabel: t(
        "정답: kernel image와 rootfs userspace는 서로 다른 artifact 계약",
        "Answer: the kernel image and rootfs userspace are separate artifact contracts",
      ),
      correctFeedback: t(
        "맞았습니다. 커널은 준비된 rootfs에서 init을 실행할 뿐 userspace 프로그램을 만들어 주지 않습니다. PID, mount, route와 listener는 그 artifact들이 부팅된 뒤 생기는 runtime state입니다.",
        "Right. The kernel executes init from the supplied rootfs; it does not create userspace programs. PIDs, mounts, routes, and listeners are runtime state created after those artifacts boot.",
      ),
      incorrectFeedback: t(
        "build artifact와 실행 중 상태를 분리하세요. /init과 reportd 같은 파일은 initramfs에 있어야 하며, PID·route·listener는 PID 1의 동작으로 부팅 뒤 다시 만들어집니다.",
        "Separate build artifacts from live state. Files such as /init and reportd belong in the initramfs, while PID 1 recreates PIDs, routes, and listeners after boot.",
      ),
    },
    {
      id: "pid-one-service-order",
      index: "02",
      prompt: isKo
        ? <>rootfs에는 모든 파일이 있지만 <code>eth0</code>은 down이고 address·default route가 없습니다. PID 1이 <code>reportd</code>를 안정적으로 준비시키는 순서는?</>
        : <>The rootfs contains every file, but <code>eth0</code> is down and has no address or default route. In what order should PID 1 make <code>reportd</code> ready?</>,
      options: [
        {
          value: "mount-network-then-service",
          label: t(
            "필요한 filesystem mount → link up·address·route → reportd fork/exec → bind/listen",
            "Mount required filesystems → configure link, address, and route → fork/exec reportd → bind/listen",
          ),
        },
        {
          value: "service-before-prerequisites",
          label: t(
            "reportd를 먼저 시작하고, 실패하면 그 뒤에 mount와 network를 임의 순서로 추가",
            "Start reportd first, then add mounts and networking in any order after it fails",
          ),
        },
        {
          value: "prompt-proves-service-ready",
          label: t(
            "직렬 shell prompt가 보이면 service도 준비됐으므로 PID 1의 추가 설정은 불필요",
            "A serial shell prompt proves the service is ready, so PID 1 needs no further setup",
          ),
        },
      ],
      correctAnswer: linuxTinySystemQuestions["pid-one-service-order"].correctAnswer,
      answerLabel: t(
        "정답: service보다 먼저 storage와 network 계약을 만족",
        "Answer: satisfy storage and network contracts before starting the service",
      ),
      correctFeedback: t(
        "맞았습니다. PID 1은 단지 첫 프로세스가 아니라 userspace 의존성을 순서대로 만드는 주체입니다. prompt는 shell 준비만 증명하며 reportd의 파일·network·listener 준비를 대신하지 않습니다.",
        "Right. PID 1 is not merely the first process; it establishes userspace dependencies in order. A prompt proves only shell readiness, not reportd's file, network, or listener readiness.",
      ),
      incorrectFeedback: t(
        "service가 소비하는 상태를 먼저 찾으세요. mount와 path, link·address·route가 준비된 뒤 자식 process를 exec하고 listener를 만들어야 실패 경계를 정확히 읽을 수 있습니다.",
        "Identify the state consumed by the service first. Prepare mounts and paths plus the link, address, and route before execing the child process and creating its listener.",
      ),
    },
    {
      id: "least-privilege-service",
      index: "03",
      prompt: isKo
        ? <><code>reportd</code>는 UID 1100으로 실행되고 <code>/srv/report.txt</code>는 <code>root:report(4000) 0640</code>입니다. 필요한 읽기만 복구하는 최소 권한 수리는?</>
        : <><code>reportd</code> runs as UID 1100, while <code>/srv/report.txt</code> is <code>root:report(4000) 0640</code>. Which least-privilege repair restores only the required read?</>,
      options: [
        {
          value: "group-read-without-world-write",
          label: t(
            "reportd의 egid 또는 supplementary group에 GID 4000을 부여하고 0640은 유지",
            "Give reportd GID 4000 as its egid or a supplementary group and retain mode 0640",
          ),
        },
        {
          value: "run-service-as-root",
          label: t(
            "모든 파일을 읽을 수 있도록 reportd를 UID 0으로 실행",
            "Run reportd as UID 0 so it can read every file",
          ),
        },
        {
          value: "chmod-world-writable",
          label: t(
            "읽기 오류를 확실히 없애도록 파일과 상위 디렉터리를 0777로 변경",
            "Change the file and parent directories to 0777 to eliminate the read error",
          ),
        },
      ],
      correctAnswer: linuxTinySystemQuestions["least-privilege-service"].correctAnswer,
      answerLabel: t(
        "정답: 필요한 group read만 부여하고 root·world write는 열지 않음",
        "Answer: grant the required group read without opening root or world write",
      ),
      correctFeedback: t(
        "맞았습니다. process credentials가 group class를 선택하게 하면 파일의 기존 group-read bit로 요구를 충족합니다. root 실행이나 0777은 관계없는 권한까지 넓혀 최소 수정 계약을 깨뜨립니다.",
        "Right. Letting the process credentials select the group class satisfies the requirement through the existing group-read bit. Running as root or using 0777 widens unrelated authority and violates the minimal-repair contract.",
      ),
      incorrectFeedback: t(
        "성공 여부뿐 아니라 수리 뒤 남는 권한도 검사하세요. reportd가 필요한 group에 속하면 0640의 read를 사용할 수 있고 다른 사용자나 쓰기 권한은 넓힐 필요가 없습니다.",
        "Inspect the authority left after the repair, not only whether it succeeds. Membership in the required group uses the read bit in 0640 without widening access for other users or granting writes.",
      ),
    },
    {
      id: "readiness-evidence",
      index: "04",
      prompt: isKo
        ? <>shell prompt가 보이고 client TCP가 ACK를 받았습니다. <code>reportd</code>가 report 파일을 읽어 remote application에 전달했다는 결론에 필요한 증거는?</>
        : <>A shell prompt is visible and the client TCP received an ACK. What evidence is required to conclude that <code>reportd</code> read the report file and delivered it to the remote application?</>,
      options: [
        {
          value: "probe-each-boundary",
          label: t(
            "mount·credentials·file read trace, ip address·route, ss listener/connection, send event와 peer recv를 경계별로 확인",
            "Check mounts, credentials, and the file-read trace; IP address and route; listener and connection state; the send event; and peer recv at their own boundaries",
          ),
        },
        {
          value: "prompt-proves-all",
          label: t(
            "prompt는 kernel·filesystem·network·service·remote application 전체가 준비됐다는 단일 증거",
            "The prompt alone proves that the kernel, filesystem, network, service, and remote application are all ready",
          ),
        },
        {
          value: "tcp-ack-proves-app",
          label: t(
            "TCP ACK는 remote process가 recv와 업무 처리까지 끝냈음을 직접 증명",
            "A TCP ACK directly proves that the remote process completed recv and business processing",
          ),
        },
      ],
      correctAnswer: linuxTinySystemQuestions["readiness-evidence"].correctAnswer,
      answerLabel: t(
        "정답: 각 probe는 자기 경계까지만 증명",
        "Answer: every probe establishes only its own boundary",
      ),
      correctFeedback: t(
        "맞았습니다. prompt, route, listener, send, transport ACK와 application recv는 서로 다른 상태입니다. 마지막 결론은 그 경계들의 ordered evidence가 모두 있을 때만 성립합니다.",
        "Right. A prompt, route, listener, send, transport ACK, and application recv are distinct states. The final claim requires ordered evidence across every boundary.",
      ),
      incorrectFeedback: t(
        "한 표식을 전체 readiness로 확대하지 마세요. prompt는 shell, ACK는 peer TCP까지만 말하며, file read와 remote recv는 application trace로 따로 확인해야 합니다.",
        "Do not expand one marker into total readiness. A prompt speaks to the shell and an ACK to peer TCP; file read and remote recv require separate application evidence.",
      ),
    },
    {
      id: "optional-v86-scope",
      index: "05",
      prompt: isKo
        ? <>선택형 v86가 외부의 고정 Buildroot image를 32-bit x86 PC로 부팅했습니다. 이 관찰이 이 챕터에서 직접 증명하는 것은?</>
        : <>The optional v86 runtime booted a fixed external Buildroot image as a 32-bit x86 PC. What does this observation directly establish in this chapter?</>,
      options: [
        {
          value: "fixed-guest-observation-only",
          label: t(
            "고정 guest의 실제 kernel·PID 1·mount·shell 표식을 비교할 수 있지만 학습자 artifact build나 network 경로는 증명하지 않음",
            "It lets us compare real kernel, PID 1, mount, and shell markers in the fixed guest, but proves neither a learner-built artifact nor a network path",
          ),
        },
        {
          value: "v86-builds-student-artifact",
          label: t(
            "v86가 브라우저에서 학습자의 Buildroot config를 compile하고 custom rootfs를 만들었다는 증거",
            "It proves that v86 compiled the learner's Buildroot configuration and produced a custom rootfs in the browser",
          ),
        },
        {
          value: "v86-proves-network-path",
          label: t(
            "guest 배너에 network 문구가 있으므로 실제 NIC·route·reportd end-to-end 경로가 검증됐다는 증거",
            "Because the guest banner mentions networking, it proves a real NIC, route, and end-to-end reportd path",
          ),
        },
      ],
      correctAnswer: linuxTinySystemQuestions["optional-v86-scope"].correctAnswer,
      answerLabel: t(
        "정답: 실제 고정 guest 관찰이며 build·network 완료 증거는 아님",
        "Answer: observation of a real fixed guest, not evidence of a completed build or network path",
      ),
      correctFeedback: t(
        "맞았습니다. v86 선택 심화는 실제 kernel 표식을 모델과 비교하는 데 유용하지만 prebuilt image를 부팅하며 emulated NIC에 network relay/backend를 연결하지 않습니다. 그래서 외부 service 경로는 증명되지 않고 필수 조립과 완료 판정은 결정론적 모델에 남습니다.",
        "Right. The optional v86 run is useful for comparing real kernel markers with the model, but it boots a prebuilt image and connects no network relay or backend to its emulated NIC. It therefore proves no external service path, and required assembly and completion remain in the deterministic model.",
      ),
      incorrectFeedback: t(
        "관찰한 것과 만들거나 검증한 것을 구분하세요. 고정 image 부팅은 kernel·PID 1·mount·shell을 보여 주지만 custom Buildroot build 또는 실제 network service 경로를 만들지 않습니다.",
        "Separate what was observed from what was built or verified. Booting a fixed image exposes the kernel, PID 1, mounts, and shell; it does not create a custom Buildroot build or a real network service path.",
      ),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "ASSEMBLE ARTIFACT → PID 1 → SERVICE → EVIDENCE",
        title: t(
          "작은 Linux의 artifact와 readiness 계약을 연결하세요",
          "Connect artifact and readiness contracts in a tiny Linux system",
        ),
        description: t(
          "다섯 문제와 두 필수 활동을 모두 마치면 마지막 챕터 완료 조건이 열립니다.",
          "Complete all five questions and both required activities to unlock the final chapter gate.",
        ),
        correct: t(
          "시스템 조립 경계를 정확히 연결했습니다",
          "The system assembly boundaries are connected correctly",
        ),
        incorrect: t(
          "artifact, PID 1, 권한과 readiness 증거를 다시 나누세요",
          "Separate artifacts, PID 1, permissions, and readiness evidence again",
        ),
        checkAnswers: t(
          "작은 Linux 계약 확인하기",
          "Check the tiny-Linux contracts",
        ),
        completed: t(
          "이해 확인 완료 — 조립 실습과 사건 진단의 완료 상태를 확인하세요.",
          "Concept check complete — now confirm the assembly and incident activity states.",
        ),
        retry: t(
          "build artifact와 runtime state 또는 부분 표식과 end-to-end readiness가 아직 섞여 있습니다.",
          "Build artifacts and runtime state, or partial markers and end-to-end readiness, are still mixed.",
        ),
        idle: t(
          "다섯 답을 고른 뒤 kernel image에서 remote recv까지의 계약을 확인하세요.",
          "Choose all five answers, then check the contracts from the kernel image through remote recv.",
        ),
      }}
    />
  );
}

import { linuxMemoryQuestions } from "../../features/chapters/chapter-registry";
import { useLocale } from "../../features/localization/localization";
import { useLearningAnalytics } from "../LearningAnalyticsProvider";
import {
  ConceptCheckRenderer,
  type ConceptQuestionSpec,
} from "../interactive/ConceptCheckRenderer";

type QuestionId = keyof typeof linuxMemoryQuestions;

export function LinuxMemoryConceptCheck({
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
      id: "address-translation",
      index: "01",
      prompt: t(
        "4 KiB page 모델에서 가상 주소를 물리 주소로 번역할 때 무엇이 바뀌고 무엇이 유지될까요?",
        "In the 4 KiB-page model, what changes and what stays unchanged when translating a virtual address?",
      ),
      options: [
        { value: "vpn-to-frame-offset-unchanged", label: t("VPN을 frame으로 바꾸고 page offset은 유지", "Replace the VPN with a frame; keep the page offset") },
        { value: "whole-address-becomes-frame", label: t("가상 주소 전체가 frame 번호로 바뀜", "Convert the entire virtual address into a frame number") },
        { value: "offset-selects-page-table", label: t("offset으로 page table entry를 선택", "Use the offset to select the page-table entry") },
      ],
      correctAnswer: linuxMemoryQuestions["address-translation"].correctAnswer,
      answerLabel: t("정답: VPN → frame, offset 보존", "Answer: VPN → frame, offset preserved"),
      correctFeedback: t("맞았습니다. page table은 가상 page 번호를 frame으로 매핑하고, page 내부 위치인 offset은 그대로 결합합니다.", "Right. The page table maps the virtual page number to a frame, then combines it with the unchanged in-page offset."),
      incorrectFeedback: t("VA를 page 크기로 나눠 VPN과 offset을 먼저 분리하세요. PTE lookup에는 VPN을 쓰며 offset은 frame 안의 같은 byte 위치입니다.", "First split the VA into VPN and offset using the page size. The VPN looks up the PTE; the offset selects the same byte position inside the frame."),
    },
    {
      id: "process-isolation",
      index: "02",
      prompt: t(
        "PID 420과 PID 421이 둘 다 0x4018을 읽습니다. 주소 숫자만 보고 무엇을 결론 내릴 수 있을까요?",
        "PID 420 and PID 421 both read 0x4018. What can the address number alone establish?",
      ),
      options: [
        { value: "same-va-can-map-different-frames", label: t("각 프로세스 PTE를 봐야 하며 서로 다른 frame일 수 있음", "Inspect each process's PTE; the frames can differ") },
        { value: "same-va-means-same-frame", label: t("같은 VA이면 항상 같은 물리 frame", "The same VA always means the same physical frame") },
        { value: "pid-does-not-affect-mapping", label: t("PID는 mapping 해석과 무관함", "The PID is irrelevant to mapping interpretation") },
      ],
      correctAnswer: linuxMemoryQuestions["process-isolation"].correctAnswer,
      answerLabel: t("정답: 같은 VA도 프로세스별 PTE가 다를 수 있음", "Answer: the same VA can have process-specific PTEs"),
      correctFeedback: t("맞았습니다. 주소 숫자는 프로세스의 주소 공간 안에서 해석됩니다. 공유 mapping이나 COW 전에는 같은 frame일 수도 있으므로 PTE를 확인해야 합니다.", "Right. An address number is interpreted inside a process's address space. Shared mappings or pre-write COW can also share a frame, so inspect the PTE."),
      incorrectFeedback: t("같은 VA가 항상 같거나 항상 다른 frame이라는 규칙은 없습니다. 어느 프로세스의 page table인지가 translation의 일부입니다.", "The same VA is neither always the same nor always a different frame. Which process owns the page table is part of translation."),
    },
    {
      id: "page-fault",
      index: "03",
      prompt: t(
        "TLB에서 translation을 찾지 못했지만 PTE는 present=1이고 read를 허용합니다. 다음 단계는?",
        "A translation is absent from the TLB, but the PTE has present=1 and permits reading. What happens next?",
      ),
      options: [
        { value: "tlb-miss-is-not-page-fault", label: t("page table walk 후 TLB를 채우고 접근 계속", "Walk the page table, fill the TLB, and continue") },
        { value: "every-tlb-miss-is-page-fault", label: t("모든 TLB miss는 page fault", "Every TLB miss is a page fault") },
        { value: "page-fault-always-kills-process", label: t("즉시 SIGSEGV로 프로세스 종료", "Immediately terminate the process with SIGSEGV") },
      ],
      correctAnswer: linuxMemoryQuestions["page-fault"].correctAnswer,
      answerLabel: t("정답: TLB miss ≠ page fault", "Answer: TLB miss ≠ page fault"),
      correctFeedback: t("맞았습니다. TLB는 translation cache입니다. miss는 page table walk를 유발하지만 present하고 허용된 PTE라면 fault 없이 계속합니다.", "Right. The TLB is a translation cache. A miss triggers a page-table walk, but a present, permitted PTE lets the access continue without a fault."),
      incorrectFeedback: t("translation cache miss와 PTE의 not-present/protection 상태를 분리하세요. page fault도 demand paging이나 COW라면 커널이 처리해 명령을 재개할 수 있습니다.", "Separate a translation-cache miss from not-present or protection state in the PTE. Even a page fault may be resolved by demand paging or COW so the instruction can resume."),
    },
    {
      id: "region-lifetime",
      index: "04",
      prompt: isKo
        ? <><code>/proc/421/maps</code>에 16 KiB heap VMA가 보입니다. 이 정보만으로 알 수 없는 것은?</>
        : <>A 16 KiB heap VMA appears in <code>/proc/421/maps</code>. What cannot be inferred from this alone?</>,
      options: [
        { value: "maps-shows-vmas-not-residency", label: t("각 page가 지금 물리 RAM에 resident인지", "Whether each page is currently resident in physical RAM") },
        { value: "maps-shows-only-resident-pages", label: t("VMA의 가상 주소 범위와 permission", "The VMA's virtual-address range and permissions") },
        { value: "maps-is-physical-memory-layout", label: t("mapping이 private인지 shared인지", "Whether the mapping is private or shared") },
      ],
      correctAnswer: linuxMemoryQuestions["region-lifetime"].correctAnswer,
      answerLabel: t("정답: maps는 VMA이지 residency 표가 아님", "Answer: maps lists VMAs, not residency"),
      correctFeedback: t("맞았습니다. maps는 범위·권한·private/shared·file 정보 같은 VMA 계약을 보여 주지만 PTE, frame과 현재 residency는 직접 보여 주지 않습니다.", "Right. maps shows VMA contracts such as ranges, permissions, private/shared state, and file information; it does not directly expose PTEs, frames, or current residency."),
      incorrectFeedback: t("maps 행의 범위와 rwxp 표기는 가상 mapping의 계약입니다. mapped virtual size를 resident physical memory와 같다고 두지 마세요.", "The range and rwxp fields in a maps row describe a virtual-mapping contract. Do not equate mapped virtual size with resident physical memory."),
    },
    {
      id: "copy-on-write",
      index: "05",
      prompt: t(
        "fork 직후 부모와 자식이 private heap page를 COW로 공유합니다. 자식이 그 page에 처음 쓰면?",
        "Immediately after fork, parent and child share a private heap page through COW. What happens on the child's first write?",
      ),
      options: [
        { value: "first-write-copies-that-page", label: t("그 page만 복사해 자식 PTE를 새 frame으로 연결", "Copy that page and point the child PTE to a new frame") },
        { value: "fork-copies-all-pages-eagerly", label: t("fork 시점에 주소 공간 전체를 미리 복사", "Eagerly copy the whole address space at fork") },
        { value: "write-changes-parent-page", label: t("공유 frame을 그대로 써서 부모 값도 변경", "Write the shared frame and change the parent value too") },
      ],
      correctAnswer: linuxMemoryQuestions["copy-on-write"].correctAnswer,
      answerLabel: t("정답: 첫 쓰기가 해당 private page만 분리", "Answer: the first write separates that private page"),
      correctFeedback: t("맞았습니다. write-protection fault를 커널이 COW로 해결해 자식용 frame을 만들고 부모 PTE와 값은 유지한 뒤 명령을 재개합니다.", "Right. The kernel resolves the write-protection fault through COW, creates a child-private frame, preserves the parent PTE and value, then resumes the instruction."),
      incorrectFeedback: t("fork의 독립 주소 공간 의미와 물리 page의 초기 공유를 함께 보세요. 복사는 전체 heap이 아니라 쓰기가 발생한 private page 단위로 지연됩니다.", "Combine fork's independent-address-space semantics with initial physical-page sharing. Copying is deferred and occurs for the written private page, not the entire heap."),
    },
  ];

  return (
    <ConceptCheckRenderer
      questions={questions}
      onMasteryChange={onMasteryChange}
      onSubmitAttempt={recordAnswers}
      copy={{
        kicker: "TRACE VA → PTE → FRAME",
        title: t("주소 공간, translation cache와 fault 경계를 연결하세요", "Connect address spaces, the translation cache, and fault boundaries"),
        description: t("다섯 문제와 두 활동을 모두 마치면 챕터 완료 조건이 열립니다.", "Complete all five questions and both activities to unlock the chapter gate."),
        correct: t("메모리 경계를 정확히 읽었습니다", "Memory boundary read correctly"),
        incorrect: t("VA부터 frame까지 다시 추적하세요", "Trace again from the VA to the frame"),
        checkAnswers: t("메모리 판정 확인하기", "Check the memory decisions"),
        completed: t("이해 확인 완료 — 두 활동의 완료 상태를 확인하세요.", "Concept check complete — now confirm both activity states."),
        retry: t("주소 공간, VPN·offset, PTE present·권한, frame 순서로 다시 분리하세요.", "Separate the address space, VPN and offset, PTE present and permissions, then the frame."),
        idle: t("다섯 답을 고른 뒤 translation과 fault 순서를 확인하세요.", "Choose all five answers, then check the translation and fault sequence."),
      }}
    />
  );
}

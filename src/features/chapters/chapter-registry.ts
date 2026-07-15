import {
  chapterId,
  getCurriculum,
  type Curriculum,
  type CurriculumChapter,
  type Locale,
} from "../../data/curriculum.ts";

export type ConceptQuestionVersionContract = {
  version: number;
  label: string;
  correctAnswer: string;
  answers: readonly string[];
};

export type ConceptQuestionContract = ConceptQuestionVersionContract & {
  status: "active" | "retired";
};

export const conceptQuestionHistory = {
  "transformer-from-zero/vectors/orientation": {
    1: {
      version: 1,
      label: "브로드캐스팅 방향",
      correctAnswer: "row-column",
      answers: ["row-column", "flat", "error"],
    },
  },
  "transformer-from-zero/vectors/normalization": {
    1: {
      version: 1,
      label: "영벡터 정규화",
      correctAnswer: "undefined",
      answers: ["zero", "undefined", "one"],
    },
  },
  "transformer-from-zero/vectors/tensor-shape": {
    1: {
      version: 1,
      label: "텐서 입력 shape",
      correctAnswer: "2-4-8",
      answers: ["4-8", "2-4-8", "8-4-2"],
    },
  },
  "transformer-from-zero/vectors/broadcast-shape": {
    1: {
      version: 1,
      label: "보정값 브로드캐스팅",
      correctAnswer: "shape-kept",
      answers: ["shape-kept", "shape-expanded", "cannot-add"],
    },
  },
  "transformer-from-zero/vectors/dot-product": {
    1: {
      version: 1,
      label: "직교 벡터 내적",
      correctAnswer: "zero",
      answers: ["zero", "one", "negative"],
    },
  },
  "transformer-from-zero/vectors/attention-context": {
    1: {
      version: 1,
      label: "Attention 컨텍스트 shape",
      correctAnswer: "3-4",
      answers: ["3-4", "3-3", "4-4"],
    },
  },
  "transformer-from-zero/optimization/loss-role": {
    1: {
      version: 1,
      label: "MSE 손실의 역할",
      correctAnswer: "scalar-summary",
      answers: ["scalar-summary", "parameter-vector", "accuracy-label"],
    },
  },
  "transformer-from-zero/optimization/gradient-direction": {
    1: {
      version: 1,
      label: "Gradient 반대 방향",
      correctAnswer: "subtract-gradient",
      answers: ["subtract-gradient", "add-gradient", "ignore-gradient"],
    },
  },
  "transformer-from-zero/optimization/learning-rate": {
    1: {
      version: 1,
      label: "과도한 학습률",
      correctAnswer: "overshoot-diverge",
      answers: ["overshoot-diverge", "always-faster", "changes-minimum"],
    },
  },
  "transformer-from-zero/optimization/gradient-shape": {
    1: {
      version: 1,
      label: "Gradient shape",
      correctAnswer: "same-as-weights",
      answers: ["same-as-weights", "one-scalar", "same-as-batch"],
    },
  },
  "transformer-from-zero/neural-networks/logit-to-probability": {
    1: {
      version: 1,
      label: "Logit에서 확률로",
      correctAnswer: "sigmoid-maps-logit-to-probability",
      answers: [
        "sigmoid-maps-logit-to-probability",
        "threshold-creates-probability",
        "bce-creates-logit",
      ],
    },
  },
  "transformer-from-zero/neural-networks/bce-penalty": {
    1: {
      version: 1,
      label: "BCE와 확신한 오답",
      correctAnswer: "confident-wrong-costs-most",
      answers: [
        "confident-wrong-costs-most",
        "near-threshold-costs-most",
        "same-accuracy-same-loss",
      ],
    },
  },
  "transformer-from-zero/neural-networks/activation-purpose": {
    1: {
      version: 1,
      label: "Hidden activation의 역할",
      correctAnswer: "nonlinearity-bends-boundaries",
      answers: [
        "nonlinearity-bends-boundaries",
        "depth-alone-solves-xor",
        "activation-only-changes-speed",
      ],
    },
  },
  "transformer-from-zero/neural-networks/xor-hidden-features": {
    1: {
      version: 1,
      label: "XOR hidden feature 결합",
      correctAnswer: "combine-hidden-features",
      answers: ["combine-hidden-features", "copy-first-input", "average-labels"],
    },
  },
  "transformer-from-zero/neural-networks/layer-shapes": {
    1: {
      version: 1,
      label: "2→2→1 layer shape",
      correctAnswer: "two-hidden-activations-one-logit",
      answers: [
        "two-hidden-activations-one-logit",
        "batch-becomes-hidden",
        "one-logit-total",
      ],
    },
  },
  "transformer-from-zero/training/epoch-update-count": {
    1: {
      version: 1,
      label: "Epoch당 update 수",
      correctAnswer: "ceil-samples-over-batch",
      answers: ["ceil-samples-over-batch", "one-update-per-epoch", "floor-drop-tail"],
    },
  },
  "transformer-from-zero/training/softmax-axis": {
    1: {
      version: 1,
      label: "Softmax class 축",
      correctAnswer: "classes-within-each-row",
      answers: ["classes-within-each-row", "samples-down-each-column", "whole-batch-global"],
    },
  },
  "transformer-from-zero/training/fused-cross-entropy": {
    1: {
      version: 1,
      label: "Fused cross entropy 계약",
      correctAnswer: "raw-logits-true-label-mean",
      answers: ["raw-logits-true-label-mean", "probabilities-argmax-sum", "thresholded-classes"],
    },
  },
  "transformer-from-zero/training/checkpoint-choice": {
    1: {
      version: 1,
      label: "Generalization checkpoint",
      correctAnswer: "minimum-validation-loss",
      answers: ["minimum-validation-loss", "minimum-training-loss", "last-epoch-always"],
    },
  },
  "transformer-from-zero/training/dropout-mode": {
    1: {
      version: 1,
      label: "Dropout train/eval 모드",
      correctAnswer: "train-random-eval-off",
      answers: ["train-random-eval-off", "random-in-both", "off-in-both"],
    },
  },
  "transformer-from-zero/embeddings/tokenizer-contract": {
    1: {
      version: 1,
      label: "문자열과 토큰의 관계",
      correctAnswer: "tokens-depend-on-tokenizer",
      answers: ["tokens-depend-on-tokenizer", "one-word-one-token", "ids-measure-meaning"],
    },
  },
  "transformer-from-zero/embeddings/lookup-shape": {
    1: {
      version: 1,
      label: "Embedding lookup shape",
      correctAnswer: "ids-bt-to-vectors-btd",
      answers: ["ids-bt-to-vectors-btd", "ids-bt-to-vocabulary-btv", "ids-bt-to-one-vector-d"],
    },
  },
  "transformer-from-zero/embeddings/repeated-gradient": {
    1: {
      version: 1,
      label: "반복 token row gradient",
      correctAnswer: "referenced-rows-sum-contributions",
      answers: ["referenced-rows-sum-contributions", "all-rows-receive-gradient", "duplicates-are-deduplicated"],
    },
  },
  "transformer-from-zero/embeddings/cosine-contract": {
    1: {
      version: 1,
      label: "Cosine similarity 계약",
      correctAnswer: "angle-not-id-or-magnitude",
      answers: ["angle-not-id-or-magnitude", "larger-id-more-similar", "zero-vector-cosine-zero"],
    },
  },
  "transformer-from-zero/embeddings/pooling-order": {
    1: {
      version: 1,
      label: "Masked mean과 순서",
      correctAnswer: "masked-mean-drops-pad-and-order",
      answers: ["masked-mean-drops-pad-and-order", "mean-preserves-order", "pad-must-enter-denominator"],
    },
  },
  "transformer-from-zero/sequences/hidden-shape": {
    1: {
      version: 1,
      label: "Hidden state와 trace shape",
      correctAnswer: "hidden-is-bh-trace-is-bth",
      answers: ["hidden-keeps-entire-sequence", "hidden-is-bh-trace-is-bth", "hidden-is-vocabulary"],
    },
  },
  "transformer-from-zero/sequences/shared-recurrence": {
    1: {
      version: 1,
      label: "시간축 공유 recurrence",
      correctAnswer: "same-cell-updates-ordered-state",
      answers: ["mean-first-then-cell", "sort-before-recurrence", "same-cell-updates-ordered-state"],
    },
  },
  "transformer-from-zero/sequences/temporal-gradient": {
    1: {
      version: 1,
      label: "시간축 gradient 경로",
      correctAnswer: "product-of-local-jacobians",
      answers: ["product-of-local-jacobians", "one-direct-gradient", "forward-zero-means-gradient-zero"],
    },
  },
  "transformer-from-zero/sequences/lstm-cell-update": {
    1: {
      version: 1,
      label: "LSTM cell state update",
      correctAnswer: "forget-carry-plus-input-candidate",
      answers: ["output-overwrites-cell", "forget-carry-plus-input-candidate", "input-gate-copies-raw-input"],
    },
  },
  "transformer-from-zero/sequences/causal-prefix": {
    1: {
      version: 1,
      label: "Causal prefix 계약",
      correctAnswer: "state-uses-current-and-past-only",
      answers: ["state-reads-future-token", "attention-needs-no-position-or-mask", "state-uses-current-and-past-only"],
    },
  },
  "linux-systems/shell-and-filesystem/absolute-path": {
    1: {
      version: 1,
      label: "절대 경로 시작점",
      correctAnswer: "slash",
      answers: ["slash", "dot", "tilde"],
    },
  },
  "linux-systems/shell-and-filesystem/relative-path": {
    1: {
      version: 1,
      label: "상대 경로 기준",
      correctAnswer: "current-directory",
      answers: ["current-directory", "root-directory", "etc-directory"],
    },
  },
  "linux-systems/shell-and-filesystem/permission-error": {
    1: {
      version: 1,
      label: "보호된 파일 쓰기 권한",
      correctAnswer: "protected-file",
      answers: ["protected-file", "missing-file", "invalid-echo"],
    },
  },
  "linux-systems/boot-to-shell/firmware-handoff": {
    1: {
      version: 1,
      label: "펌웨어 다음 인계 대상",
      correctAnswer: "kernel-image",
      answers: ["kernel-image", "shell-history", "pid-list"],
    },
  },
  "linux-systems/boot-to-shell/kernel-userspace-boundary": {
    1: {
      version: 1,
      label: "커널과 사용자 공간 경계",
      correctAnswer: "kernel-only",
      answers: ["kernel-only", "firmware-only", "shell-ready"],
    },
  },
  "linux-systems/boot-to-shell/shell-origin": {
    1: {
      version: 1,
      label: "콘솔 셸 시작 주체",
      correctAnswer: "init-starts-shell",
      answers: ["init-starts-shell", "firmware-clock", "root-directory-name"],
    },
  },
  "linux-systems/boot-to-shell/pid-one": {
    1: {
      version: 1,
      label: "PID 1 프로그램",
      correctAnswer: "init",
      answers: ["init", "firmware", "kernel"],
    },
  },
  "linux-systems/processes-and-signals/program-vs-process": {
    1: {
      version: 1,
      label: "프로그램과 프로세스 구분",
      correctAnswer: "same-program-distinct-processes",
      answers: ["same-program-distinct-processes", "one-program-one-pid", "pid-identifies-file"],
    },
  },
  "linux-systems/processes-and-signals/fork-exec-pid": {
    1: {
      version: 1,
      label: "fork와 exec의 PID",
      correctAnswer: "exec-replaces-image-keeps-pid",
      answers: ["exec-replaces-image-keeps-pid", "exec-creates-another-pid", "fork-replaces-shell"],
    },
  },
  "linux-systems/processes-and-signals/stdio-redirection": {
    1: {
      version: 1,
      label: "stdout 리다이렉션 범위",
      correctAnswer: "redirects-stdout-only",
      answers: ["redirects-stdout-only", "redirects-all-three", "changes-program-file"],
    },
  },
  "linux-systems/processes-and-signals/signal-choice": {
    1: {
      version: 1,
      label: "협력적 종료와 강제 종료",
      correctAnswer: "term-before-kill",
      answers: ["term-before-kill", "kill-first", "stop-then-wait"],
    },
  },
  "linux-systems/processes-and-signals/wait-reaps-child": {
    1: {
      version: 1,
      label: "자식 종료 정보 회수",
      correctAnswer: "zombie-until-wait",
      answers: ["zombie-until-wait", "signal-reaps-zombie", "zombie-still-runs"],
    },
  },
  "linux-systems/users-and-permissions/process-credentials": {
    1: {
      version: 1,
      label: "접근 요청의 주체",
      correctAnswer: "effective-uid-and-groups",
      answers: ["effective-uid-and-groups", "terminal-owner", "process-id"],
    },
  },
  "linux-systems/users-and-permissions/permission-class": {
    1: {
      version: 1,
      label: "권한 클래스 선택 순서",
      correctAnswer: "owner-then-group-then-other",
      answers: ["owner-then-group-then-other", "combine-all-classes", "fallback-after-denial"],
    },
  },
  "linux-systems/users-and-permissions/directory-search": {
    1: {
      version: 1,
      label: "디렉터리 경로 탐색",
      correctAnswer: "execute-allows-traversal",
      answers: ["execute-allows-traversal", "read-alone-opens-path", "file-write-opens-parent"],
    },
  },
  "linux-systems/users-and-permissions/delete-boundary": {
    1: {
      version: 1,
      label: "파일 이름 삭제 경계",
      correctAnswer: "parent-write-and-search",
      answers: ["parent-write-and-search", "target-file-write", "target-file-read"],
    },
  },
  "linux-systems/users-and-permissions/least-privilege": {
    1: {
      version: 1,
      label: "최소 권한 정책",
      correctAnswer: "smallest-sufficient-grant",
      answers: ["smallest-sufficient-grant", "chmod-777", "allow-then-audit-later"],
    },
  },
  "linux-systems/memory-and-virtual-addresses/address-translation": {
    1: {
      version: 1,
      label: "가상 주소 번역",
      correctAnswer: "vpn-to-frame-offset-unchanged",
      answers: ["vpn-to-frame-offset-unchanged", "whole-address-becomes-frame", "offset-selects-page-table"],
    },
  },
  "linux-systems/memory-and-virtual-addresses/process-isolation": {
    1: {
      version: 1,
      label: "프로세스별 주소 공간",
      correctAnswer: "same-va-can-map-different-frames",
      answers: ["same-va-can-map-different-frames", "same-va-means-same-frame", "pid-does-not-affect-mapping"],
    },
  },
  "linux-systems/memory-and-virtual-addresses/page-fault": {
    1: {
      version: 1,
      label: "TLB miss와 page fault",
      correctAnswer: "tlb-miss-is-not-page-fault",
      answers: ["tlb-miss-is-not-page-fault", "every-tlb-miss-is-page-fault", "page-fault-always-kills-process"],
    },
  },
  "linux-systems/memory-and-virtual-addresses/region-lifetime": {
    1: {
      version: 1,
      label: "/proc maps와 residency",
      correctAnswer: "maps-shows-vmas-not-residency",
      answers: ["maps-shows-vmas-not-residency", "maps-shows-only-resident-pages", "maps-is-physical-memory-layout"],
    },
  },
  "linux-systems/memory-and-virtual-addresses/copy-on-write": {
    1: {
      version: 1,
      label: "fork 뒤 copy-on-write",
      correctAnswer: "first-write-copies-that-page",
      answers: ["first-write-copies-that-page", "fork-copies-all-pages-eagerly", "write-changes-parent-page"],
    },
  },
  "linux-systems/storage-and-filesystems/path-resolution": {
    1: {
      version: 1,
      label: "경로에서 data block까지",
      correctAnswer: "mount-root-dentry-inode-block",
      answers: ["mount-root-dentry-inode-block", "inode-stores-name-and-path", "path-points-directly-to-block"],
    },
  },
  "linux-systems/storage-and-filesystems/mount-namespace": {
    1: {
      version: 1,
      label: "mount 지점의 namespace",
      correctAnswer: "mounted-root-shadows-underlay",
      answers: ["mounted-root-shadows-underlay", "mount-merges-directories", "mount-deletes-underlay"],
    },
  },
  "linux-systems/storage-and-filesystems/link-lifetime": {
    1: {
      version: 1,
      label: "hard link와 inode 수명",
      correctAnswer: "same-inode-reclaim-after-zero-links-and-opens",
      answers: ["same-inode-reclaim-after-zero-links-and-opens", "hard-link-copies-blocks", "first-unlink-reclaims-data"],
    },
  },
  "linux-systems/storage-and-filesystems/inode-capacity": {
    1: {
      version: 1,
      label: "block과 inode 용량",
      correctAnswer: "free-blocks-zero-free-inodes",
      answers: ["free-blocks-zero-free-inodes", "page-cache-needs-emptying", "touch-needs-data-block-first"],
    },
  },
  "linux-systems/storage-and-filesystems/crash-durability": {
    1: {
      version: 1,
      label: "crash-safe 파일 교체",
      correctAnswer: "fsync-file-rename-fsync-parent",
      answers: ["fsync-file-rename-fsync-parent", "write-visible-means-durable", "rename-alone-persists-everything"],
    },
  },
  "linux-systems/networking-from-a-packet/socket-boundary": {
    1: {
      version: 1,
      label: "fd와 kernel socket 경계",
      correctAnswer: "fd-references-kernel-socket",
      answers: ["fd-references-kernel-socket", "fd-number-crosses-network", "socket-is-remote-file"],
    },
  },
  "linux-systems/networking-from-a-packet/longest-prefix-route": {
    1: {
      version: 1,
      label: "longest-prefix route 선택",
      correctAnswer: "most-specific-prefix",
      answers: ["most-specific-prefix", "first-listed-route", "default-route-wins"],
    },
  },
  "linux-systems/networking-from-a-packet/next-hop-addressing": {
    1: {
      version: 1,
      label: "다음 홉의 link·IP 주소",
      correctAnswer: "gateway-mac-keeps-remote-ip",
      answers: ["gateway-mac-keeps-remote-ip", "remote-mac-directly", "gateway-ip-replaces-destination"],
    },
  },
  "linux-systems/networking-from-a-packet/cumulative-ack": {
    1: {
      version: 1,
      label: "TCP 누적 ACK와 gap",
      correctAnswer: "ack-covers-contiguous-bytes",
      answers: ["ack-covers-contiguous-bytes", "ack-is-packet-count", "ack-means-application-read"],
    },
  },
  "linux-systems/networking-from-a-packet/listener-delivery": {
    1: {
      version: 1,
      label: "listener·accepted fd·recv",
      correctAnswer: "accept-new-fd-recv-confirms-delivery",
      answers: ["accept-new-fd-recv-confirms-delivery", "listener-becomes-connected", "send-return-proves-application"],
    },
  },
} as const satisfies Record<
  string,
  Readonly<Record<number, ConceptQuestionVersionContract>>
>;

export type ConceptQuestionHistoryKey = keyof typeof conceptQuestionHistory;

export const conceptQuestionRegistry = {
  "transformer-from-zero/vectors/orientation": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/orientation"][1],
    status: "active",
  },
  "transformer-from-zero/vectors/normalization": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/normalization"][1],
    status: "active",
  },
  "transformer-from-zero/vectors/tensor-shape": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/tensor-shape"][1],
    status: "active",
  },
  "transformer-from-zero/vectors/broadcast-shape": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/broadcast-shape"][1],
    status: "active",
  },
  "transformer-from-zero/vectors/dot-product": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/dot-product"][1],
    status: "active",
  },
  "transformer-from-zero/vectors/attention-context": {
    ...conceptQuestionHistory["transformer-from-zero/vectors/attention-context"][1],
    status: "retired",
  },
  "transformer-from-zero/optimization/loss-role": {
    ...conceptQuestionHistory["transformer-from-zero/optimization/loss-role"][1],
    status: "active",
  },
  "transformer-from-zero/optimization/gradient-direction": {
    ...conceptQuestionHistory["transformer-from-zero/optimization/gradient-direction"][1],
    status: "active",
  },
  "transformer-from-zero/optimization/learning-rate": {
    ...conceptQuestionHistory["transformer-from-zero/optimization/learning-rate"][1],
    status: "active",
  },
  "transformer-from-zero/optimization/gradient-shape": {
    ...conceptQuestionHistory["transformer-from-zero/optimization/gradient-shape"][1],
    status: "active",
  },
  "transformer-from-zero/neural-networks/logit-to-probability": {
    ...conceptQuestionHistory["transformer-from-zero/neural-networks/logit-to-probability"][1],
    status: "active",
  },
  "transformer-from-zero/neural-networks/bce-penalty": {
    ...conceptQuestionHistory["transformer-from-zero/neural-networks/bce-penalty"][1],
    status: "active",
  },
  "transformer-from-zero/neural-networks/activation-purpose": {
    ...conceptQuestionHistory["transformer-from-zero/neural-networks/activation-purpose"][1],
    status: "active",
  },
  "transformer-from-zero/neural-networks/xor-hidden-features": {
    ...conceptQuestionHistory["transformer-from-zero/neural-networks/xor-hidden-features"][1],
    status: "active",
  },
  "transformer-from-zero/neural-networks/layer-shapes": {
    ...conceptQuestionHistory["transformer-from-zero/neural-networks/layer-shapes"][1],
    status: "active",
  },
  "transformer-from-zero/training/epoch-update-count": {
    ...conceptQuestionHistory["transformer-from-zero/training/epoch-update-count"][1],
    status: "active",
  },
  "transformer-from-zero/training/softmax-axis": {
    ...conceptQuestionHistory["transformer-from-zero/training/softmax-axis"][1],
    status: "active",
  },
  "transformer-from-zero/training/fused-cross-entropy": {
    ...conceptQuestionHistory["transformer-from-zero/training/fused-cross-entropy"][1],
    status: "active",
  },
  "transformer-from-zero/training/checkpoint-choice": {
    ...conceptQuestionHistory["transformer-from-zero/training/checkpoint-choice"][1],
    status: "active",
  },
  "transformer-from-zero/training/dropout-mode": {
    ...conceptQuestionHistory["transformer-from-zero/training/dropout-mode"][1],
    status: "active",
  },
  "transformer-from-zero/embeddings/tokenizer-contract": {
    ...conceptQuestionHistory["transformer-from-zero/embeddings/tokenizer-contract"][1],
    status: "active",
  },
  "transformer-from-zero/embeddings/lookup-shape": {
    ...conceptQuestionHistory["transformer-from-zero/embeddings/lookup-shape"][1],
    status: "active",
  },
  "transformer-from-zero/embeddings/repeated-gradient": {
    ...conceptQuestionHistory["transformer-from-zero/embeddings/repeated-gradient"][1],
    status: "active",
  },
  "transformer-from-zero/embeddings/cosine-contract": {
    ...conceptQuestionHistory["transformer-from-zero/embeddings/cosine-contract"][1],
    status: "active",
  },
  "transformer-from-zero/embeddings/pooling-order": {
    ...conceptQuestionHistory["transformer-from-zero/embeddings/pooling-order"][1],
    status: "active",
  },
  "transformer-from-zero/sequences/hidden-shape": {
    ...conceptQuestionHistory["transformer-from-zero/sequences/hidden-shape"][1],
    status: "active",
  },
  "transformer-from-zero/sequences/shared-recurrence": {
    ...conceptQuestionHistory["transformer-from-zero/sequences/shared-recurrence"][1],
    status: "active",
  },
  "transformer-from-zero/sequences/temporal-gradient": {
    ...conceptQuestionHistory["transformer-from-zero/sequences/temporal-gradient"][1],
    status: "active",
  },
  "transformer-from-zero/sequences/lstm-cell-update": {
    ...conceptQuestionHistory["transformer-from-zero/sequences/lstm-cell-update"][1],
    status: "active",
  },
  "transformer-from-zero/sequences/causal-prefix": {
    ...conceptQuestionHistory["transformer-from-zero/sequences/causal-prefix"][1],
    status: "active",
  },
  "linux-systems/shell-and-filesystem/absolute-path": {
    ...conceptQuestionHistory["linux-systems/shell-and-filesystem/absolute-path"][1],
    status: "active",
  },
  "linux-systems/shell-and-filesystem/relative-path": {
    ...conceptQuestionHistory["linux-systems/shell-and-filesystem/relative-path"][1],
    status: "active",
  },
  "linux-systems/shell-and-filesystem/permission-error": {
    ...conceptQuestionHistory["linux-systems/shell-and-filesystem/permission-error"][1],
    status: "active",
  },
  "linux-systems/boot-to-shell/firmware-handoff": {
    ...conceptQuestionHistory["linux-systems/boot-to-shell/firmware-handoff"][1],
    status: "active",
  },
  "linux-systems/boot-to-shell/kernel-userspace-boundary": {
    ...conceptQuestionHistory["linux-systems/boot-to-shell/kernel-userspace-boundary"][1],
    status: "active",
  },
  "linux-systems/boot-to-shell/shell-origin": {
    ...conceptQuestionHistory["linux-systems/boot-to-shell/shell-origin"][1],
    status: "active",
  },
  "linux-systems/boot-to-shell/pid-one": {
    ...conceptQuestionHistory["linux-systems/boot-to-shell/pid-one"][1],
    status: "active",
  },
  "linux-systems/processes-and-signals/program-vs-process": {
    ...conceptQuestionHistory["linux-systems/processes-and-signals/program-vs-process"][1],
    status: "active",
  },
  "linux-systems/processes-and-signals/fork-exec-pid": {
    ...conceptQuestionHistory["linux-systems/processes-and-signals/fork-exec-pid"][1],
    status: "active",
  },
  "linux-systems/processes-and-signals/stdio-redirection": {
    ...conceptQuestionHistory["linux-systems/processes-and-signals/stdio-redirection"][1],
    status: "active",
  },
  "linux-systems/processes-and-signals/signal-choice": {
    ...conceptQuestionHistory["linux-systems/processes-and-signals/signal-choice"][1],
    status: "active",
  },
  "linux-systems/processes-and-signals/wait-reaps-child": {
    ...conceptQuestionHistory["linux-systems/processes-and-signals/wait-reaps-child"][1],
    status: "active",
  },
  "linux-systems/users-and-permissions/process-credentials": {
    ...conceptQuestionHistory["linux-systems/users-and-permissions/process-credentials"][1],
    status: "active",
  },
  "linux-systems/users-and-permissions/permission-class": {
    ...conceptQuestionHistory["linux-systems/users-and-permissions/permission-class"][1],
    status: "active",
  },
  "linux-systems/users-and-permissions/directory-search": {
    ...conceptQuestionHistory["linux-systems/users-and-permissions/directory-search"][1],
    status: "active",
  },
  "linux-systems/users-and-permissions/delete-boundary": {
    ...conceptQuestionHistory["linux-systems/users-and-permissions/delete-boundary"][1],
    status: "active",
  },
  "linux-systems/users-and-permissions/least-privilege": {
    ...conceptQuestionHistory["linux-systems/users-and-permissions/least-privilege"][1],
    status: "active",
  },
  "linux-systems/memory-and-virtual-addresses/address-translation": {
    ...conceptQuestionHistory["linux-systems/memory-and-virtual-addresses/address-translation"][1],
    status: "active",
  },
  "linux-systems/memory-and-virtual-addresses/process-isolation": {
    ...conceptQuestionHistory["linux-systems/memory-and-virtual-addresses/process-isolation"][1],
    status: "active",
  },
  "linux-systems/memory-and-virtual-addresses/page-fault": {
    ...conceptQuestionHistory["linux-systems/memory-and-virtual-addresses/page-fault"][1],
    status: "active",
  },
  "linux-systems/memory-and-virtual-addresses/region-lifetime": {
    ...conceptQuestionHistory["linux-systems/memory-and-virtual-addresses/region-lifetime"][1],
    status: "active",
  },
  "linux-systems/memory-and-virtual-addresses/copy-on-write": {
    ...conceptQuestionHistory["linux-systems/memory-and-virtual-addresses/copy-on-write"][1],
    status: "active",
  },
  "linux-systems/storage-and-filesystems/path-resolution": {
    ...conceptQuestionHistory["linux-systems/storage-and-filesystems/path-resolution"][1],
    status: "active",
  },
  "linux-systems/storage-and-filesystems/mount-namespace": {
    ...conceptQuestionHistory["linux-systems/storage-and-filesystems/mount-namespace"][1],
    status: "active",
  },
  "linux-systems/storage-and-filesystems/link-lifetime": {
    ...conceptQuestionHistory["linux-systems/storage-and-filesystems/link-lifetime"][1],
    status: "active",
  },
  "linux-systems/storage-and-filesystems/inode-capacity": {
    ...conceptQuestionHistory["linux-systems/storage-and-filesystems/inode-capacity"][1],
    status: "active",
  },
  "linux-systems/storage-and-filesystems/crash-durability": {
    ...conceptQuestionHistory["linux-systems/storage-and-filesystems/crash-durability"][1],
    status: "active",
  },
  "linux-systems/networking-from-a-packet/socket-boundary": {
    ...conceptQuestionHistory["linux-systems/networking-from-a-packet/socket-boundary"][1],
    status: "active",
  },
  "linux-systems/networking-from-a-packet/longest-prefix-route": {
    ...conceptQuestionHistory["linux-systems/networking-from-a-packet/longest-prefix-route"][1],
    status: "active",
  },
  "linux-systems/networking-from-a-packet/next-hop-addressing": {
    ...conceptQuestionHistory["linux-systems/networking-from-a-packet/next-hop-addressing"][1],
    status: "active",
  },
  "linux-systems/networking-from-a-packet/cumulative-ack": {
    ...conceptQuestionHistory["linux-systems/networking-from-a-packet/cumulative-ack"][1],
    status: "active",
  },
  "linux-systems/networking-from-a-packet/listener-delivery": {
    ...conceptQuestionHistory["linux-systems/networking-from-a-packet/listener-delivery"][1],
    status: "active",
  },
} as const satisfies Record<string, ConceptQuestionContract>;

export type ConceptQuestionKey = keyof typeof conceptQuestionRegistry;

const vectorQuestions = {
  orientation: conceptQuestionRegistry["transformer-from-zero/vectors/orientation"],
  normalization: conceptQuestionRegistry["transformer-from-zero/vectors/normalization"],
  "tensor-shape": conceptQuestionRegistry["transformer-from-zero/vectors/tensor-shape"],
  "broadcast-shape": conceptQuestionRegistry["transformer-from-zero/vectors/broadcast-shape"],
  "dot-product": conceptQuestionRegistry["transformer-from-zero/vectors/dot-product"],
} as const;

export const optimizationQuestions = {
  "loss-role": conceptQuestionRegistry["transformer-from-zero/optimization/loss-role"],
  "gradient-direction": conceptQuestionRegistry["transformer-from-zero/optimization/gradient-direction"],
  "learning-rate": conceptQuestionRegistry["transformer-from-zero/optimization/learning-rate"],
  "gradient-shape": conceptQuestionRegistry["transformer-from-zero/optimization/gradient-shape"],
} as const;

export const neuralNetworkQuestions = {
  "logit-to-probability": conceptQuestionRegistry["transformer-from-zero/neural-networks/logit-to-probability"],
  "bce-penalty": conceptQuestionRegistry["transformer-from-zero/neural-networks/bce-penalty"],
  "activation-purpose": conceptQuestionRegistry["transformer-from-zero/neural-networks/activation-purpose"],
  "xor-hidden-features": conceptQuestionRegistry["transformer-from-zero/neural-networks/xor-hidden-features"],
  "layer-shapes": conceptQuestionRegistry["transformer-from-zero/neural-networks/layer-shapes"],
} as const;

export const trainingQuestions = {
  "epoch-update-count": conceptQuestionRegistry["transformer-from-zero/training/epoch-update-count"],
  "softmax-axis": conceptQuestionRegistry["transformer-from-zero/training/softmax-axis"],
  "fused-cross-entropy": conceptQuestionRegistry["transformer-from-zero/training/fused-cross-entropy"],
  "checkpoint-choice": conceptQuestionRegistry["transformer-from-zero/training/checkpoint-choice"],
  "dropout-mode": conceptQuestionRegistry["transformer-from-zero/training/dropout-mode"],
} as const;

export const embeddingQuestions = {
  "tokenizer-contract": conceptQuestionRegistry["transformer-from-zero/embeddings/tokenizer-contract"],
  "lookup-shape": conceptQuestionRegistry["transformer-from-zero/embeddings/lookup-shape"],
  "repeated-gradient": conceptQuestionRegistry["transformer-from-zero/embeddings/repeated-gradient"],
  "cosine-contract": conceptQuestionRegistry["transformer-from-zero/embeddings/cosine-contract"],
  "pooling-order": conceptQuestionRegistry["transformer-from-zero/embeddings/pooling-order"],
} as const;

export const sequenceQuestions = {
  "hidden-shape": conceptQuestionRegistry["transformer-from-zero/sequences/hidden-shape"],
  "shared-recurrence": conceptQuestionRegistry["transformer-from-zero/sequences/shared-recurrence"],
  "temporal-gradient": conceptQuestionRegistry["transformer-from-zero/sequences/temporal-gradient"],
  "lstm-cell-update": conceptQuestionRegistry["transformer-from-zero/sequences/lstm-cell-update"],
  "causal-prefix": conceptQuestionRegistry["transformer-from-zero/sequences/causal-prefix"],
} as const;

const linuxShellQuestions = {
  "absolute-path": conceptQuestionRegistry["linux-systems/shell-and-filesystem/absolute-path"],
  "relative-path": conceptQuestionRegistry["linux-systems/shell-and-filesystem/relative-path"],
  "permission-error": conceptQuestionRegistry["linux-systems/shell-and-filesystem/permission-error"],
} as const;

const linuxBootQuestions = {
  "firmware-handoff": conceptQuestionRegistry["linux-systems/boot-to-shell/firmware-handoff"],
  "kernel-userspace-boundary": conceptQuestionRegistry["linux-systems/boot-to-shell/kernel-userspace-boundary"],
  "shell-origin": conceptQuestionRegistry["linux-systems/boot-to-shell/shell-origin"],
  "pid-one": conceptQuestionRegistry["linux-systems/boot-to-shell/pid-one"],
} as const;

export const linuxProcessQuestions = {
  "program-vs-process": conceptQuestionRegistry["linux-systems/processes-and-signals/program-vs-process"],
  "fork-exec-pid": conceptQuestionRegistry["linux-systems/processes-and-signals/fork-exec-pid"],
  "stdio-redirection": conceptQuestionRegistry["linux-systems/processes-and-signals/stdio-redirection"],
  "signal-choice": conceptQuestionRegistry["linux-systems/processes-and-signals/signal-choice"],
  "wait-reaps-child": conceptQuestionRegistry["linux-systems/processes-and-signals/wait-reaps-child"],
} as const;

export const linuxPermissionQuestions = {
  "process-credentials": conceptQuestionRegistry["linux-systems/users-and-permissions/process-credentials"],
  "permission-class": conceptQuestionRegistry["linux-systems/users-and-permissions/permission-class"],
  "directory-search": conceptQuestionRegistry["linux-systems/users-and-permissions/directory-search"],
  "delete-boundary": conceptQuestionRegistry["linux-systems/users-and-permissions/delete-boundary"],
  "least-privilege": conceptQuestionRegistry["linux-systems/users-and-permissions/least-privilege"],
} as const;

export const linuxMemoryQuestions = {
  "address-translation": conceptQuestionRegistry["linux-systems/memory-and-virtual-addresses/address-translation"],
  "process-isolation": conceptQuestionRegistry["linux-systems/memory-and-virtual-addresses/process-isolation"],
  "page-fault": conceptQuestionRegistry["linux-systems/memory-and-virtual-addresses/page-fault"],
  "region-lifetime": conceptQuestionRegistry["linux-systems/memory-and-virtual-addresses/region-lifetime"],
  "copy-on-write": conceptQuestionRegistry["linux-systems/memory-and-virtual-addresses/copy-on-write"],
} as const;

export const linuxStorageQuestions = {
  "path-resolution": conceptQuestionRegistry["linux-systems/storage-and-filesystems/path-resolution"],
  "mount-namespace": conceptQuestionRegistry["linux-systems/storage-and-filesystems/mount-namespace"],
  "link-lifetime": conceptQuestionRegistry["linux-systems/storage-and-filesystems/link-lifetime"],
  "inode-capacity": conceptQuestionRegistry["linux-systems/storage-and-filesystems/inode-capacity"],
  "crash-durability": conceptQuestionRegistry["linux-systems/storage-and-filesystems/crash-durability"],
} as const;

export const linuxNetworkingQuestions = {
  "socket-boundary": conceptQuestionRegistry["linux-systems/networking-from-a-packet/socket-boundary"],
  "longest-prefix-route": conceptQuestionRegistry["linux-systems/networking-from-a-packet/longest-prefix-route"],
  "next-hop-addressing": conceptQuestionRegistry["linux-systems/networking-from-a-packet/next-hop-addressing"],
  "cumulative-ack": conceptQuestionRegistry["linux-systems/networking-from-a-packet/cumulative-ack"],
  "listener-delivery": conceptQuestionRegistry["linux-systems/networking-from-a-packet/listener-delivery"],
} as const;

export type ChapterRegistration = {
  questions: Readonly<Record<string, ConceptQuestionContract & { status: "active" }>>;
};

export const chapterRegistry = {
  "transformer-from-zero/vectors": {
    questions: vectorQuestions,
  },
  "transformer-from-zero/optimization": {
    questions: optimizationQuestions,
  },
  "transformer-from-zero/neural-networks": {
    questions: neuralNetworkQuestions,
  },
  "transformer-from-zero/training": {
    questions: trainingQuestions,
  },
  "transformer-from-zero/embeddings": {
    questions: embeddingQuestions,
  },
  "transformer-from-zero/sequences": {
    questions: sequenceQuestions,
  },
  "linux-systems/shell-and-filesystem": {
    questions: linuxShellQuestions,
  },
  "linux-systems/boot-to-shell": {
    questions: linuxBootQuestions,
  },
  "linux-systems/processes-and-signals": {
    questions: linuxProcessQuestions,
  },
  "linux-systems/users-and-permissions": {
    questions: linuxPermissionQuestions,
  },
  "linux-systems/memory-and-virtual-addresses": {
    questions: linuxMemoryQuestions,
  },
  "linux-systems/storage-and-filesystems": {
    questions: linuxStorageQuestions,
  },
  "linux-systems/networking-from-a-packet": {
    questions: linuxNetworkingQuestions,
  },
} as const satisfies Record<string, ChapterRegistration>;

export type RegisteredChapterId = keyof typeof chapterRegistry;

export const registeredChapterIds = Object.freeze(
  Object.keys(chapterRegistry) as RegisteredChapterId[],
);

export function isRegisteredChapterId(value: string): value is RegisteredChapterId {
  return Object.hasOwn(chapterRegistry, value);
}

export function getChapterRegistration(
  curriculumSlug: string,
  chapterSlug: string,
): ChapterRegistration | undefined {
  const id = chapterId(curriculumSlug, chapterSlug);
  return isRegisteredChapterId(id) ? chapterRegistry[id] : undefined;
}

export type PublishedChapter = {
  curriculum: Curriculum;
  chapter: CurriculumChapter;
  registration: ChapterRegistration;
};

export function getPublishedChapter(
  curriculumSlug: string,
  chapterSlug: string,
  locale: Locale = "ko",
): PublishedChapter | undefined {
  const curriculum = getCurriculum(curriculumSlug);
  const canonicalChapter = curriculum?.chapters.ko.find(
    (chapter) => chapter.slug === chapterSlug,
  );
  const chapter = curriculum?.chapters[locale].find(
    (candidate) => candidate.slug === chapterSlug,
  );
  const registration = getChapterRegistration(curriculumSlug, chapterSlug);

  if (
    !curriculum ||
    curriculum.status === "planned" ||
    !canonicalChapter ||
    canonicalChapter.status !== "available" ||
    !chapter ||
    !registration
  ) {
    return undefined;
  }

  return { curriculum, chapter, registration };
}

export function conceptQuestionKey(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
) {
  return `${curriculumSlug}/${chapterSlug}/${questionId}`;
}

export function getConceptQuestionCatalogEntry(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
): ConceptQuestionContract | undefined {
  const key = conceptQuestionKey(curriculumSlug, chapterSlug, questionId);
  return Object.hasOwn(conceptQuestionRegistry, key)
    ? conceptQuestionRegistry[key as ConceptQuestionKey]
    : undefined;
}

export function getConceptQuestionVersionEntry(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
  version: number,
): ConceptQuestionVersionContract | undefined {
  const key = conceptQuestionKey(curriculumSlug, chapterSlug, questionId);
  if (!Object.hasOwn(conceptQuestionHistory, key)) return undefined;
  const versions = conceptQuestionHistory[
    key as ConceptQuestionHistoryKey
  ] as Readonly<Record<number, ConceptQuestionVersionContract>>;
  return versions[version];
}

export function getConceptQuestion(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
): (ConceptQuestionContract & { status: "active" }) | undefined {
  const registration = getChapterRegistration(curriculumSlug, chapterSlug);
  const question = registration?.questions[questionId];
  return question?.status === "active" ? question : undefined;
}

export function getConceptQuestionLabel(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
  version?: number,
) {
  if (version !== undefined) {
    return getConceptQuestionVersionEntry(
      curriculumSlug,
      chapterSlug,
      questionId,
      version,
    )?.label ?? questionId;
  }
  return getConceptQuestionCatalogEntry(curriculumSlug, chapterSlug, questionId)?.label
    ?? questionId;
}

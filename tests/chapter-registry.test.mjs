import assert from "node:assert/strict";
import test from "node:test";
import {
  chapterRegistry,
  conceptQuestionRegistry,
  getChapterRegistration,
  getConceptQuestion,
  getConceptQuestionCatalogEntry,
  getConceptQuestionVersionEntry,
  getPublishedChapter,
  registeredChapterIds,
} from "../src/features/chapters/chapter-registry.ts";
import {
  curricula,
  getCurriculum,
} from "../src/data/curriculum.ts";
import {
  chapterPageMetadata,
  pageMetadataForPath,
} from "../src/features/localization/page-metadata.ts";

test("keeps localized catalog chapter identities aligned", () => {
  for (const curriculum of curricula) {
    const korean = curriculum.chapters.ko.map(
      ({ id, number, slug, status, developmentStatus, estimatedMinutes }) => ({
        id,
        number,
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    );
    const english = curriculum.chapters.en.map(
      ({ id, number, slug, status, developmentStatus, estimatedMinutes }) => ({
        id,
        number,
        slug,
        status,
        developmentStatus,
        estimatedMinutes,
      }),
    );
    assert.deepEqual(english, korean);
  }
});

test("requires every available catalog chapter to have a runtime registration", () => {
  const availableIds = curricula.flatMap((curriculum) =>
    curriculum.chapters.ko
      .filter((chapter) => chapter.status === "available")
      .map((chapter) => chapter.id),
  );
  for (const availableId of availableIds) {
    assert.ok(
      registeredChapterIds.includes(availableId),
      `missing runtime registration for ${availableId}`,
    );
  }

  for (const registeredId of registeredChapterIds) {
    const [curriculumSlug, chapterSlug] = registeredId.split("/");
    const curriculum = getCurriculum(curriculumSlug);
    assert.ok(curriculum?.chapters.ko.some((chapter) => chapter.slug === chapterSlug));
    assert.ok(curriculum?.chapters.en.some((chapter) => chapter.slug === chapterSlug));
    assert.equal(
      getChapterRegistration(curriculumSlug, chapterSlug),
      chapterRegistry[registeredId],
    );
  }
});

test("publishes only available chapters that also have a renderer contract", () => {
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/veth-bridges-and-routing"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/egress-nat-and-conntrack"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/service-discovery-and-load-balancing"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/network-policy-and-firewalls"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/availability-and-failure-domains"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/network-observability-and-capacity"),
  );
  assert.ok(
    registeredChapterIds.includes("infrastructure-design/assemble-a-namespace-platform"),
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "vectors", "en")?.chapter.title,
    "Vectors and Tensors",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "boot-to-shell", "en")?.chapter.title,
    "From Power-On to a Shell",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "processes-and-signals", "en")?.chapter.title,
    "Processes and Signals",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "users-and-permissions", "en")?.chapter.title,
    "Users and Permissions",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "memory-and-virtual-addresses", "en")?.chapter.title,
    "Memory and Virtual Addresses",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "storage-and-filesystems", "en")?.chapter.title,
    "Storage and Filesystems",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "networking-from-a-packet", "en")?.chapter.title,
    "From Packets to Sockets",
  );
  assert.equal(
    getPublishedChapter("linux-systems", "assemble-a-tiny-linux", "en")?.chapter.title,
    "Assemble a Tiny Linux System",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "network-namespaces-and-boundaries",
      "en",
    )?.chapter.title,
    "Network Namespaces and Isolation Boundaries",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "veth-bridges-and-routing",
      "en",
    )?.chapter.title,
    "Assemble Topologies with veth, Bridges, and Routing",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "egress-nat-and-conntrack",
      "en",
    )?.chapter.title,
    "Egress, NAT, and Conntrack",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "service-discovery-and-load-balancing",
      "en",
    )?.chapter.title,
    "Service Discovery and Load Balancing",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "network-policy-and-firewalls",
      "en",
    )?.chapter.title,
    "Network Policy and Firewalls",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "network-observability-and-capacity",
      "en",
    )?.chapter.title,
    "Network Observability and Capacity",
  );
  assert.equal(
    getPublishedChapter(
      "infrastructure-design",
      "assemble-a-namespace-platform",
      "en",
    )?.chapter.title,
    "Assemble a Namespace Platform",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "optimization", "en")?.chapter.title,
    "Learning and Optimization",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "neural-networks", "en")?.chapter.title,
    "Classification and Neural Networks",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "training", "en")?.chapter.title,
    "Deep Learning Training",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "embeddings", "en")?.chapter.title,
    "Tokens and Embeddings",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "sequences", "en")?.chapter.title,
    "Sequential Data",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "attention", "en")?.chapter.title,
    "Attention",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "self-attention", "en")?.chapter.title,
    "Self-Attention",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "transformer-block", "en")?.chapter.title,
    "The Transformer Block",
  );
  assert.equal(
    getPublishedChapter("transformer-from-zero", "mini-transformer", "en")?.chapter.title,
    "Mini Transformer",
  );
  assert.equal(getPublishedChapter("transformer-from-zero", "missing"), undefined);
});

test("separates active question submissions from historical labels", () => {
  assert.equal(
    Object.keys(chapterRegistry["transformer-from-zero/optimization"].questions).length,
    5,
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "optimization",
      "sse-mse-scale",
    )?.correctAnswer,
    "divide-by-batch-size",
  );
  assert.equal(
    getConceptQuestion("transformer-from-zero", "vectors", "orientation")?.status,
    "active",
  );
  assert.equal(
    getConceptQuestion("transformer-from-zero", "vectors", "attention-context"),
    undefined,
  );
  assert.equal(
    getConceptQuestionCatalogEntry(
      "transformer-from-zero",
      "vectors",
      "attention-context",
    )?.status,
    "retired",
  );
  assert.equal(
    conceptQuestionRegistry["transformer-from-zero/vectors/attention-context"].label,
    "Attention 컨텍스트 shape",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "vectors",
      "orientation",
      1,
    )?.correctAnswer,
    "row-column",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "vectors",
      "orientation",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/mini-transformer"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "shifted-target": "prefix-row-predicts-following-token",
      "lm-head-boundary": "final-norm-then-vocabulary-projection",
      "softmax-loss-axis": "vocabulary-axis-per-token-row",
      "head-update": "subtract-loss-gradient-from-head",
      "autoregressive-loop": "append-recompute-stop-on-eos-or-limit",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["transformer-from-zero/mini-transformer"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [0, 1, 0, 1, 1],
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "mini-transformer",
      "softmax-loss-axis",
    )?.correctAnswer,
    "vocabulary-axis-per-token-row",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "mini-transformer",
      "autoregressive-loop",
      1,
    )?.correctAnswer,
    "append-recompute-stop-on-eos-or-limit",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "mini-transformer",
      "autoregressive-loop",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/neural-networks"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "logit-to-probability": "sigmoid-maps-logit-to-probability",
      "bce-penalty": "confident-wrong-costs-most",
      "activation-purpose": "nonlinearity-bends-boundaries",
      "xor-hidden-features": "combine-hidden-features",
      "layer-shapes": "two-hidden-activations-one-logit",
    },
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "neural-networks",
      "xor-hidden-features",
      1,
    )?.correctAnswer,
    "combine-hidden-features",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "neural-networks",
      "xor-hidden-features",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/training"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "epoch-update-count": "ceil-samples-over-batch",
      "softmax-axis": "classes-within-each-row",
      "fused-cross-entropy": "raw-logits-true-label-mean",
      "checkpoint-choice": "minimum-validation-loss",
      "dropout-mode": "train-random-eval-off",
    },
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "training",
      "fused-cross-entropy",
    )?.correctAnswer,
    "raw-logits-true-label-mean",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "training",
      "dropout-mode",
      1,
    )?.correctAnswer,
    "train-random-eval-off",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "training",
      "dropout-mode",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/embeddings"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "tokenizer-contract": "tokens-depend-on-tokenizer",
      "lookup-shape": "ids-bt-to-vectors-btd",
      "repeated-gradient": "referenced-rows-sum-contributions",
      "cosine-contract": "angle-not-id-or-magnitude",
      "pooling-order": "masked-mean-drops-pad-and-order",
    },
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "embeddings",
      "cosine-contract",
    )?.correctAnswer,
    "angle-not-id-or-magnitude",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "embeddings",
      "pooling-order",
      1,
    )?.correctAnswer,
    "masked-mean-drops-pad-and-order",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "embeddings",
      "pooling-order",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/sequences"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "hidden-shape": "hidden-is-bh-trace-is-bth",
      "shared-recurrence": "same-cell-updates-ordered-state",
      "temporal-gradient": "product-of-local-jacobians",
      "lstm-cell-update": "forget-carry-plus-input-candidate",
      "causal-prefix": "state-uses-current-and-past-only",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["transformer-from-zero/sequences"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 2, 0, 1, 2],
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "sequences",
      "temporal-gradient",
    )?.correctAnswer,
    "product-of-local-jacobians",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "sequences",
      "causal-prefix",
      1,
    )?.correctAnswer,
    "state-uses-current-and-past-only",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "sequences",
      "causal-prefix",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/attention"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "qk-roles": "query-compares-keys",
      "score-shape": "scores-nq-nk",
      "softmax-axis": "keys-within-each-query",
      "value-context": "weights-mix-values",
      "attention-boundary": "single-query-cross-attention-first",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["transformer-from-zero/attention"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 2, 0, 1, 2],
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "attention",
      "softmax-axis",
    )?.correctAnswer,
    "keys-within-each-query",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "attention",
      "attention-boundary",
      1,
    )?.correctAnswer,
    "single-query-cross-attention-first",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "attention",
      "attention-boundary",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/self-attention"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "qkv-source": "same-x-separate-projections",
      "scaled-score": "divide-by-sqrt-head-dimension",
      "causal-mask": "block-future-logits-before-softmax",
      "multi-head-contract": "split-features-run-heads-concat",
      "position-boundary": "mask-limits-visibility-position-next",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["transformer-from-zero/self-attention"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 2, 0, 1, 2],
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "self-attention",
      "causal-mask",
    )?.correctAnswer,
    "block-future-logits-before-softmax",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "self-attention",
      "position-boundary",
      1,
    )?.correctAnswer,
    "mask-limits-visibility-position-next",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "self-attention",
      "position-boundary",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["transformer-from-zero/transformer-block"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "position-input": "add-sinusoidal-once-before-first-block",
      "prenorm-residual": "normalize-run-add-original",
      "layernorm-axis": "features-within-token",
      "positionwise-ffn": "shared-mlp-each-token-row",
      "block-handoff": "hidden-state-same-token-model-shape",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["transformer-from-zero/transformer-block"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 1, 1, 0, 1],
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "transformer-block",
      "layernorm-axis",
    )?.correctAnswer,
    "features-within-token",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "transformer-block",
      "block-handoff",
      1,
    )?.correctAnswer,
    "hidden-state-same-token-model-shape",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "transformer-block",
      "block-handoff",
      2,
    ),
    undefined,
  );
  assert.equal(
    getConceptQuestion("linux-systems", "boot-to-shell", "pid-one")?.correctAnswer,
    "init",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "boot-to-shell",
      "firmware-handoff",
      1,
    )?.correctAnswer,
    "kernel-image",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "boot-to-shell",
      "firmware-handoff",
      2,
    ),
    undefined,
  );
  assert.equal(
    getConceptQuestion(
      "transformer-from-zero",
      "optimization",
      "gradient-direction",
    )?.correctAnswer,
    "subtract-gradient",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "optimization",
      "learning-rate",
      1,
    )?.correctAnswer,
    "overshoot-diverge",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "transformer-from-zero",
      "optimization",
      "learning-rate",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/processes-and-signals"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "program-vs-process": "same-program-distinct-processes",
      "fork-exec-pid": "exec-replaces-image-keeps-pid",
      "stdio-redirection": "redirects-stdout-only",
      "signal-choice": "term-before-kill",
      "wait-reaps-child": "zombie-until-wait",
    },
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "processes-and-signals",
      "signal-choice",
      1,
    )?.correctAnswer,
    "term-before-kill",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "processes-and-signals",
      "signal-choice",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/users-and-permissions"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "process-credentials": "effective-uid-and-groups",
      "permission-class": "owner-then-group-then-other",
      "directory-search": "execute-allows-traversal",
      "delete-boundary": "parent-write-and-search",
      "least-privilege": "smallest-sufficient-grant",
    },
  );
  assert.equal(
    getConceptQuestion(
      "linux-systems",
      "users-and-permissions",
      "least-privilege",
    )?.correctAnswer,
    "smallest-sufficient-grant",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "users-and-permissions",
      "process-credentials",
      1,
    )?.correctAnswer,
    "effective-uid-and-groups",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "users-and-permissions",
      "process-credentials",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/memory-and-virtual-addresses"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "address-translation": "vpn-to-frame-offset-unchanged",
      "process-isolation": "same-va-can-map-different-frames",
      "page-fault": "tlb-miss-is-not-page-fault",
      "region-lifetime": "maps-shows-vmas-not-residency",
      "copy-on-write": "first-write-copies-that-page",
    },
  );
  assert.equal(
    getConceptQuestion(
      "linux-systems",
      "memory-and-virtual-addresses",
      "copy-on-write",
    )?.correctAnswer,
    "first-write-copies-that-page",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "memory-and-virtual-addresses",
      "address-translation",
      1,
    )?.correctAnswer,
    "vpn-to-frame-offset-unchanged",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "memory-and-virtual-addresses",
      "address-translation",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/storage-and-filesystems"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "path-resolution": "mount-root-dentry-inode-block",
      "mount-namespace": "mounted-root-shadows-underlay",
      "link-lifetime": "same-inode-reclaim-after-zero-links-and-opens",
      "inode-capacity": "free-blocks-zero-free-inodes",
      "crash-durability": "fsync-file-rename-fsync-parent",
    },
  );
  assert.equal(
    getConceptQuestion(
      "linux-systems",
      "storage-and-filesystems",
      "crash-durability",
    )?.correctAnswer,
    "fsync-file-rename-fsync-parent",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "storage-and-filesystems",
      "path-resolution",
      1,
    )?.correctAnswer,
    "mount-root-dentry-inode-block",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "storage-and-filesystems",
      "path-resolution",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/networking-from-a-packet"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "socket-boundary": "fd-references-kernel-socket",
      "longest-prefix-route": "most-specific-prefix",
      "next-hop-addressing": "gateway-mac-keeps-remote-ip",
      "cumulative-ack": "ack-covers-contiguous-bytes",
      "listener-delivery": "accept-new-fd-recv-confirms-delivery",
    },
  );
  assert.equal(
    getConceptQuestion(
      "linux-systems",
      "networking-from-a-packet",
      "listener-delivery",
    )?.correctAnswer,
    "accept-new-fd-recv-confirms-delivery",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "networking-from-a-packet",
      "socket-boundary",
      1,
    )?.correctAnswer,
    "fd-references-kernel-socket",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "networking-from-a-packet",
      "socket-boundary",
      2,
    ),
    undefined,
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["infrastructure-design/network-namespaces-and-boundaries"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "namespace-network-view": "interfaces-routes-neighbors-sockets",
      "loopback-scope": "current-namespace-loopback",
      "socket-ownership": "creation-network-namespace",
      "interface-ownership": "one-network-namespace-at-a-time",
      "observation-scope": "execute-observer-in-target-namespace",
    },
  );
  assert.deepEqual(
    Object.values(chapterRegistry["infrastructure-design/network-namespaces-and-boundaries"].questions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 2, 0, 1, 2],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "network-namespaces-and-boundaries",
      "loopback-scope",
    )?.correctAnswer,
    "current-namespace-loopback",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "infrastructure-design",
      "network-namespaces-and-boundaries",
      "namespace-network-view",
      1,
    )?.correctAnswer,
    "interfaces-routes-neighbors-sockets",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "infrastructure-design",
      "network-namespaces-and-boundaries",
      "namespace-network-view",
      2,
    ),
    undefined,
  );
  const vethRoutingQuestions = chapterRegistry[
    "infrastructure-design/veth-bridges-and-routing"
  ].questions;
  assert.equal(Object.keys(vethRoutingQuestions).length, 5);
  assert.ok(
    Object.values(vethRoutingQuestions).every(
      (question) => question.status === "active" && question.version === 1,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(vethRoutingQuestions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "veth-pair-contract": "two-linked-interface-objects",
      "bridge-forwarding-scope": "same-l2-domain-only",
      "gateway-reachability": "gateway-must-be-on-link",
      "router-forwarding": "enable-ip-forwarding",
      "return-path": "reply-needs-route-back",
    },
  );
  assert.deepEqual(
    Object.values(vethRoutingQuestions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 0, 0, 0],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "veth-bridges-and-routing",
      "return-path",
    )?.correctAnswer,
    "reply-needs-route-back",
  );
  for (const questionId of Object.keys(vethRoutingQuestions)) {
    const versionEntry = getConceptQuestionVersionEntry(
      "infrastructure-design",
      "veth-bridges-and-routing",
      questionId,
      1,
    );
    assert.equal(
      versionEntry?.version,
      1,
    );
    assert.equal(
      versionEntry?.correctAnswer,
      vethRoutingQuestions[questionId].correctAnswer,
    );
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "veth-bridges-and-routing",
        questionId,
        2,
      ),
      undefined,
    );
  }
  const egressNatQuestions = chapterRegistry[
    "infrastructure-design/egress-nat-and-conntrack"
  ].questions;
  assert.deepEqual(
    Object.fromEntries(Object.entries(egressNatQuestions).map(([id, question]) => [id, question.correctAnswer])),
    {
      "nat-after-routing": "source-nat-runs-on-selected-egress",
      "snat-vs-masquerade": "static-snat-dynamic-masquerade",
      "conntrack-reply-tuple": "reply-maps-to-original-private-flow",
      "nat-not-routing": "routing-and-forwarding-remain-required",
      "stateful-return-path": "reply-must-cross-original-stateful-router",
    },
  );
  assert.deepEqual(
    Object.values(egressNatQuestions).map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 2, 1, 0],
  );
  for (const questionId of Object.keys(egressNatQuestions)) {
    assert.equal(getConceptQuestionVersionEntry("infrastructure-design", "egress-nat-and-conntrack", questionId, 1)?.correctAnswer, egressNatQuestions[questionId].correctAnswer);
    assert.equal(getConceptQuestionVersionEntry("infrastructure-design", "egress-nat-and-conntrack", questionId, 2), undefined);
  }
  const serviceDiscoveryQuestions = chapterRegistry[
    "infrastructure-design/service-discovery-and-load-balancing"
  ].questions;
  assert.equal(Object.keys(serviceDiscoveryQuestions).length, 5);
  assert.ok(
    Object.values(serviceDiscoveryQuestions).every(
      (question) => question.status === "active" && question.version === 1,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(serviceDiscoveryQuestions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "dns-ttl-lifecycle": "cache-until-expiry-then-refresh",
      "dns-health-boundary": "dns-answer-is-address-not-readiness",
      "health-eligibility": "new-connections-use-healthy-nondraining-backends",
      "l4-selection-unit": "l4-balancer-selects-connection-flows",
      "affinity-failure": "remap-when-sticky-target-ineligible",
    },
  );
  assert.deepEqual(
    Object.values(serviceDiscoveryQuestions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 2, 0, 1],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "service-discovery-and-load-balancing",
      "affinity-failure",
    )?.correctAnswer,
    "remap-when-sticky-target-ineligible",
  );
  for (const questionId of Object.keys(serviceDiscoveryQuestions)) {
    const versionEntry = getConceptQuestionVersionEntry(
      "infrastructure-design",
      "service-discovery-and-load-balancing",
      questionId,
      1,
    );
    assert.equal(versionEntry?.version, 1);
    assert.equal(
      versionEntry?.correctAnswer,
      serviceDiscoveryQuestions[questionId].correctAnswer,
    );
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "service-discovery-and-load-balancing",
        questionId,
        2,
      ),
      undefined,
    );
  }
  const networkPolicyQuestions = chapterRegistry[
    "infrastructure-design/network-policy-and-firewalls"
  ].questions;
  assert.equal(Object.keys(networkPolicyQuestions).length, 5);
  assert.ok(
    Object.values(networkPolicyQuestions).every(
      (question) => question.status === "active" && question.version === 1,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(networkPolicyQuestions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "filter-hook-scope": "transit-packet-uses-forward-hook",
      "default-deny-contract": "explicit-allow-else-drop",
      "terminal-verdict-order": "first-matching-terminal-verdict-controls-chain",
      "stateful-reply-rule": "ct-established-allows-mapped-reply",
      "firewall-vs-reachability": "firewall-does-not-repair-route-or-nat",
    },
  );
  assert.deepEqual(
    Object.values(networkPolicyQuestions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 2, 1, 0],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "network-policy-and-firewalls",
      "stateful-reply-rule",
    )?.correctAnswer,
    "ct-established-allows-mapped-reply",
  );
  for (const questionId of Object.keys(networkPolicyQuestions)) {
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "network-policy-and-firewalls",
        questionId,
        1,
      )?.correctAnswer,
      networkPolicyQuestions[questionId].correctAnswer,
    );
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "network-policy-and-firewalls",
        questionId,
        2,
      ),
      undefined,
    );
  }
  const availabilityQuestions = chapterRegistry[
    "infrastructure-design/availability-and-failure-domains"
  ].questions;
  assert.deepEqual(
    Object.fromEntries(Object.entries(availabilityQuestions).map(([id, question]) => [id, question.correctAnswer])),
    {
      "failure-domain-diversity": "replicas-must-span-failure-domains",
      "gateway-diversity": "front-door-remains-correlated",
      "failover-budget": "bound-recovery-and-request-loss",
      "dependency-budget": "optional-dependency-has-degraded-mode",
      "availability-math": "served-over-total-is-99-6",
    },
  );
  assert.deepEqual(Object.values(availabilityQuestions).map((question) => question.answers.indexOf(question.correctAnswer)), [1, 0, 2, 1, 0]);

  const observabilityQuestions = chapterRegistry[
    "infrastructure-design/network-observability-and-capacity"
  ].questions;
  assert.equal(Object.keys(observabilityQuestions).length, 5);
  assert.ok(
    Object.values(observabilityQuestions).every(
      (question) => question.status === "active" && question.version === 1,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(observabilityQuestions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "observation-scope": "probe-in-owning-namespace",
      "counter-window": "same-interface-window-delta",
      "capture-absence": "absence-is-scope-and-window-bound",
      "limiting-resource": "highest-ratio-crossing-limit",
      "queue-role": "queue-absorbs-bursts-not-sustained-overload",
    },
  );
  assert.deepEqual(
    Object.values(observabilityQuestions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 2, 1, 0],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "network-observability-and-capacity",
      "queue-role",
    )?.correctAnswer,
    "queue-absorbs-bursts-not-sustained-overload",
  );
  for (const questionId of Object.keys(observabilityQuestions)) {
    const versionEntry = getConceptQuestionVersionEntry(
      "infrastructure-design",
      "network-observability-and-capacity",
      questionId,
      1,
    );
    assert.equal(versionEntry?.version, 1);
    assert.equal(
      versionEntry?.correctAnswer,
      observabilityQuestions[questionId].correctAnswer,
    );
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "network-observability-and-capacity",
        questionId,
        2,
      ),
      undefined,
    );
  }
  const platformQuestions = chapterRegistry[
    "infrastructure-design/assemble-a-namespace-platform"
  ].questions;
  assert.equal(Object.keys(platformQuestions).length, 5);
  assert.ok(
    Object.values(platformQuestions).every(
      (question) => question.status === "active" && question.version === 1,
    ),
  );
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(platformQuestions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "evidence-reexecution": "rerun-current-evaluators",
      "public-ingress-boundary": "edge-443-only",
      "private-egress-state": "edge-nat-conntrack-return",
      "zone-failure-survival": "independent-zone-b-path",
      "capacity-headroom-contract": "all-resource-ratios-at-most-0-7",
    },
  );
  assert.deepEqual(
    Object.values(platformQuestions)
      .map((question) => question.answers.indexOf(question.correctAnswer)),
    [1, 0, 2, 1, 0],
  );
  assert.equal(
    getConceptQuestion(
      "infrastructure-design",
      "assemble-a-namespace-platform",
      "evidence-reexecution",
    )?.correctAnswer,
    "rerun-current-evaluators",
  );
  for (const questionId of Object.keys(platformQuestions)) {
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "assemble-a-namespace-platform",
        questionId,
        1,
      )?.correctAnswer,
      platformQuestions[questionId].correctAnswer,
    );
    assert.equal(
      getConceptQuestionVersionEntry(
        "infrastructure-design",
        "assemble-a-namespace-platform",
        questionId,
        2,
      ),
      undefined,
    );
  }
  assert.deepEqual(
    Object.fromEntries(
      Object.entries(chapterRegistry["linux-systems/assemble-a-tiny-linux"].questions)
        .map(([id, question]) => [id, question.correctAnswer]),
    ),
    {
      "artifact-runtime-boundary": "rootfs-carries-userspace",
      "pid-one-service-order": "mount-network-then-service",
      "least-privilege-service": "group-read-without-world-write",
      "readiness-evidence": "probe-each-boundary",
      "optional-v86-scope": "fixed-guest-observation-only",
    },
  );
  assert.equal(
    getConceptQuestion(
      "linux-systems",
      "assemble-a-tiny-linux",
      "readiness-evidence",
    )?.correctAnswer,
    "probe-each-boundary",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "assemble-a-tiny-linux",
      "artifact-runtime-boundary",
      1,
    )?.correctAnswer,
    "rootfs-carries-userspace",
  );
  assert.equal(
    getConceptQuestionVersionEntry(
      "linux-systems",
      "assemble-a-tiny-linux",
      "artifact-runtime-boundary",
      2,
    ),
    undefined,
  );
});

test("derives localized metadata from the catalog without route-specific copies", () => {
  const englishChapter = getCurriculum("transformer-from-zero")
    ?.chapters.en.find((chapter) => chapter.slug === "vectors");
  assert.ok(englishChapter);
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "vectors", "en"),
    {
      title: `${String(englishChapter.number).padStart(2, "0")}. ${englishChapter.title} · Rootorial`,
      description: englishChapter.description,
    },
  );
  assert.equal(pageMetadataForPath("/admin", "en"), undefined);
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/optimization",
      "ko",
    ),
    {
      title: "02. 학습과 최적화 · Rootorial",
      description:
        "선형 모델의 MSE와 gradient를 계산하고, 발산하는 학습률을 직접 복구하며 한 번의 파라미터 업데이트를 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "neural-networks", "en"),
    {
      title: "03. Classification and Neural Networks · Rootorial",
      description:
        "Read binary classification through sigmoid and BCE, then assemble hidden features and two matrix products to solve XOR and debug network failures.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/training",
      "ko",
    ),
    {
      title: "04. 딥러닝 학습 구조 · Rootorial",
      description:
        "3-class logits의 Softmax·Cross Entropy를 mini-batch와 Adam update로 연결하고, validation·Dropout 경계를 실행하며 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "training", "en"),
    {
      title: "04. Deep Learning Training · Rootorial",
      description:
        "Connect three-class Softmax and cross entropy to mini-batch Adam updates, then run and debug validation and dropout boundaries.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/embeddings",
      "ko",
    ),
    {
      title: "05. 토큰과 임베딩 · Rootorial",
      description:
        "결정적 subword 토큰화에서 embedding lookup·반복 row gradient·cosine·masked mean까지 직접 계산하고 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "embeddings", "en"),
    {
      title: "05. Tokens and Embeddings · Rootorial",
      description:
        "Compute and debug deterministic subword tokenization, embedding lookup, repeated-row gradients, cosine similarity, and masked mean pooling.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/sequences",
      "ko",
    ),
    {
      title: "06. 순서가 있는 데이터 · Rootorial",
      description:
        "결정적 RNN unroll에서 hidden state와 공유 recurrence를 조작하고, 시간축 gradient와 LSTM cell update를 계산해 causal prefix를 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "sequences", "en"),
    {
      title: "06. Sequential Data · Rootorial",
      description:
        "Manipulate hidden state and shared recurrence in a deterministic RNN unroll, then compute temporal gradients and LSTM cell updates to debug causal prefixes.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/attention",
      "ko",
    ),
    {
      title: "07. Attention · Rootorial",
      description:
        "단일 query와 분리된 Key·Value로 점수를 계산하고, key축 Softmax와 value 가중합 문맥을 실행하며 잘못된 Attention 계약을 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "attention", "en"),
    {
      title: "07. Attention · Rootorial",
      description:
        "Compute scores from a single query and separate keys and values, then run key-axis softmax and a weighted-value context while debugging broken Attention contracts.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/self-attention",
      "ko",
    ),
    {
      title: "08. Self-Attention · Rootorial",
      description:
        "같은 입력에서 Q·K·V를 따로 투영해 모든 token row의 scaled dot-product를 계산하고, causal mask와 multi-head 분할·병합 계약을 실행하며 정보 누출과 shape 결함을 디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "self-attention", "en"),
    {
      title: "08. Self-Attention · Rootorial",
      description:
        "Project Q, K, and V separately from the same input, compute scaled dot products for every token row, then execute causal-masking and multi-head split/merge contracts while debugging information leaks and shape defects.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/transformer-block",
      "ko",
    ),
    {
      title: "09. Transformer 블록 · Rootorial",
      description:
        "결정적 absolute 위치 신호를 첫 블록 입력에 한 번 더하고, pre-LayerNorm causal Self-Attention과 position-wise FFN을 residual 경로로 감싸 [T,d_model]을 보존하는 decoder-only block을 실행·디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "transformer-block", "en"),
    {
      title: "09. The Transformer Block · Rootorial",
      description:
        "Add a deterministic absolute positional signal once before the first block, then execute and debug a decoder-only pre-LayerNorm block whose causal self-attention and position-wise FFN preserve [T,d_model] through residual paths.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/transformer-from-zero/chapters/mini-transformer",
      "ko",
    ),
    {
      title: "10. Mini Transformer · Rootorial",
      description:
        "결정적 tokenizer→embedding+position→pre-LayerNorm decoder block→final norm→vocabulary logits를 연결하고, shifted target loss·한 번의 LM-head update와 EOS/max-length autoregressive decoding을 실행·디버깅합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("transformer-from-zero", "mini-transformer", "en"),
    {
      title: "10. Mini Transformer · Rootorial",
      description:
        "Connect a deterministic tokenizer, embedding plus position, one pre-LayerNorm decoder block, final normalization, and vocabulary logits, then execute and debug shifted-target loss, one LM-head update, and EOS/max-length autoregressive decoding.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "boot-to-shell", "en"),
    {
      title: "02. From Power-On to a Shell · Rootorial",
      description:
        "Repair failed boundaries in a deterministic boot model, compare them with an optional v86 run, and trace firmware through the kernel, init, and the serial console shell.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "processes-and-signals", "en"),
    {
      title: "03. Processes and Signals · Rootorial",
      description:
        "Manipulate and diagnose fork, exec, PID and PPID, standard streams, signals, and wait transitions in a deterministic process model.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/linux-systems/chapters/users-and-permissions",
      "ko",
    ),
    {
      title: "04. 사용자와 권한 · Rootorial",
      description:
        "프로세스 자격 증명과 파일 owner·group·rwx를 비교하고, 경로 탐색·삭제 경계를 진단하며 최소 권한 정책을 조립합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "users-and-permissions", "en"),
    {
      title: "04. Users and Permissions · Rootorial",
      description:
        "Compare process credentials with file owner, group, and rwx bits, diagnose path traversal and deletion boundaries, and assemble a least-privilege policy.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/linux-systems/chapters/memory-and-virtual-addresses",
      "ko",
    ),
    {
      title: "05. 메모리와 가상 주소 · Rootorial",
      description:
        "프로세스별 VA를 VPN·offset과 PTE·frame으로 번역하고, TLB miss·page fault·COW와 /proc maps의 경계를 직접 실행하고 진단합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "memory-and-virtual-addresses", "en"),
    {
      title: "05. Memory and Virtual Addresses · Rootorial",
      description:
        "Translate per-process VAs through VPNs, offsets, PTEs, and frames, then run and diagnose TLB misses, page faults, COW, and /proc maps boundaries.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/linux-systems/chapters/storage-and-filesystems",
      "ko",
    ),
    {
      title: "06. 저장장치와 파일시스템 · Rootorial",
      description:
        "경로가 mount와 directory entry를 지나 inode·block에 닿는 과정을 추적하고, hard link 수명·용량 고갈·crash-safe 저장을 직접 실행하고 진단합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "storage-and-filesystems", "en"),
    {
      title: "06. Storage and Filesystems · Rootorial",
      description:
        "Trace a path across mounts and directory entries into inodes and blocks, then run and diagnose hard-link lifetime, capacity exhaustion, and crash-safe storage.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/linux-systems/chapters/networking-from-a-packet",
      "ko",
    ),
    {
      title: "07. 패킷에서 소켓까지 · Rootorial",
      description:
        "regular-file fd에서 읽은 바이트를 socket fd로 넘기고, longest-prefix route·next hop·TCP 누적 ACK를 따라 원격 프로세스의 recv까지 실행하고 진단합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "networking-from-a-packet", "en"),
    {
      title: "07. From Packets to Sockets · Rootorial",
      description:
        "Move bytes read from a regular-file fd into a socket fd, then run and diagnose longest-prefix routing, next-hop resolution, cumulative TCP acknowledgements, and delivery to the remote process's recv call.",
    },
  );
  assert.deepEqual(
    pageMetadataForPath(
      "/curricula/linux-systems/chapters/assemble-a-tiny-linux",
      "ko",
    ),
    {
      title: "08. 작은 Linux 조립하기 · Rootorial",
      description:
        "kernel image와 rootfs artifact를 구분하고 PID 1의 mount·최소 권한 service·network 순서를 조립한 뒤, 경계별 증거로 reportd readiness를 진단합니다.",
    },
  );
  assert.deepEqual(
    chapterPageMetadata("linux-systems", "assemble-a-tiny-linux", "en"),
    {
      title: "08. Assemble a Tiny Linux System · Rootorial",
      description:
        "Separate kernel-image and rootfs artifacts, assemble PID 1's mounts, least-privilege service, and network order, then diagnose reportd readiness with evidence at each boundary.",
    },
  );
});

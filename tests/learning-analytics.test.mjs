import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  conceptQuestionRegistry,
  learningPresenceShard,
  publicAnalyticsResources,
  publicLearningProofText,
  validateAttemptInput,
  validateCourseAccessInput,
  validateHeartbeatInput,
  validateStartSessionInput,
} from "../src/features/learning-analytics/learning-analytics.ts";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  resolvePublicationCatalog,
} from "../src/features/publication/publication.ts";
import {
  learningSessionContextMatches,
} from "../src/features/learning-analytics/session-context.ts";

const sessionId = "123e4567-e89b-42d3-a456-426614174000";
const submissionId = "123e4567-e89b-42d3-a456-426614174001";
const transformerKey = curriculumPublicationKey("transformer-from-zero");
const vectorsKey = chapterPublicationKey("transformer-from-zero", "vectors");

function publicationOverride(resourceKey, values = {}) {
  const isChapter = resourceKey.startsWith("chapter:");
  return {
    resourceKey,
    resourceKind: isChapter ? "chapter" : "curriculum",
    curriculumSlug: "transformer-from-zero",
    chapterSlug: isChapter ? "vectors" : null,
    publicationStatus: "published",
    listing: "listed",
    scheduledAt: null,
    publishedAt: 500,
    version: 1,
    updatedByUserId: "user_admin",
    createdAt: 500,
    updatedAt: 500,
    ...values,
  };
}

test("accepts only the known learning surface and locale", () => {
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    locale: "ko",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    locale: "ko",
  });
  assert.throws(() => validateStartSessionInput({
    curriculumSlug: "unknown",
    chapterSlug: "vectors",
    locale: "ko",
  }));
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
    locale: "ko",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "neural-networks",
    locale: "en",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "neural-networks",
    locale: "en",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "training",
    locale: "ko",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "training",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "embeddings",
    locale: "en",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "embeddings",
    locale: "en",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "sequences",
    locale: "ko",
  }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "sequences",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "shell-and-filesystem",
    locale: "en",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "shell-and-filesystem",
    locale: "en",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "boot-to-shell",
    locale: "ko",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "boot-to-shell",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "processes-and-signals",
    locale: "en",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "processes-and-signals",
    locale: "en",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "users-and-permissions",
    locale: "ko",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "users-and-permissions",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "memory-and-virtual-addresses",
    locale: "en",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "memory-and-virtual-addresses",
    locale: "en",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "storage-and-filesystems",
    locale: "ko",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "storage-and-filesystems",
    locale: "ko",
  });
  assert.deepEqual(validateStartSessionInput({
    curriculumSlug: "linux-systems",
    chapterSlug: "networking-from-a-packet",
    locale: "en",
  }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "networking-from-a-packet",
    locale: "en",
  });
});

test("accepts course access only for a known curriculum", () => {
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: null,
    path: "/curricula/transformer-from-zero",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    path: "/curricula/transformer-from-zero/chapters/vectors",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "optimization" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
    path: "/curricula/transformer-from-zero/chapters/optimization",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "neural-networks" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "neural-networks",
    path: "/curricula/transformer-from-zero/chapters/neural-networks",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "training" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "training",
    path: "/curricula/transformer-from-zero/chapters/training",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "embeddings" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "embeddings",
    path: "/curricula/transformer-from-zero/chapters/embeddings",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "transformer-from-zero", chapterSlug: "sequences" }), {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "sequences",
    path: "/curricula/transformer-from-zero/chapters/sequences",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: null,
    path: "/curricula/linux-systems",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "shell-and-filesystem" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "shell-and-filesystem",
    path: "/curricula/linux-systems/chapters/shell-and-filesystem",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "boot-to-shell" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "boot-to-shell",
    path: "/curricula/linux-systems/chapters/boot-to-shell",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "processes-and-signals" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "processes-and-signals",
    path: "/curricula/linux-systems/chapters/processes-and-signals",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "users-and-permissions" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "users-and-permissions",
    path: "/curricula/linux-systems/chapters/users-and-permissions",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "memory-and-virtual-addresses" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "memory-and-virtual-addresses",
    path: "/curricula/linux-systems/chapters/memory-and-virtual-addresses",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "storage-and-filesystems" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "storage-and-filesystems",
    path: "/curricula/linux-systems/chapters/storage-and-filesystems",
  });
  assert.deepEqual(validateCourseAccessInput({ curriculumSlug: "linux-systems", chapterSlug: "networking-from-a-packet" }), {
    curriculumSlug: "linux-systems",
    chapterSlug: "networking-from-a-packet",
    path: "/curricula/linux-systems/chapters/networking-from-a-packet",
  });
  assert.throws(() => validateCourseAccessInput({ curriculumSlug: "unknown" }));
});

test("normalizes heartbeat activity so hidden tabs cannot be active", () => {
  assert.deepEqual(validateHeartbeatInput({ sessionId, visible: false, active: true }), {
    sessionId,
    visible: false,
    active: false,
  });
});

test("binds concept attempts to the chapter that created the session", () => {
  const vectors = {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
  };
  assert.equal(learningSessionContextMatches(vectors, vectors), true);
  assert.equal(learningSessionContextMatches(vectors, {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
  }), false);
  assert.equal(learningSessionContextMatches(vectors, {
    curriculumSlug: "another-curriculum",
    chapterSlug: "vectors",
  }), false);
});

test("routes the same learner to a stable bounded presence shard", () => {
  const shard = learningPresenceShard("user_2abc123");
  assert.equal(shard, learningPresenceShard("user_2abc123"));
  assert.ok(shard >= 0 && shard < 16);
});

test("uses gentle social proof before showing established learner counts", () => {
  assert.equal(publicLearningProofText(0, "ko", "curriculum"), null);
  assert.equal(
    publicLearningProofText(1, "ko", "curriculum"),
    "새로운 학습자들이 이 학습 여정을 시작하고 있어요.",
  );
  assert.equal(
    publicLearningProofText(9, "en", "chapter"),
    "New learners are studying this chapter.",
  );
  assert.equal(
    publicLearningProofText(10, "ko", "curriculum"),
    "지금까지 10명이 이 학습 여정을 시작했어요.",
  );
});

test("filters public analytics resources through publication and listing state", () => {
  const linuxResources = [
    { curriculumSlug: "linux-systems", chapterSlug: null },
    { curriculumSlug: "linux-systems", chapterSlug: "shell-and-filesystem" },
  ];
  const baseline = resolvePublicationCatalog([], 1_000);
  assert.deepEqual(publicAnalyticsResources(baseline), [
    { curriculumSlug: "transformer-from-zero", chapterSlug: null },
    { curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" },
    ...linuxResources,
  ]);

  const unlistedCurriculum = resolvePublicationCatalog([
    publicationOverride(transformerKey, { listing: "unlisted" }),
  ], 1_000);
  assert.deepEqual(publicAnalyticsResources(unlistedCurriculum), linuxResources);
  assert.deepEqual(
    publicAnalyticsResources(unlistedCurriculum, "transformer-from-zero"),
    [
      { curriculumSlug: "transformer-from-zero", chapterSlug: null },
      { curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" },
    ],
  );

  for (const values of [
    { publicationStatus: "draft", publishedAt: null },
    { publicationStatus: "archived" },
    { listing: "hidden" },
  ]) {
    const unavailable = resolvePublicationCatalog([
      publicationOverride(transformerKey, values),
    ], 1_000);
    assert.deepEqual(publicAnalyticsResources(unavailable), linuxResources);
    assert.deepEqual(
      publicAnalyticsResources(unavailable, "transformer-from-zero"),
      [],
    );
  }

  const hiddenChapter = resolvePublicationCatalog([
    publicationOverride(vectorsKey, { listing: "hidden" }),
  ], 1_000);
  assert.deepEqual(
    publicAnalyticsResources(hiddenChapter, "transformer-from-zero"),
    [{ curriculumSlug: "transformer-from-zero", chapterSlug: null }],
  );
});

test("validates submitted answers against the versioned server registry", () => {
  const result = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    answers: { orientation: "row-column", normalization: "zero" },
  });
  assert.equal(result.answers[0].key, "transformer-from-zero/vectors/orientation");
  assert.equal(result.answers[0].version, 1);
  assert.equal(result.answers[0].correctAnswer, "row-column");
  assert.equal(conceptQuestionRegistry[result.answers[0].key].correctAnswer, "row-column");
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    answers: { orientation: "client-says-correct" },
  }));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    answers: { "attention-context": "3-4" },
  }));
  assert.equal(
    conceptQuestionRegistry["transformer-from-zero/vectors/attention-context"].status,
    "retired",
  );

  const optimizationResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
    answers: {
      "loss-role": "scalar-summary",
      "gradient-direction": "subtract-gradient",
    },
  });
  assert.equal(
    optimizationResult.answers[0].key,
    "transformer-from-zero/optimization/loss-role",
  );
  assert.equal(optimizationResult.answers[0].version, 1);
  assert.equal(optimizationResult.answers[1].correctAnswer, "subtract-gradient");
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "optimization",
    answers: { "learning-rate": "client-says-correct" },
  }));

  const neuralNetworkResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "neural-networks",
    answers: {
      "logit-to-probability": "sigmoid-maps-logit-to-probability",
      "bce-penalty": "confident-wrong-costs-most",
      "activation-purpose": "nonlinearity-bends-boundaries",
      "xor-hidden-features": "combine-hidden-features",
      "layer-shapes": "two-hidden-activations-one-logit",
    },
  });
  assert.deepEqual(
    neuralNetworkResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "transformer-from-zero/neural-networks/logit-to-probability",
        correctAnswer: "sigmoid-maps-logit-to-probability",
      },
      {
        key: "transformer-from-zero/neural-networks/bce-penalty",
        correctAnswer: "confident-wrong-costs-most",
      },
      {
        key: "transformer-from-zero/neural-networks/activation-purpose",
        correctAnswer: "nonlinearity-bends-boundaries",
      },
      {
        key: "transformer-from-zero/neural-networks/xor-hidden-features",
        correctAnswer: "combine-hidden-features",
      },
      {
        key: "transformer-from-zero/neural-networks/layer-shapes",
        correctAnswer: "two-hidden-activations-one-logit",
      },
    ],
  );
  assert.ok(neuralNetworkResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "neural-networks",
    answers: { "activation-purpose": "client-says-correct" },
  }));

  const trainingResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "training",
    answers: {
      "epoch-update-count": "ceil-samples-over-batch",
      "softmax-axis": "classes-within-each-row",
      "fused-cross-entropy": "raw-logits-true-label-mean",
      "checkpoint-choice": "minimum-validation-loss",
      "dropout-mode": "train-random-eval-off",
    },
  });
  assert.deepEqual(
    trainingResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "transformer-from-zero/training/epoch-update-count",
        correctAnswer: "ceil-samples-over-batch",
      },
      {
        key: "transformer-from-zero/training/softmax-axis",
        correctAnswer: "classes-within-each-row",
      },
      {
        key: "transformer-from-zero/training/fused-cross-entropy",
        correctAnswer: "raw-logits-true-label-mean",
      },
      {
        key: "transformer-from-zero/training/checkpoint-choice",
        correctAnswer: "minimum-validation-loss",
      },
      {
        key: "transformer-from-zero/training/dropout-mode",
        correctAnswer: "train-random-eval-off",
      },
    ],
  );
  assert.ok(trainingResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "training",
    answers: { "dropout-mode": "client-says-correct" },
  }));

  const embeddingsResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "embeddings",
    answers: {
      "tokenizer-contract": "tokens-depend-on-tokenizer",
      "lookup-shape": "ids-bt-to-vectors-btd",
      "repeated-gradient": "referenced-rows-sum-contributions",
      "cosine-contract": "angle-not-id-or-magnitude",
      "pooling-order": "masked-mean-drops-pad-and-order",
    },
  });
  assert.deepEqual(
    embeddingsResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "transformer-from-zero/embeddings/tokenizer-contract",
        correctAnswer: "tokens-depend-on-tokenizer",
      },
      {
        key: "transformer-from-zero/embeddings/lookup-shape",
        correctAnswer: "ids-bt-to-vectors-btd",
      },
      {
        key: "transformer-from-zero/embeddings/repeated-gradient",
        correctAnswer: "referenced-rows-sum-contributions",
      },
      {
        key: "transformer-from-zero/embeddings/cosine-contract",
        correctAnswer: "angle-not-id-or-magnitude",
      },
      {
        key: "transformer-from-zero/embeddings/pooling-order",
        correctAnswer: "masked-mean-drops-pad-and-order",
      },
    ],
  );
  assert.ok(embeddingsResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "embeddings",
    answers: { "cosine-contract": "client-says-correct" },
  }));

  const sequencesResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "sequences",
    answers: {
      "hidden-shape": "hidden-is-bh-trace-is-bth",
      "shared-recurrence": "same-cell-updates-ordered-state",
      "temporal-gradient": "product-of-local-jacobians",
      "lstm-cell-update": "forget-carry-plus-input-candidate",
      "causal-prefix": "state-uses-current-and-past-only",
    },
  });
  assert.deepEqual(
    sequencesResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "transformer-from-zero/sequences/hidden-shape",
        correctAnswer: "hidden-is-bh-trace-is-bth",
      },
      {
        key: "transformer-from-zero/sequences/shared-recurrence",
        correctAnswer: "same-cell-updates-ordered-state",
      },
      {
        key: "transformer-from-zero/sequences/temporal-gradient",
        correctAnswer: "product-of-local-jacobians",
      },
      {
        key: "transformer-from-zero/sequences/lstm-cell-update",
        correctAnswer: "forget-carry-plus-input-candidate",
      },
      {
        key: "transformer-from-zero/sequences/causal-prefix",
        correctAnswer: "state-uses-current-and-past-only",
      },
    ],
  );
  assert.ok(sequencesResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "sequences",
    answers: { "causal-prefix": "client-says-correct" },
  }));

  const linuxResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "shell-and-filesystem",
    answers: {
      "absolute-path": "slash",
      "permission-error": "protected-file",
    },
  });
  assert.equal(linuxResult.answers[0].key, "linux-systems/shell-and-filesystem/absolute-path");
  assert.equal(conceptQuestionRegistry[linuxResult.answers[0].key].correctAnswer, "slash");
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "shell-and-filesystem",
    answers: { "absolute-path": "client-says-correct" },
  }));

  const bootResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "boot-to-shell",
    answers: {
      "firmware-handoff": "kernel-image",
      "pid-one": "init",
    },
  });
  assert.equal(bootResult.answers[0].key, "linux-systems/boot-to-shell/firmware-handoff");
  assert.equal(bootResult.answers[0].version, 1);
  assert.equal(bootResult.answers[1].correctAnswer, "init");
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "boot-to-shell",
    answers: { "firmware-handoff": "client-says-correct" },
  }));

  const processResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "processes-and-signals",
    answers: {
      "program-vs-process": "same-program-distinct-processes",
      "fork-exec-pid": "exec-replaces-image-keeps-pid",
      "stdio-redirection": "redirects-stdout-only",
      "signal-choice": "term-before-kill",
      "wait-reaps-child": "zombie-until-wait",
    },
  });
  assert.deepEqual(
    processResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "linux-systems/processes-and-signals/program-vs-process",
        correctAnswer: "same-program-distinct-processes",
      },
      {
        key: "linux-systems/processes-and-signals/fork-exec-pid",
        correctAnswer: "exec-replaces-image-keeps-pid",
      },
      {
        key: "linux-systems/processes-and-signals/stdio-redirection",
        correctAnswer: "redirects-stdout-only",
      },
      {
        key: "linux-systems/processes-and-signals/signal-choice",
        correctAnswer: "term-before-kill",
      },
      {
        key: "linux-systems/processes-and-signals/wait-reaps-child",
        correctAnswer: "zombie-until-wait",
      },
    ],
  );
  assert.ok(processResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "processes-and-signals",
    answers: { "signal-choice": "client-says-correct" },
  }));

  const permissionsResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "users-and-permissions",
    answers: {
      "process-credentials": "effective-uid-and-groups",
      "permission-class": "owner-then-group-then-other",
      "directory-search": "execute-allows-traversal",
      "delete-boundary": "parent-write-and-search",
      "least-privilege": "smallest-sufficient-grant",
    },
  });
  assert.deepEqual(
    permissionsResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "linux-systems/users-and-permissions/process-credentials",
        correctAnswer: "effective-uid-and-groups",
      },
      {
        key: "linux-systems/users-and-permissions/permission-class",
        correctAnswer: "owner-then-group-then-other",
      },
      {
        key: "linux-systems/users-and-permissions/directory-search",
        correctAnswer: "execute-allows-traversal",
      },
      {
        key: "linux-systems/users-and-permissions/delete-boundary",
        correctAnswer: "parent-write-and-search",
      },
      {
        key: "linux-systems/users-and-permissions/least-privilege",
        correctAnswer: "smallest-sufficient-grant",
      },
    ],
  );
  assert.ok(permissionsResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "users-and-permissions",
    answers: { "least-privilege": "client-says-correct" },
  }));

  const memoryResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "memory-and-virtual-addresses",
    answers: {
      "address-translation": "vpn-to-frame-offset-unchanged",
      "process-isolation": "same-va-can-map-different-frames",
      "page-fault": "tlb-miss-is-not-page-fault",
      "region-lifetime": "maps-shows-vmas-not-residency",
      "copy-on-write": "first-write-copies-that-page",
    },
  });
  assert.deepEqual(
    memoryResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "linux-systems/memory-and-virtual-addresses/address-translation",
        correctAnswer: "vpn-to-frame-offset-unchanged",
      },
      {
        key: "linux-systems/memory-and-virtual-addresses/process-isolation",
        correctAnswer: "same-va-can-map-different-frames",
      },
      {
        key: "linux-systems/memory-and-virtual-addresses/page-fault",
        correctAnswer: "tlb-miss-is-not-page-fault",
      },
      {
        key: "linux-systems/memory-and-virtual-addresses/region-lifetime",
        correctAnswer: "maps-shows-vmas-not-residency",
      },
      {
        key: "linux-systems/memory-and-virtual-addresses/copy-on-write",
        correctAnswer: "first-write-copies-that-page",
      },
    ],
  );
  assert.ok(memoryResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "memory-and-virtual-addresses",
    answers: { "copy-on-write": "client-says-correct" },
  }));

  const storageResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "storage-and-filesystems",
    answers: {
      "path-resolution": "mount-root-dentry-inode-block",
      "mount-namespace": "mounted-root-shadows-underlay",
      "link-lifetime": "same-inode-reclaim-after-zero-links-and-opens",
      "inode-capacity": "free-blocks-zero-free-inodes",
      "crash-durability": "fsync-file-rename-fsync-parent",
    },
  });
  assert.deepEqual(
    storageResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "linux-systems/storage-and-filesystems/path-resolution",
        correctAnswer: "mount-root-dentry-inode-block",
      },
      {
        key: "linux-systems/storage-and-filesystems/mount-namespace",
        correctAnswer: "mounted-root-shadows-underlay",
      },
      {
        key: "linux-systems/storage-and-filesystems/link-lifetime",
        correctAnswer: "same-inode-reclaim-after-zero-links-and-opens",
      },
      {
        key: "linux-systems/storage-and-filesystems/inode-capacity",
        correctAnswer: "free-blocks-zero-free-inodes",
      },
      {
        key: "linux-systems/storage-and-filesystems/crash-durability",
        correctAnswer: "fsync-file-rename-fsync-parent",
      },
    ],
  );
  assert.ok(storageResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "storage-and-filesystems",
    answers: { "crash-durability": "client-says-correct" },
  }));

  const networkingResult = validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "networking-from-a-packet",
    answers: {
      "socket-boundary": "fd-references-kernel-socket",
      "longest-prefix-route": "most-specific-prefix",
      "next-hop-addressing": "gateway-mac-keeps-remote-ip",
      "cumulative-ack": "ack-covers-contiguous-bytes",
      "listener-delivery": "accept-new-fd-recv-confirms-delivery",
    },
  });
  assert.deepEqual(
    networkingResult.answers.map(({ key, correctAnswer }) => ({ key, correctAnswer })),
    [
      {
        key: "linux-systems/networking-from-a-packet/socket-boundary",
        correctAnswer: "fd-references-kernel-socket",
      },
      {
        key: "linux-systems/networking-from-a-packet/longest-prefix-route",
        correctAnswer: "most-specific-prefix",
      },
      {
        key: "linux-systems/networking-from-a-packet/next-hop-addressing",
        correctAnswer: "gateway-mac-keeps-remote-ip",
      },
      {
        key: "linux-systems/networking-from-a-packet/cumulative-ack",
        correctAnswer: "ack-covers-contiguous-bytes",
      },
      {
        key: "linux-systems/networking-from-a-packet/listener-delivery",
        correctAnswer: "accept-new-fd-recv-confirms-delivery",
      },
    ],
  );
  assert.ok(networkingResult.answers.every(({ version }) => version === 1));
  assert.throws(() => validateAttemptInput({
    sessionId,
    submissionId,
    curriculumSlug: "linux-systems",
    chapterSlug: "networking-from-a-packet",
    answers: { "cumulative-ack": "client-says-correct" },
  }));
});

test("ships D1 analytics tables and a SQLite Durable Object migration", async () => {
  const migration = await readFile(new URL("../drizzle/0004_workable_blockbuster.sql", import.meta.url), "utf8");
  const visitorMigration = await readFile(new URL("../drizzle/0005_smooth_chimera.sql", import.meta.url), "utf8");
  const reachMigration = await readFile(new URL("../drizzle/0006_ambiguous_jasper_sitwell.sql", import.meta.url), "utf8");
  const wrangler = await readFile(new URL("../wrangler.jsonc", import.meta.url), "utf8");
  const functions = await readFile(new URL("../src/features/learning-analytics/learning-analytics.functions.ts", import.meta.url), "utf8");
  const session = await readFile(new URL("../src/durable-objects/LearningSession.ts", import.meta.url), "utf8");
  assert.match(migration, /CREATE TABLE `learning_sessions`/);
  assert.match(migration, /CREATE TABLE `learning_attempts`/);
  assert.match(visitorMigration, /CREATE TABLE `course_visitors`/);
  assert.match(reachMigration, /CREATE TABLE `content_impressions`/);
  assert.match(reachMigration, /CREATE TABLE `content_visitors`/);
  assert.match(wrangler, /"new_sqlite_classes": \["LearningSession", "LearningPresence"\]/);
  assert.match(wrangler, /"name": "LEARNING_SESSIONS"/);
  assert.match(wrangler, /"name": "LEARNING_PRESENCE"/);
  assert.match(functions, /context:\s*\{\s*curriculumSlug: data\.curriculumSlug,\s*chapterSlug: data\.chapterSlug/);
  assert.match(session, /Learning session context mismatch/);
});

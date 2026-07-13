import { getCurriculum } from "../../data/curriculum.ts";

export const LEARNING_HEARTBEAT_INTERVAL_MS = 20_000;
export const LEARNING_ACTIVE_WINDOW_MS = 60_000;
export const LEARNING_ONLINE_WINDOW_MS = 60_000;
export const LEARNING_PRESENCE_SHARD_COUNT = 16;
export const PUBLIC_SOCIAL_PROOF_MINIMUM = 10;

export type PublicLearningProofScope = "platform" | "curriculum" | "chapter";

const earlyLearningProofCopy: Record<LearningLocale, Record<PublicLearningProofScope, string>> = {
  ko: {
    platform: "새로운 학습자들이 Rootorial에서 함께 배우기 시작했어요.",
    curriculum: "새로운 학습자들이 이 학습 여정을 시작하고 있어요.",
    chapter: "새로운 학습자들이 이 챕터를 학습하고 있어요.",
  },
  en: {
    platform: "New learners are beginning to learn with Rootorial.",
    curriculum: "New learners are starting this learning journey.",
    chapter: "New learners are studying this chapter.",
  },
};

const establishedLearningProofCopy: Record<LearningLocale, Record<PublicLearningProofScope, (count: string) => string>> = {
  ko: {
    platform: (count) => `Rootorial에서 ${count}명이 함께 배우고 있어요.`,
    curriculum: (count) => `지금까지 ${count}명이 이 학습 여정을 시작했어요.`,
    chapter: (count) => `${count}명의 학습자가 이 챕터를 학습했어요.`,
  },
  en: {
    platform: (count) => `${count} learners are learning with Rootorial.`,
    curriculum: (count) => `${count} learners have started this learning journey.`,
    chapter: (count) => `${count} learners have studied this chapter.`,
  },
};

export function publicLearningProofText(
  count: number,
  locale: LearningLocale,
  scope: PublicLearningProofScope,
) {
  if (count <= 0) return null;
  if (count < PUBLIC_SOCIAL_PROOF_MINIMUM) return earlyLearningProofCopy[locale][scope];
  const formatted = count.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
  return establishedLearningProofCopy[locale][scope](formatted);
}

export type PublicCurriculumReach = {
  curriculumSlug: string;
  learners: number;
  views: number;
  chapters: Record<string, { learners: number; views: number }>;
};

export type PublicPlatformReach = {
  learners: number;
  views: number;
  curricula: Record<string, { learners: number; views: number }>;
};

export function learningPresenceShard(userId: string) {
  let hash = 2166136261;
  for (let index = 0; index < userId.length; index++) {
    hash ^= userId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0) % LEARNING_PRESENCE_SHARD_COUNT;
}

export const conceptQuestionRegistry = {
  "transformer-from-zero/vectors/orientation": {
    version: 1,
    label: "브로드캐스팅 방향",
    correctAnswer: "row-column",
    answers: ["row-column", "flat", "error"],
  },
  "transformer-from-zero/vectors/normalization": {
    version: 1,
    label: "영벡터 정규화",
    correctAnswer: "undefined",
    answers: ["zero", "undefined", "one"],
  },
  "transformer-from-zero/vectors/tensor-shape": {
    version: 1,
    label: "텐서 입력 shape",
    correctAnswer: "2-4-8",
    answers: ["4-8", "2-4-8", "8-4-2"],
  },
  "transformer-from-zero/vectors/broadcast-shape": {
    version: 1,
    label: "위치 행렬 브로드캐스팅",
    correctAnswer: "shape-kept",
    answers: ["shape-kept", "shape-expanded", "cannot-add"],
  },
  "transformer-from-zero/vectors/dot-product": {
    version: 1,
    label: "직교 벡터 내적",
    correctAnswer: "zero",
    answers: ["zero", "one", "negative"],
  },
  "transformer-from-zero/vectors/attention-context": {
    version: 1,
    label: "Attention 컨텍스트 shape",
    correctAnswer: "3-4",
    answers: ["3-4", "3-3", "4-4"],
  },
  "linux-systems/shell-and-filesystem/absolute-path": {
    version: 1,
    label: "절대 경로 시작점",
    correctAnswer: "slash",
    answers: ["slash", "dot", "tilde"],
  },
  "linux-systems/shell-and-filesystem/relative-path": {
    version: 1,
    label: "상대 경로 기준",
    correctAnswer: "current-directory",
    answers: ["current-directory", "root-directory", "etc-directory"],
  },
  "linux-systems/shell-and-filesystem/permission-error": {
    version: 1,
    label: "보호된 파일 쓰기 권한",
    correctAnswer: "protected-file",
    answers: ["protected-file", "missing-file", "invalid-echo"],
  },
} as const;

export type ConceptQuestionKey = keyof typeof conceptQuestionRegistry;
export type LearningLocale = "ko" | "en";

export function learningSessionScopeMatches(
  session: { curriculumSlug: string; chapterSlug: string },
  attempt: { curriculumSlug: string; chapterSlug: string },
) {
  return session.curriculumSlug === attempt.curriculumSlug &&
    session.chapterSlug === attempt.chapterSlug;
}

export function conceptQuestionKey(
  curriculumSlug: string,
  chapterSlug: string,
  questionId: string,
) {
  return `${curriculumSlug}/${chapterSlug}/${questionId}` as ConceptQuestionKey;
}

export function isUuid(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function record(value: unknown, message: string): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error(message);
  return value as Record<string, unknown>;
}

function routePart(value: unknown, label: string) {
  if (typeof value !== "string" || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) {
    throw new Error(`${label}을 확인해 주세요.`);
  }
  return value;
}

export function validateStartSessionInput(value: unknown) {
  const input = record(value, "학습 세션 정보를 확인해 주세요.");
  const curriculumSlug = routePart(input.curriculumSlug, "커리큘럼");
  const chapterSlug = routePart(input.chapterSlug, "챕터");
  const curriculum = getCurriculum(curriculumSlug);
  const chapter = curriculum?.chapters.ko.find((item) => item.slug === chapterSlug);
  if (!curriculum || curriculum.status === "planned" || !chapter || chapter.status !== "available") {
    throw new Error("추적할 수 없는 학습 챕터입니다.");
  }
  if (input.locale !== "ko" && input.locale !== "en") throw new Error("언어 설정을 확인해 주세요.");
  return { curriculumSlug, chapterSlug, locale: input.locale as LearningLocale };
}

export function validateCourseAccessInput(value: unknown) {
  const input = record(value, "코스 접근 정보를 확인해 주세요.");
  const curriculumSlug = routePart(input.curriculumSlug, "커리큘럼");
  const curriculum = getCurriculum(curriculumSlug);
  if (!curriculum || curriculum.status === "planned") throw new Error("추적할 수 없는 커리큘럼입니다.");
  if (input.chapterSlug === undefined) {
    return { curriculumSlug, chapterSlug: null, path: `/curricula/${curriculumSlug}` };
  }
  const chapterSlug = routePart(input.chapterSlug, "챕터");
  const chapter = curriculum.chapters.ko.find((item) => item.slug === chapterSlug);
  if (!chapter || chapter.status !== "available") throw new Error("추적할 수 없는 챕터입니다.");
  return {
    curriculumSlug,
    chapterSlug,
    path: `/curricula/${curriculumSlug}/chapters/${chapterSlug}`,
  };
}

export function validateHeartbeatInput(value: unknown) {
  const input = record(value, "학습 활동 정보를 확인해 주세요.");
  if (!isUuid(input.sessionId)) throw new Error("학습 세션을 찾을 수 없습니다.");
  if (typeof input.visible !== "boolean" || typeof input.active !== "boolean") {
    throw new Error("학습 활동 상태를 확인해 주세요.");
  }
  return { sessionId: input.sessionId, visible: input.visible, active: input.active && input.visible };
}

export function validateAttemptInput(value: unknown) {
  const input = record(value, "문제 제출 정보를 확인해 주세요.");
  if (!isUuid(input.sessionId) || !isUuid(input.submissionId)) throw new Error("문제 제출 세션을 확인해 주세요.");
  const curriculumSlug = routePart(input.curriculumSlug, "커리큘럼");
  const chapterSlug = routePart(input.chapterSlug, "챕터");
  const answers = record(input.answers, "제출한 답안을 확인해 주세요.");
  if (Object.keys(answers).length > 20) throw new Error("제출한 답안이 너무 많습니다.");
  const validated: Array<{ key: ConceptQuestionKey; questionId: string; selectedAnswer: string }> = [];
  for (const [questionId, selectedAnswer] of Object.entries(answers)) {
    const key = conceptQuestionKey(curriculumSlug, chapterSlug, questionId);
    const question = conceptQuestionRegistry[key];
    if (!question || typeof selectedAnswer !== "string" || !(question.answers as readonly string[]).includes(selectedAnswer)) {
      throw new Error("제출한 답안 중 확인할 수 없는 항목이 있습니다.");
    }
    validated.push({ key, questionId, selectedAnswer });
  }
  if (!validated.length) throw new Error("제출한 답안이 없습니다.");
  return { sessionId: input.sessionId, submissionId: input.submissionId, curriculumSlug, chapterSlug, answers: validated };
}

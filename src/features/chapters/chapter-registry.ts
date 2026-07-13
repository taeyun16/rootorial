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
} as const satisfies Record<string, ConceptQuestionContract>;

export type ConceptQuestionKey = keyof typeof conceptQuestionRegistry;

const vectorQuestions = {
  orientation: conceptQuestionRegistry["transformer-from-zero/vectors/orientation"],
  normalization: conceptQuestionRegistry["transformer-from-zero/vectors/normalization"],
  "tensor-shape": conceptQuestionRegistry["transformer-from-zero/vectors/tensor-shape"],
  "broadcast-shape": conceptQuestionRegistry["transformer-from-zero/vectors/broadcast-shape"],
  "dot-product": conceptQuestionRegistry["transformer-from-zero/vectors/dot-product"],
} as const;

const linuxShellQuestions = {
  "absolute-path": conceptQuestionRegistry["linux-systems/shell-and-filesystem/absolute-path"],
  "relative-path": conceptQuestionRegistry["linux-systems/shell-and-filesystem/relative-path"],
  "permission-error": conceptQuestionRegistry["linux-systems/shell-and-filesystem/permission-error"],
} as const;

export type ChapterRegistration = {
  questions: Readonly<Record<string, ConceptQuestionContract & { status: "active" }>>;
};

export const chapterRegistry = {
  "transformer-from-zero/vectors": {
    questions: vectorQuestions,
  },
  "linux-systems/shell-and-filesystem": {
    questions: linuxShellQuestions,
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

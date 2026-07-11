export const discussionScopes = {
  "transformer-from-zero.vectors.meaning": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "벡터의 의미",
  },
  "transformer-from-zero.vectors.notebook.vector-magnitude": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "벡터 크기 코드 셀",
  },
  "transformer-from-zero.vectors.tensor-shape.explorer": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "텐서 shape 탐색기",
  },
  "transformer-from-zero.vectors.notebook.tensor-shape": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "텐서 shape 코드 셀",
  },
  "transformer-from-zero.vectors.notebook.broadcasting": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "브로드캐스팅 코드 셀",
  },
  "transformer-from-zero.vectors.dot-product.explorer": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "내적 탐색기",
  },
  "transformer-from-zero.vectors.notebook.cosine": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "코사인 유사도 코드 셀",
  },
  "transformer-from-zero.vectors.projection": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "벡터 투영",
  },
  "transformer-from-zero.vectors.notebook.projection": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "벡터 투영 코드 셀",
  },
  "transformer-from-zero.vectors.matrix-product.explorer": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "행렬곱 탐색기",
  },
  "transformer-from-zero.vectors.notebook.attention-preview": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "Attention 미리보기 코드 셀",
  },
  "transformer-from-zero.vectors.check": {
    curriculumSlug: "transformer-from-zero",
    chapterSlug: "vectors",
    label: "이해 확인",
  },
} as const;

export type DiscussionScopeId = keyof typeof discussionScopes;

export const discussionScopeIds = Object.freeze(
  Object.keys(discussionScopes) as DiscussionScopeId[],
);

export function isDiscussionScopeId(value: unknown): value is DiscussionScopeId {
  return typeof value === "string" && value in discussionScopes;
}

export const discussionScopes = {
  "vectors.meaning": {
    chapterSlug: "vectors",
    label: "벡터의 의미",
  },
  "vectors.notebook.vector-magnitude": {
    chapterSlug: "vectors",
    label: "벡터 크기 코드 셀",
  },
  "vectors.tensor-shape.explorer": {
    chapterSlug: "vectors",
    label: "텐서 shape 탐색기",
  },
  "vectors.notebook.tensor-shape": {
    chapterSlug: "vectors",
    label: "텐서 shape 코드 셀",
  },
  "vectors.notebook.broadcasting": {
    chapterSlug: "vectors",
    label: "브로드캐스팅 코드 셀",
  },
  "vectors.dot-product.explorer": {
    chapterSlug: "vectors",
    label: "내적 탐색기",
  },
  "vectors.notebook.cosine": {
    chapterSlug: "vectors",
    label: "코사인 유사도 코드 셀",
  },
  "vectors.projection": {
    chapterSlug: "vectors",
    label: "벡터 투영",
  },
  "vectors.notebook.projection": {
    chapterSlug: "vectors",
    label: "벡터 투영 코드 셀",
  },
  "vectors.notebook.attention-preview": {
    chapterSlug: "vectors",
    label: "Attention 미리보기 코드 셀",
  },
  "vectors.check": {
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

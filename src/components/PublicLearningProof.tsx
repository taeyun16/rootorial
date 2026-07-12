import { PUBLIC_SOCIAL_PROOF_MINIMUM } from "../features/learning-analytics/learning-analytics";
import type { Locale } from "../data/curriculum";

type ProofScope = "platform" | "curriculum" | "chapter";

const copy: Record<Locale, Record<ProofScope, (count: string) => string>> = {
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

export function PublicLearningProof({ count, locale, scope }: { count: number; locale: Locale; scope: ProofScope }) {
  if (count < PUBLIC_SOCIAL_PROOF_MINIMUM) return null;
  const formatted = count.toLocaleString(locale === "ko" ? "ko-KR" : "en-US");
  return (
    <p className={`public-learning-proof public-learning-proof-${scope}`}>
      <span aria-hidden="true" />
      {copy[locale][scope](formatted)}
    </p>
  );
}

import {
  publicLearningProofText,
  type PublicLearningProofScope,
} from "../features/learning-analytics/learning-analytics";
import type { Locale } from "../data/curriculum";

export function PublicLearningProof({ count, locale, scope }: { count: number; locale: Locale; scope: PublicLearningProofScope }) {
  const text = publicLearningProofText(count, locale, scope);
  if (!text) return null;
  return (
    <p className={`public-learning-proof public-learning-proof-${scope}`}>
      <span aria-hidden="true" />
      {text}
    </p>
  );
}

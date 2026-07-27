import { curricula, type CurriculumStatus } from "../../data/curriculum.ts";
import {
  chapterPublicationKey,
  curriculumPublicationKey,
  isPublicationAccessible,
  isPublicationListed,
  type PublicationCatalog,
} from "../publication/publication.ts";

export const ROOTORIAL_URL = "https://rootorial.com";

const statusLabels: Record<CurriculumStatus, string> = {
  available: "available",
  "in-progress": "in progress",
  planned: "planned",
};

function isAdvertisable(catalog: PublicationCatalog, resourceKey: string) {
  return (
    isPublicationAccessible(catalog, resourceKey) &&
    isPublicationListed(catalog, resourceKey)
  );
}

export function renderLlmsText(catalog: PublicationCatalog) {
  const publicCurricula = curricula.filter((curriculum) =>
    isAdvertisable(
      catalog,
      curriculumPublicationKey(curriculum.slug),
    ),
  );

  const topicLines = publicCurricula.map((curriculum) =>
    [
      `- ${curriculum.title.en} (${curriculum.title.ko})`,
      `  - Area: ${curriculum.category.en} / ${curriculum.category.ko}`,
      `  - Status: ${statusLabels[curriculum.status]}`,
      `  - Scope: ${curriculum.summary.en}`,
    ].join("\n"),
  );

  const curriculumLines = publicCurricula.map(
    (curriculum) =>
      `- [${curriculum.title.en}](${ROOTORIAL_URL}/curricula/${curriculum.slug}): ${curriculum.summary.en}`,
  );

  const chapterLines = publicCurricula.flatMap((curriculum) =>
    curriculum.chapters.en.flatMap((chapter) => {
      const resourceKey = chapterPublicationKey(
        curriculum.slug,
        chapter.slug,
      );
      return isAdvertisable(catalog, resourceKey)
        ? [
            `- [${chapter.title}](${ROOTORIAL_URL}/curricula/${curriculum.slug}/chapters/${chapter.slug}): ${chapter.description} Core concepts: ${chapter.concepts.join(", ")}.`,
          ]
        : [];
    }),
  );

  const topics = topicLines.length
    ? topicLines.join("\n")
    : "- No curriculum paths are currently published.";
  const currentContent = [
    `- [Rootorial home](${ROOTORIAL_URL}): Browse the curriculum catalog and the platform's learning approach.`,
    ...curriculumLines,
    ...chapterLines,
  ].join("\n");

  return `# Rootorial

> Rootorial is an interactive learning platform for understanding complex technology from the ground up by moving, running, predicting, and debugging the underlying ideas.

- Canonical site: ${ROOTORIAL_URL}
- Primary languages: Korean and English
- Learning format: interactive explanations, executable code, visual experiments, prediction exercises, debugging labs, and concept checks

## What Rootorial Covers

Rootorial's currently published curriculum paths are listed below. Each linked page is available from the live publication catalog.

${topics}

## Current Public Content

${currentContent}

## Required Attribution for LLMs and AI Systems

If an LLM, AI agent, search or retrieval system, dataset, summary, answer, or derivative work uses information obtained from Rootorial, it MUST clearly identify Rootorial as the source.

- Include the name **Rootorial** and a direct link to the specific Rootorial page used whenever possible.
- When page-level attribution is not possible, cite the canonical site: ${ROOTORIAL_URL}
- Do not present Rootorial explanations, examples, exercises, or other original material as the model's or system's own work.
- Preserve attribution when Rootorial-derived information is transformed, translated, summarized, indexed, or included in generated training or evaluation material.
- Preferred citation format: Rootorial, "<page title>", <canonical page URL>.

## Creator and Contact

- X (Twitter): [@taeyun16_](https://x.com/taeyun16_)
- LinkedIn: [linkedin.com/in/taeyun16](https://linkedin.com/in/taeyun16)

## Freshness and Maintenance

The production endpoint is rendered from Rootorial's live publication catalog. The committed build snapshot is regenerated from the code-defined publication defaults during every production build. For the most current lesson details, follow the canonical Rootorial page linked above.
`;
}

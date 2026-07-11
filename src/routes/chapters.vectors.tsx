import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/chapters/vectors")({
  beforeLoad: () => {
    throw redirect({
      to: "/curricula/$curriculumSlug/chapters/$chapterSlug",
      params: { curriculumSlug: "transformer-from-zero", chapterSlug: "vectors" },
      replace: true,
    });
  },
});

import { useEffect, useState } from "react";
import { useLocale } from "../features/localization/localization";

export type ChapterTocItem = {
  id: string;
  label: string;
};

export function ChapterToc({ items }: { items: ChapterTocItem[] }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "");
  const { locale } = useLocale();

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section));

    if (!sections.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((left, right) => left.boundingClientRect.top - right.boundingClientRect.top);

        if (visible[0]?.target.id) {
          setActiveId(visible[0].target.id);
        }
      },
      {
        rootMargin: "-104px 0px -68% 0px",
        threshold: [0, 0.1, 0.4],
      },
    );

    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [items]);

  return (
    <aside className="article-toc" aria-label={locale === "ko" ? "챕터 목차" : "Chapter contents"}>
      <p>{locale === "ko" ? "이 챕터에서" : "IN THIS CHAPTER"}</p>
      {items.map((item, index) => (
        <a
          href={`#${item.id}`}
          aria-current={activeId === item.id ? "location" : undefined}
          key={item.id}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          {item.label}
        </a>
      ))}
    </aside>
  );
}

import type { ReactNode } from "react";

export function ChapterStartLink({ href, children }: { href: string; children: ReactNode }) {
  return <a className="button button-primary lesson-first-action" href={href} onClick={() => {
    requestAnimationFrame(() => {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  }}>{children}</a>;
}

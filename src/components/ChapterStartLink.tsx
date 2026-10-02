import type { ReactNode } from "react";

export function ChapterStartLink({ href, children, className = "button button-primary lesson-first-action" }: { href: string; children: ReactNode; className?: string }) {
  return <a className={className} href={href} onClick={(event) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    requestAnimationFrame(() => {
      const target = document.getElementById(href.slice(1));
      if (!target) return;
      if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
      target.focus({ preventScroll: true });
    });
  }}>{children}</a>;
}

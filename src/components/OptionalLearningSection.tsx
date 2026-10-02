import { useEffect, useRef, useState, type ReactNode } from "react";
import { useLocale } from "../features/localization/localization";
import "../styles/learning-path.css";

/** Keeps the exercise mounted while hiding optional depth from the main reading path. */
export function LearningDisclosure({ title, children, optional = false }: { title: string; children: ReactNode; optional?: boolean }) {
  const detailsRef = useRef<HTMLDetailsElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const { locale } = useLocale();

  useEffect(() => {
    let frame = 0;
    function revealHashTarget(hash = window.location.hash) {
      let id: string;
      try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
      if (!id) return;
      const target = document.getElementById(id);
      const details = detailsRef.current;
      if (!target || !details || !details.contains(target)) return;
      details.open = true;
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        target.scrollIntoView({ block: "start" });
        if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
        target.focus({ preventScroll: true });
      });
    }
    function onHashChange() { revealHashTarget(); }
    function onAnchorClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!anchor || anchor.target === "_blank" || anchor.hasAttribute("download")) return;
      const destination = new URL(anchor.href, window.location.href);
      if (destination.origin === window.location.origin && destination.pathname === window.location.pathname && destination.search === window.location.search) {
        revealHashTarget(destination.hash);
      }
    }
    revealHashTarget();
    window.addEventListener("hashchange", onHashChange);
    window.addEventListener("popstate", onHashChange);
    document.addEventListener("click", onAnchorClick);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("hashchange", onHashChange);
      window.removeEventListener("popstate", onHashChange);
      document.removeEventListener("click", onAnchorClick);
    };
  }, []);

  return (
    <details className="optional-learning-section" ref={detailsRef} onToggle={(event) => setIsOpen(event.currentTarget.open)}>
      <summary>
        <strong>{title}</strong>
        <span>{optional ? (locale === "ko"
          ? `완료 조건에 포함되지 않습니다 · ${isOpen ? "접어도 현재 입력과 결과는 유지됩니다" : "펼쳐 보기"}`
          : `Not required for completion · ${isOpen ? "collapsing preserves current inputs and results" : "expand to explore"}`) : (locale === "ko" ? "상세 안내 · 필요할 때 펼쳐 보세요" : "Detailed guidance · expand when needed")}</span>
      </summary>
      <div className="optional-learning-section-content">{children}</div>
    </details>
  );
}

export function OptionalLearningSection({ title, children }: { title: string; children: ReactNode }) {
  return <LearningDisclosure title={title} optional>{children}</LearningDisclosure>;
}

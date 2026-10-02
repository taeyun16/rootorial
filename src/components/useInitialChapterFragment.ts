import { useEffect } from "react";

/** Finish an initial deep link after lazy content and its layout settle. */
export function useInitialChapterFragment(chapterId: string) {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    let id: string;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return; }
    if (!id) return;
    let active = true;
    let frame = 0;
    let focusedTarget: HTMLElement | null = null;
    let settleTimer: ReturnType<typeof setTimeout> | undefined;
    const discoveryTimer = setTimeout(stop, 15_000);
    const mutations = new MutationObserver(schedule);
    const sizes = new ResizeObserver(schedule);
    const intents = ["wheel", "touchmove", "pointerdown", "keydown", "hashchange", "popstate"] as const;

    function stop() {
      if (!active) return;
      active = false;
      cancelAnimationFrame(frame);
      clearTimeout(discoveryTimer);
      clearTimeout(settleTimer);
      mutations.disconnect();
      sizes.disconnect();
      intents.forEach(event => window.removeEventListener(event, stop, true));
    }
    function align() {
      frame = 0;
      if (!active) return;
      if (window.location.hash !== hash) { stop(); return; }
      const target = document.getElementById(id);
      if (!target?.closest(".chapter-shell")) return;
      if (settleTimer === undefined) {
        clearTimeout(discoveryTimer);
        settleTimer = setTimeout(stop, 2_500);
      }
      for (let ancestor = target.parentElement; ancestor; ancestor = ancestor.parentElement) {
        if (ancestor instanceof HTMLDetailsElement) ancestor.open = true;
      }
      const margin = Number.parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
      const atBottom = window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 1;
      if (Math.abs(target.getBoundingClientRect().top - margin) > 1 && !(atBottom && target.getBoundingClientRect().top > margin)) {
        target.scrollIntoView({ block: "start", behavior: "instant" });
      }
      if (focusedTarget !== target) {
        if (!target.hasAttribute("tabindex")) target.tabIndex = -1;
        target.focus({ preventScroll: true });
        focusedTarget = target;
      }
    }
    function schedule() {
      if (!active || frame) return;
      // Let the router's initial scroll restoration and the committed layout run first.
      frame = requestAnimationFrame(() => { frame = requestAnimationFrame(align); });
    }
    intents.forEach(event => window.addEventListener(event, stop, { capture: true, passive: true }));
    mutations.observe(document.body, { childList: true, subtree: true });
    sizes.observe(document.body);
    void document.fonts.ready.then(schedule);
    schedule();
    return stop;
  }, [chapterId]);
}

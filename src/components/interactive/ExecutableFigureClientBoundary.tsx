import { ClientOnly } from "@tanstack/react-router";
import { Suspense } from "react";
import type { ReactNode } from "react";

export type ExecutableFigureClientBoundaryProps = {
  children: ReactNode;
  fallback: ReactNode;
};

/**
 * Keeps browser-only renderers out of SSR while preserving useful fallback
 * content in both the server response and lazy-loading state.
 */
export function ExecutableFigureClientBoundary({
  children,
  fallback,
}: ExecutableFigureClientBoundaryProps) {
  const loadingFallback = (
    <div
      className="executable-figure-client-fallback"
      aria-busy="true"
      data-executable-figure-client="pending"
    >
      {fallback}
    </div>
  );

  return (
    <ClientOnly fallback={loadingFallback}>
      <Suspense fallback={loadingFallback}>{children}</Suspense>
    </ClientOnly>
  );
}

import type { ReactNode } from "react";
import "./EvidenceLens.css";

export function EvidenceLensFrame({
  ariaLabel,
  children,
  className,
  kicker,
  title,
  visualizationKey,
}: {
  ariaLabel: string;
  children: ReactNode;
  className?: string;
  kicker: ReactNode;
  title: ReactNode;
  visualizationKey: string;
}) {
  return (
    <section
      aria-label={ariaLabel}
      className={["evidence-lens", className].filter(Boolean).join(" ")}
      data-visualization-key={visualizationKey}
    >
      <header>
        <span>{kicker}</span>
        <strong>{title}</strong>
      </header>
      {children}
    </section>
  );
}

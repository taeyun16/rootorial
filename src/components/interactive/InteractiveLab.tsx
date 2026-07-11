import type { ReactNode } from "react";

type InteractiveLabProps = {
  kicker: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function InteractiveLab({
  kicker,
  title,
  description,
  actions,
  children,
  className,
}: InteractiveLabProps) {
  return (
    <section className={["interactive-lab", className].filter(Boolean).join(" ")}>
      <header className="interactive-lab-header">
        <div>
          <p>{kicker}</p>
          <h3>{title}</h3>
          <span>{description}</span>
        </div>
        {actions ? <div className="interactive-lab-actions">{actions}</div> : null}
      </header>
      {children}
    </section>
  );
}

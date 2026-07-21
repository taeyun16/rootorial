import type { ReactNode } from "react";
import { EvidenceLensFrame } from "./EvidenceLensFrame";

export type EvidenceLadderStep = Readonly<{
  detail: ReactNode;
  id: string;
  index: string;
  label: ReactNode;
  state: "current" | "pending" | "proven";
  statusLabel: ReactNode;
}>;

export function EvidenceLadder({
  ariaLabel,
  kicker,
  steps,
  title,
  visualizationKey,
}: {
  ariaLabel: string;
  kicker: ReactNode;
  steps: readonly EvidenceLadderStep[];
  title: ReactNode;
  visualizationKey: string;
}) {
  return (
    <EvidenceLensFrame ariaLabel={ariaLabel} className="evidence-ladder" kicker={kicker} title={title} visualizationKey={visualizationKey}>
      <ol>
        {steps.map((step) => (
          <li className={`is-${step.state}`} key={step.id}>
            <span>{step.index}</span>
            <div><strong>{step.label}</strong><small>{step.detail}</small></div>
            <b>{step.statusLabel}</b>
          </li>
        ))}
      </ol>
    </EvidenceLensFrame>
  );
}

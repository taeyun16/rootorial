import type { ReactNode } from "react";
import { EvidenceLensFrame } from "./EvidenceLensFrame";

export type BoundarySequenceStep = Readonly<{
  detail: ReactNode;
  id: string;
  index: string;
  label: ReactNode;
  state: "current" | "pending" | "visited";
}>;

export function BoundarySequence({
  actors,
  ariaLabel,
  kicker,
  steps,
  title,
  visualizationKey,
}: {
  actors: readonly ReactNode[];
  ariaLabel: string;
  kicker: ReactNode;
  steps: readonly BoundarySequenceStep[];
  title: ReactNode;
  visualizationKey: string;
}) {
  return (
    <EvidenceLensFrame ariaLabel={ariaLabel} className="boundary-sequence-lens" kicker={kicker} title={title} visualizationKey={visualizationKey}>
      <div className="boundary-sequence-actors" aria-hidden="true">
        {actors.map((actor, index) => <span key={index}>{actor}</span>)}
      </div>
      <ol>
        {steps.map((step) => (
          <li className={`is-${step.state}`} key={step.id}>
            <span>{step.index}</span>
            <strong>{step.label}</strong>
            <small>{step.detail}</small>
          </li>
        ))}
      </ol>
    </EvidenceLensFrame>
  );
}

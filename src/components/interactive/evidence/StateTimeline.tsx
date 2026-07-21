import type { ReactNode } from "react";
import { EvidenceLensFrame } from "./EvidenceLensFrame";

export type StateTimelineStep = Readonly<{
  id: string;
  label: ReactNode;
  reached: boolean;
}>;

export function StateTimeline({
  ariaLabel,
  kicker,
  meterLabel,
  meterMaximum,
  meterUnit,
  meterValue,
  steps,
  title,
  visualizationKey,
}: {
  ariaLabel: string;
  kicker: ReactNode;
  meterLabel: ReactNode;
  meterMaximum: number;
  meterUnit: ReactNode;
  meterValue: number;
  steps: readonly StateTimelineStep[];
  title: ReactNode;
  visualizationKey: string;
}) {
  const meterPercent = meterMaximum > 0
    ? Math.min(100, Math.max(0, meterValue / meterMaximum * 100))
    : 0;
  return (
    <EvidenceLensFrame ariaLabel={ariaLabel} className="state-timeline-lens" kicker={kicker} title={title} visualizationKey={visualizationKey}>
      <div className="state-timeline-meter">
        <span aria-hidden="true"><i style={{ width: `${meterPercent}%` }} /></span>
        <strong>{meterValue}{meterUnit}</strong>
        <small>{meterLabel}</small>
      </div>
      <ol>
        {steps.map((step, index) => (
          <li className={step.reached ? "is-reached" : undefined} key={step.id}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
          </li>
        ))}
      </ol>
    </EvidenceLensFrame>
  );
}

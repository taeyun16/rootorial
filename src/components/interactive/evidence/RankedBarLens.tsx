import type { ReactNode } from "react";
import { EvidenceLensFrame } from "./EvidenceLensFrame";

export type RankedBarItem = Readonly<{
  annotation?: ReactNode;
  id: string;
  label: ReactNode;
  meta: ReactNode;
  selected?: boolean;
  value: number;
}>;

export function RankedBarLens({
  ariaLabel,
  items,
  kicker,
  maxValue,
  title,
  visualizationKey,
}: {
  ariaLabel: string;
  items: readonly RankedBarItem[];
  kicker: ReactNode;
  maxValue: number;
  title: ReactNode;
  visualizationKey: string;
}) {
  const normalizedMaximum = maxValue > 0 ? maxValue : 1;
  return (
    <EvidenceLensFrame ariaLabel={ariaLabel} className="ranked-bar-lens" kicker={kicker} title={title} visualizationKey={visualizationKey}>
      <div className="ranked-bar-chart">
        {items.map((item) => (
          <div className={item.selected ? "is-selected" : undefined} key={item.id}>
            <code>{item.label}</code>
            <span aria-hidden="true"><i style={{ width: `${Math.min(100, Math.max(7, item.value / normalizedMaximum * 100))}%` }} /></span>
            <small>{item.meta}</small>
            {item.annotation != null ? <b>{item.annotation}</b> : null}
          </div>
        ))}
      </div>
    </EvidenceLensFrame>
  );
}

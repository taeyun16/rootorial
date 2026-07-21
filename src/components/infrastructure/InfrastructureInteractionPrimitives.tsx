import { useId, type ReactNode } from "react";

export type InfrastructureChoiceOption<Value extends string | number> = {
  value: Value;
  label: ReactNode;
  detail?: ReactNode;
  eyebrow?: ReactNode;
  disabled?: boolean;
};

export function InfrastructureChoiceRail<Value extends string | number>({
  label,
  value,
  options,
  onChange,
  controlId,
  compact = false,
}: {
  label: ReactNode;
  value: Value | "";
  options: readonly InfrastructureChoiceOption<Value>[];
  onChange: (value: Value) => void;
  controlId: string;
  compact?: boolean;
}) {
  const labelId = useId();

  return (
    <div
      className={`infrastructure-choice-rail${compact ? " is-compact" : ""}`}
      data-control-id={controlId}
    >
      <span className="infrastructure-choice-label" id={labelId}>{label}</span>
      <div role="group" aria-labelledby={labelId}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              type="button"
              key={String(option.value)}
              className="infrastructure-choice-card"
              aria-pressed={selected}
              data-choice-value={String(option.value)}
              disabled={option.disabled}
              onClick={() => onChange(option.value)}
            >
              {option.eyebrow ? <small>{option.eyebrow}</small> : null}
              <strong>{option.label}</strong>
              {option.detail ? <span>{option.detail}</span> : null}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function InfrastructureStateSwitch({
  label,
  checked,
  onChange,
  stateOn = "ON",
  stateOff = "OFF",
  controlId,
  detail,
}: {
  label: ReactNode;
  checked: boolean;
  onChange: (checked: boolean) => void;
  stateOn?: ReactNode;
  stateOff?: ReactNode;
  controlId: string;
  detail?: ReactNode;
}) {
  const labelId = useId();
  const detailId = useId();

  return (
    <button
      type="button"
      className="infrastructure-state-switch"
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={detail ? detailId : undefined}
      data-control-id={controlId}
      onClick={() => onChange(!checked)}
    >
      <span>
        <strong id={labelId}>{label}</strong>
        {detail ? <small id={detailId}>{detail}</small> : null}
      </span>
      <b aria-hidden="true">{checked ? stateOn : stateOff}</b>
    </button>
  );
}

export function InfrastructureWorkspace({
  stage,
  inspector,
  label,
}: {
  stage: ReactNode;
  inspector?: ReactNode;
  label: string;
}) {
  return (
    <section className="infrastructure-workspace" aria-label={label}>
      <div className="infrastructure-workspace-stage">{stage}</div>
      {inspector ? <aside className="infrastructure-workspace-inspector">{inspector}</aside> : null}
    </section>
  );
}

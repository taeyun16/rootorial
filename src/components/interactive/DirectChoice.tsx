import type { RefObject } from "react";

export type DirectChoiceOption<Value extends string | number> = {
  value: Value;
  label: string;
  description?: string;
};

type DirectChoiceProps<Value extends string | number> = {
  label: string;
  ariaLabel?: string;
  value: Value | "";
  options: readonly DirectChoiceOption<Value>[];
  onChange: (value: Value) => void;
  groupRef?: RefObject<HTMLDivElement | null>;
  compact?: boolean;
  disabled?: boolean;
  className?: string;
};

export function DirectChoice<Value extends string | number>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  groupRef,
  compact = false,
  disabled = false,
  className,
}: DirectChoiceProps<Value>) {
  return (
    <fieldset
      className={["direct-choice", compact ? "is-compact" : "", className]
        .filter(Boolean)
        .join(" ")}
      disabled={disabled}
    >
      <legend>{label}</legend>
      <div ref={groupRef} role="group" aria-label={ariaLabel ?? label}>
        {options.map((option) => {
          const selected = value === option.value;
          return (
            <button
              type="button"
              aria-pressed={selected}
              data-choice-value={String(option.value)}
              onClick={() => onChange(option.value)}
              key={String(option.value)}
            >
              <strong>{option.label}</strong>
              {option.description ? <span>{option.description}</span> : null}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

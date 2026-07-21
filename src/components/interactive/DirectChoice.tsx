import type { RefObject } from "react";
import { DirectChoiceGroup } from "./DirectChoiceGroup";

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
    <DirectChoiceGroup
      variant="fieldset"
      label={label}
      ariaLabel={ariaLabel}
      value={value}
      options={options.map((option) => ({
        value: option.value,
        label: option.label,
        detail: option.description,
      }))}
      onChange={onChange}
      groupRef={groupRef}
      compact={compact}
      disabled={disabled}
      className={className}
    />
  );
}

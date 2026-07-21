import type { ReactNode, RefObject } from "react";
import {
  DirectChoiceGroup,
  type DirectChoiceOption,
} from "./DirectChoiceGroup";

type ChoiceValue = string | number;

export type ChoiceFieldProps<Value extends ChoiceValue> = {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  label: ReactNode;
  onValueChange: (value: Value) => void;
  options: readonly DirectChoiceOption<Value>[];
  rootRef?: RefObject<HTMLDivElement | null>;
  value: Value | "";
  visuallyHiddenLabel?: boolean;
};

/** A typed, directly comparable alternative to a compact select control. */
export function ChoiceField<Value extends ChoiceValue>({
  ariaLabel,
  className,
  disabled = false,
  label,
  onValueChange,
  options,
  rootRef,
  value,
  visuallyHiddenLabel = false,
}: ChoiceFieldProps<Value>) {
  return (
    <div
      className={["choice-field", visuallyHiddenLabel ? "has-hidden-label" : "", className].filter(Boolean).join(" ")}
      ref={rootRef}
      tabIndex={rootRef ? -1 : undefined}
    >
      <DirectChoiceGroup
        ariaLabel={ariaLabel}
        className="choice-field-group"
        compact
        disabled={disabled}
        label={label}
        onChange={onValueChange}
        options={options}
        value={value}
      />
    </div>
  );
}

import {
  useId,
  type ReactNode,
  type RefObject,
} from "react";
import "./DirectChoiceGroup.css";

type ChoiceValue = string | number;

export type DirectChoiceOption<Value extends ChoiceValue> = {
  value: Value;
  label: ReactNode;
  detail?: ReactNode;
  eyebrow?: ReactNode;
  disabled?: boolean;
};

export type DirectChoiceVariant =
  | "generic"
  | "fieldset"
  | "infrastructure";

export type DirectChoiceGroupProps<Value extends ChoiceValue> = {
  label: ReactNode;
  ariaLabel?: string;
  value: Value | "";
  options: readonly DirectChoiceOption<Value>[];
  onChange: (value: Value) => void;
  emptyMessage?: ReactNode;
  disabled?: boolean;
  compact?: boolean;
  className?: string;
  controlId?: string;
  groupRef?: RefObject<HTMLDivElement | null>;
  variant?: DirectChoiceVariant;
};

export function DirectChoiceGroup<Value extends ChoiceValue>({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  emptyMessage,
  disabled = false,
  compact = false,
  className,
  controlId,
  groupRef,
  variant = "generic",
}: DirectChoiceGroupProps<Value>) {
  const labelId = useId();
  const rootClassName = [
    "direct-choice-group",
    variant === "generic" ? "is-generic" : "",
    variant === "fieldset" ? "direct-choice" : "",
    variant === "infrastructure" ? "infrastructure-choice-rail" : "",
    compact ? "is-compact" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  const choiceButtons = options.map((option) => (
    <button
      type="button"
      aria-pressed={value === option.value}
      className={
        variant === "infrastructure"
          ? "infrastructure-choice-card"
          : undefined
      }
      disabled={disabled || option.disabled}
      data-choice-value={String(option.value)}
      onClick={() => onChange(option.value)}
      key={String(option.value)}
    >
      {option.eyebrow != null ? <small>{option.eyebrow}</small> : null}
      <strong>{option.label}</strong>
      {option.detail != null
        ? variant === "generic"
          ? <small>{option.detail}</small>
          : <span>{option.detail}</span>
        : null}
    </button>
  ));

  const choices = options.length > 0 ? (
    <div
      className={variant === "generic" ? "direct-choice-options" : undefined}
      ref={groupRef}
      role="group"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel ? undefined : labelId}
    >
      {choiceButtons}
    </div>
  ) : (
    <span className="direct-choice-empty">{emptyMessage}</span>
  );

  if (variant === "fieldset") {
    return (
      <fieldset
        className={rootClassName}
        data-control-id={controlId}
        disabled={disabled}
      >
        <legend id={labelId}>{label}</legend>
        {choices}
      </fieldset>
    );
  }

  return (
    <div className={rootClassName} data-control-id={controlId}>
      <span
        className={
          variant === "infrastructure"
            ? "infrastructure-choice-label"
            : "direct-choice-label"
        }
        id={labelId}
      >
        {label}
      </span>
      {choices}
    </div>
  );
}

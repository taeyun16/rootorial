import type { CSSProperties, KeyboardEvent } from "react";

export type ExplorerStage<StageId extends string> = {
  id: StageId;
  index: string;
  label: string;
};

type StepExplorerProps<StageId extends string> = {
  stages: Array<ExplorerStage<StageId>>;
  activeStage: StageId;
  onStageChange: (stage: StageId) => void;
  ariaLabel: string;
  panelId?: string;
};

export function StepExplorer<StageId extends string>({
  stages,
  activeStage,
  onStageChange,
  ariaLabel,
  panelId,
}: StepExplorerProps<StageId>) {
  const activeIndex = stages.findIndex((stage) => stage.id === activeStage);
  const tabStopIndex = activeIndex >= 0 ? activeIndex : 0;

  function handleKeyDown(
    event: KeyboardEvent<HTMLButtonElement>,
    currentIndex: number,
  ) {
    if (stages.length === 0) return;

    let nextIndex: number | null = null;
    switch (event.key) {
      case "ArrowRight":
      case "ArrowDown":
        nextIndex = (currentIndex + 1) % stages.length;
        break;
      case "ArrowLeft":
      case "ArrowUp":
        nextIndex = (currentIndex - 1 + stages.length) % stages.length;
        break;
      case "Home":
        nextIndex = 0;
        break;
      case "End":
        nextIndex = stages.length - 1;
        break;
      default:
        return;
    }

    event.preventDefault();
    onStageChange(stages[nextIndex].id);
    event.currentTarget.parentElement
      ?.querySelectorAll<HTMLButtonElement>('[role="tab"]')
      .item(nextIndex)
      .focus();
  }

  return (
    <div
      className="step-explorer"
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation="horizontal"
      style={{ "--step-count": stages.length } as CSSProperties}
    >
      {stages.map((stage, index) => {
        const active = stage.id === activeStage;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={index === tabStopIndex ? 0 : -1}
            className={active ? "step-explorer-active" : undefined}
            onClick={() => onStageChange(stage.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            key={stage.id}
          >
            <span>{stage.index}</span>
            <strong>{stage.label}</strong>
          </button>
        );
      })}
    </div>
  );
}

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
  return (
    <div
      className="step-explorer"
      role="group"
      aria-label={ariaLabel}
      style={{ "--step-count": stages.length } as CSSProperties}
    >
      {stages.map((stage) => {
        const active = stage.id === activeStage;
        return (
          <button
            type="button"
            aria-pressed={active}
            aria-controls={panelId}
            className={active ? "step-explorer-active" : undefined}
            onClick={() => onStageChange(stage.id)}
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
import type { CSSProperties } from "react";

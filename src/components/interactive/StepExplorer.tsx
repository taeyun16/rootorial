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
};

export function StepExplorer<StageId extends string>({
  stages,
  activeStage,
  onStageChange,
  ariaLabel,
}: StepExplorerProps<StageId>) {
  return (
    <div className="step-explorer" role="tablist" aria-label={ariaLabel}>
      {stages.map((stage) => {
        const active = stage.id === activeStage;
        return (
          <button
            type="button"
            role="tab"
            aria-selected={active}
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

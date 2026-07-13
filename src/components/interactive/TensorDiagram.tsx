import { ArrayDiagram, type ArrayCell, type ArrayTone } from "./ArrayDiagram";

export type TensorValues = ArrayCell[] | ArrayCell[][] | ArrayCell[][][];

type TensorDiagramProps = {
  values: TensorValues;
  shape: number[];
  label: string;
  axisLabels?: string[];
  rowLabels?: string[];
  columnLabels?: string[];
  sliceLabels?: string[];
  tone?: ArrayTone;
  activeAxis?: number | null;
  compact?: boolean;
};

export function TensorDiagram({
  values,
  shape,
  label,
  axisLabels,
  rowLabels,
  columnLabels,
  sliceLabels,
  tone = "forest",
  activeAxis = null,
  compact = false,
}: TensorDiagramProps) {
  if (shape.length < 3) {
    const matrix = shape.length === 2 ? values as ArrayCell[][] : [values as ArrayCell[]];
    return (
      <ArrayDiagram
        values={matrix}
        shape={shape}
        label={label}
        axisLabels={axisLabels}
        rowLabels={rowLabels}
        columnLabels={columnLabels}
        tone={tone}
        activeAxis={activeAxis}
        compact={compact}
      />
    );
  }

  return (
    <section className={`tensor-diagram tensor-diagram-${tone}${compact ? " tensor-diagram-compact" : ""}`} aria-label={`${label}, rank ${shape.length}`}>
      <header className="tensor-diagram-caption">
        <span>{label}</span>
        <code>shape ({shape.join(", ")})</code>
      </header>
      {axisLabels?.length ? (
        <ol className="array-diagram-axes" aria-label={`${label} axes`}>
          {axisLabels.map((axis, index) => (
            <li className={activeAxis === index ? "is-active" : undefined} key={`${axis}-${index}`}>
              <span>axis {index}</span>{axis}
            </li>
          ))}
        </ol>
      ) : null}
      <div className="tensor-diagram-slices">
        {(values as ArrayCell[][][]).map((slice, index) => (
          <ArrayDiagram
            values={slice}
            shape={shape.slice(1)}
            label={sliceLabels?.[index] ?? `slice ${index + 1}`}
            rowLabels={rowLabels}
            columnLabels={columnLabels}
            tone={index % 2 === 0 ? tone : "terra"}
            compact
            key={index}
          />
        ))}
      </div>
    </section>
  );
}

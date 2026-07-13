type MatrixGlyphProps = {
  rows: number;
  columns: number;
  label: string;
  tone?: "green" | "indigo" | "terra";
  values?: Array<number | string>;
};

export function MatrixGlyph({
  rows,
  columns,
  label,
  tone = "green",
  values,
}: MatrixGlyphProps) {
  return (
    <div className="answer-matrix-wrap">
      <div
        className={`answer-matrix answer-matrix-${tone}${values ? " answer-matrix-valued" : ""}`}
        style={{ gridTemplateColumns: `repeat(${columns}, 1fr)` }}
        aria-hidden="true"
      >
        {Array.from({ length: rows * columns }, (_, index) => <i key={index}>{values?.[index]}</i>)}
      </div>
      <code>{label}</code>
    </div>
  );
}

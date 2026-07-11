import katex from "katex";
import "katex/dist/katex.min.css";

type MathFormulaProps = {
  latex: string;
  display?: boolean;
  ariaLabel?: string;
  className?: string;
};

export function MathFormula({
  latex,
  display = false,
  ariaLabel,
  className,
}: MathFormulaProps) {
  const html = katex.renderToString(latex, {
    displayMode: display,
    output: "htmlAndMathml",
    strict: "warn",
    throwOnError: false,
  });

  return (
    <span
      className={["math-formula", display ? "math-formula-display" : "", className]
        .filter(Boolean)
        .join(" ")}
      aria-label={ariaLabel}
      data-latex={latex}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

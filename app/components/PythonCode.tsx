import type { ReactNode } from "react";
import { pythonLanguage } from "@codemirror/lang-python";
import { classHighlighter, highlightTree } from "@lezer/highlight";

type PythonCodeProps = {
  children: string;
  className?: string;
};

export function PythonCode({ children, className }: PythonCodeProps) {
  const highlighted: ReactNode[] = [];
  let position = 0;
  let tokenIndex = 0;

  highlightTree(
    pythonLanguage.parser.parse(children),
    classHighlighter,
    (from, to, classes) => {
      if (from > position) {
        highlighted.push(children.slice(position, from));
      }

      highlighted.push(
        <span className={classes} key={`${from}-${to}-${tokenIndex}`}>
          {children.slice(from, to)}
        </span>,
      );
      tokenIndex += 1;
      position = to;
    },
  );

  if (position < children.length) {
    highlighted.push(children.slice(position));
  }

  const classes = ["syntax-code", className].filter(Boolean).join(" ");

  return (
    <code className={classes} data-language="python">
      {highlighted}
    </code>
  );
}

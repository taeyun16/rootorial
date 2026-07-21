import { useId } from "react";
import type { AriaAttributes, ReactNode } from "react";
import "./ExecutableFigure.css";

type FigureDataAttributes = {
  [key: `data-${string}`]: string | number | boolean | undefined;
};

/**
 * Attributes consumers may add to the semantic figure root.
 *
 * The component owns its accessible name, description, classes, children, and
 * identifiers. Keeping this surface deliberately small prevents a renderer
 * from breaking that contract while still allowing state hooks for tests and
 * progressive enhancement.
 */
export type ExecutableFigureRootAttributes = FigureDataAttributes &
  Pick<AriaAttributes, "aria-busy">;

export type ExecutableFigureProps = {
  kicker: ReactNode;
  title: ReactNode;
  description: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
  headingLevel?: 3 | 4;
  id?: string;
  testId?: string;
  figureAttributes?: ExecutableFigureRootAttributes;
};

function safeRootAttributes(
  attributes: ExecutableFigureRootAttributes | undefined,
): ExecutableFigureRootAttributes {
  if (!attributes) return {};

  return Object.fromEntries(
    Object.entries(attributes).filter(
      ([name]) =>
        name === "aria-busy" ||
        (name.startsWith("data-") && name !== "data-testid"),
    ),
  ) as ExecutableFigureRootAttributes;
}

export function ExecutableFigure({
  kicker,
  title,
  description,
  children,
  footer,
  className,
  headingLevel = 3,
  id,
  testId,
  figureAttributes,
}: ExecutableFigureProps) {
  const titleId = useId();
  const descriptionId = useId();
  const Heading = headingLevel === 4 ? "h4" : "h3";
  const rootAttributes = safeRootAttributes(figureAttributes);

  return (
    <figure
      {...rootAttributes}
      className={["executable-figure", className].filter(Boolean).join(" ")}
      aria-labelledby={titleId}
      aria-describedby={descriptionId}
      data-testid={testId}
      id={id}
    >
      <figcaption className="executable-figure-caption">
        <span className="executable-figure-kicker">{kicker}</span>
        <Heading className="executable-figure-title" id={titleId}>
          {title}
        </Heading>
        <p className="executable-figure-description" id={descriptionId}>
          {description}
        </p>
      </figcaption>

      <div className="executable-figure-body">{children}</div>

      {footer != null ? (
        <div className="executable-figure-footer">{footer}</div>
      ) : null}
    </figure>
  );
}

import type { Locator } from "@playwright/test";

export type UndersizedTouchTarget = Readonly<{
  label: string;
  tag: string;
  effectiveTag: string;
  width: number;
  height: number;
}>;

const enabledInteractiveSelector = [
  "button:not([disabled])",
  "a[href]",
  "summary",
  "input:not([disabled]):not([type='hidden'])",
  "textarea:not([disabled])",
  "[role='button']:not([aria-disabled='true'])",
  "[role='radio']:not([aria-disabled='true'])",
].join(", ");

export async function findUndersizedVisibleTouchTargets(
  root: Locator,
  minimumSize = 44,
): Promise<UndersizedTouchTarget[]> {
  return root.locator(enabledInteractiveSelector).evaluateAll((elements, minimum) => {
    const visibleRect = (element: Element) => {
      const rect = element.getBoundingClientRect();
      const style = getComputedStyle(element);
      return style.display !== "none"
        && style.visibility !== "hidden"
        && rect.width > 0
        && rect.height > 0
        ? rect
        : null;
    };

    return elements.flatMap((element) => {
      const ownRect = visibleRect(element);
      if (!ownRect) return [];

      const labels: HTMLLabelElement[] = [];
      const wrappingLabel = element.closest("label");
      if (wrappingLabel instanceof HTMLLabelElement) labels.push(wrappingLabel);
      if (element instanceof HTMLInputElement && element.id) {
        const explicitLabel = document.querySelector(`label[for="${CSS.escape(element.id)}"]`);
        if (explicitLabel instanceof HTMLLabelElement && !labels.includes(explicitLabel)) {
          labels.push(explicitLabel);
        }
      }

      const effectiveTarget = labels
        .map((label) => ({ element: label, rect: visibleRect(label) }))
        .filter((candidate): candidate is { element: HTMLLabelElement; rect: DOMRect } =>
          Boolean(candidate.rect
            && candidate.rect.width >= ownRect.width
            && candidate.rect.height >= ownRect.height))
        .sort((left, right) => right.rect.width * right.rect.height - left.rect.width * left.rect.height)[0];
      const effectiveElement = effectiveTarget?.element ?? element;
      const effectiveRect = effectiveTarget?.rect ?? ownRect;
      if (effectiveRect.width >= minimum && effectiveRect.height >= minimum) return [];

      return [{
        label: element.getAttribute("aria-label")
          || effectiveElement.textContent?.trim()
          || element.textContent?.trim()
          || element.tagName,
        tag: element.tagName.toLowerCase(),
        effectiveTag: effectiveElement.tagName.toLowerCase(),
        width: effectiveRect.width,
        height: effectiveRect.height,
      }];
    });
  }, minimumSize);
}


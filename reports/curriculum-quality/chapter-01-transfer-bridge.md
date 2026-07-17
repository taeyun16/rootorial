# Chapter 1 transfer bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/vectors`

Publication state: published

## Outcome

Chapter 1 already met the curriculum's depth, worked-example, interactivity, Python, feedback, assessment, and completion-evidence standards. Its only editorial deduction was the handoff to later chapters: the closing explanation jumped from vector dot products directly to Attention without showing how the same vector rules power the immediately following optimization chapter.

The closing bridge now carries two explicit transfers:

1. A numeric parameter update where `W`, `grad`, and `W_next` share a shape and coordinate-wise subtraction produces `[0.26, -0.43]`.
2. A later Attention handoff where query-key dot products become token-relation scores and then reading weights.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Editable executable Python cells | 2 | 2 | — |
| Declared activities | 8 (5 types) | 8 (5 types) | — |
| Concept questions | 5 | 5 | — |
| Cross-chapter connection | 4/5 | 5/5 | +1 |
| Editorial score | 44/45 | 45/45 | +1 |
| Structural contract gaps | 0 | 0 | — |

No new activity was added merely to increase the count. The chapter was already interaction-dense; the change closes a specific conceptual discontinuity.

## Verification contract

- The aggregate quality report must show Chapter 1 at `45/45` with two Python cells and published status.
- The existing first NumPy cell must continue to execute and render its vector figure.
- The second NumPy cell must now be covered by E2E execution, including the `90° -> cosine 0.000` result and its figure.
- The two transfer cards must fill the desktop grid, stack at 390 px without horizontal overflow, and remain fully localized in Korean and English.
- Chapter completion remains gated only by Axis Builder, Shape Detective, and the five-question concept check.

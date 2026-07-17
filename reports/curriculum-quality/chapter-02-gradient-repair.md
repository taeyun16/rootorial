# Chapter 2 gradient-repair quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/optimization`

Publication state: draft

## Outcome

Chapter 2 already had a strong required learning-rate lab and a semantic update debugger, but its editable Python bridge stopped at replaying a correct trace. Learners could see the MSE gradient formula without testing whether its scale was actually consistent with the loss.

The optional NumPy bridge now has two independent cells:

1. The existing seven-step MSE gradient-descent trace.
2. A one-line repair where `X.T @ residual` reports `[-9, -6]`, a central finite-difference probe reports `[-6, -4]`, and the learner restores `(2 / len(y)) * X.T @ residual`.

The surrounding explanation walks through the central-difference boundary and separates the derivative-of-the-square factor `2` from the mean factor `1 / n`. A fifth concept question checks the related SSE-to-MSE gradient scaling instead of leaving that distinction as passive prose.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Editable executable Python cells | 1 | 2 | +1 |
| Declared activities | 3 (3 types) | 4 (3 types) | +1 |
| Concept questions | 4 | 5 | +1 |
| Narrative density | 4/5 | 5/5 | +1 |
| Concept-check quality | 4/5 | 5/5 | +1 |
| Editorial score | 41/45 | 45/45 | +4 |
| Structural contract gaps | 0 | 0 | — |

## Verification contract

- The aggregate report must show Chapter 2 at `45/45`, with two Python cells, five questions, and draft status.
- The repair cell must fail before the edit with analytic `[-9, -6]` versus numerical `[-6, -4]`.
- Replacing the repair line with `(2 / len(y)) * X.T @ residual` must produce the PASS message.
- Both cells must be self-contained, English-only NumPy code and remain outside the completion gate.
- Korean and English UI must expose both cells; at 390 px neither notebook may leave the viewport.
- The public Chapter 2 URL must remain unavailable.

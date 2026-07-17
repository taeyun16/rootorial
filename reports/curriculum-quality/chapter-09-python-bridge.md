# Chapter 9 NumPy bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/transformer-block`

Publication state: draft

## Outcome

Chapter 9 now connects the visual block assembler to two editable, executable NumPy cells. The first carries one token through a fixed pre-norm stage ledger from `E + P` to both residual outputs while retaining every `[4,4]` shape. The second starts with the wrong second skip source, `y = x0 + F`, and asks the learner to repair it to `y = x1 + F` so the attention update is not discarded.

The surrounding narrative states the evidence boundary explicitly: this small deterministic fixture proves the chapter's axis, operation-order, residual-source, and shape contracts; it does not establish the quality or learned semantics of a production Transformer.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 9 | 10 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Concept questions | 5 | 5 | — |
| Narrative density | 4/5 | 5/5 | +1 |
| Worked examples | 3/5 | 5/5 | +2 |
| Editorial score | 37/45 | 45/45 | +8 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the executable-Python dimension, one from the explicit evidence-boundary narrative, and two from the hand-worked stage and repair traces. The required block lab, four debugger incidents, five concept questions, and completion gate remain unchanged.

## Learner evidence

### Cell 1 — pre-norm block stage ledger

The self-contained cell constructs a sinusoidal position matrix, performs feature-axis LayerNorm with epsilon, applies a fixed shared attention-branch map, runs a shared row-wise ReLU FFN, and prints token 0:

```text
token0.E= [1. 0. 2. 0.]
token0.P= [0. 1. 0. 1.]
token0.x0= [1. 1. 2. 1.]
token0.mean= 1.25
token0.variance= 0.1875
token0.LN(x0)= [-0.577335 -0.577335  1.732005 -0.577335]
token0.x1= [2.732005 0.422665 1.422665 0.422665]
token0.FFN= [ 0.70647  -0.308919  0.253844 -0.383572]
token0.y= [3.438475 0.113746 1.676509 0.039093]
stage_shapes= [(4, 4), (4, 4), (4, 4), (4, 4), (4, 4), (4, 4), (4, 4)]
PASS: feature-axis LayerNorm and both residual stages preserve [4, 4]
```

### Cell 2 — second residual-source repair

The initial `y = x0 + F` line produces:

```text
token0.y= [1.70647  0.691081 2.253844 0.616428]
token0.expected= [3.438475 0.113746 1.676509 0.039093]
max_skip_error= 1.732005
AssertionError: Second residual must use x1, not x0
```

Replacing only `x0` with `x1` yields:

```text
token0.y= [3.438475 0.113746 1.676509 0.039093]
token0.expected= [3.438475 0.113746 1.676509 0.039093]
max_skip_error= 0.0
PASS: y = x1 + F preserves the first residual update
```

## Verification

- `npm test`: 315 tests passed after the LLM artifact check, curriculum-quality contract, production client/SSR build, and complete unit suite.
- `npm run check`: TypeScript passed with no errors.
- `npm run check:curriculum-quality`: all 10 structural contracts passed; Chapter 9 reports `45/45`, two Python cells, five questions, and draft status.
- Local NumPy execution reproduced the complete token-0 ledger, the intentional `1.732005` skip error, and the zero-error one-line repair.
- Korean and English E2E assertions pin the bridge heading, both cell titles, exactly two notebook cells, and mobile overflow coverage while retaining the existing no-heavy-runtime and public-404 checks.

The Python bridge is optional and lazy-loaded. Runtime download failure or an unfinished repair does not affect the required block lab, debugger, concept check, or chapter completion state.

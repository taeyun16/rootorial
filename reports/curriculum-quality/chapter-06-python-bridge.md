# Chapter 6 NumPy recurrence bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/sequences`

Publication state: draft

## Outcome

Chapter 6 now carries its deterministic browser recurrence into two independent, editable NumPy cells without making the external Pyodide runtime part of chapter completion. The first cell vectorizes two scalar sequences across a batch while preserving the temporal axis, proving that equal token multisets can produce different hidden traces and final states. The second starts with an inflated early-input gradient, then uses a finite-difference probe to grade the missing recurrent-gain repair.

The surrounding explanation now separates the first input's local derivative from the following `T-1` recurrent edges. That off-by-one distinction connects the chapter's forward unroll to its temporal-gradient product instead of treating the two ideas as separate formulas.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 7 | 8 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Graded Python repairs | 0 | 1 | +1 |
| Concept questions | 5 | 5 | — |
| Narrative density | 4/5 | 5/5 | +1 |
| Worked examples | 4/5 | 5/5 | +1 |
| Editorial score | 38/45 | 45/45 | +7 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the derived executable-Python dimension. The explicit forward/backward bridge and two numeric traces support the narrative-density and worked-example increases. The required memory lab, debugger, concept check, completion evidence, and draft publication boundary remain unchanged.

## Learner evidence

### Cell 1 — batched scalar RNN unroll

The cell batches forward `[1,0,-1]` and reverse `[-1,0,1]` inputs as `[2,3,1]`, then applies the same `r=0.5` recurrence independently to both rows:

```text
inputs.shape= (2, 3, 1)
trace.shape= (2, 3, 1)
final_hidden.shape= (2, 1)
forward_trace= [0.761594, 0.363399, -0.674144]
reverse_trace= [-0.761594, -0.363399, 0.674144]
same_multiset= True
final_hidden= [-0.674144, 0.674144]
PASS: equal token multisets can produce different final states
```

### Cell 2 — long-path gradient repair

The first input enters `h_1` directly, so its local derivative has no recurrent gain. The next six state-to-state edges each need `r(1-h_t^2)`. The default loop omits `r=0.5` and therefore fails with:

```text
analytic_gradient=0.348985
finite_difference=0.005453
AssertionError: Every one of the T-1 recurrent edges must contribute recurrent_gain
```

Changing the loop line to `analytic_gradient *= recurrent_gain * (1 - current_hidden ** 2)` produces:

```text
analytic_gradient=0.005453
finite_difference=0.005453
PASS: analytic early-input gradient matches finite differences
```

## Verification contract

- The aggregate quality report must show Chapter 6 at `45/45`, two Python cells, five questions, and draft status.
- Both code strings remain English-only and rebuild their complete fixtures independently.
- The forward cell must preserve `[B,T,D] = [2,3,1]`, produce trace `[2,3,1]` and final state `[2,1]`, and prove order sensitivity for equal multisets.
- The repair cell must retain the failing `0.348985` default and the one-line recurrent-gain recovery to `0.005453`.
- Korean and English E2E assertions must pin the bridge heading, both cell titles, and exactly two notebook cells without triggering Pyodide before learner execution.
- Chapter completion remains gated only by the required memory lab, four debugger repairs, and five-question concept check.
- The public chapter remains unavailable by default; only the authenticated admin preview renders it.

The Python bridge is optional. Runtime loading or download failure does not change chapter completion state.

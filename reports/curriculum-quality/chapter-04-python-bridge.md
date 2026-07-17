# Chapter 4 NumPy training bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/training`

Publication state: draft

## Outcome

Chapter 4 now carries the required browser mini-batch simulator into two independent, editable NumPy cells without making the external Pyodide runtime part of chapter completion. The first cell begins with a wrong Softmax class axis and grades a one-line repair through row normalization, sample independence, and mean cross entropy. The second reproduces the chapter's full seven-row dataset, four grouped batches, one-row tail, fresh batch gradients, and persistent Adam state.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 7 | 8 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Graded Python repairs | 0 | 1 | +1 |
| Concept questions | 5 | 5 | — |
| Editorial score | 40/45 | 45/45 | +5 |
| Structural contract gaps | 0 | 0 | — |

The five-point score increase comes only from the derived executable-Python dimension. The existing editorial dimensions were already at their reviewed maximum and were not raised because code was added.

## Learner evidence

### Cell 1 — repair the Softmax class axis

The initial `class_axis=0` run exposes both broken invariants before its assertion fails:

```text
class_axis=0
row_sums= [1.490457 1.509543]
max_first_row_shift=0.268941
mean_ce=0.180925
AssertionError: Each sample row must distribute exactly one unit of probability
```

Changing only `class_axis = 1` produces:

```text
class_axis=1
row_sums= [1. 1.]
max_first_row_shift=0.000000
mean_ce=0.288726
PASS: class-axis softmax keeps rows normalized and independent
```

### Cell 2 — trace one Adam epoch

The cell uses batch indices `[[0,1], [2,3], [4,5], [6]]`. Its final lines are:

```text
step=4 batch=[6] rows=1 full_loss=0.225353
final_full_loss=0.225353
adam_step=4 tail_batch=[6]
PASS: fresh batch gradients and persistent Adam state complete one epoch
```

## Verification contract

- The aggregate quality report must show Chapter 4 at `45/45`, two Python cells, and draft status.
- Both cells must render in Korean and English without triggering Pyodide before the learner runs one.
- The repair cell must keep its failing default and the one-line `class_axis=1` recovery described above.
- The Adam cell must retain all seven samples, the one-row tail batch, persistent `m`, `v`, and `step`, and final full loss `0.225353`.
- At 390 px, the bridge and both notebook cells must remain within the page width.
- Chapter completion remains gated only by the required mini-batch lab, four debugger repairs, and five-question concept check.
- The public chapter remains unavailable by default; only the authenticated admin preview renders it.

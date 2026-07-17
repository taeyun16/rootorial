# Chapter 8 Self-Attention NumPy bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/self-attention`

Publication state: draft

## Outcome

Chapter 8 now anchors its interactive browser lab to one fixed, end-to-end numeric trace for `the · cat · sat · <pad>`. The trace follows the `sat` query in zero-based head 1 through raw scores, scaling, causal and padding-key masking, row Softmax, the weighted value context, and two-head feature concatenation. It also separates three often conflated rules: blocking future keys, hiding a padding key column, and zeroing an inactive padding-query row.

Two optional, editable NumPy cells reproduce the same computation without changing the chapter completion gate. The first executes Q/K/V projection, head splitting, scaled causal attention, context aggregation, and concatenation. The second starts with Softmax followed by zeroing blocked weights and asks the learner to move masking before Softmax so allowed keys are renormalized.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 8 | 10 | +2 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Graded Python repairs | 0 | 1 | +1 |
| Concept questions | 5 | 5 | — |
| Narrative density | 3/5 | 5/5 | +2 |
| Worked examples | 3/5 | 5/5 | +2 |
| Editorial score | 36/45 | 45/45 | +9 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the derived executable-Python dimension. The remaining four come from the fixed calculation narrative and worked trace. The existing required Self-Attention lab, four debugger repairs, five-question concept check, and completion evidence remain unchanged.

## Learner evidence

### Fixed `sat` query trace

For head 1 (`d_h=2`), the `sat` query produces:

```text
raw       = [2, 1, 0, 1]
scaled    = [1.414214, 0.707107, 0, 0.707107]
masked    = [1.414214, 0.707107, 0, -inf]
weights   = [0.575975, 0.283995, 0.140029, 0]
context_1 = [0.716005, 0.424025]
context_0 = [0.744765, 0.503490]
concat    = [0.744765, 0.503490, 0.716005, 0.424025]
```

The padding key is excluded from every active query's denominator. Separately, the final query row is inactive because its query token is padding; zeroing that row does not define key visibility for earlier active rows.

### Cell 1 — full forward path

The self-contained cell rebuilds `X`, `W_Q`, `W_K`, and `W_V`, then emits `[4,4]` projections, `[2,4,2]` heads, `[2,4,4]` score and weight tensors, and `[4,4]` concatenated output. Assertions pin the trace above, unit mass for every active row in both heads, zero padding-key mass, and a zero inactive-query row.

### Cell 2 — mask-order repair

The initial `mask_before_softmax = False` path normalizes over all four keys and only then zeros future and padding positions:

```text
mode= softmax-then-zero
active_row_sums= [0.097785 0.330238 0.778819]
future_mass=0.000000
padding_key_mass=0.000000
inactive_query_mass=0.000000
AssertionError: Allowed keys must be renormalized to one
```

Changing the repair boolean to `True` moves visibility into Softmax and produces:

```text
mode= mask-before-softmax
active_row_sums= [1. 1. 1.]
future_mass=0.000000
padding_key_mass=0.000000
inactive_query_mass=0.000000
PASS: mask-before-softmax preserves unit active rows and zero blocked mass
```

## Verification contract

Completed checks:

- `npm test`: production client and SSR builds passed; all 315 unit and SSR tests passed.
- `npm run check`: TypeScript passed with no errors.
- `npm run check:curriculum-quality`: all 10 structural contracts passed; Chapter 8 reports `45/45`, two Python cells, five questions, and draft status.
- Direct Python 3 + NumPy execution reproduced the fixed forward trace, the default repair failure with active sums `[0.097785,0.330238,0.778819]`, and the repaired `[1,1,1]` result with zero blocked mass.
- Korean and English E2E assertions pin the worked values, bridge heading, both cell titles, exactly two notebook cells, lazy-runtime behavior, draft-only public 404, English localization, and 390 px overflow coverage. The authenticated browser E2E suite was not executed in this isolated slice because it provisions a temporary external Clerk admin; those assertions remain the integration checkpoint.

Known non-blocking build diagnostics are unchanged: the v86 browser bundle reports externalized Node modules, large chunks remain above Vite's advisory threshold, local Clerk secrets are absent, and Wrangler cannot write its optional host log under the workspace sandbox. The build and full test command still exit successfully.

Required retained contract:

- The aggregate report must show Chapter 8 at `45/45`, two Python cells, five questions, and draft status.
- Both cells must render in Korean and English without loading Pyodide before a learner runs one.
- Both Python programs must stay English-only and rebuild all fixtures independently.
- The repair cell must retain its failing default and its one-line `mask_before_softmax = True` recovery.
- At 390 px, the worked trace, bridge, and both notebook cells must remain within the page width.
- Chapter completion remains gated only by the required five-trace lab, four debugger repairs, and five-question concept check.
- The public chapter remains unavailable by default; only the authenticated admin preview renders it.

The Python bridge is optional. Runtime loading or download failure does not change required activity state, chapter completion, or the draft publication boundary.

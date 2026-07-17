# Chapter 7 causal ledger and NumPy bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/attention`

Publication state: draft

## Outcome

Chapter 7 now makes the causal boundary between query, key, value, routing, and content explicit before carrying the required browser lab into two editable NumPy cells. The causal ledger traces which intermediate must change first under Q-only, K-only, and V-only edits, then proves why applying one permutation to both K and V preserves the address-content pairing and final context.

The optional code bridge keeps the chapter's existing Q/K/V fixture. Its first cell stacks the subject, place, and action queries, executes `Q @ K.T`, applies stable Softmax across `axis=1`, and reads `weights @ V`. Its second cell deliberately returns `weights @ K`; the learner repairs that one line and checks both the context-width contract and the V-only counterfactual.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 6 | 8 | +2 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Graded Python repairs | 0 | 1 | +1 |
| Concept questions | 5 | 5 | — |
| Narrative density | 3/5 | 5/5 | +2 |
| Editorial score | 38/45 | 45/45 | +7 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the derived executable-Python dimension and two from the reviewed causal narrative. The required routing lab, four-incident debugger, five concept questions, and completion gate remain unchanged.

## Learner evidence

### Cell 1 — three-query routing trace

The self-contained cell uses `Q[3,2]`, `K[3,2]`, and `V[3,3]`. It prints the complete shape and routing evidence:

```text
Q.shape= (3, 2)
K.shape= (3, 2)
V.shape= (3, 3)
scores.shape= (3, 3)
weights.shape= (3, 3)
contexts.shape= (3, 3)
row_sums= [1. 1. 1.]
top_slots= ['subject', 'place', 'action']
contexts=
 [[0.699513 0.336133 0.190104]
 [0.267398 0.714234 0.298133]
 [0.2388   0.158201 0.896532]]
PASS: each query owns one key-axis distribution and reads values
```

### Cell 2 — repair the value read

The initial `return weights @ K` run exposes both failures before stopping:

```text
scores_stable= True
weights_stable= True
context_changed= False
context.shape= (3, 2)
expected_context_shape= (3, 3)
AssertionError: Context width must come from V
```

Replacing only `K` with the function's `values` argument produces:

```text
scores_stable= True
weights_stable= True
context_changed= True
context.shape= (3, 3)
expected_context_shape= (3, 3)
PASS: V-only edits preserve routing and change the context content
```

## Verification contract

- The aggregate quality report must show Chapter 7 at `45/45`, two Python cells, five questions, and draft status with no chapter target gap.
- Both code strings are English-only, self-contained, and execute independently.
- Korean and English draft E2E assertions pin the causal-ledger heading, bridge heading, both cell titles, and exactly two notebook cells without starting the heavy runtime.
- At 390 px, the causal ledger, bridge, notebook cells, required lab, and debugger must stay within the page width.
- Chapter completion remains gated only by the required routing lab, four debugger repairs, and five-question concept check.
- The public chapter remains unavailable by default; only the authenticated admin preview renders it.

The NumPy runtime remains optional and lazy. A runtime download failure does not alter required evidence or chapter completion.

## Verification performed

- `npm test`: 315 tests passed after the LLM artifact check, curriculum-quality contract, production client/SSR build, and full unit suite.
- `npm run check`: TypeScript passed with no errors.
- `npm run check:curriculum-quality`: all 10 structural contracts passed; Chapter 7 reports `45/45`, two Python cells, five questions, and draft status.
- Direct local NumPy execution reproduced the three-query trace, the initial `(3,2)` context failure, and the repaired `(3,3)` V-only result.
- Korean and English Playwright assertions were extended to cover both new sections and cells, including the existing 390 px overflow and no-heavy-runtime checks. Authenticated browser execution remains the parent integration checkpoint; this isolated slice does not change publication state.

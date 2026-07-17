# Chapter 5 NumPy bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/embeddings`

Publication state: draft

## Outcome

Chapter 5 now carries its browser embedding model into two editable NumPy cells without making the external Pyodide runtime part of the completion gate. The first cell proves that direct row lookup and one-hot multiplication produce the same `[B,T,D]` tensor, then calculates a PAD-excluding masked mean. The second begins with NumPy advanced indexing that loses one repeated-row contribution and asks the learner to repair the backward path with true scatter-add.

The surrounding explanation now makes the forward/backward relationship explicit: lookup gathers table rows at token positions, while the reverse pass scatter-adds each position's upstream gradient into the row that supplied it.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 8 | 9 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Concept questions | 5 | 5 | — |
| Narrative density | 4/5 | 5/5 | +1 |
| Editorial score | 39/45 | 45/45 | +6 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the derived executable-Python dimension, and one comes from the new gather-to-scatter narrative bridge. The existing required lookup lab, debugger, concept check, and completion evidence are unchanged.

## Learner evidence

### Cell 1 — lookup, one-hot, and masked mean

The self-contained cell recreates the chapter's complete `E[11,2]` table and runs IDs `[[7,8,6],[2,5,0]]`. It exposes every intermediate shape and finishes with:

```text
E.shape= (11, 2)
ids.shape= (2, 3)
one_hot.shape= (2, 3, 11)
lookup.shape= (2, 3, 2)
max_difference= 0.0
masked_mean.shape= (2, 2)
masked_mean= [[0.566667 0.483333]
 [0.54     0.615   ]]
PASS: direct lookup equals one-hot multiplication and PAD is excluded
```

### Cell 2 — repeated-index scatter-add repair

The initial line `gradient[ids] += upstream` uses advanced indexing with IDs `[2,2,5]`. It leaves row 2 at one contribution and fails the semantic assertion:

```text
row_2_gradient= [ 0.2 -0.1]
row_5_gradient= [ 0.2 -0.1]
AssertionError: Repeated ID 2 must receive both upstream contributions
```

Replacing that line with `np.add.at(gradient, ids, upstream)` produces:

```text
row_2_gradient= [ 0.4 -0.2]
row_5_gradient= [ 0.2 -0.1]
PASS: scatter-add accumulates every repeated-token contribution
```

## Verification

- `npm test`: 312 tests passed after the LLM artifact check, curriculum-quality contract, production client/SSR build, and complete unit suite.
- `npm run check`: TypeScript passed with no errors.
- `npm run check:curriculum-quality`: all 10 structural contracts passed; Chapter 5 reports `45/45`, two Python cells, five questions, and draft status.
- Local NumPy execution reproduced the zero lookup difference, both masked means, the initial repeated-index result `[0.2,-0.1]`, and the repaired result `[0.4,-0.2]`.
- Korean and English draft E2E assertions now pin the bridge heading, both cell titles, and exactly two notebook cells while retaining the existing no-heavy-runtime and public-404 checks. Browser execution remains a separate integration checkpoint because this isolated slice does not alter publication state or use an admin session.

The Python bridge remains optional. Runtime loading or download failure does not change the required lookup lab, four debugger repairs, five concept questions, or chapter completion state.

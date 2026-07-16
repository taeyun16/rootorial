# Chapter 3 Python bridge quality result

Reviewed: 2026-07-16

Chapter: `transformer-from-zero/neural-networks`

Publication state: draft

## Outcome

Chapter 3 now carries the browser XOR model into two editable NumPy cells without making the external Pyodide runtime part of the chapter completion gate. The first cell connects the chapter's geometric argument about one affine boundary to a bounded numerical search. The second begins with a missing hidden activation, exposes the failed forward pass, and asks the learner to repair one line.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 7 | 8 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Concept questions | 5 | 5 | — |
| Editorial score | 39/45 | 44/45 | +5 |
| Structural contract gaps | 0 | 0 | — |

The five-point score increase comes only from the derived executable-Python dimension. Existing editorial scores were not raised merely because code was added.

## Learner evidence

### Cell 1 — one affine boundary

The cell prints all four predictions, then searches a bounded integer weight-and-bias grid. Both the representative boundary and the search stop at `3/4`, followed by:

```text
single_affine_correct=3/4
grid_search_best=3/4
PASS: bounded search matches the geometric XOR limit
```

### Cell 2 — repair the hidden activation

The initial code deliberately assigns `hidden = hidden_logits`. Its real browser output is:

```text
correct=2/4 mean_bce=8.059048
AssertionError: Repair the hidden activation so XOR reaches 4/4
```

Changing that line to `hidden = sigmoid(hidden_logits)` preserves the advertised shapes and produces:

```text
X.shape= (4, 2)
hidden.shape= (4, 2)
logits.shape= (4,)
correct=4/4 mean_bce=0.022529
PASS: hidden activation restores XOR with low BCE
```

## Verification

- `npm test`: 311 tests passed after the curriculum contract, chapter source contract, type check, and production build completed successfully.
- `npm run check:curriculum-quality`: all 10 chapter contracts valid; the known improvement-target count fell from 15 to 14.
- In-app Browser: both cells executed with the shared Pyodide/NumPy runtime; the deliberate failure and one-line repair matched the outputs above.
- Responsive review: the bridge introduction and CodeMirror cell remained contained at a 390×844 viewport, with long code wrapping inside the editor rather than widening the page.
- Localization review: the English bridge heading, both cell titles, descriptions, controls, output labels, and hints rendered without Korean fragments.
- Draft boundary: after removing the temporary local publication override, the public chapter URL returned HTTP 404 and rendered the local not-found page.

The Python bridge remains optional. Runtime loading or download failure does not change the required XOR lab, concept check, network-surgery evidence, or chapter completion state.

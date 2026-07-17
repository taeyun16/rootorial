# Chapter 10 NumPy capstone bridge quality result

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/mini-transformer`

Publication state: draft

## Outcome

Chapter 10 now closes the Transformer curriculum with two independent, editable NumPy probes. The first takes the fixed tokenizer's five input IDs and hand-copied final-LayerNorm hidden fixture through a vocabulary head, shifted next-token cross entropy, and exactly one gradient-descent update. The second turns the autoregressive controller contract into a one-line repair: replace the current tail versus append a new token, then recompute the complete prefix and obey EOS or max-length stopping.

The bridge explicitly distinguishes proof boundaries. It verifies shifted pairs, vocabulary-axis probability normalization, the direction of one LM-head update, and greedy append/recompute/stop semantics. It does not claim end-to-end Transformer training, learned tokenizer quality, general generation quality, or KV-cache correctness. The generation sequence is a hand-authored deterministic fixture.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Identified content sections | 8 | 9 | +1 |
| Declared activities | 3 (3 types) | 5 (4 types) | +2 activities, +1 type |
| Editable executable Python cells | 0 | 2 | +2 |
| Graded Python repairs | 0 | 1 | +1 |
| Concept questions | 5 | 5 | — |
| Concept depth | 4/5 | 5/5 | +1 |
| Narrative density | 3/5 | 5/5 | +2 |
| Worked examples | 3/5 | 5/5 | +2 |
| Editorial score | 35/45 | 45/45 | +10 |
| Structural contract gaps | 0 | 0 | — |

Five score points come from the derived executable-Python dimension. The explicit numeric LM-head trace, controller repair, and proof-boundary explanation support the concept-depth, narrative-density, and worked-example increases. The required model lab, four-incident debugger, five-question concept check, completion evidence, and draft publication boundary remain unchanged.

## Learner evidence

### Cell 1 — shifted next-token loss and one LM-head update

The cell aligns input IDs `[0,1,2,3,4]` with targets `[1,2,3,4,5]`, freezes a `[5,4]` hidden fixture, and updates only the `[4,8]` vocabulary projection and `[8]` bias:

```text
input_ids= [0, 1, 2, 3, 4]
target_ids= [1, 2, 3, 4, 5]
logits.shape= (5, 8)
mean_loss_before=1.655967
gradient_l2=0.728164
mean_loss_after=1.552597
wrong_ascent_loss=1.764646
PASS: one gradient-descent LM-head update lowers same-batch loss
```

### Cell 2 — autoregressive controller repair

The default `prefix[-1] = next_token_id` overwrites the current tail. It repeatedly recomputes malformed length-three prefixes and fails the growth contract:

```text
generated_tokens= ['sat', 'sat', 'sat', 'sat', 'sat']
prefix_lengths= [3, 3, 3, 3, 3]
stop_reason= max-length
AssertionError: Replace prefix[-1] with prefix.append(next_token_id) so generation grows
```

Replacing that line with `prefix.append(next_token_id)` yields the deterministic greedy trace:

```text
generated_tokens= ['sat', '.', 'cat', 'cat', 'cat']
prefix_lengths= [3, 4, 5, 6, 7]
recomputed_prefixes= [(0, 1, 2), (0, 1, 2, 3), (0, 1, 2, 3, 4), (0, 1, 2, 3, 4, 2), (0, 1, 2, 3, 4, 2, 2)]
stop_reason= max-length
PASS: greedy decoding appends, recomputes, and obeys the stop boundary
```

## Verification contract

- The aggregate quality report must show Chapter 10 at `45/45`, two Python cells, five questions, and draft status.
- Both code strings remain English-only and recreate complete fixtures independently.
- The loss cell must retain the `(5,8)` logits shape and the `1.655967 → 1.552597` descent trace, `0.728164` gradient norm, and `1.764646` ascent counterexample.
- The controller must retain the failing replace-tail default and one-line append recovery to `sat → . → cat → cat → cat`, prefix lengths `3→4→5→6→7`, and `max-length` stop.
- Korean and English E2E assertions must pin the bridge heading, both cell titles, and exactly two notebook cells; the mobile overflow audit includes the bridge and cells.
- The cells remain optional and do not add completion-gate state or eager Pyodide requests.
- The public chapter remains unavailable by default; only the authenticated admin preview renders it.

Runtime loading or download failure cannot change chapter completion state.

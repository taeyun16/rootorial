# Chapter 3 affine-collapse worked trace

Reviewed: 2026-07-17

Chapter: `transformer-from-zero/neural-networks`

Publication state: draft

## Outcome

Chapter 3 now places a numeric affine-composition trace directly between the bounded single-line search and the hidden-activation repair cell. The trace makes the repair causal: without a hidden nonlinearity, the configured matrices reduce to one affine map with no input-dependent weight.

| Measure | Baseline | Current | Change |
|---|---:|---:|---:|
| Editable executable Python cells | 2 | 2 | — |
| Worked examples | 4/5 | 5/5 | +1 |
| Editorial score | 44/45 | 45/45 | +1 |
| Default publication | draft | draft | — |

## Worked trace

The learner can now follow the exact composition used by the repair cell:

```text
(XW1+b1)W2+b2 = X(W1W2)+(b1W2+b2)
W_effective = [0, 0]
b_effective = 52
logits = [52, 52, 52, 52]
predictions = [1, 1, 1, 1]
identity_correct = 2/4
```

The self-contained NumPy cell prints the same effective weights, bias, logits, predictions, and `2/4` result before asking the learner to restore the sigmoid hidden activation. This connects the symbolic identity, concrete parameters, failed forward pass, and one-line repair without adding a new completion requirement.

## Contract coverage

- The Korean and English draft-preview E2E paths assert the effective parameters, identical logits, and XOR `2/4` consequence.
- The notebook source contract asserts that both `identity_effective_weights` and `identity_effective_bias` remain executable outputs.
- The English independence note now states that neither cell depends on state left by the other; it no longer implies that separately scoped cells cannot reuse variable names.
- No publication registration, completion gate, required activity, or external runtime policy changed.

## Verification

- Direct local execution of the shipped Python string produced `identity_effective_weights=[0.0, 0.0]`, `identity_effective_bias=52`, four logits of `52.0`, and `identity_correct=2/4`; replacing only the repair line then produced XOR `4/4` with mean BCE `0.022529`.
- Focused chapter and quality tests: 11 passed.
- `npm run check`, `npm run check:curriculum-quality`, and `git diff --check`: passed.
- `npm test`: 311 tests passed after the production client and SSR builds. The existing missing-local-Clerk-secret, Wrangler log-permission, browser-externalization, and large-chunk diagnostics remained non-fatal.
- The authenticated draft-preview E2E assertions were added but not executed in this isolated worktree because admin E2E credentials were not present; browser review remains an integration checkpoint.

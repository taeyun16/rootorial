export const miniTransformerLmHeadUpdateCode = `import numpy as np

# Hand-copied final-LayerNorm fixture from the chapter's deterministic model.
# Rows align with [BOS, the, cat, sat, .]; only the LM head is updated.
token_ids = np.array([0, 1, 2, 3, 4])
target_ids = np.array([1, 2, 3, 4, 5])
hidden = np.array([
    [-1.4940651674618413,  0.9179410363556870, -0.3280422005524412,  0.9041663316585953],
    [-1.3004462306067810,  0.9409496881171421, -0.6445139085521370,  1.0040104510417756],
    [ 1.1490804089434403, -1.0953421360492608,  0.8328860563996825, -0.8866243292938619],
    [ 0.5183340429067067, -1.2103769090546197, -0.6605785880300354,  1.3526214541779482],
    [-1.2559424713273635,  1.4833245190271644,  0.1997189964956131, -0.4271010441954142],
])
vocab_projection = np.array([
    [ 0.2,  0.8, -0.3,  0.1,  0.4, -0.2,  0.05,  0.3],
    [-0.1,  0.2,  0.9, -0.4,  0.1,  0.3,  0.10, -0.2],
    [ 0.1, -0.3,  0.2,  0.9, -0.2,  0.5,  0.20,  0.1],
    [ 0.3,  0.1, -0.4,  0.2,  0.8,  0.4,  0.10,  0.6],
])
vocab_bias = np.array([-1.0, -0.1, -0.05, 0.0, 0.05, 0.1, -0.5, -0.2])
learning_rate = 0.2

def row_softmax(logits):
    shifted = logits - logits.max(axis=1, keepdims=True)
    exponentials = np.exp(shifted)
    return exponentials / exponentials.sum(axis=1, keepdims=True)

def mean_cross_entropy(logits, targets):
    probabilities = row_softmax(logits)
    return -np.log(probabilities[np.arange(len(targets)), targets]).mean()

logits_before = hidden @ vocab_projection + vocab_bias
probabilities_before = row_softmax(logits_before)
loss_before = mean_cross_entropy(logits_before, target_ids)

gradient_logits = probabilities_before.copy()
gradient_logits[np.arange(len(target_ids)), target_ids] -= 1
gradient_logits /= len(target_ids)
gradient_projection = hidden.T @ gradient_logits
gradient_bias = gradient_logits.sum(axis=0)
gradient_l2 = np.sqrt(
    np.sum(gradient_projection ** 2) + np.sum(gradient_bias ** 2)
)

updated_projection = vocab_projection - learning_rate * gradient_projection
updated_bias = vocab_bias - learning_rate * gradient_bias
logits_after = hidden @ updated_projection + updated_bias
loss_after = mean_cross_entropy(logits_after, target_ids)

# A deliberately wrong ascent step is retained as a direction check.
ascent_projection = vocab_projection + learning_rate * gradient_projection
ascent_bias = vocab_bias + learning_rate * gradient_bias
ascent_loss = mean_cross_entropy(
    hidden @ ascent_projection + ascent_bias,
    target_ids,
)

print("input_ids=", token_ids.tolist())
print("target_ids=", target_ids.tolist())
print("logits.shape=", logits_before.shape)
print(f"mean_loss_before={loss_before:.6f}")
print(f"gradient_l2={gradient_l2:.6f}")
print(f"mean_loss_after={loss_after:.6f}")
print(f"wrong_ascent_loss={ascent_loss:.6f}")

assert logits_before.shape == (5, 8)
assert token_ids.tolist() == [0, 1, 2, 3, 4]
assert target_ids.tolist() == [1, 2, 3, 4, 5]
np.testing.assert_allclose(loss_before, 1.6559665206, atol=1e-10)
np.testing.assert_allclose(gradient_l2, 0.7281635913, atol=1e-10)
np.testing.assert_allclose(loss_after, 1.5525973714, atol=1e-10)
np.testing.assert_allclose(ascent_loss, 1.7646455697, atol=1e-10)
assert loss_after < loss_before < ascent_loss
print("PASS: one gradient-descent LM-head update lowers same-batch loss")
`;

export const miniTransformerGenerationRepairCode = `import numpy as np

vocabulary = ["<bos>", "the", "cat", "sat", ".", "<eos>", "<unk>", "mat"]
bos_id, eos_id = 0, 5
max_new_tokens = 5

# This hand-authored fixture stands in for a trained model. Every call receives
# the complete current prefix; there is no KV cache in this exercise.
next_token_by_prefix = {
    (0, 1, 2): 3,
    (0, 1, 2, 3): 4,
    (0, 1, 2, 3, 4): 2,
    (0, 1, 2, 3, 4, 2): 2,
    (0, 1, 2, 3, 4, 2, 2): 2,
}

def tokenize_fixed(text):
    fixed_ids = {"the": 1, "cat": 2}
    return [bos_id] + [fixed_ids.get(piece, 6) for piece in text.lower().split()]

def recompute_full_prefix(prefix_ids):
    next_id = next_token_by_prefix.get(tuple(prefix_ids), 3)
    logits = np.full((len(prefix_ids), len(vocabulary)), -10.0)
    logits[-1, next_id] = 10.0
    return logits

prefix = tokenize_fixed("the cat")
generated_ids = []
prefix_lengths = []
recomputed_prefixes = []
stop_reason = "max-length"

for _ in range(max_new_tokens):
    # Greedy decoding uses only the last row after recomputing the full prefix.
    prefix_lengths.append(len(prefix))
    recomputed_prefixes.append(tuple(prefix))
    logits = recompute_full_prefix(prefix)
    next_token_id = int(np.argmax(logits[-1]))
    generated_ids.append(next_token_id)

    # REPAIR: generation must grow the prefix instead of overwriting its tail.
    prefix[-1] = next_token_id

    if next_token_id == eos_id:
        stop_reason = "eos"
        break

generated_tokens = [vocabulary[token_id] for token_id in generated_ids]
print("generated_tokens=", generated_tokens)
print("prefix_lengths=", prefix_lengths)
print("recomputed_prefixes=", recomputed_prefixes)
print("stop_reason=", stop_reason)

assert prefix_lengths == [3, 4, 5, 6, 7], (
    "Replace prefix[-1] with prefix.append(next_token_id) so generation grows"
)
assert generated_tokens == ["sat", ".", "cat", "cat", "cat"]
assert len(set(recomputed_prefixes)) == max_new_tokens
assert stop_reason == "max-length"
print("PASS: greedy decoding appends, recomputes, and obeys the stop boundary")
`;
